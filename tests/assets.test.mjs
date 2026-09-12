import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function model(name) {
  const data = readFileSync(new URL(`../client/public/models/${name}.glb`, import.meta.url));
  assert.equal(data.toString('ascii',0,4),'glTF');
  assert.equal(data.readUInt32LE(4),2);
  assert.equal(data.readUInt32LE(8),data.length);
  assert.ok(data.length < 2_000_000, `${name} exceeds the browser asset budget`);
  const document = JSON.parse(data.toString('utf8',20,20 + data.readUInt32LE(12)));
  assert.ok(document.nodes.length > 0);
  assert.ok((document.buffers ?? []).every(b => !b.uri), 'geometry must be packaged in GLB');
  assert.ok((document.images ?? []).every(i => i.bufferView !== undefined), 'textures must be packaged in GLB');
  return document;
}
test('Blender exports ship as self-contained web assets', () => {
  for (const name of ['patient','treatment-mouth','equipment','chair','mirror','polisher','excavator','composite','curing']) model(name);
});
test('mouth keeps separate editable plaque, decay and filling inserts for all four target teeth', () => {
  const mouth = model('treatment-mouth');
  const names = new Set(mouth.nodes.map(n => n.name));
  for (let target=0;target<4;target++) {
    for(const kind of ['plaque','decay','filling']) assert.ok(names.has(`${kind}_${target}`), `missing ${kind}_${target}`);
  }
});
test('patient retains materials for three patient appearance variants', () => {
  const names = model('patient').materials.map(m=>m.name);
  for(const name of ['Patient skin','Patient shirt','Patient hair']) assert.ok(names.some(n=>n.startsWith(name)), `missing ${name}`);
});
