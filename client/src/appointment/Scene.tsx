import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
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
import { patients, steps, canTreat, treating, type Appointment, type Tool } from "./rules";
import { ClinicCamera, ClinicRoom, STATION, type MovementPad, type ViewMode } from "./Clinic";
import { surfaceState } from "./surface";

const MOUTH_SCALE = 0.045;
const locations: [number, number, number][] = [
  [-1.46, 0.59, -0.43],
  [1.46, 0.59, -0.43],
  [-1.46, 0.59, 0.43],
  [1.46, 0.59, 0.43],
];
function Asset({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const copy = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={copy} />;
}
function Mouth({ state, onLoaded }: { state: Appointment; onLoaded: () => void }) {
  const { scene } = useGLTF("/models/treatment-mouth.glb");
  const copy = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o instanceof THREE.Mesh && o.name.startsWith("filling_")) {
        o.material = Array.isArray(o.material)
          ? o.material.map((m) => m.clone())
          : o.material.clone();
      }
    });
    return c;
  }, [scene]);
  useEffect(
    () => () =>
      copy.traverse((o) => {
        if (o instanceof THREE.Mesh && o.name.startsWith("filling_")) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      }),
    [copy],
  );
  useEffect(() => {
    onLoaded();
  }, [copy, onLoaded]);
  useEffect(() => {
    copy.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.receiveShadow = true;
      const match = /^(plaque|decay|filling)_(\d)/.exec(o.name);
      if (!match) return;
      const spot = Number(match[2]);
      const index = patients[state.patient]!.spots.indexOf(spot);
      const visual = surfaceState(state.step, state.progress[index] ?? 0, index >= 0);
      const amount = visual[match[1] as "plaque" | "decay" | "filling"];
      o.visible = amount > 0.001;
      if (!o.userData.originalScale) o.userData.originalScale = o.scale.clone();
      o.scale.copy(o.userData.originalScale as THREE.Vector3);
      // The authoring origins are the centers of each local repair insert.
      if (match[1] === "filling") {
        o.scale.multiplyScalar(0.65 + 0.35 * amount);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial) {
            m.color.set(visual.cured ? "#f2ebd3" : "#d8d6bc");
            m.roughness = visual.cured ? 0.22 : 0.6;
          }
        });
      } else o.scale.multiplyScalar(Math.max(0.001, Math.sqrt(amount)));
    });
  }, [copy, state.step, state.progress, state.patient]);
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
  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    group.current.position.lerp(position.current, 1 - Math.exp(-dt * 22));
    group.current.rotation.z =
      -0.65 + (working && tool !== "curing" ? Math.sin(clock.elapsedTime * 60) * 0.018 : 0);
  });
  return (
    <group ref={group} position={[3, 3, 1]} rotation={[0.3, 0, -0.65]}>
      <group position={[-0.18, 0.14, 0]}>
        <Asset url={`/models/${tool}.glb`} />
      </group>
      {working && tool === "curing" && (
        <pointLight color="#328fff" intensity={0.025} distance={6} decay={2} />
      )}
    </group>
  );
}
function TreatmentParticles({
  active,
  working,
  tool,
}: {
  active: number | null;
  working: boolean;
  tool: Tool;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.visible =
      working && active !== null && (tool === "polisher" || tool === "excavator");
    if (!ref.current.visible) return;
    for (let i = 0; i < 16; i++) {
      const life = (clock.elapsedTime * 1.8 + i / 16) % 1;
      const angle = i * 2.399;
      dummy.position.set(
        Math.sin(angle) * life * 0.48,
        life * 0.8 - life * life * 0.3,
        Math.cos(angle) * life * 0.35,
      );
      dummy.scale.setScalar((1 - life) * 0.025);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 16]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshBasicMaterial color={tool === "polisher" ? "#e9f6ef" : "#cdb38b"} />
    </instancedMesh>
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
function CameraReset({ resetKey, mode }: { resetKey: number; mode: ViewMode }) {
  const { camera, controls, size } = useThree();
  useEffect(() => {
    if (mode !== "treatment") return;
    const fit = Math.max(1, 0.95 / (size.width / size.height));
    camera.position.set(STATION.x, STATION.y + 0.32 * fit, STATION.z + 0.18 * fit);
    camera.lookAt(STATION.x, STATION.y + 0.015, STATION.z);
    if (controls && "target" in controls) {
      (controls.target as THREE.Vector3).set(STATION.x, STATION.y + 0.015, STATION.z);
      if ("update" in controls && typeof controls.update === "function") controls.update();
    }
  }, [resetKey, mode, camera, controls, size.width, size.height]);
  return null;
}
export function TreatmentScene({
  state,
  paused,
  tool,
  active,
  working,
  onTarget,
  onHold,
  onReady,
  resetKey,
  mode,
  pad,
  onNear,
  onEnter,
}: {
  state: Appointment;
  paused: boolean;
  tool: Tool;
  active: number | null;
  working: boolean;
  onTarget: (target: number | null) => void;
  onHold: (value: boolean) => void;
  onReady: () => void;
  resetKey: number;
  mode: ViewMode;
  pad: MutableRefObject<MovementPad>;
  onNear: (v: boolean) => void;
  onEnter: () => void;
}) {
  const cursor = useRef(new THREE.Vector3(3, 3, 1));
  const patient = patients[state.patient]!;
  const session = mode === "treatment" && treating(state, paused);
  const effective = canTreat(state, tool, working ? active : null, paused);
  function aim(e: ThreeEvent<PointerEvent>) {
    // A ray can cross enamel, cavity inserts and tongue. Only the nearest surface owns this gesture.
    e.stopPropagation();
    const local = e.point.clone().sub(STATION).divideScalar(MOUTH_SCALE);
    cursor.current.copy(local).add(new THREE.Vector3(0, 0.06, 0));
    if (!session) return;
    let nearest: number | null = null;
    let distance = 0.52;
    patient.spots.forEach((spot, i) => {
      const d = new THREE.Vector3(...locations[spot]!).distanceTo(local);
      if (d < distance && state.progress[i]! < 1) {
        nearest = i;
        distance = d;
      }
    });
    onTarget(nearest);
    if (nearest === null) onHold(false);
  }
  function aimSpot(index: number, spot: number) {
    onTarget(index);
    cursor.current.set(...locations[spot]!);
    cursor.current.y += 0.05;
  }
  return (
    <AssetBoundary>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [2.7, 1.95, 3.8], fov: 50, near: 0.005, far: 40 }}
        onPointerMissed={() => {
          onTarget(null);
          onHold(false);
        }}
      >
        <color attach="background" args={["#c9cdbb"]} />
        <fog attach="fog" args={["#c9cdbb", 12, 30]} />
        <ambientLight intensity={0.42} />
        <hemisphereLight args={["#f8f4e7", "#6c8276", 0.75]} />
        <directionalLight
          position={[3, 7, -1]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-normalBias={0.004}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        <directionalLight position={[-3, 3, 2]} intensity={0.35} />
        <Suspense
          fallback={
            <Html center>
              <div className="loading">Preparing the dental studio…</div>
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
          <ClinicRoom patient={state.patient} mode={mode} onEnter={onEnter} />
          {/* Original scanned teaching cast remains on the cabinet, apart from the patient's mouth. */}
          <group position={[-4.3, 1.13, -1.65]} scale={0.085}>
            <Asset url="/models/dental-arch.glb" />
          </group>
          <group position={STATION} scale={MOUTH_SCALE}>
            <group
              onPointerMove={aim}
              onPointerLeave={() => {
                onHold(false);
                onTarget(null);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (session) {
                  aim(e);
                  onHold(true);
                }
              }}
              onPointerUp={() => onHold(false)}
            >
              <Mouth state={state} onLoaded={onReady} />
            </group>
            {mode === "treatment" &&
              state.step < steps.length &&
              patient.spots.map((spot, i) => {
                const p = state.progress[i] || 0;
                const done = p >= 1;
                return (
                  <group key={spot} position={locations[spot]}>
                    <mesh
                      rotation={[-Math.PI / 2, 0, 0]}
                      position={[0, 0.04, 0]}
                      raycast={() => null}
                    >
                      <ringGeometry args={[0.29, 0.315, 40]} />
                      <meshBasicMaterial
                        color={done ? "#93ca96" : active === i ? "#fff2b1" : "#d4be7f"}
                        transparent
                        opacity={active === i ? 0.95 : 0.55}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                      />
                    </mesh>
                    <Html
                      center
                      position={[spot % 2 === 0 ? -0.67 : 0.67, 0.3, spot < 2 ? -0.14 : 0.14]}
                      zIndexRange={[20, 10]}
                    >
                      <button
                        aria-label={`Treat spot ${i + 1}`}
                        className={`spot ${done ? "done" : ""} ${active === i ? "active" : ""}`}
                        style={{ "--progress": `${p * 100}%` } as React.CSSProperties}
                        disabled={!session || done}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          aimSpot(i, spot);
                          onHold(true);
                        }}
                        onPointerUp={() => onHold(false)}
                        onPointerCancel={() => onHold(false)}
                        onLostPointerCapture={() => onHold(false)}
                        onPointerEnter={() => aimSpot(i, spot)}
                        onPointerLeave={() => {
                          onTarget(null);
                          onHold(false);
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                            e.preventDefault();
                            aimSpot(i, spot);
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
                    {active === i && (
                      <TreatmentParticles active={active} working={effective} tool={tool} />
                    )}
                  </group>
                );
              })}
            {session && (
              <Suspense fallback={null}>
                <Instrument tool={tool} position={cursor} working={effective} />
              </Suspense>
            )}
          </group>
        </Suspense>
        <ClinicCamera
          mode={mode}
          paused={paused}
          pad={pad}
          resetKey={resetKey}
          onNear={onNear}
          onEnter={onEnter}
        />
        <CameraReset resetKey={resetKey} mode={mode} />
        {mode === "treatment" && (
          <OrbitControls
            makeDefault
            target={[STATION.x, STATION.y + 0.015, STATION.z]}
            enablePan={false}
            minDistance={0.24}
            maxDistance={0.85}
            minPolarAngle={0.1}
            maxPolarAngle={1.05}
            minAzimuthAngle={-0.7}
            maxAzimuthAngle={0.7}
            enabled={!paused}
            enableRotate={active === null && !working}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.ROTATE,
            }}
          />
        )}
      </Canvas>
    </AssetBoundary>
  );
}
for (const name of ["chair", "equipment", "patient", "dental-arch", "treatment-mouth"])
  useGLTF.preload(`/models/${name}.glb`);
