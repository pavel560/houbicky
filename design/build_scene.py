#!/usr/bin/env python3
"""Houbičky — generator of the forest panorama, basket, 'nechat v lese' zone and UI icon sprite.

Run:  python3 design/build_scene.py  ->  art/scene-forest.svg, art/basket*.svg, art/zone-les.svg, art/ui-icons.svg
Same ink + palette as the characters (build_art.py). Deterministic.
"""
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "art")
INK = "#3b2417"
R = random.Random(2026)

W, H = 3600, 1000          # panorama (v2: 25 species); the app shows a window of ~1333-1600 x 1000 and pans
W_L1 = 2400                # Level 1 pans only 0..2400 (8 species); Level 2 unlock opens 2400..3600
BLEED = 120


def f(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def j(a):
    return R.uniform(-a, a)


def smooth(pts, closed=True, t=1 / 6):
    n = len(pts)
    out = [f"M{f(pts[0][0])} {f(pts[0][1])}"]
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if (closed or i > 0) else pts[i]
        p1, p2 = pts[i], pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (closed or i + 2 < n) else pts[(i + 1) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t)
        c2 = (p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t)
        out.append(f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}")
    if closed:
        out.append("Z")
    return "".join(out)


def ridge(y0, amp, step, x0=-BLEED, x1=W + BLEED, phase=0.0, rough=0.0):
    pts = []
    x = x0
    while x <= x1:
        y = y0 + amp * math.sin(x / 260 + phase) + amp * .45 * math.sin(x / 97 + phase * 2) + j(rough)
        pts.append((x, y))
        x += step
    return pts


def band(pts, bottom=H + 40):
    return smooth(pts, closed=False) + f"L{f(pts[-1][0])} {bottom}L{f(pts[0][0])} {bottom}Z"


def spruce(x, base, h, w, tiers=7):
    """Jagged storybook spruce silhouette (one path)."""
    left, right = [], []
    for k in range(1, tiers + 1):
        t = k / tiers
        y_out = base - h + h * t * 0.92
        wo = w * (0.18 + 0.82 * t) * (1 + j(.06))
        wi = wo * 0.55
        y_in = y_out - h / tiers * 0.35
        left += [(x - wi, y_in), (x - wo, y_out + j(3))]
        right += [(x + wi, y_in), (x + wo, y_out + j(3))]
    pts = [(x, base - h)] + right + [(x + w * .12, base - h * .06), (x + w * .1, base + 4), (x - w * .1, base + 4),
                                    (x - w * .12, base - h * .06)] + left[::-1]
    return "M" + "L".join(f"{f(a)} {f(b)}" for a, b in pts) + "Z"


def crown(cx, cy, r, colors, n=9, spread=1.0):
    """Autumn tree crown as overlapping soft blobs (back to front: dark -> light)."""
    out = []
    for layer, col in enumerate(colors):
        blobs = []
        for _ in range(n):
            ang = R.uniform(0, 2 * math.pi)
            d = R.uniform(0, r * 0.75 * spread) * (1 - layer * .18)
            x = cx + d * math.cos(ang) - layer * r * .06
            y = cy + d * math.sin(ang) * .7 - layer * r * .08
            rr = r * R.uniform(.32, .5) * (1 - layer * .12)
            pts = []
            for i in range(8):
                a = 2 * math.pi * i / 8
                q = rr * (1 + j(.12))
                pts.append((x + q * math.cos(a), y + q * math.sin(a)))
            blobs.append(smooth(pts))
        if layer == 0:
            out.append(f'<path d="{"".join(blobs)}" fill="{col}"/>')
        else:
            out.append(f'<path d="{"".join(blobs)}" fill="{col}"/>')
    specks = []
    for _ in range(int(r / 6)):
        ang = R.uniform(0, 2 * math.pi)
        d = R.uniform(0, r * .8)
        x, y = cx + d * math.cos(ang), cy + d * math.sin(ang) * .7
        specks.append(f"M{f(x)} {f(y)}q4 -5 9 0q-4 5 -9 0z")
    out.append(f'<path d="{"".join(specks)}" fill="{colors[-1]}" opacity=".9"/>')
    out.append(f'<path d="{"".join(specks[::3])}" fill="{colors[0]}" opacity=".6" transform="translate(7 9)"/>')
    return "".join(out)


LEAF_SYMBOLS = """
<symbol id="lf-beech" viewBox="-16 -10 32 20"><path d="M-14 0C-8 -9 8 -9 14 0C8 9 -8 9 -14 0Z" fill="currentColor" stroke="#3b2417" stroke-width="1.4"/><path d="M-12 0H12M-5 0l-3 -4M2 0l-3 -5M-5 0l-3 4M2 0l-3 5" stroke="#3b2417" stroke-width=".9" opacity=".55" fill="none"/></symbol>
<symbol id="lf-oak" viewBox="-18 -11 36 22"><path d="M-16 0C-14 -5 -10 -2 -9 -6C-7 -10 -3 -4 -1 -8C2 -11 4 -4 7 -7C10 -9 11 -3 15 -3C17 -1 17 1 15 3C11 3 10 9 7 7C4 4 2 11 -1 8C-3 4 -7 10 -9 6C-10 2 -14 5 -16 0Z" fill="currentColor" stroke="#3b2417" stroke-width="1.3" stroke-linejoin="round"/><path d="M-15 0H14" stroke="#3b2417" stroke-width=".9" opacity=".5"/></symbol>
<symbol id="lf-birch" viewBox="-12 -9 24 18"><path d="M-10 0C-6 -8 6 -8 10 0C6 7 -6 7 -10 0Z" fill="currentColor" stroke="#3b2417" stroke-width="1.2"/></symbol>
<symbol id="lf-maple" viewBox="-16 -16 32 32"><path d="M0 -14L3 -7L9 -10L7 -3L14 -2L8 3L10 9L3 7L1 14H-1L-3 7L-10 9L-8 3L-14 -2L-7 -3L-9 -10L-3 -7Z" fill="currentColor" stroke="#3b2417" stroke-width="1.3" stroke-linejoin="round"/></symbol>
"""
LEAF_COLORS = ["#c7642a", "#d99a2b", "#a8402a", "#e3b23c", "#b9772f", "#8e4a24", "#cf8a2e"]


def litter(x0, x1, y0, y1, n, scale=(.7, 1.2)):
    out = []
    kinds = ["lf-beech", "lf-oak", "lf-birch", "lf-beech", "lf-birch", "lf-oak", "lf-maple"]
    for _ in range(n):
        x, y = R.uniform(x0, x1), R.uniform(y0, y1)
        k = R.choice(kinds)
        s = R.uniform(*scale) * (0.7 + 0.5 * (y - y0) / max(1, y1 - y0))
        w = {"lf-beech": 32, "lf-oak": 36, "lf-birch": 24, "lf-maple": 32}[k] * s
        h = {"lf-beech": 20, "lf-oak": 22, "lf-birch": 18, "lf-maple": 32}[k] * s
        out.append(f'<use href="#{k}" x="{f(-w / 2)}" y="{f(-h / 2)}" width="{f(w)}" height="{f(h)}" '
                   f'transform="translate({f(x)} {f(y)}) scale(1 .58) rotate({int(R.uniform(0, 360))})" color="{R.choice(LEAF_COLORS)}"/>')
    return "".join(out)


def tufts(x0, x1, y, n, col="#56692f", hgt=26):
    d = []
    for _ in range(n):
        x = R.uniform(x0, x1)
        yy = y + j(8)
        for k in range(4):
            dx = -9 + k * 6 + j(2)
            d.append(f"M{f(x + k * 3)} {f(yy)}q{f(dx * .3)} {f(-hgt * .5)} {f(dx)} {f(-hgt * R.uniform(.7, 1.1))}")
    return f'<path d="{"".join(d)}" fill="none" stroke="{col}" stroke-width="3.2" stroke-linecap="round"/>'


def fern(x, y, s=1.0, flip=1, col="#b5652a", dark="#8a4520"):
    """Autumn bracken: 3 arching fronds, each with fat, filled leaflets (pinnae) both sides."""
    out = []
    for k, (ang, L, c) in enumerate([(-100, 250, dark), (-70, 330, col), (-52, 270, col)]):
        a = math.radians(ang)
        ex, ey = x + flip * L * s * math.cos(a) + flip * 60 * s, y + L * s * math.sin(a) * .85
        cx_, cy_ = x + flip * L * s * math.cos(a) * .2, y + L * s * math.sin(a)
        pin = []
        for i in range(2, 17):
            t = i / 17
            px = (1 - t) ** 2 * x + 2 * (1 - t) * t * cx_ + t * t * ex
            py = (1 - t) ** 2 * y + 2 * (1 - t) * t * cy_ + t * t * ey
            tx = 2 * (1 - t) * (cx_ - x) + 2 * t * (ex - cx_)
            ty = 2 * (1 - t) * (cy_ - y) + 2 * t * (ey - cy_)
            tl = math.hypot(tx, ty) or 1
            tx, ty = tx / tl, ty / tl
            ln = (1 - t * .85) * 62 * s
            wd = ln * .22
            for sd in (-1, 1):
                nx, ny = -ty * sd, tx * sd                     # normal
                dx, dy = nx * .82 + tx * .45, ny * .82 + ty * .45  # angled toward the tip
                qx, qy = px + dx * ln, py + dy * ln
                mx, my = px + dx * ln * .5, py + dy * ln * .5
                pin.append(f"M{f(px)} {f(py)}Q{f(mx + tx * wd)} {f(my + ty * wd)} {f(qx)} {f(qy)}"
                           f"Q{f(mx - tx * wd)} {f(my - ty * wd)} {f(px)} {f(py)}Z")
        out.append(f'<path d="{"".join(pin)}" fill="{c}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>')
        out.append(f'<path d="M{f(x)} {f(y)}Q{f(cx_)} {f(cy_)} {f(ex)} {f(ey)}" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
    return '<g class="fern">' + "".join(out) + "</g>"


def birch(x, base, top, w):
    d = f"M{f(x - w / 2)} {f(top)}L{f(x - w / 2 - 2)} {f(base)}Q{f(x)} {f(base + 8)} {f(x + w / 2 + 3)} {f(base)}L{f(x + w / 2)} {f(top)}Z"
    marks = []
    y = top + 30
    while y < base - 10:
        sx = x - w / 2 + R.uniform(0, w * .55)
        ln = R.uniform(w * .25, w * .6)
        marks.append(f"M{f(sx)} {f(y)}q{f(ln / 2)} {f(j(3))} {f(ln)} 0")
        y += R.uniform(18, 46)
    return (f'<path d="{d}" fill="url(#g-birch)" stroke="{INK}" stroke-width="3"/>'
            f'<path d="{"".join(marks)}" fill="none" stroke="#2b2724" stroke-width="4" stroke-linecap="round"/>')


def beech(x, base, top, w):
    d = (f"M{f(x - w / 2)} {f(top)}C{f(x - w / 2 + 4)} {f((top + base) / 2)} {f(x - w / 2 - 6)} {f(base - 60)} {f(x - w * .9)} {f(base)}"
         f"Q{f(x)} {f(base + 14)} {f(x + w * .95)} {f(base)}C{f(x + w / 2 + 8)} {f(base - 60)} {f(x + w / 2 - 4)} {f((top + base) / 2)} {f(x + w / 2)} {f(top)}Z")
    return (f'<path d="{d}" fill="url(#g-beech)" stroke="{INK}" stroke-width="3"/>'
            f'<path d="M{f(x - w * .15)} {f(top + 40)}q-6 120 4 260M{f(x + w * .2)} {f(top + 90)}q6 140 -2 240" fill="none" stroke="#7d786f" stroke-width="3" opacity=".6"/>')


def build_scene():
    defs = [
        '<linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#b9d0d6"/><stop offset=".45" stop-color="#f3e2bf"/><stop offset=".78" stop-color="#f6cf97"/>'
        '<stop offset="1" stop-color="#eeb87f"/></linearGradient>',
        f'<radialGradient id="g-sun" cx="{1560}" cy="{330}" r="620" gradientUnits="userSpaceOnUse">'
        '<stop offset="0" stop-color="#fff6dc" stop-opacity=".95"/><stop offset=".25" stop-color="#ffe9b8" stop-opacity=".6"/>'
        '<stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient>',
        '<linearGradient id="g-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dcae" stop-opacity="0"/>'
        '<stop offset="1" stop-color="#f6dcae" stop-opacity=".85"/></linearGradient>',
        '<linearGradient id="g-midground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b79a55"/>'
        '<stop offset=".5" stop-color="#9a8343"/><stop offset="1" stop-color="#7f6b36"/></linearGradient>',
        '<linearGradient id="g-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6a3a"/>'
        '<stop offset="1" stop-color="#5c4126"/></linearGradient>',
        '<linearGradient id="g-birch" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfc8b8"/>'
        '<stop offset=".35" stop-color="#fbf8f0"/><stop offset="1" stop-color="#bdb5a2"/></linearGradient>',
        '<linearGradient id="g-beech" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7f7a72"/>'
        '<stop offset=".35" stop-color="#b3ada2"/><stop offset="1" stop-color="#6f6a62"/></linearGradient>',
        '<linearGradient id="g-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4d6" stop-opacity=".55"/>'
        '<stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></linearGradient>',
        '<linearGradient id="g-log" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6544"/>'
        '<stop offset=".5" stop-color="#6b4a30"/><stop offset="1" stop-color="#4a3221"/></linearGradient>',
        LEAF_SYMBOLS,
    ]
    sky = (f'<rect x="{-BLEED}" y="-40" width="{W + 2 * BLEED}" height="{H + 80}" fill="url(#g-sky)"/>'
           f'<rect x="{-BLEED}" y="-40" width="{W + 2 * BLEED}" height="{H + 80}" fill="url(#g-sun)"/>')
    # soft clouds
    clouds = []
    for cx, cy, s in [(300, 150, 1.0), (900, 90, .8), (1900, 170, 1.1), (2250, 70, .7)]:
        pts = []
        for i in range(10):
            a = math.pi * 2 * i / 10
            pts.append((cx + 150 * s * math.cos(a) * (1 + j(.15)), cy + 34 * s * math.sin(a) * (1 + j(.25)) - (16 * s if math.sin(a) < 0 else 0)))
        clouds.append(smooth(pts))
    sky += f'<path d="{"".join(clouds)}" fill="#fff8ea" opacity=".55"/>'

    # ---- far layer: two misty spruce ridges + rolling hills
    far = []
    hills = ridge(560, 26, 60, phase=.4)
    far.append(f'<path d="{band(hills)}" fill="#a7a9bd"/>')
    sp1 = "".join(spruce(x + j(10), 590 + 20 * math.sin(x / 200), R.uniform(110, 190), R.uniform(30, 44), 6)
                  for x in range(-BLEED, W + BLEED, 46))
    far.append(f'<path d="{sp1}" fill="#9aa0b6"/>')
    far.append(f'<path d="{band(ridge(610, 18, 60, phase=1.3))}" fill="#9aa0b6"/>')
    sp2 = "".join(spruce(x + j(14), 650 + 16 * math.sin(x / 170 + 1), R.uniform(130, 210), R.uniform(34, 50), 7)
                  for x in range(-BLEED + 20, W + BLEED, 58))
    far.append(f'<path d="{sp2}" fill="#8a8f9e"/>')
    far.append(f'<path d="{band(ridge(660, 12, 60, phase=2.1))}" fill="#8a8f9e"/>')
    # golden autumn deciduous blobs in the distance
    far.append(f'<rect x="{-BLEED}" y="480" width="{W + 2 * BLEED}" height="260" fill="url(#g-haze)"/>')

    # ---- mid layer: trunks, crowns, mid ground with moss mounds
    mid = []
    trees = []
    trees.append(spruce(150, 760, 640, 150, 10))
    trees.append(spruce(2290, 770, 680, 160, 10))
    trees.append(spruce(1240, 745, 560, 120, 9))
    trees.append(spruce(2960, 765, 620, 140, 10))   # v2 extension
    trees.append(spruce(3540, 772, 690, 160, 10))
    mid.append(f'<path d="{"".join(trees)}" fill="#3a5a44" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    for tx, tb, th in [(150, 760, 640), (2290, 770, 680), (1240, 745, 560), (2960, 765, 620), (3540, 772, 690)]:
        mid.append(f'<clipPath id="sp{tx}"><rect x="{tx}" y="{tb - th - 10}" width="200" height="{th + 20}"/></clipPath>')
        mid.append(f'<path d="{"".join(trees)}" fill="#24402f" clip-path="url(#sp{tx})" opacity=".75"/>')
    mid.append(f'<path d="{"".join(trees)}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    mid.append(beech(560, 760, -60, 66))
    mid.append(beech(1820, 770, -60, 74))
    mid.append(birch(930, 750, 60, 34))
    mid.append(birch(985, 760, 140, 26))
    mid.append(birch(1560, 755, 90, 30))
    mid.append(birch(2660, 752, 70, 30))            # v2 extension
    mid.append(birch(2716, 758, 150, 24))
    mid.append(beech(3260, 768, -60, 70))
    mid.append(crown(540, 40, 300, ["#9c4a22", "#c46a2a", "#de9a38", "#efc15a"], n=10))
    mid.append(crown(1840, 30, 320, ["#8e3f20", "#b85a26", "#d98a32", "#ecb84e"], n=10))
    mid.append(crown(960, 90, 170, ["#b8892a", "#d9b23a", "#f0d266"], n=8))
    mid.append(crown(1560, 120, 150, ["#b8892a", "#d9b23a", "#f0d266"], n=7))
    mid.append(crown(3270, 30, 310, ["#9c4a22", "#c46a2a", "#de9a38", "#efc15a"], n=10))
    mid.append(crown(2690, 90, 170, ["#b8892a", "#d9b23a", "#f0d266"], n=8))
    mg = ridge(735, 16, 50, phase=.9, rough=2)
    mid.append(f'<path d="{band(mg)}" fill="url(#g-midground)" stroke="#6b5a2c" stroke-width="3"/>')
    path_d = ("M1010 742C1040 752 1060 764 1040 780C1010 800 900 812 880 840L760 900L1040 900"
              "C1060 860 1150 830 1170 806C1196 776 1120 756 1070 742Z")
    mid.append(f'<path d="{path_d}" fill="#d8bd84" stroke="#a8884c" stroke-width="3" stroke-linejoin="round"/>'
               f'<path d="M1020 760q40 10 10 30M960 820q-20 14 -40 30" fill="none" stroke="#c4a468" stroke-width="4" stroke-linecap="round"/>')
    # moss mounds + mid litter
    for x in range(40, W, 260):
        mid.append(f'<ellipse cx="{f(x + j(40))}" cy="{f(752 + j(6))}" rx="{f(R.uniform(60, 110))}" ry="{f(R.uniform(10, 16))}" fill="#8a9a4c" opacity=".7"/>')
    mid.append(litter(-BLEED, W + BLEED, 748, 840, 70, (.4, .6)))
    mid.append(tufts(-60, W + 60, 760, 26, "#6d7a3a", 22))

    # ---- light rays (between mid and near)
    rays = []
    for x0, w0, sk in [(1500, 70, -520), (1640, 46, -600), (1760, 90, -700), (1960, 50, -760)]:
        rays.append(f"M{x0} -40L{x0 + w0} -40L{x0 + w0 + sk + 120} 900L{x0 + sk} 900Z")
    light = f'<path d="{"".join(rays)}" fill="url(#g-ray)" opacity=".45"/>'

    # ---- near layer: forest floor, ferns, log, stones, tufts
    near = []
    ng = ridge(850, 14, 50, phase=2.4, rough=3)
    near.append(f'<path d="{band(ng)}" fill="url(#g-near)" stroke="#4a3220" stroke-width="3"/>')
    for x in range(0, W, 180):
        near.append(f'<ellipse cx="{f(x + j(50))}" cy="{f(872 + j(10))}" rx="{f(R.uniform(70, 130))}" ry="{f(R.uniform(12, 20))}" fill="#7d8c45" opacity=".85"/>')
    near.append(litter(-BLEED, W + BLEED, 862, 1010, 210, (.7, 1.15)))
    # mossy fallen log (right part of the panorama)
    lx0, lx1, ly = 1980, 2480, 880
    near.append(f'<path d="M{lx0} {ly - 40}Q{(lx0 + lx1) / 2} {ly - 60} {lx1} {ly - 48}L{lx1} {ly + 20}Q{(lx0 + lx1) / 2} {ly + 34} {lx0} {ly + 24}Z" '
                f'fill="url(#g-log)" stroke="{INK}" stroke-width="3"/>')
    near.append(f'<ellipse cx="{lx0}" cy="{ly - 8}" rx="22" ry="32" fill="#c99a62" stroke="{INK}" stroke-width="3"/>'
                f'<ellipse cx="{lx0}" cy="{ly - 8}" rx="13" ry="20" fill="none" stroke="#9c6f3e" stroke-width="2"/>'
                f'<ellipse cx="{lx0}" cy="{ly - 8}" rx="5" ry="8" fill="none" stroke="#9c6f3e" stroke-width="2"/>')
    near.append(f'<path d="M{lx0 + 30} {ly - 46}Q{lx0 + 200} {ly - 74} {lx1} {ly - 60}L{lx1} {ly - 40}Q{lx0 + 200} {ly - 50} {lx0 + 30} {ly - 34}Z" fill="#8a9a4c"/>')
    # stones
    for sx, sy, sr in [(720, 905, 26), (760, 915, 16), (1480, 900, 22), (300, 930, 18), (2640, 912, 22), (3200, 928, 26), (3236, 938, 15)]:
        near.append(f'<ellipse cx="{sx}" cy="{sy}" rx="{sr * 1.4}" ry="{sr}" fill="#a39d92" stroke="{INK}" stroke-width="2.6"/>'
                    f'<ellipse cx="{sx - sr * .4}" cy="{sy - sr * .35}" rx="{sr * .5}" ry="{sr * .25}" fill="#fff" opacity=".3"/>')
    near.append(tufts(-80, W + 80, 870, 40, "#56692f", 34))
    # framing ferns at both ends of the panorama + one mid fern clump
    near.append(fern(40, 1010, 1.25, 1))
    near.append(fern(2380, 1010, 1.3, -1, "#c07a2e", "#94541f"))
    near.append(fern(1060, 1010, .7, 1, "#c07a2e", "#94541f"))
    near.append(fern(2920, 1010, .75, 1))
    near.append(fern(W - 20, 1010, 1.3, -1, "#c07a2e", "#94541f"))

    # ---- slots (invisible): where the 13 characters stand; mid = smaller & further
    slots = []
    # v2: one slot per species (data-id), data-level = minimum level at which it appears.
    # Level 1 uses only the 8 level-1 slots, all inside 0..W_L1, evenly spread; groups mixed, twins apart.
    mid_slots = [(200, 754, "kozak", 2), (480, 752, "sirovec", 1), (760, 752, "zlucnik", 2), (1040, 748, "troudnatec", 1),
                 (1320, 752, "muchomurka-tygrovana", 2), (1600, 756, "trepenitka", 1), (1880, 754, "troudnatec-pasovany", 2),
                 (2160, 758, "kotrc", 1), (2520, 756, "ryzec", 2), (2800, 752, "pestrec", 2), (3080, 756, "vaclavka", 2),
                 (3360, 760, "lisak", 2)]
    near_slots = [(140, 955, "kremenac", 2), (400, 962, "hrib-smrkovy", 1), (660, 958, "pychavka", 2),
                  (920, 955, "muchomurka-zelena", 1), (1180, 966, "suchohrib", 2), (1440, 960, "liska", 1),
                  (1700, 958, "bedla", 2), (1960, 966, "muchomurka-cervena", 1), (2220, 960, "muchomurka-jizliva", 2),
                  (2500, 962, "hrib-kovar", 2), (2780, 958, "klouzek", 2), (3060, 964, "hrib-satan", 2), (3340, 960, "listicka", 2)]
    for x, y, sid, lv in mid_slots:
        slots.append(f'<circle class="slot" data-layer="mid" data-scale=".6" data-id="{sid}" data-level="{lv}" cx="{x}" cy="{y}" r="6"/>')
    for x, y, sid, lv in near_slots:
        slots.append(f'<circle class="slot" data-layer="near" data-scale=".82" data-id="{sid}" data-level="{lv}" cx="{x}" cy="{y}" r="6"/>')

    # falling leaves (animate these; start positions above the canvas)
    falling = "".join(
        f'<use href="#{R.choice(["lf-beech", "lf-birch", "lf-maple", "lf-oak"])}" class="falling-leaf" x="-14" y="-10" width="28" height="20" '
        f'transform="translate({R.randint(80, W - 80)} {R.randint(-120, -30)})" color="{R.choice(LEAF_COLORS)}"/>' for _ in range(9))

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMinYMax slice" class="forest" data-pano="{W}" data-pano-l1="{W_L1}" role="img" aria-label="Podzimní les">
<title>Podzimní les</title>
<defs>{"".join(defs)}</defs>
<g id="sky">{sky}</g>
<g id="layer-far" data-depth=".3">{"".join(far)}</g>
<g id="light" data-depth=".45">{light}</g>
<g id="layer-mid" data-depth=".65">{"".join(mid)}<g class="slots-mid"></g></g>
<g id="layer-near" data-depth="1">{"".join(near)}<g class="slots-near"></g></g>
<g id="falling">{falling}</g>
<g id="slots" fill="none" stroke="none">{"".join(slots)}</g>
</svg>
'''
    return svg


# ---------------------------------------------------------------- basket

def weave_rows(x0, x1, y0, y1, rows, top_rx, bot_rx, cx):
    out = []
    for r in range(rows):
        yy = y0 + (y1 - y0) * (r + .5) / rows
        rx = top_rx + (bot_rx - top_rx) * (r + .5) / rows
        n = 11
        for k in range(n):
            t0 = -1 + 2 * k / n
            t1 = -1 + 2 * (k + 1) / n
            xa, xb = cx + rx * math.sin(t0 * math.pi / 2), cx + rx * math.sin(t1 * math.pi / 2)
            off = 4 if (k + r) % 2 else -4
            ya = yy + 14 * math.cos(t0 * math.pi / 2)
            yb = yy + 14 * math.cos(t1 * math.pi / 2)
            col = "#d79a55" if (k + r) % 2 else "#b97a3c"
            out.append(f'<path d="M{f(xa)} {f(ya - 8 + off * .2)}Q{f((xa + xb) / 2)} {f((ya + yb) / 2 - 8 + off)} {f(xb)} {f(yb - 8 + off * .2)}'
                       f'L{f(xb)} {f(yb + 8 + off * .2)}Q{f((xa + xb) / 2)} {f((ya + yb) / 2 + 8 + off)} {f(xa)} {f(ya + 8 + off * .2)}Z" fill="{col}"/>')
    return "".join(out)


def cloth(cx, oy, orx, ory):
    def rim_y(x):
        return oy + ory * math.sqrt(max(0, 1 - ((x - cx) / orx) ** 2))
    xa, xb = cx + 20, cx + 128
    top = [(x, rim_y(x) - 4) for x in range(xa, xb + 1, 12)]
    d = "M" + "L".join(f"{f(x)} {f(y)}" for x, y in top)
    d += (f"Q{f(xb + 4)} {f(rim_y(xb) + 40)} {f(xb - 18)} {f(oy + 96)}Q{f(xb - 34)} {f(oy + 104)} {f(xb - 44)} {f(oy + 94)}"
          f"Q{f(cx + 72)} {f(oy + 118)} {f(cx + 56)} {f(oy + 98)}Q{f(cx + 34)} {f(oy + 76)} {f(xa)} {f(rim_y(xa) - 4)}Z")
    fold = f"M{f(cx + 64)} {f(rim_y(cx + 64))}Q{f(cx + 70)} {f(oy + 70)} {f(cx + 62)} {f(oy + 100)}"
    return (f'<path d="{d}" fill="url(#bk-check)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
            f'<path d="{fold}" fill="none" stroke="#3b2417" stroke-width="2" opacity=".35"/>'
            f'<path d="{d}" fill="url(#bk-shade)" opacity=".5"/>')


def build_basket():
    cx, oy, orx, ory = 200, 150, 150, 40
    defs = ('<defs><linearGradient id="bk-inner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a1e"/>'
            '<stop offset="1" stop-color="#8a5a2e"/></linearGradient>'
            '<linearGradient id="bk-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3b2417" stop-opacity=".35"/>'
            '<stop offset=".3" stop-color="#3b2417" stop-opacity="0"/><stop offset=".75" stop-color="#3b2417" stop-opacity="0"/>'
            '<stop offset="1" stop-color="#3b2417" stop-opacity=".4"/></linearGradient>'
            '<pattern id="bk-check" patternUnits="userSpaceOnUse" width="16" height="16"><rect width="16" height="16" fill="#fbf6ea"/>'
            '<rect width="8" height="16" fill="#2f9b57" opacity=".55"/><rect width="16" height="8" fill="#2f9b57" opacity=".55"/></pattern>'
            '</defs>')
    # back: handle + interior + back rim
    handle = (f'<path d="M{cx - orx + 18} {oy}C{cx - orx + 10} {oy - 190} {cx + orx - 10} {oy - 190} {cx + orx - 18} {oy}" fill="none" stroke="{INK}" stroke-width="22" stroke-linecap="round"/>'
              f'<path d="M{cx - orx + 18} {oy}C{cx - orx + 10} {oy - 190} {cx + orx - 10} {oy - 190} {cx + orx - 18} {oy}" fill="none" stroke="#c98d4a" stroke-width="16" stroke-linecap="round"/>'
              f'<path d="M{cx - orx + 18} {oy}C{cx - orx + 10} {oy - 190} {cx + orx - 10} {oy - 190} {cx + orx - 18} {oy}" fill="none" stroke="#7a4a22" stroke-width="16" stroke-dasharray="6 10" stroke-linecap="butt" opacity=".6"/>')
    back = (handle +
            f'<ellipse cx="{cx}" cy="{oy}" rx="{orx}" ry="{ory}" fill="url(#bk-inner)" stroke="{INK}" stroke-width="4"/>'
            f'<path d="M{cx - orx} {oy}A{orx} {ory} 0 0 1 {cx + orx} {oy}" fill="none" stroke="#e3b072" stroke-width="12"/>'
            f'<path d="M{cx - orx} {oy}A{orx} {ory} 0 0 1 {cx + orx} {oy}" fill="none" stroke="{INK}" stroke-width="3" transform="translate(0 -6)"/>')
    # front: woven body + front rim + gingham cloth
    body_d = (f"M{cx - orx} {oy}C{cx - orx + 6} {oy + 70} {cx - orx + 30} {oy + 120} {cx - 105} {oy + 138}"
              f"Q{cx} {oy + 160} {cx + 105} {oy + 138}C{cx + orx - 30} {oy + 120} {cx + orx - 6} {oy + 70} {cx + orx} {oy}"
              f"A{orx} {ory} 0 0 1 {cx - orx} {oy}Z")
    front = (f'<clipPath id="bk-clip"><path d="{body_d}"/></clipPath>'
             f'<path d="{body_d}" fill="#b97a3c"/>'
             f'<g clip-path="url(#bk-clip)">{weave_rows(cx - orx, cx + orx, oy + 6, oy + 150, 7, orx, 112, cx)}'
             f'<rect x="{cx - orx}" y="{oy - 50}" width="{2 * orx}" height="220" fill="url(#bk-shade)"/></g>'
             f'<path d="{body_d}" fill="none" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
             f'<path d="M{cx - orx} {oy}A{orx} {ory} 0 0 0 {cx + orx} {oy}" fill="none" stroke="#e3b072" stroke-width="14"/>'
             f'<path d="M{cx - orx} {oy}A{orx} {ory} 0 0 0 {cx + orx} {oy}" fill="none" stroke="#7a4a22" stroke-width="14" stroke-dasharray="5 9" opacity=".55"/>'
             f'<path d="M{cx - orx - 7} {oy}A{orx + 7} {ory + 7} 0 0 0 {cx + orx + 7} {oy}" fill="none" stroke="{INK}" stroke-width="3.5"/>'
             # gingham cloth draped over the front rim (green = the 'jedlá' colour: basket means edible)
             + cloth(cx, oy, orx, ory))
    vb = 'viewBox="0 0 400 320"'
    combined = (f'<svg xmlns="http://www.w3.org/2000/svg" {vb} class="basket" role="img" aria-label="Košík">'
                f'<title>Košík</title>{defs}<g id="basket-back">{back}</g><g id="basket-items"></g><g id="basket-front">{front}</g></svg>\n')
    back_only = (f'<svg xmlns="http://www.w3.org/2000/svg" {vb} class="basket-back" aria-hidden="true">{defs}<g id="basket-back">{back}</g></svg>\n')
    front_only = (f'<svg xmlns="http://www.w3.org/2000/svg" {vb} class="basket-front" aria-hidden="true">{defs}<g id="basket-front">{front}</g></svg>\n')
    return combined, back_only, front_only


# ---------------------------------------------------------------- 'nechat v lese' zone

def build_zone():
    global R
    R = random.Random(7070)   # own seed (v2): scene edits must not ripple into the zone
    cx, cy = 200, 230
    out = []
    pts = []
    for i in range(20):
        a = 2 * math.pi * i / 20
        r = 1 + .08 * math.sin(3 * a) + j(.03)
        pts.append((cx + 180 * r * math.cos(a), cy + 44 * r * math.sin(a)))
    out.append(f'<path d="{smooth(pts)}" fill="#6f8040" stroke="{INK}" stroke-width="3"/>')
    out.append(f'<ellipse cx="{cx}" cy="{cy - 4}" rx="150" ry="30" fill="#8a9a4c"/>')
    # ring of stones
    for i in range(12):
        a = math.pi * (.06 + .88 * i / 11)
        x, y = cx + 160 * math.cos(a), cy + 30 * math.sin(a)
        out.append(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(R.uniform(13, 18))}" ry="{f(R.uniform(8, 11))}" fill="#a39d92" stroke="{INK}" stroke-width="2.4"/>')
    # sign post with a stop hand
    out.append(f'<path d="M300 236V70" stroke="{INK}" stroke-width="16" stroke-linecap="round"/><path d="M300 236V70" stroke="#9c6b3e" stroke-width="10" stroke-linecap="round"/>'
               f'<circle cx="300" cy="64" r="46" fill="#fbf4e4" stroke="{INK}" stroke-width="4"/>'
               f'<circle cx="300" cy="64" r="38" fill="none" stroke="#c92f2a" stroke-width="7"/>'
               f'<g transform="translate(300 66) scale(1.25)" fill="#fbf4e4" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round">'
               f'<path d="M-12 -2V-16a3 3 0 0 1 6 0V-6V-22a3 3 0 0 1 6 0V-6V-20a3 3 0 0 1 6 0V-5V-14a3 3 0 0 1 6 0V4Q12 18 0 19Q-10 19 -14 10L-20 0a3 3 0 0 1 5 -3Z"/></g>')
    out.append(tufts(40, 360, 246, 9, "#56692f", 26))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 290" class="zone-les" role="img" aria-label="Nechat v lese">'
            f'<title>Nechat v lese</title><g id="zone-ground">{"".join(out)}</g></svg>\n')


# ---------------------------------------------------------------- icon sprite

ICONS = {
    # stroke icons inherit currentColor; 48x48 grid, 3.5 stroke, round joins
    "speaker": '<path d="M8 19h7l10-8v26l-10-8H8z" fill="currentColor" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="M31 17q5 7 0 14M36 12q10 12 0 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>',
    "home": '<path d="M7 23L24 8l17 15M12 20v19h9V29h6v10h9V20" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
    "flip": '<path d="M12 18a13 13 0 0 1 23-4l3 4M36 30a13 13 0 0 1-23 4l-3-4" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M39 9v9h-9M9 39v-9h9" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
    "star": '<path d="M24 6l5.4 11.3 12.4 1.6-9.1 8.6 2.3 12.3L24 33.8l-11 6 2.3-12.3-9.1-8.6 12.4-1.6z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    "check": '<path d="M10 25l9 9 19-20" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
    "retry": '<path d="M36 16A14 14 0 1 0 38 28" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M38 7v10h-10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
    "album": '<rect x="9" y="7" width="30" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M15 7v34" stroke="currentColor" stroke-width="3.5"/><path d="M27 17l2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7z" fill="currentColor"/>',
    "play": '<path d="M16 10l22 14-22 14z" fill="currentColor" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>',
    "arrow-left": '<path d="M28 10L14 24l14 14M15 24h22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    "close": '<path d="M13 13l22 22M35 13L13 35" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>',
    "basket": '<path d="M14 20q10-14 20 0" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M6 20h36l-5 18H11z" fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M12 27h24M13 32h22" stroke="#fff" stroke-width="2" opacity=".6"/>',
    "hand-stop": '<path d="M15 25V12a3 3 0 0 1 6 0v10V8a3 3 0 0 1 6 0v14V10a3 3 0 0 1 6 0v13V15a3 3 0 0 1 6 0v14q0 13-13 13-8 0-12-7l-6-9a3 3 0 0 1 5-4z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    "quiz": '<circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M18.5 19a5.5 5.5 0 1 1 8 5c-2 1.2-2.5 2.2-2.5 4.5" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="34.5" r="2.4" fill="currentColor"/>',
    "parents": '<circle cx="17" cy="14" r="5" fill="currentColor"/><circle cx="32" cy="19" r="4" fill="currentColor"/><path d="M8 40V30a9 9 0 0 1 18 0v10M26 40v-7a6 6 0 0 1 12 0v7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>',
    # v2: level rosettes (bronze/silver/gold by CSS var), lock states, Výprava door, step, magnifier
    "level-1": '<path d="M43.6 24.0L42.8 26.5L40.8 28.5L41.5 31.3L41.0 33.8L39.0 35.5L36.3 36.3L35.5 39.0L33.8 41.0L31.3 41.5L28.5 40.8L26.5 42.8L24.0 43.6L21.5 42.8L19.5 40.8L16.7 41.5L14.2 41.0L12.5 39.0L11.7 36.3L9.0 35.5L7.0 33.8L6.5 31.3L7.2 28.5L5.2 26.5L4.4 24.0L5.2 21.5L7.2 19.5L6.5 16.7L7.0 14.2L9.0 12.5L11.7 11.7L12.5 9.0L14.2 7.0L16.7 6.5L19.5 7.2L21.5 5.2L24.0 4.4L26.5 5.2L28.5 7.2L31.3 6.5L33.8 7.0L35.5 9.0L36.3 11.7L39.0 12.5L41.0 14.2L41.5 16.7L40.8 19.5L42.8 21.5Z" style="fill:var(--level-1,#c98d4a)" stroke="#3b2417" stroke-width="2.6" stroke-linejoin="round"/><circle cx="24" cy="24" r="12.6" fill="#fbf4e4" stroke="#3b2417" stroke-width="1.6"/><g transform="translate(24 24) scale(1.05)"><path d="M-7 0A7 6 0 0 1 7 0Z" fill="#3b2417"/><path d="M-2.4 0h4.8l.8 7h-6.4z" fill="#3b2417"/></g>',
    "level-2": '<path d="M43.6 24.0L42.8 26.5L40.8 28.5L41.5 31.3L41.0 33.8L39.0 35.5L36.3 36.3L35.5 39.0L33.8 41.0L31.3 41.5L28.5 40.8L26.5 42.8L24.0 43.6L21.5 42.8L19.5 40.8L16.7 41.5L14.2 41.0L12.5 39.0L11.7 36.3L9.0 35.5L7.0 33.8L6.5 31.3L7.2 28.5L5.2 26.5L4.4 24.0L5.2 21.5L7.2 19.5L6.5 16.7L7.0 14.2L9.0 12.5L11.7 11.7L12.5 9.0L14.2 7.0L16.7 6.5L19.5 7.2L21.5 5.2L24.0 4.4L26.5 5.2L28.5 7.2L31.3 6.5L33.8 7.0L35.5 9.0L36.3 11.7L39.0 12.5L41.0 14.2L41.5 16.7L40.8 19.5L42.8 21.5Z" style="fill:var(--level-2,#b9bec8)" stroke="#3b2417" stroke-width="2.6" stroke-linejoin="round"/><circle cx="24" cy="24" r="12.6" fill="#fbf4e4" stroke="#3b2417" stroke-width="1.6"/><g transform="translate(19.2 25) scale(0.82)"><path d="M-7 0A7 6 0 0 1 7 0Z" fill="#3b2417"/><path d="M-2.4 0h4.8l.8 7h-6.4z" fill="#3b2417"/></g><g transform="translate(28.8 25) scale(0.82)"><path d="M-7 0A7 6 0 0 1 7 0Z" fill="#3b2417"/><path d="M-2.4 0h4.8l.8 7h-6.4z" fill="#3b2417"/></g>',
    "level-3": '<path d="M43.6 24.0L42.8 26.5L40.8 28.5L41.5 31.3L41.0 33.8L39.0 35.5L36.3 36.3L35.5 39.0L33.8 41.0L31.3 41.5L28.5 40.8L26.5 42.8L24.0 43.6L21.5 42.8L19.5 40.8L16.7 41.5L14.2 41.0L12.5 39.0L11.7 36.3L9.0 35.5L7.0 33.8L6.5 31.3L7.2 28.5L5.2 26.5L4.4 24.0L5.2 21.5L7.2 19.5L6.5 16.7L7.0 14.2L9.0 12.5L11.7 11.7L12.5 9.0L14.2 7.0L16.7 6.5L19.5 7.2L21.5 5.2L24.0 4.4L26.5 5.2L28.5 7.2L31.3 6.5L33.8 7.0L35.5 9.0L36.3 11.7L39.0 12.5L41.0 14.2L41.5 16.7L40.8 19.5L42.8 21.5Z" style="fill:var(--level-3,#f2b01e)" stroke="#3b2417" stroke-width="2.6" stroke-linejoin="round"/><circle cx="24" cy="24" r="12.6" fill="#fbf4e4" stroke="#3b2417" stroke-width="1.6"/><g transform="translate(17.5 27) scale(0.68)"><path d="M-7 0A7 6 0 0 1 7 0Z" fill="#3b2417"/><path d="M-2.4 0h4.8l.8 7h-6.4z" fill="#3b2417"/></g><g transform="translate(24 23.5) scale(0.68)"><path d="M-7 0A7 6 0 0 1 7 0Z" fill="#3b2417"/><path d="M-2.4 0h4.8l.8 7h-6.4z" fill="#3b2417"/></g><g transform="translate(30.5 27) scale(0.68)"><path d="M-7 0A7 6 0 0 1 7 0Z" fill="#3b2417"/><path d="M-2.4 0h4.8l.8 7h-6.4z" fill="#3b2417"/></g><path d="M24 1.8l1.6 3.2 3.5.5-2.5 2.4.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.4 3.5-.5z" fill="#fff6c8" stroke="#3b2417" stroke-width="1.3" stroke-linejoin="round"/>',
    "lock": '<path d="M15 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><rect x="10" y="21" width="28" height="21" rx="5" fill="currentColor"/><circle cx="24" cy="30" r="3" fill="#fbf4e4"/><path d="M24 31v5" stroke="#fbf4e4" stroke-width="3" stroke-linecap="round"/>',
    "lock-open": '<path d="M15 22v-6a9 9 0 0 1 17.4-3.2" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><rect x="10" y="21" width="28" height="21" rx="5" fill="currentColor"/><circle cx="24" cy="30" r="3" fill="#fbf4e4"/><path d="M24 31v5" stroke="#fbf4e4" stroke-width="3" stroke-linecap="round"/>',
    "vyprava": '<path d="M24 6l-9 14h5l-7 10h22l-7-10h5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M24 30v4" stroke="currentColor" stroke-width="3"/><path d="M8 44q8-6 16-6t16 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><ellipse cx="17" cy="41" rx="1.8" ry="2.6" fill="currentColor" transform="rotate(-20 17 41)"/><ellipse cx="29" cy="41.5" rx="1.8" ry="2.6" fill="currentColor" transform="rotate(20 29 41.5)"/>',
    "footsteps": '<g fill="currentColor"><ellipse cx="17" cy="31" rx="5.2" ry="8" transform="rotate(-12 17 31)"/><circle cx="12.5" cy="20" r="1.8"/><circle cx="16" cy="18.6" r="1.8"/><circle cx="19.6" cy="19" r="1.7"/><ellipse cx="31" cy="20" rx="5.2" ry="8" transform="rotate(12 31 20)"/><circle cx="26.4" cy="9" r="1.8"/><circle cx="30" cy="7.6" r="1.8"/><circle cx="33.6" cy="8" r="1.7"/></g>',
    "magnifier": '<circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" stroke-width="4"/><path d="M28.5 28.5l10 10" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M14 17a7 7 0 0 1 6-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".5"/>',
    # language: simplified round flags (fixed colours)
    # language: simplified round flags (fixed colours, geometry pre-clipped to the circle — no clipPath in symbols)
    "lang-cs": '<path d="M6 24A18 18 0 0 1 42 24Z" fill="#fff"/><path d="M6 24A18 18 0 0 0 42 24Z" fill="#d7141a"/>'
               '<path d="M25 24L11.27 11.27A18 18 0 0 0 11.27 36.73Z" fill="#11457e"/>'
               '<circle cx="24" cy="24" r="18" fill="none" stroke="#3b2417" stroke-width="3"/>',
    "lang-en": '<circle cx="24" cy="24" r="18" fill="#012169"/>'
               '<path d="M11.27 11.27L36.73 36.73M36.73 11.27L11.27 36.73" stroke="#fff" stroke-width="7"/>'
               '<path d="M11.27 11.27L36.73 36.73M36.73 11.27L11.27 36.73" stroke="#c8102e" stroke-width="2.6"/>'
               '<path d="M18.5 6.9H29.5V18.5H41.1V29.5H29.5V41.1H18.5V29.5H6.9V18.5H18.5Z" fill="#fff"/>'
               '<path d="M21 6.3H27V21H41.7V27H27V41.7H21V27H6.3V21H21Z" fill="#c8102e"/>'
               '<circle cx="24" cy="24" r="18" fill="none" stroke="#3b2417" stroke-width="3"/>',
    # edibility badges: SHAPE + GLYPH + colour (colour-blind safe). Colours via CSS custom properties with fallbacks.
    "badge-jedla": '<circle cx="24" cy="24" r="20" style="fill:var(--edible,#2f9b57)" stroke="#3b2417" stroke-width="3"/><path d="M14 25l7 7 13-15" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>',
    "badge-nejedla": '<rect x="5" y="5" width="38" height="38" rx="9" style="fill:var(--inedible,#5f7598)" stroke="#3b2417" stroke-width="3"/><path d="M16 16l16 16M32 16L16 32" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>',
    "badge-jedovata": '<path d="M24 4.5L44.5 41H3.5Z" style="fill:var(--poison,#c92f2a)" stroke="#3b2417" stroke-width="3" stroke-linejoin="round"/><path d="M24 16.5v12" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/><circle cx="24" cy="35" r="3.3" fill="#fff"/>',
    "skull": '<path d="M16.5 3.5h15l11 11v15l-11 11h-15l-11-11v-15z" transform="translate(0 2)" style="fill:var(--deadly,#2a0f14)" stroke="#c92f2a" stroke-width="3.5" stroke-linejoin="round"/>'
             '<path d="M24 11c-7 0-11.5 4.6-11.5 10.6 0 3.6 1.7 6.2 4.2 7.6V33h14.6v-3.8c2.5-1.4 4.2-4 4.2-7.6C35.5 15.6 31 11 24 11z" fill="#fff"/>'
             '<circle cx="19.4" cy="22.5" r="3.1" style="fill:var(--deadly,#2a0f14)"/><circle cx="28.6" cy="22.5" r="3.1" style="fill:var(--deadly,#2a0f14)"/>'
             '<path d="M24 26.5l-1.8 3h3.6z" style="fill:var(--deadly,#2a0f14)"/><path d="M20.6 33v3.4M24 33v3.4M27.4 33v3.4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'
             '<path d="M11 38.5l26 5.5M37 38.5l-26 5.5" stroke="#fff" stroke-width="3" stroke-linecap="round" transform="translate(0 -1.5)"/>',
}


def build_icons():
    syms = "".join(f'<symbol id="i-{k}" viewBox="0 0 48 48">{v}</symbol>' for k, v in ICONS.items())
    return (f'<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">{syms}</svg>\n')


def icons_preview():
    cells = "".join(
        f'<g transform="translate({(i % 7) * 76 + 14} {(i // 7) * 90 + 14})"><use href="#i-{k}" width="48" height="48" color="#3b2417"/>'
        f'<text x="24" y="66" font-size="10" text-anchor="middle" font-family="sans-serif" fill="#3b2417">{k}</text></g>'
        for i, k in enumerate(ICONS))
    return cells


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    files = {"scene-forest.svg": build_scene()}
    c, b, fr = build_basket()
    files.update({"basket.svg": c, "basket-back.svg": b, "basket-front.svg": fr, "zone-les.svg": build_zone(),
                  "ui-icons.svg": build_icons()})
    for name, svg in files.items():
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
            fh.write(svg)
        print(f"{name:20s} {len(svg.encode()) / 1024:6.1f} KB")
