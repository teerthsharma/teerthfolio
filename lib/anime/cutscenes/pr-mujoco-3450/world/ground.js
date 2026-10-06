// THE WASTELAND PLAIN (bible E02): a bare cracked flat, framed low so the sky dominates; ink only on rubble, none on the ground.
//   far plain   a 380 m disc, one shader, layer 0. groundTone(x): two-scale mottle, 3 flat tones (violet shadow / mid / lit):
//                 m = 0.62 fbm(0.32 x + 3) + 0.38 fbm(1.45 x + 9) + 0.10 (vn(7 x) - 0.5)
//                 tone = SHADOW_V; m >= 0.40 -> MID; m >= 0.57 -> LIT; edges AA by fwidth(m). Fades to the blue haze #8d95ad over 60 .. 300 m.
//   shadow card 60 x 60 m cutout (bakeCard): rubble cast shadows as single hard capsule polygons, direction (0.82, 0.57), length 1.4 h,
//                 radius r -> 0.3 r along it; flat #5b5266. Layer 0.
//   crack card  60 x 60 m cutout: 9 wavering cracks (distance to  y = 0.35 sin(1.3 u + k) + 0.18 sin(3.1 u + 2k), tapering 3.5 cm -> 0.8 cm,
//                 4 .. 9 m long) plus a patchy Voronoi hairline net (vor F2-F1 < 0.012, where vn(0.22 x) > 0.62). #3b3340. LAYER 1: its tint
//                 is multiplied up for 4 drawings on the pressure wave (cracks brighten).
//   rubble      5 grounded slabs of 0.3-0.7 m (kit/stones), painted stone material, inked; two dead ahead beyond the thieves, three out at 18-28 m,
//                 none between a camera rig (r <= 15) and the seal.
//   haze        8 low blue mist cards in a ring at 60-140 m (tools/mist), turned to the camera on yaw.
// Card coordinates: the card mesh is rotated -90 deg about x, so local +y -> world -z: xz = ((p.x - .5) 60, (.5 - p.y) 60).
import { ALL, CARD, HEX } from "./palette.js";
import { stones, stoneMaterial } from "../../../kit/stones.js";
import { mistCard } from "../../../paint.js";

const TONE = /* glsl */ `
  vec3 groundTone(vec2 x) {
    float m = 0.62 * fbm(x * 0.32 + 3.0) + 0.38 * fbm(x * 1.45 + 9.0) + 0.10 * (vn(x * 7.0) - 0.5);
    float w = fwidth(m) * 0.9 + 0.003;
    vec3 c = C_gShadowV;
    c = mix(c, C_gMid, smoothstep(0.40 - w, 0.40 + w, m));
    c = mix(c, C_gLit, smoothstep(0.57 - w, 0.57 + w, m));
    return c;
  }`;

const FAR_VS = /* glsl */ `varying vec3 vLP; varying vec3 vWP;
  void main() { vLP = position; vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FAR_FS = (noise) => /* glsl */ `varying vec3 vLP; varying vec3 vWP;
  ${noise} ${ALL} ${TONE}
  void main() {
    vec3 c = groundTone(vLP.xz);
    float dist = length(vWP - cameraPosition);
    c = mix(c, C_haze, smoothstep(60.0, 300.0, dist));
    gl_FragColor = vec4(c, 0.5);
  }`;

const f4 = (n) => n.toFixed(4);

export function rubbleList(ctx) {
  const R = ctx.rng("rubble"), out = [];
  const place = (a, r, big) => {
    const w = 0.3 + 0.4 * R(), h = (0.35 + 0.35 * R()) * (big ? 1 : 0.85);
    out.push({ size: [w * 0.55, h * 0.9, w * 0.5], at: [r * Math.sin(a), 0, r * Math.cos(a)], seed: 3 + out.length * 5, flat: 0.5, sink: 0.3, yaw: R() * 6.28, rr: w * 0.5, h });
  };
  place(0.1, 9.0, true); place(-0.12, 11.5, true);            // dead ahead, past the thieves' arc
  place(-0.9, 19 + 3 * R(), false); place(0.8, 22 + 3 * R(), false); place(0.15, 27 + 2 * R(), true); // out on the plain
  return out;
}

export function buildGround(ctx) {
  const { THREE, engine } = ctx;
  const noise = ctx.tools.glslFor(["noise"]);
  const dispose = [];
  const group = new THREE.Group();

  // far plain
  const fgeo = new THREE.CircleGeometry(380, 96).rotateX(-Math.PI / 2).translate(0, -0.05, 0);
  const fmat = new THREE.ShaderMaterial({ vertexShader: FAR_VS, fragmentShader: FAR_FS(noise) });
  const far = new THREE.Mesh(fgeo, fmat); far.frustumCulled = false; ctx.setLayer(far, 0);
  group.add(far); dispose.push(fgeo, fmat);

  // rubble
  const list = rubbleList(ctx);
  const rgeo = stones(list.map((r) => ({ size: r.size, at: r.at, seed: r.seed, flat: r.flat, sink: r.sink, yaw: r.yaw })), 0.6);
  const rmat = stoneMaterial(engine.shared, { top: HEX.gTop, light: HEX.gLit, mid: HEX.gMid, shadow: HEX.gShadowV, crack: HEX.gDeep, bounce: HEX.gMid, mottle: 0.5 });
  const rub = new THREE.Mesh(rgeo, rmat);
  try { engine.ink(rub, 1); } catch { /* ink hull is optional dressing */ }
  ctx.setLayer(rub, 0); group.add(rub); dispose.push(rgeo, rmat);

  // rubble shadows: single hard polygons
  const rubs = list.map((r) => `vec4(${f4(r.at[0])}, ${f4(r.at[2])}, ${f4(r.rr)}, ${f4(r.h)})`).join(", ");
  const shadowBody = /* glsl */ `
    ${ALL}
    const vec4 RUB[${list.length}] = vec4[${list.length}](${rubs});
    vec4 paint(vec2 p) {
      vec2 x = vec2((p.x - 0.5) * ${CARD}.0, (0.5 - p.y) * ${CARD}.0);
      vec2 D = normalize(vec2(0.82, 0.57));
      float sh = 0.0;
      for (int i = 0; i < ${list.length}; i++) {
        vec2 pa = x - RUB[i].xy; float L = 1.4 * RUB[i].w * 1.7;
        float t = clamp(dot(pa, D) / L, 0.0, 1.0);
        float rad = mix(RUB[i].z, RUB[i].z * 0.3, t);
        sh = max(sh, 1.0 - smoothstep(rad - 0.01, rad, length(pa - D * L * t)));
      }
      return vec4(C_gShadowV, sh);
    }`;
  const shCard = ctx.bake.card(shadowBody, { w: 2048, h: 2048, size: [CARD, CARD], tools: ["noise"], id: 0.5 });
  shCard.rotation.x = -Math.PI / 2; shCard.position.y = 0.0; ctx.setLayer(shCard, 0);
  group.add(shCard); dispose.push(() => shCard.userData.dispose());

  // cracks (layer 1: the tint brightens on the pressure wave)
  const crackBody = /* glsl */ `
    ${ALL}
    vec4 paint(vec2 p) {
      vec2 x = vec2((p.x - 0.5) * ${CARD}.0, (0.5 - p.y) * ${CARD}.0);
      float cr = 0.0;
      for (int i = 0; i < 9; i++) {
        float fi = float(i);
        vec2 hh = h22(vec2(fi * 7.13, 3.7));
        float a = hh.x * 6.2832, rad = 3.0 + 18.0 * hh.y;
        vec2 s0 = vec2(cos(a), sin(a)) * rad;
        float ang = h21(vec2(fi, 9.1)) * 6.2832, len = 4.0 + 5.0 * h21(vec2(fi, 2.2));
        vec2 u = rot(ang) * (x - s0);
        float wav = 0.35 * sin(u.x * 1.3 + fi) + 0.18 * sin(u.x * 3.1 + fi * 2.0);
        float width = 0.035 * (1.0 - clamp(u.x / len, 0.0, 1.0) * 0.77) + 0.002;
        float seg = step(0.0, u.x) * step(u.x, len);
        cr = max(cr, seg * (1.0 - smoothstep(width * 0.6, width, abs(u.y - wav))));
      }
      vec2 v = vor(x * 0.9);
      cr = max(cr, (1.0 - smoothstep(0.0, 0.012, v.y)) * step(0.62, vn(x * 0.22)) * 0.9);
      return vec4(C_gDeep, cr);
    }`;
  const crCard = ctx.bake.card(crackBody, { w: 2048, h: 2048, size: [CARD, CARD], tools: ["noise"], id: 0.5, layer: 1 });
  crCard.rotation.x = -Math.PI / 2; crCard.position.y = 0.02; ctx.setLayer(crCard, 1);
  group.add(crCard); dispose.push(() => crCard.userData.dispose());

  // blue haze banks near the horizon
  const R = ctx.rng("haze"), mists = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.283 + R() * 0.5, r = 60 + 80 * R();
    const m = mistCard(70, 9, HEX.haze, 0.36, 1 + i);
    m.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    m.onBeforeRender = (_r, _s, cam) => {
      const wp = m.getWorldPosition(new THREE.Vector3());
      const py = new THREE.Euler().setFromQuaternion(m.parent.getWorldQuaternion(new THREE.Quaternion()), "YXZ").y; // the world group's yaw
      m.rotation.y = Math.atan2(cam.position.x - wp.x, cam.position.z - wp.z) - py;
      m.updateMatrixWorld(true);
    };
    ctx.setLayer(m, 0); group.add(m); mists.push(m); dispose.push(m.geometry, m.material);
  }
  return {
    group, cracks: crCard,
    dispose() { for (const d of dispose) typeof d === "function" ? d() : d.dispose(); },
  };
}
