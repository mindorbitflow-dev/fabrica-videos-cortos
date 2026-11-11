"""Narración del video: Edge-TTS (Microsoft) o Gemini TTS, con tiempos por palabra para los subtítulos.

Ambos caminos devuelven lo mismo: un único audio de voz y el plan de escenas que usa plantilla/motor.js
({inicio, dur, palabras:[{w, t, d}]}), con las palabras EXACTAS del guion (con su puntuación).

Gemini no entrega tiempos por palabra: se transcribe con Whisper local y se alinea con el guion (idea
tomada de "videos automatizados/src/core/aligner.py"). Se pide UNA sola síntesis por video para no
gastar el cupo gratuito; si falla o la voz se salta partes del guion, se usa la voz de respaldo de Edge.
"""

from __future__ import annotations

import asyncio
import difflib
import os
import re
import subprocess
import threading
import time
import unicodedata
import wave
from pathlib import Path
from typing import Callable, Optional

import edge_tts

VOCES = {
    "gemini:Puck": "🎙️ Puck · Gemini · animado",
    "gemini:Fenrir": "🎙️ Fenrir · Gemini · emocionado",
    "gemini:Achird": "🎙️ Achird · Gemini · amigable",
    "gemini:Charon": "🎙️ Charon · Gemini · narrador grave",
    "en-US-BrianMultilingualNeural": "🎙️ Brian · Microsoft · conversacional",
}
RESPALDO = "en-US-BrianMultilingualNeural"
MODELOS_GEMINI = ("gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview")
MODELO_ESTILO = "gemini-2.5-flash-preview-tts"  # el único que aplica una indicación de estilo sin leerla en voz alta
PAUSA = 0.3        # silencio entre escenas con Edge (s)
PAUSA_FINAL = 0.6  # cola al final del video (s): corta, para que no quede sonido suelto
COBERTURA_MIN = 0.85  # fracción del guion que Whisper debe reconocer en el audio de Gemini
PALABRAS_DE_MAS_MAX = 1.12  # Whisper puede partir/unir palabras; más que esto es lectura repetida
SEG_POR_PALABRA_MAX = 0.95  # una escena más lenta que esto está mal alineada (el narrador de misterios llega a ~0,8)

Aviso = Callable[[str], None]
_whisper = None
_whisper_lock = threading.Lock()


def nombre_voz(voz: str) -> str:
    return VOCES.get(voz, voz)


def _duracion(archivo: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(archivo)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def _norm(palabra: str) -> str:
    p = unicodedata.normalize("NFKD", palabra.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", p)


def alinear(tokens: list[str], oidas: list[tuple[str, float, float]]) -> tuple[list[tuple[float, float]], float]:
    """Tiempos (inicio, fin) para cada token del guion a partir de las palabras oídas, y la cobertura.
    Los tokens que no se reconocen se interpolan entre sus vecinos."""
    a, b = [_norm(t) for t in tokens], [_norm(o[0]) for o in oidas]
    emparejados = {}
    for bloque in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_matching_blocks():
        for k in range(bloque.size):
            emparejados[bloque.a + k] = bloque.b + k
    tiempos: list[Optional[tuple[float, float]]] = [None] * len(tokens)
    for i, j in emparejados.items():
        tiempos[i] = (oidas[j][1], oidas[j][2])
    conocidos = [i for i, t in enumerate(tiempos) if t]
    if not conocidos:
        return [(0.36 * i, 0.36 * i + 0.34) for i in range(len(tokens))], 0.0
    for i, t in enumerate(tiempos):
        if t:
            continue
        prev = max((k for k in conocidos if k < i), default=None)
        sig = min((k for k in conocidos if k > i), default=None)
        if prev is not None and sig is not None:
            ini, fin = tiempos[prev][1], tiempos[sig][0]
            paso = max(0.05, (fin - ini) / (sig - prev - 1))
            tiempos[i] = (ini + (i - prev - 1) * paso, ini + (i - prev) * paso)
        elif prev is not None:
            base = tiempos[prev][1] + 0.3 * (i - prev - 1)
            tiempos[i] = (base, base + 0.3)
        else:
            base = max(0.0, tiempos[sig][0] - 0.3 * (sig - i))
            tiempos[i] = (base, base + 0.3)
    return tiempos, len(emparejados) / max(1, len(tokens))


# ---------------- Edge-TTS ----------------
async def _edge_escena(texto: str, voz: str, velocidad: str, destino: Path) -> list[tuple[str, float, float]]:
    oidas = []
    with open(destino, "wb") as f:
        async for trozo in edge_tts.Communicate(texto, voz, rate=velocidad, boundary="WordBoundary").stream():
            if trozo["type"] == "audio":
                f.write(trozo["data"])
            elif trozo["type"] == "WordBoundary":
                ini = trozo["offset"] / 1e7
                oidas.append((trozo["text"], ini, ini + trozo["duration"] / 1e7))
    if not oidas:
        raise RuntimeError(f"Edge-TTS no devolvió audio para: {texto[:40]}...")
    return oidas


def _narrar_edge(textos: list[str], voz: str, velocidad: str, tmp: Path) -> tuple[Path, list[dict]]:
    plan, partes, inicio = [], [], 0.0
    for i, texto in enumerate(textos):
        mp3 = tmp / f"escena_{i}.mp3"
        oidas = asyncio.run(_edge_escena(texto, voz, velocidad, mp3))
        tokens = texto.split()
        tiempos, _ = alinear(tokens, oidas)
        dur = _duracion(mp3) + (PAUSA_FINAL if i == len(textos) - 1 else PAUSA)
        plan.append({"inicio": inicio, "dur": dur,
                     "palabras": [{"w": w, "t": a, "d": b - a} for w, (a, b) in zip(tokens, tiempos)]})
        partes.append((mp3, dur))
        inicio += dur
    voz_wav = tmp / "voz.wav"
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    filtros = []
    for i, (mp3, dur) in enumerate(partes):
        cmd += ["-i", str(mp3)]
        filtros.append(f"[{i}:a]aresample=48000,apad=whole_dur={dur:.3f}[s{i}]")
    filtros.append("".join(f"[s{i}]" for i in range(len(partes))) + f"concat=n={len(partes)}:v=0:a=1[a]")
    subprocess.run(cmd + ["-filter_complex", ";".join(filtros), "-map", "[a]", str(voz_wav)], check=True)
    return voz_wav, plan


# ---------------- Gemini TTS ----------------
def _gemini_pcm(texto: str, voz: str, estilo: str = "") -> bytes:
    from google import genai
    from google.genai import types
    clave = os.getenv("GEMINI_API_KEY", "").strip()
    if not clave:
        raise RuntimeError("falta GEMINI_API_KEY")
    cliente = genai.Client(api_key=clave, http_options={"timeout": 120_000})  # ms: evita esperas infinitas
    ultimo: Optional[Exception] = None
    for espera in (0, 10, 25):
        if espera:
            time.sleep(espera)
        # El estilo ("Say in a ... voice: <texto>") solo lo entiende el modelo 2.5: probado el 2026-11-10, los demás leen la
        # indicación en voz alta y no aceptan instrucción de sistema. Si el 2.5 falla, los demás narran sin estilo.
        intentos = [(m, f"{estilo}: {texto}" if estilo and m == MODELO_ESTILO else texto)
                    for m in ((MODELO_ESTILO,) + tuple(x for x in MODELOS_GEMINI if x != MODELO_ESTILO) if estilo else MODELOS_GEMINI)]
        for modelo, contenido in intentos:  # 429 (cupo de ese modelo) o 503 (saturado): siguiente modelo
            try:
                r = cliente.models.generate_content(model=modelo, contents=contenido, config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voz)))))
                datos = r.candidates[0].content.parts[0].inline_data.data
                if datos and len(datos) > 48000:  # al menos ~1 s
                    return datos
                raise RuntimeError("audio vacío")
            except Exception as error:
                ultimo = error
                print(f"[Voz] gemini/{modelo}: {str(error)[:100]}")
    raise ultimo or RuntimeError("Gemini TTS no respondió")


def _transcribir(audio: Path) -> list[tuple[str, float, float]]:
    global _whisper
    with _whisper_lock:
        if _whisper is None:
            from faster_whisper import WhisperModel
            _whisper = WhisperModel("base", device="cpu", compute_type="int8")
        segmentos, _ = _whisper.transcribe(str(audio), language="es", word_timestamps=True)
        return [(w.word.strip(), float(w.start), float(w.end)) for s in segmentos for w in (s.words or []) if w.word.strip()]


def _factor_velocidad(velocidad: str) -> float:
    try:
        return 1 + float(velocidad.strip().rstrip("%")) / 100
    except ValueError:
        return 1.0


def _narrar_gemini(textos: list[str], voz: str, velocidad: str, tmp: Path, estilo: str = "") -> tuple[Path, list[dict]]:
    crudo = tmp / "gemini.wav"
    with wave.open(str(crudo), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(24000)
        w.writeframes(_gemini_pcm("\n\n".join(textos), voz, estilo))
    # Gemini no acepta velocidad: se ajusta el tempo (sin cambiar el tono) antes de medir los tiempos.
    voz_wav = tmp / "voz.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(crudo), "-af",
                    f"atempo={_factor_velocidad(velocidad):.3f},aresample=48000", str(voz_wav)], check=True)

    tokens, escena_de = [], []
    for i, texto in enumerate(textos):
        for t in texto.split():
            tokens.append(t)
            escena_de.append(i)
    oidas = _transcribir(voz_wav)
    tiempos, cobertura = alinear(tokens, oidas)
    if cobertura < COBERTURA_MIN:
        raise RuntimeError(f"la voz solo leyó el {cobertura:.0%} del guion")
    # Gemini a veces vuelve a leer un trozo del guion (pasó en Actions: 20 s repetidos). La cobertura no lo
    # detecta porque todas las palabras están; sí se nota en que se oyen más palabras de las escritas.
    if len(oidas) > len(tokens) * PALABRAS_DE_MAS_MAX + 3:
        raise RuntimeError(f"la voz repitió partes del guion ({len(oidas)} palabras oídas de {len(tokens)})")

    primeros = [escena_de.index(i) for i in range(len(textos))]
    inicios = [0.0] + [max(0.0, tiempos[k][0] - 0.15) for k in primeros[1:]]
    total = _duracion(voz_wav) + PAUSA_FINAL
    plan = []
    for i in range(len(textos)):
        fin = inicios[i + 1] if i + 1 < len(textos) else total
        palabras = [{"w": tokens[k], "t": tiempos[k][0] - inicios[i], "d": tiempos[k][1] - tiempos[k][0]}
                    for k in range(len(tokens)) if escena_de[k] == i]
        dur = fin - inicios[i]
        # Una escena desproporcionada indica audio desalineado (pausas raras o trozos repetidos).
        if not (0.6 <= dur <= len(palabras) * SEG_POR_PALABRA_MAX + 2.5):
            raise RuntimeError(f"la escena {i + 1} quedó de {dur:.1f} s para {len(palabras)} palabras")
        plan.append({"inicio": inicios[i], "dur": dur, "palabras": palabras})
    return voz_wav, plan


def narrar(textos: list[str], voz: str, velocidad: str, tmp: Path, avisar: Aviso = print,
           estilo: str = "") -> tuple[Path, list[dict], str]:
    """Devuelve (audio de voz, plan de escenas, voz realmente usada)."""
    tmp.mkdir(parents=True, exist_ok=True)
    if voz.startswith("gemini:"):
        for intento in range(2):  # la repetición de Gemini es aleatoria: un segundo intento suele salir bien
            try:
                avisar(f"Voz {voz[7:]} (Gemini, intento {intento + 1})...")
                return (*_narrar_gemini(textos, voz[7:], velocidad, tmp, estilo), voz)
            except Exception as error:
                avisar(f"Gemini no sirvió: {str(error)[:100]}")
        avisar(f"Uso la voz de respaldo {nombre_voz(RESPALDO)}")
        voz = RESPALDO
    avisar(f"Voz {nombre_voz(voz)}...")
    return (*_narrar_edge(textos, voz, velocidad, tmp), voz)
