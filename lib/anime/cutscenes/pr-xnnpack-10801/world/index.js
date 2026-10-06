// WORLD layer for pr-xnnpack-10801 (Bleach: Kyoka Suigetsu and the throne of Las Noches; PROTECTED Aizen look).
// The island is the real world; the DIMENSION is a picture laid over it: black sky and crescent, white contour-line dunes, the
// palace on the horizon, Aizen's throne under the seal. The picture is wiped in from the pup (2.4 s), cracks once at the slash
// (5.42 s, holes, mends), snaps at the sword (9.58 s) and falls like glass (9.7 s), leaving the island for the credit.
//
// Files (one element each):   common.js   palette, cue timing, the shared uniform block, the GLASS pass (shards, holes, cracks, eyes, hat)
//   sky.js     dimension sky (live) + island sky dome (baked)        desert.js  dunes + dead trees + sand motes
//   palace.js  Las Noches                                             throne.js  dais, pedestal, seat, black panel, hogyoku, the gap
//   snow.js    island ground (baked)
// Layers: the island sky and snow are layer 0 (static plate); the whole dimension is layer 1 (it changes every step).
//
// CUES READ (a beat of that name in scene.js wins; otherwise the bible time stands in): dimension 2.4 (the wipe), eyes 3.9,
//   crack 5.42 (arg at:[u,v] = the slash end, frame uv), hat 5.52, hogyoku 6.4, gap 8.4, snap 9.58 (arg at:[u,v] = the blade),
//   break 9.7. The seal's live position (ctx.seal.at) drives the throne height and the wipe centre.
//
// POCKET OWNS ITS FOG AND BACKGROUND (LAWS orchestrator #1): the root fog is nulled and the background set black for the whole
// cutscene, and restored on dispose, so no island fog lifts the far field.
import { makeU, driveU } from "./common.js";
import { buildDimSky, buildIslandSky } from "./sky.js";
import { buildDunes, buildTrees, buildMotes } from "./desert.js";
import { buildPalace } from "./palace.js";
import { buildThrone } from "./throne.js";
import { buildSnow } from "./snow.js";
import { throneHaze } from "./throne-haze.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const U = makeU(ctx);
  const sd = ctx.scene.seal ?? {};
  U.uGround.value = (sd.at ?? [0, 0, 0])[1];
  U.uCenter.value.set((sd.at ?? [0, 0, 0])[0], (sd.at ?? [0, 0, 0])[2]);

  const prevFog = ctx.root.fog, prevBg = ctx.root.background;
  ctx.root.fog = null;
  ctx.root.background = new THREE.Color("#0a0614");

  const mods = [
    buildIslandSky(ctx), buildSnow(ctx, U),
    buildDimSky(ctx, U), buildDunes(ctx, U), buildTrees(ctx, U), buildMotes(ctx, U), buildPalace(ctx, U), buildThrone(ctx, U),
  ];
  const haze = throneHaze();
  group.add(haze.mesh);
  for (const m of mods) group.add(m.obj);

  return {
    group,
    update(t, dt, cue) {
      driveU(U, ctx, cue);
      haze.uniforms.uT.value = t;
      for (const m of mods) m.update(t, dt, cue);
    },
    dispose() {
      for (const m of mods) m.dispose?.();
      haze.dispose();
      ctx.root.fog = prevFog; ctx.root.background = prevBg;
    },
  };
}
