"""Escenas procedurales (plantilla/primitivas.js): esquema único, validación estricta y escena de respaldo.

El LLM gratis describe cada escena como un dict {fondo, camara, capas}. Aquí se limpia: tipos desconocidos fuera,
números recortados a su rango, textos acortados, colores verificados. Lo que no tiene arreglo se informa en
`problemas` para que la IA rehaga la escena; si sigue mal, `respaldo()` da una escena viva armada en código.
"""

from __future__ import annotations

import base64
import math
import random
import re
from pathlib import Path
from typing import Any

COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
TEMAS = ["oscuro", "mar", "piel", "tejido", "claro", "neutro", "atardecer", "cielo", "bosque", "interior"]
UNIDADES = ["µm", "mm", "m", "km"]
MODELOS = ["pez", "hormiga", "bacteria", "virus", "neurona", "celula", "persona", "ave", "planta", "gota", "moneda",
           "engranaje", "planeta", "sol", "corazon", "llama", "chip", "bateria",
           "estomago", "pulmon", "cerebro", "ojo", "hueso", "rata", "gato", "pulpo"]
MUNDO = 1e7  # límite de coordenadas del mundo (en la unidad de la escena)

# Piezas de un personaje (coordenadas locales: la figura mide ~1 de largo, centrada en 0,0, y hacia abajo).
LOCAL = 2.0
MAX_PARTES = 40
MOVS = ["oscilar", "flotar", "pulsar", "girar", "ondular"]
PARTE_COMUN = {
    "color": ("color", 0, 0, True, ""), "borde": ("color", 0, 0, False, ""), "grosor": ("num", .002, 1, False, "borde o línea"),
    "opacidad": ("num", 0, 1, False, ""), "brillo": ("bool", 0, 0, False, "volumen con luz"),
}
PARTES: dict[str, dict[str, tuple]] = {
    "elipse": {"x": ("num", -LOCAL, LOCAL, True, ""), "y": ("num", -LOCAL, LOCAL, True, ""), "rx": ("num", .003, LOCAL, True, ""),
               "ry": ("num", .003, LOCAL, False, ""), "rot": ("num", -6.3, 6.3, False, "radianes")},
    "poligono": {"puntos": ("puntos", 3, 24, True, "[[x,y],...]"), "suave": ("bool", 0, 0, False, "curvas en vez de esquinas")},
    "linea": {"puntos": ("puntos", 2, 12, True, "[[x,y],...]"), "suave": ("bool", 0, 0, False, "")},
    "ojo": {"x": ("num", -LOCAL, LOCAL, True, ""), "y": ("num", -LOCAL, LOCAL, True, ""), "r": ("num", .003, .5, True, "")},
}
MOV = {"tipo": ("enum", MOVS, 0, True, ""), "amp": ("num", 0, 2, False, "oscilar: radianes; flotar/ondular: distancia; pulsar: fracción"),
       "vel": ("num", 0, 6, False, "ciclos/s"), "fase": ("num", 0, 10, False, ""), "px": ("num", -LOCAL, LOCAL, False, "pivote"),
       "py": ("num", -LOCAL, LOCAL, False, "")}

# Parámetro: (clase, mínimo, máximo, obligatorio, descripción breve para el prompt)
#   clases: num, int, bool, color, texto (máx = caracteres), enum (mín = opciones), zona {x,y,r,ry?},
#           puntos [[x,y]...] (mín/máx = cantidad), numeros [n...], textos [s...], muerte {x,y,r,desde,dur}
COMUNES = {"desde": ("num", 0, 300, False, "segundo en que aparece"), "hasta": ("num", 0, 300, False, "segundo en que se va"),
           "profundidad": ("num", 0, 1, False, "solo capas de mundo: 0 cerca, 1 lejana (más tenue, borrosa y se mueve menos que la cámara)")}
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
    "rejilla": {
        "x": ("num", -MUNDO, MUNDO, True, "esquina izquierda"), "y": ("num", -MUNDO, MUNDO, True, "esquina superior"),
        "ancho": ("num", 1, MUNDO, True, ""), "alto": ("num", 1, MUNDO, True, ""), "paso": ("num", .1, MUNDO, True, "separación entre puntos"),
        "tam": ("num", .01, MUNDO, True, "radio de cada punto"), "color": ("color", 0, 0, True, ""), "colorPulso": ("color", 0, 0, False, "color de la ola"),
        "velocidad": ("num", 0, 5, False, "ola, ciclos/s"), "semilla": ("int", 0, 9999, False, ""),
    },
    "anillos": {
        "x": ("num", -MUNDO, MUNDO, True, "centro"), "y": ("num", -MUNDO, MUNDO, True, ""), "r": ("num", .1, MUNDO, True, "radio máximo"),
        "ry": ("num", .1, MUNDO, False, "radio vertical"), "n": ("int", 1, 8, False, "anillos a la vez"), "color": ("color", 0, 0, True, ""),
        "periodo": ("num", .5, 20, False, "segundos por ciclo"), "grosor": ("num", .01, MUNDO, False, ""),
    },
    "torres": {
        "x": ("num", -MUNDO, MUNDO, True, "esquina izquierda"), "y": ("num", -MUNDO, MUNDO, True, "línea de base"),
        "ancho": ("num", 1, MUNDO, True, "ancho total"), "alto": ("num", 1, MUNDO, True, "altura de la más alta"), "n": ("int", 2, 24, True, "columnas"),
        "color": ("color", 0, 0, True, ""), "colorResalte": ("color", 0, 0, False, ""), "resaltar": ("int", 0, 23, False, "índice"),
        "alturas": ("numeros", 2, 24, False, "0..1 de 'alto' por columna"), "duracion": ("num", .3, 20, False, ""), "semilla": ("int", 0, 9999, False, ""),
    },
    "personaje": {  # diseñado por la IA con piezas (ver PARTES) o tomado del reparto del video con "ref"
        "x": ("num", -MUNDO, MUNDO, True, ""), "y": ("num", -MUNDO, MUNDO, True, ""), "tam": ("num", .1, MUNDO, True, "largo del personaje"),
        "partes": ("partes", 1, MAX_PARTES, False, "piezas de atrás hacia adelante"), "ref": ("texto", 1, 30, False, "nombre de un personaje del reparto"),
        "angulo": ("num", -360, 360, False, "grados"), "espejo": ("bool", 0, 0, False, "mirar a la izquierda"),
        "ruta": ("puntos", 1, 12, False, "[[x,y],...] viaja por aquí"), "duracionRuta": ("num", .3, 60, False, ""),
        "fase": ("num", 0, 100, False, "desfase de su movimiento"),
    },
    "sprite": {  # ilustración recortada del sujeto de la escena (la arma el código, no la IA de animación): ver escena_sujeto
        "imagen": ("texto", 1, 80, False, "ruta del PNG recortado"),
        "partes": ("partes", 1, MAX_PARTES, False, "objeto vectorial: piezas de 1 de ancho (ver src/objetos.py)"),
        "aspecto": ("num", .05, 20, False, "ancho/alto del objeto vectorial"), "sombra": ("bool", 0, 0, False, "sombra plana en el suelo"), "x": ("num", -MUNDO, MUNDO, True, ""), "y": ("num", -MUNDO, MUNDO, True, ""),
        "ancho": ("num", 1e-6, MUNDO, True, "ancho en unidades del mundo"), "mov": ("enum", ["flotar", "oscilar", "pulsar", "girar"], 0, False, ""),
        "amp": ("num", 0, .3, False, ""), "vel": ("num", 0, 3, False, "ciclos/s"), "fase": ("num", 0, 10, False, ""),
        "angulo": ("num", -360, 360, False, "grados"), "espejo": ("bool", 0, 0, False, ""),
        "fondo": ("bool", 0, 0, False, "telón de fondo: sin sombra ni entrada"),
        "ruta": ("puntos", 1, 12, False, "[[x,y],...] viaja por aquí"), "duracionRuta": ("num", .3, 60, False, ""),
        "orienta": ("bool", 0, 0, False, "mira hacia donde avanza"),
    },
    # ---- paisajes planos hechos en código (los arma historia.py; la IA de animación no los usa) ----
    "colinas": {
        "x": ("num", -MUNDO, MUNDO, True, ""), "y": ("num", -MUNDO, MUNDO, True, "horizonte"), "ancho": ("num", 1e-6, MUNDO, True, ""),
        "alto": ("num", 1e-6, MUNDO, True, ""), "n": ("int", 1, 12, False, "lomas"), "color": ("color", 0, 0, True, ""),
        "semilla": ("int", 0, 9999, False, ""),
    },
    "carretera": {
        "x": ("num", -MUNDO, MUNDO, True, ""), "y": ("num", -MUNDO, MUNDO, True, "borde superior"), "ancho": ("num", 1e-6, MUNDO, True, ""),
        "alto": ("num", 1e-6, MUNDO, True, ""), "color": ("color", 0, 0, True, ""), "colorLinea": ("color", 0, 0, False, ""),
        "linea": ("bool", 0, 0, False, "false: sin raya central (suelo de campo, bosque o interior)"),
    },
    "siluetas": {
        "x": ("num", -MUNDO, MUNDO, True, ""), "y": ("num", -MUNDO, MUNDO, True, "base"), "ancho": ("num", 1e-6, MUNDO, True, ""),
        "alto": ("num", 1e-6, MUNDO, True, ""), "forma": ("enum", ["arbol", "pino", "poste", "nube"], 0, True, ""),
        "n": ("int", 1, 80, True, ""), "color": ("color", 0, 0, True, ""), "semilla": ("int", 0, 9999, False, ""),
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
MAX_PUNTOS = 2500  # por rejilla
MAX_CELULAS = 1500  # por campo: pocas células, grandes y legibles, en vez de una alfombra de miles
CELULARES = {"campoCelulas", "vaso", "estratos"}  # solo tienen sentido si la escena trata de células, tejido o sangre
# Palabras que hacen que una escena pueda llevar células. Se busca en la narración y en lo que debe mostrar.
CONTEXTO_CELULAR = re.compile(
    r"c[eé]lula|tejido|sangre|sangu[ií]ne|capilar|gl[oó]bul|plaqueta|piel|dermis|m[uú]scul|neurona|nervio|bacteria|virus|"
    r"infecci|inmun|microb|org[aá]nul|\badn\b|tumor|c[aá]ncer|herida|cicatri|esponja|embri|organismo", re.I)


def contexto_celular(texto: str) -> bool:
    """¿La escena habla de algo celular? Si no, campoCelulas, vaso y estratos solo la llenarían de relleno."""
    return bool(CONTEXTO_CELULAR.search(texto or ""))


def _norm_ref(v: Any) -> str:
    """Nombre de un personaje del reparto, sin mayúsculas ni espacios de más."""
    return " ".join(v.lower().split()) if isinstance(v, str) else ""


def reparto_valido(reparto: Any) -> tuple[dict[str, list], list[str]]:
    """Limpia el reparto del video {nombre: [piezas]} que diseñó la IA. Devuelve (reparto limpio, problemas)."""
    if not isinstance(reparto, dict):
        return {}, ["el reparto debe ser un objeto {nombre: [piezas]}"]
    limpio, problemas = {}, []
    for nombre, v in reparto.items():
        partes, av = _partes(v.get("partes") if isinstance(v, dict) else v, f"personaje '{nombre}'")
        problemas += av
        if partes:
            limpio[_norm_ref(nombre)] = partes
    return limpio, problemas


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


def _parte(q: Any, j: int, pref: str) -> tuple[dict | None, list[str]]:
    """Una pieza de personaje: forma conocida, campos recortados a su rango, movimiento válido."""
    if not isinstance(q, dict) or q.get("forma") not in PARTES:
        return None, [f"{pref} pieza {j}: forma desconocida {q.get('forma') if isinstance(q, dict) else q!r} (elipse, poligono, linea, ojo)"]
    out, avisos = {"forma": q["forma"]}, []
    spec = PARTES[q["forma"]] if q["forma"] == "ojo" else {**PARTES[q["forma"]], **PARTE_COMUN}
    for k, (clase, mn, mx, req, _) in spec.items():
        if k not in q:
            if req:
                return None, [f"{pref} pieza {j} ({q['forma']}): falta '{k}'"]
            continue
        val, aviso = _limpiar(clase, mn, mx, q[k])
        if val is None:
            if req:
                return None, [f"{pref} pieza {j} ({q['forma']}).{k}: {aviso}"]
            avisos.append(f"{pref} pieza {j}.{k}: {aviso}, se ignora")
            continue
        if clase == "puntos":  # recorta cada punto al rango local
            val = [[min(max(x, -LOCAL), LOCAL), min(max(y, -LOCAL), LOCAL)] for x, y in val]
        out[k] = val
    if isinstance(q.get("mov"), dict):
        mov = {}
        for k, (clase, mn, mx, req, _) in MOV.items():
            if k in q["mov"]:
                val, _aviso = _limpiar(clase, mn, mx, q["mov"][k])
                if val is not None:
                    mov[k] = val
        if "tipo" in mov:
            out["mov"] = mov
        else:
            avisos.append(f"{pref} pieza {j}: movimiento sin tipo válido ({', '.join(MOVS)}), se ignora")
    return out, avisos


def _partes(v: Any, pref: str) -> tuple[list | None, list[str]]:
    if not isinstance(v, list) or not v:
        return None, [f"{pref}: 'partes' debe ser una lista de piezas"]
    partes, avisos = [], []
    for j, q in enumerate(v[:MAX_PARTES]):
        pieza, av = _parte(q, j, pref)
        avisos += av
        if pieza:
            partes.append(pieza)
    if not partes:
        return None, avisos or [f"{pref}: ninguna pieza válida"]
    return partes, avisos


def _capa(c: Any, i: int, reparto: dict | None = None) -> tuple[dict | None, list[str]]:
    if isinstance(c, dict) and c.get("tipo") == "personaje" and "partes" not in c:
        ref = _norm_ref(c.get("ref"))
        if ref and reparto and ref in reparto:
            c = {**c, "partes": reparto[ref]}
        else:
            return None, [f"capa {i} (personaje): falta 'partes' o 'ref' de un personaje del reparto" +
                          (f" ('{c.get('ref')}' no existe; hay: {', '.join(reparto)})" if reparto else "")]
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
        if clase == "partes":
            val, av = _partes(c[k], f"capa {i} (personaje)")
            avisos += av
            aviso = None if val else "sin piezas válidas"
        else:
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
    if tipo == "rejilla":  # tope de puntos por rendimiento: se separan más
        n = (out["ancho"] / out["paso"] + 1) * (out["alto"] / out["paso"] + 1)
        if n > MAX_PUNTOS:
            out["paso"] *= (n / MAX_PUNTOS) ** .5
            avisos.append(f"capa {i}: {n:.0f} puntos, se separan más")
    if tipo == "torres" and "alturas" in out:
        out["alturas"] = [min(h, 1.0) for h in out["alturas"]]
    if tipo == "numero" and "texto" not in out and "contar" not in out:
        return None, [f"capa {i} (numero): falta 'texto' o 'contar'"]
    return out, avisos


def validar(prim: Any, celulas: bool = True, reparto: dict | None = None) -> tuple[dict | None, list[str]]:
    """Limpia una escena del LLM. Devuelve (escena válida o None, problemas). Recortes menores no invalidan.
    `celulas=False` (la escena no habla de células ni tejido): se quitan campoCelulas, vaso y estratos. Con `celulas=True`
    se deja un solo campoCelulas por escena."""
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
        limpia, avisos = _capa(c, i, reparto)
        (graves if limpia is None else problemas).extend(avisos)
        if limpia:
            capas.append(limpia)
    problemas += graves
    filtradas, campos = [], 0
    for c in capas:
        if c["tipo"] in CELULARES and not celulas:
            problemas.append(f"'{c['tipo']}' no va en esta escena: no trata de células ni tejido; muestra el tema con figura, red, "
                             "corriente, onda, orbita, grafica, dial o ramas")
            continue
        if c["tipo"] == "campoCelulas":
            campos += 1
            if campos > 1:
                problemas.append("más de un campoCelulas en la escena: se deja solo el primero")
                continue
        filtradas.append(c)
    capas = filtradas
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
        if tipo in ("sprite", "colinas", "carretera", "siluetas"):
            continue  # los arma el código (historia.py); la IA de animación no los usa
        partes = []
        for k, (clase, mn, mx, req, desc) in spec.items():
            rango = (f"{'|'.join(mn)}" if clase == "enum" else f"{mn:g}..{mx:g}" if clase in ("num", "int") and abs(mx) < MUNDO
                     else f"≤{mx} car." if clase == "texto" else clase)
            partes.append(f"{k}{'' if req else '?'}:{rango}" + (f" ({desc})" if desc else ""))
        lineas.append(f"- {tipo}{' [pantalla]' if tipo in PANTALLA else ''}: " + "; ".join(partes))
    extras = lambda spec: "; ".join(f"{k}{'' if req else '?'}" + (f" ({d})" if d else "") for k, (_, _, _, req, d) in spec.items())
    lineas.append("  Piezas de 'partes' (coordenadas locales: el personaje mide ~1 de largo, centrado en 0,0, y hacia abajo; van de atrás hacia adelante):")
    for forma, spec in PARTES.items():
        lineas.append(f"    · forma \"{forma}\": " + extras(spec if forma == "ojo" else {**spec, **PARTE_COMUN}))
    lineas.append("    · movimiento propio de cualquier pieza, mov {" + extras(MOV) + "} con tipo: " + "|".join(MOVS))
    return "\n".join(lineas)


def respaldo(texto: str, color: str = "#5dff9c", tema: str = "oscuro", semilla: int | None = None, celulas: bool = False) -> dict:
    """Escena viva armada en código cuando la IA no logra una válida: fondo lejano (células dispersas si el tema es celular,
    rejilla con ola si no) + red con pulsos + anillos + partículas + cifra o frase."""
    semilla = semilla if semilla is not None else random.randint(1, 9999)
    fondo = ({"tipo": "campoCelulas", "x": -1300, "y": -950, "ancho": 2600, "alto": 2000, "radio": 90, "color": color, "densidad": .45,
              "desde": 0, "profundidad": .6, "semilla": semilla + 2} if celulas else
             {"tipo": "rejilla", "x": -1300, "y": -950, "ancho": 2600, "alto": 2000, "paso": 90, "tam": 4, "color": color,
              "desde": 0, "profundidad": .75, "semilla": semilla + 2})
    capas: list[dict] = [
        fondo,
        {"tipo": "anillos", "x": 0, "y": 40, "r": 520, "ry": 400, "n": 3, "color": color, "periodo": 4, "grosor": 3, "desde": 0},
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


FONDO_PROFUNDIDAD = 0.75  # cuánto se aleja el fondo (0 cerca, 1 lejano)
TEXTURAS_DE_FONDO = {"campoCelulas", "rejilla", "estratos"}


def con_fondo_lejano(escena: dict, color: str, celulas: bool, semilla: int = 1) -> dict:
    """Añade, detrás de todo, un fondo lejano y borroso (células dispersas si el tema es celular, rejilla con una ola de luz si no)
    a las escenas que no tienen ya una textura de fondo. Se hizo porque las escenas con un solo protagonista sobre fondo liso
    se veían vacías y sin detalle. Es determinista (sin IA) y se dimensiona con la cámara de la escena: las unidades cambian
    mucho de una escena a otra (8 en una, 500 en otra), así que cubre lo que la cámara con paralaje puede ver en cada clave."""
    capas = escena.get("capas", [])
    if any(c["tipo"] in TEXTURAS_DE_FONDO for c in capas):
        return escena
    claves = escena["camara"]
    base, q = claves[0], 0.45 * FONDO_PROFUNDIDAD   # la misma cámara con paralaje que usa el motor para las capas lejanas
    vistas = []
    for k in claves:
        ancho = math.exp((1 - q) * math.log(k["ancho"]) + q * math.log(base["ancho"]))
        vistas.append((base["x"] + (k["x"] - base["x"]) * (1 - q), base["y"] + (k["y"] - base["y"]) * (1 - q), ancho))
    x0 = min(x - a * .6 for x, _, a in vistas); x1 = max(x + a * .6 for x, _, a in vistas)
    y0 = min(y - a * 1.0 for _, y, a in vistas); y1 = max(y + a * 1.0 for _, y, a in vistas)   # el lienzo es 1,78 veces más alto que ancho
    menor = min(a for _, _, a in vistas)
    capa = ({"tipo": "campoCelulas", "x": x0, "y": y0, "ancho": x1 - x0, "alto": y1 - y0, "radio": menor / 10, "color": color,
             "densidad": .45, "desde": 0, "profundidad": FONDO_PROFUNDIDAD, "semilla": semilla + 2} if celulas else
            {"tipo": "rejilla", "x": x0, "y": y0, "ancho": x1 - x0, "alto": y1 - y0, "paso": menor / 9, "tam": menor / 180, "color": color,
             "desde": 0, "profundidad": FONDO_PROFUNDIDAD, "semilla": semilla + 2})
    limpia, _ = _capa(capa, 0)
    if limpia:
        escena["capas"] = [limpia, *capas]
    return escena


def _centro_mundo(capas: list[dict]) -> tuple[float, float] | None:
    """Centro aproximado de lo dibujado en el mundo (promedio de los anclajes de las capas de mundo)."""
    pts = []
    for c in capas:
        t = c["tipo"]
        if t in PANTALLA or t == "estratos":  # estratos cruzan todo el ancho: no dicen dónde está el protagonista
            continue
        if t in ("campoCelulas", "rejilla"):
            pts.append((c["x"] + c["ancho"] / 2, c["y"] + c["alto"] / 2))
        elif t == "torres":
            pts.append((c["x"] + c["ancho"] / 2, c["y"] - c["alto"] / 2))
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


# ---------- escena con un sujeto ilustrado ----------
SUJETO_PX = 780   # tamaño máximo del sujeto en pantalla al empezar la escena (zona de dibujo: 560-1180 de alto, 870 de ancho)
MOVS_SUJETO = [("flotar", .035), ("oscilar", .05), ("pulsar", .03)]


def _unidad_mundo(metros: float | None) -> tuple[str, float]:
    """(unidad de la barra de escala, metros por unidad) adecuada al tamaño real del sujeto."""
    if metros and 1e-7 <= metros <= 1e5:
        for unidad, m in (("km", 1e3), ("m", 1.0), ("mm", 1e-3), ("µm", 1e-6)):
            if metros >= m:
                return unidad, m
        return "µm", 1e-6
    return "m", 1.0


def _ambiente_con_contraste(ambiente: str, luz: float | None) -> str:
    """Un sujeto oscuro se pierde sobre un fondo oscuro (y uno claro sobre uno claro): se cambia el fondo del tema."""
    if luz is not None and luz < 85 and ambiente in ("oscuro", "mar", "tejido"):
        return "neutro"
    if luz is not None and luz > 190 and ambiente == "claro":
        return "oscuro"
    return ambiente


def escena_frase(texto: str, ambiente: str, color: str, indice: int, dur: float) -> dict:
    """Escena de texto: la frase clave sobre un fondo de rejilla con cámara lenta. Se usa cuando no hubo una imagen fiel de la escena:
    es mejor decir la idea con palabras que mostrar un dibujo que no corresponde."""
    vista = 1200.0
    fin = max(dur * 1.3, 4.0)
    camara = [{"t": 0, "x": 0, "y": 0, "ancho": vista * 1.05}, {"t": fin, "x": 0, "y": 0, "ancho": vista}]
    palabras = texto.split()
    capas = [{"tipo": "frase", "texto": " ".join(palabras[:6])[:60], "desde": .2, "color": color}]
    escena, _ = validar({"fondo": {"tema": ambiente if ambiente in TEMAS else "oscuro"}, "escala": False, "camara": camara,
                         "capas": [{"tipo": "particulas", "x": 0, "y": 0, "r": 500, "n": 120, "tam": 2.5, "color": color, "duracion": 5,
                                    "desde": 0, "semilla": indice + 1}, *capas]}, celulas=False)
    return con_fondo_lejano(escena, color, False, indice + 1)


def escena_sujeto(imagen: str, aspecto: float, ambiente: str, color: str, indice: int, dur: float, metros: float | None = None,
                  rotulo: str = "", numero: dict | None = None, luz: float | None = None, telon: str | None = None) -> dict:
    """Escena animada alrededor de un sujeto ilustrado (PNG recortado, aspecto = ancho/alto): fondo del tema del contexto
    (piel, mar, oscuro...), rejilla lejana con paralaje, el sujeto grande y centrado que respira o se mece mientras la cámara
    se acerca, se desplaza o se aleja (según el índice), rótulo, cifra y barra de escala con su tamaño real. La composición la fija el
    código: la IA solo aporta el sujeto, así lo que se ve siempre es lo que dice la voz."""
    px = min(SUJETO_PX, SUJETO_PX * aspecto)                 # ancho del sujeto en pantalla al empezar
    unidad, m_por_u = _unidad_mundo(metros)
    ancho = (metros / m_por_u) if metros and 1e-7 <= metros <= 1e5 else 1000.0
    alto = ancho / aspecto
    vista = ancho * 1080 / px                                # ancho de mundo visible al empezar: el sujeto mide `px`
    fin = max(dur * 1.3, 4.0)
    movimiento = indice % 3
    if movimiento == 0:                                      # acercarse
        camara = [{"t": 0, "x": 0, "y": 0, "ancho": vista}, {"t": fin, "x": 0, "y": 0, "ancho": vista / 1.14}]
    elif movimiento == 1:                                    # recorrer de lado a lado
        camara = [{"t": 0, "x": -.06 * vista, "y": 0, "ancho": vista * 1.03}, {"t": fin, "x": .06 * vista, "y": 0, "ancho": vista / 1.08}]
    else:                                                    # alejarse
        camara = [{"t": 0, "x": 0, "y": 0, "ancho": vista / 1.14}, {"t": fin, "x": 0, "y": 0, "ancho": vista * 1.02}]
    mov, amp = MOVS_SUJETO[indice % len(MOVS_SUJETO)]
    capas: list[dict] = []
    if telon:  # entorno desenfocado y lejano (se mueve menos que el sujeto cuando la cámara se desplaza): da profundidad
        capas.append({"tipo": "sprite", "imagen": telon, "x": 0, "y": 0, "ancho": vista * 2.4, "fondo": True, "profundidad": .6, "desde": 0})
    capas.append({"tipo": "sprite", "imagen": imagen, "x": 0, "y": 0, "ancho": ancho, "mov": mov, "amp": amp,
                  "vel": .3 + .05 * (indice % 3), "fase": (indice * .37) % 1, "desde": 0})
    if rotulo.strip():
        lado = 1 if indice % 2 == 0 else -1
        capas.append({"tipo": "etiqueta", "texto": rotulo.strip().upper()[:18], "x": lado * .2 * ancho, "y": -.22 * alto,
                      "dx": lado * 120, "dy": -170, "color": color, "desde": .8})
    if numero and numero.get("valor"):
        capas.append({"tipo": "numero", "texto": str(numero["valor"])[:6], "sub": str(numero.get("texto", ""))[:24], "desde": .6, "color": color})
    ambiente = _ambiente_con_contraste(ambiente if ambiente in TEMAS else "oscuro", luz)
    escena, _ = validar({"fondo": {"tema": ambiente}, "unidad": unidad,
                         "escala": bool(metros and 1e-7 <= metros <= 1e5), "camara": camara, "capas": capas}, celulas=False)
    return escena if telon else con_fondo_lejano(escena, color, False, indice + 1)


def con_imagenes(raiz: Path, escena: dict) -> dict:
    """La escena con las imágenes de sus sprites incrustadas como data URI (`src`): autocontenida, lista para el motor del navegador.
    `raiz`: carpeta del proyecto donde están las rutas relativas de las imágenes."""
    if not any(c["tipo"] == "sprite" and c.get("imagen") for c in escena["capas"]):
        return escena
    mime = lambda ruta: {"png": "image/png", "svg": "image/svg+xml"}.get(ruta.rsplit(".", 1)[-1], "image/jpeg")
    return {**escena, "capas": [
        {**c, "src": f"data:{mime(c['imagen'])};base64," + base64.b64encode((raiz / c["imagen"]).read_bytes()).decode()}
        if c["tipo"] == "sprite" and c.get("imagen") else c for c in escena["capas"]]}
