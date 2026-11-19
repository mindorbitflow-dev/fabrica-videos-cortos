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
