/* Ilustra — mano paramétrica en 3D (Fase 2, §5.3, WP3). Palma = nube de 10 puntos; dedos y pulgar = cadenas de falanges
   (cápsulas proyectadas); 7 agarres. Orientación por (eje, dorso); sin vistas separadas: palma, dorso o canto salen del giro. */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3, P = I.Pincel;
  const M = I.Mano = {};

  // ---------- agarres (§5.3): f = [[base, media, punta] × 4] índice..meñique; sep; pul = [oposición, flexión1, flexión2] ----------
  const rep = (a, n = 4) => Array.from({ length: n }, () => a.slice());
  const RELAJADA = [[.25, .35, .2], [.3, .4, .25], [.35, .45, .3], [.45, .5, .35]];
  const PUNO = rep([1.5, 1.6, 1.1]);
  M.AGARRES = {
    relajada: { f: RELAJADA, sep: .06, pul: [.5, .2, .2] },
    puno: { f: PUNO, sep: 0, pul: [1.2, .6, .5] },
    asa: { f: rep([1.15, 1.25, .8]), sep: 0, pul: [1.0, .3, .3] },
    senalar: { f: [[0, .05, 0]].concat(PUNO.slice(1)), sep: .02, pul: [1.1, .5, .4] },
    saludar: { f: [[-.04, 0, 0], [0, 0, 0], [0, 0, 0], [.04, 0, 0]], sep: .16, pul: [.2, -.1, 0] },
    pinza: { f: [[.6, .7, .5]].concat(RELAJADA.slice(1).map(d => d.map(v => v * 1.2))), sep: .03, pul: [.9, .4, .3] },
    sostenerPlano: { f: rep([.2, .15, .1]), sep: .02, pul: [1.0, .1, .1] }
  };
  M.NOMBRES = Object.keys(M.AGARRES);

  const clon = a => ({ f: a.f.map(d => d.slice()), sep: a.sep, pul: a.pul.slice(), radio: a.radio });
  // interpola campo a campo (acepta nombres o agarres)
  M.mezclar = function (a, b, k) {
    a = resolver(a); b = resolver(b);
    const l = (x, y) => x + (y - x) * k;
    return {
      f: a.f.map((d, i) => d.map((v, j) => l(v, b.f[i][j]))),
      sep: l(a.sep, b.sep), pul: a.pul.map((v, i) => l(v, b.pul[i])),
      radio: a.radio != null && b.radio != null ? l(a.radio, b.radio) : (k < .5 ? a.radio : b.radio)
    };
  };
  function resolver(g) {
    if (typeof g === 'string') { const a = M.AGARRES[g]; if (!a) throw new Error('Mano: agarre desconocido "' + g + '"'); return clon(a); }
    return clon(g || M.AGARRES.relajada);
  }

  // ---------- geometría local (unidades de L, marco de la mano: x dedos, y meñique, z dorso) ----------
  const LARGO_FAL = [.22, .14, .11], FACTOR_DEDO = [.95, 1, 1, .8], RADIO_DEDO = [.043, .047, .044, .036];
  const BASE_X = .46, ANCHO_PALMA = .36, GROSOR_PALMA = .12, RR = .03;         // RR: redondeo de la caja de la palma
  const PUL_BASE = [.12, -.16, -.05], PUL_FAL = [.24, .17, .13], PUL_RADIO = [.065, .055, .045];
  const ANCLA_AGARRE = [.42, 0, -.16];       // centro del puño cerrado (hueco de `asa`); con `radio`, z = −(grosor/2 + radio/L): el mango apoya en la palma
  const NUBE_PALMA = (function () {
    const c = [], x1 = BASE_X - RR, y1 = ANCHO_PALMA / 2 - RR, yM = .145 - RR, z1 = GROSOR_PALMA / 2 - RR;
    for (const s of [-1, 1]) for (const z of [-z1, z1]) { c.push([RR, s * yM, z]); c.push([x1, s * y1, z]); }
    c.push([.2, -y1, 0], [.2, y1, 0]);                                            // abultamientos de eminencia tenar e hipotenar
    return c;                                                                    // 10 puntos
  })();

  function rotEje(v, k, a) {                                                      // Rodrigues; k unitario
    const c = Math.cos(a), s = Math.sin(a), d = G3.punto(k, v) * (1 - c), q = G3.cruz(k, v);
    return [v[0] * c + q[0] * s + k[0] * d, v[1] * c + q[1] * s + k[1] * d, v[2] * c + q[2] * s + k[2] * d];
  }

  // Cadena de un dedo en el marco local: devuelve 4 puntos (base, 2 articulaciones, punta)
  function cadenaDedo(i, g) {
    const f = g.f[i], a0 = (i - 1.5) * g.sep, fac = FACTOR_DEDO[i];
    const p = [[BASE_X, (i - 1.5) * .09, 0]]; let th = 0;
    for (let k = 0; k < 3; k++) {
      th += f[k];
      const d = G3.rotZ([Math.cos(th), 0, -Math.sin(th)], a0), l = LARGO_FAL[k] * fac, q = p[k];
      p.push([q[0] + d[0] * l, q[1] + d[1] * l, q[2] + d[2] * l]);
    }
    return p;
  }

  // Pulgar: base en el lado de la palma (z<0, junto a la muñeca). Eje de oposición: rotZ(−0.6)·rotX(0.9·oposición):
  // la dirección base es x girada −0.6 alrededor de z (abierta hacia −y); la oposición la inclina hacia la palma (−z) 0.9·op y la
  // lleva hacia el meñique (+y) 0.5·op; las flexiones 1 y 2 giran alrededor del mismo eje de flexión (en el plano de la palma).
  function cadenaPulgar(g) {
    const op = g.pul[0], yaw = -0.6 + 0.6 * op;
    const d0 = G3.rotZ([1, 0, 0], yaw), eje = G3.rotZ([0, 1, 0], yaw);          // eje: flexión positiva = hacia −z
    const ang = [0.4 * op, 0.8 * g.pul[1], 0.8 * g.pul[2]], p = [PUL_BASE.slice()]; let d = d0;
    for (let k = 0; k < 3; k++) {
      d = rotEje(d, eje, ang[k]);
      const q = p[k], l = PUL_FAL[k]; p.push([q[0] + d[0] * l, q[1] + d[1] * l, q[2] + d[2] * l]);
    }
    return p;
  }

  // ---------- contornos 2D ----------
  // Cinta de un dedo: línea central suavizada, ancho = diámetro de la cápsula (ortográfica: no se acorta), tapas semicirculares en
  // ambos extremos. El lado interior de un giro cerrado se limita al radio de curvatura para que no se autointersecte.
  function contornoCadena(p2, radios) {                                           // p2: [[x,y,prof]×4], radios en px por articulación
    const n3 = p2.length, rmax = Math.max.apply(null, radios);
    let largo = 0; for (let i = 1; i < n3; i++) largo += Math.hypot(p2[i][0] - p2[i - 1][0], p2[i][1] - p2[i - 1][1]);
    if (largo < 1.6 * rmax) {                                                    // dedo visto de punta: mancha convexa
      const c = [];
      for (let i = 0; i < n3; i++) for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; c.push([p2[i][0] + Math.cos(t) * radios[i], p2[i][1] + Math.sin(t) * radios[i]]); }
      return P.suavizar(G3.orientar(G3.envolvente(c), true), 2);
    }
    const sm = P.suavizar(p2.map(q => [q[0], q[1]]), 4, false), n = sm.length;
    const ctr = [], w = [];
    for (let j = 0; j < n; j++) {                                                // quita puntos repetidos
      if (j && Math.hypot(sm[j][0] - ctr[ctr.length - 1][0], sm[j][1] - ctr[ctr.length - 1][1]) < 1e-3) continue;
      const u = j / (n - 1) * (n3 - 1), i0 = Math.min(n3 - 2, Math.floor(u)), f = u - i0;
      ctr.push(sm[j]); w.push(radios[i0] + (radios[i0 + 1] - radios[i0]) * f);
    }
    const m = ctr.length, T = [];
    for (let j = 0; j < m; j++) {
      const a = ctr[Math.max(0, j - 1)], b = ctr[Math.min(m - 1, j + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      T.push([(b[0] - a[0]) / l, (b[1] - a[1]) / l]);
    }
    const izq = [], der = [];
    for (let j = 0; j < m; j++) {
      const t = T[j], nx = -t[1], ny = t[0]; let wl = w[j], wr = w[j];
      if (j > 0 && j < m - 1) {
        const t0 = T[j - 1], t1 = T[j + 1], cr = t0[0] * t1[1] - t0[1] * t1[0];
        const ds = (Math.hypot(ctr[j + 1][0] - ctr[j - 1][0], ctr[j + 1][1] - ctr[j - 1][1]) / 2) || 1;
        const k = Math.abs(Math.atan2(cr, t0[0] * t1[0] + t0[1] * t1[1])) / ds, rc = k > 1e-6 ? 0.9 / k : 1e9;
        if (cr > 0) wl = Math.min(wl, rc); else wr = Math.min(wr, rc);
      }
      izq.push([ctr[j][0] + nx * wl, ctr[j][1] + ny * wl]); der.push([ctr[j][0] - nx * wr, ctr[j][1] - ny * wr]);
    }
    const out = izq.slice(), e = ctr[m - 1], te = T[m - 1], we = w[m - 1], b0 = ctr[0], tb = T[0], wb = w[0];
    for (let a = 1; a < 8; a++) { const t = a / 8 * Math.PI; out.push([e[0] + we * (-te[1] * Math.cos(t) + te[0] * Math.sin(t)), e[1] + we * (te[0] * Math.cos(t) + te[1] * Math.sin(t))]); }
    for (let j = m - 1; j >= 0; j--) out.push(der[j]);
    for (let a = 1; a < 8; a++) { const t = a / 8 * Math.PI; out.push([b0[0] + wb * (tb[1] * Math.cos(t) - tb[0] * Math.sin(t)), b0[1] + wb * (-tb[0] * Math.cos(t) - tb[1] * Math.sin(t))]); }
    return out;
  }

  function contornoPalma(nube2, rr) {                                            // caja redondeada: cada punto proyectado se ensancha por un círculo
    const c = [];
    for (const q of nube2) for (let a = 0; a < 10; a++) { const t = a / 10 * Math.PI * 2; c.push([q[0] + Math.cos(t) * rr, q[1] + Math.sin(t) * rr]); }
    return P.suavizar(G3.orientar(G3.envolvente(c), true), 2);
  }

  // ---------- campos de sombreado (modo pintado; Pincel.campos lo aporta WP1: si no existe, no se pasan) ----------
  function campoCadena(p2, radios) {
    const C = P.campos; if (!C || !C.cilindro) return null;
    const s = []; for (let i = 0; i < p2.length - 1; i++) s.push({ a: p2[i], b: p2[i + 1], f: C.cilindro([p2[i][0], p2[i][1]], radios[i], [p2[i + 1][0], p2[i + 1][1]], radios[i + 1]) });
    return (x, y) => {
      let mejor = s[0], md = 1e18;
      for (const q of s) {
        const dx = q.b[0] - q.a[0], dy = q.b[1] - q.a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - q.a[0]) * dx + (y - q.a[1]) * dy) / l2));
        const d = Math.hypot(x - q.a[0] - dx * t, y - q.a[1] - dy * t); if (d < md) { md = d; mejor = q; }
      }
      return mejor.f(x, y);
    };
  }

  // ---------- API ----------
  // Ilustra.Mano.dibujar(ctx, {muneca, eje, dorso, lado, largo, agarre, piel, semilla, luz, radio, objetos}) -> {agarre, palma, indice, pulgar}
  //  agarre: nombre de M.AGARRES o un objeto {f, sep, pul[, radio]}; radio (px) solo afecta a `asa`.
  //  objetos (opcional): [{prof: número | 'agarre' | 'palma', dibujar(ctx)}] se ordenan por prof junto con las piezas de la mano
  //  (p. ej. el mango que el puño rodea). Devuelve las anclas en [x, y, prof]; cuando `solo:true` calcula las anclas sin dibujar.
  M.dibujar = function (ctx, o) {
    const L = o.largo, g = resolver(o.agarre || 'relajada'), lado = o.lado === 'I' ? -1 : 1, piel = o.piel || '#e6b48f';
    const radioAsa = o.radio != null ? o.radio : g.radio;
    if (radioAsa) { const k = Math.max(.7, Math.min(1.3, .5 + .02 * L / radioAsa)); g.f = g.f.map(d => d.map(v => v * k)); }

    // marco de la mano: ex = eje, ez = dorso ortogonalizado, ey = ez × ex (meñique); 'I' refleja y
    const ex = G3.unit(o.eje || [1, 0, 0]);
    let ez = G3.res(o.dorso || [0, 0, 1], G3.esc(ex, G3.punto(o.dorso || [0, 0, 1], ex)));
    if (G3.norma(ez) < 1e-6) { ez = G3.cruz(ex, Math.abs(ex[2]) < .9 ? [0, 0, 1] : [0, 1, 0]); }
    ez = G3.unit(ez);
    const ey = G3.cruz(ez, ex), mu = o.muneca;
    const Mf = {                                                                  // duck-typing de G3.marco: G3.proyectar solo llama a aMundo
      aMundo: p => {
        const x = p[0] * L, y = p[1] * L * lado, z = p[2] * L;
        return [mu[0] + ex[0] * x + ey[0] * y + ez[0] * z, mu[1] + ex[1] * x + ey[1] * y + ez[1] * z, mu[2] + ex[2] * x + ey[2] * y + ez[2] * z];
      }
    };
    const W = p => G3.proyectar(p, Mf);

    const aG = radioAsa ? [ANCLA_AGARRE[0], 0, -(GROSOR_PALMA / 2 + radioAsa / L)] : ANCLA_AGARRE;
    const ancla = { agarre: W(aG), palma: W([BASE_X / 2, 0, 0]), indice: null, pulgar: null };
    const cad = [0, 1, 2, 3].map(i => cadenaDedo(i, g).map(W));
    ancla.indice = cad[0][3].slice();
    const pul = cadenaPulgar(g).map(W); ancla.pulgar = pul[3].slice();
    if (!ctx || o.solo) return ancla;

    // --- piezas ---
    const pintado = I.MODO === 'pintado', conTrazos = L >= 70;
    const grosor = Math.max(1, .02 * L), cont = I.oscurece(piel, .55), sem = o.semilla || 1;
    const base = { color: piel, volumen: .6, borde: .45, irregular: 0, textura: 0, contorno: cont, anchoContorno: grosor, luz: o.luz };
    const pieza = (pts, key, idx, extra) => ({ key, idx, pts, est: Object.assign({}, base, { semilla: sem * 13 + idx }, extra) });
    const piezas = [];
    const rad = i => [1, 1, 1, .8].map(f => RADIO_DEDO[i] * L * (i < 0 ? 1 : f));
    // palma
    const nube2 = NUBE_PALMA.map(W);
    const palmaPts = contornoPalma(nube2, RR * L);
    const ex2 = [W([BASE_X, 0, 0])[0] - W([0, 0, 0])[0], W([BASE_X, 0, 0])[1] - W([0, 0, 0])[1]];
    const ey2 = [W([0, ANCHO_PALMA / 2, 0])[0] - W([0, -ANCHO_PALMA / 2, 0])[0], W([0, ANCHO_PALMA / 2, 0])[1] - W([0, -ANCHO_PALMA / 2, 0])[1]];
    const o2 = W([0, -ANCHO_PALMA / 2, 0]);
    const pe = { nominal: [ANCHO_PALMA * L, BASE_X * L], marco: { o: [o2[0], o2[1]], ex: ey2, ey: ex2 } };
    if (pintado) {
      const rx = Math.max(Math.hypot(ex2[0], ex2[1]), 1) / 2, ry = Math.max(Math.hypot(ey2[0], ey2[1]), 1) / 2;
      if (P.campos && P.campos.elipsoide) pe.campo = P.campos.elipsoide([ancla.palma[0], ancla.palma[1]], rx, ry, Math.atan2(ex2[1], ex2[0]));
      pe.pintura = conTrazos ? {} : { densidad: 0 };
    }
    piezas.push(pieza(palmaPts, ancla.palma[2], 0, pe));
    // dedos y pulgar: una cinta por dedo; clave de orden = prof media de las dos articulaciones distales (lo que más se aleja de la palma)
    const cadenas = [[cad[3], 3], [cad[2], 2], [cad[1], 1], [cad[0], 0], [pul, -1]];
    for (const [c, i] of cadenas) {
      const r = i < 0 ? PUL_RADIO.concat([PUL_RADIO[2] * .8]).map(v => v * L) : RADIO_DEDO[i] === undefined ? null : [1, 1, 1, .8].map(f => RADIO_DEDO[i] * L * f);
      const rr = i < 0 ? r : [r[0], r[0] * 1.0, r[0] * .9, r[3]];             // el dedo se estrecha al 80 % en la punta
      const pts = contornoCadena(c, rr);
      const clave = (c[2][2] + c[3][2]) / 2;
      const ang = Math.atan2(c[3][1] - c[0][1], c[3][0] - c[0][0]), lg = Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1]) || 1;
      const nx = -Math.sin(ang), ny = Math.cos(ang), r0 = rr[0];
      const e = { nominal: [2 * r0, Math.max(lg, 2 * r0)], marco: { o: [c[0][0] - nx * r0, c[0][1] - ny * r0], ex: [2 * nx * r0, 2 * ny * r0], ey: [c[3][0] - c[0][0], c[3][1] - c[0][1]] } };
      if (pintado) { const cf = campoCadena(c, rr); if (cf) e.campo = cf; e.pintura = conTrazos ? {} : { densidad: 0 }; }
      piezas.push(pieza(pts, clave, i < 0 ? 5 : i + 1, e));
    }
    const extras = (o.objetos || []).map((ob, j) => ({ key: typeof ob.prof === 'string' ? ancla[ob.prof][2] : ob.prof, idx: 10 + j, obj: ob }));
    const todos = piezas.concat(extras);
    // orden por prof (lo más lejano primero); empate: orden de inserción (dedos lejanos, palma, índice, pulgar)
    const orden = todos.map((p, k) => [p, k]).sort((a, b) => a[0].key - b[0].key || a[1] - b[1]).map(q => q[0]);
    for (const p of orden) {
      if (p.obj) { ctx.save(); p.obj.dibujar(ctx); ctx.restore(); }
      else P.forma(ctx, p.pts, p.est);
    }
    return ancla;
  };
})(window);
