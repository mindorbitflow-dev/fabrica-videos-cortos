// "El faro que se enciende solo" — caso de ficción de Sombra de Evidencia (estilo caricatura de los años 30).
// Usa S30 (plantilla/sombra.js): el detective Sombra, cielo, luna, olas, niebla y el acabado de película vieja.
(() => {
  const { W, H, TAU, clamp, lerp, prog, sale, rebote, hash, azar, alfa } = K;
  const C = S30.C;

  // ---- piezas de este caso ----
  function faro(ctx, x, y, s, T, { luz = 1, ang = 0 } = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-88, 0); ctx.lineTo(-58, -430); ctx.lineTo(58, -430); ctx.lineTo(88, 0); ctx.closePath();
    S30.relleno(ctx, C.papel, 7);
    ctx.save(); ctx.clip(); ctx.fillStyle = C.tinta;
    for (const yy of [-110, -270]) ctx.fillRect(-100, yy - 55, 200, 55);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(20, -440, 80, 440);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-26, -58); ctx.arc(0, -58, 26, Math.PI, 0); ctx.lineTo(26, 0); ctx.closePath(); S30.relleno(ctx, C.tinta, 0);
    ctx.fillStyle = C.tinta; ctx.fillRect(-84, -452, 168, 22);
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 4;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 24, -452); ctx.lineTo(i * 24, -478); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-80, -478); ctx.lineTo(80, -478); ctx.stroke();
    if (luz > 0) K.halo(ctx, 0, -500, 170, C.oro, .55 * luz);
    ctx.beginPath(); ctx.rect(-48, -545, 96, 70); S30.relleno(ctx, K.mezcla('#2a2723', '#f6dfa6', luz), 6);
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 5;
    for (const xx of [-16, 16]) { ctx.beginPath(); ctx.moveTo(xx, -545); ctx.lineTo(xx, -475); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, -545, 54, Math.PI, 0); ctx.closePath(); S30.relleno(ctx, C.tinta, 0);
    ctx.beginPath(); ctx.arc(0, -604, 9, 0, TAU); ctx.fill();
    ctx.restore();
    if (luz > 0) haz(ctx, x, y - 510 * s, s, ang, luz);
  }
  // Dos haces opuestos que giran: se acortan al apuntar hacia el fondo o hacia la cámara.
  function haz(ctx, x, y, s, ang, luz) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const a of [ang, ang + Math.PI]) {
      const c = Math.cos(a), largo = 1150 * s * c, abre = 60 + 150 * Math.abs(c);
      if (Math.abs(largo) < 10) continue;
      const g = ctx.createLinearGradient(x, y, x + largo, y);
      g.addColorStop(0, alfa(C.oro, .5 * luz)); g.addColorStop(1, alfa(C.oro, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y - 18 * s); ctx.lineTo(x + largo, y - abre * s); ctx.lineTo(x + largo, y + abre * s); ctx.lineTo(x, y + 18 * s); ctx.fill();
      if (Math.sin(a) > .85) K.halo(ctx, x, y, 260 * s, C.oro, .5 * luz);
    }
    ctx.restore();
  }
  function acantilado(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], H);
    pts.forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.lineTo(pts[pts.length - 1][0], H); ctx.closePath(); ctx.fillStyle = C.tinta; ctx.fill();
  }
  // Gato negro sentado; (x, y) = base. o: T, ojos 0-1, guino 0-1, mira, pata 0-1 (estira la pata hacia la derecha), soloOjos.
  function gato(ctx, x, y, s, o = {}) {
    const { T = 0, ojos = 1, guino = 0, mira = 0, pata = 0, soloOjos = false } = o;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (!soloOjos) {
      K.extremidad(ctx, 62, -24, -.4, 220, 28, (i, k) => -.11 - .05 * Math.sin(T * 2.4 - i * .35) * (.3 + k), C.tinta, { tramos: 22 });
      K.curva(ctx, [[-70, -6], [-84, -90], [-56, -168], [0, -186], [56, -168], [84, -90], [70, -6], [0, 4]]); ctx.fillStyle = C.tinta; ctx.fill();
      ctx.beginPath(); ctx.ellipse(-30, -8, 28, 15, 0, 0, TAU); ctx.fill();
      const px = lerp(30, 118, sale(pata)), py = lerp(-8, -128, sale(pata));
      S30.manguera(ctx, 30, -60, px, py, -10, 26);
      ctx.beginPath(); ctx.ellipse(px, py, 28, 15, -pata * .6, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill();
      ctx.beginPath(); ctx.arc(0, -232, 72, 0, TAU); ctx.fill();
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx * 62, -262); ctx.lineTo(sx * 52, -336); ctx.lineTo(sx * 14, -294); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = alfa(C.papel, .8); ctx.lineWidth = 3;
      for (const sx of [-1, 1]) for (const dy of [-8, 6]) { ctx.beginPath(); ctx.moveTo(sx * 22, -200); ctx.lineTo(sx * 80, -206 + dy * 1.6); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-12, -190); ctx.quadraticCurveTo(0, -180, 12, -190); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -204, 7, 5, 0, 0, TAU); ctx.fillStyle = C.papel; ctx.fill();
    } else {
      K.halo(ctx, 0, -236, 130, C.oro, .22 * ojos);
    }
    S30.ojo(ctx, -27, -238, 19, 27, { abre: ojos, mira });
    S30.ojo(ctx, 27, -238, 19, 27, { abre: ojos * (1 - guino), mira });
    ctx.restore();
  }
  function huella(ctx, x, y, s, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); ctx.fillStyle = C.tinta;
    ctx.beginPath(); ctx.ellipse(0, 8, 13, 11, 0, 0, TAU); ctx.fill();
    for (const [tx, ty] of [[-13, -6], [-5, -13], [5, -13], [13, -6]]) { ctx.beginPath(); ctx.arc(tx, ty, 5, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function destello(ctx, x, y, r, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.papel; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .22 : r, an = i * Math.PI / 4; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    ctx.fill(); ctx.restore();
  }
  // Lámpara del faro (lente de anillos) sobre su pedestal; (x, y) = centro de la lente.
  function lampara(ctx, x, y, s, T, { brillo = 1 } = {}) {
    if (brillo > 0) K.halo(ctx, x, y, 420 * s, C.oro, .45 * brillo);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = C.tinta; ctx.fillRect(-40, 150, 80, 140); ctx.fillRect(-110, 280, 220, 30);
    K.redondo(ctx, -120, -170, 240, 330, 60); S30.relleno(ctx, K.mezcla('#6f685f', '#f1dfae', brillo), 7);
    ctx.save(); K.redondo(ctx, -120, -170, 240, 330, 60); ctx.clip();
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 4;
    for (let yy = -150; yy < 160; yy += 34) { ctx.beginPath(); ctx.moveTo(-130, yy); ctx.quadraticCurveTo(0, yy + 14, 130, yy); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, -5, 46, 0, TAU); S30.relleno(ctx, K.mezcla('#8a8278', '#fff4d6', brillo), 5);
    ctx.restore();
    for (let i = 0; i < 5; i++) destello(ctx, x + (hash(i) - .5) * 300 * s, y + (hash(i + 9) - .5) * 360 * s, 22 * s, brillo * Math.max(0, Math.sin(T * 3 + i * 1.7)));
  }
  function ventanal(ctx, T) {
    S30.cielo(ctx, T, { estrellas: 26, semilla: 12 });
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 26;
    for (const x of [90, 400, 680, 990]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.lineWidth = 18; for (const y of [480, 900]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#1d1a17'; ctx.fillRect(0, 1150, W, H - 1150);
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 4;
    for (let x = -40; x < W; x += 120) { ctx.beginPath(); ctx.moveTo(x, 1150); ctx.lineTo(x - 60, H); ctx.stroke(); }
    ctx.fillStyle = C.tinta; ctx.fillRect(0, 1140, W, 14);
  }
  function barco(ctx, x, y, s, T) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(T * 1.7) * .07); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-150, -40); ctx.lineTo(150, -40); ctx.lineTo(110, 30); ctx.lineTo(-115, 30); ctx.closePath(); S30.relleno(ctx, C.tinta, 0);
    ctx.fillStyle = C.papel; for (const px of [-70, -20, 30, 80]) { ctx.beginPath(); ctx.arc(px, -8, 8, 0, TAU); ctx.fill(); }
    ctx.fillStyle = C.tinta; ctx.fillRect(-6, -260, 12, 222);
    const inflado = Math.sin(T * 1.3) * 8;
    ctx.beginPath(); ctx.moveTo(4, -250); ctx.quadraticCurveTo(120 + inflado, -150, 6, -60); ctx.closePath(); S30.relleno(ctx, C.papel, 5);
    ctx.beginPath(); ctx.moveTo(-4, -230); ctx.quadraticCurveTo(-100 - inflado, -140, -6, -70); ctx.closePath(); S30.relleno(ctx, C.claro, 5);
    ctx.beginPath(); ctx.moveTo(6, -260); ctx.lineTo(50 + Math.sin(T * 6) * 6, -248); ctx.lineTo(6, -236); ctx.fillStyle = C.oro; ctx.fill();
    ctx.restore();
  }
  const reloj = (ctx, x, y, a) => K.pastilla(ctx, '3:33', x, y, { tam: 46, fondo: C.oro, color: C.tinta, opacidad: a, escala: rebote(a) });
  const pista = (ctx, texto, x, y, a) => K.pastilla(ctx, texto, x, y, { tam: 34, fondo: C.papel, color: C.tinta, opacidad: a, escala: rebote(a) });

  window.ESCENAS = [
    // 1. Gancho: el faro se enciende de noche (la portada va abajo, de y=860 a 1240).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      S30.cielo(ctx, T);
      S30.luna(ctx, 820, 470, 95, T);
      S30.olas(ctx, 1010, T, { filas: 5 });
      acantilado(ctx, [[-20, 900], [140, 820], [470, 805], [600, 860], [660, 1010], [700, 1120]]);
      faro(ctx, 330, 812, .9, T, { luz: prog(t, .4, 1.2), ang: T * 1.3 });
      reloj(ctx, 800, 700, prog(t, d * .55, d * .55 + .4));
      S30.pelicula(ctx, T);
    },
    // 2. La puerta cerrada con candado desde hace cuarenta años.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.camara(ctx, 540, 780, lerp(1, 1.18, prog(t, 0, d)), () => {
        ctx.fillStyle = '#5f5850'; ctx.fillRect(-200, -200, W + 400, H + 400);
        ctx.strokeStyle = C.tinta; ctx.lineWidth = 5;
        for (let r = 0; r < 26; r++) for (let c = -1; c < 8; c++) {
          const x = c * 170 + (r % 2) * 85, y = r * 80 - 100;
          K.redondo(ctx, x + 4, y + 4, 162, 72, 10); ctx.fillStyle = hash(r * 9 + c) < .5 ? '#6b645b' : '#575047'; ctx.fill(); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(330, 1180); ctx.lineTo(330, 560); ctx.arc(540, 560, 210, Math.PI, 0); ctx.lineTo(750, 1180); ctx.closePath();
        S30.relleno(ctx, '#3d3832', 9);
        ctx.save(); ctx.clip(); ctx.strokeStyle = C.tinta; ctx.lineWidth = 4;
        for (let x = 370; x < 750; x += 46) { ctx.beginPath(); ctx.moveTo(x, 340); ctx.lineTo(x, 1180); ctx.stroke(); }
        ctx.fillStyle = C.tinta; for (const y of [640, 980]) ctx.fillRect(320, y, 440, 34);
        ctx.fillStyle = C.claro; for (const y of [657, 997]) for (let x = 360; x < 740; x += 70) { ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); }
        ctx.restore();
        ctx.strokeStyle = C.tinta; ctx.lineWidth = 12;
        for (const [a, b] of [[[360, 600], [720, 1060]], [[720, 600], [360, 1060]]]) {
          for (let k = 0; k <= 1; k += .06) { ctx.beginPath(); ctx.ellipse(lerp(a[0], b[0], k), lerp(a[1], b[1], k), 18, 11, Math.atan2(b[1] - a[1], b[0] - a[0]) + (Math.round(k / .06) % 2) * 1.4, 0, TAU); ctx.lineWidth = 7; ctx.strokeStyle = '#8a8278'; ctx.stroke(); }
        }
        ctx.save(); ctx.translate(540, 790); ctx.rotate(Math.sin(T * 2.1) * .09);
        ctx.beginPath(); ctx.arc(0, 30, 52, Math.PI, 0); ctx.strokeStyle = '#8a8278'; ctx.lineWidth = 18; ctx.stroke();
        K.redondo(ctx, -78, 30, 156, 130, 22); S30.relleno(ctx, C.tinta, 0);
        ctx.beginPath(); ctx.arc(0, 80, 15, 0, TAU); ctx.fillStyle = C.papel; ctx.fill(); ctx.fillRect(-6, 84, 12, 40);
        ctx.restore();
        ctx.strokeStyle = alfa(C.papel, .55); ctx.lineWidth = 2.5;
        const ox = 340, oy = 420, mec = Math.sin(T * 1.3) * 6;
        for (let i = 0; i < 6; i++) { const a = i * .3; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * 260 + mec, oy + Math.sin(a) * 260); ctx.stroke(); }
        for (let r = 60; r <= 240; r += 60) { ctx.beginPath(); ctx.arc(ox, oy, r, .02, 1.5 + mec * .01); ctx.stroke(); }
      });
      pista(ctx, 'CERRADO HACE 40 AÑOS', 540, 1150, prog(t, d * .45, d * .45 + .4));
      S30.pelicula(ctx, T);
    },
    // 3. Entra el detective Sombra.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      S30.cielo(ctx, T, { estrellas: 30 });
      S30.luna(ctx, 880, 400, 62, T, { curiosa: 1 });
      acantilado(ctx, [[600, 900], [760, 860], [1100, 850]]);
      faro(ctx, 860, 862, .42, T, { luz: 1, ang: T * 1.3 });
      ctx.fillStyle = C.tinta; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 1110);
      for (let x = 0; x <= W; x += 60) ctx.lineTo(x, 1110 + Math.sin(x * .02) * 10); ctx.lineTo(W, H); ctx.fill();
      ctx.strokeStyle = C.papel; ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) { const x = hash(i) * W, y = 1120 + hash(i + 4) * 30; for (const a of [-.5, 0, .5]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a + Math.sin(T * 2 + i) * .2) * 22, y - 26); ctx.stroke(); } }
      const anda = prog(t, 0, d * .8);
      S30.detective(ctx, lerp(-90, 470, anda), 1150, .95, { T, paso: anda < 1 ? T * 2.6 : null, mira: .3 });
      S30.titulo(ctx, 'DETECTIVE SOMBRA', 540, 470, { tam: 50, opacidad: prog(t, d * .3, d * .3 + .6) });
      S30.pelicula(ctx, T);
    },
    // 4. Primera pista: huellas que suben y ninguna baja.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      S30.cielo(ctx, T, { estrellas: 20 });
      faro(ctx, 860, 660, .38, T, { luz: 1, ang: T * 1.3 });
      const g = ctx.createLinearGradient(0, 640, 0, H); g.addColorStop(0, '#a89f8d'); g.addColorStop(1, '#6f685f');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, 660);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 650 + Math.sin(x * .013) * 14); ctx.lineTo(W, H); ctx.fill();
      const r = azar(4); ctx.fillStyle = 'rgba(13,12,11,.25)';
      for (let i = 0; i < 160; i++) { ctx.beginPath(); ctx.arc(r() * W, 680 + r() * 800, 1.5 + r() * 2, 0, TAU); ctx.fill(); }
      const ruta = K.ruta([[380, 1180], [560, 1020], [700, 880], [830, 720]], 10);
      ruta.forEach(([x, y], i) => {
        const a = clamp((t - d * .15 - i * d * .05) / .25);
        if (a <= 0 || i === 0) return;
        const [px, py] = ruta[i - 1], ang = Math.atan2(y - py, x - px) + Math.PI / 2, lado = i % 2 ? 1 : -1;
        ctx.globalAlpha = a; huella(ctx, x + Math.cos(ang + Math.PI / 2) * 0 + lado * 16 * Math.cos(ang), y + lado * 16 * Math.sin(ang), lerp(1.2, .7, i / 10), ang); ctx.globalAlpha = 1;
      });
      S30.detective(ctx, 200, 1235, .78, { T, lupa: prog(t, d * .1, d * .35), mira: .6 });
      pista(ctx, 'NINGUNA BAJA', 700, 560, prog(t, d * .72, d * .72 + .4));
      S30.pelicula(ctx, T);
    },
    // 5. Segunda pista: la lámpara reluciente y un pelo negro.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      ventanal(ctx, T);
      lampara(ctx, 470, 760, 1.25, T, { brillo: .75 + .25 * Math.sin(T * 2) });
      const pelo = (x, y, s) => { ctx.beginPath(); for (let k = 0; k <= 30; k++) { const u = k / 30; ctx.lineTo(x + (u - .5) * 70 * s, y + Math.sin(u * 14) * 8 * s); } ctx.strokeStyle = C.tinta; ctx.lineWidth = 3.5 * s; ctx.stroke(); };
      pelo(800, 1120, 1);
      const entra = prog(t, d * .4, d * .62), lx = lerp(1250, 800, sale(entra)), ly = 1080;
      if (entra > 0) {
        ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, 120, 0, TAU); ctx.clip();
        ctx.fillStyle = '#2a2622'; ctx.fillRect(lx - 130, ly - 130, 260, 260);
        ctx.fillStyle = C.tinta; ctx.fillRect(lx - 130, 1140, 260, 14);
        ctx.translate(800, 1120); ctx.scale(2.6, 2.6); ctx.translate(-800, -1120); pelo(800, 1120, 1);
        ctx.restore();
        ctx.beginPath(); ctx.arc(lx, ly, 120, 0, TAU); ctx.strokeStyle = C.oro; ctx.lineWidth = 22; ctx.stroke();
        ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.stroke();
        ctx.save(); ctx.translate(lx + 85, ly + 85); ctx.rotate(.78); ctx.fillStyle = C.tinta; K.redondo(ctx, 0, -18, 190, 36, 18); ctx.fill(); ctx.restore();
      }
      pista(ctx, 'NI UNA MOTA DE POLVO', 470, 430, prog(t, d * .1, d * .1 + .4));
      pista(ctx, 'UN PELO NEGRO', 800, 900, prog(t, d * .68, d * .68 + .4));
      S30.pelicula(ctx, T);
    },
    // 6. A las 3:33 la luz se enciende y Sombra sube corriendo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const A = [0, 1, 2, 3, 4, 5].map(i => [i % 2 ? 800 : 280, 1180 - i * 250]);
      const k = prog(t, d * .1, d * .95), [px, py] = K.enRuta(A, k), tramo = Math.min(4, Math.floor(k * 5));
      const camY = lerp(800, py - 150, .9);
      ctx.fillStyle = '#2b2824'; ctx.fillRect(0, 0, W, H);
      K.camara(ctx, 540, camY, 1, () => {
        for (let y = -600; y < 1500; y += 64) for (let x = -1; x < 8; x++) {
          K.redondo(ctx, x * 150 + ((y / 64) % 2) * 75, y, 142, 56, 8); ctx.fillStyle = hash(x * 7 + y) < .5 ? '#3a3631' : '#34302b'; ctx.fill();
        }
        ctx.fillStyle = C.tinta; ctx.fillRect(100, -700, 28, 2300); ctx.fillRect(952, -700, 28, 2300);
        for (let i = 0; i < 5; i++) {
          const [ax, ay] = A[i], [bx, by] = A[i + 1];
          for (let e = 0; e < 9; e++) { const u = e / 9; ctx.fillStyle = C.papel; ctx.strokeStyle = C.tinta; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.rect(lerp(ax, bx, u) - 30, lerp(ay, by, u), 60 + Math.abs(bx - ax) / 9, 22); ctx.fill(); ctx.stroke(); }
          ctx.fillStyle = C.tinta; ctx.beginPath(); ctx.moveTo(ax - 30, ay + 22); ctx.lineTo(bx + 30, by + 22); ctx.lineTo(bx + 30, by + 60); ctx.lineTo(ax - 30, ay + 60); ctx.fill();
        }
        S30.detective(ctx, px, py, .55, { T, paso: T * 4.2, corre: true, dir: A[tramo + 1][0] > A[tramo][0] ? 1 : -1 });
      });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const destella = Math.max(0, Math.sin(T * 5)) * prog(t, 0, .5);
      ctx.fillStyle = alfa(C.oro, .12 * destella); ctx.fillRect(0, 0, W, H); ctx.restore();
      reloj(ctx, 820, 400, prog(t, 0, .4));
      S30.pelicula(ctx, T);
    },
    // 7. Arriba no hay nadie: dos ojos en la oscuridad... un gato negro.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T, .5);
      ctx.fillStyle = C.tinta; ctx.fillRect(-20, -20, W + 40, H + 40);
      const luz = prog(t, d * .5, d * .85);
      if (luz > 0) { ctx.save(); ctx.globalAlpha = luz; ventanal(ctx, T); lampara(ctx, 300, 720, .95, T, { brillo: luz }); ctx.restore(); }
      const ojos = prog(t, d * .15, d * .15 + .25) * (1 - Math.pow(Math.max(0, Math.sin(T * 1.4)), 70));
      if (luz < 1) { ctx.save(); ctx.globalAlpha = 1 - luz; gato(ctx, 680, 1080, 1.5, { T, ojos, soloOjos: true, mira: -.4 }); ctx.restore(); }
      if (luz > 0) { ctx.save(); ctx.globalAlpha = luz; gato(ctx, 680, 1080, 1.5, { T, ojos, mira: -.4 }); ctx.restore(); }
      S30.pelicula(ctx, T);
    },
    // 8. El gato empuja la palanca y el faro gira; el detective salta del susto.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      ventanal(ctx, T);
      const empuja = prog(t, d * .35, d * .5), gira = Math.max(0, t - d * .45);
      lampara(ctx, 430, 700, .95, T, { brillo: 1 });
      haz(ctx, 430, 700, .9, gira * 2.2, empuja);
      ctx.save(); ctx.translate(640, 1000); ctx.rotate(lerp(-.55, .5, sale(empuja)));
      ctx.fillStyle = C.tinta; ctx.fillRect(-9, -150, 18, 150);
      ctx.beginPath(); ctx.arc(0, -150, 24, 0, TAU); ctx.fillStyle = C.oro; ctx.fill(); ctx.restore();
      ctx.fillStyle = C.tinta; ctx.fillRect(600, 990, 80, 24);
      gato(ctx, 820, 1140, 1, { T, pata: prog(t, d * .25, d * .42) * (1 - prog(t, d * .6, d * .75)), mira: -.6 });
      const susto = prog(t, d * .55, d * .62) * (1 - prog(t, d * .8, d * .95));
      S30.detective(ctx, 170, 1215, .62, { T, susto, mira: .8 });
      S30.pelicula(ctx, T);
    },
    // 9. Un barco perdido en la niebla encuentra el puerto.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      S30.cielo(ctx, T);
      S30.luna(ctx, 850, 420, 70, T);
      acantilado(ctx, [[-20, 860], [120, 800], [330, 790], [420, 900], [470, 1100]]);
      faro(ctx, 210, 800, .62, T, { luz: 1, ang: T * 1.4 });
      S30.olas(ctx, 960, T, { filas: 2 });
      barco(ctx, lerp(940, 620, prog(t, 0, d)), 1015, 1.05, T);
      S30.olas(ctx, 1080, T, { filas: 4 });
      S30.niebla(ctx, T, { y: 760, alto: 420, a: .28 * (1 - prog(t, d * .5, d)) + .1 });
      S30.pelicula(ctx, T);
    },
    // 10. Caso cerrado... y el gato guiña un ojo. Iris que se cierra sobre el gato.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      ventanal(ctx, T);
      lampara(ctx, 540, 640, .8, T, { brillo: .8 });
      S30.detective(ctx, 270, 1215, .85, { T, rasca: prog(t, d * .15, d * .35), boca: 'duda', mira: .7 });
      const guino = prog(t, d * .5, d * .56) * (1 - prog(t, d * .66, d * .72));
      gato(ctx, 800, 1170, 1, { T, guino, mira: -.5 });
      S30.pelicula(ctx, T);
      S30.iris(ctx, prog(t, d * .76, d), 800, 940);
    },
    // 11. Cierre: negro con un halo dorado; el logo lo pone la marca encima.
    (ctx, t, d, K, T) => {
      ctx.fillStyle = C.tinta; ctx.fillRect(0, 0, W, H);
      K.halo(ctx, 540, 640, 620, C.oro, .16);
      S30.niebla(ctx, T, { y: 300, alto: 900, a: .08 });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
