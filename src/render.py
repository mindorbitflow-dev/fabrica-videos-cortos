"""HTML de escenas (data-voz) → MP4 vertical con voz (src/voces.py), subtítulos palabra por palabra y música opcional."""

from __future__ import annotations

import asyncio
import base64
import json
import math
import subprocess
from pathlib import Path
from typing import Callable, Optional

from playwright.async_api import async_playwright

from src import voces

FPS = 30

Progreso = Optional[Callable[[float, str], None]]
LUFS = -14            # volumen de referencia de TikTok, Reels y Shorts
MAX_MB_CORREO = 20    # Gmail: 25 MB contando la codificación del adjunto
MAX_KBPS_VIDEO = 1800  # tope de tasa del video; el de videos largos baja según la duración
MAX_SEGUNDOS = 175    # Reels, TikTok y Shorts admiten hasta 3 min; los guiones piden 90-150 s


def _medir_volumen(wav: Path, total: float) -> dict:
    """Primera pasada de loudnorm: mide la voz (con su silencio final) para aplicar luego una ganancia fija."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af",
                        f"apad=whole_dur={total:.3f},loudnorm=I={LUFS}:TP=-1.5:LRA=11:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True, check=True)
    return json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])


def _probe(mp4: Path) -> dict:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate:format=duration,size",
                        "-of", "json", str(mp4)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def _rms_final(mp4: Path, duracion: float, segundos: float = 0.3) -> float:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-ss", f"{max(0, duracion - segundos):.3f}", "-i", str(mp4),
                        "-vn", "-af", "astats", "-f", "null", "-"], capture_output=True, text=True)
    valores = [l.rsplit(":", 1)[1].strip() for l in r.stderr.splitlines() if "RMS level dB" in l]
    try:
        return float(valores[-1])
    except (IndexError, ValueError):
        return float("-inf")


def verificar_mp4(mp4: Path) -> list[str]:
    """Comprueba que el archivo cumple lo que esperan TikTok, Reels y Shorts y que cabe en el correo."""
    info = _probe(mp4)
    video = next((s for s in info["streams"] if s["codec_type"] == "video"), {})
    audio = next((s for s in info["streams"] if s["codec_type"] == "audio"), {})
    dur, mb = float(info["format"]["duration"]), int(info["format"]["size"]) / 1048576
    problemas = []
    if (video.get("width"), video.get("height")) != (1080, 1920):
        problemas.append(f"resolución {video.get('width')}x{video.get('height')} (debe ser 1080x1920, 9:16)")
    if video.get("r_frame_rate") != f"{FPS}/1":
        problemas.append(f"cuadros por segundo {video.get('r_frame_rate')} (debe ser {FPS})")
    if video.get("codec_name") != "h264" or video.get("pix_fmt") != "yuv420p":
        problemas.append(f"video {video.get('codec_name')}/{video.get('pix_fmt')} (debe ser h264/yuv420p)")
    if audio.get("codec_name") != "aac" or audio.get("sample_rate") != "48000":
        problemas.append(f"audio {audio.get('codec_name')} {audio.get('sample_rate')} Hz (debe ser AAC 48 kHz)")
    if not 10 <= dur <= MAX_SEGUNDOS:
        problemas.append(f"dura {dur:.0f} s (lo recomendable es 15-{MAX_SEGUNDOS} s)")
    if mb > MAX_MB_CORREO:
        problemas.append(f"pesa {mb:.1f} MB y no cabe en el correo")
    final = _rms_final(mp4, dur)
    if final > -60:
        problemas.append(f"el final no queda en silencio ({final:.0f} dB): puede oírse ruido")
    return problemas


async def _renderizar(html: Path, mp4: Path, voz: str, velocidad: str, musica: Optional[Path],
                      progreso: Progreso) -> tuple[float, str]:
    avisar = progreso or (lambda f, m: print(f"[{f:4.0%}] {m}"))
    tmp = mp4.parent / "tmp_audio"
    tmp.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        nav = await pw.chromium.launch()
        try:
            pag = await nav.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
            await pag.goto(html.resolve().as_uri() + "?render=1")
            await pag.evaluate("document.fonts.ready")
            await pag.evaluate("window.__imagenesListas")
            textos = await pag.evaluate("__textos()")

            avisar(0.02, f"Generando la voz ({voces.nombre_voz(voz)})...")
            # En otro hilo (Edge usa su propio bucle asyncio); los avisos se muestran al volver,
            # porque la interfaz solo se puede actualizar desde el hilo principal.
            mensajes: list[str] = []
            voz_wav, plan, voz_usada = await asyncio.to_thread(voces.narrar, textos, voz, velocidad, tmp, mensajes.append)
            for m in mensajes:
                avisar(0.1, m)
            total = await pag.evaluate("p => __preparar(p)", plan)

            # Normalización a -14 LUFS en DOS pasadas y lineal: el modo dinámico de loudnorm subía el volumen
            # de los silencios y la cola del video sonaba a estática. Además, la salida se desvanece al final.
            medida = await asyncio.to_thread(_medir_volumen, voz_wav, total)
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
                   "-i", str(voz_wav)]
            # Los cuadros llegan como JPEG (rango de color completo, "yuvj420p"); las plataformas esperan
            # yuv420p de rango TV: sin esta conversión el verificador lo marcó y los colores pueden verse lavados.
            filtros = ["[0:v]scale=in_range=pc:out_range=tv,format=yuv420p[v]",
                       f"[1:a]apad=whole_dur={total:.3f}[voz]"]
            mezcla = "[voz]"
            if musica:
                cmd += ["-stream_loop", "-1", "-i", str(musica)]
                filtros.append(f"[2:a]volume=0.10,afade=t=out:st={max(0, total - 1.5):.2f}:d=1.5[m];"
                               "[voz][m]amix=inputs=2:duration=first:normalize=0[mez]")
                mezcla = "[mez]"
            filtros.append(f"{mezcla}loudnorm=I={LUFS}:TP=-1.5:LRA=11:measured_I={medida['input_i']}"
                           f":measured_TP={medida['input_tp']}:measured_LRA={medida['input_lra']}"
                           f":measured_thresh={medida['input_thresh']}:offset={medida['target_offset']}:linear=true,"
                           f"afade=t=out:st={max(0, total - 0.4):.3f}:d=0.4,aresample=48000[a]")
            # El movimiento continuo de la cámara hacía pesar 74 MB (9 Mbps): CRF con tope de tasa que depende de la
            # duración, para que el MP4 quepa en el correo hasta con 120 s. Probado: 16,8 MB y a la vista igual.
            kbps = int(max(400, min(MAX_KBPS_VIDEO, MAX_MB_CORREO * 0.9 * 8000 / total - 192)))
            cmd += ["-filter_complex", ";".join(filtros), "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", f"{kbps}k", "-bufsize", f"{2 * kbps}k",
                    "-pix_fmt", "yuv420p", "-color_range", "tv",
                    "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}", "-movflags", "+faststart", str(mp4)]
            ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
            try:
                cuadros = math.ceil(total * FPS)
                # Captura directa por CDP: ~22 % más rápida que page.screenshot (medido: 125 vs 160 ms/cuadro).
                cdp = await pag.context.new_cdp_session(pag)
                formato = {"format": "jpeg", "quality": 92}
                for f in range(cuadros):
                    await pag.evaluate("t => __seek(t)", f / FPS)
                    foto = await cdp.send("Page.captureScreenshot", {**formato, "optimizeForSpeed": True})
                    ff.stdin.write(base64.b64decode(foto["data"]))
                    if f % FPS == 0:
                        avisar(0.1 + 0.9 * f / cuadros, f"Renderizando {f / FPS:.0f}s de {total:.0f}s")
            finally:
                ff.stdin.close()
                codigo = ff.wait()
            if codigo != 0:
                raise RuntimeError("ffmpeg falló al codificar el video")
        finally:
            await nav.close()
    avisar(1.0, "Listo")
    return total, voz_usada


def renderizar(html: Path, mp4: Path, voz: str, velocidad: str = "+8%", musica: Optional[Path] = None,
               progreso: Progreso = None) -> tuple[float, str]:
    """Genera el MP4 y devuelve (duración en segundos, voz realmente usada)."""
    return asyncio.run(_renderizar(Path(html), Path(mp4), voz, velocidad, musica, progreso))


def miniatura(mp4: Path, destino: Path, segundo: float = 2.0, ancho: int = 360) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(segundo), "-i", str(mp4), "-frames:v", "1",
                    "-q:v", "2", "-vf", f"scale={ancho}:-1", str(destino)], check=True)


async def _hoja_contacto(html: Path, destino: Path, por_escena: int) -> tuple[list[Path], list[str]]:
    from io import BytesIO
    from PIL import Image
    destino.mkdir(parents=True, exist_ok=True)
    for viejo in destino.glob("hoja_*.jpg"):
        viejo.unlink()
    errores: list[str] = []
    async with async_playwright() as pw:
        nav = await pw.chromium.launch()
        try:
            pag = await nav.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
            pag.on("pageerror", lambda e: errores.append(str(e)))
            await pag.goto(html.resolve().as_uri() + "?render=1")
            await pag.evaluate("document.fonts.ready")
            await pag.evaluate("window.__imagenesListas")
            plan = await pag.evaluate("__estimar()")
            await pag.evaluate("p => __preparar(p)", plan)
            cuadros = []
            for i, esc in enumerate(plan):
                for n in range(por_escena):
                    local = max(0.4, esc["dur"] * (0.12 + 0.8 * n / max(1, por_escena - 1)))
                    await pag.evaluate("t => __seek(t)", esc["inicio"] + min(local, esc["dur"] - 0.02))
                    cuadros.append((i, Image.open(BytesIO(await pag.screenshot(type="jpeg", quality=80)))))
            errores += await pag.evaluate("window.__errores || []")
        finally:
            await nav.close()
    ancho, alto, columnas, filas = 300, 533, 6, 2
    hojas = []
    for h in range(0, len(cuadros), columnas * filas):
        lote = cuadros[h:h + columnas * filas]
        hoja = Image.new("RGB", (ancho * columnas, alto * math.ceil(len(lote) / columnas)), "#000")
        for k, (i, img) in enumerate(lote):
            hoja.paste(img.resize((ancho, alto)), ((k % columnas) * ancho, (k // columnas) * alto))
        ruta = destino / f"hoja_{len(hojas) + 1:02d}_escenas_{lote[0][0] + 1}-{lote[-1][0] + 1}.jpg"
        hoja.save(ruta, quality=85)
        hojas.append(ruta)
    return hojas, errores


def hoja_contacto(html: Path, destino: Path, por_escena: int = 3) -> tuple[list[Path], list[str]]:
    """Varios cuadros por escena (tiempos estimados, sin voz) en hojas de 6 columnas: para revisar el dibujo antes de renderizar."""
    return asyncio.run(_hoja_contacto(Path(html), Path(destino), por_escena))
