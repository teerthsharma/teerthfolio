// Full-frame tweaks that sit BEHIND the seal: the chess veil, the f193 white flash, the f200 blue key, the wipe wash.
// Bible E13 (veil, blue key), section 6 (Impact frame: huegrade blue key 12 frames), shot 4 (white flash), shot 7c.
//
// Maths (all four are back quads, see lib.js backQuad: the seal, being nearer, is never graded or covered)
//   veil     #101018, alpha = 0.7 * clamp((|q| * .78)^2), q the frame NDC: a hard-cornered vignette, 0 at the centre,
//            ~0.7 at the corners, scaled by the board visibility.
//   flash    additive white, alpha 1 for the single frame f193 (t in [t0, t0 + 1/24)).
//   bluekey  #1a3a8a at 0.35 normal blend (the 0.25 multiply of the bible, restated as a mix so it also reads on the
//            bright room), 12 frames from f200 with a 2-frame ramp; stepped, so it holds on twos.
//   wash     additive #ffd98a, alpha 0.55 sin(pi u), the sky-shell collapse f562-f571 (shot 7c).
import * as THREE from "three";
import { backQuad, prog, boardK, clamp01 } from "./lib.js";

export default function grade(ctx, U, T) {
  const grp = new THREE.Group();
  const veil = backQuad(U, { gap: 1.6, order: -9 });
  const blue = backQuad(U, { gap: 1.3, order: -8 });
  const flash = backQuad(U, { blend: THREE.AdditiveBlending, gap: 1.0, order: -7 });
  const wash = backQuad(U, { blend: THREE.AdditiveBlending, gap: 1.0, order: -6 });
  veil.material.uniforms.uCol.value.set("#101018"); veil.material.uniforms.uMode.value = 1;
  blue.material.uniforms.uCol.value.set("#1a3a8a");
  flash.material.uniforms.uCol.value.set("#ffffff");
  wash.material.uniforms.uCol.value.set("#ffd98a");
  grp.add(veil, blue, flash, wash);
  const quads = [veil, blue, flash, wash];

  function update(t, dt, cue) {
    const cam = ctx.player?.camera;
    const asp = ctx.aspect();
    const bk = boardK(T, t);
    veil.material.uniforms.uA.value = 0.7 * bk; veil.visible = bk > 0.001;
    const bt = t - T.bluekey.t, bf = 12 / 24;
    const bA = bt < 0 || bt > bf ? 0 : Math.min(1, bt / (2 / 24)) * (1 - clamp01((bt - (bf - 2 / 24)) / (2 / 24)));
    blue.material.uniforms.uA.value = 0.35 * bA; blue.visible = bA > 0.001;
    const ft = t - T.flash.t;
    flash.material.uniforms.uA.value = ft >= 0 && ft < 1 / 24 ? 1 : 0; flash.visible = ft >= 0 && ft < 1 / 24;
    const wu = prog(T.wipe, t);
    wash.material.uniforms.uA.value = t >= T.wipe.t ? 0.55 * Math.sin(Math.PI * wu) : 0; wash.visible = t >= T.wipe.t && wu < 1;
    if (cam) for (const q of quads) if (q.visible) q.userData.place(cam, asp);
  }
  return { group: grp, update, dispose() { quads.forEach((q) => { q.geometry.dispose(); q.material.dispose(); }); } };
}
