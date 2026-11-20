// "Tu diamante es publicidad" — Sombra de Evidencia (versión corta, ~55 s). Tito llega con algo cotidiano y Sombra le revela su origen.
// Todo con el motor de ilustración: personajes y gente (S30.detective / S30.tito / S30.hombre), fondos y objetos (D = plantilla/decorados.js),
// luz cálida y grano del kit. Los flashbacks NO dibujan formas planas a mano: componen decorados (D.fondo.*) y props (D.vitrina, D.mina...).
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
  const zoom = (ctx, t, d, cx, cy, z0, z1, fn) => K.camara(ctx, cx, cy, lerp(z0, z1, prog(t, 0, d)), fn);
  // Estrella de cine: S30.mujer (motor nuevo) con el brazo en alto sosteniendo un diamante.
  function mujer(ctx, x, y, s, T) {
    const J = S30.mujer(ctx, x, y, s, { T, dir: -1, semilla: 12, pose: 'saludar', cara: 'sonrisa' });
    diamante(ctx, J.dedosD.x, J.dedosD.y - 26, 16, T);
  }
  function grilla(ctx, n, dorados, t, T, { cols = 5, x0 = 190, y0 = 520, paso = 175, r = 46, ritmo = .12, aro = false } = {}) {
    for (let i = 0; i < n; i++) {
      const x = x0 + (i % cols) * paso, y = y0 + Math.floor(i / cols) * paso * .82;
      const k = clamp((dorados - i) * 1) * clamp((t - .2 - i * ritmo) / .3);
      if (aro) anillo(ctx, x, y + 20, r / 46, T, { oro: k });
      else diamante(ctx, x, y, r, T, { oro: k, brillo: k });
    }
  }
  const oficinaCon = (ctx, T, fn) => { S30.oficina(ctx, T); fn(); };

  window.ESCENAS = [
    // 1. Tito abre la cajita: dos sueldos (la portada va abajo, y=860-1240: Tito arriba, como en la oficina).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      zoom(ctx, t, d, 540, 900, 1.05, 1.15, () => oficinaCon(ctx, T, () =>
        S30.tito(ctx, 560, 1250, 1.45, { T, dir: -1, caja: prog(t, d * .2, d * .5), boca: 'habla', mira: -.4 })));
      pastilla(ctx, '2 SUELDOS', 540, 440, prog(t, d * .45, d * .45 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 2. Sombra, detrás del escritorio: "la inventó De Beers".
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficinaCon(ctx, T, () => {
        S30.detective(ctx, 330, 1180, 1.02, { T, mira: .6, boca: 'sonrisa' });
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 820, 1240, .82, { T, dir: -1, caja: 1, mira: -.6, boca: 'o' });
      });
      S30.pelicula(ctx, T);
    },
    // 3. 1870, Sudáfrica: la mina gigante (mina a cielo abierto en terrazas + obreros del reparto).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.exterior(ctx, T, { tipo: 'mina', hora: 'dia' });
      zoom(ctx, t, d, 540, 820, 1, 1.15, () => {
        D.mina(ctx, 540, 760, 1, { T, niveles: 7 });
        for (let i = 0; i < 14; i++) {
          const a = hash(i) * TAU, nivel = Math.floor(hash(i + 3) * 6), rx = 470 - nivel * 58, ry = 230 - nivel * 30;
          const px = 540 + Math.cos(a) * rx * .92, py = 760 + nivel * 40 + Math.sin(a) * ry * .92 + 10;
          S30.hombre(ctx, px, py + 8, .16, { T, semilla: 60 + i, variante: 'hombre', dir: px < 540 ? 1 : -1, gesto: Math.sin(T * 5 + i) > .3 ? 'senala' : 'quieto' });
        }
      });
      ano(ctx, '1870 · SUDÁFRICA', t);
      S30.pelicula(ctx, T);
    },
    // 4. Nueve de cada diez diamantes: bandeja de terciopelo; nueve se vuelven ámbar.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'salvia', y: 700 });
      D.bandeja(ctx, 540, 730, 1, { ancho: 920, alto: 380 });
      grilla(ctx, 10, 9, t, T, { cols: 5, x0: 180, y0: 640, paso: 180, r: 58, ritmo: d * .06 });
      pastilla(ctx, '9 DE CADA 10', 540, 420, prog(t, d * .65, d * .65 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 5. Escasos en la vitrina, abundantes en la bodega.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.tienda(ctx, T, {});
      D.vitrina(ctx, 540, 830, 1, { T });
      K.halo(ctx, 540, 590, 260, C.oro, .22);
      pastilla(ctx, 'VITRINA', 540, 300, prog(t, .1, .4), true);
      D.estante(ctx, 540, 1200, 1, { baldas: 3 });
      const llena = prog(t, d * .4, d * .9);
      for (let f = 0; f < 3; f++) for (let i = 0; i < 14; i++) if ((f * 14 + i) / 42 < llena) diamante(ctx, 150 + i * 60, 1200 - 400 + (f + 1) * 400 / 3 - 12 - 22, 20, T, { brillo: 0 });
      pastilla(ctx, 'BODEGA', 540, 770, prog(t, d * .4, d * .4 + .3));
      S30.pelicula(ctx, T);
    },
    // 6. Tito interrumpe: "¿escasos?".
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficinaCon(ctx, T, () => {
        S30.detective(ctx, 290, 1180, 1.02, { T, mira: .7 });
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 790, 1240, 1.0, { T, dir: -1, caja: 1, boca: 'habla', mira: -.7 });
      });
      S30.pelicula(ctx, T);
    },
    // 7. La agencia de publicidad: sala de juntas, caballete con la idea y los publicistas detrás de la mesa.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.juntas(ctx, T, { hora: 'atardecer' });
      const dibuja = prog(t, d * .2, d * .8);
      D.pizarra(ctx, 540, 720, 1, { ancho: 380, alto: 270, dibuja: (c, w, h) => {
        c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w * dibuja, h); c.clip();
        c.beginPath(); c.moveTo(0, 90); c.bezierCurveTo(-130, 10, -120, -90, 0, -40); c.bezierCurveTo(120, -90, 130, 10, 0, 90);
        c.strokeStyle = C.terracota; c.lineWidth = 9; c.stroke(); D.joya(c, 0, 5, 34, { brillo: 0 }); c.restore(); } });
      for (let i = 0; i < 4; i++) S30.hombre(ctx, 200 + i * 230, 1180, .82, { T, semilla: 20 + i, dir: i < 2 ? 1 : -1, gesto: i === 1 ? 'senala' : 'quieto', cara: i === 2 ? 'sonrisa' : 'serio' });
      D.mesaJuntas(ctx, 540, 1250, 1, { T });
      pastilla(ctx, 'AGENCIA DE PUBLICIDAD', 540, 300, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 8. Joyas prestadas a estrellas de cine: plató con foco, cámara y la estrella.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.estudio(ctx, T, {});
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(170, 60); ctx.lineTo(170, 380); ctx.stroke();
      D.foco(ctx, 170, 420, 1.1, { T, ang: .97, largo: 1000 });
      D.camaraCine(ctx, 250, 1240, 1, { T });
      mujer(ctx, 720, 1200, 1.15, T);
      pastilla(ctx, 'HOLLYWOOD', 720, 340, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 9. 1947: la máquina de escribir sobre una mesa de despacho.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.juntas(ctx, T, { hora: 'noche', semilla: 9 });
      zoom(ctx, t, d, 540, 760, 1, 1.12, () => {
        D.mesaJuntas(ctx, 540, 1292, 1, { ancho: 960 });
        D.maquinaEscribir(ctx, 540, 1120, 1, { T, texto: 'A DIAMOND IS FOREVER', n: prog(t, d * .15, d * .95) });
      });
      ano(ctx, '1947', t, 210, 80);
      S30.pelicula(ctx, T);
    },
    // 10. La frase.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T, .5);
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 640, luz: prog(t, 0, .6) + .4 });
      diamante(ctx, 540, 520, 110, T, { gira: T * 1.4, oro: .15 });
      const a = prog(t, .15, .7), s = lerp(1.15, 1, sale(a));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(540, 860); ctx.scale(s, s);
      ctx.font = '700 104px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.oro;
      ctx.fillText('Un diamante', 0, -70); ctx.fillText('es para siempre', 0, 40);
      ctx.restore();
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
    // 11. Nunca lo vendas: el cajón con el anillo y el candado (sala del banco).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.banco(ctx, T, {});
      const cierra = sale(prog(t, d * .2, d * .6));
      D.cajon(ctx, 540, 1080, 1, { cierra, T });
      const cand = prog(t, d * .65, d * .8);
      if (cand > 0) { ctx.save(); ctx.translate(540, 900); ctx.scale(rebote(cand), rebote(cand)); D.candado(ctx, 0, 0, 1, {}); ctx.restore(); }
      pastilla(ctx, 'NUNCA LO VENDAS', 540, 420, prog(t, d * .3, d * .3 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 12. Si todos revendieran, el precio se derrumbaría: calle, tienda "COMPRAMOS", gente en fila y gráfica que cae.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.calle(ctx, T, { hora: 'atardecer' });
      D.fachada(ctx, 800, 1190, 1.25, { letrero: 'COMPRAMOS', ancho: 340, alto: 520 });
      D.grafica(ctx, 260, 560, .85, { tipo: 'linea', valores: [.9, .75, .5, .25, .08], progreso: prog(t, d * .45, d * .95), color: C.terracota });
      for (let i = 0; i < 6; i++) {
        const x = lerp(-80 - i * 120, 560 - i * 92, sale(prog(t, 0, d * .8))), y = 1180 + (i % 2) * 40;
        S30.hombre(ctx, x, y, .6, { T, semilla: 40 + i, paso: T * 1.6 + i * .7, cara: i % 2 ? 'sonrisa' : 'serio' });
      }
      S30.pelicula(ctx, T);
    },
    // 13. Los dos sueldos: el anuncio de periódico de los años ochenta.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'tierra', y: 760 });
      zoom(ctx, t, d, 540, 760, .95, 1.1, () => {
        ctx.save(); ctx.translate(540, 760); ctx.rotate(-.05 + Math.sin(T) * .01);
        D.anuncio(ctx, 0, 0, 760, 860, { titular: '¿Dos meses de sueldo?', sub: ['Un precio pequeño', 'para algo que dura para siempre'], lineas: 5 });
        anillo(ctx, 0, 70, 2.6, T);
        ctx.restore();
      });
      ano(ctx, 'AÑOS 80', t, 200, 60);
      S30.pelicula(ctx, T);
    },
    // 14. La lección de Sombra.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      zoom(ctx, t, d, 520, 860, 1.15, 1.35, () => oficinaCon(ctx, T, () => {
        S30.detective(ctx, 330, 1180, 1.02, { T, mira: .8, boca: 'sonrisa' });
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 790, 1240, 1.0, { T, dir: -1, caja: 1, boca: 'triste', orejas: prog(t, d * .4, d * .8), mira: -.6 });
      }));
      S30.pelicula(ctx, T);
    },
    // 15. Cierre: azul noche con halo ámbar; el logo y la pregunta los pone la marca.
    (ctx, t, d, K, T) => {
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 660, luz: .9 });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
