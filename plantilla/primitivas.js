// Primitivas procedurales en canvas: todo es función pura de (escena, t) con semilla fija,
// así la vista previa y el render cuadro a cuadro son idénticos.
// Coordenadas del "mundo" en micrómetros (µm). La cámara define qué ancho del mundo cabe en 1080 px.
(() => {
  const W = 1080, H = 1920;
  // Pantalla en tres franjas, todo centrado en el eje real (x=540):
  //   textos grandes 260-560 · dibujo 560-1180 (centro de cámara) · subtítulos 1210-1440 sobre franja oscura.
  const CX = 540, CY = 860;
  const ZONA = { x0: 70, x1: 940, y0: 260, y1: 1190 };

  // ---------- utilidades ----------
  const rng = semilla => () => {        // mulberry32
    semilla |= 0; semilla = semilla + 0x6D2B79F5 | 0;
    let r = Math.imul(semilla ^ semilla >>> 15, 1 | semilla);
    r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const suave = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const mezcla = (a, b, k) => a + (b - a) * k;
  const aparecer = (c, t) => {          // opacidad por desde/hasta con fundido de 0.5 s
    const d = c.desde ?? 0, h = c.hasta ?? Infinity;
    return suave((t - d) / 0.5) * (1 - suave((t - h) / 0.5));
  };
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  };
  // Mezcla un color hex con otro (k = 0..1 hacia `otro`): da variantes más claras u oscuras de un mismo color.
  const mezclaHex = (hex, otro, k) => {
    const a = parseInt(hex.slice(1), 16), b = parseInt(otro.slice(1), 16), m = (s) => Math.round(mezcla(a >> s & 255, b >> s & 255, k));
    return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
  };
  const cache = new WeakMap();
  const memo = (obj, fn) => { if (!cache.has(obj)) cache.set(obj, fn()); return cache.get(obj); };

  // ---------- cámara ----------
  // camara: [{t, x, y, ancho}] — interpola con aceleración suave; el zoom va en escala logarítmica.
  function camara(claves, t) {
    if (!claves || !claves.length) return { x: 0, y: 0, ancho: 1000 };
    if (t <= claves[0].t) return claves[0];
    for (let i = 0; i < claves.length - 1; i++) {
      const a = claves[i], b = claves[i + 1];
      if (t < b.t) {
        const k = suave((t - a.t) / (b.t - a.t));
        return { x: mezcla(a.x, b.x, k), y: mezcla(a.y, b.y, k),
                 ancho: Math.exp(mezcla(Math.log(a.ancho), Math.log(b.ancho), k)) };
      }
    }
    return claves[claves.length - 1];
  }
  const vista = cam => {
    const k = W / cam.ancho;
    return { k, x: wx => CX + (wx - cam.x) * k, y: wy => CY + (wy - cam.y) * k,
             dentro: (wx, wy, r) => { const sx = CX + (wx - cam.x) * k, sy = CY + (wy - cam.y) * k, rr = r * k;
               return sx > -rr && sx < W + rr && sy > -rr && sy < H + rr; } };
  };

  // ---------- fondo, grano y viñeta ----------
  const TEMAS = {
    oscuro: ['#0f1a26', '#070b12'], mar: ['#0d2236', '#04080e'], piel: ['#a8705a', '#5a3428'],
    tejido: ['#141b2b', '#080b14'], claro: ['#f2eee6', '#d9d3c7'], neutro: ['#8b97a8', '#3f4957'], atardecer: ['#f7c08a', '#8a5a7a'], cielo: ['#d3ebf7', '#7fb4d3'], bosque: ['#143a40', '#05100f'], interior: ['#efe2cf', '#bfa78a'],
  };
  function fondo(ctx, f) {
    const [a, b] = TEMAS[f?.tema] || TEMAS.oscuro;
    const g = ctx.createRadialGradient(CX, CY, 100, CX, CY, 1300);
    g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  let granoImg = null;
  function grano(ctx, t, fuerza = 0.07) {
    if (!granoImg) {
      granoImg = document.createElement('canvas'); granoImg.width = granoImg.height = 256;
      const g = granoImg.getContext('2d'), d = g.createImageData(256, 256), r = rng(7);
      for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0);
    }
    const f = Math.floor(t * 12);       // el grano "hierve" a 12 fps, determinista
    ctx.save(); ctx.globalAlpha = fuerza; ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(granoImg, 'repeat');
    ctx.translate((f * 97) % 256, (f * 53) % 256); ctx.fillRect(-256, -256, W + 512, H + 512);
    ctx.restore();
    const v = ctx.createRadialGradient(CX, CY, 500, CX, CY, 1250);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  // ---------- barra de escala (abajo a la izquierda, dentro de la zona segura) ----------
  // unidad: cuánto mide 1 unidad del mundo (µm por defecto; "m" o "km" para escenas grandes).
  const UNIDADES = { 'µm': 1e-6, mm: 1e-3, m: 1, km: 1e3 };
  function barraEscala(ctx, v, unidad = 'µm') {
    const metros = UNIDADES[unidad] ?? 1e-6;
    const objetivo = 140 / v.k * metros; let p = Math.pow(10, Math.floor(Math.log10(objetivo))), L = p;
    for (const m of [1, 2, 5, 10]) if (m * p <= objetivo) L = m * p;
    const px = L / metros * v.k, r = x => +x.toPrecision(3);
    let txt = `${r(L * 1e9)} nm`;
    if (L >= 1e3) txt = `${r(L / 1e3)} km`; else if (L >= 1) txt = `${r(L)} m`; else if (L >= 1e-2) txt = `${r(L * 100)} cm`;
    else if (L >= 1e-3) txt = `${r(L * 1e3)} mm`; else if (L >= 1e-6) txt = `${r(L * 1e6)} µm`;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(ZONA.x0 + 10, 1172, px, 5);
    ctx.font = '26px "Space Mono", monospace'; ctx.fillText(txt, ZONA.x0 + 10, 1160);
    ctx.restore();
  }

  // ---------- primitivas del mundo ----------
  const P = {};

  // Campo de células: rejilla hexagonal con desorden. Opcional: aparicion "onda" desde el centro,
  // y "muerte" {x, y, r, desde, dur}: las células dentro del radio se hinchan y revientan en fragmentos.
  // Cada célula tiene su tamaño, su tono y su núcleo desplazado; el detalle (volumen, nucléolo, mitocondrias) aparece
  // al acercarse, así pocas células grandes se ven ricas y no hace falta una alfombra de miles.
  P.campoCelulas = (ctx, c, t, v) => {
    const celulas = memo(c, () => {
      const r = rng(c.semilla ?? 1), lista = [], paso = c.radio * 2.15, fila = paso * 0.87, nuc = c.colorNucleo || c.color;
      const tonos = [-.32, -.15, 0, .16, .3];
      for (let y = c.y, j = 0; y < c.y + c.alto; y += fila, j++)
        for (let x = c.x + (j % 2) * paso / 2; x < c.x + c.ancho; x += paso)
          if (r() < (c.densidad ?? 1)) {
            const k = tonos[Math.floor(r() * tonos.length)], otro = k < 0 ? '#000000' : '#ffffff';
            lista.push({ x: x + (r() - .5) * paso * .3, y: y + (r() - .5) * fila * .3, s: .65 + r() * .7, f: r() * 6.28, d: r(),
              col: mezclaHex(c.color, otro, Math.abs(k)), nuc: mezclaHex(nuc, otro, Math.abs(k) * .6),
              ox: (r() - .5) * .4, oy: (r() - .5) * .4, nr: .3 + r() * .14, ang: r() * 6.28 });
          }
      return lista;
    });
    const a = aparecer(c, t); if (a <= 0) return;
    const cxm = c.x + c.ancho / 2, cym = c.y + c.alto / 2, diag = Math.hypot(c.ancho, c.alto) / 2;
    const m = c.muerte;
    ctx.save(); ctx.lineWidth = Math.max(1, c.radio * v.k * 0.08);
    for (const e of celulas) {
      let rad = c.radio * e.s * (1 + 0.04 * Math.sin(t * 1.6 + e.f));
      if (!v.dentro(e.x, e.y, rad * 1.5)) continue;
      let alfa = a;
      if (c.aparicion === 'onda') alfa *= suave((t - (c.desde ?? 0) - Math.hypot(e.x - cxm, e.y - cym) / diag * 1.5) / 0.4);
      let roto = 0;
      if (m) {
        const dist = Math.hypot(e.x - m.x, e.y - m.y);
        if (dist < m.r) roto = clamp((t - m.desde - (dist / m.r) * (m.dur ?? 2) * 0.6 - e.d * 0.4) / 0.6);
      }
      if (alfa <= 0.01) continue;
      const sx = v.x(e.x), sy = v.y(e.y), sr = rad * v.k * (1 + roto * 0.35);
      if (roto >= 1) {                 // fragmentos que se dispersan y se apagan
        const r2 = rng(Math.floor(e.x * 7 + e.y * 13));
        ctx.fillStyle = rgba(e.col, alfa * 0.35);
        for (let i = 0; i < 4; i++) { const ang = r2() * 6.28, dd = sr * (1 + r2());
          ctx.beginPath(); ctx.arc(sx + Math.cos(ang) * dd, sy + Math.sin(ang) * dd, sr * 0.18, 0, 6.28); ctx.fill(); }
        continue;
      }
      const viva = 1 - roto * 0.6, det = clamp((sr - 22) / 40);          // det: cuánto detalle mostrar según el tamaño en pantalla
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.28);
      if (sr > 14) {                   // volumen: luz arriba a la izquierda
        const g = ctx.createRadialGradient(sx - sr * .3, sy - sr * .35, sr * .1, sx, sy, sr);
        g.addColorStop(0, rgba(mezclaHex(e.col, '#ffffff', .35), alfa * (.38 + roto * .1))); g.addColorStop(1, rgba(e.col, alfa * (.12 + roto * .1)));
        ctx.fillStyle = g;
      } else ctx.fillStyle = rgba(e.col, alfa * (0.16 + roto * 0.1));
      ctx.fill();
      ctx.strokeStyle = rgba(e.col, alfa * 0.8 * viva); ctx.stroke();
      if (det > 0 && roto < 1) {       // detalle de cerca: mitocondrias, retículo y brillo de membrana
        ctx.save(); ctx.globalAlpha = det * viva;
        ctx.strokeStyle = rgba('#ffffff', alfa * .35); ctx.lineWidth = Math.max(1, sr * .05);
        ctx.beginPath(); ctx.arc(sx, sy, sr * .88, 3.5, 4.5); ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const an = e.ang + i * 2.1 + t * .15, dd = sr * (.55 + .08 * Math.sin(t + i + e.f));
          ctx.fillStyle = rgba(mezclaHex(e.col, '#ffffff', .45), alfa * .75);
          ctx.beginPath(); ctx.ellipse(sx + Math.cos(an) * dd, sy + Math.sin(an) * dd, sr * .13, sr * .06, an, 0, 6.28); ctx.fill();
        }
        ctx.strokeStyle = rgba(e.col, alfa * .45); ctx.lineWidth = Math.max(1, sr * .025);
        for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(sx + e.ox * sr, sy + e.oy * sr, sr * (.5 + i * .09), e.ang + i, e.ang + i + 2.2); ctx.stroke(); }
        ctx.restore();
      }
      if (c.nucleo !== false) {
        const nx = sx + e.ox * sr, ny = sy + e.oy * sr, nr = sr * e.nr;
        ctx.beginPath(); ctx.arc(nx, ny, nr, 0, 6.28);
        ctx.fillStyle = rgba(e.nuc, alfa * 0.9 * (1 - roto)); ctx.fill();
        if (det > 0) { ctx.fillStyle = rgba(mezclaHex(e.nuc, '#000000', .35), alfa * det * (1 - roto));   // nucléolo
          ctx.beginPath(); ctx.arc(nx + nr * .2, ny - nr * .15, nr * .35, 0, 6.28); ctx.fill(); }
      }
    }
    ctx.restore();
  };

  // Estratos: líneas onduladas horizontales (dermis, capas de roca, agua...).
  P.estratos = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const r = memo(c, () => { const g = rng(c.semilla ?? 3); return Array.from({ length: c.lineas }, () => [g() * 6.28, g() * 6.28, .6 + g() * .8]); });
    ctx.save(); ctx.strokeStyle = rgba(c.color, a * 0.45); ctx.lineWidth = 2;
    r.forEach(([f1, f2, amp], i) => {
      const wy = c.y + (c.alto * (i + .5)) / c.lineas;
      ctx.beginPath();
      for (let sx = -20; sx <= W + 20; sx += 12) {
        const wx = (sx - v.x(0)) / v.k;
        const ond = c.onda * amp * (Math.sin(wx / c.onda / 9 + f1 + t * .25) + .5 * Math.sin(wx / c.onda / 4 + f2));
        const sy = v.y(wy + ond);
        sx === -20 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    });
    ctx.restore();
  };

  // Vaso: tubo por una polilínea con células que fluyen dentro.
  function largo(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function puntoEn(pts, s) {
    let L = largo(pts) * s;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (L <= d) { const k = L / d; return [mezcla(pts[i - 1][0], pts[i][0], k), mezcla(pts[i - 1][1], pts[i][1], k)]; }
      L -= d;
    }
    return pts[pts.length - 1];
  }
  P.vaso = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const camino = () => { ctx.beginPath(); c.puntos.forEach(([x, y], i) => i ? ctx.lineTo(v.x(x), v.y(y)) : ctx.moveTo(v.x(x), v.y(y))); };
    ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
    camino(); ctx.strokeStyle = rgba(c.color, a * .9); ctx.lineWidth = c.grosor * v.k; ctx.stroke();
    camino(); ctx.strokeStyle = rgba('#05070c', a * .85); ctx.lineWidth = c.grosor * v.k * .8; ctx.stroke();
    const L = largo(c.puntos), n = c.celulas ?? 30, rr = rng(c.semilla ?? 5);
    for (let i = 0; i < n; i++) {
      const off = rr(), lado = (rr() - .5) * c.grosor * .45;
      const s = ((i / n + off * .02 + t * (c.velocidad ?? 40) / L) % 1 + 1) % 1;
      const [x, y] = puntoEn(c.puntos, s);
      if (!v.dentro(x, y, c.grosor)) continue;
      ctx.beginPath(); ctx.arc(v.x(x), v.y(y + lado), c.grosor * .17 * v.k, 0, 6.28);
      ctx.fillStyle = rgba(c.colorCelulas || '#ff5fa2', a * .9); ctx.fill();
    }
    ctx.restore();
  };

  // Enjambre: n agentes que viajan de una zona a otra con trayectoria ondulante (glóbulos, hormigas, peces).
  P.enjambre = (ctx, c, t, v) => {
    const ag = memo(c, () => { const r = rng(c.semilla ?? 9), cir = z => { const an = r() * 6.28, d = Math.sqrt(r()); return [z.x + Math.cos(an) * d * z.r, z.y + Math.sin(an) * d * (z.ry ?? z.r)]; };
      return Array.from({ length: c.n }, () => ({ o: cir(c.origen), d: cir(c.destino), t0: r(), f: r() * 6.28, s: .8 + r() * .4 })); });
    const a = aparecer(c, t); if (a <= 0) return;
    const ini = c.desde ?? 0, dur = c.duracion ?? 4;
    ctx.save();
    for (const g of ag) {
      const k = suave((t - ini - g.t0 * dur * .5) / (dur * .6));
      if (k <= 0 && c.ocultarAntes) continue;
      const dx = g.d[0] - g.o[0], dy = g.d[1] - g.o[1], L = Math.hypot(dx, dy) || 1;
      const ond = Math.sin(k * 9 + g.f) * L * .06 * (1 - k);
      const x = g.o[0] + dx * k - dy / L * ond + Math.sin(t * 2 + g.f) * c.radio * .15;
      const y = g.o[1] + dy * k + dx / L * ond + Math.cos(t * 1.7 + g.f) * c.radio * .15;
      if (!v.dentro(x, y, c.radio * 2)) continue;
      const sx = v.x(x), sy = v.y(y), sr = c.radio * g.s * v.k;
      const halo = ctx.createRadialGradient(sx, sy, sr * .3, sx, sy, sr * 2);
      halo.addColorStop(0, rgba(c.color, a * .35)); halo.addColorStop(1, rgba(c.color, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(sx, sy, sr * 2, 0, 6.28); ctx.fill();
      ctx.fillStyle = rgba(c.color, a * .55); ctx.beginPath(); ctx.ellipse(sx, sy, sr, sr * .85, g.f, 0, 6.28); ctx.fill();
      ctx.fillStyle = rgba(c.colorNucleo || '#ffffff', a * .7);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx + Math.cos(g.f + i * 2.1) * sr * .35, sy + Math.sin(g.f + i * 2.1) * sr * .35, sr * .22, 0, 6.28); ctx.fill(); }
    }
    ctx.restore();
  };

  // Partículas que se difunden desde un punto (veneno, moléculas, gas).
  P.particulas = (ctx, c, t, v) => {
    const ps = memo(c, () => { const r = rng(c.semilla ?? 11); return Array.from({ length: c.n }, () => ({ an: r() * 6.28, d: Math.sqrt(r()), f: r() * 6.28 })); });
    const a = aparecer(c, t); if (a <= 0) return;
    const ext = c.r * (0.15 + 0.85 * suave((t - (c.desde ?? 0)) / (c.duracion ?? 3)));
    ctx.save(); ctx.fillStyle = rgba(c.color, a * .9);
    for (const p of ps) {
      const x = c.x + Math.cos(p.an) * p.d * ext + Math.sin(t * 3 + p.f) * c.tam;
      const y = c.y + Math.sin(p.an) * p.d * ext + Math.cos(t * 2.6 + p.f) * c.tam;
      if (!v.dentro(x, y, c.tam)) continue;
      ctx.beginPath(); ctx.arc(v.x(x), v.y(y), Math.max(1.5, c.tam * v.k), 0, 6.28); ctx.fill();
    }
    ctx.restore();
  };

  // Forma simple con brillo que crece al aparecer (ronchas, núcleos, planetas, gotas).
  P.forma = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const k = c.crece ? suave((t - (c.desde ?? 0)) / 1.2) : 1;
    const sx = v.x(c.x), sy = v.y(c.y), rx = c.rx * v.k * k, ry = (c.ry ?? c.rx) * v.k * k;
    ctx.save();
    if (c.brillo) { const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rx * 1.8);
      g.addColorStop(0, rgba(c.color, a * .45)); g.addColorStop(1, rgba(c.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rx * 1.8, 0, 6.28); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(.1, rx), Math.max(.1, ry), 0, 0, 6.28);
    ctx.fillStyle = rgba(c.color, a * (c.opacidad ?? .9)); ctx.fill();
    ctx.restore();
  };

  // ---------- capas de pantalla (no se mueven con la cámara) ----------
  // Zonas de pantalla ocupadas en el cuadro actual: los textos grandes reservan su lugar desde un poco antes
  // de aparecer (así nada salta al entrar) y las etiquetas buscan un hueco libre en vez de encimarse.
  let ocupado = [];
  const choca = (r) => ocupado.some(o => r.x0 < o.x1 && r.x1 > o.x0 && r.y0 < o.y1 && r.y1 > o.y0);
  const reservada = (c, t) => t >= (c.desde ?? 0) - .6 && t < (c.hasta ?? Infinity) + .5;
  // Etiqueta con línea guía hacia un punto del mundo.
  P.etiqueta = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const k = suave((t - (c.desde ?? 0)) / 0.6);
    const px = v.x(c.x), py = v.y(c.y);
    // Si lo señalado quedó fuera del área del dibujo (la cámara se movió), la etiqueta no se muestra:
    // su línea cruzaría los subtítulos o apuntaría a nada.
    if (px < ZONA.x0 || px > ZONA.x1 || py < ZONA.y0 || py > ZONA.y1) return;
    let tx = clamp(px + (c.dx ?? 160), ZONA.x0 + 10, ZONA.x1 - 10);
    let ty = clamp(py + (c.dy ?? -120), ZONA.y0 + 60, ZONA.y1 - 30);
    ctx.save(); ctx.font = '900 44px Montserrat, sans-serif'; ctx.textBaseline = 'bottom';
    const ancho = ctx.measureText(c.texto.toUpperCase()).width, derecha = tx + ancho > ZONA.x1;
    if (derecha) tx = clamp(tx, ZONA.x0 + ancho, ZONA.x1);   // anclado a la derecha, el texto no debe salirse por la izquierda
    const caja = y => ({ x0: derecha ? tx - ancho : tx, x1: derecha ? tx : tx + ancho, y0: y - 58, y1: y });
    // Busca la posición libre más cercana (abajo y arriba, en pasos de 60 px) dentro de la zona segura.
    for (let paso = 0, base = ty; paso < 16 && choca(caja(ty)); paso++) {
      const d = 60 * Math.ceil((paso + 1) / 2) * (paso % 2 ? -1 : 1);
      ty = clamp(base + d, ZONA.y0 + 60, ZONA.y1 - 30);
    }
    ocupado.push(caja(ty));
    ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, 7, 0, 6.28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(mezcla(px, tx, k), mezcla(py, ty, k)); ctx.stroke();
    ctx.textAlign = derecha ? 'right' : 'left';
    ctx.globalAlpha = a * k; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 12;
    ctx.fillStyle = c.color || '#fff'; ctx.fillText(c.texto.toUpperCase(), tx, ty - 8);
    ctx.restore();
  };

  // Número gigante arriba con subtítulo pequeño; opcional cuenta de "de" a "a".
  P.numero = (ctx, c, t) => {
    if (reservada(c, t)) ocupado.push({ x0: ZONA.x0, x1: ZONA.x1, y0: 290, y1: c.sub ? 560 : 500 });
    const a = aparecer(c, t); if (a <= 0) return;
    let txt = c.texto;
    if (c.contar) { const k = suave((t - (c.desde ?? 0)) / (c.contar.dur ?? 1.2));
      txt = Math.round(mezcla(c.contar.de, c.contar.a, k)).toLocaleString('es') + (c.sufijo || ''); }
    const y = 300 + (1 - suave((t - (c.desde ?? 0)) / 0.5)) * 30;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20;
    ctx.font = '170px Anton, Montserrat, sans-serif'; ctx.fillStyle = c.color || '#ffffff'; ctx.textBaseline = 'top';
    ctx.fillText(txt, CX, y);
    if (c.sub) { ctx.font = '700 44px "Space Mono", monospace'; ctx.fillStyle = '#fff'; ctx.fillText(c.sub, CX, y + 190); }
    ctx.restore();
  };

  // Cita del estudio (credibilidad): revista · año, autores.
  P.cita = (ctx, c, t) => {
    if (reservada(c, t)) ocupado.push({ x0: ZONA.x0, x1: ZONA.x1, y0: 280, y1: 400 });
    const a = aparecer(c, t); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.font = '700 46px "Space Mono", monospace'; ctx.fillText(c.texto, CX, 330);
    if (c.sub) { ctx.font = '28px "Space Mono", monospace'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText(c.sub, CX, 380); }
    ctx.restore();
  };

  // ---------- figuras hechas de piezas (dibujadas en código, con movimiento propio) ----------
  // Cada modelo dibuja en coordenadas locales: la figura mide ~1 de largo, centrada en 0,0.
  // c1 = color principal, c2 = color secundario. t = tiempo para su movimiento propio.
  const ojo = (ctx, x, y, r) => {
    ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#1a1208'; ctx.beginPath(); ctx.arc(x + r * .2, y, r * .55, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + r * .35, y - r * .25, r * .18, 0, 6.28); ctx.fill();
  };
  const elipse = (ctx, x, y, rx, ry, rot, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, 6.28); ctx.fill(); };
  const linea = (ctx, pts, color, ancho) => { ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  // Detalle 0..1 de la figura que se está dibujando: crece cuando ocupa mucha pantalla (la cámara se acercó). Los modelos que
  // lo leen añaden piezas finas (escamas, crestas, fibras, vasos) que de lejos serían ruido.
  let detalle = 0;
  const MODELOS = {
    pez(ctx, t, c1, c2) {
      const w = Math.sin(t * 6) * .12;
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-.38, 0); ctx.lineTo(-.6, -.2 + w); ctx.lineTo(-.55, 0); ctx.lineTo(-.6, .2 + w); ctx.closePath(); ctx.fill();
      elipse(ctx, 0, 0, .42, .2, 0, c1);
      elipse(ctx, .02, .07, .3, .1, 0, 'rgba(255,255,255,.12)');
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-.05, -.18); ctx.quadraticCurveTo(-.15, -.33, -.25, -.16); ctx.fill();
      ctx.beginPath(); ctx.moveTo(.0, .1); ctx.quadraticCurveTo(-.08, .2 + w * .5, -.16, .12); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(-.28 + i * .07, -.02, .01, 0, 6.28); ctx.fill(); }
      if (detalle > 0) {                                                   // escamas dentro del cuerpo
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, .42, .2, 0, 0, 6.28); ctx.clip();
        ctx.globalAlpha = detalle; ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = .007;
        for (let f = -3; f <= 3; f++) for (let k = 0; k < 11; k++) { ctx.beginPath(); ctx.arc(-.34 + k * .068 + (f & 1) * .034, f * .055, .04, -1.3, 1.3); ctx.stroke(); }
        ctx.restore();
      }
      ojo(ctx, .26, -.05, .055);
    },
    hormiga(ctx, t, c1, c2) {
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
        const f = Math.sin(t * 10 + i * 2 + (s > 0 ? 3.14 : 0)) * .06, x0 = -.02 + (i - 1) * .06;
        linea(ctx, [[x0, 0], [x0 + (i - 1) * .12 + f, s * .2], [x0 + (i - 1) * .2 + f, s * .3]], c2, .02);
      }
      elipse(ctx, -.3, 0, .2, .13, 0, c1); elipse(ctx, -.02, 0, .1, .06, 0, c1); elipse(ctx, .2, 0, .1, .09, 0, c1);
      for (const s of [-1, 1]) linea(ctx, [[.27, s * .03], [.36, s * .12 + Math.sin(t * 3) * .02], [.45, s * .1]], c2, .015);
      elipse(ctx, -.35, -.04, .09, .05, 0, 'rgba(255,255,255,.12)'); elipse(ctx, .24, -.02, .02, .02, 0, '#1a1208');
    },
    bacteria(ctx, t, c1, c2) {
      for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 20; i++) { const s = i / 20; pts.push([-.35 - s * .35, (k - 1) * .05 + Math.sin(s * 9 - t * 8 + k) * .04 * s]); } linea(ctx, pts, c2, .012); }
      ctx.fillStyle = c1; ctx.beginPath(); ctx.roundRect(-.36, -.14, .72, .28, .14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = .015; ctx.stroke();
      const r = rng(4); ctx.fillStyle = c2; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-.25 + r() * .5, -.07 + r() * .14, .018, 0, 6.28); ctx.fill(); }
    },
    virus(ctx, t, c1, c2) {
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + t * .3, l = .44 + Math.sin(t * 3 + i) * .01;
        linea(ctx, [[Math.cos(a) * .3, Math.sin(a) * .3], [Math.cos(a) * l, Math.sin(a) * l]], c2, .02);
        elipse(ctx, Math.cos(a) * l, Math.sin(a) * l, .04, .04, 0, c2); }
      elipse(ctx, 0, 0, .32, .32, 0, c1); elipse(ctx, -.08, -.08, .16, .16, 0, 'rgba(255,255,255,.12)');
    },
    neurona(ctx, t, c1, c2) {
      const r = rng(21);
      for (let i = 0; i < 6; i++) { const a = 1.2 + i * .75 + r() * .3; let x = 0, y = 0; const pts = [[0, 0]];
        for (let s = 0; s < 4; s++) { x += Math.cos(a + (r() - .5)) * .08; y += Math.sin(a + (r() - .5)) * .08; pts.push([x - .25, y]); }
        pts[0] = [-.25, 0]; linea(ctx, pts, c1, .02); }
      linea(ctx, [[-.25, 0], [.55, .02]], c1, .025);
      for (let i = 0; i < 4; i++) elipse(ctx, -.05 + i * .16, .012, .06, .028, 0, c2);
      for (const s of [-1, 0, 1]) linea(ctx, [[.55, .02], [.65, s * .08]], c1, .015);
      elipse(ctx, -.25, 0, .1, .09, 0, c1); elipse(ctx, -.25, 0, .04, .04, 0, c2);
      const p = (t * .5) % 1; const g = ctx.createRadialGradient(-.25 + p * .8, .01, 0, -.25 + p * .8, .01, .06);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-.25 + p * .8, .01, .06, 0, 6.28); ctx.fill();
    },
    celula(ctx, t, c1, c2) {
      ctx.fillStyle = rgbaDesde(c1, .25); ctx.strokeStyle = c1; ctx.lineWidth = .02; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.28, rr = .45 + Math.sin(a * 3 + t * 1.5) * .015 + Math.sin(a * 5 - t) * .01; i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      elipse(ctx, .05, -.03, .16, .14, 0, c2); elipse(ctx, .08, -.05, .05, .05, 0, rgbaDesde('#ffffff', .4));
      const r = rng(8); for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = .22 + r() * .12; elipse(ctx, Math.cos(a) * d, Math.sin(a) * d, .06, .025, a + t * .2, rgbaDesde(c2, .8)); }
      if (detalle > 0) {                                                   // retículo, mitocondrias con crestas y nucléolo
        ctx.save(); ctx.globalAlpha = detalle; ctx.strokeStyle = rgbaDesde(c2, .45); ctx.lineWidth = .012;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(.05, -.03, .2 + i * .045, .6 + i * .7, 2.4 + i * .7); ctx.stroke(); }
        const q = rng(12);
        for (let i = 0; i < 4; i++) { const a = q() * 6.28, d = .3 + q() * .07;
          ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a + t * .1);
          elipse(ctx, 0, 0, .07, .032, 0, rgbaDesde(c1, .85)); linea(ctx, [[-.045, 0], [-.025, .014], [-.005, -.014], [.015, .014], [.04, 0]], 'rgba(255,255,255,.5)', .006); ctx.restore(); }
        elipse(ctx, .07, -.02, .04, .04, 0, 'rgba(0,0,0,.35)');
        ctx.restore();
      }
    },
    persona(ctx, t, c1, c2) {
      const res = Math.sin(t * 1.8) * .01;
      ctx.fillStyle = c1; ctx.beginPath(); ctx.roundRect(-.17, -.12 + res, .34, .5, .14); ctx.fill();
      elipse(ctx, 0, -.27 + res, .12, .13, 0, c2);
      for (const s of [-1, 1]) linea(ctx, [[s * .15, -.05 + res], [s * .22, .14 + Math.sin(t * 2) * .01 * s]], c1, .07);
      ctx.fillStyle = c1; ctx.fillRect(-.12, .32, .09, .17); ctx.fillRect(.03, .32, .09, .17);
    },
    ave(ctx, t, c1, c2) {
      const al = Math.sin(t * 9) * .25;
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-.05, -.02); ctx.quadraticCurveTo(-.1, -.3 - al, -.3, -.35 - al); ctx.quadraticCurveTo(-.2, -.1, -.2, 0); ctx.fill();
      elipse(ctx, 0, 0, .3, .13, 0, c1);
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-.28, 0); ctx.lineTo(-.48, -.08); ctx.lineTo(-.46, .06); ctx.fill();
      elipse(ctx, .27, -.07, .1, .09, 0, c1);
      ctx.fillStyle = '#f2a33a'; ctx.beginPath(); ctx.moveTo(.35, -.09); ctx.lineTo(.47, -.06); ctx.lineTo(.35, -.03); ctx.fill();
      ojo(ctx, .3, -.1, .03);
    },
    planta(ctx, t, c1, c2) {
      const sw = Math.sin(t * 1.2) * .03;
      linea(ctx, [[0, .5], [sw * .5, .1], [sw, -.4]], c2, .03);
      for (let i = 0; i < 5; i++) { const y = .35 - i * .17, s = i % 2 ? 1 : -1, x = sw * (1 - y);
        ctx.save(); ctx.translate(x, y); ctx.rotate(s * (.6 + Math.sin(t * 1.5 + i) * .08)); elipse(ctx, 0, -.1, .05, .12, 0, c1); ctx.restore(); }
    },
    gota(ctx, t, c1) {
      const s = 1 + Math.sin(t * 3) * .02; ctx.save(); ctx.scale(1 / s, s);
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, -.45); ctx.bezierCurveTo(.1, -.25, .3, -.05, .3, .15); ctx.arc(0, .15, .3, 0, 3.14); ctx.bezierCurveTo(-.3, -.05, -.1, -.25, 0, -.45); ctx.fill();
      elipse(ctx, -.1, .1, .05, .1, .3, 'rgba(255,255,255,.4)'); ctx.restore();
    },
    moneda(ctx, t, c1, c2) {
      const g = Math.cos(t * 2.2); ctx.save(); ctx.scale(Math.max(.08, Math.abs(g)), 1);
      elipse(ctx, 0, 0, .4, .4, 0, c2); elipse(ctx, 0, 0, .34, .34, 0, c1);
      if (g > 0) { ctx.scale(.01, .01); ctx.fillStyle = c2; ctx.font = '900 46px Montserrat'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 3); }
      ctx.restore();
    },
    engranaje(ctx, t, c1, c2) {
      ctx.save(); ctx.rotate(t * .8); ctx.fillStyle = c1; ctx.beginPath();
      for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28, r = i % 2 ? .38 : .46; ctx.lineTo(Math.cos(a - .1) * r, Math.sin(a - .1) * r); ctx.lineTo(Math.cos(a + .1) * r, Math.sin(a + .1) * r); }
      ctx.closePath(); ctx.fill(); elipse(ctx, 0, 0, .14, .14, 0, c2); ctx.restore();
    },
    planeta(ctx, t, c1, c2) {
      const g = ctx.createRadialGradient(-.15, -.15, .05, 0, 0, .45); g.addColorStop(0, c1); g.addColorStop(1, rgbaDesde(c2, 1));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, .42, 0, 6.28); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, .42, 0, 6.28); ctx.clip();
      const r = rng(31); ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 6; i++) elipse(ctx, ((r() - .5) + t * .03) % 1 * .9, (r() - .5) * .7, .12 + r() * .1, .05, 0, 'rgba(255,255,255,.12)');
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.arc(.18, .1, .48, 0, 6.28); ctx.fill(); ctx.restore();
    },
    sol(ctx, t, c1, c2) {
      const g = ctx.createRadialGradient(0, 0, .1, 0, 0, .55); g.addColorStop(0, rgbaDesde(c1, .9)); g.addColorStop(1, rgbaDesde(c1, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, .55, 0, 6.28); ctx.fill();
      elipse(ctx, 0, 0, .3 + Math.sin(t * 2) * .005, .3, 0, c2);
    },
    corazon(ctx, t, c1, c2) {
      const p = 1 + Math.max(0, Math.sin(t * 7)) ** 8 * .08; ctx.save(); ctx.scale(p, p); ctx.fillStyle = c1; ctx.beginPath();
      ctx.moveTo(0, .38); ctx.bezierCurveTo(-.5, 0, -.42, -.42, 0, -.2); ctx.bezierCurveTo(.42, -.42, .5, 0, 0, .38); ctx.fill();
      elipse(ctx, -.15, -.17, .08, .05, -.5, 'rgba(255,255,255,.25)'); linea(ctx, [[.05, -.26], [.1, -.42]], c2, .06);
      if (detalle > 0) {                                                   // arterias coronarias y aorta con su rama
        ctx.save(); ctx.globalAlpha = detalle;
        ctx.globalAlpha = detalle * .55;
        linea(ctx, [[.0, -.2], [-.12, -.08], [-.2, .08], [-.12, .26]], c2, .012); linea(ctx, [[-.12, -.08], [-.26, -.06]], c2, .008);
        linea(ctx, [[.0, -.2], [.16, -.04], [.22, .12]], c2, .012); linea(ctx, [[.16, -.04], [.3, -.1]], c2, .008);
        ctx.restore();
      }
      ctx.restore();
    },
    llama(ctx, t, c1, c2) {
      for (const [k, col] of [[1, c1], [.6, c2]]) { const f = Math.sin(t * 9) * .03 * k, f2 = Math.sin(t * 13) * .02;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, .35 * k);
        ctx.bezierCurveTo(-.3 * k, .3 * k, -.25 * k, -.1, f - .02, -.45 * k + f2); ctx.bezierCurveTo(.25 * k, -.1, .3 * k, .3 * k, 0, .35 * k); ctx.fill(); }
    },
    chip(ctx, t, c1, c2) {
      for (let i = 0; i < 5; i++) for (const s of [-1, 1]) { const o = -.2 + i * .1, on = ((t * 2 + i) % 5) < 1;
        linea(ctx, [[o, s * .3], [o, s * .42]], on ? c2 : 'rgba(255,255,255,.5)', .03); linea(ctx, [[s * .3, o], [s * .42, o]], 'rgba(255,255,255,.5)', .03); }
      ctx.fillStyle = c1; ctx.beginPath(); ctx.roundRect(-.3, -.3, .6, .6, .05); ctx.fill();
      ctx.strokeStyle = c2; ctx.lineWidth = .015; ctx.strokeRect(-.18, -.18, .36, .36);
    },
    bateria(ctx, t, c1, c2, extra) {
      const nivel = clamp(extra?.nivel ?? (.5 + Math.sin(t) * .3));
      ctx.strokeStyle = '#fff'; ctx.lineWidth = .03; ctx.beginPath(); ctx.roundRect(-.2, -.4, .4, .8, .05); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(-.07, -.46, .14, .06);
      ctx.fillStyle = nivel < .25 ? '#ff5a4f' : c1; ctx.fillRect(-.16, .36 - .72 * nivel, .32, .72 * nivel);
    },
  };
  // ---- órganos y animales frecuentes en los temas de biología y cuerpo ----
  Object.assign(MODELOS, {
    estomago(ctx, t, c1, c2) {
      const p = 1 + Math.sin(t * 1.6) * .02;
      linea(ctx, [[-.12, -.5], [-.1, -.32]], c2, .09);                       // esófago
      ctx.save(); ctx.scale(p, p); ctx.fillStyle = c1; ctx.beginPath();
      ctx.moveTo(-.16, -.34); ctx.bezierCurveTo(-.45, -.3, -.5, .1, -.3, .3);
      ctx.bezierCurveTo(-.1, .48, .3, .42, .42, .22); ctx.bezierCurveTo(.5, .08, .38, -.02, .26, .05);
      ctx.bezierCurveTo(.12, .14, -.02, .1, -.02, -.05); ctx.bezierCurveTo(-.02, -.2, -.04, -.32, -.16, -.34); ctx.fill();
      ctx.clip(); ctx.strokeStyle = rgba('#ffffff', .22); ctx.lineWidth = .015;   // pliegues, dentro de la silueta
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-.12, .1, .14 + i * .06, 1.2, 2.6); ctx.stroke(); }
      ctx.restore(); linea(ctx, [[.4, .2], [.5, .3], [.48, .42]], c2, .07);      // duodeno
    },
    pulmon(ctx, t, c1, c2) {
      const r = 1 + Math.sin(t * 1.4) * .05;
      linea(ctx, [[0, -.5], [0, -.2]], c2, .06);
      for (const s of [-1, 1]) {
        ctx.save(); ctx.scale(r, r); ctx.fillStyle = c1; ctx.beginPath();
        ctx.moveTo(s * .04, -.28); ctx.bezierCurveTo(s * .38, -.38, s * .46, .2, s * .36, .42);
        ctx.bezierCurveTo(s * .2, .48, s * .06, .36, s * .05, .1); ctx.closePath(); ctx.fill(); ctx.restore();
        linea(ctx, [[0, -.2], [s * .12, -.08], [s * .2, .05]], c2, .035);
        linea(ctx, [[s * .12, -.08], [s * .24, -.12]], c2, .022); linea(ctx, [[s * .2, .05], [s * .28, .2]], c2, .022);
      }
    },
    cerebro(ctx, t, c1, c2) {
      elipse(ctx, .2, .24, .15, .09, .3, c2);                                    // cerebelo
      ctx.save(); ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, 0, .44, .32, 0, 0, 6.28); ctx.fill(); ctx.clip();
      // circunvoluciones al estilo plano: lóbulos redondeados superpuestos, cada uno con su contorno
      const r = rng(41), lob = [];
      for (let y = -.26; y <= .27; y += .1) for (let x = -.4; x <= .41; x += .11)
        if ((x / .44) ** 2 + (y / .32) ** 2 < 1.15) lob.push([x + (r() - .5) * .05 + (Math.round(y * 10) % 2) * .05, y + (r() - .5) * .04, .075 + r() * .03]);
      ctx.strokeStyle = rgba('#8a4a55', .55); ctx.lineWidth = .016;
      for (const [x, y, rr] of lob) { ctx.fillStyle = rgba(c1, 1); ctx.beginPath(); ctx.ellipse(x, y, rr * 1.15, rr, (x + y) * 2, 0, 6.28); ctx.fill(); ctx.stroke(); }
      ctx.lineWidth = .026; ctx.strokeStyle = rgba('#7a3a45', .65);             // cisura lateral
      ctx.beginPath(); ctx.moveTo(-.22, .14); ctx.bezierCurveTo(-.04, .04, .14, .08, .3, -.02); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = rgba('#8a4a55', .6); ctx.lineWidth = .02; ctx.beginPath(); ctx.ellipse(0, 0, .44, .32, 0, 0, 6.28); ctx.stroke();
      const g = (t * .7) % 1, gx = -.35 + g * .7;                                 // chispa de actividad
      const gr = ctx.createRadialGradient(gx, -.05, 0, gx, -.05, .1); gr.addColorStop(0, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gx, -.05, .1, 0, 6.28); ctx.fill();
    },
    ojo(ctx, t, c1, c2) {
      const parp = Math.max(.08, 1 - Math.max(0, Math.sin(t * 1.3)) ** 40);
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, .46, .26 * parp, 0, 0, 6.28); ctx.clip();
      elipse(ctx, 0, 0, .46, .3, 0, '#f4ecd8');
      const mx = Math.sin(t * .8) * .08;
      elipse(ctx, mx, 0, .2, .2, 0, c1); elipse(ctx, mx, 0, .09, .09, 0, '#0b0b0b'); elipse(ctx, mx + .05, -.05, .035, .035, 0, '#ffffff');
      if (detalle > 0) {                                                   // fibras del iris, anillo y vasos en la esclerótica
        ctx.save(); ctx.globalAlpha = detalle; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = .006;
        for (let i = 0; i < 30; i++) { const a = i / 30 * 6.28; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a) * .1, Math.sin(a) * .1); ctx.lineTo(mx + Math.cos(a) * .19, Math.sin(a) * .19); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = .016; ctx.beginPath(); ctx.arc(mx, 0, .2, 0, 6.28); ctx.stroke();
        for (const s of [-1, 1]) { linea(ctx, [[s * .45, .02], [s * .36, .05], [s * .3, .03]], 'rgba(200,60,60,.4)', .007); linea(ctx, [[s * .44, -.06], [s * .35, -.09]], 'rgba(200,60,60,.35)', .006); }
        ctx.restore();
      }
      ctx.restore(); ctx.strokeStyle = c2; ctx.lineWidth = .03; ctx.beginPath(); ctx.ellipse(0, 0, .46, .26 * parp, 0, 0, 6.28); ctx.stroke();
    },
    hueso(ctx, t, c1, c2) {
      ctx.fillStyle = c1; ctx.beginPath(); ctx.roundRect(-.34, -.06, .68, .12, .05); ctx.fill();
      for (const s of [-1, 1]) for (const u of [-1, 1]) elipse(ctx, s * .38, u * .07, .1, .1, 0, c1);
      ctx.strokeStyle = rgba(c2, .6); ctx.lineWidth = .012; ctx.beginPath(); ctx.moveTo(-.28, 0); ctx.lineTo(.28, 0); ctx.stroke();
    },
    rata(ctx, t, c1, c2) {
      const cola = Math.sin(t * 3) * .05;
      ctx.strokeStyle = c2; ctx.lineWidth = .025; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-.32, .05);
      ctx.bezierCurveTo(-.5, .1 + cola, -.55, -.1 - cola, -.7, -.02); ctx.stroke();
      elipse(ctx, -.06, 0, .3, .17, 0, c1);
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(.16, -.12); ctx.quadraticCurveTo(.4, -.08, .44, .03); ctx.quadraticCurveTo(.3, .1, .14, .1); ctx.fill();
      elipse(ctx, .14, -.15, .07, .07, 0, c2); elipse(ctx, .14, -.15, .04, .04, 0, '#f2b8b0');
      elipse(ctx, .44, .03, .025, .025, 0, '#f2b8b0'); ojo(ctx, .3, -.04, .03);
      for (const x of [-.2, .08]) linea(ctx, [[x, .14], [x + .03 * Math.sin(t * 8), .22]], c2, .03);
    },
    gato(ctx, t, c1, c2) {
      const cola = Math.sin(t * 2) * .12;
      ctx.strokeStyle = c1; ctx.lineWidth = .06; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-.32, .05);
      ctx.quadraticCurveTo(-.55, 0, -.5 + cola, -.32); ctx.stroke();
      elipse(ctx, -.08, .06, .3, .17, 0, c1);
      for (const x of [-.28, -.12, .06, .16]) linea(ctx, [[x, .16], [x, .34]], c1, .06);
      elipse(ctx, .26, -.14, .16, .14, 0, c1);
      for (const s of [-1, 1]) { ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(.26 + s * .13, -.2); ctx.lineTo(.26 + s * .12, -.36); ctx.lineTo(.26 + s * .02, -.25); ctx.fill(); }
      ojo(ctx, .2, -.16, .03); ojo(ctx, .33, -.16, .03);
      elipse(ctx, .27, -.08, .02, .015, 0, c2);
      for (const s of [-1, 1]) linea(ctx, [[.27, -.07], [.27 + s * .18, -.05 + s * .02]], rgba('#ffffff', .6), .006);
    },
    pulpo(ctx, t, c1, c2) {
      for (let i = 0; i < 8; i++) { const x0 = -.21 + i * .06, pts = [];
        for (let k = 0; k <= 12; k++) { const s = k / 12; pts.push([x0 + (x0 * .8) * s + Math.sin(t * 2 + i + s * 5) * .06 * s, .05 + s * .45]); }
        linea(ctx, pts, c1, .06 * (1 - .5)); }
      ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(0, -.15, .26, .3, 0, 0, 6.28); ctx.fill();
      for (let i = 0; i < 5; i++) elipse(ctx, -.12 + i * .06, -.3 + (i % 2) * .08, .025, .025, 0, c2);
      ojo(ctx, -.1, .02, .045); ojo(ctx, .1, .02, .045);
    },
  });
  const rgbaDesde = (hex, a) => rgba(hex, a);

  // figura {modelo, x, y, tam, angulo?, color?, color2?, espejo?, ruta?:[[x,y]...], desde, duracionRuta?, nivel?}
  // Si trae ruta, la figura viaja por ella (mirando hacia donde va). Aparece con un pequeño "pop".
  const COLORES_MODELO = { pez: ['#8a6a4f', '#5e4532'], hormiga: ['#a5452b', '#6e2a19'], bacteria: ['#6fd38b', '#2f7a46'],
    virus: ['#ff6a8e', '#ffc2d1'], neurona: ['#ffd36b', '#ffefc0'], celula: ['#7c8cff', '#c9a3ff'], persona: ['#4f6d8f', '#e7b49a'],
    ave: ['#c56b3a', '#8a4524'], planta: ['#5fbf5a', '#3c7a2f'], gota: ['#4fb3ff'], moneda: ['#f2c14e', '#b8862a'],
    engranaje: ['#9aa7b8', '#1b2a3d'], planeta: ['#4f9cff', '#0b2a55'], sol: ['#ffb347', '#fff1c1'], corazon: ['#e2384d', '#8c1d2c'],
    llama: ['#ff7a1a', '#ffd23f'], chip: ['#24303f', '#5dff9c'], bateria: ['#5dff9c'],
    estomago: ['#e08a8a', '#b65c5c'], pulmon: ['#ef9aa6', '#c25a6a'], cerebro: ['#efb3b3', '#d18f94'], ojo: ['#4f8fd6', '#e8d9c4'],
    hueso: ['#efe6d2', '#b8a98a'], rata: ['#8f8a86', '#d79b96'], gato: ['#d08a3c', '#f2b8b0'], pulpo: ['#e0684f', '#ffb3a1'] };
  P.figura = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const dib = c.partes ? (ctx2, t2) => personaje(ctx2, t2, c.partes) : MODELOS[c.modelo]; if (!dib) return;
    let x = c.x, y = c.y, ang = (c.angulo ?? 0) * Math.PI / 180;
    if (c.ruta && c.ruta.length > 1) {
      const pts = [[c.x, c.y], ...c.ruta], k = suave((t - (c.desde ?? 0)) / (c.duracionRuta ?? 3));
      [x, y] = puntoEn(pts, k); const [x2, y2] = puntoEn(pts, Math.min(1, k + .01));
      if (k < 1) ang = Math.atan2(y2 - y, x2 - x);
    }
    if (!v.dentro(x, y, c.tam)) return;
    const pop = 1 + .15 * Math.sin(Math.PI * clamp((t - (c.desde ?? 0)) / .35)) * (t - (c.desde ?? 0) < .35 ? 1 : 0);
    const [d1, d2] = c.partes ? [c.partes[0].color, c.partes[0].color] : (COLORES_MODELO[c.modelo] || ['#ffffff', '#999999']);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(v.x(x), v.y(y)); ctx.rotate(ang);
    const s = c.tam * v.k * pop * Math.min(1, .6 + .4 * a); ctx.scale(c.espejo ? -s : s, s);
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 0;
    detalle = clamp((s - 260) / 340);
    const col = c.color || d1, halo = ctx.createRadialGradient(0, 0, 0, 0, 0, .85);   // resplandor que separa la figura del fondo
    halo.addColorStop(0, rgba(col, .2)); halo.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, .85, 0, 6.28); ctx.fill();
    dib(ctx, t + (c.fase ?? 0), col, c.color2 || d2 || d1, c);
    ctx.restore();
  };

  // ---------- personajes diseñados por la IA ----------
  // Un personaje es una lista de piezas dibujadas de atrás hacia adelante, en coordenadas locales (la figura mide ~1 de largo,
  // centrada en 0,0, y hacia abajo), igual que los modelos fijos. Cada pieza puede moverse sola con `mov`.
  // Piezas: elipse {x,y,rx,ry?,rot?} · poligono {puntos,suave?} · linea {puntos,grosor?,suave?} · ojo {x,y,r}
  // Comunes: color, borde?, grosor?, opacidad?, brillo? (volumen), mov? {tipo: oscilar|flotar|pulsar|girar|ondular, amp, vel, fase, px?, py?}
  const centroPieza = p => p.puntos ? [p.puntos.reduce((s, q) => s + q[0], 0) / p.puntos.length, p.puntos.reduce((s, q) => s + q[1], 0) / p.puntos.length] : [p.x ?? 0, p.y ?? 0];
  function trazoSuave(ctx, pts, suave, cerrar) {
    ctx.beginPath();
    const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (!suave || n < 3) { pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (cerrar) ctx.closePath(); return; }
    if (cerrar) {
      const m0 = mid(pts[n - 1], pts[0]); ctx.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) { const m = mid(pts[i], pts[i + 1]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
      ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
    }
  }
  function personaje(ctx, t, partes) {
    const resp = 1 + Math.sin(t * 1.6) * .008; ctx.scale(resp, resp);        // respira aunque ninguna pieza se mueva
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const p of partes) {
      ctx.save();
      let pts = p.puntos;
      const m = p.mov, cen = centroPieza(p);
      if (m) {
        const fase = (m.fase ?? 0), s = Math.sin((t * (m.vel ?? 1) + fase) * 6.283), px = m.px ?? cen[0], py = m.py ?? cen[1], amp = m.amp ?? .1;
        if (m.tipo === 'oscilar') { ctx.translate(px, py); ctx.rotate(s * amp); ctx.translate(-px, -py); }
        else if (m.tipo === 'flotar') ctx.translate(0, s * amp);
        else if (m.tipo === 'pulsar') { ctx.translate(px, py); ctx.scale(1 + s * amp, 1 + s * amp); ctx.translate(-px, -py); }
        else if (m.tipo === 'girar') { ctx.translate(px, py); ctx.rotate((t * (m.vel ?? 1) + fase) * 6.283); ctx.translate(-px, -py); }
        else if (m.tipo === 'ondular' && pts && pts.length > 1) {              // la forma serpentea desde su primer punto (colas, tentáculos)
          const n = pts.length;
          pts = pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
            const k = i / (n - 1), d = Math.sin(k * 3.2 - (t * (m.vel ?? 1) + fase) * 6.283) * amp * k; return [q[0] - dy / L * d, q[1] + dx / L * d]; });
        }
      }
      ctx.globalAlpha *= p.opacidad ?? 1;
      const relleno = p.forma !== 'linea';
      if (p.forma === 'elipse') { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry ?? p.rx, p.rot ?? 0, 0, 6.283); }
      else if (p.forma === 'ojo') { ojo(ctx, p.x, p.y, p.r); ctx.restore(); continue; }
      else trazoSuave(ctx, pts, p.suave, relleno);
      if (relleno) {
        ctx.fillStyle = p.color; ctx.fill();
        if (p.brillo) {                                                          // volumen: luz arriba a la izquierda, borde más oscuro
          ctx.save(); ctx.clip();
          const r = p.forma === 'elipse' ? Math.max(p.rx, p.ry ?? p.rx) : Math.max(...pts.map(q => Math.hypot(q[0] - cen[0], q[1] - cen[1]))) || .1;
          const g = ctx.createRadialGradient(cen[0] - r * .35, cen[1] - r * .4, r * .05, cen[0], cen[1], r * 1.15);
          g.addColorStop(0, 'rgba(255,255,255,.32)'); g.addColorStop(.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
          ctx.fillStyle = g; ctx.fillRect(cen[0] - r * 2, cen[1] - r * 2, r * 4, r * 4); ctx.restore();
        }
        if (p.borde) { ctx.strokeStyle = p.borde; ctx.lineWidth = p.grosor ?? .012; ctx.stroke(); }
      } else { ctx.strokeStyle = p.color; ctx.lineWidth = p.grosor ?? .03; ctx.stroke(); }
      ctx.restore();
    }
  }
  P.personaje = (ctx, c, t, v) => P.figura(ctx, c, t, v);

  // Sprite: ilustración recortada (PNG con transparencia, generada por IA) que vive en el mundo como cualquier otra figura: la cámara la
  // acerca y la mueve, puede viajar por una `ruta` (como `figura`) y tiene movimiento propio con `mov`. `ancho` está en unidades del mundo,
  // así la barra de escala dice su tamaño real. amp: flotar = fracción del alto; oscilar = radianes; pulsar = fracción; girar = vueltas
  // por segundo en `vel`. orienta: gira el sprite hacia donde avanza por la ruta.
  const cargarSprite = c => memo(c, () => {
    const img = new Image();
    const listo = new Promise(res => { img.onload = res; img.onerror = res; });
    img.src = c.src;
    return { img, listo };
  });
  P.sprite = (ctx, c, t, v) => {
    const img = c.partes ? null : cargarSprite(c).img;
    const a = aparecer(c, t);
    if (a <= 0 || (img && !img.naturalWidth)) return;
    const w = c.ancho, h = img ? w * img.naturalHeight / img.naturalWidth : w / (c.aspecto ?? 1), t0 = t - (c.desde ?? 0);
    let px = c.x, py = c.y, rot = (c.angulo ?? 0) * Math.PI / 180;
    if (c.ruta && c.ruta.length) {                                     // viaja por la ruta con arranque y llegada suaves
      const pts = [[c.x, c.y], ...c.ruta], k = suave(t0 / (c.duracionRuta ?? 3));
      [px, py] = puntoEn(pts, k);
      if (c.orienta) {
        const [qx, qy] = puntoEn(pts, Math.min(1, k + .02)), [ox, oy] = puntoEn(pts, Math.max(0, k - .02));
        if (qx !== ox || qy !== oy) rot += Math.atan2(qy - oy, qx - ox);
      }
    }
    if (!v.dentro(px, py, Math.max(w, h))) return;
    const s = Math.sin((t0 * (c.vel ?? .35) + (c.fase ?? 0)) * 6.283), amp = c.amp ?? .02;
    let dy = 0, esc = c.fondo ? 1 : (.93 + .07 * suave(t0 / .8)) * (1 + Math.sin(t * 1.4) * .006);
    if (c.mov === 'flotar') dy = s * amp * h; else if (c.mov === 'oscilar') rot += s * amp; else if (c.mov === 'pulsar') esc *= 1 + s * amp;
    else if (c.mov === 'girar') rot += t0 * (c.vel ?? .35) * 6.283;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(v.x(px), v.y(py + dy)); ctx.rotate(rot); ctx.scale(esc * (c.espejo ? -1 : 1), esc);
    if (c.partes) {                                                    // objeto vectorial: las piezas miden 1 de ancho y se escalan al mundo
      if (c.sombra) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, h * v.k / 2, w * v.k * .42, w * v.k * .035, 0, 0, 6.283); ctx.fill(); }
      ctx.scale(w * v.k, w * v.k); personaje(ctx, t, c.partes);
    } else {
      if (!c.fondo) { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 46; ctx.shadowOffsetY = 26; }
      ctx.drawImage(img, -w * v.k / 2, -h * v.k / 2, w * v.k, h * v.k);
    }
    ctx.restore();
  };

  // ---------- paisajes planos hechos en código (estilo vectorial, colores lisos); se les da `profundidad` para el paralaje ----------
  // colinas {x, y (línea del horizonte), ancho, alto (altura máxima), n (cuántas lomas), color, semilla?}
  P.colinas = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const r = rng(c.semilla ?? 3), f1 = r() * 6.283, f2 = r() * 6.283, N = Math.max(1, c.n ?? 4);
    const h = x => c.alto * (.55 + .3 * Math.sin(x / c.ancho * N * 6.283 + f1) + .15 * Math.sin(x / c.ancho * N * 13.1 + f2));
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c.color; ctx.beginPath();
    ctx.moveTo(v.x(c.x), v.y(c.y + c.alto * 3));
    for (let i = 0; i <= 160; i++) { const x = c.x + c.ancho * i / 160; ctx.lineTo(v.x(x), v.y(c.y - h(x - c.x))); }
    ctx.lineTo(v.x(c.x + c.ancho), v.y(c.y + c.alto * 3)); ctx.closePath(); ctx.fill(); ctx.restore();
  };
  // carretera {x, y (borde superior), ancho, alto, color, colorLinea?}: calzada con borde claro y línea central discontinua fija en el mundo
  // (con la cámara siguiendo al carro, las rayas pasan: da la sensación de velocidad sin animar nada más).
  P.carretera = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const X0 = v.x(c.x), X1 = v.x(c.x + c.ancho), Y0 = v.y(c.y), Y1 = v.y(c.y + c.alto);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = c.color; ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    ctx.fillStyle = mezclaHex(c.color, '#ffffff', .22); ctx.fillRect(X0, Y0, X1 - X0, Math.max(3, (Y1 - Y0) * .05));
    const largoRaya = c.alto * 1.1, ciclo = largoRaya * 2.1, camX = c.x - (X0 - CX) / v.k;     // x del mundo que está en el centro de la pantalla
    const desde = Math.floor((camX - CX / v.k - c.x) / ciclo), hasta = Math.ceil((camX + (W - CX) / v.k - c.x) / ciclo);
    ctx.fillStyle = c.colorLinea || '#f4d35e';
    const yc = v.y(c.y + c.alto * .5), grueso = Math.max(4, (Y1 - Y0) * .06);
    if (c.linea !== false) for (let i = Math.max(0, desde); i <= hasta; i++) { const x = c.x + i * ciclo; ctx.fillRect(v.x(x), yc - grueso / 2, largoRaya * v.k, grueso); }
    ctx.restore();
  };
  // siluetas {x, ancho, y (base), forma: arbol|pino|poste|nube, n, alto, color, semilla?}: elementos sueltos repartidos a lo ancho
  P.siluetas = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const r = rng(c.semilla ?? 5);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = c.color; ctx.strokeStyle = c.color; ctx.lineCap = 'round';
    for (let i = 0; i < c.n; i++) {
      const x = c.x + (i + .15 + .7 * r()) * c.ancho / c.n, h = c.alto * (.6 + .6 * r()), sx = v.x(x), by = v.y(c.y), k = v.k;
      if (c.forma === 'pino') {
        for (let j = 0; j < 3; j++) {
          const w = h * (.32 - j * .07), y0 = by - h * (.25 + j * .25) * k, y1 = y0 - h * .45 * k;
          ctx.beginPath(); ctx.moveTo(sx - w * k, y0); ctx.lineTo(sx + w * k, y0); ctx.lineTo(sx, y1); ctx.closePath(); ctx.fill();
        }
        ctx.fillRect(sx - h * .03 * k, by - h * .25 * k, h * .06 * k, h * .25 * k);
      } else if (c.forma === 'arbol') {
        ctx.fillRect(sx - h * .04 * k, by - h * .5 * k, h * .08 * k, h * .5 * k);
        ctx.beginPath(); ctx.arc(sx, by - h * .65 * k, h * .3 * k, 0, 6.283); ctx.fill();
      } else if (c.forma === 'poste') {
        ctx.lineWidth = Math.max(2, h * .035 * k); ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(sx, by - h * k);
        ctx.moveTo(sx - h * .22 * k, by - h * .92 * k); ctx.lineTo(sx + h * .22 * k, by - h * .92 * k); ctx.stroke();
      } else if (c.forma === 'nube') {
        for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(sx + (j - 1.5) * h * .35 * k, by - Math.sin(j * 1.7) * h * .12 * k, h * .35 * k, h * .2 * k, 0, 0, 6.283); ctx.fill(); }
      }
    }
    ctx.restore();
  };

  // El motor espera a que los sprites estén decodificados antes de capturar el primer cuadro.
  const precargar = escenas => Promise.all(escenas.filter(Boolean).flatMap(e => e.capas || [])
    .filter(c => c.tipo === 'sprite' && !c.partes).map(c => cargarSprite(c).listo));

  // Red: nodos al azar unidos con sus vecinos; crece desde el centro y lleva pulsos de luz (moho, neuronas, internet, metro).
  P.red = (ctx, c, t, v) => {
    const red = memo(c, () => {
      const r = rng(c.semilla ?? 13), nodos = [];
      for (let i = 0; i < c.nodos; i++) { const an = r() * 6.28, d = Math.sqrt(r()); nodos.push([c.x + Math.cos(an) * d * c.r, c.y + Math.sin(an) * d * (c.ry ?? c.r)]); }
      const aristas = [];
      nodos.forEach((p, i) => nodos.map((q, j) => [j, Math.hypot(p[0] - q[0], p[1] - q[1])]).filter(([j]) => j !== i)
        .sort((m, n) => m[1] - n[1]).slice(0, c.vecinos ?? 3).forEach(([j]) => { if (i < j || !aristas.some(([m, n]) => m === j && n === i)) aristas.push([i, j]); }));
      return { nodos, aristas, dc: nodos.map(p => Math.hypot(p[0] - c.x, p[1] - c.y) / Math.max(c.r, c.ry ?? c.r)) };
    });
    const a = aparecer(c, t); if (a <= 0) return;
    const crec = (t - (c.desde ?? 0)) / (c.duracion ?? 3);
    ctx.save(); ctx.lineCap = 'round';
    for (const [i, j] of red.aristas) {
      const k = clamp((crec - Math.min(red.dc[i], red.dc[j])) * 3); if (k <= 0) continue;
      const [x1, y1] = red.nodos[i], [x2, y2] = red.nodos[j];
      ctx.strokeStyle = rgba(c.color, a * .7); ctx.lineWidth = Math.max(1.5, (c.grosor ?? 4) * v.k);
      ctx.beginPath(); ctx.moveTo(v.x(x1), v.y(y1)); ctx.lineTo(v.x(mezcla(x1, x2, k)), v.y(mezcla(y1, y2, k))); ctx.stroke();
      if (c.pulsos && k >= 1) { const p = ((t * .6 + (i * 7 + j) * .137) % 1);
        ctx.fillStyle = rgba('#ffffff', a * .9); ctx.beginPath(); ctx.arc(v.x(mezcla(x1, x2, p)), v.y(mezcla(y1, y2, p)), Math.max(2, (c.grosor ?? 4) * v.k * .9), 0, 6.28); ctx.fill(); }
    }
    red.nodos.forEach((p, i) => { if (crec < red.dc[i]) return;
      const g = ctx.createRadialGradient(v.x(p[0]), v.y(p[1]), 0, v.x(p[0]), v.y(p[1]), Math.max(4, (c.grosor ?? 4) * v.k * 3));
      g.addColorStop(0, rgba(c.colorNodo || c.color, a)); g.addColorStop(1, rgba(c.colorNodo || c.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(v.x(p[0]), v.y(p[1]), Math.max(4, (c.grosor ?? 4) * v.k * 3), 0, 6.28); ctx.fill(); });
    ctx.restore();
  };

  // Ramas: crecimiento ramificado desde una raíz (raíces, árboles, rayos, ríos, vasos, dendritas).
  P.ramas = (ctx, c, t, v) => {
    const segs = memo(c, () => {
      const r = rng(c.semilla ?? 17), out = [];
      const crecer = (x, y, ang, largo, nivel, t0) => {
        if (nivel > (c.niveles ?? 5) || largo < 1e-9) return;
        const x2 = x + Math.cos(ang) * largo, y2 = y + Math.sin(ang) * largo;
        out.push({ x, y, x2, y2, nivel, t0 });
        const hijos = r() < .25 ? 3 : 2;
        for (let h = 0; h < hijos; h++) crecer(x2, y2, ang + (r() - .5) * (c.apertura ?? 1.1), largo * (.62 + r() * .18), nivel + 1, t0 + 1);
      };
      crecer(c.x, c.y, (c.angulo ?? -90) * Math.PI / 180, c.largo, 0, 0);
      return out;
    });
    const a = aparecer(c, t); if (a <= 0) return;
    const niv = (t - (c.desde ?? 0)) / (c.duracion ?? 3) * ((c.niveles ?? 5) + 1);
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = rgba(c.color, a * .9);
    for (const s of segs) { const k = clamp(niv - s.t0); if (k <= 0) continue;
      ctx.lineWidth = Math.max(1, (c.grosor ?? 10) * v.k * Math.pow(.7, s.nivel));
      ctx.beginPath(); ctx.moveTo(v.x(s.x), v.y(s.y)); ctx.lineTo(v.x(mezcla(s.x, s.x2, k)), v.y(mezcla(s.y, s.y2, k))); ctx.stroke(); }
    ctx.restore();
  };

  // Corriente: partículas que fluyen por un camino, sin paredes (aire, electrones, dinero, tráfico, señales).
  P.corriente = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const L = largo(c.puntos), n = c.n ?? 40, r = rng(c.semilla ?? 19);
    ctx.save();
    if (c.guia !== false) { ctx.setLineDash([10, 14]); ctx.strokeStyle = rgba(c.color, a * .3); ctx.lineWidth = 3; ctx.beginPath();
      c.puntos.forEach(([x, y], i) => i ? ctx.lineTo(v.x(x), v.y(y)) : ctx.moveTo(v.x(x), v.y(y))); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = rgba(c.color, a * .95);
    for (let i = 0; i < n; i++) { const lado = (r() - .5) * (c.ancho ?? 0), off = r();
      const s = ((i / n + off * .03 + t * (c.velocidad ?? 50) / L) % 1 + 1) % 1, [x, y] = puntoEn(c.puntos, s);
      ctx.beginPath(); ctx.arc(v.x(x), v.y(y + lado), Math.max(2, (c.tam ?? 4) * v.k), 0, 6.28); ctx.fill(); }
    if (c.flecha !== false) { const [x1, y1] = puntoEn(c.puntos, .97), [x2, y2] = c.puntos[c.puntos.length - 1], an = Math.atan2(v.y(y2) - v.y(y1), v.x(x2) - v.x(x1));
      ctx.save(); ctx.translate(v.x(x2), v.y(y2)); ctx.rotate(an); ctx.fillStyle = rgba(c.color, a);
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-22, -16); ctx.lineTo(-22, 16); ctx.fill(); ctx.restore(); }
    ctx.restore();
  };

  // Onda: sonido, luz, ondas de radio, latidos. Se dibuja de x a x+ancho.
  P.onda = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const k = suave((t - (c.desde ?? 0)) / 1.5);
    ctx.save(); ctx.strokeStyle = rgba(c.color, a); ctx.lineWidth = Math.max(2, (c.grosor ?? 3) * v.k); ctx.shadowColor = c.color; ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i <= 200 * k; i++) { const s = i / 200, wx = c.x + s * c.ancho;
      const wy = c.y + Math.sin((s * c.ancho) / c.longitud * 6.28 - t * (c.velocidad ?? 2) * 6.28) * c.amplitud;
      i ? ctx.lineTo(v.x(wx), v.y(wy)) : ctx.moveTo(v.x(wx), v.y(wy)); }
    ctx.stroke(); ctx.restore();
  };

  // Órbita: n cuerpos girando alrededor de un centro (átomo, planetas, satélites, electrones).
  P.orbita = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    ctx.save(); const inc = c.inclinacion ?? .35;
    ctx.strokeStyle = rgba(c.color, a * .35); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(v.x(c.x), v.y(c.y), c.r * v.k, c.r * v.k * inc, c.giro ?? 0, 0, 6.28); ctx.stroke();
    for (let i = 0; i < (c.n ?? 1); i++) { const an = t * 6.28 / (c.periodo ?? 3) + i / (c.n ?? 1) * 6.28, g = c.giro ?? 0;
      const ex = Math.cos(an) * c.r, ey = Math.sin(an) * c.r * inc, x = c.x + ex * Math.cos(g) - ey * Math.sin(g), y = c.y + ex * Math.sin(g) + ey * Math.cos(g);
      const rr = Math.max(4, (c.tam ?? 10) * v.k), gr = ctx.createRadialGradient(v.x(x), v.y(y), 0, v.x(x), v.y(y), rr * 2.5);
      gr.addColorStop(0, rgba(c.color, a)); gr.addColorStop(1, rgba(c.color, 0)); ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(v.x(x), v.y(y), rr * 2.5, 0, 6.28); ctx.fill(); }
    ctx.restore();
  };

  // Rejilla: puntos regulares con una ola de brillo que se propaga desde el centro (datos, mapa, pantalla, cuadrícula de ciudad).
  // Es textura de fondo: úsala con `profundidad` para que dé volumen sin competir con el protagonista.
  P.rejilla = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const nx = Math.floor(c.ancho / c.paso) + 1, ny = Math.floor(c.alto / c.paso) + 1;
    const cxm = c.x + c.ancho / 2, cym = c.y + c.alto / 2, diag = Math.hypot(c.ancho, c.alto) / 2;
    const r = memo(c, () => { const g = rng(c.semilla ?? 23); return Array.from({ length: nx * ny }, () => g()); });
    const vel = c.velocidad ?? 1.2, pulso = c.colorPulso || '#ffffff';
    ctx.save();
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = c.x + i * c.paso, y = c.y + j * c.paso;
      if (!v.dentro(x, y, c.tam * 3)) continue;
      const d = Math.hypot(x - cxm, y - cym) / diag, ola = Math.pow(.5 + .5 * Math.sin(d * 7 - t * vel * 3.14 + r[j * nx + i] * .8), 4);
      const rad = Math.max(1.2, c.tam * v.k * (.7 + .8 * ola)), enc = suave((t - (c.desde ?? 0) - d * 1.2) / .5);
      ctx.fillStyle = rgba(ola > .55 ? pulso : c.color, a * enc * (.3 + .7 * ola));
      ctx.beginPath(); ctx.arc(v.x(x), v.y(y), rad, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  };

  // Anillos: ondas que se expanden desde un punto y se desvanecen (señal, sonar, wifi, impacto, radar).
  P.anillos = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const n = c.n ?? 4, per = c.periodo ?? 3, sx = v.x(c.x), sy = v.y(c.y), ry = (c.ry ?? c.r) / c.r;
    ctx.save(); ctx.lineWidth = Math.max(2, (c.grosor ?? 3) * v.k);
    for (let i = 0; i < n; i++) {
      const f = (((t - (c.desde ?? 0)) / per + i / n) % 1 + 1) % 1, rad = c.r * v.k * f;
      ctx.strokeStyle = rgba(c.color, a * Math.pow(1 - f, 1.6) * .9);
      ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(1, rad), Math.max(1, rad * ry), 0, 0, 6.28); ctx.stroke();
    }
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(8, c.r * v.k * .08));
    g.addColorStop(0, rgba(c.color, a)); g.addColorStop(1, rgba(c.color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, Math.max(8, c.r * v.k * .08), 0, 6.28); ctx.fill();
    ctx.restore();
  };

  // Torres: columnas que crecen desde una base (ciudad, ahorro, barras en el mundo, edificios, pilas de monedas).
  // x = esquina izquierda, y = línea de base, `alto` = altura de la más alta. `alturas` (0..1 de `alto`) opcional.
  P.torres = (ctx, c, t, v) => {
    const a = aparecer(c, t); if (a <= 0) return;
    const n = c.n, hs = memo(c, () => { const g = rng(c.semilla ?? 29); return Array.from({ length: n }, (_, i) => c.alturas?.[i] ?? .25 + g() * .75); });
    const paso = c.ancho / n, anc = paso * .72, dur = c.duracion ?? 2.5;
    ctx.save();
    hs.forEach((h, i) => {
      const k = suave((t - (c.desde ?? 0) - i * dur * .12) / (dur * .6)); if (k <= 0) return;
      const x = c.x + i * paso + (paso - anc) / 2, alto = h * c.alto * k;
      if (!v.dentro(x + anc / 2, c.y - alto / 2, Math.max(alto, anc))) return;
      const sx = v.x(x), sw = anc * v.k, sy0 = v.y(c.y), sh = alto * v.k, col = i === (c.resaltar ?? -1) ? (c.colorResalte || '#ff5a4f') : c.color;
      const g = ctx.createLinearGradient(0, sy0 - sh, 0, sy0); g.addColorStop(0, rgba(mezclaHex(col, '#ffffff', .25), a * .95)); g.addColorStop(1, rgba(mezclaHex(col, '#000000', .35), a * .8));
      ctx.fillStyle = g; ctx.fillRect(sx, sy0 - sh, sw, sh);
      if (sw > 14) {                                                       // pisos o monedas apiladas
        ctx.strokeStyle = rgba('#000000', a * .28); ctx.lineWidth = 1.5;
        const pisos = Math.max(2, Math.round(h * 10)); for (let p = 1; p < pisos; p++) { const yy = sy0 - sh * p / pisos; ctx.beginPath(); ctx.moveTo(sx, yy); ctx.lineTo(sx + sw, yy); ctx.stroke(); }
      }
      ctx.fillStyle = rgba('#ffffff', a * .55); ctx.fillRect(sx, sy0 - sh, sw, Math.max(2, sh * .02));
    });
    ctx.strokeStyle = rgba(c.color, a * .5); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(v.x(c.x - paso * .2), v.y(c.y)); ctx.lineTo(v.x(c.x + c.ancho + paso * .2), v.y(c.y)); ctx.stroke();
    ctx.restore();
  };

  // ---------- más capas de pantalla ----------
  // Gráfica de barras o línea dentro de la zona del dibujo (dinero, estadísticas). datos: números ≥ 0.
  P.grafica = (ctx, c, t) => {
    if (reservada(c, t)) ocupado.push({ x0: 110, x1: ZONA.x1, y0: 540, y1: 1140 });
    const a = aparecer(c, t); if (a <= 0) return;
    const k = suave((t - (c.desde ?? 0)) / (c.duracion ?? 2)), datos = c.datos, max = Math.max(...datos, 1e-9);
    const x0 = 165, x1 = 915, y0 = 1080, y1 = 600, n = datos.length, paso = (x1 - x0) / n;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0, y1 - 20); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    ctx.font = '700 30px "Space Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    if (c.tipo2 === 'linea') {
      ctx.strokeStyle = c.color; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.shadowColor = c.color; ctx.shadowBlur = 16; ctx.beginPath();
      const hasta = k * (n - 1);
      for (let i = 0; i <= Math.ceil(hasta) && i < n; i++) { const f = Math.min(1, hasta - i + 1), xi = x0 + paso * (i + .5);
        const yi = y0 - (datos[i] / max) * (y0 - y1);
        if (i === 0) ctx.moveTo(xi, yi); else { const xp = x0 + paso * (i - .5), yp = y0 - (datos[i - 1] / max) * (y0 - y1); ctx.lineTo(mezcla(xp, xi, f), mezcla(yp, yi, f)); } }
      ctx.stroke(); ctx.shadowBlur = 0;
    } else datos.forEach((d, i) => { const h = (d / max) * (y0 - y1) * suave(k * n - i), xi = x0 + paso * i + paso * .15;
      ctx.fillStyle = i === (c.resaltar ?? -1) ? (c.colorResalte || '#ff5a4f') : c.color; ctx.fillRect(xi, y0 - h, paso * .7, h);
      if (h > 0 && c.valores !== false) { ctx.fillStyle = '#fff'; ctx.fillText(String(d), xi + paso * .35, y0 - h - 14); } });
    (c.etiquetas || []).forEach((e, i) => { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText(e, x0 + paso * (i + .5), y0 + 44); });
    ctx.restore();
  };

  // Dial con aguja entre dos extremos (riesgo, temperatura, nivel, probabilidad). valor y deA en 0..1.
  P.dial = (ctx, c, t) => {
    if (reservada(c, t)) ocupado.push({ x0: 250, x1: 760, y0: 650, y1: 1150 });
    const a = aparecer(c, t); if (a <= 0) return;
    const k = suave((t - (c.desde ?? 0)) / (c.duracion ?? 1.5)), val = mezcla(c.de ?? 0, c.valor, k);
    const cx = CX, cy = 900, R = 230, a0 = Math.PI * .8, a1 = Math.PI * 2.2;
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
    ctx.strokeStyle = c.color || '#ff5a4f'; ctx.beginPath(); ctx.arc(cx, cy, R, a0, mezcla(a0, a1, val)); ctx.stroke();
    for (let i = 0; i <= 10; i++) { const an = mezcla(a0, a1, i / 10); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(an) * (R - 40), cy + Math.sin(an) * (R - 40)); ctx.lineTo(cx + Math.cos(an) * (R - 58), cy + Math.sin(an) * (R - 58)); ctx.stroke(); }
    const an = mezcla(a0, a1, val); ctx.strokeStyle = '#fff'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(an) * (R - 70), cy + Math.sin(an) * (R - 70)); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 6.28); ctx.fill();
    ctx.font = '700 34px "Space Mono", monospace'; ctx.textAlign = 'center';
    if (c.min) ctx.fillText(c.min, cx - R * .8, cy + R * .95); if (c.max) { ctx.fillStyle = c.color || '#ff5a4f'; ctx.fillText(c.max, cx + R * .8, cy + R * .95); }
    ctx.restore();
  };

  // Frase corta grande, palabra por palabra (para conceptos sin dibujo: "una sola regla").
  P.frase = (ctx, c, t) => {
    if (!reservada(c, t)) return;
    const a = aparecer(c, t);
    const palabras = c.texto.split(/\s+/);
    ctx.save(); ctx.font = '900 76px Montserrat, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const lineas = [[]]; let ancho = 0;
    palabras.forEach(p => { const w = ctx.measureText(p + ' ').width; if (ancho + w > 820 && lineas[lineas.length - 1].length) { lineas.push([]); ancho = 0; } lineas[lineas.length - 1].push(p); ancho += w; });
    let y = c.y ?? 330; const alto = lineas.length * 84;
    while (y + alto < ZONA.y1 && choca({ x0: ZONA.x0, x1: ZONA.x1, y0: y, y1: y + alto })) y += 40;
    ocupado.push({ x0: ZONA.x0, x1: ZONA.x1, y0: y, y1: y + alto });
    let idx = 0;
    lineas.forEach((ln, j) => { let x = CX - ctx.measureText(ln.join(' ')).width / 2;
      ln.forEach(p => { const k = suave((t - (c.desde ?? 0) - idx * .18) / .3); ctx.globalAlpha = a * k;
        ctx.fillStyle = (c.resaltar || []).includes(p.toLowerCase().replace(/[^\p{L}\d]/gu, '')) ? (c.color || '#ff5a4f') : '#fff';
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 16; ctx.fillText(p, x, y + j * 84 + (1 - k) * 20); x += ctx.measureText(p + ' ').width; idx++; }); });
    ctx.restore();
  };

  const PANTALLA = new Set(['etiqueta', 'numero', 'cita', 'grafica', 'dial', 'frase']);

  // Capa lejana (`profundidad` 0..1): paralaje y desenfoque. Se dibuja con una cámara que se mueve y se acerca menos que la
  // real (en la primera clave coincide con ella), en un lienzo aparte, y se pega más tenue y borrosa: da volumen al fondo
  // con pocos elementos, sin tener que llenar el cuadro.
  let lienzoLejano = null;
  function capaLejana(ctx, c, t, cam0, cam) {
    if (!lienzoLejano) { lienzoLejano = document.createElement('canvas'); lienzoLejano.width = W; lienzoLejano.height = H; }
    const p = clamp(c.profundidad), q = .45 * p, o = lienzoLejano.getContext('2d');
    const v = vista({ x: mezcla(cam0.x, cam.x, 1 - q), y: mezcla(cam0.y, cam.y, 1 - q),
                      ancho: Math.exp(mezcla(Math.log(cam0.ancho), Math.log(cam.ancho), 1 - q)) });
    o.clearRect(0, 0, W, H); P[c.tipo]?.(o, c, t, v);
    ctx.save(); ctx.globalAlpha = 1 - .5 * p; if (p >= .3) ctx.filter = `blur(${(p * 3.5).toFixed(1)}px)`;
    ctx.drawImage(lienzoLejano, 0, 0); ctx.restore();
  }

  // Velos: el dibujo se atenúa detrás de lo que debe leerse. Los textos grandes y las gráficas son capas de pantalla fijas y el
  // protagonista puede quedar debajo; en vez de esquivarlo (la composición ya reparte la pantalla en franjas), se oscurece
  // suavemente esa franja mientras el texto está visible.
  function velos(ctx, capas, t) {
    let txt = 0, graf = 0;
    for (const c of capas) {
      const a = aparecer(c, t);
      if (c.tipo === 'numero' || c.tipo === 'cita' || c.tipo === 'frase') txt = Math.max(txt, a);
      else if (c.tipo === 'grafica' || c.tipo === 'dial') graf = Math.max(graf, a);
    }
    const banda = (y0, y1, y2, y3, alfa) => {
      const g = ctx.createLinearGradient(0, y0, 0, y3), r = (y) => (y - y0) / (y3 - y0);
      g.addColorStop(0, 'rgba(4,6,10,0)'); g.addColorStop(r(y1), `rgba(4,6,10,${alfa})`);
      g.addColorStop(r(y2), `rgba(4,6,10,${alfa})`); g.addColorStop(1, 'rgba(4,6,10,0)');
      ctx.fillStyle = g; ctx.fillRect(0, y0, W, y3 - y0);
    };
    if (txt > 0) banda(230, 300, 540, 620, .42 * txt);
    if (graf > 0) banda(500, 570, 1130, 1200, .58 * graf);
  }

  // ---------- dibujar una escena ----------
  // escena = { fondo:{tema}, camara:[...], capas:[{tipo, ...}], escala:true, grano:0.07 }
  function dibujar(canvas, escena, t) {
    const ctx = canvas.getContext('2d');
    fondo(ctx, escena.fondo);
    const cam = camara(escena.camara, t), v = vista(cam);
    for (const c of escena.capas) {
      if (PANTALLA.has(c.tipo)) continue;
      if (c.profundidad > 0) capaLejana(ctx, c, t, escena.camara[0], cam); else P[c.tipo]?.(ctx, c, t, v);
    }
    grano(ctx, t, escena.grano ?? 0.07);
    if (escena.velos !== false) velos(ctx, escena.capas, t);
    if (escena.escala !== false) barraEscala(ctx, v, escena.unidad);
    ocupado = [];
    // Número y cita ocupan siempre el mismo lugar: si la IA pone varios a la vez (pasó: "$500" sobre "$1000"),
    // solo se muestra el que empezó más recientemente.
    const ultimo = {};
    for (const c of escena.capas) if ((c.tipo === 'numero' || c.tipo === 'cita') && (c.desde ?? 0) <= t + .6 &&
      (!ultimo[c.tipo] || (c.desde ?? 0) >= (ultimo[c.tipo].desde ?? 0))) ultimo[c.tipo] = c;
    for (const c of escena.capas) {
      if (!PANTALLA.has(c.tipo) || c.tipo === 'etiqueta') continue;
      if ((c.tipo === 'numero' || c.tipo === 'cita') && ultimo[c.tipo] !== c) continue;
      P[c.tipo]?.(ctx, c, t, v);
    }
    for (const c of escena.capas) if (c.tipo === 'etiqueta') P.etiqueta(ctx, c, t, v);
  }

  window.Primitivas = { dibujar, precargar, tipos: Object.keys(P), modelos: Object.keys(MODELOS), camara, ZONA };
})();
