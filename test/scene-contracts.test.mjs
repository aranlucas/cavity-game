import assert from "node:assert/strict";
import { test } from "vitest";
import {
  BoxGeometry,
  Controls,
  Group,
  EventDispatcher,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Vector3,
} from "three";
import { setControlsTarget } from "@/appointment/camera-controls.ts";
import { isMesh } from "@/appointment/meshes.ts";
import { getPatient, getStep, patients, steps } from "@/appointment/rules.ts";

class OrbitFixture extends Controls {
  target = new Vector3();
  updates = 0;

  update() {
    this.updates += 1;
  }
}

test("camera reset keeps the controls receiver and updates the original target", () => {
  const controls = new OrbitFixture(new PerspectiveCamera());
  const originalTarget = controls.target;

  setControlsTarget(controls, 0, 1.807, -1.755);
  assert.equal(controls.target, originalTarget);
  assert.deepEqual(controls.target.toArray(), [0, 1.807, -1.755]);
  assert.equal(controls.updates, 1);
  assert.doesNotThrow(() => setControlsTarget(null, 0, 0, 0));
  assert.doesNotThrow(() => setControlsTarget(new EventDispatcher(), 0, 0, 0));
});

test("mesh narrowing accepts real mesh nodes and rejects scene groups", () => {
  const geometry = new BoxGeometry();
  const material = new MeshStandardMaterial();

  try {
    assert.equal(isMesh(new Mesh(geometry, material)), true);
    assert.equal(isMesh(new Mesh(geometry, [material])), true);
    assert.equal(isMesh(new Group()), false);
  } finally {
    geometry.dispose();
    material.dispose();
  }
});

test("checked clinic lookups retain all original patient and step data", () => {
  for (const [index, patient] of patients.entries()) {
    assert.equal(getPatient(index), patient);
  }

  for (const [index, step] of steps.entries()) {
    assert.equal(getStep(index), step);
  }

  assert.deepEqual(
    patients.map((patient) => [patient.shirtColor, patient.hairColor]),
    [
      ["#d6ad65", "#503525"],
      ["#819aa8", "#30281f"],
      ["#c18e8a", "#754b2f"],
    ],
  );

  for (const index of [-1, patients.length, 0.5, Infinity, NaN]) {
    assert.throws(() => getPatient(index), /Unknown clinic patient/);
  }

  for (const index of [-1, steps.length, 0.5, Infinity, NaN]) {
    assert.throws(() => getStep(index), /Unknown treatment step/);
  }
});
