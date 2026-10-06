// FX layer for pr-tensorflow-124410 (JoJo Part 3, DIO vs Jotaro: ZA WARUDO + MUDA). Layer 1. Written by the FX agent.
// Bible section 6 + shot FX, built whole:
//   muda.js       MUDA fan: 124 fist afterimages (twos), spark per landing (2 drawings), MUDA brush lettering, coral-edge fissures
//   timestop.js   time-stop invert (held 1.2 s), giant clock + TICK/TOCK, hanging spray, per-beat palette wash (hard cut, twos)
//   water.js      the drowning: rings, spray burst, banana in the reservoir, road roller, mint-edge glows
//   tear.js       poster tear (ragged diagonal, paper lip, falling flakes)
//   gogogo.js     exactly 12 ゴ glyphs in two flanking columns
// Reserved beats (impact, speedlines, shock, trauma, pose) belong to scene.js; the player applies them. Not drawn here.
// The seal is never touched: no emission; screen-glued planes sit at depth just behind it; fists are pushed out of its screen ellipse.
//
// CUES READ (all optional; bible times are the fallback, see common.js ALIAS):
//   muda      {dur, target:[x,y,z], origin:[x,y,z]}   the barrage (seal-local metres; default t 5.0 dur 1.21)
//   timestop  {hold}                                   the invert (default t 6.21, hold 1.2 s)
//   clock                                              the giant clock (default 5.0 .. drowning + 1.2)
//   drown     {at:[x,y,z], hitDelay, mint:[[..]x3]}    the edge falls: rings + burst (default t 7.46, impact +0.62 s)
//   tear                                               poster tear (default 9.54, 0.83 s)
//   gogogo                                             glyph columns (default 1.5 .. 13.0)
//   banana, roller                                     easter eggs (defaults 6.9 s, 3.0 s)
// STAGE (seal-local metres, x right, y up, z forward; override with scene.stage = { edge, standShoulder, drop, spray, banana, roller,
//   mint, clockNdc, clockR, fissureSize, ringSize }). Defaults are a guess until WORLD/DIRECTION publish the real set.
import { makeFrame, makeAtlas } from "./common.js";
import muda from "./muda.js";
import timestop from "./timestop.js";
import water from "./water.js";
import tear from "./tear.js";
import gogogo from "./gogogo.js";

const STAGE = {
  edge: [0, 5.5, 18],            // the coral control edge (MUDA target)
  standShoulder: [0, 2.4, -1.3], // behind the seal: The World's shoulders
  drop: [0, -7, 22],             // where the edge hits the reservoir
  spray: [0, 4, 18],             // the hanging spray cloud
  banana: null, roller: [-10, 0, 0], mint: [],
  clockNdc: [0.55, 0.52], clockR: 0.5, fissureSize: 7, ringSize: 12,
};

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const stage = { ...STAGE, ...(ctx.scene.stage || {}) };
  const shared = { frame: makeFrame(ctx), stage, atlas: makeAtlas(THREE), fps: ctx.fps || 12 };
  const mods = [];
  for (const [name, fn] of [["gogogo", gogogo], ["water", water], ["muda", muda], ["tear", tear], ["timestop", timestop]]) {
    try { const m = fn(ctx, shared); group.add(m.group); mods.push({ name, m }); }
    catch (e) { console.error(`pr-tensorflow-124410 fx/${name}`, e); }
  }
  function update(t, dt, cue) {
    for (const o of mods) { try { o.m.update(t, dt, cue); } catch (e) { if (!o.dead) { o.dead = true; o.m.group.visible = false; console.error(`pr-tensorflow-124410 fx/${o.name}`, e); } } }
  }
  function dispose() { for (const o of mods) { try { o.m.dispose?.(); } catch { /* already gone */ } } shared.atlas.tex?.dispose(); }
  return { group, update, dispose };
}
