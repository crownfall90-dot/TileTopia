"""Classic 2.0 cards for the game: the Blender renders (build/hex-render/*.png) cut to the exact hexagon, reduced and
saved as WebP in app/src/main/assets/hex/ (the app and the site load them from there), plus a contact sheet.
    python scripts/hex-pack.py [render-dir] [--sheet docs/design/hex-tiles-preview.jpg]
"""
import json
import math
import os
import sys
from PIL import Image, ImageDraw, ImageFont

src = next((a for a in sys.argv[1:] if not a.startswith('--')), 'build/hex-render')
sheet = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else 'docs/design/hex-tiles-preview.jpg'
out = 'app/src/main/assets/hex'
W = 640                                   # the game shows a card up to ~550 px wide on a sharp phone, zoomed in
types = json.load(open('tools/blender_generators/hex_shapes.json', encoding='utf-8'))['types']
os.makedirs(out, exist_ok=True)


def hex_mask(w, h, k=4):
    """The card's hexagon (flat top), anti-aliased."""
    m = Image.new('L', (w * k, h * k), 0)
    cx, cy, r = w * k / 2, h * k / 2, w * k / 2
    ImageDraw.Draw(m).polygon([(cx + r * math.cos(math.radians(60 * i)), cy + r * math.sin(math.radians(60 * i))) for i in range(6)], fill=255)
    return m.resize((w, h), Image.LANCZOS)


done, missing = [], []
for tid in types:
    p = os.path.join(src, tid + '.png')
    if not os.path.exists(p):
        missing.append(tid)
        continue
    im = Image.open(p).convert('RGBA')
    h = round(W * math.sqrt(3) / 2)
    im = im.resize((W, h), Image.LANCZOS)
    a = Image.composite(im.getchannel('A'), Image.new('L', im.size, 0), hex_mask(W, h))
    im.putalpha(a)
    im.save(os.path.join(out, tid + '.webp'), 'WEBP', quality=84, method=6)
    done.append((tid, im))
total = sum(os.path.getsize(os.path.join(out, t + '.webp')) for t, _ in done)
print(f'{len(done)} cards, {total // 1024} KB in {out}' + (f'; not rendered: {", ".join(missing)}' if missing else ''))
if done and sheet:
    cols, cw, chh = 6, 300, 290
    rows = math.ceil(len(done) / cols)
    S = Image.new('RGB', (cols * cw, rows * chh), (30, 36, 62))
    d = ImageDraw.Draw(S)
    for i, (tid, im) in enumerate(done):
        t = im.resize((cw - 20, round((cw - 20) * math.sqrt(3) / 2)), Image.LANCZOS)
        x, y = (i % cols) * cw + 10, (i // cols) * chh + 6
        S.paste(t, (x, y), t)
        d.text((x + 4, y + t.height + 4), f"{tid}  {types[tid]['e']}  {types[tid]['name']}", fill=(220, 226, 240))
    os.makedirs(os.path.dirname(sheet), exist_ok=True)
    S.save(sheet, quality=86)
    print('sheet', sheet)
