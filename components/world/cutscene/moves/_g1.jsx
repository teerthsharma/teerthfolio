"use client";

// GROUP 1's SHARED PARTS (nemo, mujoco, triton, home): a bespoke world for a
// scene, as the approved Aether domain is one, but with its own sky. A Dome is
// ONE sphere with its own ShaderMaterial (sky gradient, a halo toward the pup,
// halftone dots in the glow's falloff, material level, 6 px), a Ground is one
// disc with its own ShaderMaterial (radial colour, halftone, fades out at its
// rim), a Shadow is the pup's contact shadow, Motes are one instanced mesh of
// drifting flecks. No post pass. The Dome swells out from the pup like the
// Stage's sphere (Stage.jsx hides the island once the camera is inside, and
// puts it back on any skip), so a move mounts <Stage bare> for that and its
// own Dome for the look.

import { sceneT } from "../../../../lib/world/cutscene/clock";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, CircleGeometry, Color, DoubleSide, Group, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { radiusAt } from "../../../../lib/world/cutscene/timeline";
import { live } from "../../../../lib/world/store";
import { HALFTONE } from "../Stage";

const CORE_Y = 0.9;
export const hex3 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const v3 = (h) => ({ value: new Vector3(...hex3(h)) });

// pal: { top, mid, hor, bot, glow, dot } hex; glowK 0..1 the halo's weight, dotK the halftone's, band where the dots gather
function domeMaterial(pal) {
  return new ShaderMaterial({
    uniforms: { uCore: { value: new Vector3() }, uCell: { value: 6 }, uTop: v3(pal.top), uMid: v3(pal.mid), uHor: v3(pal.hor), uBot: v3(pal.bot), uGlow: v3(pal.glow), uDot: v3(pal.dot), uGlowK: { value: pal.glowK ?? 0.6 }, uDotK: { value: pal.dotK ?? 1 }, uTime: { value: 0 } },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormal = normalize(mat3(modelMatrix) * position);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCore, uTop, uMid, uHor, uBot, uGlow, uDot;
      uniform float uGlowK, uDotK, uTime;
      varying vec3 vWorld;
      varying vec3 vNormal;
      ${HALFTONE}
      void main() {
        vec3 v = normalize(vWorld - cameraPosition);
        float h = v.y;
        vec3 up = mix(uHor, mix(uMid, uTop, smoothstep(0.25, 0.95, h)), smoothstep(0.0, 0.32, h));
        vec3 col = h > 0.0 ? up : mix(uHor, uBot, smoothstep(0.0, -0.3, h));
        float a = 1.0 - dot(v, normalize(uCore - cameraPosition));
        float halo = exp(-a * 9.0);
        col = mix(col, uGlow, halo * uGlowK);
        // halftone: a band along the horizon and a ring where the halo falls off
        float band = exp(-abs(h - 0.1) * 6.0) * 0.8 + halo * (1.0 - halo) * 3.2;
        col = mix(col, uDot, (uCell > 0.0 ? halftone(clamp(band * 0.5, 0.0, 1.0)) : 0.0) * uDotK);
        float alpha = 1.0;
        if (gl_FrontFacing) {
          float f = pow(1.0 - abs(dot(normalize(vNormal), v)), 2.0);
          col += f * uGlow * 0.5;
          alpha = mix(0.3, 1.0, f);
        }
        gl_FragColor = vec4(pow(col, vec3(2.2)), alpha);
      }`,
  });
}

function groundMaterial(pal) {
  return new ShaderMaterial({
    uniforms: { uCell: { value: 6 }, uIn: v3(pal.groundIn), uOut: v3(pal.groundOut), uDot: v3(pal.groundDot), uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uIn, uOut, uDot;
      varying vec2 vUv;
      ${HALFTONE}
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        vec3 col = mix(uIn, uOut, smoothstep(0.0, 0.8, r));
        // dots swell with distance, like the pool of light under a speaker in reverse
        float tone = smoothstep(0.08, 0.9, r) * 0.85;
        col = mix(col, uDot, uCell > 0.0 ? halftone(tone) : 0.0);
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0 - smoothstep(0.78, 1.0, r));
      }`,
  });
}

const sphere = () => (KIT.sphere ??= new SphereGeometry(1, 40, 20));
const disc = () => (KIT.disc ??= new CircleGeometry(1, 48).rotateX(-Math.PI / 2));
const KIT = {};

// The world of a scene. pal: see domeMaterial / groundMaterial. The wall stands far once the camera is inside,
// so a landform the stage kept lit draws in front of it. radius: the ground disc radius (m).
export function Dome({ tl, mode, pal, radius = 38 }) {
  const root = useRef();
  const dome = useRef();
  const ground = useRef();
  const mats = useMemo(() => ({ dome: domeMaterial(pal), ground: groundMaterial(pal) }), [pal]);
  const core = useMemo(() => new Vector3(), []);
  useFrame((state) => {
    const a = live.arrival;
    if (!a.id || mode !== "full") {
      root.current.visible = false;
      return;
    }
    root.current.visible = true;
    const t = sceneT(a.id, state.clock.elapsedTime - a.start);
    const s = live.seal;
    root.current.position.set(s.x, 0, s.z);
    const r = radiusAt(tl, t);
    core.set(s.x, CORE_Y, s.z);
    const inside = r > state.camera.position.distanceTo(core) + 0.3;
    const cell = 6 * state.gl.getPixelRatio();
    mats.dome.uniforms.uCell.value = mats.ground.uniforms.uCell.value = cell;
    mats.dome.uniforms.uCore.value.copy(core);
    mats.dome.uniforms.uTime.value = t;
    dome.current.visible = r > 0.02;
    dome.current.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
    ground.current.visible = inside;
  });
  return (
    <group ref={root} visible={false}>
      <mesh ref={dome} geometry={sphere()} material={mats.dome} position={[0, CORE_Y, 0]} renderOrder={-2} frustumCulled={false} />
      <mesh ref={ground} geometry={disc()} material={mats.ground} position={[0, 0.01, 0]} scale={radius} renderOrder={-1} frustumCulled={false} />
    </group>
  );
}

// The pup's contact shadow on the ground (a soft dark oval), scaled with the pup.
const SHADOW = new ShaderMaterial({
  uniforms: { uK: { value: 0.5 } },
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `uniform float uK; varying vec2 vUv; void main(){ float r = length(vUv * 2.0 - 1.0); gl_FragColor = vec4(0.05, 0.03, 0.08, uK * (1.0 - smoothstep(0.2, 1.0, r))); }`,
});
export function Shadow({ mode, k = 0.5, size = 0.95 }) {
  const m = useRef();
  useFrame(() => {
    const a = live.arrival;
    m.current.visible = Boolean(a.id) && mode === "full" && live.inStage;
    const s = live.seal;
    m.current.position.set(s.x, 0.03, s.z);
    m.current.scale.setScalar(size);
    m.current.material.uniforms.uK.value = k;
  });
  return <mesh ref={m} geometry={disc()} material={SHADOW} visible={false} renderOrder={0} />;
}

// Motes: n flecks in one instanced mesh, drifting `dir` (m/s, x y z) inside a box `span` round the pup,
// on twos, wrapping. size: m. color: hex or a list of hexes. mode "full" only.
const D = new Object3D();
const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export function Motes({ n = 120, span = [18, 8, 14], center = [0, 0, -3], dir = [0, 0.4, 0], size = 0.06, color = "#ffffff", spin = false, sway = 0, mode, tl, shape = "diamond" }) {
  const m = useRef();
  const mesh = useMemo(() => {
    const g = shape === "diamond" ? new OctahedronGeometry(1, 0).scale(0.5, 1, 0.5) : new OctahedronGeometry(1, 0);
    const mm = new InstancedMesh(g, new MeshBasicMaterial({ toneMapped: false, fog: false, transparent: true, opacity: 0.9, depthWrite: false }), n);
    const cols = [].concat(color).map((c) => new Color(c));
    for (let i = 0; i < n; i++) mm.setColorAt(i, cols[i % cols.length]);
    mm.frustumCulled = false;
    return mm;
  }, [n, color, shape]);
  useFrame((state) => {
    const a = live.arrival;
    const g = m.current;
    g.visible = Boolean(a.id) && mode === "full" && live.inStage;
    if (!g.visible) return;
    const t = Math.floor((sceneT(a.id, state.clock.elapsedTime - a.start)) * 12) / 12;
    const s = live.seal;
    g.position.set(s.x, 0, s.z);
    const k = 1 - Math.min(1, Math.max(0, (t - tl.collapse[0]) / (tl.collapse[1] - tl.collapse[0])));
    for (let i = 0; i < n; i++) {
      const u = (hash(i) + (t * dir[0]) / span[0] + 100) % 1;
      const v = (hash(i, 1) + (t * dir[1]) / span[1] + 100) % 1;
      const w = (hash(i, 2) + (t * dir[2]) / span[2] + 100) % 1;
      const x = center[0] + (u - 0.5) * span[0] + sway * Math.sin(t * 1.3 + i);
      const y = center[1] + v * span[1];
      const z = center[2] + (w - 0.5) * span[2];
      const sz = size * (0.5 + hash(i, 3)) * k * Math.min(1, Math.min(v, 1 - v) * 6);
      D.position.set(x, y, z);
      D.rotation.set(0, spin ? t * 2 + i : 0, 0.3 * Math.sin(i));
      D.scale.setScalar(Math.max(sz, 0.0001));
      D.updateMatrix();
      mesh.setMatrixAt(i, D.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={m}>
      <primitive object={mesh} />
    </group>
  );
}

// The pup's silhouette as one static geometry (body, head, flippers, tail),
// baked once from the live pup at the scene's start in the pup's own space,
// for afterimages: a ghost is one more draw call, not a second pup.
export function bakePup(root) {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert();
  const parts = [];
  const shown = (o) => {
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  };
  root.traverse((o) => {
    if (!o.isMesh || !o.castShadow || !o.geometry?.attributes?.position || !shown(o)) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
    g.applyMatrix4(o.matrixWorld.clone().premultiply(inv));
    parts.push(g);
  });
  return parts.length ? mergeGeometries(parts) : null;
}

export { AdditiveBlending, Group };
