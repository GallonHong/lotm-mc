# -*- coding: utf-8 -*-
"""
Generate every piece of original art used by the R6 addon:
  - attacker operator badges (defenders are staged from MC-R6mod)
  - gadget / misc item icons (64x64)
  - custom entity textures (64x64)
  - pack icons

All art here is drawn procedurally with Pillow, no external files required
(except the optional staged MC-R6mod logo used as pack icon backdrop).
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import r6data as D

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(ROOT, "r6_bp")
RP = os.path.join(ROOT, "r6_rp")
SOURCE = os.path.join(ROOT, "tools", "source_assets")

SS = 4  # supersampling factor

ATTACKER_BG = (249, 149, 43)
DEFENDER_BG = (25, 133, 226)
DARK = (18, 21, 26)
METAL = (86, 93, 102)
LIGHT = (222, 228, 234)
RED = (226, 62, 62)
ORANGE = (245, 148, 42)
YELLOW = (245, 214, 66)
CYAN = (11, 255, 240)
GREEN = (74, 214, 118)
PURPLE = (150, 110, 230)


def new_image(size, color=(0, 0, 0, 0)):
    return Image.new("RGBA", (size * SS, size * SS), color)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out = img.resize((img.width // SS, img.height // SS), Image.LANCZOS)
    out.save(path, "PNG")


def font(size):
    try:
        return ImageFont.load_default(size=size * SS)
    except TypeError:
        return ImageFont.load_default()


def rounded(img, box, radius, fill, outline=None, width=0):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_center(d, cx, cy, text, f, fill):
    bbox = d.textbbox((0, 0), text, font=f)
    d.text((cx - (bbox[2] - bbox[0]) / 2 - bbox[0], cy - (bbox[3] - bbox[1]) / 2 - bbox[1]),
           text, font=f, fill=fill)


# ---------------------------------------------------------------------------
# item icons
# ---------------------------------------------------------------------------
def icon_frame(size=64, accent=CYAN):
    """dark rounded card with accent border, common background for all icons"""
    img = new_image(size)
    s = size * SS
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([2 * SS, 2 * SS, s - 2 * SS, s - 2 * SS], radius=10 * SS,
                        fill=DARK + (255,), outline=(52, 60, 70, 255), width=2 * SS)
    d.rounded_rectangle([5 * SS, 5 * SS, s - 5 * SS, s - 5 * SS], radius=7 * SS,
                        outline=accent + (70,), width=1 * SS)
    return img, d


def draw_hammer(d, c):
    u = c // 64
    d.rounded_rectangle([26 * u, 14 * u, 38 * u, 52 * u], radius=3 * u, fill=METAL + (255,))
    d.rounded_rectangle([12 * u, 12 * u, 52 * u, 26 * u], radius=4 * u, fill=LIGHT + (255,))
    d.rectangle([12 * u, 18 * u, 52 * u, 21 * u], fill=METAL + (255,))


def draw_grenade(d, c, body=GREEN):
    u = c // 64
    d.ellipse([20 * u, 24 * u, 44 * u, 52 * u], fill=body + (255,), outline=DARK + (255,), width=2 * u)
    d.rounded_rectangle([26 * u, 14 * u, 38 * u, 24 * u], radius=2 * u, fill=METAL + (255,))
    d.arc([16 * u, 10 * u, 34 * u, 30 * u], 200, 340, fill=LIGHT + (255,), width=2 * u)
    d.rectangle([30 * u, 30 * u, 34 * u, 46 * u], fill=DARK + (255,))


def draw_lightning(d, c, color=YELLOW):
    u = c // 64
    pts = [(34 * u, 10 * u), (20 * u, 36 * u), (30 * u, 36 * u), (24 * u, 54 * u),
           (44 * u, 28 * u), (33 * u, 28 * u)]
    d.polygon(pts, fill=color + (255,))


def icon_sledge_hammer():
    img, d = icon_frame()
    draw_hammer(d, 64 * SS)
    return img


def icon_emp_grenade():
    img, d = icon_frame(accent=CYAN)
    draw_grenade(d, 64 * SS, body=(46, 130, 190))
    draw_lightning(d, 64 * SS)
    return img


def icon_breach_round():
    img, d = icon_frame(accent=ORANGE)
    u = SS
    d.polygon([(10 * u, 22 * u), (44 * u, 30 * u), (44 * u, 38 * u), (10 * u, 46 * u)],
              fill=ORANGE + (255,))
    d.ellipse([44 * u, 22 * u, 58 * u, 46 * u], fill=YELLOW + (255,))
    d.line([(14 * u, 34 * u), (40 * u, 34 * u)], fill=DARK + (255,), width=2 * u)
    return img


def icon_exo_charge():
    img, d = icon_frame(accent=ORANGE)
    u = SS
    d.rounded_rectangle([22 * u, 16 * u, 42 * u, 48 * u], radius=4 * u, fill=(178, 76, 30) + (255,))
    d.rectangle([22 * u, 24 * u, 42 * u, 30 * u], fill=YELLOW + (255,))
    d.polygon([(32 * u, 34 * u), (26 * u, 46 * u), (32 * u, 43 * u), (30 * u, 52 * u),
               (38 * u, 39 * u), (32 * u, 41 * u)], fill=YELLOW + (255,))
    return img


def icon_drone():
    img, d = icon_frame(accent=CYAN)
    u = SS
    d.ellipse([26 * u, 26 * u, 38 * u, 38 * u], fill=METAL + (255,), outline=LIGHT + (255,), width=2 * u)
    for (x, y) in ((14, 18), (50, 18), (14, 46), (50, 46)):
        d.ellipse([(x - 6) * u, (y - 6) * u, (x + 6) * u, (y + 6) * u], outline=CYAN + (255,), width=2 * u)
        d.line([(32 * u, 32 * u), (x * u, y * u)], fill=METAL + (255,), width=2 * u)
    d.ellipse([30 * u, 30 * u, 34 * u, 34 * u], fill=RED + (255,))
    return img


def icon_shield():
    img, d = icon_frame(accent=CYAN)
    u = SS
    d.polygon([(32 * u, 10 * u), (52 * u, 18 * u), (49 * u, 40 * u), (32 * u, 54 * u),
               (15 * u, 40 * u), (12 * u, 18 * u)], fill=(60, 92, 120) + (255,),
              outline=LIGHT + (255,))
    d.line([(32 * u, 16 * u), (32 * u, 48 * u)], fill=LIGHT + (255,), width=2 * u)
    return img


def icon_thermal():
    img, d = icon_frame(accent=RED)
    u = SS
    d.ellipse([14 * u, 14 * u, 50 * u, 50 * u], outline=METAL + (255,), width=4 * u)
    d.ellipse([22 * u, 22 * u, 42 * u, 42 * u], fill=(200, 60, 40) + (255,))
    d.ellipse([27 * u, 27 * u, 37 * u, 37 * u], fill=YELLOW + (255,))
    d.ellipse([30 * u, 30 * u, 34 * u, 34 * u], fill=LIGHT + (255,))
    return img


def icon_cluster_charge():
    img, d = icon_frame(accent=ORANGE)
    u = SS
    d.rounded_rectangle([22 * u, 14 * u, 42 * u, 50 * u], radius=4 * u, fill=(120, 110, 70) + (255,))
    for (x, y) in ((28, 25), (36, 25), (32, 33), (28, 41), (36, 41)):
        d.ellipse([(x - 3) * u, (y - 3) * u, (x + 3) * u, (y + 3) * u], fill=ORANGE + (255,))
    return img


def icon_flash():
    img, d = icon_frame(accent=YELLOW)
    u = SS
    cx = cy = 32
    pts = []
    import math
    for i in range(16):
        r = 24 if i % 2 == 0 else 9
        a = math.pi * 2 * i / 16
        pts.append(((cx + r * math.cos(a)) * u, (cy + r * math.sin(a)) * u))
    d.polygon(pts, fill=YELLOW + (255,))
    d.ellipse([28 * u, 28 * u, 36 * u, 36 * u], fill=LIGHT + (255,))
    return img


def icon_scanner():
    img, d = icon_frame(accent=CYAN)
    u = SS
    d.pieslice([8 * u, 8 * u, 56 * u, 56 * u], 200, 340, outline=CYAN + (255,), width=3 * u)
    d.pieslice([18 * u, 18 * u, 46 * u, 46 * u], 200, 340, outline=CYAN + (150,), width=2 * u)
    d.ellipse([30 * u, 30 * u, 34 * u, 34 * u], fill=CYAN + (255,))
    d.line([(32 * u, 32 * u), (26 * u, 20 * u)], fill=CYAN + (255,), width=2 * u)
    return img


def icon_frag():
    img, d = icon_frame(accent=GREEN)
    draw_grenade(d, 64 * SS, body=(70, 90, 70))
    return img


def icon_gas():
    img, d = icon_frame(accent=GREEN)
    u = SS
    d.rounded_rectangle([24 * u, 18 * u, 40 * u, 50 * u], radius=5 * u, fill=(90, 140, 70) + (255,))
    d.rectangle([28 * u, 12 * u, 36 * u, 20 * u], fill=METAL + (255,))
    for (x, y, r) in ((22, 22, 7), (42, 24, 6), (22, 40, 5), (42, 42, 7)):
        d.ellipse([(x - r) * u, (y - r) * u, (x + r) * u, (y + r) * u], fill=(120, 220, 120, 90))
    return img


def icon_jammer():
    img, d = icon_frame(accent=RED)
    u = SS
    d.line([(32 * u, 50 * u), (32 * u, 26 * u)], fill=METAL + (255,), width=3 * u)
    d.ellipse([27 * u, 18 * u, 37 * u, 28 * u], fill=RED + (255,))
    d.arc([16 * u, 12 * u, 48 * u, 40 * u], 210, 330, fill=RED + (120,), width=2 * u)
    d.line([(18 * u, 16 * u), (46 * u, 46 * u)], fill=RED + (255,), width=3 * u)
    return img


def icon_panel():
    img, d = icon_frame(accent=CYAN)
    u = SS
    d.rounded_rectangle([16 * u, 10 * u, 48 * u, 54 * u], radius=4 * u, fill=(66, 74, 86) + (255,),
                        outline=LIGHT + (255,))
    for (x, y) in ((22, 16), (42, 16), (22, 48), (42, 48)):
        d.ellipse([(x - 2) * u, (y - 2) * u, (x + 2) * u, (y + 2) * u], fill=LIGHT + (255,))
    d.line([(20 * u, 26 * u), (44 * u, 26 * u)], fill=(120, 130, 145) + (255,), width=2 * u)
    return img


def icon_cardiac():
    img, d = icon_frame(accent=RED)
    u = SS
    d.polygon([(32 * u, 52 * u), (12 * u, 32 * u), (12 * u, 22 * u), (22 * u, 14 * u),
               (32 * u, 22 * u), (42 * u, 14 * u), (52 * u, 22 * u), (52 * u, 32 * u)],
              fill=(180, 40, 60) + (255,))
    d.line([(10 * u, 34 * u), (22 * u, 34 * u), (26 * u, 26 * u), (32 * u, 42 * u),
            (38 * u, 30 * u), (42 * u, 34 * u), (54 * u, 34 * u)], fill=LIGHT + (255,), width=2 * u)
    return img


def icon_stim():
    img, d = icon_frame(accent=GREEN)
    u = SS
    d.line([(18 * u, 46 * u), (46 * u, 18 * u)], fill=LIGHT + (255,), width=7 * u)
    d.polygon([(46 * u, 18 * u), (56 * u, 8 * u), (52 * u, 22 * u), (38 * u, 36 * u)],
              fill=METAL + (255,))
    d.rectangle([22 * u, 40 * u, 30 * u, 48 * u], fill=GREEN + (255,))
    d.ellipse([14 * u, 42 * u, 22 * u, 50 * u], fill=GREEN + (255,))
    return img


def icon_armor_pack():
    img, d = icon_frame(accent=CYAN)
    u = SS
    d.rounded_rectangle([14 * u, 16 * u, 50 * u, 48 * u], radius=5 * u, fill=(52, 78, 100) + (255,),
                        outline=LIGHT + (255,))
    d.rectangle([30 * u, 24 * u, 34 * u, 40 * u], fill=LIGHT + (255,))
    d.rectangle([22 * u, 30 * u, 42 * u, 34 * u], fill=LIGHT + (255,))
    return img


def icon_kapkan():
    img, d = icon_frame(accent=RED)
    u = SS
    d.rounded_rectangle([20 * u, 34 * u, 44 * u, 50 * u], radius=4 * u, fill=METAL + (255,))
    d.line([(32 * u, 34 * u), (32 * u, 18 * u)], fill=METAL + (255,), width=3 * u)
    d.line([(14 * u, 24 * u), (50 * u, 24 * u)], fill=RED + (255,), width=2 * u)
    d.line([(14 * u, 24 * u), (14 * u, 40 * u)], fill=RED + (200,), width=1 * u)
    d.line([(50 * u, 24 * u), (50 * u, 40 * u)], fill=RED + (200,), width=1 * u)
    d.ellipse([29 * u, 15 * u, 35 * u, 21 * u], fill=RED + (255,))
    return img


def icon_turret():
    img, d = icon_frame(accent=ORANGE)
    u = SS
    d.rounded_rectangle([14 * u, 44 * u, 50 * u, 54 * u], radius=3 * u, fill=METAL + (255,))
    d.rectangle([28 * u, 30 * u, 36 * u, 46 * u], fill=LIGHT + (255,))
    d.rectangle([32 * u, 18 * u, 56 * u, 24 * u], fill=METAL + (255,))
    d.ellipse([26 * u, 26 * u, 38 * u, 38 * u], fill=(90, 100, 70) + (255,))
    return img


def icon_ads():
    img, d = icon_frame(accent=CYAN)
    u = SS
    d.pieslice([12 * u, 20 * u, 52 * u, 60 * u], 180, 360, fill=(70, 90, 110) + (255,))
    d.rectangle([12 * u, 40 * u, 52 * u, 50 * u], fill=(70, 90, 110) + (255,))
    d.ellipse([28 * u, 32 * u, 36 * u, 40 * u], fill=RED + (255,))
    for x in (18, 46):
        d.ellipse([(x - 2) * u, 44 * u, (x + 2) * u, 48 * u], fill=CYAN + (255,))
    return img


def icon_battery():
    img, d = icon_frame(accent=YELLOW)
    u = SS
    d.rounded_rectangle([18 * u, 18 * u, 46 * u, 50 * u], radius=4 * u, fill=(88, 96, 60) + (255,),
                        outline=LIGHT + (255,))
    d.rectangle([30 * u, 12 * u, 34 * u, 19 * u], fill=METAL + (255,))
    d.polygon([(36 * u, 24 * u), (26 * u, 38 * u), (32 * u, 38 * u), (28 * u, 46 * u),
               (40 * u, 32 * u), (34 * u, 32 * u)], fill=YELLOW + (255,))
    return img


def icon_nitro():
    img, d = icon_frame(accent=RED)
    u = SS
    d.rounded_rectangle([14 * u, 22 * u, 50 * u, 46 * u], radius=3 * u, fill=(60, 66, 74) + (255,))
    for x in (22, 32, 42):
        d.ellipse([(x - 2) * u, 32 * u, (x + 2) * u, 36 * u], fill=RED + (255,))
    d.line([(18 * u, 22 * u), (14 * u, 12 * u)], fill=YELLOW + (255,), width=2 * u)
    return img


def icon_tablet():
    img, d = icon_frame(accent=ORANGE)
    u = SS
    d.rounded_rectangle([14 * u, 10 * u, 50 * u, 54 * u], radius=5 * u, fill=(30, 36, 44) + (255,),
                        outline=LIGHT + (255,))
    d.rectangle([18 * u, 16 * u, 46 * u, 44 * u], fill=(20, 90, 120) + (255,))
    text_center(d, 32 * u, 30 * u, "R6", font(20), LIGHT + (255,))
    d.ellipse([29 * u, 47 * u, 35 * u, 51 * u], fill=LIGHT + (255,))
    return img


def icon_defuser():
    img, d = icon_frame(accent=GREEN)
    u = SS
    d.rounded_rectangle([12 * u, 20 * u, 52 * u, 48 * u], radius=4 * u, fill=(52, 60, 70) + (255,),
                        outline=LIGHT + (255,))
    d.rectangle([18 * u, 26 * u, 30 * u, 32 * u], fill=GREEN + (255,))
    for i, col in enumerate((RED, YELLOW, CYAN)):
        d.line([(36 * u, (26 + i * 5) * u), (48 * u, (30 + i * 4) * u)], fill=col + (255,), width=2 * u)
    return img


def icon_reinforce():
    img, d = icon_frame(accent=CYAN)
    u = SS
    d.rectangle([14 * u, 12 * u, 50 * u, 52 * u], fill=(66, 74, 86, 255), outline=LIGHT + (255,))
    d.line([(16 * u, 16 * u), (48 * u, 48 * u)], fill=(150, 160, 175, 255), width=3 * u)
    d.line([(48 * u, 16 * u), (16 * u, 48 * u)], fill=(150, 160, 175, 255), width=3 * u)
    for (x, y) in ((17, 15), (47, 15), (17, 49), (47, 49)):
        d.ellipse([x * u, y * u, (x + 3) * u, (y + 3) * u], fill=LIGHT + (255,))
    return img


def icon_barricade():
    img, d = icon_frame(accent=ORANGE)
    u = SS
    # plank wall
    d.rectangle([14 * u, 12 * u, 50 * u, 52 * u], fill=(139, 90, 43, 255), outline=(92, 58, 28, 255),
                width=2 * u)
    for y in (22, 32, 42):
        d.line([(14 * u, y * u), (50 * u, y * u)], fill=(92, 58, 28, 255), width=2 * u)
    # braces
    d.line([(16 * u, 16 * u), (48 * u, 48 * u)], fill=(111, 70, 32, 255), width=3 * u)
    d.line([(48 * u, 16 * u), (16 * u, 48 * u)], fill=(111, 70, 32, 255), width=3 * u)
    for (x, y) in ((17, 15), (46, 15), (17, 48), (46, 48)):
        d.ellipse([x * u, y * u, (x + 3) * u, (y + 3) * u], fill=(190, 195, 200, 255))
    return img


ICON_BUILDERS = {
    "sledge_hammer": icon_sledge_hammer,
    "emp_grenade": icon_emp_grenade,
    "breach_round": icon_breach_round,
    "exo_charge": icon_exo_charge,
    "drone": icon_drone,
    "shield": icon_shield,
    "thermal": icon_thermal,
    "cluster_charge": icon_cluster_charge,
    "flash": icon_flash,
    "scanner": icon_scanner,
    "frag": icon_frag,
    "gas": icon_gas,
    "jammer": icon_jammer,
    "panel": icon_panel,
    "cardiac": icon_cardiac,
    "stim": icon_stim,
    "armor_pack": icon_armor_pack,
    "kapkan": icon_kapkan,
    "turret": icon_turret,
    "ads": icon_ads,
    "battery": icon_battery,
    "nitro": icon_nitro,
    "tablet": icon_tablet,
    "defuser": icon_defuser,
    "reinforce": icon_reinforce,
    "barricade": icon_barricade,
}


def gen_item_icons():
    used = set()
    for g in D.GADGETS.values():
        used.add(g["icon"])
    for m in D.MISC_ITEMS.values():
        used.add(m["icon"])
    missing = used - set(ICON_BUILDERS)
    if missing:
        raise SystemExit("missing icon builders: %s" % sorted(missing))
    for name in sorted(used):
        img = ICON_BUILDERS[name]()
        save(img, os.path.join(RP, "textures", "items",
                              "gadgets" if name not in ("tablet", "defuser") else "misc",
                              name + ".png"))


# ---------------------------------------------------------------------------
# operator badges (generated for attackers; defenders come from MC-R6mod)
# ---------------------------------------------------------------------------
def gen_operator_badges():
    for op in D.OPERATORS:
        if op["icon_source"] == "repo":
            continue
        size = 52
        img = new_image(size)
        u = size * SS
        d = ImageDraw.Draw(img)
        bg = ATTACKER_BG if op["side"] == "attacker" else DEFENDER_BG
        # frame
        d.rectangle([0, 0, u, u], fill=(120, 124, 128, 255))
        d.rectangle([2 * SS, 2 * SS, u - 2 * SS, u - 2 * SS], fill=(70, 72, 76, 255))
        d.rectangle([6 * SS, 6 * SS, u - 6 * SS, u - 6 * SS], fill=bg + (255,))
        # diagonal stripes
        for i in range(-2, 8):
            x = i * 8 * SS
            d.line([(x, u), (x + 20 * SS, 0)], fill=(255, 255, 255, 26), width=2 * SS)
        # emblem: operator initial
        text = op["name"][0].upper()
        if op["name"] == "JÄGER":
            text = "J"
        f = font(24)
        d.text((u / 2, u / 2), text, font=f, fill=(22, 24, 28, 255), anchor="mm")
        # small corner notches
        d.rectangle([6 * SS, 6 * SS, u - 6 * SS, 10 * SS], fill=(0, 0, 0, 70))
        save(img, os.path.join(RP, "textures", "items", "badges", op["id"] + ".png"))


# ---------------------------------------------------------------------------
# entity textures
# ---------------------------------------------------------------------------
def entity_texture(geo, draw_fn):
    size = 128
    img = new_image(size)
    d = ImageDraw.Draw(img)
    draw_fn(d, size * SS)
    save(img, os.path.join(RP, "textures", "entity", "r6", geo + ".png"))


def ent_bomb(d, u):
    d.rectangle([0, 0, u, u], fill=(44, 46, 52, 255))
    d.rectangle([8 * u // 64 * 1, 8, 56 * u // 64, 56 * u // 64], fill=(58, 60, 68, 255))
    d.rounded_rectangle([18 * u // 64, 26 * u // 64, 46 * u // 64, 44 * u // 64], radius=2 * u // 64,
                        fill=(30, 31, 35, 255))
    d.rectangle([22 * u // 64, 30 * u // 64, 42 * u // 64, 34 * u // 64], fill=(226, 62, 62, 255))
    d.ellipse([30 * u // 64, 12 * u // 64, 34 * u // 64, 16 * u // 64], fill=(245, 214, 66, 255))


def ent_drone(d, u):
    d.rectangle([0, 0, u, u], fill=(52, 56, 62, 255))
    d.ellipse([24 * u // 64, 24 * u // 64, 40 * u // 64, 40 * u // 64], fill=(90, 96, 104, 255))
    d.ellipse([29 * u // 64, 29 * u // 64, 35 * u // 64, 35 * u // 64], fill=(226, 62, 62, 255))
    d.line([(6 * u // 64, 6 * u // 64), (58 * u // 64, 58 * u // 64)], fill=(30, 32, 36, 255), width=3)
    d.line([(58 * u // 64, 6 * u // 64), (6 * u // 64, 58 * u // 64)], fill=(30, 32, 36, 255), width=3)


def ent_shield(d, u):
    d.rectangle([0, 0, u, u], fill=(64, 72, 84, 255))
    d.rectangle([6 * u // 64, 6 * u // 64, 58 * u // 64, 58 * u // 64], fill=(84, 96, 112, 255))
    d.rectangle([14 * u // 64, 12 * u // 64, 50 * u // 64, 26 * u // 64], fill=(30, 40, 52, 255))
    d.rectangle([14 * u // 64, 12 * u // 64, 50 * u // 64, 15 * u // 64], fill=(120, 200, 230, 255))
    d.rectangle([28 * u // 64, 36 * u // 64, 36 * u // 64, 50 * u // 64], fill=(60, 68, 78, 255))


def ent_panel(d, u):
    d.rectangle([0, 0, u, u], fill=(66, 60, 50, 255))
    d.rectangle([4 * u // 64, 4 * u // 64, 60 * u // 64, 60 * u // 64], fill=(96, 88, 72, 255))
    for y in range(10, 58, 8):
        d.rectangle([8 * u // 64, y * u // 64, 56 * u // 64, (y + 2) * u // 64], fill=(60, 55, 46, 255))
    for (x, y) in ((8, 8), (54, 8), (8, 54), (54, 54)):
        d.ellipse([x * u // 64, y * u // 64, (x + 3) * u // 64, (y + 3) * u // 64], fill=(180, 180, 180, 255))


def ent_jammer(d, u):
    d.rectangle([0, 0, u, u], fill=(34, 36, 40, 255))
    d.rectangle([20 * u // 64, 20 * u // 64, 44 * u // 64, 52 * u // 64], fill=(54, 58, 64, 255))
    d.ellipse([28 * u // 64, 8 * u // 64, 36 * u // 64, 16 * u // 64], fill=(226, 62, 62, 255))
    d.rectangle([22 * u // 64, 42 * u // 64, 42 * u // 64, 46 * u // 64], fill=(74, 214, 118, 255))


def ent_ads(d, u):
    d.rectangle([0, 0, u, u], fill=(48, 52, 58, 255))
    d.ellipse([10 * u // 64, 18 * u // 64, 54 * u // 64, 54 * u // 64], fill=(76, 84, 94, 255))
    d.ellipse([24 * u // 64, 26 * u // 64, 40 * u // 64, 42 * u // 64], fill=(226, 62, 62, 255))
    d.ellipse([29 * u // 64, 31 * u // 64, 35 * u // 64, 37 * u // 64], fill=(11, 255, 240, 255))


def ent_battery(d, u):
    d.rectangle([0, 0, u, u], fill=(60, 66, 44, 255))
    d.rectangle([8 * u // 64, 16 * u // 64, 56 * u // 64, 48 * u // 64], fill=(88, 96, 60, 255))
    d.polygon([(36 * u // 64, 20 * u // 64), (22 * u // 64, 34 * u // 64), (30 * u // 64, 34 * u // 64),
               (26 * u // 64, 44 * u // 64), (42 * u // 64, 28 * u // 64), (33 * u // 64, 28 * u // 64)],
              fill=(245, 214, 66, 255))


def ent_kapkan(d, u):
    d.rectangle([0, 0, u, u], fill=(40, 42, 46, 255))
    d.rectangle([18 * u // 64, 30 * u // 64, 46 * u // 64, 52 * u // 64], fill=(66, 70, 78, 255))
    d.line([(8 * u // 64, 20 * u // 64), (56 * u // 64, 20 * u // 64)], fill=(226, 62, 62, 255), width=2)
    d.ellipse([29 * u // 64, 24 * u // 64, 35 * u // 64, 30 * u // 64], fill=(226, 62, 62, 255))


def ent_turret(d, u):
    d.rectangle([0, 0, u, u], fill=(52, 56, 48, 255))
    d.rectangle([10 * u // 64, 44 * u // 64, 54 * u // 64, 56 * u // 64], fill=(66, 72, 58, 255))
    d.rectangle([26 * u // 64, 26 * u // 64, 38 * u // 64, 48 * u // 64], fill=(86, 92, 78, 255))
    d.rectangle([34 * u // 64, 18 * u // 64, 60 * u // 64, 24 * u // 64], fill=(60, 64, 54, 255))


def ent_armor_pack(d, u):
    d.rectangle([0, 0, u, u], fill=(44, 62, 78, 255))
    d.rounded_rectangle([10 * u // 64, 14 * u // 64, 54 * u // 64, 50 * u // 64], radius=3 * u // 64,
                        fill=(58, 84, 106, 255))
    d.rectangle([30 * u // 64, 22 * u // 64, 34 * u // 64, 42 * u // 64], fill=(200, 210, 220, 255))
    d.rectangle([22 * u // 64, 30 * u // 64, 42 * u // 64, 34 * u // 64], fill=(200, 210, 220, 255))


def ent_exo(d, u):
    d.rectangle([0, 0, u, u], fill=(70, 48, 36, 255))
    d.rectangle([14 * u // 64, 12 * u // 64, 50 * u // 64, 52 * u // 64], fill=(120, 64, 40, 255))
    d.rectangle([14 * u // 64, 22 * u // 64, 50 * u // 64, 28 * u // 64], fill=(245, 214, 66, 255))
    d.rectangle([26 * u // 64, 34 * u // 64, 38 * u // 64, 46 * u // 64], fill=(245, 148, 42, 255))


def ent_cluster(d, u):
    d.rectangle([0, 0, u, u], fill=(60, 58, 40, 255))
    d.rectangle([14 * u // 64, 12 * u // 64, 50 * u // 64, 52 * u // 64], fill=(96, 92, 62, 255))
    for (x, y) in ((24, 22), (40, 22), (32, 30), (24, 40), (40, 40)):
        d.ellipse([(x - 3) * u // 64, (y - 3) * u // 64, (x + 3) * u // 64, (y + 3) * u // 64],
                  fill=(245, 148, 42, 255))


ENTITY_BUILDERS = {
    "bomb": ent_bomb, "drone": ent_drone, "shield": ent_shield, "panel": ent_panel,
    "jammer": ent_jammer, "ads": ent_ads, "battery": ent_battery, "kapkan": ent_kapkan,
    "turret": ent_turret, "armor_pack": ent_armor_pack, "exo": ent_exo, "cluster": ent_cluster,
}


def gen_entity_textures():
    for geo, fn in ENTITY_BUILDERS.items():
        entity_texture(geo, fn)


# ---------------------------------------------------------------------------
# custom block textures
# ---------------------------------------------------------------------------
def block_wood_barricade(img, u):
    size = u  # u = size*SS, draw in normalized pixels via px()
    def px(v): return int(v * size / 32)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, size, size], fill=(139, 90, 43, 255))
    # horizontal planks
    for y in (0, 10, 20, 30):
        d.rectangle([0, px(y), size, px(y + 9)], fill=(150, 98, 48, 255))
        d.rectangle([0, px(y + 9), size, px(y + 10)], fill=(92, 58, 28, 255))
    # vertical frame boards
    d.rectangle([px(2), 0, px(6), size], fill=(111, 70, 32, 255))
    d.rectangle([px(26), 0, px(30), size], fill=(111, 70, 32, 255))
    # diagonal braces
    d.line([(px(6), px(6)), (px(26), px(26))], fill=(120, 76, 36, 255), width=px(2))
    d.line([(px(26), px(6)), (px(6), px(26))], fill=(120, 76, 36, 255), width=px(2))
    # nails
    for (x, y) in ((4, 3), (28, 3), (4, 28), (28, 28)):
        d.ellipse([px(x - 1), px(y - 1), px(x + 1), px(y + 1)], fill=(190, 195, 200, 255))
    # grain scratches
    for i in range(0, 6):
        d.line([(px(7), px(2 + i * 5)), (px(15), px(3 + i * 5))], fill=(130, 84, 40, 255))


def block_steel_frame(img, u):
    size = u
    def px(v): return int(v * size / 64)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, size, size], fill=(104, 114, 126, 255))
    for i in range(0, size, px(8)):
        d.line([(0, i), (size, i)], fill=(92, 101, 112, 255), width=px(1))
    for i in range(0, size, px(8)):
        d.line([(i, 0), (i, size)], fill=(120, 130, 142, 255), width=px(1))
    # rivets
    for x in range(px(4), size, px(10)):
        for y in range(px(4), size, px(10)):
            d.ellipse([x, y, x + px(2), y + px(2)], fill=(60, 68, 78, 255))
            d.ellipse([x, y, x + px(1), y + px(1)], fill=(160, 170, 182, 255))
    # weld highlights
    d.line([(0, px(2)), (size, px(2))], fill=(150, 160, 172, 255), width=px(1))
    d.line([(0, size - px(3)), (size, size - px(3))], fill=(84, 92, 102, 255), width=px(2))


BLOCK_BUILDERS = {
    "wood_barricade": (32, block_wood_barricade),
    "steel_frame": (64, block_steel_frame),
}


def gen_block_textures():
    for name, (size, fn) in BLOCK_BUILDERS.items():
        img = new_image(size)
        fn(img, size * SS)
        target = os.path.join(RP, "textures", "blocks", name + ".png")
        os.makedirs(os.path.dirname(target), exist_ok=True)
        img.resize((size, size), Image.NEAREST).save(target, "PNG")


# ---------------------------------------------------------------------------
# pack icons
# ---------------------------------------------------------------------------
def gen_pack_icons():
    size = 128
    img = Image.new("RGBA", (size * SS, size * SS), (14, 16, 20, 255))
    d = ImageDraw.Draw(img)
    u = size * SS
    # diagonal accent bands
    for i in range(0, 12):
        x = i * 12 * SS
        d.line([(x, u), (x + u * 0.5, 0)], fill=(30, 36, 46, 255), width=6 * SS)
    # shield emblem
    d.polygon([(34 * SS, 10 * SS), (86 * SS, 22 * SS), (82 * SS, 66 * SS), (60 * SS, 84 * SS),
               (38 * SS, 66 * SS), (34 * SS, 22 * SS)], fill=(25, 133, 226, 255),
              outline=(240, 244, 248, 255))
    d.polygon([(40 * SS, 20 * SS), (80 * SS, 30 * SS), (77 * SS, 62 * SS), (60 * SS, 76 * SS),
               (43 * SS, 62 * SS), (40 * SS, 30 * SS)], fill=(18, 32, 48, 255))
    text_center(d, 60 * SS, 48 * SS, "R6", font(30), (249, 149, 43, 255))
    text_center(d, 64 * SS, 102 * SS, "MINESIEGE", font(14), (222, 228, 234, 255))
    text_center(d, 64 * SS, 116 * SS, "BEDROCK", font(10), (140, 150, 162, 255))
    for target in (os.path.join(BP, "pack_icon.png"), os.path.join(RP, "pack_icon.png")):
        os.makedirs(os.path.dirname(target), exist_ok=True)
        img.resize((size, size), Image.LANCZOS).save(target, "PNG")


def main():
    gen_item_icons()
    gen_operator_badges()
    gen_entity_textures()
    gen_block_textures()
    gen_pack_icons()
    print("generated %d item icons, %d badges, %d entity textures, pack icons" % (
        len(ICON_BUILDERS), sum(1 for o in D.OPERATORS if o["icon_source"] != "repo"),
        len(ENTITY_BUILDERS)))


if __name__ == "__main__":
    main()
