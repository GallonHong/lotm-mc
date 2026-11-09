import os, sys, re

sys.stdout.reconfigure(encoding='utf-8')

# Strict emoji regex
emoji_pattern = re.compile(
    r'[\U00010000-\U0010ffff]' # Surrogate pairs / SMP (e.g. 🛸, 🚗, 🎮, 📦, 🗑️, 🚀, 🏆, etc.)
    r'|[\u2600-\u26ff]'        # Misc symbols (e.g. ⛁, ⚠️, ⚙, ⚔, ⚖)
    r'|[\u2700-\u27bf]'        # Dingbats (e.g. ✖, ➕, ❌, ✳)
    r'|[\u2300-\u23ff]'        # Misc Technical (e.g. ⏰, ⏳)
    r'|[\u2b50-\u2b55]'        # Stars etc
    r'|[\u200d\ufe0f]',        # Zero width joiner and variation selector
    re.UNICODE
)

all_emojis = set()
for root, dirs, files in os.walk('addons/development'):
    if any(x in root for x in ['.git', 'node_modules', '__pycache__']):
        continue
    for f in files:
        if f.endswith('.js') or f.endswith('.json'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
                found = emoji_pattern.findall(content)
                for c in found:
                    all_emojis.add(c)

print(f"Total distinct emoji chars: {len(all_emojis)}")
for c in sorted(all_emojis):
    try:
        print(f"'{c}' (U+{ord(c):04X})")
    except:
        print(f"Unknown char (len {len(c)})")
