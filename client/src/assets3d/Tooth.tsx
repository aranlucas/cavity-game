import { useMemo } from 'react';
import * as THREE from 'three';
import { CROWN_GEOMETRY, crownKindFor } from './toothGeometry';

type Voxel = { id: string; localPos: [number, number, number]; kind: 'enamel' | 'cavity' | 'pulp'; removed: boolean };
type Props = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  toothId: string;
  voxels: Voxel[];
  /** Voxels currently targeted by a drill tip — rendered with a highlight glow. */
  highlightIds?: string[];
};

// ---- Shared geometries (one instance across all teeth) ----
const cavityGeo = new THREE.DodecahedronGeometry(0.125, 0);
const pulpGeo = new THREE.SphereGeometry(0.13, 14, 12);
const socketGeo = new THREE.SphereGeometry(0.12, 10, 8);

// ---- Materials ----
// One translucent shell per tooth: enamel you can read decay through without
// the stacked-transparency bubble look.
const crownMat = new THREE.MeshPhysicalMaterial({
  color: '#f4eeda',
  roughness: 0.16,
  clearcoat: 0.8,
  clearcoatRoughness: 0.18,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});
const cavityMat = new THREE.MeshStandardMaterial({ color: '#38210f', roughness: 0.95, flatShading: true });
const cavityHotMat = new THREE.MeshStandardMaterial({ color: '#4d2f1a', roughness: 0.8, flatShading: true, emissive: '#8fe374', emissiveIntensity: 1.1 });
const pulpMat = new THREE.MeshStandardMaterial({ color: '#e6394f', roughness: 0.35, emissive: '#b1102a', emissiveIntensity: 0.85 });
const pulpHotMat = new THREE.MeshStandardMaterial({ color: '#ff4560', roughness: 0.3, emissive: '#ff2038', emissiveIntensity: 1.7 });
const socketMat = new THREE.MeshStandardMaterial({ color: '#8a7350', roughness: 1, side: THREE.BackSide });

const hash32 = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

export function Tooth({ position, rotation = [0, 0, 0], scale = 1, toothId, voxels, highlightIds }: Props) {
  const index = useMemo(() => parseInt(toothId.replace(/\D+/g, ''), 10) || 0, [toothId]);
  const { kind, scale: footprint } = crownKindFor(index);
  const hot = useMemo(() => new Set(highlightIds ?? []), [highlightIds]);

  // Subtle deterministic wobble so the arch feels organic.
  const wobble = useMemo(() => ((hash32(toothId) % 100) / 100 - 0.5) * 0.09, [toothId]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group rotation={[wobble, 0, -wobble]}>
        {/* Voxel field — opaque decay/pulp first so they read through the crown */}
        {voxels.map((v) => {
          if (v.removed) {
            return <mesh key={v.id} position={v.localPos} geometry={socketGeo} material={socketMat} />;
          }
          if (v.kind === 'cavity') {
            const h = hash32(v.id);
            return (
              <mesh
                key={v.id}
                position={v.localPos}
                rotation={[(h % 7) * 0.9, (h % 11) * 0.6, (h % 5) * 1.1]}
                scale={0.85 + (h % 40) / 100}
                geometry={cavityGeo}
                material={hot.has(v.id) ? cavityHotMat : cavityMat}
              />
            );
          }
          if (v.kind === 'pulp') {
            return <mesh key={v.id} position={v.localPos} geometry={pulpGeo} material={hot.has(v.id) ? pulpHotMat : pulpMat} />;
          }
          return null; // enamel voxels aren't drillable — keep the crown clean
        })}

        {/* Sculpted anatomical crown, rendered last so its transparency sorts over the innards */}
        <mesh geometry={CROWN_GEOMETRY[kind]} material={crownMat} scale={[...footprint]} renderOrder={2} />
      </group>
    </group>
  );
}
