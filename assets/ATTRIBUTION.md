# Dental assets

## Real anatomy source

- **Upper dental tooth model**, Michael D. Scherer (NIH 3D user `mscherer`).
- Entry: [NIH 3D](https://3d.nih.gov/entries/3002) (3DPX-003002, version 2).
- License: **CC0 1.0 / Public Domain**, shown on the entry page: [license](https://creativecommons.org/publicdomain/zero/1.0/).
- Original download: [NIH 3D source GLB](https://3d.nih.gov/api/submissions/4342/runs/c4393ceb-f871-4080-81d3-2cda01e35d0c/output-files/91793).
- Original filename: `Maxillary_teeth_w_base_NIH3D.glb`.
- Local source: `source/dental-scan.glb` (34,248,404 bytes).
- Adaptations: centered and scaled, flipped cast to expose occlusal surfaces, corrected normals, decimated to 104,644 triangles, assigned enamel/gingival materials, baked vertex ambient occlusion, exported and Meshopt-compressed.
- Shipped model: `client/public/models/dental-arch.glb` (555,668 bytes).

This is an **adult upper dental cast**, not primary dentition and not a child patient scan. It is displayed on a cabinet as a teaching model; the player treats the separate fictional patient mouth described below. Gingival material boundaries use crown masks refined by front, inner, and side image stencils projected onto visible scan surfaces, with closed posterior masks and triangle-scale boundary smoothing. The reference coordinates are stored in `scripts/*-gumline-trace.json` and applied by `scripts/trace-front-gumline.py`. These are artistic boundaries, not a clinical segmentation. Gameplay does not alter the scan geometry.

## Original instrument assets

The mirror, polisher, bur, composite applicator, and curing light were authored for this project in Blender through Blender MCP. They have mesh geometry, metallic/roughness materials, and consistent tip origins. No third-party instrument meshes or textures are included.

`assets/dental-studio.blend` contains the editable scan, five instrument scenes, and chair. `scripts/process-scan.py` and `scripts/build-instruments.py` document the original source pipeline; the gumline scripts above preserve the later surface refinements.

## Original patient and treatment mouth

The reclining patient and treatment mouth were authored for this project in Blender with `scripts/build-patient.py`, run through Blender's background Python interface. The native editable source is `assets/patient-studio.blend`; the source also includes preview scenes. `assets/patient-preview.png`, `assets/treatment-mouth-preview.png`, and `assets/treatment-face-preview.png` show the authored models and their fit in the face.

- `client/public/models/patient.glb` contains a continuous face and jaw sculpt, fitted upper and lower lips, and named skin, shirt, and hair materials used for the three fictional patient appearances.
- `client/public/models/treatment-mouth.glb` contains distinct incisor, canine, and molar crowns, inward-angled anterior teeth, recessed tongue geometry, four tooth treatment sites, modeled recesses, and separate named plaque, decay, and filling inserts.

These are original meshes, not third-party character assets or patient scans. Tooth treatment animates the authored inserts: plaque and decay shrink away, then composite fills the recesses and is cured. It does not perform freeform volumetric destruction. The anatomy and treatment sequence are fictional and simplified, and the game is not clinical training.

## Original chair, equipment, and room

The chair in `client/public/models/chair.glb` was authored in Blender for this project with `scripts/build-chair.py` and is saved in `assets/dental-studio.blend`.

Dental delivery equipment was authored with `scripts/build-equipment.py`, run through Blender's background Python interface. `assets/clinic-equipment.blend` retains individually named editable parts and its preview scene; `assets/equipment-preview.png` is the rendered preview. The shipped `client/public/models/equipment.glb` is 192,116 bytes. Static parts are grouped by material for the runtime export. No third-party equipment meshes or textures are included.

The clinic shell, cabinetry, plants, and wall art are original procedural geometry in `client/src/appointment/Clinic.tsx`. It also places the Blender-authored chair, patient, and equipment into the shared game scene.

## Web export

`scripts/optimize-models.sh` applies Meshopt compression to the patient, treatment mouth, and equipment exports while preserving node names, material names, and repair-insert pivots required by gameplay. All three GLBs package their geometry and materials locally. `assets/asset-validation.json` records current sizes and glTF validation results; `tests/assets.test.mjs` checks the shipped GLBs, required treatment inserts, and patient material names.
