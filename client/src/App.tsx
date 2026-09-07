import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { TreatmentScene } from "./appointment/Scene";
import { advance, initial, patients, steps, tools, type Tool } from "./appointment/rules";
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
function Portrait({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="50" fill="#ece8d8" />
      <path d="M15 103Q15 69 50 70Q85 69 85 103" fill="#6c9080" />
      <path d="M27 47Q17 4 52 10Q87 9 78 54" fill="#5b3d30" />
      <ellipse cx="51" cy="48" rx="25" ry="30" fill={color} />
      <path d="M24 40Q33 33 36 23Q57 39 79 33L74 18 44 12 24 27Z" fill="#5b3d30" />
      <path d="M38 49h2m21 0h2" stroke="#48342c" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M43 62q8 8 16-1"
        stroke="#9a5249"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="34" cy="57" r="5" fill="#e48e80" opacity=".5" />
      <circle cx="68" cy="57" r="5" fill="#e48e80" opacity=".5" />
      <path d="m37 79 14 13 14-13" stroke="#c2d4a6" fill="none" strokeWidth="4" />
    </svg>
  );
}
export default function App() {
  const [state, dispatch] = useReducer(advance, undefined, () => initial());
  const [tool, setTool] = useState<Tool>("mirror");
  const [target, setTarget] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const [help, setHelp] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const [sticker, setSticker] = useState("✦");
  const helpRef = useRef<HTMLDialogElement>(null);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (help) helpRef.current?.showModal();
    else helpRef.current?.close();
  }, [help]);
  const live = useRef({ target, held, tool });
  useEffect(() => {
    live.current = { target, held, tool };
  }, [target, held, tool]);
  const patient = patients[state.patient]!;
  const complete = state.step >= steps.length;
  const step = steps[Math.min(state.step, 4)]!;
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      dispatch({
        type: "tick",
        dt: (now - last) / 1000,
        target: live.current.held ? live.current.target : null,
        tool: live.current.tool,
      });
      last = now;
    }, 50);
    return () => clearInterval(timer);
  }, []);
  // Reset the external pointer/keyboard latch when treatment is interrupted or advances.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- release the external input latch
    setHeld(false);
    setTarget(null);
  }, [state.step, state.patient, state.paused, breathing]);
  useEffect(() => {
    const release = () => setHeld(false);
    const visibility = () => {
      release();
      if (document.hidden) dispatchPause();
    };
    function dispatchPause() {
      if (state.started && !state.paused && !complete) dispatch({ type: "pause" });
    }
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape" && help) {
        setHelp(false);
        return;
      }
      if (e.key === "Escape") {
        setHelp(false);
        dispatch({ type: "pause" });
        release();
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
        setTool(tools[n - 1]!);
        release();
      }
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [state.started, state.paused, complete, help]);
  useEffect(() => {
    if (!breathing) return;
    const t = setTimeout(() => {
      dispatch({ type: "breathe" });
      setBreathing(false);
    }, 2400);
    return () => clearTimeout(t);
  }, [breathing]);
  const progress = complete
    ? 100
    : Math.round(
        ((state.step + state.progress.reduce((a, b) => a + b, 0) / state.progress.length) / 5) *
          100,
      );
  const next = () => {
    dispatch({ type: "next" });
    setTool("mirror");
    setSticker("✦");
    setBreathing(false);
  };
  return (
    <main className="clinic-app">
      <header className="app-header">
        <a className="wordmark" href="/" aria-label="Little Smiles home">
          <span className="brand-icon">✳</span>
          <span>
            little smiles<small>THE PEDIATRIC DENTAL STUDIO</small>
          </span>
        </a>
        <div className="header-center">
          <span className="live-dot" /> A little care goes a long way.
        </div>
        <nav>
          <button
            onClick={() => {
              setHelp(true);
              if (state.started && !state.paused && !complete) dispatch({ type: "pause" });
            }}
          >
            How to play <span>↗</span>
          </button>
          <span className="day-label">
            DAY 01 <i>·</i> MORNING CLINIC
          </span>
        </nav>
      </header>
      <section className="clinic-body">
        <aside className="patient-panel">
          <div className="eyebrow">YOUR NEXT BRAVE SMILE</div>
          <h1>
            Small teeth.
            <br />
            <em>Big feelings.</em>
          </h1>
          <p className="intro">
            Make a little room for kindness.
            <br />
            The best care starts with trust.
          </p>
          <section className="patient-card">
            <div className="patient-heading">
              <div className="portrait">
                <Portrait color={patient.color} />
              </div>
              <div>
                <h2>
                  {patient.name}
                  <span>{patient.age} years old</span>
                </h2>
                <span className="patient-tag">Loves {patient.interest}</span>
              </div>
            </div>
            <blockquote>
              “{complete ? "That wasn’t so scary. Look at my smile!" : patient.quote}”
            </blockquote>
            <div className="comfort-label">
              <span>Patient comfort</span>
              <b>
                {state.comfort > 75
                  ? "Feeling brave"
                  : state.comfort > 35
                    ? "A little nervous"
                    : "Needs a break"}{" "}
                <span>{state.comfort > 75 ? "☺" : "♡"}</span>
              </b>
            </div>
            <div className="meter">
              <div
                style={{
                  width: `${state.comfort}%`,
                  background: state.comfort < 35 ? "#cd8867" : undefined,
                }}
              />
            </div>
            <button
              className="breathe"
              disabled={!state.started || complete || state.paused || breathing}
              onClick={() => {
                setHeld(false);
                setBreathing(true);
              }}
            >
              ♡ <span>{breathing ? "Breathe in… and out…" : "Take a breathing break"}</span>
            </button>
          </section>
          <div className="appointment-note">
            <span>✧</span>
            <p>
              <b>Gentle is the goal.</b>Work at your patient’s pace. A happy visit matters as much
              as a shiny tooth.
            </p>
          </div>
          <div className="visit-number">
            <span>APPOINTMENT</span>
            <strong>
              0{state.patient + 1}
              <small> / 03</small>
            </strong>
            <span className="visit-line" />
          </div>
          <button
            className="credits-link"
            onClick={() => {
              setHelp(true);
              if (state.started && !state.paused && !complete) dispatch({ type: "pause" });
            }}
          >
            About the practice model ↗
          </button>
        </aside>
        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">TREATMENT ROOM 01</span>
              <h2>
                {complete
                  ? "A smile worth celebrating."
                  : state.started
                    ? step.title
                    : "Let’s make this a good visit."}
              </h2>
            </div>
            <button
              className="pause-button"
              disabled={!state.started || complete}
              onClick={() => dispatch({ type: "pause" })}
            >
              {state.paused ? "▶ Resume" : "Ⅱ Pause"}
            </button>
          </div>
          <div className="step-strip">
            {steps.map((s, i) => (
              <div
                key={s.verb}
                className={`${i === state.step ? "current" : ""} ${i < state.step ? "finished" : ""}`}
              >
                <span>{i < state.step ? "✓" : `0${i + 1}`}</span>
                {s.verb}
              </div>
            ))}
          </div>
          <div className="scene-shell">
            <TreatmentScene
              state={{ ...state, paused: state.paused || breathing || help }}
              tool={tool}
              active={target}
              working={held}
              onTarget={setTarget}
              onHold={setHeld}
              onReady={onReady}
              resetKey={resetKey}
            />
            <div className="scene-caption">
              <span className="live-dot" /> REAL DENTAL SCAN <span>·</span> PRACTICE ARCH
            </div>
            <button
              className="reset-view"
              onClick={() => setResetKey((k) => k + 1)}
              title="Reset camera"
            >
              ↺ <span>Reset view</span>
            </button>
            {!state.started && (
              <div className="start-prompt">
                <span className="small-spark">✧</span>
                <div>
                  <b>{patient.name} is ready to meet you.</b>
                  <p>Five gentle steps. One happy smile.</p>
                </div>
                <button
                  className="primary"
                  disabled={!ready}
                  onClick={() => dispatch({ type: "start" })}
                >
                  Start appointment →
                </button>
              </div>
            )}
            {state.started && !complete && !state.paused && !breathing && (
              <div className="scene-hint">
                <span>{tool !== step.tool ? "↳" : "◎"}</span>
                {tool !== step.tool
                  ? `Choose the ${labels[tools.indexOf(step.tool)]!.toLowerCase()} for this step.`
                  : state.cooldown
                    ? "Let the instrument cool before continuing."
                    : state.comfort <= 15
                      ? "Your patient needs a breathing break."
                      : step.hint}
              </div>
            )}
            {state.step === 2 && state.started && !complete && (
              <div className={`heat-meter ${state.heat > 75 ? "hot" : ""}`}>
                <span>INSTRUMENT HEAT</span>
                <div>
                  <i style={{ width: `${state.heat}%` }} />
                </div>
                <small>{state.cooldown ? "Cooling…" : "Short holds. Gentle hands."}</small>
              </div>
            )}
            {(state.paused || breathing) && !help && (
              <div className="scene-overlay">
                <div className="pause-card">
                  <span className={breathing ? "breathing-orb" : "small-spark"}>
                    {breathing ? "♡" : "Ⅱ"}
                  </span>
                  <h2>{breathing ? "A little breath together." : "Take your time."}</h2>
                  <p>
                    {breathing
                      ? "In through the nose. Slowly out."
                      : "Your appointment will be here when you’re ready."}
                  </p>
                  {!breathing && (
                    <button className="primary" onClick={() => dispatch({ type: "pause" })}>
                      Continue appointment →
                    </button>
                  )}
                </div>
              </div>
            )}
            {complete && (
              <div className="scene-overlay celebration">
                <div className="finish-card">
                  <div className="reward-sticker">{sticker}</div>
                  <span className="eyebrow">BRAVE SMILE CLUB</span>
                  <h2>Beautifully done, doctor.</h2>
                  <p>
                    {patient.name} leaves with a restored smile
                    <br />
                    and a little more courage.
                  </p>
                  <div className="result-stats">
                    <div>
                      <b>{state.score}</b>
                      <span>CARE POINTS</span>
                    </div>
                    <div>
                      <b>{Math.round(state.comfort)}%</b>
                      <span>COMFORT</span>
                    </div>
                  </div>
                  <p className="sticker-label">Choose a take-home sticker</p>
                  <div className="sticker-picker">
                    {["✦", "♧", "≈"].map((s) => (
                      <button
                        aria-label={`Choose ${s} sticker`}
                        aria-pressed={sticker === s}
                        key={s}
                        onClick={() => setSticker(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button className="primary" onClick={next}>
                    {state.patient === 2 ? "Start another clinic day" : "Meet your next patient"} →
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="instrument-tray">
            <div className="tray-title">
              <span className="eyebrow">YOUR INSTRUMENTS</span>
              <p>
                A tool for every
                <br />
                little moment.
              </p>
            </div>
            <div className="tools">
              {tools.map((t, i) => (
                <button
                  key={t}
                  className={`tool ${tool === t ? "selected" : ""}`}
                  disabled={complete}
                  aria-pressed={tool === t}
                  onClick={() => {
                    setHeld(false);
                    setTool(t);
                  }}
                >
                  <kbd>{i + 1}</kbd>
                  <ToolIcon index={i} />
                  <span>{labels[i]}</span>
                  {state.started && step.tool === t && !complete && <i />}
                </button>
              ))}
            </div>
          </div>
          <footer className="workspace-footer">
            <span>
              DRAG TO ORBIT <i>·</i> SCROLL TO ZOOM <i>·</i> HOLD A NUMBERED SPOT TO TREAT
            </span>
            <div>
              <span>VISIT PROGRESS</span>
              <div className="footer-meter">
                <i style={{ width: `${progress}%` }} />
              </div>
              <b>{progress}%</b>
            </div>
          </footer>
        </section>
      </section>
      <dialog
        ref={helpRef}
        className="help-backdrop"
        aria-labelledby="help-title"
        onCancel={() => setHelp(false)}
      >
        <section className="help-card">
          <button
            className="close-help"
            aria-label="Close instructions"
            onClick={() => setHelp(false)}
          >
            ×
          </button>
          <span className="eyebrow">WELCOME TO LITTLE SMILES</span>
          <h2 id="help-title">Care comes first.</h2>
          <p>
            Choose the instrument for the current step, then press and hold each numbered spot on
            the arch. You can also Tab to a spot and hold Space or Enter.
          </p>
          <ol>
            <li>
              <b>Inspect</b> with the mirror.
            </li>
            <li>
              <b>Clean</b> the golden patches.
            </li>
            <li>
              <b>Repair</b> dark spots using short holds. Release to cool.
            </li>
            <li>
              <b>Fill</b> each prepared spot.
            </li>
            <li>
              <b>Cure</b> the repairs with the blue light.
            </li>
          </ol>
          <p>
            Use 1–5 to switch tools, drag the background to orbit, scroll to zoom, and Escape to
            pause. Take a breathing break if your patient needs reassurance.
          </p>
          <div className="source-note">
            <b>A real asset, a fictional appointment.</b>
            <p>
              The practice arch is an adult upper-teeth scan by Michael D. Scherer, provided through{" "}
              <a href="https://3d.nih.gov/entries/3002" target="_blank" rel="noreferrer">
                NIH 3D
              </a>{" "}
              under CC0. It was optimized and shaded in Blender. The patients and treatment spots
              are fictional. This is a simplified care game, not clinical training or a model of
              primary dentition.
            </p>
          </div>
          <button className="primary" onClick={() => setHelp(false)}>
            Got it →
          </button>
        </section>
      </dialog>
    </main>
  );
}
