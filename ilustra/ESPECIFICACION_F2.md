# Ilustra — Especificación técnica de la Fase 2

Este documento es normativo para los paquetes de trabajo (WP) de la Fase 2. La especificación de la Fase 1 (`ESPECIFICACION.md`,
incluido su §13) sigue vigente salvo donde este documento diga otra cosa. Los nombres, las firmas y los valores por defecto
de este documento son obligatorios. Cuando un WP necesite decidir algo que no esté aquí, debe elegir la opción más simple
compatible con este documento y anotarlo en su informe (§10.4).

Índice
- §1 Diagnóstico visual: referencia frente a nuestros fotogramas
- §2 Prototipos de validación: qué funcionó, qué se descartó y por qué
- §3 Arquitectura de la Fase 2 y compatibilidad con la Fase 1
- §4 Limitación 1: textura pintada (`pintura.js`)
- §5 Limitación 2: personajes (`cuerpo.js`, `ropa.js`, `mano.js`, `pelo.js`, `dinamica.js`)
- §6 Limitación 3: vistas 2.5D (`geom3.js`, `rig25.js`, `cabeza25.js`)
- §7 Limitación 4: interacción y varios personajes (`interaccion.js`, cambios en `escena.js`)
- §8 Rendimiento y determinismo
- §9 Rúbrica de revisión
- §10 Paquetes de trabajo (WP0–WP9)
- §11 Riesgos y lo que probablemente no se alcanzará

---------------------------------------------------------------------------------------------------------------
## 1. Diagnóstico visual

### 1.1 Material y sus límites

- **Referencias.** Están copiadas en `referencias/`: `ref1_calle_abrigo.jpg`, `ref2_arco_nina.png` y `ref3_pelo_periodico.png`.
  Son capturas de una red social. La ilustración ocupa unos 260×260 px y tiene compresión JPEG y textos superpuestos.
  - **Qué no se puede verificar:** a esa resolución no se distinguen pinceladas individuales ni textura de papel. Nada de
    este documento afirma que la referencia tenga pinceladas ni cómo se hizo.
  - **De dónde sale el objetivo de pintura:** el objetivo "debe leerse pintada" de §4 es una decisión del usuario, no una
    medida tomada de la referencia.
  - **Qué sí se puede medir:** formas, valores, color, bordes perdidos, siluetas, manos y caras.
- **Nuestros fotogramas.** `salida/mejores/1_calle_sonrisa_t9.67.png`, `2_calle_caminando_t2.10.png` y `3_elipsis_contraluz.png`.
- **Herramienta.** Las comparaciones se hacen con `herramientas/comparar.py` (§9.1). Su panel "NUESTRO @REF" reduce nuestro
  recorte a la resolución de la referencia, para comparar a igual cantidad de información.

### 1.2 Mediciones (de `comparar.py`; L = luminancia 0–100)

| Recorte (preset → nuestro) | Métrica | Referencia | Nuestro @REF | Lectura |
|---|---|---|---|---|
| `mujer` → Lía, caja 455,570,690,1200 | L p5–p95 | 12–77 | 31–72 | Nos faltan oscuros: la referencia tiene pelo y pantalón casi negros, y nuestra figura está "velada" en tonos medios |
| | L desv | 20.6 | 11.7 | Contraste interno de la figura: el nuestro es la mitad |
| `niebla` → fachada, caja 380,120,900,700 | L p5–p95 | 49–83 | 27–67 | La niebla de la referencia es de clave alta (clara); nuestro fondo es medio-oscuro |
| | bordes | 0.032 | 0.082 | Tenemos 2,5 veces más bordes en el fondo: ventanas, barandillas y molduras nítidas donde la referencia pierde los bordes |
| `calle` → escaparate, caja 200,760,560,1100 | L desv | 21.2 | 12.2 | El mismo patrón de valores comprimidos |
| `pelo` → cabeza, caja 505,575,660,760 | L p5 | 0.8 | 23.5 | El pelo de la referencia es casi negro, con puntas agudas; el nuestro es un casco marrón medio |

Las imágenes de estas comparaciones están en `salida/revision/comparar_*.png`.

### 1.3 Diferencias concretas observadas

**Pintura y valor (limitación 1, y una causa que no es la textura):**
1. **Gradiente sobre cada forma.** Cada forma nuestra lleva un degradado lineal, sombra interna blanda y luz de borde, con
   el mismo tratamiento en todas. Resultado: aerógrafo vectorial.
   - En la referencia, las zonas de color local son casi planas y las sombras son formas diseñadas, de borde blando pero
     definido.
   - Ejemplo en `ref1`: el abrigo crema tiene un plano de sombra ocre-gris a la derecha y bajo los brazos, no un degradado.
2. **Grano.** El nuestro es ruido monocromo por píxel en toda la imagen (a 100 % parece ruido de sensor). En la referencia no
   hay ruido visible; la variación aparece como moteado de baja frecuencia y vetas verticales suaves (fachada y niebla de
   `ref3`).
3. **Bordes del fondo.** Los nuestros son nítidos y reglados: ventanas, barandillas de 2 px y molduras. En la referencia la
   arquitectura se simplifica y los bordes se pierden en la niebla (bordes 0.032 frente a 0.082).
4. **Luz de borde.** Rodea casi toda nuestra figura como un halo naranja de recorte (ver `comparar_pelo_*.png`). En la
   referencia de día no hay luz de borde visible en los personajes; solo el escaparate aporta luz cálida lateral.
5. **Estructura de valores (§1.2).** Nuestra imagen vive entre L≈25 y L≈75. Las figuras de la referencia tienen negros
   reales (pelo, pantalón, paraguas, abrigo del hombre) y claros reales (abrigo crema, cielo y niebla).

   Esta diferencia pesa tanto como la textura en la lectura de "ilustración de película". La Fase 2 la trata con parámetros
   de escenario y de material, sin módulo nuevo (§4.7).

**Personajes (limitación 2):**

6. **Extremidades.** Las nuestras son tubos de ancho casi constante con extremos redondos (`P.capsula`). En la referencia
   los miembros son finos y largos, sin abultamientos caricaturescos. Su forma la marca la ropa: mangas anchas que caen, y
   pantalón estrecho con la pierna entrando en la bota.
7. **Manos.** Las nuestras son un óvalo con un pulgar en cápsula. En la referencia se cuentan los dedos:
   - `ref1`: la mujer sostiene el teléfono con las dos manos.
   - `ref3`: la mano oscura envuelve el borde del periódico, con 3–4 dedos visibles separados por líneas oscuras finas.
   - `ref1`: el hombre agarra el paraguas por el mango.
8. **Pelo.** El nuestro es un casco liso con 7 trazos tenues. En `ref3` es una masa casi negra cuya silueta rompen 8–10 puntas
   triangulares agudas, algunas sueltas. En `ref2`, las coletas son masas con volumen y lazo.
9. **Cara.** La nuestra tiene ojos grandes con blanco, iris y brillo (aspecto de muñeco o avatar), nariz triangular corta y
   piel con degradado. En la referencia:
   - `ref3` (perfil): nariz larga y puntiaguda, párpado superior grueso y caído, gafas en línea y piel en dos tonos planos
     (rosa-salmón y su sombra).
   - `ref2`: ojos cerrados en arco feliz y mejillas rojas.
   - `ref1`: rasgos mínimos.
10. **Ropa.** La nuestra es un cono de abrigo con cinturón y un pliegue. En la referencia, el abrigo largo del hombre es una
    silueta grande con caída; el abrigo de la mujer, abierto, deja ver el jersey y tiene la bufanda larga colgando por delante.
11. **Línea.** La referencia usa línea oscura fina solo en rasgos, separación de dedos, mechones y gafas; las siluetas
    exteriores no llevan línea. Nosotros no usamos línea salvo en rasgos.

**Vistas (limitación 3):**

12. La referencia muestra a la mujer de frente caminando hacia cámara, con la cabeza inclinada hacia el teléfono; al joven
    de perfil estricto; a la niña de frente. Nosotros solo tenemos perfil o tres cuartos fijo (`dir=±1`).

**Interacción (limitación 4):**

13. En `ref1` hay dos figuras a profundidades distintas en la misma calle: el hombre en primer plano, cortado por el borde.
    Hay objetos sostenidos (teléfono, paraguas por el mango, periódico). Nosotros no tenemos orden de profundidad entre
    actores ni anclajes de objetos salvo el paraguas.

---------------------------------------------------------------------------------------------------------------
## 2. Prototipos de validación

Todos están en `prototipos/` y sus PNG en `prototipos/salida/`. Ningún prototipo forma parte del kit; son evidencia para las
decisiones. Código común: `prototipos/comun.js` (sellos teñidos, trazo `Path2D` rasgado con estrías).

| # | Archivo → PNG | Qué se probó | Resultado | Decisión |
|---|---|---|---|---|
| P1 | `p1_pinceladas.html` → `salida/p1/t000.00.png` | Relleno por sellos de cerdas teñidos y cacheados por color; zonas luz/medio/sombra por **copias desplazadas de la silueta**; borde húmedo; papel | Sellos: baratos (4–5 ms para 3 formas grandes, ~300 sellos). Zonas por desplazamiento: producen bordes paralelos al contorno, "bisel de caja" o "cartones apilados", también en la base de las formas. La primera versión del papel tenía costuras cada 512 px (ruido no periódico) | **Descartado** el sombreado por desplazamiento. Sellos teñidos válidos solo con pocos colores (ver P3). Papel: mezcla cruzada periódica (§4.5) |
| P2 | `p2_sombreado.html` → `salida/p2/t000.00.png` | Sombreado continuo por **pseudo-normal**: (a) "inflado" con máscara a 1/4 desenfocada → gradiente → normal; (b) **cilindro analítico**. Dureza del terminador 0 / 0.6 / 1. Subpintura | Cilindro analítico: miembros redondeados creíbles con terminador blando y pinceladas encima (pierna oscura). Inflado: efecto "almohada" (bordes redondos, centro plano); con dureza 1 la cara queda toda en luz. Subpintura en celdas de 6 px: escalones; a 1/4 escalada con suavizado: correcta. 1.4–3 ms por pieza grande | **Adoptado:** campos analíticos por pieza (cilindro, elipsoide, plano) y subpintura a 1/4. Inflado solo para props redondeados sin campo propio |
| P3 | `p3_repintado.js` + `p3_calle_repintada.html` → `salida/p3/`, `salida/p3b/` (`comparar_fachada_3.png`: original / primera versión / ajustada) | **Repintado** genérico del lienzo cacheado de cada capa estática: muestrear el color del caché, orientar el trazo a lo largo del borde (gradiente de luminancia) o vertical si no hay borde, y cortar el largo donde el color cambia | Funciona sobre la escena real sin tocar los props: la fachada se lee pintada, con ventanas y bordes nítidos. Coste: 42 000 trazos en 1.0 s, **una sola vez**; 0 ms por cuadro. Tres fallos encontrados por el camino: (1) caché de sellos por color: explosión de lienzos con colores muestreados, la página no carga; (2) `clip()` por trazo en lienzos de 3800×1500: lentísimo; (3) **el lienzo de una capa con `desenfoque` conserva `ctx.filter='blur(..)'`** de `escena.js`, y cada trazo se desenfocaba: bloqueo. Primera versión demasiado rayada (gradiente medido con el grano) | **Adoptado** con: trazo = `Path2D` rasgado relleno del color + estrías grises en `overlay` ya recortadas; gradiente a 5 px con umbral 22; variación de valor 6–16 %; alfa 0.6. **Obligatorio** reiniciar `filter` y la composición antes de repintar |
| P4 | `p4_brazo_mano.html` → `salida/p4/` (offset continuo), `salida/p4b/` (unión) | Brazo con perfil de anchura por lado; codo; manga con holgura; pliegues; mano paramétrica con 5 agarres a 190 px y a 54 px | Contorno continuo por desplazamiento: se **autointersecta** a 90° y 135° (triángulo invertido). Unión de dos segmentos con extremos redondeados en un `Path2D` relleno `nonzero`: codo correcto hasta 135°. Pero con luz de borde, el truco `evenodd` de `Pincel.forma` vuelve brillante el solape (columnas 2 y 4 de p4b). Dedos con contorno fino: se cuentan a 54 px. Agarres legibles. **Pulgar mal resuelto** (parece una barra). Pliegues radiales: "araña"; los pliegues en C apilados son aceptables | **Adoptado:** miembro = unión de segmentos (§5.1) y corrección `nonzero` en `Pincel` (§4.6). Mano en 3D (§5.3); el pulgar queda especificado, no validado |
| P5 | `p5_cabeza_giro.html` → `salida/p5/` (esferas), `salida/p5b/` (mechones) | Cabeza 2.5D: silueta = envolvente convexa de una nube 3D proyectada; rasgos como puntos de superficie con escorzo y fundido; pelo | Giro continuo de 0° a 180° y en pasos de 11,25° a escala real; la nariz sobresale en perfil; expresiones en todas las vistas; 0.45 ms por cabeza. Fallos: sin recorte, el ojo lejano y la boca se salían de la silueta (corregido con `clip`). Pelo con esferas: "bolas oscuras" en la mejilla. Mechones como tiras independientes: "cortina de tiras" con huecos. Riesgo estético: el conjunto se parece a un **avatar 3D** | **Adoptado:** proyección y envolvente para posiciones y continuidad; rasgos recortados a la silueta. Pelo = **una masa** (unión de mechones) con líneas internas y puntas sueltas (§5.4). Correcciones de silueta por vistas clave (§6.4) para combatir el aspecto de avatar |
| P6 | `p6_muelle.js` (node) → `salida/p6_resultado.txt` | Movimiento secundario determinista con acceso aleatorio a `t`: re-simular una ventana fija hacia atrás | Ventana de 1.2 s: error máximo 0.068 px frente a la simulación completa; salto entre cuadros igual al real; resultado idéntico bit a bit en cualquier orden. 7 µs por evaluación con un conductor barato | **Adoptado** (§5.5) |

**No prototipado (riesgo declarado):**
- La corrección `nonzero` del truco de sombra interna: es estándar, pero no se ha ejecutado.
- La IK 3D con vector polo.
- El orden de profundidad entre actores.
- Las sombras de contacto.
- Las luces locales.
- La mano en 3D con vistas de palma y canto.
- Los zapatos y el torso por nube.
- Las vistas clave de cabeza.

Los WP correspondientes incluyen pruebas que los validan.

---------------------------------------------------------------------------------------------------------------
## 3. Arquitectura y compatibilidad

### 3.1 Archivos nuevos (orden de carga normativo)

`construir.py` concatena en este orden y omite los que no existan:

```
nucleo, geom3*, pincel, pintura*, luz, atmosfera, camara, esqueleto, rig25*, dinamica*, personaje, mano*, cuerpo*,
ropa*, cabeza25*, pelo*, personaje2*, props, escenarios, elipsis, interaccion*, escena          (* = nuevo en F2)
```

### 3.2 Reglas de compatibilidad (obligatorias)

1. **Modo.** `Ilustra.MODO` vale `'vector'` (por defecto) o `'pintado'`. Con `'vector'`, **todas las escenas de la Fase 1
   producen exactamente los mismos píxeles que antes**. Lo comprueba `herramientas/regresion.py` contra
   `pruebas/linea_base.json` (WP0). Ningún WP puede romper esa regresión.
2. **`Ilustra.Personaje` (F1) no se modifica.** El personaje nuevo es `Ilustra.Personaje2` (§5.6), con un constructor que
   acepta todas las opciones de `Personaje` más las nuevas, y un `dibujar(ctx,t,estado)` que acepta todos los campos de
   estado de F1. `Escena` dibuja ambos.
3. **`Pincel.forma(ctx, trazado, estilo)`** conserva su firma. Las opciones nuevas son `estilo.campo`, `estilo.marco`,
   `estilo.pintura` y `estilo.union` (§4.3, §4.6). Sin ellas, el comportamiento es idéntico al de la Fase 1.
4. **Poses de F1.** Valen para el rig 2.5D tal cual. Los campos nuevos de pose son opcionales y su valor neutro es 0 (§6.2).
5. **Estilo de código.** JavaScript clásico: cada archivo es `(function(G){ 'use strict'; const I = G.Ilustra; ... })(window);`
   y no usa `import`.
   - Nombres en español, sin tildes en identificadores.
   - Prohibidos `Math.random`, `Date` y `performance.now` dentro del dibujo (salvo para medir tiempos que no afectan a
     los píxeles).
   - Todo estado mutable del contexto (`filter`, `globalCompositeOperation`, `globalAlpha`, `shadow*`, transformaciones)
     se restaura con `save/restore` o se reinicia explícitamente. **Lección de P3:** los lienzos cacheados conservan
     `filter`.

### 3.3 Convenciones 3D (normativas, las usan todos los WP)

- Coordenadas de mundo: `x` a la derecha (px), `y` hacia abajo (px), `prof` hacia la cámara (px; positivo = más cerca).
  Proyección **ortográfica**: pantalla = `(x, y)`; `prof` solo ordena. Opcionalmente escala `1 + prof/4000`, desactivada
  por defecto.
- **Espacio de cuerpo** (por actor): `+X` = lado **izquierdo del personaje** (lado `I`), `+Y` abajo, `+Z` hacia delante
  (hacia donde mira).
- **Giro (`yaw`):** 0 = de frente a cámara; `+π/2` = perfil mirando a la derecha (equivale a `dir=1` de F1);
  `-π/2` = perfil a la izquierda (`dir=-1`); `±π` = de espaldas. Fórmulas:
  `X = x·cos(yaw) + z·sin(yaw)` y `prof = −x·sin(yaw) + z·cos(yaw)`. Comprobación: con `yaw=π/2` el lado `D` (`x<0`) tiene
  `prof>0`, es decir, está cerca de cámara, como en F1, donde los miembros `D` se dibujan delante.
- **Cabeceo (`pitch`, mirar abajo = positivo):** `y' = y·cos p + z·sin p`, `z' = −y·sin p + z·cos p`.
  **Alabeo (`roll`, inclinar):** `x' = x·cos r − y·sin r`, `y' = x·sin r + y·cos r`.
  Orden de aplicación de local a mundo: `Yaw(Pitch(Roll(p)))`.
- **Compatibilidad `dir` → `yaw`:** si el estado no trae `yaw`, `yaw = dir · YAW_PERFIL`, con `Ilustra.YAW_PERFIL = 1.25`
  (≈72°, un perfil casi completo parecido al "tres cuartos" de F1).

---------------------------------------------------------------------------------------------------------------
## 4. Limitación 1 — Textura pintada (`src/pintura.js`, WP1)

### 4.1 Principio

Hay dos regímenes con coste distinto:

| Régimen | Qué cubre | Cuándo se calcula | Técnica |
|---|---|---|---|
| **Estático** | Capas `estatica:true` (fondos, edificios, suelo) | Una vez, al crear el caché | **Repintado** del lienzo cacheado (P3): no hace falta tocar los props; vale para objetos de terceros |
| **Dinámico** | Piezas de personajes y props animados | Cada cuadro | **Relleno pintado por campo** (P2): subpintura a 1/4 + trazos en coordenadas locales de la pieza + borde húmedo |

Al final, el papel en pantalla y el grano reducido.

### 4.2 El trazo (primitiva común, validada en P3)

```js
Ilustra.Pintura.trazo(ctx, cx, cy, ux, uy, largo, ancho, css, alfa, variante)
```
- La silueta es un `Path2D` rasgado en espacio unidad `[-0.5,0.5]²`, con 4 variantes precalculadas por semilla fija.
  - Cada variante tiene 15 estaciones a lo largo del trazo.
  - Media anchura: `(0.42 + 0.08·ruido1(4u)) · (1 − 0.3u²) · min(1, 2.2·sin(πu) + 0.25)`, más ruido de borde de ±0.05.
  - Así queda presión desigual: el trazo entra rápido y se adelgaza al final.
- Se dibuja con `setTransform(ux·largo, uy·largo, −uy·ancho, ux·ancho, cx, cy)`, rellenando con `css` y `globalAlpha = alfa`.
- A continuación, `globalCompositeOperation='overlay'` con `globalAlpha = alfa·0.45`. Se dibuja la loseta de estrías de esa
  variante en `(-0.5,-0.5,1,1)`:
  - La loseta es de 64×24, gris 128 ± `70·ruido1(1.3j) + 25·ruido2(...)`.
  - Ya está recortada a la silueta con `destination-in` al crearla.
- **Prohibido:**
  - `clip()` por trazo (P3: inviable en lienzos grandes).
  - Teñir sellos por color (P3: explosión de memoria).
- Al terminar un lote se deja `setTransform(1,0,0,1,0,0)`, `globalAlpha=1` y `'source-over'`.

### 4.3 Relleno pintado de piezas dinámicas

```js
Ilustra.Pintura.rellenar(ctx, path:Path2D, caja, estilo) -> void
// la llama Pincel.forma cuando I.MODO==='pintado' y (estilo.pintura !== false)
```

Campos de `estilo` que usa (además de los de `Pincel.forma`):

| campo | tipo | defecto | significado |
|---|---|---|---|
| `campo` | `(x,y)=>0..1` | campo lineal según `luz.dir` sobre la caja (equivale al degradado de F1) | sombreado: 1 = de cara a la luz |
| `marco` | `{o:[x,y], ex:[x,y], ey:[x,y]}` | caja alineada a ejes | marco local de la pieza: los trazos se generan en `[0,1]²` de este marco y viajan con la pieza |
| `pintura` | `{tam, densidad, dureza, umbral, ang, varValor, varTono, acento, alfaTrazo, bordeHumedo}` | ver abajo | |
| `dureza` (en `pintura`) | 0..1 | 0.6 | 0 = degradado; 1 = dos tonos con corte duro |
| `umbral` | 0..1 | 0.45 | posición del terminador |
| `tam` | px | `clamp(0.035·min(w,h)+6, 5, 16)` | ancho nominal del trazo (largo = 1.6–3.2×tam) |
| `densidad` | — | 1.1 | número de trazos = `round(wNom·hNom·densidad/(3·tam²))` con las dimensiones **nominales** del marco (§4.4) |
| `ang` | rad | eje `ey` del marco (a lo largo de la pieza) | dirección dominante, ± `ruido2·0.35` ± 0.12 al azar |
| `varValor` | 0..1 | 0.10 | mezcla hacia aclarar/oscurecer 0.2, en proporción `r()·varValor·3` |
| `varTono` | 0..1 | 0.08 | mezcla hacia `acento` (defecto `luz.ambiente`) |
| `alfaTrazo` | [a,b] | [0.5, 0.9] | |
| `bordeHumedo` | 0..1 | 1 | trazo del contorno recortado a la forma: 7 px a alfa 0.20×k más 2.2 px a alfa 0.35×k, color `oscurece(base,0.45)` |

Algoritmo (por pieza y cuadro):
1. **Colores.**
   - `base = mezcla(color, luz.ambiente, 0.12)` (y niebla por `profundidad` como en F1).
   - `cLuz = mezcla(aclara(base, 0.12), luz.clave, 0.12)`.
   - `cSom = oscurece(mezcla(base, luz.ambiente, 0.35), 0.25)`.
   - `tono(v) = mezcla(cSom, cLuz, suave(clamp((v − umbral + a)/(2a), 0, 1)))`, con `a = lerp(0.5, 0.04, dureza)`.
2. `ctx.save(); ctx.clip(path)`. Un único `clip` por pieza: es barato en el lienzo principal; validado en P1 y P2.
3. **Subpintura.**
   - Se crea un `ImageData` a escala `e = 0.25` de la caja de la pieza, con `tono(campo(x,y))` por píxel. Se pone en el
     lienzo auxiliar `I.capaAux('pintura_sub', w, h)`, que se reutiliza.
   - Se dibuja escalado con `imageSmoothingQuality='high'` sobre la caja. Validado en P2: sin escalones.
4. **Trazos.**
   - Se usa `rng(semilla)` y siempre se genera la misma cantidad `N` (§4.4). Para cada trazo `i` se consumen exactamente
     6 números aleatorios, aunque luego se descarte.
   - Posición: `(u,v)` en `[0,1]²` del marco, llevada a mundo como `o + u·ex + v·ey`.
   - Color: `tono(campo(x,y) + (r−0.5)·0.12)`, luego la variación de valor y la de tono.
   - Ángulo: `ang` con su ruido.
   - Llamada: `Pintura.trazo(...)`.
   - Los trazos que caen fuera de la forma los elimina el `clip`. **No** se usa `isPointInPath` para omitirlos: cambiaría
     el conjunto entre cuadros y produciría parpadeo.
5. **Borde húmedo** (`stroke` del path, dentro del `clip`). Después, `restore()`.
6. **Luz de borde.** Usa el truco existente de `Pincel` (sombra fuera de lienzo), con el `borde` del estilo.
   - **Nuevo valor por defecto en modo pintado:** `borde` se multiplica por `Ilustra.FACTOR_BORDE_PINTADO = 0.5`, por el
     diagnóstico §1.3-4. Las escenas de contraluz pueden subirlo.
   - La sombra interna de F1 se omite en modo pintado: el campo ya da el volumen.

### 4.4 Estabilidad temporal de los trazos (obligatorio)

- Cada pieza tiene **dimensiones nominales** fijas `(wNom, hNom)` que no dependen de la pose. Las aporta el llamador; por
  ejemplo, para un antebrazo: `hNom = largo del hueso`, `wNom = 2·radio máximo`. `N` sale de ellas y es constante en toda
  la animación.
- La semilla de cada pieza es fija (`semilla del personaje · 100 + índice de pieza`).
- Los trazos viven en coordenadas `(u,v)` del marco. Si la pieza se mueve, los trazos se mueven con ella; si se deforma,
  se estiran con ella. Nunca "hierven".
- El papel está **fijo en pantalla** y el grano cambia por cuadro como en F1, pero con intensidad `0.5×`.

### 4.5 Repintado de capas estáticas (validado en P3)

```js
Ilustra.Pintura.repintar(canvas, {semilla, tam:12, ang:π/2, umbral:26, alfa:0.6, umbralBorde:22, pasoGradiente:5,
                                 varValor:[0.06,0.16], acento:[214,170,120], varTono:0.08})
```
- Al empezar: `x.filter='none'; x.globalCompositeOperation='source-over'; x.setTransform(1,0,0,1,0,0)`.
- Se toma un único `getImageData` del lienzo completo.
- Rejilla de paso `1.15·tam`; en cada celda un punto con desplazamiento aleatorio. Se omiten los puntos con alfa < 250.
- **Dirección.** Gradiente de luminancia con diferencias centrales a ±5 px. Si `|g| > umbralBorde`, el ángulo es el del
  gradiente + π/2; si no, `ang + ruido2(x·0.004, y·0.004)·0.5`. A ambos casos se suma ±0.06 al azar.
- **Largo limitado por el borde.**
  - Se avanza en pasos de 2 px en ambos sentidos mientras la diferencia de color (L1 RGB) con el centro sea < `umbral`,
    hasta `tam·(1.3..2.7)`.
  - Si el total es < `0.6·tam`, se omite (zona de detalle fino: se conserva).
  - El trazo se centra en el tramo encontrado.
- **Color.** El píxel muestreado más la variación de valor y la de tono.
- **Integración en `Escena`.**
  - En `_cacheCapa`, después de dibujar y antes del desenfoque, si `I.MODO==='pintado'` y `capa.repintar !== false`:
    `Pintura.repintar(cv, Object.assign(porDefecto(capa), capa.repintar))`.
  - `porDefecto(capa)`: `tam = capa.z > 2 ? 9 : 12`; `alfa = capa.desenfoque > 1 ? 0.4 : 0.6`;
    `semilla = 7 + floor(capa.z·10)`.
  - El repintado va **antes** del desenfoque, de modo que el desenfoque de profundidad de campo afecta también a los trazos.
    En P3 se aplicó después y por eso se redujo el alfa; antes es mejor.
- **Coste medido en P3:** ~24 µs/trazo en total, 1.0 s para dos capas de la calle, una sola vez.

**Papel.**
- `Ilustra.Pintura.papel()` devuelve una loseta de 512×512 **periódica**:
  - `f(a,b) = fbm(a/22, b/22, 4, 3)·40 + fbm(a/3, b/70, 2, 8)·10`.
  - `v = 128 + 1.3·[ f(i,j)(1−wx)(1−wy) + f(i−512,j)wx(1−wy) + f(i,j−512)(1−wx)wy + f(i−512,j−512)wx·wy ]`, con
    `wx=i/512`, `wy=j/512`.
- `Ilustra.Pintura.aplicarPapel(ctx, {fuerza:0.22, modo:'overlay'})`: se aplica en pantalla, antes del grano.
- `Escena.post.papel` (defecto `0.22` en modo pintado, `false` en vector). El grano en modo pintado usa `intensidad·0.5`.

### 4.6 Cambios en `pincel.js` (WP1)

1. **`Pincel.union(listaPoligonos) -> Path2D`.**
   - Normaliza el sentido de giro de cada polígono para que el área firmada sea positiva en `y` hacia abajo (sentido
     horario en pantalla) y añade todos al `Path2D`.
   - Marca el resultado con `path._union = true` y `path._caja = caja`.
2. **`interna()`.** Si el `Path2D` tiene `_union`, el rectángulo exterior se traza **antihorario** a mano
   (`moveTo/lineTo`) y el relleno usa `'nonzero'`. Si no, se mantiene `evenodd` (píxeles de F1 idénticos).
3. **`Pincel.forma`.**
   - Acepta `trazado` como **array de polígonos** (array cuyo primer elemento es a su vez un array de puntos) y llama a
     `union`.
   - Si `I.MODO==='pintado'` y `estilo.pintura !== false`, delega en `Pintura.rellenar` en lugar de los pasos 1, 3a y 3c
     de F1.
   - Mantiene la luz de borde (§4.3-6) y el contorno opcional.
4. **`Pincel.campos`.** Fábricas de campo que devuelven `(x,y)=>0..1`, todas con la luz en 3D
   `l3 = normalizar([luz.dir[0], luz.dir[1], luz.z ?? 0.75])`:
   - `cilindro(A, rA, B, rB)`: validado en P2. Normal `n = (−uy·s, ux·s, √(1−s²))`, con `s` la coordenada transversal
     normalizada. Valor `clamp(n·l3/|l3|, 0, 1)`.
   - `elipsoide(c, rx, ry, rot)`.
   - `plano(normal3)`: constante.
   - `seccion(polilineaCentro, anchosIzq, anchosDer)`: cilindro de anchura variable, para el torso y las faldas.
   - `inflado(pts, esc=0.25)`: solo para props.
   - **Signo:** `luz.dir` apunta **hacia la luz** (el lado iluminado está en `+dir`). Comprobado en P1: con el signo
     contrario la sombra cae del lado de la luz.

### 4.7 Estructura de valores (diagnóstico §1.2; sin módulo nuevo)

- **`Luz`** acepta `clave3`, la elevación de la luz en z (defecto 0.75).
- **`Escenario` acepta `valores:{alto:0..1}`** (clave alta). Hace tres cosas:
  - sube la niebla hacia `aclara(niebla, 0.35·alto)`;
  - reduce la `L` media de las figuras con `oscurece` local a `0.15·alto` (más contraste figura/fondo);
  - limita la luz de borde a `0.4`.
  - Se implementa en `escenarios.js` (WP9) como variante `calleLluviosa({hora:'dia'})`.
- **Materiales con oscuros reales.** Los colores por defecto de pelo, pantalón y paraguas en `Personaje2` se oscurecen
  (`pelo:'#1e1816'`, `pantalon:'#23262f'`) para alcanzar `L p5 ≤ 15` en la figura.
- **Fondo con bordes perdidos.** Las capas con `z ≥ 2.5` en modo pintado usan `desenfoque ≥ 2`, y su repintado usa
  `umbral` 40 (trazos más largos que cruzan detalles). Objetivo medible: `bordes ≤ 1.5×` la referencia (§9).

---------------------------------------------------------------------------------------------------------------
## 5. Limitación 2 — Personajes

### 5.1 Extremidades (`src/cuerpo.js`, WP6a; técnica validada en P4)

- **Unión de segmentos.** Cada hueso es una forma propia con extremos redondeados, y el miembro es la **unión** de sus
  segmentos (`Pincel.union`): brazo + antebrazo, y muslo + pierna.
  - En la articulación, el lado exterior queda redondeado por la tapa (hueso o rótula) y el interior forma un pliegue
    natural por intersección.
  - Prohibido el contorno continuo por desplazamiento: se autointersecta a partir de ~90° (P4).
- **Sección de un segmento.** En cada estación `u ∈ {0, 0.15, 0.35, 0.6, 0.85, 1}` la sección es una **elipse asimétrica
  en 3D**, perpendicular al hueso, con cuatro radios en fracción de `H`: `del` (delante), `det` (detrás), `ext` (exterior)
  e `int` (interior).
  - Para el contorno 2D a cualquier `yaw` se muestrean 12 ángulos de la sección en 3D, se proyectan y se toman el mínimo
    y el máximo de la coordenada perpendicular al hueso proyectado. Es continuo en `yaw`.
  - Las tapas son semicírculos con la media de los radios extremos.
- **Perfiles por defecto** (`Ilustra.PERFILES.adulto`; `nino` multiplica por 1.1 los radios relativos, `anciano` por 0.95).
  Valores `[u, del, det, ext, int]`:
  ```
  brazo:     [0,.036,.038,.040,.034] [.35,.034,.040,.038,.033] [1,.026,.028,.028,.025]
  antebrazo: [0,.027,.030,.029,.027] [.3,.030,.029,.031,.028]  [1,.019,.018,.020,.018]
  muslo:     [0,.058,.062,.060,.052] [.4,.052,.055,.054,.047]  [1,.038,.040,.039,.036]
  pierna:    [0,.037,.040,.038,.035] [.3,.036,.047,.040,.036]  [1,.024,.026,.025,.023]   // gemelo detrás en u=.3
  ```
  `Personaje2` acepta `complexion: 'delgada'|'media'|'robusta'`, que multiplica los radios por 0.8, 1 y 1.2.
  `'delgada'` es el valor por defecto de los presets estilizados (más cerca de la referencia).
- **Campo de sombreado:** `Pincel.campos.cilindro` por segmento. La unión usa como campo el del segmento más cercano.
- **Pieza que devuelve** `Cuerpo.miembro(J, lado, 'brazo'|'pierna', H, {holgura:0, hasta:1})`:
  `{path, caja, campo, marco, nominal:[w,h], prof}`. Con `holgura` se obtiene la manga o la pernera; con `hasta`, el
  recorte del puño.

### 5.2 Torso, cuello y zapatos (WP6a)

- **Torso.** Secciones elípticas asimétricas en `pelvis`, `cadera+0.03H`, `cintura`, `pecho` y `hombros`, con anchos
  (`ext`) y profundidades (`del`, `det`).
  - El contorno se forma con el máximo proyectado de cada sección, de arriba abajo, y el mínimo, de abajo arriba.
    Después se suaviza con `suavizar(…,4)`.
  - Valores de adulto, en fracción de `H`, `[ext, del, det]`:

    | sección | ext | del | det |
    |---|---|---|---|
    | hombros | .105 | .045 | .05 |
    | pecho | .085 | .06 | .055 |
    | cintura | .07 | .045 | .045 |
    | cadera | .085 | .05 | .065 |

  - Campo: `seccion`.
- **Cuello.** Cilindro de cuello a `cabezaBase`, radio 0.026H→0.024H.
- **Zapatos.** Se definen por **nube 3D** (envolvente proyectada, la misma técnica que la cabeza en P5). 14 puntos en el
  marco del pie (origen en el tobillo, `+Z` hacia la punta):
  - suela: elipse de largo `0.14H` y ancho `0.05H`, con el talón en `−0.03H`;
  - empeine: 4 puntos a altura `0.035H`;
  - puntera: 2 puntos a `0.02H`.
  - Modelos: `zapato`, `botin` (caña hasta `0.07H`), `bota` (hasta `0.16H`), `zapatilla` (suela clara gruesa).
  - Encima de la envolvente se dibujan la línea de la suela (trazo de 1.5 px, `oscurece 0.5`) y la separación
    empeine/puntera en `botin` y `bota`.

### 5.3 Mano (`src/mano.js`, WP3; legibilidad validada en P4)

**Geometría 3D en el marco de la mano** (origen en la muñeca; `+x` hacia los dedos; `+y` hacia el meñique; `+z` = dorso):
- Palma: nube de 10 puntos, una caja redondeada de largo `0.46L`, ancho `0.36L` y grosor `0.12L` (`L` = largo total de la
  mano, `0.105H` en el adulto).
- Dedos (índice a meñique):
  - bases en `x = 0.46L`, `y = (−1.5 … 1.5)·0.09L`;
  - falanges `[0.22, 0.14, 0.11]·L`, con factor 0.95 en el índice y 0.8 en el meñique;
  - radios `[0.043, 0.047, 0.044, 0.036]·L`, que se estrechan al 80 % en la punta;
  - punta redondeada: semicírculo, porque P4 mostró que las puntas cortadas en recto se ven mal.
- Las curvaturas giran alrededor del eje `y` local (flexión hacia `−z`, la palma). La separación gira alrededor de `z`.
- **Pulgar.** Base en `(0.12L, −0.16L, −0.05L)`, en el lado de la palma junto a la muñeca, **no sobre el dorso** (fallo de
  P4).
  - Eje de oposición: `rotZ(−0.6)·rotX(0.9)`.
  - Falanges `[0.24, 0.17, 0.13]·L` y radios `[0.065, 0.055, 0.045]·L`.
  - Parámetros del agarre: `pul:[oposicion, flexion1, flexion2]`.

**Agarres** (`Ilustra.Mano.AGARRES`): curvaturas por falange `[[base, media, punta] × 4]`, separación `sep` y pulgar `pul`.

| agarre | dedos | sep | pul |
|---|---|---|---|
| `relajada` | [.25,.35,.2] [.3,.4,.25] [.35,.45,.3] [.45,.5,.35] | .06 | [.5,.2,.2] |
| `puno` | todos [1.5,1.6,1.1] | 0 | [1.2,.6,.5] |
| `asa` | todos [1.15,1.25,.8] | 0 | [1.0,.3,.3] |
| `senalar` | índice [0,.05,0], resto `puno` | .02 | [1.1,.5,.4] |
| `saludar` | todos ~0 | .16 | [.2,−.1,0] |
| `pinza` | índice [.6,.7,.5], resto `relajada`·1.2 | .03 | [.9,.4,.3] |
| `sostenerPlano` (teléfono, periódico) | todos [.2,.15,.1] | .02 | [1.0,.1,.1] |

- `Mano.mezclar(a, b, k)` interpola campo a campo.
- El agarre `asa` acepta `radio` (px): escala las curvaturas para que las yemas queden a `radio` del eje del mango.
  Fórmula: `curv·= clamp(0.5 + 0.02·L/radio, 0.7, 1.3)`.

**Orientación, dibujo y anclas.**
- **Orientación.** Eje `x` de la mano = dirección del antebrazo en 3D (del rig). La normal del dorso sale de la normal del
  antebrazo girada por `giroMano` (pronación, campo de pose; defecto: dorso hacia fuera del cuerpo). Así se ven palma,
  dorso o canto según el giro, sin vistas separadas.
- **Dibujo.**
  - Proyección con `G3.proyectar`.
  - Cada falange es una cinta proyectada; la palma, la envolvente de su nube.
  - Orden por `prof` de cada pieza: dedos con `prof` menor que la palma, primero.
  - Contorno de `max(1, 0.02L)` px con `oscurece(piel, 0.55)` a alfa 0.55: imprescindible para separar los dedos a
    escala real (P4).
  - En modo pintado, campo elipsoide para la palma y `cilindro` por falange. A menos de 70 px de largo, sin trazos (solo
    subpintura).
- **API.**
  ```js
  Ilustra.Mano.dibujar(ctx, {muneca:[x,y,prof], eje:[dx,dy,dprof], dorso:[nx,ny,nprof], lado:'D'|'I', largo, agarre,
                              piel, semilla, luz}) -> {agarre:[x,y,prof], palma:[x,y,prof], indice:[x,y,prof]}
  ```
  - `agarre` = centro del puño cerrado: el punto donde se ancla un mango (§7).
  - Para `lado:'I'` se refleja `y`.

### 5.4 Pelo (`src/pelo.js`, WP5; lecciones de P5)

- **Datos de peinado** (`Ilustra.PEINADOS2`):
  ```js
  { casquete:{latLinea:-0.55, abultamiento:0.05},              // superficie de cráneo por encima de la línea del pelo
    mechones:[{lon, lat, largo, curva, ancho, puntas, frec, amort, rigidez}], // en unidades del radio de la cabeza
    extras:[{tipo:'mono'|'coleta'|'lazo', ...}], color, brillo:0.35 }
  ```
  Presets obligatorios: `melena`, `corto`, `mono`, `coletas` (como `ref2`), `encrespado` (puntas agudas que rompen la
  silueta, como `ref3`), `largo` y `calvo`. `peinado` de F1 se traduce: `'melena'→melena`, etc.
- **Geometría.**
  - Cada mechón es una polilínea 3D de 4 puntos: raíz en el casquete en `(lon, lat)`; punto 2 hacia fuera (`·1.15`); punto
    3 cayendo; punta en `lat + largo` hacia abajo y fuera.
  - Las posiciones de los puntos 3 y punta reciben el desplazamiento del muelle (§5.5): rigidez completa en la raíz,
    `0.5×` en el punto 2, `1×` en el 3 y `1.4×` en la punta.
- **Dibujo** (lección clave de P5: **una masa, no tiras**). Por capa, `'detras'` (raíz con `prof` < centro de la cabeza) o
  `'delante'`:
  1. **Masa.** `Pincel.union` de todas las cintas de mechón proyectadas (ancho `ancho·R`, estrechándose a `0.25×`) más,
     en la capa `delante`, la envolvente del casquete. Se dibuja **una sola** forma. Campo: `elipsoide` de la cabeza
     ampliado a `1.1×`.
  2. **Separación.** Entre 2 y 5 trazos oscuros (`oscurece(color, 0.35)`, alfa 0.5, ancho `0.025R`) a lo largo de la línea
     central de los mechones con `puntas>0`. Solo los de `prof` de raíz > 0 en la capa `delante`.
  3. **Puntas sueltas.** Para los mechones con `puntas:n`, se dibujan `n` triángulos agudos fuera de la masa en el último
     30 % del mechón: base `0.12R`, largo `0.25–0.4R`, curvados en la dirección del muelle. Así se rompe la silueta como
     en `ref3`.
  4. **Brillo.** Una banda de `aclara(color, 0.25)` en `screen` a alfa `brillo·0.4`, recortada a la masa, sobre la
     coronilla. Sigue a la luz.
- **Orden respecto a la cara** (lo hace `cabeza25.js`): pelo `detras` → orejas lejanas → cara → rasgos → nariz → orejas
  cercanas → pelo `delante`. El casquete siempre va en `delante`: forma la línea del pelo en la frente.

### 5.5 Movimiento secundario determinista (`src/dinamica.js`, WP5; validado en P6)

```js
Ilustra.dinamica.muelle(t, conductor:(t)=>[x,y], {frec:2.2, amort:0.35, ventana:1.2, dt:1/240, muestreo:1/60, id})
  -> [dx, dy]      // desfase de la masa respecto al conductor (0 en reposo)
Ilustra.dinamica.cadena(t, conductorRaiz:(t)=>{p:[x,y], ang}, n, {largoSeg, frec, amort, gravedad:0.3, viento:(t)=>[vx,vy]})
  -> [[x,y], ...]   // bufanda, coletas, bajo del abrigo
```
- **Simulación.**
  - Euler semi-implícito con paso fijo `dt`, desde `t0 = max(0, alinear(t − ventana))` hasta `alinear(t)`, con
    `alinear(s) = round(s/dt)·dt`.
  - Estado inicial: en reposo sobre el conductor.
  - Aceleración: `a = −ω²(x − c(t)) − 2ζωv + viento`.
- **Muestreo del conductor.** Se evalúa solo en la rejilla global `k·muestreo` (independiente del `t` del cuadro) y se
  interpola linealmente. Así el conjunto de muestras no depende de la fase del cuadro.
- **Caché.** Memo de muestras por `(id, k)` limitada a 512 entradas, vaciada al empezar cada `Escena.draw`. Solo acelera;
  no cambia resultados.
- **Conductor del pelo.** `Personaje2.marcoCabezaEn(t')` resuelve **solo el rig** para el estado `actor.estado(t')`, sin
  dibujar.
  - `Escena` pasa el historial como `estado._estadoEn = (t') => actor.estado(t')`.
  - Coste: 72 resoluciones de rig por actor y cuadro, unos 3 ms.
- **Comprobación de WP5.** Con un conductor de prueba, `muelle` coincide con la simulación completa en < 0.1 px; dos
  evaluaciones de la misma `t` en distinto orden son idénticas (`===`).

### 5.6 Ropa (`src/ropa.js`, WP6b) y el ensamblado `Personaje2` (WP7)

**Prendas como capa propia.** Una prenda es una lista de piezas `{path, campo, marco, nominal, prof, color}` construidas
desde el cuerpo con `holgura`, más pliegues.

| tipo | construcción | holgura (fracción de H) |
|---|---|---|
| `manga` (de abrigo, camisa o jersey) | `Cuerpo.miembro(…,'brazo',{holgura, hasta: 0.92})` + puño (elipse proyectada, `oscurece 0.12`) | abrigo .010, jersey .006, camisa .004 |
| `pernera` | `Cuerpo.miembro(…,'pierna',{holgura, hasta: 0.97})`; cae sobre el zapato | pantalón .006 |
| `abrigo` | torso con holgura + faldón: el bajo cuelga de las cadenas muslo→pierna a `largo·0.45H` de la cadera (regla de F1). Además, cada punto del bajo pasa por `dinamica.cadena` (retraso y vuelo) | .012 |
| `falda` | sección cónica desde la cintura: `vuelo` abre el bajo; bajo con `cadena` | .008 |
| `delantal`, `jersey`, `camisa` | torso con holgura más líneas de cuello o escote proyectadas | — |
| `bufanda` | vuelta = anillo de la sección del cuello con holgura (elipse proyectada) + cola con `dinamica.cadena`, anclada delante o detrás según `prof` | — |

**Pliegues** (`Ilustra.Ropa.pliegues`): devuelven trazos `{pts, ancho, alfa}` que se dibujan con `Pincel.trazo`, con
`oscurece(color, 0.5)` y alfa 0.6, recortados a la prenda.
- **`compresion(codo|rodilla, flexion)`.**
  - Número: `round(flexion·2.2)`, de 0 a 3. Validado en P4.
  - Forma: curvas en "C" apiladas en el **interior** de la articulación, abiertas hacia el exterior. Largo `0.05–0.07H`,
    separación `0.012H`.
  - Prohibido el abanico radial desde un punto (P4: "araña").
- **`tension(desde, hacia, n=2)`:** líneas diagonales levemente curvas. Se usan en la axila cuando `abdBrazo > 0.5` y en la
  entrepierna al dar un paso largo.
- **`caida(cintura, bajo, n=3)`:** líneas casi verticales desde el cinturón hacia el bajo, que se mueven con la cadena.

**Contrato de `Personaje2`.**
```js
const p = new Ilustra.Personaje2({ ...opciones de Personaje (F1)...,
  ropa:[{tipo:'abrigo', color, largo:0.62, cuello:'solapa'|'alto'|null, cinturon:true, botones:2, abierto:false},
        {tipo:'jersey', color}, {tipo:'pantalon', color}, {tipo:'bufanda', color}],   // si falta, se traduce de abrigo/bufanda/pantalon de F1
  zapatos:{modelo:'botin', color}, peinado:'melena'|objeto, complexion:'delgada', ojos:{estilo:'puntos'|'trazo'|'redondos', color},
  proporciones:'adulto'|'nino'|'anciano'|'estilizado' })
p.dibujar(ctx, t, estado) -> J25                     // dibuja todas sus piezas en orden de prof (uso suelto, como F1)
p.piezas(t, estado) -> [{prof, orden, dibujar(ctx)}]  // para que Escena las mezcle con las de otros actores (§7)
p.resolver(t, estado) -> J25                          // solo el rig (lo usan dinamica e interaccion)
p.marcoCabezaEn(t) -> marco                           // necesita estado._estadoEn
```
Campos de estado nuevos (todos opcionales): `yaw`, `prof`, `manos:{D:'asa', I:'relajada'}`, `agarres` (§7.2),
`mirarA` (§7.2) y `giroCabeza`. Los de F1 (`dir`, `pose`, `expresion`, `mirada`, `viento`, `vista`, `luz`, `paraguas`,
`sombraSuelo`, `respiracion`, `manoOculta`) siguen funcionando; `vista:'espalda'` equivale a `yaw = π`.

`proporciones:'estilizado'` (para acercarse a la referencia): 7.5 cabezas, `escalaCabeza 0.95`, piernas `×1.08`, hombros
`×0.9`, `complexion 'delgada'`.

---------------------------------------------------------------------------------------------------------------
## 6. Limitación 3 — Vistas 2.5D

### 6.1 Geometría (`src/geom3.js`, WP0)

```js
Ilustra.G3 = {
  sum(a,b), res(a,b), esc(a,k), punto(a,b), cruz(a,b), norma(a), unit(a), lerp3(a,b,k),
  rotX(p,a), rotY(p,a), rotZ(p,a),                     // convenciones de §3.3
  marco({o:[x,y,prof], yaw=0, pitch=0, roll=0, escala=1}) -> M   // M.aMundo(p3)->[x,y,prof]; M.dirAMundo(v3); M.yaw...
  proyectar(p3, M) -> [x, y, prof],
  envolvente(pts2) -> pts2,                            // casco convexo (monotone chain, validado en P5)
  siluetaNube(nube3, M, pasosSuavizado=3) -> pts2,     // proyectar + envolvente + Pincel.suavizar
  remuestrearPolar(pts2, centro, n=48) -> pts2,        // n puntos por ángulo desde "arriba" en sentido horario (silueta estrellada)
  areaFirmada(pts2), orientar(pts2, horario=true) -> pts2,
  ik2(o3, objetivo3, l1, l2, polo3) -> {medio, fin}    // §6.3
}
```

### 6.2 Rig 2.5D (`src/rig25.js`, WP2)

```js
const rig = new Ilustra.Rig25(proporciones|nombreTipo, H)
rig.resolver({x, y, prof:0, yaw, pose}) -> J25
```

**Pose.** Los campos de F1 (`I.CAMPOS_POSE`) conservan su significado en el plano sagital del cuerpo. Campos nuevos,
neutros en 0:
- `abdBrazoD/I` (abducción, + hacia fuera; defecto efectivo `0.12` aunque falte);
- `abdMusloD/I` (defecto `0.04`);
- `giroPecho` (yaw del pecho respecto a la pelvis);
- `giroCabeza`, `cabeceo` (pitch de la cabeza), `inclinaCabeza` (roll);
- `giroManoD/I` (pronación);
- `objetivoManoD/I` y `objetivoPieD/I`, que aceptan `[x,y]` o `[x,y,prof]`.

**Direcciones de hueso en el espacio del cuerpo:**
- Tronco (ángulo `a` desde arriba, + hacia delante): `[0, −cos a, sin a]`.
- Miembros (ángulo sagital `α` desde abajo, + hacia delante; abducción `β`; `s = +1` para `I`, `−1` para `D`):
  `[s·sin β, cos α·cos β, sin α·cos β]`.

**Hombros, caderas y orden de cálculo.**
- Hombros en `x = ±0.5·anchoHombro·0.21H`; caderas en `x = ±0.085H` (multiplicadas por los factores de proporción).
- El resto de longitudes salen de `I.PROPORCIONES` de F1 (`estilizado` se añade allí; F1 no lo usa).
- Encadenado: pelvis (raíz) → cintura → pecho, con `giroPecho` aplicado a todo lo que cuelga del pecho → hombros, cuello,
  cabeza (`giroCabeza`, `cabeceo`, `inclinaCabeza`) → brazos. Las piernas cuelgan de la pelvis.
- Finalmente cada punto pasa al mundo con `G3.marco({o:[x, yPelvis, prof], yaw})`.

**`J25`.** Tiene las mismas claves que el `J` de F1, cada una `{x, y, prof, p:[bx,by,bz]}`. Además:
- `marcos: {pelvis, pecho, cabeza}` (marcos `G3` con su `yaw` efectivo);
- `ejes: {brazoD: [dx,dy,dprof], ...}`;
- `H`, `prop` y `yaw`.

Los consumidores 2D de F1 pueden leer `x` e `y` sin cambios.

**Pies, caminar y suelo.**
- Los ciclos de F1 (`poseCaminar` y `poseParado`) dan objetivos de pie `[x,y]`. En el rig se convierten a 3D con el `prof`
  de la cadera correspondiente: el paso ocurre en el plano sagital girado por `yaw`.
- En vista frontal, la zancada se ve como escorzo (pies hacia y desde la cámara) y el pie no desliza en pantalla.
- **Suelo:** con `yaw` cualquiera, los pies deben seguir tocando `y` de suelo.

### 6.3 IK 3D con vector polo (WP2)

`G3.ik2(O, T, l1, l2, polo)`:
1. `d = clamp(|T−O|, |l1−l2|+ε, l1+l2−ε)` y `u = unit(T−O)`.
2. `a = (l1² + d² − l2²)/(2d)` y `h = √max(0, l1² − a²)`.
3. `pp = unit(polo − u·(polo·u))`.
4. `medio = O + u·a + pp·h` y `fin = O + u·d`.

**Polos** (espacio del cuerpo, llevados al mundo):
- codo `[0, 0.3, −1]` (atrás y abajo), girado por `giroMano` si este es grande;
- rodilla `[0, 0, 1]`.

**Límites:**
- Si `|T−O| > l1+l2`, el brazo queda extendido hacia `T`.
- No se permite que el codo cruce el plano medio del cuerpo (`bx·s ≥ −0.02H`): si lo hiciera, el polo se desplaza hacia
  fuera `+s·0.5`.

### 6.4 Cabeza 2.5D (`src/cabeza25.js`, WP4; técnica validada en P5)

**Nube del cráneo.**
- Base: puntos de esfera `sph(lon, lat, k=[0.92, 1.12, 1.0])` con `lat ∈ [−80°, 50°]` cada 26° y `lon` cada 30°.
- Mandíbula: mentón `[0, 1.2, 0.52]`, `[±0.18, 1.17, 0.48]`, ángulos `[±0.62, 0.8, 0.05]` y pómulos `[±0.75, 0.35, 0.4]`.
  Son parámetros de forma: `Cabeza25.FORMAS.{adulto, nino, anciano, estilizado}` modifican mentón, mandíbula y `k`.

**Silueta.**
- Por defecto, `G3.siluetaNube(nube, marcoCabeza)`.
- **Correcciones por vistas clave** (para evitar el aspecto de avatar 3D de P5):
  - `forma.vistas = {0: deltas48, 45: deltas48, 90: deltas48, 135: deltas48, 180: deltas48}`, donde `deltas48` son
    desplazamientos radiales en unidades de `R` sobre la silueta remuestreada con `remuestrearPolar(…,48)`.
  - Se interpola linealmente por `|yaw|` entre las dos vistas clave vecinas y se refleja para `yaw` negativo
    (simetría: el índice `i` pasa a `(48−i)%48`).
  - WP4 entrega deltas para `estilizado` que alargan el mentón y la nariz del perfil (como `ref3`) y afinan la mandíbula
    de frente. Si faltan, los deltas valen 0.

**Rasgos.** Son puntos de superficie `sph(lon, lat)`.
- **Visibilidad:** `nz = normal·cámara = −nx·sin yaw' + nz·cos yaw'`.
- **Fundido:** `k = suave(clamp(nz/0.25, 0, 1))`.
- **Escorzo del ancho:** `max(nz, 0)^0.6`.
- Ojos en `lon ±0.40`, `lat 0.02`. Cejas a `lat −0.24 … −0.29`, siguiendo `ceja[incl, alt]`. Boca en `lon {−0.26, 0, 0.26}`,
  `lat 0.62`, con la curvatura de la expresión.
- **Recortes:** ojos, cejas, boca y rubor se **recortan a la silueta de la cara** (P5). La nariz no se recorta.

**Nariz.**
- Base `[0, 0.05, 1.0]`, aletas `[±0.13, 0.40, 0.95]` y punta `[0, 0.38, 1.16]` (`forma.nariz` cambia la punta: `recta`,
  `respingona` `[0, .33, 1.12]`, `larga` `[0, .42, 1.28]` como `ref3`).
- Se dibuja si `vis(0, .45) > −0.35`, después de la cara. En perfil sobresale de la silueta.

**Orejas.** En `[±0.9, 0.15, −0.05]`, de ancho `0.16R·(0.35 + 0.65|nz|)`. Se dibujan antes de la cara si `nz ≤ 0` y
después si `nz > 0`.

**Estilos de ojo.**

| estilo | aspecto | nota |
|---|---|---|
| `redondos` | blanco, iris, brillo y párpado | el de F1 |
| `puntos` | elipse oscura de `0.07R × 0.09R·ojo`, brillo de 1 px y párpado grueso de `0.05R` | **defecto en `Personaje2`**, más cerca de la referencia |
| `trazo` | solo el arco del párpado | para ojos casi cerrados, como `ref3` |

**Expresiones.**
- Se mantienen las de F1 (`I.EXPRESIONES`). Nuevo `ojoFeliz`: si `ojo < 0.2` y `boca[0] > 0.5`, el ojo se dibuja como arco
  convexo hacia arriba, como en `ref2`.
- `parpado` (0..1, defecto 0) baja el párpado superior de forma independiente del parpadeo (mirada cansada de `ref3`).
- Todas las expresiones funcionan en todas las vistas con `nz > 0` porque son parámetros de rasgos, no dibujos por vista.

**Coste y API.** 0.5 ms por cabeza más el pelo.
```js
Ilustra.Cabeza25.dibujar(ctx, marcoCabeza, {forma, piel, ojos, expresion, mirada, parpadeo, nariz, mejillas, pelo:{peinado, color, t, historial}, R}) -> {silueta:Path2D}
```

### 6.5 Orden de las piezas del cuerpo y saltos al girar

**Clave de orden.** Cada pieza se ordena por la `prof` de su punto representativo:
- miembro: punto medio de cada segmento, por separado (brazo y antebrazo pueden quedar en lados distintos del torso);
- torso: centro;
- cabeza: centro;
- mano: `palma`.

**Empates.** `|Δprof| < 0.01H` → orden canónico: pierna lejana, brazo lejano, torso, pierna cercana, cabeza, brazo cercano,
manos. "Lejano" se decide por el signo de `prof` del hombro o la cadera.

**Por qué no hay saltos.** Un miembro solo cambia de lado respecto al torso cuando su `prof` cruza la del torso. Eso ocurre
cuando está sobre el borde de la silueta (`yaw≈0` para los brazos a los lados), donde el solape es mínimo.

**Sin histéresis temporal.** Recordar el orden del cuadro anterior rompería el determinismo de acceso aleatorio, así que
**está prohibido**. En su lugar se aplica una regla pura: en la banda `|Δprof| < 0.015H` manda el orden canónico.

**Comprobación (WP7).** Barrido de `yaw` de 0 a 2π en pasos de 1°: la diferencia media entre pasos consecutivos en la caja
del personaje debe ser `< 6/255`, y ningún paso puede superar `3×` la mediana de los pasos (§9.4).

---------------------------------------------------------------------------------------------------------------
## 7. Limitación 4 — Interacción y varios personajes (`src/interaccion.js` + `escena.js`, WP8)

### 7.1 Anclas

**Anclas de actor.** Las calcula `Personaje2.resolver`:
- `manoD`/`manoI` (= `agarre` de `Mano`), `palmaD`, `indiceD`;
- `hombroD/I`, `codoD/I`;
- `cabeza` (centro), `coronilla`, `boca`;
- `pecho.delante`, `espalda.alta.D`, `espalda.alta.I`, `cintura.espalda.D/I` (puntos de la superficie de la sección del
  torso con su `prof`).

**Anclas de prop.**
```js
Ilustra.anclas.registrar('taza', {asa:[dx,dy,dprof], borde:[...]})
Ilustra.anclas.registrar('paraguas', {mango:[...]})
```
Los props se colocan en `escena.objetos = [{nombre, prop:'taza', estado:(t)=>({x,y,prof,ang,escala, sujetoPor?:{actor,mano}})}]`.
- Si `sujetoPor` está presente, la posición del objeto **se deriva del ancla de la mano**: el objeto se coloca de modo que
  su ancla coincida con la mano.

### 7.2 Restricciones en el estado de un actor

```js
agarres: [{ mano:'D', objetivo: {actor:'Teo', ancla:'manoD'} | {objeto:'taza1', ancla:'asa'} | {punto:[x,y,prof]}
                               | {encuentro:{actor:'Teo', mano:'D'}},
            peso:0..1, agarre:'asa' }]
mirarA: {actor:'Teo', ancla:'cabeza'} | {punto:[x,y,prof]}    // ajusta giroCabeza (±1.0) y mirada
```

**Resolución en `Escena`, actores del plano z=1, cada cuadro:**
1. **FK:** `J0 = p.resolver(t, estado)` sin agarres, para todos.
2. **Objetivos:** ancla del otro actor (de su `J0`), del objeto o el punto. `encuentro` → ambas manos van al punto medio de
   sus anclas `manoX` de FK. Después, `objetivo = lerp(ancla FK propia, objetivo, peso)`.
3. **IK:** `J = p.resolver(t, estado + objetivoManoX)`. Objetos con `sujetoPor`: su posición sale de `J`.
4. **Una sola pasada.** No hay iteración: los objetivos de otros actores salen de su FK. Si los dos actores se agarran
   mutuamente, se usa `encuentro`.

### 7.3 Orden de profundidad global

- `Escena` reúne las piezas de todos los `Personaje2` (`piezas()`), los objetos y los actores de F1 (estos como una sola
  pieza con `prof = estado.prof || 0`).
- Ordena por `(prof, orden)` y dibuja.
- **Abrazo:** el antebrazo que pasa por detrás de la espalda del otro tiene `prof` menor que el torso del otro (su objetivo
  es `espalda.alta`, con `prof` detrás), así que queda tapado. El brazo que pasa por delante queda encima. La sección de
  ancla se elige con `prof` = superficie trasera.

### 7.4 Sombras de contacto

Se dibujan antes de las piezas, en el suelo, con `multiply`:
- **Pie:** elipse bajo cada zapato, de radio `0.6×` el largo del pie y altura `0.12×`. Alfa `0.55·(1 − clamp(h/0.05H, 0, 1))`,
  con `h` la altura del pie sobre el suelo. Centro desplazado `+luz.dir·(−4px)`.
- **Oclusión entre actores:** si `|x1−x2| < 0.35H`, un degradado elíptico oscuro (alfa 0.25) en el suelo entre los dos.
- **Mano sobre cuerpo o mano con mano:** elipse blanda de radio `0.04H` y alfa 0.22, dibujada como pieza con
  `prof = prof(mano) − 0.5`. Queda bajo la mano y sobre el cuerpo tocado.

### 7.5 Luz común y luces locales

- Todas las piezas usan `escenario.luz` y, opcionalmente, `escenario.luces = [{pos:[x,y,prof], color, radio, intensidad}]`.
- `Ilustra.luzEn(base, x, y, prof, luces) -> Luz`:
  - para cada luz, peso `w = intensidad·max(0, 1 − dist/radio)²`;
  - `dir` = mezcla normalizada de `base.dir` (peso 1) y de las direcciones hacia cada luz (pesos `w`);
  - luz de borde: la luz con mayor `w` cuya `prof` sea menor que la de la pieza (está detrás) da `dirBorde` y color
    `borde`, con `fuerzaBorde = 1 + w`.
- Cada pieza fija `I.luzActual = luzEn(...)` en su centro. Así dos personajes junto al mismo escaparate reciben el borde
  cálido del mismo lado, y solo el que se acerca lo ve aumentar.
- La `luz` por actor de F1 sigue teniendo prioridad si se da.

### 7.6 Escena de prueba `escenas/dos_personajes.html` (WP8, 10 s, modo pintado, calle de día)

| tiempo | acción |
|---|---|
| 0–3 s | Lía (`melena`, abrigo claro, bufanda roja) entra por la izquierda caminando (`yaw 1.25 → 0.9`). Teo (`encrespado`, abrigo oscuro, `estilizado`) está quieto a la derecha con una taza (`objetos`, `sujetoPor` mano I, agarre `asa`), `yaw −1.0` |
| 3–4.5 s | Los dos giran hacia tres cuartos, uno frente al otro (`yaw ±0.55`); `mirarA` mutuo |
| 4.5–6.5 s | Apretón de manos: `encuentro` de las manos D, agarre `asa` en ambas, expresión `alegre`, peso de 0 a 1 en 0.4 s |
| 6.5–9 s | Abrazo: Lía lleva sus manos a `espalda.alta.D/I` de Teo; Teo pone su mano D en `espalda.alta.I` de Lía y aparta la taza (`objetivo` de su mano I a un punto lateral). Cabezas inclinadas (`inclinaCabeza ±0.15`), expresión `ternura` y ojos cerrados felices |
| 9–10 s | Se mantiene, con respiración y movimiento del pelo y la bufanda por el viento |

Luces: escaparate cálido a la izquierda (`luces`) y cielo de día (clave alta, `valores:{alto:0.6}`).

---------------------------------------------------------------------------------------------------------------
## 8. Rendimiento y determinismo

### 8.1 Presupuesto por cuadro (objetivo de diseño; medido por `verificar.py`)

| Partida | Estimación | Fuente |
|---|---|---|
| Escena F1 de base (capas cacheadas, atmósfera, post) | 120–130 ms | INFORME_FASE1 |
| Repintado de capas estáticas | 0 ms por cuadro; 1–3 s una vez al cargar | P3 |
| Papel y grano | < 5 ms | P1 |
| Personaje2 pintado (~25 piezas: subpintura a 1/4 + ~300 trazos a ~13 µs + campos) | 10–15 ms por actor | P2 (1.4–3 ms por pieza grande), P3 (13 µs por trazo) |
| Cabeza, pelo y manos | 2–4 ms por actor | P5 |
| Dinámica (pelo, bufanda, bajo; 72 rigs por actor) | 3–5 ms por actor | P6 + estimación |
| Interacción (2 pasadas de rig, orden, sombras) | < 3 ms | estimación |
| **Total con 2 personajes** | **~180–220 ms** (límite duro 500, objetivo ≤ 350) | |

**Reglas de rendimiento:**
- Un solo `clip` por pieza. Nunca `clip` por trazo, nunca filtros por trazo y nunca `getImageData` por cuadro en el lienzo
  principal: el `getImageData` solo se permite en lienzos auxiliares pequeños o en cachés de una vez.
- **Nivel de detalle:** piezas con caja < 40 px → sin trazos. Piezas con caja < 15 px → modo vector.
- El primer cuadro puede tardar más (cachés). `verificar.py` ya calienta la caché al comprobar el determinismo.

### 8.2 Determinismo

- Toda aleatoriedad sale de `I.rng(semilla)` con semillas fijas por pieza o capa. El número de valores aleatorios
  consumidos por trazo es fijo (§4.3).
- Número de trazos por pieza constante (dimensiones nominales, §4.4).
- Dinámica por ventana con rejilla global (§5.5): es una función pura de `t`.
- Orden de piezas por regla pura, sin histéresis temporal (§6.5).
- Cachés (repintado, papel, losetas de estrías, sellos) construidos desde semillas fijas, independientes del orden de
  render.
- Cualquier estado del contexto se reinicia (§3.2-5).
- **Comprobación:** `verificar.py` (SHA en dos renders y en página nueva) para cada escena nueva, más `regresion.py` para
  las escenas de F1 en modo vector.

---------------------------------------------------------------------------------------------------------------
## 9. Rúbrica de revisión (exigente, basada en evidencia)

### 9.1 Procedimiento obligatorio

1. **Renders:** `render.py --hoja 12`, más los fotogramas citados por cada criterio.
2. **Comparaciones:** para cada criterio marcado ⟂, ejecutar `herramientas/comparar.py` con el preset indicado y la caja
   equivalente de nuestro render. Se guardan en `salida/revision/`.
3. **Comparación con la Fase 1:** misma caja, mismo instante: el render F1 en el panel de referencia (`--ref` con el PNG
   de F1 y `--ref-caja` igual). Si en el panel `@REF` la mejora no se distingue, esa limitación tiene **máximo 1**.
4. **Por cada limitación, el revisor debe escribir al menos 3 diferencias concretas** que sigan existiendo frente a la
   referencia: elemento, dónde, qué tiene la referencia y qué tenemos. No valen frases como "le falta naturalidad".
   - Si no encuentra 3, debe justificar cada una que falte con un panel de `comparar.py`.
   - "Se ve bien" no es evidencia.
5. **Puntuación por criterio:**
   - **0** si no hay evidencia o falla.
   - **1** si cumple con fallos visibles (enumerados).
   - **2** solo si cumple en **todos** los casos de prueba del criterio y el revisor no puede señalar la diferencia en el
     panel `@REF`.
   - **Puntuación por defecto: 0.**
6. **Topes automáticos:**
   - Cualquier artefacto visible en una limitación limita esa limitación a **1** en todos sus criterios: autointersección,
     costura de loseta, salto al girar, rasgo fuera de la silueta, parpadeo de trazos, pieza en orden incorrecto o hueco
     en un contacto.
   - Si una métrica marcada como "dura" falla, el criterio vale 0.
7. **Aceptación de la Fase 2:**
   - ninguna limitación por debajo del 60 % de su máximo;
   - ningún criterio "duro" a 0;
   - regresión de F1 intacta;
   - `verificar.py` OK en todas las escenas nuevas.

### 9.2 Limitación 1 — Textura (máx. 12)

| # | Criterio observable | Evidencia | Dura |
|---|---|---|---|
| T1 | A 100 %, en tres recortes (torso del personaje, fachada, suelo) hay trazos individuales visibles, y su orientación dominante sigue la forma: vertical en muros, a lo largo del eje en miembros. En ningún recorte la orientación es aleatoria | 3 recortes de 300×300 | |
| T2 | Variación por trazo: en una zona de color local uniforme de 100×100 px, la desviación de L está entre 2.0 y 6.0 (por debajo es vectorial; por encima, ruido) | `comparar.py` sobre esa zona: `L_desv` | sí |
| T3 | Borde húmedo y borde rasgado visibles a 200 % en formas pintadas del fondo. Las siluetas del personaje siguen nítidas, sin halo claro alrededor | recorte a 200 % | |
| T4 | Papel visible como moteado de baja frecuencia en zonas planas claras; sin costuras en `x` o `y` múltiplos de 512; grano por píxel ≤ la mitad del de F1 | recorte que contenga x=512 o y=1024 | sí (costuras) |
| T5 ⟂ | Estructura de valores frente al preset `mujer` (figura) y `niebla` (fondo): figura con `L_p5 ≤ ref+8` y `L_desv ≥ ref−5`; fondo con niebla y `bordes ≤ 1.5×ref`. Se aplica a escenas de día; de noche, solo `L_desv` de la figura | `comparar.py --json` | sí |
| T6 | Estabilidad: con el personaje quieto, la diferencia entre dos cuadros consecutivos en la caja del personaje (sin lluvia ni grano: `post.lluvia=false`, `grano=0`) es < 1/255. En movimiento, los trazos viajan con la pieza: en 4 cuadros consecutivos a 200 % no aparecen ni desaparecen trazos dentro de la pieza | script de diferencia + 4 recortes | sí |

### 9.3 Limitación 2 — Personajes (máx. 12)

| # | Criterio observable | Evidencia | Dura |
|---|---|---|---|
| P1 | Miembros: en `pruebas/wp6a`, flexión de 0°, 45°, 90°, 135° y 150° a escala real y a 2×: sin autointersecciones; en ≥ 90°, hueso redondeado por fuera y pliegue por dentro; ningún tramo de miembro con bordes paralelos en más del 60 % de su largo | hoja de flexiones | sí (autointersección) |
| P2 ⟂ | Manos a 54 px (escala H=540), 7 agarres × 3 giros (dorso, canto, palma): en `relajada` y `saludar` se cuentan 4 dedos y el pulgar; `puno` sin yemas asomando; `senalar` con un único dedo extendido; pulgar unido en el lado de la palma (nunca sobre el dorso). Comparar con el preset `mano` | hoja de manos + `comparar.py --preset mano` | |
| P3 | Ropa: la manga y la pernera se distinguen del miembro (holgura ≥ 2 px a H=540); pliegues en el interior del codo o la rodilla con número creciente según la flexión (0 en recto, ≥ 2 a 90°); el bajo del abrigo o la falda se retrasa respecto a las piernas al parar (≥ 3 cuadros de movimiento residual) | hoja de flexiones + secuencia de parada | |
| P4 ⟂ | Pelo: masa única (sin huecos entre mechones a 100 %); en `encrespado`, ≥ 5 puntas agudas rompen la silueta como en el preset `pelo`; tras un frenazo de cabeza, rebote visible ≥ 2 cuadros y reposo en ≤ 1.2 s; en reposo la diferencia entre cuadros en la caja del pelo es < 1/255 | secuencia y `comparar.py --preset pelo` | |
| P5 | Zapatos: suela, puntera y talón distinguibles a H=540 en las vistas 0°, 45° y 90°; largo 0.13–0.15H | hoja de giros | |
| P6 ⟂ | Cara: con estilo `puntos`, frente al preset `pelo` (perfil) y `nina` (frente), el revisor enumera las diferencias de forma (nariz, párpado, mandíbula) y comprueba que la nariz del perfil sobresale ≥ 0.15R de la silueta del cráneo | `comparar.py` | |

### 9.4 Limitación 3 — Vistas (máx. 8)

| # | Criterio observable | Evidencia | Dura |
|---|---|---|---|
| V1 | Hoja de giro de `Personaje2` (yaw 0, ±45, ±90, ±135, 180) con 2 personajes distintos: misma identidad reconocible (masa de pelo, colores, rasgos); ningún rasgo fuera de la silueta; brazo y pierna cercanos delante del torso, y los lejanos detrás, en todas las vistas | hoja de giros | sí (rasgo fuera) |
| V2 | Continuidad: barrido de 360 pasos de 1° (`pruebas/wp7/barrido.py`): diferencia media entre pasos < 6/255 en la caja del personaje y ningún paso > 3× la mediana | salida del script | sí |
| V3 | Expresiones: 4 expresiones (`neutra`, `alegre`, `triste`, `sorpresa`) × 4 giros (0, 45, 90, 135): un segundo revisor, sin ver las etiquetas, identifica la expresión en ≥ 11 de las 12 celdas con giro 0°, 45° y 90°; en 135° vale "no visible", pero si la cara se ve, la expresión no puede contradecir a la de 0° | hoja de expresiones | |
| V4 | Caminar con `yaw=0.3` (casi de frente): pies sin deslizar (posición del pie de apoyo constante ±1.5 px durante el apoyo) y escorzo de zancada visible | traza numérica + hoja | sí |

### 9.5 Limitación 4 — Interacción (máx. 10)

| # | Criterio observable | Evidencia | Dura |
|---|---|---|---|
| I1 | Apretón de manos: distancia entre las anclas `manoD` de ambos ≤ 3 px en todos los cuadros con `peso=1`; sin hueco visible entre las manos a 200 % | registro numérico (`ESCENA.depurar`) + recorte | sí |
| I2 | Abrazo: el antebrazo que pasa por la espalda del otro queda tapado por su torso; el que pasa por delante, encima; sin cambio de orden entre cuadros consecutivos en esas piezas | 6 cuadros del abrazo a 200 % | sí |
| I3 | Sombras de contacto: cada pie apoyado tiene una sombra más oscura bajo la suela que se aclara al levantarlo; dos actores cercanos generan una sombra conjunta; la mano sobre la espalda deja una sombra blanda | recortes | |
| I4 | Luz común: con los dos actores junto al escaparate, los dos tienen el borde cálido en el mismo lado; al alejarse uno, su borde se debilita y el del otro no cambia | 2 cuadros | |
| I5 | Objeto sostenido (taza): el error entre el ancla del objeto y el agarre de la mano es ≤ 1.5 px en todos los cuadros; la taza nunca se dibuja delante de los dedos que la rodean por delante | registro numérico + recorte | sí |

---------------------------------------------------------------------------------------------------------------
## 10. Paquetes de trabajo

### 10.1 Orden y paralelismo

```
WP0 (base: geom3, línea base, regresión, plantilla de prueba, construir.py)          SECUENCIAL, primero
 ├─ WP1 pintura      (pintura.js, pincel.js, escena.js: solo _cacheCapa y post.papel)    ┐
 ├─ WP2 rig 2.5D     (rig25.js, esqueleto.js: añadir 'estilizado' a PROPORCIONES)      │ PARALELO
 ├─ WP3 mano         (mano.js)                                                        │ (archivos disjuntos)
 ├─ WP4 cabeza 2.5D  (cabeza25.js)                                                    │
 └─ WP5 pelo+dinámica (pelo.js, dinamica.js)                                            ┘
WP6a cuerpo + zapatos (cuerpo.js)        tras WP2  (usa J25; puede empezar aunque WP1/3/4/5 sigan)
WP6b ropa             (ropa.js)          tras WP6a (construye prendas desde Cuerpo.miembro/torso) y WP5 (dinamica.cadena)
WP7 Personaje2        (personaje2.js)    tras WP1–WP6b (ensambla todo)
WP8 interacción + escena (interaccion.js, escena.js: plano de actores, escenas/dos_personajes.html)   tras WP7
WP9 integración, escenarios de día, documentación, revisión con rúbrica              tras WP8
```

**Motivos del orden:**
- WP0 congela las interfaces compartidas (`G3`, orden de carga) y la línea base de regresión **antes** de que nadie toque
  `pincel.js`.
- WP1–WP5 solo dependen de `nucleo`, `pincel` (API pública sin cambios) y `G3`. Cada uno prueba su módulo en una página
  propia que construye sus entradas (por ejemplo, WP4 construye un marco de cabeza con `G3.marco`, y WP5 usa un marco de
  cabeza sintético).
- `pincel.js` y `escena.js` los modifican un solo WP cada vez: `pincel.js` solo WP1; `escena.js`, WP1 (dos ganchos
  pequeños) y después WP8. No hay conflicto porque van en fases distintas.
- WP6b necesita las piezas de WP6a; WP7 necesita todas.

### 10.2 Reglas para cada subagente (incluir literalmente en su encargo)

1. Lee `ESPECIFICACION.md` (§13 incluido), este documento (secciones indicadas en el WP) y los módulos de `src/` que vayas
   a usar. Solo puedes crear o modificar los archivos listados en tu WP. Si necesitas cambiar otro, detente y dilo en el
   informe.
2. Respeta las firmas de este documento. Si una firma no basta, añade un parámetro opcional, no cambies los existentes.
3. Escribe tu página de prueba en `pruebas/<wp>/` partiendo de `pruebas/_plantilla.html` y renderiza con:
   `python3 herramientas/render.py pruebas/<wp>/<prueba>.html --t ... --salida salida/f2/<wp>`.
4. **Antes de terminar, ejecuta todas tus pruebas.** Mira tú mismo cada PNG (léelo como imagen) y describe en el informe
   qué se ve en cada uno frente a lo que se pedía. No declares un criterio cumplido sin haber mirado el PNG.
5. Ejecuta `python3 herramientas/regresion.py` (debe salir OK) y `python3 herramientas/construir.py`.
6. **Informe final** (texto, sin crear archivos `.md`):
   - archivos tocados con su número de líneas;
   - rutas absolutas de cada PNG;
   - tiempos medidos (ms);
   - resultado de cada prueba automática;
   - desviaciones de la especificación con su motivo;
   - problemas conocidos.
7. Tamaño: como máximo ~900 líneas nuevas. Si no cabe, entrega la parte obligatoria y lista lo pendiente.
8. **Trampas conocidas:**
   - restaura `ctx.filter`;
   - nunca `clip` por trazo;
   - nada de `Math.random`;
   - consume un número fijo de aleatorios por elemento;
   - con `--disable-gpu` los lienzos son de software: mide y no supongas.

### 10.3 Paquetes

---
**WP0 — Base (secuencial, ~300 líneas)**
- **Objetivo:** dejar el terreno común antes del trabajo en paralelo.
- **Crea:**
  - `src/geom3.js` (§6.1, todo salvo `ik2`, que es de WP2).
  - `pruebas/_plantilla.html`: carga los `src/` de F1 más `geom3` y define `window.ESCENA = {duracion, fps, draw}` con
    `I.montar`. Incluye un comentario que explica cómo añadir módulos.
  - `pruebas/geom3.test.js` (node, con un `window` simulado `globalThis.window = globalThis`).
  - `herramientas/regresion.py`: renderiza las escenas de F1 (`calle_lluvia` t=3.2 y 8.5; `interior` 3.2; `elipsis` 3.2;
    `poses` 1.0; `ejemplos/minimo.html` 2.0), compara el SHA-256 con `pruebas/linea_base.json` y sale con 1 si difiere.
    Con `--grabar` reescribe la línea base.
  - `pruebas/linea_base.json`: **grabado con el código actual sin modificar.**
- **Modifica:** `herramientas/construir.py` (orden de §3.1, omitiendo los archivos que no existan).
- **Pruebas:**
  - `node pruebas/geom3.test.js` imprime OK en:
    - `proyectar` con `yaw=π/2`: `[1,0,0]` → `prof = −1`; `[0,0,1]` → `X = +1`;
    - la envolvente de un cuadrado con un punto interior devuelve 4 puntos;
    - `remuestrearPolar` devuelve 48 puntos con el primero arriba;
    - `orientar` invierte un polígono antihorario.
  - `regresion.py` dice OK dos veces seguidas.
  - `pruebas/wp0/marco.html`: dibuja una nube cúbica de 8 puntos y su envolvente a 8 valores de `yaw` →
    `salida/f2/wp0/t000.00.png`. Debe verse un cubo girando sin que la silueta salte.

---
**WP1 — Pintura (paralelo, ~800 líneas)**
- **Objetivo:** §4 completo.
- **Crea:** `src/pintura.js`.
- **Modifica:**
  - `src/pincel.js` (§4.6: `union`, `interna` con `nonzero`, delegación de `forma`, `campos`).
  - `src/escena.js`: **solo** `_cacheCapa` (repintado antes del desenfoque) y la aplicación de `post.papel` antes del
    grano, con grano `×0.5` en modo pintado.
  - `src/atmosfera.js`: solo si hace falta para el factor de grano.
- **Interfaces:** §4.2–4.6. Con `I.MODO='vector'` los píxeles de F1 no cambian (`regresion.py`).
- **Pruebas** (en `pruebas/wp1/`):
  1. `formas.html` → `salida/f2/wp1/formas.png`. Cuadrícula de 3×3:
     - filas: cilindro, elipsoide (cabeza) y sección (torso);
     - columnas: vector F1, pintado con dureza 0.3 y pintado con dureza 0.8.
     - Debe verse: terminador continuo sin bisel ni escalones, trazos siguiendo el eje y borde húmedo.
  2. `union.html` → `union.png`. Un brazo de 2 segmentos unido a 0°, 90° y 135°, con `borde: 0.9`. **El solape no puede
     verse más claro** (fallo de P4).
  3. `calle_pintada.html`: copia de `calle_lluvia` con `I.MODO='pintado'` → `--t 2.1 9.67 --hoja 12`.
     - Fachadas como en `prototipos/salida/p3b`.
     - Sin costuras de papel en x=512 ni y=512/1024/1536.
     - `comparar.py --preset calle` y `--preset niebla`, registrando las métricas.
  4. Estabilidad (T6): 2 cuadros consecutivos con `post.lluvia=false` y `grano=0` en un tramo quieto de
     `calle_pintada` → diferencia < 1/255 en la caja del personaje. Script `pruebas/wp1/estabilidad.py`.
  5. `verificar.py` en `calle_pintada`: determinismo OK y media ≤ 300 ms. Informar del tiempo de carga (repintado).

---
**WP2 — Rig 2.5D (paralelo, ~600 líneas)**
- **Objetivo:** §6.2, §6.3 y `G3.ik2`.
- **Crea:** `src/rig25.js`.
- **Modifica:**
  - `src/geom3.js`: **solo añade** `ik2`.
  - `src/esqueleto.js`: **solo añade** `PROPORCIONES.estilizado`.
- **Pruebas** (`pruebas/wp2/`, dibujo en alambre: huesos como líneas de grosor según `prof` y articulaciones como círculos
  coloreados por `prof`):
  1. `giro.html` → `giro.png`: pose `dePie` y `poseCaminar` a mitad de paso, con `yaw ∈ {−π/2, −π/4, 0, π/4, π/2, 3π/4, π}`.
     Debe verse: en `yaw 0` los hombros a la anchura completa y las piernas de frente; en `π/2`, el mismo dibujo que F1
     (superponer el `J` de F1 en rojo: coincidencia ≤ 2 px en x,y con `yaw=π/2` y `abd*=0`).
  2. `ik.html` → `ik.png`: mano hacia 8 objetivos 3D alrededor del cuerpo (delante, detrás de la espalda, cruzando el
     pecho). El codo nunca apunta hacia delante y la mano llega con error ≤ 1 px (impreso).
  3. `caminar_frente.html`: `yaw=0.3`, 30 cuadros. Traza numérica de la posición del pie de apoyo: variación ≤ 1.5 px
     durante el apoyo (criterio V4). Hoja de 12.

---
**WP3 — Mano (paralelo, ~450 líneas)**
- **Objetivo:** §5.3.
- **Crea:** `src/mano.js`.
- **Pruebas** (`pruebas/wp3/manos.html` → `manos.png`):
  - Filas: 7 agarres.
  - Columnas: dorso, canto y palma (`dorso` girado 0, π/2, π), a 200 px y a 54 px.
  - Más una fila de `asa` alrededor de un cilindro dibujado de radio 10 px, con el cilindro **entre** los dedos y la palma
    (orden por `prof`).
  - Debe verse: dedos contables, pulgar en el lado de la palma, puntas redondeadas.
  - `comparar.py --preset mano` contra la celda `sostenerPlano` a 54 px.
  - Informar de ms por mano.

---
**WP4 — Cabeza 2.5D (paralelo, ~650 líneas)**
- **Objetivo:** §6.4 (sin pelo: usa un casquete liso de prueba; el pelo real es de WP5).
- **Crea:** `src/cabeza25.js`.
- **Pruebas** (`pruebas/wp4/`):
  1. `giro.html` → `giro.png`: fila de 17 giros de −π a π a R=22 (escala real) y fila de 9 giros a R=48, con formas
     `adulto` y `estilizado`.
  2. `expresiones.html` → `expresiones.png`: 4 expresiones × 4 giros (0, 45, 90, 135) a R=100, ojos `puntos`. Más una fila
     con `redondos` y otra con `trazo`.
  3. `barrido.py`: 360 pasos de 1° de una cabeza a R=60. Diferencia media entre pasos < 6/255 y ningún paso > 3× la
     mediana. Ningún píxel de ojos ni boca fuera de la silueta: comprobación por máscara, dibujando la silueta en un canal
     y los rasgos en otro.
  4. `comparar.py --preset pelo` (perfil `estilizado` con nariz `larga`) y `--preset nina` (frente, `ojoFeliz`).

---
**WP5 — Pelo y dinámica (paralelo, ~750 líneas)**
- **Objetivo:** §5.4 y §5.5.
- **Crea:** `src/dinamica.js` y `src/pelo.js`.
- **Pruebas:**
  1. `node pruebas/wp5/dinamica.test.js`: los números de P6 (error < 0.1 px con ventana 1.2, determinismo `===`) y
     `cadena` con 6 segmentos estable sin explosión en 10 s con viento.
  2. `pruebas/wp5/peinados.html` → `peinados.png`: 7 peinados × 5 giros (0, 45, 90, 135, 180) sobre una cabeza sintética
     (elipse con un marco `G3`). Masa única sin huecos; `encrespado` con ≥ 5 puntas fuera de la silueta.
  3. `pruebas/wp5/rebote.html`: cabeza que se desplaza 120 px y frena en t=1 s → hoja de 12 de t=0.8 a 2.2. Rebote visible
     ≥ 2 cuadros y reposo en ≤ 1.2 s. Diferencia < 1/255 entre t=2.6 y t=2.6+1/30.
  4. `comparar.py --preset pelo` contra `encrespado` a 90°.

---
**WP6a — Cuerpo y zapatos (tras WP2, ~650 líneas)**
- **Objetivo:** §5.1 y §5.2.
- **Crea:** `src/cuerpo.js`.
- **Pruebas** (`pruebas/wp6a/`):
  1. `flexiones.html` → `flexiones.png`: brazo y pierna a 0°, 45°, 90°, 135° y 150°, en `yaw` 0, π/4 y π/2, a escala real
     y a 2× (criterio P1).
  2. `cuerpo_giro.html` → `cuerpo_giro.png`: cuerpo sin ropa (piezas de color plano por parte, tonos distintos) con
     `yaw ∈ {0, ±π/4, ±π/2, 3π/4, π}` y 3 complexiones. El orden de las piezas sigue §6.5.
  3. `zapatos.html`: 4 modelos × 3 vistas (criterio P5).

---
**WP6b — Ropa (tras WP6a y WP5, ~750 líneas)**
- **Objetivo:** §5.6 (prendas y pliegues).
- **Crea:** `src/ropa.js`.
- **Pruebas** (`pruebas/wp6b/`):
  1. `pliegues.html` → `pliegues.png`: manga de abrigo y pernera en flexiones de 0° a 150°. Pliegues en C en el interior,
     cuyo número crece con la flexión (0 en recto).
  2. `prendas.html` → `prendas.png`: abrigo, falda, jersey, delantal y bufanda sobre el cuerpo de WP6a, en 4 giros.
  3. `parada.html`: caminar y parar. Hoja de 12 alrededor de la parada: el bajo del abrigo sigue moviéndose ≥ 3 cuadros
     tras parar los pies.

---
**WP7 — Personaje2 (tras WP1–WP6b, ~700 líneas)**
- **Objetivo:** §5.6 (contrato), §6.5 (orden) y presets.
- **Crea:** `src/personaje2.js`, `escenas/giro.html` y `pruebas/wp7/barrido.py`.
- **Presets:** `Ilustra.PRESETS2 = {lia, teo, nina, abuela}` (colores de §4.7; Teo `estilizado`, `encrespado`, abrigo
  oscuro).
- **Pruebas:**
  1. `escenas/giro.html` → `--t 0 1 2 3 4 5 6 7` (`yaw` de 0 a 7π/4) y `--hoja 12`. Dos presets lado a lado, en modo
     pintado (criterio V1).
  2. Hoja de expresiones de 4 × 4 (V3).
  3. `barrido.py` del cuerpo completo (V2).
  4. Escena `calle_lluvia` con Lía como `Personaje2` (`escenas/calle_lluvia_f2.html`), `verificar.py`: media ≤ 300 ms.
  5. `comparar.py --preset mujer` contra Lía de frente.

---
**WP8 — Interacción y escena (tras WP7, ~800 líneas)**
- **Objetivo:** §7 completo.
- **Crea:** `src/interaccion.js` y `escenas/dos_personajes.html` (§7.6).
- **Modifica:** `src/escena.js`, solo el bloque `capa.actores`, más `escena.objetos` y las sombras de contacto.
- **Añade:** `ESCENA.depurar(t)`, que devuelve las distancias entre anclas para las pruebas I1 e I5.
- **Pruebas:**
  1. `render.py escenas/dos_personajes.html --hoja 12` y `--t 5.5 7.5 8.5 9.5`.
  2. `pruebas/wp8/anclas.py`: recorre los 300 cuadros con `depurar` → error máximo del apretón (≤ 3 px) y de la taza
     (≤ 1.5 px).
  3. Recortes a 200 % del abrazo en 6 cuadros consecutivos (I2) y de los pies (I3).
  4. `verificar.py`: determinismo OK, media ≤ 350 ms y continuidad < 12/255.
  5. `regresion.py` OK.

---
**WP9 — Integración, día y documentación (tras WP8, ~400 líneas)**
- **Objetivo:**
  - `calleLluviosa({hora:'dia'})` y `valores:{alto}` (§4.7);
  - `README.md` (sección Fase 2 con un ejemplo mínimo de `Personaje2` y de `agarres`);
  - anexo normativo en `ESPECIFICACION_F2.md` con los ajustes hechos durante la implementación (como el §13 de F1);
  - `dist/ilustra.js`;
  - `INFORME_FASE2.md`.
- **Revisión:** aplicar la rúbrica §9 completa con `comparar.py` (todas las comparaciones a `salida/revision/`) y
  registrar las puntuaciones con sus diferencias concretas. Lo revisa después el diseñador.
- **Pruebas:** `regresion.py`, `verificar.py` de todas las escenas, hojas de contacto de todas las escenas nuevas.

### 10.4 Lo que el diseñador revisa entre fases

Al cerrar las fases B (WP1–5), C (WP6) y E (WP8), el diseñador mira los PNG de cada WP con la rúbrica §9 y devuelve
correcciones concretas como un WP de corrección (`WPn.c`), con archivos y criterios. No se avanza de fase con un criterio
"duro" a 0.

---------------------------------------------------------------------------------------------------------------
## 11. Riesgos y lo que probablemente no se alcanzará

**Riesgos principales:**
1. **Aspecto de "avatar 3D".** La proyección de nubes y la envolvente convexa dan formas redondeadas y genéricas (P5). Sin
   las correcciones por vistas clave y sin formas `estilizado` bien diseñadas, los personajes girarán bien pero se verán
   como muñecos 3D, no como dibujo. Es el riesgo estético mayor. Mitigación: §6.4 (vistas clave), estilo de ojo `puntos` y
   revisión con los presets `pelo` y `nina`.
2. **Envolvente convexa.** No puede representar concavidades: el puente de la nariz se dibuja aparte, y el cuello y la nuca
   también. Para cráneos con concavidad fuerte hay que añadir piezas.
3. **Pintura en piezas pequeñas.** A escala real (H=540), muchas piezas miden menos de 40 px y no llevan trazos (nivel de
   detalle). La figura se leerá menos pintada que el fondo. Es coherente con la referencia (figuras limpias y fondos
   texturados), pero hay que vigilar que no parezcan recortes pegados.
4. **Orden de profundidad por pieza.** El orden por el punto medio falla en piezas largas que cruzan a otra en diagonal
   (antebrazo sobre el muslo al sentarse). Puede necesitar dividir piezas o fijar excepciones por pose.
5. **Coste de la dinámica.** 72 resoluciones de rig por actor y cuadro son una estimación. Si el `estado(t)` de una escena
   es caro (lógica de guion), la dinámica puede dominar el tiempo. Mitigación: bajar `muestreo` a 1/30 en el pelo.
6. **Repintado en máquinas distintas.** Depende de `getImageData` del raster de Chromium sin GPU: es determinista en la
   misma máquina y versión, pero puede variar en otra. Lo mismo vale para F1.
7. **Paralelismo real.** Los cinco WP paralelos dependen de que las interfaces de este documento sean suficientes. Si WP7
   encuentra incompatibilidades al ensamblar, habrá una ronda de corrección.

**Lo que probablemente no se alcanzará en la Fase 2:**
- **Calidad de dibujo de la referencia.** Siluetas con intención, línea de acción en cada pose y caras con matiz son
  decisiones de diseño plano a plano. Un rig paramétrico se acerca, pero no las iguala.
- **Gesto.** Manos a primer plano con gesto fino (detalle de manos entrelazadas a pantalla completa): la mano paramétrica
  vale a escala de personaje y en planos medios.
- **Tela simulada.** Los pliegues son reglas (compresión, tensión, caída); no hay colisión ni caída real.
- **Giros arbitrarios fuera del eje vertical.** Hay giro (`yaw`) y cabeceo e inclinación de la cabeza, pero no hay
  personaje tumbado ni visto desde arriba.
- **Pintura igual a la de un artista.** Los trazos son estadísticos (dirección y variación); no hay "decisión" de pincelada
  en los puntos de interés.
- **Verificación de la textura de la referencia.** Con capturas de 260 px no se puede comprobar si nuestra textura se
  parece a la suya. Solo se mide la estructura de valores y bordes. Haría falta una referencia de mayor resolución.
