"""Historias animadas: de un guion de movimientos por escena a escenas del motor (plantilla/primitivas.js).

Cada escena del guion dice QUÉ pasa con un vocabulario fijo (acciones, plano, cámara, escenario); el código lo convierte en rutas,
cámara continua y paisajes planos con profundidad. La IA no inventa coordenadas: elige palabras de este vocabulario, y los actores
son siempre del reparto del video (ilustraciones dibujadas una sola vez y reutilizadas, para que el protagonista sea el mismo
en toda la historia). Unidades del mundo: metros; el suelo está en y = 0 y y crece hacia abajo.
"""

from __future__ import annotations

from src import objetos, prim

ACCIONES = ["cruza_der", "cruza_izq", "entra_der", "entra_izq", "sube", "baja", "tiembla", "gira", "late", "flota", "quieto"]
PLANOS = {"general": 3.2, "medio": 1.9, "cerrado": 1.25}      # ancho de la vista = ancho del protagonista x este factor
CAMARAS = ["sigue", "fija", "acerca", "aleja"]
ESCENARIOS = ["carretera", "campo", "bosque", "interior", "oscuro"]
TEMA_ESCENARIO = {"carretera": "atardecer", "campo": "cielo", "bosque": "bosque", "interior": "interior", "oscuro": "oscuro"}
POSICIONES = {"centro": (0.0, 0.0), "izq": (-.46, 0.0), "der": (.46, 0.0), "arriba": (0.0, -.38), "abajo": (0.0, .38)}  # en anchos de vista

# movimiento propio de las acciones que no viajan: (mov, amp, vel)
MOV_PROPIO = {"tiembla": ("oscilar", .03, 7.0), "gira": ("girar", 0, .9), "late": ("pulsar", .06, 1.6), "flota": ("flotar", .05, .4),
              "quieto": ("flotar", .015, .3)}
# viajes: (dx inicial, dx final, dy inicial, dy final) en anchos de vista, respecto de la posición del actor
VIAJES = {"cruza_der": (-1.4, 1.4, 0, 0), "cruza_izq": (1.4, -1.4, 0, 0), "entra_izq": (-1.5, 0, 0, 0), "entra_der": (1.5, 0, 0, 0),
          "sube": (0, 0, .8, 0), "baja": (0, 0, -.8, 0)}


def _definicion(a: dict, reparto: dict) -> dict:
    """{"partes" | "imagen", "aspecto", "metros"} del actor: un objeto vectorial de la biblioteca (con su giro si el guion lo indica,
    ej. una llanta bloqueada con "giro": 0) o una imagen del reparto del video."""
    if a["ref"] in objetos.OBJETOS:
        return objetos.objeto(a["ref"], a.get("giro"))
    return reparto[a["ref"]]


def _suave(k: float) -> float:
    k = min(max(k, 0.0), 1.0)
    return k * k * (3 - 2 * k)


def _actor(a: dict, r: dict, vista: float, suelo: bool, dur_ruta: float, indice: int, tope: float | None = None) -> tuple[dict, tuple, tuple]:
    """(capa sprite, posición inicial, posición final) de un actor del guion. Con suelo, los pies del actor quedan en y = 0. `tope`: ancho
    máximo en metros (los actores secundarios no pueden ser más grandes que el protagonista)."""
    ancho = r["metros"] * float(a.get("tam", 1.0))
    if tope:
        ancho = min(ancho, tope)
    alto = ancho / r["aspecto"]
    px, py = POSICIONES.get(a.get("pos", "centro"), (0.0, 0.0))
    x, y = px * vista, py * vista - (alto / 2 if suelo else 0.0)
    accion = a.get("accion", "quieto")
    capa = {"tipo": "sprite", "ancho": ancho, "desde": 0, "fase": (indice * .37) % 1}
    if "partes" in r:
        capa.update({"partes": r["partes"], "aspecto": r["aspecto"], "sombra": suelo})
    else:
        capa["imagen"] = r["imagen"]
    inicio = fin = (x, y)
    if accion in VIAJES:
        dx0, dx1, dy0, dy1 = VIAJES[accion]
        inicio, fin = (x + dx0 * vista, y + dy0 * vista), (x + dx1 * vista, y + dy1 * vista)
        capa.update({"ruta": [list(fin)], "duracionRuta": dur_ruta, "mov": "flotar", "amp": .012, "vel": .5})
        if accion == "cruza_izq":
            capa["espejo"] = True
    else:
        mov, amp, vel = MOV_PROPIO.get(accion, MOV_PROPIO["quieto"])
        capa.update({"mov": mov, "amp": amp, "vel": vel})
    capa["x"], capa["y"] = inicio
    return capa, inicio, fin


def _camara(modo: str, inicio: tuple, fin: tuple, vista: float, dur_ruta: float, total: float) -> list[dict]:
    """Cámara continua: sigue al protagonista (con su misma suavidad de arranque y llegada), o fija / se acerca / se aleja sobre él."""
    if modo == "sigue":
        claves = []
        for f in (0, .25, .5, .75, 1):
            k = _suave(f)
            claves.append({"t": f * dur_ruta, "x": inicio[0] + (fin[0] - inicio[0]) * k, "y": inicio[1] + (fin[1] - inicio[1]) * k,
                           "ancho": vista})
        return claves + [{**claves[-1], "t": max(total, dur_ruta + .1)}]
    x, y = fin
    ancho0, ancho1 = {"acerca": (vista * 1.18, vista * .94), "aleja": (vista * .94, vista * 1.18)}.get(modo, (vista * 1.05, vista))
    return [{"t": 0, "x": x, "y": y, "ancho": ancho0}, {"t": total, "x": x, "y": y, "ancho": ancho1}]


def _paisaje(escenario: str, x0: float, x1: float, vista: float, alto_heroe: float) -> list[dict]:
    """Capas del escenario de lo más lejano a lo más cercano (el suelo está en y = 0); cada una con su profundidad para el paralaje."""
    if escenario == "oscuro":
        return []
    ancho = x1 - x0
    por = lambda cuantos: max(3, int(ancho / vista * cuantos))
    suelo = lambda color: {"tipo": "carretera", "x": x0, "y": -alto_heroe * .08, "ancho": ancho, "alto": vista * 1.3, "color": color, "linea": False}
    if escenario == "campo":
        return [
            {"tipo": "siluetas", "forma": "nube", "x": x0, "y": -vista * .5, "ancho": ancho, "alto": vista * .22, "n": por(.8), "color": "#ffffff",
             "semilla": 5, "profundidad": .9},
            {"tipo": "colinas", "x": x0, "y": 0, "ancho": ancho, "alto": vista * .45, "n": por(1.0), "color": "#9fd0a8", "semilla": 6, "profundidad": .85},
            {"tipo": "colinas", "x": x0, "y": 0, "ancho": ancho, "alto": vista * .28, "n": por(1.8), "color": "#6fb37f", "semilla": 9, "profundidad": .6},
            {"tipo": "siluetas", "forma": "arbol", "x": x0, "y": 0, "ancho": ancho, "alto": vista * .32, "n": por(2.2), "color": "#3f7d55", "semilla": 7,
             "profundidad": .4},
            suelo("#5fa36b")]
    if escenario == "bosque":
        return [
            {"tipo": "colinas", "x": x0, "y": 0, "ancho": ancho, "alto": vista * .5, "n": por(1.0), "color": "#0f2c33", "semilla": 11, "profundidad": .85},
            {"tipo": "siluetas", "forma": "pino", "x": x0, "y": 0, "ancho": ancho, "alto": vista * .55, "n": por(4.0), "color": "#0c242a", "semilla": 12,
             "profundidad": .6},
            {"tipo": "siluetas", "forma": "pino", "x": x0, "y": 0, "ancho": ancho, "alto": vista * .75, "n": por(2.4), "color": "#081a1f", "semilla": 13,
             "profundidad": .35},
            suelo("#0b1f20")]
    if escenario == "interior":
        return [suelo("#8a6a4f")]
    return [
        {"tipo": "siluetas", "forma": "nube", "x": x0, "y": -vista * .55, "ancho": ancho, "alto": vista * .24, "n": por(.8),
         "color": "#fbe0c8", "semilla": 2, "profundidad": .9},
        {"tipo": "colinas", "x": x0, "y": 0, "ancho": ancho, "alto": vista * .50, "n": por(1.0), "color": "#cc7f94", "semilla": 3,
         "profundidad": .85},
        {"tipo": "colinas", "x": x0, "y": 0, "ancho": ancho, "alto": vista * .32, "n": por(1.7), "color": "#9a5f8c", "semilla": 8,
         "profundidad": .65},
        {"tipo": "siluetas", "forma": "pino", "x": x0, "y": 0, "ancho": ancho, "alto": vista * .34, "n": por(3.0), "color": "#5d3f73",
         "semilla": 4, "profundidad": .4},
        {"tipo": "carretera", "x": x0, "y": -alto_heroe * .08, "ancho": ancho, "alto": vista * 1.3, "color": "#4a3b57",
         "colorLinea": "#f4d35e"},
    ]


def escena(sb: dict, reparto: dict, color: str, indice: int, dur: float, portada: bool = False) -> dict:
    """Escena del motor a partir de un paso del guion de movimientos:
    {"escenario", "plano", "camara", "actores": [{"ref", "accion", "pos"?, "tam"?}], "rotulo"?, "numero"?}.
    `reparto`: ref → {"imagen" (ruta del PNG), "aspecto" (ancho/alto), "metros" (ancho real)}. `dur`: segundos de voz de la escena.
    `portada`: la escena lleva el gancho gigante en la franja 860-1240; la cámara baja para que el protagonista quede encima, a la vista."""
    actores = [a for a in sb["actores"] if a.get("ref") in reparto or a.get("ref") in objetos.OBJETOS]
    if not actores:
        raise ValueError(f"escena {indice + 1}: ningún actor del guion existe (ni en la biblioteca ni en el reparto)")
    definiciones = [_definicion(a, reparto) for a in actores]
    rh = definiciones[0]
    ancho_h = rh["metros"] * float(actores[0].get("tam", 1.0))
    alto_h = ancho_h / rh["aspecto"]
    vista = ancho_h * PLANOS.get(sb.get("plano", "medio"), PLANOS["medio"])
    escenario = sb["escenario"] if sb.get("escenario") in ESCENARIOS else "oscuro"
    dur_ruta, total = max(dur * .9, 2.0), max(dur * 1.3, 4.0)

    capas_actores, caminos = [], []
    for i, a in enumerate(actores):
        capa, ini, fin = _actor(a, definiciones[i], vista, escenario != "oscuro", dur_ruta, indice + i, tope=.6 * ancho_h if i else None)
        capas_actores.append(capa)
        caminos.append((ini, fin))
    ini, fin = caminos[0]
    camara = _camara(sb.get("camara", "fija"), ini, fin, vista, dur_ruta, total)
    if portada:  # el centro de la cámara cae en y = 860 px; se baja ~330 px para que el protagonista quede sobre el gancho
        for k in camara:
            k["y"] += 330 * k["ancho"] / 1080
    xs = [k["x"] for k in camara]
    capas = _paisaje(escenario, min(xs) - 3.5 * vista, max(xs) + 3.5 * vista, vista, alto_h) + capas_actores

    if sb.get("rotulo") and actores[0].get("accion") not in ("cruza_der", "cruza_izq"):  # un rótulo fijo no sigue a quien cruza
        capas.append({"tipo": "etiqueta", "texto": str(sb["rotulo"]).upper()[:18], "x": fin[0] + .2 * ancho_h, "y": fin[1] - .25 * alto_h,
                      "dx": 120, "dy": -170, "color": color, "desde": .8})
    num = sb.get("numero")
    if isinstance(num, dict) and num.get("valor"):
        capas.append({"tipo": "numero", "texto": str(num["valor"])[:6], "sub": str(num.get("texto", ""))[:24], "desde": .6, "color": color})

    esc, problemas = prim.validar({"fondo": {"tema": TEMA_ESCENARIO[escenario]}, "unidad": "m",
                                   "escala": True, "camara": camara, "capas": capas}, celulas=False)
    if esc is None:
        raise ValueError(f"escena {indice + 1}: el motor rechazó la escena: {problemas}")
    return esc if escenario != "oscuro" else prim.con_fondo_lejano(esc, color, False, indice + 1)
