// Houbičky — the finite catalogue of EVERY spoken line. Ids are stable; texts come from i18n + data/species.json.
// Used by the app (speech.sayAll) and by dev/export_phrases.mjs → voice/phrases.json → make_voice.py → voice/<lang>/<id>.mp3
import { strings, groupSentence } from './i18n.js';

export const SPOKEN_LANGS = ['cs', 'en'];
// UI keys that are ever spoken (phrase id = `ui.<key>`)
const UI_KEYS = ['say.greeting', 'safety.short', 'say.deadlyWarn', 'card.realPhoto', 'card.photoMissing',
  'kosik.intro', 'kosik.inBasket', 'kosik.inZone', 'kosik.poisonBounce', 'kosik.inedibleBounce', 'kosik.edibleToZone', 'kosik.done',
  'kdo.done', 'album.empty', 'album.unknown'];
const lowerFirst = (n, lang) => n.charAt(0).toLocaleLowerCase(lang) + n.slice(1);
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/** { cs: { phraseId: text }, en: {...} } */
export function buildCatalogue(species) {
  const cat = {};
  for (const lang of SPOKEN_LANGS) {
    const S = strings[lang]; const c = (cat[lang] = {});
    for (const k of UI_KEYS) c[`ui.${k}`] = S[k];
    c['ui.langName'] = S[`lang.${lang}`];
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
