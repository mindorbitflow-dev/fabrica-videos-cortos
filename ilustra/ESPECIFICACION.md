# Ilustra — Especificación técnica (Fase 1)

Kit de ilustración animada por código, Canvas 2D, para video vertical 1080x1920 a 30 fps.
Estilo objetivo: ilustración 2D de película animada / concept art: colores apagados, fondos azul-grisáceos,
luz cálida de ventanas y farolas, lluvia, niebla, profundidad por capas, grano de película, personajes con volumen.

Este documento es normativo: cualquier implementación debe seguir nombres, firmas y valores por defecto aquí fijados.

---------------------------------------------------------------------------------------------------------------
## 0. Reglas globales

1. **Determinismo**: toda escena es `draw(ctx, t)` con `t` en segundos. Prohibido `Math.random`, `Date`, `performance.now`
   dentro del dibujo. Toda aleatoriedad sale de `Ilustra.rng(semilla)` (mulberry32) o de `Ilustra.ruido*` (hash puro).
   Mismo `t` ⇒ mismos píxeles (verificado por `herramientas/verificar_determinismo.py`, hash SHA-256 de dos renders).
2. **Sin dependencias**: JS clásico (no módulos ES: Chrome bloquea `import` desde `file://`). Cada archivo de `src/`
   añade miembros a `window.Ilustra`. Orden de carga fijo (ver §1). Existe también `dist/ilustra.js` (concatenación).
3. **Coordenadas**: lienzo lógico 1080x1920. Unidad = píxel lógico. Ángulos en radianes, 0 = derecha, positivo = horario
   (eje y hacia abajo, convención de canvas).
4. **Zona segura** (constante `Ilustra.ZONA`): `{arriba:250, abajo:420, izq:70, der:140, dibujo:[430,1190], subtitulos:[1210,1440]}`.
   El sujeto principal (cabeza y torso del protagonista, objeto narrativo) debe quedar dentro de x∈[70,940], y∈[430,1190].
   Fondos y atmósfera sí cubren todo el lienzo.
5. **Rendimiento**: presupuesto 0.5 s/cuadro. Decisión: render a resolución completa 1080x1920; las capas costosas
   (niebla, halos, desenfoque de fondo) se calculan en lienzos auxiliares a 1/4 de resolución (270x480) y se escalan
   con suavizado (son difusas por naturaleza, no se nota). El grano usa 4 losetas de ruido precalculadas de 256x256.

---------------------------------------------------------------------------------------------------------------
## 1. Arquitectura y archivos

| Orden | Archivo | Contenido |
|---|---|---|
| 1 | `src/nucleo.js` | espacio de nombres, `rng`, `ruido1`, `ruido2`, `fbm`, utilidades de color, interpolación, easing, `capaAux` |
| 2 | `src/pincel.js` | renderizador pictórico: `Pincel.forma`, constructores de trazado, irregularidad, textura |
| 3 | `src/luz.js` | `Luz` (dirección, color clave, ambiente, borde), `halo`, `cono`, `ventanaLuz` |
| 4 | `src/atmosfera.js` | `lluvia`, `niebla`, `charcos`, `grano`, `vineta`, `gradacion`, `salpicaduras` |
| 5 | `src/camara.js` | `Camara` con paralaje por profundidad, temblor de mano, keyframes |
| 6 | `src/esqueleto.js` | `Esqueleto`, `POSES`, `mezclarPoses`, `ik2`, ciclos `caminar`, `respirar`, `parpadeo` |
| 7 | `src/personaje.js` | `Personaje` (render con volumen: cuerpo, ropa, cara, pelo, expresiones) |
| 8 | `src/props.js` | objetos: `farola`, `paraguas`, `edificio`, `ventana`, `puerta`, `mesa`, `taza`, `lampara`, `planta`, `cuadro`, `estanteria`, `olla`, `banco`, `arco` |
| 9 | `src/escenarios.js` | `calleLluviosa(opts)`, `interiorCalido(opts)` → devuelven objetos `Escenario` |
| 10 | `src/elipsis.js` | `silueta`, `sombraProyectada`, `planoDetalle`, `deEspaldas`, `contraluz` |
| 11 | `src/escena.js` | `Escena` (montaje de capas + cámara + postproceso), `Ilustra.montar` (bucle de vista previa) |

Herramientas:
- `herramientas/render.py` — renderiza fotogramas PNG con Playwright (Chromium headless), hojas de contacto y MP4.
- `herramientas/verificar_determinismo.py` — renderiza el mismo `t` dos veces y compara hashes.
- `herramientas/construir.py` — concatena `src/*.js` en `dist/ilustra.js`.

Escenas de ejemplo: `escenas/<nombre>.html`. Cada HTML carga `src/*.js` y define `window.ESCENA` (objeto con
`duracion`, `fps`, `draw(ctx,t)`), y llama `Ilustra.montar(ESCENA)`.

**Contrato con el renderizador** (lo usa `render.py` y lo usará la fábrica):
- `window.ESCENA.duracion` (s), `window.ESCENA.fps` (30 por defecto).
- `window.Ilustra.renderizarEn(canvas, t)` dibuja el cuadro `t` en el canvas de 1080x1920 de la página.
- `window.Ilustra.listo` = `true` cuando se han generado texturas (son síncronas; siempre true tras cargar).

---------------------------------------------------------------------------------------------------------------
## 2. Núcleo (`nucleo.js`)

```js
Ilustra.ANCHO = 1080; Ilustra.ALTO = 1920;
Ilustra.rng(semilla:number) -> () => number in [0,1)        // mulberry32
Ilustra.hash(n:number) -> number in [0,1)                   // hash entero sin estado
Ilustra.ruido1(x:number, semilla=0) -> [-1,1]              // ruido de valor 1D suavizado (smoothstep)
Ilustra.ruido2(x, y, semilla=0) -> [-1,1]                   // ruido de valor 2D
Ilustra.fbm(x, y, octavas=4, semilla=0) -> [-1,1]
Ilustra.lerp(a,b,k); Ilustra.clamp(v,a,b); Ilustra.suave(k) // smoothstep
Ilustra.ease = {entra, sale, entraSale}                    // cúbicas
Ilustra.color(hex|[r,g,b]) -> [r,g,b]
Ilustra.mezcla(c1, c2, k) -> [r,g,b]
Ilustra.css(c, alfa=1) -> 'rgba(...)'
Ilustra.aclara(c, k) / Ilustra.oscurece(c, k)              // mezcla hacia blanco / hacia azul-negro #141822 (no negro puro)
Ilustra.capaAux(nombre, w, h) -> {canvas, ctx}             // lienzos auxiliares cacheados por nombre
Ilustra.claves(lista:[[t,valor],...], t, ease?) -> valor   // interpolación por keyframes (números, arrays u objetos planos)
```

Paleta por defecto `Ilustra.PALETA`: `noche:'#2b3442'`, `bruma:'#8d9aab'`, `cielo:'#a9b3bf'`, `piedra:'#6f7480'`,
`calido:'#ffc477'`, `ambar:'#f0a352'`, `piel:'#e8b896'`, `sombra:'#1d2230'`, `borde:'#ffe2b0'`.

---------------------------------------------------------------------------------------------------------------
## 3. El pincel (`pincel.js`)

Toda figura pasa por `Pincel.forma(ctx, trazado, estilo)`. `trazado` es una **lista de puntos** `[[x,y],...]` (polígono
cerrado, suavizado opcional con Catmull-Rom) o un `Path2D`. Constructores:

```js
Pincel.elipse(cx, cy, rx, ry, rot=0, n=28) -> puntos
Pincel.rect(x, y, w, h, radio=0) -> puntos
Pincel.capsula(x1,y1,r1, x2,y2,r2, n=10) -> puntos          // miembro cónico: dos semicírculos + tangentes
Pincel.poligono(puntos) -> puntos
Pincel.irregular(puntos, semilla, amp=1.5, frec=0.08) -> puntos   // desplaza cada punto por la normal con ruido1
Pincel.suavizar(puntos, pasos=4) -> puntos                  // Catmull-Rom cerrado
Pincel.aPath(puntos) -> Path2D
```

`estilo` (todos opcionales salvo `color`):

| campo | tipo | defecto | efecto |
|---|---|---|---|
| `color` | hex | — | color base (en luz media) |
| `luz` | `Luz` | `Ilustra.luzActual` | luz de la escena |
| `volumen` | 0..1 | 0.5 | intensidad del degradado de sombreado según dirección de luz |
| `borde` | 0..1 | 0.6 | intensidad de la luz de borde (rim) en el lado de la luz de borde |
| `anchoBorde` | px | 4 | grosor del rim |
| `sombraInterna` | 0..1 | 0.35 | oclusión suave en el lado opuesto a la luz |
| `textura` | 0..1 | 0.25 | intensidad de la textura de pincel |
| `semilla` | int | 1 | semilla de irregularidad/textura (estable entre cuadros ⇒ sin "hervor") |
| `irregular` | px | 1.2 | amplitud de irregularidad del borde (0 = limpio) |
| `contorno` | hex|null | null | trazo fino de contorno (oscurecido del color base) |
| `alfa` | 0..1 | 1 | opacidad global |
| `profundidad` | 0..1 | 0 | perspectiva atmosférica: mezcla el color hacia `luz.niebla` en proporción `profundidad*0.85` y reduce borde/textura |

Pipeline exacto de `Pincel.forma` (técnicas Canvas 2D):
1. **Color atmosférico**: `base = mezcla(color, luz.niebla, profundidad*0.85)`; además se tiñe 15% hacia `luz.ambiente`.
2. **Relleno con volumen**: `fillStyle` = degradado lineal a lo largo de la dirección de luz `luz.dir` sobre la caja del trazado:
   del lado iluminado `aclara(base, 0.18*volumen)` al lado en sombra `oscurece(base, 0.35*volumen)`.
3. `ctx.save(); ctx.clip(path)` y dentro del recorte:
   a. **Sombra interna suave**: truco de sombra fuera de lienzo: se rellena con regla `evenodd` (rectángulo enorme + trazado),
      trasladado 10000 px a la izquierda, con `shadowOffsetX=10000 + dx`, `shadowBlur=b`, `shadowColor=oscurece(base,0.5)` con
      alfa `sombraInterna`; `dx,dy` = dirección *hacia* la luz × 0.12×tamaño (la sombra aparece en el lado contrario).
   b. **Luz de borde (rim)**: mismo truco con color `luz.borde` (alfa `borde`), desplazamiento `anchoBorde` en la dirección
      contraria a `luz.dirBorde`, `shadowBlur = anchoBorde*0.8`. Resultado: media luna luminosa pegada al contorno del lado
      de `dirBorde`.
   c. **Textura de pincel**: patrón precalculado (`Pincel.textura(semilla%4)`, 256x256: 220 trazos cortos semitransparentes
      orientados ±25° alrededor de 35°, tonos claros y oscuros) con `globalCompositeOperation='soft-light'`,
      `globalAlpha = textura`, desplazado por la semilla.
4. `ctx.restore()`; si `contorno`, trazo de 1.6 px con alfa 0.55.

Las figuras nunca usan negro puro ni blanco puro.

---------------------------------------------------------------------------------------------------------------
## 4. Luz y atmósfera (`luz.js`, `atmosfera.js`)

```js
new Ilustra.Luz({dir:[-0.6,-0.8], dirBorde:[0.8,-0.3], clave:'#ffd9a0', ambiente:'#5c6b82',
                 borde:'#ffcf8a', niebla:'#8592a6'})
Ilustra.luzActual = luz                       // usada por defecto por Pincel
Ilustra.halo(ctx, x, y, r, color, intensidad=1)   // degradado radial con 'screen', 3 anillos (r, r*0.45, r*0.15)
Ilustra.cono(ctx, x, y, angulo, apertura, largo, color, intensidad)  // haz de farola, degradado lineal recortado a triángulo
Ilustra.ventanaLuz(ctx, x, y, w, h, color, t, semilla)              // rectángulo cálido con parpadeo sutil ±4% + halo
```

Atmósfera (todas puras en `t`):
```js
Ilustra.lluvia(ctx, t, {densidad:260, angulo:0.18, velocidad:1900, largo:[26,60], alfa:0.28, color:'#c9d3e0', semilla:7, capas:3})
   // gota i: x0 = hash(i)*W*1.3, fase = hash(i+999); y = ((fase*H*1.4 + t*vel*k) mod H*1.4) - 0.2H ; 3 capas de profundidad (k=0.6,0.85,1.1)
Ilustra.salpicaduras(ctx, t, {y0, y1, n:40, semilla})  // pequeños anillos elípticos en el suelo, ciclo de 0.35 s por gota
Ilustra.niebla(ctx, t, {y, alto, color, alfa:0.35, velocidad:8, semilla})  // banda de fbm a 1/4 de resolución, desliza en x
Ilustra.charcos(ctx, fuenteReflejo:(ctx)=>void, {y, alto, alfa:0.35})  // refleja verticalmente lo dibujado por la función, con ondas
Ilustra.grano(ctx, t, {intensidad:0.06})   // loseta de ruido 256x256 (4 variantes), índice = floor(t*24)%4, offset por hash
Ilustra.vineta(ctx, {fuerza:0.45, color:'#0f1420'})
Ilustra.gradacion(ctx, {sombras:'#25304a', luces:'#ffd7a0', fuerza:0.12})  // 'soft-light' de dos degradados
```

---------------------------------------------------------------------------------------------------------------
## 5. Cámara y paralaje (`camara.js`)

```js
const cam = new Ilustra.Camara({x:540, y:960, zoom:1, temblor:0.6, semilla:3})
cam.en(t)  -> {x, y, zoom, rot}               // aplica keyframes cam.claves = {x:[[t,v],..], y:[..], zoom:[..]}
cam.aplicar(ctx, t, z)                         // transforma para una capa de profundidad z (1 = plano del sujeto)
   // factor = 1/z ; tx = W/2 - (x - W/2)*factor - W/2 ... formalmente:
   // ctx.translate(W/2,H/2); ctx.scale(zoom^(1/z), zoom^(1/z)); ctx.rotate(rot/z); ctx.translate(-W/2 - (x-W/2)/z, -H/2 - (y-H/2)/z)
```
Profundidades convencionales: cielo z=12, edificios lejanos 5, medios 2.5, cercanos 1.5, sujeto 1, primer plano 0.7.
Temblor de mano: `ruido1(t*0.7)` × `temblor` px y ×0.002 rad.

---------------------------------------------------------------------------------------------------------------
## 6. Esqueleto y poses (`esqueleto.js`)

Esqueleto 2D jerárquico, vista lateral/tres cuartos. Huesos (padre → hijo), longitudes en unidades de `altura` (personaje
de altura H en píxeles; valores para un adulto, `altura=1`):

| hueso | padre | largo | notas |
|---|---|---|---|
| `cadera` | raíz | — | posición raíz `(x,y)` = pelvis |
| `columna` | cadera | 0.16 | |
| `pecho` | columna | 0.14 | |
| `cuello` | pecho | 0.05 | |
| `cabeza` | cuello | 0.13 | |
| `hombroD`/`hombroI` | pecho (extremo) | — | desplazados ±0.02 en profundidad |
| `brazoD`,`antebrazoD`,`manoD` | hombroD | 0.17, 0.155, 0.06 | idem `I` |
| `musloD`,`piernaD`,`pieD` | cadera | 0.245, 0.235, 0.08 | idem `I` |

Proporciones por tipo (`Ilustra.PROPORCIONES`): `adulto`, `nino` (cabeza ×1.35, piernas ×0.8), `anciano` (columna curva +0.25 rad).

**Pose** = objeto de datos con ángulos relativos al padre (radianes; 0 = continúa la dirección del padre; para la cadera,
ángulo absoluto con 0 = arriba):
```js
{ cadera:0, columna:0.02, pecho:0.02, cuello:0.05, cabeza:-0.05,
  brazoD:0.15, antebrazoD:-0.25, manoD:0, brazoI:-0.1, antebrazoI:-0.3, manoI:0,
  musloD:0.05, piernaD:0.02, pieD:0, musloI:-0.05, piernaI:0.02, pieI:0,
  raizY:0 }   // raizY: desplazamiento vertical de pelvis en unidades de altura
```
Ángulos de brazos/piernas son absolutos respecto a "hacia abajo" para el primer segmento (brazo, muslo) y relativos para los demás.
Poses incluidas en `Ilustra.POSES`: `dePie`, `sentado`, `agarrar`, `abrazar`, `saludar`, `manosBolsillos`, `cabizbajo`,
`sostenerParaguas`, `correr0`, `correr1`. Guardables como JSON.

```js
Ilustra.mezclarPoses(a, b, k) -> pose          // interpolación angular campo a campo
Ilustra.sumarPoses(base, delta, k=1) -> pose   // capas aditivas (respiración, viento)
Ilustra.ik2(origen, objetivo, l1, l2, flexion=+1) -> [ang1, ang2]   // dos huesos, ley del coseno, objetivo inalcanzable ⇒ extendido
Ilustra.ciclos.caminar(fase:0..1, {zancada:0.32, rebote:0.012, brazos:0.35}) -> pose delta (incluye raizY y avance de pies)
Ilustra.ciclos.correr(fase, ...) -> pose
Ilustra.ciclos.respirar(t, {frec:0.25, amp:0.012}) -> delta (pecho, hombros, raizY)
Ilustra.ciclos.parpadeo(t, semilla) -> 0..1    // 1 = ojo abierto; parpadeo de 0.14 s cada 2.5–5 s (pseudoaleatorio por semilla)
new Ilustra.Esqueleto(proporciones, altura).resolver(x, y, pose, dir) -> articulaciones {nombre:{x,y,a}}
```
`dir` = 1 mira a la derecha, -1 a la izquierda (espejo en x de los ángulos). Caminar: el pie de apoyo no debe deslizar:
la raíz avanza `velocidad*t` y el ciclo de pasos usa fase = `distancia/(2*zancada*altura)`.

---------------------------------------------------------------------------------------------------------------
## 7. Personaje (`personaje.js`)

```js
const p = new Ilustra.Personaje({
  nombre:'Lía', tipo:'adulto', altura:420, semilla:11,
  piel:'#e6b48f', pelo:'#3a2a26', peinado:'melena'|'corto'|'mono'|'calvo',
  abrigo:{color:'#c89a4a', largo:0.62, cuello:true}, bufanda:{color:'#3f6f73'}|null,
  pantalon:'#3b3f4c', zapatos:'#2a2524', camisa:'#d9d2c3',
  rasgos:{ojos:1, nariz:1, cejas:1, mejillas:0.35}
})
p.dibujar(ctx, t, {x, y, dir, pose, expresion, mirada:[dx,dy], viento:0..1, vista:'tresCuartos'|'espalda'|'perfil',
                   silueta:null|'#hex', paraguas:bool})
```
Orden de dibujo: pierna trasera → brazo trasero → (paraguas trasero) → torso/abrigo → pierna delantera (si el abrigo es corto)
→ cabeza (pelo trasero, cara, rasgos, pelo delantero) → bufanda → brazo delantero → mano.
- Extremidades: `Pincel.capsula` con grosor cónico (brazo 0.045→0.035 H, pierna 0.06→0.04 H), color de prenda, lado trasero
  oscurecido 18%.
- Abrigo: polígono entre hombros, cintura y bajo; el bajo ondula con `viento` y con la fase de las piernas.
- Cabeza: óvalo 0.105H × 0.125H, mentón suave; vista 3/4: rasgos desplazados 22% hacia `dir`.
- Cara (expresiones `Ilustra.EXPRESIONES`: `neutra`, `alegre`, `triste`, `sorpresa`, `enfado`, `pensativa`, `ternura`), cada una
  `{ceja:[inclinación, altura], ojo:apertura 0..1, boca:[curvatura -1..1, apertura 0..1], mejillas:0..1}`; mezclables.
  Ojos: blanco cálido + iris oscuro + brillo; párpado superior baja con `parpadeo`. Cejas: trazo grueso de color pelo.
- Pelo: masa de forma con 6–10 mechones (curvas) cuyas puntas oscilan con `viento*ruido1(t*1.3+i)`.
- Bufanda: lazo alrededor del cuello + cola de 3 segmentos animada por viento (cadena con retardo de fase).

---------------------------------------------------------------------------------------------------------------
## 8. Props (`props.js`)

Firma uniforme: `Ilustra.props.<nombre>(ctx, x, y, opciones)` donde `(x,y)` es el **punto de apoyo inferior central**,
`opciones` incluye `escala` (1), `profundidad` (0..1), `semilla`, `t` (si se anima) y los colores propios. Todo prop usa
`Pincel.forma`, así hereda luz, textura, borde y niebla. Registro: `Ilustra.props.registrar(nombre, fn)`.

Ejemplo de prop nuevo (normativo para el README):
```js
Ilustra.props.registrar('buzon', (ctx, x, y, o={}) => {
  const s = o.escala||1, P = Ilustra.Pincel;
  P.forma(ctx, P.rect(x-30*s, y-140*s, 60*s, 140*s, 6*s), {color:'#7a2f2a', semilla:o.semilla||5, profundidad:o.profundidad});
  P.forma(ctx, P.rect(x-22*s, y-118*s, 44*s, 8*s, 3*s), {color:'#2a2226', volumen:0, borde:0});
});
```

---------------------------------------------------------------------------------------------------------------
## 9. Escenarios (`escenarios.js`)

`Ilustra.escenarios.calleLluviosa({hora:'noche'|'atardecer', semilla})` y `Ilustra.escenarios.interiorCalido({semilla})`
devuelven `{luz, capas:[{z, dibujar(ctx,t)}], suelo:y, postAtmosfera(ctx,t), primerPlano(ctx,t)}`.
La escena intercala el personaje en `z=1` entre las capas.

Calle lluviosa: cielo degradado (z=12) → siluetas de tejados lejanos con ventanas tenues (z=5) → fachadas medias con
ventanas cálidas, toldos y escaparate de panadería (z=2.5) → farolas con halo y cono (z=1.5) → acera mojada con reflejos
de luces (charcos) → lluvia en 3 capas → niebla baja → gradación/viñeta/grano.

Interior cálido: pared con papel pintado tenue, ventana con lluvia nocturna azul (contraste frío/cálido), lámpara de pie
con halo, mesa con taza humeante, estantería, cuadro, planta; luz clave cálida desde la lámpara.

---------------------------------------------------------------------------------------------------------------
## 10. Elipsis (`elipsis.js`)

```js
Ilustra.elipsis.silueta(ctx, dibujarFn, color='#1b2130', bordeColor=null)   // dibuja fn en capa aux y la rellena de color
Ilustra.elipsis.sombraProyectada(ctx, dibujarFn, {ancla:[x,y], sesgo:-0.6, escalaY:0.45, alfa:0.45, desenfoque:6})
Ilustra.elipsis.contraluz(ctx, dibujarFn, {fuente:[x,y], color:'#ffcf8a'})   // silueta + halo detrás + borde luminoso
Ilustra.elipsis.planoDetalle(cam, rect, t0, t1)  // añade keyframes de cámara para encuadrar rect (zoom suave)
Ilustra.elipsis.deEspaldas -> se usa como opción vista:'espalda' del personaje
```

Fondos externos (hueco de API, no implementado): `{z, imagen:HTMLImageElement|null, ajuste:'cubrir'}` como capa; si
`imagen` es null se ignora. Documentado como futuro.

---------------------------------------------------------------------------------------------------------------
## 11. Escena (`escena.js`)

```js
const esc = new Ilustra.Escena({escenario, camara, duracion:10, fps:30,
  actores:[{personaje, estado:(t)=>({x,y,dir,pose,expresion,...})}],
  post:{lluvia:{...}|false, grano:0.06, vineta:0.45, gradacion:{...}}})
esc.draw(ctx, t)
```
Orden: limpiar → para cada capa por z descendente: `cam.aplicar(ctx,t,z)`; capa.dibujar → actores (z=1) → capas con z<1 →
`postAtmosfera` (lluvia, niebla) → gradación → viñeta → grano.

---------------------------------------------------------------------------------------------------------------
## 12. Rúbrica de revisión visual y criterios de aceptación

Hoja de contacto: `python3 herramientas/render.py escenas/X.html --hoja 12` (cuadrícula 4x3 de 12 cuadros equiespaciados,
miniaturas 270x480, con t impreso) + `--zona` superpone la zona segura.

Rúbrica (0–2 cada punto; aceptación ≥ 14/18 y ningún 0 en 1–4):
1. Volumen del personaje: degradado de luz y sombra visible en cara, torso y extremidades; proporciones creíbles.
2. Expresión: cara legible a 1/4 de tamaño (ojos con brillo, cejas, boca).
3. Luz de borde: rim cálido visible en el contorno del personaje del lado de la fuente.
4. Textura pictórica: bordes irregulares y textura de pincel visibles a 100%; no hay figuras de color plano puro.
5. Profundidad atmosférica: ≥3 planos distinguibles por contraste/saturación decreciente.
6. Luz: contraste cálido/frío (ventanas/farolas vs ambiente azul-gris).
7. Atmósfera animada: lluvia en movimiento, niebla que deriva, grano que cambia por cuadro.
8. Movimiento: ciclo de paso sin deslizamiento visible ni saltos; respiración y parpadeo presentes.
9. Composición: sujeto dentro de la zona de dibujo; nada importante en las franjas de interfaz.

Criterios medibles:
- Determinismo: SHA-256 idénticos para dos renders de t=3.2 s.
- Rendimiento: media ≤ 0.5 s/cuadro medida por `render.py` (tiempo de dibujo dentro de la página).
- Continuidad: diferencia media absoluta entre cuadros consecutivos < 12/255 en la región del personaje (sin cortes).

---------------------------------------------------------------------------------------------------------------
## 13. Anexo normativo: ajustes fijados durante la implementación (prevalecen sobre lo anterior)

Durante las rondas de revisión visual se fijaron estas decisiones; el código de `src/` las implementa tal cual.

**Rendimiento (§0.5, revisado).** Se renderiza a resolución completa 1080x1920. Medido en Chromium headless sin GPU
(`herramientas/verificar.py`): calle 128 ms/cuadro, interior 148 ms, elipsis 222 ms. Las capas `estatica:true` se dibujan
una vez en un lienzo cacheado (coordenadas de mundo, `limites:[x0,y0,x1,y1]`) y se reusan; niebla, mapa de luz y bloom
trabajan a 1/4 o 1/8 de resolución.

**Pincel (§3).**
- La dirección de luz (`luz.dir`, `luz.dirBorde`) vive en espacio de pantalla; `forma` la lleva al espacio local con la
  inversa de `ctx.getTransform()`, así funciona con dibujos rotados o reflejados (`scale(-1,1)`).
- Sombreado: lado en sombra = `oscurece(mezcla(base, luz.ambiente, 0.25·volumen), 0.5·volumen)`.
- Rim: primer pase `shadowBlur = 0.55·anchoBorde`, alfa `min(1, borde·1.15)`; si `borde>0.5`, segundo pase más fino
  (0.4·anchoBorde, color `aclara(luz.borde,0.5)`).
- Opciones añadidas: `emisivo` (no se sombrea: faroles, pantallas de lámpara), `plano` (solo relleno), `frecIrregular`.
- `Pincel.trazo(ctx, pts, {color, ancho, alfa})` (trazo abierto suavizado) y `Pincel.cinta(pts, a0, a1)` (trazo de grosor
  variable como polígono).
- `Pincel.forma` devuelve el `Path2D` usado (sirve para recortar detalles dentro de la figura).

**Luz y atmósfera (§4).** Añadidos: `Ilustra.mapaLuz(ctx, fuentes, {oscuridad})` (multiply de un mapa a 1/4 con agujeros
de luz radiales en coordenadas de pantalla), `Ilustra.bloom(ctx, {fuerza:0.35, radio:6})` (copia a 1/8, elevada a la 4ª
potencia con multiply, desenfocada, `screen`), `Ilustra.reflejoLuz(ctx, x, ySuelo, ancho, largo, color, t, semilla, k)`
(estela vertical de trazos horizontales ondulados). El halo usa 5 paradas (0.7, 0.5, 0.22, 0.07, 0 × intensidad).
Las farolas dibujan lluvia iluminada recortada a su cono y un charco de luz elíptico.

**Escena (§11).** Tipos de capa: `{z, dibujar}`, `{z, estatica, limites, desenfoque}` (profundidad de campo: se desenfoca
al cachear), `{pantalla:true, dibujar(ctx,t,cam)}`, `{actores:true}` (marcador del plano de los actores),
`{z, reflejoDe:capaEstatica, eje, alto, alfa, desenfoque}` (reflejo de suelo mojado precalculado) e `{imagen}` (hueco de API
para fondos externos: hoy se ignora). Los actores aceptan `antes(ctx,t,estado)` y `despues(ctx,t,estado)` (sombras
proyectadas, objetos en la mano). `post` admite `bloom` (por defecto `{fuerza:0.35}`).

**Esqueleto (§6).** `Ilustra.ciclos.poseCaminar(x, ySuelo, distancia, H, dir, base?, fijos?, opciones?)` produce una pose con
objetivos IK de pie (`objetivoPieD/I`) y ángulos de pie; los campos listados en `fijos` (p. ej. el brazo del paraguas)
se toman de `base`. `Ilustra.ciclos.poseParado(x, ySuelo, H, dir, base?, [xPieD, xPieI])` planta los pies donde se le diga
(transición caminar→parar sin deslizamiento). Las poses aceptan `objetivoManoD/I` y `objetivoPieD/I` en coordenadas de
mundo (IK de dos huesos; codo hacia atrás, rodilla hacia delante). `escalaCabeza` del adulto = 1.12.

**Personaje (§7).** `dibujar` devuelve las articulaciones y las guarda en `personaje.ultimas` (para colocar objetos en la
mano). Opciones de estado añadidas: `sombraSuelo` (bool), `respiracion` (0..1), `manoOculta` ('D'|'I'|true), `luz` (Luz
propia del actor; p. ej. luz cálida al acercarse a un escaparate). El bajo del abrigo cuelga de la cadena muslo→pierna de
cada lado a una distancia `largo·0.45·H` de la cadera (vale de pie, caminando, corriendo y sentado). En `vista:'espalda'`
los dos brazos van detrás del torso y no se dibujan manos ni cara.

**Props (§8).** Además de los listados: `escaparate`, `ventanaNoche` (ventana interior con lluvia nocturna y gotas en el
cristal). Excepción de anclaje: `paraguas` se ancla en la punta superior del astil.

**Elipsis (§10).** `contraluz` y `silueta` dibujan la figura en un lienzo auxiliar a resolución completa (coste ~100 ms).
`planoDetalle(cam, [x,y,w,h], t0, t1, mantener)` coloca el centro del rectángulo en y≈810 de pantalla.
