// Houbičky — loads data + art once; hands out inline SVG instances (ids made unique per instance).
import * as store from './store.js';

export const species = [];
export const byId = new Map();
export let credits = {};      // photos/credits.json (written by fetch_photos.py)
export let manifest = {};     // photos/manifest.json by id
export let voiceIndex = {};   // voice/index.json (make_voice.py): { lang: { phraseId: { text, file, … } } }
let hiddenDefault = new Set(); // photos/hidden.json: ids hidden by default on every device
const svgText = new Map();

async function get(url, type = 'text') {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return type === 'json' ? r.json() : r.text();
}

export async function loadAll() {
  const data = await get('data/species.json', 'json');
  for (const s of data.species) { species.push(s); byId.set(s.id, s); }
  const [cr, mf, vi, hid] = await Promise.all([
    get('photos/credits.json', 'json').catch(() => ({})),
    get('photos/manifest.json', 'json').catch(() => ({ photos: [] })),
    get('voice/index.json', 'json').catch(() => ({})),
    get('photos/hidden.json', 'json').catch(() => []),
  ]);
  voiceIndex = vi && typeof vi === 'object' ? vi : {};
  hiddenDefault = new Set(Array.isArray(hid) ? hid : []);
  credits = cr && typeof cr === 'object' ? cr : {};
  manifest = Object.fromEntries((mf.photos || []).map((p) => [p.id, p]));
  await Promise.all(['scene-forest', 'basket', 'zone-les', 'ui-icons'].map(async (f) => svgText.set(f, await get(`art/${f}.svg`))));
  // A species whose character is not drawn yet (data ahead of art) is left out instead of breaking the game.
  const missing = [];
  await Promise.all(species.map(async (s) => { try { svgText.set(s.id, await get(`art/${s.id}.svg`)); } catch { missing.push(s.id); } }));
  if (missing.length) {
    console.info('Houbičky: no art yet for', missing.join(', '));
    for (const id of missing) { byId.delete(id); species.splice(species.findIndex((s) => s.id === id), 1); }
  }
}

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let seq = 0;

/** Parse art/<name>.svg into a fresh element. unique=true rewrites ids so the same art can appear twice. */
/** Load extra art on demand (e.g. 'vyprava/side-child'); cached with the rest. */
export async function loadArt(names) {
  await Promise.all(names.filter((n) => !svgText.has(n)).map(async (n) => svgText.set(n, await get(`art/${n}.svg`))));
}
export const hasArt = (name) => svgText.has(name);

export function svgEl(name, { unique = true } = {}) {
  let s = svgText.get(name);
  if (!s) throw new Error(`art not loaded: ${name}`);
  if (unique) {
    const n = ++seq;
    const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    for (const id of ids) {
      const nid = `${id}__${n}`;
      s = s.replace(new RegExp(`(\\s)id="${reEsc(id)}"`, 'g'), `$1id="${nid}"`)
           .replace(new RegExp(`#${reEsc(id)}(?=["')\\s])`, 'g'), `#${nid}`);
    }
  }
  const t = document.createElement('template');
  t.innerHTML = s.trim();
  return t.content.firstElementChild;
}

/** A character instance. ground=false hides the moss patch (forest/games keep only the shadow). */
export function shroom(id, { ground = true } = {}) {
  const el = svgEl(id);
  el.querySelector('title')?.remove();
  el.classList.add(ground ? 'with-ground' : 'no-ground');
  el.setAttribute('focusable', 'false');
  return el;
}

/** How fetch_photos.py found the photo: 'commonsFile' | 'alt' | 'wikipedia' (automatic fallback) | null. */
export const photoVia = (id) => credits[id]?.via || null;
/** Shown by default only when it came from the researcher's Commons picks (not the Wikipedia fallback). */
export const photoDefaultShown = (id) => ['commonsFile', 'alt'].includes(photoVia(id));
export const photoBakedHidden = (id) => hiddenDefault.has(id);
/** Parents can override per photo in their corner: store.photoPrefs[id] = 'show' | 'hide'. */
export function photoShown(id) {
  if (!credits[id]) return false;
  const pref = store.get('photoPrefs')?.[id];
  return pref === 'show' ? true : pref === 'hide' ? false : (!hiddenDefault.has(id) && photoDefaultShown(id));
}
/** Photo offered on the card: recorded by fetch_photos.py (no 404s) AND approved. */
export const hasPhoto = (id) => photoShown(id);
export const photoIds = () => Object.keys(credits).filter((id) => byId.has(id));
export const photoUrl = (id) => `photos/${id}.jpg`;
export function photoCredit(id) {
  const c = credits[id] || {};
  return { author: c.author || manifest[id]?.author || '?', license: c.license || manifest[id]?.license || '', sourcePage: c.sourcePage || manifest[id]?.sourcePage || '' };
}

/** Look-alike pairs (DESIGN §6.2) with the decisive features to pin on each side. */
export const TWINS = [
  { a: 'hrib-smrkovy', b: 'zlucnik', fa: ['pores'], fb: ['pores'] },
  { a: 'bedla', b: 'muchomurka-zelena', fa: ['snakeskin', 'ring'], fb: ['volva'] },
  { a: 'bedla', b: 'muchomurka-tygrovana', fa: ['snakeskin'], fb: ['bulb-rim'] },
];
/**
 * Look-alikes of a species for the Dvojník panel: from data (`twin` + `twinTell.feature` = the decisive anchor),
 * falling back to the v1 TWINS table. { me, other, fMe: [feature], fOther: [feature], tell: bool }
 */
export function twinsOf(id, { dataOnly = true } = {}) {
  const sp = byId.get(id); const out = []; const seen = new Set();
  for (const t of TWINS) {
    if (t.a !== id && t.b !== id) continue;
    const other = t.a === id ? t.b : t.a; if (!byId.has(other)) continue;
    seen.add(other);
    out.push({ me: id, other, fMe: t.a === id ? t.fa : t.fb, fOther: t.a === id ? t.fb : t.fa });
  }
  if (dataOnly) {
    const fromData = [...new Set([...(sp?.twin ? [].concat(sp.twin) : []), ...species.filter((x) => x.twin && [].concat(x.twin).includes(id)).map((x) => x.id)])];
    for (const other of fromData) {
      if (seen.has(other) || !byId.has(other) || other === id) continue;
      const o = byId.get(other);
      out.push({ me: id, other, fMe: sp?.twinTell?.feature ? [sp.twinTell.feature] : [], fOther: o.twinTell?.feature ? [o.twinTell.feature] : [] });
    }
  }
  // the data's decisive features win when present
  for (const tw of out) {
    const a = byId.get(tw.me)?.twinTell?.feature; const b = byId.get(tw.other)?.twinTell?.feature;
    if (a) tw.fMe = [a]; if (b) tw.fOther = [b];
  }
  return out;
}
