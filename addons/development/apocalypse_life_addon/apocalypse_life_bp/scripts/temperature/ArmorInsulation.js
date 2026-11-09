import { EquipmentSlot } from "@minecraft/server";

/**
 * 护甲防寒与散热性能配置表
 * cold: 防寒保暖指数 (0.0 ~ 1.0, 降低寒冷侵袭)
 * heat: 散热排汗指数 (正数为利于散热防中暑，负数为过于厚重闷热)
 */
const ARMOR_PROPERTIES = {
 // 1. Test Guns 特战防风防寒系列 (Gorka / BDU / 猎人)
 "armor_gorka_bottom": { cold: 0.25, heat: -0.08 },
 "armor_bdu_woodland_top": { cold: 0.22, heat: -0.05 },
 "armor_bdu_woodland_bottom": { cold: 0.20, heat: -0.05 },
 "cloth_hunting_vest": { cold: 0.22, heat: 0.05 },

 // 2. Test Guns 密闭与吉利服伪装系列 (极高锁温保暖)
 "armor_black_ghillie": { cold: 0.30, heat: -0.15 },
 "armor_epic_ghillie_suit": { cold: 0.35, heat: -0.18 },
 "armor_oak_ghillie": { cold: 0.30, heat: -0.15 },
 "armor_hazmat_top": { cold: 0.32, heat: -0.20 }, // 防化服全密闭防风

 // 3. Test Guns 重型防弹装具系列 (防寒优良，夏日偏闷)
 "armor_titan_chest": { cold: 0.28, heat: -0.15 },
 "armor_epic_titan_vest": { cold: 0.30, heat: -0.18 },
 "armor_killa_6b13": { cold: 0.26, heat: -0.12 },
 "armor_emr_6b13": { cold: 0.25, heat: -0.12 },
 "armor_assault_vest": { cold: 0.22, heat: -0.08 },
 "armor_vest_heavy": { cold: 0.24, heat: -0.10 },
 "armor_police_vest": { cold: 0.18, heat: -0.05 },

 // 4. Test Guns 轻型透气散热系列 (夏季首选)
 "armor_vest_light": { cold: 0.08, heat: 0.22 },
 "armor_jpc_2": { cold: 0.10, heat: 0.18 },
 "armor_jpc_2_desert": { cold: 0.08, heat: 0.25 }, // 沙漠轻装，强力散热
 "armor_ala_spc": { cold: 0.12, heat: 0.15 },

 // 5. Test Guns 头盔与面罩系列
 "armor_tactical_helmet": { cold: 0.12, heat: 0.02 },
 "armor_helmet_tactical": { cold: 0.12, heat: 0.02 },
 "armor_mch_fc": { cold: 0.14, heat: 0.0 },
 "armor_mlt_hg2": { cold: 0.14, heat: 0.0 },
 "armor_gasmask": { cold: 0.10, heat: -0.06 },
 "armor_m50": { cold: 0.10, heat: -0.06 },

 // 6. Test Guns 护腿与战术靴系列
 "armor_wasp_boots": { cold: 0.15, heat: 0.05 },
 "armor_wasp_pants": { cold: 0.16, heat: 0.02 },
 "armor_immortal_pants": { cold: 0.18, heat: -0.05 },
 "armor_mob_pants": { cold: 0.15, heat: 0.0 },

 // 7. 原版皮革套装 (末日经典保暖夹克与雪地皮靴)
 "minecraft:leather_helmet": { cold: 0.18, heat: -0.04 },
 "minecraft:leather_chestplate": { cold: 0.30, heat: -0.08 },
 "minecraft:leather_leggings": { cold: 0.22, heat: -0.05 },
 "minecraft:leather_boots": { cold: 0.18, heat: -0.04 },

 // 8. 原版金属护甲 (导热导冷，基础防寒防暑中性)
 "minecraft:iron_chestplate": { cold: 0.12, heat: -0.06 },
 "minecraft:diamond_chestplate": { cold: 0.14, heat: -0.06 },
 "minecraft:netherite_chestplate": { cold: 0.16, heat: -0.08 }
};

export class ArmorInsulation {
 /**
  * 获取玩家全身护甲的综合防寒与散热系数
  * @param {Player} player 
  * @returns {{ coldResistance: number, heatResistance: number }}
  */
 static getPlayerInsulation(player) {
  if (!player || !player.isValid()) {
   return { coldResistance: 0, heatResistance: 0 };
  }

  let totalCold = 0;
  let totalHeat = 0;

  try {
   const equippable = player.getComponent("minecraft:equippable");
   if (!equippable) return { coldResistance: 0, heatResistance: 0 };

   const slots = [
    EquipmentSlot.Head,
    EquipmentSlot.Chest,
    EquipmentSlot.Legs,
    EquipmentSlot.Feet
   ];

   for (const slot of slots) {
    const item = equippable.getEquipment(slot);
    if (!item) continue;

    const typeId = item.typeId;
    // 去除命名空间前缀进行灵活模糊匹配
    const cleanName = typeId.replace(/^[^:]+:/, "");

    // 优先精准查找，其次模糊包含
    let matched = ARMOR_PROPERTIES[typeId] || ARMOR_PROPERTIES[cleanName];
    if (!matched) {
     for (const [key, val] of Object.entries(ARMOR_PROPERTIES)) {
      if (cleanName.includes(key)) {
       matched = val;
       break;
      }
     }
    }

    if (matched) {
     totalCold += matched.cold;
     totalHeat += matched.heat;
    } else if (cleanName.includes("helmet") || cleanName.includes("boots")) {
     totalCold += 0.08;
    } else if (cleanName.includes("chest") || cleanName.includes("vest")) {
     totalCold += 0.15;
    } else if (cleanName.includes("pants") || cleanName.includes("leggings")) {
     totalCold += 0.12;
    }
   }
  } catch (e) {
   console.warn(`[ArmorInsulation] Calculate error: ${e}`);
  }

  return {
   coldResistance: Math.max(0, Math.min(0.85, totalCold)), // 封顶 85% 防寒减免
   heatResistance: Math.max(-0.5, Math.min(0.5, totalHeat))
  };
 }
}
