# Reliability audit — 2026-11-06

## Baseline and scope

Started from clean remote default `84b2047` after the merged untangle pass.
Static inspection covers all tracked runtime modules, tests, workflows, configuration,
and offline asset-authoring scripts. Tests/builds run only in CI.

## Inventory and boundaries

- Public behavior: room navigation and chair proximity; keyboard/pointer/touch tooth
  holds; five instruments/stages; cooling and reassurance; three visits, scoring,
  restart/new day, stickers; menu, fullscreen and sound; reload/resume.
- `app.tsx` owns timers, input latches and persistence. `rules.ts` is the pure
  appointment reducer. `save.ts` validates versioned untrusted local storage with
  Zod and catches parse/access/quota errors. No backend, authentication, tenant,
  transactions, network writes or production credentials exist in the app.
- Scene/camera modules load local GLBs, share cached geometry, clone customized
  materials, dispose clones, gate readiness and report asset errors. Movement has
  bounded collision checks. Audio is optional and closes/disconnects resources.
- Authoring Python/Blender/shell scripts are offline development tools, not part of
  gameplay or a server trust boundary. Existing asset/scene contracts protect the
  shipped meshes. Cloudflare config serves static assets and preserves deletion
  of the former multiplayer namespace.
- Existing CI runs lint/format, tooling typecheck/Vitest and a deployment dry-run
  build. No local execution of these tests/builds is authorized.

## Initial findings (recorded before implementation)

1. **Held Escape repeatedly toggles pause** (`client/src/app.tsx`, `key` handler).
   The handler toggles on every keydown, including OS auto-repeat. A player holding
   Escape while treating can repeatedly close/reopen the modal and resume gameplay.
   Expected: one physical press changes pause once. Confidence high from the
   unconditional toggle. Add a real browser regression dispatching repeated
   keydown and checking the dialog stays open; preserve a second physical press.

## Reconciled and rejected hypotheses

- Duplicate completion ticks cannot double-bank points: completed visits fail the
  reducer's treating gate; existing tests cover day totals and restarts.
- Invalid/nonfinite tick times cannot poison state: finite check and clamping are
  already present. Unknown/fractional targets are rejected by canTreat.
- Corrupt storage and quota failures already fail safely, and paused saves resume
  unpaused. Legacy fields intentionally disappear. Do not tighten reachable save
  states speculatively or change the public save version.
- Requests do not need retries/idempotency or account isolation: there is no app
  API. Asset failures expose reload; optional audio/fullscreen failures are caught.

## Regression plan and framework applicability

Use the real published `e2e` 0.23.0 and `@e2e-dev/web` 0.15.5 (registry verified),
compatible with Node 24.22.1. Read published quickstart, CI/GitHub Actions docs and
shipped setup/writing guides. Browser locator/actions/assertions need no model or
credentials. Use deterministic treatment and save/resume journeys, menu pause,
reset and storage failure paths; retain all existing tests and CI gates. WebGL
requires Chromium software rendering on CI. No mobile target exists.

Expected results come from README play controls, stage/tool definitions and visible
HUD contracts. Regressions must assert state changes, not body visibility. CI will
run the Escape regression against the baseline source and require its failure,
then run the full suite against the fix. CI/review evidence is pending.

## Independent review and implementation

A same-provider independent reviewer inspected the complete runtime and existing
contracts. They independently confirmed Escape repeat and found no additional
concrete worthwhile defect. Multi-tab last-writer storage, extreme day counts,
and speculative Canvas boundary propagation were rejected for lack of a supported
contract or reproducible defect. The fix prevents Escape's native dialog action
on repeats too, retaining one toggle per physical press. Published `e2e` packages
were installed with `--ignore-scripts`; no tests, browser runs or builds ran locally.

Implementation review also caught that baseline-failure proof must be scoped to
this PR (otherwise future fixed baselines would incorrectly fail CI), and checked
the exact repeated-dialog assertion location. Both were corrected. Review found
no further concrete implementation objection; browser/runtime evidence remains
pending CI.

## CI evidence

Run [42299763207](https://github.com/aranlucas/cavity-game/actions/runs/42299763207)
on `cb1aa88` passed all 28 existing Vitest tests, the tooling typecheck and
Cloudflare dry-run build. The baseline browser reproduction passed its proof
gate: the original app failed the dialog-visible assertion after repeated Escape.
The CI job failed lint on a missing blank line after the new repeat guard; fixed
without changing behavior. The complete browser journey remains pending.

Run [42300151254](https://github.com/aranlucas/cavity-game/actions/runs/42300151254)
passed the fixed pause test and baseline proof, but exposed ambiguous patient
heading selectors and a walking timeout under software WebGL (only three
assertion reads in 21.7 seconds, with GPU readback stall warnings). Narrowed
patient selectors to heading level 1, reduced the browser viewport and gave the
real walking controls a longer bounded wait. The camera already clears held
movement when proximity changes its entry callback, so it stops at the chair.
The quota fixture now ignores the opaque initial blank page before seeding the
app's own origin. Treatment, reward and persistence assertions remain intact.
