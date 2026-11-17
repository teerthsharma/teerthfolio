// CAST layer for pr-tensorflow-128930: Godsealzilla's fins, Mechasealzilla (the fake, skin burning off) on the hero rig, and the operator as a kit costumed seal.
// Threads: the look's finGlow (h.fins.set), the `mecha` variant, castHero, plain + uniform outfit. Written new: the burn patch on the fake's materials, the foam rings, the staging.
import { Group, Mesh, RingGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { castHero } from "../../framework/seal.js";
import { mecha } from "../../../kit/hero/looks/pr-tensorflow-128930.js";
import { variant } from "../../../kit/hero/looks/_merge.js";
import { paint, painted } from "../../../sdf.js";
import { cameras, figureAt, ground, shotAt } from "../stage.js";
import { SHOTS } from "../layout.js";
import { burnPatch } from "./burn.js";
import { sitePup } from "./pup.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const fr = (t) => Math.floor(t * 12 + 0.02);
// face the lens, turned a little toward the hero
const faceYaw = (cam, p, h) => { const yc = Math.atan2(cam.eye.x - p.x, cam.eye.z - p.z), yh = Math.atan2(h[0] - p.x, h[2] - p.z); let d = yh - yc; d = Math.atan2(Math.sin(d), Math.cos(d)); return yc + 0.5 * d; };
const lockN = (f) => clamp(Math.floor((f - 78) / 2) + 1, 0, 9);
const sq = (g, k, s) => g.scale.set(s * (1 + 0.5 * (1 - k)), s * k, s * (1 + 0.5 * (1 - k)));

export default function build(ctx) {
  const { THREE, engine } = ctx, group = new Group(), TURN = ctx.scene.turn ?? { into: 1.0, back: 11.0 };
  const hero = ctx.seal.hero;
  ctx.scene.seal.hero.extras?.(engine, hero);
  const fins = hero.fins;
  // after the breath the plates hold a faint ember that sinks to dark (E39)
  const lit = fins.mesh.material.uniforms.uLit.value, ext = fins.mesh.material.uniforms.uExt.value, sync = fins.mesh.onBeforeRender;
  let ember = 1;
  fins.mesh.onBeforeRender = (...a) => { sync(...a); for (let j = 0; j < 10; j++) lit[j] *= ember; if (ember < 1) ext.fill(0); };

  const guest = castHero(engine, variant(mecha, { fur: { coat: "#34373d", belly: "#6e685c", bellyShade: "#5a564e" } }), { at: [0, 0, 0], yaw: 0, scale: 6.48, track: [
    { t: 4.5, pose: "zilla-wade", dur: 0.05, hold: 0.7, out: 0.1 },
    { t: 5.25, pose: "zilla-stand", dur: 0.1, hold: 99 },
    { t: 5.25, set: { rx: -0.12, y: 0.02 }, dur: 0.1, hold: 0.2, out: 0.15 },
    { t: 8.75, pose: "blown", dur: 0.333, hold: 99 },
  ] });
  // the visor: a red band that flares as it arrives, holds, and gutters when the breath lands
  const visors = [];
  guest.group.traverse((o) => { const e = o.material?.uniforms?.uEmit; if (e && e.value.r > 0.5) visors.push(e.value); });
  guest.group.visible = false;
  const burn = burnPatch(guest.group);
  const op = ctx.kit.costumedSeal(engine, { layers: [{ type: "uniform", col: "#1f2632", shade: "#0c1018", buttons: "#4a5668" }], hat: { kind: "headband", col: "#2a2a34" }, scale: 1 });
  op.group.visible = false;
  // the original pale pup: the seal before the turn and again after the swap back
  const pup = sitePup({ track: { blink: [0.6] } });
  ctx.setLayer(pup.group, 1);
  group.add(guest.group, op.group, pup.group);

  // a foam line round the feet: two thin rings, so the creature stands in water and no pale disc shows
  const rings = [new RingGeometry(0.44, 0.465, 40, 1), new RingGeometry(0.56, 0.58, 40, 1)].map((g) => g.rotateX(-Math.PI / 2).toNonIndexed());
  const ringGeo = painted(mergeGeometries(rings), paint("#9aa8b4", "#6a7a88", { line: 0.4 }));
  const foam = engine.prop(ringGeo, 0.5), foamFake = engine.prop(ringGeo, 0.5);
  for (const m of [foam, foamFake]) m.material.uniforms.uEmit.value.setRGB(0.3, 0.36, 0.42);
  foam.userData.layer = foamFake.userData.layer = 1;
  group.add(foam, foamFake);

  let cams = null, asp = 0;
  return {
    group,
    update(t, dt, cue) {
      const a = ctx.aspect();
      if (!cams || Math.abs(a - asp) > 1e-3) { asp = a; cams = cameras(ctx, a); }
      const f = fr(t), i = cue.shot?.i ?? shotAt(cams, t), cam = cams[i], L = SHOTS[i];
      const room = !!L.room;
      // Godsealzilla: the plates lock tail to head; the breath snaps them shut
      const n = t >= 8.333 ? 0 : t >= 8.208 ? 9 : lockN(f);
      fins.set(n, f, t >= 8.208 && t < 8.333 ? 1 : 0);
      fins.mesh.scale.y = t >= 10.5 && t < 11.0 ? lerp(1, 0.15, clamp((t - 10.5) / 0.4)) : 1;
      ember = t < 8.333 ? 1 : t < 8.458 ? 0 : t < 10.5 ? 0.3 : 0.3 * clamp(1 - (t - 10.5) / 0.4);
      foam.position.set(ctx.seal.at[0], 0.03, ctx.seal.at[2]); foam.scale.setScalar(ctx.seal.scale); foam.visible = !room;
      // the swap: the pale pup is the seal until TURN.into; Godsealzilla from there to TURN.back, then the pup pops back out (2 frames at 24 fps)
      const S = ctx.seal.scale, on = t >= TURN.into && t < TURN.back + 2 / 24, into = Math.floor((t - TURN.into - 1 / 12) * 12 + 1e-6), out = Math.floor((t - TURN.back) * 24 + 1e-6);
      ctx.seal.group.visible = on && !room; pup.group.visible = !on && !room;
      pup.group.position.copy(ctx.seal.group.position); pup.update(t); pup.group.rotation.y = ctx.seal.group.rotation.y; // update() sets the yaw itself
      if (t < TURN.into) pup.setTone(0.86, 0.88, 0.94); else if (t >= TURN.back) pup.setTone(1, 1, 1);
      if (on && into >= 0 && into <= 2) sq(ctx.seal.group, [0.5, 1.16, 0.97][into], S);
      else if (on && out >= -4 && out < 0) sq(ctx.seal.group, 0.86, S);
      sq(pup.group, out >= 2 ? [0.6, 1.14, 1.14, 0.96, 0.96][out - 2] ?? 1 : 1, S);
      // Mechasealzilla: wades in on threes (f54..f63), stands, burns, topples out right by f106
      const g = L.fake, tt = Math.floor(t * 4 + 0.02) / 4;
      ctx.gz = ctx.gz ?? {}; ctx.gz.fake = null;
      guest.group.visible = foamFake.visible = !room && !!g && t >= 4.5 && t < 9.083;
      if (guest.group.visible) {
        const arrive = clamp((tt - 4.5) / 0.75), u = lerp(g[0] + 0.3, g[0], arrive) + (t >= 8.75 ? 0.75 * clamp((t - 8.75) / 0.333) ** 2 : 0);
        const p = { pos: ground(cam, u, g[1], a), scale: 1.08 * ctx.seal.scale };
        guest.at = [p.pos.x, p.pos.y, p.pos.z]; guest.scale = p.scale;
        guest.yaw = faceYaw(cam, p.pos, ctx.seal.at);
        guest.update(tt, dt);
        foamFake.position.set(p.pos.x, 0.03, p.pos.z); foamFake.scale.setScalar(p.scale);
        burn.set(cam, t, p);
        ctx.gz.fake = new Vector3(p.pos.x, p.pos.y + 0.4 * p.scale, p.pos.z);
      }
      const vk = f < 60 ? 0.12 : f < 62 ? 0.82 : t < 8.5 ? 0.45 : [0.4, 0.3, 0.2, 0.1, 0][t < 8.583 ? 0 : t < 8.667 ? 1 : t < 8.75 ? 2 : t < 8.833 ? 3 : 4];
      for (const e of visors) e.setRGB(1.1 * vk, 0.08 * vk, 0.04 * vk);
      const o = L.op, show = room && !!o;
      op.group.visible = show;
      if (show) {
        const p = figureAt(cam, a, o[0], o[1], o[2]);
        op.place(p.pos.x, p.pos.y, p.pos.z, Math.atan2(cam.eye.x - p.pos.x, cam.eye.z - p.pos.z) - 0.7);
        op.group.scale.setScalar(p.scale);
        op.setPose("bow", f >= 70 && f <= 72 ? 1 : 0);
        op.expression(f >= 70 ? "calm" : "neutral", 1);
        op.update(t);
      }
    },
    dispose() { guest.dispose(); op.dispose(); pup.dispose(); },
  };
}
