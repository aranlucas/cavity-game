import test from "node:test";
import assert from "node:assert/strict";
import { advance, initial, patients, steps } from "../client/src/appointment/rules.ts";
import { SAVE_KEY, decodeSave, loadGame, saveGame } from "../client/src/appointment/save.ts";

const encode = (appointment, extra = {}) =>
  JSON.stringify({ version: 1, sound: true, appointment, ...extra });

const complete = (appointment) => {
  let state = advance(appointment, { type: "start" });

  for (let guard = 0; guard < 4000 && state.step < steps.length; guard++) {
    const target =
      state.cooldown || state.recovering ? null : state.progress.findIndex((p) => p < 1);

    state = advance(state, { type: "tick", dt: 0.1, target, tool: steps[state.step].tool });
  }

  assert.equal(state.step, steps.length, "an entire visit should finish");

  return state;
};

test("saved treatment retains tooth progress, heat, day points and settings, then resumes unpaused", () => {
  const state = {
    ...initial(1),
    started: true,
    paused: true,
    step: 2,
    progress: [1, 0.35, 0],
    comfort: 62,
    heat: 77,
    score: 460,
    dayScore: 900,
    stickers: [0],
    day: 3,
  };

  const decoded = decodeSave(encode(state, { sound: false }));
  assert.deepEqual(decoded.appointment, { ...state, paused: false });
  assert.equal(decoded.sound, false);
});

test("invalid, incompatible or impossible saves are rejected without crashing", () => {
  const invalid = [
    null,
    "",
    "{broken",
    "null",
    "[]",
    "x".repeat(10_001),
    encode(initial(), { version: 2 }),
    encode(initial(), { sound: "true" }),
    encode({ ...initial(), patient: 9 }),
    encode({ ...initial(), step: 6 }),
    encode({ ...initial(), comfort: -1 }),
    encode({ ...initial(), heat: 101 }),
    encode({ ...initial(), progress: [0] }),
    encode({ ...initial(), progress: [0, 1.1] }),
    encode({ ...initial(), day: 0 }),
    encode({ ...initial(), stickers: [0, 0] }),
    encode({ ...initial(), stickers: [3] }),
    encode({ ...initial(), recovering: "no" }),
    encode({ ...initial(), started: false, step: 1 }),
    encode({ ...initial(), started: true, step: 5, score: 900, dayScore: 0 }),
  ];

  invalid.forEach((raw) => assert.equal(decodeSave(raw), null, `reject ${raw?.slice(0, 80)}`));
});

test("legacy interest and breaks fields are ignored so old saves still load", () => {
  const leftover = {
    ...initial(),
    breaks: 7,
    interest: "space",
  };

  const decoded = decodeSave(encode(leftover));
  assert.deepEqual(decoded.appointment, initial());
  assert.equal("breaks" in decoded.appointment, false);
  assert.equal("interest" in decoded.appointment, false);
  const garbageBreaks = decodeSave(encode({ ...initial(), breaks: "often" }));
  assert.deepEqual(garbageBreaks.appointment, initial());
});

test("storage failures are harmless, and successful writes can be loaded", () => {
  const records = new Map();

  const storage = {
    getItem: (key) => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
  };

  assert.equal(loadGame(storage), null);
  assert.equal(saveGame(initial(), true, storage), true);
  assert.ok(records.has(SAVE_KEY));
  assert.deepEqual(loadGame(storage).appointment, initial());

  const unavailable = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("quota");
    },
  };

  assert.equal(loadGame(unavailable), null);
  assert.equal(saveGame(initial(), false, unavailable), false);
});

test("a complete clinic day banks each visit once, survives saves, and keeps the sticker album", () => {
  let state = initial();
  let total = 0;

  for (let patient = 0; patient < patients.length; patient++) {
    state = complete(state);
    total += state.score;
    assert.equal(state.dayScore, total);
    assert.deepEqual(
      state.stickers,
      Array.from({ length: patient + 1 }, (_, i) => i),
    );
    const duplicateTick = advance(state, { type: "tick", dt: 0.1, target: 0, tool: "curing" });
    assert.equal(duplicateTick.dayScore, total);
    state = decodeSave(encode(duplicateTick)).appointment;
    state = advance(state, { type: "next" });

    if (patient < patients.length - 1) assert.equal(state.dayScore, total);
  }

  assert.equal(state.day, 2);
  assert.equal(state.patient, 0);
  assert.equal(state.dayScore, 0);
  assert.equal(state.score, 0);
  assert.deepEqual(state.stickers, [0, 1, 2]);
});

test("restart replaces the current visit score and next cannot skip unfinished patients", () => {
  const first = complete(initial());
  const second = complete(advance(first, { type: "next" }));
  const restarted = advance(second, { type: "restart" });
  assert.equal(restarted.patient, 1);
  assert.equal(restarted.dayScore, first.score);
  assert.equal(restarted.score, 0);
  assert.equal(restarted.started, false);
  assert.deepEqual(advance(restarted, { type: "next" }), restarted);
  assert.equal(complete(restarted).dayScore, second.dayScore);
});

test("comfort recovery blocks held instruments until reassurance restores the safety margin", () => {
  let state = { ...initial(), started: true, comfort: 0 };
  state = advance(state, { type: "tick", dt: 0.1, target: 0, tool: "mirror" });
  assert.equal(state.recovering, true);
  const low = advance(state, { type: "breathe" });
  assert.equal(low.recovering, true);
  const stillResting = advance(low, { type: "tick", dt: 0.1, target: 0, tool: "mirror" });
  assert.equal(stillResting.progress[0], 0);
  state = advance(stillResting, { type: "breathe" });
  assert.equal(state.recovering, false);
  assert.ok(advance(state, { type: "tick", dt: 0.1, target: 0, tool: "mirror" }).progress[0] > 0);
});

test("nonfinite deltas and fractional targets cannot poison an appointment", () => {
  const state = { ...initial(), started: true };
  assert.deepEqual(advance(state, { type: "tick", dt: NaN, target: 0, tool: "mirror" }), state);
  assert.deepEqual(
    advance(state, { type: "tick", dt: Infinity, target: 0, tool: "mirror" }),
    state,
  );
  assert.equal(
    advance(state, { type: "tick", dt: 0.1, target: 0.5, tool: "mirror" }).progress[0],
    0,
  );
});

test("save boundary rejects wrong primitive types without coercion", () => {
  for (const field of ["patient", "step", "day", "dayScore", "score", "comfort", "heat"]) {
    for (const value of ["0", null, false, {}, [], 1e100]) {
      assert.equal(decodeSave(encode({ ...initial(), [field]: value })), null);
    }
  }

  for (const field of ["started", "paused", "cooldown", "recovering"]) {
    for (const value of ["false", 0, null, {}, []]) {
      assert.equal(decodeSave(encode({ ...initial(), [field]: value })), null);
    }
  }
});

test("saved arrays reject fractional identifiers and nonnumeric progress", () => {
  for (const progress of [
    ["0", 0],
    [false, 0],
    [null, 0],
  ]) {
    assert.equal(decodeSave(encode({ ...initial(), progress })), null);
  }

  assert.equal(decodeSave(encode({ ...initial(), stickers: [0.5] })), null);
  assert.equal(decodeSave(encode({ ...initial(), patient: 0.5 })), null);
});
