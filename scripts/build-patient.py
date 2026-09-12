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
lips = material('Patient lips', (.46, .16, .145), .48)
bib = material('Woven dental bib', (.47, .71, .73), .88)
steel = material('Bib clips', (.52, .62, .64), .24, .75)
gum = material('Healthy gingiva', (.49, .165, .185), .48)
palate = material('Tongue and palate', (.49, .135, .17), .5)
enamel = material('Tooth enamel', (.85, .82, .71), .29)
rootmat = material('Tooth neck', (.72, .65, .49), .36)
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

def lip_outline(t):
    s=abs(math.sin(t));x=2.13*math.cos(t);upper=math.sin(t)>=0
    z=(-1.43 if upper else 1.57)*s**.83
    if upper:z+=.11*math.exp(-(x/.34)**2)*s
    return x,z

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

# One continuous loft forms the forehead, cheekbones, tapered jaw and chin.
# A broad facial plane keeps the lips seated in skin; no intersecting cheek
# or chin spheres remain visible under close treatment lighting.
profile=[(-1.59,.012,1.55,.025),(-1.565,.085,1.55,.14),
         (-1.52,.15,1.565,.22),(-1.43,.177,1.575,.225),
         (-1.34,.179,1.579,.223),(-1.255,.167,1.583,.221),
         (-1.18,.149,1.589,.21),(-1.11,.132,1.596,.199),
         (-1.065,.108,1.604,.188),(-1.035,.069,1.61,.148),
         (-1.016,.032,1.613,.08),(-1.006,.004,1.613,.009)]
v=[];f=[];segments=64
for z,rx,cy,ry in profile:
    for j in range(segments):
        t=math.tau*j/segments;s=math.sin(t)
        y=cy+ry*math.copysign(abs(s)**(.63 if s>0 else 1),s)
        v.append((rx*math.cos(t),y,z))
for i in range(len(profile)-1):
    for j in range(segments):
        a=i*segments+j;b=i*segments+(j+1)%segments
        f.append((a,b,b+segments,a+segments))
f.extend([tuple(reversed(range(segments))),tuple((len(profile)-1)*segments+j for j in range(segments))])
head=mesh('Continuous face and jaw',v,f,skin)
bpy.context.view_layer.objects.active=head
smooth=head.modifiers.new('Sculpted facial contours','SUBSURF');smooth.levels=2
bpy.ops.object.modifier_apply(modifier=smooth.name)
# Cut the exact inner lip contour rather than an unrelated ellipse. This
# avoids exposed boolean edges between the vermilion and the facial skin.
cv=[];cf=[];count=128
for y in [1.62,1.92]:
    for j in range(count):
        x,z=lip_outline(math.tau*j/count)
        cv.append((x*.045,y,MOUTH_ANCHOR[2]+z*.045))
for j in range(count):cf.append((j,(j+1)%count,(j+1)%count+count,j+count))
cf.extend([tuple(reversed(range(count))),tuple(count+j for j in range(count))])
cutter=mesh('Temporary oral cavity cutter',cv,cf,None)
bpy.context.view_layer.objects.active=head
mod=head.modifiers.new('True open oral cavity','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cutter,do_unlink=True)
finish(head,'Continuous face and jaw',None)
# Cheek shapes, ears, nose bridge and nostrils provide a human facial silhouette.
for side in [-1,1]:
    sphere('Ear',(side*.180,1.576,-1.344),(.034,.062,.039),skin)
    sphere('Ear concha',(side*.198,1.594,-1.339),(.014,.034,.020),blush)
    sphere('Nose wing',(side*.024,1.800,-1.301),(.021,.023,.025),skin)
    sphere('Nostril',(side*.022,1.810,-1.278),(.009,.005,.007),dark,20,12)
sphere('Nose bridge',(0,1.794,-1.365),(.025,.033,.079),skin)
sphere('Nose tip',(0,1.824,-1.304),(.029,.025,.028),skin)
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
# Sculpt upper and lower lips as tapered ribbons, with a cupid's bow and
# a fuller lower lip. The outer edge sinks into the continuous facial skin.
for upper in [True,False]:
    v=[];f=[];segments=64;cross=8
    for i in range(segments+1):
        t=math.pi*i/segments;s=math.sin(t);x=2.13*math.cos(t)
        sign=-1 if upper else 1
        _,z=lip_outline(t if upper else math.tau-t)
        thickness=(.20 if upper else .25)*s**.65
        for j in range(cross+1):
            u=j/cross
            # Follow the skin's curvature and feather the outer border into
            # it. A small raised middle gives volume without a tube profile.
            xx=x*.045;zz=MOUTH_ANCHOR[2]+(z+sign*thickness*u)*.045
            a,b=next((a,b) for a,b in zip(profile,profile[1:]) if a[0]<=zz<=b[0])
            mix=(zz-a[0])/(b[0]-a[0]);rx,cy,ry=[a[k]+(b[k]-a[k])*mix for k in range(1,4)]
            skin_y=cy+ry*max(0,1-(xx/rx)**2)**.315
            y=skin_y+.0008+.0045*math.sin(math.pi*u)*s**.6
            v.append((xx,y,zz))
    for i in range(segments):
        for j in range(cross):
            a=i*(cross+1)+j
            face=(a,a+1,a+cross+2,a+cross+1)
            f.append(tuple(reversed(face)) if upper else face)
    mesh(('Upper' if upper else 'Lower')+' sculpted lip',v,f,lips)
sphere('Oral darkness',(0,1.715,-1.155),(.098,.054,.073),dark,32,18)
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
# Recessed oral cavity. The opening is wider than it is tall, and its
# rear wall stays behind the teeth instead of making a flat burgundy disc.
basin_vertices=[];basin_faces=[]
for radius,y in [(.01,-.70),(.30,-.66),(.58,-.50),(.78,-.30),(.94,-.12),(1.0,-.09)]:
    for j in range(64):
        t=j*math.tau/64
        # The cheeks curve away from the camera at the mouth corners.
        # Recess the vestibule there so it cannot cover the tapered lips.
        depth=y-.70*radius**3*abs(math.cos(t))**3
        basin_vertices.append((2.10*radius*math.cos(t),depth,1.55*radius*math.sin(t)))
for ri in range(5):
    for j in range(64):
        basin_faces.append((ri*64+j,(ri+1)*64+j,(ri+1)*64+(j+1)%64,ri*64+(j+1)%64))
mesh('Concave oral vestibule',basin_vertices,basin_faces,dark)
tongue=sphere('Sculpted recessed tongue',(0,-.13,.12),(.78,.245,.90),palate,64,40)
for vertex in tongue.data.vertices:
    # Local Blender Z points out of the mouth. Depress the upper surface
    # into a shallow median groove; no raised line or floating palate rods.
    x,z,y=vertex.co.x,-vertex.co.y,vertex.co.z
    front=(z+.9)/1.8
    vertex.co.x*=1-.18*front
    if y>0:
        vertex.co.z-=.028*math.exp(-(x/.075)**2)*math.sin(math.pi*front)**2*(y/.245)
# Slimmer alveolar ridges follow the necks, leaving individual gum margins.
for upper in [True,False]:
    sign=-1 if upper else 1
    points=[]
    for j in range(41):
        t=math.pi*j/40
        points.append((1.48*math.cos(t),-.14,sign*(.31+1.13*math.sin(t))))
    tube(('Upper' if upper else 'Lower')+' alveolar ridge',points,.205,gum,18)
# Each crown has a cervical contour, rounded body and its own cutting or
# chewing surface. Anterior crowns lean inward to expose their broad face.
def crown(name,cx,cz,sx,sz,kind,rotation=0,target=None,lean=0,base_y=0,height=1):
    n=48;v=[];f=[]
    # Height, width, depth. Incisors finish with a thin blade, not a square top.
    rings=[(-.08,.73,.73),(.06,.83,.83),(.25,.98,.98),(.43,1,1),(.55,.96,.96),(.60,.78,.78),(.57,.49,.49),(.53,.12,.12)]
    if kind=='incisor':rings=[(-.08,.65,.7),(.03,.77,.88),(.20,.93,1),(.43,1,.78),(.62,1,.37),(.69,.97,.19),(.71,.93,.07)]
    elif kind=='canine':rings=[(-.08,.67,.73),(.07,.84,.95),(.30,1,1),(.49,.90,.81),(.66,.56,.46),(.76,.18,.17),(.78,.035,.035)]
    elif target is not None:rings=[(-.08,.73,.73),(.06,.83,.83),(.25,.98,.98),(.43,1,1),(.55,.96,.96),(.61,.75,.75),(.58,.46,.46),(.39,.29,.29)]
    for ri,(y,rx,rz) in enumerate(rings):
        y*=height
        for j in range(n):
            t=j*math.tau/n
            # Superellipse instead of spheres gives incisors and molars real crown silhouettes.
            xx=math.copysign(abs(math.cos(t))**.62,math.cos(t))*sx*rx
            zz=math.copysign(abs(math.sin(t))**.62,math.sin(t))*sz*rz
            cusp=0
            if kind in ('molar','premolar'):
                cusp=.025*(1-math.cos(4*t))*math.exp(-((ri-4.8)/1.35)**2)
            x=xx*math.cos(rotation)-zz*math.sin(rotation)
            z=xx*math.sin(rotation)+zz*math.cos(rotation)
            v.append((cx+x,base_y+(y+cusp)*math.cos(lean)-z*math.sin(lean),cz+(y+cusp)*math.sin(lean)+z*math.cos(lean)))
    for ri in range(len(rings)-1):
        for j in range(n):f.append((ri*n+j,ri*n+(j+1)%n,(ri+1)*n+(j+1)%n,(ri+1)*n+j))
    f.append(tuple(reversed(range(n))))
    f.append(tuple((len(rings)-1)*n+j for j in range(n)))
    ob=mesh(name,v,[tuple(reversed(face)) for face in f],enamel)
    ob.data.materials.append(rootmat)
    for polygon in ob.data.polygons:
        if polygon.index<n:polygon.material_index=1
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
        crown(prefix+' premolar',side*1.37,sign*.94,.268,.25,'premolar',rotation=side*sign*.32,lean=-sign*.18,base_y=-.08)
        crown(prefix+' canine',side*1.04,sign*1.29,.223,.19,'canine',rotation=side*sign*.38,lean=-sign*(.85 if upper else .62),base_y=-.03,height=1 if upper else .85)
        crown(prefix+' lateral incisor',side*.658,sign*1.435,.186,.16,'incisor',rotation=side*sign*.17,lean=-sign*(1.40 if upper else 1.12),base_y=.04 if upper else -.06,height=1 if upper else .78)
        crown(prefix+' central incisor',side*.242,sign*1.47,.225 if upper else .207,.16,'incisor',rotation=side*sign*.04,lean=-sign*(1.50 if upper else 1.12),base_y=.04 if upper else -.06,height=1 if upper else .78)
        # Warm neck contour makes the gum/individual tooth boundary readable.
        sphere(prefix+' gingival papilla',(side*1.43,.12,sign*.71),(.085,.11,.073),gum,20,12)
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
# A face close-up catches lip seams and crown proportions in the game angle.
cam.location=pos((MOUTH_ANCHOR[0],MOUTH_ANCHOR[1]+.32,MOUTH_ANCHOR[2]+.18))
cam.data.ortho_scale=.40;aim(cam,(MOUTH_ANCHOR[0],MOUTH_ANCHOR[1]+.015,MOUTH_ANCHOR[2]))
preview.render.filepath=str(ROOT/'assets/treatment-face-preview.png')
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
