/* Ilustra — personaje articulado con volumen: cuerpo, ropa, cara expresiva, pelo y bufanda con viento. */
(function (G) {
  'use strict';
  const I = G.Ilustra, P = I.Pincel;

  I.EXPRESIONES = {
    neutra: { ceja: [0, 0], ojo: 0.92, boca: [0.12, 0], mejillas: 0.3, mirada: [0, 0] },
    alegre: { ceja: [-0.1, 0.12], ojo: 0.72, boca: [0.85, 0.28], mejillas: 0.65 },
    ternura: { ceja: [-0.3, 0.06], ojo: 0.68, boca: [0.45, 0], mejillas: 0.6 },
    triste: { ceja: [-0.6, 0.02], ojo: 0.62, boca: [-0.55, 0], mejillas: 0.2 },
    sorpresa: { ceja: [-0.15, 0.4], ojo: 1.08, boca: [0, 0.55], mejillas: 0.3 },
    enfado: { ceja: [0.65, -0.12], ojo: 0.78, boca: [-0.35, 0.08], mejillas: 0.15 },
    pensativa: { ceja: [0.2, 0.05], ojo: 0.7, boca: [-0.1, 0], mejillas: 0.25 }
  };
  I.mezclarExpresiones = function (a, b, k) {
    if (typeof a === 'string') a = I.EXPRESIONES[a]; if (typeof b === 'string') b = I.EXPRESIONES[b];
    return I.interp(Object.assign({}, I.EXPRESIONES.neutra, a), Object.assign({}, I.EXPRESIONES.neutra, b), k);
  };

  I.Personaje = function (o = {}) {
    this.o = Object.assign({
      nombre: 'Personaje', tipo: 'adulto', altura: 420, semilla: 11,
      piel: '#e6b48f', pelo: '#3a2a26', peinado: 'melena', ojos: '#3b2a22',
      abrigo: { color: '#c89a4a', largo: 0.62, cuello: true }, bufanda: { color: '#3f6f73' },
      pantalon: '#3b3f4c', zapatos: '#2a2524', camisa: '#d9d2c3', medias: null
    }, o);
    this.esq = new I.Esqueleto(this.o.tipo, this.o.altura);
  };

  const Pr = I.Personaje.prototype;

  // estado: {x, y, dir, pose, expresion, mirada, viento, vista, silueta, luz, paraguas:{color}|null}
  Pr.dibujar = function (ctx, t, e) {
    const o = this.o, H = o.altura, dir = e.dir || 1;
    const luzPrev = I.luzActual; if (e.luz) I.luzActual = e.luz;
    const resp = I.ciclos.respirar(t + o.semilla, { amp: 0.01 });
    const pose = I.sumarPoses(e.pose || I.POSES.dePie, resp, e.respiracion == null ? 1 : e.respiracion);
    const J = this.esq.resolver(e.x, e.y, pose, dir);
    this.ultimas = J;
    const st = { t, e, J, H, dir, viento: e.viento || 0, resp: resp.respiro, s: o.semilla, pose };
    if (e.sombraSuelo !== false) this.sombraSuelo(ctx, st);
    // orden de capas
    this.pierna(ctx, st, 'I', true);
    if (e.vista !== 'espalda') this.brazo(ctx, st, 'I', true);
    this.pierna(ctx, st, 'D', false);
    if (e.vista === 'espalda') { this.brazo(ctx, st, 'I', true); this.brazo(ctx, st, 'D', true); }
    if (e.paraguas) this.paraguas(ctx, st, e.paraguas, 'mango');
    this.torso(ctx, st);
    this.cabeza(ctx, st);
    if (o.bufanda) this.bufanda(ctx, st);
    if (e.vista !== 'espalda') this.brazo(ctx, st, 'D', false);
    if (e.paraguas) this.paraguas(ctx, st, e.paraguas, 'copa');
    I.luzActual = luzPrev;
    return J;
  };

  Pr.sombraSuelo = function (ctx, st) {
    const J = st.J, H = st.H, y = st.e.y;
    ctx.save();
    const cx = (J.tobilloD.x + J.tobilloI.x) / 2, w = Math.abs(J.tobilloD.x - J.tobilloI.x) / 2 + H * 0.12;
    const g = ctx.createRadialGradient(cx, y, 0, cx, y, w);
    g.addColorStop(0, 'rgba(14,16,24,0.55)'); g.addColorStop(1, 'rgba(14,16,24,0)');
    ctx.fillStyle = g; ctx.translate(cx, y); ctx.scale(1, 0.16); ctx.translate(-cx, -y);
    ctx.fillRect(cx - w, y - w, w * 2, w * 2);
    ctx.restore();
  };

  function tono(c, lejos) { return lejos ? I.oscurece(c, 0.2) : I.color(c); }
  function pt(j) { return [j.x, j.y]; }

  Pr.pierna = function (ctx, st, lado, lejos) {
    const o = this.o, J = st.J, H = st.H, s = st.s + (lejos ? 50 : 0);
    const cad = J['cadera' + lado], rod = J['rodilla' + lado], tob = J['tobillo' + lado];
    const col = tono(o.pantalon, lejos);
    const borde = lejos ? 0.25 : 0.7;
    P.forma(ctx, P.capsula(cad.x, cad.y, H * 0.05, rod.x, rod.y, H * 0.037), { color: col, semilla: s + 1, volumen: 0.7, borde, irregular: 0.8 });
    P.forma(ctx, P.capsula(rod.x, rod.y, H * 0.036, tob.x, tob.y, H * 0.026), { color: col, semilla: s + 2, volumen: 0.7, borde, irregular: 0.8 });
    // zapato
    const ta = J['talon' + lado], pu = J['punta' + lado];
    const zc = tono(o.zapatos, lejos);
    const zap = P.suavizar([
      [ta.x, ta.y - H * 0.028], [tob.x + (pu.x - ta.x) * 0.2, tob.y - H * 0.008], [pu.x - (pu.x - ta.x) * 0.15, pu.y - H * 0.026],
      [pu.x + (pu.x - ta.x) * 0.04, pu.y - H * 0.008], [pu.x - (pu.x - ta.x) * 0.02, pu.y + H * 0.005], [ta.x, ta.y + H * 0.005]], 3);
    P.forma(ctx, zap, { color: zc, semilla: s + 3, volumen: 0.6, borde: borde * 0.9, irregular: 0.5, textura: 0.15 });
  };

  Pr.brazo = function (ctx, st, lado, lejos) {
    const o = this.o, J = st.J, H = st.H, s = st.s + (lejos ? 70 : 20);
    const hom = J['hombro' + lado], codo = J['codo' + lado], mano = J['mano' + lado], dedos = J['dedos' + lado];
    const col = tono(o.abrigo.color, lejos);
    const borde = lejos ? 0.2 : 0.75;
    P.forma(ctx, P.capsula(hom.x, hom.y, H * 0.036, codo.x, codo.y, H * 0.03), { color: col, semilla: s + 1, volumen: 0.65, borde, irregular: 0.9 });
    P.forma(ctx, P.capsula(codo.x, codo.y, H * 0.03, mano.x, mano.y, H * 0.028), { color: col, semilla: s + 2, volumen: 0.65, borde, irregular: 0.9 });
    // puño de la manga
    const ax = mano.x - codo.x, ay = mano.y - codo.y, l = Math.hypot(ax, ay) || 1;
    const px = mano.x - ax / l * H * 0.012, py = mano.y - ay / l * H * 0.012;
    P.forma(ctx, P.elipse(px, py, H * 0.03, H * 0.016, Math.atan2(ay, ax) + Math.PI / 2, 16), { color: I.oscurece(col, 0.12), semilla: s + 4, volumen: 0.5, borde: borde * 0.6, irregular: 0.4 });
    // mano (mitón con pulgar)
    const piel = tono(o.piel, lejos);
    const a = Math.atan2(dedos.y - mano.y, dedos.x - mano.x);
    const mx = mano.x + Math.cos(a) * H * 0.022, my = mano.y + Math.sin(a) * H * 0.022;
    if (st.e.vista !== 'espalda' && st.e.manoOculta !== lado && st.e.manoOculta !== true) {
      P.forma(ctx, P.elipse(mx, my, H * 0.029, H * 0.02, a, 18), { color: piel, semilla: s + 5, volumen: 0.6, borde: borde, irregular: 0.5, textura: 0.12 });
      const pa = a - st.dir * 0.9;
      P.forma(ctx, P.capsula(mano.x + Math.cos(pa) * H * 0.006, mano.y + Math.sin(pa) * H * 0.006, H * 0.009, mano.x + Math.cos(pa) * H * 0.026, mano.y + Math.sin(pa) * H * 0.026, H * 0.007),
        { color: piel, semilla: s + 6, volumen: 0.4, borde: 0.3, irregular: 0.2, textura: 0 });
    }
  };

  Pr.torso = function (ctx, st) {
    const o = this.o, J = st.J, H = st.H, dir = st.dir, t = st.t, s = st.s;
    const pel = pt(J.pelvis), cin = pt(J.cintura), hom = pt(J.hombros), cue = pt(J.cuello);
    const ux = hom[0] - pel[0], uy = hom[1] - pel[1], ul = Math.hypot(ux, uy);
    const u = [ux / ul, uy / ul], f = [-u[1] * dir, u[0] * dir];
    const at = (p, fw, alto = 0) => [p[0] + f[0] * fw * H * dir + u[0] * alto * H, p[1] + f[1] * fw * H * dir + u[1] * alto * H];
    // nota: f ya incluye dir; fw positivo = hacia delante
    const fr = (p, fw, alto = 0) => [p[0] + f[0] * fw * H + u[0] * alto * H, p[1] + f[1] * fw * H + u[1] * alto * H];
    const ab = o.abrigo, largo = (ab.largo == null ? 0.62 : ab.largo) * 0.45 * H;
    const resp = st.resp * 0.004;
    // bajo del abrigo: cuelga de la cadena muslo->pierna de cada lado a una distancia 'largo' de la cadera
    // (así sirve igual de pie, caminando, corriendo o sentado)
    const enCadena = lado => {
      const c = J['cadera' + lado], r = J['rodilla' + lado], tb = J['tobillo' + lado];
      const l1 = Math.hypot(r.x - c.x, r.y - c.y);
      if (largo <= l1) { const k = largo / l1; return [c.x + (r.x - c.x) * k, c.y + (r.y - c.y) * k]; }
      const l2 = Math.hypot(tb.x - r.x, tb.y - r.y), k = Math.min(1, (largo - l1) / l2);
      return [r.x + (tb.x - r.x) * k, r.y + (tb.y - r.y) * k];
    };
    const cD = enCadena('D'), cI = enCadena('I');
    const fwd = q => (q[0] - pel[0]) * dir;
    const [pF, pB] = fwd(cD) >= fwd(cI) ? [cD, cI] : [cI, cD];
    const vie = st.viento, ond = k => I.ruido1(t * 1.6 + k, s + 3) * H * 0.012 * (0.4 + vie);
    const fF = Math.max(fwd(pF) + H * 0.05, H * 0.075), fB = Math.min(fwd(pB) - H * 0.05, -H * 0.078);
    const hemF = [pel[0] + dir * (fF + ond(0)), Math.max(pF[1], pel[1] + H * 0.04) + H * 0.01 + ond(4) * 0.5];
    const hemB = [pel[0] + dir * (fB - vie * H * 0.04 + ond(2)), Math.max(pB[1], pel[1] + H * 0.04) - H * 0.004 + ond(5) * 0.6];
    const hemM = [(hemF[0] + hemB[0]) / 2 - dir * vie * H * 0.01, (hemF[1] + hemB[1]) / 2 + H * 0.014];
    const hemY = hemM[1];
    const pts = [
      fr(cue, -0.03, -0.005), fr(hom, -0.07 - resp, -0.005), fr(hom, -0.076, -0.06), fr(cin, -0.06, 0.03), fr(cin, -0.055, -0.035),
      fr(pel, -0.072, 0.0), hemB, hemM, hemF, fr(pel, 0.068, 0.0), fr(cin, 0.052, -0.035), fr(cin, 0.064 + resp, 0.06), fr(hom, 0.062 + resp, -0.04),
      fr(hom, 0.045, 0.0), fr(cue, 0.03, -0.005)
    ];
    const cuerpo = P.suavizar(pts, 4);
    P.forma(ctx, cuerpo, { color: ab.color, semilla: s + 30, volumen: 0.8, borde: 0.95, anchoBorde: 6, irregular: 1.4, textura: 0.32, sombraInterna: 0.6 });
    // detalles: borde delantero del abrigo, cinturón, bolsillo, botones
    const L = I.luzActual, oscuro = I.css(I.oscurece(ab.color, 0.45), 0.65);
    ctx.save();
    ctx.strokeStyle = oscuro; ctx.lineWidth = H * 0.004; ctx.lineCap = 'round';
    const a1 = fr(cue, 0.02, -0.02), a2 = fr(cin, 0.035, 0.02), a3 = [hemF[0] - dir * H * 0.02, hemF[1] - H * 0.004];
    ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.quadraticCurveTo(a2[0], a2[1], a3[0], a3[1]); ctx.stroke();
    // cinturón
    const c1 = fr(cin, -0.064, -0.035), c2 = fr(cin, 0.062, -0.035);
    ctx.lineWidth = H * 0.016; ctx.strokeStyle = I.css(I.oscurece(ab.color, 0.25), 0.9);
    ctx.beginPath(); ctx.moveTo(c1[0], c1[1]); ctx.quadraticCurveTo((c1[0] + c2[0]) / 2, (c1[1] + c2[1]) / 2 + H * 0.006, c2[0], c2[1]); ctx.stroke();
    // botones
    ctx.fillStyle = I.css(I.oscurece(ab.color, 0.55), 0.85);
    for (const k of [0.25, 0.55]) { const b = fr([I.lerp(cin[0], hom[0], k), I.lerp(cin[1], hom[1], k)], 0.05); ctx.beginPath(); ctx.arc(b[0], b[1], H * 0.0055, 0, 7); ctx.fill(); }
    // bolsillo
    const b1 = fr(pel, 0.0, 0.0), b2 = fr(pel, 0.055, -0.005);
    ctx.lineWidth = H * 0.004; ctx.strokeStyle = oscuro;
    ctx.beginPath(); ctx.moveTo(b1[0], b1[1] + H * 0.03); ctx.lineTo(b2[0], b2[1] + H * 0.03); ctx.stroke();
    // pliegues
    ctx.lineWidth = H * 0.003; ctx.strokeStyle = I.css(I.oscurece(ab.color, 0.4), 0.35);
    const p1 = fr(pel, -0.02, -0.02);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.quadraticCurveTo(p1[0] - dir * H * 0.01, p1[1] + largo * 0.6, hemM[0] - dir * H * 0.01, hemM[1] - H * 0.01); ctx.stroke();
    ctx.restore();
    // cuello del abrigo (solapa alta)
    if (ab.cuello) {
      const col = P.suavizar([fr(cue, -0.045, -0.01), fr(cue, -0.04, 0.035), fr(cue, 0.0, 0.01), fr(cue, 0.04, 0.03), fr(cue, 0.045, -0.025), fr(hom, 0.03, -0.05), fr(hom, -0.05, -0.04)], 3);
      P.forma(ctx, col, { color: I.oscurece(ab.color, 0.08), semilla: s + 31, volumen: 0.7, borde: 0.8, irregular: 0.8 });
    }
    this._f = f; this._u = u;
  };

  // dibuja la cabeza en el marco local (origen en el centro, mirando a +x, y hacia abajo)
  Pr.cabeza = function (ctx, st) {
    const o = this.o, J = st.J, H = st.H, dir = st.dir, t = st.t, s = st.s, e = st.e;
    const prop = J.prop, R = H * 0.066 * prop.escalaCabeza, Ry = H * 0.078 * prop.escalaCabeza;
    // cuello
    const cue = J.cuello, cb = J.cabezaBase;
    P.forma(ctx, P.capsula(cue.x, cue.y, H * 0.026, cb.x + dir * H * 0.004, cb.y, H * 0.024), { color: I.oscurece(o.piel, 0.12), semilla: s + 40, volumen: 0.6, borde: 0.5, irregular: 0.4, textura: 0.1 });
    const c = J.cabeza;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(dir, 1);
    ctx.rotate(c.a * 0.9);
    const esp = e.vista === 'espalda';
    const vie = st.viento;
    // pelo trasero
    this.pelo(ctx, st, R, Ry, 'atras');
    // cráneo / cara
    const cara = P.elipse(0, 0, R, Ry, 0, 36).map(([x, y]) => {
      let k = y > 0 ? (1 - 0.28 * Math.pow(y / Ry, 2)) : 1;
      if (x < 0) k *= 1.04;
      return [x * k + (y > 0 ? R * 0.16 * (y / Ry) : 0) + R * 0.04, y];
    });
    if (esp) {
      P.forma(ctx, cara, { color: o.piel, semilla: s + 41, volumen: 0.7, borde: 0.9, irregular: 0.6, textura: 0.12 });
      this.pelo(ctx, st, R, Ry, 'espalda');
      ctx.restore(); return;
    }
    P.forma(ctx, cara, { color: o.piel, semilla: s + 41, volumen: 0.65, borde: 0.9, anchoBorde: 4, irregular: 0.6, textura: 0.12, sombraInterna: 0.3 });
    // oreja
    P.forma(ctx, P.elipse(-R * 0.42, Ry * 0.12, R * 0.13, R * 0.2, 0.15, 14), { color: I.oscurece(o.piel, 0.12), semilla: s + 42, volumen: 0.5, borde: 0.15, irregular: 0.3, textura: 0.1 });
    // expresión
    let ex = e.expresion || 'neutra';
    if (typeof ex === 'string') ex = I.EXPRESIONES[ex] || I.EXPRESIONES.neutra;
    ex = Object.assign({}, I.EXPRESIONES.neutra, ex);
    const parp = I.ciclos.parpadeo(t, s);
    const fc = R * 0.42;
    // mejillas
    const mej = ex.mejillas;
    for (const [mx, my, mr] of [[fc - R * 0.4, Ry * 0.42, R * 0.26], [fc + R * 0.45, Ry * 0.4, R * 0.14]]) {
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      g.addColorStop(0, I.css('#e07a6a', 0.45 * mej)); g.addColorStop(1, I.css('#e07a6a', 0));
      ctx.fillStyle = g; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    }
    // ojos
    const mir = e.mirada || ex.mirada || [0, 0];
    const ojos = [{ x: fc - R * 0.3, k: 1 }, { x: fc + R * 0.34, k: 0.72 }];
    const yo = Ry * 0.08;
    const apert = I.clamp(ex.ojo * parp, 0.05, 1.15);
    for (const oj of ojos) {
      const rx = R * 0.145 * oj.k, ry = R * 0.165;
      ctx.save();
      // blanco
      const blanco = P.elipse(oj.x, yo, rx, ry * Math.min(1, apert + 0.05), 0, 20);
      ctx.fillStyle = I.css('#efe6da'); const pb = P.aPath(blanco); ctx.fill(pb);
      ctx.clip(pb);
      // iris y pupila
      const ix = oj.x + rx * 0.25 + mir[0] * rx * 0.45, iy = yo + ry * 0.05 + mir[1] * ry * 0.35;
      ctx.fillStyle = I.css(o.ojos); ctx.beginPath(); ctx.ellipse(ix, iy, R * 0.105 * oj.k, R * 0.12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = I.css(I.oscurece(o.ojos, 0.6)); ctx.beginPath(); ctx.ellipse(ix, iy, R * 0.055 * oj.k, R * 0.065, 0, 0, 7); ctx.fill();
      // sombra del párpado sobre el ojo
      ctx.fillStyle = I.css(I.oscurece(o.piel, 0.4), 0.35); ctx.fillRect(oj.x - rx, yo - ry, rx * 2, ry * 0.55);
      // brillo
      ctx.fillStyle = 'rgba(255,250,240,0.92)'; ctx.beginPath(); ctx.arc(ix - R * 0.035 * oj.k + R * 0.02, iy - R * 0.045, R * 0.032, 0, 7); ctx.fill();
      ctx.restore();
      // párpado superior (línea de pestañas)
      const lid = ry * Math.min(1, apert + 0.05);
      ctx.save();
      ctx.strokeStyle = I.css(I.oscurece(o.pelo, 0.3), 0.95); ctx.lineWidth = R * 0.055; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(oj.x, yo, rx * 1.02, lid, 0, Math.PI * 1.08, Math.PI * 1.95); ctx.stroke();
      if (apert < 0.3) { ctx.beginPath(); ctx.moveTo(oj.x - rx, yo); ctx.quadraticCurveTo(oj.x, yo + R * 0.05, oj.x + rx, yo); ctx.stroke(); }
      // párpado inferior suave
      ctx.strokeStyle = I.css(I.oscurece(o.piel, 0.3), 0.4); ctx.lineWidth = R * 0.025;
      ctx.beginPath(); ctx.ellipse(oj.x, yo, rx * 0.9, lid * 0.95, 0, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
      ctx.restore();
      // ceja
      const [incl, alt] = ex.ceja;
      const cy = yo - ry - R * 0.16 - alt * R * 0.25;
      const interior = oj.k === 1 ? 1 : -1; // el interior está hacia el centro de la cara
      const xin = oj.x + interior * rx * 0.9, xout = oj.x - interior * rx * 1.05;
      const yin = cy + incl * R * 0.13, yout = cy - incl * R * 0.03 + R * 0.02;
      P.forma(ctx, P.cinta([[xout, yout], [oj.x, cy - R * 0.045], [xin, yin]], R * 0.04, R * 0.075), { color: I.oscurece(o.pelo, 0.1), semilla: s + 43 + oj.k * 10, volumen: 0.2, borde: 0, sombraInterna: 0, irregular: 0.3, textura: 0 });
    }
    // nariz
    const nz = P.suavizar([[fc + R * 0.08, yo + Ry * 0.08], [fc + R * 0.3, Ry * 0.4], [fc + R * 0.22, Ry * 0.48], [fc + R * 0.04, Ry * 0.46], [fc + R * 0.08, Ry * 0.3]], 3);
    P.forma(ctx, nz, { color: I.oscurece(o.piel, 0.04), semilla: s + 44, volumen: 0.9, borde: 0.6, anchoBorde: 2, irregular: 0.2, textura: 0, sombraInterna: 0.5 });
    ctx.fillStyle = I.css(I.oscurece(o.piel, 0.45), 0.5); ctx.beginPath(); ctx.ellipse(fc + R * 0.14, Ry * 0.45, R * 0.04, R * 0.02, 0, 0, 7); ctx.fill();
    // boca
    const [curv, ab] = ex.boca;
    const bx = fc + R * 0.02, by = Ry * 0.66, bw = R * 0.36;
    ctx.save();
    if (ab > 0.02) {
      ctx.fillStyle = I.css('#5a2a2a');
      ctx.beginPath(); ctx.moveTo(bx - bw / 2, by - curv * Ry * 0.06);
      ctx.quadraticCurveTo(bx, by + curv * Ry * 0.1 - ab * Ry * 0.05, bx + bw / 2 * 0.8, by - curv * Ry * 0.06);
      ctx.quadraticCurveTo(bx, by + curv * Ry * 0.06 + ab * Ry * 0.22, bx - bw / 2, by - curv * Ry * 0.06);
      ctx.fill();
    }
    ctx.strokeStyle = I.css('#7b3b37', 0.9); ctx.lineWidth = R * 0.045; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx - bw / 2, by - curv * Ry * 0.06);
    ctx.quadraticCurveTo(bx, by + curv * Ry * 0.1 - ab * Ry * 0.05, bx + bw / 2 * 0.8, by - curv * Ry * 0.06); ctx.stroke();
    // labio inferior (luz)
    ctx.strokeStyle = I.css(I.aclara(o.piel, 0.25), 0.35); ctx.lineWidth = R * 0.03;
    ctx.beginPath(); ctx.moveTo(bx - bw * 0.2, by + Ry * 0.07 + ab * Ry * 0.15); ctx.lineTo(bx + bw * 0.15, by + Ry * 0.07 + ab * Ry * 0.15); ctx.stroke();
    ctx.restore();
    // pelo delantero
    this.pelo(ctx, st, R, Ry, 'delante');
    ctx.restore();
  };

  Pr.pelo = function (ctx, st, R, Ry, capa) {
    const o = this.o, t = st.t, s = st.s, vie = st.viento, pe = o.peinado;
    if (pe === 'calvo' && capa !== 'espalda') return;
    const col = o.pelo;
    const mueve = (pts, desde = 0.2) => pts.map(([x, y], i) => {
      const k = I.clamp((y / Ry - desde) / 0.8, 0, 1);
      return [x - k * vie * R * 0.18 + k * I.ruido1(t * 1.4 + i * 0.7, s + 60) * R * 0.08 * (0.3 + vie), y + k * I.ruido1(t * 1.1 + i, s + 61) * R * 0.03];
    });
    const est = { color: col, semilla: s + 50, volumen: 0.7, borde: 0.95, anchoBorde: 4, irregular: 1.1, frecIrregular: 0.15, textura: 0.35, sombraInterna: 0.35 };
    if (capa === 'atras') {
      let pts;
      if (pe === 'melena') pts = [[R * 0.5, -Ry * 0.85], [R * 0.05, -Ry * 1.13], [-R * 0.7, -Ry * 0.95], [-R * 1.12, -Ry * 0.35], [-R * 1.18, Ry * 0.35], [-R * 1.1, Ry * 0.85], [-R * 0.75, Ry * 0.98], [-R * 0.3, Ry * 0.78], [R * 0.0, Ry * 0.1]];
      else if (pe === 'mono') pts = [[R * 0.5, -Ry * 0.85], [R * 0.05, -Ry * 1.12], [-R * 0.7, -Ry * 0.95], [-R * 1.08, -Ry * 0.3], [-R * 1.0, Ry * 0.2], [-R * 0.4, Ry * 0.1]];
      else pts = [[R * 0.6, -Ry * 0.8], [R * 0.05, -Ry * 1.1], [-R * 0.7, -Ry * 0.95], [-R * 1.08, -Ry * 0.3], [-R * 0.95, Ry * 0.35], [-R * 0.5, Ry * 0.2]];
      P.forma(ctx, P.suavizar(mueve(pts), 4), Object.assign({}, est, { color: I.oscurece(col, 0.12) }));
      if (pe === 'mono') P.forma(ctx, P.elipse(-R * 0.75, -Ry * 0.85, R * 0.36, R * 0.32, 0, 18), Object.assign({}, est, { semilla: s + 52 }));
    } else if (capa === 'delante' || capa === 'espalda') {
      let pts;
      if (capa === 'espalda') pts = [[R * 0.9, -Ry * 0.5], [R * 0.6, -Ry * 1.02], [-R * 0.4, -Ry * 1.12], [-R * 1.15, -Ry * 0.4], [-R * 1.15, Ry * 0.6], [-R * 0.6, Ry * 0.95], [R * 0.3, Ry * 0.9], [R * 0.95, Ry * 0.6], [R * 1.08, Ry * 0.1]];
      else if (pe === 'melena') pts = [[-R * 0.95, -Ry * 0.4], [-R * 0.55, -Ry * 1.0], [R * 0.15, -Ry * 1.08], [R * 0.78, -Ry * 0.72], [R * 1.0, -Ry * 0.35], [R * 0.78, -Ry * 0.38], [R * 0.5, -Ry * 0.52], [R * 0.2, -Ry * 0.42], [-R * 0.1, -Ry * 0.5], [-R * 0.5, -Ry * 0.25], [-R * 0.62, Ry * 0.35], [-R * 0.56, Ry * 0.82], [-R * 0.76, Ry * 0.86], [-R * 0.95, Ry * 0.3]];
      else pts = [[-R * 0.95, -Ry * 0.35], [-R * 0.55, -Ry * 1.0], [R * 0.2, -Ry * 1.06], [R * 0.8, -Ry * 0.7], [R * 0.95, -Ry * 0.45], [R * 0.55, -Ry * 0.55], [R * 0.1, -Ry * 0.5], [-R * 0.35, -Ry * 0.3], [-R * 0.45, Ry * 0.15], [-R * 0.7, Ry * 0.1]];
      const pathPelo = P.forma(ctx, P.suavizar(mueve(pts, 0.0), 4), est);
      ctx.save(); ctx.clip(pathPelo);
      // brillo del pelo (banda de luz sobre la coronilla)
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = I.css(I.mezcla(col, (I.luzActual || I.LUZ_DEFECTO).borde, 0.5), 0.35);
      ctx.lineWidth = R * 0.12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(0, -Ry * 0.05, R * 0.82, Ry * 0.82, 0, Math.PI * 1.25, Math.PI * 1.6); ctx.stroke(); ctx.restore();
      // mechones (trazos) con viento
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const a = -2.6 + i * 0.32, x0 = Math.cos(a) * R * 0.75, y0 = Math.sin(a) * Ry * 0.9;
        const pts2 = [[x0, y0], [x0 * 0.8 - R * 0.08, y0 * 0.4 + Ry * 0.1], [x0 * 0.7 - R * 0.15, y0 * 0.1 + Ry * 0.3]];
        P.trazo(ctx, mueve(pts2, -0.5), { color: I.aclara(col, 0.15), ancho: R * 0.035, alfa: 0.45 });
      }
      ctx.restore(); ctx.restore(); ctx.save();
      // mechón suelto que vuela con el viento
      const sx = -R * 0.6, sy = Ry * 0.55;
      const sp = [[sx, sy], [sx - R * 0.2 - vie * R * 0.3, sy + Ry * 0.25 + I.ruido1(t * 2, s) * R * 0.08], [sx - R * 0.35 - vie * R * 0.55, sy + Ry * 0.35 + I.ruido1(t * 2.3 + 3, s) * R * 0.15]];
      P.trazo(ctx, sp, { color: col, ancho: R * 0.06, alfa: 0.9 });
      ctx.restore();
    }
  };

  Pr.bufanda = function (ctx, st) {
    const o = this.o, J = st.J, H = st.H, dir = st.dir, t = st.t, s = st.s, vie = st.viento;
    const col = o.bufanda.color, cue = J.cuello, cb = J.cabezaBase;
    const cx = (cue.x * 0.6 + cb.x * 0.4), cy = (cue.y * 0.6 + cb.y * 0.4);
    // vuelta alrededor del cuello
    const vuelta = P.suavizar([[cx - dir * H * 0.045, cy - H * 0.02], [cx, cy - H * 0.028], [cx + dir * H * 0.045, cy - H * 0.012], [cx + dir * H * 0.048, cy + H * 0.02], [cx, cy + H * 0.032], [cx - dir * H * 0.05, cy + H * 0.018]], 4);
    // cola que cuelga por detrás y vuela con el viento (cadena con retardo de fase)
    const n = 5, cola = [];
    let px = cx - dir * H * 0.035, py = cy + H * 0.01;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const ang = Math.PI / 2 + dir * (0.25 + vie * 1.0 * k + I.ruido1(t * 1.8 - k * 1.5, s + 70) * (0.15 + vie * 0.45) * k);
      if (i > 0) { px += Math.cos(ang) * H * 0.032; py += Math.sin(ang) * H * 0.032; }
      cola.push([px, py]);
    }
    const colaF = P.cinta(cola, H * 0.05, H * 0.042);
    P.forma(ctx, colaF, { color: I.oscurece(col, 0.15), semilla: s + 71, volumen: 0.6, borde: 0.6, irregular: 0.7, textura: 0.35 });
    // flecos
    const fin = cola[n];
    ctx.save(); ctx.strokeStyle = I.css(I.oscurece(col, 0.2)); ctx.lineWidth = H * 0.004;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(fin[0] + i * H * 0.007, fin[1]); ctx.lineTo(fin[0] + i * H * 0.008 - dir * vie * H * 0.01, fin[1] + H * 0.014); ctx.stroke(); }
    ctx.restore();
    P.forma(ctx, vuelta, { color: col, semilla: s + 72, volumen: 0.7, borde: 0.9, irregular: 0.9, textura: 0.4 });
    // pliegues de lana
    ctx.save(); ctx.strokeStyle = I.css(I.oscurece(col, 0.35), 0.5); ctx.lineWidth = H * 0.003;
    for (let i = 0; i < 3; i++) { const yy = cy - H * 0.012 + i * H * 0.014; ctx.beginPath(); ctx.moveTo(cx - dir * H * 0.035, yy); ctx.quadraticCurveTo(cx, yy + H * 0.008, cx + dir * H * 0.038, yy); ctx.stroke(); }
    ctx.restore();
  };

  // paraguas: mango sujeto con la mano D; copa encima
  Pr.paraguas = function (ctx, st, o, parte) {
    const J = st.J, H = st.H, dir = st.dir, t = st.t, vie = st.viento;
    const m = J.manoD, inc = (o.inclinacion == null ? -0.12 : o.inclinacion) * dir + I.ruido1(t * 0.9, 5) * 0.03 * (0.5 + vie);
    const largo = H * (o.largo || 0.5);
    const top = [m.x + Math.sin(inc) * largo, m.y - Math.cos(inc) * largo];
    if (parte === 'mango') {
      ctx.save(); ctx.strokeStyle = I.css('#2b2a2e'); ctx.lineWidth = H * 0.007; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(m.x - Math.sin(inc) * H * 0.04, m.y + Math.cos(inc) * H * 0.04); ctx.lineTo(top[0], top[1]); ctx.stroke();
      ctx.lineWidth = H * 0.012; ctx.strokeStyle = I.css('#4a3428');
      ctx.beginPath(); ctx.arc(m.x - Math.sin(inc) * H * 0.04 - dir * H * 0.015, m.y + Math.cos(inc) * H * 0.04, H * 0.015, 0, Math.PI * (dir > 0 ? 1 : 1)); ctx.stroke();
      ctx.restore();
      return;
    }
    I.props.paraguas(ctx, top[0], top[1], { radio: H * (o.radio || 0.36), angulo: inc, color: o.color || '#2f3c4a', t, semilla: st.s + 90, viento: vie });
  };
})(window);
