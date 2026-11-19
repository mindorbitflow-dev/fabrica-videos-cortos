/* Ilustra — cuerpo 2.5D (Fase 2, WP6a, ESPECIFICACION_F2 §5.1, §5.2 y §6.5): miembros cónicos con abultamientos, torso por secciones,
   cuello y zapatos por nube 3D. Trabaja sobre un J25 de Rig25 (usa J.<hueso>.p en espacio de cuerpo y J.marcoCuerpo para llevar al mundo).
   Todas las piezas son funciones puras del J25 (sin estado, sin azar): mismas entradas, mismo Path2D.
   Pieza = {path, caja, campo, marco, nominal:[w,h], prof, ...}: lista para Pincel.forma(ctx, pieza.path, {campo, marco, nominal, ...}). */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3, P = I.Pincel;
  const C = I.Cuerpo = {};
  const DOSPI = Math.PI * 2;

  // ---------------------------------------------------------------- perfiles (§5.1): [u, del, det, ext, int] en fracción de H
  const ADULTO = {
    brazo: [[0, .036, .038, .040, .034], [.35, .034, .040, .038, .033], [1, .026, .028, .028, .025]],
    antebrazo: [[0, .027, .030, .029, .027], [.3, .030, .029, .031, .028], [1, .019, .018, .020, .018]],
    muslo: [[0, .058, .062, .060, .052], [.4, .052, .055, .054, .047], [1, .038, .040, .039, .036]],
    pierna: [[0, .037, .040, .038, .035], [.3, .036, .047, .040, .036], [1, .024, .026, .025, .023]]   // gemelo detrás en u=.3
  };
  const escalaPerfil = (pf, k) => { const o = {}; for (const n in pf) o[n] = pf[n].map(f => [f[0], f[1] * k, f[2] * k, f[3] * k, f[4] * k]); return o; };
  I.PERFILES = { adulto: ADULTO, nino: escalaPerfil(ADULTO, 1.1), anciano: escalaPerfil(ADULTO, 0.95) };
  const K_PERFIL = { adulto: 1, nino: 1.1, anciano: 0.95 };          // para torso y cuello (no tienen tabla por perfil)
  C.COMPLEXION = { delgada: 0.8, media: 1, robusta: 1.2 };
  const UEST = [0, 0.15, 0.35, 0.6, 0.85, 1];                          // estaciones de la sección (§5.1)
  const NANG = 12;                                                     // ángulos por sección (§5.1)

  function perfilDe(o) { const p = o.perfil || 'adulto'; return typeof p === 'string' ? (I.PERFILES[p] || ADULTO) : p; }
  function factorDe(o) {                                               // complexión (y perfil del torso) como multiplicador de radios
    const c = o.complexion == null ? 'media' : o.complexion;
    return typeof c === 'number' ? c : (C.COMPLEXION[c] == null ? 1 : C.COMPLEXION[c]);
  }
  function radiosEn(tabla, u) {                                        // interpolación lineal entre claves -> [del, det, ext, int]
    let i = 0; while (i < tabla.length - 2 && u > tabla[i + 1][0]) i++;
    const a = tabla[i], b = tabla[i + 1], f = I.clamp((u - a[0]) / (b[0] - a[0] || 1), 0, 1);
    return [1, 2, 3, 4].map(j => a[j] + (b[j] - a[j]) * f);
  }

  // ---------------------------------------------------------------- utilidades
  // Quita vértices casi repetidos (<0.6 px) y casi colineales (<0.3 px de la cuerda de sus vecinos): con ellos Catmull-Rom hace zigzags y bucles de
  // décimas de píxel (autointersecciones minúsculas).
  function limpiar(h0) {
    let h = [];
    for (const q of h0) if (!h.length || Math.hypot(q[0] - h[h.length - 1][0], q[1] - h[h.length - 1][1]) >= 0.6) h.push(q);
    while (h.length > 3 && Math.hypot(h[0][0] - h[h.length - 1][0], h[0][1] - h[h.length - 1][1]) < 0.6) h.pop();
    for (let cambio = true; cambio && h.length > 3;) {
      cambio = false;
      for (let i = 0; i < h.length && h.length > 3; i++) {
        const a = h[(i + h.length - 1) % h.length], b = h[i], c = h[(i + 1) % h.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
        if (Math.abs((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / l < 0.3) { h.splice(i, 1); i--; cambio = true; }
      }
    }
    return h;
  }
  // Silueta de una nube ya en mundo: envolvente + limpieza + suavizado (como G3.siluetaNube, que no limpia).
  function sil(pts3, pasos = 3) {
    const h = limpiar(G3.envolvente(pts3.map(p => [p[0], p[1]])));
    return h.length < 3 ? h : suaveSub(h, pasos);
  }
  const cajaDe = pts => P.caja(pts);
  function aPath(poly) { const p = P.aPath(poly); p._caja = cajaDe(poly); return p; }
  function circulo(c, r, n = 16) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * DOSPI; o.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]]); } return o; }
  // marco de trazos (§4.3): caja mínima de los puntos en el sistema (dir = a lo largo, n = transversal). o + u·ex + v·ey, u,v en [0,1]
  function marcoCaja(pts, dir) {
    const nx = -dir[1], ny = dir[0]; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const p of pts) {
      const a = p[0] * nx + p[1] * ny, b = p[0] * dir[0] + p[1] * dir[1];
      if (a < a0) a0 = a; if (a > a1) a1 = a; if (b < b0) b0 = b; if (b > b1) b1 = b;
    }
    return { o: [nx * a0 + dir[0] * b0, ny * a0 + dir[1] * b0], ex: [nx * (a1 - a0), ny * (a1 - a0)], ey: [dir[0] * (b1 - b0), dir[1] * (b1 - b0)] };
  }
  const unit2 = (x, y, sx = 0, sy = 1) => { x += sx; y += sy; const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  // Catmull-Rom cerrado con subdivisión previa de aristas largas (como G3.siluetaNube): evita que el suavizado se salga de un polígono de pocos vértices
  function suaveSub(h, pasos, sep = 1 / 32) {
    const n = h.length; let per = 0;
    for (let i = 0; i < n; i++) per += Math.hypot(h[(i + 1) % n][0] - h[i][0], h[(i + 1) % n][1] - h[i][1]);
    const L = Math.max(per * sep, 1e-6), d = [];
    for (let i = 0; i < n; i++) {
      const a = h[i], b = h[(i + 1) % n], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / L));
      for (let j = 0; j < k; j++) d.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    return P.suavizar(d, pasos, true);
  }

  // ---------------------------------------------------------------- segmento cónico (§5.1)
  // Marco de la sección en espacio de cuerpo: r = "delante" (Z girado con el ángulo sagital del hueso, ortogonalizado), e = "exterior" (s·v×r).
  // Con el hueso colgando r = +Z y e = ±X; al levantar el hueso hacia delante, r pasa a apuntar hacia arriba (flexión anatómica). Es continuo.
  function marcoSeg(v, s) {
    const al = Math.atan2(v[2], v[1]);
    let r = [0, -Math.sin(al), Math.cos(al)];
    r = G3.res(r, G3.esc(v, G3.punto(r, v)));
    r = G3.norma(r) < 1e-6 ? [0, -1, 0] : G3.unit(r);
    return { r, e: G3.esc(G3.cruz(v, r), s) };
  }
  // A, B: puntos de cuerpo (px). tabla: perfil del hueso. k: complexión. hol: holgura (fracción de H). uMax: recorte (puño). tapaA/tapaB: tapas redondas.
  // Devuelve el polígono 2D suavizado, los anillos 3D en mundo (para la ropa) y los datos de campo/marco.
  function segmento(M, A, B, tabla, s, k, hol, H, uMax, tapaA, tapaB) {
    const v = G3.unit(G3.res(B, A)), m = marcoSeg(v, s), largo = G3.norma(G3.res(B, A));
    const us = UEST.filter(u => u < uMax - 1e-6).concat([uMax]);
    const nube = [], anillos = [];
    for (const u of us) {
      const rd = radiosEn(tabla, u).map(q => q * k + hol), c = G3.lerp3(A, B, u), pts = [];
      for (let j = 0; j < NANG; j++) {
        const a = j / NANG * DOSPI, co = Math.cos(a), sn = Math.sin(a), ra = (co >= 0 ? rd[0] : rd[1]) * co * H, re = (sn >= 0 ? rd[2] : rd[3]) * sn * H;
        pts.push(M.aMundo([c[0] + m.r[0] * ra + m.e[0] * re, c[1] + m.r[1] * ra + m.e[1] * re, c[2] + m.r[2] * ra + m.e[2] * re]));
      }
      if (!((u === 0 && tapaA) || (u === 1 && tapaB))) for (const q of pts) nube.push(q);     // el anillo del extremo con tapa lo sustituye la tapa
      anillos.push({ u, c: M.aMundo(c), pts, rad: rd });
    }
    const rr = u => radiosEn(tabla, u).map(q => q * k + hol), mr = r => (r[0] + r[1] + r[2] + r[3]) / 4 * H;
    const A3 = M.aMundo(A), B3 = M.aMundo(B), rA = mr(rr(0)), rB = mr(rr(1));
    if (tapaA) for (const q of circulo(A3, rA)) nube.push(q);                 // tapas: círculo de la media de los radios de ese extremo
    if (tapaB) for (const q of circulo(B3, rB)) nube.push(q);
    const poly = G3.orientar(sil(nube, 3), true);
    let rmax = 0; for (const u of [0, 0.5, uMax]) for (const q of rr(u)) rmax = Math.max(rmax, q);
    return { poly, A3, B3, rA, rB, largo, anillos, rmax: rmax * H };
  }

  // pieza de un hueso suelto (se usa para dibujar por separado cuando brazo y antebrazo quedan a distinto lado del torso)
  function piezaSeg(sg, luz) {
    const path = aPath(sg.poly), dx = sg.B3[0] - sg.A3[0], dy = sg.B3[1] - sg.A3[1], dir = unit2(dx, dy, 0, 0.1 * sg.largo);
    return {
      path, caja: path._caja, campo: P.campos.cilindro([sg.A3[0], sg.A3[1]], sg.rA, [sg.B3[0], sg.B3[1]], sg.rB, luz),
      marco: marcoCaja(sg.poly, dir), nominal: [2 * sg.rmax, sg.largo], prof: (sg.A3[2] + sg.B3[2]) / 2, anillos: sg.anillos, poly: sg.poly,
      ejes: [sg.A3, sg.B3], radios: [sg.rA, sg.rB]
    };
  }

  // ---------------------------------------------------------------- miembros
  // Cuerpo.miembro(J, lado:'D'|'I', tipo:'brazo'|'pierna', H, {holgura=0, hasta=1, perfil='adulto', complexion='media', luz})
  //  -> {path (unión de los dos huesos), caja, campo, marco, nominal, prof, profs:[p1,p2], segmentos:[pieza, pieza], hasta}
  // hasta recorta el ÚLTIMO hueso (antebrazo o pierna) en esa fracción con un corte plano (puño / bajo de la pernera). tapaFin=false (extensión,
  // defecto true) quita también la tapa redonda del tobillo/muñeca (corte plano, que taparía el zapato o la mano).
  C.miembro = function (J, lado, tipo, H, o = {}) {
    const claves = tipo === 'brazo' ? ['hombro', 'codo', 'mano'] : ['cadera', 'rodilla', 'tobillo'];
    const tablas = tipo === 'brazo' ? ['brazo', 'antebrazo'] : ['muslo', 'pierna'];
    const s = lado === 'I' ? 1 : -1, perfil = perfilDe(o), k = factorDe(o), hol = o.holgura || 0, hasta = o.hasta == null ? 1 : I.clamp(o.hasta, 0.05, 1);
    const tapaFin = o.tapaFin == null ? true : !!o.tapaFin;                      // false: corte plano en el tobillo/muñeca (lo tapa el zapato o la mano)
    const M = J.marcoCuerpo, Ps = claves.map(c => J[c + lado].p);
    const sg = [0, 1].map(i => segmento(M, Ps[i], Ps[i + 1], perfil[tablas[i]], s, k, hol, H, i === 1 ? hasta : 1, true, i === 1 ? (hasta >= 1 && tapaFin) : true));
    const piezas = sg.map(q => piezaSeg(q, o.luz));
    const path = P.union([sg[0].poly, sg[1].poly]), caja = path._caja;
    const segs = sg.map(q => [[q.A3[0], q.A3[1]], q.rA, [q.B3[0], q.B3[1]], q.rB]);
    const l1 = sg[0].largo, l2 = sg[1].largo;
    // eje de los trazos: mezcla de la dirección de los dos huesos (la del primero domina, así no se invierte aunque se doble del todo)
    const d1 = [(sg[0].B3[0] - sg[0].A3[0]) / l1, (sg[0].B3[1] - sg[0].A3[1]) / l1], d2 = [(sg[1].B3[0] - sg[1].A3[0]) / l2, (sg[1].B3[1] - sg[1].A3[1]) / l2];
    const dir = unit2(d1[0] + 0.6 * d2[0], d1[1] + 0.6 * d2[1], 0, 0.1);
    const pts = sg[0].poly.concat(sg[1].poly);
    return {
      path, caja, campo: P.campos.union(segs, o.luz), marco: marcoCaja(pts, dir), nominal: [2 * Math.max(sg[0].rmax, sg[1].rmax), l1 + l2 * hasta],
      prof: (piezas[0].prof + piezas[1].prof) / 2, profs: [piezas[0].prof, piezas[1].prof], segmentos: piezas, hasta, lado, tipo
    };
  };

  // ---------------------------------------------------------------- cuello (§5.2): cilindro de J.cuello a J.cabezaBase, radio .026H -> .024H
  C.cuello = function (J, H, o = {}) {
    const k = factorDe(o) * (K_PERFIL[o.perfil] || 1), M = J.marcoCuerpo, a = J.cuello.p, b = J.cabezaBase.p, v = G3.unit(G3.res(b, a)), ex = 0.012 * H;
    const A = G3.res(a, G3.esc(v, ex)), B = G3.sum(b, G3.esc(v, ex));     // entra un poco en el torso y en la cabeza
    const tabla = [[0, .026, .026, .026, .026], [1, .024, .024, .024, .024]];
    const sg = segmento(M, A, B, tabla, 1, k, o.holgura || 0, H, 1, false, false);
    return piezaSeg(sg, o.luz);
  };

  // ---------------------------------------------------------------- torso (§5.2)
  // Secciones elípticas asimétricas [ext, del, det] (fracción de H). Entre la tabla de la especificación (hombros, pecho, cintura, cadera) se añaden
  // la sección de pelvis más baja (cadera+0.03H, algo más estrecha) y la base del cuello (para inclinar el hombro); luego se intercala una
  // sección media entre cada par para que el contorno no sea poligonal.
  const T_CADERA = [.085, .05, .065], T_BASE = [.078, .046, .058], T_CINTURA = [.07, .045, .045], T_PECHO = [.085, .06, .055], T_HOMBROS = [.105, .045, .05], T_CUELLO = [.05, .038, .04];
  function seccionesTorso(J, H, k, hol) {
    const pos = n => [J[n].x, J[n].y, J[n].prof], mp = J.marcos.pelvis, yP = mp.yaw, yC = J.marcos.pecho.yaw;
    const pP = J.pelvis.a, pC = J.hombros.a, pM = (J.cintura.a + J.hombros.a) / 2;
    const down = mp.dirAMundo([0, 0.03 * H, 0]), pel = pos('pelvis'), cin = pos('cintura'), hom = pos('hombros'), cue = pos('cuello');
    const base = [pel[0] + down[0], pel[1] + down[1], pel[2] + down[2]], pec = G3.lerp3(cin, hom, 0.6);
    const mk = (c, yaw, pitch, d) => ({ c, yaw, pitch, ext: d[0] * k + hol, del: d[1] * k + hol, det: d[2] * k + hol });
    const base0 = [mk(base, yP, pP, T_BASE), mk(pel, yP, pP, T_CADERA), mk(cin, (yP + yC) / 2, pM, T_CINTURA), mk(pec, yC, pC, T_PECHO), mk(hom, yC, pC, T_HOMBROS), mk(cue, yC, pC, T_CUELLO)];
    const S = [];
    for (let i = 0; i < base0.length; i++) {
      S.push(base0[i]);
      if (i < base0.length - 1) { const a = base0[i], b = base0[i + 1], l = (x, y) => (x + y) / 2; S.push({ c: G3.lerp3(a.c, b.c, 0.5), yaw: l(a.yaw, b.yaw), pitch: l(a.pitch, b.pitch), ext: l(a.ext, b.ext), del: l(a.del, b.del), det: l(a.det, b.det) }); }
    }
    return S;
  }
  const NT = 16;
  // Cuerpo.torso(J, H, {holgura=0, complexion, perfil, luz}) -> {path, caja, campo, marco, nominal, prof, secciones, eje}
  C.torso = function (J, H, o = {}) {
    const k = factorDe(o) * (K_PERFIL[typeof o.perfil === 'string' ? o.perfil : 'adulto'] || 1), S = seccionesTorso(J, H, k, o.holgura || 0);
    const b = S[0].c, t = S[S.length - 1].c;
    const u = unit2(t[0] - b[0], t[1] - b[1], 0, -0.08 * H), n = [-u[1], u[0]];      // u: arriba del torso en pantalla; n: a su derecha
    const der = [], izq = [], cen = [];
    for (const s of S) {
      let amax = -1e9, amin = 1e9, pmax = null, pmin = null;
      for (let j = 0; j < NT; j++) {
        const a = j / NT * DOSPI, co = Math.cos(a), sn = Math.sin(a);
        const l = G3.rotY(G3.rotX([s.ext * H * sn, 0, (co >= 0 ? s.del : s.det) * H * co], s.pitch), s.yaw);
        const x = s.c[0] + l[0], y = s.c[1] + l[1], q = x * n[0] + y * n[1];
        if (q > amax) { amax = q; pmax = [x, y]; } if (q < amin) { amin = q; pmin = [x, y]; }
      }
      der.push(pmax); izq.push(pmin); cen.push({ c: s.c, a: s.c[0] * n[0] + s.c[1] * n[1], amax, amin });
    }
    // de arriba abajo el máximo (derecha), de abajo arriba el mínimo (izquierda): sentido horario en pantalla
    const cont = der.slice().reverse().concat(izq);
    const poly = G3.orientar(suaveSub(limpiar(cont), 4), true), path = aPath(poly);
    const top2 = cen.slice().reverse();
    const campo = P.campos.seccion(top2.map(c => [c.c[0], c.c[1]]), top2.map(c => c.a - c.amin), top2.map(c => c.amax - c.a), o.luz);
    const p = J.prop, nominal = [2 * T_HOMBROS[0] * H * k, (p.columna + p.pecho + 0.03) * H];
    return {
      path, caja: path._caja, campo, marco: marcoCaja(poly, [-u[0], -u[1]]), nominal, prof: (J.pelvis.prof + J.hombros.prof) / 2,
      secciones: S, eje: { arriba: u, derecha: n }, poly
    };
  };

  // ---------------------------------------------------------------- zapatos (§5.2): nube 3D en el marco del pie (origen en el tobillo)
  // Puntos [x lateral, h altura sobre el suelo, z hacia la punta] en fracción de H. Suela: elipse de largo .14H y ancho .05H con el talón en z=-.03H.
  const SUELO = 0.0285;                                // altura del tobillo sobre el suelo con la pierna extendida en Rig25 (pelvis a (.995·(muslo+pierna)+.03)H: el objetivo de pie
                                                     // a .02H no se alcanza y el tobillo queda a .0285H; medido: 15.4 px a H=540)
  const MODELOS = {
    zapato: { th: .007, alto: 0, empeine: .035, punta: .02 },
    botin: { th: .007, alto: .07, costura: true, empeine: .035, punta: .02 },
    bota: { th: .007, alto: .16, costura: true, empeine: .035, punta: .02 },
    zapatilla: { th: .014, alto: 0, empeine: .04, punta: .026, suelaClara: true }
  };
  C.MODELOS_ZAPATO = Object.keys(MODELOS);
  const ZC = .04, ZA = .07, ZB = .025;                 // centro, semieje largo y semieje ancho de la suela
  const anilloSuela = (h, n, ea = 0, eb = 0) => { const r = []; for (let i = 0; i < n; i++) { const t = i / n * DOSPI; r.push([(ZB + eb) * Math.sin(t), h, ZC + (ZA + ea) * Math.cos(t)]); } return r; };
  function nubeZapato(m) {
    const cuerpo = anilloSuela(m.suelaClara ? m.th : 0, 8);                                // 8 puntos de suela
    cuerpo.push([-.020, m.empeine, -.020], [.020, m.empeine, -.020], [-.024, m.empeine, .045], [.024, m.empeine, .045]);    // 4 de empeine
    cuerpo.push([-.012, m.punta, .104], [.012, m.punta, .104]);                            // 2 de puntera -> 14 puntos
    if (m.alto > 0) {
      const anillo = (h, rx, rz) => { for (let i = 0; i < 8; i++) { const t = i / 8 * DOSPI; cuerpo.push([rx * Math.sin(t), h, -.002 + rz * Math.cos(t)]); } };
      if (m.alto > .1) { anillo(.09, .029, .031); anillo(m.alto, .027, .029); } else anillo(m.alto, .028, .032);
    }
    return cuerpo;
  }
  // Cuerpo.zapato(J, lado, H, {modelo='zapato', abre=0.14, luz}) -> {path, caja, campo, marco, ang, nominal, prof, suela:{path,...}|null, linea:[[x,y]...], costura:[[..],[..]]|null, largo3, modelo}
  C.zapato = function (J, lado, H, o = {}) {
    const mn = o.modelo || 'zapato', m = MODELOS[mn]; if (!m) throw new Error('Cuerpo.zapato: modelo desconocido "' + mn + '"');
    const s = lado === 'I' ? 1 : -1, abre = o.abre == null ? 0.14 : o.abre, M = J.marcoCuerpo, A = J['tobillo' + lado].p, pie = J['punta' + lado].a;
    const f = [0, Math.sin(pie), Math.cos(pie)], dn = [0, Math.cos(pie), -Math.sin(pie)], ca = Math.cos(abre), sa = Math.sin(abre) * s;
    const W = q => {                                              // local [x, h, z] (fracción de H) -> mundo [x, y, prof]
      const x = q[0] * ca + q[2] * sa, z = -q[0] * sa + q[2] * ca, d = SUELO - q[1];
      return M.aMundo([A[0] + H * x, A[1] + H * (dn[1] * d + f[1] * z), A[2] + H * (dn[2] * d + f[2] * z)]);
    };
    const cuerpo3 = nubeZapato(m).map(W), poly = G3.orientar(sil(cuerpo3, 3), true), path = aPath(poly);
    let suela = null;
    if (m.suelaClara) {
      const sp = G3.orientar(sil(anilloSuela(0, 12, .004, .003).concat(anilloSuela(m.th, 12, .004, .003)).map(W), 3), true), spath = aPath(sp);
      suela = { path: spath, caja: spath._caja, poly: sp };
    }
    // eje del pie en pantalla (signo normalizado: x >= 0) para orientar los trazos; el marco es la caja alineada a ejes
    const f2 = M.dirAMundo([sa, f[1] * ca, f[2] * ca]); let ang = Math.atan2(f2[1], f2[0]); if (Math.cos(ang) < 0) ang += Math.PI;
    const cj = path._caja, rx = Math.max(1, (cj.w) / 2), ry = Math.max(1, cj.h / 2);
    // línea de la suela: media elipse cercana (prof >= media) a la altura del borde superior de la suela
    const hl = m.suelaClara ? m.th : m.th * .8, ring = anilloSuela(hl, 16).map(W);
    const pm = ring.reduce((a, q) => a + q[2], 0) / ring.length; let i0 = -1;
    for (let i = 0; i < ring.length; i++) if (ring[i][2] >= pm && ring[(i + ring.length - 1) % ring.length][2] < pm) i0 = i;
    const linea = []; if (i0 >= 0) for (let j = 0; j < ring.length; j++) { const q = ring[(i0 + j) % ring.length]; if (q[2] < pm) break; linea.push([q[0], q[1]]); }
    if (linea.length < 2) for (const q of ring) linea.push([q[0], q[1]]);
    // separación empeine/puntera (botín y bota): arco sobre el empeine a z=.072; cada mitad se dibuja si su lado mira a cámara
    let costura = null;
    if (m.costura) {
      const arco = []; for (let i = 0; i <= 8; i++) { const ps = (i / 8 - 0.5) * Math.PI; arco.push(W([.024 * Math.sin(ps), m.th * .5 + (m.empeine - m.th * .5 + .002) * Math.cos(ps), .072 - .006 * (1 - Math.cos(ps))])); }
      const cima = arco[4][2], a = arco.slice(0, 5), b = arco.slice(4);
      costura = [];
      if (arco[0][2] >= cima - .004 * H) costura.push(a.map(q => [q[0], q[1]]));
      if (arco[8][2] >= cima - .004 * H) costura.push(b.map(q => [q[0], q[1]]));
    }
    return {
      path, caja: cj, campo: P.campos.elipsoide([cj.cx, cj.cy], rx, ry, 0, o.luz), marco: { o: [cj.x0, cj.y0], ex: [cj.w, 0], ey: [0, cj.h] }, ang,
      nominal: [0.06 * H, 0.14 * H], prof: J['tobillo' + lado].prof, suela, linea, costura, largo3: 2 * ZA * H, modelo: mn, poly
    };
  };
  // Dibuja un zapato completo (suela clara si la hay, envolvente, línea de la suela y costura). est: {color, colorSuela, luz, semilla, volumen, borde, ...}
  C.dibujarZapato = function (ctx, z, est = {}) {
    const color = est.color || '#4a3a32', base = Object.assign({ irregular: 0, textura: 0, volumen: 0.5 }, est);
    delete base.colorSuela;
    if (z.suela) P.forma(ctx, z.suela.path, Object.assign({}, base, { color: est.colorSuela || '#e8e2d6', semilla: (est.semilla || 1) + 7, plano: est.plano, pintura: false }));
    P.forma(ctx, z.path, Object.assign({}, base, { color, campo: z.campo, marco: z.marco, nominal: z.nominal, pintura: est.pintura === undefined ? undefined : est.pintura }));
    ctx.save(); ctx.clip(z.path); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const osc = I.css(I.oscurece(color, 0.5), 0.9);
    if (z.linea.length > 1) { ctx.strokeStyle = osc; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(z.linea[0][0], z.linea[0][1]); for (let i = 1; i < z.linea.length; i++) ctx.lineTo(z.linea[i][0], z.linea[i][1]); ctx.stroke(); }
    if (z.costura) { ctx.strokeStyle = I.css(I.oscurece(color, 0.45), 0.75); ctx.lineWidth = 1.2; for (const c of z.costura) { ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (let i = 1; i < c.length; i++) ctx.lineTo(c[i][0], c[i][1]); ctx.stroke(); } }
    ctx.restore();
  };

  // ---------------------------------------------------------------- orden de las piezas (§6.5)
  // Rango canónico en los empates: pierna lejana, brazo lejano, torso, pierna cercana, cabeza, brazo cercano, manos.
  const RANGO = { piernaLejos: 0, brazoLejos: 1, torso: 2, cuello: 2.5, piernaCerca: 3, cabeza: 4, brazoCerca: 5, mano: 6 };
  C.RANGO = RANGO;
  // lista: [{id, prof, rango}] -> nuevo array de lejos a cerca. Función pura (sin histéresis): a va antes que b si su prof es menor por más de
  // 0.015H; dentro de esa banda manda el rango canónico (y el id, para que el resultado no dependa del orden de entrada). Se ordena por
  // selección (Kahn) porque una banda de tolerancia no es una relación transitiva; si hubiera un ciclo se elige la de menor prof.
  C.ordenar = function (lista, H) {
    const tol = 0.015 * H, n = lista.length;
    const antes = (a, b) => { const d = b.prof - a.prof; if (Math.abs(d) < tol) return a.rango !== b.rango ? a.rango < b.rango : a.id < b.id; return d > 0; };
    const resto = lista.slice().sort((a, b) => a.prof - b.prof || a.rango - b.rango || (a.id < b.id ? -1 : 1)), out = [];
    while (resto.length) {
      let el = -1;
      for (let j = 0; j < resto.length && el < 0; j++) { let libre = true; for (let i = 0; i < resto.length && libre; i++) if (i !== j && antes(resto[i], resto[j])) libre = false; if (libre) el = j; }
      out.push(resto.splice(el < 0 ? 0 : el, 1)[0]);
    }
    return out;
  };
  // Cuerpo.piezas(J, H, {complexion, perfil, holguras, zapatos:{modelo}|null, luz}) -> piezas ordenadas de lejos a cerca:
  //  [{id, parte, prof, rango, pieza}] con parte = 'piernaD' | 'brazoI' | 'torso' | 'cuello' | 'zapatoD' ... Cada miembro es UNA pieza (la unión) salvo cuando
  //  sus dos huesos quedan a lados distintos del torso: entonces son dos ('brazoD#0', 'brazoD#1'), cada una con la prof de su punto medio.
  //  El llamador añade cabeza (rango RANGO.cabeza) y manos (RANGO.mano) a la lista antes de ordenar si las quiere en el mismo orden: usar C.ordenar.
  C.piezas = function (J, H, o = {}) {
    const lst = [], ptorso = (J.pelvis.prof + J.hombros.prof) / 2, opc = { complexion: o.complexion, perfil: o.perfil, luz: o.luz };
    const T = C.torso(J, H, opc); lst.push({ id: 'torso', parte: 'torso', prof: T.prof, rango: RANGO.torso, pieza: T });
    lst.push({ id: 'cuello', parte: 'cuello', prof: J.cuello.prof, rango: RANGO.cuello, pieza: C.cuello(J, H, opc) });
    for (const lado of ['D', 'I']) for (const tipo of ['brazo', 'pierna']) {
      const raiz = J[(tipo === 'brazo' ? 'hombro' : 'cadera') + lado].prof, cerca = raiz >= ptorso, parte = tipo + lado;
      const rango = tipo === 'brazo' ? (cerca ? RANGO.brazoCerca : RANGO.brazoLejos) : (cerca ? RANGO.piernaCerca : RANGO.piernaLejos);
      const mi = C.miembro(J, lado, tipo, H, Object.assign({}, opc, { holgura: o.holgura && o.holgura[tipo] || 0 }));
      const l0 = mi.profs[0] >= ptorso, l1 = mi.profs[1] >= ptorso;
      if (l0 === l1) lst.push({ id: parte, parte, prof: mi.prof, rango, pieza: mi });
      else mi.segmentos.forEach((sg, i) => lst.push({ id: parte + '#' + i, parte, prof: sg.prof, rango, pieza: sg, segmento: i }));
      if (tipo === 'pierna' && o.zapatos !== null) {
        const z = C.zapato(J, lado, H, Object.assign({ luz: o.luz }, o.zapatos || {}));
        lst.push({ id: 'zapato' + lado, parte: 'zapato' + lado, prof: z.prof, rango: rango + 0.5, pieza: z });
      }
    }
    return C.ordenar(lst, H);
  };
})(typeof window !== 'undefined' ? window : globalThis);
