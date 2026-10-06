// BAAL SIGIL RINGS (bible 3.13, easter egg 3). Layer 1. A floor ring (r 1.6 m) from 1.9 s and a sky ring in the cloud deck 3.0-6.4 s.
//
// Fragment maths, p = vUv in [-1, 1], r = |p|, a = atan(p.y, p.x) + spin   (spin steps on threes: floor(8 t) / 8 * 0.7)
//   rings      two circles at r = 1.00 and 0.88; constant pixel width via w = fwidth(r): line(d, px) = 1 - smoothstep(px w/2 - w/2, px w/2 + w/2, d)
//              the cyan edge is 3.4 px (#7fd8ff), the white core 1.3 px.  ~2 px at hero scale.
//   glyphs     12 flat triangles, sector s = floor((a + pi/12) / (pi/6)), local angle da = mod(a + pi/12, pi/6) - pi/12,
//              local point q = r (cos da, sin da); outline of the triangle with base x = .52 (half-width .17) and apex x = .84: min of 3 segment distances.
//   ticks      24 radial ticks r in [.90, .97], counter-rotating at -spin.
//   reveal     angular wipe frac = (atan2 + pi)/2pi < K; glyph s appears when K * 1.25 > s / 12; outer ring first, the inside last.
//   flat       no gradients: each pixel is white, cyan or transparent.
// Cue names: "sigilFloor" (1.9), "sigilSky" (3.0), "bolt" (6.4, flare then fade over 1 s).
import { bb, sstep, clamp01 } from "./lib.js";

const SIG_FS = /* glsl */ `
uniform float uK, uSpin, uA; uniform vec3 uEdge; uniform vec3 uCore; varying vec2 vUv;
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
void main() {
  vec2 p = vUv; float r = length(p); if (r > 1.06) discard;
  float w = fwidth(r) + 1e-5, ang = atan(p.y, p.x);
  float a = ang + uSpin, frac = (ang + 3.14159) / 6.28318;
  float sec = 3.14159 / 6.;
  float da = mod(a + sec * .5, sec) - sec * .5, sIdx = floor((a + sec * .5) / sec);
  vec2 q = r * vec2(cos(da), sin(da));
  float dRing = min(abs(r - 1.), abs(r - .88));
  vec2 A = vec2(.52, .17), B = vec2(.52, -.17), C = vec2(.84, 0.);
  float dTri = min(sdSeg(q, A, B), min(sdSeg(q, B, C), sdSeg(q, C, A)));
  float tk = 3.14159 / 12.;
  float da2 = mod(ang - uSpin + tk * .5, tk) - tk * .5;
  float dTick = r > .90 && r < .97 ? abs(r * sin(da2)) : 1.;
  float dDot = length(vec2(r * cos(da) - .66, r * sin(da))) ; // seal-of-the-djinn dot in each glyph
  float idx = mod(sIdx, 12.); idx = idx < 0. ? idx + 12. : idx;
  float gOn = step(idx / 12., uK * 1.25);
  float rOn = step(frac, uK * 1.1);
  float d = 1e3;
  d = min(d, mix(1e3, dRing, rOn));
  d = min(d, mix(1e3, dTri, gOn * (r > .45 ? 1. : 0.)));
  d = min(d, mix(1e3, dTick, rOn));
  float dd = mix(1e3, abs(dDot - .05), gOn);
  d = min(d, dd);
  float edge = 1. - smoothstep(1.7 * w - w * .5, 1.7 * w + w * .5, d);   // 3.4 px
  float core = 1. - smoothstep(.65 * w - w * .5, .65 * w + w * .5, d);   // 1.3 px
  float al = max(edge, core) * uA; if (al < .004) discard;
  gl_FragColor = vec4(mix(uEdge, uCore, core) * (1. + .6 * core), al);
}`;

export default function makeSigil(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "sigil";
  const tF = T.one("sigilFloor", 1.9), tS = T.one("sigilSky", 3.0), tB = T.one("bolt", 6.4);
  const mk = () => ({ uK: { value: 0 }, uSpin: { value: 0 }, uA: { value: 1 }, uEdge: { value: new THREE.Color("#7fd8ff") }, uCore: { value: new THREE.Color("#ffffff") } });
  // floor ring: a horizontal plane, radius 1.6 m * scale, lies 3 cm above the terrace
  const uF = mk();
  const floorM = new THREE.ShaderMaterial({ vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: SIG_FS, uniforms: uF, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), floorM);
  floor.rotation.x = -Math.PI / 2; floor.scale.setScalar(1.6 * L.scale); floor.position.set(L.at[0], L.floorY + 0.03, L.at[2]); floor.frustumCulled = false; floor.renderOrder = 3; floor.visible = false;
  group.add(floor);
  // sky ring: a camera-facing billboard in the cloud deck, 5 m radius, centred under the vortex
  const uS = mk();
  const sky = bb(THREE, sh, SIG_FS, uS, { push: 0, order: 3 });
  sky.userData.u.uCenter.value.set(L.vortex[0], L.vortex[1] - 7, L.vortex[2] + 2); sky.userData.u.uSize.value.set(6.5, 6.5);
  group.add(sky);
  return {
    group,
    update(t, dt, cue) {
      const spin = Math.floor(cue.t * 8) / 8;
      // floor ring
      const kF = clamp01((cue.t - tF) / 0.9), flare = 1 - sstep(tB, tB + 1.0, cue.t);
      floor.visible = cue.t >= tF && flare > 0.01;
      uF.uK.value = kF; uF.uSpin.value = spin * 0.7; uF.uA.value = flare * (0.9 + 0.5 * sstep(tB - 0.8, tB, cue.t));
      // sky ring
      const kS = clamp01((cue.t - tS) / 1.1);
      sky.visible = cue.t >= tS && cue.t < tB + 0.3;
      uS.uK.value = kS; uS.uSpin.value = -spin * 0.5; uS.uA.value = 0.85 * (1 - sstep(tB, tB + 0.3, cue.t));
    },
    dispose() { floor.geometry.dispose(); floorM.dispose(); sky.geometry.dispose(); sky.material.dispose(); },
  };
}
