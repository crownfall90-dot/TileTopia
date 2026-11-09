import bpy
import bmesh
import math
import os
import time

def setup_cycles(w=1024, h=500, samples=96):
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
    s.render.film_transparent = False
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.render.resolution_x = w
    s.render.resolution_y = h
    s.render.resolution_percentage = 100

def clean_all():
    for c in list(bpy.data.collections):
        for o in list(c.objects): c.objects.unlink(o)
    for t in (bpy.data.objects, bpy.data.meshes, bpy.data.materials,
              bpy.data.textures, bpy.data.images, bpy.data.lights, bpy.data.cameras, bpy.data.worlds):
        for item in list(t): t.remove(item, do_unlink=True)

def create_cardboard_tile(name, image_path, loc=(0,0,0), rot_z=0):
    # Thick board game tile: 1.0 x 1.0 x 0.04
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    tile = bpy.context.active_object
    tile.name = name
    tile.scale = (0.98, 0.98, 0.035)
    bpy.ops.object.transform_apply(scale=True)
    tile.rotation_euler = (0, 0, rot_z)

    # Bevel for authentic punch-out cardboard edge
    bev = tile.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.015
    bev.segments = 3

    # Materials: Slot 0 = Cardboard edge, Slot 1 = Top printed face
    mat_edge = bpy.data.materials.new(f"{name}_Edge")
    mat_edge.use_nodes = True
    bsdf_e = next(n for n in mat_edge.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf_e.inputs['Base Color'].default_value = (0.52, 0.44, 0.35, 1.0) # pressed gray/brown board
    bsdf_e.inputs['Roughness'].default_value = 0.85
    tile.data.materials.append(mat_edge)

    # Top material with image texture
    mat_top = bpy.data.materials.new(f"{name}_Face")
    mat_top.use_nodes = True
    nodes = mat_top.node_tree.nodes
    bsdf_t = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf_t.inputs['Roughness'].default_value = 0.32 # semi-gloss print

    if os.path.exists(image_path):
        img = bpy.data.images.load(image_path)
        tex_node = nodes.new('ShaderNodeTexImage')
        tex_node.image = img
        mat_top.node_tree.links.new(tex_node.outputs['Color'], bsdf_t.inputs['Base Color'])

    tile.data.materials.append(mat_top)

    # Assign top face material
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(tile.data)
    for f in bm.faces:
        if f.normal.z > 0.8: # top face
            f.material_index = 1
        else:
            f.material_index = 0
    bmesh.update_edit_mesh(tile.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return tile

def make_realistic_meeple(scale=0.38, color=(0.95, 0.75, 0.20, 1.0), roughness=0.25):
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

    m = bpy.data.materials.new("MeepleWood")
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.6
    ob.data.materials.append(m)
    return ob

def render_tabletop_scene(out_path):
    clean_all()
    setup_cycles(w=1024, h=500, samples=96)

    tiles_dir = r"D:\TileTopia\assets\tiles"

    # Dark warm tabletop wood
    mat_table = bpy.data.materials.new("TableWood")
    mat_table.use_nodes = True
    b_tbl = next(n for n in mat_table.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b_tbl.inputs['Base Color'].default_value = (0.05, 0.035, 0.025, 1.0)
    b_tbl.inputs['Roughness'].default_value = 0.28

    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.02))
    tbl = bpy.context.active_object
    tbl.data.materials.append(mat_table)

    # Real game tile layout (3x3 grid connecting rivers, roads, and cities)
    layout = [
        # (row, col, filename, rot_deg)
        (-1, -1.5, "tile_cap.png", 0),
        (-1, -0.5, "tile_rS.png", 90),
        (-1, 0.5, "tile_rC.png", 180),
        (-1, 1.5, "tile_wCity.png", 0),

        (0, -1.5, "tile_rS.png", 0),
        (0, -0.5, "tile_wBr.png", 0),
        (0, 0.5, "tile_wS.png", 0),
        (0, 1.5, "tile_wC.png", 270),

        (1, -1.5, "tile_rC.png", 0),
        (1, -0.5, "tile_r3.png", 90),
        (1, 0.5, "tile_fort.png", 0),
        (1, 1.5, "tile_c2.png", 90),
    ]

    for row, col, f, rz in layout:
        p = os.path.join(tiles_dir, f)
        create_cardboard_tile(f, p, loc=(col * 1.02, row * 1.02, 0.018), rot_z=math.radians(rz))

    # Place real 3D wooden meeples on the tiles
    # Gold Meeple on the Bridge tile (0, -0.5)
    mg = make_realistic_meeple(scale=0.35, color=(0.96, 0.76, 0.18, 1.0), roughness=0.18)
    mg.location = (-0.5 * 1.02, 0, 0.038)
    mg.rotation_euler = (math.radians(90), 0, math.radians(-35))

    # Blue Meeple on Fort tile (1, 0.5)
    mb = make_realistic_meeple(scale=0.32, color=(0.18, 0.48, 0.92, 1.0), roughness=0.22)
    mb.location = (0.5 * 1.02, 1.02, 0.038)
    mb.rotation_euler = (math.radians(90), 0, math.radians(45))

    # Red Meeple on Road tile (-1, -0.5)
    mr = make_realistic_meeple(scale=0.30, color=(0.88, 0.20, 0.20, 1.0), roughness=0.25)
    mr.location = (-0.5 * 1.02, -1.02, 0.038)
    mr.rotation_euler = (math.radians(90), 0, math.radians(110))

    # 3D Gold Logo Text "TileTopia" floating on the right side
    mat_gold_text = bpy.data.materials.new("GoldText")
    mat_gold_text.use_nodes = True
    b_gt = next(n for n in mat_gold_text.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b_gt.inputs['Base Color'].default_value = (1.0, 0.82, 0.24, 1.0)
    b_gt.inputs['Metallic'].default_value = 0.95
    b_gt.inputs['Roughness'].default_value = 0.15

    bpy.ops.object.text_add(location=(1.1, -1.2, 0.35))
    txt = bpy.context.active_object
    txt.data.body = "TileTopia"
    txt.data.size = 0.55
    txt.data.extrude = 0.06
    txt.data.bevel_depth = 0.012
    txt.rotation_euler = (math.radians(55), 0, math.radians(-25))
    txt.data.materials.append(mat_gold_text)

    # Lighting: Warm Key softbox + Cold fill + Golden rim
    key_d = bpy.data.lights.new("Key", 'AREA')
    key_d.energy = 420
    key_d.size = 4.0
    key_d.color = (1.0, 0.96, 0.90)
    key_o = bpy.data.objects.new("Key", key_d)
    key_o.location = (-3.5, -4.5, 4.5)
    bpy.context.collection.objects.link(key_o)

    rim_d = bpy.data.lights.new("Rim", 'AREA')
    rim_d.energy = 280
    rim_d.size = 3.0
    rim_d.color = (1.0, 0.82, 0.45)
    rim_o = bpy.data.objects.new("Rim", rim_d)
    rim_o.location = (2.5, 3.5, 3.5)
    bpy.context.collection.objects.link(rim_o)

    fill_d = bpy.data.lights.new("Fill", 'AREA')
    fill_d.energy = 100
    fill_d.size = 5.0
    fill_d.color = (0.7, 0.85, 1.0)
    fill_o = bpy.data.objects.new("Fill", fill_d)
    fill_o.location = (4.0, -2.5, 2.5)
    bpy.context.collection.objects.link(fill_o)

    # Camera: Tabletop angle with shallow depth of field
    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 60
    cam_d.dof.use_dof = True
    cam_d.dof.focus_object = mg # focus on the golden meeple
    cam_d.dof.aperture_fstop = 2.8

    cam_o = bpy.data.objects.new("Cam", cam_d)
    cam_o.location = (0.1, -3.8, 2.6)
    from mathutils import Vector
    dir_vec = Vector((-0.2, 0.1, 0.1)) - cam_o.location
    cam_o.rotation_euler = dir_vec.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.collection.objects.link(cam_o)
    bpy.context.scene.camera = cam_o

    bpy.context.scene.render.filepath = out_path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"Rendered real tabletop banner in {time.time()-t0:.2f}s to {out_path}")

if __name__ == "__main__":
    out_dir = r"D:\TileTopia\store\blender_feature"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "feature-real-tabletop-1024x500.png")
    render_tabletop_scene(out_path)
