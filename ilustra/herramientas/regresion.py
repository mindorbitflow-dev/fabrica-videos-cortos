#!/usr/bin/env python3
"""Regresión de la Fase 1: las escenas de F1 deben dar exactamente los mismos píxeles (modo 'vector').

  python3 herramientas/regresion.py            # compara con pruebas/linea_base.json; sale con 1 si algo difiere
  python3 herramientas/regresion.py --grabar   # reescribe la línea base con el código actual (úsese solo a propósito)

Cada caso es (página, t). Se renderiza con render.py (Chromium headless, sin GPU) y se compara el SHA-256 de los píxeles
RGB del lienzo de 1080x1920. Al grabar, cada página se renderiza dos veces en páginas nuevas y se exige que coincidan.
"""
import argparse, hashlib, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).parent))
from render import abrir, cuadro  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
BASE = RAIZ / "pruebas" / "linea_base.json"

# (página, [t, ...]). minimo.html usa dist/ilustra.js; las demás cargan src/ directamente.
CASOS = [
    ("escenas/calle_lluvia.html", [3.2, 8.5]),
    ("escenas/interior.html", [3.2]),
    ("escenas/elipsis.html", [3.2]),
    ("escenas/poses.html", [1.0]),
    ("ejemplos/minimo.html", [2.0]),
]


def clave(html, t):
    return f"{html}@{t:g}"


def sha(im):
    return hashlib.sha256(im.tobytes()).hexdigest()


def medir(pw):
    """Devuelve ({clave: sha}, [errores de página], versión del navegador) con una página nueva por escena."""
    res, errs, version = {}, [], None
    for html, ts in CASOS:
        nav, pag, err = abrir(pw, RAIZ / html)
        version = nav.version
        for t in ts:
            _, im = cuadro(pag, t)
            res[clave(html, t)] = sha(im)
        errs += [f"{html}: {e}" for e in err]
        nav.close()
    return res, errs, version


def grabar():
    with sync_playwright() as pw:
        a, ea, ver = medir(pw)
        b, eb, _ = medir(pw)
    if ea or eb:
        print("ERROR: la página dio errores; no se graba la línea base.", *(ea + eb), sep="\n  ", file=sys.stderr)
        return 1
    malos = [k for k in a if a[k] != b[k]]
    if malos:
        print("ERROR: render no determinista entre dos cargas; no se graba la línea base:", *malos, sep="\n  ", file=sys.stderr)
        return 1
    BASE.parent.mkdir(exist_ok=True)
    datos = {
        "formato": 1,
        "descripcion": "SHA-256 de los píxeles RGB (1080x1920) de las escenas de la Fase 1 en modo vector. Generado por regresion.py --grabar.",
        "navegador": f"chromium {ver} (--disable-gpu)",
        "casos": a,
    }
    BASE.write_text(json.dumps(datos, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"línea base grabada: {BASE} ({len(a)} casos)")
    for k, v in a.items():
        print(f"  {k}  {v[:16]}")
    return 0


def comprobar():
    if not BASE.exists():
        print(f"FALLA: no existe {BASE}; créala con --grabar.", file=sys.stderr)
        return 1
    base = json.loads(BASE.read_text(encoding="utf-8"))
    esperado = base["casos"]
    with sync_playwright() as pw:
        obtenido, errs, ver = medir(pw)
    ok = True
    for k, v in obtenido.items():
        if k not in esperado:
            print(f"FALTA EN LA LÍNEA BASE  {k}  {v[:16]}")
            ok = False
        elif esperado[k] != v:
            print(f"DIFIERE  {k}\n    esperado {esperado[k]}\n    obtenido {v}")
            ok = False
        else:
            print(f"OK       {k}  {v[:16]}")
    for k in esperado:
        if k not in obtenido:
            print(f"SOBRA EN LA LÍNEA BASE (caso ya no se ejecuta)  {k}")
            ok = False
    if errs:
        print("ERRORES DE PÁGINA:", *errs, sep="\n  ")
        ok = False
    if not ok and base.get("navegador") and f"chromium {ver}" not in base["navegador"]:
        print(f"nota: la línea base se grabó con {base['navegador']} y ahora se usa chromium {ver}; "
              "una diferencia de navegador también cambia los píxeles.")
    print("REGRESIÓN OK" if ok else "REGRESIÓN FALLA", f"({len(obtenido)} casos)")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--grabar", action="store_true", help="reescribe pruebas/linea_base.json")
    a = ap.parse_args()
    sys.exit(grabar() if a.grabar else comprobar())


if __name__ == "__main__":
    main()
