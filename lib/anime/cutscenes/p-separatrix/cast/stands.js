// THE TWO STANDS, drawn as cel SDF figures (the engine's hero modeller, not boulders): King Crimson (pink-white, red X lattice, a small face on the
// brow) and Gold Experience Requiem (gold leaf, beetle-arrow brow, gem at the chest). Both are built ONCE from signed-distance primitives
// (round cones and ellipsoids blended by smooth-min k) and polygonised by surface nets at voxel h; the arms are separate meshes on shoulder pivots
// so they can swing on twos. Colour: lit/shadow pairs from the bible; the crimson edge glow and chromatic fringe are the FX layer's (stand-aura-edge).
// Every coordinate scales by k = H / 3.4 (the bible's 3.4 m GER at seal scale 1).
import { BoxGeometry, Group, SphereGeometry } from "three";
import { sm, win, lerp, T, sdfPart, figProp, occludes } from "./util.js";
import { MARK, CLK } from "./layout.js";

function humanoid(ctx, P) {
  const { cone, ell, paint } = ctx.sdf, k = P.H / 3.4;
  const body = paint(P.lit, P.shade, { line: 1.3 }), acc = paint(P.acc, P.accShade, { line: 1.2 }), dark = paint(P.ridge, P.ridge, { line: 1 });
  const v = (x, y, z) => [x * k, y * k, z * k];
  const prims = [];
  for (const s of [1, -1]) {
    prims.push(cone(v(s * 0.2, 1.55, 0), v(s * 0.23, 0.14, 0.03), 0.25 * k, 0.17 * k, body, 0.05 * k)); // leg: hip to ankle
    prims.push(ell(v(s * 0.23, 0.1, 0.15), v(0.19, 0.1, 0.3), acc, 0.03 * k));                           // boot
    prims.push(ell(v(s * 0.23, 0.36, 0.05), v(0.2, 0.06, 0.2), acc, 0.02 * k));                           // shin band
  }
  prims.push(ell(v(0, 1.62, 0), v(0.5, 0.3, 0.3), body, 0.06 * k));                       // hips
  prims.push(cone(v(0, 1.7, 0), v(0, 2.3, 0), 0.36 * k, 0.42 * k, body, 0.06 * k));       // waist
  prims.push(ell(v(0, 2.52, 0.02), v(0.64, 0.54, 0.4), body, 0.07 * k));                  // chest
  prims.push(cone(v(0, 2.85, 0), v(0, 3.0, 0.02), 0.2 * k, 0.17 * k, body, 0.04 * k));    // neck
  prims.push(ell(v(0, 3.14, 0.04), v(0.3, 0.34, 0.31), body, 0.05 * k));                  // head
  // muscle ridges (hatched in the anime): flat shade ellipsoids on the abs and the pectoral line
  for (let i = 0; i < 3; i++) for (const s of [1, -1]) prims.push(ell(v(s * 0.13, 1.85 + i * 0.17, 0.33 - i * 0.02), v(0.1, 0.045, 0.05), dark, 0.02 * k));
  for (const s of [1, -1]) prims.push(ell(v(s * 0.3, 2.42, 0.4), v(0.26, 0.05, 0.05), dark, 0.02 * k));
  if (P.build) prims.push(...P.build(ctx, { v, k }));
  const g = new Group();
  const h = Math.max(0.045, 0.055 * k);
  g.add(sdfPart(ctx, prims, h, { lineMul: 1.2 }));
  // arms hang from the shoulder pivot; rotation.x = theta swings them (theta = -pi/2 points the fist at +z)
  const arms = [];
  for (const s of [1, -1]) {
    const ap = [cone(v(0, 0, 0), v(s * 0.04, -0.82, 0.03), 0.2 * k, 0.17 * k, body, 0.05 * k), cone(v(s * 0.04, -0.82, 0.03), v(s * 0.02, -1.62, 0.07), 0.17 * k, 0.15 * k, body, 0.05 * k),
      ell(v(s * 0.02, -1.74, 0.09), v(0.2, 0.2, 0.2), P.fist ? acc : body, 0.04 * k), ell(v(s * 0.04, -0.82, 0.04), v(0.19, 0.08, 0.19), acc, 0.02 * k)];
    const pv = new Group();
    pv.position.set(...v(s * 0.86, 2.74, 0));
    pv.add(sdfPart(ctx, ap, h, { lineMul: 1.2 }));
    g.add(pv);
    arms.push(pv);
  }
  // eyes: the anime eye decal on the head ellipsoid (the same decal the seals use)
  const head = { c: v(0, 3.14, 0.04), r: v(0.3, 0.34, 0.31) };
  const eyes = ctx.kit.eyePair(head, { style: P.eyeStyle, iris: P.eye, irisLo: P.eyeLo, gap: 0.13 * k, y: head.c[1] + 0.02 * k, size: [0.2 * k, 0.17 * k], lift: 0.006 * k });
  g.add(eyes);
  g.rotation.order = "YXZ";
  return { group: g, arms, eyes, k };
}
const disposeAll = (S) => { S.group.traverse((o) => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); } }); S.eyes.userData.dispose?.(); };

// ------------------------------------------------------------------ Gold Experience Requiem
export function buildGER(ctx, F) {
  const P = {
    H: 3.4, lit: "#f8e08a", shade: "#b9803a", acc: "#f2bd45", accShade: "#6a3a10", ridge: "#b9803a", fist: true, eye: "#c84a7a", eyeLo: "#6a1a40", eyeStyle: "tsurime",
    build: (c, { v, k }) => {
      const { ell, cone, paint } = c.sdf, gem = paint("#ff80a0", "#b84a70", { line: 1.2 }), gold = paint("#fff0a0", "#f2bd45", { line: 0.8 }), brow = paint("#f2bd45", "#b9803a", { line: 1.2 });
      const o = [ell(v(0, 2.56, 0.45), v(0.1, 0.1, 0.07), gem, 0.015 * k)]; // the chest gem #ff80a0
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; o.push(ell(v(Math.sin(a) * 0.19, 2.56 + Math.cos(a) * 0.19, 0.44), v(0.026, 0.026, 0.026), gold, 0.005 * k)); } // punched-dot border
      o.push(cone(v(0, 3.38, 0.26), v(0, 3.95, 0.08), 0.1 * k, 0.03 * k, brow, 0.03 * k)); // the beetle-arrow brow
      for (const s of [1, -1]) o.push(ell(v(s * 0.13, 3.5, 0.22), v(0.1, 0.05, 0.06), brow, 0.015 * k)); // beetle wing cases
      return o;
    },
  };
  const S = humanoid(ctx, P), H = P.H;
  const sh = ctx.kit.groundShadow(1.7, 1.1, "#5a1a8c", 0.45); sh.position.y = 0.004; S.group.add(sh);
  S.update = (t, cue) => {
    const tR0 = T(cue, "gerRise", CLK.gerRise[0]), tS0 = T(cue, "gerStep", CLK.gerStep[0]), tB0 = T(cue, "barrage", CLK.barrage[0]), tLb = T(cue, "lastBlow", CLK.lastBlow), tC = T(cue, "claim", CLK.claim);
    const rise = sm(tR0, tR0 + (CLK.gerRise[1] - CLK.gerRise[0]), t), step = sm(tS0, tS0 + (CLK.gerStep[1] - CLK.gerStep[0]), t);
    const bar = win(t, tB0 - 0.15, tLb + 0.6, 0.15, 0.4), last = sm(tLb - 0.05, tLb + 0.05, t) * (1 - sm(tLb + 0.35, tLb + 1.0, t));
    // rises from the slit (y from -H to 0), steps forward 7.4-8.0, lunges toward Diavolo during the barrage
    const x = lerp(lerp(MARK.ger[0], MARK.gerStep[0], step), MARK.gerLunge[0], bar), z = lerp(lerp(MARK.ger[2], MARK.gerStep[2], step), MARK.gerLunge[2], bar);
    const walk = step > 0 && step < 1 ? 0.06 * Math.abs(Math.sin((t - tS0) * 7)) : 0; // footfall bob (t is stepped: twos)
    const [wx, wy, wz] = F.w(x, -H * (1 - rise) + walk, z);
    S.group.position.set(wx, wy, wz);
    S.group.rotation.set(0.18 * bar, F.yaw, 0);
    S.group.scale.setScalar(F.s);
    S.group.visible = t >= tR0 - 0.02 && t < CLK.collapse[1] && 1 - sm(T(cue, "collapse", CLK.collapse[0]), CLK.collapse[1], t) > 0.02;
    // barrage: arms alternate R, L every `per` s (six intervals, seven punches, the seventh with both fists at 11.85)
    const per = (tLb - tB0) / 6, bi = Math.floor((t - tB0) / per), u = (((t - tB0) / per) % 1 + 1) % 1;
    const ext = (a) => Math.sin(Math.PI * Math.min(1, Math.max(0, a))) ** 0.7; // fast out, fast back
    const guard = rise > 0.95 ? -0.35 : 0.1, idle = 0.12 + 0.03 * Math.sin(t * 2.6);
    for (let i = 0; i < 2; i++) {
      const inBar = t >= tB0 && t <= tLb + 0.35;
      const punch = inBar ? (bi >= 6 ? ext((t - (tLb - per * 0.6)) / (per * 1.6)) : bi % 2 === i ? ext(u) : 0) : 0;
      S.arms[i].rotation.x = lerp(idle + guard * (1 - bar), -Math.PI / 2 - 0.08, Math.max(punch, last * 0.8));
      S.arms[i].rotation.z = (i ? 1 : -1) * 0.12 * (1 - punch);
    }
    // after the claim: the hero pose, one fist raised, the other flared out
    const hero = sm(tC, tC + 0.5, t);
    if (hero > 0 && bar < 0.01) { S.arms[0].rotation.x = lerp(S.arms[0].rotation.x, -2.6, hero); S.arms[0].rotation.z = lerp(S.arms[0].rotation.z, -0.35, hero); S.arms[1].rotation.z = lerp(S.arms[1].rotation.z, 0.55, hero); }
    S.eyes.userData.set("rage", Math.max(0.6, bar));
  };
  S.occ = (eye, tgt) => S.group.visible && occludes(eye, tgt, S.group.position.toArray(), H * F.s * 0.95, 0.55 * F.s);
  S.dispose = () => disposeAll(S);
  return S;
}

// ------------------------------------------------------------------ King Crimson
export function buildKC(ctx, F) {
  const P = {
    H: 3.9, lit: "#e8d8f0", shade: "#8a6aa8", acc: "#c02a4a", accShade: "#601020", ridge: "#c02a4a", fist: false, eye: "#4fd08a", eyeLo: "#1f7a5a", eyeStyle: "slit",
    build: (c, { v, k }) => {
      const { ell, paint } = c.sdf, red = paint("#c02a4a", "#601020", { line: 1 }), o = [];
      for (const s of [1, -1]) o.push(ell(v(s * 0.6, 2.8, 0), v(0.3, 0.2, 0.3), red, 0.02 * k)); // shoulder bands
      return o;
    },
  };
  const S = humanoid(ctx, P), H = P.H, k = S.k;
  // the red X lattice over the torso (crossed thin bars at the abdomen, waist and chest) and the small face on the brow
  const bar = new BoxGeometry(0.06 * k, 0.62 * k, 0.02 * k);
  for (const y of [1.84, 2.26, 2.68]) for (const sg of [1, -1]) S.group.add(figProp(ctx, bar.clone(), "#c02a4a", "#601020", { pos: [0, y * k, (y > 2.5 ? 0.41 : y > 2.1 ? 0.37 : 0.33) * k], rot: [0, 0, sg * 0.62], lineMul: 0.5 }));
  S.group.add(figProp(ctx, new SphereGeometry(0.11 * k, 14, 10).scale(1, 1.15, 0.45), "#d070b0", "#8a3a78", { pos: [0, 3.48 * k, 0.27 * k], lineMul: 0.6 }));
  for (const s of [1, -1]) S.group.add(figProp(ctx, new SphereGeometry(0.018 * k, 8, 6), "#1a1020", "#1a1020", { pos: [s * 0.04 * k, 3.5 * k, 0.305 * k], line: 0, lineMul: 0.2 }));
  const sh = ctx.kit.groundShadow(1.9, 1.2, "#2a1040", 0.5); sh.position.y = 0.004; S.group.add(sh);
  S.update = (t, cue) => {
    const tR0 = T(cue, "kcRise", CLK.kcRise[0]), tK1 = T(cue, "kcSink", CLK.kcSink[0]), tPi = T(cue, "pierce", CLK.pierce), tCo = T(cue, "coin", CLK.coin);
    const rise = sm(tR0, tR0 + (CLK.kcRise[1] - CLK.kcRise[0]), t), sink = sm(tK1, tK1 + (CLK.kcSink[1] - CLK.kcSink[0]), t);
    const [wx, wy, wz] = F.w(MARK.kc[0], -H * (1 - rise) - H * sink + 0.05 * Math.sin(t * 2.4) * rise, MARK.kc[2]);
    S.group.position.set(wx, wy, wz);
    S.group.rotation.set(0, F.yaw + Math.PI, 0); // faces the seal
    S.group.scale.setScalar(F.s);
    S.group.visible = rise > 0.001 && sink < 0.995;
    // arms ready, low and wide; the right fist snaps forward at the coin flick 4.2, both flinch at the pierce 5.8
    const flick = win(t, tCo, tCo + 0.5, 0.08, 0.3), fl = win(t, tPi, tPi + 0.5, 0.05, 0.4);
    S.arms[0].rotation.x = 0.2 - 1.2 * flick - 0.4 * fl; S.arms[0].rotation.z = -0.3;
    S.arms[1].rotation.x = 0.2 - 0.3 * fl; S.arms[1].rotation.z = 0.3;
    S.eyes.userData.set("rage", 0.9);
  };
  S.occ = (eye, tgt) => S.group.visible && occludes(eye, tgt, S.group.position.toArray(), H * F.s * 0.95, 0.6 * F.s);
  S.dispose = () => disposeAll(S);
  return S;
}
