// THE SUPER-TIER MAGIC CIRCLE (bible: Magic circle). Flat cartoon rings under the seal: closed fills, 3 px black outline, 3 rings x 24 runes,
// a hexagram, a purple core, and rising gold beams at 25 percent additive. The 432 rune is hidden in the inner ring (easter egg 6).
// MATHS (all in the plane, p = (x,z)/R in [-1,1], r = |p|, a = atan2)
//   ring i occupies r/s_i in [r0_i, r1_i], s_i the open/close scale (0 hides it). Bands: outer [.86,1.00]  middle [.52,.66]  inner [.20,.32].
//   rotation theta_i(t) = dir_i * 20deg/s * floor(8 t)/8   (threes), dir = +1,-1,+1; the star turns with -dir_1.
//   rune cell     c = floor(N (a+theta)/2pi), N=24; local q = ( (fract(.)-.5) * ratio, u-.5 ), ratio = cell arc length / band width.
//   glyph kind    k = floor(4 h(c)) -> {bar+cross, chevron, ring+stem, saltire}; stroke d = min segment distances, filled where d < .07 (AA by fwidth).
//   432 rune      inner ring cells 3,4,5 draw 4,3,2 tally bars instead (a reader of the PR number finds it).
//   ink           |r s - edge| < 1.5 px  (px = fwidth(r)) at every band edge and star edge: uniform 3 px outline, no taper.
//   star          hexagram = two triangles, d_tri = max_k dot(p, n_k) - R/2; outline on min(dA,dB) = 0.
//   emissive      gold x uGlow (1.25) so only the circle blooms at ~0.25; flat 2-band: lit upper 25 percent of each band.
import { Group, Mesh, PlaneGeometry, ShaderMaterial, CylinderGeometry, DoubleSide, AdditiveBlending } from "three";
import { PAL, clamp, easeOut3, since, col } from "./lib.js";

const FRAG = `
varying vec2 vP; uniform float uRot, uFlash, uGlow, uAlpha; uniform vec3 uS;
uniform vec3 uGold, uLit, uPurple, uViolet, uInk, uHi;
const float PI = 3.14159265;
float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float glyph(vec2 q, float id){
  float k = floor(h1(id) * 4.0), d = 1e3;
  if (k < 1.0)      d = min(min(sdSeg(q, vec2(0.0,-.4), vec2(0.0,.4)), sdSeg(q, vec2(-.2,0.0), vec2(.2,0.0))), length(q - vec2(0.0,.3)));
  else if (k < 2.0) d = min(sdSeg(q, vec2(-.22,-.35), vec2(0.0,.3)), sdSeg(q, vec2(.22,-.35), vec2(0.0,.3)));
  else if (k < 3.0) d = min(abs(length(q) - .2), sdSeg(q, vec2(0.0,.2), vec2(0.0,.42)));
  else              d = min(sdSeg(q, vec2(-.2,-.3), vec2(.2,.3)), sdSeg(q, vec2(.2,-.3), vec2(-.2,.3)));
  return d; }
float tally(vec2 q, float n){ float d = 1e3; for (int i = 0; i < 4; i++){ if (float(i) < n){ float x = (float(i) - (n - 1.0) * .5) * .24; d = min(d, sdSeg(q, vec2(x,-.36), vec2(x,.36))); } } return d; }
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
float tri(vec2 p, float R){ float d = -1e3; for (int i = 0; i < 3; i++){ float an = 2.0*PI*float(i)/3.0 + PI*0.5; d = max(d, dot(p, vec2(cos(an), sin(an))) - R*0.5); } return d; }
vec4 over(vec4 b, vec4 t){ return vec4(mix(b.rgb, t.rgb, t.a), b.a + t.a * (1.0 - b.a)); }

vec4 ring(float r, float a, float r0, float r1, float s, float th, float ncell, float tl, float px, inout float inkA){
  if (s < 0.002) return vec4(0.0);
  float rr = r / s, pxr = px / s; float inb = step(r0, rr) * step(rr, r1);
  float edge = max(1.0 - smoothstep(1.5*pxr, 2.5*pxr, abs(rr - r0)), 1.0 - smoothstep(1.5*pxr, 2.5*pxr, abs(rr - r1)));
  inkA = max(inkA, edge * step(r0 - 3.0*pxr, rr) * step(rr, r1 + 3.0*pxr));
  float u = (rr - r0) / (r1 - r0);
  vec3 c = u > 0.75 ? uLit : uGold;
  float aa = a + th, cellf = aa / (2.0*PI) * ncell, id = floor(mod(cellf, ncell));
  float ratio = (rr * 2.0*PI / ncell) / (r1 - r0);
  vec2 q = vec2((fract(cellf) - 0.5) * ratio, u - 0.5);
  float d = (tl > 0.5 && id >= 3.0 && id <= 5.0) ? tally(q, 7.0 - id) : glyph(q, id);
  float fw = fwidth(d) + 1e-4; float g = 1.0 - smoothstep(0.07 - fw, 0.07 + fw, d);
  c = mix(c, uViolet, g);
  return vec4(c * uGlow, inb);
}
void main(){
  float r = length(vP); if (r > 1.0) discard;
  float a = atan(vP.y, vP.x), px = fwidth(r) + 1e-5, inkA = 0.0;
  vec4 C = vec4(0.0);
  C = over(C, vec4(uViolet, 0.55 * step(r, 0.86 * uS.x)));
  C = over(C, vec4(uPurple, step(r, 0.20 * uS.z) * 0.95));
  vec2 ps = rot(vP / max(uS.y, 0.001), -uRot * 20.0 * PI / 180.0);
  float dA = tri(ps, 0.5), dB = tri(-ps, 0.5), ds = min(dA, dB);
  float starIn = uS.y > 0.002 ? 1.0 : 0.0;
  float lw = px / max(uS.y, 0.001);
  C = over(C, vec4(uInk, starIn * (1.0 - smoothstep(2.5*lw, 3.5*lw, abs(ds)))));
  C = over(C, vec4(uLit * uGlow, starIn * (1.0 - smoothstep(0.8*lw, 1.6*lw, abs(ds)))));
  float k = 20.0 * PI / 180.0 * uRot;
  C = over(C, ring(r, a, 0.86, 1.00, uS.x,  k, 24.0, 0.0, px, inkA));
  C = over(C, ring(r, a, 0.52, 0.66, uS.y, -k, 24.0, 0.0, px, inkA));
  C = over(C, ring(r, a, 0.20, 0.32, uS.z,  k, 24.0, 1.0, px, inkA));
  C = over(C, vec4(uInk, inkA));
  C.rgb = mix(C.rgb, uHi, uFlash * 0.6 * C.a);
  gl_FragColor = vec4(C.rgb, C.a * uAlpha);
  if (gl_FragColor.a < 0.01) discard;
}`;

export function buildCircle(ctx) {
  const R = 8; // outer radius 8 m under Ainz
  const group = new Group();
  const mat = new ShaderMaterial({
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: FRAG, transparent: true, depthWrite: false, side: DoubleSide,
    uniforms: {
      uRot: { value: 0 }, uFlash: { value: 0 }, uGlow: { value: 1.25 }, uAlpha: { value: 1 }, uS: { value: [0, 0, 0] },
      uGold: { value: col(PAL.gold) }, uLit: { value: col(PAL.goldLit) }, uPurple: { value: col(PAL.purple) },
      uViolet: { value: col(PAL.violet) }, uInk: { value: col(PAL.deep) }, uHi: { value: col(PAL.hi) },
    },
  });
  const disc = new Mesh(new PlaneGeometry(2, 2), mat);
  disc.rotation.x = -Math.PI / 2; disc.scale.setScalar(R); disc.position.y = 0.03; disc.renderOrder = 2;
  group.add(disc);

  // beams: 8 additive gold columns on the rings, 25 percent, three flat vertical steps (no gradient), rising 14 m
  const beamMat = new ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uA; uniform vec3 uC;
      void main(){ float band = vUv.y < 0.35 ? 1.0 : (vUv.y < 0.7 ? 0.6 : 0.3);
        float edge = abs(vUv.x - 0.5) < 0.35 ? 1.0 : 0.5; gl_FragColor = vec4(uC * 1.1, uA * band * edge); }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uA: { value: 0 }, uC: { value: col(PAL.hi) } },
  });
  const beams = [];
  const rng = ctx.rng("topo-beams");
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * Math.PI * 2 + 0.2, rad = R * (i % 2 ? 0.93 : 0.58);
    const m = new Mesh(new CylinderGeometry(0.18 + 0.1 * rng(), 0.3 + 0.15 * rng(), 1, 8, 1, true), beamMat);
    m.position.set(Math.cos(th) * rad, 0, Math.sin(th) * rad); m.userData.ph = rng(); m.renderOrder = 3; beams.push(m); group.add(m);
  }

  return {
    group,
    update(t, dt, cue) {
      const so = since(cue, "circle", 2.0, t), sl = since(cue, "slam", 7.92, t), sc = since(cue, "circleclose", 15.3, t);
      const th = Math.floor(t * 8) / 8; // rotation on threes
      const sc3 = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        const open = easeOut3((so - 0.15 * i) / 0.7);                      // 24 frames to open
        const close = easeOut3((sc - 0.5 * i) / 0.9);                      // outer ring first; the inner ring keeps a stub
        sc3[i] = clamp(open * (1 - close * (i === 2 ? 0.92 : 1)), 0, 1);
      }
      // the strike: every ring dips 18 percent over 12 frames and springs back, with a white flash
      const dip = sl >= 0 && sl < 0.5 ? Math.sin(Math.PI * clamp(sl / 0.5)) : 0;
      mat.uniforms.uS.value = sc3.map((s) => s * (1 - 0.18 * dip));
      mat.uniforms.uRot.value = th;
      mat.uniforms.uFlash.value = sl >= 0 && sl < 0.25 ? 1 - sl / 0.25 : 0;
      group.visible = so > 0 && sc3[0] + sc3[1] + sc3[2] > 0.003;
      beamMat.uniforms.uA.value = 0.25 * clamp(sc3[0]) * (sl >= 0 && sl < 0.5 ? 1.8 : 1);
      for (const b of beams) {
        const h = 14 * (0.75 + 0.25 * Math.sin(th * 2 + b.userData.ph * 6.28)) * easeOut3((so - 0.6) / 0.8);
        b.scale.set(1, Math.max(0.001, h), 1); b.position.y = h * 0.5;
      }
    },
    dispose() { disc.geometry.dispose(); mat.dispose(); beamMat.dispose(); beams.forEach((b) => b.geometry.dispose()); },
  };
}
