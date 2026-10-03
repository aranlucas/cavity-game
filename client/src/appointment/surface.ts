/** Mesh visibility is derived from treatment state, never persisted separately. */
export function surfaceState(step: number, progress: number, affected: boolean) {
  if (!affected) return { plaque: 0, decay: 0, filling: 1, cured: true };
  const p = Math.max(0, Math.min(1, progress));

  return {
    plaque: step < 1 ? 1 : step === 1 ? 1 - p : 0,
    decay: step < 2 ? 1 : step === 2 ? 1 - p : 0,
    filling: step < 3 ? 0 : step === 3 ? p : 1,
    cured: step >= 5 || (step === 4 && p >= 1),
  };
}
