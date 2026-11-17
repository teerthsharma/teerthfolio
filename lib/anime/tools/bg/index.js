// BG pack: the background kit's painters as shader-table tools, so the table lists them and the compile check covers them.
// The kit (lib/anime/kit/bg/) is the front door; these are the same GLSL, one tool per sky preset and per silhouette card, each with a demo.
//   bgPaint     helper: bgN3 bgF3 bgTone bgBrush bgRamp5 (the painter's functions)
//   bgSkyKit    helper: the cloud density and vein functions the sky tools share
//   bgSky<Preset>   plate: vec3 bgSky<Preset>(float az, float el), demo = the dome flattened (az across, el up)
//   bgCard<Kind>    card: vec4 bgCard<Kind>(vec2 p) coverage in alpha, demo = the card over a dusk gradient
import { PAINT } from "../../kit/bg/glsl.js";
import { CARD_KINDS, cardGLSL } from "../../kit/bg/cards.js";
import { SKY_PRESETS, skyGLSL } from "../../kit/bg/sky.js";

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const full = skyGLSL("day"), cut = full.indexOf("vec3 sky(");
const HELPERS = full.slice(0, cut);

export const bgPaint = {
  name: "bgPaint", doc: "the painter's functions: 3D value noise and fbm, posterise into painted tones, bristle strokes, a five-stop ramp, a box mask",
  family: "bg", deps: ["noise"], glsl: PAINT, draws: "Draws nothing itself; supplies bgN3, bgF3, bgTone, bgBrush, bgRamp5, bgLuma and bgBox to the other bg tools.", use: "helper", suits: ["any"], params: "none", quality: "real",
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { float v = bgTone(bgF3(vec3(p * 5.0, 0.0)), 4.0, 0.1); return bgRamp5(v, vec3(0.03, 0.04, 0.12), vec3(0.16, 0.18, 0.4), vec3(0.5, 0.4, 0.6), vec3(0.95, 0.6, 0.5), vec3(1.0, 0.95, 0.8)); }`,
};

export const bgSkyKit = {
  name: "bgSkyKit", doc: "cloud density (warped fbm plus two Voronoi billow layers) and thin Voronoi-edge veins, shared by the bg sky tools",
  family: "bg", deps: ["bgPaint"], glsl: HELPERS, draws: "Draws nothing itself; supplies bgSkyDens and bgVein to the bg sky tools.", use: "helper", suits: ["any"], params: "none", quality: "real",
  demo: /* glsl */ `vec3 demo(vec2 p, float t) { float h; float v = bgVein(p, 1.0, h); return vec3(v) * 0.8 + vec3(0.6, 0.1, 0.05) * h; }`,
};

const DESC = {
  day: ["A day sky: blue gradient to a pale warm horizon, white cloud masses with a lit rim and a blue belly, a sun disc and glow, cirrus streaks.", "any day, school, Shinkai-style"],
  dusk: ["A dusk sky: violet to rose to amber at the horizon, cloud masses lit orange on the sun side and violet underneath, thin rose cirrus.", "any dusk, sea, rooftop"],
  night: ["A night sky: deep blue to violet with a warm city glow at the horizon, stars, a haloed moon, dim cloud masses with a silver rim.", "any night street"],
  storm: ["A storm sky: heavy dark cloud masses with cold lit edges and a flash that lights them from inside.", "any storm or war scene"],
  void: ["A void sky: near-black violet with nebula bands, dust specks and a bright seam at the horizon.", "any domain, space, void"],
  domain: ["The red domain sky: black smoke masses with glowing red Voronoi veins that recede into the dark, a hot glow at the focus and embers.", "pr-triton-kernels-22, any red domain"],
};
const SKYS = SKY_PRESETS.map((k) => ({
  name: `bgSky${cap(k)}`, doc: DESC[k][0], family: "bg", deps: ["bgSkyKit"],
  glsl: full.slice(cut).length ? skyGLSL(k).slice(skyGLSL(k).indexOf("vec3 sky(")).replace("vec3 sky(", `vec3 bgSky${cap(k)}(`) : "",
  draws: DESC[k][0], use: "plate", suits: [DESC[k][1]], params: "az, el of the view direction (az 0 looks down -z); sun, cover, scale, colours are set in JS by bg.sky(ctx, preset, o)", quality: "real",
  demo: `vec3 demo(vec2 p, float t) { return bgSky${cap(k)}((p.x - 0.89) * 1.6, p.y * 1.4 - 0.2); }`,
}));

const CARDS = CARD_KINDS.map((k) => ({
  name: `bgCard${cap(k)}`, doc: `a ${k} silhouette card: a dark mass in two painted values with a rim light, coverage in alpha`, family: "bg", deps: ["bgPaint"],
  glsl: cardGLSL(k, { w: 2048, h: 512 }).replace("vec4 paint(", `vec4 bgCard${cap(k)}(`),
  draws: `A ${k} silhouette in dark purple with a warm rim along the lit edges and, where it has windows or lanterns, small lit points; transparent elsewhere.`, use: "card",
  suits: ["any"], params: "p in the card's own units: x in [0, aspect], y in [0, 1]; colours, density, seed are set in JS by bg.card(ctx, kind, o)", quality: "real",
  demo: `vec3 demo(vec2 p, float t) { vec3 s = mix(vec3(0.95, 0.55, 0.4), vec3(0.2, 0.2, 0.5), smoothstep(0.0, 1.0, p.y)); vec4 c = bgCard${cap(k)}(vec2(p.x * 2.0, p.y)); return mix(s, c.rgb, c.a); }`,
}));

export const BG_TOOLS = [bgPaint, bgSkyKit, ...SKYS, ...CARDS];
