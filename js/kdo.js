// Houbičky — „Houbový kvíz“: hear a name, tap the right one of three characters. Round of 5.
import { species, byId, shroom, TWINS } from './assets.js';
import { glideTo } from './scene.js';
import { idle, jump, wobble } from './anim.js';
import { $, $$, h, icon, esc, say, name, sleep, reduced, shuffle, starsHtml, anim, ms } from './ui.js';
import { t, getLang } from './i18n.js';
import * as store from './store.js';
import * as sound from './sound.js';
import { celebrate } from './confetti.js';
import { go } from './router.js';

const ROUND = 5;
let S = null;

const STUMP = `<svg class="stump" viewBox="0 0 220 120" aria-hidden="true">
  <path d="M22 34 C22 70 14 96 6 112 L214 112 C206 96 198 70 198 34 Z" fill="var(--wicker-dark)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>
  <path d="M48 46 C46 70 42 92 36 110 M84 50 C84 74 82 96 78 112 M138 50 C140 74 142 96 146 112 M172 46 C174 70 178 92 184 110" stroke="var(--soil-deep)" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="110" cy="34" rx="88" ry="24" fill="var(--wicker-light)" stroke="var(--ink)" stroke-width="3"/>
  <ellipse cx="110" cy="34" rx="58" ry="15" fill="none" stroke="var(--wicker)" stroke-width="3"/>
  <ellipse cx="110" cy="34" rx="30" ry="8" fill="none" stroke="var(--wicker)" stroke-width="3"/>
</svg>`;

export function distractors(target, level2 = false) {
  if (level2) {
    const twin = TWINS.filter((x) => x.a === target.id || x.b === target.id).map((x) => byId.get(x.a === target.id ? x.b : x.a));
    const pool = shuffle(species.filter((s) => s.id !== target.id));
    const sameGroup = pool.filter((s) => s.group === target.group);
    return [...shuffle(twin), ...sameGroup, ...pool].filter((s, i, a) => a.indexOf(s) === i).slice(0, 2);
  }
  const groups = ['jedla', 'nejedla', 'jedovata'].filter((g) => g !== target.group);
  return groups.map((g) => shuffle(species.filter((s) => s.group === g))[0]);
}

export function mount(root) {
  const level2 = store.isNeutralFaces();
  glideTo(1500, reduced() ? 1 : 500);
  root.append(h(`<div class="game kdo" data-faces="${level2 ? 'neutral' : 'mood'}">
    <div class="topbar ui">
      <button class="btn round r64 paper" data-act="home" aria-label="${esc(t('nav.home'))}">${icon('home')}</button>
      <h1 class="title-pill pill">${esc(t('game.kdo.title'))}</h1>
      <span class="spacer"></span>
      <div class="stars pill" role="status"></div>
    </div>
    <button class="btn round r120 gold big-speaker ui" data-act="speak" aria-label="${esc(t('card.listen'))}">${icon('speaker')}</button>
    <div class="stumps"></div>
  </div>`));
  const s = { g: $('.game', root), level2, targets: shuffle(species).slice(0, ROUND), i: 0, stars: 0, missed: false, busy: false, done: false };
  S = s;
  s.g.addEventListener('click', onClick);
  renderStars(s);
  round(s, true);
}
export function unmount() { S = null; }

// Every async step is bound to its session `s`: leaving mid-animation stops the chain.
const live = (s) => s && S === s;
function renderStars(s) {
  const el = $('.stars', s.g);
  el.innerHTML = starsHtml(s.stars, ROUND);
  el.setAttribute('aria-label', t('game.stars', { n: s.stars, total: ROUND }));
}
const target = (s) => s?.targets[s.i];
/** Speaker line: the current question, or the praise once the round is over (never a missing target). */
function prompt(s) {
  if (!s || s.done || !target(s)) return say('ui.kdo.done');
  return say(`sp.${target(s).id}.kdo.where`);
}

async function round(s, first = false) {
  if (!live(s)) return;
  const tg = target(s); s.missed = false; s.busy = false;
  const cands = shuffle([tg, ...distractors(tg, s.level2)]);
  const box = $('.stumps', s.g);
  box.replaceChildren();
  cands.forEach((sp, i) => {
    const slot = h(`<div class="stump-slot" style="--i:${i}">
      <button class="cand" data-id="${sp.id}" aria-label="${esc(t('kdo.option', { n: i + 1 }))}"></button>
      ${STUMP}<p class="cand-name" hidden></p></div>`);
    const svg = shroom(sp.id, { ground: false });
    $('.cand', slot).append(svg);
    box.append(slot);
    idle(svg);
    if (!reduced()) anim(slot, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 90, easing: 'ease-out', fill: 'backwards' });
  });
  await sleep(first ? 200 : 450);
  if (live(s)) prompt(s);
}

async function onClick(e) {
  const s = S; const b = e.target.closest('[data-act], .cand'); if (!b || !s) return;
  if (b.dataset.act === 'home') { go('les'); return; }
  if (b.dataset.act === 'again') { go('kdo'); return; }
  if (b.dataset.act === 'speak') { sound.play('tap'); prompt(s); return; }
  if (!b.classList.contains('cand') || s.busy || s.done) return;
  const sp = byId.get(b.dataset.id);
  if (sp.id === target(s).id) {
    s.busy = true;
    if (!s.missed) store.markMastery(sp.id, 'kdo');
    store.addSticker(sp.id);
    sound.play('success');
    jump(b);
    const label = $('.cand-name', b.parentNode); label.textContent = name(sp); label.hidden = false;
    $$('.stump-slot', s.g).forEach((x) => x.classList.toggle('dim', x !== b.parentNode));
    s.stars++; renderStars(s); sound.play('sparkle');
    await say(`sp.${sp.id}.kdo.yes`);
    if (!live(s)) return;
    await sleep(reduced() ? 200 : 700);
    if (!live(s)) return;
    s.i++;
    if (s.i >= ROUND) finish(s); else round(s);
  } else {
    s.missed = true;
    sound.play('tryAgain');
    wobble(b);
    say(`sp.${sp.id}.kdo.iAm`);
  }
}

async function finish(s) {
  if (!live(s)) return;
  s.done = true;
  store.recordGame('kdo', { rounds: ROUND, correct: s.stars });
  celebrate({ kind: 'mixed', duration: ms('--t-celebrate', 2400) });
  s.g.append(h(`<div class="end-panel ui" role="dialog" aria-label="${esc(t('kdo.done'))}">
    <p class="end-stars">${starsHtml(ROUND, ROUND)}</p>
    <div class="end-doors">
      <button class="door" data-act="again"><span class="door-ic cream r120">${icon('retry')}</span><span class="door-label">${esc(t('game.again'))}</span></button>
      <button class="door" data-act="home"><span class="door-ic mint r120">${icon('home')}</span><span class="door-label">${esc(t('nav.home'))}</span></button>
    </div></div>`));
  await say('ui.kdo.done');
}
