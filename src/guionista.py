"""Temas sin repetir (el banco del nicho o `LIBRE`), comprobación de muletillas en los guiones y lectura de JSON de las IA."""

from __future__ import annotations

import json
import random
import re
import unicodedata

from src.llm import LLMRouter

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


VACIAS = {"como", "funciona", "una", "uno", "unos", "unas", "los", "las", "del", "que", "por", "para", "con", "sin", "sus", "este",
          "esta", "caso", "porque", "pero", "mas", "muy", "hace", "the"}


def _claves(t: str) -> set[str]:
    """Palabras que identifican un tema (sin tildes, artículos ni "cómo funciona")."""
    return {w for w in re.findall(r"[a-z0-9]+", _norm(t)) if len(w) > 2 and w not in VACIAS}


def ya_usado(idea: str, usados: list[str]) -> bool:
    """¿La idea ya se hizo, aunque con otras palabras? ("El inodoro" ≈ "Cómo funciona un inodoro";
    "Amazon Prime y el laberinto para cancelarlo - la FTC" ≈ "...- la demanda del gobierno"): 60 % de sus palabras clave."""
    c = _claves(idea)
    if not c:
        return _normalizar(idea) in {_normalizar(u) for u in usados}
    return any(len(c & _claves(u)) / len(c) >= .6 for u in usados)


LIBRE = "LIBRE"   # "elige tú el tema": lo decide el dibujante (Claude Code) cuando se acaba la lista del nicho


def proponer_tema(router: LLMRouter, nicho: dict, usados: list[str], libre: bool = False) -> str:
    """Tema nuevo para el nicho: primero una idea del banco del nicho (config/nichos.yaml) que no se haya usado, porque son temas reales,
    concretos y verificables, y en orden (el banco va de más a menos viral); la IA solo propone cuando el banco se acabó (sus temas libres salían abstractos o con premisas inventadas)."""
    libres = [str(i) for i in nicho.get("ideas", []) if not ya_usado(str(i), usados)]
    if libres:  # al azar entre las que faltan: la lista se usa como banco, no como fila
        return random.choice(libres)
    if libre:   # lista agotada y hay Claude Code: él elige un tema real y viral que no se haya hecho
        return LIBRE
    if router.has_any:
        try:
            texto, _ = router.complete_any(PROMPT_TEMA.format(
                nombre=nicho["nombre"], descripcion=nicho["descripcion"],
                visual=VISUAL_TEMA.get(nicho.get("estilo", "plano"), VISUAL_TEMA["plano"]),
                ejemplos="; ".join(nicho.get("ideas", [])[:4]),
                usados="; ".join(usados[-60:]) or "ninguno"), max_tokens=300, temperature=0.95)
            tema = str(leer_json(texto).get("tema", "")).strip()
            if tema and not ya_usado(tema, usados):
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


def muletillas_en(g: dict) -> list[str]:
    portada = g.get("portada") or {}
    texto = _norm(" ".join([str(g.get("titulo", "")), str(g.get("caption", "")), str(portada.get("texto", "")),
                            str(portada.get("sub", ""))] + [str(e.get("voz", "")) for e in g.get("escenas", [])]))
    return [m for m in MULETILLAS if re.search(rf"\b{re.escape(_norm(m))}\b", texto)]
