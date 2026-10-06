"use client";
// The cutscene lab:   /lab/anime?cut=<dock>&t=<s>[&paused][&tier=0..4][&seed=n][&nolaw]
//   cut     the dock id (lib/anime/cutscenes/index.js DOCKS)
//   t       start the clock at this second; with &paused the frame at t is held (scrub from the console: window.__cut.seek(s))
// Every cutscene runs inside its own error boundary and its own load: a dock that throws shows its error here and the
// nav still works; no other dock is affected. Layers are isolated again inside build.js (composeLayers).
import React, { useEffect, useRef, useState } from "react";
import { AnimeEngine } from "../../lib/anime/engine.js";

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
  useEffect(() => { if (!list) import("../../lib/anime/cutscenes/index.js").then((m) => setList(m.DOCKS)).catch(() => setList([])); }, [list]);
  return (
    <nav style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", zIndex: 20, pointerEvents: "none" }}>
      {(list ?? []).map((d) => <a key={d} href={`?cut=${d}`} style={{ ...chip(d === active), pointerEvents: "auto" }}>{d}</a>)}
      {extra}
    </nav>
  );
}

export default function CutLab({ id }) {
  return <CutBoundary key={id} id={id}><CutRun id={id} /></CutBoundary>;
}

function CutRun({ id }) {
  const hostRef = useRef(null), canvasRef = useRef(null);
  const [state, setState] = useState({ phase: "loading", fail: null, issues: [], errors: [], docks: null, perf: "" });
  useEffect(() => {
    let dead = false, raf = 0, iv = 0, player = null, engine = null, onResize = null;
    (async () => {
      let reg;
      try { reg = await import("../../lib/anime/cutscenes/index.js"); } catch (e) { setState((s) => ({ ...s, phase: "fail", fail: { title: "the registry failed to load", detail: String(e?.stack ?? e) } })); return; }
      const cut = await reg.loadCut(id).catch((e) => ({ error: { file: "registry", message: String(e?.message ?? e) } }));
      if (dead) return;
      if (!cut.scene || !cut.build) { setState((s) => ({ ...s, phase: "fail", docks: reg.DOCKS, fail: { title: `could not load ${cut.error?.file ?? id}`, detail: cut.error?.message ?? "unknown" } })); return; }
      const { CutscenePlayer } = await import("../../lib/anime/cutscenes/framework.js");
      const q = new URLSearchParams(window.location.search);
      try {
        engine = new AnimeEngine(canvasRef.current, { style: cut.scene.style ?? "modern-anime", tier: q.get("tier") !== null ? Number(q.get("tier")) : undefined });
        const size = () => { engine.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2)); player?.resize(window.innerWidth, window.innerHeight); };
        player = new CutscenePlayer(engine, cut.scene, cut.build, { seed: Number(q.get("seed") ?? 7), onSkip: () => player.seek(player.duration) });
        size(); player.init(); player.attachOverlay(hostRef.current);
        onResize = size; window.addEventListener("resize", onResize);
      } catch (e) { console.error(e); setState((s) => ({ ...s, phase: "fail", docks: reg.DOCKS, fail: { title: "init failed", detail: String(e?.stack ?? e) } })); return; }
      let paused = q.has("paused"), last = performance.now();
      const t0 = Number(q.get("t") ?? 0);
      player.seek(t0);
      const times = [];
      const loop = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        try { if (!paused) player.update(dt); else player.draw(player.t, 0); } catch (e) { console.error(e); setState((s) => ({ ...s, phase: "fail", fail: { title: "a frame threw", detail: String(e?.stack ?? e) } })); return; }
        times.push(dt * 1000); if (times.length > 240) times.shift();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      window.__cut = {
        player, engine, seek: (s) => player.seek(s), pause: () => { paused = true; }, play: () => { paused = false; },
        stats: () => { const s = [...times].sort((a, b) => a - b); return { adapter: engine.adapter, tier: engine.tier, p50: s[Math.floor(s.length / 2)], p95: s[Math.floor(s.length * 0.95)], n: s.length }; },
      };
      setState({ phase: "run", fail: null, issues: player.director.report(), errors: player.errors, docks: reg.DOCKS, perf: "" });
      iv = setInterval(() => { const s = [...times].sort((a, b) => a - b); setState((st) => ({ ...st, perf: s.length ? `T${engine.tier} ${s[Math.floor(s.length / 2)].toFixed(1)} ms  t=${player.t.toFixed(1)}s` : "" })); }, 400);
    })();
    return () => { dead = true; cancelAnimationFrame(raf); clearInterval(iv); if (onResize) window.removeEventListener("resize", onResize); try { player?.dispose(); engine?.renderer.dispose(); } catch (e) { console.error(e); } };
  }, [id]);
  if (state.phase === "fail") return <Failure id={id} title={state.fail.title} detail={state.fail.detail} />;
  return (
    <div ref={hostRef} style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", fontFamily: "var(--font, system-ui)" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <Nav active={id} docks={state.docks} extra={<span style={{ ...chip(false), opacity: 0.8, pointerEvents: "auto" }}>{state.perf}{state.issues.length ? ` · law: ${state.issues.length} issue(s)` : ""}{state.errors.length ? ` · ${state.errors.length} layer error(s)` : ""}</span>} />
    </div>
  );
}

const chip = (on) => ({ padding: "4px 9px", borderRadius: 999, background: on ? "#fff" : "rgba(10,12,30,.72)", color: on ? "#111" : "#fff", fontSize: 11, textDecoration: "none", fontWeight: 600 });
