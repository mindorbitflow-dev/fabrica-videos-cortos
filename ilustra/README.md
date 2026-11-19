# Ilustra

Kit de ilustración animada por código para video vertical (1080x1920, 30 fps). Dibuja con Canvas 2D en un estilo
2D de película animada: colores apagados, fondos azul-grisáceos, luz cálida de ventanas y farolas, lluvia, niebla,
profundidad por capas, grano de película y personajes articulados con volumen.

- Sin dependencias ni imágenes externas: JavaScript clásico que corre en cualquier navegador o en Chromium headless.
- Determinista: una escena es `draw(ctx, t)`. El mismo `t` da siempre los mismos píxeles, así que cada cuadro se puede
  renderizar por separado, en cualquier orden.
- Pensado para usarse solo: no depende de ninguna aplicación concreta.

## Estructura

```
src/            el kit (cárguese en este orden): nucleo, pincel, luz, atmosfera, camara, esqueleto, personaje,
                props, escenarios, elipsis, escena
dist/ilustra.js todo el kit en un archivo (python3 herramientas/construir.py)
escenas/        escenas de ejemplo: calle_lluvia.html (10 s), interior.html (10 s), elipsis.html, poses.html
ejemplos/       minimo.html
herramientas/   render.py (PNG, hojas de contacto, MP4), verificar.py (determinismo, rendimiento, continuidad)
ESPECIFICACION.md  diseño completo y APIs
```

## Ver y renderizar

Abre cualquier `escenas/*.html` en un navegador para verla en bucle. Para obtener archivos (Python 3 + Playwright):

```bash
python3 herramientas/render.py escenas/calle_lluvia.html --t 2 8.5          # cuadros sueltos
python3 herramientas/render.py escenas/calle_lluvia.html --hoja 12 --zona   # hoja de contacto (con zona segura)
python3 herramientas/render.py escenas/calle_lluvia.html --todos --mp4      # 300 PNG + MP4 (si hay ffmpeg)
python3 herramientas/verificar.py escenas/calle_lluvia.html                 # comprobaciones medibles
```
La salida va a `salida/<escena>/`. Contrato para otros renderizadores: la página define `window.ESCENA`
(`duracion`, `fps`) y `Ilustra.renderizarEn(canvas, t)` dibuja el cuadro `t`.

## Ejemplo mínimo

```html
<canvas id="lienzo" width="1080" height="1920"></canvas>
<script src="dist/ilustra.js"></script>
<script>
const I = Ilustra;
const escenario = I.escenarios.calleLluviosa({ hora: 'atardecer' });
const ana = new I.Personaje({ altura: 520, peinado: 'mono', abrigo: { color: '#6f7f6a', largo: 0.6, cuello: true },
                              bufanda: { color: '#8a4a3a' } });
const escena = new I.Escena({
  escenario, duracion: 6,
  actores: [{ personaje: ana, estado: t => {
    const d = Math.min(t, 3) * 150, x = 200 + d;
    const pose = t < 3 ? I.ciclos.poseCaminar(x, escenario.suelo, d, 520, 1)
                       : I.ciclos.poseParado(x, escenario.suelo, 520, 1);
    return { x, y: escenario.suelo, dir: 1, pose, expresion: t < 3 ? 'neutra' : 'alegre', viento: 0.4 };
  } }],
  post: { lluvia: true }
});
I.montar(escena);
</script>
```
(Versión completa en `ejemplos/minimo.html`.)

## Conceptos

**Pincel.** Todo se dibuja con `Ilustra.Pincel.forma(ctx, puntos, estilo)`. A partir de un color base aplica el degradado
de volumen según la luz, la sombra interna, la luz de borde (rim), la textura de pincel, los bordes irregulares y la
niebla por profundidad. Constructores de figuras: `elipse`, `rect`, `capsula`, `poligono`, `suavizar`, `cinta`.

**Luz.** `new Ilustra.Luz({dir, dirBorde, clave, ambiente, borde, niebla})`. El escenario fija una luz y cada actor puede
llevar la suya (por ejemplo, más cálida cuando se acerca a un escaparate). Hay además `halo`, `cono`, `ventanaLuz`,
`mapaLuz` y `bloom`.

**Esqueleto y poses.** Las poses son datos: ángulos por hueso y, si se quiere, objetivos de cinemática inversa para manos
y pies (`objetivoManoD: [x, y]`). Se mezclan (`mezclarPoses`), se suman en capas (`sumarPoses`) y se generan con ciclos
(`ciclos.poseCaminar`, que no hace deslizar los pies, `respirar` y `parpadeo`). `Ilustra.POSES` incluye `dePie`, `sentado`,
`agarrar`, `abrazar`, `saludar`, `manosBolsillos`, `cabizbajo`, `sostenerParaguas`, `correr0` y `correr1`. Hay tres tipos de
cuerpo: `adulto`, `nino` y `anciano`.

**Personaje.** `new Ilustra.Personaje({tipo, altura, piel, pelo, peinado, abrigo, bufanda, pantalon, zapatos, ojos})`.
Al dibujarlo recibe `{x, y, dir, pose, expresion, mirada, viento, vista, luz, paraguas}`. Expresiones (mezclables con
`mezclarExpresiones`): `neutra`, `alegre`, `ternura`, `triste`, `sorpresa`, `enfado` y `pensativa`.

**Cámara.** `new Ilustra.Camara({claves:{x:[[t,v],...], y, zoom}, temblor})`. Cada capa tiene una profundidad `z`
(1 = plano de los personajes, mayor = más lejos). El paralaje sale solo.

**Elipsis.** Recursos del cine para contar lo difícil sin mostrarlo: `elipsis.silueta`, `elipsis.contraluz`,
`elipsis.sombraProyectada`, `elipsis.planoDetalle` (keyframes de cámara) y `vista:'espalda'`.

**Zona segura.** `Ilustra.ZONA`: deja libres 250 px arriba, 420 abajo, 70 a la izquierda y 140 a la derecha. El dibujo
principal va entre y=430 e y=1190 y los subtítulos entre 1210 y 1440. `Ilustra.dibujarZona(ctx)` la superpone para revisar.

## Cómo añadir un objeto nuevo

Un objeto es una función `(ctx, x, y, opciones)` anclada en su punto de apoyo inferior central. Si se dibuja con
`Pincel.forma`, hereda automáticamente la luz, la textura, el borde y la niebla de la escena:

```js
Ilustra.props.registrar('buzon', (ctx, x, y, o = {}) => {
  const s = o.escala || 1, P = Ilustra.Pincel;
  P.forma(ctx, P.rect(x - 30*s, y - 140*s, 60*s, 140*s, 6*s), { color: '#7a2f2a', semilla: o.semilla || 5, profundidad: o.profundidad });
  P.forma(ctx, P.rect(x - 22*s, y - 118*s, 44*s, 8*s, 3*s), { color: '#2a2226', volumen: 0, borde: 0 });
});
// en una capa del escenario:
escenario.capas.splice(escenario.capas.findIndex(c => c.actores), 0,
  { z: 1, dibujar: (ctx, t) => Ilustra.props.buzon(ctx, 760, escenario.suelo) });
```
Reglas: usa siempre una `semilla` fija (así los bordes no "hierven" entre cuadros), no uses `Math.random`, y si el objeto
se anima, hazlo en función de `o.t`.

## Cómo añadir un escenario

Escribe una función que devuelva `{luz, fondo, suelo, capas}`. Las capas se dibujan en el orden de la lista. Las que
no cambian con el tiempo, márcalas con `estatica: true, limites: [x0, y0, x1, y1]`: se dibujan una sola vez y quedan
cacheadas. Usa `{actores: true}` para marcar dónde van los personajes. Mira `src/escenarios.js`.

## Limitaciones

Consulta `INFORME_FASE1.md`. En resumen: los personajes se ven de perfil o de tres cuartos (no hay vista frontal), las
manos son mitones sin dedos, el vestuario se limita a abrigo y pantalón, y aún no se pueden cargar fondos externos
(el hueco ya está previsto en la API).
