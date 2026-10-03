import test from "node:test";
import assert from "node:assert/strict";
import { canStand, walk } from "../client/src/appointment/navigation.ts";

test("room walls and furniture block walking, while the approach to the station is clear", () => {
  for (const [x, z] of [
    [5, 0],
    [0, 5],
    [0, -4],
    [0, 0],
    [1.6, -1.3],
    [-1.32, -1.22],
    [-4, -2],
    [-2.7, 3.2],
  ])
    assert.equal(canStand(x, z), false);
  assert.equal(canStand(2.7, 3.8), true);
  assert.equal(canStand(2.7, -1), true);
  let p = { x: 2.7, z: 3.8 };

  for (let i = 0; i < 300; i++) p = walk(p.x, p.z, 0.44, 1, 0, 1 / 60);
  assert.equal(canStand(p.x, p.z), true);
  assert.ok(Math.hypot(p.x, p.z + 1.755) < 2.4, "station must be reachable");
});

test("diagonal walking has the same speed, and long frame delays cannot tunnel through furniture", () => {
  const a = walk(3, 3, 0, 1, 0, 0.016);
  const b = walk(3, 3, 0, 1, 1, 0.016);

  assert.ok(Math.abs(Math.hypot(a.x - 3, a.z - 3) - Math.hypot(b.x - 3, b.z - 3)) < 1e-8);
  assert.deepEqual(walk(3, 3, 0, 1, 0, 100), walk(3, 3, 0, 1, 0, 0.05));
  let p = { x: 0, z: 2 };

  for (let i = 0; i < 50; i++) p = walk(p.x, p.z, 0, 1, 0, 100);
  assert.ok(p.z >= 1.18, "chair must stop movement");
});
