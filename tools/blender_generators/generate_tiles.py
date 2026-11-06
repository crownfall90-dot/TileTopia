import bpy
import bmesh
import math
import os
import time

def setup_cycles(samples=48):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    try:
        pref = bpy.context.preferences.addons['cycles'].preferences
        pref.compute_device_type = 'CUDA'
        for d in pref.devices:
            d.use = True
        scene.cycles.device = 'GPU'
    except Exception as e:
        print("Cycles GPU fallback to CPU:", e)
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512

def clean_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh, do_unlink=True)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat, do_unlink=True)
    for light in list(bpy.data.lights):
        bpy.data.lights.remove(light, do_unlink=True)
    for cam in list(bpy.data.cameras):
        bpy.data.cameras.remove(cam, do_unlink=True)

def setup_isometric_camera():
    # True isometric view for 3D tiles (45 deg yaw, 35.264 deg pitch)
    cam_data = bpy.data.cameras.new(name="IsoCamera")
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 3.6
    cam_obj = bpy.data.objects.new("IsoCamera", cam_data)
    cam_obj.location = (4.0, -4.0, 4.0)
    cam_obj.rotation_euler = (math.radians(54.736), 0, math.radians(45))
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj
    return cam_obj

def setup_lighting():
    # Sun / Key light
    sun_data = bpy.data.lights.new(name="Sun", type='SUN')
    sun_data.energy = 4.2
    sun_data.color = (1.0, 0.97, 0.90)
    sun_obj = bpy.data.objects.new("Sun", sun_data)
    sun_obj.location = (5, -5, 8)
    sun_obj.rotation_euler = (math.radians(45), math.radians(20), math.radians(30))
    bpy.context.collection.objects.link(sun_obj)

    # Ambient sky fill
    fill_data = bpy.data.lights.new(name="SkyFill", type='AREA')
    fill_data.energy = 80
    fill_data.size = 6.0
    fill_data.color = (0.75, 0.88, 1.0)
    fill_obj = bpy.data.objects.new("SkyFill", fill_data)
    fill_obj.location = (-4, 3, 5)
    bpy.context.collection.objects.link(fill_obj)

def get_mat(name, base_color, roughness=0.35, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    return mat

def create_base_tile():
    # Base tile block 2.0 x 2.0 x 0.35
    bpy.ops.mesh.primitive_cube_add(size=2.0, location=(0, 0, -0.175))
    tile = bpy.context.active_object
    tile.scale = (1.0, 1.0, 0.175)
    bpy.ops.object.transform_apply(scale=True)
    
    bev = tile.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.05
    bev.segments = 3

    wood_base = get_mat("WoodBase", (0.35, 0.22, 0.12, 1.0), roughness=0.55)
    tile.data.materials.append(wood_base)

    # Top grass plate
    bpy.ops.mesh.primitive_cube_add(size=1.92, location=(0, 0, 0.04))
    top = bpy.context.active_object
    top.scale = (1.0, 1.0, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    
    top_bev = top.modifiers.new("Bevel", "BEVEL")
    top_bev.width = 0.03
    top_bev.segments = 2

    grass_mat = get_mat("Grass", (0.24, 0.62, 0.18, 1.0), roughness=0.6)
    top.data.materials.append(grass_mat)
    return tile

def add_stylized_tree(loc, scale=0.35):
    trunk_mat = get_mat("Trunk", (0.32, 0.18, 0.09, 1.0), roughness=0.7)
    leaves_mat = get_mat("Leaves", (0.16, 0.52, 0.14, 1.0), roughness=0.5)

    # Trunk
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.08 * scale, depth=0.4 * scale, location=(loc[0], loc[1], loc[2] + 0.2 * scale))
    trunk = bpy.context.active_object
    trunk.data.materials.append(trunk_mat)

    # Foliage (2 stacked icosahedrons / cones)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.35 * scale, location=(loc[0], loc[1], loc[2] + 0.45 * scale))
    leaves1 = bpy.context.active_object
    leaves1.data.materials.append(leaves_mat)

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.25 * scale, location=(loc[0], loc[1], loc[2] + 0.68 * scale))
    leaves2 = bpy.context.active_object
    leaves2.data.materials.append(leaves_mat)

# --- TILE 1: Straight Road ---
def render_tile_road_straight(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()
    create_base_tile()

    road_mat = get_mat("Road", (0.75, 0.70, 0.60, 1.0), roughness=0.75)
    # Road strip across Y
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.05))
    road = bpy.context.active_object
    road.scale = (0.45, 1.95, 0.015)
    bpy.ops.object.transform_apply(scale=True)
    road.data.materials.append(road_mat)

    # Trees on sides
    add_stylized_tree((-0.65, 0.4, 0.04), scale=0.6)
    add_stylized_tree((-0.60, -0.5, 0.04), scale=0.45)
    add_stylized_tree((0.65, -0.3, 0.04), scale=0.55)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

# --- TILE 2: Crossroads ---
def render_tile_road_crossroads(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()
    create_base_tile()

    road_mat = get_mat("Road", (0.75, 0.70, 0.60, 1.0), roughness=0.75)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.05))
    r1 = bpy.context.active_object
    r1.scale = (0.45, 1.95, 0.015)
    bpy.ops.object.transform_apply(scale=True)
    r1.data.materials.append(road_mat)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.05))
    r2 = bpy.context.active_object
    r2.scale = (1.95, 0.45, 0.015)
    bpy.ops.object.transform_apply(scale=True)
    r2.data.materials.append(road_mat)

    # Trees in corners
    add_stylized_tree((-0.65, -0.65, 0.04), scale=0.5)
    add_stylized_tree((0.65, -0.65, 0.04), scale=0.5)
    add_stylized_tree((-0.65, 0.65, 0.04), scale=0.5)
    add_stylized_tree((0.65, 0.65, 0.04), scale=0.5)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

# --- TILE 3: River Bridge ---
def render_tile_river_bridge(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()
    create_base_tile()

    water_mat = get_mat("Water", (0.12, 0.58, 0.88, 1.0), roughness=0.08)
    water_mat.node_tree.nodes["Principled BSDF"].inputs['Transmission Weight'].default_value = 0.75
    water_mat.node_tree.nodes["Principled BSDF"].inputs['IOR'].default_value = 1.33

    # River across Y
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.048))
    river = bpy.context.active_object
    river.scale = (0.55, 1.95, 0.01)
    bpy.ops.object.transform_apply(scale=True)
    river.data.materials.append(water_mat)

    # Stone Bridge crossing across X
    stone_mat = get_mat("Stone", (0.55, 0.52, 0.48, 1.0), roughness=0.6)
    road_mat = get_mat("Road", (0.75, 0.70, 0.60, 1.0), roughness=0.75)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.09))
    bridge = bpy.context.active_object
    bridge.scale = (1.95, 0.40, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    bridge.data.materials.append(road_mat)
    
    bev = bridge.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.03
    bev.segments = 2

    add_stylized_tree((-0.65, 0.65, 0.04), scale=0.55)
    add_stylized_tree((0.65, -0.65, 0.04), scale=0.55)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

# --- TILE 4: Castle Keep ---
def render_tile_castle_fort(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()
    create_base_tile()

    stone_mat = get_mat("Stone", (0.65, 0.62, 0.58, 1.0), roughness=0.55)
    roof_mat = get_mat("Roof", (0.85, 0.22, 0.15, 1.0), roughness=0.4)
    gold_mat = get_mat("Gold", (1.0, 0.82, 0.22, 1.0), metallic=0.95, roughness=0.15)

    # Castle Keep base
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.65, depth=0.7, location=(0, 0, 0.38))
    tower = bpy.context.active_object
    tower.data.materials.append(stone_mat)

    # Castle cone roof
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.78, depth=0.75, location=(0, 0, 1.05))
    roof = bpy.context.active_object
    roof.data.materials.append(roof_mat)

    # Golden Flag pennant
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.02, depth=0.4, location=(0, 0, 1.55))
    pole = bpy.context.active_object
    pole.data.materials.append(gold_mat)

    bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.15, depth=0.25, location=(0.12, 0, 1.62), rotation=(0, math.radians(90), 0))
    flag = bpy.context.active_object
    flag.data.materials.append(gold_mat)

    # Trees around castle
    add_stylized_tree((-0.65, -0.60, 0.04), scale=0.45)
    add_stylized_tree((0.65, -0.60, 0.04), scale=0.45)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

# --- TILE 5: Jigsaw Master Base ---
def render_tile_jigsaw_base(out_path):
    clean_scene()
    setup_cycles()
    setup_lighting()
    setup_isometric_camera()

    # Create true puzzle piece with tabs and notches
    wood_mat = get_mat("PuzzleWood", (0.88, 0.65, 0.38, 1.0), roughness=0.35)
    gold_rim = get_mat("GoldEdge", (1.0, 0.82, 0.24, 1.0), metallic=0.9, roughness=0.2)

    bpy.ops.mesh.primitive_cube_add(size=1.8, location=(0, 0, 0))
    p = bpy.context.active_object
    p.scale = (1.0, 1.0, 0.22)
    bpy.ops.object.transform_apply(scale=True)
    p.data.materials.append(wood_mat)

    # Puzzle tabs (cylinders protruding)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.32, depth=0.22, location=(0.95, 0, 0))
    t1 = bpy.context.active_object
    t1.data.materials.append(wood_mat)

    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.32, depth=0.22, location=(0, 0.95, 0))
    t2 = bpy.context.active_object
    t2.data.materials.append(wood_mat)

    # Center embossed logo star/tile
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.45, depth=0.08, location=(0, 0, 0.14))
    emblem = bpy.context.active_object
    emblem.data.materials.append(gold_rim)

    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {os.path.basename(out_path)}")

if __name__ == "__main__":
    out_dir = r"D:\TileTopia\store\blender_tiles"
    os.makedirs(out_dir, exist_ok=True)
    print("=== Rendering 3D Tiles ===")
    render_tile_road_straight(os.path.join(out_dir, "tile_3d_road_straight.png"))
    render_tile_road_crossroads(os.path.join(out_dir, "tile_3d_road_crossroads.png"))
    render_tile_river_bridge(os.path.join(out_dir, "tile_3d_river_bridge.png"))
    render_tile_castle_fort(os.path.join(out_dir, "tile_3d_castle_fort.png"))
    render_tile_jigsaw_base(os.path.join(out_dir, "tile_3d_jigsaw_base.png"))
    print("=== 3D Tiles Complete ===")
