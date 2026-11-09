# -*- coding: utf-8 -*-
import os
import json

recipes_dir = 'addons/development/apocalypse_life_addon/apocalypse_life_bp/recipes/drones'
os.makedirs(recipes_dir, exist_ok=True)

def write_recipe(fname, obj):
    with open(os.path.join(recipes_dir, fname), 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)

def gen_recipes():
    # 1. Battery
    write_recipe("recipe_battery.json", {
        "format_version": "1.12.0",
        "minecraft:recipe_shaped": {
            "description": { "identifier": "ab_dr:craft_battery" },
            "tags": [ "crafting_table" ],
            "pattern": [ " R ", "ICI", " R " ],
            "key": {
                "R": { "item": "minecraft:redstone" },
                "C": { "item": "minecraft:copper_ingot" },
                "I": { "item": "minecraft:iron_ingot" }
            },
            "result": { "item": "ab_dr:battery", "count": 2 }
        }
    })

    # 2. Chip T1
    write_recipe("recipe_chip_t1.json", {
        "format_version": "1.12.0",
        "minecraft:recipe_shaped": {
            "description": { "identifier": "ab_dr:craft_chip_t1" },
            "tags": [ "crafting_table" ],
            "pattern": [ "GRG", "RER", "GRG" ],
            "key": {
                "G": { "item": "minecraft:gold_ingot" },
                "R": { "item": "minecraft:redstone" },
                "E": { "item": "minecraft:emerald" }
            },
            "result": { "item": "ab_dr:chip_t1", "count": 1 }
        }
    })

    # 3. Chip T2
    write_recipe("recipe_chip_t2.json", {
        "format_version": "1.12.0",
        "minecraft:recipe_shaped": {
            "description": { "identifier": "ab_dr:craft_chip_t2" },
            "tags": [ "crafting_table" ],
            "pattern": [ "LRL", "DCD", "LRL" ],
            "key": {
                "L": { "item": "minecraft:lapis_lazuli" },
                "R": { "item": "minecraft:redstone" },
                "D": { "item": "minecraft:diamond" },
                "C": { "item": "ab_dr:chip_t1" }
            },
            "result": { "item": "ab_dr:chip_t2", "count": 1 }
        }
    })

    # 4. Chip T3
    write_recipe("recipe_chip_t3.json", {
        "format_version": "1.12.0",
        "minecraft:recipe_shaped": {
            "description": { "identifier": "ab_dr:craft_chip_t3" },
            "tags": [ "crafting_table" ],
            "pattern": [ "DND", "RCR", "DND" ],
            "key": {
                "D": { "item": "minecraft:diamond" },
                "N": { "item": "minecraft:netherite_scrap" },
                "R": { "item": "minecraft:redstone_block" },
                "C": { "item": "ab_dr:chip_t2" }
            },
            "result": { "item": "ab_dr:chip_t3", "count": 1 }
        }
    })

    # 5. Rotor Motor
    write_recipe("recipe_rotor_motor.json", {
        "format_version": "1.12.0",
        "minecraft:recipe_shaped": {
            "description": { "identifier": "ab_dr:craft_rotor_motor" },
            "tags": [ "crafting_table" ],
            "pattern": [ " I ", "CRC", " I " ],
            "key": {
                "I": { "item": "minecraft:iron_ingot" },
                "C": { "item": "minecraft:copper_ingot" },
                "R": { "item": "minecraft:redstone" }
            },
            "result": { "item": "ab_dr:rotor_motor", "count": 2 }
        }
    })

    # 6. Frame
    write_recipe("recipe_frame.json", {
        "format_version": "1.12.0",
        "minecraft:recipe_shaped": {
            "description": { "identifier": "ab_dr:craft_frame" },
            "tags": [ "crafting_table" ],
            "pattern": [ "SIS", "I I", "SIS" ],
            "key": {
                "S": { "item": "survival_vehicle:scrap_metal" },
                "I": { "item": "minecraft:iron_ingot" }
            },
            "result": { "item": "ab_dr:frame", "count": 1 }
        }
    })

    # 7. Drone Controller
    write_recipe("recipe_drone_controller.json", {
        "format_version": "1.12.0",
        "minecraft:recipe_shaped": {
            "description": { "identifier": "ab_dr:craft_drone_controller" },
            "tags": [ "crafting_table" ],
            "pattern": [ " I ", "GCG", " R " ],
            "key": {
                "I": { "item": "minecraft:iron_ingot" },
                "G": { "item": "minecraft:glass_pane" },
                "C": { "item": "ab_dr:chip_t1" },
                "R": { "item": "minecraft:redstone" }
            },
            "result": { "item": "ab_dr:drone_controller", "count": 1 }
        }
    })

    # 8. Hummingbird Drone
    write_recipe("recipe_spawner_hummingbird.json", {
        "format_version": "1.12.0",
        "minecraft:recipe_shaped": {
            "description": { "identifier": "ab_dr:craft_spawner_hummingbird" },
            "tags": [ "crafting_table" ],
            "pattern": [ "M M", "FCB", "M M" ],
            "key": {
                "M": { "item": "ab_dr:rotor_motor" },
                "F": { "item": "ab_dr:frame" },
                "C": { "item": "ab_dr:chip_t1" },
                "B": { "item": "ab_dr:battery" }
            },
            "result": { "item": "ab_dr:spawner_hummingbird", "count": 1 }
        }
    })

    # 9. Camel Drone
    write_recipe("recipe_spawner_camel.json", {
        "format_version": "1.12.0",
        "minecraft:recipe_shaped": {
            "description": { "identifier": "ab_dr:craft_spawner_camel" },
            "tags": [ "crafting_table" ],
            "pattern": [ "M M", "FCX", "M M" ],
            "key": {
                "M": { "item": "ab_dr:rotor_motor" },
                "F": { "item": "ab_dr:frame" },
                "C": { "item": "ab_dr:chip_t1" },
                "X": { "item": "minecraft:chest" }
            },
            "result": { "item": "ab_dr:spawner_camel", "count": 1 }
        }
    })

    print("All drone recipes generated successfully.")

if __name__ == '__main__':
    gen_recipes()
