// "Los vikingos nunca usaron cascos con cuernos" — Sombra de Evidencia, serie MITO VS. EVIDENCIA (~100 s, 28 escenas).
// Tito apuesta su boina, Sombra pide la evidencia, un flashback cuenta de dónde sale el mito y el SELLO (D.sello) da el veredicto.
// Vocabulario de este ejemplo (es lo que el dibujante debe imitar):
//  - SIN zoom animado: el encuadre z es fijo en cada plano; el ritmo sale de CORTES entre planos fijos (K.corte), paneos con paralaje, un `frente`
//    que se mueve más que la acción (K.plano), personajes que ACTÚAN (S30.actua / S30.camina) y objetos que entran, crecen o golpean.
//  - La oficina de Sombra va SIEMPRE en cuadro completo (z = 1) y cámara fija; los "primeros planos" se hacen con la escala del personaje, no con zoom.
//  - ESCALA coherente: los objetos que comparten cuadro con un personaje respetan su proporción real (el casco mide ~0,17 de la altura de una persona); el
//    casco grande aparece solo en planos de DETALLE sin personajes.
//  - El casco no existe como prop del kit: se define aquí con D.prop (caché) y D.F (formas con volumen y luz de borde), como pide la regla.
(() => {
  const { W, H, TAU, clamp, lerp, prog, sale, rebote, hash, alfa } = K;
  const C = S30.C;

  // ---------------------------------------------------------------- ayudantes
  const pastilla = (ctx, txt, x, y, a, oro = false) =>
    K.pastilla(ctx, txt, x, y, { tam: 36, fondo: oro ? C.oro : C.papel, color: C.tinta, opacidad: a, escala: rebote(a) });
  const ano = (ctx, txt, t, y = 210, tam = 72) => S30.titulo(ctx, txt, 540, y, { tam, opacidad: prog(t, .05, .4) });
  const bez = (a, b, c, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]; });
  const FIJO = { x: 540, y: 760, z: 1 };
  // Oficina: cámara fija en cuadro completo. `frente` = primer plano opcional (se mueve más que la acción con la mano temblorosa).
  const oficina = (ctx, t, d, T, fn, frente = null) =>
    K.plano(ctx, t, d, { de: FIJO, a: FIJO, T, mano: .6, paralaje: .7, frente, fondo: () => S30.oficina(ctx, T) }, fn);
  // Marco oscuro de puerta / mueble en el borde del cuadro (primer plano que da profundidad).
  const marco = (lado = -1, ancho = 110, a = .88) => ctx => {
    const x0 = lado < 0 ? -60 : W + 60 - ancho, g = ctx.createLinearGradient(x0, 0, x0 + ancho, 0);
    g.addColorStop(lado < 0 ? 0 : 1, alfa(C.tinta, a)); g.addColorStop(lado < 0 ? 1 : 0, alfa(C.tinta, 0));
    ctx.fillStyle = g; ctx.fillRect(x0, -40, ancho + 60, H + 80);
  };
  const SOMBRA_Y = 1190, TITO_Y = 1250;   // pies detrás del escritorio / delante

  // Casco (x, y = centro de la base). o: cuernos 0-1, metal 'hierro' | 'bronce'. Mide ~420 px de ancho a s = 1: úsalo grande solo en planos de detalle.
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
  // Boina de Tito (la apuesta): (x, y) = centro de la base.
  const boina = D.prop('boina', [-80, -50, 80, 20], (cx, s) => {
    const dom = []; for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; dom.push([Math.cos(a) * 66 * s, Math.sin(a) * 36 * s]); }
    D.F(cx, dom, '#5a6f8a', { semilla: 21, volumen: .9, borde: .9, textura: .4, irregular: .3 });
    D.F(cx, [[-62 * s, -2 * s], [62 * s, -2 * s], [58 * s, 12 * s], [-58 * s, 12 * s]], '#2a2d3a', { semilla: 22, volumen: .7, borde: .8, irregular: .2 });
  });
  // Contorno punteado de dónde irían los cuernos (los que NO existen): a = 0-1 de opacidad.
  function fantasma(ctx, x, y, s, a, abre = 1) {
    if (a <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = a; ctx.strokeStyle = C.terracota; ctx.lineWidth = 7 / s; ctx.setLineDash([16, 12]); ctx.lineCap = 'round';
    for (const d of [-1, 1]) {
      const off = d * (1 - abre) * 420, pts = bez([d * 92 + off, -30], [d * 170 + off, -40], [d * 178 + off, -220]).concat(bez([d * 178 + off, -220], [d * 100 + off, -150], [d * 96 + off, -100]));
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
  // Plano de DETALLE de un objeto sobre un fondo abstracto (sin personajes): pan lento y capas.
  const detalle = (ctx, t, d, T, tema, de, a, fn, frente = null) =>
    K.plano(ctx, t, d, { de, a, T, mano: .4, paralaje: .4, frente, fondo: () => D.fondo.abstracto(ctx, T, { tema, y: 700 }) }, fn);

  window.ESCENAS = [
    // 1. GANCHO. Tito entra caminando con aire de campeón; en su globo de pensamiento, un casco con cuernos (pequeño: más chico que su cabeza).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = S30.camina(t, d, 40, 560, { hasta: .35, alto: 344 * 1.7 }), llega = c.paso === null;
      oficina(ctx, t, d, T, () => {
        S30.tito(ctx, c.x, TITO_Y + 20, 1.7, Object.assign({ T, yaw: lerp(1.2, -.2, sale(prog(t, d * .3, d * .5))), boca: 'habla', expresion: 'alegre' }, llega ? S30.actua(t - d * .35, d * .65, [[0, 'dePie'], [.15, 'asombrado'], [1, 'asombrado']]) : { pose: 'camina', paso: c.paso }));
        const b = rebote(prog(t, d * .4, d * .6));
        if (b > 0) {
          ctx.save(); ctx.translate(790, 470 + Math.sin(T * 2) * 6); ctx.scale(b, b);
          ctx.fillStyle = alfa(C.papel, .95); ctx.beginPath(); ctx.ellipse(0, 0, 150, 115, 0, 0, TAU); ctx.fill();
          [[-120, 150, 20], [-160, 200, 12]].forEach(([px, py, r]) => { ctx.beginPath(); ctx.arc(px, py - 60, r, 0, TAU); ctx.fill(); });
          casco(ctx, 0, 36, .5, { cuernos: 1 });
          ctx.restore();
        }
      }, marco(1));
      S30.pelicula(ctx, T);
    },
    // 2. Sombra acepta la apuesta con una sonrisa: se inclina y señala a Tito.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficina(ctx, t, d, T, () => {
        S30.detective(ctx, 420, SOMBRA_Y, 1.55, Object.assign({ T, yaw: .75, mira: .5, habla: 1, boca: 'sonrisa' }, S30.actua(t, d, [[0, 'dePie'], [.35, 'explicar'], [.75, 'senalar']])));
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 880, TITO_Y, 1.15, { T, yaw: -.75, mira: -.6, boca: 'o' });
      }, marco(-1));
      S30.pelicula(ctx, T);
    },
    // 3. "Yo pido evidencia": corte de plano (Sombra) a contraplano (Tito traga saliva). Dos encuadres fijos.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .55]);
      if (c.i === 0) oficina(ctx, c.t, c.d, T, () => {
        S30.detective(ctx, 540, SOMBRA_Y, 2.1, Object.assign({ T, yaw: .2, mira: .1, habla: 1 }, S30.actua(c.t, c.d, [[0, 'cruzado'], [.5, 'dePie']])));
        S30.escritorio(ctx, T, { y: 960 });
      });
      else oficina(ctx, c.t, c.d, T, () => {
        S30.tito(ctx, 540, TITO_Y + 30, 2.1, { T, yaw: -.25, mira: .2, expresion: 'duda', susto: Math.max(0, Math.sin(c.t * 4)) * .3 });
      }, marco(1));
      pastilla(ctx, 'EVIDENCIA', 540, 300, prog(t, d * .1, d * .1 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 4. Noruega: un arqueólogo señala el casco en el suelo (a su tamaño real) mientras la cámara recorre el campo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 400, y: 800, z: 1.1 }, a: { x: 640, y: 820 }, T, mano: .6, paralaje: .5,
        fondo: () => D.fondo.exterior(ctx, T, { tipo: 'campo', hora: 'dia' }),
        frente: ctx2 => { for (let i = 0; i < 7; i++) { const x = (i * 210 + 40) % 1500 - 200; ctx2.fillStyle = alfa('#3a4a30', .85); ctx2.beginPath(); ctx2.ellipse(x, 1300 + (i % 3) * 30, 70 + (i % 4) * 14, 28, 0, 0, TAU); ctx2.fill(); } } }, () => {
        K.halo(ctx, 760, 1240, 180, C.oro, .25 * (.7 + .3 * Math.sin(T * 3)));
        casco(ctx, 760, 1250, .62, { cuernos: 0 });
        S30.hombre(ctx, 400, 1260, 1.35, { T, semilla: 31, variante: 'hombre', dir: 1, pose: 'senalar', cara: 'serio', habla: 1 });
      });
      ano(ctx, 'NORUEGA', t);
      S30.pelicula(ctx, T);
    },
    // 5. DETALLE: el casco en el museo, con una luz que lo recorre (sin personajes: aquí sí puede verse grande).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      detalle(ctx, t, d, T, 'salvia', { x: 640, y: 780, z: 1 }, { x: 440, y: 780 }, () => {
        K.halo(ctx, lerp(300, 780, prog(t, 0, d)), 760, 360, C.oro, .22);
        casco(ctx, 540, 900, 2.0, { cuernos: 0 });
        pastilla(ctx, 'MUSEO', 540, 330, prog(t, d * .3, d * .3 + .3), true);
      });
      S30.pelicula(ctx, T);
    },
    // 5b. Tito se planta de brazos cruzados: "un solo casco no prueba nada". Plano medio con Sombra detrás del escritorio; Tito patalea y gira la cabeza.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficina(ctx, t, d, T, () => {
        S30.detective(ctx, 300, SOMBRA_Y, 1.5, Object.assign({ T, yaw: .75, mira: .7, boca: 'sonrisa' }, S30.actua(t, d, [[0, 'cruzado'], [.6, 'dePie']])));
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 800, TITO_Y - Math.abs(Math.sin(T * 6)) * 30, 1.7, Object.assign({ T, yaw: -.75, boca: 'habla', mira: -.8, expresion: 'enfado' }, S30.actua(t, d, [[0, 'dePie'], [.3, 'senalar'], [.8, 'dePie']])));
        K.halo(ctx, 800, 700, 520 * sale(prog(t, d * .3, d * .5)), C.terracota, .22);
      }, marco(1));
      pastilla(ctx, 'UN SOLO CASCO', 540, 300, prog(t, d * .25, d * .25 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 6. DETALLE: la rejilla para los ojos y el metal redondo, señalados con líneas; una luz recorre el casco.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      detalle(ctx, t, d, T, 'azul', { x: 540, y: 780, z: 1 }, { x: 540, y: 780 }, () => {
        K.halo(ctx, lerp(900, 180, prog(t, 0, d)), 800, 340, C.oro, .26);
        casco(ctx, lerp(150, 540, sale(prog(t, 0, d * .35))), 900, 2.0, { cuernos: 0 });
        K.rotulo(ctx, 'METAL REDONDO', 540, 470, { a: [540, 640], opacidad: prog(t, d * .2, d * .4), tam: 40, alinea: 'center' });
        K.rotulo(ctx, 'PROTECTOR DE OJOS', 540, 1130, { a: [540, 1000], opacidad: prog(t, d * .5, d * .7), tam: 40, alinea: 'center' });
      });
      S30.pelicula(ctx, T);
    },
    // 7. "¿Cuernos?": los cuernos fantasma aparecen punteados sobre el casco; signo de pregunta que late.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      detalle(ctx, t, d, T, 'noche', { x: 540, y: 780, z: 1 }, { x: 540, y: 740 }, () => {
        casco(ctx, 540, 940, 1.9, { cuernos: 0 });
        fantasma(ctx, 540, 940, 1.9, Math.min(1, prog(t, 0, d * .15) * 3), sale(prog(t, 0, d * .5)));
        const s = rebote(prog(t, d * .4, d * .7)) * (1 + .08 * Math.sin(T * 8));
        ctx.save(); ctx.translate(540, 430); ctx.scale(s, s); ctx.font = '700 220px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.fillStyle = alfa(C.oro, 1); ctx.fillText('?', 0, 0); ctx.restore();
      });
      S30.pelicula(ctx, T);
    },
    // 8. "Ni uno.": los cuernos fantasma se tachan con un golpe y el rótulo cae.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      ctx.save(); ctx.translate(K.golpe(t, d * .45, 26), K.golpe(t, d * .45, 14));
      detalle(ctx, t, d, T, 'noche', { x: 540, y: 740, z: 1 }, { x: 540, y: 820 }, () => {
        K.halo(ctx, 540, 800, 700, C.terracota, .35 * Math.max(0, 1 - Math.abs(t - d * .45) / .25));
        casco(ctx, 540, 940, 1.9, { cuernos: 0 });
        fantasma(ctx, 540, 940, 1.9, 1 - prog(t, d * .35, d * .6) * .8);
        const x = prog(t, d * .2, d * .45);
        ctx.strokeStyle = C.terracota; ctx.lineWidth = 22; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(160, 420); ctx.lineTo(lerp(160, 920, x), lerp(420, 880, x)); ctx.moveTo(920, 420); ctx.lineTo(lerp(920, 160, x), lerp(420, 880, x)); ctx.stroke();
        pastilla(ctx, '0 CUERNOS', 540, 300, prog(t, d * .45, d * .45 + .3), true);
      });
      ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 9. Los cascos de verdad: a la izquierda uno sencillo con una marca de visto; a la derecha uno con cuernos tachado. Paneo lateral.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      detalle(ctx, t, d, T, 'salvia', { x: 340, y: 780, z: 1 }, { x: 740, y: 780 }, () => {
        casco(ctx, 380, 900, 1.5, { cuernos: 0 }); pastilla(ctx, 'PROTEGER', 380, 560, prog(t, d * .15, d * .15 + .3), true);
        casco(ctx, 880, 900, 1.5, { cuernos: 1 }); pastilla(ctx, 'LUCIR', 880, 520, prog(t, d * .5, d * .5 + .3));
        const x = prog(t, d * .65, d * .85);
        ctx.strokeStyle = alfa(C.terracota, .95); ctx.lineWidth = 20; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(660, 460); ctx.lineTo(lerp(660, 1100, x), lerp(460, 940, x)); ctx.stroke();
      });
      S30.pelicula(ctx, T);
    },
    // 10. Tito protesta, indignado: salta al frente y señala; Sombra, de brazos cruzados, ni se inmuta. Corte al final a Sombra.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .7]), salto = Math.max(0, Math.sin(clamp((t - .15) / .5) * Math.PI)) * 60;
      oficina(ctx, c.t, c.d, T, () => {
        if (c.i === 0) {
          S30.detective(ctx, 300, SOMBRA_Y, 1.5, { T, yaw: .75, mira: .7, pose: 'cruzado' });
          S30.escritorio(ctx, T, { y: 960 });
          S30.tito(ctx, 800, TITO_Y - salto, 1.7, Object.assign({ T, yaw: -.75, boca: 'habla', mira: -.7, expresion: 'enfado' }, S30.actua(t, d * .7, [[0, 'dePie'], [.25, 'asombrado'], [.6, 'senalar']])));
        } else {
          S30.detective(ctx, 540, SOMBRA_Y, 2.0, { T, yaw: .2, mira: .2, pose: 'cruzado', boca: 'sonrisa' });
          S30.escritorio(ctx, T, { y: 960 });
        }
      });
      S30.pelicula(ctx, T);
    },
    // 11. "Décadas de excavaciones": cantera con obreros cavando (tamaño legible) y un pozo vacío; paneo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 360, y: 820, z: 1.15 }, a: { x: 720, y: 800 }, T, mano: .5, paralaje: .5, fondo: () => D.fondo.exterior(ctx, T, { tipo: 'cantera', hora: 'atardecer' }),
        frente: ctx2 => { for (let i = 0; i < 5; i++) { ctx2.fillStyle = alfa('#2a2a30', .8); ctx2.beginPath(); ctx2.ellipse(120 + i * 300, 1340, 90, 36, 0, 0, TAU); ctx2.fill(); } } }, () => {
        for (let i = 0; i < 4; i++) S30.hombre(ctx, 260 + i * 240, 1230 - (i % 2) * 40, 1.0 + (i % 2) * .15, { T, semilla: 50 + i, variante: i === 2 ? 'mujer' : 'hombre', dir: i % 2 ? -1 : 1, pose: i % 2 ? 'senalar' : 'dePie', cara: 'serio' });
      });
      ano(ctx, 'DÉCADAS DE EXCAVACIONES', t, 230, 54);
      S30.pelicula(ctx, T);
    },
    // 12. Tito, sudando, en primer plano (escala grande, sin zoom); gotas de sudor que caen.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficina(ctx, t, d, T, () => {
        S30.tito(ctx, 540, TITO_Y + 40, 2.2, Object.assign({ T, yaw: -.25, mira: .3, habla: 1, expresion: 'susto' }, S30.actua(t, d, [[0, 'dePie'], [.4, 'asombrado'], [.8, 'triste']])));
        for (let i = 0; i < 3; i++) { const k = (T * .8 + i * .33) % 1; ctx.fillStyle = alfa('#bcd4ec', .8 * (1 - k)); ctx.beginPath(); ctx.ellipse(400 + i * 130, 600 + k * 190, 9, 15, 0, 0, TAU); ctx.fill(); }
      }, marco(-1));
      S30.pelicula(ctx, T);
    },
    // 13. Sombra, tranquilo: "Exacto. Y ahí empieza la verdadera historia."; se vuelve y sonríe. Plano medio con la lámpara de frente.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficina(ctx, t, d, T, () => {
        S30.detective(ctx, 640, SOMBRA_Y, 1.9, Object.assign({ T, yaw: .2, mira: -.3, habla: 1, boca: 'sonrisa' }, S30.actua(t, d, [[0, 'cruzado'], [.4, 'explicar'], [.8, 'senalar']])));
        S30.escritorio(ctx, T, { y: 960 });
      }, marco(1));
      S30.pelicula(ctx, T);
    },
    // 14. "Un cuerno es un asa para tu enemigo": una mano (a tamaño real) agarra el cuerno del casco; el casco se sacude.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const agarra = sale(prog(t, d * .2, d * .5)), sacude = Math.sin(clamp((t - d * .5) / (d * .4)) * Math.PI * 4) * 9 * (1 - prog(t, d * .5, d * .9));
      detalle(ctx, t, d, T, 'tierra', { x: 640, y: 800, z: 1 }, { x: 460, y: 800 }, () => {
        ctx.save(); ctx.translate(sacude, 0); casco(ctx, 480, 1000, 1.7, { cuernos: 1 }); ctx.restore();
        S30.hombre(ctx, lerp(1300, 860, agarra), 1230, 1.9, { T, semilla: 44, variante: 'hombre', dir: -1, pose: 'senalar', cara: 'serio' });
        pastilla(ctx, 'UN ASA PARA EL ENEMIGO', 540, 320, prog(t, d * .5, d * .5 + .3), true);
      });
      S30.pelicula(ctx, T);
    },
    // 15. Taller del diseñador: frente a un caballete en blanco, se rasca la cabeza (pose pensativa en la gente: dePie + cabizbajo).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 700, y: 800, z: 1.1 }, a: { x: 420, y: 800 }, T, mano: .5, paralaje: .55, fondo: () => D.fondo.juntas(ctx, T, { hora: 'atardecer' }), frente: marco(1) }, () => {
        D.pizarra(ctx, 330, 900, 1.2, { ancho: 380, alto: 300, dibuja: () => {} });
        S30.hombre(ctx, 760, 1250, 1.6, Object.assign({ T, semilla: 33, variante: 'hombre', dir: -1, cara: 'serio' }, S30.actua(t, d, [[0, 'dePie'], [.4, 'cabizbajo'], [.8, 'manosBolsillos']])));
      });
      pastilla(ctx, 'DISEÑADOR DE VESTUARIO', 540, 290, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 16. Teatro: escenario con cortinas abiertas, foco y un cartel de la ópera que cae del techo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const cae = sale(prog(t, d * .15, d * .55));
      K.plano(ctx, t, d, { de: { x: 540, y: 860, z: 1.1 }, a: { x: 540, y: 860 }, T, mano: .4, paralaje: .5, fondo: () => D.fondo.estudio(ctx, T, {}) }, () => {
        cortinas(ctx, 0);
        D.foco(ctx, 540, 120, 1.2, { T, ang: Math.PI / 2, largo: 1000 });
        D.papel(ctx, 540, lerp(100, 860, cae), 420, 560, { giro: lerp(.3, 0, cae), titular: 'LA ÓPERA', sub: ['WAGNER', ''], lineas: 4 });
      });
      ano(ctx, 'BAYREUTH · 1876', t, 200, 60);
      S30.pelicula(ctx, T);
    },
    // 17. Desde el escenario hacia la platea: filas de gente (a escala legible) y, en primer plano, el borde de la cortina.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 640, y: 840, z: 1.05 }, a: { x: 440, y: 840 }, T, mano: .5, paralaje: .5, fondo: () => D.fondo.abstracto(ctx, T, { tema: 'ciruela', y: 640 }), frente: marco(-1, 220, .95) }, () => {
        for (let f = 0; f < 3; f++) for (let i = 0; i < 6; i++) {
          const x = 120 + i * 170 + (f % 2) * 85, y = 1130 + f * 90, s = .62 + f * .16;
          S30.hombre(ctx, x, y, s, { T, semilla: 70 + f * 7 + i, variante: (i + f) % 4 === 0 ? 'mujer' : 'hombre', dir: 1, pose: (i + f) % 3 === 0 ? 'saludar' : 'dePie', cara: 'sonrisa' });
        }
        casco(ctx, 540, 640, .5, { cuernos: 1 });
      });
      S30.pelicula(ctx, T);
    },
    // 18. Los cuernos CRECEN sobre el casco (plano de detalle).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const cu = sale(prog(t, d * .1, d * .8));
      detalle(ctx, t, d, T, 'ciruela', { x: 540, y: 780, z: 1 }, { x: 540, y: 740 }, () => {
        K.halo(ctx, 540, 760, 460, C.oro, .22);
        casco(ctx, 540, 940, 2.0, { cuernos: cu });
        pastilla(ctx, 'MÁS IMPONENTE', 540, 330, prog(t, d * .5, d * .5 + .3), true);
      });
      S30.pelicula(ctx, T);
    },
    // 19. Tito, boquiabierto: "¿Todo por un disfraz?". Primer plano por escala; corte a Sombra que asiente.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .62]);
      oficina(ctx, c.t, c.d, T, () => {
        if (c.i === 0) S30.tito(ctx, 540, TITO_Y + 40, 2.2, Object.assign({ T, yaw: -.25, mira: .3, habla: 1, expresion: 'asombro' }, S30.actua(c.t, c.d, [[0, 'dePie'], [.4, 'asombrado']])));
        else { S30.detective(ctx, 540, SOMBRA_Y, 2.0, { T, yaw: .2, mira: -.2, boca: 'sonrisa', pose: 'dePie' }); S30.escritorio(ctx, T, { y: 960 }); }
      }, c.i === 0 ? marco(1) : null);
      S30.pelicula(ctx, T);
    },
    // 20. Todo el mundo lo copia: carteles con el casco llegan volando uno tras otro; paneo hacia arriba.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 540, y: 1000, z: 1.1 }, a: { x: 540, y: 740 }, T, mano: .5, paralaje: .5, fondo: () => D.fondo.abstracto(ctx, T, { tema: 'tierra', y: 760 }) }, () => {
        const pos = [[300, 640, -.12], [760, 600, .1], [270, 1000, .08], [790, 980, -.09], [540, 820, 0], [540, 1180, .05]];
        pos.forEach(([px, py, giro], i) => {
          const e = sale(prog(t, i * d * .11, i * d * .11 + .5));
          if (e <= 0) return;
          const x = lerp(i % 2 ? 1400 : -400, px, e), y = lerp(py - 300, py, e);
          D.papel(ctx, x, y, 300, 380, { giro: giro + (1 - e) * (i % 2 ? .6 : -.6), titular: i % 2 ? 'ÓPERA' : 'CINE', lineas: 3 });
          casco(ctx, x, y + 60, .4, { cuernos: 1 });
        });
      });
      S30.pelicula(ctx, T);
    },
    // 21. "Desde entonces, todos imaginan así a los vikingos": libro y pantalla de cine; corte entre los dos.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .5]);
      if (c.i === 0) detalle(ctx, c.t, c.d, T, 'tierra', { x: 440, y: 780, z: 1.1 }, { x: 640, y: 780 }, () => {
        D.papel(ctx, 540, 820, 560, 700, { giro: -.04, titular: 'LOS VIKINGOS', lineas: 5, color: '#cdbf9e' });
        casco(ctx, 540, 960, .75, { cuernos: 1 });
      });
      else detalle(ctx, c.t, c.d, T, 'noche', { x: 640, y: 780, z: 1.1 }, { x: 440, y: 780 }, () => {
        D.camaraCine(ctx, 300, 1180, 1.4, { T });
        K.halo(ctx, 760, 760, 380, '#fff3d6', .22 + .06 * Math.sin(T * 9));
        D.papel(ctx, 760, 760, 420, 560, { titular: 'CINE', lineas: 0, color: '#d8d2c0' });
        casco(ctx, 760, 880, .6, { cuernos: 1 });
      });
      S30.pelicula(ctx, T);
    },
    // 21b. "Nadie lo corrigió, porque un mito cómodo se cuenta solo": Sombra explica y se encoge de hombros; en primer plano, el borde del escritorio.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficina(ctx, t, d, T, () => {
        S30.detective(ctx, 560, SOMBRA_Y, 1.9, Object.assign({ T, yaw: .2, mira: -.3, habla: 1, boca: 'sonrisa' }, S30.actua(t, d, [[0, 'dePie'], [.35, 'explicar'], [.75, 'cruzado']])));
        S30.escritorio(ctx, T, { y: 960 });
        const k = sale(prog(t, d * .1, d * .5));
        pastilla(ctx, 'NADIE LO CORRIGIÓ', 540, lerp(180, 330, k), prog(t, d * .1, d * .1 + .3), true);
      }, marco(-1));
      S30.pelicula(ctx, T);
    },
    // 22. "Todo nació en un teatro": las cortinas se cierran sobre el casco con un golpe final.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const cierra = sale(prog(t, d * .3, d * .85));
      ctx.save(); ctx.translate(0, K.golpe(t, d * .85, 12));
      K.plano(ctx, t, d, { de: { x: 540, y: 820, z: 1.05 }, a: { x: 540, y: 840 }, T, mano: .3, paralaje: .5, fondo: () => D.fondo.estudio(ctx, T, {}) }, () => {
        K.halo(ctx, 540, 900, 380, C.oro, .22 * (1 - cierra));
        casco(ctx, 540, 1130, .9, { cuernos: 1 });
        cortinas(ctx, cierra);
      });
      ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 23. VEREDICTO: el sello MITO cae sobre el casco con golpe de cámara.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 700, luz: .9 });
      const g = clamp((t - .25) / .7);
      ctx.save(); ctx.translate(K.golpe(t, .25 + .7 * .3, 16) * .6, K.golpe(t, .25 + .7 * .3, 22));
      K.plano(ctx, t, d, { de: { x: 540, y: 790, z: 1.05 }, a: { x: 540, y: 770 }, T }, () => {
        K.halo(ctx, 540, 740, 420, C.oro, .18);
        casco(ctx, 540, 880, 1.8, { cuernos: 1 });
        D.sello(ctx, 540, 760, 1.15, { texto: 'MITO', golpe: g, T });
      });
      ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 24. El matiz: cascos con cuernos sí hubo, siglos antes y para ceremonias. Línea de tiempo con paneo a la derecha.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      detalle(ctx, t, d, T, 'azul', { x: 420, y: 780, z: 1.15 }, { x: 760, y: 780 }, () => {
        const lin = prog(t, 0, d * .8);
        K.trazo(ctx, [[120, 1040], [lerp(120, 1010, lin), 1040]], alfa(C.papel, .8), 8);
        casco(ctx, 260, 940, 1.1, { cuernos: 1, metal: 'bronce' });
        pastilla(ctx, 'SIGLOS ANTES', 260, 560, prog(t, d * .1, d * .1 + .3), true);
        pastilla(ctx, 'CEREMONIAS', 260, 1100, prog(t, d * .25, d * .25 + .3));
        casco(ctx, 880, 940, 1.1, { cuernos: 0 });
        pastilla(ctx, 'VIKINGOS', 880, 560, prog(t, d * .55, d * .55 + .3), true);
        pastilla(ctx, 'SIN CUERNOS', 880, 1100, prog(t, d * .7, d * .7 + .3));
      });
      S30.pelicula(ctx, T);
    },
    // 25. Tito, derrotado, deja su boina sobre el escritorio (la apuesta); Sombra la recibe con una sonrisa.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const sube = sale(prog(t, d * .35, d * .75));
      oficina(ctx, t, d, T, () => {
        S30.detective(ctx, 330, SOMBRA_Y, 1.6, { T, yaw: .75, mira: .6, boca: 'sonrisa', pose: 'dePie' });
        S30.escritorio(ctx, T, { y: 960 });
        boina(ctx, lerp(760, 540, sube), lerp(900, 960, sube) - Math.sin(sube * Math.PI) * 120, 1.2);
        S30.tito(ctx, 820, TITO_Y, 1.55, Object.assign({ T, yaw: -.75, mira: -.5, expresion: 'triste' }, S30.actua(t, d, [[0, 'triste'], [.4, 'senalar'], [.8, 'triste']])));
      }, marco(-1));
      S30.pelicula(ctx, T);
    },
    // 26. La lección: Sombra explica y luego piensa; corte a Tito, que baja la mirada.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .65]);
      oficina(ctx, c.t, c.d, T, () => {
        if (c.i === 0) { S30.detective(ctx, 420, SOMBRA_Y, 1.9, Object.assign({ T, yaw: .2, mira: .8, habla: 1 }, S30.actua(c.t, c.d, [[0, 'dePie'], [.35, 'explicar'], [.8, 'pensativo']]))); S30.escritorio(ctx, T, { y: 960 }); }
        else S30.tito(ctx, 540, TITO_Y + 40, 2.2, { T, yaw: -.25, mira: -.4, expresion: 'triste' });
      }, c.i === 0 ? null : marco(1));
      S30.pelicula(ctx, T);
    },
    // 27. Sombra señala hacia el espectador: "¿qué otra cosa creías solo porque la viste en una película?". Cuadro completo, pose de señalar.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficina(ctx, t, d, T, () => {
        S30.detective(ctx, 560, SOMBRA_Y, 2.0, Object.assign({ T, yaw: .2, mira: .6, habla: 1, boca: 'sonrisa' }, S30.actua(t, d, [[0, 'dePie'], [.3, 'senalar'], [1, 'senalar']])));
        S30.escritorio(ctx, T, { y: 960 });
      }, marco(1));
      K.motas(ctx, T, { n: 80, color: C.oro, a: .7, vy: -45, tam: 5, semilla: 9 });
      K.halo(ctx, lerp(150, 930, prog(t, 0, d)), 700, 340, C.oro, .2);
      pastilla(ctx, '¿Y TÚ?', 800, 520, prog(t, d * .35, d * .35 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 28. Cierre: azul noche con halo ámbar; el logo y la pregunta los pone la marca.
    (ctx, t, d, K, T) => {
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 660, luz: .9 });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
