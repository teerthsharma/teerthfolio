// WORLD layer for p-epsilon-hollow (Naruto: Itachi's Tsukuyomi, re-keyed as the GRAVEYARD OF EFFORTS). Written by the WORLD agent.
//
//   layer 0 (baked into the plate)   the painted dome (void, nebula, crimson band + black wisps, stars, the eye's drain),
//                                    the three dead moons (T6 RGCS, T9 CMA, T10 WPHB)
//   layer 1 (redrawn each step)      the EYE (almond, iris fibres, strands, photon ring, three-tomoe egg), the planet crust
//                                    (3 cel bands, cracks, gold ripple, limb), knee-high mist, the named titans (hand, skull,
//                                    god-form, maw + 44 more), 1,400 spires, the 31 plinths, the name plinths, the PR-number sparks
//
// CUE NAMES READ (each falls back to the bible's seconds if the direction layer does not define the beat):
//   swell   0..3 s     the eye's bloom swell                       tomoe    f69-72 (2.875..3.0 s)  the pinwheel egg
//   ripple  14.6..23.0 the gold front through the cracks, 40 m/s   sparks   23.0..27.0            PR numbers rise off the plinths
//   slash   27.0 +0.45 the sky opens along the cut (edge burn crimson -> gold; the first 2 frames Susanoo purple #7a3fc0)
// The seal frame: scene.seal.at / yaw. Statue positions are in that frame (x right, z forward). The sleeper is at (2.3, -1.4), scale 0.55.
import { Group, InstancedMesh, Vector2, Vector3 } from "three";
import { PLANET_R, buildMist, buildPlanet } from "./planet.js";
import { buildSky, eyeFrame } from "./sky.js";
import { godform, hand, hullMaterial, maw, skull, spire, stoneMaterial } from "./horrors.js";
import { buildPlinths, buildSparks, instMatrix } from "./plinths.js";
import { buildMoons } from "./moons.js";
import { layout } from "./layout.js";
import { U, col } from "./palette.js";
import { buildMangekyo } from "./mangekyo.js";
import { buildHideout } from "./hideout.js";

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const last = (v, d) => (Array.isArray(v) ? v[v.length - 1] : v ?? d);

// the eye's place: 12 deg above the wide shot's line of sight, sized to 38% of the wide's frame height
function eyePlace(scene) {
  const wide = (scene.shots ?? []).find((s) => s.law === "wide") ?? {};
  const az = last(wide.az, 0.7), r = last(wide.r, 15), el = last(wide.elev, 9), fov = last(wide.fov, 42);
  const yaw = scene.seal?.yaw ?? 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
  // camera -> seal heading in world az (az = atan(x, -z)); the camera sits at (r sin az, ., r cos az) in the seal frame
  const vx = -(Math.sin(az) * cy + Math.cos(az) * sy), vz = -(-Math.sin(az) * sy + Math.cos(az) * cy);
  const azH = Math.atan2(vx, -vz);
  const elH = -Math.atan2(el, Math.max(1e-3, r)) + (12 * Math.PI) / 180; // 12 deg above the wide's line of sight
  const hole0 = new Vector3(Math.sin(azH) * Math.cos(elH), Math.sin(elH), -Math.cos(azH) * Math.cos(elH)).normalize();
  const eyeS = 1.4 / (0.76 * Math.tan((fov * Math.PI) / 360)); // iris diameter 1.4 units = 0.38 of the frame height
  return { hole0, eyeS };
}

export default function build(ctx) {
  const { engine, scene } = ctx;
  const group = new Group();
  const rng = ctx.rng("epsilon-world");
  const beats = scene.beats ?? [];
  const has = (n) => beats.some((b) => b.name === n);

  const at = new Vector3(...(scene.seal?.at ?? [0, 0, 0]));
  const yaw = scene.seal?.yaw ?? 0;
  const { hole0, eyeS } = eyePlace(scene);
  const { e1, e2 } = eyeFrame(hole0);

  // shared uniforms: every material reads the same objects, so one write moves them all
  const S = {
    R: PLANET_R,
    uTime: { value: 0 }, uThree: { value: 0 }, uHole: { value: hole0.clone() },
    uCenter: { value: at.clone().add(new Vector3(0, -PLANET_R + 0.03, 0)) },
    uRipple: { value: 0 }, uRippleAmp: { value: 0 }, uPole: { value: at.clone() }, uMistDrift: { value: 0 },
    uSpT: { value: 0 }, uSpAmp: { value: 0 },
    uCut: { value: 0 }, uCutN: { value: new Vector2(0.62, 0.78) }, uRes: engine.shared?.uRes ?? { value: new Vector2(1280, 720) },
    uEdgeA: U("crimson"), uEdgeB: U("gold"),
  };

  // ---- layer 0: the dome and the moons ----
  const sky = buildSky(ctx, { hole0, e1, e2, eyeS, S });
  group.add(sky.dome);
  const rows = { moonA: 7, moonB: 8, moonC: 9 };
  const moons = [[-0.78, 0.42, 18, "moonA"], [0.85, 0.62, 22, "moonB"], [0.4, 0.95, 14, "moonC"]].map(([ox, oy, r, key]) => {
    const dir = hole0.clone().addScaledVector(e1, ox).addScaledVector(e2, oy).normalize();
    return { p: dir.clone().multiplyScalar(340).add(at), r, row: rows[key], yaw: Math.atan2(-dir.x, -dir.z) };
  });
  const moonSet = buildMoons(S, moons);
  moonSet.objects.forEach((o) => group.add(o));

  // ---- layer 1: everything that moves, in the seal's frame ----
  const frame = new Group();
  frame.position.copy(at); frame.rotation.y = yaw; frame.userData.layer = 1;
  group.add(frame);
  frame.add(sky.eye);
  const mangekyo = buildMangekyo(ctx, { hole0, at, eyeS });
  frame.add(mangekyo.mesh);
  const hideout = buildHideout(ctx, frame);
  const planet = buildPlanet(S);
  frame.add(planet.mesh);

  const L = layout(rng);
  const stone = stoneMaterial(S, { id: 0.7 }), hullM = hullMaterial(S, 0.7);
  const geos = { hand: hand(), skull: skull(), god: godform(), maw: maw(), spire: spire() };
  const place = (geo, items) => {
    if (!items.length) return;
    const mesh = new InstancedMesh(geo, stone, items.length);
    items.forEach((it, i) => mesh.setMatrixAt(i, instMatrix(it.p, it.up, it.yaw, it.s)));
    mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false;
    const hull = new InstancedMesh(geo, hullM, items.length);
    hull.instanceMatrix = mesh.instanceMatrix; hull.frustumCulled = false; hull.renderOrder = -1;
    frame.add(mesh, hull);
  };
  for (const k of ["hand", "skull", "god", "maw"]) place(geos[k], L.statues[k]);
  place(geos.spire, L.spires);
  const plinths = buildPlinths(S, frame, L.plinths, L.names);
  const sparks = buildSparks(S, frame, L.sparks);
  const mist = buildMist(S);
  mist.shells.forEach((m) => frame.add(m));

  // ---- cues ----
  const K = (cue, name, a, b, t) => (has(name) ? cue.k(name) ?? 0 : clamp01((t - a) / (b - a)));
  const purple = col("violet"), crim = col("crimson"), gold = col("gold");

  return {
    group,
    update(t, dt, cue) {
      const ts = cue?.ts ?? t, tc = cue?.t ?? t;
      const th3 = Math.floor(ts * 8) / 8;                     // threes: mist, tentacles
      S.uTime.value = ts; S.uThree.value = th3; S.uMistDrift.value = th3 * 0.35;
      // the eye's bloom swell (0..3 s), smoothstep
      const sw = K(cue, "swell", 0, 3.0, ts), swell = sw * sw * (3 - 2 * sw);
      // egg 1: the pinwheel for the last 3 frames of the dive
      const pin = has("tomoe") ? (cue.on("tomoe") ? 1 : 0) : ts >= 2.875 && ts < 3.0 ? 1 : 0;
      // the gold ripple through the cracks: 40 m/s over 8.4 s, fading in the last 6%
      const rk = K(cue, "ripple", 14.6, 23.0, ts), running = rk > 0 && rk < 1;
      S.uRipple.value = running ? rk * 8.4 * 40 : 0;
      S.uRippleAmp.value = running ? 1 - clamp01((rk - 0.94) / 0.06) : 0;
      // PR-number sparks
      const sk = K(cue, "sparks", 23.0, 27.0, ts);
      S.uSpT.value = has("sparks") ? Math.max(0, cue.since("sparks")) : Math.max(0, ts - 23.0);
      S.uSpAmp.value = sk > 0 && sk < 1 ? clamp01(sk / 0.12) * clamp01((1 - sk) / 0.1) : 0;
      // the slash: opens 0 -> 1 over 0.45 s (ease-out); the first 2 frames carry Susanoo purple
      const since = has("slash") ? cue.since("slash") : tc - 27.0;
      const k = clamp01(since / 0.45);
      S.uCut.value = since >= 0 ? 1 - (1 - k) * (1 - k) : 0;
      const pf = since >= 0 && since < 2 / 24;
      S.uEdgeA.value.copy(pf ? purple : crim); S.uEdgeB.value.copy(pf ? purple : gold);
      // the pup's position keeps the mist clear of the seal
      const sp = ctx.seal?.group?.position;
      if (sp) S.uPole.value.copy(sp);
      // the sky drifts 0.5 deg/s (on threes); the eye and its light turn with it
      S.uHole.value.copy(sky.update(ts, 0.0087266 * th3, swell, pin));
      mangekyo.update(ts, swell, pin, S.uHole.value);
    },
    dispose() {
      sky.dispose(); mangekyo.dispose(); hideout.dispose(); planet.dispose(); mist.dispose(); moonSet.dispose(); plinths.dispose(); sparks?.dispose();
      stone.dispose(); hullM.dispose(); Object.values(geos).forEach((g) => g.dispose());
    },
  };
}
