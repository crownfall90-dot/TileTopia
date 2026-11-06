import os, sys, math
from PIL import Image, ImageDraw, ImageFilter

sys.stdout.reconfigure(encoding='utf-8')

im2_path = r"C:\Users\crown\.gemini\antigravity\brain\5a72ad28-1b08-4fd1-9102-cd8da0e519c8\tiletopia_tiles_hexagonal_6side_diorama_1793957496362.jpg"
im2 = Image.open(im2_path).convert("RGBA")
hex_dir = "assets/tiles_hex_6side"
os.makedirs(hex_dir, exist_ok=True)

# Function to create a clean hexagonal mask with beveled / rounded corners
def create_hex_mask(size, radius, flat_topped=True):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    cx, cy = size[0] / 2, size[1] / 2
    pts = []
    for k in range(6):
        angle = (math.pi / 6 if flat_topped else 0) + k * (math.pi / 3)
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        pts.append((x, y))
    draw.polygon(pts, fill=255)
    return mask

# Define metadata for hexagonal 6-sided tiles
hex_tiles_meta = [
    {"id": "tile_6s_river_straight", "name": "Гекс: Река", "row": 0, "col": 0, "desc": "Лазурная река, пересекающая противоположные грани гекса (стороны 1 и 4)"},
    {"id": "tile_6s_river_bridge", "name": "Гекс: Мост через реку", "row": 0, "col": 1, "desc": "Арочный каменный мост над горным речным потоком"},
    {"id": "tile_6s_lake_grand_bridge", "name": "Гекс: Большой мост через озеро", "row": 0, "col": 2, "desc": "Монументальный каменный мост через глубоководное озеро"},
    {"id": "tile_6s_lake_basin", "name": "Гекс: Горное озеро", "row": 1, "col": 0, "desc": "Кристальное озеро с каменистыми берегами и островком"},
    {"id": "tile_6s_road_straight", "name": "Гекс: Дорожный тракт", "row": 1, "col": 1, "desc": "Мощеная дорога через зеленые луга шестиугольного тайла"},
    {"id": "tile_6s_road_junction", "name": "Гекс: Тройная развилка", "row": 1, "col": 2, "desc": "Сход трех дорог к центру гекса с указателем"},
    {"id": "tile_6s_village", "name": "Гекс: Средневековая деревня", "row": 2, "col": 0, "desc": "Селение с фахверковыми домиками, мельницей и садами"},
    {"id": "tile_6s_fortress", "name": "Гекс: Замок-цитадель", "row": 2, "col": 1, "desc": "Шестигранная каменная крепость с угловыми башнями и рвом"},
    {"id": "tile_6s_monastery", "name": "Гекс: Горный монастырь", "row": 2, "col": 2, "desc": "Уединенный монастырь с колокольней и кипарисовой рощей"},
]

w, h = im2.size
cell_w = w / 3
cell_h = h / 3

for tile in hex_tiles_meta:
    r, c = tile["row"], tile["col"]
    x0 = int(c * cell_w + 14)
    y0 = int(r * cell_h + 14)
    x1 = int((c + 1) * cell_w - 14)
    y1 = int((r + 1) * cell_h - 14)
    
    crop = im2.crop((x0, y0, x1, y1))
    
    # 512x512 canvas
    out = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    resized_crop = crop.resize((460, 460), Image.Resampling.LANCZOS)
    
    # Hexagonal mask
    hmask = create_hex_mask((460, 460), radius=220, flat_topped=True)
    
    # Drop shadow
    shadow = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    spts = []
    scx, scy = 256, 266
    for k in range(6):
        angle = (math.pi / 6) + k * (math.pi / 3)
        spts.append((scx + 224 * math.cos(angle), scy + 224 * math.sin(angle)))
    sdraw.polygon(spts, fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    
    out.paste(shadow, (0, 0), shadow)
    out.paste(resized_crop, (26, 26), hmask)
    
    dest = os.path.join(hex_dir, f"{tile['id']}.png")
    out.save(dest, "PNG")
    print(f"Saved {dest}")

print("Hexagonal 6-sided tiles processed successfully!")
