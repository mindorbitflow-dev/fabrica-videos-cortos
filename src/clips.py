"""Clips de video reales y gratuitos de Pexels para el estilo "video" (necesita PEXELS_API_KEY).

Licencia de Pexels: uso gratuito, también comercial, sin atribución obligatoria.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import requests

API = "https://api.pexels.com/videos/search"
TIMEOUT = 30


def disponible() -> bool:
    return bool(os.getenv("PEXELS_API_KEY", "").strip())


def _mejor_archivo(video: dict) -> Optional[dict]:
    """El archivo vertical más cercano a 1080x1920 (sin bajar de 1280 de alto ni pasar de 4K)."""
    verticales = [f for f in video.get("video_files", [])
                  if (f.get("height") or 0) > (f.get("width") or 0) and 1280 <= (f.get("height") or 0) <= 3840]
    return min(verticales, key=lambda f: abs(f["height"] - 1920), default=None)


def buscar(consulta: str, destino: Path, duracion_min: float, evitar: set[int]) -> Optional[int]:
    """Descarga a `destino` un clip vertical para la consulta. Devuelve el id de Pexels o None si no hay."""
    clave = os.getenv("PEXELS_API_KEY", "").strip()
    if not clave:
        raise RuntimeError("Falta PEXELS_API_KEY para buscar clips.")
    r = requests.get(API, headers={"Authorization": clave}, timeout=TIMEOUT,
                     params={"query": consulta, "orientation": "portrait", "per_page": 20, "size": "medium"})
    r.raise_for_status()
    candidatos = []
    for v in r.json().get("videos", []):
        archivo = _mejor_archivo(v)
        if archivo and v["id"] not in evitar:
            # Prefiere clips que alcancen para toda la escena (si no, se repiten en bucle).
            candidatos.append((v.get("duration", 0) < duracion_min, v["id"], archivo["link"]))
    if not candidatos:
        return None
    _, vid, enlace = sorted(candidatos, key=lambda c: c[0])[0]
    destino.parent.mkdir(parents=True, exist_ok=True)
    parcial = destino.with_suffix(".part")
    with requests.get(enlace, stream=True, timeout=TIMEOUT) as descarga:
        descarga.raise_for_status()
        with open(parcial, "wb") as f:
            for trozo in descarga.iter_content(1 << 16):
                f.write(trozo)
    parcial.replace(destino)
    return vid
