import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def make_gradient(width, height, color_top, color_bot):
    base = Image.new('RGBA', (width, height), color_top)
    top = Image.new('RGBA', (width, height), color_top)
    bot = Image.new('RGBA', (width, height), color_bot)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        ratio = y / float(height)
        mask_data.extend([int(ratio * 255)] * width)
    mask.putdata(mask_data)
    return Image.composite(bot, top, mask)

def draw_decor_circle(draw, cx, cy, radius, color):
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], outline=color, width=2)

def generate_screenshots():
    out_dir = r"D:\TileTopia\store\blender_screenshots"
    os.makedirs(out_dir, exist_ok=True)

    font_title = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 64)
    font_subtitle = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 36)
    font_badge = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 28)

    # 1. SCREENSHOT 1: Живые миры из плиток
    # Background: Deep midnight blue gradient
    im1 = make_gradient(1080, 1920, (20, 28, 58, 255), (8, 12, 28, 255))
    draw1 = ImageDraw.Draw(im1)

    # Decorative background circles & gold lines
    draw_decor_circle(draw1, 540, 1050, 480, (255, 255, 255, 20))
    draw_decor_circle(draw1, 540, 1050, 460, (242, 184, 75, 40))

    # Header Badge
    draw1.rounded_rectangle([380, 110, 700, 160], radius=25, fill=(242, 184, 75, 30), outline=(242, 184, 75, 180), width=2)
    draw1.text((540, 135), "СТРАТЕГИЯ И ПАЗЛ", font=font_badge, fill=(255, 220, 130), anchor="mm")

    # Titles
    draw1.text((540, 220), "СОЗДАВАЙТЕ ЖИВЫЕ МИРЫ", font=font_title, fill=(255, 255, 255), anchor="mm")
    draw1.text((540, 290), "Соединяйте реки, дороги и старинные замки", font=font_subtitle, fill=(180, 200, 240), anchor="mm")

    # Center Hero Composition: 3D Castle Tile + 3D Bridge Tile + 3D Golden Meeple
    tile_castle = Image.open(r"D:\TileTopia\store\blender_tiles\tile_3d_castle_fort.png").convert("RGBA")
    tile_bridge = Image.open(r"D:\TileTopia\store\blender_tiles\tile_3d_river_bridge.png").convert("RGBA")
    meeple_gold = Image.open(r"D:\TileTopia\store\blender_ui\meeple_gold.png").convert("RGBA")

    # Place tiles in isometric perspective
    tc_scaled = tile_castle.resize((480, 480), Image.Resampling.LANCZOS)
    tb_scaled = tile_bridge.resize((480, 480), Image.Resampling.LANCZOS)
    mg_scaled = meeple_gold.resize((360, 360), Image.Resampling.LANCZOS)

    im1.paste(tb_scaled, (120, 850), tb_scaled)
    im1.paste(tc_scaled, (480, 680), tc_scaled)
    im1.paste(mg_scaled, (360, 920), mg_scaled)

    # Bottom phone mockup card
    draw1.rounded_rectangle([100, 1450, 980, 1780], radius=30, fill=(15, 22, 45, 220), outline=(242, 184, 75, 120), width=2)
    draw1.text((540, 1540), "✨ Уникальные сезонные эпохи", font=font_title, fill=(255, 255, 255), anchor="mm")
    draw1.text((540, 1630), "Деревня • Мегаполис • Тайга • Джунгли", font=font_subtitle, fill=(242, 184, 75), anchor="mm")
    draw1.text((540, 1710), "Каждая выложенная плитка меняет карту", font=font_subtitle, fill=(170, 190, 220), anchor="mm")

    im1.save(os.path.join(out_dir, "1-showcase-world.png"))
    print("Saved 1-showcase-world.png")


    # 2. SCREENSHOT 2: Тактика и расчет
    im2 = make_gradient(1080, 1920, (18, 32, 52, 255), (8, 16, 30, 255))
    draw2 = ImageDraw.Draw(im2)

    draw2.rounded_rectangle([390, 110, 690, 160], radius=25, fill=(63, 194, 122, 35), outline=(63, 194, 122, 180), width=2)
    draw2.text((540, 135), "ГЛУБОКИЙ ГЕЙМПЛЕЙ", font=font_badge, fill=(140, 245, 180), anchor="mm")

    draw2.text((540, 220), "ТАКТИКА И ТОЧНЫЙ РАСЧЕТ", font=font_title, fill=(255, 255, 255), anchor="mm")
    draw2.text((540, 290), "Завершайте тракты и захватывайте крепости", font=font_subtitle, fill=(180, 210, 230), anchor="mm")

    # Center: Crossroads tile + Straight road tile + Red & Blue meeples
    t_cross = Image.open(r"D:\TileTopia\store\blender_tiles\tile_3d_road_crossroads.png").convert("RGBA").resize((480, 480), Image.Resampling.LANCZOS)
    t_road = Image.open(r"D:\TileTopia\store\blender_tiles\tile_3d_road_straight.png").convert("RGBA").resize((480, 480), Image.Resampling.LANCZOS)
    m_blue = Image.open(r"D:\TileTopia\store\blender_ui\meeple_blue.png").convert("RGBA").resize((320, 320), Image.Resampling.LANCZOS)
    m_red = Image.open(r"D:\TileTopia\store\blender_ui\meeple_red.png").convert("RGBA").resize((320, 320), Image.Resampling.LANCZOS)

    im2.paste(t_cross, (150, 750), t_cross)
    im2.paste(t_road, (480, 850), t_road)
    im2.paste(m_blue, (180, 960), m_blue)
    im2.paste(m_red, (580, 780), m_red)

    draw2.rounded_rectangle([100, 1450, 980, 1780], radius=30, fill=(14, 25, 42, 220), outline=(63, 194, 122, 120), width=2)
    draw2.text((540, 1540), "♟️ Умные соперники", font=font_title, fill=(255, 255, 255), anchor="mm")
    draw2.text((540, 1630), "3 уровня сложности ботов или локальный матч", font=font_subtitle, fill=(120, 240, 170), anchor="mm")
    draw2.text((540, 1710), "Режим Дзен без таймеров и ограничений", font=font_subtitle, fill=(170, 190, 220), anchor="mm")

    im2.save(os.path.join(out_dir, "2-showcase-tactics.png"))
    print("Saved 2-showcase-tactics.png")


    # 3. SCREENSHOT 3: Дуэли онлайн и с друзьями
    im3 = make_gradient(1080, 1920, (32, 22, 54, 255), (14, 8, 26, 255))
    draw3 = ImageDraw.Draw(im3)

    draw3.rounded_rectangle([390, 110, 690, 160], radius=25, fill=(176, 108, 240, 35), outline=(176, 108, 240, 180), width=2)
    draw3.text((540, 135), "МУЛЬТИПЛЕЕР 2-5 ИГРОКОВ", font=font_badge, fill=(225, 180, 255), anchor="mm")

    draw3.text((540, 220), "ОНЛАЙН-ДУЭЛИ И ЛИГИ", font=font_title, fill=(255, 255, 255), anchor="mm")
    draw3.text((540, 290), "Создавайте комнаты и играйте по сети", font=font_subtitle, fill=(210, 190, 240), anchor="mm")

    trophy = Image.open(r"D:\TileTopia\store\blender_ui\ui_trophy_gold.png").convert("RGBA").resize((440, 440), Image.Resampling.LANCZOS)
    crown = Image.open(r"D:\TileTopia\store\blender_ui\ui_crown_royal.png").convert("RGBA").resize((380, 380), Image.Resampling.LANCZOS)
    dice = Image.open(r"D:\TileTopia\store\blender_ui\ui_dice_3d.png").convert("RGBA").resize((280, 280), Image.Resampling.LANCZOS)

    im3.paste(trophy, (320, 720), trophy)
    im3.paste(crown, (140, 940), crown)
    im3.paste(dice, (660, 980), dice)

    draw3.rounded_rectangle([100, 1450, 980, 1780], radius=30, fill=(24, 15, 42, 220), outline=(176, 108, 240, 120), width=2)
    draw3.text((540, 1540), "🏆 Сезонный рейтинг кубков", font=font_title, fill=(255, 255, 255), anchor="mm")
    draw3.text((540, 1630), "Быстрый поиск онлайн или закрытые комнаты", font=font_subtitle, fill=(215, 170, 255), anchor="mm")
    draw3.text((540, 1710), "Поддержка от 2 до 5 участников за столом", font=font_subtitle, fill=(190, 180, 220), anchor="mm")

    im3.save(os.path.join(out_dir, "3-showcase-online.png"))
    print("Saved 3-showcase-online.png")


    # 4. SCREENSHOT 4: Коллекция и фигурки
    im4 = make_gradient(1080, 1920, (30, 25, 20, 255), (15, 12, 10, 255))
    draw4 = ImageDraw.Draw(im4)

    draw4.rounded_rectangle([390, 110, 690, 160], radius=25, fill=(242, 153, 74, 35), outline=(242, 153, 74, 180), width=2)
    draw4.text((540, 135), "ПЕРСОНАЛИЗАЦИЯ", font=font_badge, fill=(255, 200, 150), anchor="mm")

    draw4.text((540, 220), "КОЛЛЕКЦИЯ И НАГРАДЫ", font=font_title, fill=(255, 255, 255), anchor="mm")
    draw4.text((540, 290), "Открывайте 3D-фигурки, рамки и статусы", font=font_subtitle, fill=(230, 200, 170), anchor="mm")

    m_gold_big = Image.open(r"D:\TileTopia\store\blender_ui\meeple_gold.png").convert("RGBA").resize((320, 320), Image.Resampling.LANCZOS)
    m_blue_big = Image.open(r"D:\TileTopia\store\blender_ui\meeple_blue.png").convert("RGBA").resize((300, 300), Image.Resampling.LANCZOS)
    m_red_big = Image.open(r"D:\TileTopia\store\blender_ui\meeple_red.png").convert("RGBA").resize((300, 300), Image.Resampling.LANCZOS)
    m_green_big = Image.open(r"D:\TileTopia\store\blender_ui\meeple_green.png").convert("RGBA").resize((300, 300), Image.Resampling.LANCZOS)

    im4.paste(m_gold_big, (380, 680), m_gold_big)
    im4.paste(m_blue_big, (140, 920), m_blue_big)
    im4.paste(m_red_big, (640, 920), m_red_big)
    im4.paste(m_green_big, (390, 1040), m_green_big)

    draw4.rounded_rectangle([100, 1450, 980, 1780], radius=30, fill=(35, 22, 15, 220), outline=(242, 153, 74, 120), width=2)
    draw4.text((540, 1540), "👑 Витрина вашего профиля", font=font_title, fill=(255, 255, 255), anchor="mm")
    draw4.text((540, 1630), "Примерка рамок и титулов перед партией", font=font_subtitle, fill=(255, 185, 110), anchor="mm")
    draw4.text((540, 1710), "Кастомизируйте фигурку в любимый цвет", font=font_subtitle, fill=(210, 190, 180), anchor="mm")

    im4.save(os.path.join(out_dir, "4-showcase-customization.png"))
    print("Saved 4-showcase-customization.png")

if __name__ == "__main__":
    generate_screenshots()
