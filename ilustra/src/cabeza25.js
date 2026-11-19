/* Ilustra — cabeza 2.5D con giro y expresiones (Fase 2, WP4, §6.4). Técnica de P5: silueta = envolvente de una nube 3D proyectada
   (G3.siluetaNube) más correcciones por vistas clave; rasgos = puntos de superficie con escorzo y fundido; recorte a la silueta.
   Sin azar. Todo el estado del contexto se restaura con save/restore. */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3, P = I.Pincel;
  const PI = Math.PI, N = 48, suave = I.suave, clamp = I.clamp;

  const sph = (lon, lat, k) => [Math.sin(lon) * Math.cos(lat) * k[0], Math.sin(lat) * k[1], Math.cos(lon) * Math.cos(lat) * k[2]];

  // ---- formas. Valores de adulto = §6.4. Los deltas de vistas (unidades de R, 48 rayos desde arriba en sentido horario, para yaw>0
  // = mirando a la derecha) se construyen con "bultos" gaussianos: k = índice de rayo (0 arriba, 12 derecha, 24 abajo, 36 izquierda).
  const bultos = lista => { const d = new Array(N).fill(0); for (const [k0, s, a] of lista) for (let i = 0; i < N; i++) { let dk = Math.abs(i - k0); dk = Math.min(dk, N - dk); d[i] += a * Math.exp(-dk * dk / (2 * s * s)); } return d; };
  const simetrico = (lista) => bultos(lista.flatMap(([k0, s, a]) => k0 === 0 || k0 === 24 ? [[k0, s, a]] : [[k0, s, a], [N - k0, s, a]]));
  const BASE = { k: [0.92, 1.12, 1.0], menton: [0, 1.2, 0.52], mandibula: [0.18, 1.17, 0.48], angulos: [0.62, 0.8, 0.05], pomulos: [0.75, 0.35, 0.4],
    ojoLon: 0.40, ojoLat: 0.02, ojoEsc: 1, bocaLat: 0.62, bocaAncho: 0.28, nariz: 'recta', oreja: 1, vistas: null };
  const FORMAS = {
    adulto: Object.assign({}, BASE),
    nino: Object.assign({}, BASE, { k: [0.98, 1.08, 1.02], menton: [0, 1.1, 0.5], mandibula: [0.2, 1.08, 0.46], angulos: [0.7, 0.72, 0.1], pomulos: [0.82, 0.4, 0.42],
      ojoLat: 0.1, ojoEsc: 1.12, bocaLat: 0.66, nariz: 'respingona', oreja: 1.05 }),
    anciano: Object.assign({}, BASE, { k: [0.9, 1.15, 1.0], menton: [0, 1.22, 0.5], mandibula: [0.16, 1.18, 0.46], angulos: [0.6, 0.82, 0.05], pomulos: [0.7, 0.4, 0.38], oreja: 1.15 }),
    estilizado: Object.assign({}, BASE, { k: [0.88, 1.14, 0.98], menton: [0, 1.28, 0.5], mandibula: [0.15, 1.22, 0.46], angulos: [0.52, 0.85, 0.05], pomulos: [0.68, 0.35, 0.38],
      ojoLon: 0.38, bocaAncho: 0.24, oreja: 0.85,
      // Vistas clave (§6.4): alargan mentón y nariz del perfil como en ref3 y afinan la mandíbula de frente.
      vistas: {
        0: simetrico([[0, 1.5, 0.02], [14, 1.8, -0.03], [17, 1.6, -0.09], [24, 1.4, 0.07]]),
        45: bultos([[22, 1.6, 0.10], [17, 1.8, -0.05], [28, 1.8, -0.08], [32, 2, -0.04], [9.5, 1.5, 0.02], [14.5, 1.3, 0.02]]),
        90: bultos([[9.5, 1.3, 0.05], [11.8, 1.1, -0.03], [15, 1.1, 0.04], [17.8, 1.1, -0.04], [20.5, 1.5, 0.15], [27, 1.8, -0.12], [32, 2.2, -0.06]]),
        135: bultos([[22, 1.6, 0.08], [28, 1.8, -0.05], [33, 2, -0.04]]),
        180: simetrico([[24, 1.5, -0.05], [19, 1.8, -0.07], [0, 1.5, 0.02]])
      } })
  };
  const NARICES = { recta: [0, 0.38, 1.16], respingona: [0, 0.33, 1.12], larga: [0, 0.42, 1.28] };

  // expresiones: las de F1 más una de ojos cerrados felices (no se toca personaje.js)
  const EXPR = Object.assign({}, I.EXPRESIONES || { neutra: { ceja: [0, 0], ojo: 0.92, boca: [0.12, 0], mejillas: 0.3, mirada: [0, 0] } },
    { felizCerrada: { ceja: [-0.1, 0.15], ojo: 0.1, boca: [0.9, 0.3], mejillas: 0.7 } });

  const cacheNube = new WeakMap(), cacheVistas = new WeakMap();
  function nubeDe(f) {
    let n = cacheNube.get(f); if (n) return n;
    n = [];
    for (let la = -80; la <= 50; la += 26) for (let lo = 0; lo < 360; lo += 30) n.push(sph(lo * PI / 180, la * PI / 180, f.k));
    const s = [f.menton, f.mandibula, f.angulos, f.pomulos];
    n.push(s[0].slice(), [s[1][0], s[1][1], s[1][2]], [-s[1][0], s[1][1], s[1][2]], [s[2][0], s[2][1], s[2][2]], [-s[2][0], s[2][1], s[2][2]], [s[3][0], s[3][1], s[3][2]], [-s[3][0], s[3][1], s[3][2]]);
    cacheNube.set(f, n); return n;
  }
  function vistasDe(f) {
    if (!f.vistas) return null;
    let v = cacheVistas.get(f); if (v) return v;
    const z = new Array(N).fill(0), V = [0, 45, 90, 135, 180].map(a => (f.vistas[a] || z).slice());
    for (const j of [0, 4]) { const a = V[j].slice(); for (let i = 0; i < N; i++) V[j][i] = (a[i] + a[(N - i) % N]) / 2; }   // 0 y 180 simétricas: sin salto al cruzar yaw=0 o ±π
    cacheVistas.set(f, V); return V;
  }
  const resolverForma = f => typeof f === 'string' ? (FORMAS[f] || FORMAS.adulto) : f ? (f.k && f.menton ? f : Object.assign({}, FORMAS.adulto, f)) : FORMAS.adulto;

  // deltas (unidades de R) para un yaw y un roll dados: interpolación lineal por |yaw|, espejo para yaw<0, giro por roll
  function deltas(f, yaw, roll) {
    const V = vistasDe(f); if (!V) return null;
    let a = ((yaw % (2 * PI)) + 3 * PI) % (2 * PI) - PI; const neg = a < 0; a = Math.abs(a) * 180 / PI;
    const j = Math.min(3, Math.floor(a / 45)), k = (a - 45 * j) / 45, d = new Array(N);
    for (let i = 0; i < N; i++) d[i] = V[j][i] + (V[j + 1][i] - V[j][i]) * k;
    const sp = neg ? d.map((_, i) => d[(N - i) % N]) : d, off = roll / (2 * PI) * N, out = new Array(N);
    for (let i = 0; i < N; i++) { const x = ((i - off) % N + N) % N, i0 = Math.floor(x), t = x - i0; out[i] = sp[i0 % N] * (1 - t) + sp[(i0 + 1) % N] * t; }
    return out;
  }

  // silueta de la cara (puntos 2D)
  function silueta(M, f) {
    const base = G3.siluetaNube(nubeDe(f), M, 3), d = deltas(f, M.yaw, M.roll);
    if (!d) return base;
    const c = [M.o[0], M.o[1]], est = G3.remuestrearPolar(base, c, N), R = M.escala;
    return P.suavizar(est.map((p, i) => { const dx = p[0] - c[0], dy = p[1] - c[1], l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * d[i] * R, p[1] + dy / l * d[i] * R]; }), 4, true);
  }

  // región de sombra plana sobre una esfera unidad (u derecha, v abajo) para la luz L: polígono en coordenadas unidad
  function poliSombra(L, thr) {
    const z = L.clave3 != null ? L.clave3 : (L.z != null ? L.z : 0.75), n0 = Math.hypot(L.dir[0], L.dir[1], z), l = [L.dir[0] / n0, L.dir[1] / n0, z / n0];
    const l2 = Math.hypot(l[0], l[1]); if (thr >= l2 || thr <= -l2) return thr >= l2 ? [[-3, -3], [3, -3], [3, 3], [-3, 3]] : null;
    const th = Math.atan2(l[1], l[0]), be = Math.acos(thr / l2), A = th + be, B = th - be, s = Math.sqrt(1 - thr * thr);
    const e1 = [l[1], -l[0], 0], le = Math.hypot(e1[0], e1[1]); e1[0] /= le; e1[1] /= le;
    const e2 = G3.cruz(l, e1), arco = [];
    for (let i = 0; i < 96; i++) { const ph = i / 96 * 2 * PI, n = [thr * l[0] + s * (Math.cos(ph) * e1[0] + Math.sin(ph) * e2[0]), thr * l[1] + s * (Math.cos(ph) * e1[1] + Math.sin(ph) * e2[1]), thr * l[2] + s * (Math.cos(ph) * e1[2] + Math.sin(ph) * e2[2])]; arco.push(n); }
    let i0 = arco.findIndex(n => n[2] < 0); if (i0 < 0) i0 = 0;
    const vis = []; for (let i = 1; i <= 96; i++) { const n = arco[(i0 + i) % 96]; if (n[2] >= 0) vis.push([n[0], n[1]]); }
    const pa = [Math.cos(A), Math.sin(A)], pb = [Math.cos(B), Math.sin(B)];
    if (vis.length && Math.hypot(vis[0][0] - pb[0], vis[0][1] - pb[1]) > Math.hypot(vis[0][0] - pa[0], vis[0][1] - pa[1])) vis.reverse();   // que vaya de B a A
    const poli = [pa.map(v => v * 1), pa.map(v => v * 3)];
    const a0 = A, a1 = B + 2 * PI; for (let i = 1; i < 16; i++) { const a = a0 + (a1 - a0) * i / 16; poli.push([Math.cos(a) * 3, Math.sin(a) * 3]); }
    poli.push(pb.map(v => v * 3), pb.slice(), ...vis);
    return poli;
  }

  // ---- ayudas de dibujo (con modo máscara para las pruebas: rasgos en verde plano)
  function estilo(ctx, mask, c, a, trazo) {
    if (mask) { const col = a >= 0.5 ? '#00ff00' : 'rgba(0,0,0,0)'; if (trazo) ctx.strokeStyle = col; else ctx.fillStyle = col; ctx.globalAlpha = 1; return; }
    if (trazo) ctx.strokeStyle = I.css(c); else ctx.fillStyle = I.css(c);
    ctx.globalAlpha = a;
  }

  function dibujar(ctx, marco, o) {
    o = o || {};
    const f = resolverForma(o.forma), R = o.R || marco.escala || 1;
    const M = G3.marco({ o: marco.o, yaw: marco.yaw || 0, pitch: marco.pitch || 0, roll: marco.roll || 0, escala: R });
    const mask = o._mascara || null, sinRecorte = !!o._sinRecorte;
    const L = o.luz || I.luzActual || I.LUZ_DEFECTO;
    const sil = silueta(M, f), silPath = P.aPath(sil);
    const res = { silueta: silPath, pts: sil, centro: [M.o[0], M.o[1]], nariz: null };
    if (mask === 'sil') { ctx.save(); ctx.fillStyle = '#ff0000'; ctx.fill(silPath); ctx.restore(); return res; }

    const piel = o.piel || '#e6b48f';
    const peloO = o.pelo === false ? null : (o.pelo || {}), colPelo = (peloO && peloO.color) || '#3b2924';
    let ojosO = o.ojos || {}; if (typeof ojosO === 'string') ojosO = EXPR[ojosO] === undefined && /^(puntos|trazo|redondos)$/.test(ojosO) ? { estilo: ojosO } : { color: ojosO };
    const estiloOjo = ojosO.estilo || 'puntos', colOjo = ojosO.color || '#3b2a22';
    let ex = o.expresion || 'neutra'; if (typeof ex === 'string') ex = EXPR[ex] || EXPR.neutra;
    ex = Object.assign({}, EXPR.neutra, ex);
    const boca = Array.isArray(ex.boca) ? ex.boca : [ex.boca || 0, 0], ceja = ex.ceja || [0, 0];
    const mir = o.mirada || ex.mirada || [0, 0], parp = o.parpadeo == null ? 1 : o.parpadeo, parpado = clamp(o.parpado || 0, 0, 1);
    const mej = o.mejillas != null ? o.mejillas : ex.mejillas;
    const ap = clamp(ex.ojo * parp, 0.05, 1.15), feliz = ex.ojo < 0.2 && boca[0] > 0.5;
    const cosP = Math.max(0.5, Math.cos(M.pitch)), cl = I.oscurece(colPelo, 0.3);
    const base = I.mezcla(piel, L.ambiente, 0.12);

    const vis = (lon, lat) => M.dirAMundo(sph(lon, lat, [1, 1, 1]))[2];          // normal · cámara
    const pos = (lon, lat) => G3.proyectar(sph(lon, lat, f.k), M);
    const plano = { volumen: 0, plano: true, borde: 0, sombraInterna: 0, textura: 0, irregular: 0 };
    const hook = I.Cabeza25.ganchoPelo;
    const capaPelo = capa => {
      if (!peloO) return;
      if (typeof hook === 'function') { hook(ctx, capa, M, peloO, { silueta: sil, forma: f, R }); return; }
      if (capa !== 'delante') return;                                              // casquete liso de prueba (el pelo real es de WP5)
      const nube = []; for (let lo = 0; lo < 360; lo += 15) for (const la of [-90, -75, -62, -50, -40]) nube.push(sph(lo * PI / 180, la * PI / 180, [0.97 * f.k[0] / 0.92, 1.17 * f.k[1] / 1.12, 1.05 * f.k[2]]));
      for (const lo of [-0.5, 0, 0.5]) nube.push(sph(lo, -0.62, [0.97 * f.k[0] / 0.92, 1.17 * f.k[1] / 1.12, 1.05 * f.k[2]]));
      P.forma(ctx, G3.siluetaNube(nube, M, 3), { color: colPelo, semilla: 4, volumen: 0.4, borde: 0.5, irregular: 0, textura: 0, sombraInterna: 0.25 });
    };
    const oreja = lado => {
      const q = G3.proyectar([0.9 * lado * f.k[0] / 0.92, 0.15, -0.05], M), nz = vis(lado * PI / 2, 0);
      const rx = R * 0.16 * f.oreja * (0.35 + 0.65 * Math.abs(nz)), ry = R * 0.22 * f.oreja, c = I.oscurece(piel, 0.1);
      P.forma(ctx, P.elipse(q[0], q[1], rx, ry, M.roll, 20), Object.assign({ color: c }, plano));
      if (Math.abs(nz) > 0.5) { ctx.save(); ctx.strokeStyle = I.css(I.oscurece(piel, 0.3), 0.35 * (Math.abs(nz) - 0.5) * 2); ctx.lineWidth = Math.max(0.6, R * 0.025); ctx.beginPath(); ctx.ellipse(q[0], q[1], rx * 0.5, ry * 0.55, M.roll, 0, 7); ctx.stroke(); ctx.restore(); }
      return nz;
    };

    const rasgos = () => {
      // ---- rubor
      if (!mask) for (const l of [-1, 1]) {
        const lon = 0.58 * l, nz = vis(lon, 0.32), k = suave(clamp(nz / 0.25, 0, 1)); if (k <= 0 || mej <= 0.02) continue;
        const q = pos(lon, 0.32), esc = Math.pow(Math.max(nz, 0), 0.6), rr = R * 0.2;
        ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(M.roll); ctx.scale(Math.max(esc, 0.15), cosP);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr); g.addColorStop(0, I.css('#e07a6a', 0.45 * mej * k)); g.addColorStop(1, I.css('#e07a6a', 0));
        ctx.fillStyle = g; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore();
      }
      // ---- ojos y cejas
      for (const l of [-1, 1]) {
        const lon = f.ojoLon * l, nz = vis(lon, f.ojoLat), k = suave(clamp(nz / 0.25, 0, 1)); if (k <= 0) continue;
        const q = pos(lon, f.ojoLat), esc = Math.pow(Math.max(nz, 0), 0.6), out = l;
        const r = R * f.ojoEsc;
        ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(M.roll); ctx.scale(esc, cosP); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const gx = mir[0] * 0.045 * r, gy = mir[1] * 0.04 * r;
        if (feliz) {
          estilo(ctx, mask, cl, k, true); ctx.lineWidth = Math.max(0.8, 0.055 * R);
          ctx.beginPath(); ctx.moveTo(-0.12 * r, 0.03 * r); ctx.quadraticCurveTo(0, -0.1 * r, 0.12 * r, 0.03 * r); ctx.stroke();
        } else if (estiloOjo === 'trazo') {
          estilo(ctx, mask, cl, k, true); ctx.lineWidth = Math.max(0.8, 0.06 * R);
          const h = (0.02 + 0.1 * ap) * r;
          ctx.beginPath(); ctx.moveTo(-out * 0.12 * r, -0.01 * r); ctx.quadraticCurveTo(0, -0.03 * r - 0.04 * r * ap, out * 0.14 * r, 0.05 * r); ctx.stroke();
          ctx.lineWidth = Math.max(0.6, 0.02 * R); ctx.globalAlpha = k * 0.4 * (mask ? 0 : 1); ctx.beginPath(); ctx.moveTo(-out * 0.09 * r, 0.035 * r); ctx.quadraticCurveTo(0, 0.05 * r + h * 0.4, out * 0.09 * r, 0.04 * r); ctx.stroke();
        } else if (estiloOjo === 'redondos') {
          const w = 0.15 * r, h = 0.17 * r * ap;
          estilo(ctx, mask, '#efe6da', k); ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, 7); ctx.fill();
          if (!mask) {
            ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, 7); ctx.clip();
            const ix = gx + 0.02 * r, iy = gy + 0.02 * r;
            ctx.globalAlpha = k; ctx.fillStyle = I.css(colOjo); ctx.beginPath(); ctx.ellipse(ix, iy, 0.105 * r, Math.min(0.12 * r, h * 1.05), 0, 0, 7); ctx.fill();
            ctx.fillStyle = I.css(I.oscurece(colOjo, 0.6)); ctx.beginPath(); ctx.ellipse(ix, iy, 0.055 * r, 0.065 * r, 0, 0, 7); ctx.fill();
            ctx.fillStyle = 'rgba(255,250,240,0.92)'; ctx.beginPath(); ctx.arc(ix - 0.03 * r, iy - 0.045 * r, 0.032 * r, 0, 7); ctx.fill();
            ctx.fillStyle = I.css(I.oscurece(piel, 0.4), 0.35); ctx.fillRect(-w, -h - 1, 2 * w, h * (0.55 + parpado * 1.1)); ctx.restore();
          }
          estilo(ctx, mask, cl, k, true); ctx.lineWidth = Math.max(0.8, 0.055 * R);
          ctx.beginPath(); ctx.ellipse(0, 0, w * 1.05, h, 0, PI * 1.1, PI * 1.9); ctx.stroke();
        } else {                                                                      // puntos
          const rx = 0.07 * r, ry = 0.09 * r * ap, cy = ry * 0.1, top = cy - ry + 2 * ry * parpado * 0.7;
          estilo(ctx, mask, I.oscurece(colOjo, 0.5), k);
          ctx.save(); ctx.beginPath(); ctx.rect(-4 * r, top, 8 * r, 4 * r); ctx.clip();
          ctx.beginPath(); ctx.ellipse(gx, cy + gy, rx, ry, 0, 0, 7); ctx.fill();
          if (!mask && ap > 0.3) { ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * k).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(gx - 0.3 * rx, cy + gy - 0.35 * ry, Math.max(0.5, 0.012 * R), 0, 7); ctx.fill(); }
          ctx.restore();
          estilo(ctx, mask, cl, k, true); ctx.lineWidth = Math.max(0.8, 0.05 * R);
          ctx.beginPath(); ctx.moveTo(-out * 1.5 * rx, top + 0.5 * ry); ctx.quadraticCurveTo(0, top - 0.85 * ry, out * 1.9 * rx, top + 0.4 * ry); ctx.stroke();
        }
        ctx.restore();
        // ceja: cinta rellena sobre la superficie
        const [incl, alt] = ceja, lo0 = f.ojoLon * l, la = -0.26 - alt * 0.1;
        const pI = pos(lo0 - 0.15 * l, la + incl * 0.07), pO = pos(lo0 + 0.15 * l, la - incl * 0.025 + 0.02), pM = pos(lo0, (2 * la + incl * 0.045 + 0.02) / 2 - 0.035);
        const cinta = P.cinta(P.suavizar([pI, pM, pO].map(v => [v[0], v[1]]), 5, false), Math.max(1, 0.075 * R), Math.max(0.8, 0.04 * R));
        ctx.save(); if (!mask) estilo(ctx, mask, I.oscurece(colPelo, 0.1), k); else estilo(ctx, mask, cl, k); const cp = P.aPath(cinta); ctx.fill(cp); ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(0.6, 0.025 * R); if (mask) ctx.strokeStyle = '#00ff00'; else ctx.strokeStyle = I.css(I.oscurece(colPelo, 0.1)); ctx.stroke(cp); ctx.restore();
      }
      // ---- boca: curva sobre la superficie con visibilidad por punto
      {
        const cv = boca[0], ab = boca[1], an = f.bocaAncho * (1 - 0.45 * clamp(ab, 0, 1)), n = 11, sup = [], inf = [];
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1) * 2 - 1, lon = an * u, lat0 = f.bocaLat - cv * (0.1 * u * u - 0.045);
          sup.push({ q: pos(lon, lat0), nz: vis(lon, lat0) });
          const prof = ab * 0.2 * Math.pow(Math.max(0, 1 - u * u), 0.7);
          inf.push({ q: pos(lon, lat0 + prof), nz: vis(lon, lat0 + prof) });
        }
        if (ab > 0.02) {
          const v = sup.map((p, i) => i).filter(i => sup[i].nz > 0.02 && inf[i].nz > 0.02);
          if (v.length > 2) {
            const ka = suave(clamp(Math.max(...v.map(i => sup[i].nz)) / 0.25, 0, 1));
            estilo(ctx, mask, '#4a2222', ka); ctx.beginPath(); v.forEach((i, j) => j ? ctx.lineTo(sup[i].q[0], sup[i].q[1]) : ctx.moveTo(sup[i].q[0], sup[i].q[1])); for (let j = v.length - 1; j >= 0; j--) ctx.lineTo(inf[v[j]].q[0], inf[v[j]].q[1]); ctx.closePath(); ctx.fill();
          }
        }
        ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.8, 0.045 * R);
        for (let i = 0; i < n - 1; i++) {
          const nz = (sup[i].nz + sup[i + 1].nz) / 2, k = suave(clamp(nz / 0.25, 0, 1)); if (k <= 0) continue;
          estilo(ctx, mask, '#7b3b37', k, true); ctx.beginPath(); ctx.moveTo(sup[i].q[0], sup[i].q[1]); ctx.lineTo(sup[i + 1].q[0], sup[i + 1].q[1]); ctx.stroke();
        }
        ctx.restore();
      }
    };

    if (mask === 'rasgos') { ctx.save(); if (!sinRecorte) ctx.clip(silPath); rasgos(); ctx.restore(); return res; }

    // ---- orden de §6.4: pelo detrás, orejas lejanas, cara, rasgos, nariz, orejas cercanas, pelo delante
    capaPelo('detras');
    const nzO = { '-1': vis(-PI / 2, 0), '1': vis(PI / 2, 0) };
    for (const l of [-1, 1]) if (nzO[l] <= 0) oreja(l);
    const estCara = { color: piel, semilla: 4, volumen: 0, borde: o.borde == null ? 0.5 : o.borde, sombraInterna: 0, textura: 0, irregular: 0 };
    if (P.campos && P.campos.elipsoide) { estCara.campo = P.campos.elipsoide([M.o[0], M.o[1] + 0.05 * R], R * 0.95, R * 1.05, 0, L); estCara.nominal = [2 * R, 2.4 * R]; }
    P.forma(ctx, sil, estCara);
    // sombra plana en dos tonos (cel), recortada a la silueta
    ctx.save(); ctx.clip(silPath);
    for (const [thr, a, osc] of [[0.12, 0.42, 0.1], [-0.12, 0.3, 0.22]]) {
      const pl = poliSombra(L, thr); if (!pl) continue;
      ctx.globalAlpha = a; ctx.fillStyle = I.css(I.mezcla(I.oscurece(base, osc), '#a8504c', 0.22));
      ctx.beginPath(); pl.forEach((p, i) => { const x = M.o[0] + p[0] * R * 0.95, y = M.o[1] + 0.05 * R + p[1] * R * 1.05; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.save(); ctx.clip(silPath); rasgos(); ctx.restore();

    // ---- nariz: no se recorta a la silueta; la parte que cae sobre la cara se funde según su normal
    {
      const nzN = vis(0, 0.45), kIn = suave(clamp((nzN + 0.15) / 0.3, 0, 1));
      const tip = Array.isArray(o.nariz) ? o.nariz : NARICES[o.nariz || f.nariz] || NARICES.recta;
      const pp = [[0, 0.05, 1.0], [0.13, 0.40, 0.95], tip, [-0.13, 0.40, 0.95]].map(p => G3.proyectar(p, M));
      const npts = G3.siluetaNube([[0, 0.05, 1.0], [0.04, 0.2, (1.0 + tip[2]) / 2 + 0.02], [-0.04, 0.2, (1.0 + tip[2]) / 2 + 0.02], [0.13, 0.40, 0.95], [-0.13, 0.40, 0.95], tip], M, 2);
      res.nariz = npts;
      const dib = () => {
        P.forma(ctx, npts, Object.assign({ color: piel }, plano));
        const np = P.aPath(npts); ctx.save(); ctx.clip(np);
        const cx = (pp[0][0] + pp[2][0]) / 2, cy = (pp[0][1] + pp[2][1]) / 2, d = L.dir, E = R * 2;      // mitad opuesta a la luz = sombra
        ctx.globalAlpha = 0.4; ctx.fillStyle = I.css(I.mezcla(I.oscurece(base, 0.2), '#a8504c', 0.25));
        ctx.beginPath(); ctx.moveTo(cx - d[1] * E, cy + d[0] * E); ctx.lineTo(cx + d[1] * E, cy - d[0] * E); ctx.lineTo(cx + d[1] * E - d[0] * E, cy - d[0] * E - d[1] * E); ctx.lineTo(cx - d[1] * E - d[0] * E, cy + d[0] * E - d[1] * E); ctx.closePath(); ctx.fill();
        ctx.restore();
        const u0 = G3.proyectar([-0.12, 0.43, 0.96], M), u1 = G3.proyectar([0, 0.44, tip[2] - 0.06], M), u2 = G3.proyectar([0.12, 0.43, 0.96], M);
        ctx.save(); ctx.strokeStyle = I.css(I.oscurece(piel, 0.35), 0.5); ctx.lineWidth = Math.max(0.7, 0.03 * R); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(u0[0], u0[1]); ctx.quadraticCurveTo(u1[0], u1[1], u2[0], u2[1]); ctx.stroke(); ctx.restore();
      };
      if (kIn >= 0.999) dib();
      else {
        ctx.save(); const fuera = new Path2D(); fuera.rect(-1e4, -1e4, 2e4, 2e4); fuera.addPath(silPath); ctx.clip(fuera, 'evenodd'); dib(); ctx.restore();   // parte exterior: siempre
        if (kIn > 0.001) { ctx.save(); ctx.clip(silPath); ctx.globalAlpha = kIn; dib(); ctx.restore(); }
      }
    }
    for (const l of [-1, 1]) if (nzO[l] > 0) oreja(l);
    capaPelo('delante');
    return res;
  }

  I.Cabeza25 = { FORMAS, EXPRESIONES: EXPR, NARICES, dibujar, silueta: (marco, forma, R) => silueta(G3.marco({ o: marco.o, yaw: marco.yaw, pitch: marco.pitch, roll: marco.roll, escala: R || marco.escala }), resolverForma(forma)),
    ganchoPelo: null };
})(typeof window !== 'undefined' ? window : globalThis);
