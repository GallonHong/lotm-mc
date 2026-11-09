import os, sys, re, subprocess

sys.stdout.reconfigure(encoding='utf-8')

EMOJI_REGEX = re.compile(
    r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b00-\u2bff\u2190-\u21ff\u200d\ufe0e\ufe0f]+[ \t]?',
    re.UNICODE
)

modified_files = []

for root, dirs, files in os.walk('addons/development'):
    if any(x in root for x in ['.git', 'node_modules', '__pycache__', 'textures', 'models', 'sounds']):
        continue
    for f in files:
        if not (f.endswith('.js') or f.endswith('.json')):
            continue
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
            original = fp.read()

        content = original

        if 'PianoSystem.js' in f:
            content = content.replace('§8♯', '§8#').replace('§f♩', '§f')
        if 'currencySymbol' in content:
            content = content.replace('§e⛁§r', '§e金币§r').replace('⛁', '金币')

        cleaned = EMOJI_REGEX.sub('', content)

        # Cleanup leftover double spaces or spacing right after section symbol color codes
        cleaned = cleaned.replace('  ', ' ')
        cleaned = re.sub(r'(§[0-9a-fk-or]) +', r'\1', cleaned)

        if cleaned != original:
            with open(path, 'w', encoding='utf-8') as fp:
                fp.write(cleaned)
            modified_files.append(path)
            print(f"Cleaned: {path}")

print(f"\nTotal files cleaned across all addons: {len(modified_files)}")

# Check syntax of all modified .js files
has_syntax_error = False
for p in modified_files:
    if p.endswith('.js'):
        res = subprocess.run(['node', '-c', p], capture_output=True, text=True)
        if res.returncode != 0:
            print(f"ERROR: Syntax error in {p} after emoji cleaning:\n{res.stderr}")
            has_syntax_error = True

if not has_syntax_error:
    print("ALL modified .js files passed syntax check (node -c)!")
else:
    sys.exit(1)
