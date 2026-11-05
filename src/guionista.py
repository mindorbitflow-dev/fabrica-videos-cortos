"""Guionista IA: propone temas sin repetir y escribe guiones con un contrato verificable."""

from __future__ import annotations

import json
import random
import re
import unicodedata

from src.llm import LLMRouter

ESCENAS_MIN, ESCENAS_MAX = 12, 18  # cambio de escena cada 5-8 s
PALABRAS_MIN, PALABRAS_MAX = 240, 380   # ≈ 80-135 s con la voz a +8 % (más la tarjeta de cierre): la duración de la referencia

PROMPT_GUION = """Eres guionista de videos cortos verticales (YouTube Shorts / TikTok) que explican un tema
como una historia animada de objetos planos en movimiento (un carro que cruza, un pollo que se cocina, una célula que late): cada escena muestra
algo concreto que PASA.

Nicho: {nombre}. {descripcion}
Tono: {tono}
Tema: {tema}

Reglas:
- Español latino neutro. Frases cortas y concretas, pensadas para leerse en voz alta.
- Entre {emin} y {emax} escenas, y entre {pmin} y {pmax} palabras de narración en total.
- Escena 1 = gancho: arranca directo con el dato que contradice lo que la gente cree, en la primera frase
  (nada de "hoy te voy a contar"). Máximo 22 palabras.
- Cada escena explica UNA sola idea que se pueda mostrar con un objeto concreto y reconocible haciendo algo (ver "visual").
  Frases de 12 a 25 palabras. Evita ideas que solo se puedan mostrar con formas abstractas o metáforas.
- Usa al menos una cifra concreta y verificable ("60 veces más larga", "26 horas"). Nombra un estudio (revista y año)
  SOLO si es muy conocido y estás seguro de él; si no, no menciones ninguno.
- Solo hechos ampliamente aceptados. No inventes cifras, fechas, estudios ni récords; si dudas de un dato, no lo uses.
- La última escena cierra con una consecuencia concreta o un dato práctico. NO pidas que te sigan, comenten
  o den like (la tarjeta final para seguir la página la agrega el sistema), y no termines con preguntas al público.
- BUCLE: el video se repite solo, y debe leerse sin corte. Escribe el campo "enlace": de 3 a 8 palabras que se dicen AL FINAL
  (después de la invitación a seguir la página) y que quedan SIN TERMINAR: acaban en una palabra como "que", "porque", "cuando", "y",
  "de", "el" o "la". La PRIMERA frase del video (el gancho) debe completar ese enlace con sentido, como si fuera una sola frase.
  Ej.: enlace "Y recuerda que" + gancho "pisar el freno a fondo bloquea las llantas". El gancho debe poder leerse como continuación.
- Escribe como alguien que sabe del tema y lo cuenta directo, con datos concretos (cifras, nombres de partes,
  causas). PROHIBIDO usar estas muletillas que hacen sonar genérico el video: {prohibidas}.
- "visual": UNA frase con lo que se VE literalmente en la ilustración de esa escena: el objeto, animal o parte del cuerpo
  y lo que hace. Ej.: "un pie pisando fuerte el pedal del freno de un carro"; "primer plano de una lengua con capa blanca".
  Nunca engranajes, chips, partículas ni células de adorno: solo lo que la voz dice en esa escena.

PORTADA (lo que se ve en el primer segundo y en la miniatura; es lo que decide si alguien mira el video):
- "texto": 2 a 5 palabras, máximo 24 letras, que choquen con lo que la gente cree. Fórmulas que funcionan:
  "NO X: Y" · "SIN X Y SIGUE" · "TU X HACE Y" · "LA MISMA X" · "X NO ES Y" · "NACE X, SE VUELVE Y".
  Ejemplos de estilo (otros temas): "NO DUERME: APAGA MEDIO CEREBRO" · "TU CEREBRO NO SIENTE DOLOR" ·
  "NACEN GRISES" · "TRES CORAZONES".
- "destacado": la palabra (o dos) del texto que se pinta en color: la del giro.
- "sub": 4 a 9 palabras en minúsculas que explican el giro, ej. "el flamenco se pinta con lo que come".
- Debe ser VERDAD: un gancho exagerado o falso destruye la confianza del público.
{extra}
Responde SOLO con este JSON:
{{"titulo": "título para YouTube, máximo 70 caracteres",
  "portada": {{"texto": "...", "destacado": "...", "sub": "..."}},
  "escenas": [{{"voz": "narración de la escena", "visual": "qué se dibuja"}}],
  "enlace": "3 a 8 palabras sin terminar que el gancho completa",
  "caption": "descripción de 1 o 2 frases con el dato central (sin muletillas)",
  "hashtags": ["#ejemplo", "... entre 3 y 5, específicos del tema (nada de #viral, #fyp, #parati, #curiosidades)"]}}"""

PROMPT_TEMA = """Propón UN tema nuevo para un video corto explicativo.
Nicho: {nombre}. {descripcion}
Debe ser algo concreto que la gente se pregunta, explicable en 60 a 90 segundos, y basado en hechos comprobables y
aceptados por la ciencia: NADA de temas que los expertos todavía debaten. {visual}
Ejemplos del estilo: {ejemplos}
NO repitas ni parafrasees ninguno de estos temas ya usados: {usados}
Responde SOLO JSON: {{"tema": "..."}}"""


VISUAL_TEMA = {
    "plano": "Debe poder CONTARSE como una historia de objetos concretos que se mueven y cambian (un carro que frena, un pollo que se cocina, "
             "una taza que se enfría). Evita procesos que solo ocurren a escala molecular o atómica y conceptos abstractos.",
}


def leer_json(texto: str) -> dict:
    texto = re.sub(r"^```(?:json)?|```$", "", texto.strip(), flags=re.M)
    inicio, fin = texto.find("{"), texto.rfind("}")
    if inicio < 0 or fin < 0:
        raise ValueError("la IA no devolvió JSON")
    return json.loads(texto[inicio:fin + 1])


def _norm(t: str) -> str:
    """Minúsculas y sin tildes, para comparar muletillas y hashtags ("Sígueme" = "sigueme")."""
    return unicodedata.normalize("NFKD", t.lower()).encode("ascii", "ignore").decode()


def _normalizar(t: str) -> str:
    return re.sub(r"[^a-z0-9ñ ]", "", t.lower()).strip()


def proponer_tema(router: LLMRouter, nicho: dict, usados: list[str]) -> str:
    """Tema nuevo para el nicho. Con IA si hay; si no, una idea del banco que no se haya usado."""
    vistos = {_normalizar(u) for u in usados}
    libres = [i for i in nicho.get("ideas", []) if _normalizar(i) not in vistos]
    if router.has_any:
        try:
            texto, _ = router.complete_any(PROMPT_TEMA.format(
                nombre=nicho["nombre"], descripcion=nicho["descripcion"],
                visual=VISUAL_TEMA.get(nicho.get("estilo", "plano"), VISUAL_TEMA["plano"]),
                ejemplos="; ".join(nicho.get("ideas", [])[:4]),
                usados="; ".join(usados[-60:]) or "ninguno"), max_tokens=300, temperature=0.95)
            tema = str(leer_json(texto).get("tema", "")).strip()
            if tema and _normalizar(tema) not in vistos:
                return tema
        except Exception as error:
            print(f"[Guionista] IA no propuso tema: {error}")
    if not libres:
        raise RuntimeError("Se acabaron las ideas del nicho y la IA no respondió. Agrega ideas en 🧭 Nichos.")
    return random.choice(libres)


# Muletillas que delatan contenido genérico hecho en serie (se piden evitar y se comprueban en el guion).
MULETILLAS = ["sabías que", "no vas a creer", "increíble", "secreto", "descubre", "impactante", "sorprendente",
              "fascinante", "alucinante", "misterio", "te explico", "en este video", "hoy te", "sígueme",
              "dale like", "comenta", "suscríbete", "quédate hasta el final", "nadie te contó", "lo que nadie",
              "te sorprenderá", "la próxima vez que", "brutal", "épico", "asombroso", "atención"]
HASHTAGS_GENERICOS = {"viral", "fyp", "parati", "foryou", "foryoupage", "curiosidades", "datoscuriosos",
                      "sabiasque", "shorts", "reels", "tiktok", "trending", "explore"}


def muletillas_en(g: dict) -> list[str]:
    portada = g.get("portada") or {}
    texto = _norm(" ".join([str(g.get("titulo", "")), str(g.get("caption", "")), str(portada.get("texto", "")),
                            str(portada.get("sub", ""))] + [str(e.get("voz", "")) for e in g.get("escenas", [])]))
    return [m for m in MULETILLAS if re.search(rf"\b{re.escape(_norm(m))}\b", texto)]


# Palabras con las que no se puede terminar una frase: obligan a seguir (el gancho del video las completa al repetirse).
CONECTORES = {"que", "porque", "cuando", "y", "o", "de", "del", "el", "la", "los", "las", "un", "una", "si", "como", "donde", "con", "para",
              "por", "a", "al", "en", "es", "son", "se", "tu", "tus", "su", "sus", "mientras", "aunque", "pero", "sin", "sobre", "entre"}


def problemas_guion(g: dict) -> list[str]:
    """Lo que incumple el contrato del guion (lista vacía = válido)."""
    escenas = g.get("escenas") or []
    errores = []
    if not (ESCENAS_MIN <= len(escenas) <= ESCENAS_MAX):
        errores.append(f"tiene {len(escenas)} escenas (deben ser {ESCENAS_MIN}-{ESCENAS_MAX})")
    if any(not str(e.get("voz", "")).strip() for e in escenas):
        errores.append("hay escenas sin narración")
    palabras = sum(len(str(e.get("voz", "")).split()) for e in escenas)
    if not (PALABRAS_MIN * 0.9 <= palabras <= PALABRAS_MAX * 1.1):
        errores.append(f"tiene {palabras} palabras (deben ser {PALABRAS_MIN}-{PALABRAS_MAX})")
    if escenas and len(str(escenas[0].get("voz", "")).split()) > 28:
        errores.append("el gancho (escena 1) es demasiado largo")
    if not str(g.get("titulo", "")).strip():
        errores.append("falta el título")
    usadas = muletillas_en(g)
    if usadas:
        errores.append("usa muletillas prohibidas: " + ", ".join(f'"{m}"' for m in usadas))
    enlace = str(g.get("enlace", "")).strip().rstrip(".,;:").split()
    if not 2 <= len(enlace) <= 9:
        errores.append("falta el 'enlace' (3 a 8 palabras sin terminar que el gancho completa)")
    elif _norm(enlace[-1]) not in CONECTORES:
        errores.append(f"el enlace \"{' '.join(enlace)}\" no queda sin terminar (debe acabar en que, porque, cuando, y, de, el, la...)")
    portada = g.get("portada") or {}
    texto = str(portada.get("texto", "")).strip()
    if not texto:
        errores.append("falta la portada")
    elif len(texto.split()) > 6 or len(texto) > 32:
        errores.append(f"la portada \"{texto}\" es muy larga (máximo 5 palabras)")
    elif str(portada.get("destacado", "")).strip().lower() not in texto.lower():
        errores.append("el 'destacado' de la portada no es una palabra del texto")
    return errores


PROMPT_VERIFICAR = """Eres verificador de datos científicos para videos de divulgación. Revisa este guion (portada incluida)
y señala SOLO afirmaciones falsas, mitos populares presentados como ciertos, o exageraciones que engañen.
Señala también errores de gramática u ortografía en la PORTADA (concordancia, tildes).
No señales simplificaciones razonables ni cuestiones de estilo.

{guion}

Responde SOLO JSON: {{"errores": [{{"tipo": "dato" o "ortografia", "frase": "copia EXACTA de la frase del guion", "problema": "por qué es falso", "correccion": "dato correcto"}}]}}
("dato" = afirmación falsa o engañosa; "ortografia" = gramática, tildes o mayúsculas)
(lista vacía si todo es correcto)."""


def _aviso_real(e, texto: str) -> bool:
    """Descarta avisos inventados por el verificador: pasó que citó frases que no estaban en el guion (copiaba el
    ejemplo del prompt) o que no explicó el problema. Cuenta si al menos el 70 % de las palabras de la frase
    citada aparece en el guion."""
    if not isinstance(e, dict) or not str(e.get("frase", "")).strip() or not str(e.get("problema", "")).strip():
        return False
    palabras = set(_normalizar(_norm(texto)).split())
    citadas = _normalizar(_norm(str(e["frase"]))).split()
    return bool(citadas) and sum(w in palabras for w in citadas) / len(citadas) >= 0.7


def verificar_datos(router: LLMRouter, g: dict) -> list[dict]:
    """Segunda opinión de la IA sobre los hechos del guion. Si el verificador falla, no bloquea (lista vacía)."""
    portada = g.get("portada") or {}
    texto = f"PORTADA: {portada.get('texto', '')} ({portada.get('sub', '')})\n" + "\n".join(
        f"{i + 1}. {e.get('voz', '')}" for i, e in enumerate(g.get("escenas", [])))
    for intento in range(2):  # una respuesta mal formada (pasó) dejaba el guion sin verificar
        try:
            respuesta, _ = router.complete_any(PROMPT_VERIFICAR.format(guion=texto), max_tokens=1500, temperature=0.1)
            return [e for e in leer_json(respuesta).get("errores", []) if _aviso_real(e, texto)]
        except Exception as error:
            print(f"[Guionista] no se pudo verificar (intento {intento + 1}): {error}")
    return []


def escribir_guion(router: LLMRouter, nicho: dict, tema: str) -> dict:
    """Guion validado (contrato + verificación de datos). Reintenta explicando a la IA qué corregir."""
    # Cada intento se guarda: corregir un error a veces rompe otra cosa (pasó: al quitar un dato dudoso el
    # guion quedó en 78 palabras), así que al final se elige el MEJOR intento, no el último.
    extra, intentos, proveedor = "", [], ""
    for _ in range(3):
        texto, proveedor = router.complete_any(PROMPT_GUION.format(
            nombre=nicho["nombre"], descripcion=nicho["descripcion"], tono=nicho["tono"], tema=tema,
            emin=ESCENAS_MIN, emax=ESCENAS_MAX, pmin=PALABRAS_MIN, pmax=PALABRAS_MAX,
            prohibidas=", ".join(f'"{m}"' for m in MULETILLAS), extra=extra), max_tokens=3000)
        try:
            g = leer_json(texto)
        except Exception as error:
            extra = f"\nTu respuesta anterior no era JSON válido ({error})."
            continue
        errores = problemas_guion(g)
        if errores:
            intentos.append((g, errores, None))
            extra = "\nCORRIGE: tu versión anterior " + "; ".join(errores) + "."
            continue
        # Pasó en la demo del microondas: el guion presentaba un mito ("calienta de adentro hacia afuera").
        dudosos = verificar_datos(router, g)
        intentos.append((g, [], dudosos))
        if not dudosos:
            break
        extra = "\nCORRIGE ESTOS ERRORES DE DATOS de tu versión anterior (no los repitas, ni en la portada):\n" + "\n".join(
            f"- \"{d['frase']}\": {d.get('problema', '')}. Correcto: {d.get('correccion', '')}" for d in dudosos)
    if not intentos:
        raise RuntimeError("La IA no devolvió un guion válido.")
    # Mejor = cumple el contrato, luego menos datos dudosos, luego menos incumplimientos.
    ultimo, errores, dudosos = min(intentos, key=lambda x: (bool(x[1]), len(x[2] or []), len(x[1])))
    if dudosos is None:  # ningún intento cumplió el contrato: igual se revisan los datos del elegido
        dudosos = verificar_datos(router, ultimo)
    return {
        "titulo": str(ultimo.get("titulo", tema)).strip()[:100],
        "portada": {k: str((ultimo.get("portada") or {}).get(k, "")).strip() for k in ("texto", "destacado", "sub")},
        "escenas": [{"voz": str(e.get("voz", "")).strip(), "visual": str(e.get("visual", "")).strip(), "html": ""}
                    for e in ultimo.get("escenas", [])],
        "enlace": " ".join(str(ultimo.get("enlace", "")).split()).strip(),
        "caption": str(ultimo.get("caption", "")).strip(),
        "hashtags": [h for h in (str(x).strip() for x in ultimo.get("hashtags", []))
                     if h and _norm(h.lstrip("#")) not in HASHTAGS_GENERICOS][:5],
        "avisos": errores + [f"tiene {'un error de ortografía' if d.get('tipo') == 'ortografia' else 'un dato dudoso'}: "
                             f"\"{d['frase']}\" ({d.get('problema', '')})" for d in dudosos],
        "proveedor": proveedor,
    }
