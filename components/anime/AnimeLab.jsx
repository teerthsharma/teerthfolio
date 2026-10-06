"use client";
// The anime engine lab: /lab/anime?demo=rimuru|loop|ainz|styles&style=<id>
// Extra query: t=<seconds> (start time), paused, tier=0..4 (pin), bias=raw|ao|random|t1, mask (shadow-mask view).
import { useEffect, useRef, useState } from "react";
import { AnimeEngine } from "../../lib/anime/engine.js";
import { DEMOS, DEMO_STYLE } from "../../lib/anime/demos.js";
import { STYLES, styleById } from "../../lib/anime/styles.js";

const LINKS = [["rimuru", "Rimuru"], ["loop", "The loop"], ["ainz", "Ainz"], ["styles", "All styles"]];

export default function AnimeLab() {
  const ref = useRef(null);
  const [ui, setUi] = useState({ demo: "rimuru", style: "modern-anime", caption: "", fps: "", adapter: "", tier: "" });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const demo = DEMOS[q.get("demo")] || q.get("demo") === "styles" ? q.get("demo") : "rimuru";
    const grid = demo === "styles";
    const style = q.get("style") ?? DEMO_STYLE[grid ? "board" : demo];
    const canvas = ref.current;
    const engine = new AnimeEngine(canvas, { style, tier: q.get("tier") !== null ? Number(q.get("tier")) : undefined });
    const d = DEMOS[grid ? "board" : demo](engine);
    if (q.get("bias")) for (const f of Object.values(d.figures ?? {})) f.userData.bias?.(q.get("bias"));
    // mask: the T6 harness view. R = the thresholded field h + bias (pre-smoothstep), G = band, B = character
    if (q.has("mask")) { const m = styleById(style); engine.setStyle({ ...m, fill: { ...m.fill, tone: 9, flat: 0 }, lines: { ...m.lines, on: 0, set: 0 }, post: { ...m.post, bloom: 0, diffuse: 0, shafts: 0, gain: [1, 1, 1], gamma: [1, 1, 1], sat: 1, split: [0, 0, 0], poster: 0, palette: [], paperAmt: 0, bleed: 0, misreg: 0, grain: 0, vig: 0, mono: 0 } }); }
    let t = Number(q.get("t") ?? 0), paused = q.has("paused"), last = performance.now(), raf = 0;
    const times = [];
    const size = () => engine.resize(window.innerWidth, window.innerHeight, Math.min(window.devicePixelRatio || 1, 2));
    size();
    window.addEventListener("resize", size);
    const cols = 4, rows = 2;
    const draw = (dt) => {
      if (!grid) {
        d.camera.aspect = window.innerWidth / window.innerHeight;
        d.camera.updateProjectionMatrix();
        d.update(t % d.duration, dt);
        engine.frame(d.scene, d.camera, t % d.duration, dt);
        return;
      }
      const W = canvas.width, H = canvas.height;
      const tw = Math.floor(W / cols), th = Math.floor(H / rows);
      engine.composer.setSize(tw, th);
      engine.shared.uRes.value.set(tw, th);
      d.camera.aspect = tw / th;
      d.camera.updateProjectionMatrix();
      STYLES.slice(0, cols * rows).forEach((s, i) => {
        engine.setStyle(s);
        d.update(t % d.duration, dt);
        const x = (i % cols) * tw, y = (rows - 1 - Math.floor(i / cols)) * th;
        engine.frame(d.scene, d.camera, t % d.duration, dt, [x, y, tw, th]);
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
      engine, demo: d,
      seek(s) { t = s; draw(0); },
      pause() { paused = true; }, play() { paused = false; },
      bias(mode) { for (const f of Object.values(d.figures ?? {})) f.userData.bias?.(mode); draw(0); },
      stats() { const s = sorted(); return { adapter: engine.adapter, tier: engine.tier, dpr: engine.dpr, buffer: [engine.composer.w, engine.composer.h], p50: s[Math.floor(s.length * 0.5)], p95: s[Math.floor(s.length * 0.95)], n: s.length, governor: engine.governor.log, bakeMs: d.bakeMs }; },
      reset() { times.length = 0; },
    };
    const iv = setInterval(() => {
      const s = sorted();
      setUi({ demo, style: engine.style.id, caption: grid ? "" : d.caption(t % d.duration), fps: s.length ? `${s[Math.floor(s.length / 2)].toFixed(1)} ms` : "", adapter: engine.adapter, tier: `T${engine.tier}` });
    }, 250);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); window.removeEventListener("resize", size); engine.composer.dispose(); engine.renderer.dispose(); };
  }, []);
  const st = styleById(ui.style);
  const grid = ui.demo === "styles";
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden", fontFamily: "var(--font, system-ui)" }}>
      <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
      <nav style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {LINKS.map(([id, label]) => (
          <a key={id} href={`?demo=${id}`} style={chip(ui.demo === id)}>{label}</a>
        ))}
        {!grid && (
          <select aria-label="Style" value={ui.style} onChange={(e) => { window.location.search = `?demo=${ui.demo}&style=${e.target.value}`; }} style={{ ...chip(false), border: "none" }}>
            {STYLES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <span style={{ ...chip(false), opacity: 0.75 }} data-perf>{ui.tier} · {ui.fps}</span>
      </nav>
      {grid ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(2, 1fr)", pointerEvents: "none" }}>
          {STYLES.slice(0, 8).map((s) => (
            <a key={s.id} href={`?demo=rimuru&style=${s.id}`} style={{ alignSelf: "end", justifySelf: "center", marginBottom: 10, pointerEvents: "auto", ...caption, fontSize: 15 }}>{s.name}</a>
          ))}
        </div>
      ) : (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "7%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
          {ui.caption && <div style={{ ...caption, fontSize: 22 }}>{ui.caption}</div>}
          <div style={{ ...caption, fontSize: 14, opacity: 0.9 }}>Style: {st.name}</div>
        </div>
      )}
    </div>
  );
}

const chip = (on) => ({ padding: "6px 12px", borderRadius: 999, background: on ? "#fff" : "rgba(10,12,30,.72)", color: on ? "#111" : "#fff", fontSize: 13, textDecoration: "none", fontWeight: 600 });
const caption = { padding: "6px 14px", borderRadius: 8, background: "rgba(8,10,24,.78)", color: "#fff", fontWeight: 700, letterSpacing: 0.2, textDecoration: "none" };
