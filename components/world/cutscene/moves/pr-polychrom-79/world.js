// The Kingdom of Science from Dr. Stone, built once at mount: a saturated sky, cracked-grass ground, one
// stone-cell material for every prop, DNA rings, flasks, statues and Senku's hair for the pup.
// Nothing allocates per frame; the move disposes every geometry and material.

import { Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const HASH = /* glsl */ `
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec2 h22(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
  // voronoi: x the nearest distance, y the second, z the cell id in 0..1; cc the cell's point
  vec3 vor(vec2 p, out vec2 cc) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    float d1 = 8.0;
    float d2 = 8.0;
    float id = 0.0;
    cc = ip;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = h22(ip + g);
        vec2 r = g + o - fp;
        float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; id = h21(ip + g); cc = ip + g + o; }
        else if (d < d2) { d2 = d; }
      }
    }
    return vec3(sqrt(d1), sqrt(d2), id);
  }`;

const col = (c) => ({ value: new Color(c) });

// stone, grass and wood in one material: voronoi cells in two inks, dark cracks between them, an optional glow in the cracks
export function stoneMaterial(base, alt, crack, scale = 1.2, glow = "#000000", instanced = false) {
  return new ShaderMaterial({
    uniforms: { uBase: col(base), uAlt: col(alt), uCrack: col(crack), uGlow: col(glow), uScale: { value: scale } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vN;
      void main() {
        vec4 w = modelMatrix * ${instanced ? "instanceMatrix * " : ""}vec4(position, 1.0);
        vWorld = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uAlt;
      uniform vec3 uCrack;
      uniform vec3 uGlow;
      uniform float uScale;
      varying vec3 vWorld;
      varying vec3 vN;
      ${HASH}
      void main() {
        vec2 cc;
        vec3 v = vor(vec2(vWorld.x + vWorld.z * 0.8, vWorld.z * 0.5 + vWorld.y * 1.3) * uScale, cc);
        vec3 c = mix(uBase, uAlt, v.z);
        float line = 1.0 - smoothstep(0.03, 0.11, v.y - v.x);
        float shade = 0.72 + 0.28 * clamp(dot(normalize(vN), normalize(vec3(0.4, 0.8, 0.5))) * 0.5 + 0.5, 0.0, 1.0);
        c = mix(c * shade, uCrack, line * 0.8) + uGlow * line;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// THE SKY: saturated and banded: blue overhead, cyan, a magenta and yellow horizon, a sun
export function skyMaterial() {
  return new ShaderMaterial({
    side: DoubleSide,
    depthWrite: false,
    uniforms: { uSun: { value: new Vector3(0.35, 0.28, -0.9).normalize() } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun;
      varying vec3 vDir;
      void main() {
        float y = clamp(vDir.y, -0.2, 1.0);
        vec3 c = mix(vec3(1.0, 0.86, 0.22), vec3(1.0, 0.35, 0.72), smoothstep(-0.05, 0.1, y));
        c = mix(c, vec3(0.12, 0.85, 1.0), smoothstep(0.1, 0.32, y));
        c = mix(c, vec3(0.10, 0.45, 1.0), smoothstep(0.3, 0.9, y));
        float s = max(dot(normalize(vDir), uSun), 0.0);
        float s2 = s * s;
        float s4 = s2 * s2;
        c += vec3(1.0, 0.95, 0.5) * (smoothstep(0.985, 0.992, s) + 0.35 * s4 * s4);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// DNA RINGS: red (wrong sign) to green (right sign), a base-pair banding running round the ring
export function ringMaterial() {
  return new ShaderMaterial({
    uniforms: { uSign: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uSign;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 c = mix(vec3(1.0, 0.16, 0.2), vec3(0.12, 1.0, 0.42), clamp(uSign, 0.0, 1.0));
        float band = 0.62 + 0.38 * sin(vUv.x * 100.0 + vUv.y * 12.566 - uTime * 3.0);
        float rim = 1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        gl_FragColor = vec4(c * band + vec3(1.0, 1.0, 0.8) * rim * rim * 0.55, 1.0);
      }`,
  });
}

export const ringGeometry = (R, r) => new TorusGeometry(R, r, 10, 56);

const strip = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};

// a science flask, lit from within by its instance colour
export function flaskGeometry() {
  return mergeGeometries(
    [new SphereGeometry(0.16, 10, 8).translate(0, 0.16, 0), new CylinderGeometry(0.045, 0.06, 0.2, 8).translate(0, 0.38, 0), new CylinderGeometry(0.07, 0.07, 0.03, 8).translate(0, 0.49, 0)].map(strip),
  );
}

// a petrified figure, arms thrown up (kept whole: the stone material needs normals)
export function statueGeometry() {
  return mergeGeometries([
    new CylinderGeometry(0.2, 0.24, 1.0, 7).translate(0, 0.5, 0),
    new SphereGeometry(0.17, 8, 6).translate(0, 1.2, 0),
    new CylinderGeometry(0.05, 0.06, 0.7, 5).rotateZ(0.5).translate(0.34, 1.2, 0),
    new CylinderGeometry(0.05, 0.06, 0.7, 5).rotateZ(-0.5).translate(-0.34, 1.2, 0),
  ]);
}

// Senku's hair for the pup: a pale-mint crown cap and nine spikes standing up from it, tips vivid green (vertex colours)
export function hairGeometry() {
  const tint = (g, lo, hi, h) => {
    const p = g.attributes.position;
    const c = new Float32Array(p.count * 3);
    const a = new Color(lo);
    const b = new Color(hi);
    const k = new Color();
    for (let i = 0; i < p.count; i++) {
      k.copy(a).lerp(b, Math.min(1, Math.max(0, p.getY(i) / h)));
      c.set([k.r, k.g, k.b], i * 3);
    }
    g.setAttribute("color", new Float32BufferAttribute(c, 3));
    return g;
  };
  const parts = [];
  // head frame: skull radii 0.52, 0.47, 0.5, +y up: the cap covers the crown only
  const cap = new SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, 0.8).scale(0.545, 0.5, 0.52);
  parts.push(strip(tint(cap, "#dff5c8", "#8be34a", 0.5)));
  const spike = (x, z, h, tilt, yaw) => {
    const g = new ConeGeometry(0.1, h, 5).translate(0, h / 2, 0);
    tint(g, "#d7f7b0", "#18e04a", h);
    g.rotateX(tilt).rotateY(yaw).translate(x, 0.4, z);
    parts.push(strip(g));
  };
  spike(0, 0, 0.78, 0, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    spike(Math.sin(a) * 0.2, Math.cos(a) * 0.2 - 0.03, 0.5 + 0.12 * ((i * 5) % 3), 0.42, a);
  }
  return mergeGeometries(parts);
}
