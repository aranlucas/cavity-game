import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

type Props = {
  position: [number, number, number];
  drilling: boolean;
  side: 'left' | 'right';
  color: string;
  ghost?: boolean;
  playerName?: string;
  /** True when a drillable voxel is within contact range — burr ring glows green. */
  locked?: boolean;
  /** 0-1 drilling progress on the current voxel — fills the tip ring. */
  progress?: number;
};

const UP = new THREE.Vector3(0, 1, 0);

/**
 * FPS-style viewmodel arm: a scrub-sleeved forearm reaches in from the
 * dentist's shoulder (just off-camera, bottom corners of the view) to a
 * gloved hand gripping the handpiece. The burr tip sits at the group origin
 * so the visual matches the game's contact point exactly. A faint guide
 * column + floor ring give the depth cue the raw perspective can't.
 */
export function DrillHand({ position, drilling, side, color, ghost = false, playerName, locked = false, progress = 0 }: Props) {
  const root = useRef<THREE.Group>(null);
  const burr = useRef<THREE.Mesh>(null);
  const arm = useRef<THREE.Mesh>(null);
  const target = useMemo(() => new THREE.Vector3(...position), []);
  const mirror = side === 'left' ? 1 : -1;
  // Shoulder anchor: near the camera's bottom corners in world space.
  const shoulder = useMemo(() => new THREE.Vector3(mirror * -1.9, 2.3, 4.4), [mirror]);
  const scratch = useMemo(() => ({ dir: new THREE.Vector3(), mid: new THREE.Vector3(), quat: new THREE.Quaternion() }), []);

  const opacity = ghost ? 0.32 : 1;
  const { gloveMat, steelMat, accentMat, guideMat } = useMemo(
    () => ({
      gloveMat: new THREE.MeshStandardMaterial({ color: '#bfe6f2', roughness: 0.45, transparent: ghost, opacity }),
      steelMat: new THREE.MeshStandardMaterial({ color: '#e3e7ee', metalness: 0.35, roughness: 0.3, transparent: ghost, opacity }),
      accentMat: new THREE.MeshStandardMaterial({ color, roughness: 0.5, transparent: ghost, opacity }),
      guideMat: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }),
    }),
    [color, ghost, opacity],
  );

  useFrame((state, delta) => {
    if (!root.current) return;
    // Smooth toward the authoritative position; doubles as network-jitter
    // smoothing for ghost hands.
    target.set(...position);
    root.current.position.lerp(target, Math.min(1, delta * 22));
    if (drilling) {
      const t = state.clock.getElapsedTime();
      root.current.position.x += Math.sin(t * 90) * 0.011;
      root.current.position.z += Math.cos(t * 73) * 0.011;
      if (burr.current) burr.current.rotation.y += delta * 55;
    }
    // Stretch the forearm from the fixed shoulder anchor to the hand.
    if (arm.current) {
      const tip = root.current.position;
      const { dir, mid, quat } = scratch;
      dir.subVectors(tip, shoulder);
      const len = dir.length();
      mid.addVectors(shoulder, tip).multiplyScalar(0.5).sub(tip); // local to root
      arm.current.position.copy(mid).add(new THREE.Vector3(0, 0.55, 0));
      quat.setFromUnitVectors(UP, dir.normalize());
      arm.current.quaternion.copy(quat);
      arm.current.scale.set(1, Math.max(0.1, len - 0.9), 1);
    }
  });

  return (
    <group ref={root} position={position}>
      {/* ---- Forearm reaching in from off-screen (viewmodel) ---- */}
      {!ghost && (
        <mesh ref={arm} material={accentMat}>
          <cylinderGeometry args={[0.14, 0.19, 1, 12]} />
        </mesh>
      )}

      {/* ---- Handpiece drill, burr tip at local origin ---- */}
      <group rotation={[0.14, 0, mirror * 0.1]}>
        <mesh position={[0, 0.5, 0]} material={steelMat}>
          <cylinderGeometry args={[0.055, 0.075, 0.75, 14]} />
        </mesh>
        <mesh position={[0, 0.62, 0]} material={accentMat}>
          <cylinderGeometry args={[0.062, 0.062, 0.16, 14]} />
        </mesh>
        <mesh position={[0, 0.1, 0]} material={steelMat}>
          <coneGeometry args={[0.055, 0.16, 10]} />
        </mesh>
        <mesh ref={burr} position={[0, -0.01, 0]} material={steelMat}>
          <coneGeometry args={[0.04, 0.13, 6]} />
        </mesh>

        {/* Lock ring: green when a voxel is in range, player colour otherwise */}
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.11, 0.014, 8, 24]} />
          <meshBasicMaterial color={locked ? '#7dff8a' : color} transparent opacity={locked ? 0.95 : 0.4} />
        </mesh>
        {/* Drill progress: arc fills around the tip while grinding a voxel */}
        {progress > 0 && (
          <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.14, 0.19, 24, 1, 0, Math.PI * 2 * Math.min(1, progress)]} />
            <meshBasicMaterial color={progress >= 1 ? '#7dff8a' : '#ffd75e'} transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}

        {/* ---- Gloved hand: mitt wrapped around the barrel ---- */}
        <group position={[0, 0.42, 0]} rotation={[0, 0, mirror * -0.15]}>
          <mesh position={[mirror * 0.11, 0.02, -0.02]} rotation={[0.1, 0, mirror * -0.25]} material={gloveMat}>
            <capsuleGeometry args={[0.11, 0.16, 6, 12]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[mirror * 0.02, 0.1 - i * 0.1, 0.07]} rotation={[0, mirror * 0.35, Math.PI / 2]} material={gloveMat}>
              <capsuleGeometry args={[0.042, 0.15, 4, 8]} />
            </mesh>
          ))}
          <mesh position={[mirror * -0.09, 0.16, 0.02]} rotation={[0, 0, mirror * 0.7]} material={gloveMat}>
            <capsuleGeometry args={[0.045, 0.12, 4, 8]} />
          </mesh>
        </group>

        {drilling && <pointLight intensity={2.5} distance={0.9} color="#ffd27d" />}
      </group>

      {/* ---- Depth guide: faint column + ring shadow at tooth level ---- */}
      {!ghost && (
        <group>
          <mesh position={[0, -0.35, 0]} material={guideMat}>
            <cylinderGeometry args={[0.012, 0.012, 0.7, 6]} />
          </mesh>
          <mesh position={[0, -0.7, 0]} rotation={[-Math.PI / 2, 0, 0]} material={guideMat}>
            <ringGeometry args={[0.06, 0.1, 20]} />
          </mesh>
        </group>
      )}

      {/* Spark flare at the tip while drilling */}
      {drilling && !ghost && (
        <Billboard position={[0, 0.02, 0]}>
          <mesh>
            <circleGeometry args={[0.085, 8]} />
            <meshBasicMaterial color="#ffe9a8" transparent opacity={0.7} />
          </mesh>
        </Billboard>
      )}

      {/* Name tag for remote players */}
      {ghost && playerName && (
        <Billboard position={[0, 1.12, 0]}>
          <Text fontSize={0.17} color={color} outlineWidth={0.012} outlineColor="#101020" anchorX="center" anchorY="bottom">
            {playerName}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
