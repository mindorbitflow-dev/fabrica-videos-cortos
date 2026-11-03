"""Orquestador: proyectos en disco (proyectos/<id>/proyecto.json), guion → animación → MP4."""

from __future__ import annotations

import datetime
import html as htmlmod
import json
import random
import re
import shutil
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import yaml

from src import animador, clips, guionista, render
from src.llm import LLMRouter

RAIZ = Path(__file__).resolve().parent.parent
PROYECTOS = RAIZ / "proyectos"
PLANTILLA = RAIZ / "plantilla"
NICHOS = RAIZ / "config" / "nichos.yaml"
MUSICA = RAIZ / "assets" / "musica"
HISTORIAL = RAIZ / "state" / "historial.json"  # se sube al repo: GitHub Actions empieza cada vez sin proyectos
VELOCIDAD = "+8%"


# ---------- nichos ----------
def cargar_nichos() -> dict:
    return yaml.safe_load(NICHOS.read_text(encoding="utf-8")) or {}


def guardar_nichos_texto(texto: str) -> None:
    """Valida antes de escribir: un YAML roto dejaría la fábrica sin nichos."""
    datos = yaml.safe_load(texto)
    if not isinstance(datos, dict) or not datos:
        raise ValueError("El archivo debe contener al menos un nicho.")
    for clave, n in datos.items():
        faltan = [c for c in ("nombre", "descripcion", "tono", "voz", "cta", "paleta") if not n.get(c)]
        faltan += [f"paleta.{c}" for c in ("fondo", "acento", "principal", "secundario", "peligro", "ok")
                   if not (n.get("paleta") or {}).get(c)]
        if faltan:
            raise ValueError(f"Al nicho '{clave}' le falta: {', '.join(faltan)}")
    NICHOS.write_text(texto, encoding="utf-8")


# ---------- proyectos ----------
def _slug(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()[:40] or "video"


def carpeta(p: dict) -> Path:
    return PROYECTOS / p["id"]


def guardar(p: dict) -> dict:
    carpeta(p).mkdir(parents=True, exist_ok=True)
    p["actualizado"] = datetime.datetime.now().isoformat(timespec="seconds")
    (carpeta(p) / "proyecto.json").write_text(json.dumps(p, ensure_ascii=False, indent=2), encoding="utf-8")
    return p


def cargar(pid: str) -> dict:
    return json.loads((PROYECTOS / pid / "proyecto.json").read_text(encoding="utf-8"))


def listar() -> list[dict]:
    proyectos = []
    for f in PROYECTOS.glob("*/proyecto.json"):
        try:
            proyectos.append(json.loads(f.read_text(encoding="utf-8")))
        except Exception as error:
            print(f"[Fábrica] {f} ilegible: {error}")
    return sorted(proyectos, key=lambda p: p.get("creado", ""), reverse=True)


def eliminar(pid: str) -> None:
    destino = (PROYECTOS / pid).resolve()
    if destino.parent != PROYECTOS.resolve():
        raise ValueError("id de proyecto inválido")
    shutil.rmtree(destino)


def leer_historial() -> list[dict]:
    try:
        return json.loads(HISTORIAL.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return []


def registrar_historial(p: dict) -> None:
    historial = [h for h in leer_historial() if h.get("id") != p["id"]]
    historial.append({"id": p["id"], "fecha": p.get("actualizado", p["creado"]), "nicho": p["nicho"],
                      "tema": p["tema"], "titulo": p["titulo"]})
    HISTORIAL.parent.mkdir(parents=True, exist_ok=True)
    HISTORIAL.write_text(json.dumps(historial, ensure_ascii=False, indent=1), encoding="utf-8")


def temas_usados(nicho: Optional[str] = None) -> list[str]:
    """Temas del historial (también los fabricados en GitHub) y de los proyectos locales, del más viejo al más nuevo."""
    entradas = [(h["fecha"], h["tema"], h["nicho"]) for h in leer_historial()]
    entradas += [(p.get("creado", ""), p["tema"], p.get("nicho")) for p in listar()]
    temas = [t for _, t, n in sorted(entradas) if nicho is None or n == nicho]
    return list(dict.fromkeys(temas))


def elegir_nicho(permitidos: Optional[list[str]] = None) -> str:
    """El nicho que lleva más tiempo sin video (los nunca usados primero)."""
    claves = [n for n in (permitidos or list(cargar_nichos())) if n in cargar_nichos()]
    if not claves:
        raise ValueError("Ninguno de los nichos indicados existe en config/nichos.yaml")
    ultimo = {h["nicho"]: h["fecha"] for h in sorted(leer_historial(), key=lambda h: h["fecha"])}
    return min(claves, key=lambda n: ultimo.get(n, ""))


def nuevo_proyecto(nicho: str, tema: str) -> dict:
    ahora = datetime.datetime.now()
    p = {"id": f"{ahora:%Y%m%d_%H%M%S}_{_slug(tema)}", "nicho": nicho, "tema": tema.strip(),
         "creado": ahora.isoformat(timespec="seconds"), "estado": "nuevo", "titulo": tema.strip(),
         "escenas": [], "caption": "", "hashtags": [], "avisos": [], "voz": cargar_nichos()[nicho]["voz"]}
    return guardar(p)


def mp4(p: dict) -> Path:
    return carpeta(p) / "video.mp4"


def miniatura(p: dict) -> Path:
    return carpeta(p) / "miniatura.jpg"


def portada_jpg(p: dict) -> Path:
    return carpeta(p) / "portada.jpg"


# ---------- pasos ----------
def escribir_guion(p: dict, router: LLMRouter) -> dict:
    g = guionista.escribir_guion(router, cargar_nichos()[p["nicho"]], p["tema"])
    p.update({k: g[k] for k in ("titulo", "portada", "escenas", "caption", "hashtags", "avisos")})
    p["estado"] = "guion"
    return guardar(p)


def estilo_de(p: dict) -> str:
    """plano | ilustracion | tipografia | video. El proyecto puede fijarlo; si no, manda el nicho."""
    return p.get("estilo") or cargar_nichos()[p["nicho"]].get("estilo", "plano")


def clip_escena(p: dict, i: int) -> Optional[Path]:
    """Archivo del clip de la escena. Se nombra por id de Pexels (no por posición) para que quitar o
    reordenar escenas en la app no deje clips corridos."""
    cid = p["escenas"][i].get("clip_id")
    return carpeta(p) / "clips" / f"{cid}.mp4" if cid else None


def escena_lista(p: dict, i: int) -> bool:
    if estilo_de(p) == "video":
        clip = clip_escena(p, i)
        return bool(clip and clip.exists())
    return bool(p["escenas"][i].get("html"))


def _buscar_clips(p: dict, indices: list[int], progreso=None) -> dict:
    """Estilo video: un clip real por escena (sin repetir; rehacer una escena trae otro distinto).
    Si Pexels no tiene nada, se reutiliza el clip de la escena anterior."""
    usados = {e["clip_id"] for e in p["escenas"] if e.get("clip_id")}
    descarga = carpeta(p) / "clips" / "descarga.mp4"
    for n, i in enumerate(indices):
        e = p["escenas"][i]
        # Sin búsqueda propia (o solo con palabras de gráficos) se usa la de la escena anterior: mismo tema visual.
        consulta = clips.limpiar_consulta(e.get("clip", "")) or (
            clips.limpiar_consulta(p["escenas"][i - 1].get("clip", "")) if i else "") or p["tema"]
        if progreso:
            progreso(n / max(1, len(indices)), f"Buscando clip para la escena {i + 1}: {consulta}")
        vid = clips.buscar(consulta, descarga, animador.duracion_estimada(e["voz"]), usados)
        if vid is not None:
            descarga.replace(descarga.with_name(f"{vid}.mp4"))
            usados.add(vid)
            e.update(clip_id=vid, origen="clip")
        elif i > 0 and escena_lista(p, i - 1):
            e.update(clip_id=p["escenas"][i - 1]["clip_id"], origen="clip repetido")
        else:
            raise RuntimeError(f"Pexels no encontró ningún clip para \"{consulta}\"")
        e["html"] = ""
        guardar(p)
    p["estado"] = "animado"
    return guardar(p)


def animar(p: dict, router: LLMRouter, indices: Optional[list[int]] = None, progreso=None) -> dict:
    """Anima las escenas indicadas (por defecto, las que aún no están listas)."""
    if indices is None:
        indices = [i for i in range(len(p["escenas"])) if not escena_lista(p, i)]
    estilo = estilo_de(p)
    if estilo == "video":
        return _buscar_clips(p, indices, progreso)
    paleta = cargar_nichos()[p["nicho"]]["paleta"]
    paleta_dibujo = {k: paleta[k] for k in ("principal", "secundario", "acento", "peligro", "ok")}
    if progreso:
        progreso(0, f"Animando {len(indices)} escenas...")
    with ThreadPoolExecutor(max_workers=3) as pool:
        tareas = {pool.submit(animador.animar_escena, router, p, i, paleta_dibujo, estilo): i for i in indices}
        for n, tarea in enumerate(as_completed(tareas), 1):
            i = tareas[tarea]
            p["escenas"][i]["html"], p["escenas"][i]["origen"] = tarea.result()
            guardar(p)  # se guarda escena por escena: si algo falla no se pierde lo hecho
            if progreso:
                progreso(n / len(indices), f"Escena {i + 1} animada ({n} de {len(indices)})")
    p["estado"] = "animado"
    return guardar(p)


def html_portada(portada: Optional[dict]) -> str:
    """Gancho gigante sobre la escena 1: texto con la(s) palabra(s) destacada(s) en color y una línea pequeña."""
    if not portada or not str(portada.get("texto", "")).strip():
        return ""
    texto = htmlmod.escape(portada["texto"].strip().upper())
    destacado = htmlmod.escape(str(portada.get("destacado", "")).strip().upper())
    if destacado and destacado in texto:
        i = texto.index(destacado)
        texto = f'{texto[:i]}<span class="destacado">{destacado}</span>{texto[i + len(destacado):]}'
    sub = htmlmod.escape(str(portada.get("sub", "")).strip())
    return f'<div class="portada"><div class="linea">{texto}</div>' + (f'<div class="sub">{sub}</div>' if sub else "") + "</div>"


def componer_html(p: dict) -> str:
    """Documento autocontenido (CSS y motor en línea): sirve para la vista previa y para el render."""
    pal = cargar_nichos()[p["nicho"]]["paleta"]
    estilo = estilo_de(p)
    portada = html_portada(p.get("portada"))
    fa, fb, fc = pal["fondo"]
    r, g, b = (int(pal["principal"][i:i + 2], 16) for i in (1, 3, 5))
    css = (PLANTILLA / "base.css").read_text(encoding="utf-8")
    js = (PLANTILLA / "motor.js").read_text(encoding="utf-8")
    iconos = (PLANTILLA / "iconos.svg").read_text(encoding="utf-8")
    secciones = "\n".join(
        f'<section class="escena" data-voz="{htmlmod.escape(e["voz"], quote=True)}">\n{e.get("html") or ""}\n'
        f'{portada if i == 0 else ""}</section>'
        for i, e in enumerate(p["escenas"]))
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>{htmlmod.escape(p['titulo'])}</title>
<style>{css}
:root {{ --fondo-a:{fa}; --fondo-b:{fb}; --fondo-c:{fc}; --acento:{pal['acento']}; --rejilla:rgba({r},{g},{b},.07); }}</style>
</head><body class="estilo-{estilo}"><div id="lienzo">
{iconos}
{secciones}
</div><script>{js}</script></body></html>"""


def elegir_musica(opcion: str) -> Optional[Path]:
    """'ninguna', 'aleatoria' o el nombre de un archivo de assets/musica."""
    pistas = sorted(f for f in MUSICA.glob("*") if f.suffix.lower() in (".mp3", ".wav", ".m4a", ".ogg"))
    if opcion == "ninguna" or not pistas:
        return None
    if opcion == "aleatoria":
        return random.choice(pistas)
    elegida = MUSICA / opcion
    return elegida if elegida in pistas else None


def renderizar(p: dict, voz: Optional[str] = None, velocidad: str = VELOCIDAD, musica: str = "aleatoria",
               progreso=None) -> dict:
    if not p["escenas"] or not all(escena_lista(p, i) for i in range(len(p["escenas"]))):
        raise RuntimeError("Primero anima todas las escenas.")
    fondos = [clip_escena(p, i) for i in range(len(p["escenas"]))] if estilo_de(p) == "video" else None
    html = carpeta(p) / "video.html"
    html.write_text(componer_html(p), encoding="utf-8")
    p["voz"] = voz or p.get("voz") or cargar_nichos()[p["nicho"]]["voz"]
    duracion, p["voz_usada"] = render.renderizar(html, mp4(p), p["voz"], velocidad, elegir_musica(musica), progreso, fondos)
    p["duracion"] = round(duracion, 1)
    render.miniatura(mp4(p), miniatura(p), min(2.0, p["duracion"] / 2))
    render.miniatura(mp4(p), portada_jpg(p), 0.5, ancho=1080)  # miniatura para subir al reel
    shutil.rmtree(carpeta(p) / "tmp_audio", ignore_errors=True)
    p["estado"] = "listo"
    guardar(p)
    registrar_historial(p)
    return p


def texto_publicacion(p: dict) -> str:
    return f"{p['titulo']}\n\n{p.get('caption', '')}\n\n{' '.join(p.get('hashtags', []))}".strip()


def fabricar(nicho: str, tema: Optional[str], router: LLMRouter, musica: str = "aleatoria", progreso=None) -> dict:
    """Todo el proceso de un video: tema (o aleatorio) → guion → animación → MP4."""
    avisar = progreso or (lambda f, m: print(f"[{f:4.0%}] {m}"))
    if not router.has_any:
        raise RuntimeError("La fabricación automática necesita una clave de IA (Ajustes en la barra lateral).")
    if not tema or tema.lower() == "aleatorio":
        avisar(0, "Eligiendo tema...")
        tema = guionista.proponer_tema(router, cargar_nichos()[nicho], temas_usados(nicho))
    p = nuevo_proyecto(nicho, tema)
    avisar(0.02, f"Escribiendo guion: {tema}")
    escribir_guion(p, router)
    animar(p, router, progreso=lambda f, m: avisar(0.05 + 0.45 * f, m))
    return renderizar(p, musica=musica, progreso=lambda f, m: avisar(0.5 + 0.5 * f, m))
