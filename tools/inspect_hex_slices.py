import os, sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
im2_path = r"C:\Users\crown\.gemini\antigravity\brain\5a72ad28-1b08-4fd1-9102-cd8da0e519c8\tiletopia_tiles_hexagonal_6side_diorama_1793957496362.jpg"
im2 = Image.open(im2_path)

# Let's save a grid of 3x3 crops or inspect the centers
w, h = im2.size
# Let's inspect where features are by saving thumbnail slices
os.makedirs("scratch/hex_slices", exist_ok=True)
for i in range(3):
    for j in range(3):
        box = (int(j * w / 3), int(i * h / 3), int((j + 1) * w / 3), int((i + 1) * h / 3))
        crop = im2.crop(box)
        crop.save(f"scratch/hex_slices/hex_{i}_{j}.jpg")

print("Saved scratch/hex_slices")
