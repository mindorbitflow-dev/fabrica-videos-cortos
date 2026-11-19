/* Ilustra — REPARTO: patito piloto de hule (Así se fabrica), tiburón y serpiente (¿Sobrevivirías?) en 2D estilizado.
   Cada uno: p.dibujar(ctx, t, estado) con estado = { x, y, dir, pose, expresion?, sombraSuelo, alto, luz, ... } (como el resto del reparto).
   (x, y) = punto de apoyo: patito -> línea de flotación bajo el centro; tiburón -> centro del cuerpo; serpiente -> suelo bajo el centro.
   Cargar tras reparto.js. Todo determinista en t. */
(function (G) {
  'use strict';
  const I = G.Ilustra, P = I.Pincel, R = I.REPARTO, PI = Math.PI;
  const tubo = R.tubo;
  const luzGuard = (e, fn) => { const prev = I.luzActual; if (e.luz) I.luzActual = e.luz; try { return fn(); } finally { I.luzActual = prev; } };
  // brillo de goma / piel húmeda: mancha suave dentro de un trazado
  function brillo(ctx, path, cx, cy, rx, ry, rot, alfa) {
    ctx.save(); ctx.clip(path); ctx.fillStyle = 'rgba(255,250,235,' + alfa + ')'; ctx.filter = 'blur(' + Math.max(1, Math.min(rx, ry) * 0.35) + 'px)';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, 7); ctx.fill(); ctx.restore();
  }

  // ============================================================== PATITO PILOTO
  const PATITO_POSES = {
    flotar: { bob: 0.014, incl: 0.06, frecIncl: 1.2, pico: 0.0, ala: -0.15, ojos: 'abiertos', agua: true },
    inclinarse: { bob: 0.01, incl: 0.3, frecIncl: 0.9, pico: 0.1, ala: -0.2, ojos: 'abiertos', agua: true },
    susto: { bob: 0.0, incl: -0.22, frecIncl: 0, pico: 0.9, ala: 0.9, ojos: 'susto', agua: true, tiembla: 1 },
    celebrar: { bob: 0, incl: 0.05, frecIncl: 0, pico: 0.6, ala: 1.5, ojos: 'feliz', agua: false, salta: 1 }
  };
  function Patito(o = {}) { this.o = Object.assign({ nombre: 'Patito piloto', altura: 300, semilla: 21, casco: 'aviador', color: '#f6c632', pico: '#ee8a2b' }, o); this.poses = PATITO_POSES; }
  Patito.prototype.dibujar = function (ctx, t, e) {
    return luzGuard(e, () => {
      const o = this.o, S = o.altura / 0.98, dir = e.dir || 1, s = o.semilla;
      const pz = typeof e.pose === 'string' || e.pose == null ? (PATITO_POSES[e.pose || 'flotar'] || PATITO_POSES.flotar) : e.pose;
      const p = Object.assign({}, pz, e.pose2 ? {} : {});
      let q = p;
      if (e.pose2 != null) { const b = PATITO_POSES[e.pose2], k = e.k || 0; q = {}; for (const c of ['bob', 'incl', 'pico', 'ala', 'tiembla', 'salta']) q[c] = I.lerp(p[c] || 0, b[c] || 0, k); q.ojos = k < 0.5 ? p.ojos : b.ojos; q.agua = k < 0.5 ? p.agua : b.agua; q.frecIncl = p.frecIncl; }
      const bob = Math.sin(t * 2.4 + s) * (q.bob || 0) * S;
      const incl = (e.inclinacion != null ? e.inclinacion : (q.incl || 0) + Math.sin(t * (q.frecIncl || 0) * 2 + s) * 0.05 * (q.frecIncl ? 1 : 0)) * dir;
      const salta = q.salta ? Math.abs(Math.sin(t * 5.5)) * 0.2 * S : 0;
      const tm = q.tiembla ? [I.ruido1(t * 40, s) * 0.007 * S, I.ruido1(t * 43, s + 1) * 0.006 * S] : [0, 0];
      const alto = (e.alto || 0) + salta, agua = e.agua != null ? e.agua : q.agua;
      const casco = e.casco != null ? e.casco : o.casco;
      const ojos = e.ojos || q.ojos, pico = e.pico != null ? e.pico : (q.pico || 0), ala = e.ala != null ? e.ala : (q.ala || 0) + (q.salta ? Math.sin(t * 11) * 0.35 : 0);
      const col = o.color;
      // sombra / ondas
      if (agua) {
        ctx.save(); ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) { const k = ((t * 0.5 + i / 3) % 1); ctx.strokeStyle = 'rgba(200,225,235,' + (0.5 * (1 - k)) + ')'; ctx.beginPath(); ctx.ellipse(e.x, e.y + S * 0.02, S * (0.5 + k * 0.45), S * (0.07 + k * 0.05), 0, 0, 7); ctx.stroke(); }
        ctx.restore();
      } else if (e.sombraSuelo !== false) R.sombraSuelo(ctx, e.x, e.y, S * 0.42, 0.5 * I.clamp(1 - alto / (S * 0.6), 0.2, 1));
      ctx.save(); ctx.translate(e.x + tm[0], e.y - alto + bob + tm[1]); ctx.rotate(incl); ctx.scale(dir, 1);
      // cuerpo + cola
      const cuerpo = P.elipse(0, -0.3 * S, 0.47 * S, 0.3 * S, 0, 40);
      const cola = P.suavizar([[-0.3 * S, -0.44 * S], [-0.52 * S, -0.62 * S], [-0.64 * S, -0.6 * S], [-0.56 * S, -0.44 * S], [-0.48 * S, -0.22 * S], [-0.3 * S, -0.16 * S]], 4);
      const est = { color: col, semilla: s + 1, volumen: 0.9, borde: 0.95, anchoBorde: 6, irregular: 0.5, textura: 0.12, sombraInterna: 0.5 };
      const pc = P.forma(ctx, [cuerpo, cola], est);
      brillo(ctx, pc, 0.1 * S, -0.46 * S, 0.2 * S, 0.06 * S, -0.15, 0.4);
      // ala
      ctx.save(); ctx.translate(-0.06 * S, -0.38 * S); ctx.rotate(-ala * dir * 0 - ala * 0.9);
      P.forma(ctx, P.suavizar([[0.05 * S, -0.02 * S], [-0.1 * S, -0.1 * S], [-0.3 * S, -0.1 * S], [-0.36 * S, 0.02 * S], [-0.2 * S, 0.12 * S], [0.0 * S, 0.1 * S]], 4), { color: I.oscurece(col, 0.06), semilla: s + 2, volumen: 0.8, borde: 0.8, anchoBorde: 4, irregular: 0.4, textura: 0.1, sombraInterna: 0.5 });
      ctx.restore();
      // cuello/cabeza
      const hx = 0.22 * S, hy = -0.72 * S, hr = 0.23 * S;
      const cab = P.forma(ctx, P.elipse(hx, hy, hr, hr * 0.97, 0, 40), Object.assign({}, est, { semilla: s + 3 }));
      brillo(ctx, cab, hx - 0.04 * S, hy - 0.11 * S, 0.1 * S, 0.045 * S, -0.5, 0.45);
      // pico (mandíbula inferior primero)
      const ab = pico * 0.075 * S;
      P.forma(ctx, P.suavizar([[hx + 0.15 * S, hy + 0.07 * S], [hx + 0.38 * S, hy + 0.08 * S + ab], [hx + 0.34 * S, hy + 0.14 * S + ab], [hx + 0.16 * S, hy + 0.15 * S + ab * 0.5]], 3), { color: I.oscurece(o.pico, 0.18), semilla: s + 4, volumen: 0.7, borde: 0.6, anchoBorde: 3, irregular: 0.2 });
      if (pico > 0.15) { ctx.fillStyle = I.css('#5a1f1c'); ctx.beginPath(); ctx.ellipse(hx + 0.26 * S, hy + 0.09 * S + ab * 0.55, 0.1 * S, ab * 0.5 + 1, 0, 0, 7); ctx.fill(); }
      const pu = P.forma(ctx, P.suavizar([[hx + 0.1 * S, hy - 0.02 * S], [hx + 0.3 * S, hy - 0.06 * S], [hx + 0.46 * S, hy - 0.01 * S], [hx + 0.44 * S, hy + 0.05 * S], [hx + 0.3 * S, hy + 0.08 * S], [hx + 0.12 * S, hy + 0.08 * S]], 4), { color: o.pico, semilla: s + 5, volumen: 0.85, borde: 0.95, anchoBorde: 4, irregular: 0.3, textura: 0.1, sombraInterna: 0.4 });
      ctx.fillStyle = 'rgba(120,50,15,0.7)'; ctx.beginPath(); ctx.ellipse(hx + 0.38 * S, hy - 0.02 * S, 0.012 * S, 0.008 * S, 0.3, 0, 7); ctx.fill();
      brillo(ctx, pu, hx + 0.26 * S, hy - 0.04 * S, 0.1 * S, 0.018 * S, -0.1, 0.4);
      // ojos
      const ojo = (x, y, r, far) => {
        if (ojos === 'feliz') { ctx.strokeStyle = I.css('#2a1a10'); ctx.lineWidth = S * 0.017; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y + r * 0.35, r * 0.85, PI * 1.1, PI * 1.9); ctx.stroke(); return; }
        const rr = ojos === 'susto' ? r * 1.3 : r;
        P.forma(ctx, P.elipse(x, y, rr, rr * 1.08, 0, 20), { color: '#fbf6ea', semilla: s + 6, volumen: 0.3, borde: 0.3, irregular: 0, textura: 0, anchoBorde: 2, sombraInterna: 0.3, contorno: '#2a1a10', anchoContorno: 2 });
        const pr = ojos === 'susto' ? rr * 0.3 : rr * 0.55;
        const jx = ojos === 'susto' ? I.ruido1(t * 30, s) * rr * 0.1 : 0;
        ctx.fillStyle = I.css('#1c120d'); ctx.beginPath(); ctx.ellipse(x + rr * 0.2 + jx, y + rr * 0.08, pr, pr * 1.1, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(x + rr * 0.35 + jx, y - rr * 0.2, rr * 0.18, 0, 7); ctx.fill();
      };
      ojo(hx + 0.03 * S, hy - 0.06 * S, 0.075 * S, false); ojo(hx + 0.19 * S, hy - 0.075 * S, 0.062 * S, true);
      if (ojos === 'susto') { ctx.strokeStyle = I.css('#2a1a10'); ctx.lineWidth = S * 0.012; ctx.lineCap = 'round'; for (const [x, y] of [[hx + 0.03 * S, hy - 0.06 * S], [hx + 0.19 * S, hy - 0.075 * S]]) { ctx.beginPath(); ctx.moveTo(x - 0.06 * S, y - 0.11 * S); ctx.lineTo(x + 0.05 * S, y - 0.13 * S - 0.01 * S); ctx.stroke(); } }
      // casco
      if (casco === 'aviador') {
        const g = P.suavizar([[hx + 0.2 * S, hy - 0.17 * S], [hx + 0.05 * S, hy - 0.26 * S], [hx - 0.15 * S, hy - 0.2 * S], [hx - 0.25 * S, hy - 0.02 * S], [hx - 0.23 * S, hy + 0.12 * S], [hx - 0.12 * S, hy + 0.18 * S], [hx - 0.06 * S, hy + 0.02 * S], [hx + 0.02 * S, hy - 0.1 * S]], 4);
        const pc2 = P.forma(ctx, g, { color: '#8b5a37', semilla: s + 7, volumen: 0.85, borde: 0.9, anchoBorde: 4, irregular: 0.5, textura: 0.5, sombraInterna: 0.5 });
        brillo(ctx, pc2, hx - 0.03 * S, hy - 0.19 * S, 0.08 * S, 0.025 * S, -0.3, 0.35);
        ctx.strokeStyle = I.css('#2a1b12'); ctx.lineWidth = S * 0.014; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx - 0.12 * S, hy + 0.16 * S); ctx.quadraticCurveTo(hx + 0.06 * S, hy + 0.3 * S, hx + 0.16 * S, hy + 0.2 * S); ctx.stroke();
        // gafas sobre la frente
        ctx.strokeStyle = I.css('#2a1b12'); ctx.lineWidth = S * 0.02; ctx.beginPath(); ctx.moveTo(hx - 0.2 * S, hy - 0.12 * S); ctx.quadraticCurveTo(hx - 0.02 * S, hy - 0.22 * S, hx + 0.17 * S, hy - 0.16 * S); ctx.stroke();
        for (const dx of [0.0, 0.14]) { P.forma(ctx, P.elipse(hx + dx * S, hy - 0.185 * S, 0.055 * S, 0.05 * S, 0, 16), { color: '#c9d9de', alfa: 0.7, semilla: s + 8, volumen: 0.4, borde: 0.3, irregular: 0, textura: 0, anchoBorde: 2, contorno: '#2a1b12', anchoContorno: S * 0.018 }); }
      } else if (casco === 'redondo') {
        const g = P.suavizar([[hx + 0.22 * S, hy - 0.1 * S], [hx + 0.12 * S, hy - 0.25 * S], [hx - 0.1 * S, hy - 0.28 * S], [hx - 0.25 * S, hy - 0.1 * S], [hx - 0.25 * S, hy - 0.02 * S], [hx + 0.2 * S, hy - 0.04 * S]], 4);
        const pc2 = P.forma(ctx, g, { color: '#d54a38', semilla: s + 7, volumen: 0.9, borde: 0.95, anchoBorde: 5, irregular: 0.3, textura: 0.1, sombraInterna: 0.5 });
        ctx.save(); ctx.clip(pc2); ctx.fillStyle = 'rgba(250,240,225,0.85)'; ctx.fillRect(hx - 0.04 * S, hy - 0.4 * S, 0.06 * S, 0.4 * S); ctx.restore();
        brillo(ctx, pc2, hx - 0.0 * S, hy - 0.2 * S, 0.1 * S, 0.03 * S, -0.2, 0.5);
      }
      // gotas de sudor en el susto
      if (ojos === 'susto') { for (let i = 0; i < 2; i++) { const k = (t * 1.5 + i * 0.5) % 1; ctx.fillStyle = 'rgba(190,225,245,' + (0.9 * (1 - k)) + ')'; ctx.beginPath(); ctx.ellipse(hx - 0.2 * S - i * 0.06 * S, hy - 0.1 * S + k * 0.14 * S, 0.014 * S, 0.026 * S, 0, 0, 7); ctx.fill(); } }
      ctx.restore();
      // agua por delante
      if (agua) {
        ctx.save(); ctx.translate(e.x, e.y);
        const w = S * 0.75, pts = [];
        for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([-w + 2 * w * u, -S * 0.065 + Math.sin(u * 12 + t * 2.2) * S * 0.008 + bob * 0.3]); }
        ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.lineTo(w, S * 0.1); ctx.lineTo(-w, S * 0.1); ctx.closePath();
        const gg = ctx.createLinearGradient(0, -S * 0.07, 0, S * 0.1); gg.addColorStop(0, 'rgba(120,160,180,0.55)'); gg.addColorStop(1, 'rgba(60,90,110,0.5)');
        ctx.fillStyle = gg; ctx.fill();
        ctx.strokeStyle = 'rgba(230,245,250,0.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
        ctx.restore();
      }
    });
  };
  R.patito = function (o) { return new Patito(o); };
  R.Patito = Patito;

  // ============================================================== helpers de animales
  // vientre claro: polígono entre el contorno inferior del tubo y una línea sobre el eje
  function vientre(pts, rad, frac, desde = 0, hasta = 1) {
    const m = pts.length, i0 = Math.floor(desde * (m - 1)), i1 = Math.ceil(hasta * (m - 1)), baja = [], sube = [];
    for (let i = i0; i <= i1; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)], th = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const nx = Math.sin(th), ny = -Math.cos(th);
      baja.push([pts[i][0] - nx * rad[i] * 0.99, pts[i][1] - ny * rad[i] * 0.99]);
      sube.push([pts[i][0] - nx * rad[i] * frac, pts[i][1] - ny * rad[i] * frac]);
    }
    return baja.concat(sube.reverse());
  }

  // ============================================================== TIBURÓN
  const TIBURON_POSES = {
    nada: { boca: 0.0, frec: 3.2, amp: 1, inc: 0.0 },
    ataca: { boca: 1.0, frec: 5.2, amp: 1.25, inc: -0.2 },
    acecha: { boca: 0.0, frec: 2.4, amp: 0.8, inc: 0.0, solo_aleta: true }
  };
  function Tiburon(o = {}) { this.o = Object.assign({ nombre: 'Tiburón', largo: 620, semilla: 51, color: '#6f8ea6', vientre: '#dfe6e8' }, o); this.poses = TIBURON_POSES; }
  Tiburon.prototype.dibujar = function (ctx, t, e) {
    return luzGuard(e, () => {
      const o = this.o, L = o.largo, dir = e.dir || 1, s = o.semilla;
      const nombre = typeof e.pose === 'string' || e.pose == null ? (e.pose || 'nada') : null;
      let q = nombre ? TIBURON_POSES[nombre] || TIBURON_POSES.nada : e.pose;
      if (e.pose2 != null) { const b = TIBURON_POSES[e.pose2], k = e.k || 0, r = {}; for (const c of ['boca', 'frec', 'amp', 'inc']) r[c] = I.lerp(q[c], b[c], k); r.solo_aleta = k < 0.5 ? q.solo_aleta : b.solo_aleta; q = r; }
      const boca = e.boca != null ? e.boca : q.boca, fase = t * q.frec, amp = q.amp;
      const col = o.color;
      ctx.save(); ctx.translate(e.x, e.y - (e.alto || 0)); ctx.rotate((e.inclinacion != null ? e.inclinacion : q.inc) * dir); ctx.scale(dir, 1);
      // eje y radios
      const n = 30, pts = [], rad = [];
      const sp = u => { // u: 0 cola .. 1 morro
        const a = L * 0.07 * amp * Math.sin(fase - u * 5.2) * Math.pow(1 - u, 1.4);
        return [(-0.5 + u) * L, a];
      };
      const perfil = u => { // radio relativo
        const v = Math.min(1, u / 0.62), w = u > 0.62 ? Math.pow(1 - (u - 0.62) / 0.38, 0.62) : Math.sin(v * PI / 2) ** 0.8 * 0.85 + 0.15 * v;
        return L * (0.02 + 0.092 * w * (u > 0.62 ? 1 : 1));
      };
      for (let i = 0; i < n; i++) { const u = i / (n - 1); pts.push(sp(u)); rad.push(Math.max(L * 0.012, perfil(u) * (u < 0.14 ? 0.55 + u * 3 : 1))); }
      const topAt = u => { const i = Math.round(u * (n - 1)); return [pts[i][0], pts[i][1] - rad[i]]; };
      const aTail = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) + PI; // dirección de la cola (hacia atrás)
      const solo = q.solo_aleta && e.pose2 == null && e.cuerpoVisible !== true;
      if (!solo) {
        // aleta pectoral lejana
        const pf = pts[Math.round(0.68 * (n - 1))];
        const aleta = (x, y, ang, k, c) => P.forma(ctx, P.suavizar([[x + L * 0.025 * k, y], [x - L * 0.015 * k, y + L * 0.07 * k], [x - L * 0.115 * k, y + L * 0.155 * k], [x - L * 0.1 * k, y + L * 0.06 * k], [x - L * 0.07 * k, y - L * 0.004]], 4), { color: c, semilla: s + 1, volumen: 0.8, borde: 0.7, anchoBorde: 4, irregular: 0.5, textura: 0.2 });
        aleta(pf[0] + L * 0.045, pf[1] + rad[Math.round(0.68 * (n - 1))] * 0.55, 0, 0.78, I.oscurece(col, 0.25));
        // cola (dos lóbulos)
        const t0 = pts[0], cx = t0[0], cy = t0[1];
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(aTail - PI);
        P.forma(ctx, P.suavizar([[L * 0.03, 0], [-L * 0.1, -L * 0.1], [-L * 0.2, -L * 0.2], [-L * 0.17, -L * 0.1], [-L * 0.13, 0], [-L * 0.17, L * 0.07], [-L * 0.22, L * 0.1], [-L * 0.09, L * 0.04]], 4), { color: col, semilla: s + 2, volumen: 0.85, borde: 0.9, anchoBorde: 4, irregular: 0.8, textura: 0.2, sombraInterna: 0.5 });
        ctx.restore();
        // cuerpo
        const cuerpo = tubo(pts, rad);
        const pc = P.forma(ctx, cuerpo, { color: col, semilla: s + 3, volumen: 0.9, borde: 0.95, anchoBorde: 6, irregular: 0.9, textura: 0.2, sombraInterna: 0.55 });
        const vi = vientre(pts, rad, 0.05, 0.12, 0.99);
        ctx.save(); ctx.clip(pc);
        P.forma(ctx, vi, { color: o.vientre, semilla: s + 4, volumen: 0.8, borde: 0.4, anchoBorde: 3, irregular: 1.2, textura: 0.2, sombraInterna: 0.2 });
        ctx.restore();
        // branquias
        ctx.save(); ctx.strokeStyle = I.css(I.oscurece(col, 0.5), 0.7); ctx.lineWidth = L * 0.005; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const u = 0.66 + i * 0.022, k = Math.round(u * (n - 1)), p0 = pts[k], r = rad[k]; ctx.beginPath(); ctx.moveTo(p0[0], p0[1] - r * 0.35); ctx.quadraticCurveTo(p0[0] - L * 0.012, p0[1], p0[0] + L * 0.004, p0[1] + r * 0.4); ctx.stroke(); }
        ctx.restore();
        brillo(ctx, pc, pts[Math.round(0.6 * (n - 1))][0], pts[Math.round(0.6 * (n - 1))][1] - rad[Math.round(0.6 * (n - 1))] * 0.6, L * 0.14, L * 0.012, 0.0, 0.3);
        // aleta pectoral cercana
        aleta(pf[0] + L * 0.0, pf[1] + rad[Math.round(0.68 * (n - 1))] * 0.72, 0, 1, col);
        // aleta pélvica
        const pv = pts[Math.round(0.34 * (n - 1))];
        P.forma(ctx, P.suavizar([[pv[0], pv[1] + rad[Math.round(0.34 * (n - 1))] * 0.8], [pv[0] - L * 0.05, pv[1] + L * 0.09], [pv[0] - L * 0.01, pv[1] + L * 0.06], [pv[0] + L * 0.03, pv[1] + rad[Math.round(0.34 * (n - 1))] * 0.8]], 3), { color: I.oscurece(col, 0.12), semilla: s + 5, volumen: 0.7, borde: 0.6, anchoBorde: 3, irregular: 0.4 });
      }
      // aleta dorsal
      const d0 = topAt(0.52), d1 = topAt(0.66), dh = L * (solo ? 0.19 : 0.15);
      P.forma(ctx, P.suavizar([[d0[0] + L * 0.01, d0[1] + L * 0.01], [d0[0] + L * 0.025, d0[1] - dh * 0.6], [d1[0] - L * 0.045, d0[1] - dh], [d1[0] - L * 0.02, d0[1] - dh * 0.55], [d1[0] + L * 0.015, d1[1] + L * 0.012]], 4), { color: col, semilla: s + 6, volumen: 0.85, borde: 0.95, anchoBorde: 5, irregular: 0.6, textura: 0.2, sombraInterna: 0.45 });
      if (!solo) {
        const d2 = topAt(0.26);
        P.forma(ctx, P.suavizar([[d2[0] + L * 0.03, d2[1] + L * 0.005], [d2[0] - L * 0.01, d2[1] - L * 0.045], [d2[0] - L * 0.05, d2[1] + L * 0.005]], 3), { color: I.oscurece(col, 0.1), semilla: s + 7, volumen: 0.7, borde: 0.7, irregular: 0.3, anchoBorde: 3 });
        // cabeza: ojo y boca
        const ne = pts[n - 1], re = rad[n - 1], k8 = Math.round(0.9 * (n - 1)), p8 = pts[k8], r8 = rad[k8];
        const eye = [p8[0] + L * 0.012, p8[1] - r8 * 0.25];
        ctx.fillStyle = I.css('#0f1114'); ctx.beginPath(); ctx.arc(eye[0], eye[1], L * 0.013, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(eye[0] + L * 0.004, eye[1] - L * 0.004, L * 0.004, 0, 7); ctx.fill();
        // boca
        const M = [pts[Math.round(0.84 * (n - 1))][0] - L * 0.02, pts[Math.round(0.84 * (n - 1))][1] + r8 * 0.25], Nn = [ne[0] - L * 0.003, ne[1] + re * 0.2];
        const gape = boca * L * 0.075;
        if (boca > 0.04) {
          const J = [Nn[0] - L * 0.02, Nn[1] + gape + L * 0.01];
          ctx.fillStyle = I.css('#4a1218'); ctx.beginPath(); ctx.moveTo(M[0], M[1]); ctx.quadraticCurveTo((M[0] + Nn[0]) / 2, M[1] - L * 0.002, Nn[0], Nn[1]); ctx.lineTo(J[0], J[1]); ctx.quadraticCurveTo((M[0] + J[0]) / 2, M[1] + gape * 0.9, M[0], M[1]); ctx.fill();
          ctx.fillStyle = I.css('#f2ece0');
          for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6, x = I.lerp(M[0] + L * 0.01, Nn[0] - L * 0.004, u), y = I.lerp(M[1], Nn[1], u) + 1; ctx.beginPath(); ctx.moveTo(x - L * 0.007, y); ctx.lineTo(x + L * 0.007, y); ctx.lineTo(x, y + L * 0.02 * (0.7 + 0.3 * Math.sin(i * 2.1))); ctx.fill(); }
          for (let i = 0; i < 5; i++) { const u = (i + 0.5) / 5, x = I.lerp(M[0] + L * 0.015, J[0] - L * 0.003, u), y = I.lerp(M[1] + gape * 0.5, J[1], u); ctx.beginPath(); ctx.moveTo(x - L * 0.006, y); ctx.lineTo(x + L * 0.006, y); ctx.lineTo(x, y - L * 0.017); ctx.fill(); }
          P.forma(ctx, [M, [M[0] + L * 0.04, M[1] + gape * 0.5 + L * 0.03], [J[0] + L * 0.01, J[1] + L * 0.012], J], { color: o.vientre, semilla: s + 8, volumen: 0.7, borde: 0.5, irregular: 0.4, anchoBorde: 2, alfa: 0.0 });
        } else {
          ctx.strokeStyle = I.css(I.oscurece(col, 0.65), 0.9); ctx.lineWidth = L * 0.005; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(M[0], M[1]); ctx.quadraticCurveTo((M[0] + Nn[0]) / 2, M[1] + L * 0.013, Nn[0], Nn[1] - L * 0.002); ctx.stroke();
        }
      }
      ctx.restore();
      // agua: línea de flotación opcional (parche con los bordes difuminados)
      if (e.agua) {
        const w = L * 0.8, yw = e.nivel != null ? e.nivel : solo_aguaNivel(q, L), hh = L * 0.5, au = I.capaAux('repartoAgua', Math.ceil(w * 2), Math.ceil(hh)), x = au.ctx;
        x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, au.canvas.width, au.canvas.height);
        const pts2 = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts2.push([2 * w * u, 10 + Math.sin(u * 20 + t * 2) * L * 0.006]); }
        x.beginPath(); pts2.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.lineTo(2 * w, hh); x.lineTo(0, hh); x.closePath();
        const gg = x.createLinearGradient(0, 0, 0, hh); gg.addColorStop(0, 'rgba(80,120,145,0.65)'); gg.addColorStop(1, 'rgba(30,55,75,0.0)'); x.fillStyle = gg; x.fill();
        x.strokeStyle = 'rgba(228,242,250,0.65)'; x.lineWidth = 3; x.beginPath(); pts2.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
        x.globalCompositeOperation = 'destination-in'; const hg = x.createLinearGradient(0, 0, 2 * w, 0); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.18, 'rgba(0,0,0,1)'); hg.addColorStop(0.82, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = hg; x.fillRect(0, 0, 2 * w, hh);
        x.globalCompositeOperation = 'source-over';
        ctx.drawImage(au.canvas, e.x - w, e.y - (e.alto || 0) + yw - 10);
      }
    });
  };
  function solo_aguaNivel(q, L) { return q.solo_aleta ? -L * 0.015 : -L * 0.2; }
  R.tiburon = function (o) { return new Tiburon(o); };
  R.Tiburon = Tiburon;

  // ============================================================== SERPIENTE
  const SERP_POSES = {
    repta: { alza: 0, boca: 0, frec: 3.0, amp: 1 },
    ataca: { alza: 1, boca: 1, frec: 4.5, amp: 0.8 },
    alerta: { alza: 1, boca: 0, frec: 2.0, amp: 0.6 }
  };
  function Serpiente(o = {}) { this.o = Object.assign({ nombre: 'Serpiente', largo: 520, semilla: 61, color: '#4b7a3a', dibujo: '#2a4a24', vientre: '#d8c98a' }, o); this.poses = SERP_POSES; }
  Serpiente.prototype.dibujar = function (ctx, t, e) {
    return luzGuard(e, () => {
      const o = this.o, L = o.largo, dir = e.dir || 1, s = o.semilla;
      let q = typeof e.pose === 'string' || e.pose == null ? (SERP_POSES[e.pose || 'repta'] || SERP_POSES.repta) : e.pose;
      if (e.pose2 != null) { const b = SERP_POSES[e.pose2], k = e.k || 0, r = {}; for (const c of ['alza', 'boca', 'frec', 'amp']) r[c] = I.lerp(q[c], b[c], k); q = r; }
      const alza = e.alza != null ? e.alza : q.alza, boca = e.boca != null ? e.boca : q.boca, fase = t * q.frec, amp = q.amp;
      const ataque = e.ataque || 0; // 0..1 embestida hacia delante
      if (e.sombraSuelo !== false) R.sombraSuelo(ctx, e.x, e.y, L * 0.5, 0.45);
      ctx.save(); ctx.translate(e.x, e.y - (e.alto || 0)); ctx.scale(dir, 1);
      // eje: cola en el suelo con ondulación, cuello que se alza en S
      const claves = [], nC = 40, pts = [], rad = [];
      const base = u => { // u 0 cola .. 1 cabeza
        const x0 = (-0.5 + u) * L * (1 - alza * 0.45 * u);
        const ond = Math.sin(fase * 1 - u * 14) * L * 0.028 * amp * (1 - alza * Math.pow(u, 1.5));
        return [x0, -L * 0.03 + ond];
      };
      for (let i = 0; i < nC; i++) {
        const u = i / (nC - 1);
        let p = base(u);
        if (alza > 0) {
          const k = I.clamp((u - 0.45) / 0.55, 0, 1), kk = k * k * (3 - 2 * k);
          p = [p[0] + L * 0.1 * Math.sin(kk * PI * 0.9) * alza * 0.8 + ataque * L * 0.25 * kk, p[1] - kk * L * 0.5 * alza + Math.sin(kk * PI) * L * 0.0];
        }
        pts.push(p);
        const r = L * (0.012 + 0.03 * Math.sin(Math.min(1, u / 0.7) * PI / 2 * 0.95 + 0.0) * (u > 0.86 ? 1 - (u - 0.86) * 3 : 1));
        rad.push(Math.max(L * 0.01, r));
      }
      // cola fina
      for (let i = 0; i < 6; i++) rad[i] *= 0.5 + i * 0.09;
      const cuerpo = tubo(pts, rad);
      const pc = P.forma(ctx, cuerpo, { color: o.color, semilla: s + 1, volumen: 0.95, borde: 0.95, anchoBorde: 5, irregular: 0.6, textura: 0.3, sombraInterna: 0.55 });
      ctx.save(); ctx.clip(pc);
      P.forma(ctx, vientre(pts, rad, -0.05, 0.05, 0.93), { color: o.vientre, semilla: s + 2, volumen: 0.7, borde: 0.2, irregular: 0.8, textura: 0.25, sombraInterna: 0.2, anchoBorde: 2 });
      // rombos del lomo
      for (let i = 4; i < nC - 5; i += 3) {
        const a = pts[i - 1], b = pts[i + 1], th = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = Math.sin(th), ny = -Math.cos(th), r = rad[i];
        const cx = pts[i][0] + nx * r * 0.35, cy = pts[i][1] + ny * r * 0.35;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(th); ctx.fillStyle = I.css(o.dibujo, 0.75);
        ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.lineTo(0, -r * 0.55); ctx.lineTo(r * 0.9, 0); ctx.lineTo(0, r * 0.55); ctx.closePath(); ctx.fill();
        ctx.fillStyle = I.css('#d8b23c', 0.7); ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, 7); ctx.fill(); ctx.restore();
      }
      ctx.restore();
      brillo(ctx, pc, pts[Math.round(nC * 0.5)][0], pts[Math.round(nC * 0.5)][1] - rad[Math.round(nC * 0.5)] * 0.55, L * 0.12, L * 0.006, 0.1, 0.3);
      // cabeza
      const hp = pts[nC - 1], hb = pts[nC - 3], th = Math.atan2(hp[1] - hb[1], hp[0] - hb[0]);
      const hr = L * 0.042;
      ctx.save(); ctx.translate(hp[0], hp[1]); ctx.rotate(th + (alza > 0.1 ? 0.5 * alza : 0));
      // mandíbula inferior (se abre)
      const ab = boca * L * 0.05;
      P.forma(ctx, P.suavizar([[-hr * 0.6, hr * 0.2], [hr * 1.1, hr * 0.35 + ab], [hr * 2.0, hr * 0.5 + ab * 1.1], [hr * 1.9, hr * 0.15 + ab * 0.7], [hr * 0.6, -hr * 0.05]], 3), { color: o.vientre, semilla: s + 3, volumen: 0.7, borde: 0.5, irregular: 0.3, anchoBorde: 3 });
      if (boca > 0.1) { ctx.fillStyle = I.css('#4a1218'); ctx.beginPath(); ctx.moveTo(hr * 0.2, hr * 0.1); ctx.lineTo(hr * 1.9, hr * 0.25); ctx.lineTo(hr * 1.9, hr * 0.5 + ab * 0.8); ctx.lineTo(hr * 0.3, hr * 0.4 + ab * 0.5); ctx.fill();
        // colmillo inferior y lengua
        ctx.fillStyle = I.css('#f4eee2'); ctx.beginPath(); ctx.moveTo(hr * 1.5, hr * 0.3 + ab * 0.2); ctx.lineTo(hr * 1.6, hr * 0.3 + ab * 0.2); ctx.lineTo(hr * 1.55, hr * 0.6 + ab * 0.45); ctx.fill();
        const lg = (Math.sin(t * 16) * 0.5 + 0.5) * hr * 0.4; ctx.strokeStyle = I.css('#d63a4a'); ctx.lineWidth = Math.max(2, hr * 0.12); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hr * 1.7, hr * 0.35 + ab * 0.2); ctx.lineTo(hr * 2.5 + lg, hr * 0.4 + ab * 0.35); ctx.moveTo(hr * 2.5 + lg, hr * 0.4 + ab * 0.35); ctx.lineTo(hr * 2.9 + lg, hr * 0.25 + ab * 0.2); ctx.moveTo(hr * 2.5 + lg, hr * 0.4 + ab * 0.35); ctx.lineTo(hr * 2.9 + lg, hr * 0.6 + ab * 0.5); ctx.stroke(); }
      const cr = P.forma(ctx, P.suavizar([[-hr * 0.9, -hr * 0.1], [-hr * 0.5, -hr * 0.95], [hr * 0.6, -hr * 1.0], [hr * 1.7, -hr * 0.55], [hr * 2.15, hr * 0.0], [hr * 2.0, hr * 0.25], [hr * 0.8, hr * 0.2], [-hr * 0.5, hr * 0.55]], 4), { color: o.color, semilla: s + 4, volumen: 0.95, borde: 0.95, anchoBorde: 4, irregular: 0.4, textura: 0.3, sombraInterna: 0.5 });
      brillo(ctx, cr, hr * 0.4, -hr * 0.65, hr * 0.7, hr * 0.12, 0.05, 0.35);
      // colmillo superior
      if (boca > 0.1) { ctx.fillStyle = I.css('#f4eee2'); ctx.beginPath(); ctx.moveTo(hr * 1.55, hr * 0.2); ctx.lineTo(hr * 1.68, hr * 0.2); ctx.lineTo(hr * 1.6, hr * 0.62); ctx.fill(); }
      // ojo de pupila rasgada
      P.forma(ctx, P.elipse(hr * 0.95, -hr * 0.32, hr * 0.34, hr * 0.3, 0, 16), { color: '#e6c53b', semilla: s + 5, volumen: 0.4, borde: 0.3, irregular: 0, textura: 0, anchoBorde: 2, contorno: '#1a1a12', anchoContorno: 1.5 });
      ctx.fillStyle = I.css('#111'); ctx.beginPath(); ctx.ellipse(hr * 1.0, -hr * 0.32, hr * 0.07, hr * 0.26, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = I.css('#1a2a16', 0.8); ctx.lineWidth = Math.max(2, hr * 0.12); ctx.beginPath(); ctx.moveTo(hr * 0.55, -hr * 0.62); ctx.lineTo(hr * 1.4, -hr * 0.5); ctx.stroke();
      ctx.restore();
      ctx.restore();
    });
  };
  R.serpiente = function (o) { return new Serpiente(o); };
  R.Serpiente = Serpiente;
})(window);
