/* Ilustra — FAUNA 2D para "¿Sobrevivirías?": oso, perro, lobo, tigre/puma, toro, cocodrilo (cuadrúpedos) y enjambre de abejas.
   Misma técnica que el tiburón y la serpiente de reparto_fauna.js: cuerpos de tubo con Pincel.forma (volumen + luz de borde), vistos de perfil.
   Cargar DESPUÉS de ilustra.js. API: I.REPARTO.oso|perro|lobo|tigre|puma|toro|cocodrilo(o) -> p.dibujar(ctx, t, estado) (como el resto del reparto)
     o = { esc: px por metro (la persona mide 1.7 m), semilla, col, vientre, rayas, ... }   (esc por defecto 300)
     estado = { x, y (suelo bajo el centro del cuerpo), dir: 1|-1, pose: 'quieto'|'camina'|'corre'|'ataca'|'erguido', pose2, k (mezcla),
                boca 0-1, dist (px recorridos: pasos sin deslizar), alto (px en el aire), erg (anula la inclinación 0-1), sombraSuelo, luz }
   'ataca' = embestida con la boca abierta (el contacto no se dibuja jamás). Sin sangre ni heridas.
   I.REPARTO.enjambre(ctx, t, { x, y, r, n, esc, dir, semilla }) dibuja un enjambre de abejas (determinista en t). */
(function (G) {
  'use strict';
  const I = G.Ilustra, P = I.Pincel, R = I.REPARTO, PI = Math.PI, TAU = PI * 2;
  if (!I || !P || !R || !R.tubo) return;
  const { lerp, clamp } = I, tubo = R.tubo, css = I.css, os = I.oscurece, ac = I.aclara;
  const luzGuard = (e, fn) => { const prev = I.luzActual; if (e.luz) I.luzActual = e.luz; try { return fn(); } finally { I.luzActual = prev; } };

  // ---- especies (medidas en metros) ----
  //  L: hip->hombro; pf/ph: [muslo, pierna] delanteras/traseras; r: radios del tronco [cadera, 1, centro, 2, pecho]; cu: [largo, ángulo] cuello
  //  c: cabeza {r, sn (hocico), sr (grosor), orej, cuernos}; cola: {l, g, ang, tipo}; stride: paso (m); lift: alzada del pie (m)
  const ESP = {
    oso: { L: 1.0, pf: [.4, .4], ph: [.38, .36], r: [.3, .34, .37, .38, .4], joroba: .13, cu: [.3, .35], c: { r: .17, sn: .2, sr: .1, orej: 'redonda', oj: .02 }, cola: { l: .12, g: .07, ang: 0 },
      col: '#6a4a35', vientre: '#6a4a35', hoc: '#8a6b4c', pata: '#4e3626', garras: 1, gr: 1.25, stride: .55, lift: .1, atq: .5, erg: 1.2 },
    perro: { L: .6, pf: [.26, .27], ph: [.28, .28], r: [.12, .14, .16, .17, .18], cu: [.2, .8], c: { r: .085, sn: .13, sr: .045, orej: 'punta', oj: .014 }, cola: { l: .4, g: .045, ang: -.7, curva: .9 },
      col: '#a8793f', vientre: '#d6b985', hoc: '#2e2218', pata: '#8f6431', stride: .4, lift: .08, atq: .3, erg: .7 },
    lobo: { L: .78, pf: [.36, .36], ph: [.38, .36], r: [.15, .17, .19, .2, .21], cu: [.28, .65], c: { r: .09, sn: .17, sr: .05, orej: 'punta', oj: .013 }, cola: { l: .5, g: .065, ang: .45, curva: -.5 },
      col: '#7d838c', vientre: '#d2cab9', hoc: '#d2cab9', pata: '#5f656e', stride: .55, lift: .1, atq: .3, erg: .8 },
    tigre: { L: 1.1, pf: [.36, .34], ph: [.4, .36], r: [.24, .26, .28, .29, .3], cu: [.28, .5], c: { r: .14, sn: .13, sr: .09, orej: 'redonda', oj: .018 }, cola: { l: 1.0, g: .055, ang: .35, curva: 1.1 },
      col: '#c9772f', vientre: '#ecdcbc', hoc: '#ecdcbc', pata: '#b5661f', rayas: '#2a1f18', stride: .6, lift: .1, atq: .4, erg: .8 },
    toro: { L: 1.3, pf: [.42, .4], ph: [.42, .4], r: [.36, .4, .43, .44, .45], joroba: .1, cu: [.4, -.12], c: { r: .2, sn: .2, sr: .13, orej: 'lado', cuernos: 1, oj: .02 }, cola: { l: .85, g: .04, ang: 1.25, tipo: 'mechon' },
      col: '#5d3b2e', vientre: '#5d3b2e', hoc: '#a98c78', pata: '#3f2820', stride: .65, lift: .12, atq: 0, erg: 0 },
    cocodrilo: { L: 1.5, pf: [.18, .16], ph: [.2, .16], r: [.19, .21, .22, .21, .19], cu: [.1, .0], c: { r: .15, sn: .5, sr: .095, orej: 'ninguna', oj: .02, croc: 1 }, cola: { l: 1.8, g: .17, ang: .05, tipo: 'croc' },
      col: '#5a6a45', vientre: '#c3bd91', hoc: '#c3bd91', pata: '#46553a', stride: .4, lift: .06, atq: .35, erg: .35, sprawl: 1 }
  };

  // miembro: curva suave por 3 puntos con radios (muslo -> rodilla -> pie)
  function miembro(a, b, c, r0, r1, r2) {
    const pts = [], rad = [];
    for (let i = 0; i <= 9; i++) { const u = i / 9, v = 1 - u; pts.push([v * v * a[0] + 2 * u * v * b[0] + u * u * c[0], v * v * a[1] + 2 * u * v * b[1] + u * u * c[1]]); rad.push(u < .5 ? lerp(r0, r1, u * 2) : lerp(r1, r2, (u - .5) * 2)); }
    return tubo(pts, rad);
  }
  const bez = (a, b, c, u) => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * b[1] + u * u * c[1]];
  const dentado = (ctx, x0, y0, x1, y1, n, tam, abajo, col) => {   // fila de colmillos a lo largo de un borde
    ctx.fillStyle = css(col || '#f0e9da'); ctx.beginPath();
    for (let i = 0; i < n; i++) { const u = (i + .5) / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u), s = tam * (i % 2 ? .75 : 1), dx = tam * .35; ctx.moveTo(x - dx, y); ctx.lineTo(x + dx, y); ctx.lineTo(x, y + (abajo ? s : -s)); }
    ctx.fill();
  };

  function Cuadrupedo(nombre, o) {
    const base = ESP[o.especie || nombre];
    this.sp = Object.assign({}, base, o, { c: Object.assign({}, base.c, o.cabeza || {}), cola: Object.assign({}, base.cola, o.cola || {}) });
    this.o = this.sp; this.nombre = nombre; this.esc = o.esc || 300; this.semilla = o.semilla || 70;
    this.poses = { quieto: 1, camina: 1, corre: 1, ataca: 1, erguido: 1 };
  }
  Cuadrupedo.prototype.dibujar = function (ctx, t, e) {
    return luzGuard(e, () => {
      const sp = this.sp, S = this.esc, dir = e.dir || 1, s = this.semilla, c = sp.c;
      const A = nm => ({ quieto: 0, camina: 1, corre: 2, ataca: 3, erguido: 4 })[nm == null ? 'quieto' : nm] ;
      const prm = nm => { const k = A(nm); return { v: [0, 1, 2, 2, 0][k], atq: k === 3, erg: k === 4 ? sp.erg : k === 3 ? sp.atq : 0, boca: k === 3 ? 1 : k === 4 ? .75 : 0, quieto: k === 0 }; };
      let q = prm(e.pose);
      if (e.pose2 != null) { const b = prm(e.pose2), k = e.k || 0; q = { v: lerp(q.v, b.v, k), erg: lerp(q.erg, b.erg, k), boca: lerp(q.boca, b.boca, k), atq: k < .5 ? q.atq : b.atq, quieto: q.quieto && b.quieto }; }
      const erg = e.erg != null ? e.erg : q.erg, boca = e.boca != null ? e.boca : q.boca, v = q.v;
      const L = sp.L * S, X = x => x * S;
      // fase del paso (sin deslizar si se da dist: 1 ciclo = zancada / apoyo)
      const gal = v > 1.2, duty = gal ? .38 : .62, zan = X(sp.stride) * (gal ? 1.9 : 1) * (sp.sprawl && !gal ? .8 : 1);
      const fase = e.dist != null ? e.dist * duty / zan : t * (gal ? 2.6 : 1.1 * (sp.sprawl ? .8 : 1));
      const ph = (k, off) => ((fase + off + k) % 1 + 1) % 1;
      const pie = (f, str, lev) => f < duty ? [str * (.5 - f / duty), 0] : [str * (-.5 + (f - duty) / (1 - duty)), -lev * Math.sin(PI * (f - duty) / (1 - duty))];
      const str = zan * duty * .9 * (v > 0 ? 1 : 0), lev = X(sp.lift) * (gal ? 1.6 : 1);
      const respira = Math.sin(t * 2.2 + s) * .006 * S;
      // geometría base (suelo y = 0, hacia arriba y<0)
      const legF = (sp.pf[0] + sp.pf[1]) * S, legH = (sp.ph[0] + sp.ph[1]) * S, r = sp.r.map(z => z * S);
      const pit = -erg * 1.2 * (sp.atq === 0 && erg === 0 ? 0 : 1);          // inclinación del tronco: el hocico sube
      const bob = gal ? Math.sin(TAU * (fase + .2)) * lev * .45 : v > 0 ? Math.sin(TAU * fase * 2) * X(.008) : respira;
      const sprawl = sp.sprawl ? .55 : 1;
      const hipH = legH * (.97 * sprawl - (sp.sprawl ? 0 : .3 * Math.min(erg, .6))) + r[0] * .3 + (e.alto || 0) * 0 + bob - (sp.sprawl ? 0 : 0);
      const H0 = [-L / 2 + (erg > .3 ? -L * .1 * erg : 0), -hipH];
      const ang0 = pit, shAng = ang0 + (sp.joroba ? 0 : 0);
      const Sh = [H0[0] + Math.cos(shAng) * L, H0[1] + Math.sin(shAng) * L - (1 - erg) * (legF - legH) * .9 * (1 - erg)];
      // columna: curva con arqueo
      const arq = gal ? Math.sin(TAU * (fase + .1)) * L * .05 : 0, n = 12, sp0 = [], rad = [];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), c0 = bez(H0, [(H0[0] + Sh[0]) / 2 - Math.sin(shAng) * 0, (H0[1] + Sh[1]) / 2 - r[2] * .1 - arq], Sh, u);
        sp0.push(c0);
        const pr = u < .5 ? lerp(r[0], r[2], u * 2) : lerp(r[2], r[4], (u - .5) * 2), j = sp.joroba ? sp.joroba * S * Math.exp(-Math.pow((u - .85) / .14, 2)) : 0;
        rad.push(pr + j + (u < .08 ? -r[0] * .25 * (1 - u / .08) : 0));
      }
      const alto = e.alto || 0;
      if (e.sombraSuelo !== false) R.sombraSuelo(ctx, e.x, e.y, L * .8 + (sp.cola.tipo === 'croc' ? L * .3 : 0), .5 * clamp(1 - alto / (S * 1.2), .2, 1));
      ctx.save(); ctx.translate(e.x, e.y - alto); ctx.scale(dir, 1);
      const est = (sm, c0, ex) => Object.assign({ color: c0, semilla: s + sm, volumen: .85, borde: .85, anchoBorde: Math.max(3, S * .014), irregular: .6, textura: .3, sombraInterna: .5 }, ex);
      const dark = os(sp.col, .0);
      // ----- patas -----
      const hipA = [H0[0] + r[0] * 0, H0[1] + r[0] * .25], shA = [Sh[0] - r[4] * .1, Sh[1] + r[4] * .3];
      const rp = (k, f) => [S * .042 * k, S * .028 * k, S * .02 * k];
      const pata = (anc, esFront, lado, far) => {
        const [u, l] = esFront ? sp.pf : sp.ph, U = u * S, Lg = l * S, off = esFront ? (gal ? .45 : lado ? .25 : .75) : (gal ? (lado ? .08 : 0) : lado ? 0 : .5);
        let tx, ty;
        if (esFront && erg > .25 && (q.atq || A(e.pose) === 4 || erg > .5)) {       // brazos en alto / hacia delante
          const k = clamp(erg / 1.0, 0, 1.2), ex = lado ? 1 : .62;
          tx = anc[0] + Math.cos(-.55 + (lado ? .15 : -.1)) * (U + Lg) * .86 * ex + (A(e.pose) === 4 ? L * .05 : 0); ty = anc[1] + Math.sin(-.55 + (lado ? .15 : -.1)) * (U + Lg) * .86 * ex * (A(e.pose) === 4 ? -.2 : 1) + (A(e.pose) === 4 ? (lado ? 0 : -.05 * S) : 0) + (A(e.pose) === 4 ? (U + Lg) * .55 : 0);
          if (A(e.pose) === 4) { tx = anc[0] + (lado ? .55 : .75) * (U + Lg) * .85; ty = anc[1] + (lado ? .1 : -.12) * (U + Lg); }
        } else {
          const p = pie(ph(0, off), str, lev), foot = esFront ? anc[0] + (erg > .1 ? 0 : 0) : anc[0];
          const rest = !esFront && erg > .15 ? [(lado ? -1 : .5) * L * .22 * Math.min(erg, .6), (lado ? 0 : -U * .35 * Math.min(erg, .6))] : [0, 0];
          tx = foot + p[0] * 1 + rest[0] + (v === 0 && !esFront ? S * .02 : 0); ty = (v === 0 ? 0 : p[1]) + rest[1] * 0 + (rest[1] || 0);
          if (sp.sprawl) tx += (esFront ? 1 : -1) * S * .03;
          if (esFront && erg > 0.1 && erg <= .5) ty -= erg * Lg * .8;
        }
        // IK 2 segmentos (A: base -> rodilla -> pie)
        const dx = tx - anc[0], dy = ty - anc[1], dd = clamp(Math.hypot(dx, dy), Math.abs(U - Lg) + 1, U + Lg - 1);
        const bs = Math.atan2(dy, dx), cA = Math.acos(clamp((U * U + dd * dd - Lg * Lg) / (2 * U * dd), -1, 1));
        const fl = sp.sprawl ? -1 : esFront ? 1 : -1;      // sentido de flexión: delanteras (codo atrás), traseras (rodilla adelante)
        const kn = [anc[0] + Math.cos(bs + fl * cA) * U, anc[1] + Math.sin(bs + fl * cA) * U], ft = [anc[0] + dx * (dd / Math.hypot(dx, dy) || 1), anc[1] + dy * (dd / Math.hypot(dx, dy) || 1)];
        const gr = esFront ? 1 : .92, c0 = far ? os(sp.pata, .15) : sp.pata, c1 = far ? os(sp.col, .22) : sp.col;
        const k0 = (esFront ? r[4] : r[0]) * .5 * (sp.gr || 1), k1 = k0 * .55, k2 = k0 * .42;
        P.forma(ctx, miembro(anc, kn, ft, Math.max(k0, 4), Math.max(k1, 3), Math.max(k2, 2.5)), est(esFront ? 3 : 4, c1, { profundidad: far ? .22 : 0, irregular: .4 }));
        // pie
        const gx = ft[0], gy = ft[1], pw = k2 * 2.3;
        P.forma(ctx, P.elipse(gx + pw * .3, gy - k2 * .2, pw, k2 * 1.15, 0, 14), est(5, c0, { profundidad: far ? .22 : 0, irregular: .2, textura: .2 }));
        if (sp.garras && !far) { ctx.fillStyle = css('#e8dcc4'); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(gx + pw * (.9 + i * .0), gy - k2 * (.6 - i * .5)); ctx.lineTo(gx + pw * 1.55, gy - k2 * (.2 - i * .5)); ctx.lineTo(gx + pw * .9, gy - k2 * (.1 - i * .5)); ctx.fill(); } }
      };
      // lejanas
      pata(hipA, false, 0, true); pata(shA, true, 0, true);
      // ----- cola -----
      (() => {
        const cl = sp.cola, nn = 12, pts = [], rr = [], tipo = cl.tipo, Lc = cl.l * S;
        let a = PI - (cl.ang || 0) + (erg ? .25 * erg : 0), px = H0[0] - r[0] * .5, py = H0[1] + r[0] * .05;
        const wag = Math.sin(t * (v > 1 ? 7 : 2.6) + s) * (tipo === 'croc' ? .5 : .55) * (tipo === 'mechon' || sp.joroba ? .4 : 1);
        for (let i = 0; i < nn; i++) {
          const u = i / (nn - 1); pts.push([px, py]);
          rr.push(tipo === 'croc' ? lerp(cl.g * S, cl.g * S * .09, Math.pow(u, .85)) : tipo === 'mechon' ? cl.g * S : lerp(cl.g * S, cl.g * S * (cl.curva ? .8 : .5), u));
          a += ((cl.curva || 0) + wag * (tipo === 'croc' ? 1 : .8) * Math.sin(u * 3 + 1)) / nn * (u > .2 ? 1.4 : .3);
          px += Math.cos(a) * Lc / nn; py += Math.sin(a) * Lc / nn;
          if (tipo === 'croc' && py > -3) py = -3;
        }
        P.forma(ctx, tubo(pts, rr), est(6, sp.col, { profundidad: .1 }));
        if (tipo === 'mechon') { const q0 = pts[nn - 1]; P.forma(ctx, P.elipse(q0[0] - S * .02, q0[1] + S * .06, S * .05, S * .12, .15, 14), est(7, os(sp.col, .35), { irregular: 1.6 })); }
        if (sp.rayas && cl.l > .5) { ctx.save(); ctx.strokeStyle = css(sp.rayas, .9); ctx.lineCap = 'butt'; for (let i = 3; i < nn; i += 2) { const a0 = pts[i - 1], b0 = pts[Math.min(nn - 1, i + 1)], th = Math.atan2(b0[1] - a0[1], b0[0] - a0[0]); ctx.lineWidth = rr[i] * .7; ctx.beginPath(); ctx.moveTo(pts[i][0] + Math.sin(th) * rr[i], pts[i][1] - Math.cos(th) * rr[i]); ctx.lineTo(pts[i][0] - Math.sin(th) * rr[i], pts[i][1] + Math.cos(th) * rr[i]); ctx.stroke(); } ctx.restore(); }
      })();
      // ----- tronco -----
      const cuerpo = tubo(sp0, rad);
      const pc = P.forma(ctx, cuerpo, est(1, sp.col, { irregular: .9, textura: .4 }));
      ctx.save(); ctx.clip(pc);
      // vientre claro
      if (sp.vientre !== sp.col) {
        const lo = [], hi = [];
        for (let i = 0; i < n; i++) { const a0 = sp0[Math.max(0, i - 1)], b0 = sp0[Math.min(n - 1, i + 1)], th = Math.atan2(b0[1] - a0[1], b0[0] - a0[0]), nx = Math.sin(th), ny = -Math.cos(th); lo.push([sp0[i][0] - nx * rad[i] * 1.05, sp0[i][1] - ny * rad[i] * 1.05]); hi.push([sp0[i][0] - nx * rad[i] * .35, sp0[i][1] - ny * rad[i] * .35]); }
        P.forma(ctx, lo.concat(hi.reverse()), est(8, sp.vientre, { volumen: .7, borde: .3, irregular: 1.5, textura: .3, sombraInterna: .2 }));
      }
      if (sp.rayas) {   // rayas del tigre: cuñas desde el lomo
        ctx.fillStyle = css(sp.rayas, .88);
        for (let i = 1; i < n - 1; i++) {
          const a0 = sp0[i - 1], b0 = sp0[i + 1], th = Math.atan2(b0[1] - a0[1], b0[0] - a0[0]), nx = Math.sin(th), ny = -Math.cos(th), r0 = rad[i], w = r0 * .22 * (i % 2 ? .8 : 1.1), ex = r0 * (.9 + (i % 3) * .2);
          const px = sp0[i][0] + nx * r0, py = sp0[i][1] + ny * r0, qx = sp0[i][0] - nx * (r0 - ex * .5 + (r0 * 1.0 - ex)), qy = sp0[i][1] - ny * (r0 - ex * .5 + (r0 * 1.0 - ex));
          ctx.beginPath(); ctx.moveTo(px - Math.cos(th) * w, py - Math.sin(th) * w); ctx.lineTo(px + Math.cos(th) * w, py + Math.sin(th) * w); ctx.lineTo(qx + Math.cos(th) * w * .2 - nx * 0, qy + Math.sin(th) * w * .2); ctx.closePath(); ctx.fill();
        }
      }
      if (sp.cola.tipo === 'croc') {   // escudos del lomo
        ctx.fillStyle = css(os(sp.col, .4), .7);
        for (let i = 1; i < n - 1; i++) { const r0 = rad[i]; for (let j = -1; j <= 1; j += 2) { ctx.beginPath(); ctx.ellipse(sp0[i][0] + j * r0 * .15, sp0[i][1] - r0 * .75, r0 * .22, r0 * .13, 0, 0, TAU); ctx.fill(); } }
      }
      ctx.restore();
      if (sp.joroba == null && sp.rayas == null) { /* brillo suave del lomo */ }
      // patas cercanas
      pata(hipA, false, 1, false); pata(shA, true, 1, false);
      // ----- cuello y cabeza -----
      const [cuL, cuA] = sp.cu, cuA2 = (erg > .2 && !q.atq ? cuA - erg * .25 : cuA) + (q.atq && sp.atq === 0 ? -.45 : 0) - (q.atq ? .0 : 0);
      const na = -(cuA2 + (erg > .2 ? erg * .7 : 0)) * 1;
      const Nk = [Sh[0] + Math.cos(na + (pit < 0 ? 0 : 0)) * cuL * S * (q.atq && sp.atq === 0 ? 1.1 : 1), Sh[1] + Math.sin(na) * cuL * S];
      const cuello = tubo([[Sh[0] - r[4] * .2, Sh[1] + r[4] * .15], [(Sh[0] + Nk[0]) / 2 - r[4] * .15, (Sh[1] + Nk[1]) / 2 + r[4] * .1], [Nk[0], Nk[1]]], [r[4] * .92, r[4] * .72, c.r * S * .9]);
      P.forma(ctx, cuello, est(9, sp.col, { irregular: .6 }));
      // cabeza (marco local: centro del cráneo, mira a +x)
      const ha = erg > .2 && A(e.pose) === 4 ? .15 : (q.atq && sp.atq === 0 ? .55 : q.atq ? -.1 : (sp.sprawl ? 0 : .08)) + Math.sin(t * 1.3 + s) * .03;
      const hr = c.r * S * 1.2, sn = c.sn * S, sr = c.sr * S * 1.15;
      ctx.save(); ctx.translate(Nk[0] + hr * .35, Nk[1] - hr * .1); ctx.rotate(ha);
      const jaw = boca * (c.croc ? .5 : .62), cj = c.croc ? 1 : 0, tip = sn + hr * .3;
      const C = [hr * .3, hr * (cj ? .2 : .42)], T = [tip, sr * (cj ? .0 : .22)], jt = [T[0] - C[0], T[1] - C[1]];
      // interior de la boca (oscuro, sin rojo vivo), mandíbula que gira en la comisura y dientes inferiores
      ctx.save(); ctx.translate(C[0], C[1]); ctx.rotate(jaw);
      const mand = P.suavizar([[-hr * .25, -hr * .05], [jt[0] * .5, jt[1] * .5 - 2], [jt[0] * .98, jt[1] - 1], [jt[0] * .98, jt[1] + sr * (cj ? .45 : .75)], [jt[0] * .5, jt[1] + sr * (cj ? .6 : 1.0) + hr * .1], [hr * .1, hr * (cj ? .35 : .5)]], 3);
      if (boca > .08) {
        ctx.fillStyle = css('#35171b'); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(jt[0], jt[1]); ctx.lineTo(jt[0], jt[1] + sr * .4); ctx.lineTo(0, hr * .4); ctx.fill();
        ctx.fillStyle = css('#8a4a4a', .85); ctx.beginPath(); ctx.ellipse(jt[0] * .5, jt[1] * .5 + sr * .45, jt[0] * .3, sr * .22, 0, 0, TAU); ctx.fill();
      }
      P.forma(ctx, mand, est(10, sp.hoc === sp.col ? sp.col : mix(sp.col, sp.hoc), { volumen: .8, irregular: .4 }));
      if (boca > .08) dentado(ctx, jt[0] * .3, jt[1] * .3, jt[0] * .95, jt[1], cj ? 9 : 4, sn * (cj ? .07 : .1), false);
      ctx.restore();
      // cráneo + hocico (la línea inferior es la de la boca)
      const cr = P.suavizar(cj ? [[-hr * .9, -hr * .1], [-hr * .6, -hr * .8], [hr * .2, -hr * .85], [hr * .7, -sr * .85], [tip * .6, -sr * .8], [tip, -sr * .55], [T[0], T[1]], [C[0] + 10, C[1]], [-hr * .3, hr * .55]]
        : [[-hr * .95, hr * .05], [-hr * .7, -hr * .85], [hr * .05, -hr * 1.05], [hr * .5, -hr * .8], [hr * .95, -sr * 1.1], [tip * .8, -sr * .95], [tip, -sr * .5], [T[0], T[1]], [(T[0] + C[0]) / 2, (T[1] + C[1]) / 2 + 1], [C[0], C[1]], [-hr * .3, hr * .75]], 3);
      const pch = P.forma(ctx, cr, est(11, sp.col, { volumen: .9, irregular: .5 }));
      if (sp.hoc !== sp.col && !cj) { ctx.save(); ctx.clip(pch); P.forma(ctx, P.suavizar([[hr * .55, -sr * .3], [tip * 1.1, -sr * .8], [tip * 1.1, T[1]], [C[0], C[1]], [hr * .3, sr * .3]], 3), est(12, sp.hoc, { volumen: .7, borde: .3, irregular: 1, sombraInterna: .3 })); ctx.restore(); }
      ctx.fillStyle = css(sp.nariz || '#1c1612'); ctx.beginPath(); ctx.ellipse(tip - hr * .05, -sr * (cj ? .5 : .6), hr * (cj ? .1 : .2), hr * (cj ? .07 : .14), -.15, 0, TAU); ctx.fill();
      if (boca > .08) dentado(ctx, C[0] + (T[0] - C[0]) * .3, C[1] + (T[1] - C[1]) * .3, T[0] * .97, T[1], cj ? 9 : 4, sn * (cj ? .08 : .1), true);
      else { ctx.strokeStyle = css(os(sp.col, .7), .9); ctx.lineWidth = Math.max(2, S * .007); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(T[0] * .97, T[1]); ctx.quadraticCurveTo((T[0] + C[0]) / 2, T[1] + sr * .25, C[0], C[1]); ctx.stroke(); }
      // ojo
      const ox = hr * .5, oy = -hr * (cj ? .78 : .35), orr = Math.max(c.oj * S * 1.1, 3), rabia = q.atq || boca > .5;
      if (cj) P.forma(ctx, P.elipse(ox, oy + orr * .2, orr * 2, orr * 1.5, 0, 12), est(13, sp.col, { volumen: .8, irregular: .3 }));
      ctx.fillStyle = css(sp.ojo || '#e0b445'); ctx.beginPath(); ctx.ellipse(ox, oy, orr * 1.25, orr * (rabia ? .85 : 1.1), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = css('#120d0a'); ctx.beginPath(); ctx.ellipse(ox + orr * .15, oy, orr * (cj ? .25 : .6), orr * (cj ? .95 : .8), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(ox + orr * .45, oy - orr * .35, orr * .25, 0, TAU); ctx.fill();
      if (rabia || sp.rabia) { ctx.strokeStyle = css(os(sp.col, .65)); ctx.lineWidth = Math.max(2.5, orr * .9); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ox - orr * 1.7, oy - orr * 1.9); ctx.lineTo(ox + orr * 1.9, oy - orr * .7); ctx.stroke(); }
      // orejas / cuernos
      const og = c.orej;
      if (og === 'redonda') P.forma(ctx, P.elipse(-hr * .35, -hr * .95, hr * .33, hr * .33, 0, 16), est(14, sp.col, { volumen: .9, irregular: .3 }));
      else if (og === 'punta') P.forma(ctx, P.suavizar([[-hr * .75, -hr * .6], [-hr * .5, -hr * 1.95], [hr * .15, -hr * .85]], 3), est(14, sp.col, { volumen: .9, irregular: .3 }));
      else if (og === 'lado') P.forma(ctx, P.suavizar([[-hr * .55, -hr * .65], [-hr * 1.45, -hr * .95], [-hr * .75, -hr * .3]], 3), est(14, sp.col, { volumen: .9, irregular: .3 }));
      if (c.cuernos) P.forma(ctx, P.suavizar([[-hr * .35, -hr * .95], [-hr * .15, -hr * 1.5], [hr * .75, -hr * 2.0], [hr * 1.5, -hr * 1.75], [hr * .75, -hr * 1.65], [hr * .1, -hr * 1.2], [-hr * .05, -hr * .85]], 3), est(15, '#d9ccae', { volumen: .8, irregular: .3 }));
      ctx.restore();
      // baba sutil / vaho al respirar del animal que ataca: no se dibuja (sin morbo)
      ctx.restore();
    });
  };
  const mix = (a, b) => I.mezcla(a, b, .5);
  for (const k of ['oso', 'perro', 'lobo', 'tigre', 'toro', 'cocodrilo']) R[k] = o => new Cuadrupedo(k, o || {});
  R.puma = o => new Cuadrupedo('puma', Object.assign({ especie: 'tigre', col: '#c3965f', vientre: '#e8d7b6', hoc: '#e8d7b6', pata: '#a9794a', rayas: false, cola: { ang: .2, l: .95, curva: .8 } }, o || {}));
  R.Cuadrupedo = Cuadrupedo; R.ESPECIES = ESP;

  // ---- enjambre de abejas ----
  R.enjambre = function (ctx, t, o = {}) {
    const { x = 540, y = 800, r = 160, n = 36, esc = 1, dir = 1, semilla = 5 } = o, h = I.hash;
    ctx.save();
    const cuerpos = [];
    for (let i = 0; i < n; i++) {
      const f1 = 1.5 + h(i + semilla) * 2.5, f2 = 1.2 + h(i * 3 + semilla) * 2.2, a = h(i * 7 + 1 + semilla) * TAU, rr = r * (.25 + .75 * Math.sqrt(h(i * 5 + 2 + semilla)));
      const bx = x + Math.cos(t * f1 + a) * rr * 1.15 + Math.sin(t * 5.3 + i) * 5, by = y + Math.sin(t * f2 + a * 1.7) * rr * .7 + Math.cos(t * 6.1 + i) * 5, vx = -Math.sin(t * f1 + a) * dir;
      cuerpos.push([bx, by, vx < 0 ? -1 : 1, i]);
    }
    ctx.fillStyle = 'rgba(235,240,245,.55)';
    for (const [bx, by, sd, i] of cuerpos) { const w = Math.sin(t * 70 + i * 2) * .5 + .5, s = 13 * esc; ctx.beginPath(); ctx.ellipse(bx - sd * s * .1, by - s * (.55 + w * .25), s * .55, s * (.28 + w * .1), -.5 * sd, 0, TAU); ctx.fill(); }
    for (const [bx, by, sd] of cuerpos) {
      const s = 13 * esc;
      ctx.fillStyle = '#e3b23c'; ctx.beginPath(); ctx.ellipse(bx, by, s * .8, s * .42, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2018'; ctx.fillRect(bx - s * .2, by - s * .4, s * .22, s * .8); ctx.fillRect(bx + s * .3, by - s * .34, s * .2, s * .68);
      ctx.beginPath(); ctx.arc(bx + sd * s * .72, by, s * .26, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  R.faunaListo = true;
})(window);
