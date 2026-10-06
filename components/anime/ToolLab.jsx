"use client";
// One detachable shader tool alone (/lab/anime?tool=<name>) or every tool in a grid (?tool=all):
// each panel is the tool's GLSL demo on a fullscreen quad, linear colour shown in sRGB.
import { useEffect, useRef, useState } from "react";
import { DataTexture, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, RepeatWrapping, Scene, ShaderMaterial, WebGLRenderer } from "three";
import { TOOLS, glslFor, tool, uniformsFor } from "../../lib/anime/tools/index.js";

// a 256x256 test image for texture tools: soft colour fields with hard-edged blocks and fine noise
function testImage() {
  const N = 256, d = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4, n = Math.random() * 60 - 30, blk = ((x >> 5) + (y >> 5)) & 1;
    d[i] = Math.max(0, Math.min(255, 120 + 100 * Math.sin(x / 30) + n + blk * 40)); d[i + 1] = Math.max(0, Math.min(255, 90 + 80 * Math.cos(y / 25) + n)); d[i + 2] = Math.max(0, Math.min(255, 140 + n - blk * 60)); d[i + 3] = 255;
  }
  const t = new DataTexture(d, N, N); t.wrapS = t.wrapT = RepeatWrapping; t.minFilter = t.magFilter = LinearFilter; t.needsUpdate = true;
  return t;
}

export default function ToolLab({ name }) {
  const ref = useRef(null);
  const [err, setErr] = useState("");
  const list = (name === "all" ? TOOLS : [tool(name)]).filter((t) => t.demo);
  useEffect(() => {
    const r = new WebGLRenderer({ canvas: ref.current, antialias: false });
    const cam = new OrthographicCamera(-1, 1, 1, -1, 0, 1), tex = testImage();
    const panels = list.map((t) => {
      const uniforms = { uTime: { value: 0 }, uAspect: { value: 1.44 }, ...uniformsFor([t.name]), ...(t.demoTex ? { tSrc: { value: tex } } : {}) };
      const m = new ShaderMaterial({ uniforms, vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
        fragmentShader: `uniform float uTime; uniform float uAspect; varying vec2 vUv; ${glslFor([t.name])} ${t.demo}
          void main() { vec3 c = demo(vec2(vUv.x * uAspect, vUv.y), uTime); gl_FragColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0); }` });
      const s = new Scene(); s.add(new Mesh(new PlaneGeometry(2, 2), m));
      return { t, s, m };
    });
    const cols = Math.ceil(Math.sqrt(list.length)), rows = Math.ceil(list.length / cols);
    let raf = 0, t0 = performance.now(), paused = new URLSearchParams(window.location.search).has("paused"), T = 0;
    const draw = () => {
      const W = window.innerWidth, H = window.innerHeight; r.setSize(W, H, false); r.setScissorTest(true);
      const w = Math.floor(W / cols), h = Math.floor(H / rows);
      panels.forEach((P, i) => { const x = (i % cols) * w, y = H - (Math.floor(i / cols) + 1) * h;
        P.m.uniforms.uTime.value = T; P.m.uniforms.uAspect.value = w / h; r.setViewport(x, y, w, h); r.setScissor(x, y, w, h); r.render(P.s, cam); });
    };
    const loop = (now) => { if (!paused) T = (now - t0) / 1000; draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    window.__anime = { seek(s) { T = s; paused = true; draw(); }, stats: () => ({ adapter: r.getContext().getParameter(r.getContext().VERSION), tools: list.map((t) => t.name) }), reset() {} };
    const bad = panels.filter((P) => { const prog = r.info.programs?.find((p) => p.name === P.m.name); return prog && prog.diagnostics && !prog.diagnostics.runnable; });
    if (bad.length) setErr(bad.map((P) => P.t.name).join(", "));
    return () => { cancelAnimationFrame(raf); r.dispose(); };
  }, [name]);
  const cols = Math.ceil(Math.sqrt(list.length)), rows = Math.ceil(list.length / cols);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", fontFamily: "var(--font, system-ui)" }}>
      <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, pointerEvents: "none" }}>
        {list.map((t) => <div key={t.name} style={{ alignSelf: "end", justifySelf: "start", margin: 8, padding: "4px 10px", borderRadius: 6, background: "rgba(8,10,24,.78)", color: "#fff", fontSize: 12, maxWidth: "90%" }}><b>{t.name}</b> · {t.doc}</div>)}
      </div>
      {err && <div style={{ position: "absolute", top: 8, left: 8, color: "#f66" }}>failed: {err}</div>}
    </div>
  );
}
