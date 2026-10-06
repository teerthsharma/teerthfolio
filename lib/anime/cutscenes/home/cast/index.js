// CAST layer for home (Vinland Saga, Thors: "You have no enemies"). Layer 1, redrawn every step.
// Bible: scripts/home.md 3.11 (orca), 3.13 (hero), 3.14 (Thors-seal), 3.15 (penguins, gull), 4 (frame timing), 7 (eggs 4, 5, 8).
// Law L6b: every being is a costumed SEAL (costumed-seal-kit). The hero is ctx.seal, the locked design, never restyled.
//
// CUE NAMES (all optional: each falls back to the bible's frame at 24 fps when scene.js does not declare the beat):
//   thorsStep f55   Thors-seal steps out of the wet bloom (scale 0 -> 1.05 -> 1.0)
//   heroPlop  f62   the hero plops onto the jetty: squash settling exp(-5t) cos(16t)
//   gullLand  f108  the gull lands (it flies in from f90)
//   orcaFin   f120  the fin cuts the surface
//   orcaCircle f139 the circle run (4.8 s)
//   orcaSpy   f257  tilt-up spy-hop, eye to eye with the pup
//   orcaSink  f278  nose-down sink (tail lifts)
//   thorsHorizon f306 Thors turns to the horizon (Vinland)
//   heroBlink f307  the hero's one slow blink
//   thorsBlink f330 Thors blinks
//   thorsFace f450  Thors faces the camera (to the end)
//   thorsSmile f540 the one soft smile, 6 f hold
//   heroRaise f588  the hero lifts one flipper to the first rain (egg 4)
//   runoff    f620  the pigment runs off Thors-seal (bare by f680)
// Layers never import each other; this file imports only its own folder.
import { buildThors, buildOrca, buildPenguin, buildGull } from "./costumes.js";
import { F, sm, clamp01, lerp, lerpAng, tOf, clearRay, orcaAt } from "./choreo.js";

export default function build(ctx) {
  const { THREE: T, seal } = ctx;
  const group = new T.Group();
  const hs = seal.scale ?? 1;
  const sc = 0.8 * hs; // Thors-seal is 0.8 hero scale (bible 3.14)

  // ---- the beings: all costumed seals
  const thors = buildThors(ctx, sc);
  const orca = buildOrca(ctx, 5.0), calf = buildOrca(ctx, 2.1, true);
  const peng = [buildPenguin(ctx, 0.3 * hs), buildPenguin(ctx, 0.26 * hs)];
  const gull = buildGull(ctx, 0.24 * hs);
  const roots = [thors.group, orca.rig, calf.rig, ...peng.map((p) => p.group), gull.group];
  for (const o of roots) { group.add(o); ctx.setLayer(o, 1); o.visible = false; }

  const O = () => seal.at ?? [0, 0, 0];
  const eyeOf = () => ctx.camera?.out?.eye ?? null;
  const off = (dx, dy, dz) => { const o = O(); return [o[0] + dx, o[1] + dy, o[2] + dz]; };
  const yawTo = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);
  const place = (s, p, yaw, w) => { const q = clearRay(p, eyeOf(), O(), w); s.place(q[0], q[1], q[2], yaw); return q; };
  // one broken being must not take the others down
  const guard = (fn) => { try { fn(); } catch (e) { ctx.player?.errors?.push?.(`cast: ${e.message}`); } };

  function update(t, dt, cue) {
    // timings: the beat's real start, else the bible's frame
    const A = {
      step: tOf(cue, "thorsStep", F(55)), plop: tOf(cue, "heroPlop", F(62)), gull: tOf(cue, "gullLand", F(108)),
      fin: tOf(cue, "orcaFin", F(120)), circle: tOf(cue, "orcaCircle", F(139)), spy: tOf(cue, "orcaSpy", F(257)), sink: tOf(cue, "orcaSink", F(278)),
      horizon: tOf(cue, "thorsHorizon", F(306)), hBlink: tOf(cue, "heroBlink", F(307)), tBlink: tOf(cue, "thorsBlink", F(330)),
      face: tOf(cue, "thorsFace", F(450)), smile: tOf(cue, "thorsSmile", F(540)), raise: tOf(cue, "heroRaise", F(588)), runoff: tOf(cue, "runoff", F(620)),
    };
    const o = O();
    const orcaT = { fin: A.fin, circle: A.circle, spy: A.spy, sink: A.sink };

    // ---------------- the hero seal: pose marks per beat (locked design; only pose channels, never a restyle).
    // seal.update() rebuilds its pose map before the layers run, so re-apply after adding ours.
    guard(() => {
      let touched = false;
      const tau = t - A.plop;
      if (tau >= 0 && tau < 0.7) { seal.setPose("crouch", Math.min(1, Math.exp(-5 * tau) * Math.abs(Math.cos(16 * tau)) * 1.4)); touched = true; }
      const b = (t - A.hBlink) / 0.3;
      if (b >= 0 && b <= 1) { seal.setPose("blink", b); touched = true; } // the one slow blink
      const r = sm(A.raise, A.raise + 0.4, t) * (1 - sm(A.raise + 0.55, A.raise + 0.95, t));
      if (r > 0.001) { seal.setPose("sign", r); touched = true; } // one flipper lifts to the first rain
      if (touched) seal.apply(t);
    });

    // ---------------- THORS-SEAL: steps out f55-67, hand out f60-110, tracks the orca f130-290 (6 f lag), turns to the horizon f306,
    // faces the camera f450, soft smile f540, pigment run-off f620-680
    guard(() => {
      const u = clamp01((t - A.step) / 0.5);
      const m = u < 0.5 ? lerp(0, 1.05, u * 2) : lerp(1.05, 1, (u - 0.5) * 2);
      const runEnd = A.runoff + 2.5; // bare paper by f680
      thors.group.visible = t >= A.step && t < runEnd;
      if (!thors.group.visible) return;
      const base = off(-2.4, 0, -0.5);
      const p = clearRay([base[0], base[1] + 0.004 * Math.sin(t * 2.4), base[2]], eyeOf(), o, 0.9); // 2 px breath
      let yaw = yawTo(base, o); // A: faces the pup
      const om = orcaAt(t - 0.25, orcaT);
      if (om.vis && t < A.horizon) yaw = lerpAng(yaw, yawTo(base, [o[0] + om.pos[0], 0, o[2] + om.pos[2]]), 0.6 * sm(F(130), F(150), t));
      yaw = lerpAng(yaw, Math.PI, sm(A.horizon, A.horizon + 0.67, t)); // B: head and body turn to Vinland (-z)
      const e = eyeOf();
      if (e) yaw = lerpAng(yaw, yawTo(base, e), sm(A.face - 0.5, A.face + 0.4, t)); // C: faces the lens
      thors.place(p[0], p[1], p[2], yaw);
      thors.group.scale.setScalar(sc * Math.max(0.001, m));
      thors.setPose("salute", 0.6 * sm(F(60), F(70), t) * (1 - sm(F(105), F(114), t))); // the empty hand held out
      const bl = Math.sin(Math.PI * clamp01((t - A.tBlink) / 0.17)); // blink f330
      const sml = sm(A.smile - 0.1, A.smile, t) * (1 - sm(A.smile + 0.25, A.smile + 0.35, t)); // one soft smile, 6 f hold
      if (bl > 0.01) thors.expression("shut", bl);
      else if (sml > 0.01) thors.expression("smug", 0.5 * sml);
      else thors.expression("calm", 1);
      thors.eyes?.userData.look?.(0, 0.3 * sm(A.horizon, A.horizon + 0.6, t) * (1 - sm(A.face - 0.5, A.face, t))); // eyes lift to the horizon
      thors.pony.rotation.set(0.3 * Math.sin(t * 4.4), 0, 0.12 * Math.sin(t * 3.1 + 1)); // ponytail swing, 0.3 rad on twos
      // run-off: pigment lifts toward bare paper #fcf3e6, the seal stays opaque until it is bare (L1)
      thors.tint("#fcf3e6", sm(A.runoff, runEnd - 0.4, t));
      thors.update(t, dt);
    });

    // ---------------- the ORCA and calf: stilled by the power, never crossing the lens->pup ray (L2)
    guard(() => {
      const st = orcaAt(t, orcaT);
      orca.rig.visible = st.vis;
      if (st.vis) {
        const p = clearRay([o[0] + st.pos[0], st.pos[1], o[2] + st.pos[2]], eyeOf(), o, 1.7);
        orca.rig.position.set(p[0], p[1], p[2]);
        orca.rig.rotation.set(st.pitch + 0.05 * Math.sin(t * 2.2), st.yaw, st.roll); // swim undulation
        orca.expression(st.up ? "neutral" : "calm", 1); // wide soft eye for the eye-to-eye pause
        orca.update(t, dt);
      }
      const c = orcaAt(t - 0.5, orcaT); // the calf follows 12 f behind, on the lee side
      calf.rig.visible = c.vis && t > A.fin + 0.3;
      if (calf.rig.visible) {
        const cp = clearRay([o[0] + c.pos[0] + Math.cos(c.yaw) * 1.3, c.pos[1] - 0.05, o[2] + c.pos[2] - Math.sin(c.yaw) * 1.3], eyeOf(), o, 0.9);
        calf.rig.position.set(cp[0], cp[1], cp[2]);
        calf.rig.rotation.set(c.pitch * 0.8 + 0.06 * Math.sin(t * 2.6 + 1), c.yaw, c.roll);
        calf.update(t, dt);
      }
    });

    // ---------------- penguins (waddle f58-220) and the gull (lands f108): extras, out of the pup's silhouette
    guard(() => {
      const paths = [[[-4.2, -3.0], [-1.6, -3.9]], [[-5.4, -2.2], [-3.0, -3.3]]];
      peng.forEach((pg, i) => {
        const a = F(58 + i * 6), b = F(220);
        pg.group.visible = t >= a;
        if (!pg.group.visible) return;
        const P = paths[i], k = sm(a, b, t);
        const step = k < 1 ? Math.sin(t * 6.5 + i * 2) : 0; // waddle on twos
        const q = place(pg, off(lerp(P[0][0], P[1][0], k), 0, lerp(P[0][1], P[1][1], k)), Math.atan2(P[1][0] - P[0][0], P[1][1] - P[0][1]) + 0.1 * step, 0.7);
        pg.group.position.y = q[1] + 0.012 * Math.abs(step);
        pg.group.rotation.z = 0.16 * step;
        pg.update(t, dt);
      });
      const fa = A.gull - F(18);
      gull.group.visible = t >= fa;
      if (gull.group.visible) {
        const k = clamp01((t - fa) / (A.gull - fa)), land = off(-5.2, 0.05, -0.8), from = off(6.0, 4.2, -4.0);
        const e = k * k * (3 - 2 * k), flap = k < 1 ? Math.sin(t * 22) : 0; // a glide that flares at the end, wings beat on twos
        const q = clearRay([lerp(from[0], land[0], e), lerp(from[1], land[1], e) + Math.sin(Math.PI * k) * 0.8 * (1 - k), lerp(from[2], land[2], e)], eyeOf(), o, 0.8);
        gull.place(q[0], q[1] + 0.03 * flap, q[2], k < 1 ? yawTo(from, land) : lerpAng(yawTo(from, land), 1.0, sm(A.gull + 0.4, A.gull + 1.2, t)));
        gull.group.rotation.z = 0.35 * flap;
        gull.update(t, dt);
      }
    });
  }

  function dispose() {
    for (const s of [thors, orca, calf, ...peng, gull]) s.dispose?.();
    group.clear();
  }
  return { group, update, dispose };
}
