"""Animador IA: convierte cada escena del guion en una escena procedural (src/prim.py + plantilla/primitivas.js).

La IA describe la escena como JSON {fondo, camara, capas}; `prim.validar` lo limpia (tipos, rangos, colores) y,
si no hay arreglo tras reintentar, `prim.respaldo` arma una escena viva en código. Ya no se dibuja SVG libre.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from src import prim
from src.llm import LLMRouter

INTENTOS = 3  # una respuesta + 2 reintentos con los problemas detectados
EJEMPLO_PERSONAJE = Path(__file__).resolve().parent.parent / "config" / "personaje_ejemplo.json"
MAX_TEXTOS_PANTALLA = 3

# Escena de otro tema, para mostrar el nivel de detalle y el uso de cámara, unidades y tiempos.
EJEMPLO = json.dumps({
    "fondo": {"tema": "tejido"},
    "camara": [{"t": 0, "x": 0, "y": 520, "ancho": 1500}, {"t": 3.5, "x": 0, "y": 470, "ancho": 1300},
               {"t": 7, "x": 0, "y": 230, "ancho": 520}, {"t": 10, "x": 0, "y": 330, "ancho": 800},
               {"t": 14, "x": 0, "y": 420, "ancho": 1150}],
    "capas": [
        {"tipo": "estratos", "x": -2000, "y": -60, "alto": 50, "lineas": 4, "color": "#c9d4e8", "onda": 3},
        {"tipo": "campoCelulas", "x": -1500, "y": 0, "ancho": 3000, "alto": 120, "radio": 22, "color": "#6f7dff",
         "colorNucleo": "#9aa6ff", "aparicion": "onda", "desde": 0, "profundidad": .5,
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

# Escena de un tema sin células: el detalle sale de las figuras, la red, las corrientes y los datos, no de un campo de relleno.
EJEMPLO_SIN_CELULAS = json.dumps({
    "fondo": {"tema": "oscuro"}, "unidad": "m", "escala": False,
    "camara": [{"t": 0, "x": 0, "y": 900, "ancho": 1600}, {"t": 4, "x": -60, "y": 820, "ancho": 1050},
               {"t": 8, "x": 40, "y": 780, "ancho": 620}, {"t": 12, "x": 0, "y": 850, "ancho": 900}],
    "capas": [
        {"tipo": "rejilla", "x": -1500, "y": 300, "ancho": 3000, "alto": 1100, "paso": 90, "tam": 4, "color": "#2d6bff",
         "colorPulso": "#9ec1ff", "velocidad": 1, "desde": 0, "profundidad": .75},
        {"tipo": "red", "x": 0, "y": 830, "r": 700, "ry": 380, "nodos": 60, "vecinos": 3, "color": "#2d6bff", "colorNodo": "#7fa8ff",
         "pulsos": True, "grosor": 3, "desde": 0, "duracion": 4, "profundidad": .3},
        {"tipo": "anillos", "x": 0, "y": 800, "r": 560, "ry": 430, "n": 3, "color": "#5dff9c", "periodo": 4, "grosor": 3, "desde": 1},
        {"tipo": "orbita", "x": 0, "y": 800, "r": 330, "n": 5, "tam": 12, "color": "#5dff9c", "periodo": 9, "inclinacion": .45, "desde": 0.6},
        {"tipo": "figura", "modelo": "chip", "x": 0, "y": 800, "tam": 420, "desde": 0.3},
        {"tipo": "corriente", "puntos": [[-1100, 1000], [-400, 930], [-120, 840]], "color": "#ffd23f", "n": 40, "tam": 6, "ancho": 24,
         "velocidad": 260, "flecha": True, "desde": 2.2},
        {"tipo": "etiqueta", "texto": "procesador", "x": 120, "y": 760, "dx": 200, "dy": -190, "desde": 1.4, "color": "#a8ffc9"},
        {"tipo": "numero", "texto": "3×", "sub": "más rápido", "desde": 6.5, "color": "#ffd23f"},
    ],
}, ensure_ascii=False, separators=(",", ":"))

NOTA_CELULAS = """- Esta escena SÍ trata de algo celular: "campoCelulas", "vaso" y "estratos" pueden ir como contexto, nunca como relleno.
  Máximo UN campoCelulas por escena, con pocas células grandes y legibles (radio mayor que ancho/60), y el protagonista (figura, red,
  enjambre) con más detalle y tamaño que el campo."""
NOTA_SIN_CELULAS = """- Esta escena NO trata de células ni tejido: NO uses "campoCelulas", "vaso" ni "estratos". Da el detalle con figuras, redes,
  corrientes, ondas, órbitas, gráficas, diales, ramas o partículas, y con la cámara."""

NOTA_PORTADA = """
- ¡ESTA ESCENA ES LA PORTADA (la miniatura del video)! Abajo (píxeles 860-1240) se pone un título gigante encima.
  El protagonista debe verse COMPLETO desde el segundo 0 (capas con desde:0) y quedar ENCIMA del título,
  entre los píxeles y 560 y 860: el centro de la cámara cae en y=860, así que pon el protagonista a unos ancho/7 por
  ENCIMA del centro de la cámara (y_mundo = y_cámara − ancho/7) y que no pase de la mitad del ancho visible. SIN capas de pantalla (etiqueta, numero, cita, frase, grafica,
  dial)."""

PROMPT_ESCENA = """Eres animador de videos explicativos verticales para celular. Describe UNA escena como JSON para un motor de
dibujo procedural (cámara que se mueve por un mundo con figuras, redes, corrientes, partículas, gráficas...).

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
  alrededor, contexto que dé escala y detalle (redes, corrientes, partículas, ondas, otras figuras más pequeñas). Cuadros vacíos = escena mala.
- Las capas con "desde" aparecen con un fundido: escalona las apariciones para que la escena vaya construyéndose.
- DETALLE SIN RELLENO: el fondo da volumen con pocas capas lejanas, no con muchas cosas. Pon "profundidad" (0 a 1) en las capas de
  contexto (rejilla, campoCelulas, red, estratos): las aleja, las vuelve borrosas y las mueve menos que la cámara (paralaje).
  El protagonista va SIN profundidad, grande, y con la cámara lo bastante cerca para ver su detalle fino (escamas, orgánulos, fibras).
- Máximo {max_textos} capas de pantalla con texto (etiqueta, numero, cita, frase); texto corto, en español.
{nota_celulas}
- "forma" solo como acento pequeño (núcleo, roncha, gota): nunca como objeto principal ni más de 2 por escena.
- En "figura" NO cambies "color" ni "color2" (cada modelo ya trae sus colores naturales) salvo para resaltarla.
- "frase" y "cita" solo para ideas que NO están en la narración (los subtítulos ya repiten lo que se dice); si no aportan, no las pongas.
- Colores hex: principal {principal}, secundario {secundario}, acento {acento}, peligro {peligro}, ok {ok},
  blanco #ffffff. Sobre fondo oscuro usa colores vivos; con tema "claro" usa colores oscuros y saturados.

CAPAS DISPONIBLES (? = opcional; todas aceptan desde? y hasta? en segundos). Respeta los rangos:
{referencia}
Modelos de "figura": {modelos}.
{personajes}

NO USES (hace ver el video genérico): textos de "sígueme", "like" o "suscríbete"; signos de exclamación;
palabras de relleno como "increíble", "secreto", "brutal", "épico", "maestro".

EJEMPLO de una escena bien hecha (otro tema; fíjate en el movimiento de cámara, los tiempos escalonados y el protagonista):
{ejemplo}
"""

PROMPT_REPARTO = """Eres director de arte de un video explicativo vertical. Antes de animar las escenas, DISEÑA los personajes y objetos
que se repiten en el video, para dibujarlos una sola vez y que se vean IGUAL en todas las escenas.

Video: "{titulo}". Escenas (narración | qué se muestra):
{escenas}

TAREA: decide qué sujetos recurrentes necesita el video y que NO se pueden dibujar con los modelos de "figura" ({modelos}):
animales, objetos o herramientas concretos (por ejemplo una nutria, una piedra, una almeja). NO los disfraces con un modelo parecido:
un gato no es una nutria. Pocos y reconocibles: entre 1 y 4 diseños (los que aparecen en varias escenas o son el protagonista).
Si todo el video se cuenta bien con los modelos de "figura" (cuerpo humano, planeta, chip, dinero...), devuelve {{}}.

FORMATO: devuelve SOLO un objeto JSON (sin ``` ni comentarios) {{"nombre": [piezas], ...}}; el nombre en minúsculas y en singular ("nutria").
Cada diseño es una lista de piezas que se dibujan DE ATRÁS HACIA ADELANTE (lo último tapa a lo anterior).

COORDENADAS LOCALES: el personaje mide ~1 de largo (de -0.5 a 0.5), está centrado en (0,0), con y hacia ABAJO, MIRANDO A LA DERECHA
(la cabeza va en x positivo, la cola en x negativo). Los objetos pequeños (piedra, almeja) también miden ~1 y se escalan al usarlos.

CÓMO DISEÑAR (para que no salgan deformes):
- Entre 8 y 25 piezas con una silueta reconocible: cuerpo grande (elipse o polígono suave), cabeza, hocico, orejas, ojos (forma "ojo"),
  extremidades, cola, y detalles (vientre más claro, bigotes, manchas) en colores naturales de ese sujeto.
- Piezas grandes (cuerpo, cabeza) con "brillo": true y un borde un poco más oscuro que el relleno: así tienen volumen.
- Extremidades con mov "oscilar" (amp en radianes, px/py = el punto donde se une al cuerpo); cola, tentáculos o aletas con mov "ondular";
  respiración o latido con "pulsar"; algo que flota con "flotar". El movimiento es lo que lo hace ver vivo.
- Cada pieza debe tocar o solaparse con otra: nada suelto flotando. Las proporciones importan más que el detalle.

PIEZAS DISPONIBLES:
{referencia}

EJEMPLO completo y bien hecho (una nutria con una piedra; la cola ondula y la pata se mueve):
{ejemplo}
"""

PROMPT_PERSONAJES = """PERSONAJES DEL VIDEO: ya están diseñados ({nombres}). El mismo sujeto debe verse IGUAL en todas las escenas donde aparezca:
dibújalo con {{"tipo":"personaje","ref":"<nombre>","x":..,"y":..,"tam":..}} (tam = su largo en unidades del mundo; "angulo", "espejo", "ruta",
"duracionRuta" y "fase" lo mueven y lo orientan). Si la narración habla de uno de ellos, ES el protagonista: dibújalo grande con "personaje",
NO con una "figura". Con "ruta" haz que nade, camine o se acerque al objeto; varios en la misma escena con "fase" distinta se mueven distinto.
Para un sujeto sin diseño ni modelo de "figura", usa "personaje" con "partes" propias (de 6 a 15 piezas)."""

PROMPT_SIN_REPARTO = """SUJETOS SIN MODELO: si lo que muestra la escena no está en la lista de "figura" (un animal, un objeto concreto), NO lo disfraces con otro
modelo: dibújalo con {{"tipo":"personaje","x":..,"y":..,"tam":..,"partes":[...]}} con piezas propias (de 6 a 15)."""

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


def _bloque_personajes(reparto: dict | None) -> str:
    if reparto:
        return PROMPT_PERSONAJES.format(nombres=", ".join(f'"{n}"' for n in reparto))
    return PROMPT_SIN_REPARTO


def disenar_reparto(router: LLMRouter, guion: dict, paleta: dict) -> dict:
    """UNA llamada de IA por video: lee todo el guion y diseña con piezas los personajes y objetos recurrentes que no tienen
    modelo de `figura` (la nutria, la piedra, la almeja...). Devuelve {nombre: piezas} ya validado por `prim.reparto_valido`
    (puede ser {}). Si la IA no lo logra tras reintentar, el video sigue sin reparto: esto nunca bloquea la fábrica.
    `paleta` se conserva por simetría con `animar_escena`: los personajes llevan colores naturales, no los del nicho."""
    if not router.has_any:
        return {}
    escenas = [e for e in guion["escenas"] if not e.get("cierre")]
    base = PROMPT_REPARTO.format(
        titulo=guion.get("titulo", ""), modelos=", ".join(prim.MODELOS), referencia=prim.describir(),
        escenas="\n".join(f"{i + 1}. {e['voz']} | {e.get('visual') or ''}" for i, e in enumerate(escenas)),
        ejemplo=json.dumps(json.loads(EJEMPLO_PERSONAJE.read_text(encoding="utf-8")), ensure_ascii=False, separators=(",", ":")))
    mejor: dict = {}
    problemas: list[str] = []
    for intento in range(INTENTOS):
        prompt = base + (PROMPT_CORRECCION.format(problemas="\n".join(f"- {p}" for p in problemas)) if problemas else "")
        try:
            texto, _ = router.complete_any(prompt, json_mode=True, max_tokens=9000, temperature=0.6, timeout=180)
        except Exception as error:
            print(f"[Animador] reparto: {error}")
            break
        datos = _extraer_json(texto)
        if datos is None:
            problemas = ["la respuesta no era un objeto JSON válido: devuelve SOLO el JSON"]
            continue
        if len(datos) == 1 and isinstance(datos.get("reparto"), dict):
            datos = datos["reparto"]
        limpio, problemas = prim.reparto_valido(datos)
        if len(limpio) >= len(mejor):
            mejor = limpio
        if len(limpio) == len({prim._norm_ref(n) for n in datos}):  # todo lo pedido quedó: los recortes menores no obligan a repetir
            return limpio
        print(f"[Animador] reparto inválido (intento {intento + 1}): {'; '.join(problemas)[:200]}")
    return mejor


def _centrar_camara(escena: dict, portada: bool) -> dict:
    """Pasó (video de las nutrias): la IA mueve la cámara en y como si fueran píxeles (y=860, 845, 830...) con un ancho de
    1,4 m y el protagonista queda a metros fuera del cuadro. Si el protagonista (la figura o personaje más grande) queda
    del todo fuera de cuadro en una clave de la cámara, esa clave se centra en él (en la portada, ancho/7 más abajo)."""
    cuerpos = [c for c in escena["capas"] if c["tipo"] in ("personaje", "figura") and not c.get("ruta") and not c.get("profundidad")]
    if not cuerpos:
        return escena
    p = max(cuerpos, key=lambda c: c["tam"])
    for k in escena["camara"]:
        lejos = max(abs(p["x"] - k["x"]), abs(p["y"] - k["y"])) > k["ancho"] + p["tam"] / 2
        if lejos:
            k["x"], k["y"] = p["x"], p["y"] + (k["ancho"] / 7 if portada else 0)
    return escena


def _sin_acentos(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()


def _personajes_ausentes(escena_guion: dict, limpia: dict, reparto: dict | None) -> list[str]:
    """Problemas por personajes del reparto que la narración nombra y la escena no dibuja (pasó: la piedra salió como moneda)."""
    texto = _sin_acentos(f"{escena_guion['voz']} {escena_guion.get('visual') or ''}")
    usados = {prim._norm_ref(c.get("ref")) for c in limpia["capas"] if c["tipo"] == "personaje"}
    return [f"la escena habla de '{n}' pero no la dibujas: añade {{\"tipo\":\"personaje\",\"ref\":\"{n}\",...}} (NO la sustituyas por una figura de otra cosa)"
            for n in (reparto or {}) if n not in usados and re.search(rf"\b{re.escape(_sin_acentos(n))}(?:s|es)?\b", texto)]


def animar_escena(router: LLMRouter, guion: dict, indice: int, paleta: dict, estilo: str = "plano",
                  correcciones: list[str] | None = None, reparto: dict | None = None) -> tuple[str, str, dict]:
    """Devuelve (html, origen, prim): `html` siempre es "" (los textos los ponen las capas de pantalla de `prim`, que
    tienen posición fija; un título HTML aparte chocaba con ellas), `origen` 'ia' o 'respaldo' y `prim` la escena
    procedural ya validada. `correcciones`: problemas que midió el revisor en la versión anterior. (`estilo` se
    conserva por compatibilidad: el fondo ya lo elige la escena.) `reparto`: personajes del video {nombre: piezas}
    (ver `disenar_reparto`) que la escena puede usar con {"tipo": "personaje", "ref": nombre}."""
    escenas = guion["escenas"]
    escena = escenas[indice]
    dur = duracion_estimada(escena["voz"])
    portada = indice == 0 and bool(guion.get("portada", {}).get("texto"))
    celulas = prim.contexto_celular(f"{escena['voz']} {escena.get('visual') or ''}")  # el contexto decide, no el nicho
    base = PROMPT_ESCENA.format(
        titulo=guion.get("titulo", ""), n=indice + 1, total=len(escenas),
        resumen="\n".join(f"{i + 1}. {e['voz']}" for i, e in enumerate(escenas)),
        voz=escena["voz"], visual=escena.get("visual") or "algo que muestre lo que dice la narración",
        dur=dur, fin=max(1.0, dur - 1.5), max_textos=MAX_TEXTOS_PANTALLA, referencia=prim.describir(),
        modelos=", ".join(prim.MODELOS), personajes=_bloque_personajes(reparto), ejemplo=EJEMPLO if celulas else EJEMPLO_SIN_CELULAS,
        nota_celulas=NOTA_CELULAS if celulas else NOTA_SIN_CELULAS, nota_portada=NOTA_PORTADA if portada else "", **paleta)
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
                limpia, problemas = prim.validar(datos, celulas=celulas, reparto=reparto)
                if limpia is not None:
                    limpia = _ajustar_pantalla(_centrar_camara(_asegurar_camara(limpia, dur), portada), portada)
                    ausentes = _personajes_ausentes(escena, limpia, reparto)
                    if not ausentes or intento == INTENTOS - 1:  # sin el personaje se acepta en el último intento: la escena sigue siendo válida
                        return "", "ia", limpia
                    problemas = ausentes
            print(f"[Animador] escena {indice + 1}: escena inválida (intento {intento + 1}): {'; '.join(problemas)[:200]}")
    respaldo = prim.respaldo(escena["voz"], color=paleta["principal"], semilla=indice * 7 + 3, celulas=celulas)
    return "", "respaldo", _ajustar_pantalla(respaldo, portada)
