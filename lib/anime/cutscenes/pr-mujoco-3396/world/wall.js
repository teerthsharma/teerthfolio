// E04 THE WALL: the hardened skin over the Wall Titans. A 20 m curved slab (front face z_F(x) = -30 - x^2/900, a circle of radius 450
// about (0, 0, -480)), 288 skin plates 2.96 x 2.46 x 0.8 m over the middle 108 m, three carved pup faces 8 m wide at x = -12, 0, +12
// (y = 14.2), a muscle-red core beneath the plates, and an ember crack-glow that leaks through the joints and floods the core as the skin falls.
// The crest stays at 20 m so the shot-4 fly-along (eye 21.5 m) clears it; the colossal titans stand BEHIND the Wall (cast layer).
//
// MATHS
//  arc param: a plate at arc-length x sits at angle th = x / 450;  centre = C + (450.4 + o)(sin th, 0, cos th) + (0, y, 0);  yaw = th.
//  fall (per plate, d0 = |(x, y) - (0, 14.2)|):  t0 = 4.1 + .032 d0 + .1 rj;  e = t - t0;  tf = sqrt((y0 - .45) / 4.9);
//      y = y0 - 4.9 e^2;  o = .9 e + .5 e^2 (it topples outward);  tilt = (e/tf)^1.5 (1.15 + .35 r) rad about the plate's x axis;  roll = .8 r' e.
//      landed: y = .42 + 1.2 cos(tilt), tilt = 1.45 + .15 r, lying face-down so the lit flesh underside #e4b887 shows.
//  tremble f82-96 (3.4-4.0 s): jitter amp .05 sin(pi k) on twos along the normal and up.
//  carved face: height field h(p) = .6 smoothstep(dome) - .5 (eyes) - .3 (nose) - mouth;  shade = .55 - .07 grad h . (-.6, .8): a relief lit from the upper left,
//      three-tone (shade -> mid -> lit), sepia carve lines, craquelure from vor().
//  cornerstone (egg 5): pounce dots on a 3x5 bitmap font spelling 1282 (the cube count) on the plate at (x 4.4, y 8.6); it falls with its plate.
//  crack glow: s = arc metres, h = height;  d = |(s, h - 14.2)|;  reach = uGlow * 70;  a = (line + .35 halo + .7 joint) * (1 - smoothstep(reach-8, reach, d)).
import { BoxGeometry, BufferAttribute, BufferGeometry, CylinderGeometry, DynamicDrawUsage, Group, Mesh, Quaternion, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { V } from "../../../paint.js";
import { hullMaterial } from "../../../material.js";
import { arcWall } from "../../../kit3d.js";
import { paint, painted } from "../../../sdf.js";
import { C, T, additive, cleanGeo, mix, smooth, timing } from "./pal.js";

const RF = 450, THICK = 6, CZ = -480, HW = 20, PW = 2.96, PH = 2.46, COLS = 36, ROWS = 8, PD = 0.8, CROWN = 14.2;
const asinx = Math.asin(54 / RF), asinE = Math.asin(340 / RF);

const FACE = /* glsl */ `
  const vec3 LIT = ${V(C.plateLit)}; const vec3 MID = ${V(C.plateMid)}; const vec3 SHD = ${V(C.violetShade)}; const vec3 DEEP = ${V(C.plateDeep)}; const vec3 SEP = ${V(C.sepia)};
  float head(vec2 p) { return (length((p - vec2(0.5, 0.46)) / vec2(0.40, 0.36)) - 1.0) * 0.36; }
  float eyeSd(vec2 p, float s) { return (length((p - vec2(0.5 + s * 0.17, 0.50)) / vec2(0.075, 0.095)) - 1.0) * 0.075; }
  float noseSd(vec2 p) { return (length((p - vec2(0.5, 0.385)) / vec2(0.04, 0.026)) - 1.0) * 0.026; }
  float tuftSd(vec2 p) { float d = 1e3; for (int i = 0; i < 3; i++) { float fi = float(i); d = min(d, (length((p - vec2(0.42 + fi * 0.08, 0.86 + 0.045 * (1.0 - abs(fi - 1.0)))) / vec2(0.04, 0.07)) - 1.0) * 0.04); } return d; }
  float mouthSd(vec2 p) { float d = 1e3; for (int i = 0; i < 2; i++) { vec2 c = vec2(0.5 + (float(i) - 0.5) * 0.075, 0.325);
      d = min(d, p.y < c.y ? abs(length(p - c) - 0.04) - 0.006 : 1e3); } return d; }
  float height(vec2 p) {
    float h = smoothstep(0.02, -0.08, min(head(p), tuftSd(p))) * 0.6;
    h -= smoothstep(0.012, -0.03, eyeSd(p, -1.0)) * 0.5 + smoothstep(0.012, -0.03, eyeSd(p, 1.0)) * 0.5;
    h -= smoothstep(0.01, -0.015, noseSd(p)) * 0.3 + smoothstep(0.004, -0.004, mouthSd(p)) * 0.3;
    return h;
  }
  vec4 paint(vec2 p) {
    float dh = min(head(p), tuftSd(p));
    if (dh > 0.0) return vec4(0.0);
    float e = 0.004;
    vec2 grad = vec2(height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0)), height(p + vec2(0.0, e)) - height(p - vec2(0.0, e))) / (2.0 * e);
    float sh = clamp(0.55 - 0.07 * dot(grad, vec2(-0.6, 0.8)), 0.0, 1.0);
    vec3 col = sh > 0.5 ? mix(MID, LIT, (sh - 0.5) * 2.0) : mix(SHD, MID, sh * 2.0);
    float lw = 1.3 / 512.0 * 1.4;
    float el = min(eyeSd(p, -1.0), eyeSd(p, 1.0));
    col = mix(col, DEEP, (1.0 - smoothstep(0.0, 0.012, -el)) * step(el, 0.0) * 0.6);           // the carved eye socket is deep
    float pupil = min(length((p - vec2(0.5 - 0.17 + 0.005, 0.495)) / vec2(0.035, 0.05)), length((p - vec2(0.5 + 0.17 + 0.005, 0.495)) / vec2(0.035, 0.05)));
    col = mix(col, SEP, 1.0 - smoothstep(0.9, 1.0, pupil));
    float hl = min(length((p - vec2(0.465, 0.53)) / 0.018), length((p - vec2(0.805, 0.53)) / 0.018));
    col = mix(col, LIT, 1.0 - smoothstep(0.9, 1.0, hl));                                         // the carved catch-light
    float ln = min(min(abs(el), abs(noseSd(p))), min(abs(mouthSd(p)), abs(dh)));
    col = mix(col, SEP, 1.0 - smoothstep(lw * 0.6, lw * 1.2, ln));
    vec2 vc = vor(p * 7.0);
    col = mix(col, SEP, (1.0 - smoothstep(0.0, 0.03, vc.y)) * 0.5);                              // craquelure
    return vec4(col, 1.0);
  }`;

const STONE = /* glsl */ `
  const vec3 MID = ${V(C.plateMid)}; const vec3 LIT = ${V(C.plateLit)}; const vec3 SEP = ${V(C.sepia)};
  float bit(float code, float col) { return mod(floor(code / pow(2.0, 2.0 - col)), 2.0); }
  vec4 paint(vec2 p) {
    vec3 col = mix(MID, LIT, 0.35 + 0.3 * fbm(p * 5.0));
    vec2 vc = vor(p * 4.0);
    col = mix(col, SEP, (1.0 - smoothstep(0.0, 0.025, vc.y)) * 0.35);
    float s = 0.05;
    vec2 q = (p - vec2((1.2083 - 15.0 * s) * 0.5, 0.5 - 2.5 * s)) / s;
    vec2 c = floor(q);
    if (c.x >= 0.0 && c.x < 15.0 && c.y >= 0.0 && c.y < 5.0) {
      float di = floor(c.x / 4.0), cx = c.x - di * 4.0, row = 4.0 - c.y;
      if (cx < 3.0) {
        // 1 2 8 2 -> codes per digit; rows top to bottom
        float code = 0.0;
        if (di < 0.5) code = row < 0.5 ? 2.0 : row < 1.5 ? 6.0 : row < 2.5 ? 2.0 : row < 3.5 ? 2.0 : 7.0;                 // 1
        else if (di < 1.5) code = row < 0.5 ? 7.0 : row < 1.5 ? 1.0 : row < 2.5 ? 7.0 : row < 3.5 ? 4.0 : 7.0;           // 2
        else if (di < 2.5) code = row < 0.5 ? 7.0 : row < 1.5 ? 5.0 : row < 2.5 ? 7.0 : row < 3.5 ? 5.0 : 7.0;           // 8
        else code = row < 0.5 ? 7.0 : row < 1.5 ? 1.0 : row < 2.5 ? 7.0 : row < 3.5 ? 4.0 : 7.0;                          // 2
        if (bit(code, cx) > 0.5) col = mix(col, SEP, 1.0 - smoothstep(0.26, 0.32, length(fract(q) - 0.5)));
      }
    }
    return vec4(col, 1.0);
  }`;

const GLOW_V = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

export function buildWall(ctx) {
  const { THREE, engine } = ctx;
  const R = ctx.rng("wall"), H = timing(ctx);
  const group = new Group();

  // ---- the core: stone skin to the horizons, muscle in the middle (revealed when the plates fall)
  const stone = (a0, a1, seg) => P(arcWall(RF - THICK, THICK, a0, a1, HW, seg).translate(0, 0, CZ), C.plateMid, C.violetShade);
  function P(g, lit, shade) { return painted(cleanGeo(g), paint(lit, shade)); }
  const sides = engine.prop(mergeGeometries([stone(Math.PI + asinx, Math.PI + asinE, 28), stone(Math.PI - asinE, Math.PI - asinx, 28)]), 0.6);
  sides.material.uniforms.uStone.value.set(1, 0.4, 0.45, 0.3);
  const flesh = engine.prop(P(arcWall(RF - THICK, THICK, Math.PI - asinx, Math.PI + asinx, HW, 14).translate(0, 0, CZ), C.muscle, C.muscleShade), 0.6);
  flesh.material.uniforms.uStone.value.set(2, 0.8, 0.7, 0.25);
  group.add(sides, flesh);

  // ---- the skin plates: ONE dynamic geometry (288 boxes, 10,368 vertices), one draw call, with a sepia hull
  const base = new BoxGeometry(PW - 0.06, PH - 0.06, PD).toNonIndexed();
  const bp = base.attributes.position.array, bn = base.attributes.normal.array, VB = bp.length / 3, N = COLS * ROWS;
  const pos = new Float32Array(N * VB * 3), nor = new Float32Array(N * VB * 3), col = new Float32Array(N * VB * 3), shd = new Float32Array(N * VB * 3);
  const xrd = new Float32Array(N * VB * 3), blob = new Float32Array(N * VB * 4), blobN = new Float32Array(N * VB * 3);
  const plates = [];
  const under = mix(C.underside, C.underside, 0), dpt = mix(C.violetShade, C.violetShade, 0), fsh = mix(C.muscleShade, C.muscleShade, 0);
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
    const k = plates.length, x = (i - (COLS - 1) / 2) * PW, y = (j + 0.5) * PH, d0 = Math.hypot(x, y - CROWN);
    plates.push({ k, x, y, th: x / RF, d0, rj: R(), tr: R(), rr: R() - 0.5, jx: R(), tone: R() });
    const c = mix(C.plateMid, C.plateLit, plates[k].tone * 0.8);
    for (let v = 0; v < VB; v++) {
      const o = (k * VB + v) * 3, nz = bn[v * 3 + 2], ny = bn[v * 3 + 1], back = nz < -0.5 || ny < -0.5;
      const lc = back ? under : c, sc = back ? fsh : dpt;
      col.set([lc.r, lc.g, lc.b], o); shd.set([sc.r, sc.g, sc.b], o);
      xrd.set([0.5, 1, 0], o); blobN.set([0, 1, 0], (k * VB + v) * 3);
    }
  }
  const pg = new BufferGeometry();
  const pa = new BufferAttribute(pos, 3).setUsage(DynamicDrawUsage), na = new BufferAttribute(nor, 3).setUsage(DynamicDrawUsage);
  pg.setAttribute("position", pa); pg.setAttribute("normal", na);
  pg.setAttribute("aCol", new BufferAttribute(col, 3)); pg.setAttribute("aShade", new BufferAttribute(shd, 3)); pg.setAttribute("aXrd", new BufferAttribute(xrd, 3));
  pg.setAttribute("aBlob", new BufferAttribute(blob, 4)); pg.setAttribute("aBlobN", new BufferAttribute(blobN, 3));
  pg.boundingSphere = new THREE.Sphere(new Vector3(0, 10, -30), 600);
  const plateMesh = new Mesh(pg, engine.prop(pg, 0.62).material); plateMesh.frustumCulled = false;
  const hull = new Mesh(pg, hullMaterial(engine.shared, { ref: 4, mul: 1.5, ink: C.sepia })); hull.renderOrder = -1; hull.frustumCulled = false;
  const plateG = new Group(); plateG.add(plateMesh, hull); plateG.userData.layer = 1;
  group.add(plateG);

  // ---- three carved pup faces (cards, layer 1) and the cornerstone egg
  const faces = [-12, 0, 12].map((x, i) => {
    const card = ctx.bake.card(FACE, { w: 512, h: 512, size: [8, 8], layer: 1, id: 0.63 });
    card.userData.fx = x; card.userData.delay = i === 1 ? 0 : 0.2; group.add(card); return card;
  });
  const egg = ctx.bake.card(STONE, { w: 580, h: 480, size: [2.7, 2.2], layer: 1, id: 0.64 });
  group.add(egg);
  const eggPlate = plates[19 * ROWS + 3];

  // ---- crack glow, behind the plates
  const thL = 0.24;
  const glowMat = additive(new ShaderMaterial({
    uniforms: { uGlow: { value: 0 }, uPulse: { value: 0 } }, vertexShader: GLOW_V,
    fragmentShader: `uniform float uGlow; uniform float uPulse; varying vec2 vUv; ${ctx.tools.glslFor(["noise"])}
      const vec3 EMBER = ${V(C.crack)};
      void main() {
        float s = (vUv.x - 0.5) * ${thL.toFixed(3)} * ${RF.toFixed(1)}, h = vUv.y * ${HW.toFixed(1)};
        float d = length(vec2(s, h - ${CROWN.toFixed(1)}));
        float reach = uGlow * 70.0;
        float m = 1.0 - smoothstep(reach - 8.0, reach, d);
        vec2 vc = vor(vec2(s * 0.16, h * 0.2) + 3.0);
        float line = 1.0 - smoothstep(0.02, 0.07, vc.y), halo = 1.0 - smoothstep(0.05, 0.25, vc.y);
        vec2 gp = fract(vec2(s / ${PW.toFixed(2)}, h / ${PH.toFixed(2)}));
        float gj = 1.0 - smoothstep(0.0, 0.03, min(min(gp.x, 1.0 - gp.x), min(gp.y, 1.0 - gp.y)));
        float a = (line + 0.35 * halo + 0.7 * gj) * m * step(0.001, uGlow);
        gl_FragColor = vec4(EMBER * (0.7 + 0.6 * uPulse) * a * 1.15, 0.0);
      }`,
  }));
  // radius 450.06: just proud of the core's front face (450), inside the plates' 450-450.8 shell
  const glow = new Mesh(new CylinderGeometry(RF + 0.06, RF + 0.06, HW, 120, 1, true, -thL / 2, thL), glowMat);
  glow.position.set(0, HW / 2, CZ); glow.frustumCulled = false; glow.userData.layer = 1; glow.renderOrder = -5;
  group.add(glow);

  // ---- per-step pose
  const Y = new Vector3(0, 1, 0), X = new Vector3(1, 0, 0), Z = new Vector3(0, 0, 1);
  const qy = new Quaternion(), qx = new Quaternion(), qz = new Quaternion(), q = new Quaternion(), v = new Vector3(), nn = new Vector3();
  const poses = new Array(N);
  function pose(p, t, cue) {
    const sf = H.has("skinfall") && cue ? (Number.isFinite(cue.since("skinfall")) ? t - cue.since("skinfall") : 1e9) : T.skin;   // before the beat: not fallen
    const t0 = sf + 0.032 * p.d0 + 0.1 * p.rj;
    const e = t - t0, tf = Math.sqrt(Math.max(0.01, (p.y - 0.45) / 4.9));
    let y = p.y, o = 0, tilt = 0, roll = 0, jit = 0, jy = 0;
    if (e <= 0) {
      const k = H.prog("tremble", T.tremble[0], T.tremble[1], t, cue);
      if (k > 0 && k < 1) { const amp = 0.05 * Math.sin(Math.PI * k), hsh = Math.sin((p.k + 1) * 12.9898 + Math.floor(t * 12) * 78.233) * 43758.5453; jit = amp * 2 * ((hsh - Math.floor(hsh)) - 0.5); jy = jit * 0.6; }
    } else if (e < tf) {
      y = p.y - 4.9 * e * e; o = 0.9 * e + 0.5 * e * e; tilt = Math.pow(e / tf, 1.5) * (1.15 + 0.35 * p.tr); roll = 0.8 * p.rr * e;
    } else {
      tilt = 1.45 + 0.15 * p.tr; o = 0.9 * tf + 0.5 * tf * tf + p.jx * 1.2; roll = 0.8 * p.rr * tf; y = 0.42 + 1.2 * Math.cos(tilt);
    }
    y = Math.max(y, 0.42 + 1.2 * Math.cos(Math.min(tilt, 1.45)));
    const rad = RF + 0.4 + o + jit;
    return { x: rad * Math.sin(p.th), y: y + jy, z: CZ + rad * Math.cos(p.th), yaw: p.th, tilt, roll };
  }
  let lastBucket = -1;
  function writePlates(t, cue) {
    for (const p of plates) {
      const s = pose(p, t, cue); poses[p.k] = s;
      qy.setFromAxisAngle(Y, s.yaw); qx.setFromAxisAngle(X, s.tilt); qz.setFromAxisAngle(Z, s.roll);
      q.copy(qy).multiply(qx).multiply(qz);
      for (let i = 0; i < VB; i++) {
        const o = (p.k * VB + i) * 3;
        v.set(bp[i * 3], bp[i * 3 + 1], bp[i * 3 + 2]).applyQuaternion(q);
        pos[o] = v.x + s.x; pos[o + 1] = v.y + s.y; pos[o + 2] = v.z + s.z;
        nn.set(bn[i * 3], bn[i * 3 + 1], bn[i * 3 + 2]).applyQuaternion(q);
        nor[o] = nn.x; nor[o + 1] = nn.y; nor[o + 2] = nn.z;
      }
    }
    pa.needsUpdate = true; na.needsUpdate = true;
  }
  const place = (card, s, lift) => {            // lift: metres along the plate's own normal
    qy.setFromAxisAngle(Y, s.yaw); qx.setFromAxisAngle(X, s.tilt); qz.setFromAxisAngle(Z, s.roll);
    card.quaternion.copy(qy).multiply(qx).multiply(qz);
    v.set(0, 0, lift).applyQuaternion(card.quaternion);
    card.position.set(s.x + v.x, s.y + v.y, s.z + v.z);
  };

  return {
    group,
    update(t, dt, cue) {
      // plates are static before the tremble and after the last has landed; recompute only while they move
      const bucket = t < T.tremble[0] - 0.1 ? 0 : t > 9.0 ? 2 : 1;
      if (bucket === 1 || bucket !== lastBucket) { writePlates(t, cue); lastBucket = bucket; }
      place(egg, poses[eggPlate.k], PD / 2 + 0.03);
      for (const f of faces) {
        const x = f.userData.fx, th = x / RF, e = t - (T.skin + f.userData.delay);
        const k = H.prog("tremble", T.tremble[0], T.tremble[1], t, cue);
        let y = CROWN, o = 0, tilt = 0, roll = 0, jit = 0;
        if (e <= 0 && k > 0 && k < 1) { const hsh = Math.sin(x * 12.9898 + Math.floor(t * 12) * 78.233) * 43758.5453; jit = 0.06 * Math.sin(Math.PI * k) * 2 * ((hsh - Math.floor(hsh)) - 0.5); }
        else if (e > 0) { y = CROWN - 4.9 * e * e; o = 0.9 * e + 0.5 * e * e; tilt = Math.min(1.4, e * 0.9); roll = x * 0.01 * e; }
        const rad = RF + PD + 0.06 + o + jit;
        place(f, { x: rad * Math.sin(th), y, z: CZ + rad * Math.cos(th), yaw: th, tilt, roll }, 0);
        f.visible = y > 0.9;                                    // the carved face shatters into the rubble
      }
      glowMat.uniforms.uGlow.value = smooth(T.crack[0], 6.5, t) * (1 - 0.3 * smooth(T.gap[0], T.gap[1], t));
      const { n, s } = H.foot(t, cue);
      glowMat.uniforms.uPulse.value = n >= 0 ? Math.exp(-4 * s) : 0;
    },
    dispose() { pg.dispose(); hull.material.dispose(); plateMesh.material.dispose(); glow.geometry.dispose(); glowMat.dispose(); sides.geometry.dispose(); flesh.geometry.dispose(); for (const c of [...faces, egg]) c.userData.dispose?.(); },
  };
}
