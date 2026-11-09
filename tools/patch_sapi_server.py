# Patch server_menu.js
with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js', 'r', encoding='utf-8') as f:
    menu_content = f.read()

target_vehicle_btn = '''        add("§l§6🚗 末日载具\\n§r§f召唤、召回、改装、加油与维修", "textures/items/blueprints/blueprint_truck", () => {
            Integration.send(player, "vehicle:open_garage");
        });'''

drone_btn = '''        add("§l§6🚗 末日载具\\n§r§f召唤、召回、改装、加油与维修", "textures/items/blueprints/blueprint_truck", () => {
            Integration.send(player, "vehicle:open_garage");
        });
        add("§l§b🛸 战术无人机\\n§r§f伴飞僚机、遥控开火、改装与充能", "textures/drones/items/drone_controller", () => {
            Integration.send(player, "drone:open_hangar");
        });'''

if 'drone:open_hangar' not in menu_content:
    menu_content = menu_content.replace(target_vehicle_btn, drone_btn)
    with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js', 'w', encoding='utf-8') as f:
        f.write(menu_content)
    print('Patched server_menu.js')

# Patch merchantConfig.js
with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/data/merchantConfig.js', 'r', encoding='utf-8') as f:
    merchant_content = f.read()

drone_merchant = '''    {
        id: "drones",
        name: "§b战术无人机商",
        icon: "textures/drones/items/drone_controller",
        description: "战术无人机图纸、控制元件与高能电池",
        items: [
            { id: "ab_dr:drone_controller", name: "便携无人机遥控器", buyPrice: 1500, sellPrice: 500 },
            { id: "ab_dr:battery", name: "无人机高能锂电池", buyPrice: 600, sellPrice: 200 },
            { id: "ab_dr:frame", name: "无人机机架", buyPrice: 800, sellPrice: 280 },
            { id: "ab_dr:rotor_motor", name: "高转速旋翼电机", buyPrice: 500, sellPrice: 160 },
            { id: "ab_dr:chip_t1", name: "T1 基础火控芯片", buyPrice: 1200, sellPrice: 400 },
            { id: "ab_dr:chip_t2", name: "T2 高级火控芯片", buyPrice: 3500, sellPrice: 1200 },
            { id: "ab_dr:chip_t3", name: "T3 典藏矩阵芯片", buyPrice: 9000, sellPrice: 3000 },
            { id: "ab_dr:blueprint_lifeline", name: "「生命线」急救机蓝图", buyPrice: 8000, dailyLimit: 1 },
            { id: "ab_dr:blueprint_punisher", name: "「惩戒者」突击机蓝图", buyPrice: 8000, dailyLimit: 1 },
            { id: "ab_dr:blueprint_specter", name: "「幽灵」激光机蓝图", buyPrice: 8000, dailyLimit: 1 },
            { id: "ab_dr:blueprint_kamikaze", name: "「神风」自爆机蓝图", buyPrice: 8000, dailyLimit: 1 },
            { id: "ab_dr:blueprint_gale", name: "「疾风」增幅机蓝图", buyPrice: 15000, dailyLimit: 1 },
        ],
    },
]);'''

if '"drones"' not in merchant_content:
    merchant_content = merchant_content.replace(']);', drone_merchant)
    with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/data/merchantConfig.js', 'w', encoding='utf-8') as f:
        f.write(merchant_content)
    print('Patched merchantConfig.js')

# Patch lotteryPools.js
with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/data/lotteryPools.js', 'r', encoding='utf-8') as f:
    lottery_content = f.read()

target_cand = '''export const LEGENDARY_FEATURED_CANDIDATES = Object.freeze(['''
rep_cand = '''export const LEGENDARY_FEATURED_CANDIDATES = Object.freeze([
    { key: "legendary_aurora", id: "ab_dr:blueprint_aurora", amount: 1, name: "§6「极光天灾」典藏战术母机蓝图", rarity: "legendary" },
    { key: "legendary_abyssal", id: "ab_dr:blueprint_abyssal", amount: 1, name: "§6「深渊主宰」典藏战术矩阵蓝图", rarity: "legendary" },"'''.replace(',"', ',')

target_epic = '''const LIMITED_EPIC_BLUEPRINTS = ['''
rep_epic = '''const LIMITED_EPIC_BLUEPRINTS = [
    { key: "epic_guardian_angel", id: "ab_dr:blueprint_guardian_angel", amount: 1, name: "§5「守护天使」特战医疗机蓝图", weight: 1, rarity: "epic", isPityTarget: true },
    { key: "epic_destroyer", id: "ab_dr:blueprint_destroyer", amount: 1, name: "§5「毁灭者」重装突击机蓝图", weight: 1, rarity: "epic", isPityTarget: true },
    { key: "epic_reaper", id: "ab_dr:blueprint_reaper", amount: 1, name: "§5「死神」腐蚀自爆机蓝图", weight: 1, rarity: "epic", isPityTarget: true },"'''.replace(',"', ',')

if 'legendary_aurora' not in lottery_content:
    lottery_content = lottery_content.replace(target_cand, rep_cand)
    lottery_content = lottery_content.replace(target_epic, rep_epic)
    with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/data/lotteryPools.js', 'w', encoding='utf-8') as f:
        f.write(lottery_content)
    print('Patched lotteryPools.js')
