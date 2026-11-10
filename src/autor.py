"""Dibujante automático: un agente de Claude Code sin supervisión escribe el guion y dibuja cada escena a medida (escenas.js),
mira sus propias hojas de contacto y corrige. La fábrica solo le da nicho y tema y recibe el proyecto listo para renderizar.

Necesita el programa `claude` (npm install -g @anthropic-ai/claude-code) con sesión iniciada o, en GitHub Actions, el secret
CLAUDE_CODE_OAUTH_TOKEN (se genera con `claude setup-token`) o ANTHROPIC_API_KEY."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
LIMITE_MIN = 30
# Solo lo que el procedimiento necesita: leer el kit y el ejemplo, escribir el guion y las escenas, y los pasos de run.py.
HERRAMIENTAS = "Read,Write,Edit,Glob,Grep,Bash(python run.py:*)"


def disponible() -> bool:
    return shutil.which("claude") is not None


def dibujar(nicho: str, tema: str, avisar=print) -> str:
    """Lanza el procedimiento /video (.claude/commands/video.md) y devuelve el id del proyecto dibujado y revisado."""
    from src import fabrica
    antes = {p["id"] for p in fabrica.listar()}
    avisar(f"El dibujante trabaja en: {tema} (hasta {LIMITE_MIN} min)")
    try:
        r = subprocess.run([shutil.which("claude"), "-p", f"/video {nicho} {tema}", "--allowedTools", HERRAMIENTAS,
                            "--permission-mode", "acceptEdits"],
                           cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=LIMITE_MIN * 60)
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"el dibujante tardó más de {LIMITE_MIN} minutos")
    salida = (r.stdout or "").strip()
    print(salida[-1500:])
    nuevos = [p for p in fabrica.listar() if p["id"] not in antes and p.get("autor") and fabrica.escenas_js(p).exists()]
    if r.returncode != 0 or not nuevos:
        raise RuntimeError(f"el dibujante no entregó un proyecto (código {r.returncode}): {(r.stderr or salida)[-400:]}")
    return nuevos[0]["id"]  # listar() ordena del más nuevo al más viejo
