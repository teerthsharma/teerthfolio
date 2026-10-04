// pr-tensorflow-124410: JoJo's Bizarre Adventure, the dam, in HIROHIKO ARAKI's own dimension: flat psychedelic
// palette swaps every beat (violet dusk, citrus, magenta, cyan and orange), a three-step cel with diagonal ink
// hatching, bold hard-edged diagonal shadows cut across the frame, thick black outlines, and a stormy dusk sky
// ringed like a bullseye. The island is replaced by the DAM: a long concrete crest with a railing and lamp posts,
// the reservoir behind it, a faceted valley and a far ring of mountains, a valve tower standing out of the water,
// and a gantry of two fluted pylons that carries FOUR control edges (three mint, one coral and longer, hung out
// over the water). Framed like a JoJo cover from a low lens, with the colour-inverted panel cutting the sky on
// every impact. ゴゴゴゴ, hand-lettered as mesh strokes, rises around the pup. A rival silhouette on the tower
// speaks (a mocking "Oh? You're approaching me?"). The pup's own STAND stands up behind it, a seal-helmeted
// bruiser, and throws the MUDA barrage: a fan of fist afterimages on twos at the coral edge, the crest shaking,
// the coral edge cracking into three. Then THE TIME-STOP: the beat freezes, every colour inverts, a clock-tick
// plays, a giant clock stands in the sky with its minute hand one tick from twelve, and the spray over the
// reservoir hangs in the air. Time resumes: the coral edge falls and drowns (a ring on the water, a burst of
// spray) while the three that remain glow; the minute hand drops on twelve with a TICK and the whole picture TEARS
// off like a poster along a ragged diagonal, which is why we are home: the stopped second is over. In the real
// island the pup strikes the JoJo pose (twisted, a flipper across the face) and says the flex line; the credit card.
// Cost: ~30 draw calls (outlined parts are instanced pairs), no post pass, nothing allocated per frame.
// Card: lib/world/cutscene/cards/pr-tensorflow-124410.js. Parts: ./pr-tensorflow-124410/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BackSide, BoxGeometry, AdditiveBlending, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, OctahedronGeometry, PlaneGeometry, Quaternion, Vector3, WebGLRenderTarget } from "three";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { CLOCK, clockGeometry, dropGeometry, handGeometry, inkPup, ticker } from "./pr-tensorflow-124410/extras";
import { glyphs } from "./pr-tensorflow-124410/glyphs";
import { R, hash, merge, part, setPalette, sharedUniforms, solidMaterial } from "./pr-tensorflow-124410/ink";
import { rivalGeometry } from "./pr-tensorflow-124410/rival";
import { reservoir, skyShell } from "./pr-tensorflow-124410/sky";
import { fistGeometry, standGeometry } from "./pr-tensorflow-124410/stand";
import { TOWER, WY, crestGeometry, lampGeometry, pylonGeometry, terrain } from "./pr-tensorflow-124410/world";
import { registerWarm, takeWarm } from "../prewarm";

const CORE_Y = 0.9;
const K = 0.74; // the dimension is built at 1:1 and shown at 0.74 beside a pup grown to PUP, so the pup reads at the lens
const PUP = 1.7;
// the clock (s from the arrival). Line A (the rival) is up at 3.0; the barrage 3.5 to 5.0; the stop 5.0 to 6.2; the
// edge falls on the resume and drowns by 6.9; the clock's last tick and the tear at 6.95; the flex at 7.2.
const T = { glyph: 1.5, rise: [1.9, 2.9], rival: 2.4, barrage: [3.5, 5.0], crack: [3.9, 4.9], stop: 5.0, resume: 7.2, fall: 7.2, drown: 7.85, tick: 8.0, tear: [8.15, 8.95], flex: 8.5 };
// the palette beats: [t, palette]
const BEATS = [[0, 0], [1.9, 1], [2.6, 2], [3.4, 3], [3.9, 2], [4.4, 1], [4.8, 3], [5.0, 0], [7.2, 2], [7.55, 3], [7.8, 1]];
const PANELS = [[2.4, 0.64, 0.58], [3.5, 0.4, 0.66], [7.2, 0.7, 0.55], [7.62, 0.5, 0.6]]; // [t, x, y]: where the inverted sky panel cuts in
const FREEZE = [T.stop, T.resume];
const STAND_AT = new Vector3(-0.3, 0, -5.2);
const PX = 6.4; // the pylons' x on a wide screen
const GZ = -8.6; // the gantry's plane: out over the reservoir
const BEAM_Y = [4.3, 5.4, 6.5];
const CORAL = { y: 7.75, z: GZ + 1.1 };
const JABS = 72; // dozens of afterimages, thirty-six per fist
const SPRAY = 130;
const GLYPHS = 30;
const AURA = ["#22d3ee", "#fde047", "#f0abfc", "#fb923c"]; // the Stand's glow follows the palette beat
const ROLL = [[0, 0], [1.9, -0.12], [2.4, 0.2], [3.5, -0.2], [3.9, 0.2], [4.4, -0.2], [4.8, 0.2], [5.0, -0.22], [7.2, 0.2], [7.62, -0.2], [8.2, 0.1], [8.5, 0]]; // the diagonal lens, a hard cut every beat (radians)
const SPARKS = 18;

const O = new Object3D();
const Qa = new Quaternion();
const V = new Vector3();
const D = new Vector3();
const X1 = new Vector3(1, 0, 0);
const Z1 = new Vector3(0, 0, 1);
const Y1 = new Vector3(0, 1, 0);

// an outlined instanced pair: the fill and its ink hull share one matrix buffer
function pair(geo, U, n, fillOpts = {}) {
  const fill = new InstancedMesh(geo, solidMaterial(U, fillOpts), n);
  const hull = new InstancedMesh(geo, solidMaterial(U, { hull: true }), n);
  hull.instanceMatrix = fill.instanceMatrix;
  for (const m of [fill, hull]) m.frustumCulled = false;
  return { fill, hull };
}
function put(m, i, x, y, z, sx, sy = sx, sz = sx, q) {
  O.position.set(x, y, z);
  if (q) O.quaternion.copy(q);
  else O.rotation.set(0, 0, 0);
  O.scale.set(sx, sy, sz);
  O.updateMatrix();
  m.setMatrixAt(i, O.matrix);
}
// a solid mesh and its ink hull, one geometry
function solidPair(geo, U, opts) {
  const a = new Mesh(geo, solidMaterial(U, opts));
  const b = new Mesh(geo, solidMaterial(U, { hull: true }));
  a.frustumCulled = b.frustumCulled = false;
  return [a, b];
}

// The world, built by the shared prewarm (cutscene/prewarm.js) while the seal walks up to the dock.
function buildWorld() {
  const U = sharedUniforms();
  const shell = skyShell(U);
  const water = reservoir(U);
  const land = terrain();
  const landM = solidMaterial(U, { rim: 0 });
  const crestG = crestGeometry();
  const crest = solidPair(crestG, U);
  const lampG = lampGeometry();
  const lampM = solidMaterial(U, { glow: 1, haze: 0, rim: 0 });
  const pylG = pylonGeometry(BEAM_Y.concat([CORAL.y]));
  const pyl = [solidPair(pylG, U), solidPair(pylG, U)];
  const standG = standGeometry();
  const stand = solidPair(standG, U);
  const aura = new Mesh(standG, new MeshBasicMaterial({ color: AURA[0], side: BackSide, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
  aura.frustumCulled = false;
  aura.scale.setScalar(1.1);
  const rivalG = rivalGeometry();
  const rival = new Mesh(rivalG, solidMaterial(U, { rim: 1 }));
  rival.frustumCulled = false;
  const beamG = merge([part(new BoxGeometry(1, 1, 1), R.mint)]);
  const mint = pair(beamG, U, 3, { glow: 0.2, haze: 0, rim: 0 });
  const coralG = merge([part(new BoxGeometry(1, 1, 1), R.coral)]);
  const coral = pair(coralG, U, 4, { glow: 0.3, haze: 0, rim: 0 });
  const fistG = fistGeometry();
  const fists = pair(fistG, U, JABS, { glow: 0.45, haze: 0, rim: 0 });
  const dropG = dropGeometry();
  const spray = new InstancedMesh(dropG, solidMaterial(U, { glow: 0.3, haze: 0, rim: 0 }), SPRAY);
  spray.frustumCulled = false;
  const sparkG = merge([part(new OctahedronGeometry(1, 0), R.cream, { sx: 0.4, sz: 0.4 })]);
  const sparks = new InstancedMesh(sparkG, solidMaterial(U, { glow: 1, haze: 0, rim: 0 }), SPARKS);
  sparks.frustumCulled = false;
  const clockG = clockGeometry();
  const clockM = solidMaterial(U, { haze: 0 });
  const clockH = solidMaterial(U, { hull: true });
  const minG = handGeometry(5.6, 0.34, R.ink);
  const hourG = handGeometry(3.5, 0.5, R.ink);
  const glyph = glyphs(U, GLYPHS, R.coral);
  const flashG = new PlaneGeometry(1, 1);
  const flash = new Mesh(flashG, new MeshBasicMaterial({ color: "#fff0d8", transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false }));
  flash.frustumCulled = false;
  flash.renderOrder = 40;
  return { U, aura, shell, water, land, landM, crestG, crest, lampG, lampM, pylG, pyl, standG, stand, rivalG, rival, mint, coral, fists, fistG, dropG, spray, sparkG, sparks, clockG, clockM, clockH, minG, hourG, glyph, flash, flashG, beamG, coralG };
}
registerWarm("pr-tensorflow-124410", buildWorld);

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const rig = useRef();
  const shellRef = useRef();
  const world = useRef();
  const standRef = useRef();
  const pylL = useRef();
  const pylR = useRef();
  const clockRef = useRef();
  const hourRef = useRef();
  const minRef = useRef();
  const menace = useRef();
  const pup = useRef(null);
  const ink = useRef(null);
  const island = useRef([]);
  const shake = useRef(new Vector3());
  const state = useRef({ pal: -1, shift: 0, tick1: false, tick2: false, tick3: false });
  const tickSnd = useRef(null);

  const m = useMemo(() => takeWarm("pr-tensorflow-124410", buildWorld), []);

  useEffect(() => {
    island.current = scene.children.filter((o) => o.visible && !o.isLight && o.name !== "cutscene" && o.name !== "seal");
    const root = scene.getObjectByName("seal");
    pup.current = root ? { root } : null;
    ink.current = root ? inkPup(root, m.U) : null;
    tickSnd.current = ticker();
    // compile every program now, under the approach, not on the bloom: show it all for one gl.compile, then hide it again
    const g = rig.current;
    const vis = [g, world.current, standRef.current, clockRef.current, menace.current, m.flash, shellRef.current];
    const was = vis.map((o) => o.visible);
    vis.forEach((o) => (o.visible = true));
    ink.current?.set(true);
    const rt = new WebGLRenderTarget(8, 8);
    try {
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(rt);
      gl.render(scene, camera); // one real draw into a tiny target: programs compile and the buffers upload now
      gl.setRenderTarget(prev);
    } catch {
      /* a failed warm-up only costs the first-frame hitch */
    }
    rt.dispose();
    ink.current?.set(false);
    vis.forEach((o, i) => (o.visible = was[i]));
    return () => {
      ink.current?.dispose();
      ink.current = null;
      pup.current?.root.scale.setScalar(1);
      camera.up.set(0, 1, 0); // the diagonal lens ends with the scene, however it ends
      pup.current = null;
      tickSnd.current?.dispose();
      tickSnd.current = null;
      // everything the scene built goes with it
      const geos = new Set([m.shell.g, m.water.g, m.land, m.crestG, m.lampG, m.pylG, m.standG, m.rivalG, m.beamG, m.coralG, m.fistG, m.dropG, m.sparkG, m.clockG, m.minG, m.hourG, m.glyph.ink.geometry, m.glyph.fill.geometry, m.flashG]);
      const mats = new Set([m.shell.m, m.water.m, m.landM, m.lampM, m.rival.material, m.spray.material, m.sparks.material, m.clockM, m.clockH, m.glyph.ink.material, m.glyph.fill.material, m.flash.material, m.aura.material]);
      for (const o of [...m.crest, ...m.stand, ...m.pyl.flat(), m.mint.fill, m.mint.hull, m.coral.fill, m.coral.hull, m.fists.fill, m.fists.hull]) mats.add(o.material);
      geos.forEach((g) => g.dispose());
      mats.forEach((x) => x.dispose());
      for (const x of [m.mint.fill, m.mint.hull, m.coral.fill, m.coral.hull, m.fists.fill, m.fists.hull, m.spray, m.sparks, m.glyph.ink, m.glyph.fill]) x.dispose();
    };
  }, [scene, gl, camera, m]);

  // the impacts shake the whole frame, two drawings each: the dimension and the pup together (after Seal.jsx places it).
  // The JoJo pose at the end is a shape on the pup's own root. A skip clears the arrival: nothing draws after it.
  useFrame((st) => {
    const p = pup.current;
    if (!live.arrival.id) {
      rig.current.visible = false;
      menace.current.visible = false;
      camera.up.set(0, 1, 0);
      ink.current?.set(false); // every frame with no arrival: the pup is back on its own materials, at scale 1, shown
      if (p?.root) {
        p.root.scale.setScalar(1);
        p.root.visible = true;
      }
      return;
    }
    if (!p?.root || mode !== "full") return;
    const t = st.clock.elapsedTime - live.arrival.start;
    p.root.position.add(shake.current);
    p.root.scale.setScalar(1 + (PUP - 1) * smooth(tl.bloom[0], tl.bloom[1], t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t)));
    const k = smooth(T.flex - 0.05, T.flex + 0.2, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    // the pose: a twisted contrapposto, shoulders one way and hips the other, leaning back, a flipper across the face
    p.root.rotation.y -= 0.55 * k;
    p.root.rotation.z -= 0.14 * k;
    p.root.rotation.x -= 0.08 * k;
    p.root.position.y += 0.07 * k;
  }, -0.5);

  useCutFrame((t, st) => {
    const U = m.U;
    const S = state.current;
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    menace.current.visible = full;
    m.flash.visible = false;
    if (!full) {
      ink.current?.set(false);
      shake.current.set(0, 0, 0);
      return;
    }
    const tt = onTwos(t);
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    const cam = st.camera;
    // THE DIAGONAL LENS: the camera rolls about its own view axis (the rig's lookAt honours camera.up), cutting on twos
    let roll = 0;
    for (const [rt, rv] of ROLL) if (tt >= rt) roll = rv;
    cam.getWorldDirection(D);
    V.copy(D).cross(Y1).normalize();
    cam.up.copy(Y1).multiplyScalar(Math.cos(roll)).addScaledVector(V, Math.sin(roll)).normalize();
    const wide = st.size.width / st.size.height >= 1;
    const fit = wide ? 1 : 0.62;
    // THE WORLD CLOCK: it stops for the time-stop (the pup and the Stand stay free), then runs on
    const wt = tt < FREEZE[0] ? tt : tt < FREEZE[1] ? FREEZE[0] : tt - (FREEZE[1] - FREEZE[0]);
    const stopped = tt >= FREEZE[0] && tt < FREEZE[1];
    const torn = tt >= T.tear[0];

    // the shared uniforms
    const dpr = st.gl.getPixelRatio();
    U.uRes.value.set(st.size.width * dpr, st.size.height * dpr);
    U.uCell.value = 7 * dpr;
    U.uTime.value = wt;
    U.uInvert.value = stopped ? 1 : 0;
    // the palette swaps every beat (a hard cut on twos), the shadow bands step with it
    let pi = 0;
    let shift = 0;
    for (let i = 0; i < BEATS.length; i++) {
      if (tt >= BEATS[i][0]) {
        pi = BEATS[i][1];
        shift = i;
      }
    }
    if (S.pal !== pi || S.shift !== shift) {
      setPalette(U, pi);
      U.uShift.value = shift;
      S.pal = pi;
      S.shift = shift;
    }
    // the inverted sky panel on each impact, two drawings
    U.uPanel.value.w = 0;
    for (const [pt, px, py] of PANELS) {
      const d = tt - pt;
      if (d >= 0 && d < 0.34) U.uPanel.value.set(px, py, 0.2 + 0.08 * Math.floor(d * 12), d < 0.17 ? 1 : 0.7);
    }
    // the tear: a ragged diagonal sweeps lower left to upper right and takes the dimension with it
    const tearK = smooth(T.tear[0], T.tear[1], tt);
    U.uTear.value = torn ? -0.12 + 1.75 * tearK : -1;
    const gone = torn && tearK >= 1;

    // the rig: the pup at the origin, turned so the dam stands where the card says
    const turn = turnFor(card, place, s.x, s.z);
    const hit = (h, k) => (tt >= h && tt < h + 0.17 ? k : 0);
    const barr = smooth(T.barrage[0], T.barrage[0] + 0.1, tt) * (1 - smooth(T.stop - 0.05, T.stop, tt));
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;
    const amp = barr * 0.07 + hit(T.rival, 0.07) + hit(T.drown, 0.12) + hit(T.tick, 0.1);
    shake.current.set(amp * odd, -amp * 0.6 * odd, 0);
    g.position.set(s.x + shake.current.x, shake.current.y, s.z);
    g.rotation.y = turn;
    menace.current.position.copy(g.position);
    menace.current.rotation.y = turn;

    // THE WORLD swells out of the pup with the stage, then holds as the backdrop until it tears
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    shellRef.current.visible = r > 0.02 && !gone;
    shellRef.current.scale.setScalar(inside || torn ? 140 : Math.max(r, 0.02));
    m.shell.m.uniforms.uAlpha.value = inside ? 1 : 0.9;
    world.current.visible = (inside || torn) && !gone;

    // THE PUP wears the dimension's line from the bloom until the tear starts
    ink.current?.set((inside || tt > tl.bloom[1]) && !torn);

    // the dam itself judders on twos in the barrage and at the drowning
    const quake = barr * 0.05 + hit(T.drown, 0.08);
    world.current.position.set(quake * odd, quake * 0.5 * odd, 0);
    world.current.scale.setScalar(K);

    // THE STAND rises out of the crest and sways on twos; it moves in the time-stop (it is the one who stopped it)
    const rise = smooth(T.rise[0], T.rise[1], tt);
    const sk = fit < 1 ? 0.62 : 0.8; // under the gantry's head-high edge, so the fists reach it above the helmet
    standRef.current.visible = rise > 0;
    standRef.current.position.set(STAND_AT.x * fit + Math.sin(t * 2.2) * 0.04, -9.5 * (1 - rise) + 0.12 * Math.sin(rise * Math.PI), STAND_AT.z);
    standRef.current.rotation.y = 0.12 * Math.sin((Math.floor(t * 6) / 6) * 1.3);
    standRef.current.scale.setScalar(sk);
    m.aura.material.color.set(AURA[pi]);
    m.aura.material.opacity = (0.4 + 0.3 * (Math.floor(t * 14) % 2) + 0.3 * barr) * rise;
    m.aura.scale.setScalar(1.1 + 0.05 * (Math.floor(t * 10) % 2) + 0.04 * barr);

    // THE RIVAL pops in on the tower with the first impact, then holds, its cape fluttering on the world clock
    const rv = Math.min(1, Math.max(0, (tt - T.rival) / 0.25));
    m.rival.visible = rv > 0;
    m.rival.position.set(TOWER.x, TOWER.top + 0.5, TOWER.z);
    m.rival.rotation.set(0, -0.35 + 0.03 * Math.sin(wt * 3), 0);
    m.rival.scale.set(1.2 * rv, 1.2 * (0.3 + 0.7 * rv), 1.2 * rv);

    // THE GANTRY: two fluted pylons, three mint edges (they glow once the fourth drowns), the coral one out over the water
    const px = PX * fit;
    pylL.current.position.set(-px, 0, GZ);
    pylR.current.position.set(px, 0, GZ);
    const glowK = 0.2 + 0.25 * Math.sin(wt * 5) ** 2 + 0.5 * smooth(T.drown, T.drown + 0.3, tt) * (0.7 + 0.3 * Math.sin(wt * 9));
    m.mint.fill.material.uniforms.uGlow.value = glowK;
    const bornAt = (i) => smooth(1.6 + i * 0.12, 2.1 + i * 0.12, tt);
    for (let i = 0; i < 3; i++) put(m.mint.fill, i, 0, BEAM_Y[i], GZ, (2 * px - 1.6) * bornAt(i) + 0.001, 0.3 * bornAt(i) + 0.001, 0.3 * bornAt(i) + 0.001);
    m.mint.fill.instanceMatrix.needsUpdate = true;
    // the coral edge: ONE whole beam, trembling and showing fissures, then three pieces that fall and drown
    const born4 = bornAt(3);
    const len = 2 * px + 1.6;
    const crack = smooth(T.crack[0], T.crack[1], tt);
    const tremble = smooth(3.0, 3.3, tt) * (tt < T.fall ? 1 : 0);
    const f12 = Math.floor(tt * 12);
    const sx = (((f12 * 3) % 5) - 2) * 0.03 * tremble;
    const sy = (((f12 * 5) % 3) - 1) * 0.04 * tremble;
    const whole = tt < T.crack[0] + 0.3 ? born4 : 0;
    put(m.coral.fill, 0, sx, CORAL.y + sy, CORAL.z, len * whole + 0.001, 0.46 * whole + 0.001, 0.46 * whole + 0.001);
    for (let k = 0; k < 3; k++) {
      const delay = k * 0.12;
      const u = Math.max(0, tt - T.fall - delay);
      const fallen = tt >= T.fall;
      const y = fallen ? Math.max(WY - 0.2, CORAL.y - 0.5 * 34 * u * u) : CORAL.y + sy;
      const sink = fallen ? smooth(T.drown - 0.05 + delay, T.drown + 0.35 + delay, wt + (FREEZE[1] - FREEZE[0])) : 0;
      const piece = len / 3;
      const gap = 0.04 + 0.5 * crack;
      const alive = tt >= T.crack[0] + 0.3 ? born4 * (1 - sink) : 0;
      const spread = fallen ? 0.7 * Math.min(u, 1) * (k - 1) : 0;
      Qa.setFromAxisAngle(Z1, (k - 1) * 0.22 * crack + (fallen ? (k - 1.2) * Math.min(u, 0.9) * 1.6 : 0));
      put(m.coral.fill, 1 + k, (k - 1) * piece + spread + sx * 0.5, y + (k === 1 ? 0.05 * crack : -0.07 * crack * (k - 1) ** 2), CORAL.z, (piece - gap) * alive + 0.001, 0.46 * alive + 0.001, 0.46 * alive + 0.001, Qa);
    }
    m.coral.fill.instanceMatrix.needsUpdate = true;
    // it throbs warm while it trembles
    m.coral.fill.material.uniforms.uGlow.value = 0.3 + 0.5 * crack * (0.5 + 0.5 * Math.sin(tt * 18));

    // THE FISTS: the Stand throws the MUDA barrage, a fan of afterimages at the coral edge, on twos
    const sh = standRef.current.position;
    for (let j = 0; j < JABS; j++) {
      const arm = j % 2 ? 1 : -1;
      const slot = j >> 1;
      const ph = (((wt * 6.5 + slot * 0.377 + arm * 0.19) % 1) + 1) % 1;
      const reach = 1 - Math.pow(1 - Math.min(1, ph * 1.6), 3); // snaps out, holds, drops
      const shown = barr > 0.01 && ph < 0.78;
      // the shoulder in the rig frame, and where on the coral edge this one is aimed
      const shx = sh.x + arm * 2.1 * sk;
      const shy = sh.y + sk * 6.4;
      const aim = (slot / (JABS / 2 - 1) - 0.5) * 2 * (px + 0.6) * (0.5 + 0.5 * hash(slot, 3 + arm));
      D.set(aim - shx, CORAL.y - shy + (hash(slot, 5) - 0.5) * 1.2, CORAL.z - sh.z);
      const dist = D.length();
      D.normalize();
      Qa.setFromUnitVectors(X1, D);
      const size = (shown ? (0.75 + 0.45 * reach) * (1 - 0.35 * ph) : 0.0001) * sk;
      V.set(shx, shy, sh.z).addScaledVector(D, 1.6 + reach * (dist - 1.2));
      put(m.fists.fill, j, V.x, V.y, V.z, size, size, size, Qa);
    }
    m.fists.fill.instanceMatrix.needsUpdate = true;
    // a spark on the coral edge with each landing jab
    for (let j = 0; j < SPARKS; j++) {
      const ph = (((wt * 6.5 + j * 0.31) % 1) + 1) % 1;
      const on = barr > 0.01 && ph > 0.3 && ph < 0.5 ? 0.55 : 0.0001;
      const cyc = Math.floor(wt * 6.5 + j * 0.31);
      put(m.sparks, j, (hash(j, cyc) - 0.5) * 2 * px * 0.9, CORAL.y + (hash(j, cyc + 7) - 0.5) * 0.4, CORAL.z + 0.4, on);
    }
    m.sparks.instanceMatrix.needsUpdate = true;

    // THE SPRAY off the reservoir (the dam shuddering): frozen in the time-stop and hanging over the water; a burst at the drowning
    const sprayRate = 0.25 + 0.6 * smooth(T.barrage[0], T.barrage[1], wt);
    for (let i = 0; i < SPRAY; i++) {
      const burst = i >= SPRAY - 40;
      const life = burst ? 1.5 : 1.7;
      const clk = burst ? tt - (T.drown - 0.05) : wt + hash(i, 1) * life * 3;
      const cyc = burst ? 0 : Math.floor(clk / life);
      const age = clk - cyc * life;
      const on = burst ? clk > 0 && clk < life : hash(i, 2 + cyc * 0.37) < sprayRate && wt > T.glyph;
      const x0 = burst ? (hash(i, 8) - 0.5) * 2.5 : (hash(i, 3 + cyc) - 0.5) * 2 * (px + 2.5);
      const z0 = burst ? CORAL.z : GZ + 2 - hash(i, 4 + cyc) * 7;
      const vy = burst ? 6 + 6 * hash(i, 5) : 3.5 + 4 * hash(i, 5 + cyc * 0.3);
      const yy = WY + vy * age - 0.5 * 9.8 * age * age;
      const sc = on && yy > WY ? 0.75 + 0.8 * hash(i, 6) : 0.0001;
      put(m.spray, i, x0 + (hash(i, 9) - 0.5) * age * (burst ? 5 : 1), Math.max(yy, WY), z0 + (burst ? (hash(i, 10) - 0.5) * age * 3 : 0), sc);
    }
    m.spray.instanceMatrix.needsUpdate = true;
    // the ring on the water where the edge drowned
    const wu = m.water.m.uniforms;
    const ringAge = Math.max(0, tt - (T.drown - 0.05));
    wu.uRipple.value.set(0, WY, CORAL.z);
    wu.uRingR.value = ringAge * 5.5;
    wu.uRingK.value = ringAge > 0 ? Math.max(0, 1 - ringAge / 1.4) : 0;

    // THE GLYPHS: ゴゴゴゴ rises round the pup (and stays on after the tear: it is the menace the pup carries home)
    const gl = smooth(T.glyph, T.glyph + 0.4, tt) * out * (1 - smooth(T.tear[0], T.tear[0] + 0.5, tt));
    const pulse = 1 + 0.28 * (Math.floor(t * 12) % 2);
    for (let i = 0; i < GLYPHS; i++) {
      const side = i % 2 ? 1 : -1;
      const span = 4.2;
      const age = (((wt * (0.5 + 0.4 * hash(i, 2)) + hash(i, 1) * span) % span) + span) % span;
      // two columns flanking the pup and the Stand, rising: never across the Stand's face
      const ax = side * (2.1 + 2.6 * hash(i, 4)) * (fit < 1 ? 0.62 : 1);
      const ay = 0.2 + 0.6 * hash(i, 5) + age * 0.8;
      const az = -0.3 - 1.6 * hash(i, 6);
      const size = (0.42 + 0.4 * hash(i, 7)) * pulse * gl * smooth(0, 0.5, age) * (1 - smooth(span - 1.2, span, age)) * (fit < 1 ? 0.8 : 1);
      Qa.setFromAxisAngle(Z1, (hash(i, 8) - 0.5) * 0.7);
      put(m.glyph.fill, i, ax, ay, az, size, size, size, Qa);
      put(m.glyph.ink, i, ax, ay, az - 0.05, size, size, size, Qa);
    }
    m.glyph.fill.instanceMatrix.needsUpdate = m.glyph.ink.instanceMatrix.needsUpdate = true;

    // THE CLOCK (the cause of the way home): it stands in the sky from the stop, the minute hand one tick short of twelve
    const clk = smooth(T.stop, T.stop + 0.25, tt) * (torn ? 1 - tearK : 1);
    clockRef.current.visible = clk > 0.01;
    clockRef.current.position.set(CLOCK.x * fit, CLOCK.y, CLOCK.z);
    clockRef.current.scale.setScalar(Math.max(clk, 0.001));
    minRef.current.rotation.z = tt >= T.tick ? 0 : -0.105;
    hourRef.current.rotation.z = -0.27;
    // the sounds: the tick as time stops, the tock inside it, the last tick on twelve
    const snd = tickSnd.current;
    if (snd) {
      if (tt >= T.stop && !S.tick1) {
        S.tick1 = true;
        snd.tick(false);
      }
      if (tt >= T.stop + 0.6 && !S.tick2) {
        S.tick2 = true;
        snd.tick(true);
      }
      if (tt >= T.tick && !S.tick3) {
        S.tick3 = true;
        snd.tick(false);
      }
    }

    // the flash: the rival, the stop, the resume and the last tick (tinted by the palette, never a white-out)
    const fl = Math.max(0, 1 - Math.abs(tt - T.stop) / 0.09) * 0.4 + Math.max(0, 1 - Math.abs(tt - T.resume - 0.04) / 0.1) * 0.4 + Math.max(0, 1 - Math.abs(tt - T.tick - 0.04) / 0.1) * 0.5 + Math.max(0, 1 - Math.abs(tt - T.rival) / 0.09) * 0.3;
    if (fl > 0.002) {
      m.flash.visible = true;
      cam.getWorldDirection(m.flash.position);
      m.flash.position.add(cam.position);
      m.flash.quaternion.copy(cam.quaternion);
      const h = 2 * Math.tan((cam.fov * Math.PI) / 360) * 1.2;
      m.flash.scale.set(h * cam.aspect, h, 1);
      m.flash.material.opacity = Math.min(0.6, fl);
    }

    // REALITY: the island the stage hid comes back under the tearing picture
    // (in four waves across the tear, never all in one frame)
    if (torn && tt < tl.collapse[0]) {
      const n = Math.ceil(island.current.length * Math.min(1, tearK * 2));
      for (let i = 0; i < n; i++) island.current[i].visible = true;
    }

    // the pup: the sign, fists as the Stand throws, a pointed finger on the stop, then the pose (its twist is the root, above)
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.5, 1.8, tt)) + smooth(T.flex - 0.05, T.flex + 0.2, tt) * out;
    live.pose.fist = barr * (0.5 + 0.5 * (Math.floor(t * 14) % 2)) * out;
    live.pose.point = smooth(T.stop, T.stop + 0.15, tt) * (1 - smooth(T.resume, T.resume + 0.15, tt)) * out;
    live.pose.crouch = hit(T.drown, 0.5) * out;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <primitive object={m.flash} />
      <group ref={menace} visible={false}>
        <primitive object={m.glyph.ink} />
        <primitive object={m.glyph.fill} />
      </group>
      <group ref={rig} visible={false}>
        <mesh ref={shellRef} geometry={m.shell.g} material={m.shell.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <mesh geometry={m.water.g} material={m.water.m} position={[0, WY, 0]} renderOrder={-2} frustumCulled={false} />
          <mesh geometry={m.land} material={m.landM} renderOrder={-1} frustumCulled={false} />
          <primitive object={m.crest[0]} />
          <primitive object={m.crest[1]} />
          <mesh geometry={m.lampG} material={m.lampM} frustumCulled={false} />
          <group ref={pylL}>
            <primitive object={m.pyl[0][0]} />
            <primitive object={m.pyl[0][1]} />
          </group>
          <group ref={pylR}>
            <primitive object={m.pyl[1][0]} />
            <primitive object={m.pyl[1][1]} />
          </group>
          <primitive object={m.mint.fill} />
          <primitive object={m.mint.hull} />
          <primitive object={m.coral.fill} />
          <primitive object={m.coral.hull} />
          <group ref={standRef} visible={false}>
            <primitive object={m.stand[0]} />
            <primitive object={m.stand[1]} />
            <primitive object={m.aura} />
          </group>
          <primitive object={m.fists.fill} />
          <primitive object={m.fists.hull} />
          <primitive object={m.rival} />
          <primitive object={m.spray} />
          <primitive object={m.sparks} />
          <group ref={clockRef} visible={false}>
            <mesh geometry={m.clockG} material={m.clockM} frustumCulled={false} />
            <mesh geometry={m.clockG} material={m.clockH} frustumCulled={false} />
            <mesh ref={minRef} geometry={m.minG} material={m.clockM} frustumCulled={false} />
            <mesh ref={hourRef} geometry={m.hourG} material={m.clockM} frustumCulled={false} />
          </group>
        </group>
      </group>
    </>
  );
}
