---
description: "¿Lo arriesgarías?": historia REAL de alguien que lo apostó todo, en 35-50 s con silueta sin rostro y títulos gigantes, en español e inglés
argument-hint: "riesgo <tema>"
---

Deja escrito, dibujado y revisado UN video de la página **¿Lo arriesgarías?**, sin pedir confirmaciones ni hacer preguntas (nadie
está mirando: lo lanza la fábrica, `src/autor.py`, que después lo renderiza en español e inglés y lo envía por correo). `$ARGUMENTS` =
`riesgo` y el tema. Todo lo que necesitas está aquí, en `ejemplos/riesgo/` (guion y escenas de un video completo: léelos enteros), en
la cabecera de `plantilla/decorados.js` (fondos y props `D`) y en la firma de `S30.hombre` de `plantilla/sombra_ilustra.js`. No leas otros archivos.

**La página:** historias **reales** de personas famosas o de empresas que lo apostaron todo: despedidos, rechazados, sin dinero, al
borde de la quiebra, y lo que pasó después. Se cuentan en 35-50 s con una **silueta oscura sin rostro**, títulos gigantes y un giro
que cambia cómo ves al personaje. Funciona porque (1) el gancho promete un contraste imposible («Ser X es casi imposible»,
«lo echaron de su propia empresa»), (2) hay números concretos, (3) el final no es un sermón sino un reto que divide a los comentarios.
Tono: narrador directo, frases cortas, tensión; admira sin adorar y muestra el costo real.

## 1. Guion (`proyectos/guion_nuevo.json`)
- **Si el tema dice LIBRE** (lo normal), elige con `WebSearch` una historia real y conocida, de alguien que muchos admiran o conocen
  (fundadores, deportistas, artistas, empresas) con un **contraste fuerte**: de tocar fondo a la cima, o el error que lo cambió todo.
  Varía el sector y el país; no repitas ninguna ya hecha. Pon en `tema` un nombre corto ("Steve Jobs: lo echaron de Apple").
- **Verifica cada dato antes de escribirlo** (`WebSearch`/`WebFetch`: biografías, prensa seria, la propia empresa). Usa solo lo que
  confirmen **dos fuentes**; si dudas de una cifra, un año o una frase, quítala o suavízala («unos 400 millones»). **Nada de frases
  atribuidas, rumores, vida privada, salud, política, religión ni acusaciones**; nada que pueda dañar la reputación de alguien vivo.
  Pon en `fuentes` 2-4 enlaces de donde salen los datos (el humano los revisa antes de publicar).
- Formato: `{tema, titulo, portada: {texto, destacado, sub}, escenas: [{rol, voz, visual}], fuentes: [...], caption, hashtags, en: {titulo,
  portada, caption, hashtags, escenas: [{voz}]}}` como `ejemplos/riesgo/guion.json`. Español neutro de Latinoamérica.
  **12-16 escenas, 100-140 palabras (35-50 s)**, frases de 4-12 palabras. Se permiten hasta 4 cifras (dólares, años, intentos): son el motor del video.
- **Gancho (escena 1) = el contraste, no el contexto:** «Lo echaron de la empresa que él mismo fundó.» / «Fracasó 5.127 veces antes del
  primer éxito.» Máx. 12 palabras. Nunca «esta es la historia de», «había una vez» ni un año como primera palabra.
- Estructura (`rol`): `gancho` → `riesgo` (qué apostó y cuánto, 1-2 escenas) → `caida` (2-3 escenas: lo que salió mal; el espectador
  cree que se acabó) → `giro` (1-2 escenas: lo inesperado que lo cambió; la más llamativa) → `resultado` (1-2 escenas: qué logró,
  con un número) → `moraleja` (UNA frase de máx. 12 palabras, citable) → `pregunta` (la última).
- **El giro recontextualiza el gancho** (el final contesta o cambia el sentido de la primera frase): así dan ganas de volver a verlo.
- `moraleja`: humana y verosímil; no prometas que arriesgarse siempre funciona (muchos pierden): muestra el costo y la suerte que hubo.
- `pregunta` (última escena): un reto que **divide**, máx. 14 palabras, dicho por la voz («¿Tú lo habrías arriesgado todo? Escríbelo en
  los comentarios.»). Nunca «síguenos».
- El video NO lleva título encima al empezar (los títulos van dibujados en las escenas, ver §3). Aun así llena `portada`: 2-5 palabras
  que intrigan (`texto`), `destacado` = trozo literal de `texto`, `sub`. `titulo`: máx. 60 caracteres que intriguen sin contar el giro.
  `caption`: primera línea = una frase que intrigue; termina con la pregunta final. `hashtags`: 3-5 (el nombre del personaje o empresa y el tema).
- **Versión en inglés (`en`)**: no es traducción literal, es la misma historia contada por un narrador nativo, con frases igual de cortas y el giro en
  el mismo lugar. **Exactamente el mismo número de escenas** y la misma idea en cada una; largo parecido por escena (±3 palabras).
  `en.escenas` = `[{"voz": "..."}]`. `titulo`, `portada` y `caption` en inglés, 3-5 `hashtags` en inglés.

## 2. Proyecto
`python run.py --nicho riesgo --guion proyectos/guion_nuevo.json` imprime el id y la ruta de `proyectos/<id>/escenas.js`.

## 3. Dibujo 2D ilustrado (`proyectos/<id>/escenas.js`)
Mismo motor de ilustración (pincel con volumen, luz cálida de borde, grano), pero con la estética de esta página: **silueta oscura sin
rostro, fondos dramáticos de noche y títulos gigantes**. Imita `ejemplos/riesgo/escenas.js` en estructura y nivel de detalle.
- `window.ESCENAS = [...]`: UNA función por escena, en orden: `(ctx, t, d, K, T) => {...}`. `t` = segundos de la escena, `d` = su
  duración (anima con fracciones de `d`: `K.prog(t, a, b)`), `T` = segundos del video. Solo funciones del tiempo: **prohibido
  `Math.random()`, `Date` y estado entre cuadros.** Canvas 1080x1920; el suelo de los fondos está en y=1250.
- **Idioma de los rótulos:** el mismo `escenas.js` sirve para español e inglés. TODO texto dibujado (títulos, pegatinas, letreros)
  va con `const L = (es, en) => (window.IDIOMA === 'en' ? en : es);`. Los nombres propios no cambian.
- **El personaje es una SILUETA:** `S30.hombre(ctx, x, y, s, { T, semilla, variante: 'hombre'|'mujer'|'anciano', silueta: true, dir, pose, paso })`:
  figura oscura sin rostro con luz de borde cálida. Nunca dibujes caras ni pintes a una persona real reconocible; la silueta es el
  personaje en todas las escenas (misma `semilla`). Otras personas (jefes, público): siluetas más pequeñas o en grupo. Objetos que lo
  identifican (una laptop, una cámara, un cohete) cuentan quién es mejor que cualquier rasgo.
- **Título gigante:** en casi todas las escenas, una frase de 2-5 palabras arriba (y≈300-520) con el helper `titular` del ejemplo
  (blanco, tipografía `K.TITULAR`/Anton en mayúsculas, **una palabra en rojo `#FF4B3E`**), que entra con un pequeño rebote. Es lo que
  se lee sin sonido. Debajo, a veces, una **pegatina amarilla** (`K.pastilla` con `fondo: '#FFD23F'`, `color: '#1a1033'`, inclinada ±3°)
  con el dato («1 millón al día», «5.127 prototipos»). Máx. 1 título y 1 pegatina por escena.
- **Fondos y props: solo los de `D`** (cabecera de `plantilla/decorados.js`) y los helpers del ejemplo (estrellas, cohete, suelo de
  billetes). Fondos nocturnos: `D.fondo.abstracto(ctx, T, {tema: 'ciruela'|'noche'})`, `D.fondo.cielo`, `D.fondo.calle` de noche. Props
  de dinero y negocio: `D.billetes`, `D.monedas`, `D.grafica`, `D.fachada({letrero})`, `D.periodico`, `D.caja_registradora`, `D.reloj`,
  `D.camaraCine`, `D.papel`. Empezar con `S30.vaiven(ctx, T)` y cerrar con `S30.pelicula(ctx, T)`.
- **El giro se SIENTE:** en la escena `giro` el visual es el más fuerte (cambio de luz, halo `K.halo` que estalla, el fondo pasa de
  frío a cálido) y la `moraleja` se escribe en grande sobre `D.fondo.abstracto`.
- Paleta: fondos morados/azul noche, blanco, rojo `#FF4B3E` solo para lo que duele y amarillo `#FFD23F` para lo que importa.
- Ritmo: cada escena dura 2-4 s y algo se mueve desde el primer cuadro (la silueta camina, un objeto cae o sube, cámara con `K.plano` con z
  fijo, una gráfica que crece). Sin zoom animado. No repitas el mismo plano dos escenas seguidas.
- **Zonas seguras:** títulos entre y≈300 y 560; lo importante entre **y=420 y 1250 y x=80-940**; los subtítulos van en y≈1260-1450: nada
  importante ahí; lo de y>1500 lo tapa la app. La última escena: fondo oscuro con halo y la silueta pequeña abajo (y≈1560); la pregunta la pone el sistema en y≈420-1000.
- Rendimiento: ≤ ~250 ms por cuadro; lo estático ya se cachea solo, no crees objetos nuevos por cuadro. Escribe el archivo de una vez.

## 4. Revisión
`python run.py --hoja <id>` genera `proyectos/<id>/hojas/hoja_*.jpg` (inicio y final de cada escena) y lista los errores de
JavaScript. Ábrelas con Read y corrige lo que no cumpla: se entiende la historia con solo los títulos y las siluetas; la silueta se
ve igual en todas las escenas y NUNCA tiene rostro; el giro es la escena más fuerte; los rótulos usan `L(...)`; títulos legibles y no
tapados por los subtítulos; algo cambia entre el inicio y el final de cada escena. **Si no hay errores y todo se ve, una sola revisión
basta.** La escena de la moraleja (solo la frase en grande) puede salir en el aviso de «casi estática»: es normal, no la toques.

## 5. Entrega
No renderices: la fábrica lo hace (español e inglés). Termina con una sola línea `PROYECTO: <id>`.
