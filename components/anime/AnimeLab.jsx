"use client";
// The anime engine lab: worlds only, no characters.
//   /lab/anime?demo=world&style=<id>   one world, full frame
//   /lab/anime (any other demo)        the named grid of every world
// Extra query: t=<seconds>, paused, tier=0..4 (pin), fixed (no governor).
import { useEffect, useRef, useState } from "react";
import { AnimeEngine } from "../../lib/anime/engine.js";
import { Composer } from "../../lib/anime/post.js";
import { WORLDS, worldById } from "../../lib/anime/worlds.js";
import { styleById } from "../../lib/anime/styles.js";

// a world is named after its anime only once verified beside its reference
const label = (w) => `${w.anime}${w.verified ? "" : " · WIP"}`;
// fewest empty cells first, then the largest tile
const gridDims = (n, aspect) => { let best = [n, 1], bs = -1e9; for (let c = 1; c <= n; c++) { const r = Math.ceil(n / c), w = Math.min(1 / c, aspect / r) - (r * c - n); if (w > bs) { bs = w; best = [c, r]; } } return best; };

export default function AnimeLab() {
  const ref = useRef(null);
  const [ui, setUi] = useState({ single: null, fps: "", tier: "", grid: [1, 1] });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const single = q.get("demo") === "world" ? worldById(q.get("style")) : null;
    const list = single ? [single] : WORLDS;
    const canvas = ref.current;
    const engine = new AnimeEngine(canvas, { style: list[0].id, tier: q.get("tier") !== null ? Number(q.get("tier")) : undefined });
    // one composer per panel, so each world keeps its own plate
    const panels = list.map((w, i) => {
      if (i > 0) engine.composer = new Composer(engine.renderer, { tier: engine.tier, samples: engine.tier >= 3 ? 4 : 0 });
      const c = engine.composer;
      c.plates = true;
      engine.setStyle(w.id);
      // each panel is isolated: a world that throws is skipped and labelled, the rest still draw
      try { return { w, c, d: w.build(engine, { move: q.has("move") }) }; } catch (e) { console.error(`world ${w.id}:`, e); return { w, c, d: null, err: String(e) }; }
    });
    let t = Number(q.get("t") ?? 0), paused = q.has("paused"), last = performance.now(), raf = 0;
    const times = [];
    const size = () => engine.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
    size();
    window.addEventListener("resize", size);
    const [cols, rows] = single ? [1, 1] : gridDims(list.length, (window.innerWidth / window.innerHeight) * (820 / 1180));
    const draw = (dt) => {
      const W = canvas.width, H = canvas.height, tw = Math.floor(W / cols), th = Math.floor(H / rows);
      panels.forEach((P, i) => {
        const { w, c, d } = P;
        if (!d) return;
        try {
        engine.composer = c;
        c.setSize(tw, th);
        engine.shared.uRes.value.set(tw, th);
        engine.setStyle(w.id);
        d.apply();
        d.camera.aspect = tw / th;
        d.camera.updateProjectionMatrix();
        d.update(t, dt);
        const x = (i % cols) * tw, y = (rows - 1 - Math.floor(i / cols)) * th;
        engine.frame(d.scene, d.camera, t, dt, single ? null : [x, y, tw, th]);
        } catch (e) { console.error(`world ${w.id}:`, e); P.d = null; P.err = String(e); }
      });
    };
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!paused) t += dt;
      draw(dt);
      times.push(dt * 1000);
      if (times.length > 240) times.shift();
      if (!q.has("fixed") && !paused) engine.observe(dt * 1000, now / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const sorted = () => [...times].sort((a, b) => a - b);
    window.__anime = {
      engine, panels,
      seek(s) { t = s; draw(0); },
      pause() { paused = true; }, play() { paused = false; },
      stats() { const s = sorted(); return { adapter: engine.adapter, tier: engine.tier, dpr: engine.dpr, buffer: [engine.composer.w, engine.composer.h], p50: s[Math.floor(s.length * 0.5)], p95: s[Math.floor(s.length * 0.95)], n: s.length, governor: engine.governor.log }; },
      reset() { times.length = 0; },
    };
    const iv = setInterval(() => { const s = sorted(); setUi({ errs: Object.fromEntries(panels.filter((p) => p.err).map((p) => [p.w.id, p.err])), single, fps: s.length ? `${s[Math.floor(s.length / 2)].toFixed(1)} ms` : "", tier: `T${engine.tier}`, grid: [cols, rows] }); }, 250);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); window.removeEventListener("resize", size); for (const p of panels) p.c.dispose(); engine.renderer.dispose(); };
  }, []);
  const panels = ui.single ? [ui.single] : WORLDS;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", fontFamily: "var(--font, system-ui)" }}>
      <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
      <nav style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <a href="?demo=worlds" style={chip(!ui.single)}>All worlds</a>
        {WORLDS.map((w) => <a key={w.id} href={`?demo=world&style=${w.id}`} style={chip(ui.single?.id === w.id)}>{label(w)}</a>)}
        <span style={{ ...chip(false), opacity: 0.75 }} data-perf>{ui.tier} · {ui.fps}</span>
      </nav>
      {!ui.single && (
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${ui.grid[0]}, 1fr)`, gridTemplateRows: `repeat(${ui.grid[1]}, 1fr)`, pointerEvents: "none" }}>
          {panels.map((w) => <a key={w.id} href={`?demo=world&style=${w.id}`} style={{ alignSelf: "end", justifySelf: "center", marginBottom: 10, pointerEvents: "auto", ...caption, fontSize: 15 }}>{label(w)}{ui.errs?.[w.id] ? " · failed: " + ui.errs[w.id].slice(0, 80) : ""}</a>)}
        </div>
      )}
      {ui.single && <div style={{ position: "absolute", left: 0, right: 0, bottom: "5%", display: "flex", justifyContent: "center", pointerEvents: "none" }}><div style={{ ...caption, fontSize: 14 }}>{label(ui.single)} · {styleById(ui.single.id).name}</div></div>}
    </div>
  );
}

const chip = (on) => ({ padding: "6px 12px", borderRadius: 999, background: on ? "#fff" : "rgba(10,12,30,.72)", color: on ? "#111" : "#fff", fontSize: 13, textDecoration: "none", fontWeight: 600 });
const caption = { padding: "6px 14px", borderRadius: 8, background: "rgba(8,10,24,.78)", color: "#fff", fontWeight: 700, letterSpacing: 0.2, textDecoration: "none" };
