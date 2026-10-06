// p-caustic CAST: the Allied Shinobi Forces, 12 small costumed seals (the five Kage + Mifune + six troops), bible 3.7 and 4.
// They stand in two ranks in front of the hero (the hero faces the army): Kage and Mifune nearest, troops behind, laid out in the seal's own
// frame so the camera law (which orbits the seal) always has them in the wide. Every victim keeps the locked seal body (kit), only costume differs.
//
// Reaction script, all on twos (the stepped time ts) and all pure functions of ts, so scrubbing equals playing. L = per-seal lag 0 to 6 frames.
//   flinch   1.9 s      lean back (recoil 0.5) + step back, expression awe; Onoki hops and shields his eyes
//   cast     3.3 s      cower 0.6 + terror tremble; Gaara raises the sand wall
//   hit1     4.7 s      0.45 s jolt (stagger 0.7 plus a frame-locked shake)
//   meteor2  4.85 s     they turn to face the sky/meteor and shield (cower 0.85)
//   hit2     6.42 s     blown seals fly back (blown over 0.7 s); the others stagger for 10 frames, then kneel; the sand wall collapses
//   break    6.6 s      kneeling and shaking (kneel + terror), expression sad; A kneels last
//   aftermath 8.3 s     everyone lies (fallen), then rises one at a time (rank order, 0.13 s apart, each over 24 frames), turning back to the hero
// Cue names (optional, fall back to the bible times): flinch cast hit1 meteor2 hit2 break aftermath. Hit shake is also keyed to the `trauma` beat time.
import { events, ramp, jit, clamp01 } from "./timing.js";
import { VICTIMS, propKit } from "./costumes.js";

const POSE_NAMES = ["recoil", "cower", "stagger", "blown", "kneel", "fallen", "terror"];

export default function buildVictims(ctx) {
  const { THREE, engine, seal, kit, rng } = ctx;
  const R = rng("p-caustic-victims");
  const P = propKit(ctx);
  const S = seal.scale ?? 1, yaw = seal.yaw ?? 0;
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const base = new THREE.Vector3(seal.at[0], seal.at[1], seal.at[2]);
  const D = 7.5 * S; // distance of the front rank from the hero, metres at hero scale
  const group = new THREE.Group(); group.name = "allied-forces";
  const list = VICTIMS(ctx).map((d, i) => {
    const v = kit.costumedSeal(engine, { ...d.spec, name: d.id, shadowTint: "#2a231c" });
    const vs = v.scale * S; // costumed seals take the hero's scale so a dock that enlarges the hero enlarges the army with it
    v.group.scale.setScalar(vs);
    const p = base.clone().addScaledVector(right, d.pos[0] * S * 1.05).addScaledVector(fwd, D + d.pos[1] * 2.2 * S);
    d.extras?.(v);
    const yaw0 = Math.atan2(base.x - p.x, base.z - p.z); // face the hero
    const e = { d, v, i, p, yaw0, vs, away: fwd.clone(), L: Math.floor(R() * 7) / 24, rank: d.role.order, drop: null, wall: null, weapon: null };
    v.place(p.x, p.y, p.z, yaw0);
    group.add(v.group);
    if (d.role.drop && d.spec.weapon) { // the kunai: held until the second hit, then it falls and lies on the ground
      e.weapon = v.props.children[v.props.children.length - 1];
      e.drop = kit.WEAPONS.sword(engine, { col: "#8a8f98" }); e.drop.scale.setScalar(vs * 0.9); e.drop.visible = false; group.add(e.drop);
    }
    if (d.role.sandWall) { // Gaara's sand wall: a rising slab on the far side (away from the hero) that faces the hero; one painted box
      const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
      e.wall = P.fig(geo, "#c9a35a", "#8a6e38", { line: 1.1 }); e.wall.visible = false; group.add(e.wall);
    }
    return e;
  });

  const bump = (d, win) => (d >= 0 && d < win ? 1 - d / win : 0); // a sawtooth pulse that decays over win seconds

  return {
    group,
    update(t, dt, cue) {
      const ts = cue.ts ?? t, E = events(cue, ts);
      for (const e of list) {
        const { v, d, vs, L, rank } = e, role = d.role;
        const fl = E.flinch + L, ct = E.cast + L, h1 = E.hit1 + L, m2 = E.meteor2 + L, h2 = E.hit2 + L * 0.5, br = E.break, af = E.aftermath, riseAt = af + 0.35 + rank * 0.13;
        const rFl = ramp(ts, fl, 0.3), rCt = ramp(ts, ct, 0.25), rM2 = ramp(ts, m2, 0.3), rH2 = ramp(ts, h2, 0.15), rAf = ramp(ts, af, 0.3), rRise = ramp(ts, riseAt, 1.0);
        // poses (weights are products of ramps, so every phase crossfades)
        const kb = role.blown ? ramp(ts, h2, 0.7) * (1 - rAf) : 0;
        const kneel = role.blown ? 0 : ramp(ts, role.kneelLast ? br + 0.4 : h2 + 0.42, 0.3) * (1 - rAf);
        const w = {
          recoil: 0.5 * rFl * (1 - rCt),
          cower: (0.6 * rCt + 0.25 * rM2) * (1 - rH2),
          stagger: 0.7 * bump(ts - h1, 0.45) + (role.blown ? 0 : 0.9 * bump(ts - h2, 10 / 24)) + (role.stagger ? 0.25 * bump(ts - h2, 0.9) : 0),
          blown: kb,
          kneel,
          fallen: rAf * (1 - rRise),
          terror: Math.min(1, 0.5 * (rCt * (1 - rH2) + kneel) + 0.4 * kb),
        };
        for (const n of POSE_NAMES) v.setPose(n, w[n]);
        // expression: awe at the rise (Onoki shields his eyes: half-lidded), terror at the cast and hits, sad while kneeling, shut when lying
        let ex = "neutral", k = 0;
        if (ts < fl) { ex = "neutral"; k = 0; }
        else if (ts < ct) { ex = role.shield ? "calm" : "awe"; k = 0.9 * rFl; }
        else if (ts < br) { ex = "terror"; k = 0.5 + 0.5 * rCt; }
        else if (ts < af) { ex = "sad"; k = 0.8; }
        else if (ts < riseAt) { ex = "shut"; k = 1; }
        else { ex = "awe"; k = 1 - rRise; }
        v.expression(ex, k);
        // placement: step back 0.3 m from the hero, Onoki's hop, the frame-locked shake on both hits, the turn to the sky and back
        const step = 0.3 * S * rFl * (1 - rRise);
        const hop = role.hop ? 0.1 * vs * Math.abs(Math.sin(Math.PI * Math.max(0, ts - fl) / 0.45)) * (ts - fl < 0.9 && ts >= fl ? 1 : 0) : 0;
        const sh = 0.06 * vs * (bump(ts - h1, 0.3) + bump(ts - h2, 0.5)) * jit(ts, e.i);
        const turn = Math.PI * rM2 * (1 - ramp(ts, riseAt, 0.6)); // from m2 they face the meteor; at their rise they turn back to the hero
        v.place(e.p.x + e.away.x * step + right.x * sh, e.p.y + hop, e.p.z + e.away.z * step + right.z * sh, e.yaw0 + turn);
        v.update(ts);
        // the kunai: up until the second hit, then it falls (y = y0 - g s^2 / 2) and lies on the ground
        if (e.drop) {
          const dd = ts - h2, held = dd < 0;
          e.weapon.visible = held;
          e.drop.visible = !held;
          if (!held) {
            const y0 = 0.45 * vs * 1.2, g = 9.8 * S, fall = Math.max(0, y0 - 0.5 * g * dd * dd), lying = fall <= 0.02 * S;
            e.drop.position.set(e.p.x + right.x * 0.28 * vs + e.away.x * (step + 0.1 * vs * clamp01(dd * 2)), Math.max(0.02 * S, fall), e.p.z + right.z * 0.28 * vs + e.away.z * (step + 0.1 * vs * clamp01(dd * 2)));
            e.drop.rotation.set(0, e.yaw0, lying ? Math.PI / 2 : Math.PI / 2 * clamp01(dd * 3));
          }
        }
        // Gaara's sand wall: rises over 0.4 s on twos from the cast, hangs, then collapses at the second hit (scale y to 0 over 0.25 s, sinks)
        if (e.wall) {
          const up = ramp(ts, ct, 0.4) * (1 - ramp(ts, h2 + 0.05, 0.25));
          e.wall.visible = up > 0.01;
          e.wall.scale.set(0.9 * vs * 1.6, Math.max(0.001, 1.15 * vs * up), 0.14 * vs);
          e.wall.position.set(e.p.x + e.away.x * 0.55 * vs * 1.6 + right.x * sh, e.p.y - 0.05 * vs * (1 - up), e.p.z + e.away.z * 0.55 * vs * 1.6 + right.z * sh);
          e.wall.rotation.y = e.yaw0;
          engine.syncFaces?.(e.wall);
        }
      }
    },
    dispose() { for (const e of list) { e.v.dispose(); e.drop?.traverse?.((o) => o.geometry?.dispose?.()); e.wall?.traverse?.((o) => o.geometry?.dispose?.()); } },
  };
}
