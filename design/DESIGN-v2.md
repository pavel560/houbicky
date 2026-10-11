# Houbičky v2: design spec (levels, „Výprava do lesa“, 25 species)

Designer · 2026-10-11 · branch `v2`. A personal children's surface: no fleet register, no `ph.json`; tokens-only discipline inside the app (`design/tokens.css`). This file extends `DESIGN.md` (v1). Everything there still holds unless a section below replaces it.

**Verdict.** v2 has one idea: **the forest grows with the child.**
- **Level 1** is a small forest of 8 friends whose faces hint at the group.
- **Completing that album** physically opens the forest. The Les panorama widens to the right, 17 new characters appear, the faces go neutral (Level 2), and the hedgehog guide invites her on the first **Výprava do lesa**: a 2D side-scrolling walk („like Mario“, with parallax depth) along forest trails, where she has to *find* mushrooms, not just see them.
- **Level 3** removes the drawings and uses the real photos.

Every step up is a place she can see, not a menu setting.

| Artefact | What it is |
|---|---|
| `design/DESIGN-v2.md` | this spec |
| `design/tokens.css` | + `--level-1..3`, `--locked*`, Výprava motion tokens (reduced-motion aware) |
| `design/build_art.py` | + 12 new species, `.host` group and `data-pick-box` for wood growers, `LOOK` table for 25 |
| `design/build_scene.py` | Les panorama widened to 3600 with one slot per species; + 7 icons (level rosettes, locks, Výprava, footsteps, magnifier); zone now has its own seed |
| `design/build_vyprava.py` | props + characters for Výprava → `art/vyprava/*.svg` (moss, rocks, stumps, ferns, leaf piles, roots, animals, bubble, sparkle, hedgehog; its 3D flats/tiles are shelved) |
| `art/<id>.svg` | 12 new characters: `vaclavka hrib-kovar hrib-satan klouzek ryzec sirovec lisak kotrc pestrec muchomurka-jizliva listicka troudnatec-pasovany` |
| `art/vyprava/` | backdrop, 4 trees, fern, blueberry, stump, log, rock, leaf pile (back + front), signpost, stop bubble, sparkle, shadow, ground tile, path tile, hedgehog guide |
| `design/contact-sheet.png` | all 25 characters with level, twin and edibility (2×) |
| `design/build_side.py` | **new (v2.2)**: the 2D side-scroll kit → `art/vyprava/side-*.svg` (sky, far, mid, front, 5 ground segments, child, hedgehog walk, fork sign) |
| `design/comp-vyprava.png` | the walk v2.2 (2D): child + hedgehog climbing a hill on the trail, hřib in moss half behind a fern, liška on a mossy rock, fly agaric at a stump with the stop bubble, a deer leaping in the mid layer, basket + back + „Dál“ (1024×768 @2×) |
| `design/comp-vyprava-end.png` | the hedgehog checking the basket (1024×768 @2×) |
| `design/comp-levels.png` | A: Les at L1 with the locked 4th door · B: level picker · C: unlock ceremony (3 × 1024×768) |

All generators are deterministic, stdlib-only Python. Rebuilding twice gives byte-identical SVGs (verified). The 12 v1 characters other than pýchavka are byte-identical to the shipped files. Pýchavka changed only in its invisible anchors (see §6.2).

---

## 1. Safety rules added in v2 (on top of v1 §2)

1. **Poisonous mushrooms are never picked up.**
   - Tapping one gives the „Nesahej na mě!“ reaction (§4.6). There is no lift, no drag and no basket button.
   - Nothing about a poisonous mushroom is ever rewarded: no star, no sparkle, no confetti.
2. **Muchomůrky are taught as a whole: „nesbíráme“.** The researcher kept no edible amanita, and the art supports this. All four amanitas share the sly face, the white skirt ring, the bulb and the red „!“ marks.
3. **Cooked-only species** (václavka, kovář) are still drawn happy; the card's `caution` says „Jí se jen uvařená. Rozhodne dospělý.“ In the end check, the hedgehog's line for these species adds „…a uvaří ji dospělý.“ (new phrase id, §7).
4. **The end check never says „špatně“.** An inedible mushroom in the basket gets the twin card and „Ta se nejí, necháme ji v lese.“ The basket is never emptied as a punishment.
5. **The adult line stays on every end screen:** „Houby sbíráme jen s dospělým“ with the parents icon (see `comp-vyprava-end.png`).

## 2. Information architecture (lightweight pass, as in v1)

**App map v2** (max depth still 2):
```
Les (hub) ── tap character ──► Kartička (+ Dvojník L2)
   ├─ level chip (top-left, rosette) ──► Úroveň sheet (L2 overlay)
   ├─ door ► Do košíku!
   ├─ door ► Kvíz
   ├─ door ► Album            (pages grow with the level)
   ├─ door ► Výprava do lesa  (NEW, 4th door; locked until 8 stickers)
   └─ hold 3 s ► Rodiče        (+ manual unlocks)
```

| Screen | Hero | T1: without reading | T2: on tap | Demoted (named) |
|---|---|---|---|---|
| **Les** | the forest + characters | tap a character; pan | 4 doors; level chip | progress pill; parents icon. **Demoted:** the level *name* is spoken on tap, not shown |
| **Úroveň sheet** | three level cards, each with a preview of what changes | tap an unlocked card | tap a locked card → spoken hint of what is missing | numbers (gold count is a dot row) |
| **Výprava** | the path ahead and the mushroom at this stop | tap a mushroom; tap „Dál“ | speaker = repeat; tap the hedgehog = hint | trail dots, basket count. **Demoted:** score, timer and map (none exist) |
| **Výprava end** | the hedgehog + the cloth with her finds | listen; tap ✓ | speaker | stars |
| **Album** | sticker pages | tap a sticker → card | page turn | gold dots row |

## 3. Difficulty levels

### 3.1 Picking a level (child and parent)
- **Level chip:** a 64 px round button directly right of the language flag, showing only the current rosette (`i-level-1..3`). The name is spoken on tap; she cannot read it anyway, and a text pill collided with the 4-door tray at 1024 px (seen in the first comp, fixed).
- **Úroveň sheet** (`comp-levels.png` B): an overlay card over the dimmed Les with three cards. Each card shows:
  - the rosette, 120 px;
  - the name (Grandstander 26 px);
  - a **preview of the same mushroom** that shows the change: L1 hřib with a happy face · L2 hřib with a neutral face · L3 a Polaroid photo frame. A non-reader understands "faces go away, then photos" from the pictures alone;
  - a one-line Andika note for the parent („8 hub · obličeje radí“, „25 hub · dvojníci“).

  The current level has a gold glow and a check. Tapping an unlocked card switches level (`success` sound + `ui.level.N`) and closes the sheet.
- **Locked card:**
  - the card fill becomes `--locked-fill`, and the rosette and preview are desaturated to 45 %;
  - an 84 px padlock (`i-lock`) sits over the preview, never over the name;
  - a progress row of 25 dots, gold when that species is gold;
  - tapping it speaks what is missing („Ještě 11 zlatých nálepek a budeš Mistr houbař.“, new phrase).
- **Going down is always allowed.** A child who finds L2 hard can return to L1 at any time; stickers and gold are never lost.
- **Parent:** the existing Rodiče switches (manual unlock of L2, L3 and Výprava) stay as the programmer built them.

### 3.2 Unlock rules (the designer's proposal; constants live in `js/levels.js`)
| Unlock | Rule | Why |
|---|---|---|
| **Level 2 + Výprava** | **8 stickers = the complete Level-1 album** (`UNLOCK_STICKERS = VYPRAVA_STICKERS = 8`, as built) | They fire at the same moment, so they become **one ceremony with two gifts** (§3.3). Two separate celebrations a second apart would blur both |
| **Level 3** | **20 of the 25 species gold, where gold was earned at Level ≥ 2** | 25/25 would let one rare species (hřib satan) block her for weeks. Gold earned with mood faces at L1 should not count toward the "no hints" level. *Needs a small change:* `mastery[id]` records the level at which each game was won (e.g. `kosik: 2`), and `goldCount` filters `≥ 2`. Today `isGold` is level-agnostic and L3 requires `goldCount(2) >= 25` |

### 3.3 The unlock ceremony (`comp-levels.png` C)
Triggered on returning to Les after the 8th sticker. It is never mid-game, so the album celebration finishes first. Total `--t-unlock` 3.2 s, then it waits for a tap.
1. **0–400 ms:** Les dims to 35 %. The new rosette (260 px) springs in from scale 0 (`--ease-spring`) over a slowly rotating ray burst (one turn per 20 s). Sound: rising marimba; voice „Jsi Houbař!“.
2. **400–1600 ms:** leaf confetti (`js/confetti.js`). Title „Jsi Houbař!“ in Grandstander 54 px, white with an ink outline.
3. **1600–2600 ms:** the gift card slides up from the bottom-right: the Výprava door icon, the hedgehog (idle → happy) and „Výprava je otevřená!“ Voice: the hedgehog's intro line.
4. **On tap:** the overlay fades. The **camera glides right** from the current pan to x = 2400 (`--t-step`) so she sees the new part of the forest. The 17 new characters pop up one by one, 80 ms stagger, a small hop each. The 4th door loses its padlock with an „unlock“ click (`i-lock` → `i-lock-open` crossfade, then hide).
5. **Level 3** uses the same ceremony with the gold rosette and „Jsi Mistr houbař!“. The gift is the photos: the card preview flips to a photo.
- **Reduced motion:** steps 1–3 appear as one static frame for 1.5 s; no camera glide (jump cut).

### 3.4 What changes per level, per screen
| Screen | Level 1 Malý houbař | Level 2 Houbař | Level 3 Mistr houbař |
|---|---|---|---|
| **Les** | 8 characters, pan limited to 0–2400 (`data-pano-l1`), mood faces + `.warn` | 25 characters, pan 0–3600, **neutral faces, `.warn` hidden** | as L2 |
| **Kartička** | mood faces, 3 pins | neutral face on the front; Dvojník button for every species with a `twin` | front = **photo first** (if approved), drawing on flip; pins move to the drawing side |
| **Do košíku** | 6 per round, ≥ 2 not edible, ≤ 1 deadly, mood faces | neutral faces; ≥ 1 twin pair per round (as built: `pickRound(level2)`) | photos as pieces (round-cropped, 4 px paper border); twins |
| **Kvíz** | 3 choices from different groups | twins as choices (as built) | twins + the **group question** after the correct name: three big badges (circle ✓ / square ✗ / triangle !); the answer is spoken |
| **Album** | only the 8 L1 slots (2 pages, less empty space) | 25 slots; the album "grows" new pages at the unlock (§5.2) | as L2; stickers with an approved photo get a small photo corner |
| **Výprava** | 8 mushrooms per walk, ≤ 2 hidden, mood faces, no twins at the same stop | 10 mushrooms, ~half hidden, neutral faces, **twins placed at neighbouring stops** (liška → lištička) | as L2 + photo pop-up on pick + group question before the basket |

## 4. „Výprava do lesa“

### 4.1 Placement: the 4th door on Les
The 4th door in the existing tray reads „Výprava“, with icon `i-vyprava` (spruce + footprints). The tray grows from 3 to 4 doors and still fits at 1024 px (`comp-levels.png` A).

**Locked state:**
- the door fill becomes `--paper-deep`, and its ink and label become `--locked`;
- a 34 px padlock badge sits top-right;
- a **progress ring** (7 px, `--star`) runs around the door, showing stickers out of 8.

Tapping it while locked: the hedgehog peeks up from the bottom edge of the screen for 2 s and says „Ještě 3 nálepky do alba a půjdeme na výpravu!“ (new phrase).

### 4.2 Concept (v2.2, parent's decision 2026-10-11): a 2D side-scrolling walk with depth
The walk is a **picture book you scroll through, left → right, „like Mario“** — the child's avatar and the hedgehog walk along a narrow trail seen **in profile**, over gentle hills and down to a brook, with the forest in **parallax layers** behind and ferns/grass passing **in front**. No first-person camera (car-sickness risk when playing in the car), no 3D library; SVG/DOM or canvas 2D. Our characters are drawn side-on, so they sit naturally in this world. The v2.0/2.1 three.js kit (`art/vyprava/backdrop`, `trail-narrow`, `ground-tile`, `path-tile`, `tree-*` flats) is **shelved**; the props (moss, rocks, stumps, ferns, leaf piles, roots, animals, bubble, sparkle, signpost, hedgehog) are reused as 2D side-view sprites.

**Stage:** 1000 units tall, like the Les panorama; the visible window is `vbW = 1000 × screenW / screenH` units wide (1333 on iPad landscape). The camera scrolls x and gently follows the trail height (§4.4).

### 4.3 Layer stack (back → front) and assets
| # | Layer | File(s) | Parallax (× camera x) | Notes |
|---|---|---|---|---|
| 1 | sky | `side-sky.svg` (1600×1000, `slice`) | 0 (fixed) | sun glow upper right, clouds |
| 2 | far forest + hills | `side-far.svg` (2048, seamless x) | **0.15** | misty blue-grey spruce rows, haze |
| 3 | mid forest | `side-mid.svg` (2048, seamless x, `data-run-y="650"`) | **0.45** | beech/birch/spruce on a forest-floor band; **animals run here** (§4.10); light haze so the play layer pops |
| 4 | play ground | `side-ground-{flat,up,crest,down,brook}.svg` (1024 each) | **1** | groups `.back` (mossy bank) / `.trail` (packed earth band) / `.front` (soil face, roots, stones, grass lip) |
| 5 | props + mushrooms | `moss-cushion-1..3`, `moss-collar`, `rock-mossy-1..3`, `stump`, `log`, `roots-flare`, `fern`, `blueberry`, `leafpile-back/-front`, `art/<id>.svg` | 1 | stand on the **surface line** (back edge of the trail) |
| 6 | actors | `side-child.svg`, `side-jezek.svg` | 1 | walk **on** the trail: foot y = surface + `data-walk-dy` (17) |
| 7 | play-front cover | `fern.svg`, `blueberry.svg`, `leafpile-front.svg`, `moss-collar.svg` | 1 | placed just in front of a mushroom to hide it partly |
| 8 | foreground strip | `side-front.svg` (2048×360, seamless x, bottom-anchored) | **1.35** | ferns, grass, leaves sliding past in front; covers the lower soil |
| — | UI | HUD (DOM) | — | see §4.4 |

**Seamless tiling (verified on a 3-tile render):** far/mid/front are periodic over 2048 units (integer-cycle waves; objects crossing an edge are drawn twice). Ground segments chain: segment *n+1* is shifted vertically by `prev.data-y-out − next.data-y-in`; surface slope is 0 at every edge and all bands are offsets of the surface, so any order joins smoothly. Each segment overlaps its neighbour by 2 units (hides the anti-aliasing hairline seen in the first comp). `data-profile` = surface y every 64 units (17 values) for placing actors/props by linear interpolation.

**Segments:** `flat` (gentle wobble), `up` (climbs 150), `crest` (a small rounded top), `down` (descends 150), `brook` (a little stream crossing the trail with stones and a plank bridge `.bridge`, ripples `.ripple` to animate). Trail band 30 units thick, lit front edge; the back bank carries moss tufts + litter; the soil face has strata, roots, stones and a grass lip.

**Scale:** child 300 units tall (`side-child.svg` drawn at 0.75), hedgehog ≈ 170 wide, mushrooms `art/<id>.svg` at 0.5–0.6 (≈ 140–165 units), moss cushion ≈ 200 wide, rock slab ≈ 250 wide, stump ≈ 190 wide.

### 4.4 Walking and controls
- **„Dál“**: a big 124 px round arrow (`i-arrow-right`, gold) bottom-right. **Hold = walk** (the avatar walks while the finger is down); **tap = walk to the next stop**. Walk speed ≈ 180 units/s (a 1333-wide screen in ≈ 7 s), easing in/out 300 ms.
- **Back**: a smaller 64 px `i-arrow-left` (bottom, left of centre), allowed but optional; walking back never undoes a decision.
- **Stops:** each mushroom has a stop x a little before it; the avatar halts there automatically (`look` pose, the hedgehog sits), the mushroom is tappable. „Dál“ works again after the mushroom is decided/warned (as before). Hidden mushrooms are found on the way; if she walks past one without finding it, the hedgehog stops her once: „Počkej, něco tu je!“ (new phrase) — nothing is ever missed silently.
- **Camera:** x keeps the avatar at ≈ 38 % of the screen width (more forest ahead than behind); y follows the trail height with a 0.6 s lag, so the trail stays at ≈ 62–70 % of the screen height — hills read as climbing, not as a scrolling floor. No camera shake, no bob.
- **HUD:** home (top-left), trail dots (top centre), speaker (top-right), basket + count (bottom-left), back arrow, „Dál“.
- **Reduced motion:** the far/mid/front parallax becomes 0 / 0.2 / 1 (no fast foreground slide), walking is a short 250 ms crossfade jump between stops, no avatar bob, animals stand still (§4.10).

### 4.5 Avatar, companion, where mushrooms grow
**The forager child (`side-child.svg`)** — a generic storybook child, not anyone in particular: big round head, orange knit hat with a cream bobble (the hat hides the hair, which keeps it gender-neutral), blue raincoat, purple-grey trousers, green rubber boots, a small wicker basket on the arm. Facing right, foot at (150, 384). Pose groups, show one:
`idle`, `walk-1..4` (contact – pass – contact – pass, swap at 8 fps while walking), `pick` (crouches, puts the basket down, reaches toward the mushroom), `look` (leans forward, hand shading the eyes — used at a stop and when a hidden mushroom is near).

**The hedgehog companion (`side-jezek.svg`)** — the same Ježek as the end check, trotting **behind** the child (≈ 160 units, same trail line). `.feet.pose-idle|walk-1..4` swap at 10 fps; `.expr-*` and `.arm-explain` as in §4.7, so it can talk while it walks (hints, „Kudy půjdeme?“). It sits down (idle feet) at every stop.

**Where mushrooms grow** (always in a habitat, never on the bare trail; all stand on the surface line):
| Habitat | Assets | Rule |
|---|---|---|
| in moss | `moss-cushion-*` behind, `moss-collar` in front of the foot | the classic: hřib, kozák, křemenáč, klouzek, muchomůrky |
| on / by a rock | `rock-mossy-2` slab (`data-top`) for small species; foot of `rock-mossy-1/3` | liška, lištička, pýchavka, pestřec |
| at a stump / log / roots | `stump`, `log`, `roots-flare` | wood growers always here; fly agaric/satan at roots |
| partly hidden | `fern`, `blueberry` or `leafpile-front` placed **in front** (play-front layer); deep moss | ≥ 40 % of the cap visible; hint ladder as before (sparkle 12 s → hedgehog line 25 s: „…do listí / do mechu / za kapradí / u pařezu / u kamene“) |

### 4.6 Tapping a mushroom
**Edible or inedible:**
1. The child switches to `pick` beside it; the mushroom lifts 20 units, tilts −5° and gains a gold ground ring. Its name is spoken.
2. Two 88 px buttons appear beside it, never over it: „Do košíku“ (`i-basket`, `--edible-soft`) and „Nechat v lese“ (`i-hand-stop`). The labels are spoken on first appearance. At L3, the group question (three badges) comes first.
3. **Do košíku:** the mushroom hops into the child's basket and then flies as a small copy into the HUD basket (`--t-pick`, `--ease-in` then `--ease-bounce`), landing between `#basket-back` and `#basket-front`.
   - Wood growers go in as their `data-pick-box` crop with `.host` hidden (sírovec shelf, kotrč ball, václavka tuft); see the basket in `comp-vyprava.png`.
   - The basket count pill bumps.
   - **No judgement now**, edible or not. Judgement happens at the end, with the hedgehog.
4. **Nechat v lese:** it sets down, nods, and gets a star if it was inedible.

**Poisonous („Nesahej na mě!“):**
- **No lift and no buttons.** The character leans back (rotate +8° around its foot, 200 ms) and its `.warn` marks scale 1.25 and pulse ×3.
- `stop-bubble.svg` springs in above the cap (`--t-warn`, `--ease-spring`).
- The voice says the existing `vyprava.warn` „Nesahej na mě! Jsem jedovatá.“; deadly species add „Jsem smrtelně jedovatá.“ (new phrase).
- At L2+ (neutral faces) the reaction still plays, but the **warn marks appear only now**. The warning is the reaction, not the look.
- „Dál“ enables after the bubble. No star, no penalty.

### 4.7 The guide: Ježek (hedgehog)
**Why a hedgehog:**
- native, common in Czech gardens and forest edges, and instantly readable at small size;
- the round silhouette fits the cast;
- unlike a squirrel (squirrels really do eat and cache fungi, including fly agaric), a hedgehog does not plant the idea "the animal ate it, so it is fine";
- it carries a little green satchel and a magnifier, so it is a *checker*, not a forager.

`guide-jezek.svg`: root `data-expr`.
- **Expression groups:** `.expr-idle` (default), `.expr-happy` (closed smiling eyes, open smile, strong cheeks), `.expr-explain` (one brow up, talking "o" mouth, plus `.arm-explain` raising the magnifier), `.expr-concern` (sad brows, flat mouth; used for the poisonous moment *of the child's attempt*, never at the child).
- **Other groups:** `.arm-rest`, `.arm-explain`, `.eyes` (blink), `.head`, `.body`, `.shadow`.
- **CSS switch:**
```css
.vy .expr, .vy .arm-explain { display: none; }
.vy[data-expr="idle"] .expr-idle, .vy[data-expr="happy"] .expr-happy,
.vy[data-expr="explain"] .expr-explain, .vy[data-expr="concern"] .expr-concern { display: inline; }
.vy[data-expr="explain"] .arm-explain { display: inline; }
.vy[data-expr="explain"] .arm-rest { display: none; }
```
- **Where it appears:**
  - **Intro:** walks in from the left (DOM, 600 ms, a little waddle: rotate ±3° at 4 Hz). Says `vyprava.intro` with `explain`, then shrinks into the HUD corner (190 px).
  - **During the walk:** idle in the HUD (blinking, breathing). Tapping it repeats the current hint.
  - **End:** big, at the clearing.
- **Motion:** blink as for the characters; `happy` adds a 2-hop bounce; `explain` bobs the magnifier ±4° on speech peaks.

### 4.8 The end check (`comp-vyprava-end.png`)
At the signpost clearing:
1. A gingham cloth (the same green check as the basket) unrolls on the ground (500 ms).
2. The finds are laid out **one by one** (500 ms apart, each a hop), using their pick crops, ground hidden.
3. **For each find:** the hedgehog points with the magnifier and names it.
   - **Edible:** `happy`, a star flies to the stars pill, „Hřib smrkový — do košíku!“.
   - **Cooked-only:** adds „…a uvaří ji dospělý.“
   - **Inedible:** `explain`. That piece glows (gold outer glow, not red), and the **twin card** opens above it: the twin pair side by side, each with name and edibility badge, the ✕ between them. This is the Dvojník panel reused.
     - The voice explains the decisive difference, e.g. „To je lištička. Je oranžovější a má husté lupínky. Ta se nejí, necháme ji v lese.“
     - The piece hops off the cloth back into the forest. No star, but nothing is taken away either.
4. **Finale:**
   - the hedgehog goes `happy`; leaf confetti;
   - stars total in the pill;
   - the adult line;
   - two buttons: „Ještě jednou“ (`i-retry`) and Home.
   - Stickers for any species she met but did not have yet are added (the same fly-to-album moment as v1).

### 4.9 Round composition (for the programmer's generator)
- **Count:** 8 stations at L1 and 10 at L2/L3. About 60 % edible, ≥ 2 poisonous (≥ 1 at L1 is a red or green amanita), ≥ 1 inedible.
- **Wood growers** stand at the foot of a stump or tree flat, never in the open.
- **Habitat flavour, optional:** klouzek with larch needles (already in its ground patch; place it near a birch or spruce flat); kotrč and lištička near spruce or pine flats.
- **Performance budget (2D):** ≤ 40 inline SVG/sprites in view; rasterise the parallax tiles and ground segments once to bitmaps (2× DPR) if SVG scrolling drops below 60 fps on iPad 9th gen; move layers with `transform: translate3d` only.
- **v2.2 (2D):** stations = stops along the scrolled trail (§4.12); habitat mix as below.
- **v2.1 composition:** per walk ≥ 3 moss mushrooms, ≥ 1 on/at a rock, ≥ 1 at wood; ≥ 2 hidden at L2+; a fork in ≈ every other walk at L2+ (none at L1 by default — fewer decisions for the youngest).

### 4.10 Animals crossing (2D)
- **Who:** `srnka`, `zajic`, `veverka` (4-pose run cycles, facing right; mirror for leftward runs).
- **Where:** in the **mid layer** (parallax 0.45), feet on `data-run-y` (650), crossing the screen horizontally — the deer in 2–3 bounds (pose 3 = flight held longer at the top of a parabolic hop), the hare low and fast with one zig-zag stop, the squirrel runs and climbs a mid-layer trunk. Enter and leave off-screen or behind a trunk.
- **When:** 1–2 per round, only while walking (never at a stop, a decision, a warning or the end check); not in the first 20 s. Pose swap 10–12 fps, crossing time 2–3 s.
- **Tap:** freezes the animal in pose 1 for 1.2 s, it says its name („Srnka!“ / „Zajíc!“ / „Veverka!“), chime, runs on. Optional, never scored.
- **Safety:** never near a mushroom (≥ 300 units away horizontally from any mushroom on screen), never holding/eating one; the squirrel is only a passer-by.
- **Reduced motion:** no runs; an animal may stand still half behind a trunk at a stop (pose 1), tappable the same way.

### 4.11 The fork (from Level 2, once per round)
At about half of the round a **fork signpost** (`side-fork-sign.svg`: a hill arrow up, a wave arrow down) stands by the trail. The walk stops; „Dál“ is replaced by **two big arrows**: `i-trail-up` (upper right, „Nahoru do kopce“) and `i-trail-down` (lower right, „Dolů k potůčku“). The voice asks „Kudy půjdeme?“. Up = `up` + `crest` segments, the hill branch (rocks, liška/lištička, kotrč by a pine); down = `down` + `brook` + `flat` (moss, klouzek, václavka/třepenitka by wet stumps). Both branches carry the **same number of mushrooms** and rejoin before the end clearing. Level 1: no fork.

### 4.12 Round length → scene length
A round is **8 mushrooms at L1, 10 at L2/L3, ≈ 3–4 minutes**. Budget per mushroom ≈ 20 s (walk 6–8 s + find/decide 10–14 s) + intro 10 s + end check 40–60 s. At 180 units/s walking that is ≈ **1 200–1 400 units between stops**, i.e. a round of ≈ **12–14 ground segments (≈ 13 000 units)**: e.g. flat, up, crest, down, flat, (fork) …, end clearing on a flat with the signpost. Generator rule: never two `up` or two `down` in a row without a `crest`/`flat` between (gentle hills), ≤ 1 brook per branch.

## 5. 25 species in Les and the Album

### 5.1 Les panorama (`art/scene-forest.svg`)
- **Width:** the panorama is now **3600** units (`data-pano="3600"`). Level 1 pans only 0–2400 (`data-pano-l1="2400"`).
  - The original composition stays on the left: the same hand-placed trees, path, log and ferns. Litter jitter was re-rolled because the RNG sequence changed.
  - New flats sit in the extension: 2 spruces, 2 birches, 1 beech, crowns, stones and 2 ferns.
- **Slots:** one invisible `circle.slot` per species, carrying `data-id` and `data-level`, so the programmer no longer needs `ORDER`. `les.js` already prefers `slot.dataset.id`.
  - Mid row: 12 slots at scale .6. Near row: 13 slots at scale .82.
  - **Level 1:** only `data-level="1"` slots are populated. They are evenly spread across 0–2400: hřib, zelená, liška, červená (near); sírovec, troudnatec, třepenitka, kotrč (mid). Groups are mixed, so there is no "poison corner".
  - **Twins are never adjacent,** so each is discovered separately.
- **Programmer changes:**
  - `js/scene.js` must read `PANO` from `data-pano` (currently the constant `2400`);
  - `pmax` uses `data-pano-l1` while the level is 1;
  - in `placeCharacters`, skip slots whose `data-level` is above the current level.
- **Size:** 248 KB, up from 180 KB, inlined once as before.
- **Verified views:** the full panorama with all 25, the L1 window and the extension window (§8).

### 5.2 Album
- **L1:** the 8 L1 stickers only, in the same two-page layout as v1 (Jedlé 4 · Nejedlé 1 · Jedovaté 3). No 17 grey ghosts at L1; that would be noise, not motivation.
- **L2+:** 25 slots on the two-page spread at 1024×768:
  - **left page Jedlé (14):** 4 columns × 4 rows, sticker cell ≈ 104 × 118 px;
  - **right page Nejedlé (4) and Jedovaté (7):** 4 columns, 1 row plus 2 rows, with group headers as in v1.

  At 1440 px the cells grow; above that the layout caps.
- **The album grows at the unlock:** the first time it is opened after L2 unlocks, the new slots appear with a page-unfold animation (each new silhouette pops in, 40 ms stagger) and the voice says „Album má nové stránky!“ (new phrase).
- **Twin hint (L2+):** a small 20 px chain-link glyph sits between twin stickers that are on the same page. Tapping it opens the Dvojník panel. *(Optional; drop it if the grid gets busy.)*
- **Progress:** the header dot row becomes 25 dots at L2 (gold dot = gold sticker), as now.

## 6. Art contract additions

### 6.1 New characters
Same contract as v1 (`DESIGN.md` §8.1): `svg.shroom[data-id][data-group][data-deadly][data-pivot]`, groups `.shadow .ground .body > .under .stem(.face) .cap`, `.warn` on poisonous species, and invisible `circle.anchor[data-feature][data-look]`. Sizes are 9.9–18.3 KB. Ids are prefixed per species, so all 25 can be inlined together (verified: no cross-file duplicates).

**Moods:**
- edible: happy;
- inedible: lištička gets **bleh** (wavy mouth, one eye squeezed; it is the "fake liška"); troudnatec pásovaný gets **sleepy** (woody, like troudnatec);
- poisonous: sly + `.warn`, including **pestřec** and **satan**.

**New opt-in features:**
- `.host`: the wood a species grows on. **Hide it in basket pieces.** It is present in `sirovec`, `kotrc` and `vaclavka`; the v1 wood species keep the old structure.
- `data-pick-box="x y w h"`: the crop of the piece that goes into the basket, in viewBox units, on `sirovec`, `kotrc` and `vaclavka`. Other edible species use their full art minus `.ground`.

**Compound-structure exceptions** (like v1 `pychavka`, `troudnatec`, `trepenitka`):
- `vaclavka`: tuft on a stump (stump in `.stem > .host`), cottony rings on every stem, dark scales on the honey caps.
- `sirovec`: three fan shelves in `.cap`, trunk in `.stem > .host`, sulphur undersides in `.cap`; empty `.under`.
- `kotrc`: pine stump in `.stem > .host`; the lobed ball is in `.stem` too (empty `.cap` and `.under`). Bounce `.body`.
- `pestrec`: everything is in `.stem`, like pýchavka. The top split shows the purple-black inside (`#2b1630`), the twin contrast to pýchavka's white.
- `ryzec`, `listicka`: like liška (funnel in `.cap`, gills in `.under`). Ryzec has its carrot-orange milk drop and green bruise stains; lištička has crowded thin forking gills.
- `troudnatec-pasovany`: like troudnatec (spruce stump in `.stem`, bracket and face in `.cap`). The bands run cream rim → red-orange resin band → dark brown-black top.
- `hrib-kovar`, `hrib-satan`, `klouzek`: bolete structure. Kovář has red pores, a dotted stem and a dark blue bruise; satan has a pale cap, red pores, a very bulbous stem with a yellow top and red net; klouzek has a slimy gloss, a slime drip, a ring and larch needles plus a cone on its ground patch.
- `muchomurka-jizliva`: amanita with a conical, slightly lopsided white cap, shaggy stem, skirt ring and volva. Deadly.

### 6.2 Anchors (`LOOK` in `build_art.py`, order = `lookFor` in `data/species.json` as of 2026-10-11)
| id | look 0 | look 1 | look 2 |
|---|---|---|---|
| vaclavka | on-wood | cap-scales | ring |
| hrib-kovar | cap | pores | stem-dots |
| klouzek | cap-slimy | pores | ring |
| ryzec | cap-rings | green-stain | stem-pits |
| sirovec | edge-yellow | stacked | on-tree |
| lisak | cap | spines | stem |
| kotrc | lobes | cream | no-stem |
| hrib-satan | cap | pores | net |
| pestrec | ball | cracked-skin | inside-dark |
| muchomurka-jizliva | gills | ring | volva |
| listicka | cap-orange | gills | rim-rolled |
| troudnatec-pasovany | on-wood | red-band | dark-top |
| **pychavka (v1, changed)** | no-gills | spines | **white** (was `top`; the researcher reworded look 2 to „Mladá je uvnitř celá bílá“) |

The build asserts that every mapped feature exists. A validation script confirmed that all 25 SVGs carry `data-look` 0…n−1 matching their `lookFor` length.

### 6.3 Colour reconciliation
Base cap colour vs `colors.cap` (CIELAB ΔE76): kovář 1.2, satan 0.4, jízlivá 2.4, kotrč 2.5, lišák 3.3, pestřec 5.2, ryzec 6.1, lištička 7.2, troudnatec pásovaný 8.8, václavka 9.3, klouzek 11.5, sírovec 15.0.
- **Sírovec** is deliberately two-tone (orange tops with sulphur-yellow rims and undersides); the data gives one averaged tone.
- **Klouzek** is drawn a little more orange-gold, to separate it from the yellow hřib/žlutý family at small size.

### 6.4 Icons added to `art/ui-icons.svg` (now 28 symbols)
- `i-level-1`, `i-level-2`, `i-level-3`: 12-lobe rosette (a new shape, distinct from all edibility shapes) filled with `var(--level-N)` (bronze, silver, gold), carrying 1/2/3 neutral generic mushroom glyphs, so a non-reader can count the level. Gold adds a small star.
- `i-lock`, `i-lock-open`, `i-vyprava` (spruce + footprints on a path), `i-footsteps` („Dál“), `i-magnifier`.

### 6.5 Tokens added (`tokens.css`)
- `--level-1..3`, `--locked`, `--locked-fill`;
- `--t-step` 1600, `--t-pick` 700, `--t-warn` 420, `--t-unlock` 3200 (ms), `--bob-amp` .02 m. All collapse under `prefers-reduced-motion`.

## 7. New phrases needed (for `js/phrases.js`; wording is a proposal, the programmer owns the catalogue)
| id (proposed) | CZ |
|---|---|
| `level.lockedHint3` | „Ještě {n} zlatých nálepek a budeš Mistr houbař.“ *(n is pre-rendered per count; phrases are not composed at runtime → 20 variants, or a generic „Sbírej zlaté nálepky a budeš Mistr houbař.“)* |
| `unlock.level2` | „Jsi Houbař! Les se ti otevřel dál.“ |
| `unlock.level3` | „Jsi Mistr houbař! Teď poznáš houby i z fotek.“ |
| `vyprava.lockedHint` | „Ještě pár nálepek do alba a půjdeme na výpravu!“ (generic, no number) |
| `vyprava.hint.leaves` / `.fern` / `.stump` | „Podívej se do listí!“ / „…za kapradí!“ / „…u pařezu!“ |
| `vyprava.fork` | „Kudy půjdeme?“ (+ `vyprava.fork.up` „Nahoru do kopce“, `vyprava.fork.down` „Dolů k potůčku“) |
| `vyprava.wait` | „Počkej, něco tu je!“ |
| `vyprava.hint.moss` / `.rock` | „Podívej se do mechu!“ / „…u kamene!“ |
| `animal.srnka` / `.zajic` / `.veverka` | „Srnka!“ / „Zajíc!“ / „Veverka!“ (EN „Roe deer!“ / „Hare!“ / „Squirrel!“) |
| `vyprava.warnDeadly` | „Jsem smrtelně jedovatá. Nikdy na mě nesahej!“ |
| `vyprava.cooked` | „…a uvaří ji dospělý.“ |
| `vyprava.twin.<id>` | one decisive-difference line per inedible species with an edible twin (from `caution`) |
| `album.newPages` | „Album má nové stránky!“ |

## 8. Sight-verification record
All renders were made with Playwright and Chromium, then looked at; the final PNGs are in this folder.
- **New characters, 4 passes.** Fixes made from the screenshots:
  1. Ryzec's gills and milk were hidden under the cap, so I lowered the band and enlarged the drop and stains.
  2. Sírovec's brackets read as flames, then as wedges, so they became rounded fan shelves.
  3. Lišák's spines were invisible, so I made a bigger spine field.
  4. Troudnatec pásovaný's face disappeared on the dark top, so the face moved onto a widened red resin band.
  5. Satan lacked its yellow stem top, so I added a top fade (opt-in `stem_top`).
  6. Kotrč's trunk ran off the top and read as a post in Les, so it became a cut pine stump.
  7. The anchor debug render confirmed every pin lands on its feature.
- **v1 regression check:** SHA-256 of all v1 art before and after. The 12 v1 characters other than pýchavka are byte-identical; pýchavka differs only in the anchors `<g>`.
- **Les:** the full 3600 panorama with all 25, the L1 iPad window (8 characters evenly spaced) and the extension window. Fix: `zone-les.svg` had changed through the shared RNG, so it now has its own seed.
- **Výprava kit:** overview sheet, all four hedgehog expressions, and both tiles.
  - The backdrop overflowed its box, so it is now clipped.
  - The blueberry read as scattered sticks, so it got a dark mound and denser leaves.
  - The explain paw crossed the face, so the magnifier moved below the snout.
- **`comp-vyprava.png` (v2.0, superseded):** a real CSS-3D composite (perspective 700 px, ground and path tiles on a rotated plane, every billboard sized by `P/(P+d)` from its `data-foot` / `data-height-m`).
  - The plane first rotated toward the camera and the backdrop was mis-scaled; both fixed.
  - Mushrooms were too small at 0.6 m, so they are now 0.9 m.
  - The leaf-pile z-order was inverted; fixed.
  - Trunks showed in the basket, so I added `.host` and `data-pick-box`.
- **v2.1 trail kit + `comp-vyprava.png` (superseded by v2.2):** kit overview + all 12 animal poses rendered and looked at. Fixes: moss cushions were flat slabs → domed with tufts over the whole surface; the moss collar was a trapezoid → lumpy top; the root flare was sticks → tapered roots. The comp is a real perspective projection of a winding, climbing heightfield (flat-shaded faces, moss/litter colour mix, fog) with the kit billboards placed by `data-foot`/`data-height-m`; iterations: the trees walled in the view → the trail corridor was cleared to 8 m, the hill was raised so the crest reads, the deer was moved onto the trail in its flight pose, and props were kept off the hero mushrooms. verified against screenshot at `design/comp-vyprava.png`.
- **v2.2 2D kit + `comp-vyprava.png` (replaced again):** seam test = far/mid/front tiled ×3 and a 6-segment ground chain (flat-up-crest-down-brook-flat), zoomed at the tile edge: no visible seam. Child: first version had adult proportions and the hat band covered the eye → bigger head (×1.22), shorter limbs, band raised; `look` hand moved to the brow. Comp iterations: a hairline seam where two ground segments meet → 2-unit overlap; the fly agaric was cut off at the right edge and the bubble covered the liška → items moved left, bubble lifted over the agaric; pinkish bush blobs in the mid layer → muted. verified against screenshot at `design/comp-vyprava.png`.
- **`comp-vyprava-end.png`:** the finds now stand on the cloth, not behind it, and the mistake sits under the magnifier.
- **`comp-levels.png`:** the level text pill collided with the 4-door tray, so it became rosette-only. The padlock covered the "Mistr houbař" title, and the title overlapped the gift card; both moved.
- **Final artefacts:**
  - verified against screenshot at `design/contact-sheet.png`
  - verified against screenshot at `design/comp-vyprava.png`
  - verified against screenshot at `design/comp-vyprava-end.png`
  - verified against screenshot at `design/comp-levels.png`
- **Not verified:**
  - real-time motion (the comps are static composites; the motion in §3.3 and §4 is a spec);
  - the 1180 / 1440 widths for the new screens (the programmer's `dev/screens` run should add them).

## 9. Open questions
**For the programmer**
1. Level-3 rule: recording the level at which gold was earned (§3.2) needs a store migration. Fine, or keep "all gold, any level" and accept that L1 wins count?
2. `scene.js`: replace the constant `PANO` with `data-pano` / `data-pano-l1` (§5.1).
3. ~~Hedgehog as a DOM overlay over WebGL~~ — moot after the 2D decision: in 2D the hedgehog is an inline SVG actor in the play layer.

**For the parent (product owner)**

4. Level 3 at **20 / 25** gold (my recommendation) or the brief's "zlaté album" (25 / 25)?
5. The hedgehog guide: does it need a name? I left it as „Ježek“ (no nickname), consistent with v1's advice to keep real names primary.
