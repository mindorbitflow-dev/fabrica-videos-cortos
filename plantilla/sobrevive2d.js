// V — "¿Sobrevivirías?" en 2D ilustrado (kit Ilustra: Pincel con volumen + luz cálida de borde + grano). Global `V`. Todo determinista en T (sin Math.random/Date/estado).
// Requiere kit.js, ilustra.js y fauna2d.js (antes). Mundo = cuadro 1080x1920 (px). Tú = 1.7 m. Los pies/base de todo están en (x, y).
//   CUADRO     V.cuadro(ctx, T, {x=540,y=960,z=1,rot=0,tiembla=0,rojo=0,flash=0,oscuro=0,luz:'fria'|'calida'}, () => {...mundo...})
//              cámara sobre el punto (x,y) del mundo con zoom z; tiembla = px de temblor; rojo/flash/oscuro 0-1 = tinte de peligro, destello, fundido a negro
//   TÚ         V.tu(ctx, x, y, h, {pose, pose2, k, susto, dir, T, dist, mira, cara})  h = alto en px (550-800: grande). poses: dePie camina corre saltar caer
//              caerAtras agacharse protegerse sentarse tendido susto senalar (alias: parado salta cae agachado protege sentado acostado). pose2+k (0-1) mezcla
//              dos poses; susto 0-1 = miedo (gesto y cara); dist = px recorridos (pasos sin deslizar); dir 1|-1; cara 'susto'|'grito'|'asombro'|'duda'|'neutra'|'alegre'
//   ANIMALES   V.animal(ctx, tipo, x, y, esc, {accion, dir, T, dist, boca, alto, ajuste})  tipo oso perro lobo tigre puma toro cocodrilo tiburon serpiente;
//              esc = px por metro (tú: h/1.7); accion quieto|camina|corre|ataca|erguido (el contacto NUNCA se dibuja: corta antes); alto = px en el aire
//              V.enjambre(ctx, T, {x,y,r,n,esc})  abejas
//   FONDOS     V.fondo(tipo, ctx, T, opciones)  se dibujan en el mundo, el suelo queda cerca de y=1250 (salvo pozo):
//              pozo {alt: m de altura de la cabina, m: px por metro, yRef: y del piso de la cabina, vel: 0-1 rayas de caída, luz 0-1}  hueco del ascensor que se desplaza
//              campo {tormenta 0-1, hora}  lago {}  rio {nivel y del agua}  bosque {niebla, hora}  montana {}  interior {sismo 0-1 (grietas), noche}
//              carretera {v: px/s, hora}  mar {nivel, hora, oleaje}  desierto {}  incendio {humo 0-1}  plano {tema:'azul'|'noche'|'tierra', x, y} (diagramas/flechas)
//   PROPS      V.ascensor(ctx,x,y,s,{puertas 0-1, luz 0-1, cable:'entero'|'roto'|false, mordazas 0-1, picado 0-1, techo}, g => {...dentro...})  g={x,y,h}: pies y alto de tú dentro
//              V.resorte(ctx,x,y,w,h,{k 0-1 aplastado}) amortiguador  V.cable(ctx,x,y,s,{n}) cable amontonado  V.rascacielos(ctx,x,y,s,{T,cabina 0-1})  V.edificio(ctx,x,y,s,{ancho,alto,pisos,noche})
//              V.auto(ctx,x,y,s,{dir,giro,luces,rueda,color,T}) s=px/m   V.arbol(ctx,x,y,h,{tipo:'pino'|'hoja'|'seco',semilla})   V.roca(ctx,x,y,s,{semilla})
//              V.bote(ctx,x,y,s,{giro})   V.escalera(ctx,x,y,s,{tipo:'escalones'|'mano',alto})   V.flecha(ctx,x0,y0,x1,y1,{color,ancho,k,T}) rojo = daño, verde = lo que salva
//              V.aro(ctx,x,y,r,T,{color,k}) resalta un punto del cuerpo   V.COL = paleta
//   EFECTOS    V.lluvia(ctx,T,{densidad,viento})  V.nieve(ctx,T,{n,viento})  (en pantalla)   V.rayo(ctx,T,{x,y0,y1,k,semilla})  V.flash(ctx,k)  V.humo(ctx,x,y,T,{n,r,alto,color,alfa})
//              V.fuego(ctx,x,y,s,T,{k})  V.chispas(ctx,x,y,T,{k 0-1,n,r})  V.polvo(ctx,x,y,T,{k 0-1,r,n})  V.grietas(ctx,x,y,r,k,{semilla,color})  V.burbujas(ctx,x,y,T,{n,r,alto})
//              V.agua(ctx,T,{y,x0,x1,y1,alfa,olas,corriente,color})  superficie con transparencia y olas: dibújala DESPUÉS de lo que va sumergido.
(() => {
  const I = window.Ilustra, P = I && I.Pincel, R = I && I.REPARTO, K = window.K;
  if (!P || !R || !R.persona || !K) { (window.__errores = window.__errores || []).push('sobrevive2d.js: faltan kit.js / ilustra.js'); return; }
  const { W, H, TAU, clamp, lerp, prog, sale, hash } = K, css = I.css, os = I.oscurece, ac = I.aclara, mz = I.mezcla, nz = I.ruido1;
  const V = window.V = {};
  const COL = V.COL = { tu: '#f4c430', pantalon: '#2a3a55', ambar: '#E0B060', peligro: '#C9584C', ok: '#6FA66E', blanco: '#EFE6D2', hielo: '#a9bfcc', nieve: '#d8dfe4', madera: '#8a6244', metal: '#7b8494', acero: '#4f6d8f', tierra: '#6b5a48', agua: '#31596b' };
  const LUZ = { calida: new I.Luz({ dir: [-.5, -.8], dirBorde: [.9, -.2], clave: '#f2d9a0', ambiente: '#4a4036', borde: '#d4b47a', niebla: '#3a342c' }),
    fria: new I.Luz({ dir: [-.4, -.85], dirBorde: [.9, -.25], clave: '#cfd9e8', ambiente: '#3d4858', borde: '#e0b878', niebla: '#2e3846' }) };
  let luzAct = LUZ.calida;
  // ---------- ayudas de dibujo ----------
  const F = (cx, pts, col, o) => P.forma(cx, pts, Object.assign({ color: col, semilla: 1, volumen: .55, borde: .5, textura: .35, irregular: .5, sombraInterna: .3 }, o));
  const rect = (x, y, w, h, r) => P.rect(x, y, w, h, r || 0), ell = (x, y, rx, ry, rot, n) => P.elipse(x, y, rx, ry, rot || 0, n || 28);
  const lin = (cx, x0, y0, x1, y1, st) => { const g = cx.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c, a]) => g.addColorStop(o, css(c, a == null ? 1 : a))); return g; };
  const rad = (cx, x, y, r, c, a) => { const g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, css(c, a)); g.addColorStop(1, css(c, 0)); cx.fillStyle = g; cx.fillRect(x - r, y - r, 2 * r, 2 * r); };
  const rng = I.rng, M = 300, QS = .65;
  const memo = new Map();
  const bmp = (key, w, h, ax, ay, dib, esc) => {        // lienzo fuera de pantalla con caché; dib(cx) dibuja con (0,0) = (ax,ay)
    let c = memo.get(key); if (c) return c; esc = esc || 1;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * esc); cv.height = Math.ceil(h * esc);
    const cx = cv.getContext('2d'); cx.scale(esc, esc); cx.translate(ax, ay);
    const prev = I.luzActual; I.luzActual = luzAct; try { dib(cx); } finally { I.luzActual = prev; }
    c = { cv, ax, ay, esc }; memo.set(key, c); return c;
  };
  const pega = (ctx, c, x, y, s) => { s = s || 1; ctx.drawImage(c.cv, x - c.ax * s, y - c.ay * s, c.cv.width / c.esc * s, c.cv.height / c.esc * s); };
  const mundo = (key, dib) => bmp(key + luzAct.clave, W + 2 * M, H + 2 * M, M, M, dib, QS);   // fondo del mundo: cubre -M..W+M
  const ponMundo = (ctx, c) => pega(ctx, c, 0, 0);
  const prop = (key, w, h, ax, ay, dib, ctx, x, y, s, esc) => pega(ctx, bmp(key, w, h, ax, ay, dib, esc || 1), x, y, s || 1);
  const cresta = (x0, x1, base, amp, sm, paso, f) => { const p = [[x0, base + 2400]]; paso = paso || 60; f = f || .004; for (let x = x0; x <= x1; x += paso) p.push([x, base - amp * (.5 + .5 * nz(x * f + sm * 3, sm)) - amp * .35 * nz(x * f * 3.1, sm + 5)]); p.push([x1, base + 2400]); return p; };
  const nubes = (cx, y0, y1, col, n, sm, a) => { const r = rng(sm); for (let i = 0; i < n; i++) { const x = -M + r() * (W + 2 * M), y = y0 + r() * (y1 - y0), rr = 160 + r() * 260; cx.save(); cx.translate(x, y); cx.scale(1.9, .55); rad(cx, 0, 0, rr, col, a); cx.restore(); } };
  const suelo = (cx, y, c1, c2, sm, tex) => { cx.fillStyle = lin(cx, 0, y, 0, H + M, [[0, c1], [1, c2]]); cx.fillRect(-M, y, W + 2 * M, H + 2 * M - y); F(cx, rect(-M, y - 2, W + 2 * M, H + 2 * M - y), c1, { semilla: sm, volumen: 0, borde: 0, sombraInterna: 0, textura: tex == null ? .7 : tex, irregular: 0, alfa: .35 }); F(cx, rect(-M, y - 3, W + 2 * M, 18), ac(c1, .08), { semilla: sm + 1, volumen: .6, borde: .8, irregular: 0 }); };

  // ---------- cámara y acabado ----------
  V.cuadro = (ctx, T, o, fn) => {
    if (typeof o === 'function') { fn = o; o = {}; }
    const prevL = luzAct; luzAct = LUZ[o.luz] || LUZ.fria; const prev = I.luzActual; I.luzActual = luzAct;
    ctx.save();
    const tm = o.tiembla || 0, sx = tm ? nz(T * 31, 3) * tm : 0, sy = tm ? nz(T * 29, 8) * tm : 0;
    ctx.translate(W / 2 + sx, H / 2 + sy); if (o.rot) ctx.rotate(o.rot); const z = o.z || 1; ctx.scale(z, z); ctx.translate(-(o.x == null ? W / 2 : o.x), -(o.y == null ? H / 2 : o.y));
    try { fn(); } finally { ctx.restore(); I.luzActual = prev; luzAct = prevL; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,190,120,.10)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .5, H * .78); g.addColorStop(0, 'rgba(14,12,20,0)'); g.addColorStop(1, 'rgba(14,12,20,.38)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (o.rojo) { const g2 = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75); g2.addColorStop(0, 'rgba(201,88,76,0)'); g2.addColorStop(1, 'rgba(201,88,76,' + (.5 * o.rojo) + ')'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); }
    if (o.sub !== false) { const gs = ctx.createLinearGradient(0, 0, 0, 470); gs.addColorStop(0, 'rgba(10,12,18,.6)'); gs.addColorStop(1, 'rgba(10,12,18,0)'); ctx.fillStyle = gs; ctx.fillRect(0, 0, W, 470); }   // fondo oscuro suave bajo los subtítulos
    K.acabado(ctx, T, { grano: .07, vineta: 0 });
    if (o.flash) { ctx.fillStyle = 'rgba(235,240,255,' + clamp(o.flash) * .85 + ')'; ctx.fillRect(0, 0, W, H); }
    if (o.oscuro) { ctx.fillStyle = 'rgba(8,10,16,' + clamp(o.oscuro) + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  };
  V.flash = (ctx, k) => { if (k <= 0) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(235,240,255,' + clamp(k) * .8 + ')'; ctx.fillRect(0, 0, W, H); ctx.restore(); };

  // ---------- tú ----------
  const POSES = { parado: 'dePie', salta: 'saltar', cae: 'caer', agachado: 'agacharse', protege: 'protegerse', sentado: 'sentarse', acostado: 'tendido', camina: 'camina', corre: 'corre' };
  let persona = null;
  V.tu = (ctx, x, y, h, o) => {
    o = o || {}; const s = h / 600, T = o.T || 0, su = clamp(o.susto || 0);
    persona = persona || R.persona({ altura: 600, piel: '#e0a97f', pelo: '#2e211b', peinado: 'corto', ropa: COL.tu, pantalon: COL.pantalon, zapatos: '#241f1c', largoRopa: .14 });
    const nm = n => POSES[n] || n || 'dePie';
    let pose = nm(o.pose), pose2 = o.pose2 ? nm(o.pose2) : null, k = o.k || 0;
    if (!pose2 && su > .05 && /^(dePie|agacharse|camina)$/.test(pose)) { pose2 = 'susto'; k = su * .7; }
    const cara = o.cara || (su > .8 ? 'grito' : su > .35 ? 'susto' : 'neutra');
    ctx.save(); ctx.translate(x + (su ? nz(T * 40, 5) * su * 2.2 : 0), y); ctx.scale(s, s);
    persona.dibujar(ctx, T, { x: 0, y: 0, dir: o.dir || 1, pose, pose2, k, expresion: cara, mirada: [o.mira == null ? .3 : o.mira, 0], dist: o.dist != null ? o.dist / s : null, alto: (o.alto || 0) / s, luz: luzAct, sombraSuelo: o.sombra !== false });
    ctx.restore();
  };

  // ---------- animales ----------
  const fauna = {}, ACC = { quieto: 'quieto', camina: 'camina', corre: 'corre', ataca: 'ataca', erguido: 'erguido' };
  V.animal = (ctx, tipo, x, y, esc, o) => {
    o = o || {}; const key = tipo + JSON.stringify(o.ajuste || 0);
    let a = fauna[key];
    if (!a) { const base = Object.assign({ esc: 300 }, o.ajuste || {}); a = fauna[key] = tipo === 'tiburon' ? R.tiburon({ largo: 900 }) : tipo === 'serpiente' ? R.serpiente({ largo: 520 }) : R[tipo](base); }
    const ac2 = o.accion || 'quieto', ya = tipo === 'tiburon' ? { quieto: 'acecha', camina: 'nada', corre: 'nada', ataca: 'ataca', erguido: 'acecha' }[ac2] : tipo === 'serpiente' ? { quieto: 'repta', camina: 'repta', corre: 'repta', ataca: 'ataca', erguido: 'alerta' }[ac2] : ACC[ac2];
    const s = esc / 300, T = o.T || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    a.dibujar(ctx, T, { x: 0, y: 0, dir: o.dir || 1, pose: ya, boca: o.boca, dist: o.dist != null ? o.dist / s : undefined, alto: (o.alto || 0) / s, erg: o.erg, luz: luzAct, sombraSuelo: o.sombra !== false, agua: false });
    ctx.restore();
  };
  V.enjambre = (ctx, T, o) => R.enjambre(ctx, T, Object.assign({ esc: 1 }, o));

  // ---------- efectos ----------
  const pant = (ctx, fn) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); fn(); ctx.restore(); };
  V.lluvia = (ctx, T, o) => { o = o || {}; pant(ctx, () => I.lluvia(ctx, T, { densidad: o.densidad || 240, angulo: o.viento == null ? .22 : o.viento, alfa: o.alfa || .32, color: '#c8d2e0', semilla: o.semilla || 7, capas: 3 })); };
  V.nieve = (ctx, T, o) => {
    o = o || {}; const n = o.n || 110, vx = o.viento == null ? 40 : o.viento;
    pant(ctx, () => { ctx.fillStyle = 'rgba(240,246,250,.85)'; for (let i = 0; i < n; i++) { const k = .4 + hash(i * 3 + 1) * .9, x = ((hash(i) * W * 1.2 + T * vx * k + Math.sin(T * .9 + i) * 20) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * .1, y = ((hash(i + 77) * H + T * 120 * k) % H + H) % H; ctx.globalAlpha = .45 + .45 * k / 1.3; ctx.beginPath(); ctx.arc(x, y, 1.6 + 3.2 * k, 0, TAU); ctx.fill(); } });
  };
  V.rayo = (ctx, T, o) => {
    o = o || {}; const k = o.k == null ? 1 : o.k; if (k <= 0) return;
    const sm = o.semilla || 3, x0 = o.x == null ? 540 : o.x, y0 = o.y0 == null ? -50 : o.y0, y1 = o.y1 == null ? 1250 : o.y1, r = rng(sm * 17 + 1);
    const rama = (x, y, ang, len, w, d) => { const pts = [[x, y]], n = Math.max(3, Math.round(len / 55)); for (let i = 1; i <= n; i++) { ang += (r() - .5) * .9; x += Math.cos(ang) * len / n; y += Math.sin(ang) * len / n; pts.push([x, y]); } return pts; };
    const tronco = []; let x = x0, y = y0; const n = Math.round((y1 - y0) / 60); tronco.push([x, y]);
    for (let i = 1; i <= n; i++) { x += (r() - .5) * 90 + (x0 - x) * .06; y += (y1 - y0) / n; tronco.push([x, y]); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = ctx.lineJoin = 'round';
    const trazo = (pts, w, c, a) => { ctx.strokeStyle = css(c, a * k); ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
    const ramas = []; for (let i = 3; i < n - 2; i += 2 + Math.floor(r() * 2)) ramas.push(rama(tronco[i][0], tronco[i][1], Math.PI / 2 + (r() < .5 ? -1 : 1) * (.5 + r() * .6), 140 + r() * 160));
    rad(ctx, x0, (y0 + y1) / 2, 520, '#9fb4e8', .22 * k);
    for (const [w, c, a] of [[34, '#7e9ae0', .22], [14, '#b8c8ff', .5]]) { trazo(tronco, w, c, a); ramas.forEach(b => trazo(b, w * .45, c, a)); }
    trazo(tronco, 5, '#ffffff', 1); ramas.forEach(b => trazo(b, 2.4, '#ffffff', .9));
    rad(ctx, x, y1, 160, '#eaf0ff', .7 * k);
    ctx.restore();
  };
  V.chispas = (ctx, x, y, T, o) => {
    o = o || {}; const k = o.k == null ? (T * 2.5) % 1 : o.k; if (!(k > 0 && k < 1)) return; const n = o.n || 14, r = o.r || 90, g0 = r * .9;
    ctx.save(); ctx.lineCap = 'round';
    for (let c = 0; c < 2; c++) { ctx.strokeStyle = css(c ? '#fff1c8' : '#ffc060', 1 - k); ctx.lineWidth = (c ? 2 : 3.6) * (1 - k) + 1; ctx.beginPath();
      for (let i = c; i < n; i += 2) { const a = (hash(i + 3) - .5) * 3.4 + (o.arriba ? -Math.PI / 2 : Math.PI / 2), v = r * (.5 + hash(i + 9)); ctx.moveTo(x + Math.cos(a) * v * (k - .06), y + Math.sin(a) * v * (k - .06) + (k - .06) * Math.abs(k - .06) * g0); ctx.lineTo(x + Math.cos(a) * v * k, y + Math.sin(a) * v * k + k * k * g0); }
      ctx.stroke(); }
    ctx.restore();
  };
  V.polvo = (ctx, x, y, T, o) => {
    o = o || {}; const k = o.k == null ? 1 : o.k; if (k <= 0) return; const n = o.n || 14, r = o.r || 220, c = o.color || '#b4a995', a = (o.alfa == null ? .5 : o.alfa);
    ctx.save();
    for (let i = 0; i < n; i++) { const an = (i / n) * TAU + hash(i) * .6, d = r * sale(k) * (.4 + hash(i + 5) * .8), rr = r * (.22 + .3 * hash(i + 11)) * (.5 + k), px = x + Math.cos(an) * d * 1.15, py = y + Math.sin(an) * d * .5 - k * r * .35 - (o.alto || 0) * k;
      rad(ctx, px, py, rr, mz(c, '#6b6760', hash(i + 2) * .5), a * (1 - k * k) * clamp(k * 6)); }
    ctx.restore();
  };
  V.humo = (ctx, x, y, T, o) => {
    o = o || {}; const n = o.n || 8, r = o.r || 90, alto = o.alto || 520, c = o.color || '#3b3a40', a = o.alfa == null ? .4 : o.alfa;
    for (let i = 0; i < n; i++) { const u = ((T * .22 + i / n + hash(i) * .1) % 1), px = x + Math.sin(T * .8 + i * 2) * 40 * u + (hash(i + 4) - .5) * r * .8, py = y - u * alto, rr = r * (.55 + u * 1.3); rad(ctx, px, py, rr, mz(c, '#8a8f98', u * .5), a * Math.sin(Math.PI * Math.min(1, u * 1.05)) ); }
  };
  V.fuego = (ctx, x, y, s, T, o) => {
    o = o || {}; const k = o.k == null ? 1 : o.k; if (k <= 0) return; s = s * k;
    ctx.save(); rad(ctx, x, y - s * .5, s * 1.6, '#ff8a3a', .35 * k);
    ctx.globalCompositeOperation = 'lighter';
    for (let l = 0; l < 4; l++) {
      const c = ['#b8402c', '#e0702c', '#f0a640', '#ffe49a'][l], w = s * (.42 - l * .08), hh = s * (1 - l * .17); ctx.fillStyle = css(c, .85);
      for (let j = 0; j < 3; j++) { const bx = x + (j - 1) * w * .8 + nz(T * 5 + j * 4, 2) * w * .15, ht = hh * (.7 + .3 * nz(T * 7 + j * 5 + l, 9) * .5 + .15 * j % 2 + .2);
        ctx.beginPath(); ctx.moveTo(bx - w * .55, y); ctx.bezierCurveTo(bx - w * .7, y - ht * .5, bx - w * .1 + nz(T * 9 + j, 1) * w * .2, y - ht * .7, bx + nz(T * 6 + j, 3) * w * .3, y - ht); ctx.bezierCurveTo(bx + w * .15, y - ht * .65, bx + w * .7, y - ht * .45, bx + w * .55, y); ctx.closePath(); ctx.fill(); }
    }
    ctx.restore();
  };
  V.grietas = (ctx, x, y, r, k, o) => {
    o = o || {}; if (k <= 0) return; const sm = o.semilla || 4, rr = rng(sm * 11 + 3), n = 9, col = o.color || '#27394a';
    ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
    const trazo = (pts, w, c, a) => { ctx.strokeStyle = css(c, a); ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
    const ramas = [];
    for (let i = 0; i < n; i++) {
      let a = (i / n) * TAU + (rr() - .5) * .5, px = x, py = y; const L = r * k * (.55 + .45 * rr()), pts = [[px, py]], m = Math.max(2, Math.round(L / 40));
      for (let j = 1; j <= m; j++) { a += (rr() - .5) * .9; px += Math.cos(a) * L / m; py += Math.sin(a) * L / m * .62; pts.push([px, py]); if (j > 1 && rr() < .35) { const b = []; let aa = a + (rr() < .5 ? -1 : 1) * (.6 + rr() * .5), qx = px, qy = py; b.push([qx, qy]); for (let q = 0; q < 3; q++) { aa += (rr() - .5) * .8; qx += Math.cos(aa) * L / m * .6; qy += Math.sin(aa) * L / m * .6 * .62; b.push([qx, qy]); } ramas.push(b); } }
      ramas.push(pts);
    }
    for (const b of ramas) { trazo(b, 9, col, .16); trazo(b, 4.5, col, .9); trazo(b, 1.6, '#e6f0f6', .55); }
    ctx.restore();
  };
  V.burbujas = (ctx, x, y, T, o) => {
    o = o || {}; const n = o.n || 14, r = o.r || 90, alto = o.alto || 500;
    ctx.save(); ctx.lineWidth = 2.2;
    for (let i = 0; i < n; i++) { const u = ((T * .35 + hash(i) + i / n) % 1), bx = x + (hash(i + 5) - .5) * r * 2 + Math.sin(T * 3 + i * 2) * 8, by = y - u * alto, br = 4 + hash(i + 9) * 11; ctx.strokeStyle = css('#dcefff', .75 * (1 - u * .6)); ctx.fillStyle = css('#bfe0f2', .12); ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = css('#fff', .6 * (1 - u * .5)); ctx.beginPath(); ctx.arc(bx - br * .3, by - br * .3, br * .22, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  V.agua = (ctx, T, o) => {
    o = o || {}; const y = o.y == null ? 1100 : o.y, x0 = o.x0 == null ? -M : o.x0, x1 = o.x1 == null ? W + M : o.x1, y1 = o.y1 == null ? H + M : o.y1, a = o.alfa == null ? .62 : o.alfa, ol = o.olas == null ? 1 : o.olas, c = o.color || COL.agua, cor = o.corriente || 0;
    const ond = x => y + Math.sin(x * .011 + T * 1.7 - cor * T * .8) * 9 * ol + Math.sin(x * .027 + T * 2.6 + 1.3) * 4 * ol + Math.sin(x * .004 + T * .8) * 14 * ol;
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0, y1);
    for (let x = x0; x <= x1; x += 24) ctx.lineTo(x, ond(x)); ctx.lineTo(x1, y1); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, y - 30, 0, y + 900, [[0, ac(c, .18), a * .85], [.25, c, a], [1, os(c, .7), Math.min(1, a + .25)]]); ctx.fill();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';                       // destellos de luz bajo la superficie
    for (let i = 0; i < 26; i++) { const px = x0 + ((hash(i) * (x1 - x0) + T * (20 + 80 * cor) * (.5 + hash(i + 3))) % (x1 - x0)), py = y + 18 + hash(i + 8) * 460 * (1 + 0 * i), w = 40 + hash(i + 2) * 110; ctx.strokeStyle = css('#bcdcea', (.1 + .12 * hash(i + 6)) * (1 - (py - y) / 700) * a); ctx.lineWidth = 2 + hash(i) * 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + w / 2, py - 5, px + w, py + 2); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = css('#e4f1f6', .8); ctx.lineWidth = 3.5; ctx.beginPath();            // cresta clara
    for (let x = x0; x <= x1; x += 24) x === x0 ? ctx.moveTo(x, ond(x)) : ctx.lineTo(x, ond(x)); ctx.stroke();
    ctx.strokeStyle = css('#f4fbff', .5); ctx.lineWidth = 6; ctx.setLineDash([30, 60]); ctx.lineDashOffset = -T * 40 * (1 + cor); ctx.beginPath(); for (let x = x0; x <= x1; x += 24) x === x0 ? ctx.moveTo(x, ond(x) + 3) : ctx.lineTo(x, ond(x) + 3); ctx.stroke();
    ctx.restore();
  };
  V.flecha = (ctx, x0, y0, x1, y1, o) => {
    o = o || {}; const k = o.k == null ? 1 : o.k; if (k <= .01) return; const c = o.color || COL.peligro, w = o.ancho || 30, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) * k, a = Math.atan2(dy, dx), pun = Math.min(w * 2.4, L * .6);
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(a);
    ctx.globalCompositeOperation = 'lighter'; rad(ctx, L / 2, 0, Math.max(L, 120) * .6, c, .16 + .06 * Math.sin((o.T || 0) * 6)); ctx.globalCompositeOperation = 'source-over';
    F(ctx, [[0, -w / 2], [L - pun, -w / 2], [L - pun, -w * 1.15], [L, 0], [L - pun, w * 1.15], [L - pun, w / 2], [0, w / 2]], c, { semilla: 7, volumen: .8, borde: .9, irregular: .3, textura: .3, sombraInterna: .35 });
    ctx.restore();
  };
  V.aro = (ctx, x, y, r, T, o) => {
    o = o || {}; const k = o.k == null ? 1 : o.k; if (k <= 0) return; const c = o.color || COL.peligro, p = .5 + .5 * Math.sin(T * 8);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; rad(ctx, x, y, r * (1.7 + .25 * p), c, .45 * k); ctx.restore();
    ctx.save(); ctx.strokeStyle = css(c, .85 * k); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r * (1 + .08 * p), 0, TAU); ctx.stroke(); ctx.restore();
  };

  // ---------- props ----------
  V.roca = (ctx, x, y, s, o) => {
    o = o || {}; const sm = o.semilla || 3, r = rng(sm), kk = 'roca' + sm + '|' + Math.round(s / 8);
    pega(ctx, bmp(kk, 4 * s, 3 * s, 2 * s, 2.4 * s, cx => { const n = 9, pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU, q = .75 + r() * .35; pts.push([Math.cos(a) * s * 1.2 * q, Math.sin(a) * s * .8 * q - s * .7 * (Math.sin(a) < 0 ? 0 : 0) ]); }
      F(cx, pts.map(p => [p[0], p[1] * .9 - s * .45]), o.color || '#7d7f86', { semilla: sm, volumen: .9, borde: .8, textura: .7, irregular: 3, sombraInterna: .5, anchoBorde: 5 });
      F(cx, [[-s * .4, -s * 1.1], [s * .1, -s * 1.2], [s * .5, -s * .9], [-s * .1, -s * .7]], ac(o.color || '#7d7f86', .15), { semilla: sm + 1, volumen: .5, borde: .5, textura: .5, irregular: 2 }); }), x, y, 1);
  };
  V.arbol = (ctx, x, y, h, o) => {
    o = o || {}; const tipo = o.tipo || 'pino', sm = o.semilla || 2, kk = 'arb' + tipo + sm + '|' + Math.round(h / 20) + (o.nieve ? 'n' : '');
    pega(ctx, bmp(kk, h * .9, h * 1.1, h * .45, h * 1.02, cx => {
      const r = rng(sm * 5 + 1), tr = tipo === 'seco' ? '#4d4038' : '#5a4332';
      F(cx, [[-h * .03, 0], [-h * .018, -h * .55], [h * .018, -h * .55], [h * .03, 0]], tr, { semilla: sm, volumen: .8, borde: .7, textura: .6, irregular: 1.5 });
      if (tipo === 'pino') for (let i = 0; i < 6; i++) { const yy = -h * (.2 + i * .13), w = h * (.3 - i * .042); F(cx, [[-w, yy], [0, yy - h * .24], [w, yy]], mz('#3f5a4a', '#5c7a5c', i / 8 + r() * .1), { semilla: sm + i, volumen: .8, borde: .7, textura: .5, irregular: 2.5, sombraInterna: .4 }); if (o.nieve) F(cx, [[-w * .7, yy - h * .08], [0, yy - h * .24], [w * .7, yy - h * .08], [0, yy - h * .12]], '#dfe6ea', { semilla: sm + 40 + i, volumen: .5, borde: .6, irregular: 2 }); }
      else if (tipo === 'hoja') for (let i = 0; i < 6; i++) F(cx, ell((r() - .5) * h * .42, -h * (.62 + r() * .28), h * (.16 + r() * .08), h * (.12 + r() * .05), 0, 16), mz('#52694a', '#7d8a55', r() * .6), { semilla: sm + i, volumen: .85, borde: .7, textura: .5, irregular: 2, sombraInterna: .4 });
      else { cx.strokeStyle = css(tr); cx.lineCap = 'round'; for (let i = 0; i < 6; i++) { const yy = -h * (.4 + i * .1), d = i % 2 ? 1 : -1; cx.lineWidth = h * .014; cx.beginPath(); cx.moveTo(0, yy); cx.lineTo(d * h * (.16 + r() * .1), yy - h * (.1 + r() * .06)); cx.stroke(); } }
    }), x, y, 1);
  };
  V.edificio = (ctx, x, y, s, o) => {
    o = o || {}; const w = o.ancho || 300, hh = o.alto || 700, pisos = o.pisos || 8, col = o.color || '#6d7a8c', no = o.noche ? 1 : 0, sm = o.semilla || 4;
    pega(ctx, bmp('edi' + w + hh + pisos + col + no + sm, w + 40, hh + 40, w / 2 + 20, hh + 20, cx => {
      const r = rng(sm); F(cx, rect(-w / 2, -hh, w, hh), col, { semilla: sm, volumen: .7, borde: .7, textura: .5, irregular: 1.2 });
      F(cx, rect(-w / 2 - 6, -hh - 14, w + 12, 16), ac(col, .1), { semilla: sm + 1, volumen: .6, borde: .7, irregular: 0 });
      const ph = (hh - 90) / pisos, cols = Math.max(2, Math.round(w / 70));
      for (let p = 0; p < pisos; p++) for (let c = 0; c < cols; c++) { const wx = -w / 2 + (c + .5) * w / cols - 16, wy = -hh + 40 + p * ph, lit = r() < (no ? .55 : .12); cx.fillStyle = lit ? css('#f0c27e', .92) : lin(cx, wx, wy, wx + 32, wy + ph * .6, [[0, '#8fa0b3'], [1, '#2c3544']]); cx.fillRect(wx, wy, 32, ph * .58); cx.strokeStyle = css(os(col, .4), .8); cx.lineWidth = 3; cx.strokeRect(wx, wy, 32, ph * .58); }
    }), x, y, s || 1);
  };
  V.rascacielos = (ctx, x, y, s, o) => {
    o = o || {}; s = s || 1; const T = o.T || 0;
    pega(ctx, bmp('rasca', 900, 3000, 450, 2950, cx => {
      const r = rng(5), col = '#3a4a62', cuerpos = [[300, 0, 1000], [230, 1000, 700], [150, 1700, 520], [80, 2220, 300]];
      for (const [w, y0, h] of cuerpos) { F(cx, rect(-w, -y0 - h, w * 2, h), col, { semilla: y0 + 1, volumen: .8, borde: .8, textura: .5, irregular: 1.5 });
        F(cx, rect(w * .45, -y0 - h, w * .55, h), os(col, .3), { semilla: y0 + 2, volumen: .3, borde: 0, irregular: 0, alfa: .55 });
        for (let fy = y0 + 30; fy < y0 + h - 30; fy += 42) for (let fx = -w + 24; fx < w - 20; fx += 36) { const lit = r() < .5; cx.fillStyle = css(lit ? '#f0c27e' : '#1c2433', lit ? .9 : .8); cx.fillRect(fx, -fy - 22, 16, 22); } }
      F(cx, [[-14, -2520], [0, -2900], [14, -2520]], '#8b93a0', { semilla: 9, volumen: .8, borde: .8, irregular: .5 });
    }, 1), x, y, s);
    if (o.cabina != null) {   // la cabina cae por un hueco del edificio: o.cabina = altura 0-1
      const cy = y - lerp(60, 2300, clamp(o.cabina)) * s; ctx.save(); ctx.fillStyle = css('#0e1420', .75); ctx.fillRect(x - 26 * s, y - 2360 * s, 52 * s, 2300 * s);
      ctx.globalCompositeOperation = 'lighter'; rad(ctx, x, cy - 40 * s, 190 * s, '#ffcf86', .5); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = css('#E0B060'); ctx.fillRect(x - 20 * s, cy - 74 * s, 40 * s, 74 * s); ctx.fillStyle = css('#fff2cc'); ctx.fillRect(x - 15 * s, cy - 64 * s, 30 * s, 40 * s); ctx.restore();
    }
  };
  V.auto = (ctx, x, y, s, o) => {
    o = o || {}; s = s || 100; const col = o.color || '#8f4a3c', T = o.T || 0, dir = o.dir || 1;
    ctx.save(); ctx.translate(x, y); if (o.giro) { ctx.translate(0, -s * .8); ctx.rotate(o.giro); ctx.translate(0, s * .8); } ctx.scale(dir, 1);
    R.sombraSuelo(ctx, 0, 0, s * 2.6, .5);
    const q = k => k * s;
    F(ctx, [[q(-2.1), q(-.55)], [q(-2.15), q(-1.05)], [q(-1.7), q(-1.2)], [q(-.95), q(-1.3)], [q(-.6), q(-1.9)], [q(.6), q(-1.95)], [q(1.1), q(-1.3)], [q(1.9), q(-1.15)], [q(2.15), q(-.9)], [q(2.1), q(-.5)]], col, { semilla: 3, volumen: .9, borde: .9, textura: .4, irregular: .6, sombraInterna: .5 });
    F(ctx, [[q(-.8), q(-1.3)], [q(-.5), q(-1.8)], [q(.5), q(-1.83)], [q(.95), q(-1.3)]], '#8fa6b6', { semilla: 4, volumen: .5, borde: .6, textura: .2, irregular: .4, alfa: .85 });
    ctx.strokeStyle = css(os(col, .6), .8); ctx.lineWidth = q(.035); ctx.beginPath(); ctx.moveTo(q(.07), q(-1.3)); ctx.lineTo(q(.07), q(-.55)); ctx.stroke();
    F(ctx, rect(q(-2.18), q(-.62), q(4.36), q(.2), q(.05)), '#2a2d36', { semilla: 5, volumen: .6, borde: .6, irregular: 0 });
    for (const wx of [-1.3, 1.3]) { ctx.save(); ctx.translate(q(wx), q(-.42)); F(ctx, ell(0, 0, q(.42), q(.42), 0, 20), '#1e2127', { semilla: 6, volumen: .8, borde: .8, irregular: 0 }); ctx.rotate((o.rueda || 0) + T * (o.v || 0) / s * 0); F(ctx, ell(0, 0, q(.22), q(.22), 0, 14), '#98a0ab', { semilla: 7, volumen: .8, borde: .8, irregular: 0 });
      ctx.strokeStyle = css('#5b616b'); ctx.lineWidth = q(.03); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * TAU / 5) * q(.2), Math.sin(i * TAU / 5) * q(.2)); ctx.stroke(); } ctx.restore(); }
    if (o.luces) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; rad(ctx, q(2.1), q(-.95), q(1.2), '#ffe2a0', .7); ctx.restore(); }
    ctx.fillStyle = css('#ffe2a0'); ctx.fillRect(q(2.02), q(-1.02), q(.12), q(.14)); ctx.fillStyle = css('#b8402c'); ctx.fillRect(q(-2.16), q(-1.0), q(.08), q(.16));
    ctx.restore();
  };
  V.bote = (ctx, x, y, s, o) => {
    o = o || {}; s = s || 100; ctx.save(); ctx.translate(x, y); ctx.rotate(o.giro || 0);
    F(ctx, [[-s * 1.6, -s * .75], [-s * 1.2, -s * .1], [s * 1.2, -s * .1], [s * 1.7, -s * .8], [s * 1.2, -s * .7], [-s * 1.2, -s * .7]], o.color || '#b5654a', { semilla: 5, volumen: .9, borde: .9, textura: .5, irregular: 1, sombraInterna: .5 });
    F(ctx, rect(-s * 1.2, -s * .78, s * 2.4, s * .1), '#d9cdb2', { semilla: 6, volumen: .6, borde: .7, irregular: 0 });
    F(ctx, rect(-s * .1, -s * .7, s * .12, s * .5), '#5a4332', { semilla: 7, volumen: .7, borde: .6, irregular: 0 }); ctx.restore();
  };
  V.escalera = (ctx, x, y, s, o) => {
    o = o || {}; s = s || 120; const al = o.alto || 3;
    ctx.save(); ctx.translate(x, y);
    if (o.tipo === 'mano') { for (const dx of [-.3, .3]) F(ctx, rect(dx * s - 5, -al * s, 10, al * s), '#8a6244', { semilla: 5, volumen: .8, borde: .8, irregular: 1 }); for (let i = 1; i < al * 3; i++) F(ctx, rect(-.3 * s, -i * s / 3 - 4, .6 * s, 8), '#a07850', { semilla: 6 + i, volumen: .6, borde: .6, irregular: .5 }); }
    else { const n = Math.round(al * 3); for (let i = 0; i < n; i++) F(ctx, rect(i * s * .4, -(i + 1) * s * .3, s * .4 * (n - i), s * .3), mz('#7d8494', '#a6adb8', i / n), { semilla: 8 + i, volumen: .7, borde: .8, textura: .4, irregular: .5 });
      ctx.strokeStyle = css('#2c3442'); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, -s * .9); ctx.lineTo(n * s * .4, -(n + 3) * s * .3); ctx.stroke(); }
    ctx.restore();
  };
  V.resorte = (ctx, x, y, w, h, o) => {      // amortiguador de pozo: base, pistón y resorte; k = aplastado 0-1
    o = o || {}; const k = clamp(o.k || 0), hh = h * (1 - .5 * k);
    F(ctx, rect(x - w * .8, y - h * .12, w * 1.6, h * .12, 4), '#3c4452', { semilla: 3, volumen: .8, borde: .8, irregular: 0 });
    F(ctx, rect(x - w * .22, y - hh * .9, w * .44, hh * .8, 3), '#c58b3a', { semilla: 4, volumen: .9, borde: .8, irregular: .3 });
    ctx.save(); ctx.strokeStyle = css('#2d333d'); ctx.lineWidth = Math.max(4, w * .08); ctx.lineCap = 'round'; const n = 7;
    for (let i = 0; i < n; i++) { const yy = y - h * .12 - (i + .5) * (hh * .85) / n; ctx.beginPath(); ctx.ellipse(x, yy, w * .55, w * .1, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
    F(ctx, rect(x - w * .7, y - hh - h * .06, w * 1.4, h * .08, 4), '#4a5262', { semilla: 5, volumen: .8, borde: .8, irregular: 0 });
  };
  V.cable = (ctx, x, y, s, o) => { o = o || {}; const n = o.n || 6; for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(x + Math.sin(i * 2.1) * s * .08, y - s * .06 - i * s * .1); ctx.rotate(Math.sin(i * 1.7) * .08); P.forma(ctx, ell(0, 0, s * (.62 - i * .04), s * .12, 0, 22), { color: '#2b2b30', semilla: 11 + i, volumen: .9, borde: .8, irregular: .5, textura: .4, anchoBorde: 3 }); ctx.restore(); } };
  // ascensor: cabina vista de frente y desde dentro. (x, y) = centro del borde inferior del frente; s = escala (1 = 700 px de ancho, 860 de alto).
  // g = {x, y: pies de tú, h: alto de tú (px)}; tú queda dentro, detrás del vidrio. picado 0-1 = cámara alta (se ve más el piso).
  V.ascensor = (ctx, x, y, s, o, dentro) => {
    o = o || {}; s = s || 1; const w = 700 * s, hc = 860 * s, p = clamp(o.picado || 0), f = .66, luz = o.luz == null ? 1 : o.luz, T = o.T || 0;
    const x0 = x - w / 2, x1 = x + w / 2, yt = y - hc, vy = yt + hc * (.42 - .36 * p), bx0 = x - w / 2 * f, bx1 = x + w / 2 * f, byt = vy + (yt - vy) * f, byb = vy + (y - vy) * f;
    const dp = .42, fy = lerp(y, byb, dp), g = { x, y: fy - (o.piso || 0), h: hc * lerp(1, f, dp) * .72 * (o.altoTu || 1) }, ab = clamp(o.puertas || 0), m = clamp(o.mordazas || 0);
    ctx.save(); if (o.giro) { ctx.translate(x, y); ctx.rotate(o.giro); ctx.translate(-x, -y); }
    if (o.rieles !== false) for (const sd of [-1, 1]) { const rx = x + sd * (w / 2 + 34 * s); F(ctx, rect(rx - 9 * s, -500, 18 * s, H + 1000), '#8a94a4', { semilla: 5 + sd, volumen: .9, borde: .9, irregular: 0, textura: .4 }); }
    if (o.cable !== false) { ctx.save(); ctx.strokeStyle = css('#2b2b30'); ctx.lineWidth = 12 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, yt - 40 * s); if (o.cable === 'roto') { ctx.lineTo(x + 30 * s, yt - 160 * s); ctx.moveTo(x + 40 * s, yt - 250 * s); ctx.lineTo(x + 24 * s, -500); } else ctx.lineTo(x, -500); ctx.stroke(); ctx.restore(); if (o.cable === 'roto') V.chispas(ctx, x + 34 * s, yt - 205 * s, T, { k: o.chispa == null ? (T * 2.2) % 1 : o.chispa, n: 12, r: 100 * s }); }
    F(ctx, rect(x0 - 12 * s, yt - 46 * s, w + 24 * s, 46 * s, 6), '#5a6372', { semilla: 8, volumen: .9, borde: .9, irregular: 0 });
    const kc = 'cab' + Math.round(s * 50) + '|' + Math.round(p * 20) + luzAct.clave;
    pega(ctx, bmp(kc, w + 100 * s, hc + 120 * s, w / 2 + 50 * s, hc + 50 * s, cx => {
      const x = 0, y = 0, x0 = -w / 2, x1 = w / 2, yt = -hc, vy = yt + hc * (.42 - .36 * p), bx0 = -w / 2 * f, bx1 = w / 2 * f, byt = vy + (yt - vy) * f, byb = vy + (y - vy) * f;
    F(cx, rect(bx0, byt, bx1 - bx0, byb - byt), '#8ea3b0', { semilla: 13, volumen: .5, borde: .5, textura: .3, irregular: .3, sombraInterna: .3 });
    F(cx, [[x0, yt], [bx0, byt], [bx0, byb], [x0, y]], '#6f8794', { semilla: 11, volumen: .75, borde: .6, textura: .3, irregular: .3, sombraInterna: .4 });
    F(cx, [[x1, yt], [bx1, byt], [bx1, byb], [x1, y]], '#5f7886', { semilla: 12, volumen: .75, borde: .6, textura: .3, irregular: .3, sombraInterna: .4 });
    F(cx, [[x0, y], [x1, y], [bx1, byb], [bx0, byb]], '#5a4a3c', { semilla: 14, volumen: .6, borde: .5, textura: .4, irregular: .3 });
    if (p < .8) F(cx, [[x0, yt], [x1, yt], [bx1, byt], [bx0, byt]], '#a2b0ba', { semilla: 15, volumen: .7, borde: .6, textura: .25, irregular: .3 });
    cx.strokeStyle = css('#2e414f', .5); cx.lineWidth = 3 * s;                                  // paneles
    for (const a of [.1, .55]) cx.strokeRect(bx0 + (bx1 - bx0) * a, byt + (byb - byt) * .12, (bx1 - bx0) * .35, (byb - byt) * .72);
    const pasamanos = (u) => { cx.strokeStyle = css('#d8b46a', .95); cx.lineWidth = 11 * s; cx.lineCap = 'round'; cx.beginPath(); const yy0 = lerp(yt, y, u), yy1 = lerp(byt, byb, u); cx.moveTo(x0 + 10 * s, yy0); cx.lineTo(bx0, yy1); cx.lineTo(bx1, yy1); cx.lineTo(x1 - 10 * s, yy0); cx.stroke(); }; pasamanos(.62);
    cx.fillStyle = css('#2a1f18', .4); cx.fillRect(x - 90 * s, lerp(y, byb, .1), 180 * s, 5 * s);
    if (p < .8) { const lx = x, ly = lerp(yt, byt, .35); F(cx, [[lx - 120 * s, yt + 6 * s], [lx + 120 * s, yt + 6 * s], [lx + 90 * s, lerp(yt, byt, .55)], [lx - 90 * s, lerp(yt, byt, .55)]], '#fff3d0', { semilla: 16, emisivo: true, borde: 0, irregular: 0 }); }
    }, 1.25), x, y, 1);
    if (o.brillo !== false) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; rad(ctx, x, lerp(yt, byt, .5), 560 * s, '#ffd9a0', .4 * luz); ctx.restore(); }
    if (luz < .7) { ctx.fillStyle = 'rgba(8,12,22,' + (.82 * (1 - luz)) + ')'; ctx.fillRect(x0, yt, w, hc); }
    if (dentro) dentro(g);
    // frente: pilares, vidrio y puertas
    for (const sd of [-1, 1]) F(ctx, rect(sd < 0 ? x0 - 12 * s : x1 - 14 * s, yt - 6 * s, 26 * s, hc + 12 * s), '#aab2bc', { semilla: 17 + sd, volumen: .9, borde: .9, irregular: 0 });
    for (const sd of [-1, 1]) F(ctx, rect(sd < 0 ? x0 - 10 * s : x1 - 6 * s, y - 190 * s, 16 * s, 150 * s, 6 * s), m > 0 ? '#d58a2a' : '#4a4f58', { semilla: 9, volumen: .8, borde: .8, irregular: 0 });
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 14 * s, yt, w - 28 * s, hc); ctx.clip();
    for (const sd of [-1, 1]) { const px = x + sd * (w / 4 + ab * w * .27) - w / 4; ctx.fillStyle = css('#d8ecf6', .07); ctx.fillRect(px, yt, w / 2, hc); ctx.fillStyle = css('#ffffff', .07); ctx.beginPath(); ctx.moveTo(px + 40 * s, yt); ctx.lineTo(px + 90 * s, yt); ctx.lineTo(px - 30 * s, y); ctx.lineTo(px - 80 * s, y); ctx.fill(); ctx.strokeStyle = css('#b4bfca', .45); ctx.lineWidth = 5 * s; ctx.strokeRect(px + 3, yt + 3, w / 2 - 6, hc - 6); }
    ctx.restore(); ctx.restore(); return g;
  };

  // ---------- fondos ----------
  const FON = {};
  V.fondo = (tipo, ctx, T, o) => { const f = FON[tipo]; if (!f) throw new Error('V.fondo: tipo desconocido ' + tipo); const prev = I.luzActual; I.luzActual = luzAct; try { f(ctx, T, o || {}); } finally { I.luzActual = prev; } };
  const luzAmb = (ctx, fuentes, osc) => { const m = ctx.getTransform(), pt = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f], z = m.a; I.mapaLuz(ctx, fuentes.map(f => { const p = pt(f.x, f.y); return { x: p[0], y: p[1], r: f.r * z, fuerza: f.fuerza, color: f.color }; }), { oscuridad: osc || '#8a8088' }); };
  const cielo = (cx, c1, c2, h) => { cx.fillStyle = lin(cx, 0, -M, 0, h || 1250, [[0, c1], [1, c2]]); cx.fillRect(-M, -M, W + 2 * M, (h || 1250) + M + 40); };
  const deriva = (ctx, T, c, vel, y) => { const w = c.cv.width / c.esc; const dx = (T * vel) % w; ctx.drawImage(c.cv, -M - dx, y, w, c.cv.height / c.esc); ctx.drawImage(c.cv, -M - dx + w, y, w, c.cv.height / c.esc); };

  // POZO: el hueco del ascensor se desplaza con la altura (alt, en m); lo importante (la cabina) va fijo en pantalla
  FON.pozo = (ctx, T, o) => {
    const m = o.m || 150, alt = o.alt || 0, yR = o.yRef == null ? 1250 : o.yRef, luz = o.luz == null ? 1 : o.luz, vel = clamp(o.vel || 0);
    ponMundo(ctx, mundo('pozo', cx => { cx.fillStyle = lin(cx, 0, 0, 0, H, [[0, '#1d2733'], [1, '#2b3748']]); cx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
      F(cx, rect(-M, -M, W + 2 * M, H + 2 * M), '#34425a', { semilla: 3, volumen: 0, borde: 0, sombraInterna: 0, textura: .8, irregular: 0, alfa: .4 });
      cx.strokeStyle = css('#0f1620', .5); cx.lineWidth = 3; for (let x = -M; x < W + M; x += 180) { cx.beginPath(); cx.moveTo(x, -M); cx.lineTo(x, H + M); cx.stroke(); } }));
    const sp = 3 * m, k0 = Math.floor((alt - (H + 300 - yR) / m) / 3) - 1, k1 = Math.ceil((alt + (yR + 300) / m) / 3) + 1;
    for (let k = k0; k <= k1; k++) {
      const yy = yR - (k * 3 - alt) * m;
      if (k * 3 < 0) continue;
      const dh = Math.min(2.2 * m, sp * .75), dw = 1.5 * m * .9;
      F(ctx, rect(540 - dw / 2 - 12, yy - dh - 12, dw + 24, dh + 12), '#59657a', { semilla: 20 + k, volumen: .8, borde: .8, irregular: 0 });
      for (const sd of [0, 1]) F(ctx, rect(540 - dw / 2 + sd * dw / 2, yy - dh, dw / 2 - 2, dh), mz('#a8553f', '#7a3e33', sd * .2), { semilla: 30 + k + sd, volumen: .8, borde: .7, textura: .4, irregular: .3 });
      ctx.fillStyle = css('#E0B060', .9); ctx.fillRect(540 - 9, yy - dh - 34, 18, 12);
      if (k % 2 === 0 && o.brillo !== false) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; rad(ctx, 150, yy - sp * .6, 160, '#ffcf86', .22 * luz); rad(ctx, 930, yy - sp * .6, 160, '#ffcf86', .22 * luz); ctx.restore(); }
    }
    if (alt * m < yR + 400) { const fy = yR + alt * m + 14; F(ctx, rect(-M, fy, W + 2 * M, H + M), '#2e3440', { semilla: 40, volumen: .6, borde: .8, textura: .7, irregular: 0 }); ctx.fillStyle = css('#0e131b', .6); ctx.fillRect(-M, fy, W + 2 * M, 14); }
    if (vel > 0) { ctx.save(); ctx.lineCap = 'round'; for (let g = 0; g < 3; g++) { ctx.strokeStyle = css('#b8c8d8', (.07 + .07 * g) * vel); ctx.lineWidth = 2 + g * 1.6; ctx.beginPath();
      for (let i = g; i < 30; i += 3) { const x = hash(i) * W, len = 220 + hash(i + 5) * 520, y = (((hash(i + 9) * (H + len)) - T * (2200 + 1600 * hash(i + 3)) * vel) % (H + len) + (H + len)) % (H + len) - len; ctx.moveTo(x, y); ctx.lineTo(x, y + len); } ctx.stroke(); } ctx.restore(); }
  };
  // CAMPO con tormenta
  FON.campo = (ctx, T, o) => {
    const tor = o.tormenta == null ? .6 : o.tormenta, hora = o.hora || 'tarde';
    ponMundo(ctx, mundo('campo' + hora, cx => {
      cielo(cx, hora === 'noche' ? '#10151f' : '#27303d', hora === 'noche' ? '#2a3445' : '#7d7f88', 1100);
      for (const [b, a, c, sm] of [[1000, 160, '#4a5566', 3], [1060, 110, '#3f4a50', 7]]) F(cx, cresta(-M, W + M, b, a, sm, 70), c, { semilla: sm, volumen: .5, borde: .3, textura: .5, irregular: 3, profundidad: .55 });
      suelo(cx, 1100, '#52604a', '#1f2a24', 5);
      const r = rng(9); cx.lineCap = 'round'; for (let i = 0; i < 700; i++) { const x = -M + r() * (W + 2 * M), y = 1110 + Math.pow(r(), 1.5) * 1000, h = 10 + (y - 1100) * .08; cx.strokeStyle = css(mz('#58684a', '#8a8f5c', r()), .5); cx.lineWidth = 2 + (y - 1100) * .004; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + 4, y - h * .5, x + (r() - .5) * 16, y - h); cx.stroke(); } }));
    ctx.save(); ctx.fillStyle = css('#0e131b', .3 + .4 * tor); ctx.fillRect(-M, -M, W + 2 * M, 1250); ctx.restore();
    const nb = mundo('nubesT', cx => { cx.clearRect(-M, -M, W + 2 * M, H + 2 * M); nubes(cx, -100, 500, '#151a24', 12, 4, .85); nubes(cx, 80, 700, '#2b3340', 9, 6, .6); });
    ctx.save(); ctx.globalAlpha = .55 + .45 * tor; deriva(ctx, T, nb, 14, -M); ctx.restore();
  };
  // LAGO congelado (grietas: V.grietas)
  FON.lago = (ctx, T, o) => {
    ponMundo(ctx, mundo('lago', cx => {
      cielo(cx, '#2c3747', '#a9a79c', 900);
      rad(cx, 780, 880, 600, '#ffd9a0', .35);
      F(cx, cresta(-M, W + M, 880, 140, 4, 60), '#5a6a78', { semilla: 4, volumen: .6, borde: .3, textura: .5, irregular: 3, profundidad: .6 });
      const r = rng(5); for (let i = 0; i < 40; i++) { const x = -M + r() * (W + 2 * M), h = 90 + r() * 90; F(cx, [[x - h * .14, 880], [x, 880 - h], [x + h * .14, 880]], '#2f4440', { semilla: i, volumen: .6, borde: .3, irregular: 1, profundidad: .4 }); }
      cx.fillStyle = lin(cx, 0, 880, 0, H + M, [[0, '#9fb3c0'], [.35, '#6f8798'], [1, '#2f4152']]); cx.fillRect(-M, 880, W + 2 * M, H + 2 * M);
      F(cx, rect(-M, 880, W + 2 * M, H + M), '#7f95a4', { semilla: 8, volumen: 0, borde: 0, sombraInterna: 0, textura: .8, irregular: 0, alfa: .35 });
      cx.lineCap = 'round'; for (let i = 0; i < 90; i++) { const y = 900 + Math.pow(r(), 1.7) * 1100, x = -M + r() * (W + 2 * M), w = 40 + (y - 880) * (.2 + r() * .5); cx.strokeStyle = css('#ecf5fa', .06 + .22 * r()); cx.lineWidth = 1.5 + (y - 880) * .006; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + w, y + (r() - .5) * 6); cx.stroke(); }
      for (let i = 0; i < 14; i++) { const y = 960 + Math.pow(r(), 1.4) * 900, x = -M + r() * (W + 2 * M); F(cx, ell(x, y, 60 + (y - 900) * .35, 4 + (y - 900) * .03, 0, 14), '#eef4f7', { semilla: i, volumen: .3, borde: .2, irregular: 3, alfa: .22 }); }
    }));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; rad(ctx, 780, 1000, 380, '#ffe4b0', .18 + .03 * Math.sin(T * 1.3)); ctx.restore();
  };
  // RÍO / agua con orilla lejana. o.nivel = y de la superficie (V.agua lo anima)
  FON.rio = (ctx, T, o) => {
    const ny = o.nivel == null ? 1000 : o.nivel;
    ponMundo(ctx, mundo('rio' + ny, cx => {
      cielo(cx, '#2f3b4c', '#c1b9a6', ny - 120);
      for (const [b, a, c, sm] of [[ny - 60, 150, '#5b6a62', 2], [ny - 20, 90, '#46574c', 6]]) F(cx, cresta(-M, W + M, b, a, sm, 60), c, { semilla: sm, volumen: .5, borde: .3, textura: .5, irregular: 3, profundidad: .5 });
      const r = rng(4); for (let i = 0; i < 30; i++) { const x = -M + r() * (W + 2 * M), h = 140 + r() * 120; F(cx, [[x - h * .12, ny - 20], [x, ny - 20 - h], [x + h * .12, ny - 20]], '#33473b', { semilla: i, volumen: .6, borde: .3, irregular: 1, profundidad: .3 }); }
      cx.fillStyle = lin(cx, 0, ny - 20, 0, H + M, [[0, '#6a8a94'], [1, '#14262f']]); cx.fillRect(-M, ny - 20, W + 2 * M, H + 2 * M);
    }));
  };
  // BOSQUE
  FON.bosque = (ctx, T, o) => {
    const hora = o.hora || 'dia', nie = o.niebla == null ? .5 : o.niebla;
    ponMundo(ctx, mundo('bosque' + hora, cx => {
      cielo(cx, hora === 'noche' ? '#0e131c' : '#4a5a64', hora === 'noche' ? '#27344a' : '#c8c0a4', 1100);
      for (let capa = 0; capa < 3; capa++) { const r = rng(20 + capa), pr = .75 - capa * .3, y = 1000 + capa * 70, h = 520 - capa * 70; for (let i = 0; i < 20 - capa * 4; i++) { const x = -M + (i + r() * .6) * (W + 2 * M) / (20 - capa * 4), hh = h * (.7 + r() * .5); F(cx, [[x - hh * .15, y], [x, y - hh], [x + hh * .15, y]], mz('#3f5348', '#1c2a26', capa * .3), { semilla: capa * 30 + i, volumen: .6, borde: .3, irregular: 1.5, textura: .5, profundidad: pr }); } }
      suelo(cx, 1180, '#4b4a3a', '#161a16', 6);
      const r2 = rng(3); for (let i = 0; i < 120; i++) { const x = -M + r2() * (W + 2 * M), y = 1190 + Math.pow(r2(), 1.6) * 900; cx.fillStyle = css(mz('#7a5a38', '#5c6b3c', r2()), .5); cx.beginPath(); cx.ellipse(x, y, 10 + (y - 1190) * .03, 3 + (y - 1190) * .008, 0, 0, TAU); cx.fill(); }
      for (const [x, h, sm] of [[90, 1250, 1], [980, 1450, 2]]) { F(cx, [[x - h * .04, 1320], [x - h * .025, 40], [x + h * .025, 40], [x + h * .04, 1320]], '#3a2f28', { semilla: sm, volumen: .9, borde: .9, textura: .7, irregular: 2, sombraInterna: .5 }); }
    }));
    if (nie > 0) I.niebla(ctx, T, { y: 700, alto: 900, color: hora === 'noche' ? '#4a5a76' : '#b9c0c4', alfa: .35 * nie, velocidad: 6, semilla: 5, canal: 0 });
    ctx.save(); K.rayos(ctx, T, '#ffe2b0', hora === 'noche' ? .02 : .07); ctx.restore();
  };
  // MONTAÑA nevada
  FON.montana = (ctx, T, o) => {
    ponMundo(ctx, mundo('montana', cx => {
      cielo(cx, '#3c4d6a', '#e0c8a6', 1000); rad(cx, 760, 760, 520, '#ffe0a8', .5);
      for (const [b, a, sm, c, pr] of [[1020, 620, 3, '#6a7890', .6], [1060, 520, 8, '#8794a8', .35], [1120, 380, 5, '#aab6c4', .1]]) {
        const pts = cresta(-M, W + M, b, a, sm, 90, .003); F(cx, pts, c, { semilla: sm, volumen: .8, borde: .6, textura: .5, irregular: 3, profundidad: pr, sombraInterna: .4 });
        cx.save(); cx.beginPath(); pts.forEach((p, i) => i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1])); cx.clip(); for (let i = 1; i < pts.length - 1; i += 2) { const p = pts[i], q = pts[i + 1]; cx.fillStyle = css(os('#c8d0dc', .45), .22); cx.beginPath(); cx.moveTo(p[0], p[1]); cx.lineTo(q[0], q[1]); cx.lineTo(q[0] + 90, q[1] + 700); cx.lineTo(p[0] - 30, p[1] + 700); cx.fill(); } cx.restore(); }
      suelo(cx, 1180, '#cfd8e0', '#6f7f93', 4, .5);
      const r = rng(7); for (let i = 0; i < 18; i++) V.arbol(cx, -M + r() * (W + 2 * M), 1180 + r() * 60, 150 + r() * 100, { tipo: 'pino', semilla: i, nieve: true });
      cx.lineCap = 'round'; for (let i = 0; i < 80; i++) { const y = 1220 + Math.pow(r(), 1.5) * 800, x = -M + r() * (W + 2 * M); cx.strokeStyle = css('#8a9bb0', .3); cx.lineWidth = 3; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + 60, y - 10, x + 140, y + 4); cx.stroke(); }
    }));
  };
  // INTERIOR de edificio (sismo: grietas y polvo)
  FON.interior = (ctx, T, o) => {
    const no = o.noche ? 1 : 0, sis = clamp(o.sismo || 0);
    ponMundo(ctx, mundo('interior' + no, cx => {
      cx.fillStyle = lin(cx, 0, -M, 0, 1250, [[0, '#46556a'], [1, '#6c7b90']]); cx.fillRect(-M, -M, W + 2 * M, 1260 + M);
      F(cx, rect(-M, -M, W + 2 * M, 1260 + M), '#5f6e84', { semilla: 3, volumen: 0, borde: 0, sombraInterna: 0, textura: .7, irregular: 0, alfa: .35 });
      F(cx, rect(-M, 1020, W + 2 * M, 230), '#3e4a5c', { semilla: 4, volumen: .4, borde: .5, textura: .5, irregular: 0 }); for (let x = -40; x < W + M; x += 190) { cx.strokeStyle = css('#232c3a', .5); cx.lineWidth = 3; cx.strokeRect(x, 1050, 160, 170); }
      F(cx, rect(-M, 1008, W + 2 * M, 14), '#8b96a6', { semilla: 5, volumen: .6, borde: .8, irregular: 0 });
      cx.fillStyle = lin(cx, 0, 1250, 0, H + M, [[0, '#8a6a4c'], [1, '#3a2a20']]); cx.fillRect(-M, 1250, W + 2 * M, H + M); cx.strokeStyle = css('#2a1d16', .5); cx.lineWidth = 3; for (let i = 0; i < 12; i++) { const y = 1262 + Math.pow(i, 1.6) * 16; cx.beginPath(); cx.moveTo(-M, y); cx.lineTo(W + M, y); cx.stroke(); }
      F(cx, rect(60, 330, 360, 520, 4), '#d8cbb6', { semilla: 6, volumen: .5, borde: .6, irregular: .3 }); cx.fillStyle = lin(cx, 0, 350, 0, 830, [[0, no ? '#141a28' : '#8fa3b8'], [1, no ? '#3a4560' : '#dccfb6']]); cx.fillRect(80, 350, 320, 480); cx.strokeStyle = css('#cdbfa8'); cx.lineWidth = 10; cx.strokeRect(80, 350, 320, 480); cx.beginPath(); cx.moveTo(240, 350); cx.lineTo(240, 830); cx.moveTo(80, 600); cx.lineTo(400, 600); cx.stroke();
      F(cx, rect(690, 430, 260, 580, 6), '#6a5444', { semilla: 8, volumen: .8, borde: .8, textura: .5, irregular: .5 }); F(cx, rect(710, 450, 220, 250, 4), '#8a6c54', { semilla: 9, volumen: .6, borde: .6, irregular: .3 });
      cx.strokeStyle = css('#2a2420'); cx.lineWidth = 5; cx.beginPath(); cx.moveTo(540, -M); cx.lineTo(540, 150); cx.stroke(); F(cx, [[500, 170], [580, 170], [610, 220], [470, 220]], '#c98a4b', { semilla: 10, volumen: .8, borde: .8 }); F(cx, ell(540, 222, 70, 10), '#ffd9a0', { semilla: 11, emisivo: true, borde: 0 });
    }));
    if (o.luz !== false) luzAmb(ctx, [{ x: 540, y: 560, r: 1300, fuerza: .9, color: '#fff0dc' }, { x: 240, y: 600, r: 600, fuerza: .4, color: '#b8c8e8' }], '#7a747c');
    if (sis > 0) { V.grietas(ctx, 560, 400, 520, sis, { semilla: 3, color: '#1c2430' }); V.grietas(ctx, 880, 220, 300, sis * .8, { semilla: 6, color: '#1c2430' }); }
  };
  // CARRETERA (lateral); v = px/s de las rayas
  FON.carretera = (ctx, T, o) => {
    const v = o.v || 0, hora = o.hora || 'tarde';
    ponMundo(ctx, mundo('carr' + hora, cx => {
      cielo(cx, hora === 'noche' ? '#0e131c' : '#3f536c', hora === 'noche' ? '#2a3548' : '#e0c49c', 1050);
      for (const [b, a, c, sm] of [[1000, 260, '#4f5a6a', 2], [1060, 160, '#46544c', 6]]) F(cx, cresta(-M, W + M, b, a, sm, 80), c, { semilla: sm, volumen: .5, borde: .3, textura: .5, irregular: 3, profundidad: .5 });
      suelo(cx, 1120, '#566246', '#1f271f', 3);
      cx.fillStyle = lin(cx, 0, 1200, 0, 1700, [[0, '#4a4d56'], [1, '#2a2c33']]); cx.fillRect(-M, 1200, W + 2 * M, 500);
      F(cx, rect(-M, 1196, W + 2 * M, 14), '#8d8f96', { semilla: 4, volumen: .6, borde: .8, irregular: 0 }); F(cx, rect(-M, 1696, W + 2 * M, 12), '#6a6c72', { semilla: 5, volumen: .6, borde: .8, irregular: 0 });
      F(cx, rect(-M, 1140, W + 2 * M, 12), '#9aa0aa', { semilla: 6, volumen: .8, borde: .8, irregular: 0 }); cx.fillStyle = css('#6a7078'); for (let x = -M; x < W + M; x += 150) cx.fillRect(x, 1140, 12, 60);
    }));
    ctx.save(); ctx.fillStyle = css('#d8d0b4', .75); for (let i = -2; i < 9; i++) { const x = ((i * 220 - T * v) % 1980 + 1980) % 1980 - 300; ctx.fillRect(x, 1445, 130, 12); } ctx.restore();
  };
  // MAR abierto (V.agua pone la transparencia delante)
  FON.mar = (ctx, T, o) => {
    const ny = o.nivel == null ? 900 : o.nivel, hora = o.hora || 'tarde', ol = o.oleaje == null ? 1 : o.oleaje;
    ponMundo(ctx, mundo('mar' + hora + ny, cx => { cielo(cx, hora === 'noche' ? '#0d121c' : '#38485f', hora === 'noche' ? '#2a3550' : '#e6c49a', ny); rad(cx, 700, ny - 30, 520, '#ffe0a8', .55); nubes(cx, 60, ny - 300, '#aeb4c0', 5, 4, .25); }));
    for (let l = 0; l < 7; l++) {
      const y0 = ny + l * l * 22 + l * 40, a = 8 + l * 7, ph = T * (.8 + l * .15) + l * 2, c = mz('#4d7585', '#15303c', l / 7);
      ctx.beginPath(); ctx.moveTo(-M, H + M); for (let x = -M; x <= W + M; x += 30) ctx.lineTo(x, y0 + (Math.sin(x * (.012 - l * .001) + ph) * a + Math.sin(x * .027 + ph * 1.3) * a * .4) * ol); ctx.lineTo(W + M, H + M); ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, y0 - a, 0, y0 + 260 + l * 40, [[0, ac(c, .12)], [1, os(c, .3)]]); ctx.fill();
      ctx.strokeStyle = css('#e8f2f6', .25 + l * .04); ctx.lineWidth = 2 + l * .5; ctx.beginPath(); for (let x = -M; x <= W + M; x += 30) { const y = y0 + (Math.sin(x * (.012 - l * .001) + ph) * a + Math.sin(x * .027 + ph * 1.3) * a * .4) * ol; x === -M ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    }
  };
  // DESIERTO
  FON.desierto = (ctx, T, o) => {
    ponMundo(ctx, mundo('desierto', cx => {
      cielo(cx, '#6a86a6', '#f0d4a4', 900); rad(cx, 600, 520, 700, '#fff0c0', .6); cx.fillStyle = css('#fff6d8'); cx.beginPath(); cx.arc(600, 520, 70, 0, TAU); cx.fill();
      for (const [b, a, c, sm, pr] of [[880, 160, '#d6b080', 3, .4], [980, 200, '#c79a62', 8, .2], [1120, 160, '#b88650', 5, 0]]) { const pts = cresta(-M, W + M, b, a, sm, 100, .002); F(cx, pts, c, { semilla: sm, volumen: .8, borde: .6, textura: .6, irregular: 3, profundidad: pr, sombraInterna: .4 }); cx.save(); cx.beginPath(); pts.forEach((p, i) => i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1])); cx.clip(); cx.fillStyle = css('#6b4a30', .22); for (let i = 1; i < pts.length - 2; i += 2) { cx.beginPath(); cx.moveTo(pts[i][0], pts[i][1]); cx.lineTo(pts[i + 1][0], pts[i + 1][1]); cx.lineTo(pts[i + 1][0] + 160, pts[i + 1][1] + 600); cx.lineTo(pts[i][0] + 60, pts[i][1] + 600); cx.fill(); } cx.restore(); }
      suelo(cx, 1220, '#c89c64', '#6a4a30', 4, .8);
    }));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; rad(ctx, 600, 520, 560, '#ffe6a8', .14 + .03 * Math.sin(T)); ctx.restore();
  };
  // INCENDIO: pasillo en perspectiva lleno de humo (humo 0-1 baja desde el techo)
  FON.incendio = (ctx, T, o) => {
    const hu = o.humo == null ? .6 : o.humo, vx = 540, vy = 760;
    ponMundo(ctx, mundo('incendio', cx => {
      cx.fillStyle = '#1a1c24'; cx.fillRect(-M, -M, W + 2 * M, H + 2 * M);
      const pared = (pts, c, sm) => F(cx, pts, c, { semilla: sm, volumen: .6, borde: .5, textura: .6, irregular: .5, sombraInterna: .4 });
      pared([[-M, -M], [vx - 220, vy - 200], [vx - 220, vy + 260], [-M, H + M]], '#5a5560', 3); pared([[W + M, -M], [vx + 220, vy - 200], [vx + 220, vy + 260], [W + M, H + M]], '#4c4852', 4);
      pared([[-M, -M], [W + M, -M], [vx + 220, vy - 200], [vx - 220, vy - 200]], '#3f3c46', 5); pared([[-M, H + M], [W + M, H + M], [vx + 220, vy + 260], [vx - 220, vy + 260]], '#35303a', 6);
      F(cx, rect(vx - 220, vy - 200, 440, 460), '#2a2430', { semilla: 7, volumen: .3, borde: .3, irregular: 0 });
      for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const u = (i + .6) / 3.4, k = 1 - u * .85, xw = vx + sd * (220 + (W / 2 + M - 220) * Math.pow(k, 1.6)), hh = 640 * Math.pow(k, 1.5), cyy = vy + 40 + (H / 2 - 100) * Math.pow(k, 1.9) * .5; F(cx, [[xw, cyy - hh * .62], [xw + sd * -120 * k, cyy - hh * .55], [xw + sd * -120 * k, cyy + hh * .38], [xw, cyy + hh * .45]], '#7a4a3a', { semilla: 10 + i, volumen: .8, borde: .7, textura: .5, irregular: .4 }); }
    }));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const p = 1 + .08 * Math.sin(T * 9) + .05 * Math.sin(T * 14.3); rad(ctx, vx, vy + 60, 520 * p, '#ff7a30', .75); rad(ctx, vx, vy + 100, 220 * p, '#ffcf86', .6); ctx.restore();
    V.fuego(ctx, vx, vy + 230, 260, T, {}); V.fuego(ctx, vx - 120, vy + 230, 160, T + 1.3, {}); V.fuego(ctx, vx + 120, vy + 230, 190, T + 2.1, {});
    ctx.save(); ctx.fillStyle = lin(ctx, 0, -M, 0, lerp(200, 1700, hu), [[0, '#16161c', .95], [.7, '#2a2a30', .8], [1, '#3a3a42', 0]]); ctx.fillRect(-M, -M, W + 2 * M, lerp(300, 1800, hu) + M); ctx.restore();
    V.humo(ctx, 540, lerp(900, 1500, hu), T, { n: 10, r: 200, alto: 700, color: '#2e2e34', alfa: .35 * hu + .1 });
  };
  // PLANO de color para diagramas y flechas
  FON.plano = (ctx, T, o) => {
    const tema = o.tema || 'azul', t = { azul: ['#4a5a72', '#1f2733', '#34425a'], noche: ['#2f3b4d', '#12171f', '#232c3a'], tierra: ['#7a6048', '#2a1f1a', '#54402f'] }[tema];
    ponMundo(ctx, mundo('plano' + tema, cx => { cx.fillStyle = lin(cx, 0, -M, 0, H + M, [[0, t[0]], [.5, t[2]], [1, t[1]]]); cx.fillRect(-M, -M, W + 2 * M, H + 2 * M); F(cx, rect(-M, -M, W + 2 * M, H + 2 * M), t[2], { semilla: 2, volumen: 0, borde: 0, sombraInterna: 0, textura: .7, irregular: 0, alfa: .3 }); }));
    I.halo(ctx, o.x == null ? 540 : o.x, o.y == null ? 800 : o.y, 700 * (1 + .03 * Math.sin(T * 1.7)), '#ffcf96', .24);
  };
  V.listo = true;
})();
