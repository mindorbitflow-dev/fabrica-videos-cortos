"""Animador IA: convierte cada escena del guion en una escena procedural (src/prim.py + plantilla/primitivas.js).

La IA describe la escena como JSON {fondo, camara, capas}; `prim.validar` lo limpia (tipos, rangos, colores) y,
si no hay arreglo tras reintentar, `prim.respaldo` arma una escena viva en código. Ya no se dibuja SVG libre.
"""

from __future__ import annotations

import json
import re

from src import prim
from src.llm import LLMRouter

INTENTOS = 3  # una respuesta + 2 reintentos con los problemas detectados
MAX_TEXTOS_PANTALLA = 3

# Escena de otro tema, para mostrar el nivel de detalle y el uso de cámara, unidades y tiempos.
EJEMPLO = json.dumps({
    "fondo": {"tema": "tejido"},
    "camara": [{"t": 0, "x": 0, "y": 520, "ancho": 1500}, {"t": 3.5, "x": 0, "y": 470, "ancho": 1300},
               {"t": 7, "x": 0, "y": 230, "ancho": 520}, {"t": 10, "x": 0, "y": 330, "ancho": 800},
               {"t": 14, "x": 0, "y": 420, "ancho": 1150}],
    "capas": [
        {"tipo": "estratos", "x": -2000, "y": -60, "alto": 50, "lineas": 4, "color": "#c9d4e8", "onda": 3},
        {"tipo": "campoCelulas", "x": -1500, "y": 0, "ancho": 3000, "alto": 120, "radio": 9, "color": "#6f7dff",
         "colorNucleo": "#9aa6ff", "aparicion": "onda", "desde": 0,
         "muerte": {"x": 0, "y": 150, "r": 95, "desde": 5, "dur": 2.5}},
        {"tipo": "estratos", "x": -2000, "y": 140, "alto": 1300, "lineas": 24, "color": "#9fb2d6", "onda": 7, "desde": 0.4},
        {"tipo": "vaso", "puntos": [[-1600, 760], [-700, 720], [0, 770], [800, 730], [1600, 780]], "grosor": 40,
         "color": "#c9d4e8", "colorCelulas": "#ff5fa2", "celulas": 90, "velocidad": 120, "desde": 0.8},
        {"tipo": "particulas", "x": 0, "y": 140, "r": 110, "n": 160, "tam": 2.2, "color": "#ff6ad5", "desde": 2.5, "duracion": 3.5},
        {"tipo": "etiqueta", "texto": "veneno", "x": 40, "y": 140, "dx": 170, "dy": -170, "desde": 3.2, "hasta": 8, "color": "#ff9be6"},
        {"tipo": "enjambre", "n": 70, "origen": {"x": 0, "y": 765, "r": 380, "ry": 12}, "destino": {"x": 0, "y": 175, "r": 85},
         "radio": 13, "color": "#5dff9c", "desde": 7.5, "duracion": 5, "ocultarAntes": True},
        {"tipo": "etiqueta", "texto": "neutrófilos", "x": 60, "y": 260, "dx": 190, "dy": 150, "desde": 9.2, "color": "#a8ffc9"},
        {"tipo": "numero", "texto": "0", "sub": "bacterias", "desde": 11.2, "color": "#ff8a5c"},
    ],
}, ensure_ascii=False, separators=(",", ":"))

NOTA_PORTADA = """
- ¡ESTA ESCENA ES LA PORTADA (la miniatura del video)! Abajo (píxeles 860-1240) se pone un título gigante encima.
  El protagonista debe verse COMPLETO desde el segundo 0 (capas con desde:0) y quedar ENCIMA del título,
  entre los píxeles y 560 y 860: el centro de la cámara cae en y=860, así que pon el protagonista a unos ancho/7 por
  ENCIMA del centro de la cámara (y_mundo = y_cámara − ancho/7) y que no pase de la mitad del ancho visible. SIN capas de pantalla (etiqueta, numero, cita, frase, grafica,
  dial)."""

PROMPT_ESCENA = """Eres animador de videos explicativos verticales para celular. Describe UNA escena como JSON para un motor de
dibujo procedural (cámara que se mueve por un mundo con miles de células, partículas, figuras, redes...).

Video: "{titulo}" (escena {n} de {total}). Guion completo, para que el estilo sea coherente:
{resumen}

ESTA ESCENA
- Narración: "{voz}"
- Qué mostrar: {visual}
- Dura unos {dur:.0f} segundos. Todo el tiempo (t, desde, hasta, duracion) va en segundos DESDE EL INICIO DE ESTA ESCENA
  y lo principal debe estar visible antes de {fin:.1f} s, en el orden de la narración.{nota_portada}

FORMATO: devuelve SOLO un objeto JSON (sin ``` ni comentarios):
{{"fondo": {{"tema": "oscuro|mar|piel|tejido|claro"}},
  "unidad": "µm|mm|m|km (por defecto µm; elige la que corresponda al tamaño real de lo que se muestra)",
  "escala": true|false (barra de escala abajo a la izquierda; ponla solo si el tamaño real importa),
  "camara": [{{"t": s, "x": .., "y": .., "ancho": ..}}, ...],
  "capas": [{{"tipo": "...", ...}}, ...]}}

MUNDO Y CÁMARA
- Coordenadas del mundo en la unidad elegida, y = hacia abajo. "ancho" es lo que se ve de lado a lado de la pantalla;
  el punto (x, y) de cada clave de cámara queda en el píxel (540, 860).
  La pantalla (1080x1920) se reparte en franjas: textos grandes (numero, cita, frase) 260-560, DIBUJO 560-1180 y
  subtítulos 1210-1440 sobre una franja oscura: el protagonista va entre los píxeles y 560 y 1180.
- La cámara SIEMPRE se mueve: 2 a 8 claves, t creciente desde 0 hasta ~{dur:.0f} s, con zoom y desplazamiento reales
  (por ejemplo acercarse de 1500 a 500 de ancho). Nada de planos fijos.
- UN protagonista grande que llene el centro de la pantalla (más de la mitad del ancho visible en algún momento);
  alrededor, contexto que dé escala (campos de células, estratos, vasos, partículas). Cuadros vacíos = escena mala.
- Las capas con "desde" aparecen con un fundido: escalona las apariciones para que la escena vaya construyéndose.
- Máximo {max_textos} capas de pantalla con texto (etiqueta, numero, cita, frase); texto corto, en español.
- "forma" solo como acento pequeño (núcleo, roncha, gota): nunca como objeto principal ni más de 2 por escena.
- En "figura" NO cambies "color" ni "color2" (cada modelo ya trae sus colores naturales) salvo para resaltarla.
- "frase" y "cita" solo para ideas que NO están en la narración (los subtítulos ya repiten lo que se dice); si no aportan, no las pongas.
- Colores hex: principal {principal}, secundario {secundario}, acento {acento}, peligro {peligro}, ok {ok},
  blanco #ffffff. Sobre fondo oscuro usa colores vivos; con tema "claro" usa colores oscuros y saturados.

CAPAS DISPONIBLES (? = opcional; todas aceptan desde? y hasta? en segundos). Respeta los rangos:
{referencia}
Modelos de "figura": {modelos}.

NO USES (hace ver el video genérico): textos de "sígueme", "like" o "suscríbete"; signos de exclamación;
palabras de relleno como "increíble", "secreto", "brutal", "épico", "maestro".

EJEMPLO de una escena bien hecha (otro tema; fíjate en el movimiento de cámara, los tiempos escalonados y el protagonista):
{ejemplo}
"""

PROMPT_CORRECCION = """

ESTO ES UNA CORRECCIÓN. Tu versión anterior tuvo estos problemas. Corrígelos TODOS (no repitas el mismo diseño):
{problemas}"""


def duracion_estimada(voz: str) -> float:
    return len(voz.split()) * 0.36 + 0.5


def _extraer_json(texto: str) -> dict | None:
    """El objeto JSON de la respuesta (tolera ``` y texto alrededor); None si no hay uno válido."""
    t = re.sub(r"^```(?:json)?|```$", "", texto.strip(), flags=re.M).strip()
    a, b = t.find("{"), t.rfind("}")
    if a < 0 or b <= a:
        return None
    try:
        datos = json.loads(t[a:b + 1])
    except ValueError:
        return None
    return datos if isinstance(datos, dict) else None


def _asegurar_camara(escena: dict, dur: float) -> dict:
    """La cámara siempre se mueve: si la IA dejó un plano fijo se añade un acercamiento lento."""
    k = escena["camara"]
    if len(k) >= 2 and any((a["x"], a["y"], a["ancho"]) != (k[0]["x"], k[0]["y"], k[0]["ancho"]) for a in k[1:]):
        return escena
    base = k[0]
    escena["camara"] = [base, {"t": max(dur, base["t"] + 4), "x": base["x"], "y": base["y"], "ancho": max(base["ancho"] * 0.8, 1e-3)}]
    return escena


def _ajustar_pantalla(escena: dict, portada: bool) -> dict:
    """Portada: sin textos de pantalla (abajo va el título gigante). Resto: tope de capas de texto."""
    hay_dibujo = any(c["tipo"] not in prim.PANTALLA for c in escena["capas"])
    capas, textos = [], 0
    for c in escena["capas"]:
        if c["tipo"] in prim.PANTALLA:
            if portada and hay_dibujo:
                continue
            textos += c["tipo"] not in ("grafica", "dial")
            if textos > MAX_TEXTOS_PANTALLA and c["tipo"] not in ("grafica", "dial"):
                continue
        capas.append(c)
    escena["capas"] = capas
    return escena


def animar_escena(router: LLMRouter, guion: dict, indice: int, paleta: dict, estilo: str = "plano",
                  correcciones: list[str] | None = None) -> tuple[str, str, dict]:
    """Devuelve (html, origen, prim): `html` siempre es "" (los textos los ponen las capas de pantalla de `prim`, que
    tienen posición fija; un título HTML aparte chocaba con ellas), `origen` 'ia' o 'respaldo' y `prim` la escena
    procedural ya validada. `correcciones`: problemas que midió el revisor en la versión anterior. (`estilo` se
    conserva por compatibilidad: el fondo ya lo elige la escena.)"""
    escenas = guion["escenas"]
    escena = escenas[indice]
    dur = duracion_estimada(escena["voz"])
    portada = indice == 0 and bool(guion.get("portada", {}).get("texto"))
    base = PROMPT_ESCENA.format(
        titulo=guion.get("titulo", ""), n=indice + 1, total=len(escenas),
        resumen="\n".join(f"{i + 1}. {e['voz']}" for i, e in enumerate(escenas)),
        voz=escena["voz"], visual=escena.get("visual") or "algo que muestre lo que dice la narración",
        dur=dur, fin=max(1.0, dur - 1.5), max_textos=MAX_TEXTOS_PANTALLA, referencia=prim.describir(),
        modelos=", ".join(prim.MODELOS), ejemplo=EJEMPLO, nota_portada=NOTA_PORTADA if portada else "", **paleta)
    problemas = list(correcciones or [])
    if router.has_any:
        for intento in range(INTENTOS):
            prompt = base + (PROMPT_CORRECCION.format(problemas="\n".join(f"- {p}" for p in problemas)) if problemas else "")
            try:
                texto, _ = router.complete_any(prompt, json_mode=True, max_tokens=6000, temperature=0.7, timeout=150)
            except Exception as error:
                print(f"[Animador] escena {indice + 1}: {error}")
                break
            datos = _extraer_json(texto)
            if datos is None:
                problemas = ["la respuesta no era un objeto JSON válido: devuelve SOLO el JSON"]
            else:
                limpia, problemas = prim.validar(datos)
                if limpia is not None:
                    limpia = _ajustar_pantalla(_asegurar_camara(limpia, dur), portada)
                    return "", "ia", limpia
            print(f"[Animador] escena {indice + 1}: escena inválida (intento {intento + 1}): {'; '.join(problemas)[:200]}")
    respaldo = prim.respaldo(escena["voz"], color=paleta["principal"], semilla=indice * 7 + 3)
    return "", "respaldo", _ajustar_pantalla(respaldo, portada)
