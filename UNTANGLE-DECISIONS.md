# Untangle decision log

Scope: entire repository, in the bound isolated worktree. Skill fetched and read verbatim from https://raw.githubusercontent.com/caldoai/skills/main/skills/untangle-codebase/SKILL.md on 2026-11-06 UTC. Comments and Tests additions both authorized. No deployment or publication.

## Inventory before edits

- App owns session input, ticking, reassurance, visibility pause, persistence and sound. Appointment folder already colocates the gameplay domain; keep that boundary. Rules own pure transitions; saves use Zod at the browser boundary. HUD owns DOM; scene owns Fiber rendering. No backend remains.
- Ordered stages appear in rules, independent tool order, surface numeric comparisons, and HUD repair index. Patient visit count is separately hardcoded in HUD. These are hidden links.
- Room art and room camera input share clinic.tsx despite changing for different reasons. Static models have multiple ownership paths: scene clones, room attaches cached scenes, equipment mutates cached meshes. These are needless links and an implicit ownership convention.
- meshes.ts wraps instanceof Mesh without providing a separate contract. Camera-controls.ts instead bridges Fiber's broad controls type to validated mutable targets and preserves receiver binding; keep it.
- Mouth positions duplicate Blender targets and tooth formulas. Runtime hit testing, target labels and rendered inserts must agree. Use named insert nodes as geometry authority rather than another shared authored coordinate list.
- Asset pipeline includes authored Blender scenes, generation scripts, scan preprocessing, gumline traces and native gltf-transform optimization. Script-specific Blender state, stencil classifications, and artwork geometry are intentional domain requirements. Do not regenerate art or abstract independent geometry helpers without evidence.
- Tests cover gameplay gates, overheating/recovery, visits/day accounting, storage rejection and compatibility, navigation collisions, asset packaging and material/node contracts. Review cleanup last. Type/identity tests for generic mesh wrapper can go with wrapper; preserve real controls and asset contracts.
- README, roadmap, attribution, font licenses, configs, CI, hooks and lockfile are small purpose-specific artifacts. Preserve deployment namespace deletion and attribution. No structural rewrite justified.
- Git history includes recent test/documentation pruning; prefer narrow changes over reversing those decisions.

## Redesign / full justified list

1. Use ordered treatment definitions as authority for tool order and stage identity. Surface transitions look up semantic tools; heat UI follows excavator, visit count follows patients. Preserve saved numeric indices and version.
2. Separate room camera input from room art. Use Drei Clone for shared static GLTF instances with declarative shadow flags, retaining explicit material cloning/disposal for mutable patient and mouth materials.
3. Resolve target centers from authored plaque nodes (same local space as the mouth), remove dead builder TARGETS constant, and protect the shipped asset's required node/position contract. Keep MOUTH_SCALE/STATION as explicit placement because moving the mouth and patient requires authoring alignment, not generalized layout machinery.
4. Retain the typed mesh predicate (see implementation findings); remove implementation-restating comments. Retain explanations of external browser restrictions, asset origins, ray ownership, and lint suppression.
5. Last: retain typed mesh contract tests; remove obsolete-field assertion duplicated by dedicated save compatibility tests; retain independently specified behavioral tests. Add only regression coverage for stage visuals and target asset contract where needed.

## Retained special cases

- Bur heating, comfort hysteresis, completion banking and day rollover are game rules.
- Browser storage/audio/fullscreen failures are optional-capability boundaries, not swallowed application errors.
- Visibility pause, input release at phase boundaries, reassurance timer suspension, frame-delta clamps, and touch/keyboard adapters are required lifecycle behavior.
- Save size/range caps, incompatible versions and legacy extra-field stripping protect untrusted persistent input.
- Original scan display, authoring material/node names, artistic shape branches and stencil thresholds are asset/provenance contracts.

## Validation

Baseline commands and introduced failures recorded below as evidence becomes available. No tests removed to hide failures. No new scripts or dependencies planned.

## Implementation and review results

- Ordered stages now determine tool order and visual phases; HUD heat and visit totals follow domain data.
- Room camera/input is separate from room art. Static models use existing Drei Clone with dispose=null to preserve cached resources; mutable patient/filling materials retain explicit ownership.
- Target centers and label direction follow authored plaque nodes. Removed unused Blender TARGETS print/constant.
- Reconsidered mesh predicate removal: Three's generic Mesh defaults leak any into material operations without the typed predicate. Retained helper and original regression test. No dependency added.
- Removed redundant rendering labels and duplicate obsolete-field assertion only after structural changes. Added an asset contract test: a baked-origin export could look correct but collapse runtime targets; required unique, unambiguous authored plaque centers catch that mistake.
- First review found cache disposal and remaining index-derived label direction; fixed both. Second review requested after fixes.

## Validation evidence

Baseline: 27 tests passed; tooling/client typechecks, lint, formatting and build dry run passed. No baseline failures. Existing warnings: root package module type, Cloudflare workspace lockfile detection, large frontend bundle.

Introduced failures: lint spacing and unsafe material narrowing during extraction; resolved with spacing fixes and restored typed mesh predicate. No behavioral test failures.

Final local checks: 28 tests across seven files passed, including tooling typecheck; lint and format check passed. Client build/typecheck and Cloudflare deployment dry run passed; nothing uploaded. Asset regeneration and interactive browser playtesting were not performed. Existing gameplay, save, movement and asset contracts remain covered. No scripts or dependencies added.

User later authorized commit/push/PR and merge when checks and review requirements permit. No deployment or protection bypass.

Closure review: no remaining worthwhile code issues. Updated the earlier planned predicate removal to reflect its justified retention. All final local checks passed.
