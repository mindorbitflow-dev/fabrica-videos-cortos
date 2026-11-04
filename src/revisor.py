"""Revisión automática de las escenas procedurales: mide en un navegador real si el dibujo llena el cuadro.

Sirve para que la fábrica corrija sola lo que antes llegaba al correo: cuadros casi vacíos (la cámara se aleja o se
acerca a la nada) y elementos que aparecen cuando la escena ya terminó. Devuelve los problemas en palabras, para
dárselos a la IA. Las etiquetas, los números y la barra de escala se recortan solos a la zona segura
(plantilla/primitivas.js), así que aquí no se miden.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

from src import animador

TEXTOS = {"etiqueta", "numero", "cita", "frase"}  # capas de pantalla que son solo texto: no cuentan como dibujo
MARGEN_FINAL = 0.6        # s: lo que aparece después de dur − MARGEN_FINAL no alcanza a verse
FRACCIONES = (0.3, 0.55, 0.8, 0.97)   # momentos de la escena en que se mide el cuadro
VACIO_MINIMO = 0.2        # un cuadro con menos de esta fracción de bloques con dibujo está casi vacío (la demo de referencia: 0,38-0,49)
VACIO_MEDIO = 0.3         # ...y el promedio de la escena entera debe pasar de esto
# Protagonista: partículas dispersas, un campo de puntos tenues o una red diminuta bastaban para pasar el mínimo de arriba.
# En el cuadro de la mitad de la escena, sin partículas y con un umbral de contraste alto (solo lo que se ve bien), el
# dibujo debe cubrir al menos PRINCIPAL_MINIMO. Una "forma" que cubre más de FORMA_MAXIMA es un disco gigante.
PROTAGONISTA_DEBIL = "no hay un protagonista grande"  # comienzo del aviso; fabrica lo busca para acercar la cámara en código
PRINCIPAL_MINIMO = 0.22   # demo de referencia: 0,28; las escenas flojas de cuerpo: 0,10-0,21
FORMA_MAXIMA = 0.65
TEXTURAS = {"campoCelulas", "estratos", "rejilla"}  # capas repetitivas: sirven de contexto, no de protagonista
TEXTURA_MAXIMA = 0.5      # una textura que cubre más de esta fracción del cuadro es una alfombra

# Fracción de bloques de 24 px del cuadro con dibujo (≥3 % de sus píxeles distintos del fondo), con la misma cámara
# y sin textos ni barra de escala.
JS_COBERTURA = """([i, tiempos]) => {
  const s = document.querySelectorAll('#lienzo > section.escena')[i].querySelector('script.prim');
  if (!s) return null;
  const escena = JSON.parse(s.textContent), textos = %s;
  const con = {...escena, capas: escena.capas.filter(c => !textos.includes(c.tipo)), grano: 0, escala: false, velos: false};
  const sin = {...con, capas: []};
  const lienzo = () => { const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; return c; };
  const a = lienzo().getContext('2d', {willReadFrequently: true}), b = lienzo().getContext('2d', {willReadFrequently: true});
  const BLOQUE = 24, COLS = 45, FILAS = 80;
  const bloques = (x, y, umbral = 14) => {
    const cuenta = new Uint16Array(COLS * FILAS);
    for (let py = 0; py < 1920; py++) for (let px = 0; px < 1080; px++) {
      const k = (py * 1080 + px) * 4;
      if (Math.max(Math.abs(x[k] - y[k]), Math.abs(x[k + 1] - y[k + 1]), Math.abs(x[k + 2] - y[k + 2])) > umbral)
        cuenta[Math.floor(py / BLOQUE) * COLS + Math.floor(px / BLOQUE)]++;
    }
    return cuenta.filter(n => n > BLOQUE * BLOQUE * 0.03).length / (COLS * FILAS);
  };
  const tm = tiempos[Math.floor(tiempos.length / 2)];
  Primitivas.dibujar(b.canvas, sin, tm); const fondo = b.getImageData(0, 0, 1080, 1920).data;
  const fuerteSinParticulas = {...con, capas: con.capas.filter(c => c.tipo !== 'particulas')};
  Primitivas.dibujar(a.canvas, fuerteSinParticulas, tm);
  const principal = bloques(a.getImageData(0, 0, 1080, 1920).data, fondo, 60);
  const capas = escena.capas.filter(c => !textos.includes(c.tipo)).map(c => {
    Primitivas.dibujar(a.canvas, {...con, capas: [c]}, tm);
    const d = a.getImageData(0, 0, 1080, 1920).data;
    return {tipo: c.tipo, cobertura: bloques(d, fondo), fuerte: bloques(d, fondo, 60)};
  });
  return {escena, capas, principal, cobertura: tiempos.map(t => {
    Primitivas.dibujar(a.canvas, con, t); const x = a.getImageData(0, 0, 1080, 1920).data;
    Primitivas.dibujar(b.canvas, sin, t); const y = b.getImageData(0, 0, 1080, 1920).data;
    return bloques(x, y);
  })};
}""" % sorted(TEXTOS)


def problemas_escena(medida: dict | None, dur: float) -> list[str]:
    """Reglas sobre lo medido en una escena. Lista vacía = la escena está bien."""
    if not medida:
        return ["la escena no tiene dibujo procedural"]
    problemas: list[str] = []
    cob = medida["cobertura"]
    if min(cob) < VACIO_MINIMO or sum(cob) / len(cob) < VACIO_MEDIO:
        momentos = ", ".join(f"{f * dur:.0f} s" for f, c in zip(FRACCIONES, cob) if c < VACIO_MINIMO)
        problemas.append(
            f"el cuadro queda casi vacío ({sum(cob) / len(cob):.0%} del cuadro tiene dibujo" + (f"; sobre todo hacia los {momentos}" if momentos else "") +
            "): mantén el protagonista y el contexto cubriendo la pantalla durante todos los movimientos de cámara "
            "(no te alejes ni te acerques a una zona sin dibujo; agranda o acerca el protagonista y añade contexto con "
            "redes, corrientes, partículas u otras figuras, no más células)")
    capas_medidas = medida["capas"]
    if medida["principal"] < PRINCIPAL_MINIMO and not animador.protagonista_adecuado(medida["escena"], dur):
        problemas.append(f"{PROTAGONISTA_DEBIL} (lo que se ve bien cubre solo {medida['principal']:.0%} del cuadro): "
                         "haz que UN protagonista llene el centro de la pantalla (más de la mitad del ancho visible) "
                         "acercando la cámara o aumentando su tamaño; las partículas y los puntos tenues no cuentan")
    if any(c["tipo"] == "forma" and c["cobertura"] > FORMA_MAXIMA for c in capas_medidas):
        problemas.append("una capa 'forma' cubre casi todo el cuadro (se ve como un disco gigante y borroso): "
                         "'forma' solo como acento pequeño (núcleo, roncha, gota), nunca como objeto principal")
    if any(c["tipo"] in TEXTURAS and c["cobertura"] > TEXTURA_MAXIMA for c in capas_medidas):
        problemas.append("una capa de células o estratos cubre más de la mitad del cuadro (se ve como una alfombra repetida): "
                         "déjala como contexto pequeño y pon el detalle en el protagonista y en elementos distintos")
    capas = medida["escena"]["capas"]
    tarde = [c for c in capas if c.get("desde", 0) > dur - MARGEN_FINAL]
    if tarde:
        problemas.append(f"hay capas que aparecen a los {max(c['desde'] for c in tarde):.1f} s pero la escena dura ~{dur:.0f} s: "
                         "no alcanzan a verse")
    else:
        inicios = sorted(c.get("desde", 0) for c in capas if c["tipo"] not in TEXTOS)
        if inicios and inicios[len(inicios) // 2] > dur / 2:
            problemas.append("la mayor parte del dibujo aparece después de la mitad de la escena: la pantalla queda vacía "
                             "mucho tiempo (haz aparecer lo principal en los primeros segundos)")
    return problemas


def revisar(html: str, voces: list[str], indices: list[int]) -> dict[int, list[str]]:
    """Mide las escenas `indices` del documento en varios momentos de su duración."""
    durs = [animador.duracion_estimada(v) for v in voces]
    resultado = {}
    with tempfile.TemporaryDirectory() as tmp:
        doc = Path(tmp) / "revision.html"
        doc.write_text(html, encoding="utf-8")
        with sync_playwright() as pw:
            nav = pw.chromium.launch()
            try:
                pag = nav.new_page(viewport={"width": 1080, "height": 1920})
                pag.goto(doc.as_uri() + "?render=1")
                pag.evaluate("document.fonts.ready")
                for i in indices:
                    medida = pag.evaluate(JS_COBERTURA, [i, [f * durs[i] for f in FRACCIONES]])
                    resultado[i] = problemas_escena(medida, durs[i])
                return resultado
            finally:
                nav.close()
