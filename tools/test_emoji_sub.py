import os, sys, re

sys.stdout.reconfigure(encoding='utf-8')

# Emoji pattern
# Range 1: SMP emojis (0x1F000 - 0x1FAFF)
# Range 2: Misc symbols & Dingbats (0x2600 - 0x27BF)
# Range 3: Misc technical (0x2300 - 0x23FF)
# Range 4: Arrows & Supplemental arrows (0x2190 - 0x21FF, 0x2B00 - 0x2BFF)
# Range 5: Variation selectors & ZWJ (0xFE0E, 0xFE0F, 0x200D)
EMOJI_PATTERN = re.compile(
    r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b00-\u2bff\u2190-\u21ff\u200d\ufe0e\ufe0f]+[ \t]?',
    re.UNICODE
)

def preview_clean(text):
    return EMOJI_PATTERN.sub('', text)

test_str = "§l§b🛸 战术无人机\\n§r§f僚机伴飞、整备、改装与能量加注"
print("Test:", preview_clean(test_str))
