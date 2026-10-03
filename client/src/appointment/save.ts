import { z } from "zod";
import { patients, steps, type Appointment } from "./rules.ts";

export const SAVE_KEY = "little-smiles:clinic:v1";

export interface SavedGame {
  version: 1;
  appointment: Appointment;
  sound: boolean;
}

type StorageAccess = Pick<Storage, "getItem" | "setItem">;

const maxDayScore = patients.reduce(
  (total, patient) => total + steps.length * (100 + patient.spots.length * 50),
  0,
);

const savedGameSchema = z.object({
  version: z.literal(1),
  sound: z.boolean(),
  appointment: z.object({
    patient: z
      .number()
      .int()
      .min(0)
      .max(patients.length - 1),
    step: z.number().int().min(0).max(steps.length),
    day: z.number().int().min(1).max(1_000_000),
    dayScore: z.number().int().min(0).max(maxDayScore),
    score: z.number().int().min(0),
    comfort: z.number().min(0).max(100),
    heat: z.number().min(0).max(100),
    started: z.boolean(),
    paused: z.boolean(),
    cooldown: z.boolean(),
    recovering: z.boolean(),
    progress: z.array(z.number().min(0).max(1)),
    stickers: z
      .array(
        z
          .number()
          .int()
          .min(0)
          .max(patients.length - 1),
      )
      .max(patients.length),
  }),
});

/** Treat browser storage as untrusted input; an old or broken save starts a fresh clinic. */
export function decodeSave(raw: string | null): SavedGame | null {
  if (!raw || raw.length > 10_000) return null;

  try {
    const decoded = savedGameSchema.safeParse(JSON.parse(raw));

    if (!decoded.success) return null;

    const record = decoded.data;
    const s = record.appointment;
    const patient = patients[s.patient]!;
    const maxScore = steps.length * (100 + patient.spots.length * 50);

    if (s.score > maxScore || s.progress.length !== patient.spots.length) return null;

    if (new Set(s.stickers).size !== s.stickers.length) return null;

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
      appointment: { ...s, paused: false },
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
