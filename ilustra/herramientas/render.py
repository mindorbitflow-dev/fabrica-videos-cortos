#!/usr/bin/env python3
"""Renderiza una escena de Ilustra con Chromium headless (Playwright).

Uso:
  python3 herramientas/render.py escenas/calle_lluvia.html --t 3.2                 # un fotograma
  python3 herramientas/render.py escenas/calle_lluvia.html --hoja 12 [--zona]      # hoja de contacto 4x3
  python3 herramientas/render.py escenas/calle_lluvia.html --todos [--mp4]         # todos los fotogramas a 30 fps (+ MP4)
Salida en salida/<nombre_escena>/ . Imprime el tiempo medio de dibujo por cuadro (medido dentro de la página).
"""
import argparse, base64, io, os, shutil, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent


def abrir(pw, html):
    nav = pw.chromium.launch(args=["--no-sandbox", "--disable-gpu"])
    pag = nav.new_page(viewport={"width": 1080, "height": 1920})
    errores = []
    pag.on("pageerror", lambda e: errores.append(str(e)))
    pag.on("console", lambda m: errores.append("console: " + m.text) if m.type == "error" else None)
    pag.goto(Path(html).resolve().as_uri() + "?render=1")
    pag.wait_for_function("window.Ilustra && window.Ilustra.listo && window.ESCENA")
    if errores:
        print("\n".join(errores), file=sys.stderr)
    return nav, pag, errores


def cuadro(pag, t, zona=False):
    r = pag.evaluate("""([t, zona]) => {
        const cv = document.getElementById('lienzo');
        const ms = Ilustra.renderizarEn(cv, t);
        if (zona) Ilustra.dibujarZona(cv.getContext('2d'));
        return {ms, png: cv.toDataURL('image/png')};
    }""", [t, zona])
    return r["ms"], Image.open(io.BytesIO(base64.b64decode(r["png"].split(",", 1)[1]))).convert("RGB")


def hoja(imgs, tiempos, cols=4, ancho=270):
    alto = int(ancho * 1920 / 1080)
    filas = (len(imgs) + cols - 1) // cols
    h = Image.new("RGB", (cols * ancho + (cols + 1) * 8, filas * (alto + 26) + 8), (20, 22, 28))
    d = ImageDraw.Draw(h)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
    except Exception:
        f = ImageFont.load_default()
    for i, (im, t) in enumerate(zip(imgs, tiempos)):
        x = 8 + (i % cols) * (ancho + 8)
        y = 8 + (i // cols) * (alto + 26)
        h.paste(im.resize((ancho, alto), Image.LANCZOS), (x, y))
        d.text((x + 4, y + alto + 4), f"t={t:.2f}s", fill=(220, 220, 220), font=f)
    return h


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html")
    ap.add_argument("--t", type=float, nargs="*")
    ap.add_argument("--hoja", type=int, default=0)
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--mp4", action="store_true")
    ap.add_argument("--zona", action="store_true")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--salida")
    a = ap.parse_args()
    nombre = Path(a.html).stem
    out = Path(a.salida) if a.salida else RAIZ / "salida" / nombre
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        nav, pag, errores = abrir(pw, a.html)
        dur = pag.evaluate("window.ESCENA.duracion")
        tiempos_ms = []
        if a.t:
            for t in a.t:
                ms, im = cuadro(pag, t, a.zona)
                tiempos_ms.append(ms)
                p = out / f"t{t:06.2f}{'_zona' if a.zona else ''}.png"
                im.save(p)
                print(f"{p}  ({ms:.0f} ms)")
        if a.hoja:
            n = a.hoja
            ts = [dur * i / n + dur / (2 * n) for i in range(n)]
            imgs = []
            for t in ts:
                ms, im = cuadro(pag, t, a.zona)
                tiempos_ms.append(ms)
                imgs.append(im)
            p = out / f"hoja_{n}{'_zona' if a.zona else ''}.png"
            hoja(imgs, ts).save(p)
            print(p)
        if a.todos:
            fdir = out / "fotogramas"
            if fdir.exists():
                shutil.rmtree(fdir)
            fdir.mkdir()
            total = int(round(dur * a.fps))
            t0 = time.time()
            for i in range(total):
                ms, im = cuadro(pag, i / a.fps)
                tiempos_ms.append(ms)
                im.save(fdir / f"f{i:04d}.png", compress_level=1)
                if i % 30 == 0:
                    print(f"  cuadro {i}/{total}  dibujo {ms:.0f} ms", flush=True)
            print(f"{total} cuadros en {time.time()-t0:.1f} s (incluye codificar PNG)")
            if a.mp4 and shutil.which("ffmpeg"):
                mp4 = out / f"{nombre}.mp4"
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(a.fps), "-i", str(fdir / "f%04d.png"),
                                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", str(mp4)], check=True)
                print(mp4)
        if tiempos_ms:
            print(f"dibujo: media {sum(tiempos_ms)/len(tiempos_ms):.0f} ms, máx {max(tiempos_ms):.0f} ms, n={len(tiempos_ms)}")
        if errores:
            print("ERRORES EN LA PÁGINA:", *errores, sep="\n", file=sys.stderr)
            sys.exit(1)
        nav.close()


if __name__ == "__main__":
    main()
