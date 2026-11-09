# -*- coding: utf-8 -*-
import os
import shutil

ref_rp = 'addons/reference/无人机[修改](2)/无人机 Add-On 1.0 RP'
target_rp = 'addons/development/apocalypse_life_addon/apocalypse_life_rp'

def copy_drone_assets():
    # 1. Models
    src_models = os.path.join(ref_rp, 'models', 'entity')
    dst_models = os.path.join(target_rp, 'models', 'entity', 'drones')
    os.makedirs(dst_models, exist_ok=True)
    for f in os.listdir(src_models):
        if 'drone' in f:
            shutil.copy2(os.path.join(src_models, f), os.path.join(dst_models, f))
    print('Copied drone models.')

    # 2. Animations
    src_anims = os.path.join(ref_rp, 'animations')
    dst_anims = os.path.join(target_rp, 'animations', 'drones')
    os.makedirs(dst_anims, exist_ok=True)
    for f in os.listdir(src_anims):
        if 'drone' in f:
            shutil.copy2(os.path.join(src_anims, f), os.path.join(dst_anims, f))
    print('Copied drone animations.')

    # 3. Textures
    src_tex = os.path.join(ref_rp, 'textures', 'makercamp', 'dr')
    dst_tex = os.path.join(target_rp, 'textures', 'drones')
    if os.path.exists(src_tex):
        if os.path.exists(dst_tex):
            shutil.rmtree(dst_tex)
        shutil.copytree(src_tex, dst_tex)
        print('Copied drone textures to', dst_tex)

    # 4. Sounds
    src_snd = os.path.join(ref_rp, 'sounds', 'makercamp', 'dr')
    dst_snd = os.path.join(target_rp, 'sounds', 'drones')
    if os.path.exists(src_snd):
        if os.path.exists(dst_snd):
            shutil.rmtree(dst_snd)
        shutil.copytree(src_snd, dst_snd)
        print('Copied drone sounds to', dst_snd)

if __name__ == '__main__':
    copy_drone_assets()
