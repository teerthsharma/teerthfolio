// CAST layer for pr-xnnpack-10801: Kyoka Suigetsu and the throne of Las Noches (Bleach, TYBW / Aizen, PROTECTED LOOK).
// Layer 1 (redrawn every stepped frame). Owner law L6b: no silhouettes. Every figure here is a SMALL SEAL (costumed-seal-kit):
//   Aizen-seal (the illusion's voice, INDEX decision 7: yes), Ichigo-seal (cleaver, cracks the glass once), Gin-seal, Urahara-seal,
//   and six Soul Reaper extras (colony pups) who pop in pairs at the throne's foot and cheer on twos.
// The hero seal is ctx.seal (locked, never restyled). The only thing added to it is Aizen's one black forelock (bible 4 / egg 5), a hair
// clump parented to its body through ctx.seal.attach (the pup mesh is untouched). Nothing here stands between lens and seal: every figure
// stands on the sand FAR BELOW the throne seat and faces the throne, so the camera law's rig (about the seal's chest) looks over them.
// The pocket is a dimension: dimension palette only (paper / ink / grey), see costumes.js.
//
// Timing (bible 5, 24 fps frames; T in choreo.js, and any scene.js beat of the SAME NAME overrides it so layer and direction agree):
//   speak 3.0   Aizen-seal raises a hand for line A          popA/popB/popC 3.2/3.7/4.2  the colony pops in, a pair at a time
//   slash 4.85  Ichigo's windup (SLASH sfx 4.85, 5.35)        crack 5.42   the arc ends on the glass; recoil frames 8-14
//   line 6.4    Ichigo: 'Where did that space even come from?'   gin 8.96   Gin steps back 1 m (second crack, frame 215)
//   snap 9.58   Kyoka Suigetsu's tip snaps (frame 230), tumbles 14 frames    break 9.55  gasp 0-6, tumble 6-16, fall with the shards
//   hat 9.67    Urahara tips the hat (frame 232)              gone 11.0    every dimension actor has fallen out of frame
// Cue names read (all optional; fallbacks above): speak popA popB popC slash crack line gap gin break snap hat gone.
import { makeProps } from "./props.js";
import { makeSpecs } from "./costumes.js";
import * as C from "./choreo.js";

// STAGE: marks in the SEAL's frame (r = to its right, f = forward of the seal, metres), standing on the sand at the seal's rest height.
// The world agent's dais sits between the seal and these marks; adjust here if its steps differ. `size` scales every victim.
export const STAGE = {
  size: 1.0,
  aizen: { r: 3.2, f: 2.4 },
  ichigo: { r: -1.6, f: 5.4 },
  gin: { r: 2.0, f: 5.8 },
  urahara: { r: 4.2, f: 6.8 },
  extras: [{ r: -4.2, f: 4.0 }, { r: -3.0, f: 5.2 }, { r: 0.6, f: 4.3 }, { r: -0.2, f: 6.4 }, { r: -5.4, f: 6.4 }, { r: 5.6, f: 4.8 }],
};

export default function build(ctx) {
  const { THREE, engine, kit } = ctx;
  const group = new THREE.Group();
  group.name = "cast-pr-xnnpack-10801";
  const P = makeProps(ctx);
  const specs = makeSpecs(kit);
  const S = ctx.scene.seal ?? {};
  const anchor = { x: S.at?.[0] ?? 0, y: S.at?.[1] ?? 0, z: S.at?.[2] ?? 0, yaw: S.yaw ?? 0 };
  const fwd = [Math.sin(anchor.yaw), Math.cos(anchor.yaw)], right = [Math.cos(anchor.yaw), -Math.sin(anchor.yaw)];
  const beats = ctx.scene.beats ?? [];
  const T = { ...C.T };
  for (const k of Object.keys(T)) { const b = beats.find((x) => x.name === k); if (b) T[k] = b.t; } // the direction's beat of the same name wins
  const GRIP_R = [0.27, 0.28, 0.25];

  // ---- one actor: rig (world position + facing) > tilt (lean about the feet, roll) > the kit's costumed seal
  const actors = [];
  function actor(name, spec, mark, o = {}) {
    const h = kit.costumedSeal(engine, { ...spec, scale: (spec.scale ?? 1) * STAGE.size });
    const rig = new THREE.Group(), tilt = new THREE.Group();
    rig.name = name; rig.add(tilt); tilt.add(h.group);
    const wx = anchor.x + right[0] * mark.r + fwd[0] * mark.f, wz = anchor.z + right[1] * mark.r + fwd[1] * mark.f;
    const toX = anchor.x - wx, toZ = anchor.z - wz, len = Math.hypot(toX, toZ) || 1;
    const a = { name, h, rig, tilt, base: [wx, anchor.y, wz], dir: [toX / len, toZ / len], fn: o.fn, props: {} };
    rig.rotation.y = o.face ?? Math.atan2(toX, toZ); // faces the throne unless told otherwise
    ctx.setLayer(rig, 1);
    group.add(rig);
    actors.push(a);
    return a;
  }
  const mount = (a, obj, pos, rot) => { obj.position.set(...pos); if (rot) obj.rotation.set(...rot); a.h.props.add(obj); ctx.setLayer(obj, 1); return obj; };

  // Aizen-seal: Kyoka Suigetsu held low in the right flipper (the tip is its own mesh so it can snap)
  const aizen = actor("aizen-seal", specs.aizen, STAGE.aizen, { face: anchor.yaw + 0.4, fn: (t) => C.aizen(t, T) });
  const kyoka = P.kyokaSuigetsu();
  aizen.props.blade = mount(aizen, kyoka.root, GRIP_R, [1.9, 0, 0]);
  aizen.props.kyoka = kyoka;

  // Ichigo-seal: Zangetsu cocked over the shoulder
  const ichigo = actor("ichigo-seal", specs.ichigo, STAGE.ichigo, { fn: (t) => C.ichigo(t, T) });
  ichigo.props.sword = mount(ichigo, P.zangetsu().root, GRIP_R, [0.2, 0, -0.55]);

  // Gin-seal: a short blade at the hip, hands in sleeves
  const gin = actor("gin-seal", specs.gin, STAGE.gin, { fn: (t) => C.gin(t, T) });
  mount(gin, P.hipBlade(0.34), [-0.3, 0.14, 0.05], [-1.35, 0, 0.15]);

  // Urahara-seal: striped bucket hat (tippable), geta, Benihime
  const urahara = actor("urahara-seal", specs.urahara, STAGE.urahara, { fn: (t) => C.urahara(t, T) });
  urahara.props.hat = mount(urahara, P.bucketHat(), [0, 0.62, 0.03], [0, 0, 0]);
  mount(urahara, P.geta(), [0, 0, 0]);
  urahara.props.cane = mount(urahara, P.cane(), GRIP_R, [-0.35, 0, 0]);

  // six extras: black shihakusho, white tied sash, 3-clump tufts (own seed each), sheathed katana
  for (let i = 0; i < 6; i++) {
    const m = STAGE.extras[i] ?? { r: i - 3, f: 4.5 };
    const spec = { ...specs.extra, name: `reaper-seal-${i}`, scale: 0.96 + 0.08 * C.util.hash(i + 3),
      hair: kit.defineHair("spiky", { count: 3, layers: 1, length: [0.1, 0.17], width: 0.09, lift: 0.8, seed: 20 + i, color: { base: "#080a0f", shade: "#000000", hi: "#f4f4f0" }, cut: { at: [0.34, 0.74], slant: 0.28, rate: 0.85 } }) };
    const a = actor(`reaper-seal-${i}`, spec, m, { fn: (t) => C.extra(i, t, T) });
    mount(a, P.hipBlade(0.4), [-0.3, 0.16, 0.0], [-1.4, 0, 0.2]);
  }

  // ---- the hero seal's forelock: one black clump on the brow (bible 4: optional, egg 5 at 6.4 s). Parented to the body; the pup is never edited.
  let lock = null;
  try {
    lock = kit.hairMesh(engine, kit.defineHair("forelock", {
      count: 0, layers: 1, seed: 2,
      fringe: { n: 1, length: 0.13, width: 0.05, at: [0.03, 0.77, 0.21], sweep: [0.12, -0.9, 0.45] },
      color: { base: "#080a0f", shade: "#000000", hi: "#080a0f" },
    }), { pos: [0, 0.555, 0.03], fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 });
    ctx.seal.attach(lock, 1);
    lock.visible = false;
  } catch (e) { console.warn("[cast pr-xnnpack-10801] forelock skipped:", e); lock = null; }
  const ownHeroPoses = !(ctx.scene.seal?.track?.length); // the direction's track wins when it has one

  function update(t) {
    // ---- victims and extras
    for (const a of actors) {
      const s = a.fn(t);
      a.rig.visible = s.vis;
      if (!s.vis) continue;
      // offset: o[0] across the line to the throne, o[1] up, o[2] AWAY from the throne (along -dir)
      a.rig.position.set(a.base[0] - a.dir[1] * s.off[0] - a.dir[0] * s.off[2], a.base[1] + s.off[1], a.base[2] + a.dir[0] * s.off[0] - a.dir[1] * s.off[2]);
      a.tilt.rotation.set(s.lean, 0, s.roll);
      const h = a.h;
      h.state.poses = {};
      for (const [n, k] of Object.entries(s.poses)) if (k > 1e-3) h.setPose(n, Math.min(1, k));
      h.expression(s.expr[0], s.expr[1]);
      h.update(t);
      applyProps(a, s);
    }
    // ---- the hero: the forelock, and (only without a direction track) the bible's pose beats
    if (lock) lock.visible = t >= 2.9 && t < T.break;
    if (ownHeroPoses && typeof ctx.seal.apply === "function") {
      for (const [n, k] of Object.entries(C.heroPoses(t, T))) ctx.seal.setPose(n, k);
      ctx.seal.apply(t);
    }
  }

  // prop pitches from the state: blade held low / lifted, the tip snapping, the cleaver's arc, Urahara's hat and cane
  function applyProps(a, s) {
    const p = s.prop;
    if (a.props.blade && p.blade) {
      a.props.blade.rotation.x = p.blade.rx;
      // the tip stays on the blade until the snap, then flies off the blade end for 14 frames and falls with the shards.
      // blade pitched by th about x: world-down = (0, -cos th, sin th) in blade-local axes (+y along the blade).
      const k = a.props.kyoka, age = p.snapAge;
      if (age >= 0) {
        const th = p.blade.rx, G = 9, T14 = 14 / 24, e = Math.min(age, 3);
        const spin = 9 * Math.min(age, T14) + 4 * Math.max(0, age - T14);
        k.tip.position.set(k.tipHome.x + 0.32 * e, k.tipHome.y + 0.14 * e - 0.5 * G * e * e * Math.cos(th), k.tipHome.z + 0.2 * e + 0.5 * G * e * e * Math.sin(th));
        k.tip.rotation.set(spin * 0.6, spin * 0.3, spin);
      } else { k.tip.position.copy(k.tipHome); k.tip.rotation.set(0, 0, 0); }
    }
    if (a.props.sword && p.sword) a.props.sword.rotation.set(p.sword.rx, 0, p.sword.rz ?? 0);
    if (a.props.hat && p.hat) { a.props.hat.rotation.x = p.hat.rx; a.props.hat.position.y = 0.62 + p.hat.lift; }
    if (a.props.cane && p.cane) a.props.cane.rotation.x = -p.cane.rx;
  }

  update(0);
  return {
    group,
    update(t) { update(t); },
    dispose() {
      for (const a of actors) a.h.dispose?.();
      lock?.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    },
  };
}
