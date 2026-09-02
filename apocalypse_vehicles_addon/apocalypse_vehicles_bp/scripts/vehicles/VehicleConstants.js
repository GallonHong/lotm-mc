/**
 * 载具核心参数表与改装价格定义 (货币：SAPI Server 金币)
 */

export const vehicles = {
    cars: [
        { name: "ab_ve:truck", displayName: "皮卡货车" },
        { name: "ab_ve:motorcycle", displayName: "越野摩托车" },
        { name: "ab_ve:ambulance", displayName: "战地救护车" }
    ],
    planes: [
        { name: "ab_ve:helicopter", displayName: "军用直升机" }
    ],
    boats: [
        { name: "ab_ve:speedboat", displayName: "冲锋快艇" }
    ]
};

// 最高时速改装 (价格单位：金币)
export const maxSpeedUpgrades = {
    "ab_ve:truck": [
        { level: 0, max_speed: 9, price: 0 },
        { level: 1, max_speed: 10, price: 2000 },
        { level: 2, max_speed: 11, price: 5000 },
        { level: 3, max_speed: 12, price: 12000 }
    ],
    "ab_ve:motorcycle": [
        { level: 0, max_speed: 10, price: 0 },
        { level: 1, max_speed: 12, price: 2000 },
        { level: 2, max_speed: 14, price: 5000 },
        { level: 3, max_speed: 16, price: 12000 }
    ],
    "ab_ve:ambulance": [
        { level: 0, max_speed: 10, price: 0 },
        { level: 1, max_speed: 11, price: 2000 },
        { level: 2, max_speed: 12, price: 5000 },
        { level: 3, max_speed: 13, price: 12000 }
    ],
    "ab_ve:speedboat": [
        { level: 0, max_speed: 9, price: 0 },
        { level: 1, max_speed: 11, price: 2000 },
        { level: 2, max_speed: 13, price: 5000 },
        { level: 3, max_speed: 15, price: 12000 }
    ],
    "ab_ve:helicopter": [
        { level: 0, max_speed: 5, price: 0 },
        { level: 1, max_speed: 6, price: 4000 },
        { level: 2, max_speed: 7, price: 9000 },
        { level: 3, max_speed: 8, price: 20000 }
    ]
};

// 加速度改装
export const accelerationUpgrades = {
    "ab_ve:truck": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 2000 },
        { level: 2, acceleration: 16, price: 5000 },
        { level: 3, acceleration: 18, price: 12000 }
    ],
    "ab_ve:motorcycle": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 2000 },
        { level: 2, acceleration: 16, price: 5000 },
        { level: 3, acceleration: 18, price: 12000 }
    ],
    "ab_ve:ambulance": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 2000 },
        { level: 2, acceleration: 16, price: 5000 },
        { level: 3, acceleration: 18, price: 12000 }
    ],
    "ab_ve:speedboat": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 2000 },
        { level: 2, acceleration: 16, price: 5000 },
        { level: 3, acceleration: 18, price: 12000 }
    ],
    "ab_ve:helicopter": [
        { level: 0, acceleration: 12, price: 0 },
        { level: 1, acceleration: 14, price: 4000 },
        { level: 2, acceleration: 16, price: 9000 },
        { level: 3, acceleration: 18, price: 20000 }
    ]
};

// 专属特性改装
export const specialUpgrades = {
    "ab_ve:truck": [
        { level: 0, special_value: 1, price: 0, menu_name: "后斗货仓 (9格)", icon: "textures/asiagobagels/vehicles/ui/storage.png" },
        { level: 1, special_value: 2, price: 3000, menu_name: "中型货仓 (18格)", icon: "textures/asiagobagels/vehicles/ui/storage.png" },
        { level: 2, special_value: 3, price: 8000, menu_name: "重型货仓 (27格)", icon: "textures/asiagobagels/vehicles/ui/storage.png" }
    ],
    "ab_ve:ambulance": [
        { level: 0, range_value: 4, amplifier: 0, price: 0, menu_name: "基础医疗光环 (半径4格, 恢复I)", icon: "textures/asiagobagels/vehicles/ui/healing.png" },
        { level: 1, range_value: 6, amplifier: 1, price: 4000, menu_name: "强化医疗光环 (半径6格, 恢复II)", icon: "textures/asiagobagels/vehicles/ui/healing.png" },
        { level: 2, range_value: 8, amplifier: 2, price: 10000, menu_name: "高能战地医疗 (半径8格, 恢复III)", icon: "textures/asiagobagels/vehicles/ui/healing.png" }
    ]
};

// 16 种车漆涂装
export const VEHICLE_COLORS = {
    0: { name: "纯白 (White)" },
    1: { name: "浅灰 (Light Gray)" },
    2: { name: "深灰 (Gray)" },
    3: { name: "哑光黑 (Black)" },
    4: { name: "棕褐 (Brown)" },
    5: { name: "战术红 (Red)" },
    6: { name: "亮橙 (Orange)" },
    7: { name: "警示黄 (Yellow)" },
    8: { name: "荧光绿 (Lime)" },
    9: { name: "军绿 (Green)" },
    10: { name: "青蓝 (Cyan)" },
    11: { name: "天蓝 (Light Blue)" },
    12: { name: "海军蓝 (Blue)" },
    13: { name: "暗紫 (Purple)" },
    14: { name: "品红 (Magenta)" },
    15: { name: "粉红 (Pink)" },
};
