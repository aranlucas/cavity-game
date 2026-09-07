export type VoxelKind='enamel'|'cavity'|'pulp';
export interface MouthVoxel{id:string;localPos:[number,number,number];kind:VoxelKind;removed:boolean}
export interface MouthTooth{id:string;position:[number,number,number];rotation:[number,number,number];scale:number;voxels:MouthVoxel[]}
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed:string){let x=hash(seed)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
export interface MouthOptions{teeth?:number;cavities?:number}
export function generateMouth(seed:string,opts:MouthOptions={}):MouthTooth[]{
 const random=rng(seed);const teeth:MouthTooth[]=[];const count=opts.teeth??8,target=opts.cavities??(8+Math.floor(random()*3));const ranked:{key:string;rank:number}[]=[];
 for(let i=0;i<count;i++)for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=0;z<=1;z++)ranked.push({key:`${i}:${x}:${y}:${z}`,rank:random()});ranked.sort((a,b)=>a.rank-b.rank);const cavityIds=new Set(ranked.slice(0,target).map(x=>x.key));
 for(let i=0;i<count;i++){const t=count===1?.5:i/(count-1);const angle=-1.05+t*2.1;const id=`tooth-${i}`;const voxels:MouthVoxel[]=[];
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){let kind:VoxelKind='enamel';if(x===0&&y===0&&z===0)kind='pulp';else if(cavityIds.has(`${i}:${x}:${y}:${z}`))kind='cavity';voxels.push({id:`${id}:${x}:${y}:${z}`,localPos:[x*.18,y*.18,z*.18],kind,removed:false})}
  teeth.push({id,position:[Math.sin(angle)*2.25,-.18-Math.abs(angle)*.22,-1.8+Math.cos(angle)*1.4],rotation:[-.2,0,-angle*.45],scale:.82+random()*.1,voxels});
 }
 return teeth;
}
