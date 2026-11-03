"""Guionista IA: propone temas sin repetir y escribe guiones con un contrato verificable."""

from __future__ import annotations

import json
import random
import re

from src.llm import LLMRouter

ESCENAS_MIN, ESCENAS_MAX = 5, 8
PALABRAS_MIN, PALABRAS_MAX = 100, 160   # ≈ 35-60 s con la voz a +8 %

PROMPT_GUION = """Eres guionista de videos cortos verticales (YouTube Shorts / TikTok) que explican un tema
con gráficos animados sencillos (diagramas, flechas, formas, íconos), no con fotos.

Nicho: {nombre}. {descripcion}
Tono: {tono}
Tema: {tema}

Reglas:
- Español latino neutro. Frases cortas y concretas, pensadas para leerse en voz alta.
- Entre {emin} y {emax} escenas, y entre {pmin} y {pmax} palabras de narración en total.
- Escena 1 = gancho: arranca directo con el dato que contradice lo que la gente cree, en la primera frase
  (nada de "hoy te voy a contar"). Máximo 22 palabras.
- Cada escena explica UNA sola idea que se pueda dibujar como un diagrama simple.
- Solo hechos ampliamente aceptados. No inventes cifras, fechas, estudios ni récords; si dudas de un dato, no lo uses.
- Nada de clickbait falso ("no vas a creer", "nadie habla de esto").
- La última escena cierra con un dato útil y termina exactamente con: "{cta}"
- "visual": 1-2 frases que digan qué dibujar (formas, flechas, etiquetas de 1 a 3 palabras). Sin fotos ni personas realistas.
- "clip": 2-4 palabras EN INGLÉS para buscar un video real de stock que muestre esa escena (algo filmable y
  concreto: "giraffe drinking water", "close up skin hair", "heart beating animation"). Sin nombres propios.

PORTADA (lo que se ve en el primer segundo y en la miniatura; es lo que decide si alguien mira el video):
- "texto": 2 a 5 palabras, máximo 24 letras, que choquen con lo que la gente cree. Fórmulas que funcionan:
  "NO X: Y" · "SIN X Y SIGUE" · "TU X HACE Y" · "LA MISMA X" · "X NO ES Y" · "NACE X, SE VUELVE Y".
  Ejemplos de estilo (otros temas): "NO DUERME: APAGA MEDIO CEREBRO" · "TU CEREBRO NO SIENTE DOLOR" ·
  "NACEN GRISES" · "TRES CORAZONES".
- "destacado": la palabra (o dos) del texto que se pinta en color: la del giro.
- "sub": 4 a 9 palabras en minúsculas que explican el giro, ej. "el flamenco se pinta con lo que come".
- Debe ser VERDAD: un gancho exagerado o falso destruye la confianza del público.
{extra}
Responde SOLO con este JSON:
{{"titulo": "título para YouTube, máximo 70 caracteres",
  "portada": {{"texto": "...", "destacado": "...", "sub": "..."}},
  "escenas": [{{"voz": "narración de la escena", "visual": "qué se dibuja", "clip": "stock video search"}}],
  "caption": "descripción de 1 o 2 frases",
  "hashtags": ["#ejemplo", "... entre 5 y 8"]}}"""

PROMPT_TEMA = """Propón UN tema nuevo para un video corto explicativo con gráficos animados.
Nicho: {nombre}. {descripcion}
Debe ser algo concreto que la gente se pregunta, explicable en 45 segundos con diagramas simples,
y basado en hechos comprobables. Ejemplos del estilo: {ejemplos}
NO repitas ni parafrasees ninguno de estos temas ya usados: {usados}
Responde SOLO JSON: {{"tema": "..."}}"""


def leer_json(texto: str) -> dict:
    texto = re.sub(r"^```(?:json)?|```$", "", texto.strip(), flags=re.M)
    inicio, fin = texto.find("{"), texto.rfind("}")
    if inicio < 0 or fin < 0:
        raise ValueError("la IA no devolvió JSON")
    return json.loads(texto[inicio:fin + 1])


def _normalizar(t: str) -> str:
    return re.sub(r"[^a-z0-9ñ ]", "", t.lower()).strip()


def proponer_tema(router: LLMRouter, nicho: dict, usados: list[str]) -> str:
    """Tema nuevo para el nicho. Con IA si hay; si no, una idea del banco que no se haya usado."""
    vistos = {_normalizar(u) for u in usados}
    libres = [i for i in nicho.get("ideas", []) if _normalizar(i) not in vistos]
    if router.has_any:
        try:
            texto, _ = router.complete_any(PROMPT_TEMA.format(
                nombre=nicho["nombre"], descripcion=nicho["descripcion"],
                ejemplos="; ".join(nicho.get("ideas", [])[:4]),
                usados="; ".join(usados[-60:]) or "ninguno"), max_tokens=300, temperature=0.95)
            tema = str(leer_json(texto).get("tema", "")).strip()
            if tema and _normalizar(tema) not in vistos:
                return tema
        except Exception as error:
            print(f"[Guionista] IA no propuso tema: {error}")
    if not libres:
        raise RuntimeError("Se acabaron las ideas del nicho y la IA no respondió. Agrega ideas en 🧭 Nichos.")
    return random.choice(libres)


def problemas_guion(g: dict) -> list[str]:
    """Lo que incumple el contrato del guion (lista vacía = válido)."""
    escenas = g.get("escenas") or []
    errores = []
    if not (ESCENAS_MIN <= len(escenas) <= ESCENAS_MAX):
        errores.append(f"tiene {len(escenas)} escenas (deben ser {ESCENAS_MIN}-{ESCENAS_MAX})")
    if any(not str(e.get("voz", "")).strip() for e in escenas):
        errores.append("hay escenas sin narración")
    palabras = sum(len(str(e.get("voz", "")).split()) for e in escenas)
    if not (PALABRAS_MIN * 0.9 <= palabras <= PALABRAS_MAX * 1.1):
        errores.append(f"tiene {palabras} palabras (deben ser {PALABRAS_MIN}-{PALABRAS_MAX})")
    if escenas and len(str(escenas[0].get("voz", "")).split()) > 28:
        errores.append("el gancho (escena 1) es demasiado largo")
    if not str(g.get("titulo", "")).strip():
        errores.append("falta el título")
    portada = g.get("portada") or {}
    texto = str(portada.get("texto", "")).strip()
    if not texto:
        errores.append("falta la portada")
    elif len(texto.split()) > 6 or len(texto) > 32:
        errores.append(f"la portada \"{texto}\" es muy larga (máximo 5 palabras)")
    elif str(portada.get("destacado", "")).strip().lower() not in texto.lower():
        errores.append("el 'destacado' de la portada no es una palabra del texto")
    return errores


def escribir_guion(router: LLMRouter, nicho: dict, tema: str) -> dict:
    """Guion validado. Reintenta una vez explicando a la IA qué corregir."""
    extra, ultimo = "", None
    for _ in range(2):
        texto, proveedor = router.complete_any(PROMPT_GUION.format(
            nombre=nicho["nombre"], descripcion=nicho["descripcion"], tono=nicho["tono"], tema=tema,
            emin=ESCENAS_MIN, emax=ESCENAS_MAX, pmin=PALABRAS_MIN, pmax=PALABRAS_MAX,
            cta=nicho["cta"], extra=extra), max_tokens=3000)
        try:
            g = leer_json(texto)
        except Exception as error:
            extra, ultimo = f"\nTu respuesta anterior no era JSON válido ({error}).", None
            continue
        errores = problemas_guion(g)
        ultimo = g
        if not errores:
            break
        extra = "\nCORRIGE: tu versión anterior " + "; ".join(errores) + "."
    if ultimo is None:
        raise RuntimeError("La IA no devolvió un guion válido.")
    return {
        "titulo": str(ultimo.get("titulo", tema)).strip()[:100],
        "portada": {k: str((ultimo.get("portada") or {}).get(k, "")).strip() for k in ("texto", "destacado", "sub")},
        "escenas": [{"voz": str(e.get("voz", "")).strip(), "visual": str(e.get("visual", "")).strip(),
                     "clip": str(e.get("clip", "")).strip(), "html": ""}
                    for e in ultimo.get("escenas", [])],
        "caption": str(ultimo.get("caption", "")).strip(),
        "hashtags": [str(h).strip() for h in ultimo.get("hashtags", []) if str(h).strip()][:8],
        "avisos": problemas_guion(ultimo),
        "proveedor": proveedor,
    }
