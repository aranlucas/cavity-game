import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

type Props = {
  position: [number, number, number];
  heading: number;
  color: string;
  name?: string;
  self?: boolean;
  running: boolean;
};

const skinMat = new THREE.MeshStandardMaterial({ color: '#f0bd9c', roughness: 0.8 });
const maskMat = new THREE.MeshStandardMaterial({ color: '#bfe0f2', roughness: 0.7 });
const coatMat = new THREE.MeshStandardMaterial({ color: '#f7f9fb', roughness: 0.75 });
const shoeMat = new THREE.MeshStandardMaterial({ color: '#3a4652', roughness: 0.6 });

/**
 * A stylized dentist: scrubs in the player colour under a white coat,
 * surgical mask, cap, swinging arms and legs while running. Heading
 * rotates the body; a coloured ring marks your own avatar.
 */
export function DentistAvatar({ position, heading, color, name, self = false, running }: Props) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const limbs = useRef<THREE.Group[]>([]);
  const target = useMemo(() => new THREE.Vector3(...position), []);
  const scrubMat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.7 }), [color]);
  const capMat = scrubMat;

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    target.set(...position);
    // Snap self (input is already smooth); lerp remote players.
    if (self) root.current.position.copy(target);
    else root.current.position.lerp(target, Math.min(1, delta * 12));
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, heading + Math.PI, Math.min(1, delta * 14));
    const t = clock.getElapsedTime();
    const swing = running ? Math.sin(t * 11) * 0.7 : Math.sin(t * 1.8) * 0.06;
    limbs.current.forEach((g, i) => {
      if (g) g.rotation.x = swing * (i % 2 === 0 ? 1 : -1) * (i < 2 ? 1 : 0.8);
    });
    if (body.current) {
      body.current.position.y = running ? Math.abs(Math.sin(t * 11)) * 0.06 : 0;
      body.current.rotation.x = running ? 0.12 : 0;
    }
  });

  const setLimb = (i: number) => (g: THREE.Group | null) => {
    if (g) limbs.current[i] = g;
  };

  return (
    <group ref={root} position={position} rotation={[0, heading + Math.PI, 0]}>
      <group ref={body}>
        {/* Torso: coloured scrubs + open white coat panels */}
        <mesh position={[0, 0.78, 0]} material={scrubMat}>
          <capsuleGeometry args={[0.24, 0.42, 6, 12]} />
        </mesh>
        {[-0.17, 0.17].map((x) => (
          <mesh key={x} position={[x, 0.72, -0.05]} rotation={[0.06, 0, x < 0 ? 0.08 : -0.08]} material={coatMat}>
            <boxGeometry args={[0.16, 0.62, 0.34]} />
          </mesh>
        ))}

        {/* Arms (swing while running) */}
        {[-0.32, 0.32].map((x, i) => (
          <group key={x} ref={setLimb(i)} position={[x, 0.95, 0]}>
            <mesh position={[0, -0.22, 0]} material={coatMat}>
              <capsuleGeometry args={[0.075, 0.3, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.44, 0]} material={skinMat}>
              <sphereGeometry args={[0.075, 10, 8]} />
            </mesh>
          </group>
        ))}

        {/* Legs */}
        {[-0.12, 0.12].map((x, i) => (
          <group key={x} ref={setLimb(2 + i)} position={[x, 0.42, 0]}>
            <mesh position={[0, -0.2, 0]} material={scrubMat}>
              <capsuleGeometry args={[0.08, 0.26, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.4, 0.05]} material={shoeMat}>
              <boxGeometry args={[0.14, 0.09, 0.26]} />
            </mesh>
          </group>
        ))}

        {/* Head: cap, mask, eyes */}
        <group position={[0, 1.32, 0]}>
          <mesh material={skinMat}>
            <sphereGeometry args={[0.2, 16, 14]} />
          </mesh>
          <mesh position={[0, 0.1, 0]} scale={[1.06, 0.55, 1.06]} material={capMat}>
            <sphereGeometry args={[0.2, 14, 10]} />
          </mesh>
          <mesh position={[0, -0.05, 0.13]} scale={[1, 0.75, 0.6]} material={maskMat}>
            <sphereGeometry args={[0.16, 12, 10]} />
          </mesh>
          {[-0.07, 0.07].map((x) => (
            <mesh key={x} position={[x, 0.05, 0.175]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color="#22303b" roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Self marker ring / remote name tag */}
      {self && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.42, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
      )}
      {!self && name && (
        <Billboard position={[0, 1.85, 0]}>
          <Text fontSize={0.17} color={color} outlineWidth={0.012} outlineColor="#16212b" anchorX="center" anchorY="bottom">
            {name}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
