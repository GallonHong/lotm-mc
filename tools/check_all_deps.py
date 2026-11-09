# -*- coding: utf-8 -*-
import zipfile, json, sys

sys.stdout.reconfigure(encoding='utf-8')

with zipfile.ZipFile('明日之后.mcworld', 'r') as zf:
    manifests = [n for n in zf.namelist() if n.startswith('behavior_packs') and n.endswith('manifest.json')]
    for m in manifests:
        data = json.loads(zf.read(m).decode('utf-8'))
        header = data.get('header', {})
        deps = data.get('dependencies', [])
        print(f"\n{m} ({header.get('name')}):")
        for d in deps:
            print(f"  dep: {d}")
