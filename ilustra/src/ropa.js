/* Ilustra — ropa como capa propia (Fase 2, WP6b, ESPECIFICACION_F2 §5.6): prendas construidas desde el cuerpo de WP6a (Cuerpo.miembro / Cuerpo.torso)
   con holgura, más pliegues por reglas (compresión, tensión, caída) y movimiento secundario de WP5 (dinamica.cadena) en bajos y bufanda.
   Todo es función pura de (J25, t, historial): sin azar, sin estado, mismas entradas -> mismo Path2D.

   API
     Ropa.prenda(spec, J, H, o)             -> [item]   una prenda ({tipo:'abrigo'|'jersey'|'camisa'|'pantalon'|'falda'|'delantal'|'bufanda', color, ...})
     Ropa.piezas(J, H, prendas, o)          -> [item]   todas las prendas de la lista (con las reglas de capas: abrigo cerrado tapa jersey, etc.)
     Ropa.cuerpoVestido(J, H, prendas, o)   -> [item]   cuerpo (Cuerpo.piezas) con las partes cubiertas sustituidas por su prenda + o.extra (cabeza, manos...), ORDENADO
     Ropa.ordenar(items, J, H)              -> [item]   orden por capas (0 debajo del faldón, 1 faldón/abrigo/falda/delantal, 2 encima) y dentro de cada capa Cuerpo.ordenar
     Ropa.dibujar(ctx, item, est)                       dibuja un item de ropa o de cuerpo desnudo (piel / zapato)
     Ropa.manga(J, lado, H, o), Ropa.pernera(J, lado, H, o)   -> [item] (una o dos piezas, como Cuerpo.piezas)
     Ropa.pliegues.compresion(art, flexion, H, opc) / tension(desde, hacia, n, opc) / caida(cintura, bajo, n, opc) -> [{pts, ancho, alfa}]
   item = {id, parte, prof, rango, capa, pieza:{path, caja, campo, marco, nominal, prof, color, semilla}, cubre:[partes de Cuerpo que sustituye], dibujar(ctx, est)}
   o = {luz, complexion, perfil, zapatos:{modelo,color}, semilla, piel, t, historial:(t')=>J25, id, viento:(t)=>[ax,ay], extra:[items], estilo}
   Con o.historial (conductor) y o.t el bajo del abrigo/falda y la cola de la bufanda reciben movimiento secundario; sin ellos la prenda queda en reposo.
   o.historial debe ser SIEMPRE LA MISMA función por actor (dinamica.memo la usa como clave de caché). */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3, P = I.Pincel, C = I.Cuerpo, D = I.dinamica;
  const R = I.Ropa = {};
  const DOSPI = Math.PI * 2, clamp = I.clamp, lerp = I.lerp, suave = I.suave;
  const sm = (v, a, b) => suave(clamp((v - a) / (b - a), 0, 1));

  // holguras (fracción de H, §5.6). Las no listadas en la especificación (falda, delantal, camisa) son decisión de este WP.
  const HOL = { manga: { abrigo: 0.010, jersey: 0.006, camisa: 0.004 }, pernera: 0.006, abrigo: 0.012, falda: 0.008, jersey: 0.006, camisa: 0.004, delantal: 0.014 };
  R.HOLGURA = HOL;
  const RANGO_FALDON = 3.2;

  // ---------------------------------------------------------------- utilidades geométricas (copias de las privadas de cuerpo.js)
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
  function aPath(poly) { const p = P.aPath(poly); p._caja = P.caja(poly); return p; }
  function casco(pts3, pasos = 3) {                        // silueta de una nube 3D ya en mundo
    const h = limpiar(G3.envolvente(pts3));
    return h.length < 3 ? h : G3.orientar(suaveSub(h, pasos), true);
  }
  function marcoCaja(pts, dir) {                           // marco de trazos (§4.3): o + u·ex + v·ey con u,v en [0,1]
    const nx = -dir[1], ny = dir[0]; let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const p of pts) {
      const a = p[0] * nx + p[1] * ny, b = p[0] * dir[0] + p[1] * dir[1];
      if (a < a0) a0 = a; if (a > a1) a1 = a; if (b < b0) b0 = b; if (b > b1) b1 = b;
    }
    return { o: [nx * a0 + dir[0] * b0, ny * a0 + dir[1] * b0], ex: [nx * (a1 - a0), ny * (a1 - a0)], ey: [dir[0] * (b1 - b0), dir[1] * (b1 - b0)] };
  }
  const unit2 = (x, y, sx = 0, sy = 1) => { x += sx; y += sy; const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
  const kc = o => { const c = o.complexion == null ? 'media' : o.complexion; return typeof c === 'number' ? c : (C.COMPLEXION[c] == null ? 1 : C.COMPLEXION[c]); };
  const colorDe = (s, def) => (s && s.color) || def;
  // ángulo (rad) entre las direcciones A->B y B->C (0 = recto), en 3D de mundo (invariante a la vista)
  function flexion3(A, B, Cc) {
    const u = G3.unit(G3.res([B.x, B.y, B.prof], [A.x, A.y, A.prof])), v = G3.unit(G3.res([Cc.x, Cc.y, Cc.prof], [B.x, B.y, B.prof]));
    return Math.acos(clamp(G3.punto(u, v), -1, 1));
  }
  const pos = j => [j.x, j.y, j.prof];

  // ---------------------------------------------------------------- pliegues (§5.6)
  // art = {c:[x,y] (articulación en pantalla), interior:[ix,iy] (unitario, hacia el lado cerrado del ángulo), rad (media anchura del miembro, px), vis 0..1}
  // compresion: round(flexion·2.2) curvas en "C" (0..3) apiladas en el interior, abiertas hacia el exterior; cada una aparece con alfa creciente
  // (0 en el umbral del redondeo, completa 0.5 después) para que no salten al cruzar el umbral. Prohibido el abanico radial (P4).
  const PL = { compresion(art, flexion, H, opc = {}) {
    const f22 = Math.max(0, flexion) * 2.2, n = clamp(Math.round(f22), 0, 3), out = [];
    if (!n || !art || art.vis <= 0.001) return out;
    const iw = art.interior, pw = [-iw[1], iw[0]], rad = art.rad, th = Math.PI - flexion;         // th: ángulo interior del codo/rodilla
    const dIn = clamp(rad / Math.max(Math.sin(th / 2), 0.35), rad * 0.9, rad * 2.0);                // distancia del eje a la esquina interior
    const sep = (opc.sep || 0.012) * H;
    for (let k = 0; k < n; k++) {
      const largo = Math.min((0.07 - 0.008 * k) * H, rad * 1.7), hc = largo / 2, abomba = 0.42 * hc, c0 = dIn * 0.82 - k * sep * 1.15;
      const pts = [];
      for (let s = -1; s <= 1.001; s += 0.5) pts.push([art.c[0] + iw[0] * (c0 + abomba * (1 - s * s)) + pw[0] * s * hc, art.c[1] + iw[1] * (c0 + abomba * (1 - s * s)) + pw[1] * s * hc]);
      out.push({ pts, ancho: (opc.ancho || 0.0065) * H * (1 - 0.12 * k), alfa: 0.6 * sm(f22, k + 0.5, k + 1.0) * art.vis });
    }
    return out;
  },
  // líneas diagonales levemente curvas de desde a hacia (axila con abdBrazo>0.5, entrepierna al dar un paso largo). opc.k: intensidad 0..1
  tension(desde, hacia, n = 2, opc = {}) {
    const H = opc.H || 540, k = opc.k == null ? 1 : opc.k, out = [], dx = hacia[0] - desde[0], dy = hacia[1] - desde[1], l = Math.hypot(dx, dy) || 1, pw = [-dy / l, dx / l];
    if (k <= 0.001) return out;
    for (let j = 0; j < n; j++) {
      const o = (j - (n - 1) / 2) * (opc.sep || 0.014) * H, bomba = (opc.curva == null ? 0.07 : opc.curva) * l;
      out.push({ pts: [[desde[0] + pw[0] * o, desde[1] + pw[1] * o], [desde[0] + dx * 0.5 + pw[0] * (o * 0.7 + bomba), desde[1] + dy * 0.5 + pw[1] * (o * 0.7 + bomba)], [hacia[0] + pw[0] * o * 0.35, hacia[1] + pw[1] * o * 0.35]],
        ancho: (opc.ancho || 0.0055) * H, alfa: 0.6 * k });
    }
    return out;
  },
  // líneas casi verticales del cinturón al bajo. cintura = [pIzq, pDer] del cinturón; bajo = polilínea del bajo (ya con el desfase de la cadena),
  // así las líneas se mueven con ella. Cada línea se arquea un poco en proporción al desplazamiento horizontal del bajo respecto a la vertical.
  caida(cintura, bajo, n = 3, opc = {}) {
    const H = opc.H || 540, out = [], m = bajo.length;
    if (m < 2) return out;
    const cum = [0]; for (let i = 1; i < m; i++) cum.push(cum[i - 1] + Math.hypot(bajo[i][0] - bajo[i - 1][0], bajo[i][1] - bajo[i - 1][1]));
    const tot = cum[m - 1] || 1;
    for (let j = 0; j < n; j++) {
      const f = (j + 1) / (n + 1), p0 = [lerp(cintura[0][0], cintura[1][0], f), lerp(cintura[0][1], cintura[1][1], f)], s = f * tot;
      let i = 1; while (i < m - 1 && cum[i] < s) i++;
      const a = bajo[i - 1], b = bajo[i], u = clamp((s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), 0, 1), p1 = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
      // verticales cerca del cinturón; el desplazamiento horizontal hacia el bajo se acumula hacia abajo (u^1.7), como cuelga la tela
      const pts = [0, 0.3, 0.62, 1].map(v => [lerp(p0[0], lerp(p0[0], p1[0], opc.abre == null ? 0.35 : opc.abre), Math.pow(v, 1.7)), lerp(p0[1], p1[1], v)]);
      out.push({ pts, ancho: (opc.ancho || 0.0055) * H, alfa: 0.6 * (opc.k == null ? 1 : opc.k) * (0.8 + 0.2 * (j % 2)) });
    }
    return out;
  } };
  R.pliegues = PL;

  // ---------------------------------------------------------------- dibujo común
  function formaPieza(ctx, pz, est, extra) {
    return P.forma(ctx, pz.path, Object.assign({ color: pz.color, campo: pz.campo, marco: pz.marco, nominal: pz.nominal, semilla: pz.semilla, volumen: 0.7, borde: 0.45, textura: 0.2, irregular: 0, luz: est.luz }, est.estilo || null, extra || null));
  }
  function conClip(ctx, path, fn) { ctx.save(); ctx.clip(path); fn(); ctx.restore(); }
  function trazos(ctx, lista, color, k) {
    const c = I.oscurece(color, 0.5);
    for (const s of lista) if (s.alfa * (k == null ? 1 : k) > 0.01) P.trazo(ctx, s.pts, { color: c, ancho: s.ancho, alfa: s.alfa * (k == null ? 1 : k) });
  }
  function linea(ctx, pts, css, ancho) {
    if (pts.length < 2) return;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = css; ctx.lineWidth = ancho;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); ctx.restore();
  }
  const semillaDe = (o, idx) => ((o.semilla == null ? 5 : o.semilla) * 100 + idx) | 0;
  // pieza simple a partir de un polígono (bandas, cuellos, parches): campo y marco por defecto
  function piezaPoly(poly, color, semilla, nominal, prof, dir) {
    const path = aPath(poly), cj = path._caja;
    return { path, caja: cj, campo: null, marco: marcoCaja(poly, dir || [0, 1]), nominal: nominal || [cj.w, cj.h], prof, color, semilla, poly };
  }

  // ---------------------------------------------------------------- dinámica: desfase del bajo (retraso y vuelo) con dinamica.cadena
  // anclasFn(J) -> [{raiz:[x,y], punto:[x,y]}, {...}]: raíz = cadera y punto de reposo del bajo de cada lado. Devuelve el desfase [dx,dy] de cada lado
  // = punta de la cadena de 2 segmentos menos su posición de reposo con el MISMO conductor interpolado (así en reposo vale exactamente 0).
  function desfaseBajo(t, o, J, H, anclasFn) {
    const din = o.historial; if (!din || t == null) return [[0, 0], [0, 0]];
    const id = 'ropa:' + (o.id || 'a'), Jm = D.memo(id, din), act = anclasFn(J), mu = 1 / 60, out = [], cache = new Map();
    const anc = tp => { let v = cache.get(tp); if (!v) { v = anclasFn(Jm(tp)); cache.set(tp, v); } return v; };
    const tt = D.alinear(t), s = tt / mu, k0 = Math.floor(s + 1e-9), f = s - k0, lim = 0.12 * H;
    for (let i = 0; i < 2; i++) {
      const L = Math.max(4, Math.hypot(act[i].punto[0] - act[i].raiz[0], act[i].punto[1] - act[i].raiz[1]) / 2);
      const cond = tp => { const a = anc(tp)[i]; return { p: a.raiz, ang: Math.atan2(a.punto[0] - a.raiz[0], a.punto[1] - a.raiz[1]) }; };
      const ch = D.cadena(t, cond, 2, { largoSeg: L, frec: o.frecBajo || 3.0, amort: o.amortBajo == null ? 0.45 : o.amortBajo, gravedad: 0, viento: o.viento });
      const c0 = cond(k0 * mu), c1 = cond((k0 + 1) * mu);
      const rx = lerp(c0.p[0], c1.p[0], f), ry = lerp(c0.p[1], c1.p[1], f), ra = lerp(c0.ang, c1.ang, f);
      const gan = o.ganBajo == null ? 0.6 : o.ganBajo;                       // ganancia artística del vuelo del bajo
      let dx = (ch[2][0] - (rx + Math.sin(ra) * 2 * L)) * gan, dy = (ch[2][1] - (ry + Math.cos(ra) * 2 * L)) * gan;
      const m = Math.hypot(dx, dy); if (m > lim) { dx *= lim / m; dy *= lim / m; }
      out.push([dx, dy]);
    }
    return out;
  }
  // punto del bajo a distancia d (px) de la cadera por la cadena muslo->pierna, en espacio de cuerpo (la regla de F1)
  function pCad(J, lado, d) {
    const c = J['cadera' + lado].p, r = J['rodilla' + lado].p, t = J['tobillo' + lado].p, l1 = G3.norma(G3.res(r, c));
    if (d <= l1) return G3.lerp3(c, r, d / l1);
    return G3.lerp3(r, t, Math.min(1, (d - l1) / (G3.norma(G3.res(t, r)) || 1)));
  }

  // ---------------------------------------------------------------- anillos y contornos de prendas con faldón
  // Un anillo es una función (a) -> [x,y,prof] del ángulo a de la sección (a=0 delante, +π/2 lado I).
  function ptSec(s, H, a) {                                // igual que Cuerpo.torso
    const co = Math.cos(a), sn = Math.sin(a), l = G3.rotY(G3.rotX([s.ext * H * sn, 0, (co >= 0 ? s.del : s.det) * H * co], s.pitch), s.yaw);
    return [s.c[0] + l[0], s.c[1] + l[1], s.c[2] + l[2]];
  }
  const anillosTorso = (S, H) => S.slice().reverse().map(s => a => ptSec(s, H, a));       // del cuello a la base
  function contorno(anillos, H, N = 16) {
    const cen0 = rg => { const q = [rg(0), rg(Math.PI / 2), rg(Math.PI), rg(-Math.PI / 2)]; return [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4]; };
    const ct = cen0(anillos[0]), cb = cen0(anillos[anillos.length - 1]), u = unit2(ct[0] - cb[0], ct[1] - cb[1], 0, -0.08 * H), n = [-u[1], u[0]];
    const der = [], izq = [], cen = []; let ult = null;
    for (const rg of anillos) {
      let amax = -1e9, amin = 1e9, pmax = null, pmin = null, cx = 0, cy = 0; const pts = [];
      for (let j = 0; j < N; j++) {
        const p = rg(j / N * DOSPI), q = p[0] * n[0] + p[1] * n[1]; pts.push(p); cx += p[0]; cy += p[1];
        if (q > amax) { amax = q; pmax = p; } if (q < amin) { amin = q; pmin = p; }
      }
      der.push([pmax[0], pmax[1]]); izq.push([pmin[0], pmin[1]]);
      const c = [cx / N, cy / N]; cen.push({ c, a: c[0] * n[0] + c[1] * n[1], amax, amin }); ult = { pts, amax, amin };
    }
    // borde inferior: envolvente inferior del último anillo (polilínea cerrada de sus muestras) en 5 posiciones laterales, de derecha a izquierda.
    // Es continua en los parámetros del anillo (no elige "la muestra más baja", que saltaría de una muestra a otra).
    const bajo = [], N2 = ult.pts.length;
    for (const f of [0.88, 0.7, 0.5, 0.3, 0.12]) {
      const q0 = ult.amin + f * (ult.amax - ult.amin); let yb = -1e9, xb = 0;
      for (let i = 0; i < N2; i++) {
        const p1 = ult.pts[i], p2 = ult.pts[(i + 1) % N2], qa = p1[0] * n[0] + p1[1] * n[1], qb = p2[0] * n[0] + p2[1] * n[1];
        if ((qa - q0) * (qb - q0) <= 0 && qa !== qb) { const k = (q0 - qa) / (qb - qa), yy = p1[1] + (p2[1] - p1[1]) * k; if (yy > yb) { yb = yy; xb = p1[0] + (p2[0] - p1[0]) * k; } }
      }
      if (yb > -1e8) bajo.push([xb, yb]);
    }
    const poly = G3.orientar(suaveSub(limpiar(der.concat(bajo, izq.slice().reverse())), 4), true);
    return { poly, path: aPath(poly), cen, u, n, bajo };
  }
  function campoDe(ct, luz) {
    return P.campos.seccion(ct.cen.map(c => c.c), ct.cen.map(c => c.a - c.amin), ct.cen.map(c => c.amax - c.a), luz);
  }
  // Faldón: anillos desde la base (fn) hasta el bajo (fn) con K pasos; el desfase del bajo pesa e^1.3 (la cintura no se mueve)
  function anillosFaldon(base, bajoFn, off, K, bump) {
    const out = [];
    for (let k = 1; k <= K; k++) {
      const e = k / K, w = Math.pow(e, 1.3), pb = bump ? Math.exp(-Math.pow((e - 0.25) / 0.4, 2)) : 0;
      out.push(a => {
        const p = G3.lerp3(base(a), bajoFn(a), e), d = off(a);
        if (pb) { const v = bump(a); return [p[0] + d[0] * w + v[0] * pb, p[1] + d[1] * w + v[1] * pb, p[2] + v[2] * pb]; }   // abultamiento de caderas: tapa las tapas de los muslos
        return [p[0] + d[0] * w, p[1] + d[1] * w, p[2]];
      });
    }
    return out;
  }
  // vector de abultamiento lateral/frontal en mundo para un ángulo a de la sección (amp en px)
  const bumpDe = (yaw, amp) => a => G3.rotY([Math.sin(a) * amp, 0, Math.cos(a) * amp * 0.35], yaw);
  // desfase del bajo en función del ángulo: mezcla lateral de los dos lados y algo más de vuelo delante y detrás
  const offDe = d => a => { const k = (Math.sin(a) + 1) / 2, f = 1 + 0.35 * Math.abs(Math.cos(a)); return [lerp(d[0][0], d[1][0], k) * f, lerp(d[0][1], d[1][1], k) * f]; };
  const nzFrente = J => J.marcos.pecho.dirAMundo([0, 0, 1])[2];

  // curva sobre la superficie delantera: puntos (lateral fraccionario f respecto a ext) de una lista de anillos
  const aF = f => Math.asin(clamp(f, -0.98, 0.98));
  function lineaFrontal(anillos, f = 0) { return anillos.map(rg => { const p = rg(aF(f)); return [p[0], p[1], p[2]]; }); }
  // interpolación entre anillos por índice real d (0 = primero)
  function enProf(anillos, d, a) { const i = clamp(Math.floor(d), 0, anillos.length - 2), k = clamp(d - i, 0, 1); return G3.lerp3(anillos[i](a), anillos[i + 1](a), k); }

  // anillo alrededor del cuello (bufanda, cuellos): casco de dos anillos a fracciones f0 y f1 del largo del cuello (en mundo)
  function ejesCuello(J) {
    const A = pos(J.cuello), B = pos(J.cabezaBase), v = G3.unit(G3.res(B, A)), L = G3.norma(G3.res(B, A));
    let r = G3.res(J.marcos.pecho.dirAMundo([0, 0, 1]), G3.esc(v, G3.punto(J.marcos.pecho.dirAMundo([0, 0, 1]), v)));
    r = G3.norma(r) < 1e-6 ? [0, 0, 1] : G3.unit(r);
    return { A, v, L, r, e: G3.cruz(v, r) };
  }
  function nubeCuello(J, H, f0, f1, rx, rz, kk) {
    const ej = ejesCuello(J), pts = [];
    for (const f of [f0, f1]) for (let j = 0; j < 12; j++) {
      const a = j / 12 * DOSPI, c = G3.sum(ej.A, G3.esc(ej.v, f * ej.L));
      pts.push(G3.sum(c, G3.sum(G3.esc(ej.r, Math.cos(a) * rz * H * kk), G3.esc(ej.e, Math.sin(a) * rx * H * kk))));
    }
    return { pts, ej };
  }
  function cuelloPieza(J, H, color, semilla, f0, f1, rx, rz, kk, oscuro) {
    const n = nubeCuello(J, H, f0, f1, rx, rz, kk), poly = casco(n.pts, 3);
    return piezaPoly(poly, oscuro ? I.oscurece(color, oscuro) : color, semilla, [2 * rx * H * kk, (f1 - f0) * n.ej.L + 0.02 * H], J.cuello.prof, [0, 1]);
  }

  // yugo: rellena la caída del hombro entre el cuello y la tapa redonda de cada manga (casco del anillo del cuello, el de los hombros y la tapa del brazo)
  function yugos(J, H, torsoR, kk, hol) {
    const out = [], r = (0.038 * kk + hol) * H;
    for (const lado of ['D', 'I']) {
      const h = J['hombro' + lado], pts = [];
      for (let j = 0; j < 16; j++) { const a = j / 16 * DOSPI; pts.push([h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, h.prof]); }
      for (const rg of [torsoR[0], torsoR[2]]) for (let j = 0; j < 16; j++) pts.push(rg(j / 16 * DOSPI));
      out.push(casco(pts, 3));
    }
    return out;
  }
  // ---------------------------------------------------------------- mangas y perneras (miembros vestidos)
  function miembroVestido(J, lado, tipo, H, o, hol, hasta, color, idBase, idx, rangoDel, rangoDetras) {
    const mi = C.miembro(J, lado, tipo, H, { holgura: hol, hasta, complexion: o.complexion, perfil: o.perfil, luz: o.luz, tapaFin: false });
    const ptorso = (J.pelvis.prof + J.hombros.prof) / 2, parte = tipo + lado;
    const raiz = J[(tipo === 'brazo' ? 'hombro' : 'cadera') + lado].prof, cerca = raiz >= ptorso;
    const rango = tipo === 'brazo' ? (cerca ? C.RANGO.brazoCerca : C.RANGO.brazoLejos) + rangoDel : (cerca ? C.RANGO.piernaCerca : C.RANGO.piernaLejos) + rangoDel;
    const claves = tipo === 'brazo' ? ['hombro', 'codo', 'mano'] : ['cadera', 'rodilla', 'tobillo'];
    const A = J[claves[0] + lado], B = J[claves[1] + lado], E = J[claves[2] + lado];
    const flex = flexion3(A, B, E), ua = G3.unit(G3.res(pos(A), pos(B))), ub = G3.unit(G3.res(pos(E), pos(B)));
    const bis = G3.unit(G3.sum(ua, ub)), l2 = Math.hypot(bis[0], bis[1]);
    const art = { c: [B.x, B.y], interior: l2 > 1e-3 ? [bis[0] / l2, bis[1] / l2] : [0, 1], vis: sm(l2, 0.0, 0.3) * sm(bis[2], -0.35, 0.05), rad: (mi.segmentos[0].radios[1] + mi.segmentos[1].radios[0]) / 2 };
    const plie = PL.compresion(art, flex, H);
    // extremo: puño de la manga (elipse proyectada, oscurece 0.12) o bajo de la pernera (línea)
    const sg = mi.segmentos[1], an = sg.anillos[sg.anillos.length - 1], dirW = G3.unit(G3.res(sg.ejes[1], sg.ejes[0]));
    let puno = null, bajoLinea = null;
    if (tipo === 'brazo') {
      const nube = [];
      for (const d of [0, -0.034 * H]) for (const p of an.pts) { const q = G3.sum(G3.sum(an.c, G3.esc(G3.res(p, an.c), 1.07)), G3.esc(dirW, d)); nube.push(q); }
      puno = piezaPoly(casco(nube, 3), I.oscurece(color, 0.12), idBase * 100 + 50 + idx, [2 * sg.radios[1] * 1.1, 0.04 * H], an.c[2], [dirW[0], dirW[1]]);
    } else {
      const pm = an.pts.reduce((s, q) => s + q[2], 0) / an.pts.length, cerc = an.pts.filter(q => q[2] >= pm).sort((p, q) => p[0] - q[0]);
      bajoLinea = cerc.map(q => [q[0], q[1]]);
    }
    const mk = (pz, sufijo) => ({ id: (tipo === 'brazo' ? 'manga' : 'pernera') + lado + sufijo, parte, prof: pz.prof, rango, capa: 0, pieza: Object.assign({}, pz, { color, semilla: idBase * 100 + idx }), cubre: [parte] });
    const l0 = mi.profs[0] >= ptorso, l1 = mi.profs[1] >= ptorso, items = [];
    const dibujarUnidad = (ctx, est, it, conPlie, conFin) => {
      formaPieza(ctx, it.pieza, est);
      if (conPlie) conClip(ctx, it.pieza.path, () => trazos(ctx, plie, color));
      if (conFin) conFin(ctx, est, it);
    };
    const fin = (ctx, est, it) => {
      if (puno) formaPieza(ctx, puno, est, { volumen: 0.5, borde: 0.3, pintura: false });
      if (bajoLinea) conClip(ctx, it.pieza.path, () => linea(ctx, bajoLinea, I.css(I.oscurece(color, 0.45), 0.55), 1.4));
    };
    const extraDib = o.extraMiembro;                      // enganche para pliegues de tensión (pernera: entrepierna)
    if (l0 === l1) {
      const it = mk(mi, '');
      it.dibujar = (ctx, est) => { dibujarUnidad(ctx, est || {}, it, true, fin); if (extraDib) conClip(ctx, it.pieza.path, () => extraDib(ctx, color)); };
      it.info = { flexion: flex, pliegues: plie, art, anillos: mi.segmentos[0].anillos };
      items.push(it);
    } else {
      mi.segmentos.forEach((sgm, i) => {
        const it = mk(sgm, '#' + i); it.prof = sgm.prof;
        it.dibujar = (ctx, est) => { dibujarUnidad(ctx, est || {}, it, i === 1, i === 1 ? fin : null); if (i === 1 && extraDib) conClip(ctx, it.pieza.path, () => extraDib(ctx, color)); };
        it.info = { flexion: flex, pliegues: i === 1 ? plie : [], art, anillos: mi.segmentos[0].anillos };
        items.push(it);
      });
    }
    return items;
  }
  R.manga = function (J, lado, H, o = {}) {
    const mat = o.material || 'abrigo', hol = o.holgura != null ? o.holgura : HOL.manga[mat];
    return miembroVestido(J, lado, 'brazo', H, o, hol, o.hasta == null ? 0.92 : o.hasta, o.color || '#c89a4a', 1 + (mat === 'abrigo' ? 0 : mat === 'jersey' ? 1 : 2), lado === 'D' ? 0 : 1, 0.1);
  };
  R.pernera = function (J, lado, H, o = {}) {
    const hol = o.holgura != null ? o.holgura : HOL.pernera, mod = o.zapatos && o.zapatos.modelo, mete = mod === 'bota' || mod === 'botin';
    // entrepierna: tensión cuando los muslos se abren más de 0.5 rad (paso largo)
    const vD = G3.unit(G3.res(J.rodillaD.p, J.caderaD.p)), vI = G3.unit(G3.res(J.rodillaI.p, J.caderaI.p)), abre = Math.acos(clamp(G3.punto(vD, vI), -1, 1));
    const crotch = J.marcoCuerpo.aMundo([0, 0.045 * H, 0]), cad = pos(J['cadera' + lado]), rod = pos(J['rodilla' + lado]);
    const hacia = [lerp(cad[0], rod[0], 0.5), lerp(cad[1], rod[1], 0.5)], kT = sm(abre, 0.5, 0.8);
    const tens = PL.tension([crotch[0], crotch[1]], hacia, 2, { H, k: kT });
    const o2 = Object.assign({}, o, { extraMiembro: (ctx, color) => trazos(ctx, tens, color) });
    return miembroVestido(J, lado, 'pierna', H, o2, hol, 0.97, o.color || '#23262f', 4, lado === 'D' ? 0 : 1, mete ? 0.2 : 0.7);
  };

  // Cadera del pantalón: casco de la cintura y de los arranques de ambos muslos (con la holgura de la pernera). Tapa las tapas redondas de los
  // muslos que en WP6a asoman como de maniquí; va después de las perneras y antes del jersey/abrigo, que cubren la cintura.
  function caderaPantalon(J, H, o, spec, piernas) {
    const color = colorDe(spec, '#23262f'), T = C.torso(J, H, { holgura: HOL.pernera, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), rCin = ptSecF(T.secciones[3], H), pts = [];
    for (let j = 0; j < 16; j++) pts.push(rCin(j / 16 * DOSPI));
    for (const it of piernas) { const an = it.info.anillos; for (const k of [0, 1]) for (const q of an[k].pts) pts.push(q); }
    const poly = casco(pts, 3), pz = piezaPoly(poly, color, 4 * 100 + 9, [0.3 * H * kc(o), 0.14 * H], T.prof, [0, 1]);
    return [{ id: 'caderaPantalon', parte: 'cadera', prof: T.prof, rango: 3.0, capa: 1, pieza: pz, cubre: [], dibujar: (ctx, est) => { est = est || {}; formaPieza(ctx, pz, est, { volumen: 0.6, borde: 0 }); } }];
  }
  const ptSecF = (s, H) => a => ptSec(s, H, a);

  // ---------------------------------------------------------------- torso vestido: jersey, camisa
  function torsoSimple(J, H, o, spec, tipo) {
    const hol = HOL[tipo], color = colorDe(spec, tipo === 'jersey' ? '#8a6a52' : '#d9d2c3'), idb = tipo === 'jersey' ? 6 : 7;
    const T = C.torso(J, H, { holgura: hol, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), S = T.secciones, rings = anillosTorso(S, H);
    // el jersey y la camisa bajan hasta cubrir las caderas: un anillo más con abultamiento lateral (las tapas de los muslos de WP6a son más anchas que la pelvis)
    const base0 = rings[rings.length - 1], bump = bumpDe(J.marcos.pelvis.yaw, 0.045 * kc(o) * H), hemJ = a => { const p = base0(a), v = bump(a); return [p[0] + v[0], p[1] + 0.05 * H, p[2] + v[2]]; };
    // A-line suave desde la cintura (anillos 6..10 de torsoR): el factor sube de 0 a 0.8 y el anillo de cadera llega a 1
    const ringsH = rings.map((rg, i) => i < 6 ? rg : a => { const p = rg(a), v = bump(a), f = (i - 6) / 5; return [p[0] + v[0] * f, p[1], p[2] + v[2] * f]; }).concat([hemJ]);
    const ct = contorno(ringsH, H), yg = yugos(J, H, rings, kc(o), hol), upath = P.union([ct.poly].concat(yg));
    const pz = Object.assign({}, T, { path: upath, caja: upath._caja, campo: campoDe(ct, o.luz), marco: marcoCaja(ct.poly, [-ct.u[0], -ct.u[1]]), poly: ct.poly, color, semilla: idb * 100 });
    const cuello = spec.cuello || (tipo === 'jersey' ? 'redondo' : 'camisa'), piel = o.piel || '#e6b48f';
    // escote: curva sobre la superficie delantera; el interior se rellena con piel (solo si el frente mira a cámara)
    const nz = nzFrente(J), esc = [];
    if (cuello === 'redondo' || cuello === 'pico') {
      const dmax = cuello === 'pico' ? 3.4 : 1.15, prof = f => cuello === 'pico' ? dmax * (1 - Math.abs(f)) : dmax * Math.pow(1 - f * f, 0.8);
      for (let f = -1; f <= 1.001; f += 0.25) esc.push(enProf(rings, prof(f), aF(f * 0.72)));
    }
    const hemBanda = tipo === 'jersey' ? contorno([a => { const p = hemJ(a); return [p[0], p[1] - 0.024 * H, p[2]]; }, hemJ], H) : null;
    const it = { id: tipo, parte: 'torso', prof: T.prof, rango: 3.1, capa: 1, pieza: pz, cubre: ['torso'], info: { secciones: S } };
    it.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, pz, est);
      conClip(ctx, pz.path, () => {
        if (hemBanda) P.forma(ctx, hemBanda.path, { color: I.oscurece(color, 0.1), volumen: 0.4, borde: 0.2, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 1 });
        if (esc.length && nz > 0.04) {
          const top = [];
          for (let f = 1; f >= -1.001; f -= 0.25) top.push(rings[0](aF(f * 0.72)));
          const poly = G3.orientar(esc.concat(top).map(p => [p[0], p[1]]), true);
          P.forma(ctx, aPath(poly), { color: piel, volumen: 0.3, borde: 0.1, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 2 });
          linea(ctx, esc, I.css(I.oscurece(color, 0.5), 0.6 * sm(nz, 0.04, 0.3)), 1.5);
        }
        if (tipo === 'camisa') {                          // tapeta y botones
          const l = lineaFrontal(rings, 0), vf = sm(nz, 0.02, 0.25);
          if (vf > 0.01) { linea(ctx, l, I.css(I.oscurece(color, 0.4), 0.5 * vf), 1.2); ctx.fillStyle = I.css(I.oscurece(color, 0.55), 0.8 * vf); for (let k = 0; k < 5; k++) { const p = enProf(rings, 1.5 + k * 1.7, 0); ctx.beginPath(); ctx.arc(p[0], p[1], 0.0045 * H, 0, 7); ctx.fill(); } }
        }
      });
    };
    const items = [it];
    if (cuello === 'alto') {                              // cuello vuelto: anillo alrededor del cuello, sobre la piel del cuello
      const cp = cuelloPieza(J, H, color, idb * 100 + 3, 0.0, 0.62, 0.044, 0.046, kc(o), 0.04);
      items.push({ id: tipo + 'Cuello', parte: 'cuello', prof: J.cuello.prof, rango: 3.15, capa: 1, pieza: cp, cubre: [], dibujar: (ctx, est) => { est = est || {}; formaPieza(ctx, cp, est, { volumen: 0.6 }); conClip(ctx, cp.path, () => { const ej = ejesCuello(J); for (let i = 1; i < 4; i++) { const pts = []; for (let j = 0; j <= 8; j++) { const a = Math.PI * (j / 8 - 0.5), c = G3.sum(ej.A, G3.esc(ej.v, ej.L * (0.1 + i * 0.14))); const q = G3.sum(c, G3.sum(G3.esc(ej.r, Math.cos(a) * 0.046 * H * kc(o)), G3.esc(ej.e, Math.sin(a) * 0.044 * H * kc(o)))); pts.push([q[0], q[1]]); } linea(ctx, pts, I.css(I.oscurece(color, 0.4), 0.4), 1.2); } }); } });
    } else if (tipo === 'camisa' && cuello === 'camisa') {
      const cp = cuelloPieza(J, H, color, idb * 100 + 3, -0.1, 0.34, 0.040, 0.043, kc(o), 0.0);
      items.push({ id: 'camisaCuello', parte: 'cuello', prof: J.cuello.prof, rango: 3.15, capa: 1, pieza: cp, cubre: [], dibujar: (ctx, est) => formaPieza(ctx, cp, est || {}, { volumen: 0.5 }) });
    }
    return items;
  }

  // ---------------------------------------------------------------- abrigo (§5.6): torso con holgura + faldón que cuelga de las cadenas muslo->pierna
  function abrigo(J, H, o, spec, t) {
    const hol = spec.holgura == null ? HOL.abrigo : spec.holgura, color = colorDe(spec, '#c89a4a'), kk = kc(o), M = J.marcoCuerpo;
    const T = C.torso(J, H, { holgura: hol, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), S = T.secciones;
    const bumpT = bumpDe(J.marcos.pelvis.yaw, 0.065 * kk * H);       // A-line desde la cintura hasta la base: cubre las tapas de los muslos
    const torsoR = anillosTorso(S, H).map((rg, i) => i < 6 ? rg : a => { const p = rg(a), v = bumpT(a), f = (i - 6) / 5; return [p[0] + v[0] * f, p[1], p[2] + v[2] * f]; }), base = torsoR[torsoR.length - 1];
    const largo = (spec.largo == null ? 0.62 : spec.largo) * 0.45 * H, hD = pCad(J, 'D', largo), hI = pCad(J, 'I', largo);
    const m = [(hD[0] + hI[0]) / 2, (hD[1] + hI[1]) / 2, (hD[2] + hI[2]) / 2], dz = Math.abs(hD[2] - hI[2]) / 2;
    const ext = Math.abs(hD[0] - hI[0]) / 2 + (0.06 * kk + hol + (spec.vuelo == null ? 0.025 : spec.vuelo)) * H, del = dz + (0.055 * kk + hol + (spec.vuelo == null ? 0.025 : spec.vuelo) * 1.6) * H;
    const bajoFn = a => { const co = Math.cos(a), sn = Math.sin(a); return M.aMundo([m[0] + ext * sn, lerp(hD[1], hI[1], (sn + 1) / 2) + 0.012 * H, m[2] + del * co]); };
    const anclas = Jx => { const Mx = Jx.marcoCuerpo, r = [];
      for (const lado of ['D', 'I']) { const c = Jx['cadera' + lado], p = Mx.aMundo(pCad(Jx, lado, largo)); r.push({ raiz: [c.x, c.y], punto: [p[0], p[1] + 0.012 * H] }); }
      return r; };
    const off = offDe(desfaseBajo(t, o, J, H, anclas));
    const K = 4, skirt = anillosFaldon(base, bajoFn, off, K, bumpDe(J.marcos.pelvis.yaw, 0.03 * kk * H)), todos = torsoR.concat(skirt);
    const ct = contorno(todos, H), nTor = torsoR.length;
    // frente abierto: el recorte deja ver el jersey (pieza anterior) y las piernas
    const nz = nzFrente(J), abierto = !!spec.abierto, yg = yugos(J, H, torsoR, kk, hol);
    let path = ct.path;
    if (abierto && nz > 0.03) {
      const fa = i => lerp(0.12, 0.42, Math.min(1, i / (nTor - 1) * 1.3)), izq = [], der = [];
      todos.forEach((rg, i) => { const p = rg(aF(-fa(i))), q = rg(aF(fa(i))); der.push([p[0], p[1]]); izq.push([q[0], q[1]]); });
      const hole = G3.orientar(der.concat(izq.reverse()), false);
      path = P.union([ct.poly].concat(yg)); path.moveTo(hole[0][0], hole[0][1]); for (let i = 1; i < hole.length; i++) path.lineTo(hole[i][0], hole[i][1]); path.closePath();
    } else { path = P.union([ct.poly].concat(yg)); }
    const nominal = [2 * 0.16 * H * kk, (J.prop.columna + J.prop.pecho + 0.03) * H + largo], poly = ct.poly;
    const pz = { path, caja: path._caja, campo: campoDe(ct, o.luz), marco: marcoCaja(poly, [-ct.u[0], -ct.u[1]]), nominal, prof: T.prof, color, semilla: 8 * 100, poly };
    // cinturón: banda en la sección de la cintura (rings torso: índice 5 = S[5] entre cintura y pecho... se toma la cintura S[4] -> torsoR[6])
    const rCin = torsoR[6];
    const cinturonPoly = spec.cinturon ? contorno([-0.009, 0.009].map(dy => a => { const p = rCin(a); return [p[0], p[1] + dy * H, p[2]]; }), H).poly : null;
    // pliegues de caída desde el cinturón al bajo (se mueven con la cadena)
    const cinPts = [rCin(-Math.PI / 2), rCin(Math.PI / 2)].sort((a, b) => a[0] - b[0]), bajoPl = ct.bajo.slice().sort((a, b) => a[0] - b[0]);
    const caida = PL.caida(cinPts, bajoPl.length > 1 ? bajoPl : [[cinPts[0][0], cinPts[0][1] + largo], [cinPts[1][0], cinPts[1][1] + largo]], 3, { H, k: nz > 0 ? 1 : 0.7 });
    // axila: tensión cuando el brazo se abre más de 0.5 rad
    const axilas = [];
    for (const lado of ['D', 'I']) {
      const s = lado === 'I' ? 1 : -1, v = G3.unit(G3.res(J['codo' + lado].p, J['hombro' + lado].p)), beta = Math.asin(clamp(s * v[0], -1, 1)), k = sm(beta, 0.5, 0.8);
      if (k > 0) { const h = J['hombro' + lado], c = G3.lerp3(pos(J.cintura), pos(J.hombros), 0.55); axilas.push(...PL.tension([h.x, h.y + 0.03 * H], [c[0], c[1]], 2, { H, k })); }
    }
    const solapa = spec.cuello === 'solapa', alto = spec.cuello === 'alto', botones = spec.botones == null ? 2 : spec.botones;
    const colCuello = alto ? cuelloPieza(J, H, color, 8 * 100 + 5, 0.0, 0.8, 0.052, 0.054, kk, 0.08) : solapa ? cuelloPieza(J, H, color, 8 * 100 + 5, -0.05, 0.42, 0.058, 0.058, kk, 0.08) : null;
    const it = { id: 'abrigo', parte: 'torso', prof: T.prof, rango: RANGO_FALDON, capa: 1, pieza: pz, cubre: ['torso'], info: { bajo: ct.bajo, poly: ct.poly, caida, offsets: off(0), anillos: todos, contorno: ct, abierto: abierto && nz > 0.03 } };
    it.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, pz, est, { volumen: 0.8, borde: 0.8, anchoBorde: 6, textura: 0.3 });
      conClip(ctx, pz.path, () => {
        if (cinturonPoly) P.forma(ctx, aPath(cinturonPoly), { color: I.oscurece(color, 0.25), volumen: 0.5, borde: 0.2, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 1 });
        trazos(ctx, caida, color); trazos(ctx, axilas, color);
        const vf = sm(nz, 0.02, 0.25);
        if (!abierto && vf > 0.01) {
          const l = lineaFrontal(todos.slice(0, nTor + 2), 0);
          linea(ctx, l, I.css(I.oscurece(color, 0.5), 0.6 * vf), 1.4);
          ctx.fillStyle = I.css(I.oscurece(color, 0.55), 0.85 * vf);
          for (let k = 0; k < botones; k++) { const p = enProf(torsoR, 3.0 + k * 1.6, 0); ctx.beginPath(); ctx.arc(p[0], p[1], 0.0055 * H, 0, 7); ctx.fill(); }
        }
        if (abierto && nz > 0.03) {           // borde del frente abierto
          const e1 = [], e2 = []; todos.forEach((rg, i) => { const f = lerp(0.12, 0.42, Math.min(1, i / (nTor - 1) * 1.3)), p = rg(aF(-f)), q = rg(aF(f)); e1.push([p[0], p[1]]); e2.push([q[0], q[1]]); });
          const c = I.css(I.oscurece(color, 0.55), 0.75 * sm(nz, 0.03, 0.2)); linea(ctx, e1, c, 1.6); linea(ctx, e2, c, 1.6);
        }
        if (solapa && nz > 0.02) {            // solapas: triángulos sobre el pecho
          for (const sg of [-1, 1]) {
            const tri = [enProf(torsoR, 0.0, aF(sg * 0.2)), enProf(torsoR, 1.0, aF(sg * 0.62)), enProf(torsoR, 4.2, aF(sg * 0.2 + (abierto ? sg * 0.16 : 0))), enProf(torsoR, 2.2, aF(sg * 0.14))].map(p => [p[0], p[1]]);
            P.forma(ctx, aPath(G3.orientar(tri, true)), { color: I.oscurece(color, 0.1), volumen: 0.5, borde: 0.3, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 6 + (sg > 0 ? 1 : 0) });
          }
        }
      });
      if (colCuello) formaPieza(ctx, colCuello, est, { volumen: 0.6, borde: 0.5 });
    };
    return [it];
  }

  // ---------------------------------------------------------------- falda (§5.6): sección cónica desde la cintura; `vuelo` abre el bajo
  function falda(J, H, o, spec, t) {
    const hol = HOL.falda, color = colorDe(spec, '#7a3b3b'), kk = kc(o), M = J.marcoCuerpo, vuelo = spec.vuelo == null ? 0.08 : spec.vuelo, largo = (spec.largo == null ? 0.30 : spec.largo) * H;
    const T = C.torso(J, H, { holgura: hol, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), S = T.secciones, sc = S[4], cin = J.cintura.p;
    const base = a => ptSec(sc, H, a), hc = [cin[0], cin[1] + largo, cin[2]], eH = sc.ext * H + vuelo * H, dH = sc.del * H + vuelo * 0.8 * H, tH = sc.det * H + vuelo * 0.8 * H;
    const bajoFn = a => { const co = Math.cos(a), sn = Math.sin(a); return M.aMundo([hc[0] + eH * sn, hc[1], hc[2] + (co >= 0 ? dH : tH) * co]); };
    const anclas = Jx => { const Mx = Jx.marcoCuerpo, c0 = Jx.cintura.p, h0 = [c0[0], c0[1] + largo, c0[2]], r = [];
      for (const lado of ['D', 'I']) { const c = Jx['cadera' + lado], p = Mx.aMundo([h0[0] + (lado === 'I' ? eH : -eH), h0[1], h0[2]]); r.push({ raiz: [c.x, c.y], punto: [p[0], p[1]] }); }
      return r; };
    const off = offDe(desfaseBajo(t, o, J, H, anclas)), skirt = anillosFaldon(base, bajoFn, off, 4, bumpDe(J.marcos.pelvis.yaw, 0.03 * kk * H)), anillos = [base].concat(skirt);
    const ct = contorno(anillos, H), nz = nzFrente(J);
    const nominal = [2 * (sc.ext + vuelo) * H, largo + 0.03 * H], path = P.union([ct.poly]);
    const pz = { path, caja: path._caja, campo: campoDe(ct, o.luz), marco: marcoCaja(ct.poly, [-ct.u[0], -ct.u[1]]), nominal, prof: T.prof, color, semilla: 9 * 100, poly: ct.poly };
    const cinPts = [base(-Math.PI / 2), base(Math.PI / 2)].sort((a, b) => a[0] - b[0]), bajoPl = ct.bajo.slice().sort((a, b) => a[0] - b[0]);
    const caida = PL.caida(cinPts, bajoPl.length > 1 ? bajoPl : [[cinPts[0][0], cinPts[0][1] + largo], [cinPts[1][0], cinPts[1][1] + largo]], 4, { H });
    const banda = contorno([a => { const p = ptSec(sc, H, a); return [p[0], p[1] - 0.012 * H, p[2]]; }, a => { const p = ptSec(sc, H, a); return [p[0], p[1] + 0.014 * H, p[2]]; }], H);
    const it = { id: 'falda', parte: 'falda', prof: T.prof, rango: RANGO_FALDON + 0.05, capa: 1, pieza: pz, cubre: [], info: { bajo: ct.bajo, caida, offsets: off(0), contorno: ct } };
    it.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, pz, est, { volumen: 0.75, borde: 0.6, textura: 0.3 });
      conClip(ctx, pz.path, () => { trazos(ctx, caida, color); P.forma(ctx, banda.path, { color: I.oscurece(color, 0.15), volumen: 0.5, borde: 0.2, pintura: false, irregular: 0, luz: est.luz, semilla: pz.semilla + 1 }); });
    };
    return [it];
  }

  // ---------------------------------------------------------------- delantal: peto y falda corta sobre la superficie delantera (solo si el frente mira a cámara)
  function delantal(J, H, o, spec, t) {
    const hol = HOL.delantal, color = colorDe(spec, '#e8e2d6'), kk = kc(o), M = J.marcoCuerpo, largo = (spec.largo == null ? 0.30 : spec.largo) * H;
    const T = C.torso(J, H, { holgura: hol, complexion: o.complexion, perfil: o.perfil, luz: o.luz }), S = T.secciones, nz = nzFrente(J);
    const torsoR = anillosTorso(S, H).slice(4), base = torsoR[torsoR.length - 1], cin = J.cintura.p, sc = S[2];
    const hc = [cin[0], cin[1] + largo, cin[2]], eH = sc.ext * H + 0.05 * H, dH = sc.del * H + 0.035 * H;
    const bajoFn = a => { const co = Math.cos(a), sn = Math.sin(a); return M.aMundo([hc[0] + eH * sn, hc[1], hc[2] + dH * Math.max(co, 0.2)]); };
    const anclas = Jx => { const Mx = Jx.marcoCuerpo, c0 = Jx.cintura.p, r = [];
      for (const lado of ['D', 'I']) { const c = Jx['cadera' + lado], p = Mx.aMundo([c0[0] + (lado === 'I' ? eH : -eH), c0[1] + largo, c0[2]]); r.push({ raiz: [c.x, c.y], punto: [p[0], p[1]] }); }
      return r; };
    const off = offDe(desfaseBajo(t, o, J, H, anclas)), anillos = torsoR.concat(anillosFaldon(base, bajoFn, off, 3));
    const nA = anillos.length, fw = i => lerp(0.46, 0.66, Math.min(1, i / (torsoR.length - 1)));
    const items = [];
    if (nz < 0.02) return items;
    const izq = [], der = [];
    anillos.forEach((rg, i) => { const p = rg(aF(-fw(i))), q = rg(aF(fw(i))); der.push([p[0], p[1]]); izq.push([q[0], q[1]]); });
    const poly = G3.orientar(suaveSub(limpiar(der.concat(izq.reverse())), 3), true), path = aPath(poly);
    const pz = { path, caja: path._caja, campo: null, marco: marcoCaja(poly, [0, 1]), nominal: [2 * 0.66 * 0.1 * H * kk, largo + 0.12 * H], prof: T.prof + 1, color, semilla: 10 * 100, poly };
    const tirantes = [-1, 1].map(sg => [anillos[0](aF(sg * fw(0))), anillos[0](aF(sg * 0.9))].map(p => [p[0], p[1]]));
    const it = { id: 'delantal', parte: 'delantal', prof: T.prof, rango: RANGO_FALDON + 0.08, capa: 1, pieza: pz, cubre: [], info: { poly } };
    it.dibujar = (ctx, est) => {
      est = est || {}; ctx.save(); ctx.globalAlpha *= sm(nz, 0.02, 0.12);
      for (const tr of tirantes) linea(ctx, tr, I.css(I.oscurece(color, 0.25), 0.9), 0.012 * H);
      formaPieza(ctx, pz, est, { volumen: 0.5, borde: 0.4, textura: 0.25 });
      conClip(ctx, pz.path, () => {
        const cinP = [anillos[2](aF(-fw(2))), anillos[2](aF(fw(2)))];
        linea(ctx, cinP.map(p => [p[0], p[1]]), I.css(I.oscurece(color, 0.5), 0.5), 1.3);          // cinta de la cintura
        const bol = [enProf(anillos, torsoR.length + 0.4, aF(0.42)), enProf(anillos, torsoR.length + 1.6, aF(0.4)), enProf(anillos, torsoR.length + 1.6, aF(-0.4)), enProf(anillos, torsoR.length + 0.4, aF(-0.42))].map(p => [p[0], p[1]]);
        linea(ctx, bol, I.css(I.oscurece(color, 0.5), 0.55), 1.3);                                    // bolsillo
      });
      ctx.restore();
    };
    items.push(it); return items;
  }

  // ---------------------------------------------------------------- bufanda: vuelta (anillo del cuello con holgura) + cola (dinamica.cadena)
  function bufanda(J, H, o, spec, t) {
    const color = colorDe(spec, '#b23a3a'), kk = kc(o), items = [], ptorso = (J.pelvis.prof + J.hombros.prof) / 2;
    const vuelta = cuelloPieza(J, H, color, 11 * 100, 0.0, 0.7, 0.056, 0.058, kk, 0);
    const itV = { id: 'bufandaVuelta', parte: 'cuello', prof: J.cuello.prof, rango: 3.5, capa: 2, pieza: vuelta, cubre: [] };
    itV.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, vuelta, est, { volumen: 0.75, borde: 0.8, textura: 0.4 });
      conClip(ctx, vuelta.path, () => {                    // pliegues de lana: arcos del anillo
        const ej = ejesCuello(J);
        for (let i = 0; i < 3; i++) {
          const pts = [], f = 0.12 + i * 0.22;
          for (let j = 0; j <= 10; j++) { const a = Math.PI * (j / 10 - 0.5), c = G3.sum(ej.A, G3.esc(ej.v, ej.L * f)), q = G3.sum(c, G3.sum(G3.esc(ej.r, Math.cos(a) * 0.058 * H * kk), G3.esc(ej.e, Math.sin(a) * 0.056 * H * kk))); pts.push([q[0], q[1]]); }
          linea(ctx, pts, I.css(I.oscurece(color, 0.35), 0.5), 0.003 * H);
        }
      });
    };
    items.push(itV);
    // cola: cuelga por delante del pecho, de un punto del frente (lado D); ancla en el marco del pecho, en reposo en la dirección del torso
    const lat = (spec.lado === 'I' ? 1 : -1) * 0.022 * H, largoCola = (spec.largoCola == null ? 0.27 : spec.largoCola) * H, n = 5;
    const anclaDe = Jx => { const c = Jx.cuello, v = Jx.marcos.pecho.dirAMundo([lat, 0.03 * H, 0.062 * H * kk]), cin = Jx.cintura;
      return { p: [c.x + v[0], c.y + v[1]], prof: c.prof + v[2], ang: Math.atan2(cin.x - c.x, cin.y - c.y) }; };
    const a0 = anclaDe(J), cond = tp => { const a = anclaDe(o.historial ? D.memo('ropa:' + (o.id || 'a'), o.historial)(tp) : J); return { p: a.p, ang: a.ang }; };
    const ch = D.cadena(o.historial && t != null ? t : 0, cond, n, { largoSeg: largoCola / n, frec: o.frecCola || 1.8, amort: 0.3, gravedad: 0.3, viento: o.viento });
    const cinta = G3.orientar(P.cinta(ch, 0.05 * H * kk, 0.042 * H * kk), true), path = aPath(cinta), idx = 3;
    const pzC = { path, caja: path._caja, campo: null, marco: marcoCaja(cinta, [0, 1]), nominal: [0.05 * H * kk, largoCola], prof: a0.prof, color: I.oscurece(color, 0.15), semilla: 11 * 100 + idx, poly: cinta };
    const delante = a0.prof >= ptorso, fin = ch[n], pre = ch[n - 1];
    const itC = { id: 'bufandaCola', parte: 'bufanda', prof: a0.prof, rango: delante ? 3.6 : 1.9, capa: delante ? 2 : 0, pieza: pzC, cubre: [], info: { cadena: ch, delante } };
    itC.dibujar = (ctx, est) => {
      est = est || {}; formaPieza(ctx, pzC, est, { volumen: 0.6, borde: 0.6, textura: 0.35 });
      const dx = fin[0] - pre[0], dy = fin[1] - pre[1], l = Math.hypot(dx, dy) || 1, px = -dy / l, py = dx / l;
      for (let i = -2; i <= 2; i++) linea(ctx, [[fin[0] + px * i * 0.007 * H, fin[1] + py * i * 0.007 * H], [fin[0] + px * i * 0.008 * H + dx / l * 0.016 * H, fin[1] + py * i * 0.008 * H + dy / l * 0.016 * H]], I.css(I.oscurece(color, 0.2)), 0.004 * H);
      conClip(ctx, pzC.path, () => { for (let i = 1; i < n; i += 2) linea(ctx, [[ch[i][0] - 0.02 * H, ch[i][1]], [ch[i][0] + 0.02 * H, ch[i][1] + 0.004 * H]], I.css(I.oscurece(color, 0.35), 0.45), 0.003 * H); });
    };
    items.push(itC);
    return items;
  }

  // ---------------------------------------------------------------- prendas y conjunto
  // Ropa.prenda(spec, J, H, o) -> [item] de una sola prenda (sin reglas de capas entre prendas)
  R.prenda = function (spec, J, H, o = {}) {
    const t = o.t;
    switch (spec.tipo) {
      case 'abrigo': return abrigo(J, H, o, spec, t).concat(['D', 'I'].flatMap(l => R.manga(J, l, H, Object.assign({}, o, { material: 'abrigo', color: spec.color }))));
      case 'jersey': return torsoSimple(J, H, o, spec, 'jersey').concat(['D', 'I'].flatMap(l => R.manga(J, l, H, Object.assign({}, o, { material: 'jersey', color: spec.color || '#8a6a52' }))));
      case 'camisa': return torsoSimple(J, H, o, spec, 'camisa').concat(['D', 'I'].flatMap(l => R.manga(J, l, H, Object.assign({}, o, { material: 'camisa', color: spec.color || '#d9d2c3' }))));
      case 'pantalon': { const piernas = ['D', 'I'].flatMap(l => R.pernera(J, l, H, Object.assign({}, o, { color: spec.color }))); return piernas.concat(caderaPantalon(J, H, o, spec, piernas)); }
      case 'falda': return falda(J, H, o, spec, t);
      case 'delantal': return delantal(J, H, o, spec, t);
      case 'bufanda': return bufanda(J, H, o, spec, t);
    }
    throw new Error('Ropa.prenda: tipo desconocido "' + spec.tipo + '"');
  };
  // Reglas de capas entre prendas: la prenda de torso superior tapa las de debajo salvo si el abrigo está abierto; solo la prenda más externa con mangas
  // dibuja mangas; el cuello alto del jersey y el cuello de la camisa siguen asomando.
  R.piezas = function (J, H, prendas, o = {}) {
    const por = {}; for (const p of prendas) por[p.tipo] = p;
    const ab = por.abrigo, je = por.jersey, ca = por.camisa, out = [];
    const mangas = ab ? 'abrigo' : je ? 'jersey' : ca ? 'camisa' : null;
    const torsoVisible = { abrigo: !!ab, jersey: !!je && (!ab || !!ab.abierto), camisa: !!ca && (!je && (!ab || !!ab.abierto)) };
    for (const p of prendas) {
      const items = R.prenda(p, J, H, o);
      for (const it of items) {
        const esManga = /^manga/.test(it.id), esTorso = it.id === p.tipo && (p.tipo === 'jersey' || p.tipo === 'camisa');
        if (esManga && p.tipo !== mangas) continue;
        if (esTorso && !torsoVisible[p.tipo]) continue;
        if (/Cuello$/.test(it.id) && p.tipo === 'camisa' && je && je.cuello === 'alto') continue;
        out.push(it);
      }
    }
    return out;
  };
  const capaCuerpo = (it, J, ptorso) => {
    const p = it.parte;
    if (/^(brazo|mano)/.test(p)) return J['hombro' + p.slice(-1)].prof >= ptorso ? 2 : 0;
    if (p === 'cabeza') return 2;
    return it.capa == null ? 0 : it.capa;
  };
  R.ordenar = function (items, J, H) {
    const ptorso = (J.pelvis.prof + J.hombros.prof) / 2, caps = [[], [], []];
    for (const it of items) { const c = it.capa == null ? capaCuerpo(it, J, ptorso) : it.capa; caps[c].push(it); }
    return [].concat(C.ordenar(caps[0], H), C.ordenar(caps[1], H), C.ordenar(caps[2], H));
  };
  // Cuerpo + ropa. o.zapatos:{modelo,color}; o.extra: items (cabeza, manos...) con {id, parte, prof, rango, dibujar}
  R.cuerpoVestido = function (J, H, prendas, o = {}) {
    const cuerpo = C.piezas(J, H, { complexion: o.complexion, perfil: o.perfil, zapatos: o.zapatos === null ? null : (o.zapatos || { modelo: 'zapato' }), luz: o.luz });
    const ropa = R.piezas(J, H, prendas, o), cubiertas = {};
    for (const it of ropa) for (const c of it.cubre || []) cubiertas[c] = true;
    const resto = cuerpo.filter(q => !cubiertas[q.parte]);
    return R.ordenar(resto.concat(ropa, o.extra || []), J, H);
  };
  // Dibuja un item: de ropa (it.dibujar), zapato desnudo o parte del cuerpo con piel.
  // est = {luz, piel, colorZapato, colorSuela, estilo}
  R.dibujar = function (ctx, it, est = {}) {
    if (it.dibujar) return it.dibujar(ctx, est);
    const pz = it.pieza; if (!pz || !pz.path) return;
    if (/^zapato/.test(it.parte)) return C.dibujarZapato(ctx, pz, Object.assign({ color: est.colorZapato || '#2a2524', colorSuela: est.colorSuela, luz: est.luz, semilla: 41, volumen: 0.6, borde: 0.4 }, est.estilo || null));
    P.forma(ctx, pz.path, Object.assign({ color: est.piel || '#e6b48f', campo: pz.campo, marco: pz.marco, nominal: pz.nominal, semilla: 31, volumen: 0.6, borde: 0.4, textura: 0.1, irregular: 0, luz: est.luz }, est.estilo || null));
  };
})(typeof window !== 'undefined' ? window : globalThis);
