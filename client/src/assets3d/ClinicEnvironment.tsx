import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

type RoomInfo = {
  id: string;
  position: [number, number, number];
  facing: number;
  state: 'waiting' | 'occupied' | 'done' | 'cooldown';
  occupantColor?: string;
};
type Props = { rooms: RoomInfo[] };

const floorMat = new THREE.MeshStandardMaterial({ color: '#e9f2ef', roughness: 0.85 });
const floorAccentMat = new THREE.MeshStandardMaterial({ color: '#bfe0d6', roughness: 0.85 });
const wallMat = new THREE.MeshStandardMaterial({ color: '#f6f8fa', roughness: 0.95 });
const wainscotMat = new THREE.MeshStandardMaterial({ color: '#8fd0be', roughness: 0.8 });
const doorMat = new THREE.MeshStandardMaterial({ color: '#dfe7ee', roughness: 0.6 });
const chairMat = new THREE.MeshStandardMaterial({ color: '#7ea7ff', roughness: 0.55 });
const steelMat = new THREE.MeshStandardMaterial({ color: '#cfd6de', metalness: 0.4, roughness: 0.35 });
const plantMat = new THREE.MeshStandardMaterial({ color: '#5fae6e', roughness: 0.9 });
const potMat = new THREE.MeshStandardMaterial({ color: '#c96f4a', roughness: 0.8 });

const STATE_COLOR: Record<RoomInfo['state'], string> = {
  waiting: '#37d977',
  occupied: '#ff5f6b',
  done: '#ffd75e',
  cooldown: '#8b97a5',
};
const STATE_LABEL: Record<RoomInfo['state'], string> = {
  waiting: 'PATIENT WAITING',
  occupied: 'IN TREATMENT',
  done: 'ALL CLEAR',
  cooldown: 'CLEANING…',
};

/**
 * One treatment room. Local frame: +z faces the corridor. The shell is
 * sized for the shared layout (rooms 5 apart along the corridor, centers
 * ~1.3 behind the corridor edge), so the doorway lands on the door zone.
 */
function Room({ room }: { room: RoomInfo }) {
  const light = useRef<THREE.Mesh>(null);
  const statusColor = STATE_COLOR[room.state];
  const FRONT = 1.3; // local z of the front wall — flush with the corridor edge

  useFrame(({ clock }) => {
    if (!light.current) return;
    const m = light.current.material as THREE.MeshBasicMaterial;
    m.opacity = room.state === 'waiting' ? 0.65 + Math.sin(clock.getElapsedTime() * 4) * 0.35 : 0.9;
  });

  return (
    <group position={room.position} rotation={[0, room.facing, 0]}>
      {/* Shell: back + side walls, front open to the corridor */}
      <mesh position={[0, 1.15, -2.3]} material={wallMat}>
        <boxGeometry args={[4.4, 2.3, 0.2]} />
      </mesh>
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 1.15, -0.5]} material={wallMat}>
          <boxGeometry args={[0.2, 2.3, 3.8]} />
        </mesh>
      ))}
      {/* Front wall segments leaving a doorway gap */}
      {[-1.55, 1.55].map((x) => (
        <mesh key={x} position={[x, 1.15, FRONT]} material={wallMat}>
          <boxGeometry args={[1.3, 2.3, 0.2]} />
        </mesh>
      ))}
      <mesh position={[0, 2.17, FRONT]} material={wallMat}>
        <boxGeometry args={[1.8, 0.25, 0.2]} />
      </mesh>
      {/* Room floor tint */}
      <mesh position={[0, 0.011, -0.5]} rotation={[-Math.PI / 2, 0, 0]} material={floorAccentMat}>
        <planeGeometry args={[4.2, 3.6]} />
      </mesh>

      {/* Door: slides aside unless occupied */}
      <mesh position={room.state === 'occupied' ? [0, 0.98, FRONT] : [-1.35, 0.98, FRONT + 0.12]} material={doorMat}>
        <boxGeometry args={[1.7, 1.95, 0.1]} />
      </mesh>

      {/* Status lamp + signage above the doorway */}
      <mesh ref={light} position={[0, 2.45, FRONT + 0.18]}>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.9} />
      </mesh>
      <Text position={[0, 2.02, FRONT + 0.18]} fontSize={0.24} color="#243239" anchorX="center" anchorY="middle" outlineWidth={0.006} outlineColor="#ffffff">
        {`ROOM ${room.id}`}
      </Text>
      <Text position={[0, 1.78, FRONT + 0.18]} fontSize={0.14} color={statusColor} anchorX="center" anchorY="middle">
        {STATE_LABEL[room.state]}
      </Text>
      {/* Occupant colour strip on the doorframe */}
      {room.state === 'occupied' && room.occupantColor && (
        <mesh position={[0.93, 0.98, FRONT + 0.12]}>
          <boxGeometry args={[0.09, 1.95, 0.06]} />
          <meshBasicMaterial color={room.occupantColor} />
        </mesh>
      )}

      {/* Dental chair + waiting patient */}
      <group position={[0, 0, -1.15]} rotation={[0, 0.3, 0]}>
        <mesh position={[0, 0.35, 0]} material={chairMat}>
          <boxGeometry args={[0.8, 0.22, 1.6]} />
        </mesh>
        <mesh position={[0, 0.7, -0.62]} rotation={[-0.5, 0, 0]} material={chairMat}>
          <boxGeometry args={[0.8, 0.8, 0.2]} />
        </mesh>
        <mesh position={[0, 0.12, 0]} material={steelMat}>
          <cylinderGeometry args={[0.12, 0.26, 0.22, 12]} />
        </mesh>
        {room.state === 'waiting' && (
          <group position={[0, 0.82, -0.58]}>
            <mesh>
              <sphereGeometry args={[0.23, 14, 12]} />
              <meshStandardMaterial color="#f2c19e" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.17, 0]} scale={[1.05, 0.5, 1.05]}>
              <sphereGeometry args={[0.23, 12, 8]} />
              <meshStandardMaterial color="#6b4a2f" roughness={0.95} />
            </mesh>
          </group>
        )}
        {/* Overhead lamp */}
        <mesh position={[0.55, 1.5, 0.35]} rotation={[0, 0, 0.5]} material={steelMat}>
          <cylinderGeometry args={[0.035, 0.035, 1.4, 8]} />
        </mesh>
        <mesh position={[0.25, 2.05, 0.35]} material={steelMat}>
          <cylinderGeometry args={[0.24, 0.3, 0.14, 16]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * The clinic: corridor + six treatment rooms driven by the rooms prop.
 * Sized for the shared layout (corridor x ∈ [-2.2, 2.2], z ∈ [-8.2, 8.2],
 * rooms at x ±3.35). No game logic.
 */
export function ClinicEnvironment({ rooms }: Props) {
  return (
    <group>
      {/* Bright clinic lighting */}
      <ambientLight intensity={0.75} />
      <directionalLight position={[6, 12, 8]} intensity={2.2} color="#fff8ec" />
      <directionalLight position={[-8, 10, -6]} intensity={0.9} color="#dcebff" />

      {/* Floor with a mint runner down the corridor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={floorMat}>
        <planeGeometry args={[13, 18]} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorAccentMat}>
        <planeGeometry args={[1.8, 18]} />
      </mesh>

      {/* End walls closing the corridor */}
      {[-9, 9].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 1.15, 0]} material={wallMat}>
            <boxGeometry args={[13, 2.3, 0.25]} />
          </mesh>
          <mesh position={[0, 0.55, z < 0 ? 0.15 : -0.15]} material={wainscotMat}>
            <boxGeometry args={[13, 0.35, 0.05]} />
          </mesh>
        </group>
      ))}
      {/* Wall filler between rooms on each side */}
      {[-3.45, 3.45].map((x) => (
        <mesh key={x} position={[x, 1.15, 0]} material={wallMat}>
          <boxGeometry args={[0.15, 2.3, 18]} />
        </mesh>
      ))}

      {/* Treatment rooms */}
      {rooms.map((r) => (
        <Room key={r.id} room={r} />
      ))}

      {/* Reception dressing at the spawn end + clinic sign at the far end */}
      {[-1.6, 1.6].map((x) => (
        <group key={x} position={[x, 0, 8.3]}>
          <mesh position={[0, 0.3, 0]} material={potMat}>
            <cylinderGeometry args={[0.26, 0.2, 0.6, 12]} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              position={[Math.sin(i * 2.1) * 0.14, 0.82 + (i % 2) * 0.18, Math.cos(i * 2.1) * 0.14]}
              rotation={[0.3 * Math.sin(i), 0, 0.3 * Math.cos(i)]}
              material={plantMat}
            >
              <coneGeometry args={[0.17, 0.55, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      <Text position={[0, 1.9, -8.82]} fontSize={0.28} color="#2b6e5f" anchorX="center" outlineWidth={0.01} outlineColor="#ffffff">
        {'MOLAR & CO. KIDS DENTAL'}
      </Text>
    </group>
  );
}
