// Houbičky — Les (home): pannable parallax forest; its characters and width grow with the level (DESIGN-v2 §3.4, §5.1).
import { species, byId, shroom } from './assets.js';
import { sceneEl, pan, setPan, glideTo, stopGlide, pxToUnits, limitPan } from './scene.js';
import { idle, bounce } from './anim.js';
import { $, $$, h, icon, esc, say, sleep, anim, reduced } from './ui.js';
import { t, getLang, toggleLang, applyI18n } from './i18n.js';
import * as store from './store.js';
import * as sound from './sound.js';
import { go } from './router.js';
import { effectiveLevel, unlockState, speciesFor, minLevel, facesFor, pendingCeremony, VYPRAVA_STICKERS } from './levels.js';
import { openSheet, ceremony, hedgehogPeek } from './levelui.js';
import { openCard, cardOpen } from './card.js';

// DESIGN §6.1 assignment, left → right: 6 mid, then 7 near
const ORDER = ['muchomurka-cervena', 'kozak', 'zlucnik', 'trepenitka', 'bedla', 'troudnatec',
  'hrib-smrkovy', 'liska', 'muchomurka-zelena', 'kremenac', 'pychavka', 'suchohrib', 'muchomurka-tygrovana'];
const NS = 'http://www.w3.org/2000/svg';
let placed = false;
let root = null; let offStore = null; let offPan = null;
let lesPan = 0;

function placeCharacters() {
  if (placed) return;
  const scene = sceneEl();
  const slots = [...scene.querySelectorAll('#slots circle.slot')];
  slots.forEach((slot, i) => {
    const id = slot.dataset.id || ORDER[i]; if (!id || !byId.has(id)) return;     // v2 scenes name the species per slot
    const s = parseFloat(slot.dataset.scale) || 1;
    const cx = parseFloat(slot.getAttribute('cx')); const cy = parseFloat(slot.getAttribute('cy'));
    const host = scene.querySelector(`.slots-${slot.dataset.layer}`) || scene;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'char-slot');
    g.dataset.level = slot.dataset.level || minLevel(byId.get(id));
    g.setAttribute('transform', `translate(${(cx - 120 * s).toFixed(1)} ${(cy - 262 * s).toFixed(1)}) scale(${s})`);
    const svg = shroom(id, { ground: false });
    svg.setAttribute('width', 240); svg.setAttribute('height', 280);
    svg.setAttribute('tabindex', '0'); svg.setAttribute('role', 'button');
    svg.setAttribute('aria-label', byId.get(id).name[getLang()]);
    svg.dataset.char = id;
    g.append(svg);
    host.append(g);
    idle(svg);
  });
  placed = true;
}

/** Show the characters of the current level only; faces per level; Level 1 pans only the first part. */
function applyLevel({ reveal = false } = {}) {
  const n = effectiveLevel();
  const scene = sceneEl();
  document.getElementById('stage').dataset.faces = facesFor(n);
  limitPan(n === 1);
  let k = 0;
  for (const g of scene.querySelectorAll('.char-slot')) {
    const show = Number(g.dataset.level) <= n;
    const was = g.style.display !== 'none';
    g.style.display = show ? '' : 'none';
    if (show && !was && reveal && !reduced()) {
      const svg = g.querySelector('svg');
      anim(svg, [{ transform: 'translateY(30px) scale(.3)', opacity: 0 }, { transform: 'translateY(-14px) scale(1.05)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }],
        { duration: 520, delay: 80 * k++, easing: 'ease-out', fill: 'backwards' });
    }
  }
}

let tapPending = false;
async function tapChar(svg) {
  if (cardOpen() || tapPending) return;
  tapPending = true;
  try {
    const id = svg.dataset.char;
    sound.play('tap');
    bounce(svg);
    await sleep(reduced() ? 0 : 260);
    if (document.documentElement.dataset.screen === 'les') await openCard(id, { fromEl: svg });
  } finally { tapPending = false; }
}

// ---- pan + tap on the stage (characters are tap-only; drag anywhere pans)
let drag = null;
function onDown(e) {
  if (document.documentElement.dataset.screen !== 'les' || cardOpen() || e.button > 0) return;
  stopGlide();
  drag = { x: e.clientX, y: e.clientY, p: pan.p, moved: false, id: e.pointerId, target: e.target.closest?.('[data-char]'), samples: [[performance.now(), e.clientX]] };
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.hypot(dx, e.clientY - drag.y) > 10) {
    drag.moved = true;
    document.getElementById('stage').setPointerCapture?.(e.pointerId);
    document.documentElement.classList.add('panning');
  }
  if (drag.moved) {
    setPan(drag.p - pxToUnits(dx));
    drag.samples.push([performance.now(), e.clientX]);
    if (drag.samples.length > 6) drag.samples.shift();
  }
}
function onUp(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  document.documentElement.classList.remove('panning');
  if (!d.moved) { if (d.target) tapChar(d.target); return; }
  const [t0, x0] = d.samples[0]; const [t1, x1] = d.samples[d.samples.length - 1];
  const v = t1 > t0 ? (x1 - x0) / (t1 - t0) : 0;           // px per ms
  if (Math.abs(v) > 0.15) glideTo(pan.p - pxToUnits(v * 260), 600);
}
function onWheel(e) {
  if (document.documentElement.dataset.screen !== 'les' || cardOpen()) return;
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  setPan(pan.p + pxToUnits(d));
}
function onKey(e) {
  const c = e.target.closest?.('[data-char]');
  if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tapChar(c); }
}
let wired = false;
function wireStage() {
  if (wired) return; wired = true;
  const st = document.getElementById('stage');
  st.addEventListener('pointerdown', onDown);
  st.addEventListener('pointermove', onMove);
  st.addEventListener('pointerup', onUp);
  st.addEventListener('pointercancel', () => { drag = null; document.documentElement.classList.remove('panning'); });
  st.addEventListener('wheel', onWheel, { passive: true });
  st.addEventListener('keydown', onKey);
}

function updateProgress() {
  if (!root) return;
  const pool = speciesFor(effectiveLevel());                 // „★ 5 / 8“ at Level 1, „/ 25“ above
  const n = pool.filter((sp) => store.hasSticker(sp.id)).length;
  const pill = $('.progress-pill b', root);
  if (pill) pill.textContent = `${n} / ${pool.length}`;
  $('.progress-pill', root)?.setAttribute('aria-label', t('les.progress', { n, total: pool.length }));
}
/** Level chip (rosette only; the name is spoken) + the 4th door's lock state and progress ring. */
function updateLevel() {
  if (!root) return;
  const n = effectiveLevel();
  const chip = $('.level-chip', root);
  if (chip) { chip.innerHTML = icon(`level-${n}`, 'rosette'); chip.setAttribute('aria-label', `${t('level.choose')}: ${t(`level.${n}`)}`); }
  const door = $('.door-vyprava', root);
  if (door) {
    const open = unlockState().vyprava.unlocked;
    door.classList.toggle('locked', !open);
    const have = Math.min(VYPRAVA_STICKERS, speciesFor(1).filter((sp) => store.hasSticker(sp.id)).length);
    door.style.setProperty('--ring', `${(100 * have) / VYPRAVA_STICKERS}`);
    door.setAttribute('aria-label', open ? t('door.vyprava') : `${t('door.vyprava')} – ${t('level.locked')}`);
  }
}
function levelPicker() {
  openSheet({ onPick: () => { applyLevel({ reveal: true }); updateLevel(); updateProgress(); } });
}

function updatePanButtons() {
  if (!root) return;
  $('.pan-btn.left', root)?.toggleAttribute('hidden', pan.p <= 2);
  $('.pan-btn.right', root)?.toggleAttribute('hidden', pan.p >= pan.pmax - 2);
}
function renderLang() {
  updateLevel();
  const lang = getLang();
  $('.lang-btn', root).innerHTML = icon(`lang-${lang}`, 'flag');
  $('.lang-btn', root).setAttribute('aria-label', t('les.lang'));
  applyI18n(root);
  $$('[data-char]', sceneEl()).forEach((s) => s.setAttribute('aria-label', byId.get(s.dataset.char).name[lang]));
}

function sparkleMet() {
  if (reduced()) return;
  for (const svg of $$('[data-char]', sceneEl())) {
    if (!store.hasSticker(svg.dataset.char)) continue;
    const g = svg.parentNode;
    const star = document.createElementNS(NS, 'use');
    star.setAttribute('href', '#i-star'); star.setAttribute('class', 'met-star');
    star.setAttribute('x', 96); star.setAttribute('y', -6); star.setAttribute('width', 48); star.setAttribute('height', 48);
    g.append(star);
    anim(star, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1.15)', offset: 0.4 }, { opacity: 1, transform: 'scale(1)', offset: 0.7 }, { opacity: 0, transform: 'scale(.9) translateY(-20px)' }],
      { duration: 1600, delay: 300 + Math.random() * 500, easing: 'ease-out', fill: 'both' }).then(() => star.remove());
  }
}

// ---- parents' gate: hold 3 s
function wireHold(btn) {
  const ring = $('.hold-ring circle', btn);
  let a = null;
  const start = (e) => {
    e.preventDefault();
    a = ring.animate([{ strokeDashoffset: 151 }, { strokeDashoffset: 0 }], { duration: 3000, easing: 'linear', fill: 'forwards' });
    a.finished.then(() => { a = null; ring.getAnimations().forEach((x) => x.cancel()); sound.play('pop'); go('parents'); }, () => {});
  };
  const stop = () => { if (a) { a.cancel(); a = null; } };
  btn.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function mount(el) {
  root = el;
  placeCharacters();
  applyLevel();
  wireStage();
  setPan(lesPan);
  el.append(h(`<div class="les-ui">
    <button class="btn round r64 paper lang-btn ui" data-act="lang"></button>
    <button class="btn round r64 paper level-chip ui" data-act="level" aria-haspopup="dialog"></button>
    <nav class="doors ui" aria-label="Hry">
      <button class="door" data-door="kosik"><span class="door-ic mint">${icon('basket')}</span><span class="door-label" data-i18n="door.kosik"></span></button>
      <button class="door" data-door="kdo"><span class="door-ic cream">${icon('quiz')}</span><span class="door-label" data-i18n="door.kdo"></span></button>
      <button class="door" data-door="album"><span class="door-ic blush">${icon('album')}</span><span class="door-label" data-i18n="door.album"></span></button>
      <button class="door door-vyprava" data-door="vyprava"><span class="door-ic mint">${icon('vyprava')}
        <svg class="door-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" pathLength="100"/></svg>
        <span class="door-lock">${icon('lock')}</span></span><span class="door-label" data-i18n="door.vyprava"></span></button>
    </nav>
    <div class="top-right ui">
      <div class="progress-pill pill" role="status">${icon('star', 'star-ic')}<b></b></div>
      <button class="btn round r56 paper parents-btn" data-i18n-attr="aria-label:les.parentsHold">${icon('parents')}
        <svg class="hold-ring" viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="24" pathLength="151"/></svg></button>
    </div>
    <button class="btn round r64 paper pan-btn left ui" data-i18n-attr="aria-label:les.panLeft">${icon('arrow-left')}</button>
    <button class="btn round r64 paper pan-btn right ui" data-i18n-attr="aria-label:les.panRight">${icon('arrow-left', 'mirror')}</button>
  </div>`));
  renderLang();
  updateProgress();
  updatePanButtons();
  el.addEventListener('click', onClick);
  wireHold($('.parents-btn', el));
  updateLevel();
  offStore = store.subscribe(() => { updateProgress(); updateLevel(); });
  const scene = sceneEl();
  const onPan = () => { lesPan = pan.p; updatePanButtons(); };
  scene.addEventListener('pan', onPan);
  offPan = () => scene.removeEventListener('pan', onPan);
  sparkleMet();
  const due = pendingCeremony();
  if (due) runCeremony(due);
}

/** Returning to Les after the 8th sticker (or the 20th L2 gold): one ceremony, then the forest opens. */
async function runCeremony(n) {
  const me = root;
  await sleep(reduced() ? 50 : 600);
  if (root !== me || cardOpen()) return;
  await ceremony(n);
  if (root !== me) return;
  updateLevel(); updateProgress();
  applyLevel({ reveal: true });
  if (n === 2) {
    glideTo(2400 - pan.vbW * 0.5, reduced() ? 1 : 1600);      // show her the new part of the forest
    const lock = $('.door-vyprava .door-lock', root);
    if (lock && !reduced()) {
      lock.innerHTML = icon('lock-open'); sound.play('pop');
      await anim(lock, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 600, fill: 'forwards' });
      lock.removeAttribute('style'); lock.innerHTML = icon('lock');
    }
  }
}

function onClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.door === 'vyprava' && b.classList.contains('locked')) { sound.play('tryAgain'); hedgehogPeek(); return; }
  if (b.dataset.door) { sound.play('pop'); go(b.dataset.door); return; }
  if (b.dataset.act === 'level') { sound.play('pop'); levelPicker(); return; }
  if (b.dataset.act === 'lang') {
    toggleLang(); sound.play('pop'); renderLang();
    say('ui.langName');
    return;
  }
  if (b.classList.contains('pan-btn')) {
    sound.play('tap');
    glideTo(pan.p + (b.classList.contains('left') ? -1 : 1) * pan.vbW * 0.6, 700);
  }
}

export function unmount() {
  offStore?.(); offPan?.();
  root = null;
}
