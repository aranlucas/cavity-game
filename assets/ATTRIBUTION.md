# Dental assets

## Real anatomy source

- **Upper dental tooth model**, Michael D. Scherer (NIH 3D user `mscherer`).
- Entry: [NIH 3D](https://3d.nih.gov/entries/3002) (3DPX-003002, version 2).
- License: **CC0 1.0 / Public Domain**, shown on the entry page: [license](https://creativecommons.org/publicdomain/zero/1.0/).
- Original download: [NIH 3D source GLB](https://3d.nih.gov/api/submissions/4342/runs/c4393ceb-f871-4080-81d3-2cda01e35d0c/output-files/91793).
- Original filename: `Maxillary_teeth_w_base_NIH3D.glb`.
- Local source: [dental-scan.glb](source/dental-scan.glb).
- Adaptations: centered and scaled, flipped cast to expose occlusal surfaces, corrected normals, decimated, assigned enamel/gingival materials, baked vertex ambient occlusion, exported and Meshopt-compressed.
- Shipped model: [dental-arch.glb](../client/public/models/dental-arch.glb).

This is an **adult upper dental cast**, not primary dentition or a child patient scan. It is displayed on a cabinet as a teaching model; gameplay does not alter its geometry. Its gingival material boundaries are artistic, not clinical segmentation. Reference stencils in `scripts/*-gumline-trace.json` are applied by `scripts/trace-front-gumline.py` to refine visible scan surfaces.

## Original assets

The mirror, polisher, bur, composite applicator, and curing light were authored for this project in Blender through Blender MCP. No third-party instrument meshes or textures are included.

The patient, treatment mouth, chair, and dental delivery equipment were also authored for this project in Blender. They are original meshes, not third-party character or equipment assets or patient scans. The clinic shell, cabinetry, plants, and wall art are original procedural geometry in `client/src/appointment/clinic.tsx`.

The player treats the fictional patient mouth, separate from the NIH cast. Treatment animates authored plaque, decay, and filling inserts; it does not perform freeform volumetric destruction. Anatomy and treatment are simplified fiction, not clinical training.

## Editable sources and rebuilding

Paths below are relative to the repository root.

| Asset | Blender source | Builder |
| --- | --- | --- |
| Patient and treatment mouth | `assets/patient-studio.blend` | `scripts/build-patient.py` |
| Dental delivery equipment | `assets/clinic-equipment.blend` | `scripts/build-equipment.py` |
| Teaching cast, five instruments, and chair | `assets/dental-studio.blend` | `scripts/process-scan.py`, `scripts/build-instruments.py`, `scripts/build-chair.py` |

To rebuild the patient, mouth, and equipment on macOS with Blender installed, run from the repository root:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 2 --python scripts/build-patient.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 2 --python scripts/build-equipment.py
sh scripts/optimize-models.sh
```

Use your Blender executable path on other systems. The builders overwrite their `.blend` sources and preview renders under `assets/`, and export self-contained GLBs to `client/public/models`. Both accept arguments after `--`: `--output-dir /path/to/models` changes the GLB destination and `--skip-preview` skips rendering. The `.blend` sources still save under `assets/`.

The optimization script uses `pnpm dlx @gltf-transform/cli@4.5.0` and replaces the three default GLB exports with Meshopt-compressed versions. It preserves node names, material names, and repair-insert pivots required by gameplay. If you export elsewhere, the script still operates on `client/public/models`.

For the original teaching-cast pipeline, `scripts/process-scan.py` must precede `scripts/build-instruments.py` in the same Blender document; the latter expects the scan scene and object to exist. The later gumline stencil script expects the `NIH_Dental_Arch` object. These scripts are separate from the patient/equipment rebuild above.

`assets/asset-validation.json` records an export validation snapshot. `test/assets.test.mjs` checks shipped GLBs, required treatment inserts, and patient material names.
