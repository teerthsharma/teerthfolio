"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CircleGeometry, CylinderGeometry, DoubleSide, PlaneGeometry, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useUi } from "../../../lib/world/store";
import { C, mat, lamp } from "../palette";

// Building for PLACE_BY_ID["workshop"] in lib/world/places.js: planimeter, a
// certified room counter. A quonset drafting shop with a tilted table half
// out on the porch, where a violet two-link arm traces the walls of a floor
// plan — closing each loop it can resolve, and naming the exact gap it can't.
//
// Local space: origin at the footprint centre on the snow, +z faces the
// camera and the dock, footprint stays inside place.radius (3.4).
//
// Arch cross-sections (shell, back wall, ribs) all read x = r*cos/sin(u),
// y = r*sin/cos(u) with u swept so the legs sit at y=0 and the apex at
// y=+r — verified against three's own CylinderGeometry/CircleGeometry/
// TorusGeometry vertex formulas, not guessed.

const ARM_L = 1.2; // each IK link, metres
const ARM_Y = 0.22; // arm hover height above the table surface (local)
const PIVOT = [-1.3, -0.9]; // shoulder, table-local [x, z]
const GAP_X = 0.55; // centre of the 0.2 m gap in room 4's back wall
const GAP_Z = -0.7;
const GAP_HALF = 0.1;

// Closed perimeters for rooms 1-3 (table-local [x, z] corners).
const ROOM_PATHS = [
  [[-1.1, 0], [-1.1, 0.7], [0, 0.7], [0, 0]], // room 1: front-left
  [[0, 0], [0, 0.7], [1.1, 0.7], [1.1, 0]], // room 2: front-right
  [[-1.1, 0], [-1.1, -0.7], [0, -0.7], [0, 0]], // room 3: back-left
];
// Room 4: back-right, traced only as far as the gap in its outer wall.
const ROOM4_PATH = [[0, 0], [0, -0.7], [GAP_X - GAP_HALF, -0.7]];
const ROOM4_STOP = ROOM4_PATH[ROOM4_PATH.length - 1];

const ROOM_CENTERS = [
  [-0.55, 0.35],
  [0.55, 0.35],
  [-0.55, -0.35],
  [0.55, -0.35],
];

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

function pathLength(pts, loop) {
  let len = 0;
  const segs = loop ? pts.length : pts.length - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
}

// Writes the point `dist` along `pts` into `out` ({x,z}). No allocation.
function pointOnPath(pts, loop, dist, out) {
  const segs = loop ? pts.length : pts.length - 1;
  const total = pathLength(pts, loop);
  let d = loop ? ((dist % total) + total) % total : clamp(dist, 0, total);
  for (let i = 0; i < segs; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= segLen || i === segs - 1) {
      const t = segLen > 0 ? Math.min(d / segLen, 1) : 0;
      out.x = a[0] + (b[0] - a[0]) * t;
      out.z = a[1] + (b[1] - a[1]) * t;
      return;
    }
    d -= segLen;
  }
}

// Analytic two-link IK for two equal-length links (isoceles solution).
// Writes elbowX/elbowZ/theta1/theta2/tipX/tipZ into `out`. No allocation.
function solveIK(px, pz, tx, tz, L, out) {
  let dx = tx - px;
  let dz = tz - pz;
  let d = Math.hypot(dx, dz);
  const maxD = 2 * L - 0.001;
  if (d > maxD) {
    const s = maxD / d;
    dx *= s;
    dz *= s;
    d = maxD;
  } else if (d < 0.001) {
    d = 0.001;
  }
  const base = Math.atan2(-dz, dx);
  const offset = Math.acos(clamp(d / (2 * L), -1, 1));
  const theta1 = base - offset;
  const elbowX = px + L * Math.cos(theta1);
  const elbowZ = pz - L * Math.sin(theta1);
  const tipX = px + dx;
  const tipZ = pz + dz;
  out.elbowX = elbowX;
  out.elbowZ = elbowZ;
  out.theta1 = theta1;
  out.theta2 = Math.atan2(-(tipZ - elbowZ), tipX - elbowX);
  out.tipX = tipX;
  out.tipZ = tipZ;
}

export default function AssemblyWorkshop({ place }) {
  const A = place.color;
  const near = useUi((s) => s.near === place.id);

  // Small shared (unanimated) geometries, one instance each.
  const parts = useMemo(
    () => ({
      deck: new BoxGeometry(4.8, 0.3, 3.8),
      top: new BoxGeometry(2.6, 0.14, 1.8),
      floor: new PlaneGeometry(0.94, 0.54),
      counter: new BoxGeometry(0.22, 0.22, 0.22),
      link: new BoxGeometry(1.2, 0.12, 0.12),
      elbow: new SphereGeometry(0.1, 8, 6),
      wheel: new CylinderGeometry(0.14, 0.14, 0.08, 10),
      pin: new SphereGeometry(0.07, 8, 6),
      gapPin: new SphereGeometry(0.1, 8, 6),
    }),
    [],
  );

  // Warm-white shell: the quonset barrel plus its half-disc back wall.
  const shellGeo = useMemo(() => {
    const shell = new CylinderGeometry(2.3, 2.3, 3.2, 12, 1, true, Math.PI / 2, Math.PI);
    shell.rotateX(Math.PI / 2); // axis -> z; arc legs at y=0, apex at y=r
    shell.scale(1, 1.55, 1);
    shell.translate(0, 0.3, -0.3); // rest on the deck; spans z -1.9..1.3
    const back = new CircleGeometry(2.3, 12, 0, Math.PI);
    back.scale(1, 1.55, 1);
    back.translate(0, 0.3, -1.9);
    const merged = mergeGeometries([shell, back]);
    shell.dispose();
    back.dispose();
    return merged;
  }, []);

  // Charcoal static parts: 3 ribs, the hoist beam, the vent body, 4 trestle legs.
  const charcoalGeo = useMemo(() => {
    const pieces = [];
    for (const z of [-1.9, -0.8, 0.3]) {
      const rib = new TorusGeometry(2.35, 0.14, 6, 16, Math.PI);
      rib.scale(1, 1.55, 1);
      rib.translate(0, 0.3, z);
      pieces.push(rib);
    }
    const beam = new BoxGeometry(0.2, 0.2, 3.2);
    beam.translate(0, 3.3, -0.3);
    pieces.push(beam);
    const vent = new CylinderGeometry(0.25, 0.25, 0.5, 10);
    vent.translate(0, 4.115, 0.2);
    pieces.push(vent);
    const deckTop = 0.3;
    for (const [sign, S, H, z] of [
      [1, 0.6, 1.3, 0.1],
      [-1, 0.6, 1.3, 0.1],
      [1, 0.5, 0.7, 1.7],
      [-1, 0.5, 0.7, 1.7],
    ]) {
      const L = Math.hypot(S, H);
      const leg = new BoxGeometry(0.12, L, 0.12);
      leg.rotateZ(Math.atan2(S, H) * sign);
      leg.translate((sign * S) / 2, deckTop + H / 2, z);
      pieces.push(leg);
    }
    const merged = mergeGeometries(pieces);
    pieces.forEach((g) => g.dispose());
    return merged;
  }, []);

  // Accent (A) static parts: the front rib that frames the opening, and the hook block.
  const accentGeo = useMemo(() => {
    const rib = new TorusGeometry(2.35, 0.14, 6, 16, Math.PI);
    rib.scale(1, 1.55, 1);
    rib.translate(0, 0.3, 1.3);
    const hook = new BoxGeometry(0.3, 0.3, 0.3);
    hook.translate(0, 3.05, 0.2);
    const merged = mergeGeometries([rib, hook]);
    rib.dispose();
    hook.dispose();
    return merged;
  }, []);

  // Lamp static parts: the back window and the vent cap.
  const lampGeo = useMemo(() => {
    const win = new CircleGeometry(0.4, 10);
    win.translate(0, 2.0, -1.85);
    const cap = new CylinderGeometry(0.25, 0.25, 0.08, 10);
    cap.translate(0, 4.405, 0.2);
    const merged = mergeGeometries([win, cap]);
    win.dispose();
    cap.dispose();
    return merged;
  }, []);

  // Table-local charcoal parts: the wall strips forming the 2x2 plan (with
  // room 4's gap left open) and the arm's pivot post.
  const planGeo = useMemo(() => {
    const walls = [];
    const mkH = (x1, x2, z) => {
      const g = new BoxGeometry(x2 - x1, 0.12, 0.12);
      g.translate((x1 + x2) / 2, 0.13, z);
      return g;
    };
    const mkV = (z1, z2, x) => {
      const g = new BoxGeometry(0.12, 0.12, z2 - z1);
      g.translate(x, 0.13, (z1 + z2) / 2);
      return g;
    };
    walls.push(mkV(-0.7, 0.7, -1.1)); // left outer
    walls.push(mkV(-0.7, 0.7, 1.1)); // right outer
    walls.push(mkH(-1.1, 1.1, 0.7)); // front outer
    walls.push(mkH(-1.1, GAP_X - GAP_HALF, -0.7)); // back outer, left of the gap
    walls.push(mkH(GAP_X + GAP_HALF, 1.1, -0.7)); // back outer, right of the gap
    walls.push(mkV(-0.7, 0.7, 0)); // centre divider
    walls.push(mkH(-1.1, 1.1, 0)); // centre divider
    const post = new CylinderGeometry(0.1, 0.1, 0.3, 8);
    post.translate(PIVOT[0], 0.22, PIVOT[1]);
    walls.push(post);
    const merged = mergeGeometries(walls);
    walls.forEach((g) => g.dispose());
    return merged;
  }, []);

  // Materials that animate: cloned once, mutated in place (see palette.js).
  const floorMats = useMemo(() => [0, 1, 2, 3].map(() => mat(C.ice, { emissive: A, emissiveIntensity: 0 }).clone()), [A]);
  const counterMats = useMemo(() => [0, 1, 2, 3].map(() => mat(C.charcoal, { emissive: A, emissiveIntensity: 0 }).clone()), [A]);
  const pinMat = useMemo(() => lamp(C.lamp, 2).clone(), []);

  const accentMat = mat(A);
  const accentLamp = lamp(A);

  // Per-frame mutable state: no React state, nothing allocated in useFrame.
  const kRef = useRef(0);
  const stRef = useRef({ phase: 0, dist: 0, blinkT: 0, fadeT: 0 });
  const litRef = useRef([0, 0, 0, 0]);
  const tipRef = useRef({ x: 0, z: 0 });
  const ikRef = useRef({ elbowX: 0, elbowZ: 0, theta1: 0, theta2: 0, tipX: 0, tipZ: 0 });
  const nodes = useRef({});
  const setNode = (key) => (el) => {
    nodes.current[key] = el;
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = stRef.current;
    const lit = litRef.current;
    const target = tipRef.current;

    kRef.current += (near ? 1 - kRef.current : -kRef.current) * (1 - Math.exp(-4 * dt));
    const k = kRef.current;
    const speed = 0.6 + 0.4 * k;
    const glowBoost = 1 + 0.5 * k;

    if (st.phase < 3) {
      st.dist += speed * dt;
      pointOnPath(ROOM_PATHS[st.phase], true, st.dist, target);
      if (st.dist >= pathLength(ROOM_PATHS[st.phase], true)) {
        lit[st.phase] = 1;
        st.phase += 1;
        st.dist = 0;
      }
    } else if (st.phase === 3) {
      st.dist += speed * dt;
      pointOnPath(ROOM4_PATH, false, st.dist, target);
      if (st.dist >= pathLength(ROOM4_PATH, false)) {
        st.phase = 3.5;
        st.dist = 0;
      }
    } else if (st.phase === 3.5) {
      st.dist += speed * dt;
      target.x = ROOM4_STOP[0] - Math.min(st.dist, 0.1);
      target.z = ROOM4_STOP[1];
      if (st.dist >= 0.1) {
        st.phase = 4;
        st.blinkT = 0;
      }
    } else if (st.phase === 4) {
      st.blinkT += dt;
      target.x = ROOM4_STOP[0] - 0.1;
      target.z = ROOM4_STOP[1];
      if (st.blinkT >= 2.5) {
        st.phase = 5;
        st.fadeT = 0;
      }
    } else {
      st.fadeT += dt;
      target.x = ROOM4_STOP[0] - 0.1;
      target.z = ROOM4_STOP[1];
      const fade = Math.max(0, 1 - st.fadeT / 1.2);
      lit[0] = fade;
      lit[1] = fade;
      lit[2] = fade;
      if (st.fadeT >= 1.2) {
        st.phase = 0;
        st.dist = 0;
        lit[0] = lit[1] = lit[2] = lit[3] = 0;
      }
    }

    solveIK(PIVOT[0], PIVOT[1], target.x, target.z, ARM_L, ikRef.current);
    const ik = ikRef.current;
    const n = nodes.current;
    if (n.link1) n.link1.rotation.y = ik.theta1;
    if (n.elbow) n.elbow.position.set(ik.elbowX, ARM_Y, ik.elbowZ);
    if (n.link2) {
      n.link2.position.set(ik.elbowX, ARM_Y, ik.elbowZ);
      n.link2.rotation.y = ik.theta2;
    }
    if (n.tracer) n.tracer.position.set(ik.tipX, ARM_Y, ik.tipZ);

    for (let i = 0; i < 3; i++) {
      const glow = lit[i] * glowBoost;
      floorMats[i].emissiveIntensity = glow;
      counterMats[i].emissiveIntensity = glow * 1.2;
    }

    pinMat.emissiveIntensity = st.phase === 4 ? 0.3 + 1.9 * Math.max(0, Math.sin(st.blinkT * 4 * Math.PI)) : 0.12;
  });

  return (
    <group>
      <mesh geometry={parts.deck} material={mat(C.wood)} position={[0, 0.15, 0]} castShadow receiveShadow />
      <mesh geometry={shellGeo} material={mat(C.warmWhite, { side: DoubleSide })} castShadow receiveShadow />
      <mesh geometry={charcoalGeo} material={mat(C.charcoal)} castShadow receiveShadow />
      <mesh geometry={accentGeo} material={accentMat} castShadow />
      <mesh geometry={lampGeo} material={lamp(C.lamp)} />

      {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
        <mesh key={i} geometry={parts.counter} material={counterMats[i]} position={[x, 2.6, -1.85]} />
      ))}

      {/* Drafting table: tilted 20 deg toward the camera, front edge low. */}
      <group position={[0, 1.3, 0.9]} rotation={[Math.PI / 9, 0, 0]}>
        <mesh geometry={parts.top} material={mat(C.warmWhite)} castShadow receiveShadow />
        <mesh geometry={planGeo} material={mat(C.charcoal)} receiveShadow />

        {ROOM_CENTERS.map(([x, z], i) => (
          <mesh key={i} geometry={parts.floor} material={floorMats[i]} position={[x, 0.09, z]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}

        <mesh geometry={parts.gapPin} material={pinMat} position={[GAP_X, 0.13, GAP_Z]} />

        <group ref={setNode("link1")} position={[PIVOT[0], ARM_Y, PIVOT[1]]}>
          <mesh geometry={parts.link} material={accentMat} position={[0.6, 0, 0]} castShadow />
        </group>
        <mesh ref={setNode("elbow")} geometry={parts.elbow} material={accentMat} />
        <group ref={setNode("link2")}>
          <mesh geometry={parts.link} material={accentMat} position={[0.6, 0, 0]} castShadow />
        </group>
        <group ref={setNode("tracer")}>
          <mesh geometry={parts.wheel} material={accentMat} />
          <mesh geometry={parts.pin} material={accentLamp} position={[0, 0.08, 0]} />
        </group>
      </group>
    </group>
  );
}
