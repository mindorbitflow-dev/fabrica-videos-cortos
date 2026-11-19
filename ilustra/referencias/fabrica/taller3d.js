// Taller 3D (T3): escenas en 3D low-poly para el formato "construir desde la falla" (nicho con `motor: 3d`).
// Modo inmediato, igual que el kit 2D: cada cuadro se dibuja entero a partir del tiempo, sin estado guardado.
//
//   (ctx, t, d, K, T) => T3.cuadro(ctx, T, { camara: { desde: [8, 5, 10], hacia: [0, 1, 0], fov: 38 }, mundo: { muro: true } }, P => {
//     P.caja({ pos: [0, 1, 0], tam: [2, 1, 1], color: '#f5a623' });
//     P.helice({ pos: [0, 2, 0], giro: T * 30 });
//   }, (c, P) => K.pastilla(c, 'MOTOR', ...P.pantalla([0, 2, 0]), 1, true));   // 2D encima (opcional)
//
// mundo: afuera { muro, pista, arboles, pasto, cielo } o, para objetos de casa, { interior: true } (piso y pared de cocina).
// Unidades: 1 = 1 metro aprox. Y hacia arriba; el suelo es y=0. Ángulos en radianes. Colores CSS.
// pos/rot/esc son [x, y, z]. Todo lo que se dibuja dentro de P.grupo({pos, rot, esc}, () => ...) se mueve con el grupo.
(() => {
  const ANCHO = 1080, ALTO = 1920;
  // Calidad del 3D: se dibuja a menor resolución y se escala al lienzo (WebGL va por software en GitHub: es lo que más tarda).
  const Q = Object.assign({ escala: .75, sombra: 1024, suavizado: true }, window.T3_CALIDAD || {});
  // Color: la luz ambiental fuerte lava los colores (salen "crema"); menos ambiente, más sol y un realce final de saturación.
  const VIVO = Object.assign({ saturacion: 1.45, contraste: 1.1, brillo: 1.02 }, window.T3_COLOR || {});
  const AN3 = Math.round(ANCHO * Q.escala), AL3 = Math.round(ALTO * Q.escala);
  let R = null, escena, camara, sol, hemi, mundo = {}, listo = false;
  const geo = {}, mats = new Map(), pools = {}, usados = {};
  let pila = [], gruposPool = [], gruposUsados = 0;

  function iniciar() {
    if (R) return;
    const lienzo = document.createElement('canvas'); lienzo.width = AN3; lienzo.height = AL3;
    R = new THREE.WebGLRenderer({ canvas: lienzo, antialias: Q.suavizado, preserveDrawingBuffer: true });
    R.setPixelRatio(1); R.setSize(AN3, AL3, false);
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    escena = new THREE.Scene();
    camara = new THREE.PerspectiveCamera(38, ANCHO / ALTO, 0.05, 600);
    hemi = new THREE.HemisphereLight('#ffffff', '#8fae6a', 1.7); escena.add(hemi);
    sol = new THREE.DirectionalLight('#fff4e0', 3.2); sol.position.set(14, 26, 10); sol.castShadow = true;
    sol.shadow.mapSize.set(Q.sombra, Q.sombra); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02;
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
      c.width = c.height = 512; g.fillStyle = '#5fb83a'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2600; i++) {
        const x = hash(i) * 512, y = hash(i + 9e3) * 512, l = 4 + hash(i + 3e3) * 9;
        g.strokeStyle = ['#4fae2c', '#8be05a', '#5fbd36', '#9ae86a'][i % 4]; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i + 7) - .5) * 4, y - l); g.stroke();
      }
      rep = [40, 40];
    } else if (nombre === 'ladrillo') {
      c.width = 512; c.height = 256; g.fillStyle = '#f1dcb5'; g.fillRect(0, 0, 512, 256);
      for (let f = 0; f < 8; f++) for (let k = -1; k < 9; k++) {
        const x = k * 64 + (f % 2) * 32, y = f * 32, v = hash(f * 31 + k) * 30 - 15;
        g.fillStyle = `rgb(${206 + v},${88 + v * .6},${58 + v * .4})`; g.fillRect(x + 2, y + 2, 60, 28);
      }
      rep = [6, 1];
    } else if (nombre === 'baldosa') {
      c.width = c.height = 256; g.fillStyle = '#1e8fa6'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        g.fillStyle = (i + j) % 2 ? '#f7f3ea' : '#2fc4d6'; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
      }
      rep = [30, 30];
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
    // Interior (objetos de casa): piso de baldosas y pared de cocina.
    const interior = new THREE.Group();
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), material('#ffffff', { mapa: 'baldosa' }));
    piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; interior.add(piso);
    const pared = new THREE.Mesh(new THREE.BoxGeometry(60, 14, .4), material('#ffcf5a'));
    pared.position.set(0, 7, -7); pared.receiveShadow = true; interior.add(pared);
    const zocalo = new THREE.Mesh(new THREE.BoxGeometry(60, .4, .5), material('#e2553f'));
    zocalo.position.set(0, .2, -6.9); interior.add(zocalo);
    escena.add(interior); mundo.interior = interior;
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
    // Persona low-poly (mide ~1,75 m con esc 1; mira hacia +Z; los pies quedan en y=0 salvo en 'salta', 'cae' y 'acostado').
    //   pose: 'parado' | 'camina' | 'corre' | 'salta' | 'cae' | 'agachado' | 'protege' | 'sentado' | 'acostado'
    //   T (tiempo, anima caminar/correr/agitar), susto 0-1 (ojos grandes, boca abierta), inclina (torso hacia delante, rad),
    //   colores: { piel, camisa, pantalon, pelo, zapatos }. `art` sobrescribe ángulos: { piernaI, piernaD, rodillaI, rodillaD,
    //   brazoI, brazoD (hacia delante), abreI, abreD (hacia afuera), codoI, codoD }.
    persona: (o = {}) => {
      const T = o.T || 0, pose = o.pose || 'parado', c = { piel: '#f1c7a3', camisa: '#f08c2e', pantalon: '#3d5a80', pelo: '#3b2a20', zapatos: '#2b2b2e', ...(o.colores || {}) };
      const s = Math.sin, A = { piernaI: 0, piernaD: 0, rodillaI: 0, rodillaD: 0, brazoI: .05, brazoD: .05, abreI: .12, abreD: .12, codoI: .15, codoD: .15 };
      let inclina = o.inclina || 0, apoyo = true;
      if (pose === 'camina' || pose === 'corre') {
        const k = pose === 'corre' ? 1 : .55, f = pose === 'corre' ? 11 : 6.5, ph = T * f;
        A.piernaI = s(ph) * .7 * k; A.piernaD = -s(ph) * .7 * k;
        A.rodillaI = Math.max(0, -s(ph + .9)) * 1.3 * k + .1; A.rodillaD = Math.max(0, s(ph + .9)) * 1.3 * k + .1;
        A.brazoI = -s(ph) * .8 * k; A.brazoD = s(ph) * .8 * k; A.codoI = A.codoD = pose === 'corre' ? 1.5 : .35;
        if (pose === 'corre') inclina += .22;
      } else if (pose === 'salta') {
        Object.assign(A, { piernaI: .5, piernaD: .4, rodillaI: 1.1, rodillaD: 1, brazoI: 2.7, brazoD: 2.7, abreI: .35, abreD: .35, codoI: .2, codoD: .2 }); apoyo = false;
      } else if (pose === 'cae') {
        const w = s(T * 13) * .45;
        Object.assign(A, { piernaI: .35 + s(T * 9) * .3, piernaD: -.1 - s(T * 9) * .3, rodillaI: .6, rodillaD: .9, brazoI: 2.6 + w, brazoD: 2.6 - w, abreI: .6, abreD: .6, codoI: .4, codoD: .4 }); apoyo = false;
      } else if (pose === 'agachado') {
        Object.assign(A, { piernaI: 1.25, piernaD: 1.25, rodillaI: 2.3, rodillaD: 2.3, brazoI: .9, brazoD: .9, codoI: .9, codoD: .9 }); inclina += .35;
      } else if (pose === 'protege') {
        Object.assign(A, { piernaI: 1.15, piernaD: 1.15, rodillaI: 2.2, rodillaD: 2.2, brazoI: 2.5, brazoD: 2.5, abreI: .35, abreD: .35, codoI: 1.9, codoD: 1.9 }); inclina += .6;
      } else if (pose === 'sentado') {
        Object.assign(A, { piernaI: 1.5, piernaD: 1.5, rodillaI: 1.5, rodillaD: 1.5, brazoI: .5, brazoD: .5, codoI: .8, codoD: .8 });
      } else if (pose === 'acostado') {
        Object.assign(A, { abreI: .45, abreD: .45, brazoI: .1, brazoD: .1, codoI: .1, codoD: .1, piernaI: .05, piernaD: -.05 }); apoyo = false;
      }
      Object.assign(A, o.art || {});
      // altura de la cadera para que el pie más bajo toque el suelo
      const pie = (a, b) => .44 * Math.cos(a) + .44 * Math.cos(a - b) + .07;
      const cadera = pose === 'sentado' ? .5 : apoyo ? Math.max(pie(A.piernaI, A.rodillaI), pie(A.piernaD, A.rodillaD)) : .95;
      const acostado = pose === 'acostado';
      P.grupo({ pos: o.pos, rot: o.rot, esc: o.esc ?? 1 }, () => P.grupo({ pos: acostado ? [0, .16, .95] : [0, 0, 0], rot: acostado ? [-Math.PI / 2, 0, 0] : [0, 0, 0] }, () => {
        const yH = acostado ? .95 : cadera;
        // piernas
        for (const [lado, a, b] of [[-1, A.piernaI, A.rodillaI], [1, A.piernaD, A.rodillaD]]) {
          const H = [lado * .1, yH, 0], K = [H[0], H[1] - .44 * Math.cos(a), .44 * Math.sin(a)], F = [H[0], K[1] - .44 * Math.cos(a - b), K[2] + .44 * Math.sin(a - b)];
          P.tubo({ de: H, a: K, r: .075, color: c.pantalon }); P.esfera({ pos: K, r: .075, color: c.pantalon });
          P.tubo({ de: K, a: F, r: .065, color: c.pantalon });
          P.caja({ pos: [F[0], F[1] - .02, F[2] + .06], rot: [-(a - b) * .2, 0, 0], tam: [.12, .09, .26], color: c.zapatos });
        }
        P.esfera({ pos: [0, yH, 0], r: .17, esc: [1.05, .6, .8], color: c.pantalon });
        // torso, cabeza y brazos (se inclinan juntos desde la cadera)
        P.grupo({ pos: [0, yH, 0], rot: [inclina, 0, 0] }, () => {
          P.cilindro({ pos: [0, .27, 0], r: .19, r2: .14, alto: .56, color: c.camisa });
          P.esfera({ pos: [0, .55, 0], r: .19, esc: [1.15, .45, .8], color: c.camisa });
          P.cilindro({ pos: [0, .64, 0], r: .055, alto: .12, color: c.piel });
          const y0 = .8, ojo = .016 * (1 + (o.susto || 0) * .45);
          P.esfera({ pos: [0, y0, 0], r: .135, esc: [1, 1.08, 1], color: c.piel });
          P.esfera({ pos: [0, y0 + .045, -.02], r: .14, esc: [1.04, .8, 1.02], color: c.pelo });
          for (const x of [-.048, .048]) {
            P.esfera({ pos: [x, y0 + .015, .118], r: ojo * 1.7, color: '#ffffff', sombra: false });
            P.esfera({ pos: [x + (o.mira || 0) * .01, y0 + .015, .132], r: ojo * .8, color: '#1b1b1b', sombra: false });
          }
          if ((o.susto || 0) > .3 || o.boca === 'o') P.esfera({ pos: [0, y0 - .06, .118], r: .022 + (o.susto || 0) * .012, esc: [1, 1.3, .5], color: '#5a2320', sombra: false });
          else P.caja({ pos: [0, y0 - .058, .125], tam: [.05, .012, .01], color: '#5a2320', sombra: false });
          for (const [lado, p, r, e] of [[-1, A.brazoI, A.abreI, A.codoI], [1, A.brazoD, A.abreD, A.codoD]]) {
            const S = [lado * .22, .5, 0];
            const d1 = [lado * Math.sin(r), -Math.cos(r) * Math.cos(p), Math.cos(r) * Math.sin(p)];
            const d2 = [lado * Math.sin(r), -Math.cos(r) * Math.cos(p + e), Math.cos(r) * Math.sin(p + e)];
            const E = S.map((v, i) => v + d1[i] * .29), M = E.map((v, i) => v + d2[i] * .27);
            P.esfera({ pos: S, r: .07, color: c.camisa });
            P.tubo({ de: S, a: E, r: .06, color: c.camisa }); P.esfera({ pos: E, r: .055, color: c.piel });
            P.tubo({ de: E, a: M, r: .05, color: c.piel }); P.esfera({ pos: M, r: .06, color: c.piel });
          }
        });
      }));
    },
    // Animales low-poly (miran hacia +Z, patas en y=0). tipo: 'oso' | 'perro' | 'lobo' | 'tigre' | 'toro' | 'cocodrilo' |
    //   'tiburon' | 'serpiente'. accion: 'quieto' | 'camina' | 'corre' | 'ataca' (embiste con la boca abierta) | 'erguido' (oso de
    //   pie). boca 0-1 (abierta), T (anima). Caricatura: dientes blancos, nunca sangre.
    animal: (o = {}) => {
      const tipo = o.tipo || 'perro', T = o.T || 0, acc = o.accion || 'quieto';
      if (tipo === 'tiburon') return tiburon(o);
      if (tipo === 'serpiente') return serpiente(o);
      const B = { // largo, alto de patas, radio del cuerpo, cabeza, hocico, colores
        oso: { L: 1.9, h: .55, r: .55, c: .38, ho: .22, col: '#6b4226', vientre: '#8a5a36', nariz: '#1b1b1b', oreja: 'redonda', cola: .12 },
        perro: { L: 1.1, h: .45, r: .26, c: .22, ho: .16, col: '#c8843a', vientre: '#f3d29b', nariz: '#1b1b1b', oreja: 'punta', cola: .45 },
        lobo: { L: 1.3, h: .55, r: .28, c: .24, ho: .2, col: '#7d8590', vientre: '#d9dde2', nariz: '#1b1b1b', oreja: 'punta', cola: .6 },
        tigre: { L: 1.9, h: .6, r: .36, c: .3, ho: .16, col: '#f28c1e', vientre: '#fff1d6', nariz: '#e07a8a', oreja: 'redonda', cola: 1, rayas: true },
        toro: { L: 2.2, h: .7, r: .55, c: .36, ho: .2, col: '#3b2a24', vientre: '#5a4034', nariz: '#d99a8a', oreja: 'punta', cola: .7, cuernos: true },
        cocodrilo: { L: 3.2, h: .22, r: .3, c: .26, ho: .75, col: '#4f8a3a', vientre: '#c9d97a', nariz: '#2c4a22', oreja: null, cola: 1.8, plano: true },
      }[tipo];
      if (o.ajuste) Object.assign(B, o.ajuste);   // p. ej. puma = tigre con { col: '#c8955a', vientre: '#f1dcb5', rayas: false }
      const corre = acc === 'corre' || acc === 'ataca', f = acc === 'camina' ? 6 : corre ? 12 : 0, amp = acc === 'camina' ? .35 : corre ? .7 : 0;
      const ataque = acc === 'ataca' ? Math.max(0, Math.sin(T * 6)) : 0, boca = Math.max(o.boca || 0, acc === 'ataca' ? .4 + .6 * ataque : 0);
      const erguido = acc === 'erguido';
      P.grupo({ pos: o.pos, rot: o.rot, esc: o.esc ?? 1 }, () => P.grupo({ pos: [0, erguido ? B.L * .2 : 0, ataque * .4], rot: [erguido ? -1.2 : -ataque * .15, 0, 0] }, () => {
        const y = B.h + B.r * (B.plano ? .5 : .9), ancho = B.plano ? 1.1 : .85;
        P.esfera({ pos: [0, y, 0], r: 1, esc: [B.r * ancho, B.r * (B.plano ? .55 : 1), B.L / 2], color: B.col });
        P.esfera({ pos: [0, y - B.r * .3, .05], r: 1, esc: [B.r * ancho * .8, B.r * .7, B.L / 2 * .8], color: B.vientre });
        if (B.rayas) for (let i = -2; i <= 2; i++) P.toro({ pos: [0, y, i * B.L * .16], r: B.r * .97, grosor: .05, color: '#1b1b1b' });
        // patas (pares diagonales)
        for (const [x, z, fase] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) {
          const a = Math.sin(T * f + fase) * amp, top = [x * B.r * .55, y - B.r * .4, z * B.L * .32];
          const pie = [top[0], erguido && z < 0 ? .02 : .06, top[2] + Math.sin(a) * B.h];
          P.tubo({ de: top, a: pie, r: B.r * (B.plano ? .2 : .26), color: B.col });
          P.esfera({ pos: pie, r: B.r * (B.plano ? .22 : .28), esc: [1, .6, 1.2], color: B.col });
        }
        // cola
        const cy = Math.sin(T * 4) * .3;
        P.tubo({ de: [0, y, -B.L / 2 * .9], a: [Math.sin(cy) * B.cola * .5, y + (B.plano ? -.05 : B.cola * .35), -B.L / 2 - B.cola], r: B.plano ? .16 : .05, color: B.col });
        // cabeza
        const hz = B.L / 2 + B.c * .5, hy = y + (B.plano ? 0 : B.r * .45);
        P.grupo({ pos: [0, hy, hz], rot: [-(o.mira || 0) * .3 + (erguido ? 1.2 : 0), 0, 0] }, () => {
          P.esfera({ r: B.c, esc: [1, B.plano ? .6 : 1, 1], color: B.col });
          // hocico: mandíbula de arriba fija y la de abajo se abre
          const hl = B.ho + B.c * .6;
          P.caja({ pos: [0, B.plano ? 0 : -B.c * .15, B.c * .55 + hl / 2 - B.c * .3], tam: [B.c * (B.plano ? 1.2 : .9), B.c * .45, hl], color: B.vientre });
          P.grupo({ pos: [0, -B.c * .38, B.c * .25], rot: [boca * .7, 0, 0] }, () => {
            P.caja({ pos: [0, 0, hl / 2], tam: [B.c * (B.plano ? 1.15 : .8), B.c * .22, hl], color: B.vientre });
            if (boca > .15) for (let i = 0; i < 4; i++) for (const sx of [-1, 1])
              P.cono({ pos: [sx * B.c * .3, B.c * .16, hl * (.25 + i * .22)], r: .025 * B.c * 4, alto: .07 * B.c * 4, color: '#ffffff', sombra: false });
          });
          if (boca > .15) for (let i = 0; i < 4; i++) for (const sx of [-1, 1])
            P.cono({ pos: [sx * B.c * .3, -B.c * .38, B.c * .25 + hl * (.25 + i * .22)], rot: [Math.PI, 0, 0], r: .025 * B.c * 4, alto: .07 * B.c * 4, color: '#ffffff', sombra: false });
          P.esfera({ pos: [0, B.plano ? B.c * .12 : -B.c * .02, B.c * .55 + hl - B.c * .3], r: B.c * .17, color: B.nariz });
          for (const sx of [-1, 1]) {
            P.esfera({ pos: [sx * B.c * .42, B.c * .32, B.c * .62], r: B.c * .17, color: '#ffffff', sombra: false });
            P.esfera({ pos: [sx * B.c * .42, B.c * .32, B.c * .76], r: B.c * .09, color: '#1b1b1b', sombra: false });
            if (acc === 'ataca' || o.enojado) P.caja({ pos: [sx * B.c * .4, B.c * .52, B.c * .6], rot: [0, 0, sx * .45], tam: [B.c * .4, B.c * .07, B.c * .1], color: '#1b1b1b', sombra: false });
            if (B.oreja === 'punta') P.cono({ pos: [sx * B.c * .55, B.c * .85, -B.c * .1], rot: [0, 0, -sx * .3], r: B.c * .25, alto: B.c * .55, color: B.col });
            if (B.oreja === 'redonda') P.esfera({ pos: [sx * B.c * .62, B.c * .72, -B.c * .1], r: B.c * .26, esc: [1, 1, .5], color: B.col });
            if (B.cuernos) P.tubo({ de: [sx * B.c * .5, B.c * .6, 0], a: [sx * B.c * 1.4, B.c * 1.2, B.c * .3], r: B.c * .1, color: '#f3ead2' });
          }
        });
      }));
    },
    // Enjambre de abejas alrededor de un punto (persigue si mueves `pos`).
    enjambre: (o) => {
      const n = o.n ?? 25, R0 = o.r ?? 1.2, T = o.T || 0;
      for (let i = 0; i < n; i++) {
        const a = T * (3 + hash(i) * 3) + i * 2.4, b = T * (2 + hash(i + 5) * 2) + i;
        const p = [o.pos[0] + Math.cos(a) * R0 * (.3 + hash(i + 1) * .7), o.pos[1] + Math.sin(b) * R0 * .5, o.pos[2] + Math.sin(a) * R0 * (.3 + hash(i + 2) * .7)];
        P.esfera({ pos: p, r: .06, esc: [1, .9, 1.4], color: '#ffc61a', sombra: false });
        P.esfera({ pos: [p[0], p[1], p[2] - .03], r: .045, esc: [1.1, 1, .4], color: '#1b1b1b', sombra: false });
        const w = Math.sin(T * 60 + i) * .5;
        for (const s of [-1, 1]) P.disco({ pos: [p[0] + s * .06, p[1] + .05, p[2]], rot: [-Math.PI / 2 + w * s, 0, 0], r: .05, color: '#ffffff', opacidad: .6, sombra: false });
      }
    },
    // Piloto de la página Así se fabrica: un patito de hule.
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

  // Tiburón (nada hacia +Z; boca 0-1) y serpiente (cuerpo ondulado; 'ataca' levanta la cabeza).
  function tiburon(o) {
    const T = o.T || 0, ataque = o.accion === 'ataca' ? Math.max(0, Math.sin(T * 5)) : 0, boca = Math.max(o.boca || 0, ataque), ond = Math.sin(T * 5) * .25;
    P.grupo({ pos: o.pos, rot: o.rot, esc: o.esc ?? 1 }, () => {
      P.esfera({ pos: [0, 0, 0], r: 1, esc: [.55, .6, 2], color: '#6f8fa8' });
      P.esfera({ pos: [0, -.18, .2], r: 1, esc: [.45, .4, 1.7], color: '#eef3f6' });
      P.caja({ pos: [0, .75, -.1], rot: [-.5, 0, 0], tam: [.08, .8, .6], color: '#6f8fa8' });
      for (const s of [-1, 1]) P.caja({ pos: [s * .6, -.25, .5], rot: [.3, 0, s * .5], tam: [.7, .06, .4], color: '#6f8fa8' });
      P.grupo({ pos: [0, 0, -1.9], rot: [0, ond, 0] }, () => {
        P.caja({ pos: [0, .35, -.35], rot: [.7, 0, 0], tam: [.08, .9, .3], color: '#6f8fa8' });
        P.caja({ pos: [0, -.25, -.25], rot: [-.7, 0, 0], tam: [.08, .6, .25], color: '#6f8fa8' });
      });
      P.grupo({ pos: [0, -.2, 1.6], rot: [boca * .6, 0, 0] }, () => {
        P.caja({ pos: [0, 0, .2], tam: [.6, .1, .5], color: '#eef3f6' });
        if (boca > .15) for (let i = 0; i < 5; i++) P.cono({ pos: [(i - 2) * .11, .08, .4], r: .035, alto: .1, color: '#ffffff', sombra: false });
      });
      if (boca > .15) for (let i = 0; i < 5; i++) P.cono({ pos: [(i - 2) * .11, -.12, 1.85], rot: [Math.PI, 0, 0], r: .035, alto: .1, color: '#ffffff', sombra: false });
      for (const s of [-1, 1]) { P.esfera({ pos: [s * .32, .12, 1.45], r: .07, color: '#ffffff', sombra: false }); P.esfera({ pos: [s * .35, .12, 1.5], r: .045, color: '#1b1b1b', sombra: false }); }
    });
  }
  function serpiente(o) {
    const T = o.T || 0, n = 22, L = o.largo ?? 2.4, ataca = o.accion === 'ataca', alza = ataca ? .6 : 0;
    P.grupo({ pos: o.pos, rot: o.rot, esc: o.esc ?? 1 }, () => {
      let prev = null;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), z = (u - .5) * L, x = Math.sin(u * 9 - T * 4) * .25 * (1 - u * .3);
        const y = .1 + (u > .75 ? Math.pow((u - .75) / .25, 2) * alza : 0), r = .09 * (1 - Math.abs(u - .6) * .7);
        const p = [x, y, z];
        P.esfera({ pos: p, r, color: i % 3 === 0 ? '#e0b030' : '#3f7a2c' });
        if (prev) P.tubo({ de: prev, a: p, r: r * .95, color: '#3f7a2c' });
        prev = p;
      }
      const [hx, hy, hz] = prev, boca = ataca ? .5 + .5 * Math.sin(T * 8) : 0;
      P.esfera({ pos: [hx, hy + .02, hz + .1], r: .13, esc: [1, .65, 1.4], color: '#3f7a2c' });
      for (const s of [-1, 1]) { P.esfera({ pos: [hx + s * .08, hy + .08, hz + .18], r: .035, color: '#ffe14d', sombra: false }); P.esfera({ pos: [hx + s * .09, hy + .09, hz + .2], r: .018, color: '#1b1b1b', sombra: false }); }
      const len = .12 + .12 * Math.max(0, Math.sin(T * 14));
      P.tubo({ de: [hx, hy, hz + .26], a: [hx, hy - .02, hz + .26 + len], r: .012, color: '#e5484d' });
      if (boca > .2) for (const s of [-1, 1]) P.cono({ pos: [hx + s * .04, hy - .05, hz + .22], rot: [Math.PI, 0, 0], r: .015, alto: .07, color: '#ffffff', sombra: false });
    });
  }

  // Posición en pantalla (px del lienzo 1080x1920) de un punto 3D, para poner rótulos 2D encima.
  P.pantalla = (p) => { const v = new THREE.Vector3(...p).project(camara); return [(v.x + 1) / 2 * ANCHO, (1 - v.y) / 2 * ALTO]; };

  // ---------- cuadro ----------
  function cuadro(ctx, T, conf, dibujar, encima) {
    if (!window.THREE) throw new Error('falta three.js (el nicho debe tener motor: 3d)');
    iniciar();
    const m = conf.mundo || {};
    const dentro = !!m.interior, cielo = m.cielo || (dentro ? '#ffe9b3' : '#8fd3f5');
    escena.background = new THREE.Color(cielo);
    escena.fog = m.niebla === false ? null : new THREE.Fog(cielo, m.nieblaDesde ?? (dentro ? 20 : 30), m.nieblaHasta ?? 110);
    hemi.groundColor.set(dentro ? '#c9a77a' : m.pasto === false ? '#6c7a8f' : '#7fb34f');
    mundo.pasto.visible = !dentro && m.pasto !== false; mundo.muro.visible = !dentro && !!m.muro;
    mundo.arboles.visible = !dentro && m.arboles !== false; mundo.pista.visible = !dentro && !!m.pista; mundo.interior.visible = dentro;
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
    ctx.imageSmoothingQuality = 'high';
    ctx.save(); ctx.filter = `saturate(${VIVO.saturacion}) contrast(${VIVO.contraste}) brightness(${VIVO.brillo})`;
    ctx.drawImage(R.domElement, 0, 0, ANCHO, ALTO); ctx.restore();
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
