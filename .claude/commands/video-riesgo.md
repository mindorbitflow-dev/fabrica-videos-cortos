---
description: "¿Lo arriesgarías?": escalas de dinero y fortunas reales en pseudo-3D (torres de billetes, multitudes, la Tierra) con cámara que viaja, 35-60 s, en español e inglés
argument-hint: "riesgo <tema>"
---

Deja escrito, dibujado y revisado UN video de la página **¿Lo arriesgarías?**, sin pedir confirmaciones ni hacer preguntas (nadie
está mirando: lo lanza la fábrica, `src/autor.py`, que después lo renderiza en español e inglés y lo envía por correo). `$ARGUMENTS` =
`riesgo` y el tema. Todo lo que necesitas está aquí, en `ejemplos/riesgo/` (guion y escenas de un video completo: léelos enteros), en
la **cabecera documentada de `plantilla/escala3d.js`** (el pseudo-3D: global `E3`), en la cabecera de `plantilla/decorados.js` (fondos y props `D`) y
en la firma de `S30.hombre` de `plantilla/sombra_ilustra.js`. No leas otros archivos.

**La página:** convierte **números enormes en objetos gigantes que se ven y se mueven** (una torre de billetes que no termina, miles de
personas, la Tierra de noche, una pirámide) para que la gente sienta lo que es de verdad una fortuna, y lo ata a una historia real de riesgo
(«empezó con 500 dólares», «en 2008 pidió prestado hasta para pagar la renta»). Funciona porque (1) el gancho promete un contraste imposible,
(2) cada cifra es un objeto que crece y una cámara que viaja (nada queda quieto), (3) el final es un reto que divide a los comentarios.
Tono: narrador directo, frases cortas, tensión; admira sin adorar y muestra el costo real y la suerte que hubo.

## 1. Guion (`proyectos/guion_nuevo.json`)
- **Si el tema dice LIBRE** (lo normal), elige con `WebSearch` una comparación de escala o una historia real de riesgo con un contraste fuerte
  («si ganaras 1 dólar por segundo…», «un billón de dólares en billetes de 100 llegaría a… km», «lo que gana por segundo una gran empresa»,
  la fortuna de alguien frente a su origen humilde). Varía el personaje, el sector y el tipo de comparación; no repitas ninguna ya hecha.
  Pon en `tema` un nombre corto.
- **La aritmética de escala la haces tú y la compruebas** (segundos por año = 31,56 millones; un billete mide 0,11 mm de grosor, etc.). Redondea
  hacia lo que sea seguro («unos 32 años», «más de nueve mil años») y revisa que cada comparación sea verdadera.
- **Verifica cada dato real antes de escribirlo** (`WebSearch`/`WebFetch`: biografías, prensa seria, la propia empresa). Usa solo lo que confirmen
  **dos fuentes**; si dudas de una cifra, un año o una frase, quítala o suavízala. **Nada de frases atribuidas, rumores, vida privada, salud, política,
  religión ni acusaciones**; nada que pueda dañar la reputación de alguien vivo. Pon en `fuentes` 2-4 enlaces de donde salen los datos.
- Formato: `{tema, titulo, portada: {texto, destacado, sub}, escenas: [{rol, voz, visual}], fuentes: [...], caption, hashtags, en: {titulo,
  portada, caption, hashtags, escenas: [{voz}]}}` como `ejemplos/riesgo/guion.json`. Español neutro de Latinoamérica.
  **12-18 escenas, 100-170 palabras (35-60 s)**, frases de 3-12 palabras. Se permiten varias cifras: son el motor del video.
- **Gancho (escena 1) = la pregunta o el contraste:** «Si ganaras un dólar cada segundo, ¿cuánto tardarías en hacerte rico?» / «Lo echaron de la empresa
  que él mismo fundó.» Máx. 14 palabras. Nunca «esta es la historia de», «había una vez» ni un año como primera palabra.
- Estructura (`rol`): `gancho` → `escala` (4-7 escenas cortas, una cifra por escena y cada una MÁS grande que la anterior) → `giro` (lo inesperado que
  cambia cómo ves la cifra: el origen humilde) → `riesgo` (qué apostó y cuánto) → `caida` (lo que casi sale mal) → `moraleja` (UNA frase de máx. 12
  palabras) → `pregunta` (la última).
- `moraleja`: humana y verosímil; no prometas que arriesgarse siempre funciona (muchos pierden): muestra el costo y la suerte.
- `pregunta` (última escena): un reto que **divide**, máx. 14 palabras, dicho por la voz («¿Tú lo habrías arriesgado todo? Escríbelo en los
  comentarios.»). Nunca «síguenos».
- El video NO lleva título encima al empezar (los títulos van dibujados en las escenas, ver §3). Aun así llena `portada`: 2-5 palabras que intrigan,
  `destacado` = trozo literal de `texto`, `sub`. `titulo`: máx. 70 caracteres. `caption`: primera línea = frase que intrigue; termina con la pregunta
  final. `hashtags`: 3-5 (el personaje o empresa y el tema).
- **Versión en inglés (`en`)**: no es traducción literal, es la misma historia contada por un narrador nativo, con frases igual de cortas y el giro en
  el mismo lugar. **Exactamente el mismo número de escenas** y la misma idea en cada una; largo parecido por escena (±3 palabras). `en.escenas` =
  `[{"voz": "..."}]`. `titulo`, `portada` y `caption` en inglés, 3-5 `hashtags` en inglés.

## 2. Proyecto
`python run.py --nicho riesgo --guion proyectos/guion_nuevo.json` imprime el id y la ruta de `proyectos/<id>/escenas.js`.

## 3. Dibujo en pseudo-3D (`proyectos/<id>/escenas.js`)
Imita `ejemplos/riesgo/escenas.js` en estructura y nivel de detalle: cada cifra es un OBJETO que se ve y una CÁMARA que viaja.
- `window.ESCENAS = [...]`: UNA función por escena, en orden: `(ctx, t, d, K, T) => {...}`. `t` = segundos de la escena, `d` = su duración (anima con
  fracciones de `d`: `K.prog(t, a, b)`), `T` = segundos del video. Solo funciones del tiempo: **prohibido `Math.random()`, `Date` y estado entre
  cuadros.** Canvas 1080x1920.
- **Cámara en movimiento en TODAS las escenas** (aquí sí hay zoom, dolly, subida y órbita): crea `const c = E3.cam({...})` y mezcla dos cámaras con
  `E3.mezcla(c0, c1, k)` (k = `K.prog(t, 0, d)`): sube por una torre, vuela por un camino, órbita una pirámide, acércate a un objeto. Cada escena de
  escala usa un objeto distinto de `E3` (`torre`, `multitud`, `globo`, `piramide`, `retroPC`, `caja`) más el `suelo` o el fondo `E3.noche`.
- **Cada número es un objeto que crece o un contador** (`E3.contador`, con separador de miles según el idioma): la cifra sube mientras el objeto crece.
  Una silueta de 1,8 m al lado (`persona` del ejemplo: `S30.hombre(..., {silueta: true})`) da la escala. La silueta no tiene rostro y es siempre la misma
  (`semilla: 70`); nunca pintes a una persona real reconocible.
- **Texto mínimo, gigante y legible sin sonido:** un `E3.titular` de 1-3 líneas cortas arriba (y≈300-520, una palabra en rojo) y, a veces, una
  `E3.pegatina` amarilla con el dato. Máx. 1 título y 1 pegatina por escena.
- **Idioma de los rótulos:** el mismo `escenas.js` sirve para español e inglés. TODO texto dibujado va con `const L = (es, en) => (window.IDIOMA === 'en' ? en : es);`.
  Los nombres propios no cambian. Los contadores y letreros que formatean números usan `E3.contador` / el patrón del ejemplo.
- Fondos y props: solo `E3`, los de `D` (cabecera de `plantilla/decorados.js`) y los helpers del ejemplo. Empieza cada escena con `S30.vaiven(ctx, T)` y ciérrala con
  `S30.pelicula(ctx, T)`. Paleta: noche morada/azul, blanco, rojo `#FF4B3E` solo para lo que duele o preocupa y amarillo `#FFD23F` para el dato.
- **El giro se SIENTE:** en la escena `giro` cambia el objeto o la luz (de la torre gigante al computador de 500 dólares), con un halo (`K.halo`) o un golpe (`K.golpe`).
- Ritmo: cada escena dura 2-4 s y algo se mueve desde el primer cuadro. No repitas el mismo objeto ni el mismo encuadre dos escenas seguidas.
- **Zonas seguras:** títulos entre y≈300 y 560; lo importante entre **y=420 y 1250 y x=80-940**; los subtítulos van en y≈1260-1450 (nada importante ahí); lo de
  y>1500 lo tapa la app. La última escena: fondo oscuro con halo y la silueta pequeña abajo (y≈1560); la pregunta la pone el sistema en y≈420-1000.
- Rendimiento: ≤ ~250 ms por cuadro (la multitud: máx. ~3.000 personas; la torre: `banda` ≥ .1). Escribe el archivo de una vez.

## 4. Revisión
`python run.py --hoja <id>` genera `proyectos/<id>/hojas/hoja_*.jpg` (inicio y final de cada escena) y lista los errores de JavaScript. Ábrelas con Read y
corrige lo que no cumpla: se entiende la historia con solo los títulos y los objetos; los objetos no desaparecen cuando la cámara se acerca; los números
y rótulos usan `L(...)`; nada tapado por los subtítulos; algo cambia entre el inicio y el final de cada escena. **Si no hay errores y todo se ve, una sola
revisión basta.** La escena de la moraleja (solo la frase en grande) puede salir en el aviso de «casi estática»: es normal, no la toques.

## 5. Entrega
No renderices: la fábrica lo hace (español e inglés). Termina con una sola línea `PROYECTO: <id>`.
