# Houbičky: design spec

Designer · 2026-10-11 · Personal family surface, **outside the fleet registers**: no ph.json, no LIVE_REGISTER row, no design-baseline compile (per brief). Tokens-only discipline holds inside the app: every colour, size and duration comes from `design/tokens.css`.

**Verdict.** The game is a living autumn picture-book page. Every mushroom is a character whose facial mood is the safety lesson: edible friends smile, inedible grumps pull a face or doze, and poisonous tricksters smirk under red „Pozor!“ marks. The real identifying features are drawn with botanical care and carry numbered pins, so the mood helps her remember the group and the pins teach her the mushroom.

Files in this folder:

| File | What it is |
|---|---|
| `DESIGN.md` | This spec: concept, safety rules, IA, screen layouts, interaction and animation, art contract |
| `tokens.css` | CSS custom properties: palette, edibility language, type, space, radii, shadows, motion |
| `build_art.py` | Generator of the 13 character SVGs (deterministic, stdlib only). Run `python3 design/build_art.py` |
| `build_scene.py` | Generator of the forest, basket, zone and icon sprite. Run `python3 design/build_scene.py` |
| `contact-sheet.png` | All 13 characters with names, badges and fonts (sight-check, 2×) |
| `comp-les.png`, `comp-card-hrib-smrkovy.png`, `comp-card-muchomurka-zelena.png`, `comp-do-kosiku.png` | Target comps at iPad landscape 1024×768. The programmer builds these screens; the comps are the visual target, not code |

Art lives in `../art/`: 13 × `<id>.svg`, `scene-forest.svg`, `basket.svg` (+ `basket-back.svg`, `basket-front.svg`), `zone-les.svg`, `ui-icons.svg`.

---

## 1. Concept: „Kamarádi z podzimního lesa“

**One idea:** *the face is the lesson, the pins are the knowledge.* A 5-year-old remembers characters long before she remembers features. So each species is a character whose expression places it in its group at a glance, and whose 2–3 identifying features are pointed at, named and spoken.

**Visual direction: a Czech storybook at golden hour, not clip-art.**
- Lineage: the warm, flat-but-painterly forests of Czech animated storybooks (Zdeněk Miler's Krtek backgrounds, Josef Lada's warm colour fields), lit by a late-October sun low on the right. *[Designer's reference choice, not a claim about either artist's palette.]*
- **Ink:** warm umber `--ink #3b2417` at 3 px on characters and UI (never black). Hand-drawn feel comes from slightly jittered outlines, varied inner line weights and texture speckles on caps.
- **Volume:** gouache-style. Caps carry a radial light from the upper left plus a soft highlight crescent; stems are lit like cylinders. No glossy 3D and no neon.
- **Depth:** the scene has four planes (sky, misty far spruces, inked mid trees, inked forest floor). Atmospheric perspective means the far layer has no ink and sits under a warm haze, while everything you can touch is inked.
- **Paper:** UI surfaces are warm paper (`--paper`) with a paper-edge shadow, like cut-out cards lying on the forest.
- **Restraint where it matters:** the palette is autumn (rust, gold, moss, spruce). **Red is reserved for poison.** Mistakes are never red; they are amber (`--try-again`).

## 2. Safety rules baked into the design (non-negotiable)

1. **Nothing suggests eating.** No plates, forks, cooking, licking lips or "yummy" faces. The basket means *collecting with an adult*. The edible card always carries the line „Houby sbíráme jen s dospělým“ with the parents icon, under the verdict (see `comp-card-hrib-smrkovy.png`).
2. **Poisonous species never look more appealing than edible ones.** They get a smug, half-lidded face, no rosy cheeks and the red „Pozor!“ marks. Edible ones are the warm, open-faced friends.
3. **Deadly is double-coded:** an octagon skull badge, hazard-stripe card frame, the ribbon „POZOR! SMRTELNĚ JEDOVATÁ · NIKDY NESAHAT“, and a spoken warning. It never flashes (photosensitivity) and is never frightening (no gore, no dead characters).
4. **Lookalike pairs are always cross-referenced.** A „Dvojník“ panel covers hřib ↔ žlučník, bedla ↔ muchomůrka zelená, and bedla ↔ muchomůrka tygrovaná (§6.2).
5. **Edible ≠ "you may eat it".** The game verb for edible is „Do košíku“ (into the basket), never „jíst“. The parents' corner repeats the BRIEF sentence verbatim.

## 3. Character design decision: mood encodes the group

| Group | Face (`data-group`) | Species | Why |
|---|---|---|---|
| jedlá | **happy**: open round eyes with a highlight, raised brows, open smile, rosy cheeks | hřib smrkový, liška, bedla, kozák, křemenáč, hřib hnědý, pýchavka | Friendly, approachable, "a friend you bring home with Daddy" |
| nejedlá: bitter | **bleh**: one eye squeezed shut, wavy mouth, little green tongue out | žlučník („Hořčák“) | Bitter is the actual reason it is inedible, so the face *is* the fact |
| nejedlá: woody | **sleepy**: half-closed lids, small mouth | troudnatec („Kopýtko“) | Hard as wood and boring to eat; calm, not scary |
| jedovatá (incl. deadly) | **sly**: flat half-lids, one brow raised, sideways smirk, no cheeks, plus the `.warn` group (two red „!“ marks) | muchomůrka červená, zelená, tygrovaná, třepenitka | Reads as "trickster, don't trust me". The „!“ is the comic-strip alarm sign children already know |

**Strongest counter-argument, answered.** In the real forest a death cap looks innocent, so a child could learn that poisonous mushrooms *look* mean. Three design answers:
- **Level 2 "neutral faces"** (parents' toggle; recommended once she knows the moods): every character gets the same calm face and the `.warn` marks hide (CSS in §8.1). She must then use the cap, the gills or pores, the ring and the base. Verified render: all 13 in neutral mode, see §10.
- **Photo flip** on every card shows the real, expressionless mushroom.
- **Pins** point at real features. The voice says „Poznáš mě podle…“ (*you'll know me by…*), never „poznáš mě podle obličeje“ (*by my face*).

The researcher's nicknames happen to fit the moods (Hořčák, Kopýtko, Puntík Pozor, Zelená Hrozba). See open question Q6 on whether to use them at all.

## 4. Edibility language (shape first, glyph second, colour third, voice always)

| State | Shape | Glyph | Colour token | Word (CZ / EN) | Extra |
|---|---|---|---|---|---|
| jedlá | circle | check | `--edible #2f9b57` | jedlá / edible | basket icon; game zone „Do košíku“ |
| nejedlá | rounded square | X | `--inedible #5f7598` | nejedlá / not edible | none |
| jedovatá | triangle | ! | `--poison #c92f2a` | jedovatá / poisonous | `.warn` „!“ marks in the art |
| smrtelně jedovatá | **octagon (stop sign)** | skull and crossbones | `--deadly #2a0f14` + red | smrtelně jedovatá / deadly poisonous | `--deadly-stripes` frame, ribbon, low bell sound, slow 1 Hz glow pulse on the badge only |

- **Colour-blind check** (Machado 2009 simulation, CIELAB ΔE76): the worst pair is edible ↔ poison under deuteranopia, ΔE 23 (L\* 55 vs 50). Colour alone is therefore **not** enough, which is why shape and glyph carry the meaning. I searched alternative greens and reds and found at most ΔE 26, so it was not worth leaving traffic-light semantics a child already knows.
- Glyph on badge: white. Contrast is 3.5 : 1 or better (graphics tier, ≥ 3 : 1). Text on paper uses the `*-ink` variants: edible 5.96, inedible 7.11, poison 7.41, ink 13.2 : 1.
- Badges are symbols in `ui-icons.svg`: `i-badge-jedla`, `i-badge-nejedla`, `i-badge-jedovata`, `i-skull`. Their fills read `var(--edible)` and so on, so the tokens drive them.

## 5. Information architecture (lightweight pass)

The IA skill was run in light mode, as the brief asked. `ia_lint.py` was **not** run because this is a non-fleet personal surface. The structure below is the deliverable.

**App map (max depth 2):**
```
Les (hub, home) ──tap mushroom──► Kartička (overlay over Les; flip = photo; „Dvojník“ = 2nd level)
   ├─ door ► Do košíku!   (round of 6, ends in celebration ► back to Les)
   ├─ door ► Kvíz    (round of 5)
   ├─ door ► Album        (tap sticker ► Kartička)
   └─ hold 3 s ► Rodiče   (gated)
```
Every screen has a Home button top-left in the same place (64 px). The child can always get back to the forest with one tap.

**Taxonomy (the child's vocabulary, used consistently in UI, voice and album sections):** *jedlá / nejedlá / jedovatá* (+ *smrtelně*). Features are *klobouk, dírky (houbička), lupínky, vrásky, noha, síťka, šupinky, prsten / sukýnka, hlíza, pytlík*, the same words as `data/species.json` lookFor.

| Screen | Hero (one) | T1: must do without reading | T2: on tap | T3 / demoted (named) | Disclosure |
|---|---|---|---|---|---|
| **Les** | the forest with 13 characters | tap a character → bounce + name + opens card; pan the panorama | the three doors (Do košíku, Kvíz, Album) | progress „3 / 13“ (small, top right); language flag; parents icon (dim, hold-gated). **Demoted:** text instructions (none; the voice greets instead) | L1 forest, L2 card |
| **Kartička** | the big character with 3 numbered pins | hear the name (auto-spoken on open); tap a pin → feature spoken; tap the verdict → group spoken | flip → real photo; speaker repeats | EN name + latin (secondary line); „Dvojník“ panel (L2); photo credit (on the back, small). **Demoted:** the fact text is spoken only via the speaker, never shown as a paragraph | L1 front, L2 back or Dvojník |
| **Do košíku!** | the mushroom currently in play (lifted, centre) | drag (or tap, then tap the zone) into the basket or „Nechat v lese“ | speaker = instruction again | stars row (progress, top right). **Demoted:** score numbers, timer (there is none) | single level |
| **Kvíz** | the spoken name + the 3 candidates | listen, tap the right one | tap the speaker = hear it again | stars row. **Demoted:** written name (shown only after a correct answer, as reading practice) | single level |
| **Album** | the sticker page (13 slots grouped by edibility) | tap a sticker → card | swipe or arrow to the second page (if split) | count „7 / 13“. **Demoted:** dates, stats | L1 album, L2 card |
| **Rodiče** | the safety note | (adult) read; toggle Level 2; reset | photo credits list | research notes link, voice settings | single scroll |

## 6. Screen specs

Baseline viewport: **iPad landscape 1024×768**. Also valid at 1180×820, 1366×1024 and laptop 1440×900 (16:10). All sizes are tokens. Touch targets are ≥ `--touch-min` 64 px. Primary round buttons use `--touch-main` 88 px.

### 6.1 Les (home / explore) · comp: `comp-les.png`
- Inline `art/scene-forest.svg` full-bleed. Set the SVG `viewBox` to `0 0 vbW 1000` with `vbW = 1000 × (innerWidth / innerHeight)` (1333 on iPad, 1600 on 16:10), so the scene fills the height and **pans horizontally** over the 2400-unit panorama.
- **Parallax pan:** pan offset `p ∈ [0, 2400 − vbW]` (drag on empty ground, two-finger scroll, or arrow buttons). Translate each layer by `−p × data-depth` (far .3, light .45, mid .65, near 1; sky fixed). Release with inertia (`--ease-out`, ~600 ms). Optional ±12 px drift from device tilt or pointer position at rest, same depth ratios.
- **Characters:** 13 slots are invisible `circle.slot` elements in `#slots` (6 mid, 7 near), each with `data-layer` and `data-scale`. Append each character's inline SVG into `.slots-mid` or `.slots-near` inside its layer, so it pans with its own ground. Place it with its foot point `(120, 262)` on the slot centre, size `240×280 × data-scale`. Hide the character's `.ground` in the scene (the scene has its own floor) and keep its `.shadow`.
- **Assignment:** recommended order left to right is `muchomurka-cervena, kozak, zlucnik, trepenitka, bedla, troudnatec` (mid), then `hrib-smrkovy, liska, muchomurka-zelena, kremenac, pychavka, suchohrib, muchomurka-tygrovana` (near). This mixes the groups so no area is "the poison corner".
- **Doors:** a paper tray top-centre with three 88 px round doors and labels (Grandstander 19 px): „Do košíku“ (basket, `--edible-soft` fill), „Kvíz“ (quiz), „Album“. Top-left is the language flag (64 px). Top-right is the progress pill „★ 3 / 13“ and the parents icon (56 px, opacity .75, hold-gated).
- **Met characters** (card opened at least once) get a tiny star sparkle above the cap once on load. Unmet ones idle normally. Everyone is always visible: it is an explore screen.
- **Ferns** are `g.fern` in the near layer. Keep them on Les; hide them in the game screens.

### 6.2 Kartička (species card) · comps: `comp-card-hrib-smrkovy.png`, `comp-card-muchomurka-zelena.png`
- An overlay card over the dimmed Les (`inset 28px`, `--r-lg`, `--shadow-lift`). Grid: character column 470 px plus an info column. On ≥ 1180 px wide, use a container query to widen the character column to 46 %.
- **Character** at `--char-card` height on a soft group-tinted floor glow (`--edible-soft` / `--inedible-soft` / `--poison-soft`), with `.ground` visible.
- **Pins:** for each `circle.anchor[data-look]` (0, 1, 2), place a 34 px numbered paper disc inside a 64 px hit area at the anchor (SVG units × rendered scale). Each matches the numbered chip in the info column, which holds the `lookFor[i]` text. Tap a pin or a chip and the feature is spoken while the pin does a ring pulse. If two pins come closer than 72 px, nudge the later one along the vector away from the face anchor.
- **Info column:** name in the current language (`--fs-hero`, Grandstander 800); second line with the other language's name and flag, plus the latin name (`--fs-small`, italic); the **verdict pill** (72 px badge + word, group colours; deadly = dark pill with red border); for edible ones, the line „Houby sbíráme jen s dospělým“ with the parents icon; then the 3 look-for chips (Andika 21 px, ≥ 64 px tall).
- **Actions** (bottom centre): speaker (88 px, gold, the hero action for a non-reader), flip (88 px), close (64 px). If the species has a lookalike in the set, a 4th button „Dvojník“ (64 px, two-mushroom glyph made from two small character thumbnails).
- **Deadly:** a 10 px `--deadly-stripes` frame, plus the ribbon „POZOR! SMRTELNĚ JEDOVATÁ · NIKDY NESAHAT“ centred on the top edge (Grandstander 20 px, `--warn-yellow` on `--deadly`).
- **Back (photo):** `photos/<id>.jpg` with `object-fit: cover` in the card with `--r-md` corners. A small paper label bottom-left: „Foto: {author} · {license} · Wikimedia Commons“ (`--fs-small`). A small character thumbnail sits in the corner so she links photo to character. The same flip button flips back. If the photo is missing, show the character on paper with „Fotka zatím chybí“.
- **Dvojník (L2):** the two characters side by side with neutral faces, each with only the one decisive pin (hřib vs žlučník: `pores`; bedla vs zelená: `volva` vs `snakeskin` + `ring`; bedla vs tygrovaná: `bulb-rim` vs `snakeskin`), plus spoken contrast lines from `caution`.

### 6.3 Hra „Do košíku!“ (sorting) · comp: `comp-do-kosiku.png`
- Background is the same scene window with `g.fern` hidden. **Basket** bottom-right (~400×320) with label chip `i-badge-jedla` „Do košíku“. **Zone** bottom-left (`art/zone-les.svg`, ~360×260) with label chip `i-hand-stop` „Nechat v lese“. Home top-left, title pill, stars row, speaker top-right.
- **Round:** 6 mushrooms (at least 2 that are not edible, at most 1 deadly per round in Level 1), queued on the mid ground (feet on the ground line, never floating). The front one hops forward and becomes the active piece.
- **Input:** Pointer Events drag. Pick up: scale 1.08, rotate −6°, `--shadow-char` deepened, z `--z-drag`. Tap mode for small hands: tap a mushroom (it hops and both zones pulse), then tap a zone.
- **Hover feedback:** the basket rim glows `--glow-edible` and the zone sign wobbles when the piece is over it. **No colour judgement before the drop.**
- **Outcomes (nobody loses, every mushroom ends up placed correctly):**
  - edible → basket: it drops *between* `#basket-back` and `#basket-front` (§8.3), with a squash on landing, a "plop" sound and a star. Voice: „Do košíku! S dospělým ji můžeme sbírat.“
  - not edible → zone: it hops into the zone, sits, and nods. Voice: „Správně, zůstanu v lese.“ Star.
  - **poisonous → basket:** the basket rim pushes it out with a springy bounce (`--ease-spring`, 550 ms). Its `.warn` marks pulse twice. Voice: „Pozor! Já jsem jedovatá. Necháme mě v lese.“ It returns to the start spot. No star loss.
  - edible → zone: it hops back gently. Voice: „Tuhle můžeme s dospělým dát do košíku.“
  - Hints: after 2 misses on the same piece, the right zone glows softly (scaffolding).
- **End:** the basket bounces, leaf confetti (`js/confetti.js`), the voice says „Výborně! Košík je plný.“ Stars fly to the progress pill. Then two doors: „Ještě jednou“ (retry icon) and Home.

### 6.4 Hra „Kvíz“ (name quiz)
- Three candidates stand on three tree-stumps (mid ground, near scale), with a big speaker top-centre. On start the voice says „Kde je… *liška obecná*?“ and a tap on the speaker repeats it.
- **Correct:** a happy jump, a star, the written name appears under it (reading practice), and the voice confirms „Ano! To je liška.“
- **Wrong:** the tapped mushroom says its *own* name („Já jsem hřib smrkový.“) with a gentle wobble. That turns every miss into learning. It stays in place.
- **Round of 5.** Distractors in Level 1 come from different groups. Level 2 uses lookalikes plus neutral faces.

### 6.5 Album nálepek
- A two-page book on `--paper-deep`. Three sections headed by the group badges (Jedlé 7 · Nejedlé 2 · Jedovaté 4), which reinforces the classification.
- **Empty slot:** the character silhouette at 15 % (`filter: brightness(0) opacity(.15)`) inside a dashed rounded frame, so she sees whose place it is.
- **Sticker:** the character (with `.ground`) as a die-cut sticker (`--shadow-sticker`, white outline), rotated ±3° at random (seeded by id). Earned the first time the card is opened. It gets a **gold rim** once the species was answered correctly in both games.
- **New sticker moment:** the sticker flies from the card to its slot (FLIP animation), with a "peel" sound.
- **Progress:** „7 / 13“ plus a row of 13 dots.

### 6.6 Koutek pro rodiče
- **Gate:** hold the parents icon for 3 s while a progress ring fills (a five-year-old rarely holds that long; there is no reading gate because she cannot read).
- **Content, top first:**
  1. Safety note: the BRIEF sentence verbatim, in a framed box.
  2. Level toggle: „Úroveň 2: bez nápověd v obličeji“ (neutral faces + `.warn` hidden in games).
  3. Language default, voice speed, sound on/off.
  4. Photo credits, auto-built from `photos/credits.json`.
  5. Sources: link to `data/RESEARCH_NOTES.md`.
  6. Reset album (confirm).
- Plain Andika, `--fs-body`, normal reading layout.

## 7. Interaction + animation spec

Global rules:
- **Every tap** answers within 100 ms: a press-down `scale(.94)` over `--t-tap`, then release with `--ease-spring`.
- **Speech:** queue lines, and never overlap two utterances (cancel the previous one). Speak the name *after* the bounce peak (~250 ms) so motion and voice land together.
- **Screen changes** use the View Transitions API (`--t-view`). The tapped character carries `view-transition-name: hero-<id>`, so it morphs from the forest into the card.
- **No time pressure** anywhere. Idle loops pause when the tab is hidden.
- **Reduced motion:** `prefers-reduced-motion: reduce` collapses durations (tokens) and disables idle loops and confetti (show a static "hotovo" sticker instead). Speech still plays.

| Trigger | Target | Animation | Duration / easing | Sound / voice |
|---|---|---|---|---|
| idle | `.eyes` | blink: `scaleY(1 → .1 → 1)`, origin centre | `--t-blink` closed, random every `--idle-blink-min…max` per character (desynchronised) | none |
| idle | `.body` | breathing sway: `rotate(±1.2deg)` + `scaleY(1 → 1.015)`, origin bottom centre | `--idle-sway` loop, `--ease-in-out`, random phase | none |
| idle (poisonous) | `.warn` | the two „!“ marks tilt ±6°, alternating | 1.6 s loop | none |
| tap character (Les) | `.body` | squash-stretch bounce: `scale(1.12,.86)` → `translateY(-18px) scale(.92,1.1)` → `scale(1.04,.97)` → rest | `--t-bounce`, `--ease-bounce` | wood "tok", then name |
| tap character (Les) | `.cap` + `.under` | head wobble ±4° around `data-pivot` (animate both with identical keyframes) | 500 ms | none |
| card open | character | View Transition morph from its forest position | `--t-view` | name auto-spoken |
| tap pin | pin disc | ring pulse (`box-shadow` spread 0 → 14 px, fade) ×2 | 2 × 420 ms | feature text |
| flip | card | 3D `rotateY(0 → 180deg)`, `perspective: 1400px`, back face visible at 90° | `--t-flip`, `--ease-in-out` | page "swish" |
| drag start | piece | lift: `scale(1.08) rotate(-6deg)`, deeper shadow | `--t-quick`, `--ease-out` | small "pop" |
| drop in basket | piece | fall into the gap between basket layers, `translateY` + squash on landing | `--t-drop`, `--ease-in` then `--ease-bounce` | "plop" + leaf rustle |
| poison into basket | piece | bounce off the rim (arc up and back), `.warn` pulse ×2 | `--t-drop`, `--ease-spring` | soft two-note descending "hmm" (no buzzer) |
| return to start | piece | arc back | `--t-return`, `--ease-out` | none |
| round end | basket + confetti | basket hop ×2, leaves rain 2.4 s | `--t-celebrate` | rising 3-note marimba + praise |
| scene | `#falling .falling-leaf` | 9 leaves: fall 8–14 s, sine sway ±40 px, rotate, loop from the top at random x | linear | none |
| scene | `#light` | god-rays opacity .35 ↔ .5 | 7 s loop | none |
| deadly badge | `i-skull` badge | glow pulse at ≤ 1 Hz, opacity .6 ↔ 1 (no flashing) | 1.2 s loop | low soft bell on card open |

## 8. Art contract (for the programmer)

### 8.1 Character SVGs: `art/<id>.svg`
- `viewBox="0 0 240 280"`. The foot point is `(120, 262)`. Sizes are 9.8 to 22.9 KB each. All files are well-formed, use internal `#` refs only, have no raster, no scripts and **no duplicate ids**. Every id is prefixed with the species id, so all 13 can be inlined in one document.
- Root: `<svg class="shroom" data-id data-group data-deadly? data-pivot="x y" role="img" aria-label>`.
- Group order (paint order = z-order):
```
g.shadow          contact shadow (keep in the scene)
g.ground          moss + leaves patch (hide in the scene, show on card/album)
g.body            bounce wrapper (everything that moves)
  g.under         pores / gills / ridges (cap underside)
  g.stem          stem, ring, base + g.face
    g.face > g.eyes | g.lids | g.brows | g.cheeks | g.mouth | g.mouth-neutral[visibility=hidden]
  g.cap           cap + warts / scales
g.warn            poisonous only: two „!“ marks
g.anchors > circle.anchor[data-feature][data-look]   invisible (fill/stroke none)
```
- **Inline the SVG** (fetch + insert) wherever you animate. `<img>` is fine for album thumbnails (moods show; CSS cannot reach inside).
- CSS hooks:
```css
.shroom .body, .shroom .cap, .shroom .under, .shroom .eyes, .shroom .warn { transform-box: fill-box; }
.shroom .body  { transform-origin: 50% 100%; }
.shroom .eyes  { transform-origin: 50% 50%; }
.shroom .cap, .shroom .under { transform-origin: 50% 100%; } /* or use data-pivot with transform-box: view-box */
/* Level 2 / quiz: neutral faces */
[data-faces="neutral"] .shroom :is(.lids, .brows, .cheeks, .mouth, .warn) { display: none; }
[data-faces="neutral"] .shroom .mouth-neutral { visibility: visible; }
.forest .shroom .ground { display: none; }
```
- **Exceptions (compound species):**
  - `pychavka`: everything is in `.stem` (no cap or under).
  - `troudnatec`: the birch log is in `.stem`, the hoof bracket and face are in `.cap`, the pore sliver is in `.under`. Bounce the whole `.body`; do not wobble the cap.
  - `trepenitka`: stump plus 5 mushrooms in `.stem` (empty `.cap` / `.under`), face on the front stem.
  - `liska`: the funnel body with ridges is in `.under`, the wavy funnel mouth is in `.cap`, and `.stem` holds only the face.
- **Anchors and lookFor:** `data-look="0|1|2"` follows the order of `lookFor` in `data/species.json` as of 2026-10-11:

| id | look 0 | look 1 | look 2 | other anchors |
|---|---|---|---|---|
| hrib-smrkovy | cap | pores | net | rim, face |
| liska | ridges-down-stem | cap-wavy | ridges | face |
| bedla | cap-scales | snakeskin | ring | umbo, gills, bulb, face |
| kozak | cap | stem-scales | pores | face |
| kremenac | cap | stem-scales | pores | cap-skin, face |
| suchohrib | cap | bruise | stem-plain | pores, face |
| pychavka | no-gills | spines | top | face |
| zlucnik | cap | pores | net | face |
| troudnatec | hoof | bands | on-wood | tree, face |
| muchomurka-cervena | warts | gills | ring | bulb-warts, cap, face |
| muchomurka-zelena | cap-smooth | gills | volva | stem-zigzag, ring, cap, face |
| muchomurka-tygrovana | warts | striate-rim | bulb-rim | gills, ring, cap, face |
| trepenitka | on-wood | cap-sulphur | gills-green | tuft, face |

  If the researcher reorders `lookFor`, edit `LOOK` in `build_art.py` and re-run it. The build asserts every mapped feature exists.
- **Colours** were reconciled with `data/species.json` `colors` on 2026-10-11: kozák cap warmed, hřib hnědý and žlučník stems darkened, třepenitka gills greener. Measured base cap colour vs the researcher's `colors.cap` (CIELAB ΔE76): 1.2 to 9.5 for 12 species. The outlier is bedla at 17.8: the researcher gives one averaged tone, while the art draws a cream cap with separate brown scales, which is botanically closer. Highlights and shadows are additional.

### 8.2 Forest: `art/scene-forest.svg`
- `viewBox="0 0 2400 1000"` panorama with layers `#sky`, `#layer-far` (`data-depth=".3"`), `#light` (.45), `#layer-mid` (.65), `#layer-near` (1), `#falling`, `#slots`. Every layer bleeds 120 units past both ends.
- **Safe band:** keep anything interactive between y 100 and y 1000 (16:9 laptops crop the top ~100).
- Hooks: `g.slots-mid` and `g.slots-near` (empty, append characters), `g.fern` (hide in games), `.falling-leaf` (9 `<use>` leaves positioned above the canvas, to animate), and leaf `<symbol>`s `lf-beech`, `lf-oak`, `lf-birch`, `lf-maple` (they take `color`).
- Size is 176 KB (mostly the far spruce silhouettes and leaf litter). Inline it once and reuse that node across screens; do not re-fetch per screen. Use `will-change: transform` on the four layers while panning only. No SVG filters are used anywhere, deliberately, for iPad performance.

### 8.3 Basket: `art/basket.svg`, `basket-back.svg`, `basket-front.svg`
- All three share `viewBox="0 0 400 320"`. The combined file has `#basket-back`, an empty `#basket-items`, and `#basket-front`.
- **Drop-into layering:** stack `basket-back.svg`, then the item layer (an absolutely positioned div or the `#basket-items` group), then `basket-front.svg` in the same box. Dropped mushrooms are rendered at ~0.45 scale, standing with their feet at y ≈ 175 to 185 inside the opening (centre x 200, opening ellipse rx 150, ry 40). The front wall then hides their lower half.
- If both back and front are inlined, their `<defs>` ids (`bk-*`) repeat. The definitions are identical, so this is harmless; inlining only `basket.svg` avoids it.
- The gingham cloth is green on purpose: the basket means edible.

### 8.4 Zone: `art/zone-les.svg`
`viewBox 0 0 400 290`: a moss patch ringed with stones, plus a sign post with a red-ringed stop hand. Placed mushrooms sit on the patch at ~0.4 scale (foot y ≈ 235).

### 8.5 Icons: `art/ui-icons.svg`
- A sprite of `<symbol id="i-…" viewBox="0 0 48 48">`: `speaker home flip star check retry album play arrow-left close basket hand-stop quiz parents lang-cs lang-en badge-jedla badge-nejedla badge-jedovata skull`.
- Use `<svg><use href="art/ui-icons.svg#i-speaker"/></svg>`, or inline the sprite once and use `#i-…`.
- Stroke icons use `currentColor`. Flags have fixed colours and are pre-clipped, with no clipPath inside symbols (Chrome failed to apply one in testing). Badges read `--edible / --inedible / --poison / --deadly`.

## 9. Fonts

| Role | Package | Weights | Why |
|---|---|---|---|
| Display: names, titles, buttons | **`@fontsource/grandstander`** 5.3.0 | 700, 800 | Hand-lettered storybook warmth that matches the inked art |
| Text: look-for chips, parents' corner | **`@fontsource/andika`** 5.3.0 | 400, 700 | SIL literacy font for beginning readers: single-storey *a* and *g* as taught in Year-1 handwriting, distinct I / l / 1 |

- **Verification (2026-10-11):** installed in the scratchpad and opened each `latin` + `latin-ext` subset file with fontTools. All of `ěščřžýáíéůúťďňó ĚŠČŘŽÝÁÍÉŮÚŤĎŇÓ „“ –` are present in Grandstander 400/700/800, Andika 400/700, Baloo 2 700/800 and Nunito 700.
- **Rejected:** Fredoka (no ě č ř ů ť ď ň in its latin-ext subset).
- **Reconciliation:** the programmer has already vendored Baloo 2 + Nunito in `css/fonts.css`. They stay as fallbacks in `--font-display` / `--font-text`. Please add the Grandstander and Andika woff2 files (both subsets, with the same `unicode-range` split as fontsource) and keep the SIL OFL licence files.

## 10. Sight-verification record

Every visual claim below was checked against a Playwright/Chromium render (scratchpad renders, then the final PNGs in this folder).
- **Characters**, 5 render passes. Fixes made from the screenshots:
  1. The bolete pore layer was too thin to read as a sponge, so I enlarged the under-ellipse and the pore dots.
  2. The amanita rings sat directly under the gills and read as a second gill frill, so I moved them down with stem visible above and made them hang as drooping skirts.
  3. The fly-agaric bulb read as a beaded pot, so it now has three concentric rows of wart scraps on the shoulder.
  4. The panther-cap rim looked like the death-cap sac, so it became a narrow rolled collar plus a faint belt.
  5. Liška was a long-stemmed trumpet, so it became one continuous chunky funnel with forked, blunt ridges running onto a thick short stem. A mask bug had hidden the ridges; fixed.
  6. Pýchavka read as a light bulb, so it is now pear-shaped with filled spines down to the base.
  7. Troudnatec was too dark to see its face, so the bands are lighter and the face bigger.
  8. Eyelids were rectangles that showed on textured stems, so they became eye-shaped outlined lids.
  9. The warning sparks read as matchsticks, so they became „!“ marks.
- **Neutral-faces mode:** rendered all 13. The faces are uniform and the warn marks hidden.
- **Anchors:** rendered with debug dots. Every pin lands on its feature. I spread the hřib pores and net pins after the card comp showed them touching.
- **Scene:** full panorama, the iPad window at pan 0, and a simulated pan at p = 700 with parallax offsets. Fixes made:
  1. Removed floating orange "cotton balls" in the far layer.
  2. Ferns were rebuilt from sticks into full fronds.
  3. Leaf litter now lies flat (y-scale .58) at lower density.
  4. Light rays moved behind the mid trees.
  5. Crown outlines that read as bubbles were removed.
- **Icons:** the flags first rendered unclipped as squares; they are now pre-clipped geometry. Badges were checked at 32 and 64 px.
- **Final artefacts:**
  - verified against screenshot at `design/contact-sheet.png`
  - verified against screenshot at `design/comp-les.png`
  - verified against screenshot at `design/comp-card-hrib-smrkovy.png`
  - verified against screenshot at `design/comp-card-muchomurka-zelena.png`
  - verified against screenshot at `design/comp-do-kosiku.png`
- **Not verified:** real-time motion. No animation exists yet, so §7 is a spec, not evidence. Laptop 1440×900 and ≥ 3 widths were not shot; the programmer's screens should be shot at 1024×768, 1180×820 and 1440×900.

## 11. Open questions

**For the programmer**
1. **Portrait iPad:** stack the card (character on top), and show a "turn the iPad" illustration in the games? My recommendation is yes for the games and stacking for the card.
2. **Pan input on Les:** a drag on empty ground conflicts with a drag on a character only in the games. On Les, characters are tap-only, so drag = pan is safe. Confirm.
3. **Photo focal points:** `object-fit: cover` may crop caps. Consider an optional `focal: [x%, y%]` per photo in `photos/manifest.json` (researcher's file).

**For the parents**

4. **Level 2 (neutral faces):** should it be off by default with a parent toggle (my recommendation), or switch on automatically once all 13 stickers are gold?
5. **Pýchavka look 2** („Stará má nahoře malou dírku“) points at the top. The drawing is deliberately a *young* puffball, because only a young one, white inside, is edible. Suggest the researcher reword this to „Jíst se dá jen mladá, uvnitř celá bílá“.
6. **Nicknames** (Hříbek Pepík, Zelená Hrozba…): use them only as an album subtitle, and have characters introduce themselves with the **real** name. Otherwise she may learn "Pepík" instead of "hřib smrkový".
