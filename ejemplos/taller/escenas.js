// "Cómo vuela un avión" — Así se fabrica en el motor 2D (W2 = plantilla/taller2d.js). Misma historia que la versión 3D: la avioneta se desarma y se
// vuelve a armar; cada pieza aparece porque sin ella algo falla a la vista. Mundo: Y=0 es la pista, Y negativa = arriba, nariz hacia +X.
(() => {
  const { lerp, prog, sale, rebote, clamp, hash } = K, C = W2.C, PI = Math.PI;
  const AL = { cuerpo: C.naranja, ala: '#e9e2cf', osc: C.acero2, rojo: C.rojo, vidrio: '#bfe3ea', madera: C.madera };

  const F = W2.F, E = W2.E, Rc = W2.R;
  const poly = (ctx, pts, c, o) => W2.forma(ctx, pts, c, Object.assign({ volumen: .6, borde: .9, anchoBorde: 4, textura: .3, irregular: .3 }, o));
  // cuadrilátero de flap/timón: bisagra H1-H2, borde de salida desviado un ángulo b (la proyección lo baja y lo acorta)
  const mando = (ctx, h1, h2, largo, b, c, sem) => { const dx = -largo * Math.cos(b), dy = largo * Math.sin(b); poly(ctx, [h1, h2, [h2[0] + dx, h2[1] + dy], [h1[0] + dx, h1[1] + dy]], c, { semilla: sem, volumen: .7 }); };
  const en = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

  // ---------- la avioneta: cada pieza con su factor de aparición 0-1 (null = sin esa parte) y su manera de entrar ----------
  function avion(ctx, o) {
    const T = o.T || 0, ap = v => v == null ? 0 : v;
    W2.grupo(ctx, { x: o.x, y: o.y, rot: o.rot, s: o.s == null ? .85 : o.s, espejo: o.espejo, vib: o.vib, T, k: o.k }, () => {
      const alas = ap(o.alas), col = o.cuerpoColor || AL.cuerpo;
      // alas lejanas y cola lejana (detrás del fuselaje)
      W2.grupo(ctx, { k: alas, entra: 'desliza', desde: [0, -260], rf: 90 }, () => poly(ctx, [[60, -44], [-52, -44], [-116, -122], [-60, -122]], AL.ala, { semilla: 3 }));
      W2.grupo(ctx, { k: ap(o.colaH), entra: 'atornilla', desde: [0, -70] }, () => poly(ctx, [[-236, -20], [-292, -20], [-336, -74], [-292, -74]], AL.ala, { semilla: 4 }));
      // fuselaje: tubo + nariz + cola cónica (siempre)
      poly(ctx, P_cola, col, { semilla: 5, volumen: .75 });
      W2.cilindro(ctx, { x: 0, y: 0, w: 340, h: 100, color: col, tapa: false });
      F(ctx, E(170, 0, 44, 50, 0, 28), col, { semilla: 6, volumen: .8, borde: .9, irregular: .3 });
      W2.caja(ctx, { x: -96, y: 0, w: 34, h: 100, color: AL.ala, r: 3, bisel: false });
      // cabina: el patito dentro, el vidrio por delante
      if (o.cabina !== false) {
        ctx.save(); ctx.beginPath(); ctx.rect(-120, -220, 300, 174); ctx.clip();
        W2.patito(ctx, T, { x: 28, y: -8, s: .33, estado: o.susto > .5 ? 'susto' : o.celebra ? 'celebra' : 'normal', estado2: o.susto > 0 && o.susto <= .5 ? 'susto' : undefined, k2: o.susto * 2, casco: 'aviador', sombraSuelo: false, vib: o.susto > .5 ? 2 : 0 });
        ctx.restore();
        const dome = []; for (let i = 0; i <= 20; i++) { const a = PI + i / 20 * PI; dome.push([30 + Math.cos(a) * 68, -44 + Math.sin(a) * 70]); }
        poly(ctx, dome, AL.vidrio, { semilla: 7, alfa: .36, volumen: .3, borde: 1, anchoBorde: 5, textura: 0, irregular: 0 }); ctx.strokeStyle = 'rgba(30,34,48,.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-34, -44); ctx.lineTo(90, -44); ctx.stroke();
      }
      // motor y hélice
      W2.grupo(ctx, { k: ap(o.motor), entra: 'encaja', desde: [150, 0], rf: 80 }, () => {
        W2.cilindro(ctx, { x: 206, y: 0, w: 46, h: 70, color: AL.osc, tapa: 'der' });
        W2.helice(ctx, { x: 232, y: 0, r: 96, palas: 2, giro: o.helice || 0, rapida: o.rapida || 0, color: AL.madera });
      });
      // tren de aterrizaje
      W2.grupo(ctx, { k: ap(o.tren), entra: 'desliza', desde: [0, -80], rf: 60 }, () => {
        for (const [x, y, r] of [[8, 100, 31], [158, 94, 24]]) { W2.biela(ctx, { de: [x - 4, 40], a: [x, y], r: 5, color: AL.osc }); W2.rueda(ctx, { x, y, r, giro: o.ruedas || 0, rayos: 4, color: C.acero }); }
      });
      // ala cercana (+ alerones y flaps)
      W2.grupo(ctx, { k: alas, entra: 'desliza', desde: [-40, -260], rf: 100, rot: o.inclina || 0, pivote: [0, 14] }, () => {
        const A = [72, 14], B = [-62, 14], Cc = [-128, 150], D = [-52, 150];
        poly(ctx, [A, B, Cc, D], AL.ala, { semilla: 8 });
        poly(ctx, [en(D, Cc, 0), Cc, [Cc[0] - 2, 134], [-52, 134]], AL.rojo, { semilla: 10 });
        if (o.alerones != null) mando(ctx, en(B, Cc, .52), en(B, Cc, .92), 26, o.alerones * .8, AL.cuerpo, 11);
        if (o.flaps != null) mando(ctx, en(B, Cc, .1), en(B, Cc, .48), 28, o.flaps * .9, AL.osc, 12);
      });
      // cola horizontal cercana (+ elevador) y vertical (+ timón)
      W2.grupo(ctx, { k: ap(o.colaH), entra: 'atornilla', desde: [0, -70], rf: 60 }, () => { const A = [-236, 20], B = [-298, 20], Cc = [-348, 92], D = [-300, 92]; poly(ctx, [A, B, Cc, D], AL.ala, { semilla: 13 }); if (o.elevador != null) mando(ctx, en(B, Cc, .05), en(B, Cc, .95), 20, o.elevador * .7, AL.cuerpo, 14); });
      W2.grupo(ctx, { k: ap(o.colaV), entra: 'encaja', desde: [-120, -110], rf: 70, clic: true }, () => { poly(ctx, [[-232, -48], [-318, -46], [-336, -150], [-296, -150]], AL.ala, { semilla: 15 }); poly(ctx, [[-296, -150], [-336, -150], [-334, -132], [-298, -132]], AL.rojo, { semilla: 16 });
        if (o.timon != null) { const b = o.timon * .6, dx = -26 * Math.cos(b); poly(ctx, [[-318, -46], [-336, -150], [-336 + dx, -150], [-318 + dx, -46]], AL.cuerpo, { semilla: 17, volumen: .7 }); } });
    });
  }
  const P_cola = P_(); function P_() { return Ilustra.Pincel.suavizar([[-166, -50], [-250, -36], [-330, -14], [-332, 10], [-250, 34], [-166, 50]], 3); }

  // ---------- helpers de escena ----------
  const S = .85, PANZA = -50 * S, RUEDAS = -131 * S;
  const COMPLETO = { motor: 1, alas: 1, colaH: 1, colaV: 1, tren: 1, alerones: 0, elevador: 0, timon: 0, flaps: 0 };
  const pista = (ctx, T, cam, fn, o) => W2.escena(ctx, T, Object.assign({ fondo: 'pista', cam }, o), fn);
  const sombraAv = (c, x, y, s = S) => W2.sombra(c, { x, y: 4, w: 230 * s, a: clamp(.55 - (-y - 50) / 1100, .08, .55) });
  const rot2 = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const punto = (px, py, r, s, dx, dy) => { const q = rot2(dx * s, dy * s, r); return [px + q[0], py + q[1]]; };   // punto local de la avioneta → mundo
  const ORO = '#e0b060', ROJO = '#c0553f';
  function arbol(c, x, s = 1) {
    W2.sombra(c, { x, y: 4, w: 220 * s, a: .5 });
    F(c, Rc(x - 24 * s, -380 * s, 48 * s, 384 * s, 8 * s), '#6b4a36', { semilla: 31, volumen: .7, borde: .8, textura: .5 });
    [[0, -450, 175, '#58704f'], [-125, -370, 125, '#4f6a48'], [125, -360, 130, '#64804f'], [8, -580, 125, '#5f7a50'], [-70, -490, 100, '#6a8656']].forEach(([dx, dy, r, col], i) =>
      F(c, E(x + dx * s, dy * s, r * s, r * s * .93, 0, 30), col, { semilla: 32 + i, volumen: .9, borde: .9, anchoBorde: 6, textura: .5, irregular: 2.2, sombraInterna: .4 }));
  }
  // la avioneta vista desde arriba (nariz hacia arriba con yaw = 0) y desde atrás
  function avionArriba(ctx, o) {
    W2.grupo(ctx, { x: o.x, y: o.y, rot: o.yaw || 0, s: o.s || .9, vib: o.vib, T: o.T }, () => {
      poly(ctx, [[-250, -52], [250, -52], [250, 28], [-250, 28]], AL.ala, { semilla: 41 }); for (const sx of [-1, 1]) poly(ctx, [[sx * 224, -52], [sx * 250, -52], [sx * 250, 28], [sx * 224, 28]], AL.rojo, { semilla: 42, volumen: .5 });
      poly(ctx, [[-100, 150], [100, 150], [100, 196], [-100, 196]], AL.ala, { semilla: 43 });
      poly(ctx, Ilustra.Pincel.capsula(0, -190, 29, 0, 225, 12, 10), AL.cuerpo, { semilla: 44, volumen: .8 });
      F(ctx, E(0, -30, 21, 40, 0, 20), AL.vidrio, { semilla: 45, alfa: .5, volumen: .3, borde: 1, irregular: 0, textura: 0 });
      F(ctx, E(0, -26, 15, 15, 0, 16), C.hule, { semilla: 46, volumen: .9, borde: 1, irregular: 0, textura: 0 }); F(ctx, E(0, -38, 11, 8, 0, 12), C.madera, { semilla: 47, irregular: 0, textura: 0 }); F(ctx, P_tri(-44), C.naranja, { semilla: 48, irregular: 0, textura: 0 });
      ctx.save(); ctx.globalAlpha *= .3 * (o.rapida == null ? 1 : o.rapida); ctx.fillStyle = '#e8d6b0'; ctx.beginPath(); ctx.ellipse(0, -214, 96, 14, 0, 0, 7); ctx.fill(); ctx.restore();
      F(ctx, E(0, -205, 12, 12, 0, 12), AL.osc, { semilla: 49, irregular: 0, textura: 0 });
      W2.grupo(ctx, { k: o.colaV, entra: 'encaja', desde: [0, -70], clic: true, rf: 60 }, () => poly(ctx, [[-5, 108], [5, 108], [7, 200], [-7, 200]], AL.rojo, { semilla: 50, volumen: .6 }));
    });
  }
  const P_tri = y => [[-6, y], [6, y], [0, y - 14]];
  function avionAtras(ctx, o) {
    W2.grupo(ctx, { x: o.x, y: o.y, rot: o.alabeo || 0, s: o.s || .8, T: o.T }, () => {
      poly(ctx, [[-130, -10], [130, -10], [130, 8], [-130, 8]], AL.ala, { semilla: 51 });
      for (const sx of [-1, 1]) {
        poly(ctx, [[sx * 40, 12], [sx * 400, -4], [sx * 400, 20], [sx * 40, 38]], AL.ala, { semilla: 52 }); poly(ctx, [[sx * 372, -3], [sx * 400, -4], [sx * 400, 20], [sx * 372, 19]], AL.rojo, { semilla: 53, volumen: .5 });
        const b = (o.alerones || 0) * -sx, a = (o.alerones == null ? 0 : b) * 34;   // un alerón sube y el otro baja
        if (o.alerones != null) poly(ctx, [[sx * 250, 6], [sx * 372, -1], [sx * 372, -1 + a], [sx * 250, 6 + a]], AL.cuerpo, { semilla: 54, volumen: .7 });
      }
      if (o.tren) for (const sx of [-1, 1]) { W2.biela(ctx, { de: [sx * 90, 34], a: [sx * 96, 96], r: 5, color: AL.osc }); W2.rueda(ctx, { x: sx * 96, y: 102, r: 26, rayos: 4, color: C.acero }); }
      poly(ctx, [[-8, -40], [8, -40], [6, -190], [-6, -190]], AL.ala, { semilla: 55 }); poly(ctx, [[-6, -190], [6, -190], [7, -172], [-7, -172]], AL.rojo, { semilla: 56, volumen: .5 });
      if (o.timon != null) poly(ctx, [[2, -60], [6, -180], [6 + o.timon * 24, -180], [2 + o.timon * 24, -60]], AL.cuerpo, { semilla: 57, volumen: .6 });
      F(ctx, E(0, 0, 56, 52, 0, 30), AL.cuerpo, { semilla: 58, volumen: .9, borde: .9, anchoBorde: 6 }); F(ctx, E(0, 0, 24, 22, 0, 20), os_(AL.cuerpo), { semilla: 59, volumen: .6, borde: .3, irregular: 0 });
      ctx.save(); ctx.beginPath(); ctx.rect(-80, -200, 160, 150); ctx.clip(); W2.patito(ctx, o.T || 0, { x: 0, y: -4, s: .34, estado: 'normal', casco: 'aviador' }); ctx.restore();
      const dome = []; for (let i = 0; i <= 18; i++) { const a = PI + i / 18 * PI; dome.push([Math.cos(a) * 52, -46 + Math.sin(a) * 60]); } poly(ctx, dome, AL.vidrio, { semilla: 60, alfa: .3, volumen: .3, borde: 1, textura: 0, irregular: 0 });
    });
  }
  const os_ = c => Ilustra.oscurece(c, .35);
  // campo visto desde arriba (para las escenas de la ráfaga y la deriva): parches de cultivo que se desplazan
  function campo(c, off) {
    const col = ['#6a7f58', '#7a8a55', '#8a8a58', '#5f7650', '#8c7c58', '#6f8660'];
    c.save(); c.fillStyle = '#62784f'; c.fillRect(0, 0, 1080, 1920);
    for (let j = -1; j < 9; j++) for (let i = 0; i < 5; i++) { const jj = j - Math.floor(off / 260), y = j * 260 + (off % 260), h = hash(jj * 7 + i * 3), x = i * 230 - 40 + (hash(jj + i) - .5) * 20; F(c, Rc(x + 6, y + 6, 218, 248, 6), col[(h * 6) | 0], { semilla: ((jj * 5 + i) & 63) + 1, volumen: .35, borde: .5, textura: .6, irregular: .4, sombraInterna: .2 }); }
    c.fillStyle = 'rgba(70,60,50,.75)'; c.fillRect(0, 700, 1080, 0); c.restore();
  }
  const topo = (ctx, T, fn, off) => W2.escena(ctx, T, { fondo: 'cielo', mesa: false, cam: { x: 0, y: -330, z: 1 }, fondoExtra: c => campo(c, off) }, fn);

  window.ESCENAS = [
    // 1. Gancho: vuela completa; se le desprende la aleta de la cola y se va en picada girando.
    (ctx, t, d, K, T) => {
      const su = d * .3, u = Math.max(0, t - su) / (d - su), x = -420 + t * 300 + u * 160, y = lerp(-650, PANZA, Math.pow(u, 1.8)), r = 1.25 * Math.pow(u, 1.2) + .16 * Math.sin(u * 16) * u;
      const ax = -420 + su * 300 - 270 * S, ay = -650 - 40 * S, uu = Math.max(0, t - su);
      pista(ctx, T, { x: x * .9 + 80, y: lerp(-640, -330, u), z: 1 }, c => {
        sombraAv(c, x, y);
        avion(c, { ...COMPLETO, colaV: t < su ? 1 : 0, x, y, rot: r, helice: T * 45, rapida: 1, susto: prog(t, su, su + .3), T });
        if (uu > 0) { c.save(); c.translate(ax + 150 * uu - 30 * uu * uu * 0, ay - 260 * uu + 1100 * uu * uu); c.rotate(uu * 7); W2.lamina(c, { pts: [[-50, 30], [30, 30], [42, -90], [2, -90]], color: AL.ala, grosor: 8 }); c.restore(); W2.destello(c, { x: ax, y: ay, r: 70, k: 1 - prog(t, su, su + .35) }); }
        W2.polvo(c, { x, y: 0, T: t, desde: d * .93, r: 150, dur: .9 });
      });
    },
    // 2. Se desarma: las piezas saltan una a una hasta que solo queda el tubo.
    (ctx, t, d, K, T) => {
      const q = k => 1 - prog(t, d * k, d * (k + .14)), tren = q(.62), y = lerp(PANZA, RUEDAS, tren);
      pista(ctx, T, { x: 40, y: -330, z: lerp(.95, 1.08, t / d) }, c => {
        sombraAv(c, 0, y);
        avion(c, { x: 0, y, motor: q(.72), alas: q(.08), colaH: q(.24), colaV: q(.38), tren, alerones: q(.08) > .5 ? 0 : null, flaps: q(.08) > .5 ? 0 : null, helice: t * 6, susto: prog(t, d * .5, d * .8), T });
        W2.polvo(c, { x: 0, y: 0, T: t, desde: d * .66, r: 130 });
      });
    },
    // 3. Lo mínimo: el tubo rebota; aparecen el motor y la hélice.
    (ctx, t, d, K, T) => {
      const k = Math.min(1, t / (d * .3));
      pista(ctx, T, { x: 60, y: -250, z: 1.55 }, c => {
        sombraAv(c, 0, PANZA + W2.caida(k, 560));
        avion(c, { x: 0, y: PANZA + W2.caida(k, 560), motor: prog(t, d * .45, d * .72), helice: t * 12, T });
        W2.polvo(c, { x: 0, y: 0, T: t, desde: d * .3 * .6, r: 120, dur: 1 });
      });
    },
    // 4. La hélice empuja el aire hacia atrás y el tubo sale disparado hacia adelante.
    (ctx, t, d, K, T) => {
      const giro = t * 10 + t * t * 14, x = Math.max(0, t - d * .55) ** 2 * 130, e = prog(t, d * .25, d * .55);
      pista(ctx, T, { x: x + 60, y: -250, z: 1.4 }, c => {
        sombraAv(c, x, PANZA);
        avion(c, { x, y: PANZA, motor: 1, helice: giro, rapida: prog(t, d * .1, d * .4), T });
        W2.viento(c, { x: x - 120, y: PANZA - 10, w: 760, h: 130, ang: PI, T, n: 12, vel: 1.4 + e, largo: 220, k: prog(t, d * .1, d * .3) });
        W2.flecha(c, { de: [x + 300, -250], a: [x + 520, -250], color: ORO, k: e, T });
      });
    },
    // 5. Corre rapidísimo, pero no se levanta ni un centímetro.
    (ctx, t, d, K, T) => {
      const x = t * 1200;
      pista(ctx, T, { x: x - 100, y: -270, z: 1.15 }, c => {
        sombraAv(c, x, PANZA);
        avion(c, { x, y: PANZA + Math.sin(T * 50) * 1.2, motor: 1, helice: T * 70, rapida: 1, susto: 1, vib: 1.5, T });
        W2.viento(c, { x: x - 100, y: PANZA - 20, w: 1300, h: 170, ang: PI, T, n: 16, vel: 5, largo: 340, grosor: 4 });
        W2.humo(c, { x: x - 290 * S, y: -10, T: t, color: '#a89880', tam: 50, sube: 60, vel: 2, ancho: 160, n: 8, k: .9 });
      });
    },
    // 6. Le falta empujar aire hacia abajo: flecha de PESO y un signo de pregunta.
    (ctx, t, d, K, T) => {
      const L = lerp(.3, 1, prog(t, d * .1, d * .4));
      pista(ctx, T, { x: 40, y: -250, z: 1.45 }, c => {
        sombraAv(c, 0, PANZA);
        avion(c, { x: 0, y: PANZA, motor: 1, helice: T * 4, T });
        W2.flecha(c, { de: [-20, -150], a: [-20, -150 + 360 * L * .75], color: ROJO, grosor: 34, k: prog(t, d * .1, d * .35), T });
        W2.icono(c, 'pregunta', { x: 170, y: -360 + Math.sin(T * 3) * 8, s: 1.3, k: prog(t, d * .45, d * .6) });
      });
    },
    // 7. Dos tablas planas: el aire pasa derecho y casi no pasa nada.
    (ctx, t, d, K, T) => {
      pista(ctx, T, { x: 40, y: -250, z: 1.45 }, c => {
        sombraAv(c, 0, PANZA);
        avion(c, { x: 0, y: PANZA, motor: 1, alas: prog(t, 0, d * .35), helice: T * 30, rapida: .7, T });
        if (t > d * .38) { W2.viento(c, { x: 0, y: -90, w: 1000, h: 150, ang: PI, T, n: 14, vel: 1.6, largo: 240, k: prog(t, d * .38, d * .5) }); }
      });
    },
    // 8. Alas inclinadas, de perfil: el aire choca por debajo y sale doblado hacia abajo.
    (ctx, t, d, K, T) => {
      const ang = lerp(0, .3, prog(t, d * .05, d * .4)), des = prog(t, d * .3, d * .65);
      pista(ctx, T, { x: 0, y: -330, z: 1.9 }, c => {
        perfil(c, 0, -330, ang);
        W2.viento(c, { x: 0, y: -330, w: 1100, h: 340, ang: PI, T, n: 20, vel: 1.1, largo: 280, k: 1, curva: (al, row) => al > 0 ? -des * Math.min(1, al / 300) * (150 - Math.abs(row) * .35) : 0 });
      }, { fondo: 'cielo', mesa: false, fondoExtra: cielo2 });
    },
    // 9. Sustentación: el aire va hacia abajo y el ala sube.
    (ctx, t, d, K, T) => {
      const sube = prog(t, d * .7, d) * 90, L = prog(t, d * .35, d * .7);
      pista(ctx, T, { x: 0, y: -330, z: 1.9 }, c => {
        W2.viento(c, { x: 0, y: -330 - sube, w: 1100, h: 340, ang: PI, T, n: 20, vel: 1.1, largo: 280, k: 1, curva: (al, row) => al > 0 ? -Math.min(1, al / 300) * (150 - Math.abs(row) * .35) : 0 });
        perfil(c, 0, -330 - sube, .3);
        for (const x of [-190, -290]) W2.flecha(c, { de: [x, -300 - sube], a: [x, -200 - sube], color: '#f1e7d2', grosor: 18, k: prog(t, d * .1, d * .3), T });
        W2.flecha(c, { de: [0, -350 - sube], a: [0, -350 - sube - 40 - 100 * L], color: ORO, grosor: 40, k: L, T });
      }, { fondo: 'cielo', mesa: false, fondoExtra: cielo2 });
    },
    // 10. ¡Despegamos! Durante tres segundos (sin cola).
    (ctx, t, d, K, T) => {
      const x = -300 + t * 640, h = Math.max(0, t - .35) ** 1.4 * 110, y = PANZA - h;
      pista(ctx, T, { x: x * .96 + 120, y: lerp(-290, -440, clamp(h / 300)), z: 1.15 }, c => {
        sombraAv(c, x, y);
        avion(c, { x, y, rot: -.1 - clamp(h / 400) * .15, motor: 1, alas: 1, inclina: .05, helice: T * 70, rapida: 1, celebra: h > 40, T });
        W2.viento(c, { x: x - 150, y: y, w: 900, h: 220, ang: PI, T, n: 12, vel: 2.5, largo: 300, alfa: .45 });
        if (h < 30) W2.humo(c, { x: x - 250 * S, y: -10, T: t, color: '#a89880', tam: 44, sube: 50, vel: 1.6, ancho: 100, n: 6, k: .8 });
      });
    },
    // 11. La nariz sube sin control: maroma y caída (sin cola).
    (ctx, t, d, K, T) => {
      const u = t / d, cab = u < .55 ? .22 + Math.pow(u / .55, 2) * 1.5 : 1.72 + (u - .55) / .45 * 1.42, ch = prog(t, d * .82, d * .92);
      const x = -150 + u * 560, y = u < .55 ? lerp(-420, -640, u / .55) : lerp(-640, PANZA, Math.pow((u - .55) / .3, 1.6) > 1 ? 1 : Math.pow((u - .55) / .3, 1.6));
      pista(ctx, T, { x: x * .7 + 60, y: lerp(-520, -330, prog(u, .5, .9)), z: .95 }, c => {
        sombraAv(c, x, y);
        avion(c, { x, y, rot: -Math.min(cab, 3.1), motor: 1, alas: 1, inclina: .05, helice: T * 60, rapida: 1 - ch, susto: prog(t, d * .3, d * .5), T });
        W2.polvo(c, { x, y: 0, T: t, desde: d * .86, r: 170, dur: 1.1 }); W2.onda(c, { x, y: -10, r: 240, k: prog(t, d * .86, d * .98), aplastada: .25 });
      });
    },
    // 12. El estabilizador: la nariz oscila y vuelve a quedar derecha.
    (ctx, t, d, K, T) => {
      const k = prog(t, 0, d * .3), u = Math.max(0, t - d * .38), cab = t < d * .38 ? .35 : .35 * Math.exp(-2.1 * u) * Math.cos(5.2 * u), x = T * 420, y = -520, r = -cab;
      pista(ctx, T, { x: x + 20, y: -500, z: 1.2 }, c => {
        avion(c, { x, y, rot: r, motor: 1, alas: 1, inclina: .05, colaH: k, helice: T * 60, rapida: 1, T });
        if (t > d * .4) { const tp = punto(x, y, r, S, -322, 20); W2.flecha(c, { de: [tp[0], tp[1] + (cab > 0 ? 150 : -150) * .0 + (cab > 0 ? 130 : -130)], a: [tp[0], tp[1] + (cab > 0 ? 20 : -20)], color: ORO, grosor: 26, k: clamp(Math.abs(cab) * 5 + .15), T }); }
      });
    },
    // 13. Ráfaga de lado (desde arriba): la avioneta gira sobre sí misma y derrapa.
    (ctx, t, d, K, T) => {
      const u = Math.max(0, t / d - .35) / .65, yaw = u * u * 1.6 * Math.sin(u * 7 + .3), dz = u * u * 260;
      topo(ctx, T, c => {
        avionArriba(c, { x: -dz, y: -330, yaw, s: .9, motor: 1, colaV: 0, T });
        if (u > 0) W2.viento(c, { x: 0, y: -330, w: 1500, h: 900, ang: PI, T, n: 22, vel: 2, largo: 340, k: prog(u, 0, .15), alfa: .7 });
        W2.icono(c, 'exclama', { x: -dz + 190, y: -520, s: 1.2, k: prog(u, .1, .25) });
      }, T * 260);
    },
    // 14. La deriva endereza la avioneta como las plumas de una flecha.
    (ctx, t, d, K, T) => {
      const u = Math.max(0, t - d * .3), yaw = t < d * .3 ? .8 : .8 * Math.exp(-2 * u) * Math.cos(6 * u);
      topo(ctx, T, c => {
        avionArriba(c, { x: -260, y: -330, yaw: yaw, s: .9, colaV: prog(t, 0, d * .3), T });
        W2.viento(c, { x: -260, y: -330, w: 1300, h: 460, ang: PI / 2, T, n: 16, vel: 1.2, largo: 300, alfa: .55 });
        if (t > d * .3 && Math.abs(yaw) > .05) { const p = punto(-260, -330, yaw, .9, 0, 190); W2.flecha(c, { de: [p[0] + (yaw > 0 ? 120 : -120), p[1]], a: [p[0] + (yaw > 0 ? 20 : -20), p[1]], color: ORO, grosor: 22, k: clamp(Math.abs(yaw) * 2.5), T }); }
      }, T * 200);
    },
    // 15. Perfecto, pero no puede girar... y viene un árbol.
    (ctx, t, d, K, T) => {
      const u = t / d, x = lerp(-330, 40, u);
      pista(ctx, T, { x: lerp(-60, 240, u), y: -430, z: lerp(.8, .92, u) }, c => {
        arbol(c, 560, 1.15);
        avion(c, { ...COMPLETO, alerones: null, elevador: null, timon: null, flaps: null, x, y: -380, helice: T * 60, rapida: 1, susto: prog(t, d * .35, d * .6), s: S, T });
        W2.icono(c, 'exclama', { x: x + 30, y: -560, s: 1, k: prog(t, d * .55, d * .7) });
        W2.viento(c, { x: x - 80, y: -380, w: 800, h: 160, ang: PI, T, n: 8, vel: 2, largo: 260, alfa: .35 });
      });
    },
    // 16. Alerones (vista desde atrás): uno sube, el otro baja, y se ladea.
    (ctx, t, d, K, T) => {
      const a = prog(t, d * .25, d * .55);
      pista(ctx, T, { x: 0, y: -330, z: 1 }, c => {
        avionAtras(c, { x: 0, y: -380 + Math.sin(T * 2) * 5, s: .78, alerones: a, alabeo: a * .3, timon: null, tren: 1, T });
        W2.flecha(c, { de: [-330, -520], a: [-330, -420], color: ORO, grosor: 22, k: prog(t, d * .3, d * .5), T }); W2.flecha(c, { de: [330, -400], a: [330, -500], color: '#f1e7d2', grosor: 22, k: prog(t, d * .3, d * .5), T });
      });
    },
    // 17. Timón y elevador: primer plano de la cola moviéndose y la avioneta esquiva el árbol.
    (ctx, t, d, K, T) => {
      const u = t / d, x = -520 + u * 1100, esq = prog(u, .5, .85), y = -380 - 520 * esq, r = -esq * .35 * (1 - prog(u, .85, 1)), cierra = prog(t, d * .45, d * .72);
      const tp = punto(x, y, r, S, -300, -10);
      pista(ctx, T, { x: lerp(tp[0], x * .6 + 60, cierra), y: lerp(tp[1], -520, cierra), z: lerp(2.1, .78, cierra) }, c => {
        arbol(c, 560, 1.15);
        avion(c, { ...COMPLETO, flaps: null, x, y, rot: r, alerones: 0, timon: Math.sin(T * 3.4) * .7 * (1 - esq), elevador: Math.sin(T * 2.6 + 1) * .7 * (1 - esq) - esq * .4, helice: T * 60, rapida: 1, celebra: u > .85, T });
        W2.viento(c, { x: x - 100, y, w: 900, h: 200, ang: PI, T, n: 8, vel: 2, largo: 260, alfa: .3 });
      });
    },
    // 18. Aterrizaje sin flaps ni ruedas: llega como un misil y rebota de panza.
    (ctx, t, d, K, T) => {
      const u = t / d, toca = .45, x = lerp(-900, 560, u), v = Math.max(0, (u - toca) / (1 - toca)), y = u < toca ? lerp(-760, PANZA, Math.pow(u / toca, 1.2)) : PANZA - 140 * (1 - v) * Math.abs(Math.sin(v * PI * 2.4));
      pista(ctx, T, { x: x * .9 + 30, y: -300, z: .9 }, c => {
        sombraAv(c, x, y);
        avion(c, { ...COMPLETO, tren: 0, flaps: null, x, y, rot: u < toca ? .2 : -Math.sin(v * PI * 2.4) * .1, helice: T * 60, rapida: 1, susto: prog(u, .3, .4), vib: u > toca ? 3 : 0, T });
        for (const dz of [0, .3, .6]) W2.polvo(c, { x: lerp(-900, 560, toca + .02 + dz * .3 * (1 - toca)), y: 0, T: t, desde: d * (toca + dz * .25), r: 120, dur: 1 });
        W2.viento(c, { x: x - 100, y: y - 20, w: 1200, h: 220, ang: PI, T, n: 14, vel: 4, largo: 340, alfa: .5 });
      });
    },
    // 19. Flaps: primer plano del ala; bajan y la flecha hacia arriba crece.
    (ctx, t, d, K, T) => {
      const f = prog(t, d * .15, d * .5), p = punto(0, -380, -.06, S, -95, 82);
      pista(ctx, T, { x: p[0] + 10, y: p[1] - 30, z: 1.9 }, c => {
        avion(c, { ...COMPLETO, tren: 0, flaps: f, alerones: 0, x: 0, y: -380, rot: -.06, helice: T * 50, rapida: 1, T });
        W2.flecha(c, { de: [p[0] + 20, p[1] - 10], a: [p[0] + 20, p[1] - 70 - 90 * f], color: ORO, grosor: 20, k: prog(t, d * .1, d * .45), T });
        W2.viento(c, { x: p[0], y: p[1] + 40, w: 600, h: 160, ang: PI, T, n: 8, vel: 1.5, largo: 220, alfa: .4, curva: (al, row) => al > 0 ? -f * Math.min(1, al / 200) * 40 : 0 });
      });
    },
    // 20. Tren de aterrizaje: sale, toca la pista suave y rueda.
  	(ctx, t, d, K, T) => {
      const u = t / d, tren = prog(t, 0, d * .3), toca = .55, x = lerp(-640, 420, u) - Math.max(0, u - toca) ** 2 * 400, y = u < toca ? lerp(-430, RUEDAS, sale(u / toca)) : RUEDAS;
      pista(ctx, T, { x: x * .85 + 60, y: -290, z: 1.15 }, c => {
        sombraAv(c, x, y);
        avion(c, { ...COMPLETO, tren, flaps: 1, alerones: 0, x, y, rot: u < toca ? -.07 : 0, ruedas: u > toca ? (u - toca) * d * 18 : 0, helice: T * 30, rapida: .6, celebra: u > .75, T });
        W2.polvo(c, { x: x + 20, y: 0, T: t, desde: d * toca, r: 70, dur: .9, n: 5 });
      });
    },
    // 21. Remate: la avioneta completa despega y pasa sobre la cámara, como al principio.
    (ctx, t, d, K, T) => {
      const u = t / d, x = -520 + t * 360 + Math.max(0, u - .25) ** 2 * 900, h = Math.max(0, u - .25) ** 1.6 * 1500, y = RUEDAS - h, s = S * (1 + .35 * prog(u, .5, 1));
      pista(ctx, T, { x: x * .8, y: lerp(-300, -620, prog(u, .3, .9)), z: 1.1 }, c => {
        sombraAv(c, x, y, s);
        avion(c, { ...COMPLETO, x, y, s, rot: u > .25 ? -.2 : 0, ruedas: t * 20, helice: T * 60, rapida: 1, celebra: u > .5, T });
      });
    },
    // 22. Cierre: la avioneta da vueltas a lo lejos (la pregunta la pone el sistema arriba; el dibujo queda abajo).
    (ctx, t, d, K, T) => {
      const a = T * .8, dep = Math.sin(a), s = .6 + .12 * dep, x = Math.cos(a) * 300, y = -50 - 30 * dep;
      pista(ctx, T, { x: 0, y: -250, z: 1.25 }, c => {
        sombraAv(c, x, y, s);
        avion(c, { ...COMPLETO, x, y, s, espejo: -Math.sin(a) < 0, rot: -Math.cos(a) * .06, helice: T * 60, rapida: 1, celebra: true, T });
      });
    },
  ];
  const cielo2 = c => { const g = c.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, 'rgba(36,44,64,.96)'); g.addColorStop(1, 'rgba(70,80,104,.92)'); c.fillStyle = g; c.fillRect(0, 0, 1080, 1920); };
  // ala de perfil (corte): borde de ataque a la derecha, el aire viene de la derecha y se va a la izquierda
  function perfil(c, x, y, ang) {
    c.save(); c.translate(x, y); c.rotate(-ang);
    const pts = [[170, 4], [160, -14], [110, -30], [20, -30], [-90, -16], [-190, 2], [-190, 8], [-90, 14], [20, 14], [110, 12], [160, 12]];
    W2.lamina(c, { pts, color: AL.ala, grosor: 0, volumen: .8 });
    c.strokeStyle = 'rgba(40,40,56,.3)'; c.lineWidth = 3; for (let i = -150; i < 150; i += 50) { c.beginPath(); c.moveTo(i, -20); c.lineTo(i - 14, 8); c.stroke(); }
    c.restore();
  }
})();
