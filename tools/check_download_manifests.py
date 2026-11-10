# -*- coding: utf-8 -*-
import io
import json
import os
import sys
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

files = [
    r'c:\Users\10973\Downloads\Boss_全模型独立修复_0.1.0.mcaddon',
    r'c:\Users\10973\Downloads\枪械_护甲盾牌耐久修复_3.13.3.mcaddon'
]

for f in files:
    print('==============================')
    print('File:', os.path.basename(f))
    with zipfile.ZipFile(f, 'r') as z:
        for name in z.namelist():
            print('  entry:', name)
            if name.endswith('.mcpack'):
                pack_bytes = z.read(name)
                with zipfile.ZipFile(io.BytesIO(pack_bytes)) as pz:
                    if 'manifest.json' in pz.namelist():
                        manifest = json.loads(pz.read('manifest.json').decode('utf-8'))
                        header = manifest.get('header', {})
                        print(f"    -> name: {header.get('name')}, version: {header.get('version')}, uuid: {header.get('uuid')}")
