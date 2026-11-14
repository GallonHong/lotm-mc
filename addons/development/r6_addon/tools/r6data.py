# -*- coding: utf-8 -*-
"""
R6 Addon - single source of truth for gameplay data.

Every generated file (BP item JSON, RP item_texture.json, scripts/data/registry.js,
entity definitions, manifests) is derived from the tables in this module.

Run `python tools/gen_data.py` inside addons/development/r6_addon to regenerate.
"""

NAMESPACE = "r6"
PACK_VERSION = [1, 4, 0]
MIN_ENGINE = [1, 21, 80]
SERVER_MODULE = "1.18.0"
SERVER_UI_MODULE = "1.3.0"

# Stable UUIDs (uuid5 style, fixed so regeneration never breaks worlds).
UUID_BP_HEADER = "5b6f0f52-2b3e-4a1a-9d31-3c0a11a6c001"
UUID_BP_DATA = "5b6f0f52-2b3e-4a1a-9d31-3c0a11a6c002"
UUID_BP_SCRIPT = "5b6f0f52-2b3e-4a1a-9d31-3c0a11a6c003"
UUID_RP_HEADER = "5b6f0f52-2b3e-4a1a-9d31-3c0a11a6c011"
UUID_RP_RES = "5b6f0f52-2b3e-4a1a-9d31-3c0a11a6c012"

PACK_NAME_BP = "R6 Siege Bedrock BP"
PACK_NAME_RP = "R6 Siege Bedrock RP"
PACK_DESC = "Rainbow Six Siege style operators, loadouts, gadgets and bomb-defusal rounds for Bedrock."

# ---------------------------------------------------------------------------
# Weapons
# ---------------------------------------------------------------------------
# art        : source asset chain copied from addons/development/test_guns_2d_addon
# damage     : R6S body damage (close range), converted to Bedrock HP by damage_scale
# rpm        : rounds per minute
# mag        : magazine size
# reload     : reload time in seconds
# pellets    : projectiles per shot
# decay      : [full_damage_until_m, min_damage_from_m, far_multiplier]
# hip/ads    : base spread in degrees (hip fire / sneaking = aiming)
# hs         : "instant" (headshot kill) or numeric multiplier (shotguns)
# reserve    : spare magazines
DAMAGE_SCALE = 0.2  # R6S 100 hp -> Bedrock 20 hp

WEAPONS = [
    # --- Assault rifles ---
    dict(id="l85a2", name="L85A2", en="L85A2", cat="ar", art="arx", damage=47, rpm=670, mag=30,
         reload=2.4, reserve=4, decay=[10, 30, 0.6], hip=1.4, ads=0.25, recoil=1.0,
         sound="arx"),
    dict(id="ar33", name="AR33", en="AR33", cat="ar", art="ak47", damage=41, rpm=700, mag=25,
         reload=2.4, reserve=4, decay=[10, 30, 0.6], hip=1.5, ads=0.3, recoil=1.0,
         sound="ak47"),
    dict(id="r4c", name="R4-C", en="R4-C", cat="ar", art="scarh", damage=39, rpm=860, mag=30,
         reload=2.4, reserve=4, decay=[10, 30, 0.6], hip=1.6, ads=0.35, recoil=1.1,
         sound="scarh"),
    dict(id="g36c", name="G36C", en="G36C", cat="ar", art="arx", damage=38, rpm=777, mag=30,
         reload=2.4, reserve=4, decay=[10, 30, 0.6], hip=1.5, ads=0.3, recoil=1.0,
         sound="arx"),
    dict(id="556xi", name="556 XI", en="556 XI", cat="ar", art="ak47", damage=47, rpm=690, mag=30,
         reload=2.5, reserve=4, decay=[10, 30, 0.6], hip=1.5, ads=0.3, recoil=1.0,
         sound="ak47"),
    dict(id="f2", name="F2", en="F2", cat="ar", art="scarh", damage=37, rpm=980, mag=30,
         reload=2.5, reserve=4, decay=[10, 30, 0.6], hip=1.7, ads=0.4, recoil=1.2,
         sound="scarh"),
    dict(id="ak12", name="AK-12", en="AK-12", cat="ar", art="ak47", damage=44, rpm=650, mag=30,
         reload=2.5, reserve=4, decay=[10, 30, 0.6], hip=1.5, ads=0.3, recoil=1.0,
         sound="ak47"),
    dict(id="auga2", name="AUG A2", en="AUG A2", cat="ar", art="arx", damage=42, rpm=720, mag=30,
         reload=2.4, reserve=4, decay=[10, 30, 0.6], hip=1.4, ads=0.28, recoil=0.95,
         sound="arx"),
    dict(id="552c", name="552 Commando", en="552 Commando", cat="ar", art="scarh", damage=43, rpm=690,
         mag=30, reload=2.4, reserve=4, decay=[10, 30, 0.6], hip=1.5, ads=0.3, recoil=1.0,
         sound="scarh"),
    dict(id="416c", name="416-C Carbine", en="416-C", cat="ar", art="scarh", damage=38, rpm=860, mag=30,
         reload=2.4, reserve=4, decay=[10, 30, 0.6], hip=1.6, ads=0.35, recoil=1.1,
         sound="scarh"),
    # --- DMR / sniper ---
    dict(id="417", name="417", en="417", cat="dmr", art="svd", damage=69, rpm=380, mag=20,
         reload=2.8, reserve=4, decay=[20, 50, 0.8], hip=1.0, ads=0.12, recoil=1.4,
         sound="svd"),
    dict(id="ots03", name="OTs-03", en="OTs-03", cat="sniper", art="svd", damage=105, rpm=120, mag=10,
         reload=3.2, reserve=4, decay=[30, 80, 0.9], hip=2.0, ads=0.05, recoil=2.2,
         sound="svd"),
    # --- SMGs ---
    dict(id="mp5k", name="MP5K", en="MP5K", cat="smg", art="mp5k_relay", damage=26, rpm=800, mag=30,
         reload=2.2, reserve=4, decay=[5, 20, 0.5], hip=1.5, ads=0.35, recoil=0.7,
         sound="p90"),
    dict(id="mp5", name="MP5", en="MP5", cat="smg", art="mp5k_relay", damage=30, rpm=800, mag=30,
         reload=2.2, reserve=4, decay=[5, 20, 0.5], hip=1.5, ads=0.35, recoil=0.7,
         sound="p90"),
    dict(id="fmg9", name="FMG-9", en="FMG-9", cat="smg", art="bizon", damage=26, rpm=800, mag=30,
         reload=2.2, reserve=4, decay=[5, 20, 0.5], hip=1.5, ads=0.35, recoil=0.7,
         sound="bizon"),
    dict(id="ump45", name="UMP45", en="UMP45", cat="smg", art="vector", damage=38, rpm=600, mag=25,
         reload=2.3, reserve=4, decay=[5, 20, 0.5], hip=1.4, ads=0.3, recoil=0.8,
         sound="vector"),
    dict(id="vityaz9", name="9x19VSN", en="9x19VSN", cat="smg", art="ak74u", damage=26, rpm=750, mag=30,
         reload=2.2, reserve=4, decay=[5, 20, 0.5], hip=1.5, ads=0.35, recoil=0.7,
         sound="ak74u"),
    dict(id="mp7", name="MP7", en="MP7", cat="smg", art="mp5k_relay", damage=32, rpm=900, mag=30,
         reload=2.2, reserve=4, decay=[5, 20, 0.5], hip=1.5, ads=0.35, recoil=0.7,
         sound="vector"),
    dict(id="p90", name="P90", en="P90", cat="smg", art="p90", damage=22, rpm=970, mag=50,
         reload=2.6, reserve=4, decay=[5, 20, 0.5], hip=1.6, ads=0.4, recoil=0.6,
         sound="p90"),
    # --- LMGs ---
    dict(id="6p41", name="6P41", en="6P41", cat="lmg", art="pkm", damage=49, rpm=680, mag=100,
         reload=4.5, reserve=2, decay=[10, 30, 0.6], hip=2.2, ads=0.5, recoil=1.5,
         sound="pkm"),
    dict(id="g8a1", name="G8A1", en="G8A1", cat="lmg", art="rpk", damage=48, rpm=850, mag=50,
         reload=3.6, reserve=2, decay=[10, 30, 0.6], hip=2.0, ads=0.45, recoil=1.4,
         sound="rpk"),
    # --- Shotguns ---
    dict(id="m590a1", name="M590A1", en="M590A1", cat="sg", art="m870", damage=50, rpm=90, mag=7,
         reload=3.0, reserve=4, pellets=8, decay=[5, 13, 0.45], hip=6.0, ads=4.0, recoil=2.0,
         hs=1.5, sound="m870"),
    dict(id="m1014", name="M1014", en="M1014", cat="sg", art="m1014", damage=34, rpm=200, mag=8,
         reload=3.0, reserve=4, pellets=8, decay=[5, 13, 0.45], hip=6.5, ads=4.5, recoil=1.8,
         hs=1.5, sound="m1014"),
    dict(id="sasg12", name="SASG-12", en="SASG-12", cat="sg", art="usas12", damage=30, rpm=180, mag=10,
         reload=3.2, reserve=4, pellets=8, decay=[5, 13, 0.45], hip=6.5, ads=4.5, recoil=1.8,
         hs=1.5, sound="m1014"),
    dict(id="m870", name="M870", en="M870", cat="sg", art="m870", damage=50, rpm=90, mag=7,
         reload=3.0, reserve=4, pellets=8, decay=[5, 13, 0.45], hip=6.0, ads=4.0, recoil=2.0,
         hs=1.5, sound="m870"),
    # --- Pistols ---
    dict(id="p226", name="P226 MK 25", en="P226 MK 25", cat="pistol", art="glock", damage=50, rpm=500,
         mag=15, reload=1.8, reserve=5, decay=[5, 15, 0.5], hip=1.3, ads=0.3, recoil=0.9,
         sound="glock"),
    dict(id="p9", name="P9", en="P9", cat="pistol", art="glock", damage=45, rpm=500, mag=15,
         reload=1.8, reserve=5, decay=[5, 15, 0.5], hip=1.3, ads=0.3, recoil=0.9,
         sound="glock"),
    dict(id="p12", name="P12", en="P12", cat="pistol", art="glock", damage=44, rpm=500, mag=15,
         reload=1.8, reserve=5, decay=[5, 15, 0.5], hip=1.3, ads=0.3, recoil=0.9,
         sound="glock"),
    dict(id="pmm", name="PMM", en="PMM", cat="pistol", art="glock", damage=61, rpm=500, mag=8,
         reload=1.8, reserve=5, decay=[5, 15, 0.5], hip=1.4, ads=0.32, recoil=1.0,
         sound="glock"),
    dict(id="five_seven", name="5.7 USG", en="5.7 USG", cat="pistol", art="deagle", damage=42, rpm=500,
         mag=20, reload=1.8, reserve=5, decay=[5, 15, 0.5], hip=1.2, ads=0.28, recoil=0.8,
         sound="deagle"),
    dict(id="m45", name="M45 MEUSOC", en="M45 MEUSOC", cat="pistol", art="deagle", damage=58, rpm=500,
         mag=7, reload=1.8, reserve=5, decay=[5, 15, 0.5], hip=1.3, ads=0.3, recoil=0.9,
         sound="deagle"),
    # --- Shields ---
    dict(id="shield_riot", name="防暴盾", en="Ballistic Shield", cat="shield", art="riot_shield",
         shield=True),
    dict(id="shield_flash", name="闪光盾", en="Flash Shield", cat="shield", art="flash_shield",
         shield=True),
]

WEAPON_BY_ID = {w["id"]: w for w in WEAPONS}

# ---------------------------------------------------------------------------
# Operators (R6S launch roster)
# ---------------------------------------------------------------------------
# armor/speed: 1..3.  speed is cosmetic + movement tweak, armor is a damage
# multiplier (see core/damage.js) to emulate R6S 100/110/120 HP.
OPERATORS = [
    # ---- Attackers ----
    dict(id="sledge", name="SLEDGE", cn="大锤", side="attacker", armor=3, speed=1,
         primaries=["l85a2", "m590a1"], secondary="p226", gadget="gadget_sledge",
         bio="破门锤可摧毁木板、玻璃与轻质墙体，为队伍打开进攻路线。",
         icon_source="gen"),
    dict(id="thatcher", name="THATCHER", cn="撒切尔", side="attacker", armor=2, speed=2,
         primaries=["ar33", "m590a1"], secondary="p226", gadget="gadget_emp",
         bio="EMP 手雷可瘫痪范围内的所有电子设备。",
         icon_source="gen"),
    dict(id="ash", name="ASH", cn="灰烬", side="attacker", armor=1, speed=3,
         primaries=["r4c", "g36c"], secondary="five_seven", gadget="gadget_breach_round",
         bio="发射破门弹远程炸开墙体与护甲板。",
         icon_source="gen"),
    dict(id="thermite", name="THERMITE", cn="铝热剂", side="attacker", armor=2, speed=2,
         primaries=["556xi", "m1014"], secondary="m45", gadget="gadget_exo",
         bio="放热炸药可烧穿加固墙与护甲板，延迟 2.5 秒引爆。",
         icon_source="gen"),
    dict(id="twitch", name="TWITCH", cn="电击", side="attacker", armor=1, speed=3,
         primaries=["f2", "417"], secondary="p9", gadget="gadget_drone",
         bio="部署电击无人机侦察并瘫痪敌方电子设备。",
         icon_source="gen"),
    dict(id="montagne", name="MONTAGNE", cn="登山者", side="attacker", armor=3, speed=1,
         primaries=["shield_riot"], secondary="p9", gadget="gadget_extend_shield",
         bio="可展开护盾提供大面积掩体，潜行面向子弹可格挡。",
         icon_source="gen"),
    dict(id="glaz", name="GLAZ", cn="格拉兹", side="attacker", armor=2, speed=2,
         primaries=["ots03"], secondary="pmm", gadget="gadget_thermal",
         bio="热成像瞄准镜可穿透烟雾标记敌人。",
         icon_source="gen"),
    dict(id="fuze", name="FUZE", cn="引信", side="attacker", armor=3, speed=1,
         primaries=["ak12", "6p41"], secondary="pmm", gadget="gadget_cluster",
         bio="簇式炸药在墙后连续引爆五枚子炸弹。",
         icon_source="gen"),
    dict(id="blitz", name="BLITZ", cn="闪电", side="attacker", armor=2, speed=2,
         primaries=["shield_flash"], secondary="p12", gadget="gadget_flash",
         bio="闪光护盾可近距离致盲敌人并安全推进。",
         icon_source="gen"),
    dict(id="iq", name="IQ", cn="艾克", side="attacker", armor=1, speed=3,
         primaries=["auga2", "552c", "g8a1"], secondary="p12", gadget="gadget_scanner",
         bio="电子扫描仪可隔墙标记敌方设备。",
         icon_source="gen"),
    dict(id="recruit_atk", name="RECRUIT", cn="新兵", side="attacker", armor=2, speed=2,
         primaries=["l85a2", "r4c"], secondary="p226", gadget="gadget_frag",
         bio="无特殊技能，携带破片手雷的进攻新兵。", recruit=True,
         icon_source="repo", icon_file="recruit_orange"),
    # ---- Defenders ----
    dict(id="smoke", name="SMOKE", cn="烟尘", side="defender", armor=2, speed=2,
         primaries=["fmg9", "m590a1"], secondary="p226", gadget="gadget_gas",
         bio="遥控毒气罐在目标区域生成持续伤害的毒气云。",
         icon_source="repo", icon_file="smoke"),
    dict(id="mute", name="MUTE", cn="静音", side="defender", armor=2, speed=2,
         primaries=["mp5k", "m590a1"], secondary="p226", gadget="gadget_jammer",
         bio="信号干扰器瘫痪周围的进攻方电子设备。",
         icon_source="repo", icon_file="mute"),
    dict(id="castle", name="CASTLE", cn="城堡", side="defender", armor=2, speed=2,
         primaries=["ump45", "m1014"], secondary="five_seven", gadget="gadget_armor_panel",
         bio="部署防弹护甲板阻挡子弹与通路。",
         icon_source="repo", icon_file="castle"),
    dict(id="pulse", name="PULSE", cn="脉搏", side="defender", armor=1, speed=3,
         primaries=["ump45", "m1014"], secondary="five_seven", gadget="gadget_cardiac",
         bio="心率传感器可隔墙探测附近敌人的心跳。",
         icon_source="repo", icon_file="pulse"),
    dict(id="doc", name="DOC", cn="医生", side="defender", armor=3, speed=1,
         primaries=["mp5", "p90"], secondary="p9", gadget="gadget_stim",
         bio="激素手枪可治疗自己与队友，并救起倒地队友。",
         icon_source="repo", icon_file="doc"),
    dict(id="rook", name="ROOK", cn="车", side="defender", armor=3, speed=1,
         primaries=["mp5", "p90"], secondary="p9", gadget="gadget_armor_pack",
         bio="投放护甲包，队友拾取后获得额外防护。",
         icon_source="repo", icon_file="rook"),
    dict(id="kapkan", name="KAPKAN", cn="卡普坎", side="defender", armor=2, speed=2,
         primaries=["vityaz9", "sasg12"], secondary="pmm", gadget="gadget_kapkan",
         bio="入口绊雷在敌人靠近时引爆，造成重创与减速。",
         icon_source="repo", icon_file="kapkan"),
    dict(id="tachanka", name="TACHANKA", cn="塔昌卡", side="defender", armor=3, speed=1,
         primaries=["vityaz9", "sasg12"], secondary="pmm", gadget="gadget_turret",
         bio="架设自动机枪塔，持续压制进攻路线。",
         icon_source="repo", icon_file="tachanka"),
    dict(id="jager", name="JÄGER", cn="猎人", side="defender", armor=1, speed=3,
         primaries=["416c", "m870"], secondary="p12", gadget="gadget_ads",
         bio="主动防御系统拦截来袭的投掷物与破门弹。",
         icon_source="repo", icon_file="jager"),
    dict(id="bandit", name="BANDIT", cn="土匪", side="defender", armor=1, speed=3,
         primaries=["mp7", "m870"], secondary="p12", gadget="gadget_battery",
         bio="电击接线让附近区域的进攻方持续受到电击伤害。",
         icon_source="repo", icon_file="bandit"),
    dict(id="recruit_def", name="RECRUIT", cn="新兵", side="defender", armor=2, speed=2,
         primaries=["mp5k", "ump45"], secondary="p226", gadget="gadget_nitro",
         bio="无特殊技能，携带遥控炸药防守新兵。", recruit=True,
         icon_source="repo", icon_file="recruit_blue"),
]

OPERATOR_BY_ID = {o["id"]: o for o in OPERATORS}
ATTACKERS = [o for o in OPERATORS if o["side"] == "attacker" and not o.get("recruit")]
DEFENDERS = [o for o in OPERATORS if o["side"] == "defender" and not o.get("recruit")]

# ---------------------------------------------------------------------------
# Gadgets / operator abilities
# ---------------------------------------------------------------------------
# kind: tool | throw | place | deploy | toggle | heal | launcher
# charges: how many uses per round (0 = unlimited with cooldown)
# cooldown: seconds
GADGETS = {
    "gadget_sledge": dict(name="破门锤", en="Breaching Hammer", icon="sledge_hammer", kind="tool",
                          charges=0, cooldown=0, desc="右键砸碎前方的轻型结构。"),
    "gadget_emp": dict(name="EMP 手雷", en="EMP Grenade", icon="emp_grenade", kind="throw",
                       charges=1, cooldown=0, desc="投掷后瘫痪半径 6 格内的敌方电子设备 10 秒。"),
    "gadget_breach_round": dict(name="破门弹", en="Breaching Round", icon="breach_round", kind="launcher",
                                charges=2, cooldown=0, desc="向前发射破门弹，炸开墙体与护甲板。"),
    "gadget_exo": dict(name="放热炸药", en="Exothermic Charge", icon="exo_charge", kind="place",
                       charges=1, cooldown=0, desc="贴在墙上，2.5 秒后烧穿 3x2 区域。"),
    "gadget_drone": dict(name="电击无人机", en="Shock Drone", icon="drone", kind="deploy",
                         charges=1, cooldown=0, desc="部署无人机侦查并电击敌方设备。"),
    "gadget_extend_shield": dict(name="可伸缩护盾", en="Extendable Shield", icon="shield", kind="deploy",
                                 charges=1, cooldown=0, desc="在面前展开一面可挡子弹的护盾。"),
    "gadget_thermal": dict(name="热成像瞄准镜", en="Thermal Scope", icon="thermal", kind="toggle",
                           charges=0, cooldown=20, desc="开启热成像，标记前方敌人 6 秒。"),
    "gadget_cluster": dict(name="簇式炸药", en="Cluster Charge", icon="cluster_charge", kind="place",
                           charges=1, cooldown=0, desc="贴墙后向另一侧连续引爆 5 枚子炸弹。"),
    "gadget_flash": dict(name="闪光盾闪击", en="Flash Shield", icon="flash", kind="toggle",
                         charges=2, cooldown=8, desc="正面 8 格内的敌人被致盲 3 秒。"),
    "gadget_scanner": dict(name="电子扫描仪", en="Electronics Scanner", icon="scanner", kind="toggle",
                           charges=0, cooldown=15, desc="标记 20 格内的敌方设备 6 秒。"),
    "gadget_frag": dict(name="破片手雷", en="Frag Grenade", icon="frag", kind="throw",
                        charges=1, cooldown=0, desc="延时爆炸的破片手雷。"),
    "gadget_gas": dict(name="遥控毒气罐", en="Remote Gas Grenade", icon="gas", kind="throw",
                       charges=2, cooldown=0, desc="生成持续 8 秒的毒气云，敌人受到伤害并被致盲。"),
    "gadget_jammer": dict(name="信号干扰器", en="Signal Disruptor", icon="jammer", kind="place",
                          charges=2, cooldown=0, desc="瘫痪半径 6 格内的进攻方设备。"),
    "gadget_armor_panel": dict(name="防弹护甲板", en="Armor Panel", icon="panel", kind="place",
                               charges=1, cooldown=0, desc="在门口部署一块可阻挡子弹的护甲板。"),
    "gadget_cardiac": dict(name="心率传感器", en="Cardiac Sensor", icon="cardiac", kind="toggle",
                           charges=0, cooldown=20, desc="隔墙探测 15 格内的敌人心跳 5 秒。"),
    "gadget_stim": dict(name="激素手枪", en="Stim Pistol", icon="stim", kind="heal",
                        charges=3, cooldown=3, desc="治疗自己或队友，也可瞬间救起倒地队友。"),
    "gadget_armor_pack": dict(name="护甲包", en="Armor Pack", icon="armor_pack", kind="place",
                              charges=1, cooldown=0, desc="放置护甲包，队友靠近右键拾取护甲板。"),
    "gadget_kapkan": dict(name="入口陷阱", en="Entry Denial Device", icon="kapkan", kind="place",
                          charges=3, cooldown=0, desc="在门口布置绊雷，敌人靠近时爆炸。"),
    "gadget_turret": dict(name="架设机枪", en="Mounted LMG", icon="turret", kind="place",
                          charges=1, cooldown=0, desc="部署自动机枪塔压制进攻方。"),
    "gadget_ads": dict(name="主动防御系统", en="Active Defense", icon="ads", kind="place",
                       charges=1, cooldown=0, desc="拦截半径 6 格内的敌方投掷物与破门弹。"),
    "gadget_battery": dict(name="电击接线", en="Shock Wire", icon="battery", kind="place",
                           charges=1, cooldown=0, desc="电击附近区域内的进攻方。"),
    "gadget_nitro": dict(name="遥控炸药", en="Nitro Cell", icon="nitro", kind="throw",
                         charges=1, cooldown=0, desc="投掷后立即爆炸的大威力炸药。"),
    "gadget_reinforce": dict(name="加固墙", en="Reinforcement", icon="reinforce", kind="place",
                             charges=2, cooldown=0, desc="加固一面墙体，普通破坏无法穿透；可用破门炸药炸开。"),
    "gadget_barricade": dict(name="木板路障", en="Wood Barricade", icon="barricade", kind="place",
                             charges=2, cooldown=0, desc="放置可破坏的木质路障；被子弹/破门/炸药摧毁后会留下钢梁框架。"),
}

# ---------------------------------------------------------------------------
# Special items
# ---------------------------------------------------------------------------
MISC_ITEMS = {
    "tablet": dict(name="§6R6 战术平板", icon="tablet", desc="右键打开 R6 主菜单。"),
    "defuser": dict(name="§b拆弹器", icon="defuser", desc="在炸弹点安放 / 拆除炸弹。"),
}

# ---------------------------------------------------------------------------
# Device entities spawned by gadgets (BP entity + RP entity + geometry + texture)
# ---------------------------------------------------------------------------
# size: [width, height, depth] in blocks (also used by bullet collision)
DEVICES = {
    "bomb": dict(geo="bomb", size=[0.6, 0.6, 0.6], family="r6_bomb"),
    "drone": dict(geo="drone", size=[0.5, 0.3, 0.5], family="r6_drone"),
    "gadget_shield": dict(geo="shield", size=[2.2, 2.0, 0.3], family="r6_device"),
    "gadget_panel": dict(geo="panel", size=[2.2, 2.2, 0.25], family="r6_device"),
    "gadget_jammer": dict(geo="jammer", size=[0.5, 0.7, 0.5], family="r6_device"),
    "gadget_ads": dict(geo="ads", size=[0.5, 0.9, 0.5], family="r6_device"),
    "gadget_battery": dict(geo="battery", size=[0.6, 0.5, 0.2], family="r6_device"),
    "gadget_kapkan": dict(geo="kapkan", size=[0.4, 0.6, 0.4], family="r6_device"),
    "gadget_turret": dict(geo="turret", size=[0.9, 0.9, 0.9], family="r6_device"),
    "gadget_armor_pack": dict(geo="armor_pack", size=[0.8, 0.4, 0.8], family="r6_device"),
    "gadget_exo": dict(geo="exo", size=[0.5, 0.5, 0.2], family="r6_device"),
    "gadget_cluster": dict(geo="cluster", size=[0.5, 0.5, 0.2], family="r6_device"),
}

# ---------------------------------------------------------------------------
# Custom blocks: destructible wooden barricade / steel beam frame left behind
# ---------------------------------------------------------------------------
BARRIER_BLOCK = f"{NAMESPACE}:wood_barricade"
FRAME_BLOCK = f"{NAMESPACE}:steel_frame"
BARRIER_BLOCK_HP = 220  # accumulated bullet damage before it turns into a frame

BLOCKS = {
    "wood_barricade": dict(
        name="木质路障", en="Wood Barricade", texture="r6_wood_barricade",
        icon_texture="textures/blocks/wood_barricade",
        geometry="minecraft:geometry.full_block", render_method="opaque",
        map_color="#8B5A2B", light_dampening=15,
        collision=True, destructible=True,
        replace_with=FRAME_BLOCK,
    ),
    "steel_frame": dict(
        name="钢梁框架", en="Steel Frame", texture="r6_steel_frame",
        icon_texture="textures/blocks/steel_frame",
        geometry="geometry.r6.steel_frame", render_method="opaque",
        map_color="#55606B", light_dampening=0,
        collision=False, destructible=False,
        replace_with=None,
    ),
}

# ---------------------------------------------------------------------------
# Art sources (relative to addons/development/test_guns_2d_addon)
# ---------------------------------------------------------------------------
ART_GUNS = [  # unique art chains referenced by WEAPONS[*].art
    "arx", "scarh", "ak47", "ak74u", "svd", "mp5k_relay", "bizon", "vector", "p90",
    "pkm", "rpk", "m870", "m1014", "usas12", "glock", "deagle",
    "riot_shield", "flash_shield",
]

# guns whose source pack has no dedicated shoot sound; fall back to ART_SOUND_FALLBACK
ART_SOUND_FALLBACK = {
    "mp5k_relay": "p90",
    "usas12": "m1014",
}

TEST_GUNS_ROOT = "test_guns_2d_addon"  # sibling folder under addons/development
R6MOD_ICON_DIR = (
    "operator_icon52"  # relative to the reference repo checkout, resolved by import_assets
)

# operator icons that exist in the reference MC-R6mod repository
REPO_OPERATOR_ICONS = [
    "bandit", "castle", "doc", "jager", "kapkan", "mute", "pulse", "rook", "smoke",
    "tachanka", "recruit_blue", "recruit_green", "recruit_orange", "recruit_red",
    "recruit_yellow",
]

# default live configuration (overridable through /scriptevent r6:config)
DEFAULT_CONFIG = dict(
    teamSize=5,
    roundsToWin=4,
    maxRounds=7,
    prepSeconds=20,
    actionSeconds=180,
    bombSeconds=45,
    plantSeconds=4,
    defuseSeconds=7,
    reviveSeconds=4,
    bleedoutSeconds=45,
    roundEndSeconds=6,
    friendlyFire=False,
)
