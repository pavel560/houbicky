// Houbičky — service worker registration.
// Service workers only run in a secure context: http://localhost or HTTPS.
// On the iPad over plain http://<Mac-IP>:8642 the game still works, but without offline caching.
// Add ?nosw to the URL to unregister THIS copy's worker and delete ITS caches (stable and beta are independent).
// Self-contained (no imports) so the same file can live on main (stable) and v2 (beta).
const IS_BETA = /\/beta\/$/.test(new URL('../', import.meta.url).pathname);
const OWN_CACHE = IS_BETA ? /^houbicky-beta-v\d+$/ : /^houbicky-v\d+$/;

export async function registerServiceWorker(url = './sw.js') {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return { ok: false, reason: 'insecure-or-unsupported' };
  try {
    if (new URLSearchParams(location.search).has('nosw')) {
      const scope = new URL('./', location.href).href;
      for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope === scope) await r.unregister();
      for (const k of await caches.keys()) if (OWN_CACHE.test(k)) await caches.delete(k);
      return { ok: false, reason: 'disabled-by-nosw' };
    }
    const reg = await navigator.serviceWorker.register(url, { scope: './' });
    return { ok: true, registration: reg };
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
}
