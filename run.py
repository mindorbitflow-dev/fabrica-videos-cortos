"""Fábrica de Videos Cortos Explicativos (HTML animado → MP4).

Uso:
  python run.py                                      -> Interfaz web en http://localhost:8502
  python run.py --nicho ciencia --tema aleatorio     -> Un video completo por consola
  python run.py --nicho cuerpo --tema "Por qué bostezamos"
  python run.py --nicho dinero --lote 5              -> 5 videos con temas nuevos
  python run.py --auto                               -> Modo GitHub Actions: rota el nicho, fabrica y envía por correo
  python run.py --auto --nicho ciencia               -> Igual, con un nicho fijo
  python run.py --check                              -> Diagnóstico (ffmpeg, Chromium, IA, voz)
"""

import argparse
import os
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

RAIZ = os.path.dirname(os.path.abspath(__file__))
os.chdir(RAIZ)  # .env, config y proyectos se resuelven desde aquí
sys.path.insert(0, RAIZ)


def check() -> None:
    import asyncio
    import shutil
    from src.llm import LLMRouter
    print("ffmpeg:", "OK" if shutil.which("ffmpeg") and shutil.which("ffprobe") else "FALTA")
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            pw.chromium.launch().close()
        print("Chromium (Playwright): OK")
    except Exception as error:
        print("Chromium: FALTA ->  python -m playwright install chromium  |", str(error)[:120])
    try:
        import edge_tts
        async def probar():
            trozos = [t async for t in edge_tts.Communicate("prueba", "es-CO-GonzaloNeural").stream()]
            return any(t["type"] == "audio" for t in trozos)
        print("Voz Edge-TTS:", "OK" if asyncio.run(probar()) else "sin audio")
    except Exception as error:
        print("Voz Edge-TTS: FALLA ->  pip install -U edge-tts  |", str(error)[:120])
    router = LLMRouter()
    for proveedor in router.available_providers():
        ok, motivo = router.ping(proveedor)
        print(f"IA {proveedor}: {'OK' if ok else motivo}")
    if not router.has_any:
        print("IA: sin claves en .env (puedes escribir guiones a mano en la interfaz)")


def auto(nicho: str | None, musica: str) -> None:
    """Un video de principio a fin y por correo. Si falla, avisa por correo y sale con error."""
    import traceback
    from src import correo, fabrica
    from src.llm import LLMRouter
    enlace = ""
    if os.getenv("GITHUB_RUN_ID"):
        enlace = f"{os.getenv('GITHUB_SERVER_URL')}/{os.getenv('GITHUB_REPOSITORY')}/actions/runs/{os.getenv('GITHUB_RUN_ID')}"
    try:
        if not correo.configurado():
            raise RuntimeError("Faltan GMAIL_USUARIO y GMAIL_CLAVE_APP: no tendría a dónde enviar el video.")
        permitidos = [n.strip() for n in os.getenv("NICHOS_AUTO", "").split(",") if n.strip()] or None
        if not nicho or nicho == "rotar":
            nicho = fabrica.elegir_nicho(permitidos)
        print(f"Nicho: {nicho}")
        p = fabrica.fabricar(nicho, "aleatorio", LLMRouter(), musica=musica)
        print(f"Listo: {fabrica.mp4(p)} ({p['duracion']} s, voz {p['voz_usada']})")
        correo.enviar_video(p, enlace)
        print("Correo enviado.")
    except Exception as error:
        detalle = f"{type(error).__name__}: {error}"
        print(f"ERROR: {detalle}")
        traceback.print_exc()
        if correo.configurado():
            try:
                correo.enviar_error(detalle, enlace)
            except Exception as error_correo:
                print(f"Tampoco se pudo enviar el aviso por correo: {error_correo}")
        sys.exit(1)


def main() -> None:
    ap = argparse.ArgumentParser(description="Fábrica de Videos Cortos Explicativos")
    ap.add_argument("--nicho", help="Clave del nicho (config/nichos.yaml)")
    ap.add_argument("--tema", default="aleatorio", help='Tema del video o "aleatorio"')
    ap.add_argument("--lote", type=int, default=0, help="Fabricar N videos con temas nuevos")
    ap.add_argument("--musica", default="aleatoria", help='"ninguna", "aleatoria" o archivo de assets/musica')
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--auto", action="store_true", help="Un video con nicho rotativo y envío por correo")
    ap.add_argument("--puerto", default="8502")
    args = ap.parse_args()

    if args.check:
        return check()
    if args.auto:
        from src.env import load_env
        load_env()
        return auto(args.nicho, args.musica)
    if not args.nicho:
        subprocess.run([sys.executable, "-m", "streamlit", "run", os.path.join("src", "ui.py"),
                        "--server.port", args.puerto, "--browser.gatherUsageStats", "false"])
        return

    from src import fabrica
    from src.llm import LLMRouter
    if args.nicho not in fabrica.cargar_nichos():
        sys.exit(f"Nicho desconocido. Disponibles: {', '.join(fabrica.cargar_nichos())}")
    router = LLMRouter()
    total = max(1, args.lote)
    fallidos = 0
    for n in range(total):
        tema = "aleatorio" if args.lote else args.tema
        print(f"\n=== Video {n + 1}/{total} ===")
        try:
            p = fabrica.fabricar(args.nicho, tema, router, musica=args.musica)
            print(f"Listo: {fabrica.mp4(p)}\n\n{fabrica.texto_publicacion(p)}")
            respaldos = sum(e.get("origen") == "respaldo" for e in p["escenas"])
            if respaldos:
                print(f"Aviso: {respaldos} escena(s) con animación de respaldo (texto). Puedes rehacerlas en la interfaz.")
        except Exception as error:
            fallidos += 1
            print(f"ERROR: {error}")
    if fallidos:
        sys.exit(f"{fallidos} de {total} videos fallaron.")


if __name__ == "__main__":
    main()
