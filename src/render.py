"""HTML de escenas (data-voz) → MP4 vertical con voz (src/voces.py), subtítulos palabra por palabra y música opcional."""

from __future__ import annotations

import asyncio
import base64
import math
import subprocess
from pathlib import Path
from typing import Callable, Optional

from playwright.async_api import async_playwright

from src import voces

FPS = 30

Progreso = Optional[Callable[[float, str], None]]


async def _renderizar(html: Path, mp4: Path, voz: str, velocidad: str, musica: Optional[Path], progreso: Progreso,
                      fondos: Optional[list[Path]] = None) -> tuple[float, str]:
    avisar = progreso or (lambda f, m: print(f"[{f:4.0%}] {m}"))
    tmp = mp4.parent / "tmp_audio"
    tmp.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as pw:
        nav = await pw.chromium.launch()
        try:
            pag = await nav.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
            await pag.goto(html.resolve().as_uri() + "?render=1")
            await pag.evaluate("document.fonts.ready")
            textos = await pag.evaluate("__textos()")

            avisar(0.02, f"Generando la voz ({voces.nombre_voz(voz)})...")
            # En otro hilo (Edge usa su propio bucle asyncio); los avisos se muestran al volver,
            # porque la interfaz solo se puede actualizar desde el hilo principal.
            mensajes: list[str] = []
            voz_wav, plan, voz_usada = await asyncio.to_thread(voces.narrar, textos, voz, velocidad, tmp, mensajes.append)
            for m in mensajes:
                avisar(0.1, m)
            total = await pag.evaluate("p => __preparar(p)", plan)

            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
                   "-i", str(voz_wav)]
            filtros = [f"[1:a]apad=whole_dur={total:.3f}[voz]"]
            video = "0:v"
            if fondos:
                # Estilo "video": un clip real por escena (con zoom lento y algo oscurecido para que el texto
                # se lea) y encima la capa HTML transparente con portada, subtítulos y rótulos.
                for i, (clip, escena) in enumerate(zip(fondos, plan)):
                    d = escena["dur"]
                    cmd += ["-stream_loop", "-1", "-t", f"{d + 0.5:.3f}", "-i", str(clip)]
                    filtros.append(
                        f"[{2 + i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps={FPS},"
                        f"zoompan=z='1+0.08*on/({d:.3f}*{FPS})':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':s=1080x1920:fps={FPS},"
                        f"trim=duration={d:.3f},setpts=PTS-STARTPTS,eq=brightness=-0.06:saturation=1.08[f{i}]")
                filtros.append("".join(f"[f{i}]" for i in range(len(fondos))) + f"concat=n={len(fondos)}:v=1:a=0[fondo]")
                filtros.append("[fondo][0:v]overlay=format=auto,format=yuv420p[v]")
                video = "[v]"
            mezcla = "[voz]"
            if musica:
                n = 2 + len(fondos or [])
                cmd += ["-stream_loop", "-1", "-i", str(musica)]
                filtros.append(f"[{n}:a]volume=0.10,afade=t=out:st={max(0, total - 1.5):.2f}:d=1.5[m];"
                               "[voz][m]amix=inputs=2:duration=first:normalize=0[mez]")
                mezcla = "[mez]"
            filtros.append(f"{mezcla}loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
            cmd += ["-filter_complex", ";".join(filtros), "-map", video, "-map", "[a]",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}", "-movflags", "+faststart", str(mp4)]
            ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
            try:
                cuadros = math.ceil(total * FPS)
                # Captura directa por CDP: ~22 % más rápida que page.screenshot (medido: 125 vs 160 ms/cuadro).
                cdp = await pag.context.new_cdp_session(pag)
                formato = {"format": "jpeg", "quality": 92}
                if fondos:  # PNG con transparencia para superponerlo a los clips
                    await cdp.send("Emulation.setDefaultBackgroundColorOverride", {"color": {"r": 0, "g": 0, "b": 0, "a": 0}})
                    formato = {"format": "png"}
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
               progreso: Progreso = None, fondos: Optional[list[Path]] = None) -> tuple[float, str]:
    """Genera el MP4 y devuelve (duración en segundos, voz realmente usada). `fondos`: un clip por escena."""
    return asyncio.run(_renderizar(Path(html), Path(mp4), voz, velocidad, musica, progreso, fondos))


def miniatura(mp4: Path, destino: Path, segundo: float = 2.0, ancho: int = 360) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(segundo), "-i", str(mp4), "-frames:v", "1",
                    "-q:v", "2", "-vf", f"scale={ancho}:-1", str(destino)], check=True)
