// THE PLANET CRUST (bible 3.3, 3.4, 3.5): a sphere r 170 m, the pup on its north pole (+y), lit only by the eye.
// Layer 1 (id 0.60 > 0.5): cracks breathe, the gold ripple runs, the mist drifts, all on stepped time.
import { CustomBlending, FrontSide, Mesh, OneFactor, OneMinusSrcAlphaFactor, ShaderMaterial, SphereGeometry, SrcAlphaFactor, ZeroFactor } from "three";
import { U } from "./palette.js";
import { BANDS, NOISE3, SLASH } from "./glsl.js";

export const PLANET_R = 170;

// vertex: world position only (the sphere is its own normal: n = normalize(p - centre))
const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

// ---------------------------------------------------------------------------------------------------------------------
// Fragment maths.
//   n = (p - c)/|p - c|       q = n R (metres on the sphere)       alt = |cam - c| - R (camera altitude)
//   relief    the normal is tilted by the gradient of f3(0.8 q) (central differences, eps 0.15 m) with weight near = smoothstep(150, 15, alt),
//             so the ground near the pup has rocky facets that catch the key
//   key       k = normalize(hole + n * 0.45 (1 - smoothstep(10, 120, alt)))   far away the eye is the sun (a crescent), close to the
//             ground it is a grazing key tilted up so facets facing it read
//   l         dot(n', k); band3(l): shadow < 0, mid 0..0.5, lit > 0.5  (hard edges, 4 px hatch in shadow)
//   tones     shadow #231e2a (hue pulled to indigo), mid #5a4a63, lit #5a4a63 warmed to crescent gold #f2b25a where n faces the eye;
//             bone dust #8c8474 at 40% in drifts: smoothstep(0.5, 0.72, f3(4n + 9)) at 0.4 and grit f3(0.9 q) near the camera
//   cracks    c1 = cracks(16 n + warp)  thin where F2-F1 < 0.035; c2 = cracks(0.45 q + warp) thin below 0.018 (near scale)
//             leak = smoothstep(0.5, 0.72, f3(22 n + 4)) : not every seam burns; breathe = 0.825 + 0.175 sin(2pi t / 5.7 + 2pi cellHash)
//             gold on one cell in five (cellHash > 0.8); teal core #19e6c8 with #7affea inner
//   ripple    surface distance from the pole s = R acos(n.y); front = smoothstep(1.5, 0, |s - uRipple|) * uRippleAmp, a gold 1.5 m front at 40 m/s;
//             it lights every seam it crosses (crack = max(leak crack, any crack * front)) and tints it gold
//   limb      fr = (1 - |n.v|)^3: teal haze on the night side, gold where the eye shines past (smoothstep(-0.3, 0.4, n.hole)); only from altitude
//   mist      far ground sinks into teal #0f2e32: smoothstep(14, 60, dist) (1 - smoothstep(8, 45, alt)), posterised to 3 levels
const FRAG = /* glsl */ `
  ${NOISE3}
  ${BANDS}
  ${SLASH}
  uniform vec3 uHole, uCenter;
  uniform float uR, uTime, uId, uRipple, uRippleAmp;
  uniform vec3 cDeep, cDark, cLit, cBone, cTeal, cTealHi, cGold, cViolet, cCresc, cMist, cIndigo;
  varying vec3 vWorld;
  void main() {
    vec3 ec; float ed;
    if (slashCut(ec, ed) > 0.5) discard;
    vec3 rel = vWorld - uCenter;
    vec3 n = rel / max(length(rel), 1e-3);
    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    vec3 v = toCam / max(dist, 1e-3);
    float alt = length(cameraPosition - uCenter) - uR;
    vec3 q = n * uR;
    float near = smoothstep(150.0, 15.0, alt);
    // relief: gradient of the rock noise tilts the normal
    float e = 0.15;
    vec3 qs = q * 0.8;
    float g0 = f3(qs);
    vec3 grad = vec3(f3(qs + vec3(e, 0, 0)) - g0, f3(qs + vec3(0, e, 0)) - g0, f3(qs + vec3(0, 0, e)) - g0) / e;
    vec3 nr = normalize(n + 0.35 * near * (grad - n * dot(grad, n)));
    vec3 key = normalize(uHole + n * 0.45 * (1.0 - smoothstep(10.0, 120.0, alt)));
    float l = dot(nr, key);
    // tones
    float big = f3(n * 7.0);
    float drift = smoothstep(0.5, 0.72, f3(n * 4.0 + 9.0)) * 0.4 + smoothstep(0.55, 0.8, f3(q * 0.9)) * 0.4 * near;
    vec3 shadow = mix(cDark, cIndigo * 0.5, 0.5);
    vec3 mid = cLit * (0.8 + 0.4 * big);
    vec3 lit = mix(cLit, cCresc * 0.8, smoothstep(0.2, 0.8, dot(n, uHole)) * 0.75);
    shadow = mix(shadow, cBone * 0.12, drift);
    mid = mix(mid, cBone * 0.38, drift);
    lit = mix(lit, cBone * 0.7, drift);
    vec3 col = band3(l, shadow, mid, lit);
    col *= 0.85 + 0.3 * f3(q * 0.35);                                   // grit
    if (l < 0.0) col = mix(col, cDeep, 0.35 * hatch4());                 // 4 px hatch in the shadow band
    // cracks
    vec2 k1 = cracks(n * 16.0 + (f3(n * 30.0) - 0.5) * 1.2);
    vec2 k2 = cracks(q * 0.45 + (f3(q * 0.9) - 0.5) * 1.4);
    float leak = smoothstep(0.5, 0.72, f3(n * 22.0 + 4.0));
    float c1 = smoothstep(0.035, 0.0, k1.x);
    float c2 = smoothstep(0.018, 0.0, k2.x) * smoothstep(0.45, 0.68, f3(q * 0.08)) * smoothstep(160.0, 20.0, alt);
    float s = uR * acos(clamp(n.y, -1.0, 1.0));
    float front = uRippleAmp * smoothstep(1.5, 0.0, abs(s - uRipple)) * step(0.001, uRipple);
    float crack = max(max(c1 * leak, c2 * 0.8), max(c1, c2) * front);
    col *= 1.0 - 0.45 * smoothstep(0.12, 0.0, k1.x);                     // the crack's dark lip
    float breathe = 0.825 + 0.175 * sin(uTime * 1.102 + k1.y * 6.2831853);
    vec3 teal = mix(cTeal, cTealHi, smoothstep(0.015, 0.0, k1.x));
    vec3 ccol = mix(teal, cGold, max(step(0.8, k1.y), front));
    float dayB = smoothstep(0.0, 0.5, l);
    col += ccol * crack * (0.75 * breathe + 1.4 * front) * (1.0 - 0.5 * dayB);
    // limb
    float fr = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 3.0);
    col += mix(cTeal * 0.35, cCresc * 0.8, smoothstep(-0.3, 0.4, dot(n, uHole))) * fr * smoothstep(5.0, 60.0, alt);
    // far ground mist, 3 levels
    float m = smoothstep(14.0, 60.0, dist) * (1.0 - smoothstep(8.0, 45.0, alt));
    m = floor(m * 2.0 + 0.5) * 0.5 * 0.8;
    col = mix(col, cMist, m);
    col = mix(col, ec, ed);
    gl_FragColor = vec4(col, uId);
  }`;

export function buildPlanet(S) {
  const geo = new SphereGeometry(PLANET_R, 192, 96); // ~5.6 m ring spacing at the pole: facet sag 2 cm under a pup
  const mat = new ShaderMaterial({
    uniforms: {
      uHole: S.uHole, uCenter: S.uCenter, uR: { value: PLANET_R }, uTime: S.uTime, uId: { value: 0.6 }, uRipple: S.uRipple, uRippleAmp: S.uRippleAmp,
      uCut: S.uCut, uCutN: S.uCutN, uRes: S.uRes, uEdgeA: S.uEdgeA, uEdgeB: S.uEdgeB,
      cDeep: U("deep"), cDark: U("basaltDark"), cLit: U("basaltLit"), cBone: U("bone"), cTeal: U("teal"), cTealHi: U("tealHi"), cGold: U("gold"),
      cViolet: U("violet"), cCresc: U("crescent"), cMist: U("mist"), cIndigo: U("indigo"),
    },
    vertexShader: VERT, fragmentShader: FRAG,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.position.set(0, -PLANET_R + 0.03, 0); // local to the seal frame: the pole is the pup's feet (+3 cm against facet sag)
  return { mesh, dispose() { geo.dispose(); mat.dispose(); } };
}

// ---------------------------------------------------------------------------------------------------------------------
// GROUND MIST (bible 3.5): two thin shells at +0.25 m and +0.55 m (knee height), posterised to 3 alpha levels, drifting on threes.
//   a = smoothstep(0.42, 0.70, f3((x, 0.3 y, z)/ 7 + drift)); a = round(2 a)/2; alpha = 0.55 a * (camera within ~90 m) * (clear of the pup)
// The pup's 3.5..6 m radius is kept clear (uPole) so mist never covers the seal. Over-blend that keeps the target alpha (the set id).
const MIST_FRAG = /* glsl */ `
  ${NOISE3}
  uniform vec3 uCenter, uPole, cMist; uniform float uR, uDrift, uSeed;
  varying vec3 vWorld;
  void main() {
    float alt = length(cameraPosition - uCenter) - uR;
    float dist = length(cameraPosition - vWorld);
    float a = smoothstep(0.42, 0.70, f3(vec3(vWorld.x, vWorld.y * 0.3, vWorld.z) * 0.14 + vec3(uDrift, 0.0, uDrift * 0.6) + uSeed));
    a = floor(a * 2.0 + 0.5) * 0.5;
    float clear = smoothstep(3.5, 6.0, length(vWorld.xz - uPole.xz));
    float fade = smoothstep(90.0, 8.0, dist) * smoothstep(60.0, 8.0, alt);
    gl_FragColor = vec4(cMist, 0.55 * a * clear * fade);
  }`;

export function buildMist(S) {
  const shells = [], mats = [];
  [0.25, 0.55].forEach((h, i) => {
    const geo = new SphereGeometry(PLANET_R + h, 128, 64);
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false, side: FrontSide, blending: CustomBlending,
      blendSrc: SrcAlphaFactor, blendDst: OneMinusSrcAlphaFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor, // over, keep the set id in alpha
      uniforms: { uCenter: S.uCenter, uPole: S.uPole, uR: { value: PLANET_R }, cMist: U("mist"), uDrift: S.uMistDrift, uSeed: { value: i * 7.3 } },
      vertexShader: VERT, fragmentShader: MIST_FRAG,
    });
    const m = new Mesh(geo, mat);
    m.frustumCulled = false; m.renderOrder = 5 + i;
    m.position.set(0, -PLANET_R + 0.03, 0);
    shells.push(m); mats.push(mat);
  });
  return { shells, dispose() { shells.forEach((m) => m.geometry.dispose()); mats.forEach((m) => m.dispose()); } };
}
