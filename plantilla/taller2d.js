// TALLER 2D (W2) — "Así se fabrica" en el motor de ilustración (Pincel con volumen, luz cálida de borde, colores apagados, grano).
// Global `W2`. Cargar tras kit.js, ilustra.js (y decorados.js si está). No depende de D ni S30. Todo es función de T/t (sin Math.random/Date/estado).
// CONVENCIONES  Mundo en px: (0,0) = línea de apoyo (cubierta de la mesa / pista), X→derecha, Y→ABAJO (arriba = Y negativa). Cada pieza se dibuja
//   centrada en (x,y) salvo que se diga otra cosa. TODAS las piezas/efectos reciben UN objeto: W2.engranaje(ctx, {x,y,r:60,giro:T*2, k, entra:'encaja'}).
//   Opciones comunes: x,y, s (escala), rot (rad), pivote:[px,py] (punto local que queda en x,y: rota alrededor de él), espejo:true, alfa, vib (amplitud de
//   temblor; usa T), k = factor de aparición 0-1 (0 = no existe), entra = 'pop'|'cae'|'desliza'|'atornilla'|'encaja' (+ desde:[dx,dy], clic:true = destello).
// ESCENA   W2.escena(ctx,T,{fondo:'taller'|'cocina'|'cielo'|'pista', cam:{x,y,z,rot,sacude}, luz, mesa:true}, ctx=>{...mundo...}) pinta fondo con paralaje, la mesa/pista en
//   Y=0 (≥0 es el frente), tu dibujo y el acabado (luz cálida, viñeta, grano). cam=(x,y) del mundo en el centro del cuadro, z=zoom (1: ~1000 px de ancho).
//   Cámara por defecto {x:0,y:-330,z:1}: la mesa queda en y≈1160 de pantalla. W2.cam(t,[[0,{x,y,z}],[2,{...}],[2,{...},'corta']]) interpola (suave) y 'corta' = corte seco.
//   W2.grupo(ctx,{x,y,rot,s,pivote,k,entra,vib},()=>{piezas hijas en coordenadas del padre}) · W2.aMundo(ctx,x,y)→[X,Y] mundo de un punto local (para humo/chispas de una pieza girada).
// PIEZAS (volumen con Pincel; los giros los pones tú: giro:T*3):
//   caja{w,h,r,color,tornillos,rejilla,franja} · cilindro{w,h,color,tapa,aros} (eje en el lado mayor) · tapa{w,h,abre,color} · bandeja{w,h,color} · lamina{pts,color,grosor,dx,dy}
//   engranaje{r,dientes,giro,color,agujeros} · rueda{r,giro,color,rayos} · polea{r,giro,color} · correa{a:[x,y,r],b:[x,y,r],giro,color} · resorte{de,a,vueltas,r,color}
//   motor{w,h,color,giro} · bobina{w,h,vueltas} · iman{w,h,tipo:'U'|'barra'} · helice{r,palas,giro,rapida,vista:'lado'|'frente',color} · aspas = helice frente
//   tubo{pts:[[x,y]..],r,color,liquido,vel,T} (codos redondeados, bridas; con liquido es de vidrio y fluye) · valvula{abierta,giro} · grifo{abierto,T} · manometro{valor}
//   vaso{w,h,nivel,liquido,agita,T,burbujas,forma:'vaso'|'frasco'|'tanque'} · cable{de,a,flojo,color,T} · piston{r,largo,fase} · biela{de,a,r} · manivela{r,giro}
//   bisagra{w,h,abre} · tornillo{r,giro,tipo:'cruz'|'ranura'|'hex',largo,vista} · bombilla{r,brillo,roto,T} · boton{r,pulsa,color} · palanca{ang,largo} · perilla{r,ang}
//   forma(ctx,pts,color,{...Pincel}) polígono libre con volumen · W2.F/R/E/C (Pincel.forma, rect, elipse, paleta apagada W2.C.rojo/acero/laton/madera/hule...)
// EFECTOS DE FALLA/FUERZA (T = segundos del video; desde = segundo en que arrancan; k = intensidad 0-1):
//   humo{x,y,T,k,color} · vapor{} · chispas{x,y,T,k,n,r} · arco{de,a,T} (rayo eléctrico) · chorro{x,y,ang,fuerza,largo,T,color,suelo} · salpica{x,y,T,desde,n,color}
//   derrame{x,y,w,k,color} · agua{y,k,T} (inundación) · calentar(ctx,{k,T},()=>dibuja) (brilla al rojo vivo) · vibra(T,amp)→[dx,dy,rot] · polvo{x,y,T,desde,r}
//   explosion{x,y,r,k,T} (nube + estrella, humor sin violencia) · onda{x,y,r,k} · destello{x,y,r,k} · flecha{de,a,color,k,T} · viento{x,y,w,h,ang,T,curva}
//   icono(ctx,'pregunta'|'exclama'|'rayo'|'estrella'|'gota',{x,y,s,k,color}) (símbolos, NO texto) · sombra{x,y,w} (sombra de contacto) · caida(k,alto) rebote · balistica
// PERSONAJE  W2.patito(ctx,T,{x,y,s:alto px,estado:'normal'|'usa'|'susto'|'celebra',k,dir,rot,casco:'aviador'|'redondo',agua:false}) · estado2+k2 (0-1) interpola entre dos estados.
//   a bordo: dibújalo dentro de W2.grupo del objeto y tapa la cabina con vidrio.  W2.pelicula(ctx,T) (la hace W2.escena sola).
(() => {
  if (!window.Ilustra || !Ilustra.Pincel || !Ilustra.REPARTO || !window.K) return;
  const I = Ilustra, P = I.Pincel, R = I.REPARTO, { W, H, TAU, clamp, lerp, prog, sale, rebote, hash, azar } = K, PI = Math.PI;
  const css = I.css, mz = I.mezcla, ac = I.aclara, os = I.oscurece, N1 = I.ruido1;
  const W2 = window.W2 = {};
  const C = W2.C = { acero: '#8e99a6', acero2: '#5d6978', hierro: '#3d4452', laton: '#c0983f', cobre: '#b8703f', rojo: '#b5473f', naranja: '#d98a3d', amarillo: '#e3b44a', azul: '#4f7fa8',
    verde: '#6f9c6a', hule: '#f6c632', madera: '#a8744a', maderaOsc: '#6b4a36', negro: '#2b2e38', crema: '#e7dcc2', blanco: '#e9e4d8', vidrio: '#a9d4de', agua: '#5aa9c9', aceite: '#c08a3a', turquesa: '#4f9a96', ciruela: '#7a5570' };
  const LUZ = W2.LUZ = new I.Luz({ dir: [-0.5, -0.8], dirBorde: [0.9, -0.2], clave: '#f2d9a0', ambiente: '#4a4036', borde: '#d4b47a', niebla: '#3a342c' });
  const F = W2.F = (cx, pts, color, o = {}) => P.forma(cx, pts, Object.assign({ color, semilla: 1, volumen: .6, borde: .6, textura: .25, irregular: .4, sombraInterna: .3 }, o));
  const Rc = W2.R = (x, y, w, h, r = 0) => P.rect(x, y, w, h, r), E = W2.E = (x, y, rx, ry, rot = 0, n = 28) => P.elipse(x, y, rx, ry, rot, n);
  W2.forma = (ctx, pts, color, o) => F(ctx, pts, color, o);
  const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const rg = (ctx, x, y, r0, r1, st) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const lg = (ctx, x0, y0, x1, y1, st) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };

  // ------------------------------------------------------------------ tiempo y movimiento
  W2.caida = (k, alto = 400) => { k = clamp(k); if (k >= 1) return 0; if (k < .6) return -alto * (1 - Math.pow(k / .6, 2)); if (k < .8) return -alto * .14 * Math.sin(PI * (k - .6) / .2); return -alto * .035 * Math.sin(PI * (k - .8) / .2); };
  W2.balistica = (t, vx, vy, g = 1400) => [vx * t, vy * t + .5 * g * t * t];
  W2.vibra = (T, amp = 4, vel = 38) => [N1(T * vel, 3) * amp, N1(T * vel * 1.13, 7) * amp, N1(T * vel * .9, 11) * amp * .004];
  W2.cam = (t, ks) => {
    let i = 0; while (i < ks.length - 1 && t >= ks[i + 1][0]) i++;
    const a = ks[i], b = ks[Math.min(i + 1, ks.length - 1)], d = Object.assign({ x: 0, y: -330, z: 1, rot: 0, sacude: 0 }, a[1]);
    if (a === b || b[2] === 'corta') return d;
    const k = K.suave((t - a[0]) / (b[0] - a[0])), e = Object.assign({ x: 0, y: -330, z: 1, rot: 0, sacude: 0 }, b[1]), o = {};
    for (const c in d) o[c] = c === 'z' ? d.z * Math.pow(e.z / d.z, k) : lerp(d[c], e[c], k);
    return o;
  };

  // ------------------------------------------------------------------ luz local: la luz del mundo no gira con las piezas
  const luzMem = new Map();
  function luzLocal(ctx) {
    const m = ctx.getTransform(), det = m.a * m.d - m.b * m.c || 1, loc = v => { const x = (m.d * v[0] - m.c * v[1]) / det, y = (-m.b * v[0] + m.a * v[1]) / det, l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
    const d = loc(LUZ.dir), b = loc(LUZ.dirBorde), key = Math.round(Math.atan2(d[1], d[0]) * 24) + '|' + Math.round(Math.atan2(b[1], b[0]) * 24);
    let l = luzMem.get(key); if (!l) { l = LUZ.con({ dir: d, dirBorde: b }); luzMem.set(key, l); } return l;
  }
  let BASE = null;
  W2.aMundo = (ctx, x, y) => { const m = ctx.getTransform(), X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f, b = BASE || new DOMMatrix(), i = b.inverse(); return [i.a * X + i.c * Y + i.e, i.b * X + i.d * Y + i.f]; };

  // ------------------------------------------------------------------ transformación de pieza + aparición
  function ent(o) {
    const k = o.k == null ? 1 : o.k; if (k <= 0) return null;
    const e = { dx: 0, dy: 0, rot: 0, s: 1, a: 1, fl: 0 }; if (k >= 1) return e;
    const m = o.entra || 'pop', d = o.desde;
    if (m === 'pop') { e.s = Math.max(.001, rebote(k)); e.a = Math.min(1, k * 6); }
    else if (m === 'cae') { e.dy = W2.caida(k, typeof d === 'number' ? d : 520); e.a = Math.min(1, k * 8); }
    else if (m === 'desliza') { const f = 1 - sale(k * 1.15), v = d || [-420, 0]; e.dx = v[0] * f; e.dy = v[1] * f; e.a = Math.min(1, k * 5); }
    else if (m === 'atornilla') { const f = 1 - sale(k), v = d || [0, -90]; e.dx = v[0] * f; e.dy = v[1] * f; e.rot = f * TAU * 1.5; e.a = Math.min(1, k * 6); e.fl = k > .72 ? Math.sin(PI * (k - .72) / .28) : 0; }
    else if (m === 'encaja') { const v = d || [0, -170], f = Math.pow(1 - clamp(k / .72), 2); e.dx = v[0] * f; e.dy = v[1] * f; e.a = Math.min(1, k * 8); if (k > .72) { e.s = 1 + .09 * Math.sin(PI * (k - .72) / .28); e.fl = Math.sin(PI * (k - .72) / .28); } }
    if (o.clic && k > .72 && !e.fl) e.fl = Math.sin(PI * (k - .72) / .28);
    return e;
  }
  function destello(ctx, r, f) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rg(ctx, 0, 0, 0, r * 1.5, [[0, css('#fff3c8', .8 * f)], [1, css('#ffd890', 0)]]); ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
    ctx.strokeStyle = css('#fff0c0', .9 * f); ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = i * PI / 4 + .2, r0 = r * (.7 + .5 * (1 - f)), r1 = r0 + r * .35 * f; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke(); }
    ctx.restore();
  }
  // def: registra una pieza con la transformación común. fn(ctx, o, e) dibuja en local (0,0).
  function def(nombre, fn, rf = 60) {
    W2[nombre] = (ctx, o = {}) => {
      const e = ent(o); if (!e) return null; const v = o.vib ? W2.vibra(o.T || 0, o.vib) : [0, 0, 0], sc = (o.s == null ? 1 : o.s) * e.s, pv = o.pivote || [0, 0];
      ctx.save(); ctx.translate((o.x || 0) + e.dx + v[0], (o.y || 0) + e.dy + v[1]); ctx.rotate((o.rot || 0) + e.rot + v[2]); ctx.scale(o.espejo ? -sc : sc, sc); ctx.translate(-pv[0], -pv[1]);
      ctx.globalAlpha *= e.a * (o.alfa == null ? 1 : o.alfa);
      const prev = I.luzActual; I.luzActual = luzLocal(ctx);
      try { fn(ctx, o, e); if (e.fl > 0) destello(ctx, o.rf || rf, e.fl); } finally { I.luzActual = prev; ctx.restore(); }
      return [o.x || 0, o.y || 0];
    };
  }
  W2.def = def;
  W2.grupo = (ctx, o, fn) => { if (typeof o === 'function') { fn = o; o = {}; } const e = ent(o); if (!e) return; const v = o.vib ? W2.vibra(o.T || 0, o.vib) : [0, 0, 0], sc = (o.s == null ? 1 : o.s) * e.s, pv = o.pivote || [0, 0];
    ctx.save(); ctx.translate((o.x || 0) + e.dx + v[0], (o.y || 0) + e.dy + v[1]); ctx.rotate((o.rot || 0) + e.rot + v[2]); ctx.scale(o.espejo ? -sc : sc, sc); ctx.translate(-pv[0], -pv[1]); ctx.globalAlpha *= e.a * (o.alfa == null ? 1 : o.alfa);
    const prev = I.luzActual; I.luzActual = luzLocal(ctx); try { fn(ctx); if (e.fl > 0) destello(ctx, o.rf || 80, e.fl); } finally { I.luzActual = prev; ctx.restore(); } };

  // ------------------------------------------------------------------ sombreado de cilindro (el brillo sigue la luz local)
  function cilindrar(ctx, path, x, y, w, h, vert, fuerza = 1) {
    const L = I.luzActual.dir, s = vert ? L[0] : L[1], f = clamp(.5 + .3 * s, .2, .8); ctx.save(); ctx.clip(path);
    const g = vert ? lg(ctx, x - w / 2, 0, x + w / 2, 0, [[0, 'rgba(20,16,26,' + .3 * fuerza + ')'], [f, 'rgba(255,240,210,' + .3 * fuerza + ')'], [1, 'rgba(20,16,26,' + .5 * fuerza + ')']])
      : lg(ctx, 0, y - h / 2, 0, y + h / 2, [[0, 'rgba(20,16,26,' + .3 * fuerza + ')'], [f, 'rgba(255,240,210,' + .3 * fuerza + ')'], [1, 'rgba(20,16,26,' + .5 * fuerza + ')']]);
    ctx.fillStyle = g; ctx.fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4); ctx.restore();
  }
  const tornillito = (ctx, x, y, r, color = C.acero2, a = .6) => { F(ctx, E(x, y, r, r, 0, 12), color, { volumen: .7, borde: .5, irregular: 0, textura: 0, anchoBorde: 2 }); ctx.strokeStyle = css('#1d2230', .7); ctx.lineWidth = Math.max(1.2, r * .28); ctx.beginPath(); ctx.moveTo(x - r * .6 * Math.cos(a), y - r * .6 * Math.sin(a)); ctx.lineTo(x + r * .6 * Math.cos(a), y + r * .6 * Math.sin(a)); ctx.stroke(); };
  W2._t = tornillito; W2._cil = cilindrar;

  // ------------------------------------------------------------------ sombra de contacto
  def('sombra', (ctx, o) => { const w = o.w || 120; ctx.fillStyle = rg(ctx, 0, 0, 0, w, [[0, 'rgba(14,12,18,' + (o.a == null ? .5 : o.a) + ')'], [1, 'rgba(14,12,18,0)']]); ctx.save(); ctx.scale(1, .16); ctx.fillRect(-w, -w, 2 * w, 2 * w); ctx.restore(); });

  // ------------------------------------------------------------------ fondos (capas lejanas cacheadas con paralaje) + mesa / pista cercana
  const MX = 300, MY = 300, memo = new Map(), TAB = { v: 0 };
  function capa(key, per, dib, base) {
    let c = memo.get(key); if (c) return c;
    const cv = document.createElement('canvas'); cv.width = W + 2 * MX; cv.height = H + 2 * MY; const cx = cv.getContext('2d'); cx.translate(MX, MY);
    const prev = I.luzActual; I.luzActual = LUZ;
    try { if (base) base(cx); for (const off of [-per, 0, per]) { cx.save(); cx.translate(off, 0); dib(cx); cx.restore(); } } finally { I.luzActual = prev; }
    c = { cv, per }; memo.set(key, c); return c;
  }
  function pintaCapa(ctx, c, cam, par, zp = .35, yp = .5) {
    const zf = Math.max(1, 1 + (cam.z - 1) * zp), sx = -cam.x * par, sy = -(cam.y + 330) * par * yp, w = c.cv.width * zf, per = c.per * zf;
    let x0 = 540 + (-MX - 540 + sx) * zf; const y0 = 830 + (-MY - 830 + sy) * zf; x0 = ((x0 % per) + per) % per - per * 2;
    for (let j = 0; j < 8; j++) { const x = x0 + j * per; if (x + w > 0 && x < W) ctx.drawImage(c.cv, x, y0, w, c.cv.height * zf); }
    return [540 + (sx) * zf, 830 + sy * zf, zf];
  }
  // herramientas del tablero (sombra = silueta oscura desplazada)
  function herr(cx, t, x, y, a, sh) {
    cx.save(); cx.translate(x, y); cx.rotate(a); const col = c => sh ? '#14121a' : c, o = e => sh ? { volumen: 0, borde: 0, textura: 0, irregular: 0, sombraInterna: 0 } : e;
    if (t === 'llave') { F(cx, P.capsula(0, 0, 8, 0, 120, 9), col(C.acero), o({ semilla: 2 })); F(cx, E(0, -6, 20, 20), col(C.acero), o({ semilla: 3 })); if (!sh) { cx.fillStyle = css('#586674'); cx.beginPath(); cx.arc(0, -16, 9, 0, TAU); cx.fill(); } }
    else if (t === 'martillo') { F(cx, Rc(-6, 0, 12, 130, 5), col(C.madera), o({ semilla: 4 })); F(cx, Rc(-36, -16, 72, 28, 5), col(C.acero2), o({ semilla: 5 })); F(cx, [[-36, -14], [-58, -22], [-60, -10], [-36, 6]], col(C.acero2), o({ semilla: 6 })); }
    else if (t === 'pinzas') { F(cx, P.capsula(-6, 0, 6, 12, 100, 9), col(C.rojo), o({ semilla: 7 })); F(cx, P.capsula(6, 0, 6, -12, 100, 9), col(C.rojo), o({ semilla: 8 })); F(cx, [[-14, -44], [-6, 10], [6, 10], [14, -44], [4, -50], [-4, -50]], col(C.acero), o({ semilla: 9 })); }
    else if (t === 'serrucho') { F(cx, [[-26, 0], [26, 0], [10, 150], [-10, 150]], col('#a9b4c0'), o({ semilla: 10 })); F(cx, Rc(-12, -46, 24, 50, 8), col(C.maderaOsc), o({ semilla: 11 })); }
    else if (t === 'destornillador') { F(cx, P.capsula(0, 0, 11, 0, 44, 10), col(C.amarillo), o({ semilla: 12 })); F(cx, Rc(-3, 44, 6, 80, 2), col(C.acero), o({ semilla: 13 })); }
    else if (t === 'cinta') { F(cx, E(0, 0, 34, 34), col(C.amarillo), o({ semilla: 14 })); if (!sh) { F(cx, E(0, 0, 14, 14), '#586674', { volumen: .2, textura: 0, irregular: 0 }); } }
    cx.restore();
  }
  function baseTaller(cx) {
    cx.fillStyle = lg(cx, 0, -MY, 0, 1300, [[0, '#343e4b'], [.45, '#566472'], [1, '#76828e']]); cx.fillRect(-MX, -MY, W + 2 * MX, H + 2 * MY);
    F(cx, Rc(-MX, -MY, W + 2 * MX, 1700), '#6a7a86', { semilla: 3, volumen: 0, borde: 0, sombraInterna: 0, textura: .7, irregular: 0, alfa: .28 });
    F(cx, Rc(-MX, 930, W + 2 * MX, 1400), '#475862', { semilla: 5, volumen: .3, borde: .8, textura: .5, irregular: 0 });
    cx.strokeStyle = css('#232c36', .5); cx.lineWidth = 3; for (let x = -MX; x < W + MX; x += 120) { cx.beginPath(); cx.moveTo(x, 950); cx.lineTo(x, 1400); cx.stroke(); }
    F(cx, Rc(-MX, 916, W + 2 * MX, 20), '#8a6a4a', { semilla: 6, volumen: .6, borde: .9, irregular: 0 });
  }
  function dibTaller(cx) {
    // tablero perforado con herramientas
    F(cx, Rc(30, 540, 370, 420, 8), '#8a6a4a', { semilla: 7, volumen: .5, borde: .8, textura: .5 });
    cx.fillStyle = css('#2b1d14', .45); cx.beginPath(); for (let j = 0; j < 10; j++) for (let i = 0; i < 9; i++) { cx.moveTo(62 + i * 38 + 3, 572 + j * 38); cx.arc(62 + i * 38, 572 + j * 38, 3, 0, TAU); } cx.fill();
    const T_ = [['llave', 90, 590, .05], ['martillo', 180, 590, -.04], ['pinzas', 262, 600, 0], ['serrucho', 338, 585, .03], ['destornillador', 110, 790, .0], ['cinta', 230, 840, 0], ['llave', 330, 770, -.06]];
    for (const pass of [1, 0]) for (const [t, x, y, a] of T_) { if (pass) { cx.save(); cx.translate(7, 9); cx.globalAlpha = .28; herr(cx, t, x, y, a, true); cx.restore(); } else herr(cx, t, x, y, a, false); }
    // estante con frascos
    F(cx, Rc(425, 842, 200, 16, 3), '#8a6a4a', { semilla: 15, volumen: .7, borde: .9, irregular: 0 });
    [[455, C.verde], [500, C.naranja], [545, C.azul], [592, C.crema]].forEach(([x, c], i) => { F(cx, Rc(x - 17, 782 + (i % 2) * 14, 34, 60 - (i % 2) * 14, 6), c, { semilla: 16 + i, volumen: .8, borde: .8 }); F(cx, Rc(x - 13, 774 + (i % 2) * 14, 26, 12, 3), C.hierro, { semilla: 20 + i, volumen: .6, borde: .4, irregular: 0 }); });
    // ventana con atardecer
    F(cx, Rc(640, 470, 320, 420, 6), '#4a3b34', { semilla: 24, volumen: .6, borde: .8, textura: .4 });
    cx.fillStyle = lg(cx, 0, 490, 0, 880, [[0, '#6a7c9a'], [.55, '#d9a779'], [1, '#e8c48e']]); cx.fillRect(662, 492, 276, 376);
    cx.fillStyle = css('#4d5a6a', .85); cx.beginPath(); cx.moveTo(662, 820); cx.quadraticCurveTo(740, 770, 810, 810); cx.quadraticCurveTo(870, 780, 938, 818); cx.lineTo(938, 868); cx.lineTo(662, 868); cx.fill();
    cx.strokeStyle = '#4a3b34'; cx.lineWidth = 12; cx.beginPath(); cx.moveTo(800, 490); cx.lineTo(800, 870); cx.moveTo(662, 640); cx.lineTo(938, 640); cx.stroke();
    F(cx, Rc(626, 884, 348, 20, 3), '#8a6a4a', { semilla: 25, volumen: .7, borde: .9, irregular: 0 });
    I.cono(cx, 800, 700, 1.9, .9, 760, '#ffd9a0', .55);
    // lámpara colgante
    cx.strokeStyle = '#1d2230'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(330, -MY); cx.lineTo(330, 430); cx.stroke();
    I.halo(cx, 330, 520, 520, '#ffb55e', .5);
    F(cx, [[330 - 36, 420], [330 + 36, 420], [330 + 128, 520], [330 - 128, 520]], '#a8604a', { semilla: 26, volumen: .8, borde: .9, textura: .3, irregular: .2 });
    cx.fillStyle = rg(cx, 330, 526, 0, 70, [[0, 'rgba(255,238,190,1)'], [1, 'rgba(255,200,120,0)']]); cx.beginPath(); cx.ellipse(330, 526, 100, 24, 0, 0, TAU); cx.fill();
  }
  function baseCocina(cx) {
    cx.fillStyle = lg(cx, 0, -MY, 0, 1300, [[0, '#3a4a4c'], [.5, '#62767a'], [1, '#80928e']]); cx.fillRect(-MX, -MY, W + 2 * MX, H + 2 * MY);
    for (let y = 300; y < 1300; y += 90) for (let x = (y / 90 % 2) * 60 - 420; x < W + MX; x += 120) F(cx, Rc(x + 3, y + 3, 114, 84, 8), (x + y) % 240 ? '#79908c' : '#84998f', { semilla: (x * 7 + y) & 255, volumen: .55, borde: .8, textura: .3, irregular: .3, anchoBorde: 3 });
  }
  function dibCocina(cx) {
    F(cx, Rc(60, 380, 380, 300, 10), C.maderaOsc, { semilla: 3, volumen: .6, borde: .8, textura: .5 }); F(cx, Rc(80, 400, 160, 260, 6), '#7d5a42', { semilla: 4, volumen: .5, borde: .6 }); F(cx, Rc(260, 400, 160, 260, 6), '#7d5a42', { semilla: 5, volumen: .5, borde: .6 });
    [[225, 520], [275, 520]].forEach(([x, y], i) => F(cx, Rc(x - 6, y - 40, 12, 80, 5), C.laton, { semilla: 6 + i, volumen: .8, borde: .9 }));
    F(cx, Rc(640, 470, 320, 400, 6), '#e0d3b8', { semilla: 8, volumen: .5, borde: .8 }); cx.fillStyle = lg(cx, 0, 490, 0, 860, [[0, '#6a7c9a'], [1, '#e8c48e']]); cx.fillRect(662, 492, 276, 356);
    cx.strokeStyle = '#e0d3b8'; cx.lineWidth = 12; cx.beginPath(); cx.moveTo(800, 490); cx.lineTo(800, 850); cx.moveTo(662, 660); cx.lineTo(938, 660); cx.stroke(); I.cono(cx, 800, 700, 1.9, .9, 760, '#ffd9a0', .5);
    cx.strokeStyle = '#1d2230'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(500, -MY); cx.lineTo(500, 450); cx.stroke(); I.halo(cx, 500, 520, 480, '#ffb55e', .45);
    F(cx, [[500 - 30, 450], [500 + 30, 450], [500 + 100, 530], [500 - 100, 530]], '#c9a35a', { semilla: 9, volumen: .8, borde: .9, irregular: .2 });
  }
  function baseCielo(cx) {
    cx.fillStyle = lg(cx, 0, -MY, 0, 1500, [[0, '#4a587a'], [.35, '#6d7894'], [.7, '#d0a98a'], [1, '#e9cf9e']]); cx.fillRect(-MX, -MY, W + 2 * MX, H + 2 * MY);
  }
  function dibNubes(cx) {
    I.halo(cx, 780, 1000, 480, '#ffd9a0', .4);
    const r = azar(5); for (let i = 0; i < 4; i++) { const x = 150 + i * 270 + r() * 60, y = 520 + r() * 420; F(cx, [E(x, y, 130, 26), E(x - 50, y - 18, 70, 34), E(x + 50, y - 12, 80, 30)], '#dcc6b0', { semilla: 30 + i, volumen: .5, borde: .8, textura: .2, irregular: 1.5, alfa: .45, sombraInterna: .2 }); }
  }
  function dibColinas(cx) {
    const g = (y0, a, c, s) => { cx.beginPath(); cx.moveTo(-MX, 2300); for (let x = -MX; x <= W + MX; x += 40) cx.lineTo(x, y0 + Math.sin(x / 1080 * TAU * a + s) * 36 + Math.sin(x / 1080 * TAU * a * 2.3 + s * 2) * 14); cx.lineTo(W + MX, 2300); cx.fillStyle = c; cx.fill(); };
    g(990, 1, '#7b8798', 1); g(1050, 2, '#65755f', 4);
    for (const x of [180, 420, 700, 930]) { const y = 1068 + Math.sin(x) * 8; F(cx, Rc(x - 7, y - 50, 14, 52, 3), '#4e3f33', { semilla: x, volumen: .5, textura: .2 }); F(cx, E(x, y - 80, 36, 42), '#58704f', { semilla: x + 1, volumen: .8, borde: .7, textura: .4, irregular: 1.5 }); }
  }
  // ---- mesa (taller / cocina): baldosa de 480 px
  function mesaTile(tipo) {
    const k = 'mesa|' + tipo; let c = memo.get(k); if (c) return c;
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 760; const cx = cv.getContext('2d'); cx.translate(0, 12); const prev = I.luzActual; I.luzActual = LUZ;
    const piedra = tipo === 'cocina', top = piedra ? '#c4b499' : '#b08454', fr = piedra ? '#5f7480' : '#6b4a36';
    cx.fillStyle = lg(cx, 0, 330, 0, 748, [[0, '#2a2630'], [1, '#14121a']]); cx.fillRect(0, 300, 512, 460);
    F(cx, Rc(-30, 46, 572, 300), fr, { semilla: 41, volumen: .5, borde: .5, textura: .55, irregular: 0 });
    cx.strokeStyle = css('#1d1520', .55); cx.lineWidth = 4; cx.beginPath(); cx.moveTo(1, 50); cx.lineTo(1, 340); cx.moveTo(256, 50); cx.lineTo(256, 340); cx.stroke();
    cx.fillStyle = css('#1d1520', .6); for (const [x, y] of [[20, 70], [492, 70], [20, 320], [492, 320], [242, 70], [270, 70]]) { cx.beginPath(); cx.arc(x, y, 3.5, 0, TAU); cx.fill(); }
    F(cx, Rc(-30, 0, 572, 48), top, { semilla: 42, volumen: .6, borde: 1, anchoBorde: 6, textura: .5, irregular: 0 });
    cx.strokeStyle = css(os(top, .5), .3); cx.lineWidth = 2; for (let i = 0; i < 5; i++) { cx.beginPath(); cx.moveTo(0, 8 + i * 8); cx.bezierCurveTo(170, 4 + i * 8 + (i % 2) * 6, 340, 14 + i * 8, 512, 8 + i * 8); cx.stroke(); }
    F(cx, Rc(-30, 40, 572, 10), ac(top, .1), { semilla: 43, volumen: .3, borde: 1, anchoBorde: 4, irregular: 0 });
    I.luzActual = prev; c = cv; memo.set(k, c); return c;
  }
  function suelosMundo(ctx, cam, tipo) {
    const ext = 700 / cam.z + 420 / Math.max(.3, cam.z) * Math.abs(Math.sin(cam.rot || 0)) * 2, x0 = cam.x - ext - 540, x1 = cam.x + ext + 540, yb = cam.y + 1300 / cam.z + 400;
    if (tipo === 'taller' || tipo === 'cocina') {
      const t = mesaTile(tipo); for (let x = Math.floor(x0 / 512) * 512; x < x1; x += 512) ctx.drawImage(t, x, -12);
      ctx.fillStyle = '#14121a'; ctx.fillRect(x0, 740, x1 - x0, Math.max(0, yb - 740));
    } else if (tipo === 'pista') {
      const t = pistaTile(); ctx.fillStyle = '#5f7a50'; ctx.fillRect(x0, -140, x1 - x0, 110);
      for (let x = Math.floor(x0 / 512) * 512; x < x1; x += 512) ctx.drawImage(t, x, -40);
      ctx.fillStyle = '#4d6a44'; ctx.fillRect(x0, 420, x1 - x0, Math.max(0, yb - 420));
    }
  }
  function pistaTile() {
    const k = 'pista'; let c = memo.get(k); if (c) return c; const cv = document.createElement('canvas'); cv.width = 512; cv.height = 460; const cx = cv.getContext('2d'); const prev = I.luzActual; I.luzActual = LUZ;
    F(cx, Rc(-30, 0, 572, 460), '#555862', { semilla: 51, volumen: .3, borde: .2, textura: .8, irregular: 0 }); cx.fillStyle = css('#e8dcc0', .85); cx.fillRect(0, 150, 512, 6);
    F(cx, Rc(-30, 0, 572, 10), '#7d808a', { semilla: 52, volumen: .4, borde: 1, irregular: 0 }); cx.fillStyle = css('#e8dcc0', .8); cx.fillRect(20, 6, 120, 8); cx.fillRect(276, 6, 120, 8);
    cx.fillStyle = css('#d9b556', .9); for (let x = 30; x < 512; x += 256) cx.fillRect(x, 178, 150, 14);
    cx.strokeStyle = css('#2a2830', .4); cx.lineWidth = 3; for (let x = 0; x < 512; x += 128) { cx.beginPath(); cx.moveTo(x, 200); cx.lineTo(x - 36, 460); cx.stroke(); }
    I.luzActual = prev; memo.set(k, cv); return cv;
  }
  const FONDOS = { taller: [[dibTaller, 1080, .3, baseTaller]], cocina: [[dibCocina, 1080, .3, baseCocina]], cielo: [[dibNubes, 1080, .12, baseCielo]], pista: [[dibNubes, 1080, .1, baseCielo], [dibColinas, 1080, .55]] };
  // luz cálida sobre las capas lejanas (mapa de luz): foco de la lámpara
  function luzFondo(ctx, tipo, cam, T, luz) {
    if (tipo === 'cielo' || tipo === 'pista') return;
    const fl = 1 + .02 * N1(T * 2, 8), z = Math.max(1, 1 + (cam.z - 1) * .35), lx = tipo === 'cocina' ? 500 : 330;
    const px = 540 + (lx - 540 - cam.x * .3) * z, py = 830 + (560 - 830 - (cam.y + 330) * .15) * z;
    I.mapaLuz(ctx, [{ x: px, y: py + 150, r: 1250 * z, fuerza: .95 * fl * luz, color: '#fff0dc' }, { x: 540 + (800 - 540 - cam.x * .3) * z, y: py + 130, r: 560 * z, fuerza: .38, color: '#b8c8e8' }], { oscuridad: '#82788a' });
    I.halo(ctx, px, py, 600 * z, '#ffb55e', .26 * fl * luz);
  }
  // ------------------------------------------------------------------ acabado
  W2.pelicula = (ctx, T, f = 1) => {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,190,120,' + .1 * f + ')'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; const g = ctx.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .5, H * .78); g.addColorStop(0, 'rgba(20,16,22,0)'); g.addColorStop(1, 'rgba(20,16,22,' + .34 * f + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const t = ctx.createLinearGradient(0, 0, 0, 520); t.addColorStop(0, 'rgba(16,14,22,' + .55 * f + ')'); t.addColorStop(1, 'rgba(16,14,22,0)'); ctx.fillStyle = t; ctx.fillRect(0, 0, W, 520);   // franja de subtítulos
    K.acabado(ctx, T, { grano: .07 * f, vineta: 0 }); ctx.restore();
  };
  // ------------------------------------------------------------------ escena = fondo + mundo con cámara + acabado
  W2.escena = (ctx, T, o, fn) => {
    o = o || {}; const cam = Object.assign({ x: 0, y: -330, z: 1, rot: 0, sacude: 0 }, o.cam), tipo = o.fondo || 'taller', luz = o.luz == null ? 1 : o.luz;
    const prev = I.luzActual; I.luzActual = LUZ; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1d2230'; ctx.fillRect(0, 0, W, H);
    FONDOS[tipo || 'taller'].forEach(([d, per, p, b], i) => pintaCapa(ctx, capa(tipo + i, per, d, b), cam, p));
    if (o.fondoExtra) o.fondoExtra(ctx);
    luzFondo(ctx, tipo, cam, T, luz);
    const sh = cam.sacude ? [N1(T * 33, 1) * cam.sacude, N1(T * 37, 2) * cam.sacude] : [0, 0];
    ctx.translate(540 + sh[0], 830 + sh[1]); ctx.rotate(cam.rot || 0); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y); BASE = ctx.getTransform();
    if (o.mesa !== false) suelosMundo(ctx, cam, tipo);
    if (fn) fn(ctx);
    ctx.restore(); I.luzActual = prev; if (o.pelicula !== false) W2.pelicula(ctx, T, o.pelicula == null ? 1 : o.pelicula); BASE = null;
  };

  // ------------------------------------------------------------------ PIEZAS
  def('caja', (ctx, o) => {
    const w = o.w || 120, h = o.h || 80, c = o.color || C.acero, r = o.r == null ? Math.min(14, h * .2) : o.r;
    const p = F(ctx, Rc(-w / 2, -h / 2, w, h, r), c, { semilla: o.semilla || 1, volumen: .7, borde: .8, anchoBorde: 5, textura: .35 });
    if (o.franja) { ctx.save(); ctx.clip(p); F(ctx, Rc(-w / 2 - 2, -h * .12, w + 4, h * .24), o.franja, { semilla: 2, volumen: .5, borde: .4, irregular: 0, textura: .2 }); ctx.restore(); }
    if (o.rejilla) { ctx.fillStyle = css('#14121a', .6); const n = o.rejilla, g = h * .6 / n; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.roundRect(-w * .3, -h * .3 + i * g + g * .2, w * .6, g * .5, 3); ctx.fill(); } }
    if (w > 70 && h > 50 && o.bisel !== false) { ctx.strokeStyle = css(os(c, .5), .28); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18, Math.max(2, r - 4)); ctx.stroke(); }
    const n = o.tornillos | 0; if (n) for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]].slice(0, n)) tornillito(ctx, sx * (w / 2 - 11), sy * (h / 2 - 11), 4.5, ac(c, -.1), sx + sy);
  }, 90);
  def('cilindro', (ctx, o) => {
    const w = o.w || 160, h = o.h || 60, c = o.color || C.acero, v = h > w, L = Math.max(w, h), D = Math.min(w, h), tp = o.tapa == null ? 'der' : o.tapa;
    if (!v) {
      const p = F(ctx, Rc(-L / 2, -D / 2, L, D, Math.min(D * .12, 10)), c, { semilla: o.semilla || 2, volumen: .5, borde: .8, anchoBorde: 5, textura: .3 }); cilindrar(ctx, p, 0, 0, L, D, false);
      for (let i = 1; i <= (o.aros | 0); i++) { const x = -L / 2 + L * i / ((o.aros | 0) + 1); ctx.fillStyle = css(os(c, .55), .55); ctx.fillRect(x - 3, -D / 2, 6, D); ctx.fillStyle = css('#fff0d0', .18); ctx.fillRect(x + 3, -D / 2, 2, D); }
      if (tp === 'der' || tp === 'ambas') { const e = F(ctx, E(L / 2 - D * .06, 0, Math.max(5, D * .13), D / 2, 0, 20), ac(c, .14), { semilla: 3, volumen: .5, borde: .9, irregular: 0, textura: .15 }); }
    } else {
      const p = F(ctx, Rc(-D / 2, -L / 2, D, L, Math.min(D * .12, 10)), c, { semilla: o.semilla || 2, volumen: .5, borde: .8, anchoBorde: 5, textura: .3 }); cilindrar(ctx, p, 0, 0, D, L, true);
      for (let i = 1; i <= (o.aros | 0); i++) { const y = -L / 2 + L * i / ((o.aros | 0) + 1); ctx.fillStyle = css(os(c, .55), .55); ctx.fillRect(-D / 2, y - 3, D, 6); }
      if (tp !== false && tp !== 'izq') F(ctx, E(0, -L / 2 + D * .04, D / 2, Math.max(5, D * .15), 0, 20), ac(c, .14), { semilla: 3, volumen: .5, borde: .9, irregular: 0, textura: .15 });
    }
  });
  def('tapa', (ctx, o) => { const w = o.w || 140, h = o.h || 22; ctx.rotate(-(o.abre || 0)); F(ctx, Rc(0, -h, w, h, 6), o.color || C.acero, { semilla: 4, volumen: .7, borde: .9, anchoBorde: 5 }); F(ctx, Rc(w * .42, -h - 12, w * .16, 14, 6), C.hierro, { semilla: 5, volumen: .8, borde: .8 }); });
  def('bandeja', (ctx, o) => { const w = o.w || 200, h = o.h || 40; F(ctx, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2 - h * .45, h / 2], [-w / 2 + h * .45, h / 2]], o.color || C.acero, { semilla: 6, volumen: .7, borde: .9, textura: .3, irregular: .3 }); ctx.fillStyle = css('#14121a', .35); ctx.fillRect(-w / 2 + 6, -h / 2 + 4, w - 12, 6); });
  def('lamina', (ctx, o) => { const pts = o.pts, c = o.color || C.crema, g = o.grosor == null ? 10 : o.grosor, dx = o.dx == null ? -g * .5 : o.dx, dy = o.dy == null ? g * .8 : o.dy;
    if (g) F(ctx, pts.map(p => [p[0] + dx, p[1] + dy]), os(c, .35), { semilla: 7, volumen: .2, borde: .1, textura: .2, irregular: .2, sombraInterna: 0 });
    F(ctx, pts, c, { semilla: o.semilla || 8, volumen: o.volumen == null ? .6 : o.volumen, borde: .9, anchoBorde: 4, textura: .3, irregular: .25 }); });

  def('engranaje', (ctx, o) => {
    const r = o.r || 60, n = o.dientes || 12, g = o.giro || 0, c = o.color || C.acero, rr = r * .82, pit = TAU / n, pts = [];
    for (let i = 0; i < n; i++) { const a = g + i * pit; for (const [da, rad] of [[-.34, rr], [-.17, r], [.17, r], [.34, rr]]) pts.push([Math.cos(a + da * pit) * rad, Math.sin(a + da * pit) * rad]); }
    F(ctx, pts, c, { semilla: o.semilla || 9, volumen: .7, borde: .9, anchoBorde: 4, textura: .35, irregular: .3 });
    F(ctx, E(0, 0, r * .66, r * .66, 0, 32), os(c, .12), { semilla: 10, volumen: .6, borde: .5, irregular: 0, textura: .2, sombraInterna: .5 });
    const na = o.agujeros == null ? 5 : o.agujeros; if (na) for (let i = 0; i < na; i++) { const a = g + i * TAU / na + .3; ctx.fillStyle = css('#14121a', .55); ctx.beginPath(); ctx.arc(Math.cos(a) * r * .42, Math.sin(a) * r * .42, r * .11, 0, TAU); ctx.fill(); }
    F(ctx, E(0, 0, r * .22, r * .22, 0, 16), ac(c, .12), { semilla: 11, volumen: .6, borde: .8, irregular: 0, textura: 0 }); ctx.fillStyle = css('#14121a', .8); ctx.beginPath(); ctx.arc(0, 0, r * .08, 0, TAU); ctx.fill();
  }, 70);
  def('rueda', (ctx, o) => {
    const r = o.r || 50, g = o.giro || 0, c = o.color || C.acero;
    F(ctx, E(0, 0, r, r, 0, 36), C.negro, { semilla: 12, volumen: .6, borde: .8, anchoBorde: 4, textura: .5, irregular: .4 });
    ctx.strokeStyle = css('#8a8a96', .35); ctx.lineWidth = 3; for (let i = 0; i < 14; i++) { const a = g + i * TAU / 14; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .88, Math.sin(a) * r * .88); ctx.lineTo(Math.cos(a) * r * .97, Math.sin(a) * r * .97); ctx.stroke(); }
    F(ctx, E(0, 0, r * .62, r * .62, 0, 28), c, { semilla: 13, volumen: .7, borde: .9, irregular: 0, textura: .2 });
    ctx.strokeStyle = css(os(c, .5), .8); ctx.lineWidth = Math.max(3, r * .07); ctx.lineCap = 'round'; const nr = o.rayos == null ? 5 : o.rayos;
    for (let i = 0; i < nr; i++) { const a = g + i * TAU / nr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * .55, Math.sin(a) * r * .55); ctx.stroke(); }
    F(ctx, E(0, 0, r * .16, r * .16, 0, 14), ac(c, .15), { semilla: 14, volumen: .6, borde: .8, irregular: 0, textura: 0 });
  }, 70);
  def('polea', (ctx, o) => { const r = o.r || 40, g = o.giro || 0, c = o.color || C.acero2; F(ctx, E(0, 0, r, r, 0, 32), c, { semilla: 15, volumen: .7, borde: .9, textura: .3, irregular: .3 }); F(ctx, E(0, 0, r * .78, r * .78, 0, 28), os(c, .3), { semilla: 16, volumen: .5, borde: .2, irregular: 0, textura: 0, sombraInterna: .6 });
    ctx.fillStyle = css('#14121a', .55); for (let i = 0; i < 4; i++) { const a = g + i * PI / 2 + .4; ctx.beginPath(); ctx.arc(Math.cos(a) * r * .46, Math.sin(a) * r * .46, r * .13, 0, TAU); ctx.fill(); } F(ctx, E(0, 0, r * .2, r * .2, 0, 14), ac(c, .2), { semilla: 17, volumen: .6, borde: .8, irregular: 0, textura: 0 }); });
  W2.correa = (ctx, o) => { const e = ent(o); if (!e) return; const [ax, ay, ra] = o.a, [bx, by, rb] = o.b, d = Math.hypot(bx - ax, by - ay), th = Math.atan2(by - ay, bx - ax), ph = Math.asin(clamp((ra - rb) / d, -1, 1)), n = th - PI / 2 - ph, n2 = th + PI / 2 + ph;
    const path = () => { ctx.beginPath(); ctx.moveTo(ax + Math.cos(n) * ra, ay + Math.sin(n) * ra); ctx.lineTo(bx + Math.cos(n) * rb, by + Math.sin(n) * rb); ctx.arc(bx, by, rb, n, n2, false); ctx.lineTo(ax + Math.cos(n2) * ra, ay + Math.sin(n2) * ra); ctx.arc(ax, ay, ra, n2, n + TAU, false); ctx.closePath(); };
    ctx.save(); ctx.globalAlpha *= e.a; ctx.lineJoin = 'round'; path(); ctx.strokeStyle = css('#14121a', .9); ctx.lineWidth = 13; ctx.stroke(); path(); ctx.strokeStyle = css(o.color || '#3a3d4a'); ctx.lineWidth = 9; ctx.stroke();
    path(); ctx.setLineDash([16, 14]); ctx.lineDashOffset = -(o.giro || 0) * ra; ctx.strokeStyle = css('#7a7f90', .45); ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); };
  W2.resorte = (ctx, o) => { const e = ent(o); if (!e) return; const [x0, y0] = o.de, [x1, y1] = o.a, nv = o.vueltas || 8, r = o.r || 22, th = o.alambre || Math.max(4, r * .26), L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0), c = o.color || C.acero, N = nv * 20, pt = i => { const u = i / N, ph = u * nv * TAU; return [u * L + Math.cos(ph) * r * .3, Math.sin(ph) * r, Math.sin(ph) < 0]; };
    ctx.save(); ctx.globalAlpha *= e.a; ctx.translate(x0, y0); ctx.rotate(a); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[false, os(c, .5), th, 1, 0], [true, os(c, .45), th + 3, 1, 0], [true, c, th, 1, 0], [true, ac(c, .35), th * .35, .8, -th * .2]].forEach(([front, col, w, al, dy]) => { ctx.strokeStyle = css(col, al); ctx.lineWidth = w; let open = false; for (let i = 0; i <= N; i++) { const [x, y, fr] = pt(i); if (fr === front) { if (!open) { ctx.beginPath(); ctx.moveTo(x, y + dy); open = true; } else ctx.lineTo(x, y + dy); } else if (open) { ctx.stroke(); open = false; } } if (open) ctx.stroke(); });
    ctx.restore(); };
  def('motor', (ctx, o) => {
    const w = o.w || 200, h = o.h || 110, c = o.color || C.azul, g = o.giro || 0;
    F(ctx, Rc(-w * .32, h / 2 - 6, w * .64, 18, 4), C.hierro, { semilla: 18, volumen: .6, borde: .5, irregular: 0 });
    F(ctx, Rc(w * .1, -h / 2 - 22, w * .24, 26, 4), C.laton, { semilla: 19, volumen: .7, borde: .8 });
    const sh = F(ctx, Rc(w * .5 - 4, -h * .1, w * .26, h * .2, 3), C.acero, { semilla: 20, volumen: .6, borde: .9, irregular: 0 }); cilindrar(ctx, sh, w * .63, 0, w * .26, h * .2, false); ctx.fillStyle = css('#14121a', .6); ctx.fillRect(w * .5 + w * .26 * (.35 + .3 * Math.sin(g * 3)), -h * .1, 4, h * .2);
    const p = F(ctx, Rc(-w / 2, -h / 2, w * .98, h, 16), c, { semilla: 21, volumen: .6, borde: .9, anchoBorde: 5, textura: .4 }); cilindrar(ctx, p, 0, 0, w, h, false, .9);
    ctx.save(); ctx.clip(p); ctx.fillStyle = css(os(c, .5), .55); for (let i = 0; i < 7; i++) ctx.fillRect(-w / 2 + 16 + i * 17, -h / 2, 7, h); ctx.restore();
    F(ctx, Rc(w * .34, -h / 2 + 8, w * .14, h - 16, 6), os(c, .2), { semilla: 22, volumen: .7, borde: .8, irregular: 0 });
  }, 110);
  def('bobina', (ctx, o) => { const w = o.w || 100, h = o.h || 70, nv = o.vueltas || 8, c = C.cobre; F(ctx, Rc(-w / 2 - 8, -h / 2 - 6, 12, h + 12, 3), C.hierro, { semilla: 23, volumen: .7, borde: .7, irregular: 0 }); F(ctx, Rc(w / 2 - 4, -h / 2 - 6, 12, h + 12, 3), C.hierro, { semilla: 24, volumen: .7, borde: .7, irregular: 0 });
    const p = F(ctx, Rc(-w / 2, -h / 2, w, h, 6), c, { semilla: 25, volumen: .6, borde: .9, textura: .4 }); cilindrar(ctx, p, 0, 0, w, h, false, .9); ctx.save(); ctx.clip(p); ctx.strokeStyle = css(os(c, .5), .6); ctx.lineWidth = 2.5; for (let i = 1; i < nv * 2; i++) { const x = -w / 2 + w * i / (nv * 2); ctx.beginPath(); ctx.moveTo(x - 4, -h / 2); ctx.lineTo(x + 4, h / 2); ctx.stroke(); } ctx.restore(); });
  def('iman', (ctx, o) => { const w = o.w || 110, h = o.h || 130, t = o.tipo || 'U';
    if (t === 'barra') { F(ctx, Rc(-w / 2, -h / 2, w / 2, h, 3), C.rojo, { semilla: 26, volumen: .7, borde: .9, irregular: 0 }); F(ctx, Rc(0, -h / 2, w / 2, h, 3), C.azul, { semilla: 27, volumen: .7, borde: .9, irregular: 0 }); return; }
    const ro = w / 2, ri = w / 2 - h * .26, pts = []; for (let i = 0; i <= 16; i++) { const a = PI + i / 16 * PI; pts.push([Math.cos(a) * ro, Math.sin(a) * ro * .7 + h * .08]); } pts.push([ro, h / 2]); pts.push([ri, h / 2]);
    for (let i = 16; i >= 0; i--) { const a = PI + i / 16 * PI; pts.push([Math.cos(a) * ri, Math.sin(a) * ri * .7 + h * .08]); } pts.push([-ri, h / 2]); pts.push([-ro, h / 2]);
    const p = F(ctx, pts, C.acero2, { semilla: 28, volumen: .7, borde: .9, textura: .3, irregular: .3 }); ctx.save(); ctx.clip(p); ctx.fillStyle = css(C.rojo); ctx.fillRect(-ro, h * .1, ro - ri + 1, h); ctx.fillStyle = css(C.azul); ctx.fillRect(ri - 1, h * .1, ro - ri + 2, h); ctx.restore(); ctx.strokeStyle = css('#14121a', .25); ctx.lineWidth = 2; ctx.stroke(P.aPath(pts)); });
  def('helice', (ctx, o) => {
    const r = o.r || 90, n = o.palas || 2, g = o.giro || 0, rap = o.rapida || 0, c = o.color || C.madera, lado = (o.vista || 'lado') === 'lado';
    if (rap > .05) { ctx.save(); ctx.globalAlpha *= .3 * rap; ctx.fillStyle = rg(ctx, 0, 0, r * .2, r * 1.02, [[0, css(c, .15)], [.8, css(ac(c, .3), .9)], [1, css(c, 0)]]); ctx.beginPath(); ctx.ellipse(0, 0, lado ? r * .22 : r, r, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    const al = 1 - .75 * rap;
    for (let i = 0; i < n; i++) { const a = g + i * TAU / n; ctx.save(); ctx.globalAlpha *= al;
      if (lado) { const k = Math.cos(a), len = r * Math.abs(k), sg = Math.sign(k) || 1, wd = r * .15 * (.6 + .4 * Math.abs(Math.sin(a))); F(ctx, [[0, -wd * .5], [wd * .8, -len * .5 * sg], [wd * .5, -len * sg], [-wd * .5, -len * sg], [-wd * .8, -len * .5 * sg], [0, wd * .5]].map(p => [p[0], p[1]]), c, { semilla: 29 + i, volumen: .7, borde: .8, textura: .3, irregular: .3 }); }
      else { const w = r * .28, bl = [[r * .1, -w * .2], [r * .5, -w], [r, -w * .7], [r, w * .3], [r * .5, w * .55], [r * .1, w * .25]].map(([x, y]) => rot2(x, y, a)); F(ctx, bl, c, { semilla: 29 + i, volumen: .7, borde: .8, textura: .25, irregular: .3 }); }
      ctx.restore(); }
    F(ctx, E(0, 0, r * (lado ? .12 : .16), r * (lado ? .16 : .16), 0, 16), C.acero2, { semilla: 35, volumen: .7, borde: .9, irregular: 0, textura: 0 });
  }, 90);
  W2.aspas = (ctx, o) => W2.helice(ctx, Object.assign({ vista: 'frente', palas: 4, color: C.azul }, o));
  const redondea = (pts, rad) => { const out = [pts[0].slice()]; for (let i = 1; i < pts.length - 1; i++) { const a = pts[i - 1], b = pts[i], c = pts[i + 1], l1 = Math.hypot(a[0] - b[0], a[1] - b[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]), d = Math.min(rad, l1 / 2, l2 / 2), p0 = [b[0] + (a[0] - b[0]) / l1 * d, b[1] + (a[1] - b[1]) / l1 * d], p2 = [b[0] + (c[0] - b[0]) / l2 * d, b[1] + (c[1] - b[1]) / l2 * d]; for (let s = 0; s <= 6; s++) { const u = s / 6; out.push([(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * b[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * b[1] + u * u * p2[1]]); } } out.push(pts[pts.length - 1].slice()); return out; };
  W2.ruta = redondea;
  def('tubo', (ctx, o) => {
    const r = o.r || 16, c = o.color || C.acero, pts = redondea(o.pts, o.codo == null ? r * 2.2 : o.codo), L = I.luzActual.dir, liq = o.liquido;
    if (liq) { F(ctx, P.cinta(pts, r * 2, r * 2), C.vidrio, { semilla: 36, volumen: .3, borde: .9, alfa: .4, textura: 0, irregular: .2 }); }
    const rib = P.cinta(pts, r * 2, r * 2); if (!liq) F(ctx, rib, c, { semilla: 36, volumen: .35, borde: .8, anchoBorde: 4, textura: .3, irregular: .3 });
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const tr = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };
    if (liq) { tr(); ctx.strokeStyle = css(liq, .9); ctx.lineWidth = r * 1.5; ctx.stroke(); tr(); ctx.setLineDash([r * 1.4, r * 1.1]); ctx.lineDashOffset = -(o.T || 0) * (o.vel == null ? 1 : o.vel) * 60; ctx.strokeStyle = css(ac(liq, .5), .55); ctx.lineWidth = r * .8; ctx.stroke(); ctx.setLineDash([]); }
    ctx.save(); ctx.translate(L[0] * r * .4, L[1] * r * .4); tr(); ctx.strokeStyle = 'rgba(255,240,210,.26)'; ctx.lineWidth = r * .34; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(-L[0] * r * .45, -L[1] * r * .45); tr(); ctx.strokeStyle = 'rgba(20,16,26,.2)'; ctx.lineWidth = r * .5; ctx.stroke(); ctx.restore(); ctx.restore();
    if (o.bridas !== false) for (const [i, j] of [[0, 1], [pts.length - 1, pts.length - 2]]) { const a = Math.atan2(pts[j][1] - pts[i][1], pts[j][0] - pts[i][0]); ctx.save(); ctx.translate(pts[i][0], pts[i][1]); ctx.rotate(a); F(ctx, Rc(0, -r * 1.3, r * .75, r * 2.6, 3), os(c, .1), { semilla: 37, volumen: .7, borde: .9, irregular: 0, textura: .2 }); ctx.restore(); }
  });
  def('valvula', (ctx, o) => { const g = o.giro != null ? o.giro : (o.abierta || 0) * TAU * 1.2, c = o.color || C.laton;
    F(ctx, Rc(-55, -22, 110, 44, 6), C.acero2, { semilla: 38, volumen: .6, borde: .9, irregular: 0 }); F(ctx, Rc(-62, -30, 14, 60, 3), C.acero, { semilla: 39, volumen: .7, borde: .9, irregular: 0 }); F(ctx, Rc(48, -30, 14, 60, 3), C.acero, { semilla: 40, volumen: .7, borde: .9, irregular: 0 });
    F(ctx, Rc(-22, -58, 44, 40, 10), c, { semilla: 41, volumen: .8, borde: .9, textura: .3 }); F(ctx, Rc(-5, -92, 10, 38, 2), C.acero, { semilla: 42, volumen: .7, borde: .8, irregular: 0 });
    F(ctx, E(0, -96, 42, 9, 0, 24), C.rojo, { semilla: 43, volumen: .7, borde: .9, irregular: 0 }); ctx.strokeStyle = css(os(C.rojo, .3)); ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let i = 0; i < 2; i++) { const a = g + i * PI / 2; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * 40, -96 - Math.sin(a) * 8); ctx.lineTo(Math.cos(a) * 40, -96 + Math.sin(a) * 8); ctx.stroke(); } F(ctx, E(0, -96, 8, 5, 0, 10), C.acero, { semilla: 44, volumen: .7, irregular: 0 }); }, 100);
  def('grifo', (ctx, o) => { const ab = o.abierto == null ? 0 : o.abierto, T_ = o.T || 0, suelo = o.suelo == null ? 220 : o.suelo, c = o.color || C.acero;
    F(ctx, Rc(-18, -10, 36, 80, 6), c, { semilla: 45, volumen: .8, borde: .9, textura: .3 }); F(ctx, P.cinta([[0, -6], [0, -64], [24, -90], [64, -90], [88, -70]], 26, 20), c, { semilla: 46, volumen: .8, borde: .9, textura: .3, irregular: .3 });
    F(ctx, Rc(78, -72, 22, 12, 3), os(c, .2), { semilla: 47, volumen: .7, irregular: 0 }); ctx.save(); ctx.translate(0, -10); ctx.rotate(-ab * 1.1 - .2); F(ctx, Rc(-5, -48, 10, 48, 5), C.rojo, { semilla: 48, volumen: .8, borde: .9 }); ctx.restore();
    if (ab > .02) { const x = 89, y0 = -62, w = 10 + ab * 12; ctx.fillStyle = lg(ctx, x - w / 2, 0, x + w / 2, 0, [[0, css(C.agua, .85)], [.4, css('#d6eef5', .9)], [1, css(os(C.agua, .2), .85)]]); ctx.fillRect(x - w / 2, y0, w, suelo - y0); ctx.fillStyle = css('#e6f6fa', .6); for (let i = 0; i < 5; i++) { const u = ((T_ * 2.5 + i / 5) % 1); ctx.fillRect(x - w / 2 + 2, y0 + u * (suelo - y0), 2.5, 18); } } }, 90);
  def('manometro', (ctx, o) => { const r = o.r || 50, v = clamp(o.valor == null ? .5 : o.valor), T_ = o.T || 0;
    F(ctx, E(0, 0, r, r, 0, 32), C.acero, { semilla: 49, volumen: .8, borde: .9, textura: .3, irregular: .3 }); F(ctx, E(0, 0, r * .82, r * .82, 0, 32), '#e7dcc2', { semilla: 50, volumen: .2, borde: .3, irregular: 0, textura: .2, sombraInterna: .5 });
    ctx.strokeStyle = css(C.rojo, .85); ctx.lineWidth = r * .1; ctx.beginPath(); ctx.arc(0, 0, r * .66, PI * .75 + TAU * .75 * .72, PI * .75 + TAU * .75, false); ctx.stroke(); ctx.strokeStyle = css('#1d2230', .7); ctx.lineWidth = 2; for (let i = 0; i <= 8; i++) { const a = PI * .75 + i / 8 * TAU * .75; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); ctx.lineTo(Math.cos(a) * r * .72, Math.sin(a) * r * .72); ctx.stroke(); }
    const a = PI * .75 + (v + (v > .8 ? Math.sin(T_ * 40) * .015 : 0)) * TAU * .75; ctx.strokeStyle = css('#1d2230'); ctx.lineWidth = r * .06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * .62, Math.sin(a) * r * .62); ctx.stroke(); F(ctx, E(0, 0, r * .09, r * .09, 0, 12), C.hierro, { semilla: 51, irregular: 0, textura: 0 });
    ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(-r * .25, -r * .4, r * .35, r * .14, -.5, 0, TAU); ctx.fill(); });
  def('vaso', (ctx, o) => {
    const w = o.w || 120, h = o.h || 150, nv = o.nivel == null ? .6 : o.nivel, liq = o.liquido || C.agua, ag = o.agita || 0, T_ = o.T || 0, fm = o.forma || 'vaso', th = fm === 'tanque' ? 10 : 5;
    const taper = fm === 'vaso' ? w * .08 : 0, pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2 - taper, h / 2 - 18], [w / 2 - taper - 14, h / 2], [-w / 2 + taper + 14, h / 2], [-w / 2 + taper, h / 2 - 18]];
    const ip = P.aPath(P.suavizar(pts, 3)); ctx.save(); ctx.fillStyle = css(C.vidrio, .13); ctx.fill(ip);
    ctx.clip(ip); if (nv > .01) { const m = ctx.getTransform(), det = m.a * m.d - m.b * m.c || 1, bx = (m.d * 1 - m.c * 0) / det, by = (-m.b * 1 + m.a * 0) / det, be = Math.atan2(by, bx), yl = h / 2 - nv * h + h * .02;
      ctx.save(); ctx.translate(0, yl); ctx.rotate(be); ctx.beginPath(); ctx.moveTo(-w * 2, h * 3); for (let x = -w * 2; x <= w * 2; x += 12) ctx.lineTo(x, Math.sin(x * .09 + T_ * (3 + ag * 6)) * (2 + ag * 9) + Math.sin(x * .05 - T_ * 2.1) * 1.5); ctx.lineTo(w * 2, h * 3); ctx.closePath();
      ctx.fillStyle = lg(ctx, 0, 0, 0, h, [[0, css(liq, .9)], [1, css(os(liq, .35), .95)]]); ctx.fill(); ctx.strokeStyle = css(ac(liq, .55), .8); ctx.lineWidth = 3; ctx.stroke();
      if (o.burbujas || ag > 0) { ctx.fillStyle = css(ac(liq, .6), .55); const nb = 10 + ((ag * 8) | 0); for (let i = 0; i < nb; i++) { const u = ((T_ * (.5 + hash(i) * .8) * (1 + ag * 2) + hash(i + 5)) % 1); ctx.beginPath(); ctx.arc((hash(i + 9) - .5) * w * .8, h * .15 - u * Math.min(h * .9, nv * h), 2 + hash(i + 3) * 4, 0, TAU); ctx.fill(); } }
      ctx.restore(); }
    ctx.restore(); ctx.save(); ctx.lineJoin = 'round'; const sp = P.suavizar(pts, 3); ctx.beginPath(); sp.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.strokeStyle = css(fm === 'tanque' ? C.acero : '#dff0f2', fm === 'tanque' ? 1 : .6); ctx.lineWidth = th; ctx.stroke(); if (fm === 'tanque') { ctx.strokeStyle = css('#14121a', .35); ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,250,.42)'; ctx.beginPath(); ctx.roundRect(-w / 2 + w * .12, -h / 2 + 14, w * .07, h * .6, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,250,.2)'; ctx.beginPath(); ctx.roundRect(w / 2 - w * .2, -h / 2 + 24, w * .04, h * .3, 4); ctx.fill();
    ctx.restore(); F(ctx, E(0, -h / 2, w / 2, 7, 0, 24), '#e9f4f4', { semilla: 52, alfa: .35, volumen: .3, borde: .8, irregular: 0, textura: 0 }); }, 90);
  W2.cable = (ctx, o) => { const e = ent(o); if (!e) return; const [x0, y0] = o.de, [x1, y1] = o.a, sag = o.flojo == null ? 60 : o.flojo, c = o.color || C.rojo, T_ = o.T || 0, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag * 1.4;
    ctx.save(); ctx.globalAlpha *= e.a; ctx.lineCap = 'round'; const tr = () => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); }; tr(); ctx.strokeStyle = css('#14121a', .9); ctx.lineWidth = 11; ctx.stroke(); tr(); ctx.strokeStyle = css(c); ctx.lineWidth = 7; ctx.stroke(); ctx.save(); ctx.translate(-1.5, -2); tr(); ctx.strokeStyle = 'rgba(255,240,210,.35)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    if (o.vivo) for (let i = 0; i < 4; i++) { const u = (T_ * 1.4 + i / 4) % 1, x = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, y = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * y1; ctx.fillStyle = css('#fff2b0', .9); ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
    for (const [x, y] of [[x0, y0], [x1, y1]]) F(ctx, E(x, y, 9, 9, 0, 12), C.acero2, { semilla: 53, volumen: .7, irregular: 0, textura: 0 }); ctx.restore(); };
  W2.biela = (ctx, o) => { const e = ent(o); if (!e) return; const [x0, y0] = o.de, [x1, y1] = o.a, r = o.r || 10, c = o.color || C.acero; ctx.save(); ctx.globalAlpha *= e.a; F(ctx, P.capsula(x0, y0, r * 1.2, x1, y1, r, 8), c, { semilla: 54, volumen: .7, borde: .9, anchoBorde: 4, textura: .3, irregular: .3 }); for (const [x, y] of [[x0, y0], [x1, y1]]) { ctx.fillStyle = css('#14121a', .75); ctx.beginPath(); ctx.arc(x, y, r * .55, 0, TAU); ctx.fill(); F(ctx, E(x, y, r * .3, r * .3, 0, 10), ac(c, .2), { semilla: 55, irregular: 0, textura: 0 }); } ctx.restore(); };
  def('manivela', (ctx, o) => { const r = o.r || 40, g = o.giro || 0, c = o.color || C.acero2; F(ctx, E(0, 0, r * 1.25, r * 1.25, 0, 28), c, { semilla: 56, volumen: .7, borde: .9, textura: .3, irregular: .3 }); F(ctx, E(0, 0, r * .3, r * .3, 0, 12), ac(c, .2), { semilla: 57, irregular: 0, textura: 0 }); F(ctx, E(Math.cos(g) * r, Math.sin(g) * r, r * .22, r * .22, 0, 12), C.laton, { semilla: 58, volumen: .8, borde: .9, irregular: 0, textura: 0 }); }, 60);
  W2.piston = (ctx, o) => { const e = ent(o); if (!e) return; const R_ = o.r || 40, Ln = o.largo || 170, f = o.fase || 0, cw = (o.ancho || 74) / 2, c = o.color || C.acero, px = R_ * Math.sin(f), py = -R_ * Math.cos(f), wy = py - Math.sqrt(Math.max(1, Ln * Ln - px * px));
    ctx.save(); ctx.translate(o.x || 0, o.y || 0); ctx.globalAlpha *= e.a; const top = -(R_ + Ln) - 70;
    F(ctx, Rc(-cw - 12, top, 2 * cw + 24, -top * .64, 8), os(c, .2), { semilla: 59, volumen: .6, borde: .9, textura: .4 }); ctx.fillStyle = css('#14121a', .8); ctx.fillRect(-cw, top + 10, 2 * cw, -top * .64 - 10);
    W2.biela(ctx, { de: [px, py], a: [0, wy], r: 10, color: c }); const pk = F(ctx, Rc(-cw + 3, wy - 34, 2 * cw - 6, 54, 6), ac(c, .08), { semilla: 60, volumen: .7, borde: .9, textura: .3 }); cilindrar(ctx, pk, 0, wy - 7, 2 * cw - 6, 54, false, .8); ctx.fillStyle = css('#14121a', .5); for (const dy of [-26, -17]) ctx.fillRect(-cw + 3, wy + dy, 2 * cw - 6, 3);
    W2.manivela(ctx, { x: 0, y: 0, r: R_, giro: f - PI / 2 }); ctx.restore(); };
  def('bisagra', (ctx, o) => { const w = o.w || 56, h = o.h || 74, c = o.color || C.acero; F(ctx, Rc(-w, -h / 2, w, h, 4), c, { semilla: 61, volumen: .7, borde: .9, irregular: 0 }); ctx.save(); ctx.rotate(-(o.abre || 0)); F(ctx, Rc(0, -h / 2, w, h, 4), ac(c, .05), { semilla: 62, volumen: .7, borde: .9, irregular: 0 }); ctx.restore(); const p = F(ctx, Rc(-7, -h / 2 - 3, 14, h + 6, 6), C.acero2, { semilla: 63, volumen: .7, borde: .9, irregular: 0 }); cilindrar(ctx, p, 0, 0, 14, h + 6, true); tornillito(ctx, -w * .6, -h * .25, 4); tornillito(ctx, -w * .6, h * .25, 4); });
  def('tornillo', (ctx, o) => { const r = o.r || 18, g = o.giro || 0, t = o.tipo || 'cruz', c = o.color || C.acero;
    if ((o.vista || 'frente') === 'lado') { const L = o.largo || 70; F(ctx, Rc(-r, -r * .55, r * 2, r * .55, 3), c, { semilla: 64, volumen: .8, borde: .9, irregular: 0 }); const sh = F(ctx, Rc(-r * .55, 0, r * 1.1, L, 2), os(c, .1), { semilla: 65, volumen: .6, borde: .8, irregular: 0 }); ctx.save(); ctx.clip(sh); ctx.strokeStyle = css('#14121a', .55); ctx.lineWidth = 2.5; for (let y = -8 + ((g * 3) % 9 + 9) % 9; y < L + 8; y += 9) { ctx.beginPath(); ctx.moveTo(-r * .6, y); ctx.lineTo(r * .6, y + 5); ctx.stroke(); } ctx.restore(); return; }
    if (t === 'hex') { const pts = []; for (let i = 0; i < 6; i++) pts.push([Math.cos(g + i * PI / 3) * r, Math.sin(g + i * PI / 3) * r]); F(ctx, pts, c, { semilla: 66, volumen: .8, borde: .9, irregular: 0, textura: .3 }); F(ctx, E(0, 0, r * .55, r * .55, 0, 18), os(c, .15), { semilla: 67, volumen: .6, borde: .5, irregular: 0, textura: 0 }); return; }
    F(ctx, E(0, 0, r, r, 0, 24), c, { semilla: 66, volumen: .8, borde: .9, irregular: 0, textura: .3 }); ctx.strokeStyle = css('#1d2230', .8); ctx.lineWidth = r * .22; ctx.lineCap = 'round'; for (let i = 0; i < (t === 'cruz' ? 2 : 1); i++) { const a = g + i * PI / 2; ctx.beginPath(); ctx.moveTo(-Math.cos(a) * r * .62, -Math.sin(a) * r * .62); ctx.lineTo(Math.cos(a) * r * .62, Math.sin(a) * r * .62); ctx.stroke(); } }, 40);
  def('bombilla', (ctx, o) => { const r = o.r || 50, b = o.brillo == null ? 1 : o.brillo, T_ = o.T || 0, fl = o.roto ? 0 : b * (1 + .04 * N1(T_ * 20, 4));
    if (fl > .02) I.halo(ctx, 0, -r * .2, r * 4.2, '#ffd890', .55 * fl);
    const bulb = [[-r * .32, r * .75]]; for (let i = 0; i <= 24; i++) { const a = PI * .62 + i / 24 * (PI * 1.76); bulb.push([Math.cos(a) * r, -r * .25 + Math.sin(a) * r]); } bulb.push([r * .32, r * .75]);
    const gp = F(ctx, bulb, mz('#cfe2e0', '#fff0c0', fl * .8), { semilla: 68, volumen: .5, borde: .9, textura: 0, irregular: 0, alfa: .55 + .35 * fl, sombraInterna: .2 });
    ctx.save(); ctx.clip(gp); ctx.fillStyle = rg(ctx, 0, -r * .2, 0, r * .9, [[0, css('#fff6d0', .95 * fl)], [1, css('#ffd890', 0)]]); ctx.fillRect(-r, -r * 1.4, 2 * r, 2.4 * r); ctx.restore();
    ctx.strokeStyle = css(o.roto ? '#3a3a40' : mz('#6a5a40', '#fff8e0', fl), 1); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r * .18, r * .6); ctx.lineTo(-r * .2, r * .05); ctx.moveTo(r * .18, r * .6); ctx.lineTo(r * .2, r * .05); ctx.stroke();
    ctx.strokeStyle = css(o.roto ? '#3a3a40' : mz('#8a6a40', '#ffffff', fl)); ctx.lineWidth = 3.5; ctx.beginPath(); if (o.roto) { ctx.moveTo(-r * .2, r * .05); for (let i = 1; i <= 4; i++) ctx.lineTo(-r * .2 + i * r * .05, r * .05 - (i % 2) * 6); ctx.moveTo(r * .2, r * .05); ctx.lineTo(r * .12, r * .12); } else { ctx.moveTo(-r * .2, r * .05); for (let i = 1; i <= 8; i++) ctx.lineTo(-r * .2 + i * r * .05, r * .05 + (i % 2 ? -6 : 3)); } ctx.stroke();
    const bs = F(ctx, Rc(-r * .34, r * .72, r * .68, r * .6, 6), C.laton, { semilla: 69, volumen: .8, borde: .9, textura: .3 }); ctx.strokeStyle = css('#14121a', .45); ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * .34, r * .86 + i * r * .14); ctx.lineTo(r * .34, r * .8 + i * r * .14); ctx.stroke(); } F(ctx, Rc(-r * .12, r * 1.28, r * .24, r * .12, 4), C.hierro, { semilla: 70, irregular: 0, textura: 0 }); }, 70);
  def('boton', (ctx, o) => { const r = o.r || 26, p = o.pulsa || 0, c = o.color || C.rojo; F(ctx, Rc(-r * 1.3, -r * .3, r * 2.6, r * .9, 6), C.hierro, { semilla: 71, volumen: .7, borde: .8, irregular: 0 }); F(ctx, Rc(-r, -r * .9 + p * r * .5, r * 2, r * (1.1 - p * .5), r * .5), c, { semilla: 72, volumen: .9, borde: 1, anchoBorde: 5, textura: .2 }); });
  def('palanca', (ctx, o) => { const L = o.largo || 80, a = o.ang || 0; F(ctx, Rc(-26, -8, 52, 24, 6), C.hierro, { semilla: 73, volumen: .7, borde: .8, irregular: 0 }); ctx.save(); ctx.translate(0, -2); ctx.rotate(a); F(ctx, P.capsula(0, 0, 6, 0, -L, 5), C.acero, { semilla: 74, volumen: .8, borde: .9, irregular: 0, textura: .2 }); F(ctx, E(0, -L, 13, 13, 0, 16), o.color || C.rojo, { semilla: 75, volumen: .9, borde: 1, irregular: 0, textura: .1 }); ctx.restore(); F(ctx, E(0, -2, 9, 9, 0, 12), C.acero2, { semilla: 76, irregular: 0, textura: 0 }); });
  def('perilla', (ctx, o) => { const r = o.r || 30, a = o.ang || 0; ctx.strokeStyle = css('#14121a', .5); ctx.lineWidth = 3; for (let i = 0; i <= 6; i++) { const q = -PI * .85 + i / 6 * PI * 1.7 - PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(q) * r * 1.2, Math.sin(q) * r * 1.2); ctx.lineTo(Math.cos(q) * r * 1.4, Math.sin(q) * r * 1.4); ctx.stroke(); } F(ctx, E(0, 0, r, r, 0, 28), o.color || C.crema, { semilla: 77, volumen: .9, borde: 1, anchoBorde: 5, textura: .2, irregular: .2 }); ctx.strokeStyle = css('#14121a'); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(Math.cos(a - PI / 2) * r * .3, Math.sin(a - PI / 2) * r * .3); ctx.lineTo(Math.cos(a - PI / 2) * r * .85, Math.sin(a - PI / 2) * r * .85); ctx.stroke(); });

  // ------------------------------------------------------------------ EFECTOS (deterministas: dependen de T y de desde)
  const puffs = new Map();
  function puff(color) { let c = puffs.get(color); if (c) return c; c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = rg(x, 64, 64, 0, 62, [[0, css(color, .9)], [.55, css(color, .5)], [1, css(color, 0)]]); x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 6; i++) { const a = i * 1.1, r = 22 + (i % 3) * 5; x.fillStyle = rg(x, 64 + Math.cos(a) * 18, 64 + Math.sin(a) * 18, 0, r, [[0, css(ac(color, .12), .45)], [1, css(color, 0)]]); x.fillRect(0, 0, 128, 128); } puffs.set(color, c); return c; }
  const nube = (ctx, color, x, y, r, a) => { if (a <= .003) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(puff(color), x - r, y - r, 2 * r, 2 * r); };
  function humo(ctx, o) { const T = o.T || 0, d0 = o.desde || 0, k = o.k == null ? 1 : o.k, n = o.n || 10, col = o.color || '#3d3a44', su = o.sube || 280, tam = o.tam || 64, x = o.x || 0, y = o.y || 0, t = T - d0; if (t < 0 || k <= 0) return;
    ctx.save(); const vel = o.vel || .35; for (let i = 0; i < n; i++) { const u = (t * vel + i / n) % 1, h = hash(i + (o.semilla || 0)); nube(ctx, col, x + Math.sin(u * 6 + i) * 26 * u + (h - .5) * (o.ancho || 40), y - su * u, tam * (.45 + u * 1.3), k * (1 - u) * Math.min(1, t * 2.5) * .8); } ctx.restore(); }
  W2.humo = (ctx, o) => humo(ctx, o);
  W2.vapor = (ctx, o) => humo(ctx, Object.assign({ color: '#e9eef0', vel: .6, tam: 40, sube: 240, n: 14, ancho: 30 }, o));
  W2.chispas = (ctx, o) => { const T = o.T || 0, t = T - (o.desde || 0), k = o.k == null ? 1 : o.k, n = o.n || 16, r = o.r || 150, x = o.x || 0, y = o.y || 0; if (t < 0 || k <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; I.halo(ctx, x, y, r * .5, '#ffd070', .5 * k * (.6 + .4 * Math.abs(Math.sin(T * 31))));
    for (let i = 0; i < n; i++) { const per = .45 + hash(i + 40) * .35, u = (t / per + hash(i)) % 1, a = (o.ang == null ? -PI / 2 : o.ang) + (hash(i + 9) - .5) * (o.abre || 2.6), v = r * (.45 + hash(i + 20) * .9), px = x + Math.cos(a) * v * u, py = y + Math.sin(a) * v * u + 380 * u * u, u2 = Math.max(0, u - .07), qx = x + Math.cos(a) * v * u2, qy = y + Math.sin(a) * v * u2 + 380 * u2 * u2;
      ctx.strokeStyle = css(hash(i + 3) > .5 ? '#fff0b0' : '#ffb04a', k * (1 - u)); ctx.lineWidth = 3.5 * (1 - u * .6); ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke(); } ctx.restore(); };
  W2.arco = (ctx, o) => { const T = o.T || 0, [x0, y0] = o.de, [x1, y1] = o.a, k = o.k == null ? 1 : o.k, n = 9, f = Math.floor(T * 16), L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L; if (k <= 0) return;
    const pts = []; for (let i = 0; i <= n; i++) { const u = i / n, off = i === 0 || i === n ? 0 : (hash(f * 13 + i) - .5) * (o.ancho || 46); pts.push([x0 + (x1 - x0) * u + nx * off, y0 + (y1 - y0) * u + ny * off]); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = ctx.lineCap = 'round'; for (const [w, c, a] of [[16, '#7fa8ff', .35], [7, '#cfe0ff', .7], [3, '#ffffff', 1]]) { ctx.strokeStyle = css(c, a * k); ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); } ctx.restore(); };
  W2.salpica = (ctx, o) => { const T = o.T || 0, du = o.dur || 1.1, u = (T - (o.desde || 0)) / du, n = o.n || 22, col = o.color || C.agua, x = o.x || 0, y = o.y || 0; if (u < 0 || u > 1) return;
    ctx.save(); for (let i = 0; i < n; i++) { const vx = (hash(i) - .5) * (o.ancho || 520), vy = (o.alto || 560) * (.5 + hash(i + 7) * .7), px = x + vx * u * du, py = y - vy * u * du + 700 * Math.pow(u * du, 2), an = Math.atan2(-vy + 1400 * u * du, vx), r = 4 + hash(i + 3) * 7 * (1 - u * .5);
      ctx.globalAlpha = Math.min(1, (1 - u) * 1.6); ctx.fillStyle = css(ac(col, .15)); ctx.beginPath(); ctx.ellipse(px, py, r * 1.6, r, an, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(px - r * .3, py - r * .3, r * .3, 0, TAU); ctx.fill(); } ctx.restore(); };
  W2.chorro = (ctx, o) => { const T = o.T || 0, t = T - (o.desde || 0), k = o.k == null ? 1 : o.k, x = o.x || 0, y = o.y || 0, a = o.ang == null ? -1.2 : o.ang, v = o.fuerza || 760, g = 1500, col = o.color || C.agua, w = o.ancho || 16, suelo = o.suelo; if (t < 0 || k <= 0) return;
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v, pts = []; let tm = Math.min(1.6, t * 3) * (o.largo ? Math.min(1.6, o.largo / v) : 1); for (let i = 0; i <= 28; i++) { const s = tm * i / 28, px = x + vx * s, py = y + vy * s + .5 * g * s * s; if (suelo != null && py > suelo) { pts.push([px, suelo]); break; } pts.push([px, py]); }
    ctx.save(); ctx.globalAlpha *= k; ctx.lineCap = ctx.lineJoin = 'round'; const tr = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };
    tr(); ctx.strokeStyle = css(os(col, .2), .95); ctx.lineWidth = w; ctx.stroke(); tr(); ctx.strokeStyle = css(ac(col, .1), .95); ctx.lineWidth = w * .7; ctx.stroke(); tr(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = w * .25; ctx.setLineDash([22, 26]); ctx.lineDashOffset = -T * 420; ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    const e = pts[pts.length - 1]; if (suelo != null && e[1] >= suelo - 1) { for (let i = 0; i < 9; i++) { const u = (T * 2.6 + i / 9) % 1, s = (hash(i) - .5) * 2; ctx.save(); ctx.globalAlpha = k * (1 - u); ctx.fillStyle = css(ac(col, .2)); ctx.beginPath(); ctx.arc(e[0] + s * 70 * u, e[1] - Math.sin(u * PI) * 70 * (.5 + hash(i + 4)), 4 + hash(i + 2) * 4, 0, TAU); ctx.fill(); ctx.restore(); } } };
  def('derrame', (ctx, o) => { const w = (o.w || 300) * (o.k == null ? 1 : sale(o.k)), col = o.color || C.agua; if (w < 2) return; F(ctx, E(0, 0, w / 2, Math.max(3, w * .05), 0, 30), col, { semilla: 80, volumen: .6, borde: .9, irregular: 2, textura: .1, alfa: .92, sombraInterna: .2 }); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-w * .12, -w * .012, w * .2, w * .012, 0, 0, TAU); ctx.fill(); });
  W2.agua = (ctx, o) => { const T = o.T || 0, y = o.y == null ? 0 : o.y, k = o.k == null ? 1 : o.k, col = o.color || C.agua, i = BASE ? BASE.inverse() : new DOMMatrix(), pp = [[0, 0], [W, 0], [0, H], [W, H]].map(([a, b]) => [i.a * a + i.c * b + i.e, i.b * a + i.d * b + i.f]), x0 = Math.min(...pp.map(p => p[0])) - 60, x1 = Math.max(...pp.map(p => p[0])) + 60, y1 = Math.max(...pp.map(p => p[1])) + 60; if (k <= 0 || y > y1) return;
    ctx.save(); ctx.globalAlpha *= k; ctx.beginPath(); ctx.moveTo(x0, y1); for (let x = x0; x <= x1; x += 24) ctx.lineTo(x, y + Math.sin(x * .02 + T * 2.2) * 7 + Math.sin(x * .047 - T * 1.7) * 4); ctx.lineTo(x1, y1); ctx.closePath(); ctx.fillStyle = lg(ctx, 0, y, 0, y + 700, [[0, css(ac(col, .1), .72)], [1, css(os(col, .45), .86)]]); ctx.fill(); ctx.strokeStyle = 'rgba(235,248,250,.75)'; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = 'rgba(235,248,250,.16)'; ctx.lineWidth = 3; for (let j = 0; j < 6; j++) { ctx.beginPath(); for (let x = x0; x <= x1; x += 30) { const yy = y + 50 + j * 46 + Math.sin(x * .015 + T + j) * 9; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); }
    ctx.strokeStyle = 'rgba(235,248,250,.5)'; ctx.lineWidth = 2.5; for (let j = 0; j < 22; j++) { const u = (T * (.2 + hash(j) * .3) + hash(j + 9)) % 1, bx = x0 + hash(j + 3) * (x1 - x0) + Math.sin(T * 2 + j) * 8; ctx.beginPath(); ctx.arc(bx, y1 - u * (y1 - y), 4 + hash(j + 5) * 6, 0, TAU); ctx.stroke(); } ctx.restore(); };
  let SCR = null; const scratch = () => SCR || (SCR = Object.assign(document.createElement('canvas'), { width: W, height: H }));
  W2.calentar = (ctx, o, fn) => { const k = clamp(o.k == null ? 1 : o.k), T = o.T || 0; if (k <= .01) { fn(ctx); return; } const sc = scratch(), c = sc.getContext('2d'), m = ctx.getTransform();
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, W, H); c.setTransform(m); fn(c); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop'; const p = .8 + .2 * Math.sin(T * 14);
    c.fillStyle = css(o.color || '#ff4a22', k * .62 * p); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'lighter'; c.fillStyle = css('#ff8a3a', k * .2 * p); c.fillRect(0, 0, W, H); c.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(sc, 0, 0); if (o.halo) { const q = [m.a * o.halo[0] + m.c * o.halo[1] + m.e, m.b * o.halo[0] + m.d * o.halo[1] + m.f]; I.halo(ctx, q[0], q[1], (o.halo[2] || 200) * m.a, '#ff5a2a', .5 * k * p); } ctx.restore(); };
  W2.polvo = (ctx, o) => { const T = o.T || 0, u = (T - (o.desde || 0)) / (o.dur || 1.1), r = o.r || 90, x = o.x || 0, y = o.y || 0, col = o.color || '#c8b494'; if (u < 0 || u > 1) return;
    ctx.save(); const n = o.n || 8; for (let i = 0; i < n; i++) { const s = (i / (n - 1) - .5) * 2, sd = hash(i + 1); nube(ctx, col, x + s * r * (.6 + u * 1.7), y - 10 - r * .35 * Math.sin(u * PI) * (.4 + sd * .6) - u * 30, r * (.35 + .35 * u + sd * .15), (1 - u) * .8); } ctx.restore(); };
  W2.explosion = (ctx, o) => { const k = clamp(o.k == null ? 1 : o.k), r = o.r || 220, x = o.x || 0, y = o.y || 0, T = o.T || 0; if (k <= 0 || k >= 1) return; const s = sale(Math.min(1, k * 3)), a = 1 - prog(k, .45, 1);
    ctx.save(); I.halo(ctx, x, y, r * 2.2 * s, '#ffe0a0', .9 * (1 - k)); ctx.translate(x, y); const pts = []; for (let i = 0; i < 20; i++) { const q = i * PI / 10, rr = r * s * (i % 2 ? .62 : 1.05); pts.push([Math.cos(q + .2) * rr, Math.sin(q + .2) * rr]); }
    ctx.globalAlpha = a; F(ctx, pts, '#e8a24a', { semilla: 81, volumen: .7, borde: 1, anchoBorde: 6, textura: .2, irregular: .5 }); F(ctx, pts.map(p => [p[0] * .6, p[1] * .6]), '#ffe080', { semilla: 82, volumen: .5, borde: .7, textura: .1, irregular: .4 }); ctx.restore();
    ctx.save(); for (let i = 0; i < 9; i++) { const q = i * TAU / 9 + .4, d = r * (.5 + sale(k) * .9) * (.8 + hash(i) * .4); nube(ctx, i % 3 ? '#5b5560' : '#8a8088', x + Math.cos(q) * d, y + Math.sin(q) * d * .8 - k * 40, r * (.3 + .25 * hash(i + 3)) * (.6 + k), (1 - k) * .85 * Math.min(1, k * 6)); } ctx.restore();
    ctx.save(); ctx.fillStyle = css('#ffdca0'); for (let i = 0; i < 12; i++) { const q = i * TAU / 12 + hash(i) * .5, d = r * 1.6 * sale(k) * (.6 + hash(i + 5) * .6); ctx.globalAlpha = a; ctx.save(); ctx.translate(x + Math.cos(q) * d, y + Math.sin(q) * d + 160 * k * k); ctx.rotate(i + T * 6); ctx.fillRect(-5, -3, 10, 6); ctx.restore(); } ctx.restore(); };
  W2.onda = (ctx, o) => { const k = clamp(o.k == null ? 1 : o.k); if (k <= 0 || k >= 1) return; ctx.save(); ctx.strokeStyle = css(o.color || '#ffe9c0', (1 - k) * .9); ctx.lineWidth = 12 * (1 - k) + 2; ctx.beginPath(); ctx.ellipse(o.x || 0, o.y || 0, (o.r || 160) * sale(k), (o.r || 160) * sale(k) * (o.aplastada || 1), 0, 0, TAU); ctx.stroke(); ctx.restore(); };
  W2.destello = (ctx, o) => { const k = clamp(o.k == null ? 1 : o.k); if (k <= 0) return; ctx.save(); ctx.translate(o.x || 0, o.y || 0); destello(ctx, o.r || 60, k); ctx.restore(); };
  W2.flecha = (ctx, o) => { const k = clamp(o.k == null ? 1 : o.k), T = o.T || 0; if (k <= .01) return; const [x0, y0] = o.de, [x1, y1] = o.a, L = Math.hypot(x1 - x0, y1 - y0) * sale(k), an = Math.atan2(y1 - y0, x1 - x0), w = (o.grosor || 24) * (1 + .05 * Math.sin(T * 8)), c = o.color || '#e0b060', hd = Math.min(L * .6, w * 2.1);
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(an); ctx.globalAlpha *= Math.min(1, k * 4); const pts = [[0, -w / 2], [L - hd, -w / 2], [L - hd, -w * .95], [L, 0], [L - hd, w * .95], [L - hd, w / 2], [0, w / 2]]; ctx.fillStyle = css('#14121a', .35); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0] + 5, p[1] + 7) : ctx.moveTo(p[0] + 5, p[1] + 7)); ctx.fill();
    F(ctx, pts, c, { semilla: 83, volumen: .7, borde: .9, anchoBorde: 4, textura: .2, irregular: .3, contorno: os(c, .5), anchoContorno: 3 }); ctx.restore(); };
  W2.viento = (ctx, o) => { const T = o.T || 0, n = o.n || 10, w = o.w || 500, h = o.h || 200, an = o.ang == null ? PI : o.ang, ca = Math.cos(an), sa = Math.sin(an), lg_ = o.largo || 170, vel = o.vel || 1, x = o.x || 0, y = o.y || 0, col = o.color || '#f1e7d2', cur = o.curva; if ((o.k == null ? 1 : o.k) <= 0) return;
    ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; for (let i = 0; i < n; i++) { const u = (T * vel * (.7 + hash(i + 2) * .6) * .8 + hash(i + 11)) % 1, row = (hash(i) - .5) * h, p0 = (u - .5) * w; ctx.strokeStyle = css(col, (o.alfa == null ? .65 : o.alfa) * Math.sin(PI * u) * (o.k == null ? 1 : o.k)); ctx.lineWidth = o.grosor || 5; ctx.beginPath();
      for (let s = 0; s <= 8; s++) { const al = p0 + s / 8 * lg_, off = row + (cur ? cur(al, row, i) : 0); const px = x + ca * al - sa * off, py = y + sa * al + ca * off; s ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); } ctx.restore(); };
  W2.icono = (ctx, tipo, o = {}) => { const k = o.k == null ? 1 : o.k; if (k <= 0) return; const s = (o.s || 1) * (k >= 1 ? 1 : Math.max(.01, rebote(k))), c = o.color || '#e0b060', ol = '#1d2230'; ctx.save(); ctx.translate(o.x || 0, o.y || 0); ctx.scale(s, s); ctx.rotate(o.rot || 0); ctx.lineCap = ctx.lineJoin = 'round';
    const trazo = (w, col) => { ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke(); };
    if (tipo === 'pregunta' || tipo === 'exclama') { const pa = () => { ctx.beginPath(); if (tipo === 'pregunta') { ctx.arc(0, -38, 30, PI * 1.05, PI * 2.45); ctx.quadraticCurveTo(14, 0, 0, 22); ctx.lineTo(0, 34); } else { ctx.moveTo(0, -80); ctx.lineTo(0, 18); } }; pa(); trazo(34, ol); pa(); trazo(22, c); ctx.fillStyle = ol; ctx.beginPath(); ctx.arc(0, 66, 19, 0, TAU); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 66, 12, 0, TAU); ctx.fill(); }
    else if (tipo === 'rayo') { const pts = [[10, -60], [-26, 8], [-2, 8], [-14, 60], [28, -10], [4, -10]]; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); trazo(10, ol); ctx.fillStyle = c; ctx.fill(); }
    else if (tipo === 'estrella') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, r = i % 2 ? 24 : 56; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); trazo(10, ol); ctx.fillStyle = c; ctx.fill(); }
    else if (tipo === 'gota') { ctx.beginPath(); ctx.moveTo(0, -56); ctx.bezierCurveTo(40, -4, 40, 40, 0, 44); ctx.bezierCurveTo(-40, 40, -40, -4, 0, -56); trazo(9, ol); ctx.fillStyle = o.color || C.agua; ctx.fill(); }
    ctx.restore(); };
  W2.sombraContacto = W2.sombra;

  // ------------------------------------------------------------------ PERSONAJE: el patito piloto
  const patitos = new Map();
  const POSE = { normal: 'flotar', mira: 'flotar', usa: 'inclinarse', susto: 'susto', celebra: 'celebrar' };
  W2.patito = (ctx, T, o = {}) => { const e = ent(o); if (!e) return; const casco = o.casco === undefined ? 'aviador' : o.casco, kk = 'p|' + casco; let p = patitos.get(kk); if (!p) { p = R.patito({ altura: 300, casco }); patitos.set(kk, p); }
    const sc = (o.s == null ? 1 : o.s) * e.s, v = o.vib ? W2.vibra(T, o.vib) : [0, 0, 0]; ctx.save(); ctx.translate((o.x || 0) + e.dx + v[0], (o.y || 0) + e.dy + v[1]); ctx.rotate((o.rot || 0) + e.rot + v[2]); ctx.scale(sc, sc); ctx.globalAlpha *= e.a;
    const st = o.estado || 'normal', est = { x: 0, y: 0, dir: o.dir || 1, pose: POSE[st] || 'flotar', sombraSuelo: !!o.sombraSuelo, agua: !!o.agua, luz: luzLocal(ctx), alto: o.alto || 0, casco };
    if (o.estado2) { est.pose2 = POSE[o.estado2]; est.k = o.k2 == null ? 0 : o.k2; } if (o.inclinacion != null) est.inclinacion = o.inclinacion; if (st === 'usa') { est.ala = o.ala == null ? .7 : o.ala; est.pico = .35; }
    p.dibujar(ctx, T, est); ctx.restore(); };
  W2.version = '1.0';
})();
