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
