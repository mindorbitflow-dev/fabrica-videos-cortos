"""Biblioteca de objetos vectoriales: dibujos planos y limpios hechos en código con las piezas del motor (elipse, polígono, línea).

Cada objeto se diseña en píxeles sobre un lienzo W x H (como en un editor vectorial) y `objeto()` lo normaliza a lo que espera el motor:
1 de ancho, centrado en 0,0, y hacia abajo. Las piezas giratorias (ruedas, llantas, discos) llevan `mov` con su pivote, así que de verdad
giran. `giro` multiplica la velocidad de giro (0 = detenido; una llanta bloqueada no gira).
Estilo común: colores lisos, esquinas suaves, un poco de volumen (`brillo`) en la carrocería y detalles de otro tono.
"""

from __future__ import annotations

import math
from typing import Callable


# ---------- piezas (en píxeles de diseño) ----------
def _e(x, y, rx, color, ry=None, **kw) -> dict:
    return {"forma": "elipse", "x": x, "y": y, "rx": rx, "ry": ry or rx, "color": color, **kw}


def _p(puntos, color, suave=False, **kw) -> dict:
    return {"forma": "poligono", "puntos": [list(q) for q in puntos], "suave": suave, "color": color, **kw}


def _l(puntos, color, grosor, **kw) -> dict:
    return {"forma": "linea", "puntos": [list(q) for q in puntos], "color": color, "grosor": grosor, **kw}


def _giro(vel: float, cx: float, cy: float, fase: float = 0.0) -> dict:
    return {"tipo": "girar", "vel": vel, "px": cx, "py": cy, "fase": fase}


def _radial(cx, cy, r0, r1, grados) -> list:
    a = math.radians(grados)
    return [(cx + r0 * math.cos(a), cy + r0 * math.sin(a)), (cx + r1 * math.cos(a), cy + r1 * math.sin(a))]


def _normalizar(piezas: list[dict], ancho: float, alto: float) -> list[dict]:
    """Píxeles de diseño → coordenadas del motor (1 de ancho, centrado en 0,0, y hacia abajo)."""
    nx, ny = (lambda x: (x - ancho / 2) / ancho), (lambda y: (y - alto / 2) / ancho)
    salida = []
    for pieza in piezas:
        q = dict(pieza)
        if "x" in q:
            q["x"], q["y"] = nx(q["x"]), ny(q["y"])
        for k in ("rx", "ry", "grosor", "r"):
            if k in q:
                q[k] = q[k] / ancho
        if "puntos" in q:
            q["puntos"] = [[nx(x), ny(y)] for x, y in q["puntos"]]
        if "mov" in q and "px" in q["mov"]:
            q["mov"] = {**q["mov"], "px": nx(q["mov"]["px"]), "py": ny(q["mov"]["py"])}
        salida.append(q)
    return salida


# ---------- objetos ----------
def _rueda_con_rayos(cx, cy, radio, giro, color_llanta="#22201e") -> list[dict]:
    """Llanta, aro, tres diámetros como rayos (uno dorado para que se note el giro) y el centro."""
    piezas = [_e(cx, cy, radio + 14, "#2a2230"), _e(cx, cy, radio, color_llanta), _e(cx, cy, radio * .6, "#cfd4db")]
    for i, grados in enumerate((0, 60, 120)):
        a = math.radians(grados)
        extremo = radio * .57
        piezas.append(_l([(cx - extremo * math.cos(a), cy - extremo * math.sin(a)), (cx + extremo * math.cos(a), cy + extremo * math.sin(a))],
                         "#e0b24a" if i == 0 else "#7d8590", 7, mov=_giro(giro, cx, cy)))
    piezas.append(_e(cx, cy, radio * .17, color_llanta))
    return piezas


def _carro(giro: float):
    rojo, rojo2 = "#c8372d", "#962321"
    piezas = [
        _p([(30, 180), (45, 148), (100, 138), (800, 138), (855, 148), (870, 180), (870, 225), (850, 250), (50, 250), (30, 225)], rojo, True, brillo=True),
        _p([(205, 142), (285, 62), (615, 62), (705, 142)], rojo, False, brillo=True),
        _p([(238, 136), (300, 78), (440, 78), (440, 136)], "#bee2f2"),
        _p([(462, 136), (462, 78), (592, 78), (660, 136)], "#bee2f2"),
        _p([(30, 190), (870, 190), (870, 204), (30, 204)], rojo2),
        _l([(450, 80), (450, 200)], rojo2, 4),
        _p([(826, 160), (866, 160), (866, 185), (826, 185)], "#fae696"),
        _p([(34, 160), (62, 160), (62, 185), (34, 185)], "#ff8a5c"),
    ]
    for cx in (215, 690):
        piezas += _rueda_con_rayos(cx, 250, 70, giro)
    return 900, 330, 4.4, piezas


def _llanta(giro: float):
    c = 200
    piezas = [_e(c, c, 196, "#1f1d21")]
    piezas += [_l(_radial(c, c, 170, 192, k * 22.5), "#3a373d", 9, mov=_giro(giro, c, c)) for k in range(16)]    # dibujo de la banda
    piezas += [_e(c, c, 150, "#2c2a30"), _e(c, c, 112, "#cdd3da")]
    piezas += [_l(_radial(c, c, 0, 100, k * 72 + (30 if k == 0 else 0)), "#e0b24a" if k == 0 else "#8a93a0", 16, mov=_giro(giro, c, c)) for k in range(5)]
    piezas.append(_e(c, c, 36, "#2a2730"))
    piezas += [_e(c + 22 * math.cos(math.radians(k * 72)), c + 22 * math.sin(math.radians(k * 72)), 7, "#cdd3da", mov=_giro(giro, c, c)) for k in range(5)]
    return 400, 400, 0.65, piezas


def _cono(giro: float):
    return 300, 340, 0.45, [
        _p([(150, 10), (235, 290), (65, 290)], "#f28c28", False, brillo=True),
        _p([(124, 95), (176, 95), (192, 150), (108, 150)], "#fafafa"),
        _p([(35, 285), (265, 285), (265, 330), (35, 330)], "#3c3237", True),
    ]


def _disco(giro: float):
    c = 200
    piezas = [_e(c, c, 190, "#b9c0c8"), _e(c, c, 150, "#a4acb6")]
    piezas += [_e(c + 125 * math.cos(math.radians(k * 30)), c + 125 * math.sin(math.radians(k * 30)), 13, "#59606b", mov=_giro(giro, c, c)) for k in range(12)]
    piezas += [_e(c, c, 78, "#8d96a2")]
    piezas += [_e(c + 48 * math.cos(math.radians(k * 72)), c + 48 * math.sin(math.radians(k * 72)), 9, "#4b525c", mov=_giro(giro, c, c)) for k in range(5)]
    piezas.append(_p([(235, 60), (390, 125), (390, 275), (235, 340), (275, 265), (275, 135)], "#d1432f", True, brillo=True))   # pinza
    return 400, 400, 0.3, piezas


def _pedal(giro: float):
    piezas = [_l([(130, 420), (130, 150)], "#8d96a2", 38), _p([(28, 30), (232, 30), (232, 160), (28, 160)], "#2d2a30", True, brillo=True)]
    piezas += [_l([(48, y), (212, y)], "#5d5964", 8) for y in (58, 84, 110, 136)]
    return 260, 420, 0.12, piezas


def _modulo_abs(giro: float):
    xs = (90, 150, 210, 270)
    piezas = [_l([(x, 50), (x, 10)], "#b8782e", 14) for x in xs]
    piezas += [_p([(40, 50), (300, 50), (300, 250), (40, 250)], "#7b8594", True, brillo=True),
               _p([(40, 50), (300, 50), (300, 80), (40, 80)], "#9aa4b2", True),
               _p([(300, 100), (394, 100), (394, 200), (300, 200)], "#3d434d", True, brillo=True),
               _p([(394, 128), (418, 128), (418, 172), (394, 172)], "#22201e", True),
               _p([(86, 118), (254, 118), (254, 206), (86, 206)], "#a9b3c0", True),
               _l([(106, 148), (234, 148)], "#6f7886", 9), _l([(106, 174), (200, 174)], "#6f7886", 9)]
    piezas += [_e(x, 50, 15, "#d9a441") for x in xs]
    piezas += [_e(x, y, 8, "#59606b") for x in (62, 278) for y in (100, 230)]
    return 420, 300, 0.25, piezas


OBJETOS: dict[str, Callable[[float], tuple]] = {
    "carro": _carro, "llanta": _llanta, "cono": _cono, "disco": _disco, "pedal": _pedal, "modulo_abs": _modulo_abs,
}
GIRO_POR_DEFECTO = {"carro": 2.2, "llanta": 1.0, "disco": 1.0}


def objeto(ref: str, giro: float | None = None) -> dict:
    """{"partes", "aspecto", "metros"} del objeto `ref`. `giro`: vueltas por segundo de sus ruedas (None = el normal; 0 = detenidas)."""
    ancho, alto, metros, piezas = OBJETOS[ref](GIRO_POR_DEFECTO.get(ref, 1.0) if giro is None else giro)
    return {"partes": _normalizar(piezas, ancho, alto), "aspecto": round(ancho / alto, 4), "metros": metros}
