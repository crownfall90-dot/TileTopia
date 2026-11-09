"""Town: the walled towns of the Classic 2.0 cards, as on the app icon: warm cobbles, lanes from the middle of every
town side to the keep's square, houses packed along the lanes and inside the walls (red, orange, brown and slate tiled
roofs, chimneys, glowing roof windows), the keep (a little castle with four round towers, red cone roofs and red
banners), market stalls with striped awnings round the square, gardens with fruit trees, townsfolk and a cart.

Everything sits on the card's town shape (ctx.sh['town'], the game's own geometry, see core.py): the cobbles fill
the outline, a crenellated stone wall follows each wall curve (the game paints the owner's colour over it), a round
tower with a red cone roof stands at each of town.towers, a gatehouse where a road ends at the wall (roads with end
'gate'). Along town sides the cobbles and lanes run to the card's edge, square to it and of one width, so towns join
from card to card in any turn; houses keep EDGE inside it. Nothing of the town crosses the other sides.

The layout is worked out in the game frame (card heights, x right, y down) on a fine grid of free ground (Grid); the
geometry is gathered into one mesh per material (Batch), with UVs so roof tiles follow every ridge and the setts of
every lane follow the lane.
"""
import bpy
import bmesh
import math
import random
from mathutils import Vector, Matrix
from . import core
from .core import U, R, V6, lerp, dist, sample, quad, hex_inset, inside_poly, link

# ------------------------------------------------------------------ sizes (card heights unless noted)
LANE = .066                       # a lane's width at the card's edge (the same on every card, so lanes join)
EDGE = .03                        # houses keep this far inside the card's edge
WALL_B, WALL_T, WALL_H = .066, .05, .074   # the town wall: width at its foot, at the walkway, height
TOWER_R = .041                    # a wall tower
ZG, ZL, ZS = .008, .0096, .0112   # tops of the cobbles, the lanes, the square (Blender units)
KEEP_K = {1: .62, 2: .8, 3: .92, 4: 1.0, 5: 1.12, 6: 1.3}   # size of the keep by the number of town sides
ROOFS = {                         # tiles, second tone, joints
    'red': ('#d8562c', '#c84b28', '#7a2a16'),
    'orange': ('#e5813f', '#d77437', '#8c461f'),
    'dark': ('#a9412b', '#983a27', '#5a2115'),
    'brown': ('#9d6743', '#8d5b3b', '#553521'),
    'slate': ('#62798f', '#576d83', '#34414d'),
    'ochre': ('#ddab55', '#cf9d48', '#8a6430'),
}


# ------------------------------------------------------------------ small vector helpers (game frame, tuples)
def add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def mul(a, k):
    return (a[0] * k, a[1] * k)


def unit(a):
    L = math.hypot(a[0], a[1]) or 1.0
    return (a[0] / L, a[1] / L)


def perp(a):
    return (-a[1], a[0])


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1]


def ang(v):
    return math.atan2(v[1], v[0])


def B(p, z=0.0):
    """A game point as a Blender point."""
    return Vector((p[0] * U, -p[1] * U, z))


def seg_dist(p, a, b):
    abx, aby = b[0] - a[0], b[1] - a[1]
    L2 = abx * abx + aby * aby
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / L2))
    return math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t)


def poly_dist(p, pts):
    return min(seg_dist(p, a, b) for a, b in zip(pts, pts[1:]))


def closest(pts, p):
    """The nearest point of a polyline to p: (distance, point, unit tangent, arc length there)."""
    best, s0 = (9.0, pts[0], (1.0, 0.0), 0.0), 0.0
    for a, b in zip(pts, pts[1:]):
        abx, aby = b[0] - a[0], b[1] - a[1]
        L = math.hypot(abx, aby)
        if L < 1e-9:
            continue
        t = max(0.0, min(1.0, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (L * L)))
        q = (a[0] + abx * t, a[1] + aby * t)
        d = dist(p, q)
        if d < best[0]:
            best = (d, q, (abx / L, aby / L), s0 + L * t)
        s0 += L
    return best


def resample(pts, step):
    """Points every `step` along a polyline, with their unit tangents: [(point, tangent, arc length)]."""
    out, acc, s = [], 0.0, 0.0
    segs = [(a, b, dist(a, b)) for a, b in zip(pts, pts[1:]) if dist(a, b) > 1e-9]
    total = sum(L for _, _, L in segs)
    k = 0
    while s <= total + 1e-9 and segs:
        while k < len(segs) - 1 and acc + segs[k][2] < s:
            acc += segs[k][2]
            k += 1
        a, b, L = segs[k]
        t = min(1.0, max(0.0, (s - acc) / L))
        out.append((lerp(a, b, t), unit(sub(b, a)), s))
        s += step
    return out


def length(pts):
    return sum(dist(a, b) for a, b in zip(pts, pts[1:]))


def rgba(h):
    return (*core.hexcol(h), 1.0)


# ------------------------------------------------------------------ materials of the town
def _nm(ctx, name):
    """A new node material in the card's palette, or (None, None) if the card already has it."""
    if name in ctx.mats.m:
        return None, None
    m = bpy.data.materials.new(name)
    ctx.mats.m[name] = m
    nt = m.node_tree
    return nt, next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')


def _ramp(nt, stops):
    r = nt.nodes.new('ShaderNodeValToRGB')
    el = r.color_ramp.elements
    el[1].position, el[1].color = stops[-1]
    el[0].position, el[0].color = stops[0]
    for p, c in stops[1:-1]:
        el.new(p).color = c
    return r


def _math(nt, op, a=None, b=None, c=None):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def _bump(nt, b, height, strength, distance=.004):
    bp = nt.nodes.new('ShaderNodeBump')
    bp.inputs['Strength'].default_value = strength
    bp.inputs['Distance'].default_value = distance
    nt.links.new(height, bp.inputs['Height'])
    nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])


def _bricks(nt, vec, c1, c2, mortar, width, row, msize, smooth=.2):
    br = nt.nodes.new('ShaderNodeTexBrick')
    nt.links.new(vec, br.inputs['Vector'])
    br.inputs['Color1'].default_value = rgba(c1)
    br.inputs['Color2'].default_value = rgba(c2)
    br.inputs['Mortar'].default_value = rgba(mortar)
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Mortar Size'].default_value = msize
    br.inputs['Mortar Smooth'].default_value = smooth
    br.inputs['Brick Width'].default_value = width
    br.inputs['Row Height'].default_value = row
    return br


def _tint(nt, color, lo=.86, span=.28):
    """Each house a little lighter or darker: the face value 'rnd' (0..1) scales the colour."""
    at = nt.nodes.new('ShaderNodeAttribute')
    at.attribute_name = 'rnd'
    hs = nt.nodes.new('ShaderNodeHueSaturation')
    nt.links.new(_math(nt, 'MULTIPLY_ADD', at.outputs[2], span, lo), hs.inputs['Value'])
    nt.links.new(color, hs.inputs['Color'])
    return hs.outputs[0]


def materials(ctx):
    L = lambda a, b: ctx_links(a, b)
    # the town ground: rounded cobbles in warm tones with darker joints
    nt, b = _nm(ctx, 'town_cobble')
    if nt:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        cells = nt.nodes.new('ShaderNodeTexVoronoi')
        edge = nt.nodes.new('ShaderNodeTexVoronoi')
        edge.feature = 'DISTANCE_TO_EDGE'
        for v in (cells, edge):
            v.voronoi_dimensions = '2D'
            v.inputs['Scale'].default_value = 40
            nt.links.new(tc.outputs['Object'], v.inputs['Vector'])
        tone = _ramp(nt, [(0, rgba('#c4a67b')), (.45, rgba('#d8bf95')), (1, rgba('#e9d7b1'))])
        nt.links.new(cells.outputs[1], tone.inputs[0])
        joint = _ramp(nt, [(.03, (0, 0, 0, 1)), (.17, (1, 1, 1, 1))])
        nt.links.new(edge.outputs[0], joint.inputs[0])
        mix = nt.nodes.new('ShaderNodeMixRGB')
        mix.inputs[1].default_value = rgba('#8b7151')
        nt.links.new(joint.outputs[0], mix.inputs[0])
        nt.links.new(tone.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], b.inputs['Base Color'])
        _bump(nt, b, joint.outputs[0], .5, .006)
        b.inputs['Roughness'].default_value = .85
    # the lanes: rows of setts across the lane (UV: u along, v across, Blender units), a darker kerb on both sides
    nt, b = _nm(ctx, 'town_lane')
    if nt:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ')
        nt.links.new(tc.outputs['UV'], sep.inputs[0])
        com = nt.nodes.new('ShaderNodeCombineXYZ')
        nt.links.new(sep.outputs['Y'], com.inputs['X'])
        nt.links.new(sep.outputs['X'], com.inputs['Y'])
        br = _bricks(nt, com.outputs[0], '#ecdfc1', '#dfcda8', '#a68e6a', .034, .017, .0022)
        half = LANE * U / 2
        edge = _math(nt, 'ABSOLUTE', _math(nt, 'SUBTRACT', sep.outputs['Y'], half))
        kerb = _ramp(nt, [(half - .016, (0, 0, 0, 1)), (half - .012, (1, 1, 1, 1))])
        nt.links.new(edge, kerb.inputs[0])
        mix = nt.nodes.new('ShaderNodeMixRGB')
        nt.links.new(kerb.outputs[0], mix.inputs[0])
        nt.links.new(br.outputs[0], mix.inputs[1])
        mix.inputs[2].default_value = rgba('#a3906f')
        nt.links.new(mix.outputs[0], b.inputs['Base Color'])
        _bump(nt, b, br.outputs[1], -.35, .004)
        b.inputs['Roughness'].default_value = .8
    # the square: rings of light stone round the keep (UV = offset from the keep, Blender units)
    nt, b = _nm(ctx, 'town_square')
    if nt:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        vm = nt.nodes.new('ShaderNodeVectorMath')
        vm.operation = 'LENGTH'
        nt.links.new(tc.outputs['UV'], vm.inputs[0])
        ring = _math(nt, 'SINE', _math(nt, 'MULTIPLY', vm.outputs['Value'], 2 * math.pi / .036))
        tone = _ramp(nt, [(-.25, rgba('#e2d1ad')), (.25, rgba('#f0e4c8'))])
        nt.links.new(ring, tone.inputs[0])
        edge = nt.nodes.new('ShaderNodeTexVoronoi')
        edge.feature = 'DISTANCE_TO_EDGE'
        edge.voronoi_dimensions = '2D'
        edge.inputs['Scale'].default_value = 48
        nt.links.new(tc.outputs['UV'], edge.inputs['Vector'])
        joint = _ramp(nt, [(.03, (0, 0, 0, 1)), (.16, (1, 1, 1, 1))])
        nt.links.new(edge.outputs[0], joint.inputs[0])
        mix = nt.nodes.new('ShaderNodeMixRGB')
        mix.inputs[1].default_value = rgba('#a89270')
        nt.links.new(joint.outputs[0], mix.inputs[0])
        nt.links.new(tone.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], b.inputs['Base Color'])
        _bump(nt, b, joint.outputs[0], .4, .005)
        b.inputs['Roughness'].default_value = .8
    # roofs: rows of tiles along every ridge (UV: u along the ridge, v up the slope), each house its own shade
    for fam, (c1, c2, mo) in ROOFS.items():
        nt, b = _nm(ctx, 'town_roof_' + fam)
        if not nt:
            continue
        tc = nt.nodes.new('ShaderNodeTexCoord')
        br = _bricks(nt, tc.outputs['UV'], c1, c2, mo, .032, .021, .0026, .35)
        nt.links.new(_tint(nt, br.outputs[0]), b.inputs['Base Color'])
        _bump(nt, b, br.outputs[1], -.45, .006)
        b.inputs['Roughness'].default_value = .55
    # the wall stone: courses of ashlar (UV: along, up)
    nt, b = _nm(ctx, 'town_wall')
    if nt:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        br = _bricks(nt, tc.outputs['UV'], '#d6c9ac', '#c5b797', '#93866f', .06, .026, .0028, .3)
        nt.links.new(_tint(nt, br.outputs[0], .92, .16), b.inputs['Base Color'])
        _bump(nt, b, br.outputs[1], -.4, .006)
        b.inputs['Roughness'].default_value = .8
    # the walkway on the wall, flagstones
    nt, b = _nm(ctx, 'town_walltop')
    if nt:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        br = _bricks(nt, tc.outputs['UV'], '#ecdcb8', '#e0cda6', '#a99472', .05, .034, .0026, .3)
        nt.links.new(br.outputs[0], b.inputs['Base Color'])
        _bump(nt, b, br.outputs[1], -.3, .005)
        b.inputs['Roughness'].default_value = .75
    g = ctx.mat
    g('town_plaster', '#f3e8cf', .8, '#e2d3b2', 9)
    g('town_plaster_warm', '#f2dcb2', .8, '#dfc596', 9)
    g('town_plaster_rose', '#efd2bf', .8, '#dcbca6', 9)
    g('town_garden', '#6cbd36', .85, '#4fa02a', 14)
    g('town_soil', '#7c5634', .95, '#664629', 22)
    g('town_awning_white', '#f7f1e3', .7)
    g('town_fruit_red', '#e23b2e', .45)
    g('town_fruit_orange', '#f2922c', .45)
    g('town_fruit_yellow', '#f4cf3c', .45)
    g('town_fruit_green', '#8fcf3c', .5)
    g('town_donkey', '#8b7d70', .8)
    g('town_soot', '#2a2522', .9)
    g('town_glow', '#ffcf66', .4, emit=3.0)


def ctx_links(a, b):   # unused; kept for symmetry with other helpers
    return None


# ------------------------------------------------------------------ geometry gathered by material
_ICO = {}


def ico(sub):
    if sub not in _ICO:
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
        bm.verts.index_update()
        _ICO[sub] = ([v.co.copy() for v in bm.verts], [[v.index for v in f.verts] for f in bm.faces])
        bm.free()
    return _ICO[sub]


class Batch:
    """All the town's geometry, one mesh per material (quick to build and to render). Faces can carry UVs (tiles and
    setts follow a roof or a lane) and a value 'rnd' (each house its own shade)."""

    def __init__(self):
        self.parts = {}

    def _get(self, mat):
        p = self.parts.get(mat)
        if p is None:
            bm = bmesh.new()
            p = self.parts[mat] = (bm, bm.loops.layers.uv.new('UVMap'), bm.faces.layers.float.new('rnd'))
        return p

    def mesh(self, mat, verts, faces, smooth=False, rnd=0.0, uvs=None, recalc=False):
        bm, uvl, rl = self._get(mat)
        vs = [bm.verts.new(v) for v in verts]
        made = []
        for k, f in enumerate(faces):
            try:
                face = bm.faces.new([vs[i] for i in f])
            except ValueError:
                continue
            face.smooth = smooth[k] if isinstance(smooth, (list, tuple)) else smooth
            face[rl] = rnd
            if uvs is not None and uvs[k] is not None:
                for loop, uv in zip(face.loops, uvs[k]):
                    loop[uvl].uv = uv
            made.append(face)
        if recalc and made:
            bmesh.ops.recalc_face_normals(bm, faces=made)
        return made

    def box(self, mat, c, sx, sy, sz, rot=0.0, taper=1.0, rnd=0.0, uv=False):
        """A box: base centre c (Blender), sx along the turned x axis, sy across, sz up, the top scaled by taper."""
        M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rot, 4, 'Z')
        hx, hy, tx, ty = sx / 2, sy / 2, sx / 2 * taper, sy / 2 * taper
        P = ((-hx, -hy, 0), (hx, -hy, 0), (hx, hy, 0), (-hx, hy, 0), (-tx, -ty, sz), (tx, -ty, sz), (tx, ty, sz), (-tx, ty, sz))
        V = [M @ Vector(p) for p in P]
        F = [(4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        UV = None
        if uv:
            UV = [[(p[0], p[1]) for p in (P[4], P[5], P[6], P[7])],
                  [(0, 0), (sx, 0), (sx, sz), (0, sz)], [(0, 0), (sy, 0), (sy, sz), (0, sz)],
                  [(0, 0), (sx, 0), (sx, sz), (0, sz)], [(0, 0), (sy, 0), (sy, sz), (0, sz)]]
        self.mesh(mat, V, F, rnd=rnd, uvs=UV)

    def cyl(self, mat, c, r, h, seg=12, r2=None, cap=True, smooth=True, rnd=0.0, a0=0.0):
        """A cylinder, a tapered tower or a cone (r2 = 0) standing at Blender point c; UVs: around (arc), up the side."""
        x, y, z = c
        r2 = r if r2 is None else r2
        A = [a0 + 2 * math.pi * i / seg for i in range(seg + 1)]
        V = [(x + r * math.cos(a), y + r * math.sin(a), z) for a in A[:-1]]
        F, UV, S = [], [], []
        sl = math.hypot(r - r2, h)
        if r2 > 1e-6:
            V += [(x + r2 * math.cos(a), y + r2 * math.sin(a), z + h) for a in A[:-1]]
            for i in range(seg):
                j = (i + 1) % seg
                F.append((i, j, seg + j, seg + i))
                UV.append(((r * A[i], 0), (r * A[i + 1], 0), (r * A[i + 1], sl), (r * A[i], sl)))
                S.append(smooth)
            if cap:
                F.append(tuple(range(seg, 2 * seg)))
                UV.append([(r2 * math.cos(a), r2 * math.sin(a)) for a in A[:-1]])
                S.append(False)
        else:
            V.append((x, y, z + h))
            for i in range(seg):
                j = (i + 1) % seg
                F.append((i, j, seg))
                UV.append(((r * A[i], 0), (r * A[i + 1], 0), (r * (A[i] + A[i + 1]) / 2, sl)))
                S.append(smooth)
        self.mesh(mat, V, F, smooth=S, rnd=rnd, uvs=UV)

    def blob(self, mat, c, r, sz=1.0, sub=1, jitter=0.0, rg=None, rnd=0.0, sx=1.0, sy=1.0, rot=0.0):
        vs, fs = ico(sub)
        rg = rg or random
        ca, sa = math.cos(rot), math.sin(rot)
        V = []
        for v in vs:
            j = 1 + (rg.random() - .5) * jitter
            lx, ly = v.x * r * j * sx, v.y * r * j * sy
            V.append((c[0] + lx * ca - ly * sa, c[1] + lx * sa + ly * ca, c[2] + v.z * r * j * sz))
        self.mesh(mat, V, fs, smooth=True, rnd=rnd)

    def roof(self, mat, c, w, d, h, rot, ow=0.0, od=0.0, rnd=0.0, hip=0.0):
        """A tiled roof over a w x d footprint, ridge along the turned x axis, its eaves at Blender point c; overhangs
        ow at the gable ends and od at the eaves; hip 1 pulls the ridge ends in to a hipped roof."""
        M = Matrix.Translation(Vector(c)) @ Matrix.Rotation(rot, 4, 'Z')
        X, Y = w / 2 + ow, d / 2 + od
        rx = max(X - Y * hip, X * .1) if hip else X
        P = ((-X, -Y, 0), (X, -Y, 0), (X, Y, 0), (-X, Y, 0), (-rx, 0, h), (rx, 0, h))
        V = [M @ Vector(p) for p in P]
        s, sh = math.hypot(Y, h), math.hypot(X - rx, h)
        F = [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]
        UV = [((0, 0), (2 * X, 0), (X + rx, s), (X - rx, s)), ((2 * X, 0), (0, 0), (X - rx, s), (X + rx, s)),
              ((0, 0), (Y, sh), (2 * Y, 0)), ((0, 0), (2 * Y, 0), (Y, sh)), None]
        self.mesh(mat, V, F, rnd=rnd, uvs=UV)
        return M, X, Y, rx

    def ribbon(self, mat, pts, width, z, ext=0.0, rnd=0.0, u0=0.0):
        """A flat strip along game-frame points, width in card heights, top at z (Blender); UV u along, v across."""
        P = [B(p, z) for p in pts]
        if ext:
            P[0] = P[0] + (P[0] - P[1]).normalized() * ext
            P[-1] = P[-1] + (P[-1] - P[-2]).normalized() * ext
        W = width * U
        V, F, UV = [], [], []
        s = u0
        for k, p in enumerate(P):
            a, b = P[max(k - 1, 0)], P[min(k + 1, len(P) - 1)]
            t = (b - a).normalized()
            n = Vector((-t.y, t.x, 0))
            if k:
                s += (p - P[k - 1]).length
            V += [p - n * W / 2, p + n * W / 2]
            if k:
                i = 2 * k
                F.append((i - 2, i, i + 1, i - 1))
                UV.append(((s_prev, 0), (s, 0), (s, W), (s_prev, W)))
            s_prev = s
        self.mesh(mat, V, F, rnd=rnd, uvs=UV)

    def slab(self, mat, poly, z, z0=-.012, uvf=None, rnd=0.0):
        """A flat piece in the shape of a game-frame polygon, top at z, sides down to z0 (Blender)."""
        P = [B(p) for p in poly]
        area = sum(P[i].x * P[(i + 1) % len(P)].y - P[(i + 1) % len(P)].x * P[i].y for i in range(len(P)))
        if area < 0:
            P.reverse()
        n = len(P)
        V = [(p.x, p.y, z) for p in P] + [(p.x, p.y, z0) for p in P]
        F = [tuple(range(n))] + [(i + n, (i + 1) % n + n, (i + 1) % n, i) for i in range(n)]
        UV = [[uvf(p) if uvf else (p.x, p.y) for p in P]] + [None] * n
        self.mesh(mat, V, F, rnd=rnd, uvs=UV)

    def finish(self, ctx):
        for name, (bm, _, _) in self.parts.items():
            me = bpy.data.meshes.new('town_' + name)
            bm.normal_update()
            bm.to_mesh(me)
            bm.free()
            ob = link(bpy.data.objects.new('town_' + name, me))
            ob.data.materials.append(ctx.mats.m[name] if name in ctx.mats.m else ctx.mat(name))
        self.parts = {}


# ------------------------------------------------------------------ the free ground inside the town
class Grid:
    """Which ground inside the town is still free for a house, a stall or a garden (game frame, cells of RES)."""
    RES = .004

    def __init__(self):
        self.nx = int(2 * R / self.RES) + 2
        self.ny = int(1 / self.RES) + 2
        self.f = bytearray(self.nx * self.ny)

    def ij(self, p):
        return int((p[0] + R) / self.RES), int((p[1] + .5) / self.RES)

    def pt(self, i, j):
        return (-R + (i + .5) * self.RES, -.5 + (j + .5) * self.RES)

    def fill_poly(self, poly, v=1):
        n = len(poly)
        for j in range(self.ny):
            y = -.5 + (j + .5) * self.RES
            xs = []
            for k in range(n):
                (x1, y1), (x2, y2) = poly[k], poly[(k + 1) % n]
                if (y1 > y) != (y2 > y):
                    xs.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                i0 = max(0, int(math.ceil((a + R) / self.RES - .5)))
                i1 = min(self.nx - 1, int(math.floor((b + R) / self.RES - .5)))
                for i in range(i0, i1 + 1):
                    self.f[j * self.nx + i] = v

    def keep_if(self, fn):
        for j in range(self.ny):
            for i in range(self.nx):
                k = j * self.nx + i
                if self.f[k] and not fn(self.pt(i, j)):
                    self.f[k] = 0

    def circle(self, c, r, v=0):
        i0, j0 = self.ij((c[0] - r, c[1] - r))
        i1, j1 = self.ij((c[0] + r, c[1] + r))
        r2 = r * r
        for j in range(max(0, j0), min(self.ny - 1, j1) + 1):
            dy = -.5 + (j + .5) * self.RES - c[1]
            row = j * self.nx
            for i in range(max(0, i0), min(self.nx - 1, i1) + 1):
                dx = -R + (i + .5) * self.RES - c[0]
                if dx * dx + dy * dy <= r2:
                    self.f[row + i] = v

    def line(self, pts, r, v=0):
        for a, b in zip(pts, pts[1:]):
            n = max(1, int(dist(a, b) / (self.RES * 2)))
            for k in range(n + 1):
                self.circle(lerp(a, b, k / n), r, v)

    def _rect(self, c, a, hw, hd):
        ca, sa = math.cos(a), math.sin(a)
        ex, ey = abs(ca) * hw + abs(sa) * hd, abs(sa) * hw + abs(ca) * hd
        i0, j0 = self.ij((c[0] - ex, c[1] - ey))
        i1, j1 = self.ij((c[0] + ex, c[1] + ey))
        if i0 < 0 or j0 < 0 or i1 >= self.nx or j1 >= self.ny:
            return None
        out = []
        for j in range(j0, j1 + 1):
            dy = -.5 + (j + .5) * self.RES - c[1]
            for i in range(i0, i1 + 1):
                dx = -R + (i + .5) * self.RES - c[0]
                if abs(dx * ca + dy * sa) <= hw and abs(-dx * sa + dy * ca) <= hd:
                    out.append(j * self.nx + i)
        return out

    def rect_free(self, c, a, hw, hd):
        cells = self._rect(c, a, hw, hd)
        return cells is not None and all(self.f[k] for k in cells)

    def rect_take(self, c, a, hw, hd):
        for k in self._rect(c, a, hw, hd) or ():
            self.f[k] = 0

    def circle_free(self, c, r):
        i0, j0 = self.ij((c[0] - r, c[1] - r))
        i1, j1 = self.ij((c[0] + r, c[1] + r))
        if i0 < 0 or j0 < 0 or i1 >= self.nx or j1 >= self.ny:
            return False
        r2 = r * r
        for j in range(j0, j1 + 1):
            dy = -.5 + (j + .5) * self.RES - c[1]
            for i in range(i0, i1 + 1):
                dx = -R + (i + .5) * self.RES - c[0]
                if dx * dx + dy * dy <= r2 and not self.f[j * self.nx + i]:
                    return False
        return True

    def free_cells(self, step=2):
        return [self.pt(i, j) for j in range(0, self.ny, step) for i in range(0, self.nx, step) if self.f[j * self.nx + i]]


# ------------------------------------------------------------------ the town of one card
class Town:
    def __init__(self, ctx):
        self.ctx = ctx
        self.T = ctx.sh['town']
        self.n = self.T['n']
        self.rg = random.Random(sum(ord(ch) * (i + 11) for i, ch in enumerate(ctx.id + '/town')))
        self.poly = ctx.town_poly
        self.sides = [d for d in range(len(ctx.e)) if ctx.e[d] == 'c']
        self.walls = [quad(tuple(a), tuple(c), tuple(b), 48) for a, c, b in self.T['walls']]
        self.B = Batch()
        self.wind = self.rg.uniform(0, 2 * math.pi)
        self.ph = [self.rg.uniform(0, 6.3) for _ in range(4)]
        self.houses, self.stalls, self.props = [], [], []
        # what else is on the card: roads and rivers (the town keeps off them)
        self.roads = [sample(r['path'], 30) for r in ctx.sh['roads']]
        self.rivers = [sample(r['path'], 40) for r in ctx.sh['rivers']]

    # ---------------------------------------------------------- layout
    def wall_clear(self, p):
        """How far p is from the walls' faces (negative on a wall)."""
        return min([poly_dist(p, w) - WALL_B / 2 for w in self.walls] + [9.0])

    def inside(self, p, pad=0.0, edge=-1.0):
        """Is p in the town, at least pad clear of the walls and `edge` inside the card's edge?"""
        return inside_poly(p, self.poly) and self.wall_clear(p) >= pad and hex_inset(p) >= edge

    def gates(self):
        """Where a road ends at the wall: the gate on the wall curve and the wall's direction there."""
        out = []
        for r in self.ctx.sh['roads']:
            if r.get('end') != 'gate' or not self.walls:
                continue
            a, e = tuple(r['path'][0]), tuple(r['path'][-1])
            best = min((closest(w, e) + (w,) for w in self.walls), key=lambda q: q[0])
            _, g, t, _, w = best
            into = unit(sub(e, a))
            if dot(perp(t), into) < 0:
                t = mul(t, -1)
            out.append({'at': g, 'along': t, 'into': into, 'road': [a, e]})
        return out

    def place_keep(self):
        K0 = tuple(self.T['keep'])
        k = KEEP_K[min(self.n, 6)]
        reach = .121          # the keep's reach from its centre (corner towers' roofs) at size 1

        def clear(p):
            if not inside_poly(p, self.poly):
                return -1.0
            c = self.wall_clear(p)
            for t in self.towers:
                c = min(c, dist(p, t['at']) - t['r'] - .01)
            for g in self.gate_list:
                c = min(c, dist(p, g['at']) - .1)
            return min(c, hex_inset(p) + .02)

        best, bs = K0, -9.0
        for i in range(-6, 7):
            for j in range(-6, 7):
                o = (i * .009, j * .009)
                off = math.hypot(*o)
                if off > .055:
                    continue
                p = add(K0, o)
                s = min(clear(p), reach * k + .012) - off * .3
                if s > bs:
                    best, bs = p, s
        self.keep = best
        self.k = max(.5, min(k, (clear(best) - .01) / reach))
        self.keep_reach = reach * self.k

    def lanes_layout(self):
        """Lanes: from the middle of every town side (and from every gate) to the keep, straight in at the side."""
        K = self.keep
        self.lanes = []
        for d in self.sides:
            P0 = (V6[d][0] * .5, V6[d][1] * .5)
            nin = (-V6[d][0], -V6[d][1])
            Q = add(P0, mul(nin, .1))
            L = dist(Q, K)
            if L < .05 or dot(sub(K, Q), nin) < .02:
                pts = [P0, Q] if L >= .05 else [P0, K]
                if L >= .05:
                    pts += sample([Q, add(Q, mul(nin, L * .3)), lerp(K, Q, .4), K], 12)[1:]
            else:
                B1 = add(Q, mul(nin, L * .42))
                wig = self.rg.uniform(-.045, .045) * min(1.0, L / .3)
                B2 = add(lerp(K, B1, .4), mul(perp(unit(sub(B1, K))), wig))
                pts = [P0] + sample([Q, B1, B2, K], 20)
            self.lanes.append({'pts': pts, 'side': d, 'edge': True})
        for g in self.gate_list:
            a = add(g['at'], mul(g['into'], .04))
            L = dist(a, K)
            if L < .03:
                continue
            B1 = add(a, mul(g['into'], L * .4))
            pts = [g['at']] + sample([a, B1, lerp(K, B1, .4), K], 16)
            self.lanes.append({'pts': pts, 'side': None, 'edge': False})

    def towers_layout(self):
        """The wall towers (none where a gate stands), pulled in a little if a river or road runs close outside."""
        self.towers = []
        for p in self.T['towers']:
            p = tuple(p)
            if any(dist(p, g['at']) < .12 for g in self.gate_list):
                continue
            r = TOWER_R
            # the inward direction: towards the town
            wl = min(self.walls, key=lambda w: poly_dist(p, w))
            _, q, t, _ = closest(wl, p)
            nin = perp(t)
            if not inside_poly(add(q, mul(nin, .03)), self.poly):
                nin = mul(nin, -1)
            for _ in range(8):
                room = min([poly_dist(p, rv) - self.ctx.geo['bank'] / 2 for rv in self.rivers] +
                           [poly_dist(p, rd) - self.ctx.geo['road'] / 2 for rd in self.roads] + [9.0])
                if room >= r * 1.25 + .004:
                    break
                p = add(p, mul(nin, .005))
                r = max(.03, r - .0015)
            self.towers.append({'at': p, 'r': r, 'nin': nin})

    def square_layout(self):
        K, n = self.keep, self.n
        ring = {1: .028, 2: .064, 3: .07, 4: .074, 5: .078, 6: .088}[min(n, 6)]
        rs = self.keep_reach + ring
        pts = []
        for i in range(48):
            a = 2 * math.pi * i / 48
            d = (math.cos(a), math.sin(a))
            r = rs
            while r > self.keep_reach * .8:
                p = add(K, mul(d, r))
                if inside_poly(p, self.poly) and self.wall_clear(p) >= .006 and hex_inset(p) >= -.01:
                    break
                r -= .004
            pts.append(add(K, mul(d, r)))
        self.square = pts
        self.sq_r = rs

    def grid_layout(self):
        g = Grid()
        g.fill_poly(self.poly)
        walls = self.walls

        def ok(p):
            if hex_inset(p) < EDGE:
                return False
            for w in walls:
                if poly_dist(p, w) < WALL_B / 2 + .006:
                    return False
            return True
        g.keep_if(ok)
        for t in self.towers:
            g.circle(t['at'], t['r'] * 1.25 + .006)
        for gt in self.gate_list:
            g.circle(gt['at'], .1)
        for ln in self.lanes:
            g.line(ln['pts'], LANE / 2 + .003)
        g.fill_poly(self.square, 0)
        g.circle(self.keep, self.keep_reach + .01)
        for rd in self.roads:
            g.line(rd, self.ctx.geo['road'] / 2 + .01)
        self.grid = g

    # ---------------------------------------------------------- houses
    def family(self, p):
        """Roof colours come in clusters (a smooth field over the card), with a few odd ones out."""
        rg = self.rg
        if rg.random() < .2:
            return rg.choice(('red', 'red', 'orange', 'dark', 'brown', 'slate', 'ochre'))
        a, b, c, _ = self.ph
        f = math.sin(p[0] * 7.5 + a) + math.sin(p[1] * 6.8 + b) + .7 * math.sin((p[0] - p[1]) * 11 + c)
        if f < -1.45:
            return 'slate'
        if f < -.75:
            return 'brown'
        if f < -.2:
            return 'dark'
        if f < .85:
            return 'red'
        if f < 1.5:
            return 'orange'
        return 'ochre'

    def spec(self, scale=1.0):
        rg = self.rg
        k = rg.random()
        if k < .44:
            kind, w, d = 'long', rg.uniform(.072, .118), rg.uniform(.05, .066)
        elif k < .68:
            kind, w, d = 'deep', rg.uniform(.05, .064), rg.uniform(.07, .096)
        elif k < .86:
            kind, w, d = 'hip', rg.uniform(.06, .092), rg.uniform(.056, .072)
        else:
            kind, w, d = 'L', rg.uniform(.084, .112), rg.uniform(.05, .06)
        return {'kind': kind, 'w': w * scale, 'd': d * scale, 'h': rg.uniform(.034, .05) * (.9 + .1 * scale),
                'pitch': math.radians(rg.uniform(36, 46))}

    def shrink(self, s, f):
        s = dict(s)
        s['w'] *= f
        s['d'] *= f
        return s

    def footprint(self, s, c, a):
        """The rectangles a house takes (centre, angle, half sizes), eaves included."""
        out = [(c, a, s['w'] / 2 + .004, s['d'] / 2 + .004)]
        if s['kind'] == 'L':
            ex, ey = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
            ww, wd = s['d'] * .82, s['d'] * .75
            sg = s.get('lside', 1)
            wc = add(add(c, mul(ex, sg * (s['w'] / 2 - ww / 2))), mul(ey, s['d'] / 2 + wd / 2 - .006))
            out.append((wc, a, ww / 2 + .004, wd / 2 + .006))
        return out

    def try_house(self, s, c, a):
        fp = self.footprint(s, c, a)
        if all(self.grid.rect_free(*r) for r in fp):
            for r in fp:
                self.grid.rect_take(r[0], r[1], r[2] + .002, r[3] + .002)
            h = dict(s)
            h.update(c=c, a=a, roof=self.family(c), rnd=self.rg.random(),
                     wall=self.rg.choice(('town_plaster', 'town_plaster', 'town_plaster_warm', 'town_plaster_rose')))
            self.houses.append(h)
            return True
        return False

    def row(self, pts, off, side, scale=1.0, gap=(.0, .006), tries=5):
        """Houses along a polyline on one side (side = +1 left of its direction, -1 right), their fronts `off` from
        it, turned to it: rows along the lanes, rows with their backs to the walls."""
        L = length(pts)
        s = self.rg.uniform(0, .02)
        while s < L - .03:
            sp = self.spec(scale)
            sp['lside'] = self.rg.choice((-1, 1))
            placed = False
            for k in range(tries):
                if k:
                    sp = self.shrink(sp, .86)
                mid = s + sp['w'] / 2
                if mid > L:
                    break
                _, q, t, _ = closest(pts, point_at(pts, mid))
                n = perp(t) if side > 0 else mul(perp(t), -1)
                c = add(q, mul(n, off + sp['d'] / 2 + .004))
                ex = t if dot(perp(t), n) > 0 else mul(t, -1)
                if self.try_house(sp, c, ang(ex)):
                    s += sp['w'] + .008 + self.rg.uniform(*gap)
                    placed = True
                    break
            if not placed:
                s += .012

    def fill(self):
        """Every free spot left: a house turned to the nearest lane, wall or square, the biggest that fits."""
        cells = self.grid.free_cells(3)
        self.rg.shuffle(cells)
        guides = [ln['pts'] for ln in self.lanes] + self.walls + [self.square + self.square[:1]]
        for p in cells:
            if not self.grid.circle_free(p, .022):
                continue
            _, q, t, _ = min((closest(gp, p) for gp in guides), key=lambda x: x[0])
            for f in (1.0, .85, .72, .62):
                sp = self.shrink(self.spec(), f)
                if self.try_house(sp, p, ang(t)) or self.try_house(sp, p, ang(perp(t))):
                    break

    def layout(self):
        self.gate_list = self.gates()
        self.towers_layout()
        self.place_keep()
        self.lanes_layout()
        self.square_layout()
        self.grid_layout()
        self.layout_stalls()
        # houses: along the lanes, with their backs to the walls, round the square, then wherever there is room
        for ln in self.lanes:
            pts = ln['pts']
            for side in (1, -1):
                self.row(pts, LANE / 2 + .004, side, 1.05)
        for w in self.walls:
            _, q, t, _ = closest(w, w[len(w) // 2])
            side = 1 if inside_poly(add(q, mul(perp(t), .05)), self.poly) else -1
            self.row(w, WALL_B / 2 + .006, side, .95, (.0, .004))
        sq = self.square + self.square[:1]
        self.row(sq, .006, 1 if inside_poly(add(self.keep, (0, 0)), self.poly) and self._sq_out() > 0 else -1, 1.1)
        self.fill()
        self.layout_gardens()
        self.layout_life()

    def _sq_out(self):
        """+1 when the left of the square's outline (its points go round anti-clockwise in the game frame) is outside."""
        p0, p1 = self.square[0], self.square[1]
        mid = lerp(p0, p1, .5)
        n = perp(unit(sub(p1, p0)))
        return 1 if dist(add(mid, mul(n, .01)), self.keep) > dist(mid, self.keep) else -1

    def layout_stalls(self):
        if self.n < 2:
            return
        K = self.keep
        r = self.keep_reach + .036
        lane_angles = []
        for ln in self.lanes:
            pts = ln['pts']
            for p in pts:
                if dist(p, K) <= r + .02:
                    lane_angles.append(ang(sub(p, K)))
                    break
        count = 14
        a0 = self.rg.uniform(0, 2 * math.pi)
        for i in range(count):
            a = a0 + 2 * math.pi * i / count
            if any(abs((a - la + math.pi) % (2 * math.pi) - math.pi) < (LANE / 2 + .04) / r for la in lane_angles):
                continue
            c = add(K, (math.cos(a) * r, math.sin(a) * r))
            w, d = .05, .034
            ex = (-math.sin(a), math.cos(a))
            corners = [add(add(c, mul(ex, sx * w / 2)), mul((math.cos(a), math.sin(a)), sy * d / 2)) for sx in (-1, 1) for sy in (-1, 1)]
            if not all(self.inside(q, .008, .0) for q in corners):
                continue
            if any(dist(c, s['c']) < .058 for s in self.stalls):
                continue
            self.stalls.append({'c': c, 'a': ang(ex), 'out': (math.cos(a), math.sin(a)), 'col': self.rg.randrange(6)})

    # ---------------------------------------------------------- gardens, props, life
    def layout_gardens(self):
        cells = self.grid.free_cells(2)
        self.rg.shuffle(cells)
        self.gardens = []
        for p in cells:
            for r in (.034, .027, .021):
                if self.grid.circle_free(p, r):
                    self.grid.circle(p, r + .003)
                    kind = self.rg.random()
                    self.gardens.append({'c': p, 'r': r, 'kind': 'tree' if kind < .62 or r < .024 else 'veg'})
                    break
        # the last nooks: barrels, crates, a woodpile, bushes
        for p in self.grid.free_cells(2):
            if self.grid.circle_free(p, .012):
                self.grid.circle(p, .014)
                self.props.append({'c': p, 'kind': self.rg.choice(('barrel', 'barrel', 'crate', 'bush', 'bush', 'pot'))})

    def layout_life(self):
        rg = self.rg
        self.people, self.carts = [], []
        taken = [s['c'] for s in self.stalls]

        def free(p, r=.016):
            return all(dist(p, q) > r for q in taken) and self.inside(p, .004, .012)
        # folk along the lanes, a cart on the longest lane
        best = None
        for ln in self.lanes:
            pts = ln['pts']
            L = length(pts)
            if best is None or L > best[1]:
                best = (pts, L)
            for _ in range(max(1, int(L / .14))):
                s = rg.uniform(.07, max(.08, L - self.sq_r))
                p = point_at(pts, s)
                _, _, t, _ = closest(pts, p)
                p = add(p, mul(perp(t), rg.uniform(-.018, .018)))
                if free(p):
                    self.people.append({'c': p})
                    taken.append(p)
        if best and best[1] > .2:
            pts, L = best
            s = rg.uniform(.38, .55) * (L - self.sq_r) + .06
            p = point_at(pts, s)
            _, _, t, _ = closest(pts, p)
            p = add(p, mul(perp(t), .008))
            if free(p, .04):
                self.carts.append({'c': p, 'a': ang(t) + (math.pi if rg.random() < .5 else 0)})
                taken.append(p)
        # folk on the square: at the stalls and about
        K = self.keep
        for s in self.stalls:
            for _ in range(rg.choice((1, 1, 2))):
                p = add(add(s['c'], mul(s['out'], -.034)), mul(perp(s['out']), rg.uniform(-.02, .02)))
                if free(p, .014):
                    self.people.append({'c': p})
                    taken.append(p)
        for _ in range(int(10 + self.n * 3)):
            a = rg.uniform(0, 2 * math.pi)
            r = rg.uniform(self.keep_reach + .012, self.sq_r - .008)
            p = add(K, (math.cos(a) * r, math.sin(a) * r))
            if free(p, .016) and inside_poly(p, self.square):
                self.people.append({'c': p})
                taken.append(p)
            if len(self.people) > 8 + self.n * 5:
                break
        # a well or a fountain on the square
        self.fountain = None
        for _ in range(40):
            a = rg.uniform(0, 2 * math.pi)
            r = self.keep_reach + .034
            p = add(K, (math.cos(a) * r, math.sin(a) * r))
            if self.n >= 2 and free(p, .04) and inside_poly(p, self.square) and self.inside(p, .03, .03):
                self.fountain = {'c': p, 'big': self.n >= 3}
                taken.append(p)
                break

    # ---------------------------------------------------------- building it
    def build(self):
        materials(self.ctx)
        self.layout()
        self.ground()
        self.build_walls()
        self.build_keep()
        for s in self.stalls:
            self.stall(s)
        for h in self.houses:
            self.house(h)
        for g in self.gardens:
            self.garden(g)
        for p in self.props:
            self.prop(p)
        for c in self.carts:
            self.cart(c)
        if self.fountain:
            self.well(self.fountain)
        for p in self.people:
            self.person(p['c'])
        self.B.finish(self.ctx)
        # the ground the town takes outside its outline (towers, gatehouses), so nothing else stands there
        for t in self.towers:
            self.ctx.mask.take_circle(t['at'], t['r'] * 1.3 + .01)
        for g in self.gate_list:
            self.ctx.mask.take_circle(g['at'], .11)

    def ground(self):
        Bt = self.B
        # the cobbles: the town's outline, pushed past the card's edge along town sides (the face is clipped there)
        poly = []
        for p in self.poly:
            if hex_inset(p) < .002:
                p = mul(p, 1.03)
            poly.append(p)
        Bt.slab('town_cobble', poly, ZG)
        for ln in self.lanes:
            Bt.ribbon('town_lane', ln['pts'], LANE, ZL, ext=.04 if ln['edge'] else 0.0)
        K = B(self.keep)
        Bt.slab('town_square', self.square, ZS, uvf=lambda p: (p.x - K.x, p.y - K.y))

    # ---- the wall, its towers and gates
    def build_walls(self):
        Bt = self.B
        for w in self.walls:
            _, q, t, _ = closest(w, w[len(w) // 2])
            out = perp(t) if not inside_poly(add(q, mul(perp(t), .03)), self.poly) else mul(perp(t), -1)
            # which way the outside lies is the same all along one curve: the side of `out` at the middle
            sgn = 1 if dot(out, perp(t)) > 0 else -1
            prof = []
            s = 0.0
            for k, p in enumerate(w):
                a, b = w[max(k - 1, 0)], w[min(k + 1, len(w) - 1)]
                tt = unit(sub(b, a))
                n = mul(perp(tt), sgn)          # outward
                if k:
                    s += dist(p, w[k - 1])
                prof.append((p, n, s))
            # the body: a battered stone wall
            V, F, UV = [], [], []
            zb, zt = ZG - .006, ZG + WALL_H * U
            for k, (p, n, s) in enumerate(prof):
                for off, z in ((WALL_B / 2, zb), (WALL_T / 2, zt), (-WALL_T / 2, zt), (-WALL_B / 2, zb)):
                    V.append(tuple(B(add(p, mul(n, off)), z)))
                if k:
                    i = 4 * k
                    s0, s1 = prof[k - 1][2] * U, s * U
                    hgt = zt - zb
                    for j in range(3):
                        F.append((i - 4 + j, i + j, i + j + 1, i - 4 + j + 1))
                        if j == 1:
                            UV.append(((s0, 0), (s1, 0), (s1, WALL_T * U), (s0, WALL_T * U)))
                        else:
                            UV.append(((s0, 0), (s1, 0), (s1, hgt), (s0, hgt)))
            m = len(prof)
            F.append((0, 1, 2, 3))
            UV.append(((0, 0), (0, .1), (.1, .1), (.1, 0)))
            F.append((4 * m - 1, 4 * m - 2, 4 * m - 3, 4 * m - 4))
            UV.append(((0, 0), (0, .1), (.1, .1), (.1, 0)))
            Bt.mesh('town_wall', V, F, uvs=UV, recalc=True, rnd=.5)
            # the walkway: flagstones between a low parapet inside and the merlons outside
            Bt.ribbon('town_walltop', [p for p, _, _ in prof], WALL_T - .004, zt + .0012)
            inner = [add(p, mul(n, -(WALL_T / 2 - .004))) for p, n, _ in prof]
            Bt.ribbon('town_wall', inner, .008, zt + .006, rnd=.4)
            L = prof[-1][2]
            nm = max(2, int(L / .021))
            for i in range(nm):
                s = (i + .5) * L / nm
                p = point_at([p for p, _, _ in prof], s)
                _, q, tt, _ = closest([p for p, _, _ in prof], p)
                n = mul(perp(tt), sgn)
                c = add(q, mul(n, WALL_T / 2 - .0065))
                if hex_inset(c) < -.01:
                    continue
                Bt.box('town_wall', B(c, zt), .011 * U, .012 * U, .016 * U, rot=-ang(tt), rnd=.5 + .4 * self.rg.random(), uv=True)
        for t in self.towers:
            self.tower(t['at'], t['r'], WALL_H + .045, banner=self.rg.random() < .75)
        for g in self.gate_list:
            self.gatehouse(g)

    def tower(self, p, r, h, banner=True, cone=True, roof='red'):
        Bt = self.B
        c = B(p, ZG - .006)
        top = ZG + h * U
        Bt.cyl('town_wall', c, r * 1.1 * U, top - c.z, 16, r2=r * U, smooth=True, rnd=.5)
        Bt.cyl('town_walltop', (c.x, c.y, top), r * 1.18 * U, .014 * U, 16, smooth=True)
        z = top + .014 * U
        if cone:
            ch = r * 2.0 * U
            Bt.cyl('town_roof_' + roof, (c.x, c.y, z - .004), r * 1.32 * U, ch, 18, r2=0.0, rnd=self.rg.random())
            if banner:
                self.flag((c.x, c.y, z - .004 + ch - .01), .9 * r / TOWER_R)
        else:
            for i in range(8):
                a = 2 * math.pi * i / 8
                Bt.box('town_wall', (c.x + math.cos(a) * r * 1.05 * U, c.y + math.sin(a) * r * 1.05 * U, z), .012 * U, .014 * U, .014 * U, rot=a + math.pi / 2)

    def gatehouse(self, g):
        Bt = self.B
        p, t, into = g['at'], g['along'], g['into']
        road = self.ctx.geo['road']
        span = road + .03
        a = -ang(t)
        h = WALL_H + .016
        Bt.box('town_wall', B(p, ZG - .006), span * U, .076 * U, h * U + .006, rot=a, taper=.95, rnd=.55, uv=True)
        zt = ZG + h * U
        # a little tiled roof over the gate passage, the ridge across the road
        Bt.roof('town_roof_red', B(p, zt), span * .78 * U, .062 * U, .042 * U, a, .004, .006, self.rg.random())
        for sg in (-1, 1):
            q = add(p, mul(t, sg * (road / 2 + .03)))
            self.tower(q, .034, WALL_H + .06, banner=True)

    # ---- the keep: a little castle with four round towers, red cone roofs and red banners
    def build_keep(self):
        Bt = self.B
        k = self.k
        K = self.keep
        # it faces its first lane
        face = unit(sub(self.lanes[0]['pts'][0], K)) if self.lanes else (0.0, -1.0)
        a = ang(face)
        ex, ey = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
        S, Hb = .118 * k, .085 * k
        c = B(K, ZS)
        rot = -a
        Bt.box('town_wall', (c.x, c.y, ZS - .004), S * 1.12 * U, S * 1.12 * U, .014 * U, rot=rot, rnd=.3, uv=True)
        Bt.box('town_wall', (c.x, c.y, ZS), S * U, S * U, Hb * U, rot=rot, taper=.96, rnd=.55, uv=True)
        zt = ZS + Hb * U
        Bt.box('town_walltop', (c.x, c.y, zt - .002), S * .955 * U, S * .955 * U, .004, rot=rot, uv=True)
        # merlons round the top
        per = max(3, int(S / .02))
        for side in range(4):
            sa = a + side * math.pi / 2
            dn = (math.cos(sa), math.sin(sa))
            dt = perp(dn)
            for i in range(per):
                f = (i + .5) / per - .5
                q = add(add(K, mul(dn, S * .955 / 2 - .005 * k)), mul(dt, f * S * .86))
                Bt.box('town_wall', B(q, zt), .011 * k * U, .01 * k * U, .016 * k * U, rot=-ang(dt), rnd=.6)
        big = self.n >= 5
        if big:
            # the capital: a tall round donjon in the middle with the biggest cone and banner
            self.tower(K, .05 * k, (.085 + .095) * k + (ZS - ZG) / U, banner=True)
        else:
            # the hall: a tiled roof inside the battlements, a small lantern on its ridge in bigger towns
            Bt.roof('town_roof_red', (c.x, c.y, zt), S * .66 * U, S * .5 * U, .05 * k * U, rot, .004, .004, self.rg.random())
        # the gate front: a porch with its own little roof, towards the lane
        gp = add(K, mul(ex, S / 2 + .012 * k))
        g3 = B(gp, ZS)
        Bt.box('town_wall', g3, .03 * k * U, .046 * k * U, .056 * k * U, rot=rot, rnd=.5, uv=True)
        Bt.roof('town_roof_red', (g3.x, g3.y, g3.z + .056 * k * U), .03 * k * U, .046 * k * U, .026 * k * U, rot, .003, .004, self.rg.random())
        # four round corner towers
        flags = (0, 2) if k < .9 else (0, 1, 2, 3)
        for i, (sx, sy) in enumerate(((1, 1), (-1, 1), (-1, -1), (1, -1))):
            q = add(add(K, mul(ex, sx * S / 2)), mul(ey, sy * S / 2))
            self.tower(q, .03 * k, (.085 + .05) * k + (ZS - ZG) / U, banner=(i in flags) and not big)

    # ---- one house
    def house(self, h):
        Bt = self.B
        rg = self.rg
        c, a, w, d, H = h['c'], h['a'], h['w'], h['d'], h['h']
        ex, ey = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
        rot = -a
        roof = 'town_roof_' + h['roof']
        rnd = h['rnd']
        p3 = B(c, ZG)
        top = ZG + H * U
        Bt.box(h['wall'], p3, w * U, d * U, H * U, rot=rot, rnd=rnd)
        kind, pitch = h['kind'], h['pitch']
        if kind == 'deep':
            rh = w / 2 * math.tan(pitch)
            M, X, Y, rx = Bt.roof(roof, (p3.x, p3.y, top), d * U, w * U, rh * U, rot + math.pi / 2, .005, .007, rnd)
            ridge_dir, rw, rd = ey, d, w
        elif kind == 'hip':
            if w >= d:
                rh = d / 2 * math.tan(pitch)
                M, X, Y, rx = Bt.roof(roof, (p3.x, p3.y, top), w * U, d * U, rh * U, rot, .007, .007, rnd, hip=1.0)
                ridge_dir, rw, rd = ex, w, d
            else:
                rh = w / 2 * math.tan(pitch)
                M, X, Y, rx = Bt.roof(roof, (p3.x, p3.y, top), d * U, w * U, rh * U, rot + math.pi / 2, .007, .007, rnd, hip=1.0)
                ridge_dir, rw, rd = ey, d, w
        else:
            rh = d / 2 * math.tan(pitch)
            M, X, Y, rx = Bt.roof(roof, (p3.x, p3.y, top), w * U, d * U, rh * U, rot, .005, .007, rnd)
            ridge_dir, rw, rd = ex, w, d
        if kind == 'L':
            ww, wd = d * .82, d * .75
            sg = h.get('lside', 1)
            wc = add(add(c, mul(ex, sg * (w / 2 - ww / 2))), mul(ey, d / 2 + wd / 2 - .006))
            q3 = B(wc, ZG)
            Bt.box(h['wall'], q3, ww * U, (wd + .012) * U, H * U, rot=rot, rnd=rnd)
            wrh = ww / 2 * math.tan(pitch)
            # the wing's ridge runs back from inside the main roof
            wl = wd + d / 2
            wcc = add(add(c, mul(ex, sg * (w / 2 - ww / 2))), mul(ey, wl / 2))
            r3 = B(wcc, top)
            Bt.roof(roof, r3, wl * U, ww * U, wrh * U, rot + math.pi / 2, .005, .006, rnd)
        # a chimney through the roof, sooty on top
        if rg.random() < .72:
            fx = rg.uniform(-.32, .32) * rw
            fy = rg.choice((-1, 1)) * rd * rg.uniform(.12, .26)
            q = add(add(c, mul(ridge_dir, fx)), mul(perp(ridge_dir), fy))
            zc = top + rh * U * (1 - abs(fy) / (rd / 2)) * .5
            cz = top + rh * U + .012 * U
            q3 = B(q)
            sz = .013 * U
            Bt.box('stone_dark', (q3.x, q3.y, top), sz, sz, cz - top, rot=rot, rnd=.5)
            Bt.box('town_soot', (q3.x, q3.y, cz), sz * .62, sz * .62, .002, rot=rot)
        # roof windows that glow
        if rg.random() < .42 and rw > .06:
            sgn = rg.choice((-1, 1))
            for fx in ((rg.uniform(-.25, .25),) if rg.random() < .6 else (-.22, .22)):
                self.skylight(c, ridge_dir, rw, rd, rh, top, fx, sgn)
        # a dormer on bigger roofs
        if rw > .09 and rg.random() < .35 and kind in ('long', 'L'):
            sgn = rg.choice((-1, 1))
            fx = rg.uniform(-.2, .2) * rw
            self.dormer(c, ridge_dir, rd, rh, top, fx, sgn, roof, h['wall'], rnd)

    def skylight(self, c, rdir, rw, rd, rh, top, fx, sgn):
        """A small lit window lying in the roof slope (sgn picks the slope)."""
        n2 = mul(perp(rdir), sgn)
        f = .42                                   # how far up the slope
        q = add(add(c, mul(rdir, fx * rw)), mul(n2, rd / 2 * (1 - f)))
        z = top + rh * U * f
        # the slope's frame in Blender: along the ridge, up the slope, the normal
        ax = B(rdir).normalized()
        dn = B(n2)
        up = (Vector((-dn.x, -dn.y, 0)).normalized() * (rd / 2) * U + Vector((0, 0, rh * U))).normalized()
        nrm = ax.cross(up)
        if nrm.z < 0:
            nrm = -nrm
        o = B(q, z) + nrm * .0025
        a, b = .0085 * U, .0075 * U
        V = [tuple(o + ax * sx * a + up * sy * b) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        V2 = [tuple(o + ax * sx * (a + .0025 * U) + up * sy * (b + .0025 * U) - nrm * .0012) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        face = (0, 1, 2, 3)
        if (Vector(V[1]) - Vector(V[0])).cross(Vector(V[2]) - Vector(V[1])).z < 0:
            face = (3, 2, 1, 0)
        self.B.mesh('timber', V2, [face])
        self.B.mesh('town_glow', V, [face])

    def dormer(self, c, rdir, rd, rh, top, fx, sgn, roof, wall, rnd):
        """A little gabled dormer on the roof slope, its window towards the street."""
        n2 = mul(perp(rdir), sgn)
        dw, dd = .026, rd * .42
        q = add(add(c, mul(rdir, fx)), mul(n2, rd / 2 - dd / 2 - .004))
        z0 = top + .002
        q3 = B(q, z0)
        rot = -ang(rdir)
        dh = rh * U * .62
        self.B.box(wall, q3, dw * U, dd * U, dh, rot=rot, rnd=rnd)
        self.B.roof(roof, (q3.x, q3.y, z0 + dh), dd * U, dw * U, dw * .5 * U, rot + math.pi / 2, .003, .003, rnd)

    # ---- the market and the square
    def stall(self, s):
        Bt = self.B
        c, a, out = s['c'], s['a'], s['out']
        rot = -a
        ex = (math.cos(a), math.sin(a))
        w, d = .05, .034
        cl = 'cloth%d' % (0, 1, 2, 3, 4, 5)[s['col']]
        for sx in (-1, 1):
            for sy in (-1, 1):
                q = add(add(c, mul(ex, sx * w / 2)), mul(out, sy * d / 2))
                Bt.box('timber', B(q, ZS), .004 * U, .004 * U, (.03 if sy < 0 else .037) * U, rot=rot)
        Bt.box('wood', B(add(c, mul(out, -.006)), ZS), w * .92 * U, d * .5 * U, .016 * U, rot=rot)
        # the striped awning, sloping down towards the shoppers
        n = 6
        for i in range(n):
            u0, u1 = -w / 2 - .005 + (w + .01) * i / n, -w / 2 - .005 + (w + .01) * (i + 1) / n
            P = []
            for u, v, z in ((u0, -d / 2 - .009, .028), (u1, -d / 2 - .009, .028), (u1, d / 2 + .004, .04), (u0, d / 2 + .004, .04)):
                P.append(tuple(B(add(add(c, mul(ex, u)), mul(out, -v)), ZS + z * U)))
            mat = cl if i % 2 == 0 else 'town_awning_white'
            f = (0, 1, 2, 3)
            if (Vector(P[1]) - Vector(P[0])).cross(Vector(P[2]) - Vector(P[1])).z < 0:
                f = (3, 2, 1, 0)
            Bt.mesh(mat, P + [(p[0], p[1], p[2] - .004) for p in P], [f, tuple(i + 4 for i in reversed(f))])
        # goods out front: crates of fruit, a barrel
        fr = ('town_fruit_red', 'town_fruit_orange', 'town_fruit_yellow', 'town_fruit_green')
        for i, u in enumerate((-.017, .0, .017)):
            if self.rg.random() < .25:
                continue
            q = add(add(c, mul(ex, u)), mul(out, -(d / 2 + .016)))
            q3 = B(q, ZS)
            Bt.box('wood', q3, .013 * U, .013 * U, .007 * U, rot=rot)
            fm = self.rg.choice(fr)
            for j in range(4):
                o = ((j % 2) - .5) * .006 * U, ((j // 2) - .5) * .006 * U
                Bt.blob(fm, (q3.x + o[0], q3.y + o[1], q3.z + .008 * U), .0035 * U, sub=1)

    def well(self, f):
        Bt = self.B
        c = B(f['c'], ZS)
        if f['big']:
            # a fountain: a round stone basin of turquoise water, a column with a bowl in the middle
            Bt.cyl('town_wall', c, .032 * U, .012 * U, 20, rnd=.4)
            Bt.cyl('town_walltop', (c.x, c.y, c.z + .012 * U), .032 * U, .002 * U, 20, r2=.032 * U)
            Bt.cyl('water', (c.x, c.y, c.z + .011 * U), .026 * U, .0015 * U, 20)
            Bt.cyl('town_wall', (c.x, c.y, c.z), .006 * U, .03 * U, 10, rnd=.4)
            Bt.cyl('town_walltop', (c.x, c.y, c.z + .03 * U), .012 * U, .004 * U, 12, r2=.014 * U)
            Bt.cyl('water', (c.x, c.y, c.z + .033 * U), .011 * U, .0012 * U, 12)
        else:
            # a well: a stone ring, dark water, a little tiled roof on two posts
            Bt.cyl('town_wall', c, .018 * U, .014 * U, 16, rnd=.4)
            Bt.cyl('water_deep', (c.x, c.y, c.z + .012 * U), .013 * U, .0015 * U, 16)
            for sx in (-1, 1):
                Bt.box('timber', (c.x + sx * .015 * U, c.y, c.z), .004 * U, .004 * U, .04 * U)
            Bt.roof('town_roof_dark', (c.x, c.y, c.z + .04 * U), .036 * U, .026 * U, .014 * U, 0.0, .002, .003, .5)

    # ---- gardens and the little things
    def garden(self, g):
        Bt = self.B
        rg = self.rg
        c, r = g['c'], g['r']
        q3 = B(c, ZG)
        Bt.cyl('town_garden', (q3.x, q3.y, ZG - .002), r * U, .004 + .002, 18, r2=r * .96 * U, smooth=False)
        if g['kind'] == 'tree':
            s = r / .034
            self.fruit_tree(c, .92 * s)
        else:
            # rows of cabbages and carrots on dark soil
            a = rg.uniform(0, math.pi)
            ex = (math.cos(a), math.sin(a))
            Bt.box('town_soil', (q3.x, q3.y, ZG + .002), r * 1.25 * U, r * 1.25 * U, .003, rot=-a)
            for i in range(-1, 2):
                for j in range(-1, 2):
                    p = add(add(c, mul(ex, i * r * .4)), mul(perp(ex), j * r * .4))
                    Bt.blob(rg.choice(('leaf_light', 'leaf', 'town_garden')), tuple(B(p, ZG + .008)), .0065 * U, sz=.7, sub=1, jitter=.3, rg=rg)

    def fruit_tree(self, p, s=1.0):
        Bt = self.B
        rg = self.rg
        c = B(p, ZG)
        Bt.cyl('trunk', c, .006 * U * s, .03 * U * s, 6)
        leaf = rg.choice(('leaf', 'leaf', 'leaf_light', 'leaf_dark'))
        fruit = rg.choice(('town_fruit_red', 'town_fruit_red', 'town_fruit_orange', 'town_fruit_yellow'))
        lumps = [(0, 0, .042, .026), (-.014, .006, .036, .019), (.014, -.004, .037, .019), (.002, -.012, .05, .017)]
        for dx, dy, dz, r in lumps:
            Bt.blob(leaf, (c.x + dx * U * s, c.y + dy * U * s, c.z + dz * U * s), r * U * s, sz=.9, sub=2, jitter=.22, rg=rg)
        for _ in range(9):
            a = rg.uniform(0, 2 * math.pi)
            rr = rg.uniform(.004, .022) * s
            z = c.z + (.042 + .022 * math.sqrt(max(0, 1 - (rr / (.027 * s)) ** 2))) * U * s
            Bt.blob(fruit, (c.x + math.cos(a) * rr * U, c.y + math.sin(a) * rr * U, z), .0042 * U * s, sub=1)

    def prop(self, p):
        Bt = self.B
        rg = self.rg
        c = B(p['c'], ZG)
        k = p['kind']
        if k == 'barrel':
            Bt.cyl('wood', c, .009 * U, .018 * U, 10, r2=.0085 * U)
            Bt.cyl('timber', (c.x, c.y, c.z + .018 * U), .0075 * U, .001, 10)
        elif k == 'crate':
            Bt.box('wood', c, .016 * U, .016 * U, .014 * U, rot=rg.uniform(0, 3))
        elif k == 'pot':
            Bt.cyl('roof_brown', c, .007 * U, .01 * U, 8, r2=.009 * U)
            for _ in range(3):
                o = (rg.uniform(-.004, .004) * U, rg.uniform(-.004, .004) * U)
                Bt.blob('flower%d' % rg.randrange(6), (c.x + o[0], c.y + o[1], c.z + .013 * U), .004 * U, sub=1)
        else:
            Bt.blob(rg.choice(('leaf', 'leaf_light')), (c.x, c.y, c.z + .006 * U), .013 * U, sz=.75, sub=2, jitter=.3, rg=rg)

    def cart(self, cr):
        Bt = self.B
        rg = self.rg
        c, a = cr['c'], cr['a']
        ex, ey = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
        rot = -a
        q = B(c, ZL)
        Bt.box('wood', (q.x, q.y, q.z + .009 * U), .05 * U, .03 * U, .008 * U, rot=rot)
        for sg in (-1, 1):
            w3 = B(add(c, mul(ey, sg * .018)), ZL)
            Bt.box('timber', w3, .024 * U, .005 * U, .024 * U, rot=rot)
            s3 = B(add(add(c, mul(ex, .036)), mul(ey, sg * .009)), ZL)
            Bt.box('timber', (s3.x, s3.y, s3.z + .012 * U), .03 * U, .003 * U, .003 * U, rot=rot)
        load = rg.random()
        if load < .45:
            Bt.blob('hay', (q.x, q.y, q.z + .02 * U), .02 * U, sz=.55, sub=2, jitter=.2, rg=rg, sx=1.25, rot=rot)
        elif load < .75:
            for i in (-1, 0, 1):
                b3 = B(add(c, mul(ex, i * .015)), ZL + .017 * U)
                Bt.cyl('wood', b3, .007 * U, .014 * U, 10, r2=.0065 * U)
        else:
            for i in range(4):
                b3 = B(add(add(c, mul(ex, (i % 2 - .5) * .022)), mul(ey, (i // 2 - .5) * .013)), ZL + .022 * U)
                Bt.blob('wool', tuple(b3), .009 * U, sz=.7, sub=1, jitter=.2, rg=rg)
        # the donkey
        d3 = B(add(c, mul(ex, .062)), ZL)
        Bt.blob('town_donkey', (d3.x, d3.y, d3.z + .02 * U), .011 * U, sx=1.6, sz=.8, sub=2, rot=rot)
        h3 = B(add(c, mul(ex, .084)), ZL)
        Bt.blob('town_donkey', (h3.x, h3.y, h3.z + .026 * U), .0065 * U, sx=1.3, sub=1, rot=rot)
        for sg in (-1, 1):
            e3 = B(add(add(c, mul(ex, .08)), mul(ey, sg * .004)), ZL)
            Bt.blob('dark', (e3.x, e3.y, e3.z + .032 * U), .0028 * U, sz=1.6, sub=1)
        for sx in (-1, 1):
            for sy in (-1, 1):
                l3 = B(add(add(c, mul(ex, .062 + sx * .01)), mul(ey, sy * .005)), ZL)
                Bt.cyl('town_donkey', l3, .0025 * U, .014 * U, 5)
        p3 = B(add(c, mul(ex, .1)), ZL)
        self.person(add(c, add(mul(ex, .074), mul(ey, .016))))

    def person(self, p, s=1.0):
        Bt = self.B
        rg = self.rg
        c = B(p, ZS if inside_poly(p, self.square) else ZL)
        cl = 'cloth%d' % rg.randrange(8)
        Bt.cyl('dark', c, .0055 * U * s, .018 * U * s, 8)
        Bt.cyl(cl, (c.x, c.y, c.z + .015 * U * s), .0088 * U * s, .021 * U * s, 10, r2=.006 * U * s)
        Bt.blob('skin', (c.x, c.y, c.z + .041 * U * s), .0058 * U * s, sub=1)
        if rg.random() < .45:
            Bt.cyl(rg.choice(('hay', 'dark', 'cloth0', 'cloth1', 'cloth6')), (c.x, c.y, c.z + .044 * U * s), .0085 * U * s, .003 * U * s, 10, r2=.004 * U * s)

    def flag(self, top, s=1.0):
        """A pole with a gold finial and a swallow-tailed red banner streaming in the wind, its cloth lying low enough
        to be read from above."""
        Bt = self.B
        x, y, z = top
        pole = .04 * U * s
        Bt.cyl('timber', (x, y, z), .0022 * U * s, pole, 6)
        zt = z + pole
        Bt.blob('gold', (x, y, zt + .003 * U * s), .0042 * U * s, sub=1)
        a = self.wind + self.rg.uniform(-.25, .25)
        d = Vector((math.cos(a), math.sin(a), 0))
        side = Vector((-d.y, d.x, 0))
        L, Hh = .058 * U * s, .03 * U * s
        cols = 7
        V, F = [], []
        tilt = math.radians(62)                     # the cloth's height turned towards the horizontal
        across = side * math.sin(tilt) + Vector((0, 0, -1)) * math.cos(tilt)
        for i in range(cols + 1):
            u = i / cols
            for j in range(3):
                v = j / 2
                uu = u - (.22 if (i == cols and j == 1) else 0)
                p = Vector((x, y, zt - .002)) + d * (L * uu) + across * (Hh * v)
                p += Vector((0, 0, 1)) * math.sin(u * 5.0 + .4) * .006 * U * s * u
                p += side * math.sin(u * 4.0) * .004 * U * s * u
                p += Vector((0, 0, -1)) * (.006 * U * s * u * u)
                V.append(tuple(p))
        for i in range(cols):
            for j in range(2):
                a0 = i * 3 + j
                F.append((a0, a0 + 3, a0 + 4, a0 + 1))
        made = Bt.mesh('banner', V, F, smooth=True)
        # face it up so it reads from above, both sides lit (a thin solid would cost more for nothing)
        bm = Bt.parts['banner'][0]
        for f in made:
            if f.normal.z < 0 or (f.normal.length == 0):
                pass
        Bt.mesh('banner', [tuple(Vector(v) - Vector((0, 0, .0015))) for v in V], [tuple(reversed(f)) for f in F], smooth=True)


def point_at(pts, s):
    """The point at arc length s along a polyline."""
    acc = 0.0
    for a, b in zip(pts, pts[1:]):
        L = dist(a, b)
        if acc + L >= s and L > 0:
            return lerp(a, b, (s - acc) / L)
        acc += L
    return pts[-1]


def build(ctx):
    if not ctx.sh.get('town'):
        return
    Town(ctx).build()
