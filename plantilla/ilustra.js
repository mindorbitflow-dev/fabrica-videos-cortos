/* Ilustra — kit de ilustración animada (Canvas 2D). Archivo generado: no editar. */
/* ===== nucleo.js ===== */
/* Ilustra — núcleo: azar determinista, ruido, color, interpolación. */
(function (G) {
  'use strict';
  const I = G.Ilustra = G.Ilustra || {};
  I.ANCHO = 1080; I.ALTO = 1920;
  I.ZONA = { arriba: 250, abajo: 420, izq: 70, der: 140, dibujo: [430, 1190], subtitulos: [1210, 1440] };
  I.PALETA = {
    noche: '#2b3442', bruma: '#8d9aab', cielo: '#a9b3bf', piedra: '#6f7480', calido: '#ffc477',
    ambar: '#f0a352', piel: '#e8b896', sombra: '#1d2230', borde: '#ffe2b0'
  };

  // mulberry32
  I.rng = function (semilla) {
    let a = (semilla >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  I.hash = function (n) {
    let x = Math.imul((n | 0) ^ 0x9E3779B9, 0x85EBCA6B);
    x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35); x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };
  const h2 = (x, y, s) => I.hash(x * 374761393 + y * 668265263 + s * 2147483647);
  I.suave = k => k * k * (3 - 2 * k);
  I.ruido1 = function (x, s = 0) {
    const i = Math.floor(x), f = x - i, u = I.suave(f);
    const a = I.hash(i * 7919 + s * 104729), b = I.hash((i + 1) * 7919 + s * 104729);
    return (a + (b - a) * u) * 2 - 1;
  };
  I.ruido2 = function (x, y, s = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = I.suave(fx), v = I.suave(fy);
    const a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s);
    return ((a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v) * 2 - 1;
  };
  I.fbm = function (x, y, oct = 4, s = 0) {
    let v = 0, amp = 0.5, f = 1, tot = 0;
    for (let o = 0; o < oct; o++) { v += amp * I.ruido2(x * f, y * f, s + o * 31); tot += amp; amp *= 0.5; f *= 2; }
    return v / tot;
  };
  I.lerp = (a, b, k) => a + (b - a) * k;
  I.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  I.ease = {
    lineal: k => k,
    entra: k => k * k * k,
    sale: k => 1 - Math.pow(1 - k, 3),
    entraSale: k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
  };

  // ---- color
  const cacheCol = {};
  I.color = function (c) {
    if (Array.isArray(c)) return c;
    if (cacheCol[c]) return cacheCol[c];
    let h = c.replace('#', '');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const r = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    cacheCol[c] = r; return r;
  };
  I.mezcla = function (a, b, k) {
    a = I.color(a); b = I.color(b);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  };
  I.css = function (c, alfa = 1) {
    c = I.color(c);
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (+alfa).toFixed(3) + ')';
  };
  I.aclara = (c, k) => I.mezcla(c, [255, 246, 232], k);
  I.oscurece = (c, k) => I.mezcla(c, [20, 24, 34], k);

  // ---- lienzos auxiliares
  const aux = {};
  I.capaAux = function (nombre, w, h) {
    let a = aux[nombre];
    if (!a || a.canvas.width !== w || a.canvas.height !== h) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      a = aux[nombre] = { canvas: c, ctx: c.getContext('2d') };
    }
    return a;
  };

  // ---- keyframes
  function interp(a, b, k) {
    if (typeof a === 'number') return a + (b - a) * k;
    if (Array.isArray(a)) return a.map((v, i) => interp(v, b[i], k));
    if (a && typeof a === 'object') { const o = {}; for (const key in a) o[key] = (key in b) ? interp(a[key], b[key], k) : a[key]; return o; }
    return k < 0.5 ? a : b;
  }
  I.interp = interp;
  I.claves = function (lista, t, ease) {
    ease = ease || I.ease.entraSale;
    if (t <= lista[0][0]) return lista[0][1];
    for (let i = 0; i < lista.length - 1; i++) {
      const [t0, v0] = lista[i], [t1, v1] = lista[i + 1];
      if (t <= t1) return interp(v0, v1, ease((t - t0) / (t1 - t0)));
    }
    return lista[lista.length - 1][1];
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== geom3.js ===== */
/* Ilustra — geometría 3D mínima para las vistas 2.5D (Fase 2, §3.3 y §6.1). Sin dependencias salvo Pincel.suavizar (en siluetaNube). */
(function (G) {
  'use strict';
  const I = G.Ilustra = G.Ilustra || {};

  // Convenciones (§3.3): x a la derecha, y abajo, prof hacia la cámara. Proyección ortográfica: pantalla = (x, y).
  //  yaw  (0 = de frente, +π/2 = perfil mirando a la derecha):  X = x·cos + z·sin ;  prof = −x·sin + z·cos
  //  pitch (mirar abajo = positivo):                            y' = y·cos + z·sin ;  z' = −y·sin + z·cos
  //  roll (inclinar):                                           x' = x·cos − y·sin ;  y' = x·sin + y·cos
  //  Orden de local a mundo: Yaw(Pitch(Roll(p))).
  // Polígonos en coordenadas de pantalla (y hacia abajo): areaFirmada > 0 equivale a recorrido en sentido horario visual.
  const G3 = {
    sum: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    res: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    esc: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    punto: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cruz: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norma: a => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]),
    unit(a) { const n = G3.norma(a); return n > 1e-12 ? [a[0] / n, a[1] / n, a[2] / n] : [0, 0, 0]; },
    lerp3: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],

    // rotación alrededor del eje X (cabeceo), Y (giro) y Z (alabeo)
    rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c + p[2] * s, -p[1] * s + p[2] * c]; },
    rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; },
    rotZ(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; },

    // Marco local -> mundo. aMundo aplica Roll, Pitch, Yaw, escala y traslación a o; dirAMundo solo rota (sin escala ni traslación).
    marco(opc = {}) {
      const o = opc.o || [0, 0, 0], yaw = opc.yaw || 0, pitch = opc.pitch || 0, roll = opc.roll || 0;
      const escala = opc.escala == null ? 1 : opc.escala;
      const rot = v => G3.rotY(G3.rotX(G3.rotZ(v, roll), pitch), yaw);
      return {
        o: [o[0], o[1], o[2]], yaw, pitch, roll, escala,
        dirAMundo: v => rot(v),
        aMundo(p) { const r = rot(p); return [o[0] + r[0] * escala, o[1] + r[1] * escala, o[2] + r[2] * escala]; }
      };
    },

    // [x, y, prof] en mundo de un punto local del marco M
    proyectar: (p3, M) => M.aMundo(p3),

    // Casco convexo (monotone chain, el de P5). Descarta puntos interiores, colineales y repetidos.
    // Con y hacia abajo el recorrido sale en sentido horario visual (areaFirmada > 0).
    envolvente(pts) {
      const s = pts.map(p => [p[0], p[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const u = [];
      for (const p of s) if (!u.length || p[0] !== u[u.length - 1][0] || p[1] !== u[u.length - 1][1]) u.push(p);
      if (u.length < 3) return u;
      const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
      const lo = [], up = [];
      for (const p of u) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (let i = u.length - 1; i >= 0; i--) { const p = u[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
      return lo.slice(0, -1).concat(up.slice(0, -1));
    },

    // Silueta de una nube 3D: proyectar, envolvente y suavizado Catmull-Rom (Pincel.suavizar). Devuelve puntos 2D.
    // Parámetro opcional `separacion` (fracción del perímetro, 1/32 por defecto; 0 = sin subdividir): antes de suavizar se
    // subdividen las aristas del casco más largas que perímetro·separacion. Catmull-Rom uniforme sobre un casco de pocos
    // vértices y aristas muy desiguales se sale del casco y salta al entrar o salir un vértice (medido: cubo de 8 puntos,
    // 8,9 px de salto por grado frente a 1,8 px físicos). Subdividir lo deja dentro del movimiento real.
    siluetaNube(nube3, M, pasosSuavizado = 3, separacion = 1 / 32) {
      let h = G3.envolvente(nube3.map(p => G3.proyectar(p, M)));
      if (h.length < 3 || !pasosSuavizado) return h;
      if (separacion > 0) {
        const n = h.length; let per = 0;
        for (let i = 0; i < n; i++) per += Math.hypot(h[(i + 1) % n][0] - h[i][0], h[(i + 1) % n][1] - h[i][1]);
        const L = per * separacion, d = [];
        for (let i = 0; i < n; i++) {
          const a = h[i], b = h[(i + 1) % n], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / L));
          for (let j = 0; j < k; j++) d.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
        }
        h = d;
      }
      return I.Pincel.suavizar(h, pasosSuavizado, true);
    },

    // Silueta estrellada: n puntos, el k-ésimo en la dirección k/n de vuelta completa medida desde "arriba" en sentido horario
    // (k=0 arriba, k=n/4 a la derecha). Cada punto es la intersección más lejana del rayo desde el centro con el contorno.
    // Si el rayo no corta el contorno (centro fuera), el punto queda en el centro.
    remuestrearPolar(pts, centro, n = 48) {
      const m = pts.length, out = [];
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2, dx = Math.sin(a), dy = -Math.cos(a);
        let mejor = 0;
        for (let i = 0; i < m; i++) {
          const p = pts[i], q = pts[(i + 1) % m];
          const ex = q[0] - p[0], ey = q[1] - p[1], wx = p[0] - centro[0], wy = p[1] - centro[1];
          const den = dx * ey - dy * ex;
          if (Math.abs(den) < 1e-12) continue;                 // rayo paralelo al lado
          const t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
          if (t >= 0 && u >= -1e-9 && u <= 1 + 1e-9 && t > mejor) mejor = t;
        }
        out.push([centro[0] + dx * mejor, centro[1] + dy * mejor]);
      }
      return out;
    },

    // Área por la fórmula de Gauss (lazo del zapato): positiva = horario visual (y hacia abajo)
    areaFirmada(pts) {
      let s = 0;
      for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; s += p[0] * q[1] - q[0] * p[1]; }
      return s / 2;
    },
    // Copia del polígono recorrida en sentido horario (o antihorario si horario=false), invirtiéndola solo si hace falta.
    orientar(pts, horario = true) {
      const copia = pts.map(p => [p[0], p[1]]);
      return (G3.areaFirmada(copia) > 0) === !!horario ? copia : copia.reverse();
    },

    // IK de dos huesos en 3D con vector polo (§6.3). o3 = origen, T = objetivo, l1/l2 = longitudes, polo = dirección hacia la que
    // se dobla la articulación media. Devuelve {medio, fin}. Si |T−O| > l1+l2 el miembro queda extendido hacia T (fin ≠ T).
    // Caso degenerado (polo paralelo a la dirección o |T−O| = 0, donde la fórmula no define el plano): se usa una perpendicular
    // cualquiera determinista (el eje que menos se parece a u) en lugar de dar NaN.
    ik2(o3, T, l1, l2, polo) {
      const eps = 1e-3, v = G3.res(T, o3);
      const d = Math.min(Math.max(G3.norma(v), Math.abs(l1 - l2) + eps), l1 + l2 - eps);
      let u = G3.unit(v); if (G3.norma(u) === 0) u = [0, 1, 0];
      const a = (l1 * l1 + d * d - l2 * l2) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      let pp = G3.res(polo, G3.esc(u, G3.punto(polo, u)));
      if (G3.norma(pp) < 1e-6) {
        const e = Math.abs(u[0]) < 0.6 ? [1, 0, 0] : [0, 0, 1];
        pp = G3.res(e, G3.esc(u, G3.punto(e, u)));
      }
      pp = G3.unit(pp);
      return { medio: G3.sum(G3.sum(o3, G3.esc(u, a)), G3.esc(pp, h)), fin: G3.sum(o3, G3.esc(u, d)) };
    }
  };
  I.G3 = G3;
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== pincel.js ===== */
/* Ilustra — pincel pictórico común: toda figura pasa por Pincel.forma. */
(function (G) {
  'use strict';
  const I = G.Ilustra;
  const P = I.Pincel = {};

  // ---------- constructores de trazado (devuelven listas de puntos) ----------
  P.elipse = function (cx, cy, rx, ry, rot = 0, n = 28) {
    const c = Math.cos(rot), s = Math.sin(rot), pts = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      pts.push([cx + x * c - y * s, cy + x * s + y * c]);
    }
    return pts;
  };
  P.rect = function (x, y, w, h, r = 0) {
    if (!r) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    r = Math.min(r, w / 2, h / 2);
    const pts = [], seg = 4;
    const esq = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
    for (const [cx, cy, a0] of esq) for (let i = 0; i <= seg; i++) {
      const a = a0 + i / seg * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  };
  P.capsula = function (x1, y1, r1, x2, y2, r2, n = 9) {
    const a = Math.atan2(y2 - y1, x2 - x1), pts = [];
    for (let i = 0; i <= n; i++) { const t = a + Math.PI / 2 + i / n * Math.PI; pts.push([x1 + Math.cos(t) * r1, y1 + Math.sin(t) * r1]); }
    for (let i = 0; i <= n; i++) { const t = a - Math.PI / 2 + i / n * Math.PI; pts.push([x2 + Math.cos(t) * r2, y2 + Math.sin(t) * r2]); }
    return pts;
  };
  P.poligono = pts => pts.map(p => [p[0], p[1]]);
  // Catmull-Rom cerrado
  P.suavizar = function (pts, pasos = 4, cerrado = true) {
    const out = [], n = pts.length;
    const g = i => cerrado ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const lim = cerrado ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      for (let s = 0; s < pasos; s++) {
        const t = s / pasos, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    if (!cerrado) out.push(pts[n - 1]);
    return out;
  };
  // bordes irregulares: desplaza cada punto según la normal con ruido indexado por longitud de arco
  P.irregular = function (pts, semilla = 1, amp = 1.5, frec = 0.08) {
    if (!amp) return pts;
    const n = pts.length; let s = 0; const out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
      if (i > 0) s += Math.hypot(b[0] - a[0], b[1] - a[1]);
      let nx = c[1] - a[1], ny = -(c[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const d = amp * (I.ruido1(s * frec, semilla) * 0.7 + I.ruido1(s * frec * 3.7, semilla + 9) * 0.3);
      out.push([b[0] + nx * d, b[1] + ny * d]);
    }
    return out;
  };
  P.aPath = function (pts) {
    const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath(); return p;
  };
  P.caja = function (pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };

  // ---------- textura de pincel (4 losetas precalculadas) ----------
  const texturas = [];
  P.textura = function (i) {
    i = i % 4;
    if (texturas[i]) return texturas[i];
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), r = I.rng(1000 + i * 77);
    x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, 256, 256);
    x.lineCap = 'round';
    for (let k = 0; k < 260; k++) {
      const px = r() * 256, py = r() * 256, ang = (35 + (r() - 0.5) * 50) * Math.PI / 180, L = 8 + r() * 26;
      const v = r() < 0.5 ? 70 + r() * 40 : 170 + r() * 50;
      x.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.18 + r() * 0.3) + ')';
      x.lineWidth = 1.5 + r() * 4;
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
        x.beginPath(); x.moveTo(px + ox, py + oy);
        x.quadraticCurveTo(px + ox + Math.cos(ang) * L * 0.5 + (r() - 0.5) * 3, py + oy + Math.sin(ang) * L * 0.5, px + ox + Math.cos(ang) * L, py + oy + Math.sin(ang) * L);
        x.stroke();
      }
    }
    // poro fino
    const im = x.getImageData(0, 0, 256, 256), d = im.data;
    for (let k = 0; k < d.length; k += 4) { const v = (r() - 0.5) * 22; d[k] += v; d[k + 1] += v; d[k + 2] += v; }
    x.putImageData(im, 0, 0);
    texturas[i] = c; return c;
  };
  const patrones = new WeakMap();
  function patron(ctx, i) {
    let m = patrones.get(ctx); if (!m) { m = {}; patrones.set(ctx, m); }
    if (!m[i]) m[i] = ctx.createPattern(P.textura(i), 'repeat');
    return m[i];
  }

  // ---------- sombra interna / borde con el truco de sombra fuera de lienzo ----------
  const FUERA = 20000;
  // lienzos auxiliares de tamaño cuantizado (capaAux recrea el lienzo si cambia el tamaño)
  function auxQ(nombre, w, h) { const q = 64, W = Math.ceil(w / q) * q, H = Math.ceil(h / q) * q; return I.capaAux(nombre + W + 'x' + H, W, H); }
  function interna(ctx, devPath, caja, dx, dy, blur, color) {
    // ctx ya está recortado a la forma, con transformación identidad
    const m = blur * 2 + Math.abs(dx) + Math.abs(dy) + 4;
    ctx.shadowColor = color; ctx.shadowBlur = blur;
    ctx.shadowOffsetX = FUERA + dx; ctx.shadowOffsetY = dy;
    ctx.fillStyle = '#000';
    if (devPath._union) {
      // Unión de polígonos (WP1, desviación de §4.6-2): con 'nonzero' y un rectángulo antihorario el solape de dos
      // polígonos (winding +2-1=+1) sigue contando como relleno y se vería más claro. Se construye el complemento de la
      // unión en un lienzo auxiliar (negro opaco menos la unión) y se proyecta su sombra con el mismo truco fuera de lienzo.
      const x0 = Math.floor(caja.x0 - m), y0 = Math.floor(caja.y0 - m), a = auxQ('pincel_union_', Math.ceil(caja.w + 2 * m) + 2, Math.ceil(caja.h + 2 * m) + 2), x = a.ctx;
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.globalAlpha = 1;
      x.fillStyle = '#000'; x.fillRect(0, 0, a.canvas.width, a.canvas.height);
      x.globalCompositeOperation = 'destination-out'; x.setTransform(1, 0, 0, 1, -x0, -y0); x.fill(devPath, 'nonzero');
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
      ctx.drawImage(a.canvas, x0 - FUERA, y0);
    } else {
      const p = new Path2D();
      p.rect(caja.x0 - m - FUERA, caja.y0 - m, caja.w + 2 * m, caja.h + 2 * m);
      p.addPath(devPath, new DOMMatrix([1, 0, 0, 1, -FUERA, 0]));
      ctx.fill(p, 'evenodd');
    }
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  // ---------- unión de polígonos (WP1, §4.6-1) ----------
  P.union = function (lista) {
    const p = new Path2D(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const poly of lista) {
      let a = 0; const n = poly.length;
      for (let i = 0; i < n; i++) { const q = poly[i], r = poly[(i + 1) % n]; a += q[0] * r[1] - r[0] * q[1]; }
      const pts = a < 0 ? poly.slice().reverse() : poly;       // área firmada > 0 (horario en pantalla, y hacia abajo)
      p.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n; i++) p.lineTo(pts[i][0], pts[i][1]);
      p.closePath();
      for (const q of pts) { if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1]; }
    }
    p._union = true;
    p._caja = { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    return p;
  };

  // ---------- campos de sombreado (WP1, §4.6-4): (x,y) -> 0..1, 1 = de cara a la luz ----------
  // luz.dir apunta HACIA la luz. Coordenadas de (x,y): las del path de la pieza (sin transformación).
  function luz3(L) {
    L = L || I.luzActual || I.LUZ_DEFECTO;
    const z = L.clave3 != null ? L.clave3 : (L.z != null ? L.z : 0.75), l = Math.hypot(L.dir[0], L.dir[1], z) || 1;
    return [L.dir[0] / l, L.dir[1] / l, z / l];
  }
  const cl01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  P.campos = {
    cilindro(A, rA, B, rB, luz) {
      const l3 = luz3(luz), ax = B[0] - A[0], ay = B[1] - A[1], al = Math.hypot(ax, ay) || 1, ux = ax / al, uy = ay / al;
      return (x, y) => {
        const u = I.clamp(((x - A[0]) * ux + (y - A[1]) * uy) / al, 0, 1), r = Math.max(1e-6, rA + (rB - rA) * u);
        const s = I.clamp(((x - A[0]) * -uy + (y - A[1]) * ux) / r, -1, 1);
        return cl01(-uy * s * l3[0] + ux * s * l3[1] + Math.sqrt(1 - s * s) * l3[2]);
      };
    },
    elipsoide(c, rx, ry, rot = 0, luz) {
      const l3 = luz3(luz), cs = Math.cos(rot), sn = Math.sin(rot);
      return (x, y) => {
        const dx = x - c[0], dy = y - c[1], u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry;
        const q = u * u + v * v, k = q > 1 ? 1 / Math.sqrt(q) : 1, uu = u * k, vv = v * k, nz = Math.sqrt(Math.max(0, 1 - uu * uu - vv * vv));
        return cl01((uu * cs - vv * sn) * l3[0] + (uu * sn + vv * cs) * l3[1] + nz * l3[2]);
      };
    },
    plano(n3, luz) {
      const l3 = luz3(luz), l = Math.hypot(n3[0], n3[1], n3[2]) || 1, v = cl01((n3[0] * l3[0] + n3[1] * l3[1] + n3[2] * l3[2]) / l);
      return () => v;
    },
    // cilindro de anchura variable a lo largo de una polilínea (torso, faldas). anchos: array por punto o número.
    // "izquierda" = lado (-uy, ux) de la dirección de la polilínea.
    seccion(pl, aIzq, aDer, luz) {
      const l3 = luz3(luz), n = pl.length, gi = i => Array.isArray(aIzq) ? aIzq[i] : aIzq, gd = i => Array.isArray(aDer) ? aDer[i] : aDer;
      return (x, y) => {
        let mejor = 1e18, bi = 0, bt = 0, bux = 0, buy = 1;
        for (let i = 0; i < n - 1; i++) {
          const ax = pl[i + 1][0] - pl[i][0], ay = pl[i + 1][1] - pl[i][1], ll = ax * ax + ay * ay || 1e-9;
          const t = I.clamp(((x - pl[i][0]) * ax + (y - pl[i][1]) * ay) / ll, 0, 1), px = pl[i][0] + ax * t, py = pl[i][1] + ay * t, d2 = (x - px) * (x - px) + (y - py) * (y - py);
          if (d2 < mejor) { mejor = d2; bi = i; bt = t; const l = Math.sqrt(ll); bux = ax / l; buy = ay / l; }
        }
        const dd = (x - pl[bi][0] - (pl[bi + 1][0] - pl[bi][0]) * bt) * -buy + (y - pl[bi][1] - (pl[bi + 1][1] - pl[bi][1]) * bt) * bux;
        const w = Math.max(1e-6, dd >= 0 ? I.lerp(gi(bi), gi(bi + 1), bt) : I.lerp(gd(bi), gd(bi + 1), bt));
        const s = I.clamp(dd / w, -1, 1);
        return cl01(-buy * s * l3[0] + bux * s * l3[1] + Math.sqrt(1 - s * s) * l3[2]);
      };
    },
    // unión de segmentos (miembros): campo del segmento más cercano. segs: [[A, rA, B, rB], ...]
    union(segs, luz) {
      const fs = segs.map(sg => P.campos.cilindro(sg[0], sg[1], sg[2], sg[3], luz));
      return (x, y) => {
        let mejor = 1e18, bi = 0;
        for (let i = 0; i < segs.length; i++) {
          const [A, rA, B, rB] = segs[i], ax = B[0] - A[0], ay = B[1] - A[1], l2 = ax * ax + ay * ay || 1e-9;
          const t = I.clamp(((x - A[0]) * ax + (y - A[1]) * ay) / l2, 0, 1), d = Math.hypot(x - A[0] - ax * t, y - A[1] - ay * t) - (rA + (rB - rA) * t);
          if (d < mejor) { mejor = d; bi = i; }
        }
        return fs[bi](x, y);
      };
    },
    // "inflado" (P2): máscara a 1/4 desenfocada -> gradiente -> normal. Solo para props sin campo propio.
    inflado(pts, esc = 0.25, luz) {
      const l3 = luz3(luz), cj = P.caja(pts), m = 8, w = Math.ceil(cj.w * esc) + 2 * m, h = Math.ceil(cj.h * esc) + 2 * m;
      const a = auxQ('infA_', w, h), b = auxQ('infB_', w, h), W = a.canvas.width, Hh = a.canvas.height;
      a.ctx.setTransform(1, 0, 0, 1, 0, 0); a.ctx.clearRect(0, 0, W, Hh); a.ctx.fillStyle = '#fff';
      a.ctx.setTransform(esc, 0, 0, esc, m - cj.x0 * esc, m - cj.y0 * esc); a.ctx.fill(P.aPath(pts)); a.ctx.setTransform(1, 0, 0, 1, 0, 0);
      b.ctx.clearRect(0, 0, W, Hh); b.ctx.filter = 'blur(' + Math.max(2, Math.min(cj.w, cj.h) * esc * 0.4) + 'px)'; b.ctx.drawImage(a.canvas, 0, 0); b.ctx.filter = 'none';
      const d = b.ctx.getImageData(0, 0, W, Hh).data;
      const Hh2 = (i, j) => d[(I.clamp(j, 0, Hh - 1) * W + I.clamp(i, 0, W - 1)) * 4 + 3] / 255;
      return (x, y) => {
        const i = Math.round((x - cj.x0) * esc + m), j = Math.round((y - cj.y0) * esc + m);
        const gx = (Hh2(i + 1, j) - Hh2(i - 1, j)) * 5, gy = (Hh2(i, j + 1) - Hh2(i, j - 1)) * 5, nl = Math.hypot(gx, gy, 1);
        return cl01((-gx * l3[0] - gy * l3[1] + l3[2]) / nl);
      };
    }
  };

  // Oscurecimiento de borde hacia dentro SIN trazar los contornos interiores de una unión (se usa en lugar de stroke(path) en
  // el borde húmedo de piezas-unión). Requiere que ctx esté ya recortado a la forma.
  P.bordeInterno = function (ctx, path, caja, blur, color) {
    const M = ctx.getTransform(), devPath = new Path2D(); devPath.addPath(path, M); devPath._union = path._union;
    const es = [[caja.x0, caja.y0], [caja.x1, caja.y0], [caja.x0, caja.y1], [caja.x1, caja.y1]].map(([x, y]) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f]);
    const esc = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c)) || 1;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    interna(ctx, devPath, P.caja(es), 0, 0, blur * esc, color);
    ctx.restore();
  };

  // ---------- la figura pictórica ----------
  P.forma = function (ctx, trazado, e) {
    const L = e.luz || I.luzActual || I.LUZ_DEFECTO;
    const prof = e.profundidad || 0;
    const volumen = e.volumen == null ? 0.5 : e.volumen;
    const borde = (e.borde == null ? 0.6 : e.borde) * (1 - prof * 0.8) * (L.fuerzaBorde == null ? 1 : L.fuerzaBorde);
    const sombraI = (e.sombraInterna == null ? 0.35 : e.sombraInterna) * (1 - prof * 0.7);
    const textura = (e.textura == null ? 0.25 : e.textura) * (1 - prof * 0.6);
    const semilla = e.semilla || 1;
    let pts = null, path;
    if (Array.isArray(trazado) && Array.isArray(trazado[0]) && Array.isArray(trazado[0][0])) trazado = P.union(trazado);
    if (trazado instanceof Path2D) path = trazado;
    else {
      pts = e.irregular === 0 ? trazado : P.irregular(trazado, semilla, e.irregular == null ? 1.2 : e.irregular, e.frecIrregular || 0.08);
      path = P.aPath(pts);
    }
    const caja = pts ? P.caja(pts) : (e.caja || trazado._caja || { x0: 0, y0: 0, x1: I.ANCHO, y1: I.ALTO, w: I.ANCHO, h: I.ALTO, cx: I.ANCHO / 2, cy: I.ALTO / 2 });
    let base = I.mezcla(e.color, L.ambiente, 0.12);
    if (prof) base = I.mezcla(base, L.niebla, prof * 0.85);
    if (e.emisivo) base = I.color(e.color);

    // modo pintado (WP1): relleno por campo + trazos (Pintura.rellenar). Fuera de él, todo igual que en la Fase 1.
    let pintado = I.MODO === 'pintado' && e.pintura !== false && !e.emisivo && !!I.Pintura;
    if (pintado) {
      const Mp = ctx.getTransform(), ep = Math.sqrt(Math.abs(Mp.a * Mp.d - Mp.b * Mp.c)) || 1, nm = e.nominal || [caja.w, caja.h];
      if (Math.max(nm[0], nm[1]) * ep < 15) pintado = false;       // §8.1: piezas diminutas, modo vector
    }
    let sombraI2 = sombraI, textura2 = textura, borde2 = borde;
    if (pintado) { sombraI2 = 0; textura2 = 0; borde2 = borde * I.FACTOR_BORDE_PINTADO; }

    ctx.save();
    if (e.alfa != null) ctx.globalAlpha *= e.alfa;
    // 1. relleno con volumen (degradado según la luz). La luz vive en espacio de pantalla: se lleva al espacio local
    // (así funciona aunque el dibujo esté rotado o reflejado).
    const M0 = ctx.getTransform(), inv = M0.inverse();
    let dl = [inv.a * L.dir[0] + inv.c * L.dir[1], inv.b * L.dir[0] + inv.d * L.dir[1]];
    { const l = Math.hypot(dl[0], dl[1]) || 1; dl = [dl[0] / l, dl[1] / l]; }
    const R = Math.max(caja.w, caja.h) * 0.6 + 1;
    if (pintado) {
      I.Pintura.rellenar(ctx, path, caja, { color: e.color, luz: L, profundidad: prof, semilla: semilla, volumen: volumen, campo: e.campo, marco: e.marco, nominal: e.nominal, pintura: e.pintura });
    } else if (volumen > 0 && !e.emisivo) {
      const g = ctx.createLinearGradient(caja.cx + dl[0] * R, caja.cy + dl[1] * R, caja.cx - dl[0] * R, caja.cy - dl[1] * R);
      g.addColorStop(0, I.css(I.mezcla(I.aclara(base, 0.16 * volumen), L.clave, 0.12 * volumen)));
      g.addColorStop(0.55, I.css(base));
      g.addColorStop(1, I.css(I.oscurece(I.mezcla(base, L.ambiente, 0.25 * volumen), 0.5 * volumen)));
      ctx.fillStyle = g;
    } else ctx.fillStyle = I.css(base);
    if (!pintado) ctx.fill(path);

    const detalle = !e.plano && (sombraI2 > 0.02 || borde2 > 0.02 || textura2 > 0.02);
    if (detalle) {
      ctx.save();
      ctx.clip(path);
      const M = ctx.getTransform();
      const esc = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c)) || 1;
      // caja en espacio de dispositivo
      const esquinas = [[caja.x0, caja.y0], [caja.x1, caja.y0], [caja.x0, caja.y1], [caja.x1, caja.y1]].map(([x, y]) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f]);
      const cajaD = P.caja(esquinas);
      const tam = Math.min(caja.w, caja.h) * esc;
      if (sombraI2 > 0.02 || borde2 > 0.02) {
        const devPath = new Path2D(); devPath.addPath(path, M); devPath._union = path._union;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (sombraI2 > 0.02 && !e.emisivo) {
          const k = Math.max(2, tam * 0.16);
          interna(ctx, devPath, cajaD, L.dir[0] * k, L.dir[1] * k, Math.max(2, tam * 0.22), I.css(I.oscurece(base, 0.55), sombraI2));
        }
        if (borde2 > 0.02) {
          const w = (e.anchoBorde || 4) * esc, db = L.dirBorde;
          interna(ctx, devPath, cajaD, -db[0] * w, -db[1] * w, w * 0.55, I.css(L.borde, Math.min(1, borde2 * 1.15)));
          if (borde2 > 0.5) interna(ctx, devPath, cajaD, -db[0] * w * 0.4, -db[1] * w * 0.4, w * 0.25, I.css(I.aclara(L.borde, 0.5), Math.min(1, (borde2 - 0.5) * 1.2)));
        }
        ctx.setTransform(M);
      }
      if (textura2 > 0.02) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha *= Math.min(1, textura * 1.6);
        const pat = patron(ctx, semilla);
        const o = I.hash(semilla) * 256;
        pat.setTransform(new DOMMatrix([1, 0, 0, 1, o, o * 0.7]));
        ctx.fillStyle = pat;
        ctx.fillRect(caja.x0 - 2, caja.y0 - 2, caja.w + 4, caja.h + 4);
      }
      ctx.restore();
    }
    if (e.contorno) {
      ctx.lineWidth = e.anchoContorno || 1.6; ctx.lineJoin = 'round';
      ctx.strokeStyle = I.css(e.contorno === true ? I.oscurece(base, 0.5) : e.contorno, 0.55);
      ctx.stroke(path);
    }
    ctx.restore();
    return path;
  };

  // trazo pictórico abierto (pelo, cejas, cables, grietas)
  P.trazo = function (ctx, pts, e) {
    const L = e.luz || I.luzActual || I.LUZ_DEFECTO;
    let c = e.color; if (e.profundidad) c = I.mezcla(c, L.niebla, e.profundidad * 0.85);
    ctx.save();
    if (e.alfa != null) ctx.globalAlpha *= e.alfa;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = I.css(c); ctx.lineWidth = e.ancho || 2;
    const sp = e.suave === false ? pts : P.suavizar(pts, 4, false);
    const p = new Path2D(); p.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < sp.length; i++) p.lineTo(sp[i][0], sp[i][1]);
    ctx.stroke(p);
    ctx.restore();
  };

  // trazo de grosor variable (de ancho0 a ancho1), relleno como forma
  P.cinta = function (pts, a0, a1) {
    const izq = [], der = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const w = I.lerp(a0, a1, i / (n - 1)) / 2;
      izq.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); der.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    return izq.concat(der.reverse());
  };
})(window);

/* ===== pintura.js ===== */
/* Ilustra — textura pintada (Fase 2, WP1, ESPECIFICACION_F2 §4).
   Dos regímenes: relleno por campo de las piezas dinámicas (Pintura.rellenar, cada cuadro) y repintado de los lienzos
   cacheados de las capas estáticas (Pintura.repintar, una sola vez). Más el papel de pantalla.
   Determinista: toda la aleatoriedad sale de I.rng con semillas fijas y cada trazo consume un número fijo de valores. */
(function (G) {
  'use strict';
  const I = G.Ilustra;
  const Pi = I.Pintura = {};

  if (I.MODO === undefined) I.MODO = 'vector';          // 'vector' (F1, por defecto) | 'pintado'
  I.FACTOR_BORDE_PINTADO = 0.5;                          // §4.3-6: la luz de borde se reduce a la mitad en modo pintado

  // ---------------------------------------------------------------- el trazo (§4.2)
  // 4 siluetas rasgadas en espacio unidad [-0.5,0.5]² con su loseta de estrías (64x24, ya recortada a la silueta).
  let FORMAS = null, ESTRIAS = null;
  function iniciar() {
    if (FORMAS) return;
    FORMAS = [0, 1, 2, 3].map(k => {
      const p = new Path2D(), n = 14, arr = [], abj = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = u - 0.5;
        const w = (0.42 + 0.08 * I.ruido1(u * 4, k)) * (1 - 0.3 * u * u) * Math.min(1, Math.sin(Math.PI * u) * 2.2 + 0.25);
        arr.push([x, -w + I.ruido1(u * 9, k + 5) * 0.05]); abj.push([x, w + I.ruido1(u * 9, k + 9) * 0.05]);
      }
      const pts = arr.concat(abj.reverse());
      p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath();
      return p;
    });
    ESTRIAS = [0, 1, 2, 3].map(k => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 24;
      const x = c.getContext('2d'), im = x.createImageData(64, 24);
      for (let j = 0; j < 24; j++) for (let i = 0; i < 64; i++) {
        const v = 128 + 70 * I.ruido1(j * 1.3, k + 21) + 25 * I.ruido2(i * 0.15, j * 1.3, k), o = (j * 64 + i) * 4;
        im.data[o] = im.data[o + 1] = im.data[o + 2] = v; im.data[o + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      x.globalCompositeOperation = 'destination-in'; x.setTransform(64, 0, 0, 24, 32, 12); x.fill(FORMAS[k]);
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
      return c;
    });
  }

  // Dibuja un trazo de centro (cx,cy), dirección unitaria (ux,uy), largo y ancho. Deja la transformación en identidad,
  // globalAlpha=1 y 'source-over' (§4.2). `base` es opcional (extensión): {m:[a,b,c,d,e,f], g} = matriz del contexto y
  // globalAlpha con que debe componerse el trazo (lo usa rellenar, donde el contexto lleva la transformación de la pieza;
  // en ese caso el llamador restaura su propio estado al terminar el lote).
  Pi.trazo = function (ctx, cx, cy, ux, uy, largo, ancho, css, alfa, variante, base) {
    iniciar();
    const k = variante & 3, A = ux * largo, B = uy * largo, C = -uy * ancho, D = ux * ancho;
    let g = 1;
    if (base) {
      const m = base.m; g = base.g;
      ctx.setTransform(m[0] * A + m[2] * B, m[1] * A + m[3] * B, m[0] * C + m[2] * D, m[1] * C + m[3] * D,
        m[0] * cx + m[2] * cy + m[4], m[1] * cx + m[3] * cy + m[5]);
    } else ctx.setTransform(A, B, C, D, cx, cy);
    ctx.globalAlpha = alfa * g; ctx.fillStyle = css; ctx.fill(FORMAS[k]);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = alfa * g * 0.45;
    ctx.drawImage(ESTRIAS[k], -0.5, -0.5, 1, 1);
    ctx.globalCompositeOperation = 'source-over';
    if (!base) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; }
  };

  // ---------------------------------------------------------------- relleno pintado de piezas dinámicas (§4.3)
  const MAX_TRAZOS = 4000;
  // Lienzos auxiliares de subpintura: uno por tamaño cuantizado (capaAux recrea el lienzo si cambia el tamaño).
  function subAux(w, h) {
    const q = 16, W = Math.ceil(w / q) * q, H = Math.ceil(h / q) * q, a = I.capaAux('pintura_sub_' + W + 'x' + H, W, H);
    if (!a.im) a.im = a.ctx.createImageData(W, H);
    return a;
  }

  // luminancia CIE L* (0..100) de un color sRGB [r,g,b] 0..255
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  function lstar(c) { const Y = 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; }

  // ctx: con la transformación de la pieza ya aplicada (path y caja en coordenadas locales). Se llama desde Pincel.forma.
  // estilo: color, luz, profundidad, semilla, volumen, campo, marco, nominal:[wNom,hNom], pintura:{...} (§4.3).
  Pi.rellenar = function (ctx, path, caja, e) {
    const L = e.luz || I.luzActual || I.LUZ_DEFECTO, pp = (e.pintura && typeof e.pintura === 'object') ? e.pintura : {};
    const M0 = ctx.getTransform(), esc = Math.sqrt(Math.abs(M0.a * M0.d - M0.b * M0.c)) || 1;
    const nom = e.nominal || [caja.w, caja.h], wN = Math.max(1, nom[0]), hN = Math.max(1, nom[1]);
    const dureza = pp.dureza == null ? 0.6 : pp.dureza, umbral = pp.umbral == null ? 0.45 : pp.umbral;
    const tam = pp.tam || I.clamp(0.035 * Math.min(wN, hN) + 6, 5, 16);
    const dens = pp.densidad == null ? 1.1 : pp.densidad;
    const varValor = pp.varValor == null ? 0.10 : pp.varValor, varTono = pp.varTono == null ? 0.08 : pp.varTono;
    const acento = pp.acento || L.ambiente, aT = pp.alfaTrazo || [0.5, 0.9];
    const humedo = pp.bordeHumedo == null ? 1 : pp.bordeHumedo;
    const volumen = e.volumen == null ? 0.5 : e.volumen, kv = I.clamp(volumen / 0.5, 0, 1);

    // 1. colores. Las dos mezclas con el ambiente (base 0.12, sombra 0.35) se ponderan por la luminancia del color (WP7, cabo 5): con un ambiente
    // de tono medio, un color casi negro salía con L* ≈ 33 en lugar de ≈ 15. w = clamp(L*/55, 0.15, 1): colores de L* ≥ 55 quedan como antes.
    const cc = I.color(e.color), wL = I.clamp(lstar(cc) / 55, 0.15, 1);
    let base = I.mezcla(e.color, L.ambiente, 0.12 * wL);
    if (e.profundidad) base = I.mezcla(base, L.niebla, e.profundidad * 0.85);
    const cLuz = I.mezcla(I.aclara(base, 0.12), L.clave, 0.12);
    const cSom = I.oscurece(I.mezcla(base, L.ambiente, 0.35 * wL), 0.25);
    const a = I.lerp(0.5, 0.04, dureza);
    const lut = new Array(256);
    for (let i = 0; i < 256; i++) {
      const c = I.mezcla(cSom, cLuz, I.suave(I.clamp((i / 255 - umbral + a) / (2 * a), 0, 1)));
      lut[i] = kv < 1 ? I.mezcla(base, c, kv) : c;
    }
    const tono = v => lut[(I.clamp(v, 0, 1) * 255 + 0.5) | 0];

    // campo por defecto: lineal según luz.dir sobre la caja (equivale al degradado de F1); luz llevada al espacio local
    let campo = e.campo;
    if (!campo) {
      const inv = M0.inverse();
      let dx = inv.a * L.dir[0] + inv.c * L.dir[1], dy = inv.b * L.dir[0] + inv.d * L.dir[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const R = Math.max(caja.w, caja.h) * 0.6 + 1, cx = caja.cx, cy = caja.cy;
      campo = (x, y) => 0.5 + 0.5 * ((x - cx) * dx + (y - cy) * dy) / R;
    }

    ctx.save();
    ctx.clip(path);                                    // un único clip por pieza (§8.1)
    // 3. subpintura a 1/4 (P2): ImageData pequeño con tono(campo), escalado con suavizado
    {
      // rejilla anclada a múltiplos de 1/ee en coordenadas locales (no a caja.x0): si el contorno se deforma, el interior
      // se muestrea en los mismos puntos y no cambia
      const ee = 0.25, gx0 = Math.floor(caja.x0 * ee) / ee, gy0 = Math.floor(caja.y0 * ee) / ee;
      const sw = Math.ceil((caja.x1 - gx0) * ee) + 2, sh = Math.ceil((caja.y1 - gy0) * ee) + 2, s = subAux(sw, sh), W = s.canvas.width, Hh = s.canvas.height;
      const d = s.im.data;
      for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
        const c = tono(campo(gx0 + (i + 0.5) / ee, gy0 + (j + 0.5) / ee)), k = (j * W + i) * 4;
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
      s.ctx.putImageData(s.im, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(s.canvas, gx0, gy0, W / ee, Hh / ee);
    }
    // 4. trazos en coordenadas (u,v) del marco: viajan con la pieza; N constante (dimensiones nominales)
    if (Math.max(wN, hN) * esc >= 40) {
      const mc = e.marco || { o: [caja.x0, caja.y0], ex: [caja.w, 0], ey: [0, caja.h] };
      const ang0 = pp.ang == null ? Math.atan2(mc.ey[1], mc.ey[0]) : pp.ang;
      const N = Math.min(MAX_TRAZOS, Math.round(wN * hN * dens / (3 * tam * tam)));
      const r = I.rng((e.semilla == null ? 1 : e.semilla) | 0), sem = (e.semilla | 0) + 3;
      const base2 = { m: [M0.a, M0.b, M0.c, M0.d, M0.e, M0.f], g: ctx.globalAlpha };
      for (let i = 0; i < N; i++) {
        const r1 = r(), r2 = r(), r3 = r(), r4 = r(), r5 = r(), r6 = r();   // exactamente 6 por trazo, se use o no
        const h6 = k => I.hash(((r6 * 4294967296) | 0) + k * 7919);
        const x = mc.o[0] + r1 * mc.ex[0] + r2 * mc.ey[0], y = mc.o[1] + r1 * mc.ex[1] + r2 * mc.ey[1];
        let c = tono(campo(x, y) + (r3 - 0.5) * 0.12);
        const cl = r4 < 0.5, km = (cl ? r4 : r4 - 0.5) * 2 * varValor * 3;
        c = I.mezcla(c, cl ? I.aclara(c, 0.2) : I.oscurece(c, 0.2), km);
        c = I.mezcla(c, acento, r5 * varTono);
        const ang = ang0 + I.ruido2(r1 * wN * 0.01, r2 * hN * 0.01, sem) * 0.35 + (h6(1) - 0.5) * 0.24;
        const largo = tam * (1.6 + 1.6 * h6(2)), ancho = tam * (0.8 + 0.4 * h6(3));
        Pi.trazo(ctx, x, y, Math.cos(ang), Math.sin(ang), largo, ancho, I.css(c), I.lerp(aT[0], aT[1], h6(4)), (r6 * 4) | 0, base2);
      }
      ctx.setTransform(M0); ctx.globalAlpha = base2.g; ctx.globalCompositeOperation = 'source-over';
    }
    // 5. borde húmedo, recortado a la forma
    if (humedo > 0) {
      const oc = I.oscurece(base, 0.45);
      ctx.lineJoin = 'round';
      if (path._union) {   // stroke() recorrería también los contornos interiores de la unión (aro en la articulación)
        I.Pincel.bordeInterno(ctx, path, caja, 7, I.css(oc, 0.20 * humedo)); I.Pincel.bordeInterno(ctx, path, caja, 2.2, I.css(oc, 0.35 * humedo));
      } else {
        ctx.strokeStyle = I.css(oc, 0.20 * humedo); ctx.lineWidth = 7; ctx.stroke(path);
        ctx.strokeStyle = I.css(oc, 0.35 * humedo); ctx.lineWidth = 2.2; ctx.stroke(path);
      }
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- repintado de lienzos cacheados (§4.5, validado en P3)
  Pi.repintar = function (cv, o) {
    iniciar();
    o = Object.assign({ semilla: 7, tam: 12, ang: Math.PI / 2, umbral: 26, alfa: 0.6, umbralBorde: 22, pasoGradiente: 5,
      varValor: [0.06, 0.16], acento: [214, 170, 120], varTono: 0.08 }, o || {});
    const W = cv.width, H = cv.height, x = cv.getContext('2d');
    // OJO (P3): el lienzo de una capa con desenfoque conserva ctx.filter; sin este reinicio cada trazo se desenfoca
    x.filter = 'none'; x.globalCompositeOperation = 'source-over'; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
    const d = x.getImageData(0, 0, W, H).data, r = I.rng(o.semilla), tam = o.tam, s = o.pasoGradiente;
    const idx = (i, j) => ((j < 0 ? 0 : j >= H ? H - 1 : j | 0) * W + (i < 0 ? 0 : i >= W ? W - 1 : i | 0)) * 4;
    const lum = (i, j) => { const k = idx(i, j); return d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11; };
    const paso = tam * 1.15, vv = o.varValor, ac = o.acento;
    let n = 0;
    for (let gy = 0; gy < H; gy += paso) for (let gx = 0; gx < W; gx += paso) {
      const cx = gx + r() * paso, cy = gy + r() * paso, j1 = r(), j2 = r(), j3 = r(), j4 = r();   // 6 por celda, siempre
      const k0 = idx(cx, cy); if (d[k0 + 3] < 250) continue;
      const c0 = d[k0], c1 = d[k0 + 1], c2 = d[k0 + 2];
      const gX = lum(cx + s, cy) - lum(cx - s, cy), gY = lum(cx, cy + s) - lum(cx, cy - s), mag = Math.hypot(gX, gY);
      let ang = mag > o.umbralBorde ? Math.atan2(gY, gX) + Math.PI / 2 : o.ang + I.ruido2(cx * 0.004, cy * 0.004, o.semilla) * 0.5;
      ang += (j1 - 0.5) * 0.12;
      const ux = Math.cos(ang), uy = Math.sin(ang), Lmax = tam * (1.3 + j2 * 1.4);
      let a = 0, b = 0;
      const dif = (px, py) => { const k = idx(px, py); return Math.abs(d[k] - c0) + Math.abs(d[k + 1] - c1) + Math.abs(d[k + 2] - c2); };
      while (a < Lmax && dif(cx - ux * (a + 2), cy - uy * (a + 2)) < o.umbral) a += 2;
      while (b < Lmax && dif(cx + ux * (b + 2), cy + uy * (b + 2)) < o.umbral) b += 2;
      if (a + b < tam * 0.6) continue;                 // detalle fino: se conserva
      const c = [c0, c1, c2];
      let col = I.mezcla(c, j3 < 0.5 ? I.aclara(c, 0.25) : I.oscurece(c, 0.25), vv[0] + j4 * (vv[1] - vv[0]));
      col = I.mezcla(col, ac, j2 * o.varTono);
      Pi.trazo(x, cx + ux * (b - a) / 2, cy + uy * (b - a) / 2, ux, uy, a + b, tam * 0.9, I.css(col), o.alfa * (0.6 + j4 * 0.4), (gx + gy) | 0);
      n++;
    }
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    return n;
  };

  // ---------------------------------------------------------------- papel (§4.5)
  // Loseta de 512x512 periódica: mezcla cruzada de 4 copias desplazadas (sin costuras en múltiplos de 512).
  let PAPEL = null;
  Pi.papel = function () {
    if (PAPEL) return PAPEL;
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d'), im = x.createImageData(512, 512);
    const f = (a, b) => I.fbm(a / 22, b / 22, 4, 3) * 40 + I.fbm(a / 3, b / 70, 2, 8) * 10;
    for (let j = 0; j < 512; j++) for (let i = 0; i < 512; i++) {
      const wx = i / 512, wy = j / 512, k = (j * 512 + i) * 4;
      const v = 128 + 1.3 * (f(i, j) * (1 - wx) * (1 - wy) + f(i - 512, j) * wx * (1 - wy) + f(i, j - 512) * (1 - wx) * wy + f(i - 512, j - 512) * wx * wy);
      im.data[k] = im.data[k + 1] = im.data[k + 2] = v; im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return PAPEL = c;
  };
  // Se aplica en pantalla (fijo respecto al lienzo), antes del grano.
  Pi.aplicarPapel = function (ctx, o = {}) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none';
    ctx.globalCompositeOperation = o.modo || 'overlay'; ctx.globalAlpha = o.fuerza == null ? 0.22 : o.fuerza;
    ctx.fillStyle = ctx.createPattern(Pi.papel(), 'repeat'); ctx.fillRect(0, 0, I.ANCHO, I.ALTO);
    ctx.restore();
  };
})(window);

/* ===== luz.js ===== */
/* Ilustra — luz de escena, halos, conos y ventanas iluminadas. */
(function (G) {
  'use strict';
  const I = G.Ilustra;
  function norm(v) { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }

  I.Luz = function (o = {}) {
    this.dir = norm(o.dir || [-0.6, -0.8]);        // hacia dónde está la luz clave (desde el objeto)
    this.dirBorde = norm(o.dirBorde || [0.8, -0.3]); // lado donde aparece la luz de borde
    this.clave = o.clave || '#ffd9a0';
    this.ambiente = o.ambiente || '#5c6b82';
    this.borde = o.borde || '#ffcf8a';
    this.niebla = o.niebla || '#8592a6';
    this.fuerzaBorde = o.fuerzaBorde == null ? 1 : o.fuerzaBorde;
  };
  I.Luz.prototype.con = function (o) { const l = new I.Luz(this); Object.assign(l, o); if (o.dir) l.dir = norm(o.dir); if (o.dirBorde) l.dirBorde = norm(o.dirBorde); return l; };
  I.LUZ_DEFECTO = new I.Luz();
  I.luzActual = I.LUZ_DEFECTO;

  // halo luminoso (modo 'screen')
  I.halo = function (ctx, x, y, r, color, intensidad = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const c = I.color(color);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const k = Math.min(1, intensidad);
    g.addColorStop(0, I.css(c, 0.7 * k));
    g.addColorStop(0.08, I.css(c, 0.5 * k));
    g.addColorStop(0.25, I.css(c, 0.22 * k));
    g.addColorStop(0.55, I.css(c, 0.07 * k));
    g.addColorStop(1, I.css(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  };

  // haz de luz (farola, ventana): triángulo con degradado
  I.cono = function (ctx, x, y, angulo, apertura, largo, color, intensidad = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const a1 = angulo - apertura / 2, a2 = angulo + apertura / 2;
    const p = new Path2D();
    p.moveTo(x, y); p.lineTo(x + Math.cos(a1) * largo, y + Math.sin(a1) * largo);
    p.quadraticCurveTo(x + Math.cos(angulo) * largo * 1.08, y + Math.sin(angulo) * largo * 1.08, x + Math.cos(a2) * largo, y + Math.sin(a2) * largo);
    p.closePath();
    const g = ctx.createRadialGradient(x, y, 0, x, y, largo);
    g.addColorStop(0, I.css(color, 0.32 * intensidad));
    g.addColorStop(0.5, I.css(color, 0.12 * intensidad));
    g.addColorStop(1, I.css(color, 0));
    ctx.fillStyle = g; ctx.fill(p);
    ctx.restore();
  };

  // Mapa de luz: oscurece toda la imagen (multiply) salvo alrededor de las fuentes. fuentes: [{x,y,r,color?,fuerza?}] en pantalla.
  // Se calcula a 1/4 de resolución (es difuso por naturaleza).
  I.mapaLuz = function (ctx, fuentes, o = {}) {
    const q = 4, W = I.ANCHO, H = I.ALTO, a = I.capaAux('mapaLuz', W / q, H / q), x = a.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
    x.fillStyle = I.css(o.oscuridad || '#5a4a52'); x.fillRect(0, 0, W / q, H / q);
    x.globalCompositeOperation = 'lighter';
    for (const f of fuentes) {
      const g = x.createRadialGradient(f.x / q, f.y / q, 0, f.x / q, f.y / q, f.r / q);
      const c = I.color(f.color || '#ffe6c8'), k = f.fuerza == null ? 1 : f.fuerza;
      g.addColorStop(0, I.css(c, k)); g.addColorStop(0.45, I.css(c, 0.55 * k)); g.addColorStop(1, I.css(c, 0));
      x.fillStyle = g; x.fillRect(0, 0, W / q, H / q);
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true; ctx.drawImage(a.canvas, 0, 0, W, H); ctx.restore();
  };

  // ventana iluminada: interior cálido con degradado, cortina/silueta opcional, parpadeo sutil
  I.ventanaLuz = function (ctx, x, y, w, h, color, t, semilla = 1, o = {}) {
    const k = 1 + 0.04 * I.ruido1(t * 0.8, semilla);
    const c = I.color(color);
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, I.css(I.mezcla(c, [255, 240, 210], 0.25), Math.min(1, 0.95 * k)));
    g.addColorStop(1, I.css(I.oscurece(c, 0.15), 0.95 * k));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    if (o.cortina) {
      ctx.fillStyle = I.css(I.oscurece(c, 0.35), 0.45);
      ctx.fillRect(x, y, w * 0.28, h); ctx.fillRect(x + w * 0.78, y, w * 0.22, h);
    }
    if (o.marco !== false) {
      ctx.strokeStyle = I.css(o.marcoColor || '#3b3a40', 0.85); ctx.lineWidth = Math.max(2, w * 0.05);
      ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h * 0.42); ctx.lineTo(x + w, y + h * 0.42); ctx.stroke();
    }
    ctx.restore();
    if (o.halo !== false) I.halo(ctx, x + w / 2, y + h / 2, Math.max(w, h) * (o.radioHalo || 1.3), color, (o.intensidad || 0.6) * k);
  };
})(window);

/* ===== atmosfera.js ===== */
/* Ilustra — atmósfera: lluvia, salpicaduras, niebla, reflejos, grano, viñeta, gradación. Todo puro en t. */
(function (G) {
  'use strict';
  const I = G.Ilustra;
  const W = () => I.ANCHO, H = () => I.ALTO;

  I.lluvia = function (ctx, t, o = {}) {
    const dens = o.densidad || 260, ang = o.angulo == null ? 0.18 : o.angulo, vel = o.velocidad || 1900;
    const largo = o.largo || [26, 60], alfa = o.alfa == null ? 0.28 : o.alfa, col = o.color || '#c9d3e0', sem = o.semilla || 7;
    const capas = o.capas || 3, ks = [0.55, 0.8, 1.1];
    const w = W(), h = H(), sx = Math.sin(ang), cy = Math.cos(ang);
    ctx.save();
    ctx.lineCap = 'round';
    for (let c = 0; c < capas; c++) {
      const k = ks[c] || 1, n = Math.round(dens * (c === 0 ? 1.2 : c === 1 ? 0.8 : 0.35));
      ctx.strokeStyle = I.css(col, alfa * (0.45 + 0.4 * k));
      ctx.lineWidth = 0.8 + c * 0.9;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const id = i * 13 + c * 100003 + sem * 7;
        const L = (largo[0] + I.hash(id + 5) * (largo[1] - largo[0])) * k;
        const ciclo = h * 1.4;
        const y = ((I.hash(id + 2) * ciclo + t * vel * k) % ciclo) - h * 0.2;
        const x = I.hash(id) * w * 1.3 - w * 0.15 - (y + h * 0.2) * sx / cy;
        ctx.moveTo(x, y); ctx.lineTo(x + sx * L, y + cy * L);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  // anillos de gotas sobre el suelo
  I.salpicaduras = function (ctx, t, o = {}) {
    const n = o.n || 40, y0 = o.y0, y1 = o.y1, sem = o.semilla || 3, x0 = o.x0 || 0, x1 = o.x1 || W();
    const per = o.periodo || 0.45;
    ctx.save();
    ctx.strokeStyle = I.css(o.color || '#d6dde8', 1);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < n; i++) {
      const fase = I.hash(i * 31 + sem), ciclo = Math.floor(t / per + fase);
      const k = (t / per + fase) - ciclo;
      const id = i * 977 + ciclo * 131 + sem;
      const x = x0 + I.hash(id) * (x1 - x0), yy = y0 + I.hash(id + 1) * (y1 - y0);
      const esc = 0.5 + (yy - y0) / Math.max(1, y1 - y0);
      const r = (3 + k * 16) * esc;
      ctx.globalAlpha = (1 - k) * 0.45;
      ctx.beginPath(); ctx.ellipse(x, yy, r, r * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };

  // banda de niebla: manchas suaves que derivan (radiales), calculada en capa a 1/4
  I.niebla = function (ctx, t, o = {}) {
    const y = o.y == null ? 1000 : o.y, alto = o.alto || 400, col = o.color || '#9aa6b8', alfa = o.alfa == null ? 0.35 : o.alfa;
    const vel = o.velocidad == null ? 8 : o.velocidad, sem = o.semilla || 1, n = o.manchas || 14;
    const q = 4, a = I.capaAux('niebla' + (o.canal || 0), Math.ceil(W() / q), Math.ceil(H() / q)), x = a.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, a.canvas.width, a.canvas.height);
    x.scale(1 / q, 1 / q);
    const c = I.color(col);
    // base: banda degradada
    const g = x.createLinearGradient(0, y - alto / 2, 0, y + alto / 2);
    g.addColorStop(0, I.css(c, 0)); g.addColorStop(0.5, I.css(c, alfa * 0.7)); g.addColorStop(1, I.css(c, 0));
    x.fillStyle = g; x.fillRect(0, y - alto / 2, W(), alto);
    for (let i = 0; i < n; i++) {
      const r = alto * (0.35 + I.hash(i + sem * 50) * 0.5);
      const span = W() + r * 2;
      const px = ((I.hash(i * 3 + sem) * span + t * vel * (0.6 + I.hash(i + 7) * 0.8)) % span) - r;
      const py = y + (I.hash(i * 5 + sem) - 0.5) * alto * 0.6 + I.ruido1(t * 0.1 + i, sem) * 20;
      const rg = x.createRadialGradient(px, py, 0, px, py, r);
      rg.addColorStop(0, I.css(c, alfa * 0.55)); rg.addColorStop(1, I.css(c, 0));
      x.fillStyle = rg; x.save(); x.translate(px, py); x.scale(1.8, 0.6); x.translate(-px, -py);
      x.fillRect(px - r, py - r, r * 2, r * 2); x.restore();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(a.canvas, 0, 0, W(), H());
    ctx.restore();
  };

  // reflejo vertical de una luz sobre suelo mojado (estela ondulada)
  I.reflejoLuz = function (ctx, x, ySuelo, ancho, largo, color, t, sem = 1, intensidad = 1) {
    // estela vertical hecha de trazos horizontales ondulados (agua sobre el pavimento)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const c = I.color(color), n = Math.max(16, Math.round(largo / 6));
    const g = ctx.createLinearGradient(0, ySuelo, 0, ySuelo + largo);
    g.addColorStop(0, I.css(c, 0.26 * intensidad)); g.addColorStop(0.5, I.css(c, 0.1 * intensidad)); g.addColorStop(1, I.css(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - ancho * 0.35, ySuelo); ctx.lineTo(x + ancho * 0.35, ySuelo); ctx.lineTo(x + ancho * 0.18, ySuelo + largo); ctx.lineTo(x - ancho * 0.18, ySuelo + largo); ctx.fill();
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const k = i / n, yy = ySuelo + k * largo + I.ruido1(i * 3.1 + t * 2.5, sem) * 2;
      const w = ancho * (0.25 + 0.75 * I.hash(i * 7 + sem)) * (1 - k * 0.5);
      const ox = I.ruido1(i * 1.3 + t * 1.8, sem + 4) * ancho * 0.12;
      ctx.strokeStyle = I.css(I.mezcla(c, [255, 245, 225], 0.3 * (1 - k)), (0.12 + 0.25 * I.hash(i * 3 + sem + 1)) * (1 - k) * (1 - k) * intensidad);
      ctx.lineWidth = 1 + 2.5 * (1 - k) * I.hash(i * 5 + sem);
      ctx.beginPath(); ctx.moveTo(x + ox - w / 2, yy); ctx.lineTo(x + ox + w / 2, yy); ctx.stroke();
    }
    ctx.restore();
  };

  // reflejo de un dibujo (espejo vertical sobre la línea y) — usado para charcos
  I.charcos = function (ctx, fuente, o = {}) {
    const y = o.y, alto = o.alto || 300, alfa = o.alfa == null ? 0.3 : o.alfa;
    const a = I.capaAux('charco', W(), H()), x = a.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W(), H());
    x.save(); x.translate(0, 2 * y); x.scale(1, -1); fuente(x); x.restore();
    // desvanecer con la distancia
    x.globalCompositeOperation = 'destination-in';
    const g = x.createLinearGradient(0, y, 0, y + alto);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, y, W(), alto);
    x.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha = alfa; ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(a.canvas, 0, y, W(), alto, 0, y, W(), alto);
    ctx.restore();
  };

  // grano de película: losetas de ruido precalculadas
  const losetas = [];
  function loseta(i) {
    if (losetas[i]) return losetas[i];
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), im = x.createImageData(256, 256), d = im.data, r = I.rng(500 + i);
    for (let k = 0; k < d.length; k += 4) {
      const v = 128 + (r() + r() + r() - 1.5) * 120;
      d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
    }
    x.putImageData(im, 0, 0); losetas[i] = c; return c;
  }
  I.grano = function (ctx, t, o = {}) {
    const k = o.intensidad == null ? 0.06 : o.intensidad, fps = o.fps || 24;
    const f = Math.floor(t * fps + 1e-6), i = f % 4;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = k * 2.2;
    const pat = ctx.createPattern(loseta(i), 'repeat');
    pat.setTransform(new DOMMatrix([1, 0, 0, 1, Math.floor(I.hash(f) * 256), Math.floor(I.hash(f + 77) * 256)]));
    ctx.fillStyle = pat; ctx.fillRect(0, 0, W(), H());
    ctx.restore();
  };

  // resplandor (bloom): copia reducida a 1/8, elevada a la 4ª potencia con 'multiply' (umbral suave: solo lo brillante
  // sobrevive), desenfocada y sumada con 'screen'. Coste ~5 ms.
  I.bloom = function (ctx, o = {}) {
    const f = o.fuerza == null ? 0.35 : o.fuerza, q = 8, W = I.ANCHO, H = I.ALTO;
    const a = I.capaAux('bloom', W / q, H / q), b = I.capaAux('bloom2', W / q, H / q), x = a.ctx, y = b.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.filter = 'none';
    x.drawImage(ctx.canvas, 0, 0, W / q, H / q);
    x.globalCompositeOperation = 'multiply'; x.drawImage(a.canvas, 0, 0); x.drawImage(a.canvas, 0, 0);
    x.globalCompositeOperation = 'source-over';
    y.setTransform(1, 0, 0, 1, 0, 0); y.clearRect(0, 0, W / q, H / q); y.filter = 'blur(' + (o.radio || 6) + 'px)';
    y.drawImage(a.canvas, 0, 0); y.filter = 'none';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = f;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(b.canvas, 0, 0, W, H); ctx.restore();
  };

  I.vineta = function (ctx, o = {}) {
    const f = o.fuerza == null ? 0.45 : o.fuerza;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(W() / 2, H() * 0.42, H() * 0.25, W() / 2, H() * 0.45, H() * 0.75);
    g.addColorStop(0, I.css(o.color || '#0f1420', 0)); g.addColorStop(1, I.css(o.color || '#0f1420', f));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    ctx.restore();
  };

  I.gradacion = function (ctx, o = {}) {
    const f = o.fuerza == null ? 0.12 : o.fuerza;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = f * 3;
    const g = ctx.createLinearGradient(0, 0, W() * 0.3, H());
    g.addColorStop(0, I.css(o.luces || '#ffd7a0')); g.addColorStop(1, I.css(o.sombras || '#25304a'));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    ctx.restore();
  };
})(window);

/* ===== camara.js ===== */
/* Ilustra — cámara con paralaje por profundidad, keyframes y temblor de mano. */
(function (G) {
  'use strict';
  const I = G.Ilustra;
  I.Camara = function (o = {}) {
    this.x = o.x == null ? I.ANCHO / 2 : o.x;
    this.y = o.y == null ? I.ALTO / 2 : o.y;
    this.zoom = o.zoom || 1;
    this.rot = o.rot || 0;
    this.temblor = o.temblor == null ? 0.6 : o.temblor;
    this.semilla = o.semilla || 3;
    this.claves = o.claves || {};   // {x:[[t,v],...], y:[...], zoom:[...], rot:[...]}
  };
  I.Camara.prototype.en = function (t) {
    const c = this.claves, r = {};
    for (const k of ['x', 'y', 'zoom', 'rot']) r[k] = c[k] ? I.claves(c[k], t) : this[k];
    r.x += I.ruido1(t * 0.7, this.semilla) * this.temblor * 1.5;
    r.y += I.ruido1(t * 0.6, this.semilla + 1) * this.temblor;
    r.rot += I.ruido1(t * 0.5, this.semilla + 2) * this.temblor * 0.002;
    return r;
  };
  // transforma ctx para una capa de profundidad z (1 = plano del sujeto; >1 más lejos; <1 primer plano)
  I.Camara.prototype.aplicar = function (ctx, t, z = 1) {
    const e = this.en(t), W = I.ANCHO, H = I.ALTO;
    const zz = 1 + (e.zoom - 1) / z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(W / 2, H / 2);
    ctx.scale(zz, zz);
    ctx.rotate(e.rot / z);
    ctx.translate(-W / 2 - (e.x - W / 2) / z, -H / 2 - (e.y - H / 2) / z);
  };
  // de coordenadas de mundo (en z) a pantalla
  I.Camara.prototype.aPantalla = function (t, x, y, z = 1) {
    const e = this.en(t), W = I.ANCHO, H = I.ALTO, zz = 1 + (e.zoom - 1) / z;
    const px = x - W / 2 - (e.x - W / 2) / z, py = y - H / 2 - (e.y - H / 2) / z;
    const c = Math.cos(e.rot / z), s = Math.sin(e.rot / z);
    return [W / 2 + zz * (px * c - py * s), H / 2 + zz * (px * s + py * c)];
  };
})(window);

/* ===== esqueleto.js ===== */
/* Ilustra — esqueleto 2D, poses como datos, cinemática inversa de dos huesos y ciclos procedurales.
   Convenciones (personaje mirando a la derecha, dir=1; con dir=-1 todo se refleja en x):
   - Tronco (cadera, columna, pecho, cuello, cabeza): ángulo respecto a la vertical hacia ARRIBA, + = inclinado hacia delante.
     cadera es absoluto, el resto relativo al hueso padre.
   - Brazos y piernas: el primer segmento (brazo, muslo) es absoluto respecto a la vertical hacia ABAJO, + = hacia delante.
     antebrazo/pierna/mano/pie son relativos a su padre (+ = gira hacia delante).
   - raizY: desplazamiento vertical de la pelvis en unidades de altura (+ = más abajo). */
(function (G) {
  'use strict';
  const I = G.Ilustra;

  I.PROPORCIONES = {
    adulto: { columna: 0.16, pecho: 0.14, cuello: 0.045, cabeza: 0.13, brazo: 0.17, antebrazo: 0.155, mano: 0.06, muslo: 0.245, pierna: 0.235, pie: 0.095, escalaCabeza: 1.12, anchoHombro: 1, curva: 0 },
    nino: { columna: 0.13, pecho: 0.12, cuello: 0.035, cabeza: 0.175, brazo: 0.15, antebrazo: 0.135, mano: 0.055, muslo: 0.2, pierna: 0.19, pie: 0.075, escalaCabeza: 1.35, anchoHombro: 0.85, curva: 0 },
    anciano: { columna: 0.15, pecho: 0.135, cuello: 0.045, cabeza: 0.13, brazo: 0.165, antebrazo: 0.15, mano: 0.06, muslo: 0.235, pierna: 0.225, pie: 0.085, escalaCabeza: 1, anchoHombro: 0.95, curva: 0.25 },
    // Fase 2 (§5.6): figura esbelta; F1 no la usa. Piernas x1.08 respecto de adulto, hombros x0.9, escalaCabeza 0.95; tronco acortado para que la
    // altura total siga siendo ~H (adulto 1.016H; estilizado ~1.004H).
    estilizado: { columna: 0.15, pecho: 0.13, cuello: 0.04, cabeza: 0.13, brazo: 0.175, antebrazo: 0.16, mano: 0.06, muslo: 0.2646, pierna: 0.2538, pie: 0.095, escalaCabeza: 0.95, anchoHombro: 0.9, curva: 0 }
  };

  const CAMPOS = ['cadera', 'columna', 'pecho', 'cuello', 'cabeza', 'brazoD', 'antebrazoD', 'manoD', 'brazoI', 'antebrazoI', 'manoI',
    'musloD', 'piernaD', 'pieD', 'musloI', 'piernaI', 'pieI', 'raizY'];
  I.CAMPOS_POSE = CAMPOS;
  const P0 = {}; CAMPOS.forEach(k => P0[k] = 0);
  const pose = o => Object.assign({}, P0, o);

  I.POSES = {
    dePie: pose({ columna: 0.02, pecho: -0.02, cuello: 0.06, cabeza: -0.04, brazoD: 0.06, antebrazoD: 0.18, brazoI: -0.04, antebrazoI: 0.2, musloD: 0.03, piernaD: -0.03, musloI: -0.03, piernaI: -0.01 }),
    sentado: pose({ columna: 0.05, pecho: 0.02, cuello: 0.08, brazoD: 0.35, antebrazoD: 0.9, brazoI: 0.25, antebrazoI: 0.95, musloD: 1.45, piernaD: -1.4, pieD: 0.1, musloI: 1.4, piernaI: -1.35, pieI: 0.1, raizY: 0.22 }),
    agarrar: pose({ columna: 0.18, pecho: 0.1, cuello: 0.1, cabeza: 0.15, brazoD: 0.9, antebrazoD: 0.35, brazoI: 0.1, antebrazoI: 0.3, musloD: 0.12, piernaD: -0.1, musloI: -0.08, piernaI: -0.02 }),
    abrazar: pose({ columna: 0.08, pecho: 0.08, cuello: 0.05, cabeza: 0.1, brazoD: 1.2, antebrazoD: 1.2, brazoI: 1.1, antebrazoI: 1.3, musloD: 0.05, musloI: -0.05 }),
    saludar: pose({ columna: -0.02, cuello: 0.02, cabeza: -0.1, brazoD: 2.6, antebrazoD: 0.6, manoD: -0.2, brazoI: -0.05, antebrazoI: 0.2, musloD: 0.03, musloI: -0.03 }),
    manosBolsillos: pose({ columna: 0.0, pecho: -0.03, cuello: 0.06, brazoD: 0.12, antebrazoD: 0.55, brazoI: 0.02, antebrazoI: 0.55, musloD: 0.04, musloI: -0.04 }),
    cabizbajo: pose({ columna: 0.12, pecho: 0.12, cuello: 0.25, cabeza: 0.3, brazoD: 0.05, antebrazoD: 0.12, brazoI: -0.02, antebrazoI: 0.1, musloD: 0.02, musloI: -0.02, raizY: 0.005 }),
    sostenerParaguas: pose({ columna: 0.02, pecho: -0.02, cuello: 0.05, cabeza: -0.02, brazoD: 0.55, antebrazoD: 1.75, manoD: -0.4, brazoI: -0.05, antebrazoI: 0.35, musloD: 0.03, musloI: -0.03 }),
    correr0: pose({ columna: 0.25, pecho: 0.05, cuello: -0.1, cabeza: -0.1, brazoD: -0.8, antebrazoD: 1.4, brazoI: 0.9, antebrazoI: 1.2, musloD: 0.9, piernaD: -0.4, musloI: -0.5, piernaI: -1.4, raizY: -0.01 }),
    correr1: pose({ columna: 0.25, pecho: 0.05, cuello: -0.1, cabeza: -0.1, brazoD: 0.9, antebrazoD: 1.2, brazoI: -0.8, antebrazoI: 1.4, musloD: -0.5, piernaD: -1.4, musloI: 0.9, piernaI: -0.4, raizY: -0.01 })
  };

  function angInterp(a, b, k) { return a + (b - a) * k; }
  I.mezclarPoses = function (a, b, k) {
    const o = Object.assign({}, a, b);
    for (const c of CAMPOS) o[c] = angInterp(a[c] || 0, b[c] || 0, k);
    // objetivos IK: se toman del que domina
    for (const c of ['objetivoPieD', 'objetivoPieI', 'objetivoManoD', 'objetivoManoI']) {
      if (a[c] && b[c]) o[c] = [I.lerp(a[c][0], b[c][0], k), I.lerp(a[c][1], b[c][1], k)];
      else o[c] = k < 0.5 ? a[c] : b[c];
      if (!o[c]) delete o[c];
    }
    return o;
  };
  I.sumarPoses = function (base, delta, k = 1) {
    const o = Object.assign({}, base);
    for (const c of CAMPOS) if (delta[c]) o[c] = (base[c] || 0) + delta[c] * k;
    for (const c of ['objetivoPieD', 'objetivoPieI', 'objetivoManoD', 'objetivoManoI', 'pieAlturaD', 'pieAlturaI']) if (delta[c] != null) o[c] = delta[c];
    return o;
  };

  // IK de dos huesos. Devuelve ángulos absolutos (desde la vertical hacia abajo, + = hacia delante en el marco local)
  // origen/objetivo en coordenadas locales ya reflejadas (x hacia delante). flexion +1: la articulación media apunta hacia delante.
  I.ik2 = function (origen, objetivo, l1, l2, flexion = 1) {
    const dx = objetivo[0] - origen[0], dy = objetivo[1] - origen[1];
    let d = Math.hypot(dx, dy);
    d = I.clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    const base = Math.atan2(dx, dy);
    const a = Math.acos(I.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const b = Math.acos(I.clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
    const a1 = base + flexion * a;
    const a2 = a1 - flexion * (Math.PI - b);
    return [a1, a2];
  };

  I.ciclos = {};
  // Ciclo de paso sin deslizamiento: devuelve un delta con objetivos de pie RELATIVOS a la pelvis (en unidades de altura,
  // x hacia delante, y hacia abajo desde la pelvis hasta el tobillo) a partir de la distancia recorrida.
  I.ciclos.caminar = function (distancia, H, o = {}) {
    const S = (o.zancada || 0.26) * H, apoyo = 0.6, lev = (o.levantar || 0.05) * H, bob = (o.rebote || 0.012);
    const u = distancia / (2 * S);
    const pierna = (u0) => {
      const n = Math.floor(u0), f = u0 - n;
      let x, y = 0, pie = 0;
      const plant = n * 2 * S + 0.6 * S;
      if (f < apoyo) {
        x = plant - u0 * 2 * S;
        // el talón se despega al final del apoyo (punta hacia abajo = ángulo +)
        const k = f > apoyo - 0.18 ? (f - (apoyo - 0.18)) / 0.18 : 0;
        pie = 0.45 * k * k; y = -0.018 * H * k * k;
      } else {
        const s = (f - apoyo) / (1 - apoyo), e = I.ease.entraSale(s);
        x = plant + 2 * S * e - u0 * 2 * S; y = -lev * Math.sin(Math.PI * s) - 0.018 * H * (1 - s) * (1 - s);
        // sale con la punta abajo y llega con la punta arriba (golpe de talón)
        pie = s < 0.5 ? 0.45 * (1 - s * 2) : -0.3 * Math.sin(Math.PI * (s - 0.5) * 1.6);
      }
      return { x, y, pie, f };
    };
    const d = pierna(u), i = pierna(u + 0.5);
    const brz = o.brazos == null ? 0.32 : o.brazos;
    return {
      raizY: bob * Math.cos(4 * Math.PI * u) + 0.012,
      pasoD: d, pasoI: i,
      brazoD: -brz * Math.cos(2 * Math.PI * u), antebrazoD: 0.15 + 0.15 * Math.max(0, Math.cos(2 * Math.PI * u + Math.PI)),
      brazoI: brz * Math.cos(2 * Math.PI * u), antebrazoI: 0.15 + 0.15 * Math.max(0, Math.cos(2 * Math.PI * u)),
      columna: 0.04, cabeza: -0.03 * Math.cos(4 * Math.PI * u),
      pecho: 0.02 * Math.sin(2 * Math.PI * u)
    };
  };
  // Pose completa de caminar: x = posición de la pelvis en el mundo, distancia recorrida (para la fase), ySuelo.
  // base: pose de brazos opcional (p.ej. sostenerParaguas) que conserva los campos indicados en 'fijos'.
  I.ciclos.poseCaminar = function (x, ySuelo, distancia, H, dir, base, fijos = [], o = {}) {
    const c = I.ciclos.caminar(distancia, H, o);
    const pose = Object.assign({}, I.POSES.dePie, base || {});
    for (const k of ['raizY', 'brazoD', 'antebrazoD', 'brazoI', 'antebrazoI', 'columna', 'cabeza', 'pecho'])
      if (fijos.indexOf(k) < 0) pose[k] = (k === 'raizY' || k === 'columna' || k === 'pecho' || k === 'cabeza') ? (base && base[k] || 0) + c[k] : c[k];
    const yT = ySuelo - 0.02 * H;
    pose.objetivoPieD = [x + dir * c.pasoD.x, yT + c.pasoD.y]; pose.pieD = c.pasoD.pie;
    pose.objetivoPieI = [x + dir * c.pasoI.x, yT + c.pasoI.y]; pose.pieI = c.pasoI.pie;
    pose.fasePaso = c.pasoD.f;
    return pose;
  };
  // Pose de pie con los pies plantados en posiciones dadas (para transiciones caminar -> parar sin deslizamiento)
  I.ciclos.poseParado = function (x, ySuelo, H, dir, base, pies) {
    const pose = Object.assign({}, I.POSES.dePie, base || {});
    const yT = ySuelo - 0.02 * H;
    pose.objetivoPieD = [pies ? pies[0] : x + dir * 0.03 * H, yT]; pose.pieD = 0;
    pose.objetivoPieI = [pies ? pies[1] : x - dir * 0.03 * H, yT]; pose.pieI = 0;
    return pose;
  };
  I.ciclos.respirar = function (t, o = {}) {
    const f = o.frec || 0.25, a = o.amp == null ? 0.012 : o.amp, s = Math.sin(t * Math.PI * 2 * f);
    return { pecho: -a * 1.5 * s, cuello: a * 0.8 * s, raizY: a * 0.15 * s, brazoD: a * 0.5 * s, brazoI: a * 0.5 * s, respiro: s };
  };
  I.ciclos.parpadeo = function (t, semilla = 1) {
    // intervalos pseudoaleatorios de 2.5 a 5 s, cierre de 0.14 s
    let t0 = I.hash(semilla) * 2;
    for (let k = 0; k < 200 && t0 <= t + 0.2; k++) {
      const d = t - t0;
      if (d >= 0 && d < 0.14) return Math.abs(d / 0.07 - 1) * 0.9 + 0.1 * (d / 0.14);
      t0 += 2.5 + I.hash(semilla * 31 + k) * 2.5;
    }
    return 1;
  };

  // Esqueleto: calcula posiciones de articulaciones en el mundo
  I.Esqueleto = function (proporciones, altura) {
    this.p = typeof proporciones === 'string' ? I.PROPORCIONES[proporciones] : (proporciones || I.PROPORCIONES.adulto);
    this.H = altura;
  };
  // x,y = posición del suelo bajo la pelvis (los pies tocan y cuando la pose es dePie)
  I.Esqueleto.prototype.resolver = function (x, y, pose, dir = 1) {
    const p = this.p, H = this.H, J = {};
    const arriba = a => [Math.sin(a) * dir, -Math.cos(a)];
    const abajo = a => [Math.sin(a) * dir, Math.cos(a)];
    const mas = (o, v, l) => [o[0] + v[0] * l * H, o[1] + v[1] * l * H];
    const altPelvis = (p.muslo + p.pierna) * 0.995 + 0.03;
    const pel = [x, y - altPelvis * H + (pose.raizY || 0) * H];
    J.pelvis = { x: pel[0], y: pel[1], a: pose.cadera };
    let a = (pose.cadera || 0) + (pose.columna || 0) + p.curva * 0.3;
    const pechoBase = mas(pel, arriba(a), p.columna); J.cintura = { x: pechoBase[0], y: pechoBase[1], a };
    a += (pose.pecho || 0) + p.curva * 0.5;
    const hombros = mas(pechoBase, arriba(a), p.pecho * 0.88); J.hombros = { x: hombros[0], y: hombros[1], a };
    const cuelloBase = mas(pechoBase, arriba(a), p.pecho); J.cuello = { x: cuelloBase[0], y: cuelloBase[1], a };
    a += (pose.cuello || 0) + p.curva * 0.6;
    const cabezaBase = mas(cuelloBase, arriba(a), p.cuello); J.cabezaBase = { x: cabezaBase[0], y: cabezaBase[1], a };
    a += (pose.cabeza || 0);
    const cc = mas(cabezaBase, arriba(a), p.cabeza * 0.52 * p.escalaCabeza); J.cabeza = { x: cc[0], y: cc[1], a };

    // brazos
    const brazo = (lado, prof) => {
      const hom = [hombros[0] - dir * prof * H * 0.012, hombros[1] + prof * H * 0.004];
      let a1, a2;
      const obj = pose['objetivoMano' + lado];
      if (obj) {
        const loc = [(obj[0] - hom[0]) * dir, obj[1] - hom[1]];
        [a1, a2] = I.ik2([0, 0], loc, p.brazo * H, p.antebrazo * H, -1);
      } else { a1 = pose['brazo' + lado] || 0; a2 = a1 + (pose['antebrazo' + lado] || 0); }
      const codo = mas(hom, abajo(a1), p.brazo), mano = mas(codo, abajo(a2), p.antebrazo);
      const a3 = a2 + (pose['mano' + lado] || 0);
      const punta = mas(mano, abajo(a3), p.mano);
      J['hombro' + lado] = { x: hom[0], y: hom[1], a: a1 };
      J['codo' + lado] = { x: codo[0], y: codo[1], a: a2 };
      J['mano' + lado] = { x: mano[0], y: mano[1], a: a3 };
      J['dedos' + lado] = { x: punta[0], y: punta[1], a: a3 };
    };
    brazo('D', 0); brazo('I', 1);

    // piernas
    const pierna = (lado, prof) => {
      const cad = [pel[0] - dir * prof * H * 0.01, pel[1]];
      let a1, a2, pieA = pose['pie' + lado] || 0;
      const obj = pose['objetivoPie' + lado];
      if (obj) {
        const loc = [(obj[0] - cad[0]) * dir, obj[1] - cad[1]];
        [a1, a2] = I.ik2([0, 0], loc, p.muslo * H, p.pierna * H, 1);
      } else { a1 = pose['muslo' + lado] || 0; a2 = a1 + (pose['pierna' + lado] || 0); }
      const rod = mas(cad, abajo(a1), p.muslo), tob = mas(rod, abajo(a2), p.pierna);
      // el pie apunta hacia delante (horizontal) girado por pieA
      const pf = [Math.cos(pieA) * dir, Math.sin(pieA)];
      const punta = [tob[0] + pf[0] * p.pie * H, tob[1] + pf[1] * p.pie * H + 0.02 * H];
      const talon = [tob[0] - pf[0] * p.pie * H * 0.25, tob[1] + 0.02 * H - pf[1] * p.pie * H * 0.25];
      J['cadera' + lado] = { x: cad[0], y: cad[1], a: a1 };
      J['rodilla' + lado] = { x: rod[0], y: rod[1], a: a2 };
      J['tobillo' + lado] = { x: tob[0], y: tob[1], a: a2 };
      J['punta' + lado] = { x: punta[0], y: punta[1], a: pieA };
      J['talon' + lado] = { x: talon[0], y: talon[1], a: pieA };
    };
    pierna('D', 0); pierna('I', 1);
    J.dir = dir; J.H = H; J.prop = p;
    return J;
  };
})(window);

/* ===== rig25.js ===== */
/* Ilustra — rig 2.5D (Fase 2, §6.2 y §6.3). Resuelve el esqueleto en 3D (espacio de cuerpo) y lo lleva al mundo con G3.marco.
   Espacio de cuerpo: origen en la pelvis, +X = lado izquierdo del personaje (I), +Y abajo, +Z hacia delante.
   Giros: giroPecho/giroCabeza positivos giran hacia el lado I (igual que yaw positivo gira la cara hacia la derecha de pantalla);
   inclinaCabeza positivo inclina la coronilla hacia +X (lado I); cabeceo positivo = mirar abajo.
   Objetivos 2D de manos: literales en pantalla, con prof = la del hombro. Objetivos 2D de pies: SAGITALES (ver resolver). Con 3 valores: mundo literal. */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3;
  const ABD_BRAZO = 0.12, ABD_MUSLO = 0.04;
  const nz = (v, d) => v == null ? d : v;
  const dirTronco = a => [0, -Math.cos(a), Math.sin(a)];
  // dirección de un miembro: ángulo sagital al desde abajo (+ delante), abducción be, s = +1 lado I, -1 lado D
  const dirMiembro = (al, be, s) => [s * Math.sin(be), Math.cos(al) * Math.cos(be), Math.sin(al) * Math.cos(be)];
  const angulos = (v, s) => [Math.atan2(v[2], v[1]), Math.asin(I.clamp(s * v[0], -1, 1))];

  I.Rig25 = function (proporciones, H) {
    this.p = typeof proporciones === 'string' ? I.PROPORCIONES[proporciones] : (proporciones || I.PROPORCIONES.adulto);
    this.H = H;
  };

  // e = {x, y, prof=0, yaw=0, pose, xPose=x, dir=1}
  //  x,y = suelo bajo la pelvis (como F1). Objetivos 2D de pie [tx,ty]: avance sagital z = (tx − xPose)·dir (xPose = x de la pelvis con la
  //  que se construyó la pose; dir = el de poseCaminar). Así la zancada se escorza con yaw y el pie de apoyo no desliza si el llamador
  //  mueve la pelvis x0 + d·sin(yaw) y prof d·cos(yaw).
  I.Rig25.prototype.resolver = function (e) {
    const p = this.p, H = this.H, pose = e.pose || {}, yaw = e.yaw || 0, dirP = e.dir == null ? 1 : e.dir;
    const xPose = e.xPose == null ? e.x : e.xPose;
    const g = k => pose[k] || 0;
    const altPelvis = (p.muslo + p.pierna) * 0.995 + 0.03;
    const yPel = e.y - altPelvis * H + g('raizY') * H;
    const M = G3.marco({ o: [e.x, yPel, e.prof || 0], yaw });
    const gP = g('giroPecho'), gC = g('giroCabeza');
    const mas = (o, v, l) => [o[0] + v[0] * l * H, o[1] + v[1] * l * H, o[2] + v[2] * l * H];
    const rotP = v => G3.rotY(v, gP);                       // lo que cuelga del pecho
    const J = {}, B = {};                                   // B: puntos de cuerpo
    const reg = (k, b, a) => { const w = M.aMundo(b); J[k] = { x: w[0], y: w[1], prof: w[2], p: b, a: a || 0 }; B[k] = b; };

    // --- tronco (sagital), luego se gira el pecho sobre la cintura
    const pel = [0, 0, 0];
    let a = g('cadera') + g('columna') + p.curva * 0.3;
    const cint = mas(pel, dirTronco(a), p.columna);
    const aCint = a;
    a += g('pecho') + p.curva * 0.5; const aPecho = a;
    const apc = (b) => { const r = rotP(G3.res(b, cint)); return G3.sum(cint, r); };    // gira alrededor de la vertical de la cintura
    const homC = mas(cint, dirTronco(a), p.pecho * 0.88), cueC = mas(cint, dirTronco(a), p.pecho);
    const homb = apc(homC), cue = apc(cueC);
    a += g('cuello') + p.curva * 0.6; const aCue = a;
    const cabB = apc(mas(cueC, dirTronco(a), p.cuello));
    a += g('cabeza');
    const pitchH = a + g('cabeceo'), gY = gP + gC;
    const L = p.cabeza * 0.52 * p.escalaCabeza * H;
    const v = G3.rotY(G3.rotX(G3.rotZ([0, -L, 0], g('inclinaCabeza')), pitchH), gY);
    const cab = G3.sum(cabB, v);
    reg('pelvis', pel, g('cadera')); reg('cintura', cint, aCint); reg('hombros', homb, aPecho); reg('cuello', cue, aPecho);
    reg('cabezaBase', cabB, aCue); reg('cabeza', cab, a);

    const marcos = {
      pelvis: G3.marco({ o: M.aMundo(pel), yaw, pitch: g('cadera') }),
      pecho: G3.marco({ o: M.aMundo(cint), yaw: yaw + gP, pitch: aPecho }),
      cabeza: G3.marco({ o: M.aMundo(cab), yaw: yaw + gY, pitch: pitchH, roll: g('inclinaCabeza') })
    };
    const ejes = {};
    const eje = (k, vb) => { ejes[k] = M.dirAMundo(G3.unit(vb)); };
    eje('tronco', G3.res(homb, cint)); eje('cuello', G3.res(cabB, cue));

    // --- brazos
    const aH = 0.5 * p.anchoHombro * 0.21 * H;
    const brazo = (lado, s) => {
      const O0 = [s * aH, homC[1], homC[2]];
      if (s > 0) { O0[2] -= 0.012 * H; O0[1] += 0.004 * H; }         // desplazamiento de F1 para el brazo lejano (coincidencia con F1)
      const O = apc(O0);
      const be = nz(pose['abdBrazo' + lado], ABD_BRAZO), gm = g('giroMano' + lado);
      const l1 = p.brazo * H, l2 = p.antebrazo * H;
      let v1, v2, codo, mano;
      const obj = pose['objetivoMano' + lado];
      if (obj) {
        let T;
        if (obj.length > 2) T = obj;
        else T = [obj[0], obj[1], M.aMundo(O)[2]];
        const Tb = G3.rotY(G3.res(T, M.o), -yaw);
        const exc = Math.max(0, Math.abs(gm) - 0.6) * 0.5;
        let polo = G3.rotY([0, 0.3, -1], s * exc), r;
        for (let k = 0; k < 4; k++) {
          r = G3.ik2(O, Tb, l1, l2, polo);
          if (s * r.medio[0] >= -0.02 * H) break;
          polo = [polo[0] + s * 0.5, polo[1], polo[2]];
        }
        codo = r.medio; mano = r.fin;
        v1 = G3.unit(G3.res(codo, O)); v2 = G3.unit(G3.res(mano, codo));
      } else {
        const a1 = g('brazo' + lado), a2 = a1 + g('antebrazo' + lado);
        v1 = rotP(dirMiembro(a1, be, s)); v2 = rotP(dirMiembro(a2, be, s));
        codo = mas(O, v1, p.brazo); mano = mas(codo, v2, p.antebrazo);
      }
      const [al2, be2] = angulos(rotY0(v2, -gP), s);
      const v3 = rotP(dirMiembro(al2 + g('mano' + lado), be2, s));
      const dedos = mas(mano, v3, p.mano);
      reg('hombro' + lado, O, 0); reg('codo' + lado, codo, al2); reg('mano' + lado, mano, al2 + g('mano' + lado)); reg('dedos' + lado, dedos, al2 + g('mano' + lado));
      eje('brazo' + lado, v1); eje('antebrazo' + lado, v2); eje('mano' + lado, v3);
      J['giroMano' + lado] = gm;
    };
    function rotY0(vv, ang) { return G3.rotY(vv, ang); }
    brazo('D', -1); brazo('I', 1);

    // --- piernas
    const piernaF = (lado, s) => {
      const cad = [s * 0.085 * H * (p.anchoCadera == null ? p.anchoHombro : p.anchoCadera), 0, 0];
      if (s > 0) cad[2] = -0.01 * H;                                  // desplazamiento de F1
      const be = nz(pose['abdMuslo' + lado], ABD_MUSLO), pieA = g('pie' + lado);
      const l1 = p.muslo * H, l2 = p.pierna * H;
      let v1, v2, rod, tob;
      const obj = pose['objetivoPie' + lado];
      if (obj) {
        const Tb = obj.length > 2 ? G3.rotY(G3.res(obj, M.o), -yaw) : [cad[0], obj[1] - yPel, (obj[0] - xPose) * dirP];
        let polo = [0, 0, 1], r;
        r = G3.ik2(cad, Tb, l1, l2, polo);
        rod = r.medio; tob = r.fin;
        v1 = G3.unit(G3.res(rod, cad)); v2 = G3.unit(G3.res(tob, rod));
      } else {
        const a1 = g('muslo' + lado), a2 = a1 + g('pierna' + lado);
        v1 = dirMiembro(a1, be, s); v2 = dirMiembro(a2, be, s);
        rod = mas(cad, v1, p.muslo); tob = mas(rod, v2, p.pierna);
      }
      const pf = [0, Math.sin(pieA), Math.cos(pieA)];
      const punta = G3.sum(mas(tob, pf, p.pie), [0, 0.02 * H, 0]);
      const talon = G3.sum(mas(tob, pf, -p.pie * 0.25), [0, 0.02 * H, 0]);
      reg('cadera' + lado, cad, angulos(v1, s)[0]); reg('rodilla' + lado, rod, angulos(v2, s)[0]); reg('tobillo' + lado, tob, angulos(v2, s)[0]);
      reg('punta' + lado, punta, pieA); reg('talon' + lado, talon, pieA);
      eje('muslo' + lado, v1); eje('pierna' + lado, v2); eje('pie' + lado, pf);
    };
    piernaF('D', -1); piernaF('I', 1);

    J.marcos = marcos; J.ejes = ejes; J.H = H; J.prop = p; J.yaw = yaw; J.dir = dirP; J.marcoCuerpo = M;
    return J;
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== dinamica.js ===== */
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

/* ===== personaje.js ===== */
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

/* ===== mano.js ===== */
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

/* ===== cuerpo.js ===== */
/* Ilustra — cuerpo 2.5D (Fase 2, WP6a, ESPECIFICACION_F2 §5.1, §5.2 y §6.5): miembros cónicos con abultamientos, torso por secciones,
   cuello y zapatos por nube 3D. Trabaja sobre un J25 de Rig25 (usa J.<hueso>.p en espacio de cuerpo y J.marcoCuerpo para llevar al mundo).
   Todas las piezas son funciones puras del J25 (sin estado, sin azar): mismas entradas, mismo Path2D.
   Pieza = {path, caja, campo, marco, nominal:[w,h], prof, ...}: lista para Pincel.forma(ctx, pieza.path, {campo, marco, nominal, ...}). */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3, P = I.Pincel;
  const C = I.Cuerpo = {};
  const DOSPI = Math.PI * 2;

  // ---------------------------------------------------------------- perfiles (§5.1): [u, del, det, ext, int] en fracción de H
  const ADULTO = {
    brazo: [[0, .036, .038, .040, .034], [.35, .034, .040, .038, .033], [1, .026, .028, .028, .025]],
    antebrazo: [[0, .027, .030, .029, .027], [.3, .030, .029, .031, .028], [1, .019, .018, .020, .018]],
    muslo: [[0, .058, .062, .060, .052], [.4, .052, .055, .054, .047], [1, .038, .040, .039, .036]],
    pierna: [[0, .037, .040, .038, .035], [.3, .036, .047, .040, .036], [1, .024, .026, .025, .023]]   // gemelo detrás en u=.3
  };
  const escalaPerfil = (pf, k) => { const o = {}; for (const n in pf) o[n] = pf[n].map(f => [f[0], f[1] * k, f[2] * k, f[3] * k, f[4] * k]); return o; };
  I.PERFILES = { adulto: ADULTO, nino: escalaPerfil(ADULTO, 1.1), anciano: escalaPerfil(ADULTO, 0.95) };
  const K_PERFIL = { adulto: 1, nino: 1.1, anciano: 0.95 };          // para torso y cuello (no tienen tabla por perfil)
  C.COMPLEXION = { delgada: 0.8, media: 1, robusta: 1.2 };
  const UEST = [0, 0.15, 0.35, 0.6, 0.85, 1];                          // estaciones de la sección (§5.1)
  const NANG = 12;                                                     // ángulos por sección (§5.1)

  function perfilDe(o) { const p = o.perfil || 'adulto'; return typeof p === 'string' ? (I.PERFILES[p] || ADULTO) : p; }
  function factorDe(o) {                                               // complexión (y perfil del torso) como multiplicador de radios
    const c = o.complexion == null ? 'media' : o.complexion;
    return typeof c === 'number' ? c : (C.COMPLEXION[c] == null ? 1 : C.COMPLEXION[c]);
  }
  function radiosEn(tabla, u) {                                        // interpolación lineal entre claves -> [del, det, ext, int]
    let i = 0; while (i < tabla.length - 2 && u > tabla[i + 1][0]) i++;
    const a = tabla[i], b = tabla[i + 1], f = I.clamp((u - a[0]) / (b[0] - a[0] || 1), 0, 1);
    return [1, 2, 3, 4].map(j => a[j] + (b[j] - a[j]) * f);
  }

  // ---------------------------------------------------------------- utilidades
  // Quita vértices casi repetidos (<0.6 px) y casi colineales (<0.3 px de la cuerda de sus vecinos): con ellos Catmull-Rom hace zigzags y bucles de
  // décimas de píxel (autointersecciones minúsculas).
  function limpiar(h0) {
    let h = [];
    for (const q of h0) if (!h.length || Math.hypot(q[0] - h[h.length - 1][0], q[1] - h[h.length - 1][1]) >= 0.6) h.push(q);
    while (h.length > 3 && Math.hypot(h[0][0] - h[h.length - 1][0], h[0][1] - h[h.length - 1][1]) < 0.6) h.pop();
    for (let cambio = true; cambio && h.length > 3;) {
      cambio = false;
      for (let i = 0; i < h.length && h.length > 3; i++) {
        const a = h[(i + h.length - 1) % h.length], b = h[i], c = h[(i + 1) % h.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
        if (Math.abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / l < 0.3) { h.splice(i, 1); i--; cambio = true; }
      }
    }
    return h;
  }
  // Silueta de una nube ya en mundo: envolvente + limpieza + suavizado (como G3.siluetaNube, que no limpia).
  function sil(pts3, pasos = 3) {
    const h = limpiar(G3.envolvente(pts3.map(p => [p[0], p[1]])));
    return h.length < 3 ? h : suaveSub(h, pasos);
  }
  const cajaDe = pts => P.caja(pts);
  function aPath(poly) { const p = P.aPath(poly); p._caja = cajaDe(poly); return p; }
  function circulo(c, r, n = 16) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * DOSPI; o.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]]); } return o; }
  // marco de trazos (§4.3): caja mínima de los puntos en el sistema (dir = a lo largo, n = transversal). o + u·ex + v·ey, u,v en [0,1]
  function marcoCaja(pts, dir) {
    const nx = -dir[1], ny = dir[0]; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const p of pts) {
      const a = p[0] * nx + p[1] * ny, b = p[0] * dir[0] + p[1] * dir[1];
      if (a < a0) a0 = a; if (a > a1) a1 = a; if (b < b0) b0 = b; if (b > b1) b1 = b;
    }
    return { o: [nx * a0 + dir[0] * b0, ny * a0 + dir[1] * b0], ex: [nx * (a1 - a0), ny * (a1 - a0)], ey: [dir[0] * (b1 - b0), dir[1] * (b1 - b0)] };
  }
  const unit2 = (x, y, sx = 0, sy = 1) => { x += sx; y += sy; const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  // Catmull-Rom cerrado con subdivisión previa de aristas largas (como G3.siluetaNube): evita que el suavizado se salga de un polígono de pocos vértices
  function suaveSub(h, pasos, sep = 1 / 32) {
    const n = h.length; let per = 0;
    for (let i = 0; i < n; i++) per += Math.hypot(h[(i + 1) % n][0] - h[i][0], h[(i + 1) % n][1] - h[i][1]);
    const L = Math.max(per * sep, 1e-6), d = [];
    for (let i = 0; i < n; i++) {
      const a = h[i], b = h[(i + 1) % n], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / L));
      for (let j = 0; j < k; j++) d.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    return P.suavizar(d, pasos, true);
  }

  // ---------------------------------------------------------------- segmento cónico (§5.1)
  // Marco de la sección en espacio de cuerpo: r = "delante" (Z girado con el ángulo sagital del hueso, ortogonalizado), e = "exterior" (s·v×r).
  // Con el hueso colgando r = +Z y e = ±X; al levantar el hueso hacia delante, r pasa a apuntar hacia arriba (flexión anatómica). Es continuo.
  function marcoSeg(v, s) {
    const al = Math.atan2(v[2], v[1]);
    let r = [0, -Math.sin(al), Math.cos(al)];
    r = G3.res(r, G3.esc(v, G3.punto(r, v)));
    r = G3.norma(r) < 1e-6 ? [0, -1, 0] : G3.unit(r);
    return { r, e: G3.esc(G3.cruz(v, r), s) };
  }
  // A, B: puntos de cuerpo (px). tabla: perfil del hueso. k: complexión. hol: holgura (fracción de H). uMax: recorte (puño). tapaA/tapaB: tapas redondas.
  // Devuelve el polígono 2D suavizado, los anillos 3D en mundo (para la ropa) y los datos de campo/marco.
  function segmento(M, A, B, tabla, s, k, hol, H, uMax, tapaA, tapaB) {
    const v = G3.unit(G3.res(B, A)), m = marcoSeg(v, s), largo = G3.norma(G3.res(B, A));
    const us = UEST.filter(u => u < uMax - 1e-6).concat([uMax]);
    const nube = [], anillos = [];
    for (const u of us) {
      const rd = radiosEn(tabla, u).map(q => q * k + hol), c = G3.lerp3(A, B, u), pts = [];
      for (let j = 0; j < NANG; j++) {
        const a = j / NANG * DOSPI, co = Math.cos(a), sn = Math.sin(a), ra = (co >= 0 ? rd[0] : rd[1]) * co * H, re = (sn >= 0 ? rd[2] : rd[3]) * sn * H;
        pts.push(M.aMundo([c[0] + m.r[0] * ra + m.e[0] * re, c[1] + m.r[1] * ra + m.e[1] * re, c[2] + m.r[2] * ra + m.e[2] * re]));
      }
      if (!((u === 0 && tapaA) || (u === 1 && tapaB))) for (const q of pts) nube.push(q);     // el anillo del extremo con tapa lo sustituye la tapa
      anillos.push({ u, c: M.aMundo(c), pts, rad: rd });
    }
    const rr = u => radiosEn(tabla, u).map(q => q * k + hol), mr = r => (r[0] + r[1] + r[2] + r[3]) / 4 * H;
    const A3 = M.aMundo(A), B3 = M.aMundo(B), rA = mr(rr(0)), rB = mr(rr(1));
    if (tapaA) for (const q of circulo(A3, rA)) nube.push(q);                 // tapas: círculo de la media de los radios de ese extremo
    if (tapaB) for (const q of circulo(B3, rB)) nube.push(q);
    const poly = G3.orientar(sil(nube, 3), true);
    let rmax = 0; for (const u of [0, 0.5, uMax]) for (const q of rr(u)) rmax = Math.max(rmax, q);
    return { poly, A3, B3, rA, rB, largo, anillos, rmax: rmax * H };
  }

  // pieza de un hueso suelto (se usa para dibujar por separado cuando brazo y antebrazo quedan a distinto lado del torso)
  function piezaSeg(sg, luz) {
    const path = aPath(sg.poly), dx = sg.B3[0] - sg.A3[0], dy = sg.B3[1] - sg.A3[1], dir = unit2(dx, dy, 0, 0.1 * sg.largo);
    return {
      path, caja: path._caja, campo: P.campos.cilindro([sg.A3[0], sg.A3[1]], sg.rA, [sg.B3[0], sg.B3[1]], sg.rB, luz),
      marco: marcoCaja(sg.poly, dir), nominal: [2 * sg.rmax, sg.largo], prof: (sg.A3[2] + sg.B3[2]) / 2, anillos: sg.anillos, poly: sg.poly,
      ejes: [sg.A3, sg.B3], radios: [sg.rA, sg.rB]
    };
  }

  // ---------------------------------------------------------------- miembros
  // Cuerpo.miembro(J, lado:'D'|'I', tipo:'brazo'|'pierna', H, {holgura=0, hasta=1, perfil='adulto', complexion='media', luz})
  //  -> {path (unión de los dos huesos), caja, campo, marco, nominal, prof, profs:[p1,p2], segmentos:[pieza, pieza], hasta}
  // hasta recorta el ÚLTIMO hueso (antebrazo o pierna) en esa fracción con un corte plano (puño / bajo de la pernera). tapaFin=false (extensión,
  // defecto true) quita también la tapa redonda del tobillo/muñeca (corte plano, que taparía el zapato o la mano).
  C.miembro = function (J, lado, tipo, H, o = {}) {
    const claves = tipo === 'brazo' ? ['hombro', 'codo', 'mano'] : ['cadera', 'rodilla', 'tobillo'];
    const tablas = tipo === 'brazo' ? ['brazo', 'antebrazo'] : ['muslo', 'pierna'];
    const s = lado === 'I' ? 1 : -1, perfil = perfilDe(o), k = factorDe(o), hol = o.holgura || 0, hasta = o.hasta == null ? 1 : I.clamp(o.hasta, 0.05, 1);
    const tapaFin = o.tapaFin == null ? true : !!o.tapaFin;                      // false: corte plano en el tobillo/muñeca (lo tapa el zapato o la mano)
    const M = J.marcoCuerpo, Ps = claves.map(c => J[c + lado].p);
    const sg = [0, 1].map(i => segmento(M, Ps[i], Ps[i + 1], perfil[tablas[i]], s, k, hol, H, i === 1 ? hasta : 1, true, i === 1 ? (hasta >= 1 && tapaFin) : true));
    const piezas = sg.map(q => piezaSeg(q, o.luz));
    const path = P.union([sg[0].poly, sg[1].poly]), caja = path._caja;
    const segs = sg.map(q => [[q.A3[0], q.A3[1]], q.rA, [q.B3[0], q.B3[1]], q.rB]);
    const l1 = sg[0].largo, l2 = sg[1].largo;
    // eje de los trazos: mezcla de la dirección de los dos huesos (la del primero domina, así no se invierte aunque se doble del todo)
    const d1 = [(sg[0].B3[0] - sg[0].A3[0]) / l1, (sg[0].B3[1] - sg[0].A3[1]) / l1], d2 = [(sg[1].B3[0] - sg[1].A3[0]) / l2, (sg[1].B3[1] - sg[1].A3[1]) / l2];
    const dir = unit2(d1[0] + 0.6 * d2[0], d1[1] + 0.6 * d2[1], 0, 0.1);
    const pts = sg[0].poly.concat(sg[1].poly);
    return {
      path, caja, campo: P.campos.union(segs, o.luz), marco: marcoCaja(pts, dir), nominal: [2 * Math.max(sg[0].rmax, sg[1].rmax), l1 + l2 * hasta],
      prof: (piezas[0].prof + piezas[1].prof) / 2, profs: [piezas[0].prof, piezas[1].prof], segmentos: piezas, hasta, lado, tipo
    };
  };

  // ---------------------------------------------------------------- cuello (§5.2): cilindro de J.cuello a J.cabezaBase, radio .026H -> .024H
  C.cuello = function (J, H, o = {}) {
    const k = factorDe(o) * (K_PERFIL[o.perfil] || 1), M = J.marcoCuerpo, a = J.cuello.p, b = J.cabezaBase.p, v = G3.unit(G3.res(b, a)), ex = 0.012 * H;
    const A = G3.res(a, G3.esc(v, ex)), B = G3.sum(b, G3.esc(v, ex));     // entra un poco en el torso y en la cabeza
    const tabla = [[0, .026, .026, .026, .026], [1, .024, .024, .024, .024]];
    const sg = segmento(M, A, B, tabla, 1, k, o.holgura || 0, H, 1, false, false);
    return piezaSeg(sg, o.luz);
  };

  // ---------------------------------------------------------------- torso (§5.2)
  // Secciones elípticas asimétricas [ext, del, det] (fracción de H). Entre la tabla de la especificación (hombros, pecho, cintura, cadera) se añaden
  // la sección de pelvis más baja (cadera+0.03H, algo más estrecha) y la base del cuello (para inclinar el hombro); luego se intercala una
  // sección media entre cada par para que el contorno no sea poligonal.
  const T_CADERA = [.085, .05, .065], T_BASE = [.078, .046, .058], T_CINTURA = [.07, .045, .045], T_PECHO = [.085, .06, .055], T_HOMBROS = [.105, .045, .05], T_CUELLO = [.05, .038, .04];
  function seccionesTorso(J, H, k, hol) {
    const pos = n => [J[n].x, J[n].y, J[n].prof], mp = J.marcos.pelvis, yP = mp.yaw, yC = J.marcos.pecho.yaw;
    const pP = J.pelvis.a, pC = J.hombros.a, pM = (J.cintura.a + J.hombros.a) / 2;
    const down = mp.dirAMundo([0, 0.03 * H, 0]), pel = pos('pelvis'), cin = pos('cintura'), hom = pos('hombros'), cue = pos('cuello');
    const base = [pel[0] + down[0], pel[1] + down[1], pel[2] + down[2]], pec = G3.lerp3(cin, hom, 0.6);
    const mk = (c, yaw, pitch, d) => ({ c, yaw, pitch, ext: d[0] * k + hol, del: d[1] * k + hol, det: d[2] * k + hol });
    const base0 = [mk(base, yP, pP, T_BASE), mk(pel, yP, pP, T_CADERA), mk(cin, (yP + yC) / 2, pM, T_CINTURA), mk(pec, yC, pC, T_PECHO), mk(hom, yC, pC, T_HOMBROS), mk(cue, yC, pC, T_CUELLO)];
    const S = [];
    for (let i = 0; i < base0.length; i++) {
      S.push(base0[i]);
      if (i < base0.length - 1) { const a = base0[i], b = base0[i + 1], l = (x, y) => (x + y) / 2; S.push({ c: G3.lerp3(a.c, b.c, 0.5), yaw: l(a.yaw, b.yaw), pitch: l(a.pitch, b.pitch), ext: l(a.ext, b.ext), del: l(a.del, b.del), det: l(a.det, b.det) }); }
    }
    return S;
  }
  const NT = 16;
  // Cuerpo.torso(J, H, {holgura=0, complexion, perfil, luz}) -> {path, caja, campo, marco, nominal, prof, secciones, eje}
  C.torso = function (J, H, o = {}) {
    const k = factorDe(o) * (K_PERFIL[typeof o.perfil === 'string' ? o.perfil : 'adulto'] || 1), S = seccionesTorso(J, H, k, o.holgura || 0);
    const b = S[0].c, t = S[S.length - 1].c;
    const u = unit2(t[0] - b[0], t[1] - b[1], 0, -0.08 * H), n = [-u[1], u[0]];      // u: arriba del torso en pantalla; n: a su derecha
    const der = [], izq = [], cen = [];
    for (const s of S) {
      let amax = -1e9, amin = 1e9, pmax = null, pmin = null;
      for (let j = 0; j < NT; j++) {
        const a = j / NT * DOSPI, co = Math.cos(a), sn = Math.sin(a);
        const l = G3.rotY(G3.rotX([s.ext * H * sn, 0, (co >= 0 ? s.del : s.det) * H * co], s.pitch), s.yaw);
        const x = s.c[0] + l[0], y = s.c[1] + l[1], q = x * n[0] + y * n[1];
        if (q > amax) { amax = q; pmax = [x, y]; } if (q < amin) { amin = q; pmin = [x, y]; }
      }
      der.push(pmax); izq.push(pmin); cen.push({ c: s.c, a: s.c[0] * n[0] + s.c[1] * n[1], amax, amin });
    }
    // de arriba abajo el máximo (derecha), de abajo arriba el mínimo (izquierda): sentido horario en pantalla
    const cont = der.slice().reverse().concat(izq);
    const poly = G3.orientar(suaveSub(limpiar(cont), 4), true), path = aPath(poly);
    const top2 = cen.slice().reverse();
    const campo = P.campos.seccion(top2.map(c => [c.c[0], c.c[1]]), top2.map(c => c.a - c.amin), top2.map(c => c.amax - c.a), o.luz);
    const p = J.prop, nominal = [2 * T_HOMBROS[0] * H * k, (p.columna + p.pecho + 0.03) * H];
    return {
      path, caja: path._caja, campo, marco: marcoCaja(poly, [-u[0], -u[1]]), nominal, prof: (J.pelvis.prof + J.hombros.prof) / 2,
      secciones: S, eje: { arriba: u, derecha: n }, poly
    };
  };

  // ---------------------------------------------------------------- zapatos (§5.2): nube 3D en el marco del pie (origen en el tobillo)
  // Puntos [x lateral, h altura sobre el suelo, z hacia la punta] en fracción de H. Suela: elipse de largo .14H y ancho .05H con el talón en z=-.03H.
  const SUELO = 0.0285;                                // altura del tobillo sobre el suelo con la pierna extendida en Rig25 (pelvis a (.995·(muslo+pierna)+.03)H: el objetivo de pie
                                                     // a .02H no se alcanza y el tobillo queda a .0285H; medido: 15.4 px a H=540)
  const MODELOS = {
    zapato: { th: .007, alto: 0, empeine: .035, punta: .02 },
    botin: { th: .007, alto: .07, costura: true, empeine: .035, punta: .02 },
    bota: { th: .007, alto: .16, costura: true, empeine: .035, punta: .02 },
    zapatilla: { th: .014, alto: 0, empeine: .04, punta: .026, suelaClara: true }
  };
  C.MODELOS_ZAPATO = Object.keys(MODELOS);
  const ZC = .04, ZA = .07, ZB = .025;                 // centro, semieje largo y semieje ancho de la suela
  const anilloSuela = (h, n, ea = 0, eb = 0) => { const r = []; for (let i = 0; i < n; i++) { const t = i / n * DOSPI; r.push([(ZB + eb) * Math.sin(t), h, ZC + (ZA + ea) * Math.cos(t)]); } return r; };
  function nubeZapato(m) {
    const cuerpo = anilloSuela(m.suelaClara ? m.th : 0, 8);                                // 8 puntos de suela
    cuerpo.push([-.020, m.empeine, -.020], [.020, m.empeine, -.020], [-.024, m.empeine, .045], [.024, m.empeine, .045]);    // 4 de empeine
    cuerpo.push([-.012, m.punta, .104], [.012, m.punta, .104]);                            // 2 de puntera -> 14 puntos
    if (m.alto > 0) {
      const anillo = (h, rx, rz) => { for (let i = 0; i < 8; i++) { const t = i / 8 * DOSPI; cuerpo.push([rx * Math.sin(t), h, -.002 + rz * Math.cos(t)]); } };
      if (m.alto > .1) { anillo(.09, .029, .031); anillo(m.alto, .027, .029); } else anillo(m.alto, .028, .032);
    }
    return cuerpo;
  }
  // Cuerpo.zapato(J, lado, H, {modelo='zapato', abre=0.14, luz}) -> {path, caja, campo, marco, ang, nominal, prof, suela:{path,...}|null, linea:[[x,y]...], costura:[[..],[..]]|null, largo3, modelo}
  C.zapato = function (J, lado, H, o = {}) {
    const mn = o.modelo || 'zapato', m = MODELOS[mn]; if (!m) throw new Error('Cuerpo.zapato: modelo desconocido "' + mn + '"');
    const s = lado === 'I' ? 1 : -1, abre = o.abre == null ? 0.14 : o.abre, M = J.marcoCuerpo, A = J['tobillo' + lado].p, pie = J['punta' + lado].a;
    const f = [0, Math.sin(pie), Math.cos(pie)], dn = [0, Math.cos(pie), -Math.sin(pie)], ca = Math.cos(abre), sa = Math.sin(abre) * s;
    const W = q => {                                              // local [x, h, z] (fracción de H) -> mundo [x, y, prof]
      const x = q[0] * ca + q[2] * sa, z = -q[0] * sa + q[2] * ca, d = SUELO - q[1];
      return M.aMundo([A[0] + H * x, A[1] + H * (dn[1] * d + f[1] * z), A[2] + H * (dn[2] * d + f[2] * z)]);
    };
    const cuerpo3 = nubeZapato(m).map(W), poly = G3.orientar(sil(cuerpo3, 3), true), path = aPath(poly);
    let suela = null;
    if (m.suelaClara) {
      const sp = G3.orientar(sil(anilloSuela(0, 12, .004, .003).concat(anilloSuela(m.th, 12, .004, .003)).map(W), 3), true), spath = aPath(sp);
      suela = { path: spath, caja: spath._caja, poly: sp };
    }
    // eje del pie en pantalla (signo normalizado: x >= 0) para orientar los trazos; el marco es la caja alineada a ejes
    const f2 = M.dirAMundo([sa, f[1] * ca, f[2] * ca]); let ang = Math.atan2(f2[1], f2[0]); if (Math.cos(ang) < 0) ang += Math.PI;
    const cj = path._caja, rx = Math.max(1, (cj.w) / 2), ry = Math.max(1, cj.h / 2);
    // línea de la suela: media elipse cercana (prof >= media) a la altura del borde superior de la suela
    const hl = m.suelaClara ? m.th : m.th * .8, ring = anilloSuela(hl, 16).map(W);
    const pm = ring.reduce((a, q) => a + q[2], 0) / ring.length; let i0 = -1;
    for (let i = 0; i < ring.length; i++) if (ring[i][2] >= pm && ring[(i + ring.length - 1) % ring.length][2] < pm) i0 = i;
    const linea = []; if (i0 >= 0) for (let j = 0; j < ring.length; j++) { const q = ring[(i0 + j) % ring.length]; if (q[2] < pm) break; linea.push([q[0], q[1]]); }
    if (linea.length < 2) for (const q of ring) linea.push([q[0], q[1]]);
    // separación empeine/puntera (botín y bota): arco sobre el empeine a z=.072; cada mitad se dibuja si su lado mira a cámara
    let costura = null;
    if (m.costura) {
      const arco = []; for (let i = 0; i <= 8; i++) { const ps = (i / 8 - 0.5) * Math.PI; arco.push(W([.024 * Math.sin(ps), m.th * .5 + (m.empeine - m.th * .5 + .002) * Math.cos(ps), .072 - .006 * (1 - Math.cos(ps))])); }
      const cima = arco[4][2], a = arco.slice(0, 5), b = arco.slice(4);
      costura = [];
      if (arco[0][2] >= cima - .004 * H) costura.push(a.map(q => [q[0], q[1]]));
      if (arco[8][2] >= cima - .004 * H) costura.push(b.map(q => [q[0], q[1]]));
    }
    return {
      path, caja: cj, campo: P.campos.elipsoide([cj.cx, cj.cy], rx, ry, 0, o.luz), marco: { o: [cj.x0, cj.y0], ex: [cj.w, 0], ey: [0, cj.h] }, ang,
      nominal: [0.06 * H, 0.14 * H], prof: J['tobillo' + lado].prof, suela, linea, costura, largo3: 2 * ZA * H, modelo: mn, poly
    };
  };
  // Dibuja un zapato completo (suela clara si la hay, envolvente, línea de la suela y costura). est: {color, colorSuela, luz, semilla, volumen, borde, ...}
  C.dibujarZapato = function (ctx, z, est = {}) {
    const color = est.color || '#4a3a32', base = Object.assign({ irregular: 0, textura: 0, volumen: 0.5 }, est);
    delete base.colorSuela;
    if (z.suela) P.forma(ctx, z.suela.path, Object.assign({}, base, { color: est.colorSuela || '#e8e2d6', semilla: (est.semilla || 1) + 7, plano: est.plano, pintura: false }));
    P.forma(ctx, z.path, Object.assign({}, base, { color, campo: z.campo, marco: z.marco, nominal: z.nominal, pintura: est.pintura === undefined ? undefined : est.pintura }));
    ctx.save(); ctx.clip(z.path); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const osc = I.css(I.oscurece(color, 0.5), 0.9);
    if (z.linea.length > 1) { ctx.strokeStyle = osc; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(z.linea[0][0], z.linea[0][1]); for (let i = 1; i < z.linea.length; i++) ctx.lineTo(z.linea[i][0], z.linea[i][1]); ctx.stroke(); }
    if (z.costura) { ctx.strokeStyle = I.css(I.oscurece(color, 0.45), 0.75); ctx.lineWidth = 1.2; for (const c of z.costura) { ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (let i = 1; i < c.length; i++) ctx.lineTo(c[i][0], c[i][1]); ctx.stroke(); } }
    ctx.restore();
  };

  // ---------------------------------------------------------------- orden de las piezas (§6.5)
  // Rango canónico en los empates: pierna lejana, brazo lejano, torso, pierna cercana, cabeza, brazo cercano, manos.
  const RANGO = { piernaLejos: 0, brazoLejos: 1, torso: 2, cuello: 2.5, piernaCerca: 3, cabeza: 4, brazoCerca: 5, mano: 6 };
  C.RANGO = RANGO;
  // lista: [{id, prof, rango}] -> nuevo array de lejos a cerca. Función pura (sin histéresis): a va antes que b si su prof es menor por más de
  // 0.015H; dentro de esa banda manda el rango canónico (y el id, para que el resultado no dependa del orden de entrada). Se ordena por
  // selección (Kahn) porque una banda de tolerancia no es una relación transitiva; si hubiera un ciclo se elige la de menor prof.
  C.ordenar = function (lista, H) {
    const tol = 0.015 * H, n = lista.length;
    const antes = (a, b) => { const d = b.prof - a.prof; if (Math.abs(d) < tol) return a.rango !== b.rango ? a.rango < b.rango : a.id < b.id; return d > 0; };
    const resto = lista.slice().sort((a, b) => a.prof - b.prof || a.rango - b.rango || (a.id < b.id ? -1 : 1)), out = [];
    while (resto.length) {
      let el = -1;
      for (let j = 0; j < resto.length && el < 0; j++) { let libre = true; for (let i = 0; i < resto.length && libre; i++) if (i !== j && antes(resto[i], resto[j])) libre = false; if (libre) el = j; }
      out.push(resto.splice(el < 0 ? 0 : el, 1)[0]);
    }
    return out;
  };
  // Cuerpo.piezas(J, H, {complexion, perfil, holguras, zapatos:{modelo}|null, luz}) -> piezas ordenadas de lejos a cerca:
  //  [{id, parte, prof, rango, pieza}] con parte = 'piernaD' | 'brazoI' | 'torso' | 'cuello' | 'zapatoD' ... Cada miembro es UNA pieza (la unión) salvo cuando
  //  sus dos huesos quedan a lados distintos del torso: entonces son dos ('brazoD#0', 'brazoD#1'), cada una con la prof de su punto medio.
  //  El llamador añade cabeza (rango RANGO.cabeza) y manos (RANGO.mano) a la lista antes de ordenar si las quiere en el mismo orden: usar C.ordenar.
  C.piezas = function (J, H, o = {}) {
    const lst = [], ptorso = (J.pelvis.prof + J.hombros.prof) / 2, opc = { complexion: o.complexion, perfil: o.perfil, luz: o.luz };
    const T = C.torso(J, H, opc); lst.push({ id: 'torso', parte: 'torso', prof: T.prof, rango: RANGO.torso, pieza: T });
    lst.push({ id: 'cuello', parte: 'cuello', prof: J.cuello.prof, rango: RANGO.cuello, pieza: C.cuello(J, H, opc) });
    for (const lado of ['D', 'I']) for (const tipo of ['brazo', 'pierna']) {
      const raiz = J[(tipo === 'brazo' ? 'hombro' : 'cadera') + lado].prof, cerca = raiz >= ptorso, parte = tipo + lado;
      const rango = tipo === 'brazo' ? (cerca ? RANGO.brazoCerca : RANGO.brazoLejos) : (cerca ? RANGO.piernaCerca : RANGO.piernaLejos);
      const mi = C.miembro(J, lado, tipo, H, Object.assign({}, opc, { holgura: o.holgura && o.holgura[tipo] || 0 }));
      const l0 = mi.profs[0] >= ptorso, l1 = mi.profs[1] >= ptorso;
      if (l0 === l1) lst.push({ id: parte, parte, prof: mi.prof, rango, pieza: mi });
      else mi.segmentos.forEach((sg, i) => lst.push({ id: parte + '#' + i, parte, prof: sg.prof, rango, pieza: sg, segmento: i }));
      if (tipo === 'pierna' && o.zapatos !== null) {
        const z = C.zapato(J, lado, H, Object.assign({ luz: o.luz }, o.zapatos || {}));
        lst.push({ id: 'zapato' + lado, parte: 'zapato' + lado, prof: z.prof, rango: rango + 0.5, pieza: z });
      }
    }
    return C.ordenar(lst, H);
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== ropa.js ===== */
/* Ilustra — ropa como capa propia (Fase 2, WP6b, ESPECIFICACION_F2 §5.6): prendas construidas desde el cuerpo de WP6a (Cuerpo.miembro / Cuerpo.torso)
   con holgura, más pliegues por reglas (compresión, tensión, caída) y movimiento secundario de WP5 (dinamica.cadena) en bajos y bufanda.
   Todo es función pura de (J25, t, historial): sin azar, sin estado, mismas entradas -> mismo Path2D.

   API
     Ropa.prenda(spec, J, H, o)             -> [item]   una prenda ({tipo:'abrigo'|'jersey'|'camisa'|'pantalon'|'falda'|'delantal'|'bufanda', color, ...})
     Ropa.piezas(J, H, prendas, o)          -> [item]   todas las prendas de la lista (con las reglas de capas: abrigo cerrado tapa jersey, etc.)
     Ropa.cuerpoVestido(J, H, prendas, o)   -> [item]   cuerpo (Cuerpo.piezas) con las partes cubiertas sustituidas por su prenda + o.extra (cabeza, manos...), ORDENADO
     Ropa.ordenar(items, J, H)              -> [item]   orden por capas (0 debajo del faldón, 1 faldón/abrigo/falda/delantal, 2 encima) y dentro de cada capa Cuerpo.ordenar
     Ropa.dibujar(ctx, item, est)                       dibuja un item de ropa o de cuerpo desnudo (piel / zapato)
     Ropa.manga(J, lado, H, o), Ropa.pernera(J, lado, H, o)   -> [item] (una o dos piezas, como Cuerpo.piezas)
     Ropa.pliegues.compresion(art, flexion, H, opc) / tension(desde, hacia, n, opc) / caida(cintura, bajo, n, opc) -> [{pts, ancho, alfa}]
   item = {id, parte, prof, rango, capa, pieza:{path, caja, campo, marco, nominal, prof, color, semilla}, cubre:[partes de Cuerpo que sustituye], dibujar(ctx, est)}
   o = {luz, complexion, perfil, zapatos:{modelo,color}, semilla, piel, t, historial:(t')=>J25, id, viento:(t)=>[ax,ay], extra:[items], estilo}
   Con o.historial (conductor) y o.t el bajo del abrigo/falda y la cola de la bufanda reciben movimiento secundario; sin ellos la prenda queda en reposo.
   o.historial debe ser SIEMPRE LA MISMA función por actor (dinamica.memo la usa como clave de caché). */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3, P = I.Pincel, C = I.Cuerpo, D = I.dinamica;
  const R = I.Ropa = {};
  const DOSPI = Math.PI * 2, clamp = I.clamp, lerp = I.lerp, suave = I.suave;
  const sm = (v, a, b) => suave(clamp((v - a) / (b - a), 0, 1));

  // holguras (fracción de H, §5.6). Las no listadas en la especificación (falda, delantal, camisa) son decisión de este WP.
  const HOL = { manga: { abrigo: 0.010, jersey: 0.006, camisa: 0.004 }, pernera: 0.006, abrigo: 0.012, falda: 0.008, jersey: 0.006, camisa: 0.004, delantal: 0.014 };
  R.HOLGURA = HOL;
  const RANGO_FALDON = 3.2;

  // ---------------------------------------------------------------- utilidades geométricas (copias de las privadas de cuerpo.js)
  function limpiar(h0) {
    let h = [];
    for (const q of h0) if (!h.length || Math.hypot(q[0] - h[h.length - 1][0], q[1] - h[h.length - 1][1]) >= 0.6) h.push(q);
    while (h.length > 3 && Math.hypot(h[0][0] - h[h.length - 1][0], h[0][1] - h[h.length - 1][1]) < 0.6) h.pop();
    for (let cambio = true; cambio && h.length > 3;) {
      cambio = false;
      for (let i = 0; i < h.length && h.length > 3; i++) {
        const a = h[(i + h.length - 1) % h.length], b = h[i], c = h[(i + 1) % h.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
        if (Math.abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / l < 0.3) { h.splice(i, 1); i--; cambio = true; }
      }
    }
    return h;
  }
  function suaveSub(h, pasos, sep = 1 / 32) {
    const n = h.length; let per = 0;
    for (let i = 0; i < n; i++) per += Math.hypot(h[(i + 1) % n][0] - h[i][0], h[(i + 1) % n][1] - h[i][1]);
    const L = Math.max(per * sep, 1e-6), d = [];
    for (let i = 0; i < n; i++) {
      const a = h[i], b = h[(i + 1) % n], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / L));
      for (let j = 0; j < k; j++) d.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    return P.suavizar(d, pasos, true);
  }
  function aPath(poly) { const p = P.aPath(poly); p._caja = P.caja(poly); return p; }
  function casco(pts3, pasos = 3) {                        // silueta de una nube 3D ya en mundo
    const h = limpiar(G3.envolvente(pts3));
    return h.length < 3 ? h : G3.orientar(suaveSub(h, pasos), true);
  }
  function marcoCaja(pts, dir) {                           // marco de trazos (§4.3): o + u·ex + v·ey con u,v en [0,1]
    const nx = -dir[1], ny = dir[0]; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const p of pts) {
      const a = p[0] * nx + p[1] * ny, b = p[0] * dir[0] + p[1] * dir[1];
      if (a < a0) a0 = a; if (a > a1) a1 = a; if (b < b0) b0 = b; if (b > b1) b1 = b;
    }
    return { o: [nx * a0 + dir[0] * b0, ny * a0 + dir[1] * b0], ex: [nx * (a1 - a0), ny * (a1 - a0)], ey: [dir[0] * (b1 - b0), dir[1] * (b1 - b0)] };
  }
  const unit2 = (x, y, sx = 0, sy = 1) => { x += sx; y += sy; const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const kc = o => { const c = o.complexion == null ? 'media' : o.complexion; return typeof c === 'number' ? c : (C.COMPLEXION[c] == null ? 1 : C.COMPLEXION[c]); };
  const colorDe = (s, def) => (s && s.color) || def;
  // ángulo (rad) entre las direcciones A->B y B->C (0 = recto), en 3D de mundo (invariante a la vista)
  function flexion3(A, B, Cc) {
    const u = G3.unit(G3.res([B.x, B.y, B.prof], [A.x, A.y, A.prof])), v = G3.unit(G3.res([Cc.x, Cc.y, Cc.prof], [B.x, B.y, B.prof]));
    return Math.acos(clamp(G3.punto(u, v), -1, 1));
  }
  const pos = j => [j.x, j.y, j.prof];

  // ---------------------------------------------------------------- pliegues (§5.6)
  // art = {c:[x,y] (articulación en pantalla), interior:[ix,iy] (unitario, hacia el lado cerrado del ángulo), rad (media anchura del miembro, px), vis 0..1}
  // compresion: round(flexion·2.2) curvas en "C" (0..3) apiladas en el interior, abiertas hacia el exterior; cada una aparece con alfa creciente
  // (0 en el umbral del redondeo, completa 0.5 después) para que no salten al cruzar el umbral. Prohibido el abanico radial (P4).
  const PL = { compresion(art, flexion, H, opc = {}) {
    const f22 = Math.max(0, flexion) * 2.2, n = clamp(Math.round(f22), 0, 3), out = [];
    if (!n || !art || art.vis <= 0.001) return out;
    const iw = art.interior, pw = [-iw[1], iw[0]], rad = art.rad, th = Math.PI - flexion;         // th: ángulo interior del codo/rodilla
    const dIn = clamp(rad / Math.max(Math.sin(th / 2), 0.35), rad * 0.9, rad * 2.0);                // distancia del eje a la esquina interior
    const sep = (opc.sep || 0.012) * H;
    for (let k = 0; k < n; k++) {
      const largo = Math.min((0.07 - 0.008 * k) * H, rad * 1.7), hc = largo / 2, abomba = 0.42 * hc, c0 = dIn * 0.82 - k * sep * 1.15;
      const pts = [];
      for (let s = -1; s <= 1.001; s += 0.5) pts.push([art.c[0] + iw[0] * (c0 + abomba * (1 - s * s)) + pw[0] * s * hc, art.c[1] + iw[1] * (c0 + abomba * (1 - s * s)) + pw[1] * s * hc]);
      out.push({ pts, ancho: (opc.ancho || 0.0065) * H * (1 - 0.12 * k), alfa: 0.6 * sm(f22, k + 0.5, k + 1.0) * art.vis });
    }
    return out;
  },
  // líneas diagonales levemente curvas de desde a hacia (axila con abdBrazo>0.5, entrepierna al dar un paso largo). opc.k: intensidad 0..1
  tension(desde, hacia, n = 2, opc = {}) {
    const H = opc.H || 540, k = opc.k == null ? 1 : opc.k, out = [], dx = hacia[0] - desde[0], dy = hacia[1] - desde[1], l = Math.hypot(dx, dy) || 1, pw = [-dy / l, dx / l];
    if (k <= 0.001) return out;
    for (let j = 0; j < n; j++) {
      const o = (j - (n - 1) / 2) * (opc.sep || 0.014) * H, bomba = (opc.curva == null ? 0.07 : opc.curva) * l;
      out.push({ pts: [[desde[0] + pw[0] * o, desde[1] + pw[1] * o], [desde[0] + dx * 0.5 + pw[0] * (o * 0.7 + bomba), desde[1] + dy * 0.5 + pw[1] * (o * 0.7 + bomba)], [hacia[0] + pw[0] * o * 0.35, hacia[1] + pw[1] * o * 0.35]],
        ancho: (opc.ancho || 0.0055) * H, alfa: 0.6 * k });
    }
    return out;
  },
  // líneas casi verticales del cinturón al bajo. cintura = [pIzq, pDer] del cinturón; bajo = polilínea del bajo (ya con el desfase de la cadena),
  // así las líneas se mueven con ella. Cada línea se arquea un poco en proporción al desplazamiento horizontal del bajo respecto a la vertical.
  caida(cintura, bajo, n = 3, opc = {}) {
    const H = opc.H || 540, out = [], m = bajo.length;
    if (m < 2) return out;
    const cum = [0]; for (let i = 1; i < m; i++) cum.push(cum[i - 1] + Math.hypot(bajo[i][0] - bajo[i - 1][0], bajo[i][1] - bajo[i - 1][1]));
    const tot = cum[m - 1] || 1;
    for (let j = 0; j < n; j++) {
      const f = (j + 1) / (n + 1), p0 = [lerp(cintura[0][0], cintura[1][0], f), lerp(cintura[0][1], cintura[1][1], f)], s = f * tot;
      let i = 1; while (i < m - 1 && cum[i] < s) i++;
      const a = bajo[i - 1], b = bajo[i], u = clamp((s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), 0, 1), p1 = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
      // verticales cerca del cinturón; el desplazamiento horizontal hacia el bajo se acumula hacia abajo (u^1.7), como cuelga la tela
      const pts = [0, 0.3, 0.62, 1].map(v => [lerp(p0[0], lerp(p0[0], p1[0], opc.abre == null ? 0.35 : opc.abre), Math.pow(v, 1.7)), lerp(p0[1], p1[1], v)]);
      out.push({ pts, ancho: (opc.ancho || 0.0055) * H, alfa: 0.6 * (opc.k == null ? 1 : opc.k) * (0.8 + 0.2 * (j % 2)) });
    }
    return out;
  } };
  R.pliegues = PL;

  // ---------------------------------------------------------------- dibujo común
  function formaPieza(ctx, pz, est, extra) {
    return P.forma(ctx, pz.path, Object.assign({ color: pz.color, campo: pz.campo, marco: pz.marco, nominal: pz.nominal, semilla: pz.semilla, volumen: 0.7, borde: 0.45, textura: 0.2, irregular: 0, luz: est.luz }, est.estilo || null, extra || null));
  }
  function conClip(ctx, path, fn) { ctx.save(); ctx.clip(path); fn(); ctx.restore(); }
  function trazos(ctx, lista, color, k) {
    const c = I.oscurece(color, 0.5);
    for (const s of lista) if (s.alfa * (k == null ? 1 : k) > 0.01) P.trazo(ctx, s.pts, { color: c, ancho: s.ancho, alfa: s.alfa * (k == null ? 1 : k) });
  }
  function linea(ctx, pts, css, ancho) {
    if (pts.length < 2) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = css; ctx.lineWidth = ancho;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.restore();
  }
  const semillaDe = (o, idx) => ((o.semilla == null ? 5 : o.semilla) * 100 + idx) | 0;
  // pieza simple a partir de un polígono (bandas, cuellos, parches): campo y marco por defecto
  function piezaPoly(poly, color, semilla, nominal, prof, dir) {
    const path = aPath(poly), cj = path._caja;
    return { path, caja: cj, campo: null, marco: marcoCaja(poly, dir || [0, 1]), nominal: nominal || [cj.w, cj.h], prof, color, semilla, poly };
  }

  // ---------------------------------------------------------------- dinámica: desfase del bajo (retraso y vuelo) con dinamica.cadena
  // anclasFn(J) -> [{raiz:[x,y], punto:[x,y]}, {...}]: raíz = cadera y punto de reposo del bajo de cada lado. Devuelve el desfase [dx,dy] de cada lado
  // = punta de la cadena de 2 segmentos menos su posición de reposo con el MISMO conductor interpolado (así en reposo vale exactamente 0).
  function desfaseBajo(t, o, J, H, anclasFn) {
    const din = o.historial; if (!din || t == null) return [[0, 0], [0, 0]];
    const id = 'ropa:' + (o.id || 'a'), Jm = D.memo(id, din), act = anclasFn(J), mu = 1 / 60, out = [], cache = new Map();
    const anc = tp => { let v = cache.get(tp); if (!v) { v = anclasFn(Jm(tp)); cache.set(tp, v); } return v; };
    const tt = D.alinear(t), s = tt / mu, k0 = Math.floor(s + 1e-9), f = s - k0, lim = 0.12 * H;
    for (let i = 0; i < 2; i++) {
      const L = Math.max(4, Math.hypot(act[i].punto[0] - act[i].raiz[0], act[i].punto[1] - act[i].raiz[1]) / 2);
      const cond = tp => { const a = anc(tp)[i]; return { p: a.raiz, ang: Math.atan2(a.punto[0] - a.raiz[0], a.punto[1] - a.raiz[1]) }; };
      const ch = D.cadena(t, cond, 2, { largoSeg: L, frec: o.frecBajo || 3.0, amort: o.amortBajo == null ? 0.45 : o.amortBajo, gravedad: 0, viento: o.viento });
      const c0 = cond(k0 * mu), c1 = cond((k0 + 1) * mu);
      const rx = lerp(c0.p[0], c1.p[0], f), ry = lerp(c0.p[1], c1.p[1], f), ra = lerp(c0.ang, c1.ang, f);
      const gan = o.ganBajo == null ? 0.6 : o.ganBajo;                       // ganancia artística del vuelo del bajo
      let dx = (ch[2][0] - (rx + Math.sin(ra) * 2 * L)) * gan, dy = (ch[2][1] - (ry + Math.cos(ra) * 2 * L)) * gan;
      const m = Math.hypot(dx, dy); if (m > lim) { dx *= lim / m; dy *= lim / m; }
      out.push([dx, dy]);
    }
    return out;
  }
  // punto del bajo a distancia d (px) de la cadera por la cadena muslo->pierna, en espacio de cuerpo (la regla de F1)
  function pCad(J, lado, d) {
    const c = J['cadera' + lado].p, r = J['rodilla' + lado].p, t = J['tobillo' + lado].p, l1 = G3.norma(G3.res(r, c));
    if (d <= l1) return G3.lerp3(c, r, d / l1);
    return G3.lerp3(r, t, Math.min(1, (d - l1) / (G3.norma(G3.res(t, r)) || 1)));
  }

  // ---------------------------------------------------------------- anillos y contornos de prendas con faldón
  // Un anillo es una función (a) -> [x,y,prof] del ángulo a de la sección (a=0 delante, +π/2 lado I).
  function ptSec(s, H, a) {                                // igual que Cuerpo.torso
    const co = Math.cos(a), sn = Math.sin(a), l = G3.rotY(G3.rotX([s.ext * H * sn, 0, (co >= 0 ? s.del : s.det) * H * co], s.pitch), s.yaw);
    return [s.c[0] + l[0], s.c[1] + l[1], s.c[2] + l[2]];
  }
  const anillosTorso = (S, H) => S.slice().reverse().map(s => a => ptSec(s, H, a));       // del cuello a la base
  function contorno(anillos, H, N = 16) {
    const cen0 = rg => { const q = [rg(0), rg(Math.PI / 2), rg(Math.PI), rg(-Math.PI / 2)]; return [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4]; };
    const ct = cen0(anillos[0]), cb = cen0(anillos[anillos.length - 1]), u = unit2(ct[0] - cb[0], ct[1] - cb[1], 0, -0.08 * H), n = [-u[1], u[0]];
    const der = [], izq = [], cen = []; let ult = null;
    for (const rg of anillos) {
      let amax = -1e9, amin = 1e9, pmax = null, pmin = null, cx = 0, cy = 0; const pts = [];
      for (let j = 0; j < N; j++) {
        const p = rg(j / N * DOSPI), q = p[0] * n[0] + p[1] * n[1]; pts.push(p); cx += p[0]; cy += p[1];
        if (q > amax) { amax = q; pmax = p; } if (q < amin) { amin = q; pmin = p; }
      }
      der.push([pmax[0], pmax[1]]); izq.push([pmin[0], pmin[1]]);
      const c = [cx / N, cy / N]; cen.push({ c, a: c[0] * n[0] + c[1] * n[1], amax, amin }); ult = { pts, amax, amin };
    }
    // borde inferior: envolvente inferior del último anillo (polilínea cerrada de sus muestras) en 5 posiciones laterales, de derecha a izquierda.
    // Es continua en los parámetros del anillo (no elige "la muestra más baja", que saltaría de una muestra a otra).
    const bajo = [], N2 = ult.pts.length;
    for (const f of [0.88, 0.7, 0.5, 0.3, 0.12]) {
      const q0 = ult.amin + f * (ult.amax - ult.amin); let yb = -1e9, xb = 0;
      for (let i = 0; i < N2; i++) {
        const p1 = ult.pts[i], p2 = ult.pts[(i + 1) % N2], qa = p1[0] * n[0] + p1[1] * n[1], qb = p2[0] * n[0] + p2[1] * n[1];
        if ((qa - q0) * (qb - q0) <= 0 && qa !== qb) { const k = (q0 - qa) / (qb - qa), yy = p1[1] + (p2[1] - p1[1]) * k; if (yy > yb) { yb = yy; xb = p1[0] + (p2[0] - p1[0]) * k; } }
      }
      if (yb > -1e8) bajo.push([xb, yb]);
    }
    const poly = G3.orientar(suaveSub(limpiar(der.concat(bajo, izq.slice().reverse())), 4), true);
    return { poly, path: aPath(poly), cen, u, n, bajo };
  }
  function campoDe(ct, luz) {
    return P.campos.seccion(ct.cen.map(c => c.c), ct.cen.map(c => c.a - c.amin), ct.cen.map(c => c.amax - c.a), luz);
  }
  // Faldón: anillos desde la base (fn) hasta el bajo (fn) con K pasos; el desfase del bajo pesa e^1.3 (la cintura no se mueve)
  function anillosFaldon(base, bajoFn, off, K, bump) {
    const out = [];
    for (let k = 1; k <= K; k++) {
      const e = k / K, w = Math.pow(e, 1.3), pb = bump ? Math.exp(-Math.pow((e - 0.25) / 0.4, 2)) : 0;
      out.push(a => {
        const p = G3.lerp3(base(a), bajoFn(a), e), d = off(a);
        if (pb) { const v = bump(a); return [p[0] + d[0] * w + v[0] * pb, p[1] + d[1] * w + v[1] * pb, p[2] + v[2] * pb]; }   // abultamiento de caderas: tapa las tapas de los muslos
        return [p[0] + d[0] * w, p[1] + d[1] * w, p[2]];
      });
    }
    return out;
  }
  // vector de abultamiento lateral/frontal en mundo para un ángulo a de la sección (amp en px)
  const bumpDe = (yaw, amp) => a => G3.rotY([Math.sin(a) * amp, 0, Math.cos(a) * amp * 0.35], yaw);
  // desfase del bajo en función del ángulo: mezcla lateral de los dos lados y algo más de vuelo delante y detrás
  const offDe = d => a => { const k = (Math.sin(a) + 1) / 2, f = 1 + 0.35 * Math.abs(Math.cos(a)); return [lerp(d[0][0], d[1][0], k) * f, lerp(d[0][1], d[1][1], k) * f]; };
  const nzFrente = J => J.marcos.pecho.dirAMundo([0, 0, 1])[2];

  // curva sobre la superficie delantera: puntos (lateral fraccionario f respecto a ext) de una lista de anillos
  const aF = f => Math.asin(clamp(f, -0.98, 0.98));
  function lineaFrontal(anillos, f = 0) { return anillos.map(rg => { const p = rg(aF(f)); return [p[0], p[1], p[2]]; }); }
  // interpolación entre anillos por índice real d (0 = primero)
  function enProf(anillos, d, a) { const i = clamp(Math.floor(d), 0, anillos.length - 2), k = clamp(d - i, 0, 1); return G3.lerp3(anillos[i](a), anillos[i + 1](a), k); }

  // anillo alrededor del cuello (bufanda, cuellos): casco de dos anillos a fracciones f0 y f1 del largo del cuello (en mundo)
  function ejesCuello(J) {
    const A = pos(J.cuello), B = pos(J.cabezaBase), v = G3.unit(G3.res(B, A)), L = G3.norma(G3.res(B, A));
    let r = G3.res(J.marcos.pecho.dirAMundo([0, 0, 1]), G3.esc(v, G3.punto(J.marcos.pecho.dirAMundo([0, 0, 1]), v)));
    r = G3.norma(r) < 1e-6 ? [0, 0, 1] : G3.unit(r);
    return { A, v, L, r, e: G3.cruz(v, r) };
  }
  function nubeCuello(J, H, f0, f1, rx, rz, kk) {
    const ej = ejesCuello(J), pts = [];
    for (const f of [f0, f1]) for (let j = 0; j < 12; j++) {
      const a = j / 12 * DOSPI, c = G3.sum(ej.A, G3.esc(ej.v, f * ej.L));
      pts.push(G3.sum(c, G3.sum(G3.esc(ej.r, Math.cos(a) * rz * H * kk), G3.esc(ej.e, Math.sin(a) * rx * H * kk))));
    }
    return { pts, ej };
  }
  function cuelloPieza(J, H, color, semilla, f0, f1, rx, rz, kk, oscuro) {
    const n = nubeCuello(J, H, f0, f1, rx, rz, kk), poly = casco(n.pts, 3);
    return piezaPoly(poly, oscuro ? I.oscurece(color, oscuro) : color, semilla, [2 * rx * H * kk, (f1 - f0) * n.ej.L + 0.02 * H], J.cuello.prof, [0, 1]);
  }

  // yugo: rellena la caída del hombro entre el cuello y la tapa redonda de cada manga (casco del anillo del cuello, el de los hombros y la tapa del brazo)
  function yugos(J, H, torsoR, kk, hol) {
    const out = [], r = (0.038 * kk + hol) * H;
    for (const lado of ['D', 'I']) {
      const h = J['hombro' + lado], pts = [];
      for (let j = 0; j < 16; j++) { const a = j / 16 * DOSPI; pts.push([h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, h.prof]); }
      for (const rg of [torsoR[0], torsoR[2]]) for (let j = 0; j < 16; j++) pts.push(rg(j / 16 * DOSPI));
      out.push(casco(pts, 3));
    }
    return out;
  }
  // ---------------------------------------------------------------- mangas y perneras (miembros vestidos)
  function miembroVestido(J, lado, tipo, H, o, hol, hasta, color, idBase, idx, rangoDel, rangoDetras) {
    const mi = C.miembro(J, lado, tipo, H, { holgura: hol, hasta, complexion: o.complexion, perfil: o.perfil, luz: o.luz, tapaFin: false });
    const ptorso = (J.pelvis.prof + J.hombros.prof) / 2, parte = tipo + lado;
    const raiz = J[(tipo === 'brazo' ? 'hombro' : 'cadera') + lado].prof, cerca = raiz >= ptorso;
    const rango = tipo === 'brazo' ? (cerca ? C.RANGO.brazoCerca : C.RANGO.brazoLejos) + rangoDel : (cerca ? C.RANGO.piernaCerca : C.RANGO.piernaLejos) + rangoDel;
    const claves = tipo === 'brazo' ? ['hombro', 'codo', 'mano'] : ['cadera', 'rodilla', 'tobillo'];
    const A = J[claves[0] + lado], B = J[claves[1] + lado], E = J[claves[2] + lado];
    const flex = flexion3(A, B, E), ua = G3.unit(G3.res(pos(A), pos(B))), ub = G3.unit(G3.res(pos(E), pos(B)));
    const bis = G3.unit(G3.sum(ua, ub)), l2 = Math.hypot(bis[0], bis[1]);
    const art = { c: [B.x, B.y], interior: l2 > 1e-3 ? [bis[0] / l2, bis[1] / l2] : [0, 1], vis: sm(l2, 0.0, 0.3) * sm(bis[2], -0.35, 0.05), rad: (mi.segmentos[0].radios[1] + mi.segmentos[1].radios[0]) / 2 };
    const plie = PL.compresion(art, flex, H);
    // extremo: puño de la manga (elipse proyectada, oscurece 0.12) o bajo de la pernera (línea)
    const sg = mi.segmentos[1], an = sg.anillos[sg.anillos.length - 1], dirW = G3.unit(G3.res(sg.ejes[1], sg.ejes[0]));
    let puno = null, bajoLinea = null;
    if (tipo === 'brazo') {
      const nube = [];
      for (const d of [0, -0.034 * H]) for (const p of an.pts) { const q = G3.sum(G3.sum(an.c, G3.esc(G3.res(p, an.c), 1.07)), G3.esc(dirW, d)); nube.push(q); }
      puno = piezaPoly(casco(nube, 3), I.oscurece(color, 0.12), idBase * 100 + 50 + idx, [2 * sg.radios[1] * 1.1, 0.04 * H], an.c[2], [dirW[0], dirW[1]]);
    } else {
      const pm = an.pts.reduce((s, q) => s + q[2], 0) / an.pts.length, cerc = an.pts.filter(q => q[2] >= pm).sort((p, q) => p[0] - q[0]);
      bajoLinea = cerc.map(q => [q[0], q[1]]);
    }
    const mk = (pz, sufijo) => ({ id: (tipo === 'brazo' ? 'manga' : 'pernera') + lado + sufijo, parte, prof: pz.prof, rango, capa: 0, pieza: Object.assign({}, pz, { color, semilla: idBase * 100 + idx }), cubre: [parte] });
    const l0 = mi.profs[0] >= ptorso, l1 = mi.profs[1] >= ptorso, items = [];
    const dibujarUnidad = (ctx, est, it, conPlie, conFin) => {
      formaPieza(ctx, it.pieza, est);
      if (conPlie) conClip(ctx, it.pieza.path, () => trazos(ctx, plie, color));
      if (conFin) conFin(ctx, est, it);
    };
    const fin = (ctx, est, it) => {
      if (puno) formaPieza(ctx, puno, est, { volumen: 0.5, borde: 0.3, pintura: false });
      if (bajoLinea) conClip(ctx, it.pieza.path, () => linea(ctx, bajoLinea, I.css(I.oscurece(color, 0.45), 0.55), 1.4));
    };
    const extraDib = o.extraMiembro;                      // enganche para pliegues de tensión (pernera: entrepierna)
    if (l0 === l1) {
      const it = mk(mi, '');
      it.dibujar = (ctx, est) => { dibujarUnidad(ctx, est || {}, it, true, fin); if (extraDib) conClip(ctx, it.pieza.path, () => extraDib(ctx, color)); };
      it.info = { flexion: flex, pliegues: plie, art, anillos: mi.segmentos[0].anillos };
      items.push(it);
    } else {
      mi.segmentos.forEach((sgm, i) => {
        const it = mk(sgm, '#' + i); it.prof = sgm.prof;
        it.dibujar = (ctx, est) => { dibujarUnidad(ctx, est || {}, it, i === 1, i === 1 ? fin : null); if (i === 1 && extraDib) conClip(ctx, it.pieza.path, () => extraDib(ctx, color)); };
        it.info = { flexion: flex, pliegues: i === 1 ? plie : [], art, anillos: mi.segmentos[0].anillos };
        items.push(it);
      });
    }
    return items;
  }
  R.manga = function (J, lado, H, o = {}) {
    const mat = o.material || 'abrigo', hol = o.holgura != null ? o.holgura : HOL.manga[mat];
    return miembroVestido(J, lado, 'brazo', H, o, hol, o.hasta == null ? 0.92 : o.hasta, o.color || '#c89a4a', 1 + (mat === 'abrigo' ? 0 : mat === 'jersey' ? 1 : 2), lado === 'D' ? 0 : 1, 0.1);
  };
  R.pernera = function (J, lado, H, o = {}) {
    const hol = o.holgura != null ? o.holgura : HOL.pernera, mod = o.zapatos && o.zapatos.modelo, mete = mod === 'bota' || mod === 'botin';
    // entrepierna: tensión cuando los muslos se abren más de 0.5 rad (paso largo)
    const vD = G3.unit(G3.res(J.rodillaD.p, J.caderaD.p)), vI = G3.unit(G3.res(J.rodillaI.p, J.caderaI.p)), abre = Math.acos(clamp(G3.punto(vD, vI), -1, 1));
    const crotch = J.marcoCuerpo.aMundo([0, 0.045 * H, 0]), cad = pos(J['cadera' + lado]), rod = pos(J['rodilla' + lado]);
    const hacia = [lerp(cad[0], rod[0], 0.5), lerp(cad[1], rod[1], 0.5)], kT = sm(abre, 0.5, 0.8);
    const tens = PL.tension([crotch[0], crotch[1]], hacia, 2, { H, k: kT });
    const o2 = Object.assign({}, o, { extraMiembro: (ctx, color) => trazos(ctx, tens, color) });
    return miembroVestido(J, lado, 'pierna', H, o2, hol, 0.97, o.color || '#23262f', 4, lado === 'D' ? 0 : 1, mete ? 0.2 : 0.7);
  };

  // Cadera del pantalón: casco de la cintura y de los arranques de ambos muslos (con la holgura de la pernera). Tapa las tapas redondas de los
  // muslos que en WP6a asoman como de maniquí; va después de las perneras y antes del jersey/abrigo, que cubren la cintura.
  function caderaPantalon(J, H, o, spec, piernas) {
    const color = colorDe(spec, '#23262f'), T = C.torso(J, H, { holgura: HOL.pernera, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), rCin = ptSecF(T.secciones[3], H), pts = [];
    for (let j = 0; j < 16; j++) pts.push(rCin(j / 16 * DOSPI));
    for (const it of piernas) { const an = it.info.anillos; for (const k of [0, 1]) for (const q of an[k].pts) pts.push(q); }
    const poly = casco(pts, 3), pz = piezaPoly(poly, color, 4 * 100 + 9, [0.3 * H * kc(o), 0.14 * H], T.prof, [0, 1]);
    return [{ id: 'caderaPantalon', parte: 'cadera', prof: T.prof, rango: 3.0, capa: 1, pieza: pz, cubre: [], dibujar: (ctx, est) => { est = est || {}; formaPieza(ctx, pz, est, { volumen: 0.6, borde: 0 }); } }];
  }
  const ptSecF = (s, H) => a => ptSec(s, H, a);

  // ---------------------------------------------------------------- torso vestido: jersey, camisa
  function torsoSimple(J, H, o, spec, tipo) {
    const hol = HOL[tipo], color = colorDe(spec, tipo === 'jersey' ? '#8a6a52' : '#d9d2c3'), idb = tipo === 'jersey' ? 6 : 7;
    const T = C.torso(J, H, { holgura: hol, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), S = T.secciones, rings = anillosTorso(S, H);
    // el jersey y la camisa bajan hasta cubrir las caderas: un anillo más con abultamiento lateral (las tapas de los muslos de WP6a son más anchas que la pelvis)
    const base0 = rings[rings.length - 1], bump = bumpDe(J.marcos.pelvis.yaw, 0.045 * kc(o) * H), hemJ = a => { const p = base0(a), v = bump(a); return [p[0] + v[0], p[1] + 0.05 * H, p[2] + v[2]]; };
    // A-line suave desde la cintura (anillos 6..10 de torsoR): el factor sube de 0 a 0.8 y el anillo de cadera llega a 1
    const ringsH = rings.map((rg, i) => i < 6 ? rg : a => { const p = rg(a), v = bump(a), f = (i - 6) / 5; return [p[0] + v[0] * f, p[1], p[2] + v[2] * f]; }).concat([hemJ]);
    const ct = contorno(ringsH, H), yg = yugos(J, H, rings, kc(o), hol), upath = P.union([ct.poly].concat(yg));
    const pz = Object.assign({}, T, { path: upath, caja: upath._caja, campo: campoDe(ct, o.luz), marco: marcoCaja(ct.poly, [-ct.u[0], -ct.u[1]]), poly: ct.poly, color, semilla: idb * 100 });
    const cuello = spec.cuello || (tipo === 'jersey' ? 'redondo' : 'camisa'), piel = o.piel || '#e6b48f';
    // escote: curva sobre la superficie delantera; el interior se rellena con piel (solo si el frente mira a cámara)
    const nz = nzFrente(J), esc = [];
    if (cuello === 'redondo' || cuello === 'pico') {
      const dmax = cuello === 'pico' ? 3.4 : 1.15, prof = f => cuello === 'pico' ? dmax * (1 - Math.abs(f)) : dmax * Math.pow(1 - f * f, 0.8);
      for (let f = -1; f <= 1.001; f += 0.25) esc.push(enProf(rings, prof(f), aF(f * 0.72)));
    }
    const hemBanda = tipo === 'jersey' ? contorno([a => { const p = hemJ(a); return [p[0], p[1] - 0.024 * H, p[2]]; }, hemJ], H) : null;
    const it = { id: tipo, parte: 'torso', prof: T.prof, rango: 3.1, capa: 1, pieza: pz, cubre: ['torso'], info: { secciones: S } };
    it.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, pz, est);
      conClip(ctx, pz.path, () => {
        if (hemBanda) P.forma(ctx, hemBanda.path, { color: I.oscurece(color, 0.1), volumen: 0.4, borde: 0.2, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 1 });
        if (esc.length && nz > 0.04) {
          const top = [];
          for (let f = 1; f >= -1.001; f -= 0.25) top.push(rings[0](aF(f * 0.72)));
          const poly = G3.orientar(esc.concat(top).map(p => [p[0], p[1]]), true);
          P.forma(ctx, aPath(poly), { color: piel, volumen: 0.3, borde: 0.1, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 2 });
          linea(ctx, esc, I.css(I.oscurece(color, 0.5), 0.6 * sm(nz, 0.04, 0.3)), 1.5);
        }
        if (tipo === 'camisa') {                          // tapeta y botones
          const l = lineaFrontal(rings, 0), vf = sm(nz, 0.02, 0.25);
          if (vf > 0.01) { linea(ctx, l, I.css(I.oscurece(color, 0.4), 0.5 * vf), 1.2); ctx.fillStyle = I.css(I.oscurece(color, 0.55), 0.8 * vf); for (let k = 0; k < 5; k++) { const p = enProf(rings, 1.5 + k * 1.7, 0); ctx.beginPath(); ctx.arc(p[0], p[1], 0.0045 * H, 0, 7); ctx.fill(); } }
        }
      });
    };
    const items = [it];
    if (cuello === 'alto') {                              // cuello vuelto: anillo alrededor del cuello, sobre la piel del cuello
      const cp = cuelloPieza(J, H, color, idb * 100 + 3, 0.0, 0.62, 0.044, 0.046, kc(o), 0.04);
      items.push({ id: tipo + 'Cuello', parte: 'cuello', prof: J.cuello.prof, rango: 3.15, capa: 1, pieza: cp, cubre: [], dibujar: (ctx, est) => { est = est || {}; formaPieza(ctx, cp, est, { volumen: 0.6 }); conClip(ctx, cp.path, () => { const ej = ejesCuello(J); for (let i = 1; i < 4; i++) { const pts = []; for (let j = 0; j <= 8; j++) { const a = Math.PI * (j / 8 - 0.5), c = G3.sum(ej.A, G3.esc(ej.v, ej.L * (0.1 + i * 0.14))); const q = G3.sum(c, G3.sum(G3.esc(ej.r, Math.cos(a) * 0.046 * H * kc(o)), G3.esc(ej.e, Math.sin(a) * 0.044 * H * kc(o)))); pts.push([q[0], q[1]]); } linea(ctx, pts, I.css(I.oscurece(color, 0.4), 0.4), 1.2); } }); } });
    } else if (tipo === 'camisa' && cuello === 'camisa') {
      const cp = cuelloPieza(J, H, color, idb * 100 + 3, -0.1, 0.34, 0.040, 0.043, kc(o), 0.0);
      items.push({ id: 'camisaCuello', parte: 'cuello', prof: J.cuello.prof, rango: 3.15, capa: 1, pieza: cp, cubre: [], dibujar: (ctx, est) => formaPieza(ctx, cp, est || {}, { volumen: 0.5 }) });
    }
    return items;
  }

  // ---------------------------------------------------------------- abrigo (§5.6): torso con holgura + faldón que cuelga de las cadenas muslo->pierna
  function abrigo(J, H, o, spec, t) {
    const hol = spec.holgura == null ? HOL.abrigo : spec.holgura, color = colorDe(spec, '#c89a4a'), kk = kc(o), M = J.marcoCuerpo;
    const T = C.torso(J, H, { holgura: hol, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), S = T.secciones;
    const bumpT = bumpDe(J.marcos.pelvis.yaw, 0.065 * kk * H);       // A-line desde la cintura hasta la base: cubre las tapas de los muslos
    const torsoR = anillosTorso(S, H).map((rg, i) => i < 6 ? rg : a => { const p = rg(a), v = bumpT(a), f = (i - 6) / 5; return [p[0] + v[0] * f, p[1], p[2] + v[2] * f]; }), base = torsoR[torsoR.length - 1];
    const largo = (spec.largo == null ? 0.62 : spec.largo) * 0.45 * H, hD = pCad(J, 'D', largo), hI = pCad(J, 'I', largo);
    const m = [(hD[0] + hI[0]) / 2, (hD[1] + hI[1]) / 2, (hD[2] + hI[2]) / 2], dz = Math.abs(hD[2] - hI[2]) / 2;
    const ext = Math.abs(hD[0] - hI[0]) / 2 + (0.06 * kk + hol + (spec.vuelo == null ? 0.025 : spec.vuelo)) * H, del = dz + (0.055 * kk + hol + (spec.vuelo == null ? 0.025 : spec.vuelo) * 1.6) * H;
    const bajoFn = a => { const co = Math.cos(a), sn = Math.sin(a); return M.aMundo([m[0] + ext * sn, lerp(hD[1], hI[1], (sn + 1) / 2) + 0.012 * H, m[2] + del * co]); };
    const anclas = Jx => { const Mx = Jx.marcoCuerpo, r = [];
      for (const lado of ['D', 'I']) { const c = Jx['cadera' + lado], p = Mx.aMundo(pCad(Jx, lado, largo)); r.push({ raiz: [c.x, c.y], punto: [p[0], p[1] + 0.012 * H] }); }
      return r; };
    const off = offDe(desfaseBajo(t, o, J, H, anclas));
    const K = 4, skirt = anillosFaldon(base, bajoFn, off, K, bumpDe(J.marcos.pelvis.yaw, 0.03 * kk * H)), todos = torsoR.concat(skirt);
    const ct = contorno(todos, H), nTor = torsoR.length;
    // frente abierto: el recorte deja ver el jersey (pieza anterior) y las piernas
    const nz = nzFrente(J), abierto = !!spec.abierto, yg = yugos(J, H, torsoR, kk, hol);
    let path = ct.path;
    if (abierto && nz > 0.03) {
      const fa = i => lerp(0.12, 0.42, Math.min(1, i / (nTor - 1) * 1.3)), izq = [], der = [];
      todos.forEach((rg, i) => { const p = rg(aF(-fa(i))), q = rg(aF(fa(i))); der.push([p[0], p[1]]); izq.push([q[0], q[1]]); });
      const hole = G3.orientar(der.concat(izq.reverse()), false);
      path = P.union([ct.poly].concat(yg)); path.moveTo(hole[0][0], hole[0][1]); for (let i = 1; i < hole.length; i++) path.lineTo(hole[i][0], hole[i][1]); path.closePath();
    } else { path = P.union([ct.poly].concat(yg)); }
    const nominal = [2 * 0.16 * H * kk, (J.prop.columna + J.prop.pecho + 0.03) * H + largo], poly = ct.poly;
    const pz = { path, caja: path._caja, campo: campoDe(ct, o.luz), marco: marcoCaja(poly, [-ct.u[0], -ct.u[1]]), nominal, prof: T.prof, color, semilla: 8 * 100, poly };
    // cinturón: banda en la sección de la cintura (rings torso: índice 5 = S[5] entre cintura y pecho... se toma la cintura S[4] -> torsoR[6])
    const rCin = torsoR[6];
    const cinturonPoly = spec.cinturon ? contorno([-0.009, 0.009].map(dy => a => { const p = rCin(a); return [p[0], p[1] + dy * H, p[2]]; }), H).poly : null;
    // pliegues de caída desde el cinturón al bajo (se mueven con la cadena)
    const cinPts = [rCin(-Math.PI / 2), rCin(Math.PI / 2)].sort((a, b) => a[0] - b[0]), bajoPl = ct.bajo.slice().sort((a, b) => a[0] - b[0]);
    const caida = PL.caida(cinPts, bajoPl.length > 1 ? bajoPl : [[cinPts[0][0], cinPts[0][1] + largo], [cinPts[1][0], cinPts[1][1] + largo]], 3, { H, k: nz > 0 ? 1 : 0.7 });
    // axila: tensión cuando el brazo se abre más de 0.5 rad
    const axilas = [];
    for (const lado of ['D', 'I']) {
      const s = lado === 'I' ? 1 : -1, v = G3.unit(G3.res(J['codo' + lado].p, J['hombro' + lado].p)), beta = Math.asin(clamp(s * v[0], -1, 1)), k = sm(beta, 0.5, 0.8);
      if (k > 0) { const h = J['hombro' + lado], c = G3.lerp3(pos(J.cintura), pos(J.hombros), 0.55); axilas.push(...PL.tension([h.x, h.y + 0.03 * H], [c[0], c[1]], 2, { H, k })); }
    }
    const solapa = spec.cuello === 'solapa', alto = spec.cuello === 'alto', botones = spec.botones == null ? 2 : spec.botones;
    const colCuello = alto ? cuelloPieza(J, H, color, 8 * 100 + 5, 0.0, 0.8, 0.052, 0.054, kk, 0.08) : solapa ? cuelloPieza(J, H, color, 8 * 100 + 5, -0.05, 0.42, 0.058, 0.058, kk, 0.08) : null;
    const it = { id: 'abrigo', parte: 'torso', prof: T.prof, rango: RANGO_FALDON, capa: 1, pieza: pz, cubre: ['torso'], info: { bajo: ct.bajo, poly: ct.poly, caida, offsets: off(0), anillos: todos, contorno: ct, abierto: abierto && nz > 0.03 } };
    it.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, pz, est, { volumen: 0.8, borde: 0.8, anchoBorde: 6, textura: 0.3 });
      conClip(ctx, pz.path, () => {
        if (cinturonPoly) P.forma(ctx, aPath(cinturonPoly), { color: I.oscurece(color, 0.25), volumen: 0.5, borde: 0.2, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 1 });
        trazos(ctx, caida, color); trazos(ctx, axilas, color);
        const vf = sm(nz, 0.02, 0.25);
        if (!abierto && vf > 0.01) {
          const l = lineaFrontal(todos.slice(0, nTor + 2), 0);
          linea(ctx, l, I.css(I.oscurece(color, 0.5), 0.6 * vf), 1.4);
          ctx.fillStyle = I.css(I.oscurece(color, 0.55), 0.85 * vf);
          for (let k = 0; k < botones; k++) { const p = enProf(torsoR, 3.0 + k * 1.6, 0); ctx.beginPath(); ctx.arc(p[0], p[1], 0.0055 * H, 0, 7); ctx.fill(); }
        }
        if (abierto && nz > 0.03) {           // borde del frente abierto
          const e1 = [], e2 = []; todos.forEach((rg, i) => { const f = lerp(0.12, 0.42, Math.min(1, i / (nTor - 1) * 1.3)), p = rg(aF(-f)), q = rg(aF(f)); e1.push([p[0], p[1]]); e2.push([q[0], q[1]]); });
          const c = I.css(I.oscurece(color, 0.55), 0.75 * sm(nz, 0.03, 0.2)); linea(ctx, e1, c, 1.6); linea(ctx, e2, c, 1.6);
        }
        if (solapa && nz > 0.02) {            // solapas: triángulos sobre el pecho
          for (const sg of [-1, 1]) {
            const tri = [enProf(torsoR, 0.0, aF(sg * 0.2)), enProf(torsoR, 1.0, aF(sg * 0.62)), enProf(torsoR, 4.2, aF(sg * 0.2 + (abierto ? sg * 0.16 : 0))), enProf(torsoR, 2.2, aF(sg * 0.14))].map(p => [p[0], p[1]]);
            P.forma(ctx, aPath(G3.orientar(tri, true)), { color: I.oscurece(color, 0.1), volumen: 0.5, borde: 0.3, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 6 + (sg > 0 ? 1 : 0) });
          }
        }
      });
      if (colCuello) formaPieza(ctx, colCuello, est, { volumen: 0.6, borde: 0.5 });
    };
    return [it];
  }

  // ---------------------------------------------------------------- falda (§5.6): sección cónica desde la cintura; `vuelo` abre el bajo
  function falda(J, H, o, spec, t) {
    const hol = HOL.falda, color = colorDe(spec, '#7a3b3b'), kk = kc(o), M = J.marcoCuerpo, vuelo = spec.vuelo == null ? 0.08 : spec.vuelo, largo = (spec.largo == null ? 0.30 : spec.largo) * H;
    const T = C.torso(J, H, { holgura: hol, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), S = T.secciones, sc = S[4], cin = J.cintura.p;
    const base = a => ptSec(sc, H, a), hc = [cin[0], cin[1] + largo, cin[2]], eH = sc.ext * H + vuelo * H, dH = sc.del * H + vuelo * 0.8 * H, tH = sc.det * H + vuelo * 0.8 * H;
    const bajoFn = a => { const co = Math.cos(a), sn = Math.sin(a); return M.aMundo([hc[0] + eH * sn, hc[1], hc[2] + (co >= 0 ? dH : tH) * co]); };
    const anclas = Jx => { const Mx = Jx.marcoCuerpo, c0 = Jx.cintura.p, h0 = [c0[0], c0[1] + largo, c0[2]], r = [];
      for (const lado of ['D', 'I']) { const c = Jx['cadera' + lado], p = Mx.aMundo([h0[0] + (lado === 'I' ? eH : -eH), h0[1], h0[2]]); r.push({ raiz: [c.x, c.y], punto: [p[0], p[1]] }); }
      return r; };
    const off = offDe(desfaseBajo(t, o, J, H, anclas)), skirt = anillosFaldon(base, bajoFn, off, 4, bumpDe(J.marcos.pelvis.yaw, 0.03 * kk * H)), anillos = [base].concat(skirt);
    const ct = contorno(anillos, H), nz = nzFrente(J);
    const nominal = [2 * (sc.ext + vuelo) * H, largo + 0.03 * H], path = P.union([ct.poly]);
    const pz = { path, caja: path._caja, campo: campoDe(ct, o.luz), marco: marcoCaja(ct.poly, [-ct.u[0], -ct.u[1]]), nominal, prof: T.prof, color, semilla: 9 * 100, poly: ct.poly };
    const cinPts = [base(-Math.PI / 2), base(Math.PI / 2)].sort((a, b) => a[0] - b[0]), bajoPl = ct.bajo.slice().sort((a, b) => a[0] - b[0]);
    const caida = PL.caida(cinPts, bajoPl.length > 1 ? bajoPl : [[cinPts[0][0], cinPts[0][1] + largo], [cinPts[1][0], cinPts[1][1] + largo]], 4, { H });
    const banda = contorno([a => { const p = ptSec(sc, H, a); return [p[0], p[1] - 0.012 * H, p[2]]; }, a => { const p = ptSec(sc, H, a); return [p[0], p[1] + 0.014 * H, p[2]]; }], H);
    const it = { id: 'falda', parte: 'falda', prof: T.prof, rango: RANGO_FALDON + 0.05, capa: 1, pieza: pz, cubre: [], info: { bajo: ct.bajo, caida, offsets: off(0), contorno: ct } };
    it.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, pz, est, { volumen: 0.75, borde: 0.6, textura: 0.3 });
      conClip(ctx, pz.path, () => { trazos(ctx, caida, color); P.forma(ctx, banda.path, { color: I.oscurece(color, 0.15), volumen: 0.5, borde: 0.2, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 1 }); });
    };
    return [it];
  }

  // ---------------------------------------------------------------- delantal: peto y falda corta sobre la superficie delantera (solo si el frente mira a cámara)
  function delantal(J, H, o, spec, t) {
    const hol = HOL.delantal, color = colorDe(spec, '#e8e2d6'), kk = kc(o), M = J.marcoCuerpo, largo = (spec.largo == null ? 0.30 : spec.largo) * H;
    const T = C.torso(J, H, { holgura: hol, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), S = T.secciones, nz = nzFrente(J);
    const torsoR = anillosTorso(S, H).slice(4), base = torsoR[torsoR.length - 1], cin = J.cintura.p, sc = S[2];
    const hc = [cin[0], cin[1] + largo, cin[2]], eH = sc.ext * H + 0.05 * H, dH = sc.del * H + 0.035 * H;
    const bajoFn = a => { const co = Math.cos(a), sn = Math.sin(a); return M.aMundo([hc[0] + eH * sn, hc[1], hc[2] + dH * Math.max(co, 0.2)]); };
    const anclas = Jx => { const Mx = Jx.marcoCuerpo, c0 = Jx.cintura.p, r = [];
      for (const lado of ['D', 'I']) { const c = Jx['cadera' + lado], p = Mx.aMundo([c0[0] + (lado === 'I' ? eH : -eH), c0[1] + largo, c0[2]]); r.push({ raiz: [c.x, c.y], punto: [p[0], p[1]] }); }
      return r; };
    const off = offDe(desfaseBajo(t, o, J, H, anclas)), anillos = torsoR.concat(anillosFaldon(base, bajoFn, off, 3));
    const nA = anillos.length, fw = i => lerp(0.46, 0.66, Math.min(1, i / (torsoR.length - 1)));
    const items = [];
    if (nz < 0.02) return items;
    const izq = [], der = [];
    anillos.forEach((rg, i) => { const p = rg(aF(-fw(i))), q = rg(aF(fw(i))); der.push([p[0], p[1]]); izq.push([q[0], q[1]]); });
    const poly = G3.orientar(suaveSub(limpiar(der.concat(izq.reverse())), 3), true), path = aPath(poly);
    const pz = { path, caja: path._caja, campo: null, marco: marcoCaja(poly, [0, 1]), nominal: [2 * 0.66 * 0.1 * H * kk, largo + 0.12 * H], prof: T.prof + 1, color, semilla: 10 * 100, poly };
    const tirantes = [-1, 1].map(sg => [anillos[0](aF(sg * fw(0))), anillos[0](aF(sg * 0.9))].map(p => [p[0], p[1]]));
    const it = { id: 'delantal', parte: 'delantal', prof: T.prof, rango: RANGO_FALDON + 0.08, capa: 1, pieza: pz, cubre: [], info: { poly } };
    it.dibujar = (ctx, est) => {
      est = est || {}; ctx.save(); ctx.globalAlpha *= sm(nz, 0.02, 0.12);
      for (const tr of tirantes) linea(ctx, tr, I.css(I.oscurece(color, 0.25), 0.9), 0.012 * H);
      formaPieza(ctx, pz, est, { volumen: 0.5, borde: 0.4, textura: 0.25 });
      conClip(ctx, pz.path, () => {
        const cinP = [anillos[2](aF(-fw(2))), anillos[2](aF(fw(2)))];
        linea(ctx, cinP.map(p => [p[0], p[1]]), I.css(I.oscurece(color, 0.5), 0.5), 1.3);          // cinta de la cintura
        const bol = [enProf(anillos, torsoR.length + 0.4, aF(0.42)), enProf(anillos, torsoR.length + 1.6, aF(0.4)), enProf(anillos, torsoR.length + 1.6, aF(-0.4)), enProf(anillos, torsoR.length + 0.4, aF(-0.42))].map(p => [p[0], p[1]]);
        linea(ctx, bol, I.css(I.oscurece(color, 0.5), 0.55), 1.3);                                    // bolsillo
      });
      ctx.restore();
    };
    items.push(it); return items;
  }

  // ---------------------------------------------------------------- bufanda: vuelta (anillo del cuello con holgura) + cola (dinamica.cadena)
  function bufanda(J, H, o, spec, t) {
    const color = colorDe(spec, '#b23a3a'), kk = kc(o), items = [], ptorso = (J.pelvis.prof + J.hombros.prof) / 2;
    const vuelta = cuelloPieza(J, H, color, 11 * 100, 0.0, 0.7, 0.056, 0.058, kk, 0);
    const itV = { id: 'bufandaVuelta', parte: 'cuello', prof: J.cuello.prof, rango: 3.5, capa: 2, pieza: vuelta, cubre: [] };
    itV.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, vuelta, est, { volumen: 0.75, borde: 0.8, textura: 0.4 });
      conClip(ctx, vuelta.path, () => {                    // pliegues de lana: arcos del anillo
        const ej = ejesCuello(J);
        for (let i = 0; i < 3; i++) {
          const pts = [], f = 0.12 + i * 0.22;
          for (let j = 0; j <= 10; j++) { const a = Math.PI * (j / 10 - 0.5), c = G3.sum(ej.A, G3.esc(ej.v, ej.L * f)), q = G3.sum(c, G3.sum(G3.esc(ej.r, Math.cos(a) * 0.058 * H * kk), G3.esc(ej.e, Math.sin(a) * 0.056 * H * kk))); pts.push([q[0], q[1]]); }
          linea(ctx, pts, I.css(I.oscurece(color, 0.35), 0.5), 0.003 * H);
        }
      });
    };
    items.push(itV);
    // cola: cuelga por delante del pecho, de un punto del frente (lado D); ancla en el marco del pecho, en reposo en la dirección del torso
    const lat = (spec.lado === 'I' ? 1 : -1) * 0.022 * H, largoCola = (spec.largoCola == null ? 0.27 : spec.largoCola) * H, n = 5;
    const anclaDe = Jx => { const c = Jx.cuello, v = Jx.marcos.pecho.dirAMundo([lat, 0.03 * H, 0.062 * H * kk]), cin = Jx.cintura;
      return { p: [c.x + v[0], c.y + v[1]], prof: c.prof + v[2], ang: Math.atan2(cin.x - c.x, cin.y - c.y) }; };
    const a0 = anclaDe(J), cond = tp => { const a = anclaDe(o.historial ? D.memo('ropa:' + (o.id || 'a'), o.historial)(tp) : J); return { p: a.p, ang: a.ang }; };
    const ch = D.cadena(o.historial && t != null ? t : 0, cond, n, { largoSeg: largoCola / n, frec: o.frecCola || 1.8, amort: 0.3, gravedad: 0.3, viento: o.viento });
    const cinta = G3.orientar(P.cinta(ch, 0.05 * H * kk, 0.042 * H * kk), true), path = aPath(cinta), idx = 3;
    const pzC = { path, caja: path._caja, campo: null, marco: marcoCaja(cinta, [0, 1]), nominal: [0.05 * H * kk, largoCola], prof: a0.prof, color: I.oscurece(color, 0.15), semilla: 11 * 100 + idx, poly: cinta };
    const delante = a0.prof >= ptorso, fin = ch[n], pre = ch[n - 1];
    const itC = { id: 'bufandaCola', parte: 'bufanda', prof: a0.prof, rango: delante ? 3.6 : 1.9, capa: delante ? 2 : 0, pieza: pzC, cubre: [], info: { cadena: ch, delante } };
    itC.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, pzC, est, { volumen: 0.6, borde: 0.6, textura: 0.35 });
      const dx = fin[0] - pre[0], dy = fin[1] - pre[1], l = Math.hypot(dx, dy) || 1, px = -dy / l, py = dx / l;
      for (let i = -2; i <= 2; i++) linea(ctx, [[fin[0] + px * i * 0.007 * H, fin[1] + py * i * 0.007 * H], [fin[0] + px * i * 0.008 * H + dx / l * 0.016 * H, fin[1] + py * i * 0.008 * H + dy / l * 0.016 * H]], I.css(I.oscurece(color, 0.2)), 0.004 * H);
      conClip(ctx, pzC.path, () => { for (let i = 1; i < n; i += 2) linea(ctx, [[ch[i][0] - 0.02 * H, ch[i][1]], [ch[i][0] + 0.02 * H, ch[i][1] + 0.004 * H]], I.css(I.oscurece(color, 0.35), 0.45), 0.003 * H); });
    };
    items.push(itC);
    return items;
  }

  // ---------------------------------------------------------------- prendas y conjunto
  // Ropa.prenda(spec, J, H, o) -> [item] de una sola prenda (sin reglas de capas entre prendas)
  R.prenda = function (spec, J, H, o = {}) {
    const t = o.t;
    switch (spec.tipo) {
      case 'abrigo': return abrigo(J, H, o, spec, t).concat(['D', 'I'].flatMap(l => R.manga(J, l, H, Object.assign({}, o, { material: 'abrigo', color: spec.color }))));
      case 'jersey': return torsoSimple(J, H, o, spec, 'jersey').concat(['D', 'I'].flatMap(l => R.manga(J, l, H, Object.assign({}, o, { material: 'jersey', color: spec.color || '#8a6a52' }))));
      case 'camisa': return torsoSimple(J, H, o, spec, 'camisa').concat(['D', 'I'].flatMap(l => R.manga(J, l, H, Object.assign({}, o, { material: 'camisa', color: spec.color || '#d9d2c3' }))));
      case 'pantalon': { const piernas = ['D', 'I'].flatMap(l => R.pernera(J, l, H, Object.assign({}, o, { color: spec.color }))); return piernas.concat(caderaPantalon(J, H, o, spec, piernas)); }
      case 'falda': return falda(J, H, o, spec, t);
      case 'delantal': return delantal(J, H, o, spec, t);
      case 'bufanda': return bufanda(J, H, o, spec, t);
    }
    throw new Error('Ropa.prenda: tipo desconocido "' + spec.tipo + '"');
  };
  // Reglas de capas entre prendas: la prenda de torso superior tapa las de debajo salvo si el abrigo está abierto; solo la prenda más externa con mangas
  // dibuja mangas; el cuello alto del jersey y el cuello de la camisa siguen asomando.
  R.piezas = function (J, H, prendas, o = {}) {
    const por = {}; for (const p of prendas) por[p.tipo] = p;
    const ab = por.abrigo, je = por.jersey, ca = por.camisa, out = [];
    const mangas = ab ? 'abrigo' : je ? 'jersey' : ca ? 'camisa' : null;
    const torsoVisible = { abrigo: !!ab, jersey: !!je && (!ab || !!ab.abierto), camisa: !!ca && (!je && (!ab || !!ab.abierto)) };
    for (const p of prendas) {
      const items = R.prenda(p, J, H, o);
      for (const it of items) {
        const esManga = /^manga/.test(it.id), esTorso = it.id === p.tipo && (p.tipo === 'jersey' || p.tipo === 'camisa');
        if (esManga && p.tipo !== mangas) continue;
        if (esTorso && !torsoVisible[p.tipo]) continue;
        if (/Cuello$/.test(it.id) && p.tipo === 'camisa' && je && je.cuello === 'alto') continue;
        out.push(it);
      }
    }
    return out;
  };
  const capaCuerpo = (it, J, ptorso) => {
    const p = it.parte;
    if (/^(brazo|mano)/.test(p)) return J['hombro' + p.slice(-1)].prof >= ptorso ? 2 : 0;
    if (p === 'cabeza') return 2;
    return it.capa == null ? 0 : it.capa;
  };
  R.ordenar = function (items, J, H) {
    const ptorso = (J.pelvis.prof + J.hombros.prof) / 2, caps = [[], [], []];
    for (const it of items) { const c = it.capa == null ? capaCuerpo(it, J, ptorso) : it.capa; caps[c].push(it); }
    return [].concat(C.ordenar(caps[0], H), C.ordenar(caps[1], H), C.ordenar(caps[2], H));
  };
  // Cuerpo + ropa. o.zapatos:{modelo,color}; o.extra: items (cabeza, manos...) con {id, parte, prof, rango, dibujar}
  R.cuerpoVestido = function (J, H, prendas, o = {}) {
    const cuerpo = C.piezas(J, H, { complexion: o.complexion, perfil: o.perfil, zapatos: o.zapatos === null ? null : (o.zapatos || { modelo: 'zapato' }), luz: o.luz });
    const ropa = R.piezas(J, H, prendas, o), cubiertas = {};
    for (const it of ropa) for (const c of it.cubre || []) cubiertas[c] = true;
    const resto = cuerpo.filter(q => !cubiertas[q.parte]);
    return R.ordenar(resto.concat(ropa, o.extra || []), J, H);
  };
  // Dibuja un item: de ropa (it.dibujar), zapato desnudo o parte del cuerpo con piel.
  // est = {luz, piel, colorZapato, colorSuela, estilo}
  R.dibujar = function (ctx, it, est = {}) {
    if (it.dibujar) return it.dibujar(ctx, est);
    const pz = it.pieza; if (!pz || !pz.path) return;
    if (/^zapato/.test(it.parte)) return C.dibujarZapato(ctx, pz, Object.assign({ color: est.colorZapato || '#2a2524', colorSuela: est.colorSuela, luz: est.luz, semilla: 41, volumen: 0.6, borde: 0.4 }, est.estilo || null));
    P.forma(ctx, pz.path, Object.assign({ color: est.piel || '#e6b48f', campo: pz.campo, marco: pz.marco, nominal: pz.nominal, semilla: 31, volumen: 0.6, borde: 0.4, textura: 0.1, irregular: 0, luz: est.luz }, est.estilo || null));
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== cabeza25.js ===== */
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

/* ===== pelo.js ===== */
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

/* ===== personaje2.js ===== */
/* Ilustra — Personaje2 (Fase 2, WP7, ESPECIFICACION_F2 §5.6, §6.5 y §3.3): el personaje completo que ensambla rig 2.5D, cuerpo, ropa, mano, cabeza, pelo y dinámica.
   Todo se calcula desde el estado de cada cuadro; sin azar y sin estado visible (las cachés internas solo aceleran).

   API
     new Ilustra.Personaje2({ ...opciones de Personaje (F1)..., ropa:[...], zapatos:{modelo,color}, peinado, complexion, ojos:{estilo,color}, proporciones, preset:'lia'|'teo'|'nina'|'abuela' })
     p.dibujar(ctx, t, estado) -> J25            dibuja todas sus piezas (uso suelto, como F1; también lo usa Escena.draw para actores F1/F2)
     p.piezas(t, estado) -> [{id, parte, prof, orden, base, dibujar(ctx)}]   piezas en el orden del actor (de lejos a cerca); `base` = prof del actor.
                                                  Para mezclar varios actores (WP8): ordenar por (base, orden) o, si hay interacción, por prof.
     p.resolver(t, estado) -> J25                solo el rig (lo usan dinamica e interaccion)
     p.marcoCabezaEn(t) -> marco G3               necesita estado._estadoEn (= (t')=>actor.estado(t')); es el conductor del muelle del pelo
     p.anclas(t, estado) -> {manoD, manoI, palmaD, ..., coronilla, boca, pecho.delante, ...}   anclas de §7.1 (aproximadas en espalda/pecho)
   estado = {x, y, dir, pose, expresion, mirada, viento, vista, luz, paraguas, sombraSuelo, respiracion, manoOculta}   (F1)
            + {yaw, prof, manos:{D:'asa', I:'relajada'}, giroCabeza, parpadeo, parpado, mejillas, xPose, _estadoEn}
   Sin yaw: yaw = dir·YAW_PERFIL (1.25); vista:'espalda' equivale a yaw = π.

   Notas de integración
     - Escena.draw (WP8) DEBE llamar a Ilustra.dinamica.vaciarCache() al empezar cada cuadro (la caché de muestras es solo una aceleración, pero está limitada a 512
       entradas y se llenaría con los 72 pasos de cada actor).
     - Este módulo conecta el pelo con la cabeza asignando Cabeza25.ganchoPelo (adaptador de firmas: Cabeza25 llama (ctx, capa, M, opcPelo, {silueta, forma, R}) y
       Pelo.dibujar espera (ctx, marco, {capa, ...})). Ni cabeza25.js ni pelo.js se tocan. */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3, P = I.Pincel, C = I.Cuerpo, R = I.Ropa, D = I.dinamica, CA = I.Cabeza25;
  const PI = Math.PI, clamp = I.clamp;

  // ---------------------------------------------------------------- constantes globales (cabo 2)
  if (I.MODO === undefined) I.MODO = 'vector';           // 'vector' (F1, por defecto) | 'pintado' (lo define pintura.js; esto solo cubre una carga sin ese módulo)
  if (I.YAW_PERFIL === undefined) I.YAW_PERFIL = 1.25;   // §3.3: yaw = dir · YAW_PERFIL (≈72°)

  // ---------------------------------------------------------------- adaptador cabeza <-> pelo (cabo 1)
  // opc = opciones de pelo del estado de la cabeza ({peinado, color, t, historial, id, luz, semilla, viento, ...}); ex = {silueta, forma, R}.
  CA.ganchoPelo = function (ctx, capa, M, opc, ex) {
    I.Pelo.dibujar(ctx, M, Object.assign({ k: ex && ex.forma && ex.forma.k }, opc, { capa }));
  };

  // ---------------------------------------------------------------- presets (colores de §4.7)
  I.PRESETS2 = {
    lia: { nombre: 'Lía', proporciones: 'adulto', complexion: 'delgada', semilla: 11, piel: '#eab48c', pelo: '#1e1816', peinado: 'melena', ojos: { estilo: 'puntos', color: '#3a2a20' },
      ropa: [{ tipo: 'abrigo', color: '#d8c7a4', largo: 0.62, cuello: 'solapa', cinturon: true, botones: 2 }, { tipo: 'jersey', color: '#8a93a3' }, { tipo: 'bufanda', color: '#b23a3a' }, { tipo: 'pantalon', color: '#23262f' }],
      zapatos: { modelo: 'botin', color: '#2b2422' } },
    teo: { nombre: 'Teo', proporciones: 'estilizado', complexion: 'delgada', semilla: 23, piel: '#d9a37e', pelo: '#1b1514', peinado: 'encrespado', ojos: { estilo: 'puntos', color: '#2a2018' },
      ropa: [{ tipo: 'abrigo', color: '#2c303a', largo: 0.8, cuello: 'solapa', cinturon: false, botones: 3 }, { tipo: 'jersey', color: '#6b7380' }, { tipo: 'pantalon', color: '#23262f' }],
      zapatos: { modelo: 'bota', color: '#1e1816' } },
    nina: { nombre: 'Niña', proporciones: 'nino', complexion: 'media', semilla: 37, piel: '#f0bf9c', pelo: '#1f1816', peinado: 'coletas', ojos: { estilo: 'puntos', color: '#3a2a20' },
      ropa: [{ tipo: 'abrigo', color: '#c9573f', largo: 0.4, cuello: null, cinturon: false, botones: 3 }, { tipo: 'pantalon', color: '#2e3a55' }],
      zapatos: { modelo: 'zapatilla', color: '#d6d0c4' } },
    abuela: { nombre: 'Abuela', proporciones: 'anciano', complexion: 'media', semilla: 41, piel: '#dba98a', pelo: '#b9b4ac', peinado: 'mono', ojos: { estilo: 'puntos', color: '#4a3a30' },
      ropa: [{ tipo: 'abrigo', color: '#6d4f5e', largo: 0.7, cuello: 'solapa', cinturon: true, botones: 2 }, { tipo: 'bufanda', color: '#8c9a7a' }, { tipo: 'pantalon', color: '#3a3844' }],
      zapatos: { modelo: 'zapato', color: '#2a2524' } }
  };

  // ---------------------------------------------------------------- utilidades
  const FORMAS_CABEZA = { adulto: 1, nino: 1, anciano: 1, estilizado: 1 };
  const PERFILES = { adulto: 'adulto', nino: 'nino', anciano: 'anciano', estilizado: 'adulto' };
  let contador = 0;
  function yawDe(e) { return e.yaw != null ? e.yaw : e.vista === 'espalda' ? PI : (e.dir == null ? 1 : e.dir) * I.YAW_PERFIL; }
  function rotEje(v, k, a) {                                                  // Rodrigues; k unitario
    const c = Math.cos(a), s = Math.sin(a), d = G3.punto(k, v) * (1 - c), q = G3.cruz(k, v);
    return [v[0] * c + q[0] * s + k[0] * d, v[1] * c + q[1] * s + k[1] * d, v[2] * c + q[2] * s + k[2] * d];
  }
  // si falta `ropa`, se traduce de abrigo / camisa / bufanda / pantalon de F1
  function traducirRopa(b) {
    const l = [], ab = b.abrigo;
    if (ab) l.push({ tipo: 'abrigo', color: ab.color, largo: ab.largo == null ? 0.62 : ab.largo, cuello: ab.cuello === true ? 'solapa' : (ab.cuello || null), cinturon: ab.cinturon !== false, botones: ab.botones == null ? 2 : ab.botones, abierto: !!ab.abierto });
    if (b.camisa) l.push({ tipo: 'camisa', color: b.camisa });
    if (b.bufanda) l.push({ tipo: 'bufanda', color: b.bufanda.color || b.bufanda });
    if (b.pantalon) l.push({ tipo: 'pantalon', color: b.pantalon });
    return l;
  }

  // ---------------------------------------------------------------- constructor
  I.Personaje2 = function (o = {}) {
    const pre = o.preset ? I.PRESETS2[o.preset] : null;
    if (o.preset && !pre) throw new Error('Personaje2: preset desconocido "' + o.preset + '"');
    const b = this.o = Object.assign({
      nombre: 'Personaje', tipo: 'adulto', altura: 420, semilla: 11, piel: '#e6b48f', pelo: '#1e1816', peinado: 'melena', ojos: { estilo: 'puntos', color: '#3b2a22' },
      abrigo: { color: '#c89a4a', largo: 0.62, cuello: true }, bufanda: { color: '#3f6f73' }, pantalon: '#23262f', zapatos: '#2a2524', camisa: null
    }, pre, o);
    this.id = 'p2_' + (contador++);
    this.nombrePro = b.proporciones || b.tipo || 'adulto';
    if (!I.PROPORCIONES[this.nombrePro]) throw new Error('Personaje2: proporciones desconocidas "' + this.nombrePro + '"');
    this.rig = new I.Rig25(I.PROPORCIONES[this.nombrePro], b.altura);
    this.perfil = PERFILES[this.nombrePro] || 'adulto';
    this.forma = b.forma || (FORMAS_CABEZA[this.nombrePro] ? this.nombrePro : 'adulto');
    this.complexion = b.complexion || (this.nombrePro === 'estilizado' ? 'delgada' : 'media');
    this.prendas = b.ropa || traducirRopa(b);
    const z = b.zapatos; this.zapatos = typeof z === 'string' ? { modelo: 'zapato', color: z } : Object.assign({ modelo: 'zapato', color: '#2a2524' }, z);
    const oj = b.ojos; this.ojos = typeof oj === 'string' ? { estilo: 'puntos', color: oj } : Object.assign({ estilo: 'puntos', color: '#3b2a22' }, oj);
    this._eEn = null; this._hc = new Map(); this._hcT = null; this._mc = new Map();
    // funciones conductor ESTABLES por actor (dinamica.memo las usa como clave de caché)
    this._histJ = tp => this._J(tp);
    this._histMarco = tp => {                                              // marco de la cabeza con escala = R, para que Pelo.aMundo dé píxeles
      let m = this._mc.get(tp); if (m) return m;
      const mc = this._J(tp).marcos.cabeza; m = G3.marco({ o: mc.o, yaw: mc.yaw, pitch: mc.pitch, roll: mc.roll, escala: this._R() });
      if (this._mc.size > 400) this._mc.clear();
      this._mc.set(tp, m); return m;
    };
  };
  const Pr = I.Personaje2.prototype;

  Pr._R = function () { const p = this.rig.p; return 0.5 * p.cabeza * p.escalaCabeza * this.o.altura; };

  // J25 en el pasado (conductor de la dinámica): estado(t') -> resolver. Caché por cuadro; solo acelera.
  Pr._J = function (tp) {
    let J = this._hc.get(tp); if (J) return J;
    if (!this._eEn) throw new Error('Personaje2: el estado necesita _estadoEn para la dinámica');
    J = this.resolver(tp, this._eEn(tp));
    if (this._hc.size > 400) this._hc.clear();
    this._hc.set(tp, J); return J;
  };

  // ---------------------------------------------------------------- rig
  Pr.resolver = function (t, e) {
    e = e || {}; const o = this.o;
    const yaw = yawDe(e), dir = e.dir == null ? 1 : e.dir;
    const resp = I.ciclos.respirar(t + o.semilla, { amp: 0.01 });
    let pose = I.sumarPoses(e.pose || I.POSES.dePie, resp, e.respiracion == null ? 1 : e.respiracion);
    if (e.giroCabeza != null) pose = Object.assign({}, pose, { giroCabeza: e.giroCabeza });
    return this.rig.resolver({ x: e.x, y: e.y, prof: e.prof || 0, yaw, pose, xPose: e.xPose == null ? e.x : e.xPose, dir });
  };
  Pr.marcoCabezaEn = function (tp) { return this._J(tp).marcos.cabeza; };

  // viento: número 0..1 de F1 -> aceleración (px/s²) que sopla hacia atrás respecto de hacia dónde mira; o función (t)->[ax,ay]
  function vientoDe(e, yaw, sem) {
    const v = e.viento;
    if (typeof v === 'function') return v;
    if (!v) return null;
    const sg = e.dir != null ? e.dir : clamp(Math.sin(yaw) * 2, -1, 1);
    return s => [-sg * v * 1500 * (1 + 0.35 * I.ruido1(s * 1.3, sem)), 0];
  }

  // ---------------------------------------------------------------- anclas (§7.1)
  Pr.anclas = function (t, e) {
    e = e || {}; const J = this.resolver(t, e), H = this.o.altura, a = {};
    const L = 0.105 * H * (J.prop.mano / 0.06), pun = j => [j.x, j.y, j.prof];
    for (const l of ['D', 'I']) {
      const mo = this._opcMano(J, l, e, L, null), an = I.Mano.dibujar(null, Object.assign(mo, { solo: true }));
      a['mano' + l] = an.agarre; a['palma' + l] = an.palma; a['indice' + l] = an.indice; a['hombro' + l] = pun(J['hombro' + l]); a['codo' + l] = pun(J['codo' + l]);
    }
    const R_ = this._R(), mc = J.marcos.cabeza, ce = pun(J.cabeza);
    a.cabeza = ce; a.coronilla = mc.aMundo ? G3.sum(ce, mc.dirAMundo([0, -1.12 * R_, 0])) : ce; a.boca = G3.sum(ce, mc.dirAMundo([0, 0.62 * R_, 0.95 * R_]));
    const pe = J.marcos.pecho, ce2 = pun(J.hombros), fw = d => G3.sum(ce2, pe.dirAMundo(d));
    a['pecho.delante'] = fw([0, 0.04 * H, 0.06 * H]);
    a['espalda.alta.D'] = fw([-0.05 * H, 0.03 * H, -0.05 * H]); a['espalda.alta.I'] = fw([0.05 * H, 0.03 * H, -0.05 * H]);
    const ci = pun(J.cintura), cf = d => G3.sum(ci, J.marcos.pecho.dirAMundo(d));
    a['cintura.espalda.D'] = cf([-0.04 * H, 0, -0.045 * H]); a['cintura.espalda.I'] = cf([0.04 * H, 0, -0.045 * H]);
    return a;
  };

  // opciones de Mano.dibujar para el lado l: muñeca, eje del antebrazo+mano, dorso hacia fuera del cuerpo girado por giroMano
  Pr._opcMano = function (J, l, e, L, ctxLuz) {
    const s = l === 'I' ? 1 : -1, m = J['mano' + l], eje = J.ejes['mano' + l];
    let dorso = J.marcos.pecho.dirAMundo([s, 0, 0]);
    const gm = J['giroMano' + l] || 0; if (gm) dorso = rotEje(dorso, G3.unit(eje), gm * s);
    const g = (e.manos && e.manos[l]) || (l === 'D' && e.paraguas ? 'asa' : 'relajada');
    return { muneca: [m.x, m.y, m.prof], eje, dorso, lado: l, largo: L, agarre: g, piel: this.o.piel, semilla: this.o.semilla * 7 + (l === 'D' ? 1 : 2), luz: ctxLuz };
  };

  // ---------------------------------------------------------------- ensamblado: lista ordenada de piezas
  Pr._armar = function (t, e) {
    e = e || {}; const o = this.o, H = o.altura;
    if (this._eEn !== (e._estadoEn || null)) { this._hc.clear(); this._mc.clear(); }   // la caché de J(t') vale mientras estado(t') sea la misma función pura
    this._eEn = e._estadoEn || null;
    const J = this.resolver(t, e), yaw = J.yaw, luz = e.luz || I.luzActual || I.LUZ_DEFECTO, Rr = this._R();
    const viento = vientoDe(e, yaw, o.semilla + 5), din = this._eEn ? this._histJ : undefined;
    const ex = typeof e.expresion === 'string' || !e.expresion ? (I.EXPRESIONES[e.expresion || 'neutra'] || I.EXPRESIONES.neutra) : e.expresion;
    const extra = [];
    // --- cabeza (+ pelo) como pieza del orden global
    extra.push({ id: 'cabeza', parte: 'cabeza', prof: J.cabeza.prof, rango: C.RANGO.cabeza, capa: 2, dibujar: (ctx, est) => {
      const pelo = o.peinado === false ? false : { peinado: o.peinado, color: o.pelo, t, historial: din ? this._histMarco : undefined, id: this.id + '#pelo', luz, semilla: o.semilla, viento };
      CA.dibujar(ctx, J.marcos.cabeza, { R: Rr, forma: this.forma, piel: o.piel, ojos: this.ojos, expresion: e.expresion || 'neutra', mirada: e.mirada, parpadeo: e.parpadeo == null ? I.ciclos.parpadeo(t, o.semilla) : e.parpadeo,
        parpado: e.parpado, mejillas: e.mejillas, nariz: o.nariz, luz, pelo });
    } });
    // --- manos (y paraguas)
    const L = 0.105 * H * (J.prop.mano / 0.06), paraguas = e.paraguas;
    for (const l of ['D', 'I']) {
      if (e.manoOculta === true || e.manoOculta === l) continue;
      const mo = this._opcMano(J, l, e, L, luz), m = J['mano' + l], eje = G3.unit(J.ejes['mano' + l]);
      const prof = m.prof + eje[2] * 0.23 * L;                              // palma = muñeca + 0.23·L a lo largo del eje (Mano)
      if (l === 'D' && paraguas) {
        mo.radio = 0.011 * H;
        const an = I.Mano.dibujar(null, Object.assign({}, mo, { solo: true })), dirP = e.dir == null ? (Math.sin(yaw) >= 0 ? 1 : -1) : e.dir;
        const inc = (paraguas.inclinacion == null ? -0.12 : paraguas.inclinacion) * dirP + I.ruido1(t * 0.9, 5) * 0.03 * (0.5 + (e.viento || 0));
        const largo = H * (paraguas.largo || 0.5), sn = Math.sin(inc), cs = Math.cos(inc), top = [an.agarre[0] + sn * largo, an.agarre[1] - cs * largo];
        mo.objetos = [{ prof: 'agarre', dibujar: ctx => {
          ctx.strokeStyle = I.css('#2b2a2e'); ctx.lineWidth = H * 0.007; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(an.agarre[0] - sn * H * 0.04, an.agarre[1] + cs * H * 0.04); ctx.lineTo(top[0], top[1]); ctx.stroke();
          ctx.lineWidth = H * 0.012; ctx.strokeStyle = I.css('#4a3428'); ctx.beginPath(); ctx.arc(an.agarre[0] - sn * H * 0.04 - dirP * H * 0.015, an.agarre[1] + cs * H * 0.04, H * 0.015, 0, PI); ctx.stroke();
        } }];
        extra.push({ id: 'paraguasCopa', parte: 'paraguas', prof: 1e5, rango: 99, capa: 2, dibujar: ctx => I.props.paraguas(ctx, top[0], top[1], { radio: H * (paraguas.radio || 0.36), angulo: inc, color: paraguas.color || '#2f3c4a', t, semilla: o.semilla + 90, viento: e.viento || 0 }) });
      }
      extra.push({ id: 'mano' + l, parte: 'mano' + l, prof, rango: C.RANGO.mano, dibujar: ctx => { ctx.save(); I.Mano.dibujar(ctx, mo); ctx.restore(); } });
    }
    // --- cuerpo vestido (orden por capas de WP6b, con la cabeza y las manos dentro)
    const orden = R.cuerpoVestido(J, H, this.prendas, { luz, complexion: this.complexion, perfil: this.perfil, zapatos: { modelo: this.zapatos.modelo }, t, historial: din, id: this.id, viento, semilla: o.semilla, piel: o.piel, extra });
    this._cunia(orden);
    const est = { luz, piel: o.piel, colorZapato: this.zapatos.color, colorSuela: this.zapatos.colorSuela };
    const lista = orden.map((it, i) => ({ id: it.id, parte: it.parte, prof: it.prof, orden: i, base: J.pelvis.prof, dibujar: ctx => { ctx.save(); R.dibujar(ctx, it, est); ctx.restore(); } }));
    if (e.sombraSuelo !== false) lista.unshift({ id: 'sombraSuelo', parte: 'sombra', prof: -1e6, orden: -1, base: -1e6, dibujar: ctx => I.Personaje.prototype.sombraSuelo.call(this, ctx, { J, H, e }) });
    return { J, lista, luz, orden };
  };

  // cabo 4: la cadera del pantalón y la parte alta de las perneras (muslos de WP6a, más anchos que el abrigo en la cadera) asoman junto al abrigo como una cuña
  // oscura. Lo visible de verdad es solo lo que queda por debajo del bajo del abrigo: se recortan esas piezas a "dentro de la silueta del abrigo ∪ debajo de su
  // bajo" (con el frente abierto, la silueta exterior sin el hueco, para que las piernas sigan viéndose). Sin abrigo no se toca nada.
  Pr._cunia = function (orden) {
    const ab = orden.find(q => q.id === 'abrigo'); if (!ab || !ab.info || !ab.info.bajo || ab.info.bajo.length < 2) return;
    const afectados = orden.filter(q => q.id === 'caderaPantalon' || /^pernera/.test(q.id)); if (!afectados.length) return;
    const bajo = ab.info.bajo.slice().sort((p, q) => p[0] - q[0]).map(p => [p[0], p[1] - 3]), n = bajo.length;       // 3 px hacia arriba: solape sin costura
    const bajoR = [[bajo[0][0] - 3000, bajo[0][1]]].concat(bajo, [[bajo[n - 1][0] + 3000, bajo[n - 1][1]], [bajo[n - 1][0] + 3000, 1e5], [bajo[0][0] - 3000, 1e5]]);
    // Con el frente cerrado, lo que queda por encima del bajo está tapado por el abrigo: se recorta solo a "debajo del bajo". Además de ahorrar píxeles, el rectángulo de
    // recorte es mucho menor y el rasterizador descarta de golpe los trazos pintados que caen fuera de él (es la optimización de la parte alta de las perneras).
    const abierto = !!ab.info.abierto, minHem = Math.min.apply(null, bajo.map(p => p[1]));
    const lim = abierto ? P.union([ab.info.poly, bajoR]) : P.union([bajoR]);
    for (const it of afectados) {
      if (!abierto && it.id === 'caderaPantalon' && it.pieza.caja && it.pieza.caja.y1 < minHem - 4) { it.dibujar = () => {}; continue; }   // toda bajo el abrigo
      const dib = it.dibujar; it.dibujar = (ctx, est) => { ctx.save(); ctx.clip(lim, 'nonzero'); dib(ctx, est); ctx.restore(); };
    }
  };

  Pr.piezas = function (t, e) { return this._armar(t, e).lista; };

  Pr.dibujar = function (ctx, t, e) {
    const luzPrev = I.luzActual; if (e && e.luz) I.luzActual = e.luz;
    const a = this._armar(t, e);
    ctx.save();
    try { for (const p of a.lista) p.dibujar(ctx); } finally { ctx.restore(); I.luzActual = luzPrev; }
    this.ultimas = a.J;
    return a.J;
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== props.js ===== */
/* Ilustra — objetos (props). Firma: Ilustra.props.<nombre>(ctx, x, y, opciones); (x,y) = punto de apoyo inferior central
   (salvo paraguas: (x,y) = punta superior del astil). Todos usan Pincel.forma y heredan luz, textura, borde y niebla. */
(function (G) {
  'use strict';
  const I = G.Ilustra, P = I.Pincel;
  const props = I.props = {};
  props.registrar = function (nombre, fn) { props[nombre] = fn; return fn; };
  const def = (o, d) => Object.assign({ escala: 1, profundidad: 0, semilla: 1, t: 0 }, d, o);

  // ---- farola de hierro con farol cálido
  props.registrar('farola', function (ctx, x, y, o) {
    o = def(o, { alto: 620, color: '#262a33', luz: '#ffc477', encendida: true });
    const s = o.escala, h = o.alto * s, pr = o.profundidad, sm = o.semilla;
    P.forma(ctx, P.rect(x - 16 * s, y - 40 * s, 32 * s, 40 * s, 4 * s), { color: o.color, semilla: sm, profundidad: pr, borde: 0.5 });
    P.forma(ctx, P.poligono([[x - 7 * s, y - 40 * s], [x - 5 * s, y - h + 40 * s], [x + 5 * s, y - h + 40 * s], [x + 7 * s, y - 40 * s]]), { color: o.color, semilla: sm + 1, profundidad: pr, borde: 0.7, irregular: 0.5 });
    // brazo curvo
    ctx.save(); ctx.strokeStyle = I.css(I.mezcla(o.color, (I.luzActual || I.LUZ_DEFECTO).niebla, pr * 0.85)); ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - h + 60 * s); ctx.quadraticCurveTo(x, y - h - 10 * s, x + 45 * s, y - h + 10 * s); ctx.stroke(); ctx.restore();
    // farol
    const fx = x + 48 * s, fy = y - h + 22 * s;
    P.forma(ctx, P.poligono([[fx - 22 * s, fy], [fx + 22 * s, fy], [fx + 14 * s, fy + 44 * s], [fx - 14 * s, fy + 44 * s]]),
      { color: o.encendida ? o.luz : '#6b6a66', emisivo: o.encendida, semilla: sm + 2, profundidad: o.encendida ? 0 : pr, borde: 0, sombraInterna: 0, textura: 0.15 });
    P.forma(ctx, P.poligono([[fx - 28 * s, fy + 2 * s], [fx, fy - 18 * s], [fx + 28 * s, fy + 2 * s]]), { color: o.color, semilla: sm + 3, profundidad: pr, borde: 0.8 });
    P.forma(ctx, P.rect(fx - 16 * s, fy + 42 * s, 32 * s, 6 * s, 2 * s), { color: o.color, semilla: sm + 4, profundidad: pr, borde: 0.3 });
    if (o.encendida) {
      const fl = 1 + 0.03 * I.ruido1(o.t * 3, sm);
      I.halo(ctx, fx, fy + 22 * s, 520 * s, o.luz, 0.55 * fl);
      I.halo(ctx, fx, fy + 22 * s, 200 * s, o.luz, 0.9 * fl);
      I.halo(ctx, fx, fy + 22 * s, 55 * s, '#fff3dc', 1);
      if (o.cono !== false) {
        const largo = (y - fy) * 1.05, ap = 0.8;
        I.cono(ctx, fx, fy + 30 * s, Math.PI / 2, ap, largo, o.luz, 0.7);
        // lluvia iluminada dentro del cono
        ctx.save();
        const p = new Path2D(); p.moveTo(fx, fy + 30 * s);
        p.lineTo(fx + Math.cos(Math.PI / 2 - ap / 2) * largo, fy + 30 * s + Math.sin(Math.PI / 2 - ap / 2) * largo);
        p.lineTo(fx + Math.cos(Math.PI / 2 + ap / 2) * largo, fy + 30 * s + Math.sin(Math.PI / 2 + ap / 2) * largo); p.closePath();
        ctx.clip(p); ctx.globalCompositeOperation = 'screen';
        const M = ctx.getTransform(); ctx.translate(fx - 540, 0);
        I.lluvia(ctx, o.t, { densidad: 110, alfa: 0.55, color: '#ffd9a0', semilla: sm % 97 + 3, capas: 2, largo: [20, 44] });
        ctx.setTransform(M);
        // pool de luz en el suelo
        const g = ctx.createRadialGradient(fx, y, 0, fx, y, largo * 0.55);
        g.addColorStop(0, I.css(o.luz, 0.28)); g.addColorStop(1, I.css(o.luz, 0));
        ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.translate(fx, y); ctx.scale(1, 0.22); ctx.translate(-fx, -y);
        ctx.fillStyle = g; ctx.fillRect(fx - largo, y - largo, largo * 2, largo * 2); ctx.restore();
      }
    }
    return { foco: [fx, fy + 22 * s] };
  });

  // ---- paraguas abierto (x,y = punta superior)
  props.registrar('paraguas', function (ctx, x, y, o) {
    o = def(o, { radio: 150, angulo: 0, color: '#2f3c4a', viento: 0 });
    const r = o.radio, n = 7;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.angulo);
    const pts = [];
    // cúpula
    for (let i = 0; i <= 24; i++) { const a = Math.PI + i / 24 * Math.PI; const k = Math.sin(a); pts.push([Math.cos(a) * r * (1 - 0.06 * k * k), r * 0.5 + k * r * 0.58]); }
    // borde festoneado (de derecha a izquierda)
    for (let i = n; i >= 0; i--) {
      const x0 = -r + (i / n) * 2 * r; pts.push([x0, r * 0.5]);
      if (i > 0) { const xm = -r + ((i - 0.5) / n) * 2 * r; pts.push([xm, r * 0.5 - r * 0.06 + I.ruido1(o.t * 2 + i, o.semilla) * r * 0.012 * (1 + o.viento * 3)]); }
    }
    P.forma(ctx, pts, { color: o.color, semilla: o.semilla, volumen: 0.85, borde: 0.9, anchoBorde: 5, irregular: 0.8, textura: 0.3 });
    // varillas
    ctx.strokeStyle = I.css(I.oscurece(o.color, 0.4), 0.6); ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) { const x0 = -r + (i / n) * 2 * r; ctx.beginPath(); ctx.moveTo(0, -r * 0.08); ctx.quadraticCurveTo(x0 * 0.75, -r * 0.02 + Math.abs(x0) * 0.05, x0, r * 0.5); ctx.stroke(); }
    // punta
    ctx.fillStyle = I.css('#2b2a2e'); ctx.fillRect(-2.5, -r * 0.17, 5, r * 0.1);
    // brillo húmedo
    ctx.strokeStyle = I.css('#dfe7f2', 0.25); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 0.8, r * 0.5, 0, Math.PI * 1.12, Math.PI * 1.4); ctx.stroke();
    ctx.restore();
    // goteo por el borde
    ctx.save(); ctx.fillStyle = I.css('#d6dfea', 0.5);
    for (let i = 0; i < 6; i++) {
      const per = 0.8, f = ((o.t / per) + I.hash(i + o.semilla)) % 1, x0 = x + (-r + I.hash(i * 7 + o.semilla) * 2 * r) * Math.cos(o.angulo);
      const y0 = y + r * 0.5 + (x0 - x) * Math.sin(o.angulo);
      ctx.beginPath(); ctx.ellipse(x0, y0 + f * f * 260, 1.6, 4, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  });

  // ---- edificio de ciudad europea: fachada, cornisas, ventanas (algunas encendidas), planta baja
  props.registrar('edificio', function (ctx, x, y, o) {
    o = def(o, { ancho: 420, alto: 900, color: '#7c7f8a', pisos: 5, columnas: 3, encendidas: 0.35, calido: '#ffc070', tejado: 'mansarda', bajo: 'puertas', balcones: true });
    const s = o.escala, w = o.ancho * s, h = o.alto * s, pr = o.profundidad, sm = o.semilla, r = I.rng(sm * 13 + 1);
    const x0 = x - w / 2, y0 = y - h;
    P.forma(ctx, P.rect(x0, y0, w, h), { color: o.color, semilla: sm, profundidad: pr, volumen: 0.35, borde: 0.35, textura: 0.35, irregular: 1, sombraInterna: 0.15 });
    // manchas de humedad
    ctx.save(); ctx.globalAlpha = 0.18 * (1 - pr * 0.7);
    for (let i = 0; i < 5; i++) {
      const mx = x0 + r() * w, my = y0 + r() * h, mr = 30 + r() * 90;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, mr * s); g.addColorStop(0, I.css(I.oscurece(o.color, 0.35))); g.addColorStop(1, I.css(I.oscurece(o.color, 0.35), 0));
      ctx.fillStyle = g; ctx.fillRect(mx - mr * s, my - mr * s, mr * 2 * s, mr * 2 * s);
    } ctx.restore();
    // tejado mansarda
    if (o.tejado === 'mansarda') {
      const th = 110 * s;
      P.forma(ctx, P.poligono([[x0 - 8 * s, y0], [x0 + 28 * s, y0 - th], [x0 + w - 28 * s, y0 - th], [x0 + w + 8 * s, y0]]), { color: I.mezcla(o.color, '#3d4452', 0.65), semilla: sm + 1, profundidad: pr, volumen: 0.5, borde: 0.6, textura: 0.35 });
      for (let i = 0; i < o.columnas; i++) {
        const bx = x0 + (i + 0.5) * w / o.columnas;
        P.forma(ctx, P.rect(bx - 22 * s, y0 - th * 0.8, 44 * s, th * 0.62, 18 * s), { color: I.mezcla(o.color, '#d0d0cc', 0.3), semilla: sm + 2 + i, profundidad: pr, borde: 0.4 });
        const lit = r() < o.encendidas * 0.7;
        if (lit) I.ventanaLuz(ctx, bx - 14 * s, y0 - th * 0.66, 28 * s, th * 0.42, o.calido, o.t, sm + 100 + i, { intensidad: 0.4 * (1 - pr * 0.5), marco: false });
        else { ctx.fillStyle = I.css(I.mezcla('#2c3442', (I.luzActual || I.LUZ_DEFECTO).niebla, pr * 0.8)); ctx.fillRect(bx - 14 * s, y0 - th * 0.66, 28 * s, th * 0.42); }
      }
      // chimenea
      P.forma(ctx, P.rect(x0 + w * 0.72, y0 - th - 70 * s, 34 * s, 80 * s), { color: I.mezcla(o.color, '#6a4a40', 0.4), semilla: sm + 9, profundidad: pr, borde: 0.5 });
    }
    // cornisa superior
    P.forma(ctx, P.rect(x0 - 10 * s, y0, w + 20 * s, 18 * s), { color: I.aclara(o.color, 0.15), semilla: sm + 3, profundidad: pr, volumen: 0.6, borde: 0.6 });
    const bajoH = (o.bajo ? 0.2 : 0) * h;
    const pisoH = (h - bajoH - 30 * s) / o.pisos;
    for (let p = 0; p < o.pisos; p++) {
      const py = y0 + 30 * s + p * pisoH;
      // línea de imposta
      ctx.fillStyle = I.css(I.mezcla(I.oscurece(o.color, 0.25), (I.luzActual || I.LUZ_DEFECTO).niebla, pr * 0.85), 0.6); ctx.fillRect(x0, py + pisoH - 6 * s, w, 5 * s);
      for (let c = 0; c < o.columnas; c++) {
        const cx = x0 + (c + 0.5) * w / o.columnas, ww = Math.min(w / o.columnas * 0.5, 80 * s), wh = pisoH * 0.62;
        const wx = cx - ww / 2, wy = py + pisoH * 0.16;
        // dintel
        P.forma(ctx, P.rect(wx - 8 * s, wy - 12 * s, ww + 16 * s, 10 * s), { color: I.aclara(o.color, 0.12), semilla: sm + 10 + p * 7 + c, profundidad: pr, volumen: 0.4, borde: 0.4, textura: 0.1 });
        const lit = r() < o.encendidas;
        if (lit) I.ventanaLuz(ctx, wx, wy, ww, wh, I.mezcla(o.calido, '#ffe0a8', r() * 0.4), o.t, sm + p * 10 + c, { cortina: r() < 0.6, intensidad: 0.55 * (1 - pr * 0.4), marcoColor: I.oscurece(o.color, 0.5) });
        else {
          const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
          const vid = I.mezcla('#2a3240', (I.luzActual || I.LUZ_DEFECTO).niebla, pr * 0.8);
          g.addColorStop(0, I.css(I.aclara(vid, 0.12))); g.addColorStop(1, I.css(vid));
          ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
          ctx.strokeStyle = I.css(I.mezcla(I.oscurece(o.color, 0.4), (I.luzActual || I.LUZ_DEFECTO).niebla, pr * 0.8), 0.9); ctx.lineWidth = 3 * s;
          ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.moveTo(wx, wy + wh * 0.42); ctx.lineTo(wx + ww, wy + wh * 0.42); ctx.stroke();
          // reflejo del cielo
          ctx.fillStyle = I.css('#b8c4d4', 0.08 * (1 - pr)); ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww * 0.5, wy); ctx.lineTo(wx + ww * 0.7, wy); ctx.lineTo(wx + ww * 0.2, wy + wh); ctx.fill();
        }
        // alféizar o balcón
        if (o.balcones && p % 2 === 0 && pr < 0.6) {
          P.forma(ctx, P.rect(wx - 14 * s, wy + wh, ww + 28 * s, 9 * s), { color: I.aclara(o.color, 0.1), semilla: sm + 40 + p + c, profundidad: pr, borde: 0.5, textura: 0.1 });
          ctx.strokeStyle = I.css(I.mezcla('#22252c', (I.luzActual || I.LUZ_DEFECTO).niebla, pr * 0.85), 0.85); ctx.lineWidth = 2.2 * s;
          ctx.beginPath(); ctx.moveTo(wx - 12 * s, wy + wh - 34 * s); ctx.lineTo(wx + ww + 12 * s, wy + wh - 34 * s);
          for (let k = 0; k <= 8; k++) { const bx = wx - 12 * s + k * (ww + 24 * s) / 8; ctx.moveTo(bx, wy + wh - 34 * s); ctx.lineTo(bx, wy + wh); }
          ctx.stroke();
        } else {
          ctx.fillStyle = I.css(I.mezcla(I.aclara(o.color, 0.1), (I.luzActual || I.LUZ_DEFECTO).niebla, pr * 0.85)); ctx.fillRect(wx - 6 * s, wy + wh, ww + 12 * s, 6 * s);
        }
      }
    }
    return { x0, y0, w, h, bajoY: y - bajoH };
  });

  // ---- escaparate cálido (panadería/café) en planta baja
  props.registrar('escaparate', function (ctx, x, y, o) {
    o = def(o, { ancho: 380, alto: 300, color: '#4a3b34', calido: '#ffc16e', toldo: '#7d3f37', rotulo: true });
    const s = o.escala, w = o.ancho * s, h = o.alto * s, x0 = x - w / 2, y0 = y - h, sm = o.semilla, pr = o.profundidad;
    P.forma(ctx, P.rect(x0 - 16 * s, y0 - 20 * s, w + 32 * s, h + 20 * s), { color: o.color, semilla: sm, profundidad: pr, borde: 0.5, textura: 0.3 });
    // interior iluminado
    const ix = x0 + 10 * s, iy = y0 + 10 * s, iw = w - 20 * s, ih = h - 60 * s;
    const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
    g.addColorStop(0, I.css(I.mezcla(o.calido, '#fff0d0', 0.3))); g.addColorStop(1, I.css(I.oscurece(o.calido, 0.1)));
    ctx.fillStyle = g; ctx.fillRect(ix, iy, iw, ih);
    // estantes con panes
    ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
    for (let k = 0; k < 2; k++) {
      const sy = iy + ih * (0.48 + k * 0.38);
      ctx.fillStyle = I.css(I.oscurece(o.calido, 0.45), 0.8); ctx.fillRect(ix, sy, iw, 6 * s);
      for (let j = 0; j < 6; j++) {
        const px = ix + 30 * s + j * (iw - 60 * s) / 5, pw = (28 + I.hash(j + k * 9 + sm) * 16) * s;
        P.forma(ctx, P.elipse(px, sy - 12 * s, pw, 13 * s, 0, 16), { color: '#c98a4b', semilla: sm + j + k * 10, volumen: 0.8, borde: 0.3, irregular: 1.2, textura: 0.2, sombraInterna: 0.4 });
      }
    }
    // silueta del panadero al fondo (elipsis)
    ctx.fillStyle = I.css(I.oscurece(o.calido, 0.5), 0.35);
    ctx.beginPath(); ctx.ellipse(ix + iw * 0.72, iy + ih * 0.32, 26 * s, 34 * s, 0, 0, 7); ctx.fill();
    ctx.fillRect(ix + iw * 0.72 - 40 * s, iy + ih * 0.42, 80 * s, ih * 0.3);
    ctx.restore();
    // marco y travesaños
    ctx.strokeStyle = I.css(I.oscurece(o.color, 0.3)); ctx.lineWidth = 8 * s;
    ctx.strokeRect(ix, iy, iw, ih);
    ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(ix + iw / 3, iy); ctx.lineTo(ix + iw / 3, iy + ih); ctx.moveTo(ix + iw * 2 / 3, iy); ctx.lineTo(ix + iw * 2 / 3, iy + ih); ctx.stroke();
    // vaho/reflejo del cristal
    ctx.fillStyle = 'rgba(220,230,240,0.08)'; ctx.beginPath(); ctx.moveTo(ix, iy + ih); ctx.lineTo(ix + iw * 0.35, iy); ctx.lineTo(ix + iw * 0.5, iy); ctx.lineTo(ix + iw * 0.15, iy + ih); ctx.fill();
    // zócalo
    P.forma(ctx, P.rect(x0 - 16 * s, y - 50 * s, w + 32 * s, 50 * s), { color: I.oscurece(o.color, 0.2), semilla: sm + 5, profundidad: pr, borde: 0.4 });
    I.halo(ctx, x, iy + ih * 0.5, w * 1.3, o.calido, 0.75);
    I.halo(ctx, x, iy + ih * 0.6, w * 0.6, '#ffe6b8', 0.45);
    // toldo
    if (o.toldo) {
      const ty = y0 - 26 * s, td = 70 * s, pts = [[x0 - 30 * s, ty - 30 * s], [x0 + w + 30 * s, ty - 30 * s], [x0 + w + 46 * s, ty + td]];
      for (let k = 10; k >= 0; k--) { const xx = x0 - 46 * s + k * (w + 92 * s) / 10; pts.push([xx, ty + td + (k % 2 ? 10 * s : 0)]); }
      P.forma(ctx, pts, { color: o.toldo, semilla: sm + 6, profundidad: pr, volumen: 0.6, borde: 0.7, textura: 0.35 });
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = I.css(I.aclara(o.toldo, 0.4));
      for (let k = 0; k < 10; k += 2) { const xa = x0 - 30 * s + k * (w + 60 * s) / 10; ctx.beginPath(); ctx.moveTo(xa, ty - 30 * s); ctx.lineTo(xa + (w + 60 * s) / 10, ty - 30 * s); ctx.lineTo(xa + (w + 92 * s) / 10 * 1.05 - 16 * s + (w + 92 * s) / 10, ty + td); ctx.lineTo(xa - 16 * s + (w + 92 * s) / 10 * 0.0, ty + td); ctx.fill(); }
      ctx.restore();
    }
    return { luz: [x, iy + ih * 0.5] };
  });

  // ---- puerta de madera con montante
  props.registrar('puerta', function (ctx, x, y, o) {
    o = def(o, { ancho: 120, alto: 240, color: '#3c4a52', marco: '#8c8578' });
    const s = o.escala, w = o.ancho * s, h = o.alto * s;
    P.forma(ctx, P.rect(x - w / 2 - 12 * s, y - h - 14 * s, w + 24 * s, h + 14 * s, 6 * s), { color: o.marco, semilla: o.semilla, profundidad: o.profundidad, borde: 0.5 });
    P.forma(ctx, P.rect(x - w / 2, y - h, w, h), { color: o.color, semilla: o.semilla + 1, profundidad: o.profundidad, volumen: 0.5, borde: 0.4, textura: 0.4 });
    ctx.strokeStyle = I.css(I.oscurece(o.color, 0.35), 0.7); ctx.lineWidth = 3 * s;
    ctx.strokeRect(x - w / 2 + 14 * s, y - h + 50 * s, w / 2 - 20 * s, h * 0.35); ctx.strokeRect(x + 6 * s, y - h + 50 * s, w / 2 - 20 * s, h * 0.35);
    ctx.fillStyle = I.css('#c9a24f'); ctx.beginPath(); ctx.arc(x + w * 0.38, y - h * 0.45, 4 * s, 0, 7); ctx.fill();
  });

  // ---- banco de parque
  props.registrar('banco', function (ctx, x, y, o) {
    o = def(o, { ancho: 300, color: '#5a4636', hierro: '#24262c' });
    const s = o.escala, w = o.ancho * s;
    for (const k of [-0.4, 0.4]) P.forma(ctx, P.rect(x + k * w - 6 * s, y - 70 * s, 12 * s, 70 * s), { color: o.hierro, semilla: o.semilla, profundidad: o.profundidad });
    P.forma(ctx, P.rect(x - w / 2, y - 78 * s, w, 14 * s, 3 * s), { color: o.color, semilla: o.semilla + 1, profundidad: o.profundidad, textura: 0.4 });
    for (let i = 0; i < 3; i++) P.forma(ctx, P.rect(x - w / 2, y - 150 * s + i * 22 * s, w, 14 * s, 3 * s), { color: o.color, semilla: o.semilla + 2 + i, profundidad: o.profundidad, textura: 0.4 });
  });

  // ---- arco monumental (para plazas)
  props.registrar('arco', function (ctx, x, y, o) {
    o = def(o, { ancho: 500, alto: 600, color: '#9a9a96' });
    const s = o.escala, w = o.ancho * s, h = o.alto * s, x0 = x - w / 2;
    const pts = [[x0, y], [x0, y - h], [x0 + w, y - h], [x0 + w, y], [x + w * 0.22, y]];
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; pts.push([x + Math.cos(a) * w * 0.22, y - h * 0.45 - Math.sin(a) * w * 0.22]); }
    pts.push([x - w * 0.22, y]);
    P.forma(ctx, pts, { color: o.color, semilla: o.semilla, profundidad: o.profundidad, volumen: 0.5, borde: 0.4, textura: 0.3 });
    P.forma(ctx, P.rect(x0 - 12 * s, y - h, w + 24 * s, 40 * s), { color: I.aclara(o.color, 0.1), semilla: o.semilla + 1, profundidad: o.profundidad });
  });

  // ================= interior =================
  props.registrar('mesa', function (ctx, x, y, o) {
    o = def(o, { ancho: 420, alto: 230, color: '#6b4a35', mantel: null });
    const s = o.escala, w = o.ancho * s, h = o.alto * s;
    for (const k of [-0.42, 0.42]) P.forma(ctx, P.capsula(x + k * w, y - h + 20 * s, 9 * s, x + k * w * 1.02, y, 7 * s), { color: I.oscurece(o.color, 0.15), semilla: o.semilla + (k > 0 ? 1 : 0), profundidad: o.profundidad });
    P.forma(ctx, P.rect(x - w / 2, y - h, w, 22 * s, 5 * s), { color: o.color, semilla: o.semilla + 2, profundidad: o.profundidad, volumen: 0.6, borde: 0.7, textura: 0.4 });
    if (o.mantel) P.forma(ctx, P.poligono([[x - w * 0.3, y - h - 2 * s], [x + w * 0.35, y - h - 2 * s], [x + w * 0.38, y - h + 60 * s], [x + w * 0.1, y - h + 70 * s], [x - w * 0.33, y - h + 58 * s]]), { color: o.mantel, semilla: o.semilla + 3, profundidad: o.profundidad, textura: 0.3 });
    return { superficie: y - h };
  });

  props.registrar('taza', function (ctx, x, y, o) {
    o = def(o, { color: '#d8cfc0', vapor: true });
    const s = o.escala;
    if (!o.soloVapor) {
    P.forma(ctx, P.poligono([[x - 22 * s, y - 50 * s], [x + 22 * s, y - 50 * s], [x + 18 * s, y - 4 * s], [x + 10 * s, y], [x - 10 * s, y], [x - 18 * s, y - 4 * s]]), { color: o.color, semilla: o.semilla, profundidad: o.profundidad, volumen: 0.8, borde: 0.8, irregular: 0.4 });
    ctx.save(); ctx.strokeStyle = I.css(I.oscurece(o.color, 0.15)); ctx.lineWidth = 6 * s;
    ctx.beginPath(); ctx.arc(x + 26 * s, y - 28 * s, 11 * s, -1.3, 1.3); ctx.stroke(); ctx.restore();
    ctx.fillStyle = I.css('#4a2e22'); ctx.beginPath(); ctx.ellipse(x, y - 49 * s, 20 * s, 5 * s, 0, 0, 7); ctx.fill();
    }
    if (o.vapor) {
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = I.css('#f4efe8', 0.18); ctx.lineWidth = 7 * s;
        ctx.beginPath();
        for (let k = 0; k <= 12; k++) {
          const yy = y - 56 * s - k * 10 * s, xx = x + (i - 1) * 10 * s + Math.sin(k * 0.6 - o.t * 2.2 + i * 2) * 8 * s * (k / 12) + I.ruido1(o.t * 0.8 + k * 0.3 + i * 4, o.semilla) * 6 * s;
          if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.globalAlpha = 0.8; ctx.stroke();
      }
      ctx.restore();
    }
  });

  props.registrar('lampara', function (ctx, x, y, o) {
    o = def(o, { alto: 520, color: '#2d2a28', pantalla: '#e8b46a', encendida: true });
    const s = o.escala, h = o.alto * s;
    P.forma(ctx, P.elipse(x, y - 6 * s, 50 * s, 10 * s, 0, 16), { color: o.color, semilla: o.semilla, profundidad: o.profundidad });
    P.forma(ctx, P.rect(x - 4 * s, y - h, 8 * s, h), { color: o.color, semilla: o.semilla + 1, profundidad: o.profundidad, borde: 0.6 });
    P.forma(ctx, P.poligono([[x - 50 * s, y - h + 10 * s], [x + 50 * s, y - h + 10 * s], [x + 80 * s, y - h + 110 * s], [x - 80 * s, y - h + 110 * s]]),
      { color: o.pantalla, emisivo: o.encendida, semilla: o.semilla + 2, textura: 0.3, borde: 0, sombraInterna: 0 });
    if (o.encendida) {
      I.halo(ctx, x, y - h + 70 * s, 520 * s, '#ffb860', 0.85);
      I.halo(ctx, x, y - h + 70 * s, 120 * s, '#fff0d0', 0.6);
      I.cono(ctx, x, y - h + 100 * s, Math.PI / 2, 1.2, h, '#ffc477', 0.45);
    }
    return { foco: [x, y - h + 70 * s] };
  });

  props.registrar('planta', function (ctx, x, y, o) {
    o = def(o, { maceta: '#9a5b3e', hoja: '#4f6b4a' });
    const s = o.escala, r = I.rng(o.semilla * 7);
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.2, L = (90 + r() * 80) * s, bx = x, by = y - 80 * s;
      const sw = I.ruido1(o.t * 0.6 + i, o.semilla) * 0.04;
      const tx = bx + Math.cos(a + sw) * L, ty = by + Math.sin(a + sw) * L;
      const mx = (bx + tx) / 2 + Math.cos(a + 1.57) * 18 * s, my = (by + ty) / 2 + Math.sin(a + 1.57) * 18 * s;
      P.forma(ctx, P.suavizar([[bx, by], [mx, my], [tx, ty], [(bx + tx) / 2 - Math.cos(a + 1.57) * 4 * s, (by + ty) / 2 - Math.sin(a + 1.57) * 4 * s]], 4), { color: I.mezcla(o.hoja, '#7a8f5a', r() * 0.5), semilla: o.semilla + i, profundidad: o.profundidad, volumen: 0.6, borde: 0.6, textura: 0.2, irregular: 0.5 });
    }
    P.forma(ctx, P.poligono([[x - 50 * s, y - 90 * s], [x + 50 * s, y - 90 * s], [x + 38 * s, y], [x - 38 * s, y]]), { color: o.maceta, semilla: o.semilla + 20, profundidad: o.profundidad, volumen: 0.7, borde: 0.6 });
  });

  props.registrar('cuadro', function (ctx, x, y, o) {
    o = def(o, { ancho: 160, alto: 120, marco: '#5b4330', lienzo: '#8aa0a8' });
    const s = o.escala, w = o.ancho * s, h = o.alto * s;
    P.forma(ctx, P.rect(x - w / 2, y - h, w, h), { color: o.marco, semilla: o.semilla, profundidad: o.profundidad, borde: 0.6 });
    const ix = x - w / 2 + 12 * s, iy = y - h + 12 * s, iw = w - 24 * s, ih = h - 24 * s;
    const g = ctx.createLinearGradient(0, iy, 0, iy + ih); g.addColorStop(0, I.css(I.aclara(o.lienzo, 0.2))); g.addColorStop(1, I.css(I.mezcla(o.lienzo, '#4f6b4a', 0.5)));
    ctx.fillStyle = g; ctx.fillRect(ix, iy, iw, ih);
    ctx.fillStyle = I.css('#e0b070', 0.8); ctx.beginPath(); ctx.arc(ix + iw * 0.7, iy + ih * 0.35, ih * 0.12, 0, 7); ctx.fill();
  });

  props.registrar('estanteria', function (ctx, x, y, o) {
    o = def(o, { ancho: 260, alto: 520, color: '#5a4030' });
    const s = o.escala, w = o.ancho * s, h = o.alto * s, r = I.rng(o.semilla * 3);
    P.forma(ctx, P.rect(x - w / 2, y - h, w, h), { color: I.oscurece(o.color, 0.25), semilla: o.semilla, profundidad: o.profundidad });
    const libros = ['#7a3b33', '#3e5a64', '#a08050', '#4f5f3f', '#6a4a6a', '#c9b48a'];
    for (let k = 0; k < 4; k++) {
      const sy = y - h + (k + 1) * h / 4;
      let bx = x - w / 2 + 10 * s;
      while (bx < x + w / 2 - 30 * s) {
        const bw = (14 + r() * 14) * s, bh = (h / 4 - 20 * s) * (0.7 + r() * 0.28);
        ctx.fillStyle = I.css(I.mezcla(libros[Math.floor(r() * libros.length)], (I.luzActual || I.LUZ_DEFECTO).ambiente, 0.25));
        ctx.fillRect(bx, sy - bh - 8 * s, bw, bh); bx += bw + 2 * s;
      }
      P.forma(ctx, P.rect(x - w / 2, sy - 10 * s, w, 12 * s), { color: o.color, semilla: o.semilla + k + 1, profundidad: o.profundidad, borde: 0.6 });
    }
  });

  props.registrar('olla', function (ctx, x, y, o) {
    o = def(o, { color: '#8c8f96', vapor: true });
    const s = o.escala;
    P.forma(ctx, P.rect(x - 70 * s, y - 90 * s, 140 * s, 90 * s, 18 * s), { color: o.color, semilla: o.semilla, profundidad: o.profundidad, volumen: 0.9, borde: 0.9 });
    P.forma(ctx, P.elipse(x, y - 92 * s, 74 * s, 12 * s, 0, 20), { color: I.aclara(o.color, 0.15), semilla: o.semilla + 1, profundidad: o.profundidad });
    if (o.vapor) props.taza(ctx, x, y - 40 * s, { escala: s * 2, t: o.t, semilla: o.semilla, color: 'rgba(0,0,0,0)', soloVapor: true });
  });

  // ---- ventana interior con lluvia nocturna fuera (contraste frío/cálido)
  props.registrar('ventanaNoche', function (ctx, x, y, o) {
    o = def(o, { ancho: 300, alto: 420, marco: '#d8cbb6', noche: '#26334a' });
    const s = o.escala, w = o.ancho * s, h = o.alto * s, x0 = x - w / 2, y0 = y - h;
    P.forma(ctx, P.rect(x0 - 20 * s, y0 - 20 * s, w + 40 * s, h + 40 * s), { color: o.marco, semilla: o.semilla, borde: 0.6, textura: 0.3 });
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, I.css(I.aclara(o.noche, 0.1))); g.addColorStop(1, I.css(I.oscurece(o.noche, 0.2)));
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
    // edificios de enfrente con ventanas
    const r = I.rng(o.semilla + 5);
    for (let i = 0; i < 4; i++) {
      const bx = x0 + i * w / 3.2 - 20 * s, bh = h * (0.4 + r() * 0.35);
      ctx.fillStyle = I.css(I.mezcla(o.noche, '#101826', 0.4)); ctx.fillRect(bx, y0 + h - bh, w / 3.4, bh);
      for (let k = 0; k < 6; k++) if (r() < 0.4) { ctx.fillStyle = I.css('#ffcf80', 0.75); ctx.fillRect(bx + 10 * s + (k % 2) * 30 * s, y0 + h - bh + 16 * s + Math.floor(k / 2) * 36 * s, 12 * s, 16 * s); }
    }
    // gotas sobre el cristal
    for (let i = 0; i < 40; i++) {
      const gx = x0 + I.hash(i * 3 + o.semilla) * w, per = 3 + I.hash(i) * 4, f = ((o.t / per) + I.hash(i * 9)) % 1;
      const gy = y0 + (I.hash(i * 5) * 0.5 + f * f * 0.6) * h;
      ctx.fillStyle = I.css('#c8d6e8', 0.35); ctx.beginPath(); ctx.ellipse(gx, gy, 2.5 * s, 3.5 * s, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = I.css('#c8d6e8', 0.12); ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - f * 60 * s); ctx.stroke();
    }
    I.lluvia(ctx, o.t, { densidad: 60, alfa: 0.25, largo: [14, 30], semilla: o.semilla + 3 });
    ctx.restore();
    ctx.strokeStyle = I.css(o.marco); ctx.lineWidth = 12 * s;
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.moveTo(x0, y0 + h * 0.45); ctx.lineTo(x0 + w, y0 + h * 0.45); ctx.stroke();
    P.forma(ctx, P.rect(x0 - 34 * s, y0 + h + 14 * s, w + 68 * s, 18 * s), { color: I.aclara(o.marco, 0.05), semilla: o.semilla + 9, borde: 0.8 });
  });
})(window);

/* ===== escenarios.js ===== */
/* Ilustra — escenarios: calle lluviosa (noche/atardecer) e interior cálido.
   Devuelven {luz, fondo, suelo, capas:[...]} listos para Ilustra.Escena. Coordenadas de mundo: suelo de los actores en y=suelo. */
(function (G) {
  'use strict';
  const I = G.Ilustra, P = I.Pincel, props = () => I.props;
  I.escenarios = {};

  I.escenarios.calleLluviosa = function (o = {}) {
    o = Object.assign({ hora: 'atardecer', semilla: 4, suelo: 1150, base: 1068, escaparateX: 330, hueco: [760, 1180], rango: [-700, 2500] }, o);
    const noche = o.hora === 'noche';
    const luz = new I.Luz({
      dir: [-0.35, -0.94], dirBorde: [0.85, -0.35],
      clave: noche ? '#ffcf96' : '#ffd8a8', ambiente: noche ? '#3c4a64' : '#56657e', borde: '#ffc98a',
      niebla: noche ? '#56627a' : '#8996aa'
    });
    const cielo1 = noche ? '#1e2638' : '#7f8ea4', cielo2 = noche ? '#4a5470' : '#c2b9b0';
    const [R0, R1] = o.rango, base = o.base, suelo = o.suelo, sm = o.semilla;
    const capas = [];

    // 1) cielo (pantalla) con resplandor cálido de ciudad cerca del horizonte
    capas.push({
      pantalla: true, dibujar(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, 0, 1150);
        g.addColorStop(0, I.css(I.oscurece(cielo1, 0.15))); g.addColorStop(0.55, I.css(cielo1)); g.addColorStop(1, I.css(cielo2));
        ctx.fillStyle = g; ctx.fillRect(0, 0, I.ANCHO, I.ALTO);
        // nubes bajas que derivan
        for (let i = 0; i < 7; i++) {
          const x = ((I.hash(i + sm) * 1600 + t * 6 * (1 + i % 3)) % 1700) - 300, y = 200 + I.hash(i * 3 + sm) * 500, r = 260 + I.hash(i * 7) * 200;
          const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
          rg.addColorStop(0, I.css(I.aclara(cielo1, 0.12), 0.35)); rg.addColorStop(1, I.css(cielo1, 0));
          ctx.save(); ctx.translate(x, y); ctx.scale(1.8, 0.5); ctx.translate(-x, -y); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
        }
      }
    });
    // 2) tejados lejanos (z=6) con torre/cúpula: siluetas brumosas
    capas.push({
      z: 6, estatica: true, desenfoque: 3, limites: [R0 - 400, 0, R1 + 600, 1300], dibujar(ctx) {
        const r = I.rng(sm * 5);
        let x = R0 - 400;
        while (x < R1 + 600) {
          const w = 120 + r() * 160, h = 260 + r() * 260;
          P.forma(ctx, P.rect(x, base - 120 - h, w, h + 140), { color: I.mezcla(noche ? '#2e3546' : '#5b6476', noche ? '#3d4558' : '#7a8296', r()), profundidad: 0.9, semilla: Math.floor(r() * 1000), volumen: 0.2, borde: 0, textura: 0.2, irregular: 2 });
          for (let k = 0; k < 6; k++) if (r() < 0.3) I.ventanaLuz(ctx, x + 15 + r() * (w - 30), base - 100 - h + 40 + r() * h * 0.6, 10, 14, '#f3c27e', 0, k, { marco: false, intensidad: 0.25, radioHalo: 2 });
          x += w + r() * 20;
        }
        // cúpula lejana
        const cx = 980;
        P.forma(ctx, P.rect(cx - 70, base - 640, 140, 500), { color: '#6d7588', profundidad: 0.85, semilla: 77, borde: 0.1 });
        P.forma(ctx, P.elipse(cx, base - 640, 95, 110, 0, 30).filter(p => p[1] <= base - 640 + 1).concat([[cx - 95, base - 640]]), { color: '#6a7386', profundidad: 0.85, semilla: 78, borde: 0.1 });
        P.forma(ctx, P.rect(cx - 8, base - 800, 16, 70), { color: '#6a7386', profundidad: 0.85, semilla: 79 });
      }
    });
    // niebla lejana
    capas.push({ pantalla: true, dibujar(ctx, t) { I.niebla(ctx, t, { y: 880, alto: 520, color: noche ? '#5d6a84' : '#a3adbd', alfa: 0.55, velocidad: 6, semilla: sm, canal: 0 }); } });
    // 3) edificios medios (z=2.6), visibles en el hueco de la calle transversal
    capas.push({
      z: 2.6, estatica: true, desenfoque: 1.6, limites: [R0 - 300, -200, R1 + 300, 1300], dibujar(ctx) {
        const r = I.rng(sm * 9 + 2), cols = ['#7d8494', '#8a8580', '#6f7a86', '#857d7a'].map(c => noche ? I.mezcla(c, '#283044', 0.5) : I.color(c));
        let x = R0 - 200;
        while (x < R1 + 200) {
          const w = 300 + r() * 120, h = 700 + r() * 250;
          props().edificio(ctx, x + w / 2, base - 30, { ancho: w, alto: h, color: cols[Math.floor(r() * 4)], pisos: 5, columnas: 3, encendidas: 0.3, profundidad: 0.55, semilla: Math.floor(r() * 999), balcones: false, bajo: false, tejado: r() < 0.6 ? 'mansarda' : 'plano', escala: 1 });
          x += w + 10;
        }
        // farolas lejanas
        for (let k = 0; k < 6; k++) { const fx = R0 + k * 520 + 200; props().farola(ctx, fx, base - 20, { escala: 0.55, profundidad: 0.5, semilla: 300 + k, cono: false }); }
      }
    });
    capas.push({ pantalla: true, dibujar(ctx, t) { I.niebla(ctx, t, { y: 1000, alto: 360, color: noche ? '#66728c' : '#aab3c2', alfa: 0.45, velocidad: 10, semilla: sm + 5, canal: 1 }); } });
    // lluvia lejana (detrás de la fachada cercana)
    capas.push({ pantalla: true, dibujar(ctx, t) { I.lluvia(ctx, t, { densidad: 160, alfa: 0.18, largo: [16, 30], velocidad: 1300, capas: 1, semilla: sm + 40 }); } });

    // 4) fachada cercana (z=1.25) con hueco de calle transversal
    const fachadas = [];
    {
      const r = I.rng(sm * 17 + 3), cols = ['#8b8f98', '#a08f7e', '#7f8a8c', '#958a90', '#8e8678'].map(c => noche ? I.mezcla(c, '#283044', 0.5) : I.color(c));
      let x = R0;
      while (x < R1) {
        const w = 400 + r() * 120;
        if (x + w > o.hueco[0] && x < o.hueco[1]) { x = o.hueco[1]; continue; }
        fachadas.push({ x: x + w / 2, w, h: 760 + r() * 160, color: cols[fachadas.length % cols.length], s: Math.floor(r() * 999) });
        x += w + 4;
      }
    }
    const capaFachada = {
      z: 1.25, estatica: true, limites: [R0 - 100, -100, R1 + 200, base + 4], dibujar(ctx) {
        for (const f of fachadas) {
          props().edificio(ctx, f.x, base, { ancho: f.w, alto: f.h, color: f.color, pisos: 4, columnas: 3, encendidas: 0.28, semilla: f.s, profundidad: 0.12, bajo: true, tejado: 'mansarda' });
          // planta baja: escaparate cálido o puerta
          const tiene = Math.abs(f.x - o.escaparateX) < f.w / 2;
          if (tiene) props().escaparate(ctx, o.escaparateX, base, { ancho: Math.min(360, f.w - 80), alto: 240, semilla: f.s + 3, profundidad: 0.05 });
          else if (f.s % 3 === 0) props().escaparate(ctx, f.x - 40, base, { ancho: 260, alto: 220, calido: '#e9b073', toldo: '#3f5a5c', semilla: f.s + 3, profundidad: 0.1 });
          else props().puerta(ctx, f.x + 60, base, { semilla: f.s + 5, profundidad: 0.1, color: I.mezcla('#3c4a52', f.color, 0.3) });
          // zócalo de piedra
          P.forma(ctx, P.rect(f.x - f.w / 2, base - 30, f.w, 30), { color: '#5d606a', semilla: f.s + 9, profundidad: 0.1, borde: 0.3, textura: 0.4 });
        }
        // atmósfera sobre la fachada: arriba se funde con la bruma, abajo se oscurece (luz ambiente)
        {
          const g = ctx.createLinearGradient(0, -100, 0, base);
          g.addColorStop(0, I.css(luz.niebla, 0.55)); g.addColorStop(0.45, I.css(luz.niebla, 0.18)); g.addColorStop(1, I.css(luz.niebla, 0));
          ctx.fillStyle = g; ctx.globalCompositeOperation = 'source-atop'; ctx.fillRect(R0 - 100, -100, R1 - R0 + 300, base + 100);
          const g2 = ctx.createLinearGradient(0, base - 700, 0, base);
          g2.addColorStop(0, I.css('#1c2333', 0)); g2.addColorStop(1, I.css('#1c2333', 0.32));
          ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g2; ctx.fillRect(R0 - 100, base - 700, R1 - R0 + 300, 700);
          ctx.globalCompositeOperation = 'source-over';
          // los escaparates vuelven a brillar por encima del oscurecimiento
          for (const f of fachadas) { const tiene = Math.abs(f.x - o.escaparateX) < f.w / 2; if (tiene) I.halo(ctx, o.escaparateX, base - 120, 420, '#ffb75e', 0.55); }
        }
        // pared lateral del hueco (esquinas en sombra)
        for (const f of fachadas) {
          if (Math.abs(f.x + f.w / 2 - o.hueco[0]) < 60) P.forma(ctx, P.poligono([[f.x + f.w / 2, base - f.h], [f.x + f.w / 2 + 50, base - f.h + 60], [f.x + f.w / 2 + 50, base + 30], [f.x + f.w / 2, base]]), { color: I.oscurece(f.color, 0.4), semilla: 5, profundidad: 0.15 });
          if (Math.abs(f.x - f.w / 2 - o.hueco[1]) < 60) P.forma(ctx, P.poligono([[f.x - f.w / 2, base - f.h], [f.x - f.w / 2 - 50, base - f.h + 60], [f.x - f.w / 2 - 50, base + 30], [f.x - f.w / 2, base]]), { color: I.oscurece(f.color, 0.45), semilla: 6, profundidad: 0.15 });
        }
      }
    };
    capas.push(capaFachada);
    // 5) suelo (z=1): acera mojada, juntas, charcos, bordillo, calzada
    capas.push({
      z: 1, dibujar(ctx, t, cam) {
        const x0 = R0 - 400, x1 = R1 + 400;
        const g = ctx.createLinearGradient(0, base, 0, 1920);
        g.addColorStop(0, I.css(noche ? '#323a4c' : '#4c5466')); g.addColorStop(0.25, I.css(noche ? '#283040' : '#3c4354')); g.addColorStop(1, I.css(noche ? '#161b26' : '#232834'));
        ctx.fillStyle = g; ctx.fillRect(x0, base - 2, x1 - x0, 1920 - base + 400);
        // juntas de las losas
        ctx.strokeStyle = I.css('#1d2230', 0.35); ctx.lineWidth = 2;
        let yy = base + 22, paso = 26, fila = 0;
        ctx.beginPath();
        while (yy < 1660) {
          ctx.moveTo(x0, yy); ctx.lineTo(x1, yy);
          const anchoL = paso * 3.2;
          for (let x = x0 + (fila % 2) * anchoL / 2; x < x1; x += anchoL) { ctx.moveTo(x, yy); ctx.lineTo(x - (x - 540) * 0.04, yy - paso); }
          paso *= 1.22; yy += paso; fila++;
        }
        ctx.stroke();
        // charcos con reflejo del cielo
        const r = I.rng(sm * 23);
        for (let i = 0; i < 26; i++) {
          const cx = x0 + r() * (x1 - x0), cy = base + 60 + r() * 560, rx = 60 + r() * 160, ry = rx * (0.08 + (cy - base) / 3000);
          const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
          pg.addColorStop(0, I.css(noche ? '#59657e' : '#8e9ab0', 0.55)); pg.addColorStop(0.7, I.css(noche ? '#4a5570' : '#7d89a0', 0.3)); pg.addColorStop(1, I.css('#7d89a0', 0));
          ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, 7); ctx.fill(); ctx.restore();
        }
        // bordillo y calzada
        P.forma(ctx, P.rect(x0, 1660, x1 - x0, 26), { color: '#6b6f7a', semilla: 3, volumen: 0.6, borde: 0.4, textura: 0.3, irregular: 0 });
        ctx.fillStyle = I.css(noche ? '#151a24' : '#262b36'); ctx.fillRect(x0, 1686, x1 - x0, 500);
      }
    });
    // 5b) reflejo de la fachada en la acera mojada
    capas.push({ z: 1.25, reflejoDe: capaFachada, eje: base, alto: 560, alfa: 0.28, desenfoque: 4 });
    // 6) reflejos cálidos sobre la acera (en la profundidad de la fachada, para que no se desplacen respecto a sus fuentes)
    capas.push({
      z: 1.25, dibujar(ctx, t) {
        for (const f of fachadas) {
          const tiene = Math.abs(f.x - o.escaparateX) < f.w / 2;
          if (tiene) for (let k = -1; k <= 1; k++) I.reflejoLuz(ctx, o.escaparateX + k * 105, base + 8, 110, 460, '#ffbf6a', t, k + 5, 1.0);
          else if (f.s % 3 === 0) I.reflejoLuz(ctx, f.x - 40, base + 10, 140, 260, '#e9b073', t, f.s, 0.7);
        }
      }
    });
    // 7) farolas (z=1.12) con reflejo
    const farolas = o.farolas || [-640, 40, 860, 1640, 2400];
    capas.push({
      z: 1.12, dibujar(ctx, t) {
        for (const fx of farolas) {
          I.reflejoLuz(ctx, fx + 48, suelo + 30, 110, 520, '#ffc477', t, fx + 1000, 1.0);
          props().farola(ctx, fx, suelo + 20, { t, semilla: fx + 1000, alto: 720 });
        }
      }
    });
    // 8) salpicaduras en el suelo (z=1)
    capas.push({ z: 1, dibujar(ctx, t, cam) { const c = cam.en(t); I.salpicaduras(ctx, t, { y0: base + 30, y1: 1520, x0: c.x - 700, x1: c.x + 700, n: 70, semilla: sm }); } });
    // 9) actores
    capas.push({ actores: true });
    // 11) niebla baja delante
    capas.push({ pantalla: true, dibujar(ctx, t) { I.niebla(ctx, t, { y: 1160, alto: 260, color: noche ? '#6c7891' : '#b3bccb', alfa: 0.22, velocidad: 14, semilla: sm + 9, canal: 2 }); } });
    return { luz, fondo: cielo1, suelo, base, capas, escaparateX: o.escaparateX, farolas, hueco: o.hueco };
  };

  // ======================= interior cálido =======================
  I.escenarios.interiorCalido = function (o = {}) {
    o = Object.assign({ semilla: 8, suelo: 1150, pared: '#8a6f5c', papel: '#9a7d66' }, o);
    const luz = new I.Luz({ dir: [-0.8, -0.6], dirBorde: [-0.9, -0.2], clave: '#ffcf96', ambiente: '#6a5248', borde: '#ffc078', niebla: '#7a6458' });
    const suelo = o.suelo, sm = o.semilla, capas = [];
    capas.push({
      z: 1.3, estatica: true, limites: [-600, -200, 1800, 2200], dibujar(ctx) {
        // pared con papel pintado
        const g = ctx.createLinearGradient(0, 0, 0, suelo);
        g.addColorStop(0, I.css(I.oscurece(o.pared, 0.35))); g.addColorStop(1, I.css(o.pared));
        ctx.fillStyle = g; ctx.fillRect(-600, -200, 2400, suelo + 200);
        ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = I.css(I.aclara(o.papel, 0.3)); ctx.lineWidth = 2;
        for (let x = -600; x < 1800; x += 70) { ctx.beginPath(); for (let y = -200; y < suelo; y += 20) ctx.lineTo(x + Math.sin(y * 0.03) * 10, y); ctx.stroke(); }
        ctx.restore();
        // zócalo de madera
        P.forma(ctx, P.rect(-600, suelo - 260, 2400, 260), { color: '#5d4334', semilla: sm, volumen: 0.4, borde: 0.4, textura: 0.4, irregular: 0 });
        ctx.strokeStyle = I.css('#3a2a20', 0.5); ctx.lineWidth = 3;
        for (let x = -560; x < 1800; x += 180) ctx.strokeRect(x, suelo - 230, 150, 190);
        P.forma(ctx, P.rect(-600, suelo - 272, 2400, 16), { color: '#7a5a44', semilla: sm + 1, borde: 0.8, irregular: 0 });
        props().ventanaNoche(ctx, 760, 820, { ancho: 300, alto: 420, semilla: sm + 2, t: 0 });
        props().cuadro(ctx, 180, 640, { semilla: sm + 3 });
        props().estanteria(ctx, -120, suelo - 10, { semilla: sm + 4 });
      }
    });
    // ventana con lluvia animada encima de la caché
    capas.push({ z: 1.3, dibujar(ctx, t) { props().ventanaNoche(ctx, 760, 820, { ancho: 300, alto: 420, semilla: sm + 2, t }); } });
    // suelo de madera
    capas.push({
      z: 1, estatica: true, limites: [-700, suelo - 20, 1900, 2300], dibujar(ctx) {
        const g = ctx.createLinearGradient(0, suelo, 0, 1920); g.addColorStop(0, I.css('#6e4c36')); g.addColorStop(1, I.css('#3a281e'));
        ctx.fillStyle = g; ctx.fillRect(-700, suelo - 10, 2600, 1200);
        ctx.strokeStyle = I.css('#2a1c14', 0.45); ctx.lineWidth = 2;
        let y = suelo + 18, p = 22; while (y < 1950) { ctx.beginPath(); ctx.moveTo(-700, y); ctx.lineTo(1900, y); ctx.stroke(); p *= 1.2; y += p; }
        // alfombra
        P.forma(ctx, P.elipse(540, suelo + 160, 520, 110, 0, 40), { color: '#7d3f37', semilla: sm + 6, volumen: 0.4, borde: 0.3, textura: 0.5 });
        P.forma(ctx, P.elipse(540, suelo + 160, 440, 85, 0, 40), { color: '#a0684a', semilla: sm + 7, volumen: 0.3, borde: 0, textura: 0.5 });
      }
    });
    // muebles (z=1)
    capas.push({
      z: 1, dibujar(ctx, t) {
        props().planta(ctx, 1000, suelo + 10, { semilla: sm + 8, t });
        const m = props().mesa(ctx, 560, suelo + 40, { semilla: sm + 9, mantel: '#d9cdb8' });
        if (o.taza !== false) props().taza(ctx, 640, m.superficie, { t, semilla: sm + 10 });
      }
    });
    capas.push({ z: 1.05, dibujar(ctx, t) { props().lampara(ctx, 170, suelo + 20, { semilla: sm + 11, t }); } });
    capas.push({ actores: true });
    // mapa de luz: la lámpara y la ventana iluminan; el resto de la habitación cae en penumbra cálida
    capas.push({ pantalla: true, dibujar(ctx, t, cam) {
      const fl = 1 + 0.02 * I.ruido1(t * 2, sm);
      const z = cam.en(t).zoom;
      const l = cam.aPantalla(t, 170, suelo + 20 - 520 + 70, 1.05), v = cam.aPantalla(t, 760, 610, 1.3);
      I.mapaLuz(ctx, [{ x: l[0], y: l[1] + 120 * z, r: 1100 * z, fuerza: 0.85 * fl, color: '#fff0dc' }, { x: v[0], y: v[1], r: 520 * z, fuerza: 0.35, color: '#b8c8e8' }], { oscuridad: '#4a3a40' });
      I.halo(ctx, l[0], l[1], 700 * z, '#ffb55e', 0.45 * fl);
    } });
    capas.push({ pantalla: true, dibujar(ctx, t) { I.niebla(ctx, t, { y: 700, alto: 900, color: '#d9a878', alfa: 0.1, velocidad: 3, semilla: sm, canal: 3 }); } });
    return { luz, fondo: '#3a2c26', suelo, capas, lampara: [170, suelo + 20] };
  };
})(window);

/* ===== elipsis.js ===== */
/* Ilustra — recursos de elipsis del cine animado: silueta, sombra proyectada, contraluz, plano de detalle, de espaldas. */
(function (G) {
  'use strict';
  const I = G.Ilustra;
  const E = I.elipsis = {};

  // dibuja fn(ctx) en una capa auxiliar con la transformación actual y la sustituye por un color plano (+ borde luminoso opcional)
  function aCapa(ctx, fn, nombre) {
    const a = I.capaAux(nombre, I.ANCHO, I.ALTO), x = a.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none';
    x.clearRect(0, 0, I.ANCHO, I.ALTO);
    x.setTransform(ctx.getTransform());
    fn(x);
    x.setTransform(1, 0, 0, 1, 0, 0);
    return a;
  }

  E.silueta = function (ctx, fn, color = '#1b2130', bordeColor = null, o = {}) {
    const a = aCapa(ctx, fn, 'silueta'), x = a.ctx;
    x.globalCompositeOperation = 'source-in'; x.fillStyle = I.css(color); x.fillRect(0, 0, I.ANCHO, I.ALTO);
    x.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (bordeColor) {
      // borde luminoso: la silueta desplazada en color de borde por detrás
      const d = o.anchoBorde || 3, dir = o.dirBorde || [1, -0.4];
      ctx.save(); ctx.filter = 'blur(' + (d * 0.8) + 'px)';
      const b = I.capaAux('siluetaBorde', I.ANCHO, I.ALTO);
      b.ctx.setTransform(1, 0, 0, 1, 0, 0); b.ctx.clearRect(0, 0, I.ANCHO, I.ALTO);
      b.ctx.drawImage(a.canvas, 0, 0); b.ctx.globalCompositeOperation = 'source-in'; b.ctx.fillStyle = I.css(bordeColor); b.ctx.fillRect(0, 0, I.ANCHO, I.ALTO); b.ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(b.canvas, dir[0] * d, dir[1] * d);
      ctx.restore();
    }
    ctx.drawImage(a.canvas, 0, 0);
    ctx.restore();
  };

  // sombra proyectada en pared o suelo: la figura aplanada y sesgada desde un ancla (p.ej. los pies)
  E.sombraProyectada = function (ctx, fn, o = {}) {
    o = Object.assign({ ancla: [540, 1150], sesgo: -0.6, escalaY: 0.45, alfa: 0.45, desenfoque: 6, color: '#121620' }, o);
    const a = aCapa(ctx, fn, 'sombra'), x = a.ctx;
    x.globalCompositeOperation = 'source-in'; x.fillStyle = I.css(o.color); x.fillRect(0, 0, I.ANCHO, I.ALTO); x.globalCompositeOperation = 'source-over';
    const M = ctx.getTransform(), ax = M.a * o.ancla[0] + M.c * o.ancla[1] + M.e, ay = M.b * o.ancla[0] + M.d * o.ancla[1] + M.f;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = o.alfa; ctx.filter = 'blur(' + o.desenfoque + 'px)';
    ctx.translate(ax, ay); ctx.transform(1, 0, o.sesgo, o.escalaY, 0, 0); ctx.translate(-ax, -ay);
    ctx.drawImage(a.canvas, 0, 0);
    ctx.restore();
  };

  // contraluz: halo de la fuente detrás + silueta con borde luminoso
  E.contraluz = function (ctx, fn, o = {}) {
    o = Object.assign({ fuente: [540, 800], color: '#ffcf8a', radio: 600, silueta: '#1a1f2c' }, o);
    const M = ctx.getTransform();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const fx = M.a * o.fuente[0] + M.c * o.fuente[1] + M.e, fy = M.b * o.fuente[0] + M.d * o.fuente[1] + M.f;
    I.halo(ctx, fx, fy, o.radio, o.color, 1.2);
    ctx.restore();
    const dx = 0, dy = 0;
    E.silueta(ctx, fn, o.silueta, o.color, { anchoBorde: 4, dirBorde: [fx > I.ANCHO / 2 ? 1 : -1, -0.3] });
  };

  // plano de detalle: añade keyframes de cámara para encuadrar un rectángulo [x,y,w,h] (mundo, z=1) entre t0 y t1
  E.planoDetalle = function (cam, rect, t0, t1, mantener = 1.5) {
    const [x, y, w, h] = rect;
    const zoom = Math.min(I.ANCHO / w, (I.ZONA.dibujo[1] - I.ZONA.dibujo[0]) / h) * 0.9;
    const cx = x + w / 2, cy = y + h / 2;
    // centro de la zona de dibujo en pantalla: el centro del rect debe caer en y≈810
    const yCam = cy + (I.ALTO / 2 - 810) / zoom;
    const base = { x: cam.x, y: cam.y, zoom: cam.zoom };
    for (const [k, v0, v1] of [['x', base.x, cx], ['y', base.y, yCam], ['zoom', base.zoom, zoom]]) {
      const l = cam.claves[k] || [[0, v0]];
      l.push([t0, I.claves(l, t0)], [t1, v1], [t1 + mantener, v1]);
      cam.claves[k] = l.sort((a, b) => a[0] - b[0]);
    }
    return zoom;
  };

  // de espaldas: atajo que devuelve el estado con vista 'espalda'
  E.deEspaldas = estado => Object.assign({}, estado, { vista: 'espalda' });
})(window);

/* ===== escena.js ===== */
/* Ilustra — Escena: monta capas del escenario + actores + cámara + postproceso. Bucle de vista previa y contrato de render. */
(function (G) {
  'use strict';
  const I = G.Ilustra;

  // Capa: {z, dibujar(ctx,t), estatica?:bool, limites?:[x0,y0,x1,y1], pantalla?:bool, actores?:bool, imagen?:HTMLImageElement}
  //  - estatica: se dibuja una sola vez en un lienzo cacheado (coordenadas de mundo dentro de 'limites') y se reusa.
  //  - pantalla: se dibuja sin cámara (coordenadas de pantalla).
  //  - actores: marcador; en ese punto se dibujan los actores (z=1).
  //  - imagen: HUECO FUTURO para fondos externos (no implementado en Fase 1; se ignora).
  I.Escena = function (o) {
    this.escenario = o.escenario;
    this.camara = o.camara || new I.Camara();
    this.duracion = o.duracion || 10;
    this.fps = o.fps || 30;
    this.actores = o.actores || [];
    this.post = Object.assign({ lluvia: false, bloom: { fuerza: 0.35 }, grano: 0.06, vineta: 0.45, gradacion: { fuerza: 0.1 } }, o.post || {});
    this.extra = o.extra || null; // function(ctx,t,escena) dibujada al final (en pantalla) antes del grano
    this._cache = new Map();
  };

  I.Escena.prototype._cacheCapa = function (capa) {
    let c = this._cache.get(capa);
    if (c) return c;
    const [x0, y0, x1, y1] = capa.limites || [-800, -200, 2600, 2200];
    const cv = document.createElement('canvas'); cv.width = Math.ceil(x1 - x0); cv.height = Math.ceil(y1 - y0);
    const cx = cv.getContext('2d');
    cx.translate(-x0, -y0);
    const prev = I.luzActual; I.luzActual = this.escenario.luz || prev;
    // Modo pintado (WP1): la capa estática se dibuja con el pincel vectorial (como en P3) y luego se repinta por trazos
    // sobre el lienzo ya dibujado; el repintado va ANTES del desenfoque de profundidad de campo.
    const repintar = I.MODO === 'pintado' && !!I.Pintura && capa.repintar !== false;
    const modoPrev = I.MODO; if (repintar) I.MODO = 'vector';
    try { capa.dibujar(cx, 0); } finally { I.MODO = modoPrev; }
    I.luzActual = prev;
    if (repintar) {
      const def = { tam: capa.z > 2 ? 9 : 12, alfa: capa.desenfoque > 1 ? 0.4 : 0.6, semilla: 7 + Math.floor(capa.z * 10) };
      I.Pintura.repintar(cv, Object.assign(def, capa.repintar));
    }
    if (capa.desenfoque) {
      // profundidad de campo: se desenfoca una sola vez al cachear
      const cv2 = document.createElement('canvas'); cv2.width = cv.width; cv2.height = cv.height;
      const c2 = cv2.getContext('2d'); c2.filter = 'blur(' + capa.desenfoque + 'px)'; c2.drawImage(cv, 0, 0);
      c2.filter = 'none';   // lección de P3: el lienzo cacheado no debe conservar el filtro de desenfoque
      c = { cv: cv2, x0, y0 }; this._cache.set(capa, c); return c;
    }
    c = { cv, x0, y0 }; this._cache.set(capa, c);
    return c;
  };

  // reflejo (suelo mojado) de una capa estática: espejo vertical en y=eje, desenfocado y desvanecido; se calcula una vez
  I.Escena.prototype._cacheReflejo = function (capa) {
    let r = this._cache.get(capa);
    if (r) return r;
    const c = this._cacheCapa(capa.reflejoDe), alto = capa.alto || 500, ey = capa.eje - c.y0;
    const cv = document.createElement('canvas'); cv.width = c.cv.width; cv.height = alto;
    const x = cv.getContext('2d');
    x.filter = 'blur(' + (capa.desenfoque == null ? 3 : capa.desenfoque) + 'px)';
    x.save(); x.translate(0, 0); x.scale(1, -(capa.escalaY || 1)); x.drawImage(c.cv, 0, -ey); x.restore();
    x.filter = 'none';
    x.globalCompositeOperation = 'destination-in';
    const g = x.createLinearGradient(0, 0, 0, alto); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, cv.width, alto);
    r = { cv, x0: c.x0 }; this._cache.set(capa, r);
    return r;
  };

  I.Escena.prototype.draw = function (ctx, t) {
    const W = I.ANCHO, H = I.ALTO, esc = this.escenario, cam = this.camara;
    const prevLuz = I.luzActual; I.luzActual = esc.luz || prevLuz;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = esc.fondo || '#2b3442'; ctx.fillRect(0, 0, W, H);
    for (const capa of esc.capas) {
      if (capa.imagen !== undefined) continue; // hueco de API: fondos externos (Fase futura)
      ctx.save();
      if (capa.actores) {
        cam.aplicar(ctx, t, 1);
        for (const a of this.actores) {
          const est = a.estado(t);
          if (est.oculto) continue;
          if (a.antes) a.antes(ctx, t, est);
          a.personaje.dibujar(ctx, t, est);
          if (a.despues) a.despues(ctx, t, est);
        }
      } else if (capa.pantalla) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        capa.dibujar(ctx, t, cam);
      } else {
        cam.aplicar(ctx, t, capa.z);
        if (capa.reflejoDe) { const r = this._cacheReflejo(capa); ctx.globalAlpha = capa.alfa == null ? 0.3 : capa.alfa; if (capa.modo) ctx.globalCompositeOperation = capa.modo; ctx.drawImage(r.cv, r.x0, capa.eje); }
        else if (capa.estatica) { const c = this._cacheCapa(capa); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c.cv, c.x0, c.y0); }
        else capa.dibujar(ctx, t, cam);
      }
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const p = this.post;
    if (p.lluvia) I.lluvia(ctx, t, p.lluvia === true ? {} : p.lluvia);
    if (this.extra) { ctx.save(); this.extra(ctx, t, this); ctx.restore(); }
    if (p.bloom) I.bloom(ctx, p.bloom === true ? {} : p.bloom);
    if (p.gradacion) I.gradacion(ctx, p.gradacion);
    if (p.vineta) I.vineta(ctx, { fuerza: p.vineta });
    const pintado = I.MODO === 'pintado', papel = p.papel === undefined ? (pintado ? 0.22 : false) : p.papel;
    if (papel && I.Pintura) I.Pintura.aplicarPapel(ctx, { fuerza: papel === true ? 0.22 : papel });
    if (p.grano) I.grano(ctx, t, { intensidad: pintado ? p.grano * 0.5 : p.grano });
    ctx.restore();
    I.luzActual = prevLuz;
  };

  // ---- contrato con el renderizador y vista previa
  I.listo = true;
  I.montar = function (escena, opciones = {}) {
    G.ESCENA = escena;
    const cv = document.getElementById('lienzo') || (() => { const c = document.createElement('canvas'); c.id = 'lienzo'; document.body.appendChild(c); return c; })();
    cv.width = I.ANCHO; cv.height = I.ALTO;
    const ctx = cv.getContext('2d');
    I.renderizarEn = function (canvas, t) {
      const c = (canvas || cv).getContext('2d');
      const t0 = performance.now();
      escena.draw(c, t);
      return performance.now() - t0;
    };
    const q = new URLSearchParams(location.search);
    if (q.has('t')) { I.renderizarEn(cv, parseFloat(q.get('t'))); return; }
    if (q.has('estatico') || opciones.estatico) { I.renderizarEn(cv, 0); return; }
    if (q.has('render')) { I.renderizarEn(cv, 0); return; } // lo controla render.py
    // vista previa en vivo (solo en navegador interactivo)
    let t0 = null;
    const bucle = (ms) => { if (t0 == null) t0 = ms; const t = ((ms - t0) / 1000) % escena.duracion; escena.draw(ctx, t); requestAnimationFrame(bucle); };
    requestAnimationFrame(bucle);
  };
  // zona segura superpuesta (para revisión)
  I.dibujarZona = function (ctx) {
    const Z = I.ZONA, W = I.ANCHO, H = I.ALTO;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255,0,0,0.18)';
    ctx.fillRect(0, 0, W, Z.arriba); ctx.fillRect(0, H - Z.abajo, W, Z.abajo); ctx.fillRect(0, 0, Z.izq, H); ctx.fillRect(W - Z.der, 0, Z.der, H);
    ctx.strokeStyle = 'rgba(0,255,120,0.8)'; ctx.lineWidth = 3; ctx.strokeRect(Z.izq, Z.dibujo[0], W - Z.izq - Z.der, Z.dibujo[1] - Z.dibujo[0]);
    ctx.strokeStyle = 'rgba(80,160,255,0.8)'; ctx.strokeRect(Z.izq, Z.subtitulos[0], W - Z.izq - Z.der, Z.subtitulos[1] - Z.subtitulos[0]);
    ctx.restore();
  };
})(window);

/* ===== reparto.js ===== */
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

/* ===== reparto_gente.js ===== */
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

/* ===== reparto_fauna.js ===== */
/* Ilustra — REPARTO: patito piloto de hule (Así se fabrica), tiburón y serpiente (¿Sobrevivirías?) en 2D estilizado.
   Cada uno: p.dibujar(ctx, t, estado) con estado = { x, y, dir, pose, expresion?, sombraSuelo, alto, luz, ... } (como el resto del reparto).
   (x, y) = punto de apoyo: patito -> línea de flotación bajo el centro; tiburón -> centro del cuerpo; serpiente -> suelo bajo el centro.
   Cargar tras reparto.js. Todo determinista en t. */
(function (G) {
  'use strict';
  const I = G.Ilustra, P = I.Pincel, R = I.REPARTO, PI = Math.PI;
  const tubo = R.tubo;
  const luzGuard = (e, fn) => { const prev = I.luzActual; if (e.luz) I.luzActual = e.luz; try { return fn(); } finally { I.luzActual = prev; } };
  // brillo de goma / piel húmeda: mancha suave dentro de un trazado
  function brillo(ctx, path, cx, cy, rx, ry, rot, alfa) {
    ctx.save(); ctx.clip(path); ctx.fillStyle = 'rgba(255,250,235,' + alfa + ')'; ctx.filter = 'blur(' + Math.max(1, Math.min(rx, ry) * 0.35) + 'px)';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, 7); ctx.fill(); ctx.restore();
  }

  // ============================================================== PATITO PILOTO
  const PATITO_POSES = {
    flotar: { bob: 0.014, incl: 0.06, frecIncl: 1.2, pico: 0.0, ala: -0.15, ojos: 'abiertos', agua: true },
    inclinarse: { bob: 0.01, incl: 0.3, frecIncl: 0.9, pico: 0.1, ala: -0.2, ojos: 'abiertos', agua: true },
    susto: { bob: 0.0, incl: -0.22, frecIncl: 0, pico: 0.9, ala: 0.9, ojos: 'susto', agua: true, tiembla: 1 },
    celebrar: { bob: 0, incl: 0.05, frecIncl: 0, pico: 0.6, ala: 1.5, ojos: 'feliz', agua: false, salta: 1 }
  };
  function Patito(o = {}) { this.o = Object.assign({ nombre: 'Patito piloto', altura: 300, semilla: 21, casco: 'aviador', color: '#f6c632', pico: '#ee8a2b' }, o); this.poses = PATITO_POSES; }
  Patito.prototype.dibujar = function (ctx, t, e) {
    return luzGuard(e, () => {
      const o = this.o, S = o.altura / 0.98, dir = e.dir || 1, s = o.semilla;
      const pz = typeof e.pose === 'string' || e.pose == null ? (PATITO_POSES[e.pose || 'flotar'] || PATITO_POSES.flotar) : e.pose;
      const p = Object.assign({}, pz, e.pose2 ? {} : {});
      let q = p;
      if (e.pose2 != null) { const b = PATITO_POSES[e.pose2], k = e.k || 0; q = {}; for (const c of ['bob', 'incl', 'pico', 'ala', 'tiembla', 'salta']) q[c] = I.lerp(p[c] || 0, b[c] || 0, k); q.ojos = k < 0.5 ? p.ojos : b.ojos; q.agua = k < 0.5 ? p.agua : b.agua; q.frecIncl = p.frecIncl; }
      const bob = Math.sin(t * 2.4 + s) * (q.bob || 0) * S;
      const incl = (e.inclinacion != null ? e.inclinacion : (q.incl || 0) + Math.sin(t * (q.frecIncl || 0) * 2 + s) * 0.05 * (q.frecIncl ? 1 : 0)) * dir;
      const salta = q.salta ? Math.abs(Math.sin(t * 5.5)) * 0.2 * S : 0;
      const tm = q.tiembla ? [I.ruido1(t * 40, s) * 0.007 * S, I.ruido1(t * 43, s + 1) * 0.006 * S] : [0, 0];
      const alto = (e.alto || 0) + salta, agua = e.agua != null ? e.agua : q.agua;
      const casco = e.casco != null ? e.casco : o.casco;
      const ojos = e.ojos || q.ojos, pico = e.pico != null ? e.pico : (q.pico || 0), ala = e.ala != null ? e.ala : (q.ala || 0) + (q.salta ? Math.sin(t * 11) * 0.35 : 0);
      const col = o.color;
      // sombra / ondas
      if (agua) {
        ctx.save(); ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) { const k = ((t * 0.5 + i / 3) % 1); ctx.strokeStyle = 'rgba(200,225,235,' + (0.5 * (1 - k)) + ')'; ctx.beginPath(); ctx.ellipse(e.x, e.y + S * 0.02, S * (0.5 + k * 0.45), S * (0.07 + k * 0.05), 0, 0, 7); ctx.stroke(); }
        ctx.restore();
      } else if (e.sombraSuelo !== false) R.sombraSuelo(ctx, e.x, e.y, S * 0.42, 0.5 * I.clamp(1 - alto / (S * 0.6), 0.2, 1));
      ctx.save(); ctx.translate(e.x + tm[0], e.y - alto + bob + tm[1]); ctx.rotate(incl); ctx.scale(dir, 1);
      // cuerpo + cola
      const cuerpo = P.elipse(0, -0.3 * S, 0.47 * S, 0.3 * S, 0, 40);
      const cola = P.suavizar([[-0.3 * S, -0.44 * S], [-0.52 * S, -0.62 * S], [-0.64 * S, -0.6 * S], [-0.56 * S, -0.44 * S], [-0.48 * S, -0.22 * S], [-0.3 * S, -0.16 * S]], 4);
      const est = { color: col, semilla: s + 1, volumen: 0.9, borde: 0.95, anchoBorde: 6, irregular: 0.5, textura: 0.12, sombraInterna: 0.5 };
      const pc = P.forma(ctx, [cuerpo, cola], est);
      brillo(ctx, pc, 0.1 * S, -0.46 * S, 0.2 * S, 0.06 * S, -0.15, 0.4);
      // ala
      ctx.save(); ctx.translate(-0.06 * S, -0.38 * S); ctx.rotate(-ala * dir * 0 - ala * 0.9);
      P.forma(ctx, P.suavizar([[0.05 * S, -0.02 * S], [-0.1 * S, -0.1 * S], [-0.3 * S, -0.1 * S], [-0.36 * S, 0.02 * S], [-0.2 * S, 0.12 * S], [0.0 * S, 0.1 * S]], 4), { color: I.oscurece(col, 0.06), semilla: s + 2, volumen: 0.8, borde: 0.8, anchoBorde: 4, irregular: 0.4, textura: 0.1, sombraInterna: 0.5 });
      ctx.restore();
      // cuello/cabeza
      const hx = 0.22 * S, hy = -0.72 * S, hr = 0.23 * S;
      const cab = P.forma(ctx, P.elipse(hx, hy, hr, hr * 0.97, 0, 40), Object.assign({}, est, { semilla: s + 3 }));
      brillo(ctx, cab, hx - 0.04 * S, hy - 0.11 * S, 0.1 * S, 0.045 * S, -0.5, 0.45);
      // pico (mandíbula inferior primero)
      const ab = pico * 0.075 * S;
      P.forma(ctx, P.suavizar([[hx + 0.15 * S, hy + 0.07 * S], [hx + 0.38 * S, hy + 0.08 * S + ab], [hx + 0.34 * S, hy + 0.14 * S + ab], [hx + 0.16 * S, hy + 0.15 * S + ab * 0.5]], 3), { color: I.oscurece(o.pico, 0.18), semilla: s + 4, volumen: 0.7, borde: 0.6, anchoBorde: 3, irregular: 0.2 });
      if (pico > 0.15) { ctx.fillStyle = I.css('#5a1f1c'); ctx.beginPath(); ctx.ellipse(hx + 0.26 * S, hy + 0.09 * S + ab * 0.55, 0.1 * S, ab * 0.5 + 1, 0, 0, 7); ctx.fill(); }
      const pu = P.forma(ctx, P.suavizar([[hx + 0.1 * S, hy - 0.02 * S], [hx + 0.3 * S, hy - 0.06 * S], [hx + 0.46 * S, hy - 0.01 * S], [hx + 0.44 * S, hy + 0.05 * S], [hx + 0.3 * S, hy + 0.08 * S], [hx + 0.12 * S, hy + 0.08 * S]], 4), { color: o.pico, semilla: s + 5, volumen: 0.85, borde: 0.95, anchoBorde: 4, irregular: 0.3, textura: 0.1, sombraInterna: 0.4 });
      ctx.fillStyle = 'rgba(120,50,15,0.7)'; ctx.beginPath(); ctx.ellipse(hx + 0.38 * S, hy - 0.02 * S, 0.012 * S, 0.008 * S, 0.3, 0, 7); ctx.fill();
      brillo(ctx, pu, hx + 0.26 * S, hy - 0.04 * S, 0.1 * S, 0.018 * S, -0.1, 0.4);
      // ojos
      const ojo = (x, y, r, far) => {
        if (ojos === 'feliz') { ctx.strokeStyle = I.css('#2a1a10'); ctx.lineWidth = S * 0.017; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y + r * 0.35, r * 0.85, PI * 1.1, PI * 1.9); ctx.stroke(); return; }
        const rr = ojos === 'susto' ? r * 1.3 : r;
        P.forma(ctx, P.elipse(x, y, rr, rr * 1.08, 0, 20), { color: '#fbf6ea', semilla: s + 6, volumen: 0.3, borde: 0.3, irregular: 0, textura: 0, anchoBorde: 2, sombraInterna: 0.3, contorno: '#2a1a10', anchoContorno: 2 });
        const pr = ojos === 'susto' ? rr * 0.3 : rr * 0.55;
        const jx = ojos === 'susto' ? I.ruido1(t * 30, s) * rr * 0.1 : 0;
        ctx.fillStyle = I.css('#1c120d'); ctx.beginPath(); ctx.ellipse(x + rr * 0.2 + jx, y + rr * 0.08, pr, pr * 1.1, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(x + rr * 0.35 + jx, y - rr * 0.2, rr * 0.18, 0, 7); ctx.fill();
      };
      ojo(hx + 0.03 * S, hy - 0.06 * S, 0.075 * S, false); ojo(hx + 0.19 * S, hy - 0.075 * S, 0.062 * S, true);
      if (ojos === 'susto') { ctx.strokeStyle = I.css('#2a1a10'); ctx.lineWidth = S * 0.012; ctx.lineCap = 'round'; for (const [x, y] of [[hx + 0.03 * S, hy - 0.06 * S], [hx + 0.19 * S, hy - 0.075 * S]]) { ctx.beginPath(); ctx.moveTo(x - 0.06 * S, y - 0.11 * S); ctx.lineTo(x + 0.05 * S, y - 0.13 * S - 0.01 * S); ctx.stroke(); } }
      // casco
      if (casco === 'aviador') {
        const g = P.suavizar([[hx + 0.2 * S, hy - 0.17 * S], [hx + 0.05 * S, hy - 0.26 * S], [hx - 0.15 * S, hy - 0.2 * S], [hx - 0.25 * S, hy - 0.02 * S], [hx - 0.23 * S, hy + 0.12 * S], [hx - 0.12 * S, hy + 0.18 * S], [hx - 0.06 * S, hy + 0.02 * S], [hx + 0.02 * S, hy - 0.1 * S]], 4);
        const pc2 = P.forma(ctx, g, { color: '#8b5a37', semilla: s + 7, volumen: 0.85, borde: 0.9, anchoBorde: 4, irregular: 0.5, textura: 0.5, sombraInterna: 0.5 });
        brillo(ctx, pc2, hx - 0.03 * S, hy - 0.19 * S, 0.08 * S, 0.025 * S, -0.3, 0.35);
        ctx.strokeStyle = I.css('#2a1b12'); ctx.lineWidth = S * 0.014; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx - 0.12 * S, hy + 0.16 * S); ctx.quadraticCurveTo(hx + 0.06 * S, hy + 0.3 * S, hx + 0.16 * S, hy + 0.2 * S); ctx.stroke();
        // gafas sobre la frente
        ctx.strokeStyle = I.css('#2a1b12'); ctx.lineWidth = S * 0.02; ctx.beginPath(); ctx.moveTo(hx - 0.2 * S, hy - 0.12 * S); ctx.quadraticCurveTo(hx - 0.02 * S, hy - 0.22 * S, hx + 0.17 * S, hy - 0.16 * S); ctx.stroke();
        for (const dx of [0.0, 0.14]) { P.forma(ctx, P.elipse(hx + dx * S, hy - 0.185 * S, 0.055 * S, 0.05 * S, 0, 16), { color: '#c9d9de', alfa: 0.7, semilla: s + 8, volumen: 0.4, borde: 0.3, irregular: 0, textura: 0, anchoBorde: 2, contorno: '#2a1b12', anchoContorno: S * 0.018 }); }
      } else if (casco === 'redondo') {
        const g = P.suavizar([[hx + 0.22 * S, hy - 0.1 * S], [hx + 0.12 * S, hy - 0.25 * S], [hx - 0.1 * S, hy - 0.28 * S], [hx - 0.25 * S, hy - 0.1 * S], [hx - 0.25 * S, hy - 0.02 * S], [hx + 0.2 * S, hy - 0.04 * S]], 4);
        const pc2 = P.forma(ctx, g, { color: '#d54a38', semilla: s + 7, volumen: 0.9, borde: 0.95, anchoBorde: 5, irregular: 0.3, textura: 0.1, sombraInterna: 0.5 });
        ctx.save(); ctx.clip(pc2); ctx.fillStyle = 'rgba(250,240,225,0.85)'; ctx.fillRect(hx - 0.04 * S, hy - 0.4 * S, 0.06 * S, 0.4 * S); ctx.restore();
        brillo(ctx, pc2, hx - 0.0 * S, hy - 0.2 * S, 0.1 * S, 0.03 * S, -0.2, 0.5);
      }
      // gotas de sudor en el susto
      if (ojos === 'susto') { for (let i = 0; i < 2; i++) { const k = (t * 1.5 + i * 0.5) % 1; ctx.fillStyle = 'rgba(190,225,245,' + (0.9 * (1 - k)) + ')'; ctx.beginPath(); ctx.ellipse(hx - 0.2 * S - i * 0.06 * S, hy - 0.1 * S + k * 0.14 * S, 0.014 * S, 0.026 * S, 0, 0, 7); ctx.fill(); } }
      ctx.restore();
      // agua por delante
      if (agua) {
        ctx.save(); ctx.translate(e.x, e.y);
        const w = S * 0.75, pts = [];
        for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([-w + 2 * w * u, -S * 0.065 + Math.sin(u * 12 + t * 2.2) * S * 0.008 + bob * 0.3]); }
        ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.lineTo(w, S * 0.1); ctx.lineTo(-w, S * 0.1); ctx.closePath();
        const gg = ctx.createLinearGradient(0, -S * 0.07, 0, S * 0.1); gg.addColorStop(0, 'rgba(120,160,180,0.55)'); gg.addColorStop(1, 'rgba(60,90,110,0.5)');
        ctx.fillStyle = gg; ctx.fill();
        ctx.strokeStyle = 'rgba(230,245,250,0.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
        ctx.restore();
      }
    });
  };
  R.patito = function (o) { return new Patito(o); };
  R.Patito = Patito;

  // ============================================================== helpers de animales
  // vientre claro: polígono entre el contorno inferior del tubo y una línea sobre el eje
  function vientre(pts, rad, frac, desde = 0, hasta = 1) {
    const m = pts.length, i0 = Math.floor(desde * (m - 1)), i1 = Math.ceil(hasta * (m - 1)), baja = [], sube = [];
    for (let i = i0; i <= i1; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)], th = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const nx = Math.sin(th), ny = -Math.cos(th);
      baja.push([pts[i][0] - nx * rad[i] * 0.99, pts[i][1] - ny * rad[i] * 0.99]);
      sube.push([pts[i][0] - nx * rad[i] * frac, pts[i][1] - ny * rad[i] * frac]);
    }
    return baja.concat(sube.reverse());
  }

  // ============================================================== TIBURÓN
  const TIBURON_POSES = {
    nada: { boca: 0.0, frec: 3.2, amp: 1, inc: 0.0 },
    ataca: { boca: 1.0, frec: 5.2, amp: 1.25, inc: -0.2 },
    acecha: { boca: 0.0, frec: 2.4, amp: 0.8, inc: 0.0, solo_aleta: true }
  };
  function Tiburon(o = {}) { this.o = Object.assign({ nombre: 'Tiburón', largo: 620, semilla: 51, color: '#6f8ea6', vientre: '#dfe6e8' }, o); this.poses = TIBURON_POSES; }
  Tiburon.prototype.dibujar = function (ctx, t, e) {
    return luzGuard(e, () => {
      const o = this.o, L = o.largo, dir = e.dir || 1, s = o.semilla;
      const nombre = typeof e.pose === 'string' || e.pose == null ? (e.pose || 'nada') : null;
      let q = nombre ? TIBURON_POSES[nombre] || TIBURON_POSES.nada : e.pose;
      if (e.pose2 != null) { const b = TIBURON_POSES[e.pose2], k = e.k || 0, r = {}; for (const c of ['boca', 'frec', 'amp', 'inc']) r[c] = I.lerp(q[c], b[c], k); r.solo_aleta = k < 0.5 ? q.solo_aleta : b.solo_aleta; q = r; }
      const boca = e.boca != null ? e.boca : q.boca, fase = t * q.frec, amp = q.amp;
      const col = o.color;
      ctx.save(); ctx.translate(e.x, e.y - (e.alto || 0)); ctx.rotate((e.inclinacion != null ? e.inclinacion : q.inc) * dir); ctx.scale(dir, 1);
      // eje y radios
      const n = 30, pts = [], rad = [];
      const sp = u => { // u: 0 cola .. 1 morro
        const a = L * 0.07 * amp * Math.sin(fase - u * 5.2) * Math.pow(1 - u, 1.4);
        return [(-0.5 + u) * L, a];
      };
      const perfil = u => { // radio relativo
        const v = Math.min(1, u / 0.62), w = u > 0.62 ? Math.pow(1 - (u - 0.62) / 0.38, 0.62) : Math.sin(v * PI / 2) ** 0.8 * 0.85 + 0.15 * v;
        return L * (0.02 + 0.092 * w * (u > 0.62 ? 1 : 1));
      };
      for (let i = 0; i < n; i++) { const u = i / (n - 1); pts.push(sp(u)); rad.push(Math.max(L * 0.012, perfil(u) * (u < 0.14 ? 0.55 + u * 3 : 1))); }
      const topAt = u => { const i = Math.round(u * (n - 1)); return [pts[i][0], pts[i][1] - rad[i]]; };
      const aTail = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) + PI; // dirección de la cola (hacia atrás)
      const solo = q.solo_aleta && e.pose2 == null && e.cuerpoVisible !== true;
      if (!solo) {
        // aleta pectoral lejana
        const pf = pts[Math.round(0.68 * (n - 1))];
        const aleta = (x, y, ang, k, c) => P.forma(ctx, P.suavizar([[x + L * 0.025 * k, y], [x - L * 0.015 * k, y + L * 0.07 * k], [x - L * 0.115 * k, y + L * 0.155 * k], [x - L * 0.1 * k, y + L * 0.06 * k], [x - L * 0.07 * k, y - L * 0.004]], 4), { color: c, semilla: s + 1, volumen: 0.8, borde: 0.7, anchoBorde: 4, irregular: 0.5, textura: 0.2 });
        aleta(pf[0] + L * 0.045, pf[1] + rad[Math.round(0.68 * (n - 1))] * 0.55, 0, 0.78, I.oscurece(col, 0.25));
        // cola (dos lóbulos)
        const t0 = pts[0], cx = t0[0], cy = t0[1];
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(aTail - PI);
        P.forma(ctx, P.suavizar([[L * 0.03, 0], [-L * 0.1, -L * 0.1], [-L * 0.2, -L * 0.2], [-L * 0.17, -L * 0.1], [-L * 0.13, 0], [-L * 0.17, L * 0.07], [-L * 0.22, L * 0.1], [-L * 0.09, L * 0.04]], 4), { color: col, semilla: s + 2, volumen: 0.85, borde: 0.9, anchoBorde: 4, irregular: 0.8, textura: 0.2, sombraInterna: 0.5 });
        ctx.restore();
        // cuerpo
        const cuerpo = tubo(pts, rad);
        const pc = P.forma(ctx, cuerpo, { color: col, semilla: s + 3, volumen: 0.9, borde: 0.95, anchoBorde: 6, irregular: 0.9, textura: 0.2, sombraInterna: 0.55 });
        const vi = vientre(pts, rad, 0.05, 0.12, 0.99);
        ctx.save(); ctx.clip(pc);
        P.forma(ctx, vi, { color: o.vientre, semilla: s + 4, volumen: 0.8, borde: 0.4, anchoBorde: 3, irregular: 1.2, textura: 0.2, sombraInterna: 0.2 });
        ctx.restore();
        // branquias
        ctx.save(); ctx.strokeStyle = I.css(I.oscurece(col, 0.5), 0.7); ctx.lineWidth = L * 0.005; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const u = 0.66 + i * 0.022, k = Math.round(u * (n - 1)), p0 = pts[k], r = rad[k]; ctx.beginPath(); ctx.moveTo(p0[0], p0[1] - r * 0.35); ctx.quadraticCurveTo(p0[0] - L * 0.012, p0[1], p0[0] + L * 0.004, p0[1] + r * 0.4); ctx.stroke(); }
        ctx.restore();
        brillo(ctx, pc, pts[Math.round(0.6 * (n - 1))][0], pts[Math.round(0.6 * (n - 1))][1] - rad[Math.round(0.6 * (n - 1))] * 0.6, L * 0.14, L * 0.012, 0.0, 0.3);
        // aleta pectoral cercana
        aleta(pf[0] + L * 0.0, pf[1] + rad[Math.round(0.68 * (n - 1))] * 0.72, 0, 1, col);
        // aleta pélvica
        const pv = pts[Math.round(0.34 * (n - 1))];
        P.forma(ctx, P.suavizar([[pv[0], pv[1] + rad[Math.round(0.34 * (n - 1))] * 0.8], [pv[0] - L * 0.05, pv[1] + L * 0.09], [pv[0] - L * 0.01, pv[1] + L * 0.06], [pv[0] + L * 0.03, pv[1] + rad[Math.round(0.34 * (n - 1))] * 0.8]], 3), { color: I.oscurece(col, 0.12), semilla: s + 5, volumen: 0.7, borde: 0.6, anchoBorde: 3, irregular: 0.4 });
      }
      // aleta dorsal
      const d0 = topAt(0.52), d1 = topAt(0.66), dh = L * (solo ? 0.19 : 0.15);
      P.forma(ctx, P.suavizar([[d0[0] + L * 0.01, d0[1] + L * 0.01], [d0[0] + L * 0.025, d0[1] - dh * 0.6], [d1[0] - L * 0.045, d0[1] - dh], [d1[0] - L * 0.02, d0[1] - dh * 0.55], [d1[0] + L * 0.015, d1[1] + L * 0.012]], 4), { color: col, semilla: s + 6, volumen: 0.85, borde: 0.95, anchoBorde: 5, irregular: 0.6, textura: 0.2, sombraInterna: 0.45 });
      if (!solo) {
        const d2 = topAt(0.26);
        P.forma(ctx, P.suavizar([[d2[0] + L * 0.03, d2[1] + L * 0.005], [d2[0] - L * 0.01, d2[1] - L * 0.045], [d2[0] - L * 0.05, d2[1] + L * 0.005]], 3), { color: I.oscurece(col, 0.1), semilla: s + 7, volumen: 0.7, borde: 0.7, irregular: 0.3, anchoBorde: 3 });
        // cabeza: ojo y boca
        const ne = pts[n - 1], re = rad[n - 1], k8 = Math.round(0.9 * (n - 1)), p8 = pts[k8], r8 = rad[k8];
        const eye = [p8[0] + L * 0.012, p8[1] - r8 * 0.25];
        ctx.fillStyle = I.css('#0f1114'); ctx.beginPath(); ctx.arc(eye[0], eye[1], L * 0.013, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(eye[0] + L * 0.004, eye[1] - L * 0.004, L * 0.004, 0, 7); ctx.fill();
        // boca
        const M = [pts[Math.round(0.84 * (n - 1))][0] - L * 0.02, pts[Math.round(0.84 * (n - 1))][1] + r8 * 0.25], Nn = [ne[0] - L * 0.003, ne[1] + re * 0.2];
        const gape = boca * L * 0.075;
        if (boca > 0.04) {
          const J = [Nn[0] - L * 0.02, Nn[1] + gape + L * 0.01];
          ctx.fillStyle = I.css('#4a1218'); ctx.beginPath(); ctx.moveTo(M[0], M[1]); ctx.quadraticCurveTo((M[0] + Nn[0]) / 2, M[1] - L * 0.002, Nn[0], Nn[1]); ctx.lineTo(J[0], J[1]); ctx.quadraticCurveTo((M[0] + J[0]) / 2, M[1] + gape * 0.9, M[0], M[1]); ctx.fill();
          ctx.fillStyle = I.css('#f2ece0');
          for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6, x = I.lerp(M[0] + L * 0.01, Nn[0] - L * 0.004, u), y = I.lerp(M[1], Nn[1], u) + 1; ctx.beginPath(); ctx.moveTo(x - L * 0.007, y); ctx.lineTo(x + L * 0.007, y); ctx.lineTo(x, y + L * 0.02 * (0.7 + 0.3 * Math.sin(i * 2.1))); ctx.fill(); }
          for (let i = 0; i < 5; i++) { const u = (i + 0.5) / 5, x = I.lerp(M[0] + L * 0.015, J[0] - L * 0.003, u), y = I.lerp(M[1] + gape * 0.5, J[1], u); ctx.beginPath(); ctx.moveTo(x - L * 0.006, y); ctx.lineTo(x + L * 0.006, y); ctx.lineTo(x, y - L * 0.017); ctx.fill(); }
          P.forma(ctx, [M, [M[0] + L * 0.04, M[1] + gape * 0.5 + L * 0.03], [J[0] + L * 0.01, J[1] + L * 0.012], J], { color: o.vientre, semilla: s + 8, volumen: 0.7, borde: 0.5, irregular: 0.4, anchoBorde: 2, alfa: 0.0 });
        } else {
          ctx.strokeStyle = I.css(I.oscurece(col, 0.65), 0.9); ctx.lineWidth = L * 0.005; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(M[0], M[1]); ctx.quadraticCurveTo((M[0] + Nn[0]) / 2, M[1] + L * 0.013, Nn[0], Nn[1] - L * 0.002); ctx.stroke();
        }
      }
      ctx.restore();
      // agua: línea de flotación opcional (parche con los bordes difuminados)
      if (e.agua) {
        const w = L * 0.8, yw = e.nivel != null ? e.nivel : solo_aguaNivel(q, L), hh = L * 0.5, au = I.capaAux('repartoAgua', Math.ceil(w * 2), Math.ceil(hh)), x = au.ctx;
        x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, au.canvas.width, au.canvas.height);
        const pts2 = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts2.push([2 * w * u, 10 + Math.sin(u * 20 + t * 2) * L * 0.006]); }
        x.beginPath(); pts2.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.lineTo(2 * w, hh); x.lineTo(0, hh); x.closePath();
        const gg = x.createLinearGradient(0, 0, 0, hh); gg.addColorStop(0, 'rgba(80,120,145,0.65)'); gg.addColorStop(1, 'rgba(30,55,75,0.0)'); x.fillStyle = gg; x.fill();
        x.strokeStyle = 'rgba(228,242,250,0.65)'; x.lineWidth = 3; x.beginPath(); pts2.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
        x.globalCompositeOperation = 'destination-in'; const hg = x.createLinearGradient(0, 0, 2 * w, 0); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.18, 'rgba(0,0,0,1)'); hg.addColorStop(0.82, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = hg; x.fillRect(0, 0, 2 * w, hh);
        x.globalCompositeOperation = 'source-over';
        ctx.drawImage(au.canvas, e.x - w, e.y - (e.alto || 0) + yw - 10);
      }
    });
  };
  function solo_aguaNivel(q, L) { return q.solo_aleta ? -L * 0.015 : -L * 0.2; }
  R.tiburon = function (o) { return new Tiburon(o); };
  R.Tiburon = Tiburon;

  // ============================================================== SERPIENTE
  const SERP_POSES = {
    repta: { alza: 0, boca: 0, frec: 3.0, amp: 1 },
    ataca: { alza: 1, boca: 1, frec: 4.5, amp: 0.8 },
    alerta: { alza: 1, boca: 0, frec: 2.0, amp: 0.6 }
  };
  function Serpiente(o = {}) { this.o = Object.assign({ nombre: 'Serpiente', largo: 520, semilla: 61, color: '#4b7a3a', dibujo: '#2a4a24', vientre: '#d8c98a' }, o); this.poses = SERP_POSES; }
  Serpiente.prototype.dibujar = function (ctx, t, e) {
    return luzGuard(e, () => {
      const o = this.o, L = o.largo, dir = e.dir || 1, s = o.semilla;
      let q = typeof e.pose === 'string' || e.pose == null ? (SERP_POSES[e.pose || 'repta'] || SERP_POSES.repta) : e.pose;
      if (e.pose2 != null) { const b = SERP_POSES[e.pose2], k = e.k || 0, r = {}; for (const c of ['alza', 'boca', 'frec', 'amp']) r[c] = I.lerp(q[c], b[c], k); q = r; }
      const alza = e.alza != null ? e.alza : q.alza, boca = e.boca != null ? e.boca : q.boca, fase = t * q.frec, amp = q.amp;
      const ataque = e.ataque || 0; // 0..1 embestida hacia delante
      if (e.sombraSuelo !== false) R.sombraSuelo(ctx, e.x, e.y, L * 0.5, 0.45);
      ctx.save(); ctx.translate(e.x, e.y - (e.alto || 0)); ctx.scale(dir, 1);
      // eje: cola en el suelo con ondulación, cuello que se alza en S
      const claves = [], nC = 40, pts = [], rad = [];
      const base = u => { // u 0 cola .. 1 cabeza
        const x0 = (-0.5 + u) * L * (1 - alza * 0.45 * u);
        const ond = Math.sin(fase * 1 - u * 14) * L * 0.028 * amp * (1 - alza * Math.pow(u, 1.5));
        return [x0, -L * 0.03 + ond];
      };
      for (let i = 0; i < nC; i++) {
        const u = i / (nC - 1);
        let p = base(u);
        if (alza > 0) {
          const k = I.clamp((u - 0.45) / 0.55, 0, 1), kk = k * k * (3 - 2 * k);
          p = [p[0] + L * 0.1 * Math.sin(kk * PI * 0.9) * alza * 0.8 + ataque * L * 0.25 * kk, p[1] - kk * L * 0.5 * alza + Math.sin(kk * PI) * L * 0.0];
        }
        pts.push(p);
        const r = L * (0.012 + 0.03 * Math.sin(Math.min(1, u / 0.7) * PI / 2 * 0.95 + 0.0) * (u > 0.86 ? 1 - (u - 0.86) * 3 : 1));
        rad.push(Math.max(L * 0.01, r));
      }
      // cola fina
      for (let i = 0; i < 6; i++) rad[i] *= 0.5 + i * 0.09;
      const cuerpo = tubo(pts, rad);
      const pc = P.forma(ctx, cuerpo, { color: o.color, semilla: s + 1, volumen: 0.95, borde: 0.95, anchoBorde: 5, irregular: 0.6, textura: 0.3, sombraInterna: 0.55 });
      ctx.save(); ctx.clip(pc);
      P.forma(ctx, vientre(pts, rad, -0.05, 0.05, 0.93), { color: o.vientre, semilla: s + 2, volumen: 0.7, borde: 0.2, irregular: 0.8, textura: 0.25, sombraInterna: 0.2, anchoBorde: 2 });
      // rombos del lomo
      for (let i = 4; i < nC - 5; i += 3) {
        const a = pts[i - 1], b = pts[i + 1], th = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = Math.sin(th), ny = -Math.cos(th), r = rad[i];
        const cx = pts[i][0] + nx * r * 0.35, cy = pts[i][1] + ny * r * 0.35;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(th); ctx.fillStyle = I.css(o.dibujo, 0.75);
        ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(0, -r * 0.55); ctx.lineTo(r * 0.9, 0); ctx.lineTo(0, r * 0.55); ctx.closePath(); ctx.fill();
        ctx.fillStyle = I.css('#d8b23c', 0.7); ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, 7); ctx.fill(); ctx.restore();
      }
      ctx.restore();
      brillo(ctx, pc, pts[Math.round(nC * 0.5)][0], pts[Math.round(nC * 0.5)][1] - rad[Math.round(nC * 0.5)] * 0.55, L * 0.12, L * 0.006, 0.1, 0.3);
      // cabeza
      const hp = pts[nC - 1], hb = pts[nC - 3], th = Math.atan2(hp[1] - hb[1], hp[0] - hb[0]);
      const hr = L * 0.042;
      ctx.save(); ctx.translate(hp[0], hp[1]); ctx.rotate(th + (alza > 0.1 ? 0.5 * alza : 0));
      // mandíbula inferior (se abre)
      const ab = boca * L * 0.05;
      P.forma(ctx, P.suavizar([[-hr * 0.6, hr * 0.2], [hr * 1.1, hr * 0.35 + ab], [hr * 2.0, hr * 0.5 + ab * 1.1], [hr * 1.9, hr * 0.15 + ab * 0.7], [hr * 0.6, -hr * 0.05]], 3), { color: o.vientre, semilla: s + 3, volumen: 0.7, borde: 0.5, irregular: 0.3, anchoBorde: 3 });
      if (boca > 0.1) { ctx.fillStyle = I.css('#4a1218'); ctx.beginPath(); ctx.moveTo(hr * 0.2, hr * 0.1); ctx.lineTo(hr * 1.9, hr * 0.25); ctx.lineTo(hr * 1.9, hr * 0.5 + ab * 0.8); ctx.lineTo(hr * 0.3, hr * 0.4 + ab * 0.5); ctx.fill();
        // colmillo inferior y lengua
        ctx.fillStyle = I.css('#f4eee2'); ctx.beginPath(); ctx.moveTo(hr * 1.5, hr * 0.3 + ab * 0.2); ctx.lineTo(hr * 1.6, hr * 0.3 + ab * 0.2); ctx.lineTo(hr * 1.55, hr * 0.6 + ab * 0.45); ctx.fill();
        const lg = (Math.sin(t * 16) * 0.5 + 0.5) * hr * 0.4; ctx.strokeStyle = I.css('#d63a4a'); ctx.lineWidth = Math.max(2, hr * 0.12); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hr * 1.7, hr * 0.35 + ab * 0.2); ctx.lineTo(hr * 2.5 + lg, hr * 0.4 + ab * 0.35); ctx.moveTo(hr * 2.5 + lg, hr * 0.4 + ab * 0.35); ctx.lineTo(hr * 2.9 + lg, hr * 0.25 + ab * 0.2); ctx.moveTo(hr * 2.5 + lg, hr * 0.4 + ab * 0.35); ctx.lineTo(hr * 2.9 + lg, hr * 0.6 + ab * 0.5); ctx.stroke(); }
      const cr = P.forma(ctx, P.suavizar([[-hr * 0.9, -hr * 0.1], [-hr * 0.5, -hr * 0.95], [hr * 0.6, -hr * 1.0], [hr * 1.7, -hr * 0.55], [hr * 2.15, hr * 0.0], [hr * 2.0, hr * 0.25], [hr * 0.8, hr * 0.2], [-hr * 0.5, hr * 0.55]], 4), { color: o.color, semilla: s + 4, volumen: 0.95, borde: 0.95, anchoBorde: 4, irregular: 0.4, textura: 0.3, sombraInterna: 0.5 });
      brillo(ctx, cr, hr * 0.4, -hr * 0.65, hr * 0.7, hr * 0.12, 0.05, 0.35);
      // colmillo superior
      if (boca > 0.1) { ctx.fillStyle = I.css('#f4eee2'); ctx.beginPath(); ctx.moveTo(hr * 1.55, hr * 0.2); ctx.lineTo(hr * 1.68, hr * 0.2); ctx.lineTo(hr * 1.6, hr * 0.62); ctx.fill(); }
      // ojo de pupila rasgada
      P.forma(ctx, P.elipse(hr * 0.95, -hr * 0.32, hr * 0.34, hr * 0.3, 0, 16), { color: '#e6c53b', semilla: s + 5, volumen: 0.4, borde: 0.3, irregular: 0, textura: 0, anchoBorde: 2, contorno: '#1a1a12', anchoContorno: 1.5 });
      ctx.fillStyle = I.css('#111'); ctx.beginPath(); ctx.ellipse(hr * 1.0, -hr * 0.32, hr * 0.07, hr * 0.26, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = I.css('#1a2a16', 0.8); ctx.lineWidth = Math.max(2, hr * 0.12); ctx.beginPath(); ctx.moveTo(hr * 0.55, -hr * 0.62); ctx.lineTo(hr * 1.4, -hr * 0.5); ctx.stroke();
      ctx.restore();
      ctx.restore();
    });
  };
  R.serpiente = function (o) { return new Serpiente(o); };
  R.Serpiente = Serpiente;
})(window);
