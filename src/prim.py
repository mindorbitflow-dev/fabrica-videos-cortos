"""Escenas procedurales (plantilla/primitivas.js): esquema único, validación estricta y escena de respaldo.

El LLM gratis describe cada escena como un dict {fondo, camara, capas}. Aquí se limpia: tipos desconocidos fuera,
números recortados a su rango, textos acortados, colores verificados. Lo que no tiene arreglo se informa en
`problemas` para que la IA rehaga la escena; si sigue mal, `respaldo()` da una escena viva armada en código.
"""

from __future__ import annotations

import random
import re
from typing import Any

COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
TEMAS = ["oscuro", "mar", "piel", "tejido", "claro"]
UNIDADES = ["µm", "mm", "m", "km"]
MODELOS = ["pez", "hormiga", "bacteria", "virus", "neurona", "celula", "persona", "ave", "planta", "gota", "moneda",
           "engranaje", "planeta", "sol", "corazon", "llama", "chip", "bateria",
           "estomago", "pulmon", "cerebro", "ojo", "hueso", "rata", "gato", "pulpo"]
MUNDO = 1e7  # límite de coordenadas del mundo (en la unidad de la escena)

# Parámetro: (clase, mínimo, máximo, obligatorio, descripción breve para el prompt)
#   clases: num, int, bool, color, texto (máx = caracteres), enum (mín = opciones), zona {x,y,r,ry?},
#           puntos [[x,y]...] (mín/máx = cantidad), numeros [n...], textos [s...], muerte {x,y,r,desde,dur}
COMUNES = {"desde": ("num", 0, 300, False, "segundo en que aparece"), "hasta": ("num", 0, 300, False, "segundo en que se va")}
TIPOS: dict[str, dict[str, tuple]] = {
    "campoCelulas": {
        "x": ("num", -MUNDO, MUNDO, True, "esquina izquierda"), "y": ("num", -MUNDO, MUNDO, True, "esquina superior"),
        "ancho": ("num", 1, MUNDO, True, ""), "alto": ("num", 1, MUNDO, True, ""), "radio": ("num", .1, MUNDO, True, "radio de cada célula"),
        "color": ("color", 0, 0, True, ""), "colorNucleo": ("color", 0, 0, False, ""), "nucleo": ("bool", 0, 0, False, ""),
        "densidad": ("num", .3, 1, False, "fracción de huecos ocupados"), "aparicion": ("enum", ["onda"], 0, False, "aparecen en ola"),
        "semilla": ("int", 0, 9999, False, ""), "muerte": ("muerte", 0, 0, False, "{x,y,r,desde,dur}: revientan las de ese círculo"),
    },
    "estratos": {
        "x": ("num", -MUNDO, MUNDO, True, ""), "y": ("num", -MUNDO, MUNDO, True, "borde superior"), "alto": ("num", 1, MUNDO, True, ""),
        "lineas": ("int", 2, 30, True, ""), "color": ("color", 0, 0, True, ""), "onda": ("num", 0, MUNDO, True, "amplitud de la ondulación"),
        "semilla": ("int", 0, 9999, False, ""),
    },
    "vaso": {
        "puntos": ("puntos", 2, 12, True, "[[x,y],...] recorrido"), "grosor": ("num", .1, MUNDO, True, ""), "color": ("color", 0, 0, True, "pared"),
        "colorCelulas": ("color", 0, 0, False, ""), "celulas": ("int", 0, 200, False, ""), "velocidad": ("num", 0, MUNDO, False, "unidades/s"),
        "semilla": ("int", 0, 9999, False, ""),
    },
    "enjambre": {
        "n": ("int", 1, 200, True, ""), "origen": ("zona", 0, 0, True, "{x,y,r,ry?}"), "destino": ("zona", 0, 0, True, "{x,y,r,ry?}"),
        "radio": ("num", .1, MUNDO, True, "tamaño de cada agente"), "color": ("color", 0, 0, True, ""), "colorNucleo": ("color", 0, 0, False, ""),
        "duracion": ("num", .5, 60, False, "segundos del viaje"), "ocultarAntes": ("bool", 0, 0, False, ""), "semilla": ("int", 0, 9999, False, ""),
    },
    "particulas": {
        "x": ("num", -MUNDO, MUNDO, True, "centro"), "y": ("num", -MUNDO, MUNDO, True, ""), "r": ("num", .1, MUNDO, True, "radio final"),
        "n": ("int", 1, 600, True, ""), "tam": ("num", .01, MUNDO, True, "tamaño de cada partícula"), "color": ("color", 0, 0, True, ""),
        "duracion": ("num", .2, 60, False, "segundos en difundirse"), "semilla": ("int", 0, 9999, False, ""),
    },
    "forma": {
        "x": ("num", -MUNDO, MUNDO, True, ""), "y": ("num", -MUNDO, MUNDO, True, ""), "rx": ("num", .1, MUNDO, True, ""),
        "ry": ("num", .1, MUNDO, False, ""), "color": ("color", 0, 0, True, ""), "opacidad": ("num", 0, 1, False, ""),
        "brillo": ("bool", 0, 0, False, ""), "crece": ("bool", 0, 0, False, ""),
    },
    "figura": {
        "modelo": ("enum", MODELOS, 0, True, "dibujo hecho en código"), "x": ("num", -MUNDO, MUNDO, True, ""), "y": ("num", -MUNDO, MUNDO, True, ""),
        "tam": ("num", .1, MUNDO, True, "largo de la figura"), "angulo": ("num", -360, 360, False, "grados"), "color": ("color", 0, 0, False, ""),
        "color2": ("color", 0, 0, False, ""), "espejo": ("bool", 0, 0, False, "mirar a la izquierda"),
        "ruta": ("puntos", 1, 12, False, "[[x,y],...] viaja por aquí"), "duracionRuta": ("num", .3, 60, False, ""),
        "nivel": ("num", 0, 1, False, "solo bateria"), "fase": ("num", 0, 100, False, "desfase de su movimiento"),
    },
    "red": {
        "x": ("num", -MUNDO, MUNDO, True, "centro"), "y": ("num", -MUNDO, MUNDO, True, ""), "r": ("num", .1, MUNDO, True, ""),
        "ry": ("num", .1, MUNDO, False, ""), "nodos": ("int", 3, 120, True, ""), "vecinos": ("int", 1, 5, False, ""),
        "color": ("color", 0, 0, True, ""), "colorNodo": ("color", 0, 0, False, ""), "pulsos": ("bool", 0, 0, False, "luces que viajan"),
        "grosor": ("num", .01, MUNDO, False, ""), "duracion": ("num", .3, 60, False, "segundos en crecer"), "semilla": ("int", 0, 9999, False, ""),
    },
    "ramas": {
        "x": ("num", -MUNDO, MUNDO, True, "raíz"), "y": ("num", -MUNDO, MUNDO, True, ""), "largo": ("num", .1, MUNDO, True, "primer tramo"),
        "angulo": ("num", -360, 360, False, "-90 = hacia arriba"), "niveles": ("int", 1, 7, False, ""), "apertura": ("num", .2, 2.5, False, ""),
        "color": ("color", 0, 0, True, ""), "grosor": ("num", .01, MUNDO, False, ""), "duracion": ("num", .3, 60, False, ""),
        "semilla": ("int", 0, 9999, False, ""),
    },
    "corriente": {
        "puntos": ("puntos", 2, 12, True, "[[x,y],...]"), "color": ("color", 0, 0, True, ""), "n": ("int", 1, 200, False, ""),
        "tam": ("num", .01, MUNDO, False, ""), "ancho": ("num", 0, MUNDO, False, "dispersión lateral"), "velocidad": ("num", 0, MUNDO, False, ""),
        "guia": ("bool", 0, 0, False, "línea punteada"), "flecha": ("bool", 0, 0, False, ""), "semilla": ("int", 0, 9999, False, ""),
    },
    "onda": {
        "x": ("num", -MUNDO, MUNDO, True, "inicio"), "y": ("num", -MUNDO, MUNDO, True, ""), "ancho": ("num", .1, MUNDO, True, ""),
        "amplitud": ("num", 0, MUNDO, True, ""), "longitud": ("num", .01, MUNDO, True, "longitud de onda"), "color": ("color", 0, 0, True, ""),
        "velocidad": ("num", 0, 10, False, "ciclos/s"), "grosor": ("num", .01, MUNDO, False, ""),
    },
    "orbita": {
        "x": ("num", -MUNDO, MUNDO, True, "centro"), "y": ("num", -MUNDO, MUNDO, True, ""), "r": ("num", .1, MUNDO, True, ""),
        "n": ("int", 1, 12, False, "cuerpos"), "tam": ("num", .01, MUNDO, False, ""), "color": ("color", 0, 0, True, ""),
        "periodo": ("num", .3, 60, False, "segundos por vuelta"), "inclinacion": ("num", .05, 1, False, ""), "giro": ("num", -3.2, 3.2, False, "radianes"),
    },
    # ---- capas de pantalla: posición fija dentro de la zona segura ----
    "etiqueta": {
        "texto": ("texto", 1, 18, True, "MAYÚSCULAS cortas"), "x": ("num", -MUNDO, MUNDO, True, "punto del mundo señalado"),
        "y": ("num", -MUNDO, MUNDO, True, ""), "dx": ("num", -500, 500, False, "px del texto respecto al punto"),
        "dy": ("num", -500, 500, False, ""), "color": ("color", 0, 0, False, ""),
    },
    "numero": {
        "texto": ("texto", 1, 6, False, "cifra gigante, ej. 60×"), "contar": ("contar", 0, 0, False, "{de,a,dur?} cuenta animada"),
        "sufijo": ("texto", 0, 4, False, ""), "sub": ("texto", 0, 24, False, "línea pequeña debajo"), "color": ("color", 0, 0, False, ""),
    },
    "cita": {"texto": ("texto", 1, 28, True, "Revista · año"), "sub": ("texto", 0, 50, False, "autores, institución")},
    "grafica": {
        "datos": ("numeros", 2, 8, True, "valores ≥ 0"), "etiquetas": ("textos", 0, 8, False, "≤6 caracteres c/u"),
        "tipo2": ("enum", ["barras", "linea"], 0, False, ""), "color": ("color", 0, 0, True, ""), "resaltar": ("int", 0, 7, False, "índice"),
        "colorResalte": ("color", 0, 0, False, ""), "valores": ("bool", 0, 0, False, ""), "duracion": ("num", .3, 20, False, ""),
    },
    "dial": {
        "valor": ("num", 0, 1, True, "posición final de la aguja"), "de": ("num", 0, 1, False, "posición inicial"),
        "min": ("texto", 0, 12, False, ""), "max": ("texto", 0, 12, False, ""), "color": ("color", 0, 0, False, ""),
        "duracion": ("num", .3, 20, False, ""),
    },
    "frase": {
        "texto": ("texto", 1, 60, True, "concepto sin dibujo, ≤6 palabras"), "resaltar": ("textos", 0, 3, False, "palabras en color"),
        "color": ("color", 0, 0, False, ""), "y": ("num", 300, 520, False, "px, siempre arriba del dibujo"),
    },
}
PANTALLA = {"etiqueta", "numero", "cita", "grafica", "dial", "frase"}
MAX_CELULAS = 12000


def _num(v: Any) -> float | None:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def _limpiar(clase: str, mn, mx, v: Any) -> tuple[Any, str | None]:
    """Devuelve (valor limpio o None si es inválido, aviso)."""
    if clase in ("num", "int"):
        n = _num(v)
        if n is None:
            return None, "no es un número"
        r = min(max(n, mn), mx)
        return (int(round(r)) if clase == "int" else r), (f"{n:g} fuera de [{mn:g}, {mx:g}]" if r != n else None)
    if clase == "bool":
        return (v, None) if isinstance(v, bool) else (None, "no es true/false")
    if clase == "color":
        return (v, None) if isinstance(v, str) and COLOR.match(v) else (None, "color inválido")
    if clase == "texto":
        if not isinstance(v, str) or len(v.strip()) < mn:
            return None, "texto vacío"
        v = " ".join(v.split())
        return v[:mx], (f"texto de {len(v)} caracteres (máx {mx})" if len(v) > mx else None)
    if clase == "enum":
        return (v, None) if v in mn else (None, f"'{v}' no es una opción ({', '.join(mn)})")
    if clase in ("zona", "muerte", "contar"):
        campos = {"zona": ("x", "y", "r"), "muerte": ("x", "y", "r", "desde"), "contar": ("de", "a")}[clase]
        if not isinstance(v, dict) or any(_num(v.get(k)) is None for k in campos):
            return None, f"debe ser {{{', '.join(campos)}}}"
        out = {k: _num(x) for k, x in v.items() if _num(x) is not None and k in campos + ("ry", "dur")}
        for k in ("r", "ry"):
            if k in out:
                out[k] = max(out[k], 1e-3)
        return out, None
    if clase == "puntos":
        if not isinstance(v, list) or not mn <= len(v) <= mx or any(
                not isinstance(p, list) or len(p) != 2 or _num(p[0]) is None or _num(p[1]) is None for p in v):
            return None, f"debe ser lista de {mn}-{mx} puntos [x,y]"
        return [[float(p[0]), float(p[1])] for p in v], None
    if clase == "numeros":
        if not isinstance(v, list) or not mn <= len(v) <= mx or any(_num(x) is None or x < 0 for x in v):
            return None, f"debe ser lista de {mn}-{mx} números ≥ 0"
        return [float(x) for x in v], None
    if clase == "textos":
        if not isinstance(v, list) or len(v) > mx or any(not isinstance(x, str) for x in v):
            return None, f"debe ser lista de hasta {mx} textos"
        return [x.strip()[:12] for x in v], None
    return None, "clase desconocida"


def _capa(c: Any, i: int) -> tuple[dict | None, list[str]]:
    if not isinstance(c, dict) or c.get("tipo") not in TIPOS:
        return None, [f"capa {i}: tipo desconocido {c.get('tipo') if isinstance(c, dict) else c!r}"]
    tipo = c["tipo"]
    spec = {**TIPOS[tipo], **COMUNES}
    out, avisos = {"tipo": tipo}, []
    for k, (clase, mn, mx, req, _) in spec.items():
        if k not in c:
            if req:
                return None, [f"capa {i} ({tipo}): falta '{k}'"]
            continue
        val, aviso = _limpiar(clase, mn, mx, c[k])
        if val is None:
            if req:
                return None, [f"capa {i} ({tipo}).{k}: {aviso}"]
            avisos.append(f"capa {i} ({tipo}).{k}: {aviso}, se ignora")
            continue
        if aviso:
            avisos.append(f"capa {i} ({tipo}).{k}: {aviso}, se recorta")
        out[k] = val
    if tipo == "campoCelulas":  # tope de células por rendimiento: se agranda el radio
        n = out["ancho"] * out["alto"] / (out["radio"] * 2.15) ** 2 / .87
        if n > MAX_CELULAS:
            out["radio"] *= (n / MAX_CELULAS) ** .5
            avisos.append(f"capa {i}: {n:.0f} células, se agranda el radio")
    if tipo == "numero" and "texto" not in out and "contar" not in out:
        return None, [f"capa {i} (numero): falta 'texto' o 'contar'"]
    return out, avisos


def validar(prim: Any) -> tuple[dict | None, list[str]]:
    """Limpia una escena del LLM. Devuelve (escena válida o None, problemas). Recortes menores no invalidan."""
    if not isinstance(prim, dict):
        return None, ["la escena no es un objeto JSON"]
    problemas: list[str] = []
    tema = (prim.get("fondo") or {}).get("tema") if isinstance(prim.get("fondo"), dict) else None
    out: dict = {"fondo": {"tema": tema if tema in TEMAS else "oscuro"}}
    if tema not in TEMAS:
        problemas.append(f"fondo.tema '{tema}' inválido, se usa oscuro")
    if prim.get("unidad") in UNIDADES:
        out["unidad"] = prim["unidad"]
    if isinstance(prim.get("escala"), bool):
        out["escala"] = prim["escala"]
    if _num(prim.get("grano")) is not None:
        out["grano"] = min(max(prim["grano"], 0), .15)

    claves = []
    for k in prim.get("camara") or []:
        if isinstance(k, dict) and all(_num(k.get(x)) is not None for x in ("t", "x", "y", "ancho")):
            claves.append({"t": min(max(k["t"], 0), 300), "x": min(max(k["x"], -MUNDO), MUNDO),
                           "y": min(max(k["y"], -MUNDO), MUNDO), "ancho": min(max(k["ancho"], 1e-3), MUNDO)})
    claves.sort(key=lambda k: k["t"])
    if not claves:
        return None, problemas + ["camara: hace falta al menos una clave {t, x, y, ancho}"]
    out["camara"] = claves[:8]

    capas, graves = [], []
    for i, c in enumerate((prim.get("capas") or [])[:24]):
        limpia, avisos = _capa(c, i)
        (graves if limpia is None else problemas).extend(avisos)
        if limpia:
            capas.append(limpia)
    problemas += graves
    if not any(c["tipo"] not in PANTALLA for c in capas) and not any(c["tipo"] in ("grafica", "dial") for c in capas):
        return None, problemas + ["la escena no tiene nada que dibujar (solo textos)"]
    # 'forma' es un acento (núcleo, roncha, gota). Pasó que la IA la usaba como disco gigante y borroso que tapaba
    # todo, incluso tras dos rondas de corrección: se limita en código a 22 % del ancho visible más estrecho.
    tope = 0.22 * min(k["ancho"] for k in claves)
    for c in capas:
        if c["tipo"] == "forma":
            for eje in ("rx", "ry"):
                if c.get(eje, 0) > tope:
                    problemas.append(f"forma de radio {c[eje]:g} recortada a {tope:g} (solo acentos pequeños)")
                    c[eje] = tope
    out["capas"] = capas
    return out, problemas


def describir() -> str:
    """Referencia compacta de las primitivas para el prompt del animador (generada del mismo ESQUEMA)."""
    lineas = []
    for tipo, spec in TIPOS.items():
        partes = []
        for k, (clase, mn, mx, req, desc) in spec.items():
            rango = (f"{'|'.join(mn)}" if clase == "enum" else f"{mn:g}..{mx:g}" if clase in ("num", "int") and abs(mx) < MUNDO
                     else f"≤{mx} car." if clase == "texto" else clase)
            partes.append(f"{k}{'' if req else '?'}:{rango}" + (f" ({desc})" if desc else ""))
        lineas.append(f"- {tipo}{' [pantalla]' if tipo in PANTALLA else ''}: " + "; ".join(partes))
    return "\n".join(lineas)


def respaldo(texto: str, color: str = "#5dff9c", tema: str = "oscuro", semilla: int | None = None) -> dict:
    """Escena viva armada en código cuando la IA no logra una válida: red con pulsos + partículas + cifra o frase."""
    semilla = semilla if semilla is not None else random.randint(1, 9999)
    capas: list[dict] = [
        {"tipo": "red", "x": 0, "y": 40, "r": 420, "ry": 320, "nodos": 46, "vecinos": 3, "color": color, "pulsos": True,
         "grosor": 4, "desde": 0, "duracion": 3, "semilla": semilla},
        {"tipo": "particulas", "x": 0, "y": 40, "r": 520, "n": 220, "tam": 2.5, "color": "#ffffff", "desde": 0,
         "duracion": 6, "semilla": semilla + 1},
    ]
    cifra = re.search(r"(\d[\d.,]*)\s*(%|×|veces\b)?", texto)
    if cifra:
        sufijo = {"veces": "×"}.get(cifra.group(2), cifra.group(2) or "")
        capas.append({"tipo": "numero", "texto": (cifra.group(1).rstrip(".,") + sufijo)[:6], "desde": .6, "color": color})
    else:
        palabras = texto.split()
        capas.append({"tipo": "frase", "texto": " ".join(palabras[:6])[:40], "desde": .3})
    escena, _ = validar({"fondo": {"tema": tema}, "escala": False,
                         "camara": [{"t": 0, "x": 0, "y": 0, "ancho": 1300}, {"t": 12, "x": 0, "y": 40, "ancho": 1050}],
                         "capas": capas})
    return escena


def _centro_mundo(capas: list[dict]) -> tuple[float, float] | None:
    """Centro aproximado de lo dibujado en el mundo (promedio de los anclajes de las capas de mundo)."""
    pts = []
    for c in capas:
        t = c["tipo"]
        if t in PANTALLA or t == "estratos":  # estratos cruzan todo el ancho: no dicen dónde está el protagonista
            continue
        if t == "campoCelulas":
            pts.append((c["x"] + c["ancho"] / 2, c["y"] + c["alto"] / 2))
        elif t in ("vaso", "corriente"):
            pts += [tuple(p) for p in c["puntos"]]
        elif t == "enjambre":
            pts.append((c["destino"]["x"], c["destino"]["y"]))
        elif "x" in c and "y" in c:
            pts.append((c["x"], c["y"]))
    if not pts:
        return None
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


def acercar(escena: dict, factor: float = 1.6) -> dict | None:
    """Copia de la escena con la cámara `factor` veces más cerca, hacia el centro de lo dibujado.
    Para escenas cuyo protagonista quedó pequeño y la IA no lo corrigió. Devuelve None si no hay qué acercar."""
    import copy
    nueva = copy.deepcopy(escena)
    centro = _centro_mundo(nueva.get("capas", []))
    if centro is None or factor <= 1:
        return None
    k = 1 - 1 / factor  # cuánto se desplaza cada clave hacia el centro: el punto central queda en el mismo lugar
    for clave in nueva["camara"]:
        clave["x"] += (centro[0] - clave["x"]) * k
        clave["y"] += (centro[1] - clave["y"]) * k
        clave["ancho"] = max(clave["ancho"] / factor, 1e-3)
    limpia, _ = validar(nueva)
    return limpia
