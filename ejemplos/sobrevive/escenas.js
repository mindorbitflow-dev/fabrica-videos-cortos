// "El ascensor que se suelta" — ¿Sobrevivirías? (3D con personas). La cabina cae por el pozo; el golpe nunca se muestra:
// se corta con polvo. Ejes: la cámara suele mirar la cabina de frente desde +Z; y = altura (el fondo del pozo es y=0).
(() => {
  const { lerp, prog, sale, clamp } = K;
  const C = { muro: '#2b4c7e', metal: '#17b3a3', piso: '#1c2a44', puerta: '#ff6b3d', marco: '#ffd23f', luz: '#fff3c4',
              rojo: '#e5484d', verde: '#5fbf6a', ropa: { camisa: '#f4c430', pantalon: '#2f3e57' } };
  const OSCURO = { pasto: false, arboles: false, cielo: '#13203d', nieblaDesde: 18, nieblaHasta: 70 };

  // Pozo del ascensor alrededor de la altura y (solo el tramo visible, para no dibujar 90 m de paredes).
  function pozo(P, y, corte = false) {   // corte: sin la pared derecha, para ver los rieles y los frenos
    const a = Math.max(0, y - 22), b = y + 26, h = b - a, m = (a + b) / 2;
    P.caja({ pos: [0, m, -1.75], tam: [4, h, .3], color: C.muro });
    for (const s of [-1, 1]) {
      if (!(corte && s > 0)) P.caja({ pos: [s * 2, m, 0], tam: [.3, h, 3.8], color: C.muro });
      P.caja({ pos: [s * 1.58, m, .15], tam: [.12, h, .14], color: C.metal });           // rieles
    }
    for (let k = Math.ceil(a / 3); k * 3 < b; k++) {                                      // una puerta por piso
      P.caja({ pos: [0, k * 3 + 1.1, -1.58], tam: [1.5, 2.2, .06], color: C.puerta });
      P.caja({ pos: [0, k * 3 + 2.28, -1.58], tam: [1.7, .12, .08], color: C.marco });
    }
    if (a <= 0) P.caja({ pos: [0, -.1, 0], tam: [40, .2, 40], color: C.piso });
  }
  // Cabina: o = { y, cable: 'entero' | 'roto', luz 0-1, puertas 0-1 (abiertas), mordazas 0-1 }
  function cabina(P, o) {
    P.grupo({ pos: [0, o.y, 0] }, () => {
      P.caja({ pos: [0, .06, 0], tam: [2.6, .12, 2.4], color: '#c0392b' });
      P.caja({ pos: [0, 1.36, -1.18], tam: [2.6, 2.6, .08], color: C.metal });
      for (const s of [-1, 1]) {
        P.caja({ pos: [s * 1.3, 1.36, 0], tam: [.08, 2.6, 2.4], color: C.metal });
        P.caja({ pos: [s * 1.36, .7, 0], tam: [.12, .5, .5], color: '#3b3f46' });          // zapatas sobre el riel
        const m = o.mordazas || 0;
        P.caja({ pos: [s * (1.47 + (1 - m) * .1), .3, .15], tam: [.1, .4, .5], color: m > 0 ? '#f0a020' : '#3b3f46', brillo: m * .3 });
      }
      if (o.techo !== false) P.caja({ pos: [0, 2.66, 0], tam: [2.6, .1, 2.4], color: C.metal });
      P.tubo({ de: [-1.1, 1, -1.1], a: [1.1, 1, -1.1], r: .03, color: C.marco });
      if (o.techo !== false) P.esfera({ pos: [0, 2.58, 0], r: .16, esc: [1.6, .4, 1.6], color: C.luz, brillo: .9 * (o.luz ?? 1), sombra: false });
      const ab = o.puertas || 0;                                                       // puertas de vidrio que se abren de lado
      for (const s of [-1, 1]) P.caja({ pos: [s * (.62 + ab * 1.1), 1.36, 1.2], tam: [1.24, 2.6, .05], color: '#cfe8f5', opacidad: .18, sombra: false });
      if (o.techo !== false) P.caja({ pos: [0, 2.72, 0], tam: [.6, .12, .6], color: '#3b3f46' });
      if (o.techo === false) {}
      else if (o.cable === 'roto') P.tubo({ de: [0, 2.78, 0], a: [.25, 4.2, .1], r: .04, color: '#2b2b2e' });
      else if (o.cable !== false) P.tubo({ de: [0, 2.78, 0], a: [0, 40, 0], r: .04, color: '#2b2b2e' });
    });
  }
  function chispas(P, x, y, z, k, n = 10) {
    if (k <= 0 || k >= 1) return;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = k * (1 + (i % 3) * .5);
      P.esfera({ pos: [x + Math.cos(a) * r, y + Math.sin(a * 1.7) * r * .6 - k * k * 2, z + Math.sin(a) * r * .5], r: .05 * (1 - k), color: '#ffcf4a', brillo: 1, sombra: false });
    }
  }
  const persona = (P, o) => P.persona({ colores: C.ropa, ...o });
  const caida = (y0, t) => y0 - 4.9 * t * t;                       // caída libre desde y0 (m)

  window.ESCENAS = [
    // 1. Gancho: se rompe el cable y la cabina se va hacia abajo. La persona flota del susto.
    (ctx, t, d, K, T) => {
      const ts = d * .3, u = Math.max(0, t - ts), y = caida(90, u), tb = T3.tiembla(T, u > 0 ? .06 : 0);
      T3.cuadro(ctx, T, { camara: { desde: [tb[0] + .4, y + 1.7 + tb[1], 6.8], hacia: [0, y + 1.1, 0], fov: 50 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: u > 0 ? 'roto' : 'entero', luz: u > 0 ? .6 + .4 * Math.sin(T * 30) : 1 });
        persona(P, { pose: u > 0 ? 'cae' : 'parado', pos: [0, y + .12 + Math.min(u, 1) * .35, 0], T, susto: u > 0 ? 1 : 0, mira: u > 0 ? 0 : -.5 });
        chispas(P, 0, y + 2.9, 0, prog(t, ts, ts + .8));
      });
    },
    // 2. La cabina baja por el pozo; las puertas de los pisos pasan volando.
    (ctx, t, d, K, T) => {
      const y = 60 - 26 * t / d;
      T3.cuadro(ctx, T, { camara: { desde: [3.2, y + 2.2, 9], hacia: [0, y + .9, 0], fov: 50 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: 'roto', luz: .8 });
        persona(P, { pose: 'cae', pos: [0, y + .45, 0], T, susto: 1 });
        P.viento({ pos: [0, y + 1.5, 1.6], dir: [0, 1, 0], T, largo: 6, ancho: 3.4, alto: .4, vel: 30, n: 12 });
      });
    },
    // 3. "Casi todos saltarían": salto en cámara lenta dentro de la cabina.
    (ctx, t, d, K, T) => {
      const y = 30 - 3 * t, k = prog(t, d * .25, d * .75), alto = Math.sin(Math.PI * k) * .5;
      T3.cuadro(ctx, T, { camara: { desde: [1.6, y + 1.5, 4.6], hacia: [0, y + 1.1, 0], fov: 48 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: 'roto' });
        persona(P, { pose: k > 0 && k < 1 ? 'salta' : 'agachado', pos: [0, y + .12 + alto, 0], T: T * .3, susto: .5 });
      });
    },
    // 4. Vista de corte: 150 km/h hacia abajo.
    (ctx, t, d, K, T) => {
      const y = 50 - 42 * t;
      T3.cuadro(ctx, T, { camara: { desde: [10, y - 1, 16], hacia: [0, y - 2.5, 0], fov: 45 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: 'roto' });
        persona(P, { pose: 'cae', pos: [0, y + .45, 0], T, susto: 1 });
        P.flecha({ de: [0, y - .4, 1.8], dir: [0, -1, 0], largo: lerp(.5, 4.5, prog(t, 0, d * .5)), color: C.rojo, r: .14 });
        P.viento({ pos: [0, y + 1.5, 0], dir: [0, 1, 0], T, largo: 9, ancho: 4, alto: 3, vel: 40, n: 16 });
      });
    },
    // 5. La flecha del salto (hacia arriba) es diminuta al lado de la de la caída.
    (ctx, t, d, K, T) => {
      const y = 20;
      T3.cuadro(ctx, T, { camara: { desde: [2.2, y + 1.4, 6], hacia: [.3, y + .9, 0], fov: 50 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: 'roto' });
        persona(P, { pose: 'salta', pos: [-.5, y + .4, 0], T: T * .3, susto: .6 });
        P.flecha({ de: [.7, y + 2.3, .6], dir: [0, -1, 0], largo: lerp(.4, 2.4, prog(t, 0, d * .3)), color: C.rojo, r: .12 });
        P.flecha({ de: [-.5, y + 2.2, .6], dir: [0, 1, 0], largo: lerp(.05, .28, prog(t, d * .4, d * .6)), color: C.verde, r: .05 });
      });
    },
    // 6. A oscuras: la luz parpadea y no se ve el suelo.
    (ctx, t, d, K, T) => {
      const y = 14 - 4 * t, luz = Math.sin(T * 23) > .2 ? 1 : .05;
      T3.cuadro(ctx, T, { camara: { desde: [.6, y + 1.5, 4.4], hacia: [0, y + 1.2, 0], fov: 50 }, mundo: { ...OSCURO, cielo: luz > .5 ? '#13203d' : '#070b14' } }, P => {
        pozo(P, y); cabina(P, { y, cable: 'roto', luz });
        persona(P, { pose: 'parado', pos: [0, y + .12, 0], rot: [0, Math.sin(T * 3) * .9, 0], T, susto: 1 });
      });
    },
    // 7. Llega casi igual de rápido: polvo y temblor (el golpe no se muestra).
    (ctx, t, d, K, T) => {
      const y = Math.max(0, 10 - 28 * t), golpe = prog(t, 10 / 28, 10 / 28 + 1.2), tb = T3.tiembla(T, golpe > 0 ? .25 * (1 - golpe) : 0);
      T3.cuadro(ctx, T, { camara: { desde: [5 + tb[0], 2.4 + tb[1], 11], hacia: [0, 1.4, 0], fov: 50 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: 'roto', luz: golpe > 0 ? .2 : .8 });
        if (golpe <= 0) persona(P, { pose: 'cae', pos: [0, y + .45, 0], T, susto: 1 });
        P.polvo({ pos: [0, 0, 1.4], k: golpe, r: 3.5, n: 16, color: '#8a8f96' });
        P.polvo({ pos: [0, 1.2, 1.8], k: golpe * .9, r: 2.6, n: 10, color: '#a7abb1' });
      });
    },
    // 8. De pie: las rodillas reciben todo el golpe.
    (ctx, t, d, K, T) => {
      const y = 6, pulso = .5 + .5 * Math.sin(T * 8), k = prog(t, d * .3, d * .5);
      T3.cuadro(ctx, T, { camara: { desde: [1.5, y + 1.2, 3.6], hacia: [0, y + .7, 0], fov: 46 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: 'roto' });
        persona(P, { pose: 'parado', pos: [0, y + .12, 0], rot: [0, -.6, 0], T, susto: .7 });
        for (const x of [-.1, .1]) P.esfera({ pos: [x, y + .58, .06], r: .12 + .06 * pulso * k, color: C.rojo, brillo: .9, opacidad: .55 * k, sombra: false });
        for (const x of [-.32, .32]) P.flecha({ de: [x, y + .13, .25], dir: [0, 1, 0], largo: .6 * k + .01, color: C.rojo, r: .07 });
      });
    },
    // 9. Vista desde arriba: se acuesta boca arriba en el piso de la cabina.
    (ctx, t, d, K, T) => {
      const y = 6, acostado = t > d * .4;
      T3.cuadro(ctx, T, { camara: { desde: [.8, y + 6.5, 2.4], hacia: [0, y, 0], fov: 46 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, techo: false });
        persona(P, { pose: acostado ? 'acostado' : 'agachado', pos: [0, y + .12, 0], T, susto: acostado ? .3 : .8 });
        P.polvo({ pos: [0, y + .1, 0], k: prog(t, d * .4, d * .7), r: 1, n: 6, color: '#cfd3d8' });
      });
    },
    // 10. El golpe se reparte: muchas flechitas a lo largo del cuerpo acostado.
    (ctx, t, d, K, T) => {
      const y = 6, k = prog(t, d * .1, d * .5);
      T3.cuadro(ctx, T, { camara: { desde: [1.3, y + 3.2, 3.4], hacia: [0, y + .3, 0], fov: 46 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, techo: false });
        persona(P, { pose: 'acostado', pos: [0, y + .12, 0], T, susto: .2 });
        for (let z = -.8; z <= .85; z += .24) for (const x of [-.36, .36]) P.flecha({ de: [x, y + .13, z], dir: [0, 1, 0], largo: .4 * k + .01, color: C.verde, r: .035 });
      });
    },
    // 11. Calma: casi nunca lo vas a necesitar.
    (ctx, t, d, K, T) => {
      const y = 12 + Math.sin(T * .8) * .03;
      T3.cuadro(ctx, T, { camara: T3.orbita([0, y + 1, 0], 6.5, -.3 + t * .12, 1.4), mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: 'entero' });
        persona(P, { pose: 'parado', pos: [0, y + .12, 0], T, susto: 0, mira: .5 });
      });
    },
    // 12. Frenos de seguridad: las mordazas muerden los rieles con chispas.
    (ctx, t, d, K, T) => {
      const m = prog(t, d * .3, d * .4), v = 9 * (1 - prog(t, d * .35, d * .75)), y = 30 - (t < d * .35 ? 9 * t : 9 * d * .35 + (9 + v) / 2 * (t - d * .35));
      T3.cuadro(ctx, T, { camara: { desde: [4.8, y + 1.3, 3.2], hacia: [1.3, y + .5, 0], fov: 40 }, mundo: OSCURO }, P => {
        pozo(P, y, true); cabina(P, { y, cable: 'roto', mordazas: m });
        persona(P, { pose: 'parado', pos: [0, y + .12, 0], T, susto: 1 - m });
        if (m > 0 && v > .5) { chispas(P, 1.55, y + .25, .2, (T * 3) % 1, 8); chispas(P, -1.55, y + .25, .2, (T * 3 + .5) % 1, 8); }
      });
    },
    // 13. Amortiguadores en el fondo del pozo: se aplastan bajo la cabina.
    (ctx, t, d, K, T) => {
      const k = prog(t, d * .2, d * .8), y = lerp(2.4, 1.1, sale(k)), aplasta = clamp((1.6 - y) / 1.3, 0, 1);
      T3.cuadro(ctx, T, { camara: { desde: [4.5, 1.6, 8.5], hacia: [0, 1.4, 0], fov: 46 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: 'roto' });
        persona(P, { pose: 'protege', pos: [0, y + .12, 0], T, susto: .6 });
        for (const x of [-.7, .7]) {
          P.cilindro({ pos: [x, .55 * (1 - aplasta * .45), 0], r: .28, alto: 1.1 * (1 - aplasta * .45), color: '#e0a33a' });
          for (let i = 0; i < 5; i++) P.toro({ pos: [x, .15 + i * .2 * (1 - aplasta * .45), 0], rot: [Math.PI / 2, 0, 0], r: .32, grosor: .05, color: '#3b3f46' });
        }
      });
    },
    // 14. 1945: un rascacielos de noche en corte; la cabina cae por dentro.
    (ctx, t, d, K, T) => {
      const y = 230 - 70 * t / d;
      T3.cuadro(ctx, T, { camara: { desde: [60, 120, 230], hacia: [0, 125, 0], fov: 44 }, mundo: { pasto: false, arboles: false, cielo: '#16213a', niebla: false } }, P => {
        P.caja({ pos: [0, -1, 0], tam: [400, 2, 400], color: '#2c323b' });
        for (const [w, y0, h] of [[60, 0, 120], [44, 120, 90], [28, 210, 50], [14, 260, 30]]) {
          P.caja({ pos: [-w / 4 - 2, y0 + h / 2, 0], tam: [w / 2 - 4, h, w], color: '#3a4f7a' });
          P.caja({ pos: [w / 4 + 2, y0 + h / 2, 0], tam: [w / 2 - 4, h, w], color: '#3a4f7a' });
          P.caja({ pos: [0, y0 + h / 2, -w / 2 + 2], tam: [8, h, 4], color: '#3a4f7a' });
          for (let fy = y0 + 4; fy < y0 + h - 2; fy += 9) for (const s of [-1, 1]) for (let fx = 6; fx < w / 2 - 4; fx += 7)
            P.caja({ pos: [s * fx, fy, w / 2 + .1], tam: [3, 4, .2], color: '#ffd77a', brillo: (fx + fy) % 3 ? .8 : .1, sombra: false });
        }
        P.cilindro({ pos: [0, 300, 0], r: 1.2, alto: 30, color: '#8b93a0' });
        P.caja({ pos: [0, 150, 0], tam: [4, 300, 4], color: '#1b1f25', opacidad: .35 });
        P.grupo({ pos: [0, y, 0], esc: 6 }, () => cabina(P, { y: 0, cable: 'roto', luz: 1 }));
      });
    },
    // 15. El cable amontonado y el aire apretado del pozo frenan la caída.
    (ctx, t, d, K, T) => {
      const k = prog(t, 0, d * .85), y = lerp(9, 1.2, sale(k));
      T3.cuadro(ctx, T, { camara: { desde: [4.6, 2.6, 9.5], hacia: [0, 2.4, 0], fov: 48 }, mundo: OSCURO }, P => {
        pozo(P, y); cabina(P, { y, cable: 'roto' });
        persona(P, { pose: 'acostado', pos: [0, y + .12, 0], T, susto: .5 });
        for (let i = 0; i < 7; i++) P.toro({ pos: [Math.sin(i) * .25, .08 + i * .12, Math.cos(i) * .2], rot: [Math.PI / 2, 0, 0], r: .9 - i * .06, grosor: .07, color: '#2b2b2e' });
        for (const x of [-1, 0, 1]) P.flecha({ de: [x, .3, 1.5], dir: [0, 1, 0], largo: Math.max(.05, y - 1), color: '#dfe7ee', r: .06 });
      });
    },
    // 16. Al piso, boca arriba: la cabina se detiene, se abren las puertas y se levanta sonriendo.
    (ctx, t, d, K, T) => {
      const ab = prog(t, d * .45, d * .7), parado = t > d * .72;
      T3.cuadro(ctx, T, { camara: { desde: [1.2, 1.9, 6.5], hacia: [0, 1.1, 0], fov: 48 }, mundo: OSCURO }, P => {
        pozo(P, 0); cabina(P, { y: 0, cable: false, puertas: ab });
        persona(P, { pose: parado ? 'parado' : 'acostado', pos: [0, .12, 0], T, susto: 0 });
      });
    },
    // 17. Cierre: sale del ascensor (abajo); la pregunta la pone el sistema arriba.
    (ctx, t, d, K, T) => {
      const z = lerp(0, 2.6, prog(t, 0, d * .7));
      T3.cuadro(ctx, T, { camara: { desde: [0, 2.1, 9.5], hacia: [0, 2.9, 0], fov: 50 }, mundo: OSCURO }, P => {
        pozo(P, 0); cabina(P, { y: 0, cable: false, puertas: 1 });
        persona(P, { pose: z < 2.6 ? 'camina' : 'parado', pos: [0, .12 * (1 - prog(t, 0, d * .3)), z], T, susto: 0 });
      });
    },
  ];
})();
