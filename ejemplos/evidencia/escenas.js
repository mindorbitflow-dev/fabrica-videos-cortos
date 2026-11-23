// "Tu diamante es publicidad" — Sombra de Evidencia (versión corta, ~55 s). Tito llega con algo cotidiano y Sombra le revela su origen.
// Todo con el motor de ilustración: personajes y gente (S30.detective / S30.tito / S30.hombre), fondos y objetos (D = plantilla/decorados.js),
// luz cálida y grano del kit. Los flashbacks NO dibujan formas planas a mano: componen decorados (D.fondo.*) y props (D.vitrina, D.mina...).
// MOVIMIENTO (lo que separa esto de una imagen fija): cada escena trae una cámara que VIAJA (K.plano: paneo + zoom, fondo con paralaje),
// personajes grandes que ACTÚAN (S30.actua: guion de poses; S30.camina: entradas sin patinar) y un objeto que entra, golpea o cambia.
// Ninguna escena es un encuadre quieto, y dos escenas seguidas nunca repiten plano.
(() => {
  const { W, H, TAU, clamp, lerp, prog, sale, rebote, hash, azar, alfa, mezcla } = K;
  const C = S30.C;

  // ---- piezas del tema (sobre los props del kit) ----
  const diamante = (ctx, x, y, r, T, { oro = 0, brillo = 1, gira = 0 } = {}) => D.joya(ctx, x, y, r, { T, oro, brillo, gira });
  // Anillo con diamante y halo ámbar. s = escala (1 ≈ 90 px de ancho). oro: 0-1.
  function anillo(ctx, x, y, s, T, { oro = 1 } = {}) {
    if (oro > .5) K.halo(ctx, x, y - 20 * s, 110 * s, C.oro, .3 * oro);
    D.joya(ctx, x, y - 20 * s, 44 * s, { tipo: 'anillo', oro, T });
  }
  const ano = (ctx, txt, t, y = 420, tam = 64) => S30.titulo(ctx, txt, 540, y, { tam, opacidad: prog(t, .05, .4) });
  const pastilla = (ctx, txt, x, y, a, oro = false) =>
    K.pastilla(ctx, txt, x, y, { tam: 36, fondo: oro ? C.oro : C.papel, color: C.tinta, opacidad: a, escala: rebote(a) });
  // Oficina con paralaje: la pared se mueve menos que los personajes. `de` / `a` = cámara { x, y, z } al empezar y al terminar la escena.
  const enOficina = (ctx, t, d, T, de, a, fn, mano = .6) =>
    K.plano(ctx, t, d, { de, a, T, mano, paralaje: .7, fondo: () => S30.oficina(ctx, T) }, fn);
  // Estrella de cine: S30.mujer (motor nuevo) con el brazo en alto sosteniendo un diamante.
  function mujer(ctx, x, y, s, T) {
    const J = S30.mujer(ctx, x, y, s, { T, dir: -1, semilla: 12, pose: 'saludar', cara: 'sonrisa' });
    diamante(ctx, J.dedosD.x, J.dedosD.y - 26, 16 * s / 1.15, T);
  }
  function grilla(ctx, n, dorados, t, T, { cols = 5, x0 = 190, y0 = 520, paso = 175, r = 46, ritmo = .12, aro = false } = {}) {
    for (let i = 0; i < n; i++) {
      const x = x0 + (i % cols) * paso, y = y0 + Math.floor(i / cols) * paso * .82;
      const k = clamp((dorados - i) * 1) * clamp((t - .2 - i * ritmo) / .3);
      if (aro) anillo(ctx, x, y + 20, r / 46, T, { oro: k });
      else diamante(ctx, x, y, r, T, { oro: k, brillo: k });
    }
  }
  const ALTO_TITO = s => 430 * s * .8;   // altura en px de Tito a escala s (para que S30.camina calcule bien el paso)

  window.ESCENAS = [
    // 1. GANCHO. Tito entra caminando con la cajita, se planta y se espanta al ver el precio. Cámara: empuje desde el plano general.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = S30.camina(t, d, 60, 600, { hasta: .38, alto: ALTO_TITO(1.7) });
      const espanto = c.paso === null ? Math.sin(clamp((t - d * .38) / .45) * Math.PI) : 0;   // salto de susto al plantarse
      const actuando = c.paso !== null ? { pose: 'camina', paso: c.paso } : { pose: 'traeObjeto' };
      enOficina(ctx, t, d, T, { x: 540, y: 760, z: 1 }, { x: 540, y: 760 }, () =>
        S30.tito(ctx, c.x, 1290 - espanto * 46, 1.7, Object.assign({ T, dir: -1, objeto: 'caja', boca: 'habla', mira: -.4, expresion: c.paso === null ? 'susto' : 'alegre' }, actuando)));
      pastilla(ctx, '2 SUELDOS', 540, 440, prog(t, d * .55, d * .55 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 2. Sombra, detrás del escritorio, gira hacia Tito y dice "la inventó De Beers"; Tito, nervioso, da saltitos con la caja. Cámara fija (la oficina no lleva zoom).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      enOficina(ctx, t, d, T, { x: 540, y: 760, z: 1 }, { x: 540, y: 760 }, () => {
        S30.detective(ctx, 330, 1180, 1.55, Object.assign({ T, mira: .6, habla: 1 }, S30.actua(t, d, [[0, 'dePie'], [.25, 'explicar'], [.55, 'senalar'], [.85, 'explicar']])));
        S30.escritorio(ctx, T, { y: 960 });
        const cae = K.sale(prog(t, d * .3, d * .55));   // el expediente aterriza sobre el escritorio
        if (cae > 0) D.papel(ctx, 560, lerp(240, 880, cae), 240, 300, { giro: lerp(.7, -.06, cae), titular: 'DE BEERS', lineas: 3 });
        S30.tito(ctx, 800, 1240 - Math.abs(Math.sin(T * 5)) * 22, 1.2, { T, dir: -1, objeto: 'caja', mira: -.6, boca: 'o' });
      });
      S30.pelicula(ctx, T);
    },
    // 3. 1870, Sudáfrica: la mina gigante. La cámara baja desde el borde hasta el fondo del hoyo; obreros pequeños trabajan y dos grandes pasan en primer plano.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 540, y: 650, z: 1.3 }, a: { x: 560, y: 900 }, T, mano: .8, paralaje: .5, fondo: () => D.fondo.exterior(ctx, T, { tipo: 'mina', hora: 'dia' }) }, () => {
        D.mina(ctx, 540, 760, 1, { T, niveles: 7 });
        for (let i = 0; i < 14; i++) {
          const a = hash(i) * TAU, nivel = Math.floor(hash(i + 3) * 6), rx = 470 - nivel * 58, ry = 230 - nivel * 30;
          const px = 540 + Math.cos(a + Math.sin(T * .4 + i) * .08) * rx * .92, py = 760 + nivel * 40 + Math.sin(a) * ry * .92 + 10;
          S30.hombre(ctx, px, py + 8, .24, { T, semilla: 60 + i, variante: 'hombre', dir: Math.cos(a) < 0 ? 1 : -1, paso: i % 3 ? T * 1.4 + i : null, gesto: Math.sin(T * 5 + i) > .3 ? 'senala' : 'quieto' });
        }
        for (let i = 0; i < 2; i++) {   // dos obreros grandes cruzan el borde en primer plano
          const x = lerp(i ? 1250 : -250, i ? 80 : 900, prog(t, 0, d)) * 1;
          S30.hombre(ctx, x, 1160 + i * 60, .9, { T, semilla: 70 + i, variante: i ? 'anciano' : 'hombre', dir: i ? -1 : 1, paso: T * 1.5 + i, cara: 'serio' });
        }
      });
      ano(ctx, '1870 · SUDÁFRICA', t);
      S30.pelicula(ctx, T);
    },
    // 4. Nueve de cada diez: la cámara recorre la bandeja de izquierda a derecha y los diamantes se vuelven ámbar uno a uno.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 380, y: 730, z: 1.27 }, a: { x: 700, y: 740 }, T, mano: .5, paralaje: .4, fondo: () => D.fondo.abstracto(ctx, T, { tema: 'salvia', y: 700 }) }, () => {
        D.bandeja(ctx, 540, 730, 1, { ancho: 920, alto: 380 });
        grilla(ctx, 10, 9, t, T, { cols: 5, x0: 180, y0: 640, paso: 180, r: 58, ritmo: d * .06 });
        pastilla(ctx, '9 DE CADA 10', 540, 420, prog(t, d * .65, d * .65 + .3), true);
      });
      S30.pelicula(ctx, T);
    },
    // 5. Escasos en la vitrina, abundantes en la bodega: la cámara baja de una a otra mientras la bodega se llena.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 540, y: 640, z: 1.23 }, a: { x: 540, y: 1000 }, T, mano: .4, paralaje: .5, fondo: () => D.fondo.tienda(ctx, T, {}) }, () => {
        D.vitrina(ctx, 540, 830, 1, { T });
        K.halo(ctx, 540, 590, 260, C.oro, .22);
        pastilla(ctx, 'VITRINA', 540, 300, prog(t, .1, .4), true);
        D.estante(ctx, 540, 1200, 1, { baldas: 3 });
        const llena = prog(t, d * .4, d * .9);
        for (let f = 0; f < 3; f++) for (let i = 0; i < 14; i++) if ((f * 14 + i) / 42 < llena) diamante(ctx, 150 + i * 60, 1200 - 400 + (f + 1) * 400 / 3 - 12 - 22, 20, T, { brillo: 0 });
        pastilla(ctx, 'BODEGA', 540, 770, prog(t, d * .4, d * .4 + .3));
      });
      S30.pelicula(ctx, T);
    },
    // 6. Tito interrumpe: "¿escasos?". Plano cerrado sobre Tito, que da un paso al frente y señala indignado; la cámara salta hacia él.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const salto = Math.max(0, Math.sin(clamp((t - .15) / .5) * Math.PI)) * 50;
      enOficina(ctx, t, d, T, { x: 540, y: 760, z: 1 }, { x: 540, y: 760 }, () => {
        S30.detective(ctx, 270, 1180, 1.1, { T, mira: .7, pose: 'cruzado' });
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 790, 1240 - salto, 1.25, Object.assign({ T, dir: -1, boca: 'habla', mira: -.7, expresion: 'enfado' }, S30.actua(t, d, [[0, 'dePie'], [.25, 'asombrado'], [.6, 'senalar']])));
      }, 1);
      S30.pelicula(ctx, T);
    },
    // 7. La agencia de publicidad: sala de juntas. La cámara recorre la mesa; la pizarra se dibuja y un publicista se levanta a señalarla.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const dibuja = prog(t, d * .2, d * .8);
      K.plano(ctx, t, d, { de: { x: 330, y: 820, z: 1.27 }, a: { x: 700, y: 780 }, T, mano: .5, paralaje: .55, fondo: () => D.fondo.juntas(ctx, T, { hora: 'atardecer' }) }, () => {
        D.pizarra(ctx, 540, 720, 1, { ancho: 380, alto: 270, dibuja: (c, w, h) => {
          c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w * dibuja, h); c.clip();
          c.beginPath(); c.moveTo(0, 90); c.bezierCurveTo(-130, 10, -120, -90, 0, -40); c.bezierCurveTo(120, -90, 130, 10, 0, 90);
          c.strokeStyle = C.terracota; c.lineWidth = 9; c.stroke(); D.joya(c, 0, 5, 34, { brillo: 0 }); c.restore(); } });
        for (let i = 0; i < 4; i++) S30.hombre(ctx, 200 + i * 230, 1180, 1.0, Object.assign({ T, semilla: 20 + i, dir: i < 2 ? 1 : -1, cara: i === 2 ? 'sonrisa' : 'serio', habla: i === 1 ? 1 : 0 },
          i === 1 ? S30.actua(t, d, [[0, 'dePie'], [.3, 'senalar'], [.8, 'senalar']]) : i === 3 ? S30.actua(t, d, [[0, 'dePie'], [.5, 'saludar']]) : {}));
        D.mesaJuntas(ctx, 540, 1250, 1, { T });
      });
      pastilla(ctx, 'AGENCIA DE PUBLICIDAD', 540, 290, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 8. Joyas prestadas a estrellas de cine: plató con foco. La estrella camina hasta el centro, alza el diamante y la cámara de la película dispara un flash.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = S30.camina(t, d, 1150, 700, { hasta: .45, alto: 430 * 1.5 * .95 });
      K.plano(ctx, t, d, { de: { x: 640, y: 900, z: 1.23 }, a: { x: 620, y: 860 }, T, mano: .5, paralaje: .55, fondo: () => D.fondo.estudio(ctx, T, {}) }, () => {
        ctx.strokeStyle = C.tinta; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(170, 60); ctx.lineTo(170, 380); ctx.stroke();
        D.foco(ctx, 170, 420, 1.1, { T, ang: .97, largo: 1000 });
        D.camaraCine(ctx, 250, 1240, 1.2, { T });
        if (c.paso !== null) S30.mujer(ctx, c.x, 1220, 1.5, { T, dir: -1, semilla: 12, paso: c.paso, cara: 'sonrisa' });
        else { const J = S30.mujer(ctx, c.x, 1220, 1.5, { T, dir: -1, semilla: 12, pose: 'saludar', cara: 'sonrisa' }); diamante(ctx, J.dedosD.x, J.dedosD.y - 30, 24, T); }
        const f = Math.max(0, 1 - Math.abs(t - d * .62) / .16);   // flash de la cámara
        if (f > 0) K.halo(ctx, 440, 1130, 700, '#fff3d6', .75 * f);
      });
      pastilla(ctx, 'HOLLYWOOD', 540, 290, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 9. 1947: la máquina de escribir. Empuje desde la mesa hasta la hoja mientras se teclea; golpe de cámara al terminar la frase.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.juntas(ctx, T, { hora: 'noche', semilla: 9 });
      ctx.save(); ctx.translate(K.golpe(t, d * .95, 10), 0);
      K.plano(ctx, t, d, { de: { x: 540, y: 1000, z: 1.35 }, a: { x: 540, y: 640 }, T, mano: .3 }, () => {
        D.mesaJuntas(ctx, 540, 1292, 1, { ancho: 960 });
        D.maquinaEscribir(ctx, 540, 1120, 1, { T, texto: 'A DIAMOND IS FOREVER', n: prog(t, d * .15, d * .95) });
      });
      ctx.restore();
      ano(ctx, '1947', t, 210, 80);
      S30.pelicula(ctx, T);
    },
    // 10. La frase: el diamante gira, motas ámbar suben y el texto entra con empuje.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T, .5);
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 640, luz: prog(t, 0, .6) + .4 });
      K.motas(ctx, T, { n: 90, color: C.oro, a: .7, vy: -40, tam: 5, semilla: 5 });
      K.plano(ctx, t, d, { de: { x: 540, y: 880, z: 1.16 }, a: { x: 540, y: 700 }, T }, () => {
        K.halo(ctx, lerp(200, 880, prog(t, 0, d)), 600, 380, C.oro, .22);   // la luz barre el fondo
        diamante(ctx, 540, lerp(900, 520, sale(prog(t, 0, d * .5))), 110, T, { gira: T * 2.2, oro: prog(t, d * .3, d * .9) });
        const a = prog(t, .15, .7), s = lerp(1.3, 1, sale(a));
        ctx.save(); ctx.globalAlpha = a; ctx.translate(540, lerp(1120, 860, sale(a))); ctx.scale(s, s);
        ctx.font = '700 104px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.oro;
        ctx.fillText('Un diamante', 0, -70); ctx.fillText('es para siempre', 0, 40);
        ctx.restore();
      });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
    // 11. Nunca lo vendas: el cajón se cierra, el candado cae con un golpe de cámara y la cámara se acerca.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.banco(ctx, T, {});
      const cierra = K.sale(prog(t, d * .2, d * .6)), cand = prog(t, d * .65, d * .8);
      ctx.save(); ctx.translate(0, K.golpe(t, d * .78, 18));
      K.plano(ctx, t, d, { de: { x: 540, y: 880, z: 1.27 }, a: { x: 540, y: 980 }, T, mano: .4 }, () => {
        D.cajon(ctx, 540, 1080, 1, { cierra, T });
        if (cand > 0) { ctx.save(); ctx.translate(540, lerp(640, 900, K.sale(cand))); ctx.scale(rebote(cand), rebote(cand)); D.candado(ctx, 0, 0, 1, {}); ctx.restore(); }
        pastilla(ctx, 'NUNCA LO VENDAS', 540, 420, prog(t, d * .3, d * .3 + .3), true);
      });
      ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 12. Si todos revendieran, el precio se derrumbaría: la gente llega en fila a la tienda "COMPRAMOS"; la cámara los sigue y la gráfica cae.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 420, y: 840, z: 1.27 }, a: { x: 700, y: 860 }, T, mano: .6, paralaje: .55, fondo: () => D.fondo.calle(ctx, T, { hora: 'atardecer' }) }, () => {
        D.fachada(ctx, 800, 1190, 1.25, { letrero: 'COMPRAMOS', ancho: 340, alto: 520 });
        D.grafica(ctx, 260, 560, .85, { tipo: 'linea', valores: [.9, .75, .5, .25, .08], progreso: prog(t, d * .45, d * .95), color: C.terracota });
        for (let i = 0; i < 6; i++) {
          const x = lerp(-80 - i * 150, 600 - i * 110, K.sale(prog(t, 0, d * .85))), y = 1190 + (i % 2) * 40;
          S30.hombre(ctx, x, y, .85, { T, semilla: 40 + i, paso: T * 1.6 + i * .7, cara: i % 2 ? 'sonrisa' : 'serio' });
        }
      });
      S30.pelicula(ctx, T);
    },
    // 13. Los dos sueldos: el anuncio de periódico de los años ochenta. Entra girando desde un lado, se asienta y la cámara se acerca al anillo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'tierra', y: 760 });
      const ent = K.sale(prog(t, 0, d * .35));
      K.plano(ctx, t, d, { de: { x: 540, y: 760, z: 1.07 }, a: { x: 540, y: 840 }, T, mano: .3 }, () => {
        ctx.save(); ctx.translate(lerp(1300, 540, ent), 760); ctx.rotate(lerp(.5, -.05, ent) + Math.sin(T) * .01);
        D.anuncio(ctx, 0, 0, 760, 860, { titular: '¿Dos meses de sueldo?', sub: ['Un precio pequeño', 'para algo que dura para siempre'], lineas: 5 });
        anillo(ctx, 0, 70, 2.6, T);
        ctx.restore();
      });
      ano(ctx, 'AÑOS 80', t, 170, 60);
      S30.pelicula(ctx, T);
    },
    // 14. La lección de Sombra: se inclina sobre el escritorio mientras Tito, abatido, baja la cabeza. La cámara se acerca a Tito.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      enOficina(ctx, t, d, T, { x: 540, y: 760, z: 1 }, { x: 540, y: 760 }, () => {
        S30.detective(ctx, 330, 1180, 1.2, Object.assign({ T, mira: .8, habla: 1 }, S30.actua(t, d, [[0, 'dePie'], [.35, 'explicar'], [.75, 'pensativo']])));
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 790, 1240, 1.3, Object.assign({ T, dir: -1, objeto: 'caja', mira: -.6, expresion: 'triste' }, S30.actua(t, d, [[0, 'traeObjeto'], [.5, 'triste']])));
      });
      S30.pelicula(ctx, T);
    },
    // 15. Cierre: azul noche con halo ámbar; el logo y la pregunta los pone la marca.
    (ctx, t, d, K, T) => {
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 660, luz: .9 });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
