"""Puts the two currency pictures (assets/coins/tile.webp, star.webp) into src/ui/styles.css as data URIs.

Why not files: the game page is also delivered over the air (only web.html is downloaded), and an older APK has no new
picture files, so the coins would be empty. A data URI travels with the page. Run after changing the pictures:

    python3 scripts/coins-embed.py
"""
import base64
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CSS = os.path.join(ROOT, 'src', 'ui', 'styles.css')


def uri(name):
    with open(os.path.join(ROOT, 'assets', 'coins', name + '.webp'), 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode()


css = open(CSS, encoding='utf-8', newline='').read()
for name in ('tile', 'star'):
    pat = re.compile(r'(--coin-%s:\s*url\()"[^"]*"(\))' % name)
    assert pat.search(css), 'no --coin-%s in styles.css' % name
    css = pat.sub(lambda m: m.group(1) + '"' + uri(name) + '"' + m.group(2), css)
open(CSS, 'w', encoding='utf-8', newline='').write(css)
print('embedded', ', '.join(('tile', 'star')))
