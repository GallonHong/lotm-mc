import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { Config } from "../config.js";
import { Utils } from "../utils.js";
import { EconomyManager } from "./economy.js";
import { RegionManager } from "./region.js";
import { AuditManager } from "./audit.js";

/**
 * 地皮/领地保护系统管理器
 * 支持 16x16 区块购买、权限精细化控制、成员信任与边界特效
 */
export class LandManager {
    /**
     * 获取指定位置所在的地皮数据
     * @param {string} dimensionId 
     * @param {number} chunkX 
     * @param {number} chunkZ 
     * @returns {object|null}
     */
    static getPlot(dimensionId, chunkX, chunkZ) {
        const key = Utils.getPlotKey(dimensionId, chunkX, chunkZ);
        try {
            const raw = world.getDynamicProperty(key);
            if (!raw || typeof raw !== "string") return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn(`[LandManager] Error reading plot ${key}: ${e}`);
            return null;
        }
    }

    /**
     * 保存地皮数据
     * @param {object} plot 
     */
    static savePlot(plot) {
        const key = Utils.getPlotKey(plot.dimension, plot.chunkX, plot.chunkZ);
        world.setDynamicProperty(key, JSON.stringify(plot));
    }

    /**
     * 删除地皮数据
     * @param {string} dimensionId 
     * @param {number} chunkX 
     * @param {number} chunkZ 
     */
    static deletePlot(dimensionId, chunkX, chunkZ) {
        const key = Utils.getPlotKey(dimensionId, chunkX, chunkZ);
        world.setDynamicProperty(key, undefined);
    }

    /**
     * 获取玩家拥有的所有地皮 Key 列表
     * @param {import("@minecraft/server").Player} player 
     * @returns {string[]}
     */
    static getPlayerPlots(player) {
        try {
            const raw = player.getDynamicProperty("owned_plots");
            if (!raw || typeof raw !== "string") return [];
            return JSON.parse(raw) || [];
        } catch {
            return [];
        }
    }

    /**
     * 设置玩家拥有的地皮列表
     * @param {import("@minecraft/server").Player} player 
     * @param {string[]} plotKeys 
     */
    static setPlayerPlots(player, plotKeys) {
        player.setDynamicProperty("owned_plots", JSON.stringify(plotKeys));
    }

    /**
     * 检查玩家在某地皮内是否有完全控制权限（主人或信任成员或管理员）
     * @param {import("@minecraft/server").Player} player 
     * @param {object} plot 
     * @returns {boolean}
     */
    static hasPermission(player, plot) {
        if (!plot) return true; // 无主之地允许常规行为
        if (Utils.isAdmin(player)) return true; // 管理员特权
        if (plot.ownerId === player.id || plot.ownerName === player.name) return true;
        if (plot.members && plot.members.includes(player.name)) return true;
        return false;
    }

    /**
     * 购买当前所在区块的地皮
     * @param {import("@minecraft/server").Player} player 
     */
    static claimCurrentChunk(player) {
        const loc = player.location;
        const { chunkX, chunkZ } = Utils.getChunkCoords(loc);
        const dimensionId = player.dimension.id;

        const existingPlot = this.getPlot(dimensionId, chunkX, chunkZ);
        if (existingPlot) {
            Utils.tell(player, `§c此区块已被玩家 §e${existingPlot.ownerName} §c认领，无法重复购买！`);
            Utils.sound.fail(player);
            return;
        }

        if (!RegionManager.isLandClaimAllowed(dimensionId, chunkX, chunkZ)) {
            Utils.tell(player, "§c该区块与管理员保护区重叠，无法认领为玩家地皮。");
            Utils.sound.fail(player);
            return;
        }

        const playerPlots = this.getPlayerPlots(player);
        const maxPlots = Utils.isAdmin(player) ? Config.land.maxPlotsForAdmin : Config.land.maxPlotsPerPlayer;

        if (playerPlots.length >= maxPlots) {
            Utils.tell(player, `§c你拥有的地皮数量已达上限 (§e${playerPlots.length}/${maxPlots}§c)！`);
            Utils.sound.fail(player);
            return;
        }

        const price = Config.land.pricePerChunk;
        if (!EconomyManager.hasBalance(player, price)) {
            Utils.tell(player, `§c购买地皮需要 ${Utils.formatCurrency(price)}，你的金币不足！`);
            Utils.sound.fail(player);
            return;
        }

        // 扣款并创建地皮
        EconomyManager.removeBalance(player, price);

        const plotKey = Utils.getPlotKey(dimensionId, chunkX, chunkZ);
        const newPlot = {
            id: plotKey,
            dimension: dimensionId,
            chunkX: chunkX,
            chunkZ: chunkZ,
            ownerId: player.id,
            ownerName: player.name,
            name: `${player.name}的地皮 #${playerPlots.length + 1}`,
            claimTime: Date.now(),
            members: [],
            flags: { ...Config.land.defaultFlags }
        };

        this.savePlot(newPlot);
        playerPlots.push(plotKey);
        this.setPlayerPlots(player, playerPlots);

        Utils.tell(player, `§a🎉 恭喜！成功购买区块领地 [${chunkX}, ${chunkZ}]！花费 ${Utils.formatCurrency(price)}。`);
        AuditManager.log("land_claim", player, `[${chunkX},${chunkZ}]`, `${dimensionId} price=${price}`);
        Utils.sound.rareWin(player);
        this.showPlotBoundary(player, chunkX, chunkZ);
    }

    /**
     * 出售并注销地皮
     * @param {import("@minecraft/server").Player} player 
     * @param {object} plot 
     */
    static sellPlot(player, plot) {
        if (!plot || (plot.ownerId !== player.id && !Utils.isAdmin(player))) {
            Utils.tell(player, "§c你不是该地皮的主人，无法出售！");
            return;
        }

        const refund = Math.floor(Config.land.pricePerChunk * Config.land.sellRefundRate);
        EconomyManager.addBalance(player, refund);
        this.deletePlot(plot.dimension, plot.chunkX, plot.chunkZ);

        // 更新玩家列表
        const playerPlots = this.getPlayerPlots(player).filter(k => k !== plot.id);
        this.setPlayerPlots(player, playerPlots);

        Utils.tell(player, `§a已成功出售地皮 [${plot.name}]，返还 ${Utils.formatCurrency(refund)}！`);
        AuditManager.log("land_sell", player, plot.name, `${plot.dimension} [${plot.chunkX},${plot.chunkZ}] refund=${refund}`);
        Utils.sound.success(player);
    }

    /**
     * 高亮显示领地区块边界粒子 (沿 16x16 边界生成粒子)
     * @param {import("@minecraft/server").Player} player 
     * @param {number} chunkX 
     * @param {number} chunkZ 
     */
    static showPlotBoundary(player, chunkX, chunkZ) {
        const bounds = Utils.getChunkBounds(chunkX, chunkZ);
        const dimension = player.dimension;
        const particle = Config.land.particleBorderType;
        const baseY = Math.floor(player.location.y);

        let ticks = 0;
        const maxTicks = Config.land.borderParticleSeconds * 20; // 持续秒数

        const runId = system.runInterval(() => {
            ticks += 10;
            if (ticks > maxTicks || !Utils.isValid(player)) {
                system.clearRun(runId);
                return;
            }

            // 绘制四边
            for (let x = bounds.minX; x <= bounds.maxX + 1; x += 2) {
                try {
                    dimension.spawnParticle(particle, { x: x, y: baseY + 0.2, z: bounds.minZ });
                    dimension.spawnParticle(particle, { x: x, y: baseY + 0.2, z: bounds.maxZ + 1 });
                } catch {}
            }
            for (let z = bounds.minZ; z <= bounds.maxZ + 1; z += 2) {
                try {
                    dimension.spawnParticle(particle, { x: bounds.minX, y: baseY + 0.2, z: z });
                    dimension.spawnParticle(particle, { x: bounds.maxX + 1, y: baseY + 0.2, z: z });
                } catch {}
            }
        }, 10);

        Utils.actionbar(player, "§a[领地] 已为你高亮显示当前区块边界粒子！");
    }

    /**
     * 打开领地系统主菜单
     * @param {import("@minecraft/server").Player} player 
     * @param {Function} [onBack] 
     */
    static openPlotMainUI(player, onBack = null) {
        const loc = player.location;
        const { chunkX, chunkZ } = Utils.getChunkCoords(loc);
        const currentPlot = this.getPlot(player.dimension.id, chunkX, chunkZ);
        const playerPlots = this.getPlayerPlots(player);

        let statusText = "";
        if (!currentPlot) {
            statusText = `§7当前位置: §f[${chunkX}, ${chunkZ}] §a(未认领荒地)\n§f认领价格: ${Utils.formatCurrency(Config.land.pricePerChunk)}`;
        } else {
            const isOwner = currentPlot.ownerId === player.id || currentPlot.ownerName === player.name;
            const isMember = currentPlot.members && currentPlot.members.includes(player.name);
            const role = isOwner ? "§6[主人]" : isMember ? "§a[信任成员]" : "§7[访客]";
            statusText = `§7当前领地: §e${currentPlot.name}\n§7领地主人: §b${currentPlot.ownerName} ${role}`;
        }

        const form = new ActionFormData()
            .title("§l§2🛡️ 地皮领地系统")
            .body(
                `§7═════════════════════════\n` +
                `${statusText}\n` +
                `§f已占领地: §e${playerPlots.length} §7/ §f${Utils.isAdmin(player) ? Config.land.maxPlotsForAdmin : Config.land.maxPlotsPerPlayer}\n` +
                `§7═════════════════════════`
            );

        if (!currentPlot) {
            form.button("§l§2📍 购买当前区块\n§r§8认领脚下的 16x16 区域", "textures/ui/village_hero_effect");
        } else if (currentPlot.ownerId === player.id || Utils.isAdmin(player)) {
            form.button("§l§3⚙️ 当前领地设置\n§r§8修改权限与领地名称", "textures/ui/gear");
            form.button("§l§9👥 信任成员管理\n§r§8添加或移除好友共建", "textures/ui/FriendsIcon");
            form.button("§l§c💰 出售当前领地\n§r§8按 70% 比例返还金币", "textures/ui/trade_icon");
        }

        form.button("§l§e📋 我的领地列表\n§r§8查看并快速传送", "textures/ui/map_icon");
        form.button("§l§b👁️ 显示领地边界\n§r§8以绿色粒子高亮当前区块", "textures/ui/visible");

        if (onBack) {
            form.button("§l§c🔙 返回上级\n§r§8返回主菜单", "textures/ui/cancel");
        }

        Utils.showForm(player, form, (res) => {

            let btnIndex = 0;
            if (!currentPlot) {
                if (res.selection === btnIndex++) {
                    this.claimCurrentChunk(player);
                    return;
                }
            } else if (currentPlot.ownerId === player.id || Utils.isAdmin(player)) {
                if (res.selection === btnIndex++) {
                    this.openPlotSettingsUI(player, currentPlot, () => this.openPlotMainUI(player, onBack));
                    return;
                }
                if (res.selection === btnIndex++) {
                    this.openPlotMembersUI(player, currentPlot, () => this.openPlotMainUI(player, onBack));
                    return;
                }
                if (res.selection === btnIndex++) {
                    this.openSellConfirmUI(player, currentPlot, () => this.openPlotMainUI(player, onBack));
                    return;
                }
            }

            if (res.selection === btnIndex++) {
                this.openMyPlotsListUI(player, () => this.openPlotMainUI(player, onBack));
                return;
            }
            if (res.selection === btnIndex++) {
                this.showPlotBoundary(player, chunkX, chunkZ);
                return;
            }
            if (onBack) {
                onBack();
            }
        });
    }

    /**
     * 打开我的领地列表与传送
     * @param {import("@minecraft/server").Player} player 
     * @param {Function} [onBack] 
     */
    static openMyPlotsListUI(player, onBack = null) {
        const plotKeys = this.getPlayerPlots(player);
        const form = new ActionFormData()
            .title("§l§e📋 我的领地列表")
            .body(`§7你当前一共拥有 §e${plotKeys.length} §7块地皮：\n§7点击对应地皮即可直接传送！`);

        const validPlots = [];
        for (const key of plotKeys) {
            try {
                const raw = world.getDynamicProperty(key);
                if (raw && typeof raw === "string") {
                    const plot = JSON.parse(raw);
                    validPlots.push(plot);
                    form.button(`${plot.name}\n§r§8坐标: [${plot.chunkX * 16}, ${plot.chunkZ * 16}]`, "textures/ui/compass_item");
                }
            } catch {}
        }

        if (validPlots.length === 0) {
            form.body("§7你目前还没有购买任何领地地皮！");
        }

        form.button("§l§c🔙 返回", "textures/ui/cancel");

        Utils.showForm(player, form, (res) => {

            if (res.selection < validPlots.length) {
                const plot = validPlots[res.selection];
                // 执行传送至该地皮中心
                const targetX = plot.chunkX * 16 + 8;
                const targetZ = plot.chunkZ * 16 + 8;
                const targetDim = world.getDimension(plot.dimension);

                if (targetDim) {
                    player.teleport({ x: targetX, y: player.location.y, z: targetZ }, { dimension: targetDim });
                    Utils.tell(player, `§a已成功传送到领地：§e${plot.name}`);
                    Utils.sound.teleport(player);
                    this.showPlotBoundary(player, plot.chunkX, plot.chunkZ);
                }
            } else if (onBack) {
                onBack();
            }
        });
    }

    /**
     * 打开领地权限与设置面板
     * @param {import("@minecraft/server").Player} player 
     * @param {object} plot 
     * @param {Function} [onBack] 
     */
    static openPlotSettingsUI(player, plot, onBack = null) {
        const flags = plot.flags || { ...Config.land.defaultFlags };

        const form = new ModalFormData()
            .title(`§l领地设置: ${plot.name}`)
            .textField(`§f修改领地名称 (当前: ${plot.name}):`, "输入地皮新名称 (留空则不修改)")
            .toggle("§f允许访客破坏方块 (不推荐):", flags.allowBreak ?? false)
            .toggle("§f允许访客放置方块:", flags.allowPlace ?? false)
            .toggle("§f允许访客打开箱子/门/拉杆:", flags.allowInteract ?? false)
            .toggle("§f允许领地内发生爆炸破坏:", flags.allowExplosion ?? false)
            .toggle("§f允许访客攻击领地内动物/实体:", flags.allowAttackEntity ?? false);

        Utils.showForm(player, form, (res) => {
            if (res.canceled) {
                if (onBack) onBack();
                return;
            }

            const [newName, allowBreak, allowPlace, allowInteract, allowExplosion, allowAttackEntity] = res.formValues;

            plot.name = (newName && newName.trim().length > 0) ? newName.trim() : plot.name;
            plot.flags = {
                allowBreak: !!allowBreak,
                allowPlace: !!allowPlace,
                allowInteract: !!allowInteract,
                allowExplosion: !!allowExplosion,
                allowAttackEntity: !!allowAttackEntity,
            };

            this.savePlot(plot);
            Utils.tell(player, `§a领地 §e${plot.name} §a的权限设置已更新！`);
            Utils.sound.success(player);

            if (onBack) onBack();
        });
    }

    /**
     * 打开信任成员管理
     * @param {import("@minecraft/server").Player} player 
     * @param {object} plot 
     * @param {Function} [onBack] 
     */
    static openPlotMembersUI(player, plot, onBack = null) {
        const members = plot.members || [];
        const form = new ActionFormData()
            .title(`§l👥 信任成员 - ${plot.name}`)
            .body(`§7当前信任成员列表 (${members.length} 人)：\n§f${members.length > 0 ? members.join(", ") : "§8(暂无信任成员)"}`)
            .button("§l§a➕ 添加在线玩家为成员", "textures/ui/plus")
            .button("§l§c➖ 移除已有信任成员", "textures/ui/minus")
            .button("§l§7🔙 返回", "textures/ui/cancel");

        Utils.showForm(player, form, (res) => {

            if (res.selection === 0) {
                // 添加成员
                const candidates = world.getAllPlayers().filter(p => p.name !== player.name && !members.includes(p.name));
                if (candidates.length === 0) {
                    Utils.tell(player, "§c没有可添加的在线玩家！");
                    if (onBack) onBack();
                    return;
                }

                const addForm = new ModalFormData()
                    .title("§l添加信任成员")
                    .dropdown("§f选择要添加的在线玩家:", candidates.map(p => p.name));

                Utils.showForm(player, addForm, (addRes) => {
                    if (addRes.canceled) {
                        if (onBack) onBack();
                        return;
                    }
                    const selectedPlayer = candidates[addRes.formValues[0]];
                    if (selectedPlayer) {
                        if (!plot.members) plot.members = [];
                        plot.members.push(selectedPlayer.name);
                        this.savePlot(plot);
                        Utils.tell(player, `§a已成功将 §e${selectedPlayer.name} §a加入地皮信任成员！`);
                        Utils.tell(selectedPlayer, `§a玩家 §e${player.name} §a已将你添加为其领地 [${plot.name}] 的信任成员！`);
                        Utils.sound.success(player);
                    }
                    if (onBack) onBack();
                });
            } else if (res.selection === 1) {
                // 移除成员
                if (members.length === 0) {
                    Utils.tell(player, "§c当前没有成员可供移除！");
                    if (onBack) onBack();
                    return;
                }

                const removeForm = new ModalFormData()
                    .title("§l移除信任成员")
                    .dropdown("§f选择要移除的成员:", members);

                Utils.showForm(player, removeForm, (remRes) => {
                    if (remRes.canceled) {
                        if (onBack) onBack();
                        return;
                    }
                    const targetName = members[remRes.formValues[0]];
                    plot.members = members.filter(m => m !== targetName);
                    this.savePlot(plot);
                    Utils.tell(player, `§a已移除信任成员: §e${targetName}`);
                    Utils.sound.success(player);
                    if (onBack) onBack();
                });
            } else if (onBack) {
                onBack();
            }
        });
    }

    /**
     * 出售确认二次弹窗
     * @param {import("@minecraft/server").Player} player 
     * @param {object} plot 
     * @param {Function} [onBack] 
     */
    static openSellConfirmUI(player, plot, onBack = null) {
        const refund = Math.floor(Config.land.pricePerChunk * Config.land.sellRefundRate);
        const form = new MessageFormData()
            .title("§l§c⚠️ 确认出售地皮？")
            .body(`§f确定要出售领地 §e${plot.name} §f吗？\n\n§7出售后将返还 §e${Utils.formatCurrency(refund)}§7，该领地保护将立刻失效！`)
            .button1("§l§c确认出售")
            .button2("§l§a取消返回");

        Utils.showForm(player, form, (res) => {
            if (res.selection === 0) {
                this.sellPlot(player, plot);
            } else if (onBack) {
                onBack();
            }
        });
    }

    /**
     * 注册领地保护相关的核心事件拦截器
     */
    static registerProtectionEvents() {
        // 1. 破坏方块保护
        world.beforeEvents.playerBreakBlock.subscribe((event) => {
            const { player, block, dimension } = event;
            const { chunkX, chunkZ } = Utils.getChunkCoords(block.location);
            const plot = this.getPlot(dimension.id, chunkX, chunkZ);

            if (!plot) return;

            // 拥有权限或领地开启允许破坏
            if (this.hasPermission(player, plot) || plot.flags?.allowBreak) return;

            event.cancel = true;
            Utils.actionbar(player, `§c[领地保护] 此区域属于 §e${plot.ownerName}§c，禁止破坏！`);
            Utils.sound.warn(player);
        });

        // 2. 放置方块保护。旧版稳定 API 没有 beforeEvents.playerPlaceBlock，
        // 因此优先使用可取消事件，否则在放置后立即回滚并返还物品。
        const protectPlacement = (event, canCancel) => {
            const { player, block, dimension } = event;
            const { chunkX, chunkZ } = Utils.getChunkCoords(block.location);
            const plot = this.getPlot(dimension.id, chunkX, chunkZ);

            if (!plot) return;

            if (this.hasPermission(player, plot) || plot.flags?.allowPlace) return;

            if (canCancel) {
                event.cancel = true;
                Utils.actionbar(player, `§c[领地保护] 此区域属于 §e${plot.ownerName}§c，禁止放置！`);
                Utils.sound.warn(player);
                return;
            }

            const placedTypeId = block.typeId;
            system.run(() => {
                try {
                    block.setType("minecraft:air");

                    // 生存/冒险模式已经消耗了方块，回滚后返还一个；创造模式不返还。
                    let isCreative = false;
                    try {
                        isCreative = String(player.getGameMode()).toLowerCase() === "creative";
                    } catch {}
                    if (!isCreative) Utils.giveItem(player, placedTypeId, 1);

                    Utils.actionbar(player, `§c[领地保护] 此区域属于 §e${plot.ownerName}§c，禁止放置！已撤销操作。`);
                    Utils.sound.warn(player);
                } catch (error) {
                    console.warn(`[Land] Failed to roll back ${placedTypeId} placed by ${player.name}: ${error}`);
                }
            });
        };

        const beforePlaceBlock = world.beforeEvents.playerPlaceBlock;
        if (beforePlaceBlock && typeof beforePlaceBlock.subscribe === "function") {
            beforePlaceBlock.subscribe((event) => protectPlacement(event, true));
        } else {
            const afterPlaceBlock = world.afterEvents.playerPlaceBlock;
            if (afterPlaceBlock && typeof afterPlaceBlock.subscribe === "function") {
                afterPlaceBlock.subscribe((event) => protectPlacement(event, false));
                console.warn("[Land] beforeEvents.playerPlaceBlock is unavailable; using after-event rollback protection.");
            } else {
                console.warn("[Land] Block placement events are unavailable; placement protection is disabled on this API version.");
            }
        }

        // 3. 方块交互保护 (箱子、门、拉杆等)
        world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
            const { player, block } = event;
            const dimension = player.dimension;
            const { chunkX, chunkZ } = Utils.getChunkCoords(block.location);
            const plot = this.getPlot(dimension.id, chunkX, chunkZ);

            if (!plot) return;

            if (this.hasPermission(player, plot) || plot.flags?.allowInteract) return;

            // 常见容器与红石交互拦截
            const typeId = block.typeId;
            const isProtectedBlock = 
                typeId.includes("chest") ||
                typeId.includes("barrel") ||
                typeId.includes("shulker") ||
                typeId.includes("door") ||
                typeId.includes("trapdoor") ||
                typeId.includes("furnace") ||
                typeId.includes("hopper") ||
                typeId.includes("button") ||
                typeId.includes("lever") ||
                typeId.includes("gate") ||
                typeId.includes("anvil");

            if (isProtectedBlock) {
                event.cancel = true;
                Utils.actionbar(player, `§c[领地保护] 此区域属于 §e${plot.ownerName}§c，禁止使用此设施！`);
                Utils.sound.warn(player);
            }
        });

        // 4. 爆炸防护 (苦力怕/TNT/末影水晶等)
        world.beforeEvents.explosion.subscribe((event) => {
            const dimension = event.dimension;
            const impactedBlocks = event.getImpactedBlocks();
            if (!impactedBlocks || impactedBlocks.length === 0) return;

            const safeBlocks = [];
            for (const block of impactedBlocks) {
                const { chunkX, chunkZ } = Utils.getChunkCoords(block.location);
                const plot = this.getPlot(dimension.id, chunkX, chunkZ);
                if (plot && !plot.flags?.allowExplosion) {
                    // 受保护，不允许爆炸摧毁该方块
                    continue;
                }
                safeBlocks.push(block);
            }

            event.setImpactedBlocks(safeBlocks);
        });

        // 5. 实体保护 (农场动物、展示框、盔甲架)
        world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
            const { player, target } = event;
            const dimension = player.dimension;
            const { chunkX, chunkZ } = Utils.getChunkCoords(target.location);
            const plot = this.getPlot(dimension.id, chunkX, chunkZ);

            if (!plot) return;
            if (this.hasPermission(player, plot) || plot.flags?.allowInteract) return;

            if (target.typeId === "minecraft:item_frame" || target.typeId === "minecraft:armor_stand") {
                event.cancel = true;
                Utils.actionbar(player, `§c[领地保护] 禁止触碰 §e${plot.ownerName} §c领地内的物品展示设施！`);
            }
        });
    }
}
