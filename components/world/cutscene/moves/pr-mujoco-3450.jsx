// MuJoCo hull: ONE PUNCH MAN. 126 coral probe-rays spray from one corner of the
// convex hull and "yell" One punch; the pup crouches, steps in and throws ONE
// serious punch: a shockwave runs through the frame, every ray snaps into one
// mint stroke to its vertex (42 vertices, three rays each), the hull closes
// face by face from mint to violet, and the cloud deck above splits in a gap.
// Cost: rays 1 draw (one LineSegments, positions rewritten on twos), hull 1
// (per-face reveal in the shader) + wire 1, clouds 1 (instanced), ring 1,
// flash 1; no post pass.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Color, DoubleSide, EdgesGeometry, IcosahedronGeometry, LineBasicMaterial, Object3D, ShaderMaterial } from "three";
import { Stage, Speaker, onTwos, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Flash, INK, Ring, Rig, Shards, T, clock, ease, flat, nudge, rand, ramp, usePup } from "./g2/parts";

const HULL_AT = [2.3, 1.55, -3.0];
const R = 1.2;
const RAYS = 126;

// 42 vertices of the hull (a detail-1 icosphere), and its faces in a spiral so they close in one sweep.
function hullData() {
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
  return { geo: g, verts };
}

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

function Hull({ cut }) {
  const { tl } = cut;
  const tp = tl.move[0] + 0.2; // the punch lands
  const { geo, verts } = useMemo(hullData, []);
  const group = useRef();
  const solid = useRef();
  const rays = useRef();
  const mat = useMemo(hullMaterial, []);
  const wire = useMemo(() => new EdgesGeometry(geo, 1), [geo]);
  const wireMat = useMemo(() => new LineBasicMaterial({ color: INK.cream, toneMapped: false, transparent: true, opacity: 0.5 }), []);
  const rayMat = useMemo(() => new LineBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true }), []);
  const ends = useMemo(() => {
    const r = rand(21);
    return Array.from({ length: RAYS }, () => [-1.9 + r() * 5.8, 0.15 + r() * 3.1, -4.4 + r() * 4.9]);
  }, []);
  const rayGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(RAYS * 18), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(RAYS * 18), 3));
    return g;
  }, []);
  const corner = useMemo(() => verts.reduce((a, v) => (v[0] < a[0] ? v : a), [9, 0, 0]), [verts]);
  const coral = useMemo(() => new Color(INK.coral), []);
  const hot = useMemo(() => new Color("#fff1d8"), []);
  const mint = useMemo(() => new Color(INK.mint), []);
  const tmp = useMemo(() => new Color(), []);
  useFrame((state) => {
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    group.current.visible = rays.current.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const out = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    const born = ease(ramp(tt, 1.7, 2.3)) * out;
    const ang = 0.3 * tt;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const hull = group.current;
    hull.position.set(...HULL_AT);
    hull.rotation.y = ang;
    hull.scale.setScalar(R * born + 0.001);
    mat.uniforms.uProg.value = ramp(tt, tp + 0.3, tp + 1.7);
    solid.current.visible = mat.uniforms.uProg.value > 0;
    wireMat.opacity = 0.5 * (1 - ramp(tt, tp + 1.0, tp + 1.7));
    // the rays, from one corner: spray, then one stroke each to a vertex
    const at = (v) => [HULL_AT[0] + R * born * (v[0] * c + v[2] * s), HULL_AT[1] + R * born * v[1], HULL_AT[2] + R * born * (v[2] * c - v[0] * s)];
    const C = at(corner);
    const pos = rayGeo.attributes.position;
    const col = rayGeo.attributes.color;
    const u = ease(ramp(tt, tp, tp + 0.5));
    const wob = 0.12 * (1 - u);
    for (let i = 0; i < RAYS; i++) {
      const grow = ease(ramp(tt, 1.8 + i * 0.011, 2.1 + i * 0.011)) * out;
      const V = at(verts[i % verts.length]);
      const E = ends[i];
      const w = ((Math.floor(tt * 12) * 13 + i * 7) % 11) / 11 - 0.5;
      const ex = E[0] + (V[0] - E[0]) * u + w * wob;
      const ey = E[1] + (V[1] - E[1]) * u + w * wob;
      const ez = E[2] + (V[2] - E[2]) * u;
      tmp.copy(i < 9 && u === 0 ? hot : coral).lerp(mint, u);
      // three hairlines a hair apart read as one stroke at any pixel ratio
      for (let c3 = 0; c3 < 3; c3++) {
        const o1 = c3 === 1 ? 0.016 : 0;
        const o2 = c3 === 2 ? 0.016 : 0;
        const k = (i * 3 + c3) * 2;
        pos.setXYZ(k, C[0] + o1, C[1] + o2, C[2]);
        pos.setXYZ(k + 1, C[0] + o1 + (ex - C[0]) * grow, C[1] + o2 + (ey - C[1]) * grow, C[2] + (ez - C[2]) * grow);
        col.setXYZ(k, tmp.r, tmp.g, tmp.b);
        col.setXYZ(k + 1, tmp.r, tmp.g, tmp.b);
      }
    }
    pos.needsUpdate = col.needsUpdate = true;
    rayMat.opacity = 1 - 0.85 * ramp(tt, tp + 1.2, tp + 1.9);
  }, -0.4);
  return (
    <>
      <group ref={group} visible={false}>
        <mesh ref={solid} geometry={geo} material={mat} />
        <lineSegments geometry={wire} material={wireMat} />
      </group>
      <lineSegments ref={rays} geometry={rayGeo} material={rayMat} frustumCulled={false} renderOrder={3} />
    </>
  );
}

// A deck of flat clouds high behind the hull; the punch splits it.
const CLOUDS = 12;
function Clouds({ cut }) {
  const { tl } = cut;
  const tp = tl.move[0] + 0.2;
  const ref = useRef();
  const mat = useMemo(() => flat("#eef2ff", { transparent: true, opacity: 0.55, depthWrite: false }), []);
  const geo = useMemo(() => new IcosahedronGeometry(1, 0).scale(1, 0.3, 0.45), []);
  const o = useMemo(() => new Object3D(), []);
  const d = useMemo(() => {
    const r = rand(33);
    return Array.from({ length: CLOUDS }, (_, i) => ({ x: -2.6 + (i / (CLOUDS - 1)) * 7.4 + (r() - 0.5) * 0.4, y: 1.5 + r() * 0.8, z: -4.7 - r() * 0.8, s: 0.7 + r() * 0.5 }));
  }, []);
  useFrame((state) => {
    const m = ref.current;
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    m.visible = on;
    if (!on) return;
    const tt = onTwos(t);
    const appear = ease(ramp(tt, 2.0, 2.8)) * (1 - ramp(tt, tl.collapse[0], tl.collapse[1]));
    const split = ease(ramp(tt, tp + 0.15, tp + 1.2));
    for (let i = 0; i < CLOUDS; i++) {
      const c = d[i];
      const side = c.x > 1.0 ? 1 : -1;
      o.position.set(c.x + side * 1.5 * split + 0.05 * Math.sin(tt * 0.8 + i), c.y, c.z);
      o.scale.setScalar(c.s * appear + 0.001);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, -0.4);
  return <instancedMesh ref={ref} args={[geo, mat, CLOUDS]} visible={false} frustumCulled={false} />;
}

export default function OnePunch(cut) {
  const { tl, mode } = cut;
  const tp = tl.move[0] + 0.2;
  const out = (t) => 1 - ramp(t, tl.collapse[0], tl.duration);
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = out(t);
    live.pose.sign = ramp(t, tl.sign[0], tl.sign[1]) * (1 - ramp(t, tl.sign[1] + 0.2, tl.lineA)) * o;
    live.pose.crouch = ramp(t, tp - 0.9, tp - 0.35) * (1 - ramp(t, tp - 0.15, tp)) * o;
    live.pose.fist = ramp(t, tp - 0.15, tp + 0.05) * (1 - ramp(t, tp + 1.0, tp + 1.7)) * o;
  });
  usePup(cut, (t, p, turn) => {
    // one step in, the punch, a slow step back
    const step = ease(ramp(t, tp - 0.25, tp)) * (1 - ease(ramp(t, tp + 0.9, tp + 1.9))) * out(t);
    nudge(p, turn, 0.5 * step, 0, -0.4 * step);
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut}>
        <Hull cut={cut} />
        <Clouds cut={cut} />
      </Rig>
      <Rig cut={cut} scaled={false}>
        <Ring color={INK.mint} at={[0.6, 0.7, -0.5]} fn={() => [0.3 + 12 * ease(ramp(T.t, tp, tp + 0.8)), T.t < tp ? 0 : 0.9 * (1 - ramp(T.t, tp, tp + 0.9))]} />
        <Ring color={INK.cream} at={[0.6, 0.7, -0.5]} fn={() => [0.2 + 5 * ease(ramp(T.t, tp + 0.08, tp + 0.5)), T.t < tp + 0.08 ? 0 : 0.8 * (1 - ramp(T.t, tp + 0.08, tp + 0.55))]} />
        <Flash color="#cffff0" at={[0.6, 0.7, -0.5]} fn={() => [T.t < tp ? 0 : 1 - ramp(T.t, tp, tp + 0.35), 2.4 + 2 * ramp(T.t, tp, tp + 0.35)]} />
        <Shards start={tp} dur={1.1} from={[0.8, 0.1, -0.2]} speed={2.2} up={1.4} size={0.08} count={14} colors={[INK.cream, INK.mint]} seed={9} />
      </Rig>
    </>
  );
}
