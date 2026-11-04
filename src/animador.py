"""Animador IA: convierte cada escena del guion en una escena procedural (src/prim.py + plantilla/primitivas.js).

La IA describe la escena como JSON {fondo, camara, capas}; `prim.validar` lo limpia (tipos, rangos, colores) y,
si no hay arreglo tras reintentar, `prim.respaldo` arma una escena viva en código. Ya no se dibuja SVG libre.
"""

from __future__ import annotations

import json
import math
import re
import unicodedata
from pathlib import Path

from src import prim
from src.llm import LLMRouter

INTENTOS = 3  # una respuesta + 2 reintentos con los problemas detectados
PROTAGONISTA_RAZON = 0.6  # tam / ancho de cámara que debe alcanzar el protagonista en alguna clave
ZOOM_MAX = 2.2
MOMENTO_PROTAGONISTA = 0.8  # fracción de la escena en que el revisor mide al protagonista (revisor.FRACCIONES)
TAM_MAX = 1.6
PROTAGONISTA_MAX = 1.5  # tam / ancho de cámara máximo: más allá el protagonista no cabe en el cuadro
MIN_PIEZAS = 5  # un personaje del reparto con menos piezas sale como una mancha (la almeja de 2 piezas)
EJEMPLO_PERSONAJE =Path(__file__).resolve().parent.parent / "config" / "personaje_ejemplo.json"
MAX_TEXTOS_PANTALLA = 3

# Escena de otro tema, para mostrar el nivel de detalle y el uso de cámara, unidades y tiempos.
EJEMPLO = json.dumps({
    "fondo": {"tema": "tejido"},
    "camara": [{"t": 0, "x": 0, "y": 520, "ancho": 1500}, {"t": 3.5, "x": 0, "y": 470, "ancho": 1300},
               {"t": 7, "x": 0, "y": 230, "ancho": 520}, {"t": 10, "x": 0, "y": 330, "ancho": 800},
               {"t": 14, "x": 0, "y": 420, "ancho": 1150}],
    "capas": [
        {"tipo": "estratos", "x": -2000, "y": -60, "alto": 50, "lineas": 4, "color": "#c9d4e8", "onda": 3},
        {"tipo": "campoCelulas", "x": -1500, "y": 0, "ancho": 3000, "alto": 120, "radio": 22, "color": "#6f7dff",
         "colorNucleo": "#9aa6ff", "aparicion": "onda", "desde": 0, "profundidad": .5,
         "muerte": {"x": 0, "y": 150, "r": 95, "desde": 5, "dur": 2.5}},
        {"tipo": "estratos", "x": -2000, "y": 140, "alto": 1300, "lineas": 24, "color": "#9fb2d6", "onda": 7, "desde": 0.4},
        {"tipo": "vaso", "puntos": [[-1600, 760], [-700, 720], [0, 770], [800, 730], [1600, 780]], "grosor": 40,
         "color": "#c9d4e8", "colorCelulas": "#ff5fa2", "celulas": 90, "velocidad": 120, "desde": 0.8},
        {"tipo": "particulas", "x": 0, "y": 140, "r": 110, "n": 160, "tam": 2.2, "color": "#ff6ad5", "desde": 2.5, "duracion": 3.5},
        {"tipo": "etiqueta", "texto": "veneno", "x": 40, "y": 140, "dx": 170, "dy": -170, "desde": 3.2, "hasta": 8, "color": "#ff9be6"},
        {"tipo": "enjambre", "n": 70, "origen": {"x": 0, "y": 765, "r": 380, "ry": 12}, "destino": {"x": 0, "y": 175, "r": 85},
         "radio": 13, "color": "#5dff9c", "desde": 7.5, "duracion": 5, "ocultarAntes": True},
        {"tipo": "etiqueta", "texto": "neutrófilos", "x": 60, "y": 260, "dx": 190, "dy": 150, "desde": 9.2, "color": "#a8ffc9"},
        {"tipo": "numero", "texto": "0", "sub": "bacterias", "desde": 11.2, "color": "#ff8a5c"},
    ],
}, ensure_ascii=False, separators=(",", ":"))

# Escena de un tema sin células: el detalle sale de las figuras, la red, las corrientes y los datos, no de un campo de relleno.
EJEMPLO_SIN_CELULAS = json.dumps({
    "fondo": {"tema": "oscuro"}, "unidad": "m", "escala": False,
    "camara": [{"t": 0, "x": 0, "y": 900, "ancho": 1600}, {"t": 4, "x": -60, "y": 820, "ancho": 1050},
               {"t": 8, "x": 40, "y": 780, "ancho": 620}, {"t": 12, "x": 0, "y": 850, "ancho": 900}],
    "capas": [
        {"tipo": "rejilla", "x": -1500, "y": 300, "ancho": 3000, "alto": 1100, "paso": 90, "tam": 4, "color": "#2d6bff",
         "colorPulso": "#9ec1ff", "velocidad": 1, "desde": 0, "profundidad": .75},
        {"tipo": "red", "x": 0, "y": 830, "r": 700, "ry": 380, "nodos": 60, "vecinos": 3, "color": "#2d6bff", "colorNodo": "#7fa8ff",
         "pulsos": True, "grosor": 3, "desde": 0, "duracion": 4, "profundidad": .3},
        {"tipo": "anillos", "x": 0, "y": 800, "r": 560, "ry": 430, "n": 3, "color": "#5dff9c", "periodo": 4, "grosor": 3, "desde": 1},
        {"tipo": "orbita", "x": 0, "y": 800, "r": 330, "n": 5, "tam": 12, "color": "#5dff9c", "periodo": 9, "inclinacion": .45, "desde": 0.6},
        {"tipo": "figura", "modelo": "chip", "x": 0, "y": 800, "tam": 420, "desde": 0.3},
        {"tipo": "corriente", "puntos": [[-1100, 1000], [-400, 930], [-120, 840]], "color": "#ffd23f", "n": 40, "tam": 6, "ancho": 24,
         "velocidad": 260, "flecha": True, "desde": 2.2},
        {"tipo": "etiqueta", "texto": "procesador", "x": 120, "y": 760, "dx": 200, "dy": -190, "desde": 1.4, "color": "#a8ffc9"},
        {"tipo": "numero", "texto": "3×", "sub": "más rápido", "desde": 6.5, "color": "#ffd23f"},
    ],
}, ensure_ascii=False, separators=(",", ":"))

NOTA_CELULAS = """- Esta escena SÍ trata de algo celular: "campoCelulas", "vaso" y "estratos" pueden ir como contexto, nunca como relleno.
  Máximo UN campoCelulas por escena, con pocas células grandes y legibles (radio mayor que ancho/60), y el protagonista (figura, red,
  enjambre) con más detalle y tamaño que el campo."""
NOTA_SIN_CELULAS = """- Esta escena NO trata de células ni tejido: NO uses "campoCelulas", "vaso" ni "estratos". Da el detalle con figuras, redes,
  corrientes, ondas, órbitas, gráficas, diales, ramas o partículas, y con la cámara."""

NOTA_PORTADA = """
- ¡ESTA ESCENA ES LA PORTADA (la miniatura del video)! Abajo (píxeles 860-1240) se pone un título gigante encima.
  El protagonista debe verse COMPLETO desde el segundo 0 (capas con desde:0) y quedar ENCIMA del título,
  entre los píxeles y 560 y 860: el centro de la cámara cae en y=860, así que pon el protagonista a unos ancho/7 por
  ENCIMA del centro de la cámara (y_mundo = y_cámara − ancho/7) y que no pase de la mitad del ancho visible. SIN capas de pantalla (etiqueta, numero, cita, frase, grafica,
  dial)."""

PROMPT_ESCENA = """Eres animador de videos explicativos verticales para celular. Describe UNA escena como JSON para un motor de
dibujo procedural (cámara que se mueve por un mundo con figuras, redes, corrientes, partículas, gráficas...).

Video: "{titulo}" (escena {n} de {total}). Guion completo, para que el estilo sea coherente:
{resumen}

ESTA ESCENA
- Narración: "{voz}"
- Qué mostrar: {visual}
- Dura unos {dur:.0f} segundos. Todo el tiempo (t, desde, hasta, duracion) va en segundos DESDE EL INICIO DE ESTA ESCENA
  y lo principal debe estar visible antes de {fin:.1f} s, en el orden de la narración.{nota_portada}

FORMATO: devuelve SOLO un objeto JSON (sin ``` ni comentarios):
{{"fondo": {{"tema": "oscuro|mar|piel|tejido|claro"}},
  "unidad": "µm|mm|m|km (por defecto µm; elige la que corresponda al tamaño real de lo que se muestra)",
  "escala": true|false (barra de escala abajo a la izquierda; ponla solo si el tamaño real importa),
  "camara": [{{"t": s, "x": .., "y": .., "ancho": ..}}, ...],
  "capas": [{{"tipo": "...", ...}}, ...]}}

MUNDO Y CÁMARA
- Coordenadas del mundo en la unidad elegida, y = hacia abajo. "ancho" es lo que se ve de lado a lado de la pantalla;
  el punto (x, y) de cada clave de cámara queda en el píxel (540, 860).
  La pantalla (1080x1920) se reparte en franjas: textos grandes (numero, cita, frase) 260-560, DIBUJO 560-1180 y
  subtítulos 1210-1440 sobre una franja oscura: el protagonista va entre los píxeles y 560 y 1180.
- La cámara SIEMPRE se mueve: 2 a 8 claves, t creciente desde 0 hasta ~{dur:.0f} s, con zoom y desplazamiento reales
  (por ejemplo acercarse de 1500 a 500 de ancho). Nada de planos fijos.
- UN protagonista grande que llene el centro de la pantalla (más de la mitad del ancho visible en algún momento);
  alrededor, contexto que dé escala y detalle (redes, corrientes, partículas, ondas, otras figuras más pequeñas). Cuadros vacíos = escena mala.
- Las capas con "desde" aparecen con un fundido: escalona las apariciones para que la escena vaya construyéndose.
- DETALLE SIN RELLENO: el fondo da volumen con pocas capas lejanas, no con muchas cosas. Pon "profundidad" (0 a 1) en las capas de
  contexto (rejilla, campoCelulas, red, estratos): las aleja, las vuelve borrosas y las mueve menos que la cámara (paralaje).
  El protagonista va SIN profundidad, grande, y con la cámara lo bastante cerca para ver su detalle fino (escamas, orgánulos, fibras).
- Máximo {max_textos} capas de pantalla con texto (etiqueta, numero, cita, frase); texto corto, en español.
{nota_celulas}
- "forma" solo como acento pequeño (núcleo, roncha, gota): nunca como objeto principal ni más de 2 por escena.
- En "figura" NO cambies "color" ni "color2" (cada modelo ya trae sus colores naturales) salvo para resaltarla.
- "frase" y "cita" solo para ideas que NO están en la narración (los subtítulos ya repiten lo que se dice); si no aportan, no las pongas.
- Colores hex: principal {principal}, secundario {secundario}, acento {acento}, peligro {peligro}, ok {ok},
  blanco #ffffff. Sobre fondo oscuro usa colores vivos; con tema "claro" usa colores oscuros y saturados.

CAPAS DISPONIBLES (? = opcional; todas aceptan desde? y hasta? en segundos). Respeta los rangos:
{referencia}
Modelos de "figura": {modelos}. Usa una "figura" SOLO si el título, la narración o lo que se muestra hablan de ese objeto
(corazón si habla del corazón, moneda si habla de dinero...); para cualquier otra cosa dibuja un "personaje" o un diagrama.
{personajes}

NO USES (hace ver el video genérico): textos de "sígueme", "like" o "suscríbete"; signos de exclamación;
palabras de relleno como "increíble", "secreto", "brutal", "épico", "maestro".

EJEMPLO de una escena bien hecha (otro tema; fíjate en el movimiento de cámara, los tiempos escalonados y el protagonista):
{ejemplo}
"""

# Palabras (sin acentos, como prefijo de palabra salvo que lleven \b al final) que justifican dibujar cada modelo de `figura`. Si la
# escena usa un modelo y ninguna aparece en título + narración + "qué mostrar", es una figura sin relación (ver _figuras_ajenas).
_FIGURA_PALABRAS = {
    "pez": r"pez\b|peces|pesca|branqui|aleta|escama|acuari",
    "hormiga": r"hormig|insecto|colonia|hormiguero",
    "bacteria": r"bacteri|microb|patogen|infecci|germen|antibiotic",
    "virus": r"virus|viral|vacuna|infecci|contagi|pandemi",
    "neurona": r"neuron|sinaps|nervi|axon|cerebr|neural",
    "celula": r"celul|tejido|citoplasma|organul|nucleo|microscop|colageno|piel\b|epiderm|fibra|membrana|embri|\badn\b|organismo|biolog|cuerpo",
    "persona": r"persona|human|gente|hombre|mujer|ninos?\b|usuario|cliente|trabajador|medico|paciente|cuerpo|poblaci|alguien|nadie|todos",
    "ave": r"aves?\b|pajaro|pollo|paloma|alas?\b|pluma|vuelo|volar|gaviota|loro|buho|aguila",
    "planta": r"planta|arbol|hojas?\b|raiz|raices|flor|semilla|bosque|fotosint|vegetal|cultivo|cosecha",
    "gota": r"agua|gota|lluvia|sangre|lagrima|liquid|sudor|fluido|oceano|mar\b|inmersi|sumerg|hidrat|rocio|saliva|orina|humed|riego|mojad|flota",
    "moneda": r"dinero|moneda|precio|pago|cobr|dolar|euro\b|euros|salario|sueldo|banco|invers|econom|ahorr|billete|deuda|credito|ganancia|pesos|cuesta|compra|vend",
    "engranaje": r"engranaje|mecanis|maquina|motor|rueda|mecanic|rotor|reloj|fabrica|palanca|piezas",
    "planeta": r"planeta|tierra|mundo|globo|orbita|marte|luna\b|gravedad|astro|espacio|cosmos|universo|clima|global",
    "sol": r"sol\b|solar|estrella|luz\b|calor|radiaci|luminos|rayos?\b|temperatura|termic",
    "corazon": r"corazon|cardi|pulso|latido|sangre|circul|arteria|vena|presion arterial",
    "llama": r"fuego|llama|incendi|combust|quem|arder|calor|fogata|energia termica",
    "chip": r"chip|procesador|computad|ordenador|cpu|silicio|circuito|electron|digital|software|program|algoritm|datos|tecnolog|dispositivo|telefono|inteligencia artificial",
    "bateria": r"bateria|energia|carga|pila|electric|autonomia|voltaje|litio",
    "estomago": r"estomago|digest|comida|alimenta|hambre|acido|gastric|intestin|comer|come\b|dieta|nutrient",
    "pulmon": r"pulmon|respir|oxigen|aire|aliento|apnea|alveol",
    "cerebro": r"cerebr|mente|pensa|memoria|cognit|inteligen|aprend|neuro|decision",
    "ojo": r"ojos?\b|mirada|vision|retina|iris\b|pupila|observ|mirar|vista\b|enfoque",
    "hueso": r"hueso|esquelet|fractura|osteo|calcio|columna|craneo|oseo|costilla|articulac|fosil",
    "rata": r"rata|ratas|raton|ratones|roedor",
    "gato": r"gato|felino|minino|leon|tigre",
    "pulpo": r"pulpo|cefalopodo|tentacul|calamar",
}
FIGURA_PALABRAS = {m: re.compile(r"\b(?:" + p + ")" + (r"|\$" if m == "moneda" else "")) for m, p in _FIGURA_PALABRAS.items()}
HIPERONIMOS = {"almeja": ["molusco", "bivalvo", "concha", "marisco"], "piedra": ["roca", "canto", "guijarro"]}  # cómo se nombran sin decir el nombre

PROMPT_REPARTO = """Eres director de arte de un video explicativo vertical. Antes de animar las escenas, DISEÑA los personajes y objetos
que se repiten en el video, para dibujarlos una sola vez y que se vean IGUAL en todas las escenas.

Video: "{titulo}". Escenas (narración | qué se muestra):
{escenas}

TAREA: decide qué sujetos recurrentes necesita el video y que NO se pueden dibujar con los modelos de "figura" ({modelos}):
animales, objetos o herramientas concretos (por ejemplo una nutria, una piedra, una almeja). NO los disfraces con un modelo parecido:
un gato no es una nutria. Pocos y reconocibles: entre 1 y 5 diseños (los que aparecen en varias escenas o son el protagonista).
Incluye también 1 o 2 ESTRUCTURAS que el video explica aunque la narración no las nombre como protagonista (por ejemplo fibras de colágeno,
una bolsa de piel), si el guion las menciona en la narración o en el "qué se muestra" de más de una escena: así esas escenas también
muestran lo que se explica y no una figura cualquiera.
Si todo el video se cuenta bien con los modelos de "figura" (cuerpo humano, planeta, chip, dinero...), devuelve {{}}.

FORMATO: devuelve SOLO un objeto JSON (sin ``` ni comentarios):
{{"nombre": {{"alias": ["otras formas de nombrarlo en el guion"], "partes": [piezas]}}, ...}}
El nombre va en minúsculas, en singular y con espacios entre palabras ("nutria", "bolsa de piel"); "alias" son las palabras que usa el guion para ese sujeto, incluidas las más
generales ("nutria marina", "molusco" para almeja, "roca" para piedra). "partes" son las piezas, que se dibujan DE ATRÁS HACIA ADELANTE
(lo último tapa a lo anterior).

COORDENADAS LOCALES: el personaje mide ~1 de largo (de -0.5 a 0.5), está centrado en (0,0), con y hacia ABAJO, MIRANDO A LA DERECHA
(la cabeza va en x positivo, la cola en x negativo). Los objetos pequeños (piedra, almeja) también miden ~1 y se escalan al usarlos.

CÓMO DISEÑAR (para que no salgan deformes):
- Un animal: entre 8 y 25 piezas con una silueta reconocible: cuerpo grande (elipse o polígono suave), cabeza, hocico, orejas, ojos
  (forma "ojo"), extremidades, cola, y detalles (vientre más claro, bigotes, manchas) en colores naturales de ese sujeto.
- Un objeto o estructura (piedra, almeja, fibras, bolsa): MÍNIMO 6 piezas: la forma principal con borde y "brillo": true, detalle
  interno (vetas, estrías, núcleo, fibras), un brillo o una sombra secundaria, y movimiento propio con "mov" (pulsar, flotar u ondular).
  Un objeto de 2 piezas sale como una mancha y se rechaza.
- Piezas grandes (cuerpo, cabeza) con "brillo": true y un borde un poco más oscuro que el relleno: así tienen volumen.
- Extremidades con mov "oscilar" (amp en radianes, px/py = el punto donde se une al cuerpo); cola, tentáculos o aletas con mov "ondular";
  respiración o latido con "pulsar"; algo que flota con "flotar". El movimiento es lo que lo hace ver vivo.
- Cada pieza debe tocar o solaparse con otra: nada suelto flotando. Las proporciones importan más que el detalle.

PIEZAS DISPONIBLES:
{referencia}

EJEMPLO completo y bien hecho (una nutria con una piedra; la cola ondula y la pata se mueve):
{ejemplo}
"""

PROMPT_PERSONAJES = """PERSONAJES DEL VIDEO: ya están diseñados ({nombres}). El mismo sujeto debe verse IGUAL en todas las escenas donde aparezca:
dibújalo con {{"tipo":"personaje","ref":"<nombre>","x":..,"y":..,"tam":..}} (tam = su largo en unidades del mundo; "angulo", "espejo", "ruta",
"duracionRuta" y "fase" lo mueven y lo orientan). Si la narración habla de uno de ellos, ES el protagonista: dibújalo grande con "personaje",
NO con una "figura". Con "ruta" haz que nade, camine o se acerque al objeto; varios en la misma escena con "fase" distinta se mueven distinto.
Para un sujeto sin diseño ni modelo de "figura", usa "personaje" con "partes" propias (de 6 a 15 piezas)."""

PROMPT_SIN_REPARTO = """SUJETOS SIN MODELO: si lo que muestra la escena no está en la lista de "figura" (un animal, un objeto concreto), NO lo disfraces con otro
modelo: dibújalo con {{"tipo":"personaje","x":..,"y":..,"tam":..,"partes":[...]}} con piezas propias (de 6 a 15)."""

PROMPT_CORRECCION = """

ESTO ES UNA CORRECCIÓN. Tu versión anterior tuvo estos problemas. Corrígelos TODOS (no repitas el mismo diseño):
{problemas}"""


def duracion_estimada(voz: str) -> float:
    return len(voz.split()) * 0.36 + 0.5


def _extraer_json(texto: str) -> dict | None:
    """El objeto JSON de la respuesta (tolera ``` y texto alrededor); None si no hay uno válido."""
    t = re.sub(r"^```(?:json)?|```$", "", texto.strip(), flags=re.M).strip()
    a, b = t.find("{"), t.rfind("}")
    if a < 0 or b <= a:
        return None
    try:
        datos = json.loads(t[a:b + 1])
    except ValueError:
        return None
    return datos if isinstance(datos, dict) else None


def _asegurar_camara(escena: dict, dur: float) -> dict:
    """La cámara siempre se mueve: si la IA dejó un plano fijo se añade un acercamiento lento."""
    k = escena["camara"]
    if len(k) >= 2 and any((a["x"], a["y"], a["ancho"]) != (k[0]["x"], k[0]["y"], k[0]["ancho"]) for a in k[1:]):
        return escena
    base = k[0]
    escena["camara"] = [base, {"t": max(dur, base["t"] + 4), "x": base["x"], "y": base["y"], "ancho": max(base["ancho"] * 0.8, 1e-3)}]
    return escena


def _sin_acentos(texto: str) -> str:
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()


def _clave_texto(texto: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", _sin_acentos(texto))


def _cifras(texto: str) -> set[str]:
    return set(re.findall(r"\d+", texto))


def _ajustar_pantalla(escena: dict, portada: bool) -> dict:
    """Portada: sin textos de pantalla (abajo va el título gigante). Resto: tope de capas de texto; con una gráfica o un dial
    no se ponen numero/cita/frase (se encimarían); una etiqueta que repite el texto o la cifra de un numero se quita."""
    hay_dibujo = any(c["tipo"] not in prim.PANTALLA for c in escena["capas"])
    hay_datos = any(c["tipo"] in ("grafica", "dial") for c in escena["capas"])
    capas, textos = [], 0
    for c in escena["capas"]:
        if c["tipo"] in prim.PANTALLA:
            if portada and hay_dibujo:
                continue
            if hay_datos and c["tipo"] in ("numero", "cita", "frase"):
                continue
            textos += c["tipo"] not in ("grafica", "dial")
            if textos > MAX_TEXTOS_PANTALLA and c["tipo"] not in ("grafica", "dial"):
                continue
        capas.append(c)
    numeros = [c for c in capas if c["tipo"] == "numero"]
    repetidos = {_clave_texto(t) for n in numeros for t in (n.get("texto", ""), n.get("sub", ""))} - {""}
    cifras = set().union(*(_cifras(n.get("texto", "")) for n in numeros)) if numeros else set()
    escena["capas"] = [c for c in capas if not (c["tipo"] == "etiqueta" and (_clave_texto(c["texto"]) in repetidos or _cifras(c["texto"]) & cifras))]
    return escena


def _bloque_personajes(reparto: dict | None) -> str:
    if reparto:
        return PROMPT_PERSONAJES.format(nombres=", ".join(f'"{n}"' for n in reparto))
    return PROMPT_SIN_REPARTO


def _alias_de(datos: dict) -> dict[str, list[str]]:
    """{nombre normalizado: [alias]} de los personajes que la IA entregó como {"alias": [...], "partes": [...]}."""
    alias = {}
    for nombre, v in datos.items():
        if isinstance(v, dict) and isinstance(v.get("alias"), list):
            lista = [" ".join(a.lower().split()) for a in v["alias"] if isinstance(a, str) and a.strip()]
            if lista:
                alias[prim._norm_ref(nombre)] = lista[:8]
    return alias


def disenar_reparto(router: LLMRouter, guion: dict, paleta: dict) -> tuple[dict, dict]:
    """UNA llamada de IA por video: lee todo el guion y diseña con piezas los personajes y objetos recurrentes que no tienen
    modelo de `figura` (la nutria, la piedra, la almeja...). Devuelve (reparto, alias): `reparto` {nombre: piezas} ya validado por
    `prim.reparto_valido` (puede ser {}) y `alias` {nombre: [otras formas de nombrarlo en el guion]}. Un personaje con menos de
    MIN_PIEZAS piezas se pide de nuevo con más detalle (en el último intento se acepta). Si la IA no lo logra tras reintentar, el
    video sigue sin reparto: esto nunca bloquea la fábrica.
    `paleta` se conserva por simetría con `animar_escena`: los personajes llevan colores naturales, no los del nicho."""
    if not router.has_any:
        return {}, {}
    escenas = [e for e in guion["escenas"] if not e.get("cierre")]
    base = PROMPT_REPARTO.format(
        titulo=guion.get("titulo", ""), modelos=", ".join(prim.MODELOS), referencia=prim.describir(),
        escenas="\n".join(f"{i + 1}. {e['voz']} | {e.get('visual') or ''}" for i, e in enumerate(escenas)),
        ejemplo=json.dumps({n: {"alias": ["nutria marina", "nutrias"], "partes": partes}  # el formato pedido: con alias, no la lista pelada
                            for n, partes in json.loads(EJEMPLO_PERSONAJE.read_text(encoding="utf-8")).items()},
                           ensure_ascii=False, separators=(",", ":")))
    mejor: tuple[dict, dict] = ({}, {})
    puntaje = -1
    problemas: list[str] = []
    for intento in range(INTENTOS):
        prompt = base + (PROMPT_CORRECCION.format(problemas="\n".join(f"- {p}" for p in problemas)) if problemas else "")
        try:
            texto, _ = router.complete_any(prompt, json_mode=True, max_tokens=9000, temperature=0.6, timeout=180)
        except Exception as error:
            print(f"[Animador] reparto: {error}")
            break
        datos = _extraer_json(texto)
        if datos is None:
            problemas = ["la respuesta no era un objeto JSON válido: devuelve SOLO el JSON"]
            continue
        if len(datos) == 1 and isinstance(datos.get("reparto"), dict):
            datos = datos["reparto"]
        limpio, problemas = prim.reparto_valido(datos)
        alias = {n: a for n, a in _alias_de(datos).items() if n in limpio}
        pobres = [f"'{n}' tiene solo {len(p)} piezas: rehazlo con MÍNIMO {MIN_PIEZAS + 1} (forma principal con borde y \"brillo\": true, "
                  "detalle interno, un brillo o sombra secundaria y un \"mov\" propio)" for n, p in limpio.items() if len(p) < MIN_PIEZAS]
        if len(limpio) - len(pobres) >= puntaje:
            mejor, puntaje = (limpio, alias), len(limpio) - len(pobres)
        perdidos = len({prim._norm_ref(n) for n in datos}) - len(limpio)
        if not perdidos and not pobres:  # los recortes menores no obligan a repetir
            return limpio, alias
        problemas = [p for p in problemas if "se recorta" not in p and "se ignora" not in p] + pobres
        print(f"[Animador] reparto a mejorar (intento {intento + 1}): {'; '.join(problemas)[:240]}")
    return mejor


def _menciona(texto: str, nombre: str, alias: dict | None) -> bool:
    """¿El texto (sin acentos) nombra a este personaje del reparto, por su nombre, un alias o un hiperónimo (también pegado)?"""
    nombres = _nombres_de(nombre, alias)
    compacto = _clave_texto(texto)  # la IA a veces junta las palabras del nombre ("bolsadepiel")
    return bool(re.search(r"\b(?:" + "|".join(re.escape(_sin_acentos(t)) for t in nombres) + r")(?:s|es)?\b", texto)
                or any(len(c := _clave_texto(t)) >= 8 and c in compacto for t in nombres))


def _protagonista(escena: dict, texto: str = "", alias: dict | None = None) -> dict | None:
    """El protagonista de la escena: de los personajes que la narración o el 'qué mostrar' nombran, el de mayor `tam`; si
    ninguno se nombra, la figura o personaje de mayor `tam`. Cuentan también los que viajan por una ruta (pasó: la nutria llevaba
    ruta, se la ignoró y quedó de protagonista la piedra). Los lejanos (`profundidad`) son fondo y no cuentan."""
    cuerpos = [c for c in escena["capas"] if c["tipo"] in ("personaje", "figura") and not c.get("profundidad")]
    if not cuerpos:
        return None
    texto = _sin_acentos(texto)
    mayor = max(c["tam"] for c in cuerpos)
    # Un nombrado solo gana si no es un accesorio pequeño: "sacan la piedra" no convierte a la piedra en la protagonista cuando
    # la nutria, que la narración no nombra pero está en escena, es varias veces más grande.
    nombrados = [c for c in cuerpos if c["tipo"] == "personaje" and c.get("ref") and c["tam"] >= 0.5 * mayor
                 and _menciona(texto, prim._norm_ref(c["ref"]), alias)]
    return max(nombrados or cuerpos, key=lambda c: c["tam"])


def _pos_en(c: dict, t: float) -> tuple[float, float]:
    """Dónde está la figura en el segundo t: si tiene `ruta`, recorre [(x, y), *ruta] con aceleración suave, como el motor."""
    ruta = c.get("ruta")
    if not ruta:
        return c["x"], c["y"]
    pts = [(c["x"], c["y"]), *map(tuple, ruta)]
    k = min(max((t - c.get("desde", 0)) / c.get("duracionRuta", 3), 0.0), 1.0)
    k = k * k * (3 - 2 * k)
    largos = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:])]
    resto = sum(largos) * k
    for (a, b), d in zip(zip(pts, pts[1:]), largos):
        if resto <= d or d == 0:
            f = resto / d if d else 0
            return a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
        resto -= d
    return pts[-1]


def _fuera(cam: dict, x: float, y: float, tam: float) -> bool:
    """¿Un cuerpo de tamaño `tam` en (x, y) queda del todo fuera de la franja de dibujo (ancho completo, ±0,35 del ancho en vertical)?"""
    return abs(x - cam["x"]) > cam["ancho"] / 2 + tam / 2 or abs(y - cam["y"]) > 0.35 * cam["ancho"] + tam / 2


def _camara_en(claves: list[dict], t: float) -> dict:
    """Cámara interpolada en el segundo t, como el motor (aceleración suave; el zoom en escala logarítmica)."""
    if t <= claves[0]["t"]:
        return claves[0]
    for a, b in zip(claves, claves[1:]):
        if t < b["t"]:
            k = (t - a["t"]) / (b["t"] - a["t"])
            k = k * k * (3 - 2 * k)
            return {"x": a["x"] + (b["x"] - a["x"]) * k, "y": a["y"] + (b["y"] - a["y"]) * k,
                    "ancho": math.exp(math.log(a["ancho"]) * (1 - k) + math.log(b["ancho"]) * k)}
    return claves[-1]


def _centrar_camara(escena: dict, portada: bool, dur: float, texto: str = "", alias: dict | None = None) -> dict:
    """Pasó (video de las nutrias): la IA mueve la cámara en y como si fueran píxeles (y=860, 845, 830...) con un ancho de
    1,4 m y el protagonista queda a metros fuera del cuadro. Si el protagonista queda del todo fuera en una clave de la cámara,
    esa clave se centra en él (en la portada, ancho/7 más abajo). Después se mide en los momentos en que el revisor mira la
    escena (30, 55, 80 y 97 %): donde sigue fuera (porque viaja por una ruta, por ejemplo) se añade una clave centrada en él."""
    p = _protagonista(escena, texto, alias)
    if p is None:
        return escena
    desplaza = lambda ancho: ancho / 7 if portada else 0
    for k in escena["camara"]:
        x, y = _pos_en(p, k["t"])
        if _fuera(k, x, y, p["tam"]):
            k["x"], k["y"] = x, y + desplaza(k["ancho"])
    for f in (0.3, 0.55, 0.8, 0.97):
        t = f * dur
        cam = _camara_en(escena["camara"], t)
        x, y = _pos_en(p, t)
        if _fuera(cam, x, y, p["tam"]) and len(escena["camara"]) < 12:
            escena["camara"].append({"t": t, "x": x, "y": y + desplaza(cam["ancho"]), "ancho": cam["ancho"]})
            escena["camara"].sort(key=lambda k: k["t"])
    return escena


def protagonista_adecuado(escena: dict, dur: float, texto: str = "", alias: dict | None = None) -> bool:
    """¿El protagonista se ve bien a 0,8 de la escena (donde el revisor lo mide)? Sí si ocupa al menos el 55 % del ancho visible
    y está dentro del cuadro. El revisor lo usa para no pedir otra ronda a la IA por un aviso de píxeles que solo refleja una figura
    alargada (una nutria entera cubre ~10 % del lienzo y nunca llega al mínimo)."""
    p = _protagonista(escena, texto, alias)
    if p is None:
        return False
    t = MOMENTO_PROTAGONISTA * dur
    cam = _camara_en(escena["camara"], t)
    x, y = _pos_en(p, t)
    return p["tam"] / cam["ancho"] >= 0.55 and not _fuera(cam, x, y, p["tam"])


def _ancho_en(claves: list[dict], t: float) -> float:
    """Ancho de la cámara en el segundo t (el motor interpola con aceleración suave y el zoom en escala logarítmica)."""
    if t <= claves[0]["t"]:
        return claves[0]["ancho"]
    for a, b in zip(claves, claves[1:]):
        if t < b["t"]:
            k = (t - a["t"]) / (b["t"] - a["t"])
            k = k * k * (3 - 2 * k)
            return math.exp(math.log(a["ancho"]) * (1 - k) + math.log(b["ancho"]) * k)
    return claves[-1]["ancho"]


def _reescalar_cuerpos(escena: dict, p: dict, f: float) -> None:
    """Multiplica por f el tamaño de todos los personajes/figuras y su distancia al protagonista `p` (que no se mueve)."""
    for c in escena["capas"]:
        if c["tipo"] in ("personaje", "figura") and not c.get("profundidad"):
            c["x"], c["y"] = p["x"] + (c["x"] - p["x"]) * f, p["y"] + (c["y"] - p["y"]) * f
            c["tam"] *= f
            if c.get("ruta"):
                c["ruta"] = [[p["x"] + (x - p["x"]) * f, p["y"] + (y - p["y"]) * f] for x, y in c["ruta"]]


def _agrandar_protagonista(escena: dict, portada: bool, dur: float, texto: str = "", alias: dict | None = None) -> dict:
    """Pasó (nutrias): la IA dibujaba al protagonista pequeño (cubría 5-12 % del cuadro) y el revisor lo rechazaba aunque la
    escena estuviera bien armada. El revisor mide al protagonista hacia el 80 % de la escena: si ahí ocupa menos de
    PROTAGONISTA_RAZON del ancho visible, se acerca la cámara (el mismo factor en todas las claves, hasta ZOOM_MAX) y, si falta
    más, se agranda su `tam` (hasta TAM_MAX); las claves donde queda descentrado se vuelven a centrar en él. Si faltaría más
    de ZOOM_MAX × TAM_MAX es un error de escala de la IA (pasó: nutria de 5 m con cámara de 363 m, invisible): entonces se
    reescalan los personajes y sus distancias, sin tocar la cámara. Con grafica o dial el protagonista sube a la mitad superior de
    la franja de dibujo, para que la gráfica no lo tape. No se aplica a la portada, que ya tiene su nota."""
    p = _protagonista(escena, texto, alias)
    if portada or p is None:
        return escena
    claves = escena["camara"]
    razon = p["tam"] / _ancho_en(claves, MOMENTO_PROTAGONISTA * dur)
    if razon < PROTAGONISTA_RAZON:
        necesario = PROTAGONISTA_RAZON / razon
        if necesario > ZOOM_MAX * TAM_MAX:
            _reescalar_cuerpos(escena, p, necesario)
        else:
            zoom = min(necesario, ZOOM_MAX)
            for k in claves:
                k["ancho"] = max(k["ancho"] / zoom, 1e-3)
            p["tam"] *= necesario / zoom
        for k in claves:
            x, y = _pos_en(p, k["t"])
            if max(abs(x - k["x"]), abs(y - k["y"])) > k["ancho"] * 0.2:
                k["x"], k["y"] = x, y
    for k in claves:  # tampoco más ancho que 1,5 veces el cuadro (pasó: nutria de 12 con cámara de 5, un muro de pelo)
        k["ancho"] = max(k["ancho"], p["tam"] / PROTAGONISTA_MAX)
    if any(c["tipo"] in ("grafica", "dial") for c in escena["capas"]):
        for k in claves:
            x, y = _pos_en(p, k["t"])
            if abs(y - k["y"]) <= k["ancho"] / 4 and abs(x - k["x"]) <= k["ancho"] / 2:
                k["y"] = y + k["ancho"] / 7
    return escena


def _nombres_de(nombre: str, alias: dict | None) -> list[str]:
    """Todas las formas de nombrar un personaje del reparto: su nombre, los alias que dio la IA y los hiperónimos fijos."""
    return [nombre, *(alias or {}).get(nombre, []), *HIPERONIMOS.get(nombre, [])]


def _personajes_ausentes(escena_guion: dict, limpia: dict, reparto: dict | None, alias: dict | None = None) -> list[str]:
    """Problemas por personajes del reparto que la narración (o sus alias: 'molusco' → almeja) nombra y la escena no dibuja
    (pasó: la piedra salió como moneda)."""
    texto = _sin_acentos(f"{escena_guion['voz']} {escena_guion.get('visual') or ''}")
    usados = {prim._norm_ref(c.get("ref")) for c in limpia["capas"] if c["tipo"] == "personaje"}
    return [f"la escena habla de '{n}' pero no la dibujas: añade {{\"tipo\":\"personaje\",\"ref\":\"{n}\",...}} (NO la sustituyas por una figura de otra cosa)"
            for n in (reparto or {}) if n not in usados and _menciona(texto, n, alias)]


def _figuras_ajenas(guion: dict, escena_guion: dict, limpia: dict) -> list[str]:
    """Modelos de `figura` de la escena que nada en el título, la narración ni el 'qué mostrar' justifica (pasó: gota roja para el
    colágeno, moneda con '$' como molusco). Un modelo sin palabras en FIGURA_PALABRAS no se revisa."""
    texto = _sin_acentos(f"{guion.get('titulo', '')} {escena_guion['voz']} {escena_guion.get('visual') or ''}")
    return sorted({c["modelo"] for c in limpia["capas"] if c["tipo"] == "figura" and c["modelo"] in FIGURA_PALABRAS
                   and not FIGURA_PALABRAS[c["modelo"]].search(texto)})


def _quitar_figuras(limpia: dict, modelos: list[str]) -> dict:
    """Quita las figuras sin relación con la narración, pero solo si la escena conserva otro dibujo (mejor sin ella que equivocada)."""
    resto = [c for c in limpia["capas"] if not (c["tipo"] == "figura" and c["modelo"] in modelos)]
    if any(c["tipo"] not in prim.PANTALLA for c in resto):
        limpia["capas"] = resto
    return limpia


def _quitar_rutas_absurdas(escena: dict) -> dict:
    """Pasó (nutrias, escena 6): la IA dio a la nutria una ruta de 1000 unidades con una cámara de 5 a 8 de ancho: en pantalla
    cruzaba el cuadro en un parpadeo y el resto del tiempo no se veía. Una ruta más larga que 3 veces el mayor ancho de cámara
    es un error de escala: la figura se queda quieta en su punto de partida."""
    mayor = max(k["ancho"] for k in escena["camara"])
    for c in escena["capas"]:
        if c.get("ruta") and sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip([[c["x"], c["y"]], *c["ruta"]], c["ruta"])) > 3 * mayor:
            del c["ruta"]
            c.pop("duracionRuta", None)
    return escena


def _componer_protagonista(escena: dict, portada: bool, dur: float, texto: str, alias: dict | None) -> dict:
    """Reglas de cámara y tamaño sobre el protagonista, en este orden: centrar (si quedó fuera de cuadro), agrandar y, al final,
    asegurar otra vez que sigue dentro del cuadro en todos los momentos que mide el revisor."""
    _quitar_rutas_absurdas(escena)
    _centrar_camara(escena, portada, dur, texto, alias)
    _agrandar_protagonista(escena, portada, dur, texto, alias)
    _centrar_camara(escena, portada, dur, texto, alias)
    k = escena["camara"]
    if len({(c["x"], c["y"], c["ancho"]) for c in k}) == 1:  # las reglas dejaron la cámara quieta: la cámara siempre se mueve
        k[0]["ancho"] *= 1.15
    return escena


def animar_escena(router: LLMRouter, guion: dict, indice: int, paleta: dict, estilo: str = "plano",
                  correcciones: list[str] | None = None, reparto: dict | None = None,
                  alias: dict | None = None) -> tuple[str, str, dict]:
    """Devuelve (html, origen, prim): `html` siempre es "" (los textos los ponen las capas de pantalla de `prim`, que
    tienen posición fija; un título HTML aparte chocaba con ellas), `origen` 'ia' o 'respaldo' y `prim` la escena
    procedural ya validada. `correcciones`: problemas que midió el revisor en la versión anterior. (`estilo` se
    conserva por compatibilidad: el fondo ya lo elige la escena.) `reparto`: personajes del video {nombre: piezas}
    (ver `disenar_reparto`) que la escena puede usar con {"tipo": "personaje", "ref": nombre}; `alias` {nombre: [sinónimos]}."""
    escenas = guion["escenas"]
    escena = escenas[indice]
    dur = duracion_estimada(escena["voz"])
    portada = indice == 0 and bool(guion.get("portada", {}).get("texto"))
    texto_escena = f"{escena['voz']} {escena.get('visual') or ''}"
    celulas = prim.contexto_celular(texto_escena)  # el contexto decide, no el nicho
    base = PROMPT_ESCENA.format(
        titulo=guion.get("titulo", ""), n=indice + 1, total=len(escenas),
        resumen="\n".join(f"{i + 1}. {e['voz']}" for i, e in enumerate(escenas)),
        voz=escena["voz"], visual=escena.get("visual") or "algo que muestre lo que dice la narración",
        dur=dur, fin=max(1.0, dur - 1.5), max_textos=MAX_TEXTOS_PANTALLA, referencia=prim.describir(),
        modelos=", ".join(prim.MODELOS), personajes=_bloque_personajes(reparto), ejemplo=EJEMPLO if celulas else EJEMPLO_SIN_CELULAS,
        nota_celulas=NOTA_CELULAS if celulas else NOTA_SIN_CELULAS, nota_portada=NOTA_PORTADA if portada else "", **paleta)
    problemas = list(correcciones or [])
    if router.has_any:
        for intento in range(INTENTOS):
            prompt = base + (PROMPT_CORRECCION.format(problemas="\n".join(f"- {p}" for p in problemas)) if problemas else "")
            try:
                texto, _ = router.complete_any(prompt, json_mode=True, max_tokens=6000, temperature=0.7, timeout=150)
            except Exception as error:
                print(f"[Animador] escena {indice + 1}: {error}")
                break
            datos = _extraer_json(texto)
            if datos is None:
                problemas = ["la respuesta no era un objeto JSON válido: devuelve SOLO el JSON"]
            else:
                limpia, problemas = prim.validar(datos, celulas=celulas, reparto=reparto)
                if limpia is not None:
                    limpia = _ajustar_pantalla(_asegurar_camara(limpia, dur), portada)
                    ajenas = _figuras_ajenas(guion, escena, limpia)
                    faltas = _personajes_ausentes(escena, limpia, reparto, alias) + [
                        f"usaste la figura '{m}' pero la narración no habla de eso: dibuja lo que se nombra con un 'personaje' (ref del reparto o "
                        "'partes' propias) o con un diagrama (red, corriente, grafica, anillos...)" for m in ajenas]
                    if not faltas:
                        return "", "ia", _componer_protagonista(limpia, portada, dur, texto_escena, alias)
                    if intento == INTENTOS - 1:  # último intento: se quitan las figuras ajenas y se acepta la escena válida
                        return "", "ia", _componer_protagonista(_quitar_figuras(limpia, ajenas), portada, dur, texto_escena, alias)
                    problemas = faltas
            print(f"[Animador] escena {indice + 1}: escena inválida (intento {intento + 1}): {'; '.join(problemas)[:200]}")
    respaldo = prim.respaldo(escena["voz"], color=paleta["principal"], semilla=indice * 7 + 3, celulas=celulas)
    return "", "respaldo", _ajustar_pantalla(respaldo, portada)
