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
