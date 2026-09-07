import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import { patients, type Appointment, type Tool } from "./rules";
const locations: [number, number, number][] = [
  [-1.7, 1.455, -0.7],
  [-1.8, 1.53, 0],
  [-1.65, 1.34, 0.7],
  [1.6, 1.06, 0.6],
];
function Asset({ url, onLoaded }: { url: string; onLoaded?: () => void }) {
  const { scene } = useGLTF(url);
  useEffect(() => {
    onLoaded?.();
  }, [scene, onLoaded]);
  const copy = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial) m.envMapIntensity = 0.3;
        });
      }
    });
    return c;
  }, [scene]);
  return <primitive object={copy} />;
}
function Instrument({
  tool,
  position,
  working,
}: {
  tool: Tool;
  position: MutableRefObject<THREE.Vector3>;
  working: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.position.lerp(position.current, 1 - Math.exp(-dt * 18));
  });
  return (
    <group ref={group} rotation={[0.3, 0, -0.55]} scale={0.8}>
      <Asset url={`/models/${tool}.glb`} />
      {working && tool === "curing" && <pointLight color="#509dff" intensity={3} distance={2} />}
    </group>
  );
}
class AssetBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="asset-error">
        The 3D view couldn’t load. <button onClick={() => location.reload()}>Reload assets</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function CameraReset({ resetKey }: { resetKey: number }) {
  const { camera, controls, size } = useThree();
  useEffect(() => {
    const fit = Math.max(1, 1.05 / (size.width / size.height));
    camera.position.set(0, 0.65 + 6.35 * fit, 5.7 * fit);
    camera.lookAt(0, 0.65, 0);
    if (controls && "target" in controls) {
      (controls.target as THREE.Vector3).set(0, 0.65, 0);
      if ("update" in controls && typeof controls.update === "function") controls.update();
    }
  }, [resetKey, camera, controls, size.width, size.height]);
  return null;
}
export function TreatmentScene({
  state,
  tool,
  active,
  working,
  onTarget,
  onHold,
  onReady,
  resetKey,
}: {
  state: Appointment;
  tool: Tool;
  active: number | null;
  working: boolean;
  onTarget: (target: number | null) => void;
  onHold: (value: boolean) => void;
  onReady: () => void;
  resetKey: number;
}) {
  const cursor = useRef(new THREE.Vector3(2.5, 2.7, 1));
  const patient = patients[state.patient]!;
  const operating = state.started && !state.paused && state.step < 5;
  function aim(e: ThreeEvent<PointerEvent>) {
    cursor.current.copy(e.point).add(new THREE.Vector3(-0.12, 0.2, 0));
  }
  return (
    <AssetBoundary>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 7, 5.7], fov: 39 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0.6, 0);
        }}
        onPointerMissed={() => onTarget(null)}
      >
        <color attach="background" args={["#d6e4dc"]} />
        <ambientLight intensity={0.15} />
        <hemisphereLight args={["#f8f4e7", "#6c8276", 0.4]} />
        <directionalLight
          position={[-3, 7, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-normalBias={0.03}
        />
        <directionalLight position={[4, 3, -3]} intensity={0.25} />
        <Suspense
          fallback={
            <Html center>
              <div className="loading">Preparing your instruments…</div>
            </Html>
          }
        >
          <Environment resolution={128}>
            <mesh scale={10}>
              <sphereGeometry />
              <meshBasicMaterial color="#a2aaa4" side={THREE.BackSide} />
            </mesh>
            <mesh position={[-3, 4, 2]}>
              <planeGeometry args={[3, 6]} />
              <meshBasicMaterial color="white" />
            </mesh>
          </Environment>
          <group position={[0, -0.12, 0]}>
            <group
              onPointerMove={aim}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (operating) onHold(true);
              }}
            >
              <Asset url="/models/dental-arch.glb?gumline=surface-stencils-v3" onLoaded={onReady} />
            </group>
            {patient.spots.map((spot, i) => {
              const p = state.progress[i] || 0;
              const done = state.step >= 5 || p >= 1;
              return (
                <group key={spot} position={locations[spot]}>
                  {state.step > 0 && state.step < 5 && (
                    <mesh
                      rotation={[-Math.PI / 2, 0, 0]}
                      scale={state.step === 2 ? [1 - p * 0.5, 1 - p * 0.5, 1] : [1, 1, 1]}
                    >
                      <circleGeometry
                        args={[
                          state.step === 1 ? 0.15 : state.step === 3 ? 0.03 + p * 0.07 : 0.1,
                          20,
                        ]}
                      />
                      <meshStandardMaterial
                        color={
                          state.step === 1 ? "#c2a449" : state.step === 2 ? "#513322" : "#f0e4c5"
                        }
                        roughness={0.5}
                        transparent
                        opacity={state.step === 1 ? 1 - p : 1}
                        polygonOffset
                        polygonOffsetFactor={-2}
                      />
                    </mesh>
                  )}
                  <Html center position={[0.4, 0.16, 0]} zIndexRange={[20, 10]}>
                    <button
                      aria-label={`Treat spot ${i + 1}`}
                      className={`spot ${done ? "done" : ""} ${active === i ? "active" : ""}`}
                      style={{ "--progress": `${p * 100}%` } as React.CSSProperties}
                      disabled={!operating || done}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onTarget(i);
                        onHold(true);
                      }}
                      onPointerUp={() => onHold(false)}
                      onPointerEnter={() => {
                        onTarget(i);
                        cursor.current.set(...locations[spot]!);
                        cursor.current.y += 0.28;
                      }}
                      onPointerLeave={() => {
                        onTarget(null);
                        onHold(false);
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                          e.preventDefault();
                          onTarget(i);
                          onHold(true);
                        }
                      }}
                      onKeyUp={() => onHold(false)}
                      onBlur={() => {
                        onHold(false);
                        onTarget(null);
                      }}
                    >
                      {done ? "✓" : i + 1}
                    </button>
                  </Html>
                </group>
              );
            })}
          </group>
          {operating && (
            <Suspense fallback={null}>
              <Instrument tool={tool} position={cursor} working={working} />
            </Suspense>
          )}
          <mesh position={[0, -0.28, 0]} receiveShadow>
            <cylinderGeometry args={[3.25, 3.35, 0.28, 96]} />
            <meshStandardMaterial color="#c2d4ca" metalness={0.35} roughness={0.35} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.425, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#d6e4dc" roughness={0.8} />
          </mesh>
          <ContactShadows position={[0, -0.42, 0]} opacity={0.35} scale={15} blur={2.5} far={8} />
        </Suspense>
        <CameraReset resetKey={resetKey} />
        <OrbitControls
          makeDefault
          target={[0, 0.65, 0]}
          enablePan={false}
          minDistance={6.5}
          maxDistance={13}
          minPolarAngle={0.15}
          maxPolarAngle={1.15}
          enableRotate={active === null}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
          }}
        />
      </Canvas>
    </AssetBoundary>
  );
}

// Small local assets preload while the player reads the patient introduction.
for (const name of ["mirror", "polisher", "excavator", "composite", "curing"])
  useGLTF.preload(`/models/${name}.glb`);
