"""Original pediatric patient and treatment anatomy, authored with Blender.

Run: /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 2 --python scripts/build-patient.py
Optional arguments after --: --output-dir /path/to/models --skip-preview
All helper coordinates use the shipped game's Y-up metre convention. Mouth
anatomy uses its own enlarged modelling units and is displayed at scale .045.
"""
import argparse
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-dir', type=Path, default=ROOT / 'client/public/models')
parser.add_argument('--skip-preview', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
MODEL_DIR = args.output_dir
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MOUTH_ANCHOR = (0, 1.792, -1.155)
TARGETS = [(-1.46, .59, -.43), (1.46, .59, -.43), (-1.46, .59, .43), (1.46, .59, .43)]
bpy.ops.wm.read_factory_settings(use_empty=True)

def pos(p): return Vector((p[0], -p[2], p[1]))
def material(name, rgb, roughness=.48, metallic=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metallic
    return m
skin = material('Patient skin', (.60, .315, .185), .57)
shirt = material('Patient shirt', (.08, .40, .46), .78)
hair = material('Patient hair', (.055, .032, .021), .70)
blush = material('Soft cheek blush', (.68, .305, .205), .60)
pants = material('Patient chinos', (.46, .31, .16), .8)
shoe = material('Patient coral sneakers', (.74, .235, .13), .65)
white = material('Warm ivory', (.91, .92, .82), .58)
teal = material('Safety goggles frame', (.09, .34, .29), .33)
lens = material('Safety goggles lenses', (.105, .52, .49), .17, .28)
dark = material('Oral interior', (.09, .014, .025), .72)
lips = material('Patient lips', (.53, .145, .125), .54)
bib = material('Woven dental bib', (.47, .71, .73), .88)
steel = material('Bib clips', (.52, .62, .64), .24, .75)
gum = material('Healthy gingiva', (.64, .205, .245), .44)
palate = material('Tongue and palate', (.60, .135, .215), .46)
enamel = material('Tooth enamel', (.91, .87, .69), .26)
rootmat = material('Tooth neck', (.77, .68, .48), .40)
dentin = material('Prepared dentin', (.40, .25, .12), .67)
decay = material('Active decay', (.045, .018, .009), .83)
plaque = material('Plaque deposits', (.52, .34, .07), .71)
filling = material('Composite restoration', (.92, .905, .78), .25)


def finish(obj, name, mat):
    obj.name = name
    if mat: obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    return obj

def sphere(name, center, scale, mat, segments=24, rings=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=pos(center))
    o = bpy.context.object
    o.scale = (scale[0], scale[2], scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, name, mat)

def rod(name, a, b, radius, mat, radius_end=None, verts=16):
    d = pos(b) - pos(a)
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius, radius2=radius if radius_end is None else radius_end, depth=d.length, location=(pos(a)+pos(b))/2)
    o=bpy.context.object
    o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return finish(o,name,mat)

def rounded_box(name, center, dims, mat, radius=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos(center))
    o=bpy.context.object
    o.scale=(dims[0],dims[2],dims[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bevel=o.modifiers.new('Rounded sewn edges','BEVEL');bevel.width=radius;bevel.segments=3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return finish(o,name,mat)

def mesh(name, vertices, faces, mat):
    data=bpy.data.meshes.new(name)
    data.from_pydata([pos(p) for p in vertices],[],faces);data.update()
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
    return finish(ob,name,mat)

def tube(name, points, radius, mat, sides=10):
    # Sweep a true editable mesh along a polyline with a stable ring frame.
    vertices=[]; faces=[]
    for i,p in enumerate(points):
        p=Vector(p);a=Vector(points[max(0,i-1)]);b=Vector(points[min(len(points)-1,i+1)])
        tangent=(b-a).normalized(); normal=tangent.cross(Vector((0,1,0)))
        if normal.length<.01: normal=tangent.cross(Vector((1,0,0)))
        normal.normalize();binormal=tangent.cross(normal).normalized()
        for j in range(sides):
            q=p+radius*(normal*math.cos(j*math.tau/sides)+binormal*math.sin(j*math.tau/sides))
            vertices.append(q)
    for i in range(len(points)-1):
        for j in range(sides): faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
    return mesh(name,vertices,faces,mat)

def ellipse_tube(name, center, radii, radius, mat, count=40):
    cx,cy,cz=center
    pts=[(cx+radii[0]*math.cos(i*math.tau/count),cy,cz+radii[1]*math.sin(i*math.tau/count)) for i in range(count+1)]
    return tube(name,pts,radius,mat)

def export(scene, filename, preserve_prefixes=()):
    """Join export copies by material, retaining named editable source anatomy."""
    bpy.context.window.scene=scene
    groups={}
    dynamic=[]
    for original in list(scene.objects):
        if original.type!='MESH': continue
        if original.name.startswith(preserve_prefixes):
            # Preserve exact lesion names and independent pivots used by the game.
            dynamic.append(original)
            continue
        duplicate=original.copy()
        duplicate.data=original.data.copy()
        scene.collection.objects.link(duplicate)
        key=original.data.materials[0].name if original.data.materials else 'Mesh'
        groups.setdefault(key,[]).append(duplicate)
    export_objects=[]
    for name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        objects[0].name=name
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        export_objects.append(objects[0])
    bpy.ops.object.select_all(action='DESELECT')
    for obj in export_objects+dynamic:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(MODEL_DIR/filename),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    for obj in export_objects:
        bpy.data.objects.remove(obj,do_unlink=True)

patient_scene=bpy.context.scene
patient_scene.name='Patient - original sculpted child'
# Garments follow the reclined back and the two bends in the chair.
body=sphere('Cotton polo torso',(0,1.125,-.59),(.275,.19,.49),shirt)
body.rotation_euler[0]=-.33
sphere('Polo shoulder seam',(0,1.285,-.95),(.305,.135,.15),shirt)
sphere('Chino seat',(0,.975,-.13),(.25,.145,.225),pants)
rod('Neck',(0,1.33,-1.03),(0,1.53,-1.22),.094,skin,.089)
for side in [-1,1]:
    x=side
    # Sleeves, forearms, hands, and separated fingers remain visible beside bib.
    rod('Short sleeve',(x*.255,1.27,-.91),(x*.375,1.19,-.66),.105,shirt,.087)
    sphere('Sleeve cuff',(x*.372,1.185,-.655),(.091,.084,.043),shirt)
    rod('Upper arm',(x*.378,1.184,-.635),(x*.435,1.19,-.37),.065,skin,.059)
    sphere('Elbow',(x*.435,1.19,-.37),(.063,.061,.065),skin)
    rod('Forearm',(x*.435,1.19,-.37),(x*.39,1.234,-.15),.058,skin,.041)
    palm=sphere('Hand',(x*.385,1.24,-.094),(.059,.030,.086),skin)
    for j,length in enumerate([.091,.102,.098,.08]):
        xx=x*(.343+j*.023)
        a=(xx,1.241,-.035);b=(xx+x*.003,1.230,-.035+length)
        rod('Finger',a,b,.013,skin,.011,12);sphere('Fingertip',b,(.011,.012,.014),skin,12,8)
        sphere('Fingernail',(b[0],b[1]+.01,b[2]-.009),(.007,.003,.010),white,12,8)
    rod('Thumb',(x*.34,1.24,-.1),(x*.312,1.228,-.038),.019,skin,.014)
    sphere('Thumb tip',(x*.312,1.228,-.038),(.014,.015,.018),skin,16,10)
    # Trouser legs are tapered, with cloth cuffs and recognisable sneakers.
    rod('Chino thigh',(x*.13,.96,-.05),(x*.155,.75,.50),.116,pants,.093,20)
    sphere('Chino knee',(x*.155,.75,.50),(.097,.09,.11),pants)
    rod('Chino shin',(x*.155,.75,.50),(x*.16,.515,.94),.091,pants,.067,20)
    rod('Trouser cuff',(x*.16,.537,.90),(x*.16,.509,.955),.071,pants,.073)
    rod('Socks',(x*.16,.507,.95),(x*.16,.46,1.035),.060,white,.059)
    sphere('Sneaker upper',(x*.16,.442,1.09),(.088,.075,.163),shoe)
    sole=rounded_box('Rubber sole',(x*.16,.394,1.10),(.181,.045,.308),white,.026)
    sphere('Sneaker toe cap',(x*.16,.45,1.209),(.083,.044,.061),white,20,10)
    for z in [1.032,1.063,1.094]:
        rod('Sneaker lace',(x*.16-.052,.505,z),(x*.16+.052,.505,z+.008),.006,white,verts=10)
    rod('Trouser side stitch',(x*.23,.92,.06),(x*.25,.77,.43),.003,white,verts=8)

# Main head and lower face get genuine cut-away mouth opening.
head=sphere('Head sculpt',(0,1.57,-1.34),(.178,.224,.250),skin,40,24)
jaw=sphere('Lower face sculpt',(0,1.64,-1.17),(.133,.153,.132),skin,32,20)
sphere('Chin',(0,1.668,-1.07),(.099,.086,.059),skin)
for part in [head,jaw]:
    cutter=sphere('Temporary oral cavity cutter',(0,1.79,-1.155),(.105,.136,.088),None,32,20)
    bpy.context.view_layer.objects.active=part
    mod=part.modifiers.new('True open oral cavity','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
# Cheek shapes, ears, nose bridge and nostrils provide a human facial silhouette.
for side in [-1,1]:
    sphere('Ear',(side*.180,1.576,-1.344),(.034,.062,.039),skin)
    sphere('Ear concha',(side*.198,1.594,-1.339),(.014,.034,.020),blush)
    sphere('Cheek',(side*.114,1.721,-1.224),(.051,.036,.055),blush,20,12)
    sphere('Nose wing',(side*.027,1.791,-1.346),(.024,.026,.026),skin)
    sphere('Nostril',(side*.025,1.800,-1.323),(.011,.006,.008),dark,16,8)
sphere('Nose bridge',(0,1.786,-1.389),(.029,.035,.061),skin)
sphere('Nose tip',(0,1.817,-1.349),(.034,.027,.030),skin)
# Sculpted hair cap with gently overlapping locks around the forehead.
sphere('Hair back cap',(0,1.544,-1.457),(.184,.211,.164),hair,28,18)
for side in [-1,1]:
    sphere('Temple hair',(side*.153,1.616,-1.405),(.043,.087,.089),hair)
for i in range(8):
    x=-.151+i*.042
    lock=sphere('Side swept hair lock',(x,1.765+.015*math.sin(i*.5),-1.493+.025*math.sin(i*.7)),(.044,.042,.068),hair,18,12)
    lock.rotation_euler[1]=-.3
# Soft safety goggles are separate sculpted frames and inset tinted lenses.
for side in [-1,1]:
    c=(side*.083,1.776,-1.435)
    ellipse_tube('Goggle eye frame',c,(.069,.047),.010,teal,32)
    sphere('Tinted safety lens',(c[0],c[1]-.002,c[2]),(.060,.012,.039),lens,24,12)
    rod('Goggle arm',(side*.145,1.769,-1.435),(side*.177,1.614,-1.371),.009,teal)
rod('Goggle nose bridge',(-.018,1.784,-1.435),(.018,1.784,-1.435),.009,teal)
# Outer vermilion lip and inset dark oral well; mouth model supplies anatomy.
ellipse_tube('Open lips',MOUTH_ANCHOR,(.100,.085),.012,lips,48)
sphere('Oral darkness',(0,1.715,-1.155),(.098,.054,.083),dark,24,14)
# Protective bib follows the body slope; embossed fold and two metal clips.
bib_mesh=mesh('Textured patient bib',[(-.153,1.420,-1.10),(.153,1.420,-1.10),(.213,1.275,-.60),(-.213,1.275,-.60)],[(3,2,1,0)],bib)
solid=bib_mesh.modifiers.new('Cloth thickness','SOLIDIFY');solid.thickness=.007
bpy.context.view_layer.objects.active=bib_mesh;bpy.ops.object.modifier_apply(modifier=solid.name)
for x in [-.143,.143]:
    rod('Bib clasp',(x,1.433,-1.093),(x,1.407,-1.015),.012,steel)
for z in [-.96,-.87,-.78,-.69]:
    y=1.42-(z+1.10)*.29
    tube('Woven bib fold',[(-.15,y+.007,z),(0,y+.009,z+.007),(.15,y+.007,z)],.0027,white,6)
export(patient_scene,'patient.glb')

mouth_scene=bpy.data.scenes.new('Treatment mouth - editable anatomy')
bpy.context.window.scene=mouth_scene
# Recessed oral basin; its up-facing bowl surrounds a sculpted tongue.
basin_vertices=[];basin_faces=[]
for radius,y in [(.01,-.54),(.30,-.48),(.65,-.32),(.85,-.055),(1.0,.08)]:
    for j in range(48):
        t=j*math.tau/48
        basin_vertices.append((2.05*radius*math.cos(t),y,1.87*radius*math.sin(t)))
for ri in range(4):
    for j in range(48):
        basin_faces.append((ri*48+j,(ri+1)*48+j,(ri+1)*48+(j+1)%48,ri*48+(j+1)%48))
mesh('Concave oral vestibule',basin_vertices,basin_faces,dark)
sphere('Tongue body',(0,.11,.34),(.83,.21,1.01),palate,28,18)
tube('Median tongue groove',[(0,.312,.95),(0,.325,.65),(0,.324,.32),(0,.309,.04)],.018,gum)
for j in range(4):
    z=-.78+j*.16
    tube('Palatal ruga',[(-.52,.13,z),(0,.17,z-.065),(.52,.13,z)],.030,palate)
# Complete upper and lower gum arches use a broad swept horseshoe, not blocks.
for upper in [True,False]:
    sign=-1 if upper else 1
    points=[]
    for j in range(41):
        t=math.pi*j/40
        points.append((1.48*math.cos(t),.015,sign*(.28+1.15*math.sin(t))))
    tube(('Upper' if upper else 'Lower')+' alveolar ridge',points,.325,gum,14)
# Crown rings use rounded square contours with sculpted occlusal cusps.
def crown(name,cx,cz,sx,sz,kind,rotation=0,target=None):
    n=32;v=[];f=[]
    # y, planar scale. Inner rings create a real cavity for treatment teeth.
    rings=[(-.08,.73),(.12,.84),(.38,1.0),(.57,.93),(.61,.65),(.54,.32)]
    if kind=='incisor':rings=[(-.08,.64),(.10,.85),(.43,1),(.67,.91),(.68,.5),(.68,.05)]
    elif kind=='canine':rings=[(-.08,.71),(.10,.92),(.44,1),(.67,.60),(.79,.15),(.79,.02)]
    elif target is not None:rings=[(-.08,.73),(.12,.84),(.38,1),(.57,.94),(.63,.68),(.56,.39),(.38,.29)]
    for ri,(y,r) in enumerate(rings):
        for j in range(n):
            t=j*math.tau/n
            # Superellipse instead of spheres gives incisors and molars real crown silhouettes.
            xx=math.copysign(abs(math.cos(t))**.56,math.cos(t))*sx*r
            zz=math.copysign(abs(math.sin(t))**.56,math.sin(t))*sz*r
            cusp=0
            if kind in ('molar','premolar') and ri in [3,4]:cusp=.062*(1-math.cos(4*t))
            x=xx*math.cos(rotation)-zz*math.sin(rotation)
            z=xx*math.sin(rotation)+zz*math.cos(rotation)
            v.append((cx+x,y+cusp,cz+z))
    for ri in range(len(rings)-1):
        for j in range(n):f.append((ri*n+j,ri*n+(j+1)%n,(ri+1)*n+(j+1)%n,(ri+1)*n+j))
    f.append(tuple(reversed(range(n))))
    f.append(tuple((len(rings)-1)*n+j for j in range(n)))
    ob=mesh(name,v,[tuple(reversed(face)) for face in f],enamel)
    if target is not None:
        # A recessed warm floor remains visible after excavation, below restoration.
        sphere('Prepared dentin liner',(cx,.405,cz),(.135,.018,.135),dentin,20,10)
        # Pivot every state at its own lesion centre so scale animation stays local.
        sphere('decay_'+str(target),(cx,.430,cz),(.125,.065,.130),decay,20,12)
        deposit=sphere('plaque_'+str(target),(cx,.598,cz),(.25,.031,.205),plaque,20,10)
        sphere('filling_'+str(target),(cx,.588,cz),(.172,.064,.173),filling,24,14)
    return ob

for upper in [True,False]:
    sign=-1 if upper else 1
    prefix='Maxillary' if upper else 'Mandibular'
    for side in [-1,1]:
        target=(0 if side<0 else 1)+(0 if upper else 2)
        crown(prefix+' first molar',side*1.46,sign*.43,.365,.345,'molar',target=target)
        crown(prefix+' premolar',side*1.37,sign*.94,.268,.261,'premolar',rotation=side*sign*.36)
        crown(prefix+' canine',side*1.01,sign*1.275,.224,.222,'canine',rotation=side*sign*.63)
        crown(prefix+' lateral incisor',side*.614,sign*1.447,.188,.165,'incisor',rotation=side*sign*.26)
        crown(prefix+' central incisor',side*.209,sign*1.498,.192,.171,'incisor',rotation=side*sign*.08)
        # Warm neck contour makes the gum/individual tooth boundary readable.
        sphere(prefix+' gingival papilla',(side*1.43,.25,sign*.71),(.115,.13,.08),gum,16,10)
export(mouth_scene,'treatment-mouth.glb',('decay_','plaque_','filling_'))

# Inspection scene uses linked original meshes, with anatomy placed in the patient.
preview=bpy.data.scenes.new('Patient studio preview')
bpy.context.window.scene=preview
for ob in patient_scene.objects:
    if ob.type=='MESH':preview.collection.objects.link(ob)
for ob in mouth_scene.objects:
    if ob.type!='MESH' or ob.name.startswith('filling_'):continue
    dup=ob.copy();dup.data=ob.data;preview.collection.objects.link(dup)
    dup.location=pos(MOUTH_ANCHOR)+ob.location*.045
    dup.scale*=.045
# Inspection-only chair pad and ground do not enter either GLB.
padmat=material('Preview headrest',(.16,.23,.25))
sphere('Inspection headrest',(0,1.47,-1.38),(.28,.12,.34),padmat)
bodypad=rounded_box('Inspection back pad',(0,1.035,-.51),(.76,.12,1.60),padmat,.1)
bodypad.rotation_euler[0]=-.35
sphere('Inspection leg support',(0,.62,.60),(.40,.10,.78),padmat)
floormat=material('Studio backdrop',(.05,.08,.09))
rounded_box('Studio plinth',(0,.12,0),(6,.1,6),floormat,.03)

def aim(o,target):o.rotation_euler=(pos(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=pos((2.45,3.85,1.78)))
cam=bpy.context.object;cam.name='Patient inspection camera';cam.data.type='ORTHO';cam.data.ortho_scale=3.55;aim(cam,(0,1,-.27));preview.camera=cam
for name,loc,energy,size in [('Large softbox',(-3,5,-3),550,4),('Warm fill',(3,4,1),420,3),('Face light',(0,4,-1.3),110,1)]:
    bpy.ops.object.light_add(type='AREA',location=pos(loc));light=bpy.context.object;light.name=name;light.data.energy=energy;light.data.shape='DISK';light.data.size=size;aim(light,(0,1,-.4))
preview.world=bpy.data.worlds.new('Soft blue studio');preview.world.use_nodes=True;preview.world.node_tree.nodes['Background'].inputs[0].default_value=(.17,.23,.25,1);preview.world.node_tree.nodes['Background'].inputs[1].default_value=.4
preview.render.engine='BLENDER_WORKBENCH'
preview.display.shading.light='STUDIO';preview.display.shading.color_type='MATERIAL';preview.display.shading.show_shadows=True;preview.display.shading.show_cavity=True;preview.display.shading.cavity_type='BOTH';preview.display.shading.background_type='WORLD'
preview.render.resolution_x=1000;preview.render.resolution_y=1000;preview.render.resolution_percentage=100
preview.view_settings.view_transform='AgX'
preview.render.image_settings.file_format='PNG';preview.render.filepath=str(ROOT/'assets/patient-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/patient-studio.blend'))
if not args.skip_preview:bpy.ops.render.render(write_still=True)
# Separate anatomy close-up at 1:1 modelling scale.
bpy.context.window.scene=mouth_scene
for ob in preview.objects:
    if ob.type=='LIGHT':mouth_scene.collection.objects.link(ob)
for ob in mouth_scene.objects:
    if ob.name.startswith('filling_'):ob.hide_render=True
bpy.ops.object.camera_add(location=pos((.2,6.9,2.0)))
mcam=bpy.context.object;mcam.data.type='ORTHO';mcam.data.ortho_scale=4.9;aim(mcam,(0,0,0));mouth_scene.camera=mcam
mouth_scene.world=preview.world;mouth_scene.render.engine='BLENDER_WORKBENCH'
mouth_scene.display.shading.light='STUDIO';mouth_scene.display.shading.color_type='MATERIAL';mouth_scene.display.shading.show_shadows=True;mouth_scene.display.shading.show_cavity=True;mouth_scene.display.shading.cavity_type='BOTH'
mouth_scene.render.resolution_x=1000;mouth_scene.render.resolution_y=1000;mouth_scene.render.resolution_percentage=100
mouth_scene.render.image_settings.file_format='PNG';mouth_scene.render.filepath=str(ROOT/'assets/treatment-mouth-preview.png')
if not args.skip_preview:bpy.ops.render.render(write_still=True)
# Save preview camera as default while retaining individual authoring scenes.
bpy.context.window.scene=preview
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/patient-studio.blend'))
print('MOUTH_ANCHOR',MOUTH_ANCHOR)
print('TREATMENT_TARGETS',TARGETS)
for p in [MODEL_DIR/'patient.glb',MODEL_DIR/'treatment-mouth.glb']:print(p.name,p.stat().st_size,'bytes')
