"""Regenerate the classic Tiletopia launcher, web and Google Play icons.

Requires Pillow, Node, Playwright and its Chromium. The two vector layers live in store/src.
Run from the repository with python scripts/install-icon.py.
"""
import subprocess
from pathlib import Path

from PIL import Image
from PIL.PngImagePlugin import PngInfo


def main():
    root = Path(__file__).resolve().parent.parent
    subprocess.run(['node', 'scripts/render-icons.cjs'], cwd=root, check=True)

    play_icon = root / 'store/icon-512.png'
    with Image.open(play_icon) as rendered:
        icon = rendered.convert('RGBA')
    color_space = PngInfo()
    color_space.add(b'sRGB', b'\x00')
    icon.save(play_icon, pnginfo=color_space, optimize=True)


if __name__ == '__main__':
    main()
