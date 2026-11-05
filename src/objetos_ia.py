"""Objetos vectoriales diseñados por la IA: para lo específico que no está en la biblioteca (src/objetos.py).

La IA de texto describe el objeto como piezas planas (elipses, polígonos, líneas) sobre un lienzo en píxeles, con ejemplos del estilo de la
biblioteca; el código valida las piezas contra el esquema del motor, las dibuja de verdad (Chromium + plantilla/primitivas.js) y una IA con
visión comprueba que se parece a lo pedido. Si no, se le dice qué se vio y se reintenta.
"""

from __future__ import annotations

import io
import json
import re
from pathlib import Path
from typing import Optional

from PIL import Image

from src import objetos, prim
from src.guionista import leer_json
from src.llm import LLMRouter

RAIZ = Path(__file__).resolve().parent.parent
INTENTOS = 3
MAX_PIEZAS = 34
COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")

EJEMPLO_CONO = {"ancho": 300, "alto": 340, "metros": 0.45, "piezas": [
    {"forma": "poligono", "puntos": [[150, 10], [235, 290], [65, 290]], "color": "#f28c28", "brillo": True},
    {"forma": "poligono", "puntos": [[124, 95], [176, 95], [192, 150], [108, 150]], "color": "#fafafa"},
    {"forma": "poligono", "puntos": [[35, 285], [265, 285], [265, 330], [35, 330]], "suave": True, "color": "#3c3237"}]}
EJEMPLO_TAZA = {"ancho": 360, "alto": 300, "metros": 0.1, "piezas": [
    {"forma": "linea", "puntos": [[270, 110], [330, 120], [335, 190], [265, 215]], "color": "#d9d3c7", "grosor": 22},
    {"forma": "poligono", "puntos": [[40, 70], [280, 70], [262, 250], [58, 250]], "suave": True, "color": "#f1ede4", "brillo": True},
    {"forma": "elipse", "x": 160, "y": 72, "rx": 120, "ry": 26, "color": "#c9c2b4"},
    {"forma": "elipse", "x": 160, "y": 74, "rx": 106, "ry": 20, "color": "#6b3f2a"},
    {"forma": "poligono", "puntos": [[60, 140], [260, 140], [255, 175], [64, 175]], "color": "#d1432f"}]}

PROMPT_OBJETO = """Eres ilustrador vectorial. Dibuja "{nombre}" ({descripcion}) como un objeto plano y limpio hecho de piezas, para un video animado.

Lienzo de diseño: ancho x alto en píxeles (elige entre 200 y 900), origen arriba a la izquierda, y crece hacia abajo. Las piezas se dibujan de
atrás hacia adelante. Formas disponibles (todas con "color" hex #RRGGBB):
- {{"forma":"elipse","x":cx,"y":cy,"rx":radio,"ry":radio_vertical,"rot":radianes?,"color":"#..","borde":"#.."?,"grosor":px?,"brillo":true?,"opacidad":0-1?}}
- {{"forma":"poligono","puntos":[[x,y],...],"suave":true?,"color":"#..","brillo":true?}}   (3 a 24 puntos; suave = esquinas redondeadas)
- {{"forma":"linea","puntos":[[x,y],...],"grosor":px,"color":"#.."}}   (2 a 12 puntos)
"brillo" da volumen con una luz suave: úsalo en las piezas grandes. Las ruedas, hélices o agujas pueden llevar
"mov":{{"tipo":"girar","vel":vueltas_por_segundo,"px":cx,"py":cy}} (el pivote es el centro de giro).

Estilo: colores lisos y alegres (4 a 7 tonos), una silueta clara y reconocible a primera vista, detalles de otro tono (sombra más oscura, brillos
más claros), proporciones correctas, todo dentro del lienzo y centrado, SIN texto ni letras. Entre 8 y {max_piezas} piezas.
También di "metros": el ancho real del objeto en metros.

Ejemplo (cono):
{ejemplo1}
Ejemplo (taza):
{ejemplo2}
{correccion}
Responde SOLO con el JSON {{"ancho":..,"alto":..,"metros":..,"piezas":[...]}}."""


def _validar(d: dict) -> tuple[Optional[dict], list[str]]:
    """Objeto en el formato del motor, o los problemas que tiene."""
    problemas = []
    try:
        ancho, alto, metros = float(d["ancho"]), float(d["alto"]), float(d["metros"])
        piezas = d["piezas"]
    except (KeyError, TypeError, ValueError):
        return None, ["faltan ancho, alto, metros o piezas"]
    if not (100 <= ancho <= 1200 and 100 <= alto <= 1200):
        problemas.append("ancho y alto deben estar entre 100 y 1200")
    if not (1e-4 <= metros <= 1e4):
        problemas.append("metros fuera de rango")
    if not isinstance(piezas, list) or not 4 <= len(piezas) <= MAX_PIEZAS:
        return None, problemas + [f"debe haber entre 4 y {MAX_PIEZAS} piezas"]
    for i, p in enumerate(piezas):
        if not isinstance(p, dict) or not COLOR.match(str(p.get("color", ""))):
            problemas.append(f"pieza {i + 1}: color inválido (debe ser #RRGGBB)")
    if problemas:
        return None, problemas
    partes, avisos = prim._partes(objetos._normalizar(piezas, ancho, alto), "objeto")
    if not partes:
        return None, ["ninguna pieza válida: " + "; ".join(avisos[:3])]
    return {"partes": partes, "aspecto": round(ancho / alto, 4), "metros": metros}, avisos


def dibujar_png(objeto: dict, lado: int = 540) -> bytes:
    """El objeto dibujado por el motor real (Chromium + primitivas.js), centrado sobre fondo neutro. Para verlo y verificarlo."""
    from playwright.sync_api import sync_playwright
    js = (RAIZ / "plantilla" / "primitivas.js").read_text(encoding="utf-8")
    html = f'<body style="margin:0"><canvas id="c" width="1080" height="1920"></canvas><script>{js}</script></body>'
    escena = {"fondo": {"tema": "neutro"}, "escala": False, "grano": 0, "velos": False,
              "camara": [{"t": 0, "x": 0, "y": 0, "ancho": 1.6}],
              "capas": [{"tipo": "sprite", "partes": objeto["partes"], "aspecto": objeto["aspecto"], "ancho": 1.0, "x": 0, "y": 0, "desde": 0}]}
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        try:
            pag = nav.new_page(viewport={"width": 1080, "height": 1920})
            pag.set_content(html)
            pag.evaluate("e => Primitivas.dibujar(document.getElementById('c'), e, 1.0)", escena)
            png = pag.screenshot(clip={"x": 0, "y": 860 - 540, "width": 1080, "height": 1080})
        finally:
            nav.close()
    imagen = Image.open(io.BytesIO(png)).convert("RGB").resize((lado, lado))
    salida = io.BytesIO()
    imagen.save(salida, "JPEG", quality=90)
    return salida.getvalue()


def dibujar_svg(datos: bytes, lado: int = 540) -> bytes:
    """JPEG de un SVG (ilustración abierta) sobre fondo neutro, para verificarlo con visión."""
    import base64
    from playwright.sync_api import sync_playwright
    html = (f'<body style="margin:0;background:#8b97a8"><img width="{lado}" height="{lado}" '
            f'src="data:image/svg+xml;base64,{base64.b64encode(datos).decode()}"></body>')
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        try:
            pag = nav.new_page(viewport={"width": lado, "height": lado})
            pag.set_content(html)
            pag.wait_for_timeout(300)
            png = pag.screenshot()
        finally:
            nav.close()
    salida = io.BytesIO()
    Image.open(io.BytesIO(png)).convert("RGB").save(salida, "JPEG", quality=90)
    return salida.getvalue()


def disenar(router: LLMRouter, nombre: str, descripcion: str, esperado: str = "", verbose: bool = True) -> tuple[Optional[dict], list[dict]]:
    """(objeto, intentos). Cada intento: {"jpeg", "motivo"}; el objeto es el primero que la visión acepta (o el primero válido si no hubo
    visión). `esperado`: cómo se llama el objeto, en inglés, para la verificación ciega (por defecto, `nombre`)."""
    from src import vision
    correccion, intentos = "", []
    for n in range(INTENTOS):
        texto, _ = router.complete_any(PROMPT_OBJETO.format(
            nombre=nombre, descripcion=descripcion, max_pieces=MAX_PIEZAS, max_piezas=MAX_PIEZAS,
            ejemplo1=json.dumps(EJEMPLO_CONO), ejemplo2=json.dumps(EJEMPLO_TAZA), correccion=correccion), max_tokens=4000, temperature=0.6)
        try:
            objeto, problemas = _validar(leer_json(texto))
        except Exception as error:
            objeto, problemas = None, [f"no era JSON válido ({error})"]
        if objeto is None:
            correccion = "\nCORRIGE tu respuesta anterior: " + "; ".join(problemas) + "."
            intentos.append({"jpeg": None, "motivo": "inválido: " + "; ".join(problemas)[:120]})
            continue
        jpeg = dibujar_png(objeto)
        aceptado, visto = vision.verificar_objeto(router, jpeg, esperado or nombre)
        motivo = "sin visión disponible" if aceptado is None else ("ok" if aceptado else f"se ve: {visto}")
        intentos.append({"jpeg": jpeg, "motivo": motivo, "objeto": objeto})
        if verbose:
            print(f"  [{nombre}] intento {n + 1}: {motivo}")
        if aceptado is None or aceptado:
            return objeto, intentos
        correccion = (f"\nTu versión anterior se veía como «{visto}», y NO se reconoce como {nombre}. Rediséñalo con una silueta más "
                      "clara y más piezas de detalle.")
    return None, intentos
