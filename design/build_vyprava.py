#!/usr/bin/env python3
"""Houbičky v2 — „Výprava do lesa“ paper-theatre kit (designer source).

Run:  python3 design/build_vyprava.py  ->  art/vyprava/*.svg
Deterministic (each asset has its own seed), stdlib only, reuses the forest helpers of build_scene.py so the
3D walk and the Les panorama share one hand.

Billboard contract (see design/DESIGN-v2.md §5.3):
  * every billboard root carries  data-foot="x y"  (ground-contact point in viewBox units, bottom centre)
    and  data-height-m="…"  (suggested world height in metres, child-scaled: a mushroom is ~0.45 m).
  * transparent background, no raster, no external refs, no scripts, ids prefixed per file.
  * the leaf pile is split in two files with the SAME viewBox: leafpile-back.svg / leafpile-front.svg;
    a hidden mushroom billboard sits between them (z-order back < mushroom < front).
  * tiles (ground-tile.svg, path-tile.svg) are seamless; path-tile fades to transparent at its left/right edges.
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_scene as bs  # noqa: E402

OUT = os.path.join(HERE, "..", "art", "vyprava")
INK = "#3b2417"
f = bs.f
smooth = bs.smooth


def seed(n):
    bs.R = random.Random(n)
    return bs.R


def svg(name, vb, body, defs="", foot=None, height_m=None, label="", extra=""):
    attrs = f' data-foot="{foot[0]} {foot[1]}"' if foot else ""
    attrs += f' data-height-m="{height_m}"' if height_m else ""
    aria = f' role="img" aria-label="{label}"' if label else ' aria-hidden="true"'
    d = f"<defs>{defs}</defs>" if defs else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" class="vy vy-{name}"{attrs}{aria}{extra}>'
            f'{d}{body}</svg>\n')


# ---------------------------------------------------------------- backdrop (seamless horizontally)

def backdrop():
    R = seed(41)
    W, H = 4096, 1024
    TAU = 2 * math.pi

    def ridge(y0, amp, k1, k2, ph):
        pts = []
        for i in range(0, 129):
            x = W * i / 128
            pts.append((x, y0 + amp * math.sin(TAU * k1 * x / W + ph) + amp * .45 * math.sin(TAU * k2 * x / W + ph * 2)))
        return smooth(pts, closed=False) + f"L{W} {H}L0 {H}Z"

    def spruce_row(base, hmin, hmax, step, col, ph):
        ds = []
        n = int(W / step)
        for i in range(n):
            x = i * step + R.uniform(-step * .2, step * .2)
            b = base + 16 * math.sin(TAU * 3 * x / W + ph)
            h = R.uniform(hmin, hmax)
            w = h * R.uniform(.22, .28)
            for dx in (0, W) if x < w else ((-W,) if x > W - w else ()):
                ds.append(bs.spruce(x + dx, b, h, w, 6))
            ds.append(bs.spruce(x, b, h, w, 6))
        return f'<path d="{"".join(ds)}" fill="{col}"/>'

    defs = ('<linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9d0d6"/>'
            '<stop offset=".5" stop-color="#f3e2bf"/><stop offset=".8" stop-color="#f6cf97"/><stop offset="1" stop-color="#eeb87f"/></linearGradient>'
            '<linearGradient id="bd-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dcae" stop-opacity="0"/>'
            '<stop offset="1" stop-color="#f6dcae" stop-opacity=".9"/></linearGradient>')
    body = f'<rect width="{W}" height="{H}" fill="url(#bd-sky)"/>'
    clouds = []
    for cx, cy, s in [(400, 170, 1.0), (1300, 110, .8), (2300, 190, 1.1), (3300, 120, .9)]:
        pts = [(cx + 160 * s * math.cos(TAU * i / 10) * (1 + R.uniform(-.15, .15)),
                cy + 36 * s * math.sin(TAU * i / 10) * (1 + R.uniform(-.25, .25)) - (16 * s if math.sin(TAU * i / 10) < 0 else 0)) for i in range(10)]
        clouds.append(smooth(pts))
    body += f'<path d="{"".join(clouds)}" fill="#fff8ea" opacity=".55"/>'
    body += f'<path d="{ridge(600, 24, 3, 7, .4)}" fill="#a7a9bd"/>'
    body += spruce_row(640, 120, 200, 46, "#9aa0b6", .3)
    body += f'<path d="{ridge(660, 16, 2, 9, 1.3)}" fill="#9aa0b6"/>'
    body += spruce_row(700, 150, 230, 58, "#8a8f9e", 1.1)
    body += f'<path d="{ridge(720, 12, 4, 11, 2.1)}" fill="#8a8f9e"/>'
    body += f'<rect y="520" width="{W}" height="300" fill="url(#bd-haze)"/>'
    body += f'<rect y="790" width="{W}" height="{H - 790}" fill="#c9b07a"/>'
    defs += f'<clipPath id="bd-clip"><rect width="{W}" height="{H}"/></clipPath>'
    body = f'<g clip-path="url(#bd-clip)">{body}</g>'
    return svg("backdrop", f"0 0 {W} {H}", body, defs, label="Les v dálce",
               extra=' data-seamless="x" data-horizon-y="790"')


# ---------------------------------------------------------------- trees, ferns, props (billboards)

def tree_spruce(small=False):
    seed(51 if not small else 52)
    W, H = (420, 900) if not small else (260, 540)
    h = H - 30
    d = bs.spruce(W / 2, H - 12, h, W * .46, 11 if not small else 8)
    defs = f'<clipPath id="ts{int(small)}-r"><rect x="{W / 2}" y="0" width="{W}" height="{H}"/></clipPath>'
    body = (f'<path d="{d}" fill="#3a5a44" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="#24402f" opacity=".75" clip-path="url(#ts{int(small)}-r)"/>'
            f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')
    name = "tree-spruce" if not small else "tree-spruce-small"
    return name, svg(name, f"0 0 {W} {H}", body, defs, foot=(W / 2, H - 8), height_m=9 if not small else 4.5, label="Smrk")


def tree_beech():
    seed(53)
    W, H = 640, 960
    defs = ('<linearGradient id="tb-bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f7a72"/>'
            '<stop offset=".35" stop-color="#b3ada2"/><stop offset="1" stop-color="#6f6a62"/></linearGradient>')
    trunk = bs.beech(W / 2, H - 14, 300, 70).replace("url(#g-beech)", "url(#tb-bark)")
    body = trunk + bs.crown(W / 2, 290, 280, ["#9c4a22", "#c46a2a", "#de9a38", "#efc15a"], n=11)
    return "tree-beech", svg("tree-beech", f"0 0 {W} {H}", body, defs, foot=(W / 2, H - 8), height_m=10, label="Buk")


def tree_birch():
    seed(54)
    W, H = 320, 960
    defs = ('<linearGradient id="tbi-bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfc8b8"/>'
            '<stop offset=".35" stop-color="#fbf8f0"/><stop offset="1" stop-color="#bdb5a2"/></linearGradient>')
    trunk = bs.birch(W / 2, H - 12, 200, 34).replace("url(#g-birch)", "url(#tbi-bark)")
    body = trunk + bs.crown(W / 2, 200, 150, ["#b8892a", "#d9b23a", "#f0d266"], n=9)
    return "tree-birch", svg("tree-birch", f"0 0 {W} {H}", body, defs, foot=(W / 2, H - 8), height_m=8, label="Bříza")


def fern():
    seed(55)
    W, H = 480, 330
    body = bs.fern(W / 2 - 40, H - 6, .95, 1) + bs.fern(W / 2 + 40, H - 6, .85, -1, "#c07a2e", "#94541f")
    return "fern", svg("fern", f"0 0 {W} {H}", body, foot=(W / 2, H - 6), height_m=.9, label="Kapradí")


def blueberry():
    """Borůvčí: low autumn shrub, red-purple leaves + a few dark berries. Good hiding cover."""
    R = seed(56)
    W, H = 380, 220
    stems, leaves = [], []
    mound = f'<path d="M14 {H - 4}Q40 70 190 52Q340 70 366 {H - 4}Z" fill="#4e5a26" stroke="{INK}" stroke-width="3"/>'
    for i in range(16):
        x0 = 34 + i * 20 + R.uniform(-6, 6)
        top = H - R.uniform(120, 190) * (1 - abs(i - 7.5) / 16)
        stems.append(f"M{f(x0)} {H - 6}Q{f(x0 + R.uniform(-20, 20))} {f((H + top) / 2)} {f(x0 + R.uniform(-30, 30))} {f(top)}")
        for k in range(10):
            t = .2 + k * .085
            lx = x0 + R.uniform(-34, 34) * t
            ly = H - 6 - (H - 6 - top) * t
            col = R.choice(["#a8402a", "#8e2f3a", "#c7642a", "#6e7a3a", "#b4503a"])
            rot = R.uniform(0, 360)
            leaves.append(f'<path d="M0 0C5 -7 14 -7 19 0C14 7 5 7 0 0Z" transform="translate({f(lx)} {f(ly)}) rotate({f(rot)})" fill="{col}"/>')
    berries = "".join(f'<circle cx="{f(R.uniform(60, 320))}" cy="{f(R.uniform(80, 170))}" r="5" fill="#2e2a5a" stroke="{INK}" stroke-width="1.4"/>'
                      for _ in range(6))
    body = (mound + f'<path d="{"".join(stems)}" fill="none" stroke="#3e4a1a" stroke-width="3" stroke-linecap="round"/>'
            f'<g stroke="{INK}" stroke-width="1.2">{"".join(leaves)}</g>{berries}')
    return "blueberry", svg("blueberry", f"0 0 {W} {H}", body, foot=(W / 2, H - 6), height_m=.45, label="Borůvčí")


def stump():
    seed(57)
    W, H = 280, 210
    defs = ('<linearGradient id="st-bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4f3423"/>'
            '<stop offset=".35" stop-color="#87603f"/><stop offset=".8" stop-color="#6b4a30"/><stop offset="1" stop-color="#3f2a1c"/></linearGradient>')
    top = 70
    d = smooth([(50, top), (48, 140), (22, 196), (60, 204), (220, 204), (258, 196), (232, 140), (230, top)], closed=False) + "Z"
    grain = "".join(f"M{x} {top + 10}q{bs.R.uniform(-3, 3):.1f} 50 {bs.R.uniform(-5, 5):.1f} 110" for x in range(62, 226, 13))
    body = (f'<path d="{d}" fill="url(#st-bark)"/><path d="{grain}" fill="none" stroke="{INK}" stroke-width="2" opacity=".35"/>'
            f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>'
            f'<ellipse cx="140" cy="{top}" rx="90" ry="20" fill="#d7aa6c" stroke="{INK}" stroke-width="3"/>'
            f'<ellipse cx="140" cy="{top}" rx="60" ry="12" fill="none" stroke="#b5874c" stroke-width="2"/>'
            f'<ellipse cx="140" cy="{top}" rx="30" ry="5.5" fill="none" stroke="#b5874c" stroke-width="2"/>'
            f'<path d="M30 196q30 -30 70 -6q-20 18 -70 6z" fill="#7d8c45" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M180 200q36 -26 66 -4q-26 14 -66 4z" fill="#8a9a4c" stroke="{INK}" stroke-width="2"/>')
    return "stump", svg("stump", f"0 0 {W} {H}", body, defs, foot=(W / 2, H - 6), height_m=.6, label="Pařez")


def log():
    seed(58)
    W, H = 640, 210
    defs = ('<linearGradient id="lg-bark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6544"/>'
            '<stop offset=".5" stop-color="#6b4a30"/><stop offset="1" stop-color="#4a3221"/></linearGradient>')
    body = (f'<path d="M70 70Q330 40 610 64L612 168Q330 186 70 176Z" fill="url(#lg-bark)" stroke="{INK}" stroke-width="3.5"/>'
            f'<path d="M110 90q120 -10 240 -4M160 140q160 6 300 -2M380 104q90 -2 180 6" fill="none" stroke="{INK}" stroke-width="2" opacity=".4"/>'
            f'<ellipse cx="70" cy="123" rx="34" ry="54" fill="#c99a62" stroke="{INK}" stroke-width="3.5"/>'
            f'<ellipse cx="70" cy="123" rx="21" ry="34" fill="none" stroke="#9c6f3e" stroke-width="2.4"/>'
            f'<ellipse cx="70" cy="123" rx="8" ry="13" fill="none" stroke="#9c6f3e" stroke-width="2.4"/>'
            f'<path d="M110 64Q330 30 600 58L600 80Q330 58 110 86Z" fill="#8a9a4c"/>'
            f'<path d="M110 64Q330 30 600 58" fill="none" stroke="{INK}" stroke-width="2"/>')
    return "log", svg("log", f"0 0 {W} {H}", body, defs, foot=(W / 2, H - 20), height_m=.55, label="Kmen")


def rock():
    seed(59)
    W, H = 240, 150
    d = smooth([(20, 140), (30, 80), (80, 30), (150, 26), (210, 64), (226, 140)], closed=False) + "Z"
    body = (f'<path d="{d}" fill="#a39d92" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>'
            f'<path d="M70 56q40 -20 80 -18" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".3"/>'
            f'<path d="M150 140q30 -40 70 -40l6 40z" fill="#7d8c45" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>')
    return "rock", svg("rock", f"0 0 {W} {H}", body, foot=(W / 2, H - 8), height_m=.5, label="Kámen")


def leafpile():
    """Two halves; a hidden mushroom stands at data-hide="x y" between them (only its cap shows above the front)."""
    R = seed(60)
    W, H = 340, 210
    syms = bs.LEAF_SYMBOLS.replace('id="lf-', 'id="vy-lf-')

    def pile(y_top, n, sc, front):
        ls = []
        for _ in range(n):
            t = R.uniform(-1, 1)
            x = W / 2 + t * (W * .44) * (1 if front else .9)
            ymax = H - 12
            ytop = y_top + (abs(t) ** 2) * 60
            y = R.uniform(ytop, ymax)
            k = R.choice(["vy-lf-beech", "vy-lf-oak", "vy-lf-birch", "vy-lf-beech", "vy-lf-maple"])
            s = R.uniform(*sc)
            ls.append(f'<use href="#{k}" x="-16" y="-11" width="32" height="22" transform="translate({f(x)} {f(y)}) rotate({int(R.uniform(0, 360))}) scale({f(s)})" color="{R.choice(bs.LEAF_COLORS)}"/>')
        return "".join(ls)

    mound_back = f'<path d="M20 {H - 8}Q60 70 170 62Q280 70 320 {H - 8}Z" fill="#8a5a2e" stroke="{INK}" stroke-width="3"/>'
    mound_front = f'<path d="M6 {H - 6}Q40 128 120 124Q170 140 220 124Q300 128 334 {H - 6}Z" fill="#9c6a34" stroke="{INK}" stroke-width="3"/>'
    back = svg("leafpile-back", f"0 0 {W} {H}", (mound_back + pile(66, 70, (1.1, 1.6), False)).replace("#vy-lf-", "#vyb-lf-"),
               syms.replace('id="vy-lf-', 'id="vyb-lf-'),
               foot=(W / 2, H - 8), height_m=.55, extra=f' data-hide="{W / 2} {H - 40}"')
    front = svg("leafpile-front", f"0 0 {W} {H}", mound_front + pile(126, 80, (1.2, 1.8), True), syms,
                foot=(W / 2, H - 8), height_m=.55, extra=f' data-hide="{W / 2} {H - 40}"')
    return back, front


def shadow():
    body = ('<defs><radialGradient id="sh-g"><stop offset="0" stop-color="#2a1a10" stop-opacity=".45"/>'
            '<stop offset="1" stop-color="#2a1a10" stop-opacity="0"/></radialGradient></defs>'
            '<ellipse cx="128" cy="64" rx="128" ry="64" fill="url(#sh-g)"/>')
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 128" class="vy vy-shadow" aria-hidden="true">' + body + '</svg>\n'


def sparkle():
    """Hint glint: 3 four-point stars; animate scale/opacity (hint after ~20 s of no find)."""
    star = lambda x, y, r: (f'<path d="M{x} {y - r}Q{x + r * .18} {y - r * .18} {x + r} {y}Q{x + r * .18} {y + r * .18} {x} {y + r}'
                            f'Q{x - r * .18} {y + r * .18} {x - r} {y}Q{x - r * .18} {y - r * .18} {x} {y - r}Z"/>')
    body = f'<g fill="#fff6c8" stroke="#d99a2b" stroke-width="2" stroke-linejoin="round">{star(60, 50, 34)}{star(104, 30, 16)}{star(28, 96, 14)}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" class="vy vy-sparkle" aria-hidden="true">{body}</svg>\n'


def stop_bubble():
    """'Nesahej na mě!' reaction bubble: raised stop hand in a red-ringed speech bubble (words come from voice + phrases)."""
    body = ('<path d="M24 10h112a16 16 0 0 1 16 16v76a16 16 0 0 1-16 16H92l-22 26-4-26H24a16 16 0 0 1-16-16V26a16 16 0 0 1 16-16z" '
            'fill="#fbf4e4" stroke="#3b2417" stroke-width="4" stroke-linejoin="round"/>'
            '<circle cx="80" cy="64" r="42" fill="none" stroke="#c92f2a" stroke-width="8"/>'
            '<g transform="translate(80 67) scale(1.55)" fill="#fbf4e4" stroke="#3b2417" stroke-width="2.6" stroke-linejoin="round">'
            '<path d="M-12 -2V-16a3 3 0 0 1 6 0V-6V-22a3 3 0 0 1 6 0V-6V-20a3 3 0 0 1 6 0V-5V-14a3 3 0 0 1 6 0V4Q12 18 0 19Q-10 19 -14 10L-20 0a3 3 0 0 1 5 -3Z"/></g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 150" class="vy vy-stop-bubble" role="img" aria-label="Nesahej na mě!">{body}</svg>\n'


def signpost():
    """End clearing marker: wooden arrow sign with a basket glyph (where the guide waits)."""
    body = (f'<path d="M96 300V60" stroke="{INK}" stroke-width="18" stroke-linecap="round"/><path d="M96 300V60" stroke="#9c6b3e" stroke-width="11" stroke-linecap="round"/>'
            f'<path d="M20 52h130l26 26-26 26H20z" fill="#c98d4a" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            f'<path d="M34 66h100M34 90h104" stroke="#9c6b3e" stroke-width="3"/>'
            f'<g transform="translate(66 60) scale(.8)"><path d="M14 20q10-14 20 0" fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"/>'
            f'<path d="M6 20h36l-5 18H11z" fill="{INK}"/></g>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 310" class="vy vy-signpost" data-foot="96 300" data-height-m="1.3" role="img" aria-label="Cíl">{body}</svg>\n'


# ---------------------------------------------------------------- tiles

def ground_tile():
    R = seed(61)
    S = 512
    syms = bs.LEAF_SYMBOLS.replace('id="lf-', 'id="gt-lf-')
    body = f'<rect width="{S}" height="{S}" fill="#8a6a3a"/>'
    blobs = []
    for _ in range(9):
        x, y, rx, ry = R.uniform(0, S), R.uniform(0, S), R.uniform(40, 90), R.uniform(24, 50)
        for dx in (-S, 0, S):
            for dy in (-S, 0, S):
                blobs.append(f'<ellipse cx="{f(x + dx)}" cy="{f(y + dy)}" rx="{f(rx)}" ry="{f(ry)}"/>')
    body += f'<g fill="#7d8c45" opacity=".55">{"".join(blobs)}</g>'
    ls = []
    for _ in range(110):
        x, y = R.uniform(0, S), R.uniform(0, S)
        k = R.choice(["gt-lf-beech", "gt-lf-oak", "gt-lf-birch", "gt-lf-maple"])
        rot, col, sc = int(R.uniform(0, 360)), R.choice(bs.LEAF_COLORS), R.uniform(.9, 1.4)
        for dx in (-S, 0, S):
            for dy in (-S, 0, S):
                if -40 < x + dx < S + 40 and -40 < y + dy < S + 40:
                    ls.append(f'<use href="#{k}" x="-16" y="-11" width="32" height="22" transform="translate({f(x + dx)} {f(y + dy)}) rotate({rot}) scale({f(sc)})" color="{col}"/>')
    body += "".join(ls)
    return svg("ground-tile", f"0 0 {S} {S}", body, syms, extra=' data-seamless="xy"')


def path_tile():
    """Packed-earth path, seamless along y (the walking direction); x edges fade into the ground (alpha)."""
    R = seed(62)
    S = 512
    defs = ('<linearGradient id="pt-fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d8bd84" stop-opacity="0"/>'
            '<stop offset=".16" stop-color="#d8bd84"/><stop offset=".84" stop-color="#d8bd84"/><stop offset="1" stop-color="#d8bd84" stop-opacity="0"/></linearGradient>'
            '<linearGradient id="pt-rut" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8975a" stop-opacity="0"/>'
            '<stop offset=".5" stop-color="#b8975a" stop-opacity=".55"/><stop offset="1" stop-color="#b8975a" stop-opacity="0"/></linearGradient>')
    body = f'<rect width="{S}" height="{S}" fill="url(#pt-fade)"/>'
    body += f'<rect x="150" width="70" height="{S}" fill="url(#pt-rut)"/><rect x="292" width="70" height="{S}" fill="url(#pt-rut)"/>'
    peb, nd = [], []
    for _ in range(70):
        x, y = R.uniform(90, S - 90), R.uniform(0, S)
        r = R.uniform(3, 9)
        for dy in (-S, 0, S):
            peb.append(f'<ellipse cx="{f(x)}" cy="{f(y + dy)}" rx="{f(r * 1.3)}" ry="{f(r)}"/>')
    for _ in range(90):
        x, y = R.uniform(70, S - 70), R.uniform(0, S)
        a = R.uniform(0, math.pi)
        for dy in (-S, 0, S):
            nd.append(f"M{f(x)} {f(y + dy)}l{f(16 * math.cos(a))} {f(16 * math.sin(a))}")
    body += (f'<g fill="#a39d92" stroke="{INK}" stroke-width="1.2" opacity=".9">{"".join(peb)}</g>'
             f'<path d="{"".join(nd)}" stroke="#9c7a3e" stroke-width="2" stroke-linecap="round" opacity=".7"/>')
    return svg("path-tile", f"0 0 {S} {S}", body, defs, extra=' data-seamless="y"')


# ---------------------------------------------------------------- guide: Ježek (hedgehog)

def guide():
    R = seed(63)
    W, H = 340, 320
    cx, cy = 176, 196
    defs = ('<radialGradient id="gj-spine" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#9a6a42"/>'
            '<stop offset=".6" stop-color="#6e4628"/><stop offset="1" stop-color="#4a2c18"/></radialGradient>'
            '<radialGradient id="gj-face" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#fbeed6"/>'
            '<stop offset="1" stop-color="#e2c79c"/></radialGradient>')
    # spiky back: two rows of spines around an ellipse (back -> front)
    spines = []
    for row, (rx, ry, L, col) in enumerate([(112, 92, 30, "#4a2c18"), (100, 82, 26, "#6e4628"), (86, 70, 22, "#8a5a34")]):
        n = 26 - row * 4
        for i in range(n):
            th = math.pi * (0.92 + 1.1 * i / (n - 1))
            x, y = cx - 6 + rx * math.cos(th), cy - 4 + ry * math.sin(th)
            nx, ny = math.cos(th), math.sin(th)
            tip = (x + nx * L + R.uniform(-3, 3), y + ny * L + R.uniform(-3, 3))
            px, py = -ny, nx
            spines.append(f'<path d="M{f(x + px * 7)} {f(y + py * 7)}L{f(tip[0])} {f(tip[1])}L{f(x - px * 7)} {f(y - py * 7)}Z" fill="{col}"/>')
    tips = "".join(f'<circle cx="{f(cx - 6 + 116 * math.cos(math.pi * (0.95 + 1.05 * i / 19)))}" cy="{f(cy - 4 + 96 * math.sin(math.pi * (0.95 + 1.05 * i / 19)))}" r="2.6" fill="#f1dcb4"/>' for i in range(20))
    body_shape = f'<ellipse cx="{cx - 6}" cy="{cy - 4}" rx="100" ry="82" fill="url(#gj-spine)" stroke="{INK}" stroke-width="3.5"/>'
    feet = (f'<ellipse cx="{cx - 50}" cy="{cy + 80}" rx="20" ry="10" fill="#5a3a22" stroke="{INK}" stroke-width="3"/>'
            f'<ellipse cx="{cx + 30}" cy="{cy + 82}" rx="20" ry="10" fill="#5a3a22" stroke="{INK}" stroke-width="3"/>')
    belly = f'<ellipse cx="{cx + 14}" cy="{cy + 34}" rx="58" ry="44" fill="#e9d2a6" stroke="{INK}" stroke-width="3"/>'
    satchel = (f'<path d="M{cx - 70} {cy - 40}L{cx + 50} {cy + 46}" stroke="#2f6b4a" stroke-width="9" stroke-linecap="round"/>'
               f'<rect x="{cx + 30}" y="{cy + 36}" width="44" height="34" rx="8" fill="#3f7d58" stroke="{INK}" stroke-width="3"/>'
               f'<path d="M{cx + 30} {cy + 46}h44" stroke="{INK}" stroke-width="2.4"/>'
               f'<circle cx="{cx + 52}" cy="{cy + 52}" r="3.4" fill="#e3b23c" stroke="{INK}" stroke-width="1.6"/>')
    # head: pointed snout to the right, face patch
    hx, hy = cx + 74, cy - 22
    head = (f'<path d="M{hx - 58} {hy - 46}Q{hx - 6} {hy - 64} {hx + 34} {hy - 6}Q{hx + 62} {hy + 12} {hx + 58} {hy + 22}'
            f'Q{hx + 40} {hy + 40} {hx - 6} {hy + 44}Q{hx - 58} {hy + 40} {hx - 66} {hy}Z" fill="url(#gj-face)" stroke="{INK}" stroke-width="3.5" stroke-linejoin="round"/>'
            f'<ellipse cx="{hx - 30}" cy="{hy - 50}" rx="13" ry="11" fill="#e2c79c" stroke="{INK}" stroke-width="3"/>'
            f'<ellipse cx="{hx - 30}" cy="{hy - 49}" rx="6" ry="5" fill="#c99a7a"/>'
            f'<ellipse cx="{hx + 58}" cy="{hy + 18}" rx="10" ry="8.5" fill="#2a1a12"/><circle cx="{hx + 55}" cy="{hy + 15}" r="2.6" fill="#fff" opacity=".8"/>')
    ex, ey = hx + 14, hy - 4

    def eyes_open(look=0):
        return (f'<g class="eyes"><ellipse cx="{ex}" cy="{ey}" rx="7" ry="9" fill="{INK}"/><circle cx="{ex + 2 + look}" cy="{ey - 3}" r="2.6" fill="#fff"/>'
                f'<ellipse cx="{ex - 26}" cy="{ey - 2}" rx="6" ry="8" fill="{INK}"/><circle cx="{ex - 24 + look}" cy="{ey - 5}" r="2.3" fill="#fff"/></g>')
    cheeks = (f'<ellipse cx="{ex + 14}" cy="{ey + 16}" rx="9" ry="5.5" fill="#ef7f6c" opacity=".55"/>'
              f'<ellipse cx="{ex - 34}" cy="{ey + 14}" rx="7" ry="4.5" fill="#ef7f6c" opacity=".45"/>')
    mx, my = hx + 30, hy + 30
    expr_idle = (eyes_open() + cheeks +
                 f'<path d="M{mx - 14} {my - 2}q8 7 16 1" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
    expr_happy = (f'<path d="M{ex - 7} {ey + 2}q7 -10 14 0M{ex - 32} {ey}q6 -9 12 0" fill="none" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/>'
                  + cheeks.replace('opacity=".55"', 'opacity=".8"') +
                  f'<path d="M{mx - 18} {my - 6}q10 16 24 2q-12 -2 -24 -2z" fill="#7a2a1c" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>'
                  f'<path d="M{mx - 12} {my + 2}q6 4 12 0" fill="none" stroke="#ef7f6c" stroke-width="3" stroke-linecap="round"/>')
    expr_explain = (eyes_open(1) + cheeks +
                    f'<path d="M{ex - 6} {ey - 16}q7 -6 14 -2M{ex - 32} {ey - 12}l10 -2" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
                    f'<ellipse cx="{mx - 6}" cy="{my + 1}" rx="6.5" ry="7.5" fill="#7a2a1c" stroke="{INK}" stroke-width="2.6"/>')
    expr_concern = (eyes_open(-1) +
                    f'<path d="M{ex - 7} {ey - 14}l12 -4M{ex - 30} {ey - 14}l-10 -3" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>'
                    f'<path d="M{mx - 14} {my + 2}q8 -6 16 0" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
    # arms: resting paw vs. raised paw holding a magnifier (explain)
    arm_rest = f'<ellipse cx="{cx + 46}" cy="{cy + 20}" rx="13" ry="10" fill="#5a3a22" stroke="{INK}" stroke-width="3" transform="rotate(30 {cx + 46} {cy + 20})"/>'
    arm_explain = (f'<path d="M{cx + 40} {cy + 30}Q{cx + 80} {cy + 50} {cx + 108} {cy + 44}" fill="none" stroke="{INK}" stroke-width="16" stroke-linecap="round"/>'
                   f'<path d="M{cx + 40} {cy + 30}Q{cx + 80} {cy + 50} {cx + 108} {cy + 44}" fill="none" stroke="#5a3a22" stroke-width="10" stroke-linecap="round"/>'
                   f'<path d="M{cx + 110} {cy + 44}l14 -10" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
                   f'<circle cx="{cx + 138}" cy="{cy + 22}" r="19" fill="#dff0f6" fill-opacity=".55" stroke="{INK}" stroke-width="5"/>'
                   f'<path d="M{cx + 127} {cy + 15}a13 13 0 0 1 9 -7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>')
    shadow_ = f'<ellipse cx="{cx - 4}" cy="{cy + 92}" rx="118" ry="14" fill="#2a1a10" opacity=".3"/>'
    body = (f'<g class="shadow">{shadow_}</g>'
            f'<g class="body">{"".join(spines)}{body_shape}{tips}{feet}{belly}{satchel}'
            f'<g class="arm arm-rest">{arm_rest}</g>'
            f'<g class="head">{head}'
            f'<g class="expr expr-idle">{expr_idle}</g>'
            f'<g class="expr expr-happy" display="none">{expr_happy}</g>'
            f'<g class="expr expr-explain" display="none">{expr_explain}</g>'
            f'<g class="expr expr-concern" display="none">{expr_concern}</g></g>'
            f'<g class="arm arm-explain" display="none">{arm_explain}</g></g>')
    return svg("guide-jezek", f"0 0 {W} {H}", body, defs, foot=(cx - 4, cy + 92), height_m=.6, label="Ježek",
               extra=' data-expr="idle"')


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    files = {"backdrop.svg": backdrop()}
    for fn in (lambda: tree_spruce(False), lambda: tree_spruce(True), tree_beech, tree_birch, fern, blueberry, stump, log, rock):
        n, s = fn()
        files[n + ".svg"] = s
    b, fr = leafpile()
    files.update({"leafpile-back.svg": b, "leafpile-front.svg": fr, "shadow.svg": shadow(), "sparkle.svg": sparkle(),
                  "stop-bubble.svg": stop_bubble(), "signpost.svg": signpost(), "ground-tile.svg": ground_tile(),
                  "path-tile.svg": path_tile(), "guide-jezek.svg": guide()})
    for name, s in files.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(s)
        print(f"{name:24s} {len(s.encode()) / 1024:6.1f} KB")
