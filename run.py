"""Fábrica de Videos Cortos Explicativos (HTML animado → MP4).

Uso:
  python run.py                                      -> Interfaz web en http://localhost:8502
  python run.py --nicho ciencia --tema aleatorio     -> Un video completo por consola
  python run.py --nicho cuerpo --tema "Por qué bostezamos"
  python run.py --nicho dinero --lote 5              -> 5 videos con temas nuevos
  python run.py --auto                               -> Modo GitHub Actions: rota el nicho, fabrica y envía por correo
  python run.py --auto --nicho ciencia               -> Igual, con un nicho fijo
  python run.py --auto --cantidad 2                  -> Dos videos seguidos, cada uno por correo
  python run.py --check                              -> Diagnóstico (ffmpeg, Chromium, IA, voz)

Videos de autor (escenas dibujadas a medida en proyectos/<id>/escenas.js; ver .claude/commands/video.md):
  python run.py --nicho biologia --guion guion.json  -> Crea el proyecto con ese guion e imprime su id
  python run.py --hoja ID                            -> Hojas de contacto para revisar el dibujo (y errores de las escenas)
  python run.py --render ID [--correo]               -> Voz + MP4 (y lo envía por correo)
Con el programa `claude` instalado, --auto y --nicho usan solos este camino (src/autor.py).
"""

import argparse
import os
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

RAIZ = os.path.dirname(os.path.abspath(__file__))
LIMITE_AUTO_MIN = 85  # por video (dibujante hasta 50 + render); el job de GitHub se corta a los 120 (ver fabrica.yml)
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


def auto(nicho: str | None, musica: str, cantidad: int = 1) -> None:
    """`cantidad` videos de principio a fin, cada uno por correo. Si uno falla, avisa por correo y sigue con el siguiente; al final
    sale con error si alguno falló. Varios videos por ejecución porque GitHub se salta parte de las ejecuciones programadas."""
    import signal
    import traceback
    from src import correo, fabrica
    from src.llm import LLMRouter
    enlace = ""
    if os.getenv("GITHUB_RUN_ID"):
        enlace = f"{os.getenv('GITHUB_SERVER_URL')}/{os.getenv('GITHUB_REPOSITORY')}/actions/runs/{os.getenv('GITHUB_RUN_ID')}"
    def limite(*_):
        raise TimeoutError(f"el video tardó más de {LIMITE_AUTO_MIN} minutos")

    if hasattr(signal, "SIGALRM"):  # Linux (GitHub Actions): avisar por correo antes de que GitHub cancele
        signal.signal(signal.SIGALRM, limite)
    fallidos = 0
    router = LLMRouter()
    for n in range(cantidad):
        if cantidad > 1:
            print(f"\n=== Video {n + 1}/{cantidad} ===")
        if hasattr(signal, "SIGALRM"):
            signal.alarm(LIMITE_AUTO_MIN * 60)  # el límite es por video
        try:
            if not correo.configurado():
                raise RuntimeError("Faltan GMAIL_USUARIO y GMAIL_CLAVE_APP: no tendría a dónde enviar el video.")
            permitidos = [x.strip() for x in os.getenv("NICHOS_AUTO", "").split(",") if x.strip()] or None
            elegido = nicho if nicho and nicho != "rotar" else fabrica.elegir_nicho(permitidos)  # el historial ya cuenta el video anterior
            print(f"Nicho: {elegido}")
            p = fabrica.fabricar(elegido, "aleatorio", router, musica=musica)
            print(f"Listo: {fabrica.mp4(p)} ({p['duracion']} s, voz {p['voz_usada']})")
            correo.enviar_video(p, enlace)
            print("Correo enviado.")
        except Exception as error:
            fallidos += 1
            detalle = f"{type(error).__name__}: {error}"
            print(f"ERROR: {detalle}")
            traceback.print_exc()
            if correo.configurado():
                try:
                    correo.enviar_error(detalle, enlace)
                except Exception as error_correo:
                    print(f"Tampoco se pudo enviar el aviso por correo: {error_correo}")
        finally:
            if hasattr(signal, "SIGALRM"):
                signal.alarm(0)
    if fallidos:
        print(f"{fallidos} de {cantidad} videos fallaron.")
        sys.stdout.flush()
        os._exit(1)  # sin esperar hilos colgados (una llamada de red atascada impediría terminar)


def autor(args) -> None:
    """Pasos de un video de autor: crear el proyecto desde un guion, revisar el dibujo y renderizar."""
    import json
    from src import correo, fabrica
    from src.env import load_env
    load_env()
    if args.guion:
        if args.nicho not in fabrica.cargar_nichos():
            sys.exit(f"--guion necesita --nicho. Disponibles: {', '.join(fabrica.cargar_nichos())}")
        with open(args.guion, encoding="utf-8") as f:
            p = fabrica.nuevo_de_autor(args.nicho, json.load(f))
        for aviso in p["avisos"]:
            print(f"Aviso del guion: {aviso}")
        print(f"Proyecto: {p['id']}\nEscenas: {fabrica.escenas_js(p)}")
        return
    p = fabrica.cargar(args.hoja or args.render)
    if args.hoja:
        hojas, errores = fabrica.hoja(p)
        print("\n".join(str(h) for h in hojas))
        if errores:
            sys.exit("ERRORES EN LAS ESCENAS:\n" + "\n".join(errores))
        return
    _, errores = fabrica.hoja(p, por_escena=2)  # una escena con error saldría en negro: no se renderiza
    if errores:
        sys.exit("ERRORES EN LAS ESCENAS (no se renderiza):\n" + "\n".join(errores))
    p = fabrica.renderizar(p, musica=args.musica)
    print(f"Listo: {fabrica.mp4(p)} ({p['duracion']} s, voz {p['voz_usada']})")
    for problema in p["verificacion"]:
        print(f"Aviso del MP4: {problema}")
    if args.correo:
        correo.enviar_video(p)
        print("Correo enviado.")


def main() -> None:
    ap = argparse.ArgumentParser(description="Fábrica de Videos Cortos Explicativos")
    ap.add_argument("--nicho", help="Clave del nicho (config/nichos.yaml)")
    ap.add_argument("--tema", default="aleatorio", help='Tema del video o "aleatorio"')
    ap.add_argument("--lote", type=int, default=0, help="Fabricar N videos con temas nuevos")
    ap.add_argument("--musica", default="aleatoria", help='"ninguna", "aleatoria" o archivo de assets/musica')
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--auto", action="store_true", help="Videos con nicho rotativo y envío por correo (ver --cantidad)")
    ap.add_argument("--cantidad", type=int, default=1, help="Con --auto: cuántos videos fabricar en esta ejecución")
    ap.add_argument("--puerto", default="8502")
    ap.add_argument("--guion", help="Archivo JSON con un guion ya escrito: crea un proyecto de autor (requiere --nicho)")
    ap.add_argument("--hoja", metavar="ID", help="Hojas de contacto de un proyecto")
    ap.add_argument("--render", metavar="ID", help="Renderiza un proyecto ya dibujado")
    ap.add_argument("--correo", action="store_true", help="Con --render: envía el video por correo")
    args = ap.parse_args()

    if args.check:
        return check()
    if args.auto:
        from src.env import load_env
        load_env()
        return auto(args.nicho, args.musica, max(1, args.cantidad))
    if args.hoja or args.render or args.guion:
        return autor(args)
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
