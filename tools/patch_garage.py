def patch_garage():
    path = r'addons\development\apocalypse_life_addon\apocalypse_life_bp\scripts\drones\DroneGarageManager.js'
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find spawn insertion
    for i, line in enumerate(lines):
        if 'DroneClass.registerActiveDrone' in line:
            # Insert property initialization right before registration
            insert_code = [
                '   try {\n',
                '    entity.setProperty("makercamp_dr:state", "passive");\n',
                '    entity.setProperty("makercamp_dr:controlled_by_player", false);\n',
                '    entity.setProperty("makercamp_dr:is_shooting", false);\n',
                '   } catch {}\n',
                '\n'
            ]
            lines[i:i] = insert_code
            print('Inserted property init before registerActiveDrone')
            break

    # Replace sound on summon
    for i, line in enumerate(lines):
        if 'playsound ambient.weather.rain' in line:
            lines[i] = '   player.runCommandAsync("playsound makercamp_dr.drone.summon @a ~~~ 0.8 1.0");\n'
            print('Replaced summon playsound')
            break

    # Replace sound on recall
    for i, line in enumerate(lines):
        if 'DroneClass.unregisterActiveDrone' in line:
            # In following lines, look for playsound
            for j in range(i, min(i+10, len(lines))):
                if 'playsound random.pop' in lines[j]:
                    lines[j] = '   player.runCommandAsync("playsound makercamp_dr.drone.standby_start @s ~~~ 0.8 1.0");\n'
                    print('Replaced recall playsound')
                    break
            break

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print('Saved DroneGarageManager.js')

if __name__ == '__main__':
    patch_garage()
