/* Ilustra — rig 2.5D (Fase 2, §6.2 y §6.3). Resuelve el esqueleto en 3D (espacio de cuerpo) y lo lleva al mundo con G3.marco.
   Espacio de cuerpo: origen en la pelvis, +X = lado izquierdo del personaje (I), +Y abajo, +Z hacia delante.
   Giros: giroPecho/giroCabeza positivos giran hacia el lado I (igual que yaw positivo gira la cara hacia la derecha de pantalla);
   inclinaCabeza positivo inclina la coronilla hacia +X (lado I); cabeceo positivo = mirar abajo.
   Objetivos 2D de manos: literales en pantalla, con prof = la del hombro. Objetivos 2D de pies: SAGITALES (ver resolver). Con 3 valores: mundo literal. */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3;
  const ABD_BRAZO = 0.12, ABD_MUSLO = 0.04;
  const nz = (v, d) => v == null ? d : v;
  const dirTronco = a => [0, -Math.cos(a), Math.sin(a)];
  // dirección de un miembro: ángulo sagital al desde abajo (+ delante), abducción be, s = +1 lado I, -1 lado D
  const dirMiembro = (al, be, s) => [s * Math.sin(be), Math.cos(al) * Math.cos(be), Math.sin(al) * Math.cos(be)];
  const angulos = (v, s) => [Math.atan2(v[2], v[1]), Math.asin(I.clamp(s * v[0], -1, 1))];

  I.Rig25 = function (proporciones, H) {
    this.p = typeof proporciones === 'string' ? I.PROPORCIONES[proporciones] : (proporciones || I.PROPORCIONES.adulto);
    this.H = H;
  };

  // e = {x, y, prof=0, yaw=0, pose, xPose=x, dir=1}
  //  x,y = suelo bajo la pelvis (como F1). Objetivos 2D de pie [tx,ty]: avance sagital z = (tx − xPose)·dir (xPose = x de la pelvis con la
  //  que se construyó la pose; dir = el de poseCaminar). Así la zancada se escorza con yaw y el pie de apoyo no desliza si el llamador
  //  mueve la pelvis x0 + d·sin(yaw) y prof d·cos(yaw).
  I.Rig25.prototype.resolver = function (e) {
    const p = this.p, H = this.H, pose = e.pose || {}, yaw = e.yaw || 0, dirP = e.dir == null ? 1 : e.dir;
    const xPose = e.xPose == null ? e.x : e.xPose;
    const g = k => pose[k] || 0;
    const altPelvis = (p.muslo + p.pierna) * 0.995 + 0.03;
    const yPel = e.y - altPelvis * H + g('raizY') * H;
    const M = G3.marco({ o: [e.x, yPel, e.prof || 0], yaw });
    const gP = g('giroPecho'), gC = g('giroCabeza');
    const mas = (o, v, l) => [o[0] + v[0] * l * H, o[1] + v[1] * l * H, o[2] + v[2] * l * H];
    const rotP = v => G3.rotY(v, gP);                       // lo que cuelga del pecho
    const J = {}, B = {};                                   // B: puntos de cuerpo
    const reg = (k, b, a) => { const w = M.aMundo(b); J[k] = { x: w[0], y: w[1], prof: w[2], p: b, a: a || 0 }; B[k] = b; };

    // --- tronco (sagital), luego se gira el pecho sobre la cintura
    const pel = [0, 0, 0];
    let a = g('cadera') + g('columna') + p.curva * 0.3;
    const cint = mas(pel, dirTronco(a), p.columna);
    const aCint = a;
    a += g('pecho') + p.curva * 0.5; const aPecho = a;
    const apc = (b) => { const r = rotP(G3.res(b, cint)); return G3.sum(cint, r); };    // gira alrededor de la vertical de la cintura
    const homC = mas(cint, dirTronco(a), p.pecho * 0.88), cueC = mas(cint, dirTronco(a), p.pecho);
    const homb = apc(homC), cue = apc(cueC);
    a += g('cuello') + p.curva * 0.6; const aCue = a;
    const cabB = apc(mas(cueC, dirTronco(a), p.cuello));
    a += g('cabeza');
    const pitchH = a + g('cabeceo'), gY = gP + gC;
    const L = p.cabeza * 0.52 * p.escalaCabeza * H;
    const v = G3.rotY(G3.rotX(G3.rotZ([0, -L, 0], g('inclinaCabeza')), pitchH), gY);
    const cab = G3.sum(cabB, v);
    reg('pelvis', pel, g('cadera')); reg('cintura', cint, aCint); reg('hombros', homb, aPecho); reg('cuello', cue, aPecho);
    reg('cabezaBase', cabB, aCue); reg('cabeza', cab, a);

    const marcos = {
      pelvis: G3.marco({ o: M.aMundo(pel), yaw, pitch: g('cadera') }),
      pecho: G3.marco({ o: M.aMundo(cint), yaw: yaw + gP, pitch: aPecho }),
      cabeza: G3.marco({ o: M.aMundo(cab), yaw: yaw + gY, pitch: pitchH, roll: g('inclinaCabeza') })
    };
    const ejes = {};
    const eje = (k, vb) => { ejes[k] = M.dirAMundo(G3.unit(vb)); };
    eje('tronco', G3.res(homb, cint)); eje('cuello', G3.res(cabB, cue));

    // --- brazos
    const aH = 0.5 * p.anchoHombro * 0.21 * H;
    const brazo = (lado, s) => {
      const O0 = [s * aH, homC[1], homC[2]];
      if (s > 0) { O0[2] -= 0.012 * H; O0[1] += 0.004 * H; }         // desplazamiento de F1 para el brazo lejano (coincidencia con F1)
      const O = apc(O0);
      const be = nz(pose['abdBrazo' + lado], ABD_BRAZO), gm = g('giroMano' + lado);
      const l1 = p.brazo * H, l2 = p.antebrazo * H;
      let v1, v2, codo, mano;
      const obj = pose['objetivoMano' + lado];
      if (obj) {
        let T;
        if (obj.length > 2) T = obj;
        else T = [obj[0], obj[1], M.aMundo(O)[2]];
        const Tb = G3.rotY(G3.res(T, M.o), -yaw);
        const exc = Math.max(0, Math.abs(gm) - 0.6) * 0.5;
        let polo = G3.rotY([0, 0.3, -1], s * exc), r;
        for (let k = 0; k < 4; k++) {
          r = G3.ik2(O, Tb, l1, l2, polo);
          if (s * r.medio[0] >= -0.02 * H) break;
          polo = [polo[0] + s * 0.5, polo[1], polo[2]];
        }
        codo = r.medio; mano = r.fin;
        v1 = G3.unit(G3.res(codo, O)); v2 = G3.unit(G3.res(mano, codo));
      } else {
        const a1 = g('brazo' + lado), a2 = a1 + g('antebrazo' + lado);
        v1 = rotP(dirMiembro(a1, be, s)); v2 = rotP(dirMiembro(a2, be, s));
        codo = mas(O, v1, p.brazo); mano = mas(codo, v2, p.antebrazo);
      }
      const [al2, be2] = angulos(rotY0(v2, -gP), s);
      const v3 = rotP(dirMiembro(al2 + g('mano' + lado), be2, s));
      const dedos = mas(mano, v3, p.mano);
      reg('hombro' + lado, O, 0); reg('codo' + lado, codo, al2); reg('mano' + lado, mano, al2 + g('mano' + lado)); reg('dedos' + lado, dedos, al2 + g('mano' + lado));
      eje('brazo' + lado, v1); eje('antebrazo' + lado, v2); eje('mano' + lado, v3);
      J['giroMano' + lado] = gm;
    };
    function rotY0(vv, ang) { return G3.rotY(vv, ang); }
    brazo('D', -1); brazo('I', 1);

    // --- piernas
    const piernaF = (lado, s) => {
      const cad = [s * 0.085 * H * (p.anchoCadera == null ? p.anchoHombro : p.anchoCadera), 0, 0];
      if (s > 0) cad[2] = -0.01 * H;                                  // desplazamiento de F1
      const be = nz(pose['abdMuslo' + lado], ABD_MUSLO), pieA = g('pie' + lado);
      const l1 = p.muslo * H, l2 = p.pierna * H;
      let v1, v2, rod, tob;
      const obj = pose['objetivoPie' + lado];
      if (obj) {
        const Tb = obj.length > 2 ? G3.rotY(G3.res(obj, M.o), -yaw) : [cad[0], obj[1] - yPel, (obj[0] - xPose) * dirP];
        let polo = [0, 0, 1], r;
        r = G3.ik2(cad, Tb, l1, l2, polo);
        rod = r.medio; tob = r.fin;
        v1 = G3.unit(G3.res(rod, cad)); v2 = G3.unit(G3.res(tob, rod));
      } else {
        const a1 = g('muslo' + lado), a2 = a1 + g('pierna' + lado);
        v1 = dirMiembro(a1, be, s); v2 = dirMiembro(a2, be, s);
        rod = mas(cad, v1, p.muslo); tob = mas(rod, v2, p.pierna);
      }
      const pf = [0, Math.sin(pieA), Math.cos(pieA)];
      const punta = G3.sum(mas(tob, pf, p.pie), [0, 0.02 * H, 0]);
      const talon = G3.sum(mas(tob, pf, -p.pie * 0.25), [0, 0.02 * H, 0]);
      reg('cadera' + lado, cad, angulos(v1, s)[0]); reg('rodilla' + lado, rod, angulos(v2, s)[0]); reg('tobillo' + lado, tob, angulos(v2, s)[0]);
      reg('punta' + lado, punta, pieA); reg('talon' + lado, talon, pieA);
      eje('muslo' + lado, v1); eje('pierna' + lado, v2); eje('pie' + lado, pf);
    };
    piernaF('D', -1); piernaF('I', 1);

    J.marcos = marcos; J.ejes = ejes; J.H = H; J.prop = p; J.yaw = yaw; J.dir = dirP; J.marcoCuerpo = M;
    return J;
  };
})(typeof window !== 'undefined' ? window : globalThis);
