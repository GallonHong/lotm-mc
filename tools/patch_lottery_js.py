with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/lottery.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
target_import = 'import { Integration } from "./integration.js";'
replacement_import = '''import { Integration } from "./integration.js";
import { DRONE_EPIC_LIMITED_POOL, DRONE_LEGENDARY_LIMITED_POOL, DRONE_LEGENDARY_FEATURED_CANDIDATES } from "../data/lotteryPools.js";'''

if 'DRONE_EPIC_LIMITED_POOL' not in content:
    content = content.replace(target_import, replacement_import)

# 2. Dynamic property keys
target_keys = 'const FEATURED_LEGENDARY_KEY = "sapi:lottery:legendary_featured:v1";'
replacement_keys = '''const FEATURED_LEGENDARY_KEY = "sapi:lottery:legendary_featured:v1";
const DRONE_EPIC_OPEN_KEY = "sapi:lottery:drone_epic_open";
const DRONE_LEGENDARY_OPEN_KEY = "sapi:lottery:drone_leg_open";
const DRONE_LEGENDARY_FEATURED_KEY = "sapi:lottery:drone_leg_featured";'''

if 'DRONE_EPIC_OPEN_KEY' not in content:
    content = content.replace(target_keys, replacement_keys)

# 3. Helper methods in LotteryManager
drone_helpers = '''
    static isDroneEpicOpen() {
        try { return world.getDynamicProperty(DRONE_EPIC_OPEN_KEY) === true; } catch { return false; }
    }
    static setDroneEpicOpen(open) {
        try { world.setDynamicProperty(DRONE_EPIC_OPEN_KEY, Boolean(open)); return true; } catch { return false; }
    }

    static isDroneLegendaryOpen() {
        try { return world.getDynamicProperty(DRONE_LEGENDARY_OPEN_KEY) === true; } catch { return false; }
    }
    static setDroneLegendaryOpen(open) {
        try { world.setDynamicProperty(DRONE_LEGENDARY_OPEN_KEY, Boolean(open)); return true; } catch { return false; }
    }

    static getDroneFeaturedLegendary() {
        const candidates = DRONE_LEGENDARY_FEATURED_CANDIDATES || [];
        let key = DRONE_LEGENDARY_LIMITED_POOL.defaultFeaturedKey;
        try {
            const saved = world.getDynamicProperty(DRONE_LEGENDARY_FEATURED_KEY);
            if (saved) key = String(saved);
        } catch {}
        return candidates.find(c => c.key === key) || candidates[0];
    }
    static setDroneFeaturedLegendary(key) {
        try { world.setDynamicProperty(DRONE_LEGENDARY_FEATURED_KEY, String(key)); return true; } catch { return false; }
    }
'''

if 'isDroneEpicOpen' not in content:
    target_pos = content.find('static getCustomPools()')
    content = content[:target_pos] + drone_helpers + '\n    ' + content[target_pos:]

# 4. In getPools()
target_getpools = '''        const custom = this.getCustomPools().filter(pool => pool.enabled !== false && Array.isArray(pool.items) && pool.items.length > 0);
        return [...builtIn, ...custom];'''

replacement_getpools = '''        const dronePools = [];
        if (this.isDroneEpicOpen()) {
            dronePools.push({ ...DRONE_EPIC_LIMITED_POOL, builtIn: true });
        }
        if (this.isDroneLegendaryOpen()) {
            const featured = this.getDroneFeaturedLegendary();
            dronePools.push({
                ...DRONE_LEGENDARY_LIMITED_POOL,
                builtIn: true,
                activeFeatured: featured,
                items: [{ ...featured, weight: Number(DRONE_LEGENDARY_LIMITED_POOL.featuredWeight || 2), isPityTarget: true }, ...DRONE_LEGENDARY_LIMITED_POOL.items],
                name: `§6限定战术母机·${featured.name.replace(/§./g, "")}`
            });
        }
        const custom = this.getCustomPools().filter(pool => pool.enabled !== false && Array.isArray(pool.items) && pool.items.length > 0);
        return [...builtIn, ...dronePools, ...custom];'''

if 'dronePools' not in content:
    content = content.replace(target_getpools, replacement_getpools)

# 5. In openAdminPoolManager
target_admin_buttons = '''        add(`§l§6🎯 切换 Legendary 当期蓝图\\n§r§8当前：${featured?.name || "未配置"}`, "textures/items/nether_star", () => this.openFeaturedLegendaryAdmin(player, () => this.openAdminPoolManager(player, onBack)));'''

replacement_admin_buttons = target_admin_buttons + '''
        const epicDroneOpen = this.isDroneEpicOpen();
        add(
            `§l§5【管理】史诗高级无人机限定池\\n§r§8当前: ${epicDroneOpen ? "§a已开启 (点击关闭)" : "§8未开启 (点击发布)"}`,
            "textures/drones/items/healing_drone",
            () => {
                const nextState = !epicDroneOpen;
                this.setDroneEpicOpen(nextState);
                if (nextState) {
                    Utils.broadcast("§6[限定军备] 史诗高级战术无人机限定卡池现已开启！");
                } else {
                    Utils.broadcast("§6[限定军备] 史诗高级战术无人机限定卡池已被管理员暂时关闭。");
                }
                this.openAdminPoolManager(player, onBack);
            }
        );

        const legDroneOpen = this.isDroneLegendaryOpen();
        const curDroneUp = this.getDroneFeaturedLegendary();
        add(
            `§l§6【管理】典藏传说无人机限定池\\n§r§8当前: ${legDroneOpen ? "§a已开启 (点击关闭)" : "§8未开启 (点击发布)"}`,
            "textures/drones/items/laser_drone",
            () => {
                const nextState = !legDroneOpen;
                this.setDroneLegendaryOpen(nextState);
                if (nextState) {
                    Utils.broadcast(`§6[限定军备] 典藏战术母机限定卡池现已开启！当期 UP: ${curDroneUp.name}`);
                } else {
                    Utils.broadcast("§6[限定军备] 典藏战术母机限定卡池已被管理员暂时关闭。");
                }
                this.openAdminPoolManager(player, onBack);
            }
        );

        add(
            `§l§6【管理】切换典藏无人机当期 UP\\n§r§8当前: ${curDroneUp.name}`,
            "textures/drones/items/drone_controller",
            () => {
                this.openDroneFeaturedAdmin(player, () => this.openAdminPoolManager(player, onBack));
            }
        );'''

if 'epicDroneOpen' not in content:
    content = content.replace(target_admin_buttons, replacement_admin_buttons)

# 6. Add openDroneFeaturedAdmin
drone_featured_admin = '''
    static openDroneFeaturedAdmin(player, onBack = null) {
        if (!Utils.isAdmin(player)) return;
        const current = this.getDroneFeaturedLegendary();
        const candidates = DRONE_LEGENDARY_FEATURED_CANDIDATES;
        const form = new ModalFormData()
            .title("切换典藏无人机当期 UP")
            .dropdown("当期唯一典藏蓝图（30抽保底）", candidates.map(c => c.name), Math.max(0, candidates.findIndex(c => c.key === current?.key)));
        Utils.showForm(player, form, res => {
            if (!res.canceled) {
                const selected = candidates[Number(res.formValues?.[0]) || 0];
                if (selected && this.setDroneFeaturedLegendary(selected.key)) {
                    Utils.broadcast(`§6[限定军备] 典藏无人机当期 UP 已切换为：${selected.name}`);
                }
            }
            onBack?.();
        });
    }
'''

if 'openDroneFeaturedAdmin' not in content:
    pos = content.find('static openFeaturedLegendaryAdmin')
    content = content[:pos] + drone_featured_admin + '\n    ' + content[pos:]

with open('addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/lottery.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated lottery.js successfully')
