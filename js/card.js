// Houbičky — Kartička: species card overlay (pins, verdict, safety line, flip to photo, Dvojník).
import { byId, shroom, hasPhoto, photoUrl, photoCredit, twinsOf } from './assets.js';
import { introIds } from './phrases.js';
import { $, $$, h, icon, esc, say, hush, name, anim, viewTransition, reduced, sleep, ms, groupKeyOf, badgeOf } from './ui.js';
import { t, getLang, groupLabel, groupSentence } from './i18n.js';
import * as store from './store.js';
import * as sound from './sound.js';

let layer = null; let current = null; let ro = null; let newSticker = false;
let opening = false;   // set synchronously: a second tap during the View Transition must not open a 2nd card
export const cardOpen = () => !!layer || opening;

const TINT = { jedla: 'var(--edible-soft)', nejedla: 'var(--inedible-soft)', jedovata: 'var(--poison-soft)' };

/** Phrase ids spoken when the card opens: name, group sentence, caution (or the deadly warning). */
const introLines = (sp) => introIds(sp);

function frontHtml(sp) {
  const lang = getLang(); const other = lang === 'cs' ? 'en' : 'cs';
  const gk = groupKeyOf(sp);
  const looks = (sp.lookFor?.[lang] || []).map((txt, i) =>
    `<li><button class="look" data-look="${i}"><span class="num">${i + 1}</span><span class="look-text">${esc(txt)}</span></button></li>`).join('');
  return `
    <div class="card-face card-front">
      <div class="card-art" style="--tint:${TINT[sp.group]}"><div class="art-box"></div><div class="pins"></div>
        ${hasPhoto(sp.id) ? `<button class="photo-thumb" data-act="flip" aria-label="${esc(t('card.showPhoto'))}"><img src="${photoUrl(sp.id)}" alt="" decoding="async"></button>` : ''}
        ${sp.caution?.[lang] ? `<p class="caution" role="note"><span class="warn-dot" aria-label="${esc(t('card.caution'))}">!</span><span>${esc(sp.caution[lang])}</span></p>` : ''}</div>
      <div class="card-info">
        <h2 class="sp-name" id="card-title">${esc(name(sp, lang))}</h2>
        <p class="sp-alt">${icon(`lang-${other}`, 'flag')}<span class="alt-name">${esc(sp.name[other])}</span><span class="latin">· ${esc(sp.latin)}</span></p>
        <button class="verdict v-${gk}" data-act="verdict">${icon(badgeOf(sp), 'badge')}<span>${esc(groupLabel(sp.group, sp.deadly))}</span></button>
        <p class="safety">${icon('parents')}<span>${esc(t('safety.short').replace(/\.$/, ''))}</span></p>
        <ol class="looks">${looks}</ol>
      </div>
    </div>`;
}

function backHtml(sp) {
  if (hasPhoto(sp.id)) {
    const c = photoCredit(sp.id);
    return `<div class="card-face card-back" style="visibility:hidden" inert aria-hidden="true">
      <figure class="photo-frame"><img class="photo" alt="${esc(t('card.realPhoto'))}: ${esc(name(sp))}" src="${photoUrl(sp.id)}" decoding="async">
        <figcaption class="credit">${esc(t('card.photoCredit', { author: c.author, license: c.license }))}</figcaption>
        <button class="thumb" data-act="flip" aria-label="${esc(t('card.showDrawing'))}"></button></figure></div>`;
  }
  return missingBack();
}
const missingBack = (shown = false) => `<div class="card-face card-back missing"${shown ? '' : ' style="visibility:hidden" inert aria-hidden="true"'}><div class="missing-art"></div><p class="missing-text">${esc(t('card.photoMissing').replace(/\.$/, ''))}</p></div>`;

/** Pins at the anchors; the later of two close pins is nudged away from the face anchor. */
function placePins(card, sp) {
  const art = $('.card-art', card); const svg = $('.art-box svg', card); const pins = $('.pins', card);
  if (!art || !svg) return;
  const base = art.getBoundingClientRect();
  const face = svg.querySelector('circle.anchor[data-feature="face"]')?.getBoundingClientRect();
  const fc = face ? [face.x + face.width / 2 - base.x, face.y + face.height / 2 - base.y] : null;
  const pts = [];
  pins.replaceChildren();
  for (const a of [...svg.querySelectorAll('circle.anchor[data-look]')].sort((x, y) => x.dataset.look - y.dataset.look)) {
    const r = a.getBoundingClientRect();
    let x = r.x + r.width / 2 - base.x; let y = r.y + r.height / 2 - base.y;
    for (const [px, py] of pts) {
      const d = Math.hypot(x - px, y - py);
      if (d < 72) {
        let vx = fc ? x - fc[0] : x - px; let vy = fc ? y - fc[1] : y - py;
        const L = Math.hypot(vx, vy) || 1; vx /= L; vy /= L;
        x += vx * (72 - d); y += vy * (72 - d);
      }
    }
    pts.push([x, y]);
    const i = +a.dataset.look;
    pins.append(h(`<button class="pin" data-look="${i}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px" aria-label="${esc(t('card.pin', { n: i + 1 }))}"><span>${i + 1}</span></button>`));
  }
}

function pulse(card, i) {
  const pin = $(`.pin[data-look="${i}"] span`, card);
  const chip = $(`.look[data-look="${i}"]`, card);
  if (pin) anim(pin, [{ boxShadow: '0 0 0 0 rgb(242 176 30 / .9)' }, { boxShadow: '0 0 0 14px rgb(242 176 30 / 0)' }], { duration: reduced() ? 1 : 420, iterations: 2 });
  if (chip) anim(chip, [{ background: 'var(--sky-glow)' }, { background: 'var(--paper-deep)' }], { duration: reduced() ? 1 : 840 });
}

export async function openCard(id, { fromEl } = {}) {
  if (layer || opening) return;
  const sp = byId.get(id); if (!sp) return;
  opening = true;
  try { await openCardInner(sp, id, fromEl); } finally { opening = false; }
}

async function openCardInner(sp, id, fromEl) {
  current = sp;
  newSticker = store.addSticker(id);
  let ghost = null;
  if (fromEl && document.startViewTransition && !reduced()) {
    const r = fromEl.getBoundingClientRect();
    ghost = h('<div class="vt-ghost" aria-hidden="true"></div>');
    Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, viewTransitionName: 'hero' });
    ghost.append(shroom(id, { ground: false }));
    document.body.append(ghost);
    fromEl.style.visibility = 'hidden';
  }
  await viewTransition(() => {
    ghost?.remove();
    if (fromEl) fromEl.style.visibility = '';
    render(sp);
    $('.art-box', layer).style.viewTransitionName = ghost ? 'hero' : '';
  });
  if (layer) $('.art-box', layer).style.viewTransitionName = '';
  if (sp.deadly) sound.play('bell'); else sound.play('whoosh');
  say(introLines(sp));
}

function render(sp) {
  layer = h(`<div class="card-layer" data-faces="mood">
    <div class="card-scrim" data-act="close"></div>
    <section class="card" role="dialog" aria-modal="true" aria-labelledby="card-title" data-group="${sp.group}" ${sp.deadly ? 'data-deadly' : ''}>
      ${sp.deadly ? `<div class="ribbon">${esc(t('card.ribbon'))}</div>` : ''}
      <div class="card-flip">${frontHtml(sp)}${backHtml(sp)}</div>
      <div class="card-actions">
        <button class="btn round r88 gold" data-act="speak" aria-label="${esc(t('card.listen'))}">${icon('speaker')}</button>
        <button class="btn round r88 gold" data-act="flip" aria-label="${esc(t('card.flip'))}">${icon('flip')}</button>
        ${twinsOf(sp.id).length ? `<button class="btn round r64 paper twin-btn" data-act="twin" aria-label="${esc(t('card.twin'))}"><span class="twin-thumbs"></span></button>` : ''}
        <button class="btn round r64 paper" data-act="close" aria-label="${esc(t('card.close'))}">${icon('close')}</button>
      </div>
    </section>
  </div>`);
  const art = shroom(sp.id, { ground: true });
  $('.art-box', layer).append(art);
  const back = $('.card-back', layer);
  const thumb = $('.thumb, .missing-art', back);
  thumb?.append(shroom(sp.id, { ground: !back.classList.contains('missing') ? false : true }));
  const photo = $('img.photo', back);
  photo?.addEventListener('error', () => {
    if (!layer) return;
    const shown = $('.card-flip', layer).classList.contains('flipped');
    back.outerHTML = missingBack(shown); $('.missing-art', layer)?.append(shroom(sp.id));
    $('.photo-thumb', layer)?.remove();
  }, { once: true });
  const tt = $('.twin-thumbs', layer);
  if (tt) { tt.append(shroom(sp.id, { ground: false })); tt.append(shroom(twinsOf(sp.id)[0].other, { ground: false })); }
  document.getElementById('overlay').append(layer);
  layer.addEventListener('click', onClick);
  layer.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });
  requestAnimationFrame(() => placePins(layer, sp));
  ro = new ResizeObserver(() => placePins(layer, sp));
  ro.observe($('.card-art', layer));
  $('[data-act="speak"]', layer).focus({ preventScroll: true });
}

function onClick(e) {
  const b = e.target.closest('[data-act], .pin, .look');
  if (!b || !current) return;
  const sp = current;
  if (b.matches('.pin, .look')) {
    const i = +b.dataset.look; sound.play('pop'); pulse(layer, i);
    say(`sp.${sp.id}.look.${i}`); return;
  }
  switch (b.dataset.act) {
    case 'close': closeCard(); break;
    case 'speak': sound.play('tap'); say([...introLines(sp), `sp.${sp.id}.fact`]); break;
    case 'verdict': sound.play('pop'); say(introLines(sp).slice(1)); break;
    case 'flip': flipCard(sp); break;
    case 'twin': openTwin(sp); break;
    case 'twin-close': $('.twin-panel', layer)?.remove(); hush(); break;
    case 'twin-switch': openTwin(sp, +b.dataset.i); break;
    case 'twin-speak': say([`sp.${sp.id}.caution`, `sp.${b.dataset.other}.caution`]); break;
    default:
  }
}

/** Dvojník (L2): both characters with neutral faces, only the decisive pins. */
function openTwin(sp, idx = 0) {
  $('.twin-panel', layer)?.remove();
  const twins = twinsOf(sp.id); const tw = twins[idx]; if (!tw) return;
  const side = (id, feats) => {
    const s = byId.get(id);
    return `<div class="twin-side" data-id="${id}"><div class="twin-art"></div><div class="twin-pins" data-feats="${feats.join(' ')}"></div>
      <p class="twin-name">${esc(name(s))}</p><p class="twin-verdict v-${groupKeyOf(s)}">${icon(badgeOf(s), 'badge')}<span>${esc(groupLabel(s.group, s.deadly))}</span></p></div>`;
  };
  const panel = h(`<div class="twin-panel" data-faces="neutral" role="dialog" aria-label="${esc(t('card.twinTitle'))}">
    <h3 class="twin-title">${esc(t('card.twinTitle'))}</h3>
    ${twins.length > 1 ? `<div class="twin-tabs">${twins.map((x, i) => `<button class="btn pill-btn${i === idx ? ' on' : ''}" data-act="twin-switch" data-i="${i}">${esc(name(byId.get(x.other)))}</button>`).join('')}</div>` : ''}
    <div class="twin-row">${side(tw.me, tw.fMe)}<span class="twin-vs">≠</span>${side(tw.other, tw.fOther)}</div>
    <div class="twin-actions"><button class="btn round r88 gold" data-act="twin-speak" data-other="${tw.other}" aria-label="${esc(t('card.listen'))}">${icon('speaker')}</button>
      <button class="btn round r64 paper" data-act="twin-close" aria-label="${esc(t('card.close'))}">${icon('close')}</button></div>
  </div>`);
  $('.card', layer).append(panel);
  for (const s of $$('.twin-side', panel)) $('.twin-art', s).append(shroom(s.dataset.id, { ground: true }));
  requestAnimationFrame(() => {
    for (const s of $$('.twin-side', panel)) {
      const base = s.getBoundingClientRect(); const box = $('.twin-pins', s); const sid = s.dataset.id;
      for (const f of box.dataset.feats.split(' ')) {
        const a = s.querySelector(`circle.anchor[data-feature="${f}"]`); if (!a) continue;
        const r = a.getBoundingClientRect(); const look = a.dataset.look;
        box.append(h(`<button class="pin twin-pin" style="left:${(r.x + r.width / 2 - base.x).toFixed(0)}px;top:${(r.y + r.height / 2 - base.y).toFixed(0)}px" data-sid="${sid}" data-look="${look ?? ''}" aria-label="${esc(f)}"><span>!</span></button>`));
      }
    }
  });
  panel.addEventListener('click', (e) => {
    const p = e.target.closest('.twin-pin'); if (!p) return;
    e.stopPropagation(); sound.play('pop');
    const s = byId.get(p.dataset.sid);
    say([`sp.${s.id}.name`, ...(p.dataset.look !== '' ? [`sp.${s.id}.look.${p.dataset.look}`] : [])]);
  });
  sound.play('whoosh');
  say([`sp.${sp.id}.caution`, `sp.${tw.other}.caution`]);
}

// ---- flip: no backface-visibility (WebKit lets composited children of the hidden face show through).
// Rotate the whole card 0→90°, swap faces (visibility + inert) at the edge, then −90→0°. Taps during a flip are ignored.
let flipping = false; let lastFlip = 0;
function setFace(el, on) {
  if (!el) return;
  el.style.visibility = on ? 'visible' : 'hidden';
  el.toggleAttribute('inert', !on);
  el.setAttribute('aria-hidden', String(!on));
  for (const a of el.getAnimations({ subtree: true })) on ? a.play() : a.pause();
}
async function flipCard(sp) {
  const now = performance.now();
  if (!layer || flipping || now - lastFlip < 400) return;
  flipping = true; lastFlip = now;
  const l = layer; const f = $('.card-flip', l);
  const toBack = !f.classList.contains('flipped');
  const swap = () => {
    f.classList.toggle('flipped', toBack);
    setFace($('.card-front', l), !toBack); setFace($('.card-back', l), toBack);
  };
  sound.play('whoosh');
  try {
    if (reduced()) {                                   // gentle cross-fade, no rotation
      const a = f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' });
      await a.finished.catch(() => {}); swap();
      const b = f.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 }); a.cancel();
      await b.finished.catch(() => {});
    } else {
      const half = Math.max(120, ms('--t-flip', 700) / 2);
      const a = f.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: half, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' });
      await a.finished.catch(() => {}); swap();
      const b = f.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: half, easing: 'cubic-bezier(.22,1,.36,1)' });
      a.cancel();
      await b.finished.catch(() => {});
    }
  } finally { flipping = false; }
  if (layer === l && toBack) say(hasPhoto(sp.id) ? ['ui.card.realPhoto', `sp.${sp.id}.name`] : 'ui.card.photoMissing');
}

export async function closeCard() {
  if (!layer) return;
  hush(); ro?.disconnect(); ro = null;
  const l = layer; const sp = current; const fresh = newSticker;
  const from = $('.art-box', l)?.getBoundingClientRect();
  layer = null; current = null; newSticker = false;
  await anim(l, [{ opacity: 1 }, { opacity: 0 }], { duration: reduced() ? 1 : 220, easing: 'ease-out' });
  l.remove();
  if (fresh) flySticker(sp, from);
}

/** New sticker: the character flies from the card into the Album door (or progress pill). */
async function flySticker(sp, from) {
  const target = document.querySelector('[data-door="album"] .door-ic') || document.querySelector('.progress-pill');
  sound.play('sparkle');
  if (!target || !from || reduced()) return;
  const to = target.getBoundingClientRect();
  const img = h(`<img class="fly-sticker" src="art/${sp.id}.svg" alt="">`);
  const size = Math.min(from.width, from.height) * 0.6;
  Object.assign(img.style, { left: `${from.left + from.width / 2 - size / 2}px`, top: `${from.top + from.height / 2 - size / 2}px`, width: `${size}px`, height: `${size}px` });
  document.body.append(img);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2); const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  await anim(img, [
    { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
    { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 80}px) scale(.8) rotate(-8deg)`, opacity: 1, offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(.25) rotate(4deg)`, opacity: 0.2 },
  ], { duration: 900, easing: 'cubic-bezier(.55,0,.35,1)' });
  img.remove();
  anim(target, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' });
}

addEventListener('keydown', (e) => { if (e.key === 'Escape' && layer) closeCard(); });
export { sleep };
