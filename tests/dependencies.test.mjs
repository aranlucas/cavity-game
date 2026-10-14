import test from "node:test";
import { z } from "zod";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

await test("Drei resolves the same React DOM runtime as the client", () => {
  const clientRequire = createRequire(new URL("../client/package.json", import.meta.url));
  const dreiRequire = createRequire(clientRequire.resolve("@react-three/drei"));

  assert.equal(dreiRequire.resolve("react-dom/client"), clientRequire.resolve("react-dom/client"));
  z.object({ createRoot: z.function() }).parse(dreiRequire("react-dom/client"));
});
