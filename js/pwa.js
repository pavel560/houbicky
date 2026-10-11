// Houbičky — service worker registration.
// Service workers only run in a secure context: http://localhost or HTTPS.
// On the iPad over plain http://<Mac-IP>:8642 the game still works, but without offline caching.
// Add ?nosw to the URL to unregister the worker and bypass caches (handy while developing).

export async function registerServiceWorker(url = './sw.js') {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return { ok: false, reason: 'insecure-or-unsupported' };
  try {
    if (new URLSearchParams(location.search).has('nosw')) {
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      for (const k of await caches.keys()) if (k.startsWith('houbicky-')) await caches.delete(k);
      return { ok: false, reason: 'disabled-by-nosw' };
    }
    const reg = await navigator.serviceWorker.register(url, { scope: './' });
    return { ok: true, registration: reg };
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
}
