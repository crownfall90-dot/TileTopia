"""Lakes, the large bridge, the mine and the cliff in the square deck."""

import math

from . import core, water
from .core import U, V6, blob, box, inside_poly, prism, ribbon, sample, slab, to3


def shore_point(side, offset, depth):
    x, y = V6[side]
    return (x * (.5 - depth) - y * offset, y * (.5 - depth) + x * offset)


def bank_radius(side, gap, radius):
    return radius - .055 * (gap - 1) + (.019, -.008, .012, -.015)[side]


def lake_outline(sides, width, radius):
    points = []
    for i, side in enumerate(sides):
        following = sides[(i + 1) % len(sides)]
        gap = (following - side) % 4
        angle = (side - 1 + gap / 2) * math.pi / 2
        x, y = math.cos(angle), math.sin(angle)
        bank = bank_radius(side, gap, radius)
        a = shore_point(side, width / 2, -.009)
        b = shore_point(following, -width / 2, -.009)
        centre = (x * bank, y * bank)
        in_from = (centre[0] + y * .062, centre[1] - x * .062)
        out_to = (centre[0] - y * .062, centre[1] + x * .062)
        points.append(shore_point(side, -width / 2, -.009))
        points += sample([a, shore_point(side, width / 2, .105), in_from, centre], 14)
        points += sample([centre, out_to, shore_point(following, -width / 2, .105), b], 14)[1:-1]
    return points


def bay_outline(padding):
    far = .509
    reach = .36 + padding
    inner = -.11 - padding
    return sample([(far, reach), (.11, reach + .018), (inner, .24), (inner, 0)], 20) + sample(
        [(inner, 0), (inner, -.24), (.11, -reach - .018), (far, -reach)], 20)[1:]


def reserve(ctx):
    sh = ctx.sh
    if 'lake' in sh:
        ctx.mask.take_poly(lake_outline(sh['lake'], ctx.geo['bank'] + .025, .38))
    if 'bridgeHalf' in sh:
        ctx.mask.take_poly(bay_outline(.034))
        ctx.mask.take_line([(-.17, 0), (.51, 0)], .12)
    if 'mine' in sh:
        ctx.mask.take_circle((.015, .045), .18)
    if 'cliff' in sh:
        ctx.mask.take_poly([(-.51, -.035), (.51, -.035), (.51, .51), (-.51, .51)])


def ripples(ctx, outline, count, avoid=0):
    """Place small highlights away from the join and the bridge deck."""
    glint = ctx.mat('lake_glint', '#66b9db', .22, emit=.12)
    placed = 0
    for _ in range(95):
        x, y = (ctx.rnd.uniform(-.38, .38) for _ in range(2))
        length = ctx.rnd.uniform(.019, .059)
        pts = core.quad((x - length, y), (x, y - length * .24), (x + length, y - .008), 10)
        if abs(y) < avoid or not all(inside_poly(p, outline) for p in pts):
            continue
        ribbon(pts, ctx.rnd.uniform(.0018, .0035), .0106, glint, 'water_glint', thick=.001)
        placed += 1
        if placed == count:
            break


def deep_lake_material(ctx):
    """Tint the open water with broad tonal variation, fading to the river colour at each join."""
    material = ctx.mat('lake_depth', '#1c78b6', .13, spec=.55)
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    coord = nodes.new('ShaderNodeTexCoord').outputs['Object']
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 2.3
    noise.inputs['Detail'].default_value = 2.5
    links.new(coord, noise.inputs['Vector'])
    tones = nodes.new('ShaderNodeValToRGB')
    for stop, position, colour in zip(tones.color_ramp.elements, (.18, .83), ('#155f9e', '#2b94c4')):
        stop.position = position
        stop.color = (*core.hexcol(colour), 1)
    links.new(noise.outputs['Fac'], tones.inputs['Fac'])
    absolute = nodes.new('ShaderNodeVectorMath')
    absolute.operation = 'ABSOLUTE'
    links.new(coord, absolute.inputs[0])
    axes = nodes.new('ShaderNodeSeparateXYZ')
    links.new(absolute.outputs['Vector'], axes.inputs['Vector'])
    outer = nodes.new('ShaderNodeMath')
    outer.operation = 'MAXIMUM'
    links.new(axes.outputs['X'], outer.inputs[0])
    links.new(axes.outputs['Y'], outer.inputs[1])
    fade = nodes.new('ShaderNodeMapRange')
    fade.interpolation_type = 'SMOOTHSTEP'
    fade.inputs['From Min'].default_value = .64
    fade.inputs['From Max'].default_value = .96
    links.new(outer.outputs[0], fade.inputs['Value'])
    mix = nodes.new('ShaderNodeMixRGB')
    mix.inputs['Color2'].default_value = (*core.hexcol('#1c78b6'), 1)
    links.new(fade.outputs['Result'], mix.inputs['Fac'])
    links.new(tones.outputs['Color'], mix.inputs['Color1'])
    links.new(mix.outputs['Color'], shader.inputs['Base Color'])
    return material


def lake(ctx, sides):
    g = ctx.geo
    water.mats(ctx)
    for name, width, radius, height in (
        ('sand', g['bank'], .372, .004),
        ('w_wet', (g['bank'] + g['water']) / 2, .352, .0055),
        ('foam', g['water'] + .012, .34, .007),
        ('w_shallow', g['water'], .332, .008),
        ('w_mid', g['water'] * .72, .301, .0085),
    ):
        slab(lake_outline(sides, width, radius), height, ctx.mat(name), 'lake_' + name)
    slab(lake_outline(sides, g['water'] * .4, .274), .009, deep_lake_material(ctx), 'lake_depth')
    ripples(ctx, lake_outline(sides, g['water'] * .65, .288), 19)
    for i, side in enumerate(sides):
        gap = (sides[(i + 1) % len(sides)] - side) % 4
        angle = (side - 1 + gap / 2) * math.pi / 2
        x, y = math.cos(angle), math.sin(angle)
        distance = bank_radius(side, gap, .37)
        water.reeds(ctx, to3((x * (distance + .008), y * (distance + .008))).to_2d(), 1.8)
        core.rock(ctx, to3((x * (distance + .032) + .024 * y, y * (distance + .032) - .024 * x)).to_2d(), .83)
        water.reeds(ctx, to3((x * (distance + .013) - y * .055, y * (distance + .013) + x * .055)).to_2d(), 1.2)
        for j, (depth, drift) in enumerate(((.06, -.047), (.067, -.012), (.099, -.037), (.077, .024))):
            r = distance - depth
            water.lily(ctx, to3((x * r + y * drift, y * r - x * drift)).to_2d(), flower=(i + j) % 3 == 0)
    if len(sides) == 4:
        water.boat(ctx, to3((.056, -.045)).to_2d(), .45)
    else:
        for x, y in ((-.10, -.07), (-.068, -.04), (-.036, -.02)):
            water.duck(ctx, to3((x, y)).to_2d(), 2.5)


def big_bridge(ctx):
    water.mats(ctx)
    for name, padding, height in (
        ('sand', .022, .004), ('w_wet', .012, .0055), ('foam', .007, .007),
        ('w_shallow', 0, .008), ('w_mid', -.026, .0085), ('w_deep', -.066, .009),
    ):
        slab(bay_outline(padding), height, ctx.mat(name), 'bay_' + name)
    ripples(ctx, bay_outline(-.034), 8, avoid=.115)
    for x, y in ((-.05, .26), (-.052, -.25), (.16, .337), (.14, -.336)):
        water.reeds(ctx, to3((x, y)).to_2d(), 1.45)
    for x, y in ((.12, -.257), (.15, -.24), (.282, .239), (.309, .26)):
        water.lily(ctx, to3((x, y)).to_2d(), flower=x in (.12, .309))

    length, width, count = .67 * U, ctx.geo['road'] * U * 1.42, 13
    step = length / count
    for i in range(count):
        t = (i + .5) / count
        x = -.163 * U + t * length
        height = .014 + .128 * math.sin(t * math.pi / 2) ** 1.35
        box((x, 0, .005), (step * 1.015, width, height), ctx.mat('stone'), 'large_bridge', bevel=.003)
        for lane in (-1, 1):
            box((x + (lane * .014 if i < count - 1 else 0), lane * width * .185, height),
                (step * .99, width * .355, .013), ctx.mat('cobble'), 'paving', bevel=.002)
            box((x, lane * width * .43, height), (step * 1.02, width * .145, .066),
                ctx.mat('stone_dark'), 'parapet', bevel=.004)
            box((x, lane * width * .43, height + .062), (step, width * .175, .014),
                ctx.mat('stone_rim'), 'coping', bevel=.003)
    for y in (-width * .43, width * .43):
        box((-.145 * U, y, .009), (.096, .07, .12), ctx.mat('stone'), 'abutment', bevel=.009)


def mine(ctx):
    rock = ctx.mat('rock')
    for i, (x, y, size) in enumerate(((-.10, .065, .15), (-.082, .13, .19), (.04, .16, .19),
                                      (.118, .10, .16), (.132, .006, .105), (-.12, -.02, .11))):
        pos = to3((x, y))
        blob((pos.x, pos.y, size * .38), size, rock, 'mine_outcrop', sz=.71, jitter=.37, rnd=ctx.rnd)
        if i % 2 == 0:
            blob((pos.x - size * .22, pos.y + size * .15, size * .86), size * .56,
                 ctx.mat('grass_dark'), 'moss', sz=.22, jitter=.29, rnd=ctx.rnd)
    slab([(-.062, -.085), (.063, -.085), (.056, .06), (-.056, .06)], .014, ctx.mat('dark'), 'mine_entry')
    for x in (-.127, .127):
        box((x, .106, 0), (.046, .057, .155), ctx.mat('timber'), 'portal_support')
    box((0, .105, .132), (.302, .07, .047), ctx.mat('wood'), 'portal_beam', bevel=.006)
    for y in (.095, .135, .175, .215, .255, .295):
        box((0, y, .014), (.139, .025, .012), ctx.mat('wood'), 'sleeper', bevel=.002)
    for x in (-.043, .043):
        box((x, .154, .025), (.013, .316, .019), ctx.mat('stone_dark'), 'rail', bevel=.001)
    box((0, .224, .039), (.107, .085, .04), ctx.mat('timber'), 'ore_cart', bevel=.004)
    box((0, .224, .079), (.082, .061, .007), ctx.mat('rock'), 'ore', bevel=.004)
    for x in (-.054, .054):
        box((x, .224, .047), (.017, .072, .013), ctx.mat('stone_dark'), 'cart_wheels', bevel=.002)
    prism((-.183, .193), .021, .053, 8, ctx.mat('window'), 'lantern', z0=.035)
    core.person(ctx, (.21, .224), 1.12, cloth='cloth2')


def cliff(ctx):
    for i in range(26):
        x = -.49 + i * .039
        y = ctx.rnd.uniform(-.027, -.009)
        if abs(x) < .064:
            continue
        pos = to3((x, y))
        rr = ctx.rnd.uniform(.023, .053)
        blob((pos.x, pos.y, rr * .34), rr, ctx.mat('rock' if i % 3 else 'soil'), 'cliff_stone',
             sz=.8, jitter=.43, rnd=ctx.rnd)
    for x in (-.16, -.052, .052, .16):
        box((x, .071, .003), (.029, .032, .096), ctx.mat('timber'), 'fence_post', bevel=.004)
    box((0, .071, .052), (.345, .022, .019), ctx.mat('wood'), 'cliff_barrier', bevel=.003)


def build(ctx):
    sh = ctx.sh
    if 'lake' in sh:
        lake(ctx, sh['lake'])
    if 'bridgeHalf' in sh:
        big_bridge(ctx)
    if 'mine' in sh:
        mine(ctx)
    if 'cliff' in sh:
        cliff(ctx)
