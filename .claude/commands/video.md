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

**SERIES.** Sombra de Evidencia alterna dos series y el guion lleva el campo `"serie": "origen"` o `"serie": "mito"`. El tema llega con el
prefijo `SERIE:origen` o `SERIE:mito` (quítalo del `tema` del guion). Si el tema dice LIBRE, elígelo dentro de la serie indicada (los ejemplos
de `config/nichos.yaml` → `series.<serie>.ideas` son solo orientación). Todo lo demás de esta sección (duración, hechos reales, sin salud, final con pregunta,
escena 1 sin título, movimiento obligatorio) vale para las dos.
- **`origen`** (la que describe el resto de esta sección): una marca, un negocio o una costumbre tiene un origen oculto; tono de "esto te lo ocultaron". Ejemplo: `ejemplos/evidencia/`.
- **`mito`** (Mito vs. evidencia): Tito cree algo que casi todos creen (historia, ciencia, animales, cosas de todos los días; nunca salud ni medicina, política ni
  religión) y Sombra pide la evidencia. El "villano" es la creencia, no una marca ni una persona; el tono es de curiosidad amable ("vamos a ver la evidencia"), no de
  acusación. Tito nunca queda en ridículo: el error es del mito. Ejemplo completo: `ejemplos/evidencia_mito/` (léelo entero antes de dibujar).
  Elige un mito que de verdad sea falso o a medias (confírmalo en 2 fuentes serias con WebSearch; si los expertos lo discuten, elige otro). Evita los que ya son
  un cliché de internet (el 10 % del cerebro). Estructura (`rol`): `gancho` (Tito jura el mito con total seguridad; la primera frase es el mito dicho como un hecho,
  de 14 palabras o menos) → `pregunta` (Sombra: "Voy a pedir la evidencia, Tito. Esa imagen tiene un autor.") → `mecanismo` (10-14 escenas: qué dice la evidencia real
  con un nombre, un lugar o una fecha, y de dónde salió el mito: quién, cuándo y por qué se volvió popular) con un `reenganche` de Tito que se resiste ("—¿Ni un cuerno?
  ¡Pero si los vi en mil películas!") → `veredicto` (UNA escena, frase corta: "Veredicto: mito." / "Veredicto: verdad." / "Veredicto: media verdad."; el sello
  `D.sello(ctx, x, y, s, {texto:'MITO'|'VERDAD'|'MEDIA VERDAD', golpe})` cae sobre el objeto del tema con `K.golpe`) → `revelacion` (opcional: el matiz, qué parte sí era cierta)
  → `remate` (2 escenas: lo que sí hay que recordar y la lección de Sombra: "A veces lo que todos saben es solo un buen vestuario.") → `cierre` (pregunta: "¿Qué otro mito
  creías de niño? Escríbelo aquí abajo." o "¿Tú lo creías? Escribe YO."). Portada y `titulo` AFIRMAN la verdad, sin acusar ("LOS VIKINGOS NUNCA USARON CUERNOS"); `caption`: primer renglón
  = el dato que rompe la creencia, termina con la misma pregunta del cierre.
- **Se cuenta como una historia, no como un dato**: tono informal, como si se lo contaras a un amigo ("Resulta que...",
  "Y aquí viene lo bueno", "Imagínate"). Palabras de todos los días; nada de términos técnicos (si hace falta uno, explícalo con
  algo cotidiano). **Como máximo UNA cifra en la voz** (la más fuerte, redondeada: "casi todos", "unos 15 años"); los demás años,
  montos y nombres van en los rótulos del dibujo, no en la voz. Los diálogos entre Tito y Sombra suenan naturales y con emoción.
- **DRAMATIZACIÓN Y CONTROVERSIA (lo que hace que se comente y se comparta):** los datos son la prueba; la historia es el conflicto.
  Cada escena empuja una emoción (sospecha, burla, traición, miedo a perder, alivio) y cada 3 escenas hay un giro, una interrupción o una
  pregunta sin respuesta. Tito y Sombra CHOCAN: Tito se resiste ("¡Eso es mentira!"), apuesta ("Apuesto mi boina."), se enoja, duda y por fin
  se rinde; Sombra provoca con preguntas cortas ("¿Y quién ganó con eso, Tito?"). Un giro a mitad del video y otro antes del final, y una
  PAUSA DRAMÁTICA (una escena de 1-3 palabras: "Mentira." / "Nadie lo dijo.") justo antes de la revelación. El final obliga a tomar bando
  ("¿Mito o verdad? Escribe tu voto."). Controversia permitida: casos de empresas, gobiernos o instituciones, SOLO si están DOCUMENTADOS
  (sentencias, informes oficiales, archivos públicos; 2 fuentes serias con WebSearch); jamás acusar de un delito a una persona viva, y nada de
  salud, política partidista o religión.
- **Hechos 100 % reales y documentados**: años, empresas, cifras y frases tal como pasaron. El tono es de conspiración; el contenido
  no. Nada de teorías falsas, nada de salud o medicina, nada que acuse a una persona viva de un delito. Si un dato no es seguro,
  quítalo. Nada de esto es ficción: no pongas avisos de ficción.
- **Estas reglas reemplazan la duración, la estructura y el cierre de la parte general.** Facebook ya no pone tope a los Reels y los de
  1-3 minutos dan más interacción: **26-32 escenas de 1 frase corta (4-14 palabras), 260-330 palabras en total (95-120 s a ~2,85 palabras por segundo; nunca más de 130 s).**
  Nada de pausas, salvo la pausa dramática de arriba.
- **Cada escena empuja la historia (el conflicto o la acusación).** Si quitas una escena y el video se entiende igual, quítala. Antes de
  entregar, cuenta las palabras y recorta o amplía hasta que quepa (el ejemplo con 250 palabras duró 88 s: apunta a 280-320).
- **El medio se comprime, no se explica.** Cómo se descubrió (un post de Reddit, una prueba, una investigación, un velocímetro,
  un experimento) cabe en UNA escena de máx. 12 palabras ("Un usuario le cambió la batería y su iPhone volvió a volar.").
  Nunca dos escenas sobre el mismo paso.
- **Corta en cuanto se dice la revelación.** Demandas, multas, juicios y "qué pasó después" no son un tramo del video: como mucho
  una cifra (la más fuerte: "Apple aceptó pagar hasta 500 millones de dólares") en el remate o la pregunta final.
- **Primero el impacto, después el dato.** La primera frase es emocional y acusa ("Te mintieron 50 años: la grasa no era el
  enemigo."); nunca empieza con un año, "Antes de...", "En 1967..." ni con contexto. Los años y el "cómo pasó" van después.
- Estructura (`rol`): `gancho` (1-2 escenas: polémica que toca al espectador, con la marca; la primera frase ya choca, nunca
  "Tito llegó a la oficina...") → `pregunta` (1 escena: Sombra responde corto e inquietante: "Esa regla la inventó De Beers.") →
  `mecanismo` (flashback rápido en 12-16 escenas: el problema que tenían, qué hicieron, cómo lo ocultaron; empieza por el
  momento más fuerte, no por el más antiguo) con un `reenganche` cada 3-4 escenas, que de preferencia es **Tito interrumpiendo**
  con una frase corta y emocional ("—¿Escasos? ¡Si tenían bodegas llenas!") → `revelacion` (3-4 escenas: lo más oscuro, que toca
  el bolsillo o la vida del espectador) → `remate` (1 escena: la lección de Sombra o el consejo útil: "Cambia la batería antes
  de comprar otro.") → `cierre` (1 escena, ver abajo).
- **Final con pelea (`cierre`)**: la última escena NO es "síguenos" ni el lema: es una pregunta que obliga a comentar algo
  concreto (un modelo, una cifra, un sí o un no, un nombre), máx. 16 palabras, dicha por la voz. Que sea fácil de contestar
  y deje espacio para contar más: "¿A ti te pasó? Escribe qué iPhone tenías." / "¿Todavía compras productos 'sin grasa'?
  Comenta YO y cuéntanos cuál." / "¿Cuántos sueldos costó el anillo en tu casa? Escríbelo.".
  La marca la pone en grande en pantalla junto al logo; tú solo dibujas el fondo (azul noche con halo ámbar, como el ejemplo).
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
  escala o color). En `reenganche` y `revelacion` el visual debe ser el más llamativo del video (cambio de color,
  algo que aparece o se detiene).
- Composición: lo importante entre y=300 y y=1200 y entre x=80 y x=940. En Sombra de Evidencia la escena 1 NO lleva título encima (arranca directo en el gancho); en los demás nichos la portada tapa y=860-1240 durante la escena 1 (pon al
  protagonista arriba) y los subtítulos ocupan y=1260-1440 en las demás. Debajo de y=1440 solo fondo.
- Rótulos: pocos, cortos, en mayúsculas, de 32 px o más (`K.rotulo`, `K.pastilla`). Nombran lo que se ve; no repiten la voz.
- Termina cada escena con `K.acabado(ctx, T)` (grano y viñeta).

### Si el nicho tiene `formato: historia`: ilustración sobria y cinematográfica
Ejemplo completo para imitar: `ejemplos/evidencia/` (serie origen) o `ejemplos/evidencia_mito/` (serie mito); léelo entero antes de dibujar. Usa
`S30` (`plantilla/sombra.js`; el color y los personajes los pone `plantilla/sombra_ilustra.js`):
- NO es noir ni blanco y negro, y tampoco "dibujito eléctrico": nada de sepia, grises sucios, película vieja ni violeta/magenta/turquesa
  o amarillo neón. Es color apagado y cálido, como una película de animación: azul grisáceo, tierra cálida, luz ámbar de lámpara o
  ventana y grano suave. Paleta (ya cargada en `S30.C`; úsala, no inventes otra): tinta azul noche `C.tinta`, papel crema `C.papel`,
  ámbar `C.oro` (#E0B060: dato clave, dinero, luz, rótulos), `C.acero` y `C.medio` (azules), `C.gris`, `C.niebla` y `C.claro`
  (azul grisáceo claro), `C.terracota`, `C.cobre`, `C.ocre`, `C.arena` (tierras), `C.salvia`, `C.musgo` (verdes apagados), `C.ciruela`,
  `C.noche`. Los fondos son degradados oscuros-apagados en azul grisáceo, tierra, salvia o ciruela (`D.fondo.*` y, para
  infografías, `D.fondo.abstracto`); nunca un fondo plano ni de color saturado. Cada escena mezcla 3-4 tonos de la paleta y un
  acento ámbar; los objetos son props de `D` (con volumen, luz de borde y textura), nunca formas planas.
  Evita colores literales saturados, grises neutros y negro puro (#000, rgba negro): usa `C.*` o `alfa(C.tinta, a)`.
- Personajes fijos, nunca los redibujes ni los dibujes a mano (nada de brazos de manguera para personas): `S30.detective(...)` (Sombra) y
  `S30.tito(...)` (el cerdito: `boca`, `orejas`, `objeto` para lo que trae en las manos). Para la gente del flashback (empresarios, obreros,
  público, una estrella de cine) usa `S30.hombre(ctx, x, y, s, o)`: dibuja con el motor nuevo `I.REPARTO.gente` (adulto ≈ 430·s de alto) y
  varía solo según `semilla` (hombre, mujer o anciano, con ropa, pelo y piel distintos; `variante: 'hombre'|'mujer'|'anciano'|'nino'` la
  fija; `S30.mujer` es atajo). Opciones: `T`, `dir`, `semilla`, `gesto` 'quieto'|'senala'|'apreton', `cara` 'serio'|'sonrisa',
  `paso` (fase de caminata; con `corre`), `brazos: 'arriba'`, `susto`, `habla`, o `pose` por nombre (dePie, camina, corre, senalar, saludar, susto,
  cabizbajo, manosBolsillos). Devuelve las articulaciones `J` (p. ej. `J.dedosD` para poner un objeto en la mano). Para multitudes lejanas
  usa escala pequeña (.15-.3); no hace falta dibujar siluetas a mano.
  Las escenas de oficina usan `S30.oficina(ctx, T)` (el interior cálido del kit: suelo en y≈1250, ventana a la derecha) y
  `S30.escritorio(ctx, T)` (encima del que está sentado detrás).
- **Decorados y props (global `D`, `plantilla/decorados.js`): es la forma OBLIGATORIA de dibujar fondos y objetos del flashback.** Todo el
  video debe verse como un solo mundo (el del kit: pincel con volumen, luz de borde, textura, luz cálida, grano). Prohibido: fondos
  planos de degradado (`K.fondo`, `fillRect` a pantalla completa) sin decorado, y dibujar a mano con `fillRect`/`arc`/`relleno` un objeto
  que ya existe como prop. Solo para lo que no exista, usa `P.forma`-estilo (`D.F(ctx, puntos, color, {...})` y `K.curva`) con colores de `S30.C`.
  Compón varios props por escena (fondo + 1-3 props grandes + gente) y termina con `S30.pelicula`. Funciones (todas con `T` en `o` cuando animan):
  - Fondos, `D.fondo.<tipo>(ctx, T, {hora:'dia'|'atardecer'|'noche', semilla})`, llenan el cuadro con el suelo en y=1250:
    `calle` (`clima:'seco'|'lluvia'|'niebla'`), `juntas` (sala de juntas con ventana), `fabrica`, `tienda`, `banco` (mármol y columnas), `laboratorio`,
    `estudio` (plató), `oficina` (la de Sombra), `exterior` (`tipo:'campo'|'mina'|'cantera'`), `cielo`, `abstracto` (`tema:'azul'|'tierra'|'salvia'|'ciruela'|'noche'`,
    `x`, `y` = dónde cae la luz; para infografías, frases y años).
  - Props, `D.<prop>(ctx, x, y, escala, o)` con (x, y) = punto de apoyo inferior central (centro en joya, reloj y engranaje):
    `D.joya(ctx,x,y,r,{oro,gira,tipo:'diamante'|'anillo',T})` joya con destello · `D.vitrina(ctx,x,y,s)` vitrina con joya (cristal 860 de ancho) · `D.cajon(ctx,x,y,s,{cierra:0-1})` cajón con anillo
    que se cierra · `D.candado(ctx,x,y,s)` · `D.papel/periodico/anuncio(ctx,x,y,w,h,{giro,titular,sub:[a,b],lineas})` hoja con texto (x, y = centro) ·
    `D.monedas(ctx,x,y,s,{n})` · `D.billetes(ctx,x,y,s,{n})` · `D.caja_registradora` · `D.camaraCine(ctx,x,y,s,{T})` cámara con carretes · `D.foco(ctx,x,y,s,{ang,largo,T})` foco con haz ·
    `D.engranaje(ctx,x,y,r,{vel,T})` · `D.maquina(ctx,x,y,s,{T})` máquina con engranajes y humo · `D.camion` · `D.fachada(ctx,x,y,s,{letrero,color})` edificio con letrero y puerta ·
    `D.puertaLetrero(ctx,x,y,s,{texto})` · `D.reloj(ctx,x,y,r,{hora|T})` · `D.telefono` · `D.grafica(ctx,x,y,s,{valores,progreso:0-1,tipo:'barras'|'linea'})` gráfica de barras
    con volumen o de línea (x, y = centro) · `D.pizarra(ctx,x,y,s,{dibuja:(ctx,w,h)=>{}})` caballete (dibuja en el tablero, origen en su centro) ·
    `D.mesaJuntas(ctx,x,y,s,{ancho})` / `D.mesa` · `D.estante(ctx,x,y,s,{baldas})` · `D.caja(ctx,x,y,s)` · `D.bandeja(ctx,x,y,s)` bandeja de terciopelo para joyas (centro) ·
    `D.maquinaEscribir(ctx,x,y,s,{texto,n:0-1})` · `D.mina(ctx,x,y,s,{niveles})` mina a cielo abierto en terrazas (x, y = borde superior; los obreros van con `S30.hombre` a escala .16).
  - Rendimiento: lo estático se cachea solo; no crees objetos nuevos por cuadro. Para animar tamaño usa `ctx.scale` o la escala (se cuantiza), no valores distintos en cada cuadro.
- **MOVIMIENTO OBLIGATORIO (lo que más pesa en la calidad):** una escena que solo respira se ve como una foto, y
  `python run.py --hoja` la marca como "casi estática" (medido). Cada escena (menos la última) lleva como mínimo DOS de estos golpes:
  1. **Cámara que viaja (SIN zoom animado):** `K.plano(ctx, t, d, {de:{x,y,z}, a:{x,y}, T, mano, fondo: () => <decorado>, paralaje: .6}, () => {...})`: paneo
     con el decorado moviéndose menos que los personajes (profundidad). `z` es el encuadre FIJO de la escena y no cambia: **no animes acercamientos ni alejamientos**
     (ni `K.camara` con zoom que varía, ni `ctx.scale` de toda la escena): el zoom lo decide el editor al montar el video, y el guion decide el plano. **La oficina de Sombra va SIEMPRE sin zoom y sin paneo** (`enOficina(..., {x:540,y:760,z:1}, {x:540,y:760}, ...)`: cámara fija en cuadro completo; el movimiento es de
     los personajes): usa el ayudante `enOficina` del ejemplo. Alterna paneo lateral, subida y bajada; nunca el mismo movimiento en dos escenas seguidas.
  2. **Personaje que actúa:** `S30.actua(t, d, [[0,'dePie'], [.35,'senalar'], [.8,'explicar']])` devuelve `{pose, pose2, k}` y se reparte
     en el personaje (`Object.assign({T, ...}, S30.actua(...))`); `habla: 1` mientras dice la frase; `expresion` ('enfado', 'susto', 'triste'...);
     saltos y sustos con la posición `y`. Para entrar o cruzar: `S30.camina(t, d, x0, x1, {hasta, alto})` → `{x, dir, paso}` (`paso` null al
     llegar: el personaje cae a 'dePie'). Con `objeto:'caja'` la caja solo queda bien en `traeObjeto`/`triste`: en `asombrado` o `senalar` sube a la
     cara; quita el objeto en esas poses.
  3. **Objeto que entra, golpea o cambia:** el papel que llega girando, el candado que cae con golpe de cámara, el diamante que pasa a ámbar, el
     flash de una cámara de cine, una gráfica que se dibuja.
  Las figuras GRANDES: Tito y Sombra en diálogo a escala 1.2-1.7 (cabeza y torso llenando el cuadro; o un encuadre fijo `z` 1.3-1.7 sobre ellos),
  la gente del flashback ≥ 0.6 y solo las multitudes lejanas más pequeñas. Un rótulo (`pastilla`) que deba verse entero va FUERA de `K.plano`
  (coordenadas de pantalla); si va dentro, se mueve con la cámara. Nunca dos escenas seguidas con el mismo decorado y el mismo encuadre: cambia
  de lugar, de plano o de lado.
- **PERSONAJES QUE GIRAN (`yaw`):** Tito y Sombra se dibujan de cualquier ángulo con `S30.tito(ctx, x, y, s, {yaw, ...})` y `S30.detective(ctx, x, y, s, {yaw, ...})`
  (radianes: `0` de frente a cámara, `±.75` tres cuartos mirando a la derecha (+) o a la izquierda (−), `±1.25` perfil, `π` de espaldas). Sin `yaw` salen en el
  modo antiguo de perfil, así que **usa siempre `yaw` en Sombra y Tito**. Úsalo para el montaje: plano y contraplano (Sombra `yaw: .75` mirando a Tito `yaw: -.75`), primer
  plano de frente (`±.25`), Sombra de espaldas mirando por la ventana (`yaw: π`), Tito que camina de perfil (`1.2`) y al llegar se gira hacia la cámara
  (`yaw: lerp(1.2, -.2, sale(prog(t, d * .3, d * .5)))`). Las poses y expresiones son las mismas. La gente del flashback (`S30.hombre`/`mujer`) sigue siendo de perfil o
  tres cuartos.
- **CORTES, PROFUNDIDAD Y ESCALA (videos de 90-120 s: hay que renovar la imagen sin acercar la cámara):**
  - **Cortes de montaje**, no zoom: dentro de una escena larga cambia de plano con `K.corte(t, d, [0, .5])` → `{i, t, d}` (plano activo y su tiempo local) y dibuja
    cada plano con su propio `K.plano` y su encuadre FIJO (general → medio → detalle → contraplano). Planea 8-12 cortes en todo el video; nunca dos planos
    iguales seguidos y nunca un corte sin que cambie el ángulo, el lugar o el tamaño del encuadre.
  - **Profundidad:** `K.plano(..., { fondo, paralaje: .5, frente: ctx => {...} })`; el `frente` es un primer plano (una planta, el borde del escritorio, el hombro de
    un personaje) que se mueve más que la acción. Pon un `frente` en al menos 1 de cada 3 escenas.
  - **Escala coherente (el personaje manda):** a escala 1, Sombra mide 430 px, Tito 344, un adulto 410-430 y un niño 280. Un objeto que comparte cuadro con un personaje
    respeta la proporción real: mesa a la cintura (≈ 0,45 de la altura), puerta ≈ 1,2, vitrina ≈ 0,9, periódico abierto ≈ 0,35, caja de regalo ≈ 0,2, casco ≈ 0,17,
    anillo o diamante ≈ 0,04. Un objeto PEQUEÑO que es el protagonista del tema se muestra en su propio plano de detalle (sin personajes al lado) o en la mano del
    personaje a su tamaño real. Nunca un objeto más grande que la cabeza de quien lo sostiene (salvo en un globo de pensamiento pequeño, que no sustituye a una escena).
  - Los personajes en plano medio van a escala 1,4-2,0; las multitudes y obreros, ≥ 0,6 cuando son protagonistas del cuadro.
- **Escena 1: Tito grande y con una emoción EXAGERADA que cambia según el tema**, desde el primer cuadro (el video no lleva título encima: arranca directo en el gancho).
  No repitas siempre la misma: elige la que pide la historia (indignado porque le cobraron de más, horrorizado al ver la
  etiqueta, orgulloso y feliz justo antes de enterarse, desesperado con el teléfono lento, confundido, furioso, muerto de
  vergüenza). Exagérala como caricatura animada: salto con `susto`, brazos arriba, boca en 'o', orejas caídas, temblor,
  el objeto apretado o a punto de caerse. Asustado es solo una opción más. Ningún rótulo informativo ("CASO REAL", años) en la escena 1: el gancho es la imagen y la voz.
- El flashback es donde está la riqueza visual: edificios, fábricas, salas de juntas, anuncios de época, máquinas, contadores,
  gráficas, mapas. Cada escena con fondo completo (nada de fondos vacíos), un elemento principal grande y movimiento.
- Ritmo rápido: cada escena dura 2-4 s; que algo pase desde el primer cuadro (paneo de cámara con `K.plano`, objeto que entra,
  número que cuenta, sello que golpea). No repitas el mismo plano dos escenas seguidas.
- Cada escena empieza con `S30.vaiven(ctx, T)` (leve vaivén de cámara) y termina con `S30.pelicula(ctx, T)` (acabado cinematográfico: viñeta suave, leve calidez y grano fino; sin rayones). En el `remate` puedes cerrar con `S30.iris`.
- La marca solo pone el logo y la pregunta final en la última escena: esa escena lleva solo un fondo azul noche (`#232c3a` → `#12171f`) con un halo ámbar
  `C.oro` (como los ejemplos); no escribas texto en ella.
- Rótulos con `K.pastilla` (fondo crema o ámbar) y títulos o años con `S30.titulo` (Cinzel ámbar).

## 4. Revisión con tus propios ojos (obligatoria)
`python run.py --hoja <id>` genera `proyectos/<id>/hojas/hoja_*.jpg` (3 cuadros por escena) y lista los errores de JavaScript.
Abre TODAS las hojas con Read y corrige hasta que cada escena cumpla:
1. Se reconoce a primera vista lo que dice la voz (si alguien sin audio no lo entendería, redibuja).
2. El protagonista se ve igual de una escena a otra y ocupa buena parte del cuadro.
3. Nada cortado, encimado ni ilegible; ningún rótulo bajo los subtítulos o la portada; ninguna escena vacía o casi vacía.
4. Entre el primer y el último cuadro de cada escena algo cambió.
5. (Sombra de Evidencia) Si `--hoja` imprime `AVISO: escena N casi estática`, esa escena no cumple el movimiento obligatorio: añade
   cámara que viaja, actuación u objeto en movimiento y vuelve a generar la hoja hasta que no salga ningún aviso. Tito y Sombra se ven grandes.
Repite hoja → corrección al menos una vez aunque no haya errores evidentes.

## 5. Entrega
No renderices: la fábrica lo hace. Termina con una sola línea `PROYECTO: <id>` cuando las hojas cumplan todo lo anterior.
(A mano, el MP4 se obtiene con `python run.py --render <id> --correo`.)
