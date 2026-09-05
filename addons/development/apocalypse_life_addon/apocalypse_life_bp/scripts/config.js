/**
 * Apocalypse Life - 全局配置
 * 兼容 SAPI Server 经济系统与末日枪械体系
 */
export const Config = {
    // 经济系统兼容配置
    economy: {
        scoreboardObjective: "money", // 绑定 SAPI Server 的金币计分板
        currencyName: "金币",
        currencySymbol: "⛁"
    },

    // 燃油系统基础配置
    fuel: {
        maxFuel: 100,
        defaultSpawnFuel: 100, // 刚造出来默认满油
        refuelAmount: 100,      // 满装汽油桶提供的油量
        // 每 tick 燃油消耗速率 (20 ticks = 1秒)
        consumptionRates: {
            "ab_ve:helicopter": 0.025, // 约每秒 0.5 点 (~3.3分钟连续高强度滞空)
            "ab_ve:truck": 0.015,      // 约每秒 0.3 点 (~5.5分钟连续行驶)
            "ab_ve:ambulance": 0.015,  // 约每秒 0.3 点
            "ab_ve:speedboat": 0.018,  // 约每秒 0.36 点
            "ab_ve:motorcycle": 0.010  // 约每秒 0.2 点 (~8.3分钟极速狂飙)
        }
    }
};
