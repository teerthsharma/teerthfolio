// JUJUTSU KAISEN (MAPPA): the Malevolent Shrine, environment only.
// Canonical target: style-refs/_owner/jjk-shrine-ANIME-FRAME.webp (MAPPA's frame); asset detail bar: the
// owner's 3D render of the same shrine (pink gums, lanterns, skull ornaments, bull skulls, rocks).
// How the frame is built (see ENGINE-NOTES "How the reference was made"): an eye-level frontal shot
// whose horizon is the water line, so the lower half is the shrine's exact mirror; a curved tiled
// wall rings the viewer below the horizon and is SCREENED over that reflection (the anime composites
// it as a light layer), with tall blue light columns; the sky is black with red veined smoke.
// Units: metres; the camera sits on the mirror plane (y = 0) looking down -z at the shrine.
import { Group, BoxGeometry, CircleGeometry, CylinderGeometry, PerspectiveCamera, Scene, SphereGeometry, TorusGeometry, Vector3, Vector4 } from "three";
import { paint, painted } from "../sdf.js";
import { bakedDome, V } from "../paint.js";
import { arcWall, bareTree, boulder, flipX, gableRoof, gumArc, hipRoof, horn, longBone, merge, rng, skull, teeth } from "../kit3d.js";

// black sky, red veined smoke, a red-to-teal mist band on the horizon; below the horizon its mirror, dimmed
const SHRINE_SKY = /* glsl */ `
  vec3 sky(float az, float el) {
    float y = abs(el);
    vec2 p = vec2(az, y);
    vec2 v1 = veins(p, 2.3, 1.15, 3.0), v2 = veins(p * 1.6 + 5.0, 2.3, 1.0, 9.0);
    float fade = 0.55 + 0.45 * smoothstep(0.02, 0.12, y);                    // the smoke thins into the horizon mist
    float reach = smoothstep(0.0, 0.5, y) * 0.6 + 0.4 * smoothstep(0.15, 0.5, abs(az));    // veins gather high and to the sides
    vec3 c = ${V("#010001")} + ${V("#0c0103")} * v1.y * 0.3 + (${V("#b80e24")} * v1.x * 0.55 + ${V("#7a0818")} * v2.x * 0.3) * fade * reach;
    // the horizon band: teal-white mist at the waterline (strongest on the left), crimson haze above it
    float band = exp(-y / 0.028), low = exp(-y / 0.012);
    c += ${V("#8a0a20")} * band * 0.5 * (0.5 + 0.5 * fbm(p * vec2(6.0, 30.0)));
    c += ${V("#7fc6cc")} * low * 0.3 * (0.15 + 0.85 * smoothstep(0.2, -0.6, az)) * (0.5 + 0.7 * fbm(p * vec2(7.0, 25.0)));
    return el < 0.0 ? c * 0.15 : c;
  }`;

// SCREEN blend that keeps the target alpha (the set id): result = src + dst (1 - src)
const screen = (m) => Object.assign(m.material, { transparent: true, depthWrite: false, blending: 5, blendSrc: 201, blendDst: 203, blendSrcAlpha: 200, blendDstAlpha: 201 });

export function shrine(engine, o = {}) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(43, 1180 / 820, 0.1, 1000);   // vertical fov from the frame's floor line
  const C = new Vector3(0, 0, -51);
  const sk = bakedDome(engine.renderer, SHRINE_SKY, { tools: ["veins"], az: [-0.75, 0.75], el: [-0.5, 0.5], pxPerRad: 1600 });
  scene.add(sk);
  const shrineG = new Group(), walls = new Group();
  const R = rng(17);
  const part = (g, geo, col, shade, id, f = {}) => {
    const m = engine.prop(painted(geo, paint(col, shade)), id), u = m.material.uniforms;
    if (f.stone) u.uStone.value.set(...f.stone);
    if (f.gloss) u.uGloss.value.set(...f.gloss);
    if (f.emit) u.uEmit.value.set(...f.emit);
    g.add(m);
    return m;
  };
  const S = (geo, col, shade, id, f) => part(shrineG, geo, col, shade, id, f);
  // THE MOUND: a low dark heap of rock, bone and debris at the waterline, teal-black
  const hm = (x, z) => 1.6 * Math.sqrt(Math.max(0, 1 - (x / 12.6) ** 2 - ((z - C.z) / 5) ** 2));
  const rub = [boulder([12.6, 1.6, 5], [0, -0.1, C.z], 1)], bone = [], dark = [];
  for (let i = 0; i < 140; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.98, x = Math.cos(a) * r * 12.6, z = C.z + Math.sin(a) * r * 5, s = 0.25 + R() ** 2 * 0.9;
    rub.push(boulder([s * 1.2, s * 0.9, s], [x, hm(x, z) - s * 0.3, z], i + 2)); }
  for (let i = 0; i < 70; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.95, x = Math.cos(a) * r * 12.6, z = C.z + Math.sin(a) * r * 5, s = 0.18 + R() * 0.2;
    const k = skull(s, { broken: R() > 0.5 }), yaw = (R() - 0.5) * 1.6;
    bone.push(k.bone.rotateY(yaw).translate(x, hm(x, z) + s * 0.5, z)); dark.push(k.dark.rotateY(yaw).translate(x, hm(x, z) + s * 0.5, z)); }
  for (let i = 0; i < 60; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.95, x = Math.cos(a) * r * 12.6, z = C.z + Math.sin(a) * r * 5;
    bone.push(longBone(0.6 + R() * 1.2, 0.05).bone.rotateZ(Math.PI / 2 * (0.4 + R())).rotateY(R() * 6.28).translate(x, hm(x, z), z)); }
  S(merge(rub, "heap"), "#1d3634", "#030807", 0.5, { stone: [3, 1.6, 1.0, 0.2] });
  S(merge(bone, "bones"), "#6f8a84", "#0c1a18", 0.51, { stone: [3, 3, 0.5, 0.1] });
  S(merge(dark, "sockets"), "#020303", "#000000", 0.511);
  // THE PAGODA (heights read off the frame: pillars 1.7 to 7.8, ember band to 10.8, gable apex 14.1, horn tips ~16)
  const zf = C.z + 2.4;
  S(merge([new BoxGeometry(11, 0.4, 6.4).translate(0, 1.5, C.z), new BoxGeometry(9.2, 6.2, 4.6).translate(0, 4.8, C.z - 0.1)], "body"), "#141a1b", "#020303", 0.55, { stone: [3, 1.2, 0.6, 0.3] });
  S(new BoxGeometry(8.6, 6.1, 0.1).translate(0, 4.75, zf + 0.02), "#000000", "#000000", 0.556);       // the black doorway
  // the great mouth: two rows of human teeth per jaw on pink gums, curved like an open mouth
  const T = [], G = [];
  const mouth = (span, arc, rt, len, n, yU, yL, z, sd, xf = (g) => g) => {
    for (const [down, y, s] of [[true, yU, 1], [false, yL, -1]]) {
      T.push(xf(teeth(n, span, len, rt, down, sd + s, arc, 0.05).translate(0, y, z + 0.2)));
      T.push(xf(teeth(n + 1, span * 0.9, len * 0.75, rt * 0.8, down, sd + 10 + s, arc, 0.1).translate(0, y - s * 0.05, z - 0.25)));
      G.push(xf(gumArc(span * 1.04, arc, rt * 0.75, down).translate(0, y + s * rt * 0.35, z)));
    }
  };
  mouth(5.6, 0.8, 0.42, 1.05, 9, 6.85, 2.05, zf + 0.3, 3);
  for (const s of [-1, 1]) mouth(2.6, 0.9, 0.3, 0.7, 5, 5.7, 3.4, 0, 40 + s, (g) => g.rotateY(s * 1.05).translate(s * 5.9, 0, C.z + 0.4));   // the side mouths
  S(merge(T, "teeth"), "#dff4ee", "#2f6e6a", 0.57, { gloss: [0.9, 60, 0.3, 0], emit: [0.03, 0.12, 0.12] });
  S(merge(G, "gums"), "#6a2636", "#24060e", 0.555, { gloss: [0.6, 40, 0.2, 0] });
  T.length = 0; G.length = 0;
  mouth(1.9, 0.5, 0.17, 0.36, 6, 12.55, 11.75, C.z + 3.95, 60);                                                   // the crest mouth in the gable: it glows teal
  S(merge(T, "crest teeth"), "#e6fffa", "#5ab8b0", 0.572, { emit: [0.25, 0.9, 0.85] });
  S(merge(G, "crest gums"), "#9a4456", "#3a0c18", 0.556);
  S(merge([new SphereGeometry(1, 24, 12).scale(1.3, 0.8, 0.3).translate(0, 12.15, C.z + 3.75)], "crest maw"), "#000000", "#000000", 0.556);
  // red lacquer: pillars with carved corbels, the beams; the ember bracket band (it glows warm)
  const red = [];
  for (const x of [-4.9, 4.9]) { red.push(new CylinderGeometry(0.55, 0.6, 6.2, 18).translate(x, 4.8, zf + 0.3), new BoxGeometry(1.5, 0.9, 1.0).translate(x, 7.9, zf + 0.3),
    new TorusGeometry(0.45, 0.14, 8, 16).translate(x, 7.9, zf + 0.85), new CylinderGeometry(0.55, 0.6, 6.2, 18).translate(x, 4.8, C.z - 2.3)); }
  red.push(new BoxGeometry(11.2, 0.55, 0.7).translate(0, 8.3, zf + 0.3), new BoxGeometry(10.2, 0.3, 0.5).translate(0, 7.55, zf + 0.3));
  S(merge(red, "lacquer"), "#d8381a", "#4a0610", 0.58, { gloss: [0.5, 40, 0.3, 0], emit: [0.3, 0.035, 0.0] });
  const brk = [];
  for (const [y, w, n, dz] of [[8.85, 5.6, 30, 0.7], [9.2, 6.6, 36, 1.2], [9.55, 7.6, 42, 1.7], [9.9, 8.6, 48, 2.2]]) {
    for (let i = 0; i < n; i++) brk.push(new BoxGeometry(w * 2 / n * 0.75, 0.32, 0.9).translate(-w + w * 2 * (i + 0.5) / n, y, zf + dz - 0.4));
    brk.push(new BoxGeometry(w * 2, 0.08, 0.5).translate(0, y + 0.22, zf + dz - 0.4)); }
  const bk = S(merge(brk, "brackets"), "#c8461e", "#4a0e04", 0.585, { emit: [0.4, 0.1, 0.01] });
  bk.material.uniforms.uGlow0.value.set(0, 9.6, zf + 2.6, 3.2); bk.material.uniforms.uGlowCol.value.set("#ffb040");   // the warm light at the band's centre
  // the roof: a skirt of upturned eaves and a gable carrying the crest mouth, dark teal tiles
  const rf = S(merge([hipRoof(10.2, 5.4, 0.55, 1.7).translate(0, 10.15, C.z), gableRoof(6.6, 3.0, 3.9, 0.4, 0.8).translate(0, 10.6, C.z)], "roof"), "#12382f", "#010302", 0.59, { stone: [4, 2.6, 0.9, 0.6] });
  rf.material.uniforms.uGlow0.value.set(0, 9.4, zf + 2.6, 5.5); rf.material.uniforms.uGlowCol.value.set("#ff7a2a");   // the band lights the eave soffit
  // the crown: crescents opening inward (outer and middle pairs), a small inner pair and a ringed finial
  const horns = [];
  for (const [x, y, h, r, b, c] of [[6.9, 10.6, 5.8, 0.85, 0.72, 1.65], [4.4, 11.9, 4.6, 0.66, 0.7, 1.6], [1.6, 13.6, 2.2, 0.4, 0.9, 0]])
    for (const s of [-1, 1]) horns.push((s < 0 ? flipX(horn(r, h, b, 24, c, 0.06)) : horn(r, h, b, 24, c, 0.06)).translate(s * x, y, C.z + 0.3));
  horns.push(new CylinderGeometry(0.12, 0.2, 1.2, 8).translate(0, 14.6, C.z), new TorusGeometry(0.4, 0.09, 8, 20).translate(0, 15.0, C.z));
  S(merge(horns, "horns"), "#9aa6c8", "#0a0c16", 0.6, { gloss: [0.9, 50, 0.6, 0] });
  S(merge([bareTree([-7.3, 1.2, C.z + 1.0], 1.5, 3), bareTree([7.4, 1.2, C.z + 1.0], 1.4, 8)], "trees"), "#100c0a", "#020101", 0.61);
  shrineG.scale.x = 0.88; scene.add(shrineG);   // the frame's shrine is narrower than its height suggests
  const mirror = shrineG.clone(); mirror.scale.y = -1; scene.add(mirror);   // the water line is the horizon
  // THE WALL: a ring around the viewer below the horizon, tiled teal grunge, screened over the reflection
  const WR = 14, top = -0.03, H = 4.6;
  // outer panels bright cyan-teal grunge; the centre between the columns darker, so the reflection reads through it
  const wall = part(walls, merge([arcWall(WR, 1.2, 0.3, 1.45, H, 48), arcWall(WR, 1.2, -1.45, -0.3, H, 48)].map((g) => g.translate(0, top - H, 0)), "outer wall"), "#36c4d0", "#000304", 0.62, { stone: [4, 1.3, 1.6, 0.55] });
  const mid = part(walls, arcWall(WR, 1.2, -0.3, 0.3, H, 24).translate(0, top - H, 0), "#0d3a40", "#000203", 0.62, { stone: [4, 1.3, 1.6, 0.55] });
  screen(wall); screen(mid);
  const colAt = (s) => s * 0.34;
  const glow = (s) => new Vector4(Math.sin(colAt(s)) * (WR - 0.6), top - H / 2, -Math.cos(colAt(s)) * (WR - 0.6), 3.0);
  for (const w of [wall, mid]) { w.material.uniforms.uGlow0.value.copy(glow(-1)); w.material.uniforms.uGlow1.value.copy(glow(1)); w.material.uniforms.uGlowCol.value.set("#2f8cff"); }
  const cols = [], pil = [];
  for (const s of [-1, 1]) { const a = colAt(s);
    cols.push(new BoxGeometry(0.75, H, 0.2).rotateY(-a).translate(Math.sin(a) * (WR - 0.15), top - H / 2, -Math.cos(a) * (WR - 0.15)));
    const b = a - s * 0.07; pil.push(new BoxGeometry(0.8, H, 0.5).rotateY(-b).translate(Math.sin(b) * (WR - 0.3), top - H / 2, -Math.cos(b) * (WR - 0.3))); }
  part(walls, merge(cols, "light columns"), "#7ab8ff", "#204a90", 0.63, { stone: [3, 1.6, 1.0, 0.3], emit: [0.3, 0.9, 2.0] });
  part(walls, merge(pil, "pilasters"), "#0a2226", "#010304", 0.64, { stone: [3, 1.2, 1.0, 0.2] });
  part(walls, new CircleGeometry(WR, 64).rotateX(-Math.PI / 2).translate(0, top - H, 0), "#1f4a2a", "#050c07", 0.3, { stone: [4, 0.8, 0.8, 0.5] });   // dim green floor tiles
  walls.position.set(C.x, 0, C.z + 59); scene.add(walls);   // the ring is centred on the viewer mark
  const pose = (t) => { // static, or a 10 degree arc that dollies toward the shrine
    const u = o.move ? Math.min(1, t / 8) : 0.5, e = u * u * (3 - 2 * u);
    const a = o.move ? (-5 + 10 * e) * Math.PI / 180 : 0, r = o.move ? 61 - 6 * e : 59;
    camera.position.set(C.x + Math.sin(a) * r, 0.05, C.z + Math.cos(a) * r);
    camera.lookAt(C.x, 0.05, C.z);
    sk.position.copy(camera.position);
  };
  pose(0);
  return {
    scene, camera, duration: 8,
    apply() {
      const s = engine.shared;
      s.uLightDir.value.set(0.15, 0.55, 0.8).normalize(); s.uLightCol.value.set("#b8c8cc");
      s.uRimDir.value.set(0.0, 0.2, -1).normalize(); s.uRimCol.value.set("#ff2a40");
      s.uFog.value.set(0, 0, 1, 10);   // no height fog: the frame is clean to the waterline
    },
    update(t) { pose(t); },
  };
}
