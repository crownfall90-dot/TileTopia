"""Shop figurines: every playing figure (src/state/catalog.js FIGS) as a little chibi character, modelled here in
Blender: a big head with a face, a body, arms and legs, and a real costume (hats, helmets, hoods, robes, crowns, capes,
a bow, a staff, a sword and shield). Rendered for the shop: build/figs/<key>.png, packed by scripts/figs-pack.py.

    blender -b -P tools/blender_generators/generate_figurines.py -- [--only knight,queen] [--out build/figs] [--samples 96]
"""
import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector, Matrix, Euler

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FIGS = ['classic', 'peasant', 'monk', 'knight', 'archer', 'wizard', 'ninja', 'paladin', 'king', 'queen']
MATS = {}


def srgb(c):
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c)


def mat(col, rough=.55, metal=0.0, emit=0.0, coat=0.0, name=None):
    key = name or (col, rough, metal, emit, coat)
    if key in MATS:
        return MATS[key]
    m = bpy.data.materials.new(str(key))
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    h = col.lstrip('#')
    c = (*srgb(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))), 1)
    b.inputs['Base Color'].default_value = c
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if coat:
        b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = c
        b.inputs['Emission Strength'].default_value = emit
    MATS[key] = m
    return m


def finish(o, m, sub=2, smooth=True):
    o.data.materials.clear()
    o.data.materials.append(m)
    if sub:
        md = o.modifiers.new('sub', 'SUBSURF')
        md.levels = md.render_levels = sub
    if smooth:
        for p in o.data.polygons:
            p.use_smooth = True
    return o


def ball(c, r, m, s=(1, 1, 1), rot=(0, 0, 0)):
    """A smooth ellipsoid: radius r scaled by s, centred at c."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=c, segments=32, ring_count=16)
    o = bpy.context.active_object
    o.scale = s
    o.rotation_euler = rot
    return finish(o, m, sub=0)


def rbox(c, size, m, rot=(0, 0, 0), sub=2, bevel=.25):
    """A soft rounded box (cube with bevel + subdivision): the toy look of bodies, robes and armour."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=c)
    o = bpy.context.active_object
    o.scale = size
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new('bev', 'BEVEL')
        md.width = min(size) * bevel
        md.segments = 3
    return finish(o, m, sub=sub)


def cyl(c, r1, r2, h, m, rot=(0, 0, 0), seg=32, sub=0, bevel=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r1, radius2=r2, depth=h, location=c, rotation=rot)
    o = bpy.context.active_object
    if bevel:
        md = o.modifiers.new('bev', 'BEVEL')
        md.width = bevel
        md.segments = 3
    return finish(o, m, sub=sub)


def ring(c, R, r, m, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=c, rotation=rot, major_segments=48, minor_segments=12)
    o = bpy.context.active_object
    o.scale = scale
    return finish(o, m, sub=0)


def limb(a, b, r, m):
    """A capsule from point a to point b."""
    a, b = Vector(a), Vector(b)
    d = b - a
    o = cyl((a + b) / 2, r, r, d.length, m, seg=24)
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    ball(a, r, m)
    ball(b, r, m)
    return o


# ---------------------------------------------------------------- the body every character shares
SKIN = '#f1c6a0'
HEAD = Vector((0, 0, 1.18))   # head centre; the figure stands on z = 0, about 1.6 tall


def body(tunic, legs='#4a3a2e', boots='#3a2a20', skin=SKIN, face=True, arms=True, pose=0.0):
    """Legs with boots, a round tunic, arms with hands, a big head with eyes, brows, cheeks and a smile."""
    for s in (-1, 1):
        limb((s * .13, 0, .12), (s * .12, 0, .36), .085, mat(legs, .7))
        rbox((s * .13, -.04, .06), (.17, .24, .12), mat(boots, .6))
    rbox((0, 0, .58), (.52, .4, .5), mat(tunic, .6), bevel=.4)
    if arms:
        for s in (-1, 1):
            sw = pose if s > 0 else 0
            limb((s * .27, 0, .74), (s * .42, -.04 - sw * .2, .5 + sw * .25), .07, mat(tunic, .6))
            ball((s * .45, -.05 - sw * .22, .46 + sw * .27), .075, mat(skin, .55))
    ball(HEAD, .36, mat(skin, .5), s=(1, .95, .95))
    if face:
        for s in (-1, 1):
            ball((s * .12, -.31, 1.2), .05, mat('#1b1410', .15, coat=1.0), s=(.85, .5, 1.15))
            ball((s * .12 + .015, -.345, 1.225), .014, mat('#ffffff', .2, emit=1.0))
            ball((s * .2, -.27, 1.09), .05, mat('#ff8f8f', .7), s=(1, .4, .7))
            cyl((s * .12, -.31, 1.29), .045, .045, .016, mat('#5a3a22', .7), rot=(0, math.pi / 2, s * .25))
        ring((0, -.32, 1.07), .055, .012, mat('#7a3a2a', .6), rot=(math.pi / 2, 0, 0), scale=(1, 1, .5))
    ball((0, -.335, 1.14), .035, mat(skin, .5), s=(1, .7, .8))   # nose


# ---------------------------------------------------------------- costumes
RED = '#e0453f'   # the default player colour of the shop preview


def classic():
    body(RED)
    for s in (-1, 1):
        ball((s * .14, .05, 1.5), .16, mat('#6b4426', .8), s=(1.2, 1, .7))
    ball((0, .12, 1.42), .3, mat('#6b4426', .8), s=(1.15, .9, .75))
    ring((0, 0, .45), .265, .03, mat('#5a3a22', .6), scale=(1, .78, 1))


def peasant():
    body('#7aa24a', legs='#6b4a2e')
    rbox((0, -.02, .5), (.5, .42, .3), mat('#8a6a42', .8), bevel=.3)   # overalls
    cyl((0, 0, 1.47), .5, .5, .035, mat('#e8c45a', .85), bevel=.012)
    cyl((0, 0, 1.56), .25, .2, .18, mat('#d9ae3f', .85), bevel=.02)
    cyl((0, 0, 1.52), .255, .255, .05, mat(RED, .6))
    cyl((.5, -.08, .55), .02, .02, 1.05, mat('#8a5a2e', .7))   # pitchfork
    for dx in (-.05, 0, .05):
        cyl((.5 + dx, -.08, 1.13), .012, .006, .16, mat('#9aa3ab', .3, metal=.8))


def monk():
    robe = mat('#7a5230', .9)
    cyl((0, 0, .45), .4, .26, .9, robe, sub=1)
    body('#7a5230', face=True)
    ball((0, .17, 1.25), .4, robe, s=(1.05, 1.0, 1.02))          # the hood, behind the face
    ball((0, -.04, 1.18), .37, mat(SKIN, .5), s=(.95, .9, .95))
    for s in (-1, 1):
        ball((s * .12, -.31, 1.2), .05, mat('#1b1410', .15, coat=1.0), s=(.85, .5, 1.15))
        ball((s * .12 + .015, -.345, 1.225), .014, mat('#ffffff', .2, emit=1.0))
    ring((0, 0, .62), .3, .025, mat('#d8c08a', .9), scale=(1, .8, 1))
    cyl((.13, -.26, .45), .018, .018, .3, mat('#d8c08a', .9))
    cyl((-.45, -.05, .62), .025, .025, 1.1, mat('#8a5a2e', .7))  # a staff


def knight():
    steel, dark = mat('#cfd6de', .25, metal=.9), mat('#3a4048', .4, metal=.6)
    body('#cfd6de', legs='#9aa3ab', boots='#5a6068', face=False)
    rbox((0, -.02, .6), (.56, .44, .46), steel, bevel=.4)
    for s in (-1, 1):
        ball((s * .3, 0, .82), .13, steel, s=(1, 1, .8))
    ball(HEAD, .38, steel, s=(1, .97, 1))
    rbox((0, -.33, 1.18), (.42, .06, .12), dark, bevel=.4)       # the visor slit
    for s in (-1, 1):
        ball((s * .1, -.36, 1.18), .03, mat('#ffe7a8', .3, emit=1.5))
    ball((0, .05, 1.62), .09, mat('#d63b2f', .7), s=(.6, 2.2, 1.2))
    cyl((.47, -.12, .75), .03, .03, .95, steel, rot=(0, 0, 0))  # sword
    rbox((.47, -.12, .3), (.2, .05, .04), mat('#f2c14e', .25, metal=.9))
    rbox((-.5, -.1, .55), (.08, .42, .5), mat('#c0392b', .5), bevel=.3)   # shield
    rbox((-.55, -.1, .55), (.04, .1, .3), mat('#f2c14e', .25, metal=.9))


def archer():
    body('#3f8f4a', legs='#5a4630')
    cyl((0, .02, 1.45), .37, .05, .5, mat('#2f7a3a', .7), rot=(-.3, -.15, 0))
    ball((.25, .05, 1.55), .05, mat('#f2e6c8', .6), s=(3.5, .6, .7), rot=(0, -.6, 0))
    cyl((0, .28, .78), .1, .1, .45, mat('#8a5a2e', .7), rot=(.25, 0, 0))   # quiver
    for dx in (-.04, .03):
        cyl((dx, .31, 1.06), .012, .012, .25, mat('#e8d6b0', .6), rot=(.25, 0, 0))
        cyl((dx, .33, 1.2), .035, .0, .07, mat('#d63b2f', .6), rot=(.25, 0, 0))
    ring((.5, -.1, .62), .4, .022, mat('#8a5a2e', .6), rot=(0, math.pi / 2, 0), scale=(1, .45, 1))   # bow
    cyl((.5, -.1, .62), .006, .006, .8, mat('#f2e6c8', .6))


def wizard():
    robe = mat('#5b2d86', .6)
    cyl((0, 0, .42), .42, .26, .84, robe, sub=1)
    body('#5b2d86')
    ball((0, -.28, .98), .2, mat('#f2f2f2', .8), s=(1, .6, 1.4))   # beard
    cyl((0, 0, 1.47), .48, .46, .04, robe, bevel=.01)
    cyl((0, .03, 1.72), .32, .0, .55, robe, rot=(.25, 0, 0))
    for p in ((.1, -.2, 1.65), (-.12, -.15, 1.55)):
        ball(p, .035, mat('#ffd54f', .3, emit=2.0))
    cyl((.5, -.06, .75), .025, .022, 1.5, mat('#7a4f2d', .7))
    ball((.5, -.06, 1.55), .1, mat('#38e1ff', .05, emit=3.0))


def ninja():
    blk = mat('#1c202a', .55)
    body('#1c202a', legs='#1c202a', boots='#101318')
    ball(HEAD, .375, blk, s=(1, .97, 1))
    rbox((0, -.3, 1.2), (.42, .08, .14), mat(SKIN, .5), bevel=.4)   # the eye opening
    for s in (-1, 1):
        ball((s * .1, -.35, 1.2), .045, mat('#1b1410', .15, coat=1.0), s=(.9, .5, .8))
        ball((s * .1 + .015, -.38, 1.215), .012, mat('#ffffff', .2, emit=1.0))
    ring((0, 0, 1.32), .37, .03, mat('#e53935', .6))
    ball((.15, .4, 1.3), .05, mat('#e53935', .6), s=(1, 3, .5), rot=(.3, 0, 0))
    ring((0, -.01, .5), .28, .03, mat('#e53935', .6), scale=(1, .8, 1))
    cyl((-.1, .26, .85), .025, .025, .9, mat('#3a3a3a', .4, metal=.5), rot=(0, .8, 0))   # katana on the back
    cyl((-.38, .26, 1.15), .03, .03, .2, mat('#8a2a2a', .6), rot=(0, .8, 0))


def paladin():
    steel, gold = mat('#eef2f6', .25, metal=.75), mat('#f2c14e', .2, metal=1.0)
    rbox((0, .2, .6), (.6, .05, .8), mat('#2f5fb8', .6), bevel=.3)   # cape
    body('#eef2f6', legs='#c8d0d8', boots='#8a6a3a', face=True)
    rbox((0, -.02, .6), (.56, .44, .46), steel, bevel=.4)
    rbox((0, -.24, .62), (.06, .02, .3), gold)
    rbox((0, -.24, .68), (.22, .02, .06), gold)
    for s in (-1, 1):
        ball((s * .3, 0, .82), .13, steel, s=(1, 1, .8))
    ball((0, .03, 1.27), .38, steel, s=(1, .97, .8))                 # the open helmet over the face
    cyl((0, -.05, 1.62), .04, .04, .16, gold)
    rbox((-.5, -.12, .55), (.08, .46, .54), mat('#f4f6f8', .4), bevel=.3)
    rbox((-.55, -.12, .55), (.04, .08, .4), gold)
    rbox((-.55, -.12, .62), (.04, .3, .08), gold)
    cyl((.47, -.12, .7), .03, .03, .8, mat('#8a5a2e', .6))          # a hammer
    rbox((.47, -.12, 1.1), (.22, .14, .14), steel, bevel=.2)


def crown(z=1.5, r=.25):
    gold = mat('#f2c14e', .2, metal=1.0)
    cyl((0, 0, z), r, r * 1.05, .1, gold)
    for k in range(6):
        a = k / 6 * 2 * math.pi
        cyl((math.cos(a) * r * .95, math.sin(a) * r * .95, z + .1), .05, .0, .14, gold, seg=12)
        ball((math.cos(a) * r * 1.03, math.sin(a) * r * 1.03, z), .03, mat('#d6303f', .1, coat=1.0))


def king():
    robe = mat('#a32638', .6)
    rbox((0, .16, .55), (.7, .1, .9), robe, bevel=.3)
    body('#a32638', legs='#5a2a2a')
    ring((0, -.01, .82), .27, .07, mat('#f4f1ea', .9), scale=(1, .8, .6))
    ball((0, -.27, .98), .2, mat('#8a5a2e', .8), s=(1, .6, 1.2))     # beard
    crown(1.5, .26)
    cyl((.47, -.1, .75), .025, .025, .9, mat('#f2c14e', .2, metal=1.0))
    ball((.47, -.1, 1.22), .06, mat('#38e1ff', .05, emit=1.5))


def queen():
    gown = mat('#8a3fb5', .55)
    cyl((0, 0, .4), .5, .24, .8, gown, sub=1)
    body('#8a3fb5', legs='#8a3fb5', boots='#8a3fb5')
    hair = mat('#e0b040', .6)
    ball((0, .08, 1.24), .4, hair, s=(1.05, 1, 1.02))
    ball((0, .28, .95), .25, hair, s=(1.2, .6, 1.4))
    ball((0, -.03, 1.18), .36, mat(SKIN, .5), s=(.97, .93, .95))
    for s in (-1, 1):
        ball((s * .12, -.31, 1.2), .05, mat('#1b1410', .15, coat=1.0), s=(.85, .5, 1.15))
        ball((s * .12 + .015, -.345, 1.225), .014, mat('#ffffff', .2, emit=1.0))
        ball((s * .2, -.27, 1.09), .05, mat('#ff8f8f', .7), s=(1, .4, .7))
    ring((0, -.32, 1.07), .05, .012, mat('#c0392b', .5), rot=(math.pi / 2, 0, 0), scale=(1, 1, .5))
    crown(1.5, .22)
    ring((0, 0, .72), .27, .03, mat('#f2c14e', .2, metal=1.0), scale=(1, .8, 1))


COSTUMES = {k: globals()[k] for k in FIGS}


def scene(samples):
    sc = bpy.context.scene
    try:
        sc.render.engine = 'CYCLES'
    except TypeError:
        pass
    try:
        pref = bpy.context.preferences.addons['cycles'].preferences
        for dev in ('OPTIX', 'CUDA'):
            try:
                pref.compute_device_type = dev
                pref.get_devices()
                if any(d.type == dev for d in pref.devices):
                    for d in pref.devices:
                        d.use = d.type == dev
                    sc.cycles.device = 'GPU'
                    break
            except Exception:
                continue
    except Exception:
        pass
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = 400, 500
    sc.view_settings.view_transform = 'Standard'
    w = sc.world or bpy.data.worlds.new('W')
    sc.world = w
    bg = next((n for n in w.node_tree.nodes if n.type == 'BACKGROUND'), None)
    if bg:
        bg.inputs['Color'].default_value = (0.8, 0.82, 0.92, 1)
        bg.inputs['Strength'].default_value = 0.8
    for name, energy, size, col, loc in (('Key', 220, 2.5, (1, .93, .84), (-2.4, -3.0, 3.2)), ('Rim', 160, 2, (.7, .82, 1), (2.6, 2.4, 2.6)), ('Fill', 60, 3, (1, 1, 1), (3, -2.5, 1.0))):
        L = bpy.data.lights.new(name, 'AREA'); L.energy = energy; L.size = size; L.color = col
        o = bpy.data.objects.new(name, L); sc.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, .8)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.cameras.new('Cam'); cam.type = 'ORTHO'; cam.ortho_scale = 2.3
    co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co)
    target = Vector((0, 0, .86))
    az, el = math.radians(-68), math.radians(12)
    co.location = target + Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el))) * 8
    co.rotation_euler = (target - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co


def main(argv):
    out = argv[argv.index('--out') + 1] if '--out' in argv else os.path.join(ROOT, 'build', 'figs')
    only = argv[argv.index('--only') + 1].split(',') if '--only' in argv else FIGS
    samples = int(argv[argv.index('--samples') + 1]) if '--samples' in argv else 96
    os.makedirs(out, exist_ok=True)
    for key in only:
        bpy.ops.wm.read_homefile(use_empty=True)
        MATS.clear()
        COSTUMES[key]()
        scene(samples)
        bpy.context.scene.render.filepath = os.path.join(out, key + '.png')
        bpy.ops.render.render(write_still=True)
        print('FIG', key, flush=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
