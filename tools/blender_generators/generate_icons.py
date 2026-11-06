import bpy
import bmesh
import math
import os
import time

# ─────────────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────────────

def setup_cycles(res=512, samples=64):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    try:
        p = bpy.context.preferences.addons['cycles'].preferences
        p.compute_device_type = 'CUDA'
        for d in p.devices: d.use = True
        s.cycles.device = 'GPU'
    except Exception:
        pass
    s.cycles.samples = samples
    s.cycles.use_denoising = True
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.render.resolution_x = res
    s.render.resolution_y = res
    s.render.resolution_percentage = 100

def clean_all():
    for c in list(bpy.data.collections):
        for o in list(c.objects): c.objects.unlink(o)
    for t in (bpy.data.objects, bpy.data.meshes, bpy.data.materials,
              bpy.data.lights, bpy.data.cameras, bpy.data.worlds):
        for item in list(t): t.remove(item, do_unlink=True)

def mat(name, color, metallic=0.0, roughness=0.35, emission=0.0,
        transmission=0.0, ior=1.45):
    m = bpy.data.materials.new(name)
    n = m.node_tree.nodes
    b = next(x for x in n if x.type == "BSDF_PRINCIPLED")
    b.inputs['Base Color'].default_value = color
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = roughness
    if emission > 0:
        b.inputs['Emission Color'].default_value = color
        b.inputs['Emission Strength'].default_value = emission
    if transmission > 0:
        b.inputs['Transmission Weight'].default_value = transmission
        b.inputs['IOR'].default_value = ior
    return m

def add_area_light(name, energy, size, loc, color=(1,1,1)):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy = energy; d.size = size; d.color = color
    o = bpy.data.objects.new(name, d)
    o.location = loc
    from mathutils import Vector
    direction = Vector((0,0,0)) - Vector(loc)
    o.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.collection.objects.link(o)
    return o

def add_camera(loc, target=(0,0,0), lens=65, ortho=False, ortho_scale=3.5):
    cd = bpy.data.cameras.new("Cam")
    if ortho:
        cd.type = 'ORTHO'; cd.ortho_scale = ortho_scale
    else:
        cd.lens = lens
    co = bpy.data.objects.new("Cam", cd)
    co.location = loc
    from mathutils import Vector
    direction = Vector(target) - Vector(loc)
    co.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.collection.objects.link(co)
    bpy.context.scene.camera = co
    return co

def set_world_bg(color=(0.05, 0.07, 0.14, 1.0)):
    w = bpy.data.worlds.new("World")
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = color
    bg.inputs['Strength'].default_value = 0.3

def studio_lights():
    add_area_light("Key", 250, 2.5, (3, -3, 4), (1, 0.96, 0.88))
    add_area_light("Fill", 100, 4.0, (-3, -2, 2.5), (0.7, 0.85, 1.0))
    add_area_light("Rim", 180, 1.5, (0, 3, 3), (1, 0.9, 0.6))

def make_meeple(scale=1.0):
    """Create an iconic meeple shape and return the object."""
    pts = [
        (0.0, 1.15),(0.12, 1.13),(0.22, 1.06),(0.28, 0.94),(0.27, 0.79),
        (0.17, 0.67),(0.32, 0.62),(0.55, 0.54),(0.74, 0.42),(0.70, 0.22),
        (0.50, 0.27),(0.33, 0.35),(0.31, 0.15),(0.37, -0.05),(0.42, -0.35),
        (0.45, -0.65),(0.18, -0.65),(0.12, -0.25),(0.0, -0.12)
    ]
    full = list(pts) + [(-x, z) for x, z in reversed(pts[1:-1])]
    bm = bmesh.new()
    vs = [bm.verts.new((x*scale, 0, z*scale)) for x, z in full]
    bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
    ev = [v for v in res['geom'] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0.30*scale, 0), verts=ev)
    me = bpy.data.meshes.new("Meeple")
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("Meeple", me)
    bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bev = ob.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.035*scale; bev.segments = 4
    bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS')
    ob.select_set(False)
    return ob

def make_tile_block(sx=1.0, sy=1.0, sz=0.16, loc=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    ob = bpy.context.active_object
    ob.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    bev = ob.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.04; bev.segments = 3
    return ob

# ═════════════════════════════════════════════════════════════════════
# ICON 1 — «3D Isometric Tile Landscape» (board game tabletop feel)
# ═════════════════════════════════════════════════════════════════════
def render_icon_1(out):
    clean_all()
    setup_cycles(512, 64)
    set_world_bg((0.06, 0.08, 0.18, 1))
    studio_lights()
    add_camera((3.2, -3.2, 3.0), (0, 0, 0.1), ortho=True, ortho_scale=3.0)

    grass = mat("Grass", (0.28, 0.65, 0.22, 1), roughness=0.55)
    road  = mat("Road",  (0.78, 0.72, 0.58, 1), roughness=0.7)
    water = mat("Water", (0.15, 0.55, 0.85, 1), roughness=0.06, transmission=0.6, ior=1.33)
    gold  = mat("Gold",  (1, 0.82, 0.24, 1), metallic=0.95, roughness=0.15)
    stone = mat("Stone", (0.62, 0.58, 0.52, 1), roughness=0.55)
    wood  = mat("Wood",  (0.42, 0.28, 0.14, 1), roughness=0.5)
    red   = mat("Roof",  (0.85, 0.2, 0.15, 1), roughness=0.35)
    blue_m= mat("Blue",  (0.15, 0.4, 0.9, 1), roughness=0.25)

    # — 3×3 grid of tiles at 45° isometric —
    offsets = [(-1.1, -1.1), (0, -1.1), (1.1, -1.1),
               (-1.1, 0), (0, 0), (1.1, 0),
               (-1.1, 1.1), (0, 1.1), (1.1, 1.1)]
    mats = [grass, grass, grass, grass, road, grass, water, grass, grass]
    for (ox, oy), m in zip(offsets, mats):
        t = make_tile_block(0.5, 0.5, 0.06, (ox, oy, -0.06))
        t.data.materials.append(wood)
        tp = make_tile_block(0.48, 0.48, 0.015, (ox, oy, 0.015))
        tp.data.materials.append(m)

    # Road strips on center column
    for oy in (-1.1, 0, 1.1):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, oy, 0.03))
        r = bpy.context.active_object
        r.scale = (0.12, 0.48, 0.006)
        bpy.ops.object.transform_apply(scale=True)
        r.data.materials.append(road)

    # Castle tower on corner tile
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.25, depth=0.55, location=(-1.1, -1.1, 0.3))
    tower = bpy.context.active_object
    tower.data.materials.append(stone)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.30, depth=0.3, location=(-1.1, -1.1, 0.68))
    roof = bpy.context.active_object
    roof.data.materials.append(red)

    # Gold meeple on center tile
    mp = make_meeple(0.45)
    mp.location = (0, 0, 0.03)
    mp.rotation_euler = (0, 0, math.radians(-30))
    mp.data.materials.append(gold)

    # Blue meeple nearby
    mp2 = make_meeple(0.38)
    mp2.location = (1.1, 0, 0.03)
    mp2.rotation_euler = (0, 0, math.radians(15))
    mp2.data.materials.append(blue_m)

    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("Rendered icon 1:", os.path.basename(out))


# ═════════════════════════════════════════════════════════════════════
# ICON 2 — «Golden Meeple Hero» (close-up heroic meeple on tile)
# ═════════════════════════════════════════════════════════════════════
def render_icon_2(out):
    clean_all()
    setup_cycles(512, 72)
    set_world_bg((0.07, 0.09, 0.20, 1))
    studio_lights()
    add_camera((0, -2.0, 0.7), (0, 0, 0.25), lens=70)

    gold = mat("Gold", (1, 0.82, 0.22, 1), metallic=0.95, roughness=0.15)
    wood = mat("Wood", (0.40, 0.26, 0.12, 1), roughness=0.45)
    grass = mat("Grass", (0.26, 0.60, 0.20, 1), roughness=0.5)

    # Single large tile as pedestal
    base = make_tile_block(0.7, 0.7, 0.08, (0, 0, -0.08))
    base.data.materials.append(wood)
    top = make_tile_block(0.67, 0.67, 0.02, (0, 0, 0.02))
    top.data.materials.append(grass)

    # Hero meeple
    mp = make_meeple(0.75)
    mp.location = (0, 0, 0.04)
    mp.rotation_euler = (math.radians(-8), math.radians(10), math.radians(-5))
    mp.data.materials.append(gold)

    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("Rendered icon 2:", os.path.basename(out))


# ═════════════════════════════════════════════════════════════════════
# ICON 3 — «Puzzle Piece with Crown» (game identity)
# ═════════════════════════════════════════════════════════════════════
def render_icon_3(out):
    clean_all()
    setup_cycles(512, 72)
    set_world_bg((0.06, 0.07, 0.16, 1))
    studio_lights()
    add_camera((0, -2.5, 1.2), (0, 0, 0.15), lens=65)

    gold  = mat("Gold",  (1, 0.82, 0.22, 1), metallic=0.95, roughness=0.15)
    wood  = mat("PuzWood",(0.85, 0.62, 0.35, 1), roughness=0.3)
    ruby  = mat("Ruby",  (0.92, 0.06, 0.15, 1), roughness=0.05, transmission=0.8, ior=1.77)
    dark  = mat("Dark",  (0.12, 0.12, 0.18, 1), roughness=0.2)

    # Puzzle piece base
    bpy.ops.mesh.primitive_cube_add(size=1.6, location=(0, 0, 0))
    puz = bpy.context.active_object
    puz.scale = (1, 1, 0.2)
    bpy.ops.object.transform_apply(scale=True)
    puz.data.materials.append(wood)
    bev = puz.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.04; bev.segments = 3

    # Puzzle tab right
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.28, depth=0.32, location=(0.82, 0, 0))
    tab = bpy.context.active_object
    tab.data.materials.append(wood)

    # Puzzle tab top
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.28, depth=0.32, location=(0, 0.82, 0))
    tab2 = bpy.context.active_object
    tab2.data.materials.append(wood)

    # Gold emblem star
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.38, depth=0.06, location=(0, 0, 0.18))
    star = bpy.context.active_object
    star.data.materials.append(gold)

    # Crown on top
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.52, depth=0.12, location=(0, 0, 0.42))
    ring = bpy.context.active_object
    ring.data.materials.append(gold)
    for i in range(5):
        a = i * (2 * math.pi / 5) + math.radians(18)
        x, y = 0.48*math.sin(a), 0.48*math.cos(a)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.10, depth=0.35, location=(x, y, 0.60))
        sp = bpy.context.active_object
        sp.data.materials.append(gold)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.055, location=(x*1.03, y*1.03, 0.80))
        gem = bpy.context.active_object
        gem.data.materials.append(ruby)

    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("Rendered icon 3:", os.path.basename(out))


# ═════════════════════════════════════════════════════════════════════
# ICON 4 — «Village Diorama» (miniature world on a tile)
# ═════════════════════════════════════════════════════════════════════
def render_icon_4(out):
    clean_all()
    setup_cycles(512, 64)
    set_world_bg((0.05, 0.07, 0.15, 1))
    studio_lights()
    add_camera((2.5, -2.5, 2.5), (0, 0, 0), ortho=True, ortho_scale=2.6)

    grass = mat("Grass",  (0.26, 0.62, 0.2, 1), roughness=0.5)
    road  = mat("Road",   (0.75, 0.68, 0.55, 1), roughness=0.65)
    water = mat("Water",  (0.12, 0.52, 0.82, 1), roughness=0.05, transmission=0.7, ior=1.33)
    wood  = mat("Wood",   (0.40, 0.26, 0.13, 1), roughness=0.5)
    stone = mat("Stone",  (0.58, 0.55, 0.5, 1), roughness=0.5)
    red   = mat("Roof",   (0.82, 0.18, 0.12, 1), roughness=0.35)
    gold  = mat("Gold",   (1, 0.82, 0.22, 1), metallic=0.95, roughness=0.15)
    leaves= mat("Leaves", (0.18, 0.55, 0.16, 1), roughness=0.45)
    trunk = mat("Trunk",  (0.35, 0.2, 0.1, 1), roughness=0.65)

    # Single large tile
    base = make_tile_block(0.95, 0.95, 0.08, (0, 0, -0.08))
    base.data.materials.append(wood)
    top = make_tile_block(0.92, 0.92, 0.02, (0, 0, 0.02))
    top.data.materials.append(grass)

    # River across tile
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.3, 0, 0.025))
    river = bpy.context.active_object
    river.scale = (0.14, 0.9, 0.005)
    bpy.ops.object.transform_apply(scale=True)
    river.data.materials.append(water)

    # Road across
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.15, 0.028))
    rd = bpy.context.active_object
    rd.scale = (0.9, 0.12, 0.005)
    bpy.ops.object.transform_apply(scale=True)
    rd.data.materials.append(road)

    # Bridge
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.3, 0.15, 0.04))
    br = bpy.context.active_object
    br.scale = (0.18, 0.15, 0.014)
    bpy.ops.object.transform_apply(scale=True)
    br.data.materials.append(stone)
    bev = br.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.015; bev.segments = 2

    # Houses
    for hx, hy in [(-0.4, -0.3), (-0.55, 0.4), (-0.25, 0.55)]:
        bpy.ops.mesh.primitive_cube_add(size=0.2, location=(hx, hy, 0.12))
        h = bpy.context.active_object
        h.scale = (1, 0.7, 0.8)
        bpy.ops.object.transform_apply(scale=True)
        h.data.materials.append(stone)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.14, depth=0.12,
                                         location=(hx, hy, 0.24))
        rf = bpy.context.active_object
        rf.rotation_euler = (0, 0, math.radians(45))
        rf.data.materials.append(red)

    # Trees
    for tx, ty in [(0.6, -0.5), (0.65, 0.55), (0.55, 0.0), (-0.6, -0.6)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.025, depth=0.15, location=(tx, ty, 0.1))
        tr = bpy.context.active_object
        tr.data.materials.append(trunk)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.1, location=(tx, ty, 0.22))
        lv = bpy.context.active_object
        lv.data.materials.append(leaves)

    # Gold meeple
    mp = make_meeple(0.3)
    mp.location = (-0.1, -0.5, 0.03)
    mp.rotation_euler = (0, 0, math.radians(-20))
    mp.data.materials.append(gold)

    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("Rendered icon 4:", os.path.basename(out))


# ═════════════════════════════════════════════════════════════════════
# ICON 5 — «TT Monogram Badge» (clean modern logo)
# ═════════════════════════════════════════════════════════════════════
def render_icon_5(out):
    clean_all()
    setup_cycles(512, 72)
    set_world_bg((0.07, 0.09, 0.22, 1))
    studio_lights()
    add_camera((0, -2.5, 0.5), (0, 0, 0.1), lens=65)

    gold  = mat("Gold",   (1, 0.82, 0.22, 1), metallic=0.95, roughness=0.15)
    dark  = mat("Dark",   (0.08, 0.10, 0.20, 1), metallic=0.3, roughness=0.15)
    ruby  = mat("Ruby",   (0.9, 0.05, 0.12, 1), roughness=0.06, transmission=0.75, ior=1.77)

    # Circular shield base
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.9, depth=0.12, location=(0, 0, 0))
    shield = bpy.context.active_object
    shield.data.materials.append(dark)
    bev = shield.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.02; bev.segments = 2

    # Gold ring border
    bpy.ops.mesh.primitive_torus_add(major_radius=0.87, minor_radius=0.045,
                                      location=(0, 0, 0.06))
    ring = bpy.context.active_object
    ring.data.materials.append(gold)

    # Inner decorative ring
    bpy.ops.mesh.primitive_torus_add(major_radius=0.72, minor_radius=0.02,
                                      location=(0, 0, 0.06))
    ring2 = bpy.context.active_object
    ring2.data.materials.append(gold)

    # Central "T" letter — tall vertical bar
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.12, 0, 0.08))
    t_vert = bpy.context.active_object
    t_vert.scale = (0.08, 0.03, 0.28)
    bpy.ops.object.transform_apply(scale=True)
    t_vert.data.materials.append(gold)
    bev2 = t_vert.modifiers.new("Bevel", "BEVEL")
    bev2.width = 0.01; bev2.segments = 2

    # "T" crossbar
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.12, 0, 0.32))
    t_cross = bpy.context.active_object
    t_cross.scale = (0.22, 0.03, 0.06)
    bpy.ops.object.transform_apply(scale=True)
    t_cross.data.materials.append(gold)
    bev3 = t_cross.modifiers.new("Bevel", "BEVEL")
    bev3.width = 0.01; bev3.segments = 2

    # Second "t" — smaller, slightly offset
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.18, 0, 0.06))
    t2_vert = bpy.context.active_object
    t2_vert.scale = (0.06, 0.03, 0.22)
    bpy.ops.object.transform_apply(scale=True)
    t2_vert.data.materials.append(gold)
    bev4 = t2_vert.modifiers.new("Bevel", "BEVEL")
    bev4.width = 0.01; bev4.segments = 2

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.18, 0, 0.24))
    t2_cross = bpy.context.active_object
    t2_cross.scale = (0.16, 0.03, 0.05)
    bpy.ops.object.transform_apply(scale=True)
    t2_cross.data.materials.append(gold)

    # Ruby gem at center bottom
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.06,
                                           location=(0.03, -0.02, -0.02))
    gem = bpy.context.active_object
    gem.data.materials.append(ruby)

    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print("Rendered icon 5:", os.path.basename(out))


# ═════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    OUT = r"D:\TileTopia\store\blender_icons"
    os.makedirs(OUT, exist_ok=True)
    t0 = time.time()
    print("=== Generating App Icon Variants ===")
    render_icon_1(os.path.join(OUT, "icon_v1_isometric_landscape.png"))
    render_icon_2(os.path.join(OUT, "icon_v2_golden_meeple.png"))
    render_icon_3(os.path.join(OUT, "icon_v3_puzzle_crown.png"))
    render_icon_4(os.path.join(OUT, "icon_v4_village_diorama.png"))
    render_icon_5(os.path.join(OUT, "icon_v5_tt_monogram.png"))
    print(f"=== All Icons Done in {time.time()-t0:.1f}s ===")
