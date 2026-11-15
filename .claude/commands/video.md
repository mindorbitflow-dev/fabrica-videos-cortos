---
description: Escribe el guion y dibuja a medida las escenas de un video corto explicativo (estilo 1Cell1Life), listo para renderizar
argument-hint: "<nicho> <tema>"
---

Para el nicho `taller` (Así se fabrica) usa `/video-taller`: estas reglas son para los demás nichos.

Deja dibujado y revisado UN video de autor, sin pedir confirmaciones ni hacer preguntas (nadie está mirando: lo lanza la fábrica,
`src/autor.py`, que después lo renderiza y lo envía por correo). Argumentos: `$ARGUMENTS` = la primera palabra es el nicho
(clave de `config/nichos.yaml`; lee ahí su tono y su frase de cierre) y el resto es el tema.

El estándar es el de los videos de referencia (1Cell1Life y similares): ilustración vectorial dibujada por código, hecha para ESE
tema, con un personaje u objeto reconocible que se mantiene igual en todo el video, cámara que se acerca y se aleja sin cortes y
rótulos pequeños. Nunca emojis, íconos genéricos ni tarjetas de solo texto. Ejemplo completo para imitar: `ejemplos/pulpo/`.

## 1. Guion (`proyectos/guion_nuevo.json`)
- **Si el tema dice LIBRE** (lo normal en Evidencia), elígelo tú pensando en viralidad: algo cotidiano que todos usan o
  compran (una marca, una app, un producto, un servicio, un truco de tiendas o bancos) con una trampa comprobada, o un **tema
  del momento** (noticia, tendencia, demanda o escándalo reciente). Si es del momento o dudas de un dato, búscalo con
  WebSearch y confírmalo en al menos 2 fuentes serias (máximo 4 búsquedas); si no se puede confirmar, elige otro. Varía las
  marcas y los temas, y no repitas nada de la lista de ya hechos. Pon en `tema` un nombre corto y concreto: queda en el
  historial para no repetirlo.
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
8. `cierre` (última): exactamente la frase `cierre` del nicho ("Síguenos para más biología."). En `formato: historia`, no: ahí
   el cierre es la pregunta para comentar (ver abajo).

### Reglas
- Sin "sabías que", "increíble", "secreto", "descubre", "en este video" ni preguntas retóricas sueltas.
- Portada: 2-5 palabras en mayúsculas que chocan con lo esperado ("NO X: Y", "SIN X Y SIGUE", "TU X HACE Y"), `destacado` = la
  parte del giro (trozo literal de `texto`), `sub` = línea corta que lo completa. `titulo`: máx. 60 caracteres, con el giro.
- `caption`: la primera línea es otro gancho (distinto del título) y termina con una pregunta que invite a comentar; 2-3 líneas.
  `hashtags`: 3-5 específicos del tema (nada de #viral, #fyp, #parati).
- Cada dato debe ser cierto y verificable; si dudas de uno, cámbialo por otro del que estés seguro. Nada de cifras inventadas.
- Cada escena debe poder DIBUJARSE: en `visual` escribe qué se ve y qué se mueve (objeto, acción, plano). Si una frase no se puede
  mostrar, reescríbela.

### Si el nicho tiene `formato: historia` (Sombra de Evidencia)
Siempre los mismos dos personajes: **Tito**, un cerdito curioso, llega a la oficina del **detective Sombra** con algo cotidiano
(un foco fundido, un anillo, una factura, la leche al fondo del súper...) y Sombra le revela su ORIGEN OCULTO: quién lo decidió, cuándo
y para qué, con tono de "esto te lo ocultaron". Ejemplo completo: `ejemplos/evidencia/`.
- **Se cuenta como una historia, no como un dato**: tono informal, como si se lo contaras a un amigo ("Resulta que...",
  "Y aquí viene lo bueno", "Imagínate"). Palabras de todos los días; nada de términos técnicos (si hace falta uno, explícalo con
  algo cotidiano). Pocas cifras: solo las 2-3 que de verdad sorprenden, redondeadas ("casi todos", "unos 15 años"). Los años y
  nombres van mejor en los rótulos del dibujo que en la voz. Los diálogos entre Tito y Sombra suenan naturales y con emoción.
- **Hechos 100 % reales y documentados**: años, empresas, cifras y frases tal como pasaron. El tono es de conspiración; el contenido
  no. Nada de teorías falsas, nada de salud o medicina, nada que acuse a una persona viva de un delito. Si un dato no es seguro,
  quítalo. Nada de esto es ficción: no pongas avisos de ficción.
- **Estas reglas reemplazan la duración, la estructura y el cierre de la parte general.** Meta empuja los Reels de 35-70 s:
  **14-18 escenas de 1 frase corta (5-14 palabras), 130-170 palabras en total (50-65 s; nunca más de 70 s).** Nada de pausas.
- **Cada escena empuja la acusación.** Si quitas una escena y el video se entiende igual, quítala. Antes de entregar, cuenta las
  palabras y recorta hasta que quepa.
- **El medio se comprime, no se explica.** Cómo se descubrió (un post de Reddit, una prueba, una investigación, un velocímetro,
  un experimento) cabe en UNA escena de máx. 12 palabras ("Un usuario le cambió la batería y su iPhone volvió a volar.").
  Nunca dos escenas sobre el mismo paso.
- **Corta en cuanto se dice la revelación.** Demandas, multas, juicios y "qué pasó después" no son un tramo del video: como mucho
  una cifra (la más fuerte: "Apple aceptó pagar hasta 500 millones de dólares") en el remate o la pregunta final.
- **Primero el impacto, después el dato.** La primera frase es emocional y acusa ("Te mintieron 50 años: la grasa no era el
  enemigo."); nunca empieza con un año, "Antes de...", "En 1967..." ni con contexto. Los años y el "cómo pasó" van después.
- Estructura (`rol`): `gancho` (1-2 escenas: polémica que toca al espectador, con la marca; la primera frase ya choca, nunca
  "Tito llegó a la oficina...") → `pregunta` (1 escena: Sombra responde corto e inquietante: "Esa regla la inventó De Beers.") →
  `mecanismo` (flashback rápido en 7-10 escenas: el problema que tenían, qué hicieron, cómo lo ocultaron; empieza por el
  momento más fuerte, no por el más antiguo) con un `reenganche` cada 3-4 escenas, que de preferencia es **Tito interrumpiendo**
  con una frase corta y emocional ("—¿Escasos? ¡Si tenían bodegas llenas!") → `revelacion` (2-3 escenas: lo más oscuro, que toca
  el bolsillo o la vida del espectador) → `remate` (1 escena: la lección de Sombra o el consejo útil: "Cambia la batería antes
  de comprar otro.") → `cierre` (1 escena, ver abajo).
- **Final con pelea (`cierre`)**: la última escena NO es "síguenos" ni el lema: es una pregunta que obliga a comentar algo
  concreto (un modelo, una cifra, un sí o un no, un nombre), máx. 16 palabras, dicha por la voz. Que sea fácil de contestar
  y deje espacio para contar más: "¿A ti te pasó? Escribe qué iPhone tenías." / "¿Todavía compras productos 'sin grasa'?
  Comenta YO y cuéntanos cuál." / "¿Cuántos sueldos costó el anillo en tu casa? Escríbelo.".
  La marca la pone en grande en pantalla junto al logo; tú solo dibujas el fondo (negro con halo, como el ejemplo).
- Años y cifras siempre con dígitos (1938, 9 de cada 10, 1.000 horas): así coinciden con lo que oye el reconocedor de voz y
  se leen mejor en los subtítulos.
- Diálogos dentro de la narración, con raya o comillas ("Gasté dos sueldos en este anillo", dijo Tito). Un solo narrador lee todo.
- Portada: 2-5 palabras que acusan o duelen, dirigidas al espectador ("TE ENGAÑARON", "TE MINTIERON 50 AÑOS",
  "APPLE FRENÓ TU IPHONE", "TU DIAMANTE ES PUBLICIDAD") y `sub` con el dato que lo prueba. Nunca una portada informativa
  ("CASO REAL 1970", "LA HISTORIA DE...") ni un año en `texto`.
- **Para que se comparta** (la meta es viralidad):
  - Si el tema tiene una marca o persona famosa, nómbrala en `titulo`, portada y primera escena (McDonald's, Disney, Apple,
    Coca-Cola...). Las marcas conocidas multiplican los clics.
  - La primera frase toca al espectador: su dinero, su comida, su teléfono, su tiempo ("Tito pagó 5 dólares por unas palomitas...").
  - Un dato "imposible de creer pero cierto" antes del segundo 10, y la revelación más fuerte guardada para el final.
  - `titulo` de máx. 60 caracteres que acusa o revela ("Disney escondía sus películas a propósito"), nunca descriptivo.
  - `caption`: primera línea = gancho distinto al título; termina con la MISMA pregunta del cierre, para que los comentarios
    respondan una sola cosa.
- **Post del mismo tema** (`post` en el guion, para la imagen de dos viñetas que se publica aparte):
  `{"pregunta": "lo que dice Tito, máx. 16 palabras", "respuesta": "la revelación de Sombra, máx. 28 palabras",
  "caption": "2-3 líneas con gancho y pregunta; termina con 'El video completo está en la página.'", "hashtags": [3-5]}`.
  La `pregunta` de Tito también va primero con la emoción (indignado, asustado), sin años ni "caso real".
  En `pregunta` y `respuesta` marca entre *asteriscos* las 2-4 palabras clave (salen en dorado). La respuesta debe entenderse sola,
  sin haber visto el video, y dejar ganas de verlo.

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
- Composición: lo importante entre y=300 y y=1200 y entre x=80 y x=940. En Sombra de Evidencia la escena 1 NO lleva título encima (arranca directo en el gancho); en los demás nichos la portada tapa y=860-1240 durante la escena 1 (pon al
  protagonista arriba) y los subtítulos ocupan y=1260-1440 en las demás. Debajo de y=1440 solo fondo.
- Rótulos: pocos, cortos, en mayúsculas, de 32 px o más (`K.rotulo`, `K.pastilla`). Nombran lo que se ve; no repiten la voz.
- Termina cada escena con `K.acabado(ctx, T)` (grano y viñeta).

### Si el nicho tiene `formato: historia`: caricatura de los años 30, noir
Ejemplo completo para imitar: `ejemplos/evidencia/` (léelo entero antes de dibujar; `ejemplos/misterio/` tiene más piezas). Usa
`S30` (`plantilla/sombra.js`):
- Blanco y negro con tinte sepia; el único color es el oro de la marca (`S30.C.oro`) para la luz, el dinero, los datos clave.
  Contornos negros gruesos, formas redondas, brazos de manguera (`S30.manguera`), ojos de pastel cortado (`S30.ojo`), guantes.
- Personajes fijos, nunca los redibujes: `S30.detective(...)` (Sombra) y `S30.tito(...)` (el cerdito: `boca`, `orejas`, `objeto`
  para lo que trae en las manos). Para la gente del flashback (empresarios, obreros, público) usa `S30.hombre(...)` con distintas
  `semilla`. Las escenas de oficina usan `S30.oficina(ctx, T)` y `S30.escritorio(ctx, T)` (encima del que está sentado detrás).
- **Escena 1: Tito grande y con una emoción EXAGERADA que cambia según el tema**, desde el primer cuadro (el video no lleva título encima: arranca directo en el gancho).
  No repitas siempre la misma: elige la que pide la historia (indignado porque le cobraron de más, horrorizado al ver la
  etiqueta, orgulloso y feliz justo antes de enterarse, desesperado con el teléfono lento, confundido, furioso, muerto de
  vergüenza). Exagérala como caricatura de los 30: salto con `susto`, brazos arriba, boca en 'o', orejas caídas, temblor,
  el objeto apretado o a punto de caerse. Asustado es solo una opción más. Ningún rótulo informativo ("CASO REAL", años) en la escena 1: el gancho es la imagen y la voz.
- El flashback es donde está la riqueza visual: edificios, fábricas, salas de juntas, anuncios de época, máquinas, contadores,
  gráficas, mapas. Cada escena con fondo completo (nada de fondos vacíos), un elemento principal grande y movimiento.
- Ritmo rápido: cada escena dura 2-4 s; que algo pase desde el primer cuadro (zoom de cámara con `K.camara`, objeto que entra,
  número que cuenta, sello que golpea). No repitas el mismo plano dos escenas seguidas.
- Cada escena empieza con `S30.vaiven(ctx, T)` y termina con `S30.pelicula(ctx, T)`. En el `remate` puedes cerrar con `S30.iris`.
- La marca solo pone el logo y la pregunta final en la última escena: esa escena lleva solo fondo negro con un halo dorado (como
  los ejemplos); no escribas texto en ella.
- Rótulos con `K.pastilla` (fondo papel o dorado) y títulos o años con `S30.titulo` (Cinzel dorada).

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
