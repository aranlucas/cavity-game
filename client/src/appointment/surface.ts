import { steps, type Tool } from "./rules";

export function surfaceState(step: number, progress: number, affected: boolean) {
  if (!affected) {
    return { plaque: 0, decay: 0, filling: 1, cured: true };
  }

  const p = Math.max(0, Math.min(1, progress));

  const remaining = (tool: Tool) => {
    const stage = steps.findIndex((s) => s.tool === tool);

    return step < stage ? 1 : step === stage ? 1 - p : 0;
  };

  return {
    plaque: remaining("polisher"),
    decay: remaining("excavator"),
    filling: 1 - remaining("composite"),
    cured: remaining("curing") === 0,
  };
}
