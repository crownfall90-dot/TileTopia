"""The monastery (cards hF and hFR): the card the game scores when all six neighbours are laid.

Within the ellipse geo.fort (.22 x .2 card heights) round ctx.sh['fort']: a low stone enclosure wall with a roofed gate
to the south (on hFR the road from side 3 ends at it), a church with a cross-shaped red tiled roof and a round apse,
a bell tower with a slate spire and a gold cross, a cloister round a garden with a fountain, a vegetable plot in rows,
beehives, apple trees, flower and herb beds, hens, doves and monks in brown habits. Outside the ellipse the ground is
left to the life module (the core already holds the fort's ground in ctx.mask).

Seen from straight above, so walls hardly show: the buildings read by their roofs (tiles in rows, lit and shaded
slopes, ridges) and their shadows, the grounds by clear colour clusters. Laid out in Blender units round the fort
centre: x east, y north (up in the picture); the card is 2 units tall.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

from . import core

PI = math.pi


def T(x, y, z=0.0):
    return Matrix.Translation(Vector((x, y, z)))


def Rz(a):
    return Matrix.Rotation(a, 4, 'Z')


def Ry(a):
    return Matrix.Rotation(a, 4, 'Y')


def Rx(a):
    return Matrix.Rotation(a, 4, 'X')


def S(x, y=None, z=None):
    return Matrix.Diagonal((x, x if y is None else y, x if z is None else z, 1.0))


# ------------------------------------------------------------------ materials of this module
def _mat_tiles(ctx, name, c1, c2, mortar, bw, rh, rough=.55, bump=.5):
    """Roof tiles in rows: a brick pattern on the roof's UVs (u along the eave, v down the slope from the ridge),
    each row raised toward its lower edge so the rows overlap like real tiles."""
    if name in ctx.mats.m:
        return ctx.mats.m[name]
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Roughness'].default_value = rough
    tc = nt.nodes.new('ShaderNodeTexCoord')
    br = nt.nodes.new('ShaderNodeTexBrick')
    br.offset = .5
    br.offset_frequency = 2
    br.inputs['Scale'].default_value = 1.0
    br.inputs['Mortar Size'].default_value = .0028
    br.inputs['Mortar Smooth'].default_value = .3
    br.inputs['Bias'].default_value = 0.0
    br.inputs['Brick Width'].default_value = bw
    br.inputs['Row Height'].default_value = rh
    br.inputs['Color1'].default_value = (*core.hexcol(c1), 1)
    br.inputs['Color2'].default_value = (*core.hexcol(c2), 1)
    br.inputs['Mortar'].default_value = (*core.hexcol(mortar), 1)
    nt.links.new(tc.outputs['UV'], br.inputs['Vector'])
    nt.links.new(br.outputs['Color'], b.inputs['Base Color'])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs['Vector'])
    div = nt.nodes.new('ShaderNodeMath')
    div.operation = 'DIVIDE'
    div.inputs[1].default_value = rh
    nt.links.new(sep.outputs['Y'], div.inputs[0])
    fr = nt.nodes.new('ShaderNodeMath')
    fr.operation = 'FRACT'
    nt.links.new(div.outputs[0], fr.inputs[0])
    mix = nt.nodes.new('ShaderNodeMath')      # the row ramp, minus the joints between tiles
    mix.operation = 'MULTIPLY_ADD'
    nt.links.new(br.outputs['Fac'], mix.inputs[0])
    mix.inputs[1].default_value = -.6
    nt.links.new(fr.outputs[0], mix.inputs[2])
    bp = nt.nodes.new('ShaderNodeBump')
    bp.inputs['Strength'].default_value = bump
    bp.inputs['Distance'].default_value = .004
    nt.links.new(mix.outputs[0], bp.inputs['Height'])
    nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    ctx.mats.m[name] = m
    return m


def materials(ctx):
    g = ctx.mat
    _mat_tiles(ctx, 'mon_roof', '#dc5a2e', '#c4472a', '#7c2a17', .046, .022)
    _mat_tiles(ctx, 'mon_roof_cl', '#c8683a', '#b0532f', '#6e2c18', .04, .02)
    _mat_tiles(ctx, 'mon_slate', '#6a809a', '#566a82', '#2e3a48', .03, .016, rough=.45)
    g('mon_lawn', '#74c040', .9, '#5daa31', 7)
    g('mon_lawn_dark', '#4f9e2c', .9, '#3f8a24', 7)
    g('mon_gravel', '#eadcb6', .95, '#cdb98f', 42, bump=.5)
    g('mon_soil', '#7c5534', .95, '#5f3f25', 22, bump=.6)
    g('mon_soil_dark', '#5e3e24', .95, '#4a301b', 22, bump=.6)
    g('mon_wall', '#e3d3ae', .8, '#bba786', 14)
    g('mon_cap', '#f1e4c4', .75, '#d2c09a', 16)
    g('habit', '#7a4e2c', .85, '#62401f', 30)
    g('habit_grey', '#8a7a68', .85, '#6f6252', 30)
    g('hair', '#3d2717', .8)
    g('rope', '#e8d7a6', .8)
    g('skep', '#e2ae46', .85, '#b98a30', 30, bump=.4)
    g('cabbage', '#86b86e', .7, '#5f9a52', 30)
    g('cabbage_red', '#8a4a8e', .7, '#6a3470', 30)
    g('lettuce', '#a8dc52', .7, '#86c040', 30)
    g('carrot_top', '#3f9a2a', .8)
    g('pumpkin', '#f08a22', .55, '#d06a14', 18)
    g('pumpkin_leaf', '#3d8f2c', .8, '#2e7a22', 12)
    g('lavender', '#9a7ee0', .8, '#7a5cc4', 40)
    g('sage', '#9fb88a', .85, '#86a274', 30)
    g('apple', '#e0352a', .45)
    g('hen', '#fbf7ee', .8)
    g('comb', '#e0302a', .6)
    g('beak', '#f2b13a', .6)
    g('book', '#a8322a', .6)
    g('metal', '#9aa0a6', .35, metal=.8)
    g('bench_wood', '#8a5a32', .75, '#6e4626', 9)


# ------------------------------------------------------------------ geometry gathered per material
class Kit:
    """Geometry collected per material, one object each (hundreds of small parts stay cheap to build and render)."""

    def __init__(self, ctx, origin):
        self.ctx = ctx
        self.o = origin
        self.parts = {}

    def bm(self, mat, bevel=0.0):
        k = (mat, round(bevel, 5))
        if k not in self.parts:
            self.parts[k] = bmesh.new()
        return self.parts[k]

    def W(self, M=None):
        return T(self.o[0], self.o[1]) @ (M if M is not None else Matrix.Identity(4))

    @staticmethod
    def _shade(verts, smooth):
        for f in {f for v in verts for f in v.link_faces}:
            f.smooth = smooth and len(f.verts) <= 4

    def box(self, mat, M, sx, sy, sz, bevel=.004):
        r = bmesh.ops.create_cube(self.bm(mat, bevel), size=1.0, matrix=self.W(M) @ T(0, 0, sz / 2) @ S(sx, sy, sz))
        self._shade(r['verts'], False)

    def cyl(self, mat, M, r1, h, seg=12, r2=None, smooth=True, bevel=0.0):
        r = bmesh.ops.create_cone(self.bm(mat, bevel), cap_ends=True, cap_tris=False, segments=seg, radius1=r1,
                                  radius2=r1 if r2 is None else r2, depth=h, matrix=self.W(M) @ T(0, 0, h / 2))
        self._shade(r['verts'], smooth)

    def ball(self, mat, M, r, sub=2, sz=1.0, jitter=0.0, rnd=None):
        W = self.W(M)
        res = bmesh.ops.create_icosphere(self.bm(mat), subdivisions=sub, radius=r, matrix=W @ S(1, 1, sz))
        if jitter:
            c = W.translation
            rnd = rnd or self.ctx.rnd
            for v in res['verts']:
                v.co += (v.co - c).normalized() * (rnd.random() - .5) * jitter * r
        self._shade(res['verts'], True)

    def lathe(self, mat, M, prof, seg=12, smooth=True):
        """A body of revolution about local z from (r, z) profile points (r = 0 closes a pole)."""
        bm = self.bm(mat)
        W = self.W(M)
        rings = []
        for r, z in prof:
            if r < 1e-7:
                rings.append([bm.verts.new(W @ Vector((0, 0, z)))])
            else:
                rings.append([bm.verts.new(W @ Vector((r * math.cos(2 * PI * i / seg), r * math.sin(2 * PI * i / seg), z))) for i in range(seg)])
        fs = []
        for A, B in zip(rings, rings[1:]):
            if len(A) == 1 and len(B) == 1:
                continue
            for i in range(seg):
                j = (i + 1) % seg
                if len(A) == 1:
                    fs.append(bm.faces.new((A[0], B[j], B[i])))
                elif len(B) == 1:
                    fs.append(bm.faces.new((A[i], A[j], B[0])))
                else:
                    fs.append(bm.faces.new((A[i], A[j], B[j], B[i])))
        if len(rings[0]) > 1:
            fs.append(bm.faces.new(list(reversed(rings[0]))))
        if len(rings[-1]) > 1:
            fs.append(bm.faces.new(rings[-1]))
        bmesh.ops.recalc_face_normals(bm, faces=fs)
        for f in fs:
            f.smooth = smooth and len(f.verts) <= 4

    def mesh(self, mat, verts, faces, M=None, smooth=False, bevel=0.0):
        """A closed mesh from local points; faces are index tuples or (indices, uvs) pairs."""
        bm = self.bm(mat, bevel)
        W = self.W(M)
        vs = [bm.verts.new(W @ Vector(v)) for v in verts]
        lay = bm.loops.layers.uv.verify()
        fs = []
        for f in faces:
            idx, uv = (f if isinstance(f[0], (tuple, list)) else (f, None))
            face = bm.faces.new([vs[i] for i in idx])
            face.smooth = smooth
            if uv:
                for loop, q in zip(face.loops, uv):
                    loop[lay].uv = q
            fs.append(face)
        bmesh.ops.recalc_face_normals(bm, faces=fs)
        return fs

    def slab(self, mat, poly, z, thick=.03, M=None):
        """A flat closed piece in the shape of a 2D polygon (local Blender units), top at z."""
        n = len(poly)
        verts = [(p[0], p[1], z) for p in poly] + [(p[0], p[1], z - thick) for p in poly]
        faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
        faces += [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)]
        self.mesh(mat, verts, faces, M)

    def flush(self):
        for (mat, bevel), bm in self.parts.items():
            me = bpy.data.meshes.new('mon_' + mat)
            bm.to_mesh(me)
            bm.free()
            ob = core.link(bpy.data.objects.new('mon_' + mat, me))
            ob.data.materials.append(self.ctx.mat(mat))
            if bevel:
                md = ob.modifiers.new('bevel', 'BEVEL')
                md.width = bevel
                md.segments = 2
                md.limit_method = 'ANGLE'
        self.parts = {}


# ------------------------------------------------------------------ roofs (tiles need UVs: u along the eave, v down the slope)
def roof_gable(k, mat, c, L, Wd, ze_wall, rise, ang, o=.018, oe=(.018, .018), t=.012):
    """A gabled roof over an L x Wd footprint, ridge along L turned by ang, eaves at ze_wall; returns the ridge height."""
    hw = Wd / 2
    pitch = rise / hw
    wo = hw + o
    ze = ze_wall - o * pitch
    zr = ze_wall + rise
    x0, x1 = -L / 2 - oe[0], L / 2 + oe[1]
    sl = math.hypot(wo, zr - ze)
    tt = t * math.sqrt(1 + pitch * pitch)
    prof = [(-wo, ze), (0, zr), (wo, ze), (wo, ze - t), (0, zr - tt), (-wo, ze - t)]
    verts = [(x, y, z) for x in (x0, x1) for (y, z) in prof]
    faces = [((0, 6, 7, 1), [(x0, sl), (x1, sl), (x1, 0), (x0, 0)]),
             ((1, 7, 8, 2), [(-x0, 0), (-x1, 0), (-x1, sl), (-x0, sl)])]
    for a in (2, 3, 4, 5):
        b = (a + 1) % 6
        faces.append((a, a + 6, b + 6, b))
    faces += [(5, 4, 3, 2, 1, 0), (6, 7, 8, 9, 10, 11)]
    k.mesh(mat, verts, faces, T(c[0], c[1]) @ Rz(ang))
    return zr


def roof_halfcone(k, mat, c, r, ze_wall, rise, ang, o=.018, t=.012, n=10):
    """Half a cone (an apse roof) over a half circle of radius r facing direction ang, apex at the ridge height."""
    pitch = rise / r
    ro = r + o
    ze = ze_wall - o * pitch
    zr = ze_wall + rise
    sl = math.hypot(ro, zr - ze)
    tt = t * math.sqrt(1 + pitch * pitch)
    angs = [-PI / 2 + PI * i / n for i in range(n + 1)]
    verts = [(0, 0, zr), (0, 0, zr - tt)]
    verts += [(ro * math.cos(a), ro * math.sin(a), ze) for a in angs]
    verts += [(ro * math.cos(a), ro * math.sin(a), ze - t) for a in angs]
    top, bot = 2, 3 + n
    faces = []
    for i in range(n):
        u0, u1 = angs[i] * ro, angs[i + 1] * ro
        faces.append(((top + i, top + i + 1, 0), [(u0, sl), (u1, sl), ((u0 + u1) / 2, 0)]))
        faces.append((top + i + 1, top + i, bot + i, bot + i + 1))
        faces.append((bot + i, 1, bot + i + 1))
    faces.append((top, 0, top + n, bot + n, 1, bot))     # the flat side against the gable of the chancel
    k.mesh(mat, verts, faces, T(c[0], c[1]) @ Rz(ang), smooth=False)
    return zr


def roof_hip(k, mat, c, hx, hy, ze_wall, rise, ang=0.0, o=.018, t=.012):
    """A hipped roof (a pyramid when hx == hy) over a 2hx x 2hy footprint; the ridge runs along the longer side."""
    sh = min(hx, hy)
    pitch = rise / sh
    ex, ey = hx + o, hy + o
    ze = ze_wall - o * pitch
    zr = ze_wall + rise
    rx, ry = hx - sh, hy - sh                 # half length of the ridge (0 = a point)
    sl = math.hypot(sh + o, zr - ze)
    C = [(ex, ey), (-ex, ey), (-ex, -ey), (ex, -ey)]
    Rr = [(rx, ry), (-rx, ry), (-rx, -ry), (rx, -ry)]
    verts = [(x, y, ze) for x, y in C] + [(x, y, zr) for x, y in Rr] + [(x, y, ze - t) for x, y in C]
    faces = []
    for i in range(4):
        j = (i + 1) % 4
        d = Vector((C[j][0] - C[i][0], C[j][1] - C[i][1])).normalized()
        u = lambda p: p[0] * d.x + p[1] * d.y
        quad = [i, j, 4 + j, 4 + i]
        uv = [(u(C[i]), sl), (u(C[j]), sl), (u(Rr[j]), 0), (u(Rr[i]), 0)]
        if Rr[i] == Rr[j]:
            quad, uv = quad[:3], uv[:3]
        faces.append((tuple(quad), uv))
        faces.append((j, i, 8 + i, 8 + j))
    faces.append((8, 9, 10, 11))
    k.mesh(mat, verts, faces, T(c[0], c[1]) @ Rz(ang))
    return zr


def roof_ring(k, mat, c, half, depth, ze_wall, rise, o=.016, t=.01):
    """The cloister roof: a hipped ring round a square court, outer and inner eaves, a square ridge."""
    hr = half - depth / 2
    pitch = rise / (depth / 2)
    ho, hi = half + o, half - depth - o
    ze = ze_wall - o * pitch
    zr = ze_wall + rise
    sl = math.hypot(depth / 2 + o, zr - ze)
    C = [(1, 1), (-1, 1), (-1, -1), (1, -1)]
    verts = [(x * ho, y * ho, ze) for x, y in C] + [(x * hr, y * hr, zr) for x, y in C] + [(x * hi, y * hi, ze) for x, y in C]
    verts += [(x * ho, y * ho, ze - t) for x, y in C] + [(x * hi, y * hi, ze - t) for x, y in C]
    faces = []
    for i in range(4):
        j = (i + 1) % 4
        d = Vector((C[j][0] - C[i][0], C[j][1] - C[i][1])).normalized()
        u = lambda p, s: (p[0] * d.x + p[1] * d.y) * s
        faces.append(((i, j, 4 + j, 4 + i), [(u(C[i], ho), sl), (u(C[j], ho), sl), (u(C[j], hr), 0), (u(C[i], hr), 0)]))
        faces.append(((4 + i, 4 + j, 8 + j, 8 + i), [(u(C[i], hr), 0), (u(C[j], hr), 0), (u(C[j], hi), sl), (u(C[i], hi), sl)]))
        faces.append((j, i, 12 + i, 12 + j))
        faces.append((8 + i, 8 + j, 16 + j, 16 + i))
        faces.append((12 + i, 12 + j, 16 + j, 16 + i))
    k.mesh(mat, verts, faces, T(c[0], c[1]))
    return zr


def ridge(k, mat, a, b, z, r=.011):
    """Half-round ridge tiles from a to b (local x, y) at height z."""
    d = Vector((b[0] - a[0], b[1] - a[1]))
    L = d.length
    M = T((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z) @ Rz(math.atan2(d.y, d.x)) @ Ry(PI / 2) @ T(0, 0, -L / 2)
    k.cyl(mat, M, r, L, seg=8)


# ------------------------------------------------------------------ the monastery
class Monastery:
    # enclosure: the wall's centre line (Blender units; the outer face stays inside geo.fort = .44 x .40)
    AW, BW = .414, .374
    WT, WH = .046, .07          # wall thickness, height
    GATE = .068                 # half the gate opening
    Y0 = .132                   # the church's axis (east-west)

    def __init__(self, ctx):
        self.ctx = ctx
        self.rnd = ctx.rnd
        f = ctx.sh['fort']
        self.o = core.to3(f).to_2d()
        self.k = Kit(ctx, self.o)
        self.ai, self.bi = self.AW - self.WT / 2, self.BW - self.WT / 2      # the inner face (the lawn)

    # ---- helpers
    def xe(self, y, inset=0.0):
        """Half width of the inner lawn at height y, inset from the wall."""
        a, b = self.ai - inset, self.bi - inset
        return a * math.sqrt(max(0.0, 1 - (y / b) ** 2))

    def inside(self, p, r=0.0):
        a, b = self.ai - r, self.bi - r
        return (p[0] / a) ** 2 + (p[1] / b) ** 2 <= 1

    def build(self):
        materials(self.ctx)
        self.grounds()
        self.wall()
        self.church()
        self.cloister()
        self.garden()
        self.hives()
        self.orchard()
        self.beds()
        self.people()
        self.k.flush()

    # ---- the ground inside: a manicured lawn, gravel paths and the yard before the church
    def grounds(self):
        k = self.k
        n = 96
        lawn = [(self.ai * math.cos(2 * PI * i / n), self.bi * math.sin(2 * PI * i / n)) for i in range(n)]
        k.slab('mon_lawn', lawn, .004, .03)
        # the path from the gate to the yard, and the yard before the south door of the transept
        gy = -self.BW
        k.slab('mon_gravel', rrect(-.045, gy - .01, .045, -.06, .0), .008, .02)
        k.slab('mon_gravel', rrect(-.07, -.1, .2, -.012, .03), .008, .02)
        # a paved apron inside the gate
        k.slab('mon_gravel', [(.085 * math.cos(a), gy + .03 + .07 * math.sin(a)) for a in [PI * i / 16 for i in range(17)]] , .0085, .02)

    # ---- the enclosure wall with its gate
    def wall(self):
        k = self.k
        A, B, hw, h = self.AW, self.BW, self.WT / 2, self.WH
        tg = math.acos(min(1.0, (self.GATE + .035) / A))
        t0, t1 = -PI / 2 + (PI / 2 - tg), 3 * PI / 2 - (PI / 2 - tg)   # from the gate's east post round to its west post
        n = 140
        verts, faces = [], []
        pts = []
        for i in range(n + 1):
            t = t0 + (t1 - t0) * i / n
            p = Vector((A * math.cos(t), B * math.sin(t)))
            nn = Vector((math.cos(t) / A, math.sin(t) / B)).normalized()
            a, b = p - nn * hw, p + nn * hw
            verts += [(a.x, a.y, -.01), (b.x, b.y, -.01), (b.x, b.y, h), (a.x, a.y, h)]
            pts.append(p)
        for i in range(n):
            a, b = 4 * i, 4 * (i + 1)
            faces += [(a + 1, b + 1, b + 2, a + 2), (a + 3, a + 2, b + 2, b + 3), (a, a + 3, b + 3, b), (a, b, b + 1, a + 1)]
        faces += [(0, 1, 2, 3), (4 * n + 3, 4 * n + 2, 4 * n + 1, 4 * n)]
        k.mesh('mon_wall', verts, faces)
        # coping stones along the top, small gaps between them
        L = [0.0]
        for a, b in zip(pts, pts[1:]):
            L.append(L[-1] + (b - a).length)
        step = .052
        s = step / 2
        i = 0
        while s < L[-1] - step / 3:
            while L[i + 1] < s:
                i += 1
            f = (s - L[i]) / (L[i + 1] - L[i])
            p = pts[i].lerp(pts[i + 1], f)
            d = pts[i + 1] - pts[i]
            k.box('mon_cap', T(p.x, p.y, h) @ Rz(math.atan2(d.y, d.x)), step - .006, self.WT + .01, .014, bevel=.004)
            s += step
        # the gate: two posts with stone caps, a little tiled roof, the doors swung open inward
        gy = -B
        for sx in (-1, 1):
            x = sx * (self.GATE + .035)
            y = -B * math.sqrt(1 - (x / A) ** 2)
            k.box('mon_wall', T(x, y), .07, .07, .15, bevel=.005)
            k.cyl('mon_cap', T(x, y, .15) @ Rz(PI / 4), .055, .03, seg=4, r2=.0, smooth=False)
            k.ball('mon_cap', T(x, y, .186), .012, sub=1)
            # door leaf, hinged at the post, opened inward along the wall
            hx = sx * self.GATE
            k.box('wood', T(hx, y + .035) @ Rz(PI / 2 + sx * .25) @ T(.03, 0, 0), .06, .01, .11, bevel=.002)
        zr = roof_gable(k, 'mon_roof', (0, gy), .2, .085, .15, .05, 0.0, o=.016, oe=(.02, .02))
        ridge(k, 'roof_dark', (-.115, gy), (.115, gy), zr, .009)

    # ---- the church: nave, transept, chancel and apse; the bell tower at the west front
    def church(self):
        k = self.k
        y0 = self.Y0
        Wd, he, rise = .13, .16, .085
        nx0, cx = -.165, .125               # nave from the tower; centre of the crossing
        ax = .245                           # apse centre (end of the chancel)
        ty = .158                           # transept half length
        k.box('stone', T((nx0 + ax) / 2, y0), ax - nx0, Wd, he, bevel=.004)
        k.box('stone', T(cx, y0), Wd, 2 * ty, he, bevel=.004)
        k.cyl('stone', T(ax, y0), Wd / 2, he, seg=20)
        zr = roof_gable(k, 'mon_roof', ((nx0 + ax) / 2, y0), ax - nx0, Wd, he, rise, 0.0, oe=(.0, .0))
        roof_gable(k, 'mon_roof', (cx, y0), 2 * ty, Wd, he, rise, PI / 2, oe=(.018, .018))
        roof_halfcone(k, 'mon_roof', (ax, y0), Wd / 2, he, rise, 0.0)
        ridge(k, 'roof_dark', (nx0, y0), (ax, y0), zr)
        ridge(k, 'roof_dark', (cx, y0 - ty - .018), (cx, y0 + ty + .018), zr)
        # a little lantern on the crossing: a gold ball
        k.ball('gold', T(cx, y0, zr + .012), .014, sub=2)
        # the porch over the south door of the transept
        py = y0 - ty
        k.box('stone', T(cx, py - .02), .06, .04, .09, bevel=.003)
        roof_gable(k, 'mon_roof', (cx, py - .022), .05, .07, .09, .03, PI / 2, o=.01, oe=(.012, .0))
        # bell tower: stone, a slate spire, a gold orb and cross
        tx, s, th = -.225, .12, .27
        k.box('stone', T(tx, y0), s, s, th, bevel=.006)
        k.box('mon_cap', T(tx, y0, th - .006), s + .02, s + .02, .02, bevel=.004)
        zt = roof_hip(k, 'mon_slate', (tx, y0), s / 2 + .006, s / 2 + .006, th + .012, .17, o=.0)
        k.ball('gold', T(tx, y0, zt + .006), .014, sub=2)
        k.box('gold', T(tx, y0, zt + .01), .012, .012, .085, bevel=.002)
        k.box('gold', T(tx, y0, zt + .06), .055, .012, .012, bevel=.002)
        # doves on the ridge
        for x, y, z in ((-.1, y0, zr), (-.02, y0, zr), (cx, y0 + .1, zr)):
            k.ball('hen', T(x, y, z + .008) @ Rz(self.rnd.random() * 6), .01, sub=1, sz=.8)
            k.ball('hen', T(x + .009, y, z + .016), .006, sub=1)

    # ---- the cloister: a tiled walk round a garden with a fountain
    def cloister(self):
        k = self.k
        cxc, cyc, half, dep = -.19, -.05, .12, .055
        he, rise = .085, .035
        hi = half - dep
        # walls of the walk (outer) and arcades (inner posts)
        for i in range(4):
            a = PI / 2 * i
            M = T(cxc, cyc) @ Rz(a)
            k.box('stone', M @ T(half - .01, 0), .02, 2 * half, he, bevel=.003)
            k.box('stone', M @ T(hi + .006, 0), .012, 2 * hi + .012, .02, bevel=.002)
            for j in range(5):
                q = -hi + 2 * hi * j / 4
                k.cyl('mon_cap', M @ T(hi + .006, q), .007, he, seg=8)
        k.slab('mon_gravel', rrect(cxc - half + .01, cyc - half + .01, cxc + half - .01, cyc + half - .01, 0), .006, .02)
        zr = roof_ring(k, 'mon_roof_cl', (cxc, cyc), half, dep, he, rise)
        # garden: four lawns, gravel cross, a fountain, clipped box balls and roses
        k.slab('mon_lawn_dark', rrect(cxc - hi, cyc - hi, cxc + hi, cyc + hi, 0), .01, .02)
        w = .013
        k.slab('mon_gravel', rrect(cxc - hi, cyc - w, cxc + hi, cyc + w, 0), .012, .01)
        k.slab('mon_gravel', rrect(cxc - w, cyc - hi, cxc + w, cyc + hi, 0), .012, .01)
        k.cyl('mon_gravel', T(cxc, cyc), .036, .012, seg=24)
        # fountain: an octagonal basin, water, a column with a bowl, a jet
        k.cyl('mon_cap', T(cxc, cyc, .012), .027, .022, seg=8, smooth=False, bevel=.002)
        k.cyl('water', T(cxc, cyc, .012), .021, .019, seg=16)
        k.cyl('mon_cap', T(cxc, cyc, .012), .006, .045, seg=8)
        k.cyl('mon_cap', T(cxc, cyc, .055), .004, .006, seg=12, r2=.012)
        k.cyl('water', T(cxc, cyc, .06), .009, .002, seg=12)
        k.ball('foam', T(cxc, cyc, .066), .005, sub=1, sz=1.4)
        for sx in (-1, 1):
            for sy in (-1, 1):
                q = (cxc + sx * (hi + w) / 2, cyc + sy * (hi + w) / 2)
                k.ball('leaf_dark', T(q[0], q[1], .02), .013, sub=2)
                for a in range(3):
                    aa = a * 2 * PI / 3 + .4
                    p = (q[0] + math.cos(aa) * .02, q[1] + math.sin(aa) * .02)
                    k.ball('leaf', T(p[0], p[1], .014), .008, sub=1)
                    k.ball('flower%d' % ((sx + sy + a) % 6), T(p[0], p[1], .021), .0045, sub=1)

    # ---- the vegetable plot: soil in rows, cabbages, carrots, pumpkins, lettuces, beans
    def garden(self):
        k = self.k
        y_top, y_bot, x0 = -.125, -.3, .055
        poly = [(x0, y_top)]
        ys = [y_top + (y_bot - y_top) * i / 12 for i in range(13)]
        poly += [(self.xe(y, .03), y) for y in ys]
        poly += [(x0, y_bot)]
        k.slab('mon_soil', poly, .009, .02)
        rows = ['cabbage', 'carrot', 'pumpkin', 'lettuce', 'cabbage_red', 'beans']
        n = 5
        for r in range(n):
            y = y_top - .02 - r * (y_top - y_bot - .04) / (n - 1)
            x1 = self.xe(y, .05)
            if x1 - x0 < .05:
                continue
            k.slab('mon_soil_dark', rrect(x0 + .012, y - .01, x1, y + .01, .0), .014, .01)
            kind = rows[r % len(rows)]
            step = {'pumpkin': .042, 'beans': .032}.get(kind, .026)
            x = x0 + .025
            while x < x1 - .005:
                self.plant(kind, (x + self.rnd.uniform(-.003, .003), y))
                x += step

    def plant(self, kind, p):
        k, x, y = self.k, p[0], p[1]
        rr = self.rnd.uniform(.9, 1.1)
        if kind in ('cabbage', 'cabbage_red'):
            k.ball(kind, T(x, y, .016), .014 * rr, sub=2, sz=.8, jitter=.25)
            k.ball('lettuce' if kind == 'cabbage' else 'cabbage_red', T(x - .003, y + .003, .024), .007 * rr, sub=1)
        elif kind == 'lettuce':
            k.ball('lettuce', T(x, y, .014), .012 * rr, sub=2, sz=.65, jitter=.35)
        elif kind == 'carrot':
            for a in range(3):
                aa = a * 2 * PI / 3 + self.rnd.random()
                k.cyl('carrot_top', T(x, y, .012) @ Rz(aa) @ Ry(.45), .004, .028, seg=5, r2=.0, smooth=False)
            k.ball('pumpkin', T(x, y, .012), .004, sub=1)
        elif kind == 'pumpkin':
            k.ball('pumpkin_leaf', T(x - .01, y + .006, .012), .016, sub=1, sz=.4, jitter=.3)
            k.ball('pumpkin_leaf', T(x + .012, y - .004, .012), .013, sub=1, sz=.4, jitter=.3)
            k.ball('pumpkin', T(x, y - .002, .018), .015 * rr, sub=2, sz=.75)
            k.cyl('trunk', T(x, y - .002, .028), .002, .008, seg=5)
        elif kind == 'beans':
            for a in (0, 2.1, 4.2):
                k.cyl('timber', T(x + math.cos(a) * .012, y + math.sin(a) * .012, .01) @ Rz(a) @ Ry(-.25), .0022, .07, seg=5)
            for z, r in ((.03, .013), (.05, .011), (.068, .008)):
                k.ball('leaf_light', T(x, y, z), r, sub=1, jitter=.4)

    # ---- straw beehives (skeps) on a bench, south of the cloister
    def hives(self):
        k = self.k
        y = -.235
        xs = (-.255, -.205, -.155)
        k.box('bench_wood', T(-.205, y), .16, .045, .02, bevel=.003)
        prof = [(.0, .0), (.021, .0), (.0225, .006), (.0205, .011), (.0215, .016), (.0185, .022), (.019, .026),
                (.0155, .031), (.0155, .034), (.011, .039), (.0105, .041), (.005, .044), (0, .045)]
        for i, x in enumerate(xs):
            k.lathe('skep', T(x, y + (.004 if i % 2 else -.004), .02), prof, seg=14)
            k.box('dark', T(x, y - .021, .02), .012, .004, .008, bevel=0)

    # ---- apple trees and a few bushes in the free corners
    def apple_tree(self, p, s=1.0):
        k = self.k
        x, y = p
        k.cyl('trunk', T(x, y), .013 * s, .09 * s, seg=8)
        crown = []
        for dx, dy, dz, r in ((0, 0, .1, .056), (-.03, .02, .085, .04), (.032, -.012, .088, .04), (.008, .03, .12, .036)):
            c = (x + dx * s, y + dy * s, (dz) * s)
            k.ball(self.rnd.choice(('leaf', 'leaf', 'leaf_light')), T(*c), r * s, sub=2, sz=.9, jitter=.2)
            crown.append((c, r * s))
        for _ in range(9):
            c, r = self.rnd.choice(crown)
            a, el = self.rnd.random() * 2 * PI, self.rnd.uniform(.35, 1.2)
            q = (c[0] + math.cos(a) * math.cos(el) * r * .95, c[1] + math.sin(a) * math.cos(el) * r * .95, c[2] + math.sin(el) * r * .85)
            k.ball('apple', T(*q), .0075 * s, sub=1)

    def orchard(self):
        self.apple_tree((-.085, -.255), .9)
        self.apple_tree((.3, -.04), 1.0)
        self.apple_tree((.255, .225), .75)
        for p in ((-.33, .2), (-.36, -.12), (.345, .12)):
            core.bush(self.ctx, self.B(p), 1.0, z=.004)

    def B(self, p):
        return (self.o[0] + p[0], self.o[1] + p[1])

    # ---- flowers along the yard and the wall by the gate, lavender and sage north of the church
    def beds(self):
        k = self.k
        cols = [0, 1, 2, 3, 4, 5]

        def flower_clump(p, i):
            k.ball(self.rnd.choice(('leaf', 'leaf_light')), T(p[0], p[1], .012), .012, sub=1, sz=.7, jitter=.3)
            for a in range(3):
                aa = a * 2 * PI / 3 + self.rnd.random()
                q = (p[0] + math.cos(aa) * .007, p[1] + math.sin(aa) * .007)
                k.ball('flower%d' % cols[(i + a) % 6], T(q[0], q[1], .02), .0045, sub=1)

        # along the inside of the wall on both sides of the gate
        for side in (-1, 1):
            for i in range(6):
                t = -PI / 2 + side * (.42 + i * .1)
                p = (self.xe(0) * 0 + (self.ai - .03) * math.cos(t), (self.bi - .03) * math.sin(t))
                flower_clump(p, i + (3 if side > 0 else 0))
        # before the nave, east of the cloister
        for i in range(3):
            flower_clump((-.045 + i * .035, .03), i)
        # lavender and sage rows north of the nave
        for r, y in enumerate((.245, .285)):
            x1 = min(.04, self.xe(y, .04))
            x = -.15
            while x < x1:
                kind = 'lavender' if (r + int((x + 1) / .03)) % 4 else 'sage'
                k.ball(kind, T(x, y, .014), .015, sub=2, sz=.8, jitter=.35)
                x += .03

    # ---- monks in brown habits, hens about the plot
    def monk(self, p, ang, pose='stand', hood=False, item=None, s=1.3, cloth='habit'):
        k = self.k
        M = T(p[0], p[1], .006) @ Rz(ang) @ S(s)
        if pose == 'bend':
            M = M @ Ry(.55)
        k.cyl(cloth, M, .021, .058, seg=10, r2=.013)
        k.cyl('rope', M @ T(0, 0, .034), .0172, .004, seg=10)
        k.ball(cloth, M @ T(-.002, 0, .056), .016, sub=2, sz=.62)
        for sy in (-1, 1):
            k.ball(cloth, M @ T(.006, sy * .014, .047), .0075, sub=1)
        k.ball('skin', M @ T(.015, 0, .046), .0055, sub=1)
        if hood:
            k.ball(cloth, M @ T(-.002, 0, .071), .0125, sub=2)
            k.ball('skin', M @ T(.007, 0, .07), .0072, sub=1)
        else:
            k.ball(cloth, M @ T(-.01, 0, .062), .009, sub=1, sz=.7)      # the cowl down on the back
            k.ball('skin', M @ T(0, 0, .07), .0105, sub=2)
            k.ball('hair', M @ T(0, 0, .0705), .0113, sub=2, sz=.62)
            k.ball('skin', M @ T(0, 0, .076), .0062, sub=1, sz=.8)       # the tonsure
        if item == 'hoe':
            k.box('timber', M @ T(.03, -.012, .0) @ Ry(-.5), .004, .004, .085, bevel=0)
            k.box('metal', M @ T(.047, -.012, .0), .014, .016, .004, bevel=0)
        elif item == 'basket':
            k.box('bench_wood', M @ T(.018, .016, .03), .022, .018, .014, bevel=.002)
            k.ball('lettuce', M @ T(.018, .016, .045), .007, sub=1)
        elif item == 'book':
            k.box('book', M @ T(.02, 0, .046), .012, .018, .004, bevel=0)
            k.box('rope', M @ T(.02, 0, .049), .011, .016, .0015, bevel=0)
        elif item == 'can':
            k.cyl('metal', M @ T(.016, .018, .02), .007, .014, seg=8)

    def hen(self, p, ang):
        k = self.k
        M = T(p[0], p[1], .006) @ Rz(ang)
        k.ball('hen', M @ T(0, 0, .012), .011, sub=2, sz=.8)
        k.ball('hen', M @ T(-.011, 0, .017), .006, sub=1)
        k.ball('hen', M @ T(.01, 0, .022), .0058, sub=1)
        k.ball('comb', M @ T(.011, 0, .028), .003, sub=1)
        k.ball('beak', M @ T(.016, 0, .022), .0022, sub=1)

    def people(self):
        rnd = self.rnd
        self.monk((.15, -.19), PI, 'bend', item='hoe')
        self.monk((.235, -.155), -2.3, item='basket')
        self.monk((.0, -.24), PI / 2, hood=True)
        self.monk((.035, -.065), PI - .3, item='book')
        self.monk((.085, -.075), -.2, cloth='habit_grey')
        self.monk((-.15, -.1), .8, hood=False, item='book')
        self.monk((-.205, -.285), PI / 2, hood=True, cloth='habit_grey')
        self.monk((-.05, .3), -.4, item='can')
        for i, (x, y) in enumerate(((.25, -.095), (.29, -.11), (.33, -.075), (.215, -.06))):
            self.hen((x, y), rnd.random() * 2 * PI)


def rrect(x0, y0, x1, y1, r, n=4):
    """A rectangle with rounded corners (r = 0: square), counterclockwise."""
    if r <= 0:
        return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -PI / 2), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, PI / 2), (x0 + r, y0 + r, PI)):
        for i in range(n + 1):
            a = a0 + PI / 2 * i / n
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def build(ctx):
    if not ctx.sh.get('fort'):
        return
    Monastery(ctx).build()
