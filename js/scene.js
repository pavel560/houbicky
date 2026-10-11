// Houbičky — the forest panorama: one inline SVG reused by every screen; parallax pan + ambient motion.
import { svgEl } from './assets.js';
import { reduced, anim } from './ui.js';

const BLEED = 120;
export const pan = { p: 0, vbW: 1333, pmax: 0, width: 2400 };
let PANO = 2400;          // full panorama (data-pano); Level 1 pans only data-pano-l1 (DESIGN-v2 §5.1)
let PANO_L1 = 2400; let limitL1 = false;
let el = null; let layers = []; let leaves = [];

export function mountScene(stage) {
  el = svgEl('scene-forest', { unique: false });
  el.removeAttribute('role');
  el.setAttribute('aria-hidden', 'true');
  el.querySelector('title')?.remove();
  PANO = parseFloat(el.dataset.pano) || 2400; PANO_L1 = parseFloat(el.dataset.panoL1) || PANO;
  stage.append(el);
  layers = [...el.querySelectorAll('[data-depth]')].map((g) => ({ g, d: parseFloat(g.dataset.depth) || 0 }));
  fit();
  addEventListener('resize', fit);
  ambient();
  return el;
}
export const sceneEl = () => el;
/** Level 1 sees only the first part of the forest. */
export function limitPan(l1) { if (limitL1 === l1) return; limitL1 = l1; if (el) fit(); }

export function fit() {
  const W = innerWidth; const H = innerHeight;
  const width = limitL1 ? PANO_L1 : PANO;
  pan.width = width;
  pan.vbW = Math.min(width, (1000 * W) / H);
  el.setAttribute('viewBox', `0 0 ${pan.vbW.toFixed(1)} 1000`);
  pan.pmax = Math.max(0, width + (limitL1 ? 0 : BLEED) - pan.vbW);
  setPan(pan.p);
  startLeaves();
}

export function setPan(p) {
  pan.p = Math.max(0, Math.min(pan.pmax, p));
  for (const { g, d } of layers) g.style.transform = `translate(${(-pan.p * d).toFixed(1)}px, 0px)`;
  el?.dispatchEvent(new CustomEvent('pan', { detail: pan }));
}

/** Smoothly move the pan (inertia / arrow buttons / screen changes). */
export function glideTo(p, duration = 600) {
  const from = pan.p; const to = Math.max(0, Math.min(pan.pmax, p));
  if (reduced() || Math.abs(to - from) < 1) { setPan(to); return Promise.resolve(); }
  const t0 = performance.now();
  cancelAnimationFrame(glideTo.raf);
  return new Promise((res) => {
    const step = (now) => {
      const k = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setPan(from + (to - from) * e);
      if (k < 1) glideTo.raf = requestAnimationFrame(step); else res();
    };
    glideTo.raf = requestAnimationFrame(step);
  });
}
export const stopGlide = () => cancelAnimationFrame(glideTo.raf);
/** screen px → scene units */
export const pxToUnits = (px) => (px * 1000) / innerHeight;

function ambient() {
  if (reduced()) return;
  const light = el.querySelector('#light');
  light?.animate([{ opacity: 0.35 }, { opacity: 0.5 }], { id: 'idle', duration: 3500, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
}

function startLeaves() {
  leaves.forEach((a) => a.cancel());
  leaves = [];
  if (reduced()) return;
  for (const [i, leaf] of [...el.querySelectorAll('#falling .falling-leaf')].entries()) {
    const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(leaf.getAttribute('transform') || '') || [0, 0, 0];
    const x = (parseFloat(m[1]) / PANO) * pan.vbW;
    const dur = 8000 + ((i * 2731) % 6000);
    const sway = 40;
    const kf = [];
    for (let k = 0; k <= 8; k++) {
      const f = k / 8;
      kf.push({ transform: `translate(${(x + Math.sin(f * Math.PI * 3 + i) * sway).toFixed(1)}px, ${(-60 + f * 1120).toFixed(1)}px) rotate(${(f * 300 + i * 40).toFixed(0)}deg)` });
    }
    leaves.push(leaf.animate(kf, { id: 'idle', duration: dur, iterations: Infinity, delay: -((i * 1777) % dur) }));
  }
}
export { anim };
