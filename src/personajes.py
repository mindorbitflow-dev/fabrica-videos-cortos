"""Imágenes de los personajes de la marca (Sombra y Tito) para publicaciones: posts 1080x1350 con escenario y recortes PNG sin
fondo. Se dibujan con el mismo código de los videos (plantilla/kit.js y plantilla/sombra.js), así que salen idénticos."""

from __future__ import annotations

import asyncio
import base64
from io import BytesIO
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

RAIZ = Path(__file__).resolve().parent.parent
PLANTILLA = RAIZ / "plantilla"
SALIDA = RAIZ / "salida" / "personajes"
LOGO = RAIZ / "assets" / "marca" / "sombra.jpg"
T = 1.3          # instante del dibujo: ojos abiertos, pose estable
RECORTE_POST = (0, 110, 1080, 1460)   # 1080x1350 (4:5) del lienzo vertical de 1080x1920

# nombre: (código JS que dibuja en ctx, es_post). Los posts llevan escenario y acabado de película; los recortes, fondo transparente.
DIBUJOS = {
    "post_sombra_oficina": ("""S30.oficina(ctx, T); S30.detective(ctx, 540, 1200, 1.25, {T, mira: .3});
        S30.escritorio(ctx, T, {y: 990}); S30.pelicula(ctx, T, {fuerza: .6});""", True),
    "post_tito_oficina": ("""S30.oficina(ctx, T); S30.tito(ctx, 540, 1260, 1.45, {T, brazos: 'arriba', boca: 'o', mira: .2});
        S30.pelicula(ctx, T, {fuerza: .6});""", True),
    "post_sombra_y_tito": ("""S30.oficina(ctx, T); S30.detective(ctx, 330, 1180, 1.02, {T, mira: .7});
        S30.escritorio(ctx, T, {y: 960}); S30.tito(ctx, 800, 1260, 1.0, {T, dir: -1, caja: 0, mira: -.7});
        S30.pelicula(ctx, T, {fuerza: .6});""", True),
    "post_sombra_lupa": ("""K.fondo(ctx, '#1b1916', '#050505', '#0f0e0c'); K.halo(ctx, 540, 820, 720, S30.C.oro, .22);
        S30.niebla(ctx, T, {y: 600, alto: 700, a: .12}); S30.detective(ctx, 540, 1420, 1.45, {T, lupa: 1, mira: .4});
        S30.pelicula(ctx, T, {fuerza: .6});""", True),
    "post_marca": ("""K.fondo(ctx, '#1b1916', '#050505', '#0f0e0c'); K.halo(ctx, 540, 520, 560, S30.C.oro, .2);
        ctx.save(); ctx.beginPath(); ctx.arc(540, 470, 190, 0, K.TAU); ctx.clip(); ctx.drawImage(LOGO, 350, 280, 380, 380); ctx.restore();
        ctx.font = '700 70px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#efe7d6'; ctx.fillText('Cada sombra tiene', 540, 740); ctx.fillStyle = S30.C.oro; ctx.fillText('su evidencia', 540, 815);
        S30.tito(ctx, 300, 1420, .95, {T, mira: .6}); S30.detective(ctx, 760, 1420, .9, {T, dir: -1, mira: .5});
        S30.pelicula(ctx, T, {fuerza: .6});""", True),
    "recorte_sombra": ("S30.detective(ctx, 540, 1500, 1.6, {T, mira: .3});", False),
    "recorte_sombra_lupa": ("S30.detective(ctx, 540, 1500, 1.6, {T, lupa: 1, mira: .4});", False),
    "recorte_sombra_duda": ("S30.detective(ctx, 540, 1500, 1.6, {T, rasca: 1, boca: 'duda', mira: .5});", False),
    "recorte_tito": ("S30.tito(ctx, 540, 1500, 1.8, {T, mira: .2});", False),
    "recorte_tito_sorpresa": ("S30.tito(ctx, 540, 1500, 1.8, {T, brazos: 'arriba', boca: 'o', mira: .2});", False),
    "recorte_tito_triste": ("S30.tito(ctx, 540, 1500, 1.8, {T, boca: 'triste', orejas: 1, mira: .3});", False),
}

PAGINA = r"""<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Cormorant+Garamond:wght@700&family=Montserrat:wght@800&family=Space+Mono&display=block" rel="stylesheet">
<style>body{{margin:0;background:transparent}}</style></head><body><canvas id="c" width="1080" height="1920"></canvas>
<script>{kit}</script><script>{sombra}</script><script>
// Globo de diálogo con el texto ajustado: reduce la letra hasta que quepa. (cx, cy) = punta de la cola.
function globo(ctx, x, y, w, h, cx, cy, texto, {{tam = 52, min = 30, fondo = '#efe7d6', color = '#0d0c0b', resalta = '#7a5a1f'}} = {{}}) {{
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 44);
  // la cola sale por el lado más cercano a la punta: costado si la punta está al lado, si no arriba o abajo
  const lado = cx < x || cx > x + w, ex = cx < x ? x : x + w, ey = cy < y ? y : y + h;
  const bx = lado ? ex : Math.min(Math.max(cx, x + 70), x + w - 70), by = lado ? Math.min(Math.max(cy, y + 70), y + h - 70) : ey;
  const [dx, dy] = lado ? [0, 34] : [34, 0];
  ctx.moveTo(bx - dx, by - dy); ctx.lineTo(cx, cy); ctx.lineTo(bx + dx, by + dy);
  ctx.fillStyle = fondo; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#0d0c0b'; ctx.lineWidth = 7; ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 40); ctx.fillStyle = fondo; ctx.fill();
  let lineas, t = tam;
  const partir = t => {{ ctx.font = `800 ${{t}}px Montserrat, sans-serif`; const ls = [];
    let l = ''; for (const p of texto.split(/\s+/)) {{ const n = l ? l + ' ' + p : p; if (ctx.measureText(n.replace(/\*/g, '')).width > w - 80 && l) {{ ls.push(l); l = p; }} else l = n; }}
    if (l) ls.push(l); return ls; }};
  while (true) {{ lineas = partir(t); if (lineas.length * t * 1.22 <= h - 70 || t <= min) break; t -= 2; }}
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const y0 = y + h / 2 - (lineas.length - 1) * t * 1.22 / 2;
  let dorado = false;   // las palabras entre *asteriscos* van resaltadas
  lineas.forEach((l, i) => {{
    let xx = x + w / 2 - ctx.measureText(l.replace(/\*/g, '')).width / 2;
    for (const p of l.split(' ')) {{
      const abre = p.startsWith('*'), limpia = p.replace(/\*/g, '');
      if (abre) dorado = true;
      ctx.fillStyle = dorado ? resalta : color; ctx.fillText(limpia, xx, y0 + i * t * 1.22);
      xx += ctx.measureText(limpia + ' ').width;
      if (/\*[.,;:!?)»"]*$/.test(p)) dorado = false;
    }}
  }});
  ctx.restore();
}}
</script></body></html>"""

# Post de un tema: viñeta de dos cuadros (arriba Tito pregunta en la oficina, abajo Sombra revela). Se dibuja en el lienzo
# vertical y se recorta a 1080x1350. DATOS = {pregunta, respuesta} del guion ("post").
POST = """
const TT = 1.3;
ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 1080, 1920);
ctx.save(); ctx.beginPath(); ctx.rect(24, 134, 1032, 640); ctx.clip();
ctx.translate(0, -560); S30.oficina(ctx, TT);
S30.tito(ctx, 820, 1335, 1.0, {T: TT, dir: -1, brazos: 'arriba', boca: 'o', mira: -.5});
S30.pelicula(ctx, TT, {fuerza: .5}); ctx.restore();
ctx.strokeStyle = '#efe7d6'; ctx.lineWidth = 6; ctx.strokeRect(24, 134, 1032, 640);
globo(ctx, 56, 170, 560, 300, 650, 520, DATOS.pregunta, {tam: 54});
ctx.save(); ctx.beginPath(); ctx.rect(24, 798, 1032, 638); ctx.clip();
K.fondo(ctx, '#2a2622', '#0d0c0b', '#1b1916'); K.halo(ctx, 260, 1150, 520, S30.C.oro, .28);
S30.detective(ctx, 240, 1460, .95, {T: TT, lupa: 1, mira: .6});
S30.pelicula(ctx, TT, {fuerza: .5}); ctx.restore();
ctx.strokeStyle = '#efe7d6'; ctx.lineWidth = 6; ctx.strokeRect(24, 798, 1032, 638);
globo(ctx, 430, 830, 600, 470, 330, 1000, DATOS.respuesta, {tam: 50});
ctx.save(); ctx.beginPath(); ctx.arc(1000, 1372, 46, 0, K.TAU); ctx.clip(); ctx.drawImage(LOGO, 954, 1326, 92, 92); ctx.restore();
ctx.font = '600 30px Cinzel, serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = S30.C.oro;
ctx.fillText('SOMBRA DE EVIDENCIA', 935, 1374);
"""


async def _dibujar(destino: Path, dibujos: dict, datos: dict | None = None) -> list[Path]:
    destino.mkdir(parents=True, exist_ok=True)
    pagina = destino / "personajes.html"
    pagina.write_text(PAGINA.format(kit=(PLANTILLA / "kit.js").read_text(encoding="utf-8"),
                                     sombra=(PLANTILLA / "sombra.js").read_text(encoding="utf-8")), encoding="utf-8")
    logo = "data:image/jpeg;base64," + base64.b64encode(LOGO.read_bytes()).decode()
    rutas = []
    async with async_playwright() as pw:
        nav = await pw.chromium.launch()
        try:
            pag = await nav.new_page(viewport={"width": 1080, "height": 1920})
            await pag.goto(pagina.resolve().as_uri())
            await pag.evaluate("Promise.all([document.fonts.ready, K.listo, S30.listo])")
            await pag.evaluate("src => new Promise(r => { window.LOGO = new Image(); LOGO.onload = r; LOGO.src = src; })", logo)
            for nombre, (codigo, es_post) in dibujos.items():
                png = await pag.evaluate("""([codigo, datos]) => { const c = document.getElementById('c'), ctx = c.getContext('2d');
                    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.save();
                    new Function('ctx', 'K', 'S30', 'T', 'LOGO', 'DATOS', codigo)(ctx, K, S30, %s, window.LOGO, datos);
                    ctx.restore(); return c.toDataURL('image/png'); }""" % T, [codigo, datos or {}])
                img = Image.open(BytesIO(base64.b64decode(png.split(",", 1)[1])))
                if es_post:
                    img = img.crop(es_post if isinstance(es_post, tuple) else RECORTE_POST).convert("RGB")
                    ruta = destino / f"{nombre}.jpg"
                    img.save(ruta, quality=92)
                else:
                    x0, y0, x1, y1 = img.getbbox()
                    img = img.crop((max(0, x0 - 30), max(0, y0 - 30), min(1080, x1 + 30), min(1920, y1 + 30)))
                    ruta = destino / f"{nombre}.png"
                    img.save(ruta)
                rutas.append(ruta)
        finally:
            await nav.close()
    pagina.unlink()
    return rutas


def generar(destino: Path = SALIDA) -> list[Path]:
    """Dibuja todas las imágenes de DIBUJOS (paquete de personajes) en `destino` y devuelve sus rutas."""
    return asyncio.run(_dibujar(Path(destino), DIBUJOS))


def post(datos: dict, destino: Path) -> Path:
    """Post de un tema (viñeta de dos cuadros) como `destino/post.jpg`. datos = {pregunta, respuesta}."""
    return asyncio.run(_dibujar(Path(destino), {"post": (POST, (0, 110, 1080, 1460))}, datos))[0]
