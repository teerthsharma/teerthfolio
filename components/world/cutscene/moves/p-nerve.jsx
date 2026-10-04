"use client";

// Nerve: Code Geass. THE PUP IS LELOUCH. It twirls, the ink cape (one sheet on
// its back, swaying in a vertex sine) flaring out, and speaks the famous line
// with one flipper over its face. Then the flipper drops, one eye flares red
// (a ring glint with a chevron wing either side) and the control fires from
// the flipper's own tip: a thick red beam at each of four hypothesis cards on
// a red and cream chessboard, a red-grey rain heaping over three, KRAK KRAK
// KRAK as each cracks, its shards bounce once and settle round a coral ring.
// The fourth, far out where no grain lands, is held up to the lens in the
// flipper. C.C. (the kit's long-maned silhouette, mirrored to the left edge on
// a rain gauge) takes a bite of pizza; eight costume pups on the bottom edge
// chant ALL HAIL SEALOUCH. The flame mutation's tuft rides the pup's head.
// Shape, colour and pose only. Card: lib/world/cutscene/cards/p-nerve.js.
// Cost: about 34 draws, ~3.4k triangles, no post.

import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CanvasTexture, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Quaternion, RingGeometry, SRGBColorSpace, ShaderMaterial, Shape, ShapeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Speaker, Stage, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { paletteFor } from "../../../../lib/world/cutscene/look";
import { additive, crowdFrame, disposeCrowd, disposeLetter, fade, flat, flipperTip, glowMat, letterMesh, makeCrowd, outK, placeLetter, popAt, ramp, rand, sealRig, twos, useAttach, useCredit, useShake, useStageGroup } from "./g5/fx";

const RED = "#ff2638";
const CORAL = "#ff6b5a";
const CREAM = "#faf7ef";
// where the four cards stand (x, z from the pup); the last is the live one, far out where no grain lands
const AT = [[1.0, -1.1], [2.0, -1.5], [3.0, -1.9], [-1.35, -3.0]];
const LABEL = ["H1", "H2", "H4", "H3"];
const LIVE = 3;
const BASE = 0.14; // the pedestal's height
const MID = BASE + 0.48; // a card's centre
const SHOT = [3.55, 3.85, 4.15, 4.45];
const CRACK = SHOT.slice(0, 3).map((s) => s + 0.5);
const GRAB = [4.75, 5.3];
const CHANT = 4.95;
const SHARDS = 8;
const GRAINS = 300;
const G = 7;
const Z_AXIS = new Vector3(0, 0, 1);
const V = new Vector3();
const W = new Vector3();
const Q = new Quaternion();
const W2 = new Vector3();

const poly = (pts) => {
  const s = new Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  return new ShapeGeometry(s);
};

function cardTexture(label) {
  const c = document.createElement("canvas");
  c.width = 144;
  c.height = 192;
  const x = c.getContext("2d");
  x.fillStyle = CREAM;
  x.fillRect(0, 0, 144, 192);
  x.strokeStyle = "#1c1630";
  x.lineWidth = 7;
  x.strokeRect(5, 5, 134, 182);
  x.fillStyle = "#1c1630";
  x.font = "700 46px 'Shantell Sans', 'Segoe Print', cursive";
  x.fillText(label, 20, 62);
  x.lineWidth = 5;
  x.lineCap = "round";
  for (const y of [94, 118, 142]) {
    x.beginPath();
    x.moveTo(20, y);
    x.quadraticCurveTo(62, y - 8, 122 - (y % 3) * 8, y + 2);
    x.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// the ink cape on the pup's back, in the body's frame (z the nose): a sheet from the neck to a jagged hem
const CU = 8;
const CV = 10;
function poseCape(g, tt, open, grow) {
  const a = g.attributes.position;
  for (let iv = 0; iv <= CV; iv++) {
    for (let iu = 0; iu <= CU; iu++) {
      const u = (iu / CU) * 2 - 1;
      const v = iv / CV;
      const hw = 0.16 + (0.3 + 0.95 * open) * v ** 0.9 + grow;
      const sway = Math.sin(tt * 2.6 + v * 3) * 0.08 * v * (0.6 + open * 0.5); // the hem swings: a vertex sine
      const lift = Math.abs(u) * v * 1.15 * open;
      const jag = iv === CV && iu % 2 ? 0.1 : 0;
      a.setXYZ(iv * (CU + 1) + iu, u * hw + sway, 0.66 - 0.6 * v + lift - jag + grow * 0.5, 0.72 - 1.2 * v - Math.abs(u) * v * 0.25 + Math.sin(tt * 2.2 + v * 2) * 0.07 * v - grow * 0.7);
    }
  }
  a.needsUpdate = true;
}

export default function Nerve(cut) {
  const { card, tl, mode } = cut;
  const p = paletteFor(card);
  const refs = useRef({ cards: [] });
  const k = useMemo(() => {
    const ink = flat(p.ink);
    const shards = new InstancedMesh(poly([[0, 0.13], [0.09, -0.08], [-0.1, -0.06]]), flat(CREAM), SHARDS * 3);
    const heaps = new InstancedMesh(new ConeGeometry(0.62, 1.05, 9), flat("#6f6a7e"), 3);
    const grains = new InstancedMesh(new IcosahedronGeometry(0.032, 0), flat("#9a95a8"), GRAINS);
    const rings = new InstancedMesh(new RingGeometry(0.3, 0.45, 28).rotateX(-Math.PI / 2), flat(CORAL), 3);
    const pedestals = new InstancedMesh(new CylinderGeometry(0.27, 0.32, BASE, 10), ink, 4);
    for (const m of [shards, heaps, grains, rings, pedestals]) m.frustumCulled = false;
    const wing = [[0.14, 0.02], [0.52, 0.2], [0.34, 0.01], [0.54, -0.1], [0.16, -0.04]];
    const wings = mergeGeometries([poly(wing), poly(wing.map(([x, y]) => [-x, y]).reverse())].map((g) => (g.index ? g.toNonIndexed() : g)));
    const tuftGeo = (h, r, x, y, rz) => new ConeGeometry(r, h, 5).translate(0, h / 2, 0).rotateZ(rz).translate(x, y, 0.1);
    // C.C.'s slice: a cream wedge with a cheese wedge over it
    const slice = poly([[0, 0.17], [0.14, -0.12], [-0.14, -0.12]]);
    return {
      ink,
      cards: LABEL.map((l) => new MeshBasicMaterial({ map: cardTexture(l), toneMapped: false, fog: false, side: DoubleSide })),
      cardGeo: new PlaneGeometry(0.72, 0.96),
      shards,
      heaps,
      grains,
      rings,
      pedestals,
      floor: new ShaderMaterial({
        uniforms: { uC: { value: new Vector3() }, uA: { value: new Vector3(0.7, 0.12, 0.17) }, uB: { value: new Vector3(0.9, 0.82, 0.68) } },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        vertexShader: "varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",
        fragmentShader: "uniform vec3 uC,uA,uB;varying vec3 vW;void main(){vec2 g=floor((vW.xz-uC.xz)/0.6);float c=mod(g.x+g.y,2.);vec3 col=mix(uA,uB*0.82,c);float r=length(vW.xz-uC.xz)/8.;gl_FragColor=vec4(pow(col,vec3(2.2)),(1.-smoothstep(0.35,0.95,r))*0.96);}",
      }),
      floorGeo: new CircleGeometry(8, 48).rotateX(-Math.PI / 2),
      beamGeo: new BoxGeometry(1, 1, 1).translate(0, 0, 0.5),
      beam: additive(RED, { opacity: 0.85 }),
      core: flat("#ffffff"),
      flashGeo: new RingGeometry(0.6, 1, 28),
      flash: additive("#ffffff"),
      // the cape: ink over a pale rim sheet
      cape: new PlaneGeometry(1, 1, CU, CV),
      capeRim: new PlaneGeometry(1, 1, CU, CV),
      capeInk: flat(p.ink),
      capeRimMat: flat(p.rim),
      // the geass: red ring glint, soft glow, a chevron wing either side
      ringGeo: new RingGeometry(0.1, 0.15, 24),
      glowGeo: new CircleGeometry(0.34, 20),
      glow: glowMat(RED, 1.4),
      red: additive(RED),
      wings,
      // the flame tuft: a central cluster (a mohawk, never a pair)
      tuftA: mergeGeometries([tuftGeo(0.34, 0.075, -0.1, 0.44, 0.35), tuftGeo(0.46, 0.085, 0, 0.47, 0), tuftGeo(0.32, 0.07, 0.1, 0.44, -0.35)].map((g) => (g.index ? g.toNonIndexed() : g).deleteAttribute("uv") ?? g)),
      flameA: flat("#ff4a1c"),
      tuftB: mergeGeometries([tuftGeo(0.2, 0.045, -0.06, 0.45, 0.25), tuftGeo(0.28, 0.05, 0.02, 0.48, 0.05)].map((g) => (g.index ? g.toNonIndexed() : g).deleteAttribute("uv") ?? g)),
      flameB: flat("#ffc13a"),
      // C.C.'s rain gauge, her slice and its cheese
      drum: new CylinderGeometry(0.4, 0.4, 0.6, 14),
      drumTop: new CylinderGeometry(0.43, 0.43, 0.04, 14),
      slice,
      cream: flat(CREAM),
      cheese: flat("#ffd23f"),
      cheeseGeo: new PlaneGeometry(1, 1),
      dummy: new Object3D(),
    };
  }, [p]);

  const letters = useMemo(
    () => ({
      shing: letterMesh("SHIIING", RED, 120),
      krak: [0, 1, 2].map(() => letterMesh("KRAK!", RED, 120)),
      hail: letterMesh("ALL HAIL", RED, 120),
      sealouch: letterMesh("SEALOUCH!", RED, 120),
    }),
    [],
  );
  const crowd = useMemo(() => makeCrowd(8, p.ink), [p]);
  const spots = useMemo(() => [-0.94, -0.81, -0.68, -0.55, 0.55, 0.68, 0.81, 0.94].map((x) => [x, -0.8]), []);

  // the pieces that ride the pup's bones: cape on the body, flame tuft and geass on the head
  const hung = useMemo(() => {
    const cape = new Group();
    const rim = new Mesh(k.capeRim, k.capeRimMat);
    const ink = new Mesh(k.cape, k.capeInk);
    rim.frustumCulled = ink.frustumCulled = false;
    cape.add(rim, ink);
    const tuft = new Group();
    tuft.add(new Mesh(k.tuftA, k.flameA), new Mesh(k.tuftB, k.flameB));
    const eye = new Group();
    const ring = new Mesh(k.ringGeo, k.red);
    const glow = new Mesh(k.glowGeo, k.glow);
    const wings = new Mesh(k.wings, k.red);
    eye.add(glow, ring, wings);
    eye.rotation.y = 0.5;
    for (const o of [cape, tuft, eye]) o.visible = false;
    return { cape, tuft, eye, parts: [["rear", cape], ["head", tuft], ["head", eye]], capeRim: rim };
  }, [k]);
  useAttach(hung.parts);

  useEffect(
    () => () => {
      k.cards.forEach((m) => m.map.dispose());
      [letters.shing, letters.hail, letters.sealouch, ...letters.krak].forEach(disposeLetter);
      disposeCrowd(crowd);
    },
    [k, letters, crowd],
  );

  // the shards: 8 a card, each with its own throw (one bounce, then flat on the floor)
  const shardState = useMemo(() => {
    const r = rand(11);
    return Array.from({ length: SHARDS * 3 }, (_, i) => {
      const card = Math.floor(i / SHARDS);
      const vy = 1.4 + r() * 1.8;
      const y0 = MID + (r() - 0.5) * 0.7;
      const t1 = (vy + Math.sqrt(vy * vy + 2 * G * (y0 - 0.04))) / G;
      const vy2 = 0.32 * Math.abs(vy - G * t1);
      return { card, vx: (r() - 0.5) * 2.6, vz: (r() - 0.2) * 1.6, vy, y0, ox: (r() - 0.5) * 0.6, t1, t2: (2 * vy2) / G, vy2, spin: (r() - 0.5) * 16, z0: r() * 6.28, s: 0.8 + r() * 0.7 };
    });
  }, []);
  const grainState = useMemo(() => {
    const r = rand(23);
    return Array.from({ length: GRAINS }, (_, i) => {
      const lane = i % 3;
      const a = r() * 6.283;
      const rad = Math.sqrt(r()) * 0.55;
      return { lane, x: Math.cos(a) * rad, z: Math.sin(a) * rad * 0.7 + 0.2, d: r() * 0.4, rad, c: r() };
    });
  }, []);

  useShake(cut, CRACK, 0.06);
  useCredit(cut, "teerthsharma/nerve", "Rust", "3 of its own 4 hypotheses withdrawn · 224 tests passing");

  // the pup: twirls, flipper over the eye, aims the control from its flipper, holds the live card up
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = outK(tl, t);
    live.pose.spin = ramp(1.65, 2.3, t); // a spin turns once and stays turned
    live.pose.sign = ramp(2.2, 2.55, t) * (1 - ramp(3.2, 3.45, t)) * o;
    const aim = ramp(3.3, 3.55, t) * (1 - ramp(4.7, 4.95, t));
    live.pose.point = aim * o;
    const kick = SHOT.reduce((a, s) => Math.max(a, t >= s && t < s + 0.16 ? 1 - (t - s) / 0.16 : 0), 0);
    live.pose.crouch = 0.35 * kick * aim * o;
    live.pose.fist = ramp(GRAB[0], GRAB[0] + 0.35, t) * o;
    // C.C. is the kit's silhouette, mirrored about the pup so she stands on the left
    if (refs.current.mirror) refs.current.mirror.position.x = 2 * live.seal.x;
  });

  const hide = () => {
    hung.cape.visible = hung.tuft.visible = hung.eye.visible = false;
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

      // --- the cape, the tuft and the geass on the pup
      const enter = Math.floor((t - 1.6) * 12);
      const pop = enter < 0 ? 0 : [0.3, 0.7, 1.1][enter] ?? 1;
      const whip = Math.sin(Math.PI * ramp(1.65, 2.3, t)); // the twirl throws the cape wide
      const open = (0.45 + 0.55 * whip + 0.1 * Math.sin(tt * 2.2) + 0.2 * ramp(3.2, 3.5, t)) * pop * (0.2 + 0.8 * o);
      hung.cape.visible = hung.tuft.visible = pop > 0;
      poseCape(k.cape, tt, open, 0);
      poseCape(k.capeRim, tt, open, 0.045);
      hung.tuft.rotation.z = Math.sin(tt * 3.1) * 0.05;
      hung.tuft.scale.setScalar(Math.max(pop, 0.001));
      const flare = t - SHOT[0] + 0.35; // the eye lights as the flipper drops
      const fp = popAt(flare);
      hung.eye.visible = flare >= 0;
      if (rig) hung.eye.position.copy(rig.eye).multiplyScalar(1.1);
      hung.eye.scale.setScalar(Math.max(fp * (0.9 + 0.1 * Math.sin(tt * 9)) * (0.3 + 0.7 * o), 0.001));
      k.glow.uniforms.uA.value = 0.9 + 0.1 * Math.sin(tt * 9);
      const flareScreen = hung.eye.visible && rig ? W.copy(rig.eye).applyMatrix4(rig.head.matrixWorld).project(state.camera) : null;
      placeLetter(state, letters.shing, flareScreen ? Math.min(0.8, flareScreen.x + 0.3) : 0, flareScreen ? Math.min(0.55, flareScreen.y + 0.22) : 0, 0.13, -0.1, flare >= 0 && flare < 0.8 ? popAt(flare) : 0);

      // --- C.C.: the kit's figure is mirrored to the left; a drum under her makes it a seat; one bite
      const at = [-2.06, 1.08, -1.26];
      const bite = ramp(3.7, 3.95, t) * (1 - ramp(4.2, 4.45, t));
      r.drum.position.set(-2.75, 0.3, -1.1);
      r.pizza.position.set(at[0] + (-2.64 - at[0]) * bite, at[1] + (1.4 - at[1]) * bite + 0.02 * Math.sin(tt * 3), at[2] + (-1.34 - at[2]) * bite);
      r.pizza.rotation.z = -0.5 + 0.9 * bite + 0.06 * Math.sin(tt * 2.4 + 1); // the slice droops while she waits
      const fig = Math.floor((t - tl.enter) * 12) >= 0 && outK(tl, t) > 0.5;
      r.drum.visible = r.pizza.visible = fig;
      const cheese = bite > 0.4 && t < 4.6 ? 1 : 0; // the cheese stretches as the slice leaves her mouth
      r.cheese.visible = cheese > 0;
      if (cheese) {
        const dx = r.pizza.position.x - -2.66;
        const dy = r.pizza.position.y - 1.34;
        r.cheese.position.set(-2.66 + dx / 2, 1.34 + dy / 2, -1.32);
        r.cheese.scale.set(0.02, Math.max(Math.hypot(dx, dy), 0.001), 1);
        r.cheese.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
      }

      // --- the four hypotheses
      const tip = rig ? flipperTip(rig) : null;
      AT.forEach(([x, z], i) => {
        const m = r.cards[i];
        const rise = ramp(2.55 + i * 0.1, 2.85 + i * 0.1, t);
        const dead = i !== LIVE;
        const cracked = dead && t >= CRACK[i];
        m.visible = rise > 0 && !cracked;
        const bob = Math.sin(tt * 2.3 + i * 1.7) * 0.025;
        let px = x;
        let py = MID + bob - (1 - rise) * 0.8;
        let pz = z;
        let sc = rise;
        const hit = t - SHOT[i];
        const shudder = hit > 0 && hit < 0.3 ? Math.sin(tt * 90) * 0.045 * (1 - hit / 0.3) : 0;
        if (i === LIVE) {
          const j = ramp(GRAB[0], GRAB[1], t);
          if (tip) {
            const hx = tip.x - seal.x + 0.05;
            const hy = tip.y + 1.2;
            const hz = tip.z - seal.z - 0.1;
            px += (hx - px) * j;
            py += (hy - py + bob) * j;
            pz += (hz - pz) * j;
          }
          sc *= 1 + 0.05 * j;
        }
        m.position.set(px + shudder, py, pz);
        m.quaternion.copy(state.camera.quaternion);
        m.rotateZ(i % 2 ? 0.06 : -0.05);
        m.scale.setScalar(Math.max(sc * (0.2 + 0.8 * o), 0.0001));
        D.position.set(x, BASE / 2, z);
        D.scale.setScalar(Math.max(rise * o, 0.0001));
        D.rotation.set(0, 0, 0);
        D.updateMatrix();
        k.pedestals.setMatrixAt(i, D.matrix);
      });
      k.pedestals.instanceMatrix.needsUpdate = true;

      // --- the beam: from the flipper's own tip, one shot at a time, thick, jittering on twos
      const shot = SHOT.findIndex((s) => t >= s && t < s + 0.16);
      r.beam.visible = shot >= 0 && Boolean(tip);
      if (r.beam.visible) {
        const [cx, cz] = AT[shot];
        V.set(tip.x - seal.x, tip.y, tip.z - seal.z);
        W.set(cx, MID, cz).sub(V);
        const len = W.length();
        r.beam.position.copy(V);
        r.beam.quaternion.copy(Q.setFromUnitVectors(Z_AXIS, W.normalize()));
        const w = 0.2 + 0.06 * (F % 2);
        r.beam.scale.set(w, w, len);
        r.core.scale.set(0.35, 0.35, 1);
      }
      // --- the flash at each hit and each crack
      let fl = -1;
      let fa = 0;
      let fAt = null;
      SHOT.forEach((s, i) => {
        if (t - s >= 0 && t - s < 0.35) {
          fl = i;
          fa = t - s;
          fAt = AT[i];
        }
      });
      CRACK.forEach((s, i) => {
        if (t - s >= 0 && t - s < 0.3) {
          fl = i;
          fa = t - s;
          fAt = AT[i];
        }
      });
      r.flash.visible = fl >= 0;
      if (fl >= 0) {
        r.flash.position.set(fAt[0], MID, fAt[1] + 0.15);
        r.flash.scale.setScalar(0.25 + 0.8 * ramp(0, 0.3, fa));
        r.flash.quaternion.copy(state.camera.quaternion);
        fade(k.flash, 0.75 * (1 - ramp(0, 0.35, fa)));
      }
      // --- KRAK, one lettered word a crack, over the card
      CRACK.forEach((s, i) => {
        const a = t - s;
        const sp = W2.set(AT[i][0] + seal.x, MID + 0.5, AT[i][1] + seal.z).project(state.camera);
        placeLetter(state, letters.krak[i], sp.x, sp.y + 0.12, 0.1, i % 2 ? 0.14 : -0.12, a >= 0 && a < 0.7 ? popAt(a) : 0);
      });

      // --- the control: grey grain from above, bouncing once, heaping over each doomed card, flattening at the crack
      grainState.forEach((g, i) => {
        const [cx, cz] = AT[g.lane];
        const s0 = SHOT[g.lane] + 0.1 + g.d;
        const a = t - s0;
        const rest = 0.04 + 0.95 * Math.max(0, 1 - g.rad / 0.62);
        const ck = t - CRACK[g.lane];
        let y = 5;
        let rr = 1;
        if (a < 0) D.scale.setScalar(0.0001);
        else {
          const f = Math.min(1, a / 0.45);
          y = rest + (1 - f) * (1 - f) * 2.2 + (f >= 1 ? Math.max(0, Math.sin(Math.min(1, (a - 0.45) / 0.2) * Math.PI)) * 0.1 : 0);
          rr = 1 + 2.3 * ramp(0, 0.3, ck);
          y = y + (0.04 - y) * ramp(0, 0.25, ck) * (ck > 0 ? 1 : 0);
          D.scale.setScalar(1);
        }
        D.position.set(cx + g.x * rr, y, cz + g.z * rr);
        D.rotation.set(g.c * 6, g.c * 9, 0);
        D.updateMatrix();
        k.grains.setMatrixAt(i, D.matrix);
      });
      k.grains.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 3; i++) {
        const h = ramp(SHOT[i] + 0.1, SHOT[i] + 0.45, t) * (1 - ramp(CRACK[i], CRACK[i] + 0.12, t));
        D.position.set(AT[i][0], 0.52 * h, AT[i][1] + 0.18);
        D.scale.set(1, Math.max(h, 0.0001), 1);
        D.rotation.set(0, 0, 0);
        D.updateMatrix();
        k.heaps.setMatrixAt(i, D.matrix);
        // the hollow coral ring left where the card stood: withdrawn, still on the record
        const rp = popAt(t - CRACK[i] - 0.2);
        D.position.set(AT[i][0], 0.03, AT[i][1]);
        D.scale.setScalar(Math.max(rp * o, 0.0001));
        D.updateMatrix();
        k.rings.setMatrixAt(i, D.matrix);
      }
      k.heaps.instanceMatrix.needsUpdate = true;
      k.rings.instanceMatrix.needsUpdate = true;

      // --- the shards: thrown, one bounce, then flat on the floor round the ring
      shardState.forEach((s, i) => {
        const a = t - CRACK[s.card];
        const [cx, cz] = AT[s.card];
        if (a < 0) {
          D.scale.setScalar(0.0001);
          D.position.set(0, -9, 0);
        } else {
          const aa = Math.floor(a * 12) / 12;
          let y;
          let travel;
          if (aa <= s.t1) {
            y = s.y0 + s.vy * aa - 0.5 * G * aa * aa;
            travel = aa;
          } else if (aa <= s.t1 + s.t2) {
            const b = aa - s.t1;
            y = 0.04 + s.vy2 * b - 0.5 * G * b * b;
            travel = s.t1 + (b * 0.4);
          } else {
            y = 0.04;
            travel = s.t1 + s.t2 * 0.4;
          }
          const settle = ramp(s.t1, s.t1 + s.t2 + 0.001, aa);
          D.position.set(cx + s.ox + s.vx * travel * 0.5, y, cz + s.vz * travel * 0.5);
          D.rotation.set(-Math.PI / 2 * settle + s.spin * aa * (1 - settle), s.spin * 0.4 * aa * (1 - settle), s.z0 * settle + s.spin * 0.3 * aa * (1 - settle));
          D.scale.setScalar(s.s * o);
        }
        D.updateMatrix();
        k.shards.setMatrixAt(i, D.matrix);
      });
      k.shards.instanceMatrix.needsUpdate = true;

      // --- the chant: eight costume pups on the bottom edge, flippers up on ALL HAIL
      const up = ramp(CHANT, CHANT + 0.15, t);
      const slide = ramp(2.6, 2.9, t);
      crowdFrame(
        crowd,
        state,
        slide > 0 && o > 0.02,
        spots.map(([x, y]) => [x, y - (1 - slide) * 0.35]),
        0.12 * (0.3 + 0.7 * o),
        (i, q) => {
          q.hop = (Math.sin(tt * 9 + i * 1.3) > 0.2 ? 1 : 0) * (0.4 + 0.6 * up);
          q.l = q.r = up * (Math.floor(t * 3) % 2 ? 1 : 0.6);
        },
      );
      placeLetter(state, letters.hail, 0.66, -0.36, 0.1, -0.08, t >= CHANT ? popAt(t - CHANT) * o : 0);
      placeLetter(state, letters.sealouch, 0.66, -0.5, 0.085, 0.05, t >= CHANT + 0.2 ? popAt(t - CHANT - 0.2) * o : 0);
    },
    hide,
  );

  // C.C. stands the left edge: the kit's speaker, mirrored about the pup (the move keeps the mirror's x at twice the pup's)
  const set = (name) => (m) => {
    refs.current[name] = m;
  };
  return (
    <>
      <Stage {...cut} />
      <group ref={set("mirror")} scale={[-1, 1, 1]}>
        <Speaker {...cut} />
      </group>
      <group ref={root} visible={false}>
        <mesh geometry={k.floorGeo} material={k.floor} position={[0, 0.004, 0]} renderOrder={-0.5} />
        <primitive object={k.pedestals} />
        {LABEL.map((_, i) => (
          <mesh key={i} ref={(m) => (refs.current.cards[i] = m)} geometry={k.cardGeo} material={k.cards[i]} />
        ))}
        <primitive object={k.heaps} />
        <primitive object={k.grains} />
        <primitive object={k.shards} />
        <primitive object={k.rings} />
        <group ref={set("beam")} visible={false}>
          <mesh geometry={k.beamGeo} material={k.beam} />
          <mesh ref={set("core")} geometry={k.beamGeo} material={k.core} />
        </group>
        <mesh ref={set("flash")} geometry={k.flashGeo} material={k.flash} visible={false} />
        <group ref={set("drum")}>
          <mesh geometry={k.drum} material={k.ink} />
          <mesh geometry={k.drumTop} material={k.cream} position={[0, 0.3, 0]} />
        </group>
        <group ref={set("pizza")}>
          <mesh geometry={k.slice} material={k.cream} scale={0.8} />
          <mesh geometry={k.slice} material={k.cheese} scale={0.62} position={[0, 0.015, 0.01]} />
        </group>
        <mesh ref={set("cheese")} geometry={k.cheeseGeo} material={k.cheese} visible={false} />
        <primitive object={letters.shing} />
        <primitive object={letters.hail} />
        <primitive object={letters.sealouch} />
        {letters.krak.map((m, i) => (
          <primitive key={i} object={m} />
        ))}
        {crowd.g.map((m, i) => (
          <primitive key={i} object={m} />
        ))}
      </group>
    </>
  );
}
