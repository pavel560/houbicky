// Houbičky — boot: load data + art, mount the forest, start screen, routing.
import { loadAll, svgEl, species, voiceIndex } from './assets.js';
import { IS_BETA } from './env.js';
import * as vyprava from './vyprava/game.js';
import { buildCatalogue } from './phrases.js';
import { mountScene } from './scene.js';
import { register, go } from './router.js';
import { h, icon, esc, say } from './ui.js';
import { t, applyI18n, getLang, toggleLang } from './i18n.js';
import * as speech from './speech.js';
import * as sound from './sound.js';
import { registerServiceWorker } from './pwa.js';
import * as les from './les.js';
import * as kosik from './kosik.js';
import * as kdo from './kdo.js';
import * as album from './album.js';
import * as parents from './parents.js';
import { openCard, closeCard } from './card.js';
import * as store from './store.js';

register('les', les); register('vyprava', vyprava); register('kosik', kosik); register('kdo', kdo); register('album', album); register('parents', parents);

// Visible fallback when no voice exists for the language: a paper speech bubble.
speech.setFallbackHandler(({ text }) => {
  let el = document.getElementById('speech-bubble');
  if (!el) { el = h('<div id="speech-bubble" role="status" aria-live="polite"></div>'); document.body.append(el); }
  el.innerHTML = `${icon('speaker')}<span>${esc(text)}</span>`;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600 + text.length * 55);
});

function startScreen() {
  const layer = h(`<div class="start-layer">
    <div class="start-card">
      <h1 class="start-title">${esc(t('app.name'))}</h1>
      <button class="btn round r120 gold play" aria-label="${esc(t('start.play'))}">${icon('play')}</button>
      <button class="btn round r64 paper lang-btn" aria-label="${esc(t('les.lang'))}">${icon(`lang-${getLang()}`, 'flag')}</button>
      <p class="start-ai">${esc(t('start.ai'))}</p>
    </div></div>`);
  document.getElementById('overlay').append(layer);
  layer.querySelector('.lang-btn').addEventListener('click', (e) => {
    toggleLang(); e.currentTarget.innerHTML = icon(`lang-${getLang()}`, 'flag'); sound.play('pop');
    layer.querySelector('.play').setAttribute('aria-label', t('start.play'));
    layer.querySelector('.start-ai').textContent = t('start.ai');
  });
  layer.querySelector('.play').addEventListener('click', async () => {
    sound.unlock(); speech.unlockAudio(); speech.prime(true); sound.play('success');
    layer.classList.add('leaving');
    setTimeout(() => layer.remove(), 380);
    await go('les');
    say('ui.say.greeting');
  });
}

async function boot() {
  try {
    await loadAll();
  } catch (err) {
    document.getElementById('screen').append(h(`<p class="boot-error">${esc(t('common.loading'))} ${esc(err.message)}</p>`));
    throw err;
  }
  speech.setVoice({ catalogue: buildCatalogue(species), index: voiceIndex });
  const sprite = svgEl('ui-icons', { unique: false });
  document.getElementById('sprite').append(sprite);
  mountScene(document.getElementById('stage'));
  applyI18n();
  document.documentElement.classList.add('ready');
  if (IS_BETA) {          // beta copy (/beta/): visible ribbon, own title — derived from the URL, no build step
    document.documentElement.dataset.beta = '';
    document.title = `${document.title} beta`;
    document.body.append(h(`<div class="beta-ribbon" aria-hidden="true">${esc(t('beta.ribbon'))}</div>`));
  }
  const rot = document.getElementById('rotate');
  rot.innerHTML = `<div class="rotate-card"><div class="rotate-ic">${icon('flip')}</div><p class="rot-tablet">${esc(t('rotate.title'))}</p><p class="rot-phone">${esc(t('rotate.titlePhone'))}</p>
    <button class="btn round r88 paper" data-act="rotate-home" aria-label="${esc(t('nav.home'))}">${icon('home')}</button></div>`;
  // rotation lock on the iPad must never trap the child in a game
  rot.querySelector('[data-act="rotate-home"]').addEventListener('click', () => { sound.play('pop'); go('les'); });
  addEventListener('langchange', () => { rot.querySelector('.rot-tablet').textContent = t('rotate.title'); rot.querySelector('.rot-phone').textContent = t('rotate.titlePhone'); rot.querySelector('button').setAttribute('aria-label', t('nav.home')); });
  document.documentElement.dataset.screen = 'start';
  startScreen();
  registerServiceWorker().then((r) => { window.__houbicky.sw = { ok: r.ok, reason: r.reason || null }; });
}

// No pinch-zoom on the iPad (Safari ignores user-scalable=no): block the WebKit gesture events.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });

// test / debugging hook (no secrets here)
window.__houbicky = { go, openCard, closeCard, store };
boot();
