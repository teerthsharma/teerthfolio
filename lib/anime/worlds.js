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
import { painting, bakedDome, KIT_PUFFS, KIT_STORM, puffBanks, puffUniforms } from "./paint.js";
import { bareTree, boulder, flipX, hipRoof, horn, merge, rng, teeth } from "./kit3d.js";
import FRIEREN from "./paintings/frieren.js";

// hex (sRGB) -> GLSL vec3 in linear light
const V = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
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
// Target: sealreferences/IMG_0428-scaled.webp. Split: the storm sky (with the horizon glow and the
// lightning pockets) is a painted dome baked once; the shrine, teeth, horns, roof, rubble mound,
// dead trees, stone walls and light slits are 3D with grit / gloss / fog, mirrored in black water.
const SHRINE_SKY = /* glsl */ `
  vec3 sky(float az, float el) {
    float y = abs(el);
    vec2 p = vec2(az, y);
    // behind the masses: near-black red, a hot glow low behind the shrine, faint far storm texture
    vec3 c = mix(${V("#7a0818")}, ${V("#030001")}, smoothstep(0.02, 0.2, y));
    c = mix(c, ${V("#2a0409")}, smoothstep(0.5, 0.75, fbm(p * vec2(7.0, 16.0))) * 0.5);
    c += ${V("#ff2a4a")} * 1.3 * exp(-y * 28.0) * exp(-abs(az) * 4.0);
    // the cumulonimbus: billows lit from below by the domain glow and from inside by two lightning pockets
    vec4 pf = puffs(p, 0.022);
    if (pf.w > 0.0) {
      vec3 n = pf.xyz;
      vec2 L1 = vec2(-0.3, 0.17), L2 = vec2(0.33, 0.15);
      float l0 = max(dot(n, normalize(vec3(-p.x * 0.8, -1.0, 0.15))), 0.0) * exp(-y * 4.0);
      float l1 = max(dot(n, normalize(vec3(L1 - p, 0.08))), 0.0) * exp(-length(p - L1) * 6.0);
      float l2 = max(dot(n, normalize(vec3(L2 - p, 0.08))), 0.0) * exp(-length(p - L2) * 6.0);
      float tex = fbm(p * 90.0) - 0.5, tex2 = fbm(p * 25.0) - 0.5;
      float lit = l0 * 1.25 + l1 * 1.5 + l2 * 1.4 + tex * 0.4 + tex2 * 0.35;
      vec3 cc = mix(${V("#020001")}, ${V("#3a030c")}, smoothstep(0.2, 0.5, lit));
      cc = mix(cc, ${V("#c8102e")}, smoothstep(0.6, 0.95, lit));
      cc = mix(cc, ${V("#ff6a82")} * 1.25, smoothstep(1.1, 1.5, lit));
      c = mix(c, cc, pf.w);
    }
    c += (bolt2(p, vec2(-0.36, 0.26), vec2(-0.3, 0.03), 3.0, ${V("#ff3a5a")}) + bolt2(p, vec2(0.38, 0.25), vec2(0.33, 0.04), 7.0, ${V("#ff3a5a")})) * 0.7;
    return el < 0.0 ? c * 0.5 : c;
  }`;
const SHRINE_PUFFS = puffBanks(23, [[-0.85, -0.04, 0.12, 0.32, 9, 0.1, 0.068], [0.04, 0.85, 0.11, 0.32, 9, 0.1, 0.068], [-0.85, -0.2, 0.02, 0.05, 5, 0.0, 0.03], [0.2, 0.85, 0.02, 0.05, 5, 0.0, 0.03]]);

export function shrine(engine, o = {}) {
  const scene = new Scene();
  const camera = cam(32);
  const C = new Vector3(0, 8, -30);
  const sk = bakedDome(engine.renderer, SHRINE_SKY, { kit: KIT_STORM + KIT_PUFFS, uniforms: puffUniforms(SHRINE_PUFFS), az: [-0.85, 0.85], el: [-0.5, 0.6], pxPerRad: 1900 });
  scene.add(sk);
  const world = new Group();
  const R = rng(17);
  const stone = (geo, col, shade, id, st = [1, 0.35, 0.6, 0.5]) => { const m = prop(engine, geo, col, shade, id); m.material.uniforms.uStone.value.set(...st); return m; };
  // the mound: rubble and skulls
  const rub = [];
  for (let i = 0; i < 90; i++) { const a = R() * Math.PI * 2, r = R() * 18, s = 0.8 + R() * 2.4; rub.push(boulder([s * 1.3, s * 0.8, s], [Math.cos(a) * r, Math.max(0, 4.4 - r * 0.33) + R() * 0.8 - 0.6, -30 + Math.sin(a) * r * 0.6], i)); }
  world.add(stone(merge(rub), "#1e2a2a", "#040707", 0.5, [2, 1.2, 0.7, 0.6]));
  const skulls = [];
  for (let i = 0; i < 70; i++) { const a = R() * Math.PI * 2, r = 3 + R() * 10, s = 0.35 + R() * 0.3; skulls.push(new SphereGeometry(s, 10, 8).scale(1, 0.85, 1.1).translate(Math.cos(a) * r, Math.max(0.2, 4.6 - r * 0.33) + 0.3, -30 + Math.sin(a) * r * 0.6)); }
  world.add(stone(merge(skulls), "#8fa8a2", "#1a2a2a", 0.51, [2, 3, 0.5, 0.3]));
  const bones = [];
  for (let i = 0; i < 46; i++) { const a = R() * Math.PI * 2, r = 4 + R() * 13, h = 1 + R() * 2.2; bones.push(horn(0.14 + R() * 0.12, h, (R() - 0.5) * 1.2, 6, 0.6).rotateZ((R() - 0.5) * 1.4).rotateY(R() * 6.28).translate(Math.cos(a) * r, Math.max(0, 4.2 - r * 0.33), -30 + Math.sin(a) * r * 0.6)); }
  world.add(stone(merge(bones, "bones"), "#20282a", "#030505", 0.515, [2, 3, 0.2, 0.2]));
  // the shrine body, the black maw, the teeth
  world.add(stone(new BoxGeometry(9, 7.5, 6).translate(0, 8.2, -30), "#24302f", "#040607", 0.55, [1, 0.6, 0.5, 0.6]));
  world.add(prop(engine, new BoxGeometry(6.6, 5.2, 0.6).translate(0, 8.2, -26.75), "#020202", "#000000", 0.56));
  const tooth = (geo) => { const m = prop(engine, geo, "#5fd8c4", "#1f6a64", 0.57); m.material.uniforms.uGloss.value.set(0.9, 40, 0.15, 0); m.material.uniforms.uEmit.value.set(0.05, 0.32, 0.3); return m; };
  world.add(tooth(teeth(6, 6.2, 1.7, 0.62, true, 3).translate(0, 10.8, -26.2)));
  world.add(tooth(teeth(5, 5.0, 1.3, 0.55, true, 5).translate(0, 10.8, -27.0)));
  world.add(tooth(teeth(6, 6.2, 1.6, 0.62, false, 7).translate(0, 5.6, -26.2)));
  world.add(tooth(teeth(5, 5.0, 1.2, 0.55, false, 9).translate(0, 5.6, -27.0)));
  for (const s of [-1, 1]) world.add(tooth(teeth(3, 3.6, 1.3, 0.55, true, 11 + s).rotateZ(s * Math.PI / 2).translate(s * 3.1, 8.2, -26.4)));
  // red lacquer: pillars and the glowing beams under the eaves
  const red = [];
  for (const x of [-4.3, 4.3]) for (const z of [-26.9, -33]) red.push(new CylinderGeometry(0.45, 0.5, 7.6, 14).translate(x, 8.2, z).toNonIndexed());
  const lac = prop(engine, merge(red), "#e04a24", "#5a0a0e", 0.58); lac.material.uniforms.uGloss.value.set(0.5, 80, 0.4, 0); world.add(lac);
  const beam = prop(engine, merge([new BoxGeometry(13, 0.7, 9).translate(0, 12.2, -30), new BoxGeometry(7.5, 0.5, 5.5).translate(0, 15.7, -30)].map((g) => g.toNonIndexed())), "#ff7a2a", "#8a1a10", 0.585);
  beam.material.uniforms.uEmit.value.set(0.35, 0.06, 0.0); world.add(beam);
  // roofs with upturned eaves, the upper body, horns
  const roofs = [hipRoof(9.2, 6.8, 2.6, 1.6).translate(0, 12.5, -30), new BoxGeometry(5.6, 2.6, 4.2).translate(0, 14.4, -30).toNonIndexed(), hipRoof(5.6, 4.2, 2.0, 1.2).translate(0, 16.0, -30)];
  world.add(stone(merge(roofs), "#2c4644", "#03090a", 0.59, [2, 1.5, 0.3, 0.8]));
  const horns = [];
  // a crown of crescent claws: each sweeps out and curls back in at the tip
  for (const [x, h, b, z] of [[1.2, 5.8, 0.9, -30], [3.0, 4.8, 0.8, -30.6], [4.8, 3.8, 0.7, -29.4], [2.2, 3.4, 0.6, -31.6]]) for (const s of [-1, 1]) horns.push((s < 0 ? flipX(horn(0.55, h, b, 14, 1)) : horn(0.55, h, b, 14, 1)).translate(s * x, 17.4, z));
  world.add(stone(merge(horns), "#3c4648", "#0a0d0e", 0.6, [2, 2, 0.2, 0.2]));
  // dead trees either side of the shrine
  world.add(prop(engine, merge([bareTree([-9, 4, -31], 2.6, 3), bareTree([9.5, 3.6, -30], 2.3, 8)]), "#0c0a0b", "#020102", 0.61));
  // the near stone walls standing in the water, and the cold light slits on them
  const walls = [];
  // the domain's low stone walls flanking the water, teal, lit cold from their light slits
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) walls.push(new BoxGeometry(9.5, 3.6, 2.4).translate(s * (9 + i * 9.6), 1.8, 22 - i * 2.2).rotateY(s * 0.05));
  world.add(stone(merge(walls, "walls"), "#2f8a84", "#0f4a48", 0.62, [1, 0.9, 0.7, 0.65]));
  for (const s of [-1, 1]) { const sl = stone(new BoxGeometry(1.3, 3.3, 0.2).translate(s * 7.6, 1.8, 23.4), "#6fb8d8", "#2a6a88", 0.63, [2, 3, 0.8, 0.9]); sl.material.uniforms.uEmit.value.set(0.25, 0.75, 1.0); world.add(sl); }
  scene.add(world);
  const mirror = world.clone(); mirror.scale.y = -1; scene.add(mirror);
  scene.add(new Mesh(new PlaneGeometry(600, 600).rotateX(-Math.PI / 2), new ShaderMaterial({
    transparent: true, depthWrite: false,
    blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vW; ${NOISE}
      void main() { // teal grunge glaze over the reflection: stained, streaked, rippled
        float s = fbm(vec2(vW.x * 0.12, vW.z * 1.8)), g = fbm(vW.xz * 0.35) * 0.6 + fbm(vW.xz * 1.7) * 0.4;
        vec3 c = mix(${V("#021a1b")}, ${V("#1d6a66")}, smoothstep(0.35, 0.8, g));
        gl_FragColor = vec4(c, mix(0.55, 0.78, smoothstep(0.4, 0.7, g)) - 0.15 * smoothstep(0.62, 0.82, s)); }`,
  })));
  const pose = (t) => { // the shot: static, or a 30 degree arc with a slow dolly when o.move
    const u = o.move ? Math.min(1, t / 8) : 0.5, e = u * u * (3 - 2 * u);
    const a = o.move ? (-15 + 30 * e) * Math.PI / 180 : 0, r = o.move ? 84 - 10 * e : 80;
    camera.position.set(C.x + Math.sin(a) * r, 4 + (o.move ? 1.5 * e : 0), C.z + Math.cos(a) * r);
    camera.lookAt(C.x, 5.5, C.z);
    sk.position.copy(camera.position);
  };
  pose(0);
  return {
    scene, camera, duration: 8,
    apply() {
      const s = engine.shared;
      // a soft front key so the lacquer, the teeth and the stone read; the storm's crimson as a back rim
      s.uLightDir.value.set(0.25, 0.55, 0.8).normalize(); s.uLightCol.value.set("#ff9a9a");
      s.uRimDir.value.set(0.0, 0.35, -1).normalize(); s.uRimCol.value.set("#ff2040");
      s.uFog.value.set(0.9, 0.3, 2.4, 14); s.uFogCol.value.set("#0d1416");
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
