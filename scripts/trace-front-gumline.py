"""Apply visible-surface cervical stencils traced on orthographic scan renders.
Depth gating prevents projected strokes from touching the opposite arch.
"""
import bpy,json,bisect
from pathlib import Path
from mathutils import Vector,Matrix,Euler
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
o=bpy.data.objects['NIH_Dental_Arch']
mesh=o.data
bvh=BVHTree.FromPolygons([v.co for v in mesh.vertices],[p.vertices[:] for p in mesh.polygons])
for filename in ['left-gumline-trace.json','right-gumline-trace.json','front-gumline-trace.json','inner-gumline-trace.json']:
 trace=json.loads((ROOT/'scripts'/filename).read_text())
 width,height=trace['resolution'];scale=trace['ortho_scale']
 rotation=Euler(trace['camera_rotation']).to_matrix() if 'camera_rotation' in trace else Matrix.Rotation(trace['camera_rotation_x'],3,'X')
 direction=rotation@Vector((0,0,-1));position=Vector(trace['camera_position'])
 pixels=trace['pixels'];columns=[p[0] for p in pixels]
 changed=0
 for p in mesh.polygons:
  c=p.center
  if filename.startswith('left') and c.x>-.9:continue
  if filename.startswith('right') and c.x<.8:continue
  if filename.startswith('front') and c.y>-1.2 and c.x<0:continue
  view=rotation.transposed()@(c-position)
  px=(view.x/scale+.5)*width;py=(.5-view.y/(scale*height/width))*height
  if px<columns[0] or px>columns[-1]:continue
  j=min(len(columns)-2,max(0,bisect.bisect_right(columns,px)-1))
  a,b=pixels[j],pixels[j+1];edge=a[1]+(b[1]-a[1])*(px-a[0])/(b[0]-a[0])
  # Compare depth with the gumline itself to exclude the far arch.
  boundary_origin=position+rotation@Vector((view.x,(.5-edge/height)*scale*height/width,0))
  loc,_,_,_=bvh.ray_cast(boundary_origin,direction)
  if loc is None:continue
  if abs((c-loc).dot(direction))>0.85:continue
  origin=position+rotation@Vector((view.x,view.y,0))
  hit,_,index,_=bvh.ray_cast(origin,direction)
  if hit is None or (hit-c).length>.025:continue
  material=0 if py<edge else 1
  changed+=p.material_index!=material;p.material_index=material
 print(filename,changed)
# Closed posterior stencils preserve full crowns, including their inner walls.
t=json.loads((ROOT/'scripts/inner-gumline-trace.json').read_text())
r=Euler(t['camera_rotation']).to_matrix();origin=Vector(t['camera_position']);direction=r@Vector((0,0,-1))
# Pixel polygons traced against inner-reference.png (1600 x 1000).
regions=[[(0, 0), (760, 0), [749, 279], [730, 300], [706, 314], [684, 317], [668, 323], [660, 352], [640, 386], [609, 400], [575, 399], [551, 382], [540, 365], [547, 414], [530, 455], [503, 480], [478, 489], [457, 472], [446, 460], [466, 530], [451, 587], [423, 620], [391, 635], [356, 635], [339, 620], [332, 674], [306, 714], [267, 746], [219, 766], [151, 774], [85, 755], (0, 755)], [(1170, 0), (1600, 0), (1600, 1100), (1190, 1100), [1180, 966], [1172, 923], [1177, 868], [1200, 813], [1220, 793], [1254, 780], [1258, 766], [1230, 744], [1212, 708], [1214, 666], [1228, 645], [1260, 625], [1259, 613], [1225, 599], [1215, 567], [1220, 532], [1241, 516], [1266, 506], [1250, 490], [1237, 470], [1239, 427], [1255, 404], [1275, 393], [1283, 363], [1260, 348], [1238, 341], [1214, 316], [1204, 288], [1170, 300]]]
def inside(x,y,poly):
 hit=False
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit
for p in mesh.polygons:
 c=p.center;v=r.transposed()@(c-origin);x=(v.x/5.6+.5)*1600;y=(.5-v.y/3.5)*1000
 # Limit correction to the posterior branches; front stencil is independent.
 if not ((x<665 and y>330) or (x>1170 and y>385)):continue
 hit,_,_,_=bvh.ray_cast(origin+r@Vector((v.x,v.y,0)),direction)
 if hit is None or (hit-c).length>.025:continue
 # Restrict the inner stencil to the lingual half of each posterior crown.
 centers=([(-1.62,1.64),(-1.77,.87),(-1.88,.21),(-1.91,-.366),(-1.812,-.894),(-1.56,-1.41)] if c.x<0 else [(1.986,-.018),(1.536,-.612),(1.17,-1.158)])
 cx,cy=min(centers,key=lambda q:abs(q[1]-c.y))
 if (c.x<0 and c.x<cx-.08) or (c.x>0 and c.x>cx+.08):continue
 centers=([(-1.62,1.64),(-1.77,.87),(-1.88,.21),(-1.91,-.366),(-1.812,-.894),(-1.56,-1.41)] if c.x<0 else [(1.986,-.018),(1.536,-.612),(1.17,-1.158)])
 cx,cy=min(centers,key=lambda q:abs(q[1]-c.y))
 if (c.x<0 and c.x<cx) or (c.x>0 and c.x>cx):continue
 p.material_index=0 if any(inside(x,y,poly) for poly in regions) else 1
# Preserve the central occlusal surface of each posterior crown.
for p in mesh.polygons:
 c=p.center
 for x,y,rx,ry in [(-1.62,1.64,.36,.38),(-1.77,.87,.37,.36),(-1.88,.21,.32,.27),(-1.91,-.366,.29,.26),(-1.812,-.894,.26,.25),(1.536,-.612,.36,.37),(1.986,-.018,.36,.38)]:
  if ((c.x-x)/rx)**2+((c.y-y)/ry)**2<1 and p.normal.z>.35:
   p.material_index=0;break
# Frontal view of the lingual posterior walls, which the inner view occludes.
t=json.loads((ROOT/'scripts/front-gumline-trace.json').read_text())
r=Matrix.Rotation(t['camera_rotation_x'],3,'X');origin=Vector(t['camera_position']);direction=r@Vector((0,0,-1))
patch=[(200,95),(270,20),(350,40),(430,55),(436,100),(424,160),(405,198),(382,220),(372,250),(365,312),(340,318),(306,305),(276,263),(260,270),(238,313),(193,315),(168,295),(162,240),(178,196),(185,154)]
for p in mesh.polygons:
 c=p.center;v=r.transposed()@(c-origin);x=(v.x/5.6+.5)*1600;y=(.5-v.y/3.5)*1000
 if not inside(x,y,patch):continue
 hit,_,_,_=bvh.ray_cast(origin+r@Vector((v.x,v.y,0)),direction)
 if hit is not None and (hit-c).length<.025:p.material_index=0
# Tiny isolated patches are classification artifacts, not separate teeth.
adjacency=[set() for p in mesh.polygons];edges={}
for p in mesh.polygons:
 for edge in p.edge_keys:
  if edge in edges:
   other=edges[edge];adjacency[p.index].add(other);adjacency[other].add(p.index)
  else:edges[edge]=p.index
seen=set();removed=0
for p in mesh.polygons:
 if p.index in seen:continue
 stack=[p.index];seen.add(p.index);component=[]
 while stack:
  i=stack.pop();component.append(i)
  for j in adjacency[i]:
   if j not in seen and mesh.polygons[j].material_index==p.material_index:
    seen.add(j);stack.append(j)
 if len(component)<100:
  replacement=1-p.material_index
  for i in component:mesh.polygons[i].material_index=replacement
  removed+=1
print('Removed isolated material patches:',removed)
# Regularize triangle-scale stencil seams while preserving the traced contours.
vertex_faces=[[] for v in mesh.vertices]
for p in mesh.polygons:
 for v in p.vertices:vertex_faces[v].append(p.index)
values=[float(p.material_index) for p in mesh.polygons]
for iteration in range(12):
 vertex_values=[sum(values[i] for i in faces)/len(faces) if faces else 1 for faces in vertex_faces]
 values=[.35*values[p.index]+.65*sum(vertex_values[v] for v in p.vertices)/len(p.vertices) for p in mesh.polygons]
for p,value in zip(mesh.polygons,values):p.material_index=int(value>=.5)
