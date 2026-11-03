"""Envía el video terminado (o el aviso de error) a tu correo por Gmail SMTP.

Necesita en .env o en los secrets de GitHub:
  GMAIL_USUARIO      tu cuenta, ej. tunombre@gmail.com
  GMAIL_CLAVE_APP    contraseña de aplicación de 16 letras (myaccount.google.com/apppasswords)
  CORREO_DESTINO     opcional: a dónde enviarlo (por defecto, a la misma cuenta)
"""

from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage

from src import fabrica, voces

MAX_ADJUNTO = 20 * 1024 * 1024  # Gmail admite 25 MB contando la codificación del adjunto


def configurado() -> bool:
    return bool(os.getenv("GMAIL_USUARIO", "").strip() and os.getenv("GMAIL_CLAVE_APP", "").strip())


def _enviar(asunto: str, cuerpo: str, adjunto: tuple[bytes, str] | None = None,
            imagen: tuple[bytes, str] | None = None) -> None:
    usuario = os.getenv("GMAIL_USUARIO", "").strip()
    clave = os.getenv("GMAIL_CLAVE_APP", "").replace(" ", "").strip()
    if not (usuario and clave):
        raise RuntimeError("Faltan GMAIL_USUARIO y GMAIL_CLAVE_APP para enviar el correo.")
    msg = EmailMessage()
    msg["From"] = usuario
    msg["To"] = os.getenv("CORREO_DESTINO", "").strip() or usuario
    msg["Subject"] = asunto
    msg.set_content(cuerpo)
    if adjunto:
        datos, nombre = adjunto
        msg.add_attachment(datos, maintype="video", subtype="mp4", filename=nombre)
    if imagen:
        msg.add_attachment(imagen[0], maintype="image", subtype="jpeg", filename=imagen[1])
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=120) as smtp:
        smtp.login(usuario, clave)
        smtp.send_message(msg)


def enviar_video(p: dict, enlace_respaldo: str = "") -> None:
    video = fabrica.mp4(p)
    # Los avisos del guion (datos dudosos según el verificador, contrato incumplido) van primero: hay que
    # leerlos antes de publicar.
    avisos = [f"El guion {a}" for a in p.get("avisos", [])]
    if p.get("voz_usada") and p["voz_usada"] != p.get("voz"):
        avisos.append(f"Gemini no estuvo disponible: salió con la voz {voces.nombre_voz(p['voz_usada'])}.")
    respaldos = [str(i + 1) for i, e in enumerate(p["escenas"]) if e.get("origen") == "respaldo"]
    if respaldos:
        avisos.append(f"Escenas con texto animado en lugar de dibujo: {', '.join(respaldos)}.")
    # Lo que el revisor midió y no logró corregir, y lo que falló al verificar el MP4: hay que mirarlo antes de subir.
    for i, e in enumerate(p["escenas"]):
        for problema in e.get("revision") or []:
            avisos.append(f"Escena {i + 1}: {problema}.")
    avisos += [f"MP4: {problema}." for problema in p.get("verificacion") or []]
    adjunto = None
    if video.stat().st_size <= MAX_ADJUNTO:
        adjunto = (video.read_bytes(), f"{p['id']}.mp4")
    else:
        avisos.append(f"El video pesa demasiado para adjuntarlo. Descárgalo aquí: {enlace_respaldo or '(sin enlace)'}")
    nicho = fabrica.cargar_nichos().get(p["nicho"], {}).get("nombre", p["nicho"])
    cuerpo = "\n".join([
        "Tu nuevo video está listo para subir 📲", "",
        "──── TEXTO PARA PUBLICAR (cópialo) ────",
        fabrica.texto_publicacion(p), "",
        "──── DETALLES ────",
        f"Nicho: {nicho}",
        f"Duración: {p.get('duracion', '?')} s · Voz: {voces.nombre_voz(p.get('voz_usada') or p.get('voz', ''))}",
        *[f"⚠️ {a}" for a in avisos], "",
        "La imagen adjunta es la portada: úsala como miniatura del reel.",
        "Antes de publicar, revisa que los datos del video sean correctos.",
    ])
    portada = fabrica.portada_jpg(p)
    imagen = (portada.read_bytes(), f"portada_{p['id']}.jpg") if portada.exists() else None
    _enviar(f"🎬 {p['titulo']}", cuerpo, adjunto, imagen)


def enviar_error(detalle: str, enlace: str = "") -> None:
    _enviar("❌ La fábrica de videos falló", f"No se pudo crear el video de esta hora.\n\n{detalle}\n\n{enlace}".strip())
