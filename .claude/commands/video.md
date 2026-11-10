---
description: Escribe el guion y dibuja a medida las escenas de un video corto explicativo (estilo 1Cell1Life), listo para renderizar
argument-hint: "<nicho> <tema>"
---

Deja dibujado y revisado UN video de autor, sin pedir confirmaciones ni hacer preguntas (nadie está mirando: lo lanza la fábrica,
`src/autor.py`, que después lo renderiza y lo envía por correo). Argumentos: `$ARGUMENTS` = la primera palabra es el nicho
(clave de `config/nichos.yaml`; lee ahí su tono y su frase de cierre) y el resto es el tema.

El estándar es el de los videos de referencia (1Cell1Life y similares): ilustración vectorial dibujada por código, hecha para ESE
tema, con un personaje u objeto reconocible que se mantiene igual en todo el video, cámara que se acerca y se aleja sin cortes y
rótulos pequeños. Nunca emojis, íconos genéricos ni tarjetas de solo texto. Ejemplo completo para imitar: `ejemplos/pulpo/`.

## 1. Guion (`proyectos/guion_nuevo.json`)
- Formato: `{tema, titulo, portada: {texto, destacado, sub}, escenas: [{rol, voz, visual}], caption, hashtags}` (ver
  `ejemplos/pulpo/guion.json`; ese ejemplo es más corto que lo que se pide aquí).
- **Duración: 90-150 s = 16-24 escenas y 260-380 palabras.** Frases de 6-14 palabras, una idea por escena, en segunda persona
  cuando se pueda ("tu cuerpo", "lo que ves"), español neutro.
- Antes de escribir, busca el ÁNGULO: dentro del tema, el dato más contraintuitivo o el que más toca al espectador. El video se
  construye alrededor de ese dato, no de una explicación de enciclopedia.

### Arquitectura de retención (el `rol` de cada escena, en este orden)
1. `gancho` (escena 1, máx. 14 palabras, se oye en los primeros 3 s): afirmación concreta que contradice lo que la gente cree o
   que le pasa al espectador. Nada de introducciones. El visual ya se mueve desde el primer cuadro.
2. `pregunta` (1 escena): abre el bucle: deja planteada la pregunta que el video va a responder ("¿entonces por qué...?" dicho
   como afirmación: "La razón está escondida en ..."), sin dar la respuesta.
3. `contexto` (1-2): la situación cotidiana o la escena del animal en la que el espectador se reconoce.
4. `mecanismo` (8-14): la explicación en 3-4 pasos. Cada paso termina en una mini-revelación. Cada 4-5 escenas va un
   `reenganche`: contraste ("pero"), número que sorprende, comparación de escala con algo humano o cotidiano (como "orca vs.
   mujer"), o "y aquí viene lo raro". Nunca dos escenas seguidas con la misma idea.
5. `revelacion` (hacia el 70 % del video): el dato más fuerte, guardado hasta aquí. Responde de verdad la pregunta.
6. `consecuencia` (1-2): qué cambia para el espectador, o qué va a notar ahora en su vida.
7. `remate` (1): frase corta y memorable que cierra el bucle. Que enlace con la escena 1, para que al repetirse el video en bucle
   se oiga continuo.
8. `cierre` (última): exactamente la frase `cierre` del nicho ("Síguenos para más biología.").

### Reglas
- Sin "sabías que", "increíble", "secreto", "descubre", "en este video" ni preguntas retóricas sueltas.
- Portada: 2-5 palabras en mayúsculas que chocan con lo esperado ("NO X: Y", "SIN X Y SIGUE", "TU X HACE Y"), `destacado` = la
  parte del giro (trozo literal de `texto`), `sub` = línea corta que lo completa. `titulo`: máx. 60 caracteres, con el giro.
- `caption`: la primera línea es otro gancho (distinto del título) y termina con una pregunta que invite a comentar; 2-3 líneas.
  `hashtags`: 3-5 específicos del tema (nada de #viral, #fyp, #parati).
- Cada dato debe ser cierto y verificable; si dudas de uno, cámbialo por otro del que estés seguro. Nada de cifras inventadas.
- Cada escena debe poder DIBUJARSE: en `visual` escribe qué se ve y qué se mueve (objeto, acción, plano). Si una frase no se puede
  mostrar, reescríbela.

## 2. Proyecto
`python run.py --nicho <nicho> --guion proyectos/guion_nuevo.json` imprime el id y la ruta de `proyectos/<id>/escenas.js`, que debes escribir.

## 3. Dibujo (`proyectos/<id>/escenas.js`)
- `window.ESCENAS = [ (ctx, t, d, K, T) => {...}, ... ]`: UNA función por escena del guion, en el mismo orden. Canvas 1080x1920;
  `t` = segundos desde que empezó la escena, `d` = su duración (depende de la voz: anima con fracciones de `d`, no con segundos
  fijos), `T` = segundos del video (úsalo para el movimiento ambiental, así no salta entre escenas), `K` = `plantilla/kit.js`
  (léelo antes de dibujar: tiempo, azar repetible, fondos, cámara, curvas, extremidades, rutas, rótulos, pastillas, barras).
- Todo depende solo de `t`/`T`: prohibido `Math.random()`, `Date` y estado guardado entre cuadros.
- Define primero la paleta y las funciones del protagonista (como `pulpo()` en el ejemplo) y reutilízalas en todas las escenas.
  Constrúyelo con formas orgánicas (`K.curva`, `K.extremidad`, degradados, manchas, brillo, sombra propia), no con círculos y
  rectángulos sueltos. Siempre algo en movimiento: respiración, latido, partículas, cámara.
- Encadena las escenas: que la siguiente empiece con la cámara donde terminó la anterior (el motor funde 0,35 s entre escenas).
- Variedad de planos para sostener la atención: alterna plano general, primer plano, corte interior (el "rayos X" del ejemplo),
  comparación lado a lado y dato visual (barras, contador, línea de tiempo). Cada 3-4 escenas cambia algo grande (escenario,
  escala o color). En `reenganche` y `revelacion` el visual debe ser el más llamativo del video (zoom fuerte, cambio de color,
  algo que aparece o se detiene).
- Composición: lo importante entre y=300 y y=1200 y entre x=80 y x=940. La portada tapa y=860-1240 durante la escena 1 (pon al
  protagonista arriba) y los subtítulos ocupan y=1260-1440 en las demás. Debajo de y=1440 solo fondo.
- Rótulos: pocos, cortos, en mayúsculas, de 32 px o más (`K.rotulo`, `K.pastilla`). Nombran lo que se ve; no repiten la voz.
- Termina cada escena con `K.acabado(ctx, T)` (grano y viñeta).

## 4. Revisión con tus propios ojos (obligatoria)
`python run.py --hoja <id>` genera `proyectos/<id>/hojas/hoja_*.jpg` (3 cuadros por escena) y lista los errores de JavaScript.
Abre TODAS las hojas con Read y corrige hasta que cada escena cumpla:
1. Se reconoce a primera vista lo que dice la voz (si alguien sin audio no lo entendería, redibuja).
2. El protagonista se ve igual de una escena a otra y ocupa buena parte del cuadro.
3. Nada cortado, encimado ni ilegible; ningún rótulo bajo los subtítulos o la portada; ninguna escena vacía o casi vacía.
4. Entre el primer y el último cuadro de cada escena algo cambió.
Repite hoja → corrección al menos una vez aunque no haya errores evidentes.

## 5. Entrega
No renderices: la fábrica lo hace. Termina con una sola línea `PROYECTO: <id>` cuando las hojas cumplan todo lo anterior.
(A mano, el MP4 se obtiene con `python run.py --render <id> --correo`.)
