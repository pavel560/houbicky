#!/usr/bin/env python3
"""Houbičky v2 — „Výprava do lesa“ as a 2D side-scrolling walk (parent's decision 2026-10-11).

Run:  python3 design/build_side.py  ->  art/vyprava/side-*.svg
Deterministic, stdlib only; reuses the forest hand of build_scene.py so Les and Výprava match.

STAGE: every side layer uses a stage height of 1000 units (like the Les panorama). The app shows a window
~1333–1600 units wide (vbW = 1000 * screenW / screenH) and scrolls x. Parallax factors in DESIGN-v2 §4.

Seamless rules:
  * side-far / side-mid / side-front: width 2048, periodic content (integer-cycle waves, every object that
    crosses an edge is drawn twice, once shifted by ±2048) → tile by repeating at x + k*2048.
  * ground segments: width 1024; surface height at the left edge = data-y-in, right edge = data-y-out,
    slope 0 at both edges, all bands are offsets of the surface → any segment follows any segment if the
    next one is shifted vertically by (prev.y-out − next.y-in). No gradients tied to absolute y.
    data-profile = surface y sampled every 64 units (17 values) for placing actors/props by interpolation.
"""
import math
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_scene as bs  # noqa: E402

OUT = os.path.join(HERE, "..", "art", "vyprava")
INK = "#3b2417"
f = bs.f
smooth = bs.smooth
TW = 2048          # tile width of parallax layers
SEG = 1024         # ground segment width
Y0 = 720           # reference surface height (stage units, 1000 tall)
TRAIL_T = 30       # trail band thickness (the child walks at surface + TRAIL_T * .55)
BODY_BOTTOM = 1400


def seed(n):
    bs.R = random.Random(n)
    return bs.R


def wrap_copies(x, half_w, g):
    """Emit g at x plus a wrapped copy when it crosses a tile edge."""
    out = g
    if x - half_w < 0:
        out += f'<g transform="translate({TW} 0)">{g}</g>'
    if x + half_w > TW:
        out += f'<g transform="translate({-TW} 0)">{g}</g>'
    return out


def periodic_ridge(y0, amps, phase, step=32):
    pts = []
    for i in range(0, TW // step + 1):
        x = i * step
        y = y0 + sum(a * math.sin(2 * math.pi * k * x / TW + phase * k) for k, a in amps)
        pts.append((x, y))
    return pts


def band_path(pts, bottom):
    return smooth(pts, closed=False) + f"L{TW} {bottom}L0 {bottom}Z"


def doc(name, w, h, body, defs="", extra="", label=""):
    aria = f' role="img" aria-label="{label}"' if label else ' aria-hidden="true"'
    d = f"<defs>{defs}</defs>" if defs else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" class="vy side {name}"{aria}{extra}>'
            f'{d}{body}</svg>\n')


# ---------------------------------------------------------------- parallax layers

def side_sky():
    defs = ('<linearGradient id="ssk-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9d0d6"/>'
            '<stop offset=".45" stop-color="#f3e2bf"/><stop offset=".75" stop-color="#f6cf97"/><stop offset="1" stop-color="#eeb87f"/></linearGradient>'
            '<radialGradient id="ssk-sun" cx="78%" cy="38%" r="60%"><stop offset="0" stop-color="#fff6dc" stop-opacity=".95"/>'
            '<stop offset=".3" stop-color="#ffe9b8" stop-opacity=".5"/><stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient>')
    body = '<rect width="1600" height="1000" fill="url(#ssk-g)"/><rect width="1600" height="1000" fill="url(#ssk-sun)"/>'
    R = seed(201)
    cl = []
    for cx, cy, s in [(200, 150, 1), (760, 90, .8), (1300, 170, 1.1)]:
        pts = [(cx + 150 * s * math.cos(2 * math.pi * i / 10) * (1 + R.uniform(-.15, .15)),
                cy + 34 * s * math.sin(2 * math.pi * i / 10) * (1 + R.uniform(-.25, .25)) - (16 * s if math.sin(2 * math.pi * i / 10) < 0 else 0))
               for i in range(10)]
        cl.append(smooth(pts))
    body += f'<path d="{"".join(cl)}" fill="#fff8ea" opacity=".55"/>'
    return doc("side-sky", 1600, 1000, body, defs, ' preserveAspectRatio="xMidYMid slice" data-parallax="0"', "Nebe")


def side_far():
    R = seed(202)
    body = f'<path d="{band_path(periodic_ridge(560, [(1, 22), (3, 12), (7, 5)], .4), 1000)}" fill="#a7a9bd"/>'
    for row, (base, hmin, hmax, step, col) in enumerate([(600, 110, 190, 42, "#9aa0b6"), (650, 140, 220, 54, "#8a8f9e")]):
        ds = []
        for i in range(TW // step):
            x = i * step + R.uniform(-step * .25, step * .25)
            b = base + 14 * math.sin(2 * math.pi * 2 * x / TW + row)
            h = R.uniform(hmin, hmax)
            w = h * R.uniform(.22, .28)
            d = bs.spruce(x, b, h, w, 6)
            ds.append(d)
            if x - w < 0:
                ds.append(bs.spruce(x + TW, b, h, w, 6))
            if x + w > TW:
                ds.append(bs.spruce(x - TW, b, h, w, 6))
        body += f'<path d="{"".join(ds)}" fill="{col}"/>'
        body += f'<path d="{band_path(periodic_ridge(base + 10, [(2, 10), (5, 6)], row + 1.3), 1000)}" fill="{col}"/>'
    defs = ('<linearGradient id="sfa-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dcae" stop-opacity="0"/>'
            '<stop offset="1" stop-color="#f6dcae" stop-opacity=".85"/></linearGradient>')
    body += f'<rect y="460" width="{TW}" height="320" fill="url(#sfa-h)"/>'
    return doc("side-far", TW, 1000, body, defs, ' data-parallax=".15" data-seamless="x"', "Les v dálce")


def side_mid():
    """Mid forest: trunks + crowns on a forest-floor band (y≈640). Animals run on data-run-y."""
    R = seed(203)
    defs = ('<linearGradient id="smi-birch" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfc8b8"/>'
            '<stop offset=".35" stop-color="#fbf8f0"/><stop offset="1" stop-color="#bdb5a2"/></linearGradient>'
            '<linearGradient id="smi-beech" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f7a72"/>'
            '<stop offset=".35" stop-color="#b3ada2"/><stop offset="1" stop-color="#6f6a62"/></linearGradient>')
    floor_y = 650
    body = ""
    trees = [("spruce", 120), ("beech", 420), ("birch", 700), ("birch", 745), ("spruce", 980), ("beech", 1290),
             ("spruce", 1560), ("birch", 1800), ("spruce", 2010)]
    for kind, x in trees:
        b = floor_y + 6 * math.sin(2 * math.pi * 3 * x / TW)
        if kind == "spruce":
            h, w = R.uniform(520, 640), R.uniform(120, 150)
            d = bs.spruce(x, b, h, w, 10)
            g = (f'<path d="{d}" fill="#3a5a44" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
                 f'<path d="{d}" fill="#24402f" opacity=".7" clip-path="url(#smi-c{x})"/>'
                 f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
            defs += f'<clipPath id="smi-c{x}"><rect x="{x}" y="0" width="300" height="1000"/></clipPath>'
            half = w
        elif kind == "birch":
            g = bs.birch(x, b, 40, 26).replace("url(#g-birch)", "url(#smi-birch)") + \
                bs.crown(x, 110, 140, ["#b8892a", "#d9b23a", "#f0d266"], n=7)
            half = 150
        else:
            g = bs.beech(x, b, -60, 60).replace("url(#g-beech)", "url(#smi-beech)") + \
                bs.crown(x, 40, 260, ["#9c4a22", "#c46a2a", "#de9a38", "#efc15a"], n=9)
            half = 280
        body += wrap_copies(x, half, g)
    floor = band_path(periodic_ridge(floor_y, [(3, 6), (5, 4)], .9), 1000)
    body = (f'<path d="{floor}" fill="#a88d4e" stroke="#6b5a2c" stroke-width="3"/>' + body)
    # floor dressing: bushes along the band (seam-safe)
    bush = []
    for i in range(16):
        x = i * TW / 16 + R.uniform(-30, 30)
        y = floor_y + 8
        r = R.uniform(30, 52)
        g = f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(r * 1.5)}" ry="{f(r * .6)}" fill="{R.choice(["#8a9a4c", "#7d8c45", "#9c6a34"])}" opacity=".7"/>'
        bush.append(wrap_copies(x, r * 1.6, g))
    body += "".join(bush)
    # haze over the mid layer so the play layer pops
    body += f'<rect width="{TW}" height="1000" fill="#f3e2bf" opacity=".22"/>'
    return doc("side-mid", TW, 1000, body, defs, f' data-parallax=".45" data-seamless="x" data-run-y="{floor_y}"', "Les")


def side_front():
    """Foreground strip (bottom of the screen, in front of actors): ferns, grass, fallen leaves. Transparent above."""
    R = seed(204)
    H = 360
    body = ""
    # dark ground lip along the bottom
    lip = periodic_ridge(300, [(4, 10), (9, 5)], .2, step=32)
    body += f'<path d="{band_path(lip, H)}" fill="#4a3220"/>'
    syms = bs.LEAF_SYMBOLS.replace('id="lf-', 'id="sfr-lf-')
    for i in range(7):
        x = 150 + i * TW / 7 + R.uniform(-60, 60)
        s = R.uniform(.55, .85)
        flip = R.choice([1, -1])
        fern = bs.fern(0, 0, s, flip, R.choice(["#b5652a", "#c07a2e"]), R.choice(["#8a4520", "#94541f"]))
        g = f'<g transform="translate({f(x)} {H})">{fern}</g>'
        body += wrap_copies(x, 260 * s, g)
    blades = []
    for i in range(90):
        x = i * TW / 90 + R.uniform(-8, 8)
        hgt = R.uniform(40, 90)
        dx = R.uniform(-20, 20)
        blades.append((x, f"M{f(x)} {H}q{f(dx * .3)} {f(-hgt * .6)} {f(dx)} {f(-hgt)}"))
    gr = "".join(d for _, d in blades) + "".join(d.replace(f"M{f(x)}", f"M{f(x + TW)}", 1) for x, d in blades if x < 30)
    body += f'<path d="{gr}" fill="none" stroke="#56692f" stroke-width="5" stroke-linecap="round"/>'
    ls = []
    for _ in range(40):
        x, y = R.uniform(0, TW), R.uniform(306, 350)
        k = R.choice(["sfr-lf-beech", "sfr-lf-oak", "sfr-lf-birch", "sfr-lf-maple"])
        u = (f'<use href="#{k}" x="-16" y="-11" width="32" height="22" transform="translate({f(x)} {f(y)}) rotate({int(R.uniform(0, 360))}) '
             f'scale(1.3 .8)" color="{R.choice(bs.LEAF_COLORS)}"/>')
        ls.append(wrap_copies(x, 22, u))
    body += "".join(ls)
    return doc("side-front", TW, H, body, syms, ' data-parallax="1.35" data-seamless="x" data-anchor="bottom"', "Kapradí v popředí")


# ---------------------------------------------------------------- ground segments (play layer, parallax 1)

def ease(t):
    return (1 - math.cos(math.pi * t)) / 2


def surface_fn(kind):
    D = 150
    if kind == "flat":
        return lambda x: Y0 + 10 * math.sin(math.pi * x / SEG) ** 2 * math.sin(2 * math.pi * x / SEG)
    if kind == "up":
        return lambda x: Y0 - D * ease(x / SEG)
    if kind == "down":
        return lambda x: Y0 - D + D * ease(x / SEG)
    if kind == "crest":
        return lambda x: Y0 - D - 40 * math.sin(math.pi * x / SEG) ** 2
    if kind == "brook":
        return lambda x: Y0
    raise ValueError(kind)


def ground_segment(kind, sd):
    R = seed(sd)
    y = surface_fn(kind)
    xs = [-2] + list(range(0, SEG + 1, 16)) + [SEG + 2]   # 2-unit overlap hides the anti-aliasing seam between segments
    top = [(x, y(x)) for x in xs]

    def off(dy, pts=top):
        return [(x, yy + dy) for x, yy in pts]

    def strip(a, b):  # band between offsets a and b (a above b)
        up, lo = off(a), off(b)[::-1]
        return smooth(up, closed=False) + "L" + smooth(lo, closed=False)[1:].replace("M", "", 1) + "Z" if False else \
            "M" + "L".join(f"{f(px)} {f(py)}" for px, py in up) + "L" + "L".join(f"{f(px)} {f(py)}" for px, py in lo) + "Z"

    back, trail, front = "", "", ""
    # back bank: moss/litter rising a little behind the trail (mushrooms & props stand on the surface line)
    bank_top = [(x, yy - 22 - 8 * math.sin(2 * math.pi * 2 * x / SEG) * math.sin(math.pi * x / SEG) ** 2) for x, yy in top]
    back += ("<path d=\"M" + "L".join(f"{f(px)} {f(py)}" for px, py in bank_top) +
             "L" + "L".join(f"{f(px)} {f(py + 4)}" for px, py in top[::-1]) + f'Z" fill="#7d8c45"/>')
    back += ("<path d=\"M" + "L".join(f"{f(px)} {f(py)}" for px, py in bank_top) + f'" fill="none" stroke="#5d6d33" stroke-width="3"/>')
    # moss tufts + litter on the bank (kept 40 units inside the edges → seam-safe)
    tufts, leaves = [], []
    for _ in range(26):
        x = R.uniform(40, SEG - 40)
        yy = y(x) - R.uniform(6, 20)
        tufts.append(f"M{f(x)} {f(yy)}a3 2.6 0 1 1 .1 0")
    for _ in range(18):
        x = R.uniform(40, SEG - 40)
        yy = y(x) - R.uniform(4, 18)
        leaves.append(f'<path d="M0 0C4 -6 12 -6 16 0C12 5 4 5 0 0Z" transform="translate({f(x)} {f(yy)}) rotate({int(R.uniform(-30, 30))})" '
                      f'fill="{R.choice(bs.LEAF_COLORS)}" stroke="{INK}" stroke-width="1"/>')
    back += f'<path d="{"".join(tufts)}" fill="none" stroke="#a3b25e" stroke-width="2.4" stroke-linecap="round"/>' + "".join(leaves)
    # trail band (packed earth seen slightly from above) + its lit front edge
    if kind == "brook":
        # trail over the water as a little plank bridge between x 380..644
        trail += f'<path d="{strip(0, TRAIL_T)}" fill="#cfae72"/>'
    else:
        trail += f'<path d="{strip(0, TRAIL_T)}" fill="#cfae72"/>'
    peb = []
    for _ in range(30):
        x = R.uniform(30, SEG - 30)
        if kind == "brook" and 360 < x < 664:
            continue
        yy = y(x) + R.uniform(8, TRAIL_T - 6)
        r = R.uniform(2.5, 5)
        peb.append(f'<ellipse cx="{f(x)}" cy="{f(yy)}" rx="{f(r * 1.4)}" ry="{f(r * .8)}"/>')
    trail += f'<g fill="#a39d92" stroke="{INK}" stroke-width="1" opacity=".85">{"".join(peb)}</g>'
    trail += ("<path d=\"M" + "L".join(f"{f(px)} {f(py + TRAIL_T)}" for px, py in top) + f'" fill="none" stroke="#e6cf96" stroke-width="4"/>')
    # front: soil face below the trail with strata, roots and stones, to the bottom
    soil = ("M" + "L".join(f"{f(px)} {f(py + TRAIL_T)}" for px, py in top) + f"L{SEG + 2} {BODY_BOTTOM}L-2 {BODY_BOTTOM}Z")
    front += f'<path d="{soil}" fill="#6b4a2c"/>'
    for dy, col, w in [(70, "#5c3e24", 6), (150, "#523720", 8), (260, "#4a3220", 10)]:
        front += ("<path d=\"M" + "L".join(f"{f(px)} {f(py + TRAIL_T + dy)}" for px, py in top) +
                  f'" fill="none" stroke="{col}" stroke-width="{w}" opacity=".8"/>')
    for _ in range(5):
        x = R.uniform(60, SEG - 60)
        yy = y(x) + TRAIL_T + R.uniform(10, 40)
        d = f"M{f(x)} {f(yy)}q{f(R.uniform(-30, 30))} {f(R.uniform(30, 60))} {f(R.uniform(-60, 60))} {f(R.uniform(60, 110))}"
        front += (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
                  f'<path d="{d}" fill="none" stroke="#8a6644" stroke-width="5" stroke-linecap="round"/>')
    st = []
    for _ in range(9):
        x = R.uniform(40, SEG - 40)
        yy = y(x) + TRAIL_T + R.uniform(30, 200)
        r = R.uniform(8, 18)
        st.append(f'<ellipse cx="{f(x)}" cy="{f(yy)}" rx="{f(r * 1.4)}" ry="{f(r)}"/>')
    front += f'<g fill="#8e887c" stroke="{INK}" stroke-width="2">{"".join(st)}</g>'
    # front edge of the trail: grass + moss overhang
    gr = []
    for _ in range(40):
        x = R.uniform(10, SEG - 10)
        yy = y(x) + TRAIL_T + 2
        gr.append(f"M{f(x)} {f(yy)}q{f(R.uniform(-3, 3))} 8 {f(R.uniform(-6, 6))} {f(R.uniform(10, 18))}")
    front += f'<path d="{"".join(gr)}" fill="none" stroke="#5d6d33" stroke-width="3" stroke-linecap="round"/>'
    if kind == "brook":
        # channel cut through the trail + soil, water, stones, plank bridge
        cx0, cx1 = 400, 624
        ch = f"M{cx0} {Y0 - 2}Q{cx0 + 20} {Y0 + 70} {(cx0 + cx1) / 2} {Y0 + 84}Q{cx1 - 20} {Y0 + 70} {cx1} {Y0 - 2}Z"
        front += (f'<path d="{ch}" fill="#3e2a1a"/>'
                  f'<path d="M{cx0 + 14} {Y0 + 40}Q{(cx0 + cx1) / 2} {Y0 + 52} {cx1 - 14} {Y0 + 40}Q{cx1 - 24} {Y0 + 74} {(cx0 + cx1) / 2} {Y0 + 80}'
                  f'Q{cx0 + 24} {Y0 + 74} {cx0 + 14} {Y0 + 40}Z" fill="#6fa3b8" stroke="{INK}" stroke-width="2.4"/>'
                  f'<path d="M{cx0 + 40} {Y0 + 50}q20 -5 40 0M{cx0 + 120} {Y0 + 56}q20 -5 40 0" fill="none" stroke="#e8f4f6" stroke-width="3" stroke-linecap="round" class="ripple"/>'
                  f'<ellipse cx="{cx0 + 60}" cy="{Y0 + 66}" rx="16" ry="8" fill="#9c968a" stroke="{INK}" stroke-width="2"/>'
                  f'<ellipse cx="{cx1 - 50}" cy="{Y0 + 70}" rx="20" ry="9" fill="#9c968a" stroke="{INK}" stroke-width="2"/>')
        planks = "".join(f'<rect x="{x}" y="{Y0 - 4}" width="30" height="{TRAIL_T + 8}" rx="4" fill="{"#b9874e" if i % 2 else "#a8783f"}" stroke="{INK}" stroke-width="2.4"/>'
                         for i, x in enumerate(range(cx0 - 20, cx1 + 10, 32)))
        trail += f'<g class="bridge">{planks}<path d="M{cx0 - 24} {Y0 + TRAIL_T + 4}H{cx1 + 26}" stroke="{INK}" stroke-width="5"/></g>'
        back += (f'<path d="M{cx0} {Y0 - 22}Q{(cx0 + cx1) / 2} {Y0 - 10} {cx1} {Y0 - 22}L{cx1} {Y0}L{cx0} {Y0}Z" fill="#6fa3b8" opacity=".9"/>'
                 f'<path d="M{cx0 + 30} {Y0 - 14}q30 -4 60 0M{cx0 + 130} {Y0 - 12}q30 -4 60 0" stroke="#e8f4f6" stroke-width="2.4" fill="none" class="ripple"/>')
    prof = " ".join(f(y(x)) for x in range(0, SEG + 1, 64))
    body = f'<g class="back">{back}</g><g class="trail">{trail}</g><g class="front">{front}</g>'
    name = f"side-ground-{kind}"
    return doc(name, SEG, BODY_BOTTOM, body,
               extra=(f' data-y-in="{f(y(0))}" data-y-out="{f(y(SEG))}" data-trail-t="{TRAIL_T}" data-walk-dy="{TRAIL_T * .55:.0f}"'
                      f' data-profile="{prof}" data-seamless="x-chain"'), label="Cestička")


# ---------------------------------------------------------------- avatar: the forager child

SKIN, SKIN_D = "#f1c9a5", "#d9a882"
HAT, HAT_D = "#e07a2a", "#b85a1a"
JACKET, JACKET_D = "#5b84b1", "#3f6390"
PANTS = "#5a4a6a"
BOOT = "#3f5a3a"


def seg2(p, a1, l1, a2, l2):
    k = (p[0] + l1 * math.sin(math.radians(a1)), p[1] + l1 * math.cos(math.radians(a1)))
    e = (k[0] + l2 * math.sin(math.radians(a2)), k[1] + l2 * math.cos(math.radians(a2)))
    return k, e


def stroke_limb(pts, col, w):
    d = "M" + "L".join(f"{f(x)} {f(y)}" for x, y in pts)
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + 5}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')


def boot(e, ang=0):
    return (f'<g transform="translate({f(e[0])} {f(e[1])}) rotate({f(ang)})">'
            f'<path d="M-10 -14h18v10q14 0 16 10H-12z" fill="{BOOT}" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/></g>')


def basket_small(x, y, s=1.0):
    return (f'<g transform="translate({f(x)} {f(y)}) scale({s})">'
            f'<path d="M-24 -6q24 -40 48 0" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
            f'<path d="M-24 -6q24 -40 48 0" fill="none" stroke="#c98d4a" stroke-width="3" stroke-linecap="round"/>'
            f'<path d="M-30 -6h60l-7 30h-46z" fill="#c98d4a" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
            f'<path d="M-26 4h52M-24 13h48" stroke="#8a5a2e" stroke-width="2.2"/>'
            f'<path d="M-30 -6h60" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>'
            f'<path d="M-30 -6h60" stroke="#e3b072" stroke-width="2.6" stroke-linecap="round"/></g>')


def child_pose(p):
    """p: dict(bob, lean, head, near_leg=(a1,a2), far_leg=(a1,a2), far_arm=(a1,a2), near_arm=(a1,a2), basket='hand'|'reach', look=False)"""
    hip = (150, 290 + p["bob"])
    out = ""
    # far leg + far arm (behind body)
    k, e = seg2(hip, *p["far_leg"][:1], 46, p["far_leg"][1], 44)
    out += stroke_limb([hip, k, (e[0], e[1] - 8)], "#4a3c58", 16) + boot(e, p.get("far_boot", 0))
    sh = (150 + p["lean"] * .9, 214 + p["bob"])
    k2, e2 = seg2(sh, p["far_arm"][0], 34, p["far_arm"][1], 30)
    out += stroke_limb([sh, k2, e2], JACKET_D, 13) + f'<circle cx="{f(e2[0])}" cy="{f(e2[1])}" r="7" fill="{SKIN_D}" stroke="{INK}" stroke-width="2.4"/>'
    # torso: raincoat (A-line), slightly leaning
    lx = p["lean"]
    torso = (f"M{f(118 + lx)} {f(214 + p['bob'])}Q{f(150 + lx)} {f(198 + p['bob'])} {f(182 + lx)} {f(214 + p['bob'])}"
             f"L{f(192)} {f(298 + p['bob'])}Q{f(150)} {f(312 + p['bob'])} {f(108)} {f(298 + p['bob'])}Z")
    out += f'<path d="{torso}" fill="{JACKET}" stroke="{INK}" stroke-width="3.2" stroke-linejoin="round"/>'
    out += (f'<path d="M{f(152 + lx * .6)} {f(212 + p["bob"])}L{f(152)} {f(304 + p["bob"])}" stroke="{JACKET_D}" stroke-width="3"/>'
            f'<circle cx="{f(160 + lx * .5)}" cy="{f(236 + p["bob"])}" r="3.4" fill="#f2c94a" stroke="{INK}" stroke-width="1.2"/>'
            f'<circle cx="{f(160 + lx * .3)}" cy="{f(262 + p["bob"])}" r="3.4" fill="#f2c94a" stroke="{INK}" stroke-width="1.2"/>'
            f'<path d="M{f(170 + lx)} {f(258 + p["bob"])}h14v12h-14z" fill="{JACKET_D}" stroke="{INK}" stroke-width="2"/>')   # pocket
    # near leg (front)
    k, e = seg2((hip[0] + 6, hip[1]), p["near_leg"][0], 46, p["near_leg"][1], 44)
    out += stroke_limb([(hip[0] + 6, hip[1]), k, (e[0], e[1] - 8)], PANTS, 17) + boot(e, p.get("near_boot", 0))
    # head
    hx, hy = 152 + lx * 1.4, 150 + p["bob"]
    S = 1.22
    ht = p["head"]
    head = (f'<g transform="rotate({ht} {f(hx)} {f(hy + 40)})"><g transform="translate({f(hx)} {f(hy)}) scale({S}) translate({f(-hx)} {f(-hy)})">'
            f'<path d="M{f(hx - 30)} {f(hy + 6)}q-8 30 8 40l12 -8z" fill="#7a4a2a" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'   # hair at back
            f'<circle cx="{f(hx)}" cy="{f(hy + 8)}" r="38" fill="{SKIN}" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M{f(hx + 35)} {f(hy + 12)}q9 5 2 12" fill="{SKIN}" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'   # nose
            f'<ellipse cx="{f(hx + 18)}" cy="{f(hy + 10)}" rx="4.6" ry="6" fill="{INK}"/><circle cx="{f(hx + 19.5)}" cy="{f(hy + 7.5)}" r="1.7" fill="#fff"/>'
            f'<path d="M{f(hx + 12)} {f(hy)}q6 -4 12 0" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>'
            f'<ellipse cx="{f(hx + 9)}" cy="{f(hy + 24)}" rx="8" ry="5" fill="#ef7f6c" opacity=".55"/>'
            f'<path d="M{f(hx + 20)} {f(hy + 29)}q6 4 11 -1" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>'
            f'<ellipse cx="{f(hx - 12)}" cy="{f(hy + 14)}" rx="7.5" ry="9.5" fill="{SKIN_D}" stroke="{INK}" stroke-width="2.2"/>'   # ear
            # knit hat with bobble + turned-up band (band sits above the eyes)
            f'<path d="M{f(hx - 39)} {f(hy - 8)}Q{f(hx - 36)} {f(hy - 54)} {f(hx)} {f(hy - 56)}Q{f(hx + 36)} {f(hy - 54)} {f(hx + 39)} {f(hy - 8)}Z" fill="{HAT}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
            f'<path d="M{f(hx - 20)} {f(hy - 48)}v34M{f(hx - 4)} {f(hy - 54)}v40M{f(hx + 14)} {f(hy - 52)}v38M{f(hx + 28)} {f(hy - 44)}v32" stroke="{HAT_D}" stroke-width="2.4"/>'
            f'<rect x="{f(hx - 41)}" y="{f(hy - 16)}" width="82" height="14" rx="7" fill="{HAT_D}" stroke="{INK}" stroke-width="3"/>'
            f'<circle cx="{f(hx - 4)}" cy="{f(hy - 64)}" r="13" fill="#f6e2b0" stroke="{INK}" stroke-width="3"/></g>')
    head += "</g>"
    out += head
    # near arm: carries the basket (or reaches down to pick)
    sh2 = (156 + lx, 216 + p["bob"])
    k3, e3 = seg2(sh2, p["near_arm"][0], 34, p["near_arm"][1], 30)
    if p["basket"] == "hand":
        out += basket_small(e3[0] + 4, e3[1] + 4)
    out += stroke_limb([sh2, k3, e3], JACKET, 14) + f'<circle cx="{f(e3[0])}" cy="{f(e3[1])}" r="7.5" fill="{SKIN}" stroke="{INK}" stroke-width="2.4"/>'
    if p["basket"] == "ground":
        out += basket_small(84, 372, .95)
    return out


CHILD_POSES = {
    "idle": dict(bob=0, lean=0, head=0, near_leg=(4, 2), far_leg=(-6, -4), far_arm=(10, 4), near_arm=(-8, 30), basket="hand"),
    "walk-1": dict(bob=3, lean=4, head=2, near_leg=(30, 14), far_leg=(-24, -44), far_arm=(-30, -10), near_arm=(-4, 34), basket="hand", far_boot=-25),
    "walk-2": dict(bob=-3, lean=4, head=0, near_leg=(6, -2), far_leg=(-6, -34), far_arm=(-8, 4), near_arm=(-8, 32), basket="hand", far_boot=-10),
    "walk-3": dict(bob=3, lean=4, head=-2, near_leg=(-24, -44), far_leg=(30, 14), far_arm=(30, 50), near_arm=(-12, 26), basket="hand", near_boot=-25),
    "walk-4": dict(bob=-3, lean=4, head=0, near_leg=(-6, -34), far_leg=(6, -2), far_arm=(8, 24), near_arm=(-8, 32), basket="hand", near_boot=-10),
    "pick": dict(bob=34, lean=22, head=14, near_leg=(64, -26), far_leg=(-26, -64), far_arm=(-20, 10), near_arm=(48, 18), basket="ground"),
    "look": dict(bob=0, lean=6, head=-6, near_leg=(4, 2), far_leg=(-8, -6), far_arm=(10, 4), near_arm=(170, 150), basket="ground", look=True),
}


def child():
    groups = []
    for i, (name, p) in enumerate(CHILD_POSES.items()):
        disp = "" if name == "idle" else ' display="none"'
        groups.append(f'<g class="pose pose-{name}"{disp}>{child_pose(p)}</g>')
    sh = '<g class="shadow"><ellipse cx="150" cy="384" rx="62" ry="9" fill="#2a1a10" opacity=".28"/></g>'
    return doc("side-child", 300, 400, sh + "".join(groups),
               extra=' data-foot="150 384" data-height="400" data-pose="idle" data-poses="idle walk-1 walk-2 walk-3 walk-4 pick look" data-facing="right"',
               label="Houbař")


# ---------------------------------------------------------------- hedgehog walking (side view)

def jezek_walk():
    """Reuses guide-jezek (same drawing): removes the two standing feet, adds 4 trot-foot groups + idle feet.
    Expressions (.expr-*) and the magnifier arm are kept, so the companion can talk while walking."""
    import build_vyprava as bv
    s = bv.guide()
    feet = re.findall(r'<ellipse cx="[\d.]+" cy="27[68]" rx="20" ry="10" fill="#5a3a22" stroke="#3b2417" stroke-width="3"/>', s)
    assert len(feet) == 2, feet
    for ft in feet:
        s = s.replace(ft, "", 1)
    s = s.replace('class="vy vy-guide-jezek"', 'class="vy vy-guide-jezek side-jezek"').replace('id="gj-', 'id="sj-').replace('url(#gj-', 'url(#sj-')
    s = s.replace('aria-label="Ježek"', 'aria-label="Ježek" data-pose="idle" data-poses="idle walk-1 walk-2 walk-3 walk-4"')

    def ft(x, y, ang=0):
        return f'<ellipse cx="{x}" cy="{y}" rx="20" ry="10" transform="rotate({ang} {x} {y})" fill="#5a3a22" stroke="{INK}" stroke-width="3"/>'
    poses = {"idle": ft(126, 276) + ft(206, 278),
             "walk-1": ft(108, 278, -14) + ft(222, 272, 18),
             "walk-2": ft(130, 280) + ft(196, 280),
             "walk-3": ft(146, 272, 18) + ft(186, 278, -14),
             "walk-4": ft(130, 280) + ft(196, 280)}
    fg = "".join(f'<g class="feet pose-{k}"{"" if k == "idle" else " display=" + chr(34) + "none" + chr(34)}>{v}</g>' for k, v in poses.items())
    # feet sit behind the body: insert right after the opening of .body
    s = s.replace('<g class="body">', '<g class="body">' + fg, 1)
    return s


# ---------------------------------------------------------------- fork marker

def fork_sign():
    body = (f'<path d="M100 330V70" stroke="{INK}" stroke-width="18" stroke-linecap="round"/><path d="M100 330V70" stroke="#9c6b3e" stroke-width="11" stroke-linecap="round"/>'
            f'<path d="M30 40h120l30 -26v0l12 40-40 20 6 -14H30z" fill="#c98d4a" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            f'<path d="M30 120h120l12 14 26 18-38 6 2 -10H30z" fill="#c98d4a" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
            # glyphs: hill (up) and water waves (down to the brook)
            f'<path d="M50 52l26 -22 18 14 14 -10 20 18z" fill="#7d8c45" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'
            f'<path d="M48 140q10 -8 20 0t20 0t20 0t20 0" fill="none" stroke="#3f7d9a" stroke-width="5" stroke-linecap="round"/>')
    return doc("side-fork-sign", 220, 340, body, extra=' data-foot="100 330"', label="Rozcestí")


# ---------------------------------------------------------------- end-check clearing (static backdrop)

def end_clearing():
    """Cosy forest clearing for the hedgehog's basket check. 1600x1000 (16:10); shown with
    preserveAspectRatio xMidYMid slice, so 4:3 crops x 133..1467. Quiet zones (no detail, low contrast):
      HUD top-left  x 0–45 % y 0–12 %      buttons top-right x 68–100 % y 0–40 %
      hedgehog      x 0–36 % y 50–100 %    cloth + finds     x 28–100 % y 56–94 %
    Interest lives in the tree line (y 30–56 %) and the outer side edges."""
    R = seed(260)
    W, H = 1600, 1000
    HZ = 520                       # where the clearing floor meets the tree line
    defs = ('<linearGradient id="ec-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfd4d8"/>'
            '<stop offset=".45" stop-color="#f3e2bf"/><stop offset="1" stop-color="#f6cf97"/></linearGradient>'
            '<radialGradient id="ec-sun" cx="62%" cy="30%" r="55%"><stop offset="0" stop-color="#fff6dc" stop-opacity=".9"/>'
            '<stop offset=".35" stop-color="#ffe9b8" stop-opacity=".45"/><stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient>'
            '<linearGradient id="ec-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7a45a"/>'
            '<stop offset=".35" stop-color="#a99a52"/><stop offset="1" stop-color="#8c7a40"/></linearGradient>'
            '<radialGradient id="ec-pool" cx="56%" cy="74%" r="46%"><stop offset="0" stop-color="#f4e09a" stop-opacity=".55"/>'
            '<stop offset=".6" stop-color="#e9cf86" stop-opacity=".2"/><stop offset="1" stop-color="#e9cf86" stop-opacity="0"/></radialGradient>'
            '<radialGradient id="ec-vig" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#3b2417" stop-opacity="0"/>'
            '<stop offset="1" stop-color="#3b2417" stop-opacity=".28"/></radialGradient>'
            '<linearGradient id="ec-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dcae" stop-opacity="0"/>'
            '<stop offset="1" stop-color="#f6dcae" stop-opacity=".8"/></linearGradient>'
            '<linearGradient id="ec-birch" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfc8b8"/>'
            '<stop offset=".35" stop-color="#fbf8f0"/><stop offset="1" stop-color="#bdb5a2"/></linearGradient>'
            '<linearGradient id="ec-beech" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f7a72"/>'
            '<stop offset=".35" stop-color="#b3ada2"/><stop offset="1" stop-color="#6f6a62"/></linearGradient>')
    body = f'<rect width="{W}" height="{H}" fill="url(#ec-sky)"/><rect width="{W}" height="{H}" fill="url(#ec-sun)"/>'
    cl = []
    for cx, cy, sc in [(330, 130, 1.0), (840, 80, .7)]:          # clouds only left/centre (top-right stays calm)
        pts = [(cx + 150 * sc * math.cos(2 * math.pi * i / 10) * (1 + R.uniform(-.15, .15)),
                cy + 32 * sc * math.sin(2 * math.pi * i / 10) * (1 + R.uniform(-.2, .2)) - (14 * sc if math.sin(2 * math.pi * i / 10) < 0 else 0))
               for i in range(10)]
        cl.append(smooth(pts))
    body += f'<path d="{"".join(cl)}" fill="#fff8ea" opacity=".55"/>'
    # far misty spruce rows behind the clearing (continuous, so no grey band)
    for base, hmin, hmax, step, col in [(HZ - 70, 90, 150, 40, "#a9adc0"), (HZ - 20, 120, 190, 50, "#949aad")]:
        ds = []
        x = -20
        while x < W + 40:
            h = R.uniform(hmin, hmax)
            ds.append(bs.spruce(x, base + R.uniform(-8, 8), h, h * .25, 6))
            x += step * R.uniform(.7, 1.2)
        body += f'<path d="{"".join(ds)}" fill="{col}"/>'
    body += f'<rect y="{HZ - 200}" width="{W}" height="230" fill="url(#ec-haze)"/>'
    # mid tree line: fuller at the sides, two small birches near centre-left; right side kept low (buttons)
    mids = ""
    for kind, x, top in [("beech", 210, 120), ("spruce", 380, 0), ("birch", 560, 250), ("birch", 600, 300),
                         ("spruce", 1180, 0), ("birch", 1330, 300), ("beech", 1500, 260)]:
        b = HZ + 18
        if kind == "spruce":
            h = 340 if x < 800 else 260
            d = bs.spruce(x, b, h, h * .26, 8)
            mids += (f'<path d="{d}" fill="#4f6e58" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round" opacity=".92"/>')
        elif kind == "birch":
            mids += bs.birch(x, b, top, 18).replace("url(#g-birch)", "url(#ec-birch)")
            mids += bs.crown(x, top + 10, 90, ["#b8892a", "#d9b23a", "#f0d266"], n=6)
        else:
            mids += bs.beech(x, b, top, 40).replace("url(#g-beech)", "url(#ec-beech)")
            mids += bs.crown(x, top - 10, 170 if x < 800 else 120, ["#9c4a22", "#c46a2a", "#de9a38", "#efc15a"], n=8)
    body += f'<g opacity=".95">{mids}</g>'
    # bushes along the clearing edge (soft, low)
    bush = ""
    for i in range(14):
        x = i * W / 13 + R.uniform(-30, 30)
        r = R.uniform(40, 70)
        bush += f'<ellipse cx="{f(x)}" cy="{f(HZ + 12)}" rx="{f(r * 1.6)}" ry="{f(r * .55)}" fill="{R.choice(["#7d8c45", "#8a9a4c", "#9c6a34"])}"/>'
    body += bush
    # clearing floor: gentle bowl, warm moss/grass, sunlit pool where the cloth goes, very low-contrast texture
    floor = smooth([(-20, HZ + 10), (300, HZ - 2), (800, HZ - 8), (1300, HZ - 2), (W + 20, HZ + 12)], closed=False) + f"L{W + 20} {H + 10}L-20 {H + 10}Z"
    body += f'<path d="{floor}" fill="url(#ec-floor)"/><path d="{floor}" fill="url(#ec-pool)"/>'
    body += f'<path d="{smooth([(-20, HZ + 10), (300, HZ - 2), (800, HZ - 8), (1300, HZ - 2), (W + 20, HZ + 12)], closed=False)}" fill="none" stroke="#7d6c34" stroke-width="3" opacity=".6"/>'
    # moss patches (soft blobs, darker toward the edges)
    mp = []
    for _ in range(26):
        x, y = R.uniform(0, W), R.uniform(HZ + 40, H)
        rx = R.uniform(60, 160)
        mp.append(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(rx * .28)}"/>')
    body += f'<g fill="#8f9a48" opacity=".35">{"".join(mp)}</g>'
    # scattered leaves, small and low-contrast in the quiet zones
    syms = bs.LEAF_SYMBOLS.replace('id="lf-', 'id="ec-lf-')
    defs += syms
    ls = []
    for _ in range(140):
        x, y = R.uniform(0, W), R.uniform(HZ + 30, H)
        quiet = (x > .28 * W and y > .56 * H) or (x < .36 * W and y > .5 * H)
        k = R.choice(["ec-lf-beech", "ec-lf-oak", "ec-lf-birch", "ec-lf-maple"])
        sc = (y - HZ) / (H - HZ) * .9 + .4
        ls.append(f'<use href="#{k}" x="-16" y="-11" width="32" height="22" transform="translate({f(x)} {f(y)}) scale({f(sc)} {f(sc * .55)}) rotate({int(R.uniform(0, 360))})" '
                  f'color="{R.choice(bs.LEAF_COLORS)}" opacity="{".45" if quiet else ".85"}"/>')
    body += "".join(ls)
    # grass tufts only along the tree-line edge and the outer bottom corners
    gr = []
    for _ in range(40):
        x = R.uniform(0, W)
        y = HZ + R.uniform(8, 40)
        for k in range(3):
            gr.append(f"M{f(x + k * 4)} {f(y)}q{f(-3 + k * 3)} -10 {f(-6 + k * 6)} -{f(16 + k * 4)}")
    for x0 in (20, W - 120):
        for _ in range(10):
            x, y = x0 + R.uniform(0, 100), H - R.uniform(0, 30)
            for k in range(3):
                gr.append(f"M{f(x + k * 5)} {f(y)}q{f(-4 + k * 4)} -14 {f(-8 + k * 8)} -{f(30 + k * 8)}")
    body += f'<path d="{"".join(gr)}" fill="none" stroke="#5d6d33" stroke-width="3" stroke-linecap="round" opacity=".8"/>'
    # framing: a big spruce trunk + fern at the far left edge, a mossy stump at the far right edge (outside the 4:3 crop mostly)
    big = bs.spruce(40, H + 40, 1100, 260, 12)
    body += (f'<clipPath id="ec-r"><rect x="40" y="0" width="300" height="{H}"/></clipPath>'
             f'<path d="{big}" fill="#3a5a44" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
             f'<path d="{big}" fill="#24402f" opacity=".7" clip-path="url(#ec-r)"/>'
             f'<path d="{big}" fill="none" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')
    body += f'<g transform="translate({W - 40} {H + 10})">{bs.fern(0, 0, .8, -1, "#c07a2e", "#94541f")}</g>'
    body += f'<rect width="{W}" height="{H}" fill="url(#ec-vig)"/>'
    zones = ' data-safe-hud="0 0 45 12" data-safe-buttons="68 0 100 40" data-safe-guide="0 50 36 100" data-safe-cloth="28 56 100 94"'
    return doc("end-clearing", W, H, body, defs,
               ' preserveAspectRatio="xMidYMid slice" data-crop-43="133 0 1334 1000"' + zones, "Mýtinka")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    files = {"side-sky.svg": side_sky(), "side-far.svg": side_far(), "side-mid.svg": side_mid(), "side-front.svg": side_front(),
             "side-child.svg": child(), "side-jezek.svg": jezek_walk(), "side-fork-sign.svg": fork_sign(), "end-clearing.svg": end_clearing()}
    for i, k in enumerate(["flat", "up", "crest", "down", "brook"]):
        files[f"side-ground-{k}.svg"] = ground_segment(k, 300 + i)
    for name, s in files.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(s)
        print(f"{name:26s} {len(s.encode()) / 1024:6.1f} KB")
