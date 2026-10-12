// node tests/world.test.mjs — Výprava 2D world generator (no browser). Exit 1 on failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = await import(pathToFileURL(path.join(ROOT, 'js/vyprava/world.js')).href);
const meta = {}; for (const k of ['flat', 'up', 'crest', 'down', 'brook']) meta[k] = W.parseSegment(fs.readFileSync(path.join(ROOT, `art/vyprava/side-ground-${k}.svg`), 'utf8'));
const species = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/species.json'), 'utf8')).species;
let fail = 0; let n = 0;
const ok = (name, cond, extra = '') => { n++; if (!cond) { fail++; console.log(`FAIL ${name} ${extra}`); } };
for (const level of [1, 2, 3]) for (let seed = 1; seed <= 40; seed++) {
  const pool = species.filter((s) => (s.level || 1) <= level);
  const plan = W.planRound(pool, level, seed); const c = new W.Chain(meta);
  const a = W.buildStart(c, plan); let items = a.items; let endX = a.endX;
  if (plan.fork) { const b = W.buildAfterFork(c, plan, seed % 2 ? 'up' : 'down'); items = items.concat(b.items); endX = b.endX; }
  const grp = (g) => items.filter((m) => species.find((s) => s.id === m.id).group === g);
  const tag = `L${level} seed ${seed}`;
  ok(`${tag}: count`, items.length === (level === 1 ? 8 : 10), items.length);
  ok(`${tag}: ≥ 2 poisonous, ≥ 1 inedible, ~60 % edible`, grp('jedovata').length >= 2 && grp('nejedla').length >= 1 && grp('jedla').length >= items.length * 0.5);
  if (level === 1) ok(`${tag}: an amanita`, items.some((m) => ['muchomurka-cervena', 'muchomurka-zelena'].includes(m.id)));
  ok(`${tag}: hidden count`, items.filter((m) => m.hidden).length === (level === 1 ? 2 : 5));
  ok(`${tag}: increasing x, ≥ 1000 apart, none in the brook`, items.every((m, i) => (i === 0 || m.x - items[i - 1].x >= 1000) && !c.inWater(m.x) && !c.inWater(m.x - W.STOP_GAP)));
  ok(`${tag}: end after the last mushroom, inside the world`, endX > items[items.length - 1].x && endX + 600 <= c.end);
  ok(`${tag}: gentle slope`, c.maxSlope() <= 0.25, c.maxSlope());
  ok(`${tag}: segments join (surface continuous)`, c.segs.every((sg, i) => i === 0 || Math.abs(c.surface(sg.x - 0.01) - c.surface(sg.x + 0.01)) < 2));
  const kinds = c.segs.map((x) => x.kind).join(',');
  ok(`${tag}: never two ups/downs in a row`, !/up,up|down,down/.test(kinds), kinds);
  if (plan.fork) ok(`${tag}: branch carries 2 mushrooms`, items.filter((m) => m.branch).length === 2);
  if (level >= 2) {
    const ids = items.map((m) => m.id);
    const pairs = ids.filter((id, i) => i < ids.length - 1 && [].concat(species.find((s) => s.id === id).twin || []).includes(ids[i + 1])).length;
    ok(`${tag}: habitats valid`, items.every((m) => ['moss', 'rock', 'wood', 'roots'].includes(m.habitat)));
    void pairs;
  }
  ok(`${tag}: wood growers at wood`, items.every((m) => !['sirovec', 'kotrc', 'vaclavka', 'troudnatec', 'troudnatec-pasovany', 'trepenitka'].includes(m.id) || m.habitat === 'wood'));
}
console.log(`${n - fail}/${n} world checks passed`);
process.exit(fail ? 1 : 0);
