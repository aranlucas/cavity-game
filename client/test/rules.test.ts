import { describe, expect, it } from "vitest";

import { advance, initial, patients, steps } from "../src/appointment/rules";

describe("cavity appointment rules", () => {
  it("starts paused and does not treat before start", () => {
    const state = initial(0);

    expect(state.started).toBe(false);
    expect(state.step).toBe(0);

    const paused = advance(state, { type: "tick", dt: 0.1, target: 0, tool: "mirror" });
    expect(paused).toEqual(state);
  });

  it("starts and exposes patient data", () => {
    const started = advance(initial(1), { type: "start" });

    expect(started.started).toBe(true);
    expect(started.patient).toBe(1);
    expect(patients[started.patient]?.name).toBe("Leo");
    expect(steps).toHaveLength(5);
  });
});
