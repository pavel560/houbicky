// Houbičky — the finite catalogue of EVERY spoken line. Ids are stable; texts come from i18n + data/species.json.
// Used by the app (speech.sayAll) and by dev/export_phrases.mjs → voice/phrases.json → make_voice.py → voice/<lang>/<id>.mp3
import { strings, groupSentence } from './i18n.js';

export const SPOKEN_LANGS = ['cs', 'en'];
// UI keys that are ever spoken (phrase id = `ui.<key>`)
const UI_KEYS = ['say.greeting', 'safety.short', 'say.deadlyWarn', 'card.realPhoto', 'card.photoMissing',
  'kosik.intro', 'kosik.inBasket', 'kosik.inZone', 'kosik.poisonBounce', 'kosik.inedibleBounce', 'kosik.edibleToZone', 'kosik.done',
  'kdo.done', 'album.empty', 'album.unknown',
  // v2: levels, level-3 group question, Výprava do lesa
  'question.group', 'feedback.tryAgain', 'level.1', 'level.2', 'level.3',
  'vyprava.intro', 'vyprava.warn', 'vyprava.done', 'vyprava.fork',
  'animal.srnka', 'animal.zajic', 'animal.veverka',
  // v2.1 (DESIGN-v2 §7): level sheet + ceremony, Výprava 2D walk and end check
  'level.lockedHint2', 'unlock.level2', 'unlock.level3', 'unlock.gift2', 'vyprava.lockedHint', 'album.newPages',
  'vyprava.fork.up', 'vyprava.fork.down', 'vyprava.wait', 'vyprava.warnDeadly', 'vyprava.cooked', 'vyprava.toBasket',
  'vyprava.notEdible', 'vyprava.adultDecides', 'vyprava.end', 'vyprava.leftOk', 'kosik.basket', 'kosik.zone',
  'vyprava.hint.moss', 'vyprava.hint.rock', 'vyprava.hint.wood', 'vyprava.hint.leaves', 'vyprava.hint.fern'];
export const LOCKED_HINT3_MAX = 20;          // „Ještě {n} zlatých nálepek…“ pre-rendered for n = 1…20 (no runtime composition)
const lowerFirst = (n, lang) => n.charAt(0).toLocaleLowerCase(lang) + n.slice(1);
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** Czech plural: 1 zlatou nálepku · 2–4 zlaté nálepky · 5+ zlatých nálepek. */
function lockedHint3(n, lang) {
  if (lang === 'en') return `${n} more gold ${n === 1 ? 'sticker' : 'stickers'} and you'll be a Master forager.`;
  const w = n === 1 ? 'jednu zlatou nálepku' : n <= 4 ? `${n} zlaté nálepky` : `${n} zlatých nálepek`;
  return `Ještě ${w} a budeš Mistr houbař.`;
}

/** { cs: { phraseId: text }, en: {...} } */
export function buildCatalogue(species) {
  const cat = {};
  for (const lang of SPOKEN_LANGS) {
    const S = strings[lang]; const c = (cat[lang] = {});
    for (const k of UI_KEYS) c[`ui.${k}`] = S[k];
    c['ui.langName'] = S[`lang.${lang}`];
    for (let n = 1; n <= LOCKED_HINT3_MAX; n++) c[`ui.level.lockedHint3.${n}`] = lockedHint3(n, lang);
    for (const sp of species) {
      const n = sp.name[lang]; const mid = lowerFirst(n, lang); const p = `sp.${sp.id}.`;
      c[`${p}name`] = `${n}.`;
      c[`${p}group`] = groupSentence(lang === 'en' ? mid : n, sp.group, sp.deadly, lang);
      if (sp.caution?.[lang]) c[`${p}caution`] = sp.caution[lang];
      if (sp.fact?.[lang]) c[`${p}fact`] = sp.fact[lang];
      (sp.lookFor?.[lang] || []).forEach((x, i) => { c[`${p}look.${i}`] = x; });
      c[`${p}kosik`] = fill(S['kosik.where'], { name: mid });
      c[`${p}kdo.where`] = fill(S['kdo.where'], { name: mid });
      c[`${p}kdo.yes`] = fill(S['kdo.yes'], { name: mid });
      c[`${p}kdo.iAm`] = fill(S['kdo.iAm'], { name: mid });
      c[`${p}thatIs`] = fill(S['vyprava.thatIs'], { name: lang === 'en' ? mid : mid });
      if (sp.twinTell?.[lang]) c[`${p}twinTell`] = sp.twinTell[lang];
    }
  }
  return cat;
}

/** Ids spoken when a card opens: name, group sentence, then the caution (or the deadly warning). */
export function introIds(sp, catalogueForLang = null) {
  const ids = [`sp.${sp.id}.name`, `sp.${sp.id}.group`];
  const hasCaution = catalogueForLang ? `sp.${sp.id}.caution` in catalogueForLang : !!sp.caution;
  if (hasCaution) ids.push(`sp.${sp.id}.caution`); else if (sp.deadly) ids.push('ui.say.deadlyWarn');
  return ids;
}
