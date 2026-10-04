"use client";

// THE FOUNTAIN OF IMMORTALITY (open2c/polychrom #79, place pr-polychrom-79): a stone basin on the south shore
// whose revival fluid is thrown up as a twisted double helix of glowing beads, ending in two linked rings (a
// Hopf link) that turn slowly. From the basin a glowing green stream runs across the island to a stone pad on
// the NVIDIA moat's south bank (lib/world/land.js FOUNTAIN_STREAM): the island's fast travel, armed once the
// arrival has played. A green swoosh marks each throw.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Group, Points, PointsMaterial, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, TubeGeometry, Object3D, OctahedronGeometry, ShaderMaterial, TorusGeometry, Vector3, TetrahedronGeometry } from "three";
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
const CLOUDS = [[16, 0.9, 0.55, 90], [26, 0.8, 0.8, 44], [38, 0.7, 1.0, 30]]; // size, opacity, drift, count per layer
const STEPS = 8;
const MOTES = 40;
const LANTERNS = ["#ff9ec7", "#ffe27a"];
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
      pos.push(p.x - t.z * 2.2 * s, y, p.z + t.x * 2.2 * s);
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

// the banks: a white snow lip dropping 0.5 m outside each edge, and 30 ice seracs along them
function bankGeometry() {
  const curve = new CatmullRomCurve3(FOUNTAIN_STREAM.map(([x, z]) => new Vector3(x, 0, z)), false, "centripetal");
  const n = 120;
  const pos = [];
  const idx = [];
  const p = new Vector3();
  const t = new Vector3();
  for (let i = 0; i <= n; i++) {
    curve.getPointAt(i / n, p);
    curve.getTangentAt(i / n, t);
    const y = heightAt(p.x, p.z) + 0.16;
    for (const s of [-1, 1]) for (const [o, dy] of [[2.2, 0], [2.5, -0.5]]) pos.push(p.x - t.z * o * s, y + dy, p.z + t.x * o * s);
    if (i < n) for (const k of [0, 2]) idx.push(i * 4 + k, i * 4 + k + 1, i * 4 + k + 4, i * 4 + k + 1, i * 4 + k + 5, i * 4 + k + 4);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function seracs() {
  const curve = new CatmullRomCurve3(FOUNTAIN_STREAM.map(([x, z]) => new Vector3(x, 0, z)), false, "centripetal");
  const mesh = new InstancedMesh(new TetrahedronGeometry(0.6), mat("#bfe3ff", { roughness: 0.3, flatShading: true }), 30);
  const p = new Vector3();
  const t = new Vector3();
  for (let i = 0; i < 30; i++) {
    const u = (i + 0.5) / 30;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    const s = i % 2 ? 1 : -1;
    const x = p.x - t.z * 2.6 * s;
    const z = p.z + t.x * 2.6 * s;
    D.position.set(x, heightAt(x, z) + 0.2, z);
    D.rotation.set(hash(i, 1), hash(i, 2) * 6, 0);
    D.scale.setScalar(0.7 + hash(i, 3) * 0.9);
    D.updateMatrix();
    mesh.setMatrixAt(i, D.matrix);
  }
  mesh.frustumCulled = false;
  return mesh;
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
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    const pts = new Points(g, new PointsMaterial({ map, size, color: ["#ffffff", "#ffd6e8", "#c7d2fe"][L], transparent: true, opacity: Math.min(1, opacity * 0.95), depthWrite: false, sizeAttenuation: true }));
    pts.frustumCulled = false;
    group.add(pts);
  });
  // low mist hugging the plateau's skirt
  const mist = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i++) {
    const a = hash(i, 40) * 6.283;
    const r = 5 + hash(i, 41) * 6;
    mist.set([PLATEAU.x + Math.cos(a) * r, 0.3 + hash(i, 42) * 2.7, PLATEAU.z + Math.sin(a) * r], i * 3);
  }
  const mg = new BufferGeometry();
  mg.setAttribute("position", new Float32BufferAttribute(mist, 3));
  const mp = new Points(mg, new PointsMaterial({ map, size: 9, color: "#c9b8ff", transparent: true, opacity: 0.55, depthWrite: false }));
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
        vec3 col = mix(vec3(0.28, 0.60, 0.92), vec3(0.78, 0.92, 1.0), body);
        float c = abs(n(vec2(vUv.x * 0.28 + vUv.y * 1.6, vUv.y * 2.2)) - 0.5);
        float crev = (1.0 - smoothstep(0.0, 0.035, c)) * smoothstep(0.1, 0.4, n(vec2(vUv.x * 0.07, 9.0)));
        col = mix(col, vec3(0.12, 0.36, 0.62), crev * 1.0);
        // the faint revival glow under the ice, slowly running toward the moat
        float glow = pow(0.5 + 0.5 * sin(vUv.x * 0.9 - uTime * 1.6), 3.0) * (1.0 - across);
        col += vec3(0.05, 0.55, 0.28) * glow * 0.8;
        gl_FragColor = vec4(col, edge * 0.9);
      }`,
  });
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
    const posts = new InstancedMesh(new BoxGeometry(0.4, 2.2, 0.4), mat("#f7f4ff", { roughness: 0.5 }), 8);
    const tips = new InstancedMesh(new OctahedronGeometry(0.34, 0).scale(1, 1.6, 1), new MeshBasicMaterial({ color: "#ffe27a", toneMapped: false }), 8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      D.rotation.set(0, 0, 0);
      D.scale.setScalar(1);
      D.position.set(PLACE.x + Math.cos(a) * 6.0, TOP + 1.1, PLACE.z + Math.sin(a) * 6.0);
      D.updateMatrix();
      posts.setMatrixAt(i, D.matrix);
      D.position.y = TOP + 2.65;
      D.updateMatrix();
      tips.setMatrixAt(i, D.matrix);
    }
    // the cliff skirt: dark slate-violet rock, jittered, under the plateau's rim
    const skirt = new CylinderGeometry(6.6, 8.2, TOP, 14, 3, true);
    const sp = skirt.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i);
      const z = sp.getZ(i);
      const r = Math.hypot(x, z) || 1;
      const j = 1 + (hash(i, 7) * 0.5) / r;
      sp.setXYZ(i, x * j, sp.getY(i), z * j);
    }
    skirt.computeVertexNormals();
    // a tri-spiral inlay, three Archimedean arms
    const arms = [0, 1, 2].map((k) => new TubeGeometry(new CatmullRomCurve3(Array.from({ length: 60 }, (_, n) => {
      const a = (n / 59) * Math.PI * 2.5 + (k * Math.PI * 2) / 3;
      const r = 0.6 + (n / 59) * 5;
      return new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    })), 90, 0.06, 5));
    // the glowing motes rising from the basin
    const moteG = new BufferGeometry();
    moteG.setAttribute("position", new Float32BufferAttribute(new Float32Array(MOTES * 3), 3));
    const motes = new Points(moteG, new PointsMaterial({ color: GOLD, size: 0.25, transparent: true, blending: AdditiveBlending, depthWrite: false }));
    motes.frustumCulled = false;
    return {
      posts,
      tips,
      skirt,
      arms,
      motes,
      bead,
      spark,
      sign: signTexture(),
      stream: streamGeometry(),
      bank: bankGeometry(),
      bankM: new MeshBasicMaterial({ color: "#ffffff", side: DoubleSide }),
      seracs: seracs(),
      streamM: streamMaterial(),
            lipG: new CylinderGeometry(0.95, 0.95, 0.12, 20),
      poolG: new CylinderGeometry(0.85, 0.85, 0.04, 20),
      fluid: new MeshBasicMaterial({ color: "#2bff88", toneMapped: false }),
      padG: new CylinderGeometry(1.5, 1.7, 0.3, 12),
      padDiscG: new CylinderGeometry(1.15, 1.15, 0.04, 20),
      ringG: new TorusGeometry(0.5, 0.175, 8, 40),
      ringM: new MeshBasicMaterial({ color: "#ffd24a", toneMapped: false }),
      tierG: [3.0, 2.2, 1.5, 0.9].map((r) => new CylinderGeometry(r, r + 0.2, 0.5, 20)),
      discG: new CylinderGeometry(6.3, 6.5, 0.2, 40),
      stairG: new BoxGeometry(2, 0.62, 0.5),
      goldRingG: new TorusGeometry(6.0, 0.1, 6, 64).rotateX(Math.PI / 2),
      stepG: new BoxGeometry(1.5, 0.12, 1.1),
      clouds: cloudLayers(),
      gold: mat(GOLD, { roughness: 0.25, metalness: 0.9, envMapIntensity: 1.5, emissive: "#6b4a00", emissiveIntensity: 0.4 }),
      slate: mat("#3b3f63", { roughness: 0.95, flatShading: true, side: DoubleSide }),
      marble: mat("#f7f4ff", { roughness: 0.35 }),
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
      for (const x of [...m.tierG, ...m.arms, m.skirt, m.stairG, m.sign, m.bank, m.seracs.geometry, m.motes.geometry, m.discG, m.goldRingG, m.stepG, m.stream, m.lipG, m.poolG, m.padG, m.padDiscG, m.ringG, m.burstG]) x.dispose();
      m.motes.material.dispose();
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
      D.position.set(PLACE.x + Math.cos(a) * r, TOP + 1.7 + k * 4.7, PLACE.z + Math.sin(a) * r);
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
      mp.setXYZ(i, PLACE.x + Math.cos(a) * r, TOP + 1.9 + life * (12 - TOP - 1.9), PLACE.z + Math.sin(a) * r);
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
      <mesh geometry={m.stream} material={m.streamM} renderOrder={2} frustumCulled={false} />
      <mesh geometry={m.bank} material={m.bankM} frustumCulled={false} />
      <primitive object={m.seracs} />
      <group position={[PLACE.x, TOP, PLACE.z]} scale={1.45}>
        <mesh geometry={m.discG} material={m.marble} position={[0, 0.02, 0]} />
        {m.arms.map((g, n) => <mesh key={n} geometry={g} material={m.inlay} position={[0, 0.16, 0]} />)}
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
      <mesh geometry={m.skirt} material={m.slate} position={[PLATEAU.x, TOP / 2, PLATEAU.z]} />
      {Array.from({ length: STEPS }, (_, n) => (
        <mesh key={n} geometry={m.stairG} material={n % 2 ? m.white : m.gold} position={[PLATEAU.x, TOP - (n + 0.5) * 0.62 + 0.31, PLATEAU.z + 6.6 + n * 0.19]} />
      ))}
      <pointLight color="#a78bfa" intensity={2} distance={14} position={[PLATEAU.x, TOP + 1.5, PLATEAU.z]} />
      <primitive object={m.motes} />
      <primitive object={m.tips} />
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
