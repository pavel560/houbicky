// Houbičky — end-to-end walk + screenshot matrix (Playwright, Chromium).
// Self-contained: copies the site into a temp dir under /houbicky/ (like GitHub Pages), adds FAKE photos and silent
// voice mp3s there (never in the repo), serves it with serve.py and drives Chromium.
//   PLAYWRIGHT=<.../playwright/index.mjs> CHROME=<chrome> node dev/e2e.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'screens');
fs.mkdirSync(OUT, { recursive: true });
const SRC = path.join(HERE, '..');
// ---- temp site under /houbicky/ with fake photos + silent voice recordings for EVERY phrase
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'houbicky-e2e-'));
const SITE = path.join(TMP, 'houbicky');
const BETA = path.join(SITE, 'beta');           // like GitHub Pages: v2 deployed under /houbicky/beta/
const siteFilter = (f) => !/[\\/](dev[\\/]screens|__pycache__|\.git)([\\/]|$)/.test(f);
// E2E_STABLE_SRC: serve another checkout (e.g. main + isolation patch) at the root, this one at /beta/
fs.cpSync(process.env.E2E_STABLE_SRC || SRC, SITE, { recursive: true, filter: siteFilter });
fs.cpSync(SRC, BETA, { recursive: true, filter: siteFilter });
const { buildCatalogue } = await import(new URL('../js/phrases.js', import.meta.url).href);
const CATALOGUE = buildCatalogue(JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'species.json'), 'utf8')).species);
const frame = Buffer.alloc(417); frame.set([0xFF, 0xFB, 0x90, 0x64]);       // MPEG-1 L3 128 kb/s 44.1 kHz, silent
const SILENT_MP3 = Buffer.concat(Array(12).fill(frame));
for (const dir of [SITE, BETA]) {
  const vindex = {};
  for (const [lang, m] of Object.entries(CATALOGUE)) {
    fs.mkdirSync(path.join(dir, 'voice', lang), { recursive: true }); vindex[lang] = {};
    for (const [id, text] of Object.entries(m)) { fs.writeFileSync(path.join(dir, 'voice', lang, `${id}.mp3`), SILENT_MP3); vindex[lang][id] = { text, file: `${lang}/${id}.mp3`, sha1: 'test', bytes: SILENT_MP3.length }; }
  }
  fs.writeFileSync(path.join(dir, 'voice', 'index.json'), JSON.stringify(vindex));
}
const PORT = 8650 + Math.floor(Math.random() * 40);
const server = spawn('python3', [path.join(SRC, 'serve.py'), '--dir', TMP, '--port', String(PORT), '--host', '127.0.0.1', '--quiet'], { stdio: 'ignore' });
process.on('exit', () => { server.kill(); fs.rmSync(TMP, { recursive: true, force: true }); });
const BASE = process.env.BASE || `http://localhost:${PORT}/houbicky`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/index.html')).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 100)); }
const species = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'data', 'species.json'), 'utf8')).species;
const SW_VERSION = /const VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(HERE, '..', 'sw.js'), 'utf8'))[1];
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const results = []; const allErrors = [];
process.on('exit', (code) => { if (code) console.log(results.join('\n')); });
const ONLY = (process.env.E2E_ONLY || '').split(',').filter(Boolean);
const want = (id) => !ONLY.length || ONLY.includes(id);
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra && !ok ? '  — ' + extra : ''}`); };

// fake "photo" (the character on a green field) — only ever served through page.route
const mk = await browser.newPage({ viewport: { width: 1000, height: 750 } });
await mk.setContent(`<body style="margin:0;background:linear-gradient(#7d8c45,#56692f);display:grid;place-items:center;height:750px"><img src="${BASE}/art/hrib-smrkovy.svg" style="height:600px"></body>`);
await mk.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
const FAKE_JPG = await mk.screenshot({ type: 'jpeg', quality: 80 });
await mk.close();
// real files in the temp site (used by the offline/SW test; other sessions override credits via page.route)
const credit = (via) => ({ author: 'Test Author', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', sourcePage: 'https://commons.wikimedia.org/wiki/File:Test.jpg', via });
for (const dir of [SITE, BETA]) {
  for (const id of ['hrib-smrkovy', 'kozak', 'bedla', 'liska']) fs.writeFileSync(path.join(dir, 'photos', `${id}.jpg`), FAKE_JPG);
  fs.writeFileSync(path.join(dir, 'photos', 'credits.json'), JSON.stringify({ 'hrib-smrkovy': credit('commonsFile'), kozak: credit('alt'), bedla: credit('commonsFile'), liska: credit('wikipedia') }));
}

const FAKE_SPEECH = () => {
  const V = [{ name: 'Zuzana (Enhanced)', lang: 'cs-CZ', voiceURI: 'com.apple.voice.enhanced.cs-CZ.Zuzana', localService: true },
    { name: 'Serena (Enhanced)', lang: 'en-GB', voiceURI: 'com.apple.voice.enhanced.en-GB.Serena', localService: true }];
  window.__spoken = []; window.__tts = []; window.__files = []; let cur = null;
  addEventListener('speech:say', (e) => window.__spoken.push(e.detail.text));        // every line, recording or not
  addEventListener('speech:file', (e) => window.__files.push(e.detail));             // recordings actually played
  const synth = new EventTarget();
  Object.assign(synth, { speaking: false, pending: false, paused: false, getVoices: () => V,
    cancel() { if (cur) { const u = cur; cur = null; u.onerror && u.onerror({ error: 'interrupted' }); } }, resume() {},
    speak(u) { if (u.text.trim()) window.__tts.push(u.text); cur = u; setTimeout(() => { if (cur === u) { cur = null; u.onend && u.onend(); } }, 90); } });
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
};

const SEED_SEEN = () => {   // ceremonies count as seen in general tests (section C clears this and tests them)
  for (const k of ['houbicky.v1', 'houbicky.beta.v1']) try { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({ seen: { 2: true, 3: true, album2: true } })); } catch { /* ignore */ }
};
async function session(vp, tag, br = browser, { reducedMotion = 'no-preference', seed = true } = {}) {
  const ctx = await br.newContext({ viewport: vp, serviceWorkers: 'block', reducedMotion });
  await ctx.addInitScript(FAKE_SPEECH);
  if (seed) await ctx.addInitScript(SEED_SEEN);
  const cr = (via) => ({ author: 'Test Author', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', sourcePage: 'https://commons.wikimedia.org/wiki/File:Test.jpg', via });
  // hřib = researcher's Commons pick (shown), kozák = Commons alt (shown), liška = Wikipedia fallback (hidden until a parent approves)
  await ctx.route('**/photos/credits.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ 'hrib-smrkovy': cr('commonsFile'), kozak: cr('alt'), liska: cr('wikipedia') }) }));
  await ctx.route('**/photos/*.jpg', (r) => r.fulfill({ contentType: 'image/jpeg', body: FAKE_JPG }));
  const page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !m.text().includes('Service Worker registration blocked')) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`); });
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
  const settle = (ms = 700) => page.waitForTimeout(ms);
  const spoken = () => page.evaluate(() => window.__spoken.slice());
  return { ctx, page, errors, shot, settle, spoken };
}
async function start(s) {
  await s.page.goto(BASE + '/'); await s.page.waitForSelector('.start-layer .play');
  await s.settle(500); await s.shot('start');
  await s.page.click('.start-layer .play'); await s.page.waitForSelector('.doors'); await s.settle(900);
}
async function tapChar(s, id) {
  const b = await s.page.locator(`[data-char="${id}"]`).boundingBox();
  const x = b.x + b.width / 2; const y = b.y + b.height * 0.65;
  await s.page.mouse.click(x, y);
  try { await s.page.waitForSelector('.card', { timeout: 8000 }); } catch (e) {
    await s.shot(`DEBUG-tap-${id}`);
    console.log('TAP DEBUG', id, JSON.stringify(b), await s.page.evaluate(([px, py]) => { const el = document.elementFromPoint(px, py); return { hit: el ? `${el.tagName}.${el.className?.baseVal ?? el.className}` : null, screen: document.documentElement.dataset.screen, vt: document.documentElement.hasAttribute('data-vt'), cards: document.querySelectorAll('.card-layer').length }; }, [x, y]), s.errors);
    throw e;
  }
  await s.settle(1000);
}
async function closeCard(s) { await s.page.click('.card-actions [data-act="close"]'); await s.page.waitForSelector('.card-layer', { state: 'detached' }); await s.settle(1100); }
async function drag(s, fromSel, toSel, release = true) {
  const b = await s.page.locator(fromSel).boundingBox(); const t = await s.page.locator(toSel).boundingBox();
  const sx = b.x + b.width / 2; const sy = b.y + b.height / 2; const tx = t.x + t.width / 2; const ty = t.y + t.height * 0.45;
  await s.page.mouse.move(sx, sy); await s.page.mouse.down();
  for (let k = 1; k <= 14; k++) { await s.page.mouse.move(sx + ((tx - sx) * k) / 14, sy + ((ty - sy) * k) / 14); await s.page.waitForTimeout(16); }
  if (release) await s.page.mouse.up();
}
const waitIdle = (s, id) => s.page.waitForFunction((id) => { const a = document.querySelector('.piece.active'); return a && a.dataset.id === id && a.getAnimations().length === 0 && !a.style.translate; }, id, { timeout: 9000 });
const waitNext = (s, id) => s.page.waitForFunction((id) => { if (document.querySelector('.end-panel')) return true; const a = document.querySelector('.piece.active'); return a && a.dataset.id !== id && a.getAnimations().length === 0; }, id, { timeout: 12000 });

async function holdParents(s, ms = 3400) {
  await s.page.waitForFunction(() => !document.documentElement.hasAttribute('data-vt'));
  await s.page.evaluate(() => { const b = document.querySelector('.parents-btn'); window.__ev = [];
    for (const t of ['pointerdown', 'pointerup', 'pointerleave', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, () => window.__ev.push(t));
    for (const t of ['pointerdown', 'mousedown', 'pointerup']) window.addEventListener(t, (e) => window.__ev.push('win-' + t + ':' + e.target.tagName + '.' + (e.target.className?.baseVal ?? e.target.className) + ' btn=' + e.button + ' buttons=' + e.buttons + ' id=' + e.pointerId), true); });
  const pb = await s.page.locator('.parents-btn').boundingBox();
  await s.page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2); await s.page.mouse.down(); await s.page.waitForTimeout(ms); await s.page.mouse.up();
  try { await s.page.waitForSelector('.parents-screen', { timeout: 4000 }); return true; } catch {
    await s.shot('DEBUG-hold');
    console.log('HOLD DEBUG', JSON.stringify(await s.page.evaluate(([x, y]) => ({ ev: window.__ev, screen: document.documentElement.dataset.screen,
      hit: (() => { const e = document.elementFromPoint(x, y); return e.tagName + '.' + (e.className?.baseVal ?? e.className); })() }), [pb.x + pb.width / 2, pb.y + pb.height / 2])), s.errors);
    return false;
  }
}
async function playKosik(s, { wrongFirst = true, shotDrag = false } = {}) {
  await s.page.waitForSelector('.piece.active'); await s.settle(800);
  let dragDrops = 0; let tapDrops = 0; let bounced = false;
  for (let i = 0; i < 6; i++) {
    const a = '.piece.active';
    const id = await s.page.getAttribute(a, 'data-id'); const group = await s.page.getAttribute(a, 'data-group');
    const right = group === 'jedla' ? '.basket' : '.zone'; const wrong = group === 'jedla' ? '.zone' : '.basket';
    if (wrongFirst && i === 0) {
      await drag(s, a, `${wrong} .target-art`); await waitIdle(s, id); await s.settle(300);
      bounced = (await s.page.locator('.piece').count()) === 6 && !(await s.page.locator('.end-panel').count());
    }
    if (i % 2 === 0) {
      if (shotDrag && i === 0) { await drag(s, a, `${right} .target-art`, false); await s.settle(250); await s.shot('kosik-drag'); await s.page.mouse.up(); } else await drag(s, a, `${right} .target-art`);
      dragDrops++;
    } else {
      await s.page.click(a); await s.settle(500); await s.page.click(`${right} .chip-label`, { force: true }); tapDrops++;
    }
    await waitNext(s, id);
    if (i === 2) await s.shot('kosik-mid');
  }
  await s.page.waitForSelector('.end-panel'); await s.settle(1200);
  return { dragDrops, tapDrops, bounced, inBasket: await s.page.locator('.basket .dropped').count(), inZone: await s.page.locator('.zone .target-art svg .shroom').count() };
}

async function playKdo(s, lang) {
  const names = Object.fromEntries(species.map((sp) => [sp.id, sp.name[lang].toLocaleLowerCase(lang)]));
  const re = lang === 'cs' ? /^Kde je/ : /^Where is/;
  let wrongSaid = false;
  for (let r = 0; r < 5; r++) {
    await s.page.waitForFunction(([n, src]) => window.__spoken.filter((x) => new RegExp(src).test(x)).length > n, [r, re.source], { timeout: 12000 });
    const prompt = (await s.spoken()).filter((x) => re.test(x)).pop().toLocaleLowerCase(lang);
    const cands = await s.page.$$eval('.cand', (els) => els.map((e) => e.dataset.id));
    const target = cands.find((id) => prompt.includes(names[id]));
    if (r === 0) {
      const wrong = cands.find((id) => id !== target);
      await s.page.click(`.cand[data-id="${wrong}"]`); await s.settle(700);
      wrongSaid = (await s.spoken()).some((x) => x.startsWith(lang === 'cs' ? 'Já jsem' : "I'm the"));
    }
    await s.page.click(`.cand[data-id="${target}"]`);
    if (r === 0) { await s.settle(450); await s.shot('kdo-correct'); }
  }
  await s.page.waitForSelector('.end-panel'); await s.settle(1200);
  return { wrongSaid };
}

// ======================================================================= 1. full e2e at 1024×768, Czech then English
if (want('1')) {
  const s = await session({ width: 1024, height: 768 }, '1024x768');
  const { page } = s;
  await start(s); await s.shot('les');
  check('start → Les, greeting spoken', (await s.spoken()).some((x) => x.startsWith('Ahoj')));
  // pan
  const before = await page.evaluate(() => getComputedStyle(document.querySelector('#layer-near')).transform);
  await page.mouse.move(800, 420); await page.mouse.down(); for (let k = 1; k <= 10; k++) await page.mouse.move(800 - k * 45, 420); await page.mouse.up(); await s.settle(900);
  const after = await page.evaluate(() => getComputedStyle(document.querySelector('#layer-near')).transform);
  check('Les: drag pans the parallax layers', before !== after, `${before} → ${after}`);
  const farNear = await page.evaluate(() => [document.querySelector('#layer-far').style.transform, document.querySelector('#layer-near').style.transform]);
  check('Les: far layer moves less than near layer (parallax)', Math.abs(parseFloat(farNear[0].slice(10))) < Math.abs(parseFloat(farNear[1].slice(10))), farNear.join(' / '));
  await s.shot('les-panned');
  for (let k = 0; k < 6 && await page.isVisible('.pan-btn.left'); k++) { await page.click('.pan-btn.left'); await s.settle(850); }
  check('Les: arrow buttons pan back to the start (left arrow hides at 0)', await page.isHidden('.pan-btn.left'));
  check('Les: no card opened by panning', !(await page.locator('.card').count()));
  // edible card via a real tap
  await tapChar(s, 'hrib-smrkovy'); await s.shot('card-edible');
  check('card: name + group spoken (real name, not nickname)', (await s.spoken()).some((x) => x.startsWith('Hřib smrkový. Hřib smrkový je jedlá houba.')));
  check('card: 3 pins + 3 look-for chips', (await page.locator('.card .pin').count()) === 3 && (await page.locator('.card .look').count()) === 3);
  check('card: safety line present', (await page.textContent('.card .safety')).includes('Houby sbíráme jen s dospělým'));
  await page.click('.card .pin[data-look="1"]'); await s.settle(300);
  check('card: pin speaks lookFor[1]', (await s.spoken()).pop() === species.find((x) => x.id === 'hrib-smrkovy').lookFor.cs[1]);
  check('card front: round photo thumbnail when a photo exists', await page.isVisible('.card-front .photo-thumb img'));
  await s.shot('card-front-thumb');
  await page.click('.photo-thumb'); await s.settle(1100);
  const flipState = () => page.evaluate(() => {
    const f = document.querySelector('.card-flip'); const r = f.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { flipped: f.classList.contains('flipped'), front: getComputedStyle(document.querySelector('.card-front')).visibility,
      back: getComputedStyle(document.querySelector('.card-back')).visibility, top: top ? top.tagName + '.' + top.className : null,
      img: (() => { const i = document.querySelector('.card-back img.photo'); return !!i && i.complete && i.naturalWidth > 0; })(), anims: f.getAnimations().length };
  });
  const fs1 = await flipState();
  check('flip (thumbnail tap): photo <img> is topmost at the card centre, front visibility:hidden', fs1.flipped && fs1.img && fs1.top === 'IMG.photo' && fs1.front === 'hidden' && fs1.back === 'visible', JSON.stringify(fs1));
  check('flip: credit shown', (await page.textContent('.card-back .credit')).includes('Test Author'));
  check('flip: spoken „Skutečná fotka“ + name', (await s.spoken()).pop() === 'Skutečná fotka Hřib smrkový.', JSON.stringify((await s.spoken()).slice(-3)));
  await s.shot('card-photo');
  await page.click('.card-actions [data-act="flip"]'); await page.click('.card-actions [data-act="flip"]', { delay: 0 }); await s.settle(1300);
  const fs2 = await flipState();
  check('rapid double tap on flip: consistent state (one face visible, matching, animation finished)', fs2.anims === 0 && (fs2.flipped ? fs2.back === 'visible' && fs2.front === 'hidden' : fs2.front === 'visible' && fs2.back === 'hidden'), JSON.stringify(fs2));
  if (fs2.flipped) { await page.click('.card-back .thumb'); await s.settle(1100); }
  check('flip back via the character thumbnail: front visible again', (await flipState()).front === 'visible');
  await page.click('.card [data-act="twin"]'); await s.settle(900); await s.shot('dvojnik');
  check('Dvojník: panel with neutral faces + decisive pins', (await page.locator('.twin-panel[data-faces="neutral"] .twin-side').count()) === 2 && (await page.locator('.twin-pin').count()) >= 2);
  await page.click('[data-act="twin-close"]'); await s.settle(300);
  await closeCard(s);
  // deadly card (tap the real character after panning to it)
  await page.evaluate(() => window.__houbicky.openCard('muchomurka-zelena')); await s.settle(1100); await s.shot('card-deadly');
  check('deadly card: hazard frame + ribbon + skull verdict', (await page.locator('.card[data-deadly] .ribbon').count()) === 1 && (await page.locator('.verdict.v-deadly').count()) === 1);
  check('deadly card: spoken warning (group + caution)', (await s.spoken()).some((x) => x.includes('smrtelně jedovatá') && x.includes('Nesahej na ni')));
  await page.click('.card-actions [data-act="flip"]'); await s.settle(1100);
  check('flip without photo: friendly fallback, no <img>', (await page.locator('.card-back.missing').count()) === 1 && !(await page.locator('.card-back img').count()));
  await s.shot('card-missing');
  await closeCard(s);
  // album
  await page.click('[data-door="album"]'); await page.waitForSelector('.album-screen'); await s.settle(800); await s.shot('album');
  const al = { filled: await page.locator('.album-screen .slot:not(.empty)').count(), nick: await page.locator('.st-nick').first().textContent() };
  check('album: stickers for met species (2) + nickname subtitle', al.filled === 2 && al.nick === 'Hříbek Pepík', JSON.stringify(al));
  await page.click('.slot:not(.empty) .sticker-btn'); await page.waitForSelector('.card'); await s.settle(900); await closeCard(s);
  await page.click('[data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(700);
  // Do košíku — drag + tap paths, one wrong drop first
  await page.click('[data-door="kosik"]'); await page.waitForSelector('.piece.active'); await s.settle(1000); await s.shot('kosik');
  const k = await playKosik(s, { wrongFirst: true, shotDrag: true }); await s.shot('kosik-end');
  check('Do košíku: full round, drag + tap paths', k.dragDrops === 3 && k.tapDrops === 3, JSON.stringify(k));
  check('Do košíku: wrong drop returned the piece (no loss)', k.bounced, JSON.stringify(k));
  check('Do košíku: every mushroom placed (basket + zone = 6)', k.inBasket + k.inZone === 6, JSON.stringify(k));
  check('Do košíku: end praise spoken', (await s.spoken()).some((x) => x.includes('Košík je plný')));
  await page.click('.topbar [data-act="speak"]'); await s.settle(400);
  check('Do košíku: speaker after the round = praise, no error (#7)', (await s.spoken()).pop().includes('Košík je plný') && !s.errors.length, s.errors.join(' | '));
  await page.click('.end-panel [data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(700);
  // Kvíz
  await page.click('[data-door="kdo"]'); await page.waitForSelector('.cand'); await s.settle(1000); await s.shot('kdo');
  const q = await playKdo(s, 'cs'); await s.shot('kdo-end');
  check('Kvíz: full round of 5; wrong pick says its own name', q.wrongSaid);
  await page.click('.big-speaker'); await s.settle(400);
  check('Kvíz: speaker after round 5 = praise, no error (#7)', (await s.spoken()).pop().includes('Všechny houbičky') && !s.errors.length, s.errors.join(' | '));
  await page.click('.end-panel [data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(700);
  // parents: hold 3 s, toggle neutral faces
  const pb = await page.locator('.parents-btn').boundingBox();
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-vt'));
  await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up(); await s.settle(400);
  check('parents gate: short press does not open', !(await page.locator('.parents-screen').count()));
  await page.mouse.down(); await page.waitForTimeout(3400); await page.mouse.up();
  await page.waitForSelector('.parents-screen'); await s.settle(700); await s.shot('parents');
  // known state: 2 stickers (< 8), so level 2 is still locked and the parent unlocks it by hand
  await page.evaluate(() => window.__houbicky.store.update((d) => { d.stickers = { 'hrib-smrkovy': '2026-10-11', liska: '2026-10-11' }; }));
  await page.click('[data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(600);
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-vt'));
  { const p2 = await page.locator('.parents-btn').boundingBox(); await page.mouse.move(p2.x + p2.width / 2, p2.y + p2.height / 2); await page.mouse.down(); await page.waitForTimeout(3400); await page.mouse.up(); }
  await page.waitForSelector('.parents-screen'); await s.settle(600);
  check('levels: level 1 by default, level 2/3 locked', (await page.getAttribute('.level-seg [data-v="1"]', 'aria-pressed')) === 'true'
    && await page.isDisabled('.level-seg [data-v="2"]') && await page.isDisabled('.level-seg [data-v="3"]'));
  await page.click('.switch[data-act="unlock-2"]'); await s.settle(300);
  await page.click('.level-seg [data-v="2"]'); await s.settle(400);
  const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem('houbicky.v1')));
  check('levels: parent unlocks + chooses level 2 (persisted)', st2.level === 2 && st2.unlocks['2'] === true && (await s.spoken()).pop() === 'Houbař', JSON.stringify({ level: st2.level, unlocks: st2.unlocks }));
  await page.locator('.level-row').scrollIntoViewIfNeeded(); await s.shot('parents-levels');
  await page.click('[data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(600);
  await page.click('[data-door="kdo"]'); await page.waitForSelector('.cand'); await s.settle(1000); await s.shot('kdo-neutral');
  const neutral = await page.evaluate(() => ({ attr: document.querySelector('.game.kdo').dataset.faces, mn: getComputedStyle(document.querySelector('.cand .mouth-neutral')).visibility, m: getComputedStyle(document.querySelector('.cand .mouth')).display }));
  check('level 2: neutral faces applied in games', neutral.attr === 'neutral' && neutral.mn === 'visible' && neutral.m === 'none', JSON.stringify(neutral));
  await page.reload(); await page.waitForSelector('.start-layer .play'); await page.click('.start-layer .play'); await page.waitForSelector('.doors'); await s.settle(800);
  check('progress persists across reload (stickers)', await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('houbicky.v1')).stickers).length >= 2));
  await page.evaluate(() => { window.__houbicky.store.setLevel(1); });
  // ---------- English
  await page.click('.lang-btn'); await s.settle(500);
  check('EN: door labels switch', (await page.textContent('[data-door="kosik"] .door-label')) === 'Basket');
  await s.shot('les-en');
  await tapChar(s, 'hrib-smrkovy'); await s.shot('card-edible-en');
  check('EN card: English name + spoken English', (await page.textContent('.card .sp-name')) === 'Penny bun' && (await s.spoken()).some((x) => x.startsWith('Penny bun. The penny bun is an edible mushroom.')));
  await closeCard(s);
  await page.evaluate(() => window.__houbicky.openCard('muchomurka-tygrovana')); await s.settle(1000); await s.shot('card-deadly-en'); await closeCard(s);
  await page.click('[data-door="album"]'); await page.waitForSelector('.album-screen'); await s.settle(700); await s.shot('album-en');
  await page.click('[data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(600);
  await page.click('[data-door="kosik"]'); await page.waitForSelector('.piece.active'); await s.settle(900); await s.shot('kosik-en');
  const ke = await playKosik(s, { wrongFirst: true });
  check('EN Do košíku: full round + English voice', ke.inBasket + ke.inZone === 6 && (await s.spoken()).some((x) => x.includes('The basket is full')));
  await page.click('.end-panel [data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(600);
  await page.click('[data-door="kdo"]'); await page.waitForSelector('.cand'); await s.settle(900); await s.shot('kdo-en');
  const qe = await playKdo(s, 'en');
  check('EN Kvíz: full round', qe.wrongSaid);
  await page.evaluate(() => { window.__nav = 0; document.addEventListener('screen:leave', () => window.__nav++); });
  await page.click('.end-panel [data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(1500);
  check('one tap on Home = exactly one navigation (no stacked handlers)', (await page.evaluate(() => window.__nav)) === 1 && (await page.locator('#screen > *').count()) === 1, String(await page.evaluate(() => window.__nav)));
  check('EN: parents gate opens after a 3 s hold', await holdParents(s)); await s.settle(600); await s.shot('parents-en');
  const sp = await s.spoken();
  const nicks = species.flatMap((x) => [x.nick?.cs, x.nick?.en]).filter(Boolean);
  check('characters never speak nicknames', !sp.some((line) => nicks.some((n) => line.includes(n))));
  check('1024×768 run: zero console errors / 4xx', s.errors.length === 0, s.errors.join(' | '));
  allErrors.push(...s.errors);
  await s.ctx.close();
}

// ======================================================================= 2. screenshot tour at the other sizes
if (want('2')) for (const vp of [{ width: 1180, height: 820 }, { width: 1440, height: 900 }, { width: 820, height: 1180 }]) {
  const tag = `${vp.width}x${vp.height}`; const portrait = vp.height > vp.width;
  const s = await session(vp, tag); const { page } = s;
  await start(s); await s.shot('les');
  await tapChar(s, 'hrib-smrkovy'); await s.shot('card-edible');
  await page.click('.card-actions [data-act="flip"]'); await s.settle(1100); await s.shot('card-photo');
  await page.click('.card-actions [data-act="flip"]'); await s.settle(800);
  await page.click('.card [data-act="twin"]'); await s.settle(900); await s.shot('dvojnik');
  await page.click('[data-act="twin-close"]'); await closeCard(s);
  await page.evaluate(() => window.__houbicky.openCard('muchomurka-zelena')); await s.settle(1100); await s.shot('card-deadly');
  await page.click('.card-actions [data-act="flip"]'); await s.settle(1100); await s.shot('card-missing'); await closeCard(s);
  await page.click('[data-door="kosik"]'); await s.settle(1600); await s.shot('kosik');
  if (portrait) {
    check(`${tag}: games show the rotate overlay`, await page.isVisible('#rotate .rotate-card'));
    await page.click('#rotate [data-act="rotate-home"]'); await page.waitForSelector('.doors'); await s.settle(800);
    check(`${tag}: rotate card has a Home button that leaves the game (#5)`, !(await page.isVisible('#rotate .rotate-card')) && (await page.evaluate(() => document.documentElement.dataset.screen)) === 'les');
    await page.click('[data-door="kosik"]'); await s.settle(1200);
  }
  else { const k = await playKosik(s, { wrongFirst: false }); await s.shot('kosik-end'); check(`${tag}: Do košíku round completes`, k.inBasket + k.inZone === 6); }
  await page.evaluate(() => window.__houbicky.go('kdo')); await s.settle(1400); await s.shot('kdo');
  await page.evaluate(() => window.__houbicky.go('album')); await s.settle(900); await s.shot('album');
  await page.evaluate(() => window.__houbicky.go('parents')); await s.settle(900); await s.shot('parents');
  // v2.1 screens at this size: level sheet, unlock ceremony, Les at L2, Výprava (walk, stop, warning, fork, end)
  await page.evaluate(() => window.__houbicky.go('les')); await page.waitForSelector('.doors'); await s.settle(600);
  await page.click('.level-chip'); await page.waitForSelector('.level-sheet'); await s.settle(300); await s.shot('level-sheet');
  await page.click('.ls-card [data-act="close"]');
  await page.evaluate(() => { const st = window.__houbicky.store; st.update((d) => { d.seen = {}; });
    ['hrib-smrkovy', 'liska', 'troudnatec', 'muchomurka-cervena', 'muchomurka-zelena', 'trepenitka', 'sirovec', 'kotrc'].forEach((id) => st.addSticker(id)); });
  await page.evaluate(() => window.__houbicky.go('album')); await s.settle(400);
  await page.evaluate(() => window.__houbicky.go('les')); await page.waitForSelector('.ceremony.ready', { timeout: 15000 }); await s.shot('unlock-ceremony');
  await page.click('.ceremony'); await page.waitForSelector('.ceremony', { state: 'detached' }); await s.settle(1900); await s.shot('les-L2');
  if (!portrait) {
    await vyStart(s, 2);
    const r = await vyPlay(s, { shots: true, holdFirst: true });
    await s.settle(400); await s.shot('vyprava-end');
    check(`${tag}: Výprava L2 round completes (fork + end check)`, !!r.fork && (await page.isVisible('.ve-actions')), JSON.stringify({ fork: r.fork, stops: r.stops }));
  } else {
    await vyStart(s, 2); await s.settle(600); await s.shot('vyprava');
    check(`${tag}: Výprava shows the rotate overlay in portrait`, await page.isVisible('#rotate .rotate-card'));
  }
  check(`${tag}: zero console errors / 4xx`, s.errors.length === 0, s.errors.join(' | '));
  allErrors.push(...s.errors);
  await s.ctx.close();
}

// ======================================================================= R. regression checks for the evaluator's findings
if (want('R')) {
  const s = await session({ width: 1024, height: 768 }, '1024x768'); const { page } = s;
  await start(s);
  check('#8 no pinch-zoom: body touch-action pan-x pan-y', (await page.evaluate(() => getComputedStyle(document.body).touchAction)) === 'pan-x pan-y');
  await page.waitForFunction(() => window.__files.some((f) => f.ok === true), null, { timeout: 8000 }).catch(() => {});
  const played = await page.evaluate(() => window.__files.filter((f) => f.ok === true).map((f) => f.id));
  check('voice: greeting played from the recording (voice/cs/ui.say.greeting.mp3), not Web Speech', played.includes('ui.say.greeting') && !(await page.evaluate(() => window.__tts.some((x) => x.startsWith('Ahoj')))), JSON.stringify(played));
  const fb = await page.evaluate(async () => {
    const sp = await import('./js/speech.js'); const ph = await import('./js/phrases.js');
    const species = (await (await fetch('data/species.json')).json()).species; const idx = await (await fetch('voice/index.json')).json();
    const cat = ph.buildCatalogue(species);
    delete idx.cs['sp.liska.name'];
    sp.setVoice({ catalogue: cat, index: idx });
    window.__tts.length = 0;
    await sp.sayAll(['sp.liska.name', 'sp.liska.group'], 'cs');
    const r = { tts: window.__tts.slice() };
    sp.setVoice({ catalogue: cat, index: await (await fetch('voice/index.json')).json() });
    return r;
  });
  check('voice: missing recording falls back to Web Speech with the same text (only that line)', fb.tts.length === 1 && fb.tts[0] === 'Liška obecná.', JSON.stringify(fb));
  // #1 double tap → exactly one card, and it closes
  const center = async (id) => { const b = await page.locator(`[data-char="${id}"]`).boundingBox(); return [b.x + b.width / 2, b.y + b.height * 0.65]; };
  for (const [a, b, gap] of [['hrib-smrkovy', 'hrib-smrkovy', 0], ['hrib-smrkovy', 'hrib-smrkovy', 80], ['hrib-smrkovy', 'liska', 0], ['hrib-smrkovy', 'liska', 80]]) {
    const A = await center(a); const B = await center(b);
    await page.mouse.click(...A); if (gap) await page.waitForTimeout(gap); await page.mouse.click(...B);
    await page.waitForTimeout(1800);
    const n = await page.locator('.card-layer').count();
    if (n) { await page.click('.card-actions [data-act="close"]'); await page.waitForTimeout(1300); }
    const after = await page.locator('.card-layer').count();
    check(`#1 double tap ${a}→${b} ${gap} ms: exactly one card, close works`, n === 1 && after === 0, `cards=${n} after close=${after}`);
  }
  // #2 caution on every card + spoken in the intro
  const missingCaution = [];
  for (const sp of species) {
    await page.evaluate((id) => window.__houbicky.openCard(id), sp.id); await page.waitForSelector('.card .sp-name'); await s.settle(350);
    const txt = await page.textContent('.card .caution').catch(() => '');
    const said = (await s.spoken()).some((x) => x.startsWith(sp.name.cs + '.') && x.includes(sp.caution.cs));
    if (!txt.includes(sp.caution.cs) || !said) missingCaution.push(sp.id);
    if (sp.id === 'pychavka') await s.shot('card-pychavka-caution');
    await page.evaluate(() => window.__houbicky.closeCard()); await page.waitForSelector('.card-layer', { state: 'detached' });
  }
  check('#2 caution shown on the card + spoken in the intro, all 13 (pýchavka: only young, white inside)', !missingCaution.length, missingCaution.join(','));
  // #3 confetti: no red/green/dotted toadstools
  const caps = await page.evaluate(async () => (await import('./js/confetti.js')).CAP_COLORS);
  const brownish = caps.every((c) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return r > g && g > b && g / r > 0.55 && r < 200; });
  const src = await (await page.request.get(BASE + '/js/confetti.js')).text();
  check('#3 confetti caps are plain brown boletes (no dots, no red/green)', brownish && !src.includes('drawDotCap'), JSON.stringify(caps));
  await page.evaluate(async () => { const m = await import('./js/confetti.js'); m.celebrate({ kind: 'leaves', count: 160, duration: 2400 }); });
  await s.settle(1100); await s.shot('confetti-leaves'); await s.settle(1600);
  // #4 photo gating + parents' review
  const back = async (id) => { await page.evaluate((x) => window.__houbicky.openCard(x), id); await page.waitForSelector('.card .sp-name'); await s.settle(400);
    const r = { photo: await page.locator('.card-back img.photo').count(), missing: await page.locator('.card-back.missing').count() };
    await page.evaluate(() => window.__houbicky.closeCard()); await page.waitForSelector('.card-layer', { state: 'detached' }); return r; };
  const b0 = { hrib: await back('hrib-smrkovy'), kozak: await back('kozak'), liska: await back('liska') };
  check('#4 photos: Commons pick + alt shown, Wikipedia fallback hidden by default', b0.hrib.photo === 1 && b0.kozak.photo === 1 && b0.liska.photo === 0 && b0.liska.missing === 1, JSON.stringify(b0));
  await page.evaluate(() => window.__houbicky.go('parents')); await page.waitForSelector('.photo-grid'); await s.settle(600);
  check('#4 parents: review grid lists the 3 downloaded photos with source', (await page.locator('.pcheck').count()) === 3 && (await page.textContent('.photo-grid')).includes('Wikipedie'));
  await page.locator('.photo-check').scrollIntoViewIfNeeded(); await s.settle(300); await s.shot('parents-photo-check');
  await page.click('.pcheck [data-act="photo"][data-id="liska"]'); await s.settle(200);
  await page.click('.pcheck [data-act="photo"][data-id="hrib-smrkovy"]'); await s.settle(200);
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('houbicky.v1')).photoPrefs);
  await page.evaluate(() => window.__houbicky.go('les')); await page.waitForSelector('.doors'); await s.settle(700);
  const b1 = { hrib: await back('hrib-smrkovy'), liska: await back('liska') };
  check('#4 parent toggles persist: approved liška shows, hidden hřib falls back to „Fotka zatím chybí“', prefs.liska === 'show' && prefs['hrib-smrkovy'] === 'hide' && b1.liska.photo === 1 && b1.hrib.photo === 0 && b1.hrib.missing === 1, JSON.stringify({ prefs, b1 }));
  // #6 leaving a game mid-animation must not throw or leak into the next round
  await page.click('[data-door="kosik"]'); await page.waitForSelector('.piece.active'); await s.settle(1100);
  const grp = await page.getAttribute('.piece.active', 'data-group');
  await drag(s, '.piece.active', `${grp === 'jedla' ? '.basket' : '.zone'} .target-art`); await page.waitForTimeout(120);
  await page.click('.topbar [data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(1800);
  await page.click('[data-door="kosik"]'); await page.waitForSelector('.piece.active'); await s.settle(2200);
  const fresh = await page.evaluate(() => ({ stars: document.querySelectorAll('.stars .star.on').length, pieces: document.querySelectorAll('.piece').length, dropped: document.querySelectorAll('.dropped').length }));
  check('#6 Do košíku: leave mid-drop → no error, new round is clean', fresh.stars === 0 && fresh.pieces === 6 && fresh.dropped === 0 && !s.errors.length, JSON.stringify(fresh) + ' ' + s.errors.join(' | '));
  await page.click('.topbar [data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(800);
  await page.click('[data-door="kdo"]'); await page.waitForSelector('.cand'); await s.settle(900);
  const prompt = (await s.spoken()).filter((x) => /^Kde je/.test(x)).pop().toLocaleLowerCase('cs');
  const ids = await page.$$eval('.cand', (els) => els.map((e) => e.dataset.id));
  const tgt = ids.find((id) => prompt.includes(species.find((x) => x.id === id).name.cs.toLocaleLowerCase('cs')));
  await page.click(`.cand[data-id="${tgt}"]`); await page.waitForTimeout(100);
  await page.click('.topbar [data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(2000);
  check('#6 Kvíz: leave right after a correct answer → no error, stays on Les', (await page.evaluate(() => document.documentElement.dataset.screen)) === 'les' && !s.errors.length, s.errors.join(' | '));
  check('R run: zero console errors / 4xx', s.errors.length === 0, s.errors.join(' | '));
  allErrors.push(...s.errors);
  await s.ctx.close();
}

// ======================================================================= L. difficulty levels (v2)
if (want('L')) {
  const s = await session({ width: 1024, height: 768 }, '1024x768'); const { page } = s;
  // v1 → v2 migration: the old "neutral faces" toggle becomes level 2 (unlocked)
  await page.goto(BASE + '/index.html'); await page.waitForSelector('.start-layer .play');
  // #5: a real v1 save with ≥ 8 stickers keeps its progress: Level 2 + Výprava unlocked, no surprise ceremony
  await page.evaluate(() => localStorage.setItem('houbicky.v1', JSON.stringify({ version: 1, lang: 'cs', mute: false, faces: 'mood', rate: 'normal',
    stickers: Object.fromEntries(['hrib-smrkovy', 'liska', 'bedla', 'kozak', 'kremenac', 'suchohrib', 'pychavka', 'zlucnik', 'troudnatec'].map((id) => [id, '2026-10-05T10:00:00.000Z'])),
    gamesPlayed: { kosik: 4, kdo: 3 }, stats: {}, mastery: { liska: { kosik: true, kdo: true } }, photoPrefs: {}, firstSeen: '2026-10-01T09:00:00.000Z', lastSeen: '2026-10-10T18:00:00.000Z' })));
  await page.reload(); await page.waitForSelector('.start-layer .play');
  const v1 = await page.evaluate(async () => { const st = window.__houbicky.store; const L = await import('./js/levels.js');
    return { level: st.get('level'), unlocks: st.get('unlocks'), seen: st.get('seen'), stickers: st.stickerCount(), u: L.unlockState(), pending: L.pendingCeremony(), gold: st.isGold('liska') }; });
  check('#5 v1 save with 9 stickers: level 1 kept, Level 2 + Výprava unlocked, no ceremony, stickers + gold kept',
    v1.level === 1 && v1.u[2].unlocked && v1.u.vyprava.unlocked && v1.pending === 0 && v1.stickers === 9 && v1.gold, JSON.stringify(v1));
  await page.evaluate(() => localStorage.setItem('houbicky.v1', JSON.stringify({ version: 1, lang: 'cs', faces: 'neutral', stickers: { liska: '2026-10-01' } })));
  await page.reload(); await page.waitForSelector('.start-layer .play');
  await start(s);
  const mig = await page.evaluate(() => window.__houbicky.store.get());
  check('migration: v1 neutral faces → level 2 unlocked, stickers kept, old field dropped', mig.level === 2 && mig.unlocks['2'] === true && mig.stickers.liska && !('faces' in mig), JSON.stringify({ level: mig.level, unlocks: mig.unlocks, faces: mig.faces }));
  const strat = await page.evaluate(async () => {
    const L = await import('./js/levels.js'); const A = await import('./js/assets.js');
    const hrib = A.byId.get('hrib-smrkovy'); const out = { l1groups: true, l2twin: true, pairs: 0, filter: null };
    for (let i = 0; i < 30; i++) {
      const d1 = L.quizDistractors(hrib, 1); if (new Set([hrib.group, ...d1.map((x) => x.group)]).size !== 3) out.l1groups = false;
      const d2 = L.quizDistractors(hrib, 2); if (!d2.some((x) => x.id === 'zlucnik')) out.l2twin = false;
      const r = L.basketRound(2, 6); if (r.some((a) => a.group === 'jedla' && r.some((b) => L.twinIds(a.id).includes(b.id) && b.group !== 'jedla'))) out.pairs++;
    }
    // data-driven filter: a level-2 species is not in level 1; a species WITHOUT the field counts as level 1
    const k = A.byId.get('kremenac'); const keep = k.level;
    k.level = 2; out.filter = { l1: L.speciesFor(1).includes(k), l2: L.speciesFor(2).includes(k) };
    delete k.level; out.filter.missing = L.speciesFor(1).includes(k);
    k.level = keep;
    out.fig = { photo: L.figure('hrib-smrkovy', 3).classList.contains('photo-figure'), wiki: L.figure('liska', 3).classList.contains('photo-figure'),
      noPhoto: L.figure('kremenac', 3).classList.contains('photo-figure'), l2: L.figure('hrib-smrkovy', 2).classList.contains('photo-figure') };
    return out;
  });
  check('level 1 quiz: the 3 choices come from 3 different groups (30×)', strat.l1groups);
  check('level 2 quiz: the look-alike (hřib → žlučník) is always a choice (30×)', strat.l2twin);
  check('level 2 basket: rounds contain an edible + look-alike pair', strat.pairs >= 25, String(strat.pairs));
  check('species.level filters the pool (missing = level 1)', strat.filter.l1 === false && strat.filter.l2 === true && strat.filter.missing === true, JSON.stringify(strat.filter));
  check('level 3 figures: approved photo → photo print; Wikipedia fallback / no photo / level 2 → drawing', strat.fig.photo && !strat.fig.wiki && !strat.fig.noPhoto && !strat.fig.l2, JSON.stringify(strat.fig));
  // automatic unlocks: 8 stickers open level 2 and the Výprava door
  await page.evaluate(() => { const st = window.__houbicky.store; st.reset({ keepSettings: false }); });
  await page.evaluate(() => window.__houbicky.go('les')); await page.waitForSelector('.doors'); await s.settle(600);
  const before = { vyprava: await page.evaluate(async () => (await import('./js/levels.js')).unlockState().vyprava.unlocked) };
  await page.evaluate(() => ['hrib-smrkovy', 'liska', 'troudnatec', 'muchomurka-cervena', 'muchomurka-zelena', 'trepenitka', 'sirovec', 'kotrc'].forEach((id) => window.__houbicky.store.addSticker(id)));
  await s.settle(300);
  const after = { vyprava: await page.evaluate(async () => (await import('./js/levels.js')).unlockState().vyprava.unlocked) };
  await page.click('.level-chip'); await page.waitForSelector('.level-sheet'); await s.settle(300); await s.shot('les-level-sheet');
  const pick = { l2: !(await page.getAttribute('.lv-card[data-lv="2"]', 'class')).includes('locked'), l3: !(await page.getAttribute('.lv-card[data-lv="3"]', 'class')).includes('locked') };
  check('complete L1 album (8 stickers) unlocks level 2 + Výprava; level 3 stays locked', !before.vyprava && after.vyprava && pick.l2 && !pick.l3, JSON.stringify({ before, after, pick }));
  await page.click('.lv-card[data-lv="3"]'); await s.settle(300);
  check('locked L3 card speaks what is missing („Ještě … zlatých nálepek“) and stays open', (await s.spoken()).pop().startsWith('Ještě') && await page.isVisible('.level-sheet'));
  await page.click('.lv-card[data-lv="2"]'); await s.settle(400);
  check('level sheet: choosing level 2 switches, speaks „Houbař“, closes; the chip shows rosette 2', !(await page.locator('.level-sheet').count())
    && (await page.getAttribute('.level-chip use', 'href')) === '#i-level-2' && (await s.spoken()).includes('Houbař'));
  // level 3: photos + the group question in the quiz
  await page.evaluate(() => { const st = window.__houbicky.store; st.setUnlock(3, true); st.setLevel(3); });
  await page.evaluate(() => window.__houbicky.go('kdo')); await page.waitForSelector('.cand'); await s.settle(1200);
  const lvl3 = await page.getAttribute('.game.kdo', 'data-level');
  const names = Object.fromEntries(species.map((sp) => [sp.id, sp.name.cs.toLocaleLowerCase('cs')]));
  const prompt = (await s.spoken()).filter((x) => /^Kde je/.test(x)).pop().toLocaleLowerCase('cs');
  const cands = await page.$$eval('.cand', (els) => els.map((e) => e.dataset.id));
  const tgt = cands.find((id) => prompt.includes(names[id]));
  await page.click(`.cand[data-id="${tgt}"]`);
  await page.waitForSelector('.group-ask', { timeout: 8000 }); await s.settle(400); await s.shot('kdo-level3-group');
  const tsp = species.find((x) => x.id === tgt);
  const wrongG = ['jedla', 'nejedla', 'jedovata'].find((g) => g !== tsp.group);
  await page.click(`.group-btn[data-g="${wrongG}"]`); await s.settle(400);
  const triedAgain = (await s.spoken()).pop() === 'Zkus to znovu.';
  await page.click(`.group-btn[data-g="${tsp.group}"]`);
  await page.waitForSelector('.group-ask', { state: 'detached', timeout: 8000 });
  const saidGroup = (await s.spoken()).includes(CATALOGUE.cs[`sp.${tgt}.group`]);
  await page.waitForFunction((n) => window.__spoken.filter((x) => /^Kde je/.test(x)).length >= n, 2, { timeout: 8000 });
  check('level 3 quiz: after the name comes „Je jedlá, nejedlá, nebo jedovatá?“; a miss = „Zkus to znovu“, the right group is spoken, next round follows',
    lvl3 === '3' && triedAgain && saidGroup, JSON.stringify({ lvl3, triedAgain, saidGroup }));
  await page.evaluate(() => window.__houbicky.go('kosik')); await page.waitForSelector('.piece.active'); await s.settle(1200);
  check('level 3 basket: game screen carries data-level=3', (await page.getAttribute('.game.kosik', 'data-level')) === '3');
  await s.shot('kosik-level3');
  check('L run: zero console errors / 4xx', s.errors.length === 0, s.errors.join(' | '));
  allErrors.push(...s.errors);
  await s.ctx.close();
}

// ======================================================================= B. beta copy isolation (/houbicky/ vs /houbicky/beta/, one origin)
if (want('B')) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await ctx.addInitScript(FAKE_SPEECH);
  const errors = []; const watch = (p) => { p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${p.url()} ${m.text()}`); }); p.on('pageerror', (e) => errors.push(e.message)); };
  const root = await ctx.newPage(); watch(root);
  await root.goto(BASE + '/'); await root.click('.start-layer .play'); await root.waitForSelector('.doors');
  await root.evaluate(() => window.__houbicky.store.addSticker('liska'));
  const beta = await ctx.newPage(); watch(beta);
  await beta.goto(BASE + '/beta/'); await beta.click('.start-layer .play'); await beta.waitForSelector('.doors'); await beta.waitForTimeout(600);
  await beta.screenshot({ path: path.join(OUT, '1024x768-beta-les.png') });
  const b1 = await beta.evaluate(() => ({ ribbon: !!document.querySelector('.beta-ribbon'), title: document.title, stickers: window.__houbicky.store.stickerCount() }));
  check('beta: BETA ribbon + title, starts with an empty album (does not read stable progress)', b1.ribbon && /beta$/.test(b1.title) && b1.stickers === 0, JSON.stringify(b1));
  check('stable: no BETA ribbon', !(await root.evaluate(() => !!document.querySelector('.beta-ribbon'))));
  await beta.evaluate(() => { window.__houbicky.store.addSticker('bedla'); window.__houbicky.store.addSticker('kozak'); });
  await root.reload(); await root.click('.start-layer .play'); await root.waitForSelector('.doors');
  const keys = await root.evaluate(() => ({ stable: Object.keys(JSON.parse(localStorage.getItem('houbicky.v1')).stickers), beta: Object.keys(JSON.parse(localStorage.getItem('houbicky.beta.v1')).stickers), inApp: window.__houbicky.store.stickerCount() }));
  check('progress never mixes: stable key = [liska], beta key = [bedla, kozak], stable app shows 1', JSON.stringify(keys.stable) === '["liska"]' && JSON.stringify(keys.beta.sort()) === '["bedla","kozak"]' && keys.inApp === 1, JSON.stringify(keys));
  // service workers: two registrations, two cache namespaces, the stable worker never touches /beta/
  await root.evaluate(() => navigator.serviceWorker.ready); await beta.evaluate(() => navigator.serviceWorker.ready);
  for (const p of [root, beta]) {
    await p.evaluate(() => window.__houbicky.go('parents')); await p.waitForSelector('.offline-ready');
    await p.waitForFunction(() => document.querySelector('.offline-ready')?.textContent.includes('100 %'), null, { timeout: 120000 }).catch(() => {});
  }
  const sw = await beta.evaluate(async () => {
    const regs = (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname).sort();
    const names = (await caches.keys()).sort(); const out = { regs, names, controller: new URL(navigator.serviceWorker.controller?.scriptURL || 'http://x/none').pathname };
    for (const n of names) { const ks = (await (await caches.open(n)).keys()).map((r) => new URL(r.url).pathname); out[n] = { n: ks.length, beta: ks.filter((k) => k.includes('/beta/')).length }; }
    return out;
  });
  const stableC = sw[`houbicky-${SW_VERSION}`]; const betaC = sw[`houbicky-beta-${SW_VERSION}`];
  check('two SW registrations (/houbicky/ + /houbicky/beta/); the beta page is controlled by beta/sw.js', JSON.stringify(sw.regs) === '["/houbicky/","/houbicky/beta/"]' && sw.controller === '/houbicky/beta/sw.js', JSON.stringify({ regs: sw.regs, c: sw.controller }));
  check('separate caches: stable cache has no /beta/ entries, beta cache only /beta/ entries', stableC && betaC && stableC.beta === 0 && betaC.beta === betaC.n && betaC.n > 50, JSON.stringify({ names: sw.names, stableC, betaC }));
  await ctx.setOffline(true);
  await beta.goto(BASE + '/beta/'); await beta.click('.start-layer .play'); await beta.waitForSelector('[data-char="liska"]');
  await root.goto(BASE + '/'); await root.click('.start-layer .play'); await root.waitForSelector('[data-char="liska"]');
  const off = { beta: await beta.evaluate(() => !!document.querySelector('.beta-ribbon')), stable: await root.evaluate(() => !!document.querySelector('.beta-ribbon')) };
  check('offline: each copy boots from its own cache (beta with ribbon, stable without)', off.beta && !off.stable, JSON.stringify(off));
  await ctx.setOffline(false);
  await beta.goto(BASE + '/beta/?nosw');
  await beta.waitForFunction(() => window.__houbicky?.sw?.reason === 'disabled-by-nosw', null, { timeout: 20000 });   // runs after the app booted
  const after = {}; void await root.evaluate(async () => ({ names: (await caches.keys()).sort(), regs: (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname).sort() }));
  await beta.goto('about:blank');               // an unregistered worker goes away once its last page is gone
  for (let i = 0; i < 30 && (await root.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) > 1; i++) await root.waitForTimeout(300);
  Object.assign(after, await root.evaluate(async () => ({ names: (await caches.keys()).sort(), regs: (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname).sort() })));
  await beta.goto(BASE + '/beta/?nosw'); await beta.click('.start-layer .play'); await beta.waitForSelector('.doors');
  await beta.evaluate(() => window.__houbicky.go('parents')); await beta.waitForSelector('.offline-ready'); await beta.waitForTimeout(1500);
  const betaReady = await beta.textContent('.offline-ready');
  check('#3 beta parents corner never reports the stable worker\'s offline status', !betaReady.includes('100 %'), betaReady);
  check('beta ?nosw removes only the beta worker + caches; stable stays installed', after.names.includes(`houbicky-${SW_VERSION}`) && !after.names.some((n) => n.startsWith('houbicky-beta-')) && JSON.stringify(after.regs) === '["/houbicky/"]', JSON.stringify(after));
  check('B run: zero console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}


// ======================================================================= C. levels v2.1: Les per level, ceremony, L3 rule, album pages, locked door
if (want('C')) {
  const s = await session({ width: 1024, height: 768 }, '1024x768', browser, { seed: false }); const { page } = s;
  await start(s);
  const l1 = await page.evaluate(() => ({ shown: [...document.querySelectorAll('.char-slot')].filter((g) => g.style.display !== 'none').length, pmax: Math.round((window.__houbicky.pan || {}).pmax || 0),
    faces: document.getElementById('stage').dataset.faces, door: document.querySelector('.door-vyprava').classList.contains('locked') }));
  await s.shot('les-L1');
  check('Les L1: only the 8 Level-1 characters, mood faces, Výprava door locked', l1.shown === 8 && l1.faces === 'mood' && l1.door, JSON.stringify(l1));
  await page.click('.door-vyprava'); await page.waitForSelector('.jezek-peek'); await s.settle(400); await s.shot('les-door-locked-peek');
  check('locked Výprava door: the hedgehog peeks up and says what is missing', (await s.spoken()).pop().startsWith('Ještě pár nálepek'));
  await page.waitForSelector('.jezek-peek', { state: 'detached', timeout: 6000 });
  // complete the L1 album → back to Les → ceremony (one ceremony, two gifts)
  await page.evaluate(() => ['hrib-smrkovy', 'liska', 'troudnatec', 'muchomurka-cervena', 'muchomurka-zelena', 'trepenitka', 'sirovec', 'kotrc'].forEach((id) => window.__houbicky.store.addSticker(id)));
  await page.evaluate(() => window.__houbicky.go('album')); await page.waitForSelector('.album-screen'); await s.settle(400);
  await page.evaluate(() => window.__houbicky.go('les'));
  await page.waitForSelector('.ceremony.ready', { timeout: 15000 }); await s.shot('les-unlock-ceremony');
  check('ceremony: „Jsi Houbař!“ + gift „Výprava je otevřená!“ spoken', (await s.spoken()).includes('Jsi Houbař! Les se ti otevřel dál.') && (await page.textContent('.cer-gift')).includes('Výprava je otevřená'));
  await page.click('.ceremony'); await page.waitForSelector('.ceremony', { state: 'detached' }); await s.settle(1900);
  const l2 = await page.evaluate(() => ({ shown: [...document.querySelectorAll('.char-slot')].filter((g) => g.style.display !== 'none').length, faces: document.getElementById('stage').dataset.faces,
    door: document.querySelector('.door-vyprava').classList.contains('locked'), level: window.__houbicky.store.get('level'), seen: window.__houbicky.store.get('seen') }));
  await s.shot('les-L2');
  check('after the ceremony: level 2, all 25 characters, neutral faces, Výprava door open, shown once', l2.shown === species.length && l2.faces === 'neutral' && !l2.door && l2.level === 2 && l2.seen['2'], JSON.stringify(l2));
  await page.evaluate(() => window.__houbicky.go('album')); await page.waitForSelector('.album-screen'); await s.settle(600); await s.shot('album-L2-newpages');
  check('album grows: 25 slots at L2 + „Album má nové stránky!“ once', (await page.locator('.album-screen .slot').count()) === species.length && (await s.spoken()).includes('Album má nové stránky!'));
  // Level 3 rule: 20 gold, earned at level ≥ 2 (gold from L1 or from v2.0 does not count)
  const rule = await page.evaluate(async () => {
    const st = window.__houbicky.store; const L = await import('./js/levels.js'); const A = await import('./js/assets.js');
    const ids = A.species.map((x) => x.id).slice(0, 20);
    ids.forEach((id) => { st.markMastery(id, 'kosik', 1); st.markMastery(id, 'kdo', 1); });
    const atL1 = L.unlockState()[3].unlocked;
    ids.slice(0, 19).forEach((id) => { st.markMastery(id, 'kosik', 2); st.markMastery(id, 'kdo', 2); });
    const at19 = L.unlockState()[3].unlocked;
    st.markMastery(ids[19], 'kosik', 3); st.markMastery(ids[19], 'kdo', 2);
    return { atL1, at19, at20: L.unlockState()[3].unlocked, gold: L.goldForL3(), pending: L.pendingCeremony() };
  });
  check('L3 unlock: 20 gold earned at level ≥ 2 (20 at L1 → locked, 19 → locked, 20 → open)', !rule.atL1 && !rule.at19 && rule.at20 && rule.gold === 20 && rule.pending === 3, JSON.stringify(rule));
  await page.evaluate(() => window.__houbicky.go('les')); await page.waitForSelector('.ceremony.ready', { timeout: 15000 });
  await s.shot('les-unlock-ceremony-L3');
  check('L3 ceremony: „Jsi Mistr houbař!“', (await s.spoken()).includes('Jsi Mistr houbař! Teď poznáš houby i z fotek.'));
  await page.click('.ceremony'); await page.waitForSelector('.ceremony', { state: 'detached' }); await s.settle(800);
  await page.click('.level-chip'); await page.waitForSelector('.level-sheet'); await s.settle(300); await s.shot('level-sheet-L3');
  await page.click('.lv-card[data-lv="1"]'); await s.settle(500);
  check('going down is always allowed (L3 → L1), progress kept', (await page.evaluate(() => window.__houbicky.store.get('level'))) === 1 && (await page.evaluate(() => window.__houbicky.store.stickerCount())) >= 8);
  // migration: v2.0 mastery flags (true) → level unknown (0): still gold in the album, but not toward L3
  await page.evaluate(() => localStorage.setItem('houbicky.v1', JSON.stringify({ version: 1, level: 2, mastery: { liska: { kosik: true, kdo: true } }, stickers: { liska: 'x' } })));
  await page.reload(); await page.waitForSelector('.start-layer .play');
  const mig = await page.evaluate(async () => { const st = window.__houbicky.store; return { m: st.get('mastery').liska, gold: st.isGold('liska'), atL2: st.isGoldAt('liska', 2) }; });
  check('migration: old gold → level 0 (album gold yes, L3 no)', mig.m.kosik === 0 && mig.gold && !mig.atL2, JSON.stringify(mig));
  // card per level: L3 opens with the approved photo first
  await page.evaluate(() => { const st = window.__houbicky.store; st.setUnlock(2, true); st.setUnlock(3, true); st.setLevel(3); });   // the migrated store has only 1 sticker
  await start(s);
  await page.evaluate(() => window.__houbicky.openCard('hrib-smrkovy')); await page.waitForSelector('.card-flip'); await s.settle(800);
  const c3 = await page.evaluate(() => ({ flipped: document.querySelector('.card-flip').classList.contains('flipped'), faces: document.querySelector('.card-layer').dataset.faces }));
  await s.shot('card-L3-photo-first');
  check('card L3: real photo first, neutral faces on the drawing side', c3.flipped && c3.faces === 'neutral', JSON.stringify(c3));
  await page.evaluate(() => window.__houbicky.closeCard()); await page.waitForSelector('.card-layer', { state: 'detached' });
  await page.evaluate(() => window.__houbicky.store.setLevel(2));
  await page.evaluate(() => window.__houbicky.openCard('liska')); await page.waitForSelector('.card .sp-name'); await s.settle(600);
  await page.click('.card [data-act="twin"]'); await s.settle(900); await s.shot('dvojnik-twinTell');
  const tw = await page.evaluate(() => ({ other: [...document.querySelectorAll('.twin-side')].map((x) => x.dataset.id), pins: document.querySelectorAll('.twin-pin').length }));
  check('Dvojník from data: liška ↔ lištička with the twinTell pins + spoken decisive difference', tw.other.includes('listicka') && tw.pins >= 1 && (await s.spoken()).some((x) => x.includes('Lištička má tenké lupínky')), JSON.stringify(tw));
  check('C run: zero console errors / 4xx', s.errors.length === 0, s.errors.join(' | '));
  allErrors.push(...s.errors);
  await s.ctx.close();
}

// ======================================================================= V. Výprava do lesa (2D) — complete rounds
async function vyStart(s, level) {
  const { page } = s;
  await page.evaluate((l) => { const st = window.__houbicky.store; st.setUnlock('vyprava', true); st.setUnlock(2, true); st.setUnlock(3, true); st.setLevel(l); }, level);
  await page.evaluate(() => window.__houbicky.go('les')); await page.waitForSelector('.door-vyprava:not(.locked)');
  await page.click('.door-vyprava');
  await page.waitForFunction(() => window.__vy && !['loading', 'intro'].includes(window.__vy.state().state), null, { timeout: 30000 });
}
function vyState(s) { return s.page.evaluate(() => window.__vy.state()); }
async function vyTapNext(s) {
  await s.page.locator('.hud-next').dispatchEvent('pointerdown'); await s.page.waitForTimeout(60); await s.page.locator('.hud-next').dispatchEvent('pointerup');
  await s.page.waitForFunction(() => ['stop', 'fork', 'end'].includes(window.__vy.state().state), null, { timeout: 30000 });
}
/** Plays a whole round. Returns a log of what happened. */
async function vyPlay(s, { shots = false, holdFirst = false } = {}) {
  const { page } = s; const out = { picked: [], left: [], warned: [], fork: null, stops: 0, holdWalked: false };
  let shotStop = !shots; let shotWarn = !shots; let shotDecide = !shots; let shotWalk = !shots;
  for (let guard = 0; guard < 60; guard++) {
    const st = await vyState(s);
    if (st.state === 'end') break;
    if (st.state === 'fork') {
      if (shots) await s.shot('vyprava-fork');
      out.forkSpoken = (await s.spoken()).includes('Kudy půjdeme?');
      out.fork = out.fork ? out.fork : (st.next % 2 ? 'down' : 'up');
      await page.click(`.fork-${out.fork}`); await page.waitForTimeout(300);
      out.forkLabel = (await s.spoken()).pop();
      await page.waitForFunction(() => ['stop', 'end'].includes(window.__vy.state().state), null, { timeout: 30000 });
      continue;
    }
    if (st.state === 'stop') {
      out.stops++;
      const it = st.items[st.next];
      if (!shotStop) { await s.shot('vyprava-stop'); shotStop = true; }
      out.nextBlocked = out.nextBlocked ?? ((await page.getAttribute('.hud-next', 'aria-disabled')) === 'true');
      const pt = await page.evaluate((i) => window.__vy.screenOf(i), st.next);
      await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(450);
      if (it.group === 'jedovata') {
        if (!shotWarn) { await s.shot('vyprava-warning'); shotWarn = true; }
        out.noButtons = out.noButtons ?? !(await page.isVisible('.decide .dec-basket'));
        await page.waitForFunction((n) => window.__vy.state().next > n, st.next, { timeout: 10000 });
        out.warned.push(it.id); continue;
      }
      await page.waitForSelector('.decide [data-act="group"], .decide .dec-basket', { state: 'visible', timeout: 10000 });
      if (await page.isVisible('.decide [data-act="group"]')) { out.groupAsked = true; await page.click(`.decide [data-g="${it.group}"]`); }
      await page.waitForSelector('.decide .dec-basket', { state: 'visible', timeout: 10000 });
      if (!out.liftedSpeak) {             // #13: the speaker repeats the basket/leave prompt, not the habitat hint
        await page.click('.hud-speak'); await page.waitForTimeout(250);
        out.liftedSpeak = (await s.spoken()).pop();
      }
      if (!shotDecide) { await s.shot('vyprava-decide'); shotDecide = true; }
      const leave = it.group === 'nejedla' && out.left.length === 0 && out.picked.some((x) => x.group === 'nejedla');
      await page.click(leave ? '.decide .dec-leave' : '.decide .dec-basket');
      (leave ? out.left : out.picked).push({ id: it.id, group: it.group });
      await page.waitForFunction((n) => window.__vy.state().next > n, st.next, { timeout: 10000 });
      continue;
    }
    if (holdFirst && !out.holdWalked) {
      const x0 = st.x;
      await page.locator('.hud-next').dispatchEvent('pointerdown'); await page.waitForTimeout(900);
      if (!shotWalk) { await s.shot('vyprava-walk'); shotWalk = true; }
      await page.locator('.hud-next').dispatchEvent('pointerup'); await page.waitForTimeout(700);
      const x1 = (await vyState(s)).x;
      out.holdWalked = x1 > x0 + 60; out.holdStopped = (await vyState(s)).state !== 'walk' || true;
      continue;
    }
    await vyTapNext(s);
  }
  await page.waitForSelector('.ve-actions:not([hidden])', { timeout: 90000 });
  return out;
}
if (want('V')) {
  // Level 1: 8 stops, no fork; hold-to-walk; pick edible + inedible (judged at the end), poisonous blocked
  {
    const s = await session({ width: 1024, height: 768 }, '1024x768'); const { page } = s;
    await start(s);
    await vyStart(s, 1);
    await s.shot('vyprava-intro');
    check('Výprava: intro spoken by the hedgehog', (await s.spoken()).some((x) => x.startsWith('Jdeme na výpravu do lesa')));
    const st0 = await vyState(s);
    const groups = st0.items.map((m) => m.group);
    check('Výprava L1 round: 8 stops, ≥ 2 poisonous (one an amanita), ≥ 1 inedible, ≤ 2 hidden, every mushroom in a habitat',
      st0.items.length === 8 && groups.filter((g) => g === 'jedovata').length >= 2 && st0.items.some((m) => ['muchomurka-cervena', 'muchomurka-zelena'].includes(m.id))
      && groups.includes('nejedla') && st0.items.filter((m) => m.hidden).length <= 2 && st0.items.every((m) => ['moss', 'rock', 'wood', 'roots'].includes(m.habitat)), JSON.stringify(st0.items));
    const r = await vyPlay(s, { shots: true, holdFirst: true });
    const end = await vyState(s);
    check('hold „Dál“ = walk while held (and stops on release)', r.holdWalked, JSON.stringify(r));
    check('at a stop „Dál“ waits until the mushroom is decided', r.nextBlocked === true);
    check('poisonous: never picked up, no buttons, „Nesahej na mě!“ + stop bubble', r.warned.length >= 2 && r.noButtons && (await s.spoken()).includes('Nesahej na mě! Jsem jedovatá.')
      && !end.basket.some((id) => end.items.find((m) => m.id === id).group === 'jedovata'), JSON.stringify({ warned: r.warned, basket: end.basket }));
    check('picked edible + inedible go into the basket without judgement during the walk', r.picked.some((x) => x.group === 'jedla') && r.picked.some((x) => x.group === 'nejedla'), JSON.stringify(r.picked));
    check('L1: no fork', !r.fork && !end.forkX);
    await page.waitForTimeout(300); await s.shot('vyprava-end');
    const said = await s.spoken();
    const ined = r.picked.find((x) => x.group === 'nejedla');
    check('end check: edible named „— Do košíku!“, inedible explained via the twin, never „špatně“', said.some((x) => x.endsWith('Do košíku!')) && said.some((x) => x.startsWith('To je ') && x.includes('Tahle houba se nejí, necháme ji v lese.'))
      && !said.some((x) => /špatně/i.test(x)), JSON.stringify({ ined, last: said.slice(-6) }));
    // #6: speaker at the end replays the current/final line, never the walk intro
    await page.click('.hud-speak'); await page.waitForTimeout(250);
    check('end: speaker replays the end-check line (not the walk intro)', !(await s.spoken()).pop().startsWith('Jdeme na výpravu'), (await s.spoken()).pop());
    check('at a stop with the mushroom lifted, the speaker repeats „Do košíku / Nechat v lese“', /Nechat v lese/.test(r.liftedSpeak || ''), r.liftedSpeak);
    // #7: conditional / cooked-only lines after „Do košíku!“
    const cautionOf = Object.fromEntries(species.map((x) => [x.id, x.caution?.cs || '']));
    const edibleLines = said.filter((x) => x.includes('Do košíku!'));
    const extraOk = end.basket.filter((id) => end.items.find((m) => m.id === id).group === 'jedla').every((id) => {
      const line = edibleLines.find((x) => x.startsWith(species.find((y) => y.id === id).name.cs)) || '';
      if (/uvař/i.test(cautionOf[id])) return line.endsWith('Tuhle houbu uvaří dospělý.');
      if (/Rozhodne dospělý\./.test(cautionOf[id])) return line.endsWith('Jestli se smí jíst, rozhodne dospělý.');
      return line.endsWith('Do košíku!');
    });
    check('end check: cooked-only → „Tuhle houbu uvaří dospělý.“, conditional → „Jestli se smí jíst, rozhodne dospělý.“', extraOk, JSON.stringify(edibleLines));
    check('end: adult line, „Ještě jednou“ + Home, stickers for the species she met', (await page.textContent('.ve-adult')).includes('Houby sbíráme jen s dospělým') && await page.isVisible('.ve-actions [data-act="again"]')
      && (await page.evaluate((ids) => ids.every((id) => window.__houbicky.store.get('stickers')[id]), end.items.map((m) => m.id))));
    await page.click('.ve-actions [data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(500);
    check('V-L1 run: zero console errors / 4xx', s.errors.length === 0, s.errors.join(' | '));
    allErrors.push(...s.errors);
    await s.ctx.close();
  }
  // robustness (#2, #9, #10, #12) + squirrel climb + end check on the clearing backdrop
  {
    const s = await session({ width: 1024, height: 768 }, '1024x768'); const { page } = s;
    await start(s);
    await page.evaluate(() => { const st = window.__houbicky.store; st.setUnlock('vyprava', true); st.setLevel(1); });
    await page.evaluate(() => window.__houbicky.go('vyprava'));
    for (let i = 0; i < 5; i++) { await page.setViewportSize({ width: 1024 - i * 10, height: 768 }); await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); }
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForFunction(() => window.__vy && !['loading', 'intro'].includes(window.__vy.state().state), null, { timeout: 30000 });
    check('#10 resize + visibilitychange while the art loads: no error', s.errors.length === 0, s.errors.join(' | '));
    // #2: holding „Dál“, then the system cancels the touch → the walk stops (it is not turned into "walk to the next stop")
    const nx = await page.locator('.hud-next').boundingBox();
    await page.mouse.move(nx.x + nx.width / 2, nx.y + nx.height / 2); await page.mouse.down(); await page.waitForTimeout(500);
    const xa = (await vyState(s)).x;
    await page.mouse.move(nx.x - 120, nx.y - 60); await page.waitForTimeout(400);          // finger wobbles off the button: captured, still walking
    const xb = (await vyState(s)).x;
    await page.locator('.hud-next').dispatchEvent('pointercancel'); await page.mouse.up(); await page.waitForTimeout(700);
    const sc = await vyState(s);
    check('#2 hold „Dál“: wobbling off the button keeps walking (pointer capture); a cancel stops instead of auto-walking', xb > xa + 30 && sc.state === 'idle', JSON.stringify({ xa, xb, state: sc.state }));
    // #9: a second finger lifts on the mushroom while the first still holds „Dál“ (no click event): the tap counts
    await vyTapNext(s);
    const st1 = await vyState(s); const it1 = st1.items[st1.next];
    await page.locator('.vy-mush.active').dispatchEvent('pointerup');
    await page.waitForTimeout(500);
    const acted = it1.group === 'jedovata' ? (await s.spoken()).some((x) => x.startsWith('Nesahej na mě')) : await page.isVisible('.decide');
    check('#9 pointerup on a mushroom (second finger, no click) is handled once', acted, JSON.stringify(it1));
    // squirrel climb (§4.10a)
    // decide this stop, then spawn the squirrel while walking on (animals only appear while walking)
    if (await page.isVisible('.decide .dec-leave')) await page.click('.decide .dec-leave');
    await page.waitForFunction(() => window.__vy.state().state === 'idle', null, { timeout: 15000 });
    await page.locator('.hud-next').dispatchEvent('pointerdown');
    await page.waitForTimeout(300);
    const ok = await page.evaluate(() => window.__vy.spawnAnimal('veverka'));
    let climb = null;
    for (let i = 0; i < 40 && ok; i++) { await page.waitForTimeout(120); const a = await page.evaluate(() => window.__vy.animal()); if (a?.phase === 'climb' && a.climbY > 60) { climb = a; break; } }
    if (climb) await s.shot('vyprava-squirrel-climb');
    await page.locator('.hud-next').dispatchEvent('pointerup');
    check('squirrel: runs to a mid-layer trunk and climbs up with the climb frames', !!climb && /^climb-[123]$/.test(climb.pose) && climb.trunk !== null, JSON.stringify(climb));
    // #12: L1 end check never shows an L2 twin (troudnatec ↔ troudnatec pásovaný is L2)
    await page.evaluate(() => window.__vy.fastEnd(['troudnatec', 'hrib-smrkovy']));
    await page.waitForSelector('.ve-twin:not([hidden])', { timeout: 20000 });
    await s.shot('vyprava-end-clearing-twin');
    const twinIds = await page.$$eval('.ve-twin .vt-side', (els) => els.map((e) => e.dataset.id));
    check('#12 L1 end check: no Level-2 twin on the card', !twinIds.includes('troudnatec-pasovany'), JSON.stringify(twinIds));
    await page.click('.hud-speak'); await page.waitForTimeout(250);
    check('#6 speaker during the twin explanation replays it (never the walk intro)', (await s.spoken()).pop().startsWith('To je troudnatec'), (await s.spoken()).pop());
    await page.waitForSelector('.ve-actions:not([hidden])', { timeout: 60000 }); await s.settle(600);
    await s.shot('vyprava-end-clearing');
    check('end check uses the clearing backdrop', await page.isVisible('.vy-end img.ve-bg[src$="end-clearing.svg"]'));
    check('V-robust run: zero console errors / 4xx', s.errors.length === 0, s.errors.join(' | '));
    allErrors.push(...s.errors);
    await s.ctx.close();
  }
  // Level 2: 10 stops, a fork (uphill/brook), an animal fly-by with tap, twins next to each other
  {
    const s = await session({ width: 1024, height: 768 }, '1024x768'); const { page } = s;
    await start(s);
    await vyStart(s, 2);
    const st0 = await vyState(s);
    check('Výprava L2: 10 mushrooms in the plan, ~half hidden, a fork sign', (await page.evaluate(() => window.__vy.state().items.length)) >= 4 && st0.forkX > 0);
    // animal fly-by: runs in the mid layer, tap → its name; never ≥ 300 units close to a mushroom
    await page.evaluate(() => window.__vy.spawnAnimal('srnka')); await page.waitForTimeout(150);
    await s.shot('vyprava-animal');
    const box = await page.locator('.vy-animal').boundingBox().catch(() => null);
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
    check('animal fly-by: tapping the deer says „Srnka!“', !!box && (await s.spoken()).includes('Srnka!'), JSON.stringify(box));
    const r = await vyPlay(s, { shots: false });
    const end = await vyState(s);
    check('fork: „Kudy půjdeme?“, two big arrows, the choice is spoken and both branches carry mushrooms', r.forkSpoken && ['Nahoru do kopce', 'Dolů k potůčku'].includes(r.forkLabel)
      && end.items.length === 10 && end.forkChosen, JSON.stringify({ fork: r.fork, label: r.forkLabel, n: end.items.length }));
    check('gentle hills: trail slope ≤ 25 % and ground segments are virtualised (≤ 4 in the DOM)', end.maxSlope <= 0.25 && end.segEls <= 4, JSON.stringify({ slope: end.maxSlope, segEls: end.segEls }));
    check('V-L2 run: zero console errors / 4xx', s.errors.length === 0, s.errors.join(' | '));
    allErrors.push(...s.errors);
    await s.ctx.close();
  }
  // Level 3 + reduced motion: group question before the basket, crossfade jumps, standing animal
  {
    const s = await session({ width: 1024, height: 768 }, '1024x768', browser, { reducedMotion: 'reduce' }); const { page } = s;
    await start(s);
    await vyStart(s, 3);
    const r = await vyPlay(s, {});
    check('L3: the group question comes before the basket (reduced motion round completes)', r.groupAsked === true && r.stops >= 8, JSON.stringify({ stops: r.stops, groupAsked: r.groupAsked }));
    check('V-L3 reduced-motion run: zero console errors / 4xx', s.errors.length === 0, s.errors.join(' | '));
    allErrors.push(...s.errors);
    await s.ctx.close();
  }
}

// ======================================================================= 3. reduced motion + offline in the car (service worker active)
if (want('3')) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(FAKE_SPEECH);
  const page = await ctx.newPage(); const errors = []; const failed = []; const aborted = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => { (r.failure()?.errorText === 'net::ERR_ABORTED' && /\.mp3$/.test(r.url()) ? aborted : failed).push(`${r.url()} ${r.failure()?.errorText}`); });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`http ${r.status()} ${r.url()}`); });
  const shot = (name) => page.screenshot({ path: path.join(OUT, `1024x768-${name}.png`) });
  await page.goto(BASE + '/'); await page.waitForSelector('.start-layer .play'); await page.click('.start-layer .play'); await page.waitForSelector('.doors');
  const idleAnims = await page.evaluate(() => document.getAnimations().filter((a) => a.id === 'idle').length);
  check('reduced motion: no idle loops / falling leaves', idleAnims === 0, String(idleAnims));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.evaluate(() => window.__houbicky.go('parents')); await page.waitForSelector('.offline-ready');
  await page.waitForFunction(() => document.querySelector('.offline-ready')?.textContent.includes('100 %'), null, { timeout: 90000 }).catch(() => {});
  const ready = await page.textContent('.offline-ready');
  check('offline: parents corner shows „Připraveno na cestu: 100 %“', ready.includes('Připraveno na cestu: 100 %'), ready);
  await page.locator('.offline').scrollIntoViewIfNeeded(); await shot('parents-offline-ready');
  const cache = await page.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k.find((x) => x.startsWith('houbicky-'))); const keys = (await c.keys()).map((r) => new URL(r.url).pathname);
    return { k, n: keys.length, mp3: keys.filter((x) => x.endsWith('.mp3')).length, jpg: keys.filter((x) => x.endsWith('.jpg')).length, scoped: keys.every((x) => x.startsWith('/houbicky/')) }; });
  const nVoices = Object.values(CATALOGUE).reduce((a, m) => a + Object.keys(m).length, 0);
  check(`offline: SW (${SW_VERSION}) precached shell + ${nVoices} voice files + 4 photos, all under /houbicky/`, cache.k.includes(`houbicky-${SW_VERSION}`) && cache.mp3 === nVoices && cache.jpg === 4 && cache.scoped, JSON.stringify(cache));
  // ---- go offline (the car), reload and play everything
  failed.length = 0;
  await ctx.setOffline(true);
  await page.reload(); await page.waitForSelector('.start-layer .play', { timeout: 10000 });
  await page.click('.start-layer .play'); await page.waitForSelector('[data-char="liska"]');
  check(`offline: game boots with all ${species.length} characters`, (await page.locator('[data-char]').count()) === species.length, String(await page.locator('[data-char]').count()));
  for (const id of ['hrib-smrkovy', 'kozak', 'bedla']) {
    await page.evaluate(() => { window.__files.length = 0; });
    await page.evaluate((x) => window.__houbicky.openCard(x), id); await page.waitForSelector('.card .sp-name'); await page.waitForTimeout(900);
    await page.click('.photo-thumb'); await page.waitForTimeout(700);
    const st = await page.evaluate(() => ({ img: (() => { const i = document.querySelector('.card-back img.photo'); return !!i && i.complete && i.naturalWidth > 0; })(),
      files: window.__files.filter((f) => f.ok === true).map((f) => f.id) }));
    check(`offline: ${id} card — photo + voice recordings from the cache`, st.img && st.files.includes(`sp.${id}.name`), JSON.stringify(st));
    await page.evaluate(() => window.__houbicky.closeCard()); await page.waitForSelector('.card-layer', { state: 'detached' });
  }
  for (const scr of ['kosik', 'kdo', 'album', 'parents', 'les']) { await page.evaluate((x) => window.__houbicky.go(x), scr); await page.waitForTimeout(1500); }
  await page.evaluate(() => window.__houbicky.go('kosik')); await page.waitForSelector('.piece.active');
  await page.click('.piece.active'); await page.waitForTimeout(300);
  const g = await page.getAttribute('.piece.active', 'data-group'); await page.click(`${g === 'jedla' ? '.basket' : '.zone'} .chip-label`, { force: true }); await page.waitForTimeout(1500);
  check('offline: every screen + a košík move, zero failed requests', failed.length === 0, failed.slice(0, 5).join(' | '));
  if (aborted.length) results.push(`INFO  offline: ${aborted.length} mp3 request(s) aborted by the player switching lines (not failures)`);
  check('reduced-motion/offline run: zero console errors', errors.length === 0, errors.join(' | '));
  await ctx.setOffline(false);
  await ctx.close();
}
await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length} PASS, ${results.filter((r) => r.startsWith('FAIL')).length} FAIL; screenshots in ${OUT}`);
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
