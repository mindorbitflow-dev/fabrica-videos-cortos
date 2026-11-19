/* Ilustra — Personaje2 (Fase 2, WP7, ESPECIFICACION_F2 §5.6, §6.5 y §3.3): el personaje completo que ensambla rig 2.5D, cuerpo, ropa, mano, cabeza, pelo y dinámica.
   Todo se calcula desde el estado de cada cuadro; sin azar y sin estado visible (las cachés internas solo aceleran).

   API
     new Ilustra.Personaje2({ ...opciones de Personaje (F1)..., ropa:[...], zapatos:{modelo,color}, peinado, complexion, ojos:{estilo,color}, proporciones, preset:'lia'|'teo'|'nina'|'abuela' })
     p.dibujar(ctx, t, estado) -> J25            dibuja todas sus piezas (uso suelto, como F1; también lo usa Escena.draw para actores F1/F2)
     p.piezas(t, estado) -> [{id, parte, prof, orden, base, dibujar(ctx)}]   piezas en el orden del actor (de lejos a cerca); `base` = prof del actor.
                                                  Para mezclar varios actores (WP8): ordenar por (base, orden) o, si hay interacción, por prof.
     p.resolver(t, estado) -> J25                solo el rig (lo usan dinamica e interaccion)
     p.marcoCabezaEn(t) -> marco G3               necesita estado._estadoEn (= (t')=>actor.estado(t')); es el conductor del muelle del pelo
     p.anclas(t, estado) -> {manoD, manoI, palmaD, ..., coronilla, boca, pecho.delante, ...}   anclas de §7.1 (aproximadas en espalda/pecho)
   estado = {x, y, dir, pose, expresion, mirada, viento, vista, luz, paraguas, sombraSuelo, respiracion, manoOculta}   (F1)
            + {yaw, prof, manos:{D:'asa', I:'relajada'}, giroCabeza, parpadeo, parpado, mejillas, xPose, _estadoEn}
   Sin yaw: yaw = dir·YAW_PERFIL (1.25); vista:'espalda' equivale a yaw = π.

   Notas de integración
     - Escena.draw (WP8) DEBE llamar a Ilustra.dinamica.vaciarCache() al empezar cada cuadro (la caché de muestras es solo una aceleración, pero está limitada a 512
       entradas y se llenaría con los 72 pasos de cada actor).
     - Este módulo conecta el pelo con la cabeza asignando Cabeza25.ganchoPelo (adaptador de firmas: Cabeza25 llama (ctx, capa, M, opcPelo, {silueta, forma, R}) y
       Pelo.dibujar espera (ctx, marco, {capa, ...})). Ni cabeza25.js ni pelo.js se tocan. */
(function (G) {
  'use strict';
  const I = G.Ilustra, G3 = I.G3, P = I.Pincel, C = I.Cuerpo, R = I.Ropa, D = I.dinamica, CA = I.Cabeza25;
  const PI = Math.PI, clamp = I.clamp;

  // ---------------------------------------------------------------- constantes globales (cabo 2)
  if (I.MODO === undefined) I.MODO = 'vector';           // 'vector' (F1, por defecto) | 'pintado' (lo define pintura.js; esto solo cubre una carga sin ese módulo)
  if (I.YAW_PERFIL === undefined) I.YAW_PERFIL = 1.25;   // §3.3: yaw = dir · YAW_PERFIL (≈72°)

  // ---------------------------------------------------------------- adaptador cabeza <-> pelo (cabo 1)
  // opc = opciones de pelo del estado de la cabeza ({peinado, color, t, historial, id, luz, semilla, viento, ...}); ex = {silueta, forma, R}.
  CA.ganchoPelo = function (ctx, capa, M, opc, ex) {
    I.Pelo.dibujar(ctx, M, Object.assign({ k: ex && ex.forma && ex.forma.k }, opc, { capa }));
  };

  // ---------------------------------------------------------------- presets (colores de §4.7)
  I.PRESETS2 = {
    lia: { nombre: 'Lía', proporciones: 'adulto', complexion: 'delgada', semilla: 11, piel: '#eab48c', pelo: '#1e1816', peinado: 'melena', ojos: { estilo: 'puntos', color: '#3a2a20' },
      ropa: [{ tipo: 'abrigo', color: '#d8c7a4', largo: 0.62, cuello: 'solapa', cinturon: true, botones: 2 }, { tipo: 'jersey', color: '#8a93a3' }, { tipo: 'bufanda', color: '#b23a3a' }, { tipo: 'pantalon', color: '#23262f' }],
      zapatos: { modelo: 'botin', color: '#2b2422' } },
    teo: { nombre: 'Teo', proporciones: 'estilizado', complexion: 'delgada', semilla: 23, piel: '#d9a37e', pelo: '#1b1514', peinado: 'encrespado', ojos: { estilo: 'puntos', color: '#2a2018' },
      ropa: [{ tipo: 'abrigo', color: '#2c303a', largo: 0.8, cuello: 'solapa', cinturon: false, botones: 3 }, { tipo: 'jersey', color: '#6b7380' }, { tipo: 'pantalon', color: '#23262f' }],
      zapatos: { modelo: 'bota', color: '#1e1816' } },
    nina: { nombre: 'Niña', proporciones: 'nino', complexion: 'media', semilla: 37, piel: '#f0bf9c', pelo: '#1f1816', peinado: 'coletas', ojos: { estilo: 'puntos', color: '#3a2a20' },
      ropa: [{ tipo: 'abrigo', color: '#c9573f', largo: 0.4, cuello: null, cinturon: false, botones: 3 }, { tipo: 'pantalon', color: '#2e3a55' }],
      zapatos: { modelo: 'zapatilla', color: '#d6d0c4' } },
    abuela: { nombre: 'Abuela', proporciones: 'anciano', complexion: 'media', semilla: 41, piel: '#dba98a', pelo: '#b9b4ac', peinado: 'mono', ojos: { estilo: 'puntos', color: '#4a3a30' },
      ropa: [{ tipo: 'abrigo', color: '#6d4f5e', largo: 0.7, cuello: 'solapa', cinturon: true, botones: 2 }, { tipo: 'bufanda', color: '#8c9a7a' }, { tipo: 'pantalon', color: '#3a3844' }],
      zapatos: { modelo: 'zapato', color: '#2a2524' } }
  };

  // ---------------------------------------------------------------- utilidades
  const FORMAS_CABEZA = { adulto: 1, nino: 1, anciano: 1, estilizado: 1 };
  const PERFILES = { adulto: 'adulto', nino: 'nino', anciano: 'anciano', estilizado: 'adulto' };
  let contador = 0;
  function yawDe(e) { return e.yaw != null ? e.yaw : e.vista === 'espalda' ? PI : (e.dir == null ? 1 : e.dir) * I.YAW_PERFIL; }
  function rotEje(v, k, a) {                                                  // Rodrigues; k unitario
    const c = Math.cos(a), s = Math.sin(a), d = G3.punto(k, v) * (1 - c), q = G3.cruz(k, v);
    return [v[0] * c + q[0] * s + k[0] * d, v[1] * c + q[1] * s + k[1] * d, v[2] * c + q[2] * s + k[2] * d];
  }
  // si falta `ropa`, se traduce de abrigo / camisa / bufanda / pantalon de F1
  function traducirRopa(b) {
    const l = [], ab = b.abrigo;
    if (ab) l.push({ tipo: 'abrigo', color: ab.color, largo: ab.largo == null ? 0.62 : ab.largo, cuello: ab.cuello === true ? 'solapa' : (ab.cuello || null), cinturon: ab.cinturon !== false, botones: ab.botones == null ? 2 : ab.botones, abierto: !!ab.abierto });
    if (b.camisa) l.push({ tipo: 'camisa', color: b.camisa });
    if (b.bufanda) l.push({ tipo: 'bufanda', color: b.bufanda.color || b.bufanda });
    if (b.pantalon) l.push({ tipo: 'pantalon', color: b.pantalon });
    return l;
  }

  // ---------------------------------------------------------------- constructor
  I.Personaje2 = function (o = {}) {
    const pre = o.preset ? I.PRESETS2[o.preset] : null;
    if (o.preset && !pre) throw new Error('Personaje2: preset desconocido "' + o.preset + '"');
    const b = this.o = Object.assign({
      nombre: 'Personaje', tipo: 'adulto', altura: 420, semilla: 11, piel: '#e6b48f', pelo: '#1e1816', peinado: 'melena', ojos: { estilo: 'puntos', color: '#3b2a22' },
      abrigo: { color: '#c89a4a', largo: 0.62, cuello: true }, bufanda: { color: '#3f6f73' }, pantalon: '#23262f', zapatos: '#2a2524', camisa: null
    }, pre, o);
    this.id = 'p2_' + (contador++);
    this.nombrePro = b.proporciones || b.tipo || 'adulto';
    if (!I.PROPORCIONES[this.nombrePro]) throw new Error('Personaje2: proporciones desconocidas "' + this.nombrePro + '"');
    this.rig = new I.Rig25(I.PROPORCIONES[this.nombrePro], b.altura);
    this.perfil = PERFILES[this.nombrePro] || 'adulto';
    this.forma = b.forma || (FORMAS_CABEZA[this.nombrePro] ? this.nombrePro : 'adulto');
    this.complexion = b.complexion || (this.nombrePro === 'estilizado' ? 'delgada' : 'media');
    this.prendas = b.ropa || traducirRopa(b);
    const z = b.zapatos; this.zapatos = typeof z === 'string' ? { modelo: 'zapato', color: z } : Object.assign({ modelo: 'zapato', color: '#2a2524' }, z);
    const oj = b.ojos; this.ojos = typeof oj === 'string' ? { estilo: 'puntos', color: oj } : Object.assign({ estilo: 'puntos', color: '#3b2a22' }, oj);
    this._eEn = null; this._hc = new Map(); this._hcT = null; this._mc = new Map();
    // funciones conductor ESTABLES por actor (dinamica.memo las usa como clave de caché)
    this._histJ = tp => this._J(tp);
    this._histMarco = tp => {                                              // marco de la cabeza con escala = R, para que Pelo.aMundo dé píxeles
      let m = this._mc.get(tp); if (m) return m;
      const mc = this._J(tp).marcos.cabeza; m = G3.marco({ o: mc.o, yaw: mc.yaw, pitch: mc.pitch, roll: mc.roll, escala: this._R() });
      if (this._mc.size > 400) this._mc.clear();
      this._mc.set(tp, m); return m;
    };
  };
  const Pr = I.Personaje2.prototype;

  Pr._R = function () { const p = this.rig.p; return 0.5 * p.cabeza * p.escalaCabeza * this.o.altura; };

  // J25 en el pasado (conductor de la dinámica): estado(t') -> resolver. Caché por cuadro; solo acelera.
  Pr._J = function (tp) {
    let J = this._hc.get(tp); if (J) return J;
    if (!this._eEn) throw new Error('Personaje2: el estado necesita _estadoEn para la dinámica');
    J = this.resolver(tp, this._eEn(tp));
    if (this._hc.size > 400) this._hc.clear();
    this._hc.set(tp, J); return J;
  };

  // ---------------------------------------------------------------- rig
  Pr.resolver = function (t, e) {
    e = e || {}; const o = this.o;
    const yaw = yawDe(e), dir = e.dir == null ? 1 : e.dir;
    const resp = I.ciclos.respirar(t + o.semilla, { amp: 0.01 });
    let pose = I.sumarPoses(e.pose || I.POSES.dePie, resp, e.respiracion == null ? 1 : e.respiracion);
    if (e.giroCabeza != null) pose = Object.assign({}, pose, { giroCabeza: e.giroCabeza });
    return this.rig.resolver({ x: e.x, y: e.y, prof: e.prof || 0, yaw, pose, xPose: e.xPose == null ? e.x : e.xPose, dir });
  };
  Pr.marcoCabezaEn = function (tp) { return this._J(tp).marcos.cabeza; };

  // viento: número 0..1 de F1 -> aceleración (px/s²) que sopla hacia atrás respecto de hacia dónde mira; o función (t)->[ax,ay]
  function vientoDe(e, yaw, sem) {
    const v = e.viento;
    if (typeof v === 'function') return v;
    if (!v) return null;
    const sg = e.dir != null ? e.dir : clamp(Math.sin(yaw) * 2, -1, 1);
    return s => [-sg * v * 1500 * (1 + 0.35 * I.ruido1(s * 1.3, sem)), 0];
  }

  // ---------------------------------------------------------------- anclas (§7.1)
  Pr.anclas = function (t, e) {
    e = e || {}; const J = this.resolver(t, e), H = this.o.altura, a = {};
    const L = 0.105 * H * (J.prop.mano / 0.06), pun = j => [j.x, j.y, j.prof];
    for (const l of ['D', 'I']) {
      const mo = this._opcMano(J, l, e, L, null), an = I.Mano.dibujar(null, Object.assign(mo, { solo: true }));
      a['mano' + l] = an.agarre; a['palma' + l] = an.palma; a['indice' + l] = an.indice; a['hombro' + l] = pun(J['hombro' + l]); a['codo' + l] = pun(J['codo' + l]);
    }
    const R_ = this._R(), mc = J.marcos.cabeza, ce = pun(J.cabeza);
    a.cabeza = ce; a.coronilla = mc.aMundo ? G3.sum(ce, mc.dirAMundo([0, -1.12 * R_, 0])) : ce; a.boca = G3.sum(ce, mc.dirAMundo([0, 0.62 * R_, 0.95 * R_]));
    const pe = J.marcos.pecho, ce2 = pun(J.hombros), fw = d => G3.sum(ce2, pe.dirAMundo(d));
    a['pecho.delante'] = fw([0, 0.04 * H, 0.06 * H]);
    a['espalda.alta.D'] = fw([-0.05 * H, 0.03 * H, -0.05 * H]); a['espalda.alta.I'] = fw([0.05 * H, 0.03 * H, -0.05 * H]);
    const ci = pun(J.cintura), cf = d => G3.sum(ci, J.marcos.pecho.dirAMundo(d));
    a['cintura.espalda.D'] = cf([-0.04 * H, 0, -0.045 * H]); a['cintura.espalda.I'] = cf([0.04 * H, 0, -0.045 * H]);
    return a;
  };

  // opciones de Mano.dibujar para el lado l: muñeca, eje del antebrazo+mano, dorso hacia fuera del cuerpo girado por giroMano
  Pr._opcMano = function (J, l, e, L, ctxLuz) {
    const s = l === 'I' ? 1 : -1, m = J['mano' + l], eje = J.ejes['mano' + l];
    let dorso = J.marcos.pecho.dirAMundo([s, 0, 0]);
    const gm = J['giroMano' + l] || 0; if (gm) dorso = rotEje(dorso, G3.unit(eje), gm * s);
    const g = (e.manos && e.manos[l]) || (l === 'D' && e.paraguas ? 'asa' : 'relajada');
    return { muneca: [m.x, m.y, m.prof], eje, dorso, lado: l, largo: L, agarre: g, piel: this.o.piel, semilla: this.o.semilla * 7 + (l === 'D' ? 1 : 2), luz: ctxLuz };
  };

  // ---------------------------------------------------------------- ensamblado: lista ordenada de piezas
  Pr._armar = function (t, e) {
    e = e || {}; const o = this.o, H = o.altura;
    if (this._eEn !== (e._estadoEn || null)) { this._hc.clear(); this._mc.clear(); }   // la caché de J(t') vale mientras estado(t') sea la misma función pura
    this._eEn = e._estadoEn || null;
    const J = this.resolver(t, e), yaw = J.yaw, luz = e.luz || I.luzActual || I.LUZ_DEFECTO, Rr = this._R();
    const viento = vientoDe(e, yaw, o.semilla + 5), din = this._eEn ? this._histJ : undefined;
    const ex = typeof e.expresion === 'string' || !e.expresion ? (I.EXPRESIONES[e.expresion || 'neutra'] || I.EXPRESIONES.neutra) : e.expresion;
    const extra = [];
    // --- cabeza (+ pelo) como pieza del orden global
    extra.push({ id: 'cabeza', parte: 'cabeza', prof: J.cabeza.prof, rango: C.RANGO.cabeza, capa: 2, dibujar: (ctx, est) => {
      const pelo = o.peinado === false ? false : { peinado: o.peinado, color: o.pelo, t, historial: din ? this._histMarco : undefined, id: this.id + '#pelo', luz, semilla: o.semilla, viento };
      CA.dibujar(ctx, J.marcos.cabeza, { R: Rr, forma: this.forma, piel: o.piel, ojos: this.ojos, expresion: e.expresion || 'neutra', mirada: e.mirada, parpadeo: e.parpadeo == null ? I.ciclos.parpadeo(t, o.semilla) : e.parpadeo,
        parpado: e.parpado, mejillas: e.mejillas, nariz: o.nariz, luz, pelo });
    } });
    // --- manos (y paraguas)
    const L = 0.105 * H * (J.prop.mano / 0.06), paraguas = e.paraguas;
    for (const l of ['D', 'I']) {
      if (e.manoOculta === true || e.manoOculta === l) continue;
      const mo = this._opcMano(J, l, e, L, luz), m = J['mano' + l], eje = G3.unit(J.ejes['mano' + l]);
      const prof = m.prof + eje[2] * 0.23 * L;                              // palma = muñeca + 0.23·L a lo largo del eje (Mano)
      if (l === 'D' && paraguas) {
        mo.radio = 0.011 * H;
        const an = I.Mano.dibujar(null, Object.assign({}, mo, { solo: true })), dirP = e.dir == null ? (Math.sin(yaw) >= 0 ? 1 : -1) : e.dir;
        const inc = (paraguas.inclinacion == null ? -0.12 : paraguas.inclinacion) * dirP + I.ruido1(t * 0.9, 5) * 0.03 * (0.5 + (e.viento || 0));
        const largo = H * (paraguas.largo || 0.5), sn = Math.sin(inc), cs = Math.cos(inc), top = [an.agarre[0] + sn * largo, an.agarre[1] - cs * largo];
        mo.objetos = [{ prof: 'agarre', dibujar: ctx => {
          ctx.strokeStyle = I.css('#2b2a2e'); ctx.lineWidth = H * 0.007; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(an.agarre[0] - sn * H * 0.04, an.agarre[1] + cs * H * 0.04); ctx.lineTo(top[0], top[1]); ctx.stroke();
          ctx.lineWidth = H * 0.012; ctx.strokeStyle = I.css('#4a3428'); ctx.beginPath(); ctx.arc(an.agarre[0] - sn * H * 0.04 - dirP * H * 0.015, an.agarre[1] + cs * H * 0.04, H * 0.015, 0, PI); ctx.stroke();
        } }];
        extra.push({ id: 'paraguasCopa', parte: 'paraguas', prof: 1e5, rango: 99, capa: 2, dibujar: ctx => I.props.paraguas(ctx, top[0], top[1], { radio: H * (paraguas.radio || 0.36), angulo: inc, color: paraguas.color || '#2f3c4a', t, semilla: o.semilla + 90, viento: e.viento || 0 }) });
      }
      extra.push({ id: 'mano' + l, parte: 'mano' + l, prof, rango: C.RANGO.mano, dibujar: ctx => { ctx.save(); I.Mano.dibujar(ctx, mo); ctx.restore(); } });
    }
    // --- cuerpo vestido (orden por capas de WP6b, con la cabeza y las manos dentro)
    const orden = R.cuerpoVestido(J, H, this.prendas, { luz, complexion: this.complexion, perfil: this.perfil, zapatos: { modelo: this.zapatos.modelo }, t, historial: din, id: this.id, viento, semilla: o.semilla, piel: o.piel, extra });
    this._cunia(orden);
    const est = { luz, piel: o.piel, colorZapato: this.zapatos.color, colorSuela: this.zapatos.colorSuela };
    const lista = orden.map((it, i) => ({ id: it.id, parte: it.parte, prof: it.prof, orden: i, base: J.pelvis.prof, dibujar: ctx => { ctx.save(); R.dibujar(ctx, it, est); ctx.restore(); } }));
    if (e.sombraSuelo !== false) lista.unshift({ id: 'sombraSuelo', parte: 'sombra', prof: -1e6, orden: -1, base: -1e6, dibujar: ctx => I.Personaje.prototype.sombraSuelo.call(this, ctx, { J, H, e }) });
    return { J, lista, luz, orden };
  };

  // cabo 4: la cadera del pantalón y la parte alta de las perneras (muslos de WP6a, más anchos que el abrigo en la cadera) asoman junto al abrigo como una cuña
  // oscura. Lo visible de verdad es solo lo que queda por debajo del bajo del abrigo: se recortan esas piezas a "dentro de la silueta del abrigo ∪ debajo de su
  // bajo" (con el frente abierto, la silueta exterior sin el hueco, para que las piernas sigan viéndose). Sin abrigo no se toca nada.
  Pr._cunia = function (orden) {
    const ab = orden.find(q => q.id === 'abrigo'); if (!ab || !ab.info || !ab.info.bajo || ab.info.bajo.length < 2) return;
    const afectados = orden.filter(q => q.id === 'caderaPantalon' || /^pernera/.test(q.id)); if (!afectados.length) return;
    const bajo = ab.info.bajo.slice().sort((p, q) => p[0] - q[0]).map(p => [p[0], p[1] - 3]), n = bajo.length;       // 3 px hacia arriba: solape sin costura
    const bajoR = [[bajo[0][0] - 3000, bajo[0][1]]].concat(bajo, [[bajo[n - 1][0] + 3000, bajo[n - 1][1]], [bajo[n - 1][0] + 3000, 1e5], [bajo[0][0] - 3000, 1e5]]);
    // Con el frente cerrado, lo que queda por encima del bajo está tapado por el abrigo: se recorta solo a "debajo del bajo". Además de ahorrar píxeles, el rectángulo de
    // recorte es mucho menor y el rasterizador descarta de golpe los trazos pintados que caen fuera de él (es la optimización de la parte alta de las perneras).
    const abierto = !!ab.info.abierto, minHem = Math.min.apply(null, bajo.map(p => p[1]));
    const lim = abierto ? P.union([ab.info.poly, bajoR]) : P.union([bajoR]);
    for (const it of afectados) {
      if (!abierto && it.id === 'caderaPantalon' && it.pieza.caja && it.pieza.caja.y1 < minHem - 4) { it.dibujar = () => {}; continue; }   // toda bajo el abrigo
      const dib = it.dibujar; it.dibujar = (ctx, est) => { ctx.save(); ctx.clip(lim, 'nonzero'); dib(ctx, est); ctx.restore(); };
    }
  };

  Pr.piezas = function (t, e) { return this._armar(t, e).lista; };

  Pr.dibujar = function (ctx, t, e) {
    const luzPrev = I.luzActual; if (e && e.luz) I.luzActual = e.luz;
    const a = this._armar(t, e);
    ctx.save();
    try { for (const p of a.lista) p.dibujar(ctx); } finally { ctx.restore(); I.luzActual = luzPrev; }
    this.ultimas = a.J;
    return a.J;
  };
})(typeof window !== 'undefined' ? window : globalThis);
