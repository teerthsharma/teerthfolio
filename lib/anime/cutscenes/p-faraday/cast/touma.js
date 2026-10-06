// TOUMA-SEAL (victim, law L6b): a 0.75 m small seal in the dark jacket, spiky 7-clump hair, right flipper out.
// Timeline (bible, 24 fps): f43 leaves (1.8 s); charge x 7.0 -> 2.6 to f125 (5.2 s); plants wide; f150 (6.25 s) flipper flat and out;
// f163 (6.8 s) beam bite, hit-stop 4 frames, shoved 0.8 m by f190 on twos, flipped 540 degrees f166-175; sits dazed f221-250 (9.2-10.4 s);
// f288 (12.0 s) lowers his head. The Imagine Breaker palm has the one allowed pure-black line, 4 px; the beam's first metre cancels as a
// black-outlined hole at the hand, 6.9-7.2 s.
import { BackSide, CapsuleGeometry, CircleGeometry, ConeGeometry, DoubleSide, Group, RingGeometry, SphereGeometry } from "three";
import { actor } from "./actor.js";
import { TOUMA, toumaCrest } from "./costumes.js";
import { T, mesh, sm, lerp, win, L1, clamp01 } from "./util.js";

export const HS = 4 / 24; // hit-stop

export function buildTouma(ctx) {
  const a = actor(ctx, TOUMA), s = a.seal;
  s.body.add(toumaCrest(ctx));
  // Imagine Breaker arm: a flat fur capsule from the shoulder to a palm disc, wrapped in a pure-black hull (BackSide, 1.3x ~ 4 px)
  const arm = new Group();
  const cap = mesh(new CapsuleGeometry(0.06, 0.4, 4, 10).rotateX(Math.PI / 2), "#8e8c91"); cap.position.set(0.27, 0.3, 0.38);
  const palm = mesh(new SphereGeometry(0.1, 14, 10).scale(1, 1, 0.35), "#a09ea4"); palm.position.set(0.27, 0.3, 0.63);
  const hull = (m, k) => { const h = mesh(m.geometry, "#000000", { side: BackSide }); h.position.copy(m.position); h.scale.setScalar(k); return h; };
  arm.add(cap, palm, hull(cap, 1.32), hull(palm, 1.3));
  s.body.add(arm);
  // the contact flare: a black-outlined hole at the palm (ring + filled disc + cyan crackle ring), faces the seal
  const flare = new Group();
  const ring = mesh(new RingGeometry(0.1, 0.14, 28), "#000000", { transparent: true, side: DoubleSide });
  const hole = mesh(new CircleGeometry(0.1, 28), "#0a0a18", { transparent: true, side: DoubleSide });
  const spark = mesh(new RingGeometry(0.15, 0.17, 28), "#9fe8ff", { transparent: true, side: DoubleSide });
  flare.add(hole, ring, spark); flare.position.set(0.27, 0.3, 0.68); s.body.add(flare);
  // singed tuft tips #3a2a1a (visible from the dazed sit)
  const singe = new Group();
  for (const [x, z, r] of [[-0.1, 0.05, -0.3], [0.08, 0.0, 0.25], [0.0, -0.06, 0.0]]) { const c = mesh(new ConeGeometry(0.03, 0.08, 7), "#3a2a1a"); c.position.set(x, 0.8, z); c.rotation.z = r; singe.add(c); }
  s.body.add(singe);
  L1(arm); L1(flare); L1(singe);

  return {
    root: a.root,
    update(t, cue, base) {
      const tA = T(cue, "lineA", 1.8), tShot = T(cue, "shot", 6.8), tC = T(cue, "lineC", 12.0);
      const tPlant = tA + 3.4, tHand = tShot - 0.55, m = Math.max(0, t - tShot - HS), after = t >= tShot;
      // position along the beam line (+x of the seal): 7.0 -> 2.6, a sway on twos, shoved +0.8 m after the bite
      const charge = sm(tA, tPlant, t);
      const x = lerp(7.0, 2.6, charge) + 0.8 * sm(0, 0.93, m);
      const walking = t > tA && t < tPlant;
      const sway = walking ? Math.sin(t * 9) : 0;
      let y = walking ? 0.03 * Math.abs(sway) : 0;
      // flip 0 -> 540 degrees fast, then on to 720 slowly (upright again); a hop of 0.55 m. flip = 4 pi (1 - (1 - u)^2)
      const u = clamp01(m / 1.2), flying = u > 0 && u < 1, flip = Math.PI * 4 * (1 - (1 - u) * (1 - u));
      if (flying) y += 0.55 * Math.sin(Math.PI * u);
      a.at(base[0] + x, base[1] + y, base[2], -Math.PI / 2);
      a.tumble(0, flying ? -flip : 0);
      a.shadow(!flying);
      // pose channels
      const wide = sm(tPlant, tPlant + 0.25, t) * (1 - sm(tShot, tShot + 0.05, t));
      const bite = after ? (m <= 0 ? 0.65 : win(m, 0, 0.5, 0.01, 0.4) * 0.8) : 0;
      const stag = after ? sm(0.1, 0.4, m) * (1 - sm(0.9, 1.3, m)) : 0;
      const down = sm(tShot + 1.3, tShot + 1.9, t) * (1 - sm(tC - 0.2, tC, t) * 0.4);
      const dazed = win(t, 9.2, tC, 0.4, 0.5);
      const bow = sm(tC, tC + 0.5, t);
      a.pose({ kneel: Math.max(wide * 0.24, down * (0.55 + 0.3 * dazed)), recoil: bite, stagger: stag * 0.6, bow: bow * 0.65 });
      if (!flying) a.pivot.rotation.z = 0.05 * sway;
      // expressions: doubt (brow tilt 0.35), charge, shock, dazed swirl, lowered calm
      if (t < tA) a.expr("rage", 0.35);
      else if (!after) a.expr("rage", lerp(0.5, 0.95, charge));
      else if (m < 1.3) a.expr("terror", 1);
      else if (t < tC) a.expr("sad", dazed > 0.05 ? 0.65 : 0.4, dazed > 0.3);
      else a.expr("calm", 0.8);
      // the Imagine Breaker palm: out from f150, flat; the flare 6.9-7.2 s
      const handK = sm(tHand, tHand + 0.45, t) * (1 - sm(tShot + 0.6, tShot + 1.0, t));
      arm.scale.set(1, 1, Math.max(0.001, handK)); arm.visible = handK > 0.02;
      const fk = clamp01((t - tShot - 0.04) / 0.4);
      flare.visible = after && fk < 1;
      flare.scale.setScalar(lerp(0.8, 3.2, fk));
      hole.material.opacity = 1 - sm(0.25, 0.7, fk); ring.material.opacity = 1 - sm(0.55, 1, fk); spark.material.opacity = 0.9 * (1 - sm(0.2, 0.6, fk));
      singe.visible = t >= 9.2;
      a.update(t);
    },
    dispose() { a.dispose(); },
  };
}
