// FX layer for pr-nemo-relay-481 (Dragon Ball Super, Ultra Instinct). Layer 1. Every effect is a pure function of stepped t.
// Cue names (win defaults in brackets; scene.js beats with the same name override them):
//   sign [7.0] ignition [7.5] dodge [8.08, 5.42 s] bigorb [4.6] afterimage [2.9, 10.6 s] spend [13.5] crumble [13.5, 3 s] credit [18.8] tap [13.5] ledge (arg at)
// Impact frames, speed lines, shock warp and trauma are RESERVED beats owned by scene.js (not drawn here).
import { makeWin, sealFrame, makeCard, disposeAll, wk } from "./util.js";
import { buildAura } from "./aura.js";
import { buildOrbs } from "./orbs.js";
import { buildAfterimage } from "./afterimage.js";
import { buildCrumble } from "./crumble.js";

// Whis' staff orb: a miniature swirl (easter egg 2). Logarithmic spiral arms: a = fract(theta/2pi*2 + log(r)*1.6 - uT*0.4); cyan on black.
const SWIRL = `
varying vec2 vUv; uniform float uT; uniform float uA;
void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); float th = atan(p.y, p.x);
  float a = fract(th / 6.2831 * 2.0 + log(max(r, 0.02)) * 1.6 - uT * 0.4);
  float arm = smoothstep(0.35, 0.5, a) * smoothstep(0.85, 0.6, a);
  float orb = smoothstep(1.0, 0.9, r);
  vec3 col = mix(vec3(0.10, 0.06, 0.16), vec3(0.478, 0.816, 0.941), arm);
  gl_FragColor = vec4(col, orb * uA); }`;
// Tap ripple: flat cyan ring expanding off the staff tip (frame 0 of the break).
const TAP = `
varying vec2 vUv; uniform float uA;
void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); float d = abs(r - uA);
  float a = smoothstep(0.06, 0.0, d) * (1.0 - uA);
  gl_FragColor = vec4(0.478, 0.816, 0.941, a); }`;

export default function build(ctx) {
  const THREE = ctx.THREE, group = new THREE.Group();
  const win = makeWin(ctx.scene);
  const frame = sealFrame(ctx);
  const parts = [buildAura(ctx, frame, win), buildOrbs(ctx, frame, win), buildAfterimage(ctx, frame, win), buildCrumble(ctx, frame, win)];
  parts.forEach((p) => group.add(p.group));

  const ledge = (win("ledge", 0, 0).b?.at) || [-4.5, 1.1, 8];
  const swirl = makeCard(ctx, SWIRL, {}, 0.28 * frame.H, 0.28 * frame.H, { back: 0, blending: THREE.NormalBlending, order: 6 });
  const tap = makeCard(ctx, TAP, {}, 1.6 * frame.H, 1.6 * frame.H, { back: 0, order: 6 });
  group.add(swirl, tap);
  const wTap = win("tap", 13.5, 0.5), wLedge = win("ledge", 2.3, 11.2);
  const anchor = new THREE.Vector3();

  return {
    group,
    update(t, dt, cue) {
      frame.update();
      for (const p of parts) p.update(t, dt, cue);
      frame.world(ledge[0], ledge[1] + 0.9, ledge[2], anchor);
      const kl = wk(wLedge, t);
      swirl.visible = kl >= 0 && kl <= 1; swirl.userData.anchor.copy(anchor);
      swirl.material.uniforms.uT.value = t; swirl.material.uniforms.uA.value = 1;
      const kt = wk(wTap, t);
      tap.visible = kt >= 0 && kt <= 1; tap.userData.anchor.copy(anchor); tap.material.uniforms.uA.value = kt;
    },
    dispose() { parts.forEach((p) => p.dispose()); disposeAll(group); },
  };
}
