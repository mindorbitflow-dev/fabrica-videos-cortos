"""Ilustraciones vectoriales abiertas para lo común (animales, cuerpo, comida, objetos cotidianos): Fluent Emoji Flat (Microsoft, MIT) y,
si no está, Noto Emoji (Google, Apache 2.0), consultados por la API pública de Iconify (sin cuenta). Se guardan en assets/emojis para no
volver a pedirlos. Licencias en assets/emojis/LICENCIAS.md.
"""

from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

RAIZ = Path(__file__).resolve().parent.parent
CACHE = RAIZ / "assets" / "emojis"
API = "https://api.iconify.design"
CONJUNTOS = ("fluent-emoji-flat", "noto")
CON_TONO = re.compile(r"-(light|medium-light|medium|medium-dark|dark)$")  # variantes de color de piel: no se usan
TIMEOUT = 20


def _pedir(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "fabrica-videos-cortos"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read()


def candidatos(termino: str) -> list[tuple[str, str]]:
    """(conjunto, nombre) de los emojis que pueden ser `termino` (inglés), del más al menos probable: el nombre exacto; los que empiezan por él
    ("poultry" -> "poultry-leg"); y, para frases de varias palabras ("ice crystal"), el nombre exacto de cada palabra de atrás hacia adelante
    (en inglés el sustantivo va al final). Nunca por prefijo suelto: "car" no devuelve "carrot". Quien lo use debe verificar el dibujo."""
    palabras = [re.sub(r"[^a-z0-9]+", "", w) for w in termino.lower().split()]
    slug = "-".join(w for w in palabras if w)
    if not slug:
        return []
    exactos = [slug] + [w for w in reversed(palabras) if w and w != slug]
    salida: list[tuple[str, str]] = []
    for conjunto in CONJUNTOS:
        try:
            res = json.loads(_pedir(f"{API}/search?query={urllib.parse.quote(termino)}&prefixes={conjunto}&limit=48"))
        except Exception:
            res = {}
        nombres = [i.split(":", 1)[1] for i in res.get("icons", []) if not CON_TONO.search(i)]
        for exacto in exactos:  # búsquedas por palabra suelta
            if exacto != slug and exacto not in nombres:
                try:
                    r2 = json.loads(_pedir(f"{API}/search?query={urllib.parse.quote(exacto)}&prefixes={conjunto}&limit=48"))
                    nombres += [i.split(":", 1)[1] for i in r2.get("icons", []) if not CON_TONO.search(i)]
                except Exception:
                    pass
        for exacto in exactos:
            if exacto in nombres and (conjunto, exacto) not in salida:
                salida.append((conjunto, exacto))
            salida += [(conjunto, n) for n in sorted((n for n in nombres if n.startswith(exacto + "-")), key=len)[:1] if (conjunto, n) not in salida]
    return salida


def buscar(termino: str) -> Optional[tuple[str, str]]:
    """El candidato más probable de `candidatos`, o None."""
    hallados = candidatos(termino)
    return hallados[0] if hallados else None


def svg(conjunto: str, nombre: str, lado: int = 512) -> Optional[bytes]:
    """SVG del emoji con tamaño explícito (los de Iconify vienen en "1em", y un <img> no sabe su tamaño). Se guarda en caché."""
    archivo = CACHE / f"{conjunto}__{nombre}.svg"
    if archivo.exists():
        return archivo.read_bytes()
    try:
        datos = _pedir(f"{API}/{conjunto}/{nombre}.svg?width={lado}&height={lado}")
    except Exception:
        return None
    if b"<svg" not in datos:
        return None
    CACHE.mkdir(parents=True, exist_ok=True)
    archivo.write_bytes(datos)
    return datos
