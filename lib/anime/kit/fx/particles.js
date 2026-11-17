// PARTICLES (kit/fx): one instanced draw per field of specks, embers, dust, rain with splash rings, stars, motes on
// Bezier arcs, tumbling shards and small silhouettes (leaf, bird, blade, star glint). Every shape is an analytic SDF in
// one program shared by all fields, and every instance is a pure function of (stepped time, options, seed):
//   endless   u = t / life_i + phase_i; cycle floor(u) re-picks the spawn point by golden-ratio steps; a = fract(u);
//             set({ k }) is the share of instances alive (rain strength, a hard stop at 0); loop > 0 snaps life_i
//             and the flicker rates to loop / n so the field repeats exactly every loop seconds
//   once      a_i = k (1 + stagger) - stagger phase_i: set({ k }) plays the field 0..1 (burst is once by default)
//   rain      life_i = height / speed_i; streaks land on the volume floor, a splash ring grows there for three drawings
// depth true: a solid set piece (depth written, alpha 0.6, no blending). Otherwise a see-through overlay, no depth
// written, premultiplied: vec4(rgb a, a) normal or vec4(rgb a, 0) additive, tested against the plate's depth.
// Sizes: "px" at an 800 px tall frame or "m". update(ts) re-steps ts to fps (0 keeps ts). Static fields such as
// stars: speed 0, life 1e4, fade "none". target is in the field's local space, avoid.at in world space.
import { AdditiveBlending, Color, DoubleSide, Group, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, NoBlending, NormalBlending, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";

export const DEFAULTS = {
  count: 120, kind: "disc", shape: "leaf", size: 3, sizeMode: "px", sizeJitter: 0.3, length: 0,
  colours: ["#d7dde1"], colourBy: "instance", shade: null, edge: null, edgeWidth: 1, emit: 1, alpha: 1,
  motion: { mode: "drift", speed: 0.25, spread: 0.5, gravity: 0, turbulence: 0, target: [0, 0, 0], dir: [1, 0, 0], slant: 0.08 },
  volume: { shape: "box", size: [2, 2, 2], at: [0, 1, 0] },
  life: 4, loop: 0, once: false, stagger: 0.3, k: 1, fade: "size", spin: 2, twinkle: 0,
  splash: 0, splashSize: [0.04, 0.12], fps: 12, seed: 1, depth: false, blend: "normal", occlude: true, avoid: null,
};
// per-mode defaults laid between DEFAULTS and the caller's options (orbit speed is rad/s about dir through volume.at)
export const PRESETS = {
  rise: { life: 3, motion: { speed: 0.3, spread: 0.2, dir: [0, 1, 0] } },
  fall: { life: 3, motion: { speed: 0.6, spread: 0.2, dir: [0, -1, 0] } },
  drift: {},
  orbit: { life: 6, motion: { speed: 0.6, spread: 0, dir: [0, 1, 0] } },
  burst: { life: 1, once: true, k: 0, stagger: 0.1, motion: { speed: 3, spread: 1, gravity: -6, dir: [0, 1, 0] }, volume: { shape: "sphere", size: [0.1, 0.1, 0.1] } },
  bezier: { life: 0.9, motion: { spread: 0.3, dir: [0, 1, 0] } },
  rain: { kind: "streak", size: 0.02, sizeMode: "m", sizeJitter: 0.2, length: 1, fade: "none", motion: { speed: 14, spread: 0 } },
  attract: { life: 1.5, motion: { spread: 0.25, dir: [0, 1, 0] } },
};

const KINDS = { disc: 0, quad: 1, capsule: 2, streak: 3, shard: 4, silhouette: 5 };
const SILS = { leaf: 0, bird: 1, blade: 2, star: 3 };
const MODES = { rise: 0, fall: 0, drift: 0, orbit: 1, burst: 2, bezier: 3, rain: 4, attract: 5 };
const SHAPES = { box: 0, sphere: 1, disc: 2, ring: 3 };
const FADES = { none: 0, size: 1, alpha: 2 };
const ORIENT = { disc: 0, quad: 0, capsule: 1, streak: 1, shard: 0, leaf: 0, bird: 2, blade: 1, star: 2 };
const ASPECT = { disc: 1, quad: 1, capsule: 3, streak: 12, shard: 1, leaf: 1, bird: 1.6, blade: 6, star: 1 };
const LONG = new Set(["capsule", "streak", "silhouette"]);
const EMPTY = Object.freeze({});
const INK = new Color("#0e0c16");

const VERT = /* glsl */ `
attribute vec4 aR; attribute vec4 aS; attribute vec4 aT; attribute vec4 aC;
uniform float uT; uniform float uLoop; uniform float uFps; uniform float uK; uniform float uOnce; uniform float uStagger; uniform float uLife;
uniform float uMode; uniform vec3 uDir; uniform float uSpeed; uniform float uSpread; uniform float uGravity; uniform float uTurb;
uniform vec3 uTarget; uniform float uShape; uniform vec3 uAt; uniform vec3 uVol; uniform float uSlant;
uniform vec2 uSize; uniform float uLen; uniform float uAspect; uniform float uPx; uniform float uKind; uniform float uOrient; uniform float uSpin;
uniform float uFade; uniform float uTwinkle; uniform vec2 uSplash; uniform vec3 uRamp[8]; uniform float uRampN; uniform float uByLife;
uniform vec4 uAvoid; uniform vec2 uRes; uniform vec3 uLightDir;
varying vec2 vQ; varying vec3 vCol; varying vec3 vL; varying float vLit; varying float vF; varying float vAsp; varying float vAlpha; varying float vRing;
const float TAU = 6.2831853;
const vec3 GOLD = vec3(0.6180340, 0.7548777, 0.5698403);
float hs(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float sn(float x, float s) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hs(vec2(i, s)), hs(vec2(i + 1.0, s)), f) * 2.0 - 1.0; }
vec3 sph(float a, float b) { float z = b * 2.0 - 1.0; float q = sqrt(max(1.0 - z * z, 0.0)); return vec3(cos(a * TAU) * q, z, sin(a * TAU) * q); }
vec3 nrm(vec3 v, vec3 fb) { float l = length(v); return l > 1e-5 ? v / l : fb; }
vec3 rotAx(vec3 v, vec3 k, float a) { float c = cos(a); float s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
float lf(float f) { return uLoop > 0.0 ? max(floor(f * uLoop + 0.5), 1.0) / uLoop : f; }
vec3 ramp(float x) {
  float f = clamp(x, 0.0, 1.0) * (uRampN - 1.0);
  vec3 c = uRamp[0];
  for (int j = 1; j < 8; j++) { if (float(j) > uRampN - 0.5) break; c = mix(c, uRamp[j], clamp(f - float(j) + 1.0, 0.0, 1.0)); }
  return c;
}
vec3 spawn(vec3 s) {
  vec3 h = 0.5 * uVol; float an = s.x * TAU;
  if (uShape < 0.5) return uAt + (s * 2.0 - 1.0) * h;
  if (uShape < 1.5) { float z = s.y * 2.0 - 1.0; float q = sqrt(max(1.0 - z * z, 0.0)); return uAt + vec3(cos(an) * q, z, sin(an) * q) * pow(s.z, 0.3333333) * h; }
  float r = uShape < 2.5 ? sqrt(s.y) : mix(0.85, 1.0, s.y);
  return uAt + vec3(cos(an) * r * h.x, (s.z * 2.0 - 1.0) * h.y, sin(an) * r * h.z);
}
vec3 path(float a, float L, vec3 p0, float spd) {
  float age = a * L;
  vec3 tb = uTurb * vec3(sn(age * 0.8 + aR.x * 31.0, 1.7), sn(age * 0.8 + aR.y * 29.0, 5.3), sn(age * 0.8 + aR.z * 37.0, 9.1));
  if (uMode > 4.5) { float r = 1.0 - a * a; return uTarget + rotAx(p0 - uTarget, uDir, uSpread * TAU * a * a) * r + tb * r; }
  if (uMode > 3.5) { float f = a * uVol.y; return vec3(p0.x + uSlant * f, uAt.y + 0.5 * uVol.y - f, p0.z); }
  if (uMode > 2.5) {
    vec3 ch = uTarget - p0;
    vec3 e1 = nrm(cross(ch, uDir), nrm(cross(ch, vec3(1.0, 0.0, 0.0)), vec3(0.0, 0.0, 1.0)));
    vec3 e2 = nrm(cross(e1, ch), uDir);
    float th = aT.z * TAU, b = 1.0 - a;
    vec3 B1 = 0.5 * (p0 + uTarget) + (cos(th) * e1 + sin(th) * e2) * uSpread * length(ch);
    return b * b * p0 + 2.0 * a * b * B1 + a * a * uTarget + tb * b;
  }
  if (uMode > 0.5 && uMode < 1.5) return uAt + rotAx(p0 - uAt, uDir, spd * age) + tb;
  vec3 R = uMode > 1.5 ? nrm(p0 - uAt, sph(aT.y, aT.z)) : sph(aT.y, aT.z);
  return p0 + spd * age * nrm(mix(uDir, R, uSpread), R) + vec3(0.0, 0.5 * uGravity * age * age, 0.0) + tb;
}
void main() {
  vQ = position.xy; vCol = vec3(0.0); vL = vec3(0.0, 0.0, 1.0); vLit = 1.0; vF = aT.w; vAsp = 1.0; vAlpha = 1.0; vRing = aC.w;
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  bool rain = uMode > 3.5 && uMode < 4.5;
  float spd = uSpeed * mix(0.75, 1.25, aR.z);
  float L = max(rain ? uVol.y / max(spd, 1e-3) : uLife * mix(0.8, 1.2, aR.y), 1e-3);
  float a; float c;
  if (uOnce > 0.5 && !rain) {
    a = uK * (1.0 + uStagger) - uStagger * aR.x; c = 0.0;
    if (a <= 0.0 || a >= 1.0) return;
  } else { // a ring re-picks the previous cycle's spawn; under loop the cycle index wraps mod n
    float n = max(floor(uLoop / L + 0.5), 1.0);
    if (uLoop > 0.0) L = uLoop / n;
    float u = uT / L + aR.x; c = floor(u) - aC.w; a = fract(u);
    if (uLoop > 0.0) c -= n * floor((c + 0.5) / n);
    if (aS.w >= uK) return;
  }
  vec3 p0 = spawn(fract(aS.xyz + c * GOLD));
  float scl = length(modelMatrix[0].xyz);
  float tw = 1.0 - step(uTwinkle, fract(aT.w * 7.31));
  float pulse = pow(0.5 + 0.5 * sin(TAU * (lf(0.5 + aT.w) * uT + aT.x)), 3.0);
  vCol = (uByLife > 0.5 ? ramp(a) : aC.rgb) * mix(1.0, 0.15 + 0.85 * pulse, tw);
  if (aC.w > 0.5) { // splash ring: flat where this streak's previous drop landed, three drawings
    float f = floor(a * L * uFps);
    if (f > 2.5) return;
    vec3 W0 = (modelMatrix * vec4(p0.x + uSlant * uVol.y, uAt.y - 0.5 * uVol.y + 0.02, p0.z, 1.0)).xyz;
    float h = mix(uSplash.x, uSplash.y, f * 0.5) * scl * 1.3;
    gl_Position = projectionMatrix * viewMatrix * vec4(W0 + (normalize(modelMatrix[0].xyz) * position.x + normalize(modelMatrix[2].xyz) * position.y) * h, 1.0);
    vQ = position.xy * 1.3; vAlpha = 1.0 - 0.25 * f;
    return;
  }
  float age = a * L;
  vec3 W = (modelMatrix * vec4(path(a, L, p0, spd), 1.0)).xyz;
  vec3 Wb = (modelMatrix * vec4(path(a - 0.004, L, p0, spd), 1.0)).xyz;
  vec4 cH = projectionMatrix * viewMatrix * vec4(W, 1.0);
  if (cH.w < 1e-3) return;
  vec2 sH = cH.xy / cH.w;
  float ppm = projectionMatrix[1][1] * uRes.y * 0.5 / cH.w;
  float upx = uPx > 0.5 ? uRes.y / 800.0 : ppm * scl;
  float sz = mix(uSize.x, uSize.y, aR.w);
  float hy = max(0.5 * sz * upx, 0.5);
  float lr = uLen * sz / max(0.5 * (uSize.x + uSize.y), 1e-6);
  float len = lr * upx;
  float k = 1.0;
  if (uFade > 0.5) {
    float env = (uMode > 1.5 && uMode < 2.5 ? 1.0 : smoothstep(0.0, 0.12, a)) * (1.0 - smoothstep(0.78, 1.0, a));
    if (uFade < 1.5) k = env; else vAlpha = env;
  }
  if (uAvoid.w > 0.0) { // keep clear of a world point (the seal): in front of it on screen, or inside its bubble
    vec4 ca = projectionMatrix * viewMatrix * vec4(uAvoid.xyz, 1.0);
    float cw = max(ca.w, 1e-3), ra = uAvoid.w * projectionMatrix[1][1] * uRes.y * 0.5 / cw;
    float scr = step(0.0, ca.w) * step(cH.w, ca.w) * (1.0 - smoothstep(ra, ra * 1.25, length((sH - ca.xy / cw) * uRes * 0.5)));
    k *= 1.0 - max(scr, 1.0 - smoothstep(uAvoid.w, uAvoid.w * 1.25, distance(W, uAvoid.xyz)));
  }
  if (k < 0.02) return;
  vec2 X = vec2(1.0, 0.0);
  if (uOrient > 0.5 && uOrient < 1.5) {
    bool world = uPx < 0.5 && uLen > 0.0;
    vec3 Wt = world ? W - nrm(W - Wb, vec3(0.0, -1.0, 0.0)) * lr * scl : Wb;
    vec4 cT = projectionMatrix * viewMatrix * vec4(Wt, 1.0);
    vec2 d = (sH - cT.xy / max(cT.w, 1e-3)) * uRes * 0.5;
    float dl = length(d);
    X = dl > 1e-4 ? d / dl : vec2(0.0, -1.0);
    if (world) len = dl;
  } else if (uOrient < 0.5) { float an = aT.y * TAU + uSpin * (aT.x * 2.0 - 1.0) * age; X = vec2(cos(an), sin(an)); }
  vec2 Y = vec2(-X.y, X.x);
  float hx = (uLen > 0.0 ? max(0.5 * len, hy) : hy * uAspect) * k;
  hy *= k;
  vec3 Lv = (viewMatrix * vec4(uLightDir, 0.0)).xyz;
  vL = vec3(dot(Lv.xy, X), dot(Lv.xy, Y), Lv.z);
  if (uKind > 4.5) vF = sin(TAU * (lf(3.0 * (0.8 + 0.4 * aT.x)) * uT + aT.y));
  if (uKind > 3.5 && uKind < 4.5) { // shard: a flat facet tumbling in 3D about its own axis, lit by the key
    vec3 ax = sph(aT.x, aT.z);
    float an = aT.y * TAU + uSpin * (0.5 + aT.x) * age;
    vec3 e1 = rotAx(vec3(1.0, 0.0, 0.0), ax, an), e2 = rotAx(vec3(0.0, 1.0, 0.0), ax, an);
    vec3 n = cross(e1, e2);
    if (dot(n, cameraPosition - W) < 0.0) n = -n;
    vLit = dot(n, uLightDir);
    gl_Position = projectionMatrix * viewMatrix * vec4(W + (e1 * position.x + e2 * position.y) * ((hy + 1.0) / ppm), 1.0);
    vQ = position.xy * (hy + 1.0) / hy;
  } else {
    vec2 off = X * position.x * (hx + 1.0) + Y * position.y * (hy + 1.0);
    if (uKind > 2.5 && uKind < 3.5) off -= X * hx;
    gl_Position = cH;
    gl_Position.xy += off * 2.0 / uRes * cH.w;
    vQ = vec2(position.x * (hx + 1.0), position.y * (hy + 1.0)) / hy;
  }
  vAsp = hx / hy;
}`;

const FRAG = /* glsl */ `
uniform float uKind; uniform float uSil; uniform vec3 uShade; uniform float uShadeOn; uniform vec3 uEdge; uniform float uEdgePx;
uniform float uEmit; uniform float uAlpha; uniform float uSolid; uniform float uAdd; uniform float uOcc; uniform sampler2D tPlateD; uniform vec2 uRes;
varying vec2 vQ; varying vec3 vCol; varying vec3 vL; varying float vLit; varying float vF; varying float vAsp; varying float vAlpha; varying float vRing;
const float TAU = 6.2831853;
const vec3 INK = vec3(${INK.toArray().map((x) => x.toFixed(5)).join(", ")});
float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float side(vec2 p, vec2 a, vec2 b, float o) { vec2 e = b - a; return o * dot(p - a, normalize(vec2(e.y, -e.x))); }
float shape(vec2 p) {
  if (uKind < 0.5) return length(p) - 1.0;
  if (uKind < 1.5) return max(abs(p.x), abs(p.y)) - 1.0;
  if (uKind < 2.5) return length(vec2(max(abs(p.x) - vAsp + 1.0, 0.0), p.y)) - 1.0;
  if (uKind < 3.5) return max(abs(p.y) - pow(clamp(p.x / vAsp * 0.5 + 0.5, 0.0, 1.0), 0.6), abs(p.x) - vAsp);
  if (uKind < 4.5) {
    float s = vF * TAU;
    vec2 a = vec2(0.15 * sin(s), 1.0), b = vec2(-0.9, -0.35 - 0.3 * cos(s)), c = vec2(0.55 + 0.35 * fract(vF * 7.0), -0.75 + 0.2 * sin(s * 2.0));
    float o = sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
    return max(max(side(p, a, b, o), side(p, b, c, o)), side(p, c, a, o));
  }
  vec2 n = vec2(p.x / vAsp, p.y);
  if (uSil < 0.5) return max(length(n - vec2(0.0, 0.85)), length(n + vec2(0.0, 0.85))) - 1.25;
  if (uSil < 1.5) {
    vec2 m = vec2(abs(n.x), n.y), w = vec2(0.45, 0.2 + 0.3 * vF), tip = vec2(0.98, -0.1 + 0.55 * vF);
    return min(min(seg(m, vec2(0.0), w), seg(m, w, tip)) - 0.11 * (1.0 - 0.6 * m.x), (length(n / vec2(0.16, 0.26)) - 1.0) * 0.16);
  }
  if (uSil < 2.5) {
    float blade = max(abs(n.y) - 0.3 * clamp((1.0 - n.x) / 0.25, 0.0, 1.0), max(-0.42 - n.x, n.x - 1.0));
    return min(blade, min(max(abs(n.x + 0.47) - 0.05, abs(n.y) - 0.8), max(abs(n.x + 0.74) - 0.24, abs(n.y) - 0.16)));
  }
  return min(sqrt(abs(n.x)) + sqrt(abs(n.y)) - 1.0, length(n) - 0.22);
}
void main() {
  if (uOcc > 0.5 && gl_FragCoord.z > texture2D(tPlateD, gl_FragCoord.xy / uRes).r + 1e-5) discard;
  vec2 p = vQ;
  float d;
  if (vRing > 0.5) { float r = length(p); d = abs(r - 1.0) - max(0.08, fwidth(r) * 0.75); } else d = shape(p);
  float fw = max(fwidth(d), 1e-4);
  float cov = clamp(0.5 - d / fw, 0.0, 1.0);
  vec3 col = vCol;
  if (vRing < 0.5) { // two-tone cel: the side away from the key takes the shade (ball for discs, half across the long axis otherwise)
    float lit = 1.0;
    if (uKind > 3.5 && uKind < 4.5) lit = step(0.0, vLit);
    else if (uShadeOn > 0.5) {
      float y = clamp(p.y, -1.0, 1.0);
      vec3 n = uKind < 0.5 ? vec3(p, sqrt(max(1.0 - dot(p, p), 0.0))) : vec3(0.0, y, sqrt(max(1.0 - y * y, 0.0)));
      lit = step(0.0, dot(n, vL));
    }
    col = mix(uShadeOn > 0.5 ? uShade : max(col * 0.45, INK), col, lit) * uEmit;
    if (uEdgePx > 0.0 && d > -uEdgePx * (uRes.y / 800.0) * fw) col = uEdge;
  } else col *= uEmit;
  float a = cov * vAlpha * uAlpha;
  if (uKind > 2.5 && uKind < 3.5 && vRing < 0.5) a *= mix(0.35, 1.0, clamp(p.x / vAsp * 0.5 + 0.5, 0.0, 1.0));
  if (uSolid > 0.5) { if (cov < 0.5) discard; gl_FragColor = vec4(col, 0.6); return; }
  if (a < 0.002) discard;
  gl_FragColor = uAdd > 0.5 ? vec4(col * a, 0.0) : vec4(col * a, a);
}`;

const merge = (a, b = EMPTY) => ({ ...a, ...b, motion: { ...a.motion, ...b.motion }, volume: { ...a.volume, ...b.volume } });
const v3 = (a, out) => (a?.isVector3 ? out.copy(a) : out.set(a[0], a[1], a[2]));
// linear colour from hex: lit luma capped at 0.92, never below the studio ink
function lin(hex, out) {
  out.set(hex);
  const y = 0.2126 * out.r + 0.7152 * out.g + 0.0722 * out.b;
  if (y > 0.92) out.multiplyScalar(0.92 / y);
  out.setRGB(Math.max(out.r, INK.r), Math.max(out.g, INK.g), Math.max(out.b, INK.b));
  return out;
}
function rng(seed) {
  let s = Math.imul(Math.floor(seed * 1000) | 0, 2654435761) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeParticles(engine, opts = {}) {
  const mode = opts.motion?.mode ?? DEFAULTS.motion.mode;
  if (!(mode in MODES)) throw new Error(`particles: unknown motion.mode "${mode}"`);
  const o = merge(merge(DEFAULTS, PRESETS[mode]), opts);
  if (!(o.kind in KINDS)) throw new Error(`particles: unknown kind "${o.kind}"`);
  if (o.kind === "silhouette" && !(o.shape in SILS)) throw new Error(`particles: unknown silhouette shape "${o.shape}"`);
  if (!(o.volume.shape in SHAPES)) throw new Error(`particles: unknown volume.shape "${o.volume.shape}"`);
  if (!(o.fade in FADES)) throw new Error(`particles: unknown fade "${o.fade}"`);
  const half = (engine?.tier ?? 2) <= 1, depth = !!o.depth, look = o.kind === "silhouette" ? o.shape : o.kind;
  let count = Math.max(1, Math.min(4096, Math.round(o.count)));
  if (half) count = Math.ceil(count / 2);
  const splash = mode === "rain" ? Math.min(count, Math.round(Math.max(0, o.splash) / (half ? 2 : 1))) : 0, N = count + splash;

  const R = new Float32Array(N * 4), S = new Float32Array(N * 4), T = new Float32Array(N * 4), C = new Float32Array(N * 4), pick = new Float32Array(N);
  const rnd = rng(o.seed);
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < 4; j++) { R[i * 4 + j] = rnd(); S[i * 4 + j] = rnd(); T[i * 4 + j] = rnd(); }
    pick[i] = rnd();
  }
  for (let j = 0; j < splash; j++) { // ring j mirrors streak j
    const i = count + j;
    for (const A of [R, S, T]) A.copyWithin(i * 4, j * 4, j * 4 + 4);
    pick[i] = pick[j]; C[i * 4 + 3] = 1;
  }
  const quad = new PlaneGeometry(2, 2), geo = new InstancedBufferGeometry();
  geo.setIndex(quad.index); geo.setAttribute("position", quad.getAttribute("position"));
  const aC = new InstancedBufferAttribute(C, 4);
  geo.setAttribute("aR", new InstancedBufferAttribute(R, 4)); geo.setAttribute("aS", new InstancedBufferAttribute(S, 4));
  geo.setAttribute("aT", new InstancedBufferAttribute(T, 4)); geo.setAttribute("aC", aC);
  geo.instanceCount = N;

  const shared = engine?.shared ?? {}, f = () => ({ value: 0 });
  const U = {
    uT: f(), uLoop: f(), uFps: f(), uK: f(), uOnce: f(), uStagger: f(), uLife: f(), uMode: { value: MODES[mode] }, uDir: { value: new Vector3(0, 1, 0) },
    uSpeed: f(), uSpread: f(), uGravity: f(), uTurb: f(), uTarget: { value: new Vector3() }, uShape: f(), uAt: { value: new Vector3() },
    uVol: { value: new Vector3(1, 1, 1) }, uSlant: f(), uSize: { value: new Vector2(1, 1) }, uLen: f(), uAspect: { value: ASPECT[look] },
    uPx: f(), uKind: { value: KINDS[o.kind] }, uSil: { value: SILS[o.shape] ?? 0 }, uOrient: { value: ORIENT[look] }, uSpin: f(),
    uFade: f(), uTwinkle: f(), uSplash: { value: new Vector2() }, uRamp: { value: Array.from({ length: 8 }, () => new Color()) },
    uRampN: { value: 1 }, uByLife: f(), uAvoid: { value: new Vector4() },
    uRes: shared.uRes ?? { value: new Vector2(1280, 800) }, uLightDir: shared.uLightDir ?? { value: new Vector3(-0.5, 0.75, 0.45).normalize() },
    uShade: { value: new Color() }, uShadeOn: f(), uEdge: { value: new Color() }, uEdgePx: f(), uEmit: { value: 1 }, uAlpha: { value: 1 },
    uSolid: { value: depth ? 1 : 0 }, uAdd: { value: !depth && o.blend === "add" ? 1 : 0 }, uOcc: f(), tPlateD: { value: null },
  };
  const mat = new ShaderMaterial({
    uniforms: U, vertexShader: VERT, fragmentShader: FRAG, side: DoubleSide, depthTest: true, depthWrite: depth, transparent: !depth,
    premultipliedAlpha: true, blending: depth ? NoBlending : o.blend === "add" ? AdditiveBlending : NormalBlending,
  });
  const mesh = new Mesh(geo, mat);
  mesh.name = `particles:${o.kind}`; mesh.frustumCulled = false; mesh.userData.noShadow = true;

  const pool = [], tmp = new Vector3();
  let fps = 12, size = 3, jit = 0, edgeOn = false, edgeW = 1, occlude = true;
  const paint = (hexes) => {
    const list = (Array.isArray(hexes) ? hexes : [hexes]).filter((h) => h != null);
    if (!list.length) list.push(DEFAULTS.colours[0]);
    list.forEach((h, j) => lin(h, (pool[j] ??= new Color())));
    const n = list.length;
    for (let i = 0; i < N; i++) { const c = pool[Math.min(n - 1, Math.floor(pick[i] * n))]; C[i * 4] = c.r; C[i * 4 + 1] = c.g; C[i * 4 + 2] = c.b; }
    for (let j = 0; j < 8; j++) U.uRamp.value[j].copy(pool[Math.min(j, n - 1)]);
    U.uRampN.value = Math.min(n, 8); aC.needsUpdate = true;
  };
  const apply = (p) => {
    const m = p.motion ?? EMPTY, v = p.volume ?? EMPTY;
    if (p.k !== undefined) U.uK.value = p.k;
    if (p.alpha !== undefined) U.uAlpha.value = p.alpha;
    if (p.emit !== undefined) U.uEmit.value = p.emit;
    if (p.life !== undefined) U.uLife.value = Math.min(Math.max(p.life, 0.01), 1e4);
    if (p.loop !== undefined) U.uLoop.value = Math.max(0, p.loop);
    if (p.once !== undefined) U.uOnce.value = p.once ? 1 : 0;
    if (p.stagger !== undefined) U.uStagger.value = Math.max(0, p.stagger);
    if (p.spin !== undefined) U.uSpin.value = p.spin;
    if (p.twinkle !== undefined) U.uTwinkle.value = p.twinkle;
    if (p.fps !== undefined) { fps = p.fps; U.uFps.value = fps > 0 ? fps : 12; }
    if (p.sizeMode !== undefined) U.uPx.value = p.sizeMode === "px" ? 1 : 0;
    if (p.size !== undefined || p.sizeJitter !== undefined) {
      size = p.size ?? size; jit = p.sizeJitter ?? jit;
      if (Array.isArray(size)) U.uSize.value.set(size[0], size[1]); else U.uSize.value.set(size * (1 - jit), size * (1 + jit));
    }
    if (p.length !== undefined) U.uLen.value = LONG.has(o.kind) ? Math.max(0, p.length) : 0;
    if (p.colourBy !== undefined) U.uByLife.value = p.colourBy === "life" ? 1 : 0;
    if (p.colours !== undefined) paint(p.colours);
    if (p.shade !== undefined) { U.uShadeOn.value = p.shade ? 1 : 0; if (p.shade) lin(p.shade, U.uShade.value); }
    if (p.edge !== undefined) { edgeOn = !!p.edge; if (p.edge) lin(p.edge, U.uEdge.value); }
    if (p.edgeWidth !== undefined) edgeW = p.edgeWidth;
    if (p.edge !== undefined || p.edgeWidth !== undefined) U.uEdgePx.value = edgeOn ? edgeW : 0;
    if (p.fade !== undefined) U.uFade.value = FADES[depth && p.fade === "alpha" ? "size" : p.fade] ?? 1;
    if (p.splashSize !== undefined) U.uSplash.value.set(p.splashSize[0], p.splashSize[1]);
    if (p.occlude !== undefined) occlude = !!p.occlude;
    if (m.speed !== undefined) U.uSpeed.value = m.speed;
    if (m.spread !== undefined) U.uSpread.value = m.spread;
    if (m.gravity !== undefined) U.uGravity.value = m.gravity;
    if (m.turbulence !== undefined) U.uTurb.value = m.turbulence;
    if (m.slant !== undefined) U.uSlant.value = m.slant;
    if (m.target !== undefined) v3(m.target, U.uTarget.value);
    if (m.dir !== undefined) { const d = v3(m.dir, U.uDir.value); if (d.lengthSq() < 1e-12) d.set(0, 1, 0); d.normalize(); }
    if (v.shape !== undefined) U.uShape.value = SHAPES[v.shape] ?? 0;
    if (v.at !== undefined) v3(v.at, U.uAt.value);
    if (v.size !== undefined) v3(v.size, U.uVol.value);
    if (p.avoid !== undefined) { const w = U.uAvoid.value; if (p.avoid) { v3(p.avoid.at, tmp); w.set(tmp.x, tmp.y, tmp.z, p.avoid.r ?? 0.6); } else w.w = 0; }
    if (p.visible !== undefined) mesh.visible = p.visible;
  };
  apply(o);

  return {
    group: mesh,
    update(ts) {
      U.uT.value = fps > 0 ? Math.floor(ts * fps + 1e-6) / fps : ts;
      // overlays read the plate's depth only on the layered path, and never while drawn into the plate itself (feedback loop)
      const comp = engine?.composer, occ = occlude && comp?.plates === true && !!comp.plateRT && (mesh.layers.mask & 1) === 0;
      U.uOcc.value = occ ? 1 : 0;
      U.tPlateD.value = occ ? comp.plateRT.depthTexture : null;
    },
    set: apply,
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// gallery: rising embers (additive), rain with splash rings (normal overlay), a burst of tumbling shards (solid), 4 s loop
export function demo(engine) {
  const group = new Group();
  const embers = makeParticles(engine, {
    count: 90, size: [1.5, 3.5], colours: ["#ff7a30", "#ffd27a"], emit: 1.8, blend: "add", life: 2.2, loop: 4, seed: 3,
    motion: { mode: "rise", speed: 0.4, spread: 0.1, turbulence: 0.05 }, volume: { size: [0.45, 0.3, 0.4], at: [-0.62, 0.3, 0] },
  });
  const rain = makeParticles(engine, {
    count: 160, splash: 16, splashSize: [0.03, 0.09], size: 0.006, length: 0.22, colours: ["#cfe8ea"], alpha: 0.8, loop: 4, seed: 5,
    motion: { mode: "rain", speed: 4.5, slant: 0.08 }, volume: { size: [0.36, 1.9, 0.4], at: [-0.03, 1, 0] },
  });
  const shards = makeParticles(engine, {
    count: 36, kind: "shard", size: [0.05, 0.1], sizeMode: "m", colours: ["#b42b1e", "#d3122e", "#7a0c09"], edge: "#fadf92",
    depth: true, life: 1.1, spin: 6, seed: 7, motion: { mode: "burst", speed: 0.22, gravity: -1.2 }, volume: { at: [0.58, 1.35, 0] },
  });
  group.add(embers.group, rain.group, shards.group);
  return {
    group,
    update(ts) {
      const t = ((ts % 4) + 4) % 4;
      embers.update(t); rain.update(t);
      shards.set({ k: Math.min(1, t / 1.25) }); shards.update(t);
    },
    dispose() { embers.dispose(); rain.dispose(); shards.dispose(); },
  };
}
