# -*- coding: utf-8 -*-
import json

path = 'addons/development/apocalypse_life_addon/apocalypse_life_rp/textures/item_texture.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

tex_data = data.setdefault('texture_data', {})

new_items = {
    "ab_dr:battery": { "textures": "textures/drones/items/battery" },
    "ab_dr:chip_t1": { "textures": "textures/drones/items/drone_chip_1" },
    "ab_dr:chip_t2": { "textures": "textures/drones/items/drone_chip_2" },
    "ab_dr:chip_t3": { "textures": "textures/drones/items/drone_chip_3" },
    "ab_dr:drone_controller": { "textures": "textures/drones/items/drone_controller" },
    "ab_dr:rotor_motor": { "textures": "textures/items/parts/heli_rotor" },
    "ab_dr:frame": { "textures": "textures/items/parts/vehicle_chassis" },

    "ab_dr:hummingbird": { "textures": "textures/drones/items/summoner_drone" },
    "ab_dr:lifeline": { "textures": "textures/drones/items/ore_finder_drone" },
    "ab_dr:guardian_angel": { "textures": "textures/drones/items/healing_drone" },
    "ab_dr:punisher": { "textures": "textures/drones/items/mob_transporter_drone" },
    "ab_dr:specter": { "textures": "textures/drones/items/spy_drone" },
    "ab_dr:destroyer": { "textures": "textures/drones/items/mining_drone" },
    "ab_dr:aurora": { "textures": "textures/drones/items/laser_drone" },
    "ab_dr:kamikaze": { "textures": "textures/drones/items/tnt_launcher_drone" },
    "ab_dr:reaper": { "textures": "textures/drones/items/poison_drone" },
    "ab_dr:camel": { "textures": "textures/drones/items/inventory_drone" },
    "ab_dr:gale": { "textures": "textures/drones/items/race_drone" },
    "ab_dr:abyssal": { "textures": "textures/drones/items/water_drone" },

    "ab_dr:blueprint_hummingbird": { "textures": "textures/items/blueprints/blueprint_helicopter" },
    "ab_dr:blueprint_lifeline": { "textures": "textures/items/blueprints/blueprint_ambulance" },
    "ab_dr:blueprint_guardian_angel": { "textures": "textures/items/blueprints/blueprint_ambulance" },
    "ab_dr:blueprint_punisher": { "textures": "textures/items/blueprints/blueprint_truck" },
    "ab_dr:blueprint_specter": { "textures": "textures/items/blueprints/blueprint_truck" },
    "ab_dr:blueprint_destroyer": { "textures": "textures/items/blueprints/blueprint_truck" },
    "ab_dr:blueprint_aurora": { "textures": "textures/items/blueprints/blueprint_helicopter" },
    "ab_dr:blueprint_kamikaze": { "textures": "textures/items/blueprints/blueprint_motorcycle" },
    "ab_dr:blueprint_reaper": { "textures": "textures/items/blueprints/blueprint_motorcycle" },
    "ab_dr:blueprint_camel": { "textures": "textures/items/blueprints/blueprint_truck" },
    "ab_dr:blueprint_gale": { "textures": "textures/items/blueprints/blueprint_speedboat" },
    "ab_dr:blueprint_abyssal": { "textures": "textures/items/blueprints/blueprint_speedboat" }
}

for k, v in new_items.items():
    tex_data[k] = v

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print('Updated item_texture.json with all drone items.')
