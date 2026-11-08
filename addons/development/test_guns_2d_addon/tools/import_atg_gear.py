import os
import json
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
ADDON_ROOT = os.path.join(REPO_ROOT, 'addons', 'development', 'test_guns_2d_addon')
BP_ROOT = os.path.join(ADDON_ROOT, 'test_guns_bp')
RP_ROOT = os.path.join(ADDON_ROOT, 'test_guns_rp')

ATG_REF = os.path.join(REPO_ROOT, 'addons', 'reference', '先进战术装备V1.1.3')
ATG_BP = None
ATG_RP = None

for d in os.listdir(ATG_REF):
    if 'behavior' in d:
        ATG_BP = os.path.join(ATG_REF, d)
    elif 'resource' in d:
        ATG_RP = os.path.join(ATG_REF, d)

print(f"ATG BP: {ATG_BP}")
print(f"ATG RP: {ATG_RP}")

# 1. Gear specifications: ID -> info
# quality: 'gold', 'purple_rare' (uncraftable blueprint), 'purple' (craftable), 'blue', 'green'
GEAR_DEFS = {
    # Gold Mythic Chest
    'armor_mlt_hg2': {
        'name': '§6军用科技 HG2 全身重甲 [传说]§r',
        'en_name': '§6Militech HG2 Juggernaut Armor [Legendary]§r',
        'desc': '§7被动: 16点护甲，-65%枪械终伤，常驻+8HP金心护盾，机枪/重武器伤害+25%，散布-35%，移速-8%§r\n§8§o“军工级全身防弹复合机甲，行走的重型火力堡垒。”§r',
        'en_desc': '§7Passive: 16 Armor, -65% Gun Damage Taken, +8HP Absorption, +25% LMG/Heavy Gun Dmg, -35% Spread, -8% Speed.§r',
        'slot': 'slot.armor.chest',
        'quality': 'gold',
        'protection': 16,
        'durability': 1200,
        'geom': 'geometry.atg_mlt_hg2',
        'tex': 'textures/entity/pamobile/atg_mlt_hg2',
        'icon': 'textures/items/pamobile/atg_mlt_hg2',
        'layer': 'variable.chest_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': False,
        'armor_recipe': {
            'pattern': [' B ', 'PCP', ' P '],
            'key': {
                'B': 'test_gun:blueprint_armor_mlt_hg2',
                'P': 'test_gun:part_armor_plate',
                'C': 'minecraft:netherite_ingot'
            }
        }
    },
    'armor_mlt_hg2_desert': {
        'name': '§6军用科技 HG2 全身重甲 沙漠色 [传说]§r',
        'en_name': '§6Militech HG2 Armor Desert [Legendary]§r',
        'desc': '§7被动: 16点护甲，-65%枪械终伤，常驻+8HP金心护盾，机枪/重武器伤害+25%，散布-35%，移速-8%§r\n§8§o“军工级全身防弹复合机甲沙漠迷彩涂装版。”§r',
        'en_desc': '§7Passive: 16 Armor, -65% Gun Damage Taken, +8HP Absorption, +25% LMG/Heavy Gun Dmg, -35% Spread, -8% Speed.§r',
        'slot': 'slot.armor.chest',
        'quality': 'gold',
        'protection': 16,
        'durability': 1200,
        'geom': 'geometry.atg_mlt_hg2_desert',
        'tex': 'textures/entity/pamobile/atg_mlt_hg2_desert',
        'icon': 'textures/items/pamobile/atg_mlt_hg2_desert',
        'layer': 'variable.chest_layer_visible = 0.0;',
        'has_blueprint': False, # crafted from standard hg2 + dye or blueprint
        'armor_recipe': {
            'pattern': ['B', 'D'],
            'key': {
                'B': 'test_gun:armor_mlt_hg2',
                'D': 'minecraft:yellow_dye'
            }
        }
    },
    'armor_killa_6b13': {
        'name': '§66B13「基拉」突击防弹衣 [传说]§r',
        'en_name': '§66B13 Killa Assault Body Armor [Legendary]§r',
        'desc': '§7被动: 14点护甲，-50%枪械终伤，近身/霰弹吸收+30%，全枪暴击率+20%，冲锋/霰弹伤害+30%；濒死(<40%HP)暴击率额外+20%§r\n§8§o“商场霸主Killa的标志性装甲，正面硬刚的战神象征。”§r',
        'en_desc': '§7Passive: 14 Armor, -50% Gun Damage Taken, +30% Close-range/Shotgun Absorption, +20% All Weapon Crit, +30% SMG/Shotgun Dmg; +20% Crit when <40% HP.§r',
        'slot': 'slot.armor.chest',
        'quality': 'gold',
        'protection': 14,
        'durability': 1000,
        'geom': 'geometry.atg_killa_6b13',
        'tex': 'textures/entity/pamobile/atg_killa_6b13',
        'icon': 'textures/items/pamobile/atg_killa_6b13',
        'layer': 'variable.chest_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': False,
        'armor_recipe': {
            'pattern': [' B ', 'PCP', ' D '],
            'key': {
                'B': 'test_gun:blueprint_armor_killa_6b13',
                'P': 'test_gun:part_armor_plate',
                'C': 'test_gun:part_ceramic_plate',
                'D': 'minecraft:diamond'
            }
        }
    },

    # Gold Mythic Head
    'armor_ocf_gpnvg18': {
        'name': '§6Ops-Core FAST 四目全景夜视盔 [传说]§r',
        'en_name': '§6Ops-Core FAST GPNVG-18 Panoramic Helmet [Legendary]§r',
        'desc': '§7被动: 6点护甲，-50%爆头伤害，全景超清夜视，全枪械暴击率+25%，暴伤提升至1.85x，暗处穿甲+15%§r\n§8§o“特种部队巅峰四目全景白磷管夜视仪，黑夜即是主场。”§r',
        'en_desc': '§7Passive: 6 Armor, -50% Headshot Dmg Taken, Panoramic Night Vision, +25% Weapon Crit, 1.85x Crit Multiplier, +15% Armor Piercing in Dark.§r',
        'slot': 'slot.armor.head',
        'quality': 'gold',
        'protection': 6,
        'durability': 800,
        'geom': 'geometry.atg_ocf_gpnvg18',
        'tex': 'textures/entity/pamobile/atg_ocf_gpnvg18',
        'icon': 'textures/items/pamobile/atg_ocf_gpnvg18',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': False,
        'armor_recipe': {
            'pattern': [' B ', 'THT', ' I '],
            'key': {
                'B': 'test_gun:blueprint_armor_ocf_gpnvg18',
                'T': 'test_gun:part_iit',
                'H': 'minecraft:iron_helmet',
                'I': 'test_gun:part_mech_chip'
            }
        }
    },
    'armor_ocf_gpnvg18_desert': {
        'name': '§6Ops-Core FAST 四目夜视盔 沙漠色 [传说]§r',
        'en_name': '§6Ops-Core FAST GPNVG-18 Desert [Legendary]§r',
        'desc': '§7被动: 6点护甲，-50%爆头伤害，全景超清夜视，全枪械暴击率+25%，暴伤提升至1.85x，暗处穿甲+15%§r',
        'en_desc': '§7Passive: 6 Armor, -50% Headshot Dmg Taken, Panoramic Night Vision, +25% Weapon Crit, 1.85x Crit Multiplier, +15% Armor Piercing in Dark.§r',
        'slot': 'slot.armor.head',
        'quality': 'gold',
        'protection': 6,
        'durability': 800,
        'geom': 'geometry.atg_ocf_gpnvg18_desert',
        'tex': 'textures/entity/pamobile/atg_ocf_gpnvg18_desert',
        'icon': 'textures/items/pamobile/atg_ocf_gpnvg18_desert',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': False,
        'armor_recipe': {
            'pattern': ['B', 'D'],
            'key': {
                'B': 'test_gun:armor_ocf_gpnvg18',
                'D': 'minecraft:yellow_dye'
            }
        }
    },
    'armor_ocf_gpnvg18_up': {
        'name': '§6Ops-Core FAST 四目头盔 (翻起) [传说]§r',
        'en_name': '§6Ops-Core FAST GPNVG-18 (Folded Up) [Legendary]§r',
        'desc': '§7夜视仪翻起待机状态（关闭夜视），保留全部防御与暴击属性。工作台或随身切换状态。§r',
        'en_desc': '§7Folded up NVG stand-by mode without night vision. Maintains all defense & crit attributes.§r',
        'slot': 'slot.armor.head',
        'quality': 'gold',
        'protection': 6,
        'durability': 800,
        'geom': 'geometry.atg_ocf_gpnvg18_up',
        'tex': 'textures/entity/pamobile/atg_ocf_gpnvg18_up',
        'icon': 'textures/items/pamobile/atg_ocf_gpnvg18_up',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': False,
        'armor_recipe': {
            'pattern': ['B'],
            'key': {
                'B': 'test_gun:armor_ocf_gpnvg18'
            }
        }
    },

    # Purple Epic Head (Special Uncraftable Blueprint)
    'armor_mch_fc': {
        'name': '§5MICH 2000 防弹面罩头盔 [史诗]§r',
        'en_name': '§5MICH 2000 Riot Face Shield Helmet [Epic]§r',
        'desc': '§7被动: 6点护甲，-35%头部减伤，100%阻断爆头额外伤害，举枪瞄准稳定性大幅提升，腰射散布-30%§r\n§8§o“特警强攻破门面罩，完全粉碎敌人的爆头加成。”§r',
        'en_desc': '§7Passive: 6 Armor, -35% Head Damage, 100% Blocks Extra Headshot Multiplier, +Stability, -30% Hipfire Spread.§r',
        'slot': 'slot.armor.head',
        'quality': 'purple',
        'protection': 6,
        'durability': 750,
        'geom': 'geometry.atg_mch_fc',
        'tex': 'textures/entity/pamobile/atg_mch_fc',
        'icon': 'textures/items/pamobile/atg_mch_fc',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': False, # MICH 2000 蓝图无法合成！
        'armor_recipe': {
            'pattern': [' B ', 'GHG', ' P '],
            'key': {
                'B': 'test_gun:blueprint_armor_mch_fc',
                'G': 'minecraft:glass_pane',
                'H': 'minecraft:iron_helmet',
                'P': 'test_gun:part_armor_plate'
            }
        }
    },
    'armor_mch_fc_desert': {
        'name': '§5MICH 2000 面罩头盔 沙漠色 [史诗]§r',
        'en_name': '§5MICH 2000 Face Shield Helmet Desert [Epic]§r',
        'desc': '§7被动: 6点护甲，-35%头部减伤，100%阻断爆头额外伤害，举镜瞄准稳定性大幅提升，腰射散布-30%§r',
        'en_desc': '§7Passive: 6 Armor, -35% Head Damage, 100% Blocks Extra Headshot Multiplier, +Stability, -30% Hipfire Spread.§r',
        'slot': 'slot.armor.head',
        'quality': 'purple',
        'protection': 6,
        'durability': 750,
        'geom': 'geometry.atg_mch_fc_desert',
        'tex': 'textures/entity/pamobile/atg_mch_fc_desert',
        'icon': 'textures/items/pamobile/atg_mch_fc_desert',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': False,
        'armor_recipe': {
            'pattern': ['B', 'D'],
            'key': {
                'B': 'test_gun:armor_mch_fc',
                'D': 'minecraft:yellow_dye'
            }
        }
    },
    'armor_mch_fc_up': {
        'name': '§5MICH 2000 面罩盔 (面罩掀起) [史诗]§r',
        'en_name': '§5MICH 2000 Helmet (Shield Up) [Epic]§r',
        'desc': '§7防弹面罩翻起透气状态。可在工作台无损翻下。§r',
        'en_desc': '§7Riot shield flipped up. Can toggle in crafting grid.§r',
        'slot': 'slot.armor.head',
        'quality': 'purple',
        'protection': 6,
        'durability': 750,
        'geom': 'geometry.atg_mch_fc_up',
        'tex': 'textures/entity/pamobile/atg_mch_fc_up',
        'icon': 'textures/items/pamobile/atg_mch_fc_up',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': False,
        'armor_recipe': {
            'pattern': ['B'],
            'key': {
                'B': 'test_gun:armor_mch_fc'
            }
        }
    },

    # Purple Epic Head (Craftable Blueprint)
    'armor_ca_pvs31': {
        'name': '§5Crye AirFrame 双目夜视头盔 [史诗]§r',
        'en_name': '§5Crye AirFrame PVS-31 Helmet [Epic]§r',
        'desc': '§7被动: 5点护甲，-40%头部减伤，双目白磷夜视，抗强光致盲，步枪/狙击暴击率+15%，远距增伤+15%§r\n§8§o“轻量通风双壳结构与双目微光增强，特战渗透利器。”§r',
        'en_desc': '§7Passive: 5 Armor, -40% Head Damage, Dual-tube Night Vision, Anti-flash, +15% Rifle/Sniper Crit, +15% Distant Dmg.§r',
        'slot': 'slot.armor.head',
        'quality': 'purple',
        'protection': 5,
        'durability': 700,
        'geom': 'geometry.atg_ca_pvs31',
        'tex': 'textures/entity/pamobile/atg_ca_pvs31',
        'icon': 'textures/items/pamobile/atg_ca_pvs31',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'test_gun:part_mech_chip',
                'test_gun:part_tech_data',
                'minecraft:amethyst_shard',
                'minecraft:redstone'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', 'THT', ' K '],
            'key': {
                'B': 'test_gun:blueprint_armor_ca_pvs31',
                'T': 'test_gun:part_iit',
                'H': 'minecraft:iron_helmet',
                'K': 'test_gun:part_kevlar_sheet'
            }
        }
    },
    'armor_ca_pvs31_desert': {
        'name': '§5Crye AirFrame 双目夜视盔 沙漠色 [史诗]§r',
        'en_name': '§5Crye AirFrame PVS-31 Desert [Epic]§r',
        'desc': '§7被动: 5点护甲，-40%头部减伤，双目白磷夜视，抗强光致盲，步枪/狙击暴击率+15%，远距增伤+15%§r',
        'en_desc': '§7Passive: 5 Armor, -40% Head Damage, Dual-tube Night Vision, Anti-flash, +15% Rifle/Sniper Crit, +15% Distant Dmg.§r',
        'slot': 'slot.armor.head',
        'quality': 'purple',
        'protection': 5,
        'durability': 700,
        'geom': 'geometry.atg_ca_pvs31_desert',
        'tex': 'textures/entity/pamobile/atg_ca_pvs31_desert',
        'icon': 'textures/items/pamobile/atg_ca_pvs31_desert',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': False,
        'armor_recipe': {
            'pattern': ['B', 'D'],
            'key': {
                'B': 'test_gun:armor_ca_pvs31',
                'D': 'minecraft:yellow_dye'
            }
        }
    },
    'armor_ca_pvs_31_up': {
        'name': '§5Crye AirFrame 双目头盔 (翻起) [史诗]§r',
        'en_name': '§5Crye AirFrame PVS-31 (Folded Up) [Epic]§r',
        'desc': '§7双目夜视仪翻起待机状态。可在工作台无损翻下。§r',
        'en_desc': '§7PVS-31 NVG folded up. Can toggle in crafting grid.§r',
        'slot': 'slot.armor.head',
        'quality': 'purple',
        'protection': 5,
        'durability': 700,
        'geom': 'geometry.atg_ca_pvs_31_up',
        'tex': 'textures/entity/pamobile/atg_ca_pvs_31_up',
        'icon': 'textures/items/pamobile/atg_ca_pvs_31_up',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': False,
        'armor_recipe': {
            'pattern': ['B'],
            'key': {
                'B': 'test_gun:armor_ca_pvs31'
            }
        }
    },

    # Purple Epic Chest (Craftable Blueprint)
    'armor_jpc_2': {
        'name': '§5Crye JPC 2.0 战术背心 [史诗]§r',
        'en_name': '§5Crye JPC 2.0 Plate Carrier [Epic]§r',
        'desc': '§7被动: 8点护甲，-35%枪械终伤，全枪械伤害+20%，移动速度+10%，换弹速度加快25%§r\n§8§o“一线特战人员首选的轻量化机动携板背心，灵动与致命的结合。”§r',
        'en_desc': '§7Passive: 8 Armor, -35% Gun Damage, +20% Weapon Damage, +10% Speed, +25% Reload Speed.§r',
        'slot': 'slot.armor.chest',
        'quality': 'purple',
        'protection': 8,
        'durability': 650,
        'geom': 'geometry.atg_jpc_2',
        'tex': 'textures/entity/pamobile/atg_jpc_2',
        'icon': 'textures/items/pamobile/atg_jpc_2',
        'layer': 'variable.chest_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'test_gun:part_mech_chip',
                'test_gun:part_tech_data',
                'test_gun:part_kevlar_sheet',
                'minecraft:diamond'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', 'PKP', ' K '],
            'key': {
                'B': 'test_gun:blueprint_armor_jpc_2',
                'P': 'test_gun:part_armor_plate',
                'K': 'test_gun:part_kevlar_sheet'
            }
        }
    },
    'armor_jpc_2_desert': {
        'name': '§5Crye JPC 2.0 战术背心 沙漠色 [史诗]§r',
        'en_name': '§5Crye JPC 2.0 Desert [Epic]§r',
        'desc': '§7被动: 8点护甲，-35%枪械终伤，全枪械伤害+20%，移动速度+10%，换弹速度加快25%§r',
        'en_desc': '§7Passive: 8 Armor, -35% Gun Damage, +20% Weapon Damage, +10% Speed, +25% Reload Speed.§r',
        'slot': 'slot.armor.chest',
        'quality': 'purple',
        'protection': 8,
        'durability': 650,
        'geom': 'geometry.atg_jpc_2_desert',
        'tex': 'textures/entity/pamobile/atg_jpc_2_desert',
        'icon': 'textures/items/pamobile/atg_jpc_2_desert',
        'layer': 'variable.chest_layer_visible = 0.0;',
        'has_blueprint': False,
        'armor_recipe': {
            'pattern': ['B', 'D'],
            'key': {
                'B': 'test_gun:armor_jpc_2',
                'D': 'minecraft:yellow_dye'
            }
        }
    },

    # Blue Rare Chest (Craftable Blueprint)
    'armor_emr_6b13': {
        'name': '§96B13 EMR 迷彩防弹衣 [精良]§r',
        'en_name': '§96B13 EMR Camo Body Armor [Rare]§r',
        'desc': '§7被动: 10点护甲，-35%枪械终伤，对中远距离步枪穿透子弹防护+10%§r\n§8§o“俄军标配重型单兵护甲，扎实可靠的陶瓷防护层。”§r',
        'en_desc': '§7Passive: 10 Armor, -35% Gun Damage, +10% Rifle Piercing Defense.§r',
        'slot': 'slot.armor.chest',
        'quality': 'blue',
        'protection': 10,
        'durability': 600,
        'geom': 'geometry.atg_emr_6b13',
        'tex': 'textures/entity/pamobile/atg_emr_6b13',
        'icon': 'textures/items/pamobile/atg_emr_6b13',
        'layer': 'variable.chest_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'test_gun:part_kevlar_sheet',
                'minecraft:iron_ingot'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', 'PKP', ' I '],
            'key': {
                'B': 'test_gun:blueprint_armor_emr_6b13',
                'P': 'test_gun:part_armor_plate',
                'K': 'minecraft:leather_chestplate',
                'I': 'minecraft:iron_ingot'
            }
        }
    },
    'armor_ala_spc': {
        'name': '§9艾斯链甲骷髅战术背心 [精良]§r',
        'en_name': '§9Skull SPC Plate Carrier [Rare]§r',
        'desc': '§7被动: 8点护甲，-30%枪械终伤，近战伤害+20%，反弹30%近战穿透伤害，防流血§r\n§8§o“骷髅战术印花与链甲内衬，专为残忍白刃战设计的突击背心。”§r',
        'en_desc': '§7Passive: 8 Armor, -30% Gun Damage, +20% Melee Dmg, Reflects 30% Melee Dmg, Anti-bleed.§r',
        'slot': 'slot.armor.chest',
        'quality': 'blue',
        'protection': 8,
        'durability': 550,
        'geom': 'geometry.atg_ala_spc',
        'tex': 'textures/entity/pamobile/atg_ala_spc',
        'icon': 'textures/items/pamobile/atg_ala_spc',
        'layer': 'variable.chest_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'minecraft:chain',
                'minecraft:iron_ingot'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', 'PCP', ' I '],
            'key': {
                'B': 'test_gun:blueprint_armor_ala_spc',
                'P': 'test_gun:part_armor_plate',
                'C': 'minecraft:chainmail_chestplate',
                'I': 'minecraft:iron_ingot'
            }
        }
    },

    # Blue Rare Head (Craftable Blueprint)
    'armor_oc_amp': {
        'name': '§9Ops-Core AMP 降噪战术头盔 [精良]§r',
        'en_name': '§9Ops-Core AMP Tactical Helmet [Rare]§r',
        'desc': '§7被动: 4点护甲，-25%头部减伤，枪械后坐力抖动-20%，免疫爆破耳鸣，危险声源感知翻倍§r\n§8§o“集成先进主动拾音与降噪通信系统的特战头盔。”§r',
        'en_desc': '§7Passive: 4 Armor, -25% Head Dmg, -20% Weapon Shake, Anti-deafen, 2x Threat Audio Range.§r',
        'slot': 'slot.armor.head',
        'quality': 'blue',
        'protection': 4,
        'durability': 500,
        'geom': 'geometry.atg_oc_amp',
        'tex': 'textures/entity/pamobile/atg_oc_amp',
        'icon': 'textures/items/pamobile/atg_oc_amp',
        'layer': 'variable.helmet_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'minecraft:iron_bars',
                'minecraft:noteblock',
                'minecraft:copper_ingot'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', ' H ', 'R R'],
            'key': {
                'B': 'test_gun:blueprint_armor_oc_amp',
                'H': 'minecraft:iron_helmet',
                'R': 'minecraft:redstone'
            }
        }
    },

    # Blue/Green Legs (Craftable Blueprint)
    'armor_black_ghillie': {
        'name': '§9黑色战术狙击吉利服 [精良]§r',
        'en_name': '§9Black Tactical Ghillie Pants [Rare]§r',
        'desc': '§7被动: 5点护甲，潜行仇恨-60%，狙击步枪伤害+35%，静止架枪暴击率+25%§r\n§8§o“与夜色彻底融为一体的高密度伪装纤维，幽灵狙手的不二之选。”§r',
        'en_desc': '§7Passive: 5 Armor, -60% Stealth Aggro, +35% Sniper Damage, +25% Sniper Crit when Sneaking.§r',
        'slot': 'slot.armor.legs',
        'quality': 'blue',
        'protection': 5,
        'durability': 450,
        'geom': 'geometry.atg_black_ghillie',
        'tex': 'textures/entity/pamobile/atg_black_ghillie',
        'icon': 'textures/items/pamobile/atg_black_ghillie',
        'layer': 'variable.leg_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'test_gun:part_fabric_rag',
                'minecraft:string'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', 'FLF', ' S '],
            'key': {
                'B': 'test_gun:blueprint_armor_black_ghillie',
                'F': 'test_gun:part_fabric_rag',
                'L': 'minecraft:leather_leggings',
                'S': 'minecraft:string'
            }
        }
    },
    'armor_oak_ghillie': {
        'name': '§a橡木丛林战术吉利服 [优良]§r',
        'en_name': '§aOak Woodland Ghillie Pants [Uncommon]§r',
        'desc': '§7被动: 4点护甲，潜行仇恨-50%，狙击步枪伤害+25%，野外隐蔽暴击率+15%§r\n§8§o“仿生树叶与丛林网布编织而成的狙击下装。”§r',
        'en_desc': '§7Passive: 4 Armor, -50% Stealth Aggro, +25% Sniper Damage, +15% Sniper Crit.§r',
        'slot': 'slot.armor.legs',
        'quality': 'green',
        'protection': 4,
        'durability': 400,
        'geom': 'geometry.atg_oak_ghillie',
        'tex': 'textures/entity/pamobile/atg_oak_ghillie',
        'icon': 'textures/items/pamobile/atg_oak_ghillie',
        'layer': 'variable.leg_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'minecraft:oak_leaves',
                'minecraft:string'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', 'FLF', ' S '],
            'key': {
                'B': 'test_gun:blueprint_armor_oak_ghillie',
                'F': 'minecraft:oak_leaves',
                'L': 'minecraft:leather_leggings',
                'S': 'minecraft:string'
            }
        }
    },

    # Blue Face/Boots Accessories (Craftable Blueprint)
    'armor_m50': {
        'name': '§9M50 军用三防防毒面具 [精良·面部]§r',
        'en_name': '§9M50 CBRN Gas Mask [Rare Face]§r',
        'desc': '§7被动: 4点护甲，佩戴于战术配件槽，100%免疫中毒/凋零/生化毒气，水下呼吸时间翻倍§r\n§8§o“双侧对称滤毒罐与广角面屏，应对末日核生化极端环境的顶级单兵三防面罩。”§r',
        'en_desc': '§7Passive: 4 Armor, Worn on tactical accessory slot, 100% immune to Poison/Wither/Biohazards, 2x Underwater Breath.§r',
        'slot': 'slot.armor.feet',
        'quality': 'blue',
        'protection': 4,
        'durability': 500,
        'geom': 'geometry.atg_m50',
        'tex': 'textures/entity/pamobile/atg_m50',
        'icon': 'textures/items/pamobile/atg_m50',
        'layer': 'variable.boot_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'minecraft:coal',
                'minecraft:glass_pane',
                'minecraft:iron_ingot'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', 'GCG', ' F '],
            'key': {
                'B': 'test_gun:blueprint_armor_m50',
                'G': 'minecraft:glass_pane',
                'C': 'minecraft:coal',
                'F': 'test_gun:part_fabric_rag'
            }
        }
    },
    'armor_goggles_black': {
        'name': '§a战术防风护目镜 黑色 [优良·面部]§r',
        'en_name': '§aTactical Goggles Black [Uncommon Face]§r',
        'desc': '§7被动: 3点护甲，佩戴于战术配件槽，全枪械暴击率+8%，抗强光/闪光弹致盲50%§r\n§8§o“防风防尘聚碳酸酯透镜，大幅提升射手在沙尘与强光下的准星捕获速度。”§r',
        'en_desc': '§7Passive: 3 Armor, Worn on tactical accessory slot, +8% Weapon Crit, -50% Flash Blindness.§r',
        'slot': 'slot.armor.feet',
        'quality': 'green',
        'protection': 3,
        'durability': 400,
        'geom': 'geometry.atg_goggles_black',
        'tex': 'textures/entity/pamobile/atg_goggles_black',
        'icon': 'textures/items/pamobile/atg_goggles_black',
        'layer': 'variable.boot_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'minecraft:black_stained_glass_pane',
                'minecraft:string'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', 'GSG', ' F '],
            'key': {
                'B': 'test_gun:blueprint_armor_goggles_black',
                'G': 'minecraft:black_stained_glass_pane',
                'S': 'minecraft:string',
                'F': 'test_gun:part_fabric_rag'
            }
        }
    },
    'armor_goggles_red': {
        'name': '§a战术防风护目镜 红色 [优良·面部]§r',
        'en_name': '§aTactical Goggles Red [Uncommon Face]§r',
        'desc': '§7被动: 3点护甲，佩戴于战术配件槽，全枪械暴击率+8%，抗强光/闪光弹致盲50%§r',
        'en_desc': '§7Passive: 3 Armor, Worn on tactical accessory slot, +8% Weapon Crit, -50% Flash Blindness.§r',
        'slot': 'slot.armor.feet',
        'quality': 'green',
        'protection': 3,
        'durability': 400,
        'geom': 'geometry.atg_goggles_red',
        'tex': 'textures/entity/pamobile/atg_goggles_red',
        'icon': 'textures/items/pamobile/atg_goggles_red',
        'layer': 'variable.boot_layer_visible = 0.0;',
        'has_blueprint': True,
        'blueprint_craftable': True,
        'blueprint_recipe': {
            'ingredients': [
                'test_gun:blueprint_blank',
                'minecraft:red_stained_glass_pane',
                'minecraft:string'
            ]
        },
        'armor_recipe': {
            'pattern': [' B ', 'GSG', ' F '],
            'key': {
                'B': 'test_gun:blueprint_armor_goggles_red',
                'G': 'minecraft:red_stained_glass_pane',
                'S': 'minecraft:string',
                'F': 'test_gun:part_fabric_rag'
            }
        }
    }
}

print(f"Total gears to process: {len(GEAR_DEFS)}")

# 1. Copy geometries
geo_src = os.path.join(ATG_RP, 'models', 'entity')
geo_dst = os.path.join(RP_ROOT, 'models', 'entity')
os.makedirs(geo_dst, exist_ok=True)
for f in os.listdir(geo_src):
    if f.startswith('atg_') and f.endswith('.json'):
        shutil.copy2(os.path.join(geo_src, f), os.path.join(geo_dst, f))
print("Copied geometries.")

# 2. Copy textures
tex_entity_src = os.path.join(ATG_RP, 'textures', 'entity', 'pamobile')
tex_entity_dst = os.path.join(RP_ROOT, 'textures', 'entity', 'pamobile')
os.makedirs(tex_entity_dst, exist_ok=True)
for f in os.listdir(tex_entity_src):
    if f.endswith('.png'):
        shutil.copy2(os.path.join(tex_entity_src, f), os.path.join(tex_entity_dst, f))
print("Copied entity textures.")

tex_item_src = os.path.join(ATG_RP, 'textures', 'items', 'pamobile')
tex_item_dst = os.path.join(RP_ROOT, 'textures', 'items', 'pamobile')
os.makedirs(tex_item_dst, exist_ok=True)
for f in os.listdir(tex_item_src):
    if f.endswith('.png'):
        shutil.copy2(os.path.join(tex_item_src, f), os.path.join(tex_item_dst, f))
print("Copied item textures.")

# 3. Register textures in item_texture.json
item_tex_path = os.path.join(RP_ROOT, 'textures', 'item_texture.json')
with open(item_tex_path, 'r', encoding='utf-8') as fp:
    item_tex_data = json.load(fp)

for gid, ginfo in GEAR_DEFS.items():
    icon_key = f"test_gun_{gid}"
    item_tex_data['texture_data'][icon_key] = {'textures': ginfo['icon']}

    # Also register blueprint textures if has blueprint
    if ginfo.get('has_blueprint'):
        bp_icon_key = f"test_gun_blueprint_{gid}"
        q = ginfo.get('quality', 'blue')
        bp_tex_file = 'textures/blueprints/blueprint_rare'
        if q == 'gold':
            bp_tex_file = 'textures/blueprints/blueprint_legendary'
        elif q == 'purple':
            bp_tex_file = 'textures/blueprints/blueprint_epic'
        elif q == 'green':
            bp_tex_file = 'textures/blueprints/blueprint_common'
        item_tex_data['texture_data'][bp_icon_key] = {'textures': bp_tex_file}

# Components
item_tex_data['texture_data']['test_gun_part_armor_plate'] = {'textures': 'textures/items/pamobile/atg_armor_plate'}
item_tex_data['texture_data']['test_gun_part_iit'] = {'textures': 'textures/items/pamobile/atg_iit'}

with open(item_tex_path, 'w', encoding='utf-8') as fp:
    json.dump(item_tex_data, fp, indent=2, ensure_ascii=False)
print("Updated item_texture.json.")

# 4. Generate Attachables in RP
attach_dir = os.path.join(RP_ROOT, 'attachables')
os.makedirs(attach_dir, exist_ok=True)

for gid, ginfo in GEAR_DEFS.items():
    att_json = {
        "format_version": "1.8.0",
        "minecraft:attachable": {
            "description": {
                "identifier": f"test_gun:{gid}",
                "materials": {
                    "default": "armor",
                    "enchanted": "armor_enchanted"
                },
                "textures": {
                    "default": ginfo['tex'],
                    "enchanted": "textures/misc/enchanted_item_glint"
                },
                "geometry": {
                    "default": ginfo['geom']
                },
                "scripts": {
                    "parent_setup": ginfo['layer']
                },
                "render_controllers": [
                    "controller.render.armor"
                ]
            }
        }
    }
    with open(os.path.join(attach_dir, f"{gid}.json"), 'w', encoding='utf-8') as fp:
        json.dump(att_json, fp, indent=2)

print(f"Generated {len(GEAR_DEFS)} attachables.")

# 5. Generate Items in BP
items_dir = os.path.join(BP_ROOT, 'items')
os.makedirs(items_dir, exist_ok=True)

for gid, ginfo in GEAR_DEFS.items():
    slot_category = "itemGroup.name.chestplate"
    if 'head' in ginfo['slot']:
        slot_category = "itemGroup.name.helmet"
    elif 'legs' in ginfo['slot']:
        slot_category = "itemGroup.name.leggings"
    elif 'feet' in ginfo['slot']:
        slot_category = "itemGroup.name.boots"

    item_json = {
        "format_version": "1.20.80",
        "minecraft:item": {
            "description": {
                "identifier": f"test_gun:{gid}",
                "menu_category": {
                    "category": "equipment",
                    "group": slot_category
                }
            },
            "components": {
                "minecraft:icon": f"test_gun_{gid}",
                "minecraft:max_stack_size": 1,
                "minecraft:display_name": {
                    "value": f"{ginfo['name']}\n{ginfo['desc']}"
                },
                "minecraft:wearable": {
                    "slot": ginfo['slot'],
                    "protection": ginfo['protection']
                },
                "minecraft:durability": {
                    "max_durability": ginfo['durability']
                },
                "minecraft:repairable": {
                    "repair_items": [
                        {
                            "items": [
                                "test_gun:part_fabric_rag",
                                "test_gun:part_armor_plate",
                                "minecraft:iron_ingot"
                            ],
                            "repair_amount": ginfo['durability'] // 3
                        }
                    ]
                }
            }
        }
    }
    with open(os.path.join(items_dir, f"{gid}.json"), 'w', encoding='utf-8') as fp:
        json.dump(item_json, fp, indent=2, ensure_ascii=False)

    # Blueprints
    if ginfo.get('has_blueprint'):
        bp_id = f"blueprint_{gid}"
        q_label = "[稀有蓝图]"
        if ginfo['quality'] == 'gold':
            q_label = "§6[神话·绝密蓝图]§r"
        elif ginfo['quality'] == 'purple':
            q_label = "§5[史诗·战术蓝图]§r"
        elif ginfo['quality'] == 'blue':
            q_label = "§9[精良·军用蓝图]§r"
        elif ginfo['quality'] == 'green':
            q_label = "§a[优良·野战蓝图]§r"

        bp_item_json = {
            "format_version": "1.20.80",
            "minecraft:item": {
                "description": {
                    "identifier": f"test_gun:{bp_id}",
                    "menu_category": {
                        "category": "items"
                    }
                },
                "components": {
                    "minecraft:icon": f"test_gun_{bp_id}",
                    "minecraft:max_stack_size": 64,
                    "minecraft:display_name": {
                        "value": f"{ginfo['name']} 设计图纸 {q_label}"
                    }
                }
            }
        }
        with open(os.path.join(items_dir, f"{bp_id}.json"), 'w', encoding='utf-8') as fp:
            json.dump(bp_item_json, fp, indent=2, ensure_ascii=False)

# Components items
part_armor_plate_json = {
    "format_version": "1.20.80",
    "minecraft:item": {
        "description": {
            "identifier": "test_gun:part_armor_plate",
            "menu_category": { "category": "items" }
        },
        "components": {
            "minecraft:icon": "test_gun_part_armor_plate",
            "minecraft:max_stack_size": 64,
            "minecraft:display_name": {
                "value": "§9战术防弹插板 [精良]§r\n§7高级军用碳化硅/凯夫拉复合防弹插板，制造先进防弹背心的核心耗材。§r"
            }
        }
    }
}
with open(os.path.join(items_dir, "part_armor_plate.json"), 'w', encoding='utf-8') as fp:
    json.dump(part_armor_plate_json, fp, indent=2, ensure_ascii=False)

part_iit_json = {
    "format_version": "1.20.80",
    "minecraft:item": {
        "description": {
            "identifier": "test_gun:part_iit",
            "menu_category": { "category": "items" }
        },
        "components": {
            "minecraft:icon": "test_gun_part_iit",
            "minecraft:max_stack_size": 64,
            "minecraft:display_name": {
                "value": "§5图像增强管 (IIT) [史诗]§r\n§7高灵敏度微光增强核心光电倍增元件，制造双目与四目夜视仪不可或缺的尖端科技。§r"
            }
        }
    }
}
with open(os.path.join(items_dir, "part_iit.json"), 'w', encoding='utf-8') as fp:
    json.dump(part_iit_json, fp, indent=2, ensure_ascii=False)

print("Generated items and blueprints in BP.")

# 6. Generate Recipes in BP
recipes_dir = os.path.join(BP_ROOT, 'recipes')
os.makedirs(recipes_dir, exist_ok=True)

# 6.1 Component Recipes
recipe_armor_plate = {
    "format_version": "1.12.0",
    "minecraft:recipe_shaped": {
        "description": { "identifier": "test_gun:recipe_part_armor_plate" },
        "tags": [ "crafting_table" ],
        "pattern": [ "KK", "II", " C" ],
        "key": {
            "K": { "item": "test_gun:part_kevlar_sheet" },
            "I": { "item": "minecraft:iron_ingot" },
            "C": { "item": "test_gun:part_ceramic_plate" }
        },
        "result": { "item": "test_gun:part_armor_plate", "count": 2 }
    }
}
with open(os.path.join(recipes_dir, "recipe_part_armor_plate.json"), 'w', encoding='utf-8') as fp:
    json.dump(recipe_armor_plate, fp, indent=2)

recipe_iit = {
    "format_version": "1.12.0",
    "minecraft:recipe_shaped": {
        "description": { "identifier": "test_gun:recipe_part_iit" },
        "tags": [ "crafting_table" ],
        "pattern": [ " S ", "CMC", " R " ],
        "key": {
            "S": { "item": "minecraft:spyglass" },
            "C": { "item": "minecraft:amethyst_shard" },
            "M": { "item": "test_gun:part_mech_chip" },
            "R": { "item": "minecraft:redstone" }
        },
        "result": { "item": "test_gun:part_iit", "count": 1 }
    }
}
with open(os.path.join(recipes_dir, "recipe_part_iit.json"), 'w', encoding='utf-8') as fp:
    json.dump(recipe_iit, fp, indent=2)

# 6.2 Armor recipes & Blueprint recipes
for gid, ginfo in GEAR_DEFS.items():
    # Armor crafting recipe
    if 'armor_recipe' in ginfo:
        rec_info = ginfo['armor_recipe']
        pat = rec_info.get('pattern', [])
        keys = {}
        for k, v in rec_info.get('key', {}).items():
            keys[k] = { "item": v }
        
        recipe_armor = {
            "format_version": "1.12.0",
            "minecraft:recipe_shaped": {
                "description": { "identifier": f"test_gun:recipe_{gid}" },
                "tags": [ "crafting_table" ],
                "pattern": pat,
                "key": keys,
                "result": { "item": f"test_gun:{gid}", "count": 1 }
            }
        }
        with open(os.path.join(recipes_dir, f"recipe_{gid}.json"), 'w', encoding='utf-8') as fp:
            json.dump(recipe_armor, fp, indent=2)

    # Blueprint crafting recipe (ONLY for craftable blueprints!)
    if ginfo.get('has_blueprint') and ginfo.get('blueprint_craftable'):
        rec_info = ginfo.get('blueprint_recipe', {})
        ingreds = [{"item": item_id} for item_id in rec_info.get('ingredients', [])]
        recipe_bp = {
            "format_version": "1.12.0",
            "minecraft:recipe_shapeless": {
                "description": { "identifier": f"test_gun:recipe_blueprint_{gid}" },
                "tags": [ "crafting_table" ],
                "ingredients": ingreds,
                "result": { "item": f"test_gun:blueprint_{gid}", "count": 1 }
            }
        }
        with open(os.path.join(recipes_dir, f"recipe_blueprint_{gid}.json"), 'w', encoding='utf-8') as fp:
            json.dump(recipe_bp, fp, indent=2)

print("Generated recipes in BP.")

# 7. Update zh_CN.lang and en_US.lang
zh_lang_path = os.path.join(RP_ROOT, 'texts', 'zh_CN.lang')
en_lang_path = os.path.join(RP_ROOT, 'texts', 'en_US.lang')

with open(zh_lang_path, 'r', encoding='utf-8', errors='ignore') as fp:
    zh_content = fp.read()
with open(en_lang_path, 'r', encoding='utf-8', errors='ignore') as fp:
    en_content = fp.read()

zh_additions = ["\n### ADVANCE TACTICAL GEARS"]
en_additions = ["\n### ADVANCE TACTICAL GEARS"]

for gid, ginfo in GEAR_DEFS.items():
    zh_additions.append(f"item.test_gun:{gid}.name={ginfo['name']}")
    en_additions.append(f"item.test_gun:{gid}.name={ginfo['en_name']}")
    if ginfo.get('has_blueprint'):
        zh_additions.append(f"item.test_gun:blueprint_{gid}.name={ginfo['name']} 设计图纸")
        en_additions.append(f"item.test_gun:blueprint_{gid}.name={ginfo['en_name']} Blueprint")

zh_additions.append("item.test_gun:part_armor_plate.name=§9战术防弹插板 [精良]§r")
zh_additions.append("item.test_gun:part_iit.name=§5图像增强管 (IIT) [史诗]§r")
en_additions.append("item.test_gun:part_armor_plate.name=§9Tactical Armor Plate [Rare]§r")
en_additions.append("item.test_gun:part_iit.name=§5Image Intensifier Tube (IIT) [Epic]§r")

with open(zh_lang_path, 'a', encoding='utf-8', newline='\n') as fp:
    fp.write('\n'.join(zh_additions) + '\n')
with open(en_lang_path, 'a', encoding='utf-8', newline='\n') as fp:
    fp.write('\n'.join(en_additions) + '\n')

print("Updated language files.")
