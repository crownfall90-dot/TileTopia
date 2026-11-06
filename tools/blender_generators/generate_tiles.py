import bpy
import bmesh
import math
import os
import time

def setup_cycles(samples=48):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    try:
        pref = bpy.context.preferences.addons['cycles'].preferences
        pref.compute_device_type = 'CUDA'
        for d in pref.devices:
            d.use = True
        scene.cycles.device = 'GPU'
    except Exception as e:
        print("Cycles GPU fallback to CPU:", e)
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512

def clean_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light, do_unlink=True)
    for cam in list(bpy.data.cameras):
        bpy.data.cameras.remove(cam, do_unlink=True)

def setup_isometric_camera():
    # True isometric view for 3D tiles (45 deg yaw, 35.264 deg pitch)
    cam_data = bpy.data.cameras.new(name="IsoCamera")
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 3.6
    cam_obj = bpy.data.objects.new("IsoCamera", cam_data)
    cam_obj.location = (4.0, -4.0, 4.0)
    cam_obj.rotation_euler = (math.radians(54.736), 0, math.radians(45))
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj
    return cam_obj

def setup_lighting():
    # Sun / Key light
    sun_data = bpy.data.lights.new(name="Sun", type='SUN')
    sun_data.energy = 4.2
    sun_data.color = (1.0, 0.97, 0.90)
    sun_obj = bpy.data.objects.new("Sun", sun_data)
    sun_obj.location = (5, -5, 8)
    sun_obj.rotation_euler = (math.radians(45), math.radians(20), math.radians(30))
    bpy.context.collection.objects.link(sun_obj)

    # Ambient sky fill
    fill_data = bpy.data.lights.new(name="SkyFill", type='AREA')
    fill_data.energy = 80
    fill_data.size = 6.0
    fill_data.color = (0.75, 0.88, 1.0)
    fill_obj = bpy.data.objects.new("SkyFill", fill_data)
    fill_obj.location = (-4, 3, 5)
    bpy.context.collection.objects.link(fill_obj)

def get_mat(name, base_color, roughness=0.35, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat

def create_base_tile():
    # Base tile block 2.0 x 2.0 x 0.35
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0, 0, -0.175))
    tile = bpy.context.active_object
    tile.scale = (1.0, 1.0, 0.175)
    bpy.ops.object.transform_apply(scale=True)
    
    bev = tile.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.05
    bev.segments = 3

    wood_base = get_mat("WoodBase", (0.35, 0.22, 0.12, 1.0), roughness=0.55)
    tile.data.materials.append(wood_base)

    # Top grass plate
    bpy.ops.mesh.primitive_cube_add(size=1.92, location=(0, 0, 0.04))
    top = bpy.context.active_object
    top.scale = (1.0, 1.0, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    
    top_bev = top.modifiers.new("Bevel", "BEVEL")
    top_bev.width = 0.03
    top_bev.segments = 2

    grass_mat = get_mat("Grass", (0.24, 0.62, 0.18, 1.0), roughness=0.6)
    top.data.materials.append(grass_mat)
    return tile

def add_stylized_tree(loc, scale=0.35):
    trunk_mat = get_mat("Trunk", (0.32, 0.18, 0.09, 1.0), roughness=0.7)
    leaves_mat = get_mat("Leaves", (0.16, 0.52, 0.14, 1.0), roughness=0.5)

    # Trunk
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.08 * scale, depth=0.4 * scale, location=(loc[0], loc[1], loc[2] + 0.2 * scale))
    trunk = bpy.context.active_object
    trunk.data.materials.append(trunk_mat)

    # Foliage (2 stacked icosahedrons / cones)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.35 * scale, location=(loc[0], loc[1], loc[2] + 0.45 * scale))
    leaves1 = bpy.context.active_object
    leaves1.data.materials.append(leaves_mat)

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.25 * scale, location=(loc[0], loc[1], loc[2] + 0.68 * scale))
    leaves2 = bpy.context.active_object
    leaves2.data.materials.append(leaves_mat)

# --- TILE 1: Straight Road ---
def render_tile_road_straight(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()
    create_base_tile()

    road_mat = get_mat("Road", (0.75, 0.70, 0.60, 1.0), roughness=0.75)
    # Road strip across Y
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.05))
    road = bpy.context.active_object
    road.scale = (0.45, 1.95, 0.015)
    bpy.ops.object.transform_apply(scale=True)
    road.data.materials.append(road_mat)

    # Trees on sides
    add_stylized_tree((-0.65, 0.4, 0.04), scale=0.6)
    add_stylized_tree((-0.60, -0.5, 0.04), scale=0.45)
    add_stylized_tree((0.65, -0.3, 0.04), scale=0.55)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

# --- TILE 2: Crossroads ---
def render_tile_road_crossroads(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()
    create_base_tile()

    road_mat = get_mat("Road", (0.75, 0.70, 0.60, 1.0), roughness=0.75)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.05))
    r1 = bpy.context.active_object
    r1.scale = (0.45, 1.95, 0.015)
    bpy.ops.object.transform_apply(scale=True)
    r1.data.materials.append(road_mat)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.05))
    r2 = bpy.context.active_object
    r2.scale = (1.95, 0.45, 0.015)
    bpy.ops.object.transform_apply(scale=True)
    r2.data.materials.append(road_mat)

    # Trees in corners
    add_stylized_tree((-0.65, -0.65, 0.04), scale=0.5)
    add_stylized_tree((0.65, -0.65, 0.04), scale=0.5)
    add_stylized_tree((-0.65, 0.65, 0.04), scale=0.5)
    add_stylized_tree((0.65, 0.65, 0.04), scale=0.5)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

# --- TILE 3: River Bridge ---
def render_tile_river_bridge(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()
    create_base_tile()

    water_mat = get_mat("Water", (0.12, 0.58, 0.88, 1.0), roughness=0.08)
    water_mat.node_tree.nodes["Principled BSDF"].inputs['Transmission Weight'].default_value = 0.75
    water_mat.node_tree.nodes["Principled BSDF"].inputs['IOR'].default_value = 1.33

    # River across Y
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.048))
    river = bpy.context.active_object
    river.scale = (0.55, 1.95, 0.01)
    bpy.ops.object.transform_apply(scale=True)
    river.data.materials.append(water_mat)

    # Stone Bridge crossing across X
    stone_mat = get_mat("Stone", (0.55, 0.52, 0.48, 1.0), roughness=0.6)
    road_mat = get_mat("Road", (0.75, 0.70, 0.60, 1.0), roughness=0.75)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.09))
    bridge = bpy.context.active_object
    bridge.scale = (1.95, 0.40, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    bridge.data.materials.append(road_mat)
    
    bev = bridge.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.03
    bev.segments = 2

    add_stylized_tree((-0.65, 0.65, 0.04), scale=0.55)
    add_stylized_tree((0.65, -0.65, 0.04), scale=0.55)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

# --- TILE 4: Castle Keep ---
def render_tile_castle_fort(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()
    create_base_tile()

    stone_mat = get_mat("Stone", (0.65, 0.62, 0.58, 1.0), roughness=0.55)
    roof_mat = get_mat("Roof", (0.85, 0.22, 0.15, 1.0), roughness=0.4)
    gold_mat = get_mat("Gold", (1.0, 0.82, 0.22, 1.0), metallic=0.95, roughness=0.15)

    # Castle Keep base
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.65, depth=0.7, location=(0, 0, 0.38))
    tower = bpy.context.active_object
    tower.data.materials.append(stone_mat)

    # Castle cone roof
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.78, depth=0.75, location=(0, 0, 1.05))
    roof = bpy.context.active_object
    roof.data.materials.append(roof_mat)

    # Golden Flag pennant
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.02, depth=0.4, location=(0, 0, 1.55))
    pole = bpy.context.active_object
    pole.data.materials.append(gold_mat)

    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.15, depth=0.25, location=(0.12, 0, 1.62), rotation=(0, math.radians(90), 0))
    flag = bpy.context.active_object
    flag.data.materials.append(gold_mat)

    # Trees around castle
    add_stylized_tree((-0.65, -0.60, 0.04), scale=0.45)
    add_stylized_tree((0.65, -0.60, 0.04), scale=0.45)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

# --- TILE 5: Jigsaw Master Base ---
def render_tile_jigsaw_base(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()

    # Create true puzzle piece with tabs and notches
    wood_mat = get_mat("PuzzleWood", (0.88, 0.65, 0.38, 1.0), roughness=0.35)
    gold_rim = get_mat("GoldEdge", (1.0, 0.82, 0.24, 1.0), metallic=0.9, roughness=0.2)

    bpy.ops.mesh.primitive_cube_add(size=1.8, location=(0, 0, 0))
    p = bpy.context.active_object
    p.scale = (1.0, 1.0, 0.22)
    bpy.ops.object.transform_apply(scale=True)
    p.data.materials.append(wood_mat)

    # Puzzle tabs (cylinders protruding)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.32, depth=0.22, location=(0.95, 0, 0))
    t1 = bpy.context.active_object
    t1.data.materials.append(wood_mat)

    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.32, depth=0.22, location=(0, 0.95, 0))
    t2 = bpy.context.active_object
    t2.data.materials.append(wood_mat)

    # Center embossed logo star/tile
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.45, depth=0.08, location=(0, 0, 0.14))
    emblem = bpy.context.active_object
    emblem.data.materials.append(gold_rim)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

# =====================================================================================================
# Parametric tile sets: one 3D model per card type (GLB) and 2D sprites rendered from the same scene.
#   blender -b -P tools/blender_generators/generate_tiles.py -- --set classic [--ids rS,capRS,wBr] [--views top,iso]
# The card list comes from assets/tiles3d/tiles.json (scripts/gen-tile-defs.mjs, built from TYPES).
#
# Look: the top of a tile IS the card face the game already draws (src/render/art.js, exported by
# scripts/export-faces.mjs to assets/tiles3d/faces), so a 3D tile reads exactly like the one on the table:
# winding rivers, lakes, curved roads. Where a river leaves the tile, a waterfall runs down its side. On it stand modelled versions
# of the sprites the game puts there (houses, keeps, trees, hay, rocks, the mine), placed by the same rules as
# generateDecorItems in src/game/world.js, lit warm like the game icon and the store banner.
# Units: a tile is 2 x 2, origin in the middle of its base, Z up (the GLB is Y-up, as glTF requires). Nothing
# sticks out past the tile edge, so neighbours join without gaps in any rotation.
# =====================================================================================================
import sys
import json
import random
import zlib
import argparse
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
TEX = os.path.join(ROOT, 'assets', 'tiles3d', 'textures')
FACES = os.path.join(ROOT, 'assets', 'tiles3d', 'faces')   # scripts/export-faces.mjs: drawTile of art.js, 576 px
H = 0.2                      # top of the tile slab
LIP = 0.035                  # grass lip on the slab sides
DIRS = [Vector((0, 1)), Vector((1, 0)), Vector((0, -1)), Vector((-1, 0))]   # N E S W
MID = [d.copy() for d in DIRS]
CORNER = [Vector((-1, 1)), Vector((1, 1)), Vector((1, -1)), Vector((-1, -1))]  # NW NE SE SW (as in art.js)
GV = [(0, -1), (1, 0), (0, 1), (-1, 0)]   # the game's direction vectors (screen space, y down)

# Parts of the props all live in one shared atlas (tools/blender_generators/tint_textures.py). A tile model has two
# materials: "TileFace" (its top, UV 0..1 — the game binds the card face it already draws) and "TileAtlas" (the
# props). The GLB carries no image, only UVs and the part colour as vertex colour, so a phone keeps one atlas in
# memory, whatever the board holds.
ATLAS = json.load(open(os.path.join(TEX, 'atlas.json'), encoding='utf-8'))
PARTS = ['face'] + list(ATLAS['rects'])
MAT_IDX = {k: i for i, k in enumerate(PARTS)}
HOUSES = {   # the four house sprites of art.js: roof, timber frame, chimney
    'house': ('roof_red', False, True), 'house2': ('roof_brick', True, False),
    'house3': ('roof_slate', False, True), 'house4': ('roof_gold', True, False),
}


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def rot_cw(p, n):
    """Quarter turns clockwise seen from above (N -> E), like the rotation in art.js."""
    x, y = p.x, p.y
    for _ in range(n % 4):
        x, y = y, -x
    return Vector((x, y))


def quad_pts(a, k, b, n=20):
    return [(1 - t) ** 2 * a + 2 * (1 - t) * t * k + t * t * b for t in (i / n for i in range(n + 1))]


def dist_poly(p, pts):
    best = 9.0
    for a, b in zip(pts, pts[1:]):
        ab = b - a
        L = ab.length_squared or 1e-9
        t = max(0.0, min(1.0, (p - a).dot(ab) / L))
        best = min(best, (a + ab * t - p).length)
    return best


def inside(p, poly):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        a, b = poly[i], poly[j]
        if (a.y > p.y) != (b.y > p.y) and p.x < (b.x - a.x) * (p.y - a.y) / ((b.y - a.y) or 1e-9) + a.x:
            c = not c
        j = i
    return c


def road_path(r):
    a, b = r['from'], r['to']
    if b is None:
        return [MID[a] * (1 - t) for t in (i / 12 for i in range(13))]
    return quad_pts(MID[a], Vector((0, 0)), MID[b], 24)


def city_shape(e):
    """The town polygon and its wall curves, ported from cityPaths in src/render/art.js."""
    city = [d for d in range(4) if e[d] == 'c']
    if not city:
        return None, []
    C = Vector((0, 0))
    if len(city) == 4:
        return [c.copy() for c in CORNER], []
    if len(city) == 1:
        i = city[0]
        A, B, K = rot_cw(CORNER[0], i), rot_cw(CORNER[1], i), rot_cw(Vector((0, 1 - 1.28)), i)
        wall = quad_pts(B, K, A)
        return [A] + wall, [wall]
    s = next(d for d in city if e[(d + 3) % 4] != 'c')
    poly, walls = [CORNER[s].copy()], []
    i, n = s, 0
    while n < 4:
        if e[i] == 'c':
            poly.append(CORNER[(i + 1) % 4].copy())
            i, n = (i + 1) % 4, n + 1
            continue
        L = 0
        while e[(i + L) % 4] != 'c':
            L += 1
        fr, to = CORNER[i], CORNER[(i + L) % 4]
        p = MID[i] if L == 1 else CORNER[(i + 1) % 4]
        f = .88 if L == 1 else .86
        K = p + (C - p) * f
        w = quad_pts(fr, K, to)
        poly += w[1:]
        walls.append(w)
        i, n = (i + L) % 4, n + L
    return poly, walls


def decor_items(t, rnd):
    """generateDecorItems (src/game/world.js) in Python: which sprites stand on this card and where.

    Positions are the game's: tile units from the centre, screen y down; the sprite stands on that point."""
    E = t['edges']
    items = []
    city = [d for d in range(4) if E[d] == 'c']
    R = rnd.random
    if len(city) == 1:
        x, y = GV[city[0]]
        px, py = -y, x
        items += [[rnd.choice(list(HOUSES)), x * .36 + px * .17, y * .36 + py * .17],
                  [rnd.choice(list(HOUSES)), x * .38 - px * .13, y * .38 - py * .13]]
    elif len(city) > 1:
        sx = sum(GV[d][0] for d in city)
        sy = sum(GV[d][1] for d in city)
        cx, cy = sx * .2, sy * .2
        pts = [[-.16, -.06], [.14, -.14], [.02, .1], [-.2, .16]]
        n = 4 if len(city) >= 3 else 3
        for i in range(n):
            items.append(['tower' if i == 0 and len(city) >= 3 else rnd.choice(list(HOUSES)), cx + pts[i][0], cy + pts[i][1]])
    # the monastery card: its buildings come from p_monastery, the decor only dresses the corners
    end = t.get('roadEnd')
    if end and end != 'cliff':
        d = E.index('r')
        items.append([end, -GV[d][0] * .1, -GV[d][1] * .1 + .06])
    if 'boulders' in t['features'] and not end:
        items += [['boulders', -.05, .05], ['rock', .22, -.12], ['rock', -.24, .26]]
    for a, b, sx, sy in ((0, 3, -1, -1), (0, 1, 1, -1), (1, 2, 1, 1), (2, 3, -1, 1)):
        if E[a] in 'cb' or E[b] in 'cb':
            continue
        if end == 'cliff':
            dr = E.index('r')
            if sx * -GV[dr][0] + sy * -GV[dr][1] > 0:
                continue
        if R() < .62:
            k = R()
            kind = ('pine' if k < .36 else 'oak' if k < .62 else 'birch' if k < .71 else 'poplar' if k < .78
                    else 'bush' if k < .88 else 'rock' if k < .95 else 'hay')
            items.append([kind, sx * (.30 + R() * .05) + (R() - .5) * .05, sy * (.30 + R() * .05)])
    return items, len(city)


class TileMesh:
    """All of one tile in a single bmesh: one object, two draw calls (face + props) in the game."""

    def __init__(self):
        self.bm = bmesh.new()

    def face(self, cos, mat):
        f = self.bm.faces.new([self.bm.verts.new(c) for c in cos])
        f.material_index = MAT_IDX[mat]
        return f

    def box(self, c, w, d, h, yaw, mat, top=True, taper=1.0):
        R = Matrix.Rotation(yaw, 3, 'Z')
        base = [Vector(c) + R @ Vector((sx * w / 2, sy * d / 2, 0)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        tops = [Vector(c) + R @ Vector((sx * w / 2 * taper, sy * d / 2 * taper, h)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        for k in range(4):
            self.face([base[k], base[(k + 1) % 4], tops[(k + 1) % 4], tops[k]], mat)
        if top:
            self.face(tops, mat)
        return base

    def plate(self, c, w, h, yaw, mat, out=.004):
        """A flat rectangle on a wall facing -Y of a box turned by yaw (windows, doors, beams)."""
        R = Matrix.Rotation(yaw, 3, 'Z')
        o = Vector(c)
        n = R @ Vector((0, -out, 0))
        a = R @ Vector((w / 2, 0, 0))
        self.face([o - a + n, o + a + n, o + a + n + Vector((0, 0, h)), o - a + n + Vector((0, 0, h))], mat)

    def prim(self, res, mat):
        for f in {f for v in res['verts'] for f in v.link_faces}:
            f.material_index = MAT_IDX[mat]

    def cylinder(self, c, r, h, seg, mat, r2=None, caps=True):
        M = Matrix.Translation(Vector(c) + Vector((0, 0, h / 2)))
        self.prim(bmesh.ops.create_cone(self.bm, cap_ends=caps, cap_tris=False, segments=seg,
                                        radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=M), mat)

    def cone(self, c, r, h, seg, mat):
        self.cylinder(c, r, h, seg, mat, r2=0.0)

    def blob(self, c, r, mat, sx=1.0, sz=1.0, sub=1, jitter=0.0, rnd=None):
        M = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((sx, sx, sz, 1.0))
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=r, matrix=M)
        if jitter and rnd:
            for v in res['verts']:
                v.co += (v.co - Vector(c)).normalized() * (rnd.random() - .5) * jitter * r
        self.prim(res, mat)

    def finish(self, name, clip=True):
        bm = self.bm
        if clip:   # nothing may stick out past the tile: whatever does is cut exactly at the edge
            for co, no in (((1, 0, 0), (1, 0, 0)), ((-1, 0, 0), (-1, 0, 0)), ((0, 1, 0), (0, 1, 0)), ((0, -1, 0), (0, -1, 0))):
                bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no,
                                       clear_outer=True, dist=1e-6)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bm.normal_update()
        uv = bm.loops.layers.uv.new('UVMap')
        col = bm.loops.layers.color.new('Col')
        rects, colours = ATLAS['rects'], ATLAS['colours']
        for f in bm.faces:
            part = PARTS[f.material_index]
            if part == 'face':
                for l in f.loops:
                    l[uv].uv = ((l.vert.co.x + 1) / 2, (l.vert.co.y + 1) / 2)
                    l[col] = (1, 1, 1, 1)
                f.material_index = 0
                continue
            u0, v0, u1, v1 = rects[part]
            n = f.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            proj = [((l.vert.co.y, l.vert.co.z) if ax == 0 else (l.vert.co.x, l.vert.co.z) if ax == 1 else (l.vert.co.x, l.vert.co.y)) for l in f.loops]
            k = 2.0
            ou, ov = math.floor(min(a for a, _ in proj) * k), math.floor(min(b for _, b in proj) * k)
            c = (*colours[part], 1.0)
            for l, (a, b) in zip(f.loops, proj):
                l[uv].uv = (u0 + (u1 - u0) * min(1.0, a * k - ou), v0 + (v1 - v0) * min(1.0, b * k - ov))
                l[col] = c
            f.material_index = 1
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        ca = me.color_attributes.get('Col')
        if ca:
            me.color_attributes.active_color = ca
            me.color_attributes.render_color_index = me.color_attributes.find('Col')
        obj = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(obj)
        return obj


# ---------------- props: the game sprites, modelled (sizes from the sprite pixels: a tile is 88 px = 2 units) ----

def p_house(tm, c, yaw, kind, s=1.0):
    roof, frame, chimney = HOUSES[kind]
    w, d, h, ridge = .30 * s, .23 * s, .2 * s, .16 * s
    x, y, z = c
    tm.box((x, y, z), w, d, h, yaw, 'plaster', top=False)
    R = Matrix.Rotation(yaw, 3, 'Z')
    P = lambda a, b, cz: Vector((x, y, z)) + R @ Vector((a, b, cz))
    ow, od = w / 2 + .02 * s, d / 2 + .025 * s
    a1, b1, c1, d1 = P(-ow, -od, h), P(ow, -od, h), P(ow, od, h), P(-ow, od, h)
    r1, r2 = P(-ow, 0, h + ridge), P(ow, 0, h + ridge)
    tm.face([a1, b1, r2, r1], roof)
    tm.face([c1, d1, r1, r2], roof)
    tm.face([b1, a1, P(-ow, -od, h - .012 * s), P(ow, -od, h - .012 * s)], 'beam')   # eaves
    tm.face([P(-w / 2, d / 2, h), P(-w / 2, -d / 2, h), P(-w / 2, 0, h + ridge * .9)], 'plaster')
    tm.face([P(w / 2, -d / 2, h), P(w / 2, d / 2, h), P(w / 2, 0, h + ridge * .9)], 'plaster')
    front = lambda a, cz: P(a, -d / 2, cz)
    tm.plate(front(0, 0), .06 * s, .1 * s, yaw, 'door')
    for a in (-.095, .095):
        tm.plate(front(a * s, .095 * s), .05 * s, .055 * s, yaw, 'window')
    side = R @ Vector((1, 0, 0))
    o = P(w / 2, 0, .095 * s) + side * .004
    ax = R @ Vector((0, .028 * s, 0))
    tm.face([o - ax, o + ax, o + ax + Vector((0, 0, .055 * s)), o - ax + Vector((0, 0, .055 * s))], 'window')
    if frame:   # timber frame: posts, a rail and a cross on the front
        for a in (-.13, -.045, .045, .13):
            tm.plate(front(a * s, 0), .016 * s, h, yaw, 'beam', out=.006)
        tm.plate(front(0, .085 * s), w * .96, .014 * s, yaw, 'beam', out=.006)
    if chimney:
        q = P(.07 * s, .05 * s, h + ridge * .45)
        tm.box((q.x, q.y, q.z), .045 * s, .045 * s, .14 * s, yaw, 'chimney')


def banner(tm, top, s=1.0, pole=.16):
    """A banner like the one on the game's tower sprite: a pole with a gold finial and a swallow-tailed cloth
    waving in the wind (both sides), a gold band at the hoist."""
    x, y, z = top
    tm.cylinder((x, y, z), .006 * s, pole * s, 5, 'rail')
    tm.blob((x, y, z + pole * s + .008 * s), .013 * s, 'gold', sub=1)
    L, Hh = .19 * s, .095 * s
    cols = 6
    z1 = z + pole * s - .006 * s
    def pt(i, j):
        u = i / cols
        wave = math.sin(u * 5.2 + .6) * .016 * s * u
        x0 = x + .004 + u * L
        zz = z1 - j * Hh - (.006 * s * u if j else 0)
        if i == cols and j == .5:
            x0 -= L * .22   # the notch of the swallow tail
        return Vector((x0, y + wave, zz))
    for i in range(cols):
        for j0, j1 in ((0, .5), (.5, 1)):
            a, b, c, d = pt(i, j0), pt(i + 1, j0), pt(i + 1, j1), pt(i, j1)
            mat = 'gold' if i == 0 else 'flag'
            tm.face([a, b, c, d], mat)
            tm.face([d, c, b, a], mat)


def p_tower(tm, c, s=1.0):
    """A round keep with a red cone roof and a flag — the castles of the icon and the banner — on a stone body."""
    x, y, z = c
    r, h = .15 * s, .62 * s
    tm.cylinder((x, y, z), r * 1.08, .05 * s, 10, 'stone')
    tm.cylinder((x, y, z), r, h, 10, 'stone', caps=False)
    tm.cylinder((x, y, z + h), r * 1.18, .07 * s, 10, 'stone')
    for k in range(10):   # battlements
        if k % 2:
            continue
        a = 2 * math.pi * k / 10
        tm.box((x + math.cos(a) * r * 1.08, y + math.sin(a) * r * 1.08, z + h + .07 * s), .06 * s, .05 * s, .05 * s, a, 'stone')
    tm.cone((x, y, z + h + .07 * s), r * 1.05, .34 * s, 10, 'roof_red')
    banner(tm, (x, y, z + h + .38 * s), s)
    front = Vector((0, -1, 0))
    for zz in (.28, .46):   # arrow slits and a gate, facing the camera side
        q = Vector((x, y - r - .003, z + zz * s))
        tm.face([q + Vector((-.012 * s, 0, 0)), q + Vector((.012 * s, 0, 0)), q + Vector((.012 * s, 0, .07 * s)), q + Vector((-.012 * s, 0, .07 * s))], 'slit')
    q = Vector((x, y - r - .003, z))
    tm.face([q + Vector((-.045 * s, 0, 0)), q + Vector((.045 * s, 0, 0)), q + Vector((.045 * s, 0, .1 * s)), q + Vector((0, 0, .13 * s)), q + Vector((-.045 * s, 0, .1 * s))], 'door')


def p_pine(tm, c, rnd, s=1.0):
    x, y, z = c
    tm.cylinder((x, y, z), .03 * s, .14 * s, 5, 'trunk')
    for i, (r, zz, hh) in enumerate(((.2, .1, .34), (.16, .3, .3), (.11, .48, .28))):
        tm.cone((x, y, z + zz * s), r * s, hh * s, 8, 'pine' if i % 2 else 'pine_dark')


def p_oak(tm, c, rnd, s=1.0):
    """The apple tree of the game: a crooked trunk, a cluster of leafy blobs, red apples."""
    x, y, z = c
    tm.cylinder((x, y, z), .035 * s, .3 * s, 6, 'trunk', r2=.025 * s)
    for dx, dy, dz, r, m in ((0, 0, .42, .2, 'oak'), (-.12, .03, .36, .14, 'oak'), (.12, -.02, .37, .14, 'oak'), (-.05, -.04, .54, .14, 'oak_light')):
        tm.blob((x + dx * s, y + dy * s, z + dz * s), r * s, m, sub=1, jitter=.25, rnd=rnd)
    for dx, dy, dz in ((.14, -.1, .36), (-.08, -.15, .45), (.04, -.17, .52), (-.17, -.05, .33)):
        tm.blob((x + dx * s, y + dy * s, z + dz * s), .022 * s, 'apple', sub=1)


def p_birch(tm, c, rnd, s=1.0):
    x, y, z = c
    tm.cylinder((x, y, z), .022 * s, .48 * s, 6, 'birch_bark')
    for zz in (.1, .2, .3):
        q = Vector((x, y - .0225 * s, z + zz * s))
        tm.face([q + Vector((-.012 * s, 0, 0)), q + Vector((.01 * s, 0, 0)), q + Vector((.01 * s, 0, .012 * s)), q + Vector((-.012 * s, 0, .012 * s))], 'dark')
    for dx, dz, r in ((0, .52, .14), (-.08, .44, .1), (.08, .46, .1), (0, .64, .1)):
        tm.blob((x + dx * s, y, z + dz * s), r * s, 'birch_leaf', sz=1.15, jitter=.2, rnd=rnd)


def p_poplar(tm, c, rnd, s=1.0):
    x, y, z = c
    tm.cylinder((x, y, z), .02 * s, .12 * s, 5, 'trunk')
    tm.blob((x, y, z + .45 * s), .13 * s, 'oak', sx=1.0, sz=2.9, jitter=.12, rnd=rnd)


def p_bush(tm, c, rnd, s=1.0):
    x, y, z = c
    for dx, dy, r in ((-.07, 0, .07), (.07, .01, .065), (0, .02, .085)):
        tm.blob((x + dx * s, y + dy * s, z + r * .6 * s), r * s, 'oak', sz=.8, jitter=.3, rnd=rnd)
    for dx, dz in ((-.05, .09), (.04, .11), (.09, .06)):
        tm.blob((x + dx * s, y - .07 * s, z + dz * s), .014 * s, 'apple')


def p_rock(tm, c, rnd, s=1.0, big=1.0):
    x, y, z = c
    tm.blob((x, y, z + .03 * s * big), .1 * s * big, 'rock', sz=.6, jitter=.45, rnd=rnd)
    tm.blob((x - .06 * s * big, y - .04 * s * big, z + .01), .045 * s * big, 'moss', sz=.3)


def p_hay(tm, c, rnd, s=1.0):
    x, y, z = c
    tm.cylinder((x, y, z), .12 * s, .12 * s, 10, 'hay', caps=False)
    tm.blob((x, y, z + .12 * s), .12 * s, 'hay', sz=.85, sub=2)
    tm.cylinder((x, y, z + .05 * s), .123 * s, .015 * s, 10, 'beam', caps=False)


def p_boulders(tm, c, rnd, s=1.0):
    x, y, z = c
    for dx, dy, b in ((-.16, .02, 1.5), (.14, .04, 1.7), (0, -.06, 1.2)):
        p_rock(tm, (x + dx * s, y + dy * s, z), rnd, s, big=b)


def p_mine(tm, c, rnd, s=1.0):
    """The mine sprite: a rocky hill with a dark timbered entrance, rails and a lantern."""
    x, y, z = c
    tm.blob((x, y + .08 * s, z), .38 * s, 'rock', sx=1.0, sz=.75, jitter=.3, rnd=rnd)
    tm.blob((x - .2 * s, y + .05 * s, z + .2 * s), .06 * s, 'moss', sz=.4)
    fy = y - .25 * s
    q = Vector((x, fy - .002, z))
    tm.face([q + Vector((-.09 * s, 0, 0)), q + Vector((.09 * s, 0, 0)), q + Vector((.09 * s, 0, .17 * s)), q + Vector((-.09 * s, 0, .17 * s))], 'dark')
    for dx in (-.1, .1):
        tm.box((x + dx * s, fy, z), .035 * s, .035 * s, .2 * s, 0, 'wood')
    tm.box((x, fy, z + .2 * s), .26 * s, .045 * s, .04 * s, 0, 'wood')
    for dx in (-.04, .04):
        tm.box((x + dx * s, fy - .12 * s, z), .01 * s, .24 * s, .01 * s, 0, 'rail')
    tm.blob((x + .17 * s, fy - .01, z + .15 * s), .022 * s, 'lantern')


def wall(tm, pts):
    """The town wall the face paints, raised: a low stone parapet with battlements along the curve."""
    for k, (a, b) in enumerate(zip(pts, pts[1:])):
        dv = b - a
        yaw = math.atan2(dv.y, dv.x)
        m = (a + b) / 2
        tm.box((m.x, m.y, H), dv.length + .01, .045, .065, yaw, 'stone')
        if k % 2 == 0:
            tm.box((m.x, m.y, H + .065), dv.length * .5, .05, .03, yaw, 'stone')



def art(px, py):
    """A point of the card art (192 px, y down, as in src/render/art.js) on the 3D tile."""
    return Vector((px / 96 - 1, 1 - py / 96))


def gabled(tm, c, w, d, h, ridge, yaw, roof, wallm='stone'):
    """A plain building with a gabled roof, ridge along w (churches, cloister walks)."""
    x, y, z = c
    tm.box((x, y, z), w, d, h, yaw, wallm, top=False)
    R = Matrix.Rotation(yaw, 3, 'Z')
    P = lambda a, b, cz: Vector((x, y, z)) + R @ Vector((a, b, cz))
    ow, od = w / 2 + .012, d / 2 + .016
    a1, b1, c1, d1 = P(-ow, -od, h), P(ow, -od, h), P(ow, od, h), P(-ow, od, h)
    r1, r2 = P(-ow, 0, h + ridge), P(ow, 0, h + ridge)
    tm.face([a1, b1, r2, r1], roof)
    tm.face([c1, d1, r1, r2], roof)
    tm.face([P(-w / 2, d / 2, h), P(-w / 2, -d / 2, h), P(-w / 2, 0, h + ridge * .92)], wallm)
    tm.face([P(w / 2, -d / 2, h), P(w / 2, d / 2, h), P(w / 2, 0, h + ridge * .92)], wallm)


def p_monastery(tm):
    """The monastery card (scored 9 when all 8 neighbours are laid), on the spots art.js paints it."""
    z = H
    # enclosure: a low stone wall with a gate to the south
    hw, th, wh = .45, .03, .055
    tm.box((0, hw, z), 2 * hw, th, wh, 0, 'stone')
    tm.box((hw, 0, z), th, 2 * hw, wh, 0, 'stone')
    tm.box((-hw, 0, z), th, 2 * hw, wh, 0, 'stone')
    for sx in (-1, 1):
        tm.box((sx * (hw + .07) / 2, -hw, z), hw - .07, th, wh, 0, 'stone')
    for sx in (-1, 1):
        tm.box((sx * .07, -hw, z), .03, .035, .09, 0, 'wood')
    # church: nave (north-south), transept (east-west), apse to the north
    nave = (art(96, 86) + art(96, 86)) / 2
    gabled(tm, (0, (1 - 63 / 96 + 1 - 109 / 96) / 2, z), .479, .2, .15, .1, math.pi / 2, 'roof_red')
    gabled(tm, (0, (1 - 74 / 96 + 1 - 89 / 96) / 2, z), .54, .15, .15, .085, 0, 'roof_red')
    ax = art(96, 63)
    tm.cylinder((ax.x, ax.y, z), .1, .15, 10, 'stone', caps=False)
    tm.cone((ax.x, ax.y, z + .15), .112, .085, 10, 'roof_red')
    for k in range(3):   # windows of the nave
        q = Vector((.102, .25 - k * .12, z + .06))
        tm.face([q, q + Vector((0, -.035, 0)), q + Vector((0, -.035, .055)), q + Vector((0, 0, .055))], 'window')
    # bell tower at the south front: stone, a slate pyramid, a gold cross
    b = art(96, 111)
    tm.box((b.x, b.y, z), .145, .145, .38, 0, 'stone')
    for k in range(4):
        a = math.pi / 2 * k
        q = Vector((b.x + math.cos(a) * .0735, b.y + math.sin(a) * .0735, z + .27))
        nrm = Vector((math.cos(a), math.sin(a), 0)) * .002
        side = Vector((-math.sin(a), math.cos(a), 0)) * .022
        tm.face([q + nrm - side, q + nrm + side, q + nrm + side + Vector((0, 0, .06)), q + nrm - side + Vector((0, 0, .06))], 'slit')
    M = Matrix.Translation(Vector((b.x, b.y, z + .38 + .09))) @ Matrix.Rotation(math.pi / 4, 4, 'Z')
    tm.prim(bmesh.ops.create_cone(tm.bm, cap_ends=True, cap_tris=False, segments=4, radius1=.11, radius2=0, depth=.18, matrix=M), 'roof_slate')
    top = z + .38 + .18
    tm.box((b.x, b.y, top), .008, .008, .09, 0, 'gold')
    tm.box((b.x, b.y, top + .055), .05, .008, .008, 0, 'gold')
    # cloister: a slate-roofed walk round a garden with a fountain
    c0, c1 = art(106, 108), art(132, 134)
    cc, half = (c0 + c1) / 2, (c1.x - c0.x) / 2
    for k in range(4):
        a = math.pi / 2 * k
        o = Vector((math.cos(a), math.sin(a))) * (half - .03)
        gabled(tm, (cc.x + o.x, cc.y + o.y, z), half * 2, .06, .06, .035, a + math.pi / 2, 'roof_slate', 'plaster')
    tm.cylinder((cc.x, cc.y, z), .035, .03, 8, 'stone')
    tm.cylinder((cc.x, cc.y, z + .031), .025, .001, 8, 'fall')
    for px in (126, 66):
        p_oak(tm, (*art(px, 66), z), random.Random(px), .55)


def p_stall(tm, c, yaw, i):
    """A market stall: four posts, a counter, a striped awning sloping to the street."""
    x, y, z = c
    R = Matrix.Rotation(yaw, 3, 'Z')
    P = lambda a, b, cz: Vector((x, y, z)) + R @ Vector((a, b, cz))
    w, d = .095, .066
    for sa, sb in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        q = P(sa * w / 2, sb * d / 2, 0)
        tm.box((q.x, q.y, z), .008, .008, .085 if sb < 0 else .1, yaw, 'beam')
    tm.box((x, y, z), w * .9, d * .5, .04, yaw, 'wood')
    stripes = (('flag', 'birch_bark'), ('awn_blue', 'birch_bark'), ('hay', 'birch_bark'), ('oak', 'birch_bark'))[i % 4]
    n = 6
    for k in range(n):
        a0, a1 = -w / 2 - .01 + (w + .02) * k / n, -w / 2 - .01 + (w + .02) * (k + 1) / n
        tm.face([P(a0, -d / 2 - .02, .085), P(a1, -d / 2 - .02, .085), P(a1, d / 2 + .005, .105), P(a0, d / 2 + .005, .105)], stripes[k % 2])
    for k in range(3):   # goods on the counter
        q = P(-.03 + k * .03, -.005, .04)
        tm.blob((q.x, q.y, q.z + .008), .011, ('apple', 'hay', 'oak')[(i + k) % 3])


def p_keep(tm, c, k=1.0):
    """The keep of a town (art.js draws it on the square, smaller in a small town): a stone block with
    battlements, four round corner towers and a banner."""
    x, y, z = c
    s = .22 * k
    hb = .2 * k
    tm.box((x, y, z), s, s, hb, 0, 'stone')
    for i in range(-2, 3):
        for (ax, ay) in ((i * s / 5, s / 2), (i * s / 5, -s / 2), (s / 2, i * s / 5), (-s / 2, i * s / 5)):
            tm.box((x + ax, y + ay, z + hb), .022 * k, .022 * k, .03 * k, 0, 'stone')
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        q = (x + sx * s / 2, y + sy * s / 2)
        tm.cylinder((q[0], q[1], z), .048 * k, .29 * k, 8, 'stone')
        tm.cone((q[0], q[1], z + .29 * k), .058 * k, .12 * k, 8, 'roof_red')
    banner(tm, (x, y, z + hb), .85 * k, pole=.24)
    q = Vector((x, y - s / 2 - .002, z))
    tm.face([q + Vector((-.03 * k, 0, 0)), q + Vector((.03 * k, 0, 0)), q + Vector((.03 * k, 0, .07 * k)), q + Vector((0, 0, .09 * k)), q + Vector((-.03 * k, 0, .07 * k))], 'door')


def p_gazebo(tm, c):
    x, y, z = c
    r = .06
    for k in range(6):
        a = 2 * math.pi * k / 6
        tm.box((x + math.cos(a) * r, y + math.sin(a) * r, z), .01, .01, .08, a, 'beam')
    tm.cylinder((x, y, z), r * 1.05, .012, 6, 'wood')
    tm.cone((x, y, z + .08), r * 1.45, .08, 8, 'wood')
    tm.blob((x, y, z + .165), .012, 'gold')


def town_layout(t):
    """Where art.js puts the square, the market and the keep (keep in step with the Town block there)."""
    city = [d for d in range(4) if t['edges'][d] == 'c']
    if not city:
        return None
    big = len(city) >= 3
    tc = Vector((0, 0)) if len(city) == 4 else sum((MID[d] for d in city), Vector((0, 0))) / len(city) * (.72 if len(city) == 1 else .5)
    sq = (30 if big else 24 if len(city) > 1 else 11) / 96
    stall_r = (25 if big else 21) / 96
    keep = 1.0 if big else .78 if len(city) > 1 else .62
    stalls = [(tc + Vector((math.cos(math.radians(a)), -math.sin(math.radians(a)))) * stall_r, math.radians(-a) + math.pi / 2)
              for a in (45, 135, 225, 315)] if len(city) > 1 else []
    lanes = []
    for d in city:
        side = 1 if d % 2 else -1
        k2 = (MID[d] + tc) / 2 + Vector((GV[d][1], GV[d][0])) * 6 * side / 96
        lanes.append(quad_pts(MID[d], k2, tc, 14))
    return {'city': city, 'big': big, 'tc': tc, 'sq': sq, 'stalls': stalls, 'lanes': lanes, 'keep': keep}


def well(tm, c):
    """The well on the town square (art.js draws it at the meeting point of the lanes)."""
    x, y = c.x, c.y
    tm.cylinder((x, y, H), .07, .06, 10, 'stone')
    tm.cylinder((x, y, H + .061), .05, .001, 10, 'fall')
    for dx in (-.06, .06):
        tm.box((x + dx, y, H + .06), .014, .014, .12, 0, 'wood')
    tm.box((x, y, H + .18), .16, .1, .012, 0, 'roof_red', taper=.15)


def bridge(tm, r):
    """A stone arch over the river where the road crosses it (wBr), as on the banner, with a plank deck."""
    d = (MID[r['to']] - MID[r['from']]).normalized()
    yaw = math.atan2(d.y, d.x)
    L, W = .44, .18
    s = Vector((-d.y, d.x))
    n = 8
    for side in (-1, 1):   # arched parapets
        o = s * side * (W / 2)
        prev = None
        for k in range(n + 1):
            t = k / n
            p = d * (t - .5) * L + o
            zz = H + .02 + .07 * math.sin(math.pi * t)
            cur = (Vector((p.x, p.y, zz)), Vector((p.x, p.y, zz + .05)))
            if prev:
                tm.face([prev[0], cur[0], cur[1], prev[1]], 'stone')
            prev = cur
    prev = None
    for k in range(n + 1):   # deck
        t = k / n
        p = d * (t - .5) * L
        zz = H + .02 + .07 * math.sin(math.pi * t)
        cur = (Vector((p.x, p.y, zz)) + Vector((*(s * W / 2), 0)), Vector((p.x, p.y, zz)) - Vector((*(s * W / 2), 0)))
        if prev:
            tm.face([prev[0], prev[1], cur[1], cur[0]], 'wood')
        prev = cur
    for side in (-1, 1):
        for along in (-1, 1):
            q = d * along * L / 2 + s * side * W / 2
            tm.box((q.x, q.y, H - .01), .05, .05, .1, yaw, 'stone')


PROPS = {'pine': p_pine, 'oak': p_oak, 'birch': p_birch, 'poplar': p_poplar, 'bush': p_bush, 'rock': p_rock,
         'hay': p_hay, 'boulders': p_boulders, 'mine': p_mine}


def place(tm, kind, c, rnd, s=1.0):
    if kind in HOUSES:
        p_house(tm, c, (rnd.random() - .5) * .5, kind, s)
    elif kind == 'tower':
        p_tower(tm, c, s)
    else:
        PROPS[kind](tm, c, rnd, s)


def slab(tm, y0=-1.0):
    """The card body: the face on top, a grass lip and earth on the sides, a darker base. y0 > -1 ends it there
    (the cliff card: art.js leaves its southern half a real hole)."""
    tm.face([(-1, y0, H), (1, y0, H), (1, 1, H), (-1, 1, H)], 'face')
    C = [(-1, y0), (1, y0), (1, 1), (-1, 1)]
    for k in range(4):
        (ax, ay), (bx, by) = C[k], C[(k + 1) % 4]
        tm.face([(bx, by, H - LIP), (ax, ay, H - LIP), (ax, ay, H), (bx, by, H)], 'lip')
        tm.face([(bx, by, 0), (ax, ay, 0), (ax, ay, H - LIP), (bx, by, H - LIP)], 'soil')
    tm.face([(-1, 1, 0), (1, 1, 0), (1, y0, 0), (-1, y0, 0)], 'soil_dark')


def cliff(tm, y0, rnd):
    """The chasm of the cliff card: a ragged rock face falling from the edge of the meadow into the dark."""
    n = 12
    for k in range(n):
        x0, x1 = -1 + 2 * k / n, -1 + 2 * (k + 1) / n
        depth = -.04 - rnd.random() * .12
        out = .01 + rnd.random() * .025
        band = H - LIP - .07
        tm.face([(x0, y0 - .004, band), (x1, y0 - .004, band), (x1, y0 - .002, H - LIP), (x0, y0 - .002, H - LIP)], 'rock')
        tm.face([(x0, y0 - out, depth), (x1, y0 - out, depth), (x1, y0 - .004, band), (x0, y0 - .004, band)], 'soil_dark')
        tm.face([(x0, y0 - .002, H - LIP), (x1, y0 - .002, H - LIP), (x1, y0 - .002, H), (x0, y0 - .002, H)], 'lip')
    for k in range(7):   # boulders on the brink and a few down the face
        x = -.9 + 1.8 * k / 6 + (rnd.random() - .5) * .1
        tm.blob((x, y0 + .04, H), .045 + rnd.random() * .03, 'rock', sz=.6, jitter=.4, rnd=rnd)
    for k in range(4):
        x = -.8 + rnd.random() * 1.6
        tm.blob((x, y0 - .02, .02 + rnd.random() * .06), .04, 'rock', sz=.7, jitter=.4, rnd=rnd)


def waterfall(d):
    """The game's waterfall (.sd.fall in styles.css) on side d: water down the slab, light streaks, foam at the foot.
    Its own object, so the game shows it only where the river has no neighbour."""
    tm = TileMesh()
    n, a = DIRS[d], Vector((DIRS[d].y, -DIRS[d].x))
    o = n * 1.004
    w = .15
    def sheet(off, half, z0, z1, mat, out=0.0):
        c = o + n * out + a * off
        p = [c - a * half, c + a * half]
        tm.face([(p[0].x, p[0].y, z0), (p[1].x, p[1].y, z0), (p[1].x, p[1].y, z1), (p[0].x, p[0].y, z1)], mat)
    sheet(0, w, -.02, H, 'fall')
    for off, z0, z1 in ((-.07, .03, H - .02), (.02, -.01, H - .05), (.08, .06, H - .01)):
        sheet(off, .012, z0, z1, 'fall_light', out=.003)
    f = o + n * .05
    tm.blob((f.x, f.y, .0), .13, 'foam', sx=1.0, sz=.25)
    tm.blob((f.x + a.x * .1, f.y + a.y * .1, .0), .07, 'foam', sz=.3)
    tm.blob((f.x - a.x * .1, f.y - a.y * .1, .0), .07, 'foam', sz=.3)
    return tm.finish('fall_' + 'NESW'[d], clip=False)


def build_tile(t):
    rnd = random.Random(zlib.crc32(t['id'].encode()))
    tm = TileMesh()
    y0 = -.01 if 'cliff' in t['features'] else -1.0
    slab(tm, y0)
    if y0 > -1:
        cliff(tm, y0, random.Random(zlib.crc32(('cliff:' + t['id']).encode())))
    poly, walls = city_shape(t['edges'])
    for w in walls:
        wall(tm, w)
    # towers in the middle of each wall curve; the square with its well or keep, the market, a gazebo — where the
    # face paints them
    towers = [w[len(w) // 2] for w in walls]
    for c in towers:
        p_tower(tm, (c.x, c.y, H - .01), .62)
    city = [d for d in range(4) if t['edges'][d] == 'c']
    lay = town_layout(t)
    if lay:
        p_keep(tm, (lay['tc'].x, lay['tc'].y, H), lay['keep'])
    if lay and len(city) > 1:
        for i, (q, yaw) in enumerate(lay['stalls']):
            p_stall(tm, (q.x, q.y, H), yaw, i)
    if lay and poly:
        grng = random.Random(zlib.crc32(('gazebo:' + t['id']).encode()))
        for _ in range(60):
            q = Vector(((grng.random() * 2 - 1) * .8, (grng.random() * 2 - 1) * .8))
            if not inside(q, poly) or any(dist_poly(q, w) < .16 for w in walls) or any(dist_poly(q, ln) < .14 for ln in lay['lanes']):
                continue
            if (q - lay['tc']).length < lay['sq'] + .16 or any((q - c).length < .2 for c in towers):
                continue
            p_gazebo(tm, (q.x, q.y, H))
            break
    if 'fort' in t['features']:
        p_monastery(tm)
    if 'bridge' in t['features']:
        bridge(tm, next(r for r in t['roads'] if r['to'] is not None))
    # the game rolls the decor per placed card; a model shows one roll, so take the first seed that dresses the field
    # (at least two things where the corners are free), the way the icon and the banner show it
    free = sum(1 for a, b in ((0, 3), (0, 1), (1, 2), (2, 3)) if t['edges'][a] not in 'cb' and t['edges'][b] not in 'cb')
    for k in range(24):
        rnd = random.Random(zlib.crc32((t['id'] + ':' + str(k)).encode()))
        items, ncity = decor_items(t, rnd)
        if sum(1 for it in items if it[0] in PROPS) >= min(2, free):
            break
    extra = []
    for kind, gx, gy in items:   # a bush or a stone at the foot of some trees
        if kind in ('pine', 'oak', 'birch', 'poplar') and rnd.random() < .5:
            extra.append([rnd.choice(('bush', 'rock', 'bush')), gx + (rnd.random() - .5) * .14, gy + .08])
    items += extra
    sq = lay['tc'] if lay else None
    sq_r = (lay['sq'] + (.12 if len(city) > 1 else .19)) if sq is not None else 0   # a small keep needs room to be seen
    for kind, gx, gy in sorted(items, key=lambda it: -it[2]):
        x, y = max(-.39, min(.39, gx)) * 2, -max(-.39, min(.39, gy)) * 2
        q = Vector((x, y))
        if any((q - c).length < .26 for c in towers) or (sq is not None and (q - sq).length < sq_r):
            continue
        if kind == 'tower' and lay:
            continue   # every town has its keep
        if y < y0 + .12:
            continue
        if 'fort' in t['features'] and kind not in PROPS:
            continue
        if 'fort' in t['features'] and max(abs(x), abs(y)) < .55:
            continue   # nothing inside the monastery yard
        s = .8 if kind == 'tower' and ncity else 1.0
        place(tm, kind, (x, y, H), rnd, s)
    tile = tm.finish(t['id'])
    falls = [waterfall(d) for d in range(4) if t['edges'][d] == 'w']
    return tile, falls


def tile_materials(face_png):
    """TileFace (the card face; in Blender the exported sprite) and TileAtlas (the props)."""
    face = bpy.data.materials.new('TileFace')
    nt = face.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.9
    if face_png and os.path.exists(face_png):
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = bpy.data.images.load(face_png, check_existing=True)
        nt.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
        if face_png.endswith('.png'):   # the cliff card has a real hole
            nt.links.new(node.outputs['Alpha'], bsdf.inputs['Alpha'])
    atlas = bpy.data.materials.new('TileAtlas')
    nt = atlas.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.8
    node = nt.nodes.new('ShaderNodeTexImage')
    node.image = bpy.data.images.load(os.path.join(TEX, 'atlas.jpg'), check_existing=True)
    nt.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
    return [face, atlas]


def tile_scene(samples):
    """Warm light as on the game icon and the store banner: a low golden sun, a cool sky fill, soft shadows."""
    clean_scene()
    for img in list(bpy.data.images):
        bpy.data.images.remove(img)
    setup_cycles(samples)
    sc = bpy.context.scene
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'   # AgX/Filmic wash the game palette out
    sc.view_settings.exposure = 0.15
    world = sc.world or bpy.data.worlds.new('World')
    sc.world = world
    bg = next((n for n in world.node_tree.nodes if n.type == 'BACKGROUND'), None)
    if bg:
        bg.inputs['Color'].default_value = (0.55, 0.68, 0.95, 1)
        bg.inputs['Strength'].default_value = 0.85
    sun = bpy.data.lights.new('Sun', 'SUN')
    sun.energy = 3.0
    sun.angle = math.radians(14)
    sun.color = (1.0, 0.88, 0.70)
    so = bpy.data.objects.new('Sun', sun)
    so.rotation_euler = (math.radians(30), 0, math.radians(-38))
    sc.collection.objects.link(so)
    cam = bpy.data.cameras.new('TileCam')
    cam.type = 'ORTHO'
    co = bpy.data.objects.new('TileCam', cam)
    sc.collection.objects.link(co)
    sc.camera = co
    return co


def set_view(co, view):
    if view == 'top':   # straight down, the frame is exactly the tile: same framing as the old 512 sprites
        co.data.ortho_scale = 2.0
        co.location = (0, 0, 6)
        co.rotation_euler = (0, 0, 0)
    else:               # isometric, one angle and one light for every tile; room above for the keep
        co.data.ortho_scale = 3.15
        co.location = (4.0, -4.0, 4.0 + .42)
        co.rotation_euler = (math.radians(54.736), 0, math.radians(45))


def export_glb(obj, path, extra_objs=()):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (obj, *extra_objs):
        o.select_set(True)
    bpy.context.view_layer.objects.active = obj
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True)
    # no image inside (the game binds its own card face and loads the atlas once), one vertex colour (COLOR_0) and
    # no normals: the models are flat shaded, three.js derives flat normals itself, and vertices are not split per face
    for extra in (dict(export_image_format='NONE', export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                       export_normals=False), {}):
        try:
            bpy.ops.export_scene.gltf(**kw, **extra)
            return
        except TypeError:
            continue


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def export_props(out_dir, samples=48, render=True):
    """Every prop on its own, standing on the origin: the game can keep placing them itself (random per card).
    With render, also a 256 px isometric preview of each (assets/tiles3d/renders/props/<kind>.png)."""
    os.makedirs(out_dir, exist_ok=True)
    rdir = os.path.join(ROOT, 'assets', 'tiles3d', 'renders', 'props')
    rows = []
    for kind in list(HOUSES) + ['tower'] + list(PROPS):
        co = tile_scene(samples)
        tm = TileMesh()
        place(tm, kind, (0, 0, 0), random.Random(zlib.crc32(kind.encode())))
        obj = tm.finish('prop_' + kind, clip=False)
        for m in tile_materials(None):
            obj.data.materials.append(m)
        export_glb(obj, os.path.join(out_dir, kind + '.glb'))
        rows.append({'id': kind, 'tris': triangles(obj)})
        if render:
            os.makedirs(rdir, exist_ok=True)
            sc = bpy.context.scene
            sc.render.resolution_x = sc.render.resolution_y = 256
            top = max(v.co.z for v in obj.data.vertices)
            co.data.ortho_scale = max(0.75, top * 1.25 + 0.15)
            co.location = (4.0, -4.0, 4.0 + top * 0.45)
            co.rotation_euler = (math.radians(54.736), 0, math.radians(45))
            sc.render.filepath = os.path.join(rdir, kind + '.png')
            bpy.ops.render.render(write_still=True)
    return rows


def run_sets(argv):
    ap = argparse.ArgumentParser(prog='generate_tiles.py')
    ap.add_argument('--set', default='classic', choices=['classic', 'hex'])
    ap.add_argument('--ids', default='')
    ap.add_argument('--views', default='top,iso')
    ap.add_argument('--samples', type=int, default=48)
    ap.add_argument('--no-render', action='store_true')
    ap.add_argument('--props', action='store_true', help='also export the props one by one (assets/tiles3d/props)')
    a = ap.parse_args(argv)
    if a.set != 'classic':
        raise SystemExit('hex set: not built yet (classic first, see docs/design/TILES3D.md)')
    defs = json.load(open(os.path.join(ROOT, 'assets', 'tiles3d', 'tiles.json'), encoding='utf-8'))['tiles']
    want = [s for s in a.ids.split(',') if s]
    tiles = [t for t in defs if not want or t['id'] in want]
    out3d = os.path.join(ROOT, 'assets', 'tiles3d', a.set)
    os.makedirs(out3d, exist_ok=True)
    report = []
    for t in tiles:
        co = tile_scene(a.samples)
        obj, falls = build_tile(t)
        face = next((os.path.join(FACES, t['id'] + ext) for ext in ('.jpg', '.png') if os.path.exists(os.path.join(FACES, t['id'] + ext))), None)
        mats = tile_materials(face)
        for o in (obj, *falls):
            for m in mats:
                o.data.materials.append(m)
        glb = os.path.join(out3d, t['id'] + '.glb')
        export_glb(obj, glb, falls)
        row = {'id': t['id'], 'tris': triangles(obj), 'fall_tris': sum(triangles(f) for f in falls),
               'glb_kb': round(os.path.getsize(glb) / 1024, 1)}
        if not a.no_render:
            for view in [v for v in a.views.split(',') if v]:
                d = os.path.join(ROOT, 'assets', 'tiles3d', 'renders', a.set, view)
                os.makedirs(d, exist_ok=True)
                set_view(co, view)
                bpy.context.scene.render.filepath = os.path.join(d, 'tile_' + t['id'] + '.png')
                bpy.ops.render.render(write_still=True)
        report.append(row)
        print('TILE', json.dumps(row))
    if a.props:
        for row in export_props(os.path.join(ROOT, 'assets', 'tiles3d', 'props'), a.samples, not a.no_render):
            print('PROP', json.dumps(row))
    with open(os.path.join(out3d, '_report.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=1)


if __name__ == "__main__" and '--' in sys.argv:
    run_sets(sys.argv[sys.argv.index('--') + 1:])
elif __name__ == "__main__":
    out_dir = r"D:\TileTopia\store\blender_tiles"
    os.makedirs(out_dir, exist_ok=True)
    print("=== Rendering 3D Tiles ===")
    render_tile_road_straight(os.path.join(out_dir, "tile_3d_road_straight.png"))
    render_tile_road_crossroads(os.path.join(out_dir, "tile_3d_road_crossroads.png"))
    render_tile_river_bridge(os.path.join(out_dir, "tile_3d_river_bridge.png"))
    render_tile_castle_fort(os.path.join(out_dir, "tile_3d_castle_fort.png"))
    render_tile_jigsaw_base(os.path.join(out_dir, "tile_3d_jigsaw_base.png"))
    print("=== 3D Tiles Complete ===")
