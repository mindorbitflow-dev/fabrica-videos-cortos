# Informe: reparto de la fábrica de videos

Archivos nuevos (ninguno de la Fase 1 se tocó; `regresion.py` da OK en los 6 casos antes y después):
`src/reparto.js` (núcleo, Sombra, Tito), `src/reparto_gente.js` (gente de época y persona), `src/reparto_fauna.js` (patito, tiburón, serpiente),
`escenas/reparto.html`, `escenas/reparto_oficina.html`, `herramientas/ficha.py`. `construir.py`: una línea añadida (módulos opcionales; los hashes de F1 no cambian).
Cargar después de `personaje.js` (y `escena.js`).

## API
`Ilustra.REPARTO`: `.sombra(o)`, `.tito(o)`, `.gente('hombre'|'mujer'|'anciano'|'nino', o)`, `.patito(o)`, `.persona(o)`, `.tiburon(o)`, `.serpiente(o)`.
Todos: `p.dibujar(ctx, t, estado) -> J`, `p.poses` (nombres disponibles). Sirven como `personaje` de un actor de `I.Escena`.
- Opciones: `altura` (px; Sombra incluye el sombrero), `semilla`; persona/gente: `piel, pelo, peinado, ropa, pantalon, zapatos`; patito: `casco:'aviador'|'redondo'|false`; tiburón/serpiente: `largo`.
- Estado: `{x, y, dir, pose, pose2, k, expresion, mirada, habla, dist, alto, sombraSuelo, luz}`. `pose` = nombre, objeto de pose o función; con `pose2` y `k` mezcla.
- Poses: Sombra `dePie, camina, senalar, lupa, pensativo, sorprendido, explicar, cruzado`; Tito `dePie, camina, traeObjeto (estado.objeto: 'carpeta'|'sobre'|'caja'|función), triste, asombrado, senalar, saluda`;
  persona `dePie, camina, corre, saltar, caer, caerAtras, agacharse, protegerse, sentarse (con tronco), tendido, susto` (+ las de F1); patito `flotar, inclinarse, susto, celebrar`; tiburón `nada, ataca, acecha`; serpiente `repta, ataca, alerta`.
- Expresiones: las de F1 más `susto, asombro, grito, duda, risa, concentrado` (`REPARTO.EXPRESIONES`). `habla:0..1` abre la boca con ritmo determinista.
- Poses con objetivos relativos: `relManoD/I`, `relPieD/I = [ref, dx, dy]` (ref `suelo|cabeza|pelvis|hombros`, unidades de H, dy hacia abajo). `REPARTO.mezclar(a,b,k)` los mezcla (refs distintos incluidos).
- Extras de estado: Sombra/Tito `sombreroAlto`, `giroCabeza`; Tito `llevaObjeto`, `colita`; patito `inclinacion, pico, ala, ojos, agua`; tiburón `boca, agua, nivel`; serpiente `alza, boca, ataque`.
- Props: `REPARTO.props.tronco`, `REPARTO.props.periodico`.

## Render
`python3 herramientas/ficha.py [vista ...]` -> `salida/reparto/` (hoja_general, ficha_* con 2 poses, poses_sombra/tito/persona/animales, expresiones).
Video: `python3 herramientas/render.py escenas/reparto_oficina.html --todos --mp4 --salida salida/reparto/oficina` (6 s, 180 cuadros, ~145 ms/cuadro).

## Qué quedó bien
Sombra, Tito y el patito conservan la identidad de las referencias con volumen y luz de borde; las expresiones y poses principales se leen; el video se mezcla sin saltos (brazo derecho de Sombra por IK, Tito por FK).

## Límites y partes flojas (honesto)
- Sombra y Tito: torso frontal con cabeza de perfil/3-4 (como las referencias); no hay vista de frente ni de espalda. Manos de mitón con rayitas, sin dedos reales (solo "señalar" tiene índice).
- Mezclar una pose FK con una IK (relMano) hace un salto; el video evita esto definiendo versiones IK. Cambios de `prop` (lupa, objeto) conmutan a k=0.5.
- Los negros de Sombra se ven marrón oscuro bajo la luz cálida; el contraste con paredes oscuras es bajo. Piernas de Tito oscuras sobre suelo oscuro se pierden.
- Lupa: la mano tapa parte de la nariz; el mango apenas se ve. Cejas de Sombra/Tito son solo párpados (las diferencias entre triste/enfado/duda son sutiles).
- Gente y persona usan `Personaje` de F1: perfil, siluetas delgadas, una línea fina (pliegue del abrigo) se estira al correr/saltar; no se puede arreglar sin tocar F1. Pelo/gorras añadidos encima, no integrados. El bastón del anciano se desliza algo al caminar.
- Persona sentada necesita el tronco (se dibuja solo). Caer/tendido giran el cuerpo rígido (sin deformación). Sin sangre en ningún caso.
- Tiburón y serpiente son 2D estilizados de perfil, simples; el agua del tiburón es un parche con bordes difuminados, no una capa de escena.
- Hoja general: bien como índice; los fotogramas del video no se revisaron uno a uno (se vieron ~20).
