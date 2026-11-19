// Adaptador: hace que S30.detective y S30.tito (los que usan las escenas de autor y los posts) dibujen con el kit de ilustración
// (plantilla/ilustra.js + I.REPARTO) en vez de la caricatura de manguera. Misma firma que antes: (ctx, x, y, s, opciones).
// (x, y) = pies, s = escala (1 ≈ 430 px de alto para Sombra, igual que una persona). Todo depende solo de T.
(() => {
  if (!window.S30 || !window.Ilustra || !Ilustra.REPARTO) return;
  const I = Ilustra, R = I.REPARTO;
  // luz noir cálida: llave dorada, ambiente oscuro, borde dorado (como el foco de la oficina de Sombra)
  const LUZ = new I.Luz({ dir: [-0.5, -0.8], dirBorde: [0.9, -0.2], clave: '#f2d9a0', ambiente: '#4a4036', borde: '#d4b47a', niebla: '#3a342c' });
  const cache = {};
  const quien = (tipo, altura, extra) => {
    const k = tipo + '|' + Math.round(altura);
    return cache[k] || (cache[k] = tipo === 'sombra' ? R.sombra({ altura: Math.round(altura) }) : R.tito({ altura: Math.round(altura) }));
  };
  const EXPR = { sonrisa: 'alegre', duda: 'duda', o: 'sorpresa', triste: 'triste', enfado: 'enfado', neutra: 'neutra' };

  function detective(ctx, x, y, s, o = {}) {
    const { T = 0, dir = 1, paso = null, corre = false, lupa = 0, susto = 0, rasca = 0, mira = 0, boca = 'sonrisa' } = o;
    const H = 430 * s, p = quien('sombra', H);
    let pose = 'dePie', expresion = EXPR[boca] || 'alegre';
    if (paso !== null) pose = 'camina'; else if (lupa) pose = 'lupa'; else if (rasca) { pose = 'pensativo'; expresion = 'duda'; } else if (susto > .3) { pose = 'sorprendido'; expresion = 'susto'; }
    if (o.senala) pose = 'senalar';
    ctx.save();
    p.dibujar(ctx, T, { x, y, dir, pose, expresion, mirada: [mira, 0], luz: LUZ, dist: paso !== null ? paso * 0.5 * H : 0, habla: o.habla || 0, alto: susto * 60 * s });
    ctx.restore();
  }
  function tito(ctx, x, y, s, o = {}) {
    const { T = 0, dir = 1, paso = null, boca = 'sonrisa', mira = 0, caja = null, brazos = 'abajo', susto = 0, objeto = null } = o;
    const H = 430 * s * 0.8, p = quien('tito', H);
    let pose = 'dePie', expresion = EXPR[boca] || 'alegre', est = {};
    if (paso !== null) pose = 'camina';
    if (brazos === 'arriba' || susto > .3) { pose = 'asombrado'; expresion = susto > .3 ? 'susto' : 'sorpresa'; }
    if (caja !== null || objeto) { pose = 'traeObjeto'; est.objeto = typeof objeto === 'string' ? objeto : 'carpeta'; est.llevaObjeto = true; }
    ctx.save();
    p.dibujar(ctx, T, Object.assign({ x, y, dir, pose, expresion, mirada: [mira, 0], luz: LUZ, dist: paso !== null ? paso * 0.5 * H : 0, habla: o.habla || 0, colita: Math.sin(T * 5) * .12, alto: susto * 40 * s }, est));
    ctx.restore();
  }
  S30.detectiveViejo = S30.detective; S30.titoViejo = S30.tito;
  S30.detective = detective; S30.tito = tito;
})();
