"""The two coins of the game, modelled and rendered in Blender.

  tile - «Тайлы», the main coin (earned in games, quests, rewards): a gold coin with a mosaic tile of four pieces on it.
  star - «Звёзды», the rare coin (top achievements, rare goods): a blue-violet coin with a big gold star.

Output: build/coins/<key>.png (transparent, 512x512), packed to WebP by scripts/coins-pack.py.

    python3 tools/blender_generators/generate_coins.py [--only tile] [--out build/coins] [--samples 96]
    (needs the `bpy` module: pip install bpy; or run it inside Blender: blender -b -P <this file> -- ...)
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
KEYS = ['tile', 'star', 'tile2', 'tile3', 'star2', 'star3', 'hex_tile', 'road_tile', 'hex_star', 'spark_star']  # variants A-E of each coin; the owner picks one of each


def srgb(c):
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c)


def metal(name, hexcol, rough=.3, metallic=1.0):
    m = bpy.data.materials.new(name)
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    h = hexcol.lstrip('#')
    b.inputs['Base Color'].default_value = (*srgb(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))), 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    return m


def put(obj, m):
    obj.data.materials.clear()  # a boolean leaves an empty slot, and faces take it (plain white)
    obj.data.materials.append(m)
    return obj


def smooth(obj, bevel=None):
    for p in obj.data.polygons:
        p.use_smooth = True
    if bevel:
        mod = obj.modifiers.new('Bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    return obj


def cyl(r, depth, z, verts=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=(0, 0, z))
    return bpy.context.object


def torus(R, r, z):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=96, minor_segments=16, location=(0, 0, z))
    return smooth(bpy.context.object)


def box(sx, sy, sz, loc, rot=0.0):
    # made at the origin, scaled, then moved: a location given to the primitive is not applied the way it reads
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0), rotation=(0, 0, 0))
    o = bpy.context.object
    o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    o.rotation_euler = (0, 0, rot)
    o.location = loc
    return o


def beads(n, R, size, z, m):
    for i in range(n):
        a = i / n * math.tau
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=size, location=(math.cos(a) * R, math.sin(a) * R, z))
        put(smooth(bpy.context.object), m)


def body(face, rim, top):
    """the disc, a raised rim and a field slightly lower than the rim; returns the z of the field"""
    put(smooth(cyl(1.0, .16, 0), .02), rim)
    put(torus(.93, .065, .075), rim)
    put(smooth(cyl(.86, .02, .078)), face)
    return top


def tile():
    gold = metal('gold', '#f4b73f', .26)
    deep = metal('goldDeep', '#c98a1c', .34)
    light = metal('goldLight', '#ffd978', .2)
    body(deep, gold, .09)
    beads(28, .8, .03, .1, gold)
    z = .115
    # a mosaic tile: four pieces with thin joints, turned a quarter so it stands on its corner
    s, gap = .4, .035
    for (dx, dy, m) in ((-1, -1, light), (1, -1, gold), (-1, 1, gold), (1, 1, light)):
        o = box(s, s, .07, (dx * (s / 2 + gap / 2), dy * (s / 2 + gap / 2), z), math.radians(45))
        # the box is rotated about its own centre: put it back on the tile's place
        o.location = (0, 0, z)
        o.location.x = ((dx * (s / 2 + gap / 2)) * math.cos(math.radians(45)) - (dy * (s / 2 + gap / 2)) * math.sin(math.radians(45)))
        o.location.y = ((dx * (s / 2 + gap / 2)) * math.sin(math.radians(45)) + (dy * (s / 2 + gap / 2)) * math.cos(math.radians(45)))
        put(smooth(o, .012), m)
    # a little dot in the middle of the joints
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=.05, location=(0, 0, z + .04))
    put(smooth(bpy.context.object), light)


def star_mesh(R, r, depth, z, n=5):
    """a five-point star, extruded"""
    import bmesh
    me = bpy.data.meshes.new('Star')
    bm = bmesh.new()
    pts = [(math.cos(math.pi / 2 + i * math.pi / n) * (R if i % 2 == 0 else r), math.sin(math.pi / 2 + i * math.pi / n) * (R if i % 2 == 0 else r)) for i in range(2 * n)]
    vs = [bm.verts.new((x, y, -depth / 2)) for x, y in pts]
    f = bm.faces.new(vs)
    r2 = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=(0, 0, depth), verts=[v for v in r2['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Star', me)
    bpy.context.scene.collection.objects.link(o)
    o.location = (0, 0, z)
    bpy.context.view_layer.objects.active = o
    return o


def star():
    face = metal('starFace', '#2c2a7c', .24)
    rim = metal('starRim', '#9fb2ff', .2)
    gem = metal('starGem', '#ffe38a', .18)
    body(face, rim, .09)
    beads(28, .8, .03, .1, rim)
    z = .12
    put(smooth(star_mesh(.62, .26, .08, z), .014), gem)
    # a small bright dot in the middle of the star
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=.07, location=(0, 0, z + .05))
    put(smooth(bpy.context.object), metal('starDot', '#fff6d0', .15))


def tile2():
    """one big tile in a tile: a diamond with a lower diamond inside and a bright pip"""
    gold = metal('gold', '#f4b73f', .26)
    deep = metal('goldDeep', '#b8791a', .36)
    light = metal('goldLight', '#ffd978', .2)
    body(deep, gold, .09)
    beads(28, .8, .03, .1, gold)
    z = .115
    put(smooth(box(.92, .92, .07, (0, 0, z), math.radians(45)), .015), light)
    put(smooth(box(.66, .66, .08, (0, 0, z + .01), math.radians(45)), .015), deep)
    put(smooth(box(.34, .34, .09, (0, 0, z + .02), math.radians(45)), .012), light)


def tile3():
    """a square tile of nine pieces in a checker, on a coin with a plain, grooved rim"""
    gold = metal('gold', '#f0a93a', .3)
    deep = metal('goldDeep', '#a8681a', .4)
    light = metal('goldLight', '#ffd37a', .2)
    body(deep, gold, .09)
    for i in range(48):
        a = i / 48 * math.tau
        put(smooth(box(.018, .05, .03, (math.cos(a) * .965, math.sin(a) * .965, .1), a), .005), deep)
    z = .115
    s, g = .3, .04
    for ix in (-1, 0, 1):
        for iy in (-1, 0, 1):
            put(smooth(box(s, s, .07, (ix * (s + g), iy * (s + g), z)), .012), light if (ix + iy) % 2 == 0 else gold)


def star2():
    """a teal coin with a silver-white star and five small dots between its points"""
    face = metal('starFace', '#0f5d63', .26)
    rim = metal('starRim', '#cfe9ea', .2)
    gem = metal('starGem', '#f2f7ff', .16)
    body(face, rim, .09)
    beads(28, .8, .03, .1, rim)
    z = .12
    put(smooth(star_mesh(.62, .27, .08, z), .014), gem)
    for i in range(5):
        a = math.pi / 2 + math.pi / 5 + i * math.tau / 5
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=.05, location=(math.cos(a) * .6, math.sin(a) * .6, z))
        put(smooth(bpy.context.object), gem)


def star3():
    """a plum coin with a golden rim and star, and five bright gems around it"""
    face = metal('starFace', '#5b1a73', .26)
    rim = metal('starRim', '#f4b73f', .24)
    gem = metal('starGem', '#ffd978', .18)
    cyan = metal('starCyan', '#7dffea', .12, .0)
    body(face, rim, .09)
    z = .12
    put(smooth(star_mesh(.55, .24, .1, z), .02), gem)
    for i in range(5):
        a = math.pi / 2 + math.pi / 5 + i * math.tau / 5
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=.07, location=(math.cos(a) * .7, math.sin(a) * .7, z))
        put(smooth(bpy.context.object), cyan)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=.07, location=(math.cos(a) * .7, math.sin(a) * .7, z))
        o = bpy.context.object
        put(smooth(o), cyan)


def rsq(m, size=1.7, depth=.16, radius=.34):
    """a square slab with rounded corners: the outline is built from four arcs and extruded"""
    import bmesh
    me = bpy.data.meshes.new('Slab')
    bm = bmesh.new()
    h = size / 2 - radius
    pts = []
    for cx, cy, a0 in ((h, h, 0), (-h, h, 90), (-h, -h, 180), (h, -h, 270)):
        for k in range(13):
            a = math.radians(a0 + k * 90 / 12)
            pts.append((cx + math.cos(a) * radius, cy + math.sin(a) * radius))
    vs = [bm.verts.new((x, y, -depth / 2)) for x, y in pts]
    f = bm.faces.new(vs)
    r2 = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=(0, 0, depth), verts=[v for v in r2['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Slab', me)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    return put(smooth(o, .02), m)


def hexcyl(r, depth, z):
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=r, depth=depth, location=(0, 0, z))
    return bpy.context.object


def hex_tile():
    """a hexagon coin (the Classic 2.0 shape) with a honeycomb of seven cells"""
    gold = metal('gold', '#f4b73f', .26)
    deep = metal('goldDeep', '#b8791a', .36)
    light = metal('goldLight', '#ffd978', .2)
    put(smooth(hexcyl(1.05, .16, 0), .03), gold)
    put(smooth(hexcyl(.9, .03, .085), .006), deep)
    z = .12
    r = .21
    for k in range(7):
        if k == 0:
            x = y = 0
        else:
            a = math.radians(30 + 60 * (k - 1)); x, y = math.cos(a) * .4, math.sin(a) * .4
        c = hexcyl(r, .07, z)
        c.location = (x, y, z)
        put(smooth(c, .01), light if k == 0 else gold)


def road_tile():
    """a rounded square coin with a crossing of two roads and a round square in the middle"""
    gold = metal('gold', '#f0a93a', .3)
    deep = metal('goldDeep', '#a8681a', .4)
    light = metal('goldLight', '#ffd37a', .2)
    rsq(gold)
    put(smooth(box(1.42, 1.42, .03, (0, 0, .085)), .01), deep)
    z = .12
    put(smooth(box(1.3, .24, .06, (0, 0, z)), .012), light)
    put(smooth(box(.24, 1.3, .06, (0, 0, z)), .012), light)
    put(smooth(cyl(.3, .08, z, 48), .012), gold)
    put(smooth(cyl(.14, .1, z + .01, 48), .01), light)


def hex_star():
    """a teal hexagon coin with an eight-point compass star"""
    face = metal('hsFace', '#0f5d63', .26)
    rim = metal('hsRim', '#cfe9ea', .2)
    gem = metal('hsGem', '#fff2c4', .16)
    put(smooth(hexcyl(1.05, .16, 0), .03), rim)
    put(smooth(hexcyl(.9, .03, .085), .006), face)
    z = .12
    put(smooth(star_mesh(.78, .3, .08, z, 8), .014), gem)
    put(smooth(cyl(.1, .1, z + .02, 32), .01), rim)


def spark_star():
    """a plum rounded square with a four-ray sparkle"""
    gold = metal('spGold', '#f4b73f', .24)
    face = metal('spFace', '#5b1a73', .26)
    gem = metal('spGem', '#ffe6f2', .14)
    rsq(gold)
    put(smooth(box(1.42, 1.42, .03, (0, 0, .085)), .01), face)
    z = .12
    put(smooth(star_mesh(.72, .17, .09, z, 4), .016), gem)
    for (x, y) in ((.55, .55), (-.55, -.55)):
        put(smooth(star_mesh(.16, .05, .06, z, 4), .008), gold).location = (x, y, z)


def facet_star(R, r, h, z, n=5):
    """a star as a low pyramid: every ray has two flat faces that catch the light differently"""
    import bmesh
    me = bpy.data.meshes.new('FStar')
    bm = bmesh.new()
    top = bm.verts.new((0, 0, h))
    ring = [bm.verts.new((math.cos(math.pi / 2 + i * math.pi / n) * (R if i % 2 == 0 else r), math.sin(math.pi / 2 + i * math.pi / n) * (R if i % 2 == 0 else r), 0)) for i in range(2 * n)]
    for i in range(2 * n):
        bm.faces.new((top, ring[i], ring[(i + 1) % (2 * n)]))
    bm.faces.new(list(reversed(ring)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('FStar', me)
    bpy.context.scene.collection.objects.link(o)
    o.location = (0, 0, z)
    bpy.context.view_layer.objects.active = o
    return o


def reeded(n, m):
    """the milled edge of a coin"""
    for i in range(n):
        a = i / n * math.tau
        put(smooth(box(.035, .07, .15, (math.cos(a) * 1.0, math.sin(a) * 1.0, 0), a)), m)


def rays(n, r0, r1, z, m):
    """a sunburst: thin raised rays between two radii"""
    for i in range(n):
        a = i / n * math.tau
        rm = (r0 + r1) / 2
        put(smooth(box(r1 - r0, .018, .014, (math.cos(a) * rm, math.sin(a) * rm, z), a)), m)


def p1_main():
    gold = metal('gold', '#f4b73f', .26)
    deep = metal('goldDeep', '#c4801a', .36)
    light = metal('goldLight', '#ffd978', .2)
    put(smooth(cyl(1.0, .16, 0), .02), gold)
    reeded(112, deep)
    put(torus(.93, .05, .08), gold)
    put(torus(.8, .018, .085), deep)
    put(smooth(cyl(.78, .02, .082)), deep)
    put(torus(.66, .014, .09), light)
    for a in (0, 90, 180, 270):
        r = math.radians(a)
        put(smooth(box(.09, .09, .03, (math.cos(r) * .72, math.sin(r) * .72, .1), math.radians(45)), .006), light)
    z = .115
    s, g = .27, .03
    for (dx, dy, m) in ((-1, -1, light), (1, -1, gold), (-1, 1, gold), (1, 1, light)):
        c = math.cos(math.radians(45)); sn = math.sin(math.radians(45))
        ox, oy = dx * (s / 2 + g / 2), dy * (s / 2 + g / 2)
        put(smooth(box(s, s, .07, (ox * c - oy * sn, ox * sn + oy * c, z), math.radians(45)), .012), m)
        put(smooth(box(s * .55, s * .55, .08, (ox * c - oy * sn, ox * sn + oy * c, z + .008), math.radians(45)), .008), deep if m is light else light)


def p1_rare():
    face = metal('rFace', '#262a74', .26)
    rim = metal('rRim', '#a9b8ff', .2)
    deep = metal('rDeep', '#5b69c9', .3)
    gem = metal('rGem', '#ffe38a', .16)
    put(smooth(cyl(1.0, .16, 0), .02), rim)
    reeded(112, deep)
    put(torus(.93, .05, .08), rim)
    put(torus(.8, .018, .085), deep)
    put(smooth(cyl(.78, .02, .082)), face)
    put(torus(.66, .014, .09), rim)
    for i in range(5):
        a = math.pi / 2 + math.pi / 5 + i * math.tau / 5
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=.045, location=(math.cos(a) * .72, math.sin(a) * .72, .1))
        put(smooth(bpy.context.object), rim)
    put(facet_star(.6, .26, .1, .095), gem)


def p2_main():
    gold = metal('gold', '#f4b73f', .26)
    deep = metal('goldDeep', '#b8791a', .38)
    light = metal('goldLight', '#ffd978', .2)
    put(smooth(cyl(1.0, .16, 0), .02), gold)
    put(torus(.94, .045, .08), gold)
    put(smooth(cyl(.88, .02, .082)), deep)
    rays(60, .46, .86, .1, light)
    put(torus(.44, .03, .1), gold)
    put(smooth(cyl(.42, .05, .1)), gold)
    z = .13
    put(smooth(box(.5, .5, .05, (0, 0, z), math.radians(45)), .012), light)
    put(smooth(box(.36, .36, .06, (0, 0, z + .008), math.radians(45)), .01), deep)
    put(smooth(box(.2, .2, .07, (0, 0, z + .016), math.radians(45)), .008), light)


def p2_rare():
    face = metal('r2Face', '#4a1666', .26)
    rim = metal('r2Rim', '#f4b73f', .24)
    ray = metal('r2Ray', '#d8c8ff', .22)
    gem = metal('r2Gem', '#fff1c8', .16)
    put(smooth(cyl(1.0, .16, 0), .02), rim)
    put(torus(.94, .045, .08), rim)
    put(smooth(cyl(.88, .02, .082)), face)
    rays(60, .5, .86, .1, ray)
    put(torus(.48, .03, .1), rim)
    put(smooth(cyl(.46, .05, .1)), face)
    put(facet_star(.4, .17, .09, .125), gem)


MAKERS = {'tile': tile, 'star': star, 'tile2': tile2, 'tile3': tile3, 'star2': star2, 'star3': star3, 'hex_tile': hex_tile, 'road_tile': road_tile, 'hex_star': hex_star, 'spark_star': spark_star, 'p1_main': p1_main, 'p1_rare': p1_rare, 'p2_main': p2_main, 'p2_rare': p2_rare}


def scene(samples, size=512):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.view_settings.view_transform = 'Standard'
    w = sc.world or bpy.data.worlds.new('W')
    sc.world = w
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (.62, .66, .8, 1)
    bg.inputs['Strength'].default_value = .9
    for name, energy, sz, col, loc in (('Key', 320, 3, (1, .94, .84), (-2.6, -2.4, 4.0)), ('Rim', 220, 2.5, (.7, .82, 1), (2.8, 2.2, 3.0)), ('Fill', 90, 4, (1, 1, 1), (2.5, -3, 2.0)), ('Top', 30, 2, (1, 1, 1), (0, 0, 5))):
        L = bpy.data.lights.new(name, 'AREA')
        L.energy, L.size, L.color = energy, sz, col
        o = bpy.data.objects.new(name, L)
        sc.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new('Cam')
    cam.type = 'ORTHO'
    cam.ortho_scale = 2.35
    co = bpy.data.objects.new('Cam', cam)
    sc.collection.objects.link(co)
    # a coin lying a little turned to the viewer
    az, el = math.radians(-90), math.radians(74)
    co.location = Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el))) * 8
    co.rotation_euler = (-co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co


def main(argv):
    out = argv[argv.index('--out') + 1] if '--out' in argv else os.path.join(ROOT, 'build', 'coins')
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else KEYS
    samples = int(argv[argv.index('--samples') + 1]) if '--samples' in argv else 96
    os.makedirs(out, exist_ok=True)
    for key in only:
        bpy.ops.wm.read_homefile(use_empty=True)
        MAKERS[key]()
        scene(samples)
        bpy.context.scene.render.filepath = os.path.join(out, key + '.png')
        bpy.ops.render.render(write_still=True)
        print('COIN', key, flush=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
