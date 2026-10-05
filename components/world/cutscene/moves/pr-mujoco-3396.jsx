// MOUNT MUJORUSH: Attack on Titan, the Walls were Titans, and the Rumbling,
// seal edition. ONE cinematic for the whole mountain (#3396, mujoco_warp
// #1541, #3450), in its own dimension: GRITTY CHARCOAL, graphite on warm
// grey toothy paper, every surface hatched by its light value in its own
// shader, one burnt-orange wash from the low sun, the coral of the cubes,
// and the sea's single cold blue once the Wall opens.
//
// 0 s     the banner slams in over the island: THE WALLS WERE TITANS
// 1.2 s   the impact: the island is drawn over in charcoal. Wall Maria's sea
//         end at dusk, seen from the cobbled square of a Shiganshina-style
//         district: red-tile roofs, chimneys, the bell tower, the arched gate
//         with its portcullis up. MujoRush is promoted: its carved cliff is a
//         section of the Wall, its three pup faces set in it, the crowned one
//         centre stage. Eren stands on the crest, back to us, coat whipping.
// 3.2 s   line A, from the faces. A crack races along the cobbles to the
//         Wall; the faces split and fall, wall-titans' faces behind them,
//         eyes lit; the skin falls plate by plate from the crowned face
//         outward: the Wall was titans, shoulder to shoulder, and under the
//         crowned face its core is a block of exactly 1,282 coral fish-cubes.
//         Over the crest the Rumbling rises: seal-titans in thousands, ribs
//         glowing, marching on the beat; every footfall shakes the frame,
//         swings the bell, ducks the colony on the roofs and cracks the ice
//         on the setts. Penguins stampede across the square. The Founding
//         Titan's ribcage stands witness on the far ridge.
// 6.75 s  a bolt of lightning strikes the pup: it swells to a titan with a stomp
// 7.2 s   line B. The pup eats the block, top course first, the cubes
//         spiralling into its mouth, until one blue cube is left.
// 10.4 s  it shrinks back with the cube on its nose; the Wall stands open on
//         the sea, the first open horizon; gulls burst off the cliff.
// 11 s    the flex line, the cube flipped and caught. Why we come home: the
//         Wall was the cage of this dimension, and the way out is the sea
//         beyond it: from the gap the sea's colour burns the charcoal
//         drawing off the paper, ember-edged, and the real island is under it.
// 16 s    the credit card, while the drawing burns away and the lens comes home.
//
// Card: lib/world/cutscene/cards/pr-mujoco-3396.js. Parts: ./pr-mujoco-3396/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Mesh, MeshBasicMaterial, PlaneGeometry, Vector2, Vector3 } from "three";
import { sceneT } from "../../../../lib/world/cutscene/clock";
import { PLACE_BY_ID } from "../../../../lib/world/places";
import { live } from "../../../../lib/world/store";
import { onTwos, signAt, smooth, useCutFrame } from "../kit";
import { islandList, pupParts } from "./p-caustic/parts";
import { makeBanner } from "./pr-mujoco-3396/banner";
import { U, pupCharcoal } from "./pr-mujoco-3396/charcoal";
import { N, dropKit, put, takeKit, watch } from "./pr-mujoco-3396/kit";
import { BLOCK, BLUE_AT, CELLS, FACES, FACE_Y, PLATES, hash, zF } from "./pr-mujoco-3396/world";

watch(); // the prebuild: the kit is built and compiled while the seal walks up to the mountain

const T = {
  inside: 1.25, // the drawing is up, behind the impact frame
  dock: 1.6, // the banner docks under the top bar
  crack: [3.3, 4.3],
  tremble: [3.4, 4.0],
  split: [4.0, 4.5, 4.7], // the crowned face's skin first, then the horned and the capped
  skin: 4.1, // the plates begin to fall, each on its own delay outward
  rise: [4.0, 6.0], // the march crests the horizon
  beat0: 4.6,
  beat: 0.9,
  beatEnd: 15.6,
  bolt: [6.75, 7.05],
  swell: [6.85, 7.25],
  eat: [7.4, 10.3],
  shrink: [10.35, 10.85],
  gulls: 10.9,
  flip: [11.7, 12.35],
  restore: [15.9, 16.6], // the island comes back under the drawing, a slice a frame
  burn: [16.3, 19.3],
  home: [18.4, 19.8], // the lens hands back to the follow
};
const SPLIT = [T.split[1], T.split[0], T.split[2]]; // in FACES order: horned, crowned, capped
const TITAN = 6; // the pup's titan scale

// THE LENS: key frames in the scene's frame [t, eye, look, k], wide; a tall screen stands back by k
const KEYS = [
  [1.25, [1.2, 1.1, 9], [0, 7, -30], 1.15], // the pup whole on the cobbles, the faces and the Wall over it
  [3.2, [1.0, 1.1, 8], [0, 7, -30], 1.15],
  [4.4, [1.4, 1.1, 9.5], [0, 8, -30], 1.15], // the skin falls behind the pup
  [4.9, [2, 21.5, -14], [3, 23, -24], 1.0], // holds on Eren's back before the fly-along
  [5.3, [-22, 24.5, -23], [20, 110, -400], 1.0], // the fly-along: along the crest, past Eren, over the penguin titans' march
  [6.4, [4, 24.5, -23], [40, 115, -400], 1.0],
  [6.8, [3, 2.4, 16], [0, 3.5, -10], 1.2], // the strike
  [7.7, [20, 9, 34], [-1, 7, -14], 1.25], // the titan pup whole, three-quarter on, the block beside it
  [10.3, [18, 8.5, 32], [-1, 6.5, -14], 1.25],
  [11.0, [1.4, 1.1, 7.2], [0, 4.5, -30], 1.3], // the flex: the pup whole above the bubbles, the gap and the sea behind it
  [16.0, [1.1, 1.1, 6.6], [0, 4.5, -30], 1.3],
  [19.8, [1.0, 1.1, 6.4], [0, 4.5, -30], 1.3],
];
const FOV = [44, 58]; // wide, tall: the dimension's own lens, wider than the island's 35
const EYE = new Vector3();
const LOOK = new Vector3();
const A = new Vector3();
const B = new Vector3();
const RL = new Vector3();
const DIR = new Vector3();
const V = new Vector3();
const W = new Vector3();
const RES = new Vector2();
function lens(t, tall, eye, look) {
  let i = 0;
  while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const [t0, e0, l0, k0] = KEYS[i];
  const [t1, e1, l1, k1] = KEYS[i + 1];
  const u = smooth(t0, t1, t);
  look.set(l0[0] + (l1[0] - l0[0]) * u, l0[1] + (l1[1] - l0[1]) * u, l0[2] + (l1[2] - l0[2]) * u);
  eye.set(e0[0] + (e1[0] - e0[0]) * u, e0[1] + (e1[1] - e0[1]) * u, e0[2] + (e1[2] - e0[2]) * u);
  if (tall) {
    // a tall screen stands back along the ground only, keeping the eye's height
    const k = k0 + (k1 - k0) * u;
    eye.x = look.x + (eye.x - look.x) * k;
    eye.z = look.z + (eye.z - look.z) * k;
  }
}

// the footfalls: s since the last one (9 if none yet) and how many have fallen
function footfall(t) {
  if (t < T.beat0) return [9, 0];
  const n = Math.min(Math.floor((t - T.beat0) / T.beat), Math.floor((T.beatEnd - T.beat0) / T.beat));
  return [t - (T.beat0 + n * T.beat), n + 1];
}

// the pup's nose and mouth in the scene's frame, from the anchors the pup writes every frame of a scene (D.jsx)
const nose = (out) => out.copy(live.anchors?.nose ?? out.set(0, 1, 0.6)).sub(V.set(live.seal.x, 0, live.seal.z));
const mouth = (out) => out.copy(live.anchors?.mouth ?? out.set(0, 0.7, 0.6)).sub(V.set(live.seal.x, 0, live.seal.z));

const pupScale = (t) => {
  const up = smooth(T.swell[0], T.swell[1], t);
  const over = t > T.swell[1] && t < T.shrink[0] ? 1 + 0.12 * Math.sin(Math.PI * Math.min(1, (t - T.swell[1]) / 0.3)) : 1;
  return 1 + (TITAN * over - 1) * up * (1 - smooth(T.shrink[0], T.shrink[1], t));
};
const pupYaw = (t) => {
  const a = 2.55 + (Math.PI - 2.55) * smooth(6.6, 7.3, t); // three-quarters toward the Wall, then square to it to eat
  return a + (0.22 - a) * smooth(T.shrink[0] - 0.1, T.shrink[1] + 0.2, t); // then round to the lens for the flex
};

export default function Move(cut) {
  const { tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const full = mode === "full";
  const k = useMemo(() => (full ? takeKit() : null), [full]);
  const st = useRef({ island: [], hidden: false, restored: 0, pup: null, paint: null, outfit: null, orders: [], plates: new Uint8Array(PLATES.length), banner: null, last: -1, free: false });
  const clear = useMemo(() => {
    // the drawing draws over everything: after the island's opaque pass the depth is cleared, so the
    // charcoal (render order 1000 up) only lets the island through where it has burnt away
    const m = new Mesh(new PlaneGeometry(0.001, 0.001), new MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    m.renderOrder = 999;
    m.frustumCulled = false;
    m.onBeforeRender = (r) => r.clearDepth();
    return m;
  }, []);

  useEffect(() => {
    const s = st.current;
    const place = PLACE_BY_ID["pr-mujoco-3396"];
    s.banner = makeBanner({ logo: place?.logo, repos: "google-deepmind · mujoco #3396 · mujoco_warp #1541 · mujoco #3450" });
    if (!full) {
      s.banner.set("still");
      return () => s.banner.dispose();
    }
    s.banner.set("slam");
    s.island = islandList(scene);
    const p = pupParts(scene);
    s.pup = p;
    if (p?.root) {
      s.paint = pupCharcoal(p.root, p.head);
      p.root.traverse((o) => {
        if (o.isMesh) s.orders.push([o, o.renderOrder]);
      });
      // the outfit (a cap, here) is the head's scaled group: the crown takes its place
      s.outfit = p.head?.children.find((c) => c.type === "Group" && Math.abs(c.scale.x - 1) > 1e-3) ?? null;
      p.head?.add(k.crown);
      k.crown.visible = false;
    }
    return () => {
      s.banner.dispose();
      for (const o of s.island) o.visible = true;
      s.paint?.dispose();
      for (const [o, r] of s.orders) o.renderOrder = r;
      if (s.outfit) s.outfit.visible = true;
      if (p?.root) p.root.scale.setScalar(1);
      k.group.add(k.crown);
      live.inStage = false;
      clear.geometry.dispose();
      clear.material.dispose();
      dropKit();
    };
  }, [scene, gl, full, k, clear]);

  // AFTER THE PUP IS PLACED (Seal.jsx, -1): its scale, its turn, its paint, its crown
  useFrame((state) => {
    const s = st.current;
    const p = s.pup;
    if (!full || !p?.root) return;
    const a = live.arrival;
    if (!a.id) {
      p.root.scale.setScalar(1);
      s.paint?.set(false);
      k.crown.visible = false;
      if (s.outfit) s.outfit.visible = true;
      for (const [o, r] of s.orders) o.renderOrder = r;
      return;
    }
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    const on = t >= T.inside && t < T.burn[1];
    p.root.scale.setScalar(pupScale(onTwos(t)));
    if (t >= T.inside) p.root.rotation.y = pupYaw(t);
    s.paint?.set(on && !s.free);
    k.crown.visible = t >= T.inside && t < T.home[1];
    if (s.outfit) s.outfit.visible = !k.crown.visible;
    for (const [o, r] of s.orders) o.renderOrder = on ? 1005 + (r > 0 ? 1 : 0) : r;
  }, -0.5);

  // THE LENS, after CameraRig (0): the scene's own shots, cut in behind the impact frame, handed back at the end
  useFrame((state) => {
    const a = live.arrival;
    if (!full || !a.id) return;
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    const w = (t >= T.inside ? 1 : 0) * (1 - smooth(T.home[0], T.home[1], t));
    if (w <= 0) return;
    const cam = state.camera;
    lens(t, state.size.width < state.size.height, EYE, LOOK);
    // the footfalls and the stomp shake the frame for two drawings each
    const [since] = footfall(t);
    const stomp = t - T.swell[1];
    const amp = (since < 0.17 ? 0.07 : 0) + (stomp > 0 && stomp < 0.25 ? 0.22 : 0);
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;
    EYE.x += live.seal.x + amp * odd;
    EYE.y += amp * 0.6 * odd;
    EYE.z += live.seal.z;
    LOOK.x += live.seal.x;
    LOOK.z += live.seal.z;
    DIR.set(0, 0, -1).applyQuaternion(cam.quaternion);
    RL.copy(cam.position).addScaledVector(DIR, 20);
    cam.position.lerp(EYE, w);
    RL.lerp(LOOK, w);
    cam.lookAt(RL);
    const fov = 35 + (FOV[state.size.width < state.size.height ? 1 : 0] - 35) * w;
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    if (cam.far < 900) {
      cam.far = 900;
      cam.updateProjectionMatrix();
    }
  }, 0.5);

  useCutFrame((t, state) => {
    const s = st.current;
    if (!full) return;
    const tt = onTwos(t);
    const g = k.group;
    const up = t >= T.inside && t < T.burn[1];
    g.visible = up;
    clear.visible = up;
    live.inStage = up;
    s.banner.set(t >= 0.9 ? "out" : "slam");
    g.position.set(live.seal.x, 0, live.seal.z);

    // THE ISLAND: hidden while the drawing is up, brought back a slice a frame under it before it burns
    if (up && !s.hidden) {
      s.hidden = true;
      for (const o of s.island) o.visible = false;
    }
    if (s.hidden && t >= T.restore[0]) {
      const want = Math.ceil(s.island.length * Math.min(1, (t - T.restore[0]) / (T.restore[1] - T.restore[0])));
      while (s.restored < want) s.island[s.restored++].visible = true;
    }
    if (!up) return;

    // the shared inks: the stroke size, the clock, the burn
    U.uPx.value = state.gl.getPixelRatio();
    U.uTime.value = t;
    state.gl.getDrawingBufferSize(RES);
    U.uRes.value.copy(RES);
    const burn = smooth(T.burn[0], T.burn[1], t);
    U.uBurn.value = t >= T.burn[0] ? burn * 1.9 - 0.02 : -1;
    V.set(live.seal.x, 4.5, live.seal.z + zF(0)).project(state.camera);
    U.uBurnC.value.set((V.x * 0.5 + 0.5) * RES.x, (V.y * 0.5 + 0.5) * RES.y);
    // the pup is the first thing the burn frees: back in its own colours when the ember edge passes it
    A.set(live.seal.x, 0.6, live.seal.z).project(state.camera);
    s.free = U.uBurn.value > 0 && Math.hypot((A.x * 0.5 + 0.5) * RES.x - U.uBurnC.value.x, (A.y * 0.5 + 0.5) * RES.y - U.uBurnC.value.y) / RES.y < U.uBurn.value;

    const [since, falls] = footfall(t);
    const quake = since < 0.25 ? 1 - since / 0.25 : 0;

    // THE GROUND: the crack races to the Wall; the ice crust cracks a little more each footfall
    const gu = k.ground.material.uniforms;
    gu.uCrack.value = smooth(T.crack[0], T.crack[1], t);
    gu.uIce.value = Math.min(1, falls * 0.09 + (t > T.swell[1] ? 0.35 : 0));
    gu.uSea.value = smooth(T.shrink[0], T.gulls + 0.6, t); // the gap opens: the sea comes in blue
    gu.uQuake.value = quake;

    // THE FACES: they tremble and glow, then the skin splits off them and falls
    k.faces.forEach((f, i) => {
      const tr = smooth(T.tremble[0], T.tremble[1], t) * (t < SPLIT[i] ? 1 : 0);
      f.position.set(tr * 0.08 * Math.sin(tt * 90 + i), tr * 0.05 * Math.cos(tt * 70 + i), 0);
      const u = f.material.uniforms;
      u.uBreak.value = Math.max(0, t - SPLIT[i]);
      u.uGlow.value.setRGB(1, 0.5, 0.18);
      u.uGlowK.value = tr * 0.3;
    });
    // their eyes: open, ember, steaming
    FACES.forEach((f, i) => {
      const open = smooth(SPLIT[i] + 0.1, SPLIT[i] + 0.4, tt);
      const y = f.x === 0 ? 15.37 : 15.19;
      for (const sg of [-1, 1]) put(k.eyes, i * 2 + (sg + 1) / 2, f.x + sg * 1.27, y, zF(f.x) - 1.05, 0.95, Math.max(0.001, 0.62 * open * (0.85 + 0.15 * Math.sin(t * 9 + i))), 0.25);
    });
    k.eyes.instanceMatrix.needsUpdate = true;
    k.titanMat.uniforms.uRib.value = 0.75 * smooth(4.3, 5.2, t);

    // THE SKIN: plate by plate from the crowned face outward; each tips out, falls and lies as rubble
    let moved = false;
    for (let i = 0; i < PLATES.length; i++) {
      const p = PLATES[i];
      const d = t - T.skin - p.delay;
      if (d < 0 || s.plates[i] === 2) continue;
      moved = true;
      const y = p.y - 4.9 * d * d;
      if (y < 0.6) {
        s.plates[i] = 2;
        put(k.plates, i, 0, -60, 0, 0.001);
        const zl = p.z + 2.2 + 2 * p.seed;
        put(k.rubble, i * 2, p.x - 0.6, 0.35, zl, 0.55 + 0.4 * p.seed, 0.4, 0.6, p.seed * 3, p.seed * 5, 0);
        put(k.rubble, i * 2 + 1, p.x + 0.7, 0.3, zl + 0.8 * p.seed, 0.45, 0.35, 0.5, p.seed * 7, p.seed * 2, 0);
        continue;
      }
      put(k.plates, i, p.x + (p.seed - 0.5) * d * 2, y, p.z + 1.8 * d, 2.96, 2.46, 0.8, -d * (1.2 + p.seed), p.yaw, (p.seed - 0.5) * d);
    }
    if (moved) k.plates.instanceMatrix.needsUpdate = k.rubble.instanceMatrix.needsUpdate = true;

    // THE MARCH: the seal-titans crest the horizon and come on, stepping on the beat
    const rise = smooth(T.rise[0], T.rise[1], t);
    for (const m of [k.marchNear, k.marchFar]) {
      // once the copies are eaten the Rumbling has nothing to march for: it sinks away into its own steam
      const gone = smooth(T.gulls - 0.4, T.gulls + 1.6, t);
      m.position.set(0, -170 * (1 - rise) - 260 * gone, Math.max(0, t - T.rise[0]) * 4);
      m.visible = rise > 0 && gone < 1;
    }
    for (const m of k.marchMats) m.uniforms.uStep.value = Math.max(0, (t - T.beat0) / T.beat);

    // EREN: coat and hair whipping in the steam, on twos
    k.coat.rotation.set(-(0.45 + 0.3 * Math.abs(Math.sin(tt * 7))), 0, 0.08 * Math.sin(tt * 11));

    // THE BELL swings after each footfall; THE COLONY ducks at each, and cheers on twos once the Wall is open
    k.bell.rotation.z = 0.45 * Math.exp(-since * 1.4) * Math.sin(since * 7) * (falls > 0 ? 1 : 0);
    k.colonyAt.forEach((c, i) => {
      const cheer = t > T.gulls ? Math.abs(Math.sin(tt * 9 + c.seed * 6)) * 0.5 : 0;
      put(k.colony, i, c.x, c.y + cheer, c.z, 0.85, 0.85 * (1 - 0.45 * quake), 0.85, 0, c.yaw + (cheer > 0 ? Math.sin(tt * 5 + i) * 0.6 : 0), 0);
    });
    k.colony.instanceMatrix.needsUpdate = true;

    // THE PENGUINS stampede across the square, waddling and belly-sliding; a few are tossed by a footfall (on twos)
    if (Math.floor(t * 12) !== s.last) {
      s.last = Math.floor(t * 12);
      for (let i = 0; i < N.penguins; i++) {
        const pg = k.penguin[i];
        const age = tt - pg.t0;
        const x = pg.x0 - pg.v * (pg.slide ? 1.6 : 1) * age;
        if (age < 0 || x < -70) {
          put(k.penguins, i, 0, -60, 0, 0.001);
          continue;
        }
        let y = 0;
        let spin = 0;
        if (pg.toss && since < 1.1 && falls > 2) {
          y = Math.max(0, 7 * since - 9 * since * since) * 1.3;
          spin = since * 9;
        }
        const wob = Math.sin(age * 14 + pg.seed * 9);
        if (pg.slide) put(k.penguins, i, x, y + 0.18, pg.lane, 1.25, 1.25, 1.25, -Math.PI / 2 + 0.15 + spin, -Math.PI / 2, 0);
        else put(k.penguins, i, x, y + Math.abs(wob) * 0.06, pg.lane, 1.25, 1.25, 1.25, spin, -Math.PI / 2, wob * 0.28);
      }
      k.penguins.instanceMatrix.needsUpdate = true;
    }

    // THE BOLT strikes the pup: a jagged mesh, flickering on twos
    const bolt = t >= T.bolt[0] && t < T.bolt[1] && Math.floor(t * 24) % 3 !== 1;
    k.bolt.visible = k.boltGlow.visible = bolt;
    if (bolt) {
      const yaw = Math.atan2(state.camera.position.x - live.seal.x, state.camera.position.z - live.seal.z);
      k.bolt.position.set(0.2, 0.6, 0);
      k.bolt.scale.set(16, 75, 1);
      k.bolt.rotation.set(0, yaw, 0);
      k.boltGlow.position.copy(k.bolt.position);
      k.boltGlow.scale.set(24, 75, 1);
      k.boltGlow.rotation.copy(k.bolt.rotation);
    }

    // THE PUP: the opening sign, a crouch before the strike, the mouth open to eat, flippers up on the catch
    const sc = pupScale(tt);
    const yaw = pupYaw(t);
    live.pose.sign = signAt(tl, t) * (1 - smooth(1.6, 2.0, t));
    live.pose.crouch = smooth(6.4, 6.75, t) * (1 - smooth(T.swell[0], T.swell[1], t));
    live.pose.mouth = smooth(T.eat[0] - 0.2, T.eat[0], t) * (1 - smooth(T.eat[1], T.eat[1] + 0.2, t));
    live.pose.raise = smooth(T.flip[1] - 0.1, T.flip[1] + 0.15, t) * (1 - smooth(13.6, 14.0, t));
    live.pose.fist = smooth(14.0, 14.3, t) * (1 - smooth(tl.collapse[0], tl.collapse[1], t));
    // the steam off its shoulders while it is a titan
    const sm = k.steam.material.uniforms;
    sm.uClock.value = t;
    sm.uPup.value.set(live.seal.x, 0, live.seal.z);
    sm.uPupK.value = sc;
    k.ash.material.uniforms.uClock.value = tt;
    k.cols.material.uniforms.uClock.value = t;

    // THE BLOCK: eaten top course first, each cube spiralling into the open mouth
    const ea = t - T.eat[0];
    if (ea > 0 && ea < T.eat[1] - T.eat[0] + 1.2) {
      mouth(B);
      const per = (T.eat[1] - T.eat[0] - 0.9) / BLOCK.ny;
      for (let i = 0; i < CELLS.length; i++) {
        const [x, y, z, c] = CELLS[i];
        const u = (ea - (BLOCK.ny - 1 - c) * per - hash(i, 7) * per * 0.9) / 0.9;
        if (u <= 0) continue;
        if (u >= 1) {
          put(k.block, i, 0, -60, 0, 0.001);
          continue;
        }
        const e = u * u * (3 - 2 * u);
        const th = u * Math.PI * 4 + hash(i, 2) * 6;
        const r = 3.2 * Math.sin(Math.PI * u) * (0.6 + 0.4 * hash(i, 3));
        const sz = 0.7 * (1 - 0.8 * e);
        put(k.block, i, x + (B.x - x) * e + Math.cos(th) * r, y + (B.y - y) * e + Math.sin(th) * r, z + (B.z - z) * e, sz, sz, sz, th, th * 0.7, 0);
      }
      k.block.instanceMatrix.needsUpdate = true;
    }
    // THE BLUE CUBE: on the cobbles at the block's foot, then onto the nose; flipped and caught on the flex
    const fly = smooth(T.shrink[0], T.shrink[1], t);
    nose(A);
    A.y += 0.08; // on top of the nose
    const fl = Math.min(1, Math.max(0, (t - T.flip[0]) / (T.flip[1] - T.flip[0])));
    const hop = 0.7 * Math.sin(Math.PI * fl);
    const size = 0.72 + (0.24 - 0.72) * fly;
    k.blue.position.set(BLUE_AT[0] + (A.x - BLUE_AT[0]) * fly, BLUE_AT[1] + (A.y + size / 2 + hop - BLUE_AT[1]) * fly + 2.5 * Math.sin(Math.PI * fly), BLUE_AT[2] + (A.z - BLUE_AT[2]) * fly);
    k.blue.rotation.set(fl * Math.PI * 4, yaw, 0);
    k.blue.scale.setScalar(size);

    // THE GULLS burst off the cliff on the last word of line B and wheel out over the sea
    const ga = t - T.gulls;
    for (let i = 0; i < N.gulls; i++) {
      if (ga < 0) {
        put(k.gulls, i, 0, -60, 0, 0.001);
        continue;
      }
      const wheel = hash(i, 1) * Math.PI * 2 + ga * (0.6 + 0.3 * hash(i, 2));
      const x = (hash(i, 3) - 0.5) * 14 + Math.cos(wheel) * (4 + ga * 1.2);
      const z = -29 - ga * (4 + 3 * hash(i, 4)) + Math.sin(wheel) * (4 + ga * 1.2);
      const y = 12 + 6 * hash(i, 5) + ga * 0.8 + Math.sin(ga * 2 + i) * 1.5;
      const flap = Math.floor(t * 12 + i) % 2 ? 1 : -0.6;
      put(k.gulls, i, x, y, z, 2.2, 2.2 * flap, 2.2, 0.15 * Math.sin(wheel), wheel + Math.PI / 2, -0.4);
    }
    k.gulls.instanceMatrix.needsUpdate = true;

    // where the bubbles' tails point: the crowned titan's mouth for line A, then the pup's
    const at = (live.pupAt ??= { x: 0, y: 0, z: 0 });
    if (t < tl.lineB) {
      at.x = live.seal.x;
      at.y = FACE_Y - 2.2;
      at.z = live.seal.z + zF(0) - 1;
    } else {
      mouth(W);
      at.x = live.seal.x + W.x;
      at.y = W.y;
      at.z = live.seal.z + W.z;
    }
  });

  if (!full) return null;
  return (
    <>
      <primitive object={clear} />
      <primitive object={k.group} />
    </>
  );
}
