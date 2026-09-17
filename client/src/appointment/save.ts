import { patients, steps, type Appointment } from "./rules.ts";

export const SAVE_KEY = "little-smiles:clinic:v1";
export interface SavedGame {
  version: 1;
  appointment: Appointment;
  sound: boolean;
}
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const integer = (value: unknown, min: number, max: number): value is number =>
  inRange(value, min, max) && Number.isInteger(value);

/** Treat browser storage as untrusted input; an old or broken save starts a fresh clinic. */
export function decodeSave(raw: string | null): SavedGame | null {
  if (!raw || raw.length > 10_000) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;
    if (record.version !== 1 || typeof record.sound !== "boolean") return null;
    if (!record.appointment || typeof record.appointment !== "object") return null;
    const s = record.appointment as Record<string, unknown>;
    if (!integer(s.patient, 0, patients.length - 1) || !integer(s.step, 0, steps.length))
      return null;
    const patient = patients[s.patient]!;
    const maxScore = steps.length * (100 + patient.spots.length * 50);
    const maxDayScore = patients.reduce(
      (total, p) => total + steps.length * (100 + p.spots.length * 50),
      0,
    );
    if (!integer(s.day, 1, 1_000_000) || !integer(s.dayScore, 0, maxDayScore)) return null;
    if (!integer(s.score, 0, maxScore)) return null;
    if (!inRange(s.comfort, 0, 100) || !inRange(s.heat, 0, 100)) return null;
    if ([s.started, s.paused, s.cooldown, s.recovering].some((v) => typeof v !== "boolean"))
      return null;
    if (
      !Array.isArray(s.progress) ||
      s.progress.length !== patient.spots.length ||
      !s.progress.every((v) => inRange(v, 0, 1))
    )
      return null;
    if (
      !Array.isArray(s.stickers) ||
      s.stickers.length > patients.length ||
      !s.stickers.every((v) => integer(v, 0, patients.length - 1)) ||
      new Set(s.stickers).size !== s.stickers.length
    )
      return null;
    if (!s.started && (s.step !== 0 || s.score !== 0 || s.progress.some((v) => v !== 0)))
      return null;
    if (
      s.step === steps.length &&
      (s.dayScore < s.score || s.progress.some((v) => v !== 0) || !s.stickers.includes(s.patient))
    )
      return null;
    return {
      version: 1,
      sound: record.sound,
      appointment: {
        day: s.day,
        dayScore: s.dayScore,
        stickers: [...s.stickers],
        patient: s.patient,
        started: s.started as boolean,
        step: s.step,
        progress: [...s.progress],
        comfort: s.comfort,
        heat: s.heat,
        score: s.score,
        paused: false,
        cooldown: s.cooldown as boolean,
        recovering: s.recovering as boolean,
      },
    };
  } catch {
    return null;
  }
}

export function loadGame(storage?: StorageAccess): SavedGame | null {
  try {
    return decodeSave((storage ?? window.localStorage).getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

/** Returns false for private browsing or quota failures without interrupting play. */
export function saveGame(
  appointment: Appointment,
  sound: boolean,
  storage?: StorageAccess,
): boolean {
  try {
    (storage ?? window.localStorage).setItem(
      SAVE_KEY,
      JSON.stringify({ version: 1, appointment, sound }),
    );
    return true;
  } catch {
    return false;
  }
}
