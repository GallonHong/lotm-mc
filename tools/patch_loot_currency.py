# -*- coding: utf-8 -*-
import sys

sys.stdout.reconfigure(encoding='utf-8')

path = "addons/development/apocalypse_mobs_addon/apocalypse_mobs_bp/scripts/loot.js"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "static rewardCurrency" in line:
        skip = True
        new_lines.append('''\tstatic rewardCurrency(player, amount) {
\t\tconst value = Math.max(0, Math.floor(Number(amount) || 0));
\t\tif (!value) return true;
\t\ttry {
\t\t\tconst obj = world.scoreboard.getObjective("money") || world.scoreboard.addObjective("money", "金币");
\t\t\tlet current = 0;
\t\t\ttry {
\t\t\t\tconst s = obj.getScore(player);
\t\t\t\tif (typeof s === "number") current = s;
\t\t\t\telse if (player.scoreboardIdentity) {
\t\t\t\t\tconst s2 = obj.getScore(player.scoreboardIdentity);
\t\t\t\t\tif (typeof s2 === "number") current = s2;
\t\t\t\t}
\t\t\t} catch {}

\t\t\ttry {
\t\t\t\tobj.setScore(player, current + value);
\t\t\t\tplayer.sendMessage(`§6[事件奖励] +${value} 金币`);
\t\t\t\treturn true;
\t\t\t} catch {
\t\t\t\tif (player.scoreboardIdentity) {
\t\t\t\t\tobj.setScore(player.scoreboardIdentity, current + value);
\t\t\t\t\tplayer.sendMessage(`§6[事件奖励] +${value} 金币`);
\t\t\t\t\treturn true;
\t\t\t\t}
\t\t\t}
\t\t} catch {}

\t\ttry {
\t\t\tplayer.runCommand(`scoreboard players add @s money ${value}`);
\t\t\tplayer.sendMessage(`§6[事件奖励] +${value} 金币`);
\t\t\treturn true;
\t\t} catch {}
\t\treturn false;
\t}
''')
    elif skip:
        if line.strip() == "}":
            skip = False
    else:
        new_lines.append(line)

with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Updated loot.js successfully!")
