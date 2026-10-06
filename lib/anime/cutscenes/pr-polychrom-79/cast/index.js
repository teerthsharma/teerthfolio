// CAST layer for pr-polychrom-79 (Fate/Zero, Gilgamesh: Gate of Babylon). Layer 1, redrawn every step.
// The hero seal (locked, ctx.seal) is Gilgamesh: gold armour, red cloak card, 7 gold clumps, red eye decal, Key of the Heavens, Ea.
// Victims are SMALL SEALS in the opponents' costumes (costumed-seal-kit): Saber, Lancer, Rider, Berserker + 10 mongrels (6 kneel).
// Cue names (the direction layer should emit these; every one has the bible time as a fallback, so a missing cue still plays):
//   gate 2.3   kneel 3.0 (Kneel, mongrels)   key 7.2 (dur 1.0)   volley 8.3   ea 14.0 (dur 1.5)   enuma 21.2   shatter 23.0
// Maths, all pure functions of the stepped clock ts (scrub == play):
//   start(name, fb)  = cue.t - cue.since(name) when the beat has fired, else the bible time fb
//   ramp(x, a, b)    = smoothstep over [a, b];  tv = ts - start("volley") is the volley clock, fr = tv * 24 frames
//   ground pos       = seal.at + R_yaw(seal) * (sin az, cos az) * r * seal.scale, victims face the seal; slide = outward * metres
//   Ea spin          = integral of turns/s, w(u) = 3 + 9 smooth(u) turns/s over u = (t - t_ea)/(t_enuma - t_ea);
//                      int smooth = u^3 - u^4/2, so turns = span * (3u + 9 (u^3 - u^4/2)); past the blast it holds 12 turns/s
//   hilt i vanishes at 14.0 + i * 0.45 s (16 hilts fill 14.0 to 21.2)
import { cloth, buildKey, buildEa, starFlare, airWave, hilt } from "./props.js";
import { GILGAMESH, SABER, LANCER, RIDER, BERSERKER, mongrel } from "./costumes.js";
import { PUP_HEAD2 } from "../../../pup.js";

const TAU = Math.PI * 2, F = 24;
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const ramp = (x, a, b) => sm((x - a) / (b - a));

export default function build(ctx) {
  const { THREE, engine, seal, kit } = ctx, rnd = ctx.rng("cast-polychrom");
  const group = new THREE.Group();

  // ---------------------------------------------------------------- hero: Gilgamesh, riding the locked body (never restyled)
  const heroParts = new THREE.Group(); heroParts.name = "gilgamesh-costume";
  const armour = cloth(ctx, [GILGAMESH.armour]);   // collar, pauldrons, breastplate, tassets: hammered gold, lit edge from trim
  const cloak = cloth(ctx, [GILGAMESH.cloak]);     // red cloak card: 2 tones, flares on twos
  const cloakPivot = new THREE.Group(); cloakPivot.position.set(0, 0.5, -0.1); cloak.position.set(0, -0.5, 0.1); cloakPivot.add(cloak);
  // Easter egg: a tiny linked DNA ring pair on the cloak hem (polychrom link flip), brightens at 14.0
  const rings = new THREE.Group(), rg = new THREE.TorusGeometry(0.04, 0.009, 8, 20);
  const r1 = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: "#ffe27a", toneMapped: false }));
  const r2 = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: "#ffd890", toneMapped: false }));
  r2.rotation.y = Math.PI / 2; r2.position.x = 0.04;
  rings.add(r1, r2); rings.position.set(-0.02, 0.05, -0.59); rings.rotation.x = 0.2; cloak.add(rings);
  rings.traverse((o) => o.layers.set(1));
  const heroHair = kit.hairMesh(engine, GILGAMESH.hair, { pos: PUP_HEAD2.pos, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 }, {});
  const heroEyes = kit.eyePair({ c: PUP_HEAD2.pos, r: [0.27, 0.245, 0.255] }, GILGAMESH.eyes);
  heroParts.add(armour, cloakPivot, heroHair, heroEyes);
  seal.attach(heroParts, 1);

  // Key of the Heavens (shot 4): rises into the flipper and turns 24 frames
  const key = buildKey(ctx); key.scale.setScalar(1.7); key.visible = false; seal.attach(key, 1);
  // Ea (shots 6/7): drawn from behind, levelled, segments spin 3 -> 12 turns/s
  const ea = buildEa(ctx); ea.group.visible = false; ea.group.scale.setScalar(1.15); seal.attach(ea.group, 1);
  const eaGlint = starFlare(ctx, "#ff4a5a", 0.5); eaGlint.visible = false; ea.group.add(eaGlint); eaGlint.position.set(0, 1.0, 0.06);

  // ---------------------------------------------------------------- victims
  const victims = [];
  const make = (spec, o) => {
    const v = kit.costumedSeal(engine, spec);
    group.add(v.group);
    const rec = { v, ...o, delay: o.delay ?? 0 };
    victims.push(rec);
    return rec;
  };
  const saber = make(SABER, { az: 1.0, r: 6.4, kind: "saber" });
  const lancer = make(LANCER, { az: -1.15, r: 6.0, kind: "lancer" });
  const rider = make(RIDER, { az: 1.65, r: 5.6, kind: "rider" });
  const bers = make(BERSERKER, { az: -1.75, r: 5.4, kind: "berserker" });
  // 10 mongrels along the rim: 6 kneel, 4 dive in the volley; behind the servants, off the lens lines
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    make(mongrel(i, rnd), { az: side * (1.95 + row * 0.2 + rnd() * 0.1), r: 4.4 + row * 0.5 + rnd() * 0.4, kind: i < 6 ? "kneeler" : "diver", delay: i * 0.05 });
  }
  // Saber's invisible air and the deflect spark; Rider's cape is its own tearable piece
  const air = airWave(ctx); air.position.set(0.27, 0.62, 0.27); air.rotation.z = -0.25; saber.v.props.add(air);
  const spark = starFlare(ctx, "#fff2c0", 0.5); spark.visible = false; group.add(spark);
  const cape = cloth(ctx, [{ type: "cape", col: "#c82040", shade: "#7a0c20", trim: "#ffe27a" }]);
  rider.v.body.add(cape);
  const cape0 = { loose: false, t0: 0 };
  // Lancer's spear (Gae Bolg) is the last prop; Berserker's horns sit on the helm
  const spear = lancer.v.props.children[lancer.v.props.children.length - 1];
  const horns = kit.HATS.horns(engine, { col: "#2a2430", shade: "#07060a" });
  horns.position.y = 0.09; horns.traverse((o) => o.layers.set(1)); bers.v.props.add(horns);

  // Easter egg: sixteen blade hilts on the plateau rim, vanishing one by one (mismatched frees 16 to 0)
  const hilts = [];
  for (let i = 0; i < 16; i++) { const h = hilt(ctx); h.traverse((o) => o.layers.set(1)); group.add(h); hilts.push(h); }

  // ---------------------------------------------------------------- per-frame
  const sealXZ = (az, r) => {
    const s = seal.scale, lx = Math.sin(az) * r * s, lz = Math.cos(az) * r * s, c = Math.cos(seal.yaw), sn = Math.sin(seal.yaw);
    return [seal.at[0] + lx * c + lz * sn, seal.at[2] - lx * sn + lz * c];
  };

  function update(t, dt, cue) {
    const start = (n, fb) => { const s = cue.since(n); return Number.isFinite(s) ? cue.t - s : fb; };
    const tGate = start("gate", 2.3), tKneel = start("kneel", 3.0), tKey = start("key", 7.2), tVol = start("volley", 8.3);
    const tEa = start("ea", 14.0), tEnuma = start("enuma", 21.2), tShat = start("shatter", 23.0);
    const tv = t - tVol, fr = tv * F;

    // ---- hero: half-lidded smirk, eyes sharpen on Ea, calm at the credit; cloak flares on twos
    const rage = ramp(t, tEa + 0.4, tEa + 1.4) * (1 - ramp(t, tShat, tShat + 0.6));
    if (rage > 0.01) heroEyes.userData.set("rage", rage); else heroEyes.userData.set(t > tShat ? "calm" : "smug", 0.9);
    const flare = 0.1 + 0.18 * ramp(t, tVol, tVol + 0.4) + 0.12 * ramp(t, tEa, tEnuma);
    cloakPivot.rotation.x = flare + 0.05 * Math.sin(t * 6.3) + 0.02 * Math.sin(t * 15);
    cloakPivot.scale.set(1 + 0.04 * Math.sin(t * 9), 1, 1 + flare * 0.5);
    const ringP = ramp(t, tEa, tEa + 0.6) * (1 - ramp(t, tEa + 1.2, tEa + 2.2));
    rings.scale.setScalar(1 + 0.6 * ringP); r1.material.color.set(ringP > 0.5 ? "#fff2c0" : "#ffe27a"); r2.rotation.x = t * 1.2;

    // ---- Key of the Heavens: rises into the flipper and turns over 24 frames; spent at the volley
    const kk = ramp(t, tKey, tKey + 1.0);
    key.visible = t >= tKey - 0.05 && t < tVol + 0.5;
    key.position.set(0.3, 0.28 + 0.5 * kk, 0.3);
    key.rotation.set(0, TAU * kk, 0.15 * (1 - kk));
    const gl = key.userData.glint;
    gl.scale.setScalar(0.5 + 0.8 * Math.abs(Math.sin(kk * TAU + 0.4))); gl.rotation.z = t * 2; gl.userData.mat.opacity = 0.4 + 0.5 * kk;

    // ---- Ea: drawn from behind (blade up) to levelled (blade forward) by tEa + 1.5, held to the blast, gone after the shatter
    const draw = ramp(t, tEa, tEa + 1.5);
    ea.group.visible = t >= tEa && t < tShat;
    ea.group.position.set(0.3, 0.3 + 0.1 * (1 - draw), 0.22 + 0.1 * draw);
    ea.group.rotation.set(-0.5 * (1 - draw) + (Math.PI / 2 - 0.08) * draw, 0.1 * (1 - draw), 0);
    const span = Math.max(0.01, tEnuma - tEa), u = Math.min(1, Math.max(0, (t - tEa) / span));
    const turns = u < 1 ? span * (3 * u + 9 * (u * u * u - (u * u * u * u) / 2)) : span * 7.5 + 12 * (t - tEnuma);
    ea.setSpin(Math.max(0, turns) * TAU);
    eaGlint.visible = ea.group.visible; eaGlint.rotation.z = t * 3; eaGlint.scale.setScalar(0.6 + 0.6 * ramp(t, tEa + 1, tEnuma));

    // ---- victims
    const show = t < tShat; // space shatters at 23.0: victims gone, the seal alone on the island
    spark.visible = false;
    for (const rec of victims) {
      const { v } = rec;
      v.group.visible = show;
      if (!show) continue;
      let slide = 0, lift = 0;
      const enumaK = ramp(t, tEnuma, tEnuma + 0.7);
      switch (rec.kind) {
        case "kneeler": { // 'Kneel, mongrels': kneel, forehead to the stone, eyes shut, frames 0-12
          const kk2 = ramp(t - rec.delay, tKneel, tKneel + 0.5);
          v.setPose("terror", 0.25 * (1 - kk2));
          v.setPose("kneel", kk2); v.setPose("bow", 0.85 * kk2);
          v.expression(kk2 > 0.3 ? "shut" : "neutral", Math.max(kk2, 0.01));
          if (t > tVol) v.setPose("cower", 0.6 * ramp(t - rec.delay, tVol + 0.2, tVol + 0.8));
          if (enumaK > 0) { v.react("fallen", enumaK); slide = 1.2 * enumaK; }
          break;
        }
        case "diver": { // dive for cover as the volley lands
          const kk2 = ramp(t, tVol + rec.delay, tVol + rec.delay + 0.5);
          v.setPose("terror", t < tVol ? 0.3 : 0);
          if (kk2 > 0) { v.react("cower", kk2); lift = 0.18 * Math.sin(Math.PI * kk2); slide = kk2; } else v.expression("terror", 0.5);
          if (enumaK > 0) { v.react("blown", enumaK); slide = 2.5 * enumaK; }
          break;
        }
        case "saber": { // guard 0-6, deflect with spark 6-12, slide back 2 m 12-24
          v.react("recoil", fr < 0 ? 0.15 : fr < 6 ? 0.35 : fr < 12 ? 0.55 : 0.7);
          v.expression("rage", 0.8);
          slide = 2 * ramp(fr, 12, 24);
          if (fr >= 6 && fr < 14) { spark.visible = true; spark.scale.setScalar(0.6 + 0.9 * Math.sin((Math.PI * (fr - 6)) / 8)); }
          air.material.opacity = 0.35 + 0.25 * Math.sin(t * 17);
          if (enumaK > 0) { v.react("blown", enumaK); slide += 2 * enumaK; }
          break;
        }
        case "lancer": { // spear spin deflects once at frame 4, then he leaps back
          if (spear) spear.rotation.z = -0.25 + (fr > -2 && fr < 10 ? tv * 38 : 0);
          const leap = ramp(fr, 8, 20);
          v.react(leap > 0 ? "recoil" : "stand", leap > 0 ? 0.5 : 0);
          v.expression(fr < 8 ? "smug" : "terror", fr < 8 ? 0.9 : 0.6 * leap);
          lift = 0.7 * Math.sin(Math.PI * leap); slide = 2.2 * leap;
          if (fr >= 4 && fr < 9) { spark.visible = true; spark.scale.setScalar(0.5); }
          if (enumaK > 0) { v.react("blown", enumaK); slide += 2 * enumaK; }
          break;
        }
        case "rider": { // arms crossed then braced; laugh turning grim; cape rips frame 8; blown back 2 m
          if (fr < 8) { v.react("stand", 0); v.setPose("salute", 1); v.expression("smug", fr < 0 ? 0.9 : 1 - fr / 8); } else { v.react("blown", ramp(fr, 8, 26)); slide = 2 * ramp(fr, 8, 26); }
          if (fr >= 8 && !cape0.loose) { cape0.loose = true; cape0.t0 = t; }
          if (fr < 8 && cape0.loose) { cape0.loose = false; cape.position.set(0, 0, 0); cape.rotation.set(0, 0, 0); cape.scale.setScalar(1); }
          if (cape0.loose) { // the rip: the cape peels back, tumbles and shrinks away
            const c = t - cape0.t0;
            cape.position.set(0.2 * c, 0.15 + 0.6 * c - 0.9 * c * c, -1.4 * c);
            cape.rotation.set(2.2 * c, 1.4 * c, 3 * c); cape.scale.setScalar(Math.max(0.001, 1 - ramp(c, 0.8, 1.6)));
          }
          if (enumaK > 0) { v.react("blown", Math.max(ramp(fr, 8, 26), enumaK)); slide += 1.5 * enumaK; }
          break;
        }
        case "berserker": { // hunched, glow eyes; staggers from the volley, falls on frame 14
          if (fr < 0) { v.react("stand", 0); v.setPose("cower", 0.3); v.expression("rage", 1); }
          else if (fr < 14) { v.react("stand", 0); v.setPose("stagger", ramp(fr, 0, 6)); v.setPose("cower", 0.3 * (1 - ramp(fr, 0, 6))); v.expression("rage", 1); slide = 0.6 * ramp(fr, 0, 14); } else { v.react("fallen", ramp(fr, 14, 20)); slide = 0.6 + 0.5 * ramp(fr, 14, 20); }
          if (enumaK > 0) slide += 1.5 * enumaK;
          break;
        }
        default: break;
      }
      const [px, pz] = sealXZ(rec.az, rec.r);
      const dx = px - seal.at[0], dz = pz - seal.at[2], d = Math.hypot(dx, dz) || 1, s = seal.scale;
      v.place(px + (dx / d) * slide * s, lift * s, pz + (dz / d) * slide * s);
      v.lookAtPoint(seal.at[0], seal.at[2]);
      if (spark.visible && (rec.kind === "saber" || rec.kind === "lancer")) spark.position.set(px - (dx / d) * 0.6 * s, 0.5 * s, pz - (dz / d) * 0.6 * s);
      v.update(t, dt);
    }
    spark.rotation.z = t * 5;

    // ---- sixteen hilts on the plateau rim: rise with the gate, vanish one by one 14.0 -> 21.2
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, [hx, hz] = sealXZ(a, 8.2), h = hilts[i];
      const on = ramp(t, tGate + i * 0.04, tGate + i * 0.04 + 0.4) * (1 - ramp(t, tEa + i * 0.45, tEa + i * 0.45 + 0.35));
      h.visible = on > 0.01 && show;
      h.position.set(hx, 0, hz); h.rotation.set(0.12 * Math.cos(a * 3), a, 0.1 * Math.sin(a * 2)); h.scale.setScalar(Math.max(0.001, on) * seal.scale * 1.3);
    }
  }

  function dispose() {
    for (const rec of victims) rec.v.dispose();
    for (const o of [heroParts, key, ea.group, spark, cape, air]) o?.traverse?.((x) => { x.geometry?.dispose?.(); x.material?.dispose?.(); });
    heroEyes.userData.dispose?.();
    heroParts.parent?.remove(heroParts);
  }
  return { group, update, dispose };
}
