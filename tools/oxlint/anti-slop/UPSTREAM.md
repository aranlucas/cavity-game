# Anti-slop provenance

- Source: https://github.com/dmmulroy/anti-slop
- Commit: c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b
- Source path: skills/install-anti-slop/assets/anti-slop/
- Installed path: tools/oxlint/anti-slop/
- Changes to vendored implementation: none.
- Root LICENSE copied from the same commit; nested Stylistic LICENSE and UPSTREAM.md preserved.
- Generic rules are enabled. Effect rules require a direct Effect dependency.

## Installation verification

- `oxlint` and `@oxlint/plugins` are pinned together at the existing resolved 1.85.0.
- All 18 generic rules and native `oxc/no-accumulating-spread` are errors; there is no direct Effect dependency.
- CI's existing npm lint gate includes client and test source. Both npm and the existing root-only pnpm lock are synchronized without changing package-manager conventions.
- Verified: clean npm installation, 24 game/asset/save regression tests, client TypeScript and Vite compilation, formatter check, plugin-loading probe, and stable readability-fix/format output.
- Anti-slop reports no errors. Five pre-existing native-linter warnings remain (four imperative Three.js camera mutation warnings and one semantic-element suggestion).
- Interactive browser playtesting and the Cloudflare deployment/dry-run command were not performed.
