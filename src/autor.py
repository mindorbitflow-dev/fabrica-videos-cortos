"""Dibujante automático: escribe el guion y dibuja cada escena a medida (proyectos/<id>/escenas.js), mira sus propias hojas de contacto
y corrige. La fábrica solo le da nicho y tema y recibe el proyecto listo para renderizar. Dos motores, con las mismas reglas
(.claude/commands/video.md):
- Claude Code (programa `claude`, con sesión iniciada o CLAUDE_CODE_OAUTH_TOKEN): el de mejor calidad.
- Gemini (GEMINI_API_KEY, gratis): se usa cuando no está `claude`. Escribe el código de una vez y lo corrige viendo las hojas."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import time
from pathlib import Path

from src.llm import LLMRouter, is_auth_error

RAIZ = Path(__file__).resolve().parent.parent
REGLAS = RAIZ / ".claude" / "commands" / "video.md"
EJEMPLO = RAIZ / "ejemplos" / "pulpo"
KIT = RAIZ / "plantilla" / "kit.js"
LIMITE_MIN = 50  # guiones de 16-24 escenas: escribir, mirar las hojas y corregir
# Claude Code: solo lo que el procedimiento necesita (leer el kit y el ejemplo, escribir el guion y las escenas, pasos de run.py).
HERRAMIENTAS = "Read,Write,Edit,Glob,Grep,Bash(python run.py:*)"
RONDAS_GEMINI = 3          # revisiones con las hojas de contacto
GEMINI_TIMEOUT_MS = 600_000  # escribir ~25 KB de código tarda varios minutos
GEMINI_ESPERAS = (0, 30, 90)  # rondas sobre todos los modelos si están saturados o sin cupo


def disponible(router: LLMRouter) -> bool:
    return shutil.which("claude") is not None or bool(router.keys.get("gemini"))


def dibujar(nicho: str, tema: str, router: LLMRouter, avisar=print) -> str:
    """Devuelve el id del proyecto dibujado y revisado."""
    if shutil.which("claude"):
        return _con_claude(nicho, tema, avisar)
    return _con_gemini(nicho, tema, router, avisar)


# ---------- Claude Code ----------
def _con_claude(nicho: str, tema: str, avisar) -> str:
    from src import fabrica
    antes = {p["id"] for p in fabrica.listar()}
    avisar(f"El dibujante (Claude Code) trabaja en: {tema} (hasta {LIMITE_MIN} min)")
    try:
        r = subprocess.run([shutil.which("claude"), "-p", f"/video {nicho} {tema}", "--allowedTools", HERRAMIENTAS,
                            "--permission-mode", "acceptEdits"],
                           cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=LIMITE_MIN * 60)
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"el dibujante tardó más de {LIMITE_MIN} minutos")
    salida = (r.stdout or "").strip()
    print(salida[-1500:])
    nuevos = [p for p in fabrica.listar() if p["id"] not in antes and p.get("autor") and fabrica.escenas_js(p).exists()]
    if r.returncode != 0 or not nuevos:
        raise RuntimeError(f"el dibujante no entregó un proyecto (código {r.returncode}): {(r.stderr or salida)[-400:]}")
    return nuevos[0]["id"]  # listar() ordena del más nuevo al más viejo


# ---------- Gemini ----------
def _seccion(md: str, inicio: str, fin: str) -> str:
    return md[md.index(inicio):md.index(fin)].strip()


def _gemini(router: LLMRouter, partes: list, json_mode: bool = False) -> str:
    """Texto de la primera Gemini que responda (las "pro" primero: escriben mejor código; sin cupo pasan a las "flash")."""
    from google import genai
    clave = router.keys.get("gemini")
    if not clave:
        raise RuntimeError("falta GEMINI_API_KEY")
    cliente = genai.Client(api_key=clave, http_options={"timeout": GEMINI_TIMEOUT_MS})
    config = {"temperature": 0.6, "max_output_tokens": 65536}
    if json_mode:
        config["response_mime_type"] = "application/json"
    modelos = list(dict.fromkeys(["gemini-pro-latest", *router.gemini_models]))
    ultimo = None
    for espera in GEMINI_ESPERAS:
        if espera:
            print(f"[Dibujante] Gemini sin respuesta; reintento en {espera}s...")
            time.sleep(espera)
        for modelo in modelos:
            try:
                r = cliente.models.generate_content(model=modelo, contents=partes, config=config)
                if r.candidates and str(r.candidates[0].finish_reason).endswith("MAX_TOKENS"):
                    raise RuntimeError("respuesta cortada por límite de tokens")
                if r.text:
                    print(f"[Dibujante] respondió gemini/{modelo}")
                    return r.text
            except Exception as error:
                if is_auth_error(error):
                    raise
                ultimo = error
                print(f"[Dibujante] gemini/{modelo}: {str(error)[:120]}")
    raise RuntimeError(f"Gemini no respondió: {ultimo}")


def _codigo(texto: str) -> str:
    bloques = re.findall(r"```(?:javascript|js)?\s*\n(.*?)```", texto, re.S)
    codigo = max(bloques, key=len) if bloques else texto
    if "window.ESCENAS" not in codigo:
        raise RuntimeError("la respuesta no trae window.ESCENAS")
    return codigo.strip() + "\n"


def _imagen(ruta: Path):
    from google.genai import types
    return types.Part.from_bytes(data=ruta.read_bytes(), mime_type="image/jpeg")


PROMPT_GUION = """Eres guionista de videos cortos verticales de divulgación (estilo 1Cell1Life) en español neutro.
Escribe el guion de un video del nicho "{nombre}" ({descripcion}). Tono: {tono}
Tema: {tema}

{reglas}

La última escena debe decir exactamente: "{cierre}"
Ejemplo del formato y del nivel esperado (otro tema):
{ejemplo}

Responde SOLO el JSON del guion."""

PROMPT_ESCENAS = """Eres ilustrador y programador de animación en canvas 2D. Dibuja las escenas de un video corto vertical, estilo
1Cell1Life: ilustración vectorial cálida, hecha a medida para este tema, con un protagonista reconocible y siempre igual, movimiento
continuo y cámara que se acerca o se aleja. Nada de emojis, íconos genéricos ni pantallas de solo texto.

{reglas}

### Kit disponible como K (plantilla/kit.js, ya cargado; úsalo, no lo copies)
```js
{kit}
```

### Ejemplo completo de otro video: guion y su escenas.js (imita el nivel de detalle, la estructura y la calidad)
```json
{guion_ejemplo}
```
```js
{escenas_ejemplo}
```

### Guion de ESTE video ({n} escenas: window.ESCENAS debe tener exactamente {n} funciones, en este orden)
```json
{guion}
```
La escena 1 lleva encima la portada (texto grande entre y=860 y y=1240): pon al protagonista arriba.

Responde SOLO con el archivo escenas.js completo dentro de un bloque ```js."""

PROMPT_REVISION = """Revisa tu dibujo. Adjunto las hojas de contacto del video: 3 cuadros por escena (inicio, mitad, final), en orden, 6
columnas por fila (cada fila = 2 escenas). Los subtítulos y la portada los pone el motor, no tu código.
{errores}
Guion (qué debe verse en cada escena):
{escenas}

Lista de control:
{lista}

Si TODAS las escenas cumplen y no hay errores, responde solo: OK
Si no, di en 1-3 líneas qué corriges y devuelve el archivo escenas.js COMPLETO corregido en un bloque ```js.

Código actual:
```js
{codigo}
```"""


def _con_gemini(nicho: str, tema: str, router: LLMRouter, avisar) -> str:
    from src import fabrica
    from src.guionista import leer_json
    conf = fabrica.cargar_nichos()[nicho]
    md = REGLAS.read_text(encoding="utf-8")
    avisar(f"El dibujante (Gemini) escribe el guion: {tema}")
    guion = leer_json(_gemini(router, [PROMPT_GUION.format(
        nombre=conf["nombre"], descripcion=conf["descripcion"], tono=conf["tono"], tema=tema, cierre=conf.get("cierre", ""),
        reglas=_seccion(md, "## 1.", "## 2."), ejemplo=(EJEMPLO / "guion.json").read_text(encoding="utf-8"))], json_mode=True))
    guion["tema"] = tema
    p = fabrica.nuevo_de_autor(nicho, guion)
    n = len(p["escenas"])
    guion_txt = json.dumps({k: guion.get(k) for k in ("portada", "escenas")}, ensure_ascii=False, indent=1)

    avisar(f"El dibujante (Gemini) dibuja {n} escenas...")
    codigo = _codigo(_gemini(router, [PROMPT_ESCENAS.format(
        reglas=_seccion(md, "## 3.", "## 4."), kit=KIT.read_text(encoding="utf-8"),
        guion_ejemplo=(EJEMPLO / "guion.json").read_text(encoding="utf-8"),
        escenas_ejemplo=(EJEMPLO / "escenas.js").read_text(encoding="utf-8"), n=n, guion=guion_txt)]))
    lista = _seccion(md, "## 4.", "## 5.").split("\n", 2)[2]
    for ronda in range(1, RONDAS_GEMINI + 1):
        fabrica.escenas_js(p).write_text(codigo, encoding="utf-8")
        hojas, errores = fabrica.hoja(p)
        avisar(f"Revisión {ronda}: {len(errores)} errores de código; Gemini mira las hojas")
        aviso = ("ERRORES DE JAVASCRIPT (esas escenas salen en negro; corrígelos primero):\n" + "\n".join(errores)[:3000] + "\n") if errores else ""
        try:
            texto = _gemini(router, [PROMPT_REVISION.format(
                errores=aviso, escenas="\n".join(f"{i + 1}. voz: {e['voz']} | se ve: {e.get('visual', '')}" for i, e in enumerate(p["escenas"])),
                lista=lista, codigo=codigo), *map(_imagen, hojas)])
        except RuntimeError as error:  # sin cupo para revisar: se entrega lo que hay si no tiene errores
            if errores:
                raise
            avisar(f"No se pudo revisar ({error}); se entrega la versión actual")
            break
        if texto.strip().upper().startswith("OK") and not errores:
            avisar("El dibujante aprobó sus hojas")
            break
        try:
            codigo = _codigo(texto)
        except RuntimeError:
            if not errores:
                break
            raise
    else:
        fabrica.escenas_js(p).write_text(codigo, encoding="utf-8")
    _, errores = fabrica.hoja(p, por_escena=1)
    if errores:
        raise RuntimeError("el dibujo de Gemini sigue con errores: " + "; ".join(errores)[:400])
    return p["id"]
