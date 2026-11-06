import { test } from "vitest";
import { z } from "zod";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { patients } from "@/appointment/rules.ts";

const assetDocument = z.object({
  nodes: z.array(
    z.object({
      name: z.string().optional(),
      translation: z.tuple([z.number(), z.number(), z.number()]).optional(),
    }),
  ),
  buffers: z.array(z.object({ uri: z.string().optional() })).optional(),
  images: z.array(z.object({ bufferView: z.number().optional() })).optional(),
  materials: z.array(z.object({ name: z.string() })).default([]),
});

/** @param {string} name */
function model(name) {
  const data = readFileSync(new URL(`../client/public/models/${name}.glb`, import.meta.url));

  assert.equal(data.toString("ascii", 0, 4), "glTF");
  assert.equal(data.readUInt32LE(4), 2);
  assert.equal(data.readUInt32LE(8), data.length);
  assert.ok(data.length < 2_000_000, `${name} exceeds the browser asset budget`);

  const document = assetDocument.parse(
    JSON.parse(data.toString("utf8", 20, 20 + data.readUInt32LE(12))),
  );

  assert.ok(
    (document.buffers ?? []).every((b) => !b.uri),
    "geometry must be packaged in GLB",
  );

  assert.ok(
    (document.images ?? []).every((i) => i.bufferView !== undefined),
    "textures must be packaged in GLB",
  );

  return document;
}

test("Blender exports ship as self-contained web assets", () => {
  for (const name of [
    "patient",
    "treatment-mouth",
    "equipment",
    "chair",
    "mirror",
    "polisher",
    "excavator",
    "composite",
    "curing",
  ]) {
    const document = model(name);
    assert.ok(document.nodes.length > 0, `${name} must contain scene nodes`);
  }
});

test("mouth keeps separate editable plaque, decay and filling inserts for all four target teeth", () => {
  const mouth = model("treatment-mouth");
  const names = new Set(mouth.nodes.map((n) => n.name));

  for (let target = 0; target < 4; target++) {
    for (const kind of ["plaque", "decay", "filling"]) {
      assert.ok(names.has(`${kind}_${target}`), `missing ${kind}_${target}`);
    }
  }
});

test("patient retains materials for three patient appearance variants", () => {
  const names = model("patient").materials.map((m) => m.name);

  for (const name of ["Patient skin", "Patient shirt", "Patient hair"]) {
    assert.ok(
      names.some((n) => n.startsWith(name)),
      `missing ${name}`,
    );
  }
});

// Targets must remain separately positioned inserts: exporting baked geometry at a shared
// origin would leave the visible teeth intact but collapse all runtime hit targets.
test("every patient target has a distinct authored plaque center", () => {
  const mouth = model("treatment-mouth");
  const centers = new Set();
  const spots = new Set(patients.flatMap((patient) => patient.spots));

  for (const spot of spots) {
    const matches = mouth.nodes.filter((node) => node.name === `plaque_${spot}`);
    assert.equal(matches.length, 1, `target ${spot} must resolve unambiguously`);
    const center = matches[0]?.translation;
    assert.ok(center, `target ${spot} must have an authored center`);
    assert.ok(center.every(Number.isFinite));
    assert.ok(center[1] > 0, "targets must sit above the mouth origin");
    centers.add(JSON.stringify(center));
  }

  assert.equal(centers.size, spots.size, "treatment targets must not overlap");
});
