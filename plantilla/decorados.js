// DECORADOS Y PROPS del motor de ilustración (kit Fase 1: I.Pincel con volumen, luz de borde y textura; luz cálida I.Luz; mapa de luz).
// Cargar tras sombra_ilustra.js. Global `D`. Todo es determinista (T = segundos del video, semilla); lo estático se cachea en lienzos
// fuera de pantalla (un cuadro cuesta ~10-40 ms), así que NO dibujes a mano fondos ni objetos que existan aquí: compón estas piezas.
//   FONDOS  D.fondo.<tipo>(ctx, T, o)  — ocupan todo el cuadro; el suelo queda en y=1250 como S30.oficina. o: {semilla, luz:0-1, hora:'dia'|'atardecer'|'noche'}
//     calle {clima:'seco'|'lluvia'|'niebla', anio}  juntas  fabrica  tienda  banco  laboratorio  estudio  oficina (=S30.oficina)
//     exterior {tipo:'campo'|'mina'|'cantera'}  cielo {nubes}  abstracto {tema:'azul'|'tierra'|'salvia'|'ciruela'|'noche', x, y}  (para infografías y frases)
//   PROPS   D.<prop>(ctx, x, y, s, o)  — (x, y) = punto de apoyo inferior central (joya, reloj y engranaje: centro); s = escala; o.T = tiempo.
//     joya(r){oro,gira,tipo:'diamante'|'anillo'}  vitrina{ancho,alto,joya}  cajon{cierra}→{x,y}  candado  papel/periodico/anuncio(w,h){giro,titular,lineas}  sello{texto:'MITO'|'VERDAD'|'MEDIA VERDAD',golpe:0-1}
//     monedas{n}  billetes{n}  caja_registradora  camaraCine  foco{ang}  engranaje(r){vel}  maquina  camion  fachada{letrero,color}  puertaLetrero{texto}
//     reloj(r){hora}  telefono  celular{tipo:'mensaje'|'llamada'|'banco',quien,texto,alerta,k}  grafica{valores,progreso,tipo:'barras'|'linea'}  pizarra{dibuja(ctx,w,h)}  mesaJuntas{ancho}  mesa  estante{ancho,alto}  caja  mina{niveles}
//   Todas usan los colores apagados de S30.C y la luz de S30.LUZ. Componer: varios props por escena + S30.hombre (gente) + S30.pelicula al final.
(() => {
  if (!window.S30 || !window.Ilustra || !Ilustra.REPARTO || !Ilustra.Pincel || window.S30_NOIR) return;
  const I = Ilustra, P = I.Pincel, { W, H, TAU, clamp, lerp, hash, azar } = K, C = S30.C, LUZ = S30.LUZ;
  const SUELO = 1250, M = 80;       // M = margen de los fondos cacheados (por si la cámara se aleja un poco)
  const css = I.css, mz = I.mezcla, ac = I.aclara, os = I.oscurece;
  const q8 = v => typeof v === 'number' ? Math.round(v * 8) / 8 : v;
  const clave = (n, ...a) => n + '|' + a.map(v => JSON.stringify(v, (k, x) => k === 'T' || typeof x === 'function' ? undefined : q8(x))).join('|');

  // ---- caché de lienzos
  const memo = new Map();
  function bmp(key, w, h, ax, ay, dib) {
    let c = memo.get(key); if (c) return c;
    const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.ceil(w)); cv.height = Math.max(2, Math.ceil(h));
    const cx = cv.getContext('2d'); cx.translate(ax, ay);
    const prev = I.luzActual; I.luzActual = LUZ;
    try { dib(cx); } finally { I.luzActual = prev; }
    c = { cv, ax, ay }; memo.set(key, c); return c;
  }
  // Prop con caché: bb = [x0, y0, x1, y1] relativo al punto de apoyo con s = 1; dib(cx, s, o) dibuja en (0, 0); vivo(ctx, x, y, s, o, T) pinta lo animado.
  function prop(nombre, bb, dib, vivo) {
    return (ctx, x, y, s = 1, o = {}) => {
      const sq = Math.max(.125, Math.round(s * 8) / 8), k = clave(nombre, sq, o), m = 50;
      const c = bmp(k, (bb[2] - bb[0]) * sq + 2 * m, (bb[3] - bb[1]) * sq + 2 * m, -bb[0] * sq + m, -bb[1] * sq + m, cx => dib(cx, sq, o));
      const f = s / sq;
      ctx.drawImage(c.cv, x - c.ax * f, y - c.ay * f, c.cv.width * f, c.cv.height * f);
      if (vivo) vivo(ctx, x, y, s, o, o.T || 0);
      return { x, y };
    };
  }
  const F = (cx, pts, color, o = {}) => P.forma(cx, pts, Object.assign({ color, semilla: 1, volumen: .55, borde: .5, textura: .3, irregular: .35, sombraInterna: .3 }, o));
  const R = (x, y, w, h, r = 0) => P.rect(x, y, w, h, r);
  const E = (x, y, rx, ry, rot = 0, n = 30) => P.elipse(x, y, rx, ry, rot, n);
  const PAL = { madera: '#8a6244', maderaOsc: '#5d4334', crema: '#e7dcc2', ambar: '#E0B060', laton: '#b8913f', hierro: '#3a4250', piedra: '#8e939c', ladrillo: '#9a5a46', salvia: '#7d9a7a', acero: '#4f6d8f', tinta: '#1d2230' };

  // ---- luz: mapa de luz cálido como el de la oficina (multiplica lo dibujado hasta aquí)
  function luzAmbiente(ctx, T, fuentes, oscuridad = '#8a8088') {
    const m = ctx.getTransform(), pant = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f], z = m.a;
    I.mapaLuz(ctx, fuentes.map(f => { const p = pant(f.x, f.y); return { x: p[0], y: p[1], r: f.r * z, fuerza: f.fuerza, color: f.color }; }), { oscuridad });
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of fuentes) if (f.halo) { const p = pant(f.x, f.y); I.halo(ctx, p[0], p[1], f.halo * z, f.colorHalo || '#ffb55e', .4); }
    ctx.restore();
  }

  // ---- fondos
  const D = window.D = { fondo: {}, bmp, prop, F };
  const CIELO = { dia: ['#8fa3b8', '#dccfb6'], atardecer: ['#5d6d8a', '#e0b88a'], noche: ['#1e2638', '#4a5470'] };
  function cieloBase(cx, hora, h = SUELO) {
    const [a, b] = CIELO[hora] || CIELO.dia, g = cx.createLinearGradient(0, -M, 0, h);
    g.addColorStop(0, css(os(a, .1))); g.addColorStop(1, css(b)); cx.fillStyle = g; cx.fillRect(-M, -M, W + 2 * M, h + M);
  }
  function suelo(cx, tipo, color, sm) {
    const g = cx.createLinearGradient(0, SUELO, 0, H + M); g.addColorStop(0, css(color)); g.addColorStop(1, css(os(color, .45)));
    cx.fillStyle = g; cx.fillRect(-M, SUELO - 2, W + 2 * M, H - SUELO + 2 * M + 2);
    F(cx, R(-M, SUELO - 2, W + 2 * M, 22), ac(color, .1), { semilla: sm, volumen: .6, borde: .8, irregular: 0 });
    cx.save(); cx.strokeStyle = css(os(color, .55), .45); cx.lineWidth = 2.5;
    if (tipo === 'baldosa') { for (let i = 0; i < 9; i++) { const y = SUELO + 20 + Math.pow(i, 1.6) * 14; cx.beginPath(); cx.moveTo(-M, y); cx.lineTo(W + M, y); cx.stroke(); } for (let x = -400; x < W + 400; x += 160) { cx.beginPath(); cx.moveTo(540 + (x - 540) * .35, SUELO + 20); cx.lineTo(540 + (x - 540) * 1.7, H + M); cx.stroke(); } }
    else if (tipo === 'concreto') { for (let x = -M; x < W + M; x += 260) { cx.beginPath(); cx.moveTo(x, SUELO + 20); cx.lineTo(x - 80, H + M); cx.stroke(); } }
    else { let y = SUELO + 24, p = 22; while (y < H + M) { cx.beginPath(); cx.moveTo(-M, y); cx.lineTo(W + M, y); cx.stroke(); p *= 1.2; y += p; } }
    cx.restore();
  }
  function pared(cx, color, sm, alto = SUELO) {
    const g = cx.createLinearGradient(0, -M, 0, alto); g.addColorStop(0, css(os(color, .32))); g.addColorStop(1, css(color));
    cx.fillStyle = g; cx.fillRect(-M, -M, W + 2 * M, alto + M);
    F(cx, R(-M, -M, W + 2 * M, alto + M), color, { semilla: sm, volumen: 0, borde: 0, sombraInterna: 0, textura: .6, irregular: 0, alfa: .32 });
  }
  function zocalo(cx, color, sm, h = 200) {
    F(cx, R(-M, SUELO - h, W + 2 * M, h), color, { semilla: sm, volumen: .4, borde: .4, textura: .45, irregular: 0 });
    cx.strokeStyle = css(os(color, .6), .5); cx.lineWidth = 3; for (let x = -40; x < W + M; x += 180) cx.strokeRect(x, SUELO - h + 28, 150, h - 56);
    F(cx, R(-M, SUELO - h - 12, W + 2 * M, 14), ac(color, .12), { semilla: sm + 1, borde: .8, irregular: 0 });
  }
  function ventana(cx, x, y, w, h, hora, sm) {   // (x, y) = esquina superior izquierda
    F(cx, R(x - 18, y - 18, w + 36, h + 36), '#d8cbb6', { semilla: sm, borde: .6, textura: .3, irregular: .2 });
    cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
    const [a, b] = CIELO[hora] || CIELO.dia, g = cx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, css(a)); g.addColorStop(1, css(b)); cx.fillStyle = g; cx.fillRect(x, y, w, h);
    const r = azar(sm + 5); let bx = x - 10;
    while (bx < x + w) { const bw = 36 + r() * 50, bh = 90 + r() * h * .5; cx.fillStyle = css(mz(hora === 'noche' ? '#1a2030' : '#6f7a8c', b, .25 + r() * .2)); cx.fillRect(bx, y + h - bh, bw, bh);
      if (hora !== 'dia') for (let k = 0; k < 6; k++) if (r() < .45) { cx.fillStyle = css('#f0c27e', .8); cx.fillRect(bx + 6 + r() * (bw - 14), y + h - bh + 12 + r() * (bh - 24), 6, 9); } bx += bw + 2; }
    cx.restore();
    cx.strokeStyle = css('#cdbfa8'); cx.lineWidth = 10; cx.strokeRect(x, y, w, h); cx.beginPath(); cx.moveTo(x + w / 2, y); cx.lineTo(x + w / 2, y + h); cx.moveTo(x, y + h * .45); cx.lineTo(x + w, y + h * .45); cx.stroke();
    F(cx, R(x - 28, y + h + 14, w + 56, 20, 3), '#c9bba2', { semilla: sm + 2, borde: .7, irregular: 0 });
  }
  function lampara(cx, x, y, largo, sm) {      // lámpara colgante
    cx.strokeStyle = css(PAL.tinta); cx.lineWidth = 4; cx.beginPath(); cx.moveTo(x, -M); cx.lineTo(x, y - 30); cx.stroke();
    F(cx, [[x - 18, y - 34], [x + 18, y - 34], [x + 46, y + 18], [x - 46, y + 18]], '#c98a4b', { semilla: sm, volumen: .8, borde: .8, emisivo: false });
    F(cx, E(x, y + 18, 46, 9), '#ffd9a0', { semilla: sm + 1, emisivo: true, borde: 0, textura: .1 });
  }
  const INT = {
    juntas: { pared: '#5a6a80', zoc: '#3f4a5c', suelo: ['madera', '#7a5a42'], ventana: [90, 330, 360, 520], lamparas: [900, 700], luces: [{ x: 900, y: 700, r: 1100, fuerza: .85 }, { x: 270, y: 560, r: 600, fuerza: .4, color: '#b8c8e8' }] },
    fabrica: { pared: '#8c5a48', zoc: '#4a3a34', suelo: ['concreto', '#6f6a66'], ventana: [650, 260, 330, 380], luces: [{ x: 800, y: 460, r: 900, fuerza: .7, color: '#e8d8c0' }, { x: 300, y: 600, r: 700, fuerza: .5 }] },
    tienda: { pared: '#6a5444', zoc: '#4a3426', suelo: ['madera', '#7a5a3c'], lamparas: [300, 780], luces: [{ x: 540, y: 700, r: 1100, fuerza: .85 }, { x: 800, y: 740, r: 600, fuerza: .4 }] },
    banco: { pared: '#9a948a', zoc: '#6b665e', suelo: ['baldosa', '#8a847a'], lamparas: [330, 520], luces: [{ x: 330, y: 520, r: 1200, fuerza: .85 }] },
    laboratorio: { pared: '#7d9690', zoc: '#52665f', suelo: ['baldosa', '#9aa4a0'], ventana: [680, 330, 300, 380], luces: [{ x: 540, y: 600, r: 1100, fuerza: .8, color: '#e8f0e8' }] },
    estudio: { pared: '#5a4658', zoc: '#3a2e3a', suelo: ['madera', '#6a5040'], luces: [{ x: 300, y: 500, r: 800, fuerza: .7 }, { x: 800, y: 600, r: 700, fuerza: .55 }] }
  };
  function interior(tipo, o) {
    const sp = INT[tipo], sm = o.semilla || 3, hora = o.hora || 'atardecer';
    const c = bmp(clave('int', tipo, o.hora, sm), W + 2 * M, H + 2 * M, M, M, cx => {
      pared(cx, sp.pared, sm); zocalo(cx, sp.zoc, sm + 1, tipo === 'banco' ? 130 : 200);
      if (sp.ventana) ventana(cx, ...sp.ventana, hora, sm);
      if (tipo === 'juntas') { for (const x of [560, 760, 960]) for (const y of [330]) { F(cx, R(x - 90, y, 180, 520), os(sp.pared, .12), { semilla: sm + x, volumen: .3, borde: .5, irregular: 0 }); } }
      if (tipo === 'fabrica') {
        const r = azar(sm); for (let y = 0; y < 1000; y += 52) for (let x = -(y / 52 % 2) * 60; x < W; x += 120) { cx.fillStyle = css(mz(sp.pared, '#c27a5a', r() * .45), .5); cx.fillRect(x + 3, y + 3, 114, 46); }
        for (const y of [210, 250]) F(cx, R(-M, y, W + 2 * M, 18, 9), '#5c6470', { semilla: sm + y, volumen: .8, borde: .7, irregular: 0 });
        F(cx, R(120, 60, 28, 760), '#5c6470', { semilla: sm + 9, volumen: .8, borde: .7, irregular: 0 });
      }
      if (tipo === 'tienda') { I.props.estanteria(cx, 160, 1110, { ancho: 280, alto: 600, semilla: sm }); I.props.estanteria(cx, 900, 1110, { ancho: 260, alto: 560, semilla: sm + 4, color: '#4a3426' }); }
      if (tipo === 'banco') for (const x of [150, 540, 930]) { F(cx, R(x - 55, 120, 110, 1000), '#bdb6a8', { semilla: sm + x, volumen: .9, borde: .8, textura: .5, irregular: .3 }); F(cx, R(x - 75, 90, 150, 44), ac('#bdb6a8', .1), { semilla: sm + x + 1, borde: .8, irregular: 0 }); F(cx, R(x - 75, 1100, 150, 40), ac('#bdb6a8', .05), { semilla: sm + x + 2, borde: .6, irregular: 0 }); }
      if (tipo === 'laboratorio') { cx.strokeStyle = css(os(sp.pared, .35), .5); cx.lineWidth = 2; for (let x = 0; x < W; x += 90) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, SUELO - 200); cx.stroke(); } for (let y = 0; y < SUELO - 200; y += 90) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); } F(cx, R(60, 380, 460, 14), PAL.maderaOsc, { semilla: sm + 3, borde: .7, irregular: 0 }); F(cx, R(60, 640, 460, 14), PAL.maderaOsc, { semilla: sm + 4, borde: .7, irregular: 0 }); }
      if (tipo === 'estudio') { for (const x of [200, 560, 920]) { F(cx, R(x - 150, 160, 300, 900), mz(sp.pared, '#3a4a64', .4), { semilla: sm + x, volumen: .5, borde: .6, textura: .6, irregular: .4 }); } cx.strokeStyle = css(PAL.tinta); cx.lineWidth = 8; cx.beginPath(); cx.moveTo(-M, 70); cx.lineTo(W + M, 70); cx.stroke(); }
      suelo(cx, sp.suelo[0], sp.suelo[1], sm + 2);
      if (sp.lamparas) for (const x of [sp.lamparas[0]]) lampara(cx, x, sp.lamparas[1], 0, sm + 5);
    });
    return { c, sp };
  }
  function fondoInterior(tipo) {
    return (ctx, T, o = {}) => {
      const { c, sp } = interior(tipo, o), prev = I.luzActual; I.luzActual = LUZ;
      ctx.drawImage(c.cv, -M, -M);
      luzAmbiente(ctx, T, sp.luces.map(f => Object.assign({ halo: 600 }, f, { fuerza: f.fuerza * (o.luz == null ? 1 : o.luz) })));
      I.luzActual = prev;
    };
  }
  for (const t of Object.keys(INT)) D.fondo[t] = fondoInterior(t);
  D.fondo.oficina = (ctx, T, o) => S30.oficina(ctx, T, o);

  // calle de ciudad (día / atardecer / noche), opcionalmente con lluvia o niebla
  D.fondo.calle = (ctx, T, o = {}) => {
    const hora = o.hora || 'atardecer', sm = o.semilla || 4, noche = hora === 'noche', prop2 = I.props;
    const c = bmp(clave('calle', hora, sm, o.anio), W + 2 * M, H + 2 * M, M, M, cx => {
      cieloBase(cx, hora, 1150);
      const r = azar(sm * 7), cols = ['#7d8494', '#8a8580', '#6f7a86', '#857d7a', '#8a6f62'].map(k => noche ? mz(k, '#283044', .5) : k);
      let x = -120; while (x < W + 120) { const w = 150 + r() * 130, h = 420 + r() * 420; prop2.edificio(cx, x + w / 2, 1100, { ancho: w, alto: h, color: cols[Math.floor(r() * cols.length)], pisos: 3 + Math.floor(r() * 3), columnas: 2, profundidad: .55, semilla: Math.floor(r() * 900), encendidas: noche ? .5 : .12, tejado: r() < .5 ? 'mansarda' : null, bajo: null }); x += w + r() * 14; }
      F(cx, R(-M, 1090, W + 2 * M, 80), noche ? '#2e3546' : '#6b6f78', { semilla: sm, profundidad: .3, volumen: .4, irregular: 0 });
      x = -100; for (const [w, h, col] of [[400, 760, '#8f857c'], [380, 640, '#7d8494']]) { prop2.edificio(cx, x + w / 2, 1180, { ancho: w, alto: h, color: noche ? mz(col, '#283044', .45) : col, pisos: 5, columnas: 3, profundidad: .12, semilla: sm + w, encendidas: noche ? .6 : .2, bajo: 'puertas' }); x = 760; }
      F(cx, R(-M, 1150, W + 2 * M, SUELO - 1150 + 4), '#7b7a7e', { semilla: sm + 1, volumen: .5, borde: .8, textura: .4, irregular: 0 });
      const g = cx.createLinearGradient(0, SUELO, 0, H + M); g.addColorStop(0, css(noche ? '#3a404e' : '#66686f')); g.addColorStop(1, css(noche ? '#1c212c' : '#3d3f48')); cx.fillStyle = g; cx.fillRect(-M, SUELO, W + 2 * M, H);
      F(cx, R(-M, SUELO - 6, W + 2 * M, 24), '#a09a90', { semilla: sm + 2, volumen: .6, borde: .8, irregular: 0 });
      cx.strokeStyle = css('#cfc6b0', .35); cx.lineWidth = 10; for (let x2 = 40; x2 < W; x2 += 320) { cx.beginPath(); cx.moveTo(x2, 1640); cx.lineTo(x2 + 170, 1640); cx.stroke(); }
      prop2.farola(cx, 990, SUELO + 6, { alto: 560, cono: false, encendida: noche || hora === 'atardecer', luz: '#ffc477', semilla: sm });
    });
    const prev = I.luzActual; I.luzActual = LUZ;
    ctx.drawImage(c.cv, -M, -M);
    for (let i = 0; i < 5; i++) { const nx = ((hash(i + sm) * 1500 + T * 6 * (1 + i % 3)) % 1700) - 300, ny = 150 + hash(i * 3 + sm) * 360, rr = 220 + hash(i * 7) * 150; const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rr); const cc = noche ? '#5a6682' : '#e8e0d4'; g.addColorStop(0, css(cc, noche ? .18 : .32)); g.addColorStop(1, css(cc, 0)); ctx.save(); ctx.translate(nx, ny); ctx.scale(1.9, .5); ctx.translate(-nx, -ny); ctx.fillStyle = g; ctx.fillRect(nx - rr, ny - rr, 2 * rr, 2 * rr); ctx.restore(); }
    if (o.clima === 'niebla') I.niebla(ctx, T, { y: 1000, alto: 700, color: noche ? '#5d6a84' : '#b3bccb', alfa: .45, velocidad: 6, semilla: sm, canal: 0 });
    if (o.clima === 'lluvia') I.lluvia(ctx, T, { densidad: 260, alfa: .3, color: '#c8d0dc', semilla: sm, capas: 3 });
    luzAmbiente(ctx, T, [{ x: 540, y: 600, r: 1500, fuerza: noche ? .55 : .95, color: noche ? '#c8d0e8' : '#fff0dc' }, { x: 990, y: 640, r: 600, fuerza: .4, halo: 500 }], noche ? '#5a5a70' : '#9a9098');
    I.luzActual = prev;
  };

  // exterior: campo, mina a cielo abierto, cantera
  D.fondo.exterior = (ctx, T, o = {}) => {
    const tipo = o.tipo || 'campo', hora = o.hora || 'dia', sm = o.semilla || 6, tierra = tipo === 'campo' ? '#6f7f56' : tipo === 'cantera' ? '#8a8378' : '#8a6a4c';
    const c = bmp(clave('ext', tipo, hora, sm), W + 2 * M, H + 2 * M, M, M, cx => {
      cieloBase(cx, hora, 1000);
      const r = azar(sm);
      for (let k = 0; k < 3; k++) { const base = 900 - k * 40, pts = [[-M, 1100]]; for (let x = -M; x <= W + M; x += 90) pts.push([x, base - 120 * (3 - k) * (.5 + .5 * Math.sin(x * .004 + k * 2 + r() * .4)) - 60 * r()]); pts.push([W + M, 1100]);
        F(cx, pts, mz(tierra, CIELO[hora][1], .3 + k * .22), { semilla: sm + k, profundidad: .75 - k * .2, volumen: .5, borde: .3, textura: .4, irregular: 3 }); }
      const g = cx.createLinearGradient(0, 960, 0, H + M); g.addColorStop(0, css(mz(tierra, CIELO[hora][1], .15))); g.addColorStop(1, css(os(tierra, .5))); cx.fillStyle = g; cx.fillRect(-M, 1000, W + 2 * M, H);
      F(cx, [[-M, 1000], [W + M, 1000], [W + M, H + M], [-M, H + M]], tierra, { semilla: sm + 5, volumen: .35, borde: .3, textura: .7, irregular: 6, alfa: .6 });
      for (let i = 0; i < 22; i++) { const px = r() * W, py = 1060 + r() * 760, rr = 6 + r() * 16; F(cx, E(px, py, rr * 1.7, rr, 0, 14), mz(tierra, '#7b7a7e', .3 + r() * .2), { semilla: i, volumen: .8, borde: .6, irregular: 2, textura: .5, sombraInterna: .2 }); }
    });
    const prev = I.luzActual; I.luzActual = LUZ; ctx.drawImage(c.cv, -M, -M);
    for (let i = 0; i < 4; i++) { const nx = ((hash(i + sm) * 1400 + T * 5) % 1700) - 300, ny = 160 + hash(i * 3 + sm) * 300, rr = 230; const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, rr); g.addColorStop(0, css('#f0e8dc', .3)); g.addColorStop(1, css('#f0e8dc', 0)); ctx.save(); ctx.translate(nx, ny); ctx.scale(2, .5); ctx.translate(-nx, -ny); ctx.fillStyle = g; ctx.fillRect(nx - rr, ny - rr, 2 * rr, 2 * rr); ctx.restore(); }
    luzAmbiente(ctx, T, [{ x: 540, y: 500, r: 1500, fuerza: .95, color: '#fff0dc', halo: 800, colorHalo: '#ffd9a0' }], '#9a9098');
    I.luzActual = prev;
  };
  D.fondo.cielo = (ctx, T, o = {}) => { const hora = o.hora || 'dia'; D.fondo.exterior(ctx, T, Object.assign({ tipo: 'campo' }, o)); };

  // fondo abstracto de color con luz (infografías, frases): degradado + bokeh + haz, con textura de pincel
  const TEMAS = { azul: ['#4a5a72', '#1f2733', '#34425a'], tierra: ['#7a6048', '#2a1f1a', '#54402f'], salvia: ['#587068', '#1e2a2a', '#3a4c46'], ciruela: ['#6b5063', '#241a22', '#46333f'], noche: ['#2f3b4d', '#12171f', '#232c3a'] };
  D.fondo.abstracto = (ctx, T, o = {}) => {
    const tema = o.tema || 'azul', [a, b, m] = TEMAS[tema], x0 = o.x == null ? 540 : o.x, y0 = o.y == null ? 700 : o.y, sm = o.semilla || 2;
    const c = bmp(clave('abs', tema, sm), W + 2 * M, H + 2 * M, M, M, cx => {
      const g = cx.createLinearGradient(0, -M, 0, H + M); g.addColorStop(0, css(a)); g.addColorStop(.5, css(m)); g.addColorStop(1, css(b)); cx.fillStyle = g; cx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
      F(cx, R(-M, -M, W + 2 * M, H + 2 * M), m, { semilla: sm, volumen: 0, borde: 0, sombraInterna: 0, textura: .7, irregular: 0, alfa: .3 });
      const r = azar(sm + 11); for (let i = 0; i < 9; i++) { const px = r() * W, py = 200 + r() * 1300, rr = 70 + r() * 150; const gg = cx.createRadialGradient(px, py, 0, px, py, rr); gg.addColorStop(0, css(ac(m, .25), .16)); gg.addColorStop(1, css(ac(m, .25), 0)); cx.fillStyle = gg; cx.fillRect(px - rr, py - rr, 2 * rr, 2 * rr); }
    });
    ctx.drawImage(c.cv, -M, -M);
    const k = 1 + .03 * Math.sin(T * 1.7);
    I.halo(ctx, x0, y0, 760 * k, '#ffcf96', .26 * (o.luz == null ? 1 : o.luz)); I.halo(ctx, x0, y0, 280, '#fff0d0', .12);
  };

  // ================= PROPS =================
  // joya (centro). tipo 'diamante' (por defecto) o 'anillo'. oro 0-1 la tiñe de ámbar. gira: rad. brillo: destello.
  D.joya = (ctx, x, y, r, o = {}) => {
    const { oro = 0, gira = 0, brillo = 1, T = 0, tipo = 'diamante' } = o, qo = q8(oro), sq = Math.max(8, Math.round(r / 4) * 4), kq = clave('joya', tipo, sq, qo, Math.round(Math.cos(gira) * 8));
    const w = sq * 4, c = bmp(kq, w, w, w / 2, w / 2, cx => {
      const ch = sq < 30, cara = mz('#efe6d2', '#E0B060', qo), som = mz('#a9bccb', '#b5873a', qo), mid = mz('#cfdbe4', '#d4a24a', qo), sx = Math.cos(gira) * .25 + .75;
      cx.scale(sx, 1);
      const fo = { semilla: 5, plano: ch, volumen: .7, borde: .7, textura: .12, irregular: 0, anchoBorde: 3, contorno: PAL.tinta, anchoContorno: Math.max(1.5, sq * .05) };
      if (tipo === 'anillo') {
        const pa = new Path2D(); pa.ellipse(0, sq * .25, sq * .95, sq * .8, 0, 0, TAU); pa.ellipse(0, sq * .25, sq * .72, sq * .58, 0, TAU, 0, true);
        P.forma(cx, pa, Object.assign({ color: mz('#b8913f', '#E0B060', qo), caja: { x0: -sq, y0: -sq * .6, x1: sq, y1: sq * 1.1, w: sq * 2, h: sq * 1.7, cx: 0, cy: sq * .25 } }, fo, { semilla: 8, irregular: 0 }));
        cx.translate(0, -sq * .55); cx.scale(.55, .55);
      }
      const rr = tipo === 'anillo' ? sq * 1.1 : sq;
      F(cx, [[-rr, -rr * .2], [-rr * .55, -rr * .62], [rr * .55, -rr * .62], [rr, -rr * .2]], cara, fo);
      F(cx, [[-rr, -rr * .2], [0, rr * .9], [rr, -rr * .2]], som, Object.assign({}, fo, { semilla: 6 }));
      F(cx, [[-rr * .55, -rr * .62], [-rr * .3, -rr * .2], [0, -rr * .62]], mid, Object.assign({}, fo, { semilla: 7, borde: .3, sombraInterna: 0 }));
      F(cx, [[0, -rr * .62], [rr * .3, -rr * .2], [rr * .55, -rr * .62]], ac(cara, .1), Object.assign({}, fo, { semilla: 9, borde: .3, sombraInterna: 0 }));
      F(cx, [[-rr * .3, -rr * .2], [0, rr * .9], [rr * .3, -rr * .2]], mid, Object.assign({}, fo, { semilla: 10, borde: .2, sombraInterna: 0 }));
    });
    const f = r / sq; ctx.drawImage(c.cv, x - c.ax * f, y - c.ay * f, c.cv.width * f, c.cv.height * f);
    if (brillo > 0 && r > 12) { const a = brillo * Math.max(0, Math.sin(T * 3 + x * .01)); if (a > 0) { I.halo(ctx, x + r * .45, y - r * .55, r * 1.3, '#fff0d0', .5 * a); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff6e4'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .1 : r * .42, an = i * Math.PI / 4; ctx.lineTo(x + r * .45 + Math.cos(an) * rr, y - r * .55 + Math.sin(an) * rr); } ctx.fill(); ctx.restore(); } }
  };

  // vitrina de cristal sobre pedestal; contenido: joya sobre cojín. (x, y) = suelo bajo el centro. ancho 860 por defecto.
  D.vitrina = prop('vitrina', [-460, -520, 460, 10], (cx, s, o) => {
    const w = (o.ancho || 860) * s, h = (o.alto || 380) * s, y0 = -h - 120 * s;
    F(cx, R(-w * .42, -120 * s, w * .84, 120 * s, 6), PAL.maderaOsc, { semilla: 3, volumen: .7, borde: .7, textura: .5 });
    F(cx, R(-w / 2, -130 * s, w, 22 * s, 5), PAL.madera, { semilla: 4, volumen: .7, borde: .8, textura: .45 });
    F(cx, R(-w / 2, y0, w, h, 8), '#9fb8c8', { semilla: 5, alfa: .22, volumen: .5, borde: .9, sombraInterna: .1, textura: 0, irregular: 0, anchoBorde: 4 });
    cx.strokeStyle = css('#ffffff', .22); cx.lineWidth = 6 * s; cx.beginPath(); cx.moveTo(-w * .4, y0 + 12); cx.lineTo(-w * .22, y0 + h - 14); cx.stroke();
    cx.strokeStyle = css(PAL.laton); cx.lineWidth = 8 * s; cx.strokeRect(-w / 2, y0, w, h);
    F(cx, E(0, -150 * s, 130 * s, 28 * s), '#8a3a33', { semilla: 6, volumen: .8, borde: .7, textura: .6 });
  }, (ctx, x, y, s, o, T) => { if (o.joya !== false) D.joya(ctx, x, y - 205 * s, 48 * s, { T, gira: T * 1.5 }); });

  // cajón con anillo: (x, y) = base del mueble. cierra 0-1 (1 = cerrado, el cajón desliza hacia dentro). Devuelve la posición del frente del cajón.
  D.cajon = (ctx, x, y, s = 1, o = {}) => {
    const sq = Math.round(s * 8) / 8 || 1, w = 800 * sq, h = 520 * sq;
    const cuerpo = bmp(clave('cajonC', sq), w + 160, h + 160, w / 2 + 80, h + 80, cx => {
      F(cx, R(-w / 2, -h, w, h), PAL.madera, { semilla: 3, volumen: .6, borde: .7, textura: .55, irregular: .3 });
      F(cx, R(-w * .46, -h * .78, w * .92, h * .5), os(PAL.maderaOsc, .3), { semilla: 4, volumen: .2, borde: .2, sombraInterna: .8, textura: .3, irregular: 0 });
    });
    const cajon = bmp(clave('cajonD', sq), w + 160, h * .6 + 160, w / 2 + 80, h * .6 + 80, cx => {
      F(cx, R(-w * .44, -h * .5, w * .88, h * .22), '#6b3f4a', { semilla: 5, volumen: .9, borde: .5, textura: .7 });
      F(cx, R(-w * .46, -h * .3, w * .92, h * .3, 5), PAL.madera, { semilla: 6, volumen: .7, borde: .8, textura: .5, irregular: .2 });
      F(cx, E(0, -h * .14, 60 * sq, 22 * sq), PAL.laton, { semilla: 7, volumen: .9, borde: .9, textura: .1, irregular: 0 });
    });
    const k = clamp(o.cierra == null ? 1 : o.cierra), dy = lerp(240, 0, k) * sq;
    ctx.drawImage(cuerpo.cv, x - cuerpo.ax * s / sq, y - cuerpo.ay * s / sq, cuerpo.cv.width * s / sq, cuerpo.cv.height * s / sq);
    ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2 * s / sq, y - h * s / sq, w * s / sq, h * s / sq); ctx.clip();
    ctx.drawImage(cajon.cv, x - cajon.ax * s / sq, y - cajon.ay * s / sq + dy * s / sq, cajon.cv.width * s / sq, cajon.cv.height * s / sq);
    D.joya(ctx, x, y - h * .5 * s / sq + dy * s / sq - 20, 36 * s, { tipo: 'anillo', T: o.T, brillo: 1 });
    ctx.restore();
    return { x, y: y - h * .4 * s / sq + dy * s / sq };
  };

  D.candado = prop('candado', [-90, -200, 90, 90], (cx, s) => {
    cx.strokeStyle = css(os('#a8adb8', .2)); cx.lineWidth = 20 * s; cx.lineCap = 'round'; cx.beginPath(); cx.arc(0, -50 * s, 54 * s, Math.PI, 0); cx.stroke();
    cx.strokeStyle = css('#e8ecf0', .35); cx.lineWidth = 6 * s; cx.beginPath(); cx.arc(0, -50 * s, 54 * s, Math.PI * 1.05, Math.PI * 1.5); cx.stroke();
    F(cx, R(-78 * s, -50 * s, 156 * s, 130 * s, 22 * s), '#6f7682', { semilla: 3, volumen: .9, borde: .9, textura: .3, irregular: .2 });
    F(cx, E(0, 0, 15 * s, 15 * s, 0, 14), PAL.tinta, { semilla: 4, volumen: 0, borde: 0, irregular: 0 }); F(cx, R(-6 * s, 4 * s, 12 * s, 40 * s), PAL.tinta, { semilla: 5, volumen: 0, borde: 0, irregular: 0 });
  });

  // papel / periódico / anuncio: (x, y) = centro. w, h. o: giro, titular, sub, lineas (n de renglones), color, T. El texto va en vivo (fuentes del kit).
  D.papel = (ctx, x, y, w, h, o = {}) => {
    const sw = Math.round(w / 8) * 8, sh = Math.round(h / 8) * 8, c = bmp(clave('papel', sw, sh, o.color, o.lineas), sw + 80, sh + 80, sw / 2 + 40, sh / 2 + 40, cx => {
      F(cx, R(-sw / 2, -sh / 2, sw, sh, 3), o.color || '#e7dcc2', { semilla: 3, volumen: .5, borde: .8, textura: .55, irregular: .8, sombraInterna: .3, anchoBorde: 3 });
      cx.fillStyle = css(PAL.tinta, .55); const n = o.lineas == null ? 6 : o.lineas;
      for (let i = 0; i < n; i++) cx.fillRect(-sw * .4, sh * .12 + i * sh * .075, sw * (.5 + .3 * hash(i + 4)), 6);
    });
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.giro || 0); ctx.scale(w / sw, h / sh);
    ctx.drawImage(c.cv, -c.ax, -c.ay);
    ctx.fillStyle = css(PAL.tinta); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.titular) { ctx.font = `700 ${Math.round(sh * .1)}px "Cormorant Garamond", serif`; ctx.fillText(o.titular, 0, -sh * .36, sw * .86); }
    if (o.sub) { ctx.font = `400 ${Math.round(sh * .042)}px "Space Mono", monospace`; ctx.fillText(o.sub[0], 0, -sh * .24, sw * .86); if (o.sub[1]) ctx.fillText(o.sub[1], 0, -sh * .19, sw * .86); }
    ctx.restore();
  };
  D.periodico = (ctx, x, y, w, h, o = {}) => D.papel(ctx, x, y, w, h, Object.assign({ titular: 'EL DIARIO', lineas: 9, color: '#dcd2bc' }, o));
  D.anuncio = (ctx, x, y, w, h, o = {}) => D.papel(ctx, x, y, w, h, o);

  // Sello de goma inclinado del VEREDICTO (serie Mito vs. evidencia). (x, y) = centro. o: texto 'MITO' | 'VERDAD' | 'MEDIA VERDAD', color (si no, el del texto: terracota,
  // salvia, ámbar), golpe 0-1 = avance de la animación (cae desde grande, se asienta con un rebote), T. Con golpe < 1 todavía está cayendo; combínalo con K.golpe para la sacudida.
  const COLOR_SELLO = { MITO: '#b5654a', VERDAD: '#7d9a7a', 'MEDIA VERDAD': '#E0B060' };
  D.sello = (ctx, x, y, s = 1, o = {}) => {
    const texto = o.texto || 'MITO', color = o.color || COLOR_SELLO[texto] || '#b5654a', g = clamp(o.golpe == null ? 1 : o.golpe);
    if (g <= 0) return;
    const sq = Math.max(.25, Math.round(s * 4) / 4);
    const c = bmp(clave('sello', texto, color, sq), 1000 * sq, 420 * sq, 500 * sq, 210 * sq, cx => {
      cx.scale(sq, sq); cx.font = '400 190px Anton, Montserrat, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      const w = Math.min(900, cx.measureText(texto).width + 130), h = 270;
      cx.strokeStyle = css(color); cx.fillStyle = css(color); cx.lineJoin = 'round';
      cx.lineWidth = 16; cx.beginPath(); cx.roundRect(-w / 2, -h / 2, w, h, 26); cx.stroke();
      cx.lineWidth = 5; cx.beginPath(); cx.roundRect(-w / 2 + 28, -h / 2 + 28, w - 56, h - 56, 14); cx.stroke();
      cx.fillText(texto, 0, 8, w - 100);
      // tinta desgastada: motas que borran un poco el sello, como un sello de goma de verdad
      cx.globalCompositeOperation = 'destination-out'; const r = azar(11);
      for (let i = 0; i < 160; i++) { cx.globalAlpha = .35 + r() * .55; cx.beginPath(); cx.ellipse((r() - .5) * w, (r() - .5) * h, 2 + r() * 9, 2 + r() * 6, r() * 3, 0, TAU); cx.fill(); }
    });
    const caida = Math.min(1, g / .3), asienta = clamp((g - .3) / .25);
    const esc = g < .3 ? lerp(2.6, 1, caida * caida) : 1 + .07 * Math.sin(asienta * Math.PI) * (1 - asienta), f = s / sq;
    ctx.save(); ctx.translate(x, y); ctx.rotate(lerp(.1, -.12, caida)); ctx.scale(esc, esc); ctx.globalAlpha = Math.min(1, g / .15);
    ctx.drawImage(c.cv, -c.ax * f, -c.ay * f, c.cv.width * f, c.cv.height * f);
    ctx.restore();
  };

  D.monedas = prop('monedas', [-120, -210, 120, 20], (cx, s, o) => {
    const n = o.n || 12, r = azar(3);
    for (let i = 0; i < n; i++) { const px = (r() - .5) * 140 * s * (1 - i / n * .6), py = -i * 11 * s; F(cx, E(px, py, 54 * s, 17 * s), mz(PAL.laton, '#E0B060', r() * .5), { semilla: i + 3, volumen: .9, borde: .9, textura: .3, irregular: .3, anchoBorde: 3 }); cx.strokeStyle = css(os(PAL.laton, .4), .5); cx.lineWidth = 2; cx.beginPath(); cx.ellipse(px, py, 36 * s, 10 * s, 0, 0, TAU); cx.stroke(); }
  });
  D.billetes = prop('billetes', [-130, -150, 130, 20], (cx, s, o) => {
    const n = o.n || 5; for (let i = 0; i < n; i++) { const py = -i * 18 * s; F(cx, [[-100 * s, py - 20 * s], [90 * s, py - 30 * s], [110 * s, py], [-80 * s, py + 12 * s]], mz(PAL.salvia, '#a8b894', i % 2 * .3), { semilla: i + 3, volumen: .6, borde: .8, textura: .5, irregular: .6 }); }
    F(cx, R(-12 * s, -n * 18 * s - 24 * s, 24 * s, 40 * s), '#b5654a', { semilla: 9, volumen: .6, borde: .5, irregular: .2 });
  });

  D.caja_registradora = prop('caja_registradora', [-170, -270, 170, 10], (cx, s) => {
    F(cx, R(-160 * s, -150 * s, 320 * s, 150 * s, 12), '#5f7468', { semilla: 3, volumen: .8, borde: .8, textura: .4 });
    F(cx, [[-130 * s, -150 * s], [130 * s, -150 * s], [100 * s, -250 * s], [-100 * s, -250 * s]], '#6f8576', { semilla: 4, volumen: .7, borde: .8, textura: .4 });
    F(cx, R(-70 * s, -240 * s, 140 * s, 40 * s, 4), '#cfd6c0', { semilla: 5, volumen: .3, borde: .6, irregular: 0 });
    for (let r = 0; r < 3; r++) for (let k = 0; k < 5; k++) F(cx, E(-90 * s + k * 45 * s, -130 * s + r * 36 * s, 15 * s, 11 * s, 0, 12), r === 0 && k === 4 ? '#b5654a' : '#e7dcc2', { semilla: 6 + r * 5 + k, volumen: .9, borde: .7, irregular: 0, textura: .1 });
    F(cx, R(-130 * s, -38 * s, 260 * s, 30 * s, 4), PAL.laton, { semilla: 30, volumen: .7, borde: .8, irregular: 0 });
  });

  // cámara de cine (carrete con giro en vivo, trípode) y foco con haz de luz
  D.camaraCine = prop('camaraCine', [-190, -480, 190, 10], (cx, s) => {
    cx.strokeStyle = css(PAL.tinta); cx.lineWidth = 12 * s; cx.lineCap = 'round'; for (const a of [-.35, 0, .35]) { cx.beginPath(); cx.moveTo(0, -150 * s); cx.lineTo(Math.sin(a) * 190 * s, 0); cx.stroke(); }
    F(cx, R(-110 * s, -300 * s, 200 * s, 130 * s, 14), '#4f6d8f', { semilla: 3, volumen: .9, borde: .9, textura: .35 });
    F(cx, [[90 * s, -270 * s], [170 * s, -300 * s], [170 * s, -200 * s], [90 * s, -220 * s]], '#c27a4a', { semilla: 4, volumen: .8, borde: .8, textura: .3, irregular: .2 });
    for (const rx of [-62, 40]) F(cx, E(rx * s, -380 * s, 56 * s, 56 * s, 0, 28), '#7b8494', { semilla: 5 + rx, volumen: .8, borde: .9, textura: .3, irregular: .3 });
  }, (ctx, x, y, s, o, T) => { for (const rx of [-62, 40]) { ctx.save(); ctx.translate(x + rx * s, y - 380 * s); ctx.rotate(T * 3); ctx.fillStyle = css(PAL.tinta, .85); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * TAU / 5) * 30 * s, Math.sin(i * TAU / 5) * 30 * s, 10 * s, 0, TAU); ctx.fill(); } ctx.restore(); } });
  D.foco = prop('foco', [-80, -90, 80, 80], (cx, s) => {
    cx.strokeStyle = css(PAL.tinta); cx.lineWidth = 8 * s; cx.beginPath(); cx.moveTo(0, -90 * s); cx.lineTo(0, -40 * s); cx.stroke();
    F(cx, E(0, 0, 60 * s, 46 * s, -.6), '#3a4250', { semilla: 3, volumen: .9, borde: .9, textura: .3 }); F(cx, E(18 * s, 14 * s, 34 * s, 22 * s, -.6), '#f0d8a0', { semilla: 4, emisivo: true, borde: 0, irregular: 0 });
  }, (ctx, x, y, s, o, T) => { const a = o.ang == null ? Math.PI * .28 : o.ang; I.cono(ctx, x + 18 * s, y + 14 * s, a, .5, o.largo || 1100, '#ffe0a8', .9); });
  D.engranaje = (ctx, x, y, r, o = {}) => {
    const sq = Math.max(16, Math.round(r / 8) * 8), dientes = o.dientes || 12, c = bmp(clave('gear', sq, dientes), sq * 3, sq * 3, sq * 1.5, sq * 1.5, cx => {
      const pts = []; for (let i = 0; i < dientes * 4; i++) { const a = i / (dientes * 4) * TAU, rr = (i % 4 < 2 ? 1 : .8) * sq; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      const pa = new Path2D(); pts.forEach((p, i) => i ? pa.lineTo(p[0], p[1]) : pa.moveTo(p[0], p[1])); pa.closePath(); pa.arc(0, 0, sq * .32, 0, TAU, true);
      P.forma(cx, pa, { color: o.color || '#7b8494', semilla: 3, volumen: .8, borde: .9, textura: .4, irregular: 0, caja: { x0: -sq, y0: -sq, x1: sq, y1: sq, w: 2 * sq, h: 2 * sq, cx: 0, cy: 0 } });
    });
    ctx.save(); ctx.translate(x, y); ctx.rotate((o.T || 0) * (o.vel == null ? .6 : o.vel)); const f = r / sq; ctx.drawImage(c.cv, -c.ax * f, -c.ay * f, c.cv.width * f, c.cv.height * f); ctx.restore();
  };
  D.maquina = (ctx, x, y, s = 1, o = {}) => {
    D.maquina_base(ctx, x, y, s, o);
    D.engranaje(ctx, x - 60 * s, y - 230 * s, 80 * s, { T: o.T, vel: .7, color: '#8a6244' }); D.engranaje(ctx, x + 55 * s, y - 280 * s, 56 * s, { T: o.T, vel: -.7 * 80 / 56, dientes: 9, color: '#7b8494' });
    for (let i = 0; i < 3; i++) { const k = ((o.T || 0) * .4 + i / 3) % 1; I.halo(ctx, x + 150 * s + k * 30, y - 430 * s - k * 220 * s, (50 + k * 90) * s, '#cfc8bd', .3 * (1 - k)); }
  };
  D.maquina_base = prop('maquina', [-240, -520, 260, 10], (cx, s) => {
    F(cx, R(-220 * s, -360 * s, 400 * s, 360 * s, 10), '#5f7468', { semilla: 3, volumen: .8, borde: .8, textura: .5 });
    F(cx, R(110 * s, -520 * s, 56 * s, 170 * s), '#5c6470', { semilla: 4, volumen: .9, borde: .8, textura: .4, irregular: .2 });
    F(cx, R(-190 * s, -60 * s, 340 * s, 24 * s), PAL.maderaOsc, { semilla: 5, volumen: .6, borde: .5, irregular: 0 });
    for (let i = 0; i < 4; i++) F(cx, E(-170 * s + i * 40 * s, -330 * s, 8 * s, 8 * s, 0, 10), PAL.laton, { semilla: 6 + i, volumen: .9, borde: .7, irregular: 0 });
  });
  D.camion = prop('camion', [-330, -300, 330, 10], (cx, s) => {
    F(cx, R(-300 * s, -280 * s, 400 * s, 220 * s, 8), '#b5654a', { semilla: 3, volumen: .7, borde: .8, textura: .5 });
    F(cx, [[110 * s, -200 * s], [230 * s, -200 * s], [300 * s, -120 * s], [300 * s, -60 * s], [110 * s, -60 * s]], '#4f6d8f', { semilla: 4, volumen: .7, borde: .8, textura: .4 });
    F(cx, [[150 * s, -180 * s], [220 * s, -180 * s], [260 * s, -125 * s], [150 * s, -125 * s]], '#bcd0dc', { semilla: 5, volumen: .4, borde: .6, irregular: 0 });
    F(cx, R(-300 * s, -64 * s, 600 * s, 22 * s), PAL.hierro, { semilla: 6, volumen: .5, borde: .5, irregular: 0 });
    for (const wx of [-190, 20, 210]) { F(cx, E(wx * s, -42 * s, 44 * s, 44 * s, 0, 24), '#262a33', { semilla: 7 + wx, volumen: .8, borde: .7, irregular: 0 }); F(cx, E(wx * s, -42 * s, 20 * s, 20 * s, 0, 16), '#8a8f98', { semilla: 8 + wx, volumen: .8, borde: .8, irregular: 0 }); }
  });
  // fachada con letrero y puerta. (x, y) = suelo bajo el centro
  D.fachada = prop('fachada', [-260, -760, 260, 10], (cx, s, o) => {
    const w = (o.ancho || 340) * s, h = (o.alto || 520) * s;
    I.props.edificio(cx, 0, 0, { ancho: w / s, alto: h / s, escala: s, color: o.color || '#6f7f96', pisos: 2, columnas: 2, tejado: null, bajo: null, semilla: o.semilla || 5, encendidas: .5, profundidad: 0 });
    I.props.puerta(cx, 0, 0, { escala: s * 1.1, ancho: 120, alto: 220, color: '#4a3b34', semilla: 6 });
    F(cx, R(-w * .42, -h + 24 * s, w * .84, 54 * s, 4), '#2f3b4d', { semilla: 7, volumen: .6, borde: .8, irregular: 0 });
  }, (ctx, x, y, s, o) => { const h = (o.alto || 520) * s; ctx.fillStyle = css('#e7dcc2'); ctx.font = `600 ${Math.round(32 * s)}px Cinzel, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.letrero || '', x, y - h + 51 * s, (o.ancho || 340) * s * .8); });
  D.puertaLetrero = prop('puertaLetrero', [-100, -300, 100, 10], (cx, s) => { I.props.puerta(cx, 0, 0, { escala: s, color: '#4a3b34', semilla: 4 }); F(cx, R(-60 * s, -300 * s, 120 * s, 34 * s, 3), PAL.laton, { semilla: 5, volumen: .8, borde: .8, irregular: 0 }); },
    (ctx, x, y, s, o) => { ctx.fillStyle = css(PAL.tinta); ctx.font = `600 ${Math.round(20 * s)}px Cinzel, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.texto || '', x, y - 283 * s, 110 * s); });
  D.reloj = (ctx, x, y, r, o = {}) => {
    const sq = Math.max(16, Math.round(r / 8) * 8), c = bmp(clave('reloj', sq), sq * 3, sq * 3, sq * 1.5, sq * 1.5, cx => {
      F(cx, E(0, 0, sq, sq, 0, 36), PAL.maderaOsc, { semilla: 3, volumen: .8, borde: .9, textura: .4, irregular: .3 }); F(cx, E(0, 0, sq * .86, sq * .86, 0, 36), '#e7dcc2', { semilla: 4, volumen: .4, borde: .5, irregular: 0, textura: .3 });
      cx.strokeStyle = css(PAL.tinta); cx.lineWidth = Math.max(2, sq * .04); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; cx.beginPath(); cx.moveTo(Math.cos(a) * sq * .7, Math.sin(a) * sq * .7); cx.lineTo(Math.cos(a) * sq * .8, Math.sin(a) * sq * .8); cx.stroke(); }
    }), f = r / sq; ctx.drawImage(c.cv, x - c.ax * f, y - c.ay * f, c.cv.width * f, c.cv.height * f);
    const h = o.hora == null ? (o.T || 0) * .5 : o.hora; ctx.save(); ctx.strokeStyle = css(PAL.tinta); ctx.lineCap = 'round';
    ctx.lineWidth = r * .07; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(h / 12 * TAU) * r * .45, y - Math.cos(h / 12 * TAU) * r * .45); ctx.stroke();
    ctx.lineWidth = r * .045; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(h * TAU) * r * .68, y - Math.cos(h * TAU) * r * .68); ctx.stroke(); ctx.restore();
  };
  D.telefono = prop('telefono', [-110, -170, 110, 10], (cx, s) => {
    F(cx, [[-100 * s, 0], [-70 * s, -80 * s], [70 * s, -80 * s], [100 * s, 0]], '#2f3b4d', { semilla: 3, volumen: .9, borde: .9, textura: .3 });
    F(cx, E(0, -62 * s, 42 * s, 18 * s), '#cfc6b0', { semilla: 4, volumen: .6, borde: .6, irregular: 0 });
    F(cx, R(-100 * s, -130 * s, 200 * s, 30 * s, 14), '#2f3b4d', { semilla: 5, volumen: .9, borde: .9, textura: .2 });
    for (const sx of [-1, 1]) F(cx, E(sx * 90 * s, -130 * s, 26 * s, 22 * s), '#1d2230', { semilla: 6 + sx, volumen: .9, borde: .8, irregular: 0 });
  });
  // gráfica de barras con volumen (3D) o de línea que cae/sube. progreso 0-1 la hace crecer. (x, y) = centro del panel
  D.grafica = (ctx, x, y, s = 1, o = {}) => {
    const w = 460 * s, h = 360 * s, vals = o.valores || [.3, .5, .7, .9], pr = o.progreso == null ? 1 : o.progreso, tipo = o.tipo || 'barras';
    D.panel(ctx, x, y + h / 2, s, { ancho: 460, alto: 360 });
    const x0 = x - w / 2 + 40 * s, base = y + h / 2 - 40 * s, area = h - 100 * s;
    ctx.save(); ctx.strokeStyle = css(PAL.tinta, .55); ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(x0, base - area - 10 * s); ctx.lineTo(x0, base); ctx.lineTo(x + w / 2 - 30 * s, base); ctx.stroke(); ctx.restore();
    if (tipo === 'linea') { const pts = vals.map((v, i) => [x0 + 20 * s + i * (w - 100 * s) / (vals.length - 1), base - v * area]), n = Math.max(2, Math.round(pr * (pts.length - 1)) + 1);
      ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = css(os(o.color || '#b5654a', .2)); ctx.lineWidth = 16 * s; ctx.beginPath(); pts.slice(0, n).forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      ctx.strokeStyle = css(o.color || '#c9795a'); ctx.lineWidth = 9 * s; ctx.stroke(); ctx.restore(); return; }
    const bw = (w - 110 * s) / vals.length * .7;
    vals.forEach((v, i) => { const bx = x0 + 24 * s + i * (w - 110 * s) / vals.length, bh = v * area * clamp(pr * 1.4 - i * .15, 0, 1), d = 16 * s;
      if (bh < 2) return; const col = i === vals.length - 1 ? (o.destacado || '#E0B060') : mz('#4f6d8f', '#7b8494', i / vals.length);
      F(cx2(ctx), R(bx, base - bh, bw, bh), col, { semilla: 3 + i, volumen: .8, borde: .8, textura: .3, irregular: 0 });
      F(cx2(ctx), [[bx, base - bh], [bx + d, base - bh - d * .7], [bx + bw + d, base - bh - d * .7], [bx + bw, base - bh]], ac(col, .25), { semilla: 13 + i, volumen: .3, borde: .6, irregular: 0 });
      F(cx2(ctx), [[bx + bw, base - bh], [bx + bw + d, base - bh - d * .7], [bx + bw + d, base - d * .7], [bx + bw, base]], os(col, .3), { semilla: 23 + i, volumen: .3, borde: .2, irregular: 0 }); });
  };
  const cx2 = c => c;
  D.panel = prop('panel', [-250, -380, 250, 10], (cx, s, o) => { const w = (o.ancho || 460) * s, h = (o.alto || 360) * s; F(cx, R(-w / 2 - 14 * s, -h - 14 * s, w + 28 * s, h + 28 * s, 8), PAL.maderaOsc, { semilla: 3, volumen: .7, borde: .8, textura: .5 }); F(cx, R(-w / 2, -h, w, h, 4), '#d8cfba', { semilla: 4, volumen: .3, borde: .6, textura: .5, irregular: .3, sombraInterna: .4 }); });
  // pizarra / caballete con patas. (x, y) = suelo bajo el centro. o.dibuja(ctx, w, h): contenido, con el origen en el centro del tablero.
  D.pizarra = (ctx, x, y, s = 1, o = {}) => {
    const w = (o.ancho || 420) * s, h = (o.alto || 300) * s, ty = y - h - 90 * s;
    D.caballete_base(ctx, x, y, s, o);
    if (o.dibuja) { ctx.save(); ctx.translate(x, ty + h / 2); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip(); o.dibuja(ctx, w, h); ctx.restore(); }
  };
  D.caballete_base = prop('caballete', [-260, -480, 260, 10], (cx, s, o) => {
    const w = (o.ancho || 420) * s, h = (o.alto || 300) * s;
    for (const a of [-1, 0, 1]) F(cx, P.capsula(a * w * .38, -90 * s - h * .6, 8 * s, a * w * .55, 0, 7 * s), PAL.maderaOsc, { semilla: 3 + a, volumen: .8, borde: .7, irregular: .2 });
    F(cx, R(-w / 2 - 16 * s, -h - 106 * s, w + 32 * s, h + 32 * s, 6), PAL.madera, { semilla: 7, volumen: .7, borde: .8, textura: .5 });
    F(cx, R(-w / 2, -h - 90 * s, w, h), '#ddd3be', { semilla: 8, volumen: .25, borde: .5, textura: .55, irregular: .3, sombraInterna: .4 });
  });
  // mesa de juntas (frente largo). (x, y) = suelo bajo el centro; la cubierta queda a y - 170·s
  D.mesaJuntas = prop('mesaJuntas', [-520, -200, 520, 20], (cx, s, o) => {
    const w = (o.ancho || 960) * s;
    F(cx, R(-w / 2, -140 * s, w, 140 * s, 6), PAL.maderaOsc, { semilla: 3, volumen: .7, borde: .6, textura: .55 });
    cx.strokeStyle = css(os(PAL.maderaOsc, .5), .5); cx.lineWidth = 3; for (let i = 0; i < 5; i++) cx.strokeRect(-w / 2 + 30 * s + i * (w - 60 * s) / 5, -118 * s, (w - 60 * s) / 5 - 20 * s, 96 * s);
    F(cx, R(-w / 2 - 10 * s, -172 * s, w + 20 * s, 34 * s, 6), PAL.madera, { semilla: 4, volumen: .8, borde: .9, textura: .45 });
    F(cx, E(-w * .3, -176 * s, 48 * s, 8 * s), '#e7dcc2', { semilla: 5, volumen: .5, borde: .6, irregular: 0 }); F(cx, E(w * .18, -178 * s, 22 * s, 6 * s), '#bcd0dc', { semilla: 6, volumen: .5, borde: .6, irregular: 0 });
  });
  D.mesa = (ctx, x, y, s = 1, o = {}) => D.mesaJuntas(ctx, x, y, s, Object.assign({ ancho: 760 }, o));
  // estante de madera con baldas. devuelve la y de cada balda en o.baldas (n). (x, y) = suelo bajo el centro
  D.estante = prop('estante', [-460, -620, 460, 10], (cx, s, o) => {
    const w = (o.ancho || 860) * s, h = (o.alto || 400) * s, n = o.baldas || 3;
    F(cx, R(-w / 2, -h, w, h), os(PAL.madera, .35), { semilla: 3, volumen: .3, borde: .4, sombraInterna: .7, textura: .5, irregular: .3 });
    for (let i = 0; i <= n; i++) F(cx, R(-w / 2 - 8 * s, -h + i * h / n - (i ? 12 * s : 0), w + 16 * s, 14 * s), PAL.madera, { semilla: 4 + i, volumen: .8, borde: .9, textura: .4, irregular: .2 });
  });
  D.caja = prop('caja', [-130, -200, 130, 10], (cx, s, o) => {
    const w = (o.ancho || 200) * s, h = (o.alto || 130) * s;
    F(cx, R(-w / 2, -h, w, h, 3), o.color || '#a07850', { semilla: 3, volumen: .7, borde: .8, textura: .6, irregular: .5 });
    cx.strokeStyle = css(os(o.color || '#a07850', .5), .6); cx.lineWidth = 3 * s; for (let i = 1; i < 3; i++) { cx.beginPath(); cx.moveTo(-w / 2, -h * i / 3); cx.lineTo(w / 2, -h * i / 3); cx.stroke(); }
  });

  // mina a cielo abierto en terrazas, con luz y volumen. (x, y) = centro del borde superior (elipse mayor). niveles = n de terrazas.
  D.mina = prop('mina', [-500, -280, 500, 520], (cx, s, o) => {
    const n = o.niveles || 7, r = azar(7);
    for (let i = 0; i < n; i++) {
      const rx = (470 - i * 58) * s, ry = (230 - i * 30) * s, yy = i * 40 * s;
      F(cx, E(0, yy - 30 * s, rx, ry, 0, 44), os('#7a5a40', .3 + i * .04), { semilla: 3 + i, volumen: .8, borde: .5, textura: .7, irregular: 3 * s, sombraInterna: .5 });
      F(cx, E(0, yy, rx, ry, 0, 44), mz('#b08a60', '#8a6244', i / n), { semilla: 13 + i, volumen: .65, borde: .85, textura: .65, irregular: 3 * s, sombraInterna: .45 });
    }
    F(cx, E(0, (n - 1) * 40 * s + 14 * s, 70 * s, 30 * s), '#1d2230', { semilla: 40, volumen: .3, borde: .2, irregular: 1, sombraInterna: .6 });
    for (let i = 0; i < 16; i++) { const a = r() * TAU, lv = Math.floor(r() * (n - 1)), rx = (470 - lv * 58) * s * .85, ry = (230 - lv * 30) * s * .85; F(cx, E(Math.cos(a) * rx, lv * 40 * s + Math.sin(a) * ry, (8 + r() * 12) * s, (5 + r() * 8) * s, 0, 10), mz('#8a8378', '#6f685f', r()), { semilla: 50 + i, volumen: .8, borde: .7, textura: .4, irregular: 1 }); }
  });
  // alias semánticos
  D.diamante = (ctx, x, y, r, o) => D.joya(ctx, x, y, r, o); D.anillo = (ctx, x, y, r, o) => D.joya(ctx, x, y, r, Object.assign({ tipo: 'anillo' }, o));

  // bandeja de terciopelo para exhibir joyas. (x, y) = centro de la bandeja
  D.bandeja = prop('bandeja', [-480, -230, 480, 230], (cx, s, o) => {
    const w = (o.ancho || 860) * s, h = (o.alto || 300) * s;
    F(cx, R(-w / 2, -h / 2, w, h, 14), PAL.madera, { semilla: 3, volumen: .8, borde: .9, textura: .5 });
    F(cx, R(-w / 2 + 26 * s, -h / 2 + 26 * s, w - 52 * s, h - 52 * s, 8), '#3c4a64', { semilla: 4, volumen: .3, borde: .3, textura: .8, sombraInterna: .8, irregular: 0 });
  });
  // máquina de escribir con hoja. (x, y) = base de la máquina. o.texto, o.n = letras tecleadas. La hoja y el texto van en vivo.
  D.maquinaEscribir = prop('maquinaEscribir', [-460, -800, 460, 10], (cx, s) => {
    F(cx, R(-420 * s, -330 * s, 840 * s, 330 * s, 40 * s), '#4f6d8f', { semilla: 3, volumen: .85, borde: .9, textura: .4, irregular: .3 });
    F(cx, R(-380 * s, -400 * s, 760 * s, 90 * s, 28 * s), '#3a4a64', { semilla: 4, volumen: .9, borde: .9, textura: .3, irregular: .3 });
    for (let f = 0; f < 3; f++) for (let i = 0; i < 10 - f; i++) F(cx, E((-300 + f * 34 + i * 66) * s, (-250 + f * 66) * s, 26 * s, 26 * s, 0, 18), '#e7dcc2', { semilla: 5 + f * 10 + i, volumen: .95, borde: .9, irregular: 0, textura: .15, contorno: PAL.tinta, anchoContorno: 2 });
  }, (ctx, x, y, s, o, T) => {
    const texto = o.texto || '', n = Math.floor(texto.length * (o.n == null ? 1 : o.n));
    ctx.save(); ctx.beginPath(); ctx.rect(x - 400 * s, y - 800 * s, 800 * s, 400 * s); ctx.clip();
    D.papel(ctx, x, y - 600 * s + (1 - clamp(o.n == null ? 1 : o.n * 3)) * 0, 580 * s, 420 * s, { lineas: 0, color: '#e7dcc2' });
    ctx.font = `400 ${Math.round(40 * s)}px "Space Mono", monospace`; ctx.fillStyle = css(PAL.tinta); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(texto.slice(0, n), x - 250 * s, y - 590 * s);
    if (Math.sin(T * 10) > 0) ctx.fillRect(x - 250 * s + ctx.measureText(texto.slice(0, n)).width + 4, y - 612 * s, 4, 40 * s);
    ctx.restore();
  });
  // celular de pie (x, y = base central; ≈ 460·s de alto, 250·s de ancho) con la pantalla viva. o: tipo 'mensaje' (burbuja) | 'llamada' | 'banco' (aviso con candado),
  //   quien (nombre arriba: "Banco", "Número desconocido"), texto (string o [líneas]), alerta 0-1 (borde rojo que late), k 0-1 (aparición del texto), T.
  D.celular = (ctx, x, y, s = 1, o = {}) => {
    const w = 250 * s, h = 460 * s, T = o.T || 0, k = o.k == null ? 1 : clamp(o.k), tipo = o.tipo || 'mensaje';
    prop('celular', [-140, -480, 140, 10], (cx, sq) => {
      F(cx, R(-125 * sq, -460 * sq, 250 * sq, 460 * sq, 30 * sq), '#2a303c', { semilla: 3, volumen: .8, borde: .9, textura: .25, irregular: .2 });
      F(cx, R(-112 * sq, -444 * sq, 224 * sq, 428 * sq, 20 * sq), '#161b26', { semilla: 4, volumen: .15, borde: .3, irregular: .1 });
    })(ctx, x, y, s, {});
    const sx = x - 112 * s, sy = y - 444 * s, sw = 224 * s, sh = 428 * s;
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
    const fondo = ctx.createLinearGradient(0, sy, 0, sy + sh); fondo.addColorStop(0, tipo === 'llamada' ? '#26334a' : '#e9e2d0'); fondo.addColorStop(1, tipo === 'llamada' ? '#141b2a' : '#d3cab2');
    ctx.fillStyle = fondo; ctx.fillRect(sx, sy, sw, sh);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lineas = Array.isArray(o.texto) ? o.texto : o.texto ? [o.texto] : [];
    if (o.quien) { ctx.fillStyle = tipo === 'llamada' ? '#EFE6D2' : '#2b3345'; ctx.font = `800 ${Math.round(21 * s)}px ${K.TEXTO}`; ctx.fillText(o.quien, x, sy + 36 * s, sw * .9); }
    if (tipo === 'llamada') {
      ctx.fillStyle = '#4a5a78'; ctx.beginPath(); ctx.arc(x, sy + 150 * s, 46 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#EFE6D2'; ctx.beginPath(); ctx.arc(x, sy + 138 * s, 15 * s, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(x, sy + 178 * s, 26 * s, 17 * s, 0, Math.PI, 0); ctx.fill();
      const pulso = (Math.sin(T * 7) + 1) / 2; ctx.strokeStyle = css('#6FA66E', .25 + .5 * pulso); ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.arc(x, sy + 150 * s, (56 + 10 * pulso) * s, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#6FA66E'; ctx.beginPath(); ctx.arc(x - 55 * s, sy + sh - 70 * s, 28 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#C9584C'; ctx.beginPath(); ctx.arc(x + 55 * s, sy + sh - 70 * s, 28 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#EFE6D2'; ctx.font = `700 ${Math.round(19 * s)}px ${K.TEXTO}`;
      lineas.forEach((l, i) => ctx.fillText(l, x, sy + 250 * s + i * 26 * s, sw * .9));
    } else {
      const bw = sw * .84, n = lineas.length || 1, bh = (50 + n * 31) * s, by = sy + 80 * s;
      ctx.globalAlpha = k; ctx.fillStyle = tipo === 'banco' ? '#fbf7ec' : '#ffffff'; ctx.beginPath(); ctx.roundRect(x - bw / 2, by, bw, bh, 18 * s); ctx.fill();
      ctx.strokeStyle = css('#2b3345', .18); ctx.lineWidth = 2 * s; ctx.stroke();
      ctx.fillStyle = '#1d2230'; ctx.font = `700 ${Math.round(22 * s)}px ${K.TEXTO}`;
      lineas.forEach((l, i) => ctx.fillText(l, x, by + (34 + i * 31) * s, bw * .9));
      ctx.globalAlpha = 1;
      if (tipo === 'mensaje') {   // renglones de chat de relleno (otros mensajes ya enviados), para que la pantalla no quede vacía
        ctx.fillStyle = css('#2b3345', .16);
        [[.55, 0], [.7, 1], [.4, 0]].forEach(([f, der], i) => { const ww = sw * f, yy = by + bh + (28 + i * 50) * s; ctx.beginPath(); ctx.roundRect(der ? x + sw / 2 - 14 * s - ww : x - sw / 2 + 14 * s, yy, ww, 34 * s, 14 * s); ctx.fill(); });
      }
      if (tipo === 'banco') { ctx.fillStyle = '#C9584C'; ctx.beginPath(); ctx.arc(x, by + bh + 60 * s, 30 * s, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(40 * s)}px ${K.TEXTO}`; ctx.fillText('!', x, by + bh + 62 * s); }
    }
    ctx.restore();
    if (o.alerta) { const a = clamp(o.alerta) * (.55 + .45 * Math.sin(T * 8)); ctx.save(); ctx.strokeStyle = css('#C9584C', a); ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.roundRect(sx - 4 * s, sy - 4 * s, sw + 8 * s, sh + 8 * s, 22 * s); ctx.stroke(); ctx.restore(); }
  };
  D.listo = true;
})();
