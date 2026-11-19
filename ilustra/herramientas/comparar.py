#!/usr/bin/env python3
"""Comparación lado a lado: recorte de la referencia frente a un recorte equivalente de nuestro render.

Paneles (de izquierda a derecha), todos a la misma altura de visualización:
  1. REFERENCIA   recorte de la referencia, ampliado.
  2. NUESTRO      recorte de nuestro render a resolución completa, reducido a la misma altura.
  3. NUESTRO @REF nuestro recorte reducido primero a la resolución de píxeles de la referencia y luego ampliado igual
                  que la referencia: compara a igual cantidad de información (la referencia es una captura pequeña).
Debajo de cada panel imprime métricas objetivas (las usa la rúbrica de ESPECIFICACION_F2.md §9):
  L media / L desv. (luminancia 0-100), saturación media (0-1), fracción de bordes (gradiente fuerte, calculada a la
  resolución común de la referencia) y rango de luminancia entre los percentiles 5 y 95 (L_p5, L_p95).

Uso:
  python3 herramientas/comparar.py --preset mujer --nuestro salida/mejores/1_calle_sonrisa_t9.67.png --caja 430,570,700,1200
  python3 herramientas/comparar.py --ref referencias/ref3_pelo_periodico.png --ref-caja 38,70,140,210 \
         --nuestro salida/x.png --caja 480,560,640,760 --alto 720 --salida salida/revision/pelo.png
  python3 herramientas/comparar.py --listar        # muestra los recortes predefinidos de la referencia
Salida por defecto: salida/revision/comparar_<preset|ref>_<nuestro>.png
"""
import argparse, json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageStat

RAIZ = Path(__file__).resolve().parent.parent
REF = RAIZ / "referencias"
# Recortes en píxeles de la referencia, elegidos para evitar los textos superpuestos de la red social.
PRESETS = {
    "mujer":   ("ref1_calle_abrigo.jpg", (222, 262, 302, 402), "mujer con abrigo claro y bufanda roja (cabeza, manos, torso)"),
    "hombre":  ("ref1_calle_abrigo.jpg", (108, 250, 232, 402), "hombre de abrigo oscuro con paraguas cerrado (silueta, mano)"),
    "calle":   ("ref1_calle_abrigo.jpg", (290, 250, 375, 400), "escaparate cálido y fachada (fondo, luz)"),
    "arco":    ("ref2_arco_nina.png", (40, 60, 240, 180), "fondo con arco en niebla, árboles (perspectiva atmosférica)"),
    "nina":    ("ref2_arco_nina.png", (95, 165, 160, 212), "niña con coletas sonriendo, ojos cerrados (cara pequeña)"),
    "pelo":    ("ref3_pelo_periodico.png", (38, 70, 140, 210), "joven de perfil: pelo en mechones, cara, cuello de camisa"),
    "mano":    ("ref3_pelo_periodico.png", (225, 120, 300, 210), "mano oscura sosteniendo un periódico (dedos)"),
    "niebla":  ("ref3_pelo_periodico.png", (120, 58, 240, 200), "edificio en niebla (bordes perdidos, valores altos)"),
}


def fuente(t):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(f, t)
        except Exception:
            pass
    return ImageFont.load_default()


def caja(s):
    v = [int(round(float(x))) for x in s.split(",")]
    if len(v) != 4 or v[2] <= v[0] or v[3] <= v[1]:
        raise argparse.ArgumentTypeError("caja = x0,y0,x1,y1 con x1>x0, y1>y0")
    return tuple(v)


def metricas(im, lado_comun):
    """im: RGB. Métricas a una resolución común (lado mayor = lado_comun) para que sean comparables."""
    w, h = im.size
    k = lado_comun / max(w, h)
    p = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    L = p.convert("L")
    st = ImageStat.Stat(L)
    hsv = p.convert("HSV")
    sat = ImageStat.Stat(hsv.split()[1]).mean[0] / 255
    # bordes: suavizado igual en ambas (la referencia es JPEG con artefactos) y umbral de gradiente
    hb = L.filter(ImageFilter.GaussianBlur(0.8)).filter(ImageFilter.FIND_EDGES).histogram()
    frac = sum(hb[41:]) / sum(hb)
    # rango de valores: percentiles 5 y 95 de L (estructura de valores; robusto frente al ruido JPEG)
    hist = L.histogram(); tot = sum(hist); acc = 0; p5 = p95 = None
    for i, n in enumerate(hist):
        acc += n
        if p5 is None and acc >= 0.05 * tot: p5 = i
        if p95 is None and acc >= 0.95 * tot: p95 = i
    return {"L_media": st.mean[0] / 2.55, "L_desv": st.stddev[0] / 2.55, "sat": sat, "bordes": frac,
            "L_p5": p5 / 2.55, "L_p95": p95 / 2.55}


def panel(im, alto, titulo, m, f, fp):
    w = max(1, round(im.width * alto / im.height))
    a = im.resize((w, alto), Image.LANCZOS)
    w = max(w, 260)
    out = Image.new("RGB", (w, alto + 150), (24, 26, 32))
    out.paste(a, ((w - a.width) // 2, 34))
    d = ImageDraw.Draw(out)
    d.text((8, 6), titulo, fill=(235, 235, 235), font=f)
    y = alto + 42
    for linea in (f"L media {m['L_media']:5.1f}   L desv {m['L_desv']:5.1f}",
                  f"saturación {m['sat']:.2f}   bordes {m['bordes']:.3f}",
                  f"L p5-p95 {m['L_p5']:4.0f} - {m['L_p95']:4.0f}"):
        d.text((8, y), linea, fill=(200, 205, 215), font=fp)
        y += 26
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--preset", choices=sorted(PRESETS))
    ap.add_argument("--ref", help="imagen de referencia (si no se usa --preset)")
    ap.add_argument("--ref-caja", type=caja)
    ap.add_argument("--nuestro", help="PNG de nuestro render (1080x1920)")
    ap.add_argument("--caja", type=caja, help="recorte de nuestro render x0,y0,x1,y1")
    ap.add_argument("--alto", type=int, default=640, help="altura de visualización de cada panel")
    ap.add_argument("--salida")
    ap.add_argument("--json", action="store_true", help="imprime las métricas en JSON")
    ap.add_argument("--listar", action="store_true")
    a = ap.parse_args()
    if a.listar:
        for k, (f, c, desc) in PRESETS.items():
            print(f"{k:8s} {f:26s} {c}  {desc}")
        return
    if a.preset:
        f, c, _ = PRESETS[a.preset]
        ref_path, ref_caja = REF / f, a.ref_caja or c
    else:
        if not (a.ref and a.ref_caja):
            ap.error("usa --preset o bien --ref y --ref-caja")
        ref_path, ref_caja = Path(a.ref), a.ref_caja
    if not (a.nuestro and a.caja):
        ap.error("faltan --nuestro y --caja")
    ref = Image.open(ref_path).convert("RGB").crop(ref_caja)
    nue = Image.open(a.nuestro).convert("RGB").crop(a.caja)
    # nuestro a la resolución de la referencia: mismo número de píxeles que el recorte de la referencia (por altura)
    k = ref.height / nue.height
    nue_ref = nue.resize((max(1, round(nue.width * k)), ref.height), Image.LANCZOS)
    lado = max(ref.size)
    m_ref, m_nue, m_nr = metricas(ref, lado), metricas(nue, lado), metricas(nue_ref, lado)
    f, fp = fuente(22), fuente(18)
    ps = [panel(ref, a.alto, f"REFERENCIA ({ref.width}x{ref.height} px)", m_ref, f, fp),
          panel(nue, a.alto, f"NUESTRO ({nue.width}x{nue.height} px)", m_nue, f, fp),
          panel(nue_ref.resize(ref.size, Image.LANCZOS) if nue_ref.size != ref.size else nue_ref, a.alto,
                f"NUESTRO @REF ({nue_ref.width}x{nue_ref.height})", m_nr, f, fp)]
    W = sum(p.width for p in ps) + 10 * (len(ps) + 1)
    H = max(p.height for p in ps) + 20
    lam = Image.new("RGB", (W, H), (12, 13, 16))
    x = 10
    for p in ps:
        lam.paste(p, (x, 10))
        x += p.width + 10
    nombre = (a.preset or Path(ref_path).stem) + "_" + Path(a.nuestro).stem
    out = Path(a.salida) if a.salida else RAIZ / "salida" / "revision" / f"comparar_{nombre}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    lam.save(out)
    print(out)
    dif = {k: round(m_nr[k] - m_ref[k], 3) for k in m_ref}
    if a.json:
        print(json.dumps({"referencia": m_ref, "nuestro": m_nue, "nuestro_a_ref": m_nr, "diferencia_ref": dif}, ensure_ascii=False, indent=1))
    else:
        print("métrica        ref    nuestro@ref  diferencia")
        for k in m_ref:
            print(f"{k:12s} {m_ref[k]:8.3f} {m_nr[k]:10.3f} {dif[k]:+10.3f}")


if __name__ == "__main__":
    sys.exit(main())
