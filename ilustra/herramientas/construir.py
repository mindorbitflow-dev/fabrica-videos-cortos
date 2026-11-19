#!/usr/bin/env python3
"""Concatena src/*.js (en el orden de carga normativo, ESPECIFICACION_F2 §3.1) en dist/ilustra.js: un único archivo para incluir con <script>.

Los módulos nuevos de la Fase 2 (marcados con * en la especificación) son opcionales: se omiten si todavía no existen.
Los de la Fase 1 son obligatorios: si falta uno, el script falla en lugar de generar un dist roto.
"""
import sys
from pathlib import Path
RAIZ = Path(__file__).resolve().parent.parent

# (nombre, opcional): opcional = módulo nuevo de la Fase 2
ORDEN = [("nucleo", False), ("geom3", True), ("pincel", False), ("pintura", True), ("luz", False), ("atmosfera", False),
         ("camara", False), ("esqueleto", False), ("rig25", True), ("dinamica", True), ("personaje", False), ("mano", True),
         ("cuerpo", True), ("ropa", True), ("cabeza25", True), ("pelo", True), ("personaje2", True), ("props", False),
         ("escenarios", False), ("elipsis", False), ("interaccion", True), ("escena", False),
         ("reparto", True), ("reparto_gente", True), ("reparto_fauna", True)]   # reparto de la fábrica de videos (opcional)

(RAIZ / "dist").mkdir(exist_ok=True)
partes, incluidos, omitidos = [], [], []
for nombre, opcional in ORDEN:
    ruta = RAIZ / "src" / f"{nombre}.js"
    if not ruta.exists():
        if not opcional:
            sys.exit(f"ERROR: falta el módulo obligatorio {ruta}")
        omitidos.append(nombre)
        continue
    incluidos.append(nombre)
    partes.append(f"/* ===== {nombre}.js ===== */\n" + ruta.read_text(encoding="utf-8"))
destino = RAIZ / "dist" / "ilustra.js"
destino.write_text("/* Ilustra — kit de ilustración animada (Canvas 2D). Archivo generado: no editar. */\n" + "\n".join(partes), encoding="utf-8")
print(destino)
print("incluidos:", ", ".join(incluidos))
if omitidos:
    print("omitidos (aún no existen):", ", ".join(omitidos))
