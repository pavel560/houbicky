// Houbičky — Les (home): pannable parallax forest with 13 living characters.
import { species, byId, shroom } from './assets.js';
import { sceneEl, pan, setPan, glideTo, stopGlide, pxToUnits } from './scene.js';
import { idle, bounce } from './anim.js';
import { $, $$, h, icon, esc, say, sleep, anim, reduced } from './ui.js';
import { t, getLang, toggleLang, applyI18n } from './i18n.js';
import * as store from './store.js';
import * as sound from './sound.js';
import { go } from './router.js';
import { effectiveLevel, unlockState, setLevel } from './levels.js';
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
  const n = store.stickerCount();
  const pill = $('.progress-pill b', root);
  if (pill) pill.textContent = `${n} / ${species.length}`;
  $('.progress-pill', root)?.setAttribute('aria-label', t('les.progress', { n, total: species.length }));
}
/** Level chip (placeholder until DESIGN-v2) + the Výprava door once unlocked. */
function updateLevel() {
  if (!root) return;
  const n = effectiveLevel();
  const chip = $('.level-chip', root);
  if (chip) { $('.lvl-num', chip).textContent = n; $('.lvl-name', chip).textContent = t(`level.${n}`); chip.setAttribute('aria-label', `${t('level.choose')}: ${t(`level.${n}`)}`); }
  $('.door-vyprava', root)?.toggleAttribute('hidden', !unlockState().vyprava.unlocked);
}
function levelPicker() {
  if ($('.level-pop', root)) { $('.level-pop', root).remove(); return; }
  const st = unlockState(); const cur = effectiveLevel();
  const pop = h(`<div class="level-pop ui" role="dialog" aria-label="${esc(t('level.choose'))}">
    ${[1, 2, 3].map((n) => `<button class="lvl-opt${n === cur ? ' on' : ''}" data-lvl="${n}" ${st[n].unlocked ? '' : 'disabled aria-disabled="true"'}>
      <span class="lvl-num">${n}</span><span class="lvl-name">${esc(st[n].unlocked ? t(`level.${n}`) : t('level.locked'))}</span></button>`).join('')}</div>`);
  root.querySelector('.les-ui').append(pop);
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
  wireStage();
  setPan(lesPan);
  el.append(h(`<div class="les-ui">
    <button class="btn round r64 paper lang-btn ui" data-act="lang"></button>
    <nav class="doors ui" aria-label="Hry">
      <button class="door" data-door="kosik"><span class="door-ic mint">${icon('basket')}</span><span class="door-label" data-i18n="door.kosik"></span></button>
      <button class="door" data-door="kdo"><span class="door-ic cream">${icon('quiz')}</span><span class="door-label" data-i18n="door.kdo"></span></button>
      <button class="door" data-door="album"><span class="door-ic blush">${icon('album')}</span><span class="door-label" data-i18n="door.album"></span></button>
    </nav>
    <div class="top-right ui">
      <div class="progress-pill pill" role="status">${icon('star', 'star-ic')}<b></b></div>
      <button class="btn level-chip" data-act="level" aria-haspopup="true"><span class="lvl-num"></span><span class="lvl-name"></span></button>
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
}

function onClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.door) { sound.play('pop'); go(b.dataset.door); return; }
  if (b.dataset.act === 'level') { sound.play('pop'); levelPicker(); return; }
  if (b.dataset.lvl) {
    const n = Number(b.dataset.lvl);
    if (setLevel(n)) { sound.play('success'); say(`ui.level.${n}`); }
    $('.level-pop', root)?.remove(); updateLevel(); return;
  }
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
