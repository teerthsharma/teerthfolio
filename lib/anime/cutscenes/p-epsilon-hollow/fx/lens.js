// The cracked lens: the live crack overlay (spawn-seal.jsx `cracks`) as a DOM layer over the frame, with a second shock ring and falling glass.
import { hash } from "../live/slime.js";
import { smooth } from "../clock.js";

const NS = "http://www.w3.org/2000/svg";
const clamp = (x) => Math.min(1, Math.max(0, x));

export const RAYS = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2 + (hash(i, 1) - 0.5) * 0.3;
  return {
    a,
    pts: Array.from({ length: 6 }, (_, k) => {
      const r = 6 + k * 8 + hash(i * 7 + k, 2) * 5, j = (hash(i * 5 + k, 3) - 0.5) * 0.35;
      return [Math.cos(a + j) * r * 1.4, Math.sin(a + j) * r];
    }),
  };
});

const SHARDS = Array.from({ length: 36 }, (_, i) => {
  const p = RAYS[i % 24].pts[Math.floor(hash(i, 40) * 6)], s = 2 + 2 * hash(i, 41);
  const q = [0, 1, 2].map((v) => [(hash(i * 3 + v, 42) - 0.5) * 2 * s, (hash(i * 3 + v, 44) - 0.5) * 2 * s]);
  return { x: 50 + p[0], y: 50 + p[1], spin: hash(i, 43) * 360, points: q.map((v) => v.join(",")).join(" ") };
});

const raysD = (f) => RAYS.map((r, i) => `M50 50${r.pts.map(([x, y], k) => {
  const jx = (hash(i * 6 + k, f + 9) - 0.5) * 0.3, jy = (hash(i * 6 + k, f + 17) - 0.5) * 0.3;
  return `L${(50 + x + jx).toFixed(2)} ${(50 + y + jy).toFixed(2)}`;
}).join("")}`).join("");

export function buildLens(host) {
  const root = document.createElement("div");
  root.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;transform-origin:50% 50%;opacity:0";
  const mk = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    svg.appendChild(e);
    return e;
  };
  const round = { fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" };
  const ink = mk("path", { ...round, stroke: "#06101c", "stroke-width": 1.6 });
  const lite = mk("path", { ...round, stroke: "#e9fdff", "stroke-width": 0.7 });
  const ring = mk("circle", { cx: 50, cy: 50, r: 6, fill: "none", stroke: "#e6b8ff", "stroke-width": 0.8, opacity: 0 });
  const shards = SHARDS.map((s) => mk("polygon", { points: s.points, fill: "#e9fdff", "fill-opacity": 0.8, stroke: "#06101c", "stroke-opacity": 0.4, "stroke-width": 0.4, opacity: 0 }));
  root.appendChild(svg);
  host.appendChild(root);
  let frame = -1;

  return {
    show(t) {
      const ck = smooth(13.5, 13.6, t) * (1 - smooth(14.2, 14.7, t)), sh = smooth(13.9, 14.7, t);
      svg.style.opacity = ck.toFixed(3);
      svg.style.transform = `scale(${(1 + sh * 0.5).toFixed(3)}) rotate(${(sh * 4).toFixed(2)}deg)`;
      const f = Math.floor(t * 12 + 1e-6);
      if (f !== frame) { frame = f; const d = raysD(f); ink.setAttribute("d", d); lite.setAttribute("d", d); }
      const ru = clamp((t - 13.6) / 0.25);
      ring.setAttribute("r", (6 + 64 * ru).toFixed(2));
      ring.setAttribute("opacity", t >= 13.6 && t < 13.85 ? (1 - ru).toFixed(3) : "0");
      SHARDS.forEach((s, i) => {
        const tau = t - 13.9, el = shards[i];
        if (tau < 0 || t >= 14.7) { el.setAttribute("opacity", "0"); return; }
        el.setAttribute("opacity", "0.8");
        el.setAttribute("transform", `translate(${s.x.toFixed(2)} ${(s.y + 0.5 * 60 * tau * tau).toFixed(2)}) rotate(${(s.spin + tau * 540).toFixed(1)})`);
      });
    },
    dispose() { root.remove(); },
  };
}
