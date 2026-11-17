// SCENE DATA for _bg, the background kit gallery (lab only). `&gal=<name>` picks a frame from gallery.js: one seal, one held camera, one painted world.
// Letterbox and grain are off on purpose: the frame is the picture. Heroes: the Sukuna look for shibuya, the Ainz look for throne, the plain pup elsewhere.
import { FRAME, GAL } from "./gallery.js";
import sukuna from "../../kit/hero/looks/pr-triton-kernels-22.js";
import ainz from "../../kit/hero/looks/pr-topograph-432.js";

const HEROES = { sukuna, ainz };
const hero = FRAME.hero ? HEROES[FRAME.hero] : undefined;
const hold = (k, v) => ({ t: 0, [k]: v, dur: 0.01, hold: 99, out: 0.01 });
const track = FRAME.hero === "sukuna" ? [hold("pose", "sign"), hold("expr", "smug")] : FRAME.hero === "ainz" ? [hold("expr", "calm")] : [];

export default {
  id: "_bg",
  title: `Background kit: ${GAL}`,
  anime: "background kit gallery",
  style: "modern-anime",
  look: { photo: { haze: { max: 0, sky: 0 }, mist: { amt: 0 }, motes: { amt: 0.05 } } },
  bg: false,
  fps: 12,
  duration: 12,
  seed: 77,
  far: FRAME.far,
  plates: true,
  palette: {},
  frame: { ink: "#0a0810" },
  seal: { ...FRAME.seal, hero, moves: [], track },
  shots: [{ n: 1, t: [0, 12], law: "free", hold: true, ...FRAME.cam, minFrac: FRAME.cam.minFrac ?? 0.12 }],
  beats: [],
  bubbles: [],
  lines: [],
  sfx: [],
};
