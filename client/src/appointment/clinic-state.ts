import * as THREE from "three";

export type ViewMode = "room" | "treatment";

export type MoveDir = "forward" | "back" | "left" | "right";

export type MovementPad = Record<MoveDir, boolean>;

export const STATION = new THREE.Vector3(0, 1.792, -1.755);

export function idlePad(): MovementPad {
  return { forward: false, back: false, left: false, right: false };
}
