// the Highway: SONIC. One highway car is promoted (two-tone, no lettering, no
// face) and speaks "I am speed."; it revs, then launches off the right of the
// frame in a red taillight streak. The pup SPIN-DASHES after it: curled into a
// ball, turning several times, along the road in a blue speed streak, and the
// slices it overlaps flash mint as it passes (the pairs that cannot overlap are
// never drawn at all). The highway's own landform hides during the scene (it
// stands between the lens and the pup), so the road is built here too.
// Cost: road 3 boxes, lane dashes 1 (instanced), car 2 (body, wheels), slices 1
// (instanced), two streaks, flash 1, shards 1; no post pass.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BoxGeometry, BufferAttribute, Color, CylinderGeometry, DoubleSide, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Stage, Speaker, onTwos, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Flash, INK, Rig, Shards, T, clock, ease, flat, nudge, ramp, usePup } from "./g2/parts";

const ROAD_Z = -1.1;
const CAR_AT = [2.4, 0, -1.9];
const SLICES = 16;
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
        fragmentShader: "uniform vec3 uColor; uniform float uAlpha; varying vec2 vUv; void main(){ float k = pow(vUv.x, 1.8) * (1.0 - pow(abs(vUv.y * 2.0 - 1.0), 2.0)); gl_FragColor = vec4(pow(uColor * k * uAlpha * 1.4, vec3(2.2)), 1.0); }",
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
  const roadMat = useMemo(() => flat("#262c4a"), []);
  const edgeMat = useMemo(() => flat("#8f9bd6"), []);
  const dashMat = useMemo(() => flat("#ffe9a8"), []);
  const sliceMat = useMemo(() => flat(INK.mint, { transparent: true, opacity: 0.85, depthWrite: false }), []);
  const dashGeo = useMemo(() => new BoxGeometry(0.8, 0.012, 0.09), []);
  const sliceGeo = useMemo(() => new BoxGeometry(0.1, 1, 0.1), []);
  const roadGeo = useMemo(() => new BoxGeometry(26, 0.02, 5.4), []);
  const edgeGeo = useMemo(() => new BoxGeometry(26, 0.02, 0.1), []);
  const tD = tl.move[0];
  useFrame((state) => {
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    roadRef.current.visible = dashes.current.visible = slices.current.visible = on;
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
    // the slices: only the ones the dash overlaps are ever drawn
    const pupX = 2.4 * ease(ramp(tt, tD, tD + 0.55));
    const carX = CAR_AT[0] + 14 * Math.pow(ramp(tt, tD - 0.1, tD + 0.8), 2);
    for (let i = 0; i < SLICES; i++) {
      const x = -1.6 + i * 0.5;
      const near = Math.min(Math.abs(carX - x), Math.abs(pupX - x));
      const h = i % 3 === 1 && tt > tD && near < 0.6 ? 1.1 * (1 - near / 0.6) : 0;
      DUMMY.position.set(x, 0.05 + h / 2, ROAD_Z - 1.55);
      DUMMY.scale.set(1, h + 0.0001, 1);
      DUMMY.updateMatrix();
      slices.current.setMatrixAt(i, DUMMY.matrix);
    }
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
      <instancedMesh ref={slices} args={[sliceGeo, sliceMat, SLICES]} visible={false} frustumCulled={false} />
    </>
  );
}

function Car({ cut }) {
  const { tl } = cut;
  const root = useRef();
  const { body, wheels } = useMemo(carGeometry, []);
  const lit = useMemo(() => new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false }), []);
  const tL = tl.move[0] - 0.1;
  useFrame((state) => {
    const g = root.current;
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    g.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const enter = ease(ramp(tt, 1.95, 2.35));
    const revs = ramp(tt, tL - 0.9, tL);
    const run = Math.pow(ramp(tt, tL, tL + 0.9), 2);
    const shake = (0.012 + 0.03 * revs) * ((Math.floor(tt * 12) % 2) - 0.5) * 2 * (1 - run);
    g.position.set(CAR_AT[0] + 14 * run, CAR_AT[1] + shake, CAR_AT[2] + (1 - enter) * -0.6);
    g.rotation.set(0, -0.4 * (1 - run * 0.8), -0.04 * revs * (1 - run));
    const o = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    g.scale.setScalar(1.18 * enter * o + 0.001);
  }, -0.4);
  return (
    <group ref={root} visible={false}>
      <mesh geometry={body} material={lit} />
      <mesh geometry={wheels} material={lit} />
    </group>
  );
}

export default function Sonic(cut) {
  const { tl, mode } = cut;
  const tD = tl.move[0];
  const out = (t) => 1 - ramp(t, tl.collapse[0], tl.duration);
  const pupX = (t) => 2.4 * ease(ramp(t, tD, tD + 0.55));
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = out(t);
    live.pose.sign = ramp(t, tl.sign[0], tl.sign[1]) * (1 - ramp(t, tl.sign[1] + 0.2, tl.lineA)) * o;
    live.pose.crouch = ramp(t, tD - 0.45, tD - 0.05) * (1 - ramp(t, tD + 0.55, tD + 0.9)) * o;
    const turns = 4 * ramp(t, tD - 0.05, tD + 0.6);
    live.pose.spin = turns >= 4 ? 0 : turns % 1;
    live.pose.raise = ramp(t, tD + 1.0, tD + 1.5) * o;
  });
  usePup(cut, (t, p, turn) => nudge(p, turn, pupX(t) * out(t), 0, 0));
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
            const run = Math.pow(ramp(t, tD - 0.1, tD + 0.8), 2);
            return [CAR_AT[0] + 14 * run - 1.1, 0.5, CAR_AT[2], Math.min(7, 14 * run), 0.16, run > 0 ? 1 - ramp(t, tD + 0.8, tD + 1.5) : 0];
          }}
        />
      </Rig>
      <Rig cut={cut} scaled={false}>
        <Streak
          color={INK.blue}
          fn={() => {
            const t = T.t;
            return [pupX(t) + 0.1, 0.5, 0.1, 0.4 + 3.2 * ramp(t, tD, tD + 0.3), 0.7, t < tD ? 0 : 1 - ramp(t, tD + 0.55, tD + 1.4)];
          }}
        />
        <Flash color="#9fd2ff" at={[0.4, 0.5, 0.3]} fn={() => [T.t < tD ? 0 : 0.9 * (1 - ramp(T.t, tD, tD + 0.3)), 2.6]} />
        <Shards start={tD + 0.05} dur={0.9} from={[0.2, 0.15, 0.3]} speed={1.6} up={0.9} size={0.07} count={16} colors={[INK.cream, INK.blue]} seed={12} />
      </Rig>
    </>
  );
}
