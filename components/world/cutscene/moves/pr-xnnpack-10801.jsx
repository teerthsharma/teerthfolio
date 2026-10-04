// XNNPACK: FRIEREN, the Scale of Obedience (treatments/g2.md section 4). A
// whole new place: a mana-veil sky (one shader dome) and a pale ground, the
// real landforms switched off. A memory tower of 14 slabs stands at the right
// with a dark cave in it (two missing slabs: the free space below the first
// live block, the hidden reserve), a lid on top and the amber cube snowball (the
// value) set on the lid, raising it. The cave speaks "It was inside you all
// along." and its three throat layers light from the back to the front; the pup
// walks to its mouth, points (held 0.3 s), crouches and dives in as a spinning
// streak, and pops out at full size in a column of white-gold mana. The cube
// obeys: it tips off the lid, rolls down the face and is set into the gap, the
// lid drops (a coral ghost line stays where the peak was), the pyrite on its brow
// glints in turn and blue flowers open across the ground from the cave mouth.
// Cost: sky 1, ground 1, slabs 1 (instanced), cave 1 + layers 3 + glow 1, lid 1,
// cube 1, ghost 1, pyrite 1 (instanced), flowers 1 (instanced), column 1, dive
// streak 1, flash 1, shards 1; no post pass.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, BoxGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, MeshLambertMaterial, Object3D, OctahedronGeometry, Path, PlaneGeometry, ShaderMaterial, Shape, ShapeGeometry, SphereGeometry, Vector3 } from "three";
import { Stage, Speaker, onTwos, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Flash, INK, Rig, Shards, T, clock, ease, flat, landK, nudge, rand, ramp, useHideLand, usePup } from "./g2/parts";

const TW = [1.6, 0, -3.0]; // the tower's foot, in the figure frame
const ROWS = 14;
const STEP = 0.2;
const SLAB = 0.17;
const GAP = [3, 4]; // the two slabs that were never placed
const GAP_MID = 0.075 + 3.5 * STEP; // the cave's middle height
const TOP = 0.075 + ROWS * STEP; // the top of the stack
const FRONT = 0.5; // the tower's front face (z, tower frame)
const LID_UP = 0.4; // how far the lid rises under the cube, and drops back
const DUMMY = new Object3D();

// the beats, on the scene clock
const LIGHT = 2.7; // the cave's throat lights, back to front
const WALK = [3.5, 4.1]; // the pup goes to the cave's mouth
const POINT = [4.0, 4.5]; // and points, held
const DIVE = [4.55, 4.95];
const OUT = [5.15, 5.55];
const ROLL = [5.3, 6.1]; // the cube obeys
const LID = [6.0, 6.3]; // and the lid drops

const TWf = new Vector3();
const AX = new Vector3(1, 0, 0);
const pupAt = (k) => [k * (TW[0] - 0.25), k * (TW[2] + 1.35)]; // the mouth, on the ground: x, z in the figure frame

// ---- the sky: a mana veil, one dome, one shader --------------------------------
function skyMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 0 } },
    side: BackSide,
    transparent: true,
    depthWrite: false,
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uFade; varying vec3 vP;
      void main() {
        vec3 d = normalize(vP);
        float h = clamp(d.y * 1.15 + 0.12, 0.0, 1.0);
        vec3 low = vec3(1.0, 0.80, 0.55);   // amber at the horizon
        vec3 mid = vec3(0.55, 0.78, 0.86);  // teal veil
        vec3 high = vec3(0.30, 0.26, 0.62); // indigo overhead
        vec3 c = mix(low, mid, smoothstep(0.0, 0.32, h));
        c = mix(c, high, smoothstep(0.28, 0.95, h));
        // veils: slow curtains of white-gold mana leaning up the sky
        float a = atan(d.x, d.z);
        float v1 = smoothstep(0.55, 1.0, sin(a * 5.0 + d.y * 7.0 + uTime * 0.35));
        float v2 = smoothstep(0.6, 1.0, sin(a * 8.0 - d.y * 11.0 - uTime * 0.25 + 1.7));
        float band = smoothstep(0.1, 0.35, h) * (1.0 - smoothstep(0.7, 1.0, h));
        c += (v1 * 0.32 + v2 * 0.2) * band * vec3(1.0, 0.92, 0.7);
        gl_FragColor = vec4(pow(c, vec3(2.2)), uFade);
      }`,
  });
}
function groundMaterial() {
  return new ShaderMaterial({
    uniforms: { uFade: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uFade; varying vec2 vUv;
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        vec3 c = mix(vec3(0.98, 0.93, 0.82), vec3(0.62, 0.74, 0.86), smoothstep(0.1, 0.9, r)); // warm snow to teal at the rim
        c *= 0.94 + 0.06 * sin(r * 70.0);
        gl_FragColor = vec4(pow(c, vec3(2.2)), uFade * (1.0 - smoothstep(0.82, 1.0, r)));
      }`,
  });
}
function Sky({ cut }) {
  const { tl } = cut;
  const sky = useRef();
  const ground = useRef();
  const skyMat = useMemo(skyMaterial, []);
  const groundMat = useMemo(groundMaterial, []);
  const geo = useMemo(() => new SphereGeometry(1, 32, 16), []);
  const disc = useMemo(() => new CircleGeometry(1, 48).rotateX(-Math.PI / 2), []);
  useFrame((state) => {
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    sky.current.visible = ground.current.visible = on;
    if (!on) return;
    const fade = ramp(t, 1.5, 2.1) * (1 - ramp(t, tl.collapse[0], tl.collapse[1]));
    skyMat.uniforms.uTime.value = onTwos(t);
    skyMat.uniforms.uFade.value = fade;
    groundMat.uniforms.uFade.value = fade;
  }, -0.4);
  return (
    <>
      <mesh ref={sky} geometry={geo} material={skyMat} scale={70} renderOrder={0} frustumCulled={false} visible={false} />
      <mesh ref={ground} geometry={disc} material={groundMat} scale={16} position={[0, 0.004, 0]} renderOrder={0} frustumCulled={false} visible={false} />
    </>
  );
}

// ---- the tower, the cave, the lid, the cube -----------------------------------
// A rectangular frame (a hole in a plate): the throat's nested layers.
function frameGeometry(w, h, iw, ih) {
  const s = new Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(-w / 2, h / 2);
  s.closePath();
  if (iw) {
    const hole = new Path();
    hole.moveTo(-iw / 2, -ih / 2);
    hole.lineTo(-iw / 2, ih / 2);
    hole.lineTo(iw / 2, ih / 2);
    hole.lineTo(iw / 2, -ih / 2);
    hole.closePath();
    s.holes.push(hole);
  }
  return new ShapeGeometry(s);
}

const COLD = new Color("#120c1c");
const EMBER = new Color("#e0643a");
const AMBER = new Color("#ffc25a");
const LAYER = new Color();

function Tower({ cut }) {
  const { tl } = cut;
  const slabs = useRef();
  const group = useRef();
  const cave = useRef();
  const glow = useRef();
  const lid = useRef();
  const cube = useRef();
  const ghost = useRef();
  const glints = useRef();
  const layers = [useRef(), useRef(), useRef()];
  const geo = useMemo(() => new BoxGeometry(2.0, SLAB, 1.0), []);
  const mat = useMemo(() => flat("#ffffff"), []);
  const caveGeo = useMemo(() => new BoxGeometry(1.98, 2 * STEP - 0.02, 0.96), []);
  const caveMat = useMemo(() => flat("#0d0816", { side: BackSide }), []);
  const layerGeo = useMemo(() => [frameGeometry(1.9, 0.36, 1.5, 0.28), frameGeometry(1.5, 0.28, 1.1, 0.2), frameGeometry(1.1, 0.2)], []);
  const layerMat = useMemo(() => [0, 1, 2].map(() => flat("#ffffff")), []);
  const glowMat = useMemo(() => flat(INK.amber, { transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }), []);
  const glowGeo = useMemo(() => new PlaneGeometry(2.0, 0.42), []);
  const lidGeo = useMemo(() => new BoxGeometry(2.1, 0.1, 1.1), []);
  const lidMat = useMemo(() => flat("#fff3d6"), []);
  const cubeGeo = useMemo(() => new BoxGeometry(0.42, 0.42, 0.42), []);
  const cubeMat = useMemo(() => new MeshLambertMaterial({ color: "#ffbe55", emissive: "#e07a1c", emissiveIntensity: 0.55, flatShading: true }), []);
  const ghostGeo = useMemo(() => new BoxGeometry(2.3, 0.025, 0.025), []);
  const ghostMat = useMemo(() => flat(INK.coral, { transparent: true, opacity: 0, depthWrite: false }), []);
  const pyriteGeo = useMemo(() => new OctahedronGeometry(0.075, 0), []);
  const pyriteMat = useMemo(() => flat("#ffd86a"), []);
  const painted = useRef(false);
  useFrame((state) => {
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    group.current.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const out = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    const m = slabs.current;
    if (!painted.current) {
      painted.current = true;
      const a = new Color("#f6e8cc");
      const b = new Color("#f7c871");
      for (let i = 0; i < ROWS; i++) m.setColorAt(i, (i % 2 ? a : b).clone().multiplyScalar(0.82 + 0.18 * (i / ROWS)));
      m.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < ROWS; i++) {
      const up = ease(ramp(tt, 1.7 + i * 0.045, 2.15 + i * 0.045)) * out;
      const hole = i >= GAP[0] && i <= GAP[1];
      DUMMY.position.set(0, 0.075 + i * STEP, 0);
      DUMMY.scale.set(hole ? 0.0001 : up + 0.0001, up + 0.0001, up + 0.0001);
      DUMMY.updateMatrix();
      m.setMatrixAt(i, DUMMY.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    const born = ease(ramp(tt, 2.0, 2.5)) * out;
    cave.current.scale.setScalar(born + 0.0001);
    cave.current.position.y = GAP_MID;
    // the throat lights from the back (layer 2) to the front (layer 0)
    for (let j = 0; j < 3; j++) {
      const lit = ease(ramp(tt, LIGHT + (2 - j) * 0.35, LIGHT + (2 - j) * 0.35 + 0.6));
      const heat = j === 2 ? 1 : j === 1 ? 0.75 : 0.5; // the back is hottest
      LAYER.copy(COLD).lerp(EMBER, Math.min(1, lit * 1.4)).lerp(AMBER, Math.max(0, lit * 1.4 - 0.4) * heat);
      layerMat[j].color.copy(LAYER);
      layers[j].current.scale.setScalar(born + 0.0001);
      layers[j].current.position.set(0, GAP_MID, 0.42 - j * 0.2);
    }
    // the mouth glows: a slow pulse from line A, flaring as the pup goes in and comes out
    const flare = Math.max(ramp(tt, DIVE[1] - 0.15, DIVE[1]) * (1 - ramp(tt, DIVE[1], DIVE[1] + 0.4)), ramp(tt, OUT[0] - 0.1, OUT[0]) * (1 - ramp(tt, OUT[0], OUT[0] + 0.5)));
    const lit = ramp(tt, LIGHT + 0.5, LIGHT + 1.4) * (0.55 + 0.2 * Math.sin(tt * 5)) * (1 - 0.6 * ramp(tt, LID[1], LID[1] + 0.8)) + 0.7 * flare;
    glow.current.visible = lit > 0.02;
    glowMat.opacity = Math.min(1, lit) * out;
    glow.current.scale.setScalar(born + 0.0001);
    glow.current.position.set(0, GAP_MID, FRONT + 0.005);
    // the lid: raised under the cube, dropped as the cube is set in; the ghost line stays at the old peak
    const lift = ease(ramp(tt, 2.35, 2.8)) * (1 - ease(ramp(tt, LID[0], LID[1])));
    lid.current.position.set(0, TOP + 0.05 + LID_UP * lift, 0);
    lid.current.scale.setScalar(ease(ramp(tt, 2.2, 2.6)) * out + 0.0001);
    ghost.current.position.set(0, TOP + 0.05 + LID_UP, FRONT + 0.1);
    ghostMat.opacity = 0.8 * ramp(tt, LID[0] + 0.05, LID[0] + 0.3) * out;
    ghost.current.visible = ghostMat.opacity > 0.01;
    // the cube: dropped onto the lid, then it obeys: tips off, rolls down the face, set into the cave
    const drop = ease(ramp(tt, 2.0, 2.4));
    const r = ramp(tt, ROLL[0], ROLL[1]);
    const off = ease(ramp(r, 0, 0.15)); // tipped off the lid's front edge
    const down = ease(ramp(r, 0.1, 0.78)); // rolling down the face
    const seat = ease(ramp(r, 0.78, 1)); // into the gap
    const cy0 = TOP + 0.05 + LID_UP * lift + 0.26;
    const y = cy0 + (GAP_MID + 0.02 - cy0) * down;
    cube.current.position.set(0.35 * (1 - off) + 0.05 * off, drop < 1 ? y + (1 - drop) * 2.0 : y, 0.78 * off - 0.62 * seat);
    cube.current.quaternion.setFromAxisAngle(AX, r * Math.PI * 3);
    cube.current.scale.setScalar((drop * (1 - 0.9 * seat) * out) + 0.0001);
    // the pyrite on the brow glints in turn once the lid is down
    for (let i = 0; i < 5; i++) {
      const g = ramp(tt, LID[1] + i * 0.12, LID[1] + i * 0.12 + 0.25);
      const s = 0.2 + 1.3 * Math.sin(Math.PI * Math.min(1, g)) * (g > 0 && g < 1 ? 1 : 0);
      DUMMY.position.set(-0.8 + i * 0.4, TOP + 0.13, FRONT + 0.02);
      DUMMY.rotation.set(0, tt * 2 + i, 0);
      DUMMY.scale.setScalar((s * ease(ramp(tt, 2.4, 2.8)) * out) + 0.0001);
      DUMMY.updateMatrix();
      glints.current.setMatrixAt(i, DUMMY.matrix);
    }
    DUMMY.rotation.set(0, 0, 0);
    glints.current.instanceMatrix.needsUpdate = true;
  }, -0.4);
  return (
    <group ref={group} position={TW} visible={false}>
      <instancedMesh ref={slabs} args={[geo, mat, ROWS]} frustumCulled={false} />
      <mesh ref={cave} geometry={caveGeo} material={caveMat} />
      {layers.map((ref, j) => (
        <mesh key={j} ref={ref} geometry={layerGeo[j]} material={layerMat[j]} />
      ))}
      <mesh ref={glow} geometry={glowGeo} material={glowMat} renderOrder={3} />
      <mesh ref={lid} geometry={lidGeo} material={lidMat} />
      <mesh ref={cube} geometry={cubeGeo} material={cubeMat} />
      <mesh ref={ghost} geometry={ghostGeo} material={ghostMat} />
      <instancedMesh ref={glints} args={[pyriteGeo, pyriteMat, 5]} frustumCulled={false} />
    </group>
  );
}

// Blue flowers open across the ground from the cave's mouth, staggered outward.
const FLOWERS = 36;
function Flowers({ cut }) {
  const { tl } = cut;
  const ref = useRef();
  const geo = useMemo(() => new IcosahedronGeometry(0.09, 0).scale(1, 0.55, 1), []);
  const mat = useMemo(() => flat("#8fbaff"), []);
  const spots = useMemo(() => {
    const r = rand(41);
    return Array.from({ length: FLOWERS }, () => {
      const a = (r() - 0.5) * 2.6; // fanned out in front of the mouth
      const d = 0.5 + r() * 2.8;
      return { x: TW[0] + Math.sin(a) * d * 1.25, z: TW[2] + FRONT + 0.3 + Math.cos(a) * d, d, s: 0.8 + r() * 0.6 };
    });
  }, []);
  useFrame((state) => {
    const m = ref.current;
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    m.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const out = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    for (let i = 0; i < FLOWERS; i++) {
      const f = spots[i];
      const k = ease(ramp(tt, LID[1] + 0.2 + f.d * 0.08, LID[1] + 0.5 + f.d * 0.08)) * out;
      DUMMY.position.set(f.x, 0.05, f.z);
      DUMMY.scale.setScalar(k * f.s + 0.0001);
      DUMMY.updateMatrix();
      m.setMatrixAt(i, DUMMY.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, -0.4);
  return <instancedMesh ref={ref} args={[geo, mat, FLOWERS]} visible={false} frustumCulled={false} />;
}

// The column of white-gold mana the pup releases when it comes out of the cave.
const COLUMN = new CylinderGeometry(0.55, 0.7, 5, 20, 1, true);
function Column({ cut }) {
  const { tl } = cut;
  const ref = useRef();
  const m = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uA: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform float uA; varying vec2 vUv; void main(){ float k = pow(1.0 - vUv.y, 1.4) * (0.55 + 0.45 * sin(vUv.x * 40.0)); gl_FragColor = vec4(pow(vec3(1.0, 0.9, 0.62) * k * uA, vec3(2.2)), 1.0); }",
      }),
    []
  );
  useFrame((state) => {
    const g = ref.current;
    const t = clock(state);
    g.visible = Boolean(live.arrival.id) && live.inStage;
    if (!g.visible) return;
    const a = ramp(t, OUT[0] + 0.1, OUT[0] + 0.45) * (1 - ramp(t, ROLL[1] + 0.2, ROLL[1] + 1.0)) * (1 - ramp(t, tl.collapse[0], tl.collapse[1]));
    m.uniforms.uA.value = a * 0.8;
    const [x, z] = pupAt(landK(cut.card, cut.place, live.seal.x, live.seal.z));
    g.position.set(x, 2.4, z);
    g.scale.set(a > 0.01 ? 1 : 0.0001, a > 0.01 ? 1 : 0.0001, a > 0.01 ? 1 : 0.0001);
  }, -0.4);
  return <mesh ref={ref} geometry={COLUMN} material={m} visible={false} frustumCulled={false} renderOrder={4} />;
}

// A dive streak: an amber bar from the mouth to wherever the pup is.
const BAR = new CylinderGeometry(0.06, 0.06, 1, 6);
const UPV = new Vector3(0, 1, 0);
const A3 = new Vector3();
const B3 = new Vector3();
function DiveStreak({ cut }) {
  const ref = useRef();
  const m = useMemo(() => flat(INK.amber, { transparent: true, depthWrite: false, blending: AdditiveBlending }), []);
  useFrame(() => {
    const g = ref.current;
    g.visible = live.inStage;
    if (!g.visible) return;
    const t = T.t;
    const k = landK(cut.card, cut.place, live.seal.x, live.seal.z);
    const u = ramp(t, DIVE[0], DIVE[1]);
    const a = u > 0 && u < 1 ? 1 : 0;
    const [mx, mz] = pupAt(k);
    A3.set(mx, 0.5 * k, mz);
    B3.set(k * TW[0], k * GAP_MID, k * (TW[2] + 0.5));
    // from where the dive began to where the pup is now
    B3.sub(A3).multiplyScalar(ease(u)).add(A3);
    const from = A3.clone().lerp(B3, Math.max(0, ease(u) - 0.45));
    const len = from.distanceTo(B3);
    m.opacity = 0.8 * a;
    g.position.copy(from).add(B3).multiplyScalar(0.5);
    g.quaternion.setFromUnitVectors(UPV, TWf.copy(B3).sub(from).normalize());
    g.scale.set(a ? 1 : 0.0001, a ? len + 0.001 : 0.0001, a ? 1 : 0.0001);
  }, -0.4);
  return <mesh ref={ref} geometry={BAR} material={m} visible={false} frustumCulled={false} renderOrder={5} />;
}

export default function Reveal(cut) {
  const { tl, mode } = cut;
  const A = tl.lineA;
  const out = (t) => 1 - ramp(t, tl.collapse[0], tl.duration);
  useHideLand();
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = out(t);
    live.pose.sign = ramp(t, tl.sign[0], tl.sign[1]) * (1 - ramp(t, tl.sign[1] + 0.2, A)) * o;
    // point at the cave, held through the walk; a crouch, then the dive spins; arms out when it comes back
    live.pose.point = ramp(t, POINT[0], POINT[0] + 0.25) * (1 - ramp(t, DIVE[0] - 0.12, DIVE[0] - 0.05)) * o;
    live.pose.crouch = ramp(t, DIVE[0] - 0.15, DIVE[0]) * (1 - ramp(t, DIVE[0] + 0.05, DIVE[0] + 0.12)) * o;
    const dive = ramp(t, DIVE[0], DIVE[1]);
    live.pose.spin = dive > 0 && dive < 1 ? dive : 0;
    live.pose.raise = ramp(t, OUT[1] + 0.15, OUT[1] + 0.5) * o;
  });
  usePup(cut, (t, p, turn) => {
    const k = landK(cut.card, cut.place, live.seal.x, live.seal.z);
    const o = out(t);
    const [mx, mz] = pupAt(k);
    const gx = k * TW[0];
    const gy = k * GAP_MID;
    const gz = k * (TW[2] + 0.5);
    const walk = ease(ramp(t, WALK[0], WALK[1]));
    const dive = ease(ramp(t, DIVE[0], DIVE[1]));
    const out2 = ease(ramp(t, OUT[0], OUT[1]));
    // on the ground at the mouth, then up into the dark, then back out to the mouth
    let x = mx * walk;
    let y = 0.25 * Math.sin(Math.PI * ramp(t, WALK[0], WALK[1])) * (1 - dive);
    let z = mz * walk;
    if (t >= DIVE[0] && t < OUT[0]) {
      x = mx + (gx - mx) * dive;
      y = gy * dive + 0.4 * Math.sin(Math.PI * dive);
      z = mz + (gz - mz) * dive;
    } else if (t >= OUT[0]) {
      x = gx + (mx - gx) * out2;
      y = gy * (1 - out2) + 0.7 * Math.sin(Math.PI * out2);
      z = gz + (mz - gz) * out2;
    }
    nudge(p, turn, x * o, y * o, z * o);
    // uniform only: spin and shrink into the dark, then pop out past full size and settle
    const shrink = dive * (1 - out2);
    const pop = Math.sin(Math.PI * ramp(t, OUT[0] + 0.15, OUT[1] + 0.15)) * 0.12;
    p.scale.setScalar(Math.max(0.03, 1 - 0.97 * shrink + pop));
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut}>
        <Sky cut={cut} />
        <Tower cut={cut} />
        <Flowers cut={cut} />
        <Column cut={cut} />
        <DiveStreak cut={cut} />
        <Flash color="#ffd27a" at={[TW[0], GAP_MID, TW[2] + 0.7]} fn={() => [Math.max(0.9 * ramp(T.t, DIVE[1] - 0.15, DIVE[1]) * (1 - ramp(T.t, DIVE[1], DIVE[1] + 0.5)), 0.7 * ramp(T.t, OUT[0] - 0.1, OUT[0]) * (1 - ramp(T.t, OUT[0], OUT[0] + 0.5)), 0.8 * ramp(T.t, ROLL[1] - 0.1, ROLL[1]) * (1 - ramp(T.t, ROLL[1], ROLL[1] + 0.4))), 2.4]} />
        <Shards start={LID[0]} dur={1.2} from={[TW[0], TOP + 0.3, TW[2] + 0.4]} speed={1.3} up={1.8} gravity={5} size={0.1} count={20} colors={["#ffe3a0", INK.cream, INK.amber]} seed={4} />
      </Rig>
    </>
  );
}
