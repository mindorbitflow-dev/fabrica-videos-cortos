"""Sube state/historial.json a GitHub sin perder entradas de otras ejecuciones.

Se llama justo después de enviar cada video (run.py) y al final de la ejecución (workflow): así la ejecución de respaldo
y las siguientes SIEMPRE ven los temas ya enviados. Si el push choca con otro (otra ejecución, un push a mano), se vuelve a
traer el historial remoto, se mezcla por `id` (lo de esta ejecución manda) y se reintenta. No toca ningún otro archivo."""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
HISTORIAL = RAIZ / "state" / "historial.json"
ORDEN = lambda h: str(h.get("fecha", ""))  # noqa: E731


def _git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=RAIZ, capture_output=True, text=True, encoding="utf-8")


def subir(intentos: int = 6) -> bool:
    if not HISTORIAL.exists():
        return True
    mio = json.loads(HISTORIAL.read_text(encoding="utf-8"))
    _git("config", "user.name", "fabrica-bot")
    _git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com")
    for n in range(intentos):
        _git("fetch", "-q", "origin", "main")
        r = _git("show", "origin/main:state/historial.json")
        remoto = json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else []
        por_id = {h["id"]: h for h in remoto}
        por_id.update({h["id"]: h for h in mio})   # lo de esta ejecución manda
        union = sorted(por_id.values(), key=ORDEN)
        HISTORIAL.write_text(json.dumps(union, ensure_ascii=False, indent=1), encoding="utf-8")
        # mueve HEAD y el índice al remoto sin tocar los archivos de trabajo (el código de esta ejecución no cambia)
        _git("reset", "-q", "--mixed", "origin/main")
        _git("add", "state/historial.json")
        if _git("diff", "--cached", "--quiet").returncode == 0:
            return True   # el remoto ya lo tiene todo
        _git("commit", "-q", "-m", "Historial: nuevo video")
        p = _git("push", "-q", "origin", "HEAD:main")
        if p.returncode == 0:
            return True
        print(f"[Historial] el push chocó (intento {n + 1}/{intentos}): {p.stderr.strip()[:120]}")
        time.sleep(3 + 4 * n)
    return False


if __name__ == "__main__":
    sys.exit(0 if subir() else 1)
