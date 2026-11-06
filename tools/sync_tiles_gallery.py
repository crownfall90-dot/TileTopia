import os, sys, shutil

sys.stdout.reconfigure(encoding='utf-8')

os.makedirs("assets/tiles/classic_4side", exist_ok=True)
os.makedirs("assets/tiles/hex_6side", exist_ok=True)

for f in os.listdir("assets/tiles_classic_4side"):
    if f.endswith('.png'):
        shutil.copy2(os.path.join("assets/tiles_classic_4side", f), os.path.join("assets/tiles/classic_4side", f))

for f in os.listdir("assets/tiles_hex_6side"):
    if f.endswith('.png'):
        shutil.copy2(os.path.join("assets/tiles_hex_6side", f), os.path.join("assets/tiles/hex_6side", f))

print("Copied diorama sprites to assets/tiles/classic_4side/ and assets/tiles/hex_6side/")
