"""Animador IA: convierte cada escena del guion en HTML/SVG animado con las clases de plantilla/base.css."""

from __future__ import annotations

import html as htmlmod
import re
from pathlib import Path

from src.llm import LLMRouter

ICONOS = re.findall(r'<symbol id="(i-[a-z]+)"', (Path(__file__).resolve().parent.parent / "plantilla" / "iconos.svg").read_text(encoding="utf-8"))

ANCHO, ALTO = 870, 760  # el SVG ocupa exactamente la zona segura del video (ver plantilla/base.css)

EJEMPLO = """<div class="titulo aparece">El sifón</div>
<svg viewBox="0 0 870 760">
  <g class="aparece"><path d="M300 40 V420 Q300 600 435 600 Q570 600 570 420 V380 H800" fill="none" stroke="#9aa7b8" stroke-width="90"/>
  <path d="M300 40 V420 Q300 600 435 600 Q570 600 570 420 V380 H800" fill="none" stroke="#1b2a3d" stroke-width="66"/></g>
  <path class="dibuja" style="animation-delay:1s" d="M300 380 V420 Q300 600 435 600 Q570 600 570 420 V380" fill="none" stroke="#3BA7FF" stroke-width="66"/>
  <g class="pop" style="animation-delay:2.2s"><text class="etiqueta" x="435" y="715" font-size="56" text-anchor="middle" style="fill:#3BA7FF">TAPÓN DE AGUA</text></g>
  <g class="aparece" style="animation-delay:3.5s"><use class="izquierda" href="#i-nube" x="690" y="230" width="110" height="110" style="color:#7CFC6B"/>
  <text class="etiqueta" x="720" y="190" font-size="50" text-anchor="middle" style="fill:#7CFC6B">GASES</text></g>
  <g class="pop" style="animation-delay:4.5s"><use href="#i-equis" x="640" y="450" width="120" height="120" style="color:#e63946"/></g>
</svg>"""

ESTILOS = {
    "plano": "ESTILO DIAGRAMA: explicación visual clara con formas, flechas, íconos y pocas etiquetas.",
    # Probado: dibujar anatomía detallada a mano en SVG sale deforme (manchas). Se pide composición simple y grande.
    "ilustracion": """ESTILO DIAGRAMA DOCUMENTAL (el fondo ya es cálido con grano):
  - UN protagonista claro y grande, armado con íconos de la biblioteca ampliados y formas geométricas simples.
  - Simplificado y reconocible antes que detallado y deforme: NO intentes dibujar anatomía realista a mano.
  - Cada cosa con su color natural (sangre roja, hoja verde, piel); el acento solo para el giro.""",
}

NOTA_PORTADA = """
- ¡ESTA ESCENA ES LA PORTADA (la miniatura del video)! El dibujo protagonista debe verse COMPLETO desde el segundo 0
  (sin animation-delay, usa solo pulso/sube/flujo para moverlo) y quedarse en la parte SUPERIOR del lienzo (y 20-400):
  abajo se pone un título gigante encima. Sin título <div class="titulo"> y sin textos en esta escena."""

PROMPT_ESCENA = """Eres animador de videos explicativos verticales para celular. Dibuja UNA escena como HTML + SVG animado con CSS.

Video: "{titulo}" (escena {n} de {total}). Guion completo, para que el estilo sea coherente:
{resumen}

ESTA ESCENA
- Narración: "{voz}"
- Qué dibujar: {visual}
- Dura unos {dur:.0f} segundos: haz aparecer los elementos entre 0 s y {fin:.1f} s en el orden de la narración.{nota_portada}

{guia_estilo}

LIENZO (zona segura)
- Devuelve SOLO el contenido de la escena (sin <section>, <html>, <style>, <script>, ni ```).
- Opcional: título arriba <div class="titulo aparece">MÁX 4 PALABRAS</div>, descriptivo y sin signos de exclamación.
- Exactamente un <svg viewBox="0 0 870 760">. Ese rectángulo YA es la zona segura del video (arriba va el título,
  abajo los subtítulos y a la derecha los botones de la app): TODO debe quedar dentro, con 20 px de margen.
- COMPOSICIÓN: dibujo GRANDE que use todo el alto (y 30-730). El elemento principal mide 300-520 px y va
  centrado (x≈435). Nada de dibujos pequeños flotando en el vacío ni elementos encimados a medias.
- Colores (hex): principal {principal}, secundario {secundario}, acento {acento}, peligro {peligro}, ok {ok},
  blanco #ffffff, gris #9aa7b8, oscuro #1b2a3d. El fondo ya es oscuro: no pintes un fondo.

ÍCONOS LISTOS (úsalos, se ven mucho mejor que dibujarlos a mano):
{iconos}
Uso: <use href="#i-sol" x="285" y="100" width="300" height="300" style="color:#FFD23F"/>  (color = color principal del ícono).
Combínalos con formas propias (rect, circle, path, line) y flechas para armar el diagrama.

TEXTO
- <text class="etiqueta" style="fill:#hex" font-size="44 a 80" text-anchor="middle">: MAYÚSCULAS, máximo 3 palabras, máximo 4 etiquetas.
- Ancho del texto ≈ 0,65 × font-size × número de letras: debe caber entre x=20 y x=850. Las etiquetas van
  DEBAJO o AL LADO de lo que nombran, nunca montadas sobre el borde de una figura ni sobre otro texto.

ANIMACIÓN (clases CSS; el momento se fija con style="animation-delay:1.5s")
  aparece (sube y aparece), pop (crece desde cero), dibuja (traza un path/line con stroke y fill="none"),
  vacia (borra un trazo), pulso (late), sube (sube y se desvanece en bucle: humo, burbujas),
  baja (cae en bucle: gotas, flechas), izquierda (avanza a la izquierda en bucle), flujo (línea discontinua que corre).
- NUNCA pongas una clase de animación en un elemento con atributo transform: envuélvelo en <g class="...">.
- Al menos 4 elementos animados con retrasos distintos. Sin <image>, enlaces externos, filtros ni emojis.

NO USES (hace ver el video genérico): botones o textos de "sígueme", "like" o "suscríbete"; chulos, equis, alertas,
rayos, candados o corazones de adorno (solo si son literalmente lo que se explica); signos de exclamación;
palabras de relleno como "increíble", "secreto", "brutal", "épico", "maestro".

EJEMPLO de una escena bien hecha (otro tema; fíjate en el tamaño, el orden y las etiquetas fuera de las formas):
{ejemplo}
"""

PROMPT_CORRECCION = """

ESTO ES UNA CORRECCIÓN. Al medir tu versión anterior en el video se encontraron estos problemas. Corrígelos TODOS
(mueve, achica o reorganiza; no repitas el mismo diseño):
{problemas}"""


def duracion_estimada(voz: str) -> float:
    return len(voz.split()) * 0.36 + 0.5


def limpiar(markup: str) -> str:
    """Quita lo que rompería el motor o cargaría cosas externas."""
    m = re.sub(r"^```(?:html)?|```$", "", markup.strip(), flags=re.M).strip()
    seccion = re.search(r"<section[^>]*>(.*)</section>", m, flags=re.S | re.I)
    if seccion:
        m = seccion.group(1)
    m = re.sub(r"<(script|style|iframe|object|foreignObject)\b.*?</\1\s*>", "", m, flags=re.S | re.I)
    m = re.sub(r"</?(script|style|iframe|object|foreignObject|embed|link|meta|image|img)\b[^>]*>", "", m, flags=re.I)
    m = re.sub(r"\son\w+\s*=\s*(\"[^\"]*\"|'[^']*')", "", m, flags=re.I)
    m = re.sub(r"(href\s*=\s*\")(?!#)[^\"]*\"", r'\1#"', m, flags=re.I)
    # Solo se conservan el título y el dibujo: la IA a veces añade divs propios (p. ej. la narración en
    # un <div class="subtitulos">) que salen como texto diminuto suelto en el video.
    titulo = re.search(r'<div class="titulo[^"]*"[^>]*>.*?</div>', m, flags=re.S | re.I)
    svg = re.search(r"<svg\b.*</svg>", m, flags=re.S | re.I)
    partes = [x.group(0) for x in (titulo, svg) if x]
    if svg:  # el lienzo es fijo: otro viewBox descuadraría la zona segura
        partes[-1] = re.sub(r"<svg\b[^>]*>", f'<svg viewBox="0 0 {ANCHO} {ALTO}">', partes[-1], count=1)
    return "\n".join(partes).strip()


def prefijar_ids(markup: str, prefijo: str) -> str:
    """Cada escena se pinta en el mismo documento: los id deben ser únicos entre escenas."""
    for i in set(re.findall(r'(?<![\w-])id="([^"]+)"', markup)):
        e = re.escape(i)
        markup = re.sub(rf'(?<![\w-])id="{e}"', f'id="{prefijo}{i}"', markup)
        markup = re.sub(rf'((?:xlink:)?href="#){e}"', rf'\g<1>{prefijo}{i}"', markup)
        markup = re.sub(rf"url\(#{e}\)", f"url(#{prefijo}{i})", markup)
    return markup


def es_valida(markup: str) -> bool:
    return "<svg" in markup and "</svg>" in markup and len(markup) < 40000 and len(re.findall(r'class="[^"]*\b(aparece|pop|dibuja|pulso|sube|baja|izquierda|flujo|vacia)\b', markup)) >= 2


def escena_texto(voz: str, paleta: dict) -> str:
    """Respaldo sin IA: tipografía animada con las palabras más largas de la narración."""
    palabras = sorted({w.strip(".,;:¿?¡!\"'").upper() for w in voz.split()}, key=len, reverse=True)[:3]
    y, partes = 250, []
    for i, w in enumerate(palabras):
        color = [paleta["acento"], paleta["principal"], "#ffffff"][i]
        tam = min(96 - i * 12, int(800 / (0.65 * max(1, len(w)))))  # que quepa en el ancho
        partes.append(f'<g class="pop" style="animation-delay:{0.4 + i * 0.7:.1f}s"><text class="etiqueta" x="435" y="{y}" '
                      f'font-size="{tam}" text-anchor="middle" style="fill:{color}">{htmlmod.escape(w)}</text></g>')
        y += 150
    return (f'<svg viewBox="0 0 {ANCHO} {ALTO}"><g class="pop"><circle class="pulso" cx="435" cy="380" r="340" fill="none" '
            f'stroke="{paleta["secundario"]}" stroke-width="10" stroke-dasharray="30 22" opacity=".5"/></g>{"".join(partes)}</svg>')


def animar_escena(router: LLMRouter, guion: dict, indice: int, paleta: dict, estilo: str = "plano",
                  correcciones: list[str] | None = None) -> tuple[str, str]:
    """Devuelve (html, origen) donde origen es 'ia' o 'respaldo'. `correcciones`: problemas que midió el
    revisor en la versión anterior, para que la IA los arregle."""
    escenas = guion["escenas"]
    escena = escenas[indice]
    dur = duracion_estimada(escena["voz"])
    prompt = PROMPT_ESCENA.format(
        titulo=guion.get("titulo", ""), n=indice + 1, total=len(escenas),
        resumen="\n".join(f"{i + 1}. {e['voz']}" for i, e in enumerate(escenas)),
        voz=escena["voz"], visual=escena.get("visual") or "un diagrama que explique la narración",
        dur=dur, fin=max(1.0, dur - 1.5), iconos=", ".join(ICONOS), ejemplo=EJEMPLO,
        guia_estilo=ESTILOS.get(estilo, ESTILOS["plano"]),
        nota_portada=NOTA_PORTADA if indice == 0 and guion.get("portada", {}).get("texto") else "", **paleta)
    if correcciones:
        prompt += PROMPT_CORRECCION.format(problemas="\n".join(f"- {c}" for c in correcciones))
    if router.has_any:
        for intento in range(2):
            try:
                texto, _ = router.complete_any(prompt, json_mode=False, max_tokens=6000, temperature=0.6, timeout=150)
                markup = limpiar(texto)
                if es_valida(markup):
                    return prefijar_ids(markup, f"e{indice + 1}-"), "ia"
                print(f"[Animador] escena {indice + 1}: respuesta sin SVG animado (intento {intento + 1})")
            except Exception as error:
                print(f"[Animador] escena {indice + 1}: {error}")
                break
    return escena_texto(escena["voz"], paleta), "respaldo"
