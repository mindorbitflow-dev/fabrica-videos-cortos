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
