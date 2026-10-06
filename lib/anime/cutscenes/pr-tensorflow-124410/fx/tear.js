// POSTER TEAR (bible FX "Poster tear", 20 frames = 0.83 s) between the drowning and the island.
// Maths, in height units p = (uv - .5) * (aspect, 1):
//   line direction  d = (cos a, sin a), a = -0.62 rad ; normal n = (-sin a, cos a)
//   s = p . d (along the tear),  e_raw = p . n (across)
//   ragged edge     r(s) = (vnoise(9 s) - .5) * .10 + (vnoise(38 s) - .5) * .025
//   sweep           c(k) = mix(-1.1, 1.1, k^2 (3 - 2k)) ;  e = e_raw - c(k) - r(s)   (e < 0: the poster we are tearing away)
//   paper lip       -0.055 < e < 0 : cream #f4f4f0 with fibre noise on the inner edge, ink hairline at e ~ 0
//   shadow          0 < e < .02 : ink at .35 (the new picture sits under the torn sheet)
//   falling flakes  columns of width .11 fall by fall_c = 1.6 k^2 (.5 + h(c)); a flake lives in the cell of q = (p.x, p.y + fall_c),
//                   exists for h(cell) > .6 and e(q) in (-.5, 0), drawn as a rotated .07 x .05 rectangle, cream with ink edge.
// The quad sits at depth D just behind the seal (screenPlane), so the tear never covers the seal.
import { clamp01, sstep, beatOf, screenPlane, GLSL_UTIL } from "./common.js";

const TEAR_FRAG = /* glsl */ `
  varying vec2 vUv; uniform float uK, uA, uAspect; uniform vec3 uPaper, uInk;
  ${GLSL_UTIL}
  float edgeAt(vec2 p, float c){ float a = -0.62; vec2 d = vec2(cos(a), sin(a)), n = vec2(-d.y, d.x);
    float s = dot(p, d); float r = (vnoise(vec2(s * 9., 3.)) - .5) * .10 + (vnoise(vec2(s * 38., 7.)) - .5) * .025;
    return dot(p, n) - c - r; }
  void main(){
    vec2 p = (vUv - .5) * vec2(uAspect, 1.);
    float k = uK; float c = mix(-1.1, 1.1, k * k * (3. - 2. * k));
    float e = edgeAt(p, c);
    vec4 col = vec4(0.);
    // paper lip with fibres
    float fib = vnoise(vec2(dot(p, vec2(.9, .4)) * 90., e * 160.));
    if (e < 0. && e > -.055 + (fib - .5) * .02) col = vec4(uPaper * (.94 + .06 * fib), 1.);
    if (abs(e) < .006) col = vec4(uInk, 1.);
    if (e > 0. && e < .02) col = vec4(uInk, .35 * (1. - e / .02));
    // flakes
    float ci = floor(p.x / .11); float fall = 1.6 * k * k * (.5 + h21(vec2(ci, 1.7)));
    vec2 q = vec2(p.x, p.y + fall); float eq = edgeAt(q, c);
    if (eq < 0. && eq > -.5 && k > 0.02) {
      vec2 cell = floor(q / .11); float hc = h21(cell + 5.1);
      if (hc > .6) { vec2 ctr = (cell + .5) * .11; vec2 l = q - ctr; float ang = hc * 6.28 + k * 3. * (hc - .5); float cs = cos(ang), sn = sin(ang);
        l = vec2(cs * l.x - sn * l.y, sn * l.x + cs * l.y); vec2 hs = vec2(.035, .025) * (.6 + hc * .6); vec2 dd = abs(l) - hs;
        float box = max(dd.x, dd.y);
        if (box < .006) col = box < -.004 ? vec4(uPaper, 1.) : vec4(uInk, 1.); } }
    col.a *= uA;
    if (col.a < .01) discard;
    gl_FragColor = col; }`;

export default function tear(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const plane = screenPlane(ctx, { frag: TEAR_FRAG, order: 120, uniforms: { uK: { value: 0 }, uA: { value: 1 }, uPaper: { value: new THREE.Color("#f4f4f0") }, uInk: { value: new THREE.Color("#05020a") } } });
  group.add(plane);
  function update(t) {
    const b = beatOf(ctx, "tear"), k = (t - b.t) / b.dur;
    plane.visible = k >= 0 && k < 1;
    if (plane.visible) { plane.material.uniforms.uK.value = clamp01(k); plane.material.uniforms.uA.value = 1 - sstep(0.9, 1, k); }
  }
  return { group, update, dispose() { plane.material.dispose(); plane.geometry.dispose(); } };
}
