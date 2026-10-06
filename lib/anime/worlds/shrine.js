// JUJUTSU KAISEN (MAPPA): the Malevolent Shrine, environment only.
// Composition and motifs: sealreferences/IMG_0428. Rendering: MAPPA JJK (style-refs/_owner/jjk-*):
// black and crimson frame, one cyan accent (the slits), hard cel shapes, thick black ink.
// The shot: a low camera in the bone field looking up; the shrine looms over the frame's middle,
// horns breaking the upper third; the red horizon behind it is the KEY (red rims on everything),
// the shadow sides fall to cold cyan-black; curved carved walls enclose the arena, their slits
// leaking cyan light into mist; cumulonimbus masses above, lit crimson from below.
//   sky   baked dome: cel cumulonimbus from the puffs tool, inked lobes, gradient horizon glow, thin bolts
//   3D    three-tier pagoda with a rectangular maw of fangs and molars, lacquer columns, demon horns;
//         an ossuary (skull heaps with broken jaws, ribs, spines, long bones) from the mound to the lens;
//         curved walls with carved bands, pilasters and slits; still black water; mist and haze
import { Group, BoxGeometry, CylinderGeometry, PerspectiveCamera, PlaneGeometry, Scene, Color, Vector3, Vector4 } from "three";
import { paint, painted } from "../sdf.js";
import { bakedDome, V } from "../paint.js";
import { puffBanks, puffUniforms } from "../tools/puffs.js";
import { mistCard } from "../tools/mist.js";
import { arcWall, bareTree, boulder, flipX, hipRoof, horn, longBone, merge, ribs, rng, skull, spine, teeth } from "../kit3d.js";

const CLOUDS = puffBanks(29, [
  [-0.72, -0.16, 0.0, 0.5, 5, 0.12, 0.11],   // the left cumulonimbus tower
  [0.16, 0.72, 0.0, 0.55, 5, 0.12, 0.11],    // the right tower
  [-0.75, 0.75, 0.46, 0.12, 6, 0.25, 0.1],   // the anvil overhang across the top
  [-0.3, 0.3, -0.03, 0.05, 5, 0.0, 0.05],    // a low bank behind the mound
]);
const SHRINE_SKY = /* glsl */ `
  vec3 sky(float az, float el) {
    float y = abs(el);
    vec2 p = vec2(az, y);
    // the horizon glow: a smooth gradient band under the clouds, hottest behind the shrine
    float g = exp(-y * 9.0) * (0.45 + 0.8 * exp(-abs(az) * 3.0)) + exp(-y * 2.2) * exp(-az * az * 14.0) * 0.9;   // and a tall glow column behind the pagoda
    vec3 c = mix(${V("#030006")}, ${V("#a00c26")}, clamp(g, 0.0, 1.0)) + ${V("#ffb0c0")} * exp(-y * 40.0) * exp(-abs(az) * 4.0) * 0.9;
    vec4 f = puffs(p + (vec2(fbm(p * 14.0), fbm(p * 14.0 + 3.0)) - 0.5) * 0.03, 0.03);
    if (f.w > 0.0) {
      vec3 n = f.xyz;
      // light: the glow from below lights the bellies; it grazes the silhouettes facing the shrine; two lightning pockets
      float belly = max(dot(n, normalize(vec3(-p.x * 0.6, -1.0, 0.25))), 0.0) * exp(-y * 4.0);
      vec2 G = vec2(0.0, -0.05); float face = max(dot(normalize(n.xy + 1e-5), normalize(G - p)), 0.0);
      float rimv = smoothstep(0.5, 0.85, 1.0 - n.z) * face * exp(-length(p - G) * 1.6);
      float pk = 0.0;
      for (int i = 0; i < 2; i++) { vec2 L = i == 0 ? vec2(-0.4, 0.26) : vec2(0.42, 0.3); vec3 d = normalize(vec3(L - p, 0.12));
        pk += max(dot(n, d), 0.0) * exp(-length(p - L) / 0.09); }
      float lit = belly * 1.5 + rimv * 1.5 + pk * 1.4 + (fbm(p * 50.0) - 0.5) * 0.25;
      vec3 cc = cel3(lit, 0.42, 1.15, ${V("#050107")}, ${V("#8c0a22")}, ${V("#e8405c")});
      cc = mix(cc, ${V("#ffd0da")} * 1.2, celStep(pk, 1.7));
      // ink: the outer silhouette, the lobes where one billow overlaps another, the light borders
      float lobe = smoothstep(0.25, 0.6, fwidth(n.z) * 6.0);
      float inkL = max(max(isoInk(f.w, 0.5, 2.6), lobe), jaggedInk(lit, 0.42, 1.8, 120.0, p));
      c = mix(c, mix(cc, vec3(0.0), inkL), f.w);
    }
    c += (bolt2(p, vec2(-0.43, 0.13), vec2(-0.39, -0.01), 3.0, ${V("#ff7a90")}) + bolt2(p, vec2(0.39, 0.15), vec2(0.44, -0.01), 7.0, ${V("#ff7a90")})
      + bolt2(p, vec2(0.2, 0.09), vec2(0.17, -0.01), 11.0, ${V("#ff7a90")}) * 0.7) * 0.45;
    return el < 0.0 ? c * 0.1 : c;
  }`;

export function shrine(engine, o = {}) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1180 / 820, 0.1, 1000);
  const C = new Vector3(0, 0, -30), Y0 = 5.6;
  const sk = bakedDome(engine.renderer, SHRINE_SKY, { tools: ["puffs", "lightning", "cel", "ink"], uniforms: puffUniforms(CLOUDS), az: [-0.8, 0.8], el: [-0.3, 0.8], pxPerRad: 1500 });
  scene.add(sk);
  const world = new Group();
  const R = rng(17);
  // a prop: painted cel material, optional grit (uStone), gloss, emission, own rim colour, ink hull
  const part = (geo, col, shade, id, f = {}) => {
    const m = engine.prop(painted(geo, paint(col, shade)), id), u = m.material.uniforms;
    if (f.stone) u.uStone.value.set(...f.stone);
    if (f.gloss) u.uGloss.value.set(...f.gloss);
    if (f.emit) u.uEmit.value.set(...f.emit);
    if (f.rim) u.uRimCol = { value: new Color(f.rim) };
    if (f.ink) engine.ink(m, f.ink);
    world.add(m);
    return m;
  };
  // THE OSSUARY: the mound, and skull heaps running from it to the lens
  const hm = (x, z) => Y0 * Math.sqrt(Math.max(0, 1 - (x / 15) ** 2 - ((z - C.z) / 10) ** 2));
  const rub = [boulder([15, Y0, 10], [0, -0.3, C.z], 1)];
  const bone = [], dark = [];
  const place = (k, s, x, y, z, yaw = (R() - 0.5) * 1.6) => { const tilt = (R() - 0.5) * 0.7;
    for (const [g, out] of [[k.bone, bone], [k.dark, dark]]) if (g) out.push(g.clone().rotateZ(tilt).rotateY(yaw).translate(x, y, z)); };
  const skullAt = (s, x, y, z) => place(skull(s, { jaw: R() > 0.25, broken: R() > 0.5 }), s, x, y + s * 0.6, z);
  // the mound: skulls packed over its surface, rib cages and spines among them
  for (let i = 0; i < 90; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.95, x = Math.cos(a) * r * 15, z = C.z + Math.sin(a) * r * 10;
    skullAt(0.4 + R() * 0.5, x, hm(x, z) - 0.2, z); }
  for (let i = 0; i < 12; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 0.85, x = Math.cos(a) * r * 15, z = C.z + Math.sin(a) * r * 10;
    place(R() < 0.5 ? ribs(1.1 + R() * 0.6, 5) : spine(9, 1.0 + R() * 0.5), 1, x, hm(x, z) - 0.4, z); }
  // the field: heaps (masses, not pebbles) at growing size toward the camera
  const heap = (cx, cz, n, s0, s1, rad, hgt) => {
    rub.push(boulder([rad, hgt * 0.7, rad * 0.8], [cx, -hgt * 0.15, cz], cx * 7 + cz));
    for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()), x = cx + Math.cos(a) * r * rad, z = cz + Math.sin(a) * r * rad * 0.8;
      skullAt(s0 + R() * (s1 - s0), x, hgt * (1 - r * r) * 0.75, z); }
    for (let i = 0; i < n / 4; i++) { const l = rad * (0.5 + R() * 0.6); const g = longBone(l, l * 0.05).bone.rotateZ(Math.PI / 2 * (0.5 + R())).rotateY(R() * 6.28);
      bone.push(g.translate(cx + (R() - 0.5) * rad, hgt * 0.4 + R() * 0.3, cz + (R() - 0.5) * rad)); }
  };
  for (const [cx, cz, n, s0, s1, rad, hgt] of [
    [-11, -16, 22, 0.35, 0.6, 4.5, 2.2], [10, -15, 22, 0.35, 0.6, 4.5, 2.4], [-4, -10, 14, 0.4, 0.6, 3.2, 1.6], [5, -8, 14, 0.4, 0.7, 3.0, 1.5],
    [-12, -4, 16, 0.5, 0.8, 4.0, 2.2], [13, -3, 16, 0.5, 0.8, 4.0, 2.4], [-7, 4, 10, 0.6, 1.0, 3.0, 1.8], [8, 5, 10, 0.6, 1.0, 3.0, 1.9],
    [-6.5, 7.5, 7, 0.55, 0.85, 2.4, 1.3], [7.0, 8, 7, 0.6, 0.9, 2.4, 1.4]]) heap(cx, cz, n, s0, s1, rad, hgt);
  for (let i = 0; i < 10; i++) place(R() < 0.5 ? ribs(1.2 + R() * 0.8, 5) : spine(10, 1.2 + R() * 0.5), 1, (R() - 0.5) * 26, 0.0, -18 + R() * 24);
  part(merge(rub, "heaps"), "#14191a", "#020304", 0.5, { stone: [3, 0.8, 0.35, 0.2] });
  part(merge(bone, "bones"), "#c9c2ad", "#26383b", 0.51, { ink: 0.9 });
  part(merge(dark, "sockets"), "#030203", "#000000", 0.511);
  // THE PAGODA
  const B = { w: 2.9, d: 2.4, h: 6.4 }, zf = C.z + B.d, yb = Y0 + 0.9, top = yb + B.h, ym = yb + B.h * 0.5;
  part(merge([new BoxGeometry(9, 0.9, 6.6).translate(0, Y0 + 0.45, C.z), new BoxGeometry(B.w * 2, B.h, B.d * 2).translate(0, yb + B.h / 2, C.z)], "body"),
    "#1b2424", "#030707", 0.55, { stone: [3, 0.9, 0.3, 0.3], ink: 1 });
  // the maw: a rectangular doorway, black inside, dark gums, two rows of teeth per jaw (molars, corner fangs, a back row)
  const MW = 4.4, MH = 5.0;
  part(new BoxGeometry(MW, MH, 0.1).translate(0, ym, zf + 0.03), "#000000", "#000000", 0.556);
  part(merge([new BoxGeometry(MW, 0.6, 0.5).translate(0, ym + MH / 2 - 0.3, zf + 0.2), new BoxGeometry(MW, 0.6, 0.5).translate(0, ym - MH / 2 + 0.3, zf + 0.2)], "gums"), "#5a0a18", "#1a0208", 0.555, { ink: 0.8 });
  const T = [];
  for (const s of [1, -1]) { const down = s > 0, y = ym + s * (MH / 2 - 0.6);
    T.push(teeth(6, 3.9, 1.25, 0.5, down, 3 + s, 0.12, 0.2).translate(0, y, zf + 0.42));
    T.push(teeth(2, 6.4, 1.8, 0.5, down, 13 + s, 0, 0.95).translate(0, y, zf + 0.5));
    T.push(teeth(7, 3.6, 0.95, 0.38, down, 23 + s, 0.08, 0.7).translate(0, y, zf + 0.12)); }
  part(merge(T, "teeth"), "#f0f4e8", "#8fb3ab", 0.57, { gloss: [1.0, 50, 0.0, 0], emit: [0.04, 0.09, 0.09], ink: 0.9 });
  // lacquer columns, a heavy lintel and tie beam, a bold ember band under the eaves
  const red = [];
  for (const x of [-B.w - 0.3, B.w + 0.3]) for (const z of [zf + 0.15, C.z - B.d + 0.2]) red.push(new CylinderGeometry(0.62, 0.68, B.h, 18).translate(x, yb + B.h / 2, z));
  red.push(new BoxGeometry(B.w * 2 + 2.0, 0.8, 0.9).translate(0, top + 0.1, zf + 0.15), new BoxGeometry(B.w * 2 + 0.8, 0.4, 0.6).translate(0, top - 1.0, zf + 0.15));
  part(merge(red, "columns"), "#ff4a26", "#4a0410", 0.58, { gloss: [0.6, 30, 0.0, 0], ink: 1 });
  part(new BoxGeometry(B.w * 2 + 2.6, 0.45, B.d * 2 + 1.8).translate(0, top + 0.72, C.z), "#ff5a24", "#5a0c06", 0.585, { emit: [0.3, 0.05, 0.0], ink: 0.8 });
  // three hip-roof tiers with upturned eave tips, storeys between, a small toothed maw in the second storey
  const r1 = top + 0.9;
  const roofs = [hipRoof(B.w + 3.3, B.d + 2.5, 2.0, 1.5).translate(0, r1, C.z), hipRoof(4.6, 3.6, 1.6, 1.1).translate(0, r1 + 2.5, C.z), hipRoof(3.2, 2.6, 1.4, 0.9).translate(0, r1 + 4.3, C.z),
    new BoxGeometry(4.0, 1.6, 3.0).translate(0, r1 + 1.8, C.z), new BoxGeometry(2.6, 1.2, 2.0).translate(0, r1 + 3.8, C.z)];
  part(merge(roofs, "roofs"), "#2a3434", "#030606", 0.59, { rim: "#7fe6ff", ink: 1 });
  part(new BoxGeometry(2.8, 0.8, 0.08).translate(0, r1 + 1.8, C.z + 1.52), "#000000", "#000000", 0.556);
  part(merge([teeth(6, 2.6, 0.4, 0.2, true, 31, 0.1, 0.4).translate(0, r1 + 2.18, C.z + 1.6), teeth(6, 2.6, 0.36, 0.2, false, 33, 0.1, 0.4).translate(0, r1 + 1.42, C.z + 1.6)], "gable teeth"),
    "#f0f4e8", "#8fb3ab", 0.571, { gloss: [1.0, 50, 0.0, 0], emit: [0.04, 0.09, 0.09], ink: 0.7 });
  // solid demon horns: thick at the root, tapering, sweeping outward
  const horns = [];
  for (const [x, y, h, r, b] of [[0.8, r1 + 5.2, 3.6, 0.7, 0.5], [3.4, r1 + 2.9, 3.0, 0.6, 0.55], [5.6, r1 + 1.2, 4.0, 0.85, 0.6]])
    for (const s of [-1, 1]) horns.push((s < 0 ? flipX(horn(r, h, b, 16, 0)) : horn(r, h, b, 16, 0)).translate(s * x, y, C.z));
  part(merge(horns, "horns"), "#3a3c40", "#040506", 0.6, { gloss: [0.7, 30, 0.0, 0], rim: "#7fe6ff", ink: 1 });
  part(merge([bareTree([-8.4, hm(-8.4, C.z + 2) - 0.3, C.z + 2], 2.0, 3), bareTree([8.6, hm(8.6, C.z + 1.5) - 0.3, C.z + 1.5], 1.8, 8)], "trees"), "#0a0809", "#010001", 0.61, { ink: 0.6 });
  // THE WALLS: a ring between the lens and the shrine's far side, open behind the shrine; carved bands,
  // pilasters and a coping make the curve recede; the slits leak cyan light into mist
  const WC = new Vector3(0, 0, -10), WR = 40, A0 = 0.3, A1 = 1.5, SL = 0.55, H = 16;
  const at = (g) => g.translate(WC.x, 0, WC.z);
  const both = (f) => [f(1), f(-1)].flat();
  const arc = (r, t, h, y, a0 = A0, a1 = A1) => both((s) => arcWall(r, t, s > 0 ? a0 : -a1, s > 0 ? a1 : -a0, h).translate(0, y, 0));
  const pil = [];
  for (const s of [-1, 1]) for (let a = A0 + 0.03; a < A1; a += 0.11) if (Math.abs(a - SL) > 0.05) pil.push(new BoxGeometry(1.4, H, 1.0).rotateY(-s * a).translate(s * Math.sin(a) * (WR - 0.4), H / 2, -Math.cos(a) * (WR - 0.4)));
  const walls = part(merge([...arc(WR, 2, H, 0), ...pil].map(at), "walls"), "#123a3a", "#020b0c", 0.62, { stone: [3, 0.7, 0.5, 0.3], ink: 0.8 });
  part(merge([...arc(WR - 0.7, 0.8, 0.7, 3.0), ...arc(WR - 0.7, 0.8, 0.7, 8.0), ...arc(WR - 0.9, 2.6, 1.1, H)].map(at), "carved bands"), "#1d5250", "#03100f", 0.625, { stone: [3, 1.0, 0.4, 0.1], ink: 0.8 });
  const slitAt = (s, y) => new Vector3(WC.x + s * Math.sin(SL) * (WR - 0.1), y, WC.z - Math.cos(SL) * (WR - 0.1));
  const glow = (s) => { const p = slitAt(s, 7).lerp(WC.clone().setY(7), 0.06); return new Vector4(p.x, p.y, p.z, 7); };
  walls.material.uniforms.uGlow0.value.copy(glow(-1)); walls.material.uniforms.uGlow1.value.copy(glow(1)); walls.material.uniforms.uGlowCol.value.set("#5fd6ff");
  const slits = [-1, 1].map((s) => { const p = slitAt(s, 7.5); return new BoxGeometry(0.9, 12, 0.2).rotateY(-s * SL).translate(p.x, p.y, p.z); });
  part(merge(slits, "slits"), "#9fefff", "#2a8ab0", 0.63, { stone: [3, 1.2, 0.3, 0.4], emit: [0.15, 1.3, 2.4] });
  for (const s of [-1, 1]) for (const [w, h, a, sd] of [[5, 15, 0.55, 1], [11, 13, 0.3, 2]]) { // light leaking into mist in front of each slit
    const leak = mistCard(w, h, new Color(0.5, 2.0, 3.0), a, sd + s * 3), p = slitAt(s, 0).lerp(WC.clone().setY(0), 0.05);
    leak.position.copy(p); leak.rotation.y = -s * SL; world.add(leak); }
  // still black water, no reflection; mist pooled at the mound base
  part(new PlaneGeometry(600, 600).rotateX(-Math.PI / 2), "#030405", "#010203", 0.3);
  for (const [x, z, w, h, a, sd] of [[0, C.z + 11, 40, 4, 0.65, 4], [-10, C.z + 16, 18, 3, 0.5, 5], [11, C.z + 15, 18, 3, 0.5, 6]]) {
    const m = mistCard(w, h, "#2a1a24", a, sd); m.position.set(x, 0, z); world.add(m); }
  scene.add(world);
  if (engine.composer) engine.composer.dof = [46, 7, 1];       // focus on the shrine: near skulls and the far walls soften
  const pose = (t) => { // static, or a 16 degree arc that creeps in through the bones
    const u = o.move ? Math.min(1, t / 8) : 0.5, e = u * u * (3 - 2 * u);
    const a = o.move ? (-8 + 16 * e) * Math.PI / 180 : 0, r = o.move ? 48 - 6 * e : 46;
    camera.position.set(C.x + Math.sin(a) * r, 1.6 + (o.move ? 0.4 * e : 0), C.z + Math.cos(a) * r);
    camera.lookAt(C.x, 11, C.z);
    sk.position.copy(camera.position);
  };
  pose(0);
  return {
    scene, camera, duration: 8,
    apply() {
      const s = engine.shared;
      // the KEY is the red horizon behind the shrine: tops and backs lit red, the faces toward us in cold shadow
      s.uLightDir.value.set(0.0, 0.35, -1).normalize(); s.uLightCol.value.set("#ff4050");
      s.uRimDir.value.set(0.0, 0.25, -1).normalize(); s.uRimCol.value.set("#ff2a40");
      s.uFog.value.set(0.45, 0.3, 1.2, 20); s.uFogCol.value.set("#160a12");
    },
    update(t) { pose(t); },
  };
}
