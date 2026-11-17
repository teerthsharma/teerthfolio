// SCENE DATA for _hero2c, the lab of the hero2/c figure. Flags: view=front|three|low, expr=grin|calm|glare|shut, look=<id in hero2/c/looks>.
const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const pick = (k, list, d) => (list.includes(q.get(k)) ? q.get(k) : d);
export const VIEW = pick("view", ["front", "three", "low", "face", "faceq"], "front");
export const EXPR = pick("expr", ["grin", "calm", "glare", "shut"], "grin");
export const LOOK = /^[\w-]+$/.test(q.get("look") ?? "") ? q.get("look") : "sukuna";
const CAM = { front: [[0, -0.2, 1.32], [0, -0.015, 0]], three: [[0.86, -0.2, 1.0], [0, -0.015, 0]], low: [[0.34, -0.62, 1.12], [0, 0.0, 0]], face: [[0, 0.12, 0.78], [0, 0.12, 0]], faceq: [[0.5, 0.12, 0.6], [0, 0.12, 0]] }[VIEW];
export const HP = (q.get("hp") ?? "").split(";").map(Number);
const num = (k, d) => (q.get(k) === null ? d : Number(q.get(k)));

export default {
  id: "_hero2c",
  title: "Hero2 c",
  anime: "lab",
  style: "modern-anime",
  look: {},
  fps: 12,
  duration: 6,
  seed: 1,
  far: 40,
  palette: {},
  seal: { at: [0, CAM[1][1] - 0.016, 0], yaw: 0, scale: 0.04, shadow: false, moves: [], track: [] },
  shots: [{ n: 1, t: [0, 6], law: "free", hold: true, eye: [[CAM[0][0] * num("zoom", 1), CAM[0][1], CAM[0][2] * num("zoom", 1)]], look: CAM[1], fov: num("fov", 30), minFrac: 0.001 }],
  beats: [], bubbles: [], lines: [], sfx: [], credit: null,
};
