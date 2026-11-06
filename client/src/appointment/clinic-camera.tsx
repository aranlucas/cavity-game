import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { walk } from "./navigation";
import { STATION, idlePad, type MovementPad, type ViewMode } from "./clinic-state";

export function ClinicCamera({ mode, paused, pad, resetKey, onNear, onEnter }: ClinicCameraProps) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const look = useRef({ yaw: 0, pitch: -0.07, drag: false, x: 0, y: 0 });
  const near = useRef(false);
  useEffect(() => {
    if (mode !== "room") {
      return;
    }

    camera.position.set(2.7, 1.95, 3.8);
    look.current.yaw = 0.44;
    look.current.pitch = -0.16;
    camera.rotation.set(look.current.pitch, look.current.yaw, 0, "YXZ");
  }, [mode, resetKey, camera]);
  useEffect(() => {
    const clear = () => {
      keys.current.clear();
      look.current.drag = false;
      Object.assign(pad.current, idlePad());
    };

    clear();

    if (mode !== "room" || paused) {
      return;
    }

    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("dialog, input")) {
        return;
      }

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

      if (e.code === "KeyE" && near.current && !e.repeat) {
        onEnter();
      }
    };

    const up = (e: KeyboardEvent) => keys.current.delete(e.code);

    const pointerDown = (e: PointerEvent) => {
      if (e.button !== 0) {
        return;
      }

      look.current.drag = true;
      look.current.x = e.clientX;
      look.current.y = e.clientY;
    };

    const pointerMove = (e: PointerEvent) => {
      const l = look.current;

      if (!l.drag) {
        return;
      }

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
    if (mode !== "room" || paused) {
      return;
    }

    const k = keys.current;
    const l = look.current;
    const p = pad.current;

    const f =
      Number(k.has("KeyW") || k.has("ArrowUp") || p.forward) -
      Number(k.has("KeyS") || k.has("ArrowDown") || p.back);

    const r =
      Number(k.has("KeyD") || k.has("ArrowRight") || p.right) -
      Number(k.has("KeyA") || k.has("ArrowLeft") || p.left);

    const next = walk(camera.position.x, camera.position.z, l.yaw, f, r, dt);
    camera.position.set(next.x, camera.position.y, next.z);
    camera.rotation.set(l.pitch, l.yaw, 0);
    const close = Math.hypot(camera.position.x - STATION.x, camera.position.z - STATION.z) < 2.4;

    if (close !== near.current) {
      near.current = close;
      onNear(close);
    }
  });

  return null;
}

type ClinicCameraProps = {
  mode: ViewMode;
  paused: boolean;
  pad: MutableRefObject<MovementPad>;
  resetKey: number;
  onNear: (v: boolean) => void;
  onEnter: () => void;
};
