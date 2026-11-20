---
description: "Así se fabrica": arma en 2D ilustrado un objeto o máquina pieza por pieza, desde la falla, listo para renderizar
argument-hint: "taller <tema>"
---

Deja escrito, dibujado y revisado UN video de la página **Así se fabrica**, sin pedir confirmaciones ni hacer preguntas (nadie
está mirando: lo lanza la fábrica, `src/autor.py`, que después lo renderiza y lo envía por correo). `$ARGUMENTS` = `taller` y
el tema. Todo lo que necesitas está aquí, en `plantilla/taller2d.js` (librería `W2`) y en `ejemplos/taller/`: no leas otros archivos.

**La página:** cualquier objeto, electrodoméstico o máquina (licuadora, nevera, bombillo, candado, cremallera, inodoro, bici,
helicóptero…) se desarma y se vuelve a armar en un taller ilustrado en 2D (luz cálida, colores apagados, grano); cada pieza aparece porque sin ella algo falla a la vista.
Tono: casual y con humor, como un amigo que la arma contigo; frases cortas; física real, sin mitos. El personaje de la página
(`W2.patito`, un patito de hule con casco de aviador) aparece siempre: a bordo, usándolo o mirando asustado cuando algo falla.

## 1. Guion (`proyectos/guion_nuevo.json`)
- **Si el tema dice LIBRE** (lo normal en esta página), elígelo tú pensando en viralidad: un objeto, electrodoméstico o
  máquina que millones usan o ven a diario (o uno espectacular que todos quieren ver por dentro), con fallas muy visuales y una
  pieza sorprendente que casi nadie conoce. Varía: no repitas el mismo tipo de objeto que en los últimos temas hechos, ni
  ninguno de la lista de ya hechos. Pon en `tema` su
  nombre corto ("La plancha", "El tanque del inodoro"): queda en el historial para no repetirlo.
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
- El video NO lleva título encima al empezar: arranca directo en el gancho, con la voz y la imagen. Aun así llena `portada`
  (la usan el correo y el post): 3-5 palabras con la consecuencia ("SIN ESTA PIEZA SE ESTRELLA"), `destacado` = trozo
  literal de `texto`, `sub` corto. `titulo`: máx. 60 caracteres con la consecuencia ("Le quité una pieza a este avión y se estrelló").
- `cierre` (última escena): "¿Qué [objeto/máquina] desarmamos después? Escríbela en los comentarios." (o una pregunta concreta
  del tema). `caption`: primera línea = gancho; termina con la misma pregunta. `hashtags`: 3-5 del tema.

## 2. Proyecto
`python run.py --nicho taller --guion proyectos/guion_nuevo.json` imprime el id y la ruta de `proyectos/<id>/escenas.js`.

## 3. Dibujo 2D ilustrado (`proyectos/<id>/escenas.js`)
Lee una vez `plantilla/taller2d.js` (la cabecera documenta `W2`) y `ejemplos/taller/escenas.js` (un video completo). No se usa three.js, `T3` ni `P`.
- `window.ESCENAS = [...]`: UNA función por escena, en orden: `(ctx, t, d, K, T) => W2.escena(ctx, T, { fondo, cam }, c => {...})`. `t` = segundos de
  la escena, `d` = su duración (anima con fracciones de `d`), `T` = segundos del video. Solo funciones del tiempo: prohibido `Math.random()`, `Date` y estado entre cuadros.
- Mundo en px: (0,0) = la mesa o pista; Y negativa = arriba. Define primero el objeto como UNA función con un factor de aparición 0-1 por pieza (como `avion()` del
  ejemplo) y úsala en todas las escenas: así se arma y se desarma siempre igual. Cada pieza va en `W2.grupo(c, {k, entra:'encaja'|'cae'|'desliza'|'atornilla'|'pop', desde, clic}, () => {...})`.
- `W2` (una línea por función):
  - Escena: `W2.escena` (fondo `taller`|`cocina`|`cielo`|`pista` con paralaje, mesa en Y=0, cámara `{x,y,z,rot,sacude}`, luz y grano) · `W2.cam(t, claves)` (cámara por claves; `'corta'` = corte seco) · `W2.grupo` (pieza compuesta: x,y,rot,s,pivote,espejo,k,entra,vib) · `W2.aMundo` (punto local → mundo).
  - Piezas con volumen: `caja`, `cilindro`, `tapa`, `bandeja`, `lamina`, `engranaje`, `rueda`, `polea`, `correa`, `resorte`, `motor`, `bobina`, `iman`, `helice`/`aspas`, `tubo` (codos y líquido que fluye), `valvula`, `grifo`, `manometro`, `vaso` (vaso/frasco/tanque con líquido), `cable`, `piston`, `biela`, `manivela`, `bisagra`, `tornillo`, `bombilla`, `boton`, `palanca`, `perilla`; `W2.forma` y `W2.F/R/E/C` para formas propias con el mismo Pincel; colores apagados en `W2.C`.
  - Fallas y fuerzas: `humo`, `vapor`, `chispas`, `arco`, `chorro`, `salpica`, `derrame`, `agua` (inundación), `calentar` (brilla al rojo), `vibra` / `vib:` (temblor), `polvo`, `explosion`, `onda`, `destello`, `flecha`, `viento` (con `curva` para doblarlo), `icono` (`pregunta`, `exclama`, `rayo`, `estrella`, `gota`), `sombra`, `caida` (cae y rebota), `balistica`.
  - Personaje: `W2.patito(c, T, {x, y, s, estado:'normal'|'usa'|'susto'|'celebra', estado2, k2, casco, dir, rot})`: aparece siempre, a bordo, usándolo o asustado.
- **Zonas seguras**: los subtítulos van ARRIBA (y=170-400, el fondo ya oscurece esa franja): déjala libre. Lo importante entre y≈450 y y≈1200 y x 80-940. La última escena
  deja la pregunta del sistema en y≈420-1000: pon el objeto abajo (y>1050).
- **Sin rótulos ni textos** dentro de las escenas (nada de `K.pastilla` ni `fillText`); los símbolos salen de `W2.icono` y `W2.flecha`. Se entiende por la imagen y la voz.
- Cámara: varía el plano en cada escena (zoom `z` 1-2, paneo, vista de perfil, desde arriba, primer plano de la pieza nueva) y en cada falla cambia algo grande (humo, chorro, giro, caída).
  Objeto pequeño: acércate (`z` 1.4-2) o escálalo. Cada falla debe ser exagerada, clara y graciosa.
- **Colores**: apagados y cálidos (los de `W2.C`), con contraste suficiente; el fondo ya trae el mundo del taller. Nada de colores chillones.
- Rendimiento: ≤ ~250 ms por cuadro; no dibujes cientos de formas por cuadro. Escribe el archivo de una vez, reutilizando funciones; nada de comentarios largos.

## 4. Revisión
`python run.py --hoja <id>` genera `proyectos/<id>/hojas/hoja_*.jpg` (inicio y final de cada escena) y lista los errores de
JavaScript. Ábrelas con Read y corrige lo que no cumpla: se reconoce lo que dice la voz; el objeto se ve igual en todas las
escenas y ocupa buena parte del cuadro; nada cortado ni tapado por los subtítulos de arriba; ningún texto dentro de las escenas; algo cambia entre el inicio y el final; sin errores de JavaScript. **Si no
hay errores y todo se ve, una sola revisión basta.**

## 5. Entrega
No renderices: la fábrica lo hace. Termina con una sola línea `PROYECTO: <id>`.
