// THE WORLDS: one environment per anime, no characters. Each builder returns
//   { scene, camera, apply(), update(t, dt) }
// apply() writes the world's light into the shared uniforms (the grid renders several worlds
// with one engine). The static world is layer 0 and becomes a plate (rendered once per style,
// painted with the plate filters); anything animated (lightning) is layer 1, redrawn per step.
import { BackSide, Color, ConeGeometry, CylinderGeometry, BoxGeometry, Group, IcosahedronGeometry, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, SphereGeometry, Vector3, Vector4 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, painted } from "./sdf.js";
import { grass } from "./meadow.js";
import { sky } from "./sky.js";
import { lineGeometry, lineMaterial } from "./pup.js";
import { bolt, boltGeometry, boltMaterial, step } from "./sakuga.js";
import { painting, bakedDome, mistCard, KIT_PUFFS, KIT_STORM, puffBanks, puffUniforms } from "./paint.js";
import { glslFor } from "./tools/index.js";
import { arcWall, bareTree, boulder, flipX, hipRoof, horn, merge, rng, teeth } from "./kit3d.js";
import FRIEREN from "./paintings/frieren.js";
import { shrine } from "./worlds/shrine.js";

// hex (sRGB) -> GLSL vec3 in linear light
const V = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
const NOISE = glslFor(["noise"]);

// a sky dome that follows the camera; frag sees vD (direction), az (radians, + right of -z), el
function dome(frag, uniforms = {}, decl = "") {
  const m = new ShaderMaterial({
    side: BackSide, depthWrite: false, uniforms,
    vertexShader: "varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }",
    fragmentShader: `varying vec3 vD; ${decl} ${NOISE}
      void main() { vec3 d = normalize(vD); float el = asin(clamp(d.y, -1.0, 1.0)); float az = atan(d.x, -d.z); vec2 p = vec2(az, el); vec3 c;
        ${frag}
        gl_FragColor = vec4(c, 0.0); }`,
  });
  const s = new Mesh(new SphereGeometry(400, 64, 32), m);
  s.frustumCulled = false; s.renderOrder = -10;
  return s;
}
const prop = (engine, geo, col, shade, id = 0.5) => engine.prop(painted(geo, paint(col, shade)), id);
const cam = (fov) => new PerspectiveCamera(fov, 1180 / 820, 0.1, 1000);

// ---------------------------------------------------------------- YOUR NAME (Shinkai)
// The poster's sky: ultramarine to cyan, towering cumulus with sunlit tops and blue undersides,
// Tiamat's comet splitting in two, a pink anamorphic flare at the horizon. City in blue haze on
// the left, a sunlit grass hill with dark trees on the right, a utility pole and wires.
function cumulus(seed) {
  const R = rng(seed), P = [];
  const bank = (a0, a1, base, peak, cols, z0) => {
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols, x = a0 + (a1 - a0) * u, H = peak * (0.35 + 0.65 * Math.sin(Math.PI * u)) * (0.7 + 0.6 * R());
      let y = base, r = 0.06 + 0.04 * R();
      while (y < base + H && P.length < 96) { P.push([x + (R() - 0.5) * 0.06, y, r, z0 + (1 - (y - base) / Math.max(H, 0.01)) * 0.06 + R() * 0.02]); y += r * 0.72; r *= 0.84; }
    }
  };
  bank(-0.78, -0.2, 0.03, 0.4, 7, 0.1);
  bank(0.16, 0.78, 0.04, 0.3, 7, 0.1);
  bank(-0.24, 0.2, 0.0, 0.07, 6, 0.0);
  for (let i = 0; i < 6; i++) P.push([-0.6 + 1.2 * R(), 0.3 + 0.2 * R(), 0.025 + 0.02 * R(), 0.2]);
  return P.slice(0, 96);
}
export function yourName(engine) {
  const scene = new Scene();
  const camera = cam(50);
  camera.position.set(0, 1.7, 0);
  camera.lookAt(0, 1.7 + Math.tan(0.21) * 100, -100);
  const puffs = cumulus(11);
  const sk = dome(/* glsl */ `
    c = mix(${V("#c4e8f7")}, ${V("#64aaea")}, smoothstep(0.0, 0.25, el));
    c = mix(c, ${V("#2c64c8")}, smoothstep(0.2, 0.55, el));
    c = mix(c, ${V("#1a3c9a")}, smoothstep(0.5, 0.9, el));
    // cirrus combed by the jet stream
    float wisp = fbm(vec2(p.x * 2.5 + p.y * 1.5, p.y * 18.0));
    c = mix(c, ${V("#eaf3ff")}, smoothstep(0.55, 0.8, wisp) * smoothstep(0.25, 0.6, el) * 0.55);
    // cumulus: a union of spheres seen from the front; the nearest surface wins, lit as a height field
    vec2 pe = p + (vec2(fbm(p * 38.0), fbm(p * 38.0 + 7.0)) - 0.5) * 0.014;
    float bz = -1.0; vec3 bn = vec3(0.0);
    for (int i = 0; i < 96; i++) { if (float(i) >= uN) break; vec4 P = uPuff[i]; vec2 q = pe - P.xy;
      float r = P.z * (1.0 + 0.08 * (vn(vec2(atan(q.y, q.x) * 2.5, float(i) * 3.7)) - 0.5));
      float r2 = dot(q, q) / (r * r);
      if (r2 < 1.0) { float z = P.w + sqrt(1.0 - r2) * r; if (z > bz) { bz = z; bn = normalize(vec3(q / r, sqrt(1.0 - r2))); } } }
    if (bz > -0.5) {
      vec3 Lc = normalize(vec3(-0.5, 0.7, 0.55));
      float lam = dot(bn, Lc) + (fbm(pe * 70.0) - 0.5) * 0.3;
      vec3 cc = mix(${V("#8197c9")}, ${V("#aec0e2")}, smoothstep(-0.12, -0.04, lam));
      cc = mix(cc, ${V("#e4ecf8")}, smoothstep(0.22, 0.3, lam));
      cc = mix(cc, ${V("#fffaf0")}, smoothstep(0.52, 0.6, lam));
      cc = mix(cc, ${V("#7d8fc0")}, smoothstep(0.0, -0.7, bn.y) * 0.45);
      cc = mix(cc, ${V("#fff1d6")} * 1.05, smoothstep(0.3, 0.0, bn.z) * step(0.0, dot(bn.xy, Lc.xy)) * 0.8);
      cc = mix(cc, ${V("#c4e8f7")}, smoothstep(0.14, 0.0, el) * 0.5);
      c = mix(c, cc, smoothstep(0.0, 0.1, bn.z));
    }
    // Tiamat: a thin white core with a soft trail, splitting near its head; pink fragment glint
    vec2 A = vec2(0.55, 0.85), B = vec2(0.06, 0.2), ab = B - A;
    float t = clamp(dot(p - A, ab) / dot(ab, ab), 0.0, 1.0), dist = length(p - A - ab * t);
    c += vec3(0.85, 0.92, 1.0) * ((1.0 - smoothstep(0.0007, 0.0019, dist)) * smoothstep(0.0, 0.6, t) * 2.5 + exp(-dist / 0.006) * 0.4 * t);
    vec2 S = A + ab * 0.66, C2 = vec2(0.16, 0.27), sc = C2 - S;
    float t2 = clamp(dot(p - S, sc) / dot(sc, sc), 0.0, 1.0), d2 = length(p - S - sc * t2);
    c += vec3(0.95, 0.85, 1.0) * ((1.0 - smoothstep(0.0005, 0.0015, d2)) * 1.6 + exp(-d2 / 0.004) * 0.25) * t2;
    c += ${V("#ff6f96")} * 3.0 * exp(-length(p - C2) / 0.0035) + vec3(4.0) * exp(-length(p - B) / 0.0025);
    // the flare: anamorphic streak, star spikes, a hot core, glitter
    vec2 q = p - vec2(-0.02, 0.07);
    float fl = lensFlare(q);
    c += ${V("#ffc4ec")} * fl;
    c += vec3(2.5) * step(0.9965, h21(floor(p * 420.0))) * exp(-length(q) * 5.0);`,
  { uPuff: { value: Array.from({ length: 96 }, (_, i) => new Vector4(...(puffs[i] ?? [0, 0, 0, 0]))) }, uN: { value: puffs.length } },
  "uniform vec4 uPuff[96]; uniform float uN;" + glslFor(["flare"]));
  scene.add(sk); sk.position.copy(camera.position);
  // ground: a sunlit street on the left, the hill on the right
  scene.add(prop(engine, new PlaneGeometry(600, 600).rotateX(-Math.PI / 2), "#a9b4c2", "#6a7898", 0.3));
  scene.add(prop(engine, new SphereGeometry(1, 96, 48).scale(34, 9, 26).translate(26, -5.2, -22), "#a6cf45", "#356f3a", 0.35));
  const R = rng(5);
  scene.add(grass(engine.shared, 4000, (i) => { const a = R() * Math.PI, rr = Math.sqrt(R());
    const x = 26 + Math.cos(a + Math.PI / 2) * 30 * rr - 6, z = -22 + Math.sin(a * 2) * 18 * rr;
    const u = (x - 26) / 34, w = (z + 22) / 26, y = -5.2 + 9 * Math.sqrt(Math.max(0, 1 - u * u - w * w));
    return [x, y - 0.05, z, 0.5 + R() * 0.8, R() * 6.28]; }, { base: "#2a5a22", mid: "#6aa93a", tip: "#d6ec74", lit: "#f2f7a0" }));
  const trees = [];
  for (let i = 0; i < 9; i++) { const x = 8 + i * 3.2 + R() * 2, z = -30 - R() * 10, s = 1.6 + R() * 1.6;
    for (let k = 0; k < 4; k++) trees.push(boulder([s * (0.8 + R() * 0.4), s * (0.9 + R() * 0.5), s], [x + (R() - 0.5) * s, 3.2 + k * s * 0.5 + R(), z + (R() - 0.5) * s], i * 10 + k)); }
  scene.add(prop(engine, mergeGeometries(trees), "#4f8f2e", "#173c2c", 0.4));
  // the city: towers in blue haze, a few close enough to read windows-free facades
  const city = [];
  for (let i = 0; i < 46; i++) { const w = 10 + R() * 16, h = 25 + R() ** 1.6 * 110, x = -150 + R() * 140, z = -110 - R() * 180;
    city.push(new BoxGeometry(w, h, w * (0.7 + R() * 0.6)).translate(x, h / 2, z)); }
  scene.add(prop(engine, mergeGeometries(city), "#dbe5f1", "#7d93bd", 0.45));
  // utility pole and wires: the Shinkai sky is always crossed by cables
  scene.add(prop(engine, mergeGeometries([new CylinderGeometry(0.14, 0.18, 12, 10).translate(-7, 6, -15), new BoxGeometry(2.6, 0.18, 0.18).translate(-7, 10.8, -15), new BoxGeometry(1.8, 0.16, 0.16).translate(-7, 9.9, -15)]), "#4a5066", "#1e2236", 0.6));
  const wires = [];
  for (const [y0, x0] of [[10.8, -8.2], [10.8, -5.8], [9.9, -7.6]]) {
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new Vector3(x0 + t * 70, y0 + t * 6 - Math.sin(Math.PI * t) * 5.5, -15 - t * 6)); }
    wires.push(pts);
  }
  const wm = new Mesh(lineGeometry(wires), lineMaterial(engine.shared, "#252a3c", 1.1)); wm.frustumCulled = false; scene.add(wm);
  return {
    scene, camera,
    apply() { engine.shared.uLightDir.value.set(-0.45, 0.75, 0.45).normalize(); engine.shared.uLightCol.value.set("#fff6e6"); engine.shared.uRimDir.value.set(0, 0, 0); },
    update() {},
  };
}

// ---------------------------------------------------------------- FRIEREN (Madhouse)
// A painted plate (paintings/frieren.js): the golden-hour hillside of the owner's Madhouse frame.
export function frieren(engine) {
  const scene = new Scene();
  scene.add(painting(engine.shared, FRIEREN));
  return { scene, camera: cam(40), apply() {}, update() {} };
}

// JUJUTSU KAISEN (MAPPA): the Malevolent Shrine lives in worlds/shrine.js

// the registry: style id -> { anime, build, verified }. A world is labelled with its anime only
// once it reads as that anime beside its reference; until then the label says WIP.
export const WORLDS = [
  { id: "jjk", anime: "Jujutsu Kaisen", build: shrine, verified: false },
  { id: "frieren", anime: "Frieren", build: frieren, verified: false },
  { id: "your-name", anime: "Your Name", build: yourName, verified: false },
];
export const worldById = (id) => WORLDS.find((w) => w.id === id) ?? WORLDS[0];
