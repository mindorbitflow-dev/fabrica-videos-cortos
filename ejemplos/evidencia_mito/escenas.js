// "Los vikingos nunca usaron cascos con cuernos" — Sombra de Evidencia, serie MITO VS. EVIDENCIA (~50 s).
// Tito cree el mito, Sombra pide la evidencia, un flashback cuenta de dónde sale y el SELLO (D.sello) da el veredicto.
// Mismo vocabulario de movimiento que ejemplos/evidencia: cámara que viaja (K.plano), personajes grandes que actúan (S30.actua / S30.camina),
// un objeto que entra, crece o golpea (el casco con cuernos que crece, los carteles que llegan, el sello con K.golpe). El casco no existe como
// prop del kit: se define aquí con D.prop (caché) y D.F (formas con volumen y luz de borde) como pide la regla de "solo lo que no exista".
(() => {
  const { W, H, TAU, clamp, lerp, prog, sale, rebote, hash, azar, alfa } = K;
  const C = S30.C;

  const pastilla = (ctx, txt, x, y, a, oro = false) =>
    K.pastilla(ctx, txt, x, y, { tam: 36, fondo: oro ? C.oro : C.papel, color: C.tinta, opacidad: a, escala: rebote(a) });
  const ano = (ctx, txt, t, y = 210, tam = 72) => S30.titulo(ctx, txt, 540, y, { tam, opacidad: prog(t, .05, .4) });
  const enOficina = (ctx, t, d, T, de, a, fn, mano = .6) =>
    K.plano(ctx, t, d, { de, a, T, mano, paralaje: .7, fondo: () => S30.oficina(ctx, T) }, fn);
  const bez = (a, b, c, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]; });

  // Casco (x, y = centro de la base). o: cuernos 0-1 (cuánto han crecido), metal 'hierro' | 'bronce'.
  const casco = D.prop('casco', [-210, -270, 210, 110], (cx, s, o) => {
    const metal = o.metal === 'bronce' ? ['#b08a4a', '#8a6a34'] : ['#8a93a0', '#6f7682'], cu = o.cuernos || 0;
    if (cu > .02) for (const d of [-1, 1]) {
      const pts = bez([d * 92 * s, -30 * s], [d * (110 + 60 * cu) * s, -40 * s], [d * (100 + 78 * cu) * s, (-100 - 120 * cu) * s])
        .concat(bez([d * (100 + 78 * cu) * s, (-100 - 120 * cu) * s], [d * (70 + 30 * cu) * s, (-110 - 40 * cu) * s], [d * 96 * s, -100 * s]));
      D.F(cx, pts, '#e7dcc2', { semilla: 7 + (d > 0 ? 1 : 0), volumen: .8, borde: .8, textura: .3, irregular: .2 });
    }
    const dom = []; for (let i = 0; i <= 28; i++) { const a = Math.PI + i / 28 * Math.PI; dom.push([Math.cos(a) * 108 * s, Math.sin(a) * 128 * s - 6 * s]); }
    D.F(cx, dom, metal[0], { semilla: 3, volumen: .95, borde: .9, textura: .35, irregular: .25 });
    D.F(cx, [[-118 * s, -24 * s], [118 * s, -24 * s], [114 * s, 10 * s], [-114 * s, 10 * s]], metal[1], { semilla: 4, volumen: .8, borde: .9, irregular: .15 });
    D.F(cx, [[-15 * s, 10 * s], [15 * s, 10 * s], [10 * s, 46 * s], [-10 * s, 46 * s]], metal[1], { semilla: 5, volumen: .8, borde: .8, irregular: .15 });
    for (const px of [-80, -40, 0, 40, 80]) D.F(cx, [[(px - 6) * s, -18 * s], [(px + 6) * s, -18 * s], [(px + 6) * s, -6 * s], [(px - 6) * s, -6 * s]], '#e7dcc2', { semilla: 9, volumen: .6, borde: .5, irregular: 0 });
  });
  // Contorno punteado de dónde irían los cuernos (los que NO existen): a = 0-1 de opacidad.
  function fantasma(ctx, x, y, s, a) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = a; ctx.strokeStyle = C.terracota; ctx.lineWidth = 7; ctx.setLineDash([16, 12]); ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      const pts = bez([d * 92, -30], [d * 170, -40], [d * 178, -220]).concat(bez([d * 178, -220], [d * 100, -150], [d * 96, -100]));
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    }
    ctx.restore();
  }
  // Cortina de teatro a cada lado: k = 0 abierta, 1 cerrada.
  function cortinas(ctx, k) {
    const ancho = lerp(160, 560, k);
    for (const d of [-1, 1]) {
      const x0 = d < 0 ? -20 : W + 20 - ancho; ctx.save();
      const g = ctx.createLinearGradient(x0, 0, x0 + ancho, 0); g.addColorStop(0, alfa('#4a2a3a', 1)); g.addColorStop(.5, alfa('#6b3a4c', 1)); g.addColorStop(1, alfa('#3a2030', 1));
      ctx.fillStyle = g; ctx.fillRect(x0, -20, ancho + (d < 0 ? 20 : 0), 1320);
      ctx.strokeStyle = alfa('#2a1622', .55); ctx.lineWidth = 6;
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * ancho / 6, -20); ctx.lineTo(x0 + i * ancho / 6, 1300); ctx.stroke(); }
      ctx.restore();
    }
  }

  window.ESCENAS = [
    // 1. GANCHO. Tito entra caminando, se planta orgulloso y en su globo de pensamiento flota el casco con cuernos. Empuje de cámara.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = S30.camina(t, d, 80, 560, { hasta: .3, alto: 430 * 1.6 * .8 }), llega = c.paso === null;
      enOficina(ctx, t, d, T, { x: 540, y: 760, z: 1 }, { x: 540, y: 760 }, () => {
        S30.tito(ctx, c.x, 1290, 1.6, Object.assign({ T, dir: -1, boca: 'habla', expresion: 'alegre' }, llega ? S30.actua(t - d * .3, d * .7, [[0, 'asombrado'], [.7, 'asombrado']]) : { pose: 'camina', paso: c.paso }));
        const b = rebote(prog(t, d * .35, d * .55));   // globo de pensamiento
        if (b > 0) {
          ctx.save(); ctx.translate(760, 420 + Math.sin(T * 2) * 6); ctx.scale(b, b);
          ctx.fillStyle = alfa(C.papel, .95); ctx.beginPath(); ctx.ellipse(0, 0, 190, 150, 0, 0, TAU); ctx.fill();
          [[-150, 200, 26], [-200, 262, 16]].forEach(([px, py, r]) => { ctx.beginPath(); ctx.arc(px, py - 70, r, 0, TAU); ctx.fill(); });
          casco(ctx, 0, 40, .85, { cuernos: 1 });
          ctx.restore();
        }
      });
      S30.pelicula(ctx, T);
    },
    // 2. Sombra saca la lupa y examina la imagen del casco: "esa imagen tiene un autor"; Tito traga saliva. Cámara fija (la oficina no lleva zoom).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      enOficina(ctx, t, d, T, { x: 540, y: 760, z: 1 }, { x: 540, y: 760 }, () => {
        S30.detective(ctx, 330, 1180, 1.55, Object.assign({ T, mira: Math.sin(t * 2.2) * .6, habla: 1 }, S30.actua(t, d, [[0, 'dePie'], [.3, 'lupa'], [1, 'lupa']])));
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 820, 1240 - Math.abs(Math.sin(T * 4)) * 16, 1.2, { T, dir: -1, mira: -.6, boca: 'o' });
      });
      pastilla(ctx, 'EVIDENCIA', 540, 300, prog(t, d * .35, d * .35 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 3. Noruega, 1943: un arqueólogo señala el único casco vikingo casi completo. La cámara baja y se acerca al casco.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 540, y: 700, z: 1.3 }, a: { x: 640, y: 1000 }, T, mano: .6, paralaje: .5, fondo: () => D.fondo.exterior(ctx, T, { tipo: 'campo', hora: 'dia' }) }, () => {
        K.halo(ctx, 700, 1130, 320, C.oro, .22 * (.7 + .3 * Math.sin(T * 3)));
        casco(ctx, 700, 1170, 1.3, { cuernos: 0 });
        S30.hombre(ctx, 300, 1230, 1.0, { T, semilla: 31, variante: 'hombre', dir: 1, pose: 'senalar', cara: 'serio', habla: 1 });
      });
      ano(ctx, '1943 · NORUEGA', t);
      S30.pelicula(ctx, T);
    },
    // 4. Es redondo y no tiene cuernos: los cuernos fantasma aparecen punteados y se tachan. Paneo suave de un lado a otro.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 420, y: 760, z: 1.25 }, a: { x: 660, y: 780 }, T, mano: .5, paralaje: .4, fondo: () => D.fondo.abstracto(ctx, T, { tema: 'salvia', y: 700 }) }, () => {
        K.halo(ctx, 540, 720, 420, C.oro, .18);
        casco(ctx, 540, 840, 1.9, { cuernos: 0 });
        const f = prog(t, d * .25, d * .45) * (1 - prog(t, d * .7, d * .9) * .75);
        fantasma(ctx, 540, 840, 1.9, f);
        pastilla(ctx, '0 CUERNOS', 540, 330, prog(t, d * .6, d * .6 + .3), true);
      });
      S30.pelicula(ctx, T);
    },
    // 5. Tito interrumpe, indignado: da un salto al frente y señala; Sombra se sorprende. Cámara fija (la oficina no lleva zoom).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const salto = Math.max(0, Math.sin(clamp((t - .15) / .5) * Math.PI)) * 50;
      enOficina(ctx, t, d, T, { x: 540, y: 760, z: 1 }, { x: 540, y: 760 }, () => {
        S30.detective(ctx, 270, 1180, 1.4, Object.assign({ T, mira: .7 }, S30.actua(t, d, [[0, 'cruzado'], [.3, 'sorprendido'], [.8, 'cruzado']])));
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 800, 1240 - salto, 1.4, Object.assign({ T, dir: -1, boca: 'habla', mira: -.7, expresion: 'enfado' }, S30.actua(t, d, [[0, 'dePie'], [.25, 'asombrado'], [.6, 'senalar']])));
      }, 1);
      S30.pelicula(ctx, T);
    },
    // 6. El diseñador de vestuario señala su boceto del casco con cuernos, que se dibuja trazo a trazo en el caballete.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const dib = prog(t, d * .15, d * .75);
      K.plano(ctx, t, d, { de: { x: 360, y: 820, z: 1.3 }, a: { x: 640, y: 780 }, T, mano: .5, paralaje: .55, fondo: () => D.fondo.juntas(ctx, T, { hora: 'atardecer' }) }, () => {
        D.pizarra(ctx, 700, 900, 1.3, { ancho: 380, alto: 300, dibuja: (c, w, h) => {
          c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w * dib, h); c.clip();
          c.strokeStyle = C.tinta; c.lineWidth = 8; c.lineCap = 'round';
          c.beginPath(); c.arc(0, 30, 80, Math.PI, 0); c.lineTo(80, 60); c.lineTo(-80, 60); c.closePath(); c.stroke();
          for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 78, 20); c.quadraticCurveTo(s * 150, 10, s * 140, -90); c.quadraticCurveTo(s * 100, -40, s * 82, -30); c.stroke(); }
          c.restore(); } });
        S30.hombre(ctx, 330, 1240, 1.15, { T, semilla: 33, variante: 'hombre', dir: 1, pose: 'senalar', cara: 'sonrisa', habla: 1 });
      });
      pastilla(ctx, 'DISEÑADOR DE VESTUARIO', 540, 290, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 7. Bayreuth, 1876: escenario con cortinas abiertas, un foco y el casco con cuernos. Empuje hacia el casco.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 540, y: 860, z: 1.23 }, a: { x: 540, y: 800 }, T, mano: .4, paralaje: .5, fondo: () => D.fondo.estudio(ctx, T, {}) }, () => {
        cortinas(ctx, 0);
        D.foco(ctx, 540, 120, 1.2, { T, ang: Math.PI / 2, largo: 1000 });
        K.halo(ctx, 540, 900, 380, C.oro, .25);
        casco(ctx, 540, 1130, 1.5, { cuernos: 1 });
      });
      ano(ctx, 'BAYREUTH · 1876', t);
      S30.pelicula(ctx, T);
    },
    // 8. Para que se vieran imponentes: los cuernos CRECEN sobre el casco mientras la cámara retrocede.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const cu = sale(prog(t, d * .1, d * .8));
      K.plano(ctx, t, d, { de: { x: 540, y: 800, z: 1.33 }, a: { x: 540, y: 740 }, T, mano: .3, paralaje: .5, fondo: () => D.fondo.abstracto(ctx, T, { tema: 'ciruela', y: 640 }) }, () => {
        K.halo(ctx, 540, 760, 460, C.oro, .22);
        casco(ctx, 540, 900, 2.0, { cuernos: cu });
        pastilla(ctx, 'MÁS IMPONENTE', 540, 330, prog(t, d * .5, d * .5 + .3), true);
      });
      S30.pelicula(ctx, T);
    },
    // 9. Todos lo copian: carteles con el casco de cuernos llegan volando uno tras otro; la cámara sube.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 540, y: 1000, z: 1.1 }, a: { x: 540, y: 740 }, T, mano: .5, paralaje: .5, fondo: () => D.fondo.abstracto(ctx, T, { tema: 'tierra', y: 760 }) }, () => {
        const pos = [[300, 640, -.12], [760, 600, .1], [270, 1000, .08], [790, 980, -.09], [540, 820, 0], [540, 1180, .05]];
        pos.forEach(([px, py, giro], i) => {
          const e = sale(prog(t, i * d * .11, i * d * .11 + .5));
          if (e <= 0) return;
          const x = lerp(i % 2 ? 1400 : -400, px, e), y = lerp(py - 300, py, e);
          D.papel(ctx, x, y, 300, 380, { giro: giro + (1 - e) * (i % 2 ? .6 : -.6), titular: i % 2 ? 'ÓPERA' : 'CINE', lineas: 3 });
          casco(ctx, x, y + 40, .42, { cuernos: 1 });
        });
      });
      S30.pelicula(ctx, T);
    },
    // 10. VEREDICTO: el sello MITO cae sobre el casco con golpe de cámara.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 700, luz: .9 });
      const g = clamp((t - .25) / .7);
      ctx.save(); ctx.translate(K.golpe(t, .25 + .7 * .3, 16) * .6, K.golpe(t, .25 + .7 * .3, 22));
      K.plano(ctx, t, d, { de: { x: 540, y: 800, z: 1.1 }, a: { x: 540, y: 780 }, T }, () => {
        K.halo(ctx, 540, 740, 420, C.oro, .18);
        casco(ctx, 540, 860, 1.8, { cuernos: 1 });
        D.sello(ctx, 540, 760, 1.15, { texto: 'MITO', golpe: g, T });
      });
      ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 11. Sí hubo cascos con cuernos, hace 3.000 años y para ceremonias: línea de tiempo con un salto enorme hasta los vikingos. Paneo a la derecha.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 420, y: 760, z: 1.2 }, a: { x: 760, y: 780 }, T, mano: .4, paralaje: .4, fondo: () => D.fondo.abstracto(ctx, T, { tema: 'azul', y: 760 }) }, () => {
        const lin = prog(t, 0, d * .8);
        K.trazo(ctx, [[120, 1000], [lerp(120, 1010, lin), 1000]], alfa(C.papel, .8), 8);
        casco(ctx, 260, 900, 1.2, { cuernos: 1, metal: 'bronce' });
        pastilla(ctx, 'HACE 3.000 AÑOS', 260, 560, prog(t, d * .1, d * .1 + .3), true);
        pastilla(ctx, 'CEREMONIAS', 260, 1060, prog(t, d * .25, d * .25 + .3));
        casco(ctx, 880, 900, 1.2, { cuernos: 0 });
        pastilla(ctx, 'VIKINGOS', 880, 560, prog(t, d * .55, d * .55 + .3), true);
        pastilla(ctx, 'SIN CUERNOS', 880, 1060, prog(t, d * .7, d * .7 + .3));
      });
      S30.pelicula(ctx, T);
    },
    // 12. La leyenda la inventó un teatro: las cortinas se cierran sobre el casco; la cámara retrocede.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const cierra = sale(prog(t, d * .35, d * .85));
      ctx.save(); ctx.translate(0, K.golpe(t, d * .85, 12));
      K.plano(ctx, t, d, { de: { x: 540, y: 800, z: 1.25 }, a: { x: 540, y: 820 }, T, mano: .3, paralaje: .5, fondo: () => D.fondo.estudio(ctx, T, {}) }, () => {
        K.halo(ctx, 540, 900, 380, C.oro, .22 * (1 - cierra));
        casco(ctx, 540, 1130, 1.5, { cuernos: 1 });
        cortinas(ctx, cierra);
      });
      ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 13. La lección: Sombra explica y luego piensa; Tito baja la cabeza y el casco de juguete queda sobre el escritorio. Empuje hacia Tito.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      enOficina(ctx, t, d, T, { x: 540, y: 760, z: 1 }, { x: 540, y: 760 }, () => {
        S30.detective(ctx, 330, 1180, 1.2, Object.assign({ T, mira: .8, habla: 1 }, S30.actua(t, d, [[0, 'dePie'], [.35, 'explicar'], [.75, 'pensativo']])));
        S30.escritorio(ctx, T, { y: 960 });
        casco(ctx, 560, 972, .42, { cuernos: 1 });
        S30.tito(ctx, 800, 1240, 1.3, Object.assign({ T, dir: -1, mira: -.6, expresion: 'triste' }, S30.actua(t, d, [[0, 'dePie'], [.5, 'triste']])));
      });
      S30.pelicula(ctx, T);
    },
    // 14. Cierre: azul noche con halo ámbar; el logo y la pregunta los pone la marca.
    (ctx, t, d, K, T) => {
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 660, luz: .9 });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
