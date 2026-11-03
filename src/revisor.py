"""Revisión automática de las escenas: mide en un navegador real dónde quedó cada elemento.

Sirve para que la fábrica corrija sola lo que antes llegaba al correo: diagramas que se salen del área
segura, textos o íconos encimados, títulos que chocan con el dibujo, escenas casi vacías y elementos que
aparecen cuando la escena ya terminó. Devuelve los problemas en palabras, para dárselos a la IA.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

from src import animador

# Lo que mide cada escena en el navegador (en píxeles del lienzo 1080x1920, sin escalar: ?render=1).
JS_MEDIR = """([i, dur]) => {
  const esc = document.querySelectorAll('#lienzo > section.escena')[i];
  const caja = r => ({x: r.left, y: r.top, w: r.width, h: r.height});
  const opacidad = el => {
    let o = 1;
    for (let n = el; n && n !== esc; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      o *= parseFloat(cs.opacity);
    }
    return o;
  };
  const elems = [];
  esc.querySelectorAll('text, use, rect, circle, ellipse, polygon, path, line, .titulo').forEach(el => {
    if (el.closest('defs, .portada')) return;
    if (el.closest('.sube, .baja, .izquierda')) return;   // se mueven a propósito
    if (opacidad(el) < 0.2) return;                       // ya desaparecieron (vacia) o no se ven
    const r = el.getBoundingClientRect();
    if (r.width < 3 && r.height < 3) return;
    const esTexto = el.tagName.toLowerCase() === 'text' || el.classList.contains('titulo');
    elems.push({tipo: el.classList.contains('titulo') ? 'titulo' : el.tagName.toLowerCase(),
                texto: esTexto ? el.textContent.trim().slice(0, 40) : '', ...caja(r)});
  });
  const retrasos = esc.getAnimations({subtree: true}).map(a => a.effect.getTiming().delay / 1000);
  const svg = esc.querySelector(':scope > svg');
  const portada = esc.querySelector('.portada');
  return {svg: svg ? caja(svg.getBoundingClientRect()) : null,
          portada: portada ? caja(portada.getBoundingClientRect()) : null, elems, retrasos};
}"""

FIGURAS = {"rect", "circle", "ellipse", "use", "polygon"}


def _area(a: dict) -> float:
    return max(0.0, a["w"]) * max(0.0, a["h"])


def _inter(a: dict, b: dict) -> float:
    w = min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"])
    h = min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"])
    return max(0.0, w) * max(0.0, h)


def _cobertura(elems: list[dict], svg: dict, celda: int = 20) -> float:
    """Fracción del área de dibujo que toca algún elemento, en una cuadrícula de `celda` px."""
    marcadas = set()
    for e in elems:
        x0, x1 = max(e["x"], svg["x"]) - svg["x"], min(e["x"] + e["w"], svg["x"] + svg["w"]) - svg["x"]
        y0, y1 = max(e["y"], svg["y"]) - svg["y"], min(e["y"] + e["h"], svg["y"] + svg["h"]) - svg["y"]
        if x1 <= x0 or y1 <= y0:
            continue
        marcadas.update((gx, gy) for gx in range(int(x0) // celda, int(x1) // celda + 1)
                        for gy in range(int(y0) // celda, int(y1) // celda + 1))
    total = (int(svg["w"]) // celda + 1) * (int(svg["h"]) // celda + 1)
    return len(marcadas) / total


def _nombre(e: dict) -> str:
    return f"el texto «{e['texto']}»" if e["texto"] else {"use": "un ícono", "rect": "un rectángulo",
                                                           "circle": "un círculo"}.get(e["tipo"], "una figura")


def problemas_escena(m: dict, dur: float) -> list[str]:
    """Reglas sobre las medidas de una escena. Lista vacía = la escena está bien."""
    svg, elems = m["svg"], m["elems"]
    if not svg:
        return ["la escena no tiene dibujo SVG"]
    problemas: list[str] = []
    textos = [e for e in elems if e["tipo"] == "text"]
    figuras = [e for e in elems if e["tipo"] in FIGURAS and _area(e) < 0.6 * _area(svg)]
    dibujo = [e for e in elems if e["tipo"] != "titulo"]

    for e in dibujo:  # el SVG ocupa justo la zona segura: lo que sale se corta o queda bajo los botones de la app
        if (e["x"] < svg["x"] - 4 or e["y"] < svg["y"] - 4 or e["x"] + e["w"] > svg["x"] + svg["w"] + 4
                or e["y"] + e["h"] > svg["y"] + svg["h"] + 4):
            problemas.append(f"{_nombre(e)} se sale del área de dibujo (870x760) y se corta")
    for i, a in enumerate(textos):
        for b in textos[i + 1:]:
            if _inter(a, b) > 0.2 * min(_area(a), _area(b)):
                problemas.append(f"los textos «{a['texto']}» y «{b['texto']}» se enciman")
    for t in textos:
        for f in figuras:
            parte = _inter(t, f) / max(1.0, _area(t))
            if 0.15 < parte < 0.85:
                problemas.append(f"el texto «{t['texto']}» queda montado sobre el borde de {_nombre(f)}")
                break
    iconos = [e for e in figuras if e["tipo"] == "use"]
    for i, a in enumerate(iconos):
        for b in iconos[i + 1:]:
            parte = _inter(a, b) / max(1.0, min(_area(a), _area(b)))
            if 0.15 < parte < 0.85:
                problemas.append("dos íconos quedan encimados a medias")
    for t in (e for e in elems if e["tipo"] == "titulo"):
        if any(_inter(t, e) > 0.1 * max(1.0, _area(e)) for e in dibujo):
            problemas.append(f"el título «{t['texto']}» choca con el dibujo (el título va solo arriba)")
    if m["portada"]:
        if any(_inter(m["portada"], e) > 0.3 * max(1.0, _area(e)) for e in figuras):
            problemas.append("el dibujo queda tapado por el título gigante de la portada (dibuja solo en y 0-420)")
    # Superficie realmente cubierta (no el rectángulo que lo encierra todo: dos objetos pequeños y separados
    # parecían ocupar mucho). Calibrado con escenas que se veían vacías en el video: 16-25 %.
    ocupado = _cobertura(dibujo, svg)
    limite = 0.15 if m["portada"] else 0.30  # en la portada solo se dibuja la mitad de arriba
    if len([e for e in dibujo if e["tipo"] != "text"]) < 3 or ocupado < limite:
        problemas.append(f"la escena está casi vacía (el dibujo cubre {ocupado:.0%} del área): hazlo más grande y completo")
    retrasos = sorted(m["retrasos"])
    tarde = [d for d in retrasos if d > dur - 0.6]
    if tarde:
        problemas.append(f"hay elementos que aparecen a los {max(tarde):.1f} s pero la escena dura ~{dur:.0f} s: "
                         "no alcanzan a verse")
    elif retrasos and retrasos[len(retrasos) // 2] > dur / 2:
        problemas.append("la mayor parte del dibujo aparece después de la mitad de la escena: la pantalla queda vacía "
                         "mucho tiempo (haz aparecer lo principal en los primeros segundos)")
    return list(dict.fromkeys(problemas))[:8]


def revisar(html: str, voces: list[str], indices: list[int]) -> dict[int, list[str]]:
    """Mide las escenas `indices` del documento al final de cada una (con todo ya aparecido)."""
    durs = [animador.duracion_estimada(v) for v in voces]
    inicios = [sum(durs[:i]) for i in range(len(durs))]
    plan = [{"inicio": a, "dur": d, "palabras": []} for a, d in zip(inicios, durs)]
    with tempfile.TemporaryDirectory() as tmp:
        doc = Path(tmp) / "revision.html"
        doc.write_text(html, encoding="utf-8")
        with sync_playwright() as pw:
            nav = pw.chromium.launch()
            try:
                pag = nav.new_page(viewport={"width": 1080, "height": 1920})
                pag.goto(doc.as_uri() + "?render=1")
                pag.evaluate("document.fonts.ready")
                pag.evaluate("p => __preparar(p)", plan)
                resultado = {}
                for i in indices:
                    pag.evaluate("t => __seek(t)", inicios[i] + max(0.5, durs[i] - 0.15))
                    resultado[i] = problemas_escena(pag.evaluate(JS_MEDIR, [i, durs[i]]), durs[i])
                return resultado
            finally:
                nav.close()
