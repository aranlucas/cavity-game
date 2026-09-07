import * as THREE from 'three';

/**
 * Anatomical tooth crown geometries, sculpted by displacing a sphere:
 *  - vertical profile: cervical waist at the gumline, bulging height of
 *    contour mid-crown, gentle taper toward the occlusal surface
 *  - molars get a squarish (superellipse) cross-section, four cusps on the
 *    diagonals and a central fossa dip
 *  - incisors compress front-to-back into a chisel with a curved incisal edge
 *  - canines taper to a single pointed cusp
 * Crowns span y ∈ [-0.6, 0.6] like the old lathe profile, so Tooth.tsx
 * placement and the ±0.18 voxel grid stay valid.
 */

export type CrownKind = 'incisor' | 'canine' | 'premolar' | 'molar';

const smooth = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

/** Horizontal radius multiplier along the crown height (t: 0 gum → 1 tip). */
function profile(t: number) {
  return 0.62 + 0.48 * smooth(t, 0, 0.45) - 0.14 * smooth(t, 0.7, 1);
}

/** Superellipse (p=4) radius: 1 on the axes, ~1.19 at the corners. */
function squarish(phi: number) {
  const c = Math.abs(Math.cos(phi));
  const s = Math.abs(Math.sin(phi));
  return Math.pow(c * c * c * c + s * s * s * s, -0.25);
}

function sculpt(kind: CrownKind): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.5, 30, 22);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cfg = {
    incisor: { xs: 1.0, zs: 0.56, square: 0.25 },
    canine: { xs: 0.95, zs: 0.72, square: 0.15 },
    premolar: { xs: 0.95, zs: 0.9, square: 0.5 },
    molar: { xs: 1.0, zs: 0.98, square: 0.8 },
  }[kind];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = y / 0.5 * 0.5 + 0.5; // 0 bottom → 1 top
    const phi = Math.atan2(z, x);
    const h0 = Math.hypot(x, z);

    let h = h0 * profile(t) * THREE.MathUtils.lerp(1, squarish(phi), cfg.square);
    let ny = y * 1.2;

    if (kind === 'canine') {
      // Converge to a single pointed cusp.
      h *= 1 - 0.55 * smooth(t, 0.4, 1);
      ny += 0.09 * smooth(t, 0.75, 1);
    }
    if (kind === 'premolar') {
      // Two cusps (buccal/lingual) with a mesial-distal groove between.
      const w = smooth(t, 0.55, 0.95) * Math.min(1, h / 0.14);
      ny += 0.1 * Math.pow(Math.abs(Math.sin(phi)), 2) * w;
      ny -= 0.06 * smooth(t, 0.8, 1) * (1 - Math.min(1, h / 0.18));
    }
    if (kind === 'molar') {
      // Four cusps on the diagonals + central fossa.
      const w = smooth(t, 0.55, 0.95) * Math.min(1, h / 0.14);
      ny += 0.13 * Math.pow(Math.abs(Math.sin(2 * phi)), 1.6) * w;
      ny -= 0.09 * smooth(t, 0.75, 1) * (1 - Math.min(1, h / 0.2));
    }

    let nx = Math.cos(phi) * h * cfg.xs;
    let nz = Math.sin(phi) * h * cfg.zs;

    if (kind === 'incisor') {
      // Blade: squeeze front-to-back toward the top, flatten the dome into
      // a slightly curved incisal edge.
      const k = smooth(t, 0.58, 1);
      nz *= 1 - 0.78 * k;
      ny -= 0.1 * k * k * (1 - Math.min(1, Math.abs(nx) / 0.45));
    }

    pos.setXYZ(i, nx, ny, nz);
  }
  geo.computeVertexNormals();
  return geo;
}

export const CROWN_GEOMETRY: Record<CrownKind, THREE.BufferGeometry> = {
  incisor: sculpt('incisor'),
  canine: sculpt('canine'),
  premolar: sculpt('premolar'),
  molar: sculpt('molar'),
};

/** Crown kind + footprint from position in an 8-tooth arch (0..7). */
export function crownKindFor(index: number): { kind: CrownKind; scale: [number, number, number] } {
  const fromCenter = Math.abs(index - 3.5);
  if (fromCenter <= 1) return { kind: 'incisor', scale: [0.88, 1.05, 1] };
  if (fromCenter <= 2) return { kind: 'canine', scale: [0.86, 1.08, 1] };
  if (fromCenter <= 3) return { kind: 'premolar', scale: [0.92, 0.98, 1] };
  return { kind: 'molar', scale: [1, 0.92, 1] };
}
