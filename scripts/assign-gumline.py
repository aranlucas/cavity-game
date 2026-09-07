"""Art-directed crown masks for the normalized NIH scan; not clinical segmentation."""
import bpy
from mathutils import Vector
# Crown centers and footprints traced from the scan's occlusal view.
CROWNS = [
 (-1.62,1.64,.45,.46),(-1.77,.87,.46,.43),
 (-1.88,.21,.40,.32),(-1.91,-.366,.37,.32),
 (-1.812,-.894,.33,.30),(-1.56,-1.41,.32,.31),
 (-1.176,-1.722,.35,.25),(-.678,-1.902,.31,.28),
 (-.132,-1.95,.31,.27),(.396,-1.842,.30,.29),
 (.792,-1.536,.33,.34),(1.17,-1.158,.36,.35),
 (1.536,-.612,.46,.45),(1.986,-.018,.45,.46),
]
o=bpy.data.objects['NIH_Dental_Arch']
crowns=[]
for x,y,rx,ry in CROWNS:
 hit,loc,_,_=o.ray_cast(Vector((x,y,4)),Vector((0,0,-1)))
 if hit:crowns.append((x,y,loc.z,rx,ry))
for p in o.data.polygons:
 c=sum((o.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
 enamel=False
 for x,y,z,rx,ry in crowns:
  # Rounded shoulder narrows toward the cervical margin, giving gum papillae
  # room between adjacent crowns rather than painting one flat horizontal strip.
  front = y < -1.3
  if front:
   # The broad facial surfaces of incisors cannot be segmented using an
   # occlusal ellipse: that paints stripes down their faces and white gum below.
   # Follow the arch tangent and give each crown a scalloped cervical margin.
   tangent=Vector((1, -.42*x, 0)).normalized()
   normal=Vector((-tangent.y,tangent.x,0))
   delta=Vector((c.x-x,c.y-y,0))
   along=abs(delta.dot(tangent));across=abs(delta.dot(normal))
   half_width=rx*1.18
   neck=z-(.50 if x < -1.4 else .35)
   gumline=neck+.28*min(1,along/half_width)**2
   if along<half_width and across<.65 and c.z>gumline:
    enamel=True;break
  else:
   radial=((c.x-x)/rx)**2+((c.y-y)/ry)**2
   shoulder=max(0,(z-.12-c.z)/.52)**2
   if radial+shoulder<1.12 and c.z>z-.59:
    enamel=True;break

 p.material_index=0 if enamel else 1
print('Gum coverage:',round(100*sum(p.material_index==1 for p in o.data.polygons)/len(o.data.polygons),1),'percent of faces')

# Reapply the scan-traced facial margin after the broad crown masks.
from pathlib import Path
trace_script=Path(__file__).with_name("trace-front-gumline.py")
exec(compile(trace_script.read_text(),str(trace_script),"exec"),{"__file__":str(trace_script)})
