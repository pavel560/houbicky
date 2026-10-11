// Houbičky — Koutek pro rodiče (gated by a 3 s hold on Les).
import { species, byId, credits, manifest, photoIds, photoVia, photoShown, photoUrl } from './assets.js';
import { h, icon, esc, name, say } from './ui.js';
import { t, getLang, setLang, applyI18n } from './i18n.js';
import * as store from './store.js';
import { unlockState, effectiveLevel, setLevel, UNLOCK_STICKERS } from './levels.js';
import * as sound from './sound.js';
import { go } from './router.js';

let root = null;
const sw = (on, act) => `<button class="switch" role="switch" aria-checked="${on}" data-act="${act}"><span class="knob"></span><span class="sw-label">${esc(on ? t('parents.on') : t('parents.off'))}</span></button>`;
const seg = (act, opts, cur) => `<div class="seg" role="group">${opts.map(([v, label]) => `<button class="seg-btn${v === cur ? ' on' : ''}" aria-pressed="${v === cur}" data-act="${act}" data-v="${v}">${esc(label)}</button>`).join('')}</div>`;

function creditRows() {
  return species.map((sp) => {
    const c = credits[sp.id];
    const right = c
      ? `${esc(c.author || '?')} · ${c.licenseUrl ? `<a href="${esc(c.licenseUrl)}" target="_blank" rel="noopener">${esc(c.license || '')}</a>` : esc(c.license || '')} · <a href="${esc(c.sourcePage || manifest[sp.id]?.sourcePage || '#')}" target="_blank" rel="noopener">Wikimedia Commons</a>`
      : `<span class="muted">${esc(t('parents.creditsEmpty'))}</span>`;
    return `<li><b>${esc(name(sp))}</b> <i>${esc(sp.latin)}</i><br>${right}</li>`;
  }).join('');
}

function photoGrid() {
  const ids = photoIds();
  if (!ids.length) return `<p class="muted">${esc(t('parents.photosNone'))}</p>`;
  return `<ul class="photo-grid">${ids.map((id) => {
    const on = photoShown(id); const via = photoVia(id) || '?';
    return `<li class="pcheck${on ? '' : ' hidden-photo'}"><img src="${photoUrl(id)}" alt="${esc(name(byId.get(id)))}" loading="lazy" decoding="async">
      <b>${esc(name(byId.get(id)))}</b><span class="muted">${esc(t(`parents.via.${via}`))}</span>
      <button class="switch" role="switch" aria-checked="${on}" data-act="photo" data-id="${id}"><span class="knob"></span>
        <span class="sw-label">${esc(on ? t('parents.photoShown') : t('parents.photoHidden'))}</span></button></li>`;
  }).join('')}</ul>`;
}

function levelRows() {
  const st = unlockState(); const cur = effectiveLevel();
  const segBtns = [1, 2, 3].map((n) => `<button class="seg-btn${n === cur ? ' on' : ''}" aria-pressed="${n === cur}" data-act="level" data-v="${n}"
    ${st[n].unlocked ? '' : 'disabled aria-disabled="true"'} title="${esc(st[n].unlocked ? t(`level.${n}`) : t('level.locked'))}">${n} · ${esc(t(`level.${n}`))}</button>`).join('');
  const unlockRow = (key, label) => `<div class="row sub"><span>${esc(t(label))}</span>${st[key].auto
    ? `<span class="muted">${esc(t('parents.unlockedAuto'))}</span>` : sw(st[key].manual, `unlock-${key}`)}</div>`;
  return `<div class="row level-row"><div><h2>${esc(t('level.title'))}</h2><p class="muted">${esc(t(`level.hint.${cur}`))}</p>
      <p class="muted">${esc(t('parents.levelsHint', { n: UNLOCK_STICKERS }))}</p></div><div class="seg level-seg" role="group">${segBtns}</div></div>
    ${unlockRow(2, 'parents.unlock2')}${unlockRow(3, 'parents.unlock3')}`;
}

function render() {
  const lang = getLang();
  root.replaceChildren(h(`<div class="parents-screen">
    <div class="topbar ui">
      <button class="btn round r64 paper" data-act="home" aria-label="${esc(t('nav.home'))}">${icon('home')}</button>
      <h1 class="title-pill pill">${esc(t('parents.title'))}</h1>
    </div>
    <article class="sheet ui">
      <section class="safety-box">${icon('parents', 'big')}<p>${esc(t('safety.full'))}</p></section>
      <section class="offline"><h2>${esc(t('parents.offlineTitle'))}</h2>
        <p class="offline-ready" role="status">${esc(t('parents.offlineChecking'))}</p><p class="muted">${esc(t('parents.offlineHint'))}</p></section>
      <section class="row-set">
        ${levelRows()}
        <div class="row"><h2>${esc(t('settings.language'))}</h2>${seg('lang', [['cs', t('lang.cs')], ['en', t('lang.en')]], lang)}</div>
        <div class="row"><h2>${esc(t('parents.voiceRate'))}</h2>${seg('rate', [['slow', t('parents.rateSlow')], ['normal', t('parents.rateNormal')]], store.get('rate'))}</div>
        <div class="row"><h2>${esc(t('parents.soundFx'))}</h2>${sw(!store.isMuted(), 'sound')}</div>
      </section>
      <section class="photo-check"><h2>${esc(t('parents.photosCheck'))}</h2><p class="muted">${esc(t('parents.photosCheckHint'))}</p>${photoGrid()}</section>
      <section><h2>${esc(t('parents.credits'))}</h2><p class="muted">${esc(t('parents.photosHow'))}</p><ul class="credits">${creditRows()}</ul></section>
      <section><h2>${esc(t('parents.sources'))}</h2><p><a href="data/RESEARCH_NOTES.md" target="_blank" rel="noopener">${esc(t('parents.notes'))}</a></p></section>
      <section class="reset"><h2>${esc(t('parents.reset'))}</h2>
        <div class="reset-row"><button class="btn text-btn" data-act="reset">${esc(t('parents.reset'))}</button></div></section>
      ${store.persistent ? '' : `<p class="muted">${esc(t('parents.noStorage'))}</p>`}
    </article>
  </div>`));
  askStatus();
}

// ---- "Připraveno na cestu": ask the service worker how much of the game is cached for offline play
let pollT = null;
function onSwMessage(e) {
  if (e.data?.type !== 'status' || !root) return;
  const el = root.querySelector('.offline-ready'); if (!el) return;
  const p = e.data.total ? Math.floor((100 * e.data.have) / e.data.total) : 0;
  el.classList.toggle('done', p >= 100);
  el.innerHTML = `<span>${esc(t('parents.offlineReady', { p }))}</span><span class="bar" aria-hidden="true"><i style="--p:${p}%"></i></span>${p >= 100 ? icon('badge-jedla', 'badge-sm') : ''}`;
  clearTimeout(pollT);
  if (p < 100) pollT = setTimeout(askStatus, 1500);
}
async function askStatus() {
  const el = root?.querySelector('.offline-ready'); if (!el) return;
  const reg = 'serviceWorker' in navigator && window.isSecureContext ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
  const w = reg?.active || reg?.waiting || reg?.installing;
  if (!w) { el.textContent = t('parents.offlineNoSw'); return; }
  w.postMessage({ type: 'status' });
}

export function mount(el) {
  root = el; render(); el.addEventListener('click', onClick);
  navigator.serviceWorker?.addEventListener('message', onSwMessage);
}
export function unmount() { clearTimeout(pollT); navigator.serviceWorker?.removeEventListener('message', onSwMessage); root = null; }

function onClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'home') { go('les'); return; }
  sound.play('tap');
  if (act === 'level') { if (setLevel(Number(b.dataset.v))) say(`ui.level.${b.dataset.v}`); }
  else if (act.startsWith('unlock-')) {
    const k = act.slice(7); const key = /^\d$/.test(k) ? Number(k) : k;
    store.setUnlock(key, !store.getUnlocks()[key]);
  }
  else if (act === 'photo') { store.setPhotoPref(b.dataset.id, photoShown(b.dataset.id) ? 'hide' : 'show'); }
  else if (act === 'sound') sound.setMuted(!store.isMuted());
  else if (act === 'lang') { setLang(b.dataset.v); applyI18n(); }
  else if (act === 'rate') { store.set('rate', b.dataset.v); say('ui.safety.short'); }
  else if (act === 'reset') {
    const row = b.closest('.reset-row');
    row.innerHTML = `<span>${esc(t('parents.resetConfirm'))}</span><button class="btn text-btn danger" data-act="reset-yes">${esc(t('parents.yes'))}</button><button class="btn text-btn" data-act="reset-no">${esc(t('parents.no'))}</button>`;
    return;
  } else if (act === 'reset-yes') { store.reset(); render(); root.querySelector('.reset-row').innerHTML = `<span>${esc(t('parents.resetDone'))}</span>`; return; }
  const y = root.querySelector('.sheet')?.scrollTop || 0;
  render();
  const sh = root.querySelector('.sheet'); if (sh) sh.scrollTop = y;
}
