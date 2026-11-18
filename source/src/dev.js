// ============================================================================
// development tools: only in dev.html (npm run build:dev), never in index.html
// ============================================================================
//   F    fly the camera along the scripted path (FLY in main.js), one minute through the whole world
//   B    the same flight as a benchmark: the resolution stays fixed, every frame is timed, the result is shown at the end
//   F, B or 1-6 during a flight stop it
if (FAUNA_LAB) {
  const panel = document.createElement('nav');
  panel.setAttribute('aria-label', 'Zonas del laboratorio de fauna');
  Object.assign(panel.style, {
    position: 'fixed', left: '12px', bottom: '12px', zIndex: '20', display: 'none',
    gridTemplateColumns: 'repeat(2, minmax(112px, 1fr))', gap: '6px', padding: '10px',
    maxWidth: '270px', borderRadius: '10px', background: 'rgba(2, 20, 18, .78)',
    border: '1px solid rgba(160, 230, 190, .35)', backdropFilter: 'blur(6px)',
  });
  const heading = document.createElement('strong');
  heading.textContent = 'LABORATORIO DE FAUNA';
  Object.assign(heading.style, { gridColumn: '1 / -1', color: '#d8f4dd', font: '700 11px/1.2 system-ui', letterSpacing: '.08em', padding: '2px 3px 4px' });
  panel.append(heading);
  for (let i = 0; i < FAUNA_ZONES.length; i++) {
    const zone = FAUNA_ZONES[i], button = document.createElement('button');
    button.type = 'button'; button.textContent = zone.label;
    button.title = `${zone.label} · profundidad ${zone.depth.toFixed(1)} m · ${zone.active ? 'fauna activa' : 'zona reservada, fauna pendiente'}`;
    Object.assign(button.style, { padding: '7px 8px', fontSize: '10px', letterSpacing: '.05em', borderRadius: '6px' });
    button.addEventListener('click', (e) => { e.stopPropagation(); jumpToLabZone(i); });
    panel.append(button);
  }
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.body.append(panel);
  const show = () => { panel.style.display = document.body.classList.contains('g') ? 'grid' : 'none'; };
  new MutationObserver(show).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  show();
}
{
  const LOGN = 1 << 16, logFrame = new Float32Array(LOGN), logGpu = new Float32Array(LOGN);
  let flying = false, bench = false, last = 0, nFrame = 0, nGpu = 0;
  const stop = () => { flying = bench = false; dynT = 0; };
  const report = () => {
    const st = (a, n) => { const s = Array.from(a.subarray(0, n)).sort((x, y) => x - y); let sum = 0; for (const v of s) sum += v; return { n, avg: sum / n, p99: s[min(n - 1, floor(n * 0.99))], max: s[n - 1] }; };
    const fm = (o) => `avg ${o.avg.toFixed(2)}  p99 ${o.p99.toFixed(2)}  max ${o.max.toFixed(2)} ms`;
    const f = st(logFrame, nFrame);
    info.textContent = `Fly-through ${W}x${H}, ${f.n} frames\nframe  ${fm(f)}\nGPU    ${nGpu ? fm(st(logGpu, nGpu)) : 'timestamp-query unavailable'}`;
  };
  // frame() moves the free camera and then calls render(): step in between and put the camera on the path instead
  const draw = render;
  render = () => {
    if (flying) {
      const dtr = F[LAST] - last; last = F[LAST];
      F[FLT] += min(dtr / 1000, 0.1); flyAt();
      if (bench) { if (nFrame < LOGN) logFrame[nFrame++] = dtr; if (F[GPU] > 0 && nGpu < LOGN) logGpu[nGpu++] = F[GPU]; }
      if (F[FLT] >= FLYT) { if (bench) report(); stop(); }
    }
    draw();
  };
  addEventListener('keydown', (e) => {
    if (menu || e.repeat) return;
    if (FAUNA_LAB && (e.code === 'KeyF' || e.code === 'KeyB')) return;
    if (e.code === 'KeyF' || e.code === 'KeyB') {
      if (flying) stop();
      else {
        flying = true; bench = e.code === 'KeyB'; F[FLT] = 0; last = F[LAST]; nFrame = nGpu = 0;
        // a benchmark hides the stats line and holds the resolution: dynT at -Infinity keeps frame() from tuning it
        if (bench) { hud = false; info.textContent = ''; dynT = -Infinity; }
      }
    } else if (/Digit[1-6]/.test(e.code)) stop();
  });
}
