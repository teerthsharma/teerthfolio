// The igloo: Vinland Saga, "I have no enemies", in a NORDIC WATERCOLOUR
// dimension: wet-edge washes on cold-pressed paper, pigment pooling darker at
// every edge, bare paper left as the highlights (all in each material's
// shader, moves/home/paper.js; nothing here is a post pass, and there is no
// ink, halftone or hatching except Thors's one hard silhouette).
// The banner (THE IGLOO / Seal's Topology Land) bleeds in first; on the stage
// bloom the island becomes Thors's Icelandic fjord at a low dawn sun: steep
// walls with snow on their ledges, drift ice, a shingle beach and turf
// longhouses with smoke, the igloo promoted to the head of the farmstead, a
// wooden jetty and a longship drawn up, Vinland far off in golden haze. The
// pup plops onto the jetty's end and sits; Thors stands behind it as an ink
// silhouette ("You have no enemies."); an orca's fin rises, circles once and
// pauses eye level with the jetty, then sinks with a ring and a bloop ("I
// have no orcas, for I have no enemies."); Vinland rises; on the flex line
// eleven beacons light one by one along the fjord's rim while the igloo's
// telescope pans to each. THE RETURN: the beacons are the last thing lit; as
// the eleventh catches, the first drops fall, and the rain runs the whole
// wash off the paper in dripping columns, Thors's ink with it, until the sheet
// is bare, and the real island is what was under it. Calm: no shake.
// Cost: about 30 draw calls, no post pass; everything is disposed on exit.
// Card: lib/world/cutscene/cards/home.js. Parts: ./home/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, Mesh, PlaneGeometry, Vector2, Vector3 } from "three";
import { radiusAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Speaker, Stage, onTwos, smooth, useCutFrame } from "../kit";
import { Motes } from "./_g1";
import { mountBanner } from "./home/banner";
import { directCamera } from "./home/director";
import { IGLOO, SHIELD_COLS, SHIP, SMOKE_AT, beaconSpots, cairnGeometry, flameMaterial, houseGeometry, iglooGeometry, jettyGeometry, scopeGeometry, shieldGeometry, shieldSpots, shipGeometry } from "./home/farm";
import { H, WATER_Y, floeGeometry, floeMaterial, landGeometry, landMaterial, skyShell, vinlandGeometry, vinlandMaterial, waterMaterial } from "./home/land";
import { gullBodyGeometry, gullWingGeometry, inkMaterial, orcaGeometry, penguinGeometry, pupWash, rainGeometry, rainMaterial, ringGeometry, ringMaterial, thorsGeometry } from "./home/beings";
import { U, wash } from "./home/paper";
import { flashQuad, hash, hide, holdFlash, inst, islandList, put } from "./p-caustic/parts";

const CORE_Y = 0.9;
// the clock (s from the arrival, paced to read: ~30 s). Line A (Thors) 2.3, orca 5-12.6, line B 12.8, the flex 18.8, the credit 25.0, the collapse 29.4
const T = { plop: 2.6, rise: [5.0, 5.9], circle: [5.8, 10.6], spy: [10.7, 11.3], sink: [11.6, 12.6], bloop: 12.0, gull: 4.5, beacon: 19.0, step: 0.5, rain: [24.4, 25.8], run: [25.6, 27.4], end: 29.4 };
const OC = { cx: 0.5, cz: -0.3, rx: 3.3, rz: 2.7 }; // the orca's circle round the pup
export const THORS_AT = [-2.4, 0, -0.5]; // from the pup: behind it on the jetty (the card's speaker.at)
const NFLOE = 26;
const NSMOKE = 5 * 6;
const NSTEAM = 8;
const NRING = 36;
const NRAIN = 240;
const lerp = (a, b, k) => a + (b - a) * k;
const V2 = new Vector2();
const C = new Color();
const ORCA = { x: 0, y: -3, z: 0, yaw: 0, pitch: 0, vis: 0, surf: 0 };
const ORCA2 = { x: 0, y: -3, z: 0, yaw: 0, pitch: 0, vis: 0, surf: 0 };
const V = new Vector3();

// where the orca is at t: out of the water beside the jetty, once round the pup (under the jetty
// on the far side, fin and all), then up to eye level with the deck, and down
function orcaAt(t, o) {
  const rise = smooth(T.rise[0], T.rise[1], t);
  const k = smooth(T.circle[0], T.circle[1], t);
  const a = 0.15 + Math.PI * 2 * k;
  let x = OC.cx + OC.rx * Math.cos(a);
  let z = OC.cz - OC.rz * Math.sin(a);
  let yaw = Math.atan2(-OC.rx * Math.sin(a), -OC.rz * Math.cos(a));
  const dive = (1 - smooth(0.5, 1.25, Math.abs(z))) * (1 - smooth(1.0, 2.3, x));
  let y = lerp(-2.6, -0.66, rise) + (t < T.rise[1] + 0.4 ? 0.3 * Math.sin(Math.PI * smooth(T.rise[0] + 0.05, T.rise[1] + 0.3, t)) : 0) - 1.9 * dive;
  // after the circle: to the deck's end and up, looking at the pup
  const sp = smooth(T.spy[0], T.spy[1] + 0.3, t);
  let pitch = 0;
  if (t > T.circle[1] - 0.3) {
    const j = smooth(T.circle[1] - 0.3, T.spy[0] + 0.1, t);
    x = lerp(x, 3.7, j);
    z = lerp(z, 0.45, j);
    const to = Math.atan2(-3.7, -0.45);
    yaw += Math.atan2(Math.sin(to - yaw), Math.cos(to - yaw)) * j;
    pitch = 1.02 * sp;
    y = lerp(y, -1.5, sp);
  }
  const sink = smooth(T.sink[0], T.sink[1], t);
  y -= 2.4 * sink;
  o.x = x;
  o.z = z;
  o.y = y;
  o.yaw = yaw;
  o.pitch = pitch * (1 - sink * 0.6);
  o.vis = t > T.rise[0] - 0.2 && t < T.sink[1] + 0.05 ? 1 : 0;
  o.surf = o.vis * (1 - sink) * smooth(-2.0, -1.0, y);
  return o;
}

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const rig = useRef();
  const shellRef = useRef();
  const world = useRef();
  const gA = useRef();
  const gB = useRef();
  const gC = useRef();
  const gD = useRef();
  const turret = useRef();
  const scope = useRef();
  const thors = useRef();
  const orcaG = useRef();
  const wakeRef = useRef();
  const gullG = useRef();
  const wingL = useRef();
  const wingR = useRef();
  const rainU = useMemo(() => ({ value: 0 }), []);
  const bannerRef = useRef(null);
  const pupW = useRef(null);
  const island = useRef([]);

  const m = useMemo(() => {
    const L = landGeometry();
    const shell = skyShell();
    const landM = landMaterial();
    const waterM = waterMaterial();
    const vin = { g: vinlandGeometry(), m: vinlandMaterial() };
    const floeG = floeGeometry();
    const floeM = floeMaterial();
    const floes = inst(floeG, floeM, NFLOE);
    const floe = Array.from({ length: NFLOE }, (_, i) => {
      let x;
      let z;
      let tries = 0;
      do {
        x = lerp(-3.5, 12.5, hash(i + tries * 31, 1));
        z = lerp(-75, 9, hash(i + tries * 31, 2) ** 1.3);
        tries++;
      } while (tries < 8 && (Math.hypot(x - OC.cx, z - OC.cz) < 4.6 || (x < 2.8 && Math.abs(z) < 2.6)));
      return { x, z, s: (0.45 + 1.7 * hash(i, 3) ** 1.5) * (1 + -z * 0.012), ph: hash(i, 4) * 6.3, rot: hash(i, 5) * 6.3 };
    });
    const houses = { g: houseGeometry(), m: wash({ paper: 0.5, edge: 0.34, rim: 0.4 }) };
    const iglooG = iglooGeometry();
    const iglooM = wash({ paper: 0.85, edge: 0.3, rim: 0.45 });
    const scopeG = scopeGeometry();
    const jetty = { g: jettyGeometry(), m: wash({ paper: 0.3, edge: 0.3, rim: 0.4, flat: true }) };
    const ship = { g: shipGeometry(), m: wash({ paper: 0.35, edge: 0.34, rim: 0.4 }) };
    const shieldG = shieldGeometry();
    const shieldM = wash({
      vertexColors: false,
      paper: 0.4,
      edge: 0.34,
      rim: 0.4,
      albedo: "vec2 q = vUv - 0.5; float r = length(q) * 2.0; vec3 c = vc; c = mix(c, vec3(0.93, 0.88, 0.78), step(r, 0.2)); c = mix(c, c * 0.72, smoothstep(0.8, 0.96, r)); return c;",
    });
    const spots = shieldSpots();
    const shields = inst(shieldG, shieldM, spots.length);
    spots.forEach(([x, y, z], i) => {
      put(shields, i, x, y, z, 1);
      shields.setColorAt(i, new Color(SHIELD_COLS[i % 4]).convertLinearToSRGB());
    });
    const beacons = beaconSpots();
    const cairns = { g: cairnGeometry(beacons), m: wash({ paper: 0.4, edge: 0.3, rim: 0.4, flat: true }) };
    const flames = inst(new PlaneGeometry(1, 3.2).translate(0, 1.4, 0), flameMaterial(), beacons.length);
    for (let i = 0; i < beacons.length; i++) hide(flames, i);
    const smokeM = wash({ vertexColors: false, transparent: true, depthWrite: false, paper: 0.8, edge: 0, rim: 0.2, albedo: "return vec3(0.84, 0.82, 0.86);", alpha: "vC.r * 0.6 * pow(max(dot(N, V), 0.0), 1.1)" });
    const smokeG = new IcosahedronGeometry(1, 1);
    const smoke = inst(smokeG, smokeM, NSMOKE);
    const steam = inst(smokeG, smokeM, NSTEAM);
    for (let i = 0; i < NSMOKE; i++) smoke.setColorAt(i, C.setRGB(0, 0, 0).clone());
    for (let i = 0; i < NSTEAM; i++) steam.setColorAt(i, C.setRGB(0, 0, 0).clone());
    const orcaM = wash({ paper: 0.8, edge: 0.3, rim: 0.8 });
    const orca = new Mesh(orcaGeometry(), orcaM);
    const calf = new Mesh(orca.geometry, orcaM);
    // the V-wake: two long soft arms trailing from the apex
    const arm = (s) => new PlaneGeometry(0.34, 3.0, 1, 1).translate(0, -1.5, 0).rotateX(Math.PI / 2).rotateY(s * 0.42);
    const wakeM = wash({ vertexColors: false, transparent: true, depthWrite: false, paper: 1, edge: 0, rim: 0, albedo: "return vec3(0.95, 0.96, 0.96);", alpha: "0.8 * vUv.y * smoothstep(0.0, 0.2, 1.0 - vUv.y)" });
    const wake = new Mesh(arm(1), wakeM);
    const wakeL = new Mesh(arm(-1), wakeM);
    wake.renderOrder = wakeL.renderOrder = 3;
    const rings = inst(ringGeometry(), ringMaterial(), NRING);
    rings.renderOrder = 4;
    for (let i = 0; i < NRING; i++) {
      rings.setColorAt(i, C.setRGB(0, 0, 0).clone());
      hide(rings, i);
    }
    const th = thorsGeometry();
    const thorsBody = new Mesh(th.body, inkMaterial(false));
    const thorsCloak = new Mesh(th.cloak, inkMaterial(true));
    const peng = inst(penguinGeometry(), wash({ paper: 0.5, edge: 0.3, rim: 0.4 }), 2);
    const gullBody = new Mesh(gullBodyGeometry(), wash({ paper: 0.9, edge: 0.3, rim: 0.4 }));
    const wingG = gullWingGeometry();
    const rain = inst(rainGeometry(), rainMaterial(rainU), NRAIN);
    rain.renderOrder = 5;
    for (let i = 0; i < NRAIN; i++) put(rain, i, lerp(-16, 12, hash(i, 1)), 26, lerp(-14, 9, hash(i, 2)), 1);
    rain.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NFLOE; i++) hide(floes, i);
    smoke.renderOrder = steam.renderOrder = flames.renderOrder = 3;
    const flash = flashQuad("#f6eddc");
    return { L, shell, landM, waterM, vin, floes, floe, floeG, floeM, houses, iglooG, iglooM, scopeG, jetty, ship, shields, shieldG, shieldM, beacons, cairns, flames, smoke, steam, smokeM, smokeG, orca, wake, wakeL, wakeM, rings, calf, thorsBody, thorsCloak, peng, gullBody, wingG, rain, flash };
  }, [rainU]);

  // the island list is taken before the stage hides it; the pup's wash twins and the banner mount with the scene
  useEffect(() => {
    island.current = islandList(scene);
    const root = scene.getObjectByName("seal");
    pupW.current = root ? pupWash(root) : null;
    // every program compiles now, off the main thread (the pup's twins swapped in just for the call), so no frame of the scene stalls on a link
    const warm = (typeof gl.compileAsync === "function" && rig.current) ? [rig.current] : [];
    pupW.current?.set(true);
    for (const o of warm) gl.compileAsync(o, camera, scene).catch(() => {});
    if (root) gl.compileAsync(root, camera, scene).catch(() => {});
    pupW.current?.set(false);
    bannerRef.current = mountBanner();
    if (mode !== "full") bannerRef.current.set(0, true);
    return () => {
      bannerRef.current?.dispose();
      bannerRef.current = null;
      pupW.current?.dispose();
      pupW.current = null;
      for (const g of [m.L.land, m.L.water, m.shell.g, m.vin.g, m.floeG, m.houses.g, m.iglooG, m.scopeG, m.jetty.g, m.ship.g, m.shieldG, m.cairns.g, m.flames.geometry, m.smokeG, m.orca.geometry, m.wake.geometry, m.wakeL.geometry, m.rings.geometry, m.thorsBody.geometry, m.thorsCloak.geometry, m.peng.geometry, m.gullBody.geometry, m.wingG, m.rain.geometry, m.flash.geometry]) g.dispose();
      for (const x of [m.landM, m.waterM, m.shell.m, m.vin.m, m.floeM, m.houses.m, m.iglooM, m.jetty.m, m.ship.m, m.shieldM, m.cairns.m, m.flames.material, m.smokeM, m.orca.material, m.wakeM, m.rings.material, m.thorsBody.material, m.thorsCloak.material, m.peng.material, m.gullBody.material, m.rain.material, m.flash.material]) x.dispose();
      for (const x of [m.floes, m.shields, m.flames, m.smoke, m.steam, m.rings, m.peng, m.rain]) x.dispose();
    };
  }, [scene, gl, camera, m, mode]);

  // the lens glides through the fjord's places after the kit has placed it (priority 0, mounted after the camera rig)
  useFrame((state) => {
    if (mode !== "full" || !live.arrival.id) return;
    const t = state.clock.elapsedTime - live.arrival.start;
    if (t < T.end + 0.6) directCamera(t, state.camera, live.seal.x, live.seal.z, tl);
  }, 0);

  // a skip clears the arrival: nothing of the fjord draws for the frame before this unmounts
  useFrame(() => {
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      pupW.current?.set(false);
      bannerRef.current?.hide();
      m.flash.visible = false;
    }
  }, -0.5);

  useCutFrame((t, state) => {
    const s = live.seal;
    const full = mode === "full";
    const g = rig.current;
    g.visible = full;
    m.flash.visible = false;
    if (!full) {
      bannerRef.current?.set(0, true);
      pupW.current?.set(false);
      return;
    }
    bannerRef.current?.set(t, false);
    const tt = onTwos(t);
    const cam = state.camera;
    const ended = t >= T.end;
    const out = 1 - smooth(tl.collapse[0], tl.collapse[1], tt);
    g.position.set(s.x, 0, s.z);

    // shared uniforms: the clock, the screen, the rain's run
    state.gl.getDrawingBufferSize(V2);
    U.uRes.value.copy(V2);
    U.uPx.value = state.gl.getPixelRatio();
    U.uTime.value = t;
    U.uRun.value = smooth(T.run[0], T.run[1], t);
    rainU.value = ended ? 0 : smooth(T.rain[0], T.rain[1], t);

    // THE WORLD blooms out of the pup with the stage (a ball of wet wash), then stands as the backdrop
    const r = radiusAt(tl, t);
    V.set(s.x, CORE_Y, s.z);
    const inside = t > tl.bloom[1] || r > cam.position.distanceTo(V) + 0.3; // past the bloom the lens roams, so the fjord stays whole
    shellRef.current.visible = r > 0.02 && !ended;
    shellRef.current.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    m.shell.m.uniforms.uInside.value = inside ? 1 : 0;
    m.shell.m.transparent = !inside;
    // the world draws at a speck from the first frames, a quarter of it each 0.12 s, so every buffer is uploaded under the banner and never in one frame
    world.current.visible = !ended;
    world.current.scale.setScalar(inside ? 1 : 1e-4);
    gA.current.visible = inside || t > 0.15;
    gB.current.visible = inside || t > 0.3;
    gC.current.visible = inside || t > 0.45;
    gD.current.visible = inside || t > 0.6;
    const warm = t < tl.bloom[1];

    // THE PUP: a wash of its own; a full plop with squash, eyes open; a slow blink on the hold, on line B and as the rain starts
    pupW.current?.set(inside && !ended);
    const seal = scene.getObjectByName("seal");
    live.pose.sit = smooth(T.plop - 0.35, T.plop, tt) * out;
    live.pose.eyes = 1;
    const slow = (at) => (tt > at && tt < at + 0.32 ? Math.sin(((tt - at) / 0.32) * Math.PI) : 0);
    live.pose.blink = Math.max(slow(4.8), slow(tl.lineB + 0.4), slow(T.rain[0] + 0.5));
    const tau = tt - T.plop;
    const sq = tau > 0 ? Math.exp(-5 * tau) * Math.cos(16 * tau) : 0;
    seal?.scale.set(1 + 0.12 * sq * out, 1 - 0.2 * sq * out, 1 + 0.12 * sq * out);

    // the sheet is bare: the island the stage hid is back under a cream paper that fades off it
    if (ended) {
      for (const o of island.current) o.visible = true;
      holdFlash(m.flash, cam, 0.97 * (1 - smooth(T.end, T.end + 0.8, t)));
      return;
    }
    bannerRef.current?.set(t, false);

    // THORS steps out of the paper on the stage (a wet bloom of ink); the cloak lifts in the breeze (its shader)
    const enter = smooth(tl.enter, tl.enter + 0.5, t);
    const ts = enter * (1 + 0.05 * Math.sin(Math.PI * enter));
    const tg = thors.current;
    tg.visible = enter > 0.01 || warm;
    tg.scale.set(ts, ts * (0.5 + 0.5 * enter), ts);
    tg.rotation.y = 0.9 + 0.02 * Math.sin(tt * 0.9);

    // THE ORCA
    const o = orcaAt(t, ORCA);
    const og = orcaG.current;
    og.visible = (o.vis > 0 && o.y > -3.6) || warm;
    og.position.set(o.x, o.y, o.z);
    og.rotation.set(-o.pitch, o.yaw, 0.06 * Math.sin(t * 2.2), "YXZ");
    // its V-wake trails the fin on the water while it swims
    const wk = wakeRef.current;
    const wv = o.surf * (1 - smooth(T.circle[1], T.circle[1] + 0.3, t));
    wk.visible = wv > 0.05 || warm;
    wk.position.set(o.x + Math.sin(o.yaw) * 1.3, WATER_Y + 0.03, o.z + Math.cos(o.yaw) * 1.3);
    wk.rotation.set(0, o.yaw, 0);
    wk.scale.setScalar(Math.max(wv, 0.001));
    // rings: the wake's, the bloop's, the rain's
    let ri = 0;
    const tick = Math.floor(t / 0.42);
    for (let j = 0; j < 6; j++) {
      const born = (tick - j) * 0.42;
      const age = (t - born) / 2.4;
      const ob = orcaAt(born, ORCA2);
      const on = ob.vis > 0 && ob.y > -1.5 && born < T.circle[1] + 0.3 && age > 0 && age < 1 ? 1 : 0;
      put(m.rings, ri, ob.x, WATER_Y + 0.04, ob.z, on ? 0.35 + 1.9 * age : 0.0001);
      m.rings.instanceColor.setXYZ(ri, on * (1 - age) * 0.55, 0, 0);
      ri++;
    }
    for (let j = 0; j < 3; j++) {
      const age = (t - (T.bloop + 0.26 * j)) / 1.7;
      const on = age > 0 && age < 1;
      put(m.rings, ri, 3.55, WATER_Y + 0.05, 0.55, on ? 0.25 + 1.8 * age : 0.0001);
      m.rings.instanceColor.setXYZ(ri, on ? (1 - age) * 0.7 : 0, 0, 0);
      ri++;
    }
    for (let j = ri; j < NRING; j++) {
      const k = j - ri;
      const ph = (t * 0.9 + hash(k, 7)) % 1;
      const seed = k + 40 * Math.floor(t * 0.9 + hash(k, 7));
      const x = lerp(-4.5, 12, hash(seed, 1));
      const z = lerp(-6, 9, hash(seed, 2));
      const on = rainU.value > 0.02 && !(x < 2.0 && Math.abs(z) < 1.2) ? 1 : 0;
      put(m.rings, j, x, WATER_Y + 0.04, z, on ? 0.12 + 0.55 * ph : 0.0001);
      m.rings.instanceColor.setXYZ(j, on * (1 - ph) * 0.6 * rainU.value, 0, 0);
    }
    m.rings.instanceMatrix.needsUpdate = true;
    m.rings.instanceColor.needsUpdate = true;

    // drift ice, bobbing on the swell
    for (let i = 0; i < NFLOE; i++) {
      const f = m.floe[i];
      put(m.floes, i, f.x + 0.12 * Math.sin(t * 0.3 + f.ph), WATER_Y + 0.02 + 0.045 * Math.sin(t * 0.9 + f.ph), f.z, f.s, f.s, f.s, 0.03 * Math.sin(t * 0.7 + f.ph), f.rot + 0.03 * t, 0.03 * Math.cos(t * 0.8 + f.ph));
    }
    m.floes.instanceMatrix.needsUpdate = true;

    // two penguins waddle along the gravel bar behind the pup, unbothered
    for (let i = 0; i < 2; i++) {
      const u = (t - 2.4 - i * 0.95) / 6.8;
      const on = u > 0 && u < 1 ? 1.45 : 0.0001;
      const x = lerp(-5.4, 3.2, Math.min(1, Math.max(0, u)));
      const z = -3.75 - 0.35 * i;
      put(m.peng, i, x, H(x, z) + 0.03 + Math.abs(Math.sin(t * 8 + i)) * 0.03, z, on, on, on, 0, Math.PI / 2 - 0.2, 0.15 * Math.sin(t * 8 + i));
    }
    m.peng.instanceMatrix.needsUpdate = true;

    // THE IGLOO: the telescope pans to each beacon as it catches (the way it pans to every place); steam from the vent
    const nB = m.beacons.length;
    const idx = Math.min(nB - 1, Math.max(0, Math.floor((t - T.beacon) / T.step)));
    const bearing = (j) => Math.atan2(m.beacons[j][0] - IGLOO.x, m.beacons[j][2] - IGLOO.z);
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const idle = 0.5 + 0.9 * Math.sin(t * 0.42);
    let az = idle;
    if (t > T.beacon - 0.5) {
      const from = idx > 0 ? bearing(idx - 1) : idle;
      const to = bearing(idx);
      const k = smooth(T.beacon + idx * T.step, T.beacon + idx * T.step + 0.16, t);
      az = from + wrap(to - from) * k;
      if (t < T.beacon) az = lerp(idle, az, smooth(T.beacon - 0.5, T.beacon, t));
    }
    turret.current.rotation.y = az - IGLOO.ry;
    scope.current.rotation.x = -0.36 - 0.1 * Math.sin(t * 0.8);
    for (let i = 0; i < NSTEAM; i++) {
      const life = (t * 0.2 + hash(i)) % 1;
      put(m.steam, i, IGLOO.x + 0.35 * Math.sin(life * 5 + i) + life * 1.2, 8.1 + life * 3.2, IGLOO.z + 0.2 * Math.cos(life * 4 + i), 0.35 + 0.8 * life);
      m.steam.instanceColor.setXYZ(i, Math.sin(life * Math.PI) * 0.55, 0, 0);
    }
    m.steam.instanceMatrix.needsUpdate = true;
    m.steam.instanceColor.needsUpdate = true;
    // longhouse smoke curling from each roof hole, leaning with the breeze
    for (let h = 0; h < SMOKE_AT.length; h++) {
      const [px, py, pz] = SMOKE_AT[h];
      for (let i = 0; i < 6; i++) {
        const life = (t * 0.17 + hash(h * 7 + i, 3) + h * 0.13) % 1;
        put(m.smoke, h * 6 + i, px + life * life * 3.2 + 0.25 * Math.sin(life * 7 + i), py + life * 3.6, pz + 0.2 * Math.cos(life * 5 + i * 2), 0.28 + 0.9 * life);
        m.smoke.instanceColor.setXYZ(h * 6 + i, Math.sin(life * Math.PI) * 0.6, 0, 0);
      }
    }
    m.smoke.instanceMatrix.needsUpdate = true;
    m.smoke.instanceColor.needsUpdate = true;

    // the gull lands on the dome and settles its wings
    const gu = smooth(T.gull, T.gull + 1.1, t);
    const cs = Math.cos(IGLOO.ry);
    const sn = Math.sin(IGLOO.ry);
    const fall = (1 - gu) * (1 - gu);
    const gl = [1.05, 3.84, 1.15];
    gullG.current.position.set(IGLOO.x + (cs * gl[0] + sn * gl[2]) * IGLOO.s + 5 * fall, IGLOO.s * gl[1] + 0.3 + 4.5 * fall, IGLOO.z + (cs * gl[2] - sn * gl[0]) * IGLOO.s);
    gullG.current.rotation.y = lerp(0.6, 1.3, gu);
    gullG.current.scale.setScalar(IGLOO.s * 0.95);
    gullG.current.visible = t > T.gull - 0.6 || warm;
    const flap = 0.2 + (1 - gu) * Math.sin(t * 18) * 0.9;
    wingL.current.rotation.set(-flap, -1.3 * gu, 0);
    wingR.current.rotation.set(-flap, -1.3 * gu, 0);

    // ELEVEN BEACONS light one by one along the fjord's rim, flames on twos, bigger with the distance
    for (let i = 0; i < nB; i++) {
      const [bx, by, bz] = m.beacons[i];
      const on = t - (T.beacon + i * T.step);
      const dist = Math.hypot(bx - cam.position.x, bz - cam.position.z);
      const size = on > 0 ? (1 + 0.9 * Math.max(0, 1 - on / 0.25)) * Math.min(1, on / 0.12 + 0.2) * (0.5 + 0.045 * dist) : 0.0001;
      put(m.flames, i, bx, by + 0.9, bz, size);
    }
    m.flames.instanceMatrix.needsUpdate = true;

    // VINLAND, from line B on, in warm haze
    m.vin.m.uniforms.uVin.value = smooth(tl.lineB, tl.lineB + 1.2, t);
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      {mode === "still" ? <Speaker {...cut} /> : null}
      <primitive object={m.flash} />
      <group ref={rig} visible={false}>
        <mesh ref={shellRef} geometry={m.shell.g} material={m.shell.m} position={[0, CORE_Y, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={world}>
          <group ref={gA} visible={false}>
          <mesh geometry={m.L.land} material={m.landM} frustumCulled={false} />
          <mesh geometry={m.L.water} material={m.waterM} renderOrder={1} frustumCulled={false} />
          <mesh geometry={m.vin.g} material={m.vin.m} renderOrder={2} frustumCulled={false} />
          </group>
          <group ref={gB} visible={false}>
          <primitive object={m.floes} />
          <mesh geometry={m.houses.g} material={m.houses.m} frustumCulled={false} />
          <group position={[IGLOO.x, H(IGLOO.x, IGLOO.z) - 0.05, IGLOO.z]} rotation={[0, IGLOO.ry, 0]} scale={IGLOO.s}>
            <mesh geometry={m.iglooG} material={m.iglooM} frustumCulled={false} />
            <group ref={turret} position={[0, 4.55, 0]}>
              <mesh ref={scope} geometry={m.scopeG} material={m.iglooM} frustumCulled={false} />
            </group>
          </group>
          <mesh geometry={m.jetty.g} material={m.jetty.m} frustumCulled={false} />
          <group position={[SHIP.x, H(SHIP.x, SHIP.z) + 0.05, SHIP.z]} rotation={[0, SHIP.ry, -0.07]}>
            <mesh geometry={m.ship.g} material={m.ship.m} frustumCulled={false} />
            <primitive object={m.shields} />
          </group>
          <mesh geometry={m.cairns.g} material={m.cairns.m} frustumCulled={false} />
          <primitive object={m.flames} />
          </group>
          <group ref={gC} visible={false}>
          <primitive object={m.smoke} />
          <primitive object={m.steam} />
          <primitive object={m.peng} />
          <primitive object={m.rings} />
          <primitive object={m.rain} />
          </group>
          <group ref={gD} visible={false}>
          <group ref={gullG}>
            <primitive object={m.gullBody} />
            <group position={[0, 0.04, 0.1]}>
              <group ref={wingL}>
                <mesh geometry={m.wingG} material={m.gullBody.material} />
              </group>
            </group>
            <group position={[0, 0.04, -0.1]} scale={[1, 1, -1]}>
              <group ref={wingR}>
                <mesh geometry={m.wingG} material={m.gullBody.material} />
              </group>
            </group>
          </group>
          <group ref={orcaG}>
            <primitive object={m.orca} />
            <group position={[2.0, -0.45, -1.3]} rotation={[0, -0.25, 0]} scale={0.42}>
              <primitive object={m.calf} />
            </group>
          </group>
          <group ref={wakeRef}>
            <primitive object={m.wake} />
            <primitive object={m.wakeL} />
          </group>
          <group ref={thors} position={[THORS_AT[0], 0, THORS_AT[2]]}>
            <primitive object={m.thorsBody} />
            <primitive object={m.thorsCloak} />
          </group>
          </group>
        </group>
      </group>
      <Motes mode={mode} tl={tl} n={70} span={[16, 5, 10]} center={[-1, 0.3, -2]} dir={[0.05, 0.05, 0]} size={0.04} color={["#fffaf2", "#ffe9cc"]} sway={0.3} shape="round" />
    </>
  );
}
