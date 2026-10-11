// Houbičky — difficulty levels (BRIEF-v2 §Úrovně). Data-driven: species.level (min. level, missing = 1),
// species.twin (id or [ids], falls back to the v1 TWINS table).
//   1 Malý houbař    — easy species only, faces hint the group, quiz/basket choices from different groups
//   2 Houbař         — all species, neutral faces, look-alikes (twins) as choices
//   3 Mistr houbař   — all species, approved real photos in the games (else neutral drawing), twins + group question
import { species, byId, TWINS, shroom, photoShown, photoUrl } from './assets.js';
import * as store from './store.js';

export const LEVELS = {
  1: { faces: 'mood', photos: false, choices: 'groups', groupQuestion: false },
  2: { faces: 'neutral', photos: false, choices: 'twins', groupQuestion: false },
  3: { faces: 'neutral', photos: true, choices: 'twins', groupQuestion: true },
};
export const UNLOCK_STICKERS = 8;          // level 2 opens after this many stickers (BRIEF-v2; designer may refine)
export const VYPRAVA_STICKERS = 8;         // „Výprava do lesa“ opens after this many stickers

export const level = () => store.getLevel();
export const conf = (n = level()) => LEVELS[n] || LEVELS[1];
export const minLevel = (sp) => ([1, 2, 3].includes(sp?.level) ? sp.level : 1);
/** Species available at a level (data-driven). */
export const speciesFor = (n = level()) => species.filter((sp) => minLevel(sp) <= n);
/** data-faces value for game screens. */
export const facesFor = (n = level()) => conf(n).faces;

/** Look-alike ids: species.twin first, then the v1 table. */
export function twinIds(id) {
  const sp = byId.get(id);
  const own = sp?.twin ? [].concat(sp.twin) : [];
  const table = TWINS.filter((t) => t.a === id || t.b === id).map((t) => (t.a === id ? t.b : t.a));
  // also honour a twin declared only on the other side
  const back = species.filter((x) => x.twin && [].concat(x.twin).includes(id)).map((x) => x.id);
  return [...new Set([...own, ...table, ...back])].filter((x) => x !== id && byId.has(x));
}

// ---- unlocks
function goldCount(n) { return speciesFor(n).filter((sp) => store.isGold(sp.id)).length; }
export function unlockState() {
  const unlocks = store.getUnlocks();
  const stickers = store.stickerCount();
  const auto2 = stickers >= UNLOCK_STICKERS;
  const pool2 = speciesFor(2).length;
  const auto3 = pool2 > 0 && goldCount(2) >= pool2;
  return {
    1: { unlocked: true, auto: true, manual: false },
    2: { unlocked: auto2 || !!unlocks[2], auto: auto2, manual: !!unlocks[2] },
    3: { unlocked: auto3 || !!unlocks[3], auto: auto3, manual: !!unlocks[3] },
    vyprava: { unlocked: stickers >= VYPRAVA_STICKERS || !!unlocks.vyprava, auto: stickers >= VYPRAVA_STICKERS, manual: !!unlocks.vyprava },
  };
}
export const isUnlocked = (n) => !!unlockState()[n]?.unlocked;
/** Choose a level; refused if still locked. */
export function setLevel(n) {
  if (!isUnlocked(n)) return false;
  store.setLevel(n);
  return true;
}
/** Current level, but never above what is unlocked (a parent may have locked it again). */
export function effectiveLevel() {
  let n = level();
  while (n > 1 && !isUnlocked(n)) n--;
  return n;
}

// ---- choices
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const uniq = (a) => a.filter((x, i) => x && a.indexOf(x) === i);

/** Two wrong answers for the quiz. */
export function quizDistractors(target, n = level()) {
  const pool = speciesFor(n).filter((sp) => sp.id !== target.id);
  const all = species.filter((sp) => sp.id !== target.id);
  if (conf(n).choices === 'groups') {
    const groups = ['jedla', 'nejedla', 'jedovata'].filter((g) => g !== target.group);
    return groups.map((g) => shuffle(pool.filter((s) => s.group === g))[0] || shuffle(all.filter((s) => s.group === g))[0]).filter(Boolean)
      .concat(shuffle(pool)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 2);
  }
  const twins = shuffle(twinIds(target.id).map((id) => byId.get(id)));
  const sameGroup = shuffle(pool.filter((s) => s.group === target.group));
  return uniq([...twins, ...sameGroup, ...shuffle(pool)]).slice(0, 2);
}

/** Five quiz targets. */
export const quizTargets = (n = level(), count = 5) => shuffle(speciesFor(n)).slice(0, count);

/** Six mushrooms for „Do košíku!“. Level 1: mixed groups; 2–3: look-alike pairs (edible + its twin) first. */
export function basketRound(n = level(), size = 6) {
  const pool = speciesFor(n);
  const edible = shuffle(pool.filter((s) => s.group === 'jedla'));
  const other = shuffle(pool.filter((s) => s.group !== 'jedla'));
  const maxDeadly = n === 1 ? 1 : 2;
  const picked = [];
  const canAdd = (s) => s && !picked.includes(s) && (!s.deadly || picked.filter((x) => x.deadly).length < maxDeadly);
  if (conf(n).choices === 'twins') {
    for (const e of edible) {
      if (picked.length >= size - 1) break;
      const tw = shuffle(twinIds(e.id).map((id) => byId.get(id)).filter((x) => pool.includes(x) && x.group !== 'jedla'))[0];
      if (tw && canAdd(e) && canAdd(tw)) picked.push(e, tw);
      if (picked.length >= 4) break;
    }
  }
  const nOther = Math.min(other.length, n === 1 ? 2 + Math.round(Math.random()) : 3);
  for (const s of other) { if (picked.filter((x) => x.group !== 'jedla').length >= nOther) break; if (canAdd(s)) picked.push(s); }
  for (const s of edible) { if (picked.length >= size) break; if (canAdd(s)) picked.push(s); }
  for (const s of other) { if (picked.length >= size) break; if (canAdd(s)) picked.push(s); }
  return shuffle(picked.slice(0, size));
}

// ---- figures for the games (level 3: approved real photo as a little framed print, else the drawing)
const NS = 'http://www.w3.org/2000/svg';
let clipSeq = 0;
export function usesPhoto(id, n = level()) { return conf(n).photos && photoShown(id); }
export function figure(id, n = level(), { ground = false } = {}) {
  if (!usesPhoto(id, n)) return shroom(id, { ground });
  const c = `photoclip-${++clipSeq}`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 240 280');
  svg.setAttribute('class', 'shroom photo-figure no-ground');
  svg.dataset.id = id;
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = `<defs><clipPath id="${c}"><rect x="34" y="62" width="172" height="172" rx="14"/></clipPath></defs>
    <g class="shadow"><ellipse cx="120" cy="264" rx="84" ry="10" fill="rgb(42 26 16 / .22)"/></g>
    <g class="body"><rect x="22" y="50" width="196" height="214" rx="20" fill="#fbf4e4" stroke="#3b2417" stroke-width="5"/>
      <image href="${photoUrl(id)}" x="34" y="62" width="172" height="172" preserveAspectRatio="xMidYMid slice" clip-path="url(#${c})"/></g>`;
  return svg;
}
