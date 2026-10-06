// NOMU: the high-end Nomu as ONE big costumed seal (scale 3.4): black-grey hide #3a3a46 / #1a1a24, armour-layer bulk with red-tinged
// seams #7a1a2a, an exposed brain dome #e8a0b8 / #b8607a with dark folds #5a1a2a, a black beak #1a1a20, slit yellow eyes #ffcf20.
// Timeline (bible, 24 fps frames): rises from the crater over 36 f = 1.5 s from "nomuRise" (default 1.0 s); leans to throw the two
// cards at "cards" (default 3.4 s, a 0.5 s lean); at the smash it recoils frames 0-8 (0.33 s) then settles to a kneel, shoved back 0.4 m.
import { fig, makeFrame, smooth, clamp01, startOf, lerp } from "./common.js";

export const NOMU_F = 7; // metres in front of the seal (seal units)
export default function nomu(ctx, frame = makeFrame(ctx)) {
  const { THREE, kit, engine } = ctx, S = frame.S;
  const h = kit.costumedSeal(engine, {
    scale: 3.4 * S, coat: "#3a3a46", shade: "#1a1a24", ink: "#12070a",
    layers: [{ type: "armour", col: "#3a3a46", shade: "#1a1a24", trim: "#7a1a2a" }, { type: "sash", col: "#7a1a2a", shade: "#3a0a12" }],
    eyes: { style: "slit", iris: "#ffcf20", irisLo: "#ff8a20", size: [0.1, 0.11] },
  });
  // brain dome with folds, beak, lower jaw (pup frame; the handle scales them with the body)
  const dome = new THREE.Group();
  dome.add(fig(ctx, new THREE.SphereGeometry(0.19, 18, 12), "#e8a0b8", "#b8607a", { pos: [0, 0.8, 0.0], scale: [1, 0.78, 1.1], lineMul: 1.1 }));
  for (let i = 0; i < 3; i++) dome.add(fig(ctx, new THREE.TorusGeometry(0.15 - i * 0.025, 0.007, 6, 20, Math.PI), "#5a1a2a", "#5a1a2a", { pos: [0, 0.8 + i * 0.012, 0.0], rot: [Math.PI / 2 - 0.5 + i * 0.3, 0, i * 0.5], line: 0, lineMul: 0.4 }));
  const beak = fig(ctx, new THREE.ConeGeometry(0.1, 0.24, 14).rotateX(Math.PI / 2), "#1a1a20", "#08080c", { pos: [0, 0.45, 0.34], lineMul: 1.1 });
  const jaw = fig(ctx, new THREE.ConeGeometry(0.075, 0.16, 12).rotateX(Math.PI / 2), "#14141a", "#08080c", { pos: [0, 0.4, 0.31] });
  h.props.add(dome, beak, jaw);
  const base = frame.F(NOMU_F, 0, 0);
  h.place(base[0], base[1], base[2]);
  h.lookAtPoint(frame.a[0], frame.a[2]);
  const baseYaw = h.group.rotation.y;

  return {
    h, pos: base,
    update(t, dt, cue) {
      const rise = startOf(cue, "nomuRise", 1.0), thr = startOf(cue, "cards", 3.4), smash = startOf(cue, "smash", 9.42);
      const ru = smooth((t - rise) / 1.5), u = t - smash; // u: seconds since the dome hit
      // recoil frames 0-8 (0.33 s) peaks at 0.14 s; the kneel builds after; before the strike the stance is a rage-eyed lean
      let kn = 0, rc = 0, lean = 0;
      if (u >= 0) { rc = smooth(u / 0.14) * (1 - smooth((u - 0.33) / 0.4)); kn = smooth((u - 0.3) / 0.6) * 0.75; }
      if (t > thr && t < thr + 0.6) lean = Math.sin(Math.PI * clamp01((t - thr) / 0.5));
      h.state.poses = {};
      if (lean > 0) h.setPose("bow", lean * 0.6);
      if (rc > 0) h.setPose("recoil", rc);
      if (kn > 0) h.setPose("kneel", kn);
      if (u >= 0 && u < 0.33) h.setPose("stagger", 0.35);
      h.expression(u >= 0 ? (kn > 0.3 ? "sad" : "terror") : "rage", u >= 0 ? Math.max(rc, kn, 0.5) : 0.6);
      const back = u >= 0 ? 0.4 * smooth(u / 0.33) : 0; // shoved back, away from the seal
      h.place(base[0] + frame.fwd[0] * back, base[1] + lerp(-3.4 * S, 0, ru), base[2] + frame.fwd[1] * back, baseYaw);
      h.group.visible = t >= rise - 0.05;
      h.update(t);
    },
    dispose() { h.dispose(); },
  };
}
