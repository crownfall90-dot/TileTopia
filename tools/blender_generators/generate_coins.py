"""The two coins of the game, modelled and rendered in Blender.

  ducat  - the main coin (earned in games, quests, rewards): a gold coin with a mosaic tile of four pieces on it.
  lunar  - the rare coin (top achievements, rare goods): a moon-violet coin with a crescent and a star.

Output: build/coins/<key>.png (transparent, 512x512), packed to WebP by scripts/coins-pack.py.

    python3 tools/blender_generators/generate_coins.py [--only ducat] [--out build/coins] [--samples 96]
    (needs the `bpy` module: pip install bpy; or run it inside Blender: blender -b -P <this file> -- ...)
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
KEYS = ['ducat', 'lunar']


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


def ducat():
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


def lunar():
    face = metal('lunarFace', '#3a2a86', .24)
    rim = metal('lunarRim', '#a9b8ff', .2)
    moon = metal('lunarMoon', '#d9d2ff', .3, .6)
    star = metal('lunarStar', '#ffd978', .2)
    body(face, rim, .09)
    beads(28, .8, .03, .1, rim)
    z = .115
    # a crescent: a disc minus a shifted disc
    a = cyl(.56, .07, z, 96)
    b = cyl(.47, .2, z, 96)
    b.location = (.22, .14, z)
    mod = a.modifiers.new('Cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = b
    bpy.context.view_layer.objects.active = a
    bpy.ops.object.modifier_apply(modifier='Cut')
    bpy.data.objects.remove(b)
    a.location = (-.14, -.07, z)
    put(smooth(a, .012), moon)
    # a four-point star
    for rot in (0, math.pi / 2):
        bpy.ops.mesh.primitive_cylinder_add(vertices=4, radius=1, depth=.07, location=(.36, .3, z + .005), rotation=(0, 0, rot))
        d = bpy.context.object
        d.scale = (.075, .30, 1)
        bpy.ops.object.transform_apply(scale=True)
        put(smooth(d, .008), star)


MAKERS = {'ducat': ducat, 'lunar': lunar}


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
