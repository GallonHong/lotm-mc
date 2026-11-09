import io
import json
import os
import sys
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

files = [
    r'c:\Users\10973\Downloads\枪械系统_倒地联动_3.13.2.mcaddon',
    r'c:\Users\10973\Downloads\无人机与生活系统_救援修复_1.4.5.mcaddon',
    r'c:\Users\10973\Downloads\废土争夺战_倒地救援_服务器核心_2.14.4.mcaddon',
]

for f in files:
    print('==============================')
    print('File:', os.path.basename(f))
    with zipfile.ZipFile(f, 'r') as z:
        for name in z.namelist():
            if name.endswith('.mcpack'):
                pack_bytes = z.read(name)
                with zipfile.ZipFile(io.BytesIO(pack_bytes)) as pz:
                    if 'manifest.json' in pz.namelist():
                        manifest = json.loads(pz.read('manifest.json').decode('utf-8'))
                        header = manifest.get('header', {})
                        print(f"  {name} -> name: {header.get('name')}, version: {header.get('version')}, uuid: {header.get('uuid')}")
