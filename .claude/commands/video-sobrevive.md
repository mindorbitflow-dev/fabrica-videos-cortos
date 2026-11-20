---
description: "¿Sobrevivirías?": una situación extrema ilustrada en 2D con una persona; el mito falla y esto es lo que te salva
argument-hint: "sobrevive <tema>"
---

Deja escrito, dibujado y revisado UN video de la página **¿Sobrevivirías?**, sin pedir confirmaciones ni hacer preguntas
(nadie está mirando: lo lanza la fábrica, `src/autor.py`, que después lo renderiza y lo envía por correo). `$ARGUMENTS` =
`sobrevive` y el tema. Todo lo que necesitas está aquí, en `plantilla/sobrevive2d.js` (librería `V`) y en `ejemplos/sobrevive/`: no leas otros
archivos.

**La página:** te pone en una situación extrema real (un ascensor que cae, un rayo, hielo que se rompe, una corriente que te
arrastra, el ataque de un animal) y te muestra ilustrado en 2D, con una persona, por qué lo que casi todos harían falla y qué te salva de verdad. Tono directo y
con tensión, en segunda persona ("tú"), frases cortas. La persona protagonista es "tú": camiseta amarilla (`#f4c430`) y
pantalón azul oscuro, siempre la misma.

## 1. Guion (`proyectos/guion_nuevo.json`)
- **Si el tema dice LIBRE** (lo normal en esta página), elígelo tú pensando en viralidad: una situación extrema real que la
  gente teme, ha visto en noticias o en películas, con un mito popular que falla y una respuesta comprobada que sorprende.
  Alterna tipos (máquinas, naturaleza, animales, agua, alturas, fuego) y no repitas ninguna de la lista de ya hechos. Pon en `tema` un nombre corto ("El rayo en campo
  abierto"): queda en el historial para no repetirlo.
- Formato: `{tema, titulo, portada: {texto, destacado, sub}, escenas: [{rol, voz, visual}], caption, hashtags}` como
  `ejemplos/sobrevive/guion.json`. Español neutro. **15-20 escenas, 170-240 palabras (60-85 s)**, frases de 5-16 palabras.
- **Gancho = la situación ya está pasando, con un número que aprieta:** "Tu ascensor se suelta en el piso 30. Tienes cuatro
  segundos." / "El hielo cruje bajo tus pies. Estás a 20 metros de la orilla." Nunca abras con contexto, años ni "¿sabías
  que…?". La escena 2 plantea el dilema en una pregunta (¿A o B?).
- Estructura (`rol`): `gancho` → `pregunta` (el dilema) → `mecanismo`: lo que casi todos harían y **por qué falla** (física o
  cuerpo humano, mostrado) → `reenganche` cada 3-4 escenas → `revelacion`: **lo que de verdad te salva** y por qué funciona →
  un **caso real** verificable si existe (persona, año, lugar) → `remate`: la instrucción corta para recordar ("al piso, boca
  arriba, y confía en los frenos") → `cierre`.
- **Consejos correctos o nada.** Lo que recomiendas debe coincidir con lo que dicen rescatistas, Cruz Roja, bomberos,
  servicios meteorológicos o la física; si hay debate, dilo ("muchos físicos recomiendan…"). Cifras con dígitos y redondas; si
  dudas de un dato, quítalo. Sin "sabías que", "increíble", "secreto", "descubre".
- **Sin morbo:** nada de sangre, heridas, cadáveres ni muertes mostradas. El golpe se corta con polvo, temblor o un cambio de
  plano; al final la persona siempre está bien. Solo accidentes, naturaleza y física: nada de crímenes, armas, violencia entre
  personas, suicidio ni autolesión.
- El video NO lleva título encima al empezar. Aun así llena `portada` (correo y post): 2-5 palabras con la presión del gancho
  ("TIENES 4 SEGUNDOS"), `destacado` = trozo literal de `texto`, `sub` = el dilema ("¿saltas o te acuestas?"). `titulo`: máx.
  60 caracteres con la situación y el dilema.
- `cierre`: el dilema como pregunta para comentar ("¿Tú qué habrías hecho: saltar o acostarte? Escríbelo en los
  comentarios."). `caption`: primera línea = gancho; termina con la misma pregunta. `hashtags`: 3-5.

## 2. Proyecto
`python run.py --nicho sobrevive --guion proyectos/guion_nuevo.json` imprime el id y la ruta de `proyectos/<id>/escenas.js`.

## 3. Dibujo 2D ilustrado (`proyectos/<id>/escenas.js`)
Léelo una vez: `plantilla/sobrevive2d.js` (cabecera = API de `V`) y `ejemplos/sobrevive/escenas.js`. **No se usan three.js, `T3` ni `P`.**
- `window.ESCENAS = [...]`: UNA función por escena, en orden: `(ctx, t, d, K, T) => V.cuadro(ctx, T, { x, y, z, tiembla, ... }, () => {...})`.
  `t` = segundos de la escena, `d` = su duración (anima con fracciones de `d`: `K.prog(t, a, b)`), `T` = segundos del video. Solo funciones del
  tiempo: **prohibido `Math.random()`, `Date` y estado entre cuadros.** El mundo es el cuadro de 1080x1920 px; los pies/base de todo están en (x, y).
- `V.cuadro(ctx, T, {x,y,z,rot,tiembla,rojo,flash,oscuro,luz}, fn)`: cámara (centro, zoom, giro, temblor en px) + acabado (luz cálida, viñeta, grano); varía el plano en cada escena.
- `V.tu(ctx, x, y, h, {pose, pose2, k, susto, dir, T, dist, mira, cara})`: tú (camiseta amarilla, pantalón azul oscuro, siempre igual), `h` = alto en px (550-700). Poses `dePie camina corre saltar caer caerAtras agacharse protegerse sentarse tendido susto senalar`; `pose2`+`k` interpola; `susto` 0-1.
- `V.animal(ctx, tipo, x, y, esc, {accion, dir, T, dist, boca, alto, ajuste})`: `tipo` oso perro lobo tigre puma toro cocodrilo tiburon serpiente; `esc` = px por metro (tú = h/1.7); `accion` quieto camina corre ataca erguido. **Corta antes del contacto** (polvo, temblor, cambio de plano): nunca mordidas ni heridas. `V.enjambre(ctx, T, {x,y,r,n,esc})` = abejas.
- `V.fondo(tipo, ctx, T, o)`: escenarios `pozo` (ascensor), `campo` (tormenta), `lago`, `rio`, `bosque`, `montana`, `interior` (sismo), `carretera`, `mar`, `desierto`, `incendio`, `plano` (diagramas y flechas). El suelo queda cerca de y=1250.
- Props: `V.ascensor` (cabina con tú dentro), `V.resorte`, `V.cable`, `V.rascacielos`, `V.edificio`, `V.auto`, `V.arbol`, `V.roca`, `V.bote`, `V.escalera`.
- Efectos: `V.lluvia`, `V.nieve`, `V.rayo`+`V.flash`, `V.humo`, `V.fuego`, `V.chispas`, `V.polvo`, `V.grietas` (hielo, muro), `V.burbujas`, `V.agua` (superficie con transparencia y olas: dibújala DESPUÉS de lo sumergido).
- Fuerzas: `V.flecha(ctx, x0, y0, x1, y1, {color, ancho, k})` (rojo `V.COL.peligro` = lo que te daña, verde `V.COL.ok` = lo que te salva) y `V.aro(ctx, x, y, r, T, {k})` para resaltar rodillas, cabeza, etc.
- **Zonas seguras:** subtítulos ARRIBA (y≈170-400, letras blancas: `V.cuadro` ya oscurece esa franja; deja el fondo sin detalles claros ahí). Lo importante (tú, el peligro) entre **y=300 y 1250 y x=80-940**; lo de abajo (y>1500) lo tapa la app. La escena 1 no lleva título: la situación se ve desde el primer cuadro. En la última escena la pregunta del sistema ocupa y≈420-1000: deja a la persona pequeña y abajo (y≈1500).
- **Sin rótulos ni textos** dentro de las escenas: se entiende por la imagen y la voz.
- **Paleta sobria y cálida** (azul-grisáceo, tierra, ámbar; rojo y verde apagados solo para daño/salvación): no inventes colores chillones; usa `V.COL`. El peligro debe verse claro por composición (tamaño, cámara, flecha), no por color saturado.
- Define primero helpers reutilizables (como `cabina()` del ejemplo) y úsalos en todas las escenas; cachea nada a mano (`V` ya cachea lo estático). Rendimiento: ≤ ~250 ms por cuadro; evita zooms > 2 con muchos brillos.
- Escribe el archivo de una vez, reutilizando funciones; nada de comentarios largos.

## 4. Revisión
`python run.py --hoja <id>` genera `proyectos/<id>/hojas/hoja_*.jpg` (inicio y final de cada escena) y lista los errores de
JavaScript. Ábrelas con Read y corrige lo que no cumpla: se reconoce lo que dice la voz; la persona se ve igual en todas las
escenas y entera cuando importa; nada cortado ni tapado por los subtítulos; nada de sangre ni heridas; ningún texto dentro de
las escenas; subtítulos legibles (franja superior oscura); algo cambia entre el inicio y el final. **Si no hay errores y todo se ve, una sola revisión basta.**

## 5. Entrega
No renderices: la fábrica lo hace. Termina con una sola línea `PROYECTO: <id>`.
