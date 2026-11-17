// The fourth wall of p-monodromy: the lens crack across the camera's own glass, the freeze (the picture grabbed once and laid on
// 40 shards), the fall, the island grabbed and rebuilt on the same shards, and the shockwave from the seal's feet.
import { Group, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { crackLens, placeLens } from "../live/crack.js";
import { shatter } from "../live/shatter.js";
import { CRACK_ANG, CRACK_AT, DOCK, IMPACT, R, smooth } from "../clock.js";
import { PAL, toned } from "../tone.js";

// `fx` is the layer's group: hidden while the picture is grabbed, so the grab holds the world and the seal only
export default function makeShards(ctx, fx = null) {
  const group = new Group(), V = new Vector3(), cam = () => ctx.player?.camera;
  const lens = crackLens();
  lens.m.uniforms.uC.value = { x: CRACK_AT[0], y: CRACK_AT[1] };
  lens.mesh.visible = false;
  const sh = shatter(IMPACT);
  const navy = makeCel(ctx.engine, { max: 4, order: 89, draw(B, ts, A) { B.rect(0, 0, A, 1, toned(PAL.navy)); } });
  group.add(lens.mesh, sh.shards, sh.wave, navy.group);
  sh.veil.visible = false;

  const done = { old: false, next: false };
  // the grab draws every layer (the camera's default mask holds layer 0 only, which grabbed a blank field)
  const grab = (rt) => {
    const host = fx ?? group, was = host.visible, c = cam(), mask = c?.layers.mask;
    host.visible = false;
    try { c?.layers.enableAll(); sh.grab(ctx.engine.renderer, ctx.root, c, rt); } catch (e) { ctx.player?.errors?.push({ layer: "fx/shards", message: String(e?.stack ?? e) }); }
    finally { if (c) c.layers.mask = mask; host.visible = was; }
  };

  return {
    group,
    update(t) {
      const c = cam(), aspect = c?.aspect ?? 16 / 9;
      if (t >= R.freeze && !done.old) { grab(sh.old); done.old = true; }
      if (t >= R.grabIsland && !done.next) { grab(sh.next); done.next = true; }
      const assembling = t >= R.land;
      sh.U.uMode.value = assembling ? 1 : 0;
      sh.U.uTex.value = (assembling ? sh.next : sh.old).texture;
      sh.U.uK.value = assembling ? (t - R.land) / 0.8 : t >= R.fall ? Math.max(0.001, (t - R.fall) / 0.3) : 0;
      sh.U.uCrack.value = Math.min(1, Math.max(0, (t - R.freeze) / 0.5));
      sh.U.uAspect.value = aspect;
      sh.U.uTime.value = t;
      sh.shards.visible = t >= R.freeze && t < R.shardsOff;
      navy.group.visible = t >= R.freeze && t < R.locked;
      sh.wave.visible = t >= R.locked - 0.05 && t < R.ringEnd;
      if (sh.wave.visible && c) {
        V.set(DOCK[0], DOCK[1] + 0.5, DOCK[2]).project(c);
        sh.ring.uniforms.uC.value.set((V.x * 0.5) * aspect, V.y * 0.5);
        sh.ring.uniforms.uAmt.value = Math.min(1, Math.max(0, (t - R.locked) / (R.ringEnd - R.locked)));
      }
      const lensOn = t >= R.crack && t < R.fall && !!c;
      lens.mesh.visible = lensOn;
      if (lensOn) {
        placeLens(lens.mesh, c);
        const u = lens.m.uniforms;
        u.uAspect.value = aspect;
        u.uGrow.value = smooth(R.crack, R.crack + 3.07, t);
        u.uGap.value = 0; u.uHeal.value = 0;
        u.uAng.value = CRACK_ANG; u.uTime.value = t; u.uStep.value = Math.floor(t * 12);
        u.uFlash.value = Math.max(0, 1 - (t - R.crack) / 0.25);
      }
    },
    dispose() {
      lens.m.dispose();
      lens.mesh.geometry.dispose();
      navy.dispose();
      sh.dispose();
    },
  };
}
