# -*- coding: utf-8 -*-
import sys

def patch_main():
    main_path = "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js"
    with open(main_path, "r", encoding="utf-8") as f:
        text = f.read()

    target1 = 'import { TemperatureManager } from "./temperature/TemperatureManager.js";'
    replacement1 = '''import { TemperatureManager } from "./temperature/TemperatureManager.js";
import { SeasonalEnvironment } from "./seasons/SeasonalEnvironment.js";'''

    target2 = 'TemperatureManager.init();'
    replacement2 = '''TemperatureManager.init();
SeasonalEnvironment.init();'''

    if "SeasonalEnvironment" in text:
        print("SeasonalEnvironment already in main.js")
        return True

    if target1 not in text or target2 not in text:
        print("Target not found in main.js")
        return False

    text = text.replace(target1, replacement1, 1)
    text = text.replace(target2, replacement2, 1)

    with open(main_path, "w", encoding="utf-8") as f:
        f.write(text)

    print("Successfully added SeasonalEnvironment to main.js")
    return True

if __name__ == "__main__":
    if not patch_main():
        sys.exit(1)
