# Dental assets

## Real anatomy source

- **Upper dental tooth model**, Michael D. Scherer (NIH 3D user `mscherer`).
- Entry: https://3d.nih.gov/entries/3002 (3DPX-003002, version 2).
- License: **CC0 1.0 / Public Domain**, shown on the entry page: https://creativecommons.org/publicdomain/zero/1.0/
- Original download: https://3d.nih.gov/api/submissions/4342/runs/c4393ceb-f871-4080-81d3-2cda01e35d0c/output-files/91793
- Original filename: `Maxillary_teeth_w_base_NIH3D.glb`.
- Local source: `source/dental-scan.glb` (34,248,404 bytes).
- Adaptations: centered and scaled, flipped cast to expose occlusal surfaces, corrected normals, decimated to 104,644 triangles, assigned enamel/gingival materials, baked vertex ambient occlusion, exported and Meshopt-compressed.
- Shipped model: `client/public/models/dental-arch.glb` (~645 KB).

This is an **adult upper dental cast**, not primary dentition and not a child patient scan. The game explicitly identifies it as a practice arch. Gingival material boundaries use crown masks refined by front, inner, and side image stencils projected onto visible scan surfaces, with closed posterior masks and triangle-scale boundary smoothing. The reference coordinates are stored in scripts/*-gumline-trace.json and applied by scripts/trace-front-gumline.py. These are artistic, not a clinical segmentation. Fictional treatment spots are overlays; treatment does not perform volumetric removal of scan geometry.

## Original instrument assets

The mirror, polisher, bur, composite applicator, and curing light were authored for this project in Blender through Blender MCP. They have mesh geometry, metallic/roughness materials, and consistent tip origins. No third-party instrument meshes or textures are included.

`dental-studio.blend` contains the editable scan and five instrument scenes. `scripts/process-scan.py` and `scripts/build-instruments.py` document the source pipeline. The illustrated patient portraits are original inline SVG artwork.
