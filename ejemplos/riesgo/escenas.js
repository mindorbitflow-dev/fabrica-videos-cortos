// "Si ganaras un dólar por segundo" — ¿Lo arriesgarías? (≈40 s, español e inglés con el mismo archivo). Escalas de dinero con pseudo-3D (E3 = plantilla/escala3d.js):
// la cámara viaja de verdad (dolly, subida, órbita, vuelo) y cada número es un objeto gigante. Rótulos con L(es, en): window.IDIOMA decide el idioma.
(() => {
  const { W, H, TAU, clamp, lerp, prog, sale, suave, rebote, hash } = K;
  const C = S30.C;
  const ROJO = '#FF4B3E', AMARILLO = '#FFD23F';
  const L = (es, en) => (window.IDIOMA === 'en' ? en : es);
  const cam = E3.cam, mezcla = (a, b, k) => E3.mezcla(a, b, suave(clamp(k)));

  // silueta de una persona de 1,8 m colocada en el mundo (da la escala de todo lo demás)
  const persona = (ctx, c, X, Z, T, o = {}) => {
    const p = E3.proj(c, X, 0, Z); if (!p) return;
    S30.hombre(ctx, p.x, p.y, 1.8 * p.s / 430, Object.assign({ T, semilla: 70, variante: 'hombre', silueta: true, dir: 1 }, o));
  };
  const noche = (ctx, T, tema = 'ciruela') => E3.noche(ctx, T, tema);

  window.ESCENAS = [
    // 1. Gancho: un dólar por segundo, la pila crece y la cámara se acerca.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'noche');
      const k = prog(t, 0, d), c = mezcla(cam({ x: -4, y: 3, z: -16, pitch: .06, cy: 860 }), cam({ x: 3, y: 4.5, z: -9, yaw: -.18, pitch: .1, cy: 860 }), k);
      E3.suelo(ctx, c, { color: '#1d2a4a' });
      E3.torre(ctx, c, { x: 0, z: 2, w: 3, d: 3, h: lerp(1.6, 7.5, sale(k)) });
      persona(ctx, c, -3.6, 1, T, { pose: 'manosBolsillos' });
      E3.contador(ctx, Math.floor(t * 28), 540, 1060, { prefijo: '$', tam: 150 });
      E3.titular(ctx, L(['UN DÓLAR', 'POR SEGUNDO'], ['A DOLLAR', 'A SECOND']), 1, prog(t, .1, .5));
      S30.pelicula(ctx, T);
    },
    // 2. Un millón: unos doce días (calendario que se llena).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'ciruela');
      const k = prog(t, .1, d * .85);
      K.halo(ctx, 540, 690, 420 + 60 * Math.sin(T * 3), AMARILLO, .14);
      E3.contador(ctx, lerp(0, 1000000, sale(k)), 540, 690, { prefijo: '$', tam: 150 });
      for (let i = 0; i < 12; i++) {
        const x = 205 + (i % 4) * 223, y = 890 + Math.floor(i / 4) * 150, on = k * 12 > i;
        ctx.save(); ctx.translate(x, y); const s = on ? rebote(clamp((k * 12 - i) * 2)) : 1; ctx.scale(s, s);
        ctx.fillStyle = on ? AMARILLO : 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.roundRect(-85, -55, 170, 110, 22); ctx.fill();
        ctx.fillStyle = on ? '#1a1033' : 'rgba(255,255,255,.55)'; ctx.font = `60px ${K.TITULAR}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(i + 1, 0, 4); ctx.restore();
      }
      E3.titular(ctx, L(['UN MILLÓN'], ['ONE MILLION']), 0, prog(t, .05, .45));
      E3.pegatina(ctx, L('UNOS 12 DÍAS', 'ABOUT 12 DAYS'), 540, 480, prog(t, d * .5, d * .5 + .3), .04);
      S30.pelicula(ctx, T);
    },
    // 3. Pero mil millones: la torre se vuelve gigante y la cámara sube sin alcanzar la cima.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'noche');
      const k = prog(t, 0, d), c = mezcla(cam({ x: 5, y: 2, z: -14, yaw: -.2, pitch: .12, cy: 900 }), cam({ x: 9, y: 70, z: -30, yaw: -.3, pitch: .62, cy: 900 }), k);
      E3.suelo(ctx, c, { color: '#1d2a4a' });
      E3.torre(ctx, c, { x: 0, z: 2, w: 6, d: 6, h: lerp(8, 420, sale(k)) });
      persona(ctx, c, -5, 1, T, { pose: 'cabizbajo' });
      E3.titular(ctx, L(['MIL', 'MILLONES'], ['ONE', 'BILLION']), 1, prog(t, .05, .4));
      S30.pelicula(ctx, T);
    },
    // 4. Treinta y dos años: la Tierra gira mientras pasan los años.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'noche');
      E3.globo(ctx, { x: 540, y: 820, r: 330 + 30 * prog(t, 0, d), rot: T * 1.4 });
      E3.contador(ctx, lerp(0, 32, sale(prog(t, .1, d * .8))), 540, 1090, { sufijo: L(' AÑOS', ' YEARS'), tam: 190 });
      E3.titular(ctx, L(['TARDARÍAS'], ['IT TAKES']), 0, prog(t, .05, .4));
      S30.pelicula(ctx, T);
    },
    // 5. Sin dormir, sin comer, sin parar: día y noche alternan rápido.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const ciclo = T * 3.2, dia = .5 + .5 * Math.sin(ciclo);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${lerp(14, 120, dia) | 0},${lerp(10, 160, dia) | 0},${lerp(36, 220, dia) | 0})`); g.addColorStop(1, `rgb(${lerp(26, 235, dia) | 0},${lerp(16, 190, dia) | 0},${lerp(60, 140, dia) | 0})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (dia < .6) E3.estrellas(ctx, T, 50);
      const sx = 540 + Math.cos(ciclo) * 420, sy = 800 - Math.sin(ciclo) * 170; ctx.fillStyle = dia > .5 ? '#ffe9a0' : '#e6ecff'; ctx.beginPath(); ctx.arc(sx, sy, 62, 0, TAU); ctx.fill();
      D.reloj(ctx, 540, 960, 250, { hora: T * 9 });
      S30.hombre(ctx, 150, 1300, 1.2, { T, semilla: 70, variante: 'hombre', silueta: true, dir: 1, pose: 'cabizbajo' });
      E3.titular(ctx, L(['SIN DORMIR', 'SIN COMER', 'SIN PARAR'], ['NO SLEEPING', 'NO EATING', 'NO STOPPING']), 2, prog(t, .05, .7), 300, 98);
      S30.pelicula(ctx, T);
    },
    // 6. Musk superó los 300 mil millones: una torre que no termina.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const k = prog(t, 0, d), c = mezcla(cam({ x: 8, y: 6, z: -60, yaw: -.12, pitch: .2, f: 1100, cy: 900 }), cam({ x: 10, y: 620, z: -75, yaw: -.1, pitch: .95, f: 1100, cy: 900 }), k);
      noche(ctx, T, 'noche');
      E3.suelo(ctx, c, { color: '#1d2a4a', paso: 8, ancho: 300, lejos: 900 });
      E3.torre(ctx, c, { x: 0, z: 2, w: 26, d: 26, h: 3000, banda: .8 });
      E3.contador(ctx, lerp(1e9, 3e11, sale(prog(t, .1, d * .9))), 540, 1080, { prefijo: '$', tam: 110 });
      E3.titular(ctx, L(['ELON MUSK'], ['ELON MUSK']), 0, prog(t, .05, .4));
      E3.pegatina(ctx, L('+300 MIL MILLONES', 'OVER 300 BILLION'), 540, 480, prog(t, d * .35, d * .35 + .3), -.04);
      S30.pelicula(ctx, T);
    },
    // 7. Más de nueve mil años: vuelo por un camino con carteles de años hacia el pasado.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'ciruela');
      const k = prog(t, 0, d), c = cam({ x: 0, y: 3.4, z: lerp(-6, 372, sale(k)), yaw: Math.sin(T * 1.1) * .05, pitch: .02, cy: 780 });
      E3.suelo(ctx, c, { color: '#2a1f4a', paso: 5 });
      for (let i = 18; i >= 1; i--) {   // de lejos a cerca: columnas a los dos lados y un cartel cada dos
        const z = i * 21;
        E3.caja(ctx, c, { x: -6, y: 0, z, w: .8, h: 7, d: .8, color: '#8e7cc3' });
        E3.caja(ctx, c, { x: 6, y: 0, z, w: .8, h: 7, d: .8, color: '#8e7cc3' });
        if (i % 2 === 0) E3.rotulo(ctx, c, i % 4 ? -6 : 6, 8.5, z, `-${i / 2}${window.IDIOMA === 'en' ? ',' : '.'}000`, { tam: 60 });
      }
      E3.piramide(ctx, c, { x: 0, z: 440, base: 120, alto: 80 });
      E3.contador(ctx, lerp(0, 9500, sale(k)), 540, 1120, { sufijo: L(' AÑOS', ' YEARS'), tam: 140 });
      E3.titular(ctx, L(['MÁS DE 9.000', 'AÑOS'], ['MORE THAN 9,000', 'YEARS']), 1, prog(t, .05, .4), 300, 96);
      S30.pelicula(ctx, T);
    },
    // 8. Más del doble que las pirámides: órbita y dos barras.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'tierra');
      const k = prog(t, 0, d), ang = lerp(-.6, .5, suave(k)), R = 34, c = cam({ x: Math.sin(ang) * R, y: 7, z: Math.cos(ang) * -R + 4, yaw: -ang * 1.0, pitch: .08, cy: 840 });
      E3.suelo(ctx, c, { color: '#5a4a2a', paso: 4 });
      E3.piramide(ctx, c, { x: 0, z: 4, base: 24, alto: 15 });
      const b = (y, v, col, txt) => { const a = prog(t, .25, d * .85) * v; if (a < .03) return; ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(120, y, 840 * a, 70, 18); ctx.fill(); ctx.font = `46px ${K.TITULAR}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1a1033'; if (a > .25) ctx.fillText(txt, 145, y + 38); };
      b(1090, 4500 / 9500, AMARILLO, L('PIRÁMIDES · 4.500', 'PYRAMIDS · 4,500'));
      b(1180, 1, ROJO, L('UN DÓLAR/SEG · 9.500+', 'A DOLLAR/SEC · 9,500+'));
      E3.titular(ctx, L(['EL DOBLE QUE', 'LAS PIRÁMIDES'], ['DOUBLE THE', 'PYRAMIDS']), 0, prog(t, .05, .4), 310, 92);
      S30.pelicula(ctx, T);
    },
    // 9. Empezó con 500 dólares: su primer videojuego.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'ciruela');
      const z = lerp(.9, 1.08, suave(prog(t, 0, d)));
      ctx.save(); ctx.translate(540, 860); ctx.scale(z, z); ctx.translate(-540, -860);
      E3.retroPC(ctx, 540, 1180, 1.6, T);
      ctx.restore();
      E3.titular(ctx, L(['SU PRIMER', 'VIDEOJUEGO'], ['HIS FIRST', 'VIDEO GAME']), 1, prog(t, .05, .45));
      E3.pegatina(ctx, '$500', 800, 1130, prog(t, d * .4, d * .4 + .3), .06);
      S30.pelicula(ctx, T);
    },
    // 10. Lo vendió a los doce años.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'ciruela');
      E3.retroPC(ctx, 640, 1180, 1.3, T);
      const w = S30.camina(t, d, -80, 250, { desde: .05, hasta: .6, alto: 330 });
      S30.hombre(ctx, w.x, 1300, 1.1, { T, semilla: 72, variante: 'nino', silueta: true, paso: w.paso, dir: 1 });
      E3.titular(ctx, L(['12 AÑOS'], ['12 YEARS OLD']), 0, prog(t, .05, .4), 330, 130);
      E3.pegatina(ctx, '1984', 540, 520, prog(t, d * .4, d * .4 + .3), -.05);
      S30.pelicula(ctx, T);
    },
    // 11. 2008: la torre se derrumba y no alcanza ni para la renta.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      noche(ctx, T, 'noche');
      const k = prog(t, .15, d * .8), sacude = K.golpe(t, .6, 16), c = cam({ x: 6, y: 5, z: -22, yaw: -.2, pitch: .1, cy: 880 });
      ctx.save(); ctx.translate(0, sacude);
      E3.suelo(ctx, c, { color: '#1d2a4a' });
      E3.torre(ctx, c, { x: 0, z: 2, w: 5, d: 5, h: lerp(24, .3, k * k) });
      persona(ctx, c, -4, -2, T, { pose: 'cabizbajo' });
      ctx.restore();
      E3.contador(ctx, lerp(5e6, 0, sale(k)), 540, 1090, { prefijo: '$', tam: 130, color: ROJO });
      D.papel(ctx, 840, 700, 230, 290, { lineas: 5, titular: L('RENTA', 'RENT'), color: '#f1e3c0', giro: .08 });
      E3.titular(ctx, L(['2008', 'PIDIÓ PRESTADO'], ['2008', 'HE BORROWED']), 1, prog(t, .05, .45), 300, 98);
      S30.pelicula(ctx, T);
    },
    // 12. Moraleja: la frase en grande.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T, .5);
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 700, luz: prog(t, 0, .6) + .4 });
      K.halo(ctx, 540, 860, 520 + 40 * Math.sin(T * 2.2), AMARILLO, .12 + .05 * Math.sin(T * 2.2));
      const lineas = L(['NINGÚN SUELDO', 'LLEGA AHÍ', 'Y NINGUNA APUESTA', 'ES SEGURA'], ['NO SALARY', 'GETS YOU THERE', 'AND NO BET', 'IS SAFE']);
      E3.titular(ctx, lineas, 3, prog(t, .1, 1.3), 560, 96);
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
    // 13. Cierre: el reto lo pone el sistema (y≈420-1000); la silueta pequeña abajo.
    (ctx, t, d, K, T) => {
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 660, luz: .9 });
      E3.estrellas(ctx, T, 40);
      S30.hombre(ctx, 540, 1560, .55, { T, semilla: 70, variante: 'hombre', silueta: true });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
