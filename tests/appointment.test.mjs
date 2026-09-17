import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,canTreat,initial,steps,patients,treating} from '../client/src/appointment/rules.ts';
const tick=(s,tool,target=0,n=1)=>{for(let i=0;i<n;i++)s=advance(s,{type:'tick',dt:.05,target,tool});return s};
test('not started, paused, wrong tool and invalid targets cannot advance treatment',()=>{
 let s=initial();assert.deepEqual(tick(s,'mirror',0,30),s);
 s=advance(s,{type:'start'});assert.equal(tick(s,'curing',0,30).progress[0],0);assert.equal(tick(s,'mirror',99,30).progress[0],0);
 s=advance(s,{type:'pause'});assert.deepEqual(tick(s,'mirror',0,30),s);
});
test('bur overheats, locks treatment, and recovers after release',()=>{
 let s={...initial(),started:true,step:2};s=tick(s,'excavator',0,50);
 assert.equal(s.cooldown,true);const p=s.progress[0];s=tick(s,'excavator',0,5);assert.equal(s.progress[0],p);
 s=tick(s,'excavator',null,50);assert.equal(s.cooldown,false);assert.equal(s.heat,0);
});
test('breathing restores comfort and clears heat without changing treatment progress',()=>{
 let s={...initial(),started:true,comfort:30,heat:85};const p=[...s.progress];s=advance(s,{type:'breathe'});
 assert.equal(s.comfort,55);assert.equal(s.heat,0);assert.deepEqual(s.progress,p);
});
test('all three appointments complete in sequence, with new cases reset',()=>{
 for(let patient=0;patient<patients.length;patient++){
  let s=advance(initial(patient),{type:'start'});
  for(let stage=0;stage<steps.length;stage++){
   for(let spot=0;spot<s.progress.length;spot++){
    let guard=0;while(s.step===stage&&s.progress[spot]<1&&guard++<300){s=tick(s,steps[stage].tool,spot);if(s.cooldown)s=tick(s,steps[stage].tool,null,40)}
    assert.ok(guard<300,'treatment must make progress');
   }
   assert.equal(s.step,stage+1);
  }
  assert.ok(s.score>0);assert.equal(s.step,5);assert.deepEqual(tick(s,'curing'),s);
  const next=advance(s,{type:'next'});assert.equal(next.patient,(patient+1)%3);assert.equal(next.started,false);assert.equal(next.score,0);
 }
});
test('large frame delays are clamped and low comfort requires a break',()=>{
 let s={...initial(),started:true,comfort:0};s=advance(s,{type:'tick',dt:100,target:0,tool:'mirror'});assert.equal(s.progress[0],0);
 s=advance(s,{type:'breathe'});s=advance(s,{type:'tick',dt:100,target:0,tool:'mirror'});assert.ok(s.progress[0]<.2);
});
test('treating and canTreat are the single live-work gates',()=>{
 const s={...initial(),started:true};
 assert.equal(treating(s),true);
 assert.equal(treating(s,true),false);
 assert.equal(treating({...s,paused:true}),false);
 assert.equal(treating({...s,step:steps.length}),false);
 assert.equal(canTreat(s,'mirror',0),true);
 assert.equal(canTreat(s,'curing',0),false);
 assert.equal(canTreat(s,'mirror',null),false);
 assert.equal(canTreat(s,'mirror',99),false);
 assert.equal(canTreat({...s,cooldown:true},'mirror',0),false);
 assert.equal(canTreat({...s,recovering:true},'mirror',0),false);
 assert.equal(canTreat({...s,comfort:15},'mirror',0),false);
 assert.equal(canTreat(s,'mirror',0,true),false);
 assert.equal(canTreat({...s,progress:[1,1]},'mirror',0),false);
});
