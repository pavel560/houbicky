// Houbičky — persistent progress (localStorage with in-memory fallback).
// Every access is wrapped in try/catch: private mode, quota or disabled storage never break the game.
import { STORE_KEY } from './env.js';

const KEY = STORE_KEY;          // 'houbicky.v1' (stable) or 'houbicky.beta.v1' (beta) — never shared
const LANGS = ['cs', 'en'];

const defaults = () => ({
  version: 1,
  lang: 'cs',
  mute: false,          // UI sound effects (sound.js); speech is separate
  stickers: {},         // { [speciesId]: ISO date first collected }
  gamesPlayed: {},      // { [gameId]: count }
  stats: {},            // { [gameId]: { rounds, correct } } — free-form per game
  mastery: {},          // { [speciesId]: { kosik: 2, kdo: 1 } } — right first time, at that level (0 = unknown, from v2.0)
  seen: {},             // { 2: true } — unlock ceremonies already shown; { album2: true } album new-pages moment
  level: 1,             // difficulty 1–3 (js/levels.js)
  unlocks: {},          // { 2: true, 3: true } — set by a parent (automatic unlocks are computed, not stored)
  rate: 'normal',       // speech speed: 'normal' | 'slow'
  photoPrefs: {},       // { [speciesId]: 'show' | 'hide' } — parents' photo review
  firstSeen: null,
  lastSeen: null,
});

let storage = null;
try {
  const probe = '__houbicky_probe__';
  window.localStorage.setItem(probe, '1');
  window.localStorage.removeItem(probe);
  storage = window.localStorage;
} catch { storage = null; }

/** true when progress survives a reload (localStorage works) */
export const persistent = storage !== null;

let state = load();

function load() {
  let saved = null;
  try { saved = storage ? JSON.parse(storage.getItem(KEY) || 'null') : null; } catch { saved = null; }
  const s = { ...defaults(), ...(saved && typeof saved === 'object' ? saved : {}) };
  for (const k of ['stickers', 'gamesPlayed', 'stats', 'mastery', 'photoPrefs', 'unlocks', 'seen']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
  if (!LANGS.includes(s.lang)) s.lang = 'cs';
  s.mute = !!s.mute;
  // v1 → v2 migration: the parents' "neutral faces" toggle becomes difficulty level 2 (unlocked by the parent)
  if (saved && !('level' in saved)) {
    // a v1 player with ≥ 8 stickers already earned what Level 2 + Výprava ask for: unlock them without a ceremony
    if (Object.keys(s.stickers).length >= 8) { s.unlocks = { ...s.unlocks, 2: true, vyprava: true }; s.seen = { ...(s.seen || {}), 2: true }; }
    if (s.faces === 'neutral') { s.level = 2; s.unlocks = { ...s.unlocks, 2: true }; }
  }
  delete s.faces;
  // v2.0 → v2.1: mastery flags become the level they were earned at; old `true` = level unknown (0),
  // so it still shows gold in the album but does not count toward Level 3 (earned at Level ≥ 2).
  for (const [id, m] of Object.entries(s.mastery)) {
    if (!m || typeof m !== 'object') { delete s.mastery[id]; continue; }
    for (const g of Object.keys(m)) if (m[g] === true) m[g] = 0; else if (typeof m[g] !== 'number') delete m[g];
  }
  s.level = [1, 2, 3].includes(Number(s.level)) ? Number(s.level) : 1;
  if (s.rate !== 'slow') s.rate = 'normal';
  const now = new Date().toISOString();
  s.firstSeen ||= now;
  s.lastSeen = now;
  return s;
}

function save(changedKey) {
  try { storage?.setItem(KEY, JSON.stringify(state)); } catch { /* quota / private mode: keep in memory */ }
  try {
    window.dispatchEvent(new CustomEvent('store:change', { detail: { key: changedKey, state: snapshot() } }));
  } catch { /* ignore */ }
}

const snapshot = () => structuredClone(state);

export function get(key) { return key === undefined ? snapshot() : structuredClone(state[key]); }

export function set(key, value) {
  if (key === 'lang' && !LANGS.includes(value)) return;
  state[key] = value;
  save(key);
}

/** update(draft => { draft.stats.quiz = ... }) — mutate a copy, saved atomically */
export function update(fn) {
  const draft = snapshot();
  fn(draft);
  state = draft;
  save('*');
}

export function subscribe(fn) {
  const h = (e) => fn(e.detail);
  window.addEventListener('store:change', h);
  return () => window.removeEventListener('store:change', h);
}

// ---- stickers (album)
/** @returns {boolean} true if this sticker is new */
export function addSticker(id) {
  if (state.stickers[id]) return false;
  state.stickers[id] = new Date().toISOString();
  save('stickers');
  return true;
}
export const hasSticker = (id) => !!state.stickers[id];
export const getStickers = () => Object.keys(state.stickers);
export const stickerCount = () => Object.keys(state.stickers).length;

// ---- games
export function recordGame(gameId, { rounds = 0, correct = 0 } = {}) {
  state.gamesPlayed[gameId] = (state.gamesPlayed[gameId] || 0) + 1;
  const st = state.stats[gameId] || { rounds: 0, correct: 0 };
  state.stats[gameId] = { rounds: st.rounds + rounds, correct: st.correct + correct };
  save('gamesPlayed');
}
export const gamesPlayed = (gameId) => (gameId ? state.gamesPlayed[gameId] || 0 : { ...state.gamesPlayed });

// ---- mastery (gold rim in the album = right first time in both games)
/** Right first time in `game` at difficulty `level`; keeps the highest level. */
export function markMastery(id, game, level = state.level) {
  const m = state.mastery[id] || {};
  if (typeof m[game] === 'number' && m[game] >= level) return;
  state.mastery[id] = { ...m, [game]: level };
  save('mastery');
}
const won = (v) => typeof v === 'number';
/** Gold sticker: right first time in both games (any level). */
export const isGold = (id) => !!(won(state.mastery[id]?.kosik) && won(state.mastery[id]?.kdo));
/** Gold earned at or above a level (both games at ≥ minLevel). */
export const isGoldAt = (id, minLevel) => !!(state.mastery[id]?.kosik >= minLevel && state.mastery[id]?.kdo >= minLevel);
export const wasSeen = (key) => !!state.seen[key];
export function markSeen(key) { state.seen = { ...state.seen, [key]: true }; save('seen'); }

// ---- settings
export const getLang = () => state.lang;
export const setLang = (lang) => set('lang', lang);
export const isMuted = () => state.mute;
export const setMuted = (m) => set('mute', !!m);
export const getLevel = () => state.level;
export const setLevel = (n) => { if ([1, 2, 3].includes(n)) set('level', n); };
export const getUnlocks = () => ({ ...state.unlocks });
export function setUnlock(n, on) { state.unlocks = { ...state.unlocks, [n]: !!on }; save('unlocks'); }
export function setPhotoPref(id, pref) { state.photoPrefs = { ...state.photoPrefs, [id]: pref }; save('photoPrefs'); }

/** Parents' corner: wipe progress, keep language + mute preferences */
export function reset({ keepSettings = true } = {}) {
  const keep = keepSettings ? { lang: state.lang, mute: state.mute, rate: state.rate, photoPrefs: state.photoPrefs, unlocks: state.unlocks } : {};   // `seen` resets with progress
  state = { ...defaults(), ...keep, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString() };
  save('*');
}
