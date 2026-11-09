# -*- coding: utf-8 -*-
import sys

def patch_main():
    main_path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js"
    with open(main_path, "r", encoding="utf-8") as f:
        text = f.read()

    target1 = 'import { SeasonalEnvironment } from "./seasons/SeasonalEnvironment.js";'
    replacement1 = '''import { SeasonalEnvironment } from "./seasons/SeasonalEnvironment.js";
import { DownedRescueManager } from "./rescue/DownedRescueManager.js";'''

    target2 = 'SeasonalEnvironment.init();'
    replacement2 = '''SeasonalEnvironment.init();

// 初始化末日倒地救援系统
DownedRescueManager.init();'''

    if "DownedRescueManager" in text:
        print("DownedRescueManager already in main.js")
        return True

    if target1 not in text or target2 not in text:
        print("Target not found in main.js")
        return False

    text = text.replace(target1, replacement1, 1)
    text = text.replace(target2, replacement2, 1)

    with open(main_path, "w", encoding="utf-8") as f:
        f.write(text)

    print("Successfully added DownedRescueManager to main.js")
    return True

if __name__ == "__main__":
    if not patch_main():
        sys.exit(1)
