// BUILD for pr-pyrefly-4180 (DIRECTION). Assembles the three isolated layers and publishes a derived chain/stage state on
// ctx.pyrefly BEFORE any layer updates, so fx (chain beads) and cast (Kurama, shinobi, rosette) read one source of truth.
// All values are pure functions of the cue clock, so scrubbing equals playing. Cue names: see scene.js CUES.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

const LINKS = 208, HOOP_AT = 100;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export default function build(ctx) {
  const comp = composeLayers(ctx, { world, cast, fx });
  const S = (ctx.pyrefly = { links: 0, hoop: 0, hoopLink: HOOP_AT, surge: 0, surgeFront: HOOP_AT, burst: 0, rosette: 0, pin: 0, lamp: 0, flats: 0, ftg: 0, ftgIndex: 0, total: LINKS });
  const inner = comp.update;
  comp.update = (t, dt, cue) => {
    S.links = Math.floor(clamp01(cue.k("chain")) * LINKS);                  // links 0..208 appear over 24 frames
    S.hoop = cue.done("hoop") ? clamp01(cue.k("hoop")) : 0;                  // violet hoop closes at link 100
    S.surge = cue.done("surge") ? clamp01(cue.k("surge")) : 0;               // coral wave runs links 101..208
    S.surgeFront = HOOP_AT + Math.round(S.surge * (LINKS - HOOP_AT));
    S.burst = cue.done("burst") ? clamp01(cue.k("burst")) : 0;
    S.rosette = cue.done("rosette") ? clamp01(cue.k("rosette")) : 0;
    S.pin = cue.done("pin") ? clamp01(cue.k("pin")) : 0;
    S.flats = cue.done("flatsLower") ? 1 - clamp01(cue.k("flatsLower")) : clamp01(cue.k("flatsRise"));
    S.lamp = clamp01(cue.k("lampRise")) * (cue.done("lampDie") ? 1 - clamp01(cue.k("lampDie")) : 1);
    S.ftgIndex = cue.done("ftg3") ? 3 : cue.done("ftg2") ? 2 : cue.done("ftg1") ? 1 : 0; // the kunai the seal last flashed to
    S.ftg = S.ftgIndex ? clamp01(cue.k("ftg" + S.ftgIndex)) : 0;
    inner(t, dt, cue);
  };
  return comp;
}
