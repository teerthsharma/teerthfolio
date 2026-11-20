// The OCCLUDE pass of docs/topological-shader/README.md ("The shader as a function"): a per-frame multiply on the
// plate that darkens only where the plate is not live, never on the hero seal. Neutral by default: a = 0 gives A = 1
// everywhere, so the picture is the plate as it was. omega0 and a_max are pre-registered in T6, which has not run:
// they stay null here, and a non-neutral a is refused until they are set from that registration.
import { lumaCap } from "../layers/protocol.js";

export const OMEGA0 = null; // pre-registered in T6
export const A_MAX = null; // pre-registered in T6

// omega(Lambda) = omega0 / (1 + Lambda): a large Lambda moves slowly
export function omega(Lambda, omega0 = OMEGA0) {
  if (omega0 == null) throw new Error("omega0 is pre-registered in T6 and not set");
  return omega0 / (1 + Lambda);
}

// A(x, t) = 1 - a (1 - life) Lambda (1/2 + 1/2 sin(2 pi kappa / delta - omega t)) (1 - hero), clamped to [0, 1]
export function occlusionFactor({ a = 0, life = 0, Lambda = 0, kappa = 0, delta = 1, tq = 0, hero = 0, omega0 = OMEGA0, aMax = A_MAX }) {
  if (a === 0) return 1; // neutral arm: the plate is untouched
  if (aMax == null) throw new Error("a_max is pre-registered in T6 and not set");
  if (a < 0 || a > aMax) throw new RangeError(`a must be in [0, ${aMax}]`);
  const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * kappa) / delta - omega(Lambda, omega0) * tq);
  const A = 1 - a * (1 - life) * Lambda * wave * (1 - hero);
  return Math.min(1, Math.max(0, A));
}

// out_plate = mix(P, L, life); out = lumaCap(out_plate * A)
export function alivePixel(P, L, { life = 0, ...rest }) {
  const mixed = [0, 1, 2].map((i) => P[i] + (L[i] - P[i]) * life);
  const A = occlusionFactor({ life, ...rest });
  return lumaCap(mixed.map((c) => c * A));
}

// The same function in GLSL for the plate pass. Uniform names follow the README symbols; hero is read from the seal's
// id in the alpha channel of the id buffer, so the multiply cannot reach the seal.
export const OCCLUDE_FRAG = /* glsl */ `
uniform sampler2D tPlate;   // P: baked plate colour
uniform sampler2D tLive;    // L: live pattern
uniform sampler2D tLife;    // life(x, t): 1 live, 0 baked, band = 0 or 1 from xi
uniform sampler2D tId;      // seal id in alpha
uniform sampler2D tKD;      // kappa and Lambda from the static plate
uniform float uA, uTq, uOmega0, uDelta;
varying vec2 vUv;
void main() {
  vec3 P = texture2D(tPlate, vUv).rgb;
  vec3 L = texture2D(tLive, vUv).rgb;
  float life = texture2D(tLife, vUv).r;
  float hero = smoothstep(0.98, 1.0, texture2D(tId, vUv).a);
  vec2 kd = texture2D(tKD, vUv).rg;               // kappa, Lambda
  float omega = uOmega0 / (1.0 + kd.y);
  float wave = 0.5 + 0.5 * sin(6.283185307 * kd.x / uDelta - omega * uTq);
  float A = clamp(1.0 - uA * (1.0 - life) * kd.y * wave * (1.0 - hero), 0.0, 1.0);
  vec3 col = mix(P, L, life) * A;
  float Lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(col * min(1.0, 0.92 / max(Lum, 1e-4)), 1.0); // lumaCap, LUMA_MAX 0.92 as protocol.js
}
`;
