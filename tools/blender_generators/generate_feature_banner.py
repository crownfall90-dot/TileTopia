import bpy
import bmesh
import math
import os
import time

def setup_cycles(w=1024, h=500, samples=64):
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
              bpy.data.lights, bpy.data.cameras, bpy.data.worlds):
        for item in list(t): t.remove(item, do_unlink=True)

def mat(name, color, metallic=0.0, roughness=0.35, emission=0.0,
        transmission=0.0, ior=1.45):
    m = bpy.data.materials.new(name)
    n = m.node_tree.nodes
    b = next(x for x in n if x.type == "BSDF_PRINCIPLED")
    b.inputs['Base Color'].default_value = color
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = roughness
    if emission > 0:
        b.inputs['Emission Color'].default_value = color
        b.inputs['Emission Strength'].default_value = emission
    if transmission > 0:
        b.inputs['Transmission Weight'].default_value = transmission
        b.inputs['IOR'].default_value = ior
    return m

def make_meeple(scale=1.0):
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
    return ob

def make_tile(x, y, z=0, wood_mat=None, top_mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, y, z-0.08))
    base = bpy.context.active_object
    base.scale = (0.95, 0.95, 0.12)
    bpy.ops.object.transform_apply(scale=True)
    b_bev = base.modifiers.new("Bevel", "BEVEL")
    b_bev.width = 0.03; b_bev.segments = 2
    if wood_mat: base.data.materials.append(wood_mat)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, y, z+0.01))
    top = bpy.context.active_object
    top.scale = (0.91, 0.91, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    t_bev = top.modifiers.new("Bevel", "BEVEL")
    t_bev.width = 0.02; t_bev.segments = 2
    if top_mat: top.data.materials.append(top_mat)
    return base, top

def add_tree(loc, scale=0.4, trunk_mat=None, leaves_mat=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.04*scale, depth=0.3*scale, location=(loc[0], loc[1], loc[2]+0.15*scale))
    tr = bpy.context.active_object
    if trunk_mat: tr.data.materials.append(trunk_mat)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.22*scale, location=(loc[0], loc[1], loc[2]+0.35*scale))
    lv = bpy.context.active_object
    if leaves_mat: lv.data.materials.append(leaves_mat)

def render_feature_banner(out_path):
    clean_all()
    setup_cycles(w=1024, h=500, samples=64)

    # World background: Deep navy space with warm golden tint
    w = bpy.data.worlds.new("BannerWorld")
    bpy.context.scene.world = w
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.04, 0.06, 0.14, 1.0)
    bg.inputs['Strength'].default_value = 0.4

    # Table surface: Dark polished mahogany wood
    table_mat = mat("DarkWoodTable", (0.07, 0.04, 0.03, 1.0), roughness=0.25)
    bpy.ops.mesh.primitive_cube_add(size=20, location=(0, 0, -1.0))
    tbl = bpy.context.active_object
    tbl.scale = (1.5, 1.5, 0.1)
    bpy.ops.object.transform_apply(scale=True)
    tbl.data.materials.append(table_mat)

    # Materials for tiles & scene
    wood_mat   = mat("TileWood", (0.38, 0.24, 0.12, 1.0), roughness=0.5)
    grass_mat  = mat("Grass", (0.26, 0.62, 0.20, 1.0), roughness=0.55)
    water_mat  = mat("Water", (0.12, 0.52, 0.82, 1.0), roughness=0.05, transmission=0.7, ior=1.33)
    road_mat   = mat("Road", (0.75, 0.68, 0.55, 1.0), roughness=0.7)
    stone_mat  = mat("Stone", (0.58, 0.55, 0.50, 1.0), roughness=0.55)
    roof_mat   = mat("Roof", (0.85, 0.20, 0.14, 1.0), roughness=0.35)
    gold_mat   = mat("Gold", (1.0, 0.82, 0.22, 1.0), metallic=0.96, roughness=0.15)
    blue_mat   = mat("BluePlayer", (0.15, 0.45, 0.92, 1.0), roughness=0.25)
    red_mat    = mat("RedPlayer", (0.90, 0.22, 0.22, 1.0), roughness=0.25)
    trunk_mat  = mat("Trunk", (0.32, 0.18, 0.10, 1.0), roughness=0.7)
    leaves_mat = mat("Leaves", (0.16, 0.52, 0.14, 1.0), roughness=0.5)

    # Create connected island of tiles positioned on the left-center:
    # 7 tiles arranged dynamically
    tile_coords = [
        (-1.8, -0.6), (-0.8, -0.6), (0.2, -0.6),
        (-1.8, 0.4),  (-0.8, 0.4),  (0.2, 0.4),
        (-0.8, 1.4)
    ]
    for x, y in tile_coords:
        make_tile(x, y, 0, wood_mat, grass_mat)

    # River running through tiles: x = -0.8 column
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.8, 0.4, 0.025))
    riv = bpy.context.active_object
    riv.scale = (0.35, 3.2, 0.01)
    bpy.ops.object.transform_apply(scale=True)
    riv.data.materials.append(water_mat)

    # Stone Bridge at (-0.8, 0.4)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.8, 0.4, 0.06))
    br = bpy.context.active_object
    br.scale = (0.55, 0.32, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    br.data.materials.append(stone_mat)
    bev = br.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.02; bev.segments = 2

    # Road across bridge
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.8, 0.4, 0.082))
    rd = bpy.context.active_object
    rd.scale = (0.55, 0.22, 0.005)
    bpy.ops.object.transform_apply(scale=True)
    rd.data.materials.append(road_mat)

    # Castle keep on top-left tile (-1.8, 0.4)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.32, depth=0.45, location=(-1.8, 0.4, 0.25))
    castle = bpy.context.active_object
    castle.data.materials.append(stone_mat)
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.40, depth=0.42, location=(-1.8, 0.4, 0.65))
    c_roof = bpy.context.active_object
    c_roof.data.materials.append(roof_mat)

    # Gold flagpole & pennant
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.015, depth=0.35, location=(-1.8, 0.4, 0.95))
    pole = bpy.context.active_object
    pole.data.materials.append(gold_mat)
    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.10, depth=0.18, location=(-1.72, 0.4, 1.0), rotation=(0, math.radians(90), 0))
    flg = bpy.context.active_object
    flg.data.materials.append(gold_mat)

    # Trees around
    add_tree((-1.8, -0.6, 0.04), scale=0.6, trunk_mat=trunk_mat, leaves_mat=leaves_mat)
    add_tree((-1.5, -0.3, 0.04), scale=0.45, trunk_mat=trunk_mat, leaves_mat=leaves_mat)
    add_tree((0.2, -0.3, 0.04), scale=0.55, trunk_mat=trunk_mat, leaves_mat=leaves_mat)
    add_tree((0.3, 0.6, 0.04), scale=0.5, trunk_mat=trunk_mat, leaves_mat=leaves_mat)

    # Golden Meeple hero standing on bridge
    m_gold = make_meeple(scale=0.48)
    m_gold.location = (-0.8, 0.4, 0.1)
    m_gold.rotation_euler = (math.radians(-5), math.radians(15), math.radians(-25))
    m_gold.data.materials.append(gold_mat)

    # Blue Meeple approaching road
    m_blue = make_meeple(scale=0.38)
    m_blue.location = (0.2, 0.4, 0.04)
    m_blue.rotation_euler = (0, 0, math.radians(45))
    m_blue.data.materials.append(blue_mat)

    # Red Meeple on castle path
    m_red = make_meeple(scale=0.35)
    m_red.location = (-1.8, -0.2, 0.04)
    m_red.rotation_euler = (0, 0, math.radians(-70))
    m_red.data.materials.append(red_mat)

    # Golden Trophy on right side foreground
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.28, depth=0.12, location=(1.8, -0.4, 0.06))
    tr_b = bpy.context.active_object
    tr_b.data.materials.append(gold_mat)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.26, depth=0.45, location=(1.8, -0.4, 0.35))
    tr_c = bpy.context.active_object
    tr_c.data.materials.append(gold_mat)
    bev_c = tr_c.modifiers.new("Bevel", "BEVEL")
    bev_c.width = 0.02; bev_c.segments = 2

    # 3D Text 'TileTopia' on right side elevated
    bpy.ops.object.text_add(location=(0.85, 0.85, 0.75))
    txt = bpy.context.active_object
    txt.data.body = "TileTopia"
    txt.data.size = 0.65
    txt.data.extrude = 0.08
    txt.data.bevel_depth = 0.015
    txt.rotation_euler = (math.radians(65), 0, math.radians(-15))
    txt.data.materials.append(gold_mat)

    # Lighting setup: dramatic cinematic angle
    # Key light warm
    key_d = bpy.data.lights.new("Key", 'AREA')
    key_d.energy = 450
    key_d.size = 3.5
    key_d.color = (1.0, 0.94, 0.85)
    key_o = bpy.data.objects.new("Key", key_d)
    key_o.location = (-2.0, -4.5, 5.0)
    key_o.rotation_euler = (math.radians(40), math.radians(10), math.radians(20))
    bpy.context.collection.objects.link(key_o)

    # Rim light golden
    rim_d = bpy.data.lights.new("Rim", 'AREA')
    rim_d.energy = 320
    rim_d.size = 4.0
    rim_d.color = (1.0, 0.82, 0.4)
    rim_o = bpy.data.objects.new("Rim", rim_d)
    rim_o.location = (2.0, 4.0, 3.5)
    rim_o.rotation_euler = (math.radians(-45), 0, math.radians(-160))
    bpy.context.collection.objects.link(rim_o)

    # Soft Fill light
    fill_d = bpy.data.lights.new("Fill", 'AREA')
    fill_d.energy = 150
    fill_d.size = 5.0
    fill_d.color = (0.6, 0.75, 1.0)
    fill_o = bpy.data.objects.new("Fill", fill_d)
    fill_o.location = (4.0, -3.0, 3.0)
    bpy.context.collection.objects.link(fill_o)

    # Camera setup: cinematic 1024x500
    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 55
    cam_o = bpy.data.objects.new("Cam", cam_d)
    cam_o.location = (0.2, -4.8, 3.4)
    from mathutils import Vector
    direction = Vector((-0.2, 0.2, 0.3)) - cam_o.location
    cam_o.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.collection.objects.link(cam_o)
    bpy.context.scene.camera = cam_o

    bpy.context.scene.render.filepath = out_path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"Feature banner rendered in {time.time()-t0:.2f}s to {out_path}")

if __name__ == "__main__":
    out_dir = r"D:\TileTopia\store\blender_feature"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "feature-1024x500-epic-tabletop.png")
    render_feature_banner(out_path)

    # Copy to store/feature-1024x500.png
    import shutil
    target = r"D:\TileTopia\store\feature-1024x500.png"
    shutil.copy2(out_path, target)
    print(f"Updated {target}")
