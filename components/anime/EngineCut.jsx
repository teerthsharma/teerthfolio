"use client";
// The engine's host on the island (engine-design.md section 2): a dock engineOwns() routes plays its first arrival here,
// over the island canvas under an iris. Once playing, the player owns the arrival (live.arrival.len, onEnd, and the HUD's
// Skip through live.engineSkip); any failure marks ui.engineFail and Cutscene.jsx mounts the approved R3F move.

import { useEffect, useRef } from "react";
import { engineOwns } from "../../lib/anime/live.js";
import { getUi, live, setUi, useUi } from "../../lib/world/store";

const IRIS_S = 0.4;
const IRIS_MAX = 75;

export default function EngineCut() {
  const id = useUi((s) => s.cutscene);
  const failed = useUi((s) => Boolean(id && s.engineFail?.[id]));
  const dock = id && !failed ? engineOwns(id) : null;
  return dock ? <EngineRun key={dock} id={dock} /> : null;
}

function EngineRun({ id }) {
  const hostRef = useRef(null), canvasRef = useRef(null);
  useEffect(() => {
    let dead = false, raf = 0, player = null, engine = null, onResize = null;
    const mine = () => live.arrival.id === id;
    const fail = (e) => {
      console.error(`[engine ${id}] falling back to the R3F move`, e);
      live.engineSkip = null;
      if (mine()) live.arrival.len = null;
      setUi({ engineFail: { ...getUi().engineFail, [id]: true } });
    };
    (async () => {
      try {
        const reg = await import("../../lib/anime/cutscenes/index.js");
        const { CutscenePlayer } = await import("../../lib/anime/cutscenes/framework.js");
        const { AnimeEngine } = await import("../../lib/anime/engine.js");
        const cut = await reg.loadCut(id);
        if (dead) return;
        if (!cut.scene || !cut.build) throw new Error(cut.error?.message ?? `no cutscene "${id}"`);
        engine = new AnimeEngine(canvasRef.current, { style: cut.scene.style ?? "modern-anime" });
        const size = () => { engine.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2)); player?.resize(window.innerWidth, window.innerHeight); };
        player = new CutscenePlayer(engine, cut.scene, cut.build, { seed: 7, onEnd: () => { if (mine()) live.arrival.len = 0; } });
        size(); player.init(); player.attachOverlay(hostRef.current);
        onResize = size; window.addEventListener("resize", onResize);
        // linked into the composer's scene target so the program keys match its draws; the iris is still shut
        const gl = engine.renderer, target = engine.composer?.scene;
        gl.setRenderTarget(target?.isWebGLRenderTarget ? target : null);
        const compiled = gl.compileAsync(player.root, player.camera);
        gl.setRenderTarget(null);
        await compiled;
        if (dead) return;
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
          } catch (e) {
            if (!dead) fail(e);
            return;
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        if (!dead) fail(e);
      }
    })();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      live.engineSkip = null;
      if (onResize) window.removeEventListener("resize", onResize);
      try { player?.dispose(); } catch (e) { console.error(e); }
      try { engine?.composer?.dispose(); engine?.renderer.dispose(); engine?.renderer.forceContextLoss(); } catch (e) { console.error(e); }
    };
  }, [id]);
  return (
    <div ref={hostRef} style={{ position: "fixed", inset: 0, zIndex: 1, background: "#000", overflow: "hidden", clipPath: "circle(0% at 50% 50%)", pointerEvents: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
