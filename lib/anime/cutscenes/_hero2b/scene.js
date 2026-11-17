// SCENE DATA for _hero2b, the lab for hero2 method b (drawn face). Not a dock. `&view=front|three|low`, `&expr=grin|calm|glare|shut`.
// A dark stage, the camera at chest height looking slightly up, a warm key from the front side and a strong red rim from behind.
const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const pick = (k, list, d) => (list.includes(q.get(k)) ? q.get(k) : d);
export const lab = { view: pick("view", ["front", "three", "low"], "front"), expr: pick("expr", ["grin", "calm", "glare", "shut"], "grin") };
const num = (k, d) => (q.get(k) === null ? d : Number(q.get(k)));
const V = { front: [0, -0.1], three: [0.55, -0.1], low: [0.12, -0.3] }[lab.view];
const r = num("r", 2.3), ly = num("ly", 0.7), az = num("az", V[0]), el = num("elev", V[1]);
const eye = [r * Math.sin(az) * Math.cos(el), ly + r * Math.sin(el), r * Math.cos(az) * Math.cos(el)];

export default {
  id: "_hero2b", title: "Hero2 b", anime: "lab", style: "modern-anime", look: { photo: q.get("photo") ?? "none" }, fps: 12, duration: 12, seed: 1,
  palette: { skyTop: "#0b0810", skyLow: "#1a1018", ground: "#120d14", groundShade: "#07050a" },
  seal: { at: [0, 0.8, 0], yaw: 0, scale: 0.001, moves: [], track: [] },
  shots: [{ n: 1, t: [0, 12], law: "free", eye: [eye, eye], lookAt: [[0, ly, 0], [0, ly, 0]], fov: 30, minFrac: 0.0, long: true }],
  beats: [], bubbles: [], lines: [], sfx: [], credit: null,
};
