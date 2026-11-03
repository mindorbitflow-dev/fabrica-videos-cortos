// Motor de escenas: controla TODAS las animaciones con un reloj propio (seek(t)),
// así la vista previa en el navegador y el video renderizado son idénticos.
(() => {
  const RENDER = new URLSearchParams(location.search).has('render');
  const lienzo = document.getElementById('lienzo');
  const escenas = [...lienzo.querySelectorAll('.escena')];
  const sub = document.createElement('div');
  sub.id = 'subtitulo';
  lienzo.appendChild(sub);
  let plan = [];
  let ultimoSub = '';

  // Sin audio real (vista previa) se estiman los tiempos de cada palabra.
  function estimar() {
    let inicio = 0;
    return escenas.map(e => {
      const palabras = e.dataset.voz.trim().split(/\s+/).map((w, i) => ({ w, t: i * 0.36, d: 0.34 }));
      const dur = palabras.length * 0.36 + 0.5;
      const p = { inicio, dur, palabras };
      inicio += dur;
      return p;
    });
  }

  // Agrupa palabras en bloques cortos (máx. 3, o corta en puntuación / pausa de la voz).
  function agrupar(palabras) {
    const grupos = [];
    let g = [];
    palabras.forEach((p, i) => {
      g.push(i);
      const sig = palabras[i + 1];
      const pausa = sig && sig.t - (p.t + p.d) > 0.12;
      if (g.length === 3 || /[.,;:?!]$/.test(p.w) || pausa) { grupos.push(g); g = []; }
    });
    if (g.length) grupos.push(g);
    return grupos;
  }

  function subtitular(p, local) {
    let idx = -1;
    p.palabras.forEach((w, i) => { if (w.t <= local) idx = i; });
    let html = '';
    if (idx >= 0) {
      const g = p.grupos.find(g => g.includes(idx));
      html = g.map(i => {
        const w = p.palabras[i].w.replace(/[<>&]/g, '');
        return i === idx ? `<span class="actual">${w}</span>` : w;
      }).join(' ');
    }
    if (html !== ultimoSub) { sub.innerHTML = html; ultimoSub = html; }
  }

  function seek(t) {
    plan.forEach((p, i) => {
      const e = escenas[i];
      const local = t - p.inicio;
      const ultima = i === plan.length - 1;
      const activa = local >= 0 && (local < p.dur || ultima);
      e.style.visibility = activa ? 'visible' : 'hidden';
      e.style.opacity = activa ? Math.min(1, local / 0.2) : 0;
      e.getAnimations({ subtree: true }).forEach(a => { a.pause(); a.currentTime = Math.max(0, local) * 1000; });
      if (activa) subtitular(p, local);
    });
  }

  function preparar(p) {
    plan = p.map(x => ({ ...x, grupos: agrupar(x.palabras) }));
    seek(0);
    return plan.reduce((s, x) => s + x.dur, 0);
  }

  window.__textos = () => escenas.map(e => e.dataset.voz.trim());
  window.__preparar = preparar;
  window.__seek = seek;

  if (!RENDER) {
    // Vista previa: escala el lienzo a la ventana y reproduce en bucle. Clic = reiniciar.
    const ajustar = () => {
      const s = Math.min(innerWidth / 1080, innerHeight / 1920);
      lienzo.style.transform = `scale(${s})`;
      lienzo.style.marginLeft = `${(innerWidth - 1080 * s) / 2}px`;
    };
    addEventListener('resize', ajustar);
    ajustar();
    const total = preparar(estimar());
    let t0 = performance.now();
    addEventListener('click', () => { t0 = performance.now(); });
    const bucle = now => {
      seek(((now - t0) / 1000) % (total + 1));
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
  }
})();
