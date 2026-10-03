import { useCallback, useEffect, useRef } from "react";
import type { Tool } from "./rules";

/** Quiet, locally synthesized feedback. Browsers unlock audio on the first gesture. */
export function useClinicSound(enabled: boolean, working: boolean, tool: Tool) {
  const context = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!enabled) return;

    const unlock = () => {
      if (typeof AudioContext === "undefined") return;

      try {
        context.current ??= new AudioContext();
        void context.current.resume().catch(() => {});
      } catch {
        // Sound is optional; treatment remains playable if the browser denies audio.
      }
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enabled]);
  useEffect(
    () => () => {
      void context.current?.close().catch(() => {});
      context.current = null;
    },
    [],
  );
  useEffect(() => {
    const c = context.current;

    if (
      !enabled ||
      !working ||
      !c ||
      c.state !== "running" ||
      tool === "mirror" ||
      tool === "composite"
    )
      return;
    const oscillator = c.createOscillator();
    const gain = c.createGain();
    oscillator.type = tool === "excavator" ? "triangle" : "sine";
    oscillator.frequency.value = tool === "excavator" ? 560 : tool === "polisher" ? 180 : 720;
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.018, c.currentTime + 0.05);
    oscillator.connect(gain).connect(c.destination);
    oscillator.start();

    return () => {
      gain.gain.cancelScheduledValues(c.currentTime);
      gain.gain.setTargetAtTime(0, c.currentTime, 0.01);
      oscillator.stop(c.currentTime + 0.05);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    };
  }, [enabled, working, tool]);

  return useCallback(() => {
    const c = context.current;

    if (!enabled || !c || c.state !== "running") return;
    [660, 880].forEach((frequency, i) => {
      const oscillator = c.createOscillator();
      const gain = c.createGain();
      const start = c.currentTime + i * 0.12;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.035, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      oscillator.connect(gain).connect(c.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.24);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }, [enabled]);
}
