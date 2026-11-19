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
