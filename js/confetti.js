// Houbičky — self-written canvas celebration: confetti, falling autumn leaves, or both.
// prefers-reduced-motion: no falling/spinning — a short, gentle fade of a few still shapes instead.

const DEFAULT_COLORS = ['#c7642a', '#f4b33c', '#7bb661', '#4fa3d9', '#b57bd6', '#f28fb0', '#ffd95a'];  // no poison red (DESIGN §1)
/** Little cap particles are plain brown boletes (edible friends) — never red/green or dotted (DESIGN §2.2). */
export const CAP_COLORS = ['#8b5a2b', '#a0672f', '#6f4423'];
const LEAF_COLORS = ['#d9622b', '#e89a2c', '#c4402f', '#a8b84a', '#8f5a2b', '#f2c14e'];

let running = null;   // { stop() }

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);

function makeCanvas() {
  const c = document.createElement('canvas');
  c.setAttribute('aria-hidden', 'true');
  c.className = 'celebration-canvas';
  Object.assign(c.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '9999' });
  document.body.append(c);
  return c;
}

function drawLeaf(g, size) {
  g.beginPath();
  g.moveTo(0, -size);
  g.bezierCurveTo(size * 0.9, -size * 0.5, size * 0.7, size * 0.6, 0, size);
  g.bezierCurveTo(-size * 0.7, size * 0.6, -size * 0.9, -size * 0.5, 0, -size);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.18)';
  g.lineWidth = Math.max(1, size * 0.08);
  g.beginPath(); g.moveTo(0, -size * 0.8); g.lineTo(0, size * 1.15); g.stroke();
}

function drawBoleteCap(g, size, color) {   // plain brown bolete: dome, cream pore line, short stem — no dots
  g.beginPath(); g.arc(0, 0, size, Math.PI, 0); g.closePath(); g.fill();
  g.fillStyle = '#e6d9a8'; g.fillRect(-size * 0.92, 0, size * 1.84, size * 0.2);
  g.fillStyle = '#f3ead6'; g.fillRect(-size * 0.3, size * 0.2, size * 0.6, size * 0.62);
  g.fillStyle = color;
}

/**
 * Celebrate! Resolves when the animation has finished and the canvas is removed.
 * @param {{kind?: 'confetti'|'leaves'|'mixed', duration?: number, count?: number, colors?: string[],
 *          origin?: {x:number, y:number}, reducedMotion?: boolean}} [opts]
 *   origin (0..1 viewport fractions) bursts particles from a point; default = fall from the top.
 */
export function celebrate(opts = {}) {
  if (typeof document === 'undefined' || !document.body) return Promise.resolve();
  stop();
  const kind = opts.kind || 'mixed';
  const reduce = opts.reducedMotion ?? reducedMotion();
  const duration = opts.duration ?? (reduce ? 1600 : 2800);
  const canvas = makeCanvas();
  const g = canvas.getContext('2d');
  if (!g) { canvas.remove(); return Promise.resolve(); }

  let W = 0; let H = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const area = W * H;
  const count = opts.count ?? (reduce ? 14 : Math.round(Math.min(160, Math.max(60, area / 9000))));
  const parts = [];
  for (let i = 0; i < count; i++) {
    const type = kind === 'mixed' ? (i % 3 === 0 ? 'leaf' : i % 7 === 0 ? 'cap' : 'paper') : kind === 'leaves' ? (i % 9 === 0 ? 'cap' : 'leaf') : 'paper';
    const palette = type === 'leaf' ? LEAF_COLORS : type === 'cap' ? CAP_COLORS : (opts.colors || DEFAULT_COLORS);
    const p = {
      type,
      color: palette[i % palette.length],
      size: type === 'paper' ? rand(5, 9) : type === 'cap' ? rand(9, 14) : rand(10, 17),
      x: rand(0, W), y: rand(-H * 0.6, -20),
      vx: rand(-0.6, 0.6), vy: rand(1.2, 2.6),
      rot: rand(0, Math.PI * 2), vr: rand(-0.12, 0.12),
      tilt: rand(0, Math.PI * 2), vt: rand(0.05, 0.15),
      sway: rand(0.6, 1.6), phase: rand(0, Math.PI * 2),
      delay: rand(0, duration * 0.35),
    };
    if (opts.origin && !reduce) {
      p.x = opts.origin.x * W; p.y = opts.origin.y * H;
      const a = rand(-Math.PI * 0.9, -Math.PI * 0.1); const sp = rand(5, 12);
      p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.delay = 0;
    }
    if (reduce) { p.x = rand(W * 0.1, W * 0.9); p.y = rand(H * 0.1, H * 0.6); p.delay = rand(0, 300); p.rot = rand(-0.5, 0.5); }
    parts.push(p);
  }

  return new Promise((resolve) => {
    const start = performance.now();
    let last = start;
    let raf = 0;
    const finish = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.remove();
      if (running?.canvas === canvas) running = null;
      resolve();
    };
    running = { canvas, stop: finish };

    const frame = (now) => {
      const el = now - start;
      const dt = Math.min(3, (now - last) / 16.67);
      last = now;
      g.clearRect(0, 0, W, H);
      const fadeOut = Math.min(1, Math.max(0, (duration - el) / 500));
      let alive = 0;
      for (const p of parts) {
        if (el < p.delay) { alive++; continue; }
        if (reduce) {
          const t = (el - p.delay) / (duration - p.delay);
          const alpha = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);  // fade in → out, no motion
          g.globalAlpha = alpha * 0.9;
        } else {
          if (opts.origin) { p.vy += 0.18 * dt; p.vx *= 0.985; } else { p.x += Math.sin(el / 400 * p.sway + p.phase) * 0.8 * dt; }
          p.x += p.vx * dt; p.y += p.vy * dt * (p.type === 'leaf' ? 0.75 : 1);
          p.rot += p.vr * dt; p.tilt += p.vt * dt;
          g.globalAlpha = fadeOut;
          if (p.y > H + 30) continue;
        }
        alive++;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.color;
        if (p.type === 'paper') {
          g.scale(1, reduce ? 1 : Math.cos(p.tilt));
          g.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        } else if (p.type === 'leaf') {
          if (!reduce) g.scale(Math.cos(p.tilt) * 0.5 + 0.5, 1);
          drawLeaf(g, p.size);
        } else {
          drawBoleteCap(g, p.size, p.color);
        }
        g.restore();
      }
      g.globalAlpha = 1;
      if (el >= duration || alive === 0) finish();
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}

/** Stop any running celebration immediately. */
export function stop() { running?.stop(); }
