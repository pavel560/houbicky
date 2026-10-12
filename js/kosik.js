// Houbičky — „Do košíku!“: sort 6 mushrooms — edible into the basket, the rest stays in the forest.
// Drag with Pointer Events, or tap the mushroom and then tap a place. Nobody loses: every mushroom ends up right.
// Every async step is bound to its round session `s`: leaving mid-animation (or starting a new round) stops it.
import { byId, svgEl } from './assets.js';
import { effectiveLevel, facesFor, basketRound, figure } from './levels.js';
import { glideTo } from './scene.js';
import { warnPulse, nod, idle, stopIdle } from './anim.js';
import { $, $$, h, icon, esc, say, name, anim, reduced, ms, shuffle, isEdible, starsHtml } from './ui.js';
import { t, getLang } from './i18n.js';
import * as store from './store.js';
import * as sound from './sound.js';
import { celebrate } from './confetti.js';
import { go } from './router.js';

const ROUND = 6; const NS = 'http://www.w3.org/2000/svg';
const BASKET_X = [150, 250, 112, 288, 200, 178]; const ZONE_X = [262, 322, 214, 360, 290];
let S = null;   // current round session
const live = (s) => s && S === s;

/** Kept for compatibility: a round per level (js/levels.js). */
export const pickRound = (n = effectiveLevel()) => basketRound(n, ROUND);

export function mount(root) {
  const lvl = effectiveLevel();
  glideTo(560, reduced() ? 1 : 500);
  root.append(h(`<div class="game kosik" data-level="${lvl}" data-faces="${facesFor(lvl)}">
    <div class="topbar ui">
      <button class="btn round r64 paper" data-act="home" aria-label="${esc(t('nav.home'))}">${icon('home')}</button>
      <h1 class="title-pill pill">${esc(t('game.kosik.title'))}</h1>
      <span class="spacer"></span>
      <div class="stars pill" role="status"></div>
      <button class="btn round r88 gold" data-act="speak" aria-label="${esc(t('card.listen'))}">${icon('speaker')}</button>
    </div>
    <div class="target zone ui" data-target="les"><div class="target-art"></div>
      <button class="chip-label" data-act="les">${icon('hand-stop', 'hand')}<span>${esc(t('kosik.zone'))}</span></button></div>
    <div class="target basket ui" data-target="kosik"><div class="target-art"></div>
      <button class="chip-label" data-act="kosik">${icon('badge-jedla', 'badge')}<span>${esc(t('kosik.basket'))}</span></button></div>
    <div class="pieces"></div>
  </div>`));
  const g = $('.game', root);
  const basket = svgEl('basket'); basket.removeAttribute('role'); $('.basket .target-art', g).append(basket);
  const zone = svgEl('zone-les'); zone.removeAttribute('role'); $('.zone .target-art', g).append(zone);
  basket.querySelector('title')?.remove(); zone.querySelector('title')?.remove();
  const s = { g, lvl, queue: basketRound(lvl, ROUND), active: null, stars: 0, misses: {}, firstTry: 0, busy: false, done: false, placedB: 0, placedZ: 0, basket, zone };
  S = s;
  s.pieces = s.queue.map((sp) => makePiece(s, sp));
  renderStars(s);
  layout();
  addEventListener('resize', layout);
  g.addEventListener('click', onClick);
  next(s, true);
}

export function unmount() {
  removeEventListener('resize', layout);
  S?.pieces.forEach((p) => stopIdle($('svg', p)));
  S = null;
}

function makePiece(s, sp) {
  const el = h(`<div class="piece" data-id="${sp.id}" data-group="${sp.group}" role="button" tabindex="-1" aria-label="${esc(name(sp))}"></div>`);
  const svg = figure(sp.id, s.lvl);
  el.append(svg);
  $('.pieces', s.g).append(el);
  idle(svg);
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', () => { if (S?.drag) { S.drag = null; returnHome(S); } });
  return el;
}

// ---- layout: rest positions (feet) for the active piece and the queue
function geom() {
  const W = innerWidth; const H = innerHeight;
  const hgt = Math.min(H * 0.26, 200);
  return { W, H, hgt, w: hgt * 240 / 280, active: [W * 0.47, H * 0.935], queue: [[W * 0.41, H * 0.69], [W * 0.515, H * 0.695]] };
}
function setRest(el, foot, scale = 1) {
  const { hgt, w } = geom();
  el.style.width = `${w * scale}px`; el.style.height = `${hgt * scale}px`;
  el.style.left = `${foot[0] - (w * scale) / 2}px`; el.style.top = `${foot[1] - hgt * scale * (262 / 280)}px`;
  el._foot = foot;
}
function layout() {
  const s = S; if (!s) return;
  const G = geom();
  if (s.active) setRest(s.active, G.active);
  const waiting = s.pieces.filter((p) => p !== s.active && !p._done);
  waiting.forEach((p, i) => {
    p.hidden = i >= G.queue.length;
    if (i < G.queue.length) setRest(p, G.queue[i], 0.72);
    p.style.zIndex = 5 - i;
  });
}

function renderStars(s) {
  const el = $('.stars', s.g);
  el.innerHTML = starsHtml(s.stars, ROUND);
  el.setAttribute('aria-label', t('game.stars', { n: s.stars, total: ROUND }));
}
/** What the speaker says right now — never touches a missing piece. */
function instruction(s) {
  if (!s || s.done) return 'ui.kosik.done';
  if (!s.active) return 'ui.kosik.intro';
  return `sp.${s.active.dataset.id}.kosik`;
}

async function next(s, first = false) {
  if (!live(s)) return;
  const nextEl = s.pieces.find((p) => !p._done && p !== s.active);
  if (!nextEl) { finish(s); return; }
  const before = nextEl.getBoundingClientRect();
  s.active = nextEl;
  nextEl.classList.add('active'); nextEl.tabIndex = 0;
  layout();
  const after = nextEl.getBoundingClientRect();
  if (!reduced()) {
    const dx = before.left + before.width / 2 - (after.left + after.width / 2); const dy = before.bottom - after.bottom;
    const sc = before.width / after.width || 1;
    await anim(nextEl, [
      { translate: `${dx}px ${dy}px`, scale: `${sc}` },
      { translate: `${dx / 2}px ${dy / 2 - 70}px`, scale: `${(sc + 1) / 2}`, offset: 0.5 },
      { translate: '0px 0px', scale: '1' },
    ], { duration: 520, easing: 'ease-in-out' });
    if (!live(s)) return;
  }
  say(first ? ['ui.kosik.intro', instruction(s)] : instruction(s));
}

// ---- input
function onDown(e) {
  const s = S; const el = e.currentTarget;
  if (!s || s.busy || s.done || el !== s.active) return;
  e.preventDefault();
  el.setPointerCapture(e.pointerId);
  s.drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
  el.classList.add('lifted');
  sound.play('pop');
}
function onMove(e) {
  const s = S; const d = s?.drag; if (!d || e.pointerId !== d.id) return;
  const dx = e.clientX - d.x; const dy = e.clientY - d.y;
  if (!d.moved && Math.hypot(dx, dy) > 10) d.moved = true;
  if (!d.moved) return;
  s.active.style.translate = `${dx}px ${dy}px`;
  const tg = hit(s, e.clientX, e.clientY);
  for (const z of $$('.target', s.g)) z.classList.toggle('hover', z.dataset.target === tg);
}
function onUp(e) {
  const s = S; const d = s?.drag; if (!d || e.pointerId !== d.id) return;
  s.drag = null;
  $$('.target', s.g).forEach((z) => z.classList.remove('hover'));
  if (!d.moved) {                       // tap mode: select, then tap a place
    s.active.classList.remove('lifted');
    s.g.classList.add('choosing');
    sound.play('boing');
    anim(s.active, [{ translate: '0 0' }, { translate: '0 -40px' }, { translate: '0 0' }], { duration: reduced() ? 1 : 420, easing: 'ease-out' });
    return;
  }
  const tg = hit(s, e.clientX, e.clientY);
  if (tg) resolve(s, tg); else returnHome(s);
}
function hit(s, x, y) {
  for (const z of $$('.target', s.g)) {
    const r = $('.target-art', z).getBoundingClientRect(); const pad = 24;
    if (x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad) return z.dataset.target;
  }
  return null;
}
function onClick(e) {
  const s = S; const b = e.target.closest('[data-act], .target'); if (!b || !s) return;
  const act = b.dataset.act || b.dataset.target;
  if (act === 'home') { go('les'); return; }
  if (act === 'speak') { sound.play('tap'); say(instruction(s)); return; }
  if (act === 'again') { go('kosik'); return; }
  if ((act === 'kosik' || act === 'les') && s.active && !s.busy && !s.drag && !s.done) resolve(s, act);
}

// ---- outcomes
function currentOffset(el) {
  const v = (el.style.translate || '0px 0px').split(' ').map(parseFloat);
  return [v[0] || 0, v[1] || 0];
}
async function returnHome(s, arc = false) {
  const el = s?.active; if (!el) return;
  const [x, y] = currentOffset(el);
  el.classList.remove('lifted');
  await anim(el, [{ translate: `${x}px ${y}px` }, ...(arc ? [{ translate: `${x / 2}px ${y / 2 - 90}px`, offset: 0.45 }] : []), { translate: '0px 0px' }],
    { duration: ms('--t-return', 480), easing: arc ? 'ease-in-out' : 'cubic-bezier(.22,1,.36,1)' });
  el.style.translate = '';
}

function targetPoint(s, which, unitsX, unitsY) {
  const art = $(`.${which === 'kosik' ? 'basket' : 'zone'} .target-art`, s.g).getBoundingClientRect();
  const vbW = 400; const vbH = which === 'kosik' ? 320 : 290;
  return [art.left + (unitsX / vbW) * art.width, art.top + (unitsY / vbH) * art.height, art.width / vbW];
}

async function resolve(s, target) {
  if (!live(s) || !s.active) return;
  const el = s.active; const sp = byId.get(el.dataset.id); const edible = isEdible(sp);
  s.busy = true; s.g.classList.remove('choosing');
  const correct = (target === 'kosik') === edible;
  if (correct) {
    if (!s.misses[sp.id]) { s.firstTry++; store.markMastery(sp.id, 'kosik', s.lvl); }
    store.addSticker(sp.id);
    const ok = await (target === 'kosik' ? dropInBasket(s, el, sp) : placeInZone(s, el, sp));
    if (!ok || !live(s)) return;
    s.stars++; renderStars(s);
    sound.play('sparkle');
    const st = $$('.star', s.g)[s.stars - 1];
    if (st) anim(st, [{ transform: 'scale(.3)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
    $$('.target', s.g).forEach((z) => z.classList.remove('hint'));
    el._done = true; s.active = null;
    await say(target === 'kosik' ? 'ui.kosik.inBasket' : 'ui.kosik.inZone');
    if (!live(s)) return;
    s.busy = false;
    next(s);
    return;
  }
  s.misses[sp.id] = (s.misses[sp.id] || 0) + 1;
  sound.play('tryAgain');
  if (target === 'kosik') {        // not edible → bounces off the rim, back to the start
    const [tx, ty] = targetPoint(s, 'kosik', 200, 70); const r = el.getBoundingClientRect();
    const [x, y] = currentOffset(el);
    const ux = tx - (r.left + r.width / 2) + x; const uy = ty - r.bottom + y;
    el.classList.remove('lifted');
    warnPulse($('svg', el));
    say(sp.group === 'jedovata' ? 'ui.kosik.poisonBounce' : 'ui.kosik.inedibleBounce');
    await anim(el, [{ translate: `${x}px ${y}px` }, { translate: `${ux}px ${uy}px`, offset: 0.35 }, { translate: `${ux * 0.5}px ${uy - 120}px`, offset: 0.65 }, { translate: '0px 0px' }],
      { duration: ms('--t-drop', 550) + ms('--t-return', 480), easing: 'ease-in-out' });
    if (!live(s)) return;
    el.style.translate = '';
  } else {                         // edible → hops back gently
    say('ui.kosik.edibleToZone');
    await returnHome(s, true);
    if (!live(s)) return;
  }
  if (s.misses[sp.id] >= 2) $(`.target[data-target="${edible ? 'kosik' : 'les'}"]`, s.g).classList.add('hint');
  s.busy = false;
}

async function flyTo(el, foot, itemH) {
  const [x, y] = currentOffset(el);
  const { hgt } = geom();
  const sc = itemH / hgt;
  const fx = el._foot[0]; const fy = el._foot[1];
  el.classList.remove('lifted');
  await anim(el, [
    { translate: `${x}px ${y}px`, scale: '1.08' },
    { translate: `${(foot[0] - fx + x) / 2}px ${Math.min(foot[1] - fy, y) - 60}px`, scale: `${(1 + sc) / 2}`, offset: 0.5 },
    { translate: `${foot[0] - fx}px ${foot[1] - fy}px`, scale: `${sc}` },
  ], { duration: Math.max(1, ms('--t-drop', 550)), easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' });
}

function nestInto(parent, id, footX, footY, itemUnitsH, lvl) {
  const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'dropped');
  const inner = figure(id, lvl);
  const w = itemUnitsH * 240 / 280;
  inner.setAttribute('x', (footX - w / 2).toFixed(1)); inner.setAttribute('y', (footY - itemUnitsH * 262 / 280).toFixed(1));
  inner.setAttribute('width', w.toFixed(1)); inner.setAttribute('height', itemUnitsH.toFixed(1));
  g.append(inner); parent.append(g);
  return { g, inner };
}

/** @returns {Promise<boolean>} false if the session ended mid-animation */
async function dropInBasket(s, el, sp) {
  const bx = BASKET_X[s.placedB++ % BASKET_X.length];
  const [, , k] = targetPoint(s, 'kosik', 0, 0);
  const itemUnits = 126;                         // 280 × .45
  const above = targetPoint(s, 'kosik', bx, 112);
  await flyTo(el, [above[0], above[1]], itemUnits * k);
  if (!live(s)) return false;
  el.remove();
  const items = s.basket.querySelector('[id^="basket-items"]') || s.basket;
  const { g, inner } = nestInto(items, sp.id, bx, 182, itemUnits, s.lvl);
  sound.play('pop');
  await anim(g, [{ transform: 'translateY(-70px)' }, { transform: 'translateY(0)' }], { duration: reduced() ? 1 : 260, easing: 'cubic-bezier(.55,0,1,.45)' });
  if (!live(s)) return false;
  await anim(inner, [{ transform: 'scale(1.12, .86)' }, { transform: 'scale(.96, 1.05)' }, { transform: 'scale(1)' }], { duration: reduced() ? 1 : 360, easing: 'ease-out' });
  return live(s);
}

async function placeInZone(s, el, sp) {
  const zx = ZONE_X[s.placedZ++ % ZONE_X.length];
  const [, , k] = targetPoint(s, 'les', 0, 0);
  const itemUnits = 112;                         // 280 × .4
  const foot = targetPoint(s, 'les', zx, 235);
  await flyTo(el, [foot[0], foot[1]], itemUnits * k);
  if (!live(s)) return false;
  el.remove();
  const { inner } = nestInto(s.zone, sp.id, zx, 235, itemUnits, s.lvl);
  sound.play('pop');
  nod(inner);
  return true;
}

async function finish(s) {
  if (!live(s)) return;
  s.done = true;
  const g = s.g;
  store.recordGame('kosik', { rounds: ROUND, correct: s.firstTry });
  sound.play('success');
  anim($('.basket .target-art', g), [{ transform: 'translateY(0)' }, { transform: 'translateY(-26px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: reduced() ? 1 : 900, easing: 'ease-out' });
  celebrate({ kind: 'leaves', duration: ms('--t-celebrate', 2400) });
  g.append(h(`<div class="end-panel ui" role="dialog" aria-label="${esc(t('kosik.done'))}">
    <p class="end-stars">${starsHtml(ROUND, ROUND)}</p>
    <div class="end-doors">
      <button class="door" data-act="again"><span class="door-ic mint r120">${icon('retry')}</span><span class="door-label">${esc(t('game.again'))}</span></button>
      <button class="door" data-act="home"><span class="door-ic cream r120">${icon('home')}</span><span class="door-label">${esc(t('nav.home'))}</span></button>
    </div></div>`));
  await say('ui.kosik.done');
}
