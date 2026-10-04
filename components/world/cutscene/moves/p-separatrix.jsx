"use client";

// Separatrix: Fist of the North Star. THE PUP IS KENSHIRO. A thug (the kit's
// broad silhouette with a mohawk, ONE spiked shoulder pad and a coin) leers:
// a coin flip decides your side. The pup squashes and swells (ribbon scraps
// burst off its chest, the shirt rip with no shirt) and throws the flurry:
// twenty hard-edged jabs on twos from its own flipper tip, each at a parcel
// on the arena, each with a white hit spark, ATATATATA! in a big arc, a
// two-frame shake on the last. It turns its back and says "You're already
// decided." Every parcel clear of the coral curve rolls to its own cyan pool
// and rings (TING); the thug's coin comes down inside the coral band and
// tears in two that slide toward both pools and fade, "..." where it was, and
// the thug is frozen in NANI?!. Six costume pups on the bottom edge duck at
// the barrage and pop up with !! as the gate lifts; the Big Dipper hangs over
// the ridge. Shape, colour and pose only. Card: cards/p-separatrix.js.
// Cost: about 36 draws, ~3.2k triangles, no post.

import { useEffect, useMemo, useRef } from "react";
import { BackSide, BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Object3D, OctahedronGeometry, PlaneGeometry, Quaternion, RingGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Speaker, Stage, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { figureAt } from "../../../../lib/world/cutscene/timeline";
import { PUN } from "../../../../lib/world/cutscene/cards/p-separatrix.js";
import { additive, crowdFrame, disposeCrowd, disposeLetter, fade, figPoint, figureFrame, flat, flipperTip, glowMat, letterMesh, makeCrowd, outK, placeLetter, popAt, ramp, rand, ribbon, sealRig, toss, tossAt, twos, useCredit, useLineSwitch, useShake, useStageGroup } from "./g5/fx";

const CYAN = "#06b6d4";
const CYAN_HI = "#9be8f5";
const CORAL = "#ff6b5a";
const CREAM = "#faf7ef";
const GOLD = "#ffd23f";
const INK = "#1c1630";
const COIN_FLIP = [2.35, 3.0];
const SQUASH = 3.0;
const BARRAGE = 3.15;
const DRAWINGS = 10; // twenty jabs: two a drawing
const TURN = [4.0, 4.4];
const ROLL = 4.3;
const COIN_ARC = [5.0, 5.45];
const TEAR = 5.6;
const POOLS = [[-2.9, -1.9], [3.7, -1.5]];
const LAND = [0.2, -2.1]; // inside the coral band
const PARCELS = 10;
const SCRAPS = 20;
const SPOT = 0.25; // a jab's spark, s

const cx = (z) => 0.55 + 0.35 * Math.sin(z * 1.15 + 0.6);
const DIPPER = [[0, 0], [0.9, -0.12], [1.15, 0.62], [0.2, 0.78], [-0.55, 1.0], [-1.25, 1.25], [-1.95, 1.12]];
const Z_AXIS = new Vector3(0, 0, 1);
const V = new Vector3();
const W = new Vector3();
const W2 = new Vector3();
const Q = new Quaternion();
const HAND = [-0.845, 1.286, 0.62]; // the thug's open hand, figure space (broad build)

const strip = (g) => {
  const t = g.index ? g.toNonIndexed() : g;
  t.deleteAttribute("uv");
  t.deleteAttribute("normal");
  return t;
};

export default function Separatrix(cut) {
  const { card, tl, mode } = cut;
  const p = paletteFor(card);
  const refs = useRef({});
  const k = useMemo(() => {
    // the parcels: where each sits, which pool it rolls to, and when it is jabbed
    const r = rand(5);
    const parcels = Array.from({ length: PARCELS }, (_, i) => {
      const z = -0.9 - i * 0.31;
      const side = i % 2 ? 1 : -1;
      return { x: cx(z) + side * (1.1 + 1.1 * r()), z, pool: side < 0 ? 0 : 1, at: ROLL + i * 0.07, hits: [] };
    });
    for (let d = 0; d < DRAWINGS; d++) for (const j of [0, 1]) parcels[(d * 3 + j) % PARCELS].hits.push(BARRAGE + d / 12);
    const spike = (x, y, z, h, rr, rx, rz) => strip(new ConeGeometry(rr, h, 5).translate(0, h / 2, 0).rotateX(rx).rotateZ(rz).translate(x, y, z));
    const mohawk = (g) => mergeGeometries([-0.14, -0.07, 0, 0.07, 0.14].map((z, i) => spike(0, 1.935 + (i % 2 ? 0 : 0.015), z, 0.3 - Math.abs(z) * 0.5, 0.05 + g, 0, 0)));
    const pad = (g) => mergeGeometries([strip(new SphereGeometry(0.15 + g, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(-0.46, 1.52, 0)), ...[-1, -0.35, 0.35, 1].map((s) => spike(-0.46 + s * 0.09, 1.62, 0, 0.26 + g, 0.04 + g, 0, s * -0.4 + 0.15))]);
    const halves = [0, 1].map((h) => new CircleGeometry(0.15, 16, h * Math.PI, Math.PI).rotateX(-Math.PI / 2));
    const stars = new InstancedMesh(strip(new OctahedronGeometry(1, 0).scale(0.4, 1, 0.1)), flat(CREAM), DIPPER.length);
    const bolt = strip(new OctahedronGeometry(0.5, 0).scale(0.14, 0.14, 1).translate(0, 0, 0.5)); // a tapered streak, 0..1 along z
    const m = {
      parcels,
      ink: flat(INK),
      inkRim: flat(p.rim, { side: BackSide }),
      cream: flat(CREAM),
      mohawk: mohawk(0),
      mohawkRim: mohawk(0.02),
      pad: pad(0),
      padRim: pad(0.02),
      stars,
      // the arena
      floor: new ShaderMaterial({
        uniforms: { uC: { value: new Vector3() } },
        transparent: true,
        depthWrite: false,
        vertexShader: "varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
        fragmentShader: "uniform vec3 uC;varying vec3 vW;void main(){float r=length(vW.xz-uC.xz)/8.;float bands=0.5+0.5*sin((vW.x-uC.x)*1.4+sin((vW.z-uC.z)*0.9)*1.2);vec3 col=mix(vec3(0.20,0.11,0.30),vec3(0.36,0.2,0.46),bands);gl_FragColor=vec4(pow(col,vec3(2.2)),(1.-smoothstep(0.3,0.95,r))*0.95);}",
      }),
      floorGeo: new CircleGeometry(8, 48).rotateX(-Math.PI / 2),
      band: ribbon(Array.from({ length: 24 }, (_, i) => [cx(-i * 0.17), i * 0.17]), 0.95).rotateX(-Math.PI / 2),
      bandMat: additive(CORAL, { opacity: 0.32 }),
      curve: ribbon(Array.from({ length: 24 }, (_, i) => [cx(-i * 0.17), i * 0.17]), 0.14).rotateX(-Math.PI / 2),
      curveMat: flat(CORAL),
      poolGeo: new CircleGeometry(1, 28).rotateX(-Math.PI / 2),
      pool: glowMat(CYAN, 1.2),
      parcelMesh: new InstancedMesh(new IcosahedronGeometry(0.2, 1), flat(CREAM), PARCELS),
      discs: new InstancedMesh(new RingGeometry(0.2, 0.34, 18).rotateX(-Math.PI / 2), flat("#8d82a8", { transparent: true, opacity: 0.8 }), PARCELS),
      rings: new InstancedMesh(new RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2), flat(CYAN_HI), PARCELS),
      // the barrage
      streaks: new InstancedMesh(bolt, flat(CYAN_HI), 2),
      cores: new InstancedMesh(bolt, flat("#ffffff"), 2),
      sparks: new InstancedMesh(strip(new OctahedronGeometry(1, 0).scale(1, 0.4, 0.1)), flat("#ffffff"), 4),
      scraps: new InstancedMesh(new PlaneGeometry(0.16, 0.06), flat(CREAM), SCRAPS),
      // the coin and the gate
      coin: new CylinderGeometry(0.15, 0.15, 0.025, 18).rotateX(Math.PI / 2),
      coinMat: flat(GOLD, { transparent: true }),
      halves,
      halfMat: flat(GOLD, { transparent: true }),
      pole: new CylinderGeometry(0.05, 0.06, 0.62, 8),
      bar: new BoxGeometry(1.15, 0.07, 0.07).translate(0.57, 0, 0),
      dummy: new Object3D(),
    };
    for (const i of [m.stars, m.parcelMesh, m.discs, m.rings, m.streaks, m.cores, m.sparks, m.scraps]) i.frustumCulled = false;
    return m;
  }, [p]);

  const letters = useMemo(
    () => ({
      ata: [letterMesh("ATATA", CYAN, 120), letterMesh("TATATA", CYAN, 120), letterMesh("TAAA!", CYAN, 120)],
      nani: letterMesh("NANI?!", CYAN, 120),
      ting: [letterMesh("TING", CYAN, 120), letterMesh("TING", CYAN, 120)],
      dots: letterMesh("...", CYAN, 120),
      bang: [letterMesh("!!", CYAN, 120), letterMesh("!!", CYAN, 120)],
    }),
    [],
  );
  const crowd = useMemo(() => makeCrowd(6, p.ink, ["#ffd23f", "#e03b3b", "#4fb4ff", "#22c55e", "#e94bff", "#ff8a1a"]), [p]);
  const spots = useMemo(() => [-0.93, -0.8, -0.67, 0.67, 0.8, 0.93].map((x) => [x, -0.8]), []);
  const scrapState = useMemo(() => {
    const r = rand(41);
    return Array.from({ length: SCRAPS }, () => ({ ...toss(r, 0.55, 0.8), a: r() * 6.28, s: 0.8 + r() * 0.8 }));
  }, []);
  // the dipper's stars: placed once
  useEffect(() => {
    const D = k.dummy;
    DIPPER.forEach(([x, y], i) => {
      D.position.set(-0.2 + x * 0.8, 2.1 + y * 0.8, -6.5);
      D.scale.setScalar(0.22);
      D.rotation.set(0, 0, 0);
      D.updateMatrix();
      k.stars.setMatrixAt(i, D.matrix);
    });
    k.stars.instanceMatrix.needsUpdate = true;
  }, [k]);
  useEffect(
    () => () => {
      [...letters.ata, letters.nani, ...letters.ting, letters.dots, ...letters.bang].forEach(disposeLetter);
      disposeCrowd(crowd);
    },
    [letters, crowd],
  );

  useShake(cut, [BARRAGE + (DRAWINGS - 1) / 12, TEAR], 0.06);
  useCredit(cut, "teerthsharma/separatrix", "Python", "top-k, argmin and threshold · certified or refused");
  useLineSwitch(card, tl, PUN);

  // the pup: swells, throws the flurry from the flipper, turns its back and walks away
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = outK(tl, t);
    const F = Math.floor(t * 12);
    const swell = ramp(SQUASH, SQUASH + 0.12, t) * (1 - ramp(SQUASH + 0.3, SQUASH + 0.42, t));
    const barrage = t >= BARRAGE && t < BARRAGE + DRAWINGS / 12;
    live.pose.crouch = swell * 0.7 * o;
    live.pose.raise = swell * o;
    if (barrage) {
      live.pose.point = 1 * o;
      live.pose.fist = (F % 2 ? 1 : 0.5) * o;
      live.pose.crouch = (F % 2 ? 0.1 : 0.3) * o; // the body lags a drawing behind each jab
    }
    live.pose.spin = 0.5 * ramp(TURN[0], TURN[1], t) * (1 - ramp(tl.collapse[0], tl.collapse[1], t));
    if (t > TURN[1] && t < 5.7) live.pose.crouch = Math.max(live.pose.crouch, (Math.floor((t - TURN[1]) / 0.4) % 2 ? 0.05 : 0.35) * o); // three slow steps away
  });

  const hide = () => {
    if (refs.current.fig) refs.current.fig.visible = false;
  };
  const root = useStageGroup(
    cut,
    (t, state) => {
      const r = refs.current;
      const tt = twos(t);
      const F = Math.floor(t * 12);
      const o = outK(tl, t);
      const D = k.dummy;
      const seal = live.seal;
      const rig = sealRig(state.scene);
      k.floor.uniforms.uC.value.set(seal.x, 0, seal.z);
      const arena = ramp(2.35, 2.7, t);

      // --- the thug's add-ons ride the figure: mohawk, one spiked pad; the group follows its entrance frames and its shake
      const ff = figureFrame(t, tl, mode);
      r.fig.visible = Boolean(ff);
      const nani = t >= TEAR && t < TEAR + 1.1;
      r.shake.position.x = nani ? Math.sin(F * 5.1) * 0.07 : 0;
      if (ff) {
        const at = figureAt(card);
        const sc = 1.12;
        r.fig.position.set(seal.x + at[0], at[1], seal.z + at[2]);
        r.fig.scale.set(sc * ff[0], sc * ff[1], sc * ff[0]);
        r.fig.rotation.y = -0.42;
        r.mohawk.rotation.z = nani ? Math.sin(tt * 40) * 0.07 : Math.sin(tt * 3) * 0.02; // the mohawk wobbles through NANI
      }
      // --- the coin: flipped over his open hand on line A, then thrown onto the ridge, torn in two
      figPoint(card, HAND, W);
      const flip = t >= COIN_FLIP[0] && t < COIN_FLIP[1];
      const throwing = t >= COIN_ARC[0] && t < TEAR;
      const torn = t >= TEAR;
      r.coin.visible = (flip || throwing || (t >= COIN_FLIP[1] && t < COIN_ARC[0])) && Boolean(ff) && o > 0.1;
      if (r.coin.visible) {
        if (throwing) {
          const u = ramp(COIN_ARC[0], COIN_ARC[1], t);
          const e = Math.min(1, u);
          r.coin.position.set(W.x + (LAND[0] - W.x) * e, W.y + 0.2 + (0.04 - W.y) * e + 1.1 * Math.sin(Math.PI * e), W.z + (LAND[1] - W.z) * e);
        } else if (flip) {
          const a = (t - COIN_FLIP[0]) / (COIN_FLIP[1] - COIN_FLIP[0]);
          r.coin.position.set(W.x, W.y + 0.15 + 0.55 * Math.sin(Math.min(1, a * 2) * Math.PI) * (a < 0.5 ? 1 : 0), W.z + 0.1);
        } else r.coin.position.set(W.x, W.y + 0.12, W.z + 0.1);
        r.coin.quaternion.copy(state.camera.quaternion);
        r.coin.rotateX(t < COIN_ARC[0] ? 0 : tt * 14);
        r.coin.rotateY(flip ? tt * 18 : 0);
      }
      // the landed coin tears: two halves slide toward both pools and fade, nothing is returned
      const ta = t - TEAR;
      r.halves.visible = torn && ta < 1.1;
      if (r.halves.visible) {
        const e = ramp(0, 0.9, ta);
        r.half0.position.set(LAND[0] - 0.06 + (POOLS[0][0] - LAND[0]) * 0.28 * e, 0.045, LAND[1] + (POOLS[0][1] - LAND[1]) * 0.28 * e);
        r.half1.position.set(LAND[0] + 0.06 + (POOLS[1][0] - LAND[0]) * 0.28 * e, 0.045, LAND[1] + (POOLS[1][1] - LAND[1]) * 0.28 * e);
        r.half0.rotation.y = -0.5 * e;
        r.half1.rotation.y = 0.5 * e;
        fade(k.halfMat, 1 - ramp(0.3, 1.0, ta));
      }
      // --- the arena: floor, coral curve and band, two pools, the gate
      r.arena.visible = arena > 0;
      r.arena.scale.setScalar(Math.max(arena * o, 0.001));
      const verdict = ramp(ROLL, ROLL + 0.5, t);
      r.gate.rotation.z = 0.0 - 1.15 * ramp(ROLL + 0.1, ROLL + 0.45, t) * (1 - ramp(ROLL + 1.6, ROLL + 1.9, t));
      for (let i = 0; i < 2; i++) {
        const pool = r.pools[i];
        pool.scale.setScalar(1.15 + 0.08 * Math.sin(tt * 3 + i));
      }
      k.pool.uniforms.uA.value = 0.55 + 0.25 * verdict;

      // --- the dipper twinkles on twos; the seventh pulses on the certify ring
      k.stars.visible = arena > 0 && o > 0.02;
      DIPPER.forEach(([x, y], i) => {
        D.position.set(-0.2 + x * 0.8, 2.1 + y * 0.8, -6.5);
        D.quaternion.copy(state.camera.quaternion);
        const pulse = i === 6 ? 1 + 0.9 * Math.sin(Math.PI * ramp(ROLL, ROLL + 0.8, t)) : 1;
        D.scale.setScalar(0.2 * pulse * (0.82 + 0.18 * Math.sin(tt * 5 + i * 1.9)) * o);
        D.updateMatrix();
        k.stars.setMatrixAt(i, D.matrix);
      });
      k.stars.instanceMatrix.needsUpdate = true;

      // --- the parcels: jiggle on every jab, then roll to their own pool and ring
      k.parcels.forEach((pc, i) => {
        const u = ramp(0, 0.7, t - pc.at);
        const [px, pz] = POOLS[pc.pool];
        let jig = 0;
        for (const h of pc.hits) {
          const a = t - h;
          if (a > 0 && a < 0.3) jig = Math.max(jig, Math.sin(a * 60) * (1 - a / 0.3));
        }
        const done = t >= pc.at + 0.7;
        const rise = ramp(2.5 + i * 0.03, 2.8 + i * 0.03, t);
        D.position.set(pc.x + (px - pc.x) * u, 0.2 * (1 - u * 0.6) + 0.18 * Math.sin(Math.PI * u) - (done ? 0.3 : 0), pc.z + (pz - pc.z) * u);
        D.scale.set((1 + 0.22 * jig) * rise * o, (1 - 0.18 * jig) * rise * o * (done ? 0.0001 : 1), (1 + 0.22 * jig) * rise * o);
        D.rotation.set(u * 9, 0, 0);
        D.updateMatrix();
        k.parcelMesh.setMatrixAt(i, D.matrix);
        D.position.set(pc.x, 0.03, pc.z);
        D.scale.setScalar(Math.max(rise * o * (u > 0 ? 0 : 1), 0.0001));
        D.rotation.set(0, 0, 0);
        D.updateMatrix();
        k.discs.setMatrixAt(i, D.matrix);
        // the ring as it certifies: a cyan ring opens at its pool and is gone
        const a = t - (pc.at + 0.7);
        D.position.set(px + (i % 3 - 1) * 0.12, 0.05, pz + ((i * 7) % 3 - 1) * 0.1);
        D.scale.setScalar(a >= 0 && a < 0.5 ? (0.12 + 0.55 * ramp(0, 0.4, a)) * (1 - ramp(0.35, 0.5, a)) + 0.0001 : 0.0001);
        D.updateMatrix();
        k.rings.setMatrixAt(i, D.matrix);
      });
      for (const m of [k.parcelMesh, k.discs, k.rings]) m.instanceMatrix.needsUpdate = true;
      // TING at the first two arrivals
      [0, 1].forEach((side) => {
        const pc = k.parcels.find((q) => q.pool === side);
        const a = t - (pc.at + 0.7);
        const sp = W2.set(POOLS[side][0] + seal.x, 0.7, POOLS[side][1] + seal.z).project(state.camera);
        placeLetter(state, letters.ting[side], sp.x, sp.y + 0.1, 0.075, side ? 0.1 : -0.1, a >= 0 && a < 0.8 ? popAt(a) * o : 0);
      });

      // --- THE BARRAGE: twenty jabs on twos from the flipper's own tip, each at a parcel
      const d = Math.floor((t - BARRAGE) * 12);
      const on = d >= 0 && d < DRAWINGS && Boolean(rig);
      k.streaks.visible = k.cores.visible = k.sparks.visible = on;
      if (on) {
        const tip = flipperTip(rig);
        for (let j = 0; j < 2; j++) {
          const pc = k.parcels[(d * 3 + j) % PARCELS];
          V.set(tip.x - seal.x, tip.y, tip.z - seal.z);
          W.set(pc.x, 0.25, pc.z).sub(V);
          const len = W.length() * (0.92 + 0.08 * (d % 2));
          Q.setFromUnitVectors(Z_AXIS, W.normalize());
          for (const [mesh, w] of [[k.streaks, 1.7], [k.cores, 0.65]]) {
            D.position.copy(V);
            D.quaternion.copy(Q);
            D.scale.set(w, w, len);
            D.updateMatrix();
            mesh.setMatrixAt(j, D.matrix);
          }
          // the hit spark: white, four-pointed, popped for one drawing
          const a = (t - BARRAGE) * 12 - d;
          D.position.set(pc.x + (j ? 0.1 : -0.08), 0.32 + 0.1 * j, pc.z + 0.2);
          D.quaternion.copy(state.camera.quaternion);
          D.rotateZ(d * 0.7 + j);
          D.scale.setScalar(SPOT * (1.4 - a) * 1.5);
          D.updateMatrix();
          k.sparks.setMatrixAt(j, D.matrix);
          D.scale.setScalar(SPOT * (1.4 - a) * 0.9);
          D.rotateZ(0.78);
          D.updateMatrix();
          k.sparks.setMatrixAt(j + 2, D.matrix);
        }
        for (const m of [k.streaks, k.cores, k.sparks]) m.instanceMatrix.needsUpdate = true;
      }
      // ATATATATA! in a big arc across the lower half's top, popping on twos
      const ba = t - BARRAGE;
      const bOn = ba >= 0 && ba < DRAWINGS / 12 + 0.5;
      letters.ata.forEach((m, i) => placeLetter(state, m, -0.5 + i * 0.5, 0.1 + (i === 1 ? 0.06 : 0), 0.12, 0.17 - i * 0.17 + (F % 2 ? 0.02 : 0), bOn ? popAt(ba - i * 0.06) * (1 + 0.04 * (F % 2)) * o : 0));
      // --- the shirt rip: ribbon scraps burst off its chest and settle on the floor
      k.scraps.visible = t >= SQUASH + 0.3;
      scrapState.forEach((s, i) => {
        const a = t - (SQUASH + 0.3);
        if (a < 0) D.scale.setScalar(0.0001);
        else {
          const q = tossAt(s, a * 0.8, W);
          D.position.set(0.1 + s.a * 0 + W.x, W.y, 0.55 + W.z);
          D.rotation.set(-Math.PI / 2 * q.settle + a * s.spin * (1 - q.settle) * 0.4, 0, s.z0 * q.settle + (1 - q.settle) * s.spin * a);
          D.scale.setScalar(s.s * o);
        }
        D.updateMatrix();
        k.scraps.setMatrixAt(i, D.matrix);
      });
      k.scraps.instanceMatrix.needsUpdate = true;

      // --- NANI?! shakes over the thug; "..." where the coin was
      const head = figPoint(card, [0, 2.15, 0], W);
      const hp = V.set(head.x + seal.x, head.y, head.z + seal.z).project(state.camera);
      placeLetter(state, letters.nani, hp.x - 0.05 + (nani ? Math.sin(F * 5.1) * 0.012 : 0), Math.min(0.62, hp.y + 0.14), 0.14, 0.08, nani ? popAt(ta) * o : 0);
      const dp = W2.set(LAND[0] + seal.x, 0.5, LAND[1] + seal.z).project(state.camera);
      placeLetter(state, letters.dots, dp.x, dp.y + 0.05, 0.1, 0, ta > 0.5 && ta < 2.2 ? popAt(ta - 0.5) * o : 0);

      // --- the crowd ducks at the barrage, then pops up with !! as the gate lifts
      const duck = ramp(BARRAGE - 0.1, BARRAGE, t) * (1 - ramp(ROLL, ROLL + 0.1, t));
      const popUp = t >= ROLL + 0.1 ? 1 : 0;
      crowdFrame(
        crowd,
        state,
        arena > 0.5 && o > 0.02,
        spots.map(([x, y], i) => [x, y - 0.3 * duck - (1 - ramp(2.6 + i * 0.05, 2.9 + i * 0.05, t)) * 0.4]),
        (i) => 0.12 * (i === 0 || i === 3 ? 1.15 : 1) * (0.3 + 0.7 * o),
        (i, q) => {
          q.hop = (popUp && Math.sin(tt * 9 + i * 1.3) > 0.2 ? 1 : 0) * 0.8;
          q.l = q.r = popUp ? (Math.floor(t * 3 + i) % 2 ? 1 : 0.6) : 0;
          q.pitch = duck * 0.4;
        },
      );
      letters.bang.forEach((m, i) => placeLetter(state, m, i ? 0.8 : -0.8, -0.46, 0.1, i ? 0.12 : -0.12, t >= ROLL + 0.15 ? popAt(t - ROLL - 0.15) * ramp(0, 0.5, 1.2 - (t - ROLL - 0.15)) * o : 0));
    },
    hide,
  );

  const set = (name) => (m) => {
    refs.current[name] = m;
  };
  return (
    <>
      <Stage {...cut} />
      <group ref={set("shake")}>
        <Speaker {...cut} />
        <group ref={set("fig")} visible={false}>
          <group ref={set("mohawk")}>
            <mesh geometry={k.mohawkRim} material={k.inkRim} />
            <mesh geometry={k.mohawk} material={k.ink} />
          </group>
          <mesh geometry={k.padRim} material={k.inkRim} />
          <mesh geometry={k.pad} material={k.ink} />
        </group>
      </group>
      <group ref={root} visible={false}>
        <group ref={set("arena")}>
          <mesh geometry={k.floorGeo} material={k.floor} position={[0, 0.004, 0]} renderOrder={-0.5} />
          <mesh geometry={k.band} material={k.bandMat} position={[0, 0.02, 0]} />
          <mesh geometry={k.curve} material={k.curveMat} position={[0, 0.03, 0]} />
          {POOLS.map(([x, z], i) => (
            <mesh key={i} ref={(m) => (refs.current.pools ??= [])[i] = m} geometry={k.poolGeo} material={k.pool} position={[x, 0.025, z]} />
          ))}
          <group position={[-2.0, 0.31, -0.6]}>
            <mesh geometry={k.pole} material={k.ink} />
            <group ref={set("gate")} position={[0, 0.3, 0]}>
              <mesh geometry={k.bar} material={k.cream} />
            </group>
          </group>
        </group>
        <primitive object={k.stars} />
        <primitive object={k.parcelMesh} />
        <primitive object={k.discs} />
        <primitive object={k.rings} />
        <primitive object={k.streaks} />
        <primitive object={k.cores} />
        <primitive object={k.sparks} />
        <primitive object={k.scraps} />
        <mesh ref={set("coin")} geometry={k.coin} material={k.coinMat} visible={false} />
        <group ref={set("halves")} visible={false}>
          <mesh ref={set("half0")} geometry={k.halves[0]} material={k.halfMat} />
          <mesh ref={set("half1")} geometry={k.halves[1]} material={k.halfMat} />
        </group>
        {letters.ata.map((m, i) => (
          <primitive key={i} object={m} />
        ))}
        <primitive object={letters.nani} />
        <primitive object={letters.ting[0]} />
        <primitive object={letters.ting[1]} />
        <primitive object={letters.dots} />
        <primitive object={letters.bang[0]} />
        <primitive object={letters.bang[1]} />
        {crowd.g.map((m, i) => (
          <primitive key={i} object={m} />
        ))}
      </group>
    </>
  );
}
