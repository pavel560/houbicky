// Houbičky — character motion (DESIGN §7): idle sway + blink, tap bounce, wobble, jump, nod, warn pulse.
import { anim, ms, reduced } from './ui.js';

const rnd = (a, b) => a + Math.random() * (b - a);

export function idle(svg) {
  if (!svg || reduced() || ms('--idle-sway', 5200) <= 1) return;
  const body = svg.querySelector('.body');
  const sway = ms('--idle-sway', 5200);
  body?.animate([
    { transform: 'rotate(-1.2deg) scaleY(1)' },
    { transform: 'rotate(1.2deg) scaleY(1.015)' },
  ], { id: 'idle', duration: sway / 2, direction: 'alternate', iterations: Infinity, easing: 'cubic-bezier(.65,0,.35,1)', delay: -rnd(0, sway) });
  const warn = svg.querySelector('.warn');
  warn?.animate([{ transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }],
    { id: 'idle', duration: 800, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: -rnd(0, 1600) });
  const eyes = svg.querySelector('.eyes');
  if (!eyes) return;
  const lo = ms('--idle-blink-min', 2800); const hi = ms('--idle-blink-max', 6500); const closed = ms('--t-blink', 140);
  const loop = () => {
    if (!svg.isConnected) return;
    if (!document.hidden) {
      eyes.animate([
        { transform: 'scaleY(1)' }, { transform: 'scaleY(.1)', offset: 0.35 },
        { transform: 'scaleY(.1)', offset: 0.65 }, { transform: 'scaleY(1)' },
      ], { duration: closed + 140, easing: 'ease-in-out' });
    }
    svg._blink = setTimeout(loop, rnd(lo, hi));
  };
  svg._blink = setTimeout(loop, rnd(400, hi));
}

export function stopIdle(svg) {
  clearTimeout(svg?._blink);
  svg?.querySelectorAll('.body, .warn').forEach((g) => g.getAnimations().forEach((a) => a.cancel()));
}

/** Tap squash-stretch on .body + head wobble on .cap/.under (skipped for troudnatec). */
export function bounce(svg) {
  const d = ms('--t-bounce', 650);
  const body = svg?.querySelector('.body');
  const p1 = anim(body, [
    { transform: 'none' },
    { transform: 'scale(1.12, .86)', offset: 0.18 },
    { transform: 'translateY(-18px) scale(.92, 1.1)', offset: 0.45 },
    { transform: 'scale(1.04, .97)', offset: 0.75 },
    { transform: 'none' },
  ], { duration: d, easing: 'ease-out', composite: 'add' });
  if (svg?.dataset.id !== 'troudnatec') {
    const kf = [{ transform: 'rotate(0)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(0)' }];
    svg?.querySelectorAll('.cap, .under').forEach((g) => anim(g, kf, { duration: reduced() ? 1 : 500, easing: 'ease-in-out' }));
  }
  return p1;
}

/** Gentle "no" wobble — for a wrong pick (never harsh). */
export const wobble = (el) => anim(el, [
  { transform: 'rotate(0)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(6deg)' },
  { transform: 'rotate(-4deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' },
], { duration: reduced() ? 1 : 600, easing: 'ease-in-out', composite: 'add' });

/** Happy jump. */
export const jump = (el) => anim(el, [
  { transform: 'translateY(0) scale(1)' }, { transform: 'translateY(0) scale(1.1, .9)', offset: 0.15 },
  { transform: 'translateY(-60px) scale(.95, 1.08)', offset: 0.45 }, { transform: 'translateY(0) scale(1.08, .92)', offset: 0.75 },
  { transform: 'translateY(0) scale(1)' },
], { duration: reduced() ? 1 : 700, easing: 'ease-out', composite: 'add' });

/** Nod (sits in the forest zone). */
export const nod = (svg) => anim(svg?.querySelector('.body'), [
  { transform: 'rotate(0)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' },
], { duration: reduced() ? 1 : 900, easing: 'ease-in-out', composite: 'add' });

/** Poisonous: the „!“ marks pulse twice. */
export const warnPulse = (svg) => anim(svg?.querySelector('.warn'), [
  { transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' },
], { duration: reduced() ? 1 : 900, easing: 'ease-in-out', composite: 'add' });

// Idle loops pause while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  for (const a of document.getAnimations()) if (a.id === 'idle') (document.hidden ? a.pause() : a.play());
});
