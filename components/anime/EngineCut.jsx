"use client";
// The engine's host on the island (engine-design.md section 2): a dock engineOwns() routes plays its first arrival here,
// over the island canvas under an iris. Once playing, the player owns the arrival (live.arrival.len, onEnd, and the HUD's
// Skip through live.engineSkip); any failure marks ui.engineFail and Cutscene.jsx mounts the approved R3F move.
// Before the arrival lib/anime/prep.js may have prepared the dock on the resident engine: the arrival takes it. A dock not
// prepared starts cold, and a dock that shows no frame within ENGINE_START_MS hands back to the R3F move.

import { useEffect, useRef } from "react";
import { engineOwns } from "../../lib/anime/live.js";
import * as prep from "../../lib/anime/prep.js";
import { modeForTier } from "../../lib/quality/modes.js";
import { PLACES } from "../../lib/world/places.js";
import { getUi, live, setUi, useUi } from "../../lib/world/store";
import { registerEngineProvider } from "../world/cutscene/prewarm.js";

const IRIS_S = 0.4;
const IRIS_MAX = 75; // the radius in % at which the iris covers the frame's corners at any aspect
export const ENGINE_START_MS = 8000;

const fault = () => (typeof location === "undefined" ? null : new URLSearchParams(location.search).get("engine-fault"));
const mods = {};
let loaded = null;
const modules = () => (loaded ??= Promise.all([import("../../lib/anime/cutscenes/index.js"), import("../../lib/anime/cutscenes/framework.js"), import("../../lib/anime/engine.js")])
  .then(([reg, fw, en]) => Object.assign(mods, { reg, CutscenePlayer: fw.CutscenePlayer, AnimeEngine: en.AnimeEngine })));

prep.configure({
  env: () => ({ memory: navigator.deviceMemory, saveData: navigator.connection?.saveData, off: new URLSearchParams(location.search).get("hot") === "off" }),
  loadModules: modules,
  loadCut: async (id) => { await modules(); if (fault() === id) throw new Error(`engine-fault ${id}`); return mods.reg.loadCut(id); },
  makeCanvas: () => { const c = document.createElement("canvas"); c.style.cssText = "width:100%;height:100%;display:block"; return c; },
  makeEngine: async (canvas) => { await modules(); return new mods.AnimeEngine(canvas, { style: "modern-anime" }); },
  warm: async (engine) => { const { Scene, PerspectiveCamera } = await import("three"); engine.frame(new Scene(), new PerspectiveCamera(), 0, 0); },
  onLost: (canvas, fn) => canvas.addEventListener("webglcontextlost", fn),
  makePlayer: (engine, cut) => new mods.CutscenePlayer(engine, cut.scene, cut.build, { seed: 7 }),
  steps: (player) => player.initSteps(),
  compile: (engine, player) => { const gl = engine.renderer, target = engine.composer?.scene; gl.setRenderTarget(target?.isWebGLRenderTarget ? target : null); const compiled = gl.compileAsync(player.root, player.camera); gl.setRenderTarget(null); return compiled; },
  restyle: (player) => player.restyle(),
  shrink: (engine) => { engine.reset(); engine.resize(1, 1, 1); },
  modeOf: (engine) => modeForTier(engine.tier),
  now: () => performance.now(),
  nextTask: () => new Promise((r) => setTimeout(r, 0)),
});

// the engine's jobs for the shared prewarm (prewarm.js): before ready only the shared modules; after ready a dock is fetched, the
// resident engine is spun and the player prepared when the seal is within the horizon. A failed prepare marks the place at once.
const asked = new Map(); // place -> { done }
registerEngineProvider({
  jobs: () => PLACES.filter((p) => engineOwns(p.id)),
  critical: () => true,
  step(place) {
    const dock = engineOwns(place);
    if (!dock) return "done";
    if (!getUi().ready) { prep.preload().catch(() => {}); return "idle"; }
    let a = asked.get(place);
    if (!a) {
      a = { done: false };
      asked.set(place, a);
      prep.prepare(dock).then(() => { a.done = true; }, (err) => { a.done = true; console.error(`[engine ${dock}] prepare failed`, err); markEngineFail(place); });
      return "busy";
    }
    return a.done ? "done" : "idle";
  },
  drop(place) { prep.drop(engineOwns(place) ?? place); asked.delete(place); },
});

export default function EngineCut() {
  const place = useUi((s) => s.cutscene);
  const failed = useUi((s) => Boolean(place && s.engineFail?.[place]));
  const dock = place && !failed ? engineOwns(place) : null;
  return dock ? <EngineRun key={place} place={place} dock={dock} /> : null;
}

// the ui's place keys the failure (what Cutscene.jsx reads); the registry, the prep and the engine key on the dock
export function markEngineFail(place) { setUi({ engineFail: { ...getUi().engineFail, [place]: true } }); }

function EngineRun({ place, dock }) {
  const hostRef = useRef(null), canvasRef = useRef(null);
  useEffect(() => {
    let dead = false, raf = 0, player = null, engine = null, hot = false, started = false, onResize = null;
    const mine = () => live.arrival.id === place;
    const onEnd = () => { if (mine()) live.arrival.len = 0; };
    const fail = (e) => {
      if (dead) return;
      console.error(`[engine ${dock}] falling back to the R3F move`, e);
      dead = true;
      clearTimeout(guard);
      live.engineSkip = null; live.engineCover = false;
      if (mine()) live.arrival.len = null;
      markEngineFail(place);
    };
    const guard = setTimeout(() => { if (!started) fail(new Error(`engine start timeout after ${ENGINE_START_MS} ms`)); }, ENGINE_START_MS);
    const size = () => { engine.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2)); player?.resize(window.innerWidth, window.innerHeight); };
    (async () => {
      try {
        const cut = await prep.prefetch(dock);
        if (dead) return;
        const taken = prep.take(dock);
        if (taken) {
          hot = true; engine = taken.engine; player = taken.player;
          canvasRef.current.style.display = "none";
          hostRef.current.appendChild(taken.canvas);
          player.o.onEnd = onEnd;
          size(); player.attachOverlay(hostRef.current);
        } else {
          if (fault() === "hang") await new Promise(() => {});
          engine = new mods.AnimeEngine(canvasRef.current, { style: cut.scene.style ?? "modern-anime" });
          player = new mods.CutscenePlayer(engine, cut.scene, cut.build, { seed: 7, onEnd });
          size(); player.init(); player.attachOverlay(hostRef.current);
          // linked into the composer's scene target so the program keys match its draws; the iris is still shut
          const gl = engine.renderer, target = engine.composer?.scene;
          gl.setRenderTarget(target?.isWebGLRenderTarget ? target : null);
          const compiled = gl.compileAsync(player.root, player.camera);
          gl.setRenderTarget(null);
          await compiled;
        }
        if (dead) return;
        onResize = size; window.addEventListener("resize", onResize);
        player.seek(0);
        if (mine()) live.arrival.len = Infinity;
        live.engineSkip = () => { player.t = Math.max(player.t, player.duration - IRIS_S); };
        let last = performance.now();
        const loop = (now) => {
          try {
            const dt = Math.min(0.1, (now - last) / 1000); last = now;
            player.update(dt);
            const r = Math.min(IRIS_MAX, (Math.min(player.t, player.duration - player.t) / IRIS_S) * IRIS_MAX);
            hostRef.current.style.clipPath = `circle(${r}% at 50% 50%)`;
            live.engineCover = r >= IRIS_MAX;
            if (!started) { started = true; clearTimeout(guard); }
          } catch (e) {
            fail(e);
            return;
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        fail(e);
      }
    })();
    return () => {
      dead = true;
      clearTimeout(guard);
      cancelAnimationFrame(raf);
      live.engineSkip = null; live.engineCover = false;
      if (onResize) window.removeEventListener("resize", onResize);
      if (hot) { try { prep.release(dock); } catch (e) { console.error(e); } }
      else {
        try { player?.dispose(); } catch (e) { console.error(e); }
        try { engine?.composer?.dispose(); engine?.renderer.dispose(); engine?.renderer.forceContextLoss(); } catch (e) { console.error(e); }
      }
    };
  }, [place, dock]);
  return (
    <div ref={hostRef} style={{ position: "fixed", inset: 0, zIndex: 1, background: "#000", overflow: "hidden", clipPath: "circle(0% at 50% 50%)", pointerEvents: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
