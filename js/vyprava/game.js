// Výprava do lesa — 2D side-scrolling walk („like Mario“) with parallax depth (DESIGN-v2 §4, v2.2).
// DOM + SVG only, no 3D library. Layers move with translate3d; static art is <img> (rasterised once by the
// browser), animated actors (child, hedgehog, mushrooms, animals) are inline SVG so their pose groups switch.
// Safety (§1): poisonous mushrooms are never picked up and never rewarded; the end check never says „špatně“.
import { byId, svgEl, loadArt, shroom, twinsOf, photoShown, photoUrl } from '../assets.js';
import { effectiveLevel, speciesFor, facesFor, conf } from '../levels.js';
import { $, $$, h, icon, esc, say, hush, name, anim, reduced, sleep, groupKeyOf, badgeOf, starsHtml } from '../ui.js';
import { t, groupLabel } from '../i18n.js';
import * as store from '../store.js';
import * as sound from '../sound.js';
import { celebrate } from '../confetti.js';
import { go } from '../router.js';
import { Chain, parseSegment, planRound, buildStart, buildAfterFork, SEG_W, STOP_GAP } from './world.js';

const V = 'vyprava/';
const SEGS = ['flat', 'up', 'crest', 'down', 'brook'];
const PROPS = ['moss-cushion-1', 'moss-cushion-2', 'moss-cushion-3', 'moss-collar', 'rock-mossy-1', 'rock-mossy-2', 'rock-mossy-3',
  'stump', 'log', 'roots-flare', 'fern', 'blueberry', 'leafpile-front', 'signpost', 'side-fork-sign', 'stop-bubble', 'sparkle'];
const ACTORS = ['side-child', 'side-jezek', 'guide-jezek', 'srnka', 'zajic', 'veverka'];
const TILES = ['side-sky', 'side-far', 'side-mid', 'side-front'];
const KIT = [...SEGS.map((k) => `side-ground-${k}`), ...PROPS, ...ACTORS, ...TILES].map((n) => V + n);

// size of each piece in stage units = its viewBox × scale (DESIGN-v2 §4.3 "Scale")
const SC = { 'side-child': 0.75, 'side-jezek': 0.5, mushroom: 0.55, 'moss-cushion-1': 0.67, 'moss-cushion-2': 0.67, 'moss-cushion-3': 0.67,
  'moss-collar': 0.8, 'rock-mossy-1': 0.8, 'rock-mossy-2': 0.66, 'rock-mossy-3': 0.8, stump: 0.68, log: 0.6, 'roots-flare': 0.62,
  fern: 0.42, blueberry: 0.55, 'leafpile-front': 0.5, signpost: 0.9, 'side-fork-sign': 0.85, srnka: 0.42, zajic: 0.36, veverka: 0.36 };
const SPEED = 180;                 // units / s
const ACCEL = SPEED / 0.3;         // ease in/out 300 ms
const PAR = { far: 0.15, mid: 0.45, front: 1.35 };
const PAR_REDUCED = { far: 0, mid: 0.2, front: 1 };
const TILE = 2048;

let S = null;
const live = (s) => s && S === s;

// ---------------------------------------------------------------- art metadata
const meta = {};
function readMeta(name) {
  if (meta[name]) return meta[name];
  const el = svgEl(V + name, { unique: false });
  const vb = (el.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
  const pair = (a) => (el.getAttribute(a) || '').split(/\s+/).map(Number);
  const foot = el.hasAttribute('data-foot') ? pair('data-foot') : [vb[2] / 2, vb[3]];
  return (meta[name] = { w: vb[2], h: vb[3], foot, top: el.hasAttribute('data-top') ? pair('data-top') : null, runY: parseFloat(el.dataset.runY || '650') });
}
const MUSH = { w: 240, h: 280, foot: [120, 262] };

/** Position an element so that its foot point lands on (x, y) in stage units. */
function place(el, m, x, y, sc, z = 0) {
  Object.assign(el.style, { left: `${x - m.foot[0] * sc}px`, top: `${y - m.foot[1] * sc}px`, width: `${m.w * sc}px`, height: `${m.h * sc}px` });
  if (z) el.style.zIndex = z;
  el.dataset.fx = m.foot[0] * sc; el.dataset.fy = m.foot[1] * sc;
  return el;
}
const img = (name, cls = '') => h(`<img class="vy-prop ${cls}" src="art/${V}${name}.svg" alt="" draggable="false" decoding="async">`);

// ---------------------------------------------------------------- screen
export function mount(root) {
  const lvl = effectiveLevel();
  root.append(h(`<div class="game vyprava2" data-level="${lvl}">
    <div class="vy-stage" data-faces="${facesFor(lvl)}">
      <img class="vy-sky" src="art/${V}side-sky.svg" alt="" draggable="false">
      <div class="vy-layer vy-far"></div>
      <div class="vy-layer vy-mid"></div>
      <div class="vy-layer vy-animals"></div>
      <div class="vy-layer vy-world"><div class="vy-ground"></div><div class="vy-props"></div><div class="vy-actors"></div><div class="vy-covers"></div></div>
      <div class="vy-layer vy-front"></div>
    </div>
    <div class="vy-hud">
      <button class="btn round r64 paper hud-home ui" data-act="home" aria-label="${esc(t('nav.home'))}">${icon('home')}</button>
      <div class="pill trail-dots ui" role="status" aria-hidden="true">${icon('footsteps', 'tr-ic')}<span class="dots"></span>${icon('basket', 'tr-ic')}</div>
      <button class="btn round r88 gold hud-speak ui" data-act="speak" aria-label="${esc(t('card.listen'))}">${icon('speaker')}</button>
      <div class="hud-basket ui" role="status"><img src="art/basket.svg" alt=""><b class="bk-count">0</b></div>
      <button class="btn round r64 paper hud-back ui" data-act="back" aria-label="${esc(t('vyprava.back'))}">${icon('arrow-left')}</button>
      <button class="btn round gold hud-next ui" data-act="next" aria-label="${esc(t('vyprava.next'))}">${icon('arrow-right')}<span>${esc(t('vyprava.next'))}</span></button>
      <div class="fork-arrows ui" hidden>
        <button class="btn round gold fork-up" data-act="fork" data-side="up" aria-label="${esc(t('vyprava.fork.up'))}">${icon('trail-up')}</button>
        <button class="btn round gold fork-down" data-act="fork" data-side="down" aria-label="${esc(t('vyprava.fork.down'))}">${icon('trail-down')}</button>
      </div>
      <div class="decide ui" hidden></div>
    </div>
  </div>`));
  const g = $('.game', root);
  const s = { g, lvl, reduced: reduced(), state: 'loading', x: 300, v: 0, want: 0, mode: null, camX: 0, camY: 76, camY0: 76,
    items: [], next: 0, basket: [], stars: 0, met: new Set(), decided: 0, animals: 0, lastAnimalAt: 0, departures: 0, segEls: new Map(),
    t0: performance.now(), stopAt: 0, hintTimers: [], said: {}, buttonsSpoken: false, raf: 0, last: performance.now() };
  S = s;
  g.addEventListener('click', onClick);
  const next = $('.hud-next', g); const back = $('.hud-back', g);
  next.addEventListener('pointerdown', (e) => press(s, e, 1));
  back.addEventListener('pointerdown', (e) => press(s, e, -1));
  // the finger is captured, so a wobble off the button does not end the walk; a system cancel stops walking (never a "tap")
  next.addEventListener('pointerup', () => release(s, 1)); back.addEventListener('pointerup', () => release(s, -1));
  next.addEventListener('pointercancel', () => release(s, 1, true)); back.addEventListener('pointercancel', () => release(s, -1, true));
  // a second finger tapping a mushroom while the first holds „Dál“ produces no click: handle pointerup directly
  $('.vy-world', g).addEventListener('pointerup', (e) => { const m = e.target.closest?.('.vy-mush'); if (m && S === s) mushTap(s, m); });
  s.onVis = () => { if (!s.chain) return; if (document.hidden) stopLoop(s); else startLoop(s); };
  document.addEventListener('visibilitychange', s.onVis);
  s.onResize = () => { if (s.chain && s.state !== 'loading') layout(s); };
  addEventListener('resize', s.onResize);
  start(s);
}

export function unmount() {
  const s = S; S = null; if (!s) return;
  stopLoop(s); hush();
  s.hintTimers.forEach(clearTimeout);
  document.removeEventListener('visibilitychange', s.onVis);
  removeEventListener('resize', s.onResize);
  window.__vy = null;
}

async function start(s) {
  try { await loadArt(KIT); } catch (e) { console.warn('Výprava art:', e.message); }
  if (!live(s)) return;
  const segMeta = {};
  for (const k of SEGS) segMeta[k] = parseSegment(svgText(`side-ground-${k}`));
  s.chain = new Chain(segMeta);
  s.plan = planRound(speciesFor(s.lvl), s.lvl, Date.now() & 0x7fffffff);
  const a = buildStart(s.chain, s.plan);
  s.forkX = a.forkX; s.endX = a.endX;
  addItems(s, a.items);
  buildScenery(s);
  buildLayers(s);
  buildActors(s);
  renderDots(s);
  layout(s);
  s.state = 'intro';
  window.__vy = debugApi(s);
  startLoop(s);
  intro(s);
}
function svgText(name) { return svgEl(V + name, { unique: false }).outerHTML; }

// ---------------------------------------------------------------- building the world
function buildLayers(s) {
  for (const [cls, name] of [['vy-far', 'side-far'], ['vy-mid', 'side-mid'], ['vy-front', 'side-front']]) {
    const layer = $(`.${cls}`, s.g);
    for (let k = 0; k < 2; k++) layer.append(img(name, 'vy-tile'));
  }
}

function buildActors(s) {
  const actors = $('.vy-actors', s.g);
  s.child = svgEl(V + 'side-child'); s.child.classList.add('vy-actor'); s.child.removeAttribute('role');
  s.jezek = svgEl(V + 'side-jezek'); s.jezek.classList.add('vy-actor', 'vy-companion'); s.jezek.setAttribute('role', 'button');
  s.jezek.setAttribute('aria-label', 'Ježek');
  actors.append(s.jezek, s.child);
  s.jx = s.x - 600;              // trots in from the left at the intro
}

/** Trees/moss/stones along the trail between stops, for depth (not interactive). */
function buildScenery(s) {
  const props = $('.vy-props', s.g); const r = s.plan.r;
  const near = (x) => s.items.some((m) => Math.abs(m.x - x) < 360) || (s.forkX && Math.abs(s.forkX - x) < 300);
  for (let x = s.sceneryUntil || 500; x < s.chain.end - 300; x += 420 + r() * 380) {
    if (near(x) || s.chain.inWater(x)) continue;
    const kind = ['moss-cushion-1', 'moss-cushion-3', 'rock-mossy-3', 'fern', 'blueberry', 'stump', 'moss-cushion-2'][Math.floor(r() * 7)];
    const m = readMeta(kind); const sc = (SC[kind] || 0.6) * (kind === 'fern' ? 1.25 : 0.8);
    props.append(place(img(kind, 'scenery'), m, x, s.chain.surface(x) + 4, sc));
  }
  s.sceneryUntil = s.chain.end - 300;
  if (s.forkX && !s.forkSign) {
    s.forkSign = place(img('side-fork-sign', 'fork-sign'), readMeta('side-fork-sign'), s.forkX, s.chain.surface(s.forkX) + 2, SC['side-fork-sign']);
    props.append(s.forkSign);
  }
  if (s.endX && !s.signpost) {
    s.signpost = place(img('signpost', 'signpost'), readMeta('signpost'), s.endX + 180, s.chain.surface(s.endX + 180) + 2, SC.signpost);
    props.append(s.signpost);
  }
}

/** One mushroom stop: habitat props behind, the character, an optional cover in front. */
function addItems(s, items) {
  const props = $('.vy-props', s.g); const covers = $('.vy-covers', s.g);
  for (const it of items) {
    const sp = byId.get(it.id); if (!sp) continue;
    const x = it.x; const y = s.chain.surface(x);
    let fx = x; let fy = y + 2;                                // the mushroom's foot
    if (it.habitat === 'moss') {
      props.append(place(img(`moss-cushion-${1 + (s.items.length % 3)}`), readMeta('moss-cushion-1'), x + 10, y + 4, SC['moss-cushion-1']));
    } else if (it.habitat === 'rock') {
      const m = readMeta('rock-mossy-2'); const sc = SC['rock-mossy-2'];
      props.append(place(img('rock-mossy-2'), m, x, y + 4, sc));
      if (m.top) { fx = x + (m.top[0] - m.foot[0]) * sc; fy = y + 4 + (m.top[1] - m.foot[1]) * sc + 4; }
    } else if (it.habitat === 'wood') {
      // wood growers bring their own wood in the art (stump, log, trunk as .host); add only a little moss at the foot
      props.append(place(img('moss-cushion-3'), readMeta('moss-cushion-3'), x + 30, y + 6, 0.45));
    } else {
      props.append(place(img('roots-flare'), readMeta('roots-flare'), x + 50, y + 2, SC['roots-flare']));
    }
    const wrap = h(`<div class="vy-mush" data-id="${it.id}" data-group="${sp.group}" role="button" aria-label="${esc(name(sp))}"><span class="ring"></span></div>`);
    const art = shroom(it.id, { ground: false });
    wrap.append(art);
    props.append(place(wrap, MUSH, fx, fy, SC.mushroom, 3));
    it.el = wrap; it.footX = fx; it.footY = fy;
    if (it.habitat === 'moss') covers.append(place(img('moss-collar'), readMeta('moss-collar'), fx, fy + 6, SC['moss-collar']));
    if (it.hidden) {
      const kind = it.cover === 'moss-deep' ? 'moss-cushion-2' : it.cover;
      const m = readMeta(kind); const sc = kind === 'moss-cushion-2' ? 0.5 : SC[kind];
      it.coverEl = place(img(kind, 'cover'), m, fx - 6, fy + 10, sc);
      covers.append(it.coverEl);
    }
    s.items.push(it);
  }
}

// ---------------------------------------------------------------- layout + camera
function layout(s) {
  s.scale = innerHeight / 1000;
  s.vbW = innerWidth / s.scale;
  const sc = s.scale;
  for (const sel of ['.vy-far', '.vy-mid', '.vy-animals', '.vy-world', '.vy-front']) $(sel, s.g).style.setProperty('--s', sc);
  draw(s, true);
}

function draw(s, force = false) {
  const sc = s.scale; const par = s.reduced ? PAR_REDUCED : PAR;
  const camX = s.camX; const dy = s.camY - s.camY0;
  const tiles = (sel, p, y) => {
    const off = camX * p; const k0 = Math.floor(off / TILE);
    $$(`${sel} .vy-tile`, s.g).forEach((el, i) => { el.style.transform = `translate3d(${((k0 + i) * TILE - off) * sc}px, ${y * sc}px, 0)`; });
  };
  tiles('.vy-far', par.far, -dy * 0.15);
  tiles('.vy-mid', par.mid, -dy * 0.45);
  tiles('.vy-front', par.front, 0);
  $('.vy-animals', s.g).style.transform = `translate3d(0, ${-dy * 0.45 * sc}px, 0) scale(${sc})`;
  $('.vy-world', s.g).style.transform = `translate3d(${-camX * sc}px, ${-s.camY * sc}px, 0) scale(${sc})`;
  // ground segments: only the ones near the window are in the DOM (iPad memory)
  const ground = $('.vy-ground', s.g);
  for (const seg of s.chain.segs) {
    const on = seg.x + SEG_W > camX - 300 && seg.x < camX + s.vbW + 300;
    let el = s.segEls.get(seg);
    if (on && !el) {
      el = img(`side-ground-${seg.kind}`, 'vy-seg');
      Object.assign(el.style, { left: `${seg.x}px`, top: `${seg.dy}px` });
      ground.append(el); s.segEls.set(seg, el);
    } else if (!on && el) { el.remove(); s.segEls.delete(seg); }
  }
  void force;
}

function placeActors(s) {
  const cm = readMeta('side-child'); const jm = readMeta('side-jezek');
  place(s.child, cm, s.x, s.chain.walkY(s.x), SC['side-child']);
  place(s.jezek, jm, s.jx, s.chain.walkY(s.jx), SC['side-jezek']);
  const dir = s.v < 0 ? -1 : 1;
  s.child.style.transform = dir < 0 ? 'scaleX(-1)' : '';
  s.jezek.style.transform = dir < 0 ? 'scaleX(-1)' : '';
}

// ---------------------------------------------------------------- loop
function startLoop(s) {
  if (s.raf || !live(s)) return;
  s.last = performance.now();
  const tick = () => { if (!live(s)) return; s.raf = requestAnimationFrame(tick); frame(s); };
  s.raf = requestAnimationFrame(tick);
}
function stopLoop(s) { cancelAnimationFrame(s.raf); s.raf = 0; }

function frame(s) {
  const now = performance.now(); const dt = Math.min(0.05, (now - s.last) / 1000); s.last = now;
  // walking: ease toward the wanted speed, halt exactly at the target
  if (s.state === 'walk' || s.state === 'back') {
    const target = s.state === 'walk' ? targetX(s) : 300;
    const want = s.want;
    s.v += Math.sign(want - s.v) * Math.min(Math.abs(want - s.v), ACCEL * dt);
    const remaining = target - s.x;
    if (s.state === 'walk' && remaining < (s.v * s.v) / (2 * ACCEL) + 1) s.v = Math.max(Math.min(s.v, Math.sqrt(2 * ACCEL * Math.max(0, remaining)) + 20), 0);
    s.x += s.v * dt;
    if (s.state === 'walk' && s.x >= target - 0.5) { s.x = target; s.v = 0; arrive(s); }
    if (s.state === 'back' && s.x <= target) { s.x = target; s.v = 0; }
    if (s.v === 0 && s.want === 0 && (s.state === 'walk' || s.state === 'back')) s.state = 'idle';
  }
  // the hedgehog trots ~160 behind (in front when walking back)
  const jTarget = s.x - 160 * (s.v < 0 ? -1 : 1);
  const jd = jTarget - s.jx; s.jx += Math.sign(jd) * Math.min(Math.abs(jd), Math.max(220, Math.abs(s.v) * 1.1) * dt);
  // poses
  const moving = Math.abs(s.v) > 5; const jMoving = Math.abs(jd) > 4;
  const step = Math.floor(now / 125) % 4 + 1; const jStep = Math.floor(now / 100) % 4 + 1;
  if (!s.posing) s.child.dataset.pose = moving ? (s.reduced ? 'idle' : `walk-${step}`) : (s.state === 'stop' ? 'look' : 'idle');
  s.jezek.dataset.pose = jMoving && !s.reduced ? `walk-${jStep}` : 'idle';
  // camera: avatar at 38 % of the width; y follows the trail with a 0.6 s lag
  s.camX = s.x - 0.38 * s.vbW;
  const camYt = s.chain.walkY(s.x) - 660;
  s.camY += (camYt - s.camY) * (1 - Math.exp(-dt / 0.6));
  placeActors(s);
  draw(s);
  animalFrame(s, now, dt);
  positionDecide(s);
}

function targetX(s) {
  const it = s.items[s.next];
  if (s.forkX && !s.forkChosen && (!it || it.x > s.forkX)) return s.forkX - 250;
  if (it) return it.x - STOP_GAP;
  return s.endX;
}

// ---------------------------------------------------------------- controls
function press(s, e, dir) {
  if (!live(s)) return;
  e.preventDefault();
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
  s.pressAt = performance.now(); s.pressDir = dir;
  if (dir > 0) {
    if (s.state === 'stop') { sound.play('tryAgain'); hint(s, true); return; }
    if (!['idle', 'intro', 'walk', 'back'].includes(s.state)) return;
    if (s.reduced) { jump(s); return; }
    s.state = 'walk'; s.want = SPEED; s.mode = 'hold';
    departed(s);
  } else {
    if (!['idle', 'walk', 'back', 'stop'].includes(s.state) || s.x <= 300 || s.busy) return;
    if (s.state === 'stop') leaveStop(s);
    s.state = 'back'; s.want = -SPEED * 0.8;
  }
}
function release(s, dir, cancelled = false) {
  if (!live(s) || s.pressDir !== dir || !s.pressAt) return;
  const quick = !cancelled && performance.now() - s.pressAt < 260;
  s.pressAt = 0;
  if (dir > 0 && s.state === 'walk') { if (quick) s.mode = 'toStop'; else s.want = 0; }   // tap = to the next stop; hold = walk while held
  if (dir < 0 && s.state === 'back') s.want = 0;
}

/** Reduced motion: a short crossfade jump to the next stop instead of walking. */
async function jump(s) {
  s.state = 'jumping';
  const world = $('.vy-stage', s.g);
  await anim(world, [{ opacity: 1 }, { opacity: 0.15 }], { duration: 125, fill: 'forwards' });
  if (!live(s)) return;
  s.x = targetX(s); s.jx = s.x - 160; s.camY = s.chain.walkY(s.x) - 660;
  frame(s);
  await anim(world, [{ opacity: 0.15 }, { opacity: 1 }], { duration: 125, fill: 'forwards' });
  if (!live(s)) return;
  departed(s);
  arrive(s);
}

function departed(s) {
  if (s.leftStop) return;
  s.leftStop = true; s.departures++;
  maybeAnimal(s);
}

// ---------------------------------------------------------------- stops
function arrive(s) {
  s.leftStop = false;
  const it = s.items[s.next];
  const atFork = s.forkX && !s.forkChosen && (!it || it.x > s.forkX) && Math.abs(s.x - (s.forkX - 250)) < 2;
  if (atFork) { forkStop(s); return; }
  if (!it) { endCheck(s); return; }
  s.state = 'stop'; s.stopAt = performance.now();
  s.cur = it;
  it.el.classList.add('active');
  setNext(s, false);
  renderDots(s);
  if (it.hidden) { s.jezek.dataset.expr = 'explain'; say('ui.vyprava.wait'); }
  // hint ladder (§4.5): sparkle after 12 s, the hedgehog's habitat line after 25 s
  s.hintTimers.push(setTimeout(() => { if (live(s) && s.cur === it && !it.done) sparkle(s, it); }, 12000));
  s.hintTimers.push(setTimeout(() => { if (live(s) && s.cur === it && !it.done) hint(s, true); }, 25000));
  if (s.reduced && !s.animals && s.next === 1) standingAnimal(s);
}
function leaveStop(s) {
  s.hintTimers.forEach(clearTimeout); s.hintTimers = [];
  s.cur?.el.classList.remove('active');
  s.cur = null;
}
function setNext(s, on) { $('.hud-next', s.g).classList.toggle('waiting', !on); $('.hud-next', s.g).setAttribute('aria-disabled', String(!on)); }

function hint(s, speak) {
  const it = s.cur;
  if (s.state === 'end') { if (speak && s.endLines) say(s.endLines); return; }         // replay the current find, never the intro
  if (speak && it && !it.done && it.el.classList.contains('lifted')) {                  // lifted: repeat the question asked
    const mode = $('.decide', s.g).dataset.mode;
    say(mode === 'group' && !$('.decide', s.g).hidden ? 'ui.question.group' : [`sp.${it.id}.name`, 'ui.kosik.basket', 'ui.kosik.zone']);
    return;
  }
  s.jezek.dataset.expr = 'explain';
  setTimeout(() => { if (live(s) && s.jezek.dataset.expr === 'explain') s.jezek.dataset.expr = 'idle'; }, 2500);
  if (!speak) return;
  if (it && !it.done) say(`ui.vyprava.hint.${it.hint}`);
  else if (s.state === 'fork') say('ui.vyprava.fork');
  else say('ui.vyprava.intro');
}

function sparkle(s, it) {
  const el = place(img('sparkle', 'vy-sparkle'), { w: 128, h: 128, foot: [64, 64] }, it.footX, it.footY - 120, 0.7, 6);
  $('.vy-props', s.g).append(el);
  anim(el, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.1)' }, { opacity: 0, transform: 'scale(.8)' }], { duration: 1400, iterations: 2 }).then(() => el.remove());
  sound.play('sparkle');
}

// ---------------------------------------------------------------- tapping a mushroom (§4.6)
function onClick(e) {
  const s = S; if (!s) return;
  const b = e.target.closest('[data-act], .vy-mush, .vy-companion, .vy-animal');
  if (!b) return;
  if (b.classList.contains('vy-mush')) { mushTap(s, b); return; }
  if (b.classList.contains('vy-companion')) { sound.play('tap'); hint(s, true); return; }
  if (b.classList.contains('vy-animal')) { tapAnimal(s, b); return; }
  switch (b.dataset.act) {
    case 'home': go('les'); break;
    case 'again': go('vyprava'); break;
    case 'speak': sound.play('tap'); hint(s, true); break;
    case 'fork': chooseFork(s, b.dataset.side); break;
    case 'basket': decide(s, 'basket'); break;
    case 'leave': decide(s, 'leave'); break;
    case 'group': answerGroup(s, b); break;
    case 'finish': finish(s); break;
    default:
  }
}

/** pointerup and click both arrive for a normal tap: handle once. */
function mushTap(s, el) {
  const now = performance.now();
  if (s.lastMushTap && s.lastMushTap.el === el && now - s.lastMushTap.t < 700) return;
  s.lastMushTap = { el, t: now };
  tapMushroom(s, s.items.find((m) => m.el === el));
}

async function tapMushroom(s, it) {
  if (!it || it.done || s.cur !== it || s.busy) return;
  const sp = byId.get(it.id);
  s.met.add(it.id);
  if (sp.group === 'jedovata') { warn(s, it, sp); return; }
  s.busy = true;
  s.posing = true; s.child.dataset.pose = 'pick';
  it.el.classList.add('lifted');
  sound.play('pop');
  await say(`sp.${it.id}.name`);
  if (!live(s)) return;
  if (conf(s.lvl).groupQuestion) { askGroup(s, it, sp); return; }
  showDecide(s, it);
}

/** Poisonous: no lift, no buttons, no reward — the character leans back, „!“ pulses, the stop bubble springs in. */
async function warn(s, it, sp) {
  if (it.warned) { say(sp.deadly ? ['ui.vyprava.warn', 'ui.vyprava.warnDeadly'] : 'ui.vyprava.warn'); return; }
  it.warned = true;
  it.el.classList.add('warn-on');
  s.jezek.dataset.expr = 'concern';
  sound.play('tryAgain');
  const art = $('svg', it.el);
  if (!s.reduced) {
    anim(art, [{ transform: 'rotate(0)' }, { transform: 'rotate(8deg)' }], { duration: 200, fill: 'forwards' });
    anim(art.querySelector('.warn'), [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 420, iterations: 3 });
  }
  const bubble = place(img('stop-bubble', 'vy-bubble'), { w: 160, h: 150, foot: [70, 150] }, it.footX, it.footY - 165, 0.75, 7);
  $('.vy-props', s.g).append(bubble); it.bubble = bubble;
  if (!s.reduced) anim(bubble, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  await say(sp.deadly ? ['ui.vyprava.warn', 'ui.vyprava.warnDeadly'] : 'ui.vyprava.warn');
  if (!live(s)) return;
  s.jezek.dataset.expr = 'idle';
  done(s, it);
}

/** Level 3: „Je jedlá, nejedlá, nebo jedovatá?“ first, then the basket question. */
function askGroup(s, it, sp) {
  if (photoShown(it.id)) {                                   // photo pop-up on pick (L3)
    const p = h(`<div class="vy-photo-pop"><img src="${photoUrl(it.id)}" alt=""></div>`);
    $('.decide', s.g).before(p); it.photoPop = p;
  }
  const box = $('.decide', s.g);
  box.innerHTML = ['jedla', 'nejedla', 'jedovata'].map((g) => `<button class="group-btn v-${g}" data-act="group" data-g="${g}">${icon(badgeOf({ group: g }), 'badge')}<span>${esc(groupLabel(g, false))}</span></button>`).join('');
  box.hidden = false; box.dataset.mode = 'group';
  say('ui.question.group');
  void sp;
}
async function answerGroup(s, b) {
  const it = s.cur; if (!it) return;
  const sp = byId.get(it.id);
  if (b.dataset.g !== sp.group) { sound.play('tryAgain'); anim(b, [{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], { duration: 400 }); say('ui.feedback.tryAgain'); return; }
  sound.play('success');
  $('.decide', s.g).hidden = true;
  await say(`sp.${it.id}.group`);
  if (live(s) && s.cur === it) showDecide(s, it);
}

function showDecide(s, it) {
  const box = $('.decide', s.g);
  box.innerHTML = `<button class="btn round r88 dec-basket" data-act="basket" aria-label="${esc(t('kosik.basket'))}">${icon('basket')}</button>
    <button class="btn round r88 paper dec-leave" data-act="leave" aria-label="${esc(t('kosik.zone'))}">${icon('hand-stop')}</button>`;
  box.hidden = false; box.dataset.mode = 'decide';
  positionDecide(s);
  if (!s.buttonsSpoken) { s.buttonsSpoken = true; say(['ui.kosik.basket', 'ui.kosik.zone']); }
}
/** Two 88 px buttons beside the mushroom, never over it (follow it on screen). */
function positionDecide(s) {
  const box = $('.decide', s.g); if (box.hidden || !s.cur) return;
  const it = s.cur; const sc = s.scale;
  const x = (it.footX - s.camX) * sc; const y = (it.footY - s.camY) * sc;
  const right = x + 80 * sc;
  box.style.left = `${Math.min(innerWidth - 220, right)}px`;
  box.style.top = `${Math.max(90, y - 230 * sc)}px`;
  if (it.photoPop) Object.assign(it.photoPop.style, { left: `${Math.max(8, x - 260 * sc)}px`, top: `${Math.max(90, y - 380 * sc)}px` });
}

async function decide(s, choice) {
  const it = s.cur; if (!it || it.done) return;
  const sp = byId.get(it.id);
  $('.decide', s.g).hidden = true;
  it.photoPop?.remove();
  if (choice === 'basket') {
    // hop into the child's basket, then a small copy flies into the HUD basket — no judgement now
    sound.play('pop');
    const from = it.el.getBoundingClientRect(); const to = $('.hud-basket img', s.g).getBoundingClientRect();
    const fly = h(`<img class="vy-fly" src="art/${it.id}.svg" alt="">`);
    Object.assign(fly.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
    document.body.append(fly);
    it.el.style.visibility = 'hidden'; if (it.coverEl) it.coverEl.style.opacity = '.6';
    await anim(fly, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${(to.left - from.left) * 0.4}px, ${(to.top - from.top) * 0.4 - 120}px) scale(.7)`, offset: 0.45 },
      { transform: `translate(${to.left + to.width / 2 - from.left - from.width / 2}px, ${to.top + to.height * 0.35 - from.top - from.height / 2}px) scale(.3)` }],
    { duration: s.reduced ? 1 : 700, easing: 'cubic-bezier(.55,0,.35,1)' });
    fly.remove();
    s.basket.push(it.id);
    const c = $('.bk-count', s.g); c.textContent = s.basket.length;
    anim(c, [{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 350 });
  } else {
    it.el.classList.remove('lifted');
    sound.play('tap');
    anim($('svg', it.el), [{ transform: 'rotate(0)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], { duration: s.reduced ? 1 : 800 });
    if (sp.group === 'nejedla') { s.stars++; sound.play('sparkle'); say('ui.vyprava.leftOk'); }
  }
  s.posing = false;
  done(s, it);
}

function done(s, it) {
  it.done = true; s.decided++;
  it.el.classList.remove('lifted');
  leaveStop(s);
  s.busy = false;
  s.next++;
  s.state = 'idle';
  setNext(s, true);
  renderDots(s);
}

function renderDots(s) {
  const n = s.plan.mushrooms.length;
  $('.trail-dots .dots', s.g).innerHTML = Array.from({ length: n }, (_, i) =>
    `<i class="${i < s.next ? 'done' : i === s.next ? 'cur' : ''}"></i>`).join('');
}

// ---------------------------------------------------------------- fork (§4.11)
function forkStop(s) {
  s.state = 'fork';
  setNext(s, false);
  $('.hud-next', s.g).hidden = true;
  $('.fork-arrows', s.g).hidden = false;
  s.jezek.dataset.expr = 'explain';
  say('ui.vyprava.fork');
}
function chooseFork(s, side) {
  if (s.state !== 'fork') return;
  sound.play('whoosh');
  say(`ui.vyprava.fork.${side}`);
  s.forkChosen = side;
  const b = buildAfterFork(s.chain, s.plan, side);
  s.endX = b.endX;
  addItems(s, b.items);
  buildScenery(s);
  $('.fork-arrows', s.g).hidden = true;
  $('.hud-next', s.g).hidden = false;
  s.jezek.dataset.expr = 'idle';
  setNext(s, true);
  s.state = 'walk'; s.want = SPEED; s.mode = 'toStop';
  if (s.reduced) { s.state = 'idle'; jump(s); }
}

// ---------------------------------------------------------------- animals (§4.10)
function maybeAnimal(s) {
  if (s.reduced || s.animals >= 2 || $('.vy-animal', s.g)) return;
  const since = (performance.now() - s.t0) / 1000;
  if (since < 20) return;
  const force = s.animals === 0 && s.departures >= 4;
  if (!force && Math.random() > 0.5) return;
  setTimeout(() => { if (live(s) && s.state === 'walk') spawnAnimal(s); }, 300 + Math.random() * 500);
}
/** Runs in the mid layer from the right edge to the left; fades out (behind a trunk) before it gets near any mushroom. */
function spawnAnimal(s, kind) {
  if (!live(s) || $('.vy-animal', s.g)) return null;
  kind = kind || ['srnka', 'zajic', 'veverka'][s.animals % 3];
  const m = readMeta(kind); const sc = SC[kind];
  const el = svgEl(V + kind); el.classList.add('vy-animal'); el.dataset.kind = kind; el.dataset.pose = '1'; el.setAttribute('role', 'button');
  const wrap = h('<div class="vy-animal-wrap"></div>'); wrap.append(el);
  // feet on the mid layer's run line (data-run-y); the layer itself is drawn 1000 units tall
  const runY = readMeta('side-mid').runY;
  Object.assign(wrap.style, { width: `${m.w * sc}px`, height: `${m.h * sc}px`, top: `${runY - m.foot[1] * sc}px` });
  $('.vy-animals', s.g).append(wrap);
  s.animal = { el, wrap, kind, x: s.vbW + 60, speed: { srnka: 520, zajic: 640, veverka: 440 }[kind], t0: performance.now(), freezeUntil: 0, pauseDone: false, w: m.w * sc, sc, climbY: 0 };
  if (kind === 'veverka') {                    // §4.10a: runs right to a mid-layer trunk, then climbs up and out
    const trunk = climbTrunk(s);
    if (trunk !== null) Object.assign(s.animal, { x: -m.w * sc / 2, dir: 1, trunk, phase: 'run', grip: (parseFloat(el.dataset.climbGripX || el.getAttribute('data-climb-grip-x')) || 262) * sc - m.w * sc / 2 });
  }
  s.animals++;
  sound.play('hop');
  return s.animal;
}
// trunk left edges in side-mid.svg (tile units, period 2048): beech 366, birch 685, beech 1236, birch 1785
const MID_TRUNKS = [366, 685, 1236, 1785];
const trunkScreenX = (s, t) => t - s.camX * (s.reduced ? PAR_REDUCED.mid : PAR.mid);
/** A trunk ahead on screen (tile + period) to climb, ≥ 300 units from any mushroom; null if none. */
function climbTrunk(s) {
  const off = s.camX * PAR.mid;
  for (let k = Math.floor(off / TILE); k <= Math.floor(off / TILE) + 1; k++) {
    for (const t0 of MID_TRUNKS) {
      const t = t0 + k * TILE; const x = trunkScreenX(s, t);
      if (x < s.vbW * 0.2 || x > s.vbW * 0.95) continue;
      if (s.items.some((m) => m.el.style.visibility !== 'hidden' && Math.abs((m.footX - s.camX) - x) < 300)) continue;
      return t;
    }
  }
  return null;
}
function squirrelFrame(s, a, now, dt) {
  const frozen = now < a.freezeUntil; const k = (now - a.t0) / 1000;
  const gripX = trunkScreenX(s, a.trunk);              // the trunk moves with the mid layer while she walks
  if (a.phase === 'run') {
    if (!frozen) a.x += a.speed * dt;
    a.el.dataset.pose = frozen ? '1' : String(Math.floor(k * 11) % 4 + 1);
    if (a.x + a.grip >= gripX) { a.phase = 'climb'; a.tc = now; }
  }
  if (a.phase === 'climb') {
    a.x = gripX - a.grip;
    if (!frozen) a.climbY += 133 * dt;                  // ≈ 40 units per 3-pose cycle at 10 fps
    a.el.dataset.pose = frozen ? 'climb-1' : `climb-${Math.floor((now - a.tc) / 100) % 3 + 1}`;
  }
  a.wrap.style.transform = `translate3d(${a.x - a.w / 2}px, ${-a.climbY}px, 0)`;
  if (a.climbY > 420 || a.x > s.vbW + a.w) {
    s.animal = null;
    anim(a.wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).then(() => a.wrap.remove());
  }
}
function animalFrame(s, now, dt) {
  const a = s.animal; if (!a) return;
  if (a.trunk !== undefined) { squirrelFrame(s, a, now, dt); return; }
  const frozen = now < a.freezeUntil;
  if (!frozen) {
    // the hare's zig-zag stop
    if (a.kind === 'zajic' && !a.pauseDone && a.x < s.vbW * 0.6) { a.pauseDone = true; a.freezeUntil = now + 350; }
    a.x -= a.speed * dt;
  }
  const el = a.el; const k = (now - a.t0) / 1000;
  const cyc = Math.floor(k * 11) % 4 + 1;
  el.dataset.pose = frozen ? '1' : (a.kind === 'srnka' && Math.sin(k * 5.2) > 0.75 ? '3' : String(cyc));
  const hop = a.kind === 'srnka' && !frozen ? -Math.max(0, Math.sin(k * 5.2)) * 70 : a.kind === 'zajic' && !frozen ? -Math.abs(Math.sin(k * 11)) * 14 : 0;
  a.wrap.style.transform = `translate3d(${a.x - a.w / 2}px, ${hop}px, 0) scaleX(-1)`;
  // never near a mushroom: ≥ 300 units horizontally from any mushroom on screen — fade out behind a trunk instead
  const near = s.items.some((m) => m.el.style.visibility !== 'hidden' && Math.abs((m.footX - s.camX) - a.x) < 300);
  if (near || a.x < -a.w) {
    s.animal = null;
    anim(a.wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).then(() => a.wrap.remove());
  }
}
function tapAnimal(s, el) {
  const kind = el.dataset.kind;
  if (s.animal && s.animal.el === el) s.animal.freezeUntil = performance.now() + 1200;
  el.dataset.pose = s.animal?.phase === 'climb' ? 'climb-1' : '1';
  sound.play('sparkle');
  say(`ui.animal.${kind}`);
}
/** Reduced motion: no runs — an animal stands still in the mid layer at a stop, tappable the same way. */
function standingAnimal(s) {
  const a = spawnAnimal(s, 'srnka'); if (!a) return;
  a.speed = 0; a.x = 220; a.wrap.style.transform = `translate3d(${a.x - a.w / 2}px, 0, 0)`;
  s.animal = null;                       // not moving: no frame updates
  setTimeout(() => a.wrap.remove(), 15000);
}

// ---------------------------------------------------------------- intro + end (§4.7, §4.8)
async function intro(s) {
  s.jezek.dataset.expr = 'explain';
  setNext(s, true);
  await say('ui.vyprava.intro');
  if (live(s)) s.jezek.dataset.expr = 'idle';
  if (live(s) && s.state === 'intro') s.state = 'idle';
}

const COOKED = (id) => /uvař/i.test(byId.get(id)?.caution?.cs || '');
const ADULT_DECIDES = (id) => /Rozhodne dospělý\./.test(byId.get(id)?.caution?.cs || '');
/** Extra line after „Do košíku!“: cooked-only species → a grown-up cooks it; conditional ones → a grown-up decides. */
const edibleExtra = (id) => (COOKED(id) ? ['ui.vyprava.cooked'] : ADULT_DECIDES(id) ? ['ui.vyprava.adultDecides'] : []);

async function endCheck(s) {
  if (s.state === 'end') return;
  s.state = 'end';
  setNext(s, false);
  $('.vy-hud', s.g).classList.add('ending');
  for (const id of s.met) store.addSticker(id);            // stickers for every species she met
  const layer = h(`<div class="vy-end">
    <img class="ve-bg" src="art/${V}end-clearing.svg" alt="" draggable="false">
    <img class="ve-sign" src="art/${V}signpost.svg" alt="">
    <div class="ve-stars pill" role="status"${s.stars ? '' : ' hidden'}>${starsHtml(s.stars, s.stars)}</div>
    <div class="ve-cloth"></div>
    <div class="ve-finds"></div>
    <div class="ve-guide"></div>
    <div class="ve-twin" hidden></div>
    <p class="ve-adult pill">${icon('parents')}<span>${esc(t('safety.short').replace(/\.$/, ''))}</span></p>
    <div class="ve-actions" hidden></div>
  </div>`);
  s.g.append(layer);
  const guide = svgEl(V + 'guide-jezek'); guide.dataset.expr = 'idle'; $('.ve-guide', layer).append(guide);
  const still = s.reduced;
  await anim($('.ve-cloth', layer), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: still ? 1 : 500, easing: 'ease-out' });
  guide.dataset.expr = 'explain';
  await say('ui.vyprava.end');
  if (!live(s)) return;
  // lay the finds out one by one
  const finds = $('.ve-finds', layer); const pieces = [];
  for (const id of s.basket) {
    const p = h(`<div class="ve-piece" data-id="${id}"></div>`);
    p.append(pickCrop(id)); finds.append(p); pieces.push(p);
    if (!still) await anim(p, [{ transform: 'translateY(-80px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    sound.play('pop');
    if (!still) await sleep(80);
  }
  let stars = s.stars; let got = 0;
  for (const p of pieces) {
    if (!live(s)) return;
    const id = p.dataset.id; const sp = byId.get(id);
    p.classList.add('checking');
    if (sp.group === 'jedla') {
      guide.dataset.expr = 'happy';
      got++; stars++;
      $('.ve-stars', layer).innerHTML = starsHtml(stars, stars);          // only earned stars, never empty slots
      $('.ve-stars', layer).hidden = false;
      sound.play('sparkle');
      s.endLines = [`sp.${id}.name`, 'ui.vyprava.toBasket', ...edibleExtra(id)];
      await say(s.endLines);
    } else {
      // never „špatně“: the twin card explains the decisive difference, the piece goes back to the forest
      guide.dataset.expr = 'explain';
      p.classList.add('glow');
      showTwin(s, layer, id);
      s.endLines = [`sp.${id}.thatIs`, ...(sp.twinTell ? [`sp.${id}.twinTell`] : []), 'ui.vyprava.notEdible'];
      await say(s.endLines);
      if (!live(s)) return;
      $('.ve-twin', layer).hidden = true;
      await anim(p, [{ transform: 'none', opacity: 1 }, { transform: 'translate(-120px, -60px) rotate(-20deg)', opacity: 0 }], { duration: still ? 1 : 600, fill: 'forwards' });
    }
    p.classList.remove('checking');
    if (!still) await sleep(250);
  }
  if (!live(s)) return;
  guide.dataset.expr = 'happy';
  if (!still) celebrate({ kind: 'leaves', duration: 2400 });
  sound.play('success');
  s.endLines = ['ui.vyprava.done'];
  store.recordGame('vyprava', { rounds: s.plan.mushrooms.length, correct: stars });
  s.totalStars = stars;
  const actions = $('.ve-actions', layer); actions.hidden = false;
  actions.innerHTML = `<button class="door" data-act="again"><span class="door-ic mint r120">${icon('retry')}</span><span class="door-label">${esc(t('game.again'))}</span></button>
    <button class="door" data-act="home"><span class="door-ic cream r120">${icon('home')}</span><span class="door-label">${esc(t('nav.home'))}</span></button>`;
  await say('ui.vyprava.done');
}
function finish(s) { void s; }

/** The piece that goes into the basket: wood growers as their data-pick-box crop with .host hidden. */
function pickCrop(id) {
  const el = shroom(id, { ground: false });
  const box = el.getAttribute('data-pick-box');
  if (box) { el.setAttribute('viewBox', box); el.querySelectorAll('.host').forEach((x) => x.setAttribute('display', 'none')); }
  return el;
}
function showTwin(s, layer, id) {
  const pool = new Set(speciesFor(s.lvl).map((x) => x.id));
  const tw = twinsOf(id).find((x) => pool.has(x.other));          // L1 never shows an L2 twin
  const pair = tw ? [tw.other, id] : [id];
  const box = $('.ve-twin', layer);
  box.innerHTML = pair.map((x, i) => {
    const sp = byId.get(x);
    return `${i ? '<span class="vt-x">×</span>' : ''}<div class="vt-side" data-id="${x}"><div class="vt-art"></div><b>${esc(name(sp))}</b>
      <span class="vt-badge v-${groupKeyOf(sp)}">${icon(badgeOf(sp), 'badge')}${esc(groupLabel(sp.group, sp.deadly).toLocaleLowerCase())}</span></div>`;
  }).join('');
  for (const side of box.querySelectorAll('.vt-side')) $('.vt-art', side).append(pickCrop(side.dataset.id));
  box.dataset.faces = 'neutral';
  box.hidden = false;
}

// ---------------------------------------------------------------- test / debug hook (no secrets)
function debugApi(s) {
  return {
    state: () => ({ state: s.state, x: Math.round(s.x), next: s.next, items: s.items.map((m) => ({ id: m.id, x: m.x, hidden: m.hidden, habitat: m.habitat, done: !!m.done, group: byId.get(m.id).group })),
      basket: [...s.basket], stars: s.stars, forkX: s.forkX, forkChosen: s.forkChosen || null, endX: s.endX, animals: s.animals, segs: s.chain.segs.map((x) => x.kind).join(','),
      segEls: s.segEls.size, maxSlope: s.chain.maxSlope(), level: s.lvl, camY: Math.round(s.camY) }),
    spawnAnimal: (kind) => { const a = spawnAnimal(s, kind); if (a && a.trunk === undefined) { a.x = s.vbW * 0.25; a.freezeUntil = performance.now() + 2000; } return !!a; },
    animal: () => (s.animal ? { kind: s.animal.kind, phase: s.animal.phase || 'run', pose: s.animal.el.dataset.pose, climbY: Math.round(s.animal.climbY), trunk: s.animal.trunk ?? null } : null),
    screenOf: (i) => { const it = s.items[i]; if (!it) return null; const r = $('svg', it.el).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.4 }; },
    walkTo: (x) => { s.x = x; s.jx = x - 160; },
    /** Tests: decide every remaining stop (edible → basket) and jump to the end check. */
    fastEnd: (basket) => { for (const it of s.items.slice(s.next)) { if (!basket && byId.get(it.id).group === 'jedla') s.basket.push(it.id); it.done = true; s.met.add(it.id); }
      if (basket) s.basket = [...basket];
      s.next = s.plan.mushrooms.length; s.forkChosen = s.forkChosen || 'up'; leaveStop(s); s.x = s.endX; endCheck(s); },
  };
}
