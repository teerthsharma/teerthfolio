// THE CLOUD DECK (layer 1: it animates), bible E01. A ceiling, not a haze: opaque, 40 m up, posterised cumulus masses seen
// from UNDERNEATH, cold slate underside, 3 flat tones plus a violet-shifted deep, hard cut edges. One shader on a 350 m disc.
//
// Masses. Voronoi cells of 11 m (own cellv returns F1, F2-F1, id): each cell is one mass (bible: 14 in the target; the field
// shows ~14 around the arena). Height field of the underside bulge (metres-ish, 0..1.3):
//   lobe(s) = (1 - 1.3 F1)^0.55 (0.75 + 0.5 id) + 0.22 vn(0.33 s) + 0.1 vn(0.9 s)
// Fake normal of the downward-bulging underside y = -A lobe:  n = normalize(-A dh/dx, -1, -A dh/dz), A = 3, dh by forward
// differences (eps 0.35). The seams between masses (F2-F1 < 0.045) are cut to the deep tone, 0.4 m wide: the "torn rims" before the tear.
// Tone value (hard-stepped, AA by fwidth):
//   t = 0.22 + 0.55 (1 - lobe) + 0.42 dot(n.xz, L) + 0.28 (fbm(0.5 s) - 0.5),   L = normalize(-0.6, -0.8)  (light: upper-left behind)
//   deep < 0.18 <= shadow < 0.40 <= mid < 0.62 <= lit < 0.92 <= top
// Shadow and deep shift toward blue-violet #4a4f86 (never grey).
// Halftone (underside band only): in t in [0.62, 0.76] the lit cell carries dots of the mid tone on a 6 px grid turned 45 deg,
//   radius 0.35 cell (1 - (t - 0.62)/0.14): a gradient that dies over ~120 px, never on characters.
//
// THE SPLIT (uSplit 0..1, eased out cubic from the beat): a jagged hole of radius R = 5.5 split j(ang), j = 1 + 0.22 n1 + 0.12 n2 + 0.06 n3
// (n_k = vn on the unit circle so the rim closes; phase boils every 2 drawings via uBoil). Cloud content is slid OUTWARD by
//   slide = 1.1 split exp(-(rr - R)/9)       (sample point s = p - dir slide: "masses slide apart 1.1 m")
// and the rim is pushed out: t += 0.65 (1 - smoothstep(0, 0.5 + 1.4 split, rr - R)): a lit ring that thickens 0.8 m toward the hole.
// Rim ink (#1d2236) is 2 px: ink = 1 - smoothstep(0.6 px, px, rr - R) with px = fwidth(rr) 1.6. Warm edge light (#f5e0b0) on 12% of the
// rim length: mask = step(0.88, vn(u 3.1 + 4)), 1 px band just inside the ink. The hole itself is `discard`: the blue dome shows behind.
// Far fade: mix to haze #8d95ad over 140 .. 330 m.
import { ALL, DECK_Y } from "./palette.js";

const VS = /* glsl */ `
  varying vec3 vLP; varying vec3 vWP;
  void main() { vLP = position; vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const FS = (noise) => /* glsl */ `
  uniform vec2 uHole; uniform float uSplit; uniform vec2 uDrift; uniform float uBoil;
  varying vec3 vLP; varying vec3 vWP;
  ${noise}
  ${ALL}
  vec3 cellv(vec2 p) {
    vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y)); vec2 o = h22(i + g) * 0.8 + 0.1; float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = h21(i + g + 11.0); } else if (d < d2) d2 = d;
    }
    return vec3(d1, d2 - d1, id);
  }
  float lobe(vec2 s) {
    vec3 c = cellv(s / 11.0);
    return pow(clamp(1.0 - c.x * 1.3, 0.0, 1.0), 0.55) * (0.75 + 0.5 * c.z) + 0.22 * vn(s * 0.33) + 0.1 * vn(s * 0.9);
  }
  float jagN(vec2 u, float k, float ph) { return vn(u * k + ph) - 0.5; }
  void main() {
    vec2 q = vLP.xz - uHole; float rr = length(q);
    vec2 u = rr > 1e-4 ? q / rr : vec2(1.0, 0.0);
    float ph = uBoil * 1.7;
    float jag = 1.0 + 0.22 * jagN(u, 2.2, ph) + 0.12 * jagN(u, 6.0, -ph + 5.0) + 0.06 * jagN(u, 14.0, ph * 0.5 + 9.0);
    float Rh = 5.5 * uSplit * jag;
    float d = rr - Rh;
    float slide = 1.1 * uSplit * exp(-max(d, 0.0) / 9.0);
    vec2 s = vLP.xz - u * slide + uDrift;
    const float E = 0.35;
    float h0 = lobe(s), hx = lobe(s + vec2(E, 0.0)), hz = lobe(s + vec2(0.0, E));
    vec2 g = vec2(hx - h0, hz - h0) / E;
    vec2 nxz = -3.0 * g;
    float dirT = clamp(dot(nxz, normalize(vec2(-0.6, -0.8))) * 1.2, -1.0, 1.0);
    float t = 0.22 + 0.55 * (1.0 - clamp(h0, 0.0, 1.2)) + 0.42 * dirT + 0.28 * (fbm(s * 0.5) - 0.5);
    float lift = (1.0 - smoothstep(0.0, 0.5 + 1.4 * uSplit, max(d, 0.0))) * step(0.001, uSplit);
    t += 0.65 * lift;
    float w = fwidth(t) * 0.9 + 0.004;
    vec3 shadowV = mix(C_deckShadow, C_violet, 0.4), deepV = mix(C_deckDeep, C_violet, 0.15);
    vec3 col = deepV;
    col = mix(col, shadowV, smoothstep(0.18 - w, 0.18 + w, t));
    col = mix(col, C_deckMid, smoothstep(0.40 - w, 0.40 + w, t));
    col = mix(col, C_deckLit, smoothstep(0.62 - w, 0.62 + w, t));
    col = mix(col, C_deckTop, smoothstep(0.92 - w, 0.92 + w, t));
    float dist = length(vWP - cameraPosition);
    float far = smoothstep(140.0, 330.0, dist);
    // halftone on the lit side of the mid/lit cut, near the camera only
    vec2 gp = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / 6.0;
    float rad = 0.35 * clamp(1.0 - (t - 0.62) / 0.14, 0.0, 1.0);
    float dots = (1.0 - smoothstep(rad - 0.07, rad + 0.07, length(fract(gp) - 0.5))) * step(0.62, t) * (1.0 - far);
    col = mix(col, C_deckMid, dots);
    // the seams between masses
    vec3 cs = cellv(s / 11.0);
    col = mix(col, deepV, (1.0 - smoothstep(0.02, 0.07, cs.y)) * 0.85 * (1.0 - far));
    // torn rim: ink 2 px, then a 1 px warm edge on 12% of the rim
    float px = fwidth(rr) * 1.6 + 1e-4;
    float ink = (1.0 - smoothstep(px * 0.6, px, max(d, 0.0))) * step(0.001, uSplit);
    float warm = step(0.88, vn(u * 3.1 + 4.0)) * smoothstep(px * 3.2, px * 1.1, max(d, 0.0)) * (1.0 - ink) * step(0.001, uSplit);
    col = mix(col, C_warm, warm);
    col = mix(col, C_ink, ink);
    col = mix(col, C_haze, far);
    if (rr < Rh) discard;
    gl_FragColor = vec4(col, 0.5);
  }`;

export function buildDeck(ctx, hole) {
  const { THREE } = ctx;
  const geo = new THREE.CircleGeometry(350, 96).rotateX(-Math.PI / 2).translate(0, DECK_Y, 0);
  const uniforms = { uHole: { value: new THREE.Vector2(hole[0], hole[2]) }, uSplit: { value: 0 }, uDrift: { value: new THREE.Vector2() }, uBoil: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: FS(ctx.tools.glslFor(["noise"])), side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  ctx.setLayer(mesh, 1);
  return { mesh, uniforms, dispose() { geo.dispose(); mat.dispose(); } };
}
