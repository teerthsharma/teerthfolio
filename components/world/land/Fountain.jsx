"use client";

// THE FOUNTAIN OF IMMORTALITY (open2c/polychrom #79, place pr-polychrom-79): a stone basin on the south shore
// whose revival fluid is thrown up as a twisted double helix of glowing beads, ending in two linked rings (a
// Hopf link) that turn slowly. From the basin a glowing green stream runs across the island to a stone pad on
// the NVIDIA moat's south bank (lib/world/land.js FOUNTAIN_STREAM): the island's fast travel, armed once the
// arrival has played. A green swoosh marks each throw.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferGeometry, CanvasTexture, CircleGeometry, Group, Points, PointsMaterial, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, TubeGeometry, Object3D, OctahedronGeometry, ShaderMaterial, TorusGeometry, Vector3, TetrahedronGeometry } from "three";
import { FOUNTAIN_TRAVEL } from "../../../lib/world/land";
import { PEAK } from "../../../lib/world/peak";
import { streamMaterial } from "./parts/moat-uphill";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { FUTURE_Z } from "../../../lib/world/land";
import { heightAt } from "../../../lib/world/terrain";
import { C, mat } from "../palette";

const PLACE = PLACE_BY_ID["pr-polychrom-79"];
const [A, B] = FOUNTAIN_TRAVEL.nodes;
const TOP = PEAK.top;
const GOLD = "#ffc933";
const LEAF = "#d9a441"; // gold leaf
const RADIATION = "#2bdc8a";
const BEADS = 72;
const HELIX = 3.4; // the helix rises above the basin
const CLOUDS = [[16, 0.9, 0.55, 90], [26, 0.8, 0.8, 44], [38, 0.7, 1.0, 30]]; // size, opacity, drift, count per layer
const MOTES = 40;
const LANTERNS = ["#ff9ec7", "#ffe27a"];
const SPARKS = 28;
const D = new Object3D();
const hash = (i, k) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

// the spout: a short rill of basin water from the deck's east rim down the foot to the spring pool (moat streamMaterial attributes)
function rillGeometry() {
  const a = [PEAK.x + PEAK.flat - 0.6, PEAK.z + 0.2];
  const b = [PEAK.x + 16.5, PEAK.z - 3.5];
  const n = 24;
  const pos = [];
  const L = [];
  const X = [];
  const G = [];
  const idx = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const x = a[0] + (b[0] - a[0]) * k;
    const z = a[1] + (b[1] - a[1]) * k;
    const h = (Math.hypot(x - PEAK.x, z - PEAK.z) <= PEAK.flat ? PEAK.top : Math.max(heightAt(x, z), 0)) + 0.12;
    for (const w of [-0.6, 0.6]) {
      pos.push(x, h, z + w * 0.4 + w);
      L.push(i * 0.6);
      X.push(w / 0.6);
      G.push(k);
    }
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("aLen", new Float32BufferAttribute(L, 1));
  g.setAttribute("aAcross", new Float32BufferAttribute(X, 1));
  g.setAttribute("aAlong", new Float32BufferAttribute(G, 1));
  g.setIndex(idx);
  return g;
}
// the basin's water: a disc with the same attributes (green at the middle)
function basinWater() {
  const g = new CircleGeometry(0.85, 24).rotateX(-Math.PI / 2);
  const n = g.attributes.position.count;
  const L = new Float32Array(n);
  const X = new Float32Array(n);
  const G = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(g.attributes.position.getX(i), g.attributes.position.getZ(i)) / 0.85;
    L[i] = r * 3;
    X[i] = r;
    G[i] = 1 - r * 0.5;
  }
  g.setAttribute("aLen", new Float32BufferAttribute(L, 1));
  g.setAttribute("aAcross", new Float32BufferAttribute(X, 1));
  g.setAttribute("aAlong", new Float32BufferAttribute(G, 1));
  return g;
}
// layered cloud banks: soft radial puffs on Points, three depths drifting at different speeds
function puffTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.5, "rgba(255,255,255,0.85)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}
function cloudLayers() {
  const map = puffTexture();
  const group = new Group();
  CLOUDS.forEach(([size, opacity, , count], L) => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (hash(i, L + 10) - 0.5) * 150;
      pos[i * 3 + 1] = (L === 0 ? 0.5 + hash(i, L + 20) * 4.5 : 1 + hash(i, L + 20) * 7) + L * 1.5;
      pos[i * 3 + 2] = FUTURE_Z + 3 + L * 4 + hash(i, L + 30) * 20;
      const e = Math.min(1, Math.max(0, (Math.abs(pos[i * 3] - PEAK.x) - 22) / 16));
      pos[i * 3 + 2] += 30 * (1 - e * e * (3 - 2 * e));
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    const pts = new Points(g, new PointsMaterial({ map, size, color: ["#ffffff", "#ffd6e8", "#c7d2fe"][L], transparent: true, opacity: Math.min(1, opacity * 0.95), depthWrite: false, sizeAttenuation: true }));
    pts.frustumCulled = false;
    group.add(pts);
  });
  // mist drifting round the peak's base, and a halo at the summit
  const mist = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i++) {
    const a = hash(i, 40) * 6.283;
    const halo = i >= 60;
    const r = halo ? 2 + hash(i, 41) * 3 : PEAK.edge - 3 + hash(i, 41) * 6;
    mist.set([PEAK.x + Math.cos(a) * r, halo ? TOP + 0.5 + hash(i, 42) * 2 : 0.3 + hash(i, 42) * 1.2, PEAK.z + Math.sin(a) * r], i * 3);
  }
  const mg = new BufferGeometry();
  mg.setAttribute("position", new Float32BufferAttribute(mist, 3));
  const mp = new Points(mg, new PointsMaterial({ map, size: 4, color: "#fff1c8", transparent: true, opacity: 0.4, depthWrite: false }));
  mp.frustumCulled = false;
  mp.userData.still = true;
  group.add(mp);
  return group;
}

// the wooden "NEW AREA SOON" board, standing at the cloud bank's edge
function signTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 144;
  const g = c.getContext("2d");
  g.fillStyle = "#fde68a";
  g.fillRect(0, 0, 512, 144);
  g.fillStyle = "#1f2937";
  g.font = "800 58px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("NEW AREA SOON", 256, 74);
  return new CanvasTexture(c);
}

export default function Fountain() {
  const beads = useRef();
  const sparks = useRef();
  const hopf = useRef();
  const lanterns = useRef([]);
  const bursts = useRef([]);
  const lastThrow = useRef(-100);

  const m = useMemo(() => {
    const bead = new InstancedMesh(new IcosahedronGeometry(0.22, 1), new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), BEADS * 2);
    for (let i = 0; i < BEADS * 2; i++) bead.setColorAt(i, new Color(i < BEADS ? "#ffcf3a" : "#fff1b8"));
    const spark = new InstancedMesh(new OctahedronGeometry(1, 0).scale(0.4, 1, 0.4), new MeshBasicMaterial({ color: "#d8ffe8", toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false }), SPARKS);
    bead.frustumCulled = spark.frustumCulled = false;
    // a tri-spiral inlay, three Archimedean arms
    const arms = [0, 1, 2].map((k) => new TubeGeometry(new CatmullRomCurve3(Array.from({ length: 60 }, (_, n) => {
      const a = (n / 59) * Math.PI * 2.5 + (k * Math.PI * 2) / 3;
      const r = 0.6 + (n / 59) * 3.3;
      return new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    })), 90, 0.06, 5));
    // the glowing motes rising from the basin
    const moteG = new BufferGeometry();
    moteG.setAttribute("position", new Float32BufferAttribute(new Float32Array(MOTES * 3), 3));
    const motes = new Points(moteG, new PointsMaterial({ color: GOLD, size: 0.25, transparent: true, blending: AdditiveBlending, depthWrite: false }));
    motes.frustumCulled = false;
    return {
      arms,
      motes,
      bead,
      spark,
      sign: signTexture(),
      rill: rillGeometry(),
      water: basinWater(),
      beam: new CylinderGeometry(0.2, 1.0, 9, 16, 1, true),
      beamM: new MeshBasicMaterial({ color: "#ffd24a", transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }),
      streamM: streamMaterial(RADIATION),
            lipG: new CylinderGeometry(0.95, 0.95, 0.12, 20),
      fluid: new MeshBasicMaterial({ color: "#2bff88", toneMapped: false }),
      padG: new CylinderGeometry(1.5, 1.7, 0.3, 12),
      padDiscG: new CylinderGeometry(1.15, 1.15, 0.04, 20),
      ringG: new TorusGeometry(0.5, 0.175, 8, 40),
      ringM: new MeshBasicMaterial({ color: "#ffd24a", toneMapped: false }),
      tierG: [3.0, 2.2, 1.5, 0.9].map((r) => new CylinderGeometry(r, r + 0.2, 0.5, 20)),
      clouds: cloudLayers(),
      gold: mat(LEAF, { roughness: 0.25, metalness: 0.9, envMapIntensity: 1.5, emissive: "#6b4a00", emissiveIntensity: 0.4 }),
      slate: mat("#3b3f63", { roughness: 0.95, flatShading: true, side: DoubleSide }),
      inlay: mat(GOLD, { roughness: 0.3, metalness: 0.9, emissive: GOLD, emissiveIntensity: 0.4 }),
      white: mat("#f6f3ea", { roughness: 0.7 }),
      burstG: new TorusGeometry(1, 0.06, 6, 36).rotateX(Math.PI / 2),
      burstM: new MeshBasicMaterial({ color: "#5dffb4", toneMapped: false, transparent: true, depthWrite: false }),
    };
  }, []);

  useEffect(
    () => () => {
      for (const o of [m.bead, m.spark]) {
        o.geometry.dispose();
        o.material.dispose();
        o.dispose();
      }
      for (const x of [...m.tierG, ...m.arms, m.sign, m.rill, m.water, m.beam, m.motes.geometry, m.lipG, m.padG, m.padDiscG, m.ringG, m.burstG]) x.dispose();
      m.motes.material.dispose();
      for (const x of [m.streamM, m.fluid, m.ringM, m.burstM, m.beamM]) x.dispose();
    },
    [m],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    m.streamM.uniforms.uTime.value = t;
    // the helix: two strands twisting up from the basin
    for (let i = 0; i < BEADS * 2; i++) {
      const strand = i < BEADS ? 0 : 1;
      const k = (i % BEADS) / BEADS;
      const a = t * 1.1 + k * Math.PI * 5 + strand * Math.PI;
      const r = 0.7 * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, k * 1.15)));
      D.position.set(PLACE.x + Math.cos(a) * r, TOP + 2.4 + k * HELIX, PLACE.z + Math.sin(a) * r);
      D.scale.setScalar(0.75 + 0.5 * Math.sin(((k + t * 0.15) % 1) * Math.PI));
      D.rotation.set(0, 0, 0);
      D.updateMatrix();
      beads.current.setMatrixAt(i, D.matrix);
    }
    beads.current.instanceMatrix.needsUpdate = true;
    // sparkles rising off the basin
    for (let i = 0; i < SPARKS; i++) {
      const life = (t * (0.18 + 0.1 * hash(i, 1)) + hash(i, 2)) % 1;
      const a = hash(i, 3) * Math.PI * 2;
      const r = 0.3 + 1.3 * hash(i, 4);
      D.position.set(PLACE.x + Math.cos(a + t * 0.3) * r, TOP + 0.9 + life * 3.6, PLACE.z + Math.sin(a + t * 0.3) * r);
      D.scale.setScalar(0.07 * Math.sin(life * Math.PI) + 0.001);
      D.rotation.set(0, t + i, 0);
      D.updateMatrix();
      sparks.current.setMatrixAt(i, D.matrix);
    }
    sparks.current.instanceMatrix.needsUpdate = true;
    const mp = m.motes.geometry.attributes.position;
    for (let i = 0; i < MOTES; i++) {
      const life = (t / 6 + hash(i, 5)) % 1;
      const a = hash(i, 6) * Math.PI * 2 + t * 0.2;
      const r = 0.2 + 1.6 * hash(i, 8);
      mp.setXYZ(i, PLACE.x + Math.cos(a) * r, TOP + 1.9 + life * 3.4, PLACE.z + Math.sin(a) * r);
    }
    mp.needsUpdate = true;
    lanterns.current.forEach((l, n) => l && (l.position.y = 2.6 + Math.sin(t * 1.3 + n * 1.1) * 0.25));
    hopf.current.rotation.y = t * 0.6;
    m.clouds.children.forEach((c, L) => c.userData.still || (c.position.x = Math.sin(t * 0.05 * CLOUDS[L][2] + L) * 5));
    // the swoosh: a green ring opens at the end the seal left, then at the end it landed, on each throw
    const s = live.seal;
    if (s.fnAt !== undefined && s.fnAt !== lastThrow.current) lastThrow.current = s.fnAt;
    for (let n = 0; n < 2; n++) {
      const node = n === 0 ? A : B;
      const from = s.fnFrom === (n === 0 ? 0 : 1);
      const since = t - lastThrow.current - (from ? 0 : FOUNTAIN_TRAVEL.flight);
      const ring = bursts.current[n];
      if (!ring) continue;
      const k = since >= 0 && since < 0.8 ? since / 0.8 : -1;
      ring.visible = k >= 0;
      if (k >= 0) {
        ring.position.set(node.x, heightAt(node.x, node.z) + 0.4 + k * 1.2, node.z);
        ring.scale.setScalar(1 + k * 3);
        ring.material.opacity = 1 - k;
      }
    }
  });

  const pad = [B.x, heightAt(B.x, B.z), B.z];
  return (
    <>
      <mesh geometry={m.rill} material={m.streamM} renderOrder={2} frustumCulled={false} />
      <mesh geometry={m.beam} material={m.beamM} position={[PLACE.x, TOP + 4.5, PLACE.z]} frustumCulled={false} />
      <group position={[PLACE.x, TOP, PLACE.z]} scale={0.9}>
        {m.arms.map((g, n) => <mesh key={n} geometry={g} material={m.inlay} position={[0, 0.16, 0]} />)}
        {m.tierG.map((g, n) => (
          <mesh key={n} geometry={g} material={n % 2 ? m.gold : m.white} position={[0, 0.3 + n * 0.45, 0]} />
        ))}
        <mesh geometry={m.water} material={m.streamM} position={[0, 1.97, 0]} renderOrder={2} />
        <mesh geometry={m.lipG} material={m.gold} position={[0, 1.85, 0]} />
        <group ref={hopf} position={[0, 2.95, 0]}>
          <mesh geometry={m.ringG} material={m.ringM} />
          <mesh geometry={m.ringG} material={m.ringM} position={[0.5, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      </group>
      <pointLight color="#ffd24a" intensity={6} distance={26} position={[PLACE.x, TOP + 3, PLACE.z]} />
      <primitive object={m.motes} />
      <primitive object={m.clouds} />
      <group position={[-12, 0, 67.5]}>
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} position={[x, 1.1, 0]}>
            <boxGeometry args={[0.2, 2.2, 0.2]} />
            <meshStandardMaterial color="#8b5e34" roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 1.9, 0.1]}>
          <boxGeometry args={[3.2, 0.9, 0.12]} />
          <meshBasicMaterial map={m.sign} toneMapped={false} />
        </mesh>
      </group>
      {Array.from({ length: 6 }, (_, n) => (
        <mesh key={n} ref={(r) => (lanterns.current[n] = r)} position={[-20 + n * 5.6, 2.6, 68]}>
          <sphereGeometry args={[0.35, 10, 8]} />
          <meshBasicMaterial color={LANTERNS[n % 2]} toneMapped={false} />
        </mesh>
      ))}
      <primitive ref={beads} object={m.bead} />
      <primitive ref={sparks} object={m.spark} />
      <group position={pad}>
        <mesh geometry={m.padG} material={mat(C.charcoal, { roughness: 0.9 })} position={[0, 0.15, 0]} />
        <mesh geometry={m.padDiscG} material={m.fluid} position={[0, 0.32, 0]} />
      </group>
      {[0, 1].map((n) => (
        <mesh key={n} ref={(r) => (bursts.current[n] = r)} geometry={m.burstG} material={m.burstM.clone()} visible={false} />
      ))}
    </>
  );
}
