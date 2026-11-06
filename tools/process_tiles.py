import os, sys
from PIL import Image, ImageOps, ImageFilter, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')

im1_path = r"C:\Users\crown\.gemini\antigravity\brain\5a72ad28-1b08-4fd1-9102-cd8da0e519c8\tiletopia_tiles_classic_square_diorama_1793957481168.jpg"
im2_path = r"C:\Users\crown\.gemini\antigravity\brain\5a72ad28-1b08-4fd1-9102-cd8da0e519c8\tiletopia_tiles_hexagonal_6side_diorama_1793957496362.jpg"

classic_dir = "assets/tiles_classic_4side"
hex_dir = "assets/tiles_hex_6side"
os.makedirs(classic_dir, exist_ok=True)
os.makedirs(hex_dir, exist_ok=True)

im1 = Image.open(im1_path).convert("RGBA")
im2 = Image.open(im2_path).convert("RGBA")

# For the 3x3 grid of classic tiles (1024x1024):
# Cells are approximately 341x341.
# Let's inspect the 9 tiles:
# Row 0: River straight, River stone bridge, Grand lake bridge (aqueduct)
# Row 1: Serene lake basin, Cobblestone road, 4-way crossroad
# Row 2: Medieval village, Stone fortress / castle, Hilltop monastery cloister

classic_tiles_meta = [
    {"id": "tile_4s_river_straight", "name": "Река (прямое русло)", "row": 0, "col": 0, "desc": "Чистая лазурная река с цветущими травянистыми берегами"},
    {"id": "tile_4s_river_bridge", "name": "Мост через реку", "row": 0, "col": 1, "desc": "Арочный каменный мост через речной перекат"},
    {"id": "tile_4s_lake_grand_bridge", "name": "Большой мост через озеро", "row": 0, "col": 2, "desc": "Величественный многоарочный акведук через глубокое озеро"},
    {"id": "tile_4s_lake_basin", "name": "Озеро с причалом", "row": 1, "col": 0, "desc": "Зеркальная гладь озера с камышами и деревянным пирсом"},
    {"id": "tile_4s_road_straight", "name": "Тракт (прямая дорога)", "row": 1, "col": 1, "desc": "Булыжная дорога сквозь зеленые луга"},
    {"id": "tile_4s_road_crossroad", "name": "Перекрёсток 4 дорог", "row": 1, "col": 2, "desc": "Пересечение дорог с каменным путевым указателем"},
    {"id": "tile_4s_village", "name": "Деревня (поселение)", "row": 2, "col": 0, "desc": "Уютная средневековая деревня с черепичными крышами"},
    {"id": "tile_4s_fortress", "name": "Крепость (цитадель)", "row": 2, "col": 1, "desc": "Неприступный каменный замок с башнями и штандартами"},
    {"id": "tile_4s_monastery", "name": "Монастырь (капелла)", "row": 2, "col": 2, "desc": "Древний монастырь на холме с колокольней и садом"},
]

w, h = im1.size
cell_w = w / 3
cell_h = h / 3

for tile in classic_tiles_meta:
    r, c = tile["row"], tile["col"]
    # Add slight margin inside cell to isolate the diorama tile cleanly
    x0 = int(c * cell_w + 12)
    y0 = int(r * cell_h + 12)
    x1 = int((c + 1) * cell_w - 12)
    y1 = int((r + 1) * cell_h - 12)
    
    crop = im1.crop((x0, y0, x1, y1))
    
    # Create high-res 512x512 tile sprite
    # We create a 512x512 canvas, resize the crop with high quality Lanczos, and add a subtle rounded corner/border
    out = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    resized_crop = crop.resize((480, 480), Image.Resampling.LANCZOS)
    
    # Create rounded mask for clean sprite presentation
    mask = Image.new("L", (480, 480), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, 480, 480], radius=36, fill=255)
    
    # Soft drop shadow
    shadow = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([20, 24, 492, 496], radius=40, fill=(0, 0, 0, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    
    out.paste(shadow, (0, 0), shadow)
    out.paste(resized_crop, (16, 12), mask)
    
    # Save individual PNG sprite
    dest = os.path.join(classic_dir, f"{tile['id']}.png")
    out.save(dest, "PNG")
    print(f"Saved {dest}")

print("Classic 4-sided tiles processed successfully!")
