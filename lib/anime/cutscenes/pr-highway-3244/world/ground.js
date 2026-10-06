// pr-highway-3244 WORLD / E3: the desert, a painted ochre plain. Layer 1 (it slides: the noise scrolls by D(t) along z).
// Plane 1100 x 1100 m at y = -0.03, one custom shader (id alpha 0.5 so the set-line pass sees it).
// Let P = (x, z + D) the scrolled ground coordinate.
//   big = fbm(0.05 P), mid = fbm(0.4 P), v = 0.55 big + 0.45 mid                       two scales of soft variation
//   rippleArg = 0.9 P.x + 7 fbm(0.3 P),  ripple = 0.5 + 0.5 sin(rippleArg) crest ridges
//   TONES (3 flat, razor edges via celStep):  hollow #e07f47 (v < 0.42), lit #f2ad66, crest #ffd18c where ripple > 0.8 and v > 0.40
//   dry brush along the track axis (z): bs = vn(2.4 P.x, 0.12 P.y);  value x 1.06 where bs > 0.64, x 0.93 where bs < 0.30 (hard)
//   1 px ink on the crest edge: |ripple - 0.8| < 1.2 fwidth(ripple) -> colour x 0.72 toward #b8503c
//   shadow hue shift: dark tones lean violet, never grey: shd = col * (0.80, 0.62, 0.78)
//   CONTACT: two hard flat shadows (chariot, bulls) thrown away from the sun along -S.xz * 0.7; ellipse = |(P - c)/r| < 1
//   FOG (bible 160..520 m): col = mix(col, haze #fa9480, 0.85 smoothstep(160, 520, dist)); toward the sun the haze goes gold
//   (#ffb352 x pow(max(view . S, 0), 4) * 0.5). Luma capped 0.9.
import { PAL, V, SUN } from "./common.js";
import { noiseGlsl } from "./noiseGlsl.js";

const sh = Math.hypot(SUN[0], SUN[2]), sx = SUN[0] / sh, sz = SUN[2] / sh;
const VERT = /* glsl */ `varying vec3 vL; varying vec3 vW;
  void main() { vL = position; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const FRAG = (noise) => /* glsl */ `varying vec3 vL; varying vec3 vW;
  uniform float uScroll; uniform vec3 uSunW;
  ${noise}
  float cs(float v, float t) { float w = fwidth(v) * 0.75 + 1e-5; return smoothstep(t - w, t + w, v); }
  float ell(vec2 P, vec2 c, vec2 r) { float d = length((P - c) / r); float w = fwidth(d) * 0.8 + 1e-4; return 1.0 - smoothstep(1.0 - w, 1.0 + w, d); }
  void main() {
    vec2 P = vec2(vL.x, vL.z + uScroll);
    float big = fbm(P * 0.05), mid = fbm(P * 0.4);
    float v = 0.55 * big + 0.45 * mid;
    float rip = 0.5 + 0.5 * sin(0.9 * P.x + 7.0 * fbm(P * 0.3));
    vec3 hollow = ${V(PAL.groundHollow)}, lit = ${V(PAL.groundLit)}, crest = ${V(PAL.groundCrest)};
    vec3 col = mix(hollow, lit, cs(v, 0.42));
    col = mix(col, crest, cs(rip, 0.8) * cs(v, 0.40));
    // dry brush strokes along the track axis
    float bs = vn(vec2(2.4 * P.x, 0.12 * P.y));
    col *= mix(1.0, 1.06, cs(bs, 0.64)) * mix(0.93, 1.0, cs(bs, 0.30));
    // 1 px ink on the crest edge
    float ew = fwidth(rip) * 1.2 + 1e-4;
    float edge = 1.0 - smoothstep(0.0, ew, abs(rip - 0.8));
    col = mix(col, ${V(PAL.groundInk)}, edge * 0.45 * cs(v, 0.40));
    // hard flat contact shadows, thrown away from the sun
    vec2 off = vec2(${F2(-sx * 0.7)}, ${F2(-sz * 0.7)});
    float contact = max(ell(vL.xz, off, vec2(1.55, 2.5)), ell(vL.xz, off + vec2(0.0, 6.4), vec2(1.7, 2.3)));
    col *= mix(vec3(1.0), vec3(0.62, 0.42, 0.52), contact * 0.85);
    // fog and sun haze
    float dist = length(vW - cameraPosition);
    vec3 vd = normalize(vW - cameraPosition);
    col = mix(col, ${V(PAL.haze)}, 0.85 * smoothstep(160.0, 520.0, dist));
    col += ${V(PAL.sunGlow1)} * 0.5 * pow(max(dot(vd, uSunW), 0.0), 4.0) * smoothstep(40.0, 300.0, dist);
    float L = dot(col, vec3(0.299, 0.587, 0.114));
    if (L > 0.9) col *= 0.9 / L;
    gl_FragColor = vec4(col, 0.5);
  }`;
function F2(x) { return x.toFixed(3); }

export function buildGround(ctx) {
  const { THREE } = ctx;
  const uniforms = { uScroll: { value: 0 }, uSunW: { value: new THREE.Vector3(...SUN) } };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG(noiseGlsl(ctx)) });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100).rotateX(-Math.PI / 2), mat);
  mesh.position.y = -0.03; mesh.frustumCulled = false; mesh.userData.layer = 1;
  return { mesh, uniforms, dispose() { mesh.geometry.dispose(); mat.dispose(); } };
}
