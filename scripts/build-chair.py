"""Author a rounded pediatric treatment chair; run in Blender."""
import bpy,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=bpy.data.scenes.get('Treatment chair') or bpy.data.scenes.new('Treatment chair')
bpy.context.window.scene=s
for o in list(s.objects):bpy.data.objects.remove(o,do_unlink=True)
def mat(name,color,metal=0):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=.38 if metal else .65
 return m
mint=mat('Chair sage upholstery',(.16,.39,.32));cream=mat('Chair ivory casing',(.71,.72,.65));steel=mat('Chair brushed alloy',(.43,.49,.49),.7)
def block(name,loc,size,material,rotation=0,bevel=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;o.rotation_euler[0]=rotation
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=4
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in o.data.polygons:p.use_smooth=True
 o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
block('Weighted base',(0,0,.1),(1.1,1.15,.2),cream)
block('Hydraulic lift',(0,0,.4),(.4,.55,.6),steel)
block('Seat shell',(0,0,.73),(1.0,1.1,.24),cream)
block('Seat cushion',(0,0,.88),(.91,1.02,.20),mint)
block('Reclined back shell',(0,-.9,1.12),(1.02,1.10,.24),cream,rotation=-.45)
block('Reclined back cushion',(0,-.93,1.25),(.92,1.1,.22),mint,rotation=-.45)
block('Headrest stem',(0,-1.50,1.44),(.23,.4,.11),steel,rotation=-.25)
block('Headrest',(0,-1.66,1.49),(.63,.49,.18),mint,rotation=-.25)
block('Leg rest',(0,.85,.68),(.90,.9,.22),mint,rotation=.38)
block('Footrest',(0,1.42,.47),(.85,.38,.12),steel)
for x in [-.62,.62]:
 block('Arm support',(x,-.03,.99),(.08,.13,.48),steel)
 block('Padded armrest',(x,-.08,1.20),(.2,.82,.16),mint)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(ROOT/'client/public/models/chair.glb'),use_selection=True,use_active_scene=True,export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/dental-studio.blend'))
print('Exported treatment chair')
