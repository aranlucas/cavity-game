import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceState} from '../client/src/appointment/surface.ts';
test('tooth damage is removed before the filling grows into the modeled recess', () => {
  assert.deepEqual(surfaceState(0, 0, true), {plaque:1,decay:1,filling:0,cured:false});
  assert.equal(surfaceState(1,.5,true).plaque,.5);
  assert.equal(surfaceState(2,1,true).decay,0);
  assert.equal(surfaceState(2,1,true).filling,0);
  assert.equal(surfaceState(3,.5,true).filling,.5);
  assert.equal(surfaceState(4,.5,true).cured,false);
  assert.equal(surfaceState(4,1,true).cured,true);
  assert.equal(surfaceState(5,0,true).filling,1);
});
test('unaffected molars stay healthy in every stage', () => {
 for(let step=0;step<=5;step++) assert.deepEqual(surfaceState(step,.4,false),{plaque:0,decay:0,filling:1,cured:true});
});
