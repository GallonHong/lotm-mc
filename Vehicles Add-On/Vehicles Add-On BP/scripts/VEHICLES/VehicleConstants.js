
export const vehicles = {
    cars: [
        { name: "ab_ve:common_car" },
        { name: "ab_ve:truck" },
        { name: "ab_ve:racing_car" },
        { name: "ab_ve:motorcycle" },
        { name: "ab_ve:sports_car" },
        { name: "ab_ve:ambulance" },
        { name: "ab_ve:pathmaker" },
        { name: "ab_ve:police_car" },
        { name: "ab_ve:bus" },
        { name: "ab_ve:drill" },
        { name: "ab_ve:fire_truck" },
        { name: "ab_ve:harvester" }
    ],
    planes: [
        { name: "ab_ve:common_plane" },
        { name: "ab_ve:private_jet" },
        { name: "ab_ve:helicopter" },
        { name: "ab_ve:cargo_helicopter" }
    ],
    boats: [
        { name: "ab_ve:jetski" },
        { name: "ab_ve:fishing_trawler" },
        { name: "ab_ve:speedboat" }
    ]
};

export const maxSpeedUpgrades = {
    "ab_ve:jetski": [
        { level: 0, max_speed: 9, price: 0 }
    ],
    "ab_ve:fishing_trawler": [
        { level: 0, max_speed: 9, price: 0 }
    ],
    "ab_ve:speedboat": [
        { level: 0, max_speed: 9, price: 0 }
    ],
    "ab_ve:helicopter": [
        { level: 0, max_speed: 5, price: 0 },
        { level: 1, max_speed: 6, price: 1 },
        { level: 2, max_speed: 7, price: 2 },
        { level: 3, max_speed: 8, price: 3 }
    ],
    "ab_ve:cargo_helicopter": [
        { level: 0, max_speed: 4, price: 0 },
        { level: 1, max_speed: 5, price: 1 },
        { level: 2, max_speed: 6, price: 2 }
    ],
    "ab_ve:private_jet": [
        { level: 0, max_speed: 10, price: 0 },
        { level: 1, max_speed: 12, price: 1 },
        { level: 2, max_speed: 14, price: 2 },
        { level: 3, max_speed: 16, price: 3 }
    ],
    "ab_ve:common_plane": [
        { level: 0, max_speed: 10, price: 0 },
        { level: 1, max_speed: 12, price: 1 },
        { level: 2, max_speed: 14, price: 2 },
        { level: 3, max_speed: 16, price: 3 }
    ],
    "ab_ve:common_car": [
        { level: 0, max_speed: 8, price: 0 },
        { level: 1, max_speed: 10, price: 1 },
        { level: 2, max_speed: 12, price: 2 },
        { level: 3, max_speed: 14, price: 3 }
    ],
    "ab_ve:motorcycle": [
        { level: 0, max_speed: 10, price: 0 },
        { level: 1, max_speed: 12, price: 1 },
        { level: 2, max_speed: 14, price: 2 },
        { level: 3, max_speed: 16, price: 3 }
    ],
    "ab_ve:truck": [
        { level: 0, max_speed: 9, price: 0 },
        { level: 1, max_speed: 10, price: 1 },
        { level: 2, max_speed: 11, price: 2 },
        { level: 3, max_speed: 12, price: 3 }
    ],
    "ab_ve:racing_car": [
        { level: 0, max_speed: 11, price: 0 },
        { level: 1, max_speed: 13, price: 1 },
        { level: 2, max_speed: 15, price: 2 },
        { level: 3, max_speed: 17, price: 3 }
    ],
    "ab_ve:sports_car": [
        { level: 0, max_speed: 10, price: 0 },
        { level: 1, max_speed: 12, price: 1 },
        { level: 2, max_speed: 14, price: 2 },
        { level: 3, max_speed: 16, price: 3 }
    ],
    "ab_ve:ambulance": [
        { level: 0, max_speed: 10, price: 0 },
        { level: 1, max_speed: 11, price: 1 },
        { level: 2, max_speed: 12, price: 2 },
        { level: 3, max_speed: 13, price: 3 }
    ],
    "ab_ve:pathmaker": [
        { level: 0, max_speed: 2, price: 0 }
    ],
    "ab_ve:police_car": [
        { level: 0, max_speed: 11, price: 0 },
        { level: 1, max_speed: 12, price: 1 },
        { level: 2, max_speed: 13, price: 2 },
        { level: 3, max_speed: 14, price: 3 }
    ],
    "ab_ve:bus": [
        { level: 0, max_speed: 6, price: 0 },
        { level: 1, max_speed: 7, price: 1 },
        { level: 2, max_speed: 8, price: 2 },
        { level: 3, max_speed: 9, price: 3 }
    ],
    "ab_ve:drill": [
        { level: 0, max_speed: 2, price: 0 },
        { level: 1, max_speed: 3, price: 1 },
        { level: 2, max_speed: 4, price: 2 }
    ],
    "ab_ve:fire_truck": [
        { level: 0, max_speed: 8, price: 0 },
        { level: 1, max_speed: 9, price: 1 },
        { level: 2, max_speed: 10, price: 2 },
        { level: 3, max_speed: 11, price: 3 }
    ],
    "ab_ve:harvester": [
        { level: 0, max_speed: 2, price: 0 }
    ]
};

export const accelerationUpgrades = {
    "ab_ve:jetski": [
        { level: 0, acceleration: 12, price: 0 }
    ], 
    "ab_ve:fishing_trawler": [
        { level: 0, acceleration: 12, price: 0 }
    ], 
    "ab_ve:speedboat": [
        { level: 0, acceleration: 12, price: 0 }
    ], 
    "ab_ve:helicopter": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ], 
    "ab_ve:cargo_helicopter": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ],
    "ab_ve:private_jet": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ],
    "ab_ve:common_plane": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ],
    "ab_ve:common_car": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ],
    "ab_ve:motorcycle": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ],
    "ab_ve:truck": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ],
    "ab_ve:racing_car": [
        { level: 0, acceleration: 14, price: 0 },
        { level: 1, acceleration: 16, price: 1 },
        { level: 2, acceleration: 18, price: 2 },
        { level: 3, acceleration: 20, price: 3 }
    ],
    "ab_ve:sports_car": [
        { level: 0, acceleration: 13, price: 0 },
        { level: 1, acceleration: 15, price: 1 },
        { level: 2, acceleration: 17, price: 2 },
        { level: 3, acceleration: 19, price: 3 }
    ],
    "ab_ve:ambulance": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ],
    "ab_ve:pathmaker": [
        { level: 0, acceleration: 5, price: 0 }
    ],
    "ab_ve:police_car": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ],
    "ab_ve:bus": [
        { level: 0, acceleration: 8, price: 0 },
        { level: 1, acceleration: 9, price: 1 },
        { level: 2, acceleration: 10, price: 2 },
        { level: 3, acceleration: 11, price: 3 }
    ],
    "ab_ve:drill": [
        { level: 0, acceleration: 3, price: 0 },
        { level: 1, acceleration: 4, price: 1 },
        { level: 2, acceleration: 5, price: 2 },
        { level: 3, acceleration: 6, price: 3 }
    ],
    "ab_ve:fire_truck": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 1 },
        { level: 2, acceleration: 16, price: 2 },
        { level: 3, acceleration: 18, price: 3 }
    ],
    "ab_ve:harvester": [
        { level: 0, acceleration: 5, price: 0 }
    ]
};

export const specialUpgrades = {
    "ab_ve:racing_car": [
        { level: 0, special_value: 6, price: 0, menu_name: "Boost Duration", icon: "textures/asiagobagels/vehicles/ui/boost.png" },
        { level: 1, special_value: 5, price: 1, menu_name: "Boost Duration", icon: "textures/asiagobagels/vehicles/ui/boost.png" },
        { level: 2, special_value: 4, price: 2, menu_name: "Boost Duration", icon: "textures/asiagobagels/vehicles/ui/boost.png" },
        { level: 3, special_value: 3, price: 3, menu_name: "Boost Duration", icon: "textures/asiagobagels/vehicles/ui/boost.png" }
    ],
    "ab_ve:truck": [
        { level: 0, special_value: 1, price: 0, menu_name: "Storage Space", icon: "textures/asiagobagels/vehicles/ui/storage.png" },
        { level: 1, special_value: 2, price: 1, menu_name: "Storage Space", icon: "textures/asiagobagels/vehicles/ui/storage.png" },
        { level: 2, special_value: 3, price: 2, menu_name: "Storage Space", icon: "textures/asiagobagels/vehicles/ui/storage.png" }
    ],
    "ab_ve:drill": [
        { level: 0, special_value: 1, price: 0, menu_name: "Storage Space", icon: "textures/asiagobagels/vehicles/ui/storage.png" },
        { level: 1, special_value: 2, price: 1, menu_name: "Storage Space", icon: "textures/asiagobagels/vehicles/ui/storage.png" },
        { level: 2, special_value: 3, price: 2, menu_name: "Storage Space", icon: "textures/asiagobagels/vehicles/ui/storage.png" }
    ],
    "ab_ve:harvester": [
        { level: 0, special_value: 1, price: 0, menu_name: "Storage Space", icon: "textures/asiagobagels/vehicles/ui/storage.png" },
        { level: 1, special_value: 2, price: 1, menu_name: "Storage Space", icon: "textures/asiagobagels/vehicles/ui/storage.png" },
        { level: 2, special_value: 3, price: 2, menu_name: "Storage Space", icon: "textures/asiagobagels/vehicles/ui/storage.png" }
    ],
    "ab_ve:ambulance": [
        { level: 0, range_value: 4, amplifier: 0, price: 0, menu_name: "Heal Range", icon: "textures/asiagobagels/vehicles/ui/healing.png" },
        { level: 1, range_value: 5, amplifier: 1, price: 1, menu_name: "Heal Range", icon: "textures/asiagobagels/vehicles/ui/healing.png" },
        { level: 2, range_value: 6, amplifier: 2, price: 2, menu_name: "Heal Range", icon: "textures/asiagobagels/vehicles/ui/healing.png" }
    ],
    "ab_ve:fishing_trawler": [
        { level: 0, special_value: 2, price: 0, menu_name: "Fishing Efficiency", icon: "textures/asiagobagels/vehicles/ui/fishing.png" },
        { level: 1, special_value: 3, price: 1, menu_name: "Fishing Efficiency", icon: "textures/asiagobagels/vehicles/ui/fishing.png" },
        { level: 2, special_value: 4, price: 2, menu_name: "Fishing Efficiency", icon: "textures/asiagobagels/vehicles/ui/fishing.png" },
        { level: 3, special_value: 5, price: 3, menu_name: "Fishing Efficiency", icon: "textures/asiagobagels/vehicles/ui/fishing.png" }
    ]
};

export const VEHICLE_COLORS = {
    0: { name: "White" },
    1: { name: "Light Gray" },
    2: { name: "Gray" },
    3: { name: "Black" },
    4: { name: "Brown" },
    5: { name: "Red" },
    6: { name: "Orange" },
    7: { name: "Yellow" },
    8: { name: "Lime" },
    9: { name: "Green" },
    10: { name: "Cyan" },
    11: { name: "Light Blue" },
    12: { name: "Blue" },
    13: { name: "Purple" },
    14: { name: "Magenta" },
    15: { name: "Pink" },
};

export const FISH_CATCH_WEIGHTS = [
    { name: "minecraft:kelp", weight: 20 },
    { name: "minecraft:cod", weight: 30 },
    { name: "minecraft:salmon", weight: 30 },
    { name: "minecraft:tropical_fish", weight: 25 },
    { name: "minecraft:pufferfish", weight: 15 },
    { name: "minecraft:ink_sac", weight: 10 },
    { name: "minecraft:glowing_ink_sac", weight: 5 }
];

export const DrillPickups = [
    "minecraft:stone",
    "minecraft:cobblestone",
    "minecraft:mossy_cobblestone",
    "minecraft:grass",
    "minecraft:dirt",
    "minecraft:sand",
    "minecraft:snow",
    "minecraft:snowball",
    "minecraft:gravel",
    "minecraft:flint",
    "minecraft:leaves",
    "minecraft:apple",
    "minecraft:leaves2",
    "minecraft:jungle_sapling",
    "minecraft:moss_block",
    "minecraft:diamond_ore",
    "minecraft:diamond",
    "minecraft:gold_ore",
    "minecraft:raw_gold",
    "minecraft:emerald_ore",
    "minecraft:emerald",
    "minecraft:coal_ore",
    "minecraft:coal",
    "minecraft:iron_ore",
    "minecraft:raw_iron",
    "minecraft:copper_ore",
    "minecraft:raw_copper",
    "minecraft:redstone_ore",
    "minecraft:redstone",
    "minecraft:deepslate_diamond_ore",
    "minecraft:deepslate_gold_ore",
    "minecraft:deepslate_emerald_ore",
    "minecraft:deepslate_coal_ore",
    "minecraft:deepslate_iron_ore",
    "minecraft:deepslate_copper_ore",
    "minecraft:deepslate_redstone_ore",
    "minecraft:deepslate",
    "minecraft:cobbled_deepslate",
    "minecraft:tuff",
    "minecraft:hardened_clay",
    "minecraft:stained_hardened_clay",
    "minecraft:sandstone"
];
export const HarvesterBlocks = [
    { blockType: "minecraft:wheat", maxGrowthStage: 7, outcomes: [{ itemType: "minecraft:wheat", quantity: 2 }, { itemType: "minecraft:wheat_seeds", quantity: 1 }], seedsBlock: "minecraft:wheat", seedItem: "minecraft:wheat_seeds" },
    { blockType: "minecraft:carrots", maxGrowthStage: 7, outcomes: [{ itemType: "minecraft:carrot", quantity: 2 }], seedsBlock: "minecraft:carrots", seedItem: "minecraft:carrot" },
    { blockType: "minecraft:potatoes", maxGrowthStage: 7, outcomes: [{ itemType: "minecraft:potato", quantity: 2 }], seedsBlock: "minecraft:potatoes", seedItem: "minecraft:potato" },
    { blockType: "minecraft:beetroot", maxGrowthStage: 7, outcomes: [{ itemType: "minecraft:beetroot", quantity: 2 }, { itemType: "minecraft:beetroot_seeds", quantity: 1 }], seedsBlock: "minecraft:beetroot", seedItem: "minecraft:beetroot_seeds" },
];

export const groundVehicleData = {
    "Common Car": {
        description: "A classic car, nothing special but it drives!",
        specials: "- Hold jump to honk! \n- Punch while driving to toggle lights",
        howToGet: "Iron Ingots, Glass and Dried Kelp",
        image: "textures/asiagobagels/vehicles/items/common_car.png",
    },
    "Sports Car": {
        description: "A fast and stylish ride for the road!",
        specials: "- Hold jump to honk! \n- Punch while driving to toggle lights",
        howToGet: "Iron Block, Tinted Glass, Iron Ingot and Dried Kelp",
        image: "textures/asiagobagels/vehicles/items/sports_car.png",
    },
    "Racing Car": {
        description: "A high-speed car built for racing!",
        specials: "- Hold jump to boost!",
        howToGet: "Iron Block, Iron Ingot, and Dried Kelp",
        image: "textures/asiagobagels/vehicles/items/racing_car.png",
    },
    "Truck": {
        description: "A large truck with plenty of storage!",
        specials: "- Has extra inventory space\n- Hold jump to honk! \n- Punch while driving to toggle lights",
        howToGet: "Iron Ingots, Glass, Chest, Dried Kelp and Iron Block",
        image: "textures/asiagobagels/vehicles/items/truck.png",
    },
    "Bus": {
        description: "A public transport vehicle that seats many players!",
        specials: "- Can hold many players\n- Hold jump to honk! \n- Punch while driving to toggle lights",
        howToGet: "Iron Ingots, Dried Kelp, Planks, Glass",
        image: "textures/asiagobagels/vehicles/items/bus.png",
    },
    "Harvester": {
        description: "A farming vehicle that automatically harvests crops!",
        specials: "- Hold jump to harvest/regrow/create farmland",
        howToGet: "Iron Block, Diamond Hoe, Iron Ingot and Dried Kelp",
        image: "textures/asiagobagels/vehicles/items/harvester.png",
    },
    "Drill": {
        description: "A powerful vehicle for mining resources!",
        specials: "- Press jump to toggle drill\n- Automatically mines blocks in front of it",
        howToGet: "Iron Block, Redstone Block and Iron Ingot",
        image: "textures/asiagobagels/vehicles/items/drill.png",
    },
    "Ambulance": {
        description: "A medical emergency vehicle!",
        specials: "- Press jump to trigger a heal aura\n- Punch while driving to toggle lights and sirene",
        howToGet: "Dried Kelp, Glass, Iron Ingot, Red Stained Glass, Blue Stained Glass",
        image: "textures/asiagobagels/vehicles/items/ambulance.png",
    },
    "Fire Truck": {
        description: "A fire rescue vehicle equipped with water cannons!",
        specials: "- Hold jump to shoot a stream of water that can extinguish fire\n- Punch while driving to toggle lights and sirene",
        howToGet: "Dried Kelp, Glass, Iron Ingot, Red Stained Glass, Blue Stained Glass and a Water Bucket",
        image: "textures/asiagobagels/vehicles/items/firetruck.png",
    },
    "Police Car": {
        description: "A police patrol car!",
        specials: "- Punch while driving to toggle lights and sirene",
        howToGet: "Dried Kelp, Glass, Iron Ingot, Red Stained Glass, Blue Stained Glass and Iron Bars",
        image: "textures/asiagobagels/vehicles/items/police_car.png",
    },
    "Pathmaker": {
        description: "A utility vehicle that creates roads!",
        specials: "- Hold jump to create a road using the blocks inside vehicles inventory",
        howToGet: "Iron Block, Wool, Iron Ingot and Dried Kelp",
        image: "textures/asiagobagels/vehicles/items/pathmaker.png",
    },
    "Motorcycle": {
        description: "A fast and nimble two-wheeled vehicle!",
        specials: "- Press jump to wheely for style\n- Punch while driving to toggle lights",
        howToGet: "Wool, Dried Kelp and Iron Ingot",
        image: "textures/asiagobagels/vehicles/items/motorcycle.png",
    },
};

export const waterVehicleData = {
    "Jetski": {
        description: "A small speedy water vehicle that seats one person!",
        specials: "No specials available.",
        howToGet: "Iron Ingot and Wool",
        image: "textures/asiagobagels/vehicles/items/jetski.png",
    },
    "Speed Boat": {
        description: "A fast boat for ocean adventures!",
        specials: "No specials available.",
        howToGet: "Iron Block, Iron Ingot and Planks",
        image: "textures/asiagobagels/vehicles/items/speedboat.png",
    },
    "Fishing Trawler": {
        description: "A large boat designed for mass fishing!",
        specials: "- Press jump to attempt catching fish",
        howToGet: "String, Iron Ingot and Planks",
        image: "textures/asiagobagels/vehicles/items/fishing_trawler.png",
    },
};

export const airVehicleData = {
    "Common Plane": {
        description: "A basic plane ready to explore the skies!",
        specials: "- Press jump to switch perspective",
        howToGet: "Iron Block, Glass and Iron Ingot",
        image: "textures/asiagobagels/vehicles/items/common_plane.png",
    },
    "Private Jet": {
        description: "A luxury aircraft for VIP travel!",
        specials: "- Extra seats for passengers \n- Press jump to switch perspective",
        howToGet: "Iron Block, Gold Block and Glass",
        image: "textures/asiagobagels/vehicles/items/private_jet.png",
    },
    "Helicopter": {
        description: "A versatile aircraft capable of hovering!",
        specials: "- Can hover in place",
        howToGet: "Glass and Iron Ingot",
        image: "textures/asiagobagels/vehicles/items/helicopter.png",
    },
    "Cargo Helicopter": {
        description: "A heavy-duty helicopter for transporting entities!",
        specials: "- Can hover in place\n-Press jump to toggle entity magnet",
        howToGet: "Redstone Block, Glass and Iron Ingot",
        image: "textures/asiagobagels/vehicles/items/cargo_heli.png",
    },
};
