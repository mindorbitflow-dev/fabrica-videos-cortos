"""IA con visión para comprobar dibujos: Gemini mira la imagen y dice qué ve.

La verificación es CIEGA: primero se le pide que diga qué objeto es SIN decirle qué debería ser (si se le dice, tiende a aceptar casi
cualquier mancha: un pollo que parecía un frijol pasó), y después una IA de texto decide si lo que vio es lo mismo que lo esperado.
"""

from __future__ import annotations

import base64
import json
import time
import urllib.request
from typing import Optional

from src.guionista import leer_json
from src.llm import LLMRouter

TIMEOUT = 40

PROMPT_QUE_ES = """Mira este dibujo. ¿Qué objeto, animal o cosa es? Responde SOLO con su nombre en inglés, de 1 a 5 palabras
(ej. "kitchen faucet", "frying pan"). Di lo que ves, no lo que podría querer ser. Si es una mancha o no se reconoce, responde "unrecognizable shape"."""

PROMPT_COINCIDE = """Compara dos nombres de objetos. Lo ESPERADO es "{esperado}". Lo que se VIO en el dibujo es "{visto}".
¿Una persona que ve el dibujo reconocería en él lo esperado? Acepta si es lo mismo, un sinónimo o la representación natural de lo esperado
("faucet" = "tap"; "salt shaker" sirve para "salt"; "diamond" sirve para "gem stone"; "snowflake" sirve para "ice crystal"). Rechaza si es otra
cosa distinta: "bean" NO es "chicken leg"; "baguette" NO es "chicken leg"; "telephone receiver" NO es "coin"; "unrecognizable shape" NUNCA coincide.
Responde SOLO JSON: {{"mismo": true|false}}"""


def _gemini(router: LLMRouter, jpeg: bytes, pregunta: str) -> Optional[str]:
    """Texto que contesta el primer modelo Gemini disponible, o None (sin clave, cupo agotado, saturado)."""
    clave = router.keys.get("gemini")
    if not clave:
        return None
    cuerpo = json.dumps({"contents": [{"parts": [{"inlineData": {"mimeType": "image/jpeg", "data": base64.b64encode(jpeg).decode()}},
                                                  {"text": pregunta}]}], "generationConfig": {"temperature": 0}}).encode()
    limite = time.monotonic() + 2 * TIMEOUT
    for modelo in router.gemini_models:
        if time.monotonic() > limite:
            break
        try:
            req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={clave}",
                                         cuerpo, {"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                partes = json.load(r)["candidates"][0]["content"]["parts"]
            texto = "".join(p.get("text", "") for p in partes).strip()
            if texto:
                return texto
        except Exception:
            continue  # 404 (retirado), 429 (cupo) o 503 (saturado): siguiente modelo
    return None


def ver(router: LLMRouter, jpeg: bytes, pregunta: str) -> Optional[str]:
    """Respuesta de una IA con visión a `pregunta` sobre la imagen (None si no hay ninguna disponible)."""
    return _gemini(router, jpeg, pregunta)


def que_es(router: LLMRouter, jpeg: bytes) -> Optional[str]:
    """Nombre corto, en inglés, de lo que ve la IA en el dibujo (a ciegas), o None si no hay visión disponible."""
    texto = _gemini(router, jpeg, PROMPT_QUE_ES)
    return texto.splitlines()[0].strip(" \"'.").lower() if texto else None


def coincide(router: LLMRouter, esperado: str, visto: str) -> bool:
    try:
        texto, _ = router.complete_any(PROMPT_COINCIDE.format(esperado=esperado, visto=visto), max_tokens=60, temperature=0)
        return bool(leer_json(texto).get("mismo"))
    except Exception:
        return False


def verificar_objeto(router: LLMRouter, jpeg: bytes, esperado: str) -> tuple[Optional[bool], str]:
    """(aceptado, lo que se vio): aceptado es None si no hubo IA con visión disponible."""
    visto = que_es(router, jpeg)
    if visto is None:
        return None, ""
    return coincide(router, esperado, visto), visto
