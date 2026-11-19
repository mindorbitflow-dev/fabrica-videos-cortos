# Informe de la Fase 1 — kit de ilustración "Ilustra"

## Cómo se trabajó

- **Sin subagentes.** El encargo pedía repartir la implementación entre subagentes Sonnet con la herramienta Agent, pero
  esa herramienta no estaba disponible en esta sesión. El orquestador escribió la especificación y también el código.
  Las revisiones visuales sí se hicieron como se pidió: cada ronda terminó en PNG y hojas de contacto que se miraron antes
  de corregir.
- **Rondas de revisión: 6.**
  1. Primer render. Problemas: reflejos que parecían lunares, bolardos borrosos, abrigo saturado y cara frontal.
  2. Más rim y volumen, cúpula del paraguas, reflejo de la fachada en el suelo mojado, farolas recolocadas.
  3. Halos y conos más fuertes, lluvia iluminada dentro de los conos, mechones recortados al pelo, sombreado del abrigo.
  4. Hoja de poses. Se corrigió el abrigo, que se convertía en "vestido" al sentarse o correr: el bajo ahora cuelga de la
     cadena de la pierna.
  5. Interior: mapa de luz, encuadre más cerrado y dirección de la sombra proyectada. Además: transición caminar→parar con
     paso final, bloom y profundidad de campo.
  6. Elipsis. Se corrigieron la paleta de noche y los brazos en vista de espaldas.

## Entregables

| Entregable | Ruta |
|---|---|
| Especificación | `ESPECIFICACION.md` (§13 = ajustes que prevalecen) |
| Kit | `src/*.js` (11 módulos), `dist/ilustra.js` |
| Escena de 10 s, calle lluviosa | `escenas/calle_lluvia.html` → `salida/calle_lluvia/fotogramas/f0000–f0299.png`, `calle_lluvia.mp4`, `hoja_12.png`, `hoja_12_zona.png` |
| Interior cálido (10 s) | `escenas/interior.html` → `salida/interior/hoja_12.png` |
| Elipsis (contraluz, de espaldas, sombra proyectada, plano de detalle) | `escenas/elipsis.html` → `salida/elipsis/` |
| Catálogo de poses, tipos de cuerpo y expresiones | `escenas/poses.html` → `salida/poses/t001.00.png` |
| Ejemplo mínimo para terceros (incluye un objeto nuevo) | `ejemplos/minimo.html` |
| Herramientas | `herramientas/render.py`, `verificar.py`, `construir.py` |
| Mejores fotogramas | `salida/mejores/` |

## Criterios de aceptación

### Medibles (salida de `herramientas/verificar.py`)

| Criterio | Calle | Interior | Elipsis | ¿Cumple? |
|---|---|---|---|---|
| Determinismo (SHA-256 de t=3.2 en dos renders y en una página nueva) | idéntico | idéntico | idéntico | Sí |
| Rendimiento ≤ 500 ms/cuadro (media, en la página) | 128 ms (máx. 164) | 148 ms (máx. 193) | 222 ms (máx. 289) | Sí |
| Continuidad: diferencia media entre cuadros consecutivos < 12/255 | máx. 10.5 | máx. 5.4 | máx. 10.7 | Sí, con matiz: en la calle la mayor parte de la diferencia viene de la lluvia y el grano, no de saltos |
| Zona segura (cabeza, torso y objeto narrativo en y∈[430,1190]) | Sí. Al final del zoom los pies llegan a y≈1208, en el borde de la franja de subtítulos | Sí | Sí | Sí |

El render se hace a resolución completa, sin escalar. Las capas estáticas se cachean, y la niebla, el mapa de luz y el
bloom trabajan a 1/4 y 1/8 de resolución.

### Visuales (juicio del revisor, comparando con `muestra1.png`)

Rúbrica del §12 aplicada a la calle lluviosa:

| # | Punto | Nota (0–2) | Comentario |
|---|---|---|---|
| 1 | Volumen del personaje | 1.5 | Degradado de luz, sombra interna y rim en todas las piezas, y proporciones creíbles (1:6.5). Las extremidades siguen siendo "tubos" lisos, no tienen modelado pintado |
| 2 | Expresión | 1.5 | Ojos con iris y brillo, párpado que parpadea, cejas y boca que cambian de neutra a ternura y a sonrisa. A 1/4 de tamaño la cara se lee, pero pequeña |
| 3 | Luz de borde | 2 | Rim cálido doble que cambia de lado cuando el escaparate se convierte en la fuente |
| 4 | Textura pictórica | 1 | Hay bordes irregulares y textura de pincel en soft-light, pero son discretos. A distancia la imagen aún se ve más "vectorial con grano" que pintada |
| 5 | Profundidad atmosférica | 2 | Cinco planos (cielo, tejados lejanos desenfocados, calle transversal en niebla, fachada, actor) más la niebla baja |
| 6 | Contraste cálido/frío | 2 | Ventanas, farolas y escaparate contra un ambiente azul-gris, con reflejos cálidos en la acera mojada |
| 7 | Atmósfera animada | 2 | Lluvia en tres capas, lluvia iluminada en los conos, salpicaduras, niebla que deriva, goteo del paraguas y grano por cuadro |
| 8 | Movimiento | 2 | Paso con IK sin deslizamiento, frenada suave, paso final que junta los pies, respiración, parpadeo, y viento en bufanda y pelo |
| 9 | Composición | 2 | Personaje en la zona de dibujo y suelo tranquilo bajo los subtítulos |
| | **Total** | **16/18** | Ningún 0 en los puntos 1–4, así que cumple el umbral (≥14) |

**Frente a la muestra actual**, a simple vista mejora claramente en:
- Proporciones y volumen: el personaje tiene esqueleto, abrigo con cinturón y pliegues, manos y zapatos.
- Cara: ojos con brillo, cejas, nariz, mejillas y expresiones.
- Luz de borde: la muestra no tenía.
- Profundidad: cinco planos con niebla y desenfoque.
- Ambiente: reflejos en el suelo mojado, conos de farola y bloom.

En textura pictórica la mejora es moderada.

**Frente al video de referencia**, todavía queda claramente por debajo en el dibujo del personaje. La referencia está
dibujada a mano: siluetas de ropa con caída, manos con dedos, poses con línea de acción y rostros con más matiz. El kit
alcanza la paleta, la luz y la atmósfera de la referencia, pero no la calidad de dibujo de sus personajes.

## Limitaciones conocidas

1. **Vistas del personaje.** Solo hay perfil o tres cuartos, con `dir = ±1`, y una vista de espaldas simplificada. No hay
   vista frontal, y girar al personaje de un lado al otro es un salto (no hay rotación intermedia).
2. **Manos.** Son mitones con pulgar. No se pueden mostrar gestos finos: señalar, contar con los dedos, sujetar algo pequeño.
3. **Vestuario.** Un solo patrón: abrigo de largo variable, pantalón, bufanda opcional y paraguas. No hay faldas,
   delantales, sombreros, gafas, bolsos, uniformes ni ropa de niño distinta.
4. **Peinados.** `melena`, `corto`, `mono` y `calvo`. No hay barba, coletas ni pelo largo suelto.
5. **Animales.** No hay ninguno: ni perro ni pájaros.
6. **Cuerpo.** El cuello y los hombros son simples. Los brazos muy levantados (`saludar`) dejan ver la unión del hombro.
   Al correr, el abrigo se abre mucho, como una capa.
7. **Interacción entre dos personajes.** Abrazar o dar la mano funciona por IK, pero no se ha probado con dos actores
   reales a la vez. Faltan un orden de profundidad entre actores y la oclusión mutua.
8. **Escenarios.** Hay dos (calle e interior). No hay estación, plaza, cocina ni exteriores naturales. Los props interiores
   (mesa, mantel) son toscos.
9. **Pincel.** La textura de pincel es sutil y es la misma para todo. No hay pinceladas direccionales que sigan la forma.
10. **Coste de las elipsis.** `contraluz` y `sombraProyectada` usan lienzos auxiliares a resolución completa (unos
    100 ms cada una). Siguen dentro del presupuesto, pero varias a la vez podrían superarlo.
11. **Tipografía y subtítulos.** No forman parte del kit; los pone la fábrica.
12. **Fondos externos.** No están implementados. El hueco existe (`{imagen}` en una capa) y hoy se ignora.

## Cinco historias de prueba para validar la cobertura

Leyenda: ✔ = el kit ya lo cubre · ✚ = pieza que falta.

### 1. El anciano en la estación de tren
Planos:
1. Andén con niebla al amanecer, plano general.
2. El anciano sentado en un banco, de perfil, con una maleta.
3. Plano de detalle de sus manos sobre un billete viejo.
4. Llega el tren: luces cálidas que atraviesan la niebla.
5. Se pone de pie despacio.
6. De espaldas, mirando cómo se abren las puertas.
7. Contraluz del vagón iluminado.

Ya cubre: ✔ tipo `anciano`, pose `sentado`, `banco`, niebla y halos, `planoDetalle`, `vista:'espalda'`, `contraluz`,
transición de `sentado` a `dePie` por mezcla de poses.

Falta:
- ✚ Escenario `estacion`: andén, vías en perspectiva, marquesina de hierro y reloj.
- ✚ Prop `tren`: vagón con ventanas iluminadas y movimiento lateral.
- ✚ Props `maleta`, `billete` y `sombrero`.
- ✚ Manos con dedos para el plano de detalle.
- ✚ Vapor y humo de locomotora: se puede reutilizar el vapor de `taza`.

### 2. La abuela cocinando
Planos:
1. Cocina cálida con ventana de lluvia.
2. La abuela remueve una olla con vapor.
3. Detalle de la cuchara de madera.
4. Huele y sonríe con los ojos cerrados.
5. Sirve un plato.
6. La nieta entra por la puerta.
7. Las dos a la mesa.

Ya cubre: ✔ `interiorCalido` (base), `olla` con vapor, `mesa`, `ventanaNoche`, expresiones (`ternura`, ojos cerrados con
`ojo` bajo), IK de la mano hacia la olla, niña con tipo `nino`.

Falta:
- ✚ Escenario `cocina`: fogón, azulejos, estantes con tarros y ristra de ajos.
- ✚ Vestuario: `delantal`, `falda`, y moño blanco (el moño ya existe; falta pelo canoso con volumen).
- ✚ Props `cuchara`, `plato`, `silla`.
- ✚ Ciclo de "remover": un círculo de la mano por IK, fácil.
- ✚ Dos actores con orden de profundidad.

### 3. La persecución
Planos:
1. Callejón nocturno: un ladrón corre hacia la cámara (falta vista frontal: se haría en diagonal o de perfil).
2. Pies corriendo sobre charcos con salpicaduras.
3. Una sombra larga que dobla la esquina (elipsis).
4. El perseguidor salta un charco.
5. Silueta contra una farola.
6. Callejón sin salida: los dos respiran agitados.

Ya cubre: ✔ calle de noche, `correr0` y `correr1` (sin ciclo de carrera), salpicaduras, `sombraProyectada`, `silueta` y
`contraluz`, cámara con temblor.

Falta:
- ✚ `ciclos.poseCorrer` con IK de pies, como el de caminar.
- ✚ Salpicadura grande al pisar un charco.
- ✚ Desenfoque de movimiento o "smear frames".
- ✚ Escenario `callejon`: paredes de ladrillo cerca, escaleras de incendio y cubos.
- ✚ Vista frontal o diagonal del personaje.
- ✚ Respiración agitada: hoy basta con subir la amplitud y la frecuencia de `respirar`.
- ✚ Cámara en mano más fuerte.

### 4. El niño y su perro
Planos:
1. Parque con hojas cayendo.
2. El niño lanza una pelota.
3. El perro corre a por ella.
4. El perro se la devuelve y mueve la cola.
5. El niño se agacha a abrazarlo.
6. Atardecer, los dos sentados en un banco.

Ya cubre: ✔ tipo `nino`, poses `abrazar`, `sentado` y `agarrar`, `banco`, luz de atardecer, viento en pelo y ropa.

Falta (es la historia con más huecos):
- ✚ Esqueleto de cuadrúpedo y personaje `Perro` con ciclos de trote y movimiento de cola.
- ✚ Escenario `parque`: árboles, césped, camino y cielo de atardecer.
- ✚ Hojas cayendo (partículas).
- ✚ Prop `pelota` con trayectoria parabólica.
- ✚ Pose `agacharse`.
- ✚ Ropa infantil: jersey y pantalón corto.

### 5. El reencuentro en una plaza
Planos:
1. Plaza con arco monumental bajo la llovizna, plano general.
2. Una mujer espera junto a una farola mirando el reloj.
3. Al fondo, en la niebla, aparece una silueta.
4. Ella la reconoce: sorpresa.
5. Corren el uno hacia el otro (plano lateral).
6. Abrazo con contraluz de la farola.
7. Detalle de las manos entrelazadas.
8. Paraguas que cae al suelo.

Ya cubre: ✔ `arco`, `farola`, niebla, silueta en la niebla (`profundidad` alta o `silueta`), expresión `sorpresa`,
`contraluz`, `abrazar` por IK, paraguas, `planoDetalle`.

Falta:
- ✚ Escenario `plaza`: pavimento radial, fuente y fachadas en semicírculo.
- ✚ Interacción de dos personajes: orden de profundidad y oclusión de los brazos del abrazo.
- ✚ Reloj de pulsera o reloj de plaza.
- ✚ Paraguas como objeto suelto con física simple de caída.
- ✚ Manos con dedos para el detalle.
- ✚ Ciclo de carrera con IK.

### Piezas que más se repiten en la lista anterior (prioridad para la Fase 2)
1. Manos con dedos y poses de mano (4 de 5 historias).
2. Varios actores con orden de profundidad y oclusión (3 de 5).
3. Ciclo de carrera con IK (3 de 5).
4. Más escenarios (estación, cocina, callejón, parque y plaza), con más props y más vestuario (5 de 5).
5. Vista frontal o diagonal del personaje (2 de 5).
6. Cuadrúpedo (1 de 5, pero imprescindible para esa historia).
