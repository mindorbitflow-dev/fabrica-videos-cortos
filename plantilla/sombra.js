// Estilo "caricatura de los años 30" (blanco y negro, brazos de manguera, ojos de pastel cortado, película vieja) para la marca
// Sombra de Evidencia. Lo usan las escenas de autor como S30.* junto con K (kit.js). Todo depende solo del tiempo recibido.
window.S30 = (() => {
  const { W, H, TAU, clamp, lerp, hash, azar, alfa, sale } = K;
  const C = { tinta: '#0d0c0b', papel: '#efe7d6', medio: '#34302b', gris: '#8a8278', claro: '#cfc6b4', oro: '#D4B47A' };

  // ---- película ----
  // Vaivén del proyector: llamar al empezar la escena, antes de dibujar.
  function vaiven(ctx, T, fuerza = 1) {
    const p = Math.floor(T * 12);
    ctx.translate((hash(p) - .5) * 5 * fuerza, (hash(p + 3) - .5) * 7 * fuerza);
  }
  // Acabado de película vieja: tinte sepia, parpadeo, rayones, polvo, grano y viñeta. Llamar al final de cada escena.
  function pelicula(ctx, T, { fuerza = 1 } = {}) {
    const p = Math.floor(T * 12);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#f2e3c4'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${(.02 + hash(p + 7) * .08) * fuerza})`; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2; i++) {
      if (hash(p * 3 + i) < .45) continue;
      const x = hash(p * 5 + i) * W;
      ctx.strokeStyle = hash(p + i) < .5 ? 'rgba(255,250,235,.35)' : 'rgba(0,0,0,.4)';
      ctx.lineWidth = 1 + hash(p + i * 9) * 2.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (hash(p + i * 4) - .5) * 40, H); ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      if (hash(p * 7 + i) < .55) continue;
      const x = hash(p * 13 + i) * W, y = hash(p * 17 + i) * H, r = 1.5 + hash(p * 19 + i) * 6;
      ctx.fillStyle = hash(p + i * 2) < .6 ? 'rgba(0,0,0,.55)' : 'rgba(255,250,235,.55)';
      ctx.beginPath(); ctx.ellipse(x, y, r, r * (.35 + hash(i + p) * .6), hash(p + i) * 3, 0, TAU); ctx.fill();
    }
    K.acabado(ctx, T, { grano: .15 * fuerza, vineta: .78 });
    ctx.restore();
  }
  // Cierre de iris: con k de 0 a 1 el círculo se cierra sobre (x, y) y el resto queda negro.
  function iris(ctx, k, x = W / 2, y = 760) {
    if (k <= 0) return;
    const r = Math.max(0, lerp(Math.hypot(W, H), 0, K.sale(k)));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = C.tinta;
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x, y, r, 0, TAU); ctx.fill('evenodd');
    ctx.restore();
  }

  // ---- trazos ----
  // Brazo o pierna de manguera: curva gruesa de (x1, y1) a (x2, y2); `curva` empuja el centro hacia un lado.
  function manguera(ctx, x1, y1, x2, y2, curva, ancho, color = C.tinta) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, l = Math.hypot(x2 - x1, y2 - y1) || 1;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(mx - (y2 - y1) / l * curva, my + (x2 - x1) / l * curva, x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.lineCap = 'round'; ctx.stroke();
  }
  function relleno(ctx, color, borde = 6) {
    ctx.fillStyle = color; ctx.fill();
    if (borde) { ctx.strokeStyle = C.tinta; ctx.lineWidth = borde; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function guante(ctx, x, y, r, ang = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * .9, 0, 0, TAU); relleno(ctx, C.papel, 5);
    ctx.beginPath(); ctx.ellipse(-r * .7, -r * .55, r * .38, r * .28, -.6, 0, TAU); relleno(ctx, C.papel, 5);
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 3;
    for (const dx of [-.3, 0, .3]) { ctx.beginPath(); ctx.moveTo(dx * r, -r * .35); ctx.lineTo(dx * r, r * .15); ctx.stroke(); }
    ctx.restore();
  }
  // Ojo de pastel cortado: óvalo blanco con pupila negra a la que le falta una cuña. `abre` 0-1 (parpadeo), `mira` -1..1.
  function ojo(ctx, x, y, rx, ry, { abre = 1, mira = 0, miraY = 0 } = {}) {
    const h = Math.max(.08, abre);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, h);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); relleno(ctx, C.papel, 4);
    ctx.beginPath(); ctx.ellipse(mira * rx * .35, miraY * ry * .3 + ry * .15, rx * .55, ry * .62, 0, 0, TAU);
    ctx.fillStyle = C.tinta; ctx.fill();
    ctx.beginPath(); ctx.moveTo(mira * rx * .35, ry * .1); ctx.arc(mira * rx * .35, ry * .1, ry * .62, -1.25, -.75); ctx.closePath();
    ctx.fillStyle = C.papel; ctx.fill();
    ctx.restore();
  }

  // ---- el detective Sombra (mascota del canal: igual en todos los videos) ----
  // (x, y) = punto entre los pies, s = escala (1 ≈ 600 px de alto con sombrero), o:
  //   T, dir (1 mira a la derecha, -1 a la izquierda), paso (fase de caminata; null = quieto), corre (bool),
  //   lupa 0-1 (sube la lupa hasta el ojo: el ojo se ve gigante a través del lente), susto 0-1 (salta, se le levanta el sombrero),
  //   rasca 0-1 (se rasca la cabeza), mira -1..1 (pupilas), boca 'sonrisa' | 'o' | 'duda', parpadeo (bool, por defecto true).
  function detective(ctx, x, y, s, o = {}) {
    const { T = 0, dir = 1, paso = null, corre = false, lupa = 0, susto = 0, rasca = 0, mira = 0, boca = 'sonrisa', parpadeo = true } = o;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.beginPath(); ctx.ellipse(0, 4, 120, 16, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    const camina = paso !== null, fase = camina ? paso * Math.PI : 0;
    const rebote = camina ? -Math.abs(Math.sin(fase)) * (corre ? 30 : 18) : Math.sin(T * 2.2) * 4;
    ctx.translate(0, rebote - susto * 110);
    if (corre) ctx.rotate(.12);
    // piernas y zapatos
    const pie = k => camina ? Math.sin(fase + k * Math.PI) * (corre ? 80 : 55) : k ? 32 : -32;
    for (const k of [0, 1]) {
      const fx = pie(k), alza = camina ? Math.max(0, Math.cos(fase + k * Math.PI)) * (corre ? 40 : 22) : 0;
      manguera(ctx, k ? 30 : -30, -150, fx, -26 - alza, (k ? -1 : 1) * 14, 22);
      ctx.beginPath(); ctx.ellipse(fx + 22, -14 - alza, 46, 24, 0, 0, TAU); relleno(ctx, C.tinta, 0);
      ctx.beginPath(); ctx.ellipse(fx + 34, -22 - alza, 14, 7, -.3, 0, TAU); ctx.fillStyle = 'rgba(239,231,214,.55)'; ctx.fill();
    }
    // brazo de atrás
    const balanceo = camina ? Math.sin(fase) * 40 : Math.sin(T * 1.6) * 6;
    if (rasca > 0) {
      const rx = lerp(-60, -10, rasca), ry = lerp(-150, -520, rasca) + Math.sin(T * 18) * 8 * rasca;
      manguera(ctx, -58, -310, rx, ry, -40, 18);
      guante(ctx, rx, ry, 26, -.4);
    } else {
      manguera(ctx, -58, -310, -70 - balanceo, -170, 20, 18);
      guante(ctx, -70 - balanceo, -165, 26, .3);
    }
    // gabardina
    ctx.beginPath();
    ctx.moveTo(-62, -335); ctx.quadraticCurveTo(0, -352, 62, -335);
    ctx.lineTo(96, -150); ctx.quadraticCurveTo(0, -118, -96, -150); ctx.closePath();
    relleno(ctx, C.medio, 6);
    ctx.beginPath(); ctx.moveTo(-34, -338); ctx.lineTo(0, -262); ctx.lineTo(34, -338); ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = C.tinta; ctx.fillRect(-84, -212, 168, 18);
    ctx.fillStyle = C.oro; ctx.fillRect(-12, -214, 24, 22);
    for (const by of [-282, -240]) { ctx.beginPath(); ctx.arc(14, by, 7, 0, TAU); ctx.fillStyle = C.papel; ctx.fill(); }
    // cabeza
    const ab = parpadeo ? 1 - Math.pow(Math.max(0, Math.sin(T * 1.1 + .7)), 80) : 1;
    ctx.beginPath(); ctx.arc(0, -425, 90, 0, TAU); relleno(ctx, C.tinta, 0);
    ctx.beginPath(); ctx.ellipse(26, -405, 64, 60, 0, 0, TAU); ctx.fillStyle = C.papel; ctx.fill();
    ctx.beginPath(); ctx.ellipse(66, -388, 52, 38, 0, 0, TAU); ctx.fill();
    const grande = 1 + susto * .35;
    ojo(ctx, 22, -448, 15 * grande, 28 * grande, { abre: ab, mira });
    if (lupa < .6) ojo(ctx, 60, -448, 15 * grande, 28 * grande, { abre: ab, mira });
    ctx.beginPath(); ctx.ellipse(110, -406, 19, 14, 0, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill();
    ctx.beginPath(); ctx.ellipse(104, -411, 6, 4, -.4, 0, TAU); ctx.fillStyle = 'rgba(239,231,214,.7)'; ctx.fill();
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 5; ctx.lineCap = 'round';
    if (boca === 'o' || susto > .3) { ctx.beginPath(); ctx.ellipse(76, -366, 11, 15, 0, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill(); }
    else if (boca === 'duda') { ctx.beginPath(); ctx.moveTo(48, -370); ctx.quadraticCurveTo(62, -378, 74, -368); ctx.quadraticCurveTo(86, -360, 98, -370); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(44, -378); ctx.quadraticCurveTo(74, -350, 104, -380); ctx.stroke(); }
    // sombrero
    ctx.save(); ctx.translate(0, -susto * 90); ctx.rotate(-susto * .3);
    ctx.beginPath(); ctx.ellipse(8, -494, 122, 18, 0, 0, TAU); relleno(ctx, C.tinta, 0);
    ctx.beginPath(); ctx.moveTo(-74, -496); ctx.quadraticCurveTo(-78, -560, -60, -580); ctx.quadraticCurveTo(0, -556, 62, -580);
    ctx.quadraticCurveTo(82, -560, 80, -496); ctx.closePath(); relleno(ctx, C.tinta, 0);
    ctx.fillStyle = C.oro; ctx.fillRect(-76, -522, 156, 16);
    ctx.restore();
    // brazo de adelante (y la lupa)
    if (lupa > 0) {
      const k = K.suave(lupa), lx = lerp(150, 62, k), ly = lerp(-240, -448, k);
      const mx = lx + 46, my = ly + 60;
      manguera(ctx, 58, -310, mx, my, -30, 18);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(lx + 30, ly + 38); ctx.lineTo(mx, my); ctx.stroke();
      guante(ctx, mx, my, 26, -.5);
      ctx.beginPath(); ctx.arc(lx, ly, 48, 0, TAU); ctx.fillStyle = 'rgba(239,231,214,.25)'; ctx.fill();
      if (k > .6) {
        ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, 44, 0, TAU); ctx.clip();
        ctx.beginPath(); ctx.arc(lx, ly, 44, 0, TAU); ctx.fillStyle = C.papel; ctx.fill();
        ojo(ctx, lx, ly, 26, 40, { abre: ab, mira });
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(lx, ly, 48, 0, TAU); ctx.strokeStyle = C.oro; ctx.lineWidth = 11; ctx.stroke();
      ctx.beginPath(); ctx.arc(lx, ly, 48, 0, TAU); ctx.strokeStyle = C.tinta; ctx.lineWidth = 3; ctx.stroke();
    } else {
      manguera(ctx, 58, -310, 74 + balanceo, -170, -20, 18);
      guante(ctx, 74 + balanceo, -165, 26, -.3);
    }
    ctx.restore();
  }

  // ---- escenario ----
  function cielo(ctx, T, { estrellas = 40, semilla = 3 } = {}) {
    K.fondo(ctx, '#1b1916', '#050505', '#0f0e0c');
    const r = azar(semilla);
    for (let i = 0; i < estrellas; i++) {
      const x = r() * W, y = 200 + r() * 900, t = .5 + .5 * Math.sin(T * (1 + r() * 2) + i), s = (3 + r() * 6) * t;
      ctx.strokeStyle = `rgba(239,231,214,${.4 + .5 * t})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    }
  }
  // Luna con cara dormilona (abre un ojo si `curiosa` > 0).
  function luna(ctx, x, y, r, T, { curiosa = 0 } = {}) {
    K.halo(ctx, x, y, r * 2.4, '#efe7d6', .18);
    ctx.save(); ctx.translate(x, y + Math.sin(T * .8) * 6); ctx.rotate(Math.sin(T * .5) * .05);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); relleno(ctx, C.papel, 6);
    ctx.fillStyle = 'rgba(138,130,120,.35)';
    for (const [cx, cy, cr] of [[-.45, -.4, .16], [.4, .45, .12], [-.2, .55, .09]]) { ctx.beginPath(); ctx.arc(cx * r, cy * r, cr * r, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-r * .32, -r * .05, r * .14, .2, Math.PI - .2); ctx.stroke();
    if (curiosa > .5) ojo(ctx, r * .32, -r * .08, r * .1, r * .17, { mira: -.8 });
    else { ctx.beginPath(); ctx.arc(r * .32, -r * .05, r * .14, .2, Math.PI - .2); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, r * .3, r * .16, .3, Math.PI - .3); ctx.stroke();
    ctx.restore();
  }
  // Olas de caricatura: filas de rizos que suben y bajan, de `y` hacia abajo.
  function olas(ctx, y, T, { filas = 4, color = C.medio, espuma = C.papel } = {}) {
    for (let f = 0; f < filas; f++) {
      const yy = y + f * 70, ancho = 150 - f * 10, desp = (T * (30 + f * 12) + f * 60) % ancho;
      ctx.beginPath(); ctx.moveTo(-ancho, H);
      for (let x = -ancho - desp; x < W + ancho; x += ancho) {
        const b = Math.sin(T * 2 + x * .01 + f) * 8;
        ctx.lineTo(x, yy + b);
        ctx.quadraticCurveTo(x + ancho * .35, yy - 34 + b, x + ancho * .6, yy - 6 + b);
        ctx.quadraticCurveTo(x + ancho * .45, yy + 10 + b, x + ancho, yy + b);
      }
      ctx.lineTo(W + ancho, H); ctx.closePath();
      ctx.fillStyle = f % 2 || f === filas - 1 ? C.tinta : color; ctx.fill();
      ctx.strokeStyle = espuma; ctx.lineWidth = 4; ctx.stroke();
    }
  }
  // Niebla: bancos claros que derivan despacio.
  function niebla(ctx, T, { y = 900, alto = 300, a = .22, semilla = 8 } = {}) {
    const r = azar(semilla);
    for (let i = 0; i < 7; i++) {
      const x = ((r() * 1600 + T * (12 + r() * 20)) % 1600) - 300, yy = y + r() * alto, rx = 200 + r() * 200;
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, rx);
      g.addColorStop(0, `rgba(207,198,180,${a})`); g.addColorStop(1, 'rgba(207,198,180,0)');
      ctx.fillStyle = g; ctx.fillRect(x - rx, yy - rx, rx * 2, rx * 2);
    }
  }
  // Rótulo de la marca (Cinzel espaciada, dorada).
  function titulo(ctx, texto, x, y, { tam = 40, opacidad = 1, color = C.oro, alinea = 'center' } = {}) {
    K.rotulo(ctx, texto, x, y, { tam, opacidad, color, alinea, fuente: 'Cinzel, serif', peso: '600' });
  }

  // Extremidad blanca con contorno (conejo, personas).
  function mangueraBlanca(ctx, x1, y1, x2, y2, curva, ancho) {
    manguera(ctx, x1, y1, x2, y2, curva, ancho + 9, C.tinta);
    manguera(ctx, x1, y1, x2, y2, curva, ancho, C.papel);
  }

  // ---- Tito, el cerdito curioso (segundo personaje fijo del canal: siempre llega con la pregunta) ----
  // Gorra plana, camisa, tirantes y corbatín. (x, y) = entre los pies, s = escala (1 ≈ 440 px con gorra). o:
  //   T, dir, paso (fase de caminata o null), boca 'sonrisa' | 'o' | 'triste' | 'habla', orejas 0-1 (caídas = triste),
  //   mira -1..1, caja 0-1 (sostiene una cajita; >0 la abre y asoma un anillo), brazos 'abajo' | 'arriba' (sorpresa), susto 0-1,
  //   objeto: función (ctx) que dibuja lo que sostiene en las manos, con el origen entre ellas (un foco, una factura...).
  function tito(ctx, x, y, s, o = {}) {
    const { T = 0, dir = 1, paso = null, boca = 'sonrisa', orejas = 0, mira = 0, caja = null, brazos = 'abajo', susto = 0, objeto = null } = o;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.beginPath(); ctx.ellipse(0, 4, 104, 14, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    const camina = paso !== null, fase = camina ? paso * Math.PI : 0;
    ctx.translate(0, (camina ? -Math.abs(Math.sin(fase)) * 14 : Math.sin(T * 2.6) * 3) - susto * 70);
    for (const k of [0, 1]) {
      const fx = camina ? Math.sin(fase + k * Math.PI) * 40 : k ? 30 : -30;
      manguera(ctx, k ? 28 : -28, -100, fx, -26, (k ? -1 : 1) * 8, 24, C.medio);
      ctx.beginPath(); ctx.ellipse(fx + 14, -14, 34, 16, 0, 0, TAU); relleno(ctx, C.tinta, 0);
    }
    // colita en espiral
    ctx.beginPath(); for (let k = 0; k <= 24; k++) { const a = k * .5 + T * 3, rr = 4 + k * .9; ctx.lineTo(-84 - k * 1.2 + Math.cos(a) * rr * .4, -150 + Math.sin(a) * rr * .6); }
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.stroke();
    // cuerpo: barriga redonda, camisa clara, pantalón oscuro y tirantes
    ctx.beginPath(); ctx.ellipse(0, -170, 86, 96, 0, 0, TAU); relleno(ctx, C.papel, 6);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -170, 83, 93, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = C.medio; ctx.fillRect(-100, -140, 200, 80);
    ctx.fillStyle = C.tinta; ctx.fillRect(-48, -270, 18, 140); ctx.fillRect(30, -270, 18, 140);
    ctx.restore();
    for (const bx of [-39, 39]) { ctx.beginPath(); ctx.arc(bx, -136, 7, 0, TAU); ctx.fillStyle = C.oro; ctx.fill(); }
    ctx.fillStyle = C.tinta; ctx.beginPath(); ctx.moveTo(0, -252); ctx.lineTo(-22, -266); ctx.lineTo(-22, -238); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -252); ctx.lineTo(22, -266); ctx.lineTo(22, -238); ctx.closePath(); ctx.fill();
    // brazos
    const arriba = brazos === 'arriba' || susto > .3, sostiene = caja !== null || objeto;
    for (const k of [-1, 1]) {
      const [hx, hy] = sostiene ? [k * 24, -196] : arriba ? [k * 112, -340] : [k * 92 + Math.sin(T * 1.8 + k) * 4, -128];
      mangueraBlanca(ctx, k * 70, -226, hx, hy, k * (sostiene ? -26 : 16), 16);
      guante(ctx, hx, hy, 22, k * .3);
    }
    if (objeto) { ctx.save(); ctx.translate(0, -214); objeto(ctx); ctx.restore(); }
    if (caja !== null) {
      const ab = sale(caja);
      ctx.save(); ctx.translate(0, -212);
      K.redondo(ctx, -36, -10, 72, 44, 8); relleno(ctx, C.tinta, 0);
      ctx.save(); ctx.translate(-36, -10); ctx.rotate(-ab * 1.9); K.redondo(ctx, 0, -14, 72, 16, 6); relleno(ctx, '#1c1a17', 3); ctx.restore();
      if (ab > .2) {
        ctx.beginPath(); ctx.arc(0, -8, 16, 0, TAU); ctx.strokeStyle = C.oro; ctx.lineWidth = 6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-12, -26); ctx.lineTo(0, -40); ctx.lineTo(12, -26); ctx.lineTo(0, -14); ctx.closePath(); ctx.fillStyle = C.papel; ctx.fill();
        K.halo(ctx, 0, -28, 60, '#ffffff', .4 * ab);
      }
      ctx.restore();
    }
    // cabeza: orejitas, hocico y gorra plana
    const caida = orejas * .8;
    for (const k of [-1, 1]) {
      ctx.save(); ctx.translate(k * 44, -362); ctx.rotate(k * (.5 + caida) + Math.sin(T * 2 + k) * .05);
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(0, -46); ctx.lineTo(18, 0); ctx.closePath(); relleno(ctx, C.papel, 5);
      ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(0, -30); ctx.lineTo(8, -4); ctx.closePath(); ctx.fillStyle = C.claro; ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(0, -316, 76, 66, 0, 0, TAU); relleno(ctx, C.papel, 6);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(k * 48, -292, 13, 8, 0, 0, TAU); ctx.fillStyle = 'rgba(138,130,120,.35)'; ctx.fill(); }
    const ab = 1 - Math.pow(Math.max(0, Math.sin(T * 1.3 + 2)), 70), g = 1 + susto * .3;
    ojo(ctx, -24, -340, 13 * g, 22 * g, { abre: ab, mira, miraY: orejas * .5 });
    ojo(ctx, 24, -340, 13 * g, 22 * g, { abre: ab, mira, miraY: orejas * .5 });
    ctx.beginPath(); ctx.ellipse(0, -300, 30, 21, 0, 0, TAU); relleno(ctx, C.claro, 5);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(k * 10, -300, 5, 8, 0, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill(); }
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const habla = boca === 'habla' ? .5 + .5 * Math.sin(T * 14) : 0;
    if (boca === 'o' || susto > .3) { ctx.beginPath(); ctx.ellipse(0, -264, 9, 11 + habla * 4, 0, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill(); }
    else if (boca === 'triste') { ctx.beginPath(); ctx.moveTo(-20, -260); ctx.quadraticCurveTo(0, -274, 20, -260); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(-26, -274); ctx.quadraticCurveTo(0, -256 + habla * 8, 26, -274); ctx.stroke(); }
    ctx.save(); ctx.translate(0, -susto * 50); ctx.rotate(-.08 - susto * .2);
    ctx.beginPath(); ctx.moveTo(-74, -362); ctx.quadraticCurveTo(-70, -410, 0, -414); ctx.quadraticCurveTo(70, -412, 80, -368); ctx.closePath(); relleno(ctx, C.medio, 5);
    ctx.beginPath(); ctx.ellipse(56, -362, 50, 11, .1, 0, TAU); relleno(ctx, C.tinta, 0);
    ctx.beginPath(); ctx.arc(0, -414, 7, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // ---- gente de época (multitudes, banqueros, obreros): sombrero, traje y cara de caricatura ----
  // o: T, dir, semilla (varía bigote, cejas y altura), gesto 'quieto' | 'apreton' (brazo extendido) | 'senala', cara 'serio' | 'sonrisa'.
  function hombre(ctx, x, y, s, o = {}) {
    const { T = 0, dir = 1, semilla = 1, gesto = 'quieto', cara = 'serio' } = o;
    const r = azar(semilla), alto = .9 + r() * .2, bigote = r() < .5, gordo = r() < .35;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s * alto);
    ctx.translate(0, Math.sin(T * 2 + semilla) * 2);
    for (const k of [-1, 1]) { manguera(ctx, k * 22, -120, k * 26, -20, 0, 26); ctx.beginPath(); ctx.ellipse(k * 26 + 14, -12, 34, 15, 0, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill(); }
    const ancho = gordo ? 80 : 62;
    ctx.beginPath(); ctx.moveTo(-ancho + 8, -300); ctx.quadraticCurveTo(0, -318, ancho - 8, -300); ctx.lineTo(ancho, -110); ctx.lineTo(-ancho, -110); ctx.closePath(); relleno(ctx, C.medio, 6);
    ctx.strokeStyle = 'rgba(207,198,180,.18)'; ctx.lineWidth = 2;
    for (let lx = -ancho + 14; lx < ancho; lx += 16) { ctx.beginPath(); ctx.moveTo(lx, -296); ctx.lineTo(lx, -114); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-22, -304); ctx.lineTo(0, -236); ctx.lineTo(22, -304); ctx.closePath(); relleno(ctx, C.papel, 4);
    ctx.fillStyle = C.tinta; ctx.beginPath(); ctx.moveTo(-6, -296); ctx.lineTo(6, -296); ctx.lineTo(4, -246); ctx.lineTo(0, -238); ctx.lineTo(-4, -246); ctx.closePath(); ctx.fill();
    const extiende = gesto === 'apreton' ? [120, -200] : gesto === 'senala' ? [130, -300] : [ancho + 10, -130];
    manguera(ctx, -ancho + 10, -280, -ancho - 6, -130, 14, 20);
    guante(ctx, -ancho - 6, -126, 20, .2);
    manguera(ctx, ancho - 10, -280, extiende[0], extiende[1], -14, 20);
    guante(ctx, extiende[0], extiende[1], 20, -.3);
    ctx.beginPath(); ctx.ellipse(6, -360, 54, 58, 0, 0, TAU); relleno(ctx, C.papel, 6);
    ctx.beginPath(); ctx.ellipse(52, -350, 14, 18, 0, 0, TAU); relleno(ctx, C.papel, 5);
    ojo(ctx, 14, -370, 9, 16, { abre: 1 - Math.pow(Math.max(0, Math.sin(T * 1.2 + semilla)), 60), mira: .5 });
    ojo(ctx, 36, -370, 9, 16, { abre: 1 - Math.pow(Math.max(0, Math.sin(T * 1.2 + semilla)), 60), mira: .5 });
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(4, -394); ctx.lineTo(22, -388); ctx.moveTo(28, -388); ctx.lineTo(46, -394); ctx.stroke();
    if (bigote) { ctx.beginPath(); ctx.ellipse(40, -334, 22, 8, 0, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill(); }
    ctx.beginPath();
    if (cara === 'sonrisa') { ctx.moveTo(20, -324); ctx.quadraticCurveTo(38, -308, 56, -326); } else { ctx.moveTo(24, -320); ctx.lineTo(50, -322); }
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(8, -404, 82, 13, 0, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-46, -406); ctx.quadraticCurveTo(-48, -462, -30, -470); ctx.quadraticCurveTo(8, -452, 46, -470); ctx.quadraticCurveTo(62, -458, 60, -406); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b2824'; ctx.fillRect(-48, -428, 108, 12);
    ctx.restore();
  }

  // ---- escenario fijo: la oficina noir de Sombra (foco colgante, persianas, ciudad de noche, escritorio) ----
  // o: luz 0-1 (foco), escritorio (bool). Dibuja todo el fondo; los personajes van encima (el escritorio, si se pide, va con
  // `escritorio(ctx, T)` DESPUÉS del personaje que está detrás de él).
  function oficina(ctx, T, { luz = 1 } = {}) {
    ctx.fillStyle = '#2a2622'; ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3;
    for (let x = 0; x < W; x += 54) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    // ventana con la ciudad
    const vx = 600, vy = 330, vw = 400, vh = 560;
    ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
    K.fondo(ctx, '#151412', '#26231f');
    luna(ctx, vx + 300, vy + 110, 46, T);
    const r = azar(21);
    for (let i = 0; i < 9; i++) {
      const bx = vx - 20 + i * 52, bh = 160 + r() * 260;
      ctx.fillStyle = i % 2 ? '#0d0c0b' : '#151311'; ctx.fillRect(bx, vy + vh - bh, 50, bh);
      for (let wy = vy + vh - bh + 16; wy < vy + vh - 10; wy += 30) for (let wx = bx + 8; wx < bx + 44; wx += 16)
        if (r() < .3) { ctx.fillStyle = alfa(C.oro, .3 + .4 * Math.abs(Math.sin(T * .3 + wx + wy))); ctx.fillRect(wx, wy, 7, 11); }
    }
    ctx.fillStyle = 'rgba(13,12,11,.75)'; for (let y = vy; y < vy + vh; y += 34) ctx.fillRect(vx, y, vw, 10);
    ctx.restore();
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 20; ctx.strokeRect(vx, vy, vw, vh);
    ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(vx + vw / 2, vy); ctx.lineTo(vx + vw / 2, vy + vh); ctx.stroke();
    // sombra de las persianas sobre la pared
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(207,198,180,.035)';
    for (let i = 0; i < 9; i++) { const y = 360 + i * 64; ctx.beginPath(); ctx.moveTo(0, y + 120); ctx.lineTo(560, y); ctx.lineTo(560, y + 26); ctx.lineTo(0, y + 150); ctx.fill(); }
    ctx.restore();
    // estante
    ctx.fillStyle = '#1a1815'; ctx.fillRect(60, 420, 300, 16); ctx.fillRect(60, 600, 300, 16);
    const lr = azar(5);
    for (const sy of [420, 600]) { let bx = 72; while (bx < 340) { const bw = 18 + lr() * 18, bh = 70 + lr() * 60; ctx.fillStyle = lr() < .5 ? '#3a352f' : '#121110'; ctx.fillRect(bx, sy - bh, bw, bh); bx += bw + 4; } }
    // foco colgante y su cono de luz
    const bx = 540 + Math.sin(T * .9) * 10, by = 400;
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(540, 0); ctx.lineTo(bx, by - 40); ctx.stroke();
    if (luz > 0) {
      const g = ctx.createLinearGradient(0, by, 0, 1250);
      g.addColorStop(0, alfa(C.oro, .26 * luz)); g.addColorStop(1, alfa(C.oro, .03 * luz));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - 30, by); ctx.lineTo(bx + 30, by); ctx.lineTo(bx + 460, 1250); ctx.lineTo(bx - 460, 1250); ctx.fill();
      K.halo(ctx, bx, by, 170, C.oro, .55 * luz);
    }
    ctx.fillStyle = C.tinta; ctx.fillRect(bx - 16, by - 46, 32, 26);
    ctx.beginPath(); ctx.ellipse(bx, by, 30, 38, 0, 0, TAU); relleno(ctx, K.mezcla('#6f685f', '#f6dfa6', luz), 4);
    ctx.strokeStyle = alfa(C.tinta, .6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 8, by + 18); ctx.lineTo(bx - 8, by - 6); ctx.lineTo(bx + 8, by - 6); ctx.lineTo(bx + 8, by + 18); ctx.stroke();
    ctx.fillStyle = '#1d1a17'; ctx.fillRect(-40, 1250, W + 80, H);
  }
  function escritorio(ctx, T, { y = 1050 } = {}) {
    ctx.fillStyle = '#3d362f'; ctx.fillRect(-40, y, W + 80, 30);
    ctx.fillStyle = '#231f1b'; ctx.fillRect(-40, y + 30, W + 80, 240);
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(W + 40, y); ctx.moveTo(-40, y + 30); ctx.lineTo(W + 40, y + 30); ctx.stroke();
    ctx.save(); ctx.translate(250, y + 6); ctx.rotate(-.08); ctx.fillStyle = C.claro; ctx.fillRect(-90, -16, 180, 22); ctx.restore();
    ctx.save(); ctx.translate(800, y + 4); ctx.rotate(.05); ctx.fillStyle = '#5a1f1a'; ctx.fillRect(-80, -22, 160, 26); ctx.restore();
  }

  const listo = Promise.all(['600 40px Cinzel', '700 40px "Cormorant Garamond"'].map(f => document.fonts.load(f).catch(() => null)));
  return { C, vaiven, pelicula, iris, manguera, mangueraBlanca, relleno, guante, ojo, detective, tito, hombre, oficina, escritorio,
           cielo, luna, olas, niebla, titulo, listo };
})();
