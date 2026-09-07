"""Run with Blender's Python. Normalize the original NIH scan and bake fissure shading.
After this, run build-instruments.py in the same Blender document.
"""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
scene=bpy.data.scenes.new('Little Smiles Assets')
bpy.context.window.scene=scene
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/source/dental-scan.glb'))
o=next(o for o in scene.objects if o.type=='MESH');o.parent=None;o.name='NIH_Dental_Arch'
bpy.context.view_layer.objects.active=o
bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
lo=Vector(tuple(min(v.co[i] for v in o.data.vertices) for i in range(3)))
hi=Vector(tuple(max(v.co[i] for v in o.data.vertices) for i in range(3)))
for v in o.data.vertices:
 v.co=(v.co-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)))*.075
 v.co.z=(hi.z-lo.z)*.075-v.co.z
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
mod=o.modifiers.new('Web mesh','DECIMATE');mod.ratio=.055
bpy.ops.object.modifier_apply(modifier=mod.name)
o.data.materials.clear()
for name,color,rough in [('Warm porcelain',(.58,.52,.40,1),.38),('Rose gingiva',(.38,.10,.13,1),.42)]:
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Roughness'].default_value=rough;o.data.materials.append(m)
for p in o.data.polygons:
 p.use_smooth=True
exec(compile((ROOT/'scripts/assign-gumline.py').read_text(),str(ROOT/'scripts/assign-gumline.py'),'exec'))
attr=o.data.color_attributes.new(name='Dental_AO',type='BYTE_COLOR',domain='CORNER');o.data.color_attributes.active_color=attr
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.bake.target='VERTEX_COLORS'
bpy.ops.object.bake(type='AO')
for c in attr.data:
 a=.2+.8*c.color[0];c.color=(a,a,a,1)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'client/public/models/dental-arch.glb'),use_selection=True,use_active_scene=True,export_format='GLB',export_vertex_color='ACTIVE')
