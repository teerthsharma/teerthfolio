// HERO: the All Might seal. The locked pup is never restyled; only costume parts ride the body through seal.attach():
//  - a short two-panel cape streaming from the shoulders either side of the back, navy #1c2a61 / #101831, red #c82020 clasps and a white hem
//    (two side panels, NOT a back sheet, so the home camera behind the seal still sees the seal: law "never covered")
//  - the V of light on the brow #fff3b0: two tapered spikes, a light SHAPE (not hair, not emissive)
//  - the cyan eye decal #40d0ff (anime-eye-decal) over the painted eyes, slitting to "rage" on the strike
//  - the black hard shadow band across the eyes #1a0a08, which only exists while the strike holds
// Expression law: expr(t) = rage on [dash, smash+0.7] and [punch-0.2, punch+0.9]; k eases over 0.12 s; else neutral.
import { PUP_HEAD2 } from "../../../pup.js";
import { fig, smooth, startOf } from "./common.js";

export default function hero(ctx) {
  const { THREE, sdf, engine, seal, kit } = ctx, { cone, ell, paint, polygonize } = sdf;
  const P = (c, s) => paint(c, s ?? c, { line: 1.1 });
  const navy = P("#1c2a61", "#101831"), red = P("#c82020", "#5a1010"), white = P("#f4f0e8", "#c8c4b8");
  const prims = [];
  for (const s of [1, -1]) {
    prims.push(cone([s * 0.2, 0.48, -0.08], [s * 0.4, 0.2, -0.3], 0.075, 0.15, navy, 0.03),
      cone([s * 0.4, 0.2, -0.3], [s * 0.41, 0.17, -0.31], 0.15, 0.155, white, 0.0), // the hem edge
      ell([s * 0.2, 0.47, 0.0], [0.07, 0.05, 0.06], red, 0.02)); // the clasp
  }
  prims.push(ell([0, 0.47, -0.04], [0.26, 0.045, 0.2], navy, 0.03)); // the collar band joining the panels
  const cape = engine.figure(polygonize(prims, 0.014), { head: PUP_HEAD2, ink: "#12070a", lineMul: 1.2, constant: true });
  cape.name = "hero-cape";
  seal.attach(cape);

  // the V of light (cone points +y; lean outward and forward to read as a V from the front)
  const vlight = new THREE.Group(); vlight.name = "hero-v-light";
  for (const s of [1, -1]) vlight.add(fig(ctx, new THREE.ConeGeometry(0.032, 0.2, 8), "#fff3b0", "#e8d070", { pos: [s * 0.085, 0.77, 0.17], rot: [0.5, 0, -s * 0.5], lineMul: 0.6 }));
  seal.attach(vlight);

  // cyan eyes, one white highlight per eye (the decal's big highlight; hl scaled down by the expression table)
  const eyes = kit.eyePair({ c: PUP_HEAD2.pos, r: [0.27, 0.245, 0.255] }, { style: "tsurime", iris: "#40d0ff", irisLo: "#1a7ac0", size: [0.092, 0.108] });
  seal.attach(eyes);
  // the hard black shadow shape across the eyes: a flat dark lozenge on the brow plane
  const band = fig(ctx, new THREE.SphereGeometry(1, 14, 8), "#1a0a08", "#1a0a08", { pos: [0, 0.64, 0.275], scale: [0.2, 0.014, 0.024], rot: [-0.25, 0, 0], line: 0, lineMul: 0.2 });
  seal.attach(band);

  // pure function of t (scrubbing equals playing): two windows, eased 0.12 s in and out
  const win = (t, a, b) => smooth((t - a) / 0.12) * (1 - smooth((t - b) / 0.12));
  return {
    update(t, dt, cue) {
      const dash = startOf(cue, "dash", 8.58), smash = startOf(cue, "smash", 9.42), punch = startOf(cue, "punch", 14.4);
      const k = Math.max(win(t, dash, smash + 0.7), win(t, punch - 0.2, punch + 0.9));
      eyes.userData.set(k > 0.02 ? "rage" : "neutral", k > 0.02 ? k : 1);
      band.visible = k > 0.35;
      band.scale.y = 0.014 * smooth(k);
    },
    dispose() { eyes.userData.dispose?.(); cape.geometry?.dispose?.(); },
  };
}
