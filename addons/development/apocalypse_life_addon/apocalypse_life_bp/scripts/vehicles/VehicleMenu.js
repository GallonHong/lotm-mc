import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import * as VC from "./VehicleConstants.js";
import { FuelManager } from "./FuelManager.js";

/**
 * 载具改装工坊菜单（完全对接 SAPI Server 计分板经济）
 */
export class VehicleMenu {
    /**
     * 获取玩家当前计分板金币
     */
    static getPlayerMoney(player) {
        try {
            const objName = Config.economy.scoreboardObjective;
            const obj = world.scoreboard.getObjective(objName);
            if (!obj) return 0;
            const score = obj.getScore(player);
            return typeof score === "number" ? score : 0;
        } catch {
            return 0;
        }
    }

    /**
     * 扣除玩家金币
     */
    static deductPlayerMoney(player, amount) {
        try {
            const objName = Config.economy.scoreboardObjective;
            let obj = world.scoreboard.getObjective(objName);
            if (!obj) {
                obj = world.scoreboard.addObjective(objName, Config.economy.currencyName);
            }
            const current = obj.getScore(player) ?? 0;
            if (current >= amount) {
                obj.setScore(player, current - amount);
                return true;
            }
        } catch {}
        return false;
    }

    /**
     * 打开载具改装菜单
     */
    static openMenu(vehicle, player) {
        if (!vehicle || !vehicle.isValid() || !player) return;

        const typeId = vehicle.typeId;
        const money = this.getPlayerMoney(player);
        const fuel = Math.floor(FuelManager.getFuel(vehicle));

        // 查找车型名称
        let typeName = "末日载具";
        const allList = [...VC.vehicles.cars, ...VC.vehicles.planes, ...VC.vehicles.boats];
        const matched = allList.find(v => v.name === typeId);
        if (matched) typeName = matched.displayName;

        const colorId = vehicle.getProperty("ab_ve:color") || 0;
        const colorName = VC.VEHICLE_COLORS[colorId]?.name || "默认";

        // 当前改装等级
        const currSpeedLevel = vehicle.getProperty("ab_ve:max_speed") || 0;
        const currAccLevel = vehicle.getProperty("ab_ve:acceleration") || 0;
        const currSpecialLevel = vehicle.getProperty("ab_ve:special") || 0;

        // 下一级配置
        const speedList = VC.maxSpeedUpgrades[typeId] || [];
        const nextSpeed = speedList.find(u => u.level === currSpeedLevel + 1);

        const accList = VC.accelerationUpgrades[typeId] || [];
        const nextAcc = accList.find(u => u.level === currAccLevel + 1);

        const specList = VC.specialUpgrades[typeId] || [];
        const nextSpec = specList.find(u => u.level === currSpecialLevel + 1);

        const form = new ActionFormData()
            .title("§l§6末日载具改装工坊§r")
            .body(
                `§7型号: §f${typeName} §7| 颜色: §e${colorName}\n` +
                `§7油量: §a${fuel}% §7| 钱包余额: §6${money} ${Config.economy.currencySymbol}\n\n` +
                `§8选择升级项目以强化载具各项生存性能：`
            );

        // 按钮 1：最高时速
        if (nextSpeed) {
            form.button(
                `最高时速 [Lv.${currSpeedLevel} -> Lv.${currSpeedLevel + 1}]\n§e费用: ${nextSpeed.price} ${Config.economy.currencySymbol}`,
                "textures/asiagobagels/vehicles/ui/top_speed.png"
            );
        } else {
            form.button(`最高时速 [已达顶级 Lv.${currSpeedLevel} MAX]`, "textures/asiagobagels/vehicles/ui/top_speed.png");
        }

        // 按钮 2：加速度
        if (nextAcc) {
            form.button(
                `动力加速 [Lv.${currAccLevel} -> Lv.${currAccLevel + 1}]\n§e费用: ${nextAcc.price} ${Config.economy.currencySymbol}`,
                "textures/asiagobagels/vehicles/ui/acceleration.png"
            );
        } else {
            form.button(`动力加速 [已达顶级 Lv.${currAccLevel} MAX]`, "textures/asiagobagels/vehicles/ui/acceleration.png");
        }

        // 按钮 3：专属特权 (如果有)
        const hasSpecial = specList.length > 0;
        if (hasSpecial) {
            if (nextSpec) {
                form.button(
                    `专属特权: ${nextSpec.menu_name}\n§e费用: ${nextSpec.price} ${Config.economy.currencySymbol}`,
                    nextSpec.icon || "textures/asiagobagels/vehicles/ui/boost.png"
                );
            } else {
                form.button(`专属特权 [已达顶级 Lv.${currSpecialLevel} MAX]`, "textures/asiagobagels/vehicles/ui/boost.png");
            }
        }

        form.button("§c关闭菜单", "textures/asiagobagels/vehicles/ui/back.png");

        form.show(player).then(res => {
            if (res.canceled) return;
            const sel = res.selection;

            if (sel === 0) {
                // 升级最高时速
                this.handleUpgrade(vehicle, player, "ab_ve:max_speed", nextSpeed, "最高时速");
            } else if (sel === 1) {
                // 升级加速度
                this.handleUpgrade(vehicle, player, "ab_ve:acceleration", nextAcc, "动力加速");
            } else if (sel === 2 && hasSpecial) {
                // 升级专属特权
                this.handleUpgrade(vehicle, player, "ab_ve:special", nextSpec, nextSpec ? nextSpec.menu_name : "专属特权");
            }
        });
    }

    /**
     * 执行具体升级扣费
     */
    static handleUpgrade(vehicle, player, propKey, nextConfig, title) {
        if (!nextConfig) {
            player.sendMessage("§e[改装提示] 该项目已升级至最高等级！");
            player.runCommandAsync("playsound note.bell @s ~~~ 0.5");
            return;
        }

        const cost = nextConfig.price;
        const currentMoney = this.getPlayerMoney(player);

        if (currentMoney < cost) {
            player.sendMessage(`§c[改装失败] 金币不足！升级【${title}】需要 §e${cost} ${Config.economy.currencySymbol}§c，当前仅有 §e${currentMoney} ${Config.economy.currencySymbol}。`);
            player.runCommandAsync("playsound note.bass @s ~~~ 0.8");
            return;
        }

        if (this.deductPlayerMoney(player, cost)) {
            vehicle.setProperty(propKey, nextConfig.level);
            player.sendMessage(`§a[改装成功] 消耗 §e${cost} ${Config.economy.currencySymbol}§a，已将【${title}】成功升级至 Lv.${nextConfig.level}！`);
            player.runCommandAsync("playsound random.levelup @s ~~~ 0.8 1.2");
        } else {
            player.sendMessage("§c[改装异常] 扣费失败，请重试。");
        }
    }
}
