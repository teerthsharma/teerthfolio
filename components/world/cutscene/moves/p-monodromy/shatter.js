// THE WORLD CRACKS AND REASSEMBLES, all in the canvas (the DOM never moves). The Arabian frame is rendered once to a
// texture and laid on ~40 triangular shards (a jittered grid, triangulated) that fill the whole view in clip space;
// baal's blue light runs along their edges outward from the bolt's impact, then they fall and tumble into the dark.
// The island, rendered once to a second texture, flies back in on the same shards and locks; a ring shockwave
// leaves the pup as the last one lands. Geometry, targets and uniforms are built once at mount: a frame only writes
// uniforms.

import { HalfFloatType, InstancedBufferAttribute, InstancedBufferGeometry, Float32BufferAttribute, Mesh, PlaneGeometry, ShaderMaterial, Vector2, WebGLRenderTarget } from "three";

const COLS = 5;
const ROWS = 4; // 5 x 4 cells, two triangles each: 40 shards
const hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// `impact`: the bolt's strike on the screen, in NDC. Rank 0 is the shard under it, 1 the farthest.
function shardGeometry(impact) {
  const pts = [];
  for (let j = 0; j <= ROWS; j++)
    for (let i = 0; i <= COLS; i++) {
      const edge = i === 0 || j === 0 || i === COLS || j === ROWS;
      pts.push([-1 + (2 * i) / COLS + (edge ? 0 : (hash(i, j) - 0.5) * 0.26), -1 + (2 * j) / ROWS + (edge ? 0 : (hash(j, i + 9) - 0.5) * 0.3)]);
    }
  const at = (i, j) => pts[j * (COLS + 1) + i];
  const tris = [];
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < COLS; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      if ((i + j) % 2) tris.push([a, b, c], [a, c, d]);
      else tris.push([a, b, d], [b, c, d]);
    }
  const n = tris.length;
  const g = new InstancedBufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 2, 0, 0], 3)); // x: which corner
  const A = new Float32Array(n * 2), B = new Float32Array(n * 2), C = new Float32Array(n * 2), info = new Float32Array(n * 4);
  const dist = tris.map(([a, b, c]) => Math.hypot((a[0] + b[0] + c[0]) / 3 - impact.x, (a[1] + b[1] + c[1]) / 3 - impact.y));
  const far = Math.max(...dist);
  tris.forEach(([a, b, c], k) => {
    A.set(a, k * 2);
    B.set(b, k * 2);
    C.set(c, k * 2);
    info.set([dist[k] / far, hash(k, 1), hash(k, 2), hash(k, 3)], k * 4);
  });
  g.setAttribute("aA", new InstancedBufferAttribute(A, 2));
  g.setAttribute("aB", new InstancedBufferAttribute(B, 2));
  g.setAttribute("aC", new InstancedBufferAttribute(C, 2));
  g.setAttribute("aInfo", new InstancedBufferAttribute(info, 4));
  g.instanceCount = n;
  return g;
}

const VERT = /* glsl */ `
  attribute vec2 aA, aB, aC;
  attribute vec4 aInfo;
  uniform float uMode, uK, uCrack, uAspect;
  varying vec2 vUv;
  varying vec3 vBary;
  varying float vShade, vEdge, vDark, vSeed;
  vec2 rot(vec2 q, float a) { float c = cos(a), s = sin(a); return vec2(c * q.x - s * q.y, s * q.x + c * q.y); }
  void main() {
    int ci = int(position.x + 0.5);
    vec2 P = ci == 0 ? aA : (ci == 1 ? aB : aC);
    vBary = vec3(ci == 0 ? 1.0 : 0.0, ci == 1 ? 1.0 : 0.0, ci == 2 ? 1.0 : 0.0);
    vUv = P * 0.5 + 0.5;
    vec2 cen = (aA + aB + aC) / 3.0;
    vec2 asp = vec2(uAspect, 1.0);
    float gap = 1.0, k = 0.0, flip = 1.0, ang = 0.0, grow = 1.0;
    vec2 off = vec2(0.0);
    vShade = 1.0; vDark = 0.0;
    vSeed = aInfo.y;
    // the blue light runs out from the impact: the shard's edges catch it when the front reaches it
    vEdge = smoothstep(aInfo.x, aInfo.x + 0.14, uCrack * 1.3);
    if (uMode < 0.5) {
      gap = 1.0 - 0.012 * vEdge * (1.0 - step(0.001, uK));
      k = clamp((uK - aInfo.x * 0.4) / 0.6, 0.0, 1.0);
      float fall = k * k;
      off = vec2((aInfo.y - 0.5) * 0.7 * k, -fall * (2.4 + 1.2 * aInfo.z) + k * 0.12);
      ang = (aInfo.w - 0.5) * 6.0 * k;
      float tum = k * (2.0 + aInfo.y * 5.0);
      flip = cos(tum);
      grow = 1.0 - 0.4 * k;
      vDark = k;
      vEdge = max(vEdge, k * 0.9);
    } else {
      float k0 = clamp((uK - aInfo.y * 0.42) / 0.58, 0.0, 1.0);
      float e = 1.0 - pow(1.0 - k0, 3.0);
      float back = 1.0 - e;
      vec2 dir = normalize(cen + vec2(0.0013, 0.0007));
      off = (dir * (1.7 + aInfo.z * 0.9) + vec2(0.0, (aInfo.w - 0.5) * 0.7)) * back;
      ang = (aInfo.w - 0.5) * 7.0 * back;
      flip = cos(back * (2.0 + aInfo.z * 5.0));
      grow = 1.0 + 0.35 * back;
      vDark = back * 0.6;
      // the lock: a flash on the shard's edges the moment it lands, then it fades
      float lt = uK - (aInfo.y * 0.42 + 0.58);
      vEdge = lt >= 0.0 ? exp(-lt * 10.0) : smoothstep(0.55, 1.0, k0) * 0.5;
    }
    vec2 q = (P - cen) * asp;
    q = rot(vec2(q.x * flip, q.y), ang) * grow * gap;
    vShade = flip < 0.0 ? 0.4 : 1.0;
    vec2 pos = (q / asp) + cen + off;
    gl_Position = vec4(pos, 0.0, 1.0);
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vBary;
  varying float vShade, vEdge, vDark, vSeed;
  void main() {
    vec3 col = texture2D(uTex, vUv).rgb * vShade * (1.0 - 0.8 * vDark);
    float e = min(min(vBary.x, vBary.y), vBary.z);
    float w = max(fwidth(e) * 2.2, 1e-4);
    float line = 1.0 - smoothstep(0.0, w, e);
    float core = 1.0 - smoothstep(0.0, w * 0.35, e);
    float gold = step(0.5, fract(vSeed * 7.3 + floor(uTime * 14.0) * 0.37)); // gold and blue glints, flickering
    vec3 lit = mix(vec3(0.35, 0.72, 1.0), vec3(1.0, 0.8, 0.34), gold * smoothstep(0.3, 0.9, vDark + vEdge * 0.4));
    col += lit * line * vEdge * 1.5 + vec3(0.9, 0.97, 1.0) * core * vEdge * 0.8;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// one full-screen pass: the dark behind the shards, or (RING) the shockwave in front of them
const VEIL_FRAG = /* glsl */ `
  uniform float uAspect, uAmt, uTime;
  uniform vec2 uC;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    #ifdef RING
      vec2 d = p - uC;
      float r = length(d);
      float R = uAmt * 1.5;
      float body = exp(-pow((r - R) / 0.045, 2.0)) * (1.0 - uAmt);
      float halo = exp(-pow((r - R) / 0.2, 2.0)) * (1.0 - uAmt) * 0.3;
      vec3 col = mix(vec3(0.4, 0.75, 1.0), vec3(1.0, 0.85, 0.45), exp(-pow((r - R) / 0.02, 2.0)));
      float a = clamp(body + halo, 0.0, 1.0) * step(0.0001, uAmt);
      gl_FragColor = vec4(col, a);
    #else
      float v = length(p) * 0.9;
      vec3 col = vec3(0.012, 0.016, 0.04) + vec3(0.02, 0.04, 0.09) * (1.0 - v);
      gl_FragColor = vec4(col, uAmt);
    #endif
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const VEIL_VERT = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

function flat(m) {
  m.transparent = true;
  m.depthTest = false;
  m.depthWrite = false;
  return m;
}

export function shatter(impact) {
  const U = { uMode: { value: 0 }, uK: { value: 0 }, uCrack: { value: 0 }, uAspect: { value: 1.6 }, uTex: { value: null }, uTime: { value: 0 } };
  const shardM = flat(new ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG }));
  const geo = shardGeometry(impact);
  const shards = new Mesh(geo, shardM);
  const dark = flat(new ShaderMaterial({ uniforms: { uAspect: U.uAspect, uAmt: { value: 1 }, uC: { value: new Vector2() }, uTime: U.uTime }, vertexShader: VEIL_VERT, fragmentShader: VEIL_FRAG }));
  const ring = flat(new ShaderMaterial({ uniforms: { uAspect: U.uAspect, uAmt: { value: 0 }, uC: { value: new Vector2() }, uTime: U.uTime }, defines: { RING: 1 }, vertexShader: VEIL_VERT, fragmentShader: VEIL_FRAG }));
  const plane = new PlaneGeometry(2, 2);
  const veil = new Mesh(plane, dark);
  const wave = new Mesh(plane, ring);
  shards.renderOrder = 91;
  veil.renderOrder = 90;
  wave.renderOrder = 92;
  for (const o of [shards, veil, wave]) {
    o.frustumCulled = false;
    o.visible = false;
  }
  const mk = () => new WebGLRenderTarget(2, 2, { type: HalfFloatType, samples: 4, depthBuffer: true });
  const old = mk();
  const next = mk();
  const SZ = new Vector2();
  // render `scene` into target `rt` (sized to the canvas on first use); the overlays must be hidden by the caller
  function grab(gl, scene, camera, rt) {
    gl.getDrawingBufferSize(SZ);
    if (rt.width !== SZ.x || rt.height !== SZ.y) rt.setSize(SZ.x, SZ.y);
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(rt);
    gl.render(scene, camera);
    gl.setRenderTarget(prev);
  }
  return {
    shards, veil, wave, old, next, U, grab, dark, ring,
    hide() {
      shards.visible = veil.visible = wave.visible = false;
    },
    dispose() {
      geo.dispose();
      plane.dispose();
      for (const x of [shardM, dark, ring, old, next]) x.dispose();
    },
  };
}
