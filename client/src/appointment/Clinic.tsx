import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { walk } from "./navigation";
import { patients } from "./rules";

export type ViewMode = "room" | "treatment";

export type MoveDir = "forward" | "back" | "left" | "right";

export type MovementPad = Record<MoveDir, boolean>;

export const STATION = new THREE.Vector3(0, 1.792, -1.755);

export function idlePad(): MovementPad {
  return { forward: false, back: false, left: false, right: false };
}

export function ClinicCamera({
  mode,
  paused,
  pad,
  resetKey,
  onNear,
  onEnter,
}: {
  mode: ViewMode;
  paused: boolean;
  pad: MutableRefObject<MovementPad>;
  resetKey: number;
  onNear: (v: boolean) => void;
  onEnter: () => void;
}) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const look = useRef({ yaw: 0, pitch: -0.07, drag: false, x: 0, y: 0 });
  const near = useRef(false);
  useEffect(() => {
    if (mode !== "room") return;
    camera.position.set(2.7, 1.95, 3.8);
    look.current.yaw = 0.44;
    look.current.pitch = -0.16;
    camera.rotation.order = "YXZ";
    camera.rotation.set(look.current.pitch, look.current.yaw, 0);
  }, [mode, resetKey, camera]);
  useEffect(() => {
    const clear = () => {
      keys.current.clear();
      look.current.drag = false;
      Object.assign(pad.current, idlePad());
    };

    clear();

    if (mode !== "room" || paused) return;

    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("dialog, input")) return;

      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.code)
      ) {
        e.preventDefault();
        keys.current.add(e.code);
      }

      if (e.code === "KeyE" && near.current && !e.repeat) onEnter();
    };

    const up = (e: KeyboardEvent) => keys.current.delete(e.code);

    const pointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      look.current.drag = true;
      look.current.x = e.clientX;
      look.current.y = e.clientY;
    };

    const pointerMove = (e: PointerEvent) => {
      const l = look.current;

      if (!l.drag) return;
      l.yaw -= (e.clientX - l.x) * 0.003;
      l.pitch = THREE.MathUtils.clamp(l.pitch - (e.clientY - l.y) * 0.003, -0.8, 0.65);
      l.x = e.clientX;
      l.y = e.clientY;
    };

    const release = () => {
      look.current.drag = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    gl.domElement.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", clear);

    return () => {
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      gl.domElement.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", clear);
    };
  }, [mode, paused, pad, camera, gl, onEnter]);
  useFrame((_, dt) => {
    if (mode !== "room" || paused) return;

    const k = keys.current,
      l = look.current,
      p = pad.current;

    const f =
      Number(k.has("KeyW") || k.has("ArrowUp") || p.forward) -
      Number(k.has("KeyS") || k.has("ArrowDown") || p.back);

    const r =
      Number(k.has("KeyD") || k.has("ArrowRight") || p.right) -
      Number(k.has("KeyA") || k.has("ArrowLeft") || p.left);

    const next = walk(camera.position.x, camera.position.z, l.yaw, f, r, dt);
    camera.position.x = next.x;
    camera.position.z = next.z;
    camera.rotation.set(l.pitch, l.yaw, 0);
    const close = Math.hypot(camera.position.x - STATION.x, camera.position.z - STATION.z) < 2.4;

    if (close !== near.current) {
      near.current = close;
      onNear(close);
    }
  });

  return null;
}

function Box({
  position,
  size,
  color,
  radius = 0.06,
  metal = 0,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  radius?: number;
  metal?: number;
}) {
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

function Plant({ position }: { position: [number, number, number] }) {
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

function Patient({ patient }: { patient: number }) {
  const { scene } = useGLTF("/models/patient.glb");

  const copy = useMemo(() => {
    const c = scene.clone(true);
    const materials = new Map<THREE.Material, THREE.Material>();
    c.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;

      const customize = (source: THREE.Material) => {
        if (materials.has(source)) return materials.get(source)!;
        const m = source.clone();

        if (m instanceof THREE.MeshStandardMaterial) {
          if (m.name.startsWith("Patient skin")) m.color.set(patients[patient]!.color);

          if (m.name.startsWith("Patient shirt"))
            m.color.set(["#d6ad65", "#819aa8", "#c18e8a"][patient]!);

          if (m.name.startsWith("Patient hair"))
            m.color.set(["#503525", "#30281f", "#754b2f"][patient]!);
          m.envMapIntensity = 0.5;
        }

        materials.set(source, m);

        return m;
      };

      o.material = Array.isArray(o.material) ? o.material.map(customize) : customize(o.material);
    });

    return c;
  }, [scene, patient]);

  useEffect(
    () => () => {
      const materials = new Set<THREE.Material>();
      copy.traverse((o) => {
        if (o instanceof THREE.Mesh)
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
      });
      materials.forEach((m) => m.dispose());
    },
    [copy],
  );

  return (
    <group position={[0, 0, -0.6]}>
      <primitive object={copy} />
    </group>
  );
}

export function ClinicRoom({
  patient,
  mode,
  onEnter,
}: {
  patient: number;
  mode: ViewMode;
  onEnter: () => void;
}) {
  const chair = useGLTF("/models/chair.glb");
  const equipment = useGLTF("/models/equipment.glb");

  const lampTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.copy(STATION);

    return target;
  }, []);

  useEffect(() => {
    equipment.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [equipment.scene]);

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
      {/* Sunlit window with deep frames and a distant garden. */}
      <Box position={[2.7, 2.55, -3.84]} size={[3, 1.8, 0.15]} color="#eae9d7" />
      <mesh position={[2.7, 2.55, -3.73]}>
        <planeGeometry args={[2.8, 1.6]} />
        <meshBasicMaterial color="#b4d2ce" />
      </mesh>
      <Box position={[2.7, 2.55, -3.65]} size={[0.065, 1.65, 0.08]} color="#f2e7d0" radius={0.01} />
      <Box position={[2.7, 2.55, -3.65]} size={[2.85, 0.06, 0.08]} color="#f2e7d0" radius={0.01} />
      <Box position={[2.7, 1.68, -3.6]} size={[3.2, 0.12, 0.4]} color="#f2e7d0" />
      {/* Cabinet wall */}
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
        <primitive object={chair.scene} />
      </group>
      <Patient patient={patient} />
      {/* Blender-authored cart, handpieces, hoses, articulated lamp, and stool. */}
      <group onClick={mode === "room" ? onEnter : undefined}>
        <primitive object={equipment.scene} />
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
      {/* Framed abstract tooth / clinic artwork, built from geometry. */}
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
