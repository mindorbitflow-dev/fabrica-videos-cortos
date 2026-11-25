// ESCALA 3D (pseudo-3D en canvas, global E3): números enormes convertidos en objetos gigantes que se ven y se mueven, con una cámara de
// verdad (perspectiva, giro y cabeceo), como las infografías 3D de «si ganaras X al día...». Todo es función del tiempo (sin azar ni estado).
// Cargar tras kit.js. El mundo está en metros: X a la derecha, Y arriba, Z hacia adelante; la cámara mira hacia +Z.
//
//   CÁMARA   const c = E3.cam({ x, y, z, yaw, pitch, f, cx, cy })   yaw = giro a la derecha (rad), pitch > 0 = mira hacia ARRIBA, f = zoom (1200 normal), (cx, cy) = punto central.
//            E3.proj(c, X, Y, Z) -> { x, y, s, z } | null   (pantalla; s = píxeles por metro a esa profundidad)
//            Mueve la cámara entre escenas/cuadros con E3.mezcla(c0, c1, k) (k 0-1, ya suavizado) para dollies, órbitas y subidas.
//   OBJETOS  E3.suelo(ctx, c, { color, y, ancho, paso })                         suelo con rejilla que se aleja (da profundidad)
//            E3.caja(ctx, c, { x, y, z, w, h, d, color, textura:'billetes'|null }) caja con 3 caras sombreadas (x,z = centro; y = base)
//            E3.torre(ctx, c, { x, z, w, d, h, ... })                              pila de billetes (caja verde con fajos y brillo arriba): anima h para que crezca
//            E3.multitud(ctx, c, { x0, x1, z0, z1, filas, cols, reveal })           miles de personas (reveal 0-1 = cuántas han aparecido)
//            E3.globo(ctx, { x, y, r, rot })                                         la Tierra de noche con las luces de las ciudades; rot = giro (rad)
//            E3.piramide(ctx, c, { x, z, base, alto, color })
//            E3.retroPC(ctx, x, y, s, T)                                            computador retro con un videojuego (x,y = centro de la base)
//   TEXTO    E3.titular(ctx, ['LÍNEA 1','LÍNEA 2'], indiceRojo, a, y = 330, tam = 104)  título gigante (a 0-1 = entrada con rebote); pocas palabras, una en rojo
//            E3.pegatina(ctx, 'TEXTO', x, y, a, giro = -.05)                            etiqueta amarilla con el dato
//            E3.contador(ctx, valor, x, y, { prefijo:'$', sufijo:'', tam:130 })          número con separador de miles (. en español, , en inglés)
//            E3.rotulo(ctx, c, X, Y, Z, 'TEXTO', { tam:34 })                           letrero que viaja con un punto del mundo
//   FONDO    E3.estrellas(ctx, T, n)       E3.noche(ctx, T, tema)   (D.fondo.abstracto + estrellas)
(() => {
  if (!window.K) return;
  const { W, H, TAU, clamp, lerp, prog, sale, rebote, hash } = K;
  const ROJO = '#FF4B3E', AMARILLO = '#FFD23F', TINTA = '#1a1033';
  const E3 = window.E3 = {};

  // ---------- cámara ----------
  E3.cam = (o = {}) => Object.assign({ x: 0, y: 2, z: -12, yaw: 0, pitch: 0, f: 1200, cx: 540, cy: 900 }, o);
  E3.proj = (c, X, Y, Z) => {
    const x = X - c.x, y = Y - c.y, z = Z - c.z, cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    if (z2 <= .05) return null;
    const s = c.f / z2;
    return { x: c.cx + x1 * s, y: c.cy - y1 * s, s, z: z2 };
  };
  E3.mezcla = (a, b, k) => { const o = {}; for (const key in a) o[key] = typeof a[key] === 'number' && typeof b[key] === 'number' ? lerp(a[key], b[key], k) : a[key]; return o; };
  const P = E3.proj;
  // Recorte al plano cercano: una cara o una línea con una esquina detrás de la cámara se recorta en vez de desaparecer.
  const NEAR = .3;
  const c3 = (c, X, Y, Z) => { const x = X - c.x, y = Y - c.y, z = Z - c.z, cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
  const pr = (c, q) => ({ x: c.cx + q[0] * c.f / q[2], y: c.cy - q[1] * c.f / q[2], s: c.f / q[2], z: q[2] });
  const poli = (c, pts) => {   // pts = [[X,Y,Z], ...] -> puntos de pantalla ya recortados
    const q = pts.map(p => c3(c, p[0], p[1], p[2])), out = [];
    for (let i = 0; i < q.length; i++) {
      const a = q[i], b = q[(i + 1) % q.length], ia = a[2] >= NEAR, ib = b[2] >= NEAR;
      if (ia) out.push(a);
      if (ia !== ib) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), NEAR]); }
    }
    return out.map(p => pr(c, p));
  };
  const seg = (c, A, B) => {
    let a = c3(c, A[0], A[1], A[2]), b = c3(c, B[0], B[1], B[2]);
    if (a[2] < NEAR && b[2] < NEAR) return null;
    if (a[2] < NEAR) { const t = (NEAR - a[2]) / (b[2] - a[2]); a = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), NEAR]; }
    else if (b[2] < NEAR) { const t = (NEAR - a[2]) / (b[2] - a[2]); b = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), NEAR]; }
    return [pr(c, a), pr(c, b)];
  };

  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const sombra = (hex, k) => { const [r, g, b] = rgb(hex); return `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`; };
  const quad = (ctx, pts, fill, borde) => {
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 1.5; ctx.stroke(); }
  };

  // ---------- suelo con rejilla ----------
  E3.suelo = (ctx, c, { color = '#2a1f4a', y = 0, ancho = 80, paso = 2.5, lejos = 260 } = {}) => {
    const hz = clamp(c.cy + c.f * Math.tan(c.pitch), -200, H + 200);   // horizonte
    const g = ctx.createLinearGradient(0, hz, 0, H); g.addColorStop(0, sombra(color, 1.5)); g.addColorStop(1, sombra(color, .55));
    ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, hz), W, H);
    ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.16)';
    const z0 = c.z + 1.5;
    for (let X = -ancho; X <= ancho; X += paso) { const l = seg(c, [X, y, z0 - 3], [X, y, z0 + lejos]); if (l) { ctx.beginPath(); ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); ctx.stroke(); } }
    for (let Z = Math.ceil((z0 - 3) / paso) * paso; Z < z0 + 90; Z += paso) { const l = seg(c, [-ancho, y, Z], [ancho, y, Z]); if (l) { ctx.globalAlpha = clamp(1.1 - (Z - z0) / 90); ctx.beginPath(); ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); ctx.stroke(); } }
    ctx.restore();
  };

  // ---------- caja y torre de billetes ----------
  E3.caja = (ctx, c, o = {}) => {
    const { x = 0, y = 0, z = 0, w = 1, h = 1, d = 1, color = '#4f8a4a', textura = null, banda = .1 } = o;
    const x0 = x - w / 2, x1 = x + w / 2, y1 = y + h, z0 = z - d / 2, z1 = z + d / 2;
    const caras = [];
    if (c.z < z0) caras.push([[[x0, y, z0], [x1, y, z0], [x1, y1, z0], [x0, y1, z0]], 1, true]);
    if (c.x < x0) caras.push([[[x0, y, z1], [x0, y, z0], [x0, y1, z0], [x0, y1, z1]], .7, true]);
    else if (c.x > x1) caras.push([[[x1, y, z0], [x1, y, z1], [x1, y1, z1], [x1, y1, z0]], .6, true]);
    if (c.y > y1) caras.push([[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], 1.2, false]);
    for (const [q, k, lateral] of caras) {
      const p = poli(c, q);
      if (p.length < 3) continue;
      quad(ctx, p, sombra(color, k), 'rgba(0,0,0,.35)');
      if (textura === 'billetes' && lateral) {   // fajos: líneas horizontales y una cinta cada 10
        const n = clamp(Math.round(h / banda), 3, 150);
        ctx.save();
        for (let i = 1; i < n; i++) {
          const v = i / n, A = [lerp(q[0][0], q[3][0], v), lerp(q[0][1], q[3][1], v), lerp(q[0][2], q[3][2], v)], B = [lerp(q[1][0], q[2][0], v), lerp(q[1][1], q[2][1], v), lerp(q[1][2], q[2][2], v)];
          const l = seg(c, A, B); if (!l || l[0].y < -50 && l[1].y < -50 || l[0].y > H + 50 && l[1].y > H + 50) continue;
          const cinta = i % 10 === 0; ctx.strokeStyle = cinta ? 'rgba(235,215,140,.75)' : 'rgba(0,0,0,.24)'; ctx.lineWidth = cinta ? 2.4 : 1;
          ctx.beginPath(); ctx.moveTo(l[0].x, l[0].y); ctx.lineTo(l[1].x, l[1].y); ctx.stroke();
        }
        ctx.restore();
      }
    }
  };
  E3.torre = (ctx, c, o = {}) => {
    const t = Object.assign({ w: 3, d: 3, h: 4, color: '#3f8a50', textura: 'billetes', banda: .1 }, o);
    E3.caja(ctx, c, t);
    const top = P(c, t.x || 0, (t.y || 0) + t.h, t.z || 0);
    if (top && top.x > -300 && top.x < W + 300) K.halo(ctx, top.x, top.y, Math.max(40, t.w * top.s * 1.2), '#ffe28a', .22);
  };

  // ---------- multitud ----------
  const ROPAS = ['#c0392b', '#2e86c1', '#27ae60', '#f1c40f', '#8e44ad', '#ecf0f1', '#e67e22', '#1abc9c', '#34495e', '#d35400'], PIELES = ['#f0c4a0', '#e0a97f', '#c98f66', '#a56d48', '#7d4b32'];
  E3.multitud = (ctx, c, o = {}) => {
    const { x0 = -24, x1 = 24, z0 = 4, z1 = 70, filas = 44, cols = 64, seed = 3, reveal = 1, alto = 1.7, y = 0 } = o;
    for (let j = filas - 1; j >= 0; j--) {   // de lejos a cerca
      const zz = lerp(z0, z1, j / Math.max(1, filas - 1));
      for (let i = 0; i < cols; i++) {
        const n = j * cols + i;
        if (hash(n + seed * 91) > reveal) continue;
        const X = lerp(x0, x1, (i + hash(n * 1.3 + seed)) / cols), Z = zz + (hash(n * 2.1 + seed) - .5) * ((z1 - z0) / filas);
        const p = P(c, X, y, Z);
        if (!p || p.x < -40 || p.x > W + 40 || p.y < -60 || p.y > H + 160) continue;
        const hh = alto * p.s;
        ctx.fillStyle = ROPAS[(hash(n * 3.7 + seed) * 10) | 0]; ctx.fillRect(p.x - hh * .18, p.y - hh * .64, hh * .36, hh * .64);
        ctx.fillStyle = PIELES[(hash(n * 5.9 + seed) * 5) | 0]; ctx.beginPath(); ctx.arc(p.x, p.y - hh * .76, Math.max(1, hh * .12), 0, TAU); ctx.fill();
      }
    }
  };

  // ---------- la Tierra de noche ----------
  const CONTINENTES = [[45, -100, 18, 34, 520], [-14, -60, 24, 14, 300], [50, 15, 9, 22, 380], [6, 20, 26, 18, 330], [38, 95, 24, 46, 640], [22, 78, 8, 9, 220], [-25, 135, 9, 15, 110], [37, 138, 5, 5, 120]];
  const LUCES = []; CONTINENTES.forEach(([la, lo, ra, ro, n], k) => { for (let i = 0; i < n * 3; i++) { const a = hash(i * 1.7 + k * 13) * TAU, rr = Math.sqrt(hash(i * 3.1 + k * 7)); LUCES.push([(la + Math.sin(a) * ra * rr) * Math.PI / 180, (lo + Math.cos(a) * ro * rr) * Math.PI / 180, hash(i * 9.1 + k)]); } });
  E3.globo = (ctx, { x = 540, y = 760, r = 340, rot = 0, tilt = .38 } = {}) => {
    ctx.save();
    const halo = ctx.createRadialGradient(x, y, r * .9, x, y, r * 1.35); halo.addColorStop(0, 'rgba(80,140,255,.35)'); halo.addColorStop(1, 'rgba(80,140,255,0)');
    ctx.fillStyle = halo; ctx.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
    const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r); g.addColorStop(0, '#2a66b5'); g.addColorStop(.7, '#123268'); g.addColorStop(1, '#060d22');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    for (const [la, lo, s] of LUCES) {
      const X = Math.cos(la) * Math.sin(lo + rot), Y = Math.sin(la), Z = Math.cos(la) * Math.cos(lo + rot);
      const y2 = Y * ct - Z * st, z2 = Y * st + Z * ct;
      if (z2 <= 0) continue;
      ctx.globalAlpha = (.25 + .65 * z2) * (.5 + .5 * s); ctx.fillStyle = s > .8 ? '#fff3c4' : '#ffc45e';
      const t = (1.4 + s * 2.2) * r / 330; ctx.fillRect(x + X * r - t / 2, y - y2 * r - t / 2, t, t);
    }
    ctx.globalAlpha = 1;
    const borde = ctx.createRadialGradient(x, y, r * .78, x, y, r); borde.addColorStop(0, 'rgba(0,0,0,0)'); borde.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = borde; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  };

  // ---------- pirámide ----------
  E3.piramide = (ctx, c, { x = 0, z = 0, base = 12, alto = 8, color = '#d1a85a' } = {}) => {
    const b = base / 2, E = [[x - b, z - b], [x + b, z - b], [x + b, z + b], [x - b, z + b]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = E[i], [bx, bz] = E[(i + 1) % 4], mx = (ax + bx) / 2 - x, mz = (az + bz) / 2 - z;
      if ((c.x - (x + mx)) * mx + (c.z - (z + mz)) * mz <= 0) continue;
      const pp = poli(c, [[ax, 0, az], [bx, 0, bz], [x, alto, z]]);
      if (pp.length < 3) continue;
      const luz = .55 + .5 * clamp((-mx * .5 - mz * .85) / b * .5 + .5);
      quad(ctx, pp, sombra(color, luz), 'rgba(60,40,10,.4)');
    }
  };

  // ---------- computador retro con videojuego ----------
  E3.retroPC = (ctx, x, y, s, T) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const rr = (a, b, w, h, r, fill) => { ctx.beginPath(); ctx.roundRect(a, b, w, h, r); ctx.fillStyle = fill; ctx.fill(); };
    rr(-210, -90, 420, 40, 12, '#c9bfa6'); rr(-150, -70, 300, 20, 8, '#ddd3ba');                // teclado/base
    rr(-190, -520, 380, 380, 26, '#d8cdb2'); rr(-165, -495, 330, 330, 14, '#14171f');          // monitor
    rr(-60, -140, 120, 50, 8, '#cfc4a9');                                                      // cuello
    ctx.fillStyle = '#7dffb0';
    const fila = (j, k) => { for (let i = 0; i < 6; i++) { const ox = -110 + i * 40 + Math.sin(T * 1.6) * 26, oy = -455 + j * 36 + Math.floor((T * .7) % 2) * 4; ctx.fillRect(ox, oy, 24, 16); ctx.fillRect(ox + 4, oy + 16, 4, 6); ctx.fillRect(ox + 16, oy + 16, 4, 6); } };
    for (let j = 0; j < 4; j++) fila(j);
    const nx = Math.sin(T * 2.2) * 110; ctx.fillRect(nx - 14, -205, 28, 10); ctx.fillRect(nx - 4, -216, 8, 12);   // nave
    const by = -215 - ((T * 160) % 200); ctx.fillRect(nx - 2, by, 4, 14);                                          // disparo
    const g = ctx.createRadialGradient(0, -330, 20, 0, -330, 260); g.addColorStop(0, 'rgba(125,255,176,.22)'); g.addColorStop(1, 'rgba(125,255,176,0)'); ctx.fillStyle = g; ctx.fillRect(-300, -600, 600, 600);
    ctx.restore();
  };

  // ---------- texto ----------
  E3.titular = (ctx, lineas, rojo, a, y = 330, tam = 104) => {
    if (a <= 0) return;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${tam}px ${K.TITULAR}`; ctx.lineJoin = 'round';
    lineas.forEach((txt, i) => {
      const k = clamp(a * 1.4 - i * .25), s = lerp(1.15, 1, sale(k));
      ctx.save(); ctx.globalAlpha = k; ctx.translate(540, y + i * tam * 1.1); ctx.scale(s, s);
      ctx.lineWidth = tam * .11; ctx.strokeStyle = '#000'; ctx.strokeText(txt, 0, 0);   // contorno negro: se lee sobre cualquier fondo
      ctx.fillStyle = i === rojo ? ROJO : '#fff'; ctx.fillText(txt, 0, 0); ctx.restore();
    });
    ctx.restore();
  };
  E3.pegatina = (ctx, txt, x, y, a, giro = -.05) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(giro);
    K.pastilla(ctx, txt, 0, 0, { tam: 50, fondo: AMARILLO, color: TINTA, opacidad: a, escala: rebote(a) });
    ctx.restore();
  };
  const miles = n => { const s = Math.round(n).toLocaleString('en-US'); return window.IDIOMA === 'en' ? s : s.replace(/,/g, '.'); };
  E3.contador = (ctx, valor, x, y, { prefijo = '', sufijo = '', tam = 130, color = AMARILLO } = {}) => {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${tam}px ${K.TITULAR}`; ctx.lineJoin = 'round';
    const txt = prefijo + miles(valor) + sufijo, anchoMax = 900, w = ctx.measureText(txt).width, k = w > anchoMax ? anchoMax / w : 1;
    ctx.translate(x, y); ctx.scale(k, k); ctx.shadowColor = color; ctx.shadowBlur = 28;
    ctx.lineWidth = tam * .1; ctx.strokeStyle = '#000'; ctx.strokeText(txt, 0, 0); ctx.shadowBlur = 0; ctx.fillStyle = color; ctx.fillText(txt, 0, 0);
    ctx.restore();
  };
  E3.rotulo = (ctx, c, X, Y, Z, txt, { tam = 34, fondo = AMARILLO, color = TINTA } = {}) => {
    const p = P(c, X, Y, Z); if (!p) return;
    const t = clamp(p.s / 60, .5, 1.6); K.pastilla(ctx, txt, p.x, p.y, { tam: tam * t, fondo, color, opacidad: 1, escala: 1 });
  };

  // ---------- fondo ----------
  E3.estrellas = (ctx, T, n = 70) => {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const x = hash(i * 1.7) * W, y = 80 + hash(i * 3.1) * 1000, r = 1 + hash(i * 5.3) * 2.6;
      ctx.globalAlpha = .3 + .45 * (.5 + .5 * Math.sin(T * 1.8 + i)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  E3.noche = (ctx, T, tema = 'ciruela') => { D.fondo.abstracto(ctx, T, { tema, y: 760 }); E3.estrellas(ctx, T); };
})();
