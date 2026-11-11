// Estilo "caricatura de los años 30" (blanco y negro, brazos de manguera, ojos de pastel cortado, película vieja) para la marca
// Sombra de Evidencia. Lo usan las escenas de autor como S30.* junto con K (kit.js). Todo depende solo del tiempo recibido.
window.S30 = (() => {
  const { W, H, TAU, clamp, lerp, hash, azar } = K;
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

  const listo = Promise.all(['600 40px Cinzel', '700 40px "Cormorant Garamond"'].map(f => document.fonts.load(f).catch(() => null)));
  return { C, vaiven, pelicula, iris, manguera, relleno, guante, ojo, detective, cielo, luna, olas, niebla, titulo, listo };
})();
