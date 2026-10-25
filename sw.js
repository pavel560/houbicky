// Houbičky — service worker: offline-first, made for a car trip.
// On the first visit over HTTPS (or localhost) it precaches EVERYTHING the game can need: app shell, fonts, art,
// every photo listed in photos/credits.json and every voice recording listed in voice/index.json.
// Pages ask for progress with postMessage({type:'status'}) → {type:'status', have, total, version}.
// Bump VERSION whenever app files change; sw.js is served with Cache-Control: no-cache.
//
// Stable and beta side by side on one origin (…/houbicky/ and …/houbicky/beta/): the SAME file works in both places.
// Everything is derived from the registration scope: the stable worker ignores every request under …/beta/
// (the beta worker owns that scope) and each worker only ever creates/deletes caches with its own prefix.
const VERSION = 'v12';
const SCOPE_PATH = new URL(self.registration.scope).pathname;          // '/houbicky/' or '/houbicky/beta/'
const IS_BETA = /\/beta\/$/.test(SCOPE_PATH);
const PREFIX = IS_BETA ? 'houbicky-beta-' : 'houbicky-';
const OWN_CACHE = IS_BETA ? /^houbicky-beta-v\d+$/ : /^houbicky-v\d+$/;
const CACHE = `${PREFIX}${VERSION}`;

// Must exist — installation fails if any of these is missing.
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './design/tokens.css',
  './css/fonts.css',
  './css/app.css',
  './data/species.json',
  './art/scene-forest.svg',
  './art/basket.svg',
  './art/zone-les.svg',
  './art/ui-icons.svg',
  './js/store.js',
  './js/i18n.js',
  './js/speech.js',
  './js/voiceurl.js',
  './js/sound.js',
  './js/confetti.js',
  './js/pwa.js',
  './js/assets.js',
  './js/ui.js',
  './js/anim.js',
  './js/router.js',
  './js/scene.js',
  './js/les.js',
  './js/card.js',
  './js/kosik.js',
  './js/kdo.js',
  './js/album.js',
  './js/parents.js',
  './js/app.js',
  './fonts/grandstander-latin-700-normal.woff2',
  './fonts/grandstander-latin-ext-700-normal.woff2',
  './fonts/grandstander-latin-800-normal.woff2',
  './fonts/grandstander-latin-ext-800-normal.woff2',
  './fonts/andika-latin-400-normal.woff2',
  './fonts/andika-latin-ext-400-normal.woff2',
  './fonts/andika-latin-700-normal.woff2',
  './fonts/andika-latin-ext-700-normal.woff2',
  './fonts/andika-latin-400-italic.woff2',
  './fonts/andika-latin-ext-400-italic.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './js/phrases.js',
  './photos/hidden.json',
  './photos/credits.json',
  './voice/index.json',
  './js/env.js',
  './js/levels.js',
  './js/levelui.js',
  './js/vyprava/world.js',
  './js/vyprava/game.js',
  './art/vyprava/side-ground-flat.svg',
  './art/vyprava/side-ground-up.svg',
  './art/vyprava/side-ground-crest.svg',
  './art/vyprava/side-ground-down.svg',
  './art/vyprava/side-ground-brook.svg',
  './art/vyprava/moss-cushion-1.svg',
  './art/vyprava/moss-cushion-2.svg',
  './art/vyprava/moss-cushion-3.svg',
  './art/vyprava/moss-collar.svg',
  './art/vyprava/rock-mossy-1.svg',
  './art/vyprava/rock-mossy-2.svg',
  './art/vyprava/rock-mossy-3.svg',
  './art/vyprava/stump.svg',
  './art/vyprava/log.svg',
  './art/vyprava/roots-flare.svg',
  './art/vyprava/fern.svg',
  './art/vyprava/blueberry.svg',
  './art/vyprava/leafpile-front.svg',
  './art/vyprava/signpost.svg',
  './art/vyprava/side-fork-sign.svg',
  './art/vyprava/stop-bubble.svg',
  './art/vyprava/sparkle.svg',
  './art/vyprava/side-child.svg',
  './art/vyprava/side-jezek.svg',
  './art/vyprava/guide-jezek.svg',
  './art/vyprava/srnka.svg',
  './art/vyprava/zajic.svg',
  './art/vyprava/veverka.svg',
  './art/vyprava/side-sky.svg',
  './art/vyprava/side-far.svg',
  './art/vyprava/side-mid.svg',
  './art/vyprava/side-front.svg',
  './art/vyprava/end-clearing.svg',
];
const OPTIONAL = ['./photos/manifest.json', './data/RESEARCH_NOTES.md'];

// Long-lived files: pure cache-first. JSON: network-first (fresh credits/index/data when online).
const IMMUTABLE = /\/(fonts|art|photos|icons|voice)\/.*\.(woff2|svg|png|jpe?g|webp|mp3)$/;
const NETWORK_FIRST = /\.json$/;
const SAFE_ID = /^[a-z0-9-]+$/;
const SAFE_VOICE = /^[a-z]{2}\/[A-Za-z0-9.-]+\.mp3$/;

async function readJson(cache, url) {
  try { const r = await cache.match(url); return r ? await r.json() : null; } catch { return null; }
}

/** Every URL the game may request while offline. */
async function wanted(cache) {
  const species = await readJson(cache, './data/species.json');
  const ids = (species?.species || []).map((s) => s.id).filter((id) => SAFE_ID.test(id));
  const credits = (await readJson(cache, './photos/credits.json')) || {};
  const index = (await readJson(cache, './voice/index.json')) || {};
  // content-addressed (see js/voiceurl.js): ./voice/cs/x.mp3?v=<first 10 chars of the index sha1>
  const voices = Object.values(index).flatMap((byId) => Object.values(byId || {}))
    .filter((e) => e && typeof e.file === 'string' && SAFE_VOICE.test(e.file))
    .map((e) => `./voice/${e.file}${typeof e.sha1 === 'string' && e.sha1 ? `?v=${encodeURIComponent(e.sha1.slice(0, 10))}` : ''}`);
  return [...new Set([...CORE, ...OPTIONAL, ...ids.map((id) => `./art/${id}.svg`),
    ...Object.keys(credits).filter((id) => ids.includes(id)).map((id) => `./photos/${id}.jpg`), ...voices])];
}

const isVoice = (url) => /\/voice\/[a-z]{2}\/[^/]+\.mp3$/.test(url.pathname);
/** Drop cached recordings whose exact URL (incl. ?v=) is no longer in voice/index.json: superseded takes. */
async function pruneVoices(cache, wantedList) {
  const keep = new Set(wantedList.map((u) => new URL(u, self.registration.scope).href));
  for (const req of await cache.keys()) {
    const url = new URL(req.url);
    if (isVoice(url) && !keep.has(url.href)) await cache.delete(req);
  }
}

let filling = null;
/** Download whatever is still missing (6 at a time). Shared by install and status requests. */
function fillMissing(cache) {
  if (filling) return filling;
  filling = (async () => {
    const queue = await wanted(cache);
    await pruneVoices(cache, queue);
    const worker = async () => {
      while (queue.length) {
        const u = queue.shift();
        if (await cache.match(u)) continue;
        try { await cache.add(new Request(u, { cache: 'reload' })); } catch { /* optional or offline: retried on the next status request */ }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
  })().finally(() => { filling = null; });
  return filling;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })));
    await fillMissing(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (OWN_CACHE.test(key) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'status') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const list = await wanted(cache);
    await pruneVoices(cache, list);                 // superseded takes go away even when nothing is missing
    let have = 0;
    for (const u of list) if (await cache.match(u)) have++;
    event.source?.postMessage({ type: 'status', version: VERSION, have, total: list.length });
    if (have < list.length) await fillMissing(cache);
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;
  if (!IS_BETA && url.pathname.startsWith(`${SCOPE_PATH}beta/`)) return;   // the beta copy has its own worker
  if (url.searchParams.has('nosw')) return;
  event.respondWith(handle(req, url, event));
});

/** Safari's <audio> asks for byte ranges; answer 206 from a cached full response. */
async function ranged(req, res) {
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m || (m[1] === '' && m[2] === '')) return res;
  const buf = await res.arrayBuffer(); const size = buf.byteLength;
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] !== '' && m[2] !== '' ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
}

/** Voice recordings: exact URL match only (the ?v= hash IS the version); a miss is fetched in full and cached. */
async function handleVoice(req, url) {
  const cache = await caches.open(CACHE);
  let res = await cache.match(url.href);                       // exact: never another take of the same line
  if (!res) {
    try {
      const full = await fetch(url.href);                      // without the Range header, so it can be cached
      if (full && full.ok && full.status === 200 && full.type === 'basic') {
        if (url.searchParams.has('v')) await cache.put(url.href, full.clone()).catch(() => {});
        res = full;
      } else return full;
    } catch { return Response.error(); }
  }
  return req.headers.has('range') ? ranged(req, res) : res;
}

async function handle(req, url, event) {
  if (isVoice(url)) return handleVoice(req, url);
  const cache = await caches.open(CACHE);
  const key = req.mode === 'navigate' && url.pathname.endsWith('/') ? './' : req;
  // Created lazily: no eager network request (and no unhandled rejection) when the cached copy is enough.
  const refresh = () => fetch(req).then((res) => {
    if (res && res.ok && res.status === 200 && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
    return res;
  });
  if (NETWORK_FIRST.test(url.pathname)) {
    try { return await refresh(); } catch {
      return (await cache.match(key, { ignoreSearch: true })) || Response.error();
    }
  }
  const cached = await cache.match(key, { ignoreSearch: true });
  if (cached) {
    if (!IMMUTABLE.test(url.pathname)) event.waitUntil(refresh().catch(() => {}));
    return req.headers.has('range') ? ranged(req, cached) : cached;
  }
  try {
    return await refresh();
  } catch {
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  }
}
