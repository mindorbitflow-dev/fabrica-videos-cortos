// "El ascensor que se suelta" — ¿Sobrevivirías? (2D ilustrado, motor V = plantilla/sobrevive2d.js). La cabina cae por el pozo; el golpe nunca se muestra:
// se corta con polvo y temblor. Lo importante (tú, la cabina) vive entre y=300 y y=1300; los subtítulos van arriba (y=170-400).
(() => {
  const { lerp, prog, sale, clamp } = K;
  const C = V.COL, ROJO = C.peligro, VERDE = C.ok;
  const Y0 = 1340, S0 = 1.12;                                  // cabina grande: tú mide ~590 px y pisa y≈1260
  // pozo + cabina + tú dentro. o: alt (m), m (px/m), vel (0-1 rayas de caída), y, s, y las opciones de V.ascensor; tu: opciones de V.tu
  const cabina = (ctx, T, o, tu) => {
    V.fondo('pozo', ctx, T, { alt: o.alt == null ? 30 : o.alt, m: o.m || 150, vel: o.vel || 0, yRef: o.y == null ? Y0 : o.y, brillo: o.brillo });
    if (o.antes) o.antes();
    return V.ascensor(ctx, 540, o.y == null ? Y0 : o.y, o.s || S0, Object.assign({ cable: 'roto', T }, o), g => { if (tu) V.tu(ctx, g.x, g.y, g.h, Object.assign({ T }, tu)); if (o.dentro) o.dentro(g); });
  };
  const caida = (y0, t) => Math.max(0, y0 - 4.9 * t * t);       // m de altura en caída libre

  window.ESCENAS = [
    // 1. Gancho: el cable se rompe con chispas y la cabina se va hacia abajo; tú flotas del susto.
    (ctx, t, d, K, T) => {
      const ts = d * .28, u = Math.max(0, t - ts), alt = caida(90, u), tb = u > 0 ? 7 * Math.exp(-u * .6) + 3 : 0;
      V.cuadro(ctx, T, { luz: 'calida', tiembla: tb, z: 1 + .05 * prog(t, 0, d), y: 900 }, () => {
        cabina(ctx, T, { alt, vel: clamp(u * .8), cable: u > 0 ? 'roto' : 'entero', chispa: u > 0 ? prog(t, ts, ts + .9) : -1, luz: u > 0 ? .75 + .25 * Math.sin(T * 30) : 1 },
          { pose: u > 0 ? 'caer' : 'dePie', susto: u > 0 ? 1 : .15, alto: Math.min(u, 1) * 90, mira: -.4 });
      });
    },
    // 2. La cabina cae por el pozo; las puertas de los pisos pasan volando (plano abierto).
    (ctx, t, d, K, T) => {
      V.cuadro(ctx, T, { luz: 'calida', tiembla: 6, z: lerp(1, 1.12, prog(t, 0, d)), y: 960 }, () => {
        cabina(ctx, T, { alt: 70 - 28 * t / d, m: 120, vel: .9, s: .72, y: 1160 }, { pose: 'caer', susto: 1, alto: 40 });
      });
    },
    // 3. "Casi todos saltarían": salto en cámara lenta dentro de la cabina.
    (ctx, t, d, K, T) => {
      const a = prog(t, d * .15, d * .35), b = prog(t, d * .35, d * .75), alto = Math.sin(Math.PI * b) * 105;
      V.cuadro(ctx, T, { luz: 'calida', z: lerp(1, 1.1, prog(t, 0, d)), y: 960, tiembla: 2 }, () => {
        cabina(ctx, T, { alt: 30 - 3 * t, vel: .15 }, b > 0 && b < 1 ? { pose: 'agacharse', pose2: 'saltar', k: sale(Math.min(1, b * 3)), alto, susto: .5 } : { pose: 'dePie', pose2: 'agacharse', k: a, susto: .5 });
      });
    },
    // 4. Vista de corte: la cabina baja a toda velocidad, con una flecha enorme hacia abajo.
    (ctx, t, d, K, T) => {
      V.cuadro(ctx, T, { luz: 'calida', tiembla: 4, z: 1 }, () => {
        cabina(ctx, T, { alt: 50 - 42 * t / d, m: 90, vel: 1, s: .5, y: 1000, antes: () => {} }, { pose: 'caer', susto: 1, alto: 30 });
        V.flecha(ctx, 880, 520, 880, 1280, { color: ROJO, ancho: 80, k: prog(t, 0, d * .5), T });
      });
    },
    // 5. La flecha del salto (hacia arriba) es diminuta al lado de la de la caída.
    (ctx, t, d, K, T) => {
      V.cuadro(ctx, T, { luz: 'calida', tiembla: 2 }, () => {
        const g = cabina(ctx, T, { alt: 24 - 5 * t, vel: .4, s: .85, y: 1180 }, { pose: 'saltar', alto: 50, susto: .6, dir: 1 });
        V.flecha(ctx, 160, 500, 160, 1100, { color: ROJO, ancho: 90, k: prog(t, 0, d * .3), T });
        V.flecha(ctx, g.x + 20, g.y - g.h - 70, g.x + 20, g.y - g.h - 70 - 55, { color: VERDE, ancho: 15, k: prog(t, d * .4, d * .6), T });
      });
    },
    // 6. A oscuras: la luz parpadea y no se ve el suelo.
    (ctx, t, d, K, T) => {
      const on = Math.sin(T * 23) > .2;
      V.cuadro(ctx, T, { luz: 'fria', tiembla: 3, z: lerp(1.05, 1.15, prog(t, 0, d)), y: 960 }, () => {
        cabina(ctx, T, { alt: 14 - 2 * t, vel: .3, luz: on ? 1 : .08, cable: 'roto' }, { pose: 'dePie', susto: 1, dir: Math.sin(T * 2.4) > 0 ? 1 : -1, mira: Math.sin(T * 5) });
      });
    },
    // 7. Llega casi igual de rápido: polvo y temblor (el golpe no se muestra).
    (ctx, t, d, K, T) => {
      const ti = d * .4, alt = t < ti ? 7 * (1 - (t / ti) * (t / ti)) : 0, k = prog(t, ti, ti + 1.4), tb = t > ti ? 30 * Math.exp(-(t - ti) * 2.2) : 4;
      V.cuadro(ctx, T, { luz: 'calida', tiembla: tb, y: 960 }, () => {
        cabina(ctx, T, { alt, vel: t < ti ? .9 : 0, luz: t > ti ? .35 : 1 }, t < ti ? { pose: 'caer', susto: 1, alto: 30 } : null);
        V.polvo(ctx, 540, 1250, T, { k, r: 420, n: 18, color: '#b9ad98', alfa: .75 }); V.polvo(ctx, 540, 1100, T + 1, { k: prog(t, ti + .1, ti + 1.6), r: 300, n: 12, color: '#9d9588', alfa: .6, alto: 200 });
      });
      V.flash(ctx, t > ti ? .5 * Math.exp(-(t - ti) * 9) : 0);
    },
    // 8. De pie: las rodillas se llevan todo el golpe (brillo rojo y flechas).
    (ctx, t, d, K, T) => {
      const k = prog(t, d * .25, d * .5);
      V.cuadro(ctx, T, { luz: 'calida', z: lerp(1.1, 1.75, prog(t, 0, d * .5)), x: 540, y: lerp(980, 1010, prog(t, 0, d * .5)), tiembla: 3, rojo: .35 * k }, () => {
        const g = cabina(ctx, T, { alt: 6, vel: .1 }, { pose: 'dePie', susto: .7, dir: 1 });
        for (const dx of [-8, 22]) V.flecha(ctx, g.x + dx, g.y - 4, g.x + dx, g.y - 4 - 300 * k, { color: ROJO, ancho: 26, k: k > .02 ? 1 : 0, T });
        V.aro(ctx, g.x + 16, g.y - g.h * .27, 70, T, { k, color: ROJO });
      });
    },
    // 9. Vista alta: tú te acuestas boca arriba en el piso de la cabina.
    (ctx, t, d, K, T) => {
      const k = prog(t, d * .3, d * .65);
      V.cuadro(ctx, T, { luz: 'calida', tiembla: 2, z: 1, y: 940 }, () => {
        cabina(ctx, T, { alt: 6, vel: .1, picado: .6, y: 1380 }, { pose: 'agacharse', pose2: 'tendido', k, susto: lerp(.8, .3, k) });
        V.polvo(ctx, 540, 1280, T, { k: prog(t, d * .6, d * .85), r: 150, n: 8, color: '#cfd3d8', alfa: .35 });
      });
    },
    // 10. El golpe se reparte: muchas flechitas verdes a lo largo del cuerpo acostado.
    (ctx, t, d, K, T) => {
      const k = prog(t, d * .1, d * .55);
      V.cuadro(ctx, T, { luz: 'calida', z: lerp(1, 1.12, prog(t, 0, d)), y: 960 }, () => {
        const g = cabina(ctx, T, { alt: 6, vel: .1, picado: .6, y: 1380, s: 1.2 }, { pose: 'tendido', susto: .2 });
        for (let i = 0; i < 10; i++) { const x = g.x - 330 + i * 66; V.flecha(ctx, x, g.y - 6, x, g.y - 6 - 90 * k, { color: VERDE, ancho: 18, k: k > .02 ? 1 : 0, T }); }
      });
    },
    // 11. Calma: la cabina se detiene suave y tú respiras.
    (ctx, t, d, K, T) => {
      V.cuadro(ctx, T, { luz: 'calida', z: lerp(1.08, 1, prog(t, 0, d)), y: 950, x: 540 + Math.sin(T * .5) * 8 }, () => {
        cabina(ctx, T, { alt: 12 + Math.sin(T * .8) * .06, vel: 0, cable: 'entero', luz: 1 }, { pose: 'dePie', susto: 0, mira: .5, cara: 'neutra' });
      });
    },
    // 12. Primer plano de los rieles: las mordazas se cierran con chispas y la cabina se frena.
    (ctx, t, d, K, T) => {
      const m = prog(t, d * .25, d * .4), vel = 1 - prog(t, d * .35, d * .85), ch = vel > .08 && m > .5;
      V.cuadro(ctx, T, { luz: 'calida', z: 1.9, x: 230, y: 1290, tiembla: 6 * vel }, () => {
        const sp = () => { if (ch) { V.chispas(ctx, 124, 1235, T, { k: (T * 3) % 1, n: 16, r: 150 * vel + 40 }); V.chispas(ctx, 124, 1235, T, { k: (T * 3 + .5) % 1, n: 14, r: 120 * vel + 30 }); } };
        cabina(ctx, T, { alt: 30 - 9 * Math.min(t, d * .5), vel, mordazas: m, cable: 'roto', dentro: sp, brillo: false }, null);   // tú queda fuera de cuadro (más barato)
      });
    },
    // 13. Amortiguadores en el fondo del pozo: se aplastan bajo la cabina.
    (ctx, t, d, K, T) => {
      const k = prog(t, d * .25, d * .7), fy = 1330, hS = 300, y = fy - hS * (1 - .5 * k) - 14 * 0, alt = (fy - 14 - y) / 150;
      V.cuadro(ctx, T, { luz: 'calida', z: 1, y: 940, tiembla: k > .02 && k < .9 ? 5 * (1 - k) : 0 }, () => {
        V.fondo('pozo', ctx, T, { alt, m: 150, yRef: y });
        for (const dx of [-190, 190]) V.resorte(ctx, 540 + dx, fy, 150, hS, { k });
        V.ascensor(ctx, 540, y, .78, { cable: 'roto', T }, g => V.tu(ctx, g.x, g.y, g.h, { T, pose: 'tendido', susto: .4 }));
        V.polvo(ctx, 540, fy, T, { k: prog(t, d * .3, d * .8), r: 220, n: 10, color: '#a9a392', alfa: .3 });
      });
    },
    // 14. 1945: un rascacielos de noche en corte; la cabina cae por dentro (la cámara la sigue).
    (ctx, t, d, K, T) => {
      const u = prog(t, 0, d), cab = lerp(.95, .3, u), s = .85, y0 = 2150, cy = y0 - lerp(60, 2300, cab) * s;
      V.cuadro(ctx, T, { luz: 'fria', y: cy - 120, z: 1 + .1 * u }, () => {
        V.fondo('plano', ctx, T, { tema: 'noche', x: 540, y: cy });
        for (let i = 0; i < 90; i++) { const px = (i * 163) % 1080, py = cy - 1200 + (i * 97) % 2400, a = .3 + .5 * Math.abs(Math.sin(T * 1.3 + i)); ctx.fillStyle = 'rgba(240,235,220,' + a + ')'; ctx.fillRect(px, py, 3, 3); }
        V.rascacielos(ctx, 540, y0, s, { T, cabina: cab });
      });
    },
    // 15. El cable amontonado y el aire apretado del pozo frenan la caída.
    (ctx, t, d, K, T) => {
      const k = prog(t, 0, d * .85), fy = 1330, y = lerp(900, fy - 90, sale(k)), alt = Math.max(0, (fy - 14 - y) / 150);
      V.cuadro(ctx, T, { luz: 'calida', y: 960, tiembla: 2 * (1 - k) }, () => {
        V.fondo('pozo', ctx, T, { alt, m: 150, yRef: y, vel: .3 * (1 - k) });
        V.cable(ctx, 540, fy, 360, { n: 7 });
        V.ascensor(ctx, 540, y, .78, { cable: 'roto', T }, g => V.tu(ctx, g.x, g.y, g.h, { T, pose: 'tendido', susto: .3 }));
        for (const dx of [-330, 330]) for (let i = 0; i < 2; i++) V.flecha(ctx, 540 + dx + (i ? dx * .12 : 0), fy - 20, 540 + dx + (i ? dx * .12 : 0), fy - 20 - 40 - 280 * prog(t, d * .1 + i * .15, d * .7), { color: '#cfe0ee', ancho: 20, k: prog(t, d * .1, d * .2), T });
      });
    },
    // 16. Al piso, boca arriba: la cabina se detiene, se abren las puertas y te levantas sonriendo.
    (ctx, t, d, K, T) => {
      const ab = prog(t, d * .4, d * .65), a = prog(t, d * .55, d * .72), b = prog(t, d * .7, d * .88);
      V.cuadro(ctx, T, { luz: 'calida', z: lerp(1.0, 1.06, prog(t, 0, d)), y: 960 }, () => {
        cabina(ctx, T, { alt: 0, vel: 0, cable: 'entero', puertas: ab, luz: 1 }, b > 0 ? { pose: 'agacharse', pose2: 'dePie', k: b, cara: 'alegre' } : { pose: 'tendido', pose2: 'agacharse', k: a, susto: .1 });
      });
    },
    // 17. Cierre: sales del ascensor; la pregunta la pone el sistema arriba (y=420-1000): tú, pequeña y abajo.
    (ctx, t, d, K, T) => {
      const u = prog(t, 0, d * .8);
      V.cuadro(ctx, T, { luz: 'calida', y: 960, sub: false }, () => {
        V.fondo('interior', ctx, T, { luz: true });
        V.ascensor(ctx, 280, 1330, .62, { cable: false, puertas: 1, rieles: false, T });
        V.tu(ctx, lerp(330, 760, u), 1500, 480, { T, pose: 'camina', dist: u * 430, susto: 0, cara: 'alegre', mira: .5 });
      });
    },
  ];
})();
