"""Orquestador: proyectos en disco (proyectos/<id>/proyecto.json), guion → animación → MP4."""

from __future__ import annotations

import base64
import datetime
import html as htmlmod
import json
import random
import re
import shutil
import unicodedata
from pathlib import Path
from typing import Optional

import yaml

from src import autor, guionista, render
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
                      "tema": p["tema"], "titulo": p["titulo"], **({"idea": p["idea"]} if p.get("idea") else {}),
                      **({"serie": p["serie"]} if p.get("serie") else {})})
    HISTORIAL.parent.mkdir(parents=True, exist_ok=True)
    HISTORIAL.write_text(json.dumps(historial, ensure_ascii=False, indent=1), encoding="utf-8")


def temas_usados(nicho: Optional[str] = None) -> list[str]:
    """Temas del historial (también los fabricados en GitHub) y de los proyectos locales, del más viejo al más nuevo."""
    # El dibujante reescribe el tema ("El inodoro" → "Cómo funciona un inodoro"): se guarda también la idea pedida.
    entradas = [(h["fecha"], t, h["nicho"]) for h in leer_historial() for t in (h.get("idea"), h["tema"]) if t]
    entradas += [(p.get("creado", ""), t, p.get("nicho")) for p in listar() for t in (p.get("idea"), p["tema"]) if t]
    temas = [t for _, t, n in sorted(entradas) if nicho is None or n == nicho]
    return list(dict.fromkeys(temas))


def nichos_pendientes(permitidos: Optional[list[str]] = None, horas: float = 6) -> list[str]:
    """Páginas activas (`auto`) que no tienen video en las últimas `horas`: así la ejecución de respaldo solo hace las que faltan."""
    nichos = cargar_nichos()
    claves = [n for n in (permitidos or [k for k, c in nichos.items() if c.get("auto", True)]) if n in nichos]
    limite = datetime.datetime.now() - datetime.timedelta(hours=horas)
    recientes = set()
    for h in leer_historial():
        try:
            if datetime.datetime.fromisoformat(str(h.get("fecha", ""))[:19]) >= limite:
                recientes.add(h.get("nicho"))
        except ValueError:
            pass
    return [n for n in claves if n not in recientes]


def serie_siguiente(nicho: str) -> Optional[str]:
    """Serie del nicho (`series` en nichos.yaml) que lleva más tiempo sin video; las nunca usadas, primero. Lo anterior a las series
    cuenta como la primera serie. None si el nicho no tiene series."""
    series = list(cargar_nichos().get(nicho, {}).get("series") or {})
    if not series:
        return None
    ultimo: dict[str, str] = {}
    for h in sorted((h for h in leer_historial() if h.get("nicho") == nicho), key=lambda h: h["fecha"]):
        ultimo[h.get("serie") if h.get("serie") in series else series[0]] = h["fecha"]
    return min(series, key=lambda s: ultimo.get(s, ""))


def elegir_nicho(permitidos: Optional[list[str]] = None) -> str:
    """El nicho que lleva más tiempo sin video (los nunca usados primero). Sin `permitidos` se saltan los nichos con `auto: false`."""
    nichos = cargar_nichos()
    claves = [n for n in (permitidos or [k for k, c in nichos.items() if c.get("auto", True)]) if n in nichos]
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


def post_jpg(p: dict) -> Path:
    return carpeta(p) / "post.jpg"


# ---------- pasos ----------
def estilo_de(p: dict) -> str:
    """plano | ilustracion: los dos son diagramas animados; cambia el fondo. Lo define el nicho."""
    return cargar_nichos()[p["nicho"]].get("estilo", "plano")


def escenas_js(p: dict) -> Path:
    """Escenas de autor: un archivo por video con window.ESCENAS = [(ctx, t, dur, K, T) => {...}, ...] (una función por escena del guion)."""
    return carpeta(p) / "escenas.js"


def escena_lista(p: dict, i: int) -> bool:
    return bool(p.get("autor"))   # las escenas están en escenas.js: sin él no hay nada que renderizar


def nuevo_de_autor(nicho: str, guion: dict) -> dict:
    """Proyecto a partir de un guion ya escrito ({tema, titulo, portada, escenas: [{voz}], caption, hashtags}) cuyas escenas se dibujan
    a medida en escenas.js. El guion pasa la misma comprobación de muletillas que los de la IA; lo que falle queda como aviso."""
    p = nuevo_proyecto(nicho, guion["tema"])
    p.update({k: guion[k] for k in ("titulo", "portada", "caption", "hashtags", "post", "serie") if guion.get(k)})
    p["escenas"] = [{"voz": e["voz"].strip(), "visual": e.get("visual", ""), "html": "", "origen": "autor"} for e in guion["escenas"]]
    p["avisos"] = guionista.muletillas_en({**guion, "escenas": guion["escenas"][:-1]})  # la última escena pide seguir la página
    if cargar_nichos()[nicho].get("formato") == "historia":
        p["avisos"] += _avisos_historia(guion)
    p["autor"], p["estado"] = True, "guion"
    return guardar(p)


def _avisos_historia(guion: dict) -> list[str]:
    """Lo que aleja un guion de Sombra de Evidencia de lo que Meta empuja (Reels de 35-70 s con final que pide comentar)."""
    escenas = guion.get("escenas") or []
    palabras = sum(len(str(e.get("voz", "")).split()) for e in escenas)
    avisos = []
    if palabras > 345:
        avisos.append(f"guion largo: {palabras} palabras (≈{round(palabras / 2.9)} s); lo ideal son 260-330 (95-120 s)")
    elif palabras < 250:
        avisos.append(f"guion corto: {palabras} palabras (≈{round(palabras / 2.9)} s); lo ideal son 260-330 (95-120 s)")
    if len(escenas) > 33 or len(escenas) < 25:
        avisos.append(f"{len(escenas)} escenas; lo ideal son 26-32")
    cifras = len(re.findall(r"\d[\d.,]*", " ".join(str(e.get("voz", "")) for e in escenas[:-1])))
    if cifras > 2:
        avisos.append(f"{cifras} cifras o años en la voz; deja una sola (la más fuerte) y pasa el resto a rótulos")
    if escenas and len(str(escenas[0].get("voz", "")).split()) > 14:
        avisos.append("la primera frase pasa de 14 palabras")
    primera = str(escenas[0].get("voz", "")).strip() if escenas else ""
    if re.match(r"(en |hace |antes |durante )?(el año )?\d{3,4}\b|antes de|había una vez", primera, re.I):
        avisos.append("la primera frase arranca con contexto o un año, no con el impacto")
    portada = str((guion.get("portada") or {}).get("texto", ""))
    if re.search(r"\b1[89]\d\d\b|\b20\d\d\b|caso real", portada, re.I):
        avisos.append("la portada es informativa (año o 'caso real'): debe acusar o doler")
    if guion.get("serie") == "mito" and not any(e.get("rol") == "veredicto" for e in escenas):
        avisos.append("la serie mito no trae una escena con rol veredicto (el sello MITO / VERDAD / MEDIA VERDAD)")
    final = str(escenas[-1].get("voz", "")) if escenas else ""
    if "?" not in final or re.search(r"\bs[ií]guenos\b", final, re.I):
        avisos.append("la última escena no es una pregunta para comentar")
    return avisos


def hoja(p: dict, por_escena: Optional[int] = None, avisos: Optional[list[str]] = None) -> tuple[list[Path], list[str]]:
    """Hojas de contacto del video (varios cuadros por escena, sin voz) para revisar el dibujo antes de renderizar.
    Devuelve (imágenes, errores de JavaScript de las escenas). Los avisos (escenas casi estáticas) no son errores: se imprimen y,
    si se pasa una lista, se añaden a ella."""
    if por_escena is None:   # `cuadros_hoja` del nicho, o inicio y final si usa el motor 2D (menos imágenes que revisar = menos uso del plan)
        conf = cargar_nichos()[p["nicho"]]
        por_escena = int(conf.get("cuadros_hoja") or (2 if conf.get("motor") == "2d" else 3))
    html = carpeta(p) / "video.html"
    html.write_text(componer_html(p), encoding="utf-8")
    hojas, errores, nuevos = render.hoja_contacto(html, carpeta(p) / "hojas", por_escena)
    for a in nuevos:
        print(f"AVISO: {a}")
    if avisos is not None:
        avisos.extend(nuevos)
    return hojas, errores


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


MARCA = RAIZ / "assets" / "marca"


def _html_marca(p: dict, marca: Optional[str], ultima: bool) -> str:
    """Capa de la marca: solo en la última escena, la tarjeta de cierre con el logo y el lema del nicho. Con `final: pregunta`
    (Sombra de Evidencia), en vez del lema va en grande la pregunta para comentar que dice la voz, sin subtítulo encima."""
    if not ultima:
        return ""
    logo = ("data:image/jpeg;base64," + base64.b64encode((MARCA / f"{marca}.jpg").read_bytes()).decode()) if marca else ""
    conf = cargar_nichos()[p["nicho"]]
    if conf.get("final") == "pregunta" and p.get("escenas"):
        pregunta = htmlmod.escape(p["escenas"][-1]["voz"].lstrip("—-– ").strip())
        img = f'<img src="{logo}" alt="">' if logo else ""
        lema = "" if logo or not conf.get("lema") else f'<div class="lema">{htmlmod.escape(str(conf["lema"]))}</div>'
        return (f'<div class="marca-cierre con-pregunta sin-subtitulo{"" if logo else " sin-logo"}">{img}'
                f'<div class="pregunta-final">{pregunta}</div>{lema}</div>')
    lema = htmlmod.escape(str(conf.get("lema", "")))
    return f'<div class="marca-cierre"><img src="{logo}" alt=""><div class="lema">{lema}</div></div>'


def componer_html(p: dict) -> str:
    """Documento autocontenido (CSS y motor en línea): sirve para la vista previa y para el render."""
    conf = cargar_nichos()[p["nicho"]]
    pal = conf["paleta"]
    estilo = "autor"
    marca = conf.get("marca")
    # `portada_en_video: false`: sin título encima al empezar; el video arranca directo en el gancho
    portada = html_portada(p.get("portada")) if conf.get("portada_en_video", True) else ""
    fa, fb, fc = pal["fondo"]
    r, g, b = (int(pal["principal"][i:i + 2], 16) for i in (1, 3, 5))
    css = (PLANTILLA / "base.css").read_text(encoding="utf-8")
    # las escenas de autor van antes que el motor, cada una en su <script>: un error de sintaxis no tumba el motor
    if conf.get("motor") == "2d":   # motor de ilustración 2D (sobrevive2d.js): sin las caricaturas de Sombra
        base = ["kit.js", "ilustra.js"] + list(conf.get("libs2d") or [])
    else:
        base = ["kit.js", "sombra.js"] + (["ilustra.js", "sombra_ilustra.js", "decorados.js"] if conf.get("personajes") == "ilustra" else [])
    scripts = [(PLANTILLA / f).read_text(encoding="utf-8") for f in base] + [escenas_js(p).read_text(encoding="utf-8"), (PLANTILLA / "motor.js").read_text(encoding="utf-8")]
    js = "".join("<script>" + s.replace("</script", "<\\/script") + "</script>\n" for s in scripts)
    n = len(p["escenas"])
    secciones = "\n".join(
        f'<section class="escena" data-voz="{htmlmod.escape(e["voz"], quote=True)}">\n'
        f'{_html_marca(p, marca, i == n - 1) if marca or conf.get("final") == "pregunta" else ""}{portada if i == 0 else ""}</section>'
        for i, e in enumerate(p["escenas"]))
    if marca:
        estilo += f" marca-{marca}"
    if conf.get("texto") == "oscuro":   # fondos claros (cielo, pasto): letras oscuras
        estilo += " texto-oscuro"
    if conf.get("subtitulos") == "arriba":   # subtítulos en la parte de arriba del video, sin borde ni relieve
        estilo += " subs-arriba"
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>{htmlmod.escape(p['titulo'])}</title>
<style>{css}
:root {{ --fondo-a:{fa}; --fondo-b:{fb}; --fondo-c:{fc}; --acento:{pal['acento']}; --rejilla:rgba({r},{g},{b},.07); }}</style>
</head><body class="estilo-{estilo}"><div id="lienzo">
{secciones}
</div>{js}</body></html>"""


def elegir_musica(opcion: str) -> Optional[Path]:
    """'ninguna', 'aleatoria' o el nombre de un archivo de assets/musica."""
    pistas = sorted(f for f in MUSICA.glob("*") if f.suffix.lower() in (".mp3", ".wav", ".m4a", ".ogg"))
    if opcion == "ninguna" or not pistas:
        return None
    if opcion == "aleatoria":
        return random.choice(pistas)
    elegida = MUSICA / opcion
    return elegida if elegida in pistas else None


def renderizar(p: dict, voz: Optional[str] = None, velocidad: str = VELOCIDAD, musica: str = "ninguna",
               progreso=None) -> dict:
    if not p["escenas"] or not all(escena_lista(p, i) for i in range(len(p["escenas"]))):
        raise RuntimeError("Primero anima todas las escenas.")
    html = carpeta(p) / "video.html"
    html.write_text(componer_html(p), encoding="utf-8")
    p["voz"] = voz or p.get("voz") or cargar_nichos()[p["nicho"]]["voz"]
    duracion, p["voz_usada"] = render.renderizar(html, mp4(p), p["voz"], velocidad, elegir_musica(musica), progreso,
                                                 cargar_nichos()[p["nicho"]].get("estilo_voz", ""))
    p["duracion"] = round(duracion, 1)
    p["verificacion"] = render.verificar_mp4(mp4(p))  # dimensiones, códecs, peso y final en silencio
    render.miniatura(mp4(p), miniatura(p), min(2.0, p["duracion"] / 2))
    render.miniatura(mp4(p), portada_jpg(p), 0.5, ancho=1080)  # miniatura para subir al reel
    shutil.rmtree(carpeta(p) / "tmp_audio", ignore_errors=True)
    if (p.get("post") or {}).get("pregunta") and cargar_nichos()[p["nicho"]].get("marca") and cargar_nichos()[p["nicho"]].get("post", True):
        try:  # el post es un extra: si falla, el video se entrega igual
            from src import personajes
            personajes.post(p["post"], carpeta(p))
        except Exception as error:
            p.setdefault("avisos", []).append(f"no se pudo dibujar el post: {error}")
    p["estado"] = "listo"
    guardar(p)
    registrar_historial(p)
    return p


def texto_publicacion(p: dict) -> str:
    return f"{p['titulo']}\n\n{p.get('caption', '')}\n\n{' '.join(p.get('hashtags', []))}".strip()


def fabricar(nicho: str, tema: Optional[str], router: LLMRouter, musica: str = "ninguna", progreso=None) -> dict:
    """Todo el proceso de un video: tema (o aleatorio) → el dibujante escribe el guion y dibuja cada escena a medida → MP4."""
    avisar = progreso or (lambda f, m: print(f"[{f:4.0%}] {m}"))
    if not autor.disponible(router):
        raise RuntimeError("No hay dibujante: instala `claude` (Claude Code) o pon GEMINI_API_KEY en .env.")
    if not tema or tema.lower() == "aleatorio":
        avisar(0, "Eligiendo tema...")
        conf = cargar_nichos()[nicho]
        if conf.get("temas") == "libre" and autor.con_claude():   # Claude elige siempre el tema; la lista solo sirve de ejemplo
            tema = guionista.LIBRE
        else:
            tema = guionista.proponer_tema(router, conf, temas_usados(nicho), libre=autor.con_claude())
    p = cargar(autor.dibujar(nicho, tema, router, lambda m: avisar(0.05, m)))
    if tema != guionista.LIBRE:
        p["idea"] = tema; guardar(p)   # la idea pedida queda en el historial aunque el guion cambie el tema
    _, errores = hoja(p, por_escena=2)
    if errores:  # una escena con error saldría en negro
        raise RuntimeError("el dibujo tiene errores: " + "; ".join(errores)[:400])
    return renderizar(p, musica=musica, progreso=lambda f, m: avisar(0.5 + 0.5 * f, m))
