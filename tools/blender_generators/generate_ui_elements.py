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

def setup_studio_lighting():
    # Key light
    key_data = bpy.data.lights.new(name="KeyLight", type='AREA')
    key_data.energy = 180
    key_data.size = 2.0
    key_data.color = (1.0, 0.96, 0.88)
    key_obj = bpy.data.objects.new("KeyLight", key_data)
    key_obj.location = (2.5, -2.5, 3.5)
    key_obj.rotation_euler = (math.radians(45), 0, math.radians(45))
    bpy.context.collection.objects.link(key_obj)

    # Fill light
    fill_data = bpy.data.lights.new(name="FillLight", type='AREA')
    fill_data.energy = 70
    fill_data.size = 3.0
    fill_data.color = (0.75, 0.85, 1.0)
    fill_obj = bpy.data.objects.new("FillLight", fill_data)
    fill_obj.location = (-2.5, -2.0, 2.0)
    fill_obj.rotation_euler = (math.radians(45), 0, math.radians(-50))
    bpy.context.collection.objects.link(fill_obj)

    # Rim light
    rim_data = bpy.data.lights.new(name="RimLight", type='POINT')
    rim_data.energy = 120
    rim_data.color = (1.0, 0.85, 0.5)
    rim_obj = bpy.data.objects.new("RimLight", rim_data)
    rim_obj.location = (0, 2.8, 2.5)
    bpy.context.collection.objects.link(rim_obj)

def setup_camera(loc=(0, -3.2, 1.6), rot=(math.radians(65), 0, 0)):
    cam_data = bpy.data.cameras.new(name="Camera")
    cam_data.lens = 65
    cam_obj = bpy.data.objects.new("Camera", cam_data)
    cam_obj.location = loc
    cam_obj.rotation_euler = rot
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj
    return cam_obj

def create_principled_mat(name, base_color, metallic=0.0, roughness=0.3, specular=0.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    
    # Base Color
    bsdf.inputs['Base Color'].default_value = base_color
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = specular
    elif 'Specular' in bsdf.inputs:
        bsdf.inputs['Specular'].default_value = specular
    return mat

def create_meeple_mesh():
    # Accurate iconic meeple silhouette
    pts = [
        # Head (half arc)
        (0.0, 1.15), (0.12, 1.13), (0.22, 1.06), (0.28, 0.94), (0.27, 0.79), (0.17, 0.67),
        # Shoulder & Arm
        (0.32, 0.62), (0.55, 0.54), (0.74, 0.42), (0.70, 0.22), (0.50, 0.27), (0.33, 0.35),
        # Waist
        (0.31, 0.15), (0.37, -0.05),
        # Leg
        (0.42, -0.35), (0.45, -0.65), (0.18, -0.65), (0.12, -0.25),
        # Crotch
        (0.0, -0.12)
    ]
    full_pts = []
    for x, z in pts:
        full_pts.append((x, z))
    for x, z in reversed(pts[1:-1]):
        full_pts.append((-x, z))

    bm = bmesh.new()
    verts = [bm.verts.new((x, 0, z)) for x, z in full_pts]
    face = bm.faces.new(verts)

    # Extrude
    res = bmesh.ops.extrude_face_region(bm, geom=[face])
    extrude_verts = [v for v in res['geom'] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0.30, 0), verts=extrude_verts)

    mesh = bpy.data.meshes.new("MeepleMesh")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("Meeple", mesh)
    bpy.context.collection.objects.link(obj)

    # Center origin and ground
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS')
    obj.location = (0, 0, 0.1)
    obj.rotation_euler = (math.radians(-10), math.radians(15), math.radians(5))

    # Add Bevel for soft wooden toy edges
    bev = obj.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.035
    bev.segments = 4

    return obj

def render_meeples(out_dir):
    colors = {
        "meeple_gold.png":  ((1.0, 0.80, 0.22, 1.0), 0.85, 0.18),
        "meeple_blue.png":  ((0.15, 0.45, 0.95, 1.0), 0.0, 0.25),
        "meeple_red.png":   ((0.92, 0.22, 0.25, 1.0), 0.0, 0.25),
        "meeple_green.png": ((0.18, 0.75, 0.38, 1.0), 0.0, 0.25),
    }

    for filename, (col, metallic, roughness) in colors.items():
        clean_scene()
        setup_cycles(samples=48)
        setup_studio_lighting()
        setup_camera(loc=(0, -2.6, 0.4), rot=(math.radians(82), 0, 0))

        obj = create_meeple_mesh()
        mat = create_principled_mat("MeepleMat", col, metallic=metallic, roughness=roughness)
        obj.data.materials.append(mat)

        out_path = os.path.join(out_dir, filename)
        bpy.context.scene.render.filepath = out_path
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"Rendered {filename} in {time.time()-t0:.2f}s")

def render_trophy(out_dir):
    clean_scene()
    setup_cycles(samples=64)
    setup_studio_lighting()
    setup_camera(loc=(0, -2.8, 0.7), rot=(math.radians(78), 0, 0))

    gold_mat = create_principled_mat("GoldTrophy", (1.0, 0.80, 0.24, 1.0), metallic=0.95, roughness=0.15)
    base_mat = create_principled_mat("MarbleBase", (0.12, 0.12, 0.15, 1.0), metallic=0.0, roughness=0.2)

    # Base: octagonal pedestal
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.6, depth=0.25, location=(0, 0, -0.6))
    base1 = bpy.context.active_object
    base1.data.materials.append(base_mat)

    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.45, depth=0.15, location=(0, 0, -0.4))
    base2 = bpy.context.active_object
    base2.data.materials.append(gold_mat)

    # Stem
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.12, depth=0.4, location=(0, 0, -0.15))
    stem = bpy.context.active_object
    stem.data.materials.append(gold_mat)

    # Cup bowl (sphere cut / cylinder scaled)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.55, depth=0.7, location=(0, 0, 0.35))
    cup = bpy.context.active_object
    cup.data.materials.append(gold_mat)
    bev = cup.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.05
    bev.segments = 3

    # Handles (torus halves)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.06, location=(0.6, 0, 0.38), rotation=(math.radians(90), 0, 0))
    h1 = bpy.context.active_object
    h1.data.materials.append(gold_mat)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.06, location=(-0.6, 0, 0.38), rotation=(math.radians(90), 0, 0))
    h2 = bpy.context.active_object
    h2.data.materials.append(gold_mat)

    # Star on cup
    bpy.ops.mesh.primitive_cylinder_add(vertices=5, radius=0.16, depth=0.06, location=(0, -0.55, 0.4), rotation=(math.radians(90), 0, 0))
    star = bpy.context.active_object
    star.data.materials.append(gold_mat)

    out_path = os.path.join(out_dir, "ui_trophy_gold.png")
    bpy.context.scene.render.filepath = out_path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"Rendered ui_trophy_gold.png in {time.time()-t0:.2f}s")

def render_crown(out_dir):
    clean_scene()
    setup_cycles(samples=64)
    setup_studio_lighting()
    setup_camera(loc=(0, -2.5, 0.6), rot=(math.radians(78), 0, 0))

    gold_mat = create_principled_mat("RoyalGold", (1.0, 0.82, 0.22, 1.0), metallic=0.96, roughness=0.16)
    ruby_mat = create_principled_mat("RubyGem", (0.95, 0.05, 0.15, 1.0), metallic=0.1, roughness=0.05)
    ruby_mat.node_tree.nodes["Principled BSDF"].inputs['Transmission Weight'].default_value = 0.85
    ruby_mat.node_tree.nodes["Principled BSDF"].inputs['IOR'].default_value = 1.77

    # Crown ring base
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.7, depth=0.18, location=(0, 0, -0.2))
    ring = bpy.context.active_object
    ring.data.materials.append(gold_mat)

    # Crown spikes (5 peaks)
    for i in range(5):
        angle = i * (2 * math.pi / 5)
        x = 0.65 * math.sin(angle)
        y = 0.65 * math.cos(angle)
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.14, depth=0.55, location=(x, y, 0.15))
        spike = bpy.context.active_object
        spike.data.materials.append(gold_mat)

        # Gem on spike tip
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.07, location=(x * 1.02, y * 1.02, 0.44))
        gem = bpy.context.active_object
        gem.data.materials.append(ruby_mat)

    out_path = os.path.join(out_dir, "ui_crown_royal.png")
    bpy.context.scene.render.filepath = out_path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"Rendered ui_crown_royal.png in {time.time()-t0:.2f}s")

def render_dice(out_dir):
    clean_scene()
    setup_cycles(samples=64)
    setup_studio_lighting()
    setup_camera(loc=(0, -2.6, 0.8), rot=(math.radians(70), 0, 0))

    dice_mat = create_principled_mat("DiceBone", (0.96, 0.94, 0.90, 1.0), metallic=0.0, roughness=0.18)
    gold_dot_mat = create_principled_mat("DiceGoldDot", (1.0, 0.78, 0.18, 1.0), metallic=0.95, roughness=0.15)

    # Cube with rounded corners
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    cube = bpy.context.active_object
    cube.rotation_euler = (math.radians(35), math.radians(-25), math.radians(45))
    bev = cube.modifiers.new("Bevel", "BEVEL")
    bev.width = 0.08
    bev.segments = 4
    cube.data.materials.append(dice_mat)

    out_path = os.path.join(out_dir, "ui_dice_3d.png")
    bpy.context.scene.render.filepath = out_path
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"Rendered ui_dice_3d.png in {time.time()-t0:.2f}s")

if __name__ == "__main__":
    out_dir = r"D:\TileTopia\store\blender_ui"
    os.makedirs(out_dir, exist_ok=True)
    print("=== Generating UI 3D Elements ===")
    render_meeples(out_dir)
    render_trophy(out_dir)
    render_crown(out_dir)
    render_dice(out_dir)
    print("=== UI 3D Elements Complete ===")
