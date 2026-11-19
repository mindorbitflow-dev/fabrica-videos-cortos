/* Ilustra — movimiento secundario determinista (Fase 2, §5.5; validado en el prototipo P6).
   Todo es función pura de t: se re-simula una ventana fija hacia atrás con paso fijo y rejilla global.
     Ilustra.dinamica.muelle(t, conductor, {frec, amort, ventana, dt, muestreo, id, viento}) -> [dx, dy]
     Ilustra.dinamica.cadena(t, conductorRaiz, n, {largoSeg, frec, amort, gravedad, viento, ...}) -> [[x,y], ...] (n+1 puntos)
     Ilustra.dinamica.memo(id, fn) -> fn memoizada en la rejilla;  Ilustra.dinamica.vaciarCache() */
(function (G) {
  'use strict';
  const I = G.Ilustra = G.Ilustra || {};
  const D = I.dinamica = {};
  const DT = 1 / 240, MUESTREO = 1 / 60, MAX_CACHE = 512;

  // ---- caché de muestras del conductor, por (id, muestreo, k). Solo acelera: nunca cambia un resultado.
  // Cada entrada guarda la función que la produjo: si el llamador pasa otra función con el mismo id, se descarta.
  let cache = new Map(), entradas = 0;
  D.vaciarCache = function () { cache = new Map(); entradas = 0; };
  function tabla(id, fn, muestreo) {
    if (id == null) return null;
    const clave = id + '|' + muestreo;
    let e = cache.get(clave);
    if (!e || e.fn !== fn) {
      if (e) entradas -= e.m.size;
      e = { fn, m: new Map() }; cache.set(clave, e);
    }
    return e;
  }
  function muestra(e, fn, k, muestreo) {
    if (!e) return fn(k * muestreo);
    let v = e.m.get(k);
    if (v === undefined) {
      if (entradas >= MAX_CACHE) { D.vaciarCache(); e = tabla(null); return fn(k * muestreo); }
      v = fn(k * muestreo); e.m.set(k, v); entradas++;
    }
    return v;
  }
  // Memoiza fn(t') cuando t' cae en la rejilla (justo lo que hacen muelle y cadena). Útil si fn es cara (resolver un rig).
  D.memo = function (id, fn, muestreo = MUESTREO) {
    const e = tabla(id, fn, muestreo);
    if (!e) return fn;
    const f = tp => { const k = Math.round(tp / muestreo); return Math.abs(k * muestreo - tp) < 1e-9 ? muestra(e, fn, k, muestreo) : fn(tp); };
    return f;
  };

  D.alinear = (s, dt = DT) => Math.round(s / dt) * dt;

  // Rango de pasos [j0, j1] y rejilla de muestras que cubre la ventana.
  function rango(t, ventana, dt, muestreo) {
    const j1 = Math.max(0, Math.round(t / dt)), j0 = Math.max(0, Math.round((t - ventana) / dt));
    const r = muestreo / dt, entero = Math.abs(r - Math.round(r)) < 1e-9;
    return { j0, j1, r: entero ? Math.round(r) : r, entero, k0: Math.floor(j0 * dt / muestreo + 1e-9), k1: Math.ceil(j1 * dt / muestreo - 1e-9) + 1 };
  }
  // índice k y fracción para el paso j (aritmética entera si el muestreo es múltiplo de dt)
  function kf(j, g, dt, muestreo) {
    if (g.entero) { const k = Math.floor(j / g.r); return [k, (j - k * g.r) / g.r]; }
    const s = j * dt / muestreo, k = Math.floor(s + 1e-9); return [k, Math.min(1, Math.max(0, s - k))];
  }

  // ---------- muelle ----------
  D.muelle = function (t, conductor, o = {}) {
    const frec = o.frec == null ? 2.2 : o.frec, zeta = o.amort == null ? 0.35 : o.amort;
    const ventana = o.ventana == null ? 1.2 : o.ventana, dt = o.dt || DT, muestreo = o.muestreo || MUESTREO, viento = o.viento;
    const w = 2 * Math.PI * frec, w2 = w * w, c2 = 2 * zeta * w;
    const g = rango(t, ventana, dt, muestreo), tab = tabla(o.id, conductor, muestreo);
    const n = g.k1 - g.k0 + 1, X = new Float64Array(n), Y = new Float64Array(n);
    for (let i = 0; i < n; i++) { const c = muestra(tab, conductor, g.k0 + i, muestreo); X[i] = c[0]; Y[i] = c[1]; }
    const cond = j => {                                    // conductor interpolado linealmente en el paso j
      const kk = kf(j, g, dt, muestreo), i = kk[0] - g.k0, f = kk[1];
      return f === 0 ? [X[i], Y[i]] : [X[i] + (X[i + 1] - X[i]) * f, Y[i] + (Y[i + 1] - Y[i]) * f];
    };
    let c = cond(g.j0), x = c[0], y = c[1], vx = 0, vy = 0;
    if (viento) { const a = viento(g.j0 * dt); x += a[0] / w2; y += a[1] / w2; }   // equilibrio con viento constante
    for (let j = g.j0 + 1; j <= g.j1; j++) {
      c = cond(j);
      let ax = -w2 * (x - c[0]) - c2 * vx, ay = -w2 * (y - c[1]) - c2 * vy;
      if (viento) { const a = viento(j * dt); ax += a[0]; ay += a[1]; }
      vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt;       // Euler semi-implícito
    }
    c = cond(g.j1);
    return [x - c[0], y - c[1]];
  };

  // ---------- cadena ----------
  // Cadena de n segmentos rígidos de largo largoSeg colgada de la raíz (conductorRaiz(t) -> {p:[x,y], ang}).
  // ang = dirección de reposo de la cadena, medida desde "abajo" hacia +x (ang 0: cuelga recta hacia abajo).
  // Cada punto tiene un muelle hacia su posición de reposo (más blando hacia la punta); gravedad = fracción de largoSeg que
  // caen en reposo; viento(t) -> [ax, ay] es una aceleración en px/s². Restricciones de distancia por proyección (PBD).
  // Devuelve n+1 puntos: [raíz, p1, ..., pn].
  D.cadena = function (t, conductorRaiz, n, o = {}) {
    const L = o.largoSeg == null ? 10 : o.largoSeg, frec = o.frec == null ? 2.2 : o.frec, zeta = o.amort == null ? 0.35 : o.amort;
    const grav = o.gravedad == null ? 0.3 : o.gravedad, viento = o.viento;
    const ventana = o.ventana == null ? 1.2 : o.ventana, dt = o.dt || DT, muestreo = o.muestreo || MUESTREO;
    const g = rango(t, ventana, dt, muestreo), tab = tabla(o.id, conductorRaiz, muestreo);
    const m = g.k1 - g.k0 + 1, PX = new Float64Array(m), PY = new Float64Array(m), AN = new Float64Array(m);
    for (let i = 0; i < m; i++) { const c = muestra(tab, conductorRaiz, g.k0 + i, muestreo); PX[i] = c.p[0]; PY[i] = c.p[1]; AN[i] = c.ang || 0; }
    const w0 = 2 * Math.PI * frec, W2 = new Float64Array(n + 1), C2 = new Float64Array(n + 1);
    for (let i = 1; i <= n; i++) { const w = w0 * (1 - 0.45 * (i - 1) / Math.max(1, n - 1)); W2[i] = w * w; C2[i] = 2 * zeta * w; }
    const qx = new Float64Array(n + 1), qy = new Float64Array(n + 1), vx = new Float64Array(n + 1), vy = new Float64Array(n + 1);
    const rx = new Float64Array(n + 1), ry = new Float64Array(n + 1), px = new Float64Array(n + 1), py = new Float64Array(n + 1);
    const raiz = j => {
      const kk = kf(j, g, dt, muestreo), i = kk[0] - g.k0, f = kk[1];
      return f === 0 ? [PX[i], PY[i], AN[i]] : [PX[i] + (PX[i + 1] - PX[i]) * f, PY[i] + (PY[i + 1] - PY[i]) * f, AN[i] + (AN[i + 1] - AN[i]) * f];
    };
    const reposo = r => { const sx = Math.sin(r[2]), sy = Math.cos(r[2]); for (let i = 0; i <= n; i++) { rx[i] = r[0] + sx * L * i; ry[i] = r[1] + sy * L * i; } };
    let r = raiz(g.j0); reposo(r);
    for (let i = 0; i <= n; i++) { qx[i] = rx[i]; qy[i] = ry[i]; }
    for (let j = g.j0 + 1; j <= g.j1; j++) {
      r = raiz(j); reposo(r);
      const s = j * dt, vw = viento ? viento(s) : null;
      qx[0] = r[0]; qy[0] = r[1]; vx[0] = vy[0] = 0;
      for (let i = 1; i <= n; i++) {
        let ax = -W2[i] * (qx[i] - rx[i]) - C2[i] * vx[i], ay = -W2[i] * (qy[i] - ry[i]) - C2[i] * vy[i] + grav * W2[i] * L;
        if (vw) { ax += vw[0]; ay += vw[1]; }
        vx[i] += ax * dt; vy[i] += ay * dt; px[i] = qx[i] + vx[i] * dt; py[i] = qy[i] + vy[i] * dt;
      }
      px[0] = qx[0]; py[0] = qy[0];
      for (let i = 1; i <= n; i++) {                       // proyección de las distancias, de la raíz a la punta
        let dx = px[i] - px[i - 1], dy = py[i] - py[i - 1]; const l = Math.hypot(dx, dy);
        if (l > 1e-9) { dx *= L / l; dy *= L / l; } else { dx = Math.sin(r[2]) * L; dy = Math.cos(r[2]) * L; }
        px[i] = px[i - 1] + dx; py[i] = py[i - 1] + dy;
      }
      for (let i = 1; i <= n; i++) { vx[i] = (px[i] - qx[i]) / dt; vy[i] = (py[i] - qy[i]) / dt; qx[i] = px[i]; qy[i] = py[i]; }
    }
    const out = [];
    for (let i = 0; i <= n; i++) out.push([qx[i], qy[i]]);
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
