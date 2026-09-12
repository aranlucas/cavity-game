# Little Smiles

A gentle single-player dentist game with a Blender-modeled patient, treatment mouth, chair, instruments, and dental equipment. Walk around the 3D clinic, approach the patient chair, and complete an appointment: inspect → clean → repair → fill → cure. Care for three fictional patients each day, manage their comfort, and collect their smile-club stickers.

## Run

```bash
npm install
npm run dev -w client
```

Open the local URL printed by Vite (normally http://localhost:5173). The appointment game works without a backend, account, or room code. It saves progress and the sound setting in this browser's local storage every second and when leaving the page. Returning starts in the room with the current visit ready to resume. If storage is unavailable, the menu reports that saving is unavailable.

## Play

- **WASD / arrow keys** move around the clinic. Drag to look around. On touch screens, use the movement pad and drag the scene.
- Approach the patient chair and press **E** or choose **Begin treatment**. The camera moves into a close-up of the patient's mouth in the same room.
- Select instruments with **1–5** or the compact tool belt. Aim and hold on a marked tooth; numbered targets also support Tab and Space/Enter.
- Repair in short bursts. The bur builds heat and locks temporarily if it overheats. Release to cool, or reassure the patient to restore comfort.
- **Q / Room** returns to the clinic. **Escape / Menu** pauses, opens controls, and offers sound, fullscreen, restart-visit, and new-day controls. Switching away from the page pauses automatically.
- Finish all five stages to earn care points and a patient-specific sticker. Complete Mia, Leo, and Ava's visits to finish a clinic day. Start a new day to play again; collected stickers stay in your album.

Treatment changes the modeled tooth surfaces: plaque and decay inserts shrink away, exposing prepared recesses, and fillings grow into those recesses before curing. The compact HUD tracks the current stage, tooth progress, comfort, instrument heat, and care points. Treatment and room navigation share one 3D scene.

## Real assets and boundaries

The patient and treatment mouth are original stylized models authored in Blender. Their anatomy and treatment sequence are fictional and simplified; the game does not simulate clinical dentistry or freeform volumetric tooth removal. A separate **adult upper-arch teaching cast**, sourced from Michael D. Scherer through NIH 3D (CC0), is displayed on a cabinet in the room. See [asset provenance](assets/ATTRIBUTION.md).

Editable Blender files and export scripts are included:

| Asset | Blender source | Builder |
| --- | --- | --- |
| Patient and treatment mouth | `assets/patient-studio.blend` | `scripts/build-patient.py` |
| Dental delivery equipment | `assets/clinic-equipment.blend` | `scripts/build-equipment.py` |
| Teaching cast, five instruments, and chair | `assets/dental-studio.blend` | `scripts/process-scan.py`, `scripts/build-instruments.py`, `scripts/build-chair.py` |

The shipped patient, mouth, and equipment GLBs total about **600 KB**. They use Meshopt compression with the loader's bundled decoder. Current byte counts and validation results are recorded in `assets/asset-validation.json`. The separate teaching cast is 555,668 bytes, reduced from its 34 MB source scan.

To rebuild the patient, mouth, and equipment on macOS with Blender installed:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 2 --python scripts/build-patient.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 2 --python scripts/build-equipment.py
sh scripts/optimize-models.sh
```

Use your Blender executable path on other systems. The builders save native `.blend` sources and preview renders under `assets/`, and self-contained GLBs in `client/public/models`. The optimization script preserves named gameplay nodes, materials, and repair-insert pivots. The earlier teaching-cast pipeline and gumline refinements are documented in [asset provenance](assets/ATTRIBUTION.md).

Both builders accept arguments after `--`: use `--output-dir /path/to/models` to export GLBs elsewhere and `--skip-preview` to skip rendering. Their editable `.blend` sources still save under `assets/`.

## Code and checks

- `client/src/App.tsx`: compact game HUD, menus, appointment lifecycle, and input gating.
- `client/src/appointment/Clinic.tsx`: furnished 3D clinic, patient, camera, and walking controls.
- `client/src/appointment/navigation.ts`: collision and movement rules.
- `client/src/appointment/rules.ts`: deterministic treatment, heat, comfort, and progression rules.
- `client/src/appointment/save.ts`: validated local saves and browser-storage failure handling.
- `client/src/appointment/surface.ts`: plaque, decay, and filling visibility and treatment progression.
- `client/src/appointment/Scene.tsx`: GLB loading, scene lighting, instrument positioning, and treatment targets.
- `client/src/appointment/useClinicSound.ts`: optional locally synthesized instrument sounds and completion chimes.
- `tests/*.test.mjs`: gameplay, clinic-day progression, save, navigation, tooth-surface, and GLB regressions (Node 24, no test framework required).

```bash
npm test
npx tsc -p client/tsconfig.json --noEmit
npm run build  # Client build, Worker typecheck, Wrangler deployment dry run
npm run lint
```

GitHub Actions runs the tests, build, and lint checks on pushes and pull requests.

The earlier multiplayer clinic code remains in `Game.tsx`, `worker/`, and `shared/` as legacy source. It is not used by the new appointment experience. `npm run deploy` explicitly publishes through the existing Cloudflare configuration; no deployment is needed to play locally.
