import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

test('Drei resolves the same React DOM runtime as the client', () => {
  const clientRequire = createRequire(new URL('../client/package.json', import.meta.url));
  const dreiRequire = createRequire(clientRequire.resolve('@react-three/drei'));

  assert.equal(dreiRequire.resolve('react-dom/client'), clientRequire.resolve('react-dom/client'));
  assert.equal(typeof dreiRequire('react-dom/client').createRoot, 'function');
});
