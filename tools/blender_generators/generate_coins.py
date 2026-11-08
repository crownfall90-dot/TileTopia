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


def toy(name, hexcol, rough=.3, coat=.9):
    """glossy cartoon plastic (not metal): a saturated colour with a bright clear coat"""
    m = bpy.data.materials.new(name)
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    h = hexcol.lstrip('#')
    b.inputs['Base Color'].default_value = (*srgb(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))), 1)
    b.inputs['Metallic'].default_value = 0.0
    b.inputs['Roughness'].default_value = rough
    for k in ('Coat Weight', 'Clearcoat'):
        if k in b.inputs:
            b.inputs[k].default_value = coat
            break
    return m


def chunky(body_m, rim_m, face_m):
    """a thick, soft-edged coin: a fat rounded disc, a puffy raised rim and a sunk face"""
    d = cyl(1.0, .34, 0)
    put(smooth(d, .09), body_m)
    put(torus(.86, .11, .16), rim_m)
    put(smooth(cyl(.78, .05, .185), .012), face_m)


def under(obj_fn, m, grow=.07):
    """the dark outline under an emblem: the same shape a little bigger and lower"""
    return obj_fn(grow, m)


def b1_main():
    body = toy('cBody', '#e08a0c')
    rim = toy('cRim', '#ffc928')
    face = toy('cFace', '#f28c08', .6, .2)
    light = toy('cLight', '#fff09a', .22)
    dark = toy('cDark', '#b8620a')
    chunky(body, rim, face)
    z = .24
    s, g = .27, .035
    c = sn = math.sqrt(.5)
    for grow, mat, dz in ((.07, dark, 0), (0, light, .035)):
        for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            ox, oy = dx * (s / 2 + g / 2), dy * (s / 2 + g / 2)
            put(smooth(box(s + grow, s + grow, .06, (ox * c - oy * sn, ox * sn + oy * c, z + dz), math.radians(45)), .035), mat)


def b1_rare():
    body = toy('rBody', '#1d4fd8')
    rim = toy('rRim', '#7fd0ff')
    face = toy('rFace', '#2f5df0', .6, .2)
    gold = toy('rGold', '#ffd23a', .22)
    dark = toy('rDark', '#b8620a')
    chunky(body, rim, face)
    z = .235
    put(smooth(star_mesh(.66, .31, .06, z), .035), dark)
    put(smooth(star_mesh(.56, .25, .09, z + .025), .04), gold)


def glow(name, hexcol, emit, strength=3.0):
    m = metal(name, hexcol, .1, 0.0)
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    h = emit.lstrip('#')
    b.inputs['Emission Color'].default_value = (*srgb(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))), 1)
    b.inputs['Emission Strength'].default_value = strength
    return m


def premium_base(body_m, rim_m, field_m, line_m):
    """a heavy realistic coin with a smooth edge, a polished rim, a band of inlaid mosaic tiles, a mirror field"""
    put(smooth(cyl(1.0, .2, 0), .03), body_m)
    put(torus(.955, .04, .105), rim_m)
    n = 44
    for i in range(n):
        a = i / n * math.tau
        put(smooth(box(.085, .105, .03, (math.cos(a) * .875, math.sin(a) * .875, .106), a + math.pi / 2), .008), rim_m if i % 2 == 0 else line_m)
    put(smooth(cyl(.8, .03, .095), .006), field_m)
    put(torus(.765, .013, .112), line_m)
    for i in range(96):
        a = i / 96 * math.tau
        put(smooth(box(.045, .008, .012, (math.cos(a) * .705, math.sin(a) * .705, .112), a)), line_m)


def c_main():
    satin = metal('cSatin', '#c98f1f', .34)
    polish = metal('cPolish', '#ffd36a', .1)
    mirror = metal('cMirror', '#e9a92c', .24)
    premium_base(satin, polish, mirror, satin)
    z = .15
    s, g = .31, .03
    c = sn = math.sqrt(.5)
    for (dx, dy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        ox, oy = dx * (s / 2 + g / 2), dy * (s / 2 + g / 2)
        pos = (ox * c - oy * sn, ox * sn + oy * c)
        put(smooth(box(s, s, .06, (pos[0], pos[1], z), math.radians(45)), .014), polish)
        put(smooth(box(s * .62, s * .62, .07, (pos[0], pos[1], z + .005), math.radians(45)), .01), satin)


def c_rare():
    obs = metal('oObs', '#07080d', .08, .35)
    plat = metal('oPlat', '#e2e6ee', .14)
    field = metal('oField', '#0b0f22', .18, .6)
    line = metal('oLine', '#9aa3b5', .3)
    premium_base(obs, plat, field, line)
    z = .13
    put(smooth(star_mesh(.62, .27, .045, z), .01), plat)
    put(facet_star(.56, .24, .11, z + .02), glow('oGem', '#3fb4ff', '#1f8cff', 1.1))


def poly(pts, depth, z, m, bevel=.012):
    """a flat shape from its outline (counter-clockwise), extruded"""
    import bmesh
    me = bpy.data.meshes.new('Poly')
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, -depth / 2)) for x, y in pts]
    f = bm.faces.new(vs)
    r2 = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=(0, 0, depth), verts=[v for v in r2['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Poly', me)
    bpy.context.scene.collection.objects.link(o)
    o.location = (0, 0, z)
    bpy.context.view_layer.objects.active = o
    return put(smooth(o, bevel), m)


def arc(cx, cy, r, a0, a1, n=24):
    return [(cx + math.cos(math.radians(a0 + (a1 - a0) * k / n)) * r, cy + math.sin(math.radians(a0 + (a1 - a0) * k / n)) * r) for k in range(n + 1)]


def d_base(body_m, rim_m, field_m, line_m):
    """a smooth heavy coin: soft edge, one wide polished rim, a satin field, one fine ring"""
    put(smooth(cyl(1.0, .2, 0), .05), body_m)
    put(torus(.92, .07, .1), rim_m)
    put(smooth(cyl(.84, .03, .09), .006), field_m)
    put(torus(.74, .014, .112), line_m)


def plateau(R, r, h, z, rot=45):
    """a square tile cut like a gem: sloped sides and a flat top, so every side catches the light differently"""
    import bmesh
    me = bpy.data.meshes.new('Plateau')
    bm = bmesh.new()
    def sq(rad, zz):
        return [bm.verts.new((math.cos(math.radians(rot + 90 * i)) * rad, math.sin(math.radians(rot + 90 * i)) * rad, zz)) for i in range(4)]
    lo, hi = sq(R, 0), sq(r, h)
    for i in range(4):
        bm.faces.new((lo[i], lo[(i + 1) % 4], hi[(i + 1) % 4], hi[i]))
    bm.faces.new(hi)
    bm.faces.new(list(reversed(lo)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Plateau', me)
    bpy.context.scene.collection.objects.link(o)
    o.location = (0, 0, z)
    bpy.context.view_layer.objects.active = o
    return o


def d_main():
    body = metal('dBody', '#d9a02a', .3)
    rim = metal('dRim', '#ffd36a', .12)
    field = metal('dField', '#c98f1f', .4)
    line = metal('dLine', '#a86a12', .38)
    tile = metal('dTile', '#ffe08a', .14)
    top = metal('dTop', '#e8b037', .3)
    d_base(body, rim, field, line)
    z = .115
    put(plateau(.66, .5, .06, z), tile)
    put(plateau(.4, .27, .05, z + .06), tile)
    put(smooth(cyl(.12, .05, z + .13), .01), top)


def d_rare():
    body = metal('eBody', '#090b12', .1, .4)
    rim = metal('eRim', '#e2e6ee', .14)
    field = metal('eField', '#141a33', .3, .6)
    line = metal('eLine', '#9aa3b5', .3)
    d_base(body, rim, field, line)
    z = .125
    put(smooth(star_mesh(.66, .29, .05, z), .012), rim)
    put(facet_star(.58, .25, .12, z + .025), glow('eGem', '#3fb4ff', '#1f8cff', 1.1))


def jigsaw(size, depth, z, m, rot=0.0, bevel=.012):
    """a jigsaw piece, the game's own motif: a square with a knob on top and on the right, a socket on the left and below"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    o = bpy.context.object
    o.scale = (size, size, depth)
    bpy.ops.object.transform_apply(scale=True)
    r, off = size * .17, size * .5 + size * .1
    def op(kind, x, y):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=depth * 1.6, location=(x, y, 0))
        c = bpy.context.object
        md = o.modifiers.new(kind, 'BOOLEAN')
        md.operation = 'UNION' if kind == 'knob' else 'DIFFERENCE'
        md.object = c
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=md.name)
        bpy.data.objects.remove(c)
    op('knob', 0, off)
    op('knob', off, 0)
    op('socket', -size * .5, 0)
    op('socket', 0, -size * .5)
    o.rotation_euler = (0, 0, math.radians(rot))
    o.location = (0, 0, z)
    put(o, m)
    md = o.modifiers.new('Bevel', 'BEVEL')
    md.width, md.segments = bevel, 3
    md.harden_normals = False
    return o


def e_main():
    body = metal('fBody', '#d9a02a', .3)
    rim = metal('fRim', '#ffd36a', .12)
    field = metal('fField', '#b87a16', .42)
    line = metal('fLine', '#8f5a0e', .4)
    piece = metal('fPiece', '#ffe08a', .13)
    d_base(body, rim, field, line)
    put(jigsaw(.78, .07, .125, piece, 12), piece)


def e_rare():
    body = metal('gBody', '#090b12', .1, .4)
    rim = metal('gRim', '#e2e6ee', .14)
    field = metal('gField', '#161c38', .3, .6)
    line = metal('gLine', '#9aa3b5', .3)
    piece = metal('gPiece', '#dfe5f2', .13)
    d_base(body, rim, field, line)
    put(jigsaw(.78, .07, .125, piece, 12), piece)
    put(facet_star(.2, .09, .06, .165), glow('gGem', '#3fb4ff', '#1f8cff', 1.2))


FONTS = os.path.join(ROOT, 'build', 'fonts')


def font_path(name):
    """the game's own fonts as TTF (Blender cannot read WOFF2): scripts/coins-fonts.py makes them; falls back to the system serif"""
    for d in (FONTS, '/tmp/claude-0/-home-user-TileTopia/b86818da-678d-5c84-ba86-e608d1ab7449/scratchpad/fonts'):
        f = os.path.join(d, name)
        if os.path.exists(f):
            return f
    return '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'


def text(txt, font, size, z, m, depth=.035, loc=(0, 0), rot=0.0, spacing=1.0):
    cu = bpy.data.curves.new('T', 'FONT')
    cu.body = txt
    cu.font = bpy.data.fonts.load(font_path(font))
    cu.size = size
    cu.extrude = depth / 2
    cu.bevel_depth = .004
    cu.bevel_resolution = 2
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    cu.space_character = spacing
    o = bpy.data.objects.new('T', cu)
    bpy.context.scene.collection.objects.link(o)
    o.location = (loc[0], loc[1], z + depth / 2)
    o.rotation_euler = (0, 0, math.radians(rot))
    cu.materials.append(m)
    return o


def text_arc(txt, font, size, R, z, m, center=90.0, depth=.035, inward=False):
    """letters along a circle, each one measured and turned to stand on it"""
    objs = []
    for ch in txt:
        o = text(ch, font, size, z, m, depth)
        bpy.context.view_layer.update()
        objs.append((o, o.dimensions.x))
    gap = size * .22
    total = sum(w for _, w in objs) + gap * (len(objs) - 1)
    pos = -total / 2
    for o, w in objs:
        mid = pos + w / 2
        pos += w + gap
        a = math.radians(center) - mid / R if not inward else math.radians(center) + mid / R
        o.location.x, o.location.y = math.cos(a) * R, math.sin(a) * R
        o.rotation_euler = (0, 0, a - math.pi / 2 if not inward else a + math.pi / 2)


def engrave(field, objs):
    """cut the shapes into the field, one boolean for each (joined cutters tore the surface)"""
    bpy.context.view_layer.update()  # a new text has no geometry until the scene is evaluated
    for o in objs:
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        if o.type in ('CURVE', 'FONT'):
            bpy.ops.object.convert(target='MESH')
        cutter = bpy.context.view_layer.objects.active
        import bmesh
        bm = bmesh.new()
        bm.from_mesh(cutter.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(cutter.data)
        bm.free()
        cutter.data.update()
        md = field.modifiers.new('Engrave', 'BOOLEAN')
        md.operation = 'DIFFERENCE'
        md.solver = 'EXACT'
        md.use_hole_tolerant = True
        md.object = cutter
        bpy.context.view_layer.objects.active = field
        bpy.ops.object.modifier_apply(modifier=md.name)
        inlay = cutter.copy()
        inlay.data = cutter.data.copy()
        bpy.context.scene.collection.objects.link(inlay)
        inlay.data.materials.clear()
        inlay.data.materials.append(dark())
        inlay.scale = (1, 1, .375)
        inlay.location.z = .0675
        bpy.data.objects.remove(cutter)
    for poly_ in field.data.polygons:
        poly_.use_smooth = False  # long triangles of the cut cap shade as shards when smooth


def g_base():
    """a gold coin made to be engraved: a body hollowed under the field, and a thick field the letters are cut deep into"""
    body = metal('gBody', '#d9a02a', .3)
    rim = metal('gRim', '#ffd36a', .12)
    field = metal('gField', '#e6aa33', .26)
    line = metal('gLine', '#a86a12', .38)
    b = put(smooth(cyl(1.0, .2, 0), .05), body)
    hole = cyl(.83, .5, 0, 128)
    md = b.modifiers.new('Hollow', 'BOOLEAN')
    md.operation = 'DIFFERENCE'
    md.object = hole
    bpy.context.view_layer.objects.active = b
    bpy.ops.object.modifier_apply(modifier='Hollow', single_user=True) if False else None
    for m_ in list(b.modifiers):
        if m_.name == 'Hollow':
            bpy.ops.object.modifier_apply(modifier='Hollow')
    bpy.data.objects.remove(hole)
    put(torus(.92, .07, .1), rim)
    f = put(cyl(.84, .21, 0), field)
    put(torus(.74, .014, .112), line)
    return f


def dark():
    return bpy.data.materials.get('gDark') or metal('gDark', '#6a3f06', .55)


def cutbar(w, h, loc, rot=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    o = bpy.context.object
    o.scale = (w, h, .12)
    bpy.ops.object.transform_apply(scale=True)
    o.rotation_euler = (0, 0, rot)
    o.location = (loc[0], loc[1], .105)
    o.data.materials.append(dark())
    return o


def g_line():
    f = g_base()
    engrave(f, [text('TILETOPIA', 'unbounded-800-latin.ttf', .3, .045, dark(), .12)])


def g_stack():
    f = g_base()
    m = dark()
    engrave(f, [text('TILE', 'unbounded-800-latin.ttf', .34, .045, m, .12, (0, .22)), text('TOPIA', 'unbounded-800-latin.ttf', .34, .045, m, .12, (0, -.2)), cutbar(1.0, .02, (0, .015))])


def g_ring():
    f = g_base()
    m = dark()
    arc = []
    for ch in 'TILETOPIA':
        arc.append(text(ch, 'unbounded-800-latin.ttf', .16, .045, m, .12))
    bpy.context.view_layer.update()
    gap = .16 * .22
    ws = [o.dimensions.x for o in arc]
    total = sum(ws) + gap * (len(ws) - 1)
    pos = -total / 2
    for o, w in zip(arc, ws):
        mid = pos + w / 2
        pos += w + gap
        a = math.radians(90) - mid / .6
        o.location.x, o.location.y = math.cos(a) * .6, math.sin(a) * .6
        o.rotation_euler = (0, 0, a - math.pi / 2)
    mono = text('T', 'unbounded-800-latin.ttf', .62, .045, m, .12, (0, -.1))
    dots = []
    for a in (-35, 0, 35):
        r = math.radians(270 + a)
        dots.append(cutbar(.07, .07, (math.cos(r) * .6, math.sin(r) * .6), r + math.pi / 4))
    engrave(f, arc + [mono] + dots)


def g_serif():
    f = g_base()
    m = dark()
    parts = [text('Tiletopia', 'DejaVuSerif-Bold.ttf', .3, .045, m, .12), cutbar(1.1, .012, (0, -.2)), cutbar(1.1, .012, (0, .22))]
    for sx in (-1, 1):
        parts.append(cutbar(.09, .09, (sx * .62, -.2), math.radians(45)))
    engrave(f, parts)


def arc_letters(txt, font, size, R, center, m, inward=False):
    """letters measured one by one and set on a circle: along the top (reads left to right) or along the bottom (inward)"""
    objs = [text(ch, font, size, .045, m, .12) for ch in txt]
    bpy.context.view_layer.update()
    gap = size * .22
    ws = [o.dimensions.x for o in objs]
    total = sum(ws) + gap * (len(ws) - 1)
    pos = -total / 2
    for o, w in zip(objs, ws):
        mid = pos + w / 2
        pos += w + gap
        a = math.radians(center) + (mid / R if inward else -mid / R)
        o.location.x, o.location.y = math.cos(a) * R, math.sin(a) * R
        o.rotation_euler = (0, 0, a + math.pi / 2 if inward else a - math.pi / 2)
    return objs


def h_jig():
    f = g_base()
    engrave(f, arc_letters('TILETOPIA', 'unbounded-800-latin.ttf', .15, .6, 90, dark()) + [jigsaw(.5, .12, .105, dark(), 10)])


def h_split():
    f = g_base()
    parts = arc_letters('TILE', 'unbounded-800-latin.ttf', .2, .58, 90, dark()) + arc_letters('TOPIA', 'unbounded-800-latin.ttf', .2, .58, 270, dark(), True)
    engrave(f, parts + [jigsaw(.36, .12, .105, dark(), 10)])


def h_onest():
    f = g_base()
    engrave(f, [text('Tiletopia', 'onest-700-latin.ttf', .3, .045, dark(), .12), cutbar(.95, .016, (0, .24)), cutbar(.95, .016, (0, -.22)), cutbar(.07, .07, (-.5, -.22), math.radians(45)), cutbar(.07, .07, (.5, -.22), math.radians(45))])


def h_stamp():
    f = g_base()
    m = dark()
    t = text('TILETOPIA', 'unbounded-800-latin.ttf', .27, .045, m, .12, (0, .06), 10)
    bar = cutbar(1.0, .03, (0, -.2), math.radians(10))
    engrave(f, [t, bar])


def round_bar(w, h, x, y):
    """the banner's underline: a short bar with round ends, as three cutters (the middle and two caps)"""
    objs = [cutbar(max(w - h, .001), h, (x, y))]
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=h / 2, depth=.12, location=(0, 0, 0))
        c = bpy.context.object
        c.location = (x + sx * (w - h) / 2, y, .105)
        c.data.materials.append(dark())
        objs.append(c)
    return objs


def i_logo(variant):
    """the name the way the project banner sets it: Unbounded ExtraBold, mixed case, a short round underline"""
    f = g_base()
    size = .34
    t = text('Tiletopia', 'unbounded-800-latin.ttf', size, .045, dark(), .12, (0, .08))
    bpy.context.view_layer.update()
    w = t.dimensions.x
    parts = [t]
    y = -.15
    if variant == 'banner':
        parts += round_bar(.34, .05, -w / 2 + .17, y)          # starts under the first letter, as on the banner
    elif variant == 'center':
        parts += round_bar(.34, .05, 0, y)
    else:
        parts += round_bar(w, .05, 0, y)                        # the line as wide as the name
        for dx in (-.16, 0, .16):
            parts.append(cutbar(.07, .07, (dx, y - .16), math.radians(45)))
    engrave(f, parts)


def i_banner():
    i_logo('banner')


def i_center():
    i_logo('center')


def i_wide():
    i_logo('wide')


CAM = []


def set_cam(*args):
    CAM[:] = [args]  # the scene is built after the model: main applies it


def apply_cam(el_deg, az_deg=-90, scale=2.35, target_z=0.0):
    co = bpy.context.scene.camera
    co.data.ortho_scale = scale
    el, az = math.radians(el_deg), math.radians(az_deg)
    tgt = Vector((0, 0, target_z))
    co.location = tgt + Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el))) * 8
    co.rotation_euler = (tgt - co.location).to_track_quat('-Z', 'Y').to_euler()


def glass(name, hexcol, ior=2.2):
    """a faceted stone as a glossy, softly glowing solid: real transmission tore holes through the facets, and a solid reads better small"""
    m = bpy.data.materials.new(name)
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    h = hexcol.lstrip('#')
    c = (*srgb(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))), 1)
    b.inputs['Base Color'].default_value = c
    b.inputs['Metallic'].default_value = .55
    b.inputs['Roughness'].default_value = .22
    for k in ('Coat Weight', 'Clearcoat'):
        if k in b.inputs:
            b.inputs[k].default_value = .6
            break
    b.inputs['Emission Color'].default_value = c
    b.inputs['Emission Strength'].default_value = 0.0
    return m


def gem_mesh(n, R, table, crown_h, pav_h, rot=0.0, square=False):
    """a cut stone: a girdle ring, a flat table above it, a pointed pavilion below"""
    import bmesh
    me = bpy.data.meshes.new('Gem')
    bm = bmesh.new()
    def ring(rad, z, off):
        out = []
        for i in range(n):
            a = rot + off + i / n * math.tau
            r = rad / max(abs(math.cos((a - rot - off) % (math.tau / n) - math.pi / n)) , 1) if square else rad
            out.append(bm.verts.new((math.cos(a) * rad, math.sin(a) * rad, z)))
        return out
    g = ring(R, 0, 0)
    t = ring(table, crown_h, math.pi / n)
    apex = bm.verts.new((0, 0, -pav_h))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((g[i], g[j], t[i]))
        bm.faces.new((t[i], g[j], t[j]))
        bm.faces.new((g[j], g[i], apex))
    bm.faces.new(list(reversed(t)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('Gem', me)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    return o


def gem_backdrop():
    """what the stone sees inside: a dark dome and a few bright cards, all hidden from the camera so the picture stays transparent"""
    def emit(name, col, strength):
        m = bpy.data.materials.new(name)
        nt = m.node_tree
        for n in list(nt.nodes):
            nt.nodes.remove(n)
        e = nt.nodes.new('ShaderNodeEmission')
        e.inputs['Color'].default_value = (*col, 1)
        e.inputs['Strength'].default_value = strength
        o = nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(e.outputs[0], o.inputs[0])
        return m
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=7, location=(0, 0, 0))
    d = bpy.context.object
    d.data.materials.append(emit('domeDark', (.02, .03, .06), 1.0))
    d.visible_camera = False
    import random
    rnd = random.Random(7)
    for i in range(9):
        a, e = rnd.uniform(0, math.tau), rnd.uniform(-.2, 1.2)
        loc = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))) * 5.5
        bpy.ops.mesh.primitive_plane_add(size=rnd.uniform(1.2, 2.6), location=loc)
        c = bpy.context.object
        c.rotation_euler = (-loc).to_track_quat('Z', 'Y').to_euler()
        c.data.materials.append(emit('card%d' % i, (1, 1, 1) if i % 3 else (.7, .85, 1), rnd.uniform(6, 14)))
        c.visible_camera = False


def j_gem_blue():
    put(gem_mesh(8, .78, .42, .3, .62), glass('gemBlue', '#1a86ff'))
    set_cam(32, -90, 2.2, 0)


def j_gem_green():
    put(gem_mesh(6, .8, .5, .26, .5, math.radians(30)), glass('gemGreen', '#10b866', 1.9))
    set_cam(32, -90, 2.2, 0)


def j_gem_violet():
    put(gem_mesh(12, .76, .34, .34, .7), glass('gemViolet', '#8a3fe0', 2.0))
    set_cam(30, -90, 2.2, 0)


def meeple(m, z=0.0):
    """the player's piece as in the board game: the flat silhouette (feet, waist, wide arms, neck) extruded, a round head on top"""
    pts = [(-.4, 0), (-.1, 0), (0, .14), (.1, 0), (.4, 0), (.3, .3), (.2, .42), (.58, .52), (.62, .74), (.18, .8), (.1, .86), (-.1, .86), (-.18, .8), (-.62, .74), (-.58, .52), (-.2, .42), (-.3, .3)]
    body = poly(pts, .34, 0, m, .05)
    body.rotation_euler = (math.pi / 2, 0, 0)
    body.location = (0, 0, z)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=.23, location=(0, 0, z + 1.0))
    put(smooth(bpy.context.object), m)


def j_meeple_gold():
    meeple(metal('mGold', '#f4b73f', .2))
    set_cam(18, -90, 2.5, .55)


def j_jigsaw_gold():
    put(jigsaw(1.1, .26, .13, metal('jGold', '#f4b73f', .2), 14, .035), metal('jGold2', '#f4b73f', .2))
    set_cam(48, -90, 2.4, .1)


MAKERS = {'tile': tile, 'star': star, 'tile2': tile2, 'tile3': tile3, 'star2': star2, 'star3': star3, 'hex_tile': hex_tile, 'road_tile': road_tile, 'hex_star': hex_star, 'spark_star': spark_star, 'p1_main': p1_main, 'p1_rare': p1_rare, 'p2_main': p2_main, 'p2_rare': p2_rare, 'b1_main': b1_main, 'b1_rare': b1_rare, 'c_main': c_main, 'c_rare': c_rare, 'd_main': d_main, 'd_rare': d_rare, 'e_main': e_main, 'e_rare': e_rare, 'g_line': g_line, 'g_stack': g_stack, 'g_ring': g_ring, 'g_serif': g_serif, 'h_jig': h_jig, 'h_split': h_split, 'h_onest': h_onest, 'h_stamp': h_stamp, 'i_banner': i_banner, 'i_center': i_center, 'i_wide': i_wide, 'j_gem_blue': j_gem_blue, 'j_gem_green': j_gem_green, 'j_gem_violet': j_gem_violet, 'j_meeple_gold': j_meeple_gold, 'j_jigsaw_gold': j_jigsaw_gold}


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


def studio(samples, size=512):
    """soft boxes against a dark room: metal shows crisp, long reflections instead of a flat sheen"""
    scene(samples, size)
    sc = bpy.context.scene
    for o in [o for o in sc.objects if o.type == 'LIGHT']:
        bpy.data.objects.remove(o)
    w = sc.world
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (.5, .46, .4, 1)
    bg.inputs['Strength'].default_value = .55
    for name, energy, sx, sy, col, loc in (('Key', 900, 3.2, 1.6, (1, .93, .8), (-3.0, -2.2, 3.4)), ('Strip', 520, 0.9, 4.5, (.75, .88, 1), (3.4, 0.6, 2.4)), ('Top', 260, 2.6, 2.6, (1, 1, 1), (0, -.6, 5.0)), ('Warm', 300, 2.0, 1.2, (1, .8, .55), (1.2, -3.6, 1.2))):
        L = bpy.data.lights.new(name, 'AREA')
        L.shape = 'RECTANGLE'
        L.energy, L.size, L.size_y, L.color = energy, sx, sy, col
        o = bpy.data.objects.new(name, L)
        sc.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, .05)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()


def main(argv):
    out = argv[argv.index('--out') + 1] if '--out' in argv else os.path.join(ROOT, 'build', 'coins')
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else KEYS
    samples = int(argv[argv.index('--samples') + 1]) if '--samples' in argv else 96
    os.makedirs(out, exist_ok=True)
    for key in only:
        bpy.ops.wm.read_homefile(use_empty=True)
        CAM.clear()
        MAKERS[key]()
        (studio if key.startswith(('c_', 'd_', 'e_', 'f_', 'g_', 'h_', 'i_', 'j_')) and not key.startswith('j_gem') else scene)(samples)
        if CAM:
            apply_cam(*CAM[0])
        bpy.context.scene.render.filepath = os.path.join(out, key + '.png')
        bpy.ops.render.render(write_still=True)
        print('COIN', key, flush=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
