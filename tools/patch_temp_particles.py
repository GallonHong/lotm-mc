# -*- coding: utf-8 -*-
import sys

def patch_temp_manager():
    path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/temperature/TemperatureManager.js"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    target = '''        // ----------------- 极寒分支 -----------------
        if (temp < 42) {
            // 阶段 1 (35 ~ 42)：轻微发凉，嘴边飘出呼气白雾粒子，无任何伤害
            if (temp >= 35) {
                try {
                    player.dimension.spawnParticle("minecraft:basic_smoke_particle", {
                        x: player.location.x,
                        y: player.location.y + 1.6,
                        z: player.location.z
                    });
                } catch {}
            }
            // 阶段 2 (20 ~ 35)：明显受寒，轻度减速 10%，寒颤音效，依然无伤害
            else if (temp >= 20) {
                try {
                    player.dimension.spawnParticle("minecraft:basic_smoke_particle", {
                        x: player.location.x,
                        y: player.location.y + 1.6,
                        z: player.location.z
                    });
                    if (currentTick % 100 === 0) {
                        player.runCommandAsync("playsound random.shiver @s ~~~ 0.6 1.0");
                    }
                } catch {}
            }
            // 阶段 3 (< 20)：严重失温，渐进惩罚期 (每 6 秒扣 1 点血，绝不秒杀)
            else {
                if (zoneType === "law") {
                    // 法制区高容错：仅给予虚弱，完全免疫致死冻伤
                    try { player.runCommandAsync("effect @s weakness 3 0 true"); } catch {}
                } else {
                    // 荒原区：每 6 秒 (120 Ticks) 扣除 1 点真实伤害
                    if (currentTick - lastDmg >= 120) {
                        this.lastDamageTicks.set(player.id, currentTick);
                        try {
                            const healthComp = player.getComponent(EntityComponentTypes.Health);
                            if (healthComp && healthComp.currentValue > 1) {
                                player.applyDamage(1);
                                player.runCommandAsync("playsound mob.player.hurt_freeze @s ~~~ 0.7 1.0");
                            }
                        } catch {}
                    }
                }
            }
        }
        // ----------------- 酷暑分支 -----------------
        else if (temp > 58) {
            // 阶段 1 (58 ~ 65)：轻微燥热，汗珠蒸发水汽粒子，无伤害
            if (temp <= 65) {
                try {
                    player.dimension.spawnParticle("minecraft:water_evaporation_bucket_emitter", {
                        x: player.location.x,
                        y: player.location.y + 1.7,
                        z: player.location.z
                    });
                } catch {}
            }
            // 阶段 2 (65 ~ 80)：明显闷热，粗重喘息音效，耐力加快消耗，依然无伤害
            else if (temp <= 80) {
                if (currentTick % 120 === 0) {
                    try { player.runCommandAsync("playsound mob.player.hurt_drown @s ~~~ 0.3 1.2"); } catch {}
                }
            }'''

    replacement = '''        // ----------------- 极寒分支 -----------------
        if (temp < 42) {
            // 阶段 1 & 2 (20 ~ 42)：轻微受寒与发凉，仅在自然呼吸周期 (每 5 秒 100 Ticks) 飘出微弱呼气白雾，无性能负担
            if (temp >= 20) {
                if (currentTick % 100 === 0) {
                    try {
                        player.dimension.spawnParticle("minecraft:basic_smoke_particle", {
                            x: player.location.x,
                            y: player.location.y + 1.6,
                            z: player.location.z
                        });
                    } catch {}
                }
                if (temp < 35 && currentTick % 160 === 0) {
                    try { player.runCommandAsync("playsound random.shiver @s ~~~ 0.5 1.0"); } catch {}
                }
            }
            // 阶段 3 (< 20)：严重失温，渐进惩罚期 (每 6 秒扣 1 点血，绝不秒杀)
            else {
                if (zoneType === "law") {
                    // 法制区高容错：仅给予虚弱，完全免疫致死冻伤
                    try { player.runCommandAsync("effect @s weakness 3 0 true"); } catch {}
                } else {
                    // 荒原区：每 6 秒 (120 Ticks) 扣除 1 点真实伤害
                    if (currentTick - lastDmg >= 120) {
                        this.lastDamageTicks.set(player.id, currentTick);
                        try {
                            const healthComp = player.getComponent(EntityComponentTypes.Health);
                            if (healthComp && healthComp.currentValue > 1) {
                                player.applyDamage(1);
                                player.runCommandAsync("playsound mob.player.hurt_freeze @s ~~~ 0.7 1.0");
                            }
                        } catch {}
                    }
                }
            }
        }
        // ----------------- 酷暑分支 -----------------
        else if (temp > 58) {
            // 阶段 1 (58 ~ 65)：轻微燥热，零粒子损耗，纯感官自然过渡
            // 阶段 2 (65 ~ 80)：明显闷热，低频粗重喘息音效，耐力消耗加快，无粒子负载
            if (temp <= 80) {
                if (temp > 65 && currentTick % 160 === 0) {
                    try { player.runCommandAsync("playsound mob.player.hurt_drown @s ~~~ 0.25 1.2"); } catch {}
                }
            }'''

    if target not in text:
        print("Target block not found in TemperatureManager.js")
        return False

    text = text.replace(target, replacement, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)

    print("Successfully patched TemperatureManager.js with optimized particle handling")
    return True

if __name__ == "__main__":
    if not patch_temp_manager():
        sys.exit(1)
