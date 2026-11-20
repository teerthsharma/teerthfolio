// Region type s is 0 LIVE, 1 BAKED, 2 BAND (lib/world/heat/latch.js). T_h texel: R = (s<<6)|(crit<<4)|mult, G = C, B = kappa, A = Lambda.
// Texel 0 (and every cell outside the 43 x 49 footprint) reads as LIVE. kappa and Lambda are reserved zeros, so uA = 0 and the alive multiply is 1.
export const topoChunk = /* glsl */ `
uniform sampler2D uTh;
uniform vec2 uGridOrigin;
uniform vec2 uCell;
uniform float uA;
uniform float uTq;
uniform float uOmega0;

float topoLife(float s, float C, float xi) {
  if (s == 1.0) return 0.0;
  if (s == 2.0) return 1.0 - step(1.0 - C, xi);
  return 1.0;
}

vec4 topoTexel(vec2 xz) {
  float row = floor((xz.y - uGridOrigin.y) / uCell.y + 0.5);
  float col = floor((xz.x - uGridOrigin.x - mod(row, 2.0) * 0.5 * uCell.x) / uCell.x + 0.5);
  if (col < 0.0 || col >= 43.0 || row < 0.0 || row >= 49.0) return vec4(0.0);
  return texture2D(uTh, (vec2(col, row) + 0.5) / vec2(43.0, 49.0));
}

float topoXi(vec2 fragCoord) {
  return fract(52.9829189 * fract(dot(fragCoord + 5.588238 * uTq, vec2(0.06711056, 0.00583715))));
}

float topoAlive(float life, float lam, float kappa, float hero) {
  if (uA == 0.0) return 1.0;
  float omega = uOmega0 / (1.0 + lam);
  float wave = 0.5 + 0.5 * sin(6.2831853 * kappa / 0.05 - omega * uTq);
  return 1.0 - uA * (1.0 - life) * lam * wave * (1.0 - hero);
}

vec3 topoOut(vec3 P, vec3 L, vec2 xz, vec2 fragCoord, float hero) {
  vec4 t = topoTexel(xz);
  float s = floor(t.r * 255.0 / 64.0 + 0.5 / 64.0);
  float life = topoLife(s, t.g, topoXi(fragCoord));
  return mix(P, L, life) * topoAlive(life, t.a, t.b, hero);
}
`;

export function lifeJs(s, C, xi) {
  if (s === 1) return 0;
  if (s === 2) return xi < 1 - C ? 1 : 0;
  return 1;
}

export function aliveJs(life, a, lam, kappa, tq, hero, omega0 = 1, delta = 0.05) {
  if (a === 0) return 1;
  const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * kappa) / delta - (omega0 / (1 + lam)) * tq);
  return 1 - a * (1 - life) * lam * wave * (1 - hero);
}
