import os
from PIL import Image

brain_dir = r"C:\Users\crown\.gemini\antigravity\brain\5a72ad28-1b08-4fd1-9102-cd8da0e519c8"
icons_dest = r"D:\TileTopia\store\icons_variants"
feature_dest = r"D:\TileTopia\store"

os.makedirs(icons_dest, exist_ok=True)

# 1. Process Icons (512x512 PNG)
icon_map = {
    "tiletopia_icon_diorama_tile_1793956059434.jpg": "icon-6-3d-diorama-castle.png",
    "tiletopia_icon_golden_meeple_1793956076379.jpg": "icon-7-3d-golden-meeple.png",
    "tiletopia_icon_puzzle_kingdom_1793956093710.jpg": "icon-8-3d-puzzle-kingdom.png"
}

for src_name, dst_name in icon_map.items():
    src_path = os.path.join(brain_dir, src_name)
    dst_path = os.path.join(icons_dest, dst_name)
    if os.path.exists(src_path):
        im = Image.open(src_path)
        im_resized = im.resize((512, 512), Image.Resampling.LANCZOS)
        im_resized.save(dst_path, format="PNG", optimize=True)
        print(f"Saved {dst_path} (512x512)")

# Copy Option 1 as current top candidate to store/icon-512.png
top_icon = os.path.join(icons_dest, "icon-6-3d-diorama-castle.png")
if os.path.exists(top_icon):
    im = Image.open(top_icon)
    im.save(os.path.join(feature_dest, "icon-512.png"), format="PNG", optimize=True)
    print("Updated store/icon-512.png with 3D Diorama")

# 2. Process Feature Graphic (Exact 1024x500 PNG)
banner_src = os.path.join(brain_dir, "tiletopia_feature_graphic_banner_1793956111128.jpg")
if os.path.exists(banner_src):
    im_b = Image.open(banner_src)
    # Crop / fit to 1024x500
    target_w, target_h = 1024, 500
    w, h = im_b.size
    aspect_target = target_w / target_h
    aspect_src = w / h

    if aspect_src > aspect_target:
        # Source is wider, crop sides
        new_w = int(h * aspect_target)
        offset = (w - new_w) // 2
        im_cropped = im_b.crop((offset, 0, offset + new_w, h))
    else:
        # Source is taller, crop top/bottom
        new_h = int(w / aspect_target)
        offset = (h - new_h) // 2
        im_cropped = im_b.crop((0, offset, w, offset + new_h))

    im_banner_final = im_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    banner_dst = os.path.join(feature_dest, "feature-1024x500.png")
    im_banner_final.save(banner_dst, format="PNG", optimize=True)
    print(f"Saved {banner_dst} (1024x500 exact)")

    # Also save to feature_variants
    fv_dir = os.path.join(feature_dest, "feature_variants")
    os.makedirs(fv_dir, exist_ok=True)
    im_banner_final.save(os.path.join(fv_dir, "feature-epic-tabletop-3d.png"), format="PNG")
    print("Saved feature-variants/feature-epic-tabletop-3d.png")
