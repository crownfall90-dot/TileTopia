"""Classic 2.0 cards, rendered: every six-sided card type as a detailed, lively diorama seen from straight above.

    node scripts/gen-hex-defs.mjs        (the card shapes from src/engine/hex.js, once after changing it)
    blender -b -P tools/blender_generators/generate_hex_tiles.py -- [--only hC1,hRS] [--modules terrain,water,...]
            [--out build/hex-render] [--res 1280] [--samples 96] [--device gpu|cpu]
    python scripts/hex-pack.py           (PNG renders → app/src/main/assets/hex/*.webp, plus a contact sheet)

Every card is built by the modules in hexgen/ in this order: terrain (the grass, the stone curb), water (rivers,
the spring, the bridge), roads (roads, plazas, the dead end), town (walls, keep, houses, market, townsfolk),
monastery, life (woods, meadows, herds, farms, people on the free ground). A module left out (--modules) is replaced
by plain flat shapes, so each can be worked on alone. All shapes come from hex_shapes.json, the game's geometry:
the owner colours the game paints over a card lie exactly on the rendered road, wall and monastery.
"""
import bpy
import importlib
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ORDER = ['terrain', 'water', 'roads', 'town', 'monastery', 'life']


def arg(argv, name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


def main(argv):
    from hexgen import core
    importlib.reload(core)
    only = arg(argv, '--only')
    ids = only.split(',') if only else list(core.SHAPES['types'])
    mods = arg(argv, '--modules', ','.join(ORDER)).split(',')
    out = os.path.abspath(arg(argv, '--out', os.path.join(ROOT, 'build', 'hex-render')))
    res, samples = int(arg(argv, '--res', 1280)), int(arg(argv, '--samples', 96))
    os.makedirs(out, exist_ok=True)
    loaded = {}
    for m in ORDER:
        if m in mods:
            mod = importlib.import_module('hexgen.' + m)
            importlib.reload(mod)
            loaded[m] = mod
    for tid in ids:
        t0 = time.time()
        bpy.ops.wm.read_homefile(use_empty=True)
        mats = core.Mats()
        mats.stock()
        ctx = core.Ctx(tid, mats)
        if 'terrain' not in loaded:
            core.base_card(ctx)
        core.plain_features(ctx, [m for m in ('water', 'roads', 'town', 'monastery') if m not in loaded])
        for m in ORDER:
            if m in loaded:
                loaded[m].build(ctx)
        core.scene(samples, res, arg(argv, '--device', 'gpu'))
        if '--no-render' in argv:
            continue
        bpy.context.scene.render.filepath = os.path.join(out, tid + '.png')
        bpy.ops.render.render(write_still=True)
        print('HEX', tid, '%.1fs' % (time.time() - t0), flush=True)


if __name__ == '__main__':
    main(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
