// MuJoCo hull: ONE PUNCH MAN. 48 coral probe-rays spray from one corner of the
// convex hull and "yell" One punch; the pup crouches, steps in and throws ONE
// serious punch (a big white flipper reaches up and right along the diagonal
// to the hull's corner, held six drawings, with a mint shockwave ring on the
// fist and speed lines): every ray snaps into one mint stroke to its vertex
// (42 vertices, one ray each, six spare), the hull closes face by face from
// mint to violet, and the cloud deck above splits in a gap. The pup wears a
// small white cape for the punch only. The punch lands at 3.9 s.
// Cost: rays 1 draw (instanced cones), hull 1 (per-face reveal in the shader)
// + wire 1, clouds 1 (instanced), fist 2, speed lines 1, cape 1, rings 2,
// flash 1, shards 1; no post pass.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, CapsuleGeometry, Color, ConeGeometry, DoubleSide, EdgesGeometry, IcosahedronGeometry, LineBasicMaterial, MeshBasicMaterial, Object3D, Quaternion, RingGeometry, ShaderMaterial, Vector3 } from "three";
import { Stage, Speaker, onTwos, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Flash, INK, Rig, Shards, T, clock, ease, flat, nudge, rand, ramp, usePup } from "./g2/parts";

const TP = 3.9; // the punch lands
const R = 1.1;
const RAYS = 48;
// the hull stands up and to the right of the pup, on the punch's diagonal (narrower on a portrait screen)
const HP = { x: 2.4, y: 2.0, z: -1.3, r: R };
const syncHP = (aspect) => {
  HP.x = aspect < 1 ? 1.7 : 2.4;
  HP.r = aspect < 1 ? 0.85 : R;
};
const stepAt = (t) => ease(ramp(t, TP - 0.25, TP)) * (1 - ease(ramp(t, TP + 0.6, TP + 1.4)));
// how far the punch is out: in over three drawings, held six, then back
const extAt = (t) => ease(ramp(t, TP - 0.03, TP + 0.08)) * (1 - ease(ramp(t, TP + 0.55, TP + 0.85)));

// 42 vertices of the hull (a detail-1 icosphere), and its faces in a spiral so they close in one sweep.
let HULL = null;
function hullData() {
  if (HULL) return HULL;
  const g = new IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  const verts = [];
  const key = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(3)).join();
    if (!key.has(k)) {
      key.set(k, verts.length);
      verts.push([p.getX(i), p.getY(i), p.getZ(i)]);
    }
  }
  const faces = p.count / 3;
  const rank = Array.from({ length: faces }, (_, f) => {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let k = 0; k < 3; k++) {
      x += p.getX(f * 3 + k);
      y += p.getY(f * 3 + k);
      z += p.getZ(f * 3 + k);
    }
    return { f, s: Math.atan2(z, x) / (2 * Math.PI) + 0.35 * y };
  }).sort((a, b) => a.s - b.s);
  const order = new Float32Array(p.count);
  rank.forEach(({ f }, i) => order.fill(i / (faces - 1), f * 3, f * 3 + 3));
  g.setAttribute("aOrder", new BufferAttribute(order, 1));
  // the corner the rays spray from: the vertex nearest the pup (lowest x, then lowest y)
  const corner = verts.reduce((a, v) => (v[0] - 0.4 * v[1] < a[0] - 0.4 * a[1] ? v : a), [9, 9, 0]);
  HULL = { geo: g, verts, corner };
  return HULL;
}

// A hull vertex in the figure frame, as the hull turns and swells (born: 0..1).
const vertexAt = (v, ang, born) => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const k = HP.r * born;
  return [HP.x + k * (v[0] * c + v[2] * s), HP.y + k * v[1], HP.z + k * (v[2] * c - v[0] * s)];
};

function hullMaterial() {
  return new ShaderMaterial({
    uniforms: { uProg: { value: 0 }, uA: { value: new Color(INK.mint).convertLinearToSRGB() }, uB: { value: new Color("#b79bff").convertLinearToSRGB() } },
    side: DoubleSide,
    vertexShader: "attribute float aOrder; varying float vO; varying vec3 vV; void main(){ vO = aOrder; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = mv.xyz; gl_Position = projectionMatrix * mv; }",
    fragmentShader: /* glsl */ `
      uniform float uProg; uniform vec3 uA; uniform vec3 uB; varying float vO; varying vec3 vV;
      void main() {
        if (vO > uProg) discard;
        vec3 n = normalize(cross(dFdx(vV), dFdy(vV)));
        if (dot(n, vV) > 0.0) n = -n;
        float l = 0.62 + 0.38 * max(dot(n, normalize(vec3(-0.3, 0.7, 0.6))), 0.0);
        vec3 c = mix(uA, uB, vO) * l;
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
      }`,
  });
}

const DUMMY = new Object3D();
const Y = new Vector3(0, 1, 0);
const QUAT = new Quaternion();
const DIR = new Vector3();

function Hull({ cut }) {
  const { tl } = cut;
  const { geo, verts, corner } = useMemo(hullData, []);
  const group = useRef();
  const solid = useRef();
  const rays = useRef();
  const mat = useMemo(hullMaterial, []);
  const wire = useMemo(() => new EdgesGeometry(geo, 1), [geo]);
  const wireMat = useMemo(() => new LineBasicMaterial({ color: INK.cream, toneMapped: false, transparent: true, opacity: 0.5 }), []);
  const rayMat = useMemo(() => new MeshBasicMaterial({ toneMapped: false, fog: false, transparent: true }), []);
  // a tapered ray: wide at the corner, a point at the far end
  const rayGeo = useMemo(() => new ConeGeometry(0.05, 1, 5), []);
  const ends = useMemo(() => {
    const r = rand(21);
    return Array.from({ length: RAYS }, () => [-0.6 + r() * 5.2, 0.5 + r() * 3.2, -3.0 + r() * 3.6]);
  }, []);
  const coral = useMemo(() => new Color(INK.coral), []);
  const hot = useMemo(() => new Color("#fff1d8"), []);
  const mint = useMemo(() => new Color(INK.mint), []);
  const tmp = useMemo(() => new Color(), []);
  useFrame((state) => {
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    group.current.visible = rays.current.visible = on;
    if (!on) return;
    syncHP(state.camera.aspect);
    const tt = onTwos(t);
    const out = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    const born = ease(ramp(tt, 1.7, 2.3)) * out;
    const ang = 0.3 * tt;
    const hull = group.current;
    hull.position.set(HP.x, HP.y, HP.z);
    hull.rotation.y = ang;
    hull.scale.setScalar(HP.r * born + 0.001);
    mat.uniforms.uProg.value = ramp(tt, TP + 0.3, TP + 1.7);
    solid.current.visible = mat.uniforms.uProg.value > 0;
    wireMat.opacity = 0.5 * (1 - ramp(tt, TP + 1.0, TP + 1.7));
    // the rays, from one corner: spray, then one stroke each to a vertex
    const C = vertexAt(corner, ang, born);
    const u = ease(ramp(tt, TP, TP + 0.5));
    const wob = 0.12 * (1 - u);
    const far = 4.2; // the ray furthest from the corner is the thinnest
    for (let i = 0; i < RAYS; i++) {
      const grow = ease(ramp(tt, 1.8 + i * 0.02, 2.1 + i * 0.02)) * out;
      const V = vertexAt(verts[i % verts.length], ang, born);
      const E = ends[i];
      const w = ((Math.floor(tt * 12) * 13 + i * 7) % 11) / 11 - 0.5;
      const ex = E[0] + (V[0] - E[0]) * u + w * wob;
      const ey = E[1] + (V[1] - E[1]) * u + w * wob;
      const ez = E[2] + (V[2] - E[2]) * u;
      DIR.set((ex - C[0]) * grow, (ey - C[1]) * grow, (ez - C[2]) * grow);
      const len = DIR.length();
      const reach = Math.min(1, len / far);
      // fat near the corner's side of the spray, fading to a hairline for the far ones; one thin stroke once snapped
      const th = (1.15 - 0.85 * reach) * (1 - 0.55 * u) * (len > 0.001 ? 1 : 0);
      DUMMY.position.set(C[0] + DIR.x / 2, C[1] + DIR.y / 2, C[2] + DIR.z / 2);
      if (len > 0.001) DUMMY.quaternion.copy(QUAT.setFromUnitVectors(Y, DIR.divideScalar(len)));
      DUMMY.scale.set(th, len + 0.0001, th);
      DUMMY.updateMatrix();
      rays.current.setMatrixAt(i, DUMMY.matrix);
      tmp.copy(i < 9 && u === 0 ? hot : coral).lerp(mint, u);
      rays.current.setColorAt(i, tmp);
    }
    rays.current.instanceMatrix.needsUpdate = true;
    rays.current.instanceColor.needsUpdate = true;
    rayMat.opacity = 1 - 0.85 * ramp(tt, TP + 1.2, TP + 1.9);
  }, -0.4);
  return (
    <>
      <group ref={group} visible={false}>
        <mesh ref={solid} geometry={geo} material={mat} />
        <lineSegments geometry={wire} material={wireMat} />
      </group>
      <instancedMesh ref={rays} args={[rayGeo, rayMat, RAYS]} visible={false} frustumCulled={false} renderOrder={3} />
    </>
  );
}

// A deck of separate flat clouds high behind the hull; the punch splits it.
// They shrink away toward the frame's edges, so none is ever cut by it.
const CLOUDS = 9;
function Clouds({ cut }) {
  const { tl } = cut;
  const ref = useRef();
  const mat = useMemo(() => flat("#eef2ff", { transparent: true, opacity: 0.4, depthWrite: false }), []);
  const geo = useMemo(() => new IcosahedronGeometry(1, 0).scale(1, 0.3, 0.45), []);
  const o = useMemo(() => new Object3D(), []);
  const d = useMemo(() => {
    const r = rand(33);
    return Array.from({ length: CLOUDS }, (_, i) => ({ x: -2.2 + (i / (CLOUDS - 1)) * 6.6 + (r() - 0.5) * 0.3, y: 3.0 + r() * 0.9, z: -3.6 - r() * 0.8, s: 0.45 + r() * 0.3 }));
  }, []);
  useFrame((state) => {
    const m = ref.current;
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    m.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const half = 3.8 * state.camera.aspect * 0.8; // how far from the middle the frame reaches at the deck
    const appear = ease(ramp(tt, 2.0, 2.8)) * (1 - ramp(tt, tl.collapse[0], tl.collapse[1]));
    const split = ease(ramp(tt, TP + 0.15, TP + 1.2));
    for (let i = 0; i < CLOUDS; i++) {
      const c = d[i];
      const side = c.x > 1.0 ? 1 : -1;
      const x = c.x + side * 1.1 * split + 0.05 * Math.sin(tt * 0.8 + i);
      const edge = 1 - ramp(Math.abs(x - 0.7), half - 1.2, half - 0.3);
      o.position.set(x, c.y, c.z);
      o.scale.setScalar(c.s * appear * edge + 0.001);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, -0.4);
  return <instancedMesh ref={ref} args={[geo, mat, CLOUDS]} visible={false} frustumCulled={false} />;
}

// THE PUNCH: a big white flipper thrown along the diagonal from the pup's
// shoulder toward the hull's corner, a mint shockwave ring on the fist facing
// the hull, and speed lines down the shaft. In and held for six drawings.
const ARM = new CapsuleGeometry(0.15, 1, 4, 8).rotateX(Math.PI / 2).translate(0, 0, 0.5);
const MITT = new IcosahedronGeometry(0.24, 1);
const SPEED = new ConeGeometry(0.03, 1, 4).rotateX(Math.PI / 2);
const RING = new RingGeometry(0.9, 1, 48);
const LINES = 12;
function Punch() {
  const S = useMemo(() => new Vector3(), []);
  const F = useMemo(() => new Vector3(), []);
  const D = useMemo(() => new Vector3(), []);
  const root = useRef();
  const arm = useRef();
  const mitt = useRef();
  const lines = useRef();
  const ringA = useRef();
  const ringB = useRef();
  const armMat = useMemo(() => flat("#f4f8ff"), []);
  const speedMat = useMemo(() => flat(INK.cream, { transparent: true, opacity: 0.9, depthWrite: false }), []);
  const ringMat = useMemo(() => flat(INK.mint, { transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending }), []);
  const ringMat2 = useMemo(() => flat(INK.cream, { transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending }), []);
  useFrame((state) => {
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    root.current.visible = on;
    if (!on) return;
    syncHP(state.camera.aspect);
    const tt = onTwos(t);
    const ang = 0.3 * tt;
    const step = stepAt(tt);
    const ext = extAt(tt);
    const { corner } = hullData();
    const C = vertexAt(corner, ang, 1);
    // the shoulder: the pup's, stepped in, a little right of it
    S.set(0.5 + 0.5 * step, 0.78, 0.12 - 0.4 * step);
    D.set(C[0] - S.x, C[1] - S.y, C[2] - S.z);
    const len = D.length();
    D.divideScalar(len);
    const reach = Math.min(len - 0.3, 2.2) * ext;
    const g = root.current;
    g.position.copy(S);
    g.lookAt(S.x + D.x, S.y + D.y, S.z + D.z);
    arm.current.scale.set(1, 1, reach + 0.0001);
    arm.current.visible = ext > 0.01;
    mitt.current.position.set(0, 0, reach);
    mitt.current.scale.setScalar(ext > 0.01 ? 1 : 0.0001);
    // speed lines along the shaft, re-thrown every few drawings
    const hold = ext > 0.5 ? 1 : 0;
    const r = rand(Math.floor((tt * 12) / 2) * 5 + 7);
    for (let i = 0; i < LINES; i++) {
      const a = r() * 6.283;
      const rad = 0.28 + 0.5 * r();
      const z = reach * (0.1 + 0.9 * r());
      DUMMY.position.set(Math.cos(a) * rad, Math.sin(a) * rad, z);
      DUMMY.quaternion.identity();
      DUMMY.scale.set(1, 1, (0.45 + 0.7 * r()) * hold + 0.0001);
      DUMMY.updateMatrix();
      lines.current.setMatrixAt(i, DUMMY.matrix);
    }
    lines.current.instanceMatrix.needsUpdate = true;
    // the shockwave: two rings on the fist, facing the hull
    F.copy(D).multiplyScalar(reach).add(S);
    const k = ramp(tt, TP, TP + 0.7);
    for (const ring of [ringA.current, ringB.current]) {
      ring.position.copy(F);
      ring.lookAt(F.x + D.x, F.y + D.y, F.z + D.z);
    }
    const a1 = tt < TP ? 0 : 0.95 * (1 - k);
    ringMat.opacity = a1;
    ringA.current.scale.setScalar(a1 > 0.01 ? 0.25 + 2.4 * ease(k) : 0.0001);
    const k2 = ramp(tt, TP + 0.08, TP + 0.5);
    const a2 = tt < TP + 0.08 ? 0 : 0.85 * (1 - k2);
    ringMat2.opacity = a2;
    ringB.current.scale.setScalar(a2 > 0.01 ? 0.15 + 1.3 * ease(k2) : 0.0001);
  }, -0.4);
  return (
    <>
      <group ref={root} visible={false}>
        <mesh ref={arm} geometry={ARM} material={armMat} renderOrder={4} />
        <mesh ref={mitt} geometry={MITT} material={armMat} renderOrder={4} />
        <instancedMesh ref={lines} args={[SPEED, speedMat, LINES]} frustumCulled={false} renderOrder={4} />
      </group>
      <mesh ref={ringA} geometry={RING} material={ringMat} renderOrder={5} frustumCulled={false} />
      <mesh ref={ringB} geometry={RING} material={ringMat2} renderOrder={5} frustumCulled={false} />
    </>
  );
}

// A small white cape behind the pup's body, below its head, for the punch only.
const CAPE = new ConeGeometry(0.3, 0.75, 4).scale(1.5, 1, 0.6);
function Cape() {
  const ref = useRef();
  const mat = useMemo(() => flat("#ffffff", { side: DoubleSide }), []);
  useFrame((state) => {
    const g = ref.current;
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    g.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const k = ramp(tt, TP - 1.0, TP - 0.8) * (1 - ramp(tt, TP + 1.4, TP + 1.9));
    const step = stepAt(tt);
    g.position.set(0.5 * step - 0.2, 0.28, -0.4 * step - 0.34);
    g.rotation.set(-0.25 - 0.1 * Math.sin(tt * 16) - 0.35 * extAt(tt), 0.6, 0.04 * Math.sin(tt * 11));
    g.scale.setScalar(k + 0.0001);
  }, -0.4);
  return <mesh ref={ref} geometry={CAPE} material={mat} visible={false} renderOrder={2} />;
}

export default function OnePunch(cut) {
  const { tl, mode } = cut;
  const out = (t) => 1 - ramp(t, tl.collapse[0], tl.duration);
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = out(t);
    live.pose.sign = ramp(t, tl.sign[0], tl.sign[1]) * (1 - ramp(t, tl.sign[1] + 0.2, tl.lineA)) * o;
    // the wind-up: a deep crouch, held, then the fist
    live.pose.crouch = ramp(t, TP - 1.0, TP - 0.5) * (1 - ramp(t, TP - 0.15, TP)) * o;
    live.pose.fist = ramp(t, TP - 0.12, TP + 0.05) * (1 - ramp(t, TP + 0.6, TP + 0.95)) * o;
  });
  usePup(cut, (t, p, turn) => {
    // one step in, the punch, a slow step back
    const step = stepAt(t) * out(t);
    nudge(p, turn, 0.5 * step, 0, -0.4 * step);
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut} scaled={false}>
        <Hull cut={cut} />
        <Clouds cut={cut} />
        <Punch />
        <Cape />
        <Flash color="#cffff0" at={[1.1, 1.2, -0.9]} fn={() => [T.t < TP ? 0 : 1 - ramp(T.t, TP, TP + 0.35), 2.4 + 2 * ramp(T.t, TP, TP + 0.35)]} />
        <Shards start={TP} dur={1.1} from={[1.1, 1.1, -0.9]} speed={2.2} up={1.4} size={0.08} count={14} colors={[INK.cream, INK.mint]} seed={9} />
      </Rig>
    </>
  );
}
