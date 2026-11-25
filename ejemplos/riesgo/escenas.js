// "Steve Jobs: lo echaron de Apple" — ¿Lo arriesgarías? (≈40 s, español e inglés con el mismo archivo). Silueta sin rostro, títulos gigantes con una palabra
// en rojo, pegatinas amarillas con el dato y fondos nocturnos. Los rótulos usan L(es, en): window.IDIOMA decide el idioma.
(() => {
  const { W, H, TAU, clamp, lerp, prog, sale, rebote, hash } = K;
  const C = S30.C;
  const ROJO = '#FF4B3E', AMARILLO = '#FFD23F', TINTA = '#1a1033';
  const L = (es, en) => (window.IDIOMA === 'en' ? en : es);

  // ---- el personaje: una silueta (misma semilla en todas las escenas) y los demás, siluetas más pequeñas ----
  const jobs = (ctx, x, y, s, T, o = {}) => S30.hombre(ctx, x, y, s, Object.assign({ T, semilla: 70, variante: 'hombre', silueta: true, dir: 1 }, o));
  const otro = (ctx, x, y, s, T, o = {}) => S30.hombre(ctx, x, y, s, Object.assign({ T, semilla: 71 + (o.n || 0), variante: o.variante || 'hombre', silueta: '#241c33', dir: -1 }, o));

  // ---- piezas de la página ----
  // Título gigante: líneas en mayúsculas, la de índice `rojo` en rojo; entra con rebote.
  const titular = (ctx, lineas, rojo, a, y = 330, tam = 104) => {
    if (a <= 0) return;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${tam}px ${K.TITULAR}`;
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    lineas.forEach((txt, i) => {
      const k = clamp(a * 1.4 - i * .25), s = lerp(1.15, 1, sale(k));
      ctx.save(); ctx.globalAlpha = k; ctx.translate(540, y + i * tam * 1.1); ctx.scale(s, s); ctx.fillStyle = i === rojo ? ROJO : '#fff'; ctx.fillText(txt, 0, 0); ctx.restore();
    });
    ctx.restore();
  };
  // Pegatina amarilla con el dato, ligeramente inclinada.
  const pegatina = (ctx, txt, x, y, a, giro = -.05) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(giro);
    K.pastilla(ctx, txt, 0, 0, { tam: 50, fondo: AMARILLO, color: TINTA, opacidad: a, escala: rebote(a) });
    ctx.restore();
  };
  const estrellas = (ctx, T, n = 60) => {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const x = hash(i * 1.7) * W, y = 120 + hash(i * 3.1) * 880, r = 1 + hash(i * 5.3) * 2.6;
      ctx.globalAlpha = .35 + .4 * (.5 + .5 * Math.sin(T * 1.8 + i)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  const noche = (ctx, T, tema = 'ciruela') => { D.fondo.abstracto(ctx, T, { tema, y: 760 }); estrellas(ctx, T); };
  const calle = (ctx, T) => D.fondo.calle(ctx, T, { hora: 'noche' });
  const flecha = (ctx, x0, y0, x1, y1, k, color = ROJO) => {
    if (k <= 0) return;
    const x = lerp(x0, x1, k), y = lerp(y0, y1, k), a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
    ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(-16, -30); ctx.lineTo(-16, 30); ctx.closePath(); ctx.fill(); ctx.restore();
  };

  window.ESCENAS = [
    // 1. Gancho: lo echaron de su propia empresa (se aleja del edificio).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const w = S30.camina(t, d, 700, 190, { desde: .1, hasta: .95, alto: 640 });
      K.plano(ctx, t, d, { de: { x: 640, y: 900, z: 1.1 }, a: { x: 450, y: 900 }, mano: 1, T, fondo: () => calle(ctx, T), paralaje: .5 }, () => {
        D.fachada(ctx, 830, 1255, 1.2, { ancho: 340, alto: 400, letrero: 'APPLE' });
        jobs(ctx, w.x, 1300, 1.35, T, { paso: w.paso, dir: -1, pose: 'cabizbajo' });
      });
      titular(ctx, L(['LO ECHARON', 'DE SU EMPRESA'], ['FIRED FROM', 'HIS OWN COMPANY']), 0, prog(t, .1, .55));
      S30.pelicula(ctx, T);
    },
    // 2. Tenía 30 años y la había cofundado.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 430, y: 900, z: 1.12 }, a: { x: 590, y: 900 }, mano: 1, T, fondo: () => calle(ctx, T), paralaje: .5 }, () => {
        D.fachada(ctx, 720, 1255, 1.2, { alto: 400, letrero: 'APPLE' });
        jobs(ctx, 330, 1300, 1.4, T, { ...S30.actua(t, d, [[0, 'dePie'], [.5, 'senalar']]) });
      });
      titular(ctx, L(['COFUNDÓ APPLE'], ['HE CO-FOUNDED APPLE']), 0, prog(t, .1, .5), 330, 96);
      pegatina(ctx, L('30 AÑOS', '30 YEARS OLD'), 540, 1100, prog(t, d * .35, d * .35 + .3));
      S30.pelicula(ctx, T);
    },
    // 3. 1985: lo apartan de todo (sala de juntas).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const w = S30.camina(t, d, 540, 1060, { desde: .35, hasta: .9, alto: 520 });
      K.plano(ctx, t, d, { de: { x: 400, y: 900, z: 1.12 }, a: { x: 620, y: 900 }, mano: 1, T, fondo: () => D.fondo.juntas(ctx, T, {}), paralaje: .5 }, () => {
        otro(ctx, 190, 1300, 1.25, T, { n: 1, pose: 'senalar', dir: 1 }); otro(ctx, 390, 1300, 1.3, T, { n: 2, pose: 'manosBolsillos', dir: 1 });
        jobs(ctx, w.x, 1300, 1.2, T, { paso: w.paso, dir: 1, pose: 'cabizbajo' });
      });
      titular(ctx, L(['1985', 'SIN PODER'], ['1985', 'POWERLESS']), 1, prog(t, .1, .5));
      S30.pelicula(ctx, T);
    },
    // 4. Otra empresa de computadoras que casi nadie compraba.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 640, y: 900, z: 1.12 }, a: { x: 450, y: 900 }, mano: 1, T, fondo: () => noche(ctx, T, 'noche'), paralaje: .4 }, () => {
        [[250, 1250, .9], [420, 1250, 1], [600, 1250, .95], [335, 1085, .9], [510, 1070, .95]].forEach(([x, y, s]) => D.caja(ctx, x, y, s, {}));
        D.grafica(ctx, 800, 960, .9, { valores: [.9, .7, .45, .2], progreso: prog(t, .2, d * .8), tipo: 'linea', color: ROJO });
        jobs(ctx, 910, 1300, 1.05, T, { pose: 'cabizbajo', dir: -1 });
      });
      titular(ctx, L(['NADIE LAS', 'COMPRABA'], ['NOBODY', 'WAS BUYING']), 0, prog(t, .1, .5));
      S30.pelicula(ctx, T);
    },
    // 5. Compró un pequeño estudio de animación: Pixar.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 470, y: 900, z: 1.1 }, a: { x: 610, y: 900 }, mano: 1, T, fondo: () => calle(ctx, T), paralaje: .5 }, () => {
        D.fachada(ctx, 740, 1255, 1.15, { letrero: 'PIXAR', color: '#7a6fa8', alto: 400 });
        D.camaraCine(ctx, 300, 1255, .8, {});
        jobs(ctx, 520, 1300, 1.35, T, { ...S30.actua(t, d, [[0, 'dePie'], [.55, 'senalar']]) });
      });
      titular(ctx, L(['COMPRÓ', 'PIXAR'], ['HE BOUGHT', 'PIXAR']), 1, prog(t, .1, .5));
      S30.pelicula(ctx, T);
    },
    // 6. Años poniendo su propio dinero.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'noche');
      D.fachada(ctx, 800, 1255, 1.15, { letrero: 'PIXAR', color: '#7a6fa8', alto: 400 });
      jobs(ctx, 230, 1300, 1.4, T, {});
      for (let i = 0; i < 5; i++) {   // billetes que viajan de su bolsillo al estudio
        const k = ((T * .6 + i * .2) % 1);
        D.billetes(ctx, lerp(300, 700, k), 1160 - Math.sin(k * Math.PI) * 220, .35, { n: 2 });
      }
      titular(ctx, L(['AÑOS', 'PERDIENDO'], ['YEARS OF', 'LOSSES']), 1, prog(t, .1, .5));
      pegatina(ctx, L('CON SU DINERO', 'HIS OWN MONEY'), 540, 1090, prog(t, d * .4, d * .4 + .3), .04);
      S30.pelicula(ctx, T);
    },
    // 7. GIRO: 1995, Toy Story (la luz pasa de fría a cálida).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const e = prog(t, 0, d * .55);
      noche(ctx, T, e > .5 ? 'tierra' : 'ciruela');
      K.halo(ctx, 540, 900, 260 + 760 * e, AMARILLO, .42 * (1 - .35 * e));
      D.papel(ctx, 540, 840, 640, 760, { lineas: 0, titular: 'TOY STORY', color: '#f1e3c0', giro: -.03 + e * .03 });
      jobs(ctx, 220, 1300, 1.2, T, { ...S30.actua(t, d, [[0, 'dePie'], [.5, 'saludar']]) });
      titular(ctx, L(['1995'], ['1995']), 0, prog(t, .05, .4), 330, 150);
      S30.pelicula(ctx, T);
    },
    // 8. GIRO: 1997, Apple casi quebrada le compra NeXT.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'ciruela');
      const k = prog(t, d * .35, d * .6);
      D.periodico(ctx, 540, 900, 600, 760, { titular: k < .5 ? L('APPLE EN CRISIS', 'APPLE IN CRISIS') : L('COMPRA NeXT', 'BUYS NeXT'), giro: -.04 + k * .08 });
      titular(ctx, L(['1997'], ['1997']), 0, prog(t, .05, .4), 330, 150);
      pegatina(ctx, L('CASI QUEBRADA', 'NEARLY BANKRUPT'), 540, 1150, prog(t, d * .15, d * .15 + .3), .04);
      S30.pelicula(ctx, T);
    },
    // 9. Vuelve a la empresa que lo echó.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const w = S30.camina(t, d, 130, 600, { desde: .1, hasta: .9, alto: 600 });
      K.plano(ctx, t, d, { de: { x: 430, y: 900, z: 1.1 }, a: { x: 590, y: 900 }, mano: 1, T, fondo: () => calle(ctx, T), paralaje: .5 }, () => {
        K.halo(ctx, 820, 1000, 560, AMARILLO, .25);
        D.fachada(ctx, 830, 1255, 1.2, { alto: 400, letrero: 'APPLE' });
        jobs(ctx, w.x, 1300, 1.4, T, { paso: w.paso, dir: 1 });
      });
      titular(ctx, L(['VOLVIÓ', 'A SALVARLA'], ['HE CAME BACK', 'TO SAVE IT']), 0, prog(t, .1, .5));
      S30.pelicula(ctx, T);
    },
    // 10. Años después, la empresa más valiosa del mundo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'ciruela');
      D.grafica(ctx, 540, 880, 1.6, { valores: [.12, .2, .3, .5, .75, 1], progreso: prog(t, .15, d * .85), tipo: 'barras' });
      titular(ctx, L(['LA MÁS', 'VALIOSA'], ['THE MOST', 'VALUABLE']), 0, prog(t, .1, .5));
      pegatina(ctx, L('Nº 1 DEL MUNDO', '#1 IN THE WORLD'), 540, 1190, prog(t, d * .6, d * .6 + .3), -.04);
      S30.pelicula(ctx, T);
    },
    // 11. Moraleja: la frase en grande.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T, .5);
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 700, luz: prog(t, 0, .6) + .4 });
      K.halo(ctx, 540, 860, 520 + 40 * Math.sin(T * 2.2), AMARILLO, .12 + .05 * Math.sin(T * 2.2));
      const lineas = L(['LO QUE PARECE', 'UN FINAL', 'PUEDE SER TU', 'MEJOR ENTRENAMIENTO'], ['WHAT LOOKS LIKE', 'AN ENDING', 'CAN BE YOUR', 'BEST TRAINING']);
      titular(ctx, lineas, 1, prog(t, .1, 1.2), 560, 92);
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
    // 12. Cierre: el reto lo pone el sistema (y≈420-1000); la silueta pequeña abajo.
    (ctx, t, d, K, T) => {
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 660, luz: .9 });
      estrellas(ctx, T, 40);
      jobs(ctx, 540, 1560, .55, T, {});
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
