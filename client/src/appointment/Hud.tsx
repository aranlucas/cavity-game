import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { type MovementPad, type MoveDir, type ViewMode } from "./Clinic";
import { patients, steps, tools, type Appointment, type Tool } from "./rules";

const labels = ["Dental mirror", "Polisher", "Precision bur", "Composite", "Curing light"];
const compactLabels = ["Mirror", "Polish", "Repair", "Fill", "Cure"];
const padOrder: MoveDir[] = ["forward", "left", "back", "right"];
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
export function ClinicHud({
  state,
  view,
  tool,
  paused,
  menu,
  breathing,
  ready,
  near,
  sound,
  saveAvailable,
  pad,
  onTool,
  onMenu,
  onReassure,
  onEnter,
  onLeave,
  onSound,
  onResetCamera,
  onResetVisit,
}: {
  state: Appointment;
  view: ViewMode;
  tool: Tool;
  paused: boolean;
  menu: boolean;
  breathing: boolean;
  ready: boolean;
  near: boolean;
  sound: boolean;
  saveAvailable: boolean;
  pad: MutableRefObject<MovementPad>;
  onTool: (tool: Tool) => void;
  onMenu: (open: boolean) => void;
  onReassure: () => void;
  onEnter: () => void;
  onLeave: () => void;
  onSound: () => void;
  onResetCamera: () => void;
  onResetVisit: (type: "next" | "restart" | "newDay") => void;
}) {
  const patient = patients[state.patient]!;
  const complete = state.step >= steps.length;
  const step = steps[Math.min(state.step, steps.length - 1)]!;
  const progress = complete
    ? 100
    : Math.round(
        ((state.step + state.progress.reduce((a, b) => a + b, 0) / state.progress.length) /
          steps.length) *
          100,
      );
  const dialog = useRef<HTMLDialogElement>(null);
  const [fullscreenError, setFullscreenError] = useState("");
  useEffect(() => {
    if (menu) dialog.current?.showModal();
    else dialog.current?.close();
  }, [menu]);
  return (
    <>
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
              disabled={complete || paused}
              onClick={onReassure}
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
          <button onClick={onLeave} title="Q — leave treatment">
            ← Room <kbd>Q</kbd>
          </button>
        )}
        <button onClick={() => onMenu(true)} aria-label="Pause and controls">
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
            <button className="primary" disabled={!ready || !near} onClick={onEnter}>
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
            {padOrder.map((direction, i) => (
              <button
                key={direction}
                className={direction}
                aria-label={`Move ${direction}`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  pad.current[direction] = true;
                }}
                onPointerUp={() => (pad.current[direction] = false)}
                onPointerCancel={() => (pad.current[direction] = false)}
                onLostPointerCapture={() => (pad.current[direction] = false)}
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
              {String(state.step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")} ·{" "}
              {step.verb.toUpperCase()}
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
            onClick={onResetCamera}
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
                onClick={() => onTool(t)}
              >
                <kbd>{i + 1}</kbd>
                <ToolIcon index={i} />
                <span className="full-label">{labels[i]}</span>
                <span className="compact-label" aria-hidden="true">
                  {compactLabels[i]}
                </span>
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
          <button className="primary" onClick={() => onResetVisit("next")}>
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
          onMenu(false);
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
        <button className="primary" onClick={() => onMenu(false)}>
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
        <button className="secondary sound-toggle" aria-pressed={sound} onClick={onSound}>
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
            <button className="secondary" onClick={() => onResetVisit("restart")}>
              Restart this visit
            </button>
            <button className="secondary" onClick={() => onResetVisit("newDay")}>
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
    </>
  );
}
