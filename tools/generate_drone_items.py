# -*- coding: utf-8 -*-
import os
import json

bp_items_dir = 'addons/development/apocalypse_life_addon/apocalypse_life_bp/items'
parts_dir = os.path.join(bp_items_dir, 'drones_parts')
spawners_dir = os.path.join(bp_items_dir, 'drones')
blueprints_dir = os.path.join(bp_items_dir, 'drones_blueprints')

for d in [parts_dir, spawners_dir, blueprints_dir]:
    os.makedirs(d, exist_ok=True)

DRONES_INFO = [
    ("hummingbird", "「蜂鸟-I」侦察无人机", "ab_dr:hummingbird"),
    ("lifeline", "「生命线」战地急救机", "ab_dr:lifeline"),
    ("guardian_angel", "「守护天使」特战医疗机", "ab_dr:guardian_angel"),
    ("punisher", "「惩戒者」突击无人机", "ab_dr:punisher"),
    ("specter", "「幽灵」聚能激光机", "ab_dr:specter"),
    ("destroyer", "「毁灭者」重装突击机", "ab_dr:destroyer"),
    ("aurora", "「极光天灾」典藏母机", "ab_dr:aurora"),
    ("kamikaze", "「神风」巡飞自爆机", "ab_dr:kamikaze"),
    ("reaper", "「死神」腐蚀自爆机", "ab_dr:reaper"),
    ("camel", "「骆驼」重载货运机", "ab_dr:camel"),
    ("gale", "「疾风」战术增幅机", "ab_dr:gale"),
    ("abyssal", "「深渊主宰」典藏矩阵", "ab_dr:abyssal")
]

PARTS_INFO = [
    ("battery", "高能机载电池", "ab_dr:battery", 64),
    ("chip_t1", "智能飞控芯片 T1", "ab_dr:chip_t1", 64),
    ("chip_t2", "战术计算芯片 T2", "ab_dr:chip_t2", 64),
    ("chip_t3", "量子超频芯片 T3", "ab_dr:chip_t3", 64),
    ("rotor_motor", "旋翼无刷电机", "ab_dr:rotor_motor", 64),
    ("frame", "轻量碳纤骨架", "ab_dr:frame", 64),
    ("drone_controller", "战术便携遥控器", "ab_dr:drone_controller", 1)
]

def generate_items():
    # 1. Parts
    for pid, name, tex, stack in PARTS_INFO:
        item_obj = {
            "format_version": "1.21.40",
            "minecraft:item": {
                "description": {
                    "identifier": f"ab_dr:{pid}",
                    "menu_category": { "category": "items" }
                },
                "components": {
                    "minecraft:display_name": { "value": name },
                    "minecraft:max_stack_size": stack,
                    "minecraft:icon": {
                        "textures": { "default": tex }
                    }
                }
            }
        }
        with open(os.path.join(parts_dir, f"{pid}.json"), 'w', encoding='utf-8') as f:
            json.dump(item_obj, f, indent=2, ensure_ascii=False)

    # 2. Spawners (drones)
    for did, name, tex in DRONES_INFO:
        item_obj = {
            "format_version": "1.21.40",
            "minecraft:item": {
                "description": {
                    "identifier": f"ab_dr:spawner_{did}",
                    "menu_category": { "category": "items" }
                },
                "components": {
                    "minecraft:display_name": { "value": name },
                    "minecraft:max_stack_size": 1,
                    "minecraft:custom_components": [ "ab_ve:entity_spawner" ],
                    "minecraft:icon": {
                        "textures": { "default": tex }
                    }
                }
            }
        }
        with open(os.path.join(spawners_dir, f"{did}.json"), 'w', encoding='utf-8') as f:
            json.dump(item_obj, f, indent=2, ensure_ascii=False)

    # 3. Blueprints
    for did, name, _ in DRONES_INFO:
        bp_id = f"blueprint_{did}"
        item_obj = {
            "format_version": "1.21.40",
            "minecraft:item": {
                "description": {
                    "identifier": f"ab_dr:{bp_id}",
                    "menu_category": { "category": "items" }
                },
                "components": {
                    "minecraft:display_name": { "value": f"无人机蓝图：{name}" },
                    "minecraft:max_stack_size": 16,
                    "minecraft:icon": {
                        "textures": { "default": f"ab_dr:{bp_id}" }
                    }
                }
            }
        }
        with open(os.path.join(blueprints_dir, f"{bp_id}.json"), 'w', encoding='utf-8') as f:
            json.dump(item_obj, f, indent=2, ensure_ascii=False)

    print("All drone items generated successfully.")

if __name__ == '__main__':
    generate_items()
