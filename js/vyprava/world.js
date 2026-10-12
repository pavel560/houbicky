// Výprava do lesa (2D) — pure world model: round composition, ground-segment chain, surface heights, habitats.
// No DOM here (unit-testable in node). Units = stage units (1000 = screen height), x grows to the right.
// DESIGN-v2 §4.3 (layers, segments), §4.5 (habitats), §4.9 (round composition), §4.11 (fork), §4.12 (length).

export const SEG_W = 1024;
export const SEG_STEP = SEG_W - 2;           // neighbours overlap by 2 units (hides the AA hairline)
export const WALK_DY = 16;                   // actors walk ON the trail: foot = surface + data-walk-dy
export const STOP_GAP = 260;                 // the child halts this far before a mushroom
export const SPACING = [1150, 1350];         // units between mushrooms (≈ 6–8 s walk at 180 u/s)

/** Segment metadata parsed from art/vyprava/side-ground-*.svg (data-y-in/out, data-profile). */
export function parseSegment(svgText) {
  const attr = (n) => (new RegExp(`\\s${n}="([^"]*)"`).exec(svgText) || [])[1];
  return {
    yIn: parseFloat(attr('data-y-in')), yOut: parseFloat(attr('data-y-out')),
    walkDy: parseFloat(attr('data-walk-dy') || WALK_DY),
    profile: (attr('data-profile') || '').trim().split(/\s+/).map(Number),
  };
}

const rnd = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffleWith = (r, a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

// ---------------------------------------------------------------- habitats (§4.5)
const WOOD = new Set(['sirovec', 'kotrc', 'vaclavka', 'troudnatec', 'troudnatec-pasovany', 'trepenitka']);
const ROCK = new Set(['liska', 'listicka', 'pychavka', 'pestrec']);
const ROOTS = new Set(['muchomurka-cervena', 'hrib-satan']);
export function habitatOf(id) {
  if (WOOD.has(id)) return 'wood';
  if (ROCK.has(id)) return 'rock';
  if (ROOTS.has(id)) return 'roots';
  return 'moss';
}
/** What hides a hidden mushroom (in front of it) + the hedgehog's hint key. */
export function coverOf(habitat, r) {
  if (habitat === 'rock') return { cover: 'blueberry', hint: 'rock' };
  if (habitat === 'wood' || habitat === 'roots') return { cover: 'leafpile-front', hint: r() < 0.5 ? 'leaves' : 'wood' };
  return r() < 0.5 ? { cover: 'fern', hint: 'fern' } : { cover: 'moss-deep', hint: 'moss' };
}
export const hintOf = (habitat) => ({ moss: 'moss', rock: 'rock', wood: 'wood', roots: 'wood' }[habitat] || 'moss');

// ---------------------------------------------------------------- round composition (§4.9)
/**
 * @param species  [{id, group, deadly, twin?}] available at this level
 * @param level    1–3
 * @returns [{ id, hidden, habitat, cover, hint }] in walking order
 */
export function composeRound(species, level, seed = Date.now()) {
  const r = rnd(seed);
  const n = level === 1 ? 8 : 10;
  const by = (g) => shuffleWith(r, species.filter((s) => s.group === g));
  const poison = by('jedovata'); const inedible = by('nejedla'); const edible = by('jedla');
  const pick = [];
  // ≥ 2 poisonous; at Level 1 at least one is a red or green amanita (the classic ones she must know)
  const amanita = poison.find((s) => ['muchomurka-cervena', 'muchomurka-zelena'].includes(s.id));
  if (level === 1 && amanita) pick.push(amanita);
  for (const s of poison) { if (pick.filter((x) => x.group === 'jedovata').length >= 2) break; if (!pick.includes(s)) pick.push(s); }
  for (const s of inedible.slice(0, level === 1 ? 1 : 2)) pick.push(s);
  for (const s of edible) { if (pick.length >= n) break; pick.push(s); }
  // not enough distinct species (small Level-1 pool): repeat the edible friends, then others
  for (let i = 0; pick.length < n && i < 50; i++) pick.push((edible.length ? edible : species)[i % (edible.length || species.length)]);
  let order = shuffleWith(r, pick);
  // Level 2+: look-alikes at neighbouring stops (liška → lištička)
  if (level >= 2) {
    for (let i = 0; i < order.length; i++) {
      const tw = [].concat(order[i].twin || []);
      const j = order.findIndex((x, k) => k > i + 1 && tw.includes(x.id));
      if (j > 0) { const [x] = order.splice(j, 1); order.splice(i + 1, 0, x); i++; }
    }
  }
  const nHidden = level === 1 ? 2 : Math.round(n / 2);
  const hiddenIdx = new Set(shuffleWith(r, order.map((_, i) => i).filter((i) => i > 0)).slice(0, nHidden));
  return order.map((s, i) => {
    const habitat = habitatOf(s.id);
    const hidden = hiddenIdx.has(i);
    const c = hidden ? coverOf(habitat, r) : { cover: null, hint: hintOf(habitat) };
    return { id: s.id, hidden, habitat, cover: c.cover, hint: c.hint };
  });
}

// ---------------------------------------------------------------- terrain chain (§4.3, §4.12)
/** Gentle hills: never two up or two down in a row without a crest/flat between; ≤ 1 brook per part. */
export function trunkSegments(count, r, { endFlat = false, brookOk = true } = {}) {
  const out = ['flat'];
  let height = 0; let brook = !brookOk;
  while (out.length < count) {
    const last = out[out.length - 1]; const left = count - out.length;
    if (height < 0) { out.push(last === 'up' ? 'crest' : 'down'); if (out[out.length - 1] === 'down') height = 0; continue; }
    const roll = r();
    if (left >= 3 && roll < 0.4) { out.push('up'); height = -1; continue; }
    if (!brook && roll < 0.55) { out.push('brook'); brook = true; continue; }
    out.push('flat');
  }
  if (endFlat && out[out.length - 1] !== 'flat') out.push('flat');
  return out;
}
export const BRANCHES = { up: ['up', 'crest', 'down'], down: ['down', 'brook', 'up'] };   // hill vs. brook, same length + count

/**
 * A chain of placed segments. Each: { kind, x, dy } — x = left edge, dy = vertical offset added to its profile.
 * meta: { kind → parseSegment(...) }
 */
export class Chain {
  constructor(meta) { this.meta = meta; this.segs = []; }
  get end() { return this.segs.length ? this.segs[this.segs.length - 1].x + SEG_STEP : 0; }
  get start() { return this.segs.length ? this.segs[0].x : 0; }
  append(kinds) {
    for (const kind of kinds) {
      const m = this.meta[kind];
      const prev = this.segs[this.segs.length - 1];
      const dy = prev ? prev.dy + this.meta[prev.kind].yOut - m.yIn : 0;
      this.segs.push({ kind, x: this.end, dy });
    }
    return this;
  }
  /** A lead-in flat left of x = 0 so the screen never shows a hole behind the start. */
  prepend(kind = 'flat') {
    const first = this.segs[0]; const m = this.meta[kind];
    this.segs.unshift({ kind, x: first.x - SEG_STEP, dy: first.dy + this.meta[first.kind].yIn - m.yOut, lead: true });
    return this;
  }
  segAt(x) {
    const i = Math.max(0, Math.min(this.segs.length - 1, Math.floor((x - this.start) / SEG_STEP)));
    return this.segs[i];
  }
  /** Surface (back edge of the trail) at world x. */
  surface(x) {
    if (!this.segs.length) return 720;
    const s = this.segAt(x); const p = this.meta[s.kind].profile;
    const lx = Math.max(0, Math.min(SEG_W, x - s.x)); const f = lx / 64; const i = Math.min(p.length - 2, Math.floor(f));
    return p[i] + (p[i + 1] - p[i]) * (f - i) + s.dy;
  }
  /** Where an actor's feet go. */
  walkY(x) { return this.surface(x) + (this.meta[this.segAt(x).kind].walkDy || WALK_DY); }
  /** Is x over the brook's water (no mushrooms there)? */
  inWater(x) { const s = this.segAt(x); return s.kind === 'brook' && x - s.x > 280 && x - s.x < 760; }
  /** Max |slope| along the chain (tests: gentle hills). */
  /** Drop trailing segments beyond x (keeps ≥ 1), then make sure the walk ends on a flat. */
  trimTo(x) {
    while (this.segs.length > 2 && this.segs[this.segs.length - 1].x > x) this.segs.pop();
    if (this.segs[this.segs.length - 1].kind !== 'flat') this.append(['flat']);
    return this;
  }
  maxSlope() { let m = 0; for (let x = this.start; x < this.end - 16; x += 16) m = Math.max(m, Math.abs(this.surface(x + 16) - this.surface(x)) / 16); return m; }
}

/** Place mushrooms from x0 on, `SPACING` apart, never in the brook. Returns the x positions. */
export function spread(chain, x0, count, r) {
  const xs = []; let x = x0;
  for (let i = 0; i < count; i++) {
    while (chain.inWater(x) || chain.inWater(x - STOP_GAP)) x += 120;
    xs.push(Math.round(x));
    x += SPACING[0] + r() * (SPACING[1] - SPACING[0]);
  }
  return xs;
}

/**
 * Plan a whole round. Returns { mushrooms, forkAt, partA, partB, branchCount, seed }.
 * The world before the fork is built immediately; after the child picks a branch, buildAfterFork() extends it.
 */
export function planRound(species, level, seed = Date.now()) {
  const r = rnd(seed ^ 0x9e3779b9);
  const mushrooms = composeRound(species, level, seed);
  const fork = level >= 2;
  const n = mushrooms.length;
  const nA = fork ? Math.floor((n - 2) / 2) : n;          // before the fork
  const nBranch = fork ? 2 : 0;                           // both branches carry the same count
  return { mushrooms, fork, nA, nBranch, nB: n - nA - nBranch, r, level, seed };
}

/** First part of the world (start → fork sign, or the whole walk at Level 1). */
export function buildStart(chain, plan) {
  const { r, nA, fork } = plan;
  const lenA = 700 + nA * SPACING[1] + (fork ? 900 : 1500);
  const count = Math.ceil(lenA / SEG_STEP);
  chain.append(trunkSegments(count, r, { endFlat: true }));
  chain.prepend('flat');
  const xs = spread(chain, 900, nA, r);
  const last = xs[xs.length - 1] || 0;
  const items = plan.mushrooms.slice(0, nA).map((m, i) => ({ ...m, x: xs[i] }));
  if (!fork) {
    chain.trimTo(last + 1100);
    while (chain.end < last + 1100 + 650) chain.append(['flat']);
    return { items, endX: last + 1100, forkX: null };
  }
  // fork sign on the last (flat) trunk segment, ≈ one spacing after the last mushroom
  chain.trimTo(last + 600);
  while (chain.end - 420 < last + 900) chain.append(['flat']);
  return { items, forkX: chain.end - 420, endX: null };
}

/** After the choice: the branch, then the rest of the trunk and the end clearing. */
export function buildAfterFork(chain, plan, side) {
  const { r, nA, nBranch, nB } = plan;
  const b0 = chain.end;
  chain.append(BRANCHES[side]);
  const xsBranch = spread(chain, b0 + 500, nBranch, r);
  const b1 = chain.end;
  const lenB = 500 + nB * SPACING[1] + 1500;
  chain.append(trunkSegments(Math.ceil(lenB / SEG_STEP), r, { endFlat: true, brookOk: side === 'up' }));
  const xsB = spread(chain, b1 + 300, nB, r);
  const all = plan.mushrooms.slice(nA);
  const xs = [...xsBranch, ...xsB];
  const items = all.map((m, i) => ({ ...m, x: xs[i], branch: i < nBranch ? side : null }));
  const last = xs[xs.length - 1];
  chain.trimTo(last + 1100);
  while (chain.end < last + 1100 + 650) chain.append(['flat']);
  return { items, endX: last + 1100 };
}
