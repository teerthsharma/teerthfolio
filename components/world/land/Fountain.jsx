"use client";

// THE FOUNTAIN OF IMMORTALITY (open2c/polychrom #79, place pr-polychrom-79): a stone basin on the south shore
// whose revival fluid is thrown up as a twisted double helix of glowing beads, ending in two linked rings (a
// Hopf link) that turn slowly. From the basin a glowing green stream runs across the island to a stone pad on
// the NVIDIA moat's south bank (lib/world/land.js FOUNTAIN_STREAM): the island's fast travel, armed once the
// arrival has played. A green swoosh marks each throw.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, ShaderMaterial, TorusGeometry, Vector3 } from "three";
import { FOUNTAIN_STREAM, FOUNTAIN_TRAVEL } from "../../../lib/world/land";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { heightAt } from "../../../lib/world/terrain";
import { C, mat } from "../palette";

const PLACE = PLACE_BY_ID["pr-polychrom-79"];
const [A, B] = FOUNTAIN_TRAVEL.nodes;
const BEADS = 72;
const SPARKS = 28;
const D = new Object3D();
const hash = (i, k) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

// the stream: a flat ribbon on the snow, chevrons of light running toward the moat
function streamGeometry() {
  const curve = new CatmullRomCurve3(FOUNTAIN_STREAM.map(([x, z]) => new Vector3(x, 0, z)), false, "centripetal");
  const n = 240;
  const pos = [];
  const uv = [];
  const idx = [];
  const p = new Vector3();
  const t = new Vector3();
  let run = 0;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    curve.getPointAt(i / n, p);
    curve.getTangentAt(i / n, t);
    if (prev) run += p.distanceTo(prev);
    prev = prev ? prev.copy(p) : p.clone();
    const y = heightAt(p.x, p.z) + 0.05;
    for (const s of [-1, 1]) {
      pos.push(p.x - t.z * 0.6 * s, y, p.z + t.x * 0.6 * s);
      uv.push(run, (s + 1) / 2);
    }
    if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function streamMaterial() {
  return new ShaderMaterial({
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float across = abs(vUv.y * 2.0 - 1.0);
        float edge = 1.0 - smoothstep(0.55, 1.0, across);
        float chevron = 0.5 + 0.5 * sin((vUv.x - across * 0.8) * 2.4 - uTime * 3.0);
        vec3 col = mix(vec3(0.1, 0.9, 0.45), vec3(0.6, 1.0, 0.85), chevron * 0.7);
        gl_FragColor = vec4(col, edge * (0.55 + 0.35 * chevron));
      }`,
  });
}

export default function Fountain() {
  const beads = useRef();
  const sparks = useRef();
  const hopf = useRef();
  const bursts = useRef([]);
  const lastThrow = useRef(-100);

  const m = useMemo(() => {
    const bead = new InstancedMesh(new IcosahedronGeometry(0.09, 1), new MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), BEADS * 2);
    for (let i = 0; i < BEADS * 2; i++) bead.setColorAt(i, new Color(i < BEADS ? "#27ff7a" : "#25e8ff"));
    const spark = new InstancedMesh(new OctahedronGeometry(1, 0).scale(0.4, 1, 0.4), new MeshBasicMaterial({ color: "#d8ffe8", toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false }), SPARKS);
    bead.frustumCulled = spark.frustumCulled = false;
    return {
      bead,
      spark,
      stream: streamGeometry(),
      streamM: streamMaterial(),
      basinG: new CylinderGeometry(1.45, 1.75, 0.7, 12, 1, true),
      lipG: new CylinderGeometry(1.5, 1.5, 0.14, 12),
      poolG: new CylinderGeometry(1.32, 1.32, 0.04, 20),
      fluid: new MeshBasicMaterial({ color: "#2bff88", toneMapped: false }),
      padG: new CylinderGeometry(1.5, 1.7, 0.3, 12),
      padDiscG: new CylinderGeometry(1.15, 1.15, 0.04, 20),
      ringG: new TorusGeometry(0.42, 0.05, 8, 40),
      ringM: new MeshBasicMaterial({ color: "#3dffa0", toneMapped: false }),
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
      for (const x of [m.stream, m.basinG, m.lipG, m.poolG, m.padG, m.padDiscG, m.ringG, m.burstG]) x.dispose();
      for (const x of [m.streamM, m.fluid, m.ringM, m.burstM]) x.dispose();
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
      const r = 0.38 * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, k * 1.15)));
      D.position.set(PLACE.x + Math.cos(a) * r, 0.7 + k * 2.6, PLACE.z + Math.sin(a) * r);
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
      D.position.set(PLACE.x + Math.cos(a + t * 0.3) * r, 0.7 + life * 3.2, PLACE.z + Math.sin(a + t * 0.3) * r);
      D.scale.setScalar(0.07 * Math.sin(life * Math.PI) + 0.001);
      D.rotation.set(0, t + i, 0);
      D.updateMatrix();
      sparks.current.setMatrixAt(i, D.matrix);
    }
    sparks.current.instanceMatrix.needsUpdate = true;
    hopf.current.rotation.y = t * 0.6;
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
      <mesh geometry={m.stream} material={m.streamM} renderOrder={2} frustumCulled={false} />
      <group position={[PLACE.x, 0, PLACE.z]}>
        <mesh geometry={m.basinG} material={mat("#8fa6a8", { roughness: 0.9 })} position={[0, 0.35, 0]} />
        <mesh geometry={m.lipG} material={mat("#b9c9c2", { roughness: 0.9 })} position={[0, 0.7, 0]} />
        <mesh geometry={m.poolG} material={m.fluid} position={[0, 0.66, 0]} />
        <group ref={hopf} position={[0, 3.55, 0]}>
          <mesh geometry={m.ringG} material={m.ringM} />
          <mesh geometry={m.ringG} material={m.ringM} position={[0.42, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      </group>
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
