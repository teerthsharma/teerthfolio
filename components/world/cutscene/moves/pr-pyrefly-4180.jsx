"use client";

// pyrefly: Naruto, the night of the Nine-Tails, chained and sealed, in a KIRI-E PAPER THEATRE: a back-lit cut-paper
// shadow theatre (Japanese kiri-e, Lotte Reiniger's silhouettes, wayang puppets). Every piece of scenery and every
// figure is a flat extruded card with a cream paper core; light comes THROUGH washi; the puppets are rigid cut pieces
// joined by brass split-pins; there is no drawn line and no post pass. The pup stays our real 3D pup, flattened to three
// card-value steps with a cream die-cut outline, in the Fourth's white haori.
//
// THE PLAY. A banner (overlay.jsx) slams in over the arrival and docks into the top bar. The stage blooms: the layers of
// the clearing rise from flat like a pop-up book. Kurama roars (line A) and gathers a dark orb. The pup flings 208 gold
// links (each a pair of beads) that coil round the fox; at link 100 a violet hoop shuts (the budget is spent); the fox
// surges and a coral change runs the other 108 links to the pin and bursts (the failure). The pup slams its flippers;
// a violet kirigami rosette pops up from flat and holds the burst; a second brass split-pin punches through its centre
// and splays. Kushina cheers "dattebane!", the seal flexes the numbers, the credit card holds.
// THE RETURN (why we come home): the play is over. An end plaque flips up on the pillar, the lamp behind the paper dies
// and the flats are lowered one by one through the stage floor, front to back, until only the real island is left.
// Cost: one instanced chain, one instanced tail set, one merged mesh a layer; no allocation per frame.
// Card: lib/world/cutscene/cards/pr-pyrefly-4180.js. Parts: ./pr-pyrefly-4180/.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, Color, DoubleSide, Group, HalfFloatType, InstancedMesh, Mesh, Object3D, ShaderMaterial, SphereGeometry, Vector3, WebGLRenderTarget } from "three";
import { radiusAt, turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { Stage, onTwos, signAt, smooth, useCutFrame } from "../kit";
import { flipperAt, usePupPost } from "./g3/common";
import { islandList, pupParts } from "./p-caustic/parts";
import { CTRL, DOOR, KUNAI, N, buildChain, buildFtg, buildFx, buildPlaque, buildSplitPin, poseChain, splayPin } from "./pr-pyrefly-4180/chain";
import { mountOverlay } from "./pr-pyrefly-4180/overlay";
import { U, card, disposeFibre, hash, merge } from "./pr-pyrefly-4180/paper";
import { SHINOBI, buildColony, buildHokage, buildKurama, buildKushina, buildShinobi, poseColony, poseKurama, poseKushina } from "./pr-pyrefly-4180/puppets";
import { haori, paperPup } from "./pr-pyrefly-4180/pup";
import { FLOOR, groundY, worldLayers, worldMaterials } from "./pr-pyrefly-4180/world";

// the clock (s from the arrival). The card's beats put line A at 2.3, B at 6.0, the flex at 10.5, the credit at 15.5.
const T = {
  rise: [1.45, 2.7],
  roarA: [2.3, 2.6, 3.2, 3.7],
  orb: [3.4, 5.1, 5.15, 5.5],
  throw: [2.8, 3.1],
  grow: [7.0, 8.9],
  taut: [8.9, 9.4],
  lurch: [8.85, 9.05, 9.3, 9.8],
  roarB: [8.8, 9.1, 10.2, 10.8],
  bolt: [9.05, 9.4],
  surge: [9.4, 10.9],
  burst: 10.9,
  slam: [10.9, 11.25, 13.8, 14.3],
  rose: [11.15, 11.85],
  pin: [13.1, 13.45],
  clack: [13.45, 13.75],
  cheer: 13.6,
  hop: [5.5, 6.4, 7.3, 8.95], // Flying Thunder God: to kunai 1, 2, 3, then home
  K: [13.4, 18.6], // REAL seconds (Kushina's line, 5.2 s, right after the pin clacks home)
  plaque: 15.6,
  fold: 16.9,
  reveal: 17.3,
};
// the play's own clock `t` runs slower than the render clock `tr` (the owner's pacing law: every bubble up 5 s, the flex 7.7 s,
// the credit 4 s+, a breath between beats). Every T above is on the play's clock; these pairs [play, real] join them.
const ANCH = [[0, 0], [2.3, 2.3], [5.5, 7.9], [10.5, 14.3], [15.5, 22.8], [16.9, 26.0], [17.3, 26.8], [19.4, 28.4]];
const remap = (tr) => {
  for (let i = 1; i < ANCH.length; i++) if (tr <= ANCH[i][1]) return ANCH[i - 1][0] + ((tr - ANCH[i - 1][1]) * (ANCH[i][0] - ANCH[i - 1][0])) / (ANCH[i][1] - ANCH[i - 1][1]);
  return tr - 28.4 + 19.4;
};
const HOOP_AT = T.grow[0] + (T.grow[1] - T.grow[0]) * (DOOR / (N - 1));
const FOX = new Vector3(3.5, groundY(-8.5), -8.5);
const FOX0 = 2.2; // where the chain path was drawn
const bump = (a, b, c, d, t) => smooth(a, b, t) * (1 - smooth(c, d, t));

const V = new Vector3();
const W = new Vector3();
const O = new Object3D();

// the sky shell: the bloom's bubble of plum night, then the dome the theatre stands in (pinprick stars, an ember horizon)
function skyShell() {
  const g = new SphereGeometry(1, 40, 20);
  const m = new ShaderMaterial({
    uniforms: { uCore: { value: new Vector3() }, uInside: { value: 0 }, uFade: U.uFade },
    side: DoubleSide,
    depthWrite: false,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      uniform vec3 uCore;
      uniform float uInside, uFade;
      varying vec3 vW;
      float h(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vW - (uInside > 0.5 ? cameraPosition : uCore));
        float up = clamp(d.y * 1.8 + 0.1, 0.0, 1.0);
        vec3 c = mix(vec3(0.115, 0.045, 0.2), vec3(0.03, 0.02, 0.1), up);
        c += vec3(0.5, 0.17, 0.08) * exp(-abs(d.y) * 9.0) * 0.55;
        vec3 q = floor(d * 140.0);
        float s = step(0.9965, h(q)) * step(0.0, d.y);
        c += vec3(0.9, 0.9, 1.0) * s;
        float a = 1.0;
        if (uInside < 0.5 && gl_FrontFacing) a = 0.88;
        gl_FragColor = vec4(c * uFade, a);
      }`,
  });
  return { g, m };
}

export default function Move(cut) {
  const { card: spec, place, tl, mode } = cut;
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const rig = useRef();
  const theatre = useRef();
  const shellRef = useRef();
  const pup = useRef(null);
  const island = useRef([]);
  const shake = useRef(new Vector3());
  const S = useRef({ off: new Vector3(), gone: false, built: false, fs: 1, ax: 1, phase: 0, kp: { x: 0, y: 0 } });
  const shell = useMemo(skyShell, []);
  const mats = useMemo(() => (mode === "full" ? worldMaterials() : null), [mode]);

  // THE BANNER and Kushina's bubble: the dock's own HUD (overlay.jsx); a skip unmounts it with the move
  useEffect(() => mountOverlay({ mode, K: T.K, shared: S.current.kp }), [mode, tl]);

  // BUILD, in slices of a few milliseconds each, while the banner holds the screen: nothing stalls the first frames
  useEffect(() => {
    if (mode !== "full") return undefined;
    const s = S.current;
    const th = theatre.current;
    island.current = islandList(scene);
    pup.current = pupParts(scene);
    const own = []; // geometries, instanced meshes and helpers to dispose
    const track = (o) => (own.push(o), o);
    const layers = [];
    s.layers = layers;
    const queue = [];
    let timer = 0;
    let dead = false;

    const addLayer = (d) => {
      const mesh = new Mesh(d.g, mats[d.m]);
      mesh.frustumCulled = false;
      mesh.renderOrder = d.m === "cloud" || d.m === "smoke" ? 3 : 0;
      const g = new Group();
      g.add(mesh);
      g.position.set(d.px, d.y, d.z);
      g.visible = false;
      th.add(g);
      track(d.g);
      layers.push({ d, g, mesh });
    };

    // the pup: toon twin materials with a cream hull, and the haori
    queue.push(() => {
      const p = pup.current;
      if (!p?.root) return;
      s.toon = track(paperPup(p.root));
      if (p.rear) {
        s.haori = haori(p, mats.solid);
        p.rear.add(s.haori.g);
        track({ dispose: s.haori.dispose });
      }
    });
    // the world, one layer a slice
    const gen = worldLayers();
    const step = () => {
      const r = gen.next();
      if (r.done) return;
      addLayer(r.value);
      queue.unshift(step);
    };
    queue.push(step);
    // the puppets, the chain, the effects
    queue.push(() => {
      s.fox = new Group();
      s.kur = buildKurama(mats);
      s.fox.add(s.kur.root);
      th.add(s.fox);
      s.chain = buildChain(mats);
      s.chainRoot = new Group();
      s.chainRoot.add(s.chain.links);
      th.add(s.chainRoot);
      track(s.chain.links.geometry);
      track(s.chain.links);
      track(s.kur.tails);
      track(s.kur.joints);
      s.kur.root.traverse((o) => o.isMesh && track(o.geometry));
    });
    queue.push(() => {
      s.ftg = buildFtg(mats);
      th.parent.add(s.ftg.root);
      s.ftg.root.traverse((o) => o.isMesh && track(o.geometry));
      s.fx = buildFx(mats);
      th.add(s.fx.root);
      s.fx.root.traverse((o) => o.isMesh && track(o.geometry));
      s.pin1 = buildSplitPin(mats, 0.42);
      s.pin2 = buildSplitPin(mats, 0.62);
      th.add(s.pin1, s.pin2);
      splayPin(s.pin1, 1);
      s.pin2.visible = false;
      s.plaque = buildPlaque();
      th.add(s.plaque);
      for (const pn of [s.pin1, s.pin2]) pn.traverse((o) => o.isMesh && track(o.geometry));
      track(s.plaque.geometry);
      track(s.plaque.material);
      track(s.plaque.material.map);
    });
    queue.push(() => {
      s.kush = buildKushina(mats);
      th.add(s.kush.root);
      s.hoke = buildHokage(mats);
      th.add(s.hoke.root);
      s.kush.root.traverse((o) => o.isMesh && track(o.geometry));
      s.hoke.root.traverse((o) => o.isMesh && track(o.geometry));
    });
    queue.push(() => {
      // the branch the masked shinobi crouch on, and the five of them
      s.shin = buildShinobi(mats);
      const branch = merge([card([[-1.2, -8], [-0.4, -8], [-0.5, 3.0], [-1.1, 3.0]], { color: "#150d26", depth: 0.7 }), card([[-0.9, 0.3], [9.5, 0.1], [9.6, 0.5], [-0.9, 0.8]], { color: "#1b1130", depth: 0.5 }), card([[3, 0.35], [4.6, 1.6], [4.9, 1.45], [3.6, 0.3]], { color: "#1b1130", depth: 0.3 })]);
      s.branch = new Group();
      s.branch.add(new Mesh(branch, mats.solid), s.shin);
      th.add(s.branch);
      track(branch);
      track(s.shin.geometry);
      s.colony = buildColony(mats);
      th.add(s.colony.root);
      s.colony.root.traverse((o) => o.isMesh && track(o.geometry));
      track(s.colony.pups.geometry);
      // cut-paper leaves and ember curls swirling across the clearing: one instanced mesh each
      const leaf = merge([card([[-0.14, 0], [0, 0.07], [0.16, 0], [0, -0.07]], { color: "#ffffff", depth: 0.012 }), card([[-0.02, 0], [0.18, 0.005], [0.18, -0.005]], { color: "#ffffff", depth: 0.014, z: 0.01 })]);
      s.leaves = new InstancedMesh(leaf, mats.solid, 90);
      const ember = card([[0, -0.05], [0.12, 0], [0.2, 0.08], [0.1, 0.14], [0.0, 0.08], [0.06, 0.02]], { color: "#ff8a3a", depth: 0.01 });
      s.embers = new InstancedMesh(ember, mats.glow, 60);
      for (const m of [s.leaves, s.embers]) m.frustumCulled = false;
      const C = new Color();
      for (let i = 0; i < 90; i++) s.leaves.setColorAt(i, C.set(["#7a2b1c", "#a2461f", "#5b2318", "#3c1d2a"][i % 4]));
      for (let i = 0; i < 60; i++) s.embers.setColorAt(i, C.set(i % 3 ? "#ff8a3a" : "#ffc060"));
      th.add(s.leaves, s.embers);
      track(leaf);
      track(ember);
      track(s.leaves);
      track(s.embers);
    });
    queue.push(() => {
      // compile every program now, off the main thread (parallel shader compile), with everything made visible for the
      // walk: the hoop, the rosette, the pins, the plaque and the pup's own toon and hull programs included
      const saved = [];
      th.traverse((o) => (saved.push([o, o.visible]), (o.visible = true)));
      const warm = [];
      for (const mt of s.toon?.materials ?? []) {
        const d = new Mesh(new BoxGeometry(0.01, 0.01, 0.01), mt);
        d.frustumCulled = false;
        th.add(d);
        warm.push(d);
      }
      // the composer draws into a half-float target, which keys the programs differently from the canvas: compile into one
      const rt = new WebGLRenderTarget(8, 8, { type: HalfFloatType });
      const prevRt = gl.getRenderTarget();
      const rv = rig.current.visible;
      rig.current.visible = true;
      gl.setRenderTarget(rt);
      let done = Promise.resolve();
      try {
        done = gl.compileAsync(rig.current, camera, scene);
      } catch {
        // a lost context compiles nothing; the first frame will
      }
      gl.setRenderTarget(prevRt);
      rig.current.visible = rv;
      for (const [o, v] of saved) o.visible = v;
      let ready = false;
      done.then(
        () => {
          for (const d of warm) (d.removeFromParent(), d.geometry.dispose());
          ready = true;
        },
        () => (ready = true)
      );
      // GEOMETRY AND TEXTURE UPLOAD, one object a slice: each child of the theatre is drawn once into the 8x8 target with the
      // island and everything else hidden, so no buffer is first uploaded on a visible frame. Waits for the async compile first.
      let top = rig.current;
      while (top.parent && top.parent !== scene) top = top.parent;
      for (const child of [...th.children]) {
        queue.push(() => {
          if (!ready) return "wait";
          const keep = [];
          scene.traverse((o) => keep.push([o, o.visible]));
          for (const c of scene.children) c.visible = c === top || c.isLight;
          const rv2 = rig.current.visible;
          const tv = th.visible;
          rig.current.visible = th.visible = true;
          const cv = th.children.map((c) => c.visible);
          th.children.forEach((c) => (c.visible = c === child));
          const prev = gl.getRenderTarget();
          gl.setRenderTarget(rt);
          try {
            gl.render(scene, camera);
          } catch {
            // a lost context draws nothing
          }
          gl.setRenderTarget(prev);
          th.children.forEach((c, i) => (c.visible = cv[i]));
          th.visible = tv;
          rig.current.visible = rv2;
          for (const [o, v] of keep) o.visible = v;
        });
      }
      queue.push(() => {
        rt.dispose();
        s.built = true;
      });
    });

    const pump = () => {
      if (dead) return;
      const t0 = performance.now();
      while (queue.length && performance.now() - t0 < 4) {
        const f = queue.shift();
        if (f() === "wait") {
          queue.unshift(f);
          timer = setTimeout(pump, 40);
          return;
        }
      }
      if (queue.length) timer = setTimeout(pump, 0);
    };
    timer = setTimeout(pump, 0);

    return () => {
      dead = true;
      clearTimeout(timer);
      s.toon = null;
      s.built = false;
      for (const o of own) o?.dispose?.();
      for (const l of layers) l.g.removeFromParent();
      for (const o of [s.ftg?.root, s.fox, s.chainRoot, s.fx?.root, s.pin1, s.pin2, s.plaque, s.kush?.root, s.hoke?.root, s.branch, s.colony?.root, s.leaves, s.embers]) o?.removeFromParent();
      for (const k of ["layers", "ftg", "fox", "kur", "chain", "chainRoot", "fx", "pin1", "pin2", "plaque", "kush", "hoke", "shin", "branch", "colony", "leaves", "embers", "haori", "flip"]) s[k] = null;
      pup.current = null;
      disposeFibre();
      for (const m of Object.values(mats)) m.dispose();
    };
  }, [mode, mats, scene, gl, camera]);

  useEffect(
    () => () => {
      shell.g.dispose();
      shell.m.dispose();
    },
    [shell]
  );

  // impacts shake the whole frame on twos (the pup with it); a skip clears the arrival and the scene draws nothing
  useFrame(() => {
    const p = pup.current;
    if (!live.arrival.id) {
      if (rig.current) rig.current.visible = false;
      S.current.toon?.set(false);
      if (S.current.haori) S.current.haori.g.visible = false;
      if (p?.root) p.root.rotation.z = 0;
      return;
    }
    if (p?.root && mode === "full") {
      p.root.position.add(shake.current).add(S.current.off);
      p.root.visible = !S.current.gone;
      p.root.rotation.z = 0.3 * (S.current.catchK ?? 0); // the Minato catch pose; Seal never sets roll
    }
  }, -0.5);

  // AFTER the pup's own frame: the flipper tip is where the chain bursts out of
  usePupPost(cut, (t, prig) => {
    const s = S.current;
    if (!s.chain || !theatre.current) return;
    theatre.current.updateWorldMatrix(true, false);
    s.flip = flipperAt(prig.flipR, theatre.current, [0.66, 0.06, 0]);
  });

  useCutFrame((tr, state, dt) => {
    const t = remap(tr);
    const s = S.current;
    const g = rig.current;
    const full = mode === "full";
    g.visible = full;
    if (!full) return;
    const seal = live.seal;
    const cam = state.camera;
    const th = theatre.current;
    const turn = turnFor(spec, place, seal.x, seal.z);
    const aspect = state.size.width / state.size.height;
    const ax = Math.min(1, Math.max(0.5, aspect / 1.4));
    const fs = aspect < 1 ? 0.58 : 0.9;
    s.ax = ax;

    // impacts: two drawings of shake each
    const hit = (a, k) => (t >= a && t < a + 0.17 ? k : 0);
    const odd = Math.floor(t * 12) % 2 ? 1 : -1;
    const amp = hit(HOOP_AT, 0.05) + hit(T.bolt[1], 0.04) + hit(T.burst, 0.16) + hit(T.pin[1], 0.12);
    shake.current.set(amp * odd, -amp * 0.6 * odd, 0);
    g.position.set(seal.x + shake.current.x, shake.current.y, seal.z);
    g.rotation.y = turn;

    // THE STAGE: the bloom's night, then the dome the theatre stands in
    const r = radiusAt(tl, tr);
    V.set(seal.x, 0.9, seal.z);
    const inside = r > cam.position.distanceTo(V) + 0.3;
    const over = tr > tl.collapse[1];
    shellRef.current.visible = r > 0.02 && !over;
    shellRef.current.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    shell.m.uniforms.uInside.value = inside ? 1 : 0;
    shell.m.uniforms.uCore.value.set(seal.x, 0.9, seal.z);
    th.visible = (inside || tr > tl.bloom[1]) && s.built && !over;

    // THE LAMP: the light behind the paper, dying as the play ends
    U.uFade.value = 1 - 0.78 * smooth(T.plaque + 0.5, T.fold + 0.6, t);
    U.uTime.value = t;

    // the camera's dolly and arc: parallax between the layers (the pup stays put)
    th.rotation.y = 0.14 * Math.sin((t - 1.5) * 0.33);
    th.position.set(0, 0, -1.2 + 2.4 * smooth(1.5, 17, t));

    // the pup: the sign, the throw (flippers out), the slam, the flex
    const lower = 1 - smooth(tl.collapse[0], tl.collapse[1], tr);
    live.pose.sign = signAt(tl, tr) * (1 - smooth(1.8, 2.3, t));
    live.pose.raise = Math.max(bump(T.throw[0], T.throw[1], T.throw[1] + 0.5, T.throw[1] + 0.8, t), smooth(T.grow[0] - 0.2, T.grow[0] + 0.3, t)) * (1 - smooth(T.burst - 0.05, T.burst + 0.1, t)) * lower;
    live.pose.raise = Math.max(live.pose.raise, s.catchK ?? 0) * lower;
    live.pose.crouch = bump(T.slam[0], T.slam[1], T.slam[2], T.slam[3], t) * 0.8 * lower;
    live.pose.fist = smooth(T.clack[1] + 0.8, T.clack[1] + 1.2, t) * (1 - smooth(15.6, 16.0, t)) * lower;
    const on = (inside || tr > tl.bloom[1]) && t < T.reveal + 0.2;
    s.toon?.set(on);
    if (s.haori) {
      const k = smooth(0.6, 1.2, t);
      s.haori.g.visible = on && k > 0.01;
      s.haori.g.scale.setScalar(Math.max(0.01, 0.6 + 0.4 * k * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, Math.max(0, t - 0.6) / 0.7)))));
      const t2 = onTwos(t);
      for (let i = 0; i < s.haori.flaps.length; i++) {
        const p = s.haori.flaps[i];
        p.rotation.x = 0.45 + 0.35 * Math.sin(t2 * 9 + i * 0.9) + 0.4 * bump(T.burst, T.burst + 0.1, T.burst + 0.5, T.burst + 1.2, t);
        p.rotation.y = 0.12 * Math.sin(t2 * 7 + i * 1.7);
      }
    }
    if (!s.built) return;

    // THE LAYERS: they rise from flat, near to far (a pop-up book opening); at the end they are lowered through the floor
    for (let i = 0; i < s.layers.length; i++) {
      const { d, g: lg, mesh } = s.layers[i];
      const rise = smooth(T.rise[0] + d.order * 0.05, T.rise[0] + d.order * 0.05 + 0.7, t);
      const sink = 60 * smooth(T.fold + d.order * 0.06, T.fold + d.order * 0.06 + 0.75, t);
      lg.visible = rise > 0.003 && sink < 59;
      lg.position.x = d.px * (d.fg ? ax : 1);
      lg.position.y = d.y - sink - (d.sink ? 5 * (1 - rise) : 0);
      lg.rotation.x = d.sink ? 0 : -(Math.PI / 2) * (1 - rise);
      lg.rotation.z = d.sway * Math.sin(t * 0.9 + i * 1.3);
      if (d.flame) mesh.scale.set(1, 1 + 0.18 * Math.sin(onTwos(t) * 13), 1);
    }

    // FLYING THUNDER GOD: three kunai thrown round the fox; the pup flashes to each, yellow streaks between, then home
    {
      const F = s.ftg;
      const P = [[0, 0, 0], ...KUNAI, [0, 0, 0]];
      const HT = T.hop;
      let at = 0;
      for (let i = 0; i < 4; i++) if (t >= HT[i]) at = i + 1;
      const cur = P[at];
      const dz = 0.14;
      s.catchK = 0;
      for (const h of HT) s.catchK = Math.max(s.catchK, smooth(h, h + 0.1, t) * (1 - smooth(h + 0.4, h + 0.5, t)));
      s.gone = at > 0 && HT.some((h) => t >= h && t < h + dz);
      const sa = Math.sin(turn);
      const ca = Math.cos(turn);
      s.off.set(cur[0] * ca + cur[2] * sa, 0, cur[2] * ca - cur[0] * sa);
      live.pupAt ??= { x: 0, y: 0, z: 0 };
      live.pupAt.x = seal.x + s.off.x;
      live.pupAt.y = 0.9;
      live.pupAt.z = seal.z + s.off.z;
      for (const m of [...F.flashes, ...F.cores, ...F.streaks, ...F.streaks2]) m.visible = false;
      const fold = t < T.fold;
      for (let k = 0; k < 3; k++) {
        const g = F.kunai[k];
        const thr = smooth(T.throw[0] + 0.1 * k, T.throw[1] + 0.35 + 0.1 * k, t);
        g.visible = thr > 0.01 && fold;
        const arc = 1 - (1 - thr) * (1 - thr);
        g.position.set(KUNAI[k][0] * arc, 0.9 + 1.6 * Math.sin(Math.PI * thr) * (1 - thr * 0.3) - 0.5 * thr, KUNAI[k][2] * arc + 0.3 * (1 - arc));
        g.rotation.z = thr < 1 ? -t * 18 : -1.15;
        g.scale.setScalar(2.4);
      }
      for (let i = 0; i < 4; i++) {
        const dt = t - HT[i];
        if (dt < 0 || dt > 0.45 || !fold) continue;
        const k = 1 - dt / 0.45;
        const a = P[i];
        const b = P[i + 1];
        const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
        const st = F.streaks[i];
        const st2 = F.streaks2[i];
        for (const m of [st, st2]) {
          m.visible = true;
          m.position.set(a[0], 1.0, a[2] + 0.2);
          m.rotation.set(0, Math.atan2(-(b[2] - a[2]), b[0] - a[0]), 0);
          m.scale.set(len, 1.1 * k + 0.1, 1);
        }
        for (const [pt, j] of [[a, 0], [b, 1]]) {
          const fl = F.flashes[(i % 2) * 2 + j];
          const co = F.cores[(i % 2) * 2 + j];
          fl.visible = co.visible = true;
          fl.position.set(pt[0], 1.0, pt[2] + 0.4);
          co.position.copy(fl.position);
          fl.scale.setScalar(0.3 + 1.6 * Math.sin(Math.PI * Math.min(1, dt / 0.45 + 0.1)));
          co.scale.setScalar(0.3 + 1.6 * k);
          fl.rotation.z = co.rotation.z = dt * 6 + i;
        }
      }
    }

    // THE FOX
    const sinkF = 60 * smooth(T.fold + 0.3, T.fold + 1.05, t);
    const stir = smooth(T.rise[0] + 0.3, T.rise[0] + 1.2, t);
    const bite = smooth(T.taut[0], T.taut[1], t);
    const roar = Math.max(bump(...T.roarA, t), bump(...T.roarB, t));
    const lurch = bump(...T.lurch, t);
    s.phase += dt * (1 - 0.75 * bite);
    const tp = Math.floor(s.phase * 12) / 12;
    const orb = 0.95 * smooth(T.orb[0], T.orb[1], t) * (1 - smooth(T.orb[2], T.orb[3], t));
    s.fox.visible = stir > 0.01 && sinkF < 59;
    s.fox.position.set(FOX.x - 0.6 * lurch, FOX.y - sinkF - 3 * (1 - stir), FOX.z);
    s.fox.scale.setScalar(Math.max(0.01, fs * (0.3 + 0.7 * stir)));
    poseKurama(s.kur, tp, { roar, lift: bump(2.2, 2.6, 3.5, 4.0, t) + lurch, thrash: 0.95 - 0.75 * bite, orb, sway: 0 });
    th.updateWorldMatrix(true, false);
    U.uEmberAt.value.set(FOX.x - 1.5, FOX.y + 3.5, FOX.z).applyMatrix4(th.matrixWorld);
    U.uEmberK.value = 0.55 + 0.35 * roar + 0.5 * bump(T.burst - 0.1, T.burst + 0.1, T.burst + 0.4, T.burst + 1.0, t);

    // THE CHAIN, the hoop at link 100, the surge, the burst, the rosette, the pins
    const pillarX = -2.9 * ax;
    const pinAt = [pillarX + 0.3, 1.25, -1.15];
    const sinkRr = 60 * smooth(T.fold + 0.1, T.fold + 0.85, t);
    const showChain = t >= T.grow[0] - 0.05 && sinkF < 59;
    s.chainRoot.visible = showChain;
    s.chainRoot.position.y = -sinkF;
    const fx = s.fx;
    fx.root.position.y = -sinkRr;
    for (const m of [fx.hoop, fx.hoopFlash, fx.bolt, fx.boltCore, fx.burst, fx.burstCore]) m.visible = false;
    if (showChain) {
      // the path follows the fox's scale (a narrow screen draws it smaller)
      if (s.fs !== fs) {
        s.fs = fs;
        for (let i = 1; i < s.chain.pts.length - 1; i++) {
          const src = CTRL[i];
          s.chain.pts[i].set(FOX.x + fs * (src[0] - FOX0), FOX.y + fs * (src[1] - FOX.y), FOX.z + fs * (src[2] - FOX.z));
        }
      }
      V.set(KUNAI[2][0], 0.8, KUNAI[2][2]); // the chain is the Reaper Death Seal: it starts at the third kunai
      rig.current.localToWorld(V);
      th.worldToLocal(V);
      W.set(pinAt[0], pinAt[1], pinAt[2]);
      const info = poseChain(s.chain, t, { grow: T.grow, taut: bite, surge: t >= T.surge[0] ? T.surge : null }, V, W);
      // the budget hoop at link 100: a flash, then it closes round the chain
      const dh = t - HOOP_AT;
      if (dh > 0 && dh < 4) {
        fx.hoop.visible = true;
        const close = smooth(0, 0.35, dh);
        fx.hoop.position.set(info.door[0], info.door[1], info.door[2] + 0.06);
        fx.hoop.scale.setScalar(Math.max(0.01, (1.9 - 0.95 * close) * fs));
        fx.hoopFlash.visible = dh < 0.45;
        fx.hoopFlash.position.copy(fx.hoop.position);
        fx.hoopFlash.scale.setScalar(Math.max(0.01, (2.2 - 1.2 * smooth(0, 0.45, dh)) * fs));
      }
      // the chain bursts out of the flipper: a cream star flash at its tip
      const fb = (t - (T.grow[0] - 0.05)) / 0.45;
      if (fb > 0 && fb < 1 && s.flip) {
        fx.boltCore.visible = true;
        fx.boltCore.position.set(s.flip.x, s.flip.y, s.flip.z + 0.25);
        fx.boltCore.scale.setScalar(1.3 * (1 - fb) * (0.5 + 0.5 * Math.sin(onTwos(t) * 40)) + 0.3);
        fx.boltCore.rotation.z = t * 5;
      }
      // the coral change leaps from the jaws to the chain just beyond the hoop, then runs the remaining links
      const bk = smooth(T.bolt[0], T.bolt[1], t);
      if (bk > 0 && t < T.surge[0]) {
        fx.bolt.visible = fx.boltCore.visible = true;
        V.set(-6.6, 3.0, 0.3).applyMatrix4(s.fox.matrixWorld);
        th.worldToLocal(V);
        const j = Math.min(N - 1, DOOR + 2);
        const P = s.chain.P;
        fx.bolt.position.set(V.x + (P[j * 3] - V.x) * bk, V.y + (P[j * 3 + 1] - V.y) * bk, V.z + (P[j * 3 + 2] - V.z) * bk + 0.2);
        fx.bolt.scale.setScalar(0.55 * fs);
        fx.boltCore.position.copy(fx.bolt.position);
        fx.boltCore.scale.setScalar(0.5 * fs);
        fx.bolt.rotation.z = fx.boltCore.rotation.z = t * 6;
      }
      if (t >= T.surge[0] && t < T.burst) {
        fx.bolt.visible = fx.boltCore.visible = true;
        fx.bolt.position.set(info.surge[0], info.surge[1], info.surge[2] + 0.2);
        fx.boltCore.position.copy(fx.bolt.position);
        fx.bolt.scale.setScalar(0.62 * fs);
        fx.boltCore.scale.setScalar(0.5 * fs);
        fx.bolt.rotation.z = fx.boltCore.rotation.z = t * 8;
      }
    }

    // the burst at the pin: the failure, held in the rosette, throbbing through its paper
    const bt = t - T.burst;
    const roseUp = smooth(T.rose[0], T.rose[1], t);
    const sinkR = 60 * smooth(T.fold + 0.1, T.fold + 0.85, t);
    if (bt > 0 && sinkR < 59) {
      const pop = bt < 0.18 ? 0.5 + 3.4 * (bt / 0.18) : 1.0 + 2.0 * Math.exp(-(bt - 0.18) * 5);
      const size = (roseUp > 0.5 ? 0.78 + 0.1 * Math.sin(onTwos(t) * 22) : pop) * fs;
      fx.burst.visible = fx.burstCore.visible = true;
      fx.burst.position.set(pinAt[0], pinAt[1], pinAt[2] + 0.1);
      fx.burstCore.position.copy(fx.burst.position);
      fx.burst.scale.setScalar(Math.max(0.01, size * 1.2));
      fx.burstCore.scale.setScalar(Math.max(0.01, size * 0.9));
      fx.burst.rotation.z = onTwos(t) * 1.5;
    }
    // the rosette pops up from flat and closes round the burst, holding it, trembling
    const rv = t > T.rose[0] - 0.02 && sinkR < 59;
    fx.roseA.visible = fx.roseB.visible = rv;
    if (rv) {
      const close = smooth(T.rose[0], T.rose[1] + 0.2, t);
      const tremble = onTwos(t) % 0.25 < 0.125 ? 1 : -1;
      const sc = (1.55 - 0.55 * close) * fs;
      const trem = t > T.rose[1] ? 0.025 * tremble : 0;
      for (const [m, sp] of [[fx.roseA, 1], [fx.roseB, -1.6]]) {
        m.position.set(pinAt[0], 0.1 + (pinAt[1] - 0.1) * roseUp, pinAt[2] - 0.05);
        m.rotation.set(-(Math.PI / 2) * (1 - roseUp), 0, onTwos(t) * 0.25 * sp + trem);
        m.scale.setScalar(Math.max(0.01, sc));
      }
    }
    // the first pin (the chain's end) and the second giant pin, punched down through the rosette's centre
    s.pin1.visible = showChain && sinkR < 59;
    s.pin1.position.set(pinAt[0] - 0.3, pinAt[1] + 0.05 - sinkR, pinAt[2] - 0.2);
    const pd = smooth(T.pin[0], T.pin[1], t);
    s.pin2.visible = t > T.pin[0] - 0.4 && sinkR < 59;
    s.pin2.position.set(pinAt[0], pinAt[1] + 3.6 * (1 - pd * pd) + 0.5 * pd - sinkR, pinAt[2] + 0.4);
    splayPin(s.pin2, smooth(T.clack[0], T.clack[1], t));
    s.pin2.scale.setScalar(Math.max(0.01, fs));

    // THE WITNESSES
    const kush = s.kush;
    const kStir = smooth(T.rise[0] + 0.5, T.rise[0] + 1.3, t);
    const sinkW = 60 * smooth(T.fold + 0.25, T.fold + 1.0, t);
    const shock = bump(T.burst, T.burst + 0.05, T.burst + 0.4, T.burst + 1.1, t) + 0.6 * bump(T.pin[1], T.pin[1] + 0.05, T.pin[1] + 0.3, T.pin[1] + 0.8, t);
    kush.root.visible = kStir > 0.01 && sinkW < 59;
    kush.root.position.set(4.6 * ax, groundY(-2.4) - sinkW, -2.4);
    kush.root.scale.set(-(1.2 + 0.7 * kStir) * Math.max(fs / 0.9, 0.7), (1.2 + 0.7 * kStir) * Math.max(fs / 0.9, 0.7), 1);
    poseKushina(kush, onTwos(t), { shock, wave: 1, reach: smooth(T.grow[0] - 0.2, T.grow[0] + 0.4, t) });
    // her mouth, on screen, for her bubble's tail
    kush.root.updateWorldMatrix(true, false);
    V.set(0.18, 2.5, 0.1).applyMatrix4(kush.root.matrixWorld).project(cam);
    s.kp.x = (V.x * 0.5 + 0.5) * state.size.width;
    s.kp.y = (0.5 - V.y * 0.5) * state.size.height;
    const hk = s.hoke.root;
    hk.visible = kStir > 0.01 && sinkW < 59;
    hk.position.set(8.2 * ax, FLOOR + 5.2 - sinkW, -16);
    hk.scale.setScalar(2.1);
    s.hoke.staff.rotation.z = 0.04 * Math.sin(t * 0.8);
    // the masked shinobi crouch on a branch; they flinch at the roar
    s.branch.visible = kStir > 0.01 && sinkW < 59;
    s.branch.position.set(-10.2 * ax, 5.1 - sinkW, -14);
    const flinch = Math.max(bump(...T.roarA, t), bump(...T.roarB, t));
    for (let i = 0; i < SHINOBI; i++) {
      O.position.set(1.2 + i * 1.55 * ax + 0.05 * Math.sin(onTwos(t) * 3 + i), 0.9 - 0.08 * flinch, 0.1 * (i % 2));
      O.rotation.set(0, 0, 0.02 * Math.sin(t + i) - 0.12 * flinch);
      O.scale.set(i % 2 ? -1.15 : 1.15, 1.15 - 0.15 * flinch, 1);
      O.updateMatrix();
      s.shin.setMatrixAt(i, O.matrix);
    }
    s.shin.instanceMatrix.needsUpdate = true;
    // the colony on its log: they duck at the roars and cheer on twos when the pin goes in
    s.colony.root.visible = kStir > 0.01 && sinkW < 59;
    s.colony.root.position.set(-5.4 * ax, groundY(-0.6) - sinkW, -0.6);
    s.colony.root.scale.setScalar(aspect < 1 ? 0.6 : 1);
    poseColony(s.colony, onTwos(t), { duck: flinch, cheer: smooth(T.cheer, T.cheer + 0.2, t) * (1 - smooth(14.6, 15.2, t)), ax });

    // CUT-PAPER LEAVES AND EMBER CURLS swirl across the clearing; they go as the flats fall
    const swirl = smooth(T.rise[1] - 0.4, T.rise[1] + 0.4, t) * (1 - smooth(T.fold - 0.4, T.fold, t));
    const lt = onTwos(t);
    for (let i = 0; i < 90; i++) {
      const a = hash(i, 1) * 6.28 + lt * (0.5 + 0.7 * hash(i, 2));
      const rr = 3 + 10 * hash(i, 3);
      const y = (hash(i, 4) * 6 + lt * (0.4 + hash(i, 5))) % 6;
      O.position.set(Math.cos(a) * rr * 0.9 - 1, 0.2 + y, -4 + Math.sin(a) * rr * 0.5 - 2);
      O.rotation.set(lt * (2 + hash(i, 6)), lt * 1.7 + i, lt * 3 + i);
      O.scale.setScalar(Math.max(0.0001, swirl * (0.9 + 0.8 * hash(i, 7))));
      O.updateMatrix();
      s.leaves.setMatrixAt(i, O.matrix);
    }
    for (let i = 0; i < 60; i++) {
      const y = (hash(i, 8) * 9 + lt * (0.9 + hash(i, 9))) % 9;
      O.position.set(-8 + 16 * hash(i, 10) + Math.sin(lt * 1.3 + i) * 0.9, y, -3 - 10 * hash(i, 11));
      O.rotation.set(0, 0, lt * 4 + i);
      O.scale.setScalar(Math.max(0.0001, swirl * (0.8 + 1.2 * hash(i, 12)) * (1 - y / 11)));
      O.updateMatrix();
      s.embers.setMatrixAt(i, O.matrix);
    }
    s.leaves.instanceMatrix.needsUpdate = s.embers.instanceMatrix.needsUpdate = true;

    // THE END PLAQUE flips up on the pillar (why we go home), then the lamp dies and the flats are lowered
    const pq = smooth(T.plaque, T.plaque + 0.4, t);
    s.plaque.visible = pq > 0.01 && sinkR < 59;
    s.plaque.position.set(pillarX, 3.1 - sinkR + 0.05 * Math.sin(t * 2.2) * pq, -0.9);
    s.plaque.scale.set(1.5 * fs, 1.9 * fs, 1);
    s.plaque.rotation.y = (1 - pq) * (Math.PI / 2);
    s.plaque.rotation.z = 0.05 * Math.sin(t * 2.2) * pq;

    // THE ISLAND, BACK, gradually, under the falling flats
    // the island steps back in a few objects a frame while the flats go down (never its 273 draws in one frame), from 26.0 s to 27.4 s
    const list = island.current;
    if (tr > 26.0 && tr < tl.collapse[0]) for (let i = 0; i < list.length; i++) if (tr > 26.0 + (1.4 * i) / list.length) list[i].visible = true;
  });

  return (
    <>
      <Stage {...cut} bare skip={() => true} />
      <group ref={rig} visible={false}>
        <mesh ref={shellRef} geometry={shell.g} material={shell.m} position={[0, 0.9, 0]} renderOrder={-3} frustumCulled={false} />
        <group ref={theatre} visible={false} />
      </group>
    </>
  );
}
