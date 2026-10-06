// CAST layer for pr-nemo-relay-481 (Dragon Ball Super, Ultra Instinct at the Tournament of Power). Layer 1.
// Owner law L6b: every figure but the hero is a small costumed SEAL (costumed-seal-kit), never a cutout.
//   hero    : the locked pup (ctx.seal). Rides on its body: obi decal, silver tuft (the "Sign" flicker at 7.0 s, full at ignition),
//             silver eye decal (awe at ignition, SHUT through the dodges, gone when the form ends).
//   Whis    : pale-blue seal, maroon robe, cyan sash, white spire, turning halo, staff with a swirl orb; taps at the spend.
//   Beerus  : lilac seal, cat ears with the gold stud, white-edged black chest piece, gold collar, sways; ears twitch at ignition;
//             pudding cup beside him on the ledge (easter egg).
//   Jiren   : grey seal, red eyes, red/white tunic, crossed arms; throws 4 volleys (8 frames), one sweat bead, blown back 3 m at the spend.
//   Troopers: 4 red-armour seals, white helmets, visors, batons; braced, thrown tumbling over 6 frames at the break.
// Formation is in the hero seal's local frame (x right, y up, z forward), fixed at build, BEHIND the hero so no camera of the
// law (front arc, kill, wide) puts a figure between lens and seal.
// Everything is a pure function of the clock (t, cue.since), so scrubbing equals playing.
// Cue names read (any alias works; constants are the bible times when no beat exists):
//   ignite|ignition|ui (7.5 s)   throw|orb|orbs|volley (8.1 s, volleys every 1.35 s)   spend|break|crumble|stage-break|collapse (13.5 s)
import { HERO, WHIS, BEERUS, JIREN, TROOPER, LEDGE } from "./costumes.js";

const T = { sign: 7.0, ignite: 7.5, throw: 8.1, spend: 13.5 };
const ALIAS = {
  ignite: ["ignite", "ignition", "ui", "silver"], throw: ["throw", "orb", "orbs", "volley"],
  spend: ["spend", "break", "crumble", "stage-break", "collapse"],
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };

export default function build(ctx) {
  const { THREE, engine, kit, sdf, seal } = ctx;
  const { Group, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, BoxGeometry, Vector3 } = THREE;
  const group = new Group();
  const disposables = [], handles = [];
  const sceneSeal = ctx.scene.seal ?? {};
  const base = { at: [...(seal?.at ?? sceneSeal.at ?? [0, 0, 0])], yaw: seal?.yaw ?? sceneSeal.yaw ?? 0, scale: seal?.scale ?? sceneSeal.scale ?? 1 };
  const sy = Math.sin(base.yaw), cy = Math.cos(base.yaw);
  // seal-local (x right, y up, z forward) -> world
  const W = (x, y, z) => new Vector3(base.at[0] + (x * cy + z * sy) * base.scale, base.at[1] + y * base.scale, base.at[2] + (-x * sy + z * cy) * base.scale);
  const faceSeal = (p) => Math.atan2(base.at[0] - p.x, base.at[2] - p.z);
  const startOf = (cue, key) => {
    for (const n of ALIAS[key]) { const s = cue.since?.(n); if (Number.isFinite(s)) return cue.t - s; }
    return T[key];
  };

  // rigid prop painter: the same recipe the kit uses for hats and weapons (cel fill + ink hull)
  const prop = (geo, col, shade, o = {}) => {
    const f = engine.figure(sdf.painted(geo, sdf.paint(col, shade, { line: 1 })), { lineMul: o.lineMul ?? 0.9, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    disposables.push(geo);
    return f;
  };
  const addTo = (parent, obj) => { parent.add(obj); ctx.setLayer(obj, 1); return obj; };

  // ------------------------------------------------------------------ the hero: obi, silver tuft, silver eyes
  const heroBits = new Group();
  const obiG = new Group();
  obiG.add(prop(new TorusGeometry(0.345, 0.034, 8, 40).rotateX(Math.PI / 2).scale(1.06, 1, 0.95), HERO.obi.col, HERO.obi.shade, { pos: [0, 0.19, 0] }));
  for (const s of [1, -1]) obiG.add(prop(new BoxGeometry(0.05, 0.14, 0.012), HERO.obi.tail, HERO.obi.tailShade, { pos: [0.1 + s * 0.035, 0.11, 0.335], rot: [0.1, 0, s * 0.18] }));
  heroBits.add(obiG);
  const headFrame = { pos: [0, 0.555, 0.03], fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 };
  const tuft = kit.hairMesh(engine, HERO.tuft, headFrame);
  tuft.visible = false;
  heroBits.add(tuft);
  const heroEyes = kit.eyePair({ c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] }, HERO.eyes);
  heroEyes.visible = false;
  heroBits.add(heroEyes);
  seal.attach(heroBits, 1);
  disposables.push({ dispose: () => heroEyes.userData.dispose?.() });

  // ------------------------------------------------------------------ the ledge (cast-owned slab under the gods)
  const ledge = new Group();
  ledge.add(prop(new BoxGeometry(3.0, 0.9, 1.7), LEDGE.top, LEDGE.side, { pos: [0, 0.45, 0], lineMul: 1.4 }),
    prop(new BoxGeometry(3.08, 0.08, 1.78), LEDGE.edge, LEDGE.edge, { pos: [0, 0.9, 0], lineMul: 1 }));
  const ledgeAt = W(-6.2, 0, -3.4);
  ledge.position.copy(ledgeAt); ledge.rotation.y = faceSeal(ledgeAt) + Math.PI * 0.08;
  addTo(group, ledge);
  const LY = 0.9; // ledge top

  // ------------------------------------------------------------------ costumed-seal factory
  const mk = (spec) => { const h = kit.costumedSeal(engine, spec); handles.push(h); group.add(h.group); return h; };

  // ---- Whis
  const whis = mk({ ...WHIS });
  addTo(whis.body, prop(new ConeGeometry(0.07, 0.34, 10), WHIS.spire.col, WHIS.spire.shade, { pos: [0, 0.9, 0.0], rot: [-0.05, 0, 0] })); // the 1 tall clump
  const halo = new Group(); // vertical ring behind the head, six beads so the turn reads
  halo.position.set(0, 0.66, -0.2);
  halo.add(prop(new TorusGeometry(0.31, 0.016, 8, 40), WHIS.halo.col, WHIS.halo.shade, { lineMul: 0.6 }));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; halo.add(prop(new SphereGeometry(0.03, 8, 6), WHIS.halo.col, WHIS.halo.shade, { pos: [Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0], lineMul: 0.5 })); }
  addTo(whis.body, halo);
  const staffG = whis.props.children[whis.props.children.length - 1]; // the weapon is the only prop
  const swirl = prop(new TorusGeometry(0.026, 0.006, 6, 18), "#7ad0f0", "#38a0d0", { pos: [0, 0.95, 0], lineMul: 0.3 }); // miniature swirl in the orb (egg 2)
  const swirl2 = prop(new TorusGeometry(0.026, 0.006, 6, 18), "#e8ecf8", "#9aa0c8", { pos: [0, 0.95, 0], rot: [Math.PI / 2, 0, 0], lineMul: 0.3 });
  staffG.add(swirl, swirl2);
  const staffY0 = staffG.position.y;

  // ---- Beerus
  const beerus = mk({ ...BEERUS });
  const ears = [];
  for (const s of [1, -1]) {
    const e = new Group();
    e.position.set(s * 0.15, 0.74, -0.02);
    e.rotation.z = -s * 0.28;
    e.add(prop(new ConeGeometry(0.1, 0.34, 12), BEERUS.ear.col, BEERUS.ear.shade, { pos: [0, 0.15, 0] }));
    e.add(prop(new SphereGeometry(0.026, 10, 8), BEERUS.stud, "#b08818", { pos: [s * 0.01, 0.02, 0.07], lineMul: 0.6 })); // the gold stud
    addTo(beerus.body, e); ears.push([e, s]);
  }
  for (const s of [1, -1]) addTo(beerus.body, prop(new TorusGeometry(0.052, 0.014, 6, 14), BEERUS.armlet, "#9a7818", { pos: [s * 0.3, 0.32, 0.1], rot: [0.3, 0, s * 1.1], lineMul: 0.6 })); // gold armlets
  const pud = new Group(); // pudding cup on the ledge beside Beerus (egg 1)
  pud.add(prop(new CylinderGeometry(0.07, 0.055, 0.1, 14), BEERUS.pudding.cup, "#c0c0c8", { pos: [0, 0.05, 0] }));
  pud.add(prop(new CylinderGeometry(0.066, 0.066, 0.05, 14), BEERUS.pudding.body, "#c09848", { pos: [0, 0.125, 0] }));
  pud.add(prop(new SphereGeometry(0.05, 12, 8).scale(1, 0.4, 1), BEERUS.pudding.caramel, "#4a2010", { pos: [0, 0.158, 0] }));
  pud.add(prop(new SphereGeometry(0.02, 8, 6), BEERUS.pudding.cherry, "#7a1018", { pos: [0, 0.185, 0], lineMul: 0.5 }));
  addTo(group, pud);

  // ---- Jiren
  const jiren = mk({ ...JIREN });
  const armsG = new Group(); // arms crossed over the chest: two sleeve tubes, four white gloves
  for (const s of [1, -1]) {
    armsG.add(prop(new CylinderGeometry(0.05, 0.055, 0.36, 10).rotateZ(Math.PI / 2 + s * 0.22), JIREN.sleeve, "#7a1028", { pos: [0, 0.3 - s * 0.012, 0.335 + s * 0.012] }));
    armsG.add(prop(new SphereGeometry(0.062, 10, 8), JIREN.glove, "#bcbcc4", { pos: [-s * 0.17, 0.3 + s * 0.04, 0.35 + s * 0.012], lineMul: 0.7 }));
  }
  addTo(jiren.body, armsG);
  const bead = prop(new SphereGeometry(0.026, 10, 8).scale(0.8, 1.25, 0.8), JIREN.sweat, "#5aa8d8", { lineMul: 0.5 }); // the single sweat bead (egg 4)
  bead.visible = false; addTo(jiren.body, bead);

  // ---- Pride Troopers x4
  const FORM = [[-2.5, -6.4], [2.5, -6.4], [-4.4, -4.9], [4.4, -4.9]];
  const troopers = FORM.map((_, i) => {
    const h = mk({ ...TROOPER, name: `trooper-${i}` });
    addTo(h.body, prop(new SphereGeometry(0.13, 14, 10).scale(1.9, 0.55, 0.85), TROOPER.visor, "#08060c", { pos: [0, 0.575, 0.215], lineMul: 0.8 })); // visor only: no eyes
    return h;
  });

  // ------------------------------------------------------------------ placements (formation behind the hero)
  const spots = {
    jiren: W(0, 0, -5.2), whis: W(-6.6, LY, -3.8), beerus: W(-5.7, LY, -3.0),
    troopers: FORM.map(([x, z]) => W(x, 0, z)),
  };
  jiren.place(spots.jiren.x, 0, spots.jiren.z, faceSeal(spots.jiren));
  whis.place(spots.whis.x, spots.whis.y, spots.whis.z, faceSeal(spots.whis));
  beerus.place(spots.beerus.x, spots.beerus.y, spots.beerus.z, faceSeal(spots.beerus));
  pud.position.copy(W(-5.0, LY, -3.0)); // beside Beerus, on the slab
  troopers.forEach((h, i) => h.place(spots.troopers[i].x, 0, spots.troopers[i].z, faceSeal(spots.troopers[i])));
  for (const h of [jiren, whis, beerus, ...troopers]) h.group.rotation.order = "YXZ";
  // world positions for the FX layer (orb origin, shock source), refreshed every update
  ctx.cast = Object.assign(ctx.cast ?? {}, { jiren: spots.jiren.clone(), jirenHand: spots.jiren.clone(), whis: spots.whis.clone(), beerus: spots.beerus.clone(), troopers: spots.troopers.map((p) => p.clone()), ledge: ledgeAt.clone() });
  const away = (p) => { const d = new Vector3(p.x - base.at[0], 0, p.z - base.at[2]); return d.lengthSq() < 1e-6 ? d.set(0, 0, -1) : d.normalize(); };

  // ------------------------------------------------------------------ per step
  function update(t, dt, cue) {
    cue = cue ?? { t, since: () => Infinity };
    const tIgn = startOf(cue, "ignite"), tSign = Math.min(T.sign, tIgn - 0.5), tThr = startOf(cue, "throw"), tBrk = startOf(cue, "spend");
    const ts = t;

    // hero: Sign flicker on twos (grey before silver), full tuft at ignition, silver eyes awe -> SHUT -> gone when the form ends
    const sign = ts >= tSign && ts < tIgn, ign = ts >= tIgn && ts < tBrk + 1.6;
    tuft.visible = (sign && Math.floor(ts * 12) % 2 === 0) || ign;
    const tk = ign ? 0.6 + 0.4 * sm((ts - tIgn) / 0.25) : 0.6;
    const fade = ts > tBrk ? 1 - sm((ts - tBrk) / 1.6) : 1;
    tuft.scale.setScalar(Math.max(0.001, tk * fade));
    const eyesOn = ts >= tIgn && ts < tBrk + 1.2;
    heroEyes.visible = eyesOn;
    if (eyesOn) {
      if (ts < tIgn + 0.55) heroEyes.userData.set("awe", sm((ts - tIgn) / 0.12));      // silver eyes open at ignition
      else if (ts < tBrk) heroEyes.userData.set("shut", sm((ts - tIgn - 0.55) / 0.15)); // eyes shut for the dodges
      else heroEyes.userData.set("calm", sm((ts - tBrk) / 0.4));                        // the form runs out
    }

    // Whis: calm smile, watches the hero; staff taps at the spend (lift 0.3 s before, slam at frame 0, rebound tap +0.35 s)
    whis.expression("calm", 1).lookAtPoint(base.at[0], base.at[2]);
    const d = ts - tBrk;
    let lift = 0;
    if (d > -0.3 && d < 0) lift = sm((d + 0.3) / 0.3) * 0.12;
    else if (d >= 0 && d < 0.12) lift = 0.12 * (1 - d / 0.12);
    else if (d >= 0.35 && d < 0.6) lift = 0.04 * Math.sin(((d - 0.35) / 0.25) * Math.PI);
    staffG.position.y = staffY0 + lift;
    halo.rotation.z = ts * 1.6;
    swirl.rotation.set(ts * 3, ts * 2, 0); swirl2.rotation.set(Math.PI / 2 + ts * 2.4, 0, ts * 3);
    whis.group.position.y = spots.whis.y + 0.004 * Math.sin(ts * 1.7); // breath
    whis.update(ts, dt);

    // Beerus: haughty (smug), sways; ears twitch on ignition (damped, ~3 flicks)
    beerus.expression("smug", 1).lookAtPoint(base.at[0], base.at[2]);
    beerus.group.rotation.z = 0.045 * Math.sin(ts * 1.3);
    const e = ts - tIgn, tw = e >= 0 && e < 1.2 ? Math.exp(-e * 4) * Math.sin(e * 36) * 0.4 : 0;
    for (const [m, s] of ears) m.rotation.z = -s * 0.28 + s * tw;
    beerus.update(ts, dt);

    // Jiren: stern; arms crossed until the throws; 4 volleys (8 frames), each harder; one sweat bead; blown 3 m at the spend
    const J = jiren.group;
    J.position.set(spots.jiren.x, 0, spots.jiren.z); J.rotation.set(0, faceSeal(spots.jiren), 0);
    let lunge = 0, vol = 0;
    for (let i = 0; i < 4; i++) { const u = (ts - (tThr + i * 1.35)) / (8 / 24); if (u >= 0 && u < 1) { lunge = Math.sin(u * Math.PI); vol = i; } }
    const harder = 1 + 0.18 * vol;
    armsG.visible = lunge < 0.05;
    J.rotation.x = 0.4 * lunge * harder;
    const fw = new Vector3(Math.sin(J.rotation.y), 0, Math.cos(J.rotation.y));
    J.position.addScaledVector(fw, 0.22 * lunge * harder);
    if (ts > tBrk) {
      const k = sm((ts - tBrk) / 0.7);
      jiren.react("blown", k); // pose + terror expression
      J.position.addScaledVector(away(spots.jiren), 2.9 * k); // 3 m back along the line from the hero
    } else { jiren.react("stand", 0); jiren.expression("rage", 0.4 + 0.5 * lunge); } // stern, snarls on the throw
    const bk = ts - tThr; // bead: appears at the first throw, runs down the cheek on a 1.4 s loop
    bead.visible = bk >= 0 && ts < tBrk;
    if (bead.visible) { const u = (bk % 1.4) / 1.4; bead.position.set(0.2, 0.66 - 0.2 * u * u, 0.17); bead.scale.setScalar(Math.min(1, u * 6)); }
    jiren.update(ts, dt);

    // Troopers: braced flank (a small recoil each volley), thrown tumbling over 6 frames at the break
    troopers.forEach((h, i) => {
      const G = h.group, p = spots.troopers[i];
      G.position.set(p.x, 0, p.z); G.rotation.set(0, faceSeal(p), 0);
      if (ts > tBrk) {
        const k = sm((ts - tBrk) / 0.8), tum = clamp((ts - tBrk) / (6 / 24));
        h.react("blown", k);
        G.position.addScaledVector(away(p), 3.4 * k + 0.4 * i * k);
        G.rotation.x = -Math.PI * 2 * tum * (i % 2 ? 1 : -1); // the tumble, 6 frames
        G.position.y += 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.2));
      } else {
        const pulse = ts >= tThr ? 0.2 * Math.max(0, Math.sin(((ts - tThr) / 1.35) * Math.PI * 2 + i)) : 0; // braced against the orbs
        h.react(pulse > 0.01 ? "recoil" : "stand", pulse);
      }
      h.update(ts, dt);
    });

    // positions for the fx layer
    ctx.cast.jiren.copy(J.position);
    ctx.cast.jirenHand.set(J.position.x + fw.x * 0.3, 0.6, J.position.z + fw.z * 0.3);
    troopers.forEach((h, i) => ctx.cast.troopers[i].copy(h.group.position));
  }

  function dispose() {
    for (const h of handles) h.dispose();
    for (const g of disposables) g.dispose?.();
    group.traverse((o) => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); } });
    heroBits.parent?.remove(heroBits);
  }
  update(0, 0, null);
  return { group, update, dispose };
}
