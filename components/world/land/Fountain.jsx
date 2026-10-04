"use client";

// THE FOUNTAIN OF IMMORTALITY (open2c/polychrom #79, place pr-polychrom-79): a stone basin on the south shore
// whose revival fluid is thrown up as a twisted double helix of glowing beads, ending in two linked rings (a
// Hopf link) that turn slowly. From the basin a glowing green stream runs across the island to a stone pad on
// the NVIDIA moat's south bank (lib/world/land.js FOUNTAIN_STREAM): the island's fast travel, armed once the
// arrival has played. A green swoosh marks each throw.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Group, Points, PointsMaterial, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, ShaderMaterial, TorusGeometry, Vector3 } from "three";
import { FOUNTAIN_STREAM, FOUNTAIN_TRAVEL } from "../../../lib/world/land";
import { PLACE_BY_ID } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { FUTURE_Z } from "../../../lib/world/land";
import { PLATEAU, heightAt } from "../../../lib/world/terrain";
import { C, mat } from "../palette";

const PLACE = PLACE_BY_ID["pr-polychrom-79"];
const [A, B] = FOUNTAIN_TRAVEL.nodes;
const TOP = PLATEAU.top;
const GOLD = "#ffc933";
const BEADS = 72;
const CLOUDS = [[16, 0.9, 0.55, 60], [26, 0.8, 0.8, 44], [38, 0.7, 1.0, 30]]; // size, opacity, drift, count per layer
const STEPS = 8;
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
    const y = heightAt(p.x, p.z) + 0.16;
    for (const s of [-1, 1]) {
      pos.push(p.x - t.z * 1.7 * s, y, p.z + t.x * 1.7 * s);
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

// layered cloud banks: soft radial puffs on Points, three depths drifting at different speeds
function puffTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.5, "rgba(255,255,255,0.45)");
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
      pos[i * 3 + 1] = 1 + hash(i, L + 20) * 7 + L * 1.5;
      pos[i * 3 + 2] = FUTURE_Z + 3 + L * 4 + hash(i, L + 30) * 20;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    const pts = new Points(g, new PointsMaterial({ map, size, color: ["#d9e4fb", "#c8d3f3", "#e6dcf7"][L], transparent: true, opacity: Math.min(1, opacity * 0.95), depthWrite: false, sizeAttenuation: true }));
    pts.frustumCulled = false;
    group.add(pts);
  });
  // low mist hugging the plateau's skirt
  const mist = new Float32Array(30 * 3);
  for (let i = 0; i < 30; i++) {
    const a = hash(i, 40) * 6.283;
    const r = 5 + hash(i, 41) * 6;
    mist.set([PLATEAU.x + Math.cos(a) * r, 0.5 + hash(i, 42) * 1.3, PLATEAU.z + Math.sin(a) * r], i * 3);
  }
  const mg = new BufferGeometry();
  mg.setAttribute("position", new Float32BufferAttribute(mist, 3));
  const mp = new Points(mg, new PointsMaterial({ map, size: 6, color: "#e8fff2", transparent: true, opacity: 0.35, depthWrite: false }));
  mp.frustumCulled = false;
  mp.userData.still = true;
  group.add(mp);
  return group;
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
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float across = abs(vUv.y * 2.0 - 1.0);
        float edge = 1.0 - smoothstep(0.78, 1.0, across);
        vec2 q = vec2(vUv.x * 0.45, vUv.y * 5.0);
        // glacier ice: pale blue-white, deeper blue in the troughs, crevasses as dark fissures slanting across the flow
        float body = n(q * 1.3 + 3.0) * 0.6 + n(q * 3.1) * 0.4;
        vec3 col = mix(vec3(0.62, 0.84, 0.96), vec3(0.93, 0.98, 1.0), body);
        float c = abs(n(vec2(vUv.x * 0.28 + vUv.y * 1.6, vUv.y * 2.2)) - 0.5);
        float crev = (1.0 - smoothstep(0.0, 0.035, c)) * smoothstep(0.1, 0.4, n(vec2(vUv.x * 0.07, 9.0)));
        col = mix(col, vec3(0.12, 0.36, 0.62), crev * 0.85);
        // the faint revival glow under the ice, slowly running toward the moat
        float glow = pow(0.5 + 0.5 * sin(vUv.x * 0.9 - uTime * 1.6), 3.0) * (1.0 - across);
        col += vec3(0.05, 0.55, 0.28) * glow * 0.35;
        gl_FragColor = vec4(col, edge * 0.9);
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
    for (let i = 0; i < BEADS * 2; i++) bead.setColorAt(i, new Color(i < BEADS ? "#ffcf3a" : "#fff1b8"));
    const spark = new InstancedMesh(new OctahedronGeometry(1, 0).scale(0.4, 1, 0.4), new MeshBasicMaterial({ color: "#d8ffe8", toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false }), SPARKS);
    bead.frustumCulled = spark.frustumCulled = false;
    const posts = new InstancedMesh(new CylinderGeometry(0.12, 0.16, 0.9, 8), mat(GOLD, { roughness: 0.3, metalness: 0.8 }), 24);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      D.position.set(PLACE.x + Math.cos(a) * 6.0, TOP + 0.45, PLACE.z + Math.sin(a) * 6.0);
      D.rotation.set(0, 0, 0);
      D.scale.setScalar(1);
      D.updateMatrix();
      posts.setMatrixAt(i, D.matrix);
    }
    return {
      posts,
      bead,
      spark,
      stream: streamGeometry(),
      streamM: streamMaterial(),
            lipG: new CylinderGeometry(0.95, 0.95, 0.12, 20),
      poolG: new CylinderGeometry(0.85, 0.85, 0.04, 20),
      fluid: new MeshBasicMaterial({ color: "#2bff88", toneMapped: false }),
      padG: new CylinderGeometry(1.5, 1.7, 0.3, 12),
      padDiscG: new CylinderGeometry(1.15, 1.15, 0.04, 20),
      ringG: new TorusGeometry(0.5, 0.07, 8, 40),
      ringM: new MeshBasicMaterial({ color: "#ffd24a", toneMapped: false }),
      tierG: [3.0, 2.2, 1.5, 0.9].map((r) => new CylinderGeometry(r, r + 0.2, 0.5, 20)),
      discG: new CylinderGeometry(6.3, 6.5, 0.2, 40),
      goldRingG: new TorusGeometry(6.0, 0.1, 6, 64).rotateX(Math.PI / 2),
      stepG: new BoxGeometry(1.5, 0.12, 1.1),
      clouds: cloudLayers(),
      gold: mat(GOLD, { roughness: 0.25, metalness: 0.9, emissive: "#6b4a00", emissiveIntensity: 0.4 }),
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
      for (const x of [...m.tierG, m.discG, m.goldRingG, m.stepG, m.stream, m.lipG, m.poolG, m.padG, m.padDiscG, m.ringG, m.burstG]) x.dispose();
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
      D.position.set(PLACE.x + Math.cos(a) * r, TOP + 1.7 + k * 2.6, PLACE.z + Math.sin(a) * r);
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
      <mesh geometry={m.stream} material={m.streamM} renderOrder={2} frustumCulled={false} />
      <group position={[PLACE.x, TOP, PLACE.z]} scale={1.45}>
        <mesh geometry={m.discG} material={mat("#f4efe2", { roughness: 0.8 })} position={[0, 0.02, 0]} />
        <mesh geometry={m.goldRingG} material={m.gold} position={[0, 0.14, 0]} />
        {m.tierG.map((g, n) => (
          <mesh key={n} geometry={g} material={n % 2 ? m.gold : m.white} position={[0, 0.3 + n * 0.45, 0]} />
        ))}
        <mesh geometry={m.poolG} material={m.fluid} position={[0, 1.95, 0]} />
        <mesh geometry={m.lipG} material={m.gold} position={[0, 1.85, 0]} />
        <group ref={hopf} position={[0, 2.95, 0]}>
          <mesh geometry={m.ringG} material={m.ringM} />
          <mesh geometry={m.ringG} material={m.ringM} position={[0.5, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      </group>
      {Array.from({ length: STEPS }, (_, n) => {
        const x = PLACE.x + PLATEAU.flat - 0.4 + n * ((PLATEAU.edge - PLATEAU.flat + 0.8) / STEPS);
        return <mesh key={n} geometry={m.stepG} material={n % 2 ? m.white : m.gold} position={[x, heightAt(x, PLACE.z) + 0.08, PLACE.z]} rotation={[0, 0, Math.atan2(heightAt(x + 0.4, PLACE.z) - heightAt(x - 0.4, PLACE.z), 0.8)]} />;
      })}
      <primitive object={m.clouds} />
      <primitive object={m.posts} />
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
