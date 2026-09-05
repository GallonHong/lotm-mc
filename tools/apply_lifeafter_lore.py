import os
import json

REPO_DIR = r"c:\Users\10973\Desktop\mcaddon"
BP_ITEMS_DIR = os.path.join(REPO_DIR, "addons", "development", "test_guns_2d_addon", "test_guns_bp", "items")
ZH_LANG = os.path.join(REPO_DIR, "addons", "development", "test_guns_2d_addon", "test_guns_rp", "texts", "zh_CN.lang")
EN_LANG = os.path.join(REPO_DIR, "addons", "development", "test_guns_2d_addon", "test_guns_rp", "texts", "en_US.lang")

LORE_DATA = {
    # Firearms - Common
    "ak47": {
        "zh": "“哪怕泡过沼泽泥水、枪机挂满沙砾，扣动扳机时依然狂怒咆哮。”",
        "en": "\"Even soaked in swamp mud and choked with grit, it roars with fury when you pull the trigger.\""
    },
    "ak74u": {
        "zh": "“狭窄车厢与废弃楼道里的近战利刃，枪托上刻着前任车长的名字缩写。”",
        "en": "\"A close-quarters edge in tight train cars and derelict ruins; initials are carved into the stock.\""
    },
    "shotgun": {
        "zh": "“‘咔嚓’一声泵动上膛，是在荒野长夜里最让人心安的声音。”",
        "en": "\"The sharp clack of pumping a shell into the chamber is the most comforting sound in a bleak night.\""
    },
    "m1897": {
        "zh": "“‘等感染者冲到三米内再扣扳机，既省子弹，也能听清骨头碎裂的声音。’”",
        "en": "\"Wait until they charge within three meters before firing—saves ammo, and you can hear the bones shatter.\""
    },
    "bizon": {
        "zh": "“大容量螺旋弹筒，是独自面对蜂拥尸潮时唯一不需频繁换弹的底气。”",
        "en": "\"A massive helical magazine is your only steady confidence when standing alone against an infected horde.\""
    },
    "glock": {
        "zh": "“插在腰间的最后一道保险，瞬间泼洒的暴烈弹雨曾无数次逆转生死。”",
        "en": "\"The last line of defense on your hip; its instantaneous burst of lead has turned the tide countless times.\""
    },

    # Melee - Common & Rare & Epic
    "combat_knife": {
        "base_zh": r"§f军用格斗匕首 [普通]§r\n§7被动: 极速近战刺杀，无耐力消耗快速连续刺击敌人§r",
        "base_en": r"§fCombat Knife [Common]§r\n§7Passive: Rapid melee assassinations with no stamina cost§r",
        "zh": "“静默刺入咽喉的无声利刃，在不愿惊动整座营地时比任何枪械都好用。”",
        "en": "\"A silent blade slipped into the throat; far more dependable than firearms when silence is life.\""
    },
    "tactical_axe": {
        "base_zh": r"§9战术突击破障斧 [优良]§r\n§7被动: 【重劈破甲】10点近战重伤，强力重劈大幅瓦解护甲防线§r",
        "base_en": r"§9Tactical Assault Axe [Rare]§r\n§7Passive: Armor shredding heavy chop that breaks enemy guard§r",
        "zh": "“既能破拆封死的防空洞铁门，也能劈开拦路巨型变异体的坚韧骨骼。”",
        "en": "\"Equally adept at breaching reinforced bunker doors or cleaving through dense mutant bones.\""
    },
    "tactical_shovel": {
        "base_zh": r"§9工兵战术破拆铲 [优良]§r\n§7被动: 【破盾钝击】8点近战伤害，产生击退钝击与强力破盾效果§r",
        "base_en": r"§9Trench Entrenching Shovel [Rare]§r\n§7Passive: Blunt impact with strong knockback and shield break§r",
        "zh": "“白昼掘土构筑单兵掩体，黑夜在壕沟里与扑脸的感染者进行血腥肉搏。”",
        "en": "\"Digging foxholes through the bitter day; brawling hand-to-hand in muddy trenches through the dark.\""
    },
    "katana": {
        "base_zh": r"§5战术冷钢黑刃武士刀 [史诗]§r\n§7被动: 【锋芒破甲】14点高伤，挥砍无视目标 50% 基础防御§r\n§e主动: 【绝影居合】按右键极速拔刀，斩击周身近战范围全部敌人 (10s CD)§r",
        "base_en": r"§5Tactical Cold Steel Katana [Epic]§r\n§7Passive: Razor strikes bypassing 50% enemy defense§r\n§eActive: Shadow Iaijutsu 360-degree slash (10s CD)§r",
        "zh": "“当撞针空响、最后一发子弹打光的时候，唯有手中的冷铁从不卡壳。”",
        "en": "\"When the firing pin strikes empty and ammo runs dry, cold forged steel is the only thing that never jams.\""
    },
    "kukri_machete": {
        "base_zh": r"§5尼泊尔库克锐弯刀 [史诗]§r\n§7被动: 【横扫撕裂】12点近战重伤，连续攻击造成强力流血创伤§r\n§e主动: 【战术突刺】按右键蓄力向前突刺横斩破敌 (8s CD)§r",
        "base_en": r"§5Gurkha Kukri Machete [Epic]§r\n§7Passive: Cleaving attacks causing heavy bleed wounds§r\n§eActive: Tactical lunging sweep attack (8s CD)§r",
        "zh": "“反曲刀锋下的冷酷杀手，劈砍与剁切间斩断变异体的骨骼与生机。”",
        "en": "\"A ruthless executioner with a recurved blade, cleanly shearing through muscle, bone, and life.\""
    },

    # Firearms - Rare
    "scarh": {
        "zh": "“遴选城精锐卫队的制式重火，7.62毫米穿甲重弹能轻易撕裂硬化角质甲壳。”",
        "en": "\"Standard heavy rifle of Selection City guards; 7.62mm AP rounds easily shatter hardened chitin.\""
    },
    "arx": {
        "zh": "“优异人机工效与现代聚合材料，即使是缺乏训练的幸存者也能打出平稳弹道。”",
        "en": "\"Superior ergonomics and polymer build ensure even an untrained survivor can keep a flat trajectory.\""
    },
    "p90": {
        "zh": "“透明弹匣内高速旋转的穿甲弹头，为室内突防与清剿坑道而生。”",
        "en": "\"Translucent magazine feeding high-velocity AP rounds; engineered for brutal indoor breach-and-clear.\""
    },
    "deagle": {
        "zh": "“枪膛中压入的不是普通子弹，而是一枚足以掀翻狂暴感染者的微型炮弹。”",
        "en": "\"Chambered not with common bullets, but miniature cannon rounds capable of leveling raging beasts.\""
    },
    "svd": {
        "zh": "“高地狙击手的死亡讣告，目镜十字准星里锁定的目标从没见过明天的太阳。”",
        "en": "\"An obituary penned by highland snipers; whatever enters its crosshairs never sees tomorrow's sun.\""
    },
    "m1014": {
        "zh": "“狂风暴雨般的半自动霰弹轰鸣，能在三秒内将狭窄走廊清扫一空。”",
        "en": "\"A tempest of semi-automatic buckshot capable of purging a narrow corridor clean in three seconds.\""
    },
    "m79": {
        "zh": "“古老的‘重击者’，当破片手雷扔不够远时，它就是步兵口袋里的重火炮。”",
        "en": "\"The venerable 'Thumper'—when a grenade cannot reach, this is pocket artillery for the foot soldier.\""
    },
    "rpk": {
        "zh": "“支起两脚架的铁铸哨兵，一人一枪便足以卡死废弃大桥整整两小时。”",
        "en": "\"An iron sentinel on a bipod; one determined gunner alone held down the ruined bridge for hours.\""
    },

    # Firearms - Epic
    "m82": {
        "zh": "“雷鸣般的击发声回荡在整座荒原，它击碎的不仅是重甲，还有猎物的狂妄。”",
        "en": "\"Thunderous crack echoing across the barrens; shattering heavy armor and the arrogance of monsters.\""
    },
    "riot_shield": {
        "zh": "“‘你打我有多狠，子弹咬回你就有多疼。’——黑市改装大师的得意之作”",
        "en": "\"The harder you strike, the deeper the lead bites back. — Masterpiece of an underground armorer\""
    },
    "pkm": {
        "zh": "“枪管打得赤红发烫，喷吐出灼热的火雨，将眼前的一切化作焦炭与余烬。”",
        "en": "\"The barrel glows cherry red, spitting a tempest of hellfire that reduces all to ash and cinders.\""
    },
    "m1014_ward": {
        "zh": "“科技会重装单兵工程样机，护甲能量反哺枪机，防线愈固，杀戮愈烈。”",
        "en": "\"Scientia heavy prototype; kinetic armor energy feeds the action—the firmer the line, the deadlier the fire.\""
    },
    "rpg": {
        "zh": "“废土上最纯粹的暴力美学，尾焰升腾之处，神明与巨兽皆成尘埃。”",
        "en": "\"The purest expression of wasteland violence; wherever backblast erupts, behemoths crumble into dust.\""
    },
    "flash_shield": {
        "zh": "“不仅是一道无法跨越的高墙，也是刺破黑暗绝境的一道灼眼闪电。”",
        "en": "\"Not just an impassable bulwark, but a blinding lightning bolt piercing through pitch-black despair.\""
    },
    "usas12": {
        "zh": "“【受污染样本X-9】：枪机内部涌动着诡异的活性脉动，以杀戮之血滋养生机。”",
        "en": "\"[Infected Specimen X-9]: An eerie biological pulse throbs in the action, feeding upon spilled blood.\""
    },

    # Classic Armors
    "armor_vest_light": {
        "zh": "“粗糙翻新的民用防弹纤维背心，每一个缝补针脚都是求生者的挣扎。”",
        "en": "\"A crudely refurbished civilian ballistic vest; every patched stitch tells a survivor's desperate tale.\""
    },
    "armor_vest_heavy": {
        "zh": "“压满重型防弹钢板的坚固背心，虽然沉重，却能在要命的交火中保全呼吸。”",
        "en": "\"Rigged with heavy ballistic plates; cumbersome, yet keeps you breathing through lethal firefights.\""
    },
    "armor_helmet_tactical": {
        "zh": "“加装战术导轨的军警防暴头盔，帽檐上的凹痕见证了数次致命交火。”",
        "en": "\"Rail-mounted riot helmet; the deep gouge on the brim bears witness to lethal skirmishes survived.\""
    },
    "armor_titan_chest": {
        "zh": "“重工业文明的终极咆哮，伺服液压电机嗡鸣间赋予单兵徒手撼动暴君的力量。”",
        "en": "\"The ultimate roar of heavy industry; hydraulic servomotors give soldiers the strength to grapple giants.\""
    },

    # 14 Tactical Armors (明日之后原版风格命名与故事)
    "armor_mob_chest": {
        "zh": "“多贝雪山的寒风没能吹垮第七防线，破碎的装甲钢熔铸成了这面胸甲。”",
        "en": "\"The freezing gales of Mount Dopei never broke the 7th Line; shattered armor was recast into this plate.\""
    },
    "armor_mob_pants": {
        "zh": "“‘只要还有一人站着，阵地就没丢。’——刻在护膝内侧的帝国步兵军箴”",
        "en": "\"As long as one soldier stands, the line holds. — Imperial infantry motto etched inside the knee guard\""
    },
    "armor_mob_mask": {
        "zh": "“厚重的防弹面罩后，只有一双在硝烟与暴风雪中未曾退缩的眼睛。”",
        "en": "\"Behind this impenetrable visor dwell eyes that have never wavered through blizzard and crossfire.\""
    },
    "armor_night_vision": {
        "zh": "“【科技会档案#402】：在红杉镇无月的死夜里，荧光屏上全是热源反应。别开火。”",
        "en": "\"[Scientia File #402]: On a pitch-black night in Redwood, the screen crawls with heat signatures. Don't fire.\""
    },
    "armor_wasp_rig": {
        "zh": "“在混乱的远星城，多带四个压满子弹的弹匣，比相信同伴的誓言更靠谱。”",
        "en": "\"In lawless Farstar City, four extra loaded magazines are far more trustworthy than a comrade's oath.\""
    },
    "armor_wasp_pants": {
        "zh": "“粗粝的芳纶纤维浸透了机油与干涸的泥浆，曾在尸潮围攻下支撑他爬出泥潭。”",
        "en": "\"Aramid fabric caked in motor oil and dried mud; carried its wearer crawling out of the abyss.\""
    },
    "armor_wasp_boots": {
        "zh": "“踏过高地碎石与感染废墟的重靴，鞋底花纹深深嵌着归途的沙砾。”",
        "en": "\"Heavy combat boots that trampled highland scree and ruins, treads packed with gravel from the long road home.\""
    },
    "armor_wasp_mask": {
        "zh": "“活性炭滤芯里混合着薄荷草的味道，是沼泽恶臭毒障中唯一的清醒。”",
        "en": "\"Activated charcoal laced with wild mint—the sole anchor of sanity amid toxic marsh vapors.\""
    },
    "armor_immortal_vest": {
        "zh": "“陶瓷插板上刻着磨损的旧警徽，灾难爆发之初，他们曾试图维持最后的秩序。”",
        "en": "\"Ceramic plate stamped with a worn badge; in the early hours of collapse, they fought for order.\""
    },
    "armor_immortal_pants": {
        "zh": "“轻便贴身的高机动剪裁，专为在失控街区穿梭跃进的突击队员设计。”",
        "en": "\"Lightweight, high-mobility tailoring engineered for operatives dashing through besieged ruins.\""
    },
    "armor_immortal_mask": {
        "zh": "“‘别吸入那些带荧光的孢子粉尘！’——巡逻小队最后的无线电警告”",
        "en": "\"Don't breathe the fluorescent spore dust! — The final radio broadcast crackling from a fallen patrol.\""
    },
    "armor_analyzer": {
        "zh": "“目镜边缘不断跳动着变异体活性数值，提醒你文明与荒蛮仅有一线之隔。”",
        "en": "\"Fluctuating bio-readings along the lens edge warn that civilization is separated from ruin by a thread.\""
    },
    "armor_tech": {
        "zh": "“遴选城商队先锋护卫的制式防具，挡下过不知多少支荒野冷箭与流弹。”",
        "en": "\"Standard issue for Coalition caravan vanguards; deflected countless stray bullets and ambushes.\""
    },
    "armor_fraternity": {
        "zh": "“哪怕身处文明崩解的末日废土，也总得有人负责保持帅气。”",
        "en": "\"Even in a collapsed wasteland where civilization crumbled, someone still needs to look damn good.\""
    },
}

def update_lang_file(file_path, lang_key):
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = []
    updated_items = {}
    found_keys = set()

    for line in lines:
        stripped = line.strip()
        matched = False
        for item_key, lore_dict in LORE_DATA.items():
            prefix = f"item.test_gun:{item_key}.name="
            if stripped.startswith(prefix):
                content = stripped[len(prefix):]
                parts = content.split(r"\n")
                filtered_parts = [p for p in parts if not p.startswith("§8§o")]
                lore_text = lore_dict[lang_key]
                formatted_lore = f"§8§o{lore_text}§r"
                filtered_parts.append(formatted_lore)
                new_val = r"\n".join(filtered_parts)
                new_lines.append(f"{prefix}{new_val}\n")
                updated_items[item_key] = new_val
                found_keys.add(item_key)
                matched = True
                break
        if not matched:
            new_lines.append(line)

    # If any items were missing from the lang file, append them
    missing_keys = [k for k in LORE_DATA if k not in found_keys]
    if missing_keys:
        new_lines.append(f"\n## === 近战格斗冷兵器 ===\n")
        for k in missing_keys:
            base = LORE_DATA[k].get(f"base_{lang_key}", "")
            lore_text = LORE_DATA[k][lang_key]
            formatted_lore = f"§8§o{lore_text}§r"
            full_val = f"{base}\\n{formatted_lore}"
            new_lines.append(f"item.test_gun:{k}.name={full_val}\n")
            updated_items[k] = full_val

    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print(f"[*] Updated {len(updated_items)} items in {os.path.basename(file_path)}")
    return updated_items

def update_bp_item_jsons(updated_zh):
    updated_count = 0
    for item_key, full_display_str in updated_zh.items():
        json_path = os.path.join(BP_ITEMS_DIR, f"{item_key}.json")
        if not os.path.exists(json_path):
            continue

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        comps = data.setdefault("minecraft:item", {}).setdefault("components", {})
        display_val = full_display_str.replace(r"\n", "\n")
        comps["minecraft:display_name"] = {"value": display_val}

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        updated_count += 1

    print(f"[*] Synced {updated_count} BP item JSONs with LifeAfter lore.")

def main():
    print("[*] Applying LifeAfter Wasteland Lore to weapons & armors...")
    updated_zh = update_lang_file(ZH_LANG, "zh")
    update_lang_file(EN_LANG, "en")
    update_bp_item_jsons(updated_zh)
    print("\n[SUCCESS] All weapon and armor lore successfully applied!")

if __name__ == "__main__":
    main()
