"""Author editable dental delivery equipment in Blender and export a lean GLB.

Run: /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 2 --python scripts/build-equipment.py
Optional arguments after --: --output-dir /path/to/models --skip-preview
Coordinates below are in the game's Y-up metres; p() converts them to Blender.
The authored source retains named parts. The export joins static parts by material.
"""

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output-dir", type=Path, default=ROOT / "client/public/models")
parser.add_argument("--skip-preview", action="store_true")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
args.output_dir.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.name = "Dental delivery equipment"
scene.unit_settings.system = "METRIC"
parts = []


def p(v):
    return Vector((v[0], -v[2], v[1]))


def material(name, color, metallic=0, roughness=.45, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value = (*color, 1)
    bs.inputs["Metallic"].default_value = metallic
    bs.inputs["Roughness"].default_value = roughness
    if emission:
        bs.inputs["Emission Color"].default_value = (*color, 1)
        bs.inputs["Emission Strength"].default_value = emission
    return m


ivory = material("Equipment warm porcelain", (.77, .76, .66), roughness=.29)
sage = material("Equipment enamel sage", (.25, .41, .35), roughness=.33)
steel = material("Equipment brushed stainless", (.43, .50, .49), metallic=.84, roughness=.28)
chrome = material("Equipment polished reflectors", (.77, .83, .82), metallic=.96, roughness=.12)
rubber = material("Equipment charcoal elastomer", (.035, .052, .049), roughness=.82)
hose = material("Equipment silicone tubing", (.62, .67, .58), roughness=.66)
paper = material("Equipment sterile mint paper", (.58, .72, .65), roughness=.85)
blue = material("Equipment blue glass", (.13, .41, .48), metallic=.15, roughness=.2)
warm = material("Equipment examination LEDs", (1, .9, .67), roughness=.22, emission=2.2)
screen = material("Equipment teal display", (.014, .07, .075), roughness=.36, emission=.16)
ui = material("Equipment display graphics", (.37, .85, .71), roughness=.6, emission=.7)
amber = material("Equipment amber indicator", (.88, .41, .10), roughness=.35, emission=.6)


def finish(o, name, mat):
    o.name = name
    o.data.materials.append(mat)
    parts.append(o)
    return o


def block(name, loc, size, mat, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p(loc))
    o = bpy.context.object
    o.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new("Manufactured edge radius", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        o.modifiers.new("Weighted face normals", "WEIGHTED_NORMAL")
    return finish(o, name, mat)


def sphere(name, loc, size, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1, location=p(loc))
    o = bpy.context.object
    o.scale = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in o.data.polygons:
        poly.use_smooth = True
    return finish(o, name, mat)


def rod(name, a, b, r, mat, r2=None, vertices=16):
    va, vb = p(a), p(b)
    d = vb - va
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r, radius2=r if r2 is None else r2,
                                   depth=d.length, location=(va + vb) / 2)
    o = bpy.context.object
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    for poly in o.data.polygons:
        poly.use_smooth = len(poly.vertices) == 4
    return finish(o, name, mat)


def tube(name, points, radius, mat, cyclic=False):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 8
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, co in zip(spline.bezier_points, points):
        point.co = p(co)
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    o = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(o)
    finish(o, name, mat)
    return o


def cart(loc):
    x, _, z = loc
    block("Cart low weighted chassis", (x, .15, z), (.83, .15, .67), ivory, .07)
    block("Cart sage chassis inset", (x, .226, z), (.7, .013, .53), sage, .035)
    for dx in (-.33, .33):
        for dz in (-.25, .25):
            rod("Caster swivel stem", (x + dx, .085, z + dz), (x + dx, .17, z + dz), .027, steel)
            block("Caster fork", (x + dx, .073, z + dz), (.1, .07, .09), steel, .012)
            rod("Soft caster tyre", (x + dx - .04, .063, z + dz + .018),
                (x + dx + .04, .063, z + dz + .018), .058, rubber, vertices=16)
            rod("Caster hub", (x + dx - .044, .063, z + dz + .018),
                (x + dx + .044, .063, z + dz + .018), .022, steel)
    rod("Telescopic lift lower", (x, .23, z), (x, .66, z), .074, ivory, vertices=20)
    rod("Telescopic lift chrome", (x, .59, z), (x, .92, z), .05, chrome, vertices=20)
    block("Storage drawer body", (x, .8, z), (.68, .24, .53), sage, .035)
    block("Storage drawer front", (x, .8, z + .271), (.63, .193, .024), ivory, .014)
    block("Recessed drawer finger pull", (x, .846, z + .288), (.2, .022, .015), rubber, .007)
    block("Delivery unit rounded body", (x, .973, z), (1.09, .14, .88), ivory, .07)
    block("Tray stainless basin", (x - .055, 1.045, z - .005), (.89, .023, .71), steel, .055)
    block("Tray sterile liner", (x - .055, 1.059, z - .025), (.79, .006, .59), paper, .038)
    for dx in (-.50, .39):
        block("Raised tray edge", (x + dx, 1.061, z - .005), (.025, .026, .69), chrome, .012)
    for dz in (-.35, .34):
        block("Raised tray edge", (x - .055, 1.061, z + dz), (.87, .026, .025), chrome, .012)
    tube("Cart side push handle", [(x + .49, 1.0, z - .25), (x + .66, 1.0, z - .25),
         (x + .69, 1.0, z + .18), (x + .49, 1.0, z + .22)], .022, steel)
    block("Delivery controls inset", (x + .442, 1.052, z - .025), (.093, .008, .38), rubber, .018)
    for i, m in enumerate((blue, blue, amber)):
        sphere("Backlit delivery control", (x + .442, 1.061, z - .14 + i * .09), (.02, .008, .02), m)
    # Four handpieces hang in dedicated cradles with silicone hoses.
    for i in range(4):
        dx = -.30 + i * .19
        hz = z + .478
        block("Handpiece cradle", (x + dx, .955, hz), (.132, .10, .105), rubber, .035)
        a, b = (x + dx, .887, hz + .06), (x + dx, 1.055, hz + .015)
        rod("Handpiece knurled grip", a, b, .022, steel, .016, vertices=12)
        for j in range(6):
            yy = .93 + j * .016
            zz = hz + .06 - (yy - .887) * .269
            rod("Grip ring", (x + dx, yy, zz), (x + dx, yy + .002, zz), .023, rubber, vertices=12)
        tube("Handpiece neck", [b, (x + dx, 1.086, hz + .009), (x + dx + .032, 1.11, hz - .025)], .012, steel)
        if i in (0, 2):
            sphere("Air turbine head", (x + dx + .032, 1.11, hz - .025), (.024, .02, .019), chrome)
            rod("Air turbine bur", (x + dx + .032, 1.101, hz - .025), (x + dx + .032, 1.067, hz - .025), .003, chrome, vertices=8)
        else:
            tube("Suction or air water nozzle", [(x + dx + .032, 1.11, hz - .025),
                 (x + dx + .058, 1.12, hz - .03), (x + dx + .066, 1.09, hz - .04)], .006, blue if i == 3 else steel)
        tube("Hanging handpiece hose", [a, (x + dx + .015, .67, hz + .085),
             (x + dx + .06, .40 - i * .012, hz + .09), (x + dx + .12, .49, z + .35),
             (x + dx + .08, .89, z + .28)], .014, hose)
    # A mirror and explorer laid on the liner.
    for dz in (-.10, .015):
        rod("Tray instrument handle", (x - .34, 1.081, z + dz), (x + .10, 1.081, z + dz), .014, steel, vertices=12)
        for j in range(5):
            xx = x - .26 + j * .044
            rod("Tray instrument grip groove", (xx, 1.081, z + dz), (xx + .004, 1.081, z + dz), .015, rubber, vertices=12)
    rod("Mirror angled shank", (x + .10, 1.081, z - .1), (x + .16, 1.098, z - .1), .006, chrome)
    rod("Inspection mirror bezel", (x + .20, 1.083, z - .1), (x + .20, 1.099, z - .1), .047, steel, vertices=20)
    rod("Inspection mirror face", (x + .20, 1.099, z - .1), (x + .20, 1.101, z - .1), .039, chrome, vertices=20)
    tube("Explorer hooked tip", [(x + .10, 1.081, z + .015), (x + .19, 1.083, z + .01),
         (x + .205, 1.081, z - .011), (x + .19, 1.08, z - .035)], .003, chrome)
    # Small supplies: cotton rolls, dispensing cup and capped etchant bottle.
    for i in range(3):
        rod("Sterile cotton roll", (x - .30 + .052 * i, 1.087, z - .23),
            (x - .30 + .052 * i, 1.087, z - .31), .018, ivory, vertices=12)
    rod("Rinse cup", (x + .25, 1.063, z - .24), (x + .25, 1.18, z - .24), .04, blue, .054, vertices=20)
    rod("Rinse cup inner shadow", (x + .25, 1.179, z - .24), (x + .25, 1.181, z - .24), .046, screen, vertices=20)
    rod("Capped treatment bottle", (x - .37, 1.063, z + .20), (x - .37, 1.158, z + .20), .031, amber, vertices=16)
    rod("Bottle dispensing cap", (x - .37, 1.154, z + .20), (x - .37, 1.199, z + .20), .021, ivory, .012, vertices=12)
    block("Sealed gauze packet", (x + .09, 1.069, z + .2), (.21, .012, .12), ivory, .013)
    block("Packet stripe", (x + .09, 1.077, z + .2), (.12, .003, .015), paper, .001)


def lamp():
    rod("Lamp floor mounting flange", (.85, .015, -2.5), (.85, .095, -2.5), .20, ivory, vertices=24)
    rod("Lamp pedestal cover", (.85, .07, -2.5), (.85, .34, -2.5), .087, ivory, .065, vertices=20)
    rod("Lamp support column", (.85, .26, -2.5), (.85, 2.29, -2.5), .037, steel, vertices=20)
    for yy in (.34, 2.22):
        rod("Column trim collar", (.85, yy, -2.5), (.85, yy + .06, -2.5), .054, ivory)
    joints = [(.85, 2.28, -2.5), (1.00, 2.95, -2.42), (.14, 3.0, -2.19), (0, 2.78, -1.94)]
    for a, b in zip(joints, joints[1:]):
        rod("Articulated lamp arm", a, b, .049, ivory, vertices=16)
    # A parallel spring arm makes the cantilever mechanism readable.
    rod("Lamp balancing linkage", (.87, 2.33, -2.43), (1.04, 2.92, -2.35), .015, steel)
    tube("Lamp routed electrical cable", [(.89, 2.2, -2.46), (1.10, 2.91, -2.4),
         (.15, 3.065, -2.2), (-.07, 2.83, -1.94)], .012, rubber)
    for a in joints:
        rod("Lamp hinge porcelain cover", (a[0], a[1], a[2] - .056),
            (a[0], a[1], a[2] + .056), .09, ivory, vertices=20)
        rod("Lamp hinge steel pin", (a[0], a[1], a[2] + .056),
            (a[0], a[1], a[2] + .061), .041, steel, vertices=16)
    rod("Lamp head ball joint", (0, 2.79, -1.94), (0, 2.67, -1.94), .045, steel)
    block("Examination lamp sculpted housing", (0, 2.644, -1.94), (.73, .135, .43), ivory, .12)
    block("Examination lamp lens gasket", (0, 2.575, -1.94), (.637, .015, .34), rubber, .085)
    block("Examination lamp reflector insert", (0, 2.564, -1.94), (.598, .015, .302), steel, .071)
    for x in (-.20, 0, .20):
        for z in (-2.024, -1.856):
            rod("Individual LED reflector bowl", (x, 2.561, z), (x, 2.541, z), .063, chrome, .049, vertices=20)
            rod("Frosted LED lens", (x, 2.539, z), (x, 2.536, z), .039, warm, vertices=20)
    for x in (-.43, .43):
        tube("Sterilisable lamp grip", [(x * .77, 2.645, -2.065), (x, 2.645, -2.065),
             (x * 1.08, 2.635, -1.94), (x, 2.645, -1.815), (x * .77, 2.645, -1.815)], .021, ivory)
    for x in (-.20, -.1, 0, .1, .2):
        block("Lamp cooling vent", (x, 2.704, -1.94), (.039, .009, .13), rubber, .014)
    sphere("Lamp power indicator", (.29, 2.637, -1.727), (.009, .009, .005), ui)


def stool():
    x, z = -1.32, -1.22
    rod("Stool pneumatic piston", (x, .16, z), (x, .59, z), .045, chrome)
    rod("Stool piston collar", (x, .21, z), (x, .4, z), .066, rubber)
    for i in range(5):
        a = i * math.tau / 5
        dx, dz = .34 * math.sin(a), .34 * math.cos(a)
        rod("Stool five star foot", (x, .19, z), (x + dx, .1, z + dz), .026, steel)
        rod("Stool caster", (x + dx - .03, .056, z + dz),
            (x + dx + .03, .056, z + dz), .045, rubber, vertices=12)
    rod("Stool underseat rim", (x, .55, z), (x, .61, z), .28, ivory, vertices=32)
    sphere("Stool ergonomic padded seat", (x, .636, z), (.30, .094, .30), sage)
    tube("Stool lumbar support stem", [(x, .57, z - .18), (x, .76, z - .29),
         (x, .91, z - .28)], .025, steel)
    block("Stool padded lumbar support", (x, .922, z - .28), (.46, .20, .105), sage, .065)
    rod("Stool height adjustment lever", (x + .1, .57, z), (x + .35, .54, z), .013, steel)
    block("Stool adjustment paddle", (x + .36, .543, z), (.10, .026, .05), rubber, .014)


cart((1.6, 0, -1.3))
lamp()
stool()

# A small original modelled appointment display, with tooth silhouettes and controls.
rod("Display support", (2.10, 1.0, -1.60), (2.10, 1.38, -1.60), .023, steel)
block("Cart display casing", (2.08, 1.43, -1.60), (.44, .30, .035), rubber, .023)
block("Cart display glass", (2.08, 1.43, -1.578), (.393, .249, .008), screen, .014)
block("Display patient title", (2.012, 1.523, -1.572), (.20, .007, .003), ui, .002)
block("Display metadata line", (1.995, 1.505, -1.572), (.165, .003, .003), steel, .001)
for i in range(6):
    angle = (i / 5) * math.pi
    xx, yy = 2.035 + .093 * math.cos(angle), 1.445 - .060 * math.sin(angle)
    sphere("Display tooth chart upper", (xx, yy, -1.568), (.012, .018, .003), ui)
    sphere("Display tooth chart lower", (xx, 1.365 + .05 * math.sin(angle), -1.568), (.010, .015, .003), paper)
for i in range(3):
    block("Display status row", (2.215, 1.46 - i * .043, -1.571), (.07, .006, .003), ui, .002)
    block("Display status value", (2.212, 1.445 - i * .043, -1.571), (.064, .004, .003), paper, .001)
sphere("Display active LED", (2.247, 1.296, -1.578), (.004, .004, .003), ui)

# Keep named parts in the native file. Render setup lives outside the asset collection.
asset_collection = bpy.data.collections.new("AUTHORED EQUIPMENT - game Y-up metres")
scene.collection.children.link(asset_collection)
for obj in parts:
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    asset_collection.objects.link(obj)

bpy.ops.mesh.primitive_plane_add(size=200)
floor = bpy.context.object
floor.name = "Studio floor - excluded from GLB"
floor.data.materials.append(material("Studio floor", (.18, .24, .22), roughness=.8))
world = scene.world or bpy.data.worlds.new("Studio world")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.65, .74, .72, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .4

def area(name, pos, power, size, color):
    bpy.ops.object.light_add(type="AREA", location=p(pos))
    obj = bpy.context.object
    obj.name = name
    obj.data.energy = power
    obj.data.shape = "DISK"
    obj.data.size = size
    obj.data.color = color
    obj.rotation_euler = (p((.6, 1.2, -1.3)) - obj.location).to_track_quat("-Z", "Y").to_euler()

area("Studio key", (0, 5, 2), 650, 4, (1, .91, .75))
area("Studio cool fill", (4, 3, -2), 470, 3, (.74, .9, 1))
area("Studio rim", (-3, 4, -3), 850, 3, (1, .92, .79))
bpy.ops.object.camera_add(location=p((4.7, 3.3, 3.5)))
camera = bpy.context.object
camera.name = "Equipment overview camera"
camera.rotation_euler = (p((.55, 1.40, -1.35)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 4.7
scene.camera = camera
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "MATERIAL"
# Screen-space cavity preserves small details without Workbench shadow streaks.
scene.display.shading.show_shadows = False
scene.display.shading.show_cavity = True
scene.display.shading.cavity_type = "BOTH"
scene.display.shading.background_type = "WORLD"
scene.render.resolution_x = 1200
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = "AgX"
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(ROOT / "assets/equipment-preview.png")
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "assets/clinic-equipment.blend"))
# Export before preview rendering so even an interrupted render leaves a usable GLB.
# Work on copies; the native Blender source retains all individually named parts.
export_parts = []
for original in parts:
    duplicate = original.copy()
    duplicate.data = original.data.copy()
    scene.collection.objects.link(duplicate)
    export_parts.append(duplicate)

# Export static equipment as one mesh per material, with all modifiers applied.
bpy.ops.object.select_all(action="DESELECT")
for obj in export_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = export_parts[0]
bpy.ops.object.convert(target="MESH")
converted = list(bpy.context.selected_objects)
for obj in converted:
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
groups = {}
for obj in converted:
    groups.setdefault(obj.data.materials[0].name, []).append(obj)
export_objects = []
for name, objects in groups.items():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    export_objects.append(obj)
bpy.ops.object.select_all(action="DESELECT")
for obj in export_objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(args.output_dir / "equipment.glb"),
                          use_selection=True, export_format="GLB", export_yup=True,
                          export_cameras=False, export_lights=False)
print(f"Exported equipment: {len(export_objects)} material meshes; "
      f"{(args.output_dir / 'equipment.glb').stat().st_size:,} bytes")

# Discard export-only copies, keeping the source and preview free of overlap.
for obj in export_objects:
    bpy.data.objects.remove(obj, do_unlink=True)
if not args.skip_preview:
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "assets/clinic-equipment.blend"))
