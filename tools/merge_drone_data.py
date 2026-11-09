# -*- coding: utf-8 -*-
import os
import shutil
import json

ref_bp = 'addons/reference/无人机[修改](2)/无人机 Add-On 1.0 BP'
ref_rp = 'addons/reference/无人机[修改](2)/无人机 Add-On 1.0 RP'

target_bp = 'addons/development/apocalypse_life_addon/apocalypse_life_bp'
target_rp = 'addons/development/apocalypse_life_addon/apocalypse_life_rp'

def merge_all():
    # 1. Copy BP entities, animations, animation_controllers
    for folder, dst_name in [('entities', 'entities/drones'), ('animations', 'animations/drones'), ('animation_controllers', 'animation_controllers/drones')]:
        src = os.path.join(ref_bp, folder)
        dst = os.path.join(target_bp, dst_name)
        os.makedirs(dst, exist_ok=True)
        for f in os.listdir(src):
            if f.endswith('.json'):
                shutil.copy2(os.path.join(src, f), os.path.join(dst, f))
        print(f'Copied BP {folder} -> {dst}')

    # 2. Copy RP entity, animation_controllers, render_controllers, particles, materials
    for folder, dst_name in [
        ('entity', 'entity/drones'),
        ('animation_controllers', 'animation_controllers/drones'),
        ('render_controllers', 'render_controllers/drones'),
        ('particles', 'particles/drones'),
        ('materials', 'materials')
    ]:
        src = os.path.join(ref_rp, folder)
        dst = os.path.join(target_rp, dst_name)
        os.makedirs(dst, exist_ok=True)
        for f in os.listdir(src):
            shutil.copy2(os.path.join(src, f), os.path.join(dst, f))
        print(f'Copied RP {folder} -> {dst}')

    # 3. Textures: Copy to textures/makercamp/dr as well so all entity definitions find their textures!
    src_tex = os.path.join(ref_rp, 'textures', 'makercamp')
    dst_tex = os.path.join(target_rp, 'textures', 'makercamp')
    if os.path.exists(src_tex):
        if os.path.exists(dst_tex):
            shutil.rmtree(dst_tex)
        shutil.copytree(src_tex, dst_tex)
        print('Copied textures/makercamp ->', dst_tex)

    # 4. Sounds: Copy to sounds/makercamp/dr and merge sound_definitions.json
    src_snd = os.path.join(ref_rp, 'sounds', 'makercamp')
    dst_snd = os.path.join(target_rp, 'sounds', 'makercamp')
    if os.path.exists(src_snd):
        if os.path.exists(dst_snd):
            shutil.rmtree(dst_snd)
        shutil.copytree(src_snd, dst_snd)
        print('Copied sounds/makercamp ->', dst_snd)

    # Merge sound_definitions.json
    p1 = os.path.join(ref_rp, 'sounds', 'sound_definitions.json')
    p2 = os.path.join(target_rp, 'sounds', 'sound_definitions.json')
    with open(p1, 'r', encoding='utf-8') as f: d1 = json.load(f)
    with open(p2, 'r', encoding='utf-8') as f: d2 = json.load(f)
    s1 = d1.get('sound_definitions', {})
    s2 = d2.setdefault('sound_definitions', {})
    for k, v in s1.items():
        s2[k] = v
    with open(p2, 'w', encoding='utf-8') as f:
        json.dump(d2, f, indent=2, ensure_ascii=False)
    print('Merged sound_definitions.json successfully.')

if __name__ == '__main__':
    merge_all()
