// the Highway: SONIC. One highway car is promoted (two-tone, no lettering, no
// face) and speaks "I am speed."; at 3.6 s the pup hops onto its roof and sits,
// the car revs and launches with the pup aboard in a red taillight streak, and
// the pup hops off in a SPIN-DASH: a curled ball, uniform, turning several
// times in a ring of blue blur. A row of dim ghost key-pair ticks stands behind
// the road; only the few the car and the ball overlap flash mint as they pass
// (the pairs that cannot overlap stay dark). The highway's own landform hides
// during the scene (it stands between the lens and the pup), so the road is
// built here too.
// Cost: road 3 boxes, lane dashes 1 (instanced), car 2 (body, wheels), ghost
// ticks 1 + flashing slices 1 (instanced), two streaks, ring 1, flash 1,
// shards 1; no post pass.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BoxGeometry, BufferAttribute, Color, CylinderGeometry, DoubleSide, MeshBasicMaterial, Object3D, PlaneGeometry, RingGeometry, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Stage, Speaker, onTwos, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Flash, INK, Rig, Shards, T, clock, ease, flat, landK, nudge, ramp, usePup } from "./g2/parts";

const ROAD_Z = -1.1;
const CAR_AT = [2.4, 0, -1.9];
const SLICES = 24;
const CAR_S = 1.18; // the car's scale in the scene
// the beats: the pup mounts, the car launches, the pup hops off in a spin-dash
const MOUNT = [3.6, 4.2];
const LAUNCH = 4.7;
const OFF = [4.95, 5.45];
const runAt = (t) => Math.pow(ramp(t, LAUNCH, LAUNCH + 0.9), 2);
// where the pup is this frame, in the figure frame (usePup writes it, the ring and streak read it)
const PUP = { x: 0, y: 0, z: 0, ball: 0 };
const DASHES = 24;

const SUN = new Vector3(-0.3, 0.8, 0.5).normalize();
const NRM = new Vector3();
// flat colour, shaded per facet (the car is unlit: MeshBasic, so the stage's dark never muddies the white)
const paint = (g, hex) => {
  const c = new Color(hex);
  const n = g.toNonIndexed();
  n.computeVertexNormals();
  const a = new Float32Array(n.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) {
    NRM.fromBufferAttribute(n.attributes.normal, i / 3);
    c.clone().multiplyScalar(0.62 + 0.4 * Math.max(0, NRM.dot(SUN))).toArray(a, i);
  }
  n.setAttribute("color", new BufferAttribute(a, 3));
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};
// A low-poly two-tone car facing +x: white below, black cabin, red taillights. No badge, no lettering.
function carGeometry() {
  const body = [
    paint(new BoxGeometry(2.1, 0.4, 0.95).translate(0, 0.42, 0), "#f4f1ea"),
    paint(new BoxGeometry(0.3, 0.12, 0.8).translate(-1.0, 0.5, 0), "#1b1b22"),
    paint(new CylinderGeometry(0.5, 0.74, 0.36, 4).rotateY(Math.PI / 4).scale(1.3, 1, 0.62).translate(-0.1, 0.8, 0), "#1b1b22"),
    paint(new BoxGeometry(0.06, 0.1, 0.18).translate(-1.07, 0.5, 0.3), "#ff3b4e"),
    paint(new BoxGeometry(0.06, 0.1, 0.18).translate(-1.07, 0.5, -0.3), "#ff3b4e"),
    paint(new BoxGeometry(0.06, 0.09, 0.2).translate(1.06, 0.48, 0.3), "#fff0b8"),
    paint(new BoxGeometry(0.06, 0.09, 0.2).translate(1.06, 0.48, -0.3), "#fff0b8"),
  ];
  const wheels = [];
  for (const x of [-0.7, 0.7]) for (const z of [-0.5, 0.5]) wheels.push(paint(new CylinderGeometry(0.25, 0.25, 0.2, 8).rotateX(Math.PI / 2).translate(x, 0.25, z), "#15151b"));
  for (const x of [-0.7, 0.7]) for (const z of [-0.6, 0.6]) wheels.push(paint(new CylinderGeometry(0.12, 0.12, 0.05, 6).rotateX(Math.PI / 2).translate(x, 0.25, z), "#d9d4c8"));
  return { body: mergeGeometries(body), wheels: mergeGeometries(wheels) };
}

// A streak: a quad whose right edge is its head, fading to nothing behind. fn() -> [x, y, z, length, thickness, alpha].
const STREAK = new PlaneGeometry(1, 1).translate(-0.5, 0, 0);
function Streak({ color, fn }) {
  const ref = useRef();
  const m = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uColor: { value: new Color(color).convertLinearToSRGB() }, uAlpha: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv; void main(){ float k = pow(max(vUv.x, 1e-4), 1.8) * max(1.0 - pow(abs(vUv.y * 2.0 - 1.0), 2.0), 0.0); gl_FragColor = vec4(pow(max(uColor * k * uAlpha * 1.4, vec3(1e-4)), vec3(2.2)), 1.0); }",
      }),
    [color]
  );
  useFrame(() => {
    const g = ref.current;
    const [x, y, z, len, th, a] = fn();
    g.visible = live.inStage; // compiled under the bloom; at scale ~0 until it is wanted
    if (!g.visible) return;
    m.uniforms.uAlpha.value = a;
    g.position.set(x, y, z);
    if (a > 0.01 && len > 0.02) g.scale.set(len, th, 1);
    else g.scale.setScalar(0.0001);
  }, -0.4);
  return <mesh ref={ref} geometry={STREAK} material={m} visible={false} renderOrder={4} frustumCulled={false} />;
}

const DUMMY = new Object3D();

function Road({ cut }) {
  const { tl } = cut;
  const dashes = useRef();
  const slices = useRef();
  const roadRef = useRef();
  const roadMat = useMemo(() => flat("#5b5588"), []);
  const edgeMat = useMemo(() => flat("#c9c3f0"), []);
  const dashMat = useMemo(() => flat("#ffe9a8"), []);
  const sliceMat = useMemo(() => flat(INK.mint, { transparent: true, opacity: 0.9, depthWrite: false }), []);
  const ghosts = useRef();
  const ghostMat = useMemo(() => flat("#a79bd0", { transparent: true, opacity: 0.55, depthWrite: false }), []);
  const dashGeo = useMemo(() => new BoxGeometry(0.8, 0.012, 0.09), []);
  const sliceGeo = useMemo(() => new BoxGeometry(0.1, 1, 0.1), []);
  const ghostGeo = useMemo(() => new BoxGeometry(0.06, 0.34, 0.06), []);
  const roadGeo = useMemo(() => new BoxGeometry(26, 0.02, 5.4), []);
  const edgeGeo = useMemo(() => new BoxGeometry(26, 0.02, 0.1), []);
  const tD = LAUNCH;
  useFrame((state) => {
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    roadRef.current.visible = dashes.current.visible = slices.current.visible = ghosts.current.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const out = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    const born = ease(ramp(tt, 1.7, 2.3)) * out;
    roadRef.current.scale.set(1, 1, born + 0.001);
    // the lane paint scrolls toward the left; the dash speeds it up
    const off = 0.9 * tt + 14 * ease(ramp(tt, tD, tD + 0.9));
    for (let i = 0; i < DASHES; i++) {
      const x = ((((i * 1.5 - off) % (DASHES * 1.5)) + DASHES * 1.5) % (DASHES * 1.5)) - 12;
      DUMMY.position.set(x, 0.03, ROAD_Z);
      DUMMY.scale.set(born + 0.001, 1, 1);
      DUMMY.updateMatrix();
      dashes.current.setMatrixAt(i, DUMMY.matrix);
    }
    dashes.current.instanceMatrix.needsUpdate = true;
    // a row of dim ghost ticks (every key pair the slice could have compared),
    // and only the few that the car and the ball overlap flash mint as they pass
    const carX = CAR_AT[0] + 14 * runAt(tt);
    const ballX = PUP.ball > 0.01 ? PUP.x : -99;
    for (let i = 0; i < SLICES; i++) {
      const x = -1.6 + i * 0.4;
      const near = Math.min(Math.abs(carX - x), Math.abs(ballX - x));
      const h = tt > LAUNCH && near < 0.3 ? 1.1 * (1 - near / 0.3) : 0;
      DUMMY.position.set(x, 0.05 + 0.17, ROAD_Z - 1.55);
      DUMMY.scale.set(born + 0.001, born + 0.001, born + 0.001);
      DUMMY.updateMatrix();
      ghosts.current.setMatrixAt(i, DUMMY.matrix);
      DUMMY.position.set(x, 0.05 + h / 2, ROAD_Z - 1.55);
      DUMMY.scale.set(1, h + 0.0001, 1);
      DUMMY.updateMatrix();
      slices.current.setMatrixAt(i, DUMMY.matrix);
    }
    ghosts.current.instanceMatrix.needsUpdate = true;
    slices.current.instanceMatrix.needsUpdate = true;
  }, -0.4);
  return (
    <>
      <group ref={roadRef} visible={false}>
        <mesh position={[3, 0.015, ROAD_Z]} material={roadMat} geometry={roadGeo} />
        <mesh position={[3, 0.02, ROAD_Z - 2.62]} material={edgeMat} geometry={edgeGeo} />
        <mesh position={[3, 0.02, ROAD_Z + 2.62]} material={edgeMat} geometry={edgeGeo} />
      </group>
      <instancedMesh ref={dashes} args={[dashGeo, dashMat, DASHES]} visible={false} frustumCulled={false} />
      <instancedMesh ref={ghosts} args={[ghostGeo, ghostMat, SLICES]} visible={false} frustumCulled={false} />
      <instancedMesh ref={slices} args={[sliceGeo, sliceMat, SLICES]} visible={false} frustumCulled={false} renderOrder={2} />
    </>
  );
}

function Car({ cut }) {
  const { tl } = cut;
  const root = useRef();
  const { body, wheels } = useMemo(carGeometry, []);
  const lit = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false }), []);
  const tL = LAUNCH;
  useFrame((state) => {
    const g = root.current;
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    g.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const enter = ease(ramp(tt, 1.95, 2.35));
    const revs = ramp(tt, tL - 0.9, tL);
    const run = runAt(tt);
    const shake = (0.012 + 0.03 * revs) * ((Math.floor(tt * 12) % 2) - 0.5) * 2 * (1 - run);
    g.position.set(CAR_AT[0] + 14 * run, CAR_AT[1] + shake, CAR_AT[2] + (1 - enter) * -0.6);
    g.rotation.set(0, -0.4 * (1 - run * 0.8), -0.04 * revs * (1 - run));
    const o = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    g.scale.setScalar(CAR_S * enter * o + 0.001);
  }, -0.4);
  return (
    <group ref={root} visible={false}>
      <mesh geometry={body} material={lit} />
      <mesh geometry={wheels} material={lit} />
    </group>
  );
}

// A ring of blue blur round the curled pup: it faces the lens and follows the ball.
const BLUR = new RingGeometry(0.7, 1, 40);
function BlurRing() {
  const ref = useRef();
  const m = useMemo(() => flat(INK.blue, { transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending }), []);
  useFrame(({ camera }) => {
    const g = ref.current;
    g.visible = live.inStage;
    if (!g.visible) return;
    const on = PUP.ball > 0.01;
    m.opacity = 0.9 * PUP.ball;
    g.position.set(PUP.x, PUP.y + 0.42, PUP.z);
    g.scale.setScalar(on ? 0.62 + 0.06 * Math.sin(T.t * 60) : 0.0001);
    g.quaternion.copy(camera.quaternion);
  }, -0.4);
  return <mesh ref={ref} geometry={BLUR} material={m} visible={false} renderOrder={5} frustumCulled={false} />;
}

export default function Sonic(cut) {
  const { tl, mode } = cut;
  const out = (t) => 1 - ramp(t, tl.collapse[0], tl.duration);
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = out(t);
    const hop = ramp(t, OFF[0], OFF[1]);
    live.pose.sign = ramp(t, tl.sign[0], tl.sign[1]) * (1 - ramp(t, tl.sign[1] + 0.2, tl.lineA)) * o;
    // crouch to spring, sit on the roof, curl into the ball for the spin-dash hop
    live.pose.crouch = (ramp(t, MOUNT[0] - 0.4, MOUNT[0] - 0.05) * (1 - ramp(t, MOUNT[0], MOUNT[0] + 0.1)) + (hop > 0 && hop < 1 ? 1 : 0)) * o;
    live.pose.sit = ramp(t, MOUNT[1], MOUNT[1] + 0.2) * (1 - ramp(t, OFF[0] - 0.1, OFF[0])) * o;
    live.pose.spin = hop > 0 && hop < 1 ? (4 * hop) % 1 : 0;
    live.pose.raise = ramp(t, OFF[1] + 0.1, OFF[1] + 0.5) * o;
  });
  usePup(cut, (t, p, turn) => {
    const k = landK(cut.card, cut.place, live.seal.x, live.seal.z);
    const o = out(t);
    // the roof of the car, in the figure frame (the car stands in the scaled rig, the pup does not)
    const roof = (tt) => {
      const run = runAt(tt);
      const ry = -0.4 * (1 - run * 0.8);
      const lx = -0.1 * CAR_S;
      return [k * (CAR_AT[0] + 14 * run + Math.cos(ry) * lx), k * 0.99 * CAR_S, k * (CAR_AT[2] - Math.sin(ry) * lx)];
    };
    const hopOn = ease(ramp(t, MOUNT[0], MOUNT[1]));
    const hopOff = ease(ramp(t, OFF[0], OFF[1]));
    const R = roof(Math.min(t, OFF[0]));
    // up onto the roof (an arc), carried by the car, then off home in the spin-dash
    let x = 0;
    let y = 0;
    let z = 0;
    if (t < OFF[0]) {
      const target = roof(t);
      x = target[0] * hopOn;
      y = target[1] * hopOn + 0.9 * Math.sin(Math.PI * ramp(t, MOUNT[0], MOUNT[1]));
      z = target[2] * hopOn;
    } else {
      x = R[0] * (1 - hopOff);
      y = R[1] * (1 - hopOff) + 0.7 * Math.sin(Math.PI * hopOff);
      z = R[2] * (1 - hopOff);
    }
    nudge(p, turn, x * o, y * o, z * o);
    const ball = hopOff > 0 && hopOff < 1 ? 1 : 0;
    const sitting = ramp(t, MOUNT[1], MOUNT[1] + 0.2) * (1 - ramp(t, OFF[0] - 0.1, OFF[0]));
    // on the roof it is a touch smaller, curled in the dash it is a uniform ball: scale only ever uniform, so the head stays round
    p.scale.setScalar(1 - 0.22 * sitting - 0.2 * ball);
    PUP.x = x;
    PUP.y = y;
    PUP.z = z;
    PUP.ball = ball * o;
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut}>
        <Road cut={cut} />
        <Car cut={cut} />
        <Streak
          color="#ff4a5e"
          fn={() => {
            const t = T.t;
            const run = runAt(t);
            return [CAR_AT[0] + 14 * run - 1.1, 0.62, CAR_AT[2], Math.min(7, 14 * run), 0.3, run > 0 ? 1 - ramp(t, LAUNCH + 0.8, LAUNCH + 1.5) : 0];
          }}
        />
      </Rig>
      <Rig cut={cut} scaled={false}>
        <Streak
          color={INK.blue}
          fn={() => {
            const t = T.t;
            const u = ramp(t, OFF[0], OFF[1]);
            // behind the ball, thin, never over its face
            return [PUP.x - 0.3, PUP.y + 0.4, PUP.z - 0.25, u > 0 && u < 1 ? 0.5 + 2.4 * u : 0, 0.16, u > 0 && u < 1 ? 1 : 0];
          }}
        />
        <BlurRing />
        <Flash color="#9fd2ff" at={[0.4, 0.5, -0.3]} fn={() => [T.t < OFF[0] ? 0 : 0.7 * (1 - ramp(T.t, OFF[0], OFF[0] + 0.3)), 2.2]} />
        <Shards start={OFF[1]} dur={0.9} from={[0.2, 0.15, 0.3]} speed={1.6} up={0.9} size={0.07} count={16} colors={[INK.cream, INK.blue]} seed={12} />
      </Rig>
    </>
  );
}
