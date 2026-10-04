// Monodromy: Steins;Gate (treatments/g4.md). The upper sheet speaks as land.
// The pup answers on the phone (a flipper at its head, held the whole of line
// A) in a cream lab coat; a lab-coat witness with long hair and a cream
// microwave facepalms; two nixie tubes sit above. On the move the REAL pup
// runs the floor loop (its display transform carried round the ring, the
// world position untouched; a leg-wheel blur and a dust trail) and lands home.
// The world line shifts (a ring sweeps out, everything jitters one drawing),
// the Transport ramp's upper sheet lights coral and a small copy of the pup
// stands halfway up it: the loop closed below, not above. For one drawing the
// two pups miss each other. The witness drops the microwave. A second lap in
// four drawings: the copy rides the ramp to the top and drops into the tower,
// the sheet goes mint, the tubes lock on 2.
// Cost: the upper copy is ~16 meshes of the pup clone; the rest is two tube
// meshes, one instanced dust mesh, the witness (about ten), three coat flaps,
// three rings, two words, two nixie quads.
// Card: lib/world/cutscene/cards/p-monodromy.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, CanvasTexture, CatmullRomCurve3, CircleGeometry, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, RingGeometry, SRGBColorSpace, TubeGeometry, Vector3 } from "three";
import { Stage, onTwos, smooth, useCutFrame } from "../kit";
import { turnFor } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { rampAngle, rampTopY } from "../../monuments/parts/transport-ramp";
import { PupClone } from "./g4/clone";
import { ball, flap, hullOf, inkPair, join, limb, makeWord, swayMaterial, tintInk } from "./g4/ink";
import { Rig, glow, pulse, useInk } from "./g4/parts";

const R = 1.8; // m: the floor loop, through the pup's own spot
const C = [0, -1.8]; // its centre, in the pup's frame (x, z)
const TURN = Math.PI * 2;
const NIXIE = "#ff9a3c";
const MINT = "#6ff2c0";
const CORAL = "#ff6b6b";
const RAMP_R = 1.18; // the marble's own track on the Transport ramp
const COPY_S = 0.42; // the upper copy's size against the pup
const DUST = 20;
const ENTER = [[1.3, 0.5], [0.86, 1.14], [1.05, 0.96]];

// Where the pup is on the loop at 0..1 (0 and 1 are home), in the pup's frame.
const loopAt = (u) => [C[0] + R * Math.sin(u * TURN), C[1] + R * Math.cos(u * TURN)];
// Lap 2 in four drawings: a quarter more each, ending home.
const stepped = (x) => Math.min(1, Math.floor(Math.min(0.999, Math.max(0, x)) * 4) / 4 + 0.25);

// A spiral through the ramp's own maths, t0..t1 along its two laps.
function sheetCurve(t0, t1, lift) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = t0 + ((t1 - t0) * i) / 40;
    const a = rampAngle(t);
    pts.push(new Vector3(Math.sin(a) * RAMP_R, rampTopY(t) + lift, Math.cos(a) * RAMP_R));
  }
  return new CatmullRomCurve3(pts);
}

// The witness: a lab coat to the knee, long straight hair, a cream microwave under one arm.
function witnessParts() {
  const body = [
    limb([-0.1, 0, 0.02], [-0.12, 0.85, 0], 0.075, 0.1),
    limb([0.1, 0, 0.02], [0.12, 0.85, 0], 0.075, 0.1),
    limb([0, 0.42, 0], [0, 1.6, 0], 0.36, 0.23, 7, 1.05, 0.78), // the coat, flared at the hem
    limb([-0.32, 1.57, 0], [0.32, 1.57, 0], 0.085, 0.085),
    limb([0, 1.58, 0], [0, 1.78, 0.01], 0.07, 0.06),
    ball([0, 1.9, 0.02], 0.16, 0.94, 1.12, 1),
    limb([0, 1.98, -0.1], [0, 1.0, -0.2], 0.19, 0.1, 6, 1.15, 0.5), // long straight hair down the back
    limb([-0.15, 1.9, -0.02], [-0.17, 1.35, -0.14], 0.05, 0.04),
    limb([0.15, 1.9, -0.02], [0.17, 1.35, -0.14], 0.05, 0.04),
    limb([0.3, 1.55, 0], [0.42, 1.25, 0.1], 0.085, 0.07), // the arm under the microwave
    limb([0.42, 1.25, 0.1], [0.12, 1.12, 0.3], 0.07, 0.065),
  ];
  const down = [limb([-0.3, 1.55, 0], [-0.4, 1.22, 0.04], 0.085, 0.07), limb([-0.4, 1.22, 0.04], [-0.38, 0.92, 0.1], 0.07, 0.065), ball([-0.38, 0.9, 0.1], 0.07)];
  const palm = [limb([-0.3, 1.55, 0], [-0.46, 1.34, 0.14], 0.085, 0.07), limb([-0.46, 1.34, 0.14], [-0.1, 1.84, 0.22], 0.07, 0.062), ball([-0.08, 1.86, 0.23], 0.075)]; // the hand to the brow
  return { body: join(body), down: join(down), palm: join(palm) };
}

// A digit strip, 0 to 9 top to bottom, in nixie amber.
function digitStrip() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 640;
  const g = c.getContext("2d");
  g.fillStyle = "#1a0d05";
  g.fillRect(0, 0, 64, 640);
  g.font = "700 56px monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = NIXIE;
  g.shadowBlur = 14;
  g.fillStyle = "#ffd29a";
  for (let d = 0; d < 10; d++) g.fillText(String(d), 32, d * 64 + 34);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export default function Move(cut) {
  const { card, place, tl, mode } = cut;
  const { p } = useInk(card);
  const S = tl.move[1]; // the world line shifts as the lap closes
  const LAP2 = [tl.lineB + 0.6, tl.lineB + 0.93]; // four drawings
  const portrait = useThree((st) => st.size.width < st.size.height);
  const run = useRef({ dx: 0, dz: 0, yaw: 0, k: 0 }).current;
  const sealRef = useRef(null);

  const geo = useMemo(
    () => ({
      loop: new TubeGeometry(new CatmullRomCurve3(Array.from({ length: 49 }, (_, i) => new Vector3(loopAt(i / 48)[0], 0.06, loopAt(i / 48)[1]))), 72, 0.045, 5, true),
      lower: new TubeGeometry(sheetCurve(0, 0.5, 0.1), 40, 0.1, 6),
      upper: new TubeGeometry(sheetCurve(0.5, 1, 0.1), 40, 0.15, 6),
      witness: witnessParts(),
      dust: new IcosahedronGeometry(1, 0),
      ring: new RingGeometry(0.9, 1, 40),
      flat: new RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2),
      fan: new CircleGeometry(0.3, 8),
      mw: new BoxGeometry(0.5, 0.32, 0.38),
      door: new PlaneGeometry(0.28, 0.2),
      tube: new CylinderGeometry(0.17, 0.17, 0.62, 12, 1, true),
      plate: new BoxGeometry(1.1, 0.8, 0.08),
      quad: new PlaneGeometry(0.2, 0.3),
      coat: flap(0.24, 0.42),
      witnessCoat: flap(0.5, 0.7),
    }),
    [],
  );
  const hulls = useMemo(() => ({ body: hullOf(geo.witness.body), down: hullOf(geo.witness.down), palm: hullOf(geo.witness.palm) }), [geo]);
  const mats = useMemo(
    () => ({
      loop: glow(MINT),
      lower: glow(MINT),
      upper: glow(CORAL),
      shift: glow("#ffffff"),
      ring: glow(MINT),
      fan: glow("#fbfaf7"),
      dust: new MeshBasicMaterial({ color: "#fbfaf7", transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false, fog: false }),
      cream: new MeshBasicMaterial({ color: "#fbfaf7", toneMapped: false, fog: false }),
      glass: new MeshBasicMaterial({ color: "#241414", toneMapped: false, fog: false }),
      plate: new MeshBasicMaterial({ color: new Color(p.ink), toneMapped: false, fog: false }),
      tube: glow(NIXIE),
      coat: swayMaterial("#fbfaf7"),
      witnessCoat: swayMaterial("#fbfaf7"),
    }),
    [p],
  );
  const strip = useMemo(() => (typeof document === "undefined" ? null : digitStrip()), []);
  const digits = useMemo(() => [0, 1].map(() => (strip ? new MeshBasicMaterial({ map: strip.clone(), toneMapped: false, fog: false }) : null)), [strip]);
  useEffect(() => {
    for (const m of digits) {
      if (!m?.map) continue;
      m.map.repeat.set(1, 0.1);
      m.map.needsUpdate = true;
    }
  }, [digits]);
  const words = useMemo(() => ({ zaap: makeWord("ZAAAP", p.accent, 0.5), huh: makeWord("!?", "#fbfaf7", 0.5) }), [p]);
  const dust = useMemo(() => {
    const m = new InstancedMesh(geo.dust, mats.dust, DUST);
    m.frustumCulled = false;
    return m;
  }, [geo, mats]);
  const o = useMemo(() => new Object3D(), []);

  const g = {
    jit: useRef(),
    witness: useRef(),
    palm: useRef(),
    down: useRef(),
    mw: useRef(),
    copy: useRef(),
    world: useRef(),
    shift: useRef(),
    ring1: useRef(),
    ring2: useRef(),
    fan: useRef(),
    fanMesh: useRef(),
    coat: useRef(),
    meter: useRef(),
  };

  useCutFrame((t, state) => {
    if (mode !== "full") return;
    const fade = 1 - smooth(tl.collapse[0], tl.collapse[1], t);
    const R0 = tl.move[0];
    const lock = LAP2[1] + 0.3;
    const k = tintInk(card, (card.stage?.halftone ?? 6) * 0.6 * state.gl.getPixelRatio());
    void k;
    mats.coat.uniforms.uT.value = mats.witnessCoat.uniforms.uT.value = t;
    const turn = turnFor(card, place, live.seal.x, live.seal.z);

    // THE POSE: the flipper-phone held the whole of line A, dropped only for the run
    live.pose.sign = smooth(tl.sign[0], tl.sign[1], t) * (1 - smooth(R0 - 0.2, R0 - 0.05, t));
    live.pose.crouch = 0.8 * smooth(R0 - 0.35, R0 - 0.15, t) * (1 - smooth(R0 - 0.1, R0 + 0.05, t));

    // THE RUN: the pup's display transform goes once round the loop on lap 1, and again, in four drawings, on lap 2
    const lap2 = t >= LAP2[0] && t <= LAP2[1];
    const u = t < R0 ? 0 : t <= S ? smooth(R0, S, t) : lap2 ? stepped((t - LAP2[0]) / (LAP2[1] - LAP2[0])) : 0;
    const [lx0, lz0] = loopAt(u);
    const K = portrait ? 0.6 : 1; // the loop narrows on a portrait screen so the run stays in frame
    const lx = lx0 * K;
    const lz = lz0;
    const c = Math.cos(turn);
    const sn = Math.sin(turn);
    run.dx = lx * c + lz * sn;
    run.dz = lz * c - lx * sn;
    run.k = u > 0 && u < 1 ? 1 : 0;
    // facing along the loop (the pup faces +z at yaw 0, so yaw = atan2(heading))
    const hx = Math.cos(u * TURN);
    const hz = -Math.sin(u * TURN);
    run.yaw = Math.atan2(hx * c + hz * sn, hz * c - hx * sn);

    // a one-drawing jitter at the shift
    const jit = t >= S && t < S + 1 / 12 ? 1 : 0;
    g.jit.current.position.set(jit * 0.07, jit * 0.05, 0);

    // the floor loop, and the ramp's two sheets
    const up = smooth(tl.enter - 0.1, tl.enter + 0.6, t) * fade;
    const shifted = smooth(S, S + 0.2, t);
    const home = t > LAP2[1] + 0.05 ? 1 : 0;
    mats.loop.opacity = 0.85 * onTwos(up);
    geo.loop.setDrawRange(0, Math.round(smooth(tl.enter, tl.enter + 0.8, t) * 72) * 5 * 6);
    mats.lower.opacity = 0.75 * shifted * fade;
    mats.upper.color.set(home ? MINT : CORAL);
    mats.upper.opacity = 0.95 * shifted * fade;

    // the world-line shift: a ring sweeps out from the pup's chest
    const e = Math.max(0, t - S);
    const sr = g.shift.current;
    sr.position.set(0, 1.0, 0.3);
    sr.lookAt(state.camera.position);
    sr.scale.setScalar(Math.max(0.001, onTwos(Math.min(1, e / 0.8)) * 14));
    mats.shift.opacity = e > 0 ? 0.55 * Math.max(0, 1 - e / 0.8) * fade : 0;

    // a dust ring where the lap starts, a mint ring where the pup lands
    const a1 = Math.max(0, t - R0);
    g.ring1.current.scale.setScalar(Math.max(0.001, onTwos(Math.min(1, a1 / 0.5)) * 1.3));
    g.ring1.current.visible = a1 > 0 && a1 < 0.6;
    const a2 = Math.max(0, t - S);
    g.ring2.current.scale.setScalar(Math.max(0.001, onTwos(Math.min(1, a2 / 0.5)) * 1.1));
    g.ring2.current.visible = a2 > 0 && a2 < 0.6;
    mats.ring.opacity = 0.7 * fade;

    // the dust: puffs along the path the pup has just run
    for (let i = 0; i < DUST; i++) {
      const age = 0.04 + i * 0.035;
      const tt = t - age;
      const ok = (tt > R0 && tt < S) || (tt >= LAP2[0] && tt <= LAP2[1]);
      const v = tt <= S ? smooth(R0, S, tt) : stepped((tt - LAP2[0]) / (LAP2[1] - LAP2[0]));
      const [px, pz] = ok ? loopAt(v) : [0, 0];
      const life = ok ? Math.sin(Math.PI * Math.min(1, age / 0.7)) : 0;
      o.position.set(px, 0.1 + 0.18 * (age / 0.7), pz);
      o.scale.setScalar(Math.max(0.0001, 0.13 * life * fade));
      o.updateMatrix();
      dust.setMatrixAt(i, o.matrix);
    }
    dust.instanceMatrix.needsUpdate = true;

    // the nixie tubes: still until the shift, then rolling, locked on 2
    const rolling = t > S && t < lock;
    const roll = (i) => Math.floor(onTwos(t) * 12 * (i + 1) * 1.7) % 10;
    const d = [rolling ? roll(0) : 0, rolling ? roll(1) : t >= lock ? 2 : 0];
    d.forEach((v, i) => {
      if (digits[i]?.map) digits[i].map.offset.y = (9 - v) / 10;
    });
    const mp = pulse(t, tl.enter, tl.collapse[1], 0.4);
    g.meter.current.scale.setScalar(Math.max(0.001, onTwos(mp)));
    mats.tube.opacity = 0.35 * mp;

    // the witness steps in on twos, facepalms, drops the microwave
    const w = g.witness.current;
    const inF = Math.floor((t - tl.enter) * 12);
    const outF = Math.floor((t - tl.collapse[0]) * 12);
    const frame = outF >= 0 ? 2 - outF : inF;
    w.visible = frame >= 0;
    const [sx, sy] = ENTER[frame] ?? [1, 1];
    w.scale.set(1.15 * sx, 1.15 * sy, 1.15 * sx);
    w.rotation.set(0, -0.42, 0.012 * Math.sin(onTwos(t) * 2.2));
    const palm = t > tl.lineA + 0.1 && t < S + 0.1 && Math.floor(t * 12) % 14 < 11;
    g.palm.current.visible = palm;
    g.down.current.visible = !palm;
    const drop = t - (S + 0.3);
    const bounce = drop < 0 ? 0 : Math.abs(Math.sin(Math.min(drop, 1) * 3.6)) * Math.max(0, 1 - drop * 1.1) * 0.8;
    g.mw.current.position.set(0.2, drop < 0 ? 1.18 : 0.19 + bounce, 0.36);
    g.mw.current.rotation.set(0, 0.5, drop < 0 ? 0.05 : 0.15 * Math.min(1, drop * 3));
    mats.witnessCoat.uniforms.uWind.value = 0.25 + 0.5 * smooth(S, S + 0.4, t);
    const huh = words.huh;
    huh.position.set(1.45, 2.9, -2.5);
    huh.quaternion.copy(state.camera.quaternion);
    huh.material.opacity = pulse(t, S + 0.15, S + 1.3, 0.12) * fade;
    const zp = words.zaap;
    zp.position.set(-1.5, 1.6, 0.6);
    zp.quaternion.copy(state.camera.quaternion);
    zp.material.opacity = pulse(t, R0 + 0.1, S - 0.1, 0.12) * fade;

    // the upper copy: halfway up the ramp after the shift, riding to the top on lap 2, dropped into the tower
    const cp = g.copy.current;
    const ride = smooth(LAP2[0], LAP2[1], t);
    const tt = 0.5 + 0.5 * ride;
    const a = rampAngle(tt);
    const glitch = t >= S + 0.4 && t < S + 0.4 + 1 / 12;
    const gone = smooth(LAP2[1] + 0.05, LAP2[1] + 0.35, t);
    cp.visible = t > S + 0.1 && gone < 1 && !glitch && fade > 0;
    cp.position.set(Math.sin(a) * RAMP_R + (t >= S + 0.55 && t < S + 0.55 + 1 / 12 ? 0.3 : 0), rampTopY(tt) + 0.06 - 0.3 * gone, Math.cos(a) * RAMP_R);
    cp.rotation.y = a + Math.PI / 2;
    cp.scale.setScalar(Math.max(0.001, COPY_S * (1 - gone) * onTwos(smooth(S + 0.1, S + 0.4, t))));
  });

  // the tower: the ramp is the Transport sculpture's own, standing where the place is
  useFrame(() => {
    const wg = g.world.current;
    const on = Boolean(live.arrival.id) && mode === "full" && live.inStage;
    wg.visible = on;
    if (on) wg.position.set(place.x, 0, place.z);
  }, -1.19);

  // the pup: carried round the loop by its display transform (after Seal.jsx's reset), with its coat and wheel
  useFrame((state) => {
    const seal = (sealRef.current ??= state.scene.getObjectByName("seal"));
    const on = Boolean(live.arrival.id) && mode === "full" && live.inStage && Boolean(seal);
    g.coat.current.visible = on;
    g.fan.current.visible = on && run.k === 1;
    if (!on) return;
    if (run.k) {
      seal.position.x += run.dx;
      seal.position.z += run.dz;
      seal.rotation.y = run.yaw;
    }
    for (const r of [g.coat, g.fan]) {
      r.current.position.copy(seal.position);
      r.current.rotation.y = seal.rotation.y;
    }
    g.fanMesh.current.rotation.set(0, Math.PI / 2, state.clock.elapsedTime * 38);
    mats.fan.opacity = 0.32;
  }, 0.15);

  return (
    <>
      <Stage {...cut} />
      <Rig cut={cut}>
        <group ref={g.jit}>
          <mesh geometry={geo.loop} material={mats.loop} />
          <mesh ref={g.shift} geometry={geo.ring} material={mats.shift} />
          <mesh ref={g.ring1} geometry={geo.flat} material={mats.ring} position={[0, 0.05, 0]} visible={false} />
          <mesh ref={g.ring2} geometry={geo.flat} material={mats.ring} position={[0, 0.05, 0]} visible={false} />
          <primitive object={dust} />
          <group ref={g.witness} position={[1.35, 0, -2.5]} visible={false}>
            <mesh geometry={hulls.body} material={inkPair().rim} />
            <mesh geometry={geo.witness.body} material={inkPair().body} />
            <group ref={g.palm}>
              <mesh geometry={hulls.palm} material={inkPair().rim} />
              <mesh geometry={geo.witness.palm} material={inkPair().body} />
            </group>
            <group ref={g.down}>
              <mesh geometry={hulls.down} material={inkPair().rim} />
              <mesh geometry={geo.witness.down} material={inkPair().body} />
            </group>
            <group ref={g.mw}>
              <mesh geometry={geo.mw} material={mats.cream} />
              <mesh geometry={geo.door} material={mats.glass} position={[-0.06, 0, 0.195]} />
            </group>
            <mesh geometry={geo.witnessCoat} material={mats.witnessCoat} position={[0, 1.57, -0.2]} rotation={[0.1, 0, 0]} />
          </group>
          {words.huh ? <primitive object={words.huh} /> : null}
          {words.zaap ? <primitive object={words.zaap} /> : null}
          <group ref={g.meter} position={[-2.2, 2.5, -1.2]}>
            <mesh geometry={geo.plate} material={mats.plate} position={[0, 0, -0.1]} />
            {[-0.27, 0.27].map((x, i) => (
              <group key={x} position={[x, 0, 0]}>
                <mesh geometry={geo.tube} material={mats.tube} />
                {digits[i] ? <mesh geometry={geo.quad} material={digits[i]} position={[0, 0, 0.02]} /> : null}
              </group>
            ))}
          </group>
        </group>
      </Rig>
      <group ref={g.world} visible={false}>
        <mesh geometry={geo.lower} material={mats.lower} />
        <mesh geometry={geo.upper} material={mats.upper} />
        <group ref={g.copy} visible={false}>
          <PupCopy />
        </group>
      </group>
      <group ref={g.coat} visible={false}>
        {[-0.25, 0, 0.25].map((x) => (
          <mesh key={x} geometry={geo.coat} material={mats.coat} position={[x, 0.55, -0.5]} rotation={[0.8, 0, x * 0.4]} />
        ))}
      </group>
      <group ref={g.fan} visible={false}>
        <mesh ref={g.fanMesh} geometry={geo.fan} material={mats.fan} position={[0.5, 0.3, -0.1]} />
      </group>
    </>
  );
}

// the upper copy: the real pup, small (its transforms follow the pup's)
function PupCopy() {
  const ref = useRef();
  return (
    <group ref={ref}>
      <PupClone gref={ref} />
    </group>
  );
}
