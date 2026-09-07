import { Canvas } from '@react-three/fiber';
import { generateMouth } from '@cavity-rush/shared/mouthModel';
import { MouthEnvironment } from './assets3d/MouthEnvironment';
import { Tooth } from './assets3d/Tooth';
import { DrillHand } from './assets3d/DrillHand';

/**
 * Dev-only asset preview: the treatment scene with a deterministic mouth,
 * no server or game loop. Open http://localhost:5173/?mouthdev
 * (optionally ?mouthdev=SEED to preview a specific patient).
 */
export function MouthPreview({ seed }: { seed: string }) {
  const mouth = generateMouth(seed || 'PREVIEW');
  return (
    <main className="game">
      <Canvas camera={{ position: [0, 3.9, 4.8], fov: 48 }} onCreated={({ camera }) => camera.lookAt(0, -0.25, -1.3)}>
        <color attach="background" args={['#071317']} />
        <fog attach="fog" args={['#071317', 7, 13]} />
        <MouthEnvironment />
        {mouth.map((t) => (
          <Tooth key={t.id} toothId={t.id} position={t.position} rotation={t.rotation} scale={t.scale} voxels={t.voxels} highlightIds={[]} />
        ))}
        <DrillHand position={[-1.2, 0.6, -1]} drilling={false} side="left" color="#63d1a2" />
        <DrillHand position={[1.2, 0.6, -1.4]} drilling={false} side="right" color="#63d1a2" />
      </Canvas>
    </main>
  );
}
