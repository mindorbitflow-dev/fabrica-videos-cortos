// Adaptador: hace que S30.detective y S30.tito (los que usan las escenas de autor y los posts) dibujen con el kit de ilustración
// (plantilla/ilustra.js + I.REPARTO) en vez de la caricatura de manguera. Misma firma que antes: (ctx, x, y, s, opciones).
// (x, y) = pies, s = escala (1 ≈ 430 px de alto para Sombra, igual que una persona). Todo depende solo de T.
(() => {
  if (!window.S30 || !window.Ilustra || !Ilustra.REPARTO) return;
  const I = Ilustra, R = I.REPARTO;
  // MODO COLOR (por defecto): ilustración sobria y cinematográfica con el MISMO motor y escenario del kit (azul grisáceo, tierra cálida,
  // luz cálida de lámpara). Para volver al noir sepia antiguo, define window.S30_NOIR = true antes de cargar este archivo.
  const COLOR = !window.S30_NOIR;
  const SUELO_OF = 1250, DY = -210;   // el interior del kit se dibuja desplazado: suelo en y=1250 y ventana a la derecha (x 610-910)
  const ESC = COLOR && I.escenarios && I.escenarios.interiorCalido ? I.escenarios.interiorCalido({ taza: false, suelo: SUELO_OF - DY, pared: '#6c7788', papel: '#8591a3', semilla: 8 }) : null;
  // luz cálida del kit (lámpara y ventana)
  const LUZ = ESC ? ESC.luz : new I.Luz({ dir: [-0.5, -0.8], dirBorde: [0.9, -0.2], clave: '#f2d9a0', ambiente: '#4a4036', borde: '#d4b47a', niebla: '#3a342c' });
  // colores de los personajes (claves de I.REPARTO: SOMBRA y TITO): apagados, azul acero y tierra
  const COL_SOMBRA = COLOR ? { tinta: '#3d5a78', cabeza: '#2a2d3a', oreja: '#353a4c', sombrero: '#2b3040', cinta: '#c9953f', hocico: '#e6d5b8', nariz: '#16181f',
    saco: '#4a6a8a', cinturon: '#1d1a20', hebilla: '#c9a35a', guante: '#e7dcc2', boton: '#d8c8a8', pantalon: '#2f3645', zapato: '#3a2c26' } : {};
  const COL_TITO = COLOR ? { piel: '#e8b8a8', hocico: '#d49a8c', fosa: '#5a3a3a', mejilla: '#c9807c', boina: '#5a6f8a', boinaBanda: '#2a2d3a', tirante: '#a8553f',
    boton: '#c9a35a', mono: '#8a3a33', pantalon: '#5a5148', zapato: '#2a2420', oreja: '#d9a396', camisa: '#e7dcc2' } : {};
  const cache = {};
  const quien = (tipo, altura, extra) => {
    const k = tipo + '|' + Math.round(altura);
    return cache[k] || (cache[k] = tipo === 'sombra' ? R.sombra({ altura: Math.round(altura), colores: COL_SOMBRA }) : R.tito({ altura: Math.round(altura), colores: COL_TITO }));
  };
  // Versión 2.5D (gira en 360°): se usa cuando el estado trae `yaw` (0 = de frente, ±π/2 = perfil, π = de espaldas). Sin yaw, el reparto 2D de siempre.
  const cache25 = {};
  const quien25 = (tipo, altura) => {
    const k = tipo + '|' + Math.round(altura);
    return cache25[k] || (cache25[k] = tipo === 'sombra' ? R.sombra25({ altura: Math.round(altura), colores: COL_SOMBRA }) : R.tito25({ altura: Math.round(altura), colores: COL_TITO }));
  };
  // 'habla' = expresión alegre con la boca abriendo y cerrando (estado.habla = 1, ritmo propio del reparto)
  const EXPR = { habla: 'alegre', sonrisa: 'alegre', duda: 'duda', o: 'sorpresa', triste: 'triste', enfado: 'enfado', neutra: 'neutra' };

  function detective(ctx, x, y, s, o = {}) {
    const { T = 0, dir = 1, paso = null, corre = false, lupa = 0, susto = 0, rasca = 0, mira = 0, boca = 'sonrisa' } = o;
    const H = 430 * s, p = quien('sombra', H);
    let pose = 'dePie', expresion = EXPR[boca] || 'alegre';
    if (paso !== null) pose = 'camina'; else if (lupa) pose = 'lupa'; else if (rasca) { pose = 'pensativo'; expresion = 'duda'; } else if (susto > .3) { pose = 'sorprendido'; expresion = 'susto'; }
    if (o.senala) pose = 'senalar';
    if (o.pose) pose = o.pose;                 // pose por nombre (dePie, camina, senalar, lupa, pensativo, sorprendido, explicar, cruzado)
    if (o.expresion) expresion = o.expresion;  // alegre, duda, sorpresa, triste, enfado, susto, asombro, grito, risa, concentrado
    if (o.yaw != null && R.sombra25) {
      ctx.save();
      quien25('sombra', H).dibujar(ctx, T, Object.assign({ x, y, yaw: o.yaw, pose, expresion, mirada: [mira, 0], luz: LUZ, dist: paso !== null ? paso * 0.5 * H : 0, habla: o.habla || (boca === 'habla' ? 1 : 0), alto: susto * 60 * s },
        o.pose2 ? { pose2: o.pose2, k: o.k || 0 } : {}));
      ctx.restore(); return;
    }
    ctx.save();
    p.dibujar(ctx, T, Object.assign({ x, y, dir, pose, expresion, mirada: [mira, 0], luz: LUZ, dist: paso !== null ? paso * 0.5 * H : 0, habla: o.habla || (boca === 'habla' ? 1 : 0), alto: susto * 60 * s },
      o.pose2 ? { pose2: o.pose2, k: o.k || 0 } : {}, o.giroCabeza != null ? { giroCabeza: o.giroCabeza } : {}, o.sombreroAlto != null ? { sombreroAlto: o.sombreroAlto } : {}));
    ctx.restore();
  }
  function tito(ctx, x, y, s, o = {}) {
    const { T = 0, dir = 1, paso = null, boca = 'sonrisa', mira = 0, caja = null, brazos = 'abajo', susto = 0, objeto = null } = o;
    const H = 430 * s * 0.8, p = quien('tito', H);
    let pose = 'dePie', expresion = EXPR[boca] || 'alegre', est = {};
    if (paso !== null) pose = 'camina';
    if (brazos === 'arriba' || susto > .3) { pose = 'asombrado'; expresion = susto > .3 ? 'susto' : 'sorpresa'; }
    if (caja !== null || objeto) { pose = 'traeObjeto'; est.objeto = typeof objeto === 'string' ? objeto : 'carpeta'; est.llevaObjeto = true; }
    if (o.pose) pose = o.pose;                 // pose por nombre (dePie, camina, traeObjeto, triste, asombrado, senalar, saluda)
    if (o.expresion) expresion = o.expresion;
    if (o.pose2) { est.pose2 = o.pose2; est.k = o.k || 0; }
    if (o.giroCabeza != null) est.giroCabeza = o.giroCabeza;
    if (o.yaw != null && R.tito25) {
      ctx.save();
      quien25('tito', H).dibujar(ctx, T, Object.assign({ x, y, yaw: o.yaw, pose, expresion, mirada: [mira, 0], luz: LUZ, dist: paso !== null ? paso * 0.5 * H : 0, habla: o.habla || (boca === 'habla' ? 1 : 0), alto: susto * 40 * s }, est));
      ctx.restore(); return;
    }
    ctx.save();
    p.dibujar(ctx, T, Object.assign({ x, y, dir, pose, expresion, mirada: [mira, 0], luz: LUZ, dist: paso !== null ? paso * 0.5 * H : 0, habla: o.habla || (boca === 'habla' ? 1 : 0), colita: Math.sin(T * 5) * .12, alto: susto * 40 * s }, est));
    ctx.restore();
  }
  S30.detectiveViejo = S30.detective; S30.titoViejo = S30.tito; S30.LUZ = LUZ;
  S30.detective = detective; S30.tito = tito;

  // ---- ACTUACIÓN: lo que hace que un personaje se mueva DENTRO de la escena (no solo respire) ----
  // S30.actua(t, d, pistas, {ancho}) -> { pose, pose2, k }: guion de poses por fracción de la escena. Cada clave [fracción 0-1, 'pose'] se mantiene
  // y, un poco antes de la siguiente, se mezcla con ella (`ancho` = fracción de escena que dura el cruce). Se pasa tal cual al personaje:
  //   S30.tito(ctx, x, y, 1.6, { T, ...S30.actua(t, d, [[0, 'dePie'], [.35, 'asombrado'], [.75, 'senalar']]), habla: 1 })
  // Poses: Sombra dePie, senalar, lupa, pensativo, sorprendido, explicar, cruzado · Tito dePie, traeObjeto, triste, asombrado, senalar, saluda ·
  // gente dePie, senalar, saludar, susto, cabizbajo, manosBolsillos. (Mezclar poses de brazos distintos funciona; con relMano/relPie puede dar un salto: usa cruces cortos.)
  S30.actua = function (t, d, pistas, { ancho = .14 } = {}) {
    const f = K.clamp(t / Math.max(d, .01)), n = pistas.length;
    let i = 0; while (i < n - 1 && f >= pistas[i + 1][0]) i++;
    if (i >= n - 1) return { pose: pistas[n - 1][1] };
    const cruce = K.clamp((f - (pistas[i + 1][0] - ancho)) / ancho);
    return cruce > 0 ? { pose: pistas[i][1], pose2: pistas[i + 1][1], k: K.suave(cruce) } : { pose: pistas[i][1] };
  };
  // S30.camina(t, d, x0, x1, {desde, hasta, alto}) -> { x, paso, dir }: el personaje camina de x0 a x1 entre las fracciones `desde` y `hasta`
  // de la escena. `paso` es null mientras está parado (el personaje cae a 'dePie') y, si camina, la fase del paso sale de la distancia
  // recorrida (los pies no patinan). `alto` = altura del personaje en px (430·escala; Tito 430·escala·.8). `dir` mira hacia donde va.
  S30.camina = function (t, d, x0, x1, { desde = 0, hasta = .6, alto = 430 } = {}) {
    const k = K.suave((t / Math.max(d, .01) - desde) / Math.max(hasta - desde, .01)), x = K.lerp(x0, x1, k), dir = x1 >= x0 ? 1 : -1;
    return { x, dir, paso: k > 0 && k < 1 ? Math.abs(x - x0) / (.5 * alto) : null };
  };

  if (!COLOR) return;
  // ================================================================ MODO COLOR: paleta, acabado, oficina del kit, gente del reparto
  const { W, H, TAU, clamp, lerp, hash, azar, alfa } = K;
  const C = S30.C;
  S30.noir = { C: Object.assign({}, C), pelicula: S30.pelicula, iris: S30.iris, oficina: S30.oficina, escritorio: S30.escritorio, vaiven: S30.vaiven, cielo: S30.cielo, niebla: S30.niebla, hombre: S30.hombre };
  // (a) la paleta de S30.C se muta: todas las funciones S30 y las escenas que usan C salen en color sobrio (azul grisáceo + tierra cálida + ámbar)
  Object.assign(C, { tinta: '#1d2230', papel: '#e7dcc2', medio: '#4a5a72', gris: '#7b8494', claro: '#b9c4cf', oro: '#E0B060',
    terracota: '#b5654a', ocre: '#c89a4a', salvia: '#7d9a7a', acero: '#4f6d8f', ciruela: '#6b4a5e', arena: '#c9b79a', cobre: '#a8703f', musgo: '#5c6b4f', niebla: '#9aa7b8', noche: '#1a2230' });

  // (b) acabado cinematográfico: viñeta suave, leve calidez y grano fino (sin sepia ni rayones)
  S30.pelicula = function (ctx, T, { fuerza = 1 } = {}) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,190,120,' + (.10 * fuerza) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .5, H * .78);
    g.addColorStop(0, 'rgba(20,16,22,0)'); g.addColorStop(1, 'rgba(20,16,22,' + (.34 * fuerza) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    K.acabado(ctx, T, { grano: .07 * fuerza, vineta: 0 });
    ctx.restore();
  };
  S30.vaiven = function (ctx, T, fuerza = 1) { ctx.translate(Math.sin(T * 1.3) * 2 * fuerza, Math.cos(T * 1.7) * 3 * fuerza); };
  S30.iris = function (ctx, k, x = W / 2, y = 760) {
    if (k <= 0) return;
    const r = Math.max(0, lerp(Math.hypot(W, H), 0, K.sale(k)));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = C.noche;
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x, y, r, 0, TAU); ctx.fill('evenodd');
    if (r > 2 && r < Math.hypot(W, H) - 2) { ctx.strokeStyle = C.oro; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
    ctx.restore();
  };
  S30.cielo = function (ctx, T, { estrellas = 40, semilla = 3 } = {}) {
    K.fondo(ctx, '#2f3b4d', '#12171f', '#232c3a');
    const r = azar(semilla);
    for (let i = 0; i < estrellas; i++) {
      const x = r() * W, y = 200 + r() * 900, t = .5 + .5 * Math.sin(T * (1 + r() * 2) + i), s = (3 + r() * 5) * t;
      ctx.strokeStyle = alfa(i % 3 ? '#e7dcc2' : '#E0B060', .35 + .45 * t); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    }
  };
  S30.niebla = function (ctx, T, { y = 900, alto = 300, a = .2, semilla = 8 } = {}) {
    const r = azar(semilla);
    for (let i = 0; i < 7; i++) {
      const x = ((r() * 1600 + T * (12 + r() * 20)) % 1600) - 300, yy = y + r() * alto, rx = 200 + r() * 200;
      const g = ctx.createRadialGradient(x, yy, 0, x, yy, rx);
      g.addColorStop(0, alfa('#9aa7b8', a)); g.addColorStop(1, alfa('#9aa7b8', 0));
      ctx.fillStyle = g; ctx.fillRect(x - rx, yy - rx, rx * 2, rx * 2);
    }
  };

  // (c) oficina = el escenario interiorCalido del kit (pared azul grisácea, zócalo y suelo de madera, ventana de noche con lluvia, lámpara
  // de pie, cuadro, estantería, planta, mapa de luz cálida). Se dibuja desplazado (DY) para que el suelo quede en y=1250 y la ventana a la derecha.
  const cacheCapa = new Map();
  function capaEstatica(capa) {
    let c = cacheCapa.get(capa); if (c) return c;
    const [x0, y0, x1, y1] = capa.limites || [-600, -200, 1800, 2200];
    const cv = document.createElement('canvas'); cv.width = Math.ceil(x1 - x0); cv.height = Math.ceil(y1 - y0);
    const cx = cv.getContext('2d'); cx.translate(-x0, -y0);
    const prev = I.luzActual; I.luzActual = ESC.luz;
    try { capa.dibujar(cx, 0); } finally { I.luzActual = prev; }
    c = { cv, x0, y0 }; cacheCapa.set(capa, c); return c;
  }
  const oficinaNoir = S30.oficina;
  S30.oficina = function (ctx, T, { luz = 1 } = {}) {
    if (!ESC) return oficinaNoir(ctx, T, { luz });
    const prev = I.luzActual; I.luzActual = ESC.luz;
    ctx.save();
    ctx.fillStyle = ESC.fondo; ctx.fillRect(-40, -40, W + 80, H + 80);
    ctx.translate(0, DY);
    const M = ctx.getTransform();
    const cam = { en: () => ({ zoom: M.a }), aPantalla: (t, x, y) => [M.a * x + M.c * y + M.e, M.b * x + M.d * y + M.f] };
    ESC.capas.forEach((capa, i) => {
      if (capa.actores) return;
      ctx.save();
      if (capa.pantalla && i === 6) {   // mapa de luz del kit (lámpara + ventana), con penumbra más clara para que los personajes se lean
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const fl = 1 + 0.02 * I.ruido1(T * 2, 8), z = M.a, l = cam.aPantalla(T, 170, ESC.suelo + 20 - 520 + 70), v = cam.aPantalla(T, 760, 610);
        I.mapaLuz(ctx, [{ x: l[0], y: l[1] + 120 * z, r: 1200 * z, fuerza: 0.9 * fl * luz, color: '#fff0dc' }, { x: v[0], y: v[1], r: 560 * z, fuerza: 0.4, color: '#b8c8e8' }], { oscuridad: '#8a8088' });
        I.halo(ctx, l[0], l[1], 700 * z, '#ffb55e', 0.4 * fl * luz);
      }
      else if (capa.pantalla) { ctx.setTransform(1, 0, 0, 1, 0, 0); capa.dibujar(ctx, T, cam); }
      else if (i === 3) { I.props.planta(ctx, 1000, ESC.suelo + 10, { semilla: 16, t: T }); }   // la mesa del kit se omite: el escritorio es de S30
      else if (capa.estatica) { const c = capaEstatica(capa); ctx.drawImage(c.cv, c.x0, c.y0); }
      else capa.dibujar(ctx, T, cam);
      ctx.restore();
    });
    ctx.restore(); I.luzActual = prev;
  };
  S30.escritorio = function (ctx, T, { y = 1050 } = {}) {
    const g = ctx.createLinearGradient(0, y + 30, 0, y + 270); g.addColorStop(0, '#4a5d75'); g.addColorStop(1, '#2c3a4d');
    ctx.fillStyle = g; ctx.fillRect(-40, y + 30, W + 80, 240);
    ctx.strokeStyle = 'rgba(15,20,30,.45)'; ctx.lineWidth = 3; for (let x = 20; x < W; x += 200) ctx.strokeRect(x, y + 60, 160, 150);
    ctx.fillStyle = '#a8794c'; ctx.fillRect(-40, y, W + 80, 30);
    ctx.fillStyle = 'rgba(255,225,170,.28)'; ctx.fillRect(-40, y + 2, W + 80, 6);
    ctx.fillStyle = C.oro; ctx.fillRect(510, y + 100, 60, 12);
    ctx.strokeStyle = C.tinta; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(W + 40, y); ctx.moveTo(-40, y + 30); ctx.lineTo(W + 40, y + 30); ctx.stroke();
    ctx.save(); ctx.translate(250, y + 6); ctx.rotate(-.08); ctx.fillStyle = C.papel; ctx.fillRect(-90, -16, 180, 22); ctx.strokeStyle = C.tinta; ctx.lineWidth = 3; ctx.strokeRect(-90, -16, 180, 22); ctx.restore();
    ctx.save(); ctx.translate(800, y + 4); ctx.rotate(.05); ctx.fillStyle = '#7d3f37'; ctx.fillRect(-80, -22, 160, 26); ctx.strokeStyle = C.tinta; ctx.lineWidth = 3; ctx.strokeRect(-80, -22, 160, 26); ctx.restore();
  };

  // (f) gente del flashback con el motor nuevo: I.REPARTO.gente(variante) (hombre | mujer | anciano | nino), variada por `semilla`.
  // Firma: (ctx, x, y, s, o); (x, y) = pies, adulto ≈ 430*s de alto (como Sombra). o: T, dir, semilla, variante (si no, sale de la semilla),
  // gesto 'quieto' | 'apreton' | 'senala', cara 'serio' | 'sonrisa', paso (fase de caminata o null), corre, brazos 'abajo' | 'arriba', susto 0-1,
  // pose (nombre de pose del reparto: dePie, camina, corre, senalar, saludar, susto, cabizbajo, manosBolsillos...), habla 0-1. Devuelve las articulaciones J.
  // silueta: true (o un color) = figura oscura SIN cara, solo con la luz de borde cálida (estilo de las historias de personajes reales: no se dibuja el rostro de nadie).
  const ROPAS = ['#5b6b80', '#7a5c48', '#6b7a62', '#8a6a4a', '#5a4a5e', '#4a5560', '#9a7a58', '#6a4a42'];
  const PELOS = ['#2b211d', '#4a3426', '#6b4a2e', '#1d1a1a', '#8a6a44'];
  const PIELES = ['#f0c4a0', '#e0a97f', '#e0a97f', '#c98f66', '#a56d48', '#7d4b32'];
  const PANTS = ['#3b4150', '#44474f', '#4a3f38', '#2f3442'];
  const FACT = { hombre: 1, mujer: .95, anciano: .93, nino: .66 };
  const gente = {};
  S30.hombre = function (ctx, x, y, s, o = {}) {
    const semilla = o.semilla == null ? 1 : o.semilla, T = o.T || 0, dir = o.dir == null ? 1 : o.dir;
    const hz = k => hash(semilla * 7.13 + k * 3.7), pick = (a, k) => a[Math.floor(hz(k) * a.length) % a.length];
    let variante = o.variante; if (!variante) { const q = hz(1); variante = q < .62 ? 'hombre' : q < .86 ? 'mujer' : 'anciano'; }
    const alto = Math.round(430 * s * (FACT[variante] || 1) * (variante === 'nino' ? 1 : .95 + hz(2) * .1));
    const sil = o.silueta ? (typeof o.silueta === 'string' ? o.silueta : '#16121f') : null;
    const key = variante + '|' + alto + '|' + semilla + (sil ? '|' + sil : '');
    const g = gente[key] || (gente[key] = R.gente(variante, sil ? Object.assign({ altura: alto, semilla: 40 + Math.floor(semilla) % 50, ropa: sil, piel: sil, pantalon: sil, pelo: sil, zapato: sil, camisa: sil, cuello: sil }, variante === 'hombre' ? { peinado: pick(['corto', 'corto', 'calvo'], 7) } : {}) : Object.assign({ altura: alto, semilla: 40 + Math.floor(semilla) % 50, ropa: pick(ROPAS, 3), piel: pick(PIELES, 4), pantalon: pick(PANTS, 5) },
      variante === 'anciano' ? {} : { pelo: pick(PELOS, 6) }, variante === 'hombre' ? { peinado: pick(['corto', 'corto', 'calvo'], 7) } : {})));
    const gesto = o.gesto || 'quieto', H = alto;
    let pose = 'dePie', expresion = o.cara === 'sonrisa' ? 'alegre' : 'neutra';
    if (sil) expresion = 'neutra';
    if (o.paso != null) pose = o.corre ? 'corre' : 'camina'; else if (gesto === 'senala' || gesto === 'apreton') pose = 'senalar';
    if (o.brazos === 'arriba') pose = 'saludar';
    if (o.susto > .3) { pose = 'susto'; expresion = 'susto'; }
    if (o.pose) pose = o.pose;
    if (o.expresion && !sil) expresion = o.expresion;
    const est = Object.assign({ x, y, dir, pose, expresion, mirada: [.4, 0], luz: LUZ, dist: o.paso != null ? o.paso * .5 * H : 0, habla: o.habla || (o.boca === 'habla' ? 1 : 0), alto: (o.susto || 0) * 40 * s },
      o.pose2 ? { pose2: o.pose2, k: o.k || 0 } : {});
    if (sil) return silueta(ctx, g, T, est, sil, alto);
    ctx.save();
    const J = g.dibujar(ctx, T, est);
    ctx.restore();
    return J;
  };
  // SILUETA: el personaje se dibuja en un lienzo aparte y se recorta a una máscara plana (sin cara, corbata ni sombrero) con un borde cálido a la derecha,
  // como las siluetas de las historias de personajes reales. Cuesta lo mismo que dibujar al personaje y no dibuja ninguna cara.
  const siluetas = new Map();
  const lienzoSil = (clave, w, h) => { let c = siluetas.get(clave); if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; siluetas.set(clave, c); } return c; };
  function silueta(ctx, g, T, est, color, alto) {
    g.o.despues = null; g.o.antes = null;   // sin corbata, sombrero ni bastón
    const bw = Math.ceil(alto * 1.7), bh = Math.ceil(alto * 1.25), ox = bw / 2, oy = bh - 14;
    const a = lienzoSil('a' + bw + 'x' + bh, bw, bh), b = lienzoSil('b' + bw + 'x' + bh, bw, bh), ca = a.getContext('2d'), cb = b.getContext('2d');
    ca.setTransform(1, 0, 0, 1, 0, 0); ca.globalCompositeOperation = 'source-over'; ca.clearRect(0, 0, bw, bh);
    const J = g.dibujar(ca, T, Object.assign({}, est, { x: ox, y: oy, sombraSuelo: false }));
    ca.globalCompositeOperation = 'source-in'; ca.fillStyle = color; ca.fillRect(0, 0, bw, bh); ca.globalCompositeOperation = 'source-over';
    cb.setTransform(1, 0, 0, 1, 0, 0); cb.globalCompositeOperation = 'source-over'; cb.clearRect(0, 0, bw, bh); cb.drawImage(a, 0, 0);
    cb.globalCompositeOperation = 'source-in'; cb.fillStyle = '#ffb45e'; cb.fillRect(0, 0, bw, bh); cb.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(est.x, est.y + 4, alto * .2, alto * .03, 0, 0, Math.PI * 2); ctx.fill();   // sombra en el suelo
    const dx = Math.max(3, alto * .008);
    ctx.drawImage(b, est.x - ox + dx, est.y - oy - dx * .4);   // borde de luz cálida a la derecha
    ctx.drawImage(a, est.x - ox, est.y - oy);
    ctx.restore();
    return J;
  }
  S30.mujer = (ctx, x, y, s, o = {}) => S30.hombre(ctx, x, y, s, Object.assign({ variante: 'mujer' }, o));
  window.S30_COLOR = true;
})();
