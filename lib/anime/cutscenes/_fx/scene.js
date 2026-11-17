// SCENE DATA for _fx, the lab gallery of lib/anime/kit/fx (not a dock): `?fx=<module>` one demo 4 m back beside the hero (fx=mirror
// stands it back so its reflection lands in frame), no fx all ten in a 5 x 2 grid, fx=none empty; `&seal=x:z` moves the hero, `&near` 1.7 m.
const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const one = q.get("fx"), near = q.has("near"), put = q.get("seal")?.split(":").map(Number);
const at = put?.length === 2 ? [put[0], 0, put[1]] : one === "mirror" ? [1.5, 0, -1.1] : one ? [1.45, 0, 0.35] : [1.25, 0, 1.4];
const lens = !one ? { eye: [[0, 2.3, 14]], lookAt: [0, 2.15, 0], fov: 30 }
  : near ? { eye: [[0, 1.05, 1.7]], lookAt: [0, 1, 0], fov: 34 } : { eye: [[0.25, 1.15, 4.3]], lookAt: [0.25, 0.95, 0], fov: 34 };

const sk = q.get("cel") === "sukuna" && one === "cel", look = sk ? (await import("../pr-triton-kernels-22/scene.js")).default.seal.hero : undefined;
const hit = (t, amp) => ({ t, name: "shake", amp, tau: 0.16, hz: 9 }), ones = (t, dur) => ({ t, name: "ones", dur, layers: ["cast", "fx"] });
const SK = !sk ? {} : {
  palette: { ground: "#1a0d14", groundShade: "#0e060a", horizon: "#3a0a14", zenith: "#0a0206" },
  seal: { at: [0, 0, 0], yaw: 0, scale: 1, moves: [], hero: look, track: [{ t: 0, pose: "sign", dur: 0.2, hold: 9 }, { t: 0.2, expr: "grin", dur: 0.2, hold: 9 }] },
  shots: [{ n: 1, t: [0, 8.5], law: "free", hold: true, minFrac: 0.01, eye: [[0, 0.8, 2.7]], lookAt: [0, 0.72, 0], fov: 38 }],
  beats: [...[0, 1, 2, 3, 4, 5].flatMap((i) => [hit(0.5 + i * 0.34, 0.014), ones(0.5 + i * 0.34, 0.3)]), hit(3.2, 0.04), hit(3.45, 0.025), ones(3.1, 0.7), hit(5.6, 0.032), hit(5.9, 0.02), ones(5.5, 0.7)],
  duration: 8.5,
};

export default {
  id: "_fx",
  title: "FX kit gallery",
  anime: "lab",
  style: "modern-anime",
  look: {},
  fps: 12,
  duration: 8,
  seed: 1,
  far: 900,
  palette: { ground: "#8c8c8c", groundShade: "#62646f", horizon: "#aeb6c2", zenith: "#5a76a2" },
  seal: { at, yaw: -0.35, scale: 1, moves: [], track: [] },
  shots: [{ n: 1, t: [0, 8], law: "free", hold: true, minFrac: 0.01, ...lens }],
  beats: [],
  bubbles: [],
  lines: [],
  sfx: [],
  credit: null,
  ...SK,
};
