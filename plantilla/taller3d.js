// Taller 3D (T3): escenas en 3D low-poly para el formato "construir desde la falla" (nicho con `motor: 3d`).
// Modo inmediato, igual que el kit 2D: cada cuadro se dibuja entero a partir del tiempo, sin estado guardado.
//
//   (ctx, t, d, K, T) => T3.cuadro(ctx, T, { camara: { desde: [8, 5, 10], hacia: [0, 1, 0], fov: 38 }, mundo: { muro: true } }, P => {
//     P.caja({ pos: [0, 1, 0], tam: [2, 1, 1], color: '#f5a623' });
//     P.helice({ pos: [0, 2, 0], giro: T * 30 });
//   }, (c, P) => K.pastilla(c, 'MOTOR', ...P.pantalla([0, 2, 0]), 1, true));   // 2D encima (opcional)
//
// Unidades: 1 = 1 metro aprox. Y hacia arriba; el suelo es y=0. Ángulos en radianes. Colores CSS.
// pos/rot/esc son [x, y, z]. Todo lo que se dibuja dentro de P.grupo({pos, rot, esc}, () => ...) se mueve con el grupo.
(() => {
  const ANCHO = 1080, ALTO = 1920;
  let R = null, escena, camara, sol, hemi, mundo = {}, listo = false;
  const geo = {}, mats = new Map(), pools = {}, usados = {};
  let pila = [], gruposPool = [], gruposUsados = 0;

  function iniciar() {
    if (R) return;
    const lienzo = document.createElement('canvas'); lienzo.width = ANCHO; lienzo.height = ALTO;
    R = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true });
    R.setPixelRatio(1); R.setSize(ANCHO, ALTO, false);
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    escena = new THREE.Scene();
    camara = new THREE.PerspectiveCamera(38, ANCHO / ALTO, 0.05, 600);
    hemi = new THREE.HemisphereLight('#ffffff', '#8fae6a', 2.4); escena.add(hemi);
    sol = new THREE.DirectionalLight('#fff6e8', 2.6); sol.position.set(14, 26, 10); sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02;
    const s = sol.shadow.camera; s.left = -22; s.right = 22; s.top = 22; s.bottom = -22; s.near = 1; s.far = 80;
    escena.add(sol); escena.add(sol.target);
    geo.caja = new THREE.BoxGeometry(1, 1, 1);
    geo.cil = new THREE.CylinderGeometry(1, 1, 1, 20);
    geo.cil8 = new THREE.CylinderGeometry(1, 1, 1, 8);
    geo.cono = new THREE.ConeGeometry(1, 1, 20);
    geo.esfera = new THREE.SphereGeometry(1, 24, 16);
    geo.esferaBaja = new THREE.SphereGeometry(1, 9, 7);
    geo.toro = new THREE.TorusGeometry(1, 0.25, 10, 28);
    geo.disco = new THREE.CircleGeometry(1, 40);
    geo.plano = new THREE.PlaneGeometry(1, 1);
    construirMundo();
    listo = true;
  }

  // ---------- materiales y texturas ----------
  function material(color, o = {}) {
    const clave = color + '|' + (o.opacidad ?? 1) + '|' + (o.brillo || 0) + '|' + (o.mapa || '') + '|' + (o.doble ? 1 : 0);
    let m = mats.get(clave);
    if (!m) {
      const p = { color: new THREE.Color(color) };
      if (o.opacidad != null && o.opacidad < 1) { p.transparent = true; p.opacity = o.opacidad; p.depthWrite = false; }
      if (o.brillo) p.emissive = new THREE.Color(color), p.emissiveIntensity = o.brillo;
      if (o.mapa) p.map = textura(o.mapa);
      if (o.doble) p.side = THREE.DoubleSide;
      m = new THREE.MeshLambertMaterial(p);
      mats.set(clave, m);
    }
    return m;
  }
  const texturas = {};
  function textura(nombre) {
    if (texturas[nombre]) return texturas[nombre];
    const c = document.createElement('canvas'), g = c.getContext('2d');
    let rep = [1, 1];
    if (nombre === 'pasto') {
      c.width = c.height = 512; g.fillStyle = '#86c95a'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2600; i++) {
        const x = hash(i) * 512, y = hash(i + 9e3) * 512, l = 4 + hash(i + 3e3) * 9;
        g.strokeStyle = ['#6fb34a', '#9ad46a', '#79bd50', '#a7dc78'][i % 4]; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i + 7) - .5) * 4, y - l); g.stroke();
      }
      rep = [40, 40];
    } else if (nombre === 'ladrillo') {
      c.width = 512; c.height = 256; g.fillStyle = '#d9cdb8'; g.fillRect(0, 0, 512, 256);
      for (let f = 0; f < 8; f++) for (let k = -1; k < 9; k++) {
        const x = k * 64 + (f % 2) * 32, y = f * 32, v = hash(f * 31 + k) * 18 - 9;
        g.fillStyle = `rgb(${226 + v},${214 + v},${194 + v})`; g.fillRect(x + 2, y + 2, 60, 28);
      }
      rep = [6, 1];
    } else if (nombre === 'pista') {
      c.width = 256; c.height = 1024; g.fillStyle = '#5b5e63'; g.fillRect(0, 0, 256, 1024);
      g.fillStyle = '#f4f1e8'; for (let y = 0; y < 1024; y += 128) g.fillRect(118, y + 20, 20, 70);
      g.fillRect(8, 0, 10, 1024); g.fillRect(238, 0, 10, 1024);
      rep = [1, 6];
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return (texturas[nombre] = t);
  }
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  // ---------- escenario fijo (se enciende o apaga por cuadro) ----------
  function construirMundo() {
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), material('#ffffff', { mapa: 'pasto' }));
    suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo); mundo.pasto = suelo;
    const muro = new THREE.Group();
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(70, 3, 0.5), material('#ffffff', { mapa: 'ladrillo' }));
    m1.material.map.repeat.set(14, 1);
    m1.position.set(0, 1.5, -11); m1.castShadow = m1.receiveShadow = true; muro.add(m1);
    escena.add(muro); mundo.muro = muro;
    const arboles = new THREE.Group();
    [[-10, -13, 1.2], [7, -14, 1.5], [17, -6, 1.1], [-19, -3, 1.3], [12, -20, 1.8], [-6, -22, 1.6]].forEach(([x, z, s], i) => {
      const a = new THREE.Group();
      const tronco = new THREE.Mesh(geo.cil8, material('#8a6a4a')); tronco.scale.set(.25 * s, 3 * s, .25 * s); tronco.position.y = 1.5 * s;
      a.add(tronco);
      [[0, 3.6, 0, 1.6], [-.9, 3.1, .3, 1.15], [.9, 3.2, -.2, 1.2], [.1, 4.5, .1, 1.1]].forEach(([dx, dy, dz, r], k) => {
        const h = new THREE.Mesh(geo.esferaBaja, material(['#5fa64a', '#6cb553', '#559c42'][(i + k) % 3]));
        h.scale.setScalar(r * s); h.position.set(dx * s, dy * s, dz * s); a.add(h);
      });
      a.traverse(o => { if (o.isMesh) o.castShadow = true; });
      a.position.set(x, 0, z); arboles.add(a);
    });
    escena.add(arboles); mundo.arboles = arboles;
    const pista = new THREE.Mesh(new THREE.PlaneGeometry(8, 160), material('#ffffff', { mapa: 'pista' }));
    pista.rotation.x = -Math.PI / 2; pista.rotation.z = Math.PI / 2; pista.position.set(0, 0.01, 0); pista.receiveShadow = true;
    escena.add(pista); mundo.pista = pista;
  }

  // ---------- pools: modo inmediato sin crear objetos en cada cuadro ----------
  function malla(tipo) {
    const lista = pools[tipo] || (pools[tipo] = []), n = usados[tipo] || 0;
    let m = lista[n];
    if (!m) { m = new THREE.Mesh(geo[tipo]); m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = true; lista.push(m); }
    usados[tipo] = n + 1;
    (pila[pila.length - 1]).add(m); m.visible = true;
    return m;
  }
  function grupoNuevo() {
    let g = gruposPool[gruposUsados];
    if (!g) { g = new THREE.Group(); gruposPool.push(g); }
    gruposUsados++; g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1); g.visible = true;
    (pila[pila.length - 1]).add(g);
    return g;
  }
  function colocar(m, o, escala) {
    const p = o.pos || [0, 0, 0], r = o.rot || [0, 0, 0];
    m.position.set(p[0], p[1], p[2]); m.rotation.set(r[0], r[1], r[2], 'YXZ'); m.scale.set(escala[0], escala[1], escala[2]);
    m.material = material(o.color || '#dddddd', o);
    m.castShadow = o.sombra !== false;
    return m;
  }

  // ---------- API de piezas (P) ----------
  const P = {
    caja: (o = {}) => { const t = o.tam || [1, 1, 1]; return colocar(malla('caja'), o, t); },
    cilindro: (o = {}) => { const r = o.r ?? .5; return colocar(malla(o.lados === 8 ? 'cil8' : 'cil'), o, [r, o.alto ?? 1, o.r2 ?? r]); },
    cono: (o = {}) => { const r = o.r ?? .5; return colocar(malla('cono'), o, [r, o.alto ?? 1, r]); },
    esfera: (o = {}) => { const r = o.r ?? .5, e = o.esc || [1, 1, 1]; return colocar(malla(o.baja ? 'esferaBaja' : 'esfera'), o, [r * e[0], r * e[1], r * e[2]]); },
    toro: (o = {}) => { const r = o.r ?? .5; const m = colocar(malla('toro'), o, [r, r, (o.grosor ?? .25) / .25 * r]); return m; },
    disco: (o = {}) => { const r = o.r ?? .5; return colocar(malla('disco'), { ...o, doble: true }, [r, r, 1]); },
    // Cilindro de un punto a otro (tubos, varillas, patas, cables rectos).
    tubo: (o) => {
      const a = new THREE.Vector3(...o.de), b = new THREE.Vector3(...o.a), largo = a.distanceTo(b) || 1e-4;
      const m = colocar(malla('cil'), { ...o, pos: [0, 0, 0], rot: [0, 0, 0] }, [o.r ?? .05, largo, o.r ?? .05]);
      m.position.copy(a).add(b).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      return m;
    },
    // Agrupa piezas: todo lo que se dibuja dentro de fn se mueve, gira y escala con el grupo.
    grupo: (o, fn) => {
      const g = grupoNuevo(); const p = o.pos || [0, 0, 0], r = o.rot || [0, 0, 0], e = o.esc ?? 1;
      g.position.set(...p); g.rotation.set(r[0], r[1], r[2], 'YXZ');
      if (Array.isArray(e)) g.scale.set(...e); else g.scale.setScalar(e);
      pila.push(g); try { fn(); } finally { pila.pop(); }
      return g;
    },
    // Hélice: `giro` = ángulo actual (p. ej. T * 25). Con `rapida` se dibuja además el disco borroso de las palas en movimiento.
    // Por defecto gira alrededor de Y (rotor de helicóptero); para una hélice de avión usa rot: [0, 0, Math.PI / 2].
    helice: (o = {}) => P.grupo({ pos: o.pos, rot: o.rot, esc: o.esc }, () => {
      const n = o.palas ?? 2, L = o.largo ?? 1, A = o.ancho ?? .14, col = o.color || '#c98a4b', paso = o.paso ?? .25;
      P.cilindro({ pos: [0, 0, 0], r: A * .55, alto: A * 1.2, color: o.centro || '#5b5f66' });
      P.grupo({ rot: [0, o.giro || 0, 0] }, () => {
        for (let i = 0; i < n; i++) P.grupo({ rot: [0, i * Math.PI * 2 / n, 0] }, () =>
          P.caja({ pos: [L / 2, 0, 0], rot: [paso, 0, 0], tam: [L, A * .22, A], color: col }));
      });
      if (o.rapida) P.disco({ pos: [0, .01, 0], rot: [-Math.PI / 2, 0, 0], r: L, color: '#ffffff', opacidad: .22 * o.rapida, sombra: false });
    }),
    rueda: (o = {}) => P.grupo({ pos: o.pos, rot: o.rot }, () => {
      const r = o.r ?? .3, ancho = o.ancho ?? .16;
      P.grupo({ rot: [o.giro || 0, 0, Math.PI / 2] }, () => {
        P.cilindro({ r, alto: ancho, color: o.color || '#2b2b2e' });
        P.cilindro({ r: r * .5, alto: ancho * 1.08, color: o.rin || '#c9ccd1' });
      });
    }),
    // Flecha de fuerza: de un punto, en una dirección, con un largo (empuje, peso, sustentación...).
    flecha: (o) => {
      const d = new THREE.Vector3(...o.dir).normalize(), L = o.largo ?? 1.5, a = new THREE.Vector3(...o.de);
      const punta = Math.min(.45, L * .35), r = o.r ?? .06, col = o.color || '#8e6cf0';
      const b = a.clone().add(d.clone().multiplyScalar(L - punta));
      P.tubo({ de: a.toArray(), a: b.toArray(), r, color: col, brillo: .35, sombra: false });
      const m = colocar(malla('cono'), { color: col, brillo: .35, sombra: false }, [r * 2.6, punta, r * 2.6]);
      m.position.copy(b).add(d.clone().multiplyScalar(punta / 2));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    },
    // Líneas de viento blancas que pasan (como en los dibujos de túnel de viento). T = tiempo del video.
    viento: (o) => {
      const n = o.n ?? 10, L = o.largo ?? 8, d = new THREE.Vector3(...(o.dir || [1, 0, 0])).normalize(), c = new THREE.Vector3(...(o.pos || [0, 1, 0]));
      const lado = new THREE.Vector3(0, 1, 0).cross(d); if (lado.lengthSq() < .01) lado.set(1, 0, 0); lado.normalize();
      const arriba = d.clone().cross(lado).normalize(), ancho = o.ancho ?? 3, alto = o.alto ?? 2, vel = o.vel ?? 6;
      for (let i = 0; i < n; i++) {
        const u = ((o.T * vel / L + hash(i * 7.3)) % 1) * 1.6 - .8, tramo = .18 + hash(i) * .2;
        const off = lado.clone().multiplyScalar((hash(i + 1) - .5) * ancho).add(arriba.clone().multiplyScalar((hash(i + 2) - .5) * alto));
        const a = c.clone().add(off).add(d.clone().multiplyScalar(u * L)), b = a.clone().add(d.clone().multiplyScalar(tramo * L));
        if (o.curva) { b.add(arriba.clone().multiplyScalar(o.curva * tramo)); }
        P.tubo({ de: a.toArray(), a: b.toArray(), r: o.grosor ?? .025, color: '#ffffff', opacidad: .75 * Math.sin(Math.PI * (u + .8) / 1.6), sombra: false });
      }
    },
    // Nubecitas de polvo que se abren y se desvanecen. k = 0..1 del soplido.
    polvo: (o) => {
      const n = o.n ?? 8, k = o.k ?? 0;
      if (k <= 0 || k >= 1) return;
      for (let i = 0; i < n; i++) {
        const a = i * Math.PI * 2 / n + hash(i) * .6, r = (o.r ?? 1.5) * Math.sqrt(k);
        P.esfera({ pos: [o.pos[0] + Math.cos(a) * r, o.pos[1] + .2 + k * .5 * hash(i + 4), o.pos[2] + Math.sin(a) * r], r: (.25 + .35 * hash(i + 2)) * (1 - k * .5),
          color: o.color || '#efe9dc', opacidad: .55 * (1 - k), baja: true, sombra: false });
      }
    },
    // Piloto de la página: un patito de hule. Cámbialo por el personaje de la marca cuando exista.
    piloto: (o = {}) => P.grupo({ pos: o.pos, rot: o.rot, esc: o.esc ?? 1 }, () => {
      const am = o.color || '#ffd23a', tiembla = o.susto ? Math.sin((o.T || 0) * 40) * .04 * o.susto : 0;
      P.esfera({ pos: [0, .28, 0], r: .3, esc: [1.15, .9, 1], color: am });
      P.esfera({ pos: [tiembla, .66, .05], r: .2, color: am });
      P.cono({ pos: [0, .64, .24], rot: [Math.PI / 2, 0, 0], r: .07, alto: .16, color: '#ff8a2a' });
      const ojo = (x) => { P.esfera({ pos: [x + tiembla, .72, .17], r: .055 * (1 + (o.susto || 0) * .6), color: '#ffffff' }); P.esfera({ pos: [x + tiembla, .72, .215], r: .03, color: '#1b1b1b' }); };
      ojo(-.08); ojo(.08);
      P.esfera({ pos: [0, .33, -.3], r: .1, esc: [1, .7, 1.3], color: am });
    }),
  };

  // Posición en pantalla (px del lienzo 1080x1920) de un punto 3D, para poner rótulos 2D encima.
  P.pantalla = (p) => { const v = new THREE.Vector3(...p).project(camara); return [(v.x + 1) / 2 * ANCHO, (1 - v.y) / 2 * ALTO]; };

  // ---------- cuadro ----------
  function cuadro(ctx, T, conf, dibujar, encima) {
    if (!window.THREE) throw new Error('falta three.js (el nicho debe tener motor: 3d)');
    iniciar();
    const m = conf.mundo || {};
    escena.background = new THREE.Color(m.cielo || '#bfe2f2');
    escena.fog = m.niebla === false ? null : new THREE.Fog(m.cielo || '#bfe2f2', m.nieblaDesde ?? 30, m.nieblaHasta ?? 110);
    mundo.pasto.visible = m.pasto !== false; mundo.muro.visible = !!m.muro; mundo.arboles.visible = m.arboles !== false; mundo.pista.visible = !!m.pista;
    if (m.pista) { mundo.pista.position.x = m.pistaX ?? 0; }
    const c = window.__camaraDebug || conf.camara || {};
    camara.fov = c.fov ?? 38; camara.updateProjectionMatrix();
    camara.position.set(...(c.desde || [8, 5, 12])); camara.up.set(0, 1, 0); camara.lookAt(new THREE.Vector3(...(c.hacia || [0, 1, 0])));
    if (c.ladeo) camara.rotateZ(c.ladeo);
    // La sombra sigue a lo que mira la cámara para no perder resolución.
    const h = new THREE.Vector3(...(c.hacia || [0, 1, 0]));
    sol.position.set(h.x + 14, 26, h.z + 10); sol.target.position.set(h.x, 0, h.z);
    for (const k in usados) usados[k] = 0;
    gruposUsados = 0;
    const raiz = grupoRaiz(); pila = [raiz];
    try { dibujar(P); } finally { pila = []; }
    for (const k in pools) for (let i = usados[k] || 0; i < pools[k].length; i++) pools[k][i].visible = false;
    for (let i = gruposUsados; i < gruposPool.length; i++) gruposPool[i].visible = false;
    R.render(escena, camara);
    ctx.drawImage(R.domElement, 0, 0, ANCHO, ALTO);
    if (encima) { ctx.save(); try { encima(ctx, P); } finally { ctx.restore(); } }
  }
  let raizG = null;
  function grupoRaiz() {
    if (!raizG) { raizG = new THREE.Group(); }
    if (!raizG.parent) escena.add(raizG);
    // Las mallas se vuelven a colgar en cada cuadro: se sueltan del árbol anterior.
    raizG.clear(); for (const g of gruposPool) g.clear();
    return raizG;
  }

  // ---------- ayudas de movimiento (funciones puras del tiempo) ----------
  const ayuda = {
    // Cámara que orbita alrededor de un punto: ang en radianes.
    orbita: (centro, radio, ang, alto) => ({ desde: [centro[0] + Math.sin(ang) * radio, centro[1] + alto, centro[2] + Math.cos(ang) * radio], hacia: centro }),
    // Caída con rebotes desde altura h: devuelve la altura en el tiempo t (g = 9.8, pierde energía en cada rebote).
    caida: (t, h, rebote = .45) => {
      let v = 0, y = h, tt = 0; const g = 9.8, dt = 1 / 120;
      for (; tt < t; tt += dt) { v -= g * dt; y += v * dt; if (y < 0) { y = 0; v = -v * rebote; if (Math.abs(v) < .4) v = 0; } }
      return y;
    },
    // Temblor determinista (motor forzado, algo a punto de romperse).
    tiembla: (T, fuerza = .05, frec = 30) => [Math.sin(T * frec) * fuerza, Math.sin(T * frec * 1.3 + 1) * fuerza * .6, Math.sin(T * frec * .7 + 2) * fuerza],
    mezcla: (a, b, k) => a.map((v, i) => v + (b[i] - v) * k),
  };

  window.T3 = { cuadro, ...ayuda, ANCHO, ALTO };
})();
