import json

def patch_drone_visuals():
    anim_path = r'addons\development\apocalypse_life_addon\apocalypse_life_rp\animations\drones\_drone.animation.json'
    with open(anim_path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    if 'animation.makercamp_dr.drone.is_controlled_by_player' in d.get('animations', {}):
        d['animations']['animation.makercamp_dr.drone.is_controlled_by_player']['bones']['root']['scale'] = 1
    with open(anim_path, 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
    print('Patched _drone.animation.json')

    rc_path = r'addons\development\apocalypse_life_addon\apocalypse_life_rp\render_controllers\drones\_drone.rc.json'
    with open(rc_path, 'r', encoding='utf-8') as f:
        rc = json.load(f)
    for k, v in rc.get('render_controllers', {}).items():
        if 'geometry' in v:
            v['geometry'] = "Geometry.default"
    with open(rc_path, 'w', encoding='utf-8') as f:
        json.dump(rc, f, indent=2, ensure_ascii=False)
    print('Patched _drone.rc.json')

if __name__ == '__main__':
    patch_drone_visuals()
