/* Ilustra — REPARTO: personas (gente de época, persona de "¿Sobrevivirías?"). Reutiliza Ilustra.Personaje (Fase 1) y le añade
   sombreros, bastón, bolso, periódicos, poses de supervivencia (con giro de cuerpo entero) y expresiones nuevas. Cargar tras reparto.js.
   Depende de reparto.js (R.poseDe, R.mezclar, R.pose, R.convertirRel, R.expr, R.sombraSuelo). */
(function (G) {
  'use strict';
  const I = G.Ilustra, P = I.Pincel, R = I.REPARTO, PI = Math.PI;
  const pe = R.pose;
  R.props = R.props || {};

  // ------------------------------------------------------------ props sueltos
  // Tronco caído (asiento). (x, y) = suelo bajo el centro.
  R.props.tronco = function (ctx, x, y, o = {}) {
    o = Object.assign({ largo: 220, radio: 62, color: '#6b4a34', semilla: 5, dir: 1 }, o);
    const L = o.largo, r = o.radio, cy = y - r * 0.9;
    ctx.save(); ctx.fillStyle = 'rgba(14,12,18,0.35)'; ctx.translate(x, y); ctx.scale(1, 0.16); ctx.beginPath(); ctx.arc(0, 0, L * 0.55, 0, 7); ctx.fill(); ctx.restore();
    P.forma(ctx, P.rect(x - L / 2, cy - r, L, r * 2, r * 0.45), { color: o.color, semilla: o.semilla, volumen: 0.8, borde: 0.8, textura: 0.6, irregular: 1.4, sombraInterna: 0.5 });
    ctx.save(); ctx.strokeStyle = I.css(I.oscurece(o.color, 0.5), 0.5); ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const yy = cy - r * 0.6 + i * r * 0.4; ctx.beginPath(); ctx.moveTo(x - L * 0.45, yy); ctx.quadraticCurveTo(x, yy + (i % 2 ? 5 : -5), x + L * 0.45, yy); ctx.stroke(); }
    ctx.restore();
    const ex = x + o.dir * L / 2;
    P.forma(ctx, P.elipse(ex, cy, r * 0.32, r, 0, 24), { color: '#b98d5c', semilla: o.semilla + 1, volumen: 0.5, borde: 0.7, textura: 0.4, irregular: 0.6 });
    ctx.save(); ctx.strokeStyle = I.css('#7d5a38', 0.7); ctx.lineWidth = 2.5; for (const k of [0.35, 0.7]) { ctx.beginPath(); ctx.ellipse(ex, cy, r * 0.32 * k, r * k, 0, 0, 7); ctx.stroke(); } ctx.restore();
    return { superficie: cy - r };
  };

  // Periódico plegado, centrado en (x, y), con rotación.
  R.props.periodico = function (ctx, x, y, o = {}) {
    o = Object.assign({ ancho: 70, alto: 95, giro: 0, semilla: 9, titular: true }, o);
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.giro);
    P.forma(ctx, P.rect(-o.ancho / 2, -o.alto / 2, o.ancho, o.alto, 2), { color: '#e7dcc2', semilla: o.semilla, volumen: 0.5, borde: 0.7, irregular: 0.5, textura: 0.4, anchoBorde: 3 });
    ctx.fillStyle = I.css('#2a2420', 0.9); ctx.fillRect(-o.ancho * 0.4, -o.alto * 0.4, o.ancho * 0.8, o.alto * 0.12);
    ctx.fillStyle = I.css('#2a2420', 0.45);
    for (let i = 0; i < 7; i++) ctx.fillRect(-o.ancho * 0.4, -o.alto * 0.2 + i * o.alto * 0.085, o.ancho * (i % 3 === 2 ? 0.45 : 0.8), 2.2);
    ctx.fillStyle = I.css('#8f7e63', 0.5); ctx.fillRect(o.ancho * 0.05, -o.alto * 0.2, o.ancho * 0.35, o.alto * 0.25);
    ctx.restore();
  };

  // ------------------------------------------------------------ adornos en el marco de la cabeza
  // Marco local de la cabeza del Personaje (centro, mirando a +x, y hacia abajo). fn(Rx, Ry)
  function enCabeza(ctx, pj, J, dir, fn) {
    const H = pj.o.altura, p = J.prop, c = J.cabeza, Rx = H * 0.066 * p.escalaCabeza, Ry = H * 0.078 * p.escalaCabeza;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(dir, 1); ctx.rotate(c.a * 0.9); fn(Rx, Ry); ctx.restore();
  }
  const SOMB = {
    fedora(ctx, o, R0, Ry, s) {
      P.forma(ctx, P.elipse(R0 * 0.05, -Ry * 0.52, R0 * 1.5, R0 * 0.24, 0.05, 30), { color: o.color, semilla: s + 1, volumen: 0.8, borde: 0.9, anchoBorde: 4, irregular: 0.6, textura: 0.4, sombraInterna: 0.45 });
      const copa = P.suavizar([[-R0 * 0.78, -Ry * 0.5], [-R0 * 0.8, -Ry * 1.2], [-R0 * 0.55, -Ry * 1.6], [-R0 * 0.2, -Ry * 1.5], [R0 * 0.05, -Ry * 1.42], [R0 * 0.3, -Ry * 1.5], [R0 * 0.65, -Ry * 1.6], [R0 * 0.88, -Ry * 1.2], [R0 * 0.86, -Ry * 0.5]], 4);
      P.forma(ctx, copa, { color: o.color, semilla: s + 2, volumen: 0.85, borde: 0.9, anchoBorde: 4, irregular: 0.7, textura: 0.4, sombraInterna: 0.5 });
      P.forma(ctx, P.poligono([[-R0 * 0.785, -Ry * 0.55], [-R0 * 0.79, -Ry * 0.78], [R0 * 0.875, -Ry * 0.78], [R0 * 0.86, -Ry * 0.55]]), { color: o.banda, semilla: s + 3, volumen: 0.5, borde: 0.6, irregular: 0.3, textura: 0.2, anchoBorde: 2 });
    },
    bombin(ctx, o, R0, Ry, s) {
      P.forma(ctx, P.elipse(R0 * 0.08, -Ry * 0.58, R0 * 1.18, R0 * 0.17, 0.04, 28), { color: o.color, semilla: s + 1, volumen: 0.8, borde: 0.9, anchoBorde: 4, irregular: 0.5, textura: 0.3, sombraInterna: 0.4 });
      const copa = P.suavizar([[-R0 * 0.82, -Ry * 0.56], [-R0 * 0.88, -Ry * 1.12], [-R0 * 0.4, -Ry * 1.55], [R0 * 0.25, -Ry * 1.58], [R0 * 0.8, -Ry * 1.2], [R0 * 0.9, -Ry * 0.56]], 4);
      P.forma(ctx, copa, { color: o.color, semilla: s + 2, volumen: 0.9, borde: 0.9, anchoBorde: 4, irregular: 0.6, textura: 0.3, sombraInterna: 0.5 });
      P.forma(ctx, P.poligono([[-R0 * 0.83, -Ry * 0.6], [-R0 * 0.85, -Ry * 0.76], [R0 * 0.9, -Ry * 0.76], [R0 * 0.9, -Ry * 0.6]]), { color: o.banda, semilla: s + 3, volumen: 0.5, borde: 0.5, irregular: 0.2, anchoBorde: 2 });
    },
    cloche(ctx, o, R0, Ry, s) {
      const pts = P.suavizar([[R0 * 1.0, -Ry * 0.36], [R0 * 0.78, -Ry * 1.0], [R0 * 0.1, -Ry * 1.34], [-R0 * 0.7, -Ry * 1.14], [-R0 * 1.2, -Ry * 0.4], [-R0 * 1.22, Ry * 0.18], [-R0 * 0.8, Ry * 0.2], [-R0 * 0.35, -Ry * 0.12], [R0 * 0.25, -Ry * 0.3], [R0 * 0.75, -Ry * 0.28]], 4);
      P.forma(ctx, pts, { color: o.color, semilla: s + 1, volumen: 0.85, borde: 0.95, anchoBorde: 5, irregular: 0.7, textura: 0.4, sombraInterna: 0.45 });
      P.forma(ctx, P.suavizar([[R0 * 0.95, -Ry * 0.4], [R0 * 0.2, -Ry * 0.5], [-R0 * 0.8, -Ry * 0.35], [-R0 * 0.8, -Ry * 0.18], [R0 * 0.2, -Ry * 0.32], [R0 * 0.94, -Ry * 0.28]], 3), { color: o.banda, semilla: s + 2, volumen: 0.5, borde: 0.5, irregular: 0.3, anchoBorde: 2 });
      P.forma(ctx, P.elipse(-R0 * 0.3, -Ry * 0.4, R0 * 0.22, R0 * 0.2, 0, 14), { color: o.flor || '#b8483f', semilla: s + 3, volumen: 0.7, borde: 0.8, irregular: 0.3, anchoBorde: 2 });
    },
    gorra(ctx, o, R0, Ry, s) {
      // gorra de repartidor (bombacha con visera corta)
      const bomba = P.suavizar([[-R0 * 1.15, -Ry * 0.35], [-R0 * 0.95, -Ry * 1.1], [-R0 * 0.1, -Ry * 1.4], [R0 * 0.75, -Ry * 1.18], [R0 * 1.05, -Ry * 0.5], [R0 * 0.5, -Ry * 0.45], [-R0 * 0.4, -Ry * 0.4]], 4);
      P.forma(ctx, bomba, { color: o.color, semilla: s + 1, volumen: 0.85, borde: 0.9, anchoBorde: 4, irregular: 0.7, textura: 0.5, sombraInterna: 0.5 });
      P.forma(ctx, P.suavizar([[R0 * 0.7, -Ry * 0.55], [R0 * 1.4, -Ry * 0.42], [R0 * 1.35, -Ry * 0.3], [R0 * 0.7, -Ry * 0.38]], 3), { color: I.oscurece(o.color, 0.25), semilla: s + 2, volumen: 0.7, borde: 0.8, irregular: 0.3, anchoBorde: 2 });
      P.forma(ctx, P.elipse(-R0 * 0.1, -Ry * 1.38, R0 * 0.1, R0 * 0.08, 0, 10), { color: I.oscurece(o.color, 0.2), semilla: s + 3, volumen: 0.5, borde: 0.5, irregular: 0, anchoBorde: 2 });
    }
  };
  const BIGOTE = (ctx, color, R0, Ry, s) => {
    P.forma(ctx, P.suavizar([[R0 * 0.3, Ry * 0.52], [R0 * 0.5, Ry * 0.47], [R0 * 0.78, Ry * 0.52], [R0 * 0.82, Ry * 0.6], [R0 * 0.55, Ry * 0.56], [R0 * 0.3, Ry * 0.62]], 3), { color, semilla: s + 5, volumen: 0.5, borde: 0.5, irregular: 0.6, textura: 0.4, anchoBorde: 2 });
  };

  // ------------------------------------------------------------ poses del cuerpo humano (ángulos de la Fase 1 + extras)
  //   altoH: elevación (unidades de H); giroCuerpo: giro de todo el cuerpo alrededor de la pelvis (rad, con dir=1; + = hacia delante/abajo)
  //   tendido: el cuerpo se apoya en el suelo (la pelvis queda a ~0.075 H)
  const D = I.POSES;
  const POSES_PERSONA = {
    dePie: D.dePie, sentado: D.sentado, manosBolsillos: D.manosBolsillos, cabizbajo: D.cabizbajo, saludar: D.saludar, agarrar: D.agarrar,
    camina: e => I.ciclos.poseCaminar(e.x, e.y, e.e.dist != null ? e.e.dist : e.t * 150, e.H, e.dir),
    corre: e => I.ciclos.poseCaminar(e.x, e.y, e.e.dist != null ? e.e.dist : e.t * 420, e.H, e.dir,
      { columna: 0.2, cuello: -0.06, cabeza: -0.08, antebrazoD: 1.4, antebrazoI: 1.4 }, ['antebrazoD', 'antebrazoI'], { zancada: 0.42, levantar: 0.14, brazos: 0.95, rebote: 0.02 }),
    saltar: pe({ columna: 0.1, pecho: 0.05, cuello: -0.05, cabeza: -0.12, brazoD: 2.7, antebrazoD: 0.25, brazoI: 2.4, antebrazoI: 0.3, musloD: 1.1, piernaD: -1.25, pieD: 0.5, musloI: 0.35, piernaI: -0.95, pieI: 0.6, altoH: 0.16 }),
    caer: pe({ columna: 0.1, pecho: 0.06, cuello: 0.0, cabeza: -0.25, brazoD: 2.0, antebrazoD: 0.1, brazoI: 1.7, antebrazoI: 0.25, musloD: -0.6, piernaD: -0.6, musloI: -0.25, piernaI: -1.1, giroCuerpo: 0.95, altoH: 0.2 }),
    caerAtras: pe({ columna: -0.12, pecho: -0.1, cuello: -0.1, cabeza: -0.2, brazoD: 2.6, antebrazoD: 0.15, brazoI: 2.0, antebrazoI: -0.3, musloD: 0.7, piernaD: -0.35, musloI: -0.45, piernaI: -0.15, giroCuerpo: -0.95, altoH: 0.2 }),
    agacharse: pe({ columna: 0.28, pecho: 0.12, cuello: 0.0, cabeza: -0.15, brazoD: 0.5, antebrazoD: 0.9, brazoI: 0.25, antebrazoI: 0.9, musloD: 1.35, piernaD: -1.95, pieD: 0.25, musloI: 1.25, piernaI: -1.85, pieI: 0.25, raizY: 0.235 }),
    protegerse: pe({ columna: 0.4, pecho: 0.2, cuello: 0.15, cabeza: 0.3, relManoD: ['cabeza', 0.06, -0.075], relManoI: ['cabeza', -0.02, -0.06], musloD: 1.4, piernaD: -2.0, pieD: 0.25, musloI: 1.3, piernaI: -1.9, pieI: 0.25, raizY: 0.235 }),
    sentarse: pe({ columna: 0.05, pecho: 0.02, cuello: 0.06, brazoD: 0.35, antebrazoD: 0.9, brazoI: 0.25, antebrazoI: 0.95, musloD: 1.5, piernaD: -1.5, pieD: 0.1, musloI: 1.42, piernaI: -1.42, pieI: 0.1, raizY: 0.228, asiento: true }),
    tendido: pe({ columna: 0.0, cuello: 0.0, cabeza: 0.0, brazoD: 0.35, antebrazoD: 0.1, brazoI: -0.25, antebrazoI: 0.1, musloD: 0.1, piernaD: 0.0, musloI: -0.05, piernaI: 0.0, giroCuerpo: -PI / 2, tendido: true }),
    susto: pe({ columna: -0.12, pecho: -0.07, cuello: -0.06, cabeza: -0.1, brazoD: 1.0, antebrazoD: 1.35, manoD: -0.3, brazoI: 0.75, antebrazoI: 1.5, musloD: 0.08, piernaD: -0.12, musloI: -0.14, piernaI: 0.0 }),
    senalar: pe({ columna: 0.03, cuello: 0.04, brazoD: 1.5, antebrazoD: -0.1, brazoI: -0.04, antebrazoI: 0.2, musloD: 0.03, musloI: -0.03 })
  };

  // ------------------------------------------------------------ Humano: envoltorio de I.Personaje
  function Humano(o) {
    this.o = o;
    this.pj = new I.Personaje(o.pj);
    this.H = o.pj.altura;
    this.poses = Object.assign({}, POSES_PERSONA, o.poses || {});
    this.semilla = o.pj.semilla;
  }
  Humano.prototype.dibujar = function (ctx, t, e) {
    const pj = this.pj, H = this.H, dir = e.dir || 1, o = this.o;
    const ctxE = { e, t, x: e.x, y: e.y, dir, H, p: this };
    let pose = R.poseDe(this.poses, e.pose, ctxE);
    if (e.pose2 != null) pose = R.mezclar(pose, R.poseDe(this.poses, e.pose2, ctxE), e.k || 0);
    const Hp = (pj.esq.p.muslo + pj.esq.p.pierna) * 0.995 + 0.03, hP = Hp * H;
    const k = e.k == null ? 1 : e.k;
    const alto = (e.alto || 0) + (pose.altoH || 0) * H * (pose.altoH && e.k != null && e.pose2 == null ? Math.sin(PI * e.k) : 1);
    const giro = (e.giro != null ? e.giro : (pose.giroCuerpo || 0)) * dir;
    const yv = e.y - alto;
    const pose2 = R.convertirRel(pj.esq, e.x, yv, pose, dir);
    const ex = R.expr(e.expresion);
    const est = Object.assign({}, e, { x: e.x, y: yv, dir, pose: pose2, expresion: ex, sombraSuelo: false });
    // sombra en el suelo
    if (e.sombraSuelo !== false) {
      const w = pose.tendido ? H * 0.55 : H * 0.17 + Math.abs(giro) * H * 0.1;
      R.sombraSuelo(ctx, e.x + (pose.tendido ? -dir * H * 0.05 : 0), e.y, w, 0.5 * I.clamp(1 - alto / (H * 0.9), 0.25, 1));
    }
    // asiento
    if (pose.asiento && e.asiento !== false) R.props.tronco(ctx, e.x - dir * H * 0.02, e.y, { largo: H * 0.62, radio: H * 0.13, dir });
    // antes: bastón
    if (o.antes) o.antes.call(this, ctx, t, est, { pj, H, dir, pose });
    ctx.save();
    if (giro) {
      const piv = [e.x, yv - hP + (pose.tendido ? 0 : 0)];
      ctx.translate(piv[0], piv[1] + (pose.tendido ? hP - H * 0.075 : 0)); ctx.rotate(giro); ctx.translate(-piv[0], -piv[1]);
      if (pose.tendido) { /* ya queda apoyado */ }
    }
    const J = pj.dibujar(ctx, t, est);
    if (o.despues) o.despues.call(this, ctx, t, est, { pj, H, dir, pose, J, ex });
    ctx.restore();
    return J;
  };

  // ------------------------------------------------------------ PERSONA (¿Sobrevivirías?)
  const PIELES = ['#f0c4a0', '#e0a97f', '#c98f66', '#a56d48', '#7d4b32', '#5a3426'];
  R.persona = function (o = {}) {
    o = Object.assign({ altura: 520, piel: '#e0a97f', pelo: '#3a2a24', peinado: 'corto', ropa: '#3f6f73', pantalon: '#3b4156', zapatos: '#2a2624', tipo: 'adulto', semilla: 31, bufanda: null, ojos: '#3a2a22', largoRopa: 0.5, cuello: false }, o);
    const pj = { tipo: o.tipo, altura: o.altura, semilla: o.semilla, piel: o.piel, pelo: o.pelo, peinado: o.peinado, ojos: o.ojos, abrigo: { color: o.ropa, largo: o.largoRopa, cuello: o.cuello }, bufanda: o.bufanda ? { color: o.bufanda } : null, pantalon: o.pantalon, zapatos: o.zapatos };
    return new Humano({ pj, nombre: 'Persona' });
  };
  R.persona.pieles = PIELES;
  R.persona.presets = {
    a: { piel: '#e0a97f', pelo: '#3a2a24', peinado: 'corto', ropa: '#3f6f73', pantalon: '#3b4156', semilla: 31 },
    b: { piel: '#a56d48', pelo: '#1d1614', peinado: 'mono', ropa: '#a8553f', pantalon: '#3a3f4a', semilla: 32 },
    c: { piel: '#f0c4a0', pelo: '#7a4b2a', peinado: 'melena', ropa: '#5a6a3c', pantalon: '#4a3f38', semilla: 33 },
    d: { piel: '#7d4b32', pelo: '#15100f', peinado: 'calvo', ropa: '#c79a45', pantalon: '#2f3442', semilla: 34 }
  };

  // ------------------------------------------------------------ GENTE DE ÉPOCA (años 30)
  const VARIANTES = {
    hombre: {
      pj: { nombre: 'Hombre', tipo: 'adulto', altura: 520, semilla: 41, piel: '#dcae8b', pelo: '#2b211d', peinado: 'corto', ojos: '#3a2a22', abrigo: { color: '#5b5f69', largo: 0.72, cuello: false }, bufanda: null, pantalon: '#44474f', zapatos: '#1f1a18' },
      poses: { dePie: D.manosBolsillos },
      despues(ctx, t, e, c) {
        const s = c.pj.o.semilla, H = c.H, J = c.J;
        // corbata (sobre el pecho, en el marco del torso)
        const dir = c.dir;
        const cu = J.cuello, hm = J.hombros, pl = J.pelvis, ul = Math.hypot(hm.x - pl.x, hm.y - pl.y) || 1, u = [(hm.x - pl.x) / ul, (hm.y - pl.y) / ul], f = [-u[1] * dir, u[0] * dir];
        const fr = (fw, alto) => [cu.x + f[0] * fw * H + u[0] * alto * H, cu.y + f[1] * fw * H + u[1] * alto * H];
        P.forma(ctx, P.suavizar([fr(0.03, -0.012), fr(0.05, -0.02), fr(0.056, -0.11), fr(0.04, -0.125), fr(0.03, -0.11)], 3), { color: '#8a3a33', semilla: s + 6, volumen: 0.6, borde: 0.6, irregular: 0.3, anchoBorde: 2 });
        enCabeza(ctx, c.pj, J, dir, (R0, Ry) => SOMB.fedora(ctx, { color: '#44413f', banda: '#17151a' }, R0, Ry, s));
      }
    },
    mujer: {
      pj: { nombre: 'Mujer', tipo: 'adulto', altura: 490, semilla: 42, piel: '#efc3a2', pelo: '#4a2e22', peinado: 'corto', ojos: '#3a2a22', abrigo: { color: '#2f6a6a', largo: 1.0, cuello: false }, bufanda: null, pantalon: '#e9dcc8', zapatos: '#2a2020' },
      poses: { dePie: I.mezclarPoses(D.dePie, pe({ brazoD: 0.12, antebrazoD: 0.6, musloD: 0.02, musloI: -0.02 }), 0.8) },
      despues(ctx, t, e, c) {
        const s = c.pj.o.semilla, H = c.H, J = c.J, dir = c.dir, m = J.manoD;
        // bolso colgando de la mano
        const bx = m.x + dir * H * 0.01, by = m.y + H * 0.09;
        ctx.save(); ctx.strokeStyle = I.css('#2a1c18'); ctx.lineWidth = H * 0.006; ctx.beginPath(); ctx.moveTo(m.x, m.y + H * 0.01); ctx.lineTo(bx - H * 0.025, by - H * 0.03); ctx.moveTo(m.x, m.y + H * 0.01); ctx.lineTo(bx + H * 0.025, by - H * 0.03); ctx.stroke(); ctx.restore();
        P.forma(ctx, P.rect(bx - H * 0.045, by - H * 0.03, H * 0.09, H * 0.065, 6), { color: '#7a3a2c', semilla: s + 8, volumen: 0.8, borde: 0.8, irregular: 0.4, textura: 0.4, anchoBorde: 3 });
        // cinturón del vestido
        enCabeza(ctx, c.pj, J, dir, (R0, Ry) => SOMB.cloche(ctx, { color: '#d9cdb2', banda: '#6b3b3a', flor: '#b8483f' }, R0, Ry, s));
      }
    },
    anciano: {
      pj: { nombre: 'Anciano', tipo: 'anciano', altura: 480, semilla: 43, piel: '#d9a888', pelo: '#d4cfc7', peinado: 'corto', ojos: '#2f2a28', abrigo: { color: '#5a5148', largo: 0.5, cuello: false }, bufanda: null, pantalon: '#3b3732', zapatos: '#241d19' },
      poses: {
        dePie: R.pose({ columna: 0.1, pecho: 0.08, cuello: 0.14, cabeza: 0.14, relManoD: ['suelo', 0.12, -0.5], brazoI: -0.04, antebrazoI: 0.2, musloD: 0.03, musloI: -0.03 }),
        camina: e => Object.assign(I.ciclos.poseCaminar(e.x, e.y, e.e.dist != null ? e.e.dist : e.t * 60, e.H, e.dir, { columna: 0.1, pecho: 0.08, cuello: 0.14, cabeza: 0.14 }, [], { zancada: 0.15, levantar: 0.03, brazos: 0.1, rebote: 0.006 }), { relManoD: ['suelo', 0.14, -0.5] })
      },
      antes(ctx, t, e, c) {
        // bastón con empuñadura curva (se dibuja detrás de la mano)
        const H = c.H, dir = c.dir, x = e.x, y0 = e.y + (e.alto || 0), fase = c.pose.fasePaso;
        const sw = fase == null ? 0 : Math.sin(2 * PI * fase), y = y0 - (fase == null ? 0 : Math.max(0, Math.cos(2 * PI * fase)) * H * 0.025);
        const topx = x + dir * H * (fase == null ? 0.12 : 0.14), topy = y0 - H * 0.5, bx = x + dir * H * (0.15 + 0.09 * sw);
        ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = I.css('#2a1b12'); ctx.lineWidth = H * 0.016;
        ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(topx, topy + H * 0.02); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(topx, topy + H * 0.02); ctx.quadraticCurveTo(topx - dir * H * 0.005, topy - H * 0.03, topx - dir * H * 0.04, topy - H * 0.015); ctx.stroke();
        ctx.strokeStyle = I.css('#8a5f3b', 0.55); ctx.lineWidth = H * 0.005; ctx.beginPath(); ctx.moveTo(bx - 2, y - 4); ctx.lineTo(topx - 2, topy + H * 0.03); ctx.stroke();
        ctx.restore();
      },
      despues(ctx, t, e, c) {
        const s = c.pj.o.semilla, H = c.H, J = c.J, dir = c.dir;
        enCabeza(ctx, c.pj, J, dir, (R0, Ry) => { BIGOTE(ctx, '#d8d3cb', R0, Ry, s); SOMB.bombin(ctx, { color: '#3a3532', banda: '#15131a' }, R0, Ry, s); });
      }
    },
    nino: {
      pj: { nombre: 'Vendedor', tipo: 'nino', altura: 330, semilla: 44, piel: '#efbf98', pelo: '#5a3a28', peinado: 'corto', ojos: '#3a2a22', abrigo: { color: '#6f6a52', largo: 0.45, cuello: false }, bufanda: null, pantalon: '#4a4540', zapatos: '#2c231e' },
      poses: { dePie: R.pose({ columna: -0.03, cuello: -0.02, cabeza: -0.12, relManoD: ['hombros', 0.07, -0.3], brazoI: 0.04, antebrazoI: 0.3, musloD: 0.04, musloI: -0.04 }) },
      despues(ctx, t, e, c) {
        const s = c.pj.o.semilla, H = c.H, J = c.J, dir = c.dir, d = J.dedosD, h = J.hombros;
        // bolsa de periódicos cruzada
        ctx.save(); ctx.strokeStyle = I.css('#4a3a2a'); ctx.lineWidth = H * 0.016; ctx.lineCap = 'round';
        const pelv = J.pelvis;
        ctx.beginPath(); ctx.moveTo(h.x - dir * H * 0.01, h.y - H * 0.01); ctx.lineTo(pelv.x + dir * H * 0.12, pelv.y + H * 0.04); ctx.stroke(); ctx.restore();
        P.forma(ctx, P.rect(pelv.x + dir * H * 0.07 - H * 0.07, pelv.y - H * 0.0, H * 0.15, H * 0.12, 5), { color: '#8a7552', semilla: s + 9, volumen: 0.8, borde: 0.8, irregular: 0.6, textura: 0.6, anchoBorde: 3 });
        R.props.periodico(ctx, pelv.x + dir * H * 0.07, pelv.y - H * 0.02, { ancho: H * 0.09, alto: H * 0.11, giro: 0.15 * dir, semilla: s + 10 });
        // periódico en alto
        R.props.periodico(ctx, d.x + dir * H * 0.005, d.y - H * 0.08, { ancho: H * 0.15, alto: H * 0.2, giro: 0.12 * dir, semilla: s + 11 });
        manoD(ctx, J, c);
        enCabeza(ctx, c.pj, J, dir, (R0, Ry) => SOMB.gorra(ctx, { color: '#5b5a50' }, R0, Ry, s));
      }
    }
  };
  // vuelve a dibujar la mano derecha sobre el periódico (el mitón de la Fase 1 queda debajo)
  function manoD(ctx, J, c) {
    const pj = c.pj, H = c.H, m = J.manoD, d = J.dedosD, a = Math.atan2(d.y - m.y, d.x - m.x), piel = pj.o.piel;
    P.forma(ctx, P.elipse(m.x + Math.cos(a) * H * 0.022, m.y + Math.sin(a) * H * 0.022, H * 0.03, H * 0.021, a, 16), { color: piel, semilla: pj.o.semilla + 12, volumen: 0.6, borde: 0.7, irregular: 0.4, textura: 0.1 });
  }
  const ALIAS = { hombre: 'hombre', mujer: 'mujer', anciano: 'anciano', nino: 'nino', niño: 'nino', vendedor: 'nino' };
  R.gente = function (variante, o = {}) {
    const k = ALIAS[variante];
    if (!k) throw new Error('REPARTO.gente: variante desconocida "' + variante + '" (hombre, mujer, anciano, nino)');
    const v = VARIANTES[k];
    const pj = Object.assign({}, v.pj, o.pj || {});
    for (const c of ['piel', 'pelo', 'peinado', 'pantalon', 'zapatos', 'altura', 'semilla']) if (o[c] != null) pj[c] = o[c];
    if (o.ropa) pj.abrigo = Object.assign({}, pj.abrigo, { color: o.ropa });
    return new Humano({ pj, poses: v.poses, antes: v.antes, despues: v.despues, nombre: v.pj.nombre });
  };
  R.gente.variantes = ['hombre', 'mujer', 'anciano', 'nino'];
  R.Humano = Humano;
})(window);
