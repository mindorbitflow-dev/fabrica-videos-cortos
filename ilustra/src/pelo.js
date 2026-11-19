/* Ilustra — pelo en mechones con movimiento secundario (Fase 2, §5.4). Lección de P5: el pelo es UNA masa (unión de mechones),
   no tiras sueltas ni esferas. Cada capa ('detras' / 'delante' respecto al centro de la cabeza) se dibuja como una sola forma.
     Ilustra.PEINADOS2                       datos de peinado (melena, corto, mono, coletas, encrespado, largo, calvo)
     Ilustra.Pelo.preparar(marco, opc) -> estado       geometría de ambas capas (con el desplazamiento del muelle)
     Ilustra.Pelo.dibujar(ctx, marco, opc) -> {path, puntas, ...}   dibuja opc.capa ('detras'|'delante'; sin capa: las dos)
   marco = marco G3 de la cabeza (escala = radio R en px; coordenadas locales en unidades de R). opc:
     {peinado: nombre|objeto, color, t, historial:(t')=>marco, capa, id, luz, semilla, viento:(t)=>[ax,ay]|[ax,ay], profundidad, k, ganancia (exagera el desfase del muelle; 2.5 por defecto)} */
(function (G) {
  'use strict';
  const I = G.Ilustra = G.Ilustra || {};
  const P = I.Pincel, G3 = I.G3, D = I.dinamica, TAU = Math.PI * 2;

  // ---------- datos de peinado ----------
  const sph = (lon, lat, k) => [Math.sin(lon) * Math.cos(lat) * k[0], Math.sin(lat) * k[1], Math.cos(lon) * Math.cos(lat) * k[2]];
  const an = (n, a, b, f) => Array.from({ length: n }, (_, i) => f(a + (b - a) * (n === 1 ? 0 : i / (n - 1)), i));
  const mech = (lon, lat, largo, curva, ancho, puntas, frec, amort, rigidez) => ({ lon, lat, largo, curva, ancho, puntas, frec, amort, rigidez });
  const alr = TAU - 1.3;   // el anillo de melena y largo va de lon 1.3 a 2π-1.3 (el frente queda libre para el flequillo)
  const P2 = I.PEINADOS2 = {
    melena: { casquete: { latLinea: -0.55, abultamiento: 0.05 }, color: '#2f221e', brillo: 0.35, extras: [],
      mechones: an(17, 1.3, alr, (lo, i) => mech(lo, -0.5 + 0.08 * Math.sin(i * 2.1), 1.45 + 0.22 * Math.sin(i * 1.7 + 1), 0.25 * (i % 2 ? 1 : -1), 0.8, i % 3 === 0 ? 1 : 0, 2 + 0.1 * (i % 3), 0.38, 0.25))
        .concat(an(5, -0.55, 0.55, (lo, i) => mech(lo, -0.57, 0.27 + 0.03 * (i % 2), 0.5 * Math.sign(lo || 1), 0.55, 0, 2.4, 0.4, 0.45))) },
    corto: { casquete: { latLinea: -0.55, abultamiento: 0.05 }, color: '#2f221e', brillo: 0.35, extras: [],
      mechones: an(14, 0.9, TAU - 0.9, (lo, i) => mech(lo, -0.45, 0.7 + 0.06 * Math.sin(i * 1.9), 0.2 * (i % 2 ? 1 : -1), 0.9, i % 4 === 0 ? 1 : 0, 2.6, 0.4, 0.5))
        .concat(an(5, -0.55, 0.55, (lo, i) => mech(lo, -0.57, 0.2 + 0.03 * (i % 2), 0.4 * Math.sign(lo || 1), 0.55, i % 2, 2.8, 0.42, 0.55))) },
    mono: { casquete: { latLinea: -0.55, abultamiento: 0.05 }, color: '#2f221e', brillo: 0.35,
      extras: [{ tipo: 'mono', pos: [0, -1.3, -0.3], radio: 0.42, frec: 3, amort: 0.4, rigidez: 0.3 }],
      mechones: an(14, 0.9, TAU - 0.9, (lo, i) => mech(lo, -0.45, 0.6, 0.2 * (i % 2 ? 1 : -1), 0.9, 0, 2.6, 0.4, 0.5))
        .concat(an(5, -0.55, 0.55, (lo, i) => mech(lo, -0.57, 0.24, 0.4 * Math.sign(lo || 1), 0.55, 0, 2.6, 0.4, 0.5))) },
    coletas: { casquete: { latLinea: -0.55, abultamiento: 0.05 }, color: '#1f1816', brillo: 0.35,
      extras: [-1, 1].map(s => ({ tipo: 'coleta', lon: s * 1.85, lat: -0.25, largo: 1.0, curva: s * 0.9, ancho: 0.62, puntas: 0, frec: 1.9, amort: 0.4, rigidez: 0.1 }))
        .concat([-1, 1].map(s => ({ tipo: 'lazo', lon: s * 1.85, lat: -0.25, tam: 0.3, color: '#d24a4a' }))),
      mechones: an(15, 0.75, TAU - 0.75, (lo, i) => mech(lo, -0.45, Math.abs(Math.sin(lo)) > 0.97 && Math.cos(lo) < 0.3 ? 0.3 : 0.6, 0, 0.9, 0, 2.6, 0.4, 0.5))
        .concat(an(5, -0.55, 0.55, (lo, i) => mech(lo, -0.58, 0.32, 0.3 * Math.sign(lo || 1), 0.55, 0, 2.6, 0.4, 0.5))) },
    encrespado: { casquete: { latLinea: -0.55, abultamiento: 0.05 }, color: '#1b1514', brillo: 0.3, extras: [],
      mechones: an(15, 0.6, TAU - 0.6, (lo, i) => mech(lo, -0.5 + 0.1 * Math.sin(i * 2.3), 0.62 + 0.2 * (i % 2), 0.8 * (i % 2 ? 1 : -1), 0.78, 2 + (i % 2), 2.4, 0.4, 0.45))
        .concat(an(5, -0.55, 0.55, (lo, i) => mech(lo, -0.57, 0.3 + 0.05 * (i % 2), 0.6 * Math.sign(lo || 1), 0.5, 2, 2.6, 0.42, 0.5))) },
    largo: { casquete: { latLinea: -0.55, abultamiento: 0.05 }, color: '#3a2a22', brillo: 0.4, extras: [],
      mechones: an(19, 1.3, alr, (lo, i) => mech(lo, -0.5 + 0.06 * Math.sin(i * 2.1), 2.0 + 0.25 * Math.sin(i * 1.3), 0.3 * (i % 2 ? 1 : -1), 1.05, i % 3 === 0 ? 1 : 0, 1.7 + 0.1 * (i % 3), 0.42, 0.15))
        .concat(an(5, -0.55, 0.55, (lo, i) => mech(lo, -0.57, 0.3 + 0.04 * (i % 2), 0.5 * Math.sign(lo || 1), 0.55, 0, 2.2, 0.42, 0.4))) },
    calvo: { casquete: null, mechones: [], extras: [], color: '#2f221e', brillo: 0 }
  };
  const TRAD_F1 = { melena: 'melena', corto: 'corto', mono: 'mono', calvo: 'calvo' };
  const resolver = p => typeof p === 'object' && p ? p : (P2[p] || P2[TRAD_F1[p]] || P2.melena);

  // ---------- geometría de un mechón en el espacio local de la cabeza (4 puntos: raíz, fuera, cayendo, punta) ----------
  const FY = [0, 0.3, 0.68, 1], DESP = [0, 0.5, 1, 1.4];     // fracción de caída y reparto del desplazamiento del muelle (§5.4)
  function mechonLocal(m, k) {
    const c = m.curva || 0, s = [1, 1.15, 1.12 + 0.08 * c, 1.06 + 0.2 * c], cl = Math.cos(m.lat), yr = k[1] * Math.sin(m.lat);
    return FY.map((f, i) => { const lo = m.lon + c * 0.3 * f * f; return [Math.sin(lo) * cl * k[0] * s[i], yr - 0.3 + (m.largo + 0.3) * f, Math.cos(lo) * cl * k[2] * s[i]]; });
  }
  const circulo = (cx, cy, r) => P.elipse(cx, cy, r, r, 0, 20);
  const limita = (d, max) => { const l = Math.hypot(d[0], d[1]); return l > max ? [d[0] * max / l, d[1] * max / l] : d; };

  // ---------- preparar: geometría de pantalla de ambas capas ----------
  const ultimo = {};
  function preparar(M, o) {
    const id = o.id == null ? 'pelo' : o.id, p = resolver(o.peinado), R = M.escala, t = o.t == null ? 0 : o.t;
    const clave = [M.o[0], M.o[1], M.o[2], M.yaw, M.pitch, M.roll, R, t, p, o.color, o.semilla, o.k, o.historial, o.viento];
    const u = ultimo[id];
    if (u && u.clave.length === clave.length && u.clave.every((v, i) => v === clave[i])) return u.estado;
    const ab = p.casquete ? p.casquete.abultamiento || 0 : 0, k0 = o.k || [0.92, 1.12, 1.0], k = k0.map(v => v * (1 + ab));
    const semilla = o.semilla || 11, viento = o.viento, gan = o.ganancia == null ? 2.5 : o.ganancia, hist = o.historial && o.t != null ? D.memo(id + '#marco', o.historial) : null;
    const desps = [];
    const capas = { detras: { polis: [], base: [], puntas: [], lineas: [], lazos: [] }, delante: { polis: [], base: [], puntas: [], lineas: [], lazos: [] } };
    // capa por la prof de la raíz; el flequillo (raíz casi de frente) se tolera hasta 0.45R detrás para no quedar oculto tras la frente de perfil
    const capaDe = (prof, frontal) => prof >= M.o[2] - (frontal ? 0.45 * R : 1e-9) ? 'delante' : 'detras';
    const desplaza = (pLocal, m) => {                         // desfase del muelle del punto 'cayendo' (conductor: su posición de mundo en el pasado)
      if (!hist) return [0, 0];
      const cond = tp => { const q = hist(tp).aMundo(pLocal); return [q[0], q[1]]; };
      const d = D.muelle(t, cond, { frec: m.frec || 2.2, amort: m.amort == null ? 0.35 : m.amort, viento: typeof viento === 'function' ? viento : (viento ? () => viento : undefined) });
      const r = (1 - (m.rigidez || 0)) * gan; return limita([d[0] * r, d[1] * r], 1.2 * R);
    };
    const lista = p.mechones.map(m => ({ m, ex: false })).concat((p.extras || []).filter(e => e.tipo === 'coleta').map(m => ({ m, ex: true })));
    lista.forEach(({ m, ex: esExtra }, idx) => {
      const loc = mechonLocal(m, k), w = loc.map(q => M.aMundo(q)), capa = capas[capaDe(w[0][2], !esExtra && Math.cos(m.lon) > 0.75)], d = desplaza(loc[2], m); desps.push(d);
      const pts = w.map((q, i) => [q[0] + d[0] * DESP[i], q[1] + d[1] * DESP[i]]);
      const sm = P.suavizar(pts, 4, false), w0 = m.ancho * R;
      const poli = P.cinta(sm, w0, w0 * 0.25);
      capa.polis.push(poli); capa.base.push(poli);
      const dir = G3.unit([d[0], d[1], 0]), nd = Math.hypot(d[0], d[1]);
      for (let j = 0; j < (m.puntas || 0); j++) {              // puntas sueltas en el último 30 % (3 aleatorios fijos por punta)
        const r = I.rng(semilla * 131 + idx * 17 + j), a = r(), b = r(), c = r();
        const s = 0.7 + 0.25 * a, ii = Math.min(sm.length - 2, Math.round(s * (sm.length - 1)));
        let tx = sm[ii + 1][0] - sm[ii][0], ty = sm[ii + 1][1] - sm[ii][1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        const lado = (j + idx) % 2 ? 1 : -1, nx = -ty * lado, ny = tx * lado, ww = (w0 + (w0 * 0.25 - w0) * s);
        const bx = sm[ii][0] + nx * ww * 0.25, by = sm[ii][1] + ny * ww * 0.25, len = (0.25 + 0.15 * b) * R, ang = 0.45 + 0.3 * c;
        let ux = tx * Math.cos(ang) + nx * Math.sin(ang), uy = ty * Math.cos(ang) + ny * Math.sin(ang);
        const tip = [bx + ux * len + dir[0] * Math.min(nd, 0.6 * R) * 0.35, by + uy * len + dir[1] * Math.min(nd, 0.6 * R) * 0.35];
        const tri = [[bx - tx * 0.06 * R, by - ty * 0.06 * R], tip, [bx + tx * 0.06 * R, by + ty * 0.06 * R], [sm[ii][0], sm[ii][1]]];   // el cuarto punto la ancla al centro del mechón (sin rendijas)
        capa.polis.push(tri); capa.puntas.push({ apice: tip, poli: tri });
      }
      if ((m.puntas || 0) > 0 && !esExtra) capa.lineas.push({ pts: sm, w0, prof: w[0][2] });
    });
    for (const e of (p.extras || [])) {
      if (e.tipo === 'mono') {
        const w = M.aMundo(e.pos), d = desplaza(e.pos, e), capa = capas[capaDe(w[2])], poli = circulo(w[0] + d[0], w[1] + d[1], e.radio * R);
        capa.polis.push(poli); capa.base.push(poli);
      } else if (e.tipo === 'lazo') {
        const q = M.aMundo(sph(e.lon, e.lat, k.map(v => v * 1.12)));
        capas[capaDe(q[2])].lazos.push({ c: q, tam: e.tam * R, color: e.color, lon: e.lon });
      }
    }
    if (p.casquete) {                                           // envolvente del casquete: siempre en 'delante' (forma la línea del pelo)
      const lat = p.casquete.latLinea, nube = [];
      for (let lo = 0; lo < 360; lo += 20) for (const la of [-Math.PI / 2, (-Math.PI / 2 + lat) / 2, lat]) nube.push(sph(lo * Math.PI / 180, la, k));
      const hull = G3.siluetaNube(nube, M, 3);
      capas.delante.polis.push(hull); capas.delante.base.push(hull);
    }
    // masas
    const cx = M.o[0], cy = M.o[1];
    for (const nombre of ['detras', 'delante']) {
      const c = capas[nombre];
      c.path = c.polis.length ? P.union(c.polis) : null; c.pathBase = c.base.length ? P.union(c.base) : null;
    }
    // separación: 2..5 líneas oscuras en la capa delante, entre los mechones con puntas y raíz cerca de cámara
    const cand = capas.delante.lineas, nl = cand.length ? Math.min(cand.length, Math.max(2, Math.min(5, Math.round(cand.length / 3)))) : 0;
    capas.delante.separacion = Array.from({ length: nl }, (_, i) => cand[Math.floor(i * cand.length / nl)]);
    const estado = { R, capas, color: o.color || p.color, brillo: p.brillo == null ? 0.35 : p.brillo, centro: [cx, cy], marco: M, desp: desps, vacio: !p.casquete && !p.mechones.length && !(p.extras || []).length };
    ultimo[id] = { clave, estado };
    return estado;
  }

  // ---------- dibujo de una capa ----------
  function dibujarCapa(ctx, st, nombre, o) {
    const c = st.capas[nombre];
    if (!c.path) return { path: null, puntas: [], pathBase: null };
    const R = st.R, L = o.luz || I.luzActual || I.LUZ_DEFECTO, M = st.marco, col = st.color;
    const campo = (P.campos || {}).elipsoide ? P.campos.elipsoide(st.centro, R * 1.1 * 0.97, R * 1.1 * 1.17, M.roll, L) : undefined;
    const cr = Math.cos(M.roll), sr = Math.sin(M.roll);                   // marco de pintura en pantalla (solo alabeo): no se degenera al girar
    const ex = [2.6 * R * cr, 2.6 * R * sr], ey = [-3 * R * sr, 3 * R * cr];
    P.forma(ctx, c.path, { color: col, semilla: (o.semilla || 11) + (nombre === 'delante' ? 3 : 0), volumen: 0.55, borde: 0.45, sombraInterna: 0.3, textura: 0.18,
      irregular: 0, luz: L, profundidad: o.profundidad || 0, caja: c.path._caja, campo, nominal: [2.6 * R, 3.2 * R],
      marco: { o: [st.centro[0] - (ex[0] + ey[0]) / 2, st.centro[1] - (ex[1] + ey[1]) / 2], ex, ey } });
    ctx.save();
    ctx.clip(c.path);                                           // un solo clip por capa
    if (nombre === 'delante') {
      for (const l of c.separacion) {                           // separación entre mechones
        const n = l.pts.length, a = Math.floor(n * 0.2), pts = l.pts.slice(a);
        P.trazo(ctx, pts, { color: I.oscurece(col, 0.35), alfa: 0.5, ancho: Math.max(0.8, 0.025 * R), profundidad: o.profundidad || 0, luz: L });
      }
      if (st.brillo > 0) {                                      // brillo en la coronilla, siguiendo la luz
        const dx = L.dir[0], dy = L.dir[1], ang = Math.atan2(dy, dx) + Math.PI / 2, bx = st.centro[0] + dx * 0.55 * R, by = st.centro[1] + dy * 0.62 * R - 0.15 * R;
        ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.min(1, st.brillo * 0.4 * 2.2);
        ctx.translate(bx, by); ctx.rotate(ang); ctx.scale(1, 0.25);
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.65 * R), cb = I.aclara(col, 0.25);
        gr.addColorStop(0, I.css(cb, 1)); gr.addColorStop(0.6, I.css(cb, 0.6)); gr.addColorStop(1, I.css(cb, 0));
        ctx.fillStyle = gr; ctx.fillRect(-0.7 * R, -0.7 * R, 1.4 * R, 1.4 * R);
      }
    }
    ctx.restore();
    for (const z of c.lazos) {                                  // lazos: dos pétalos y un nudo
      const sg = Math.sign(Math.sin(z.lon)) || 1, a = -0.5 * sg;
      const pet = s => { const cs = Math.cos(a), sn = Math.sin(a); return P.elipse(z.c[0] + (cs * s * z.tam * 0.8), z.c[1] + sn * s * z.tam * 0.8, z.tam * 0.85, z.tam * 0.42, a, 14); };
      for (const s of [-1, 1]) P.forma(ctx, pet(s), { color: z.color, semilla: 5, volumen: 0.6, borde: 0.4, sombraInterna: 0.25, textura: 0.1, irregular: 0, luz: L, profundidad: o.profundidad || 0 });
      P.forma(ctx, circulo(z.c[0], z.c[1], z.tam * 0.3), { color: I.oscurece(z.color, 0.15), semilla: 6, volumen: 0.6, borde: 0.3, sombraInterna: 0.2, textura: 0, irregular: 0, luz: L, profundidad: o.profundidad || 0 });
    }
    return { path: c.path, pathBase: c.pathBase, puntas: c.puntas, caja: c.path._caja };
  }

  I.Pelo = {
    preparar,
    dibujar(ctx, marco, o = {}) {
      const st = preparar(marco, o);
      if (o.capa) return dibujarCapa(ctx, st, o.capa, o);
      const a = dibujarCapa(ctx, st, 'detras', o), b = dibujarCapa(ctx, st, 'delante', o);
      return { detras: a, delante: b };
    },
    traducir: n => TRAD_F1[n] || 'melena', resolver
  };
})(typeof window !== 'undefined' ? window : globalThis);
