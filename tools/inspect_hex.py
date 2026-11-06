import os, sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
im2_path = r"C:\Users\crown\.gemini\antigravity\brain\5a72ad28-1b08-4fd1-9102-cd8da0e519c8\tiletopia_tiles_hexagonal_6side_diorama_1793957496362.jpg"
im2 = Image.open(im2_path)
print("Hex image format:", im2.format, im2.size, im2.mode)
