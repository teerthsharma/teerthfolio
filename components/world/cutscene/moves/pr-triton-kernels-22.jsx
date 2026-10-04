// Triton kernels: Jujutsu Kaisen, Sukuna's Malevolent Shrine, in shape and colour only, in its own
// dimension: MANGA INK. Heavy black ink, screentone, hatching and cross-hatching on paper, ONE accent
// colour (blood red); everything else black, white and grey. The pup becomes the demon seal (the Sukuna
// marks, black flipper tips, ANOS VOLDIGOAD's Magic Eyes of Destruction on its own big eyes; round head,
// no ears), forms the shrine mudra, and the domain is BARRIERLESS, drawn on air: no dome, no backdrop. The
// real scramble crossing of a night Shibuya is drawn in around the pup (zebra bars, lit signboards and big
// screens, a station canopy and clock, a round sign tower, street lamps, abandoned cars, a skyline); the
// sky bleeds to blood red; a dark pool spreads over the crossing; and the MALEVOLENT SHRINE rises at the
// avenue's end (shrine.js: four tiers, swept roofs, a fanged mouth, horns, ox skulls, huge clawed hands,
// mounds of skulls and bones) and says "Domain Expansion." with its jaw. The triangle of 55 ice blocks
// stands on the crossing. DISMANTLE and CLEAVE: the barrage of slash strokes sweeps the whole block, the
// buildings are cut along tilted planes and their slabs slide apart, signs flicker out, lamps topple,
// debris and glass fall, sparks and dust in the wake; the Cleave splits every unscheduled block and only
// the scheduled path stands, glowing. THE RETURN: with nothing left to cut the jaws snap shut, the shrine
// dissolves into ink flakes, the sky drains, DOMAIN CLOSED, one last cut and a flash, and the drawing is
// rubbed out from the horizon inward until the real island is what was there. The flex line is said
// on the island, over the scheduled blocks, which walk their pulse row by row.
// Card: lib/world/cutscene/cards/pr-triton-kernels-22.js. Parts: ./pr-triton-kernels-22/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, Mesh, Object3D, OctahedronGeometry, PlaneGeometry, Quaternion, Vector3 } from "three";
import { SHOT } from "../../../../lib/world/cutscene/cards/pr-triton-kernels-22";
import { turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { NB, ROWS } from "../../monuments/parts/schedule-layout";
import { registerWarm, takeWarm } from "../prewarm";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { flashQuad, holdFlash, islandList, pupParts } from "./p-caustic/parts";
import { LAMPS, buildCity, lampGeometry } from "./pr-triton-kernels-22/city";
import { hide, inkLettering, inst, mat, put, putQ, slashMaterial } from "./pr-triton-kernels-22/fx";
import { K, Mesher, hash, inkMaterial, inkUniforms } from "./pr-triton-kernels-22/ink";
import { anosEyes, inkPup } from "./pr-triton-kernels-22/pup";
import { HINGE, MOUTH, buildShrine } from "./pr-triton-kernels-22/shrine";
import { groundGeometry, groundMaterial, skyGeometry, skyMaterial } from "./pr-triton-kernels-22/sky";

const NOMOVE = [0, 0, 0, 1];
// the triangle of ice blocks: row q holds blocks 0..q; scheduled iff ROWS[q] has it
const CELLS = [];
for (let q = 0; q < NB; q++) for (let k = 0; k <= q; k++) CELLS.push({ q, k, on: ROWS[q].includes(k) });
const CUT = CELLS.filter((c) => !c.on);
const C = 0.34;
const GAP = 0.035;
const TRI_AT = [4.4, 0, -3.6]; // city frame
const bx = (c) => (c.k - c.q / 2) * (C + GAP);
const by = (c) => (NB - 1 - c.q) * (C + GAP) + C / 2;
const TRI_H = NB * (C + GAP);

const SL = 240;
const SP = 160;
const DB = 90;
const GL = 90;
const DU = 56;
const FK = 130;
// the clock (s from the arrival); the card's beats put line A at 2.7, line B at 5.6, the flex at 9.4
const T = {
  draw: [1.2, 2.7], sky: [1.2, 2.4], pool: [2.0, 4.6], rise: [1.9, 3.3], tri: [3.4, 4.6], point: [4.9, 5.1], barrage: 5.4, barrageEnd: 8.0,
  cutTri: 6.3, land: 7.55, lit: 7.35, close: [8.1, 8.3], dis: [8.45, 9.2], drain: [8.3, 9.0], letters: [8.3, 9.5], final: 8.85, erase: [8.95, 9.65],
};

// THE PACING (owner: events were too fast to read). The picture was drawn on a 14 s clock `u`; the real clock
// `t` runs it slower where the words and the beats need holding: line A stays up 5.4 s, the barrage breathes at
// 2.5x, the return at 2x, and the flex and the credit hold on the island. Pure piecewise-linear, both ways.
const WARP = [[0, 0], [2.7, 2.7], [8.1, 5.4], [14.6, 8.0], [17.9, 9.65]];
const warp = (t) => {
  for (let i = 1; i < WARP.length; i++) if (t < WARP[i][0]) return WARP[i - 1][1] + ((t - WARP[i - 1][0]) * (WARP[i][1] - WARP[i - 1][1])) / (WARP[i][0] - WARP[i - 1][0]);
  const e = WARP[WARP.length - 1];
  return e[1] + t - e[0];
};

// the sign is up from t 1.3 to 7.8 s (6.5 s; "Domain Expansion." is up from 2.7 to 8.1)
const HANDS = [1.3, 7.8];
const V = new Vector3();
const W = new Vector3();
const QA = new Quaternion();
const QB = new Quaternion();
const AXZ = new Vector3(0, 0, 1);
const O = new Object3D();
const COL = new Color();

function blockGeometry() {
  const M = new Mesher();
  M.box(0, 0, 0, 1, 1, 1, [K.ice, 0.8, 0, 0.5]);
  return M.geometry();
}
// a right-triangle prism: half of an ice block cut along its diagonal
function wedgeGeometry() {
  const M = new Mesher();
  const a = [-0.5, -0.5];
  const b = [0.5, -0.5];
  const c = [-0.5, 0.5];
  const f = (p, z) => [p[0], p[1], z];
  const info = [K.ice, 0.8, 0, 0.5];
  const mid = [-0.17, -0.17, 0];
  M.poly([f(a, 0.5), f(b, 0.5), f(c, 0.5)], info, NOMOVE, 0, mid);
  M.poly([f(a, -0.5), f(c, -0.5), f(b, -0.5)], info, NOMOVE, 0, mid);
  M.poly([f(a, 0.5), f(a, -0.5), f(b, -0.5), f(b, 0.5)], info, NOMOVE, 0, mid);
  M.poly([f(b, 0.5), f(b, -0.5), f(c, -0.5), f(c, 0.5)], info, NOMOVE, 0, mid);
  M.poly([f(c, 0.5), f(c, -0.5), f(a, -0.5), f(a, 0.5)], info, NOMOVE, 0, mid);
  return M.geometry();
}
function rockGeometry() {
  const M = new Mesher();
  const c = [];
  for (const k of [-1, 1]) for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) c.push([a * 0.5 * (0.7 + 0.5 * hash(c.length, 1)), k * 0.5 * (0.6 + 0.6 * hash(c.length, 2)), b * 0.5 * (0.7 + 0.5 * hash(c.length, 3))]);
  M.hexa(c, (f) => (f < 2 ? [K.cut, 0.95, 0, 0.2] : [K.window, 0.45, 0, 0.3]), NOMOVE);
  return M.geometry();
}
function puffGeometry() {
  const M = new Mesher();
  const P = new IcosahedronGeometry(0.5, 0).attributes.position;
  for (let i = 0; i < P.count; i += 3) M.poly([0, 1, 2].map((k) => [P.getX(i + k), P.getY(i + k), P.getZ(i + k)]), [K.bone, 0.93, 0, 0.5], NOMOVE, 0b111, [0, 0, 0]);
  return M.geometry();
}

function buildWorld() {
    const U = inkUniforms();
    const city = buildCity();
    const sh = buildShrine();
    const mats = {
      city: inkMaterial(U),
      shrine: inkMaterial(U, { shrine: true }),
      blocks: inkMaterial({ ...U, uReveal: { value: 999 } }),
      ground: groundMaterial(U),
      sky: skyMaterial(U),
      slash: slashMaterial(),
      spark: mat({}),
      glint: mat({ color: "#f4efe2" }),
      flake: mat({}),
    };
    const geo = { city: city.geometry, lamp: lampGeometry(), rock: rockGeometry(), puff: puffGeometry(), block: blockGeometry(), wedge: wedgeGeometry(), plane: new PlaneGeometry(1, 1), oct: new OctahedronGeometry(1, 0) };
    const cityMesh = new Mesh(geo.city, mats.city);
    const body = new Mesh(sh.body, mats.shrine);
    const jaw = new Mesh(sh.jaw, mats.shrine);
    const ground = new Mesh(groundGeometry(), mats.ground);
    const skyM = new Mesh(skyGeometry(), mats.sky);
    for (const o of [cityMesh, body, jaw, ground, skyM]) o.frustumCulled = false;
    ground.renderOrder = -1;
    skyM.renderOrder = -3;
    // the shrine's skulls and bones, instanced
    const setAll = (mesh, list) => {
      list.forEach((q, i) => {
        O.position.set(q.x, q.y, q.z);
        O.rotation.set(q.rx, q.ry, q.rz);
        O.scale.setScalar(q.s);
        O.updateMatrix();
        mesh.setMatrixAt(i, O.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    const skulls = inst(sh.skull, mats.shrine, sh.skulls.length);
    const bones = inst(sh.bone, mats.shrine, sh.bones.length);
    setAll(skulls, sh.skulls);
    setAll(bones, sh.bones);
    const lamps = inst(geo.lamp, mats.city, LAMPS.length);
    const debris = inst(geo.rock, mats.city, DB);
    const dust = inst(geo.puff, mats.city, DU);
    const blocks = inst(geo.block, mats.blocks, CELLS.length);
    const wedges = inst(geo.wedge, mats.blocks, CUT.length * 2);
    for (let i = 0; i < CELLS.length; i++) blocks.setColorAt(i, COL.setRGB(0, 0, 0));
    for (let i = 0; i < CUT.length * 2; i++) wedges.setColorAt(i, COL.setRGB(0, 0, 0));
    const slashes = inst(geo.plane, mats.slash, SL);
    for (let i = 0; i < SL; i++) slashes.setColorAt(i, COL.setRGB(i % 5 === 1 ? 1 : 0, 0, 0));
    slashes.renderOrder = 12;
    const sparks = inst(geo.oct, mats.spark, SP);
    for (let i = 0; i < SP; i++) sparks.setColorAt(i, COL.set(i % 3 ? "#f4efe2" : "#d1081f"));
    const glints = inst(geo.oct, mats.glint, GL);
    const flakes = inst(geo.oct, mats.flake, FK);
    for (let i = 0; i < FK; i++) flakes.setColorAt(i, COL.set(i % 5 ? "#0e0b0d" : "#b3081c"));
    const letters = inkLettering("DOMAIN CLOSED");
    const flash = flashQuad("#ece5d2");
    // the slashes: when, how long, where on the screen (half-heights from its centre), the angle, the length, the weight
    const sl = Array.from({ length: SL }, (_, i) => {
      const cleave = i % 5 === 1;
      const tri = i % 4 === 1; // these strike the triangle
      const t0 = tri ? T.cutTri + hash(i, 3) * 0.85 : T.barrage + (2.6 * (i + hash(i, 1) * 0.9)) / SL;
      return {
        t0,
        life: i % 8 === 0 ? 0.85 : cleave ? 0.2 : 0.14,
        cx: (hash(i, 4) - 0.5) * 2.2,
        cy: (hash(i, 5) - 0.5) * 1.9,
        ang: (hash(i, 6) - 0.5) * 1.6 + (i % 2 ? 0.75 : -0.75),
        len: cleave ? 1.2 + 1.1 * hash(i, 7) : 0.55 + 1.1 * hash(i, 7),
        wid: cleave ? 0.026 + 0.03 * hash(i, 8) : 0.005 + 0.007 * hash(i, 8),
        tri,
      };
    });
    return { U, city, sh, mats, geo, cityMesh, body, jaw, ground, skyM, skulls, bones, lamps, debris, dust, blocks, wedges, slashes, sparks, glints, flakes, letters, flash, sl };
}

// THE APPROACH: the shared prewarm (../prewarm.js) builds the world while the seal walks up; the arrival takes it.
registerWarm("pr-triton-kernels-22", buildWorld);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const rig = useRef();
  const cityG = useRef();
  const shrineG = useRef();
  const jawG = useRef();
  const mouthG = useRef();
  const triG = useRef();
  const pupRef = useRef(null);
  const ink = useRef(null);
  const eyes = useRef(null);
  const island = useRef([]);
  SHOT.pup.x = live.seal.x;
  SHOT.pup.z = live.seal.z;

  const m = useMemo(() => takeWarm("pr-triton-kernels-22", buildWorld), []);

  // the pup's ink twin, the Anos eyes, the island list (taken before the stage hides it)
  useEffect(() => {
    island.current = islandList(scene);
    const p = pupParts(scene);
    pupRef.current = p;
    ink.current = p?.root ? inkPup(p.root, m.U) : null;
    eyes.current = p?.head ? anosEyes(p.head) : null;
    // pre-compile every program before the first frame (the rig is hidden, so show it for the call)
    const g = rig.current;
    if (g) {
      const was = g.visible;
      const sv = shrineG.current.visible;
      g.visible = shrineG.current.visible = true;
      try {
        gl.compile(g, camera);
        gl.compile(scene, camera);
      } catch (e) {
        void e; // a failed pre-compile only costs a hitch, never the scene
      }
      g.visible = was;
      shrineG.current.visible = sv;
    }
    return () => {
      ink.current?.dispose();
      eyes.current?.dispose();
      ink.current = eyes.current = pupRef.current = null;
      const { geo, mats, sh } = m;
      for (const g of [...Object.values(geo), sh.body, sh.jaw, sh.skull, sh.bone, m.ground.geometry, m.skyM.geometry, m.letters.geometry, m.flash.geometry]) g.dispose();
      for (const x of [...Object.values(mats), m.letters.material, m.flash.material]) x.dispose();
      m.letters.material.map?.dispose();
      for (const x of [m.skulls, m.bones, m.lamps, m.debris, m.dust, m.blocks, m.wedges, m.slashes, m.sparks, m.glints, m.flakes]) x.dispose();
    };
  }, [scene, m, gl, camera]);

  // a skip clears the arrival: nothing of the picture draws for the frame before this unmounts
  useFrame(() => {
    if (!live.arrival.id) {
      rig.current.visible = false;
      ink.current?.set(false);
      if (eyes.current) eyes.current.g.visible = false;
      for (const x of [m.slashes, m.letters, m.flash]) x.visible = false;
    }
  }, -0.5);

  // the pup stands upright through the sign, the barrage and the return (no tip on its side or back)
  useFrame(() => {
    const r = pupRef.current?.root;
    if (!r || !live.arrival.id) return;
    r.rotation.x = 0;
    r.rotation.z = 0;
  }, -0.5);

  useCutFrame((t, state) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    const cam = state.camera;
    SHOT.pup.x = s.x;
    SHOT.pup.z = s.z;
    if (!full) {
      g.visible = false;
      m.slashes.visible = m.letters.visible = m.flash.visible;
      ink.current?.set(false);
      if (eyes.current) eyes.current.g.visible = false;
      return;
    }
    const tt = warp(onTwos(t));
    const uc0 = warp(tl.collapse[0]);
    const out = 1 - smooth(uc0, warp(tl.collapse[1]), tt);
    const erase = smooth(T.erase[0], T.erase[1], tt);
    const draw = smooth(T.draw[0], T.draw[1], tt);
    const flex = warp(tl.lineC);
    const U = m.U;

    // THE SHOT pushes in, slowly, until the picture is rubbed out
    SHOT.k = smooth(0.7, 8.6, tt) * (1 - smooth(T.erase[0], T.erase[1] + 0.5, tt));

    // THE SHRINE rises out of the pool (back.out); its jaw drops on each word of line A and gapes through the barrage, then snaps shut
    const rise = smooth(T.rise[0], T.rise[1], tt);
    const bk = rise < 1 ? rise + 0.1 * Math.sin(rise * Math.PI) : 1;
    shrineG.current.position.set(0, -55 * (1 - bk), SHOT.shrineZ);
    shrineG.current.scale.setScalar(SHOT.scale);
    const dis = smooth(T.dis[0], T.dis[1], tt);
    shrineG.current.visible = rise > 0 && dis < 0.99;
    const speak = tt > tl.lineA && tt < tl.lineA + 1.0 ? (Math.floor(tt * 6) % 2 ? 0.4 : 0.1) : 0;
    const gape = smooth(T.barrage - 0.2, T.barrage + 0.2, tt) * 0.52;
    jawG.current.rotation.x = (Math.max(speak, gape) + 0.05 * rise) * (1 - smooth(T.close[0], T.close[1], tt));
    g.position.set(s.x, 0, s.z);
    g.rotation.y = turnFor(card, place, s.x, s.z);
    cityG.current.rotation.y = SHOT.yaw;
    triG.current.position.set(TRI_AT[0], TRI_AT[1], TRI_AT[2]);
    g.updateMatrixWorld(true);
    g.visible = tt > 1.12 && erase < 1;

    // the shared uniforms: the draw-in wipe from the pup, the sky's redness, the pool, the shrine's glow
    U.uT.value = tt;
    U.uDpr.value = state.gl.getPixelRatio();
    U.uReveal.value = 200 * draw * (1 - erase) - 10 * erase;
    U.uCenter.value.set(s.x, 0, s.z);
    mouthG.current.getWorldPosition(U.uMouth.value);
    cityG.current.localToWorld(U.uPoolC.value.set(0, 0, SHOT.shrineZ + 20));
    U.uPoolR.value = 115 * smooth(T.pool[0], T.pool[1], tt);
    U.uSkyK.value = smooth(1.3, 3.2, tt) * (1 - smooth(T.drain[0], T.drain[1], tt));
    U.uOffA.value = 5.6;
    U.uOffB.value = 2.8;
    U.uDis.value = dis * 0.985;
    const su = m.mats.sky.uniforms;
    su.uSkyVis.value = smooth(T.sky[0], T.sky[1], tt) * (1 - erase);
    su.uFlare.value = tt > T.barrage && tt < T.barrageEnd ? 1 : Math.max(0, 1 - Math.abs(tt - T.final - 0.05) / 0.15);
    su.uBurst.value = smooth(T.barrage, T.barrage + 0.2, tt) * (1 - smooth(T.barrageEnd, T.barrageEnd + 0.3, tt)) + Math.max(0, 1 - Math.abs(tt - tl.lineA - 0.3) / 0.5) * 0.7;

    // THE DEMON PUP: the shrine mudra; the flipper flick at the triangle; the sign again through the barrage; the fist on the flex
    const pupInk = tt >= tl.impact && tt < T.erase[0] + 0.1;
    ink.current?.set(pupInk);
    // THE ENMA-TEN MUDRA: the pup presses both flippers together before its chest (live.pose.pray), held from t HANDS[0] to HANDS[1] (6.5 s)
    const hk = smooth(HANDS[0], HANDS[0] + 0.5, t) * (1 - smooth(HANDS[1] - 0.3, HANDS[1], t));
    live.pose.sign = signAt(tl, t) * (1 - smooth(4.6, 4.9, tt) * (1 - smooth(5.8, 6.0, tt))) * (1 - smooth(T.erase[0], T.erase[0] + 0.1, tt)) * (1 - hk);
    live.pose.pray = hk;
    live.pose.point = smooth(T.point[0], T.point[1], tt) * (1 - smooth(5.5, 5.8, tt)) * out;
    live.pose.fist = smooth(flex, flex + 0.3, tt) * out;
    live.pose.demon = smooth(0.5, 1.5, tt) * (1 - smooth(T.erase[0], T.erase[0] + 0.15, tt));
    // the return: every hook released, the pup upright (upright, see the hook above) for the flex line
    if (tt >= T.erase[1]) live.pose.sign = live.pose.raise = live.pose.crouch = live.pose.fist = live.pose.pray = 0;
    if (eyes.current) {
      eyes.current.g.visible = live.pose.demon > 0.5 && pupInk;
      eyes.current.mat.uniforms.uTime.value = t;
    }

    // THE TRIANGLE of ice blocks: rises from the pool; the Cleave splits every unscheduled block along its diagonal; the schedule lights
    const appear = smooth(T.tri[0], T.tri[1], tt) * out;
    const lit = smooth(T.lit, T.lit + 0.2, tt);
    triG.current.visible = appear > 0.001;
    let ci = 0;
    for (let i = 0; i < CELLS.length; i++) {
      const c = CELLS[i];
      const x = bx(c);
      const y = by(c);
      if (c.on) {
        const ts = flex + 0.17 * c.q + 0.025 * ROWS[c.q].indexOf(c.k);
        const pulse = tt > ts && tt < ts + 0.3 ? Math.sin(((tt - ts) / 0.3) * Math.PI) : 0;
        const sc = C * appear * (1 + 0.2 * pulse);
        put(m.blocks, i, x, y - (1 - appear) * 1.5, 0, sc, sc, C * appear);
        m.blocks.setColorAt(i, COL.setRGB(lit, pulse, 0));
      } else {
        const tc = T.cutTri + hash(i, 2) * 0.35 + ((c.q + c.k) / (2 * NB)) * 0.3;
        const cutNow = tt >= tc;
        put(m.blocks, i, x, y - (1 - appear) * 1.5, 0, cutNow ? 0.0001 : C * appear, C * appear, C * appear);
        m.blocks.setColorAt(i, COL.setRGB(0, 0, 0));
        const u = Math.min(1, Math.max(0, (tt - tc) / (T.land - tc)));
        for (let h = 0; h < 2; h++) {
          const dir = h ? 1 : -1;
          const slide = 0.5 * Math.min(1, (tt - tc) / 0.25) * dir;
          const keep = cutNow ? C : 0.0001;
          put(m.wedges, ci * 2 + h, x + slide * 0.7, y - y * u * u + (cutNow ? 0 : -9), 0.05 * dir, keep, keep, C, 0, 0, (h ? Math.PI : 0) + dir * 0.3 * u * (1 - u));
          m.wedges.setColorAt(ci * 2 + h, COL.setRGB(0, 0, 0));
        }
        ci++;
      }
    }
    m.blocks.instanceMatrix.needsUpdate = m.wedges.instanceMatrix.needsUpdate = true;
    m.blocks.instanceColor.needsUpdate = m.wedges.instanceColor.needsUpdate = true;

    // THE LAMPS topple toward the avenue, accelerating, with a bounce
    for (let i = 0; i < LAMPS.length; i++) {
      const l = LAMPS[i];
      const t0 = 5.75 + 0.1 * i;
      const k = Math.min(1, Math.max(0, (tt - t0) / 0.95));
      const th = 1.46 * k * k + (k >= 1 ? 0.07 * Math.exp(-(tt - t0 - 0.95) * 6) * Math.cos((tt - t0) * 22) : 0);
      O.position.set(l.x, 0, l.z);
      O.rotation.set(0, l.side > 0 ? Math.PI : 0, l.side * th, "ZYX");
      O.scale.setScalar(1);
      O.updateMatrix();
      m.lamps.setMatrixAt(i, O.matrix);
    }
    m.lamps.instanceMatrix.needsUpdate = true;

    // sparks, glass, dust, debris, ink flakes: all a pure function of the clock
    const cuts = m.city.cuts;
    for (let i = 0; i < SP; i++) {
      const near = i >= 110;
      const c = near ? null : cuts[i % cuts.length];
      const ts = near ? T.cutTri + hash(i, 1) * 0.9 : c.t + hash(i, 1) * 0.6;
      const tau = tt - ts;
      if (tau < 0 || tau > 0.9) {
        hide(m.sparks, i);
        continue;
      }
      const ox = near ? TRI_AT[0] + (hash(i, 2) - 0.5) * 3.4 : c.x + (hash(i, 2) - 0.5) * c.w;
      const oy = near ? 0.3 + hash(i, 3) * 3.4 : c.y + (hash(i, 3) - 0.5) * 5;
      const oz = near ? TRI_AT[2] + 0.3 : c.z + (hash(i, 4) - 0.2) * c.w * 0.5;
      const sp = near ? 3 : 9;
      const q = 0.2 * (1 - tau / 0.9) * (near ? 0.35 : 1);
      put(m.sparks, i, ox + (hash(i, 5) - 0.5) * sp * tau, oy + (2 + 5 * hash(i, 6)) * tau - 4.5 * tau * tau, oz + (hash(i, 7) - 0.5) * sp * tau, q * 0.6, q * 1.6, q * 0.6, tau * 6, tau * 4, hash(i, 8) * 3);
    }
    m.sparks.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < GL; i++) {
      const tau = tt - (T.barrage + 0.3 + hash(i, 1) * 2.4);
      if (tau < 0 || tau > 1.3) {
        hide(m.glints, i);
        continue;
      }
      const q = 0.34 * Math.abs(Math.sin(tau * 21 + hash(i, 2) * 9)) * (1 - tau / 1.3);
      put(m.glints, i, (hash(i, 3) - 0.5) * 62, 8 + hash(i, 4) * 34 - 7 * tau, -10 - hash(i, 5) * 40 + Math.sin(tau * 3 + i) * 0.6, q * 0.5, q * 1.5, q * 0.5, 0, tau * 3, 0.4);
    }
    m.glints.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < DB; i++) {
      const c = cuts[i % cuts.length];
      const tau = tt - (c.t + 0.25 + hash(i, 1) * 0.5);
      if (tau < 0) {
        hide(m.debris, i);
        continue;
      }
      const sz = 0.7 + 1.8 * hash(i, 2);
      const run = Math.min(tau, 1.6);
      const y = Math.max(sz * 0.4, c.y + (1 + 3 * hash(i, 5)) * tau - 4.9 * tau * tau);
      const rest = y <= sz * 0.4 + 0.01;
      put(m.debris, i, c.x + (hash(i, 6) - 0.5) * c.w * 0.7 + (hash(i, 3) - 0.5) * 9 * run, y, c.z + (hash(i, 7) - 0.1) * c.w * 0.4 + (hash(i, 4) - 0.2) * 6 * run, sz, sz * 0.8, sz, rest ? 0.3 : tau * 2.4, hash(i, 8) * 6, rest ? 0.2 : tau * 1.9);
    }
    m.debris.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < DU; i++) {
      const c = cuts[i % cuts.length];
      const tau = (tt - (c.t + 0.55 + hash(i, 1) * 0.5)) / 2.0;
      if (tau < 0 || tau > 1) {
        hide(m.dust, i);
        continue;
      }
      const sz = (3 + 5 * hash(i, 2)) * Math.sqrt(tau) * (1 - tau * tau);
      put(m.dust, i, c.x + (hash(i, 3) - 0.5) * c.w * 0.9, sz * 0.35, c.z + (hash(i, 4) - 0.1) * c.w * 0.6, sz, sz * 0.7, sz, hash(i, 5), tau * 0.6, 0);
    }
    m.dust.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < FK; i++) {
      const tau = tt - (T.dis[0] + hash(i, 1) * 0.75);
      if (tau < 0 || tau > 1.3) {
        hide(m.flakes, i);
        continue;
      }
      const q = 0.5 * Math.sqrt(1 - tau / 1.3);
      put(m.flakes, i, (hash(i, 2) - 0.5) * 48 + 2 * tau, 5 + hash(i, 3) * 36 + (3 + 5 * hash(i, 4)) * tau, SHOT.shrineZ + (hash(i, 5) - 0.4) * 24, q, q * 1.4, q * 0.3, tau * 3, tau * 2, hash(i, 6) * 6);
    }
    m.flakes.instanceMatrix.needsUpdate = true;

    // THE BARRAGE: tapered strokes drawn flat to the lens, on twos. Those aimed at the triangle strike where it stands on screen.
    const tanF = Math.tan((cam.fov * Math.PI) / 360);
    const D = 20;
    const asp = state.size.width / state.size.height;
    V.set(s.x, 0.6, s.z).project(cam);
    const pupX = V.x * asp;
    const pupY = V.y;
    triG.current.localToWorld(W.set(0, TRI_H * 0.5, 0)).project(cam);
    const triX = W.x * asp;
    const triY = W.y;
    for (let i = 0; i < SL; i++) {
      const q = m.sl[i];
      const tau = tt - q.t0;
      const final = i === 0;
      if (final ? tt < T.final || tt > T.final + 0.34 : tau < 0 || tau > q.life || tt > T.barrageEnd + 0.4) {
        hide(m.slashes, i);
        continue;
      }
      let hx = final ? 0 : q.tri ? triX + (hash(i, 9) - 0.5) * 0.9 : q.cx * asp * 0.95;
      const hy = final ? 0.04 : q.tri ? triY + (hash(i, 10) - 0.5) * 0.8 : q.cy * 0.95;
      if (!final && !q.tri && Math.abs(hx - pupX) < 0.34 && Math.abs(hy - pupY) < 0.42) hx += (hx < pupX ? -1 : 1) * 0.75;
      const grow = final ? Math.min(1, (tt - T.final) / 0.06) : Math.min(1, tau / 0.05);
      const len = (final ? 3.9 : q.len) * grow;
      const wid = final ? 0.12 : q.wid;
      V.set(hx * D * tanF, hy * D * tanF, -D).applyQuaternion(cam.quaternion).add(cam.position);
      QB.setFromAxisAngle(AXZ, final ? -0.55 : q.ang);
      QA.copy(cam.quaternion).multiply(QB);
      putQ(m.slashes, i, V, QA, len * D * tanF, wid * D * tanF);
    }
    m.slashes.instanceMatrix.needsUpdate = true;
    m.slashes.visible = true;

    // DOMAIN CLOSED: the lettering pops on the close, judders on twos, flat to the lens
    const lt = tt - T.letters[0];
    m.letters.visible = lt > 0 && tt < T.letters[1];
    if (m.letters.visible) {
      const pop = Math.min(1, lt / 0.1) * (1 + 0.22 * Math.max(0, 1 - lt / 0.2));
      const odd = Math.floor(t * 12) % 2 ? 1 : -1;
      const wH = Math.min(1.9, asp * 1.7) * pop;
      V.set(0.03 * odd * D * tanF, 0.56 * D * tanF, -D).applyQuaternion(cam.quaternion).add(cam.position);
      m.letters.position.copy(V);
      m.letters.quaternion.copy(cam.quaternion);
      m.letters.scale.set(wH * D * tanF, wH * D * tanF, 1);
    }
    // the flash: the last cut tears the page (tinted, never a white-out), a little at the impact and the barrage's start
    const fl = Math.max(0, 1 - Math.abs(tt - T.final - 0.06) / 0.1) * 0.5 + Math.max(0, 1 - Math.abs(tt - T.barrage) / 0.1) * 0.16 + Math.max(0, 1 - Math.abs(tt - tl.impact - 0.05) / 0.08) * 0.2;
    holdFlash(m.flash, cam, fl);

    // THE RETURN: the picture is rubbed out from the horizon in (the shaders' reveal, above); the island comes back behind it
    // the island is held under the fading drawing from just before the rub-out, so the screen is never the ring alone
    if (tt > T.erase[0] - 0.3 && tt < uc0) for (const o of island.current) o.visible = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.slashes} />
      <primitive object={m.letters} />
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <primitive object={m.skyM} />
        <group ref={cityG}>
          <primitive object={m.ground} />
          <primitive object={m.cityMesh} />
          <primitive object={m.lamps} />
          <primitive object={m.debris} />
          <primitive object={m.dust} />
          <primitive object={m.sparks} />
          <primitive object={m.glints} />
          <primitive object={m.flakes} />
          <group ref={shrineG} position={[0, 0, SHOT.shrineZ]} visible={false}>
            <primitive object={m.body} />
            <primitive object={m.skulls} />
            <primitive object={m.bones} />
            <group ref={jawG} position={HINGE}>
              <primitive object={m.jaw} />
            </group>
            <group ref={mouthG} position={MOUTH} />
          </group>
          <group ref={triG}>
            <primitive object={m.blocks} />
            <primitive object={m.wedges} />
          </group>
        </group>
      </group>
    </>
  );
}
