# Blender script to generate a simple product with a body, a hinged door, and an indicator light
# Usage (headless):
#   blender -b -P blender/make_demo_model.py -- --out ./assets/model.glb
# Or run inside Blender's Scripting tab and adjust output path below.

import bpy
import bmesh
import os
import sys

# Parse --out argument
out_path = "./assets/model.glb"
if "--" in sys.argv:
    idx = sys.argv.index("--")
    args = sys.argv[idx+1:]
    if len(args) >= 2 and args[0] == "--out":
        out_path = args[1]

# Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'

# Create materials
mat_body = bpy.data.materials.new(name="BodyMat")
mat_body.use_nodes = True
bsdf = mat_body.node_tree.nodes.get("Principled BSDF")
bsdf.inputs[0].default_value = (0.53, 0.53, 0.53, 1.0)  # Base Color
bsdf.inputs[4].default_value = 0.2  # Metallic
bsdf.inputs[7].default_value = 0.5  # Roughness

mat_indicator = bpy.data.materials.new(name="IndicatorMat")
mat_indicator.use_nodes = True
ibsdf = mat_indicator.node_tree.nodes.get("Principled BSDF")
# Emission via Emission node mixed
emission = mat_indicator.node_tree.nodes.new("ShaderNodeEmission")
emission.inputs[0].default_value = (1.0, 0.8, 0.4, 1)
emission.inputs[1].default_value = 2.0
output = mat_indicator.node_tree.nodes.get("Material Output")
mat_indicator.node_tree.links.new(emission.outputs[0], output.inputs[0])

# Create body (cube scaled)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.5, 0.0))
body = bpy.context.active_object
body.name = "Body"
body.scale[0] = 0.8  # X
body.scale[1] = 0.5  # Z (Blender Y-up becomes glTF Y-up; we will keep simple naming)
body.scale[2] = 0.5  # Y
body.location = (0.0, 0.5, 0.0)
body.data.materials.append(mat_body)

# Create door pivot (empty)
door_pivot = bpy.data.objects.new("DoorPivot", None)
door_pivot.empty_display_type = 'PLAIN_AXES'
door_pivot.location = (-0.8, 0.6, 0.5)
bpy.context.collection.objects.link(door_pivot)

# Create door (plane extruded)
bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0.0, 0.6, 0.5))
door = bpy.context.active_object
door.name = "Door"
# Scale plane to approximate 1.2 x 0.9
door.scale[0] = 0.6  # X half-width
door.scale[1] = 0.45 # Y half-height
# Give it some thickness
bpy.ops.object.mode_set(mode='EDIT')
mesh = bmesh.from_edit_mesh(door.data)
bmesh.ops.extrude_face_region(mesh, geom=list(mesh.faces))
bmesh.ops.translate(mesh, vec=(0, 0, -0.02), verts=[v for v in mesh.verts])
bmesh.update_edit_mesh(door.data)
bpy.ops.object.mode_set(mode='OBJECT')
# Rotate to face outward
door.rotation_euler[1] = 3.14159
# Material
door.data.materials.append(mat_body)

# Parent door to pivot and offset so the left edge sits on the pivot
door.parent = door_pivot
# Move local origin by translating relative to parent
# Here we simply shift door so its left edge aligns with pivot

# Create indicator (small cylinder)
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=0.02, location=(0.6, 1.0, 0.51))
indicator = bpy.context.active_object
indicator.name = "Indicator"
indicator.rotation_euler[0] = 1.5708
indicator.data.materials.append(mat_indicator)

# Add a ground disk (optional)
bpy.ops.mesh.primitive_cylinder_add(radius=2.5, depth=0.05, location=(0.0, -0.025, 0.0))
ground = bpy.context.active_object
ground.name = "Ground"

# Clean transforms
for obj in [body, door_pivot, door, indicator, ground]:
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# Set hierarchy: create an empty root named Product
root = bpy.data.objects.new("ProductRoot", None)
root.empty_display_type = 'PLAIN_AXES'
root.location = (0,0,0)
bpy.context.collection.objects.link(root)
for obj in [body, door_pivot, indicator, ground]:
    obj.parent = root

# Camera and light (not required for GLB)

# Export GLB
out_abs = bpy.path.abspath(out_path)
os.makedirs(os.path.dirname(out_abs), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=out_abs,
    export_format='GLB',
    export_yup=True,
    export_apply=True,
    export_materials='EXPORT',
    export_texcoords=True,
    export_normals=True,
    use_selection=False,
)

print(f"Exported GLB to: {out_abs}")
