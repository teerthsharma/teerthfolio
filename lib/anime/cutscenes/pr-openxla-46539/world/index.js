// WORLD layer for pr-openxla-46539 (My Hero Academia, S3 Kamino: All Might's last stand, in a golden-age comic).
// Written by the WORLD agent from scripts/pr-openxla-46539.md (sections 1-3, 6 and 7). Layer 0 is baked art; anything that moves is layer 1.
//
// FRAME. The street is authored in seal-local metres (x right, z forward = the way the seal faces, toward the crater); one Group is
// moved to scene.seal.at and turned by scene.seal.yaw, so the avenue always runs along the seal's line of sight. The sky is world-space.
//   ctx.set  (published for the other layers, read-only):  crater {x,z,r} (seal-local), roofs [[x,y,z,side]] (seal-local rooftops of the
//            low blocks: the cheering civilians), hole (unit world direction of the sky opening), local(x,y,z) -> world [x,y,z], yaw, at.
//
// CUES (all optional; each is honoured only if it started within 0.9 s of the bible's own time, else the bible's time is used):
//   rise     1.00 s  the Nomu rises: the geyser climbs     (also: nomu_rise, nomu_rises, crater)
//   smash    9.40 s  the strike: the two blocks wreck, the pit drains   (also: strike, dome, detroit)
//   sky_open 9.42 s  the storm blasts into a vortex and the sky opens   (also: skyopen, sky, clear)
//   tear    14.42 s  the page tears: the two answers become one gold    (also: page_tear, riip, merge, gold)
//
// LIGHT (shared uniforms, restored on dispose; the seal's lit-luma cap 0.92 lives in the shared program and nothing here lifts it, no fog):
//   night key L = R_yaw(0.45, 0.18, 0.75) #ffb070  (low, from the fire side)       night rim dir (-0.6, -0.1, -0.5) #ff8a20
//   day   key L = R_yaw(-0.30, 0.80, 0.50) #fff3d8, rim toward the hole #fff3b0;  blend by day = smooth(0, 1.5, ts - t_open)
import { Color, Group, Vector3 } from "three";
import { C } from "./palette.js";
import { sm, evTime, glowSprite } from "./lib.js";
import { CRATER } from "./layout.js";
import { buildNightSky, buildOpenSky } from "./sky.js";
import { buildBlocks } from "./blocks.js";
import { buildStreet } from "./street.js";
import { buildCrater } from "./crater.js";
import { buildFlames } from "./flames.js";
import { buildSmashStreet } from "./smash-street.js";

export default function build(ctx) {
  const { engine } = ctx, sh = engine.shared;
  const S = ctx.scene?.seal ?? {};
  const at = S.at ?? [0, 0, 0], yaw = S.yaw ?? 0;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const toWorld = (x, y, z) => [at[0] + x * cy + z * sy, at[1] + y, at[2] - x * sy + z * cy];
  const rotDir = (x, y, z) => new Vector3(x * cy + z * sy, y, -x * sy + z * cy).normalize();

  const group = new Group();
  const street = new Group(); street.position.set(at[0], at[1], at[2]); street.rotation.y = yaw;
  group.add(street);

  const night = buildNightSky(ctx); group.add(night);
  const open = buildOpenSky(ctx); group.add(open.mesh);
  const blocks = buildBlocks(ctx), pave = buildStreet(ctx), crater = buildCrater(ctx), flames = buildFlames(ctx);
  const smashSt = buildSmashStreet(ctx);
  street.add(blocks.group, pave.group, smashSt.group, crater.group, flames.group);

  // daylight pooling on the street under the opening (flat additive disc, gold #fff3b0)
  const pool = glowSprite(C.shaft, 1.2); pool.rotation.x = -Math.PI / 2; pool.scale.set(34, 34, 1); pool.position.set(CRATER.x, 0.08, CRATER.z - 2); pool.visible = false; street.add(pool);

  try {
    ctx.set = { crater: { ...CRATER }, roofs: blocks.roofs.map((r) => [...r]), hole: open.hole.clone(), local: toWorld, yaw, at: [...at] };
  } catch (e) { /* ctx may be sealed: the other layers fall back to their own guesses */ }

  // the shared light, restored on dispose
  const saved = { dir: sh.uLightDir?.value.clone(), col: sh.uLightCol?.value.clone(), rimDir: sh.uRimDir?.value.clone(), rimCol: sh.uRimCol?.value.clone() };
  const nKey = rotDir(0.45, 0.18, 0.75), dKey = rotDir(-0.3, 0.8, 0.5), nRim = rotDir(-0.6, -0.1, -0.5), dRim = open.hole.clone();
  const cNight = new Color("#ffb070"), cDay = new Color("#fff3d8"), rNight = new Color(C.fireEdge), rDay = new Color(C.shaft);
  const tmp = new Vector3();
  const light = (day) => {
    sh.uLightDir?.value.copy(tmp.copy(nKey).lerp(dKey, day).normalize());
    sh.uLightCol?.value.copy(cNight).lerp(cDay, day);
    sh.uRimDir?.value.copy(tmp.copy(nRim).lerp(dRim, day).normalize());
    sh.uRimCol?.value.copy(rNight).lerp(rDay, day);
  };
  light(0);

  function update(t, dt, cue) {
    const ts = t;
    const tRise = evTime(cue, ["rise", "nomu_rise", "nomu_rises", "crater"], 1.0, 0.7);
    const tSmash = evTime(cue, ["smash", "strike", "dome", "detroit"], 9.4, 0.9);
    const tOpen = evTime(cue, ["sky_open", "skyopen", "sky", "clear"], 9.42, 0.9);
    const tGold = evTime(cue, ["tear", "page_tear", "riip", "merge", "gold"], 14.42, 0.9);
    const opened = open.update(ts, tOpen);
    light(sm(0, 1.5, ts - tOpen));
    pool.material.uniforms.uA.value = 0.28 * opened;
    pool.visible = opened > 0;
    blocks.update(ts, tSmash);
    flames.update(ts, sm(0, 2, ts - tOpen));
    crater.update(ts, tRise, tSmash, tGold);
  }

  function dispose() {
    for (const k of [blocks, pave, smashSt, crater, flames, open]) k.dispose();
    night.userData?.target?.dispose?.();
    pool.material.dispose(); pool.geometry.dispose();
    if (saved.dir) sh.uLightDir.value.copy(saved.dir);
    if (saved.col) sh.uLightCol.value.copy(saved.col);
    if (saved.rimDir) sh.uRimDir.value.copy(saved.rimDir);
    if (saved.rimCol) sh.uRimCol.value.copy(saved.rimCol);
  }
  return { group, update, dispose };
}
