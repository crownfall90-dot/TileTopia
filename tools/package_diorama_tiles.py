import os, sys, zipfile

sys.stdout.reconfigure(encoding='utf-8')

os.makedirs("assets/tiles", exist_ok=True)

# 1. Classic 4-side ZIP
zip_classic = "assets/tiles/tiletopia-classic-4side-diorama.zip"
with zipfile.ZipFile(zip_classic, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir("assets/tiles_classic_4side")):
        if f.endswith('.png'):
            z.write(os.path.join("assets/tiles_classic_4side", f), f)
print(f"Created {zip_classic} ({os.path.getsize(zip_classic)} bytes)")

# 2. Hex 6-side ZIP
zip_hex = "assets/tiles/tiletopia-hex-6side-diorama.zip"
with zipfile.ZipFile(zip_hex, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir("assets/tiles_hex_6side")):
        if f.endswith('.png'):
            z.write(os.path.join("assets/tiles_hex_6side", f), f)
print(f"Created {zip_hex} ({os.path.getsize(zip_hex)} bytes)")

# 3. All diorama tiles combined
zip_all = "assets/tiles/tiletopia-all-diorama-tiles.zip"
with zipfile.ZipFile(zip_all, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir("assets/tiles_classic_4side")):
        if f.endswith('.png'):
            z.write(os.path.join("assets/tiles_classic_4side", f), f"classic_4side/{f}")
    for f in sorted(os.listdir("assets/tiles_hex_6side")):
        if f.endswith('.png'):
            z.write(os.path.join("assets/tiles_hex_6side", f), f"hex_6side/{f}")
print(f"Created {zip_all} ({os.path.getsize(zip_all)} bytes)")
