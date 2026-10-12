// Houbičky — small shared helpers: DOM, icons, speech sequencing, names, view transitions.
import * as speech from './speech.js';
import * as store from './store.js';
import { getLang } from './i18n.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const icon = (n, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Read a duration token (e.g. '--t-bounce') in ms. */
export function ms(token, fallback = 300) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const n = parseFloat(v);
  if (Number.isNaN(n)) return fallback;
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
}
export const cssVar = (token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim();

/** Species name; mid=true lower-cases the first letter for use inside a sentence. */
export function name(sp, lang = getLang(), mid = false) {
  const n = sp.name[lang] ?? sp.name.cs;
  return mid ? n.charAt(0).toLocaleLowerCase(lang) + n.slice(1) : n;
}

// ---- speech: catalogue phrase ids only (js/phrases.js); one line at a time, a new say() cancels the previous one
const slow = () => store.get('rate') === 'slow';
// Recording playback speed per language: the Czech voice speaks fast, so "normal" is already slowed down.
const REC_RATE = { cs: { normal: 0.85, slow: 0.75 }, en: { normal: 1, slow: 0.85 } };
export const recRate = (lang, isSlow = slow()) => (REC_RATE[lang] ?? REC_RATE.en)[isSlow ? 'slow' : 'normal'];
export function say(ids, lang = getLang()) {
  return speech.sayAll(ids, lang, { rate: recRate(lang), ttsRate: slow() ? 0.72 : 0.85 });
}
export function hush() { speech.stopAll(); }

/** WAAPI wrapper that never throws (cancelled animations resolve too). */
export function anim(el, keyframes, opts) {
  if (!el?.animate) return Promise.resolve();
  const a = el.animate(keyframes, opts);
  return a.finished.then(() => a, () => a);
}

/** View Transition wrapper; falls back to a plain update. Resolves when the animation is done. */
export async function viewTransition(update) {
  if (!document.startViewTransition || reduced()) { await update(); return; }
  const tr = document.startViewTransition(update);
  tr.ready.catch(() => {});
  await tr.finished.catch(() => {});
}

export function seeded(str) {
  let x = 2166136261;
  for (const c of str) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619); }
  return ((x >>> 0) % 10000) / 10000;
}
export function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
export const isEdible = (sp) => sp.group === 'jedla';
export const groupKeyOf = (sp) => (sp.group === 'jedovata' && sp.deadly ? 'deadly' : sp.group);
export const badgeOf = (sp) => (sp.group === 'jedovata' && sp.deadly ? 'skull' : `badge-${sp.group}`);

/** Star row markup (filled = n). */
export const starsHtml = (n, total) => Array.from({ length: total }, (_, i) =>
  `<span class="star${i < n ? ' on' : ''}">${icon('star')}</span>`).join('');
