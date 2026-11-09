import json

def patch_drone_ac():
    drone_ac_path = r'addons\development\apocalypse_life_addon\apocalypse_life_rp\animation_controllers\drones\_drone.rp_ac.json'
    with open(drone_ac_path, 'r', encoding='utf-8') as f:
        d = json.load(f)

    d['animation_controllers']['controller.animation.makercamp_dr.drone.fly'] = {
        'initial_state': 'hover',
        'states': {
            'default': {
                'animations': ['idle'],
                'transitions': [
                    {'hover': '1.0'}
                ],
                'blend_transition': 0.2
            },
            'hover': {
                'animations': ['idle'],
                'transitions': [
                    {'fly': "q.property('makercamp_dr:state') == 'active' || query.modified_move_speed > 0.05"}
                ],
                'blend_transition': 0.2,
                'blend_via_shortest_path': True
            },
            'fly': {
                'animations': ['fly'],
                'transitions': [
                    {'hover': "q.property('makercamp_dr:state') != 'active' && query.modified_move_speed <= 0.05"}
                ],
                'blend_transition': 0.3,
                'blend_via_shortest_path': True
            }
        }
    }

    with open(drone_ac_path, 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)
    print('Updated _drone.rp_ac.json')

    water_drone_ac_path = r'addons\development\apocalypse_life_addon\apocalypse_life_rp\animation_controllers\drones\water_drone.rp_ac.json'
    with open(water_drone_ac_path, 'r', encoding='utf-8') as f:
        wd = json.load(f)

    wd['animation_controllers']['controller.animation.makercamp_dr.water_drone.fly'] = {
        'initial_state': 'hover',
        'states': {
            'default': {
                'animations': [
                    {'idle': '!q.is_in_water'},
                    {'idle_water': 'q.is_in_water'}
                ],
                'transitions': [
                    {'hover': '1.0'}
                ],
                'blend_transition': 0.2
            },
            'hover': {
                'animations': [
                    {'idle': '!q.is_in_water'},
                    {'idle_water': 'q.is_in_water'}
                ],
                'transitions': [
                    {'fly': "q.property('makercamp_dr:state') == 'active' || query.modified_move_speed > 0.05"}
                ],
                'blend_transition': 0.2,
                'blend_via_shortest_path': True
            },
            'fly': {
                'animations': [
                    {'fly': '!q.is_in_water'},
                    {'swim': 'q.is_in_water'}
                ],
                'transitions': [
                    {'hover': "q.property('makercamp_dr:state') != 'active' && query.modified_move_speed <= 0.05"}
                ],
                'blend_transition': 0.3,
                'blend_via_shortest_path': True
            }
        }
    }

    with open(water_drone_ac_path, 'w', encoding='utf-8') as f:
        json.dump(wd, f, indent=2, ensure_ascii=False)
    print('Updated water_drone.rp_ac.json')

if __name__ == '__main__':
    patch_drone_ac()
