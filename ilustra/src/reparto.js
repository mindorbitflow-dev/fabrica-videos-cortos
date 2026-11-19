/* Ilustra — REPARTO (fábrica de videos cortos). Núcleo común + Sombra (detective perro) + Tito (cerdito ayudante).
   Se registra en Ilustra.REPARTO. Cargar DESPUÉS de personaje.js (y de props.js si se usan los props). Ver INFORME_REPARTO.md.

   Todos los personajes del reparto exponen:   p.dibujar(ctx, t, estado) -> J     (J = articulaciones en el mundo)
   estado = { x, y, dir, pose, expresion, mirada, viento, luz, sombraSuelo, alto, dist, habla, ... } (como Personaje de la Fase 1)
     x, y     punto del suelo bajo la pelvis        dir  1 mira a la derecha, -1 a la izquierda
     pose     nombre de pose ('dePie', 'lupa'...), objeto de pose (ángulos + objetivos IK) o función; ver p.poses
     pose2,k  si hay pose2, se mezcla pose -> pose2 con k (0..1)
     expresion  nombre (REPARTO.EXPRESIONES) u objeto {ceja:[incl,alt], ojo, boca:[curva,abertura], mejillas, mirada}
     dist     distancia recorrida (para la fase del paso en 'camina'/'corre'); alto = elevación en px sobre el suelo (saltos)
     habla    0..1: mueve la boca como si hablara (determinista en t)
   Poses con objetivos relativos: relManoD / relManoI / relPieD / relPieI = [ref, dx, dy]  (ref 'suelo'|'cabeza'|'pelvis'|'hombros',
   dx hacia delante y dy hacia ABAJO, en unidades de altura del esqueleto). Se convierten en objetivos IK en cada cuadro.
   Todo es determinista: sin Math.random; el mismo t da los mismos píxeles. */
(function (G) {
  'use strict';
  const I = G.Ilustra, P = I.Pincel;
  const R = I.REPARTO = I.REPARTO || {};
  const PI = Math.PI;
  const rel4 = ['relManoD', 'relManoI', 'relPieD', 'relPieI'];

  // ============================================================== expresiones
  R.EXPRESIONES = Object.assign({}, I.EXPRESIONES, {
    susto: { ceja: [-0.55, 0.6], ojo: 1.2, boca: [-0.3, 0.95], mejillas: 0.1 },
    asombro: { ceja: [-0.25, 0.65], ojo: 1.15, boca: [0, 0.8], mejillas: 0.35 },
    grito: { ceja: [-0.2, 0.4], ojo: 0.85, boca: [0.5, 1.0], mejillas: 0.5 },
    duda: { ceja: [0.35, 0.3], ojo: 0.85, boca: [-0.18, 0], mejillas: 0.2 },
    risa: { ceja: [-0.1, 0.2], ojo: 0.55, boca: [0.95, 0.7], mejillas: 0.8 },
    concentrado: { ceja: [0.45, -0.05], ojo: 0.62, boca: [0.0, 0], mejillas: 0.15 }
  });
  function expr(e) {
    if (typeof e === 'string') e = R.EXPRESIONES[e] || I.EXPRESIONES.neutra;
    return Object.assign({}, I.EXPRESIONES.neutra, e || {});
  }
  R.expr = expr;

  // ============================================================== utilidades
  const pt = j => [j.x, j.y];
  const tono = (c, lejos) => lejos ? I.oscurece(c, 0.24) : I.color(c);
  const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // Polígono cerrado de una "manguera" (brazo/pierna de goma): trazo de grosor variable con remates redondos.
  function manguera(pts, r0, r1, pasos = 5) {
    const c = P.suavizar(pts, pasos, false), m = c.length, L = [], Rr = [];
    let aS = 0, aE = 0;
    for (let i = 0; i < m; i++) {
      const a = c[Math.max(0, i - 1)], b = c[Math.min(m - 1, i + 1)];
      const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (i === 0) aS = th; if (i === m - 1) aE = th;
      const r = I.lerp(r0, r1, i / (m - 1)), nx = Math.sin(th), ny = -Math.cos(th);
      L.push([c[i][0] + nx * r, c[i][1] + ny * r]); Rr.push([c[i][0] - nx * r, c[i][1] - ny * r]);
    }
    const poly = L.slice();
    for (let k = 1; k < 6; k++) { const a = aE - PI / 2 + k / 6 * PI; poly.push([c[m - 1][0] + Math.cos(a) * r1, c[m - 1][1] + Math.sin(a) * r1]); }
    for (let i = m - 1; i >= 0; i--) poly.push(Rr[i]);
    for (let k = 1; k < 6; k++) { const a = aS + PI / 2 + k / 6 * PI; poly.push([c[0][0] + Math.cos(a) * r0, c[0][1] + Math.sin(a) * r0]); }
    return poly;
  }
  R.manguera = manguera;

  // Cinta de anchura variable por punto (anchos[i] = radio en cada punto) con remates redondos. Para cuerpos de animales.
  function tubo(pts, radios, remate = true) {
    const m = pts.length, L = [], Rr = [];
    let aS = 0, aE = 0;
    for (let i = 0; i < m; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)];
      const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (i === 0) aS = th; if (i === m - 1) aE = th;
      const r = radios[i], nx = Math.sin(th), ny = -Math.cos(th);
      L.push([pts[i][0] + nx * r, pts[i][1] + ny * r]); Rr.push([pts[i][0] - nx * r, pts[i][1] - ny * r]);
    }
    const poly = L.slice();
    if (remate) for (let k = 1; k < 6; k++) { const a = aE - PI / 2 + k / 6 * PI; poly.push([pts[m - 1][0] + Math.cos(a) * radios[m - 1], pts[m - 1][1] + Math.sin(a) * radios[m - 1]]); }
    for (let i = m - 1; i >= 0; i--) poly.push(Rr[i]);
    if (remate) for (let k = 1; k < 6; k++) { const a = aS + PI / 2 + k / 6 * PI; poly.push([pts[0][0] + Math.cos(a) * radios[0], pts[0][1] + Math.sin(a) * radios[0]]); }
    return poly;
  }
  R.tubo = tubo;

  // Sombra de contacto en el suelo (óvalo difuso).
  function sombraSuelo(ctx, cx, y, w, alfa = 0.55) {
    ctx.save();
    const g = ctx.createRadialGradient(cx, y, 0, cx, y, w);
    g.addColorStop(0, 'rgba(14,12,18,' + alfa + ')'); g.addColorStop(1, 'rgba(14,12,18,0)');
    ctx.fillStyle = g; ctx.translate(cx, y); ctx.scale(1, 0.17); ctx.translate(-cx, -y);
    ctx.fillRect(cx - w, y - w, w * 2, w * 2);
    ctx.restore();
  }
  R.sombraSuelo = sombraSuelo;

  // Pose: mezcla (ángulos, objetivos IK mundo y objetivos relativos)
  R.mezclar = function (a, b, k) {
    const o = I.mezclarPoses(a, b, k);
    for (const c of rel4) {
      if (a[c] && b[c] && a[c].length === 3 && b[c].length === 3) {
        // mismo ref: interpola; ref distinto: guarda ambos y el peso (se resuelve al convertir a objetivos IK)
        if (a[c][0] === b[c][0]) o[c] = [a[c][0], I.lerp(a[c][1], b[c][1], k), I.lerp(a[c][2], b[c][2], k)];
        else o[c] = [a[c][0], a[c][1], a[c][2], b[c][0], b[c][1], b[c][2], k];
      } else { const d = k < 0.5 ? a[c] : b[c]; if (d) o[c] = d; else delete o[c]; }
    }
    for (const c of ['gesto', 'gestoI', 'prop']) { const d = k < 0.5 ? a[c] : b[c]; if (d !== undefined) o[c] = d; else delete o[c]; }
    return o;
  };
  const P0 = {}; I.CAMPOS_POSE.forEach(k => P0[k] = 0);
  R.pose = o => Object.assign({}, P0, o);

  // Resuelve una especificación de pose (nombre / objeto / función / {mezcla}) a un objeto de pose.
  function poseDe(tabla, spec, ctxEstado) {
    const get = s => {
      if (typeof s === 'string') { const p = tabla[s]; if (!p) throw new Error('REPARTO: pose desconocida "' + s + '"'); return typeof p === 'function' ? p(ctxEstado) : p; }
      return typeof s === 'function' ? s(ctxEstado) : s;
    };
    if (spec == null) spec = 'dePie';
    if (spec && spec.mezcla) return R.mezclar(get(spec.mezcla[0]), get(spec.mezcla[1]), spec.mezcla[2]);
    return get(spec);
  }
  R.poseDe = poseDe;

  function objetivoRel(r, refs, dir, H) {
    const p1 = refs[r[0]];
    const a = [p1[0] + dir * r[1] * H, p1[1] + r[2] * H];
    if (r.length < 7) return a;
    const p2 = refs[r[3]], b = [p2[0] + dir * r[4] * H, p2[1] + r[5] * H];
    return [I.lerp(a[0], b[0], r[6]), I.lerp(a[1], b[1], r[6])];
  }
  // Convierte objetivos relativos en objetivos IK del mundo; opcionalmente aparta los hombros/caderas hacia los lados
  // (torso frontal con cabeza de perfil, como en los diseños originales). Devuelve J con los miembros ya desplazados.
  function resolver(esq, x, y, pose, dir, anchos) {
    const H = esq.H, p0 = Object.assign({}, pose);
    for (const c of ['objetivoManoD', 'objetivoManoI', 'objetivoPieD', 'objetivoPieI']) { /* se conservan */ }
    const sh = anchos ? anchos[0] : 0, ch = anchos ? anchos[1] : 0;
    let J0 = null;
    const necesita = rel4.some(c => p0[c]) || sh || ch;
    if (necesita) {
      const q = Object.assign({}, p0); ['objetivoManoD', 'objetivoManoI', 'objetivoPieD', 'objetivoPieI'].forEach(c => delete q[c]);
      J0 = esq.resolver(x, y, q, dir);
      const refs = { suelo: [x, y], cabeza: [J0.cabeza.x, J0.cabeza.y], pelvis: [J0.pelvis.x, J0.pelvis.y], hombros: [J0.hombros.x, J0.hombros.y] };
      for (const c of rel4) if (p0[c]) p0['objetivo' + c.slice(3)] = objetivoRel(p0[c], refs, dir, H);
    }
    if (!(sh || ch)) return esq.resolver(x, y, p0, dir);
    const ux = J0.hombros.x - J0.pelvis.x, uy = J0.hombros.y - J0.pelvis.y, ul = Math.hypot(ux, uy) || 1;
    const v = [-uy / ul, ux / ul];
    const sD = [dir * v[0] * sh * H, dir * v[1] * sh * H], cD = [dir * v[0] * ch * H, dir * v[1] * ch * H];
    const des = { ManoD: sD, ManoI: [-sD[0], -sD[1]], PieD: cD, PieI: [-cD[0], -cD[1]] };
    for (const k in des) { const o = p0['objetivo' + k]; if (o) p0['objetivo' + k] = [o[0] - des[k][0], o[1] - des[k][1]]; }
    const J = esq.resolver(x, y, p0, dir);
    for (const [l, d] of [['D', sD], ['I', [-sD[0], -sD[1]]]]) for (const n of ['hombro', 'codo', 'mano', 'dedos']) { J[n + l].x += d[0]; J[n + l].y += d[1]; }
    for (const [l, d] of [['D', cD], ['I', [-cD[0], -cD[1]]]]) for (const n of ['cadera', 'rodilla', 'tobillo', 'punta', 'talon']) { J[n + l].x += d[0]; J[n + l].y += d[1]; }
    J.u = [ux / ul, uy / ul]; J.v = v;
    return J;
  }
  R.resolver = resolver;

  // Igual que resolver pero devuelve la POSE con los objetivos relativos ya convertidos (para el Personaje de la Fase 1, que resuelve solo).
  R.convertirRel = function (esq, x, y, pose, dir) {
    if (!rel4.some(c => pose[c])) return pose;
    const H = esq.H, q = Object.assign({}, pose); ['objetivoManoD', 'objetivoManoI', 'objetivoPieD', 'objetivoPieI'].forEach(c => delete q[c]);
    const J0 = esq.resolver(x, y, q, dir), o = Object.assign({}, pose);
    const refs = { suelo: [x, y], cabeza: [J0.cabeza.x, J0.cabeza.y], pelvis: [J0.pelvis.x, J0.pelvis.y], hombros: [J0.hombros.x, J0.hombros.y] };
    for (const c of rel4) if (pose[c]) o['objetivo' + c.slice(3)] = objetivoRel(pose[c], refs, dir, H);
    return o;
  };

  // ------------------------------------------------------------ ojo de dibujos animados (óvalo crema con aro de tinta)
  function ojoToon(ctx, x, y, rx, ry, o) {
    const ab = I.clamp(o.abre == null ? 1 : o.abre, 0.1, 1.25), hy = ry * Math.min(1, ab) * (ab > 1 ? 1 + (ab - 1) * 0.5 : 1);
    const tinta = o.tinta || '#15131a', mir = o.mira || [0, 0];
    const trazado = P.elipse(x, y, rx * (ab > 1 ? 1.05 : 1), hy, 0, 26);
    const path = P.forma(ctx, trazado, { color: o.crema || '#efe4cf', semilla: o.s || 1, volumen: 0.3, borde: 0.35, anchoBorde: 2, irregular: 0, textura: 0, sombraInterna: 0.28 });
    ctx.save(); ctx.clip(path);
    const px = x + rx * 0.12 + mir[0] * rx * 0.42, py = y + hy * 0.12 + mir[1] * hy * 0.3, pr = o.pupila == null ? 0.56 : o.pupila;
    ctx.fillStyle = I.css(tinta); ctx.beginPath(); ctx.ellipse(px, py, rx * pr, hy * pr * 1.12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(250,240,220,0.95)'; ctx.beginPath(); ctx.ellipse(px + rx * 0.2, py - hy * 0.3, rx * 0.17, hy * 0.2, -0.5, 0, 7); ctx.fill();
    // párpado (inclinación de cejas): + enfado (interior bajo), - tristeza (interior alto, exterior caído)
    const lid = o.lid || 0, inn = o.interior || 1;
    if (Math.abs(lid) > 0.03 || (o.caida || 0) > 0.03) {
      const yIn = y - hy + lid * hy * 0.95 + (o.caida || 0) * hy, yOut = y - hy - lid * hy * 0.35 + (o.caida || 0) * hy + (lid < 0 ? -lid * hy * 0.45 : 0);
      ctx.fillStyle = I.css(tinta);
      ctx.beginPath(); ctx.moveTo(x - rx * 1.3, y - hy * 2); ctx.lineTo(x + rx * 1.3, y - hy * 2);
      ctx.lineTo(x + rx * 1.3, inn > 0 ? yIn : yOut); ctx.lineTo(x - rx * 1.3, inn > 0 ? yOut : yIn); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = I.css(tinta); ctx.lineWidth = Math.max(1.5, rx * 0.2); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(x, y, rx * (ab > 1 ? 1.05 : 1), hy, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  R.ojoToon = ojoToon;

  // Mano de guante/mitón con pulgar y rayitas de dedos. gesto: 'abierta' | 'puno' | 'senalar'
  function manoToon(ctx, J, lado, st, o) {
    const H = st.H, dir = st.dir, codo = J['codo' + lado], mano = J['mano' + lado];
    const a = Math.atan2(mano.y - codo.y, mano.x - codo.x), lejos = o.lejos, r = o.radio * H;
    const col = tono(o.color, lejos), tinta = o.tinta || '#15131a', s = o.semilla;
    const c = [mano.x + Math.cos(a) * r * 0.55, mano.y + Math.sin(a) * r * 0.55];
    const gesto = o.gesto || 'abierta';
    const borde = lejos ? 0.25 : 0.7;
    // puño del guante
    P.forma(ctx, P.elipse(mano.x - Math.cos(a) * r * 0.1, mano.y - Math.sin(a) * r * 0.1, r * 0.5, r * 0.62, a + PI / 2, 14), { color: I.mezcla(col, tinta, 0.15), semilla: s + 1, volumen: 0.5, borde: borde * 0.5, irregular: 0.2, contorno: tinta, anchoContorno: 1.4 });
    if (gesto === 'senalar') {
      const f = P.capsula(c[0], c[1], r * 0.3, c[0] + Math.cos(a) * r * 1.45, c[1] + Math.sin(a) * r * 1.45, r * 0.23);
      P.forma(ctx, f, { color: col, semilla: s + 2, volumen: 0.6, borde, irregular: 0.2, contorno: tinta, anchoContorno: 1.6 });
    }
    const palma = gesto === 'puno' ? [r * 0.92, r * 0.82] : [r * 1.0, r * 0.88];
    P.forma(ctx, P.elipse(c[0], c[1], palma[0], palma[1], a, 20), { color: col, semilla: s + 3, volumen: 0.65, borde, irregular: 0.3, textura: 0.08, contorno: tinta, anchoContorno: 1.6 });
    // pulgar
    const pa = a - st.dir * 1.0;
    P.forma(ctx, P.capsula(c[0] + Math.cos(pa) * r * 0.45, c[1] + Math.sin(pa) * r * 0.45, r * 0.28, c[0] + Math.cos(pa) * r * 0.95 + Math.cos(a) * r * 0.25, c[1] + Math.sin(pa) * r * 0.95 + Math.sin(a) * r * 0.25, r * 0.22),
      { color: col, semilla: s + 4, volumen: 0.5, borde: borde * 0.7, irregular: 0.1, contorno: tinta, anchoContorno: 1.4 });
    // dedos: rayitas
    if (gesto !== 'senalar' || true) {
      ctx.save(); ctx.strokeStyle = I.css(tinta, 0.9); ctx.lineWidth = Math.max(1.4, r * 0.09); ctx.lineCap = 'round';
      const na = a + PI / 2, n = gesto === 'senalar' ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const k = (i - (n - 1) / 2) * r * 0.36 + (gesto === 'senalar' ? r * 0.2 * st.dir : 0);
        const bx = c[0] + Math.cos(a) * r * 0.45 + Math.cos(na) * k, by = c[1] + Math.sin(a) * r * 0.45 + Math.sin(na) * k;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * r * 0.5, by + Math.sin(a) * r * 0.5); ctx.stroke();
      }
      ctx.restore();
    }
    return c;
  }
  R.manoToon = manoToon;

  // Cuerpo común de los personajes con esqueleto propio (Sombra, Tito)
  function Toon() { }
  Toon.prototype.dibujar = function (ctx, t, e) {
    const o = this.o, H = this.H, dir = e.dir || 1;
    const luzPrev = I.luzActual; if (e.luz) I.luzActual = e.luz;
    const alto = e.alto || 0, x = e.x, y = e.y - alto;
    const ctxE = { e, t, x, y, dir, H, p: this };
    let pose = poseDe(this.poses, e.pose, ctxE);
    if (e.pose2 != null) pose = R.mezclar(pose, poseDe(this.poses, e.pose2, ctxE), e.k || 0);
    const resp = I.ciclos.respirar(t + o.semilla, { amp: 0.01 });
    pose = I.sumarPoses(pose, resp, e.respiracion == null ? 1 : e.respiracion);
    const J = resolver(this.esq, x, y, pose, dir, this.anchos);
    this.ultimas = J;
    const st = { t, e, J, H, dir, s: o.semilla, pose, y0: e.y, alto, viento: e.viento || 0, resp: resp.respiro, ex: expr(e.expresion), gesto: e.gesto || pose.gesto, gestoI: e.gestoI || pose.gestoI };
    // habla: abre la boca con ritmo determinista
    if (e.habla) {
      const h = e.habla, f = 0.5 + 0.5 * Math.sin(t * 15 + I.ruido1(t * 3, o.semilla) * 3) * Math.sin(t * 6.3 + 1);
      st.ex = Object.assign({}, st.ex, { boca: [Math.max(st.ex.boca[0], 0.1), Math.max(st.ex.boca[1], h * (0.15 + 0.7 * Math.max(0, f)))] });
    }
    this.cuerpo(ctx, st);
    I.luzActual = luzPrev;
    return J;
  };

  // ============================================================== SOMBRA
  const SOMBRA = {
    tinta: '#18161c', cabeza: '#1d1a21', oreja: '#221f28', sombrero: '#15131a', cinta: '#cfa35a', hocico: '#ecdfc6', nariz: '#14121a',
    saco: '#4d4841', cinturon: '#1a181c', hebilla: '#d2a85d', guante: '#eee1c8', boton: '#eadcc0', pantalon: '#1a181e', zapato: '#1b191f'
  };
  const PROP_SOMBRA = { columna: 0.085, pecho: 0.15, cuello: 0.02, cabeza: 0.27, brazo: 0.15, antebrazo: 0.14, mano: 0.06, muslo: 0.158, pierna: 0.15, pie: 0.1, escalaCabeza: 1, anchoHombro: 1, curva: 0 };

  function Sombra(o = {}) {
    this.o = Object.assign({ nombre: 'Sombra', altura: 520, semilla: 7, colores: {} }, o);
    this.c = Object.assign({}, SOMBRA, this.o.colores);
    this.H = this.o.altura / 1.07 * 1.11;           // H = del suelo a la coronilla (sin sombrero); altura total ~ 1.07 H
    this.esq = new I.Esqueleto(PROP_SOMBRA, this.H);
    this.anchos = [0.116, 0.05];
    this.poses = Object.assign({}, SOMBRA_POSES);
    this.poses.camina = e => I.ciclos.poseCaminar(e.x, e.y, e.e.dist != null ? e.e.dist : e.t * 120, e.H, e.dir, SOMBRA_POSES.dePie, [], { zancada: 0.18, levantar: 0.035, brazos: 0.3, rebote: 0.008 });
  }
  Sombra.prototype = Object.create(Toon.prototype);
  const posesB = {
    dePie: R.pose({ columna: 0.0, cuello: 0.02, cabeza: 0.0, brazoD: 0.14, antebrazoD: 0.12, brazoI: -0.12, antebrazoI: 0.08, musloD: 0.02, piernaD: 0, musloI: -0.02, piernaI: 0, manoD: 0.1 })
  };
  const SOMBRA_POSES = {
    dePie: posesB.dePie,
    senalar: R.pose({ columna: 0.03, pecho: 0.02, cuello: 0.02, cabeza: -0.02, brazoD: 1.5, antebrazoD: -0.1, manoD: -0.05, brazoI: -0.1, antebrazoI: 0.1, musloD: 0.04, musloI: -0.04, gesto: 'senalar' }),
    lupa: R.pose({ columna: 0.03, cuello: 0.04, cabeza: 0.06, relManoD: ['cabeza', 0.2, 0.12], brazoI: -0.12, antebrazoI: 0.08, musloD: 0.03, musloI: -0.03, prop: 'lupa' }),
    pensativo: R.pose({ columna: 0.05, pecho: 0.03, cuello: 0.1, cabeza: 0.14, relManoD: ['cabeza', 0.14, 0.2], brazoI: 0.5, antebrazoI: 1.35, musloD: 0.04, musloI: -0.05, gesto: 'puno' }),
    sorprendido: R.pose({ columna: -0.1, pecho: -0.06, cuello: -0.04, cabeza: -0.1, brazoD: 0.8, antebrazoD: 0.9, brazoI: -0.55, antebrazoI: 0.7, musloD: 0.06, piernaD: -0.04, musloI: -0.14, piernaI: 0.0, raizY: -0.012 }),
    explicar: R.pose({ columna: 0.02, cuello: 0.02, brazoD: 0.9, antebrazoD: 0.7, manoD: -0.2, brazoI: -0.2, antebrazoI: 0.25, musloD: 0.03, musloI: -0.03 }),
    cruzado: R.pose({ columna: 0.0, cuello: 0.03, brazoD: 0.4, antebrazoD: 1.9, brazoI: -0.35, antebrazoI: 1.9, musloD: 0.02, musloI: -0.02 })
  };

  Sombra.prototype.pierna = function (ctx, st, lado, lejos) {
    const c = this.c, J = st.J, H = st.H, s = st.s + (lejos ? 50 : 0);
    const cad = J['cadera' + lado], rod = J['rodilla' + lado], tob = J['tobillo' + lado], ta = J['talon' + lado], pu = J['punta' + lado];
    const col = tono(c.pantalon, lejos), borde = lejos ? 0.2 : 0.7;
    P.forma(ctx, manguera([pt(cad), pt(rod), pt(tob)], H * 0.03, H * 0.027), { color: col, semilla: s + 1, volumen: 0.7, borde, irregular: 0.6, sombraInterna: 0.4, textura: 0.1 });
    const pf = [pu.x - ta.x, pu.y - ta.y], an = Math.atan2(pf[1], pf[0]);
    const cx = tob.x + pf[0] * 0.2, cy = tob.y + H * 0.02 - H * 0.048;
    const zap = P.elipse(cx, cy, H * 0.105, H * 0.05, an, 26);
    P.forma(ctx, zap, { color: tono(c.zapato, lejos), semilla: s + 2, volumen: 0.7, borde: borde * 1.1, irregular: 0.4, sombraInterna: 0.35, textura: 0.1 });
    // reflejo gris de los zapatos (como en el diseño original)
    ctx.save(); ctx.translate(cx, cy - H * 0.012 * 0); ctx.rotate(an); ctx.fillStyle = I.css('#8f8a82', lejos ? 0.25 : 0.55);
    ctx.beginPath(); ctx.ellipse(-H * 0.005 * st.dir, -H * 0.012, H * 0.028, H * 0.011, -0.1, 0, 7); ctx.fill(); ctx.restore();
  };

  Sombra.prototype.brazo = function (ctx, st, lado, lejos) {
    const c = this.c, J = st.J, H = st.H, s = st.s + (lejos ? 70 : 20);
    const hom = J['hombro' + lado], codo = J['codo' + lado], mano = J['mano' + lado];
    const borde = lejos ? 0.2 : 0.75;
    P.forma(ctx, manguera([pt(hom), pt(codo), pt(mano)], H * 0.032, H * 0.026), { color: tono(c.tinta, lejos), semilla: s + 1, volumen: 0.7, borde, irregular: 0.6, sombraInterna: 0.4, textura: 0.1 });
    const lupa = st.pose.prop === 'lupa' && lado === 'D';
    manoToon(ctx, J, lado, st, { color: c.guante, radio: 0.046, lejos, semilla: s + 5, gesto: lupa ? 'puno' : (lado === 'D' ? st.gesto : st.gestoI) });
  };

  Sombra.prototype.torso = function (ctx, st) {
    const c = this.c, J = st.J, H = st.H, s = st.s, dir = st.dir;
    const pel = pt(J.pelvis), hom = pt(J.hombros), cue = pt(J.cuello);
    const u = J.u, v = J.v;
    const at = (p, lat, alto) => [p[0] + v[0] * lat * H + u[0] * alto * H, p[1] + v[1] * lat * H + u[1] * alto * H];
    const resp = st.resp * 0.004;
    const pts = [
      at(cue, -0.05, 0.0), at(hom, -0.1 - resp, -0.004), at(hom, -0.108, -0.05), at(pel, -0.095, 0.085), at(pel, -0.14, -0.035),
      at(pel, -0.07, -0.062), at(pel, 0.0, -0.068), at(pel, 0.07, -0.062), at(pel, 0.14, -0.035),
      at(pel, 0.095, 0.085), at(hom, 0.108, -0.05), at(hom, 0.1 + resp, -0.004), at(cue, 0.05, 0.0)
    ];
    // flecos de movimiento: el bajo se balancea un poco con el viento
    const cuerpo = P.suavizar(pts, 4);
    P.forma(ctx, cuerpo, { color: c.saco, semilla: s + 30, volumen: 0.85, borde: 0.95, anchoBorde: 6, irregular: 1.0, textura: 0.3, sombraInterna: 0.6 });
    const oscuro = I.css(I.oscurece(c.saco, 0.7), 0.9);
    ctx.save();
    // solapas en V
    const v1 = at(cue, -0.055, 0.0), v2 = at(hom, 0.0, -0.135), v3 = at(cue, 0.055, 0.0);
    P.forma(ctx, [v1, v2, v3, at(cue, 0, 0.01)], { color: I.oscurece(c.saco, 0.55), semilla: s + 31, volumen: 0.2, borde: 0, sombraInterna: 0, irregular: 0.2, plano: true });
    ctx.strokeStyle = oscuro; ctx.lineWidth = H * 0.011; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(v1[0], v1[1]); ctx.lineTo(v2[0], v2[1]); ctx.lineTo(v3[0], v3[1]); ctx.stroke();
    // cinturón + hebilla
    const b1 = at(pel, -0.092, 0.068), b2 = at(pel, 0.092, 0.068);
    ctx.strokeStyle = I.css(c.cinturon); ctx.lineWidth = H * 0.026;
    ctx.beginPath(); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
    ctx.restore();
    const hb = at(pel, 0.0, 0.068);
    P.forma(ctx, P.rect(hb[0] - H * 0.022, hb[1] - H * 0.022, H * 0.044, H * 0.044, 2), { color: c.hebilla, semilla: s + 32, volumen: 0.6, borde: 0.8, irregular: 0, textura: 0, anchoBorde: 3 });
    // botones
    for (const k of [0.2, 0.52]) {
      const b = at(pel, 0.0, 0.068 + (J.u ? 0 : 0) + k * (dist2(hom, pel) / H - 0.04) + 0.03);
      P.forma(ctx, P.elipse(b[0], b[1], H * 0.014, H * 0.014, 0, 12), { color: c.boton, semilla: s + 33, volumen: 0.5, borde: 0.8, irregular: 0, textura: 0, anchoBorde: 2, contorno: '#15131a', anchoContorno: 1.2 });
    }
    // pliegues del bajo
    ctx.save(); ctx.strokeStyle = I.css(I.oscurece(c.saco, 0.5), 0.4); ctx.lineWidth = H * 0.004; ctx.lineCap = 'round';
    for (const l of [-0.09, 0.08]) { const a = at(pel, l, 0.05), b = at(pel, l * 1.4, -0.03); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.restore();
  };

  Sombra.prototype.cabeza = function (ctx, st) {
    const c = this.c, J = st.J, H = st.H, dir = st.dir, t = st.t, s = st.s, e = st.e, ex = st.ex;
    const R0 = H * 0.2, cn = J.cuello, cb = J.cabezaBase, ca = J.cabeza;
    // cuello
    P.forma(ctx, P.capsula(cn.x, cn.y, H * 0.034, cb.x, cb.y, H * 0.03), { color: c.tinta, semilla: s + 40, volumen: 0.6, borde: 0.4, irregular: 0.3 });
    ctx.save();
    ctx.translate(ca.x, ca.y); ctx.scale(dir, 1); ctx.rotate(ca.a * 0.9 + (e.giroCabeza || 0));
    const Rr = R0;
    const lupa = st.pose.prop === 'lupa';
    // cráneo
    P.forma(ctx, P.elipse(0, 0, Rr, Rr * 1.02, 0, 44), { color: c.cabeza, semilla: s + 41, volumen: 0.75, borde: 0.95, anchoBorde: 5, irregular: 0.7, textura: 0.2, sombraInterna: 0.3 });
    // cara y hocico crema (unión)
    const cara = P.suavizar(P.elipse(Rr * 0.22, Rr * 0.14, Rr * 0.78, Rr * 0.8, 0, 28), 1), hoc = P.elipse(Rr * 0.82, Rr * 0.38, Rr * 0.52, Rr * 0.36, 0.06, 26);
    P.forma(ctx, [cara, hoc], { color: c.hocico, semilla: s + 42, volumen: 0.7, borde: 0.9, anchoBorde: 4, irregular: 0.4, textura: 0.18, sombraInterna: 0.35, nominal: [Rr * 2, Rr * 1.6] });
    // sombra bajo el sombrero sobre la cara
    ctx.save(); ctx.beginPath(); ctx.ellipse(Rr * 0.22, Rr * 0.14, Rr * 0.78, Rr * 0.8, 0, 0, 7); ctx.clip();
    const sg = ctx.createLinearGradient(0, -Rr * 0.7, 0, -Rr * 0.05); sg.addColorStop(0, 'rgba(30,20,20,0.5)'); sg.addColorStop(1, 'rgba(30,20,20,0)');
    ctx.fillStyle = sg; ctx.fillRect(-Rr, -Rr, Rr * 3, Rr); ctx.restore();
    // oreja caída (la cabeza la arrastra un poco)
    const bal = I.ruido1(t * 1.3, s + 4) * 0.05 + (ex.ceja[1] > 0.4 ? -0.5 : 0) + (e.orejaAng || 0) + (ex.boca[0] < -0.3 ? 0.12 : 0);
    ctx.save(); ctx.translate(-Rr * 0.58, -Rr * 0.3); ctx.rotate(bal); ctx.scale(0.82, 0.82);
    P.forma(ctx, P.suavizar([[Rr * 0.12, -Rr * 0.06], [Rr * 0.34, Rr * 0.15], [Rr * 0.3, Rr * 0.7], [Rr * 0.02, Rr * 1.08], [-Rr * 0.26, Rr * 0.82], [-Rr * 0.34, Rr * 0.25], [-Rr * 0.18, -Rr * 0.1]], 4),
      { color: c.oreja, semilla: s + 43, volumen: 0.8, borde: 0.85, anchoBorde: 4, irregular: 0.5, textura: 0.2, sombraInterna: 0.5 });
    ctx.restore();
    // ojos
    const parp = I.ciclos.parpadeo(t, s), mir = e.mirada || ex.mirada || [0.3, 0];
    const abre = I.clamp(ex.ojo * parp, 0.1, 1.25), lid = ex.ceja[0] * 1.0;
    const yo = -Rr * 0.1;
    const ojoN = { x: Rr * 0.3, rx: Rr * 0.165, ry: Rr * 0.255 }, ojoF = { x: Rr * 0.74, rx: Rr * 0.14, ry: Rr * 0.235 };
    for (const [oj, int, k] of [[ojoF, -1, 2], [ojoN, 1, 1]]) {
      if (lupa && k === 1) continue;
      ojoToon(ctx, oj.x, yo, oj.rx, oj.ry, { abre, mira: mir, lid, interior: int, s: s + 44 + k, crema: '#f0e6d2', tinta: '#121016' });
    }
    // nariz
    const nx = Rr * 1.3, ny = Rr * 0.2;
    P.forma(ctx, P.elipse(nx, ny, Rr * 0.2, Rr * 0.14, -0.15, 18), { color: c.nariz, semilla: s + 47, volumen: 0.7, borde: 0.8, anchoBorde: 3, irregular: 0.2, textura: 0.1 });
    ctx.fillStyle = 'rgba(190,184,176,0.75)'; ctx.beginPath(); ctx.ellipse(nx - Rr * 0.06, ny - Rr * 0.05, Rr * 0.07, Rr * 0.04, -0.35, 0, 7); ctx.fill();
    // boca
    const curv = ex.boca[0] * 0.9 + 0.28, ab = ex.boca[1], bx = Rr * 0.8, by = Rr * 0.62, bw = Rr * 0.62;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (ab > 0.05) {
      const abier = ab * Rr * 0.42;
      ctx.fillStyle = I.css('#2a1216');
      ctx.beginPath(); ctx.moveTo(bx - bw / 2, by - curv * Rr * 0.07);
      ctx.quadraticCurveTo(bx, by + curv * Rr * 0.16 - ab * Rr * 0.04, bx + bw / 2, by - curv * Rr * 0.07 - Rr * 0.02);
      ctx.quadraticCurveTo(bx + bw * 0.1, by + abier + curv * Rr * 0.07, bx - bw / 2, by - curv * Rr * 0.07); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = I.css('#c4606a'); ctx.beginPath(); ctx.ellipse(bx, by + abier * 0.95, bw * 0.3, abier * 0.55, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = I.css('#15121a'); ctx.lineWidth = Rr * 0.055;
    ctx.beginPath(); ctx.moveTo(bx - bw / 2, by - curv * Rr * 0.07);
    ctx.quadraticCurveTo(bx, by + curv * Rr * 0.16 - ab * Rr * 0.04, bx + bw / 2, by - curv * Rr * 0.07 - Rr * 0.02); ctx.stroke();
    ctx.restore();
    // lágrima (tristeza fuerte)
    if (ex.boca[0] < -0.45 && ex.ojo < 0.8) {
      const k = (t * 0.8) % 1;
      ctx.fillStyle = 'rgba(190,220,240,0.8)'; ctx.beginPath(); ctx.ellipse(ojoN.x + ojoN.rx * 0.2, yo + ojoN.ry * (0.6 + k * 1.8), Rr * 0.045, Rr * 0.07, 0, 0, 7); ctx.fill();
    }
    // sombrero fedora
    const lev = (e.sombreroAlto || 0) * Rr + I.clamp((ex.ceja[1] - 0.4) / 0.3, 0, 1) * Rr * 0.3 * (ex.ojo > 1.1 ? 1 : 0);
    ctx.save(); ctx.translate(0, -lev); ctx.rotate(-lev / Rr * 0.12);
    // sombra del ala sobre el cráneo
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = I.css('#050408'); ctx.beginPath(); ctx.ellipse(Rr * 0.05, -Rr * 0.6, Rr * 1.3, Rr * 0.3, 0, 0, 7); ctx.fill(); ctx.restore();
    P.forma(ctx, P.elipse(Rr * 0.05, -Rr * 0.68, Rr * 1.48, Rr * 0.22, 0, 36), { color: c.sombrero, semilla: s + 48, volumen: 0.8, borde: 0.95, anchoBorde: 5, irregular: 0.5, textura: 0.25, sombraInterna: 0.45 });
    const copa = P.suavizar([[-Rr * 0.64, -Rr * 0.66], [-Rr * 0.68, -Rr * 1.2], [-Rr * 0.52, -Rr * 1.5], [-Rr * 0.22, -Rr * 1.4], [Rr * 0.05, -Rr * 1.3], [Rr * 0.32, -Rr * 1.4], [Rr * 0.6, -Rr * 1.5], [Rr * 0.76, -Rr * 1.2], [Rr * 0.74, -Rr * 0.66]], 4);
    P.forma(ctx, copa, { color: c.sombrero, semilla: s + 49, volumen: 0.85, borde: 0.95, anchoBorde: 5, irregular: 0.6, textura: 0.25, sombraInterna: 0.5 });
    P.forma(ctx, P.poligono([[-Rr * 0.655, -Rr * 0.7], [-Rr * 0.67, -Rr * 0.92], [Rr * 0.75, -Rr * 0.92], [Rr * 0.735, -Rr * 0.7]]), { color: c.cinta, semilla: s + 50, volumen: 0.6, borde: 0.85, anchoBorde: 3, irregular: 0.3, textura: 0.2 });
    ctx.restore();
    ctx.restore();
  };

  // Lupa: aro dorado + cristal; el ojo grande se ve a través del lente.
  Sombra.prototype.lupa = function (ctx, st) {
    const c = this.c, J = st.J, H = st.H, dir = st.dir, s = st.s, ex = st.ex;
    const m = J.manoD, ca = J.cabeza, R0 = H * 0.2;
    // centro del lente: sobre el ojo cercano
    const loc = (lx, ly) => { const a = ca.a * 0.9, cs = Math.cos(a), sn = Math.sin(a); return [ca.x + dir * (lx * cs - ly * sn), ca.y + (lx * sn + ly * cs)]; };
    const lc = loc(R0 * 0.34, -R0 * 0.08), rl = R0 * 0.6, ang = Math.atan2(m.y - lc[1], m.x - lc[0]);
    // mango
    const mx = m.x, my = m.y;
    P.forma(ctx, P.capsula(lc[0] + Math.cos(ang) * rl, lc[1] + Math.sin(ang) * rl, H * 0.016, mx, my, H * 0.02), { color: '#6a4a30', semilla: s + 60, volumen: 0.7, borde: 0.7, irregular: 0.3 });
    // lente
    P.forma(ctx, P.elipse(lc[0], lc[1], rl, rl, 0, 40), { color: '#d7e4e8', alfa: 0.35, semilla: s + 61, volumen: 0.3, borde: 0.2, irregular: 0, textura: 0, sombraInterna: 0 });
    ctx.save(); ctx.beginPath(); ctx.arc(lc[0], lc[1], rl * 0.94, 0, 7); ctx.clip();
    ctx.translate(lc[0], lc[1]); ctx.scale(dir, 1); ctx.rotate(ca.a * 0.4);
    ojoToon(ctx, rl * 0.05, 0, rl * 0.42, rl * 0.66, { abre: ex.ojo * 1.05, mira: [0.3, 0], s: s + 62, tinta: '#121016', crema: '#f0e6d2' });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = I.css(c.cinta); ctx.lineWidth = H * 0.016; ctx.beginPath(); ctx.arc(lc[0], lc[1], rl, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = H * 0.008; ctx.beginPath(); ctx.arc(lc[0], lc[1], rl * 0.78, PI * 1.15, PI * 1.5); ctx.stroke(); ctx.restore();
    // la mano encima del mango
    manoToon(ctx, J, 'D', st, { color: c.guante, radio: 0.046, lejos: false, semilla: s + 5, gesto: 'puno' });
  };

  Sombra.prototype.cuerpo = function (ctx, st) {
    const J = st.J, H = st.H;
    if (st.e.sombraSuelo !== false) sombraSuelo(ctx, (J.tobilloD.x + J.tobilloI.x) / 2, st.y0, Math.abs(J.tobilloD.x - J.tobilloI.x) / 2 + H * 0.2, 0.5 * I.clamp(1 - st.alto / (H * 0.8), 0.2, 1));
    this.pierna(ctx, st, 'I', true); this.brazo(ctx, st, 'I', true);
    this.pierna(ctx, st, 'D', false);
    this.torso(ctx, st);
    this.cabeza(ctx, st);
    if (st.pose.prop === 'lupa') { const l = this.lupa; this.brazoSinMano(ctx, st); l.call(this, ctx, st); } else this.brazo(ctx, st, 'D', false);
  };
  Sombra.prototype.brazoSinMano = function (ctx, st) {
    const c = this.c, J = st.J, H = st.H, s = st.s + 20;
    P.forma(ctx, manguera([pt(J.hombroD), pt(J.codoD), pt(J.manoD)], H * 0.032, H * 0.026), { color: c.tinta, semilla: s + 1, volumen: 0.7, borde: 0.75, irregular: 0.6, sombraInterna: 0.4, textura: 0.1 });
  };

  R.sombra = function (o) { return new Sombra(o); };
  R.Sombra = Sombra;

  // ============================================================== TITO
  const TITO = {
    piel: '#ecd3bf', hocico: '#d2b2a0', fosa: '#3b2d2f', mejilla: '#c49d92', boina: '#36312f', boinaBanda: '#16141a', tirante: '#18161b',
    boton: '#d5ab60', mono: '#17151a', pantalon: '#51493f', zapato: '#18161b', oreja: '#e9bba8', camisa: '#efdfc9'
  };
  const PROP_TITO = { columna: 0.1, pecho: 0.17, cuello: 0.01, cabeza: 0.31, brazo: 0.14, antebrazo: 0.13, mano: 0.06, muslo: 0.085, pierna: 0.085, pie: 0.11, escalaCabeza: 1, anchoHombro: 1, curva: 0 };
  const TITO_POSES = {
    dePie: R.pose({ columna: 0.0, cuello: 0.0, brazoD: 0.3, antebrazoD: -0.05, brazoI: -0.3, antebrazoI: 0.05, musloD: 0.03, musloI: -0.03 }),
    traeObjeto: R.pose({ columna: -0.03, cuello: 0.04, cabeza: 0.02, brazoD: 0.3, antebrazoD: -1.25, brazoI: -0.3, antebrazoI: 1.25, musloD: 0.04, musloI: -0.04, prop: 'objeto' }),
    triste: R.pose({ columna: 0.05, pecho: 0.04, cuello: 0.1, cabeza: 0.1, brazoD: 0.12, antebrazoD: 0.1, brazoI: -0.14, antebrazoI: 0.06, musloD: 0.02, musloI: -0.02, raizY: 0.004 }),
    asombrado: R.pose({ columna: -0.08, pecho: -0.05, cuello: -0.04, cabeza: -0.06, brazoD: 2.5, antebrazoD: 0.25, brazoI: -2.4, antebrazoI: -0.25, musloD: 0.05, musloI: -0.07, raizY: -0.01 }),
    senalar: R.pose({ columna: 0.02, brazoD: 1.45, antebrazoD: -0.05, brazoI: -0.3, antebrazoI: 0.05, musloD: 0.04, musloI: -0.04, gesto: 'senalar' }),
    saluda: R.pose({ columna: -0.02, cabeza: -0.05, brazoD: 2.5, antebrazoD: 0.5, manoD: -0.2, brazoI: -0.3, antebrazoI: 0.05, musloD: 0.03, musloI: -0.03 })
  };

  function Tito(o = {}) {
    this.o = Object.assign({ nombre: 'Tito', altura: 430, semilla: 13, colores: {} }, o);
    this.c = Object.assign({}, TITO, this.o.colores);
    this.H = this.o.altura / 0.85;
    this.esq = new I.Esqueleto(PROP_TITO, this.H);
    this.anchos = [0.165, 0.065];
    this.poses = Object.assign({}, TITO_POSES);
    this.poses.camina = e => I.ciclos.poseCaminar(e.x, e.y, e.e.dist != null ? e.e.dist : e.t * 90, e.H, e.dir, TITO_POSES.dePie, [], { zancada: 0.1, levantar: 0.025, brazos: 0.18, rebote: 0.007 });
  }
  Tito.prototype = Object.create(Toon.prototype);

  Tito.prototype.pierna = function (ctx, st, lado, lejos) {
    const c = this.c, J = st.J, H = st.H, s = st.s + (lejos ? 50 : 0);
    const cad = J['cadera' + lado], rod = J['rodilla' + lado], tob = J['tobillo' + lado], ta = J['talon' + lado], pu = J['punta' + lado];
    const col = tono(c.pantalon, lejos), borde = lejos ? 0.2 : 0.7;
    P.forma(ctx, manguera([pt(cad), pt(rod), pt(tob)], H * 0.046, H * 0.04), { color: col, semilla: s + 1, volumen: 0.7, borde: borde * 1.15, irregular: 0.6, sombraInterna: 0.4, textura: 0.2 });
    const pf = [pu.x - ta.x, pu.y - ta.y], an = Math.atan2(pf[1], pf[0]);
    const cx = tob.x + pf[0] * 0.2, cy = tob.y + H * 0.02 - H * 0.04;
    P.forma(ctx, P.elipse(cx, cy, H * 0.105, H * 0.044, an, 24), { color: tono(c.zapato, lejos), semilla: s + 2, volumen: 0.7, borde: borde * 1.1, irregular: 0.4, sombraInterna: 0.35, textura: 0.1 });
  };

  Tito.prototype.brazo = function (ctx, st, lado, lejos) {
    const c = this.c, J = st.J, H = st.H, s = st.s + (lejos ? 70 : 20);
    const hom = J['hombro' + lado], codo = J['codo' + lado], mano = J['mano' + lado];
    P.forma(ctx, manguera([pt(hom), pt(codo), pt(mano)], H * 0.036, H * 0.03), { color: tono(c.piel, lejos), semilla: s + 1, volumen: 0.7, borde: lejos ? 0.2 : 0.8, irregular: 0.6, sombraInterna: 0.4, textura: 0.12, contorno: '#15131a', anchoContorno: 2 });
    manoToon(ctx, J, lado, st, { color: c.piel, radio: 0.05, lejos, semilla: s + 5, gesto: lado === 'D' ? st.gesto : st.gestoI });
  };

  Tito.prototype.cola = function (ctx, st) {
    const c = this.c, J = st.J, H = st.H, dir = st.dir, t = st.t, s = st.s;
    const pel = pt(J.pelvis), u = J.u, v = J.v;
    const base = [pel[0] - dir * H * 0.19 + u[0] * H * 0.07, pel[1] - H * 0.0 + u[1] * H * 0.07 + H * 0.005];
    const pts = []; const mv = I.ruido1(t * 2.2, s + 3) * 0.2 + (st.e.colita || 0);
    for (let i = 0; i <= 18; i++) { const a = -0.3 + i * 0.5 + mv * (i / 18), r = H * (0.008 + 0.045 * (1 - i / 18)); pts.push([base[0] - dir * (r * Math.cos(a) * 0.9 + i * H * 0.004), base[1] - r * Math.sin(a) * 0.9 - i * 0.0]); }
    ctx.save(); ctx.strokeStyle = I.css(I.oscurece(c.piel, 0.15)); ctx.lineWidth = H * 0.017; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.strokeStyle = I.css('#fff1d8', 0.25); ctx.lineWidth = H * 0.005; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0] - 1, p[1] - 1) : ctx.moveTo(p[0] - 1, p[1] - 1)); ctx.stroke();
    ctx.restore();
  };

  Tito.prototype.torso = function (ctx, st) {
    const c = this.c, J = st.J, H = st.H, s = st.s, dir = st.dir;
    const pel = pt(J.pelvis), u = J.u, v = J.v, resp = st.resp * 0.004;
    const cx = pel[0] + u[0] * H * 0.125, cy = pel[1] + u[1] * H * 0.125;
    const rx = H * (0.215 + resp), ry = H * (0.195 + resp * 0.6), rot = Math.atan2(u[0], -u[1]);
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const loc = (lx, ly) => [cx + lx * cr - ly * sr, cy + lx * sr + ly * cr];
    // barriga completa (pantalón) y camisa encima
    const cuerpo = P.elipse(cx, cy, rx, ry, rot, 44);
    P.forma(ctx, cuerpo, { color: c.pantalon, semilla: s + 30, volumen: 0.85, borde: 0.9, anchoBorde: 6, irregular: 0.8, textura: 0.3, sombraInterna: 0.5, nominal: [rx * 2, ry * 2] });
    const b = 0.12, ab = Math.asin(b);
    const camisa = [];
    for (let i = 0; i <= 30; i++) { const th = PI - ab + (2 * ab + PI) * i / 30 + PI * 0 - 0; const a = th; camisa.push(loc(Math.cos(a) * rx * 0.995, Math.sin(a) * ry * 0.995)); }
    P.forma(ctx, camisa, { color: c.camisa, semilla: s + 31, volumen: 0.8, borde: 0.9, anchoBorde: 6, irregular: 0.8, textura: 0.3, sombraInterna: 0.45, nominal: [rx * 2, ry * 1.2] });
    // tirantes
    const ty0 = -ry * 0.92, ty1 = ry * b;
    for (const lx of [-rx * 0.4, rx * 0.4]) {
      const sw = H * 0.017;
      P.forma(ctx, [loc(lx - sw, ty0), loc(lx + sw, ty0), loc(lx + sw, ty1 + H * 0.01), loc(lx - sw, ty1 + H * 0.01)], { color: c.tirante, semilla: s + 32, volumen: 0.5, borde: 0.5, irregular: 0.2, textura: 0.1, anchoBorde: 2 });
      const bt = loc(lx, ty1 + H * 0.03);
      P.forma(ctx, P.elipse(bt[0], bt[1], H * 0.017, H * 0.017, 0, 14), { color: c.boton, semilla: s + 33, volumen: 0.7, borde: 0.9, irregular: 0, textura: 0, anchoBorde: 2, contorno: '#15131a', anchoContorno: 1.2 });
    }
    // ombligo / pliegue de la panza
    ctx.save(); ctx.strokeStyle = I.css(I.oscurece(c.camisa, 0.4), 0.35); ctx.lineWidth = H * 0.004; ctx.lineCap = 'round';
    const o1 = loc(-rx * 0.06, ry * -0.3), o2 = loc(rx * 0.02, ry * -0.1); ctx.beginPath(); ctx.moveTo(o1[0], o1[1]); ctx.quadraticCurveTo(o1[0] + dir * H * 0.01, (o1[1] + o2[1]) / 2, o2[0], o2[1]); ctx.stroke(); ctx.restore();
  };

  Tito.prototype.cabeza = function (ctx, st) {
    const c = this.c, J = st.J, H = st.H, dir = st.dir, t = st.t, s = st.s, e = st.e, ex = st.ex;
    const Rr = H * 0.172, ca = J.cabeza;
    ctx.save();
    ctx.translate(ca.x, ca.y); ctx.scale(dir, 1); ctx.rotate(ca.a * 0.9 + (e.giroCabeza || 0));
    const triste = I.clamp(-ex.boca[0], 0, 1), alto = ex.ceja[1] > 0.45;
    // oreja lejana (asoma tras la boina; cae cuando está triste)
    const eAng = -0.2 + triste * 1.25 + (alto ? -0.25 : 0) + I.ruido1(t * 1.5, s + 2) * 0.04;
    const oreja = (px, py, ang, k) => {
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
      P.forma(ctx, P.suavizar([[-Rr * 0.18 * k, Rr * 0.05], [-Rr * 0.04 * k, -Rr * 0.5 * k], [Rr * 0.12 * k, -Rr * 0.62 * k], [Rr * 0.22 * k, Rr * 0.05]], 4), { color: c.piel, semilla: s + 41, volumen: 0.7, borde: 0.8, irregular: 0.3, textura: 0.1, contorno: '#15131a', anchoContorno: 2.2 });
      P.forma(ctx, P.suavizar([[-Rr * 0.08 * k, Rr * 0.0], [0, -Rr * 0.34 * k], [Rr * 0.1 * k, -Rr * 0.4 * k], [Rr * 0.14 * k, Rr * 0.0]], 3), { color: c.oreja, semilla: s + 42, volumen: 0.3, borde: 0, irregular: 0.1, sombraInterna: 0 });
      ctx.restore();
    };
    oreja(Rr * 0.6, -Rr * 0.72, eAng + 0.35, 0.95);
    // cabeza
    P.forma(ctx, P.elipse(0, 0, Rr, Rr * 0.96, 0, 44), { color: c.piel, semilla: s + 43, volumen: 0.75, borde: 0.9, anchoBorde: 5, irregular: 0.5, textura: 0.15, sombraInterna: 0.35, contorno: '#15131a', anchoContorno: 2.4 });
    // mejillas
    for (const [mx, my, mr] of [[Rr * 0.05, Rr * 0.3, Rr * 0.2], [Rr * 0.92, Rr * 0.3, Rr * 0.14]]) {
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, mr); g.addColorStop(0, I.css(c.mejilla, 0.7 * (0.4 + ex.mejillas))); g.addColorStop(1, I.css(c.mejilla, 0));
      ctx.fillStyle = g; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    }
    // ojos
    const parp = I.ciclos.parpadeo(t, s + 3), mir = e.mirada || ex.mirada || [0.3, 0];
    const abre = I.clamp(ex.ojo * parp, 0.1, 1.25), lid = ex.ceja[0] * 1.0;
    const yo = -Rr * 0.2;
    ojoToon(ctx, Rr * 0.72, yo, Rr * 0.12, Rr * 0.22, { abre, mira: mir, lid, interior: -1, s: s + 44, crema: '#f2e8d6', tinta: '#15131a' });
    ojoToon(ctx, Rr * 0.28, yo, Rr * 0.14, Rr * 0.25, { abre, mira: mir, lid, interior: 1, s: s + 45, crema: '#f2e8d6', tinta: '#15131a' });
    // hocico
    const hx = Rr * 0.6, hy = Rr * 0.22;
    P.forma(ctx, P.elipse(hx, hy, Rr * 0.42, Rr * 0.3, 0, 28), { color: c.hocico, semilla: s + 46, volumen: 0.8, borde: 0.85, anchoBorde: 3, irregular: 0.3, textura: 0.1, sombraInterna: 0.4, contorno: '#15131a', anchoContorno: 2.2 });
    ctx.fillStyle = I.css(c.fosa);
    for (const dx of [-0.1, 0.17]) { ctx.beginPath(); ctx.ellipse(hx + Rr * dx, hy - Rr * 0.01, Rr * 0.05, Rr * 0.085, 0, 0, 7); ctx.fill(); }
    // boca
    const [curv, ab] = ex.boca, bx = hx - Rr * 0.04, by = Rr * 0.62, bw = Rr * 0.55;
    ctx.save(); ctx.lineCap = 'round';
    if (ab > 0.05) {
      const abier = ab * Rr * 0.36;
      ctx.fillStyle = I.css('#32151a'); ctx.beginPath(); ctx.moveTo(bx - bw / 2, by - curv * Rr * 0.06);
      ctx.quadraticCurveTo(bx, by + curv * Rr * 0.14, bx + bw / 2, by - curv * Rr * 0.06); ctx.quadraticCurveTo(bx, by + abier + curv * Rr * 0.05, bx - bw / 2, by - curv * Rr * 0.06); ctx.fill();
    }
    ctx.strokeStyle = I.css('#15121a'); ctx.lineWidth = Rr * 0.05;
    ctx.beginPath(); ctx.moveTo(bx - bw / 2, by - curv * Rr * 0.06); ctx.quadraticCurveTo(bx, by + curv * Rr * 0.14, bx + bw / 2, by - curv * Rr * 0.06); ctx.stroke(); ctx.restore();
    if (ex.boca[0] < -0.45 && ex.ojo < 0.8) {
      const k = (t * 0.8) % 1; ctx.fillStyle = 'rgba(190,220,240,0.8)'; ctx.beginPath(); ctx.ellipse(Rr * 0.38, yo + Rr * (0.22 + k * 0.55), Rr * 0.045, Rr * 0.07, 0, 0, 7); ctx.fill();
    }
    // oreja cercana (parte trasera)
    oreja(-Rr * 0.5, -Rr * 0.66, -0.7 - triste * 0.3 + eAng * 0.3, 0.8);
    // boina: cuerpo achatado que se asoma hacia atrás + banda oscura
    const lev = (e.sombreroAlto || 0) * Rr + (ex.ceja[1] > 0.5 && ex.ojo > 1.05 ? Rr * 0.18 : 0);
    ctx.save(); ctx.translate(0, -lev); ctx.rotate(-0.07 - lev / Rr * 0.1);
    const boina = P.suavizar([[-Rr * 1.12, -Rr * 0.5], [-Rr * 0.8, -Rr * 1.0], [-Rr * 0.1, -Rr * 1.22], [Rr * 0.7, -Rr * 1.08], [Rr * 1.05, -Rr * 0.7], [Rr * 0.9, -Rr * 0.55], [Rr * 0.3, -Rr * 0.62], [-Rr * 0.5, -Rr * 0.5]], 4);
    P.forma(ctx, boina, { color: c.boina, semilla: s + 48, volumen: 0.85, borde: 0.9, anchoBorde: 5, irregular: 0.6, textura: 0.3, sombraInterna: 0.5, contorno: '#0d0c10', anchoContorno: 2.4 });
    P.forma(ctx, P.elipse(Rr * 0.62, -Rr * 0.62, Rr * 0.54, Rr * 0.12, -0.05, 24), { color: c.boinaBanda, semilla: s + 49, volumen: 0.7, borde: 0.8, irregular: 0.3, textura: 0.2, anchoBorde: 3 });
    P.forma(ctx, P.elipse(-Rr * 0.28, -Rr * 1.22, Rr * 0.1, Rr * 0.07, 0, 12), { color: c.boinaBanda, semilla: s + 50, volumen: 0.6, borde: 0.9, irregular: 0, textura: 0, anchoBorde: 2 });
    ctx.restore();
    ctx.restore();
    // moñito bajo la barbilla
    const cn = J.cuello, bwt = H * 0.05, bo = [cn.x + dir * H * 0.01, cn.y - H * 0.012];
    P.forma(ctx, [[bo[0] - bwt, bo[1] - bwt * 0.55], [bo[0], bo[1]], [bo[0] - bwt, bo[1] + bwt * 0.55]], { color: c.mono, semilla: s + 51, volumen: 0.5, borde: 0.6, irregular: 0.2, textura: 0.1, anchoBorde: 2 });
    P.forma(ctx, [[bo[0] + bwt, bo[1] - bwt * 0.55], [bo[0], bo[1]], [bo[0] + bwt, bo[1] + bwt * 0.55]], { color: c.mono, semilla: s + 52, volumen: 0.5, borde: 0.6, irregular: 0.2, textura: 0.1, anchoBorde: 2 });
    P.forma(ctx, P.elipse(bo[0], bo[1], bwt * 0.28, bwt * 0.28, 0, 10), { color: c.mono, semilla: s + 53, volumen: 0.4, borde: 0.5, irregular: 0, anchoBorde: 2 });
  };

  // objeto que lleva con ambas manos (entre las manos, delante de la panza)
  Tito.prototype.objeto = function (ctx, st) {
    const J = st.J, H = st.H, dir = st.dir, o = st.e.objeto || 'caja', s = st.s;
    const a = J.manoD, b = J.manoI, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const w = Math.max(H * 0.16, Math.abs(a.x - b.x) + H * 0.12);
    ctx.save();
    if (typeof o === 'function') { o(ctx, cx, cy, w, st); ctx.restore(); return; }
    if (o === 'carpeta') {
      P.forma(ctx, P.rect(cx - w * 0.55, cy - H * 0.11, w * 1.1, H * 0.2, 4), { color: '#b8924f', semilla: s + 70, volumen: 0.7, borde: 0.8, irregular: 0.3, textura: 0.4, anchoBorde: 3 });
      P.forma(ctx, P.rect(cx - w * 0.55, cy - H * 0.125, w * 0.4, H * 0.025, 3), { color: '#a07d3f', semilla: s + 71, volumen: 0.5, borde: 0.5, irregular: 0.2 });
      ctx.fillStyle = I.css('#efe4cc'); ctx.fillRect(cx - w * 0.4, cy - H * 0.09, w * 0.8, H * 0.018);
    } else if (o === 'sobre') {
      P.forma(ctx, P.rect(cx - w * 0.5, cy - H * 0.07, w, H * 0.13, 3), { color: '#e6d8b8', semilla: s + 70, volumen: 0.6, borde: 0.8, irregular: 0.3, textura: 0.3, anchoBorde: 3 });
      ctx.strokeStyle = I.css('#a89468', 0.8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - w * 0.5, cy - H * 0.07); ctx.lineTo(cx, cy - H * 0.005); ctx.lineTo(cx + w * 0.5, cy - H * 0.07); ctx.stroke();
      P.forma(ctx, P.elipse(cx, cy - H * 0.005, H * 0.016, H * 0.016, 0, 12), { color: '#a6342c', semilla: s + 72, volumen: 0.7, borde: 0.6, irregular: 0, anchoBorde: 2 });
    } else { // caja de cartón con cinta
      P.forma(ctx, P.rect(cx - w * 0.55, cy - H * 0.12, w * 1.1, H * 0.19, 3), { color: '#a98456', semilla: s + 70, volumen: 0.7, borde: 0.8, irregular: 0.4, textura: 0.5, anchoBorde: 3 });
      ctx.fillStyle = I.css('#d8c7a0', 0.8); ctx.fillRect(cx - w * 0.07, cy - H * 0.12, w * 0.14, H * 0.19);
    }
    ctx.restore();
  };

  Tito.prototype.cuerpo = function (ctx, st) {
    const J = st.J, H = st.H, ob = st.pose.prop === 'objeto' || !!st.e.llevaObjeto;
    if (st.e.sombraSuelo !== false) sombraSuelo(ctx, (J.tobilloD.x + J.tobilloI.x) / 2, st.y0, Math.abs(J.tobilloD.x - J.tobilloI.x) / 2 + H * 0.22, 0.5 * I.clamp(1 - st.alto / (H * 0.8), 0.2, 1));
    this.cola(ctx, st);
    this.pierna(ctx, st, 'I', true);
    if (!ob) this.brazo(ctx, st, 'I', true);
    this.pierna(ctx, st, 'D', false);
    this.torso(ctx, st);
    this.cabeza(ctx, st);
    if (ob) { this.objeto(ctx, st); this.brazo(ctx, st, 'I', true); }
    this.brazo(ctx, st, 'D', false);
  };

  R.tito = function (o) { return new Tito(o); };
  R.Tito = Tito;
  R.Toon = Toon;
})(window);
