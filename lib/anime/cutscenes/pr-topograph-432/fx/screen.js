// SCREEN-SPACE WIPES (bible: Shot 1 cartoon iris wipe; Shot 7 curtain wipe, 12 frames; "one short wipe home").
// One clip-space quad (no camera): an overlay in the final frame. Every fragment discards inside the seal's padded screen box
// (owner law: nothing covers the seal), and uses the player's box, a pure function of the clock, so scrub == play.
// MATHS  s = ((uv.x - .5) asp, uv.y - .5)  one unit = frame height, so circles stay round on any aspect.
//   iris        covered where |s| > R(u),  R = (|corner| + .05) * ease(u)   [opening, u: 0 -> 1 over 1.2 s]; closing: R = (...) (1 - ease(u))
//               ink ring 3 px at |s| = R; flat violet-black #09030f field.
//   curtain     drop D in [0,1] over 12 frames (.5 s, ease-in = gravity: D = u^2).  Hem y_h(x) = 1 - D (1.06) + .018 sin(26 x asp) (scalloped),
//               covered where uv.y > y_h  (y up: uv.y measured from the TOP so the hem falls).  Folds: stripe = sin(x asp 38) > 0 -> crimson #c82040
//               else #7a1428 (flat 2 tone); gold trim band 4 percent above the hem #ffd24a with the 4 px highlight #fff4c0; 3 px ink at the hem.
import { Mesh, PlaneGeometry, ShaderMaterial, Vector4 } from "three";
import { PAL, clamp, easeOut3, since, col } from "./lib.js";

const FRAG = `
varying vec2 vUv; uniform float uAsp, uIris, uCurtain, uPx, uPad, uMode; uniform vec4 uBox;
uniform vec3 uInk, uCrim, uCrimDk, uGold, uHi;
bool inSeal(vec2 uv){ vec2 s = vec2(uv.x, 1.0 - uv.y); return uBox.x < 2.0 && s.x > uBox.x - uPad && s.x < uBox.z + uPad && s.y > uBox.y - uPad && s.y < uBox.w + uPad; }
void main(){
  if (inSeal(vUv)) discard;
  vec2 s = vec2((vUv.x - 0.5) * uAsp, vUv.y - 0.5);
  vec4 o = vec4(0.0);
  // iris: uIris is the open radius in frame heights (>= corner distance = fully open)
  float rr = length(s);
  if (uIris < 9.0) {
    float edge = 3.0 * uPx;
    if (rr > uIris) o = vec4(uInk, 1.0);
    else if (rr > uIris - edge) o = vec4(uInk, 1.0);
  }
  // curtain
  if (uCurtain > 0.001) {
    float top = 1.0 - vUv.y;                                   // 0 at the top edge
    float hem = uCurtain * 1.06 + 0.018 * sin(vUv.x * uAsp * 26.0) * step(0.001, uCurtain);
    if (top < hem) {
      float stripe = sin(vUv.x * uAsp * 38.0) > 0.0 ? 1.0 : 0.0;
      vec3 c = mix(uCrimDk, uCrim, stripe);
      float fromHem = hem - top;
      if (fromHem < 0.04 && fromHem > 0.0) c = fromHem > 0.04 - 4.0 * uPx ? uHi : uGold;   // gold trim with the highlight bar
      if (fromHem < 3.0 * uPx) c = uInk;
      o = vec4(c, 1.0);
    }
  }
  if (o.a < 0.5) discard;
  gl_FragColor = o;
}`;

export function buildScreen(ctx) {
  const mat = new ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false,
    uniforms: {
      uAsp: { value: 16 / 9 }, uIris: { value: 99 }, uCurtain: { value: 0 }, uPx: { value: 0.0014 }, uPad: { value: 0.012 }, uMode: { value: 0 },
      uBox: { value: new Vector4(9, 9, 9, 9) },
      uInk: { value: col(PAL.deep) }, uCrim: { value: col(PAL.crimson) }, uCrimDk: { value: col(PAL.crimsonDk) },
      uGold: { value: col(PAL.goldLit) }, uHi: { value: col(PAL.hi) },
    },
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false; quad.renderOrder = 999;
  const dur = ctx.scene.duration ?? 29.4;
  return {
    mesh: quad,
    update(t, dt, cue) {
      const asp = ctx.aspect(); const U = mat.uniforms;
      U.uAsp.value = asp;
      try { ctx.player.boxOf(); } catch { /* no box yet */ }
      const b = ctx.player?.box;
      if (b) U.uBox.value.set(b[0], b[1], b[2], b[3]); else U.uBox.value.set(9, 9, 9, 9);
      const corner = Math.hypot(asp * 0.5, 0.5) + 0.06;
      // iris opens over the first 1.2 s (shot 1: the island recedes into a vault) and closes in the last 0.9 s (the wipe home)
      const si = since(cue, "irisin", 0, t), so = since(cue, "wipehome", dur - 0.9, t);
      let R = 99;
      if (si >= 0 && si < 1.2) R = corner * easeOut3(si / 1.2) * 1.0 + 0.0001;
      if (so >= 0 && so < 0.9) R = corner * (1 - easeOut3(so / 0.9)) + 0.0001;
      if (so >= 0.9) R = 0.0001;
      U.uIris.value = R;
      // curtain: 12 frames of gravity from 24.17 s, then it stays (the set struck like a stage); lifts for the home wipe
      const sk = since(cue, "curtain", 24.17, t);
      const u = clamp(sk / 0.5);
      U.uCurtain.value = sk < 0 ? 0 : u * u;
      quad.visible = R < 9 || U.uCurtain.value > 0.001;
    },
    dispose() { quad.geometry.dispose(); mat.dispose(); },
  };
}
