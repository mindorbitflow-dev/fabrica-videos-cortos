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
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import yaml

from src import animador, director, guionista, prim, render, revisor
from src import prim as prim_mod
from src.llm import LLMRouter

RAIZ = Path(__file__).resolve().parent.parent
PROYECTOS = RAIZ / "proyectos"
PLANTILLA = RAIZ / "plantilla"
NICHOS = RAIZ / "config" / "nichos.yaml"
MUSICA = RAIZ / "assets" / "musica"
HISTORIAL = RAIZ / "state" / "historial.json"  # se sube al repo: GitHub Actions empieza cada vez sin proyectos
VELOCIDAD = "+8%"
RONDAS_REVISION = 2  # veces que se rehace una escena con problemas detectados por el revisor


# ---------- nichos ----------
def cargar_nichos() -> dict:
    return yaml.safe_load(NICHOS.read_text(encoding="utf-8")) or {}


def guardar_nichos_texto(texto: str) -> None:
    """Valida antes de escribir: un YAML roto dejaría la fábrica sin nichos."""
    datos = yaml.safe_load(texto)
    if not isinstance(datos, dict) or not datos:
        raise ValueError("El archivo debe contener al menos un nicho.")
    for clave, n in datos.items():
        faltan = [c for c in ("nombre", "descripcion", "tono", "voz", "paleta") if not n.get(c)]
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
FIGURA_CIERRE = {"biologia": "celula", "cuerpo": "corazon", "ciencia": "planeta", "cotidiano": "gota",
                 "tecnologia": "engranaje", "dinero": "moneda", "mente": "neurona"}


def escena_cierre(nicho: str, enlace: str = "") -> Optional[dict]:
    """Tarjeta final que pide seguir la página: la arma el código (no la IA) con la frase `cierre` del nicho. La voz dice además el
    `enlace` del guion (una frase sin terminar que el gancho completa, para que el video encadene al repetirse en bucle)."""
    conf = cargar_nichos()[nicho]
    frase = str(conf.get("cierre", "")).strip()
    if not frase:
        return None
    color = conf["paleta"]["acento"]
    escena, _ = prim.validar({
        "fondo": {"tema": "oscuro"}, "escala": False,
        "camara": [{"t": 0, "x": 0, "y": 0, "ancho": 1100}, {"t": 6, "x": 0, "y": 0, "ancho": 950}],
        "capas": [
            {"tipo": "particulas", "x": 0, "y": 80, "r": 480, "n": 160, "tam": 2.5, "color": color, "duracion": 4, "semilla": 3},
            {"tipo": "figura", "modelo": FIGURA_CIERRE.get(nicho, "celula"), "x": 0, "y": 120, "tam": 360},
            {"tipo": "frase", "texto": frase.rstrip(".")[:60], "resaltar": ["síguenos"], "color": color, "desde": .2},
        ]})
    escena = prim.con_fondo_lejano(escena, color, False, 3)
    return {"voz": f"{frase} {enlace}".strip(), "visual": "tarjeta final para seguir la página", "html": "", "origen": "cierre",
            "prim": escena, "cierre": True}


def escribir_guion(p: dict, router: LLMRouter) -> dict:
    g = guionista.escribir_guion(router, cargar_nichos()[p["nicho"]], p["tema"])
    p.update({k: g[k] for k in ("titulo", "portada", "escenas", "caption", "hashtags", "avisos", "enlace")})
    cierre = escena_cierre(p["nicho"], g["enlace"])
    if cierre:
        p["escenas"].append(cierre)
    p["estado"] = "guion"
    return guardar(p)


def estilo_de(p: dict) -> str:
    """plano | ilustracion: los dos son diagramas animados; cambia el fondo. Lo define el nicho."""
    return cargar_nichos()[p["nicho"]].get("estilo", "plano")


def escena_lista(p: dict, i: int) -> bool:
    return bool(p["escenas"][i].get("prim"))


def _paleta_dibujo(p: dict) -> dict:
    paleta = cargar_nichos()[p["nicho"]]["paleta"]
    return {k: paleta[k] for k in ("principal", "secundario", "acento", "peligro", "ok")}


def _dibujar(p: dict, router: LLMRouter, indices: list[int], progreso=None,
             correcciones: Optional[dict[int, list[str]]] = None) -> None:
    paleta_dibujo = _paleta_dibujo(p)
    correcciones = correcciones or {}
    if progreso:
        progreso(0, f"Animando {len(indices)} escenas...")
    with ThreadPoolExecutor(max_workers=3) as pool:
        tareas = {pool.submit(animador.animar_escena, router, p, i, paleta_dibujo, estilo_de(p),
                              correcciones.get(i, []), p.get("reparto"), p.get("reparto_alias")): i for i in indices}
        for n, tarea in enumerate(as_completed(tareas), 1):
            i = tareas[tarea]
            e = p["escenas"][i]
            e["html"], e["origen"], e["prim"] = tarea.result()
            guardar(p)  # se guarda escena por escena: si algo falla no se pierde lo hecho
            if progreso:
                progreso(n / len(indices), f"Escena {i + 1} animada ({n} de {len(indices)})")


def revisar(p: dict, indices: list[int]) -> dict[int, list[str]]:
    return revisor.revisar(componer_html(p), [e["voz"] for e in p["escenas"]], indices)


def _acercar_debiles(p: dict, revision: dict[int, list[str]]) -> None:
    """Pasó (video de las ratas): la IA no agrandó el protagonista ni tras dos rondas de corrección. A esas escenas
    se les acerca la cámara en código y se vuelve a medir; se queda la versión acercada solo si quita el aviso de
    protagonista débil sin agregar otros problemas."""
    debiles = [i for i, probs in revision.items() if any(x.startswith(revisor.PROTAGONISTA_DEBIL) for x in probs)]
    antes = {}
    for i in debiles:
        cerca = prim.acercar(p["escenas"][i]["prim"], 1.6)
        if cerca:
            antes[i] = p["escenas"][i]["prim"]
            p["escenas"][i]["prim"] = cerca
    if not antes:
        return
    nueva = revisar(p, list(antes))
    for i, original in antes.items():
        sigue_debil = any(x.startswith(revisor.PROTAGONISTA_DEBIL) for x in nueva.get(i, []))
        if sigue_debil or len(nueva.get(i, [])) >= len(revision[i]):
            p["escenas"][i]["prim"] = original
        else:
            revision[i] = nueva.get(i, [])


def dirigir(p: dict, router: LLMRouter, indices: Optional[list[int]] = None, progreso=None) -> dict:
    """Da vida a las escenas indicadas (por defecto, las que faltan): la IA dirige la historia (qué pasa en cada escena y qué objetos hacen
    falta), los objetos se consiguen (biblioteca propia, ilustraciones abiertas o diseño de la IA verificado con visión) y el código arma
    las escenas del motor con rutas, cámara continua y paisajes planos. La tarjeta final la arma el código y no se toca."""
    if indices is None:
        indices = [i for i in range(len(p["escenas"])) if not escena_lista(p, i)]
    indices = [i for i in indices if not p["escenas"][i].get("cierre")]
    avisar = progreso or (lambda f, m: None)
    avisar(0, f"Dirigiendo la historia de {len(indices)} escenas...")
    color = cargar_nichos()[p["nicho"]]["paleta"]["acento"]
    escenas = director.dirigir(router, p, indices, carpeta(p), color, lambda m: avisar(0.5, m))
    for i, esc in escenas.items():
        e = p["escenas"][i]
        e["prim"], e["origen"], e["html"], e["revision"] = esc, "historia", "", []
    p["avisos"] += [f"tiene la escena {i + 1} como tarjeta de texto (no se logró un objeto fiable que concuerde con la voz)" for i in indices if not any(
        c["tipo"] in ("sprite",) for c in p["escenas"][i]["prim"]["capas"])]
    p["estado"] = "animado"
    avisar(1, "Historia lista")
    return guardar(p)


animar = dirigir  # nombre histórico que usa la interfaz


def animar_con_primitivas(p: dict, router: LLMRouter, indices: Optional[list[int]] = None, progreso=None) -> dict:
    """(Método anterior, ya no se usa en la fábrica) Anima con formas procedurales y las revisa midiendo el resultado real:
    las que tienen problemas (se salen, se enciman, quedan vacías...) se rehacen diciéndole a la IA qué
    corregir, hasta RONDAS_REVISION veces, quedándose siempre con la versión con menos problemas."""
    if indices is None:
        indices = [i for i in range(len(p["escenas"])) if not escena_lista(p, i)]
    if not p.get("reparto") and router.has_any:  # una vez por video: todas las escenas (y los reintentos) usan los mismos diseños
        if progreso:
            progreso(0, "Diseñando los personajes del video...")
        p["reparto"], p["reparto_alias"] = animador.disenar_reparto(router, p, _paleta_dibujo(p))
        guardar(p)
    _dibujar(p, router, indices, progreso)
    revision = revisar(p, indices)
    pendientes = list(indices)
    for ronda in range(RONDAS_REVISION):
        pendientes = [i for i in pendientes if revision.get(i)]
        if not pendientes:
            break
        if progreso:
            progreso(0, f"Revisión {ronda + 1}: corrigiendo escenas {', '.join(str(i + 1) for i in pendientes)}")
        antes = {i: (p["escenas"][i]["html"], p["escenas"][i]["origen"], p["escenas"][i]["prim"]) for i in pendientes}
        _dibujar(p, router, pendientes, None, {i: revision[i] for i in pendientes})
        nueva = revisar(p, pendientes)
        for i in pendientes:
            if len(nueva.get(i, [])) <= len(revision[i]):
                revision[i] = nueva.get(i, [])
            else:  # la corrección salió peor: se recupera la versión anterior
                e = p["escenas"][i]
                e["html"], e["origen"], e["prim"] = antes[i]
    _acercar_debiles(p, revision)
    for i in indices:
        p["escenas"][i]["revision"] = revision.get(i, [])
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


def _json_prim(p: dict, escena: dict) -> str:
    """Escena procedural o ilustrada (plantilla/primitivas.js) incrustada como JSON; "</" se escapa para
    no cerrar el <script>. La imagen de una escena ilustrada se incrusta como data URI: el HTML queda autocontenido."""
    prim = escena.get("prim")
    if not prim:
        return ""
    datos = json.dumps(prim_mod.con_imagenes(carpeta(p), prim), ensure_ascii=False).replace("</", "<\\/")
    return f'<script type="application/json" class="prim">{datos}</script>\n'


def componer_html(p: dict) -> str:
    """Documento autocontenido (CSS y motor en línea): sirve para la vista previa y para el render."""
    pal = cargar_nichos()[p["nicho"]]["paleta"]
    estilo = estilo_de(p)
    portada = html_portada(p.get("portada"))
    fa, fb, fc = pal["fondo"]
    r, g, b = (int(pal["principal"][i:i + 2], 16) for i in (1, 3, 5))
    css = (PLANTILLA / "base.css").read_text(encoding="utf-8")
    js = "\n".join((PLANTILLA / f).read_text(encoding="utf-8") for f in ("primitivas.js", "motor.js"))
    iconos = (PLANTILLA / "iconos.svg").read_text(encoding="utf-8")
    secciones = "\n".join(
        f'<section class="escena" data-voz="{htmlmod.escape(e["voz"], quote=True)}">\n{_json_prim(p, e)}{e.get("html") or ""}\n'
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
    html = carpeta(p) / "video.html"
    html.write_text(componer_html(p), encoding="utf-8")
    p["voz"] = voz or p.get("voz") or cargar_nichos()[p["nicho"]]["voz"]
    duracion, p["voz_usada"] = render.renderizar(html, mp4(p), p["voz"], velocidad, elegir_musica(musica), progreso)
    p["duracion"] = round(duracion, 1)
    p["verificacion"] = render.verificar_mp4(mp4(p))  # dimensiones, códecs, peso y final en silencio
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
    for aviso in p["avisos"]:  # los datos dudosos NO descartan el video: llega con el aviso (⚠️ en el correo) para que lo corrija una persona
        avisar(0.02, f"Aviso del guion (se entrega igual): {aviso[:160]}")
    dirigir(p, router, progreso=lambda f, m: avisar(0.05 + 0.45 * f, m))
    return renderizar(p, musica=musica, progreso=lambda f, m: avisar(0.5 + 0.5 * f, m))
