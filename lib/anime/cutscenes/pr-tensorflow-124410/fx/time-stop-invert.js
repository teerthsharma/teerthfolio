// TIME-STOP INVERT (JoJo Part 3, DIO). Local adapter.
// TOOLKIT: engine/anime:lib/anime/fx/time-stop-invert.js
//
// MATHS
//   invert blend: out = src * (1 - dst) with src = 1 → complement of every pixel behind the seal
//   depth D = seal view-z + 0.55 m so the locked pup keeps its colours
//   hard negative (toolkit): n = 1 - srgb(c); mix with smoothstep(0.35, 0.65, n) by `hard`
//   hold 1.2 s from the timestop beat. Appears on a hard cut, never a fade.
import { screenPlane, beatOf } from "./common.js";

export const meta = {
  name: "time-stop-invert",
  params: {
    hold: { default: 1.2 },
    hard: { default: 0.8 },
    margin: { default: 0.55 },
  },
};

const WHITE = /* glsl */ `varying vec2 vUv; void main(){ gl_FragColor = vec4(1.0); }`;

export function create(ctx, sh) {
  const invert = screenPlane(ctx, { frag: WHITE, blend: "invert", order: 110, margin: 0.55 });
  invert.name = "time-stop-invert";
  return {
    group: invert,
    update(t) {
      const stop = beatOf(ctx, "timestop");
      const hold = stop.args.hold ?? 1.2;
      invert.visible = t >= stop.t && t < stop.t + hold;
    },
    dispose() { invert.material.dispose(); invert.geometry.dispose(); },
  };
}

export default create;
