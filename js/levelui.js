// Houbičky — level UI per DESIGN-v2 §3: the Úroveň sheet (three level cards with previews), the unlock
// ceremony (rosette + rays + gift card), and the hedgehog that peeks up at a locked Výprava door.
import { byId, species, shroom, svgEl, loadArt, photoShown, photoUrl } from './assets.js';
import { unlockState, effectiveLevel, setLevel, goldIdsForL3, UNLOCK_GOLD, UNLOCK_STICKERS, speciesFor } from './levels.js';
import { h, icon, esc, say, anim, reduced, ms, sleep } from './ui.js';
import { t } from './i18n.js';
import * as store from './store.js';
import * as sound from './sound.js';
import { celebrate } from './confetti.js';

const PREVIEW = 'hrib-smrkovy';

function preview(n) {
  if (n === 3) {
    const photo = photoShown(PREVIEW);
    return `<div class="lv-polaroid">${photo ? `<img src="${photoUrl(PREVIEW)}" alt="">` : '<span class="lv-polaroid-draw"></span>'}</div>`;
  }
  return `<div class="lv-preview" data-faces="${n === 1 ? 'mood' : 'neutral'}"></div>`;
}

/** The level sheet over the dimmed Les. onPick(n) after a successful switch. */
export function openSheet({ onPick, onClose } = {}) {
  if (document.querySelector('.level-sheet')) return;
  const st = unlockState(); const cur = effectiveLevel();
  const gold = goldIdsForL3();
  const card = (n) => {
    const locked = !st[n].unlocked;
    let progress = '';
    if (locked && n === 3) {
      progress = `<div class="lv-dots" aria-hidden="true">${species.map((sp) => `<i class="${gold.includes(sp.id) ? 'on' : ''}"></i>`).join('')}</div>
        <p class="lv-count">${esc(t('level.goldCount', { n: gold.length, total: UNLOCK_GOLD }))}</p>`;
    } else if (locked && n === 2) {
      const have = speciesFor(1).filter((sp) => store.hasSticker(sp.id)).length;
      progress = `<div class="lv-dots" aria-hidden="true">${speciesFor(1).map((sp) => `<i class="${store.hasSticker(sp.id) ? 'on' : ''}"></i>`).join('')}</div>
        <p class="lv-count">${have} / ${UNLOCK_STICKERS}</p>`;
    } else {
      progress = `<p class="lv-note">${esc(t(`level.note.${n}`))}</p>`;
    }
    return `<button class="lv-card${n === cur ? ' current' : ''}${locked ? ' locked' : ''}" data-lv="${n}" aria-label="${esc(t(`level.${n}`))}${locked ? ` – ${esc(t('level.locked'))}` : ''}">
      ${n === cur ? `<span class="lv-check">${icon('check')}</span>` : ''}
      <span class="lv-rosette">${icon(`level-${n}`)}</span>
      <span class="lv-name">${esc(t(`level.${n}`))}</span>
      <span class="lv-pv">${preview(n)}${locked ? `<span class="lv-lock">${icon('lock')}</span>` : ''}</span>
      ${progress}
    </button>`;
  };
  const layer = h(`<div class="level-sheet" role="dialog" aria-modal="true" aria-label="${esc(t('level.sheetTitle'))}">
    <div class="ls-scrim" data-act="close"></div>
    <section class="ls-card">
      <header><button class="btn round r64 paper" data-act="close" aria-label="${esc(t('card.close'))}">${icon('close')}</button>
        <h2>${esc(t('level.sheetTitle'))}</h2></header>
      <div class="ls-cards">${[1, 2, 3].map(card).join('')}</div>
    </section></div>`);
  for (const pv of layer.querySelectorAll('.lv-preview')) pv.append(shroom(PREVIEW, { ground: true }));
  for (const d of layer.querySelectorAll('.lv-polaroid-draw')) d.append(shroom(PREVIEW, { ground: false }));
  document.getElementById('overlay').append(layer);
  const close = () => { layer.remove(); onClose?.(); };
  layer.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], .lv-card'); if (!b) return;
    if (b.dataset.act === 'close') { sound.play('tap'); close(); return; }
    const n = Number(b.dataset.lv);
    if (b.classList.contains('locked')) {
      sound.play('tryAgain');
      anim(b, [{ transform: 'rotate(0)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0)' }], { duration: reduced() ? 1 : 360 });
      if (n === 3) say(`ui.level.lockedHint3.${Math.max(1, Math.min(UNLOCK_GOLD, UNLOCK_GOLD - gold.length))}`);
      else say('ui.level.lockedHint2');
      return;
    }
    if (setLevel(n)) { sound.play('success'); say(`ui.level.${n}`); close(); onPick?.(n); }
  });
  say(`ui.level.${cur}`);
}

/**
 * Unlock ceremony for level n (2: Houbař + Výprava gift; 3: Mistr houbař + photos). Resolves after the tap
 * that closes it. The level is switched up; the child can always go back down in the sheet.
 */
export async function ceremony(n) {
  store.markSeen(n);
  store.setLevel(n);
  if (n === 2) await loadArt(['vyprava/guide-jezek']).catch(() => {});
  const layer = h(`<div class="ceremony" data-level="${n}" role="dialog" aria-modal="true" aria-label="${esc(t(`unlock.title${n}`))}">
    <div class="cer-rays" aria-hidden="true"></div>
    <div class="cer-rosette">${icon(`level-${n}`)}</div>
    <h2 class="cer-title">${esc(t(`unlock.title${n}`))}</h2>
    <div class="cer-gift" hidden>
      <span class="cer-gift-ic">${icon(n === 2 ? 'vyprava' : 'flip')}</span><span class="cer-gift-art"></span>
      <b>${esc(t(`unlock.gift${n}`))}</b></div>
  </div>`);
  const giftArt = layer.querySelector('.cer-gift-art');
  if (n === 2) { try { const j = svgEl('vyprava/guide-jezek'); j.dataset.expr = 'happy'; giftArt.append(j); } catch { /* art missing */ } }
  else giftArt.innerHTML = photoShown(PREVIEW) ? `<img src="${photoUrl(PREVIEW)}" alt="">` : '';
  document.getElementById('overlay').append(layer);
  const still = reduced();
  sound.play('success');
  say(`ui.unlock.level${n}`);
  if (!still) {
    anim(layer.querySelector('.cer-rosette'), [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    await sleep(400);
    celebrate({ kind: 'leaves', duration: 2400 });
    await sleep(1200);
  } else await sleep(300);
  const gift = layer.querySelector('.cer-gift'); gift.hidden = false;
  if (!still) anim(gift, [{ transform: 'translateY(120%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' });
  await sleep(still ? 1200 : 1000);
  layer.classList.add('ready');
  await new Promise((resolve) => layer.addEventListener('click', resolve, { once: true }));
  sound.play('pop');
  await anim(layer, [{ opacity: 1 }, { opacity: 0 }], { duration: still ? 1 : 300 });
  layer.remove();
}

/** A locked Výprava door: the hedgehog peeks up from the bottom edge for 2 s and speaks the hint. */
export async function hedgehogPeek() {
  if (document.querySelector('.jezek-peek')) return;
  await loadArt(['vyprava/guide-jezek']).catch(() => {});
  const el = h('<div class="jezek-peek" aria-hidden="true"></div>');
  try { const j = svgEl('vyprava/guide-jezek'); j.dataset.expr = 'explain'; el.append(j); } catch { return; }
  document.getElementById('overlay').append(el);
  say('ui.vyprava.lockedHint');
  await anim(el, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: reduced() ? 1 : 350, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
  await sleep(2000);
  await anim(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: reduced() ? 1 : 300, fill: 'forwards' });
  el.remove();
}
export { byId, ms };
