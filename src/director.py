"""Director de la historia: la IA decide qué pasa en cada escena (con el vocabulario fijo de historia.py) y de dónde sale cada objeto.

Tres fuentes de objetos, de más a menos fiable: la biblioteca propia (src/objetos.py, animada por partes), las ilustraciones abiertas
(src/emojis.py, para animales, cuerpo, comida y cosas cotidianas) y objetos que la IA diseña como piezas planas y se verifican con visión
(src/objetos_ia.py, para lo mecánico o específico). Lo que no se logra resolver se muestra como tarjeta de texto, nunca como un dibujo falso.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Callable, Optional

from src import animador, control, emojis, historia, objetos, objetos_ia, prim
from src.llm import LLMRouter


PROMPT_DIRECTOR = """Eres director de animación de un video corto explicativo hecho con objetos planos en movimiento (dibujo vectorial, sin fotos).
Cuenta en imágenes lo que dice la voz: lo que se ve debe ser lo que se escucha. Una historia, no una colección de diapositivas.

Video: {titulo}
Escenas (voz):
{escenas}

REPARTO: los objetos del video (entre 2 y 6; el protagonista se reutiliza en varias escenas). Para cada uno di de dónde sale:
- "propio": uno de estos, dibujados a mano y animados por partes: {propios}.
- "emoji": ilustración abierta para animales, el cuerpo, comida, plantas, símbolos y cosas cotidianas. "busqueda" = su nombre en inglés, de una o
  dos palabras, como en un emoji ("chicken", "microbe", "brain", "coin", "thermometer", "light bulb", "poultry leg").
- "ia": para objetos mecánicos o específicos que no son emoji (grifo, sartén, router...). "busqueda" = nombre en inglés y "descripcion" = cómo se
  ve, en español. NUNCA uses "ia" para animales, personas ni cosas orgánicas.
Cada objeto lleva "metros": su ancho real en metros (carro 4.4, pollo 0.3, microbio 0.000002).

ESCENAS (una por cada voz, mismo número "i"):
- "escenario": carretera (calles, vehículos) | campo (exterior, animales, naturaleza) | bosque (noche, misterio) | interior (casa, cocina, oficina)
  | oscuro (tecnología, mente, dinero, cuerpo por dentro, microscopio, ideas abstractas).
- "plano": general (se ve el entorno) | medio | cerrado (detalle). Varía de una escena a otra.
- "camara": sigue (acompaña al protagonista; solo con cruza_*, entra_*, sube, baja) | fija | acerca | aleja.
- "actores": 1 o 2 por escena; el primero es el protagonista. Cada uno: {{"ref", "accion", "pos", "tam", "giro"}}.
  accion: cruza_der | cruza_izq | entra_izq | entra_der | sube | baja | tiembla | gira | late | flota | quieto.
  pos: centro | izq | der | arriba | abajo (el protagonista va en centro). tam: 0.5 a 2 (1 = normal).
  giro: solo para carro, llanta y disco: vueltas por segundo (0 = detenido, una rueda bloqueada); si no, null.
- "rotulo": nombre del protagonista o de su parte clave, en MAYÚSCULAS, máximo 18 letras; "" si no ayuda.
- "numero": solo si la voz de esa escena dice una cifra: {{"valor": "15×", "texto": "por segundo"}}; si no, null.
- No repitas más de 2 escenas seguidas con el mismo escenario, plano y cámara.
- El LUGAR no es un objeto: carretera, calle, cielo, cocina, superficie, suelo o fondo se eligen en "escenario", NO se piden en el reparto.
  Para algo helado, mojado o caliente usa un objeto concreto (cubo de hielo, gota, llama) en el escenario que corresponda.
- CONCORDANCIA (lo más importante): el protagonista de cada escena debe SER el objeto que nombra la voz en esa escena. Si la voz habla de algo
  que no está en tu lista (una válvula, un sensor, un chip, un filtro...), NO uses un objeto parecido (un disco de freno no es una válvula):
  agrégalo al reparto como "ia" (mecánico o específico) o "emoji" (común). El rótulo solo puede nombrar lo que realmente se ve.

{correccion}
Responde SOLO con este JSON:
{{"reparto": [{{"ref": "carro", "origen": "propio", "busqueda": "", "descripcion": "", "metros": 4.4}}],
  "escenas": [{{"i": 1, "escenario": "carretera", "plano": "medio", "camara": "sigue",
               "actores": [{{"ref": "carro", "accion": "cruza_der", "pos": "centro", "tam": 1, "giro": null}}], "rotulo": "", "numero": null}}]}}"""


def _slug(texto: str) -> str:
    t = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_")[:30]


def _json_con(texto: str, claves: tuple[str, ...]) -> dict:
    """Primer objeto JSON de la respuesta que tenga todas las `claves` (los modelos gratuitos a veces añaden texto o varios objetos)."""
    texto = re.sub(r"^```(?:json)?|```$", "", texto.strip(), flags=re.M)
    decodificador, pos = json.JSONDecoder(), 0
    while (pos := texto.find("{", pos)) >= 0:
        try:
            objeto, fin = decodificador.raw_decode(texto, pos)
        except ValueError:
            pos += 1
            continue
        if isinstance(objeto, dict) and all(k in objeto for k in claves):
            return objeto
        pos = fin
    raise ValueError("la respuesta no trae " + " y ".join(claves))


def _numero_valido(num, voz: str) -> Optional[dict]:
    """La cifra en pantalla debe estar en la voz: un número que la voz no dice sería un dato inventado."""
    if not (isinstance(num, dict) and re.search(r"\d", str(num.get("valor", "")))):
        return None
    if not set(re.findall(r"\d+", str(num["valor"]))) <= set(re.findall(r"\d+", voz.replace(".", ""))):
        return None
    return {"valor": str(num["valor"]).strip()[:10], "texto": str(num.get("texto", "")).strip()[:28]}


def planear(router: LLMRouter, p: dict, indices: list[int], correccion: str = "") -> dict:
    """Plan de la IA: {"reparto": [...], "escenas": {indice: escena}}. Reintenta si la respuesta no sirve."""
    propios = ", ".join(f"{ref} ({objetos.objeto(ref)['metros']} m)" for ref in objetos.OBJETOS)
    escenas = "\n".join(f'{n + 1}. {p["escenas"][i]["voz"]}' for n, i in enumerate(indices))
    ultimo: Optional[Exception] = None
    for _ in range(3):
        try:
            texto, _prov = router.complete_any(PROMPT_DIRECTOR.format(titulo=p["titulo"], escenas=escenas, propios=propios, correccion=correccion),
                                               max_tokens=5000, temperature=0.5)
            plan = _json_con(texto, ("reparto", "escenas"))
            por_numero = {int(e["i"]) - 1: e for e in plan["escenas"] if isinstance(e, dict) and "i" in e}
            if not plan["reparto"] or len(por_numero) < 0.7 * len(indices):
                raise ValueError("el plan está incompleto")
            return {"reparto": plan["reparto"], "escenas": {indices[n]: por_numero[n] for n in por_numero if n < len(indices)}}
        except Exception as error:
            ultimo = error
            print(f"[Director] plan inválido: {type(error).__name__} {error}")
    raise RuntimeError(f"La IA no dirigió la historia: {ultimo}")


PROMPT_CONCORDANCIA = """Revisa una animación explicativa. Por cada escena se da lo que dice la voz y el objeto protagonista que se muestra.
Marca la escena como mal si:
- el objeto NO es lo que la voz nombra o describe en esa escena (un objeto parecido no vale: un disco de freno no es una válvula), o
- el rótulo contradice lo que se ve (el rótulo "LÍQUIDA" sobre un cubo de hielo sólido), o dice algo que el objeto no muestra, o
- el objeto no tiene nada que ver con el tema de la escena (un carro en una escena de química).
Está bien si el objeto es el que la voz nombra, o una representación natural y clara de la idea (un termómetro para la temperatura).
Escenas:
{escenas}
Responde SOLO JSON: {{"mal": [{{"i": 7, "falta": "nombre en inglés del objeto que haría falta"}}]}} (lista vacía si todo concuerda)."""


def revisar_concordancia(router: LLMRouter, p: dict, indices: list[int], plan: dict) -> dict[int, str]:
    """{índice de escena: objeto que faltaba} de las escenas cuyo protagonista no es lo que dice la voz, según una segunda opinión de la IA.
    Si la revisión falla no bloquea (devuelve {})."""
    por_ref = {_slug(r.get("ref", "")): r for r in plan["reparto"] if isinstance(r, dict)}
    lineas = []
    for n, i in enumerate(indices):
        e = plan["escenas"].get(i) or {}
        actores = e.get("actores") or []
        ref = _slug(actores[0].get("ref", "")) if actores and isinstance(actores[0], dict) else ""
        item = por_ref.get(ref, {})
        muestra = item.get("busqueda") or item.get("descripcion") or ref.replace("_", " ") or "nada"
        lineas.append(f'{n + 1}. voz: «{p["escenas"][i]["voz"]}» | muestra: {muestra} ({(actores[0].get("accion") if actores and isinstance(actores[0], dict) else "")}) | rótulo: {e.get("rotulo", "") or "(ninguno)"}')
    for intento in range(3):  # un modelo gratuito a veces responde con otro formato: se reintenta antes de dejar pasar las escenas
        try:
            texto, _ = router.complete_any(PROMPT_CONCORDANCIA.format(escenas="\n".join(lineas)), max_tokens=900, temperature=0)
            mal = _json_con(texto, ("mal",))["mal"]
            return {indices[int(m["i"]) - 1]: str(m.get("falta", "")).strip() for m in mal
                    if isinstance(m, dict) and 0 < int(m.get("i", 0)) <= len(indices)}
        except Exception as error:
            print(f"[Director] revisión de concordancia fallida (intento {intento + 1}): {error}")
    print("[Director] AVISO: no se pudo revisar la concordancia; las escenas se aceptan sin revisar")
    return {}


def resolver(router: LLMRouter, reparto: list[dict], carpeta: Path, avisar: Callable[[str], None] = lambda m: None,
             definiciones: Optional[dict] = None, fallidos: Optional[set] = None) -> tuple[dict[str, dict], set]:
    """(definiciones, fallidos). Definición de cada objeto del reparto: {"partes" | "imagen", "aspecto", "metros"}. Los de la biblioteca propia no
    hacen falta: historia.py los dibuja por nombre. Los objetos ya resueltos (o ya fallidos) en una ronda anterior no se repiten. Las ilustraciones
    abiertas se verifican con visión (una búsqueda por palabra suelta puede dar el emoji equivocado) y, si ninguna sirve, las diseña la IA."""
    (carpeta / "img").mkdir(parents=True, exist_ok=True)
    definiciones = {} if definiciones is None else definiciones
    fallidos = set() if fallidos is None else fallidos
    from src import vision
    for item in reparto:
        if not isinstance(item, dict) or not item.get("ref"):
            continue
        ref = _slug(item["ref"])
        if ref in objetos.OBJETOS or ref in definiciones or ref in fallidos:
            continue
        try:
            metros = float(item.get("metros"))
            metros = metros if 1e-7 <= metros <= 1e5 else 0.3
        except (TypeError, ValueError):
            metros = 0.3
        busqueda = str(item.get("busqueda") or ref.replace("_", " ")).strip()
        if item.get("origen") == "emoji":
            for conjunto, nombre in emojis.candidatos(busqueda)[:3]:
                datos = emojis.svg(conjunto, nombre)
                if not datos:
                    continue
                aceptado, visto = vision.verificar_objeto(router, objetos_ia.dibujar_svg(datos), busqueda)
                if aceptado is False:
                    avisar(f"{ref}: {conjunto}:{nombre} se ve como «{visto}», no es «{busqueda}»")
                    continue
                (carpeta / "img" / f"{ref}.svg").write_bytes(datos)
                definiciones[ref] = {"imagen": f"img/{ref}.svg", "aspecto": 1.0, "metros": metros}
                avisar(f"{ref}: ilustración abierta {conjunto}:{nombre}")
                break
            if ref in definiciones:
                continue
            avisar(f"{ref}: ninguna ilustración abierta sirve para «{busqueda}», la diseña la IA")
        try:
            objeto, _ = objetos_ia.disenar(router, ref.replace("_", " "), str(item.get("descripcion") or busqueda), esperado=busqueda, verbose=False)
        except Exception as error:
            print(f"[Director] {ref}: no se pudo diseñar: {error}")
            objeto = None
        if objeto:
            definiciones[ref] = {**objeto, "metros": metros}
            avisar(f"{ref}: diseñado por la IA y verificado")
        else:
            fallidos.add(ref)
            avisar(f"{ref}: sin objeto fiable")
    return definiciones, fallidos


def _escena_del_plan(e: dict, voz: str, definiciones: dict, indice: int, dur: float, color: str, portada: bool) -> dict:
    """Escena del motor a partir de lo que dijo la IA (limpiado contra el vocabulario). ValueError si no hay actor utilizable."""
    actores = []
    for a in (e.get("actores") or [])[:2]:
        ref = _slug(a.get("ref", "")) if isinstance(a, dict) else ""
        if not (ref in objetos.OBJETOS or ref in definiciones):
            continue
        try:
            tam = min(max(float(a.get("tam", 1)), .4), 2.5)
        except (TypeError, ValueError):
            tam = 1.0
        giro = a.get("giro")
        actores.append({"ref": ref, "accion": a.get("accion") if a.get("accion") in historia.ACCIONES else "quieto",
                        "pos": a.get("pos") if a.get("pos") in historia.POSICIONES else ("centro" if not actores else "der"), "tam": tam,
                        "giro": float(giro) if isinstance(giro, (int, float)) else None})
    if not actores:
        raise ValueError("ningún actor utilizable")
    actores[0]["pos"] = "centro"
    camara = e.get("camara") if e.get("camara") in historia.CAMARAS else "fija"
    if camara == "sigue" and actores[0]["accion"] not in ("cruza_der", "cruza_izq", "entra_izq", "entra_der", "sube", "baja"):
        camara = "acerca"  # no hay a quién seguir
    if actores[0]["accion"] in ("cruza_der", "cruza_izq"):
        camara = "sigue"  # con la cámara fija el protagonista saldría de la pantalla y quedaría solo el paisaje
    sb = {"escenario": e.get("escenario"), "plano": e.get("plano") if e.get("plano") in historia.PLANOS else "medio", "camara": camara,
          "actores": actores, "rotulo": re.sub(r"\s+", " ", str(e.get("rotulo") or "")).strip().upper()[:18],
          "numero": _numero_valido(e.get("numero"), voz)}
    return historia.escena(sb, definiciones, color, indice, dur, portada=portada)


def _escenas_sin_objeto(plan: dict, definiciones: dict, indices: list[int]) -> set[int]:
    """Escenas cuyo protagonista no es de la biblioteca propia ni se consiguió."""
    mal = set()
    for i in indices:
        actores = (plan["escenas"].get(i) or {}).get("actores") or []
        ref = _slug(actores[0].get("ref", "")) if actores and isinstance(actores[0], dict) else ""
        if not (ref in objetos.OBJETOS or ref in definiciones):
            mal.add(i)
    return mal


RONDAS = 3  # veces que la IA replantea la historia con lo que faltó o no concordó


def dirigir(router: LLMRouter, p: dict, indices: list[int], carpeta: Path, color: str, avisar: Callable[[str], None] = lambda m: None) -> dict[int, dict]:
    """Escenas del motor (índice → prim) para las escenas `indices` del guion. En cada ronda la IA planea la historia, otra pasada revisa que cada
    protagonista sea lo que dice la voz y se consiguen los objetos; lo que falló se le dice a la IA para que replantee con objetos más simples.
    Lo que tras RONDAS rondas sigue mal queda como tarjeta de texto (nunca un dibujo que no corresponde)."""
    definiciones: dict[str, dict] = {}
    fallidos: set[str] = set()
    correccion, mejor = "", None
    for ronda in range(RONDAS):
        plan = planear(router, p, indices, correccion)
        concordancia = revisar_concordancia(router, p, indices, plan)
        definiciones, fallidos = resolver(router, plan["reparto"], carpeta, avisar, definiciones, fallidos)
        mal = set(concordancia) | _escenas_sin_objeto(plan, definiciones, indices)
        if mejor is None or len(mal) < len(mejor[1]):
            mejor = (plan, mal, concordancia)
        if not mal:
            break
        partes = [f"escena {i + 1} necesitaba «{concordancia[i]}»" for i in sorted(concordancia)]
        if fallidos:
            partes.append("no se lograron dibujar estos objetos: " + ", ".join(sorted(fallidos)) + " (no los vuelvas a pedir: usa objetos más simples y comunes, "
                          "de preferencia \"emoji\", o muestra la idea con otro objeto que sí sea lo que dice la voz)")
        avisar(f"ronda {ronda + 1}: {len(mal)} escenas por mejorar")
        correccion = "\nCORRIGE tu versión anterior: " + "; ".join(partes) + "."
    plan, mal, concordancia = mejor
    p["plan_historia"] = {"reparto": plan["reparto"], "escenas": {str(i): e for i, e in plan["escenas"].items()}}
    escenas = {}
    for n, i in enumerate(indices):
        voz, dur = p["escenas"][i]["voz"], animador.duracion_estimada(p["escenas"][i]["voz"])
        try:
            if i in mal:
                raise ValueError("no hay un objeto fiable que sea lo que dice la voz")
            escenas[i] = _escena_del_plan(plan["escenas"][i], voz, definiciones, n, dur, color, portada=(n == 0))
        except Exception as error:
            avisar(f"escena {i + 1} como texto: {error}")
            escenas[i] = prim.escena_frase(voz, "oscuro", color, n, dur)
    rotulos = {i: str((plan["escenas"].get(i) or {}).get("rotulo") or "") for i in indices}
    for i, motivo in control.revisar(router, p, indices, escenas, rotulos, carpeta, avisar).items():   # control final sobre lo que se ve
        avisar(f"escena {i + 1} no pasó el control final ({motivo}): se muestra como texto")
        escenas[i] = prim.escena_frase(p["escenas"][i]["voz"], "oscuro", color, indices.index(i), animador.duracion_estimada(p["escenas"][i]["voz"]))
    return escenas  # las escenas sin objeto fiable ya son tarjetas de texto; quien llama avisa cuántas (el video se entrega igual)
