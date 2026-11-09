"""Classic cards for the game: the Blender renders (build/square-render/*.png, generate_hex_tiles.py with
TILE_SHAPES=square_shapes.json) reduced and saved as WebP in app/src/main/assets/tiles/, where the game loads them.
    python scripts/square-pack.py [render-dir]
"""
import json
import os
import sys
from PIL import Image
src = next((a for a in sys.argv[1:] if not a.startswith('--')), 'build/square-render')
out = 'app/src/main/assets/tiles'
W = 512
types = json.load(open('tools/blender_generators/square_shapes.json', encoding='utf-8'))['types']
done = [t for t in types if os.path.exists(os.path.join(src, t + '.png'))]
for t in done:
    Image.open(os.path.join(src, t + '.png')).convert('RGB').resize((W, W), Image.LANCZOS).save(os.path.join(out, t + '.webp'), 'WEBP', quality=84, method=6)
print(len(done), 'cards;', 'not rendered:', [t for t in types if t not in done])
