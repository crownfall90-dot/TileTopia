"""Tiletopia app icon: three hexagonal diorama tiles, joined by a road and a river, one for each of three players.

    blender -b -P tools/blender_generators/generate_app_icon.py -- [--out store/src/icon-3tiles-1024.png] [--samples 160]

Red player: a castle with red banners. Blue: the river with a stone arch bridge (the river falls off the tile's edge,
as in the game). Yellow: a village with a chapel. The road leaves the castle gate, crosses the bridge and reaches the
village; each player's figure (meeple) stands on their tile. Look: the reference icon (store/icon-512.png) — thick
stone-rimmed hexes, warm light, a deep blue backdrop (composited afterwards, see scripts/icon-compose.py).
"""
import bpy
import bmesh
import math
import os
import sys
import random
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
R = 1.0                 # hex radius (flat-top)
TOP = .36               # rim top
GRASS = .33             # grass top
PLAYERS = {'red': (0.80, 0.05, 0.03), 'blue': (0.03, 0.20, 0.85), 'yellow': (1.0, 0.55, 0.0)}   # linear
rnd = random.Random(7)
HEXROT = math.pi / 6    # the cone's corners start at 30 deg; a flat-top hex needs them at 0 deg, or the tiles do not meet


def srgb(c):
    return tuple(((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in c)


def hexcol(h):
    h = h.lstrip('#')
    return srgb(tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)))


# ---------------------------------------------------------------- materials
MATS = {}


def mat(name, col, rough=.6, col2=None, scale=8.0, metal=0.0, emit=0.0, spec=.5):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    c1 = (*hexcol(col), 1)
    if col2:
        nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = scale
        nz.inputs['Detail'].default_value = 6
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = c1
        ramp.color_ramp.elements[1].color = (*hexcol(col2), 1)
        ramp.color_ramp.elements[0].position = .35
        ramp.color_ramp.elements[1].position = .7
        nt.links.new(nz.outputs['Fac'], ramp.inputs['Fac'])
        nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
        bump = nt.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .4
        nt.links.new(nz.outputs['Fac'], bump.inputs['Height'])
        nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    else:
        b.inputs['Base Color'].default_value = c1
    if emit:
        b.inputs['Emission Color'].default_value = c1
        b.inputs['Emission Strength'].default_value = emit
    MATS[name] = m
    return m


def materials():
    mat('stone_rim', '#ead6ad', .7, '#b39a72', 11)
    mat('wood_base', '#8a5a33', .7, '#6f4426', 6)
    mat('grass', '#47ad2a', .8, '#2f8a1f', 5)
    mat('grass_light', '#79cc36', .8, '#55b02a', 5)
    mat('water', '#26d6cf', .04, None, emit=.25, spec=.9)
    mat('water_deep', '#0b9cb8', .04, None, spec=.9)
    mat('foam', '#f4fdff', .4)
    mat('cobble', '#dcc9a2', .85, '#9a8562', 26)
    mat('stone', '#cbbfa8', .8, '#a4977f', 10)
    mat('stone_dark', '#9b907e', .85, '#7c725f', 10)
    mat('roof', '#d9542a', .5, '#a8361b', 18)
    mat('roof_dark', '#9b3d26', .6)
    mat('plaster', '#f1e6cc', .8, '#dccdaa', 9)
    mat('timber', '#6b4426', .7)
    mat('door', '#5a3a22', .7)
    mat('window', '#ffd36a', .4, emit=1.2)
    mat('leaf', '#45a832', .7, '#2c8424', 6)
    mat('leaf_dark', '#1f6b2a', .7, '#17531f', 6)
    mat('trunk', '#7a4f2d', .8)
    mat('gold', '#f2c14e', .25, metal=.9)
    mat('rock', '#a7a297', .85, '#8a857a', 9)
    for k, c in PLAYERS.items():
        m = bpy.data.materials.new('player_' + k)
        b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        b.inputs['Base Color'].default_value = (*c, 1)
        b.inputs['Roughness'].default_value = .35
        b.inputs['Coat Weight'].default_value = .4
        MATS['player_' + k] = m


# ---------------------------------------------------------------- helpers
def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def from_bm(bm, name, material, smooth=False, bevel=0.0, segs=2):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me))
    obj.data.materials.append(MATS[material] if isinstance(material, str) else material)
    for p in me.polygons:
        p.use_smooth = smooth
    if bevel:
        m = obj.modifiers.new('bevel', 'BEVEL')
        m.width = bevel
        m.segments = segs
        m.limit_method = 'ANGLE'
    return obj


def prism(c, r, h, seg, material, name, z0=0.0, rot=0.0, bevel=0.0, r2=None, smooth=False):
    bm = bmesh.new()
    M = Matrix.Translation(Vector((c[0], c[1], z0 + h / 2))) @ Matrix.Rotation(rot, 4, 'Z')
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=M)
    return from_bm(bm, name, material, smooth=smooth, bevel=bevel)


def box(c, size, material, name, rot=0.0, bevel=.012):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    M = Matrix.Translation(Vector(c) + Vector((0, 0, size[2] / 2))) @ Matrix.Rotation(rot, 4, 'Z')
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return from_bm(bm, name, material, bevel=bevel)


def blob(c, r, material, name, sz=1.0, sub=2, jitter=.0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    for v in bm.verts:
        n = v.co.normalized()
        v.co = Vector((v.co.x, v.co.y, v.co.z * sz)) + n * (rnd.random() - .5) * jitter * r
        v.co += Vector(c)
    return from_bm(bm, name, material, smooth=True)


def gable_roof(c, w, d, h, rot, material, name, over=.03):
    """A gabled roof: ridge along w."""
    x, y, z = c
    Rm = Matrix.Rotation(rot, 3, 'Z')
    P = lambda a, b, cz: Vector((x, y, z)) + Rm @ Vector((a, b, cz))
    ow, od = w / 2 + over, d / 2 + over
    bm = bmesh.new()
    vs = [bm.verts.new(P(*q)) for q in ((-ow, -od, 0), (ow, -od, 0), (ow, od, 0), (-ow, od, 0), (-ow, 0, h), (ow, 0, h))]
    for f in ((0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)):
        bm.faces.new([vs[i] for i in f])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=.025)
    return from_bm(bm, name, material, bevel=.008)


def ribbon(pts, width, z, material, name, thick=.04, lanes=1):
    """A strip along a path (roads, the water), solidified downwards."""
    bm = bmesh.new()
    prev = None
    for k, p in enumerate(pts):
        a = pts[max(k - 1, 0)]
        b = pts[min(k + 1, len(pts) - 1)]
        t = (b - a).normalized()
        n = Vector((-t.y, t.x))
        row = [bm.verts.new((*(p + n * width * (.5 - i / lanes)), z)) for i in range(lanes + 1)]
        if prev:
            for i in range(lanes):
                bm.faces.new([prev[i], prev[i + 1], row[i + 1], row[i]])
        prev = row
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0:
            f.normal_flip()
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=-thick)
    return from_bm(bm, name, material, smooth=False)


def bez(p0, p1, p2, p3, n=24):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append(u ** 3 * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t ** 3 * p3)
    return out


def hex_dir(deg):
    return Vector((math.cos(math.radians(deg)), math.sin(math.radians(deg))))


def edge_mid(c, deg):
    """Middle of the edge of a flat-top hex centred at c, facing direction deg (30, 90, 150 ...)."""
    return Vector(c) + hex_dir(deg) * (R * math.sqrt(3) / 2)


# ---------------------------------------------------------------- the tile
def hex_tile(c, name):
    # wooden underlayer, the thick stone rim, the grass inside it
    prism(c, R * .93, .08, 6, 'wood_base', name + '_wood', z0=-.02, bevel=.02, rot=HEXROT)
    rim = prism(c, R * .985, TOP - .04, 6, 'stone_rim', name + '_rim', z0=.04, bevel=.05, rot=HEXROT)
    grass = prism(c, R * .87, .02, 6, 'grass', name + '_grass', z0=GRASS - .02, bevel=.0, rot=HEXROT)
    # the rim is a tray: cut the inside out down to the grass
    cut = prism(c, R * .87, .2, 6, 'grass', name + '_cut', z0=GRASS - .001, rot=HEXROT)
    bo = rim.modifiers.new('tray', 'BOOLEAN')
    bo.operation = 'DIFFERENCE'
    bo.object = cut
    cut.hide_render = cut.hide_viewport = True
    rim.modifiers.move(rim.modifiers.find('tray'), 0)
    # soft mounds of lighter grass
    for _ in range(5):
        a, rr = rnd.random() * 6.28, rnd.random() * .55
        blob((c[0] + math.cos(a) * rr, c[1] + math.sin(a) * rr, GRASS - .05), .16 + rnd.random() * .08, 'grass_light', name + '_mound', sz=.35)
    return grass


def tree(c, s=1.0, kind='round'):
    x, y = c
    prism((x, y), .028 * s, .16 * s, 8, 'trunk', 'trunk', z0=GRASS, smooth=True)
    if kind == 'pine':
        for i, (r, z, h) in enumerate(((.13, .1, .22), (.1, .22, .2), (.065, .34, .17))):
            prism((x, y), r * s, h * s, 10, 'leaf_dark', 'pine', z0=GRASS + z * s, r2=0.0, smooth=True)
    else:
        for dx, dy, dz, r in ((0, 0, .26, .14), (-.08, .03, .2, .1), (.08, -.02, .21, .1), (0, -.06, .33, .09)):
            blob((x + dx * s, y + dy * s, GRASS + dz * s), r * s, 'leaf', 'leaf', sz=.95, jitter=.15)


def meeple(c, player, s=.26, rot=0.0):
    """The classic figure: head, arms, legs — an outline extruded and rounded."""
    pts = [(0, 1.0), (.17, .96), (.26, .82), (.23, .66), (.5, .6), (.58, .5), (.5, .4), (.3, .38), (.4, .0), (.12, .0), (0, .2),
           (-.12, .0), (-.4, .0), (-.3, .38), (-.5, .4), (-.58, .5), (-.5, .6), (-.23, .66), (-.26, .82), (-.17, .96)]
    bm = bmesh.new()
    vs = [bm.verts.new((x * s, 0, y * s)) for x, y in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    moved = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=moved, vec=Vector((0, .22 * s, 0)))
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((0, -.11 * s, 0)))
    bmesh.ops.rotate(bm, verts=bm.verts, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(rot, 3, 'Z'))
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((c[0], c[1], GRASS)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = from_bm(bm, 'meeple_' + player, 'player_' + player, smooth=False, bevel=.018 * s / .26, segs=3)
    return o


def banner(top, player, s=1.0, pole=.3):
    x, y, z = top
    prism((x, y), .008 * s, pole * s, 6, 'timber', 'pole', z0=z, smooth=True)
    blob((x, y, z + pole * s + .012 * s), .016 * s, 'gold', 'finial')
    L, Hh, cols = .2 * s, .1 * s, 6
    z1 = z + pole * s - .01 * s
    bm = bmesh.new()

    def pt(i, j):
        u = i / cols
        wave = math.sin(u * 5 + .6) * .02 * s * u
        xx = x + .006 + u * L - (L * .22 if (i == cols and j == 1) else 0)
        return bm.verts.new((xx, y + wave, z1 - j * Hh / 2 - .006 * s * u * (j > 0)))
    grid = [[pt(i, j) for j in range(3)] for i in range(cols + 1)]
    for i in range(cols):
        for j in range(2):
            bm.faces.new([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=.006)
    from_bm(bm, 'banner_' + player, 'player_' + player, smooth=True)


# ---------------------------------------------------------------- the three tiles
def castle(c):
    x, y = c
    box((x, y + .08, GRASS), (.42, .34, .32), 'stone', 'keep_body', bevel=.02)
    for k in range(-2, 3):   # battlements
        for (ax, ay) in ((k * .084, .17), (k * .084, -.17)):
            box((x + ax, y + .08 + ay, GRASS + .32), (.05, .05, .05), 'stone', 'merlon')
    gable_roof((x, y + .08, GRASS + .32), .3, .26, .2, 0, 'roof', 'keep_roof')
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        tx, ty = x + sx * .24, y + .08 + sy * .2
        prism((tx, ty), .085, .44, 12, 'stone', 'tower', z0=GRASS, bevel=.012, smooth=True)
        prism((tx, ty), .1, .04, 12, 'stone_dark', 'tower_ring', z0=GRASS + .44, bevel=.008, smooth=True)
        prism((tx, ty), .105, .24, 14, 'roof', 'tower_roof', z0=GRASS + .48, r2=0, smooth=True)
        if sy > 0 or sx > 0:
            banner((tx, ty, GRASS + .7), 'red', .8, .14)
    # gate and windows facing the road
    box((x, y - .1, GRASS), (.12, .02, .14), 'door', 'gate', bevel=.01)
    for wx in (-.1, .1):
        box((x + wx, y - .095, GRASS + .2), (.04, .02, .06), 'window', 'win', bevel=.004)


def bridge(c, rot):
    """A stone arch bridge across the river."""
    x, y = c
    L, W, H0 = .5, .16, .1
    bm = bmesh.new()
    n = 10
    prof = []
    for i in range(n + 1):
        t = i / n
        xx = -L / 2 + L * t
        zt = H0 + .06 * math.sin(math.pi * t)
        za = .02 + .1 * math.sin(math.pi * t) if .15 < t < .85 else .02
        prof.append((xx, zt, min(za, zt - .03)))
    for side in (-1, 1):
        pass
    rows = []
    for (xx, zt, za) in prof:
        rows.append([bm.verts.new((xx, -W / 2, za)), bm.verts.new((xx, -W / 2, zt)), bm.verts.new((xx, W / 2, zt)), bm.verts.new((xx, W / 2, za))])
    for a, b in zip(rows, rows[1:]):
        for i in range(4):
            bm.faces.new([a[i], b[i], b[(i + 1) % 4], a[(i + 1) % 4]])
    bm.faces.new(rows[0][::-1])
    bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(rot, 3, 'Z'))
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((x, y, GRASS - .04)))
    from_bm(bm, 'bridge', 'stone', bevel=.01)
    for side in (-1, 1):   # parapets
        for (xx, zt, _) in prof[1:-1:2]:
            p = Vector((xx, side * (W / 2 - .015)))
            p = Matrix.Rotation(rot, 2) @ p
            box((x + p.x, y + p.y, GRASS - .04 + zt), (.05, .03, .045), 'stone_dark', 'parapet', rot=rot, bevel=.006)


def house(c, rot, roofm='roof', s=1.0):
    x, y = c
    box((x, y, GRASS), (.2 * s, .15 * s, .14 * s), 'plaster', 'house', rot=rot, bevel=.008)
    gable_roof((x, y, GRASS + .14 * s), .2 * s, .15 * s, .11 * s, rot, roofm, 'house_roof')
    Rm = Matrix.Rotation(rot, 2)
    p = Rm @ Vector((0, -.076 * s))
    box((x + p.x, y + p.y, GRASS), (.045 * s, .01, .08 * s), 'door', 'door', rot=rot, bevel=.003)
    for wx in (-.06, .06):
        q = Rm @ Vector((wx * s, -.076 * s))
        box((x + q.x, y + q.y, GRASS + .07 * s), (.03 * s, .01, .035 * s), 'window', 'win', rot=rot, bevel=.002)
    q = Rm @ Vector((.05 * s, .03 * s))
    box((x + q.x, y + q.y, GRASS + .2 * s), (.03 * s, .03 * s, .08 * s), 'stone_dark', 'chimney', rot=rot, bevel=.004)


def chapel(c, rot):
    x, y = c
    box((x, y, GRASS), (.16, .3, .2), 'plaster', 'nave', rot=rot, bevel=.01)
    gable_roof((x, y, GRASS + .2), .3, .16, .12, rot + math.pi / 2, 'roof', 'nave_roof')
    Rm = Matrix.Rotation(rot, 2)
    t = Rm @ Vector((0, -.19))
    box((x + t.x, y + t.y, GRASS), (.11, .11, .36), 'plaster', 'belfry', rot=rot, bevel=.008)
    prism((x + t.x, y + t.y), .085, .2, 4, 'roof_dark', 'spire', z0=GRASS + .36, r2=0, rot=rot + math.pi / 4)
    box((x + t.x, y + t.y, GRASS + .57), (.012, .012, .07), 'gold', 'cross', bevel=0)
    box((x + t.x, y + t.y, GRASS + .615), (.045, .012, .012), 'gold', 'cross', bevel=0)


def notch(rims, mid, normal, width=.28):
    """A gap in the stone rim where a road or the river crosses from one tile to the next."""
    d = Vector(normal).normalized()
    cutter = box((mid.x, mid.y, GRASS - .004), (.5, width, .3), 'stone', 'notch', rot=math.atan2(d.y, d.x), bevel=0)
    cutter.hide_render = cutter.hide_viewport = True
    for rim in rims:
        m = rim.modifiers.new('notch', 'BOOLEAN')
        m.operation = 'DIFFERENCE'
        m.object = cutter


def band(c, player):
    """The owner's colour: a band round the stone rim of the tile."""
    prism(c, R * .992, .05, 6, 'player_' + player, 'band_' + player, z0=.15, bevel=.012, rot=HEXROT)


def waterfall(mid, deg):
    d = hex_dir(deg)
    a = Vector((-d.y, d.x))
    for k, (wid, m) in enumerate(((.26, 'water'), (.12, 'foam'))):
        bm = bmesh.new()
        top = mid + d * .015
        cs = [bm.verts.new((*(top + a * wid / 2 + d * (.01 + k * .006)), GRASS)), bm.verts.new((*(top - a * wid / 2 + d * (.01 + k * .006)), GRASS)),
              bm.verts.new((*(top - a * wid / 2 + d * (.1 + k * .01)), -.06)), bm.verts.new((*(top + a * wid / 2 + d * (.1 + k * .01)), -.06))]
        bm.faces.new(cs)
        from_bm(bm, 'fall', m, smooth=True)
    foam = mid + d * .16
    for dx in (-.11, 0, .11):
        blob((foam.x + a.x * dx, foam.y + a.y * dx, -.06), .075, 'foam', 'foam', sz=.4, jitter=.3)


def build():
    """Three tiles, every one of their six sides open: a road or the river leaves each side through a gap in the rim,
    so each tile reads as a game tile that joins its neighbours on all sides."""
    materials()
    C0, C1, C2 = Vector((0, 0)), Vector((-1.5, -math.sqrt(3) / 2)), Vector((0, -math.sqrt(3)))
    rims = {}
    for c, n in ((C0, 'red'), (C1, 'blue'), (C2, 'yellow')):
        hex_tile(c, 't_' + n)
        rims[n] = bpy.data.objects['t_' + n + '_rim']
        band(c, n)
    roads = []

    def road(pts, width=.16, name='road'):
        ribbon(pts, width, GRASS + .012, 'cobble', name, thick=.03, lanes=2)
        roads.append(pts)
        return pts

    def stub(hub, c, deg, rim, width=.14):
        """A road from a hub inside the tile out through the side deg (the tile joins a neighbour there)."""
        e = edge_mid(c, deg)
        pts = bez(hub, hub + (e - hub) * .35 + Vector((-(e - hub).y, (e - hub).x)) * .08, e - hex_dir(deg) * .2, e, 12)
        road(pts, width, 'stub')
        notch([rim], e, hex_dir(deg), .26)
        return pts

    gate = C0 + Vector((0, -.04))
    sq = C2 + Vector((.3, .12))
    mill = C1 + Vector((-.42, -.08))
    # road A: castle gate → the red/yellow side → the village square
    e02 = edge_mid(C0, 270)
    road(bez(gate, gate + Vector((0, -.3)), e02 + hex_dir(90) * .2, e02, 12)[:-1] + bez(e02, e02 + hex_dir(270) * .3, sq + Vector((-.15, .3)), sq, 12), .17, 'roadA')
    notch([rims['red'], rims['yellow']], e02, hex_dir(270))
    # road B: castle gate → the red/blue side → over the bridge → the mill
    e01 = edge_mid(C0, 210)
    roadB = road(bez(gate, gate + Vector((-.3, -.1)), e01 + hex_dir(30) * .25, e01, 12)[:-1] + bez(e01, e01 + hex_dir(210) * .35, mill + Vector((.35, .1)), mill, 18), .16, 'roadB')
    notch([rims['red'], rims['blue']], e01, hex_dir(210))
    # the river: in over the far side of the blue tile, under the bridge, into the yellow tile, off its front side
    rin, e12, rout = edge_mid(C1, 90), edge_mid(C1, 330), edge_mid(C2, 270)
    river = bez(rin, rin + hex_dir(270) * .45, e12 + hex_dir(150) * .45, e12, 22)[:-1] + bez(e12, e12 + hex_dir(330) * .4, rout + hex_dir(90) * .45, rout, 20)
    ribbon(river, .38, GRASS + .002, 'cobble', 'river_bank', thick=.02, lanes=3)
    ribbon(river, .3, GRASS + .004, 'water', 'river', thick=.02, lanes=3)
    ribbon(river, .13, GRASS + .006, 'water_deep', 'river_deep', thick=.02)
    notch([rims['blue']], rin, hex_dir(90), .36)
    notch([rims['blue'], rims['yellow']], e12, hex_dir(330), .36)
    notch([rims['yellow']], rout, hex_dir(270), .36)
    waterfall(rout, 270)
    # every other side gets its road out
    stub(gate + Vector((.1, 0)), C0, 30, rims['red'])
    stub(gate + Vector((.12, -.05)), C0, 330, rims['red'])
    stub(gate + Vector((-.1, .02)), C0, 150, rims['red'])
    stub(C0 + Vector((0, .45)), C0, 90, rims['red'])            # the castle's back gate
    stub(mill, C1, 150, rims['blue'])
    stub(mill, C1, 210, rims['blue'])
    stub(mill + Vector((.1, -.08)), C1, 270, rims['blue'])
    stub(sq, C2, 30, rims['yellow'])
    stub(sq, C2, 330, rims['yellow'])
    hut = C2 + Vector((-.5, -.12))                              # across the river: a hut and its path out
    stub(hut, C2, 210, rims['yellow'])
    # the bridge where road B meets the river
    best = min(((p - q).length, i) for i, p in enumerate(roadB) for q in river)
    i = best[1]
    mid = roadB[i]
    dv = roadB[min(i + 1, len(roadB) - 1)] - roadB[max(i - 1, 0)]
    bridge(mid, math.atan2(dv.y, dv.x))
    # red: the castle, the red figure by the gate
    castle(C0 + Vector((0, .2)))
    red_m = gate + Vector((.3, -.22))
    meeple(red_m, 'red', s=.36, rot=.3)
    # blue: the mill, the blue figure at the bridge, a banner
    house(mill, .4, 'roof_dark', 1.1)
    bdir = dv.normalized()
    blue_m = mid - bdir * .34 + Vector((-bdir.y, bdir.x)) * .06
    meeple(blue_m, 'blue', s=.36, rot=.2)
    blue_b = Vector((C1.x + .38, C1.y + .3))
    banner((blue_b.x, blue_b.y, GRASS), 'blue', 1.0, .36)
    # yellow: the village round the square, a chapel, the figure on the square, a banner
    chapel(C2 + Vector((.52, -.25)), .4)
    house(C2 + Vector((.45, .42)), -.2)
    house(C2 + Vector((.62, .12)), .5)
    house(C2 + Vector((.2, -.5)), .1)
    house(hut, .9, 'roof_dark', .8)
    yel_m = sq + Vector((-.04, -.1))
    meeple(yel_m, 'yellow', s=.36, rot=-.2)
    yel_b = Vector((C2.x + .05, C2.y + .5))
    banner((yel_b.x, yel_b.y, GRASS), 'yellow', 1.0, .36)
    for k in range(4):   # rocks
        a = rnd.random() * 6.28
        blob((C0.x + .6 * math.cos(a), C0.y + .6 * math.sin(a), GRASS), .05, 'rock', 'rock', sz=.6, jitter=.3)
    dress((C0, C1, C2), (*roads, river),
          [(C0 + Vector((0, .2)), .42), (mill, .2), (C2 + Vector((.52, -.25)), .25), (C2 + Vector((.45, .42)), .17),
           (C2 + Vector((.62, .12)), .17), (C2 + Vector((.2, -.5)), .17), (hut, .14), (sq, .22), (mid, .3),
           (red_m, .24), (blue_m, .24), (yel_m, .24), (blue_b, .1), (yel_b, .1)],
          river, sq, mill, C0)


def free_spot(p, paths, blocked, pad):
    if any(min((p - q).length for q in path) < pad for path in paths):
        return False
    return all((p - c).length > r + pad * .6 for c, r in blocked)


def sheep(c, rot):
    x, y = c
    blob((x, y, GRASS + .05), .06, 'foam', 'sheep', sz=.75, jitter=.25)
    d = Vector((math.cos(rot), math.sin(rot)))
    blob((x + d.x * .06, y + d.y * .06, GRASS + .065), .026, 'door', 'sheep_head', sz=1.1)
    for k in range(4):
        q = Vector(c) + Matrix.Rotation(rot, 2) @ Vector(((-1, -1, 1, 1)[k] * .03, (-1, 1, -1, 1)[k] * .025))
        prism((q.x, q.y), .007, .03, 5, 'door', 'leg', z0=GRASS)


def dress(centres, paths, blocked, river, sq, mill, castle_c):
    """Life on the table, as on the reference icon: bushes, flowers and tufts, stones by the river, a boat,
    sheep on the castle meadow, hay by the mill, a well and a fence in the village, little woods at the corners."""
    blocked = list(blocked)
    flowers = ('#ff6b6b', '#ffd34d', '#ffffff', '#c38bff', '#ff9ad5')
    for i, f in enumerate(flowers):
        mat('flower%d' % i, f, .5)
    for ci, c in enumerate(centres):
        for _ in range(140):   # little woods and bushes near the rim
            a, rr = rnd.random() * 6.283, .45 + rnd.random() * .32
            p = Vector(c) + Vector((math.cos(a), math.sin(a))) * rr
            if not free_spot(p, paths, blocked, .17):
                continue
            if rnd.random() < .45:
                tree(p, .55 + rnd.random() * .3, 'pine' if rnd.random() < .55 else 'round')
                blocked.append((p, .1))
            else:
                blob((p.x, p.y, GRASS + .02), .045 + rnd.random() * .03, 'leaf', 'bush', sz=.7, jitter=.3)
                blocked.append((p, .06))
        for _ in range(60):    # flowers and tufts on the open grass
            a, rr = rnd.random() * 6.283, rnd.random() * .78
            p = Vector(c) + Vector((math.cos(a), math.sin(a))) * rr
            if not free_spot(p, paths, blocked, .1):
                continue
            if rnd.random() < .6:
                blob((p.x, p.y, GRASS + .012), .012, 'flower%d' % rnd.randrange(len(flowers)), 'flower', sub=1)
            else:
                prism((p.x, p.y), .018, .05, 5, 'grass_light', 'tuft', z0=GRASS, r2=0)
    for k in range(0, len(river), 3):   # stones along both banks
        q = river[k]
        t = (river[min(k + 1, len(river) - 1)] - river[max(k - 1, 0)]).normalized()
        n = Vector((-t.y, t.x))
        for side in (-1, 1):
            if rnd.random() < .55:
                p = q + n * side * (.2 + rnd.random() * .03)
                blob((p.x, p.y, GRASS + .005), .022 + rnd.random() * .015, 'rock', 'stone', sz=.6, jitter=.35)
    # a boat on the river in the yellow tile
    q = river[int(len(river) * .78)]
    t = (river[int(len(river) * .78) + 1] - q).normalized()
    yaw = math.atan2(t.y, t.x)
    box((q.x, q.y, GRASS - .005), (.16, .07, .035), 'trunk', 'boat', rot=yaw, bevel=.02)
    # sheep on the castle meadow
    for k, off in enumerate((Vector((.38, -.55)), Vector((.5, -.42)), Vector((.25, -.62)))):
        p = Vector(castle_c) + off
        if free_spot(p, paths, [], .09):
            sheep(p, rnd.random() * 6.28)
    # hay by the mill
    for off in (Vector((.16, -.18)), Vector((.28, -.1))):
        p = mill + off
        prism((p.x, p.y), .05, .05, 12, 'gold', 'hay', z0=GRASS, smooth=True)
        blob((p.x, p.y, GRASS + .05), .05, 'gold', 'hay_top', sz=.8)
    # the village well and a fence round a garden
    w = sq + Vector((.13, -.15))
    prism((w.x, w.y), .045, .05, 12, 'stone', 'well', z0=GRASS, bevel=.006, smooth=True)
    prism((w.x, w.y), .035, .002, 12, 'water_deep', 'well_water', z0=GRASS + .05)
    for dx in (-.04, .04):
        box((w.x + dx, w.y, GRASS + .05), (.01, .01, .08), 'timber', 'well_post', bevel=0)
    gable_roof((w.x, w.y, GRASS + .13), .1, .08, .05, 0, 'roof_dark', 'well_roof', over=.01)
    f0 = Vector(centres[2]) + Vector((.2, -.6))
    for k in range(6):
        p = f0 + Vector((k * .07, -.02 * k))
        box((p.x, p.y, GRASS), (.012, .012, .06), 'timber', 'fence_post', bevel=0)
    for z in (.025, .05):
        a, b = f0, f0 + Vector((5 * .07, -.1))
        m = (a + b) / 2
        box((m.x, m.y, GRASS + z), ((b - a).length, .008, .008), 'timber', 'fence_rail', rot=math.atan2(b.y - a.y, b.x - a.x), bevel=0)


def scene(samples):
    sc = bpy.context.scene
    try:
        sc.render.engine = 'CYCLES'
    except TypeError:
        pass
    try:
        pref = bpy.context.preferences.addons['cycles'].preferences
        for dev in ('OPTIX', 'CUDA', 'HIP'):
            try:
                pref.compute_device_type = dev
                pref.get_devices()
                if any(d.type == dev for d in pref.devices):
                    for d in pref.devices:
                        d.use = True
                    sc.cycles.device = 'GPU'
                    break
            except Exception:
                continue
    except Exception:
        pass
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = 1024
    try:
        sc.view_settings.view_transform = 'Standard'
        sc.view_settings.exposure = -.15
    except TypeError:
        sc.view_settings.view_transform = 'Standard'
    world = sc.world or bpy.data.worlds.new('World')
    sc.world = world
    bg = next((n for n in world.node_tree.nodes if n.type == 'BACKGROUND'), None)
    if bg:
        bg.inputs['Color'].default_value = (0.35, 0.45, 0.85, 1)
        bg.inputs['Strength'].default_value = 0.45
    sun = bpy.data.lights.new('Sun', 'SUN')
    sun.energy = 4.8
    sun.angle = math.radians(6)
    sun.color = (1.0, 0.9, 0.76)
    so = link(bpy.data.objects.new('Sun', sun))
    so.rotation_euler = (math.radians(48), 0, math.radians(-30))
    rim = bpy.data.lights.new('Rim', 'AREA')
    rim.energy = 260
    rim.size = 4
    rim.color = (0.6, 0.72, 1.0)
    ro = link(bpy.data.objects.new('Rim', rim))
    ro.location = (-3.2, 3.0, 3.0)
    ro.rotation_euler = (math.radians(-50), math.radians(-35), 0)
    cam = bpy.data.cameras.new('Cam')
    cam.lens = 55
    co = link(bpy.data.objects.new('Cam', cam))
    target = Vector((-.5, -.87, .25))
    az, el, dist = math.radians(-58), math.radians(38), 6.6
    co.location = target + Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el))) * dist
    co.rotation_euler = (target - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co


def main(argv):
    out = os.path.join(ROOT, 'store', 'src', 'icon-3tiles-1024.png')
    samples = 160
    if '--out' in argv:
        out = argv[argv.index('--out') + 1]
    if '--samples' in argv:
        samples = int(argv[argv.index('--samples') + 1])
    bpy.ops.wm.read_homefile(use_empty=True)
    build()
    scene(samples)
    if '--no-render' not in argv:
        bpy.context.scene.render.filepath = out
        bpy.ops.render.render(write_still=True)
        print('ICON', out)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
