// "Al pulpo se le detiene un corazón cada vez que nada" — escenas de autor (una función por escena del guion).
// El personaje (pulpo) y sus órganos se definen una vez y se reutilizan: así es el mismo en todo el video.
(() => {
  const { W, H, TAU, clamp, lerp, suave, sale, rebote, prog, hash, azar, latido, alfa, mezcla } = K;
  const C = { piel: '#DE6238', sombra: '#A53C22', luz: '#F59463', vientre: '#F8D2B4', ojo: '#F6E7B0',
              rojo: '#E5484D', azul: '#35C2E8', palida: '#C9CFE6', corazon: '#D63B63', parado: '#6f6170', texto: '#EAF6FF' };
  const MANTO = [[-108, 20], [-150, -70], [-165, -200], [-120, -310], [0, -360], [120, -310], [165, -200], [150, -70], [108, 20], [0, 48]];

  function mar(ctx, T, prof = 0) {
    K.fondo(ctx, mezcla('#15708f', '#06283a', prof), mezcla('#04202e', '#01070b', prof), mezcla('#0b4a66', '#03151f', prof));
    K.rayos(ctx, T, '#9fe8ff', .075 * (1 - prof * .85));
    K.motas(ctx, T, { n: 70, color: '#bfefff', a: .3, vy: -10, semilla: 4 });
  }

  function corazon(ctx, x, y, r, T, { ppm = 72, fase = 0, paro = 0, resalte = 0, tenue = 1 } = {}) {
    const p = latido(T, ppm, fase) * (1 - paro), s = (1 + .17 * p) * r / 40;
    if (resalte > 0) K.halo(ctx, x, y, r * 3.4, '#ff5c8a', .6 * resalte * (.55 + .45 * p));
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= tenue;
    K.curva(ctx, [[0, -36], [26, -30], [40, -6], [30, 26], [0, 42], [-30, 26], [-40, -6], [-26, -30]]);
    ctx.fillStyle = mezcla(C.corazon, C.parado, paro); ctx.fill();
    K.curva(ctx, [[4, -4], [26, -10], [30, 16], [6, 32], [-8, 14]]);
    ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-13, -13, 12, 7, -.6, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fill();
    ctx.restore();
  }

  function flujo(ctx, pts, T, { n = 5, vel = .5, color = C.azul, r = 5, fase = 0, hasta = 1 } = {}) {
    for (let i = 0; i < n; i++) {
      const k = ((T * vel + i / n + fase) % 1 + 1) % 1;
      if (k > hasta) continue;
      const [x, y] = K.enRuta(pts, k);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = typeof color === 'function' ? color(k) : color; ctx.fill();
    }
  }

  function branquia(ctx, x, y, lado, T) {
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 9; i++) {
      const yy = -75 + i * 18.5, largo = 34 - Math.abs(i - 4) * 3.2 + Math.sin(T * 2 + i) * 1.5;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(s * largo / 2, yy, largo / 2, 6.5, s * .25 * lado, 0, TAU);
        ctx.fillStyle = i % 2 ? '#F29AA6' : '#E57F92'; ctx.fill();
      }
    }
    K.trazo(ctx, [[0, -80], [0, 82]], '#C85A75', 5);
    ctx.restore();
  }

  // Interior del manto a la vista: branquias, dos corazones branquiales, el sistémico y los vasos que los unen.
  function interior(ctx, T, { rx = 0, resB = 0, resS = 0, paro = 0, tenueB = 1, tenueS = 1, nB = 1, nS = 1, sangre = 1 } = {}) {
    if (rx <= 0) return;
    ctx.save(); ctx.globalAlpha = rx;
    ctx.save(); ctx.translate(0, -165); ctx.scale(.85, .9); ctx.translate(0, 165);
    K.curva(ctx, MANTO); ctx.fillStyle = 'rgba(48,12,32,.88)'; ctx.fill(); ctx.restore();
    for (const s of [-1, 1]) {
      const vena = K.ruta([[0, 2], [s * 34, -34], [s * 72, -88]], 16), sube = K.ruta([[s * 72, -88], [s * 86, -118], [s * 80, -135], [s * 80, -282]], 30);
      const vuelve = K.ruta([[s * 80, -282], [s * 48, -268], [s * 20, -212], [0, -158]], 24);
      K.trazo(ctx, vena, alfa(C.palida, .45), 7); K.trazo(ctx, vuelve, alfa(C.azul, .5), 7);
      branquia(ctx, s * 80, -205, s, T);
      if (sangre > 0) {
        ctx.globalAlpha = rx * sangre;
        flujo(ctx, vena, T, { n: 3, vel: .55, color: C.palida, r: 4.5 });
        flujo(ctx, sube, T, { n: 5, vel: .4, color: k => mezcla(C.palida, C.azul, (k - .35) * 2.2), r: 4.5, fase: .3 });
        flujo(ctx, vuelve, T, { n: 4, vel: .55, color: C.azul, r: 4.5, fase: .1 });
        ctx.globalAlpha = rx;
      }
      if (nB > 0) corazon(ctx, s * 72, -88, 23 * rebote(nB), T, { ppm: 84, fase: s > 0 ? .5 : 0, resalte: resB, tenue: tenueB });
    }
    const aorta = K.ruta([[0, -150], [0, -80], [0, 12]], 12);
    K.trazo(ctx, aorta, alfa(C.azul, .5 * (1 - paro * .7)), 9);
    if (sangre > 0 && paro < 1) { ctx.globalAlpha = rx * sangre * (1 - paro); flujo(ctx, aorta, T, { n: 3, vel: .7, r: 5 }); ctx.globalAlpha = rx; }
    if (nS > 0) corazon(ctx, 0, -152, 40 * rebote(nS), T, { ppm: 60, paro, resalte: resS, tenue: tenueS });
    ctx.restore();
  }

  // El pulpo, con el origen entre los ojos: manto hacia arriba (-y) y brazos hacia abajo.
  // modo: 'flota' (de frente, brazos sueltos) | 'nada' (brazos juntos hacia atrás) | 'camina' (brazos apoyados en el suelo, y = suelo).
  // Devuelve los ejes de los ocho brazos para dibujar cosas sobre ellos.
  function pulpo(ctx, o) {
    const { T, modo = 'flota', suelo = 150 } = o, ejes = [];
    const chorro = .5 + .5 * Math.sin(T * 3.2);
    const brazo = j => {
      const u = j / 7, lado = u < .5 ? -1 : 1, fase = j * 1.7, x = lerp(-88, 88, u), y = 26 + Math.sin(u * Math.PI) * 14, frente = j % 2 === 0;
      const color = frente ? C.piel : C.sombra;
      let eje;
      if (modo === 'nada') {
        const abre = 10 + 9 * chorro;
        eje = K.extremidad(ctx, x * .7, y, (90 + lerp(abre, -abre, u)) * Math.PI / 180, 500, 50,
          (i, k) => .05 * Math.sin(T * 5 - i * .42 + fase) * (.25 + k), color);
      } else if (modo === 'camina') {
        const paso = Math.sin(T * 2.4 + fase);
        eje = K.extremidad(ctx, x, y, (90 + lerp(70, -70, u) + paso * 9) * Math.PI / 180, 520 + paso * 45, 52,
          (i, k) => k > .8 ? -lado * .2 : lado * .03 + .04 * Math.sin(T * 2.4 + fase + i * .3) * k, color, { suelo });
      } else {
        eje = K.extremidad(ctx, x, y, (90 + lerp(58, -58, u)) * Math.PI / 180, 400 + hash(j) * 70, 54,
          (i, k) => .085 * Math.sin(T * 1.3 + fase + i * .33) * (.3 + k * 1.3) - lado * .012, color);
      }
      if (frente) {  // ventosas
        ctx.fillStyle = alfa(C.vientre, .85);
        for (let i = 2; i < eje.length - 3; i += 2) {
          const [px, py, w, a] = eje[i], n = a + Math.PI / 2 * lado;
          ctx.beginPath(); ctx.arc(px + Math.cos(n) * w * .22, py + Math.sin(n) * w * .22, w * .15, 0, TAU); ctx.fill();
        }
      }
      ejes[j] = eje;
    };
    [1, 3, 5, 7].forEach(brazo);
    // manto
    ctx.save();
    const resp = Math.sin(T * 2.1) * .025;
    if (modo === 'nada') ctx.scale(.9 - .05 * chorro, 1.08 + .05 * chorro); else ctx.scale(1 + resp, 1 - resp * .6);
    ctx.rotate(modo === 'nada' ? 0 : Math.sin(T * .8) * .04);
    K.curva(ctx, MANTO);
    const g = ctx.createLinearGradient(-170, -340, 170, 20);
    g.addColorStop(0, C.luz); g.addColorStop(.45, C.piel); g.addColorStop(1, C.sombra);
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    const r = azar(11);
    for (let i = 0; i < 22; i++) {
      ctx.beginPath(); ctx.ellipse(lerp(-140, 140, r()), lerp(-340, -30, r()), 7 + r() * 13, 6 + r() * 9, r() * 3, 0, TAU);
      ctx.fillStyle = alfa(C.sombra, .28); ctx.fill();
    }
    ctx.beginPath(); ctx.ellipse(-62, -250, 46, 78, .35, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fill();
    ctx.restore();
    interior(ctx, T, o);
    // ojos
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * 84, -14, 37, 0, TAU); ctx.fillStyle = s < 0 ? C.piel : C.sombra; ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 86, -14, 23, 21, 0, 0, TAU); ctx.fillStyle = C.ojo; ctx.fill();
      const cierra = Math.pow(Math.max(0, Math.sin(T * .9 + 1)), 60);
      K.redondo(ctx, s * 86 - 15, -14 - 5 * (1 - cierra), 30, 10 * (1 - cierra) + 2, 5); ctx.fillStyle = '#1b1210'; ctx.fill();
      ctx.beginPath(); ctx.arc(s * 86 - 8, -22, 4, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill();
    }
    ctx.restore();
    [0, 2, 4, 6].forEach(brazo);
    return ejes;
  }

  const pantalla = (cx, cy, z, x, y) => [W / 2 + (x - cx) * z, 760 + (y - cy) * z];
  const leyenda = (ctx, a) => {
    [[C.palida, 'SIN OXÍGENO'], [C.azul, 'CON OXÍGENO']].forEach(([c, txt], i) => {
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(96, 322 + i * 52, 12, 0, TAU); ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha = 1;
      K.rotulo(ctx, txt, 124, 322 + i * 52, { tam: 34, opacidad: a });
    });
  };

  function suelo(ctx, T, y, desplaza = 0) {
    const g = ctx.createLinearGradient(0, y - 40, 0, H);
    g.addColorStop(0, '#2c6f78'); g.addColorStop(.25, '#1f525c'); g.addColorStop(1, '#0a2229');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, y);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin((x + desplaza) * .012) * 12 + Math.sin((x + desplaza) * .031) * 5);
    ctx.lineTo(W, H); ctx.fill();
    const r = azar(5);
    for (let i = 0; i < 9; i++) {  // piedras
      const x = ((r() * 1500 - desplaza * (.8 + r() * .2)) % 1500 + 1500) % 1500 - 200, yy = y + 40 + r() * 500, s = 30 + r() * 70;
      ctx.beginPath(); ctx.ellipse(x, yy, s, s * .5, 0, Math.PI, TAU); ctx.fillStyle = alfa('#0b2a31', .7); ctx.fill();
    }
    for (let i = 0; i < 5; i++) {  // algas
      const x = ((r() * 1500 - desplaza) % 1500 + 1500) % 1500 - 200, alto = 150 + r() * 160, f = r() * 6;
      K.extremidad(ctx, x, y + 14, -Math.PI / 2, alto, 20, (n, k) => .07 * Math.sin(T * 1.2 + f + n * .4) * (.4 + k), i % 2 ? '#1f8a70' : '#17705c', { tramos: 16 });
    }
  }

  // Molécula de oxígeno (dos átomos) en (x, y).
  function o2(ctx, x, y, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * 13, y, 15, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    ctx.restore();
  }
  function atomo(ctx, x, y, r, color, simbolo, tinta = '#fff') {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * .3, y - r * .3, r * .35, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
    ctx.font = `800 ${r * .85}px ${K.TEXTO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = tinta; ctx.fillText(simbolo, x, y + 2);
  }

  window.ESCENAS = [
    // 1. Gancho: el pulpo nada a chorro (la portada va encima, en la parte baja).
    (ctx, t, d, K, T) => {
      mar(ctx, T);
      ctx.save(); ctx.translate(430 + t * 45, 600 + Math.sin(T * 1.6) * 16); ctx.rotate(Math.PI / 2 - .1); ctx.scale(.8, .8);
      pulpo(ctx, { T, modo: 'nada' }); ctx.restore();
      K.acabado(ctx, T);
    },
    // 2. "Porque tiene tres": se endereza, el manto se abre a la vista y los corazones aparecen uno a uno.
    (ctx, t, d, K, T) => {
      mar(ctx, T, .15);
      const k = prog(t, 0, d * .45), z = lerp(.7, 1.25, k), cy = lerp(60, -112, k);
      const n = i => clamp((t - d * (.42 + i * .14)) / .35);
      K.camara(ctx, 0, cy, z, () => { ctx.rotate(lerp(.35, 0, sale(t / (d * .4)))); pulpo(ctx, { T, rx: prog(t, d * .15, d * .45), nB: n(0), nS: n(2), sangre: 0, resB: n(0) * .5, resS: n(2) * .6 }); });
      [[-72, -88], [72, -88], [0, -152]].forEach(([x, y], i) => {
        const [px, py] = pantalla(0, cy, z, x, y), a = n(i === 2 ? 2 : i === 1 ? 1 : 0);
        K.pastilla(ctx, String(i + 1), px + (i === 2 ? 0 : (i ? 70 : -70)), py + (i === 2 ? -80 : 30), { tam: 40, escala: rebote(a), opacidad: a });
      });
      K.acabado(ctx, T);
    },
    // 3. Corazones branquiales: la sangre pálida pasa por la branquia y sale azul.
    (ctx, t, d, K, T) => {
      mar(ctx, T, .3);
      const k = prog(t, 0, d * .3), z = lerp(1.25, 2.25, k), cy = lerp(-112, -165, k);
      K.camara(ctx, 0, cy, z, () => pulpo(ctx, { T, rx: 1, resB: .9, tenueS: .35 }));
      const a = prog(t, d * .25, d * .4);
      K.rotulo(ctx, 'CORAZÓN BRANQUIAL', 80, 1130, { a: pantalla(0, cy, z, -72, -80), opacidad: a });
      K.rotulo(ctx, 'BRANQUIA', 930, 420, { alinea: 'right', a: pantalla(0, cy, z, 96, -230), opacidad: prog(t, d * .5, d * .62) });
      leyenda(ctx, prog(t, d * .55, d * .7));
      K.acabado(ctx, T);
    },
    // 4. Corazón sistémico: la cámara se aleja y la sangre azul recorre los ocho brazos.
    (ctx, t, d, K, T) => {
      mar(ctx, T, .3);
      const k = prog(t, d * .3, d * .75), z = lerp(2.25, .9, k), cy = lerp(-165, 70, k);
      K.camara(ctx, 0, cy, z, () => {
        const ejes = pulpo(ctx, { T, rx: 1, resS: 1, tenueB: lerp(.4, 1, k) });
        const llega = prog(t, d * .35, d * .95);
        ejes.forEach((eje, j) => {
          const hasta = Math.max(2, Math.round(llega * (eje.length - 1)));
          ctx.globalAlpha = .55; K.trazo(ctx, eje.slice(0, hasta), C.azul, 5); ctx.globalAlpha = 1;
          flujo(ctx, eje, T, { n: 5, vel: .45, r: 7, fase: j * .13, hasta: llega });
        });
      });
      K.rotulo(ctx, 'CORAZÓN SISTÉMICO', 80, 380, { a: pantalla(0, cy, z, -22, -168), opacidad: prog(t, .2, .7) * (1 - prog(t, d * .3, d * .42)) });
      K.acabado(ctx, T);
    },
    // 5. "No es roja. Es azul": la gota se llena de azul desde abajo.
    (ctx, t, d, K, T) => {
      mar(ctx, T, .65);
      const nivel = prog(t, d * .45, d * .8), cx = 540, cy = 760, s = 1 + Math.sin(T * 2) * .012;
      K.halo(ctx, cx, cy + 40, 520, mezcla(C.rojo, C.azul, nivel), .28);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
      const gota = () => { ctx.beginPath(); ctx.moveTo(0, -330); ctx.bezierCurveTo(40, -210, 215, -70, 215, 80); ctx.arc(0, 80, 215, 0, Math.PI); ctx.bezierCurveTo(-215, -70, -40, -210, 0, -330); ctx.closePath(); };
      gota(); ctx.fillStyle = C.rojo; ctx.fill();
      ctx.save(); gota(); ctx.clip();
      const y0 = lerp(320, -350, nivel);
      ctx.beginPath(); ctx.moveTo(-240, 320);
      for (let x = -240; x <= 240; x += 20) ctx.lineTo(x, y0 + Math.sin(x * .03 + T * 5) * 14 * (nivel > 0 && nivel < 1 ? 1 : 0));
      ctx.lineTo(240, 320); ctx.fillStyle = C.azul; ctx.fill();
      ctx.beginPath(); ctx.ellipse(70, 130, 110, 150, 0, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(-95, 20, 26, 62, .35, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
      ctx.restore();
      K.rotulo(ctx, 'SANGRE DE PULPO', 540, 1130, { alinea: 'center', tam: 40, opacidad: prog(t, d * .6, d * .8) });
      K.acabado(ctx, T);
    },
    // 6. Hierro contra cobre: cada molécula atrapa su oxígeno.
    (ctx, t, d, K, T) => {
      K.fondo(ctx, '#0a1d33', '#03080f', '#071426');
      K.motas(ctx, T, { n: 50, color: '#8fb8ff', a: .22, vy: -6, semilla: 9 });
      const lado = (cx, ap, color, fondoC, nombre, quien, metal, dibujar) => {
        if (ap <= 0) return;
        const cy = 720, r = 190;
        ctx.save(); ctx.globalAlpha = ap; ctx.translate(cx, cy); ctx.scale(lerp(.85, 1, sale(ap)), lerp(.85, 1, sale(ap)));
        K.halo(ctx, 0, 0, 330, color, .25);
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = fondoC; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = color; ctx.stroke();
        dibujar();
        ctx.restore();
        K.pastilla(ctx, quien, cx, cy - 265, { tam: 34, opacidad: ap, fondo: color, color: '#06121c' });
        K.rotulo(ctx, metal, cx, cy + 250, { alinea: 'center', tam: 48, color, opacidad: ap, fuente: K.TEXTO, peso: '900' });
        K.rotulo(ctx, nombre, cx, cy + 304, { alinea: 'center', tam: 32, opacidad: ap * .85 });
      };
      const llegaFe = prog(t, d * .12, d * .3), llegaCu = prog(t, d * .58, d * .78);
      lado(280, prog(t, 0, .5), C.rojo, '#3d0f18', 'HEMOGLOBINA', 'TÚ', 'HIERRO', () => {
        ctx.strokeStyle = '#f4a3a8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 20, 100, 0, TAU); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const a = i * TAU / 4 + TAU / 8, x = Math.cos(a) * 100, y = 20 + Math.sin(a) * 100;
          K.trazo(ctx, [[0, 20], [x, y]], '#f4a3a8', 6); atomo(ctx, x, y, 24, '#f4a3a8', 'N', '#3d0f18');
        }
        atomo(ctx, 0, 20, 50, C.rojo, 'Fe');
        o2(ctx, 0, lerp(-330, -52, sale(llegaFe)), llegaFe);
      });
      lado(735, prog(t, d * .42, d * .42 + .5), C.azul, '#082b3f', 'HEMOCIANINA', 'PULPO', 'COBRE', () => {
        if (llegaCu > .9) K.halo(ctx, 0, 10, 170, C.azul, .5 * (llegaCu - .9) * 10);
        K.trazo(ctx, [[-70, 10], [70, 10]], alfa(C.azul, .5), 8);
        atomo(ctx, -78, 10, 48, mezcla('#7fa3b5', C.azul, llegaCu), 'Cu', '#06202e'); atomo(ctx, 78, 10, 48, mezcla('#7fa3b5', C.azul, llegaCu), 'Cu', '#06202e');
        o2(ctx, 0, lerp(-330, 10, sale(llegaCu)), llegaCu);
      });
      K.acabado(ctx, T);
    },
    // 7. Agua fría y con poco oxígeno: el fondo donde vive.
    (ctx, t, d, K, T) => {
      mar(ctx, T, .8);
      K.motas(ctx, T, { n: 90, color: '#dff6ff', a: .45, vy: 26, tam: 2.4, semilla: 21 });
      suelo(ctx, T, 1060);
      ctx.save(); ctx.translate(640, 940); ctx.scale(.6, .6); pulpo(ctx, { T, modo: 'camina', suelo: 190 }); ctx.restore();
      // termómetro
      const frio = prog(t, .3, d * .5), x = 210, y0 = 430, y1 = 860;
      K.redondo(ctx, x - 26, y0, 52, y1 - y0 + 30, 26); ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y1 + 40, 52, 0, TAU); ctx.fill();
      const color = mezcla(C.rojo, C.azul, frio), tope = lerp(y0 + 60, y1 - 60, frio);
      K.redondo(ctx, x - 13, tope, 26, y1 + 40 - tope, 13); ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y1 + 40, 38, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) K.trazo(ctx, [[x + 34, y0 + 50 + i * 68], [x + 54, y0 + 50 + i * 68]], 'rgba(255,255,255,.4)', 3);
      K.pastilla(ctx, `${Math.round(lerp(20, 4, frio))} °C`, x + 150, tope, { tam: 40, fondo: color, color: '#fff' });
      const a = prog(t, d * .5, d * .62);
      K.pastilla(ctx, 'POCO OXÍGENO', 640, 520, { tam: 34, opacidad: a, escala: rebote(a) });
      K.acabado(ctx, T);
    },
    // 8. Carga menos oxígeno → tres corazones a presión.
    (ctx, t, d, K, T) => {
      mar(ctx, T, .5);
      K.rotulo(ctx, 'OXÍGENO QUE CARGA LA SANGRE', 100, 330, { tam: 34, opacidad: prog(t, 0, .5) * .8 });
      K.barra(ctx, 100, 450, 800, 50, prog(t, .2, 1.2), C.rojo, 'CON HIERRO · TÚ', { opacidad: prog(t, 0, .5) });
      K.barra(ctx, 100, 590, 800, 50, .27 * prog(t, .5, 1.5), C.azul, 'CON COBRE · PULPO', { opacidad: prog(t, .3, .8) });
      [[250, 38, 84, 0], [520, 62, 60, 0], [790, 38, 84, .5]].forEach(([x, r, ppm, fase], i) => {
        const a = clamp((t - d * (.48 + i * .08)) / .35);
        if (a <= 0) return;
        const pulso = ((T * ppm / 60 + fase) % 1);
        ctx.beginPath(); ctx.arc(x, 900, r * 2 * (1.15 + pulso * .9), 0, TAU); ctx.strokeStyle = alfa('#ff5c8a', (1 - pulso) * .5 * a); ctx.lineWidth = 5; ctx.stroke();
        corazon(ctx, x, 900, r * 2 * rebote(a), T, { ppm, fase, resalte: .7 * a });
      });
      const a = prog(t, d * .72, d * .82);
      K.pastilla(ctx, '×3', 520, 1130, { tam: 50, opacidad: a, escala: rebote(a) });
      K.acabado(ctx, T);
    },
    // 9. El problema: al nadar a chorro el corazón grande se apaga y el pulso queda plano.
    (ctx, t, d, K, T) => {
      mar(ctx, T, .15);
      for (let i = 0; i < 26; i++) {  // el agua pasa hacia atrás
        const x = W - ((hash(i) * 1400 + T * (500 + hash(i + 40) * 400)) % 1400), y = 260 + hash(i + 80) * 900;
        K.trazo(ctx, [[x, y], [x + 60 + hash(i) * 80, y]], 'rgba(200,240,255,.16)', 3);
      }
      const para = d * .55, paro = prog(t, para, para + .5);
      ctx.save(); ctx.translate(470, 640 + Math.sin(T * 3.2) * 10); ctx.rotate(Math.PI / 2); ctx.scale(1.05, 1.05);
      pulpo(ctx, { T, modo: 'nada', rx: .9, paro, resS: 1 - paro, sangre: 1 }); ctx.restore();
      // trazo del pulso: el borde derecho es "ahora"
      const y0 = 1060, color = mezcla('#5BE37D', C.rojo, paro);
      K.redondo(ctx, 80, y0 - 110, 860, 180, 24); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      const pts = [];
      for (let x = 100; x <= 920; x += 4) {
        const tau = t - (920 - x) / 230, ph = ((tau * 1.25) % 1 + 1) % 1;
        const onda = -75 * Math.exp(-Math.pow((ph - .2) / .02, 2)) + 28 * Math.exp(-Math.pow((ph - .26) / .022, 2)) - 13 * Math.exp(-Math.pow((ph - .5) / .07, 2));
        pts.push([x, y0 + (tau < para ? onda : 0)]);
      }
      K.trazo(ctx, pts, color, 5);
      ctx.beginPath(); ctx.arc(920, pts[pts.length - 1][1], 9, 0, TAU); ctx.fillStyle = color; ctx.fill();
      K.rotulo(ctx, 'CORAZÓN SISTÉMICO', 100, y0 - 138, { tam: 32, opacidad: .9 });
      K.pastilla(ctx, 'DETENIDO', 800, y0 - 140, { tam: 32, fondo: C.rojo, color: '#fff', opacidad: paro, escala: rebote(paro) });
      K.acabado(ctx, T);
    },
    // 10. Por eso camina por el fondo.
    (ctx, t, d, K, T) => {
      mar(ctx, T, .25);
      suelo(ctx, T, 1010, t * 90);
      ctx.save(); ctx.translate(430 + t * 22, 850 + Math.sin(T * 2.4) * 9); ctx.rotate(.06); ctx.scale(.8, .8);
      pulpo(ctx, { T, modo: 'camina', suelo: 195 }); ctx.restore();
      K.acabado(ctx, T);
    },
    // 11. Cierre: el pulpo de frente con sus tres corazones.
    (ctx, t, d, K, T) => {
      mar(ctx, T, .1);
      K.camara(ctx, 0, -40, lerp(.8, .9, t / Math.max(d, 2)), () => pulpo(ctx, { T }));
      [[-130, 28, 84, 0], [0, 44, 60, 0], [130, 28, 84, .5]].forEach(([x, r, ppm, fase], i) => {
        const a = clamp((t - .15 - i * .15) / .35);
        if (a > 0) corazon(ctx, 540 + x, 330 + (i === 1 ? -20 : 10), r * rebote(a), T, { ppm, fase, resalte: .6 * a });
      });
      K.acabado(ctx, T);
    },
  ];
})();
