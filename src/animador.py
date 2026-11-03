"""Animador IA: convierte cada escena del guion en HTML/SVG animado con las clases de plantilla/base.css."""

from __future__ import annotations

import html as htmlmod
import re
from pathlib import Path

from src.llm import LLMRouter

ICONOS = re.findall(r'<symbol id="(i-[a-z]+)"', (Path(__file__).resolve().parent.parent / "plantilla" / "iconos.svg").read_text(encoding="utf-8"))

EJEMPLO = """<div class="titulo aparece">El sifón</div>
<svg viewBox="0 0 1080 1100">
  <g class="aparece"><path d="M400 120 V560 Q400 760 540 760 Q680 760 680 560 V520 H980" fill="none" stroke="#9aa7b8" stroke-width="96"/>
  <path d="M400 120 V560 Q400 760 540 760 Q680 760 680 560 V520 H980" fill="none" stroke="#1b2a3d" stroke-width="72"/></g>
  <path class="dibuja" style="animation-delay:1s" d="M400 520 V560 Q400 760 540 760 Q680 760 680 560 V520" fill="none" stroke="#3BA7FF" stroke-width="72"/>
  <g class="pop" style="animation-delay:2.2s"><text class="etiqueta" x="540" y="900" font-size="64" text-anchor="middle" style="fill:#3BA7FF">TAPÓN DE AGUA</text></g>
  <g class="aparece" style="animation-delay:3.5s"><use class="izquierda" href="#i-nube" x="860" y="460" width="110" height="110" style="color:#7CFC6B"/>
  <text class="etiqueta" x="880" y="400" font-size="56" text-anchor="middle" style="fill:#7CFC6B">GASES</text></g>
  <g class="pop" style="animation-delay:4.5s"><use href="#i-equis" x="760" y="600" width="140" height="140" style="color:#e63946"/></g>
</svg>"""

ESTILOS = {
    "plano": "ESTILO DIAGRAMA: explicación visual clara con formas, flechas, íconos y pocas etiquetas.",
    "sobre_video": """ESTILO DIAGRAMA SOBRE VIDEO: el fondo es un video real DESENFOCADO y oscurecido del tema.
  - Encima va un esquema claro que explique lo invisible (lo que hay dentro, el proceso, la comparación).
  - Primero una tarjeta: <rect x="60" y="60" width="960" height="940" rx="40" fill="#000" fill-opacity=".45"
    stroke="#ffffff" stroke-opacity=".25" stroke-width="3"/> (con class="aparece"), y el diagrama dentro de ella.
  - Alto contraste: rellenos sólidos con bordes blancos (stroke #fff, 4-6 px), flechas gruesas, íconos de la
    biblioteca grandes. Nada de colores oscuros que se pierdan sobre el fondo.
  - Máximo 3 etiquetas cortas. No dibujes paisajes ni el animal entero: eso ya lo muestra el video.""",
    "tipografia": """ESTILO TEXTO CINÉTICO (limpio, sin dibujos complejos):
  - 2 a 4 PALABRAS CLAVE de la narración en letras ENORMES (font-size 120-170), en 2-3 líneas centradas (x=540),
    que aparecen una tras otra al ritmo de la narración (pop / aparece con retrasos crecientes).
  - La palabra más importante en color acento; el resto en blanco.
  - UN solo ícono grande de la biblioteca (350-450 px) arriba que represente la idea, con pulso suave.
  - Nada más: sin formas propias, sin diagramas, sin flechas.""",
    # Probado: dibujar anatomía detallada a mano en SVG sale deforme (manchas). Se pide composición simple y grande.
    "ilustracion": """ESTILO DOCUMENTAL (el fondo ya es cálido con grano; aquí importa UN protagonista claro):
  - UNA figura protagonista GRANDE (60-80 % del lienzo) en primer plano, armada con íconos de la biblioteca
    ampliados (300-700 px) y formas geométricas simples (círculos, elipses, curvas suaves).
  - Simplificado y reconocible antes que detallado y deforme: NO intentes dibujar anatomía realista a mano.
  - Cada cosa con su color natural (delfín gris azulado, sangre roja, hoja verde, piel); el acento solo para el giro.
  - Máximo 2 etiquetas cortas. Movimiento sutil: lo importante late (pulso), partículas que suben, trazos que se dibujan.""",
}

NOTA_PORTADA = """
- ¡ESTA ESCENA ES LA PORTADA (la miniatura del video)! El dibujo protagonista debe verse COMPLETO desde el segundo 0
  (sin animation-delay, usa solo pulso/sube/flujo para moverlo) y quedarse en la mitad SUPERIOR (y 20-640):
  abajo se pone un título gigante encima. Sin título <div class="titulo"> en esta escena."""

PROMPT_ESCENA = """Eres animador de videos explicativos verticales para celular. Dibuja UNA escena como HTML + SVG animado con CSS.

Video: "{titulo}" (escena {n} de {total}). Guion completo, para que el estilo sea coherente:
{resumen}

ESTA ESCENA
- Narración: "{voz}"
- Qué dibujar: {visual}
- Dura unos {dur:.0f} segundos: haz aparecer los elementos entre 0 s y {fin:.1f} s en el orden de la narración.{nota_portada}

{guia_estilo}

LIENZO
- Devuelve SOLO el contenido de la escena (sin <section>, <html>, <style>, <script>, ni ```).
- Opcional: título arriba <div class="titulo aparece">MÁX 4 PALABRAS</div> (no en todas las escenas).
- Exactamente un <svg viewBox="0 0 1080 1100">. Debajo de y=1050 van los subtítulos: no dibujes ahí.
- COMPOSICIÓN: dibujo GRANDE que llene el lienzo. El elemento principal mide 400-700 px y va centrado (x≈540);
  reparte los elementos entre y=80 y y=1000. Nada de dibujos pequeños flotando en medio del vacío.
- Colores (hex): principal {principal}, secundario {secundario}, acento {acento}, peligro {peligro}, ok {ok},
  blanco #ffffff, gris #9aa7b8, oscuro #1b2a3d. El fondo ya es oscuro: no pintes un fondo.

ÍCONOS LISTOS (úsalos, se ven mucho mejor que dibujarlos a mano):
{iconos}
Uso: <use href="#i-sol" x="390" y="150" width="300" height="300" style="color:#FFD23F"/>  (color = color principal del ícono).
Combínalos con formas propias (rect, circle, path, line) y flechas para armar el diagrama.

TEXTO
- <text class="etiqueta" style="fill:#hex" font-size="48 a 96" text-anchor="middle">: MAYÚSCULAS, máximo 3 palabras, máximo 5 etiquetas.
- Ancho del texto ≈ 0,7 × font-size × número de letras: debe caber dentro de 60-1020. NUNCA pongas texto dentro
  de una forma más pequeña que él; pon las etiquetas debajo o al lado del dibujo.

ANIMACIÓN (clases CSS; el momento se fija con style="animation-delay:1.5s")
  aparece (sube y aparece), pop (crece desde cero), dibuja (traza un path/line con stroke y fill="none"),
  vacia (borra un trazo), pulso (late), sube (sube y se desvanece en bucle: humo, burbujas),
  baja (cae en bucle: gotas, flechas), izquierda (avanza a la izquierda en bucle), flujo (línea discontinua que corre).
- NUNCA pongas una clase de animación en un elemento con atributo transform: envuélvelo en <g class="...">.
- Al menos 4 elementos animados con retrasos distintos. Sin <image>, enlaces externos, filtros ni emojis.

EJEMPLO de una escena bien hecha (otro tema; fíjate en el tamaño, el orden y las etiquetas fuera de las formas):
{ejemplo}
"""


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
    return "\n".join(x.group(0) for x in (titulo, svg) if x).strip()


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
    y, partes = 380, []
    for i, w in enumerate(palabras):
        color = [paleta["acento"], paleta["principal"], "#ffffff"][i]
        partes.append(f'<g class="pop" style="animation-delay:{0.4 + i * 0.7:.1f}s"><text class="etiqueta" x="540" y="{y}" '
                      f'font-size="{110 - i * 15}" text-anchor="middle" style="fill:{color}">{htmlmod.escape(w)}</text></g>')
        y += 170
    return (f'<svg viewBox="0 0 1080 1100"><g class="pop"><circle class="pulso" cx="540" cy="520" r="380" fill="none" '
            f'stroke="{paleta["secundario"]}" stroke-width="10" stroke-dasharray="30 22" opacity=".5"/></g>{"".join(partes)}</svg>')


def animar_escena(router: LLMRouter, guion: dict, indice: int, paleta: dict, estilo: str = "plano") -> tuple[str, str]:
    """Devuelve (html, origen) donde origen es 'ia' o 'respaldo'."""
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
