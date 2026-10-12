// Houbičky — Album nálepek: slots grouped by edibility; Level 1 shows its 8, Level 2+ all 25 (DESIGN-v2 §5.2).
import { species, byId } from './assets.js';
import { $, $$, h, icon, esc, say, name, seeded, anim, reduced } from './ui.js';
import { effectiveLevel, speciesFor, minLevel } from './levels.js';
import { t } from './i18n.js';
import * as store from './store.js';
import * as sound from './sound.js';
import { go } from './router.js';
import { openCard } from './card.js';

let root = null; let off = null;
const SECTIONS = [['jedla', 'album.edible', 'badge-jedla'], ['nejedla', 'album.inedible', 'badge-nejedla'], ['jedovata', 'album.poisonous', 'badge-jedovata']];

function slot(sp) {
  const have = store.hasSticker(sp.id);
  const lvl = ` data-min-level="${minLevel(sp)}"`;
  const rot = ((seeded(sp.id) * 6) - 3).toFixed(1);
  const nick = sp.nick?.[document.documentElement.lang] || sp.nick?.cs;
  if (!have) return `<li class="slot empty"${lvl}><button class="sticker-btn" data-id="${sp.id}" aria-label="?"><img class="silhouette" src="art/${sp.id}.svg" alt=""></button></li>`;
  return `<li class="slot${store.isGold(sp.id) ? ' gold' : ''}"${lvl}><button class="sticker-btn" data-id="${sp.id}" style="--rot:${rot}deg" aria-label="${esc(name(sp))}">
    <img class="sticker" src="art/${sp.id}.svg" alt=""></button>
    <p class="st-name">${esc(name(sp))}</p>${nick ? `<p class="st-nick">${esc(nick)}</p>` : ''}</li>`;
}

function render() {
  if (!root) return;
  const pool = speciesFor(effectiveLevel());
  const n = pool.filter((s) => store.hasSticker(s.id)).length; const total = pool.length;
  const sec = ([g, key, badge]) => {
    const list = pool.filter((s) => s.group === g);
    return `<section class="album-sec sec-${g}"><h2 class="sec-head">${icon(badge, 'badge')}<span>${esc(t(key))}</span><small>${list.length}</small></h2>
      <ul class="slots">${list.map(slot).join('')}</ul></section>`;
  };
  root.replaceChildren(h(`<div class="album-screen">
    <div class="topbar ui">
      <button class="btn round r64 paper" data-act="home" aria-label="${esc(t('nav.home'))}">${icon('home')}</button>
      <h1 class="title-pill pill">${esc(t('album.title'))}</h1>
      <span class="spacer"></span>
      <div class="pill album-count" role="status" aria-label="${esc(t('album.count', { n, total }))}">${icon('star', 'star-ic')}<b>${n} / ${total}</b>
        <span class="dots">${pool.map((s) => `<i class="${store.hasSticker(s.id) ? 'on' : ''}"></i>`).join('')}</span></div>
    </div>
    <div class="book ui">
      <div class="page left">${sec(SECTIONS[0])}</div>
      <div class="page right">${sec(SECTIONS[1])}${sec(SECTIONS[2])}</div>
    </div>
  </div>`));
}

export function mount(el) {
  root = el;
  render();
  el.addEventListener('click', onClick);
  off = store.subscribe(() => render());
  if (effectiveLevel() >= 2 && !store.wasSeen('album2')) newPages();
  else if (store.stickerCount() === 0) say('ui.album.empty');
}
export function unmount() { off?.(); root = null; }

/** First visit after Level 2 opened: the new slots pop in (page unfold) and the voice says so. */
function newPages() {
  store.markSeen('album2');                       // (re-renders via subscribe; animate the fresh DOM)
  say('ui.album.newPages');
  if (reduced() || !root) return;
  $$('.slot[data-min-level="2"]', root).forEach((li, i) => anim(li, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }],
    { duration: 380, delay: 40 * i, easing: 'ease-out', fill: 'backwards' }));
}

function onClick(e) {
  const b = e.target.closest('[data-act], .sticker-btn'); if (!b) return;
  if (b.dataset.act === 'home') { go('les'); return; }
  const id = b.dataset.id;
  if (!store.hasSticker(id)) { sound.play('tryAgain'); say('ui.album.unknown'); return; }
  sound.play('pop');
  openCard(id, { fromEl: $('img', b) });
  void byId; void species;
}
