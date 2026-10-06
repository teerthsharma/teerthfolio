// pr-highway-3244 WORLD / E5: the speedway straight and the finish apron, drawn as ufotable draws a road: flat asphalt, painted marks.
// One custom shader on a 36 x 330 m plane (rail frame: x across, z along the travel; z from -60 to 270; layer 1).
//   half width  hw(z) = 8 + 6 smoothstep(zFin + 3, zFin + 12, z)            the apron opens past the line
//   discard where |x| > hw + 0.9 (kerb band is 0.9 m)
//   ASPHALT   two flat tones: lit #3a3440, shadow #241e2e where fbm(0.6 P) > 0.58 (hard patch), tarmac seams every 12 m (1 px)
//   KERB      |x| in [hw, hw+0.9]: 2 m stripes, #e23a2e / #fbf5ea alternate on floor(z / 2); 1 px #241a2a edge via fwidth
//   LANES     dashed lines at |x| = 2.67, width 0.12, dash 3 m on / 3 m off (none on the apron)
//   CHEQUER   |z - zFin| < 0.75, 0.75 m cells: parity(floor(x/0.75) + floor((z - zFin + 0.75)/0.75)) -> #fbf5ea / #1a1420
//   SKID (E5 CHANGE) two dark strokes at x = +-0.95, width 0.30, from z = 0 to min(D, 18): the launch tyre marks.
//             coverage = band(x) * step(z, min(D, 18)) * (0.7 + 0.3 vn(3 z)) ; colour #17121c mixed 0.8; broken at the tail by fbm
//   cream is capped to 0.9 so the paint never blooms. Colours are flat; no gloss (the gloss was the old glassy look).
import { PAL, V } from "./common.js";
import { noiseGlsl } from "./noiseGlsl.js";

const VERT = /* glsl */ `varying vec3 vL; void main() { vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = (noise) => /* glsl */ `varying vec3 vL; uniform float uFin; uniform float uD;
  ${noise}
  float cs(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
  float line(float d, float half_) { float w = fwidth(d) * 0.8 + 1e-5; return 1.0 - smoothstep(half_ - w, half_ + w, abs(d)); }
  void main() {
    float x = vL.x, z = vL.z, ax = abs(x);
    float hw = 8.0 + 6.0 * smoothstep(uFin + 3.0, uFin + 12.0, z);
    if (ax > hw + 0.9) discard;
    vec2 P = vec2(x, z);
    vec3 col = mix(${V(PAL.asphalt)}, ${V(PAL.asphaltShadow)}, cs(fbm(P * 0.6), 0.58));
    // seams
    col = mix(col, ${V(PAL.asphaltShadow)}, 0.55 * line(fract(z / 12.0) * 12.0 - 0.0, 0.05));
    // dashed lanes
    float dash = step(fract(z / 6.0), 0.5) * (1.0 - step(uFin + 3.0, z));
    float ln = max(line(ax - 2.67, 0.06), line(ax - 5.34, 0.06)) * dash;
    col = mix(col, ${V(PAL.cream)} * 0.9, ln * step(ax, hw));
    // skid marks (two strokes, the launch)
    float lim = min(uD, 18.0);
    float sk = max(line(ax - 0.95, 0.15), 0.0) * step(0.0, z) * (1.0 - cs(z, lim));
    sk *= 0.7 + 0.3 * vn(vec2(3.0 * z, ax * 9.0));
    sk *= smoothstep(0.25, 0.6, fbm(vec2(z * 1.7, ax * 6.0)) + 0.35 * (1.0 - z / max(lim, 1.0)));
    col = mix(col, ${V("#17121c")}, 0.8 * sk * step(ax, hw));
    // chequered line
    float inLine = step(abs(z - uFin), 0.75) * step(ax, hw);
    float par = mod(floor(x / 0.75) + floor((z - uFin + 0.75) / 0.75), 2.0);
    col = mix(col, mix(${V(PAL.cream)} * 0.9, ${V(PAL.chequerDark)}, par), inLine);
    // kerbs
    float kb = step(hw, ax) * (1.0 - step(hw + 0.9, ax));
    float stripe = mod(floor(z / 2.0), 2.0);
    vec3 kc = mix(${V(PAL.kerbRed)}, ${V(PAL.cream)} * 0.9, stripe);
    col = mix(col, kc, kb);
    float ke = max(line(ax - hw, 0.04), line(ax - hw - 0.9, 0.04));
    col = mix(col, ${V(PAL.ink)}, 0.85 * ke * step(ax, hw + 0.95));
    gl_FragColor = vec4(col, 0.5);
  }`;

export function buildTrack(ctx, zFin) {
  const { THREE } = ctx;
  const uniforms = { uFin: { value: zFin }, uD: { value: 0 } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG(noiseGlsl(ctx)), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(36, 330).rotateX(-Math.PI / 2).translate(0, 0, 105), mat);
  mesh.position.y = 0.012; mesh.frustumCulled = false; mesh.userData.layer = 1;
  return { mesh, uniforms, dispose() { mesh.geometry.dispose(); mat.dispose(); } };
}
