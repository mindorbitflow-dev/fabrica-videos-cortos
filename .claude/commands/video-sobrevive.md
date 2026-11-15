---
description: "¿Sobrevivirías?": una situación extrema en 3D con personas; el mito falla y esto es lo que te salva
argument-hint: "sobrevive <tema>"
---

Deja escrito, dibujado y revisado UN video de la página **¿Sobrevivirías?**, sin pedir confirmaciones ni hacer preguntas
(nadie está mirando: lo lanza la fábrica, `src/autor.py`, que después lo renderiza y lo envía por correo). `$ARGUMENTS` =
`sobrevive` y el tema. Todo lo que necesitas está aquí, en `plantilla/taller3d.js` y en `ejemplos/sobrevive/`: no leas otros
archivos.

**La página:** te pone en una situación extrema real (un ascensor que cae, un rayo, hielo que se rompe, una corriente que te
arrastra) y te muestra en 3D, con una persona, por qué lo que casi todos harían falla y qué te salva de verdad. Tono directo y
con tensión, en segunda persona ("tú"), frases cortas. La persona protagonista es "tú": camiseta amarilla (`#f4c430`) y
pantalón azul oscuro, siempre la misma.

## 1. Guion (`proyectos/guion_nuevo.json`)
- **Si el tema dice LIBRE**, elígelo tú: una situación extrema real que la gente teme o ve en noticias, con un mito popular que
  falla y una respuesta comprobada, que no esté en la lista de ya hechos. Pon en `tema` un nombre corto ("El rayo en campo
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

## 3. Dibujo 3D (`proyectos/<id>/escenas.js`)
Léelo una vez: `plantilla/taller3d.js` (API de `T3` y `P`, incluida `P.persona`) y `ejemplos/sobrevive/escenas.js`.
- `window.ESCENAS = [...]`: UNA función por escena, en orden: `(ctx, t, d, K, T) => T3.cuadro(ctx, T, { camara, mundo },
  P => {...})`. `t` = segundos de la escena, `d` = su duración (anima con fracciones de `d`), `T` = segundos del video. Solo
  funciones del tiempo: prohibido `Math.random()`, `Date` y estado entre cuadros.
- **La persona:** `P.persona({ pose, pos, rot, T, susto, inclina, art, colores })` con poses `parado`, `camina`, `corre`,
  `salta`, `cae`, `agachado`, `protege`, `sentado`, `acostado` (boca arriba). Usa siempre los mismos colores (función
  `persona()` del ejemplo). `susto` 0-1 en el peligro; `art` para ajustar brazos y piernas a mano.
- Define primero el escenario como funciones reutilizables (como `pozo()` y `cabina()` del ejemplo) y úsalas en todas las
  escenas. Formas con `caja`, `cilindro`, `cono`, `esfera`, `toro`, `disco`, `tubo`, `grupo`; agua, hielo, humo o vidrio con
  `opacidad`; fuego, rayos, chispas y luces con `brillo`.
- Fuerzas y movimiento: `flecha` (rojo `#e5484d` lo que te hace daño, verde `#5fbf6a` lo que te salva), `viento`, `polvo`,
  `T3.caida(t, altura)`, `T3.tiembla(T, fuerza)` (cámara o suelo que tiembla), `T3.orbita(...)`.
- `mundo`: afuera `{ pasto, arboles, muro, cielo }`; adentro `{ interior: true }`; escenas oscuras con `cielo` oscuro (como
  `OSCURO` del ejemplo). Varía el plano en cada escena (dentro, de corte, desde arriba, primer plano de la persona) y en cada
  momento de peligro cambia algo grande.
- **Cámara**: cuadro vertical (poco ancho). Persona entera: cámara a 4-7 m, `fov` 45-50; escenario grande, más lejos. Los
  subtítulos van ARRIBA (y=170-400): deja esa franja libre y pon la acción entre y=450 y y=1600. La escena 1 no lleva título:
  la situación se ve desde el primer cuadro.
- **Sin rótulos ni textos flotantes** dentro de las escenas: se entiende por la imagen y la voz. La última escena sin texto: la
  pregunta la pone el sistema arriba; deja a la persona abajo.
- Escribe el archivo de una vez, reutilizando funciones; nada de comentarios largos.

## 4. Revisión
`python run.py --hoja <id>` genera `proyectos/<id>/hojas/hoja_*.jpg` (inicio y final de cada escena) y lista los errores de
JavaScript. Ábrelas con Read y corrige lo que no cumpla: se reconoce lo que dice la voz; la persona se ve igual en todas las
escenas y entera cuando importa; nada cortado ni tapado por los subtítulos; nada de sangre ni heridas; ningún texto dentro de
las escenas; algo cambia entre el inicio y el final. **Si no hay errores y todo se ve, una sola revisión basta.**

## 5. Entrega
No renderices: la fábrica lo hace. Termina con una sola línea `PROYECTO: <id>`.
