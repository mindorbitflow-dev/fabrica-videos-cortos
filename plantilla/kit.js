// Kit de dibujo para las escenas de autor (proyectos/<id>/escenas.js): utilidades de tiempo, azar repetible, fondos,
// rótulos y formas orgánicas. Las escenas dibujan sobre un canvas de 1080x1920 con `dibujar(ctx, t, dur, K, T)`:
// t = segundos desde que empezó la escena, dur = duración de la escena, T = segundos desde que empezó el video.
// Todo depende solo del tiempo recibido (nada de Math.random ni Date): la vista previa y el MP4 salen idénticos.
window.K = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const suave = k => { k = clamp(k); return k * k * (3 - 2 * k); };
  const sale = k => 1 - Math.pow(1 - clamp(k), 3);
  const rebote = k => { k = clamp(k); const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  // Avance 0→1 entre los segundos a y b (suavizado).
  const prog = (t, a, b) => suave((t - a) / (b - a));
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const azar = semilla => { let s = semilla >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) | 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
  // Latido: pico corto que se repite `ppm` veces por minuto.
  const latido = (t, ppm = 70, fase = 0) => Math.pow(Math.max(0, Math.sin((t * ppm / 60 + fase) * TAU)), 8);

  function alfa(color, a) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function mezcla(c1, c2, k) {
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const m = d => Math.round(lerp((a >> d) & 255, (b >> d) & 255, clamp(k)));
    return `rgb(${m(16)},${m(8)},${m(0)})`;
  }

  // ---- fondos ----
  function fondo(ctx, arriba, abajo, medio) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, arriba); if (medio) g.addColorStop(.5, medio); g.addColorStop(1, abajo);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function halo(ctx, x, y, r, color, a = .5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, alfa(color, a)); g.addColorStop(1, alfa(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Rayos de luz diagonales (agua, polvo en el aire).
  function rayos(ctx, T, color = '#ffffff', a = .06) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const x = -200 + i * 230 + Math.sin(T * .25 + i) * 40, ancho = 60 + hash(i) * 90;
      const g = ctx.createLinearGradient(0, 0, 0, H * .8);
      g.addColorStop(0, alfa(color, a * (.6 + .4 * Math.sin(T * .4 + i * 2)))); g.addColorStop(1, alfa(color, 0));
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(x, -20); ctx.lineTo(x + ancho, -20); ctx.lineTo(x + ancho - 380, H * .8); ctx.lineTo(x - 380 - ancho, H * .8);
      ctx.fill();
    }
    ctx.restore();
  }
  // Motas que derivan despacio (plancton, polvo, nieve marina). vy<0 suben, vy>0 caen.
  function motas(ctx, T, { n = 60, color = '#ffffff', a = .35, vy = -12, tam = 3, semilla = 1 } = {}) {
    const r = azar(semilla);
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x0 = r() * W, y0 = r() * H, v = .4 + r() * .9, s = .4 + r() * tam, f = r() * TAU;
      const y = ((y0 + T * vy * v) % H + H) % H, x = x0 + Math.sin(T * .5 * v + f) * 26;
      ctx.globalAlpha = a * (.4 + .6 * Math.abs(Math.sin(T * .7 + f)));
      ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  let tejaGrano = null;
  // Grano de película y viñeta: van al final de cada escena y unifican el acabado.
  function acabado(ctx, T, { grano = .09, vineta = .55 } = {}) {
    if (vineta) {
      const g = ctx.createRadialGradient(W / 2, H * .42, H * .25, W / 2, H * .5, H * .75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${vineta})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (grano) {
      if (!tejaGrano) {
        tejaGrano = document.createElement('canvas'); tejaGrano.width = tejaGrano.height = 256;
        const c = tejaGrano.getContext('2d'), d = c.createImageData(256, 256), r = azar(7);
        for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
        c.putImageData(d, 0, 0);
      }
      const paso = Math.floor(T * 12);
      ctx.save(); ctx.globalAlpha = grano; ctx.globalCompositeOperation = 'overlay';
      ctx.translate(-hash(paso) * 256, -hash(paso + 9) * 256);
      ctx.fillStyle = ctx.createPattern(tejaGrano, 'repeat'); ctx.fillRect(0, 0, W + 256, H + 256);
      ctx.restore();
    }
  }
  // Cámara: dibuja `fn` con el punto (cx, cy) del mundo en el centro de la zona de dibujo y con zoom z.
  function camara(ctx, cx, cy, z, fn, centroY = 760) {
    ctx.save(); ctx.translate(W / 2, centroY); ctx.scale(z, z); ctx.translate(-cx, -cy); fn(); ctx.restore();
  }

  // ---- formas ----
  // Curva suave que pasa por los puntos [[x,y],...] (cerrada o abierta). Deja el trazo listo para fill/stroke.
  function curva(ctx, pts, cerrada = true) {
    const n = pts.length, p = i => pts[cerrada ? (i + n) % n : clamp(i, 0, n - 1)];
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < (cerrada ? n : n - 1); i++) {
      const a = p(i - 1), b = p(i), c = p(i + 1), d = p(i + 2);
      ctx.bezierCurveTo(b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (d[0] - b[0]) / 6, c[1] - (d[1] - b[1]) / 6, c[0], c[1]);
    }
    if (cerrada) ctx.closePath();
  }
  // Extremidad que se afina (tentáculo, cola, rama, trompa). `giro(i, k)` devuelve cuánto cambia el ángulo en cada tramo
  // (k = 0 en la base, 1 en la punta). Devuelve los puntos del eje [[x, y, ancho, ángulo], ...] para colocar detalles encima.
  function extremidad(ctx, x, y, ang, largo, ancho, giro, color, { tramos = 26, punta = 3, suelo = null } = {}) {
    const eje = [], paso = largo / tramos;
    for (let i = 0; i <= tramos; i++) {
      const k = i / tramos;
      eje.push([x, y, lerp(ancho, punta, Math.pow(k, .8)), ang]);
      ang += giro(i, k);
      x += Math.cos(ang) * paso; y += Math.sin(ang) * paso;
      if (suelo !== null && y > suelo) { y = suelo; ang = Math.cos(ang) >= 0 ? 0 : Math.PI; }
    }
    ctx.beginPath();
    eje.forEach(([px, py, w, a], i) => { const q = [px + Math.cos(a - Math.PI / 2) * w / 2, py + Math.sin(a - Math.PI / 2) * w / 2]; i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    for (let i = eje.length - 1; i >= 0; i--) { const [px, py, w, a] = eje[i]; ctx.lineTo(px + Math.cos(a + Math.PI / 2) * w / 2, py + Math.sin(a + Math.PI / 2) * w / 2); }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    return eje;
  }
  // Punto a la fracción k (0-1) de un eje o de una lista de puntos.
  function enRuta(pts, k) {
    const f = clamp(k) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i;
    return [lerp(pts[i][0], pts[i + 1][0], r), lerp(pts[i][1], pts[i + 1][1], r)];
  }
  // Ruta suave y densa (n tramos) que pasa por los puntos dados: sirve para trazar un vaso o un cable y mover cosas por él con enRuta.
  function ruta(pts, n = 40) {
    const m = pts.length - 1, p = i => pts[clamp(i, 0, m)], out = [];
    for (let j = 0; j <= n; j++) {
      const f = j / n * m, i = Math.min(m - 1, Math.floor(f)), r = f - i, a = p(i - 1), b = p(i), c = p(i + 1), d = p(i + 2);
      const cr = q => .5 * (2 * b[q] + (c[q] - a[q]) * r + (2 * a[q] - 5 * b[q] + 4 * c[q] - d[q]) * r * r + (3 * b[q] - a[q] - 3 * c[q] + d[q]) * r * r * r);
      out.push([cr(0), cr(1)]);
    }
    return out;
  }
  function trazo(ctx, pts, color, ancho) {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.lineCap = ctx.lineJoin = 'round'; ctx.stroke();
  }
  function redondo(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  }

  // ---- texto ---- (pequeño y sobrio: lo dice la voz; el rótulo solo nombra lo que se ve)
  const MONO = '"Space Mono", monospace', TITULAR = 'Anton, Montserrat, sans-serif', TEXTO = 'Montserrat, sans-serif';
  // Rótulo en mayúsculas con línea opcional hasta el punto que nombra: rotulo(ctx, 'BRANQUIA', 700, 500, {a: [620, 560]}).
  function rotulo(ctx, texto, x, y, { color = '#EAF6FF', tam = 38, alinea = 'left', a = null, opacidad = 1, fuente = MONO, peso = '' } = {}) {
    if (opacidad <= 0) return;
    ctx.save(); ctx.globalAlpha = opacidad;
    ctx.font = `${peso} ${tam}px ${fuente}`.trim(); ctx.textAlign = alinea; ctx.textBaseline = 'middle';
    if (a) {
      const ancho = ctx.measureText(texto).width, bx = alinea === 'left' ? x - 12 : alinea === 'right' ? x + 12 : x;
      const by = alinea === 'center' ? y + (a[1] > y ? tam * .7 : -tam * .7) : y;
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = opacidad * .7;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(a[0], a[1]); ctx.stroke();
      ctx.beginPath(); ctx.arc(a[0], a[1], 5, 0, TAU); ctx.fillStyle = color; ctx.fill();
      ctx.globalAlpha = opacidad; void ancho;
    }
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8;
    ctx.fillStyle = color; ctx.fillText(texto, x, y);
    ctx.restore();
  }
  // Rótulo dentro de una pastilla (dato corto: "4 °C", "x3", "DETENIDO").
  function pastilla(ctx, texto, x, y, { color = '#0b1a24', fondo: f = '#EAF6FF', tam = 34, opacidad = 1, escala = 1 } = {}) {
    if (opacidad <= 0 || escala <= 0) return;
    ctx.save(); ctx.globalAlpha = opacidad; ctx.translate(x, y); ctx.scale(escala, escala);
    ctx.font = `800 ${tam}px ${TEXTO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(texto).width + tam * 1.1, h = tam * 1.7;
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    redondo(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = f; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.fillStyle = color; ctx.fillText(texto, 0, 2);
    ctx.restore();
  }
  // Barra de comparación horizontal con nombre encima; `valor` 0-1.
  function barra(ctx, x, y, w, h, valor, color, nombre, { opacidad = 1, texto = '#EAF6FF' } = {}) {
    if (opacidad <= 0) return;
    ctx.save(); ctx.globalAlpha = opacidad;
    redondo(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
    if (valor > 0) { redondo(ctx, x, y, Math.max(h, w * clamp(valor)), h, h / 2); ctx.fillStyle = color; ctx.fill(); }
    ctx.restore();
    if (nombre) rotulo(ctx, nombre, x + 4, y - 34, { color: texto, tam: 34, opacidad });
  }

  const listo = Promise.all(['40px "Space Mono"', '40px Anton', '800 40px Montserrat', '900 40px Montserrat']
    .map(f => document.fonts.load(f).catch(() => null)));

  return { W, H, TAU, clamp, lerp, suave, sale, rebote, prog, hash, azar, latido, alfa, mezcla, fondo, halo, rayos, motas, acabado, camara,
           curva, extremidad, enRuta, ruta, trazo, redondo, rotulo, pastilla, barra, MONO, TITULAR, TEXTO, listo };
})();
