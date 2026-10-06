// pr-tensorflow-124410 CAST: the six Cairo bystander seals on the dam (bible 4 "Cairo bystander seals (x6)"): linen tunics #d8c8a0, headscarves #c8a060, baskets.
// They stand at the hero flanks (|x| 1.7 to 2.9 S, never between a front camera and the hero), startle at the Stand rise and FLEE away from the hero
// (backing off, wide eyes on it), leap in the last 0.35 s before the stop, and HANG 1 m above the ground in the stopped second (0.45 S in hero units,
// frozen on tE = min(ts, timestop)), then fall on resume: land, lie a beat, cower and kneel, trembling. Gone with the dam at the poster tear.
// Pose channels come from the kit (recoil, stagger, terror, fallen, cower, kneel); the face is the kit round anime eye, wide on terror.
import { events, ramp, sm, clamp01, hash, stageFrame } from "./timing.js";
import { BYSTANDERS } from "./costumes.js";
import { propKit, L1, disposeTree } from "./props.js";

export default function buildBystanders(ctx) {
  const { THREE, engine, kit } = ctx;
  const { Group, CylinderGeometry, TorusGeometry, SphereGeometry } = THREE;
  const P = propKit(ctx), F = stageFrame(ctx, false), S = F.S();
  const group = new Group(); group.name = "cairo-bystanders";
  const HANG = 0.45; // 1 m of the bible 1.8 m hero, in hero units
  const sealP = F.to(0, 0, 0);
  const list = BYSTANDERS().map((d, i) => {
    const v = kit.costumedSeal(engine, { ...d.spec, scale: d.scale * S, name: d.id, shadowTint: "#3a3050" });
    // the basket on the right hip: a tapered woven pot #b88a4a (shadow #6a4420), a handle ring, three fruit
    const bk = new Group();
    bk.add(P.fig(new CylinderGeometry(0.075, 0.052, 0.1, 14), "#b88a4a", "#6a4420", { line: 0.8 }), P.fig(new TorusGeometry(0.06, 0.008, 6, 14, Math.PI), "#8a5a2a", "#4a2a10", { line: 0.5, pos: [0, 0.05, 0] }));
    for (let k = 0; k < 3; k++) bk.add(P.fig(new SphereGeometry(0.03, 8, 6), ["#e8742a", "#c8302a", "#e8b82c"][k], "#6a2a10", { line: 0.4, pos: [(k - 1) * 0.04, 0.06, 0.01 * k] }));
    bk.position.set(0.27, 0.2, 0.22);
    v.props.add(L1(bk));
    const x0 = d.pos[0], z0 = d.pos[1], sgn = x0 > 0 ? 1 : -1;
    const dir = [sgn * 0.4, -0.92]; // away from the hero, drifting outward
    group.add(v.group);
    return { v, d, i, x0, z0, dir, delay: i * 0.05 + hash(i, 9) * 0.1, ph: hash(i, 3) * 6.28 };
  });

  return {
    group,
    update(t, dt, cue) {
      const E = events(cue), ts = cue.ts ?? t;
      group.visible = ts < E.tear;
      if (!group.visible) return;
      const tE = Math.min(ts, E.timestop);
      for (const e of list) {
        const { v } = e;
        const f0 = E.stand + e.delay, tau = Math.max(0, tE - f0), fleeing = tE > f0;
        // run distance (hero units): eases up over 0.4 s, then 1.2 S/s; hop = a small bounce
        const dist = 1.2 * (tau - 0.2 * (1 - sm(tau / 0.4)));
        const hop = fleeing ? 0.04 * Math.abs(Math.sin(tau * 14 + e.ph)) : 0;
        // the leap before the freeze peaks exactly at the stop; the fall after resume is a parabola landing 0.45 s later
        const u = clamp01((tE - (E.timestop - 0.35)) / 0.35), leap = HANG * Math.sin((Math.PI / 2) * sm(u));
        const tr = ts - E.resume, fall = ts >= E.resume ? 1 - Math.min(1, Math.max(0, tr / 0.45)) ** 2 : 1;
        const y = ts >= E.resume ? HANG * fall : leap + hop;
        const p = F.to(e.x0 + e.dir[0] * Math.max(0, dist), y, e.z0 + e.dir[1] * Math.max(0, dist));
        v.place(p[0], p[1], p[2]).lookAtPoint(sealP[0], sealP[2]);
        // poses: startled stand -> run (stagger + recoil lean) -> hanging terror -> fallen -> cower and kneel
        const poses = {};
        let expr = "awe", ek = 0.6;
        if (fleeing) { poses.stagger = 0.6; poses.recoil = 0.35; expr = "terror"; ek = 1; }
        if (ts >= E.timestop && ts < E.resume) { poses.stagger = 0; poses.terror = 1; poses.recoil = 0.5; }
        if (ts >= E.resume) {
          const down = ramp(tr, 0.45, 0.15) * (1 - ramp(tr, 1.2, 0.3)), cw = ramp(tr, 1.1, 0.3);
          poses.recoil = 0; poses.stagger = 0; poses.terror = 0.6;
          poses.fallen = down; poses.cower = cw * 0.8; poses.kneel = cw * 0.5;
          expr = down > 0.5 ? "shut" : "terror"; ek = 1;
        }
        v.state.poses = {};
        for (const [n, k] of Object.entries(poses)) if (k > 0) v.setPose(n, k);
        v.expression(expr, ek);
        // frame-locked tremble and hold: update reads the same frozen clock, so a hanging seal does not move in the stopped second
        v.update(ts < E.timestop ? ts : ts < E.resume ? E.timestop : ts);
      }
    },
    dispose() { for (const e of list) e.v.dispose(); disposeTree(group); },
  };
}
