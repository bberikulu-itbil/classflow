# Lists interface strings (Kazakh, in src/) that src/i18n/dict.json does not translate yet. Run: python3 scripts/i18n-missing.py
# Add each as "kk": ["ru", "en"] to dict.json; `${...}` in a template string becomes {0}, {1}, … in the key.
import re, os, json
CYR = re.compile(r'[ӘәҒғҚқҢңӨөҰұҮүҺһІі]')  # Kazakh-only letters: Russian strings (already pick()-ed) are skipped
d = json.load(open('src/i18n/dict.json', encoding='utf8'))
seen = set()
for root, _, fs in os.walk('src'):
    for f in fs:
        p = os.path.join(root, f)
        if not p.endswith(('.ts', '.tsx')) or (p.startswith('src/lessons/') and not (p.endswith('.tsx') and p.count('/') == 2)) or 'LabWidgets' in p: continue
        s = re.sub(r'/\*.*?\*/', '', open(p, encoding='utf8').read(), flags=re.S)
        s = re.sub(r'(?m)(^|[^:\'"`\\])//[^\n]*', r'\1', s)
        for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`|>([^<>{}]+)<", s):
            t = ' '.join(next((g for g in m.groups() if g is not None), '').split())
            n = iter(range(99)); k = re.sub(r'\$\{[^}]*\}', lambda _: '{%d}' % next(n), t)
            if k and CYR.search(k) and len(k) < 400 and k not in d and k not in seen:
                seen.add(k); print(f'{p}\t{k}')
