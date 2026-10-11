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
fs.cpSync(SRC, SITE, { recursive: true, filter: (f) => !/[\\/](dev[\\/]screens|__pycache__|\.git)([\\/]|$)/.test(f) });
const { buildCatalogue } = await import(new URL('../js/phrases.js', import.meta.url).href);
const CATALOGUE = buildCatalogue(JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'species.json'), 'utf8')).species);
const frame = Buffer.alloc(417); frame.set([0xFF, 0xFB, 0x90, 0x64]);       // MPEG-1 L3 128 kb/s 44.1 kHz, silent
const SILENT_MP3 = Buffer.concat(Array(12).fill(frame));
const vindex = {};
for (const [lang, m] of Object.entries(CATALOGUE)) {
  fs.mkdirSync(path.join(SITE, 'voice', lang), { recursive: true }); vindex[lang] = {};
  for (const [id, text] of Object.entries(m)) { fs.writeFileSync(path.join(SITE, 'voice', lang, `${id}.mp3`), SILENT_MP3); vindex[lang][id] = { text, file: `${lang}/${id}.mp3`, sha1: 'test', bytes: SILENT_MP3.length }; }
}
fs.writeFileSync(path.join(SITE, 'voice', 'index.json'), JSON.stringify(vindex));
const PORT = 8650 + Math.floor(Math.random() * 40);
const server = spawn('python3', [path.join(SRC, 'serve.py'), '--dir', TMP, '--port', String(PORT), '--host', '127.0.0.1', '--quiet'], { stdio: 'ignore' });
process.on('exit', () => { server.kill(); fs.rmSync(TMP, { recursive: true, force: true }); });
const BASE = process.env.BASE || `http://localhost:${PORT}/houbicky`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/index.html')).ok) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 100)); }
const species = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'data', 'species.json'), 'utf8')).species;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const results = []; const allErrors = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra && !ok ? '  — ' + extra : ''}`); };

// fake "photo" (the character on a green field) — only ever served through page.route
const mk = await browser.newPage({ viewport: { width: 1000, height: 750 } });
await mk.setContent(`<body style="margin:0;background:linear-gradient(#7d8c45,#56692f);display:grid;place-items:center;height:750px"><img src="${BASE}/art/hrib-smrkovy.svg" style="height:600px"></body>`);
await mk.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
const FAKE_JPG = await mk.screenshot({ type: 'jpeg', quality: 80 });
await mk.close();
// real files in the temp site (used by the offline/SW test; other sessions override credits via page.route)
const credit = (via) => ({ author: 'Test Author', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', sourcePage: 'https://commons.wikimedia.org/wiki/File:Test.jpg', via });
for (const id of ['hrib-smrkovy', 'kozak', 'bedla', 'liska']) fs.writeFileSync(path.join(SITE, 'photos', `${id}.jpg`), FAKE_JPG);
fs.writeFileSync(path.join(SITE, 'photos', 'credits.json'), JSON.stringify({ 'hrib-smrkovy': credit('commonsFile'), kozak: credit('alt'), bedla: credit('commonsFile'), liska: credit('wikipedia') }));

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

async function session(vp, tag) {
  const ctx = await browser.newContext({ viewport: vp, serviceWorkers: 'block' });
  await ctx.addInitScript(FAKE_SPEECH);
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
  await s.page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.65);
  await s.page.waitForSelector('.card'); await s.settle(1000);
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
      hit: (() => { const e = document.elementFromPoint(x, y); return e.tagName + '.' + (e.className?.baseVal ?? e.className); })() }), [pb.x + pb.width / 2, pb.y + pb.height / 2])));
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
{
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
  check('flip: spoken „Skutečná fotka“ + name', (await s.spoken()).pop() === 'Skutečná fotka Hřib smrkový.');
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
  check('parents: neutral faces OFF by default', (await page.getAttribute('.switch[data-act="faces"]', 'aria-checked')) === 'false');
  await page.click('.switch[data-act="faces"]'); await s.settle(300);
  check('parents: neutral faces persisted', await page.evaluate(() => JSON.parse(localStorage.getItem('houbicky.v1')).faces === 'neutral'));
  await page.click('[data-act="home"]'); await page.waitForSelector('.doors'); await s.settle(600);
  await page.click('[data-door="kdo"]'); await page.waitForSelector('.cand'); await s.settle(1000); await s.shot('kdo-neutral');
  const neutral = await page.evaluate(() => ({ attr: document.querySelector('.game.kdo').dataset.faces, mn: getComputedStyle(document.querySelector('.cand .mouth-neutral')).visibility, m: getComputedStyle(document.querySelector('.cand .mouth')).display }));
  check('neutral faces applied in games', neutral.attr === 'neutral' && neutral.mn === 'visible' && neutral.m === 'none', JSON.stringify(neutral));
  await page.reload(); await page.waitForSelector('.start-layer .play'); await page.click('.start-layer .play'); await page.waitForSelector('.doors'); await s.settle(800);
  check('progress persists across reload (stickers)', await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('houbicky.v1')).stickers).length >= 2));
  await page.evaluate(() => { window.__houbicky.store.setNeutralFaces(false); });
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
for (const vp of [{ width: 1180, height: 820 }, { width: 1440, height: 900 }, { width: 820, height: 1180 }]) {
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
  check(`${tag}: zero console errors / 4xx`, s.errors.length === 0, s.errors.join(' | '));
  allErrors.push(...s.errors);
  await s.ctx.close();
}

// ======================================================================= R. regression checks for the evaluator's findings
{
  const s = await session({ width: 1024, height: 768 }, '1024x768'); const { page } = s;
  await start(s);
  check('#8 no pinch-zoom: body touch-action pan-x pan-y', (await page.evaluate(() => getComputedStyle(document.body).touchAction)) === 'pan-x pan-y');
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

// ======================================================================= 3. reduced motion + offline in the car (service worker active)
{
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
  check(`offline: SW (v6) precached shell + ${nVoices} voice files + 4 photos, all under /houbicky/`, cache.k.includes('houbicky-v6') && cache.mp3 === nVoices && cache.jpg === 4 && cache.scoped, JSON.stringify(cache));
  // ---- go offline (the car), reload and play everything
  failed.length = 0;
  await ctx.setOffline(true);
  await page.reload(); await page.waitForSelector('.start-layer .play', { timeout: 10000 });
  await page.click('.start-layer .play'); await page.waitForSelector('[data-char="liska"]');
  check('offline: game boots with all 13 characters', (await page.locator('[data-char]').count()) === 13);
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
