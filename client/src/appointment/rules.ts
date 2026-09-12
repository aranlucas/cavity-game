export const tools = ["mirror", "polisher", "excavator", "composite", "curing"] as const;
export type Tool = (typeof tools)[number];
export const steps = [
  {
    title: "Look closely",
    verb: "Inspect",
    tool: "mirror",
    hint: "Hold the mirror over each marked tooth to complete your check-up.",
    duration: 0.65,
  },
  {
    title: "A fresh start",
    verb: "Clean",
    tool: "polisher",
    hint: "Hold the polisher on each golden patch until the surface is clean.",
    duration: 1.5,
  },
  {
    title: "Gentle little passes",
    verb: "Repair",
    tool: "excavator",
    hint: "Use short holds on the dark spots. Release to let the instrument cool.",
    duration: 2.2,
  },
  {
    title: "Make it whole",
    verb: "Fill",
    tool: "composite",
    hint: "Hold the composite applicator over each prepared spot to restore it.",
    duration: 1.3,
  },
  {
    title: "The finishing glow",
    verb: "Cure",
    tool: "curing",
    hint: "Hold the blue light steady on each repair to finish the appointment.",
    duration: 1.8,
  },
] as const;
export const patients = [
  {
    name: "Mia",
    age: 7,
    color: "#e8b192",
    interest: "space",
    quote: "Will my smile be ready for my space adventure?",
    spots: [0, 1],
    sticker: "Cosmic explorer",
    symbol: "✦",
  },
  {
    name: "Leo",
    age: 8,
    color: "#b77c52",
    interest: "dinosaurs",
    quote: "I want teeth as shiny as a T. rex!",
    spots: [1, 2, 3],
    sticker: "Dinosaur champion",
    symbol: "♧",
  },
  {
    name: "Ava",
    age: 6,
    color: "#efc5aa",
    interest: "the ocean",
    quote: "Can we pretend the blue light is a jellyfish?",
    spots: [0, 2, 3],
    sticker: "Ocean adventurer",
    symbol: "≈",
  },
];
export interface Appointment {
  day: number;
  dayScore: number;
  stickers: number[];
  patient: number;
  started: boolean;
  step: number;
  progress: number[];
  comfort: number;
  heat: number;
  score: number;
  paused: boolean;
  breaks: number;
  cooldown: boolean;
  recovering: boolean;
}
export type Action =
  | { type: "start" | "pause" | "breathe" | "next" | "restart" | "newDay" }
  | { type: "tick"; dt: number; target: number | null; tool: Tool };
export function initial(patient = 0): Appointment {
  return {
    day: 1,
    dayScore: 0,
    stickers: [],
    patient,
    started: false,
    step: 0,
    progress: patients[patient]!.spots.map(() => 0),
    comfort: 100,
    heat: 0,
    score: 0,
    paused: false,
    breaks: 0,
    cooldown: false,
    recovering: false,
  };
}
export function advance(s: Appointment, a: Action): Appointment {
  if (
    a.type === "newDay" ||
    (a.type === "next" && s.step >= steps.length && s.patient === patients.length - 1)
  )
    return { ...initial(), day: s.day + 1, stickers: s.stickers };
  if (a.type === "next")
    return s.step >= steps.length
      ? { ...initial(s.patient + 1), day: s.day, dayScore: s.dayScore, stickers: s.stickers }
      : s;
  if (a.type === "restart")
    return {
      ...initial(s.patient),
      day: s.day,
      dayScore: s.dayScore - (s.step >= steps.length ? s.score : 0),
      stickers: s.stickers,
    };
  if (a.type === "start") return { ...s, started: true };
  if (a.type === "pause")
    return s.started && s.step < steps.length ? { ...s, paused: !s.paused } : s;
  if (a.type === "breathe")
    return s.started && !s.paused && s.step < steps.length
      ? {
          ...s,
          comfort: Math.min(100, s.comfort + 25),
          heat: 0,
          cooldown: false,
          recovering: (s.recovering || s.comfort <= 15) && s.comfort + 25 < 35,
          breaks: s.breaks + 1,
        }
      : s;
  if (a.type !== "tick") return s;
  if (!s.started || s.paused || s.step >= steps.length) return s;
  const dt = Number.isFinite(a.dt) ? Math.max(0, Math.min(a.dt, 0.1)) : 0;
  const valid =
    a.target !== null &&
    Number.isInteger(a.target) &&
    a.target >= 0 &&
    a.target < s.progress.length &&
    s.progress[a.target]! < 1;
  const needsRest = s.comfort <= 15 || s.recovering;
  const operating = valid && a.tool === steps[s.step]!.tool && !s.cooldown && !needsRest;
  const drilling = operating && a.tool === "excavator";
  const heat = Math.max(0, Math.min(100, s.heat + dt * (drilling ? 58 : -55)));
  const cooldown = heat >= 100 || (s.cooldown && heat > 15);
  const comfort = Math.max(
    0,
    Math.min(100, s.comfort + dt * (heat > 80 && drilling ? -22 : operating ? -0.8 : 1.7)),
  );
  const recovering = comfort <= 15 || (needsRest && comfort < 35);
  const progress = [...s.progress];
  if (operating && !cooldown && !recovering)
    progress[a.target!] = Math.min(1, progress[a.target!]! + dt / steps[s.step]!.duration);
  if (progress.every((p) => p >= 1)) {
    const score = s.score + Math.round(comfort) + progress.length * 50;
    const complete = s.step + 1 === steps.length;
    return {
      ...s,
      step: s.step + 1,
      progress: progress.map(() => 0),
      heat: 0,
      cooldown: false,
      comfort,
      recovering,
      score,
      dayScore: s.dayScore + (complete ? score : 0),
      stickers:
        complete && !s.stickers.includes(s.patient) ? [...s.stickers, s.patient] : s.stickers,
    };
  }
  return { ...s, progress, comfort, heat, cooldown, recovering };
}
