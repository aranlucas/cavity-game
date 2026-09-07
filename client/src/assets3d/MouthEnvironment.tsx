import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CROWN_GEOMETRY, crownKindFor } from './toothGeometry';

/**
 * Wide-open kid mouth, dentist POV (camera above/front looking down-in).
 * Anatomy: the playable LOWER arch curves toward the camera at the bottom
 * of the view; a broad dark oral cavity separates it from the UPPER arch,
 * which hangs from the far rim tucked under the top lip. Wet mucosa
 * everywhere, cheek retractors, facial context. No game logic.
 *
 * Lower tooth arc (from shared/mouthModel): x=sin(a)*2.25, y=-.18-|a|*.22,
 * z=-1.8+cos(a)*1.4 for a ∈ [-1.05, 1.05] — positions are deterministic,
 * so the gum ridge here can follow it exactly.
 */

const skinMat = new THREE.MeshStandardMaterial({ color: '#e8b295', roughness: 0.75 });
const lipMat = new THREE.MeshPhysicalMaterial({ color: '#b05a5e', roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.35 });
const lipInnerMat = new THREE.MeshPhysicalMaterial({ color: '#9e4b52', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.4 });
const mucosaMat = new THREE.MeshPhysicalMaterial({ color: '#5e242c', roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.35, side: THREE.BackSide });
const gumMat = new THREE.MeshPhysicalMaterial({ color: '#cc7a80', roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35 });
const upperGumMat = new THREE.MeshPhysicalMaterial({ color: '#b8626b', roughness: 0.55, clearcoat: 0.45, clearcoatRoughness: 0.4 });
const tongueMat = new THREE.MeshPhysicalMaterial({ color: '#c96a70', roughness: 0.55, clearcoat: 0.8, clearcoatRoughness: 0.25 });
const darkMat = new THREE.MeshStandardMaterial({ color: '#1c0508', roughness: 1 });
const uvulaMat = new THREE.MeshPhysicalMaterial({ color: '#a34b52', roughness: 0.5, clearcoat: 0.6 });
const steelMat = new THREE.MeshStandardMaterial({ color: '#dfe4ea', metalness: 0.4, roughness: 0.3 });
const upperToothMat = new THREE.MeshPhysicalMaterial({ color: '#f3ecd4', roughness: 0.24, clearcoat: 0.7, clearcoatRoughness: 0.25 });

const smooth = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

/** Points along the lower dental arc, optionally offset outward/down. */
function lowerArc(n: number, yOff = 0, rOff = 0): [number, number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = -1.05 + (i / (n - 1)) * 2.1;
    return [Math.sin(a) * (2.25 + rOff), -0.18 - Math.abs(a) * 0.22 + yOff, -1.8 + Math.cos(a) * (1.4 + rOff)];
  });
}

/** Open-mouth lip line: wide corners, full lower lip, cupid's bow on top. */
function lipCurve(shrink = 1, lift = 0): THREE.CatmullRomCurve3 {
  const pts: [number, number, number][] = [
    [3.55, 0.05, 0.15], // right corner
    [2.6, 0.1, 1.35],
    [1.1, 0.14, 2.0],
    [0, 0.16, 2.18], // lower lip center (near camera)
    [-1.1, 0.14, 2.0],
    [-2.6, 0.1, 1.35],
    [-3.55, 0.05, 0.15], // left corner
    [-2.55, 0.22, -1.5],
    [-1.15, 0.3, -2.0],
    [-0.55, 0.33, -2.14], // cupid's bow peak
    [0, 0.28, -1.98], // philtrum dip
    [0.55, 0.33, -2.14], // cupid's bow peak
    [1.15, 0.3, -2.0],
    [2.55, 0.22, -1.5],
  ];
  return new THREE.CatmullRomCurve3(
    pts.map(([x, y, z]) => new THREE.Vector3(x * shrink, y + lift, z * shrink)),
    true,
    'catmullrom',
    0.6,
  );
}

/** Face plate: smooth skin dish with a mouth-shaped hole, no donut curvature. */
function faceGeo() {
  const profile = [
    [2.55, -0.55], [2.8, -0.1], [3.4, 0.26], [4.4, 0.4], [5.6, 0.22],
    [6.6, -0.2], [7.6, -1.0], [8.4, -2.2],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(profile, 48);
}

/** Tongue: flattened, tapered toward the tip, with a median sulcus groove. */
function tongueGeo() {
  const g = new THREE.SphereGeometry(1, 36, 24);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) * 0.98;
    let y = pos.getY(i) * 0.34;
    const z = pos.getZ(i) * 1.4;
    x *= 1 - 0.24 * smooth(z, 0.4, 1.4); // taper toward the tip
    if (y > 0) {
      const groove = Math.exp(-(x * x) / (0.3 * 0.3));
      y -= 0.09 * groove * (y / 0.34) * (0.35 + 0.65 * smooth(z, -1.4, 1.0));
    }
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

export function MouthEnvironment() {
  const tongue = useRef<THREE.Mesh>(null);
  const { gumTube, shelfTube, upperGumTube, lipTube, lipInnerTube, face, tongueG, papillae } = useMemo(() => {
    const mk = (pts: [number, number, number][], r: number) =>
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 40, r, 12, false);
    const upper: [number, number, number][] = Array.from({ length: 13 }, (_, i) => {
      const a = -1.15 + (i / 12) * 2.3;
      return [Math.sin(a) * 2.62, 0.22, -0.95 - Math.cos(a) * 1.55];
    });
    // Interdental papillae: gum peaks between neighbouring lower teeth.
    const pap: [number, number, number][] = Array.from({ length: 7 }, (_, i) => {
      const a = -1.05 + ((i + 0.5) / 7) * 2.1;
      return [Math.sin(a) * 2.25, -0.18 - Math.abs(a) * 0.22 - 0.34, -1.8 + Math.cos(a) * 1.4];
    });
    return {
      gumTube: mk(lowerArc(21, -0.52, 0.05), 0.38),
      shelfTube: mk(lowerArc(15, -1.05, 0.18), 0.52),
      upperGumTube: mk(upper, 0.4),
      lipTube: new THREE.TubeGeometry(lipCurve(), 120, 0.46, 16, true),
      lipInnerTube: new THREE.TubeGeometry(lipCurve(0.88, -0.14), 120, 0.32, 14, true),
      face: faceGeo(),
      tongueG: tongueGeo(),
      papillae: pap,
    };
  }, []);

  useFrame(({ clock }) => {
    if (!tongue.current) return;
    tongue.current.position.y = -0.92 + Math.sin(clock.getElapsedTime() * 1.4) * 0.035;
  });

  return (
    <group>
      {/* ---- Clinical lighting ---- */}
      <ambientLight intensity={0.55} />
      <spotLight position={[0.5, 7, 3]} angle={0.5} penumbra={0.8} intensity={170} color="#fff6e6" />
      <pointLight position={[4, 3, 4.5]} intensity={10} color="#d7e8ff" />
      <pointLight position={[-4, 3, 4.5]} intensity={10} color="#d7e8ff" />
      <pointLight position={[0, 0.6, -1.2]} intensity={3.5} color="#a04046" />

      <group position={[0, 0, -1]} rotation={[0.16, 0, 0]}>
        {/* ---- Skin: smooth face plate around the mouth + chin + nose ---- */}
        <mesh geometry={face} position={[0, -0.28, 0]} scale={[1.32, 1, 0.92]} material={skinMat} />
        <mesh position={[0, -0.4, 3.5]} scale={[1.8, 0.75, 1.05]} material={skinMat}>
          <sphereGeometry args={[1.15, 24, 18]} />
        </mesh>
        <group position={[0, 0.42, -3.6]}>
          <mesh scale={[0.9, 0.62, 0.85]} material={skinMat}>
            <sphereGeometry args={[0.75, 16, 12]} />
          </mesh>
          {[-0.28, 0.28].map((x) => (
            <mesh key={x} position={[x, -0.28, 0.28]} rotation={[1.25, 0, 0]}>
              <circleGeometry args={[0.13, 12]} />
              <meshStandardMaterial color="#5b2a25" roughness={1} />
            </mesh>
          ))}
        </group>

        {/* ---- Lips: swept along a real lip line, cupid's bow up top ---- */}
        <mesh geometry={lipTube} scale={[1, 0.72, 1]} position={[0, 0.05, 0]} material={lipMat} />
        <mesh geometry={lipInnerTube} scale={[1, 0.6, 1]} position={[0, 0.02, 0]} material={lipInnerMat} />

        {/* ---- Cheek retractors ---- */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 3.6, 0.1, 0.1]} rotation={[0, 0, s * -0.5]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={steelMat}>
              <torusGeometry args={[0.35, 0.05, 10, 20, Math.PI * 1.2]} />
            </mesh>
            <mesh position={[s * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={steelMat}>
              <cylinderGeometry args={[0.045, 0.045, 0.9, 10]} />
            </mesh>
          </group>
        ))}

        {/* ---- Oral cavity walls (inner cheeks) ---- */}
        <mesh position={[0, 0.15, -0.1]} scale={[1.36, 1.35, 1.06]} material={mucosaMat}>
          <sphereGeometry args={[2.56, 32, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        </mesh>
        {/* Deep black void between the arches */}
        <mesh position={[0, -0.45, -1.75]} rotation={[0.62, 0, 0]} scale={[1.55, 1, 1]} material={darkMat}>
          <circleGeometry args={[1.35, 28]} />
        </mesh>

        {/* ================= LOWER JAW (playable arch) ================= */}
        {/* Continuous gum ridge swept along the tooth arc */}
        <mesh geometry={gumTube} material={gumMat} scale={[1, 0.75, 1]} />
        {/* Interdental papillae: scalloped gum peaks between the teeth */}
        {papillae.map((p, i) => (
          <mesh key={i} position={p} scale={[0.17, 0.3, 0.17]} material={gumMat}>
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
        ))}
        {/* Jaw shelf rolling down to the mouth floor */}
        <mesh geometry={shelfTube} material={upperGumMat} scale={[1, 0.8, 1]} />
        {/* Mouth floor pooling under the tongue */}
        <mesh position={[0, -1.25, -1.45]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.35, 0.9, 1]}>
          <circleGeometry args={[1.5, 28]} />
          <meshPhysicalMaterial color="#8c3a42" roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} />
        </mesh>

        {/* ---- Tongue: one sculpted body with a median groove, wet sheen ---- */}
        <mesh ref={tongue} geometry={tongueG} position={[0, -0.92, -1.5]} rotation={[-0.16, 0, 0]} material={tongueMat} />

        {/* ================= UPPER JAW (far rim, under the top lip) ================= */}
        <group position={[0, 0.68, -0.78]} rotation={[-0.42, 0, 0]}>
          {/* Upper gum band swept under the far lip */}
          <mesh geometry={upperGumTube} material={upperGumMat} scale={[1, 0.85, 1]} />
          {/* Upper crowns hanging tip-down: real incisors/canines/molars */}
          {Array.from({ length: 10 }, (_, i) => {
            const a = -1.02 + (i / 9) * 2.04;
            const { kind } = crownKindFor(Math.round((i / 9) * 7));
            const s = kind === 'incisor' ? 0.6 : kind === 'canine' ? 0.56 : 0.62;
            return (
              <mesh
                key={i}
                position={[Math.sin(a) * 2.48, -0.24, -0.98 - Math.cos(a) * 1.42]}
                rotation={[Math.PI, 0, a * 0.3]}
                scale={s}
                geometry={CROWN_GEOMETRY[kind]}
                material={upperToothMat}
              />
            );
          })}
        </group>

        {/* ---- Throat + uvula, deep at the back ---- */}
        <mesh position={[0, -0.55, -2.5]} rotation={[0.55, 0, 0]} scale={[1.2, 0.8, 1]} material={darkMat}>
          <circleGeometry args={[0.95, 28]} />
        </mesh>
        <mesh position={[0, -0.05, -2.42]} scale={[1, 1.5, 1]} material={uvulaMat}>
          <sphereGeometry args={[0.14, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}
