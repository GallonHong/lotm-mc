import os, sys, re

sys.stdout.reconfigure(encoding='utf-8')

# Emoji pattern
# Covers supplemental symbols, pictographs, emoticons, misc symbols, dingbats
emoji_pattern = re.compile(
    r'[\U00010000-\U0010ffff]'
    r'|[\u2600-\u27bf]'
    r'|[\u2300-\u23ff]'
    r'|[\u2b50-\u2b55]'
    r'|[\u200d\ufe0f]',
    re.UNICODE
)

def scan_dir(dir_path):
    matches = {}
    for root, dirs, files in os.walk(dir_path):
        for f in files:
            if f.endswith('.js') or f.endswith('.json'):
                p = os.path.join(root, f)
                with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                    found = emoji_pattern.findall(content)
                    if found:
                        matches[p] = list(set(found))
    return matches

for d in [
    'addons/development/apocalypse_life_addon/apocalypse_life_bp/scripts',
    'addons/development/sapi_server_addon/sapi_server_bp/scripts'
]:
    res = scan_dir(d)
    print(f'=== {d} (Total files with emoji: {len(res)}) ===')
    for p, ems in res.items():
        print(f'{p}: {len(ems)} distinct emojis')
