// "El código de WhatsApp que te pide tu amiga" — Así te estafan (≈65 s). Marta (la víctima fija de la página) recibe un mensaje de una amiga.
// Todo con el motor de ilustración: gente (S30.mujer / S30.hombre), fondos y props (D = plantilla/decorados.js, incluido D.celular), luz cálida y grano.
(() => {
  const { W, H, TAU, clamp, lerp, prog, sale, rebote, hash, alfa } = K;
  const C = S30.C;
  const ROJO = '#C9584C';

  // ---- personajes fijos: Marta (siempre semilla 5) y el estafador (siempre semilla 23) ----
  const marta = (ctx, x, y, s, T, o = {}) => S30.mujer(ctx, x, y, s, Object.assign({ T, semilla: 5, dir: -1 }, o));
  const lucia = (ctx, x, y, s, T, o = {}) => S30.mujer(ctx, x, y, s, Object.assign({ T, semilla: 14, dir: 1 }, o));
  const estafador = (ctx, x, y, s, T, o = {}) => S30.hombre(ctx, x, y, s, Object.assign({ T, semilla: 23, variante: 'hombre', dir: 1, cara: 'sonrisa' }, o));

  // ---- piezas del tema ----
  const pastilla = (ctx, txt, x, y, a, rojo = false) =>
    K.pastilla(ctx, txt, x, y, { tam: 36, fondo: rojo ? ROJO : C.papel, color: rojo ? '#fff' : C.tinta, opacidad: a, escala: rebote(a) });
  const zoom = (ctx, t, d, cx, cy, z0, z1, fn) => K.camara(ctx, cx, cy, lerp(z0, z1, prog(t, 0, d)), fn);
  const flecha = (ctx, x0, y0, x1, y1, k, color = ROJO) => {   // flecha que avanza de (x0,y0) a (x1,y1) con k 0-1
    if (k <= 0) return;
    const x = lerp(x0, x1, k), y = lerp(y0, y1, k), a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
    ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-14, -26); ctx.lineTo(-14, 26); ctx.closePath(); ctx.fill(); ctx.restore();
  };
  const equis = (ctx, x, y, r, k) => {
    if (k <= 0) return;
    ctx.save(); ctx.strokeStyle = ROJO; ctx.lineWidth = 22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(lerp(x - r, x + r, clamp(k * 2)), lerp(y - r, y + r, clamp(k * 2))); ctx.stroke();
    if (k > .5) { ctx.beginPath(); ctx.moveTo(x + r, y - r); ctx.lineTo(lerp(x + r, x - r, clamp(k * 2 - 1)), lerp(y - r, y + r, clamp(k * 2 - 1))); ctx.stroke(); }
    ctx.restore();
  };
  const casa = (ctx, T) => D.fondo.abstracto(ctx, T, { tema: 'salvia', y: 760 });      // el cuarto de Marta
  const guarida = (ctx, T) => D.fondo.abstracto(ctx, T, { tema: 'noche', y: 820, luz: .8 });   // donde trabaja el estafador

  window.ESCENAS = [
    // 1. Gancho: el mensaje de Lucía con el código.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      casa(ctx, T);
      marta(ctx, 300, 1290, 1.25, T, { susto: .15 });
      D.celular(ctx, 745, 1200, 1.3, { T, tipo: 'mensaje', quien: 'Lucía', texto: ['Perdón, te llegó un código', 'por error. ¿Me lo pasas?'], k: prog(t, .2, .6) });
      S30.pelicula(ctx, T);
    },
    // 2. La duda: es su mejor amiga.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      casa(ctx, T);
      zoom(ctx, t, d, 540, 860, 1.05, 1.25, () => marta(ctx, 540, 1300, 1.5, T, { cara: 'sonrisa', gesto: 'senalar' }));
      pastilla(ctx, '¿SOLO UN NUMERITO?', 540, 470, prog(t, d * .25, d * .25 + .3));
      S30.pelicula(ctx, T);
    },
    // 3. El código lo mandó WhatsApp.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      casa(ctx, T);
      zoom(ctx, t, d, 540, 860, 1, 1.18, () => D.celular(ctx, 540, 1250, 1.5, { T, tipo: 'mensaje', quien: 'WhatsApp', texto: ['Tu código es 482 913', 'No lo compartas'], k: prog(t, .15, .5) }));
      pastilla(ctx, 'LO MANDÓ WHATSAPP', 540, 1340, prog(t, d * .4, d * .4 + .3));
      S30.pelicula(ctx, T);
    },
    // 4. Otro celular intenta abrir la cuenta de Marta.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'azul', y: 760 });
      D.celular(ctx, 270, 1210, 1.0, { T, tipo: 'mensaje', quien: 'Marta', texto: ['Tu cuenta', 'de WhatsApp'] });
      D.celular(ctx, 810, 1210, 1.0, { T, tipo: 'llamada', quien: 'Celular nuevo', texto: ['¿Quién es?', 'Cuenta de Marta'], alerta: prog(t, d * .5, d * .6) });
      flecha(ctx, 400, 960, 700, 960, prog(t, d * .15, d * .6));
      S30.pelicula(ctx, T);
    },
    // 5. El código es la llave: el candado.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'tierra', y: 760 });
      const a = prog(t, d * .15, d * .45), tiembla = Math.sin(T * 40) * 4 * clamp(1 - a);
      ctx.save(); ctx.translate(540 + tiembla, 0); D.candado(ctx, 0, 1150, 2.6, {}); ctx.restore();
      K.halo(ctx, 540, 900, 380, C.oro, .22 * a);
      pastilla(ctx, '482 913', 540, 1020, a, true);
      pastilla(ctx, 'EL CÓDIGO ES LA LLAVE', 540, 430, prog(t, d * .5, d * .5 + .3));
      S30.pelicula(ctx, T);
    },
    // 6. A Lucía ya le habían robado la cuenta: el estafador escribe desde su celular.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      guarida(ctx, T);
      lucia(ctx, 270, 1280, 1.15, T, { susto: .7 });
      estafador(ctx, 790, 1230, 1.1, T, { dir: -1 });
      D.celular(ctx, 560, 1240, .85, { T, tipo: 'mensaje', quien: 'Lucía', texto: ['Perdón, te llegó', 'un código'], k: prog(t, .2, .6) });
      pastilla(ctx, 'CUENTA ROBADA', 270, 520, prog(t, d * .3, d * .3 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 7. Confías en la persona, no en el mensaje.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      casa(ctx, T);
      zoom(ctx, t, d, 540, 860, 1, 1.12, () => {
        marta(ctx, 330, 1290, 1.3, T, { cara: 'sonrisa' });
        lucia(ctx, 760, 1290, 1.3, T, { dir: -1, cara: 'sonrisa' });
        K.halo(ctx, 545, 900, 200, C.oro, .22);
      });
      pastilla(ctx, 'CONFIANZA', 540, 460, prog(t, d * .25, d * .25 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 8. Marta manda el código: su cuenta se abre en otro celular.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      casa(ctx, T);
      marta(ctx, 290, 1290, 1.3, T, { susto: prog(t, d * .3, d * .55) });
      D.celular(ctx, 750, 1230, 1.35, { T, tipo: 'banco', quien: 'WhatsApp', texto: ['Tu cuenta se abrió', 'en otro celular'], k: prog(t, d * .3, d * .5), alerta: prog(t, d * .3, d * .5) });
      S30.pelicula(ctx, T);
    },
    // 9. Y ahí empieza lo peor: el estafador con el celular de Marta.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      guarida(ctx, T);
      zoom(ctx, t, d, 540, 900, 1.05, 1.25, () => {
        estafador(ctx, 420, 1280, 1.55, T, { dir: 1 });
        D.celular(ctx, 780, 1230, 1.0, { T, tipo: 'mensaje', quien: 'Marta', texto: ['Escribiendo…'] });
      });
      S30.pelicula(ctx, T);
    },
    // 10. «Préstame plata, es urgente» sale hacia sus contactos.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'azul', y: 700 });
      D.celular(ctx, 540, 960, 1.15, { T, tipo: 'mensaje', quien: 'Marta', texto: ['Préstame plata,', 'es urgente'], k: prog(t, .2, .6) });
      for (let i = 0; i < 4; i++) {
        const k = prog(t, d * .35 + i * .12, d * .35 + i * .12 + .5);
        S30.hombre(ctx, 150 + i * 260, 1330, .7, { T, semilla: 31 + i, dir: i < 2 ? 1 : -1, cara: 'sonrisa' });
        flecha(ctx, 540, 960, 150 + i * 260, 1020, k * .9, '#E0B060');
      }
      S30.pelicula(ctx, T);
    },
    // 11. Mamá, jefe, primo, amiga: todos creen que es Marta.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.calle(ctx, T, { hora: 'atardecer' });
      const quien = [['MAMÁ', 'anciano'], ['JEFE', 'hombre'], ['PRIMO', 'hombre'], ['AMIGA', 'mujer']];
      quien.forEach(([n, v], i) => {
        const x = 150 + i * 260, k = prog(t, d * .1 + i * d * .15, d * .1 + i * d * .15 + .35);
        S30.hombre(ctx, x, 1290, .95, { T, semilla: 41 + i, variante: v, dir: i < 2 ? 1 : -1, cara: 'sonrisa' });
        pastilla(ctx, n, x, 720, k, i === 0);
      });
      S30.pelicula(ctx, T);
    },
    // 12. Nadie necesita tu código: NUNCA.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'tierra', y: 760 });
      D.celular(ctx, 540, 1250, 1.5, { T, tipo: 'mensaje', quien: 'WhatsApp', texto: ['Tu código es 482 913', 'No lo compartas'] });
      equis(ctx, 540, 900, 190, prog(t, d * .3, d * .55));
      pastilla(ctx, 'NUNCA', 540, 450, prog(t, d * .5, d * .5 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 13. Llámala y pregúntale por voz.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      casa(ctx, T);
      marta(ctx, 300, 1290, 1.3, T, { cara: 'sonrisa', susto: 0 });
      D.celular(ctx, 760, 1230, 1.3, { T, tipo: 'llamada', quien: 'Lucía', texto: ['Llamando…'] });
      pastilla(ctx, 'LLÁMALA', 540, 470, prog(t, d * .25, d * .25 + .3));
      S30.pelicula(ctx, T);
    },
    // 14. Verificación en dos pasos: un PIN extra.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      casa(ctx, T);
      const puntos = Math.round(prog(t, .2, d * .7) * 6);
      zoom(ctx, t, d, 540, 860, 1, 1.12, () => {
        D.celular(ctx, 400, 1250, 1.5, { T, tipo: 'mensaje', quien: 'PIN', texto: [Array.from({ length: 6 }, (_, i) => i < puntos ? '●' : '○').join(' ')] });
        D.candado(ctx, 840, 1230, 1.3, {});
      });
      pastilla(ctx, 'DOS PASOS', 540, 460, prog(t, d * .5, d * .5 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 15. La regla: el código es solo tuyo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T, .5);
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 700, luz: prog(t, 0, .6) + .4 });
      const a = prog(t, .15, .7), s = lerp(1.15, 1, sale(a));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(540, 900); ctx.scale(s, s);
      ctx.font = '700 104px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.oro;
      ctx.fillText('El código', 0, -70); ctx.fillText('es solo tuyo', 0, 40);
      ctx.restore();
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
    // 16. Cierre: la pregunta la pone el sistema (y≈420-1000); Marta pequeña y abajo.
    (ctx, t, d, K, T) => {
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 660, luz: .9 });
      marta(ctx, 540, 1560, .55, T, { cara: 'sonrisa' });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
