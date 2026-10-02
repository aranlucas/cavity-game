import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { TreatmentScene } from "./appointment/Scene";
import { ClinicHud } from "./appointment/Hud";
import { advance, canTreat, initial, steps, tools, treating, type Tool } from "./appointment/rules";
import { idlePad, type ViewMode } from "./appointment/Clinic";
import { loadGame, saveGame } from "./appointment/save";
import { useClinicSound } from "./appointment/useClinicSound";
import "./appointment/hud.css";
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
  const pad = useRef(idlePad());
  const paused = menu || breathing;
  const seated = view === "treatment" && treating(state, paused);
  const treatingNow = canTreat(state, tool, held ? target : null, paused);
  const chime = useClinicSound(sound, treatingNow, tool);
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
  const live = useRef({ target, held, tool, seated });
  useEffect(() => {
    live.current = { target, held, tool, seated };
  }, [target, held, tool, seated]);
  const onReady = useCallback(() => setReady(true), []);
  const enter = useCallback(() => {
    if (!ready || !near || paused) return;
    setHeld(false);
    setTarget(null);
    setView("treatment");
    dispatch({ type: "start" });
  }, [ready, near, paused]);
  const leave = () => {
    setHeld(false);
    setTarget(null);
    setBreathing(false);
    setView("room");
  };
  const release = () => setHeld(false);
  const setMenuOpen = (open: boolean) => {
    if (open) release();
    setMenu(open);
  };
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        s = live.current;
      if (s.seated)
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
  }, [state.step, state.patient, seated]);
  useEffect(() => {
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
      if (n >= 1 && n <= tools.length) {
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
  return (
    <main className={`game-shell view-${view}`}>
      <div className="game-world" role="region" aria-label="Three dimensional dental clinic">
        <TreatmentScene
          state={state}
          paused={paused}
          tool={tool}
          active={target}
          working={held && seated}
          onTarget={setTarget}
          onHold={setHeld}
          onReady={onReady}
          resetKey={resetKey}
          mode={view}
          pad={pad}
          onNear={setNear}
          onEnter={enter}
        />
      </div>
      <div className="vignette" />
      <ClinicHud
        state={state}
        view={view}
        tool={tool}
        paused={paused}
        menu={menu}
        breathing={breathing}
        ready={ready}
        near={near}
        sound={sound}
        saveAvailable={saveAvailable}
        pad={pad}
        onTool={(next) => {
          release();
          setTool(next);
        }}
        onMenu={setMenuOpen}
        onReassure={() => {
          release();
          breathRemaining.current = 2400;
          setBreathing(true);
        }}
        onEnter={enter}
        onLeave={leave}
        onSound={() => setSound((value) => !value)}
        onResetCamera={() => setResetKey((k) => k + 1)}
        onResetVisit={resetVisit}
      />
    </main>
  );
}
