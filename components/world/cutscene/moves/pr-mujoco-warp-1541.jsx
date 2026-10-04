// MuJoCo Warp: FRIEZA. The pair-matrix floor (22 x 22 = 484 coral cells, the
// showcase figure) speaks "This isn't even my final form."; the pup powers up
// in a horned coral shell (squash, shudder, 1 -> 1.4 times its size, light
// swelling behind it), the shell cracks into shards, every row of the floor
// slides into its diagonal and the 22 diagonal cells lift off as a little
// forest the pup lands in. The shell has the horns; the pup's round head never
// does. Cost: floor 1 draw (instanced), forest 1, shell 1 + edges 1, lightning
// 1, flash 1, shards 1; no post pass.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, EdgesGeometry, IcosahedronGeometry, LineBasicMaterial, MeshLambertMaterial, Object3D } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Stage, Speaker, onTwos, useCutFrame } from "../kit";
import { live } from "../../../../lib/world/store";
import { Flash, INK, Rig, Shards, T, clock, ease, flat, nudge, rand, ramp, usePup } from "./g2/parts";

const N = 22;
const CELL = 0.3;
const FLOOR = [0.9, 0.03, -1.6]; // the floor's centre, in the figure frame
const cx = (j) => FLOOR[0] + (j - (N - 1) / 2) * CELL;
const cz = (i) => FLOOR[2] + (i - (N - 1) / 2) * CELL;

// The forest: 22 spots round the pup, none on it, none touching.
function forestSpots() {
  const r = rand(11);
  const out = [];
  while (out.length < N) {
    const p = [-1.9 + r() * 5.6, -4.3 + r() * 5.2];
    if (Math.hypot(p[0], p[1]) < 1.15) continue;
    if (out.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.62)) continue;
    out.push(p);
  }
  return out;
}

const paint = (g, hex) => {
  const c = new Color(hex);
  const a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) c.toArray(a, i);
  g.setAttribute("color", new BufferAttribute(a, 3));
  return g;
};
const bare = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};
const treeGeometry = () =>
  mergeGeometries([
    paint(new CylinderGeometry(0.04, 0.055, 0.22, 5).translate(0, 0.11, 0), "#8a6a52"),
    paint(new ConeGeometry(0.24, 0.5, 5).translate(0, 0.45, 0), "#5fc29a"),
    paint(new ConeGeometry(0.18, 0.42, 5).translate(0, 0.74, 0), "#8fe0b8"),
  ]);

// The shell: a low-poly dome with two horns on its shoulders, in one geometry.
const shellGeometry = () =>
  mergeGeometries([
    bare(new IcosahedronGeometry(1, 1).scale(1.15, 0.95, 1.05)),
    ...[-1, 1].map((s) => bare(new ConeGeometry(0.2, 0.95, 5).rotateZ(-s * 0.55).translate(s * 0.78, 1.0, -0.1))),
  ]);

const DUMMY = new Object3D();
const BOLTS = 3;
const SEGS = 6;

function Floor({ cut }) {
  const { tl } = cut;
  const cells = useRef();
  const trees = useRef();
  const cellGeo = useMemo(() => new CylinderGeometry(1, 1, 1, 4).rotateY(Math.PI / 4), []);
  const spots = useMemo(forestSpots, []);
  const treeGeo = useMemo(treeGeometry, []);
  const leafMat = useMemo(() => new MeshLambertMaterial({ vertexColors: true, flatShading: true }), []);
  const floorMat = useMemo(() => flat("#ffffff"), []);
  const ready = useRef(false);
  useFrame((state) => {
    const mesh = cells.current;
    const forest = trees.current;
    const t = clock(state);
    const on = Boolean(live.arrival.id) && live.inStage;
    mesh.visible = forest.visible = on;
    if (!on) return;
    if (!ready.current) {
      ready.current = true;
      const a = new Color(INK.coral);
      const b = new Color("#ffa285");
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) mesh.setColorAt(i * N + j, (i + j) % 2 ? a : b);
      mesh.instanceColor.needsUpdate = true;
    }
    const tt = onTwos(t);
    const M0 = tl.move[0];
    const out = 1 - ramp(tt, tl.collapse[0], tl.collapse[1]);
    const slide = ease(ramp(tt, M0, M0 + 0.55));
    const gone = ramp(tt, M0 + 0.3, M0 + 0.7);
    const lift = 1 - ramp(tt, M0 + 0.55, M0 + 0.9);
    for (let i = 0; i < N; i++) {
      const build = ramp(tt, 1.6 + i * 0.035, 1.9 + i * 0.035);
      for (let j = 0; j < N; j++) {
        const k = (i === j ? lift : 1 - gone) * build * out;
        DUMMY.position.set(cx(j) + (cx(i) - cx(j)) * slide, FLOOR[1] + 0.04 * k, cz(i));
        DUMMY.scale.set(0.135 * k, 0.04 * k + 0.001, 0.135 * k);
        DUMMY.updateMatrix();
        mesh.setMatrixAt(i * N + j, DUMMY.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < N; i++) {
      const u = ramp(tt, M0 + 0.55, M0 + 1.5 + i * 0.012);
      const e = ease(u);
      const sway = 0.07 * Math.sin(tt * 2.3 + i) * ramp(tt, M0 + 1.6, M0 + 2.0);
      DUMMY.position.set(cx(i) + (spots[i][0] - cx(i)) * e, 0.03 + 0.6 * Math.sin(Math.PI * e) * (1 - ramp(u, 0.9, 1)), cz(i) + (spots[i][1] - cz(i)) * e);
      DUMMY.rotation.set(0, i, sway);
      DUMMY.scale.setScalar(Math.min(1, u * 3) * (0.8 + 0.06 * (i % 4)) * out);
      DUMMY.updateMatrix();
      forest.setMatrixAt(i, DUMMY.matrix);
    }
    forest.instanceMatrix.needsUpdate = true;
  }, -0.4);
  return (
    <>
      <instancedMesh ref={cells} args={[cellGeo, floorMat, N * N]} visible={false} frustumCulled={false} />
      <instancedMesh ref={trees} args={[treeGeo, leafMat, N]} visible={false} frustumCulled={false} />
    </>
  );
}

// The coral shell round the powering pup, cracked on the move beat.
function Shell({ cut }) {
  const { tl } = cut;
  const root = useRef();
  const bolts = useRef();
  const geo = useMemo(shellGeometry, []);
  const edges = useMemo(() => new EdgesGeometry(geo, 38), [geo]);
  const fill = useMemo(() => new MeshLambertMaterial({ color: INK.coral, emissive: "#ff5a52", emissiveIntensity: 0.55, flatShading: true, transparent: true, opacity: 0.5, depthWrite: false, side: DoubleSide }), []);
  const line = useMemo(() => new LineBasicMaterial({ color: INK.cream, toneMapped: false, transparent: true, opacity: 0.8 }), []);
  const boltGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(BOLTS * SEGS * 6), 3));
    return g;
  }, []);
  const boltMat = useMemo(() => new LineBasicMaterial({ color: "#fff6c8", toneMapped: false }), []);
  const seed = useRef(-1);
  useFrame((state) => {
    const g = root.current;
    const t = clock(state);
    const A = tl.lineA;
    const crack = tl.move[0] + 0.15;
    const on = Boolean(live.arrival.id) && live.inStage;
    g.visible = on;
    if (!on) return;
    if (t < A + 0.2 || t >= crack) {
      g.scale.setScalar(0.0001);
      return;
    }
    const tt = onTwos(t);
    const power = ramp(tt, A + 0.3, crack);
    const s = 1.55 * ease(ramp(tt, A + 0.3, A + 1.2)) * (1 + 0.03 * Math.sin(tt * 38) * power);
    g.position.set(0, 0.56 * s + 0.05, 0);
    g.scale.setScalar(s);
    g.rotation.y = tt * 0.9;
    line.opacity = 0.55 + 0.45 * (Math.floor(tt * 12) % 2) * power;
    // the lightning: a few zigzags over the shell, re-drawn on twos
    const frame = Math.floor(t * 12);
    if (frame !== seed.current) {
      seed.current = frame;
      const r = rand(frame * 7 + 3);
      const a = boltGeo.attributes.position;
      let n = 0;
      for (let b = 0; b < BOLTS; b++) {
        const ph = r() * 6.28;
        const th = 0.5 + r() * 1.6;
        let px = Math.cos(ph) * Math.sin(th);
        let py = Math.cos(th);
        let pz = Math.sin(ph) * Math.sin(th);
        for (let k = 0; k < SEGS; k++) {
          const nx = px + (r() - 0.5) * 0.55;
          const ny = py + (r() - 0.5) * 0.55;
          const nz = pz + (r() - 0.5) * 0.55;
          a.setXYZ(n++, px, py, pz);
          a.setXYZ(n++, nx, ny, nz);
          px = nx;
          py = ny;
          pz = nz;
        }
      }
      a.needsUpdate = true;
    }
    bolts.current.visible = power > 0.35;
  }, -0.4);
  return (
    <group ref={root} visible={false}>
      <mesh geometry={geo} material={fill} renderOrder={4} />
      <lineSegments geometry={edges} material={line} renderOrder={4} />
      <lineSegments ref={bolts} geometry={boltGeo} material={boltMat} scale={1.05} renderOrder={6} frustumCulled={false} />
    </group>
  );
}

export default function Frieza(cut) {
  const { tl, mode } = cut;
  const A = tl.lineA;
  const M0 = tl.move[0];
  const M1 = tl.move[1];
  const out = (t) => 1 - ramp(t, tl.collapse[0], tl.duration);
  const power = (t) => ease(ramp(t, A + 0.2, M0 - 0.1));
  useCutFrame((t) => {
    if (mode !== "full") return;
    const o = out(t);
    live.pose.sign = ramp(t, tl.sign[0], tl.sign[1]) * (1 - ramp(t, tl.sign[1] + 0.2, A)) * o;
    live.pose.crouch = ramp(t, A, A + 0.9) * (1 - ramp(t, M0 + 0.1, M0 + 0.4)) * o;
    live.pose.raise = ramp(t, M1 - 0.3, M1 + 0.3) * o;
  });
  usePup(cut, (t, p, turn) => {
    const o = out(t);
    p.scale.setScalar(1 + 0.4 * power(t) * o);
    const pw = power(t) * (1 - ramp(t, M0 - 0.1, M0 + 0.1));
    nudge(p, turn, Math.sin(onTwos(t) * 70) * 0.035 * pw, 0, 0);
    // out of the shell in a hop, landing among the trees with a squash
    nudge(p, turn, 0, 0.8 * Math.sin(Math.PI * ramp(t, M0 + 0.15, M1 + 0.2)) * o, 0);
  });
  return (
    <>
      <Stage {...cut} />
      <Speaker {...cut} />
      <Rig cut={cut} scaled={false}>
        <Floor cut={cut} />
        <Shell cut={cut} />
        <Flash
          color="#ffd9c8"
          at={[0, 0.8, -0.3]}
          fn={() => {
            const t = T.t;
            const glow = 0.4 * power(t) * (1 - ramp(t, M0 + 0.1, M0 + 0.2));
            const burst = t > M0 + 0.15 ? 1 - ramp(t, M0 + 0.15, M0 + 0.6) : 0;
            return [Math.max(glow, burst), 2.2 + 3 * ramp(t, M0 + 0.15, M0 + 0.6) + 1.4 * power(t)];
          }}
        />
        <Shards start={M0 + 0.15} dur={1.3} from={[0, 1.0, 0]} speed={2.6} up={2.4} size={0.16} count={18} colors={[INK.coral, INK.cream, "#ffa285"]} seed={5} />
      </Rig>
    </>
  );
}
