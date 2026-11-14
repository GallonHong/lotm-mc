# -*- coding: utf-8 -*-
"""
Import third-party *art* (never code) into the R6 addon resource pack.

Sources
-------
1. addons/development/test_guns_2d_addon  (local, repository owned)
   - 3D weapon geometry / textures / hold animations / shoot sounds / throwable SFX
2. tools/source_assets/operator_icons     (staged from USS-Shenzhou/MC-R6mod, CC BY-NC-SA 4.0)
   - operator emblem icons + mod logo

The addon stays self-contained: nothing here is loaded from another pack at runtime.
Generated files are marked AUTO-GENERATED and are reproducible with:
    python tools/import_assets.py
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import r6data as D

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BP = os.path.join(ROOT, "r6_bp")
RP = os.path.join(ROOT, "r6_rp")
TOOLS = os.path.join(ROOT, "tools")
SOURCE = os.path.join(ROOT, "tools", "source_assets")

TEST_GUNS_RP = os.path.abspath(os.path.join(ROOT, "..", "test_guns_2d_addon", "test_guns_rp"))
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))

# other local reference packs this addon borrows sound effects from
SOURCE_ROOTS = {
    "test_guns": TEST_GUNS_RP,
    "ace": os.path.join(REPO, "addons", "reference", "ACE战斗装备1.0测试", "Akiohh'sCo R"),
    "apex": os.path.join(REPO, "addons", "reference", "apex_firearms_addon", "apex_firearms_rp"),
    "deadzone": os.path.join(REPO, "addons", "reference", "V1.6.6-1DeadZone", "DeadZzoneRp"),
    "apoc_life": os.path.join(REPO, "addons", "development", "apocalypse_life_addon", "apocalypse_life_rp"),
    "boss": os.path.join(REPO, "addons", "development", "apocalypse_boss_addon", "apocalypse_boss_rp"),
    "purizumu": os.path.join(REPO, "addons", "reference",
                             "【Stable26-09】天圆引擎正式版Purizumu_CE_Addons",
                             "Purizumu_CE_Addons_resource_packs"),
    "oldass": os.path.join(REPO, "addons", "reference", "OldAssGunA", "OldAssGunA R"),
    "ranzie": os.path.join(REPO, "addons", "reference", "Ranzie Rise and Survive 1.2", "res"),
}

# sound id -> (category, volume, [(root, relative file, pitch), ...])
EXTRA_SOUNDS = [
    ("r6.flash", "player", 1.0, [("test_guns", "sounds/guns/flashbang.ogg", 1.0)]),
    ("r6.explosion", "block", 1.0, [
        ("test_guns", f"sounds/explosions/artillery_explode{i}.ogg", 1.0) for i in range(1, 5)
    ]),
    ("r6.knife_slash", "player", 0.9, [
        ("test_guns", "sounds/melee/knife_slash1.ogg", 1.0),
        ("test_guns", "sounds/melee/knife_slash2.ogg", 1.0),
    ]),
    ("r6.knife_hit", "player", 1.0, [("test_guns", "sounds/melee/knife_hit1.ogg", 1.0)]),
    ("r6.reload_start", "player", 0.85, [("ace", "sounds/gun/scar/scar_mag_out.ogg", 1.0)]),
    ("r6.reload_end", "player", 0.9, [("ace", "sounds/gun/scar/scar_mag_in_v01.ogg", 1.0)]),
    ("r6.reload_pistol_start", "player", 0.8, [("ace", "sounds/gun/glock/glock_mag_out.ogg", 1.0)]),
    ("r6.reload_pistol_end", "player", 0.85, [("ace", "sounds/gun/glock/glock_mag_in.ogg", 1.0)]),
    ("r6.dry_fire", "player", 0.9, [("apex", "sounds/guns/dry.ogg", 1.0)]),
    ("r6.weapon_draw", "player", 0.8, [("ace", "sounds/gun/glock/glock_draw.ogg", 1.0)]),
    ("r6.hit_flesh", "player", 0.75, [("apex", "sounds/guns/hit_flesh.ogg", 1.0)]),
    ("r6.hit_metal", "player", 0.7, [("apex", "sounds/guns/hit_metal.ogg", 1.0)]),
    ("r6.hit_head", "player", 0.9, [("ace", "sounds/gun/gun_hit.ogg", 1.15)]),
    ("r6.sledge", "block", 1.0, [("boss", "sounds/bf/bossesrise/abomination/smash_impact.ogg", 1.0)]),
    ("r6.barricade_place", "block", 0.9, [("oldass", "sounds/music/step_jump_wood_solid_01.ogg", 0.8)]),
    ("r6.barricade_break", "block", 1.0, [("ranzie", "sounds/mob/zombie/woodbreak.ogg", 1.0)]),
    ("r6.gadget_deploy", "player", 0.9, [("purizumu", "sounds/weapon/gun/alter/alter_deploy.ogg", 1.0)]),
    ("r6.shield_deploy", "player", 1.0, [("purizumu", "sounds/weapon/gun/eva8/deploy.ogg", 1.0)]),
    ("r6.gas", "block", 1.0, [("ace", "sounds/smoke_attractor.ogg", 1.0)]),
    ("r6.stim", "player", 1.0, [("apoc_life", "sounds/drones/healing2.ogg", 1.0)]),
    ("r6.ping", "player", 0.9, [("deadzone", "sounds/guns/reload/other/ping.ogg", 1.0)]),
    ("r6.emp", "block", 1.0, [("apex", "sounds/guns/arc_hit.ogg", 1.0)]),
    ("r6.jammer", "block", 0.8, [("deadzone", "sounds/radio/static.ogg", 1.0)]),
    ("r6.beep", "player", 0.8, [("ace", "sounds/gun/mosin/mosin_clip_ping.ogg", 1.0)]),
    ("r6.drone", "neutral", 0.8, [("apoc_life", "sounds/drones/ground_drone_idle.ogg", 1.0)]),
    ("r6.armor_plate", "player", 0.9, [("ace", "sounds/attachment/extended_mag_install.ogg", 1.0)]),
    ("r6.ui_click", "ui", 0.8, [("ace", "sounds/gun/gun_click.ogg", 1.0)]),
    ("r6.ui_hover", "ui", 0.6, [("ace", "sounds/gun/hb/hb_click.ogg", 1.2)]),
    ("r6.defuse_tick", "player", 0.7, [("ace", "sounds/lockpick.ogg", 1.0)]),
]

# our art key -> item id inside the source addon
ART_TO_SOURCE_ITEM = {
    "arx": "arx", "scarh": "scarh", "ak47": "ak47", "ak74u": "ak74u", "svd": "svd",
    "mp5k_relay": "mp5k_relay", "bizon": "bizon", "vector": "vector", "p90": "p90",
    "pkm": "pkm", "rpk": "rpk", "m870": "shotgun", "m1014": "m1014",
    "usas12": "usas12", "glock": "glock", "deagle": "deagle",
    "riot_shield": "riot_shield", "flash_shield": "flash_shield",
}


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def load_json(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def copy_file(src, dst_rel):
    if not os.path.isfile(src):
        raise FileNotFoundError("missing source asset: " + src)
    dst = os.path.join(RP, dst_rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)
    return dst


def build_geo_index():
    """geometry identifier -> source file path"""
    index = {}
    base = os.path.join(TEST_GUNS_RP, "models")
    for dirpath, _dirnames, filenames in os.walk(base):
        for fn in filenames:
            if not fn.endswith(".json"):
                continue
            p = os.path.join(dirpath, fn)
            try:
                data = load_json(p)
            except Exception:
                continue
            for geo in data.get("minecraft:geometry", []):
                ident = geo.get("description", {}).get("identifier")
                if ident:
                    index[ident] = p
    return index


def build_item_texture_index():
    p = os.path.join(TEST_GUNS_RP, "textures", "item_texture.json")
    data = load_json(p)
    out = {}
    for key, val in data.get("texture_data", {}).items():
        tex = val.get("textures")
        if isinstance(tex, str):
            out[key] = tex
    return out


def copy_r6mod_assets():
    """Copy every MC-R6mod art / licence file that is not already used as a badge."""
    staged = os.path.join(SOURCE, "r6mod")
    assets = os.path.join(staged, "assets", "r6ms")
    if not os.path.isdir(assets):
        print("  ! staged MC-R6mod resources missing, skipped")
        return 0
    ui_dir = os.path.join(RP, "textures", "ui", "r6mod")
    if os.path.isdir(ui_dir):
        shutil.rmtree(ui_dir)  # always rebuild so renamed upstream paths never linger
    count = 0
    gui_count = 0
    item_count = 0
    icon_count = 0
    gui = os.path.join(assets, "textures", "gui")
    for dirpath, _dirnames, filenames in os.walk(gui):
        for fn in filenames:
            if not fn.endswith(".png"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, fn), assets).replace(os.sep, "/")
            if "operator_icon52" in rel:
                # the 12 used emblems are also imported as badge item icons; keep a
                # complete raw copy of the upstream icon set for traceability
                name = os.path.basename(fn)
                copy_file(os.path.join(dirpath, fn), f"textures/ui/r6mod/operator_icons/{name}")
                icon_count += 1
                continue
            rel = rel[len("textures/"):] if rel.startswith("textures/") else rel
            copy_file(os.path.join(dirpath, fn), f"textures/ui/r6mod/{rel}")
            gui_count += 1
    item_tex = os.path.join(assets, "textures", "item")
    for dirpath, _dirnames, filenames in os.walk(item_tex):
        for fn in filenames:
            if not fn.endswith(".png"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, fn), assets).replace(os.sep, "/")
            rel = rel[len("textures/"):] if rel.startswith("textures/") else rel
            copy_file(os.path.join(dirpath, fn), f"textures/ui/r6mod/{rel}")
            item_count += 1
    logo = os.path.join(staged, "logo128.png")
    if os.path.isfile(logo):
        copy_file(logo, "textures/ui/r6mod/logo128.png")
        count += 1

    # licences + upstream data kept for attribution / traceability
    docs = os.path.join(ROOT, "docs")
    lic_dir = os.path.join(docs, "licenses")
    ref_dir = os.path.join(docs, "reference")
    os.makedirs(lic_dir, exist_ok=True)
    os.makedirs(ref_dir, exist_ok=True)
    for src_name, dst_name in (("LICENSE", "MC-R6mod_LICENSE.txt"),
                               ("LICENSE.FOR_ASSETS", "MC-R6mod_LICENSE.FOR_ASSETS.txt")):
        src = os.path.join(staged, src_name)
        if os.path.isfile(src):
            shutil.copyfile(src, os.path.join(lic_dir, dst_name))
    lang = os.path.join(assets, "lang", "en_us.json")
    if os.path.isfile(lang):
        shutil.copyfile(lang, os.path.join(ref_dir, "r6mod_lang_en_us.json"))
    damage_type = os.path.join(staged, "data", "r6ms", "damage_type", "shot.json")
    if os.path.isfile(damage_type):
        shutil.copyfile(damage_type, os.path.join(ref_dir, "r6mod_damage_type_shot.json"))
    copy_r6mod_assets.stats = dict(gui=gui_count, item=item_count, icons=icon_count,
                                   logo=count)
    return gui_count + item_count + icon_count + count


# ---------------------------------------------------------------- bullet FX
# Muzzle flash / tracer / impact particles ported from Test Guns 2D.
# Identifiers are re-namespaced to r6: so both add-ons can be installed.
GUN_FX_PARTICLES = [
    ("test_gun_bullet_tracer", "r6:bullet_tracer", "r6_bullet_tracer"),
    ("test_gun_heavy_tracer", "r6:heavy_tracer", "r6_heavy_tracer"),
    ("test_gun_shotgun_tracer", "r6:shotgun_tracer", "r6_shotgun_tracer"),
    ("test_gun_vector_tracer", "r6:vector_tracer", "r6_vector_tracer"),
    ("test_gun_pkm_burn", "r6:pkm_tracer", "r6_pkm_tracer"),
    ("test_gun_muzzle_flash_circle", "r6:muzzle_flash", "r6_muzzle_flash"),
    ("test_gun_muzzle_flash_heavy", "r6:muzzle_flash_heavy", "r6_muzzle_flash_heavy"),
    ("test_gun_bullet_hit_spark", "r6:bullet_hit_spark", "r6_bullet_hit_spark"),
    ("test_gun_bullet_hit_smoke", "r6:bullet_hit_smoke", "r6_bullet_hit_smoke"),
    ("test_gun_bullet_hit_heavy_flash", "r6:bullet_hit_heavy_flash", "r6_bullet_hit_heavy_flash"),
]


def copy_gun_fx():
    """Copy the bullet tracer / muzzle flash / impact particle effects used by guns."""
    src_dir = os.path.join(TEST_GUNS_RP, "particles")
    tex_dir = os.path.join(TEST_GUNS_RP, "textures", "particle")
    dst_dir = os.path.join(RP, "particles")
    if os.path.isdir(dst_dir):
        shutil.rmtree(dst_dir)  # generated directory: never keep stale particles
    if not os.path.isdir(src_dir):
        print("  ! Test Guns particles missing, skipped")
        return 0, 0
    copied_tex = set()

    def rewrite(node, identifier):
        if isinstance(node, dict):
            return {k: rewrite(v, identifier) for k, v in node.items()}
        if isinstance(node, list):
            return [rewrite(v, identifier) for v in node]
        if isinstance(node, str):
            if node.startswith("test_gun:"):
                return "r6:" + node[len("test_gun:"):]
            if node.startswith("textures/particle/"):
                name = node.rsplit("/", 1)[-1]
                src_png = os.path.join(tex_dir, name + ".png")
                if os.path.isfile(src_png):
                    copy_file(src_png, f"textures/particle/r6/{name}.png")
                    copied_tex.add(name)
                    return f"textures/particle/r6/{name}"
                # textures/particle/particles is a vanilla atlas: keep the path
            if identifier and not node.startswith("r6:"):
                return node
        return node

    count = 0
    for stem, identifier, out_stem in GUN_FX_PARTICLES:
        src = os.path.join(src_dir, stem + ".particle.json")
        if not os.path.isfile(src):
            print(f"  ! particle missing, skipped: {src}")
            continue
        data = load_json(src)
        data = rewrite(data, identifier)
        # ensure the description identifier is the namespaced one
        effect = data.get("particle_effect", {})
        desc = effect.get("description", {})
        if "identifier" in desc:
            desc["identifier"] = identifier
        write_json(os.path.join(dst_dir, out_stem + ".particle.json"), data)
        count += 1
    return count, len(copied_tex)


def main():
    if not os.path.isdir(TEST_GUNS_RP):
        raise SystemExit("source pack not found: " + TEST_GUNS_RP)
    geo_index = build_geo_index()
    icon_index = build_item_texture_index()
    # ---- extract shared hold animations (static, script-variable free) ----
    tg3d = load_json(os.path.join(TEST_GUNS_RP, "animations", "tg3d.animation.json"))
    gun_anims = {}
    for key in ("animation.tg3d.hold_first", "animation.tg3d.hold_third"):
        gun_anims[key] = tg3d["animations"][key]
    write_json(os.path.join(RP, "animations", "r6_gun_hold.animation.json"),
               {"format_version": "1.10.0", "animations": gun_anims})

    shield_src = load_json(os.path.join(TEST_GUNS_RP, "animations", "shield.animation.json"))
    shield_anims = {}
    for key in ("animation.tg_shield.wield_first_person",
                "animation.tg_shield.wield_off_first_person",
                "animation.tg_shield.wield_third_person"):
        shield_anims[key] = shield_src["animations"][key]
    write_json(os.path.join(RP, "animations", "r6_shield_hold.animation.json"),
               {"format_version": "1.10.0", "animations": shield_anims})

    # ---- copy weapon art and write one attachable per weapon item ----
    art_info = {}
    for art in D.ART_GUNS:
        src_item = ART_TO_SOURCE_ITEM[art]
        attach_path = os.path.join(TEST_GUNS_RP, "attachables", src_item + ".json")
        if not os.path.isfile(attach_path):
            raise FileNotFoundError("source attachable missing: " + attach_path)
        attach = load_json(attach_path)["minecraft:attachable"]["description"]
        tex_path = attach["textures"]["default"]
        geo_id = attach["geometry"]["default"]
        if geo_id not in geo_index:
            raise FileNotFoundError(f"geometry {geo_id} for {art} not found")
        # 3D texture
        src_tex = os.path.join(TEST_GUNS_RP, tex_path + ".png")
        copy_file(src_tex, f"textures/entity/r6/weapons/{art}.png")
        # geometry (extract only the geometry this art needs so we never ship duplicates)
        geo_src = load_json(geo_index[geo_id])
        entries = [g for g in geo_src.get("minecraft:geometry", [])
                   if g.get("description", {}).get("identifier") == geo_id]
        if not entries:
            entries = geo_src.get("minecraft:geometry", [])
        write_json(os.path.join(RP, f"models/entity/r6/{art}.geo.json"), {
            "format_version": geo_src.get("format_version", "1.16.0"),
            "minecraft:geometry": entries,
        })
        # 2D inventory icon
        icon_key = "test_gun_" + src_item
        if icon_key not in icon_index:
            raise FileNotFoundError(f"item icon {icon_key} not found for {art}")
        icon_tex = icon_index[icon_key]
        copy_file(os.path.join(TEST_GUNS_RP, icon_tex + ".png"),
                  f"textures/items/guns/{art}.png")
        art_info[art] = dict(tex=tex_path, geo=geo_id, icon=icon_tex)

    for weapon in D.WEAPONS:
        wid = weapon["id"]
        art = weapon["art"]
        info = art_info[art]
        shield = weapon.get("shield", False)
        if shield:
            animations = {
                "wield_fp": "animation.tg_shield.wield_first_person",
                "wield_off_fp": "animation.tg_shield.wield_off_first_person",
                "wield_tp": "animation.tg_shield.wield_third_person",
            }
            scripts = {"animate": [
                {"wield_fp": "context.is_first_person && context.item_slot == 'main_hand'"},
                {"wield_off_fp": "context.is_first_person && context.item_slot == 'off_hand'"},
                {"wield_tp": "!context.is_first_person"},
            ]}
        else:
            animations = {
                "hold_first": "animation.tg3d.hold_first",
                "hold_third": "animation.tg3d.hold_third",
            }
            scripts = {"animate": [
                {"hold_first": "context.is_first_person"},
                {"hold_third": "!context.is_first_person"},
            ]}
        attachable = {
            "format_version": "1.10.0",
            "minecraft:attachable": {
                "description": {
                    "identifier": f"{D.NAMESPACE}:{wid}",
                    "materials": {"default": "entity_alphatest",
                                  "enchanted": "entity_alphatest_glint"},
                    "textures": {"default": f"textures/entity/r6/weapons/{art}",
                                 "enchanted": "textures/misc/enchanted_item_glint"},
                    "geometry": {"default": info["geo"]},
                    "animations": animations,
                    "scripts": scripts,
                    "render_controllers": ["controller.render.default"],
                },
            },
        }
        write_json(os.path.join(RP, "attachables", f"{wid}.json"), attachable)

    # ---- sounds: rebuilt from scratch so removed ids never linger ----
    sounds_dir = os.path.join(RP, "sounds")
    if os.path.isdir(sounds_dir):
        shutil.rmtree(sounds_dir)
    sounds = {}
    unique_sounds = set()
    for weapon in D.WEAPONS:
        if weapon.get("shield"):
            continue
        src_sound = D.ART_SOUND_FALLBACK.get(weapon["art"], weapon["art"])
        unique_sounds.add(src_sound)
    for sound in sorted(unique_sounds):
        src = os.path.join(TEST_GUNS_RP, "sounds", "guns", f"{sound}_shoot.ogg")
        copy_file(src, f"sounds/guns/{sound}_shoot.ogg")
        sounds[f"r6.{sound}_shoot"] = {
            "category": "player",
            "sounds": [{"name": f"sounds/guns/{sound}_shoot", "volume": 0.85, "pitch": 1.0}],
        }

    copied_sfx = 0
    for sound_id, category, volume, sources in EXTRA_SOUNDS:
        entries = []
        short = sound_id.replace("r6.", "")
        for index, (root_key, rel_path, pitch) in enumerate(sources, 1):
            root = SOURCE_ROOTS.get(root_key)
            if not root:
                raise SystemExit(f"unknown sound source root: {root_key}")
            src = os.path.join(root, *rel_path.split("/"))
            if not os.path.isfile(src):
                print(f"  ! sound source missing, skipped: {src}")
                continue
            target = f"sounds/r6/{short}_{index}.ogg"
            copy_file(src, target)
            entries.append({"name": target[:-4], "volume": volume, "pitch": pitch})
            copied_sfx += 1
        if entries:
            sounds[sound_id] = {"category": category, "sounds": entries}

    write_json(os.path.join(RP, "sounds", "sound_definitions.json"), {
        "format_version": "1.14.0",
        "sound_definitions": sounds,
    })

    # ---- operator badge icons staged from MC-R6mod ----
    icon_dir = os.path.join(SOURCE, "operator_icons")
    copied = 0
    for op in D.OPERATORS:
        if op["icon_source"] != "repo":
            continue
        src = os.path.join(icon_dir, op["icon_file"] + ".png")
        if not os.path.isfile(src):
            raise FileNotFoundError("staged operator icon missing: " + src)
        copy_file(src, f"textures/items/badges/{op['id']}.png")
        copied += 1

    r6mod_assets = copy_r6mod_assets()
    stats = getattr(copy_r6mod_assets, "stats", {})
    fx_count, fx_tex = copy_gun_fx()

    print(f"imported {len(D.ART_GUNS)} weapon art chains, {len(sounds)} sound ids "
          f"({copied_sfx} sfx files), {copied} repo operator icons, {r6mod_assets} MC-R6mod assets "
          f"(gui={stats.get('gui', 0)}, item={stats.get('item', 0)}, "
          f"operator icons={stats.get('icons', 0)}, logo={stats.get('logo', 0)}), "
          f"{fx_count} bullet FX particles ({fx_tex} textures) from Test Guns 2D")


if __name__ == "__main__":
    main()
