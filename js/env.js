// Houbičky — where is this copy of the game running? Derived at runtime from this module's own URL (no build step).
//   https://<user>.github.io/houbicky/        → stable (v1)
//   https://<user>.github.io/houbicky/beta/   → beta (v2): own localStorage key, own SW scope + caches, BETA ribbon
// The same files work in both places; only the URL decides.

/** App root path, e.g. '/houbicky/' or '/houbicky/beta/' */
export const BASE_PATH = new URL('../', import.meta.url).pathname;
export const IS_BETA = /\/beta\/$/.test(BASE_PATH);
/** localStorage key for progress — beta never reads or writes the stable copy's progress. */
export const STORE_KEY = IS_BETA ? 'houbicky.beta.v1' : 'houbicky.v1';
/** Cache-name prefix shared with sw.js (which derives the same from its scope). */
export const CACHE_PREFIX = IS_BETA ? 'houbicky-beta-' : 'houbicky-';
