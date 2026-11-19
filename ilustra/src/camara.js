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
