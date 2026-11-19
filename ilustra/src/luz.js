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
