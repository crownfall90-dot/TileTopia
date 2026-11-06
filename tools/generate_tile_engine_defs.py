import os, sys, json

sys.stdout.reconfigure(encoding='utf-8')

# Formal system definitions for playable tile engines

# 1. CLASSIC SQUARE (4-SIDED) TILES
# Directions: 0: North, 1: East, 2: South, 3: West
# Edges: 'f': Field/Meadow/Forest, 'r': Road, 'w': River/Water, 'c': City/Town/Wall, 'b': Bridge half
CLASSIC_4SIDE_TILES = [
    {
        "id": "tile_4s_river_straight",
        "name": "Река (прямое русло)",
        "edges": "wfwf",
        "category": "river",
        "sides_desc": "Север: Река · Восток: Луг · Юг: Река · Запад: Луг",
        "desc": "Сквозное русло реки. Стыкуется с любыми речными тайлами с севера и юга, и с полями с запада и востока."
    },
    {
        "id": "tile_4s_river_bend",
        "name": "Излучина реки (поворот)",
        "edges": "wwff",
        "category": "river",
        "sides_desc": "Север: Река · Восток: Река · Юг: Луг · Запад: Луг",
        "desc": "Поворот реки на 90°. Стыкуется с реками на севере и востоке, с лугами на юге и западе."
    },
    {
        "id": "tile_4s_river_bridge",
        "name": "Мост через реку",
        "edges": "wrwr",
        "category": "bridge river road",
        "sides_desc": "Север: Река · Восток: Тракт · Юг: Река · Запад: Тракт",
        "desc": "Пересечение реки и дороги. Дорога идет по мосту (E-W), река протекает под мостом (N-S)."
    },
    {
        "id": "tile_4s_lake_basin",
        "name": "Озеро с причалом",
        "edges": "wwww",
        "category": "lake water",
        "sides_desc": "Север: Вода · Восток: Вода · Юг: Вода · Запад: Вода",
        "desc": "Центральная чаша озера. Стыкуется со всеми речными и водными берегами."
    },
    {
        "id": "tile_4s_lake_grand_bridge",
        "name": "Большой мост через озеро",
        "edges": "wbwf",
        "category": "bridge lake water",
        "sides_desc": "Север: Вода · Восток: Мостовой пролет · Юг: Вода · Запад: Луг/Берег",
        "desc": "Многоарочный каменный акведук через озеро. Соединяет береговую часть с водным простором."
    },
    {
        "id": "tile_4s_road_straight",
        "name": "Тракт (прямая дорога)",
        "edges": "rfrf",
        "category": "road",
        "sides_desc": "Север: Дорога · Восток: Луг · Юг: Дорога · Запад: Луг",
        "desc": "Прямая булыжная дорога через луга. Стыкуется с дорогами на севере и юге."
    },
    {
        "id": "tile_4s_road_bend",
        "name": "Поворот дороги",
        "edges": "ffrr",
        "category": "road",
        "sides_desc": "Север: Луг · Восток: Луг · Юг: Дорога · Запад: Дорога",
        "desc": "Плавный изгиб дороги на 90 градусов. Стыкуется с дорогами на юге и западе."
    },
    {
        "id": "tile_4s_road_crossroad",
        "name": "Перекрёсток 4 дорог",
        "edges": "rrrr",
        "category": "road",
        "sides_desc": "Север: Дорога · Восток: Дорога · Юг: Дорога · Запад: Дорога",
        "desc": "Крестовина дорог. Стыкуется с любыми дорожными тайлами со всех 4 сторон."
    },
    {
        "id": "tile_4s_village",
        "name": "Деревня (поселение)",
        "edges": "cfff",
        "category": "village city",
        "sides_desc": "Север: Поселение/Стена · Восток: Луг · Юг: Луг · Запад: Луг",
        "desc": "Деревенский квартал с выходом в луга. Стыкуется северной гранью с деревнями и городами."
    },
    {
        "id": "tile_4s_fortress",
        "name": "Крепость (замок-цитадель)",
        "edges": "ffff",
        "category": "fortress city",
        "sides_desc": "Север: Луг · Восток: Луг · Юг: Луг · Запад: Луг (в центре Цитадель)",
        "desc": "Обособленный замок в полях. Стыкуется с любыми лугами, дает очки за окружающие 8 тайлов."
    },
    {
        "id": "tile_4s_monastery",
        "name": "Монастырь (капелла)",
        "edges": "ffff",
        "category": "monastery cap",
        "sides_desc": "Север: Сад · Восток: Луг · Юг: Луг · Запад: Луг (в центре Монастырь)",
        "desc": "Святая обитель на холме. Закрывается окружением из 8 подходящих тайлов вокруг."
    }
]

# 2. HEXAGONAL (6-SIDED) TILES
# Directions: 0: North, 1: North-East, 2: South-East, 3: South, 4: South-West, 5: North-West
# Opposite side for connection: (d + 3) % 6
HEX_6SIDE_TILES = [
    {
        "id": "tile_6s_river_straight",
        "name": "Гекс: Прямая река",
        "edges": "wffwff",
        "category": "river",
        "sides_desc": "Грани 0 и 3: Река · Грани 1, 2, 4, 5: Луг/Лес",
        "desc": "Речной поток, текущий сквозь противоположные грани 0 и 3. Стыкуется с реками на противоположных гексах."
    },
    {
        "id": "tile_6s_river_bend",
        "name": "Гекс: Излучина реки (60°)",
        "edges": "wwffff",
        "category": "river",
        "sides_desc": "Грани 0 и 1: Река · Грани 2, 3, 4, 5: Луг/Лес",
        "desc": "Поворот реки на 60 градусов между соседними гранями гекса."
    },
    {
        "id": "tile_6s_river_bridge",
        "name": "Гекс: Мост через реку",
        "edges": "wrfwrf",
        "category": "bridge river road",
        "sides_desc": "Грани 0 и 3: Река · Грани 1 и 4: Дорога · Грани 2 и 5: Луг",
        "desc": "Каменный мост через реку. Дорога идет с грани 1 на грань 4, река протекает под мостом (0 -> 3)."
    },
    {
        "id": "tile_6s_lake_basin",
        "name": "Гекс: Горное озеро",
        "edges": "wwwwww",
        "category": "lake water",
        "sides_desc": "Все 6 граней: Вода / Озеро",
        "desc": "Полноводный озерный водоем, стыкующийся со всеми 6 соседними водными гранями."
    },
    {
        "id": "tile_6s_lake_grand_bridge",
        "name": "Гекс: Большой мост через озеро",
        "edges": "wrwwww",
        "category": "bridge lake water",
        "sides_desc": "Грань 1: Въезд на мост (дорога) · Грани 0, 2, 3, 4, 5: Озеро",
        "desc": "Монументальный каменный мост через озеро, соединяющий дорожную сеть с водным простором."
    },
    {
        "id": "tile_6s_road_straight",
        "name": "Гекс: Дорожный тракт",
        "edges": "rffrff",
        "category": "road",
        "sides_desc": "Грани 0 и 3: Дорога · Грани 1, 2, 4, 5: Луг/Лес",
        "desc": "Прямая дорога через противоположные грани гекса (0 и 3)."
    },
    {
        "id": "tile_6s_road_junction",
        "name": "Гекс: Тройная развилка",
        "edges": "rfrfrf",
        "category": "road",
        "sides_desc": "Грани 0, 2, 4: Дорога · Грани 1, 3, 5: Луг",
        "desc": "Сход трех дорог через каждую вторую грань гекса к центральному указателю."
    },
    {
        "id": "tile_6s_village",
        "name": "Гекс: Средневековая деревня",
        "edges": "ccffff",
        "category": "village city",
        "sides_desc": "Грани 0 и 1: Дома/Улица · Грани 2, 3, 4, 5: Поля/Роща",
        "desc": "Деревенский сектор на двух гранях гекса, плавно переходящий в поля и луга."
    },
    {
        "id": "tile_6s_fortress",
        "name": "Гекс: Замок-цитадель",
        "edges": "cccccc",
        "category": "fortress city",
        "sides_desc": "Все 6 граней: Крепостные стены",
        "desc": "Шестигранная неприступная каменная цитадель, соединяющаяся со стенами соседних городов."
    },
    {
        "id": "tile_6s_monastery",
        "name": "Гекс: Горный монастырь",
        "edges": "ffffff",
        "category": "monastery cap",
        "sides_desc": "Все 6 граней: Кипарисы и монастырские луга",
        "desc": "Обособленная святая обитель в окружении лугов и кипарисовых рощ."
    }
]

with open("assets/tiles/classic_4side_defs.json", "w", encoding="utf-8") as f:
    json.dump(CLASSIC_4SIDE_TILES, f, ensure_ascii=False, indent=2)

with open("assets/tiles/hex_6side_defs.json", "w", encoding="utf-8") as f:
    json.dump(HEX_6SIDE_TILES, f, ensure_ascii=False, indent=2)

print("Saved classic_4side_defs.json and hex_6side_defs.json!")
