// Houbičky — „Houbový kvíz“: hear a name, tap the right one of three characters. Round of 5.
import { byId } from './assets.js';
import { effectiveLevel, facesFor, conf, quizDistractors, quizTargets, figure } from './levels.js';
import { glideTo } from './scene.js';
import { idle, jump, wobble } from './anim.js';
import { $, $$, h, icon, esc, say, name, sleep, reduced, shuffle, starsHtml, anim, ms, badgeOf } from './ui.js';
import { groupLabel } from './i18n.js';
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

/** Kept for compatibility: wrong answers per level (js/levels.js). */
export const distractors = (target, n = effectiveLevel()) => quizDistractors(target, n);

export function mount(root) {
  const lvl = effectiveLevel();
  glideTo(1500, reduced() ? 1 : 500);
  root.append(h(`<div class="game kdo" data-level="${lvl}" data-faces="${facesFor(lvl)}">
    <div class="topbar ui">
      <button class="btn round r64 paper" data-act="home" aria-label="${esc(t('nav.home'))}">${icon('home')}</button>
      <h1 class="title-pill pill">${esc(t('game.kdo.title'))}</h1>
      <span class="spacer"></span>
      <div class="stars pill" role="status"></div>
    </div>
    <button class="btn round r120 gold big-speaker ui" data-act="speak" aria-label="${esc(t('card.listen'))}">${icon('speaker')}</button>
    <div class="stumps"></div>
  </div>`));
  const s = { g: $('.game', root), lvl, targets: quizTargets(lvl, ROUND), i: 0, stars: 0, missed: false, busy: false, done: false, asking: false };
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
  if (s.asking) return say('ui.question.group');
  return say(`sp.${target(s).id}.kdo.where`);
}

async function round(s, first = false) {
  if (!live(s)) return;
  const tg = target(s); s.missed = false; s.busy = false;
  const cands = shuffle([tg, ...quizDistractors(tg, s.lvl)]);
  const box = $('.stumps', s.g);
  box.replaceChildren();
  cands.forEach((sp, i) => {
    const slot = h(`<div class="stump-slot" style="--i:${i}">
      <button class="cand" data-id="${sp.id}" aria-label="${esc(t('kdo.option', { n: i + 1 }))}"></button>
      ${STUMP}<p class="cand-name" hidden></p></div>`);
    const svg = figure(sp.id, s.lvl);
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
  if (b.dataset.act === 'group') { answerGroup(s, b); return; }
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
    if (conf(s.lvl).groupQuestion) { askGroup(s, sp); return; }      // level 3: and is it edible?
    await nextRound(s);
  } else {
    s.missed = true;
    sound.play('tryAgain');
    wobble(b);
    say(`sp.${sp.id}.kdo.iAm`);
  }
}

async function nextRound(s) {
  await sleep(reduced() ? 200 : 700);
  if (!live(s)) return;
  s.i++;
  if (s.i >= ROUND) finish(s); else round(s);
}

/** Level 3: „Je jedlá, nejedlá, nebo jedovatá?“ — three big badge buttons; a miss only says „Zkus to znovu“. */
function askGroup(s, sp) {
  s.asking = sp.id;
  const box = h(`<div class="group-ask ui" role="group" aria-label="${esc(t('question.group'))}">
    ${['jedla', 'nejedla', 'jedovata'].map((g) => `<button class="group-btn v-${g}" data-act="group" data-g="${g}">${icon(badgeOf({ group: g }), 'badge')}<span>${esc(groupLabel(g, false))}</span></button>`).join('')}
  </div>`);
  s.g.append(box);
  say('ui.question.group');
}
async function answerGroup(s, b) {
  if (!s.asking || s.busy === 'group') return;
  const sp = byId.get(s.asking);
  if (b.dataset.g !== sp.group) { sound.play('tryAgain'); wobble(b); say('ui.feedback.tryAgain'); return; }
  s.busy = 'group';
  sound.play('success'); jump(b);
  await say(`sp.${sp.id}.group`);
  if (!live(s)) return;
  $('.group-ask', s.g)?.remove();
  s.asking = false; s.busy = true;
  await nextRound(s);
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
