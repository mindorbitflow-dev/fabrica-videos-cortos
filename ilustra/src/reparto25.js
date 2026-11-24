/* Ilustra — reparto 2.5D: Tito y Sombra que GIRAN (yaw 0-2π: de frente, tres cuartos, perfil, de espaldas), sobre Rig25 + G3.
   API igual que el reparto 2D (R.tito / R.sombra): p.dibujar(ctx, t, estado) con estado = {x, y, yaw, pose, pose2, k, expresion, mirada, habla, luz, alto, dist, objeto...}.
   yaw: 0 = de frente a cámara, +π/2 = perfil mirando a la derecha, π = de espaldas, -π/2 = perfil mirando a la izquierda (igual que Personaje2).
   Cuerpo: volúmenes proyectados con el marco del cuerpo (M.aMundo) y orden de dibujo por profundidad; cabeza: modelo 3D paramétrico (cráneo, hocico, orejas,
   ojos, boca, boina o sombrero) proyectado con el marco de la cabeza. Las poses son las mismas del reparto 2D (nombres y campos). Sin azar. */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3, P = I.Pincel, R = I.REPARTO;
  if (!I || !G3 || !I.Rig25 || !R || !P) return;
  const PI = Math.PI, clamp = I.clamp, TINTA = '#15131a';

  const PROP = {
    tito: { columna: 0.1, pecho: 0.17, cuello: 0.01, cabeza: 0.31, brazo: 0.14, antebrazo: 0.13, mano: 0.06, muslo: 0.085, pierna: 0.085, pie: 0.11, escalaCabeza: 1, anchoHombro: 1, curva: 0 },
    sombra: { columna: 0.085, pecho: 0.15, cuello: 0.02, cabeza: 0.27, brazo: 0.15, antebrazo: 0.14, mano: 0.06, muslo: 0.158, pierna: 0.15, pie: 0.1, escalaCabeza: 1, anchoHombro: 1, curva: 0 }
  };
  const mas = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k, p[2] + v[2] * k];
  const sinPoseRel = pose => { const o = Object.assign({}, pose); delete o.relManoD; delete o.relManoI; delete o.relPieD; delete o.relPieI; return o; };

  function Toon25(tipo, o) {
    this.tipo = tipo;
    this.base = tipo === 'tito' ? R.tito(o) : R.sombra(o);   // de ahí salen los colores, la altura y el catálogo de poses
    this.o = this.base.o; this.c = this.base.c; this.H = this.base.H; this.poses = this.base.poses;
    this.rig = new I.Rig25(PROP[tipo], this.H);
  }
  const resolverPose = (self, e, t) => {
    const ctxE = { e, t, x: e.x, y: e.y, dir: e.dir || 1, H: self.H, p: self.base };
    const una = n => { const p = typeof n === 'string' ? self.poses[n] : n; return typeof p === 'function' ? p(ctxE) : (p || self.poses.dePie); };
    let pose = una(e.pose || 'dePie');
    if (e.pose2 != null) pose = R.mezclar(pose, una(e.pose2), e.k || 0);
    return pose;
  };

  Toon25.prototype.dibujar = function (ctx, t, e) {
    const o = this.o, H = this.H, c = this.c, tipo = this.tipo;
    const yaw = e.yaw != null ? e.yaw : (e.vista === 'espalda' ? PI : (e.dir == null ? 1 : e.dir) * 1.25);
    const luzPrev = I.luzActual; if (e.luz) I.luzActual = e.luz;
    const alto = e.alto || 0, x = e.x, y = e.y - alto, dirV = Math.sin(yaw) >= 0 ? 1 : -1;
    let pose = resolverPose(this, Object.assign({}, e, { x, y, dir: dirV }), t);
    const abd = tipo === 'tito' ? 0.34 : 0.2;   // los brazos no se pegan al cuerpo al verlo de frente
    pose = Object.assign({ abdBrazoD: abd, abdBrazoI: abd }, pose);
    pose = I.sumarPoses(pose, I.ciclos.respirar(t + o.semilla, { amp: 0.01 }), e.respiracion == null ? 1 : e.respiracion);
    // primera pasada sin objetivos relativos; con ellos se calcula el objetivo de la mano en pantalla y se vuelve a resolver
    let J = this.rig.resolver({ x, y, yaw, pose: sinPoseRel(pose), xPose: x, dir: dirV });
    const rel = (k, lado) => {
      const r = pose['relMano' + lado]; if (!r) return;
      const ref = J[r[0] === 'suelo' ? 'tobilloD' : r[0] === 'hombros' ? 'hombros' : r[0]] || J.cabeza;
      return [ref.x + r[1] * H * dirV, ref.y + r[2] * H];
    };
    const oD = rel('relMano', 'D'), oI = rel('relMano', 'I');
    if (oD || oI) { const p2 = sinPoseRel(pose); if (oD) p2.objetivoManoD = oD; if (oI) p2.objetivoManoI = oI; J = this.rig.resolver({ x, y, yaw, pose: p2, xPose: x, dir: dirV }); }
    const exN = e.expresion;
    const ex = Object.assign({ ceja: [0, 0], ojo: 0.92, boca: [0.12, 0], mejillas: 0.3, mirada: [0, 0] }, (R.EXPRESIONES && R.EXPRESIONES[exN]) || (I.EXPRESIONES && I.EXPRESIONES[exN]) || {});
    if (e.habla) {
      const f = 0.5 + 0.5 * Math.sin(t * 15 + I.ruido1(t * 3, o.semilla) * 3) * Math.sin(t * 6.3 + 1);
      ex.boca = [Math.max(ex.boca[0], 0.1), Math.max(ex.boca[1], e.habla * (0.15 + 0.7 * Math.max(0, f)))];
    }
    const st = { t, e, J, H, c, yaw, dirV, ex, s: o.semilla, pose, y0: e.y, M: J.marcoCuerpo, Mh: J.marcos.cabeza, cy: Math.cos(yaw), sy: Math.sin(yaw) };
    // sombra en el suelo
    const sx = (J.tobilloD.x + J.tobilloI.x) / 2;
    ctx.save(); ctx.fillStyle = 'rgba(10,8,12,' + (0.32 * clamp(1 - alto / (H * 0.8), 0.2, 1)) + ')';
    ctx.beginPath(); ctx.ellipse(sx, e.y + H * 0.01, H * (0.2 + 0.05 * Math.abs(st.sy)), H * 0.035, 0, 0, 7); ctx.fill(); ctx.restore();
    // piezas ordenadas de lejos a cerca por profundidad (prof mayor = más cerca de la cámara; se comprueba en la hoja de giro)
    const partes = [];
    const add = (prof, fn) => partes.push({ prof, fn });
    for (const lado of ['D', 'I']) {
      add(J['cadera' + lado].prof - 0.001, () => this['pierna_' + tipo](ctx, st, lado));
      add(J['hombro' + lado].prof - 0.002, () => this['brazo_' + tipo](ctx, st, lado));
    }
    add(J.pelvis.prof, () => this['torso_' + tipo](ctx, st));
    add(J.cabeza.prof + 0.001, () => this['cabeza_' + tipo](ctx, st));
    if (this.tipo === 'tito') add(J.pelvis.prof - st.cy * H * 0.2 - 0.003, () => this.cola_tito(ctx, st));
    if (this.tipo === 'tito' && (pose.prop === 'objeto' || e.llevaObjeto)) add(Math.max(J.manoD.prof, J.manoI.prof) + 0.002, () => this.objeto_tito(ctx, st));
    partes.sort((a, b) => a.prof - b.prof).forEach(p => p.fn());
    I.luzActual = luzPrev;
    return J;
  };

  // ---------------------------------------------------------------- piezas comunes
  const tub = (ctx, pts, r0, r1, color, sem, borde = 0.75) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const k0 = i / (pts.length - 1), k1 = (i + 1) / (pts.length - 1);
      P.forma(ctx, P.capsula(pts[i][0], pts[i][1], r0 + (r1 - r0) * k0, pts[i + 1][0], pts[i + 1][1], r0 + (r1 - r0) * k1), { color, semilla: sem + i, volumen: 0.7, borde, irregular: 0.5, sombraInterna: 0.4, textura: 0.1 });
    }
  };
  const xy = j => [j.x, j.y];
  const pie = (ctx, J, lado, H, color, sem, largo, alto, st) => {
    const tob = J['tobillo' + lado], pu = J['punta' + lado], ta = J['talon' + lado];
    const sy = Math.abs(st.sy), cyv = Math.abs(st.cy), fx = (pu.x - ta.x) * 0.5;
    const rx = H * largo * (0.5 + 0.5 * sy) + Math.abs(fx) * 0.3, ry = H * alto * (1 + 0.25 * cyv);
    P.forma(ctx, P.elipse(tob.x + fx * 0.8, tob.y + H * 0.016, rx, ry, (pu.y - ta.y) * 0.002 * st.sy, 22), { color, semilla: sem, volumen: 0.7, borde: 0.8, irregular: 0.4, sombraInterna: 0.35, textura: 0.1 });
  };
  // ojo de caricatura sobre la superficie de la cabeza: p3 = posición en el espacio de la cabeza (unidades de R)
  function ojo(ctx, st, p3, Rr, rx, ry, lado, abre, mir, lid) {
    const w = st.Mh.aMundo([p3[0] * Rr, p3[1] * Rr, p3[2] * Rr]), n = G3.unit(st.Mh.dirAMundo(G3.unit(p3))), vis = n[2];
    if (vis < 0.12) return;
    const kx = clamp(vis * 1.15, 0.2, 1);
    ctx.save(); ctx.translate(w[0], w[1]);
    const rot = Math.atan2(n[0], 1) * 0;   // sin rotación: el óvalo ya se adelgaza con kx
    ctx.scale(kx, 1);
    P.forma(ctx, P.elipse(0, 0, Rr * rx, Rr * ry * abre, rot, 20), { color: '#f2e8d6', semilla: st.s + 44 + lado, volumen: 0.3, borde: 0.8, irregular: 0.1, contorno: TINTA, anchoContorno: 2 });
    const px = clamp(mir[0], -1, 1) * Rr * rx * 0.45 + Math.sin(st.yaw) * 0, py = clamp(mir[1], -1, 1) * Rr * ry * 0.3;
    ctx.fillStyle = TINTA; ctx.beginPath(); ctx.ellipse(px, py, Rr * rx * 0.55, Rr * ry * 0.6 * Math.max(abre, 0.35), 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(px - Rr * rx * 0.18, py - Rr * ry * 0.22, Rr * rx * 0.14, 0, 7); ctx.fill();
    if (lid > 0.05) { ctx.fillStyle = I.css(st.c.piel || st.c.cabeza, 0.9); ctx.fillRect(-Rr * rx * 1.1, -Rr * ry * abre, Rr * rx * 2.2, Rr * ry * abre * lid); }
    ctx.restore();
  }
  // boca: curva sobre la superficie de la cabeza a la altura by (unidades de R) entre -bw y bw
  function boca(ctx, st, Rr, by, bw, zBase, fondo) {
    const [curv, ab] = st.ex.boca, pts = [], pts2 = [];
    for (let i = 0; i <= 14; i++) {
      const u = -1 + i / 7, xx = u * bw, yy = by + curv * 0.14 * (1 - u * u) * -1 * -1, zz = zBase * Math.sqrt(Math.max(0.05, 1 - (xx / (bw * 1.9)) * (xx / (bw * 1.9))));
      const w = st.Mh.aMundo([xx * Rr, yy * Rr + (curv > 0 ? 0 : 0), zz * Rr]); pts.push(w);
      pts2.push(st.Mh.aMundo([xx * Rr, (yy + ab * 0.32 * (1 - u * u)) * Rr, zz * Rr]));
    }
    const vis = G3.unit(st.Mh.dirAMundo([0, 0, 1]))[2];
    if (vis < 0.15) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (ab > 0.05) { ctx.fillStyle = I.css(fondo || '#32151a'); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); for (let i = pts2.length - 1; i >= 0; i--) ctx.lineTo(pts2[i][0], pts2[i][1]); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = I.css('#15121a'); ctx.lineWidth = Rr * 0.05; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.restore();
  }

  // ================================================================ TITO
  Toon25.prototype.pierna_tito = function (ctx, st, lado) {
    const J = st.J, H = st.H, c = st.c;
    tub(ctx, [xy(J['cadera' + lado]), xy(J['rodilla' + lado]), xy(J['tobillo' + lado])], H * 0.046, H * 0.04, c.pantalon, st.s + (lado === 'D' ? 1 : 51), 0.8);
    pie(ctx, J, lado, H, c.zapato, st.s + 2, 0.105, 0.044, st);
  };
  Toon25.prototype.brazo_tito = function (ctx, st, lado) {
    const J = st.J, H = st.H, c = st.c;
    tub(ctx, [xy(J['hombro' + lado]), xy(J['codo' + lado]), xy(J['mano' + lado])], H * 0.036, H * 0.03, c.piel, st.s + (lado === 'D' ? 21 : 71), 0.8);
    const m = J['mano' + lado];
    P.forma(ctx, P.elipse(m.x, m.y, H * 0.05, H * 0.046, 0, 18), { color: c.piel, semilla: st.s + 5, volumen: 0.65, borde: 0.8, irregular: 0.3, contorno: TINTA, anchoContorno: 1.6 });
  };
  // caja / carpeta / sobre entre las dos manos (se ve de frente y de tres cuartos; de perfil queda como un bloque estrecho)
  Toon25.prototype.objeto_tito = function (ctx, st) {
    const J = st.J, H = st.H, s = st.s, o = st.e.objeto || 'caja', a = J.manoD, b = J.manoI, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const w = Math.max(H * 0.16, Math.abs(a.x - b.x) + H * 0.12) * (0.55 + 0.45 * Math.abs(st.cy));
    if (typeof o === 'function') { o(ctx, cx, cy, w, st); return; }
    const col = o === 'carpeta' ? '#b8924f' : o === 'sobre' ? '#e6d8b8' : '#a98456';
    P.forma(ctx, P.rect(cx - w * 0.55, cy - H * 0.12, w * 1.1, H * 0.19, 3), { color: col, semilla: s + 70, volumen: 0.7, borde: 0.8, irregular: 0.4, textura: 0.5, anchoBorde: 3 });
    ctx.fillStyle = I.css('#d8c7a0', 0.8); ctx.fillRect(cx - w * 0.07, cy - H * 0.12, w * 0.14, H * 0.19);
    const m = J.manoD, n = J.manoI; for (const q of [m, n]) P.forma(ctx, P.elipse(q.x, q.y, H * 0.05, H * 0.046, 0, 18), { color: st.c.piel, semilla: s + 5, volumen: 0.65, borde: 0.8, irregular: 0.3, contorno: TINTA, anchoContorno: 1.6 });
  };
  Toon25.prototype.cola_tito = function (ctx, st) {
    const J = st.J, H = st.H, c = st.c, M = st.M, t = st.t;
    const b = M.aMundo([0, -H * 0.02, -H * 0.2]), tip = M.aMundo([0, -H * 0.1 + Math.sin(t * 5) * H * 0.02, -H * 0.31]);
    ctx.save(); ctx.strokeStyle = I.css(I.oscurece(c.piel, 0.15)); ctx.lineWidth = H * 0.017; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.quadraticCurveTo((b[0] + tip[0]) / 2, (b[1] + tip[1]) / 2 - H * 0.04, tip[0], tip[1]); ctx.stroke(); ctx.restore();
  };
  Toon25.prototype.torso_tito = function (ctx, st) {
    const J = st.J, H = st.H, c = st.c, M = st.M, s = st.s, cy = st.cy, sy = st.sy;
    const eje = J.ejes.tronco;                                   // dirección del tronco en pantalla (de la pelvis hacia arriba... según Rig25)
    const cen = M.aMundo([0, -H * 0.13, 0]);
    const rW = H * 0.215, rD = H * 0.19, ry = H * 0.195;
    const rx = Math.hypot(rW * cy, rD * sy), rot = Math.atan2(J.hombros.x - J.pelvis.x, -(J.hombros.y - J.pelvis.y)) * 0.8;
    P.forma(ctx, P.elipse(cen[0], cen[1], rx, ry, rot, 44), { color: c.pantalon, semilla: s + 30, volumen: 0.85, borde: 0.9, anchoBorde: 6, irregular: 0.8, textura: 0.3, sombraInterna: 0.5 });
    // camisa: casquete superior de la panza
    const cam = []; for (let i = 0; i <= 30; i++) { const a = PI + 0.2 + (PI - 0.4) * i / 30; cam.push([cen[0] + Math.cos(a) * rx * 0.99 * Math.cos(rot) - Math.sin(a) * ry * 0.99 * Math.sin(rot), cen[1] + Math.cos(a) * rx * 0.99 * Math.sin(rot) + Math.sin(a) * ry * 0.99 * Math.cos(rot)]); }
    P.forma(ctx, cam, { color: c.camisa, semilla: s + 31, volumen: 0.8, borde: 0.9, anchoBorde: 6, irregular: 0.8, textura: 0.3, sombraInterna: 0.45 });
    // tirantes y botones: solo se ven de frente / tres cuartos delanteros (superficie del cuerpo en 3D)
    if (cy > 0.12) {
      for (const sx of [-1, 1]) {
        const top = M.aMundo([sx * rW * 0.4, -H * 0.28, rD * 0.78]), bot = M.aMundo([sx * rW * 0.4, -H * 0.04, rD * 0.78]);
        P.forma(ctx, P.capsula(top[0], top[1], H * 0.014 * Math.max(cy, .4), bot[0], bot[1], H * 0.014 * Math.max(cy, .4)), { color: c.tirante, semilla: s + 32, volumen: 0.5, borde: 0.5, irregular: 0.2, textura: 0.1 });
        P.forma(ctx, P.elipse(bot[0], bot[1] + H * 0.01, H * 0.016 * Math.max(cy, .4), H * 0.016, 0, 12), { color: c.boton, semilla: s + 33, volumen: 0.7, borde: 0.9, irregular: 0, contorno: TINTA, anchoContorno: 1.2 });
      }
    }
  };
  Toon25.prototype.cabeza_tito = function (ctx, st) {
    const J = st.J, H = st.H, c = st.c, Mh = st.Mh, s = st.s, ex = st.ex, e = st.e, t = st.t;
    const Rr = H * 0.172, hy = Mh.yaw, ch = Math.cos(hy), sh = Math.sin(hy), ca = Mh.aMundo([0, 0, 0]);
    const proj = (a, b, d) => Mh.aMundo([a * Rr, b * Rr, d * Rr]);
    const triste = clamp(-ex.boca[0], 0, 1);
    // orejas (cuernitos de cerdo): cada una es un polígono en 3D proyectado; se dibujan antes o después del cráneo según su profundidad
    const orejas = [-1, 1].map(sd => {
      const base = [sd * 0.62, -0.7, -0.05], k = 0.95, caida = triste * 0.9;
      const pts = [[-0.2, 0.05], [-0.05, -0.55], [0.14, -0.66], [0.24, 0.05]].map(([u, v]) => proj(base[0] + sd * (u * 0.8 + caida * 0.35 * -v), base[1] + v * k * (1 - caida * 0.5) + caida * 0.35 * -v, base[2] + (u * 0.1)));
      return { sd, pts, prof: proj(base[0], base[1], base[2])[2] };
    });
    const dibOreja = o => P.forma(ctx, o.pts.map(p => [p[0], p[1]]), { color: c.oreja || c.piel, semilla: s + 41 + o.sd, volumen: 0.7, borde: 0.8, irregular: 0.4, sombraInterna: 0.4, contorno: TINTA, anchoContorno: 2 });
    orejas.filter(o => o.prof < ca[2]).forEach(dibOreja);
    // cráneo
    P.forma(ctx, P.elipse(ca[0], ca[1], Rr, Rr * 0.96, 0, 44), { color: c.piel, semilla: s + 43, volumen: 0.75, borde: 0.9, anchoBorde: 5, irregular: 0.5, textura: 0.15, sombraInterna: 0.35, contorno: TINTA, anchoContorno: 2.4 });
    // hocico: elipsoide hacia delante; si está de espaldas, lo tapa el cráneo
    const hoc = proj(0, 0.26, 0.98), hrx = Math.hypot(Rr * 0.44 * ch, Rr * 0.34 * sh), hvis = Mh.dirAMundo([0, 0, 1])[2];
    if (hvis > -0.35) {
      P.forma(ctx, P.elipse(hoc[0], hoc[1], Math.max(hrx, Rr * 0.12), Rr * 0.3, 0, 28), { color: c.hocico, semilla: s + 46, volumen: 0.8, borde: 0.85, anchoBorde: 3, irregular: 0.3, sombraInterna: 0.4, contorno: TINTA, anchoContorno: 2.2 });
      if (hvis > 0.2) {
        const kx = clamp(hvis, 0.25, 1); ctx.fillStyle = I.css(c.fosa);
        for (const dx of [-0.13, 0.13]) { const n = proj(dx, 0.24, 1.3); ctx.beginPath(); ctx.ellipse(n[0], n[1], Rr * 0.05 * kx, Rr * 0.085, 0, 0, 7); ctx.fill(); }
      }
    }
    // ojos y boca (solo la cara visible)
    const parp = I.ciclos.parpadeo(t, s + 3), mir = e.mirada || ex.mirada || [0.3, 0], abre = clamp(ex.ojo * parp, 0.1, 1.25), lid = ex.ceja[0];
    ojo(ctx, st, [-0.36, -0.2, 0.86], Rr, 0.14, 0.25, 0, abre, mir, lid);
    ojo(ctx, st, [0.36, -0.2, 0.86], Rr, 0.14, 0.25, 1, abre, mir, lid);
    boca(ctx, st, Rr, 0.64, 0.27, 0.78);
    orejas.filter(o => o.prof >= ca[2]).forEach(dibOreja);
    // boina: casquete achatado sobre la cabeza, con banda
    const lev = (e.sombreroAlto || 0) * Rr, top = proj(0, -0.86 - lev / Rr, -0.1);
    const brx = Math.hypot(Rr * 1.12 * ch, Rr * 1.06 * sh), pit = Math.abs(Mh.pitch || 0);
    P.forma(ctx, P.elipse(top[0], top[1], brx, Rr * (0.36 + 0.5 * Math.min(pit, 0.8)), (e.sombreroAlto ? -0.07 : 0), 32), { color: c.boina, semilla: s + 48, volumen: 0.85, borde: 0.9, anchoBorde: 5, irregular: 0.6, textura: 0.3, sombraInterna: 0.5, contorno: '#0d0c10', anchoContorno: 2.4 });
    const ban = proj(0, -0.58 - lev / Rr, 0.02);
    P.forma(ctx, P.elipse(ban[0], ban[1], Math.hypot(Rr * 1.0 * ch, Rr * 0.96 * sh), Rr * 0.13, 0, 24), { color: c.boinaBanda, semilla: s + 49, volumen: 0.7, borde: 0.8, irregular: 0.3, anchoBorde: 3 });
    // moñito bajo la barbilla (solo de frente)
    if (st.cy > 0.15) {
      const cn = J.cuello, bwt = H * 0.05 * Math.max(st.cy, 0.35), bo = [cn.x, cn.y + H * 0.008];
      P.forma(ctx, [[bo[0] - bwt, bo[1] - bwt * 0.55], [bo[0], bo[1]], [bo[0] - bwt, bo[1] + bwt * 0.55]], { color: c.mono, semilla: s + 51, volumen: 0.5, borde: 0.6, irregular: 0.2, anchoBorde: 2 });
      P.forma(ctx, [[bo[0] + bwt, bo[1] - bwt * 0.55], [bo[0], bo[1]], [bo[0] + bwt, bo[1] + bwt * 0.55]], { color: c.mono, semilla: s + 52, volumen: 0.5, borde: 0.6, irregular: 0.2, anchoBorde: 2 });
    }
  };

  // ================================================================ SOMBRA
  Toon25.prototype.pierna_sombra = function (ctx, st, lado) {
    const J = st.J, H = st.H, c = st.c;
    tub(ctx, [xy(J['cadera' + lado]), xy(J['rodilla' + lado]), xy(J['tobillo' + lado])], H * 0.03, H * 0.027, c.pantalon, st.s + (lado === 'D' ? 1 : 51), 0.75);
    pie(ctx, J, lado, H, c.zapato, st.s + 2, 0.105, 0.05, st);
  };
  Toon25.prototype.brazo_sombra = function (ctx, st, lado) {
    const J = st.J, H = st.H, c = st.c;
    tub(ctx, [xy(J['hombro' + lado]), xy(J['codo' + lado]), xy(J['mano' + lado])], H * 0.034, H * 0.028, c.saco || c.tinta, st.s + (lado === 'D' ? 21 : 71), 0.8);
    const m = J['mano' + lado];
    P.forma(ctx, P.elipse(m.x, m.y, H * 0.046, H * 0.042, 0, 18), { color: c.guante, semilla: st.s + 5, volumen: 0.65, borde: 0.8, irregular: 0.3, contorno: TINTA, anchoContorno: 1.6 });
    if (st.pose.prop === 'lupa' && lado === 'D') {   // la lupa: aro dorado con cristal y mango
      const r = H * 0.075, lx = m.x + st.dirV * H * 0.03, ly = m.y - H * 0.06;
      ctx.save(); ctx.strokeStyle = I.css(c.hebilla || '#c9a35a'); ctx.lineWidth = H * 0.014; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(lx - st.dirV * r * 0.7, ly + r * 0.7); ctx.stroke();
      ctx.fillStyle = 'rgba(190,220,240,0.35)'; ctx.beginPath(); ctx.arc(lx, ly, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  };
  Toon25.prototype.torso_sombra = function (ctx, st) {
    const J = st.J, H = st.H, c = st.c, M = st.M, s = st.s, cy = st.cy, sy = st.sy;
    const sh = J.hombros, pe = J.pelvis;
    const wS = H * 0.17 * Math.abs(cy) + H * 0.1 * Math.abs(sy) + H * 0.02, wP = H * 0.15 * Math.abs(cy) + H * 0.1 * Math.abs(sy) + H * 0.02;
    const rot = Math.atan2(sh.x - pe.x, -(sh.y - pe.y));
    ctx.save(); ctx.translate(pe.x, pe.y); ctx.rotate(rot);
    const L = Math.hypot(sh.x - pe.x, sh.y - pe.y) + H * 0.03;
    const pts = P.suavizar([[-wP * 1.12, H * 0.2], [-wP * 0.95, H * 0.02], [-wS * 1.0, -L * 0.8], [-wS * 0.82, -L * 0.98], [-wS * 0.38, -L - H * 0.03], [wS * 0.38, -L - H * 0.03], [wS * 0.82, -L * 0.98], [wS * 1.0, -L * 0.8], [wP * 0.95, H * 0.02], [wP * 1.12, H * 0.2]], 3);
    P.forma(ctx, pts, { color: c.saco, semilla: s + 30, volumen: 0.85, borde: 0.9, anchoBorde: 5, irregular: 0.7, textura: 0.3, sombraInterna: 0.5, contorno: TINTA, anchoContorno: 2 });
    if (cy > 0.2) {   // solapas, botones y cinturón de frente
      const k = Math.max(cy, 0.3);
      ctx.fillStyle = I.css(c.cinturon); ctx.fillRect(-wP * 0.95, -H * 0.02, wP * 1.9, H * 0.032);
      P.forma(ctx, P.elipse(0, -H * 0.004, H * 0.02 * k, H * 0.016, 0, 12), { color: c.hebilla, semilla: s + 33, volumen: 0.7, borde: 0.9, irregular: 0 });
      for (let i = 0; i < 3; i++) P.forma(ctx, P.elipse(wS * 0.15 * sy * 2, -L * (0.3 + i * 0.2), H * 0.011, H * 0.011, 0, 10), { color: c.boton, semilla: s + 34 + i, volumen: 0.7, borde: 0.9, irregular: 0 });
      ctx.strokeStyle = I.css('#0d0c10', 0.7); ctx.lineWidth = H * 0.008; ctx.beginPath(); ctx.moveTo(-wS * 0.12, -L * 1.0); ctx.lineTo(0, -L * 0.45); ctx.lineTo(wS * 0.12, -L * 1.0); ctx.stroke();
    } else if (cy < -0.2) {   // de espaldas: abertura trasera del abrigo
      ctx.strokeStyle = I.css('#0d0c10', 0.6); ctx.lineWidth = H * 0.008; ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(0, H * 0.18); ctx.stroke();
    }
    ctx.restore();
  };
  Toon25.prototype.cabeza_sombra = function (ctx, st) {
    const J = st.J, H = st.H, c = st.c, Mh = st.Mh, s = st.s, ex = st.ex, e = st.e, t = st.t;
    const Rr = H * 0.155, hy = Mh.yaw, ch = Math.cos(hy), sh = Math.sin(hy), ca = Mh.aMundo([0, 0, 0]);
    const proj = (a, b, d) => Mh.aMundo([a * Rr, b * Rr, d * Rr]);
    const triste = clamp(-ex.boca[0], 0, 1);
    // orejas caídas de perro (grandes, a los lados)
    const orejas = [-1, 1].map(sd => {
      const pts = [[0, -0.6], [0.35, -0.2], [0.42, 0.7], [0.1, 0.9], [-0.1, 0.1]].map(([u, v]) => proj(sd * (0.96 + u * 0.35), v * 0.95 + triste * 0.15, -0.05 + u * 0.12));
      return { sd, pts, prof: proj(sd * 0.96, 0, -0.05)[2] };
    });
    const dibOreja = o => P.forma(ctx, P.suavizar(o.pts.map(p => [p[0], p[1]]), 3), { color: c.oreja, semilla: s + 41 + o.sd, volumen: 0.7, borde: 0.8, irregular: 0.4, sombraInterna: 0.4, contorno: TINTA, anchoContorno: 2 });
    orejas.filter(o => o.prof < ca[2]).forEach(dibOreja);
    P.forma(ctx, P.elipse(ca[0], ca[1], Rr, Rr * 1.04, 0, 44), { color: c.cabeza, semilla: s + 43, volumen: 0.75, borde: 0.9, anchoBorde: 5, irregular: 0.5, textura: 0.15, sombraInterna: 0.35, contorno: TINTA, anchoContorno: 2.4 });
    // máscara crema de la cara (solo del lado que mira a cámara)
    const cv0 = Mh.dirAMundo([0, 0, 1])[2];
    if (cv0 > -0.1) { const mc = proj(0, 0.12, 0.55); P.forma(ctx, P.elipse(mc[0], mc[1], Rr * (0.46 + 0.4 * Math.abs(ch)), Rr * 0.78, 0, 32), { color: c.hocico, semilla: s + 60, volumen: 0.6, borde: 0.4, irregular: 0.3, sombraInterna: 0.3 }); }
    // hocico largo con nariz
    const hoc = proj(0, 0.34, 1.12), hvis = Mh.dirAMundo([0, 0, 1])[2];
    if (hvis > -0.35) {
      const hrx = Math.hypot(Rr * 0.4 * ch, Rr * 0.62 * sh);
      P.forma(ctx, P.elipse(hoc[0], hoc[1], Math.max(hrx, Rr * 0.14), Rr * 0.3, 0, 28), { color: c.hocico, semilla: s + 46, volumen: 0.8, borde: 0.85, anchoBorde: 3, irregular: 0.3, sombraInterna: 0.4, contorno: TINTA, anchoContorno: 2.2 });
      if (hvis > 0.1) { const n = proj(0, 0.16, 1.62); P.forma(ctx, P.elipse(n[0], n[1], Rr * 0.1 * clamp(hvis, 0.4, 1), Rr * 0.075, 0, 14), { color: c.nariz, semilla: s + 47, volumen: 0.6, borde: 0.6, irregular: 0 }); }
    }
    const parp = I.ciclos.parpadeo(t, s + 3), mir = e.mirada || ex.mirada || [0.3, 0], abre = clamp(ex.ojo * parp, 0.1, 1.25), lid = ex.ceja[0];
    ojo(ctx, st, [-0.38, -0.14, 0.9], Rr, 0.14, 0.24, 0, abre, mir, lid);
    ojo(ctx, st, [0.38, -0.14, 0.9], Rr, 0.14, 0.24, 1, abre, mir, lid);
    boca(ctx, st, Rr, 0.66, 0.28, 0.92);
    orejas.filter(o => o.prof >= ca[2]).forEach(dibOreja);
    // sombrero: copa con cinta y ala redonda (elipse horizontal que se abre al ver la cabeza desde arriba)
    const lev = (e.sombreroAlto || 0) * Rr, pit = Math.abs(Mh.pitch || 0), ala = proj(0, -0.62 - lev / Rr, 0);
    P.forma(ctx, P.elipse(ala[0], ala[1], Rr * 1.62, Rr * (0.2 + 0.7 * Math.min(pit, 0.8)), 0, 36), { color: c.sombrero, semilla: s + 48, volumen: 0.8, borde: 0.9, anchoBorde: 4, irregular: 0.4, textura: 0.2, sombraInterna: 0.5, contorno: '#0d0c10', anchoContorno: 2.4 });
    const copa = [[-Rr * 0.95, ala[1] + Rr * 0.04], [-Rr * 0.82, ala[1] - Rr * 0.7], [-Rr * 0.4, ala[1] - Rr * 0.86], [Rr * 0.4, ala[1] - Rr * 0.86], [Rr * 0.82, ala[1] - Rr * 0.7], [Rr * 0.95, ala[1] + Rr * 0.04]].map(p => [ala[0] + p[0] * (0.55 + 0.45 * Math.abs(ch)) * 1, p[1]]);
    P.forma(ctx, P.suavizar(copa, 3), { color: c.sombrero, semilla: s + 49, volumen: 0.85, borde: 0.9, anchoBorde: 4, irregular: 0.5, textura: 0.25, sombraInterna: 0.5, contorno: '#0d0c10', anchoContorno: 2.4 });
    P.forma(ctx, P.elipse(ala[0], ala[1] - Rr * 0.12, Rr * (0.5 + 0.45 * Math.abs(ch)), Rr * 0.11, 0, 24), { color: c.cinta, semilla: s + 50, volumen: 0.6, borde: 0.8, irregular: 0.2, anchoBorde: 3 });
  };

  R.tito25 = function (o) { return new Toon25('tito', o); };
  R.sombra25 = function (o) { return new Toon25('sombra', o); };
  R.Toon25 = Toon25;
})(typeof window !== 'undefined' ? window : globalThis);
