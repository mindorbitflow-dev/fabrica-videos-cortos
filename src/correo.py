"""Envía el video terminado (o el aviso de error) a tu correo por Gmail SMTP.

Necesita en .env o en los secrets de GitHub:
  GMAIL_USUARIO      tu cuenta, ej. tunombre@gmail.com
  GMAIL_CLAVE_APP    contraseña de aplicación de 16 letras (myaccount.google.com/apppasswords)
  CORREO_DESTINO     opcional: a dónde enviarlo (por defecto, a la misma cuenta)
"""

from __future__ import annotations

import mimetypes
import os
import smtplib
import time
from email.message import EmailMessage

from src import fabrica, voces

MAX_ADJUNTO = 20 * 1024 * 1024  # Gmail admite 25 MB contando la codificación del adjunto
ESPERAS_REINTENTO = (30, 90, 180)  # segundos entre reintentos si Gmail falla de forma pasajera


def configurado() -> bool:
    return bool(os.getenv("GMAIL_USUARIO", "").strip() and os.getenv("GMAIL_CLAVE_APP", "").strip())


def _enviar(asunto: str, cuerpo: str, adjuntos: list[tuple[bytes, str]] = ()) -> None:
    """adjuntos = [(datos, nombre de archivo)]; el tipo se deduce de la extensión."""
    usuario = os.getenv("GMAIL_USUARIO", "").strip()
    clave = os.getenv("GMAIL_CLAVE_APP", "").replace(" ", "").strip()
    if not (usuario and clave):
        raise RuntimeError("Faltan GMAIL_USUARIO y GMAIL_CLAVE_APP para enviar el correo.")
    msg = EmailMessage()
    msg["From"] = usuario
    msg["To"] = os.getenv("CORREO_DESTINO", "").strip() or usuario
    msg["Subject"] = asunto
    msg.set_content(cuerpo)
    for datos, nombre in adjuntos:
        tipo, subtipo = (mimetypes.guess_type(nombre)[0] or "application/octet-stream").split("/")
        msg.add_attachment(datos, maintype=tipo, subtype=subtipo, filename=nombre)
    # Gmail a veces responde 421 "Temporary System Problem" o corta la conexión: es pasajero, y perder un video ya hecho por eso no vale la pena.
    for intento, espera in enumerate(ESPERAS_REINTENTO + (None,)):
        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=120) as smtp:
                smtp.login(usuario, clave)
                smtp.send_message(msg)
            return
        except (smtplib.SMTPResponseException, smtplib.SMTPServerDisconnected, OSError) as error:
            pasajero = not isinstance(error, smtplib.SMTPResponseException) or 400 <= error.smtp_code < 500
            if espera is None or not pasajero:
                raise
            print(f"[Correo] fallo pasajero ({str(error)[:80]}); reintento {intento + 1} en {espera} s")
            time.sleep(espera)


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
    adjuntos = []
    if video.stat().st_size <= MAX_ADJUNTO:
        adjuntos.append((video.read_bytes(), f"{p['id']}.mp4"))
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
    if portada.exists():
        adjuntos.append((portada.read_bytes(), f"portada_{p['id']}.jpg"))
    _enviar(f"🎬 {p['titulo']}", cuerpo, adjuntos)


def enviar_post(p: dict) -> bool:
    """Correo aparte con el post del mismo tema (imagen 1080x1350 + texto). Devuelve False si el video no trae post."""
    imagen, post = fabrica.post_jpg(p), p.get("post") or {}
    if not imagen.exists():
        return False
    texto = "\n\n".join(x for x in (post.get("caption", "").strip(), " ".join(post.get("hashtags", []))) if x)
    cuerpo = "\n".join([
        "Post listo para publicar 🖼️ (mismo tema que el video de hoy)", "",
        "──── TEXTO PARA PUBLICAR (cópialo) ────", texto, "",
        "Publícalo unas horas antes o después del video: lleva a la gente al video completo.",
    ])
    _enviar(f"🖼️ Post: {p['titulo']}", cuerpo, [(imagen.read_bytes(), f"post_{p['id']}.jpg")])
    return True


def enviar_personajes(rutas: list) -> None:
    """Paquete de imágenes de los personajes (posts y recortes PNG sin fondo)."""
    cuerpo = "\n".join([
        "Imágenes de Sombra y Tito para tus publicaciones 🔍🐷", "",
        "post_*.jpg → listas para publicar (1080x1350).",
        "recorte_*.png → personajes sin fondo, para armar tus propias piezas.",
    ])
    _enviar("🖼️ Personajes de Sombra de Evidencia", cuerpo, [(r.read_bytes(), r.name) for r in rutas])


def enviar_error(detalle: str, enlace: str = "") -> None:
    _enviar("❌ La fábrica de videos falló", f"No se pudo crear el video de esta hora.\n\n{detalle}\n\n{enlace}".strip())
