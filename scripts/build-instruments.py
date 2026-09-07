import bpy, math
from mathutils import Vector
from pathlib import Path
ROOT=str(Path(__file__).resolve().parents[1])
def material(name,color,metal=0,rough=.3):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
 return m
steel=material('Satin surgical steel',(.52,.62,.66),.85,.23)
teal=material('Silicone mint grip',(.07,.42,.36),0,.55)
blue=material('Curing light housing',(.1,.18,.27),.2)
polish=material('Polishing rubber',(.62,.3,.66),0,.55)
def rod(name,a,b,r,mat,r2=None):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(Vector(a)+Vector(b))/2)
 o=bpy.context.object;o.name=name;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 bevel=o.modifiers.new('Machined edges','BEVEL');bevel.width=.012;bevel.segments=2
 return o
for kind in ['mirror','polisher','excavator','composite','curing']:
 scene=bpy.data.scenes.new('Instrument '+kind);bpy.context.window.scene=scene
 rod('Grip',(0,0,.42),(0,0,2),.09,teal if kind!='curing' else blue)
 for z in [.5,.57,.64,1.65,1.72,1.79]:rod('Grip ring',(0,0,z),(0,0,z+.018),.096,steel)
 rod('Tapered neck',(0,0,.42),(0,0,.1),.065,steel,.025)
 rod('Angled tip',(0,0,.1),(.18,0,0),.026,steel)
 if kind=='mirror':
  rod('Mirror rim',(.2,0,-.025),(.2,0,.025),.2,steel)
  rod('Reflective face',(.2,0,.026),(.2,0,.03),.174,material('Mirror',(.78,.88,.9),1,.06))
 elif kind=='polisher':rod('Polishing cup',(.18,0,0),(.18,0,-.12),.065,polish,.09)
 elif kind=='excavator':rod('Fine bur',(.18,0,0),(.18,0,-.14),.025,steel,.018)
 elif kind=='composite':rod('Composite applicator',(.18,0,0),(.18,0,-.13),.04,teal,.012)
 else:
  rod('Light guide',(.18,0,0),(.18,0,-.14),.065,blue)
  rod('Blue lens',(.18,0,-.14),(.18,0,-.15),.065,material('Blue LED',(.08,.35,.95)))
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.export_scene.gltf(filepath=ROOT+'/client/public/models/'+kind+'.glb',use_selection=True,use_active_scene=True,export_format='GLB',export_vertex_color='ACTIVE')
bpy.context.window.scene=bpy.data.scenes['Little Smiles Assets']
bpy.ops.object.select_all(action='DESELECT');bpy.data.objects['NIH_Dental_Arch'].select_set(True)
bpy.ops.export_scene.gltf(filepath=ROOT+'/client/public/models/dental-arch.glb',use_selection=True,use_active_scene=True,export_format='GLB',export_vertex_color='ACTIVE')
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/dental-studio.blend')
print('Exported arch and five instruments; saved editable Blender source.')
