---
description: "Así te estafan": una estafa cotidiana ilustrada en 2D con Marta; cómo funciona el truco, la señal que lo delata y qué hacer
argument-hint: "estafa <tema>"
---

Deja escrito, dibujado y revisado UN video de la página **Así te estafan**, sin pedir confirmaciones ni hacer preguntas (nadie
está mirando: lo lanza la fábrica, `src/autor.py`, que después lo renderiza y lo envía por correo). `$ARGUMENTS` = `estafa` y el
tema. Todo lo que necesitas está aquí, en `ejemplos/estafa/` (guion y escenas de un video completo: léelos enteros), en la
cabecera de `plantilla/decorados.js` (fondos y props `D`, incluido `D.celular`) y en la firma de `S30.hombre` de
`plantilla/sombra_ilustra.js`. No leas otros archivos.

**La página:** estafas reales y comunes en Latinoamérica (mensajes, llamadas, códigos, falsos premios, compras, inversiones,
falsos familiares) contadas con **Marta**, una persona de verdad que cae o casi cae: se ve cómo funciona el truco, qué emoción
usa el estafador (urgencia, miedo, confianza, codicia, autoridad), la señal que lo delata y lo que te salva. Es contenido que
la gente se manda ("mándaselo a tu mamá"). Tono: cercano y directo, como un amigo que te avisa antes de que te pase; frases
cortas; tensión al principio y alivio al final. Nunca humillas a la víctima: el truco es bueno, por eso funciona.

## 1. Guion (`proyectos/guion_nuevo.json`)
- **Si el tema dice LIBRE** (lo normal), elígelo pensando en viralidad: una estafa que MILLONES han sufrido o les ha pasado a
  sus papás (WhatsApp, bancos, paquetes, premios, familiares "en apuros", inversiones, compras en línea, alquileres, empleos,
  QR, voz clonada con IA). Alterna canales (mensaje, llamada, red social, en persona) y no repitas ninguna de la lista de ya
  hechas. Pon en `tema` un nombre corto ("El código de WhatsApp que te pide tu amiga"): queda en el historial para no repetirlo.
- Formato: `{tema, titulo, portada: {texto, destacado, sub}, escenas: [{rol, voz, visual}], caption, hashtags}` como
  `ejemplos/estafa/guion.json`. Español neutro de Latinoamérica. **15-19 escenas, 170-230 palabras (60-80 s)**, frases de 5-16 palabras.
- **Gancho = la estafa ya está pasando, con algo en juego:** "Si Marta devuelve este código, pierde su WhatsApp en un minuto." /
  "Le llaman del 'banco': dicen que alguien está vaciando su cuenta. Tiene dos minutos." Nunca abras con contexto, estadísticas ni
  "¿sabías que…?". La escena 2 plantea el dilema en una pregunta que el espectador contesta mal sin pensar.
- Estructura (`rol`): `gancho` → `pregunta` (el dilema, lo que haría cualquiera) → `mecanismo`: cómo funciona el truco paso a paso
  y **qué emoción explota** (por qué funciona aunque seas listo) → `reenganche` cada 3-4 escenas (un giro: quién está detrás,
  qué viene después) → `revelacion`: **la señal que lo delata** (una sola, muy concreta) y **qué hacer** (colgar y llamar tú al
  número oficial, no compartir códigos, no pagar por adelantado, verificar por otro canal) → `remate`: la regla corta para
  recordar → `cierre`.
- **Prevención, no manual.** Muestra cómo se reconoce y cómo se evita; NUNCA des instrucciones que ayuden a estafar (cómo falsificar
  números, páginas, comprobantes o voces, ni qué decir para convencer). Los estafadores se ven como "alguien que escribe/llama";
  nada de tutoriales ni nombres de herramientas.
- **Consejos correctos o nada.** Lo que recomiendas debe coincidir con lo que dicen bancos, la policía y las empresas afectadas
  (ningún banco pide claves, códigos ni PIN; nadie serio cobra por adelantado un premio o un empleo). Si un detalle cambia por país,
  dilo ("en tu banco, el número oficial está detrás de la tarjeta") y no inventes números de teléfono, leyes ni montos. Cifras con
  dígitos y redondas; si dudas de un dato, quítalo. No nombres bancos, empresas ni personas reales como estafadores: usa "tu banco",
  "una tienda en línea", "una empresa de mensajería" (WhatsApp y otras apps sí se pueden nombrar cuando el truco es sobre ellas).
- **Sin morbo ni miedo gratuito:** nada de violencia, armas, secuestros mostrados ni pérdidas dramáticas de ahorros de toda una vida.
  El susto se corta con alivio: al final Marta (o quien lo ve) sabe qué hacer. Evita temas de salud, política y religión.
- El video NO lleva título encima al empezar. Aun así llena `portada`: 2-5 palabras que avisan o prohíben ("NO MANDES ESE CÓDIGO"),
  `destacado` = trozo literal de `texto`, `sub` = el matiz que sorprende ("aunque te lo pida tu mejor amiga"). `titulo`: máx. 60
  caracteres que avisan ("Tu amiga te pide un código por WhatsApp: no se lo des").
- `cierre`: una pregunta para comentar que además haga compartir ("¿A quién le mandarías este video para que no le pase? Escríbelo
  en los comentarios."), máx. 20 palabras, dicha por la voz. `caption`: primera línea = el aviso; termina con esa pregunta.
  `hashtags`: 3-5, sobre el tema y "estafas".

## 2. Proyecto
`python run.py --nicho estafa --guion proyectos/guion_nuevo.json` imprime el id y la ruta de `proyectos/<id>/escenas.js`.

## 3. Dibujo 2D ilustrado (`proyectos/<id>/escenas.js`)
Mismo mundo visual que Sombra de Evidencia (kit Ilustra: pincel con volumen, luz cálida de borde, colores apagados, grano). Imita
`ejemplos/estafa/escenas.js` en estructura y nivel de detalle.
- `window.ESCENAS = [...]`: UNA función por escena, en orden: `(ctx, t, d, K, T) => {...}`. `t` = segundos de la escena, `d` = su duración
  (anima con fracciones de `d`: `K.prog(t, a, b)`), `T` = segundos del video. Solo funciones del tiempo: **prohibido `Math.random()`,
  `Date` y estado entre cuadros.** Canvas 1080x1920; el suelo de los fondos está en y=1250 (los pies de la gente, entre 1200 y 1300).
- **Personajes fijos:** Marta = `S30.mujer(ctx, x, y, s, {T, semilla: 5, dir, cara, susto, gesto, pose, paso})` SIEMPRE con `semilla: 5`; el
  estafador, `S30.hombre(ctx, ..., {semilla: 23, variante: 'hombre'})`, siempre el mismo y casi siempre en un cuarto oscuro con su
  celular o computador (nunca con cuchillos, armas ni disfraces de villano). Familia, jefes, amigas y gente de la calle: otras
  `semilla` y `variante: 'hombre'|'mujer'|'anciano'|'nino'`. Adulto ≈ 430·s px de alto: Marta grande (s 1.2-1.6) cuando importa, pequeña
  (s .5-.8) en multitudes. Define helpers (`marta`, `estafador`) como en el ejemplo.
- **Fondos y props: solo los de `D`** (cabecera de `plantilla/decorados.js`). Fondos `D.fondo.*` con el suelo en y=1250; el celular es
  **`D.celular(ctx, x, y, s, {tipo: 'mensaje'|'llamada'|'banco', quien, texto: [líneas], alerta 0-1, k 0-1, T})`** y es el protagonista
  de casi toda estafa: el mensaje o la llamada se LEE en la pantalla (máx. 2 líneas cortas de ~24 letras). Otros props útiles:
  `D.candado`, `D.billetes`, `D.monedas`, `D.papel`, `D.caja_registradora`, `D.fachada`, `D.grafica` y el fondo `D.fondo.banco`.
  Prohibido dibujar a mano con `fillRect`/`arc` lo que ya existe; solo flechas, tachones y halos simples (helpers `flecha`, `equis` del
  ejemplo). Componer: fondo + 1-3 props grandes + gente, y cerrar con `S30.pelicula(ctx, T)`; empezar con `S30.vaiven(ctx, T)`.
- Paleta sobria y cálida (`S30.C`); rojo `#C9584C` solo para lo que te hace daño (alertas, tachones) y ámbar `C.oro` para lo que importa.
  Nada de colores chillones ni de rótulos de mucho texto: pastillas de 1-3 palabras (`K.pastilla`).
- **Zonas seguras:** subtítulos ARRIBA (y≈170-400, letras blancas): nada importante ni claro en esa franja. Lo importante entre **y=420 y
  1250 y x=80-940**; lo de abajo (y>1500) lo tapa la app. La escena 1 no lleva título: la estafa se ve desde el primer cuadro. La última
  escena: solo fondo (azul noche con halo) y Marta pequeña abajo (y≈1560); la pregunta la pone el sistema en y≈420-1000.
- Ritmo: cada escena dura 2-5 s y algo pasa desde el primer cuadro (cámara con `K.camara`, un mensaje que aparece, un código que
  se cuenta, una flecha que avanza). No repitas el mismo plano dos escenas seguidas; en `revelacion` y `remate` el visual es el
  más llamativo (zoom, tachón rojo que cae, candado que se cierra, frase en grande).
- Rendimiento: ≤ ~250 ms por cuadro; lo estático ya se cachea solo, no crees objetos nuevos por cuadro.
- Escribe el archivo de una vez, reutilizando funciones; nada de comentarios largos.

## 4. Revisión
`python run.py --hoja <id>` genera `proyectos/<id>/hojas/hoja_*.jpg` (inicio y final de cada escena) y lista los errores de
JavaScript. Ábrelas con Read y corrige lo que no cumpla: se reconoce lo que dice la voz sin oírla; Marta se ve igual en todas las
escenas; el texto del celular se lee y no se corta; nada tapado por los subtítulos; nada de armas, sangre ni violencia; algo cambia
entre el inicio y el final. **Si no hay errores y todo se ve, una sola revisión basta.**

## 5. Entrega
No renderices: la fábrica lo hace. Termina con una sola línea `PROYECTO: <id>`.
