// "Tu diamante es publicidad" — Sombra de Evidencia. Tito llega con algo cotidiano y Sombra le revela su origen.
// Personajes y oficina fijos de S30 (plantilla/sombra.js); aquí solo las piezas de este tema.
(() => {
  const { W, H, TAU, clamp, lerp, prog, sale, rebote, hash, azar, alfa, mezcla } = K;
  const C = S30.C;

  // ---- piezas del tema ----
  // Diamante de talla brillante (corona + pabellón), con destello. oro: 0-1 lo tiñe de dorado.
  function diamante(ctx, x, y, r, T, { oro = 0, brillo = 1, gira = 0 } = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(Math.cos(gira) * .25 + .75, 1);
    const cara = mezcla(C.papel, C.oro, oro), sombra = mezcla(C.claro, '#a8874f', oro);
    ctx.beginPath(); ctx.moveTo(-r, -r * .2); ctx.lineTo(-r * .55, -r * .62); ctx.lineTo(r * .55, -r * .62); ctx.lineTo(r, -r * .2); ctx.closePath(); S30.relleno(ctx, cara, Math.max(2, r * .08));
    ctx.beginPath(); ctx.moveTo(-r, -r * .2); ctx.lineTo(0, r * .9); ctx.lineTo(r, -r * .2); ctx.closePath(); S30.relleno(ctx, sombra, Math.max(2, r * .08));
    ctx.strokeStyle = C.tinta; ctx.lineWidth = Math.max(1.5, r * .05);
    ctx.beginPath(); ctx.moveTo(-r * .55, -r * .62); ctx.lineTo(-r * .3, -r * .2); ctx.lineTo(0, -r * .62); ctx.lineTo(r * .3, -r * .2); ctx.lineTo(r * .55, -r * .62);
    ctx.moveTo(-r * .3, -r * .2); ctx.lineTo(0, r * .9); ctx.lineTo(r * .3, -r * .2); ctx.stroke();
    ctx.restore();
    if (brillo > 0) destello(ctx, x + r * .45, y - r * .55, r * .45, brillo * Math.max(0, Math.sin(T * 3 + x * .01)));
  }
  function destello(ctx, x, y, r, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fffaf0'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .2 : r, an = i * Math.PI / 4; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    ctx.fill(); ctx.restore();
  }
  function anillo(ctx, x, y, s, T, { oro = 1 } = {}) {
    if (oro > .5) K.halo(ctx, x, y - 20 * s, 90 * s, C.oro, .35 * oro);
    ctx.beginPath(); ctx.ellipse(x, y, 40 * s, 34 * s, 0, 0, TAU); ctx.strokeStyle = mezcla('#5f5850', C.oro, oro); ctx.lineWidth = 11 * s; ctx.stroke();
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 2.5 * s; ctx.stroke();
    diamante(ctx, x, y - 46 * s, 22 * s, T);
  }
  // Fondo del flashback: papel envejecido oscuro con un foco de luz.
  function pasado(ctx, T, { x = 540, y = 700 } = {}) {
    K.fondo(ctx, '#3a352f', '#14120f', '#26221d');
    K.halo(ctx, x, y, 700, '#efe7d6', .12);
  }
  const ano = (ctx, txt, t, y = 420, tam = 64) => S30.titulo(ctx, txt, 540, y, { tam, opacidad: prog(t, .05, .4) });
  const pastilla = (ctx, txt, x, y, a, oro = false) =>
    K.pastilla(ctx, txt, x, y, { tam: 36, fondo: oro ? C.oro : C.papel, color: C.tinta, opacidad: a, escala: rebote(a) });
  const zoom = (ctx, t, d, cx, cy, z0, z1, fn) => K.camara(ctx, cx, cy, lerp(z0, z1, prog(t, 0, d)), fn);
  function mujer(ctx, x, y, s, T) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-40, -300); ctx.quadraticCurveTo(-30, -150, -110, 0); ctx.lineTo(110, 0); ctx.quadraticCurveTo(30, -150, 40, -300); ctx.closePath();
    S30.relleno(ctx, C.tinta, 0);
    ctx.fillStyle = 'rgba(239,231,214,.12)'; ctx.beginPath(); ctx.moveTo(10, -280); ctx.quadraticCurveTo(20, -140, 70, -10); ctx.lineTo(90, -10); ctx.quadraticCurveTo(40, -150, 30, -290); ctx.fill();
    S30.mangueraBlanca(ctx, 34, -280, 120, -380 + Math.sin(T * 2) * 6, -20, 16);
    S30.guante(ctx, 120, -384 + Math.sin(T * 2) * 6, 20, -.4);
    diamante(ctx, 126, -412 + Math.sin(T * 2) * 6, 14, T);
    ctx.beginPath(); ctx.ellipse(0, -350, 46, 52, 0, 0, TAU); S30.relleno(ctx, C.papel, 5);
    ctx.beginPath(); ctx.ellipse(-6, -392, 60, 34, -.2, Math.PI, TAU); ctx.fillStyle = C.tinta; ctx.fill();
    ctx.beginPath(); ctx.arc(-44, -360, 26, 0, TAU); ctx.fill();
    S30.ojo(ctx, 6, -356, 8, 14, { abre: .55, mira: .4 }); S30.ojo(ctx, 26, -356, 8, 14, { abre: .55, mira: .4 });
    ctx.beginPath(); ctx.ellipse(20, -326, 10, 6, 0, 0, TAU); ctx.fillStyle = '#8a2f2a'; ctx.fill();
    ctx.restore();
  }
  function grilla(ctx, n, dorados, t, T, { cols = 5, x0 = 190, y0 = 520, paso = 175, r = 46, ritmo = .12, aro = false } = {}) {
    for (let i = 0; i < n; i++) {
      const x = x0 + (i % cols) * paso, y = y0 + Math.floor(i / cols) * paso * .82;
      const k = clamp((dorados - i) * 1) * clamp((t - .2 - i * ritmo) / .3);
      if (aro) anillo(ctx, x, y + 20, r / 46, T, { oro: k });
      else diamante(ctx, x, y, r, T, { oro: k, brillo: k });
    }
  }
  const oficinaCon = (ctx, T, fn) => { S30.oficina(ctx, T); fn(); };

  window.ESCENAS = [
    // 1. Tito llega orgulloso con la cajita (la portada va abajo, y=860-1240).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      zoom(ctx, t, d, 540, 900, 1.05, 1.15, () => oficinaCon(ctx, T, () =>
        S30.tito(ctx, lerp(760, 560, sale(prog(t, 0, d * .6))), 1250, 1.45, { T, dir: -1, paso: t < d * .6 ? T * 2.6 : null, caja: 0, mira: -.4 })));
      S30.pelicula(ctx, T);
    },
    // 2. Abre la cajita: dos sueldos.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      zoom(ctx, t, d, 540, 920, 1.25, 1.55, () => oficinaCon(ctx, T, () =>
        S30.tito(ctx, 540, 1240, 1.2, { T, caja: prog(t, d * .2, d * .5), boca: 'habla', mira: .2 })));
      pastilla(ctx, '2 SUELDOS', 540, 440, prog(t, d * .45, d * .45 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 3. Sombra, detrás del escritorio: "eso no lo decidiste tú".
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficinaCon(ctx, T, () => {
        S30.detective(ctx, 330, 1180, 1.02, { T, mira: .6, boca: 'sonrisa' });
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 820, 1240, .82, { T, dir: -1, caja: 1, mira: -.6, boca: 'o' });
      });
      S30.pelicula(ctx, T);
    },
    // 4. Primer plano de Sombra bajo el foco.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      zoom(ctx, t, d, 360, 640, 1.9, 2.3, () => oficinaCon(ctx, T, () => {
        S30.detective(ctx, 330, 1180, 1.02, { T, mira: .9, boca: 'sonrisa' });
        S30.escritorio(ctx, T, { y: 960 });
      }));
      ano(ctx, 'HACE CASI 100 AÑOS', t, 380, 52);
      S30.pelicula(ctx, T);
    },
    // 5. 1870, Sudáfrica: la mina gigante.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T, { y: 500 });
      zoom(ctx, t, d, 540, 820, 1, 1.15, () => {
        for (let i = 0; i < 7; i++) {
          ctx.beginPath(); ctx.ellipse(540, 760 + i * 40, 470 - i * 58, 230 - i * 30, 0, 0, TAU);
          S30.relleno(ctx, i % 2 ? '#4a443c' : '#6f685f', 5);
        }
        ctx.beginPath(); ctx.ellipse(540, 1040, 70, 30, 0, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill();
        for (let i = 0; i < 14; i++) {
          const a = hash(i) * TAU, nivel = Math.floor(hash(i + 3) * 6), rx = 470 - nivel * 58, ry = 230 - nivel * 30;
          const px = 540 + Math.cos(a) * rx * .92, py = 760 + nivel * 40 + Math.sin(a) * ry * .92 + 10;
          ctx.fillStyle = C.tinta; ctx.beginPath(); ctx.arc(px, py - 24, 8, 0, TAU); ctx.fill(); ctx.fillRect(px - 6, py - 18, 12, 22);
          const golpe = Math.sin(T * 6 + i) * .6; ctx.strokeStyle = C.tinta; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(px, py - 14); ctx.lineTo(px + Math.cos(golpe - 1) * 22, py - 14 + Math.sin(golpe - 1) * 22); ctx.stroke();
        }
      });
      ano(ctx, '1870 · SUDÁFRICA', t);
      S30.pelicula(ctx, T);
    },
    // 6. Tantos diamantes que el precio iba a caer.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      const r = azar(7), n = Math.round(lerp(6, 40, prog(t, 0, d * .7)));
      for (let i = 0; i < 40; i++) {
        if (i >= n) break;
        const fila = Math.floor(Math.sqrt(i * 2)), x = 540 + (r() - .5) * (720 - fila * 70), y = 1180 - fila * 62 - r() * 24;
        diamante(ctx, x, y, 50, T, { brillo: .4 });
      }
      const k = prog(t, d * .3, d * .95), pts = [[150, 380], [330, 420], [520, 520], [700, 700], [880, 860]];
      const vis = K.ruta(pts, 40).slice(0, Math.max(2, Math.round(k * 40)));
      K.trazo(ctx, vis, C.oro, 12);
      const [ux, uy] = vis[vis.length - 1];
      ctx.save(); ctx.translate(ux, uy); ctx.rotate(.75); ctx.fillStyle = C.oro; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-14, -22); ctx.lineTo(-14, 22); ctx.fill(); ctx.restore();
      pastilla(ctx, 'PRECIO', 230, 330, prog(t, .1, .4));
      S30.pelicula(ctx, T);
    },
    // 7. Una sola empresa compra las minas, una a una.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      for (let i = 0; i < 6; i++) {
        const x = 270 + (i % 2) * 540 * .9, y = 470 + Math.floor(i / 2) * 250, x2 = i % 2 ? 790 : 290;
        ctx.beginPath(); ctx.ellipse(x2, y + 40, 170, 70, 0, 0, TAU); S30.relleno(ctx, '#4a443c', 5);
        ctx.beginPath(); ctx.ellipse(x2, y + 50, 100, 38, 0, 0, TAU); S30.relleno(ctx, '#2a2622', 4);
        S30.titulo(ctx, `MINA ${i + 1}`, x2, y - 60, { tam: 30, color: C.claro });
        const sello = clamp((t - d * .15 - i * d * .12) / .25);
        if (sello > 0) {
          ctx.save(); ctx.translate(x2, y + 30); ctx.rotate(-.2); ctx.scale(lerp(2.2, 1, sale(sello)), lerp(2.2, 1, sale(sello))); ctx.globalAlpha = sello;
          ctx.strokeStyle = C.oro; ctx.lineWidth = 7; K.redondo(ctx, -110, -34, 220, 68, 10); ctx.stroke();
          ctx.font = `700 40px Cinzel, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.oro; ctx.fillText('COMPRADA', 0, 3);
          ctx.restore();
        }
        void x;
      }
      S30.pelicula(ctx, T);
    },
    // 8. Se llamaba De Beers.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T, { y: 500 });
      zoom(ctx, t, d, 540, 760, 1.15, 1, () => {
        ctx.fillStyle = '#5f5850'; ctx.beginPath(); ctx.moveTo(140, 520); ctx.lineTo(540, 380); ctx.lineTo(940, 520); ctx.closePath(); S30.relleno(ctx, '#6f685f', 7);
        ctx.fillStyle = '#4a443c'; ctx.fillRect(160, 520, 760, 70); ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.strokeRect(160, 520, 760, 70);
        for (let i = 0; i < 6; i++) { const cx = 210 + i * 132; ctx.fillStyle = C.claro; ctx.fillRect(cx, 590, 56, 420); ctx.strokeRect(cx, 590, 56, 420); }
        ctx.fillStyle = '#3a352f'; ctx.fillRect(140, 1010, 800, 40); ctx.strokeRect(140, 1010, 800, 40);
        S30.hombre(ctx, 420, 1210, .8, { T, semilla: 3, gesto: 'apreton', cara: 'sonrisa' });
        S30.hombre(ctx, 660, 1210, .8, { T, semilla: 8, dir: -1, gesto: 'apreton', cara: 'sonrisa' });
      });
      const a = prog(t, .1, .5);
      ctx.save(); ctx.globalAlpha = a; ctx.font = '700 120px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 20; ctx.fillStyle = C.oro; ctx.fillText('DE BEERS', 540, 330); ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 9. Nueve de cada diez diamantes.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      grilla(ctx, 10, 9, t, T, { cols: 5, x0: 180, y0: 640, paso: 180, r: 58, ritmo: d * .06 });
      pastilla(ctx, '9 DE CADA 10', 540, 420, prog(t, d * .65, d * .65 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 10. La bóveda: guardar muchos, soltar pocos.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      ctx.fillStyle = '#26221d'; ctx.fillRect(140, 380, 800, 760);
      for (let f = 0; f < 4; f++) {
        ctx.fillStyle = C.tinta; ctx.fillRect(160, 520 + f * 170, 760, 14);
        for (let i = 0; i < 9; i++) diamante(ctx, 210 + i * 84, 496 + f * 170, 26, T, { brillo: .3 });
      }
      const abre = sale(prog(t, 0, d * .5));
      ctx.save(); ctx.translate(140, 760); ctx.scale(lerp(1, .12, abre), 1);
      ctx.beginPath(); ctx.arc(400, 0, 390, 0, TAU); S30.relleno(ctx, '#6f685f', 10);
      ctx.beginPath(); ctx.arc(400, 0, 300, 0, TAU); S30.relleno(ctx, '#5f5850', 6);
      ctx.save(); ctx.translate(400, 0); ctx.rotate(T * .8); ctx.strokeStyle = C.tinta; ctx.lineWidth = 16;
      for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(120, 0); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU); ctx.fillStyle = C.oro; ctx.fill(); ctx.restore();
      ctx.restore();
      for (let i = 0; i < 2; i++) { const k = clamp((t - d * .55 - i * .4) / .7); if (k > 0) diamante(ctx, 540 + i * 70, lerp(1100, 1210, sale(k)), 30, T); }
      pastilla(ctx, 'SOLO UNOS POCOS', 540, 330, prog(t, d * .6, d * .6 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 11. Escasos en la vitrina, abundantes en la bodega.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      ctx.fillStyle = '#1c1915'; ctx.fillRect(110, 330, 860, 380); ctx.strokeStyle = C.oro; ctx.lineWidth = 8; ctx.strokeRect(110, 330, 860, 380);
      const g = ctx.createLinearGradient(0, 330, 0, 710); g.addColorStop(0, alfa(C.oro, .22)); g.addColorStop(1, alfa(C.oro, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(500, 330); ctx.lineTo(580, 330); ctx.lineTo(700, 700); ctx.lineTo(380, 700); ctx.fill();
      ctx.beginPath(); ctx.ellipse(540, 640, 120, 30, 0, 0, TAU); ctx.fillStyle = '#5a1f1a'; ctx.fill();
      diamante(ctx, 540, 590, 48, T, { gira: T * 1.5 });
      pastilla(ctx, 'VITRINA', 540, 300, prog(t, .1, .4), true);
      ctx.fillStyle = '#2a2622'; ctx.fillRect(110, 780, 860, 400);
      const llena = prog(t, d * .4, d * .9);
      for (let f = 0; f < 3; f++) {
        ctx.fillStyle = C.tinta; ctx.fillRect(110, 900 + f * 120, 860, 12);
        for (let i = 0; i < 14; i++) if ((f * 14 + i) / 42 < llena) diamante(ctx, 150 + i * 60, 880 + f * 120, 20, T, { brillo: 0 });
      }
      pastilla(ctx, 'BODEGA', 540, 770, prog(t, d * .4, d * .4 + .3));
      S30.pelicula(ctx, T);
    },
    // 12. 1938: casi nadie compraba.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      zoom(ctx, t, d, 540, 860, 1.1, 1, () => {
        S30.hombre(ctx, 540, 1150, .95, { T, semilla: 12 });
        ctx.fillStyle = '#3d362f'; ctx.fillRect(100, 900, 880, 40); ctx.fillStyle = '#231f1b'; ctx.fillRect(100, 940, 880, 260);
        ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.strokeRect(100, 900, 880, 300);
        ctx.fillStyle = 'rgba(207,198,180,.15)'; ctx.fillRect(160, 960, 760, 120);
        ctx.save(); ctx.translate(800, 560 + Math.sin(T * 1.5) * 4); ctx.rotate(Math.sin(T * 1.5) * .06);
        ctx.strokeStyle = C.tinta; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-60, -120); ctx.lineTo(0, -60); ctx.lineTo(60, -120); ctx.stroke();
        ctx.fillStyle = C.papel; ctx.fillRect(-110, -60, 220, 90); ctx.strokeRect(-110, -60, 220, 90);
        ctx.font = '700 40px Cinzel, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.tinta; ctx.fillText('VACÍO', 0, -14);
        ctx.restore();
        for (let i = 0; i < 3; i++) { const x = 160 + ((T * 30 + i * 300) % 760); ctx.fillStyle = 'rgba(207,198,180,.25)'; ctx.beginPath(); ctx.arc(x, 1250 - i * 6, 18, 0, TAU); ctx.fill(); }
      });
      ano(ctx, '1938', t, 400, 90);
      S30.pelicula(ctx, T);
    },
    // 13. La agencia de publicidad.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T, { y: 520 });
      ctx.fillStyle = C.papel; ctx.fillRect(360, 360, 360, 260); ctx.strokeStyle = C.tinta; ctx.lineWidth = 7; ctx.strokeRect(360, 360, 360, 260);
      ctx.beginPath(); ctx.moveTo(400, 640); ctx.lineTo(380, 760); ctx.moveTo(680, 640); ctx.lineTo(700, 760); ctx.stroke();
      const dibuja = prog(t, d * .2, d * .8);
      ctx.save(); ctx.beginPath(); ctx.rect(360, 360, 360 * dibuja, 260); ctx.clip();
      ctx.beginPath(); ctx.moveTo(540, 580); ctx.bezierCurveTo(420, 500, 420, 400, 540, 450); ctx.bezierCurveTo(660, 400, 660, 500, 540, 580);
      ctx.strokeStyle = '#8a2f2a'; ctx.lineWidth = 8; ctx.stroke();
      diamante(ctx, 540, 500, 30, T, { brillo: 0 });
      ctx.restore();
      for (let i = 0; i < 4; i++) S30.hombre(ctx, 200 + i * 230, 1180, .82, { T, semilla: 20 + i, dir: i < 2 ? 1 : -1, gesto: i === 1 ? 'senala' : 'quieto', cara: i === 2 ? 'sonrisa' : 'serio' });
      ctx.fillStyle = '#3d362f'; ctx.fillRect(60, 1080, 960, 30); ctx.fillStyle = '#231f1b'; ctx.fillRect(60, 1110, 960, 140);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.strokeRect(60, 1080, 960, 170);
      pastilla(ctx, 'AGENCIA DE PUBLICIDAD', 540, 300, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 14. El amor medido en diamantes: el corazón se transforma.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      const k = sale(prog(t, d * .25, d * .75)), lat = 1 + Math.pow(Math.max(0, Math.sin(T * 5)), 8) * .08 * (1 - k);
      ctx.save(); ctx.translate(540, 720); ctx.scale(lat, lat);
      ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.moveTo(0, 220); ctx.bezierCurveTo(-320, 20, -260, -260, 0, -120); ctx.bezierCurveTo(260, -260, 320, 20, 0, 220);
      S30.relleno(ctx, '#8a2f2a', 10);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = k; diamante(ctx, 540, 700, 230 * lerp(.6, 1, k), T, { oro: .25 }); ctx.restore();
      if (k > .8) K.halo(ctx, 540, 700, 420, C.oro, .3 * (k - .8) * 5);
      S30.pelicula(ctx, T);
    },
    // 15. Joyas prestadas a estrellas de cine.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T, { x: 720, y: 760 });
      const g = ctx.createLinearGradient(160, 420, 760, 900); g.addColorStop(0, alfa(C.papel, .35)); g.addColorStop(1, alfa(C.papel, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(150, 400); ctx.lineTo(220, 360); ctx.lineTo(960, 900); ctx.lineTo(560, 1200); ctx.fill();
      ctx.fillStyle = C.tinta; ctx.beginPath(); ctx.ellipse(170, 390, 60, 46, -.6, 0, TAU); ctx.fill();
      mujer(ctx, 720, 1200, 1.15, T);
      ctx.save(); ctx.translate(250, 860);
      ctx.strokeStyle = C.tinta; ctx.lineWidth = 10; for (const a of [-.35, 0, .35]) { ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(Math.sin(a) * 200, 380); ctx.stroke(); }
      K.redondo(ctx, -110, -40, 200, 120, 14); S30.relleno(ctx, '#2a2622', 6);
      for (const [rx, ry] of [[-60, -110], [40, -110]]) {
        ctx.save(); ctx.translate(rx, ry); ctx.rotate(T * 3); ctx.beginPath(); ctx.arc(0, 0, 56, 0, TAU); S30.relleno(ctx, '#3a352f', 6);
        ctx.fillStyle = C.tinta; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * TAU / 5) * 30, Math.sin(i * TAU / 5) * 30, 10, 0, TAU); ctx.fill(); } ctx.restore();
      }
      ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(170, -30); ctx.lineTo(170, 50); ctx.lineTo(90, 30); ctx.closePath(); S30.relleno(ctx, '#3a352f', 6);
      ctx.restore();
      pastilla(ctx, 'HOLLYWOOD', 720, 340, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 16. 1947: la máquina de escribir.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      const texto = 'A DIAMOND IS FOREVER', n = Math.floor(texto.length * prog(t, d * .15, d * .95));
      zoom(ctx, t, d, 540, 760, 1, 1.12, () => {
        ctx.fillStyle = C.papel; ctx.fillRect(250, 360, 580, 420); ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.strokeRect(250, 360, 580, 420);
        ctx.font = '400 40px "Space Mono", monospace'; ctx.fillStyle = C.tinta; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        ctx.fillText(texto.slice(0, n), 290, 520);
        if (Math.sin(T * 10) > 0) ctx.fillRect(290 + ctx.measureText(texto.slice(0, n)).width + 4, 500, 4, 40);
        K.redondo(ctx, 150, 740, 780, 90, 30); S30.relleno(ctx, '#2a2622', 7);
        K.redondo(ctx, 110, 820, 860, 300, 40); S30.relleno(ctx, C.tinta, 0);
        for (let f = 0; f < 3; f++) for (let i = 0; i < 10 - f; i++) {
          const x = 220 + f * 34 + i * 70, y = 880 + f * 70, tecla = n > 0 && hash(n + i + f) < .12;
          ctx.beginPath(); ctx.arc(x, y + (tecla ? 6 : 0), 26, 0, TAU); S30.relleno(ctx, C.papel, 4);
        }
      });
      ano(ctx, '1947', t, 300, 80);
      S30.pelicula(ctx, T);
    },
    // 17. La frase.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T, .5);
      ctx.fillStyle = C.tinta; ctx.fillRect(-20, -20, W + 40, H + 40);
      K.halo(ctx, 540, 640, 620, C.oro, .25 * prog(t, 0, .6));
      diamante(ctx, 540, 520, 110, T, { gira: T * 1.4, oro: .15 });
      const a = prog(t, .15, .7), s = lerp(1.15, 1, sale(a));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(540, 860); ctx.scale(s, s);
      ctx.font = '700 104px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.oro;
      ctx.fillText('Un diamante', 0, -70); ctx.fillText('es para siempre', 0, 40);
      ctx.restore();
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
    // 18. Nunca lo vendas: el cajón con candado.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      const cierra = sale(prog(t, d * .2, d * .6));
      ctx.fillStyle = '#3d362f'; ctx.fillRect(140, 560, 800, 520); ctx.strokeStyle = C.tinta; ctx.lineWidth = 8; ctx.strokeRect(140, 560, 800, 520);
      const dy = lerp(240, 0, cierra);
      ctx.save(); ctx.translate(0, dy);
      ctx.fillStyle = '#231f1b'; ctx.fillRect(200, 700, 680, 140);
      anillo(ctx, 540, 760, 1.3, T);
      ctx.fillStyle = '#4a443c'; ctx.fillRect(180, 840, 720, 200); ctx.strokeRect(180, 840, 720, 200);
      ctx.beginPath(); ctx.ellipse(540, 940, 60, 22, 0, 0, TAU); S30.relleno(ctx, C.oro, 5);
      ctx.restore();
      const cand = prog(t, d * .65, d * .8);
      if (cand > 0) {
        ctx.save(); ctx.translate(540, 900); ctx.scale(rebote(cand), rebote(cand));
        ctx.beginPath(); ctx.arc(0, -50, 52, Math.PI, 0); ctx.strokeStyle = C.claro; ctx.lineWidth = 18; ctx.stroke();
        K.redondo(ctx, -78, -50, 156, 130, 22); S30.relleno(ctx, C.tinta, 0);
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fillStyle = C.oro; ctx.fill(); ctx.fillRect(-6, 4, 12, 40);
        ctx.restore();
      }
      pastilla(ctx, 'NUNCA LO VENDAS', 540, 420, prog(t, d * .3, d * .3 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 19. Si todos revendieran, el precio se derrumbaría.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T, { y: 600 });
      ctx.fillStyle = '#4a443c'; ctx.fillRect(640, 420, 340, 520); ctx.strokeStyle = C.tinta; ctx.lineWidth = 7; ctx.strokeRect(640, 420, 340, 520);
      ctx.fillStyle = C.tinta; ctx.fillRect(740, 700, 140, 240);
      S30.titulo(ctx, 'COMPRAMOS', 810, 480, { tam: 34, color: C.papel });
      for (let i = 0; i < 6; i++) {
        const x = lerp(-80 - i * 120, 560 - i * 92, sale(prog(t, 0, d * .8))), y = 1180 + (i % 2) * 40;
        S30.hombre(ctx, x, y, .6, { T, semilla: 40 + i, gesto: 'senala' });
      }
      const caida = prog(t, d * .45, d * .95), pts = K.ruta([[160, 380], [300, 400], [420, 560], [540, 820]], 30);
      K.trazo(ctx, pts.slice(0, Math.max(2, Math.round(caida * 30))), '#C2503A', 12);
      S30.pelicula(ctx, T);
    },
    // 20. Al revender te ofrecen mucho menos.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      const parte = sale(prog(t, d * .35, d * .7));
      const etiqueta = (dx, rot, txt, sub) => {
        ctx.save(); ctx.translate(540 + dx, 740); ctx.rotate(rot);
        ctx.beginPath(); ctx.moveTo(-200, -120); ctx.lineTo(160, -120); ctx.lineTo(240, 0); ctx.lineTo(160, 120); ctx.lineTo(-200, 120); ctx.closePath();
        S30.relleno(ctx, C.papel, 8);
        ctx.beginPath(); ctx.arc(150, 0, 18, 0, TAU); ctx.fillStyle = C.tinta; ctx.fill();
        ctx.font = '700 64px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.tinta; ctx.fillText(txt, -30, -16);
        ctx.font = '700 30px Cinzel, serif'; ctx.fillStyle = '#5a1f1a'; ctx.fillText(sub, -30, 54);
        ctx.restore();
      };
      if (parte < .05) etiqueta(0, 0, '$$$$', 'PAGASTE');
      else {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 540, H); ctx.clip(); etiqueta(-parte * 60, -parte * .15, '$$$$', 'PAGASTE'); ctx.restore();
        ctx.save(); ctx.beginPath(); ctx.rect(540, 0, 540, H); ctx.clip(); ctx.translate(parte * 80, parte * 260); etiqueta(0, parte * .5, '$$$$', 'PAGASTE'); ctx.restore();
      }
      pastilla(ctx, 'TE OFRECEN MUCHO MENOS', 540, 1080, prog(t, d * .6, d * .6 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 21. Tito pregunta por los dos sueldos.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficinaCon(ctx, T, () => {
        S30.detective(ctx, 290, 1180, 1.02, { T, mira: .7 });
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 790, 1240, 1.0, { T, dir: -1, caja: 1, boca: 'habla', mira: -.7 });
      });
      S30.pelicula(ctx, T);
    },
    // 22. El anuncio de periódico de los años ochenta.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      zoom(ctx, t, d, 540, 760, .95, 1.1, () => {
        ctx.save(); ctx.translate(540, 760); ctx.rotate(-.05 + Math.sin(T) * .01);
        ctx.fillStyle = '#e2d8c4'; ctx.fillRect(-380, -440, 760, 860); ctx.strokeStyle = C.tinta; ctx.lineWidth = 6; ctx.strokeRect(-380, -440, 760, 860);
        ctx.fillStyle = C.tinta; ctx.fillRect(-340, -400, 680, 10); ctx.fillRect(-340, 360, 680, 6);
        ctx.font = '700 66px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('¿Dos meses de sueldo?', 0, -320);
        ctx.font = '400 30px "Space Mono", monospace'; ctx.fillText('Un precio pequeño', 0, -250); ctx.fillText('para algo que dura para siempre', 0, -210);
        anillo(ctx, 0, 60, 3.2, T);
        ctx.fillStyle = 'rgba(13,12,11,.3)'; for (let i = 0; i < 5; i++) ctx.fillRect(-340, 250 + i * 20, 300 + hash(i) * 380, 8);
        ctx.restore();
      });
      ano(ctx, 'AÑOS 80', t, 300, 60);
      S30.pelicula(ctx, T);
    },
    // 23. Japón 1967: casi ninguna.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      grilla(ctx, 20, 1, t, T, { cols: 5, x0: 200, y0: 560, paso: 170, r: 46, aro: true, ritmo: .05 });
      ano(ctx, 'JAPÓN · 1967', t, 400, 64);
      S30.pelicula(ctx, T);
    },
    // 24. 1981: seis de cada diez.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      pasado(ctx, T);
      grilla(ctx, 20, 1 + Math.round(11 * prog(t, .2, d * .8)), t, T, { cols: 5, x0: 200, y0: 560, paso: 170, r: 46, aro: true, ritmo: 0 });
      ano(ctx, 'JAPÓN · 1981', t, 400, 64);
      pastilla(ctx, '6 DE CADA 10', 540, 1170, prog(t, d * .7, d * .7 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 25. La lección de Sombra.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      zoom(ctx, t, d, 520, 860, 1.15, 1.35, () => oficinaCon(ctx, T, () => {
        S30.detective(ctx, 330, 1180, 1.02, { T, mira: .8, boca: 'sonrisa' });
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 790, 1240, 1.0, { T, dir: -1, caja: 1, boca: 'triste', orejas: prog(t, d * .4, d * .8), mira: -.6 });
      }));
      S30.pelicula(ctx, T);
    },
    // 26. Tito cierra la cajita; iris.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      zoom(ctx, t, d, 560, 900, 1.3, 1.5, () => oficinaCon(ctx, T, () =>
        S30.tito(ctx, 560, 1240, 1.15, { T, caja: 1 - prog(t, d * .1, d * .5), boca: 'triste', orejas: 1, mira: .3 })));
      S30.pelicula(ctx, T);
      S30.iris(ctx, prog(t, d * .55, d), 560, 820);
    },
    // 27. Cierre: negro con halo; el logo lo pone la marca.
    (ctx, t, d, K, T) => {
      ctx.fillStyle = C.tinta; ctx.fillRect(0, 0, W, H);
      K.halo(ctx, 540, 660, 620, C.oro, .16);
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
