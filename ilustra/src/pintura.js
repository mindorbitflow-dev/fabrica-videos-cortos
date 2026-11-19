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
