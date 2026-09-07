# Little Smiles

A gentle pediatric dental care game with a real scanned dental arch and Blender-authored instruments. The main experience is now a local single-player appointment: inspect → clean → repair → fill → cure. Complete visits for three fictional patients, manage comfort, and choose a take-home sticker.

## Run

```bash
npm install
npm run dev -w client
```

Open http://localhost:5173. The new appointment mode works without a backend, account, or room code. Progress lasts for the current page session.

## Play

- Start the appointment, select the highlighted instrument, and **hold each numbered treatment spot**.
- Use **1–5** to change instruments. Keyboard users can Tab to a spot and hold **Space/Enter**.
- Repair in short bursts. Continuous bur use builds heat and temporarily locks the instrument. Release to cool.
- Use a breathing break to restore patient comfort. Treatment stops while paused or taking a break.
- Drag the background to orbit, scroll/pinch to zoom, and use Reset view to restore the camera.
- **Escape** pauses; switching away from the page pauses automatically.
- Finish all five steps to earn care points and a sticker, then meet the next patient.

## Real assets and boundaries

The scan comes from Michael D. Scherer through NIH 3D (CC0). It is an **adult upper-arch practice cast**, not a pediatric scan. Patients and treatment spots are fictional. This is a simplified game, not clinical training. See [asset provenance](assets/ATTRIBUTION.md).

Blender MCP was used to normalize the source scan, reduce it from 951,316 vertices, add enamel/gingival materials, bake crevice shading, model five instruments, export GLBs, and save `assets/dental-studio.blend`. The shipped scan is about 556 KB, versus the 34 MB source, using Meshopt compression and the loader's bundled decoder.

To rebuild assets in a fresh Blender process:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/process-scan.py --python scripts/build-instruments.py
npx @gltf-transform/cli@4.5.0 optimize client/public/models/dental-arch.glb client/public/models/dental-arch.optimized.glb --compress meshopt --simplify false --palette false
mv client/public/models/dental-arch.optimized.glb client/public/models/dental-arch.glb
```

## Code and checks

- `client/src/App.tsx`: patient, appointment HUD, tool tray, completion, and controls.
- `client/src/appointment/rules.ts`: deterministic treatment, heat, comfort, and progression rules.
- `client/src/appointment/Scene.tsx`: GLB loading, scene lighting, instrument positioning, and treatment targets.
- `tests/appointment.test.mjs`: gameplay regressions (Node 24, no test framework required).

```bash
npm test
npm run build  # Client build, Worker typecheck, Wrangler deployment dry run
npm run lint
```

The earlier multiplayer clinic code remains in `Game.tsx`, `worker/`, and `shared/` as legacy source. It is not used by the new appointment experience. `npm run deploy` explicitly publishes through the existing Cloudflare configuration; no deployment is needed to play locally.
