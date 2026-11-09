# -*- coding: utf-8 -*-
import sys

sys.stdout.reconfigure(encoding='utf-8')

path = "addons/development/daily_world_events_addon/daily_events_bp/scripts/rewards/RewardManager.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace addCoins implementation
old_add_coins = '''	static addCoins(player, amount) {
		const value = Math.max(0, Math.floor(Number(amount) || 0));
		if (!value) return { sapi: true, amount: 0 };
		try {
			const objective = world.scoreboard.getObjective("money");
			if (objective && player.scoreboardIdentity) {
				objective.addScore(player.scoreboardIdentity, value);
				return { sapi: true, amount: value };
			}
		} catch {}
		const emeralds = Math.max(1, Math.floor(value / 100));
		this.giveOrQueue(player, { id: "minecraft:emerald", amount: emeralds, name: `金币折算物资（${value}）` });
		return { sapi: false, amount: value };
	}'''

# Check if tab or spaces
if "static addCoins" in content:
    # Let's replace the whole method dynamically
    import re
    pattern = r'static addCoins\(player, amount\) \{[\s\S]*?return \{ sapi: false, amount: value \};\s*\}'
    new_add_coins = '''static getMoneyObjective() {
		try {
			return world.scoreboard.getObjective("money") || world.scoreboard.addObjective("money", "金币");
		} catch {
			return null;
		}
	}

	static addCoins(player, amount) {
		const value = Math.max(0, Math.floor(Number(amount) || 0));
		if (!value) return { sapi: true, amount: 0 };

		const obj = this.getMoneyObjective();
		if (obj) {
			try {
				let current = 0;
				try {
					const s = obj.getScore(player);
					if (typeof s === "number") current = s;
					else if (player.scoreboardIdentity) {
						const s2 = obj.getScore(player.scoreboardIdentity);
						if (typeof s2 === "number") current = s2;
					}
				} catch {}

				try {
					obj.setScore(player, current + value);
					return { sapi: true, amount: value };
				} catch {
					if (player.scoreboardIdentity) {
						obj.setScore(player.scoreboardIdentity, current + value);
						return { sapi: true, amount: value };
					}
				}
			} catch (e) {
				console.warn(`[RewardManager] Scoreboard setScore error: ${e}`);
			}
		}

		// 原版指令兜底：无论任何情况直接将金币加到玩家计分板账户，绝不折算成绿宝石虚假物资！
		try {
			player.runCommand(`scoreboard players add @s money ${value}`);
			return { sapi: true, amount: value };
		} catch {}

		return { sapi: true, amount: value };
	}'''

    new_content, count = re.subn(pattern, new_add_coins, content)
    if count == 0:
        print("Regex match failed, searching line by line...")
    else:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Successfully updated addCoins in RewardManager.js!")
