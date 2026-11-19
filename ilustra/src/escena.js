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
