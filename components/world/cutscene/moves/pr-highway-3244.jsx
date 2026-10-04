// the Highway: CARS, Lightning McQueen at a desert speedway (Radiator Springs
// light), in shape and colour only. A Pixar-bright dimension: glossy
// saturated CG, a warm sunset, reflective paint, smooth motion (not on twos).
// The island swells into a bubble of sunset sky and the camera is inside a
// speedway: a stadium oval of asphalt and kerbs, five grandstands with a
// cheering instanced crowd, chequered flags snapping, a finish gantry, tyre
// walls and red mesas under a rose-and-gold sky. The island's highway car is
// PROMOTED: a red stock car with yellow lightning bolts, #3244 on the doors,
// a bumper smile and two friendly eyes in its windscreen. It says "I am
// speed." on the grid; the pup hops onto its roof; twelve rivals drag a
// tangle of comparison lines between every pair (66 ribbons); the car checks
// only the slice ahead (one clean mint line, in a mint window on the road)
// and blows past them all, drifting, its tyre smoke trailing, a Ka-chow
// glint on the last pass. It crosses the line so fast that the chequered
// flag wraps the lens like a page and turns, and under it the island: the car
// rolls round the real roundabout to a stop beside where the pup stood, the
// pup hops down and says the flex line; the card; the car drives off round
// the ring. Secondary motion: the crowd waving and bobbing, confetti, smoke
// trails, flags snapping, the car on its springs.
// No post pass; every pool is allocated once and disposed on exit.
// Card: lib/world/cutscene/cards/pr-highway-3244.js. Parts: ./pr-highway-3244/
// (shade: the one glossy shader; car; land; fx; path).

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, Quaternion, Vector3 } from "three";
import { HIGHWAY } from "../../../../lib/world/land";
import { ROAD_Y } from "../../../../lib/world/highwayCars";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, signAt, smooth, useCutFrame } from "../kit";
import { nudge, usePup } from "./g2/parts";
import { flashQuad, holdFlash, islandList, lettering } from "./p-caustic/parts";
import { EYE, ROOF, WHEEL_R, WHEEL_X, WHEEL_Z, carGeometry, doorNumber, eyeGeometry, wheelGeometry } from "./pr-highway-3244/car";
import { confetti, glint, pageFlag, ribbons, shadowPool, smokePool, streaks } from "./pr-highway-3244/fx";
import { BLOCKS, cactus, crowdData, crowdMeshes, desert, flagMaterial, flagPoles, gantry, mesas, oval, rocks, skyDome, stands, tyres } from "./pr-highway-3244/land";
import { FINISH, PASS, RIVALS, START, T, heroDist, heroSpeed, heroZ, rivalX, rivalZ, sm } from "./pr-highway-3244/path";
import { KEY, KEY_U, SUN_SKY, SUN_U, hash, rgb, solid } from "./pr-highway-3244/shade";

const BETA = 0.36; // the speedway's yaw to the lens: the car three-quarters on, its eyes toward us
const CB = Math.cos(BETA);
const SB = Math.sin(BETA);
const P0 = [1.0, -1.9]; // the guest's grid slot in the rig (x, z): the card's landAt stands the tail here
const CAR_S = 1.12;
const NR = RIVALS.length;
const NP = (NR * (NR - 1)) / 2;
const SEG = 8; // quads along each comparison arc
const PUFFS = 110;
const UP = new Vector3(0, 1, 0);
const CORE_Y = 0.9;
const RING = HIGHWAY.roundabout;
const STOP_AHEAD = 2.5; // m the car stops past where the pup stood
const ARRIVE = 6.25; // the car enters the ring behind the cloth
const RIVAL_HEX = ["#1fb8b0", "#8a4fe0", "#9ad62f", "#ff8a1f", "#3d8cf0", "#e0409a", "#ffd21f", "#3fd49a", "#2850d8", "#f4efe4", "#ff6f5a", "#3aa85a"];
// PACING: the card clock (tc) is stretched into the race clock (t) so every line is read and every beat holds;
// the Ka-chow passes in slow motion. [card s, race s] knots, piecewise linear.
const KNOTS = [[0, 0], [2, 2], [7.4, 3.0], [10.1, 4.7], [12.5, 5.3], [13.7, 6.0], [15.3, 6.45], [17.3, 7.55], [18.3, 8.1], [24.0, 11.0], [25.8, 12.8], [60, 47]];
function warp(tc) {
  for (let i = 1; i < KNOTS.length; i++) {
    if (tc <= KNOTS[i][0]) {
      const [a, b] = KNOTS[i - 1];
      const [c, d] = KNOTS[i];
      return b + ((d - b) * (tc - a)) / (c - a);
    }
  }
  return tc;
}
const BLINKS = [2.1, 3.3, 5.0, 7.9, 9.4, 10.6];

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const spring = (t, t0, a, w = 20, z = 5) => (t > t0 ? a * Math.exp(-z * (t - t0)) * Math.sin(w * (t - t0)) : 0);
const D = new Object3D();
D.rotation.order = "YXZ";
const DW = new Object3D();
const Q = new Quaternion();
const V = new Vector3();
const SUNW = new Vector3();

// the guest's pose, written each frame in the rig frame: the pup's offsets read it
const HERO = { x: 0, y: 0, z: 0, yaw: 0, bob: 0 };
const GROUND = { y: 0 };
const ANCHOR = { x: START[0], z: START[1] };
const SM = { lx: 0, lz: 0, d: 0 };
const TR = { lx: 0, lz: 0, d: 0 };
const ROOFV = [0, 0, 0];
const PUP = { seat: 0 };

// where the guest is on the straight at time t (track frame) and how far its nose is swung round the drift
function raceAt(t, out) {
  out.lx = START[0] - heroDist(t);
  out.lz = heroZ(t);
  const v = heroSpeed(t);
  const vz = (heroZ(t + 0.03) - heroZ(t - 0.03)) / 0.06;
  out.d = v > 1 ? clamp(2.8 * Math.atan2(vz, v + 4), -0.85, 0.85) : 0;
  return out;
}

// one unit cloth, pole at x = 0 and free edge at x = 1, with a phase per flag for the wave
function cloth(n) {
  const g = new PlaneGeometry(1, 1, 12, 6).translate(0.5, 0, 0);
  g.setAttribute("aPh", new InstancedBufferAttribute(Float32Array.from({ length: n }, (_, i) => hash(i, 11) * 6.28), 1));
  return g;
}

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const rig = useRef();
  const sky = useRef();
  const world = useRef();
  const track = useRef();
  const mesaG = useRef();
  const heroG = useRef();
  const bodyG = useRef();
  const eyesM = useRef();
  const island = useRef([]);

  const m = useMemo(() => {
    const dome = skyDome();
    const des = desert();
    const ov = oval();
    const stand = stands();
    const standMat = solid({ fogK: 0.0042 });
    const crowd = crowdMeshes(crowdData());
    const fp = flagPoles();
    const flagMat = flagMaterial();
    const gan = gantry();
    const tyre = tyres();
    const rock = rocks();
    const mesaGeo = mesas();
    const heroMat = solid({ fogK: 0.0042 });
    const hero = { body: carGeometry({ hero: true }), eyes: eyeGeometry(), wheel: wheelGeometry(), num: doorNumber() };
    const wheels = new InstancedMesh(hero.wheel, heroMat, 4);
    wheels.frustumCulled = false;
    const rivalGeo = carGeometry({ res: 0.7 });
    const rivals = new InstancedMesh(rivalGeo, solid({ fogK: 0.0042 }), NR);
    rivals.frustumCulled = false;
    RIVAL_HEX.forEach((h, i) => rivals.setColorAt(i, new Color(...rgb(h))));
    const cactusGeo = cactus();
    const cacti = new InstancedMesh(cactusGeo, solid({ fogK: 0.0042 }), BLOCKS.length + 1);
    cacti.frustumCulled = false;
    for (let i = 0; i <= BLOCKS.length; i++) {
      D.rotation.set(0, hash(i, 1) * 6, 0);
      const s = 0.9 + 0.4 * hash(i, 2);
      D.position.set(i === 0 ? BLOCKS[0] - 6 : BLOCKS[i - 1] + 46, 0, -19.4);
      D.scale.set(s, s, s);
      D.updateMatrix();
      cacti.setMatrixAt(i, D.matrix);
    }
    const flags = new InstancedMesh(cloth(fp.flags.length), flagMat, fp.flags.length);
    flags.frustumCulled = false;
    fp.flags.forEach((f, i) => {
      D.position.set(f.x, f.y, f.z);
      D.rotation.set(0, 0, 0);
      D.scale.set(f.w, f.h, 1);
      D.updateMatrix();
      flags.setMatrixAt(i, D.matrix);
    });
    // the finish banner: a long cloth across the track under the gantry's beam
    const banner = new InstancedMesh(cloth(1), flagMat, 1);
    banner.frustumCulled = false;
    D.position.set(FINISH - 8.8, 7.2, -15.3);
    D.rotation.set(0, 0, 0);
    D.scale.set(17.6, 1.5, 1);
    D.updateMatrix();
    banner.setMatrixAt(0, D.matrix);
    D.rotation.set(0, 0, 0);
    D.scale.set(1, 1, 1);
    const poleMat = solid({ fogK: 0.0042 });
    const tangle = ribbons(NP * SEG + 8, "#ff6a55");
    const clean = ribbons(80, "#5dffc2", { additive: true });
    const trail = ribbons(40, "#ffb347", { additive: true });
    const smoke = smokePool(PUFFS);
    const conf = confetti(240);
    const streak = streaks(120);
    const shRiv = shadowPool(NR);
    const shHero = shadowPool(1);
    const flash = flashQuad("#fff1d0");
    const boom = lettering("KA-CHOW!", "#e5251c", -0.1);
    const star = glint();
    const page = pageFlag();
    const pairs = [];
    for (let i = 0; i < NR; i++) for (let j = i + 1; j < NR; j++) pairs.push([i, j, hash(i * 31 + j, 7) * 6.28]);
    const arcSin = Array.from({ length: SEG + 1 }, (_, k) => Math.sin((Math.PI * k) / SEG));
    return { dome, des, ov, stand, standMat, crowd, fp, flagMat, flags, banner, gan, tyre, rock, mesaGeo, heroMat, hero, wheels, rivalGeo, rivals, cactusGeo, cacti, poleMat, tangle, clean, trail, smoke, conf, streak, shRiv, shHero, flash, boom, star, page, pairs, arcSin };
  }, []);

  useEffect(() => {
    island.current = islandList(scene);
    return () => {
      // everything the scene built goes with it
      const geos = [m.dome.g, m.des.g, m.ov.g, m.stand, m.mesaGeo, m.gan, m.fp.poles, m.rivalGeo, m.cactusGeo, m.hero.body, m.hero.eyes, m.hero.wheel, m.hero.num.geo, m.tangle.geometry, m.clean.geometry, m.trail.geometry, m.smoke.mesh.geometry, m.conf.geometry, m.streak.geometry, m.shRiv.geometry, m.shHero.geometry, m.flash.geometry, m.boom.geometry, m.star.geometry, m.page.geometry, m.tyre.geometry, m.rock.geometry, m.flags.geometry, m.banner.geometry, m.crowd.G.body, m.crowd.G.head, m.crowd.G.armR, m.crowd.G.armL];
      for (const g of new Set(geos)) g.dispose();
      const mats = [m.dome.m, m.des.m, m.ov.m, m.standMat, m.flagMat, m.heroMat, m.rivals.material, m.cacti.material, m.poleMat, m.tangle.material, m.clean.material, m.trail.material, m.smoke.mesh.material, m.conf.material, m.streak.material, m.shRiv.material, m.shHero.material, m.flash.material, m.boom.material, m.star.material, m.page.material, m.hero.num.m, m.tyre.material, m.rock.material, m.crowd.body.material, m.crowd.head.material, m.crowd.armR.material, m.crowd.armL.material];
      for (const x of new Set(mats)) x.dispose();
      m.hero.num.tex.dispose();
      m.boom.material.map?.dispose();
      for (const x of [m.crowd.body, m.crowd.head, m.crowd.armR, m.crowd.armL, m.wheels, m.rivals, m.cacti, m.flags, m.banner, m.tyre, m.rock, m.smoke.mesh, m.conf, m.streak, m.shRiv, m.shHero]) x.dispose();
    };
  }, [scene, m]);

  // a skip clears the arrival: nothing of the speedway draws for the frame before this unmounts
  useFrame(() => {
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      m.page.visible = false;
      m.flash.visible = false;
    }
  }, -0.5);

  // the guest's pose, the sky, the pools: every frame, in smooth time (this world is not on twos)
  useCutFrame((tc, state) => {
    const t = warp(tc);
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    if (!full) {
      m.page.visible = false;
      return;
    }
    const cam = state.camera;
    const turn = turnFor(card, place, s.x, s.z);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tc);
    g.position.set(s.x, GROUND.y, s.z);
    g.rotation.y = turn;

    // the sun, turned with the rig
    SUN_U.value.copy(SUN_SKY).applyAxisAngle(UP, turn);
    KEY_U.value.copy(KEY).applyAxisAngle(UP, turn);

    // THE BUBBLE swells out of the pup with the stage, then is the sky
    const r = radiusAt(tl, tc);
    V.set(s.x, CORE_Y + GROUND.y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    const back = t >= T.swap; // the island is what is under the cloth
    sky.current.visible = r > 0.02 && !back;
    sky.current.scale.setScalar(inside ? 200 : Math.max(r, 0.02));
    m.dome.m.uniforms.uInside.value = inside ? 1 : 0;
    world.current.visible = inside && !back;
    if (back && tc < tl.collapse[0]) for (const o of island.current) o.visible = true;

    // THE ANCHOR: the camera follows the guest down the straight, so the world slides under the lens
    const d = heroDist(t);
    ANCHOR.x = START[0] - 0.985 * d;
    ANCHOR.z = START[1] + 0.55 * (heroZ(t) - START[1]);
    const speedK = clamp(heroSpeed(t) / 44) * (1 - sm(T.cover[0], T.cover[1], t));
    const tr = track.current;
    tr.rotation.y = BETA;
    tr.position.set(P0[0] - (ANCHOR.x * CB + ANCHOR.z * SB), (speedK > 0.1 ? (Math.floor(t * 30) % 2 ? 1 : -1) * 0.012 * speedK : 0), P0[1] - (-ANCHOR.x * SB + ANCHOR.z * CB));
    const dx = ANCHOR.x - START[0];
    mesaG.current.position.set(-0.1 * dx * CB, 0, 0.1 * dx * SB);

    // the guest, in the rig: on the straight, then round the real roundabout
    const hero = heroG.current;
    const body = bodyG.current;
    raceAt(t, SM);
    let hx;
    let hy = 0;
    let hz;
    let yaw;
    let roll = 0;
    let pitch = 0;
    let wheelDist = d;
    let rattle = 0;
    if (!back) {
      hx = (SM.lx - ANCHOR.x) * CB + (SM.lz - ANCHOR.z) * SB + P0[0];
      hz = -(SM.lx - ANCHOR.x) * SB + (SM.lz - ANCHOR.z) * CB + P0[1];
      yaw = Math.PI + BETA + SM.d;
      const a = (heroSpeed(t + 0.03) - heroSpeed(t - 0.03)) / 0.06;
      const zz = (heroZ(t + 0.06) - 2 * heroZ(t) + heroZ(t - 0.06)) / 0.0036;
      pitch = clamp(0.0035 * a, -0.1, 0.12);
      roll = clamp(-0.05 * zz, -0.16, 0.16);
      rattle = ramp(t, T.go - 1.0, T.go) * (1 - ramp(t, T.go, T.go + 0.25)) * 0.012 + 0.006 * speedK;
    } else {
      // the ring, from the rig's own frame: the guest rolls in, brakes and stops past where the pup stands, later drives off
      const rr = clamp(Math.hypot(s.x - RING.x, s.z - RING.z), RING.radius - RING.width / 2 + 0.3, RING.radius + RING.width / 2 - 0.3);
      const phi = Math.atan2(s.z - RING.z, s.x - RING.x);
      const q = ramp(t, ARRIVE, T.stop);
      const arrive = 19 * Math.pow(1 - q, 2.4); // m still to go to the stop
      const away = 10 * Math.pow(Math.max(0, t - T.leave), 2); // m driven off after it
      const th = phi + (STOP_AHEAD - arrive + away) / rr;
      const wx = RING.x + rr * Math.cos(th) - s.x;
      const wz = RING.z + rr * Math.sin(th) - s.z;
      const ct = Math.cos(turn);
      const st = Math.sin(turn);
      hx = wx * ct - wz * st;
      hz = wx * st + wz * ct;
      hy = ROAD_Y - GROUND.y;
      const slide = 0.3 * Math.sin(Math.PI * ramp(t, 6.95, T.stop)) * (t < T.stop ? 1 : 0);
      yaw = Math.atan2(-Math.cos(th), -Math.sin(th)) - turn + slide;
      wheelDist = d + 19 - arrive + away;
      pitch = -0.1 * smooth(ARRIVE + 0.2, ARRIVE + 0.6, t) * (1 - smooth(T.stop - 0.4, T.stop, t)) + 0.1 * ramp(t, T.leave, T.leave + 0.3);
      roll = -0.1 * Math.sin(Math.PI * ramp(t, 6.95, T.stop)) * (t < T.stop ? 1 : 0);
      rattle = 0.004;
    }
    // the springs: a squat on the launch, a bounce on each pass and on the line, a nod at the stop
    const bob = spring(t, T.go - 0.04, -0.05, 19, 5) + spring(t, 4.4, 0.035) + spring(t, 4.85, 0.035) + spring(t, 5.45, 0.03) + spring(t, T.cross, -0.04) + spring(t, T.stop, -0.05, 16, 4.5) + rattle * Math.sin(t * 83);
    HERO.x = hx;
    HERO.y = hy;
    HERO.z = hz;
    HERO.yaw = yaw;
    HERO.bob = bob;
    hero.position.set(hx, hy, hz);
    hero.rotation.set(0, yaw, 0);
    hero.scale.setScalar(CAR_S);
    body.position.y = bob + 0.02;
    body.rotation.set(roll, 0, pitch + 2 * spring(t, T.go - 0.04, -0.05, 19, 5) + 0.6 * spring(t, T.stop, -0.08, 16, 4.5));
    // the wheels roll
    const ang = -wheelDist / WHEEL_R;
    let wi = 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      DW.position.set(sx * WHEEL_X, WHEEL_R, sz * WHEEL_Z);
      DW.rotation.z = ang;
      DW.updateMatrix();
      m.wheels.setMatrixAt(wi++, DW.matrix);
    }
    m.wheels.instanceMatrix.needsUpdate = true;
    // the eyes blink (and wink on the Ka-chow)
    let blink = 0;
    for (const b of BLINKS) {
      const k = t - b;
      const dur = b === 5.0 ? 0.3 : 0.15;
      if (k > 0 && k < dur) blink = Math.max(blink, Math.sin((Math.PI * k) / dur));
    }
    eyesM.current.scale.set(1, 1 - 0.9 * blink, 1);
    hero.visible = t > 1.5 && t < T.leave + 1.1 && out > 0.01;

    // THE RIVALS: a grid, then a stream; they rock on their springs and fishtail as the guest goes by
    const hz0 = SM.lz;
    const hx0 = SM.lx;
    let ahead = -1;
    let aheadGap = 1e9;
    for (let i = 0; i < NR; i++) {
      const x = rivalX(i, t);
      const lane = rivalZ(i, t);
      const wake = PASS[i] > 0 ? Math.exp(-(((t - PASS[i]) / 0.3) ** 2)) : 0;
      const sgn = lane >= hz0 ? 1 : -1;
      const zz = lane + sgn * 0.45 * wake;
      D.position.set(x, 0.015 * Math.sin(t * 9 + i) * (t < T.go + 0.3 ? 1 : 0.3), zz);
      D.rotation.set(0.02 * Math.sin(t * 5 + i * 2) + 0.05 * wake * sgn, Math.PI + sgn * 0.5 * wake + 0.04 * Math.sin(t * 2 + i), 0);
      D.scale.setScalar(CAR_S);
      D.updateMatrix();
      m.rivals.setMatrixAt(i, D.matrix);
      // its contact shadow, thrown away from the key light
      D.position.set(x + 0.5, 0.03, zz - 0.4);
      D.rotation.set(0, Math.PI, 0);
      D.scale.set(4.6, 1, 2.2);
      D.updateMatrix();
      m.shRiv.setMatrixAt(i, D.matrix);
      const gap = hx0 - x;
      if (gap > 1.6 && Math.abs(lane - hz0) < 5.5 && gap < aheadGap) {
        aheadGap = gap;
        ahead = i;
      }
    }
    m.rivals.instanceMatrix.needsUpdate = true;
    m.shRiv.instanceMatrix.needsUpdate = true;
    // the guest's own contact shadow
    D.position.set(hx + 0.5 * CAR_S, hy + 0.03, hz - 0.4 * CAR_S);
    D.rotation.set(0, yaw, 0);
    D.scale.set(4.6 * CAR_S, 1, 2.2 * CAR_S);
    D.updateMatrix();
    m.shHero.setMatrixAt(0, D.matrix);
    m.shHero.instanceMatrix.needsUpdate = true;
    m.shHero.visible = hero.visible;
    m.shRiv.visible = !back && t > 1.55;
    m.rivals.visible = !back && t > 1.55;

    // THE LINES: the camera in the track's frame, for the ribbons to face
    const ccx = cam.position.x - s.x;
    const ccz = cam.position.z - s.z;
    const rx = ccx * Math.cos(turn) - ccz * Math.sin(turn) - P0[0];
    const rz = ccx * Math.sin(turn) + ccz * Math.cos(turn) - P0[1];
    const clx = rx * CB - rz * SB + ANCHOR.x;
    const clz = rx * SB + rz * CB + ANCHOR.z;
    const cly = cam.position.y - GROUND.y;
    const tg = m.tangle;
    tg.begin();
    const grow = smooth(1.75, 2.7, t);
    const calm = 1 - 0.62 * smooth(T.go + 0.2, T.go + 0.7, t);
    if (!back && grow > 0.01) {
      const n = Math.max(1, Math.round(SEG * grow));
      for (const [i, j, ph] of m.pairs) {
        const ax = rivalX(i, t);
        const az = rivalZ(i, t);
        const bx = rivalX(j, t);
        const bz = rivalZ(j, t);
        const dd = Math.hypot(ax - bx, az - bz);
        if (dd > 15) continue; // a wire only between cars that are near: it reads as the pairs, not a net over the stands
        const h = 0.2 + 0.025 * dd;
        let px = ax;
        let py = 1.0;
        let pz = az;
        for (let k = 1; k <= n; k++) {
          const u = k / SEG;
          const sn = m.arcSin[k];
          const qx = ax + (bx - ax) * u;
          const qz = az + (bz - az) * u + 0.28 * Math.sin(t * 2.1 + ph + u * 9) * sn;
          const qy = 1.0 + h * sn + 0.18 * Math.sin(t * 3 + ph * 2 + u * 7) * sn;
          tg.seg(px, py, pz, qx, qy, qz, 0.05, 0.9 * calm, clx, cly, clz);
          px = qx;
          py = qy;
          pz = qz;
        }
      }
    }
    tg.end();
    // the slice: a mint window on the road ahead of the guest and one clean line to the next rival in it
    const cl = m.clean;
    cl.begin();
    const sliceK = smooth(T.go - 0.9, T.go - 0.4, t) * (1 - smooth(T.cover[0] - 0.12, T.cover[0], t)) * (back ? 0 : 1);
    if (sliceK > 0.01) {
      const x0 = SM.lx - 2.2;
      const x1 = SM.lx - 15;
      const za = SM.lz - 1.7;
      const zb = SM.lz + 1.7;
      cl.seg(x0, 0.08, za, x1, 0.08, za, 0.22, 0.9 * sliceK, clx, cly, clz);
      cl.seg(x0, 0.08, zb, x1, 0.08, zb, 0.22, 0.9 * sliceK, clx, cly, clz);
      cl.seg(x1, 0.08, za, x1, 0.08, zb, 0.22, 0.9 * sliceK, clx, cly, clz);
      cl.seg(x0, 0.08, za, x0, 0.08, zb, 0.22, 0.9 * sliceK, clx, cly, clz);
      const nx = SM.lx - 2.1 * Math.cos(SM.d) * CAR_S;
      const nz = SM.lz + 2.1 * Math.sin(SM.d) * CAR_S;
      const tx = ahead >= 0 ? rivalX(ahead, t) + 0.6 : SM.lx - 15;
      const ty = ahead >= 0 ? 1.55 : 0.8;
      const tz = ahead >= 0 ? rivalZ(ahead, t) : SM.lz;
      let px = nx;
      let py = 0.62;
      let pz = nz;
      for (let k = 1; k <= 10; k++) {
        const u = k / 10;
        const qx = nx + (tx - nx) * u;
        const qy = 0.62 + (ty - 0.62) * u + 0.05 * Math.sin(u * 20 - t * 18);
        const qz = nz + (tz - nz) * u;
        cl.seg(px, py, pz, qx, qy, qz, 0.32 * (1 + 0.15 * Math.sin(t * 22)), sliceK, clx, cly, clz);
        px = qx;
        py = qy;
        pz = qz;
      }
    }
    cl.end();

    // THE LIGHT TRAIL: a hot ribbon along where the car has just been, bright through the drift and the Ka-chow
    const tr2 = m.trail;
    tr2.begin();
    const trK = back ? 0 : smooth(T.kachow - 1.0, T.kachow - 0.5, t) * (1 - smooth(T.kachow + 0.5, T.kachow + 1.0, t));
    if (trK > 0.01) {
      raceAt(t, SM);
      let px = SM.lx + 1.9 * CAR_S;
      let pz = SM.lz;
      for (let k = 1; k <= 14; k++) {
        raceAt(t - 0.035 * k, TR);
        const qx = TR.lx + 1.9 * CAR_S;
        tr2.seg(px, 0.5, pz, qx, 0.5, TR.lz, 0.34 * (1 - k / 15), trK * (1 - k / 15), clx, cly, clz);
        px = qx;
        pz = TR.lz;
      }
    }
    tr2.end();

    // SMOKE: puffs shed from the rear tyres on the launch and every drift, each on its own analytic path
    const puff = m.smoke.mesh;
    for (let k = 0; k < PUFFS; k++) {
      const tb = 3.5 + k * 0.022;
      const age = t - tb;
      if (age < 0 || age > 1.05 || back) {
        D.position.set(0, -50, 0);
        D.rotation.set(0, 0, 0);
        D.scale.setScalar(0.0001);
        D.updateMatrix();
        puff.setMatrixAt(k, D.matrix);
        m.smoke.alpha.array[k] = 0;
        continue;
      }
      raceAt(tb, SM);
      const vzb = (heroZ(tb + 0.03) - heroZ(tb - 0.03)) / 0.06;
      const e = Math.max(1 - ramp(tb, T.go + 0.6, T.go + 1.2), clamp(Math.abs(vzb) / 1.6) * (tb > 4.0 ? 1 : 0)) * (tb < T.cross ? 1 : 0);
      const side = k % 2 ? 1 : -1;
      const sx = SM.lx + 1.2 * CAR_S * Math.cos(SM.d);
      const sz = SM.lz + side * 0.8 * CAR_S - 1.2 * CAR_S * Math.sin(SM.d);
      const life = age / 1.05;
      const sc = (0.3 + 1.7 * Math.sqrt(life)) * (0.6 + 0.4 * e);
      D.position.set(sx + 2.5 * age + 0.4 * side * hash(k, 3) * age, 0.3 + age + 0.5 * hash(k, 4) * age, sz + side * 0.9 * age * hash(k, 5));
      D.rotation.set(0, 0, 0);
      D.scale.set(sc, sc * 0.8, sc);
      D.updateMatrix();
      puff.setMatrixAt(k, D.matrix);
      m.smoke.alpha.array[k] = e > 0.25 ? 0.85 * Math.pow(1 - life, 1.3) * clamp(e * 1.3) : 0;
    }
    puff.instanceMatrix.needsUpdate = true;
    m.smoke.alpha.needsUpdate = true;
    D.scale.set(1, 1, 1);

    // CONFETTI: a cannon along the stands on the launch, another over the line
    const cu = m.conf.material.uniforms;
    cu.uT.value = t;
    cu.uB1.value = T.go - 0.1;
    cu.uC1.value.set(START[0] - 4, 0, -17);
    cu.uB2.value = T.cross - 0.15;
    cu.uC2.value.set(FINISH - 6, 0, -6);
    m.conf.visible = !back && t > 3;
    // SPEED STREAKS, long when the car is
    m.streak.material.uniforms.uSpeed.value = speedK;
    m.streak.visible = !back && speedK > 0.05;
    // the crowd and the flags
    const ex = 0.62 + 0.38 * Math.max(Math.exp(-(((t - 3.7) / 0.7) ** 2)), Math.exp(-(((t - 6.0) / 0.5) ** 2)));
    for (const c of [m.crowd.body, m.crowd.head, m.crowd.armR, m.crowd.armL]) {
      c.material.uniforms.uTime.value = tc;
      c.material.uniforms.uExcite.value = ex;
    }
    m.flagMat.uniforms.uTime.value = tc;

    // KA-CHOW: a glint on the nose and the word, popped over the car, on the last pass
    const kc = t - T.kachow;
    Q.setFromAxisAngle(UP, -turn).multiply(cam.quaternion); // lens-facing, in the rig's frame
    m.star.visible = kc > 0 && kc < 0.5 && !back;
    if (m.star.visible) {
      m.star.position.set(hx + 2.15 * CAR_S * Math.cos(yaw), hy + 0.62 * CAR_S, hz - 2.15 * CAR_S * Math.sin(yaw));
      m.star.quaternion.copy(Q);
      const pk = Math.sin(Math.PI * clamp(kc / 0.5));
      m.star.scale.setScalar(Math.max(2.2 * Math.pow(pk, 0.7), 0.001));
      m.star.material.uniforms.uA.value = 1.4 * pk;
      m.star.material.uniforms.uSpin.value = kc * 4;
    }
    const wide = state.size.width / state.size.height >= 1;
    m.boom.visible = kc > 0.05 && kc < 0.95 && !back;
    if (m.boom.visible) {
      const pop = Math.min(1, (kc - 0.05) / 0.1) * (1 + 0.22 * Math.max(0, 1 - (kc - 0.05) / 0.25));
      const w = (wide ? 4.4 : 3.1) * pop;
      m.boom.position.set(wide ? -2.3 : -0.3, wide ? 3.3 : 3.6, 1.2);
      m.boom.scale.set(w, w, 1);
      m.boom.quaternion.copy(Q);
    }
    holdFlash(m.flash, cam, Math.max(0, 1 - Math.abs(kc - 0.04) / 0.1) * 0.22);

    // THE PAGE: the chequered flag sweeps across the lens, then turns away like a page
    const cover = smooth(T.cover[0], T.cover[1], t);
    const turnK = smooth(T.turn[0], T.turn[1], t);
    const pg = m.page;
    pg.visible = cover > 0.001 && turnK < 0.999;
    if (pg.visible) {
      const hgt = 2 * Math.tan((cam.fov * Math.PI) / 360) * 1.2;
      cam.getWorldDirection(V);
      pg.position.copy(cam.position).addScaledVector(V, 1.2);
      pg.quaternion.copy(cam.quaternion);
      const u = pg.material.uniforms;
      u.uCover.value = cover;
      u.uTurn.value = turnK;
      u.uH.value = hgt * 1.04;
      u.uW.value = hgt * cam.aspect * 1.04;
      u.uT.value = t;
    }

    // the speedway hides behind the page; the car stays (it is the same car, rolling onto the real road)
    track.current.visible = !back;
    mesaG.current.visible = !back;
  });

  // THE PUP: crouches, hops onto the roof, rides, hops back down where it stood
  usePup(cut, (tc, p, turn) => {
    const t = warp(tc);
    GROUND.y = p.position.y;
    if (mode !== "full") return;
    const o = 1 - smooth(tl.collapse[0], tl.collapse[1], tc);
    const c = Math.cos(HERO.yaw);
    const sn = Math.sin(HERO.yaw);
    ROOFV[0] = HERO.x + ROOF[0] * c * CAR_S;
    ROOFV[2] = HERO.z - ROOF[0] * sn * CAR_S;
    ROOFV[1] = HERO.y + (ROOF[1] + 0.02) * CAR_S + HERO.bob;
    const kOn = smooth(T.hop[0], T.hop[1], t);
    const kOff = smooth(T.off, T.off + 0.55, t);
    let x = 0;
    let y = 0;
    let z = 0;
    if (t >= T.hop[0] && t < T.off) {
      y = 1.1 * Math.sin(Math.PI * ramp(t, T.hop[0], T.hop[1]));
      x = ROOFV[0] * kOn;
      y += ROOFV[1] * kOn;
      z = ROOFV[2] * kOn;
    } else if (t >= T.off) {
      // the car stands past the pup; the last hop is back over the tail to where it started
      x = ROOFV[0] * (1 - kOff);
      y = ROOFV[1] * (1 - kOff) + 0.9 * Math.sin(Math.PI * ramp(t, T.off, T.off + 0.55));
      z = ROOFV[2] * (1 - kOff);
    }
    nudge(p, turn, x * o, y * o, z * o);
    const seat = ramp(t, T.hop[1], T.hop[1] + 0.2) * (1 - ramp(t, T.off - 0.1, T.off));
    p.scale.setScalar(1 - 0.24 * seat);
    PUP.seat = seat;
  });

  // the pup's pose hooks: the opening sign, the crouch and hop, the sit on the roof, the cheer, the fist on the flex
  useCutFrame((tc) => {
    const t = warp(tc);
    if (mode !== "full") return;
    const o = 1 - smooth(tl.collapse[0], tl.collapse[1], tc);
    const hopOn = ramp(t, T.hop[0], T.hop[1]);
    const hopOff = ramp(t, T.off, T.off + 0.55);
    live.pose.sign = signAt(tl, tc) * (1 - smooth(tl.lineA - 0.3, tl.lineA, tc));
    live.pose.crouch = (smooth(T.hop[0] - 0.4, T.hop[0] - 0.05, t) * (1 - smooth(T.hop[0], T.hop[0] + 0.1, t)) + 0.7 * PUP.seat + (hopOn > 0 && hopOn < 1 ? 0.8 : 0)) * o;
    live.pose.spin = hopOff > 0 && hopOff < 1 ? (3 * hopOff) % 1 : 0;
    live.pose.raise = smooth(T.turn[0] + 0.3, T.turn[1] + 0.3, t) * (1 - smooth(T.off - 0.1, T.off + 0.1, t)) * o;
    live.pose.fist = smooth(T.off + 0.6, T.off + 0.9, t) * o;
  });

  const H = m.hero;
  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.flash} />
      <primitive object={m.page} />
      <group ref={rig} visible={false}>
        <mesh ref={sky} geometry={m.dome.g} material={m.dome.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <group ref={mesaG}>
            <mesh geometry={m.mesaGeo} material={m.standMat} frustumCulled={false} />
          </group>
          <group ref={track}>
            <mesh geometry={m.des.g} material={m.des.m} renderOrder={-2} frustumCulled={false} />
            <mesh geometry={m.ov.g} material={m.ov.m} renderOrder={-1} frustumCulled={false} />
            <mesh geometry={m.stand} material={m.standMat} frustumCulled={false} />
            <mesh geometry={m.gan} material={m.standMat} frustumCulled={false} />
            <mesh geometry={m.fp.poles} material={m.poleMat} frustumCulled={false} />
            <primitive object={m.flags} />
            <primitive object={m.banner} />
            <primitive object={m.crowd.body} />
            <primitive object={m.crowd.head} />
            <primitive object={m.crowd.armR} />
            <primitive object={m.crowd.armL} />
            <primitive object={m.tyre} />
            <primitive object={m.rock} />
            <primitive object={m.cacti} />
            <primitive object={m.rivals} />
            <primitive object={m.shRiv} />
            <primitive object={m.tangle.mesh} />
            <primitive object={m.clean.mesh} />
            <primitive object={m.trail.mesh} />
            <primitive object={m.smoke.mesh} />
            <primitive object={m.conf} />
            <primitive object={m.streak} />
          </group>
        </group>
        <group ref={heroG} visible={false}>
          <group ref={bodyG}>
            <mesh geometry={H.body} material={m.heroMat} frustumCulled={false} />
            <mesh ref={eyesM} geometry={H.eyes} material={m.heroMat} position={EYE.at} rotation={[0, 0, Math.PI / 2 - EYE.slope]} frustumCulled={false} />
            <primitive object={H.num.meshes[0]} />
            <primitive object={H.num.meshes[1]} />
          </group>
          <primitive object={m.wheels} />
        </group>
        <primitive object={m.shHero} />
        <primitive object={m.boom} />
        <primitive object={m.star} />
      </group>
    </>
  );
}
