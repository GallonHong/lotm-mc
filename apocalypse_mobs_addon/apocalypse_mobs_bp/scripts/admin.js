import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { system } from "@minecraft/server";
import { ZoneRegistry } from "./zones.js";
import { SpawnDirector } from "./spawnDirector.js";
import { LootManager } from "./loot.js";
import { WorldEventDirector } from "./events.js";

export function isAdmin(player) {
  try { if (player.hasTag("admin")) return true; } catch {}
  try { if (typeof player.isOp === "function" && player.isOp()) return true; } catch {}
  return false;
}

function show(player, form, callback) {
  system.run(() => form.show(player).then(result => {
    if (!result.canceled) callback(result);
  }).catch(error => player.sendMessage(`§c[Apocalypse] 菜单错误: ${error}`)));
}

export class AdminMenu {
  static open(player) {
    if (!isAdmin(player)) return player.sendMessage("§c仅管理员可使用怪物生成管理菜单。");
    const zone = ZoneRegistry.resolve(player.dimension.id, player.location);
    const form = new ActionFormData()
      .title("§l§4☣ 末日世界管理")
      .body(`§f当前位置：§e${zone.name} §7(${zone.type})\n§f动态事件：${WorldEventDirector.active ? "§c进行中" : "§a空闲"}`)
      .button("§l§6区域管理", "textures/ui/World")
      .button("§l§aLootNode 管理", "textures/ui/icon_recipe_item")
      .button("§l§c生成测试敌人", "textures/ui/icon_recipe_nature")
      .button("§l§4触发感染者伏击", "textures/ui/warning_alex")
      .button("§l§7查看系统状态", "textures/ui/magnifyingGlass");
    show(player, form, result => {
      if (result.selection === 0) this.openZones(player);
      else if (result.selection === 1) this.openLoot(player);
      else if (result.selection === 2) this.openSpawn(player);
      else if (result.selection === 3) {
        player.sendMessage(WorldEventDirector.trigger(player, true) ? "§a已触发感染者伏击。" : "§c触发失败：请离开安全区，且当前不能有活动事件。");
        this.open(player);
      } else if (result.selection === 4) this.status(player);
    });
  }

  static openZones(player) {
    const selection = ZoneRegistry.selections.get(player.id) || {};
    const point = value => value ? `${value.x}, ${value.y}, ${value.z}` : "未记录";
    const form = new ActionFormData().title("§l区域管理")
      .body(`§f点 A：§7${point(selection.a)}\n§f点 B：§7${point(selection.b)}\n§f本包区域数：§e${ZoneRegistry.getLocalZones().length}`)
      .button("§a记录点 A", "textures/ui/World")
      .button("§a记录点 B", "textures/ui/World")
      .button("§6创建区域", "textures/ui/village_hero_effect")
      .button("§c删除区域", "textures/ui/trash")
      .button("§7返回", "textures/ui/undo");
    show(player, form, result => {
      if (result.selection === 0 || result.selection === 1) {
        const key = result.selection === 0 ? "a" : "b";
        const value = ZoneRegistry.setPoint(player, key);
        player.sendMessage(`§a已记录点 ${key.toUpperCase()}：${value.x}, ${value.y}, ${value.z}`);
        this.openZones(player);
      } else if (result.selection === 2) this.createZone(player);
      else if (result.selection === 3) this.deleteZone(player);
      else this.open(player);
    });
  }

  static createZone(player) {
    const form = new ModalFormData().title("创建末日区域")
      .textField("名称", "主城 / 军事禁区", "新区域")
      .dropdown("区域规则", ["安全区：禁止敌对生成", "法制区：普通怪池", "非法制区：高危怪池"], 0)
      .textField("优先级 0-1000", "200", "200");
    show(player, form, result => {
      const [name, typeIndex, priority] = result.formValues;
      const type = ["safe", "law", "outlaw"][Number(typeIndex) || 0];
      const created = ZoneRegistry.create(player, name, type, priority);
      player.sendMessage(created ? `§a已创建 ${created.name}（${created.type}）。` : "§c创建失败，请先在同一维度记录 A/B 两点。");
      this.openZones(player);
    });
  }

  static deleteZone(player) {
    const zones = ZoneRegistry.getLocalZones();
    const form = new ActionFormData().title("删除区域").body("§7SAPI 管理保护区需在 SAPI 菜单内删除。");
    for (const zone of zones) form.button(`${zone.name}\n§8${zone.type}`, "textures/ui/trash");
    form.button("§7返回", "textures/ui/undo");
    show(player, form, result => {
      const zone = zones[result.selection];
      if (!zone) return this.openZones(player);
      const confirm = new MessageFormData().title("确认删除").body(`删除区域 ${zone.name}？`).button1("§c删除").button2("取消");
      show(player, confirm, answer => {
        if (answer.selection === 0) player.sendMessage(ZoneRegistry.remove(zone.id) ? "§a已删除。" : "§c删除失败。");
        this.openZones(player);
      });
    });
  }

  static openLoot(player) {
    const form = new ActionFormData().title("§lLootNode 管理")
      .body(`§f已登记：§e${LootManager.getNodes().length}§f 个`)
      .button("§a在身前建立工具箱", "textures/ui/icon_recipe_item")
      .button("§a在身前建立医疗箱", "textures/ui/health_boost_effect")
      .button("§6在身前建立军用箱", "textures/ui/strength_effect")
      .button("§c删除最近节点", "textures/ui/trash")
      .button("§7返回", "textures/ui/undo");
    show(player, form, result => {
      if (result.selection <= 2) {
        const type = ["tools", "medical", "military"][result.selection];
        const node = LootManager.addNode(player, type, type === "military" ? 60 : 20);
        player.sendMessage(node ? `§a已建立 ${type} LootNode。` : "§c建立失败，请确保身前有空间。");
        this.openLoot(player);
      } else if (result.selection === 3) {
        const nodes = LootManager.getNodes().filter(node => node.dimension === player.dimension.id);
        nodes.sort((a, b) => Math.hypot(a.x - player.location.x, a.y - player.location.y, a.z - player.location.z) - Math.hypot(b.x - player.location.x, b.y - player.location.y, b.z - player.location.z));
        const nearest = nodes[0];
        player.sendMessage(nearest && Math.hypot(nearest.x - player.location.x, nearest.y - player.location.y, nearest.z - player.location.z) <= 8 && LootManager.removeNode(nearest) ? "§a已删除最近节点。" : "§c8 格内没有可删除节点。");
        this.openLoot(player);
      } else this.open(player);
    });
  }

  static openSpawn(player) {
    const keys = ["basic", "runner", "spitter", "mutant", "heavy", "raider"];
    const names = ["普通感染者 20HP", "疾行感染者 30HP", "毒液感染者 50HP", "变异感染者 100HP", "重型感染者 200HP", "掠夺者步枪手 50HP"];
    const form = new ActionFormData().title("生成测试敌人").body("§c安全区内生成会被 SafeZoneMobGuard 清除。");
    for (const name of names) form.button(name, "textures/ui/icon_recipe_nature");
    form.button("§7返回", "textures/ui/undo");
    show(player, form, result => {
      const key = keys[result.selection];
      if (!key) return this.open(player);
      const entity = SpawnDirector.spawnNearPlayer(player, key, ["apoc_admin_spawn"], 5, 8);
      player.sendMessage(entity ? `§a已生成 ${names[result.selection]}。` : "§c生成失败，请离开安全区并站在开阔地面。");
      this.openSpawn(player);
    });
  }

  static status(player) {
    const zone = ZoneRegistry.resolve(player.dimension.id, player.location);
    const hostile = player.dimension.getEntities({ location: player.location, maxDistance: 48, tags: ["apoc_hostile"] }).length;
    player.sendMessage(`§6[Apocalypse 状态]\n§f区域：§e${zone.name} (${zone.type}/${zone.source})\n§f48 格敌对数量：§e${hostile}\n§f本包区域：§e${ZoneRegistry.getLocalZones().length}\n§fLootNode：§e${LootManager.getNodes().length}\n§f动态事件：§e${WorldEventDirector.active?.id || "无"}`);
    this.open(player);
  }
}

