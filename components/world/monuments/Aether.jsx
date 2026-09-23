"use client";

// The BUILDING for Aether-Lang (place id p-aether-lang): a lab project, no
// plinth, standing on the snow. Local origin: the snow at the place centre;
// +z faces the camera and the dock. Props: { place, near }.
//
// data/showcase.json: "Loops stop when their shape stops changing" — a
// language where a loop's own exit test is the shape of its state, measured
// live by persistent homology. The normal thing, done cooler: a carousel —
// a ride that is nothing but a loop, normally stopped by a timer or an
// operator's hand. This one has no timer. Its platform carries a cloud of
// lights that the ride itself measures every turn (real Vietoris-Rips
// topology, computed once in parts/aether-loop.js — same method as the
// figure's own build, teerthsharma.github.io/fig.js "aether —"): threads
// grow between lights, and when they close a ring around empty space it
// glows in the project's colour, then the triangle that fills the hole
// appears. The carousel does not stop turning because a bell rings; the
// ring it draws stops changing pass to pass, and only then does the ride
// let go and start its next run.

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry,
  DoubleSide, Float32BufferAttribute, IcosahedronGeometry, LineBasicMaterial, MeshBasicMaterial,
  Object3D, TorusGeometry,
} from "three";
import { C, glow, lamp, mat } from "../palette";
import { buildAetherLoop, N, NP } from "./parts/aether-loop";

// --- timeline (seconds) ----------------------------------------------------
const MOVE = 0.7; // a pass's points glide in from the pass before
const FILT = 1.7; // the scale grows, threads and the ring appear
const PASS = MOVE + FILT;
const LOCK = 0.9; // the exit pass holds, fully formed — the loop's own "done"
const BREAK = 0.6; // the ring lets go and fades before the next run
const LOOP = NP * PASS + LOCK + BREAK;

// --- the building's own geometry (place-independent, built once) ----------
const RING_SCALE = 1.7; // world metres per unit of the topology's disc
const TIER_Y = 2.35; // height of the carousel platform
const SPOKE_COUNT = 4;
const WINDOW_COUNT = 6;
const EDGE_CAP = (N * (N - 1)) / 2; // every pair — the most that could ever show
const RING_CAP = N; // a cycle visits at most every point once

const POLE_TOP_R = 0.17; // the pole's radius at platform height, where the spokes start
const FOOT_GEO = new CylinderGeometry(1.9, 2.05, 0.35, 10);
const POLE_GEO = new CylinderGeometry(0.14, POLE_TOP_R, 3.6, 8);
const RAIL_GEO = new TorusGeometry(RING_SCALE, 0.08, 8, 20);
const SPOKE_LEN = RING_SCALE - POLE_TOP_R;
const SPOKE_GEO = new BoxGeometry(0.12, 0.12, SPOKE_LEN);
const CANOPY_GEO = new ConeGeometry(1.95, 1.3, 10);
const RIM_GEO = new TorusGeometry(1.95, 0.07, 6, 10);
const WINDOW_GEO = new BoxGeometry(0.34, 0.42, 0.1);
const FINIAL_GEO = new IcosahedronGeometry(0.17, 0);
const ORB_GEO = new IcosahedronGeometry(0.06, 0);

const FOOT_MAT = mat(C.warmWhite, { roughness: 0.82 });
const POLE_MAT = mat(C.charcoal, { roughness: 0.4, metalness: 0.15 });
const RAIL_MAT = mat(C.ice, { roughness: 0.22, metalness: 0.05, opacity: 0.88 });
const SPOKE_MAT = mat(C.charcoal, { roughness: 0.5 });
const RIM_MAT = mat(C.charcoal, { roughness: 0.45 });

// Scratch reused every frame: never allocate inside useFrame.
const dummy = new Object3D();
const ptX = new Float64Array(N);
const ptZ = new Float64Array(N);
const edgeColor = new Color();
const iceColor = new Color(C.ice);

const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
const ease = (u) => { const c = clamp01(u); return c * c * (3 - 2 * c); };
const smooth = (e0, e1, x) => ease((x - e0) / (e1 - e0));

export default function Aether({ place, near }) {
  const glowColor = place.radiation ?? place.color;
  const loop = useMemo(() => buildAetherLoop(), []);
  const glowColorObj = useMemo(() => new Color(glowColor), [glowColor]);

  const orbRef = useRef();
  const spokeRef = useRef();
  const windowRef = useRef();
  const spinRef = useRef();
  const edgeGeoRef = useRef();
  const ringGeoRef = useRef();
  const triRef = useRef();
  const clock = useRef(0);
  const pop = useRef(0);
  const prevK0 = useRef(0);

  const orbMat = useMemo(() => mat(glowColor, { emissive: glowColor, emissiveIntensity: 0.9, roughness: 0.35 }), [glowColor]);
  const canopyMat = useMemo(() => mat(glowColor, { roughness: 0.55 }), [glowColor]);
  const windowMat = useMemo(() => lamp(glowColor), [glowColor]);
  const finialMat = useMemo(() => mat(glowColor, { emissive: glowColor, emissiveIntensity: 1.1, roughness: 0.3 }).clone(), [glowColor]);
  const edgeMat = useMemo(() => new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, toneMapped: false }), []);
  const ringMat = useMemo(() => new LineBasicMaterial({
    color: glowColor, transparent: true, opacity: 0, toneMapped: false, blending: AdditiveBlending, depthWrite: false,
  }), [glowColor]);
  const triMat = useMemo(() => new MeshBasicMaterial({
    color: glowColor, transparent: true, opacity: 0, toneMapped: false, blending: AdditiveBlending, depthWrite: false, side: DoubleSide,
  }), [glowColor]);

  const edgeGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(new Float32Array(EDGE_CAP * 6), 3));
    g.setAttribute("color", new Float32BufferAttribute(new Float32Array(EDGE_CAP * 6), 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const ringGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(new Float32Array(RING_CAP * 6), 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const triGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(new Float32Array(9), 3));
    return g;
  }, []);

  // The pole's spokes and the drum's windows: static, placed once.
  useLayoutEffect(() => {
    const sm = spokeRef.current;
    if (sm) {
      for (let i = 0; i < SPOKE_COUNT; i++) {
        const a = (i * Math.PI * 2) / SPOKE_COUNT;
        const mid = POLE_TOP_R + SPOKE_LEN / 2;
        dummy.position.set(Math.sin(a) * mid, 0, Math.cos(a) * mid);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        sm.setMatrixAt(i, dummy.matrix);
      }
      sm.instanceMatrix.needsUpdate = true;
    }
    const wm = windowRef.current;
    if (wm) {
      for (let i = 0; i < WINDOW_COUNT; i++) {
        const a = (i * Math.PI * 2) / WINDOW_COUNT;
        dummy.position.set(Math.sin(a) * 1.97, 0.2, Math.cos(a) * 1.97);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        wm.setMatrixAt(i, dummy.matrix);
      }
      wm.instanceMatrix.needsUpdate = true;
    }
  }, []);

  useFrame((_, dt) => {
    const boost = near ? 1.6 : 1;
    clock.current += dt * boost;
    const t = clock.current % LOOP;

    let k0, moveU, filtU, breakU;
    if (t < NP * PASS) {
      k0 = Math.floor(t / PASS);
      const u = t - k0 * PASS;
      moveU = k0 > 0 ? ease(u / MOVE) : 1;
      filtU = ease((u - MOVE) / FILT);
      breakU = 0;
    } else {
      k0 = NP - 1;
      moveU = 1;
      filtU = 1;
      breakU = ease((t - NP * PASS - LOCK) / BREAK);
    }

    if (k0 !== prevK0.current) {
      if (k0 === 0) pop.current = 1; // the loop just let go and started again
      prevK0.current = k0;
    }
    pop.current = Math.max(0, pop.current - dt / 0.5);

    const cur = loop.passes[k0];
    const prev = loop.passes[k0 > 0 ? k0 - 1 : k0];
    const topo = loop.topo[k0];
    const rFrac = Math.pow(filtU, 1.2);
    const rNow = rFrac * topo.rmax;
    const sceneFade = 1 - breakU;

    for (let i = 0; i < N; i++) {
      let px, py;
      if (moveU < 1) {
        const rr = prev.r[i] + (cur.r[i] - prev.r[i]) * moveU;
        const aa = prev.th[i] + (cur.th[i] - prev.th[i]) * moveU;
        px = rr * Math.cos(aa);
        py = rr * Math.sin(aa);
      } else {
        px = cur.x[i];
        py = cur.y[i];
      }
      ptX[i] = px * RING_SCALE;
      ptZ[i] = py * RING_SCALE;
    }

    const orbMesh = orbRef.current;
    if (orbMesh) {
      const scale = 1 + pop.current * 0.7;
      for (let i = 0; i < N; i++) {
        dummy.position.set(ptX[i], 0, ptZ[i]); // already inside the spinRef group, which sits at TIER_Y
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        orbMesh.setMatrixAt(i, dummy.matrix);
      }
      orbMesh.instanceMatrix.needsUpdate = true;
    }

    // threads: grow with the scale, coloured by how close each is to the
    // current wavefront (the project's own accent, fading to ice as an edge
    // settles) — the one accent, on the one thing that is the story.
    const eg = edgeGeoRef.current?.geometry;
    if (eg) {
      const pos = eg.attributes.position.array;
      const col = eg.attributes.color.array;
      const E = topo.E;
      let n = 0;
      for (let e = 0; e < E.length; e++) {
        const edge = E[e];
        if (edge.l > rNow) break; // E is sorted ascending: nothing further qualifies
        const b = n * 6;
        pos[b] = ptX[edge.i]; pos[b + 1] = 0; pos[b + 2] = ptZ[edge.i];
        pos[b + 3] = ptX[edge.j]; pos[b + 4] = 0; pos[b + 5] = ptZ[edge.j];
        const frac = 1 - Math.min(1, edge.l / Math.max(rNow, 1e-4));
        edgeColor.copy(iceColor).lerp(glowColorObj, frac);
        col[b] = col[b + 3] = edgeColor.r;
        col[b + 1] = col[b + 4] = edgeColor.g;
        col[b + 2] = col[b + 5] = edgeColor.b;
        n++;
      }
      eg.attributes.position.needsUpdate = true;
      eg.attributes.color.needsUpdate = true;
      eg.setDrawRange(0, n * 2);
    }
    edgeMat.opacity = 0.85 * sceneFade;

    // the ring: the one cycle that survives longest, lit once its closing
    // edge has grown in
    const ringGlow = smooth(topo.bFrac, topo.bFrac + 0.1, rFrac);
    const rg = ringGeoRef.current?.geometry;
    if (rg) {
      const pos = rg.attributes.position.array;
      const cyc = topo.cyc;
      const m = cyc.length;
      for (let q = 0; q < m; q++) {
        const a = cyc[q], b2 = cyc[(q + 1) % m];
        const b = q * 6;
        pos[b] = ptX[a]; pos[b + 1] = 0.01; pos[b + 2] = ptZ[a];
        pos[b + 3] = ptX[b2]; pos[b + 4] = 0.01; pos[b + 5] = ptZ[b2];
      }
      rg.attributes.position.needsUpdate = true;
      rg.setDrawRange(0, m * 2);
    }
    ringMat.opacity = ringGlow * sceneFade * (near ? 1 : 0.8);

    // the triangle that finally spans the hole
    const triFade = smooth(topo.dFrac, topo.dFrac + 0.15, rFrac);
    triMat.opacity = triFade * 0.6 * sceneFade;
    if (triRef.current) {
      const [a, b2, c2] = topo.best.tri;
      const posAttr = triRef.current.geometry.attributes.position;
      posAttr.setXYZ(0, ptX[a], 0.015, ptZ[a]);
      posAttr.setXYZ(1, ptX[b2], 0.015, ptZ[b2]);
      posAttr.setXYZ(2, ptX[c2], 0.015, ptZ[c2]);
      posAttr.needsUpdate = true;
    }

    if (spinRef.current) spinRef.current.rotation.y += dt * 0.22 * boost;
    finialMat.emissiveIntensity = (1.0 + 0.45 * Math.sin(clock.current * 3)) * (near ? 1.35 : 1);
  });

  return (
    <group>
      <mesh position={[0, 0.175, 0]} castShadow receiveShadow material={FOOT_MAT} geometry={FOOT_GEO} />
      <mesh position={[0, 2.15, 0]} castShadow material={POLE_MAT} geometry={POLE_GEO} />

      {/* windows: the drum's own light, in the project's colour */}
      <instancedMesh ref={windowRef} args={[WINDOW_GEO, windowMat, WINDOW_COUNT]} frustumCulled={false} />

      <mesh position={[0, 3.95, 0]} rotation={[Math.PI / 2, 0, 0]} material={RIM_MAT} geometry={RIM_GEO} />
      <mesh position={[0, 4.6, 0]} castShadow material={canopyMat} geometry={CANOPY_GEO} />
      <group position={[0, 5.42, 0]}>
        <mesh material={finialMat} geometry={FINIAL_GEO} />
        <mesh material={glow(glowColor, 0.28)}>
          <sphereGeometry args={[0.42, 12, 10]} />
        </mesh>
      </group>

      {/* the carousel platform: spokes, rail and the loop's own story, all
          turning together — a real ride, not a diagram bolted to a pole */}
      <group ref={spinRef} position={[0, TIER_Y, 0]}>
        <instancedMesh ref={spokeRef} args={[SPOKE_GEO, SPOKE_MAT, SPOKE_COUNT]} frustumCulled={false} />
        <mesh rotation={[Math.PI / 2, 0, 0]} material={RAIL_MAT} geometry={RAIL_GEO} />

        <instancedMesh ref={orbRef} args={[ORB_GEO, orbMat, N]} frustumCulled={false} />
        <lineSegments ref={edgeGeoRef} geometry={edgeGeo} material={edgeMat} frustumCulled={false} />
        <lineSegments ref={ringGeoRef} geometry={ringGeo} material={ringMat} frustumCulled={false} />
        <mesh ref={triRef} geometry={triGeo} material={triMat} frustumCulled={false} />
      </group>
    </group>
  );
}
