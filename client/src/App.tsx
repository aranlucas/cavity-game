import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { TreatmentScene } from "./appointment/Scene";
import { advance, initial, patients, steps, tools, type Tool } from "./appointment/rules";
import { movement, type ViewMode } from "./appointment/Clinic";
import { loadGame, saveGame } from "./appointment/save";
import { useClinicSound } from "./appointment/useClinicSound";
import "./appointment/hud.css";
const labels = ["Dental mirror", "Polisher", "Precision bur", "Composite", "Curing light"];
function ToolIcon({ index }: { index: number }) {
  return (
    <svg
      viewBox="0 0 52 52"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M14 44 31 17" strokeWidth="5" />
      <path d="m29 18 5-8" />
      {index === 0 ? (
        <ellipse cx="37" cy="8" rx="7" ry="5" transform="rotate(-30 37 8)" />
      ) : index === 1 ? (
        <path d="m30 8 10 6 4-7-10-6z" />
      ) : index === 2 ? (
        <path d="m34 10 7 1 4-6" />
      ) : index === 3 ? (
        <path d="m34 10 7 1 3 5" />
      ) : (
        <>
          <path d="m34 10 7 1 3 5" />
          <path d="m40 23 1 4m6-6 3 3m-13-1-2 3" stroke="#65a7e6" />
        </>
      )}
      <path d="m17 36 4 3m0-10 4 3" stroke="#d6e4dc" />
    </svg>
  );
}
export default function App() {
  const [saved] = useState(loadGame);
  const [state, dispatch] = useReducer(advance, saved?.appointment ?? initial());
  const [tool, setTool] = useState<Tool>(
    () => steps[saved?.appointment.step ?? 0]?.tool ?? "mirror",
  );
  const [sound, setSound] = useState(saved?.sound ?? true);
  const [saveAvailable, setSaveAvailable] = useState(true);
  const [target, setTarget] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const [menu, setMenu] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const breathRemaining = useRef(2400);
  const [view, setView] = useState<ViewMode>("room");
  const [near, setNear] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const patient = patients[state.patient]!;
  const complete = state.step >= steps.length;
  const step = steps[Math.min(state.step, 4)]!;
  const blocked = menu || breathing || view === "room" || complete;
  const operating =
    held &&
    !blocked &&
    target !== null &&
    state.progress[target]! < 1 &&
    tool === step.tool &&
    !state.cooldown &&
    !state.recovering &&
    state.comfort > 15;
  const chime = useClinicSound(sound, operating, tool);
  const previousStep = useRef(state.step);
  const saveSnapshot = useRef({ state, sound });
  useEffect(() => {
    saveSnapshot.current = { state, sound };
    if (state.step > previousStep.current) chime();
    previousStep.current = state.step;
  }, [state, sound, chime]);
  useEffect(() => {
    const persist = () => {
      const snapshot = saveSnapshot.current;
      setSaveAvailable(saveGame(snapshot.state, snapshot.sound));
    };
    const timer = window.setInterval(persist, 1000);
    const hidden = () => {
      if (document.hidden) persist();
    };
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  const live = useRef({ target, held, tool, blocked });
  useEffect(() => {
    live.current = { target, held, tool, blocked };
  }, [target, held, tool, blocked]);
  const onReady = useCallback(() => setReady(true), []);
  const enter = useCallback(() => {
    if (!ready || !near || menu) return;
    setHeld(false);
    setTarget(null);
    setView("treatment");
    dispatch({ type: "start" });
  }, [ready, near, menu]);
  const leave = () => {
    setHeld(false);
    setTarget(null);
    setBreathing(false);
    setView("room");
  };
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        s = live.current;
      if (!s.blocked)
        dispatch({
          type: "tick",
          dt: (now - last) / 1000,
          target: s.held ? s.target : null,
          tool: s.tool,
        });
      last = now;
    }, 50);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- reset the external input latch at phase boundaries
    setHeld(false);
    setTarget(null);
  }, [state.step, state.patient, blocked]);
  useEffect(() => {
    if (menu) dialog.current?.showModal();
    else dialog.current?.close();
  }, [menu]);
  useEffect(() => {
    const release = () => setHeld(false);
    const hidden = () => {
      release();
      if (document.hidden) setMenu(true);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenu((m) => !m);
        release();
      }
      if (e.target instanceof HTMLElement && e.target.closest("dialog,input")) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        setTool(tools[n - 1]!);
        release();
      }
      if (e.code === "KeyQ") {
        release();
        setBreathing(false);
        setView("room");
      }
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  useEffect(() => {
    if (!breathing || menu || view === "room") return;
    const started = performance.now();
    const timer = setTimeout(() => {
      dispatch({ type: "breathe" });
      setBreathing(false);
    }, breathRemaining.current);
    return () => {
      clearTimeout(timer);
      breathRemaining.current = Math.max(
        0,
        breathRemaining.current - (performance.now() - started),
      );
    };
  }, [breathing, menu, view]);
  const resetVisit = (type: "next" | "restart" | "newDay") => {
    dispatch({ type });
    setTool("mirror");
    setView("room");
    setHeld(false);
    setTarget(null);
    setBreathing(false);
    setMenu(false);
  };
  const progress = complete
    ? 100
    : Math.round(
        ((state.step + state.progress.reduce((a, b) => a + b, 0) / state.progress.length) / 5) *
          100,
      );
  return (
    <main className={`game-shell view-${view}`}>
      <div className="game-world" aria-label="Three dimensional dental clinic">
        <TreatmentScene
          state={{ ...state, paused: menu || breathing }}
          tool={tool}
          active={target}
          working={held && !blocked}
          onTarget={setTarget}
          onHold={setHeld}
          onReady={onReady}
          resetKey={resetKey}
          mode={view}
          onNear={setNear}
          onEnter={enter}
        />
      </div>
      <div className="vignette" />
      <aside className="patient-hud">
        <div className="hud-heading">
          <span className="clinic-mark">✳</span>
          <div>
            <span className="eyebrow">LITTLE SMILES · VISIT {state.patient + 1}/3</span>
            <h1>
              {patient.name}
              <small>{patient.age} years old</small>
            </h1>
          </div>
        </div>
        <div className="comfort-row">
          <span>
            {state.comfort > 75
              ? "Feeling brave"
              : state.comfort > 35
                ? "A little nervous"
                : "Needs a break"}
          </span>
          <span>♡ {Math.round(state.comfort)}%</span>
        </div>
        <div className="meter">
          <i style={{ width: `${state.comfort}%` }} />
        </div>
        <div className="clinic-day-line">
          <span>Day {state.day}</span>
          <span>{state.dayScore + (complete ? 0 : state.score)} care points</span>
        </div>
        {view === "treatment" && (
          <>
            <button
              className={`breath-button ${state.recovering ? "needs-rest" : ""}`}
              disabled={complete || breathing || menu}
              onClick={() => {
                setHeld(false);
                breathRemaining.current = 2400;
                setBreathing(true);
              }}
            >
              ♡ Reassure {patient.name}
            </button>
            {!complete && (
              <details className="visit-checklist">
                <summary>
                  {state.progress.filter((p) => p >= 1).length}/{state.progress.length} teeth ·{" "}
                  {step.verb.toLowerCase()}
                </summary>
                <ol>
                  {state.progress.map((p, i) => (
                    <li key={i}>
                      <span>Tooth {i + 1}</span>
                      <span>{p >= 1 ? "✓ Done" : `${Math.round(p * 100)}%`}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </>
        )}
      </aside>
      <div className="game-actions">
        {view === "treatment" && (
          <button onClick={leave} title="Q — leave treatment">
            ← Room <kbd>Q</kbd>
          </button>
        )}
        <button
          onClick={() => {
            setMenu(true);
            setHeld(false);
          }}
          aria-label="Pause and controls"
        >
          Ⅱ <span>Menu</span>
          <kbd>Esc</kbd>
        </button>
      </div>
      {view === "room" && !menu && (
        <>
          <div className="crosshair" aria-hidden="true" />
          <div className="room-objective">
            <span className="eyebrow">TREATMENT ROOM 01</span>
            <h2>
              {state.started
                ? "Your appointment is waiting."
                : `${patient.name} is waiting for you.`}
            </h2>
            <p>
              {state.started
                ? "Return to the patient chair to continue treatment."
                : `“${patient.quote}”`}
            </p>
          </div>
          <div className="interact-prompt">
            <button className="primary" disabled={!ready || !near} onClick={enter}>
              {!ready ? (
                "Preparing the clinic…"
              ) : near ? (
                <>
                  <kbd>E</kbd> {state.started ? "Resume treatment" : "Begin treatment"}
                </>
              ) : (
                "Approach the patient chair"
              )}
            </button>
            <span>WASD / arrows to walk · drag to look</span>
          </div>
          <div className="movement-pad" aria-label="Movement controls">
            {(["forward", "left", "back", "right"] as const).map((direction, i) => (
              <button
                key={direction}
                className={direction}
                aria-label={`Move ${direction}`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  movement[direction] = true;
                }}
                onPointerUp={() => (movement[direction] = false)}
                onPointerCancel={() => (movement[direction] = false)}
                onLostPointerCapture={() => (movement[direction] = false)}
              >
                {["↑", "←", "↓", "→"][i]}
              </button>
            ))}
          </div>
        </>
      )}
      {view === "treatment" && !complete && (
        <>
          <section className="objective-hud" aria-live="polite">
            <span className="eyebrow">
              {String(state.step + 1).padStart(2, "0")} / 05 · {step.verb.toUpperCase()}
            </span>
            <h2>{step.title}</h2>
            <div className="stage-dots">
              {steps.map((s, i) => (
                <span title={s.verb} key={s.verb} className={i <= state.step ? "lit" : ""} />
              ))}
            </div>
          </section>
          <button
            className="camera-reset"
            onClick={() => setResetKey((k) => k + 1)}
            aria-label="Reset treatment camera"
          >
            ↺
          </button>
          {state.step === 2 && (
            <div className={`heat-hud ${state.heat > 75 ? "hot" : ""}`}>
              <span>{state.cooldown ? "Cooling down…" : "Instrument heat"}</span>
              <div className="meter">
                <i style={{ width: `${state.heat}%` }} />
              </div>
            </div>
          )}
          <div className="treatment-hint">
            {state.recovering || state.comfort <= 15
              ? `Tools are resting. Reassure ${patient.name} to restore comfort.`
              : tool !== step.tool
                ? `Select ${labels[tools.indexOf(step.tool)]!.toLowerCase()}`
                : state.cooldown
                  ? "Release and let the bur cool"
                  : step.hint}
          </div>
          <nav className="toolbelt" aria-label="Dental instruments">
            {tools.map((t, i) => (
              <button
                key={t}
                className={`tool ${tool === t ? "selected" : ""}`}
                aria-label={labels[i]}
                aria-pressed={tool === t}
                onClick={() => {
                  setHeld(false);
                  setTool(t);
                }}
              >
                <kbd>{i + 1}</kbd>
                <ToolIcon index={i} />
                <span>{labels[i]}</span>
                {step.tool === t && <i />}
              </button>
            ))}
          </nav>
          <progress
            className="visit-progress"
            aria-label="Visit progress"
            max={100}
            value={progress}
          />
        </>
      )}
      {breathing && (
        <div className="game-overlay">
          <div className="breathing-orb">♡</div>
          <h2>Breathe with {patient.name}.</h2>
          <p>Slowly in. Slowly out.</p>
        </div>
      )}
      {complete && !menu && (
        <div className="game-overlay reward">
          <span className="reward-sticker">{patient.symbol}</span>
          <span className="eyebrow">
            {state.patient === patients.length - 1
              ? `CLINIC DAY ${state.day} COMPLETE`
              : "BRAVE SMILE CLUB"}
          </span>
          <h2>
            {state.patient === patients.length - 1
              ? "A day of brighter smiles."
              : "One happier smile."}
          </h2>
          <p>
            {patient.name} earned the {patient.sticker} sticker.
          </p>
          <div className="results">
            <b>
              {state.score}
              <small>VISIT POINTS</small>
            </b>
            <b>
              {Math.round(state.comfort)}%<small>COMFORT</small>
            </b>
            <b>
              {state.dayScore}
              <small>DAY TOTAL</small>
            </b>
          </div>
          <div
            className="sticker-collection"
            aria-label={`${state.stickers.length} of ${patients.length} stickers collected`}
          >
            {patients.map((p, i) => (
              <span
                key={p.name}
                className={state.stickers.includes(i) ? "earned" : ""}
                title={state.stickers.includes(i) ? p.sticker : `${p.name}'s sticker to collect`}
                aria-label={state.stickers.includes(i) ? p.sticker : "Sticker not yet collected"}
              >
                {p.symbol}
              </span>
            ))}
          </div>
          <button className="primary" onClick={() => resetVisit("next")}>
            {state.patient === patients.length - 1
              ? "Start a new clinic day"
              : "Meet your next patient"}{" "}
            →
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="pause-menu"
        onCancel={(e) => {
          e.preventDefault();
          setMenu(false);
        }}
        aria-labelledby="menu-title"
      >
        <span className="eyebrow">LITTLE SMILES</span>
        <h2 id="menu-title">Take your time.</h2>
        <p>
          The clinic is paused.{" "}
          {saveAvailable
            ? "Your visit saves on this device."
            : "Saving is unavailable in this browser; keep this tab open to continue your visit."}
        </p>
        <button className="primary" onClick={() => setMenu(false)}>
          Back to the clinic →
        </button>
        <div className="controls-list">
          <p>
            <kbd>WASD</kbd> Walk around the clinic
          </p>
          <p>
            <kbd>Drag</kbd> Look around / orbit during treatment
          </p>
          <p>
            <kbd>E</kbd> Sit beside the patient chair
          </p>
          <p>
            <kbd>1—5</kbd> Select a dental instrument
          </p>
          <p>
            <kbd>Hold</kbd> Treat a marked tooth (or Tab + Space)
          </p>
          <p>
            <kbd>Q</kbd> Step back into the room
          </p>
        </div>
        <p className="menu-tip">
          Inspect, clean, repair, fill, then cure. Use short bur passes and reassure your patient
          when they need a break.
        </p>
        <button
          className="secondary sound-toggle"
          aria-pressed={sound}
          onClick={() => setSound((value) => !value)}
        >
          Sound {sound ? "on" : "off"}
        </button>
        <button
          className="secondary"
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await document.documentElement.requestFullscreen();
              setFullscreenError("");
            } catch {
              setFullscreenError("Fullscreen is unavailable in this browser.");
            }
          }}
        >
          Toggle fullscreen
        </button>
        {fullscreenError && <output>{fullscreenError}</output>}
        <details>
          <summary>Clinic day & sticker collection</summary>
          <p>
            Day {state.day} · {state.dayScore} completed visit points · {state.stickers.length}/
            {patients.length} stickers
          </p>
          <div className="sticker-collection menu-stickers">
            {patients.map((p, i) => (
              <span
                key={p.name}
                className={state.stickers.includes(i) ? "earned" : ""}
                title={p.sticker}
                aria-label={`${p.sticker}: ${state.stickers.includes(i) ? "collected" : "not collected"}`}
              >
                {p.symbol}
              </span>
            ))}
          </div>
          <p>
            Restart this visit to try again, or start a fresh day with Mia. Collected stickers stay
            in your album.
          </p>
          <div className="reset-actions">
            <button className="secondary" onClick={() => resetVisit("restart")}>
              Restart this visit
            </button>
            <button className="secondary" onClick={() => resetVisit("newDay")}>
              Start new day
            </button>
          </div>
        </details>
        <details>
          <summary>About the practice model</summary>
          <p>
            The real adult dental cast is by Michael D. Scherer via{" "}
            <a href="https://3d.nih.gov/entries/3002" target="_blank" rel="noreferrer">
              NIH 3D
            </a>{" "}
            (CC0). It is displayed on the shelf. You treat an original mouth modeled in Blender for
            our fictional patients. This game is not clinical training.
          </p>
        </details>
      </dialog>
    </main>
  );
}
