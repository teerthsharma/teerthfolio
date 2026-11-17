// SCENE DATA for _hero2a, the lab of the sculpted hero (kit/hero2/a). Not a dock. One held shot on a dark stage.
// `&view=front|three|low` the camera (front at chest height looking slightly up; a three-quarter turn; a low angle),
// `&expr=grin|calm|glare|shut`, `&look=sukuna`. The figure is built in build.js; the framework's own pup is hidden.
const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const view = ["front", "three", "low"].includes(q.get("view")) ? q.get("view") : "front";
const EYE = { front: [0, 0.58, 1.6], three: [0.9, 0.6, 1.35], low: [0.3, 0.22, 1.5] };
const AIM = { front: [0, 0.8, 0], three: [0, 0.8, 0], low: [0, 0.84, 0] };
const cam = q.get("cam")?.split(/[,;]/).map(Number); // &cam=ex;ey;ez;lx;ly;lz;fov frames a close look
if (cam) { EYE[view] = cam.slice(0, 3); AIM[view] = cam.slice(3, 6); }
export const expr = ["grin", "calm", "glare", "shut"].includes(q.get("expr")) ? q.get("expr") : "grin";

export default {
  id: "_hero2a", title: "Hero2 A lab", anime: "lab", style: "modern-anime", look: {}, fps: 12, duration: 12, seed: 3,
  palette: { skyTop: "#0b0610", skyLow: "#1d0a12", ground: "#120a10", groundShade: "#07040a" },
  seal: { at: [0, 0.45, 0], yaw: 0, scale: 1, moves: [], track: [] },
  shots: [{ n: 1, t: [0, 12], law: "free", hold: true, eye: [EYE[view], EYE[view]], lookAt: [AIM[view], AIM[view]], fov: cam?.[6] ?? Number(q.get("fov") ?? 30), minFrac: 0.01 }],
  beats: [], bubbles: [], lines: [], sfx: [], credit: null,
};
