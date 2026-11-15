// "Cómo vuela un avión" — Taller 3D. La avioneta se desarma y se vuelve a armar: cada pieza aparece porque sin ella algo falla.
// Ejes de la avioneta: nariz hacia +X, arriba +Y, alas a lo largo de Z. rot = [alabeo, rumbo, cabeceo] (cabeceo + = nariz arriba).
(() => {
  const { lerp, prog, sale, rebote, clamp } = K;
  const C = { cuerpo: '#f5a623', ala: '#f4f1ea', oscuro: '#5b5f66', madera: '#c98a4b', vidrio: '#9fd8f0', rojo: '#e5484d', verde: '#5fa64a' };
  const PANZA = .5, RUEDAS = 1.37;           // altura del centro del tubo apoyado de panza y sobre las ruedas
  const ap = k => (k <= 0 ? 0 : k >= 1 ? 1 : rebote(k));
  const parte = (P, k, o, fn) => { if (k > 0) P.grupo({ ...o, esc: o.eje ? o.eje.map(v => (v ? ap(k) : 1)) : ap(k) }, fn); };

  // ---------- la avioneta: cada pieza con su factor de aparición 0-1 ----------
  function avion(P, o) {
    P.grupo({ pos: o.pos || [0, PANZA, 0], rot: o.rot || [0, 0, 0] }, () => {
      // Tubo (fuselaje), nariz y cola cónica
      P.cilindro({ pos: [.3, 0, 0], rot: [0, 0, Math.PI / 2], r: .5, alto: 3.4, color: C.cuerpo });
      P.esfera({ pos: [2, 0, 0], r: .5, color: C.cuerpo });
      P.cono({ pos: [-2.6, .08, 0], rot: [0, 0, Math.PI / 2], r: .5, alto: 2.4, color: C.cuerpo });
      P.cilindro({ pos: [.3, 0, 0], rot: [0, 0, Math.PI / 2], r: .505, alto: .25, color: C.ala });
      if (o.cabina !== false) {
        P.piloto({ pos: [.95, .02, 0], rot: [0, Math.PI / 2, 0], esc: .78, susto: o.susto || 0, T: o.T });
        P.esfera({ pos: [.95, .38, 0], r: .46, esc: [1.45, .8, .9], color: C.vidrio, opacidad: .45, sombra: false });
      }
      // Motor y hélice
      parte(P, o.motor ?? 1, { pos: [2.45, 0, 0] }, () => {
        P.cilindro({ rot: [0, 0, Math.PI / 2], r: .24, alto: .4, color: C.oscuro });
        P.helice({ pos: [.24, 0, 0], rot: [0, 0, -Math.PI / 2], largo: 1.05, ancho: .2, palas: 2, giro: o.helice || 0, rapida: o.rapida || 0, color: C.madera });
      });
      // Alas (con alerones y flaps opcionales). `inclina` = ángulo de ataque.
      parte(P, o.alas ?? 0, { pos: [.5, .45, 0], rot: [0, 0, o.inclina || 0], eje: [0, 0, 1] }, () => {
        P.caja({ tam: [1.3, .09, 7.6], color: C.ala });
        for (const s of [-1, 1]) P.caja({ pos: [0, 0, s * 3.75], tam: [1.32, .11, .22], color: C.rojo });
        if (o.alerones != null) for (const s of [-1, 1]) P.grupo({ pos: [-.65, 0, s * 2.85], rot: [0, 0, -s * o.alerones * .55] }, () =>
          P.caja({ pos: [-.2, 0, 0], tam: [.4, .07, 1.6], color: C.cuerpo }));
        if (o.flaps != null) for (const s of [-1, 1]) P.grupo({ pos: [-.65, 0, s * 1.35] , rot: [0, 0, o.flaps * .7] }, () =>
          P.caja({ pos: [-.2, 0, 0], tam: [.4, .07, 1.3], color: C.oscuro }));
      });
      // Cola horizontal (estabilizador + elevador)
      parte(P, o.colaH ?? 0, { pos: [-3.45, .22, 0], eje: [0, 0, 1] }, () => {
        P.caja({ tam: [.9, .07, 2.8], color: C.ala });
        if (o.elevador != null) P.grupo({ pos: [-.45, 0, 0], rot: [0, 0, -o.elevador * .5] }, () => P.caja({ pos: [-.16, 0, 0], tam: [.32, .06, 2.6], color: C.cuerpo }));
      });
      // Cola vertical (deriva + timón)
      parte(P, o.colaV ?? 0, { pos: [-3.35, .25, 0], eje: [0, 1, 0] }, () => {
        P.caja({ pos: [0, .62, 0], tam: [1.0, 1.25, .07], color: C.ala });
        P.caja({ pos: [0, 1.2, 0], tam: [1.02, .14, .09], color: C.rojo });
        if (o.timon != null) P.grupo({ pos: [-.5, .62, 0], rot: [0, o.timon * .6, 0] }, () => P.caja({ pos: [-.16, 0, 0], tam: [.32, 1.15, .06], color: C.cuerpo }));
      });
      // Tren de aterrizaje: dos ruedas principales y una delantera
      parte(P, o.tren ?? 0, { pos: [0, -.4, 0], eje: [0, 1, 0] }, () => {
        for (const [x, z] of [[.3, .85], [.3, -.85], [2, 0]]) {
          P.tubo({ de: [x, 0, z * .6], a: [x, -.75, z], r: .05, color: C.oscuro });
          P.rueda({ pos: [x, -.75, z], rot: [0, Math.PI / 2, 0], r: .22, ancho: .14, giro: o.ruedas || 0 });
        }
      });
    });
  }
  // Configuraciones de la historia (lo que la avioneta ya tiene en cada momento)
  const COMPLETO = { motor: 1, alas: 1, colaH: 1, colaV: 1, tren: 1, alerones: 0, elevador: 0, timon: 0, flaps: 0 };

  function arbolGrande(P, x, z, s = 3) {
    P.cilindro({ pos: [x, 1.6 * s, z], r: .3 * s, alto: 3.2 * s, color: '#8a6a4a', lados: 8 });
    [[0, 3.8, 0, 1.7], [-1, 3.2, .4, 1.25], [1, 3.3, -.3, 1.3], [.1, 4.8, .1, 1.2]].forEach(([dx, dy, dz, r], i) =>
      P.esfera({ pos: [x + dx * s, dy * s, z + dz * s], r: r * s, color: ['#5fa64a', '#6cb553', '#559c42'][i % 3], baja: true }));
  }
  // Chorros de aire a lo largo del ala vista de lado: rectos antes del ala y doblados hacia abajo detrás (desvío = 0-1).
  function chorros(P, T, cx, cy, desvio, n = 7) {
    for (let i = 0; i < n; i++) {
      const y = cy + (i - (n - 1) / 2) * .32, z = 4.2;
      for (let s = 0; s < 3; s++) {
        const u = ((T * 1.1 + i * .37 + s / 3) % 1);           // posición a lo largo del recorrido
        const x = lerp(cx + 4, cx - 5, u), largo = .9;
        const detras = clamp((cx - x) / 2, 0, 1), cae = detras * desvio * 1.6 * (1 - Math.abs(i - (n - 1) / 2) / n);
        const y2 = y - cae, y1 = y - clamp((cx - (x + largo)) / 2, 0, 1) * desvio * 1.6 * (1 - Math.abs(i - (n - 1) / 2) / n);
        P.tubo({ de: [x + largo, y1, z], a: [x, y2, z], r: .03, color: '#ffffff', opacidad: .8 * Math.sin(Math.PI * u), sombra: false });
      }
    }
  }
  const mundo = { muro: true, pista: true };

  window.ESCENAS = [
    // 1. Gancho: vuela completa, se le desprende la aleta de la cola y se va en picada girando (todo arriba de la portada).
    (ctx, t, d, K, T) => {
      const suelta = d * .3, u = Math.max(0, t - suelta), x = -6 + t * 5, y = Math.max(PANZA + .3, 6.2 - u * u * 2.2), suelo = prog(y, PANZA + .9, PANZA + .3);
      const rumbo = u * u * 1.8, alabeo = u * 2.2, cab = -Math.min(u, 1.6) * .5;
      T3.cuadro(ctx, T, { camara: { desde: [x * .5 - 1, 2.6 + (6.2 - y) * 1.1, 18], hacia: [x * .7, y - 2.6, 0], fov: 50 }, mundo }, P => {
        avion(P, { ...COMPLETO, colaV: t < suelta ? 1 : 0, pos: [x, y, 0], rot: [alabeo, rumbo, cab], helice: T * 60, rapida: 1, susto: u > 0 ? 1 : 0, T });
        if (u > 0) P.grupo({ pos: [x - 3.4 - u * 2, 6.6 + u * 1.5 - u * u * 2, u * 1.2], rot: [u * 5, u * 3, u * 4] }, () => {
          P.caja({ pos: [0, .62, 0], tam: [1.0, 1.25, .07], color: C.ala }); P.caja({ pos: [0, 1.2, 0], tam: [1.02, .14, .09], color: C.rojo });
        });
        P.polvo({ pos: [x, 0, 0], k: suelo > 0 ? Math.min(.99, (u - Math.sqrt((6.2 - PANZA - .3) / 2.2)) / 1.2 + .05) : 0, r: 3, n: 12 });
      });
    },
    // 2. Se desarma: las piezas saltan una a una hasta que queda el tubo.
    (ctx, t, d, K, T) => {
      const q = k => 1 - prog(t, d * k, d * (k + .14));
      const tren = q(.62), y = lerp(PANZA, RUEDAS, tren);
      T3.cuadro(ctx, T, { camara: T3.orbita([0, .6, 0], 17, .5 + t * .1, 5), mundo }, P => {
        avion(P, { pos: [0, y, 0], motor: q(.72), alas: q(.08), colaH: q(.24), colaV: q(.38), tren, alerones: q(.08) > .5 ? 0 : null, flaps: q(.08) > .5 ? 0 : null, T });
        P.polvo({ pos: [0, 0, 0], k: prog(t, d * .7, d * .95), r: 2 });
      });
    },
    // 3. Lo mínimo: el tubo rebota y aparecen el motor y la hélice.
    (ctx, t, d, K, T) => {
      T3.cuadro(ctx, T, { camara: { desde: [5, 3.4, 14], hacia: [.2, .3, 0], fov: 45 }, mundo }, P => {
        avion(P, { pos: [0, PANZA + T3.caida(t, 2.2), 0], motor: prog(t, d * .45, d * .7), helice: t * 2, T });
        P.polvo({ pos: [0, 0, 0], k: prog(t, .5, 1.3), r: 2 });
      });
    },
    // 4. La hélice empuja el aire hacia atrás y el tubo arranca.
    (ctx, t, d, K, T) => {
      const giro = Math.pow(t, 2) * 12 + t * 8, x = Math.max(0, t - d * .55) ** 2 * 3;
      T3.cuadro(ctx, T, { camara: { desde: [x + 3, 3, 14], hacia: [x + .6, .4, 0], fov: 45 }, mundo }, P => {
        avion(P, { pos: [x, PANZA, 0], motor: 1, helice: giro, rapida: prog(t, d * .1, d * .4), T });
        P.viento({ pos: [x + 1.2, .5, 0], dir: [-1, 0, 0], T, largo: 5, ancho: 1.4, alto: 1.2, vel: 10, n: 12 });
        P.flecha({ de: [x + 3, .5, 0], dir: [1, 0, 0], largo: lerp(.3, 2.2, prog(t, d * .25, d * .55)), color: '#8e6cf0' });
      });
    },
    // 5. Corre rapidísimo y no se levanta.
    (ctx, t, d, K, T) => {
      const x = -40 + t * 22;
      T3.cuadro(ctx, T, { camara: { desde: [x - 9, 2.4, 11], hacia: [x + 1, .5, 0], fov: 50 }, mundo: { pista: true } }, P => {
        avion(P, { pos: [x, PANZA + Math.sin(T * 50) * .015, 0], motor: 1, helice: T * 70, rapida: 1, T });
        P.viento({ pos: [x, .6, 0], dir: [-1, 0, 0], T, largo: 9, ancho: 4, alto: 2, vel: 30, n: 16 });
      });
    },
    // 6. Le falta empujar aire hacia abajo: peso hacia abajo y una pregunta.
    (ctx, t, d, K, T) => {
      T3.cuadro(ctx, T, { camara: { desde: [3, 3.6, 13], hacia: [0, 1.4, 0], fov: 45 }, mundo }, P => {
        avion(P, { pos: [0, PANZA, 0], motor: 1, helice: T * 3, T });
        const L = lerp(.4, 2.2, prog(t, d * .1, d * .4));
        P.flecha({ de: [-.6, 1.3 + L, 0], dir: [0, -1, 0], largo: L, color: C.rojo, r: .09 });
      });
    },
    // 7. Alas planas: el viento pasa derecho, casi nada.
    (ctx, t, d, K, T) => {
      T3.cuadro(ctx, T, { camara: { desde: [7, 5, 15], hacia: [.3, .7, 0], fov: 45 }, mundo }, P => {
        avion(P, { pos: [0, PANZA, 0], motor: 1, alas: prog(t, 0, d * .35), helice: T * 30, rapida: .7, T });
        if (t > d * .4) P.viento({ pos: [.5, .95, 0], dir: [-1, 0, 0], T, largo: 6, ancho: 6, alto: .6, vel: 8, n: 14 });
      });
    },
    // 8. Alas inclinadas: vista de lado, el aire sale doblado hacia abajo.
    (ctx, t, d, K, T) => {
      const ang = lerp(0, .16, prog(t, d * .05, d * .4));
      T3.cuadro(ctx, T, { camara: { desde: [.3, 1.5, 13], hacia: [.3, 1.1, 3.8], fov: 26 }, mundo: { pista: true, muro: true } }, P => {
        avion(P, { pos: [0, PANZA, 0], motor: 1, alas: 1, inclina: ang, helice: T * 30, rapida: .7, T });
        chorros(P, T, .5, .95, prog(t, d * .3, d * .65));
      });
    },
    // 9. El aire empuja el ala hacia arriba: sustentación.
    (ctx, t, d, K, T) => {
      const sube = prog(t, d * .7, d) * 1.2;
      T3.cuadro(ctx, T, { camara: { desde: [.3, 2.2, 14], hacia: [.3, 1.9, 3.8], fov: 30 }, mundo: { pista: true, muro: true } }, P => {
        avion(P, { pos: [0, PANZA + sube, 0], motor: 1, alas: 1, inclina: .16, helice: T * 30, rapida: .8, T });
        chorros(P, T, .5, .95 + sube, 1);
        for (const x of [-1.6, -2.4]) P.flecha({ de: [x, .8 + sube, 4.2], dir: [0, -1, 0], largo: 1, color: '#ffffff' });
        P.flecha({ de: [.5, 1.1 + sube, 0], dir: [0, 1, 0], largo: lerp(.3, 2.2, prog(t, d * .35, d * .7)), color: '#8e6cf0', r: .1 });
      });
    },
    // 10. ¡Despegamos! (sin cola).
    (ctx, t, d, K, T) => {
      const x = t * 14, y = PANZA + Math.max(0, t - .3) ** 1.4 * 1.6, cab = .1 + t / d * .12;
      T3.cuadro(ctx, T, { camara: { desde: [x - 10, y + 2.2, 14], hacia: [x, y - .4, 0], fov: 48 }, mundo }, P =>
        avion(P, { pos: [x, y, 0], rot: [0, 0, cab], motor: 1, alas: 1, inclina: .06, helice: T * 70, rapida: 1, T }));
    },
    // 11. La nariz sube sin control: maroma y caída.
    (ctx, t, d, K, T) => {
      const u = t / d, cab = u < .55 ? .22 + (u / .55) ** 2 * 1.5 : 1.72 + (u - .55) / .45 * 5.2;
      const x = 30 + Math.min(u, .55) * 16 + Math.max(0, u - .55) * 5, y = u < .55 ? 6 + u * 6 : Math.max(PANZA, 9.3 - ((u - .55) / .3) ** 2 * 9);
      const choque = prog(t, d * .84, d);
      T3.cuadro(ctx, T, { camara: { desde: [38, 4.5, 30], hacia: [39, 5.5, 0], fov: 50 }, mundo }, P => {
        avion(P, { pos: [x, y, 0], rot: [0, 0, choque > 0 ? 3.1 : cab], motor: 1, alas: 1, inclina: .06, helice: T * 60, rapida: 1 - choque, susto: prog(t, d * .3, d * .5), T });
        P.polvo({ pos: [x, 0, 0], k: choque, r: 3, n: 12 });
      });
    },
    // 12. El estabilizador: la nariz oscila y vuelve a quedar derecha.
    (ctx, t, d, K, T) => {
      const k = prog(t, 0, d * .3), u = Math.max(0, t - d * .35), cab = .35 * Math.exp(-2.4 * u) * Math.cos(5 * u);
      const x = T * 12 % 60 - 30;
      T3.cuadro(ctx, T, { camara: { desde: [x - 1, 7.2, 17], hacia: [x - .6, 5.6, 0], fov: 45 }, mundo }, P => {
        avion(P, { pos: [x, 6, 0], rot: [0, 0, t < d * .35 ? .35 : cab], motor: 1, alas: 1, inclina: .06, colaH: k, helice: T * 60, rapida: 1, T });
        if (t > d * .35) P.flecha({ de: [x - 3.5, 6.6, 0], dir: [0, cab > 0 ? 1 : -1, 0], largo: .7 + Math.abs(cab) * 6, color: '#8e6cf0', r: .09 });
      });
    },
    // 13. Ráfaga de lado: derrapa.
    (ctx, t, d, K, T) => {
      const u = Math.max(0, t / d - .35) / .65, rumbo = u * u * 1.6 * Math.sin(u * 7 + .3), x = t * 9, z = -u * u * 3;
      T3.cuadro(ctx, T, { camara: { desde: [x - 16, 11, 7], hacia: [x, 5.4, z], fov: 45 }, mundo }, P => {
        avion(P, { pos: [x, 6, z], rot: [rumbo * .3, rumbo, 0], motor: 1, alas: 1, inclina: .06, colaH: 1, helice: T * 60, rapida: 1, susto: u, T });
        if (u > 0) P.viento({ pos: [x, 6, z + 3], dir: [0, 0, -1], T, largo: 7, ancho: 8, alto: 3, vel: 14, n: 16 });
      });
    },
    // 14. La deriva lo endereza como las plumas de una flecha.
    (ctx, t, d, K, T) => {
      const u = Math.max(0, t - d * .3), rumbo = t < d * .3 ? .8 : .8 * Math.exp(-2 * u) * Math.cos(6 * u), x = 40 + t * 9;
      T3.cuadro(ctx, T, { camara: { desde: [x - 15, 11, 9], hacia: [x, 5.4, 0], fov: 45 }, mundo }, P => {
        avion(P, { pos: [x, 6, 0], rot: [rumbo * .25, rumbo, 0], motor: 1, alas: 1, inclina: .06, colaH: 1, colaV: prog(t, 0, d * .3), helice: T * 60, rapida: 1, T });
        P.viento({ pos: [x, 6, 0], dir: [-1, 0, 0], T, largo: 8, ancho: 6, alto: 3, vel: 16, n: 12 });
      });
    },
    // 15. No puede girar y viene un árbol.
    (ctx, t, d, K, T) => {
      const x = lerp(-30, -9, t / d), arbol = 0;
      T3.cuadro(ctx, T, { camara: { desde: [x - 14, 8.5, 4.5], hacia: [x + 5, 5, 0], fov: 50 }, mundo: { muro: false, pista: true } }, P => {
        avion(P, { ...COMPLETO, alerones: null, elevador: null, timon: null, flaps: null, pos: [x, 5.5, 0], helice: T * 60, rapida: 1, susto: prog(t, d * .4, d * .8), T });
        arbolGrande(P, arbol, 0, 3);
      });
    },
    // 16. Alerones: uno sube, el otro baja, y se ladea. Vista desde atrás.
    (ctx, t, d, K, T) => {
      const a = prog(t, d * .25, d * .55), alabeo = a * .7, x = -20 + t * 2;
      T3.cuadro(ctx, T, { camara: { desde: [x - 26, 6.2, 0], hacia: [x + 1, 5.4, 0], fov: 24 }, mundo: { pista: true } }, P =>
        avion(P, { ...COMPLETO, elevador: null, timon: null, flaps: null, alerones: a, pos: [x, 5.5, 0], rot: [alabeo, 0, 0], helice: T * 60, rapida: 1, T }));
    },
    // 17. Timón y elevador: la cola se mueve y esquiva el árbol.
    (ctx, t, d, K, T) => {
      const u = t / d, giro = prog(t, d * .35, d), x = -14 + u * 9, z = -giro * giro * 9, rumbo = giro * .9;
      T3.cuadro(ctx, T, { camara: { desde: [x - 10, 8.6, 9], hacia: [x - 1, 5.4, z], fov: 48 }, mundo: { pista: true } }, P => {
        avion(P, { ...COMPLETO, flaps: null, alerones: giro * .5, timon: Math.sin(T * 3) * .6 * (1 - giro) + giro * .8, elevador: Math.sin(T * 2.4 + 1) * .6 * (1 - giro),
          pos: [x, 5.5, z], rot: [giro * .5, rumbo, 0], helice: T * 60, rapida: 1, T });
        arbolGrande(P, 0, 0, 3);
      });
    },
    // 18. Aterrizaje sin flaps ni ruedas: llega como un misil y rebota de panza.
    (ctx, t, d, K, T) => {
      const u = t / d, x = lerp(-28, 22, u), toca = .45, y = u < toca ? lerp(9, PANZA, (u / toca) ** 1.2) : PANZA + T3.caida(t - d * toca, 1.6, .5);
      T3.cuadro(ctx, T, { camara: { desde: [x - 7, 2.4, 15], hacia: [x + 2, Math.max(1.2, y - 1.5), 0], fov: 50 }, mundo }, P => {
        avion(P, { ...COMPLETO, tren: 0, flaps: null, pos: [x, y, 0], rot: [u > toca ? Math.sin(T * 9) * .12 : 0, 0, u < toca ? -.2 : .05], helice: T * 60, rapida: 1, susto: u > .3 ? 1 : 0, T });
        P.polvo({ pos: [lerp(-28, 22, toca + .02), 0, 0], k: prog(t, d * toca, d * (toca + .3)), r: 3, n: 12 });
      });
    },
    // 19. Flaps: primer plano del ala; bajan y la flecha hacia arriba crece.
    (ctx, t, d, K, T) => {
      const f = prog(t, d * .15, d * .5);
      T3.cuadro(ctx, T, { camara: { desde: [-6, 9.5, 9], hacia: [0, 5.4, 1.4], fov: 42 }, mundo: { pista: true } }, P => {
        avion(P, { ...COMPLETO, tren: 0, flaps: f, pos: [0, 5.5, 0], rot: [0, 0, .08], helice: T * 50, rapida: 1, T });
        P.flecha({ de: [.5, 6.1, 2.2], dir: [0, 1, 0], largo: lerp(.8, 1.8, f), color: '#8e6cf0', r: .08 });
      });
    },
    // 20. Tren de aterrizaje: sale, toca la pista suave y rueda.
    (ctx, t, d, K, T) => {
      const u = t / d, tren = prog(t, 0, d * .3), toca = .6, x = lerp(-8, 14, u) - Math.max(0, u - toca) ** 2 * 10;
      const y = u < toca ? lerp(4, RUEDAS, sale(u / toca)) : RUEDAS;
      T3.cuadro(ctx, T, { camara: { desde: [x - 4, 1.4, 13], hacia: [x + 1, 1.6, 0], fov: 45 }, mundo }, P => {
        avion(P, { ...COMPLETO, tren, flaps: 1, pos: [x, y, 0], rot: [0, 0, u < toca ? .1 : .02], ruedas: u > toca ? (u - toca) * d * 25 : 0, helice: T * 30, rapida: .6, T });
        P.polvo({ pos: [x + .3, 0, 0], k: prog(t, d * toca, d * (toca + .25)), r: 1.4, n: 6 });
      });
    },
    // 21. Completa: despega y pasa sobre la cámara, como en la escena 1.
    (ctx, t, d, K, T) => {
      const x = -14 + t * 9, y = RUEDAS + Math.max(0, t - d * .25) ** 1.5 * 1.5, cab = t > d * .25 ? .14 : 0;
      T3.cuadro(ctx, T, { camara: { desde: [x * .4, 1.3, 16], hacia: [x * .8, 2.6, 0], fov: 50 }, mundo }, P =>
        avion(P, { ...COMPLETO, pos: [x, y, 0], rot: [0, 0, cab], helice: T * 60, rapida: 1, ruedas: t * 20, T }));
    },
    // 22. Cierre: la avioneta da vueltas a lo lejos (la pregunta la pone la capa final, arriba).
    (ctx, t, d, K, T) => {
      const a = T * .5, x = Math.cos(a) * 7, z = -1 + Math.sin(a) * 4;
      T3.cuadro(ctx, T, { camara: { desde: [0, 7, 25], hacia: [0, 5.8, 0], fov: 50 }, mundo: { muro: true, pista: true } }, P =>
        avion(P, { ...COMPLETO, pos: [x, 2.6, z], rot: [-.35, -a - Math.PI / 2, 0], helice: T * 60, rapida: 1, T }));
    },
  ];
})();
