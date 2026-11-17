// THE FRAME LAW as pure functions of the clock (no THREE, no DOM); framework.js writes the results into uniforms.
// Colours are sRGB triples in 0..1 (the tail of the composite works in display space). Schema: CONTRACT.md "Frame law".
export const EPS = 1e-6;
export const OPEN = 1.4; // iris radius, in frame heights, at and above which the mask is off
export const MAX_SHAKE = 0.04; // frame heights
export const FRAME_BEATS = ["iris", "flat", "invert", "ones", "freeze", "grade", "box", "shake"];

const c01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, k) => a + (b - a) * k;
export const frameIndex = (t, fps) => Math.floor(t * fps + EPS);
export const step = (t, fps) => frameIndex(t, fps) / fps;
export const rgb = (h) => { const n = parseInt(String(h).slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

const E = {
  smooth: (x) => x * x * (3 - 2 * x), linear: (x) => x, in: (x) => x ** 3, out: (x) => 1 - (1 - x) ** 3, snap: (x) => 1 - (1 - x) ** 5,
  inquad: (x) => x * x, outquad: (x) => 1 - (1 - x) ** 2, inoutsine: (x) => 0.5 - 0.5 * Math.cos(Math.PI * x),
  outback: (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2, cut: () => 1,
};
const ALIAS = { incubic: "in", outcubic: "out", smoothstep: "smooth", inout: "smooth", inoutcubic: "smooth", sine: "inoutsine" };
export const EASE_NAMES = Object.keys(E);
export const easeOf = (name = "smooth") => { const k = String(name).replace(/^ease/i, "").toLowerCase(), f = E[ALIAS[k] ?? k] ?? E.smooth; return (x) => f(c01(x)); };

// a beat belongs to the frame law only in its reserved FORM, so an older free cue of the same name stays a free cue
export function isLaw(b) {
  if (b.name === "iris") return typeof b.to === "number";
  if (b.name === "freeze") return Array.isArray(b.layers);
  if (b.name === "grade") return !!b.split || typeof b.mono === "number" || typeof b.amt === "number";
  return FRAME_BEATS.includes(b.name);
}
export function normBeat(b) {
  if (!isLaw(b)) return { dur: 0.5, ...b };
  const n = b.name;
  if (n === "flat" || n === "invert") return { ...b, dur: b.dur ?? (b.frames ?? 1) / 24 + (b.hold ?? 0) };
  if (n === "iris") return { dur: 1, ...b };
  if (n === "box") return { ...b, dur: (b.slide ?? 0) / 24 };
  if (n === "shake") { const tau = b.tau ?? 0.18, last = b.schedule?.length ? Math.max(...b.schedule.map((s) => s.t)) : b.t; return { ...b, tau, dur: b.dur ?? last - b.t + 5 * tau }; }
  return { dur: 0.5, ...b };
}

export function compileLaw(scene, fps = scene.fps ?? 12) {
  const F = scene.frame ?? {};
  const beats = (scene.beats ?? []).filter(isLaw).map(normBeat).sort((a, b) => a.t - b.t);
  const of = (n) => beats.filter((b) => b.name === n);
  const ones = of("ones"), freeze = of("freeze"), iris = of("iris"), flat = of("flat"), invert = of("invert"), grade = of("grade"), shake = of("shake");
  const boxes = [...(F.box ? [{ t: 0, on: true, slide: F.box.slide ?? 0, ratio: F.box.ratio }] : []), ...of("box")];
  const win = (b, t) => { const a = t - b.t + EPS / 24; return a >= 0 && a < b.dur; };
  const layers = (b) => b.layers ?? ["cast", "fx"];
  const base = F.split ? { sh: rgb(F.split.shadow), hi: rgb(F.split.high), amt: F.split.amt ?? 0.35, mono: 0 } : { sh: [0, 0, 0], hi: [1, 1, 1], amt: 0, mono: 0 };
  const over = (G, g) => ({
    sh: g.split ? rgb(g.split.shadow) : G.sh, hi: g.split ? rgb(g.split.high) : G.hi,
    amt: g.amt ?? g.split?.amt ?? (g.split && !G.amt ? 0.35 : G.amt), mono: g.mono ?? G.mono,
  });
  const mix = (A, B, w) => (w >= 1 ? B : w <= 0 ? A : {
    sh: A.amt ? A.sh.map((x, i) => lerp(x, B.sh[i], w)) : B.sh, hi: A.amt ? A.hi.map((x, i) => lerp(x, B.hi[i], w)) : B.hi,
    amt: lerp(A.amt, B.amt, w), mono: lerp(A.mono, B.mono, w),
  });
  const law = {
    fps, frame: F, beats, has: beats.length > 0 || !!scene.frame,
    onesAt: (t) => ones.some((b) => win(b, t)),
    rate: (name, t) => (ones.some((b) => win(b, t) && layers(b).includes(name)) ? 24 : fps),
    frozen: (name, t) => freeze.some((b) => win(b, t) && b.layers.includes(name)),
    time(name, t) { const f = freeze.find((b) => win(b, t) && b.layers.includes(name)); return step(f ? f.t : t, law.rate(name, t)); },
    box(t, aspect) {
      if (!boxes.length) return null;
      let v = 0, ratio = F.box?.ratio ?? 2.39;
      for (const e of boxes) {
        if (e.t > t + EPS) break;
        const k = e.slide > 0 ? c01(frameIndex(t - e.t, 24) / e.slide) : 1;
        v = lerp(v, e.on === false ? 0 : 1, k); ratio = e.ratio ?? ratio;
      }
      return Math.max(0, (1 - aspect / ratio) / 2) * v;
    },
    // the latest iris beat: { r, unit, at, ring, ringCol } or null (no beat yet, or fully open)
    iris(t) {
      let i = -1;
      for (let j = 0; j < iris.length; j++) if (iris[j].t <= t + EPS) i = j;
      if (i < 0) return null;
      const b = iris[i], from = b.from ?? iris[i - 1]?.to ?? OPEN;
      const r = lerp(from, b.to, easeOf(b.ease)((step(t, b.ones ? 24 : fps) - b.t) / Math.max(EPS, b.dur)));
      return b.unit !== "seal" && r >= OPEN - EPS ? null : { r, unit: b.unit ?? "h", at: b.at ?? "seal", ring: b.ring ?? 0, ringCol: b.ringCol ?? "#f4ecd8" };
    },
    flat(t) { const b = flat.findLast((x) => win(x, t)); return b ? { col: b.col ?? "#ebebeb", bypass: b.bypass !== false, paint: b.bars === "paint" } : null; },
    // 0 off, 1 the graded frame inverted, 2 the ungraded frame inverted (bypass, the default)
    invert(t) { const b = invert.findLast((x) => win(x, t)); return b ? (b.bypass === false ? 1 : 2) : 0; },
    // frame.split, then the shot's grade (a hard swap on the cut), then every grade beat in time order, blended in and out
    grade(t, shotGrade = null) {
      let G = shotGrade ? over(base, shotGrade) : base;
      for (const b of grade) {
        if (b.t > t + EPS) break;
        const e = easeOf(b.ease), tin = b.in ?? 0.25, tout = b.out ?? tin, end = b.t + b.dur;
        const wi = tin > 0 ? e((t - b.t) / tin) : 1, wo = b.hold ? 1 : t >= end ? 0 : tout > 0 ? e((end - t) / tout) : 1;
        G = mix(G, over(G, b), wi * wo);
      }
      return G;
    },
    shake(t, out = [0, 0, 0]) {
      out[0] = out[1] = out[2] = 0;
      for (const b of shake) {
        const hz = b.hz ?? 12, dx = b.dx ?? 0.25, seed = b.seed ?? 0;
        const imps = b.schedule ?? [b];
        for (let i = 0; i < imps.length; i++) {
          const a = t - imps[i].t;
          if (a < 0 || a > 5 * b.tau) continue;
          const e = Math.min(MAX_SHAKE, imps[i].amp ?? 0.0075) * Math.exp(-a / b.tau), ph = 2 * Math.PI * hz * a, s = (i + seed) % 2 ? -1 : 1;
          out[0] += e * dx * Math.sin(ph + 1.3 * (i + seed + 1)); out[1] += s * e * Math.cos(ph); out[2] += e;
        }
      }
      return out;
    },
    grainFps(t) { const g = F.grain ?? {}; return law.onesAt(t) && g.ones !== false ? 24 : g.fps ?? fps; },
  };
  return law;
}
