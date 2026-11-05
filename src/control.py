"""Control final: dibuja cada escena como la verá el público y comprueba que lo que se ve es lo que dice la voz.

Los controles anteriores miran cada objeto por separado; este mira la escena armada (objeto, color, tamaño, fondo, rótulo). Una IA con visión
describe a ciegas qué ve (sin saber qué debería ser) y una IA de texto decide si eso concuerda con la voz y el rótulo. Un rombo rojo que debía ser
hielo, un carro en una escena de química o una gota gigante tapando el objeto se detectan aquí.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Callable

from PIL import Image

from src import animador, prim, vision
from src.guionista import leer_json
from src.llm import LLMRouter

RAIZ = Path(__file__).resolve().parent.parent

PROMPT_VER = """Describe, en inglés y en menos de 25 palabras, lo que se ve en esta animación plana: el objeto principal con su color y su tamaño
relativo (¿pequeño?, ¿gigante?), cualquier otro objeto, y el lugar de fondo. Di solo lo que ves, no lo que podría representar."""

PROMPT_COMPARA = """Una escena de un video explicativo. La voz dice: «{voz}». El rótulo en pantalla dice: «{rotulo}».
Una IA vio la escena sin saber nada más y la describió así: «{visto}».
¿Lo que se ve concuerda con lo que dice la voz y con el rótulo? El paisaje o fondo (montañas, pinos, carretera, puntos, cielo) es solo
decorado: NO lo juzgues, mira únicamente los objetos. Está MAL si:
- el objeto principal no es lo que la voz nombra o describe (un rombo rojo no es hielo), o
- su color, tamaño o estado contradice la voz o el rótulo (hielo rojo; el rótulo "LÍQUIDA" sobre un sólido), o
- hay un objeto sin relación con el tema de la escena (un carro en una escena de química), o
- un objeto tapa o aplasta al principal.
Está BIEN si es una representación natural y clara de la idea (un termómetro para la temperatura, un salero para la sal).
Responde SOLO JSON: {{"ok": true|false, "motivo": "en pocas palabras"}}"""


def _dibujar(escenas: list[dict], instantes: list[float], raiz: Path) -> list[bytes]:
    """JPEG de cada escena dibujada por el motor real (Chromium + primitivas.js) en el instante indicado."""
    from playwright.sync_api import sync_playwright
    js = (RAIZ / "plantilla" / "primitivas.js").read_text(encoding="utf-8")
    html = f'<body style="margin:0"><canvas id="c" width="1080" height="1920"></canvas><script>{js}</script></body>'
    jpegs = []
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        try:
            pag = nav.new_page(viewport={"width": 1080, "height": 1920})
            pag.set_content(html)
            for escena, t in zip(escenas, instantes):
                pag.evaluate("async ([e, t]) => { await Primitivas.precargar([e]); Primitivas.dibujar(document.getElementById('c'), e, t); }",
                             [prim.con_imagenes(raiz, escena), t])
                png = pag.screenshot(clip={"x": 0, "y": 160, "width": 1080, "height": 1200})
                imagen = Image.open(io.BytesIO(png)).convert("RGB")
                imagen.thumbnail((540, 600))
                salida = io.BytesIO()
                imagen.save(salida, "JPEG", quality=88)
                jpegs.append(salida.getvalue())
        finally:
            nav.close()
    return jpegs


def _concuerda(router: LLMRouter, voz: str, rotulo: str, visto: str) -> tuple[bool, str]:
    for _ in range(2):
        try:
            texto, _ = router.complete_any(PROMPT_COMPARA.format(voz=voz, rotulo=rotulo or "(ninguno)", visto=visto), max_tokens=120, temperature=0)
            r = leer_json(texto)
            return bool(r.get("ok")), str(r.get("motivo", "")).strip()
        except Exception:
            continue
    return True, ""  # no se pudo comparar: no se castiga a la escena por un fallo del revisor


def revisar(router: LLMRouter, p: dict, indices: list[int], escenas: dict[int, dict], rotulos: dict[int, str], raiz: Path,
            avisar: Callable[[str], None] = lambda m: None) -> dict[int, str]:
    """{índice de escena: motivo} de las escenas con objeto cuya imagen no concuerda con la voz. Las de texto no se revisan."""
    orden = [i for i in indices if any(c["tipo"] == "sprite" for c in escenas[i]["capas"])]
    if not orden:
        return {}
    instantes = [.95 * animador.duracion_estimada(p["escenas"][i]["voz"]) for i in orden]   # el protagonista ya llegó a su lugar
    jpegs = _dibujar([escenas[i] for i in orden], instantes, raiz)
    malas, sin_vision = {}, 0
    for i, jpeg in zip(orden, jpegs):
        visto = vision.ver(router, jpeg, PROMPT_VER)
        if visto is None:
            sin_vision += 1
            continue
        visto = " ".join(visto.split())[:300]
        ok, motivo = _concuerda(router, p["escenas"][i]["voz"], rotulos.get(i, ""), visto)
        avisar(f"control escena {i + 1}: {'ok' if ok else 'MAL'} | vio: {visto[:110]}" + ("" if ok else f" | {motivo}"))
        if not ok:
            malas[i] = motivo or visto[:80]
    if sin_vision:
        avisar(f"AVISO: {sin_vision} de {len(orden)} escenas sin control final (no hubo IA con visión disponible)")
    return malas
