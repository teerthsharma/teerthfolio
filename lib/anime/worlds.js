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

// ---------------------------------------------------------------- JUJUTSU KAISEN (MAPPA): Malevolent Shrine
// The sky, MAPPA style: storm masses are flat black cel shapes; light from two pockets and the
// horizon glow lands as flat crimson rim bands inside the silhouettes on the side facing it, with
// crescents on the inner billows and a pink-white core at a pocket; jagged black ink on the
// silhouettes and on every light border. Most of the sky stays black.
const SHRINE_SKY = /* glsl */ `
  vec3 sky(float az, float el) {
    float y = abs(el);
    vec2 p = vec2(az, y);
    // the horizon glow behind the mound, banded flat: black, crimson, a pink core
    float band = exp(-y * 38.0 / (0.6 + 0.8 * exp(-abs(az) * 3.0))) * exp(-abs(az) * 4.0);
    vec3 c = cel3(band + 0.04 * (vn(p * 60.0) - 0.5), 0.12, 0.6, ${V("#07020a")}, ${V("#8a0a22")}, ${V("#ffb0bf")});
    float d = stormDens(p);
    vec2 L1 = vec2(-0.33, 0.2), L2 = vec2(0.27, 0.25), G = vec2(p.x, -0.08);
    // rim widths: how far (in density) the light band reaches into the mass from the lit edge
    float w = rimBand(p, d, L1, 0.16, 0.5) + rimBand(p, d, L2, 0.18, 0.5) + rimBand(p, d, G, 0.07, 0.42) * (0.6 + exp(-abs(az) * 2.0));
    vec3 n = billowN(p, d);
    float cres = pocket(p, n, L1, 0.08) * 2.2 + pocket(p, n, L2, 0.09) * 2.0;    // crescents on the inner billows near a pocket
    float rim = 1.0 - celStep(d, 0.5 + w);
    float lit = max(rim * (0.6 + w), cres);
    vec3 cc = cel3(lit, 0.5, 1.15, ${V("#040106")}, ${V("#a00b26")}, ${V("#ff6f88")});
    cc = mix(cc, ${V("#ffe2e8")} * 1.4, celStep(cres, 1.9));                        // the white-hot core of a pocket
    float body = celStep(d, 0.5);
    c = mix(c, cc, body);
    float inkL = max(jaggedInk(d, 0.5, 3.0, 70.0, p), jaggedInk(lit, 0.5, 2.0, 120.0, p) * body);
    c = mix(c, vec3(0.0), inkL);
    c += (bolt2(p, vec2(-0.37, 0.15), vec2(-0.33, 0.0), 3.0, ${V("#ff4a64")}) + bolt2(p, vec2(0.36, 0.17), vec2(0.4, 0.0), 7.0, ${V("#ff4a64")})) * 0.07;
    return el < 0.0 ? c * 0.12 : c;
  }`;

// Malevolent Shrine. Target: sealreferences/IMG_0428. A dark pagoda (roof tiers, a crown of
// crescent horns, a maw of glossy pale teeth in black gums, red lacquer pillars, an ember bracket
// band) on a massive pile of rubble, skulls and bones; giant curved grunge walls enclose the
// viewer with cold slits blooming onto the stone; black water keeps a dim, rippled reflection.
export function shrine(engine, o = {}) {
  const scene = new Scene();
  const camera = cam(32);
  const C = new Vector3(0, 8, -30), Y0 = 6.6;
  const sk = bakedDome(engine.renderer, SHRINE_SKY, { tools: ["storm", "lightning", "cel", "ink"], az: [-0.8, 0.8], el: [-0.45, 0.6], pxPerRad: 1700, stormScale: 1.0, stormAspect: [2.0, 2.4] });
  scene.add(sk);
  const world = new Group(), shrineG = new Group();
  const R = rng(17);
  const stone = (geo, col, shade, id, st = [1, 0.35, 0.6, 0.5]) => { const m = prop(engine, geo, col, shade, id); m.material.uniforms.uStone.value.set(...st); return m; };
  // THE MOUND: a broad heap, every piece placed on its surface
  const hm = (x, z) => Y0 * Math.sqrt(Math.max(0, 1 - (x / 15) ** 2 - ((z - C.z) / 10) ** 2));
  const onMound = (rMax) => { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * rMax; const x = Math.cos(a) * r * 15, z = C.z + Math.sin(a) * r * 10; return [x, hm(x, z), z]; };
  const rub = [boulder([15, Y0, 10], [0, -0.3, C.z], 1)];
  for (let i = 0; i < 170; i++) { const [x, y, z] = onMound(0.98), s = 0.5 + R() ** 2 * 2.2; rub.push(boulder([s * 1.3, s * 0.75, s], [x, y - s * 0.3, z], i + 2)); }
  shrineG.add(stone(merge(rub, "rubble"), "#2c4a46", "#06110f", 0.5, [3, 0.9, 0.9, 0.3]));
  const skulls = [];
  for (let i = 0; i < 190; i++) { const [x, y, z] = onMound(0.95), s = 0.35 + R() * 0.4;
    skulls.push(new SphereGeometry(s, 10, 8).scale(1, 0.85, 1.15).translate(x, y + s * 0.3, z), new SphereGeometry(s * 0.2, 6, 4).translate(x - s * 0.35, y + s * 0.3, z + s * 0.95), new SphereGeometry(s * 0.2, 6, 4).translate(x + s * 0.35, y + s * 0.3, z + s * 0.95)); }
  shrineG.add(stone(merge(skulls, "skulls"), "#5f7f78", "#0a1c1a", 0.51, [3, 2, 0.8, 0.2]));
  const bones = [];
  for (let i = 0; i < 160; i++) { const [x, y, z] = onMound(0.95), h = 0.8 + R() * 2.6;
    bones.push(horn(0.08 + R() * 0.12, h, (R() - 0.5) * 1.4, 6, R() < 0.5 ? 1 : 0).rotateZ((R() - 0.5) * 1.8).rotateY(R() * 6.28).translate(x, y - 0.2, z)); }
  shrineG.add(stone(merge(bones, "bones"), "#4a5c58", "#060c0b", 0.515, [3, 2, 0.6, 0.2]));
  // THE PAGODA: plinth, body, maw, side maws, pillars, the ember bracket band, two roof tiers, horns
  const B = { w: 3.0, d: 2.6, h: 7.4 }, zf = C.z + B.d, yb = Y0 + 0.7, top = yb + B.h;
  shrineG.add(stone(merge([new BoxGeometry(10, 0.9, 7.2).translate(0, Y0 + 0.25, C.z), new BoxGeometry(B.w * 2, B.h, B.d * 2).translate(0, yb + B.h / 2, C.z),
    new BoxGeometry(4.0, 1.6, 3.2).translate(0, top + 2.3, C.z)], "body"), "#1f2a2a", "#030505", 0.55, [3, 0.8, 0.7, 0.4]));
  const disc = (rx, ry, x, y, z) => new CylinderGeometry(1, 1, 0.12, 48).rotateX(Math.PI / 2).scale(rx, ry, 1).translate(x, y, z);
  const ym = yb + B.h * 0.5;
  shrineG.add(prop(engine, merge([disc(2.5, 3.0, 0, ym, zf + 0.02), disc(2.5, 0.6, 0, top + 2.3, C.z + 1.82)], "gums"), "#140205", "#020001", 0.555));
  shrineG.add(prop(engine, merge([disc(2.15, 2.6, 0, ym, zf + 0.06), disc(2.0, 0.35, 0, top + 2.3, C.z + 1.86)], "maw"), "#000000", "#000000", 0.556));
  const tooth = (geos) => { const m = prop(engine, merge(geos, "teeth"), "#b8ece2", "#1d4a48", 0.57); m.material.uniforms.uGloss.value.set(0.9, 60, 0.3, 0); m.material.uniforms.uEmit.value.set(0.03, 0.16, 0.15); return m; };
  const T = [
    teeth(6, 3.8, 1.0, 0.5, true, 3, 0.6, 0.15).translate(0, ym + 2.0, zf + 0.3), teeth(7, 3.2, 0.75, 0.36, true, 5, 0.5, 0.6).translate(0, ym + 1.6, zf - 0.1),
    teeth(6, 3.8, 0.95, 0.5, false, 7, 0.6, 0.15).translate(0, ym - 2.0, zf + 0.3), teeth(7, 3.2, 0.7, 0.36, false, 9, 0.5, 0.6).translate(0, ym - 1.6, zf - 0.1),
    teeth(9, 3.8, 0.42, 0.18, true, 13, 0.2, 0.7).translate(0, top + 2.6, C.z + 1.95), teeth(9, 3.8, 0.4, 0.18, false, 15, 0.2, 0.7).translate(0, top + 2.0, C.z + 1.95),
  ];
  const side = [];
  for (const s of [-1, 1]) { // the side maws: jaws bulging out past the pillars, turned half toward the viewer
    const at = (g) => g.rotateY(s * 0.75).translate(s * (B.w + 1.0), ym - 0.2, C.z + 0.8);
    side.push(at(disc(1.2, 1.7, 0, 0, 0)));
    for (const [dy, down, sd] of [[1.3, true, 21], [-1.3, false, 23]]) T.push(at(teeth(4, 2.0, 0.65, 0.3, down, sd + s, 0.7, 0.15).translate(0, dy, 0.25)));
  }
  shrineG.add(tooth(T));
  shrineG.add(prop(engine, merge(side, "side maws"), "#000000", "#000000", 0.556));
  const red = [];
  for (const x of [-B.w - 0.1, B.w + 0.1]) for (const z of [zf + 0.1, C.z - B.d]) red.push(new CylinderGeometry(0.38, 0.42, B.h, 14).translate(x, yb + B.h / 2, z));
  red.push(new BoxGeometry(B.w * 2 + 0.8, 0.35, 0.4).translate(0, top - 0.25, zf + 0.15), new BoxGeometry(B.w * 2 + 0.8, 0.2, 0.3).translate(0, top - 0.9, zf + 0.15));
  const lac = prop(engine, merge(red, "pillars"), "#e0461c", "#4a0608", 0.58); lac.material.uniforms.uGloss.value.set(0.5, 80, 0.4, 0); lac.material.uniforms.uEmit.value.set(0.22, 0.03, 0.0); shrineG.add(lac);
  const brk = []; // the bracket band: a row of blocks glowing like embers under the eaves
  for (const [y, n, h, w, dz] of [[top + 0.05, 28, 0.3, B.w + 1.0, 0.5], [top + 0.4, 36, 0.28, B.w + 2.1, 1.1], [top + 0.72, 46, 0.24, B.w + 3.1, 1.7]])
    for (let i = 0; i < n; i++) brk.push(new BoxGeometry(w * 2 / n * 0.62, h, 0.9).translate(-w + w * 2 * (i + 0.5) / n, y, zf + dz));
  for (const [y, w, dz] of [[top + 0.22, B.w + 1.1, 0.4], [top + 0.56, B.w + 2.2, 1.0]]) brk.push(new BoxGeometry(w * 2, 0.08, 0.3).translate(0, y, zf + dz));
    const beam = prop(engine, merge(brk, "brackets"), "#d8401c", "#3a0604", 0.585); beam.material.uniforms.uEmit.value.set(0.32, 0.05, 0.01); shrineG.add(beam);
  const roofs = [hipRoof(6.6, 4.6, 2.3, 1.8).translate(0, top + 0.9, C.z), hipRoof(4.0, 3.0, 1.7, 1.1).translate(0, top + 3.5, C.z)];
  const rf = stone(merge(roofs, "roofs"), "#24403e", "#020606", 0.59, [3, 1.4, 0.6, 0.6]); rf.material.uniforms.uGloss.value.set(0.25, 30, 0.2, 0); shrineG.add(rf);
  const horns = []; // the crown: crescents curling inward, the outer pair from the lower eaves
  for (const [x, y, h, b, r, c] of [[0.9, top + 5.0, 1.8, 0.7, 0.45, 1.3], [2.1, top + 4.2, 2.5, 0.8, 0.6, 1.5], [3.7, top + 2.9, 3.3, 0.85, 0.78, 1.6], [5.8, top + 1.9, 4.2, 0.9, 0.95, 1.6]])
    for (const s of [-1, 1]) horns.push((s < 0 ? flipX(horn(r, h, b, 20, c)) : horn(r, h, b, 20, c)).translate(s * x, y, C.z + (x > 6 ? 1.5 : 0)));
  horns.push(horn(0.3, 2.0, 0, 8, 0).translate(0, top + 5.4, C.z));
  const hm2 = stone(merge(horns, "horns"), "#262c2e", "#020303", 0.6, [3, 2, 0.4, 0.2]); hm2.material.uniforms.uGloss.value.set(0.6, 50, 0.5, 0); shrineG.add(hm2);
  shrineG.add(prop(engine, merge([bareTree([-8.6, hm(-8.6, C.z + 2) - 0.3, C.z + 2], 2.1, 3), bareTree([8.8, hm(8.8, C.z + 1.5) - 0.3, C.z + 1.5], 1.9, 8)], "trees"), "#0a0809", "#010001", 0.61));
  for (const [x, z, w, h, al, sd] of [[0, C.z + 14, 40, 5.0, 0.9, 1], [-8, C.z + 11, 24, 7, 0.6, 2], [9, C.z + 12, 22, 6, 0.6, 3]]) { // mist pooled off the mound
    const ms = mistCard(w, h, "#1d4a48", al * 0.6, sd); ms.position.set(x, -0.2, z); shrineG.add(ms); }
  world.add(shrineG);
  // THE WALLS: two giant curved walls enclosing the viewer, mottled teal grunge, cold slits
  const WC = new Vector3(0, 0, 40), WR = 13;
  const walls = stone(merge([arcWall(WR, 1.6, 0.3, 1.35, 5.0), arcWall(WR, 1.6, -1.35, -0.3, 5.0)].map((g) => g.translate(WC.x, 0, WC.z)), "walls"), "#13403f", "#010607", 0.62, [3, 1.1, 1.15, 0.35]);
  const slitAt = (s) => { const a = s * 0.62; return new Vector3(WC.x + Math.sin(a) * (WR - 0.05), 2.6, WC.z - Math.cos(a) * (WR - 0.05)); };
  const glow = (s) => { const p = slitAt(s); p.lerp(WC.clone().setY(2.6), 0.08); return new Vector4(p.x, p.y, p.z, 3.4); };
  walls.material.uniforms.uGlow0.value.copy(glow(-1)); walls.material.uniforms.uGlow1.value.copy(glow(1)); walls.material.uniforms.uGlowCol.value.set("#5fd6ff").multiplyScalar(1.6);
  world.add(walls);
  const slits = [-1, 1].map((s) => { const p = slitAt(s); return new BoxGeometry(0.9, 4.6, 0.12).rotateY(-s * 0.62).translate(p.x, p.y, p.z); });
  const sl = stone(merge(slits, "slits"), "#bfefff", "#4aa0c8", 0.63, [3, 1.6, 0.35, 0.5]); sl.material.uniforms.uEmit.value.set(0.8, 1.7, 2.4); world.add(sl);
  scene.add(world);
  // the water: a dim, rippled reflection of the shrine only, under an almost opaque black glaze
  const mirror = world.clone(); mirror.scale.y = -1; scene.add(mirror);
  scene.add(new Mesh(new PlaneGeometry(600, 600).rotateX(-Math.PI / 2), new ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vW; ${NOISE}
      void main() { float rip = fbm(vec2(vW.x * 0.25, vW.z * 3.5)), g = fbm(vW.xz * 0.4);
        vec3 c = mix(${V("#010506")}, ${V("#0a2526")}, smoothstep(0.45, 0.85, g) * 0.7);
        gl_FragColor = vec4(c, 0.93 - 0.2 * smoothstep(0.55, 0.8, rip)); }`,
  })));
  const pose = (t) => { // the shot: static, or a 12 degree arc that dollies in toward the gap between the walls
    const u = o.move ? Math.min(1, t / 8) : 0.5, e = u * u * (3 - 2 * u);
    const a = o.move ? (-6 + 12 * e) * Math.PI / 180 : 0, r = o.move ? 84 - 10 * e : 82;
    camera.position.set(C.x + Math.sin(a) * r, 5.4 + (o.move ? 0.6 * e : 0), C.z + Math.cos(a) * r);
    camera.lookAt(C.x, 4.6, C.z);
    sk.position.copy(camera.position);
  };
  pose(0);
  return {
    scene, camera, duration: 8,
    apply() {
      const s = engine.shared;
      // a dim crimson key from the storm in front; a hot red rim from the horizon glow behind
      s.uLightDir.value.set(0.25, 0.55, 0.8).normalize(); s.uLightCol.value.set("#9cc8c0");
      s.uRimDir.value.set(0.0, 0.1, -1).normalize(); s.uRimCol.value.set("#ff2040");
      s.uFog.value.set(0.75, 0.6, 1.6, 18); s.uFogCol.value.set("#0b1617");
    },
    update(t) {
      pose(t);
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
