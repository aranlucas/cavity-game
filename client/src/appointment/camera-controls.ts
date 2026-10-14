import * as THREE from "three";
import { z } from "zod";
import type { RootState } from "@react-three/fiber";

const cameraTarget = z.object({ target: z.instanceof(THREE.Vector3) });

const cameraUpdater = z.object({ update: z.function() });

export function setControlsTarget(
  controls: RootState["controls"],
  x: number,
  y: number,
  depth: number,
) {
  const target = cameraTarget.safeParse(controls);

  if (target.success) {
    target.data.target.set(x, y, depth);
    const updater = cameraUpdater.safeParse(controls);

    if (updater.success) {
      updater.data.update.call(controls);
    }
  }
}
