#!/usr/bin/env python3
"""Fichas del reparto: renderiza vistas de escenas/reparto.html a PNG 1080x1920 en salida/reparto/.
Uso:  python3 herramientas/ficha.py [--t 2.3] [vista ...]     (sin vistas: todas las predefinidas)
Vistas: hoja, sombra, tito, hombre, mujer, anciano, nino, patito, persona, tiburon, serpiente, poses_sombra, poses_tito, poses_persona, poses_animales, expresiones
Salida: hoja -> salida/reparto/hoja_general.png ; resto -> salida/reparto/ficha_<vista>.png (poses_* -> <vista>.png)"""
import argparse, base64, io, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
TODAS = ["hoja", "sombra", "tito", "hombre", "mujer", "anciano", "nino", "patito", "persona", "tiburon", "serpiente",
         "poses_sombra", "poses_tito", "poses_persona", "poses_animales", "expresiones"]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("vistas", nargs="*")
    ap.add_argument("--t", type=float, default=2.3)
    ap.add_argument("--html", default="escenas/reparto.html")
    ap.add_argument("--salida", default=str(RAIZ / "salida" / "reparto"))
    a = ap.parse_args()
    out = Path(a.salida); out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        nav = pw.chromium.launch(args=["--no-sandbox", "--disable-gpu"])
        pag = nav.new_page(viewport={"width": 1080, "height": 1920})
        errores = []
        pag.on("pageerror", lambda e: errores.append(str(e)))
        pag.goto((RAIZ / a.html).resolve().as_uri() + "?render=1")
        pag.wait_for_function("window.Ilustra && window.Ilustra.listo && window.ESCENA")
        for v in (a.vistas or TODAS):
            png = pag.evaluate("""([v, t]) => { window.REPARTO_VISTA = v; const cv = document.getElementById('lienzo'); Ilustra.renderizarEn(cv, t); return cv.toDataURL('image/png'); }""", [v, a.t])
            im = Image.open(io.BytesIO(base64.b64decode(png.split(",", 1)[1]))).convert("RGB")
            nombre = "hoja_general.png" if v == "hoja" else (f"{v}.png" if v.startswith("poses_") or v == "expresiones" else f"ficha_{v}.png")
            im.save(out / nombre); print(out / nombre)
        nav.close()
    if errores:
        print("ERRORES EN LA PÁGINA:", *errores, sep="\n", file=sys.stderr); sys.exit(1)

if __name__ == "__main__":
    main()
