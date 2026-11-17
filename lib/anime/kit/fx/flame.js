// flame: posterised fire, aura, steam, smoke, pillar, swirl and fire-wall cards, one draw per makeFlame.
// A field rho (1 at the heart, 0 on the silhouette) is cut into `bands` flat colours (inner to outer, interpolated
// when there are fewer colours than bands), an ink edge of edgePx (at 800 px) sits inside the silhouette, and the
// shape is redrawn on floor(ts * fps). Modes: flame (teardrop, tongues fanned over the top), aura (ellipse round a
// figure; `back` pushes it behind), steam (rises and thins under a scalloped crown), smoke (a bank drifting with
// `lean`), column (axis-facing pillar, `taper` = top width / base width), ring (disc, or annulus with `inner`, spun
// by `swirl` turns/s plus `turn`), wall (world-fixed, tongues along the width). MODES holds each mode's defaults
// over DEFAULTS. One card per `at` entry [x, y, z, scale?] in group space, instanced; `stagger` lights them in order
// as k rises. `at` and `blend` are fixed at build (move the group). Blend: add = light, vec4(rgb a, 0); normal =
// premultiplied vec4(rgb a, a); multiply = the darkening the composite p (1 - a) + rgb can carry, exact on white;
// solid = opaque, depth-written, id 0.6. set({ k }) grows height and density from 0; emit lifts the core band past 1.
import { AdditiveBlending, Color, DoubleSide, Group, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, NoBlending, NormalBlending, PlaneGeometry, ShaderMaterial, Vector2, Vector4 } from "three";
import { glslFor } from "../../tools/index.js";

export const DEFAULTS = {
  mode: "flame", size: [1, 1.6], at: [[0, 0, 0]], face: "camera", bands: 3, colours: ["#fff0b3", "#fba83d", "#db6128"], alpha: 1,
  tongues: 24, gain: 1, edgePx: 0, ink: "#1a0e16", blend: "normal", fps: 12, scallop: 0, lean: 0, rise: 1,
  swirl: 0, turn: 0, inner: 0, taper: 1, back: 0, stagger: 0, seed: 1, emit: 0, k: 1, plateDepth: true,
};
export const MODES = {
  flame: { size: [0.8, 1.2], tongues: 7 },
  aura: { size: [1.4, 2.2], bands: 2, colours: ["#f6f9ff", "#a8d8ff"], alpha: 0.9, gain: 1.6, edgePx: 2, ink: "#6a8ac8", back: 0.4 },
  steam: { size: [3, 2.4], bands: 4, colours: ["#d9b48a", "#552f1d"], scallop: 1, rise: 0.25 },
  smoke: { size: [4, 1.6], bands: 2, colours: ["#2a2426", "#181617"], alpha: 0.7, edgePx: 2, ink: "#873c22", scallop: 1, tongues: 16, lean: 0.06, rise: 0 },
  column: { face: "axis", size: [2.2, 20], taper: 1.6, colours: ["#f6dcf5", "#d22aa2", "#af1d6a"], tongues: 5, rise: 2 },
  ring: { size: [2, 2], colours: ["#9ea2b4", "#84889d", "#575b72"], alpha: [1, 0.8, 0.6], scallop: 1, tongues: 14, swirl: 1.5, rise: 0 },
  wall: { face: "world", size: [8, 3] },
};
const MODE = { flame: 0, aura: 1, steam: 2, smoke: 3, column: 4, ring: 5, wall: 6 };
const FACE = { world: 0, camera: 1, axis: 2 };
const BLEND = { add: 0, normal: 1, multiply: 2, solid: 3 };
const SHEAR = new Set(["flame", "steam", "column", "wall"]); // lean slants the card itself, so the field never runs off its edge
const pick = (table, key, what) => { if (!(key in table)) throw new Error(`makeFlame: unknown ${what} "${key}"`); return table[key]; };

const VERT = /* glsl */ `
  attribute vec4 aAt; attribute vec2 aId;
  uniform vec2 uSize; uniform float uFace; uniform float uBack; uniform float uK; uniform float uStagger; uniform float uTaper; uniform float uCentred; uniform float uShear;
  varying vec2 vQ; varying float vK; varying float vSeed;
  void main() {
    float k = clamp(uK * (1.0 + uStagger) - aId.x * uStagger, 0.0, 1.0);
    float yq = position.y + 0.5;
    vK = k; vSeed = aId.y; vQ = vec2(position.x * 2.0, yq);
    vec2 c = vec2(position.x * mix(1.0, uTaper, yq) * uSize.x + uShear * yq * uSize.y, (yq - 0.5 * uCentred) * uSize.y) * aAt.w;
    vec4 ctr = modelMatrix * vec4(aAt.xyz, 1.0);
    vec3 w;
    if (uFace < 0.5) w = (modelMatrix * vec4(aAt.xyz + vec3(c, 0.0), 1.0)).xyz;
    else {
      vec3 s = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));
      vec3 up = uFace < 1.5 ? vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]) : normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
      vec3 rt = uFace < 1.5 ? vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]) : normalize(cross(up, cameraPosition - ctr.xyz) + vec3(1e-6, 0.0, 0.0));
      w = ctr.xyz + rt * c.x * s.x + up * c.y * s.y;
    }
    w += normalize(ctr.xyz - cameraPosition) * uBack;
    gl_Position = k < 0.001 ? vec4(0.0, 0.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`;

const FRAG = /* glsl */ `
  ${glslFor(["noise"])}
  uniform float uMode; uniform float uCentred; uniform float uBands; uniform float uTongues; uniform float uScallop; uniform float uLean;
  uniform float uEdgePx; uniform vec2 uRes; uniform float uStep; uniform float uFps; uniform float uGain; uniform float uRise;
  uniform float uSwirl; uniform float uTurn; uniform float uInner; uniform float uAsp; uniform float uBlend; uniform float uSeed; uniform float uLo;
  uniform vec4 uBand[6]; uniform vec4 uInk;
  varying vec2 vQ; varying float vK; varying float vSeed;
  const float PI = 3.14159265;
  float fb(vec2 p) { float s = vn(p) * 0.55 + vn(p * 2.03 + 7.1) * 0.3; return uLo > 0.5 ? s / 0.85 : s + vn(p * 4.1 + 3.3) * 0.15; }
  // crown: |sin| bumps, pointed tips at scallop 0 (1 - sqrt(1 - s)), round scallops with cusped valleys at 1 (sqrt s)
  float crown(float u) { float s = abs(sin(PI * u)); return mix(1.0 - sqrt(1.0 - s), sqrt(s), uScallop); }
  float tongue(float u, float key) { return crown(u) * mix(0.35, 1.0, h21(vec2(floor(u), key))); }
  void main() {
    float k = max(vK, 1e-3), s0 = uSeed + vSeed, st = mod(uStep, 97.0) + s0, tq = uStep / uFps, T = max(floor(uTongues + 0.5), 1.0);
    vec2 q = vQ, boil = vec2(0.31, 0.17) * st;
    float rho;
    if (uMode < 0.5) {
      vec2 d = (vec2(q.x * 0.5 * uAsp, q.y) - vec2(0.0, 0.27 * k)) / k;
      d.x -= (fb(vec2(q.x * 2.0, q.y * 3.0 - tq * uRise) + boil) - 0.5) * 0.4 * max(d.y, 0.0);
      float th = atan(d.x, d.y + 1e-5), up = max(cos(th), 0.0);
      rho = 1.0 - length(d) / ((0.24 + 0.26 * pow(up, 6.0)) * (1.0 + 0.45 * up * up * tongue((th / PI + 0.5) * T, st)));
    } else if (uMode < 1.5) {
      vec2 d = vec2(q.x, q.y * 2.0 - 1.0) / k;
      d.x -= uLean * (d.y + 1.0) * 0.5;
      float th = atan(d.x, d.y + 1e-5), up = smoothstep(-0.4, 0.8, cos(th));
      float r = length(d) + (fb(vec2(d.x * 3.0, d.y * 2.0 - tq * uRise) + boil) - 0.5) * 0.12;
      rho = 1.0 - r / (0.7 * (1.0 + 0.32 * up * tongue((th / (2.0 * PI) + 0.5) * T, st)));
    } else if (uMode < 3.5) {
      bool smoke = uMode > 2.5;
      float y = q.y / k;
      vec2 p = vec2(q.x * 0.5 * uAsp, y);
      vec2 drift = smoke ? vec2(-uLean * tq, 0.0) : vec2(-uLean * tq * 0.5, -uRise * tq);
      float n = fb(p * vec2(3.0, smoke ? 5.0 : 3.0) + drift + boil * 0.25);
      float e = 2.0 * y - 1.0;
      rho = smoke ? (n - 0.5) * 2.4 + 0.75 - 2.0 * e * e : (n - 0.5) * 2.0 + 1.05 - 0.85 * y;
      rho = min(rho - 2.8 * smoothstep(0.5, 1.0, abs(q.x)), (1.0 - 0.12 * (1.0 - tongue((q.x * 0.5 + 0.5) * T, s0)) - y) * 4.0);
    } else if (uMode < 4.5) {
      float y = q.y / k, hw = max(0.5 * uAsp, 1e-3), ax = abs(q.x);
      float wd = 0.82 + (fb(vec2(sign(q.x) * 5.0, y / hw * 0.6) + boil) - 0.5) * 0.3;
      float s = fb(vec2(q.x * 3.0, y / hw * 0.12 - tq * uRise) + boil * 0.3);
      rho = min((1.0 - ax / wd) * (1.0 + (s - 0.5) * 0.9), (1.0 - 0.3 * (1.0 - tongue((q.x * 0.5 + 0.5) * T, st)) - y) * 6.0);
    } else if (uMode < 5.5) {
      vec2 d = vec2(q.x, q.y * 2.0 - 1.0) / k;
      float r = length(d), th = atan(d.y, d.x + 1e-5);
      float n = fb(rot((uSwirl * tq + uTurn) * 2.0 * PI + r * 2.5) * d * 2.6 + boil * 0.25);
      float ro = 0.78 + 0.2 * tongue((th / (2.0 * PI) + 0.5) * T, st), t = (r - uInner) / max(ro - uInner, 1e-3);
      rho = (uInner > 0.0 ? 1.0 - abs(2.0 * t - 1.0) : 1.0 - t) + (n - 0.5) * 0.9;
      rho = min(rho, min(ro - r, uInner > 0.0 ? r - uInner : 1.0) * 6.0);
    } else {
      float y = q.y / k, x = q.x * 0.5 * uAsp;
      float xw = x + (fb(vec2(x * 3.0, y * 4.0 - tq * uRise) + boil) - 0.5) * 0.15 * y;
      float H = (0.45 + 0.55 * tongue((xw / max(uAsp, 1e-3) + 0.5) * T, st)) * min(1.0, (1.0 - abs(q.x)) * 12.0);
      rho = 1.0 - y / max(H, 1e-3);
    }
    float edge = min(1.0 - abs(q.x), uCentred > 0.5 ? 1.0 - abs(2.0 * q.y - 1.0) : 1.0 - q.y);
    rho = min(rho, edge * 8.0) * uGain * mix(0.45, 1.0, vK);
    float fw = fwidth(rho);
    if (rho <= 0.0) discard;
    float idx = uBands - 1.0 - min(floor(rho * uBands), uBands - 1.0);
    vec4 c = uBand[0];
    for (int i = 1; i < 6; i++) if (float(i) == idx) c = uBand[i];
    if (rho < uEdgePx * (uRes.y / 800.0) * fw) c = uInk;
    if (uBlend < 0.5) gl_FragColor = vec4(c.rgb * c.a, 0.0);
    else if (uBlend < 1.5) gl_FragColor = vec4(c.rgb * c.a, c.a);
    else if (uBlend < 2.5) { float L = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)); gl_FragColor = vec4(max(c.rgb - L, 0.0) * c.a, c.a * (1.0 - min(L, 1.0))); }
    else gl_FragColor = vec4(c.rgb, 0.6);
  }`;

export function makeFlame(engine, opts = {}) {
  const o = { ...DEFAULTS, ...MODES[opts.mode ?? DEFAULTS.mode], ...opts };
  const blend = pick(BLEND, o.blend, "blend");
  const n = o.at.length, aAt = new Float32Array(n * 4), aId = new Float32Array(n * 2);
  o.at.forEach((p, i) => { aAt.set([p[0], p[1], p[2], p[3] ?? 1], i * 4); aId.set([n > 1 ? i / (n - 1) : 0, (i * 7.31) % 23], i * 2); });
  const plane = new PlaneGeometry(1, 1, 1, 8), geo = new InstancedBufferGeometry().copy(plane);
  plane.dispose();
  geo.setAttribute("aAt", new InstancedBufferAttribute(aAt, 4));
  geo.setAttribute("aId", new InstancedBufferAttribute(aId, 2));
  geo.instanceCount = n;
  const v = (x) => ({ value: x });
  const u = {
    uMode: v(0), uCentred: v(0), uShear: v(0), uFace: v(1), uSize: v(new Vector2()), uAsp: v(1), uTaper: v(1), uBack: v(0), uK: v(1), uStagger: v(0),
    uBands: v(3), uTongues: v(24), uScallop: v(0), uLean: v(0), uEdgePx: v(0), uStep: v(0), uFps: v(12), uGain: v(1), uRise: v(1),
    uSwirl: v(0), uTurn: v(0), uInner: v(0), uBlend: v(blend), uSeed: v(0), uLo: v(engine?.tier <= 1 ? 1 : 0),
    uRes: engine?.shared?.uRes ?? v(new Vector2(1280, 800)),
    uBand: v(Array.from({ length: 6 }, () => new Vector4())), uInk: v(new Vector4()),
  };
  const mat = new ShaderMaterial({
    uniforms: u, vertexShader: VERT, fragmentShader: FRAG, side: DoubleSide, premultipliedAlpha: true,
    transparent: blend !== 3, depthWrite: blend === 3, blending: blend === 0 ? AdditiveBlending : blend === 3 ? NoBlending : NormalBlending,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  const group = new Group();
  group.userData.plateDepth = o.plateDepth; // the set hides it (post.js); plateDepth: false keeps it drawn over the whole plate
  group.add(mesh);
  const ca = new Color(), cb = new Color();
  const write = (p) => {
    u.uMode.value = pick(MODE, o.mode, "mode"); u.uCentred.value = o.mode === "aura" || o.mode === "ring" ? 1 : 0;
    u.uFace.value = pick(FACE, o.face, "face");
    u.uSize.value.set(o.size[0], o.size[1]); u.uAsp.value = o.size[0] / o.size[1];
    u.uShear.value = SHEAR.has(o.mode) ? o.lean : 0;
    u.uTaper.value = o.taper; u.uBack.value = o.back; u.uK.value = o.k; u.uStagger.value = o.stagger;
    u.uBands.value = Math.max(1, Math.min(6, Math.round(o.bands)));
    u.uTongues.value = o.tongues; u.uScallop.value = o.scallop; u.uLean.value = o.lean; u.uEdgePx.value = o.edgePx;
    u.uFps.value = o.fps; u.uGain.value = o.gain; u.uRise.value = o.rise; u.uSwirl.value = o.swirl; u.uTurn.value = o.turn; u.uInner.value = o.inner;
    u.uSeed.value = ((((o.seed * 0.618034) % 1) + 1) % 1) * 41;
    // k 0 stays drawn (the vertex stage collapses it) so the program links at build, not on the first lit frame
    if (p !== o && !("colours" in p || "bands" in p || "alpha" in p || "ink" in p || "emit" in p)) return;
    const N = u.uBands.value, cs = [].concat(o.colours), al = [].concat(o.alpha);
    let amax = 0;
    for (let j = 0; j < 6; j++) {
      const pos = N > 1 ? (Math.min(j, N - 1) / (N - 1)) * (cs.length - 1) : 0, i0 = Math.floor(pos);
      ca.set(cs[i0]).lerp(cb.set(cs[Math.min(i0 + 1, cs.length - 1)]), pos - i0);
      const L = 0.2126 * ca.r + 0.7152 * ca.g + 0.0722 * ca.b;
      ca.multiplyScalar(Math.min(1, 0.92 / Math.max(L, 1e-6)) * (j === 0 ? 1 + o.emit : 1));
      const a = al[Math.min(j, al.length - 1)];
      u.uBand.value[j].set(ca.r, ca.g, ca.b, a);
      if (j < N) amax = Math.max(amax, a);
    }
    ca.set(o.ink);
    u.uInk.value.set(ca.r, ca.g, ca.b, amax);
  };
  write(o);
  return {
    group,
    update(ts) { u.uStep.value = Math.floor(ts * o.fps + 1e-6); u.uLo.value = engine?.tier <= 1 ? 1 : 0; },
    set(patch) { Object.assign(o, patch); write(patch); },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// blue fire (add, emit, two staggered cards) | banded steam (4 levels) | Amaterasu wall (multiply, ink edge) on a cream set card
export function demo(engine) {
  const group = new Group();
  const fx = [
    makeFlame(engine, { mode: "flame", at: [[-0.1, 0, 0], [0.12, 0, 0.05, 0.75]], size: [0.55, 0.95], colours: ["#9eccff", "#2e6bf2"], blend: "add", emit: 0.8, lean: 0.2, stagger: 1, seed: 3 }),
    makeFlame(engine, { mode: "steam", size: [0.6, 1.3], rise: 0.6, tongues: 7, seed: 5 }),
    makeFlame(engine, { mode: "wall", size: [0.62, 1], tongues: 9, bands: 1, colours: "#120a10", edgePx: 4, ink: "#5a2a4a", blend: "multiply", seed: 7 }),
  ];
  [-0.62, 0, 0.68].forEach((x, i) => { fx[i].group.position.set(x, 0.1, 0); group.add(fx[i].group); });
  const card = new Mesh(new PlaneGeometry(0.64, 1.3), new ShaderMaterial({
    uniforms: { uCol: { value: new Color("#e8dcc4") } },
    vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 0.6); }",
  }));
  card.position.set(0.68, 0.75, -0.05);
  card.userData.layer = 0;
  group.add(card);
  const pk = { k: 0 };
  return {
    group,
    update(ts) {
      const t = ts % 4;
      pk.k = Math.min(1, t / 0.5) * Math.min(1, Math.max(0, (3.9 - t) / 0.6));
      for (const f of fx) { f.set(pk); f.update(t); }
    },
    dispose() { fx.forEach((f) => f.dispose()); card.geometry.dispose(); card.material.dispose(); },
  };
}
