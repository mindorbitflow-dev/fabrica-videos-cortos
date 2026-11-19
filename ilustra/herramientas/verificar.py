#!/usr/bin/env python3
"""Verificaciones medibles de una escena de Ilustra.

  python3 herramientas/verificar.py escenas/calle_lluvia.html

1. Determinismo: renderiza t=3.2 dos veces (y también en una página recién abierta) y compara SHA-256 de los píxeles.
2. Rendimiento: tiempo medio de dibujo de 30 cuadros (medido dentro de la página).
3. Continuidad: diferencia media absoluta entre cuadros consecutivos (cuadros 0..59) en la región central (x 70..940, y 430..1190).
"""
import hashlib, statistics, sys, base64, io
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat

sys.path.insert(0, str(Path(__file__).parent))
from render import abrir, cuadro  # noqa: E402


def sha(im):
    return hashlib.sha256(im.tobytes()).hexdigest()


def main():
    html = sys.argv[1]
    ok = True
    with sync_playwright() as pw:
        nav, pag, err = abrir(pw, html)
        _, a = cuadro(pag, 3.2)
        cuadro(pag, 7.7)  # ensuciar estado entre medias
        _, b = cuadro(pag, 3.2)
        nav.close()
        nav, pag, err = abrir(pw, html)
        _, c = cuadro(pag, 3.2)
        h = {sha(a), sha(b), sha(c)}
        print(f"determinismo: {'OK' if len(h) == 1 else 'FALLA'}  sha={sha(a)[:16]}")
        ok &= len(h) == 1
        ms = []
        prev = None
        difs = []
        for i in range(60):
            m, im = cuadro(pag, i / 30)
            ms.append(m)
            reg = im.crop((70, 430, 940, 1190))
            if prev is not None:
                d = ImageStat.Stat(ImageChops.difference(reg, prev)).mean
                difs.append(sum(d) / 3)
            prev = reg
        media = statistics.mean(ms)
        print(f"rendimiento: media {media:.0f} ms/cuadro, máx {max(ms):.0f} ms (presupuesto 500 ms) -> {'OK' if media <= 500 else 'FALLA'}")
        ok &= media <= 500
        print(f"continuidad: dif. media entre cuadros {statistics.mean(difs):.2f}/255, máx {max(difs):.2f}/255 (umbral 12) -> {'OK' if max(difs) < 12 else 'FALLA'}")
        ok &= max(difs) < 12
        if err:
            print("errores de página:", err)
            ok = False
        nav.close()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
