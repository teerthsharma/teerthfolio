"use client";

// THE DOMAIN, in the world (lib/world/domain.js): one sphere of deep night
// with a soft white-violet core behind the pup, a field of instanced stars,
// a halftone pool of light underfoot, and the tall ink silhouette. The
// halftone is in the materials (screen-space dots), so there is no post
// pass. Once the sphere has passed the camera the island is switched off
// (its top-level objects hidden, the lights kept), so inside the domain only
// the pup, the silhouette and the void draw: a handful of draw calls. Any
// skip clears live.arrival and everything here goes back in the same frame.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh,
  MeshBasicMaterial, Object3D, OctahedronGeometry, Quaternion, ShaderMaterial, SphereGeometry, Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DOMAIN, FIGURE_AT, FIGURE_SCALE, domainMode, onTwos, radiusAt } from "../../lib/world/domain";
import { live } from "../../lib/world/store";

const CORE_Y = 0.9; // m: the pup's chest, the sphere's centre
const STARS = 240;
const INK = new Color("#22163f");
const RIM = new Color("#e9deff");

// Halftone on a 45-degree screen grid, uCell px a cell (scaled by the dpr).
const HALFTONE = /* glsl */ `
  uniform float uCell;
  float halftone(float tone) {
    vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uCell;
    float d = length(fract(p) - 0.5);
    float r = 0.56 * sqrt(clamp(tone, 0.0, 1.0));
    return 1.0 - smoothstep(r - 0.07, r + 0.07, d);
  }`;

function voidMaterial() {
  return new ShaderMaterial({
    uniforms: { uCore: { value: new Vector3() }, uCell: { value: 6 } },
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
      varying vec3 vWorld;
      varying vec3 vNormal;
      ${HALFTONE}
      void main() {
        vec3 v = normalize(vWorld - cameraPosition);
        float a = 1.0 - dot(v, normalize(uCore - cameraPosition)); // 0 toward the core
        float core = exp(-a * 70.0);
        float halo = exp(-a * 16.0);
        float high = clamp(v.y * 1.6 + 0.4, 0.0, 1.0);
        vec3 night = mix(vec3(0.035, 0.026, 0.1), vec3(0.012, 0.01, 0.04), high);
        night = mix(night, vec3(0.16, 0.1, 0.32), halo);
        // light halftone: only in the ring round the core, where the light falls off
        float ring = halo * (1.0 - halo) * 4.0;
        vec3 col = night + halftone(ring * 0.55) * vec3(0.3, 0.22, 0.55) * 0.35 + core * vec3(0.92, 0.86, 1.0) * 0.85;
        float alpha = 1.0;
        if (gl_FrontFacing) {
          // seen from outside while it swells: a bubble of night, see-through at its middle
          float f = pow(1.0 - abs(dot(normalize(vNormal), v)), 2.0);
          col += f * vec3(0.5, 0.35, 0.85);
          alpha = mix(0.3, 1.0, f);
        }
        gl_FragColor = vec4(pow(col, vec3(2.2)), alpha); // picked as sRGB, written linear
      }`,
  });
}

function poolMaterial() {
  return new ShaderMaterial({
    uniforms: { uCell: { value: 6 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      ${HALFTONE}
      void main() {
        float r = length(vUv * 2.0 - 1.0);
        float tone = (1.0 - smoothstep(0.0, 1.0, r)) * 0.8;
        float glow = (1.0 - smoothstep(0.0, 0.55, r)) * 0.18;
        gl_FragColor = vec4(pow(vec3(0.6, 0.5, 0.95) * (halftone(tone) * 0.55 + glow), vec3(2.2)), 1.0);
      }`,
  });
}

// The silhouette: ink with a rim light set as halftone dots on the facets
// that turn away from the lens.
function inkMaterial() {
  return new ShaderMaterial({
    uniforms: { uCell: { value: 6 }, uInk: { value: INK }, uRim: { value: RIM } },
    vertexShader: /* glsl */ `
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      uniform vec3 uRim;
      varying vec3 vView;
      ${HALFTONE}
      void main() {
        vec3 n = normalize(cross(dFdx(vView), dFdy(vView))); // the facet's normal: low poly, flat
        if (dot(n, vView) > 0.0) n = -n;
        float rim = pow(1.0 - abs(dot(n, normalize(-vView))), 2.2);
        float tone = rim * 0.9 + max(n.y, 0.0) * 0.12;
        vec3 col = mix(uInk, uRim, halftone(tone) * step(0.18, tone));
        col = mix(col, uRim, smoothstep(0.8, 0.92, rim));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();
const prep = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};
// A tapered six-sided limb from a to b.
function limb(a, b, r1, r2, sx = 1, sz = 1) {
  A.fromArray(a);
  B.fromArray(b);
  const len = A.distanceTo(B);
  const g = new CylinderGeometry(r2, r1, len, 6, 1).scale(sx, 1, sz);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return prep(g);
}

// Tall, slim, hands in pockets, spiky upswept hair; faces +z. No face.
const HEAD = [0, 1.9, 0.02];
function figureGeometry() {
  const parts = [];
  for (const s of [-1, 1]) {
    parts.push(limb([s * 0.11, 0, 0.03], [s * 0.13, 1.0, 0], 0.085, 0.115)); // trousers, not sticks
    parts.push(limb([s * 0.3, 1.58, 0], [s * 0.42, 1.22, -0.04], 0.095, 0.08)); // upper arm, elbow out
    parts.push(limb([s * 0.42, 1.22, -0.04], [s * 0.21, 1.0, 0.08], 0.08, 0.07)); // into the pocket
  }
  parts.push(limb([0, 0.88, 0], [0, 1.6, 0], 0.2, 0.25, 1.3, 0.8)); // the jacket, shoulders wide
  parts.push(limb([0, 0.78, 0], [0, 1.0, 0], 0.26, 0.21, 1.15, 0.85)); // its hem
  parts.push(limb([-0.31, 1.6, 0], [0.31, 1.6, 0], 0.08, 0.08));
  parts.push(limb([0, 1.58, 0], [0, 1.8, 0.01], 0.07, 0.06));
  parts.push(prep(new IcosahedronGeometry(0.155, 1).scale(0.94, 1.12, 1).translate(...HEAD)));
  // the hair: spikes swept up and out, a few back for volume
  const spikes = [
    [-78, 0.05, 0.2], [-55, -0.05, 0.27], [-32, 0.04, 0.33], [-10, -0.06, 0.36], [12, 0.05, 0.35],
    [34, -0.04, 0.32], [56, 0.03, 0.27], [76, -0.02, 0.2], [-22, -0.6, 0.27], [24, -0.6, 0.26], [0, -0.9, 0.22],
  ];
  for (const [deg, back, h] of spikes) {
    const a = (deg * Math.PI) / 180;
    const dir = new Vector3(Math.sin(a), Math.cos(a) * 0.95 + 0.15, back).normalize();
    const g = new ConeGeometry(0.075, h, 5);
    g.translate(0, h / 2, 0);
    g.applyQuaternion(Q.setFromUnitVectors(UP, dir));
    g.translate(HEAD[0] + dir.x * 0.1, HEAD[1] + 0.04 + dir.y * 0.1, HEAD[2] + dir.z * 0.1);
    parts.push(prep(g));
  }
  const ink = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  // the one prop: the blindfold band, round the head at the eyes
  const band = new CylinderGeometry(0.162, 0.162, 0.062, 14, 1, true).scale(0.96, 1, 1.04).translate(HEAD[0], HEAD[1] + 0.02, HEAD[2]);
  return { ink, band };
}

function build() {
  const fig = figureGeometry();
  const stars = new InstancedMesh(new OctahedronGeometry(1, 0).scale(0.4, 1, 0.4), new MeshBasicMaterial({ toneMapped: false, fog: false }), STARS);
  const o = new Object3D();
  const tints = [new Color("#fbfaf7"), new Color("#d8c8ff"), new Color("#bcd6ee")];
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
    } while (x * x + y * y + z * z > 1 || z > 0.05); // behind the pup, never between it and the lens
    const r = 0.4 + 0.55 * rand();
    o.position.set(x, y, z).normalize().multiplyScalar(r);
    o.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.4);
    o.scale.setScalar(0.003 + 0.008 * rand() ** 3);
    o.updateMatrix();
    stars.setMatrixAt(i, o.matrix);
    stars.setColorAt(i, tints[i % 3]);
  }
  stars.frustumCulled = false;
  return {
    sphere: new SphereGeometry(1, 48, 24),
    voidMat: voidMaterial(),
    pool: new CircleGeometry(1, 48).rotateX(-Math.PI / 2),
    poolMat: poolMaterial(),
    stars,
    ink: fig.ink,
    band: fig.band,
    inkMat: inkMaterial(),
    bandMat: new MeshBasicMaterial({ color: "#fbfaf7", side: DoubleSide, toneMapped: false, fog: false }),
  };
}

// The silhouette's entrance and exit, on twos: squash, stretch, settle.
const ENTER = [
  [1.3, 0.5],
  [0.86, 1.14],
  [1.05, 0.96],
];

export default function Domain() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  // For capture probes: draw calls and triangles (gl.info) during the scene.
  useEffect(() => {
    window.__world = { ...(window.__world || {}), gl };
  }, [gl]);
  const kit = useMemo(build, []);
  const root = useRef();
  const sphere = useRef();
  const pool = useRef();
  const starsRef = useRef();
  const figure = useRef();
  const hidden = useRef({ on: false, list: [] });

  const hideWorld = (on) => {
    const h = hidden.current;
    if (on === h.on) return;
    h.on = on;
    if (on) {
      for (const o of scene.children) {
        if (o === root.current || o.name === "seal" || o.isLight || !o.visible) continue;
        o.visible = false;
        h.list.push(o);
      }
    } else {
      for (const o of h.list) o.visible = true;
      h.list.length = 0;
    }
  };

  useEffect(
    () => () => {
      hideWorld(false);
      for (const v of Object.values(kit)) v.dispose?.();
      kit.stars.geometry.dispose();
      kit.stars.material.dispose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kit],
  );

  useFrame((state) => {
    const g = root.current;
    const arrival = live.arrival;
    const mode = arrival.id ? domainMode(arrival.id) : null;
    if (!mode) {
      hideWorld(false);
      live.inDomain = false;
      live.domainOn = false;
      g.visible = false;
      return;
    }
    g.visible = true;
    const t = state.clock.elapsedTime - arrival.start;
    const s = live.seal;
    g.position.set(s.x, 0, s.z);

    const r = mode === "full" ? radiusAt(t) : 0;
    const cell = 6 * state.gl.getPixelRatio();
    kit.voidMat.uniforms.uCell.value = kit.poolMat.uniforms.uCell.value = cell;
    kit.inkMat.uniforms.uCell.value = cell * 0.6; // a finer screen on the figure's rim
    kit.voidMat.uniforms.uCore.value.set(s.x, CORE_Y, s.z);
    sphere.current.visible = r > 0.02;
    sphere.current.scale.setScalar(Math.max(r, 0.02));
    const inside = r > state.camera.position.distanceTo(kit.voidMat.uniforms.uCore.value) + 0.3;
    hideWorld(inside);
    live.inDomain = inside;
    live.domainOn = mode === "full";
    starsRef.current.visible = inside;
    starsRef.current.scale.setScalar(r);
    starsRef.current.rotation.y = 0.04 * t;
    pool.current.visible = inside;

    // the silhouette: steps in on twos after the bloom, out on the collapse
    const f = figure.current;
    const inF = Math.floor((t - DOMAIN.enter) * 12);
    const outF = Math.floor((t - DOMAIN.collapse[0]) * 12);
    const frame = mode === "still" ? 9 : outF >= 0 ? 2 - outF : inF;
    f.visible = frame >= 0;
    if (f.visible) {
      const [sx, sy] = ENTER[frame] ?? [1, 1];
      const tt = onTwos(t);
      f.scale.set(FIGURE_SCALE * sx, FIGURE_SCALE * sy, FIGURE_SCALE * sx);
      f.rotation.set(0, -0.42, mode === "full" ? 0.015 * Math.sin(tt * 2.2) + (t > DOMAIN.lineB ? 0.035 : 0) : 0);
    }
  });

  return (
    <group ref={root} visible={false}>
      <group position={[0, CORE_Y, 0]}>
        <mesh ref={sphere} geometry={kit.sphere} material={kit.voidMat} renderOrder={-1} frustumCulled={false} />
        <primitive object={kit.stars} ref={starsRef} />
      </group>
      <mesh ref={pool} geometry={kit.pool} material={kit.poolMat} position={[0.8, 0.01, -1.5]} scale={[3.4, 1, 3]} />
      <group ref={figure} position={FIGURE_AT}>
        <mesh geometry={kit.ink} material={kit.inkMat} />
        <mesh geometry={kit.band} material={kit.bandMat} />
      </group>
    </group>
  );
}
