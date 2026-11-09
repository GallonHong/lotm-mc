# -*- coding: utf-8 -*-
import zipfile, json, sys

sys.stdout.reconfigure(encoding='utf-8')

with zipfile.ZipFile('明日之后.mcworld', 'r') as zf:
    if 'world_resource_packs.json' in zf.namelist():
        data = json.loads(zf.read('world_resource_packs.json').decode('utf-8'))
        print(json.dumps(data, indent=2, ensure_ascii=False))
