"""Interfaz Streamlit de la Fábrica de Videos Cortos Explicativos."""

import os
import sys

import streamlit as st
import streamlit.components.v1 as components

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src import fabrica, guionista, voces  # noqa: E402
from src.env import save_env  # noqa: E402
from src.llm import LLMRouter  # noqa: E402

st.set_page_config(page_title="Fábrica de Videos Cortos", page_icon="🎬", layout="wide")
st.markdown("""
<style>
  .main-header { font-size: 2.2rem; font-weight: 800; margin-bottom: 0;
    background: -webkit-linear-gradient(45deg, #00E5FF, #7FD1FF, #FFD23F);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .sub-header { color: #999; font-size: 1.05rem; margin-bottom: 18px; }
  .stButton>button { border-radius: 8px; font-weight: 700; }
  .tarjeta-estado { font-size: .8rem; color: #aaa; }
</style>""", unsafe_allow_html=True)

VOCES = list(voces.VOCES)
ESTADOS = {"nuevo": "🆕 Nuevo", "guion": "📝 Guion", "animado": "🎨 Animado", "listo": "✅ Listo"}


@st.cache_resource
def obtener_router() -> LLMRouter:
    return LLMRouter()


router = obtener_router()
nichos = fabrica.cargar_nichos()
ss = st.session_state
ss.setdefault("pid", None)
ss.setdefault("tema", "")


def nombre_nicho(clave: str) -> str:
    return nichos.get(clave, {}).get("nombre", clave)


def barra(texto_inicial: str):
    """Barra de progreso de Streamlit con la firma progreso(fracción, mensaje) de la fábrica."""
    b = st.progress(0.0, text=texto_inicial)
    return lambda f, m: b.progress(min(1.0, max(0.0, f)), text=m)


# ---------------- Barra lateral ----------------
with st.sidebar:
    st.header("⚙️ Ajustes")
    disponibles = router.available_providers()
    if disponibles:
        st.success("IA: " + ", ".join(disponibles))
    else:
        st.warning("Sin IA configurada: puedes escribir guiones a mano; las escenas usarán texto animado.")
    musicas = ["aleatoria", "ninguna"] + sorted(f.name for f in fabrica.MUSICA.glob("*")
                                                if f.suffix.lower() in (".mp3", ".wav", ".m4a", ".ogg"))
    musica = st.selectbox("🎵 Música de fondo", musicas,
                          help="Agrega pistas sin copyright (Biblioteca de audio de YouTube) en assets/musica")
    velocidad = st.select_slider("⏩ Velocidad de la voz", ["+0%", "+4%", "+8%", "+12%", "+16%", "+20%"], value="+8%")
    with st.expander("🔑 Claves de IA"):
        st.caption("Gratis: Gemini en aistudio.google.com · Groq en console.groq.com · OpenRouter en openrouter.ai")
        claves = {k: st.text_input(k, type="password", placeholder="sin cambios") for k in
                  ("GEMINI_API_KEY", "GROQ_API_KEY", "CUSTOM_LLM_API_KEY")}
        if st.button("Guardar claves"):
            nuevas = {k: v.strip() for k, v in claves.items() if v.strip()}
            if nuevas:
                save_env(nuevas)
                st.cache_resource.clear()
                st.rerun()
        if st.button("Probar IA"):
            for prov in router.available_providers():
                ok, motivo = router.ping(prov)
                (st.success if ok else st.error)(f"{prov}: {motivo}")

st.markdown('<p class="main-header">🎬 Fábrica de Videos Cortos Explicativos</p>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Temas → guion → gráficos animados en HTML → MP4 vertical con voz y subtítulos</p>',
            unsafe_allow_html=True)

tab_crear, tab_galeria, tab_lote, tab_nichos = st.tabs(["🎬 Crear", "🖼️ Galería", "🏭 Lote", "🧭 Nichos"])

# ---------------- Crear ----------------
with tab_crear:
    c1, c2 = st.columns([1, 2])
    nicho = c1.selectbox("Nicho", list(nichos), format_func=nombre_nicho)
    c1.caption(nichos[nicho]["descripcion"])
    if "tema_propuesto" in ss:  # el valor de un widget solo se puede fijar antes de dibujarlo
        ss.tema = ss.pop("tema_propuesto")
    tema = c2.text_input("Tema del video", key="tema", placeholder="Ej: Por qué el cielo es azul")
    b1, b2, b3 = c2.columns(3)
    if b1.button("🎲 Tema nuevo", width="stretch"):
        try:
            with st.spinner("Buscando un tema que no hayas usado..."):
                ss.tema_propuesto = guionista.proponer_tema(router, nichos[nicho], fabrica.temas_usados(nicho))
            st.rerun()
        except Exception as error:
            st.error(str(error))
    if b2.button("✍️ Guion con IA", type="primary", width="stretch", disabled=not tema.strip()):
        p = fabrica.nuevo_proyecto(nicho, tema)
        try:
            with st.spinner("Escribiendo guion..."):
                fabrica.escribir_guion(p, router)
        except Exception as error:
            st.error(f"La IA no pudo escribir el guion: {error}. Puedes escribirlo a mano abajo.")
        ss.pid = p["id"]
    if b3.button("📝 Guion manual", width="stretch", disabled=not tema.strip()):
        p = fabrica.nuevo_proyecto(nicho, tema)
        p["escenas"] = [{"voz": "", "visual": "", "html": ""} for _ in range(5)]
        ss.pid = fabrica.guardar(p)["id"]

    if not ss.pid or not (fabrica.PROYECTOS / ss.pid / "proyecto.json").exists():
        st.info("Elige un nicho y un tema (o pulsa 🎲), y genera el guion. También puedes abrir un video desde 🖼️ Galería.")
    else:
        p = fabrica.cargar(ss.pid)
        pid = p["id"]
        st.divider()
        st.subheader(f"{ESTADOS.get(p['estado'], p['estado'])} · {p['titulo']}")
        st.caption(f"{nombre_nicho(p['nicho'])} · tema: {p['tema']} · id: {pid}")
        for aviso in p.get("avisos", []):
            st.warning(f"El guion {aviso}. Revísalo antes de animar.")

        izq, der = st.columns([3, 2])
        with izq:
            st.markdown("#### 1. Guion")
            st.caption("⚠️ Verifica cada dato antes de publicar: los errores en los comentarios hunden un canal.")
            titulo = st.text_input("Título", p["titulo"], key=f"{pid}_titulo")
            nuevas = []
            for i, e in enumerate(p["escenas"]):
                with st.container(border=True):
                    origen = {"ia": "🎨 IA", "respaldo": "🔤 texto", "manual": "✋ manual"}.get(e.get("origen"), "⏳ sin animar")
                    st.markdown(f"**Escena {i + 1}** {'(gancho)' if i == 0 else ''} · {origen if e.get('html') else '⏳ sin animar'}")
                    voz = st.text_area("Narración", e["voz"], key=f"{pid}_voz_{i}", height=80)
                    visual = st.text_input("Qué se dibuja", e.get("visual", ""), key=f"{pid}_vis_{i}")
                    cc = st.columns(3)
                    borrar = cc[0].checkbox("Quitar escena", key=f"{pid}_del_{i}")
                    if cc[1].button("🔁 Rehacer animación", key=f"{pid}_re_{i}", disabled=not voz.strip()):
                        p["escenas"][i].update(voz=voz, visual=visual)
                        with st.spinner(f"Animando escena {i + 1}..."):
                            fabrica.animar(p, router, indices=[i])
                        st.rerun()
                    if not borrar:
                        # Si cambia lo que se dibuja, la animación anterior ya no sirve: queda pendiente.
                        html = "" if visual != e.get("visual", "") else e.get("html", "")
                        nuevas.append({**e, "voz": voz, "visual": visual, "html": html})
            caption = st.text_area("Descripción", p.get("caption", ""), key=f"{pid}_cap")
            hashtags = st.text_input("Hashtags", " ".join(p.get("hashtags", [])), key=f"{pid}_hash")
            g1, g2 = st.columns(2)
            if g1.button("💾 Guardar guion", width="stretch"):
                p.update(titulo=titulo, escenas=[e for e in nuevas if e["voz"].strip()], caption=caption,
                         hashtags=hashtags.split(), avisos=[])
                if p["estado"] == "nuevo":
                    p["estado"] = "guion"
                fabrica.guardar(p)
                st.success("Guardado.")
                st.rerun()
            if g2.button("➕ Añadir escena", width="stretch"):
                p["escenas"].append({"voz": "", "visual": "", "html": ""})
                fabrica.guardar(p)
                st.rerun()

        with der:
            st.markdown("#### 2. Animación")
            faltan = [i for i, e in enumerate(p["escenas"]) if not e.get("html")]
            if p["escenas"] and st.button(f"🎨 Animar {'escenas pendientes (' + str(len(faltan)) + ')' if faltan else 'todo de nuevo'}",
                                          type="primary", width="stretch"):
                fabrica.animar(p, router, indices=faltan or list(range(len(p["escenas"]))),
                               progreso=barra("Animando..."))
                st.rerun()
            if p["escenas"] and not faltan:
                st.caption("Vista previa (tiempos aproximados; el MP4 se sincroniza con la voz real). Clic = reiniciar.")
                components.html(fabrica.componer_html(p), height=640)

            st.markdown("#### 3. Video")
            voz_actual = p.get("voz") or nichos[p["nicho"]]["voz"]
            opciones = VOCES if voz_actual in VOCES else [voz_actual] + VOCES
            voz = st.selectbox("Voz", opciones, index=opciones.index(voz_actual), format_func=voces.nombre_voz,
                               key=f"{pid}_vozid", help="Gemini suena más natural (cupo gratis limitado). "
                               "Si falla, se usa Brian automáticamente.")
            if st.button("🎞️ Renderizar MP4", type="primary", width="stretch", disabled=bool(faltan) or not p["escenas"]):
                try:
                    p = fabrica.renderizar(p, voz=voz, velocidad=velocidad, musica=musica, progreso=barra("Preparando..."))
                except Exception as error:
                    st.error(f"Falló el render: {error}")
            if fabrica.mp4(p).exists() and p["estado"] == "listo":
                if p.get("voz_usada") and p["voz_usada"] != p.get("voz"):
                    st.warning(f"Gemini no estuvo disponible: este video salió con {voces.nombre_voz(p['voz_usada'])}. "
                               "Puedes volver a renderizarlo más tarde.")
                st.video(str(fabrica.mp4(p)))
                st.download_button("⬇️ Descargar MP4", fabrica.mp4(p).read_bytes(), f"{pid}.mp4", "video/mp4",
                                   width="stretch")
                st.markdown("**Texto para publicar** (botón de copiar arriba a la derecha):")
                st.code(fabrica.texto_publicacion(p), language=None)

# ---------------- Galería ----------------
with tab_galeria:
    proyectos = fabrica.listar()
    filtro = st.selectbox("Filtrar por nicho", ["todos"] + list(nichos), format_func=lambda k: "Todos" if k == "todos" else nombre_nicho(k))
    proyectos = [p for p in proyectos if filtro == "todos" or p["nicho"] == filtro]
    listos = sum(p["estado"] == "listo" for p in proyectos)
    st.caption(f"{len(proyectos)} proyectos · {listos} videos listos")
    cols = st.columns(4)
    for n, p in enumerate(proyectos):
        with cols[n % 4].container(border=True):
            if fabrica.miniatura(p).exists():
                st.image(str(fabrica.miniatura(p)), width="stretch")
            st.markdown(f"**{p['titulo']}**")
            st.markdown(f"<span class='tarjeta-estado'>{ESTADOS.get(p['estado'], p['estado'])} · {nombre_nicho(p['nicho'])}"
                        f"{' · ' + str(p['duracion']) + ' s' if p.get('duracion') else ''}</span>", unsafe_allow_html=True)
            a, b = st.columns(2)
            if a.button("✏️ Abrir", key=f"abrir_{p['id']}", width="stretch"):
                ss.pid = p["id"]
                st.toast("Abierto en la pestaña 🎬 Crear")
                st.rerun()
            if fabrica.mp4(p).exists():
                b.download_button("⬇️ MP4", fabrica.mp4(p).read_bytes(), f"{p['id']}.mp4", "video/mp4",
                                  key=f"dl_{p['id']}", width="stretch")
            with st.expander("Más"):
                if fabrica.mp4(p).exists():
                    st.video(str(fabrica.mp4(p)))
                    st.code(fabrica.texto_publicacion(p), language=None)
                if st.checkbox("Confirmo que quiero borrarlo", key=f"conf_{p['id']}"):
                    if st.button("🗑️ Eliminar proyecto", key=f"del_{p['id']}"):
                        fabrica.eliminar(p["id"])
                        if ss.pid == p["id"]:
                            ss.pid = None
                        st.rerun()

# ---------------- Lote ----------------
with tab_lote:
    st.markdown("Fabrica varios videos seguidos con temas nuevos (sin repetir). Cada uno tarda unos 4-6 minutos.")
    l1, l2 = st.columns(2)
    nicho_lote = l1.selectbox("Nicho", list(nichos), format_func=nombre_nicho, key="nicho_lote")
    cantidad = l2.number_input("Cantidad de videos", 1, 20, 3)
    temas_txt = st.text_area("Temas propios (uno por línea, opcional; si lo dejas vacío la IA los elige)")
    if st.button("🏭 Fabricar lote", type="primary", disabled=not router.has_any):
        temas = [t.strip() for t in temas_txt.splitlines() if t.strip()] or ["aleatorio"] * int(cantidad)
        resumen = []
        for n, t in enumerate(temas):
            with st.status(f"Video {n + 1}/{len(temas)}: {t}", expanded=True) as estado:
                try:
                    p = fabrica.fabricar(nicho_lote, t, router, musica=musica, progreso=barra("Empezando..."))
                    respaldos = sum(e.get("origen") == "respaldo" for e in p["escenas"])
                    estado.update(label=f"✅ {p['titulo']}" + (f" ({respaldos} escenas de texto)" if respaldos else ""),
                                  state="complete", expanded=False)
                    resumen.append(p["titulo"])
                except Exception as error:
                    estado.update(label=f"❌ {t}: {error}", state="error")
        st.success(f"Lote terminado: {len(resumen)} de {len(temas)} videos. Están en 🖼️ Galería.")
    if not router.has_any:
        st.info("El lote necesita una clave de IA (barra lateral → 🔑 Claves de IA).")

# ---------------- Nichos ----------------
with tab_nichos:
    st.markdown("Cada nicho define el tono, la voz, la frase de cierre, la **paleta de colores** y un banco de ideas. "
                "Cambiar la paleta entre nichos hace que tus videos no se vean todos iguales.")
    for clave, n in nichos.items():
        usados = fabrica.temas_usados(clave)
        pal = n["paleta"]
        muestras = "".join(f"<span style='display:inline-block;width:22px;height:22px;border-radius:5px;margin-right:4px;"
                           f"background:{c}'></span>" for c in [*pal["fondo"][:2], pal["acento"], pal["principal"], pal["secundario"]])
        with st.expander(f"{n['nombre']} · {len(usados)} videos"):
            st.markdown(muestras, unsafe_allow_html=True)
            st.caption(f"{n['descripcion']} · voz {voces.nombre_voz(n['voz'])}")
            if usados:
                st.markdown("**Temas ya usados:** " + " · ".join(usados))
    st.markdown("#### Editar nichos")
    texto = st.text_area("config/nichos.yaml", fabrica.NICHOS.read_text(encoding="utf-8"), height=420)
    if st.button("💾 Guardar nichos"):
        try:
            fabrica.guardar_nichos_texto(texto)
            st.success("Nichos guardados.")
            st.rerun()
        except Exception as error:
            st.error(f"No se guardó: {error}")
