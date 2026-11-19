/* Ilustra — escenarios: calle lluviosa (noche/atardecer) e interior cálido.
   Devuelven {luz, fondo, suelo, capas:[...]} listos para Ilustra.Escena. Coordenadas de mundo: suelo de los actores en y=suelo. */
(function (G) {
  'use strict';
  const I = G.Ilustra, P = I.Pincel, props = () => I.props;
  I.escenarios = {};

  I.escenarios.calleLluviosa = function (o = {}) {
    o = Object.assign({ hora: 'atardecer', semilla: 4, suelo: 1150, base: 1068, escaparateX: 330, hueco: [760, 1180], rango: [-700, 2500] }, o);
    const noche = o.hora === 'noche';
    const luz = new I.Luz({
      dir: [-0.35, -0.94], dirBorde: [0.85, -0.35],
      clave: noche ? '#ffcf96' : '#ffd8a8', ambiente: noche ? '#3c4a64' : '#56657e', borde: '#ffc98a',
      niebla: noche ? '#56627a' : '#8996aa'
    });
    const cielo1 = noche ? '#1e2638' : '#7f8ea4', cielo2 = noche ? '#4a5470' : '#c2b9b0';
    const [R0, R1] = o.rango, base = o.base, suelo = o.suelo, sm = o.semilla;
    const capas = [];

    // 1) cielo (pantalla) con resplandor cálido de ciudad cerca del horizonte
    capas.push({
      pantalla: true, dibujar(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, 0, 1150);
        g.addColorStop(0, I.css(I.oscurece(cielo1, 0.15))); g.addColorStop(0.55, I.css(cielo1)); g.addColorStop(1, I.css(cielo2));
        ctx.fillStyle = g; ctx.fillRect(0, 0, I.ANCHO, I.ALTO);
        // nubes bajas que derivan
        for (let i = 0; i < 7; i++) {
          const x = ((I.hash(i + sm) * 1600 + t * 6 * (1 + i % 3)) % 1700) - 300, y = 200 + I.hash(i * 3 + sm) * 500, r = 260 + I.hash(i * 7) * 200;
          const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
          rg.addColorStop(0, I.css(I.aclara(cielo1, 0.12), 0.35)); rg.addColorStop(1, I.css(cielo1, 0));
          ctx.save(); ctx.translate(x, y); ctx.scale(1.8, 0.5); ctx.translate(-x, -y); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
        }
      }
    });
    // 2) tejados lejanos (z=6) con torre/cúpula: siluetas brumosas
    capas.push({
      z: 6, estatica: true, desenfoque: 3, limites: [R0 - 400, 0, R1 + 600, 1300], dibujar(ctx) {
        const r = I.rng(sm * 5);
        let x = R0 - 400;
        while (x < R1 + 600) {
          const w = 120 + r() * 160, h = 260 + r() * 260;
          P.forma(ctx, P.rect(x, base - 120 - h, w, h + 140), { color: I.mezcla(noche ? '#2e3546' : '#5b6476', noche ? '#3d4558' : '#7a8296', r()), profundidad: 0.9, semilla: Math.floor(r() * 1000), volumen: 0.2, borde: 0, textura: 0.2, irregular: 2 });
          for (let k = 0; k < 6; k++) if (r() < 0.3) I.ventanaLuz(ctx, x + 15 + r() * (w - 30), base - 100 - h + 40 + r() * h * 0.6, 10, 14, '#f3c27e', 0, k, { marco: false, intensidad: 0.25, radioHalo: 2 });
          x += w + r() * 20;
        }
        // cúpula lejana
        const cx = 980;
        P.forma(ctx, P.rect(cx - 70, base - 640, 140, 500), { color: '#6d7588', profundidad: 0.85, semilla: 77, borde: 0.1 });
        P.forma(ctx, P.elipse(cx, base - 640, 95, 110, 0, 30).filter(p => p[1] <= base - 640 + 1).concat([[cx - 95, base - 640]]), { color: '#6a7386', profundidad: 0.85, semilla: 78, borde: 0.1 });
        P.forma(ctx, P.rect(cx - 8, base - 800, 16, 70), { color: '#6a7386', profundidad: 0.85, semilla: 79 });
      }
    });
    // niebla lejana
    capas.push({ pantalla: true, dibujar(ctx, t) { I.niebla(ctx, t, { y: 880, alto: 520, color: noche ? '#5d6a84' : '#a3adbd', alfa: 0.55, velocidad: 6, semilla: sm, canal: 0 }); } });
    // 3) edificios medios (z=2.6), visibles en el hueco de la calle transversal
    capas.push({
      z: 2.6, estatica: true, desenfoque: 1.6, limites: [R0 - 300, -200, R1 + 300, 1300], dibujar(ctx) {
        const r = I.rng(sm * 9 + 2), cols = ['#7d8494', '#8a8580', '#6f7a86', '#857d7a'].map(c => noche ? I.mezcla(c, '#283044', 0.5) : I.color(c));
        let x = R0 - 200;
        while (x < R1 + 200) {
          const w = 300 + r() * 120, h = 700 + r() * 250;
          props().edificio(ctx, x + w / 2, base - 30, { ancho: w, alto: h, color: cols[Math.floor(r() * 4)], pisos: 5, columnas: 3, encendidas: 0.3, profundidad: 0.55, semilla: Math.floor(r() * 999), balcones: false, bajo: false, tejado: r() < 0.6 ? 'mansarda' : 'plano', escala: 1 });
          x += w + 10;
        }
        // farolas lejanas
        for (let k = 0; k < 6; k++) { const fx = R0 + k * 520 + 200; props().farola(ctx, fx, base - 20, { escala: 0.55, profundidad: 0.5, semilla: 300 + k, cono: false }); }
      }
    });
    capas.push({ pantalla: true, dibujar(ctx, t) { I.niebla(ctx, t, { y: 1000, alto: 360, color: noche ? '#66728c' : '#aab3c2', alfa: 0.45, velocidad: 10, semilla: sm + 5, canal: 1 }); } });
    // lluvia lejana (detrás de la fachada cercana)
    capas.push({ pantalla: true, dibujar(ctx, t) { I.lluvia(ctx, t, { densidad: 160, alfa: 0.18, largo: [16, 30], velocidad: 1300, capas: 1, semilla: sm + 40 }); } });

    // 4) fachada cercana (z=1.25) con hueco de calle transversal
    const fachadas = [];
    {
      const r = I.rng(sm * 17 + 3), cols = ['#8b8f98', '#a08f7e', '#7f8a8c', '#958a90', '#8e8678'].map(c => noche ? I.mezcla(c, '#283044', 0.5) : I.color(c));
      let x = R0;
      while (x < R1) {
        const w = 400 + r() * 120;
        if (x + w > o.hueco[0] && x < o.hueco[1]) { x = o.hueco[1]; continue; }
        fachadas.push({ x: x + w / 2, w, h: 760 + r() * 160, color: cols[fachadas.length % cols.length], s: Math.floor(r() * 999) });
        x += w + 4;
      }
    }
    const capaFachada = {
      z: 1.25, estatica: true, limites: [R0 - 100, -100, R1 + 200, base + 4], dibujar(ctx) {
        for (const f of fachadas) {
          props().edificio(ctx, f.x, base, { ancho: f.w, alto: f.h, color: f.color, pisos: 4, columnas: 3, encendidas: 0.28, semilla: f.s, profundidad: 0.12, bajo: true, tejado: 'mansarda' });
          // planta baja: escaparate cálido o puerta
          const tiene = Math.abs(f.x - o.escaparateX) < f.w / 2;
          if (tiene) props().escaparate(ctx, o.escaparateX, base, { ancho: Math.min(360, f.w - 80), alto: 240, semilla: f.s + 3, profundidad: 0.05 });
          else if (f.s % 3 === 0) props().escaparate(ctx, f.x - 40, base, { ancho: 260, alto: 220, calido: '#e9b073', toldo: '#3f5a5c', semilla: f.s + 3, profundidad: 0.1 });
          else props().puerta(ctx, f.x + 60, base, { semilla: f.s + 5, profundidad: 0.1, color: I.mezcla('#3c4a52', f.color, 0.3) });
          // zócalo de piedra
          P.forma(ctx, P.rect(f.x - f.w / 2, base - 30, f.w, 30), { color: '#5d606a', semilla: f.s + 9, profundidad: 0.1, borde: 0.3, textura: 0.4 });
        }
        // atmósfera sobre la fachada: arriba se funde con la bruma, abajo se oscurece (luz ambiente)
        {
          const g = ctx.createLinearGradient(0, -100, 0, base);
          g.addColorStop(0, I.css(luz.niebla, 0.55)); g.addColorStop(0.45, I.css(luz.niebla, 0.18)); g.addColorStop(1, I.css(luz.niebla, 0));
          ctx.fillStyle = g; ctx.globalCompositeOperation = 'source-atop'; ctx.fillRect(R0 - 100, -100, R1 - R0 + 300, base + 100);
          const g2 = ctx.createLinearGradient(0, base - 700, 0, base);
          g2.addColorStop(0, I.css('#1c2333', 0)); g2.addColorStop(1, I.css('#1c2333', 0.32));
          ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g2; ctx.fillRect(R0 - 100, base - 700, R1 - R0 + 300, 700);
          ctx.globalCompositeOperation = 'source-over';
          // los escaparates vuelven a brillar por encima del oscurecimiento
          for (const f of fachadas) { const tiene = Math.abs(f.x - o.escaparateX) < f.w / 2; if (tiene) I.halo(ctx, o.escaparateX, base - 120, 420, '#ffb75e', 0.55); }
        }
        // pared lateral del hueco (esquinas en sombra)
        for (const f of fachadas) {
          if (Math.abs(f.x + f.w / 2 - o.hueco[0]) < 60) P.forma(ctx, P.poligono([[f.x + f.w / 2, base - f.h], [f.x + f.w / 2 + 50, base - f.h + 60], [f.x + f.w / 2 + 50, base + 30], [f.x + f.w / 2, base]]), { color: I.oscurece(f.color, 0.4), semilla: 5, profundidad: 0.15 });
          if (Math.abs(f.x - f.w / 2 - o.hueco[1]) < 60) P.forma(ctx, P.poligono([[f.x - f.w / 2, base - f.h], [f.x - f.w / 2 - 50, base - f.h + 60], [f.x - f.w / 2 - 50, base + 30], [f.x - f.w / 2, base]]), { color: I.oscurece(f.color, 0.45), semilla: 6, profundidad: 0.15 });
        }
      }
    };
    capas.push(capaFachada);
    // 5) suelo (z=1): acera mojada, juntas, charcos, bordillo, calzada
    capas.push({
      z: 1, dibujar(ctx, t, cam) {
        const x0 = R0 - 400, x1 = R1 + 400;
        const g = ctx.createLinearGradient(0, base, 0, 1920);
        g.addColorStop(0, I.css(noche ? '#323a4c' : '#4c5466')); g.addColorStop(0.25, I.css(noche ? '#283040' : '#3c4354')); g.addColorStop(1, I.css(noche ? '#161b26' : '#232834'));
        ctx.fillStyle = g; ctx.fillRect(x0, base - 2, x1 - x0, 1920 - base + 400);
        // juntas de las losas
        ctx.strokeStyle = I.css('#1d2230', 0.35); ctx.lineWidth = 2;
        let yy = base + 22, paso = 26, fila = 0;
        ctx.beginPath();
        while (yy < 1660) {
          ctx.moveTo(x0, yy); ctx.lineTo(x1, yy);
          const anchoL = paso * 3.2;
          for (let x = x0 + (fila % 2) * anchoL / 2; x < x1; x += anchoL) { ctx.moveTo(x, yy); ctx.lineTo(x - (x - 540) * 0.04, yy - paso); }
          paso *= 1.22; yy += paso; fila++;
        }
        ctx.stroke();
        // charcos con reflejo del cielo
        const r = I.rng(sm * 23);
        for (let i = 0; i < 26; i++) {
          const cx = x0 + r() * (x1 - x0), cy = base + 60 + r() * 560, rx = 60 + r() * 160, ry = rx * (0.08 + (cy - base) / 3000);
          const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
          pg.addColorStop(0, I.css(noche ? '#59657e' : '#8e9ab0', 0.55)); pg.addColorStop(0.7, I.css(noche ? '#4a5570' : '#7d89a0', 0.3)); pg.addColorStop(1, I.css('#7d89a0', 0));
          ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, 7); ctx.fill(); ctx.restore();
        }
        // bordillo y calzada
        P.forma(ctx, P.rect(x0, 1660, x1 - x0, 26), { color: '#6b6f7a', semilla: 3, volumen: 0.6, borde: 0.4, textura: 0.3, irregular: 0 });
        ctx.fillStyle = I.css(noche ? '#151a24' : '#262b36'); ctx.fillRect(x0, 1686, x1 - x0, 500);
      }
    });
    // 5b) reflejo de la fachada en la acera mojada
    capas.push({ z: 1.25, reflejoDe: capaFachada, eje: base, alto: 560, alfa: 0.28, desenfoque: 4 });
    // 6) reflejos cálidos sobre la acera (en la profundidad de la fachada, para que no se desplacen respecto a sus fuentes)
    capas.push({
      z: 1.25, dibujar(ctx, t) {
        for (const f of fachadas) {
          const tiene = Math.abs(f.x - o.escaparateX) < f.w / 2;
          if (tiene) for (let k = -1; k <= 1; k++) I.reflejoLuz(ctx, o.escaparateX + k * 105, base + 8, 110, 460, '#ffbf6a', t, k + 5, 1.0);
          else if (f.s % 3 === 0) I.reflejoLuz(ctx, f.x - 40, base + 10, 140, 260, '#e9b073', t, f.s, 0.7);
        }
      }
    });
    // 7) farolas (z=1.12) con reflejo
    const farolas = o.farolas || [-640, 40, 860, 1640, 2400];
    capas.push({
      z: 1.12, dibujar(ctx, t) {
        for (const fx of farolas) {
          I.reflejoLuz(ctx, fx + 48, suelo + 30, 110, 520, '#ffc477', t, fx + 1000, 1.0);
          props().farola(ctx, fx, suelo + 20, { t, semilla: fx + 1000, alto: 720 });
        }
      }
    });
    // 8) salpicaduras en el suelo (z=1)
    capas.push({ z: 1, dibujar(ctx, t, cam) { const c = cam.en(t); I.salpicaduras(ctx, t, { y0: base + 30, y1: 1520, x0: c.x - 700, x1: c.x + 700, n: 70, semilla: sm }); } });
    // 9) actores
    capas.push({ actores: true });
    // 11) niebla baja delante
    capas.push({ pantalla: true, dibujar(ctx, t) { I.niebla(ctx, t, { y: 1160, alto: 260, color: noche ? '#6c7891' : '#b3bccb', alfa: 0.22, velocidad: 14, semilla: sm + 9, canal: 2 }); } });
    return { luz, fondo: cielo1, suelo, base, capas, escaparateX: o.escaparateX, farolas, hueco: o.hueco };
  };

  // ======================= interior cálido =======================
  I.escenarios.interiorCalido = function (o = {}) {
    o = Object.assign({ semilla: 8, suelo: 1150, pared: '#8a6f5c', papel: '#9a7d66' }, o);
    const luz = new I.Luz({ dir: [-0.8, -0.6], dirBorde: [-0.9, -0.2], clave: '#ffcf96', ambiente: '#6a5248', borde: '#ffc078', niebla: '#7a6458' });
    const suelo = o.suelo, sm = o.semilla, capas = [];
    capas.push({
      z: 1.3, estatica: true, limites: [-600, -200, 1800, 2200], dibujar(ctx) {
        // pared con papel pintado
        const g = ctx.createLinearGradient(0, 0, 0, suelo);
        g.addColorStop(0, I.css(I.oscurece(o.pared, 0.35))); g.addColorStop(1, I.css(o.pared));
        ctx.fillStyle = g; ctx.fillRect(-600, -200, 2400, suelo + 200);
        ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = I.css(I.aclara(o.papel, 0.3)); ctx.lineWidth = 2;
        for (let x = -600; x < 1800; x += 70) { ctx.beginPath(); for (let y = -200; y < suelo; y += 20) ctx.lineTo(x + Math.sin(y * 0.03) * 10, y); ctx.stroke(); }
        ctx.restore();
        // zócalo de madera
        P.forma(ctx, P.rect(-600, suelo - 260, 2400, 260), { color: '#5d4334', semilla: sm, volumen: 0.4, borde: 0.4, textura: 0.4, irregular: 0 });
        ctx.strokeStyle = I.css('#3a2a20', 0.5); ctx.lineWidth = 3;
        for (let x = -560; x < 1800; x += 180) ctx.strokeRect(x, suelo - 230, 150, 190);
        P.forma(ctx, P.rect(-600, suelo - 272, 2400, 16), { color: '#7a5a44', semilla: sm + 1, borde: 0.8, irregular: 0 });
        props().ventanaNoche(ctx, 760, 820, { ancho: 300, alto: 420, semilla: sm + 2, t: 0 });
        props().cuadro(ctx, 180, 640, { semilla: sm + 3 });
        props().estanteria(ctx, -120, suelo - 10, { semilla: sm + 4 });
      }
    });
    // ventana con lluvia animada encima de la caché
    capas.push({ z: 1.3, dibujar(ctx, t) { props().ventanaNoche(ctx, 760, 820, { ancho: 300, alto: 420, semilla: sm + 2, t }); } });
    // suelo de madera
    capas.push({
      z: 1, estatica: true, limites: [-700, suelo - 20, 1900, 2300], dibujar(ctx) {
        const g = ctx.createLinearGradient(0, suelo, 0, 1920); g.addColorStop(0, I.css('#6e4c36')); g.addColorStop(1, I.css('#3a281e'));
        ctx.fillStyle = g; ctx.fillRect(-700, suelo - 10, 2600, 1200);
        ctx.strokeStyle = I.css('#2a1c14', 0.45); ctx.lineWidth = 2;
        let y = suelo + 18, p = 22; while (y < 1950) { ctx.beginPath(); ctx.moveTo(-700, y); ctx.lineTo(1900, y); ctx.stroke(); p *= 1.2; y += p; }
        // alfombra
        P.forma(ctx, P.elipse(540, suelo + 160, 520, 110, 0, 40), { color: '#7d3f37', semilla: sm + 6, volumen: 0.4, borde: 0.3, textura: 0.5 });
        P.forma(ctx, P.elipse(540, suelo + 160, 440, 85, 0, 40), { color: '#a0684a', semilla: sm + 7, volumen: 0.3, borde: 0, textura: 0.5 });
      }
    });
    // muebles (z=1)
    capas.push({
      z: 1, dibujar(ctx, t) {
        props().planta(ctx, 1000, suelo + 10, { semilla: sm + 8, t });
        const m = props().mesa(ctx, 560, suelo + 40, { semilla: sm + 9, mantel: '#d9cdb8' });
        if (o.taza !== false) props().taza(ctx, 640, m.superficie, { t, semilla: sm + 10 });
      }
    });
    capas.push({ z: 1.05, dibujar(ctx, t) { props().lampara(ctx, 170, suelo + 20, { semilla: sm + 11, t }); } });
    capas.push({ actores: true });
    // mapa de luz: la lámpara y la ventana iluminan; el resto de la habitación cae en penumbra cálida
    capas.push({ pantalla: true, dibujar(ctx, t, cam) {
      const fl = 1 + 0.02 * I.ruido1(t * 2, sm);
      const z = cam.en(t).zoom;
      const l = cam.aPantalla(t, 170, suelo + 20 - 520 + 70, 1.05), v = cam.aPantalla(t, 760, 610, 1.3);
      I.mapaLuz(ctx, [{ x: l[0], y: l[1] + 120 * z, r: 1100 * z, fuerza: 0.85 * fl, color: '#fff0dc' }, { x: v[0], y: v[1], r: 520 * z, fuerza: 0.35, color: '#b8c8e8' }], { oscuridad: '#4a3a40' });
      I.halo(ctx, l[0], l[1], 700 * z, '#ffb55e', 0.45 * fl);
    } });
    capas.push({ pantalla: true, dibujar(ctx, t) { I.niebla(ctx, t, { y: 700, alto: 900, color: '#d9a878', alfa: 0.1, velocidad: 3, semilla: sm, canal: 3 }); } });
    return { luz, fondo: '#3a2c26', suelo, capas, lampara: [170, suelo + 20] };
  };
})(window);
