# -*- coding: utf-8 -*-
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

def check_syntax():
    paths = [
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/main.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneConstants.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneGarageManager.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneClass.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneMenu.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/seasons/SeasonManager.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/seasons/SeasonalEnvironment.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/temperature/ArmorInsulation.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/temperature/DietThermoregulation.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/temperature/TemperatureManager.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/rescue/DownedRescueManager.js",
        "addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js",
        "addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/shop.js",
        "addons/development/sapi_server_addon/sapi_server_bp/scripts/config.js",
        "addons/development/sapi_server_addon/sapi_server_bp/scripts/data/merchantConfig.js",
        "addons/development/sapi_server_addon/sapi_server_bp/scripts/data/lotteryPools.js"
    ]
    for p in paths:
        res = subprocess.run(["node", "-c", p], capture_output=True, text=True)
        if res.returncode != 0:
            print(f"Syntax error in {p}:\n{res.stderr}")
            return False
        else:
            print(f"OK: {p}")
    return True

def check_gray_text():
    files_to_check = [
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneConstants.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneGarageManager.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneClass.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneMenu.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/seasons/SeasonManager.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/seasons/SeasonalEnvironment.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/temperature/ArmorInsulation.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/temperature/DietThermoregulation.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/temperature/TemperatureManager.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/rescue/DownedRescueManager.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/vehicles/VehicleGarageManager.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/vehicles/VehicleMenu.js",
        "addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/server_menu.js",
        "addons/development/sapi_server_addon/sapi_server_bp/scripts/modules/shop.js",
        "addons/development/sapi_server_addon/sapi_server_bp/scripts/config.js"
    ]
    has_gray = False
    for p in files_to_check:
        with open(p, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f, 1):
                if "\u00a77" in line or "\u00a78" in line:
                    # Allow commented lines or specific ignore
                    print(f"Found gray text in {p}:{line_no}: {line.strip()}")
                    has_gray = True
    if not has_gray:
        print("ALL CHECKED FILES HAVE ZERO GRAY TEXT (§7, §8).")
    return not has_gray

def check_no_actionbar():
    # Verify drone scripts never call setActionBar or onScreenDisplay.setActionBar
    drone_files = [
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneConstants.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneGarageManager.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneClass.js",
        "addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts/drones/DroneMenu.js"
    ]
    for p in drone_files:
        with open(p, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f, 1):
                clean_line = line.strip()
                if clean_line.startswith("*") or clean_line.startswith("//"):
                    continue
                if "setactionbar" in clean_line.lower() or "actionbar" in clean_line.lower():
                    print(f"Actionbar call detected in {p}:{line_no}: {clean_line}")
                    return False
    print("ACTIONBAR FREE: Drone scripts 100% free of Actionbar calls (reserved for firearms).")
    return True

if __name__ == "__main__":
    ok1 = check_syntax()
    ok2 = check_gray_text()
    ok3 = check_no_actionbar()
    if not (ok1 and ok2 and ok3):
        sys.exit(1)
    print("ALL CHECKS PASSED!")
