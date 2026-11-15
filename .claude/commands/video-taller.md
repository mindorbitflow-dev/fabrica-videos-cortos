---
description: "Así se fabrica": arma en 3D un objeto o máquina pieza por pieza, desde la falla, listo para renderizar
argument-hint: "taller <tema>"
---

Deja escrito, dibujado y revisado UN video de la página **Así se fabrica**, sin pedir confirmaciones ni hacer preguntas (nadie
está mirando: lo lanza la fábrica, `src/autor.py`, que después lo renderiza y lo envía por correo). `$ARGUMENTS` = `taller` y
el tema. Todo lo que necesitas está aquí, en `plantilla/taller3d.js` y en `ejemplos/taller/`: no leas otros archivos.

**La página:** cualquier objeto, electrodoméstico o máquina (licuadora, nevera, bombillo, candado, cremallera, inodoro, bici,
helicóptero…) se desarma y se vuelve a armar en un mundo 3D low-poly; cada pieza aparece porque sin ella algo falla a la vista.
Tono: casual y con humor, como un amigo que la arma contigo; frases cortas; física real, sin mitos. El personaje de la página
(`P.piloto`, un patito de hule) aparece siempre: a bordo, usándolo o mirando asustado cuando algo falla.

## 1. Guion (`proyectos/guion_nuevo.json`)
- Formato: `{tema, titulo, portada: {texto, destacado, sub}, escenas: [{rol, voz, visual}], caption, hashtags}` como
  `ejemplos/taller/guion.json`. Español neutro. **18-24 escenas, 250-330 palabras (90-130 s)**, frases de 6-16 palabras.
- **El gancho es una consecuencia, no un tema.** En los primeros 2 s se VE algo salir mal y la voz pone algo en juego:
  "Si le quitas una sola pieza a este avión, se estrella." / "Sin este resorte de 2 centímetros, tu licuadora te salpica la
  cocina." / "Quítale esta pieza a un bombillo y se apaga en un segundo." Prohibido abrir con el tema o el plan: nada de "cómo
  funciona…", "desde cero", "vamos a armar/desarmar", "hoy veremos". La escena 2 sube la apuesta sin explicar ("Así que se las
  quitamos todas, a ver cuál hace qué."). La pieza del gancho se revela más adelante y se nombra como callback.
- Estructura (`rol`): `gancho` → `pregunta` → ciclos de `mecanismo`/`reenganche`: **lo mínimo** (la versión más simple que
  podría funcionar) → **falla a la vista** (salpica, se recalienta, explota, gira loco, se voltea, se cae, chispea, se inunda) →
  **la pieza que lo arregla y por qué** (una idea física en palabras de todos los días) → la siguiente falla… → `revelacion` en
  la pieza más sorprendente → `remate` (el objeto completo funcionando, igual que la escena 1: queda en bucle) → `cierre`.
- Cada pieza existe porque sin ella algo sale mal; si no puedes mostrar qué falla sin ella, no la incluyas. Las fallas son el
  humor: exageradas, físicas y claras. Nombres técnicos solo cuando la pieza aparece, explicados con lo que hace.
- Hechos ciertos: si dudas de un dato o una cifra, quítalo. Años y cifras con dígitos. Sin "sabías que", "increíble",
  "secreto", "descubre".
- Portada: 3-5 palabras con la consecuencia o la apuesta, nunca el tema ("SIN ESTA PIEZA SE ESTRELLA", "TU LICUADORA
  EXPLOTARÍA"); `destacado` = la consecuencia (trozo literal de `texto`); `sub` provoca ("y no es la que crees").
  `titulo`: máx. 60 caracteres con la consecuencia ("Le quité una pieza a este avión y se estrelló").
- `cierre` (última escena): "¿Qué [objeto/máquina] desarmamos después? Escríbela en los comentarios." (o una pregunta concreta
  del tema). `caption`: primera línea = gancho; termina con la misma pregunta. `hashtags`: 3-5 del tema.

## 2. Proyecto
`python run.py --nicho taller --guion proyectos/guion_nuevo.json` imprime el id y la ruta de `proyectos/<id>/escenas.js`.

## 3. Dibujo 3D (`proyectos/<id>/escenas.js`)
Léelo una vez: `plantilla/taller3d.js` (API de `T3` y `P`) y `ejemplos/taller/escenas.js` (cómo se arma un video completo).
- `window.ESCENAS = [...]`: UNA función por escena, en orden: `(ctx, t, d, K, T) => T3.cuadro(ctx, T, { camara, mundo },
  P => {...}, (c, P) => {...})`. `t` = segundos de la escena, `d` = su duración (anima con fracciones de `d`), `T` = segundos
  del video (movimiento ambiental). Solo funciones del tiempo: prohibido `Math.random()`, `Date` y estado entre cuadros.
- Define primero el objeto como UNA función con un factor de aparición 0-1 por pieza (como `avion()` del ejemplo, con
  `parte()` y `ap()`) y úsala en todas las escenas: así se arma y se desarma siempre igual. Formas reconocibles con pocas
  piezas: `caja`, `cilindro`, `cono`, `esfera`, `toro`, `disco`, `tubo` (de un punto a otro), `grupo`. Para ver por dentro,
  usa `opacidad` en la carcasa (corte transparente).
- Efectos para las fallas y las fuerzas: `helice`, `rueda`, `flecha`, `viento`, `polvo`, `T3.caida(t, altura)` (cae y
  rebota), `T3.tiembla(T)` (vibra), `T3.orbita(...)` (cámara que gira). Chispas, agua, vapor o humo: esferas o tubos pequeños
  con `opacidad` y `brillo` que se mueven con el tiempo.
- `mundo`: afuera `{ muro, pista, arboles }` (vehículos); objetos de casa `{ interior: true }` (piso y pared de cocina, sin
  pasto ni árboles) sobre una mesa que armas con `caja`. Objetos pequeños: escala el objeto a 1-2 m o acerca la cámara; la
  física se ve mejor grande.
- **Cámara**: el cuadro es vertical (poco ancho). Para ver entero un objeto de ~8 m, cámara a 13-18 m con `fov` 40-50;
  objeto de ~1,5 m, a 3-5 m. Mira un poco por debajo del objeto (`hacia` con y menor) para que quede en la mitad de arriba:
  subtítulos en y=1260-1440, portada en y=860-1240 durante la escena 1. Varía el plano en cada escena (de lado, desde arriba,
  persecución, primer plano de la pieza nueva) y en cada falla cambia algo grande.
- Rótulos (4.ª función, `rot()` del ejemplo con `K.pastilla` en `P.pantalla([x, y, z])`): pocos, en mayúsculas; rojo
  `#e5484d` para lo que falla ("¡SALPICA!"), verde para lo que funciona, blanco para nombrar piezas. La última escena sin
  texto: la pregunta la pone el sistema arriba; deja el objeto abajo o a un lado.
- Escribe el archivo de una vez, reutilizando funciones; nada de comentarios largos.

## 4. Revisión
`python run.py --hoja <id>` genera `proyectos/<id>/hojas/hoja_*.jpg` (inicio y final de cada escena) y lista los errores de
JavaScript. Ábrelas con Read y corrige lo que no cumpla: se reconoce lo que dice la voz; el objeto se ve igual en todas las
escenas y ocupa buena parte del cuadro; nada cortado ni bajo los subtítulos; algo cambia entre el inicio y el final. **Si no
hay errores y todo se ve, una sola revisión basta.**

## 5. Entrega
No renderices: la fábrica lo hace. Termina con una sola línea `PROYECTO: <id>`.
