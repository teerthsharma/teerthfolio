"use client";

// THE STAGE (shared): the approved Aether-Lang domain, in any place's
// colour. One sphere of deep night with a soft pale core behind the pup, a
// field of instanced stars (or motes, or streaks), a halftone pool of light
// under the speaker and a faint glow under the pup. The halftone is in the
// materials (screen-space dots), so there is no post pass. Once the sphere
// has passed the camera the island is switched off (its top-level objects
// hidden, the lights kept): inside only the pup, the speaker and the night
// draw, and, when the land speaks, the landform itself, lit, against it.
// Any skip clears live.arrival and everything here goes back in the same
// frame. Inks: lib/world/cutscene/look.js; clock: timeline.js.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Box3, CircleGeometry, Ray, Color, DoubleSide, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { paletteFor } from "../../../lib/world/cutscene/look";
import { landPoint, radiusAt } from "../../../lib/world/cutscene/timeline";
import { live } from "../../../lib/world/store";

const CORE_Y = 0.9; // m: the pup's chest, the sphere's centre
const STARS = 240;
const LAND_WALL = 150; // m: inside CameraRig's 260 m far plane

// Halftone on a 45-degree screen grid, uCell px a cell (scaled by the dpr).
export const HALFTONE = /* glsl */ `
  uniform float uCell;
  float halftone(float tone) {
    vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uCell;
    float d = length(fract(p) - 0.5);
    float r = 0.56 * sqrt(clamp(tone, 0.0, 1.0));
    return 1.0 - smoothstep(r - 0.07, r + 0.07, d);
  }`;

const v3 = () => ({ value: new Vector3() });

function voidMaterial() {
  return new ShaderMaterial({
    uniforms: { uCore: v3(), uCell: { value: 6 }, uNight: v3(), uNightHigh: v3(), uHalo: v3(), uDots: v3(), uLight: v3(), uFresnel: v3() },
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
      uniform vec3 uCore;
      uniform vec3 uNight;
      uniform vec3 uNightHigh;
      uniform vec3 uHalo;
      uniform vec3 uDots;
      uniform vec3 uLight;
      uniform vec3 uFresnel;
      varying vec3 vWorld;
      varying vec3 vNormal;
      ${HALFTONE}
      void main() {
        vec3 v = normalize(vWorld - cameraPosition);
        float a = 1.0 - dot(v, normalize(uCore - cameraPosition)); // 0 toward the core
        float core = exp(-a * 70.0);
        float halo = exp(-a * 16.0);
        float high = clamp(v.y * 1.6 + 0.4, 0.0, 1.0);
        vec3 night = mix(uNight, uNightHigh, high);
        night = mix(night, uHalo, halo);
        // light halftone: only in the ring round the core, where the light falls off
        float ring = halo * (1.0 - halo) * 4.0;
        vec3 col = night + (uCell > 0.0 ? halftone(ring * 0.55) : ring * 0.3) * uDots * 0.35 + core * uLight * 0.85;
        float alpha = 1.0;
        if (gl_FrontFacing) {
          // seen from outside while it swells: a bubble of night, see-through at its middle
          float f = pow(1.0 - abs(dot(normalize(vNormal), v)), 2.0);
          col += f * uFresnel;
          alpha = mix(0.3, 1.0, f);
        }
        gl_FragColor = vec4(pow(col, vec3(2.2)), alpha); // picked as sRGB, written linear
      }`,
  });
}

// The halftone pool of light under the speaker, and the glow the pup stands on.
function glowMaterial(halftone) {
  return new ShaderMaterial({
    uniforms: { uCell: { value: 6 }, uColor: v3() },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: halftone
      ? /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      ${HALFTONE}
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float tone = (1.0 - smoothstep(0.0, 1.0, r)) * 0.8;
        float glow = (1.0 - smoothstep(0.0, 0.55, r)) * 0.18;
        gl_FragColor = vec4(pow(uColor * ((uCell > 0.0 ? halftone(tone) : tone * 0.6) * 0.55 + glow), vec3(2.2)), 1.0);
      }`
      : /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float k = (1.0 - smoothstep(0.0, 1.0, r)) * 0.55 + (1.0 - smoothstep(0.55, 0.62, r)) * smoothstep(0.45, 0.55, r) * 0.25;
        gl_FragColor = vec4(pow(uColor * k, vec3(2.2)), 1.0);
      }`,
  });
}

// The particles: one instanced mesh per style, all inside the unit sphere,
// behind the pup (never between it and the lens).
const SHAPES = {
  sparkle: () => new OctahedronGeometry(1, 0).scale(0.4, 1, 0.4), // four-point glints
  motes: () => new IcosahedronGeometry(0.55, 0), // round flecks drifting
  streaks: () => new OctahedronGeometry(1, 0).scale(0.12, 0.12, 4), // speed lines flying past
};
function particles(style) {
  const mesh = new InstancedMesh(SHAPES[style](), new MeshBasicMaterial({ toneMapped: false, fog: false }), STARS);
  const o = new Object3D();
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < STARS; i++) {
    let x;
    let y;
    let z;
    do {
      x = rand() * 2 - 1;
      y = rand() * 2 - 1;
      z = rand() * 2 - 1;
    } while (x * x + y * y + z * z > 1 || z > 0.05);
    const r = 0.4 + 0.55 * rand();
    o.position.set(x, y, z).normalize().multiplyScalar(r);
    o.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.4);
    if (style === "streaks") o.rotation.set(0, 0, 0); // all along the depth axis, toward the lens
    o.scale.setScalar(0.003 + 0.008 * rand() ** 3);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    mesh.setColorAt(i, new Color(1, 1, 1));
  }
  mesh.frustumCulled = false;
  return mesh;
}

// Built once, shared by every place's stage: nothing allocates per frame or per scene.
let KIT = null;
function kit() {
  KIT ??= {
    sphere: new SphereGeometry(1, 48, 24),
    voidMat: voidMaterial(),
    pool: new CircleGeometry(1, 48).rotateX(-Math.PI / 2),
    poolMat: glowMaterial(true),
    disc: new CircleGeometry(1, 40).rotateX(-Math.PI / 2),
    discMat: glowMaterial(false),
    stars: {},
    tint: new Color(),
  };
  return KIT;
}
function starsFor(style) {
  const k = kit();
  return (k.stars[style] ??= particles(style));
}

const BOXES = new WeakMap();
const BOX = new Box3();
const AT = new Vector3();
const PUP = new Vector3();
const RAY = new Ray();
const HIT = new Vector3();
// A top-level object the land speaks from: small enough to be a landform (not
// the terrain, the sea or a scatter across the island), close to the point,
// and not standing between the lens and the pup.
function isLand(o, at, camera) {
  let b = BOXES.get(o);
  if (!b) {
    b = BOX.setFromObject(o).clone();
    BOXES.set(o, b);
  }
  if (b.isEmpty()) return false;
  const size = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
  if (size >= 60 || b.distanceToPoint(at) >= 3 || b.containsPoint(camera.position)) return false;
  RAY.origin.copy(camera.position);
  RAY.direction.subVectors(PUP, camera.position).normalize();
  const hit = RAY.intersectBox(b, HIT);
  return !hit || hit.distanceTo(camera.position) > camera.position.distanceTo(PUP) - 0.4;
}

// cut: { card, place, tl, mode } (the move's props). `at`: where the speaker's
// pool of light falls, from the pup (default under a figure speaker).
export default function Stage({ card, place, tl, mode, pool: poolAt = [0.8, 0.01, -1.5] }) {
  const scene = useThree((s) => s.scene);
  const k = kit();
  const style = card.stage?.stars ?? "sparkle";
  const stars = style === "none" ? null : starsFor(style);
  const root = useRef();
  const sphere = useRef();
  const pool = useRef();
  const disc = useRef();
  const hidden = useRef({ on: false, list: [] });
  const land = card.speaker === "land";

  // the place's inks: set once a scene, into the shared materials
  useMemo(() => {
    const p = paletteFor(card);
    const u = k.voidMat.uniforms;
    u.uNight.value.fromArray(p.night);
    u.uNightHigh.value.fromArray(p.nightHigh);
    u.uHalo.value.fromArray(p.halo);
    u.uDots.value.fromArray(p.dots);
    u.uLight.value.fromArray(p.core);
    u.uFresnel.value.fromArray(p.fresnel);
    k.poolMat.uniforms.uColor.value.fromArray(p.pool);
    k.discMat.uniforms.uColor.value.fromArray(p.disc);
    if (stars) {
      const tints = p.star.map((h) => new Color(h));
      for (let i = 0; i < STARS; i++) stars.setColorAt(i, tints[i % 3]);
      stars.instanceColor.needsUpdate = true;
    }
  }, [card, k, stars]);

  const hideWorld = (on, camera) => {
    const h = hidden.current;
    if (on === h.on) return;
    h.on = on;
    if (on) {
      if (land) {
        const a = landPoint(card, place);
        AT.set(a.x, a.y, a.z);
        PUP.set(live.seal.x, 0.6, live.seal.z);
      }
      for (const o of scene.children) {
        if (o.name === "cutscene" || o.name === "seal" || o.isLight || !o.visible) continue;
        if (land && isLand(o, AT, camera)) continue;
        o.visible = false;
        h.list.push(o);
      }
    } else {
      for (const o of h.list) o.visible = true;
      h.list.length = 0;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => hideWorld(false), []);

  useFrame((state) => {
    const g = root.current;
    const arrival = live.arrival;
    if (!arrival.id || mode !== "full") {
      hideWorld(false);
      live.inStage = false;
      g.visible = false;
      return;
    }
    g.visible = true;
    const t = state.clock.elapsedTime - arrival.start;
    const s = live.seal;
    g.position.set(s.x, 0, s.z);
    const r = radiusAt(tl, t);
    const cell = (card.stage?.halftone ?? 6) * state.gl.getPixelRatio();
    k.voidMat.uniforms.uCell.value = k.poolMat.uniforms.uCell.value = cell;
    k.voidMat.uniforms.uCore.value.set(s.x, CORE_Y, s.z);
    const inside = r > state.camera.position.distanceTo(k.voidMat.uniforms.uCore.value) + 0.3;
    sphere.current.visible = r > 0.02;
    // From inside the night shades by direction alone, so when the land
    // speaks its wall stands far off and the landform draws in front of it.
    sphere.current.scale.setScalar(inside && land ? LAND_WALL : Math.max(r, 0.02));
    hideWorld(inside, state.camera);
    live.inStage = inside;
    if (stars) {
      stars.visible = inside;
      stars.scale.setScalar(r);
      stars.rotation.y = 0.04 * t;
    }
    pool.current.visible = inside && !land;
    disc.current.visible = inside;
  });

  return (
    <group ref={root} visible={false}>
      <group position={[0, CORE_Y, 0]}>
        <mesh ref={sphere} geometry={k.sphere} material={k.voidMat} renderOrder={-1} frustumCulled={false} />
        {stars ? <primitive object={stars} /> : null}
      </group>
      <mesh ref={pool} geometry={k.pool} material={k.poolMat} position={poolAt} scale={[3.4, 1, 3]} />
      <mesh ref={disc} geometry={k.disc} material={k.discMat} position={[0, 0.02, 0.1]} scale={1.15} />
    </group>
  );
}
