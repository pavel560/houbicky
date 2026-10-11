#!/usr/bin/env python3
"""Houbičky — generator of the 13 mushroom character SVGs (designer source).

One shared style system: warm umber ink outline, gouache-like volume
(radial cap light from upper-left, cylindrical stem gradient), storybook faces
whose MOOD encodes the safety group, botanically-led identifying features.

Run:  python3 design/build_art.py   ->  writes art/<id>.svg
Deterministic (seeded jitter), no dependencies beyond the stdlib.

SVG contract (for the programmer) — see design/DESIGN.md §6:
  svg.shroom[data-id][data-group][data-deadly][data-pivot]
    g.shadow                      soft contact shadow (keep in the forest scene)
    g.ground                      moss/leaf patch (hide when placed on scene ground)
    g.body                        everything that bounces (origin: bottom centre)
      g.under                     pores / gills / ridges  (tilt together with .cap)
      g.stem                      stem + ring + base, contains g.face
        g.face
          g.eyes                  blink = scaleY(0.1) on this group
          g.lids, g.brows         mood (hidden in "neutral faces" mode)
          g.cheeks                edible only
          g.mouth                 mood mouth
          g.mouth-neutral         visibility=hidden by default
      g.cap                       cap (+ warts / scales)
    g.warn                      poisonous only: two red "!" marks (hide in games)
    g.anchors > circle.anchor[data-feature]   invisible callout targets
"""
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "art")

INK = "#3b2417"
INK_SOFT = "rgba(59,36,23,.55)"
POISON = "#d8352a"


def f(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def smooth(pts, closed=True, t=1 / 6):
    """Catmull-Rom through pts -> cubic bezier path string."""
    n = len(pts)
    if n < 2:
        return ""
    out = [f"M{f(pts[0][0])} {f(pts[0][1])}"]
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if (closed or i > 0) else pts[i]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if (closed or i + 2 < n) else pts[(i + 1) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t)
        c2 = (p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t)
        out.append(f"C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}")
    if closed:
        out.append("Z")
    return "".join(out)


class Art:
    def __init__(self, sid, title, group, deadly=False, seed=1):
        self.id = sid
        self.title = title
        self.group = group
        self.deadly = deadly
        self.defs = []
        self.rng = random.Random(seed)
        self.pivot = (120, 120)
        self.anchors = []

    def j(self, a=1.0):
        return self.rng.uniform(-a, a)

    def jit(self, pts, a=0.8):
        return [(x + self.j(a), y + self.j(a)) for x, y in pts]

    # ---------- defs helpers ----------
    def radial(self, name, stops, cx="38%", cy="28%", r="78%"):
        st = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
        self.defs.append(f'<radialGradient id="{self.id}-{name}" cx="{cx}" cy="{cy}" r="{r}">{st}</radialGradient>')
        return f"url(#{self.id}-{name})"

    def linear(self, name, stops, x1, y1, x2, y2, user=True):
        st = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
        units = ' gradientUnits="userSpaceOnUse"' if user else ""
        self.defs.append(
            f'<linearGradient id="{self.id}-{name}"{units} x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}">{st}</linearGradient>')
        return f"url(#{self.id}-{name})"

    def clip(self, name, d):
        self.defs.append(f'<clipPath id="{self.id}-{name}"><path d="{d}"/></clipPath>')
        return f"url(#{self.id}-{name})"

    def pattern(self, name, w, h, body):
        self.defs.append(
            f'<pattern id="{self.id}-{name}" patternUnits="userSpaceOnUse" width="{w}" height="{h}">{body}</pattern>')
        return f"url(#{self.id}-{name})"

    def mask_fade(self, name, x, y1, y2, w, top_op=1, bot_op=0):
        g = self.linear(name + "g", [(0, f"rgba(255,255,255,{top_op})"), (1, f"rgba(255,255,255,{bot_op})")],
                        0, y1, 0, y2)
        self.defs.append(
            f'<mask id="{self.id}-{name}" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="280">'
            f'<rect x="{f(x)}" y="0" width="{f(w)}" height="{f(y2)}" fill="{g}"/></mask>')
        return f"url(#{self.id}-{name})"

    def anchor(self, feature, x, y):
        self.anchors.append(f'<circle class="anchor" data-feature="{feature}" cx="{f(x)}" cy="{f(y)}" r="3"/>')

    # ---------- render ----------
    def svg(self, shadow, ground, under, stem, cap, warn=""):
        px, py = self.pivot
        dead = ' data-deadly="true"' if self.deadly else ""
        parts = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" class="shroom" '
            f'data-id="{self.id}" data-group="{self.group}"{dead} data-pivot="{f(px)} {f(py)}" '
            f'role="img" aria-label="{self.title}">',
            f"<title>{self.title}</title>",
            "<defs>" + "".join(self.defs) + "</defs>",
            f'<g class="shadow">{shadow}</g>',
            f'<g class="ground">{ground}</g>',
            '<g class="body">',
            f'<g class="under">{under}</g>',
            f'<g class="stem">{stem}</g>',
            f'<g class="cap">{cap}</g>',
            "</g>",
        ]
        if warn:
            parts.append(f'<g class="warn">{warn}</g>')
        parts.append(f'<g class="anchors" fill="none" stroke="none">{"".join(self.anchors)}</g>')
        parts.append("</svg>")
        return "\n".join(parts) + "\n"


# ---------------------------------------------------------------- shared parts

def ground_patch(a, cx=120, y=262, rx=96, leaves=True):
    pts = []
    for i in range(18):
        th = math.pi * 2 * i / 18
        r = 1 + 0.07 * math.sin(3 * th + 1) + a.j(0.03)
        pts.append((cx + rx * r * math.cos(th), y + 12 * r * math.sin(th)))
    moss = f'<path d="{smooth(pts)}" fill="#7d8c45" stroke="{INK}" stroke-width="2.4"/>'
    top = []
    for i in range(14):
        th = math.pi + math.pi * i / 13
        top.append((cx + (rx - 10) * math.cos(th), y - 2 + 7 * math.sin(th)))
    moss += f'<path d="{smooth(top, closed=False)}" fill="none" stroke="#a3b25e" stroke-width="5" stroke-linecap="round" opacity=".8"/>'
    # moss tufts (little bumps)
    tufts = []
    for i in range(16):
        x = cx - rx + 12 + i * (2 * rx - 24) / 15 + a.j(3)
        yy = y + a.j(5)
        tufts.append(f"M{f(x)} {f(yy)}a2.6 2.2 0 1 1 .1 0")
    moss += f'<path d="{"".join(tufts)}" fill="none" stroke="#5d6d33" stroke-width="1.6" stroke-linecap="round"/>'
    out = moss
    if leaves:
        out += leaf(cx - rx + 16, y + 2, -18, "#c7642a", 1.0)
        out += leaf(cx + rx - 22, y - 1, 24, "#d99a2b", 0.85)
        out += leaf(cx + rx - 50, y + 8, 160, "#a8402a", 0.7)
    # grass blades
    blades = []
    for bx in (cx - rx + 30, cx + rx - 38, cx - 40):
        for k in range(3):
            x0 = bx + k * 4
            blades.append(f"M{f(x0)} {f(y + 2)}q{f(-2 + k * 2)} -10 {f(-4 + k * 4)} -{f(14 + k * 3)}")
    out += f'<path d="{"".join(blades)}" fill="none" stroke="#56692f" stroke-width="2.2" stroke-linecap="round"/>'
    return out


def leaf(x, y, rot, color, s=1.0):
    d = "M0 0C6 -9 18 -10 26 -4C20 4 8 6 0 0Z"
    return (f'<g transform="translate({f(x)} {f(y)}) rotate({rot}) scale({s})">'
            f'<path d="{d}" fill="{color}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>'
            f'<path d="M1 0Q12 -3 24 -4" fill="none" stroke="{INK}" stroke-width="1" opacity=".6"/></g>')


def shadow_el(cx=120, y=260, rx=58, ry=8):
    return f'<ellipse cx="{f(cx)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(ry)}" fill="#2a1a10" opacity=".32"/>'


def lid(x, cy, erx, ery, yl, yr, skin, s, stroke=True):
    """Eyelid covering the top of an eye down to the line (x-erx,yl)-(x+erx,yr)."""
    R, Ry = erx + 1.1 * s, ery + 1.1 * s
    def px(y, side):
        t = max(-1, min(1, (y - cy) / Ry))
        return x + side * R * math.sqrt(1 - t * t)
    xl, xr = px(yl, -1), px(yr, 1)
    large = 1 if (yl + yr) / 2 > cy else 0
    d = f"M{f(xl)} {f(yl)}A{f(R)} {f(Ry)} 0 {large} 1 {f(xr)} {f(yr)}Z"
    out = f'<path d="{d}" fill="{skin}"/>'
    if stroke:
        out += (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{f(1.5 * s)}" stroke-linejoin="round"/>'
                f'<path d="M{f(xl)} {f(yl)}L{f(xr)} {f(yr)}" stroke="{INK}" stroke-width="{f(2.2 * s)}" stroke-linecap="round"/>')
    return out


def face(a, cx, cy, mood, s=1.0, skin="#fff"):
    """mood: happy | bleh | sleepy | sly"""
    ex = 12.5 * s
    erx, ery = 4.4 * s, 5.8 * s
    eyes = ""
    for sx in (-1, 1):
        x = cx + sx * ex
        eyes += f'<ellipse cx="{f(x)}" cy="{f(cy)}" rx="{f(erx)}" ry="{f(ery)}" fill="{INK}"/>'
        eyes += f'<circle cx="{f(x + 1.5 * s)}" cy="{f(cy - 2.2 * s)}" r="{f(1.6 * s)}" fill="#fff"/>'
    lids = brows = cheeks = mouth = ""
    lw = f(1.8 * s)
    if mood == "happy":
        for sx in (-1, 1):
            cheeks += (f'<ellipse cx="{f(cx + sx * 22 * s)}" cy="{f(cy + 6.5 * s)}" rx="{f(5.2 * s)}" '
                       f'ry="{f(3.2 * s)}" fill="#ef7f6c" opacity=".55"/>')
        mouth = (f'<path d="M{f(cx - 7 * s)} {f(cy + 7 * s)}Q{f(cx)} {f(cy + 9 * s)} {f(cx + 7 * s)} {f(cy + 7 * s)}'
                 f'Q{f(cx + 6 * s)} {f(cy + 16 * s)} {f(cx)} {f(cy + 16 * s)}Q{f(cx - 6 * s)} {f(cy + 16 * s)} '
                 f'{f(cx - 7 * s)} {f(cy + 7 * s)}Z" fill="#6e2b1d" stroke="{INK}" stroke-width="{lw}" stroke-linejoin="round"/>'
                 f'<path d="M{f(cx - 4 * s)} {f(cy + 14 * s)}Q{f(cx)} {f(cy + 10.5 * s)} {f(cx + 4 * s)} {f(cy + 14 * s)}'
                 f'Q{f(cx)} {f(cy + 16 * s)} {f(cx - 4 * s)} {f(cy + 14 * s)}Z" fill="#ef7f6c"/>')
        for sx in (-1, 1):
            x = cx + sx * ex
            brows += (f'<path d="M{f(x - 4 * s)} {f(cy - 10 * s)}Q{f(x)} {f(cy - 13 * s)} {f(x + 4 * s)} {f(cy - 10 * s)}" '
                      f'fill="none" stroke="{INK}" stroke-width="{lw}" stroke-linecap="round"/>')
    elif mood == "bleh":   # bitter: one eye squeezed, tongue out
        x = cx - ex
        lids += (f'<ellipse cx="{f(x)}" cy="{f(cy)}" rx="{f(erx + 1.2 * s)}" ry="{f(ery + 1.2 * s)}" fill="{skin}"/>'
                 f'<path d="M{f(x - 5 * s)} {f(cy + 2 * s)}Q{f(x)} {f(cy - 1 * s)} {f(x + 5 * s)} {f(cy + 2 * s)}" '
                 f'fill="none" stroke="{INK}" stroke-width="{lw}" stroke-linecap="round"/>')
        brows += (f'<path d="M{f(x - 5 * s)} {f(cy - 8 * s)}L{f(x + 4 * s)} {f(cy - 6 * s)}" fill="none" stroke="{INK}" '
                  f'stroke-width="{lw}" stroke-linecap="round"/>'
                  f'<path d="M{f(cx + ex - 4 * s)} {f(cy - 12 * s)}Q{f(cx + ex)} {f(cy - 14.5 * s)} {f(cx + ex + 4 * s)} {f(cy - 12 * s)}" '
                  f'fill="none" stroke="{INK}" stroke-width="{lw}" stroke-linecap="round"/>')
        mouth = (f'<path d="M{f(cx - 8 * s)} {f(cy + 9 * s)}q{f(2.7 * s)} {f(-2.5 * s)} {f(5.3 * s)} 0t{f(5.3 * s)} 0t{f(5.3 * s)} 0" '
                 f'fill="none" stroke="{INK}" stroke-width="{lw}" stroke-linecap="round"/>'
                 f'<path d="M{f(cx + .5 * s)} {f(cy + 9.4 * s)}q0 {f(7 * s)} {f(4 * s)} {f(7 * s)}q{f(4 * s)} 0 {f(3.6 * s)} {f(-6.6 * s)}Z" '
                 f'fill="#b5c46a" stroke="{INK}" stroke-width="{f(1.4 * s)}" stroke-linejoin="round"/>')
    elif mood == "sleepy":
        for sx in (-1, 1):
            x = cx + sx * ex
            lids += lid(x, cy, erx, ery, cy + .6 * s, cy + .6 * s, skin, s)
        mouth = (f'<path d="M{f(cx - 4 * s)} {f(cy + 10 * s)}Q{f(cx)} {f(cy + 8.6 * s)} {f(cx + 4 * s)} {f(cy + 10 * s)}" '
                 f'fill="none" stroke="{INK}" stroke-width="{lw}" stroke-linecap="round"/>')
    elif mood == "sly":   # smug side-look: flat half-lids, one brow up, smirk
        for sx in (-1, 1):
            x = cx + sx * ex
            lids += lid(x, cy, erx, ery, cy - 1.2 * s - sx * .8 * s, cy - 1.2 * s + sx * .8 * s, skin, s)
        bl = cx - ex
        brows += (f'<path d="M{f(bl - 5 * s)} {f(cy - 9 * s)}L{f(bl + 5 * s)} {f(cy - 8.2 * s)}" fill="none" stroke="{INK}" '
                  f'stroke-width="{f(2.2 * s)}" stroke-linecap="round"/>'
                  f'<path d="M{f(cx + ex - 5 * s)} {f(cy - 11 * s)}Q{f(cx + ex)} {f(cy - 15.5 * s)} {f(cx + ex + 5.5 * s)} {f(cy - 12.5 * s)}" '
                  f'fill="none" stroke="{INK}" stroke-width="{f(2.2 * s)}" stroke-linecap="round"/>')
        mouth = (f'<path d="M{f(cx - 6 * s)} {f(cy + 10 * s)}Q{f(cx + 1 * s)} {f(cy + 12 * s)} {f(cx + 7.5 * s)} {f(cy + 7 * s)}" '
                 f'fill="none" stroke="{INK}" stroke-width="{f(2 * s)}" stroke-linecap="round"/>')
    neutral = (f'<path d="M{f(cx - 5 * s)} {f(cy + 10 * s)}Q{f(cx)} {f(cy + 12.5 * s)} {f(cx + 5 * s)} {f(cy + 10 * s)}" '
               f'fill="none" stroke="{INK}" stroke-width="{lw}" stroke-linecap="round"/>')
    a.anchor("face", cx, cy)
    return (f'<g class="face"><g class="eyes">{eyes}</g><g class="lids">{lids}</g><g class="brows">{brows}</g>'
            f'<g class="cheeks">{cheeks}</g><g class="mouth">{mouth}</g>'
            f'<g class="mouth-neutral" visibility="hidden">{neutral}</g></g>')


def cap_points(cx, rim_y, hw, top_y, bow, n=2.6, steps=10):
    """Dome cap seen slightly from below: superellipse top (right rim -> top -> left rim)
    followed by the bowed lower rim (left -> right). Returns a closed loop of points."""
    h = rim_y - top_y
    arc = []
    for i in range(steps + 1):
        th = math.pi * i / steps
        c, s_ = math.cos(th), math.sin(th)
        arc.append((cx + hw * math.copysign(abs(c) ** (2 / n), c), rim_y - h * abs(s_) ** (2 / n)))
    bottom = [(cx - hw * 0.96, rim_y + bow * 0.45), (cx - hw * 0.55, rim_y + bow * 0.92), (cx, rim_y + bow),
              (cx + hw * 0.55, rim_y + bow * 0.92), (cx + hw * 0.96, rim_y + bow * 0.45)]
    return arc + bottom


def stem_points(cx, profile, base_round=6):
    """profile: list of (y, hw) top->bottom. Returns closed outline points."""
    left = [(cx - hw, y) for y, hw in profile]
    right = [(cx + hw, y) for y, hw in profile][::-1]
    yb, hwb = profile[-1]
    bottom = [(cx - hwb * 0.55, yb + base_round), (cx + hwb * 0.55, yb + base_round)]
    return left + bottom + right


def hw_at(profile, y):
    for (y0, w0), (y1, w1) in zip(profile, profile[1:]):
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0) if y1 != y0 else 0
            return w0 + (w1 - w0) * t
    return profile[-1][1]


# ---------------------------------------------------------------- boletes

def bolete(sid, title, group, seed, cap_c, cap_light, cap_dark, cap_geo, pore_c, pore_dot, profile,
           stem_c, stem_light, stem_dark, deco, mood, face_y, face_s=1.0, rim_c=None, bruise=False,
           cap_skin=False, lookfor=()):
    a = Art(sid, title, group, seed=seed)
    cx = 120
    rim_y, hw, top_y, bow, n = cap_geo
    a.pivot = (cx, rim_y + bow)
    # ---- under (pores)
    ux_r, uy = hw * 0.9, rim_y + bow * 0.55
    u_ry = bow * 0.75 + 19
    pore_fill = a.linear("pore", [(0, pore_c[0]), (1, pore_c[1])], 0, uy - u_ry, 0, uy + u_ry)
    pores = a.pattern("pp", 5.2, 4.6, f'<circle cx="1.4" cy="1.2" r="1.3" fill="{pore_dot}"/>'
                                     f'<circle cx="4" cy="3.5" r="1.3" fill="{pore_dot}"/>')
    under = (f'<ellipse cx="{cx}" cy="{f(uy)}" rx="{f(ux_r)}" ry="{f(u_ry)}" fill="{pore_fill}" stroke="{INK}" stroke-width="2.6"/>'
             f'<ellipse cx="{cx}" cy="{f(uy)}" rx="{f(ux_r - 3)}" ry="{f(u_ry - 3)}" fill="{pores}" opacity=".85"/>')
    if bruise:
        under += (f'<path d="{blob(a, cx + 44, uy + u_ry - 9, 8, 7)}" fill="#3f6fb0" opacity=".8"/>'
                  f'<path d="{blob(a, cx + 44, uy + u_ry - 9, 4, 6)}" fill="#2c4f8a" opacity=".8"/>')
        a.anchor("bruise", cx + 42, uy + u_ry - 8)
    a.anchor("pores", cx - hw * 0.76, uy + u_ry * 0.45)
    # ---- stem
    sp = a.jit(stem_points(cx, profile), 0.6)
    sd = smooth(sp)
    yt, yb = profile[0][0], profile[-1][0]
    mw = max(w for _, w in profile)
    sfill = a.linear("stem", [(0, stem_dark), (.32, stem_light), (.62, stem_c), (1, stem_dark)], cx - mw, 0, cx + mw, 0)
    sclip = a.clip("sc", sd)
    stem = f'<path d="{sd}" fill="{sfill}"/>'
    deco_svg = ""
    fx0, fx1, fy0, fy1 = cx - 26 * face_s, cx + 26 * face_s, face_y - 14 * face_s, face_y + 20 * face_s
    if deco[0] == "net":  # fine white net at the top (hřib smrkový)
        _, col, w, h, sw, y_to = deco
        pat = a.pattern("net", w, h, f'<path d="M{w / 2} 0L{w} {h / 2}L{w / 2} {h}L0 {h / 2}Z" fill="none" stroke="{col}" stroke-width="{sw}"/>')
        m = a.mask_fade("nm", 0, yt, y_to, 240)
        deco_svg += f'<rect x="{cx - mw}" y="{yt}" width="{2 * mw}" height="{f(y_to - yt)}" fill="{pat}" mask="{m}"/>'
        a.anchor("net", cx + hw_at(profile, yt + 40) * 0.35, yt + 40)
    elif deco[0] == "coarse-net":  # žlučník
        _, col, w, h, sw, y_to = deco
        pat = a.pattern("net", w, h, f'<path d="M{w / 2} 0Q{w * .8} {h * .25} {w} {h / 2}Q{w * .8} {h * .75} {w / 2} {h}'
                                     f'Q{w * .2} {h * .75} 0 {h / 2}Q{w * .2} {h * .25} {w / 2} 0Z" fill="none" stroke="{col}" '
                                     f'stroke-width="{sw}" stroke-linejoin="round"/>')
        m = a.mask_fade("nm", 0, yt + 10, y_to, 240, 1, 0.15)
        deco_svg += (f'<g mask="{m}"><rect x="{cx - mw}" y="{yt}" width="{2 * mw}" height="{f(yb - yt + 8)}" fill="{pat}"/></g>')
        a.anchor("net", cx - hw_at(profile, yt + 40) * 0.5, yt + 40)
    elif deco[0] == "scales":  # kozák / křemenáč
        _, cols, density, size = deco
        d_by_col = {c: [] for c in cols}
        y = yt + 6
        while y < yb - 2:
            w_here = hw_at(profile, y)
            for _ in range(density):
                x = cx + a.rng.uniform(-w_here * 0.92, w_here * 0.92)
                yy = y + a.j(2.5)
                if fx0 < x < fx1 and fy0 < yy < fy1:
                    continue
                L = size * a.rng.uniform(0.6, 1.25)
                ang = math.radians(a.rng.uniform(-25, 25))
                col = cols[min(len(cols) - 1, int((yy - yt) / (yb - yt) * len(cols) + a.rng.uniform(-.6, .6)))] if len(cols) > 1 else cols[0]
                d_by_col[col].append(f"M{f(x)} {f(yy)}l{f(L * math.sin(ang))} {f(L * math.cos(ang))}")
            y += 5.2
        for col, ds in d_by_col.items():
            if ds:
                deco_svg += f'<path d="{"".join(ds)}" fill="none" stroke="{col}" stroke-width="2.5" stroke-linecap="round"/>'
        a.anchor("stem-scales", cx + hw_at(profile, yb - 30) * 0.5, yb - 30)
    elif deco[0] == "streaks":  # suchohřib: fibrillose streaks, no net
        _, col = deco
        ds = []
        for i in range(14):
            y0 = a.rng.uniform(yt + 6, yb - 30)
            w_here = hw_at(profile, y0)
            x = cx + a.rng.uniform(-w_here * 0.85, w_here * 0.85)
            if fx0 - 4 < x < fx1 + 4 and fy0 - 20 < y0 < fy1:
                continue
            ds.append(f"M{f(x)} {f(y0)}q{f(a.j(2))} 10 {f(a.j(2))} {f(a.rng.uniform(14, 26))}")
        deco_svg += f'<path d="{"".join(ds)}" fill="none" stroke="{col}" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>'
        a.anchor("stem-plain", cx + hw_at(profile, yt + 28) * 0.4, yt + 28)
    # contact shade under the cap
    deco_svg += (f'<ellipse cx="{cx}" cy="{f(yt + 4)}" rx="{f(profile[0][1] + 6)}" ry="9" fill="{INK}" opacity=".22"/>')
    stem += f'<g clip-path="{sclip}">{deco_svg}</g>'
    stem += f'<path d="{sd}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    stem += face(a, cx, face_y, mood, face_s, skin=sfill)
    # ---- cap
    cp = a.jit(cap_points(cx, rim_y, hw, top_y, bow, n), 0.7)
    cd = smooth(cp)
    cfill = a.radial("cap", [(0, cap_light), (.55, cap_c), (1, cap_dark)])
    cclip = a.clip("cc", cd)
    cap = f'<path d="{cd}" fill="{cfill}"/>'
    inner = ""
    if rim_c:
        rim = [(cx - hw - 4, rim_y - 2), (cx - hw * 0.55, rim_y + bow * 0.92 - 1), (cx, rim_y + bow - 1),
               (cx + hw * 0.55, rim_y + bow * 0.92 - 1), (cx + hw + 4, rim_y - 2)]
        inner += f'<path d="{smooth(rim, closed=False)}" fill="none" stroke="{rim_c}" stroke-width="9" opacity=".9"/>'
        a.anchor("rim", cx + hw * 0.7, rim_y + bow * 0.7)
    if cap_skin:  # křemenáč: overhanging cap skin flaps
        flaps = []
        for i in range(9):
            t = -0.85 + i * 0.21
            x = cx + hw * t
            yb_ = rim_y + bow * (1 - t * t) * 0.95 + 2
            flaps.append(f"M{f(x - 5)} {f(yb_ - 2)}l5 6l5 -6")
        inner += f'<path d="{"".join(flaps)}" fill="{cap_c}" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>'
    # highlight + texture speckles
    hl = [(cx - hw * 0.62, rim_y - (rim_y - top_y) * 0.42), (cx - hw * 0.4, rim_y - (rim_y - top_y) * 0.8),
          (cx - hw * 0.05, top_y + 7), (cx - hw * 0.3, top_y + 16), (cx - hw * 0.52, rim_y - (rim_y - top_y) * 0.55)]
    inner += f'<path d="{smooth(hl)}" fill="#fff" opacity=".22"/>'
    sp_ = []
    for _ in range(26):
        x = cx + a.rng.uniform(-hw * .8, hw * .8)
        y = a.rng.uniform(top_y + 10, rim_y - 4)
        sp_.append(f"M{f(x)} {f(y)}h.1")
    inner += f'<path d="{"".join(sp_)}" stroke="{cap_dark}" stroke-width="2.2" stroke-linecap="round" opacity=".35"/>'
    cap += f'<g clip-path="{cclip}">{inner}</g>'
    cap += f'<path d="{cd}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    a.anchor("cap", cx + hw * 0.25, top_y + (rim_y - top_y) * 0.35)
    if cap_skin:
        a.anchor("cap-skin", cx - hw * 0.75, rim_y + 6)
    sh = shadow_el(cx, 260, max(40, profile[-1][1] + 22))
    return a, a.svg(sh, ground_patch(a), under, stem, cap)


# ---------------------------------------------------------------- amanitas + bedla

def gills(a, cx, uy, rx, ry, fill, line, n=22, conv=None):
    conv = conv or (cx, uy - ry * 1.2)
    d = []
    for i in range(1, n):
        th = math.pi * i / n
        x = cx + rx * 0.97 * math.cos(math.pi - th)
        y = uy + ry * 0.97 * math.sin(th)
        d.append(f"M{f(conv[0] + (x - conv[0]) * 0.22)} {f(conv[1] + (y - conv[1]) * 0.22)}L{f(x)} {f(y)}")
    return (f'<ellipse cx="{f(cx)}" cy="{f(uy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}" stroke="{INK}" stroke-width="2.6"/>'
            f'<path d="{"".join(d)}" stroke="{line}" stroke-width="1.3" fill="none"/>')


def blob(a, x, y, r, k=6):
    pts = []
    for i in range(k):
        th = 2 * math.pi * i / k + a.j(.3)
        rr = r * a.rng.uniform(.75, 1.15)
        pts.append((x + rr * math.cos(th), y + rr * 0.8 * math.sin(th)))
    return smooth(pts)


def skirt_ring(a, cx, y, hw_stem, flare, drop, col="#f8f4ea", shade="#d9d3c2", pleats=7):
    top_l, top_r = (cx - hw_stem - 1, y), (cx + hw_stem + 1, y)
    bl, br = (cx - hw_stem - flare, y + drop), (cx + hw_stem + flare, y + drop)
    # scalloped lower edge
    edge = []
    nsc = 6
    for i in range(nsc + 1):
        t = i / nsc
        x = br[0] + (bl[0] - br[0]) * t
        yy = br[1] + 5 * math.sin(math.pi * t) + (3 if i % 2 else 0)
        edge.append((x, yy))
    d = (f"M{f(top_l[0])} {f(top_l[1])}C{f(top_l[0] - 4)} {f(y + drop * .35)} {f(bl[0])} {f(y + drop * .6)} {f(bl[0])} {f(bl[1])}"
         + "".join(f"L{f(x)} {f(yy)}" for x, yy in edge[::-1][1:])
         + f"C{f(br[0])} {f(y + drop * .6)} {f(top_r[0] + 4)} {f(y + drop * .35)} {f(top_r[0])} {f(top_r[1])}Z")
    out = f'<path d="{d}" fill="{col}" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'
    pl = []
    for i in range(1, pleats):
        t = i / pleats
        xt = top_l[0] + (top_r[0] - top_l[0]) * t
        xb = bl[0] + (br[0] - bl[0]) * t
        pl.append(f"M{f(xt)} {f(y + 3)}Q{f((xt + xb) / 2)} {f(y + drop * .6)} {f(xb)} {f(y + drop + 2)}")
    out += f'<path d="{"".join(pl)}" fill="none" stroke="{shade}" stroke-width="1.6"/>'
    out += f'<path d="M{f(bl[0] + 3)} {f(bl[1] - 1)}Q{f(cx)} {f(bl[1] + 12)} {f(br[0] - 3)} {f(br[1] - 1)}" fill="none" stroke="{shade}" stroke-width="3" opacity=".7"/>'
    return out


def amanita(sid, title, group, seed, deadly, cap_light, cap_c, cap_dark, cap_geo, cap_deco, stem_top_y,
            profile, ring_y, base, face_y, stem_c="#f7f2e6", stem_dark="#d8cfbc", gill_c="#fbf7ee", zigzag=False):
    a = Art(sid, title, group, deadly=deadly, seed=seed)
    cx = 120
    rim_y, hw, top_y, bow, n = cap_geo
    a.pivot = (cx, rim_y + bow)
    uy = rim_y + bow * 0.5
    under = gills(a, cx, uy, hw * 0.9, bow * 0.75 + 15, gill_c, "#c4b89c", n=26)
    a.anchor("gills", cx - hw * 0.5, uy + bow * 0.55 + 4)
    # stem
    sp = a.jit(stem_points(cx, profile, base_round=4), 0.5)
    sd = smooth(sp)
    mw = max(w for _, w in profile)
    sfill = a.linear("stem", [(0, stem_dark), (.35, "#ffffff"), (.65, stem_c), (1, stem_dark)], cx - mw, 0, cx + mw, 0)
    sclip = a.clip("sc", sd)
    yt, yb = profile[0][0], profile[-1][0]
    stem = ""
    # base drawn before stem body for volva (sac behind+front) / bulb
    kind = base[0]
    bx, by, brx, bry = base[1:5]
    bulb = f'<ellipse cx="{f(bx)}" cy="{f(by)}" rx="{f(brx)}" ry="{f(bry)}" fill="{sfill}" stroke="{INK}" stroke-width="3"/>'
    stem += bulb
    stem += f'<path d="{sd}" fill="{sfill}"/>'
    inner = f'<ellipse cx="{cx}" cy="{f(yt + 4)}" rx="{f(profile[0][1] + 6)}" ry="8" fill="{INK}" opacity=".2"/>'
    if zigzag:
        zz = []
        for k in range(7):
            y0 = ring_y + 26 + k * 13
            if face_y - 16 < y0 < face_y + 22:
                continue
            w_ = hw_at(profile, y0)
            pts = []
            for i in range(9):
                x = cx - w_ + i * (2 * w_) / 8
                pts.append(f"{'M' if i == 0 else 'L'}{f(x)} {f(y0 + (3 if i % 2 else -1))}")
            zz.append("".join(pts))
        inner += f'<path d="{"".join(zz)}" fill="none" stroke="#c9cfa4" stroke-width="1.6" stroke-linejoin="round" opacity=".9"/>'
        a.anchor("stem-zigzag", cx + hw_at(profile, ring_y + 50) * 0.5, ring_y + 52)
    stem += f'<g clip-path="{sclip}">{inner}</g>'
    stem += f'<path d="{sd}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    # bulb top edge over stem join
    stem += (f'<path d="M{f(bx - brx + 3)} {f(by - 2)}Q{f(bx - brx * .7)} {f(by - bry - 1)} {f(cx - hw_at(profile, by - bry))} {f(by - bry + 2)}'
             f'M{f(bx + brx - 3)} {f(by - 2)}Q{f(bx + brx * .7)} {f(by - bry - 1)} {f(cx + hw_at(profile, by - bry))} {f(by - bry + 2)}" '
             f'fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>')
    if kind == "warty-bulb":   # muchomůrka červená: concentric rings of wart fragments on the bulb shoulder
        bumps = []
        for row in range(3):
            yy = by - bry * .62 + row * 6.5
            span = brx * (.62 + row * .14)
            k = 7 + row * 2
            for i in range(k):
                t = -1 + 2 * (i + .5) / k
                x = bx + span * t
                y_ = yy + (1 - t * t) * 3.5 + a.j(.7)
                bumps.append(f'<path d="{blob(a, x, y_, 2.4 - row * .2, 5)}"/>')
        stem += f'<g fill="#fffaf0" stroke="{INK}" stroke-width="1.1">{"".join(bumps)}</g>'
        a.anchor("bulb-warts", bx + brx * 0.55, by - bry * .35)
    elif kind == "rim-bulb":   # tygrovaná: bulb with a distinct rolled rim (lem) hugging the stem
        yc = by - bry * .5
        R = hw_at(profile, yc) + 8
        band = (f"M{f(bx - R)} {f(yc)}A{f(R)} 6 0 0 0 {f(bx + R)} {f(yc)}"
                f"L{f(bx + R - 2.5)} {f(yc - 5.5)}A{f(R - 2.5)} 4.5 0 0 1 {f(bx - R + 2.5)} {f(yc - 5.5)}Z")
        stem += f'<path d="{band}" fill="#fffdf6" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>'
        w2 = hw_at(profile, yc - 14)
        stem += (f'<path d="M{f(bx - w2)} {f(yc - 15)}Q{f(bx)} {f(yc - 9)} {f(bx + w2)} {f(yc - 15)}" fill="none" '
                 f'stroke="#cfc6b2" stroke-width="2" stroke-linecap="round"/>')
        a.anchor("bulb-rim", bx + R, yc - 2)
    elif kind == "volva":      # zelená: bulb sitting in a white sac
        sac = (f"M{f(bx - brx - 6)} {f(by - bry * .2)}"
               f"l4 -10l5 7l6 -9l4 9"  # ragged lobes left
               f"Q{f(bx - 8)} {f(by - bry * .05)} {f(bx)} {f(by + 2)}"
               f"Q{f(bx + 8)} {f(by - bry * .05)} {f(bx + brx - 13)} {f(by - bry * .2 - 2)}"
               f"l5 -9l4 8l6 -8l5 10"
               f"C{f(bx + brx + 12)} {f(by + bry * .9)} {f(bx + brx * .4)} {f(by + bry + 6)} {f(bx)} {f(by + bry + 6)}"
               f"C{f(bx - brx * .4)} {f(by + bry + 6)} {f(bx - brx - 12)} {f(by + bry * .9)} {f(bx - brx - 6)} {f(by - bry * .2)}Z")
        sacfill = a.linear("sac", [(0, "#e9e6dc"), (.4, "#fbfaf4"), (1, "#d6d2c3")], bx - brx - 12, 0, bx + brx + 12, 0)
        stem += f'<path d="{sac}" fill="{sacfill}" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>'
        stem += (f'<path d="M{f(bx - brx + 2)} {f(by + 6)}q8 6 16 7M{f(bx + brx - 4)} {f(by + 4)}q-6 7 -14 9" fill="none" '
                 f'stroke="#c8c3b2" stroke-width="1.8" stroke-linecap="round"/>')
        a.anchor("volva", bx - brx - 2, by + 4)
    stem += skirt_ring(a, cx, ring_y, hw_at(profile, ring_y), 8, 22)
    a.anchor("ring", cx + hw_at(profile, ring_y) + 12, ring_y + 14)
    stem += face(a, cx, face_y, "sly", 0.95, skin=sfill)
    # cap
    cp = a.jit(cap_points(cx, rim_y, hw, top_y, bow, n), 0.7)
    cd = smooth(cp)
    cfill = a.radial("cap", [(0, cap_light), (.5, cap_c), (1, cap_dark)])
    cclip = a.clip("cc", cd)
    cap = f'<path d="{cd}" fill="{cfill}"/>'
    inner = ""
    h = rim_y - top_y
    hl = [(cx - hw * 0.62, rim_y - h * 0.45), (cx - hw * 0.4, rim_y - h * 0.82), (cx - hw * 0.05, top_y + 7),
          (cx - hw * 0.3, top_y + 15), (cx - hw * 0.52, rim_y - h * 0.55)]
    inner += f'<path d="{smooth(hl)}" fill="#fff" opacity=".2"/>'
    if cap_deco[0] == "warts":
        _, rows, r0, colw = cap_deco
        ws = []
        for ri, (ty, k, rr) in enumerate(rows):
            for i in range(k):
                t = -1 + 2 * (i + .5) / k + a.j(.06)
                # place on dome: x along width at that height
                yy = top_y + h * ty
                halfw = hw * math.sqrt(max(0.05, 1 - (1 - ty) ** 2)) * 0.96
                x = cx + halfw * t
                yy += (1 - t * t) * 4 * ty + a.j(1.2)
                ws.append(f'<path d="{blob(a, x, yy, rr * (1 - .35 * abs(t)))}"/>')
        inner += f'<g fill="{colw}" stroke="{INK}" stroke-width="1.3">{"".join(ws)}</g>'
        a.anchor("warts", cx + hw * 0.15, top_y + h * 0.35)
    elif cap_deco[0] == "fibrils":
        ds = []
        for i in range(30):
            t = -1 + 2 * i / 29
            x0 = cx + t * hw * 0.25
            x1 = cx + t * hw * 1.02
            ds.append(f"M{f(x0)} {f(top_y + 10)}Q{f((x0 + x1) / 2)} {f(top_y + h * .4)} {f(x1)} {f(rim_y + bow * (1 - t * t))}")
        inner += f'<path d="{"".join(ds)}" fill="none" stroke="{cap_dark}" stroke-width="1" opacity=".35"/>'
        a.anchor("cap-smooth", cx + hw * 0.3, top_y + h * 0.4)
    if len(cap_deco) > 1 and cap_deco[0] == "warts" and title.startswith("Muchom") and "tygr" in sid:
        # striate margin (short radial lines at the rim)
        st = []
        for i in range(24):
            t = -0.95 + i * (1.9 / 23)
            x = cx + hw * t
            yb_ = rim_y + bow * (1 - t * t) * .9
            st.append(f"M{f(x)} {f(yb_ - 2)}l{f(-t * 2)} -9")
        inner += f'<path d="{"".join(st)}" stroke="{cap_dark}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>'
        a.anchor("striate-rim", cx - hw * .8, rim_y + 2)
    cap += f'<g clip-path="{cclip}">{inner}</g>'
    cap += f'<path d="{cd}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    a.anchor("cap", cx + hw * 0.45, top_y + h * 0.5)
    warn = warn_marks(cx, top_y, hw, drop=-2)
    sh = shadow_el(cx, 260, brx + 22)
    return a, a.svg(sh, ground_patch(a), under, stem, cap, warn)


def warn_marks(cx, top_y, hw, color=POISON, drop=0):
    """'Pozor!' cue: two tilted exclamation marks flanking the cap (comic alarm convention)."""
    out = []
    for sx in (-1, 1):
        x0, y0 = cx + sx * (hw * 0.86), top_y + drop
        out.append(f'<g transform="translate({f(x0)} {f(y0)}) rotate({sx * 16})">'
                   f'<path d="M-3.6 -19Q0 -21 3.6 -19L1.8 -1Q0 .4 -1.8 -1Z" fill="{color}" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>'
                   f'<circle cx="0" cy="6" r="3.1" fill="{color}" stroke="{INK}" stroke-width="2"/></g>')
    return "".join(out)


# ---------------------------------------------------------------- species

def build_all():
    arts = {}

    # 1 Hřib smrkový — Boletus edulis
    arts["hrib-smrkovy"] = bolete(
        "hrib-smrkovy", "Hřib smrkový", "jedla", 11,
        cap_c="#8a4f2a", cap_light="#b8753e", cap_dark="#5e3219",
        cap_geo=(118, 92, 34, 14, 2.4), pore_c=("#efe3a2", "#cdbd62"), pore_dot="#b39f45",
        profile=[(118, 24), (146, 29), (184, 41), (222, 48), (247, 43)],
        stem_c="#eadcbd", stem_light="#f8f0dc", stem_dark="#c5ad85",
        deco=("net", "#ffffff", 7, 10, 1.3, 182), mood="happy", face_y=206, face_s=1.05,
        rim_c="#d9a877")[1]

    # 2 Kozák březový — Leccinum scabrum
    arts["kozak"] = bolete(
        "kozak", "Kozák březový", "jedla", 22,
        cap_c="#8a6c50", cap_light="#b0937a", cap_dark="#5c4632",
        cap_geo=(96, 74, 30, 12, 2.3), pore_c=("#f1ede4", "#d9d2c3"), pore_dot="#bdb3a0",
        profile=[(96, 15), (140, 17), (200, 20), (236, 22), (250, 21)],
        stem_c="#efebe3", stem_light="#fbf9f4", stem_dark="#cfc6b6",
        deco=("scales", ["#2c2622"], 5, 2.8), mood="happy", face_y=178, face_s=0.86)[1]

    # 3 Křemenáč osikový — Leccinum aurantiacum
    arts["kremenac"] = bolete(
        "kremenac", "Křemenáč osikový", "jedla", 33,
        cap_c="#d4561e", cap_light="#ef8a3c", cap_dark="#a63a12",
        cap_geo=(98, 76, 26, 13, 2.0), pore_c=("#f4ecdc", "#ddd0b8"), pore_dot="#c4b598",
        profile=[(98, 17), (140, 19), (200, 22), (236, 24), (250, 23)],
        stem_c="#f0ebe2", stem_light="#fcfaf6", stem_dark="#d3c8b6",
        deco=("scales", ["#8a4a2a", "#5a2e1c", "#2a1a14"], 3, 4.2), mood="happy", face_y=178, face_s=0.9,
        cap_skin=True)[1]

    # 4 Hřib hnědý (suchohřib) — Imleria badia
    arts["suchohrib"] = bolete(
        "suchohrib", "Hřib hnědý", "jedla", 44,
        cap_c="#6e3a20", cap_light="#9a5b33", cap_dark="#4a2412",
        cap_geo=(110, 82, 42, 13, 3.0), pore_c=("#efe07a", "#d3c24c"), pore_dot="#b8a63a",
        profile=[(110, 19), (150, 21), (200, 24), (236, 25), (250, 23)],
        stem_c="#b88f5e", stem_light="#d8b888", stem_dark="#8c6a40",
        deco=("streaks", "#6e4a2a"), mood="happy", face_y=192, face_s=0.95, bruise=True)[1]

    # 5 Hřib žlučník — Tylopilus felleus
    arts["zlucnik"] = bolete(
        "zlucnik", "Hřib žlučník", "nejedla", 55,
        cap_c="#a77d4f", cap_light="#caa171", cap_dark="#7a5631",
        cap_geo=(114, 88, 36, 14, 2.5), pore_c=("#f2d4cb", "#dfaea3"), pore_dot="#c58f86",
        profile=[(114, 24), (150, 31), (195, 39), (228, 41), (248, 37)],
        stem_c="#cfb284", stem_light="#e6cfa4", stem_dark="#a88a5c",
        deco=("coarse-net", "#5a3820", 12, 17, 2.3, 250), mood="bleh", face_y=200, face_s=1.05)[1]

    # 6 Muchomůrka červená — Amanita muscaria
    arts["muchomurka-cervena"] = amanita(
        "muchomurka-cervena", "Muchomůrka červená", "jedovata", 66, False,
        cap_light="#f3593a", cap_c="#d8261c", cap_dark="#9c1610",
        cap_geo=(90, 80, 24, 12, 2.2),
        cap_deco=("warts", [(.12, 3, 5.2), (.32, 5, 5.6), (.55, 6, 5.4), (.8, 7, 4.6)], 5, "#fffaf0"),
        stem_top_y=92, profile=[(92, 15), (140, 16), (190, 19), (226, 22)],
        ring_y=142, base=("warty-bulb", 120, 236, 31, 22), face_y=192)[1]

    # 7 Muchomůrka zelená — Amanita phalloides (deadly)
    arts["muchomurka-zelena"] = amanita(
        "muchomurka-zelena", "Muchomůrka zelená", "jedovata", 77, True,
        cap_light="#c9cd8a", cap_c="#9ea35a", cap_dark="#6c7236",
        cap_geo=(92, 78, 34, 12, 2.6), cap_deco=("fibrils",),
        stem_top_y=92, profile=[(94, 14), (140, 15), (190, 18), (224, 21)],
        ring_y=140, base=("volva", 120, 234, 27, 19), face_y=190, zigzag=True)[1]

    # 8 Muchomůrka tygrovaná — Amanita pantherina (deadly)
    arts["muchomurka-tygrovana"] = amanita(
        "muchomurka-tygrovana", "Muchomůrka tygrovaná", "jedovata", 88, True,
        cap_light="#b88a5a", cap_c="#8d6238", cap_dark="#5c3c1f",
        cap_geo=(90, 80, 30, 12, 2.7),
        cap_deco=("warts", [(.14, 4, 3.0), (.34, 6, 3.1), (.56, 8, 3.0), (.78, 9, 2.6)], 3, "#ffffff"),
        stem_top_y=92, profile=[(92, 14), (140, 15), (190, 16), (226, 18)],
        ring_y=142, base=("rim-bulb", 120, 240, 26, 17), face_y=192)[1]

    arts["bedla"] = bedla()
    arts["liska"] = liska()
    arts["pychavka"] = pychavka()
    arts["troudnatec"] = troudnatec()
    arts["trepenitka"] = trepenitka()
    return arts


def bedla():
    a = Art("bedla", "Bedla vysoká", "jedla", seed=99)
    cx = 120
    rim_y, hw = 66, 104
    a.pivot = (cx, rim_y + 4)
    # gills (thin band under the flat parasol)
    under = gills(a, cx, rim_y + 3, hw * 0.92, 10, "#fbf7ee", "#cfc4ab", n=30)
    a.anchor("gills", cx - 60, rim_y + 9)
    # stem: slender, bulbous base, snakeskin bands
    profile = [(70, 8), (110, 9), (170, 10), (222, 12), (240, 17), (250, 17)]
    sp = a.jit(stem_points(cx, profile, 4), 0.4)
    sd = smooth(sp)
    sfill = a.linear("stem", [(0, "#c9b391"), (.35, "#f6eedd"), (.7, "#e6d8bd"), (1, "#bfa682")], cx - 17, 0, cx + 17, 0)
    sclip = a.clip("sc", sd)
    snake = []
    y = 124
    while y < 236:
        w_ = hw_at(profile, y) + 2
        if not (150 < y < 190):
            snake.append(f"M{f(cx - w_)} {f(y + a.j(1))}l{f(w_ * .5)} 3.5l{f(w_ * .5)} -2.5l{f(w_ * .5)} 3l{f(w_ * .5)} -3")
        y += 7.5 + a.j(1.5)
    stem = f'<path d="{sd}" fill="{sfill}"/>'
    stem += (f'<g clip-path="{sclip}"><path d="{"".join(snake)}" fill="none" stroke="#8a5e3a" stroke-width="2.4" '
             f'stroke-linejoin="round" stroke-linecap="round"/>'
             f'<ellipse cx="{cx}" cy="72" rx="14" ry="6" fill="{INK}" opacity=".25"/></g>')
    stem += f'<path d="{sd}" fill="none" stroke="{INK}" stroke-width="2.8" stroke-linejoin="round"/>'
    a.anchor("snakeskin", cx + 9, 214)
    # thick, movable double ring
    ry0 = 100
    stem += (f'<ellipse cx="{cx}" cy="{ry0 + 6}" rx="22" ry="7" fill="#e8dcc4" stroke="{INK}" stroke-width="2.4"/>'
             f'<ellipse cx="{cx}" cy="{ry0}" rx="22" ry="7" fill="#fbf6ea" stroke="{INK}" stroke-width="2.4"/>'
             f'<path d="M{cx - 22} {ry0}v6M{cx + 22} {ry0}v6" stroke="{INK}" stroke-width="2.4"/>'
             f'<path d="M{cx - 9} {ry0 - 1}a9 3 0 0 0 18 0" fill="none" stroke="#b49a73" stroke-width="2"/>'
             f'<path d="M{cx - 20} {ry0 + 9}q20 6 40 0" fill="none" stroke="#8a5e3a" stroke-width="1.6"/>')
    a.anchor("ring", cx + 24, ry0 + 3)
    stem += face(a, cx, 166, "happy", 0.62, skin=sfill)
    # bulb outline accent
    a.anchor("bulb", cx - 17, 246)
    # cap: wide flat parasol with dark central bump
    pts = [(cx - hw, rim_y + 1), (cx - hw * .9, rim_y - 9), (cx - hw * .6, rim_y - 22), (cx - 28, rim_y - 30),
           (cx - 14, rim_y - 42), (cx, rim_y - 46), (cx + 14, rim_y - 42), (cx + 28, rim_y - 30),
           (cx + hw * .6, rim_y - 22), (cx + hw * .9, rim_y - 9), (cx + hw, rim_y + 1),
           (cx + hw * .5, rim_y + 5), (cx, rim_y + 6), (cx - hw * .5, rim_y + 5)]
    cd = smooth(a.jit(pts, .6))
    cfill = a.radial("cap", [(0, "#fbf3e2"), (.6, "#efe2c8"), (1, "#cdb790")], cx="45%", cy="20%", r="70%")
    cclip = a.clip("cc", cd)
    scales = []
    for ring_i, (rx, n, sz) in enumerate([(30, 7, 6.5), (48, 11, 6), (66, 14, 5.4), (84, 18, 4.6), (98, 22, 3.6)]):
        for i in range(n):
            th = math.pi * (i + .5 + a.j(.25)) / n
            x = cx - rx * math.cos(th)
            yy = (rim_y - 26 + ring_i * 4.2) + rx * .11 * math.sin(th) - (0 if ring_i else 0)
            scales.append(f'<path d="{blob(a, x, yy, sz, 5)}"/>')
    inner = (f'<g fill="#8c5a33" stroke="{INK}" stroke-width=".9" opacity=".95">{"".join(scales)}</g>'
             f'<path d="M{cx - 20} {rim_y - 30}Q{cx - 16} {rim_y - 48} {cx} {rim_y - 48}Q{cx + 16} {rim_y - 48} {cx + 20} {rim_y - 30}'
             f'Q{cx} {rim_y - 24} {cx - 20} {rim_y - 30}Z" fill="#6b3f22"/>'
             f'<path d="M{cx - 8} {rim_y - 42}q6 -5 13 -2" fill="none" stroke="#a7724a" stroke-width="2.4" stroke-linecap="round"/>')
    cap = f'<path d="{cd}" fill="{cfill}"/><g clip-path="{cclip}">{inner}</g>'
    cap += f'<path d="{cd}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
    a.anchor("umbo", cx, rim_y - 42)
    a.anchor("cap-scales", cx + 66, rim_y - 16)
    return a.svg(shadow_el(cx, 260, 40), ground_patch(a), under, stem, cap)


def liska():
    a = Art("liska", "Liška obecná", "jedla", seed=101)
    cx = 120
    a.pivot = (cx, 170)
    yolk, yolk_l, yolk_d = "#f2b01e", "#ffd45e", "#cf8a0e"
    rim_y, rx, ry = 100, 90, 23
    # one continuous silhouette: funnel narrowing into the stem (ridges run down onto it)
    body = [(cx - rx + 3, rim_y + 2), (cx - 64, rim_y + 22), (cx - 40, rim_y + 44), (cx - 28, rim_y + 70),
            (cx - 24, rim_y + 104), (cx - 22, rim_y + 136), (cx - 15, rim_y + 153), (cx, rim_y + 156),
            (cx + 15, rim_y + 153), (cx + 22, rim_y + 136), (cx + 24, rim_y + 104), (cx + 28, rim_y + 70),
            (cx + 40, rim_y + 44), (cx + 64, rim_y + 22), (cx + rx - 3, rim_y + 2)]
    bd = smooth(a.jit(body, .5), closed=False) + "Z"
    bfill = a.linear("body", [(0, yolk_d), (.33, yolk_l), (.7, yolk), (1, yolk_d)], cx - rx, 0, cx + rx, 0)
    bclip = a.clip("bc", bd)
    # forked, blunt ridges: main ridges reach the stem, side branches join them (Y forks)
    mains, branches = [], []
    k = 9
    for i in range(k):
        t = -1 + 2 * (i + .5) / k
        x0, y0 = cx + t * rx * .9, rim_y + ry * math.sqrt(max(0, 1 - t * t)) * .92
        x1, y1 = cx + t * 20, rim_y + 112
        mx, my = cx + t * 36, rim_y + 52
        mains.append(((x0, y0), (mx, my), (x1, y1)))
    for i, ((x0, y0), (mx, my), (x1, y1)) in enumerate(mains):
        branches.append(f"M{f(x0)} {f(y0)}Q{f(mx)} {f(my)} {f(x1)} {f(y1)}")
        if i < k - 1:
            (nx0, ny0), _, _ = mains[i + 1]
            bx, by = (x0 + nx0) / 2, (y0 + ny0) / 2 + 1
            jx, jy = x0 + (mx - x0) * .55, y0 + (my - y0) * .55
            jx, jy = (jx + nx0 + (mains[i + 1][1][0] - nx0) * .55) / 2 - (nx0 - x0) * .25, jy
            branches.append(f"M{f(bx)} {f(by)}Q{f(bx - (bx - jx) * .3)} {f((by + jy) / 2)} {f(jx)} {f(jy + 4)}")
    rd = "".join(branches)
    m = a.mask_fade("rm", 0, rim_y + 74, rim_y + 112, 240)
    under = (f'<path d="{bd}" fill="{bfill}"/>'
             f'<g clip-path="{bclip}"><g mask="{m}">'
             f'<path d="{rd}" fill="none" stroke="{yolk_d}" stroke-width="3" stroke-linecap="round"/>'
             f'<path d="{rd}" fill="none" stroke="{yolk_l}" stroke-width="1" stroke-linecap="round" transform="translate(-1.3 -.4)"/></g>'
             f'<ellipse cx="{cx}" cy="{rim_y + 160}" rx="34" ry="12" fill="{yolk_d}" opacity=".35"/></g>'
             f'<path d="{bd}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    a.anchor("ridges", cx - 44, rim_y + 30)
    a.anchor("ridges-down-stem", cx + 14, rim_y + 88)
    stem = face(a, cx, 218, "happy", 0.9, skin=bfill)
    # wavy, in-rolled funnel mouth seen from slightly above
    pts, ipts = [], []
    for i in range(30):
        th = 2 * math.pi * i / 30
        r = 1 + .055 * math.sin(5 * th + .7) + .03 * math.sin(11 * th + 2)
        pts.append((cx + rx * r * math.cos(th), rim_y + ry * r * math.sin(th)))
        ipts.append((cx + (rx - 18) * r * math.cos(th), rim_y - 2 + (ry - 8) * r * math.sin(th)))
    top_d = smooth(pts)
    tfill = a.radial("top", [(0, yolk_d), (.5, yolk), (1, yolk_l)], cx="50%", cy="45%", r="60%")
    cap = (f'<path d="{top_d}" fill="{tfill}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
           f'<path d="{smooth(ipts)}" fill="{yolk_d}" opacity=".4"/>'
           f'<path d="M{cx - rx + 10} {rim_y + 8}Q{cx} {rim_y + ry + 8} {cx + rx - 10} {rim_y + 8}" fill="none" stroke="{yolk_l}" stroke-width="4" stroke-linecap="round" opacity=".9"/>')
    a.anchor("cap-wavy", cx + rx - 6, rim_y - 4)
    return a.svg(shadow_el(cx, 260, 40), ground_patch(a), under, stem, cap)


def pychavka():
    a = Art("pychavka", "Pýchavka obecná", "jedla", seed=202)
    cx = 120
    a.pivot = (cx, 230)
    pts = [(cx, 84), (cx + 40, 89), (cx + 63, 112), (cx + 68, 142), (cx + 60, 174), (cx + 46, 198), (cx + 38, 222),
           (cx + 40, 248), (cx, 257), (cx - 40, 248), (cx - 38, 222), (cx - 46, 198), (cx - 60, 174), (cx - 68, 142),
           (cx - 63, 112), (cx - 40, 89)]
    bd = smooth(a.jit(pts, .6))
    fill = a.radial("ball", [(0, "#fffef9"), (.55, "#f3ecdc"), (1, "#cbbb98")], cx="40%", cy="30%", r="75%")
    clip = a.clip("bc", bd)
    spines, gran = [], []
    placed = []
    tries = 0
    while len(placed) < 58 and tries < 3000:
        tries += 1
        x = a.rng.uniform(cx - 64, cx + 64)
        y = a.rng.uniform(88, 240)
        inside_head = ((x - cx) / 64) ** 2 + ((y - 142) / 60) ** 2 < .9
        inside_base = y > 190 and abs(x - cx) < 34
        if not (inside_head or inside_base):
            continue
        if 90 < x < 150 and 146 < y < 196:   # keep the face clear
            continue
        if any((x - px) ** 2 + (y - py) ** 2 < 150 for px, py in placed):
            continue
        placed.append((x, y))
        sz = (5.4 if y < 128 else 4.4 if y < 196 else 3.2) * a.rng.uniform(.85, 1.15)
        spines.append(f"M{f(x - sz * .62)} {f(y + sz * .3)}Q{f(x - sz * .2)} {f(y - sz * .2)} {f(x)} {f(y - sz)}"
                      f"Q{f(x + sz * .2)} {f(y - sz * .2)} {f(x + sz * .62)} {f(y + sz * .3)}Q{f(x)} {f(y + sz * .7)} {f(x - sz * .62)} {f(y + sz * .3)}Z")
        for g in range(5):
            ang = 2 * math.pi * g / 5 + a.j(.4)
            gran.append(f"M{f(x + 6.5 * math.cos(ang))} {f(y + 1 + 5 * math.sin(ang))}h.1")
    # silhouette spines on the crown
    edge = []
    for i in range(9):
        th = math.pi * (1.16 + .68 * i / 8)
        x = cx + 64 * math.cos(th)
        y = 144 + 59 * math.sin(th)
        nx, ny = math.cos(th), math.sin(th)
        edge.append(f"M{f(x - ny * 3)} {f(y + nx * 3)}L{f(x + nx * 5.5)} {f(y + ny * 5.5)}L{f(x + ny * 3)} {f(y - nx * 3)}Z")
    body = (f'<path d="{"".join(edge)}" fill="#ece1cb" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round"/>'
            f'<path d="{bd}" fill="{fill}"/>'
            f'<g clip-path="{clip}"><path d="{"".join(gran)}" stroke="#c4b18c" stroke-width="2" stroke-linecap="round"/>'
            f'<path d="{"".join(spines)}" fill="#cdb68b" stroke="#a48d65" stroke-width=".8" stroke-linejoin="round"/>'
            f'<path d="M{cx - 34} 222Q{cx} 236 {cx + 34} 222L{cx + 44} 262H{cx - 44}Z" fill="#c9b997" opacity=".5"/>'
            f'<path d="M{cx - 42} 120Q{cx - 32} 96 {cx - 8} 93Q{cx - 28} 106 {cx - 34} 128Z" fill="#fff" opacity=".7"/></g>'
            f'<path d="{bd}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    a.anchor("spines", cx + 30, 112)
    a.anchor("top", cx, 88)
    a.anchor("no-gills", cx - 64, 150)
    body += face(a, cx, 166, "happy", 1.05, skin=fill)
    return a.svg(shadow_el(cx, 260, 50), ground_patch(a), "", body, "")


def troudnatec():
    a = Art("troudnatec", "Troudnatec kopytovitý", "nejedla", seed=303)
    a.pivot = (126, 150)
    # birch trunk segment (part of the scene, counts as 'stem' group so it stays put with the body)
    tx0, tx1, ty = 40, 128, 62
    trunk_pts = [(tx0 + 2, ty), (tx0, 140), (tx0 - 2, 220), (tx0 - 10, 258), (tx0 + 10, 262), (tx1 - 4, 262),
                 (tx1 + 10, 258), (tx1 + 2, 220), (tx1, 140), (tx1 - 1, ty)]
    td = smooth(trunk_pts, closed=False) + "Z"
    bark = a.linear("bark", [(0, "#cfc8b8"), (.3, "#fbf8f0"), (.75, "#ece6d8"), (1, "#bdb5a2")], tx0, 0, tx1, 0)
    tclip = a.clip("tc", td)
    marks = []
    for _ in range(16):
        x = a.rng.uniform(tx0 + 4, tx1 - 16)
        y = a.rng.uniform(ty + 20, 250)
        w = a.rng.uniform(8, 22)
        marks.append(f"M{f(x)} {f(y)}q{f(w / 2)} {f(-2 + a.j(1))} {f(w)} 0")
    trunk = (f'<path d="{td}" fill="{bark}"/>'
             f'<g clip-path="{tclip}"><path d="{"".join(marks)}" fill="none" stroke="#2b2724" stroke-width="2.6" stroke-linecap="round"/>'
             f'<path d="M{tx0} 196q14 -8 22 4q-8 14 -22 10z M{tx1} 232q-16 -6 -20 8q10 10 20 6z" fill="#2b2724"/></g>'
             f'<path d="{td}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
             f'<ellipse cx="{(tx0 + tx1) / 2 + 1}" cy="{ty}" rx="{(tx1 - tx0) / 2 + 1}" ry="11" fill="#d8b98a" stroke="{INK}" stroke-width="2.6"/>'
             f'<ellipse cx="{(tx0 + tx1) / 2 + 1}" cy="{ty}" rx="28" ry="7" fill="none" stroke="#b08a5a" stroke-width="1.5"/>'
             f'<ellipse cx="{(tx0 + tx1) / 2 + 1}" cy="{ty}" rx="14" ry="3.6" fill="none" stroke="#b08a5a" stroke-width="1.5"/>')
    a.anchor("tree", tx0 + 14, 230)
    # hoof bracket
    ax, ay = 126, 140  # attachment centre
    outer = [(124, 92), (160, 96), (196, 114), (218, 140), (220, 162), (210, 176), (180, 182), (150, 186), (124, 188)]
    od = smooth(outer, closed=False) + "Z"
    bands = ""
    cols = ["#cfae7e", "#a7a297", "#c2bdb2", "#959086", "#b8b3a8", "#8c877d", "#aaa59a"]
    for k, sc in enumerate([1.0, .9, .8, .69, .57, .45, .33]):
        pts = [(ax + (x - ax) * sc, ay + (y - ay) * sc + (1 - sc) * 18) for x, y in outer]
        pts = pts[:-1] + [(124, ay + (188 - ay) * sc + (1 - sc) * 18)]
        bands += f'<path d="{smooth(pts, closed=False)}Z" fill="{cols[k]}"/>'
    # underside sliver
    under = (f'<path d="M124 186Q170 192 210 177Q206 188 180 192Q150 196 124 194Z" fill="#a08a66" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>')
    bracket = (f'<path d="{od}" fill="#8a857b"/>{bands}'
               f'<path d="M150 112Q176 112 196 130" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".25"/>'
               f'<path d="{od}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    a.anchor("bands", 150, 112)
    a.anchor("hoof", 218, 154)
    bracket += face(a, 174, 148, "sleepy", 1.1, skin="#b8b3a8")
    a.anchor("on-wood", 118, 170)
    return a.svg(shadow_el(98, 261, 66), ground_patch(a), under, trunk, bracket)


def trepenitka():
    a = Art("trepenitka", "Třepenitka svazčitá", "jedovata", seed=404)
    sul, sul_d, tawny = "#e9cb3c", "#b99a1e", "#c9792a"
    # low stump
    top_y = 216
    stump_pts = [(60, top_y), (58, 240), (44, 259), (70, 263), (170, 263), (196, 259), (182, 240), (180, top_y)]
    sd = smooth(stump_pts, closed=False) + "Z"
    sfill = a.linear("stump", [(0, "#4f3423"), (.35, "#87603f"), (.8, "#6b4a30"), (1, "#3f2a1c")], 44, 0, 196, 0)
    sclip = a.clip("sc", sd)
    grain = "".join(f"M{f(x)} {top_y + 8}q{f(a.j(3))} 22 {f(a.j(5))} 44" for x in range(68, 178, 11))
    stump = (f'<path d="{sd}" fill="{sfill}"/>'
             f'<g clip-path="{sclip}"><path d="{grain}" fill="none" stroke="#3b2417" stroke-width="1.6" opacity=".45"/></g>'
             f'<path d="{sd}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
             f'<ellipse cx="120" cy="{top_y}" rx="60" ry="12" fill="#d7aa6c" stroke="{INK}" stroke-width="2.6"/>'
             f'<ellipse cx="120" cy="{top_y}" rx="40" ry="7.5" fill="none" stroke="#b5874c" stroke-width="1.5"/>'
             f'<ellipse cx="120" cy="{top_y}" rx="20" ry="3.6" fill="none" stroke="#b5874c" stroke-width="1.5"/>')
    a.anchor("on-wood", 66, 244)
    stemfill = a.linear("st", [(0, "#a8862e"), (.4, "#f3e08c"), (1, "#b8962e")], 0, 0, 1, 0, user=False)
    capfill = a.radial("cap", [(0, tawny), (.3, "#dca23a"), (.65, sul), (1, sul_d)], cx="50%", cy="38%", r="70%")
    # (base x, base y, cap x, cap rim y, cap hw, cap h, stem hw) back -> front
    shrooms = [(98, 214, 64, 118, 30, 22, 6), (146, 212, 180, 110, 32, 23, 6.5), (122, 210, 120, 82, 34, 25, 7),
               (102, 222, 82, 152, 29, 21, 7.5), (136, 226, 148, 140, 42, 29, 14)]
    body = ""
    for i, (bx, by, kx, ky, khw, kh, shw) in enumerate(shrooms):
        mx = (bx + kx) / 2 + (5 if kx < bx else -5)
        sp = [(kx - shw * .8, ky + 2), (mx - shw, (by + ky) / 2), (bx - shw - 1, by), (bx + shw + 1, by),
              (mx + shw, (by + ky) / 2), (kx + shw * .8, ky + 2)]
        spd = smooth(sp, closed=False) + "Z"
        body += (f'<path d="{spd}" fill="{stemfill}" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'
                 f'<path d="M{f(bx - shw)} {f(by - 16)}Q{f(bx)} {f(by - 11)} {f(bx + shw)} {f(by - 16)}L{f(bx + shw + 1)} {f(by - 1)}'
                 f'Q{f(bx)} {f(by + 2)} {f(bx - shw - 1)} {f(by - 1)}Z" fill="#7a5520" opacity=".45"/>')
        if i == len(shrooms) - 1:
            body += face(a, (kx + bx) / 2 - 1, 192, "sly", 0.62, skin="#efd983")
            a.pivot = (kx, ky)
        gry = kh * .34 + 4
        gl = "".join(f"M{f(kx + khw * .9 * math.cos(math.pi - math.pi * j / 10) * .25)} {f(ky + 1)}"
                     f"L{f(kx + khw * .9 * math.cos(math.pi - math.pi * j / 10))} {f(ky + 2 + gry * math.sin(math.pi * j / 10))}"
                     for j in range(1, 10))
        body += (f'<ellipse cx="{f(kx)}" cy="{f(ky + 2)}" rx="{f(khw * .92)}" ry="{f(gry)}" fill="#b5b84f" stroke="{INK}" stroke-width="2"/>'
                 f'<path d="{gl}" stroke="#7d8a2a" stroke-width="1" fill="none"/>')
        cdd = smooth(a.jit(cap_points(kx, ky, khw, ky - kh, 4, 2.2, 8), .4))
        body += (f'<path d="{cdd}" fill="{capfill}" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'
                 f'<path d="M{f(kx - khw * .55)} {f(ky - kh * .5)}Q{f(kx - khw * .3)} {f(ky - kh * .85)} {f(kx)} {f(ky - kh * .9)}" '
                 f'fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>')
    a.anchor("tuft", 180, 96)
    a.anchor("cap-sulphur", 122, 66)
    a.anchor("gills-green", 176, 148)
    return a.svg(shadow_el(120, 261, 76), ground_patch(a, rx=100), "", stump + body, "", warn_marks(122, 58, 74))


LOOK = {  # anchor data-feature per lookFor index, in the order of data/species.json (2026-10-11)
    "hrib-smrkovy": ["cap", "pores", "net"],
    "liska": ["ridges-down-stem", "cap-wavy", "ridges"],
    "bedla": ["cap-scales", "snakeskin", "ring"],
    "kozak": ["cap", "stem-scales", "pores"],
    "kremenac": ["cap", "stem-scales", "pores"],
    "suchohrib": ["cap", "bruise", "stem-plain"],
    "pychavka": ["no-gills", "spines", "top"],
    "zlucnik": ["cap", "pores", "net"],
    "troudnatec": ["hoof", "bands", "on-wood"],
    "muchomurka-cervena": ["warts", "gills", "ring"],
    "muchomurka-zelena": ["cap-smooth", "gills", "volva"],
    "muchomurka-tygrovana": ["warts", "striate-rim", "bulb-rim"],
    "trepenitka": ["on-wood", "cap-sulphur", "gills-green"],
}


def tag_look(sid, svg):
    for i, feat in enumerate(LOOK.get(sid, [])):
        key = f'data-feature="{feat}"'
        assert key in svg, (sid, feat)
        svg = svg.replace(key, f'{key} data-look="{i}"', 1)
    return svg


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    arts = build_all()
    for sid, svg in arts.items():
        svg = tag_look(sid, svg)
        p = os.path.join(OUT, f"{sid}.svg")
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(svg)
        print(f"{sid:24s} {len(svg.encode()) / 1024:5.1f} KB")
