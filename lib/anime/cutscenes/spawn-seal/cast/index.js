// CAST layer for spawn-seal (CAST agent). Layer 1. Every figure is a costumed SEAL (L6b).
//  - Rimuru: the hero's morph made visible. The locked hero pup (ctx.seal) is never restyled and never hidden (seal in every frame);
//    Rimuru is a costumed seal that RISES from the pool beside it: slime-blue wash (4.4-6.5 s), hair pours (6.4-7.4),
//    coat unfurls (7.9-8.8), shoulder droplet, the point (8.6), two fingers (18.5), open palm (26.8).
//  - 10 Falmuth knight seals (commander with a red plume): rank at 9.4, heads up 9.4-10.0, drop spears + step back 10.0-11.0,
//    kneel (even) / blown back (odd) from 11.0, each staggered 4 f left to right when a beam lands; lifted into the maw 26.8-29.3.
// Cue names (the bible's; the direction agent lists them in scene.beats): morph, rimuruPoint, rimuruFingers, palm, beam, maw.
// Each has a bible-time fallback, so a missing beat still plays on time. Imports only the shared engine and this folder.
import { RIMURU, KNIGHT, KNIGHT_RANKS } from "./costumes.js";
import { PUP_HEAD2 } from "../../../pup.js";
import { cone, ell, paint, polygonize } from "../../../sdf.js";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const T = { morph: [4.4, 4.2], point: [8.6, 1.4], fingers: [18.5, 2.5], palm: [26.8, 2.5], beam: [10.0, 0.9], maw: [26.8, 2.5] };

export default function build(ctx) {
  const { THREE, engine, kit, ease } = ctx;
  const group = new THREE.Group();
  const R = ctx.rng(7);
  const sm = ease.smooth;
  const hold = []; // inked prop figures to dispose

  // beat window: the cue's start if the beat fired, else the bible time. { t0, k 0..1, d, on }
  const win = (cue, name, key = name) => {
    const s = cue.since(name), [t0d, dur] = T[key];
    const t0 = Number.isFinite(s) ? cue.t - s : t0d;
    const d = cue.arg?.(name, "dur", dur) || dur;
    return { t0, k: clamp((cue.t - t0) / d), d, on: cue.t >= t0 };
  };
  // a small rigid prop from SDF prims, inked like the rest of the cast
  const prop = (prims, ink = "#1a1420") => {
    const geo = polygonize(prims, 0.012);
    const f = engine.figure(geo, { head: PUP_HEAD2, ink, lineMul: 1.1, constant: true });
    f.userData.geo = geo; ctx.setLayer(f, 1); hold.push(f);
    return f;
  };

  // ---------------------------------------------------------------- Rimuru
  const rim = kit.costumedSeal(engine, { ...RIMURU, name: "rimuru-seal" });
  group.add(rim.group);
  const flip = paint("#8e8c91", "#5f6278"), blue = paint("#4a96e6", "#2f78d0"), pale = paint("#f6f8fb", "#b9c4d9");
  // slime-blue droplet on the left shoulder (bible 4.2)
  const droplet = prop([ell([-0.26, 0.47, 0.04], [0.045, 0.058, 0.045], blue, 0.02), ell([-0.275, 0.49, 0.07], [0.012, 0.018, 0.01], pale, 0.005)]);
  rim.body.add(droplet);
  // hands at the right grip, built along +y and pitched forward: right index finger (the point), two fingers (the water), open palm
  const mk = (prims) => { const f = prop(prims); f.position.set(0.27, 0.28, 0.25); f.visible = false; rim.body.add(f); return f; };
  const fPoint = mk([ell([0, 0.02, 0], [0.045, 0.045, 0.045], flip, 0.02), cone([0, 0.03, 0], [0, 0.2, 0], 0.022, 0.009, flip, 0.01)]);
  const fTwo = mk([ell([0, 0.02, 0], [0.05, 0.045, 0.045], flip, 0.02), cone([-0.016, 0.03, 0], [-0.03, 0.19, 0.01], 0.017, 0.008, flip, 0.01), cone([0.016, 0.03, 0], [0.03, 0.19, 0.01], 0.017, 0.008, flip, 0.01)]);
  const fPalm = mk([ell([0, 0.04, 0], [0.07, 0.014, 0.06], flip, 0.015), ell([0, 0.06, 0], [0.012, 0.01, 0.012], flip, 0.005)]);
  rim.group.visible = false;
  const hairBase = rim.hair?.scale.clone(), shellBase = rim.shell?.scale.clone();
  const sphereAt = new THREE.Vector3(3.1, 2.4, -1.5); // Veldora's sealed sphere (bible 3.5), world space
  let yawNow = null;

  // ---------------------------------------------------------------- Falmuth knights (10 costumed seals)
  const gold = paint("#f2c230", "#b8901a"), red = paint("#c8283a", "#7a1522");
  const knights = KNIGHT_RANKS.map((rk, i) => {
    const spec = rk.commander ? { ...KNIGHT, scale: 0.62, hat: { ...KNIGHT.hat, trim: "#c8283a" }, name: "falmuth-commander" } : { ...KNIGHT, name: "falmuth-knight" };
    const s = kit.costumedSeal(engine, spec);
    // tabard gold cross #f2c230 on the chest
    s.body.add(prop([cone([0, 0.4, 0.33], [0, 0.18, 0.33], 0.02, 0.02, gold, 0.004), cone([-0.09, 0.3, 0.335], [0.09, 0.3, 0.335], 0.02, 0.02, gold, 0.004)]));
    if (rk.commander) { // red plume #c8283a: 7 tapered clumps streaming back off the helm crest
      const pr = [];
      for (let c = 0; c < 7; c++) pr.push(cone([(c - 3) * 0.012, 0.9, -0.02], [(c - 3) * 0.028, 0.98 - Math.abs(c - 3) * 0.03, -0.3 - 0.01 * c], 0.032, 0.006, red, 0.01));
      s.body.add(prop(pr));
    }
    return { s, rk, i, spear: s.props.children[s.props.children.length - 1], jitter: (R() - 0.5) * 0.18 };
  });
  for (const k of knights) group.add(k.s.group);

  // ---------------------------------------------------------------- update
  function update(t, dt, cue) {
    const sl = ctx.seal, sx = sl.at[0], sy = sl.at[1], sz = sl.at[2], sc = sl.scale ?? 1;
    const ct = cue.t;

    // ---- Rimuru: morph window grows, tints blue, hair pours, coat unfurls
    const m = win(cue, "morph");
    const A = sm(clamp((ct - m.t0) / (m.d * 0.5)));       // rises 0.45 -> 1.9 over the first half
    rim.group.visible = ct >= m.t0;
    rim.place(sx - 1.05 * sc, sy, sz - 0.25 * sc, 0);
    rim.group.scale.setScalar(rim.scale * (0.45 + 1.45 * A) * sc);
    const stretch = Math.sin(Math.PI * clamp((ct - m.t0) / (m.d * 0.35))) * 0.12; // the stretch with its smear
    rim.tint("#4a96e6", (1 - sm(clamp((ct - (m.t0 + m.d * 0.5)) / (m.d * 0.3)))) * 0.95); // slime wash fades to person colour
    const hairK = sm(clamp((ct - (m.t0 + 2.0)) / 1.0)), coatK = sm(clamp((ct - (m.t0 + 3.5)) / 0.9)); // hair 6.4-7.4, coat 7.9-8.8
    if (rim.hair && hairBase) { rim.hair.visible = hairK > 0; rim.hair.scale.set(hairBase.x * (0.4 + 0.6 * hairK), hairBase.y * hairK, hairBase.z * (0.4 + 0.6 * hairK)); }
    if (rim.shell && shellBase) { rim.shell.visible = coatK > 0; rim.shell.scale.set(shellBase.x * (0.3 + 0.7 * coatK), shellBase.y * coatK, shellBase.z * (0.3 + 0.7 * coatK)); }
    droplet.visible = coatK > 0.9;
    rim.expression(hairK < 0.5 ? "neutral" : "calm", 1);

    // gestures
    const p = win(cue, "rimuruPoint", "point"), two = win(cue, "rimuruFingers", "fingers"), pal = win(cue, "palm");
    const pointOn = p.on && p.k < 1, twoOn = two.on && two.k < 1, palmOn = pal.on && pal.k < 1;
    fPoint.visible = pointOn; fTwo.visible = twoOn; fPalm.visible = palmOn;
    const raise = (f, k, pitch) => f.rotation.set(pitch * sm(clamp(k * 3)) * (1 - sm(clamp((k - 0.8) * 5))), 0, 0);
    raise(fPoint, p.k, 1.15); raise(fTwo, two.k, 1.0); raise(fPalm, pal.k, 0.1);
    // facing: the hero by default, the sphere on the point
    const px0 = rim.group.position.x, pz0 = rim.group.position.z;
    const want = pointOn ? Math.atan2(sphereAt.x - px0, sphereAt.z - pz0) : Math.atan2(sx - px0, sz - pz0);
    yawNow = yawNow === null || cue.cut ? want : yawNow + (want - yawNow) * Math.min(1, dt * 6);
    rim.group.rotation.y = yawNow;
    rim.update(t, dt);
    // body language over the rewritten pose group: weight on the left leg, 8 degree tilt on the point, coat settle on threes,
    // tail flick hop at 9.25 s (222 f), open palm lean at the kill angle
    rim.body.rotation.z += (pointOn ? 0.14 : 0) + 0.03 * coatK + Math.sin(t * 8) * 0.012 * coatK * (1 - coatK * 0.7);
    rim.body.rotation.x += stretch * 0.5 + (palmOn ? -0.12 : 0);
    rim.body.scale.y *= 1 + stretch;
    rim.body.scale.x *= 1 - stretch * 0.4; rim.body.scale.z *= 1 - stretch * 0.4;
    rim.body.position.y += 0.02 * Math.sin(Math.PI * clamp((ct - 9.25) / 0.17));

    // ---- knights
    const b = win(cue, "beam"), mw = win(cue, "maw");
    for (const kn of knights) {
      const { s, rk, i } = kn;
      const ca = Math.cos(rk.a), sa = Math.sin(rk.a);
      const x = sx + sa * rk.r * sc, z = sz - ca * rk.r * sc; // behind the pool (-z), fanned over about +-66 degrees
      const hit = b.t0 + i * (4 / 24);                          // staggered 4 f, left to right
      const reactK = clamp((ct - hit) / 0.3);
      const drop = sm(clamp((ct - (b.t0 + 0.1 + i * 0.02)) / 0.45));
      const step = sm(clamp((ct - b.t0) / 1.0));
      const end = sm(clamp((ct - (b.t0 + 1.0 + i * 0.05)) / 0.5)); // 11.0 s on: kneel or blown
      const px = x + sa * 0.4 * step * sc, pz = z - ca * 0.4 * step * sc; // step back from the pool
      s.place(px, sy, pz, Math.atan2(sx - px, sz - pz) + kn.jitter);
      s.group.visible = ct > 8.9; // in rank from 9.4 (the cave plate hides them before)
      if (ct < hit) s.react("terror", ct < 9.4 ? 0 : 0.25 * sm(clamp((ct - 9.4) / 0.6)));
      else if (end < 0.02) s.react("recoil", reactK);
      else s.react(i % 2 === 0 ? "kneel" : "blown", end);
      // spear drops: tilts to the ground and falls
      if (kn.spear) { kn.spear.rotation.set(0.2 * drop, 0, -1.35 * drop); kn.spear.position.y = -0.05 * drop; }
      // maw: petrified, lifted toward the pearl sphere and shrunk, staggered; gone through the home shot
      const eatK = ct >= mw.t0 ? sm(clamp((ct - mw.t0 - i * 0.12) / 1.2)) : 0;
      if (eatK > 0) {
        s.react("petrified", 1);
        s.group.position.set(px * (1 - eatK * 0.7) + sx * eatK * 0.7, sy + eatK * 7, pz + (sz - 2 - pz) * eatK * 0.5);
        s.group.scale.setScalar(s.scale * sc * (1 - eatK));
        s.group.visible = eatK < 0.99;
      } else s.group.scale.setScalar(s.scale * sc);
      s.update(t, dt);
    }
  }

  return {
    group, update,
    dispose() {
      rim.dispose(); knights.forEach((k) => k.s.dispose());
      for (const f of hold) { f.userData.geo?.dispose?.(); f.traverse((o) => { o.material?.dispose?.(); }); }
    },
  };
}
