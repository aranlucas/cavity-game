import { useEffect, useMemo } from "react";
import { RoundedBox, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { getPatient } from "./rules";
import { Model } from "./model";
import { isMesh } from "./meshes";

import { STATION, type ViewMode } from "./clinic-state";

function Box({ position, size, color, radius = 0.06, metal = 0 }: BoxProps) {
  return (
    <RoundedBox
      position={position}
      args={size}
      radius={radius}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.65} metalness={metal} />
    </RoundedBox>
  );
}

function Plant({ position }: PlantProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.22, 0.6, 24]} />
        <meshStandardMaterial color="#b97252" roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 2.4) * 0.23, 0.8 + (i % 3) * 0.2, Math.cos(i * 2.4) * 0.23]}
          rotation={[0.4 * Math.sin(i), i, 0.5 * Math.cos(i)]}
          scale={[0.15, 0.45, 0.09]}
          castShadow
        >
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={i % 2 ? "#557b49" : "#78965c"} />
        </mesh>
      ))}
    </group>
  );
}

function Patient({ patient }: PatientProps) {
  const { scene } = useGLTF("/models/patient.glb");

  const copy = useMemo(() => {
    const c = scene.clone(true);
    const materials = new Map<THREE.Material, THREE.Material>();

    const customize = (source: THREE.Material) => {
      const existing = materials.get(source);

      if (existing) {
        return existing;
      }

      const m = source.clone();

      if (m instanceof THREE.MeshStandardMaterial) {
        if (m.name.startsWith("Patient skin")) {
          m.color.set(getPatient(patient).color);
        }

        if (m.name.startsWith("Patient shirt")) {
          m.color.set(getPatient(patient).shirtColor);
        }

        if (m.name.startsWith("Patient hair")) {
          m.color.set(getPatient(patient).hairColor);
        }

        m.envMapIntensity = 0.5;
      }

      materials.set(source, m);

      return m;
    };

    c.traverse((o) => {
      if (!isMesh(o)) {
        return;
      }

      o.castShadow = true;
      o.receiveShadow = true;

      o.material = Array.isArray(o.material) ? o.material.map(customize) : customize(o.material);
    });

    return c;
  }, [scene, patient]);

  useEffect(
    () => () => {
      const materials = new Set<THREE.Material>();
      copy.traverse((o) => {
        if (isMesh(o)) {
          for (const material of Array.isArray(o.material) ? o.material : [o.material]) {
            materials.add(material);
          }
        }
      });

      for (const material of materials) {
        material.dispose();
      }
    },
    [copy],
  );

  return (
    <group position={[0, 0, -0.6]}>
      <primitive object={copy} />
    </group>
  );
}

export function ClinicRoom({ patient, mode, onEnter }: ClinicRoomProps) {
  const lampTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.copy(STATION);

    return target;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#b8b8a3" roughness={0.85} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => i - 5).map((i) => (
        <group key={i}>
          <Box position={[i, 0.003, 0]} size={[0.014, 0.004, 10]} color="#a3aa97" radius={0.001} />
          <Box position={[0, 0.004, i]} size={[10, 0.004, 0.014]} color="#a3aa97" radius={0.001} />
        </group>
      ))}
      <Box position={[0, 1.9, -4]} size={[10, 3.8, 0.18]} color="#e1dfcb" />
      <Box position={[-5, 1.9, 0]} size={[0.18, 3.8, 8]} color="#d8d8c3" />
      <Box position={[5, 1.9, 0]} size={[0.18, 3.8, 8]} color="#d8d8c3" />
      <Box position={[0, 0.65, -3.88]} size={[10, 1.3, 0.08]} color="#819886" radius={0.02} />
      <Box position={[-4.87, 0.65, 0]} size={[0.08, 1.3, 8]} color="#819886" radius={0.02} />
      <Box position={[4.87, 0.65, 0]} size={[0.08, 1.3, 8]} color="#819886" radius={0.02} />
      <Box position={[0, 1.32, -3.82]} size={[10, 0.055, 0.12]} color="#eee4cd" radius={0.01} />
      <Box position={[2.7, 2.55, -3.84]} size={[3, 1.8, 0.15]} color="#eae9d7" />
      <mesh position={[2.7, 2.55, -3.73]}>
        <planeGeometry args={[2.8, 1.6]} />
        <meshBasicMaterial color="#b4d2ce" />
      </mesh>
      <Box position={[2.7, 2.55, -3.65]} size={[0.065, 1.65, 0.08]} color="#f2e7d0" radius={0.01} />
      <Box position={[2.7, 2.55, -3.65]} size={[2.85, 0.06, 0.08]} color="#f2e7d0" radius={0.01} />
      <Box position={[2.7, 1.68, -3.6]} size={[3.2, 0.12, 0.4]} color="#f2e7d0" />
      {[-2.8, -1.65, -0.5].map((z) => (
        <group key={z}>
          <Box position={[-4.35, 0.51, z]} size={[1, 1, 1.1]} color="#c8cabb" />
          <Box position={[-4.31, 1.06, z]} size={[1.12, 0.1, 1.16]} color="#e9e2cc" />
          {[0.3, 0.65, 0.9].map((y) => (
            <Box
              key={y}
              position={[-3.81, y, z]}
              size={[0.04, 0.035, 0.28]}
              color="#72817a"
              radius={0.01}
              metal={0.6}
            />
          ))}
          <Box position={[-4.6, 2.35, z]} size={[0.6, 0.8, 1.08]} color="#e4dfcc" />
        </group>
      ))}
      {["#b77951", "#d8d6bb", "#789f96"].map((c, i) => (
        <Box
          key={c}
          position={[-4.25, 1.27, -2.5 + i * 0.25]}
          size={[0.13, 0.3, 0.15]}
          color={c}
          radius={0.03}
        />
      ))}
      <Plant position={[4.0, 0, -3.15]} />
      <Plant position={[-4.1, 0, 1.35]} />
      <Box position={[-2.7, 0.4, 3.25]} size={[2.7, 0.3, 0.8]} color="#bf9c70" />
      <Box position={[-2.7, 0.85, 3.6]} size={[2.7, 0.7, 0.16]} color="#bf9c70" />
      {[-3.6, -1.8].map((x) => (
        <Box key={x} position={[x, 0.19, 3.25]} size={[0.12, 0.38, 0.62]} color="#68776f" />
      ))}
      <group
        position={[0, 0, -0.6]}
        rotation={[0, Math.PI, 0]}
        onClick={mode === "room" ? onEnter : undefined}
      >
        <Model url="/models/chair.glb" />
      </group>
      <Patient patient={patient} />
      <group onClick={mode === "room" ? onEnter : undefined}>
        <Model url="/models/equipment.glb" />
      </group>
      <primitive object={lampTarget} />
      <spotLight
        position={[0, 2.53, -1.94]}
        target={lampTarget}
        intensity={3}
        angle={0.6}
        penumbra={0.8}
        color="#fff0d7"
      />
      <Box position={[-1.8, 2.5, -3.77]} size={[1.3, 1.45, 0.08]} color="#a88c63" />
      <Box position={[-1.8, 2.5, -3.7]} size={[1.17, 1.32, 0.035]} color="#f2e7cf" radius={0.01} />
      <mesh position={[-1.8, 2.55, -3.66]} scale={[0.36, 0.43, 0.04]}>
        <sphereGeometry args={[1, 24, 20]} />
        <meshStandardMaterial color="#8aab91" />
      </mesh>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[-1.8 + x, 2.26, -3.63]} scale={[0.1, 0.24, 0.04]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#8aab91" />
        </mesh>
      ))}
    </group>
  );
}

type Coordinates = [number, number, number];

type BoxProps = {
  position: Coordinates;
  size: Coordinates;
  color: string;
  radius?: number;
  metal?: number;
};

type PlantProps = { position: Coordinates };

type PatientProps = { patient: number };

type ClinicRoomProps = {
  patient: number;
  mode: ViewMode;
  onEnter: () => void;
};
