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
import { painting } from "./paint.js";
import FRIEREN from "./paintings/frieren.js";

// hex (sRGB) -> GLSL vec3 in linear light
const V = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
const rng = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const NOISE = /* glsl */ `
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }`;

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
// a faceted boulder: icosahedron, shared corners jittered together, optional flat top
function boulder(sc, at, seed, top = Infinity) {
  const g = new IcosahedronGeometry(1, 1), P = g.attributes.position, R = rng(seed * 7919 + 1);
  const k = new Map();
  for (let i = 0; i < P.count; i++) {
    const key = [P.getX(i), P.getY(i), P.getZ(i)].map((v) => Math.round(v * 1000)).join();
    if (!k.has(key)) k.set(key, 1 + 0.24 * (R() - 0.5));
    const f = k.get(key);
    P.setXYZ(i, P.getX(i) * f * sc[0] + at[0], Math.min(top, P.getY(i) * f * sc[1] + at[1]), P.getZ(i) * f * sc[2] + at[2]);
  }
  g.deleteAttribute("normal"); g.deleteAttribute("uv"); g.computeVertexNormals();
  return g;
}
// a cone bent along +x as it rises (horns, upturned eaves)
function horn(r, h, bend) {
  const g = new ConeGeometry(r, h, 10, 8).translate(0, h / 2, 0), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setX(i, P.getX(i) + bend * y * y / h); }
  g.computeVertexNormals();
  return g;
}

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
    float fl = exp(-abs(q.y) * 600.0) * exp(-abs(q.x) * 3.5) * 2.0 + exp(-abs(q.x) * 800.0) * exp(-abs(q.y) * 10.0) * 1.2
      + (exp(-abs(q.x + q.y) * 700.0) + exp(-abs(q.x - q.y) * 700.0)) * exp(-length(q) * 25.0) * 0.8 + exp(-length(q) * 90.0) * 6.0;
    c += ${V("#ffc4ec")} * fl;
    c += vec3(2.5) * step(0.9965, h21(floor(p * 420.0))) * exp(-length(q) * 5.0);`,
  { uPuff: { value: Array.from({ length: 96 }, (_, i) => new Vector4(...(puffs[i] ?? [0, 0, 0, 0]))) }, uN: { value: puffs.length } },
  "uniform vec4 uPuff[96]; uniform float uN;");
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

// ---------------------------------------------------------------- JUJUTSU KAISEN (MAPPA): Malevolent Shrine
// Sukuna's domain: a black-and-crimson storm with a red horizon glow, the shrine with a mouth of
// pale teal teeth, red pillars, curved horns, on a mound of rubble, mirrored in black water;
// teal stone walls and cyan-lit pillars at the sides; red lightning on threes. Heavy black ink.
export function shrine(engine) {
  const scene = new Scene();
  const camera = cam(45);
  camera.position.set(0, 2.2, 28);
  camera.lookAt(0, 8, -30);
  const sk = dome(/* glsl */ `
    float y = abs(el);                                    // the water mirrors the storm
    float g = fbm(vec2(az * 2.2, y * 4.5) + 3.0), g2 = fbm(vec2(az * 6.0, y * 11.0) + 9.0);
    float mass = smoothstep(0.4, 0.62, g + g2 * 0.25);
    vec3 lit = mix(${V("#3a0410")}, ${V("#c8102e")}, smoothstep(0.35, 0.75, g2));
    c = mix(lit, ${V("#050205")}, mass);
    c = mix(c, ${V("#ff4a6a")} * 1.6, smoothstep(0.012, 0.0, abs(g + g2 * 0.25 - 0.4)) * (1.0 - smoothstep(0.1, 0.5, y)) * 0.8);
    c += ${V("#ff2a4a")} * 2.2 * exp(-y * 14.0) * exp(-abs(az) * 2.2);  // the red glow behind the shrine
    c *= mix(1.0, 0.25, smoothstep(0.2, 0.9, y));`);
  scene.add(sk); sk.position.copy(camera.position);
  const world = new Group();
  const R = rng(17);
  // mound of rubble
  const rub = [];
  for (let i = 0; i < 46; i++) { const a = R() * Math.PI * 2, r = R() * 13, s = 1 + R() * 2.4; rub.push(boulder([s * 1.3, s * 0.8, s], [Math.cos(a) * r, Math.max(0, 4.2 - r * 0.33) + R() * 0.8 - 0.5, -30 + Math.sin(a) * r * 0.6], i)); }
  world.add(prop(engine, mergeGeometries(rub), "#33403f", "#070b0c", 0.5));
  // the shrine: body, mouth with teeth, pillars, two roof tiers with upturned eaves, horns
  world.add(prop(engine, new BoxGeometry(9, 7.5, 6).translate(0, 8.2, -30), "#1d2427", "#050708", 0.55));
  world.add(prop(engine, new BoxGeometry(6.4, 5, 0.6).translate(0, 8.2, -26.75), "#050505", "#000000", 0.56));
  const teeth = [];
  for (let i = 0; i < 7; i++) { const x = -2.7 + i * 0.9; teeth.push(new ConeGeometry(0.42, 1.3, 8).rotateX(Math.PI).translate(x, 9.95, -26.3), new ConeGeometry(0.42, 1.3, 8).translate(x, 6.45, -26.3)); }
  world.add(prop(engine, mergeGeometries(teeth), "#cdeee6", "#4f8a86", 0.57));
  const red = [];
  for (const x of [-4.2, 4.2]) for (const z of [-27, -33]) red.push(new CylinderGeometry(0.42, 0.48, 7.5, 12).translate(x, 8.2, z));
  red.push(new BoxGeometry(14, 0.6, 10).translate(0, 12.2, -30), new BoxGeometry(8, 0.45, 6.5).translate(0, 15.6, -30));
  world.add(prop(engine, mergeGeometries(red.map((g) => g.toNonIndexed())), "#e04a24", "#6a0e10", 0.58));
  const roof = [new CylinderGeometry(4.6, 10.2, 1.6, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.72).translate(0, 13.2, -30), new BoxGeometry(5.5, 2.6, 4.2).translate(0, 14.6, -30), new CylinderGeometry(2.8, 6.6, 1.3, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.72).translate(0, 16.4, -30)];
  for (const [x, z, s] of [[7.4, -24.8, 1], [-7.4, -24.8, -1], [7.4, -35.2, 1], [-7.4, -35.2, -1]]) roof.push(horn(0.35, 2.4, 1.4).rotateZ(-s * 1.1).scale(s, 1, 1).translate(x, 12.6, z));
  for (const [x, s, h] of [[1.2, 1, 4.5], [-1.2, -1, 4.5], [3.0, 1, 3.4], [-3.0, -1, 3.4], [0, 1, 2.6]]) roof.push(horn(0.42, h, 1.6 * Math.sign(x || 0.01)).scale(s * s, 1, 1).translate(x, 17, -30));
  world.add(prop(engine, mergeGeometries(roof.map((g) => g.toNonIndexed())), "#2a3c3c", "#060c0e", 0.59));
  // teal stone walls and the cyan-lit pillars
  const walls = [];
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) walls.push(new BoxGeometry(8, 16, 2).translate(s * (24 + i * 7), 7, -8 - i * 9));
  world.add(prop(engine, mergeGeometries(walls), "#2a7a78", "#04191b", 0.6));
  for (const x of [-17, 17]) { const p = prop(engine, new BoxGeometry(1.8, 15, 1.8).translate(x, 7.5, -12), "#9ef6ff", "#2a8f9a", 0.61); p.material.uniforms.uEmit.value.set(0.25, 1.1, 1.3); world.add(p); }
  scene.add(world);
  // the mirror: the same world flipped under the water line, under a dark teal glaze
  const mirror = world.clone(); mirror.scale.y = -1; scene.add(mirror);
  scene.add(new Mesh(new PlaneGeometry(600, 600).rotateX(-Math.PI / 2), new ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vW; ${NOISE}
      void main() { float s = fbm(vec2(vW.x * 0.08, vW.z * 1.4)); gl_FragColor = vec4(mix(${V("#021012")}, ${V("#3a0a14")}, smoothstep(0.55, 0.8, s) * 0.6), mix(0.62, 0.35, smoothstep(0.6, 0.8, s))); }`,
  })));
  // lightning: layer 1, re-struck every step
  const bolts = new Group(); scene.add(bolts);
  const bm = boltMaterial("#ff8aa0", "#2a0008");
  let lastStep = -1;
  return {
    scene, camera,
    apply() { engine.shared.uLightDir.value.set(0.15, 0.45, -0.88).normalize(); engine.shared.uLightCol.value.set("#ff4054"); engine.shared.uRimDir.value.set(0, 0, 0); },
    update(t) {
      const k = Math.floor(t * engine.style.timing.fps);
      if (k === lastStep) return;
      lastStep = k;
      for (const b of bolts.children) b.geometry.dispose();
      bolts.clear();
      const rb = rng(k * 31 + 7);
      if (rb() < 0.6) for (const s of [-1, 1]) {
        const a = new Vector3(s * (40 + rb() * 40), 60 + rb() * 20, -120), b = new Vector3(s * (28 + rb() * 30), 2, -110);
        const m = new Mesh(boltGeometry(bolt(a, b, 6, 0.8, 0.35, rb), camera.position, 0.5), bm);
        m.layers.set(1); m.frustumCulled = false; bolts.add(m);
      }
    },
  };
}

// the registry: style id -> { anime, build, verified }. A world is labelled with its anime only
// once it reads as that anime beside its reference; until then the label says WIP.
export const WORLDS = [
  { id: "jjk", anime: "Jujutsu Kaisen", build: shrine, verified: false },
  { id: "frieren", anime: "Frieren", build: frieren, verified: false },
  { id: "your-name", anime: "Your Name", build: yourName, verified: false },
];
export const worldById = (id) => WORLDS.find((w) => w.id === id) ?? WORLDS[0];
