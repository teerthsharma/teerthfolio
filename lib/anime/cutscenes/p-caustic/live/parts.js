// The war's shared parts, ported from the site (components/world/cutscene/moves/p-caustic/painted.js and parts.js): film grain, brush strokes,
// sepia, instancing helpers and the shard maths of the break. Only the id in alpha (0.99) and the stipple that stands in for blending differ.
import { BufferAttribute, Color, InstancedMesh, Object3D, ShaderMaterial } from "three";
import { tone } from "../tone.js";

const D = new Object3D();
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export function put(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export const hide = (m, i) => put(m, i, 0, -90, 0, 0.0001);
export function inst(g, m, n) {
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  return mesh;
}
export const flat = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  return n;
};
// one flat colour a mesh (instanceColor when instanced), at the page's own id so the engine inks no line round it
export const flatMaterial = (color = "#ffffff") => tone(new ShaderMaterial({
  uniforms: { uCol: { value: new Color(color) } },
  vertexShader: `varying vec3 vC;
    void main() {
      vC = vec3(1.0);
      #ifdef USE_INSTANCING_COLOR
        vC = instanceColor;
      #endif
      mat4 im = mat4(1.0);
      #ifdef USE_INSTANCING
        im = instanceMatrix;
      #endif
      gl_Position = projectionMatrix * modelViewMatrix * im * vec4(position, 1.0);
    }`,
  fragmentShader: "varying vec3 vC; uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol * vC, 0.99); }",
}));

// the live paint: per-pixel grain that crawls every frame, diagonal screen-space brush strokes, sepia; STIP drops a pixel by its alpha (a screen door)
export const PAINT = /* glsl */ `
  float pHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float grain(float t) { return pHash(floor(gl_FragCoord.xy) + fract(t * 7.13) * 113.0) - 0.5; }
  float pNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1, 0)), f.x), mix(pHash(i + vec2(0, 1)), pHash(i + vec2(1, 1)), f.x), f.y);
  }
  float brush() {
    vec2 p = mat2(0.82, -0.57, 0.57, 0.82) * gl_FragCoord.xy;
    return pNoise(vec2(p.x * 0.012, p.y * 0.16)) * 0.6 + pNoise(vec2(p.x * 0.03, p.y * 0.3)) * 0.4;
  }
  vec3 sepia(vec3 c, float keep) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    return mix(vec3(l * 1.08, l * 0.94, l * 0.74), c, keep);
  }
  void stip(float a) {
    vec2 q = mod(floor(gl_FragCoord.xy), 4.0);
    float b = mod(q.x * 5.0 + q.y * 9.0 + 3.0 * mod(q.x * q.y, 2.0), 16.0) / 16.0 + 0.03;
    if (a < b) discard;
  }`;

export function shardify(geometry, jitter = 0) {
  const g = flat(geometry);
  const p = g.attributes.position;
  const n = p.count;
  if (jitter) {
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = Math.round(x * 31) * 7.13 + Math.round(y * 31) * 3.71 + Math.round(z * 31) * 1.37;
      p.setXYZ(i, x + (hash(k, 1) - 0.5) * jitter, y + (hash(k, 2) - 0.5) * jitter, z + (hash(k, 3) - 0.5) * jitter);
    }
  }
  const center = new Float32Array(n * 3), rand = new Float32Array(n), bary = new Float32Array(n * 3);
  for (let t = 0; t < n; t += 3) {
    const r = hash(t * 0.37 + 0.5, 9);
    for (let k = 0; k < 3; k++) {
      for (let a = 0; a < 3; a++) center[(t + k) * 3 + a] = (p.array[t * 3 + a] + p.array[t * 3 + 3 + a] + p.array[t * 3 + 6 + a]) / 3;
      rand[t + k] = r;
      bary[(t + k) * 3 + k] = 1;
    }
  }
  g.setAttribute("aCenter", new BufferAttribute(center, 3));
  g.setAttribute("aRand", new BufferAttribute(rand, 1));
  g.setAttribute("aBary", new BufferAttribute(bary, 3));
  return g;
}

// uBreak: seconds since the break (< 0: whole). uPull 1: each shard is first drawn in along its view ray to 11..20 m from the lens, then gaps, tumbles and falls.
export const SHARD_VERT = /* glsl */ `
  attribute vec3 aCenter;
  attribute float aRand;
  attribute vec3 aBary;
  uniform float uBreak;
  uniform float uPull;
  varying vec3 vOrig;
  varying vec3 vBary;
  varying float vRand;
  vec3 rot(vec3 v, vec3 k, float a) {
    return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a));
  }
  vec3 shard(vec3 pos) {
    vec4 w0 = modelMatrix * vec4(pos, 1.0);
    vOrig = w0.xyz;
    vBary = aBary;
    vRand = aRand;
    if (uBreak <= 0.0) return w0.xyz;
    vec3 c = (modelMatrix * vec4(aCenter, 1.0)).xyz;
    vec3 rel = w0.xyz - c;
    float tau = uBreak;
    if (uPull > 0.5) {
      float s = (11.0 + 9.0 * aRand) / max(length(c - cameraPosition), 1.0);
      c = cameraPosition + (c - cameraPosition) * s;
      rel *= s;
    }
    vec3 axis = normalize(vec3(aRand - 0.5, 0.7, fract(aRand * 7.3) - 0.5));
    rel = rot(rel, axis, tau * (1.5 + 5.0 * aRand)) * (0.9 - 0.75 * clamp(tau / 1.3, 0.0, 1.0));
    vec3 side = normalize(c - cameraPosition);
    c += vec3(side.x, 0.0, side.z) * tau * (1.0 + 3.0 * aRand) * 1.5;
    c += normalize(c - cameraPosition) * -tau * 2.0 * fract(aRand * 3.1);
    c.y -= 5.5 * tau * tau * (0.5 + aRand);
    return c + rel;
  }`;
export const SHARD_FRAG = /* glsl */ `
  varying vec3 vBary;
  float crackLine(float width) {
    float e = min(vBary.x, min(vBary.y, vBary.z));
    return 1.0 - smoothstep(width * 0.4, width, e);
  }`;
