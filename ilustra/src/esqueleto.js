/* Ilustra — esqueleto 2D, poses como datos, cinemática inversa de dos huesos y ciclos procedurales.
   Convenciones (personaje mirando a la derecha, dir=1; con dir=-1 todo se refleja en x):
   - Tronco (cadera, columna, pecho, cuello, cabeza): ángulo respecto a la vertical hacia ARRIBA, + = inclinado hacia delante.
     cadera es absoluto, el resto relativo al hueso padre.
   - Brazos y piernas: el primer segmento (brazo, muslo) es absoluto respecto a la vertical hacia ABAJO, + = hacia delante.
     antebrazo/pierna/mano/pie son relativos a su padre (+ = gira hacia delante).
   - raizY: desplazamiento vertical de la pelvis en unidades de altura (+ = más abajo). */
(function (G) {
  'use strict';
  const I = G.Ilustra;

  I.PROPORCIONES = {
    adulto: { columna: 0.16, pecho: 0.14, cuello: 0.045, cabeza: 0.13, brazo: 0.17, antebrazo: 0.155, mano: 0.06, muslo: 0.245, pierna: 0.235, pie: 0.095, escalaCabeza: 1.12, anchoHombro: 1, curva: 0 },
    nino: { columna: 0.13, pecho: 0.12, cuello: 0.035, cabeza: 0.175, brazo: 0.15, antebrazo: 0.135, mano: 0.055, muslo: 0.2, pierna: 0.19, pie: 0.075, escalaCabeza: 1.35, anchoHombro: 0.85, curva: 0 },
    anciano: { columna: 0.15, pecho: 0.135, cuello: 0.045, cabeza: 0.13, brazo: 0.165, antebrazo: 0.15, mano: 0.06, muslo: 0.235, pierna: 0.225, pie: 0.085, escalaCabeza: 1, anchoHombro: 0.95, curva: 0.25 },
    // Fase 2 (§5.6): figura esbelta; F1 no la usa. Piernas x1.08 respecto de adulto, hombros x0.9, escalaCabeza 0.95; tronco acortado para que la
    // altura total siga siendo ~H (adulto 1.016H; estilizado ~1.004H).
    estilizado: { columna: 0.15, pecho: 0.13, cuello: 0.04, cabeza: 0.13, brazo: 0.175, antebrazo: 0.16, mano: 0.06, muslo: 0.2646, pierna: 0.2538, pie: 0.095, escalaCabeza: 0.95, anchoHombro: 0.9, curva: 0 }
  };

  const CAMPOS = ['cadera', 'columna', 'pecho', 'cuello', 'cabeza', 'brazoD', 'antebrazoD', 'manoD', 'brazoI', 'antebrazoI', 'manoI',
    'musloD', 'piernaD', 'pieD', 'musloI', 'piernaI', 'pieI', 'raizY'];
  I.CAMPOS_POSE = CAMPOS;
  const P0 = {}; CAMPOS.forEach(k => P0[k] = 0);
  const pose = o => Object.assign({}, P0, o);

  I.POSES = {
    dePie: pose({ columna: 0.02, pecho: -0.02, cuello: 0.06, cabeza: -0.04, brazoD: 0.06, antebrazoD: 0.18, brazoI: -0.04, antebrazoI: 0.2, musloD: 0.03, piernaD: -0.03, musloI: -0.03, piernaI: -0.01 }),
    sentado: pose({ columna: 0.05, pecho: 0.02, cuello: 0.08, brazoD: 0.35, antebrazoD: 0.9, brazoI: 0.25, antebrazoI: 0.95, musloD: 1.45, piernaD: -1.4, pieD: 0.1, musloI: 1.4, piernaI: -1.35, pieI: 0.1, raizY: 0.22 }),
    agarrar: pose({ columna: 0.18, pecho: 0.1, cuello: 0.1, cabeza: 0.15, brazoD: 0.9, antebrazoD: 0.35, brazoI: 0.1, antebrazoI: 0.3, musloD: 0.12, piernaD: -0.1, musloI: -0.08, piernaI: -0.02 }),
    abrazar: pose({ columna: 0.08, pecho: 0.08, cuello: 0.05, cabeza: 0.1, brazoD: 1.2, antebrazoD: 1.2, brazoI: 1.1, antebrazoI: 1.3, musloD: 0.05, musloI: -0.05 }),
    saludar: pose({ columna: -0.02, cuello: 0.02, cabeza: -0.1, brazoD: 2.6, antebrazoD: 0.6, manoD: -0.2, brazoI: -0.05, antebrazoI: 0.2, musloD: 0.03, musloI: -0.03 }),
    manosBolsillos: pose({ columna: 0.0, pecho: -0.03, cuello: 0.06, brazoD: 0.12, antebrazoD: 0.55, brazoI: 0.02, antebrazoI: 0.55, musloD: 0.04, musloI: -0.04 }),
    cabizbajo: pose({ columna: 0.12, pecho: 0.12, cuello: 0.25, cabeza: 0.3, brazoD: 0.05, antebrazoD: 0.12, brazoI: -0.02, antebrazoI: 0.1, musloD: 0.02, musloI: -0.02, raizY: 0.005 }),
    sostenerParaguas: pose({ columna: 0.02, pecho: -0.02, cuello: 0.05, cabeza: -0.02, brazoD: 0.55, antebrazoD: 1.75, manoD: -0.4, brazoI: -0.05, antebrazoI: 0.35, musloD: 0.03, musloI: -0.03 }),
    correr0: pose({ columna: 0.25, pecho: 0.05, cuello: -0.1, cabeza: -0.1, brazoD: -0.8, antebrazoD: 1.4, brazoI: 0.9, antebrazoI: 1.2, musloD: 0.9, piernaD: -0.4, musloI: -0.5, piernaI: -1.4, raizY: -0.01 }),
    correr1: pose({ columna: 0.25, pecho: 0.05, cuello: -0.1, cabeza: -0.1, brazoD: 0.9, antebrazoD: 1.2, brazoI: -0.8, antebrazoI: 1.4, musloD: -0.5, piernaD: -1.4, musloI: 0.9, piernaI: -0.4, raizY: -0.01 })
  };

  function angInterp(a, b, k) { return a + (b - a) * k; }
  I.mezclarPoses = function (a, b, k) {
    const o = Object.assign({}, a, b);
    for (const c of CAMPOS) o[c] = angInterp(a[c] || 0, b[c] || 0, k);
    // objetivos IK: se toman del que domina
    for (const c of ['objetivoPieD', 'objetivoPieI', 'objetivoManoD', 'objetivoManoI']) {
      if (a[c] && b[c]) o[c] = [I.lerp(a[c][0], b[c][0], k), I.lerp(a[c][1], b[c][1], k)];
      else o[c] = k < 0.5 ? a[c] : b[c];
      if (!o[c]) delete o[c];
    }
    return o;
  };
  I.sumarPoses = function (base, delta, k = 1) {
    const o = Object.assign({}, base);
    for (const c of CAMPOS) if (delta[c]) o[c] = (base[c] || 0) + delta[c] * k;
    for (const c of ['objetivoPieD', 'objetivoPieI', 'objetivoManoD', 'objetivoManoI', 'pieAlturaD', 'pieAlturaI']) if (delta[c] != null) o[c] = delta[c];
    return o;
  };

  // IK de dos huesos. Devuelve ángulos absolutos (desde la vertical hacia abajo, + = hacia delante en el marco local)
  // origen/objetivo en coordenadas locales ya reflejadas (x hacia delante). flexion +1: la articulación media apunta hacia delante.
  I.ik2 = function (origen, objetivo, l1, l2, flexion = 1) {
    const dx = objetivo[0] - origen[0], dy = objetivo[1] - origen[1];
    let d = Math.hypot(dx, dy);
    d = I.clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    const base = Math.atan2(dx, dy);
    const a = Math.acos(I.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const b = Math.acos(I.clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
    const a1 = base + flexion * a;
    const a2 = a1 - flexion * (Math.PI - b);
    return [a1, a2];
  };

  I.ciclos = {};
  // Ciclo de paso sin deslizamiento: devuelve un delta con objetivos de pie RELATIVOS a la pelvis (en unidades de altura,
  // x hacia delante, y hacia abajo desde la pelvis hasta el tobillo) a partir de la distancia recorrida.
  I.ciclos.caminar = function (distancia, H, o = {}) {
    const S = (o.zancada || 0.26) * H, apoyo = 0.6, lev = (o.levantar || 0.05) * H, bob = (o.rebote || 0.012);
    const u = distancia / (2 * S);
    const pierna = (u0) => {
      const n = Math.floor(u0), f = u0 - n;
      let x, y = 0, pie = 0;
      const plant = n * 2 * S + 0.6 * S;
      if (f < apoyo) {
        x = plant - u0 * 2 * S;
        // el talón se despega al final del apoyo (punta hacia abajo = ángulo +)
        const k = f > apoyo - 0.18 ? (f - (apoyo - 0.18)) / 0.18 : 0;
        pie = 0.45 * k * k; y = -0.018 * H * k * k;
      } else {
        const s = (f - apoyo) / (1 - apoyo), e = I.ease.entraSale(s);
        x = plant + 2 * S * e - u0 * 2 * S; y = -lev * Math.sin(Math.PI * s) - 0.018 * H * (1 - s) * (1 - s);
        // sale con la punta abajo y llega con la punta arriba (golpe de talón)
        pie = s < 0.5 ? 0.45 * (1 - s * 2) : -0.3 * Math.sin(Math.PI * (s - 0.5) * 1.6);
      }
      return { x, y, pie, f };
    };
    const d = pierna(u), i = pierna(u + 0.5);
    const brz = o.brazos == null ? 0.32 : o.brazos;
    return {
      raizY: bob * Math.cos(4 * Math.PI * u) + 0.012,
      pasoD: d, pasoI: i,
      brazoD: -brz * Math.cos(2 * Math.PI * u), antebrazoD: 0.15 + 0.15 * Math.max(0, Math.cos(2 * Math.PI * u + Math.PI)),
      brazoI: brz * Math.cos(2 * Math.PI * u), antebrazoI: 0.15 + 0.15 * Math.max(0, Math.cos(2 * Math.PI * u)),
      columna: 0.04, cabeza: -0.03 * Math.cos(4 * Math.PI * u),
      pecho: 0.02 * Math.sin(2 * Math.PI * u)
    };
  };
  // Pose completa de caminar: x = posición de la pelvis en el mundo, distancia recorrida (para la fase), ySuelo.
  // base: pose de brazos opcional (p.ej. sostenerParaguas) que conserva los campos indicados en 'fijos'.
  I.ciclos.poseCaminar = function (x, ySuelo, distancia, H, dir, base, fijos = [], o = {}) {
    const c = I.ciclos.caminar(distancia, H, o);
    const pose = Object.assign({}, I.POSES.dePie, base || {});
    for (const k of ['raizY', 'brazoD', 'antebrazoD', 'brazoI', 'antebrazoI', 'columna', 'cabeza', 'pecho'])
      if (fijos.indexOf(k) < 0) pose[k] = (k === 'raizY' || k === 'columna' || k === 'pecho' || k === 'cabeza') ? (base && base[k] || 0) + c[k] : c[k];
    const yT = ySuelo - 0.02 * H;
    pose.objetivoPieD = [x + dir * c.pasoD.x, yT + c.pasoD.y]; pose.pieD = c.pasoD.pie;
    pose.objetivoPieI = [x + dir * c.pasoI.x, yT + c.pasoI.y]; pose.pieI = c.pasoI.pie;
    pose.fasePaso = c.pasoD.f;
    return pose;
  };
  // Pose de pie con los pies plantados en posiciones dadas (para transiciones caminar -> parar sin deslizamiento)
  I.ciclos.poseParado = function (x, ySuelo, H, dir, base, pies) {
    const pose = Object.assign({}, I.POSES.dePie, base || {});
    const yT = ySuelo - 0.02 * H;
    pose.objetivoPieD = [pies ? pies[0] : x + dir * 0.03 * H, yT]; pose.pieD = 0;
    pose.objetivoPieI = [pies ? pies[1] : x - dir * 0.03 * H, yT]; pose.pieI = 0;
    return pose;
  };
  I.ciclos.respirar = function (t, o = {}) {
    const f = o.frec || 0.25, a = o.amp == null ? 0.012 : o.amp, s = Math.sin(t * Math.PI * 2 * f);
    return { pecho: -a * 1.5 * s, cuello: a * 0.8 * s, raizY: a * 0.15 * s, brazoD: a * 0.5 * s, brazoI: a * 0.5 * s, respiro: s };
  };
  I.ciclos.parpadeo = function (t, semilla = 1) {
    // intervalos pseudoaleatorios de 2.5 a 5 s, cierre de 0.14 s
    let t0 = I.hash(semilla) * 2;
    for (let k = 0; k < 200 && t0 <= t + 0.2; k++) {
      const d = t - t0;
      if (d >= 0 && d < 0.14) return Math.abs(d / 0.07 - 1) * 0.9 + 0.1 * (d / 0.14);
      t0 += 2.5 + I.hash(semilla * 31 + k) * 2.5;
    }
    return 1;
  };

  // Esqueleto: calcula posiciones de articulaciones en el mundo
  I.Esqueleto = function (proporciones, altura) {
    this.p = typeof proporciones === 'string' ? I.PROPORCIONES[proporciones] : (proporciones || I.PROPORCIONES.adulto);
    this.H = altura;
  };
  // x,y = posición del suelo bajo la pelvis (los pies tocan y cuando la pose es dePie)
  I.Esqueleto.prototype.resolver = function (x, y, pose, dir = 1) {
    const p = this.p, H = this.H, J = {};
    const arriba = a => [Math.sin(a) * dir, -Math.cos(a)];
    const abajo = a => [Math.sin(a) * dir, Math.cos(a)];
    const mas = (o, v, l) => [o[0] + v[0] * l * H, o[1] + v[1] * l * H];
    const altPelvis = (p.muslo + p.pierna) * 0.995 + 0.03;
    const pel = [x, y - altPelvis * H + (pose.raizY || 0) * H];
    J.pelvis = { x: pel[0], y: pel[1], a: pose.cadera };
    let a = (pose.cadera || 0) + (pose.columna || 0) + p.curva * 0.3;
    const pechoBase = mas(pel, arriba(a), p.columna); J.cintura = { x: pechoBase[0], y: pechoBase[1], a };
    a += (pose.pecho || 0) + p.curva * 0.5;
    const hombros = mas(pechoBase, arriba(a), p.pecho * 0.88); J.hombros = { x: hombros[0], y: hombros[1], a };
    const cuelloBase = mas(pechoBase, arriba(a), p.pecho); J.cuello = { x: cuelloBase[0], y: cuelloBase[1], a };
    a += (pose.cuello || 0) + p.curva * 0.6;
    const cabezaBase = mas(cuelloBase, arriba(a), p.cuello); J.cabezaBase = { x: cabezaBase[0], y: cabezaBase[1], a };
    a += (pose.cabeza || 0);
    const cc = mas(cabezaBase, arriba(a), p.cabeza * 0.52 * p.escalaCabeza); J.cabeza = { x: cc[0], y: cc[1], a };

    // brazos
    const brazo = (lado, prof) => {
      const hom = [hombros[0] - dir * prof * H * 0.012, hombros[1] + prof * H * 0.004];
      let a1, a2;
      const obj = pose['objetivoMano' + lado];
      if (obj) {
        const loc = [(obj[0] - hom[0]) * dir, obj[1] - hom[1]];
        [a1, a2] = I.ik2([0, 0], loc, p.brazo * H, p.antebrazo * H, -1);
      } else { a1 = pose['brazo' + lado] || 0; a2 = a1 + (pose['antebrazo' + lado] || 0); }
      const codo = mas(hom, abajo(a1), p.brazo), mano = mas(codo, abajo(a2), p.antebrazo);
      const a3 = a2 + (pose['mano' + lado] || 0);
      const punta = mas(mano, abajo(a3), p.mano);
      J['hombro' + lado] = { x: hom[0], y: hom[1], a: a1 };
      J['codo' + lado] = { x: codo[0], y: codo[1], a: a2 };
      J['mano' + lado] = { x: mano[0], y: mano[1], a: a3 };
      J['dedos' + lado] = { x: punta[0], y: punta[1], a: a3 };
    };
    brazo('D', 0); brazo('I', 1);

    // piernas
    const pierna = (lado, prof) => {
      const cad = [pel[0] - dir * prof * H * 0.01, pel[1]];
      let a1, a2, pieA = pose['pie' + lado] || 0;
      const obj = pose['objetivoPie' + lado];
      if (obj) {
        const loc = [(obj[0] - cad[0]) * dir, obj[1] - cad[1]];
        [a1, a2] = I.ik2([0, 0], loc, p.muslo * H, p.pierna * H, 1);
      } else { a1 = pose['muslo' + lado] || 0; a2 = a1 + (pose['pierna' + lado] || 0); }
      const rod = mas(cad, abajo(a1), p.muslo), tob = mas(rod, abajo(a2), p.pierna);
      // el pie apunta hacia delante (horizontal) girado por pieA
      const pf = [Math.cos(pieA) * dir, Math.sin(pieA)];
      const punta = [tob[0] + pf[0] * p.pie * H, tob[1] + pf[1] * p.pie * H + 0.02 * H];
      const talon = [tob[0] - pf[0] * p.pie * H * 0.25, tob[1] + 0.02 * H - pf[1] * p.pie * H * 0.25];
      J['cadera' + lado] = { x: cad[0], y: cad[1], a: a1 };
      J['rodilla' + lado] = { x: rod[0], y: rod[1], a: a2 };
      J['tobillo' + lado] = { x: tob[0], y: tob[1], a: a2 };
      J['punta' + lado] = { x: punta[0], y: punta[1], a: pieA };
      J['talon' + lado] = { x: talon[0], y: talon[1], a: pieA };
    };
    pierna('D', 0); pierna('I', 1);
    J.dir = dir; J.H = H; J.prop = p;
    return J;
  };
})(window);
