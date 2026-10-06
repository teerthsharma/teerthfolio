// HERO DRESSING (bible 3.14, 4.4). The seal itself is the locked pup and is never edited: every piece below is a costume child
// attached with ctx.seal.attach (rides the pose, never touches the mesh). Emission is zero, the shared lit-luma cap 0.92 applies.
//   twin tails   hair-clump-kit twintail variant, lilac-grey shade side #c9cbe2, stepped sheen cut; they LIFT on the release wind
//   earrings     red teardrops #c8202c with a pale highlight bead
//   collar       two gold bands + a red gem at the throat (the gold-edged capelet read)
//   staff        Frieren's staff, held at the right flipper: gem #d42a3a, gold crescent #e6b84a
import { clamp, smooth, makeFig } from "./util.js";

export function buildHero(ctx, time) {
  const { THREE, engine, kit, seal } = ctx;
  const fig = makeFig(ctx);
  const dress = new THREE.Group();
  dress.name = "frieren-dress";

  // twin tails: pivot at the nape so a wind lift rotates about the head, not the feet
  const spec = kit.defineHair("twintail", {
    count: 0, seed: 41, droop: 0.4, spike: 0.1, curl: 0.03,
    tail: { n: 6, length: 0.62, width: 0.075, at: [0.2, 0.7, -0.05], mirror: true },
    color: { base: "#f4f1ea", shade: "#c9cbe2", hi: "#ffffff" },
    cut: { at: [0.35, 0.62], slant: 0.1, rate: 0.9 },
  });
  const tails = kit.hairMesh(engine, spec, { pos: [0, 0.555, 0.03], fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 });
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.7, -0.05);
  tails.position.set(0, -0.7, 0.05);
  pivot.add(tails);
  dress.add(pivot);

  // earrings (teardrop = sphere stretched along y) + highlight bead
  for (const s of [1, -1]) {
    const e = fig(new THREE.SphereGeometry(0.03, 12, 10).scale(0.8, 1.45, 0.8), "#c8202c", "#7a1018", { pos: [s * 0.265, 0.5, 0.02], lineMul: 0.6 });
    const b = fig(new THREE.SphereGeometry(0.008, 6, 5), "#f6dfe0", "#f6dfe0", { pos: [s * 0.265 + 0.008, 0.51, 0.045], lineMul: 0.2 });
    dress.add(e, b);
  }
  // gold-edged collar: two gold bands, a red gem
  const band = (y, r) => fig(new THREE.TorusGeometry(r, 0.012, 8, 32).rotateX(Math.PI / 2), "#e6b84a", "#a67f2a", { pos: [0, y, 0.02], lineMul: 0.6 });
  dress.add(band(0.45, 0.255), band(0.425, 0.262),
    fig(new THREE.SphereGeometry(0.026, 10, 8), "#d42a3a", "#7a1018", { pos: [0, 0.43, 0.275], lineMul: 0.6 }));
  // staff in the right flipper (kit WEAPONS.staff, bible colours)
  const staff = kit.WEAPONS.staff(engine, { col: "#6a4a2a", trim: "#e6b84a", gem: "#d42a3a" });
  staff.position.set(0.27, 0.28, 0.25);
  staff.rotation.set(0, 0, -0.05);
  dress.add(staff);

  seal.attach(dress, 1);

  const tLift = time("release"); // the "rising mana wind" starts at the crouch (6.2) and peaks at the release
  return {
    update(t) {
      const wind = smooth((t - time("scale_tremble")) / 1.5) * (t < time("cracks") ? 1 : 1 - smooth((t - time("cracks")) / 1.5) * 0.9);
      const sway = Math.sin(t * 7.0) * 0.06 * wind;
      pivot.rotation.set(0.25 * wind + 0.55 * smooth((t - tLift) / 0.3) * (t < 9.3 ? 1 : 1 - smooth((t - 9.3) / 1.2)), 0, sway);
      staff.rotation.z = -0.05 - 0.04 * clamp(wind);
    },
    dispose() { dress.parent?.remove(dress); dress.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
