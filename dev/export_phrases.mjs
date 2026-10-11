// Writes voice/phrases.json = every spoken line, per language, keyed by stable phrase id.
// Usage: node dev/export_phrases.mjs     (no dependencies; Node 18+)
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { buildCatalogue } = await import(pathToFileURL(path.join(ROOT, 'js', 'phrases.js')).href);
const species = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'species.json'), 'utf8')).species;
const cat = buildCatalogue(species);
const sorted = Object.fromEntries(Object.entries(cat).map(([lang, m]) => [lang, Object.fromEntries(Object.keys(m).sort().map((k) => [k, m[k]]))]));
fs.mkdirSync(path.join(ROOT, 'voice'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'voice', 'phrases.json'), JSON.stringify(sorted, null, 2) + '\n');
console.log(`voice/phrases.json: ${Object.entries(sorted).map(([l, m]) => `${l} ${Object.keys(m).length}`).join(', ')} phrases`);
