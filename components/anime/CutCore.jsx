"use client";
// The cutscene lab player, registry-free:   ...?t=<s>[&paused][&tier=0..4][&seed=n][&nolaw]
//   cut     the dock id (lib/anime/cutscenes/index.js DOCKS)
//   t       start the clock at this second; with &paused the frame at t is held (scrub from the console: window.__cut.seek(s))
// Every cutscene runs inside its own error boundary and its own load: a dock that throws shows its error here and the
// nav still works; no other dock is affected. Layers are isolated again inside build.js (composeLayers).
import React, { useEffect, useRef, useState } from "react";
import { AnimeEngine } from "../../lib/anime/engine.js";

// ?view=: full (default), flat (material.js reads the shared uFlat), notan and ids (post.js final pass; 1 is reserved for flat),
// lines (the line buffers) and shadow (the cast-shadow term). ?off=lines,shadow,satsuei,lens,cel skips those passes.
const VIEW = { full: 0, flat: 1, notan: 2, ids: 3, lines: 4, shadow: 5 };

class CutBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error(`[cut ${this.props.id}] crashed:`, err); }
  render() {
    if (this.state.err) return <Failure id={this.props.id} title="the cutscene crashed" detail={String(this.state.err?.stack ?? this.state.err)} />;
    return this.props.children;
  }
}

function Failure({ id, title, detail }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b0b12", color: "#ffd7d7", padding: 24, overflow: "auto", fontFamily: "ui-monospace, Consolas, monospace" }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{id}: {title}</div>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{detail}</pre>
      <Nav active={id} />
    </div>
  );
}

function Nav({ active, docks = null, extra = null }) {
  const [list, setList] = useState(docks);
  useEffect(() => { if (docks && !list) setList(docks); }, [docks, list]);
  return (
    <nav style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", zIndex: 20, pointerEvents: "none" }}>
      {(list ?? []).map((d) => <a key={d} href={`?cut=${d}`} style={{ ...chip(d === active), pointerEvents: "auto" }}>{d}</a>)}
      {extra}
    </nav>
  );
}

// load() -> { scene, build, error, docks? }: the caller decides where the cutscene comes from, so this file imports no registry
export default function CutCore({ id, load }) {
  return <CutBoundary key={id} id={id}><CutRun id={id} load={load} /></CutBoundary>;
}

function CutRun({ id, load }) {
  const hostRef = useRef(null), canvasRef = useRef(null);
  const [state, setState] = useState({ phase: "loading", fail: null, issues: [], errors: [], docks: null, perf: "" });
  useEffect(() => {
    let dead = false, raf = 0, iv = 0, player = null, engine = null, onResize = null, canvas = null, unpublish = null;
    (async () => {
      const cut = await load().catch((e) => ({ error: { file: "load", message: String(e?.message ?? e) } }));
      const reg = { DOCKS: cut.docks ?? null };
      if (dead) return;
      if (!cut.scene || !cut.build) { setState((s) => ({ ...s, phase: "fail", docks: reg.DOCKS, fail: { title: `could not load ${cut.error?.file ?? id}`, detail: cut.error?.message ?? "unknown" } })); return; }
      const { CutscenePlayer } = await import("../../lib/anime/cutscenes/framework.js");
      if (dead) return;
      const q = new URLSearchParams(window.location.search);
      try {
        engine = new AnimeEngine(canvasRef.current, { style: cut.scene.style ?? "modern-anime", tier: q.get("tier") !== null ? Number(q.get("tier")) : undefined, off: (q.get("off") ?? "").split(",").filter(Boolean) });
        const size = () => { engine.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2)); player?.resize(window.innerWidth, window.innerHeight); };
        player = new CutscenePlayer(engine, cut.scene, cut.build, { seed: Number(q.get("seed") ?? 7), onSkip: () => player.seek(player.duration) });
        const view = q.get("view") ?? "full";
        engine.composer.u.uView.value = VIEW[view] ?? 0;
        engine.composer.u.uNotan.value.set(Number(q.get("na") ?? 0.12), Number(q.get("nb") ?? 0.40));
        if (view === "flat" && engine.shared.uFlat) engine.shared.uFlat.value = 1;
        if (q.has("gpu")) engine.composer.gpu = { ms: {} };
        size(); player.init(); player.attachOverlay(hostRef.current);
        onResize = size; window.addEventListener("resize", onResize);
      } catch (e) { console.error(e); setState((s) => ({ ...s, phase: "fail", docks: reg.DOCKS, fail: { title: "init failed", detail: String(e?.stack ?? e) } })); return; }
      let paused = q.has("paused"), last = performance.now(), frames = 0;
      const t0 = Number(q.get("t") ?? 0);
      player.seek(t0);
      const times = [];
      // the engine canvas only (no DOM overlay); the renderer has no preserveDrawingBuffer, so draw and read in one task
      const snap = () => { const c = canvasRef.current; return { w: c.width, h: c.height, png: c.toDataURL("image/png") }; };
      const api = {
        player, engine, seek: (s) => player.seek(s), pause: () => { paused = true; }, play: () => { paused = false; },
        grab: () => { player.draw(player.t, 0); return snap(); },
        grabIds: () => { const u = engine.composer.u.uView, prev = u.value; u.value = VIEW.ids; player.draw(player.t, 0); const out = snap(); u.value = prev; player.draw(player.t, 0); return out; },
        stats: () => { const s = [...times].sort((a, b) => a - b); return { adapter: engine.adapter, tier: engine.tier, p50: s[Math.floor(s.length / 2)], p95: s[Math.floor(s.length * 0.95)], n: s.length, gpu: engine.composer.gpu && Object.fromEntries(Object.entries(engine.composer.gpu.ms).map(([k, v]) => [k, +v.toFixed(2)])) }; },
      };
      // captures wait on window.__cut: it appears once two frames reached a live canvas, and goes with the run or the context
      const gl = engine.renderer.getContext();
      canvas = canvasRef.current;
      unpublish = () => { if (window.__cut === api) delete window.__cut; };
      canvas.addEventListener("webglcontextlost", unpublish);
      const loop = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        try { if (!paused) player.update(dt); else player.draw(player.t, 0); } catch (e) { console.error(e); setState((s) => ({ ...s, phase: "fail", fail: { title: "a frame threw", detail: String(e?.stack ?? e) } })); return; }
        times.push(dt * 1000); if (times.length > 240) times.shift();
        if (++frames === 2 && !gl.isContextLost()) window.__cut = api;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      setState({ phase: "run", fail: null, issues: player.director.report(), errors: player.errors, docks: reg.DOCKS, perf: "" });
      iv = setInterval(() => { const s = [...times].sort((a, b) => a - b); setState((st) => ({ ...st, perf: s.length ? `T${engine.tier} ${s[Math.floor(s.length / 2)].toFixed(1)} ms  t=${player.t.toFixed(1)}s` : "" })); }, 400);
    })();
    return () => { dead = true; cancelAnimationFrame(raf); clearInterval(iv); if (onResize) window.removeEventListener("resize", onResize); if (unpublish) { unpublish(); canvas.removeEventListener("webglcontextlost", unpublish); } try { player?.dispose(); engine?.renderer.dispose(); } catch (e) { console.error(e); } };
  }, [id, load]);
  if (state.phase === "fail") return <Failure id={id} title={state.fail.title} detail={state.fail.detail} />;
  return (
    <div ref={hostRef} style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", fontFamily: "var(--font, system-ui)" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <Nav active={id} docks={state.docks} extra={<span style={{ ...chip(false), opacity: 0.8, pointerEvents: "auto" }}>{state.perf}{state.issues.length ? ` · law: ${state.issues.length} issue(s)` : ""}{state.errors.length ? ` · ${state.errors.length} layer error(s)` : ""}</span>} />
    </div>
  );
}

const chip = (on) => ({ padding: "4px 9px", borderRadius: 999, background: on ? "#fff" : "rgba(10,12,30,.72)", color: on ? "#111" : "#fff", fontSize: 11, textDecoration: "none", fontWeight: 600 });
