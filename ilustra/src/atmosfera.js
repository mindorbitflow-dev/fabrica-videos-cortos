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
