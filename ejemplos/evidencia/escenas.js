// "Tu diamante es publicidad" — Sombra de Evidencia, serie ORIGEN OCULTO (~95 s, 26 escenas). Tito llega con algo cotidiano y Sombra le revela su origen.
// Mismo vocabulario que ejemplos/evidencia_mito (léelo también):
//  - SIN zoom animado: encuadre z fijo por plano; el ritmo sale de CORTES entre planos fijos (K.corte), paneos con paralaje, `frente` que se mueve más que la
//    acción (K.plano), personajes que ACTÚAN (S30.actua / S30.camina) y objetos que entran, caen o golpean (K.golpe).
//  - La oficina de Sombra va SIEMPRE en cuadro completo (z = 1) y cámara fija; los primeros planos se hacen con la escala del personaje.
//  - Escala coherente: los objetos que comparten cuadro con un personaje respetan su proporción; el objeto pequeño que es protagonista (el anillo, el diamante)
//    se muestra grande solo en planos de DETALLE sin personajes.
//  - Los flashbacks componen decorados (D.fondo.*) y props (D.vitrina, D.mina, D.estante, D.papel...): nada de fondos planos ni props dibujados a mano.
(() => {
  const { W, H, TAU, clamp, lerp, prog, sale, rebote, hash, alfa } = K;
  const C = S30.C;

  // ---------------------------------------------------------------- ayudantes
  const diamante = (ctx, x, y, r, T, { oro = 0, brillo = 1, gira = 0 } = {}) => D.joya(ctx, x, y, r, { T, oro, brillo, gira });
  const pastilla = (ctx, txt, x, y, a, oro = false) =>
    K.pastilla(ctx, txt, x, y, { tam: 36, fondo: oro ? C.oro : C.papel, color: C.tinta, opacidad: a, escala: rebote(a) });
  const ano = (ctx, txt, t, y = 210, tam = 72) => S30.titulo(ctx, txt, 540, y, { tam, opacidad: prog(t, .05, .4) });
  const FIJO = { x: 540, y: 760, z: 1 };
  const oficina = (ctx, t, d, T, fn, frente = null) =>
    K.plano(ctx, t, d, { de: FIJO, a: FIJO, T, mano: .6, paralaje: .7, frente, fondo: () => S30.oficina(ctx, T) }, fn);
  const marco = (lado = -1, ancho = 110, a = .88) => ctx => {
    const x0 = lado < 0 ? -60 : W + 60 - ancho, g = ctx.createLinearGradient(x0, 0, x0 + ancho, 0);
    g.addColorStop(lado < 0 ? 0 : 1, alfa(C.tinta, a)); g.addColorStop(lado < 0 ? 1 : 0, alfa(C.tinta, 0));
    ctx.fillStyle = g; ctx.fillRect(x0, -40, ancho + 60, H + 80);
  };
  const SOMBRA_Y = 1190, TITO_Y = 1250;
  const detalle = (ctx, t, d, T, tema, de, a, fn, frente = null) =>
    K.plano(ctx, t, d, { de, a, T, mano: .4, paralaje: .4, frente, fondo: () => D.fondo.abstracto(ctx, T, { tema, y: 700 }) }, fn);
  // Anillo con diamante y halo ámbar (detalle). s = escala (1 ≈ 90 px de ancho).
  function anillo(ctx, x, y, s, T, { oro = 1 } = {}) {
    if (oro > .5) K.halo(ctx, x, y - 20 * s, 110 * s, C.oro, .3 * oro);
    D.joya(ctx, x, y - 20 * s, 44 * s, { tipo: 'anillo', oro, T });
  }

  window.ESCENAS = [
    // 1. GANCHO. Tito entra caminando con la cajita, se planta y la abre: se espanta al recordar lo que pagó.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = S30.camina(t, d, 40, 560, { hasta: .33, alto: 344 * 1.7 }), llega = c.paso === null;
      oficina(ctx, t, d, T, () => {
        S30.tito(ctx, c.x, TITO_Y + 20, 1.7, Object.assign({ T, dir: -1, objeto: 'caja', boca: 'habla', expresion: llega ? 'susto' : 'alegre' }, llega ? { pose: 'traeObjeto' } : { pose: 'camina', paso: c.paso }));
      }, marco(1));
      pastilla(ctx, '2 SUELDOS', 540, 420, prog(t, d * .5, d * .5 + .3), true);
      S30.pelicula(ctx, T);
    },
    // 2. Sombra se levanta detrás del escritorio, serio: "no es mala suerte, es un plan".
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficina(ctx, t, d, T, () => {
        S30.detective(ctx, 420, SOMBRA_Y, 1.6, Object.assign({ T, mira: .5, habla: 1, boca: 'sonrisa' }, S30.actua(t, d, [[0, 'cruzado'], [.4, 'explicar'], [.8, 'senalar']])));
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 860, TITO_Y - Math.abs(Math.sin(T * 5)) * 24, 1.3, { T, dir: -1, objeto: 'caja', mira: -.6, boca: 'o' });
        const g = sale(prog(t, d * .45, d * .7)); if (g > 0) K.halo(ctx, 860, 760, 420 * g, C.terracota, .25 * g);   // se enciende la alarma
      }, marco(-1));
      S30.pelicula(ctx, T);
    },
    // 3. "¡Yo lo compré por amor!": Tito salta indignado; corte a Sombra, de brazos cruzados, impasible.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .7]), salto = Math.max(0, Math.sin(clamp((t - .15) / .5) * Math.PI)) * 60;
      oficina(ctx, c.t, c.d, T, () => {
        if (c.i === 0) {
          S30.detective(ctx, 300, SOMBRA_Y, 1.5, { T, mira: .7, pose: 'cruzado' });
          S30.escritorio(ctx, T, { y: 960 });
          S30.tito(ctx, 800, TITO_Y - salto, 1.7, Object.assign({ T, dir: -1, boca: 'habla', mira: -.7, expresion: 'enfado' }, S30.actua(t, d * .7, [[0, 'dePie'], [.25, 'asombrado'], [.6, 'senalar']])));
        } else { S30.detective(ctx, 540, SOMBRA_Y, 2.0, { T, mira: .2, pose: 'cruzado', boca: 'sonrisa' }); S30.escritorio(ctx, T, { y: 960 }); }
      });
      S30.pelicula(ctx, T);
    },
    // 4. El expediente cae sobre el escritorio con un golpe: DE BEERS.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const cae = sale(prog(t, d * .1, d * .4));
      ctx.save(); ctx.translate(0, K.golpe(t, d * .4, 16));
      oficina(ctx, t, d, T, () => {
        S30.detective(ctx, 330, SOMBRA_Y, 1.7, Object.assign({ T, mira: .6, habla: 1 }, S30.actua(t, d, [[0, 'dePie'], [.3, 'explicar'], [.8, 'senalar']])));
        S30.escritorio(ctx, T, { y: 960 });
        if (cae > 0) D.papel(ctx, 700, lerp(100, 880, cae), 380, 480, { giro: lerp(.6, -.05, cae), titular: 'DE BEERS', lineas: 4 });
        S30.tito(ctx, 900, TITO_Y, 1.3, { T, dir: -1, mira: -.6, expresion: 'duda' });
      });
      ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 5. Sudáfrica: la mina gigante; paneo hacia el fondo del hoyo y obreros que cruzan en primer plano.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 540, y: 650, z: 1.15 }, a: { x: 560, y: 900 }, T, mano: .8, paralaje: .5, fondo: () => D.fondo.exterior(ctx, T, { tipo: 'mina', hora: 'dia' }),
        frente: ctx2 => { for (const i of [0, 1]) S30.hombre(ctx2, lerp(i ? 1250 : -250, i ? 60 : 930, prog(t, 0, d)), 1250 + i * 60, 1.5, { T, semilla: 70 + i, variante: i ? 'anciano' : 'hombre', dir: i ? -1 : 1, paso: T * 1.5 + i, cara: 'serio' }); } }, () => {
        D.mina(ctx, 540, 760, 1, { T, niveles: 7 });
        for (let i = 0; i < 14; i++) {
          const a = hash(i) * TAU, nivel = Math.floor(hash(i + 3) * 6), rx = 470 - nivel * 58, ry = 230 - nivel * 30;
          const px = 540 + Math.cos(a + Math.sin(T * .4 + i) * .08) * rx * .92, py = 760 + nivel * 40 + Math.sin(a) * ry * .92 + 10;
          S30.hombre(ctx, px, py + 8, .3, { T, semilla: 60 + i, variante: 'hombre', dir: Math.cos(a) < 0 ? 1 : -1, paso: i % 3 ? T * 1.4 + i : null, gesto: Math.sin(T * 5 + i) > .3 ? 'senala' : 'quieto' });
        }
      });
      ano(ctx, 'SUDÁFRICA', t);
      S30.pelicula(ctx, T);
    },
    // 6. Pánico en la sala de juntas: los dueños se alarman uno tras otro; paneo a lo largo de la mesa.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 380, y: 800, z: 1.1 }, a: { x: 700, y: 800 }, T, mano: .5, paralaje: .55, fondo: () => D.fondo.juntas(ctx, T, { hora: 'atardecer' }), frente: marco(1, 160, .9) }, () => {
        for (let i = 0; i < 4; i++) S30.hombre(ctx, 200 + i * 250, 1200, 1.15, Object.assign({ T, semilla: 20 + i, dir: i < 2 ? 1 : -1, cara: 'serio' }, S30.actua(t, d, [[0, 'dePie'], [.15 + i * .18, 'susto'], [1, 'susto']])));
        D.mesaJuntas(ctx, 540, 1262, 1, { T });
      });
      pastilla(ctx, 'EL PÁNICO', 540, 290, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 7. Todas las minas bajo una sola empresa: cuatro papeles de mina se juntan en el centro y se apilan.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      detalle(ctx, t, d, T, 'tierra', { x: 540, y: 780, z: 1 }, { x: 540, y: 800 }, () => {
        const k = sale(prog(t, d * .1, d * .65));
        [[160, 480, -.1], [920, 520, .1], [180, 1080, .08], [900, 1040, -.08]].forEach(([px, py, g], i) => D.papel(ctx, lerp(px, 540, k), lerp(py, 790 + i * 8, k), 340, 440, { giro: g * (1 - k) + (i - 1.5) * .02 * k, titular: 'MINA ' + (i + 1), lineas: 3 }));
        pastilla(ctx, 'UNA SOLA EMPRESA', 540, 330, prog(t, d * .6, d * .6 + .3), true);
      });
      S30.pelicula(ctx, T);
    },
    // 8. Los diamantes bajo llave: la bodega se llena y el candado cae con golpe. Paneo hacia abajo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      ctx.save(); ctx.translate(0, K.golpe(t, d * .75, 16));
      K.plano(ctx, t, d, { de: { x: 540, y: 760, z: 1.1 }, a: { x: 540, y: 940 }, T, mano: .4, paralaje: .5, fondo: () => D.fondo.tienda(ctx, T, {}) }, () => {
        D.estante(ctx, 540, 1200, 1, { baldas: 3 });
        const llena = prog(t, d * .1, d * .6);
        for (let f = 0; f < 3; f++) for (let i = 0; i < 14; i++) if ((f * 14 + i) / 42 < llena) diamante(ctx, 150 + i * 60, 1200 - 400 + (f + 1) * 400 / 3 - 12 - 22, 20, T, { brillo: 0 });
        const cand = prog(t, d * .7, d * .85);
        if (cand > 0) { ctx.save(); ctx.translate(540, lerp(300, 880, sale(cand))); ctx.scale(rebote(cand), rebote(cand)); D.candado(ctx, 0, 0, 1.3, {}); ctx.restore(); }
        pastilla(ctx, 'BAJO LLAVE', 540, 700, prog(t, d * .5, d * .5 + .3), true);
      });
      ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 9. Tito: "¡Pero eso es trampa!": primer plano por escala, indignado; corte a Sombra.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .65]);
      oficina(ctx, c.t, c.d, T, () => {
        if (c.i === 0) S30.tito(ctx, 540, TITO_Y + 40, 2.2, Object.assign({ T, dir: -1, mira: .3, habla: 1, expresion: 'enfado' }, S30.actua(c.t, c.d, [[0, 'dePie'], [.35, 'asombrado'], [.8, 'senalar']])));
        else { S30.detective(ctx, 540, SOMBRA_Y, 2.0, { T, mira: -.2, boca: 'sonrisa', pose: 'dePie' }); S30.escritorio(ctx, T, { y: 960 }); }
      }, c.i === 0 ? marco(1) : null);
      S30.pelicula(ctx, T);
    },
    // 10. Pocos a la vez: una vitrina con UN solo diamante; la cámara baja de la vitrina al vacío.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 540, y: 640, z: 1.2 }, a: { x: 540, y: 900 }, T, mano: .4, paralaje: .5, fondo: () => D.fondo.tienda(ctx, T, {}) }, () => {
        D.vitrina(ctx, 540, 830, 1, { T });
        K.halo(ctx, 540, 590, 260, C.oro, .22 * (.8 + .2 * Math.sin(T * 3)));
        pastilla(ctx, 'UN TESORO', 540, 300, prog(t, d * .2, d * .2 + .3), true);
      });
      S30.pelicula(ctx, T);
    },
    // 11. Nadie compraba: la tienda vacía; el dueño, cabizbajo, se apoya en el mostrador.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 640, y: 800, z: 1.1 }, a: { x: 440, y: 800 }, T, mano: .5, paralaje: .55, fondo: () => D.fondo.tienda(ctx, T, { hora: 'noche' }), frente: marco(-1, 200, .92) }, () => {
        D.vitrina(ctx, 360, 1000, .8, { T });
        S30.hombre(ctx, 760, 1250, 1.7, Object.assign({ T, semilla: 41, variante: 'hombre', dir: -1, cara: 'serio' }, S30.actua(t, d, [[0, 'dePie'], [.4, 'cabizbajo'], [.9, 'manosBolsillos']])));
      });
      pastilla(ctx, 'NADIE COMPRABA', 540, 290, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 12. La agencia de publicidad: sala de juntas, caballete en blanco; la gente llega y se acomoda. Paneo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = [S30.camina(t, d, -150, 200, { hasta: .4, alto: 430 }), S30.camina(t, d, 1250, 880, { hasta: .45, alto: 430 })];
      K.plano(ctx, t, d, { de: { x: 640, y: 820, z: 1.1 }, a: { x: 440, y: 820 }, T, mano: .5, paralaje: .55, fondo: () => D.fondo.juntas(ctx, T, { hora: 'atardecer' }) }, () => {
        D.pizarra(ctx, 540, 860, 1.3, { ancho: 380, alto: 280, dibuja: () => {} });
        S30.hombre(ctx, c[0].x, 1230, 1.3, { T, semilla: 22, dir: 1, paso: c[0].paso, cara: 'sonrisa', pose: c[0].paso === null ? 'senalar' : undefined });
        S30.hombre(ctx, c[1].x, 1230, 1.3, { T, semilla: 23, variante: 'mujer', dir: -1, paso: c[1].paso, cara: 'serio' });
        D.mesaJuntas(ctx, 540, 1262, 1, { T });
      });
      pastilla(ctx, 'AGENCIA DE PUBLICIDAD', 540, 290, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 13. DETALLE: la pizarra grande; el corazón con el diamante se dibuja trazo a trazo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const dib = prog(t, d * .15, d * .75);
      detalle(ctx, t, d, T, 'azul', { x: 540, y: 780, z: 1 }, { x: 540, y: 800 }, () => {
        K.halo(ctx, lerp(200, 900, prog(t, 0, d)), 700, 360, C.oro, .2);
        D.pizarra(ctx, lerp(1500, 540, sale(prog(t, 0, d * .3))), 840, 2.2, { ancho: 380, alto: 300, dibuja: (c, w, h) => {
          c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w * dib, h); c.clip();
          c.beginPath(); c.moveTo(0, 90); c.bezierCurveTo(-130, 10, -120, -90, 0, -40); c.bezierCurveTo(120, -90, 130, 10, 0, 90);
          c.strokeStyle = C.terracota; c.lineWidth = 9; c.stroke(); D.joya(c, 0, 5, 34, { brillo: 0 }); c.restore(); } });
        pastilla(ctx, 'UN SENTIMIENTO', 540, 300, prog(t, d * .6, d * .6 + .3), true);
      });
      S30.pelicula(ctx, T);
    },
    // 14. Joyas prestadas a estrellas de cine: la estrella camina al centro, alza el diamante y la cámara de cine dispara un flash.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = S30.camina(t, d, 1150, 720, { hasta: .45, alto: 430 * 1.5 * .95 });
      K.plano(ctx, t, d, { de: { x: 640, y: 900, z: 1.1 }, a: { x: 560, y: 880 }, T, mano: .5, paralaje: .55, fondo: () => D.fondo.estudio(ctx, T, {}) }, () => {
        ctx.strokeStyle = C.tinta; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(170, 60); ctx.lineTo(170, 380); ctx.stroke();
        D.foco(ctx, 170, 420, 1.1, { T, ang: .97, largo: 1000 });
        D.camaraCine(ctx, 250, 1240, 1.2, { T });
        if (c.paso !== null) S30.mujer(ctx, c.x, 1220, 1.5, { T, dir: -1, semilla: 12, paso: c.paso, cara: 'sonrisa' });
        else { const J = S30.mujer(ctx, c.x, 1220, 1.5, { T, dir: -1, semilla: 12, pose: 'saludar', cara: 'sonrisa' }); diamante(ctx, J.dedosD.x, J.dedosD.y - 30, 24, T); }
        const f = Math.max(0, 1 - Math.abs(t - d * .62) / .16);
        if (f > 0) K.halo(ctx, 440, 1130, 700, '#fff3d6', .75 * f);
      });
      pastilla(ctx, 'HOLLYWOOD', 540, 290, prog(t, .1, .4), true);
      S30.pelicula(ctx, T);
    },
    // 15. Las revistas hablan de amor: carteles con diamantes llegan volando uno tras otro; la cámara sube.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 540, y: 1000, z: 1.1 }, a: { x: 540, y: 740 }, T, mano: .5, paralaje: .5, fondo: () => D.fondo.abstracto(ctx, T, { tema: 'tierra', y: 760 }) }, () => {
        const pos = [[300, 640, -.12], [760, 600, .1], [270, 1000, .08], [790, 980, -.09], [540, 820, 0], [540, 1180, .05]];
        pos.forEach(([px, py, giro], i) => {
          const e = sale(prog(t, i * d * .11, i * d * .11 + .5));
          if (e <= 0) return;
          const x = lerp(i % 2 ? 1400 : -400, px, e), y = lerp(py - 300, py, e);
          D.papel(ctx, x, y, 300, 380, { giro: giro + (1 - e) * (i % 2 ? .6 : -.6), titular: i % 2 ? 'AMOR' : 'MODA', lineas: 3 });
          diamante(ctx, x, y + 70, 34, T, { oro: .3 });
        });
      });
      S30.pelicula(ctx, T);
    },
    // 16. Tito, boquiabierto: "¿yo caí en una campaña?"; corte a Sombra, que asiente.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .6]);
      oficina(ctx, c.t, c.d, T, () => {
        if (c.i === 0) S30.tito(ctx, 540, TITO_Y + 40, 2.2, Object.assign({ T, dir: -1, mira: .3, habla: 1, expresion: 'asombro' }, S30.actua(c.t, c.d, [[0, 'dePie'], [.4, 'asombrado']])));
        else { S30.detective(ctx, 540, SOMBRA_Y, 2.0, { T, mira: -.2, boca: 'sonrisa', pose: 'dePie' }); S30.escritorio(ctx, T, { y: 960 }); }
      }, c.i === 0 ? marco(-1) : null);
      S30.pelicula(ctx, T);
    },
    // 17. La máquina de escribir teclea la frase; golpe de cámara al terminar.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.juntas(ctx, T, { hora: 'noche', semilla: 9 });
      ctx.save(); ctx.translate(K.golpe(t, d * .95, 10), 0);
      K.plano(ctx, t, d, { de: { x: 540, y: 760, z: 1.3 }, a: { x: 540, y: 700 }, T, mano: .3 }, () => {
        D.mesaJuntas(ctx, 540, 1292, 1, { ancho: 960 });
        D.maquinaEscribir(ctx, 540, 1120, 1, { T, texto: 'A DIAMOND IS FOREVER', n: prog(t, d * .1, d * .9) });
      });
      ctx.restore();
      ano(ctx, 'LA FRASE', t, 210, 72);
      S30.pelicula(ctx, T);
    },
    // 18. La frase: el diamante gira y sube, motas ámbar y el texto entra desde abajo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T, .5);
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 640, luz: prog(t, 0, .6) + .4 });
      K.motas(ctx, T, { n: 90, color: C.oro, a: .7, vy: -40, tam: 5, semilla: 5 });
      K.plano(ctx, t, d, { de: { x: 540, y: 780, z: 1 }, a: { x: 540, y: 740 }, T }, () => {
        K.halo(ctx, lerp(200, 880, prog(t, 0, d)), 600, 380, C.oro, .22);
        diamante(ctx, 540, lerp(900, 520, sale(prog(t, 0, d * .5))), 110, T, { gira: T * 2.2, oro: prog(t, d * .3, d * .9) });
        const a = prog(t, .15, .7), s = lerp(1.3, 1, sale(a));
        ctx.save(); ctx.globalAlpha = a; ctx.translate(540, lerp(1120, 860, sale(a))); ctx.scale(s, s);
        ctx.font = '700 104px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.oro;
        ctx.fillText('Un diamante', 0, -70); ctx.fillText('es para siempre', 0, 40);
        ctx.restore();
      });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
    // 19. Nunca lo vendas: el cajón se cierra y el candado cae con golpe.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.banco(ctx, T, {});
      const cierra = sale(prog(t, d * .2, d * .55)), cand = prog(t, d * .6, d * .78);
      ctx.save(); ctx.translate(0, K.golpe(t, d * .76, 18));
      K.plano(ctx, t, d, { de: { x: 540, y: 880, z: 1.2 }, a: { x: 540, y: 960 }, T, mano: .4 }, () => {
        D.cajon(ctx, 540, 1080, 1, { cierra, T });
        if (cand > 0) { ctx.save(); ctx.translate(540, lerp(640, 900, sale(cand))); ctx.scale(rebote(cand), rebote(cand)); D.candado(ctx, 0, 0, 1, {}); ctx.restore(); }
        pastilla(ctx, 'NUNCA LO VENDAS', 540, 420, prog(t, d * .3, d * .3 + .3), true);
      });
      ctx.restore();
      S30.pelicula(ctx, T);
    },
    // 20. Si todos revendieran: la gente llega en fila a la tienda COMPRAMOS; la gráfica cae. Paneo siguiendo la fila.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 420, y: 840, z: 1.15 }, a: { x: 700, y: 860 }, T, mano: .6, paralaje: .55, fondo: () => D.fondo.calle(ctx, T, { hora: 'atardecer' }) }, () => {
        D.fachada(ctx, 800, 1190, 1.25, { letrero: 'COMPRAMOS', ancho: 340, alto: 520 });
        D.grafica(ctx, 260, 560, .85, { tipo: 'linea', valores: [.9, .75, .5, .25, .08], progreso: prog(t, d * .45, d * .95), color: C.terracota });
        for (let i = 0; i < 6; i++) {
          const x = lerp(-80 - i * 150, 600 - i * 110, sale(prog(t, 0, d * .85))), y = 1190 + (i % 2) * 40;
          S30.hombre(ctx, x, y, .95, { T, semilla: 40 + i, paso: T * 1.6 + i * .7, cara: i % 2 ? 'sonrisa' : 'serio' });
        }
      });
      S30.pelicula(ctx, T);
    },
    // 21. Nadie te dice cuánto vale uno usado: una vitrina con una etiqueta que aparece y se vacía de precio.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      K.plano(ctx, t, d, { de: { x: 640, y: 780, z: 1.1 }, a: { x: 440, y: 800 }, T, mano: .4, paralaje: .5, fondo: () => D.fondo.tienda(ctx, T, {}) }, () => {
        D.vitrina(ctx, 540, 900, 1.05, { T });
        K.halo(ctx, 540, 650, 260, C.oro, .22);
        D.papel(ctx, 700, lerp(500, 860, sale(prog(t, d * .2, d * .5))), 200, 120, { giro: .08, titular: '¿$?', lineas: 0 });
        pastilla(ctx, 'USADO', 400, 1210, prog(t, d * .5, d * .5 + .3));
      });
      S30.pelicula(ctx, T);
    },
    // 22. Tito, temeroso: "¿y los dos sueldos?"; corte a Sombra, que lo mira fijo.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .62]);
      oficina(ctx, c.t, c.d, T, () => {
        if (c.i === 0) S30.tito(ctx, 540, TITO_Y + 40, 2.2, Object.assign({ T, dir: -1, mira: .3, habla: 1, expresion: 'duda' }, S30.actua(c.t, c.d, [[0, 'dePie'], [.5, 'triste']])));
        else { S30.detective(ctx, 540, SOMBRA_Y, 2.0, { T, mira: -.2, pose: 'cruzado' }); S30.escritorio(ctx, T, { y: 960 }); }
      }, c.i === 0 ? marco(1) : null);
      S30.pelicula(ctx, T);
    },
    // 23. El anuncio de periódico: entra girando desde un lado y se asienta.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      D.fondo.abstracto(ctx, T, { tema: 'tierra', y: 760 });
      const ent = sale(prog(t, 0, d * .35));
      K.plano(ctx, t, d, { de: { x: 540, y: 760, z: 1 }, a: { x: 540, y: 800 }, T, mano: .3 }, () => {
        ctx.save(); ctx.translate(lerp(1300, 540, ent), 760); ctx.rotate(lerp(.5, -.05, ent) + Math.sin(T) * .01);
        D.anuncio(ctx, 0, 0, 760, 860, { titular: '¿Dos meses de sueldo?', sub: ['Un precio pequeño', 'para algo que dura para siempre'], lineas: 5 });
        anillo(ctx, 0, 70, 2.6, T);
        ctx.restore();
      });
      ano(ctx, 'SUS ANUNCIOS', t, 170, 60);
      S30.pelicula(ctx, T);
    },
    // 24. La lección: Sombra se inclina sobre el escritorio y Tito baja la cabeza.
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      oficina(ctx, t, d, T, () => {
        S30.detective(ctx, 360, SOMBRA_Y, 1.7, Object.assign({ T, mira: .8, habla: 1 }, S30.actua(t, d, [[0, 'dePie'], [.35, 'explicar'], [.75, 'pensativo']])));
        S30.escritorio(ctx, T, { y: 960 });
        S30.tito(ctx, 820, TITO_Y, 1.55, Object.assign({ T, dir: -1, mira: -.6, expresion: 'triste' }, S30.actua(t, d, [[0, 'dePie'], [.5, 'triste']])));
      }, marco(-1));
      S30.pelicula(ctx, T);
    },
    // 25. Tito mira su anillo en silencio: primer plano de Tito y corte al DETALLE del anillo (grande, sin personajes).
    (ctx, t, d, K, T) => {
      S30.vaiven(ctx, T);
      const c = K.corte(t, d, [0, .5]);
      if (c.i === 0) oficina(ctx, c.t, c.d, T, () => {
        S30.tito(ctx, 540, TITO_Y + 40, 2.2, { T, dir: -1, mira: .3, expresion: 'triste', pose: 'triste' });
      }, marco(1));
      else detalle(ctx, c.t, c.d, T, 'noche', { x: 540, y: 780, z: 1 }, { x: 540, y: 800 }, () => {
        anillo(ctx, 540, 900, 4.2, T, { oro: 1 });
        K.motas(ctx, T, { n: 30, color: C.oro, a: .5, vy: -20, tam: 3, semilla: 3 });
      });
      S30.pelicula(ctx, T);
    },
    // 26. Cierre: azul noche con halo ámbar; el logo y la pregunta los pone la marca.
    (ctx, t, d, K, T) => {
      D.fondo.abstracto(ctx, T, { tema: 'noche', y: 660, luz: .9 });
      S30.pelicula(ctx, T, { fuerza: .7 });
    },
  ];
})();
