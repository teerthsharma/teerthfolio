// THE RED CORD (a kumihimo braid, the musubi of Your Name): the long strand that runs from the pup's
// flipper across the lake, the two glowing loops, the knot that is the certificate (a trefoil at the heart of
// a musubi bow, a hanko tag hanging from it), and the wrap that stays on the flipper. The strand and the
// loops are shaped in the vertex shader from a few uniforms (nothing is rebuilt per frame); the braid is a
// chevron weave in the fragment.

import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, ShaderMaterial, TorusGeometry, TorusKnotGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DISSOLVE, OUT, g3 } from "./gl";

// a tube's own grid: u along (0..1), v around (0..1)
export function tubeGrid(nu, nv) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      pos.push(0, 0, 0);
      uv.push(i / nu, j / nv);
    }
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j;
      const b = a + nv + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return { pos, uv, idx };
}
export function gridGeometry(nu, nv) {
  const t = tubeGrid(nu, nv);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(t.pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(t.uv), 2));
  g.setIndex(t.idx);
  g.boundingSphere = null;
  return g;
}

const BRAID = /* glsl */ `
  // a chevron weave: stripes that turn at the cord's two sides, deep crimson to hot vermilion
  vec3 braid(float along, float around, float k) {
    float v = abs(fract(around * 2.0) * 2.0 - 1.0);
    float ph = fract(along * k + v * 0.55);
    float st = smoothstep(0.0, 0.18, ph) * (1.0 - smoothstep(0.55, 0.78, ph));
    float seam = smoothstep(0.0, 0.07, ph) * (1.0 - smoothstep(0.07, 0.16, ph));
    vec3 c = mix(${g3("#6a0a1c")}, ${g3("#ff3c4e")}, st);
    c += ${g3("#ffb4a0")} * seam * 0.35;
    return c;
  }`;

const FRAG_CORE = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec2 vUv;
  uniform vec3 uSun;
  uniform float uTime, uBraid, uGlow, uTw, uAlpha;
  ${BRAID}
  ${DISSOLVE}
  void main() {
    vec3 V = normalize(vW - cameraPosition);
    vec3 n = normalize(vN);
    vec3 c = braid(vUv.x, vUv.y, uBraid);
    float fr = pow(1.0 - clamp(abs(dot(n, V)), 0.0, 1.0), 2.0);
    float lit = 0.55 + 0.45 * clamp(dot(n, normalize(uSun + vec3(0.0, 0.5, 0.2))) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = c * (0.7 + 0.5 * lit) + ${g3("#ff7a6a")} * (0.25 + 0.5 * uGlow) + ${g3("#ffd6a8")} * fr * 0.5 * (0.4 + uGlow);
    col *= 1.0 - uTw * 0.25;
    float e = dissolveEdge(clamp(length(vW - cameraPosition) / 230.0, 0.0, 1.0) * 0.9 - 0.05);
    col += e * ${g3("#ffd6a0")} * 1.5;
    gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
  }`;
const FRAG_HALO = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec2 vUv;
  uniform float uTime, uGlow, uAlpha;
  void main() {
    vec3 V = normalize(vW - cameraPosition);
    float f = pow(1.0 - clamp(abs(dot(normalize(vN), V)), 0.0, 1.0), 1.6);
    float a = f * uGlow * uAlpha;
    vec3 col = mix(${g3("#ff3a50")}, ${g3("#ffc890")}, f * 0.5);
    gl_FragColor = vec4(pow(col, vec3(2.2)), a);
  }`;

// THE STRAND: a cubic bezier from the flipper to the far end; its radius grows with distance so the cord
// holds a few pixels across the lake; it floats, flutters, and draws on from the pup's end
const STRAND_VERT = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec2 vUv;
  uniform vec3 uP0, uP1, uP2, uP3;
  uniform float uGrow, uFlut, uRad, uPersp, uTime, uBraid, uShell;
  vec3 bez(float t) { float s = 1.0 - t; return s * s * s * uP0 + 3.0 * s * s * t * uP1 + 3.0 * s * t * t * uP2 + t * t * t * uP3; }
  vec3 dbez(float t) { float s = 1.0 - t; return 3.0 * s * s * (uP1 - uP0) + 6.0 * s * t * (uP2 - uP1) + 3.0 * t * t * (uP3 - uP2); }
  void main() {
    float u = uv.x * uGrow;
    vec3 P = bez(u);
    vec3 T = normalize(dbez(max(u, 0.001)));
    vec3 up = abs(T.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 Nn = normalize(cross(up, T));
    vec3 Bn = cross(T, Nn);
    float env = sin(3.14159 * clamp(u, 0.0, 1.0));
    P += Nn * sin(u * 28.0 - uTime * 3.2) * 0.16 * uFlut * env + Bn * sin(u * 19.0 - uTime * 2.3 + 1.0) * 0.1 * uFlut * env;
    vec4 wp = modelMatrix * vec4(P, 1.0);
    float d = length(wp.xyz - cameraPosition);
    float r = uRad * (1.0 + d * uPersp) * uShell;
    float a = uv.y * 6.28318;
    vec3 off = cos(a) * Nn + sin(a) * Bn;
    vec3 pos = P + off * r;
    vUv = vec2(uv.x * uGrow, uv.y);
    vW = (modelMatrix * vec4(pos, 1.0)).xyz;
    vN = normalize(mat3(modelMatrix) * off);
    gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
  }`;

export function strand(U, nu = 220) {
  const base = {
    ...U,
    uP0: { value: new Vector3() }, uP1: { value: new Vector3() }, uP2: { value: new Vector3() }, uP3: { value: new Vector3() },
    uGrow: { value: 0 }, uFlut: { value: 1 }, uRad: { value: 0.04 }, uPersp: { value: 0.0065 }, uBraid: { value: 170 }, uGlow: { value: 0.5 }, uShell: { value: 1 }, uAlpha: { value: 1 },
  };
  const g = gridGeometry(nu, 8);
  const core = new ShaderMaterial({ uniforms: base, vertexShader: STRAND_VERT, fragmentShader: FRAG_CORE });
  const shellU = { ...base, uShell: { value: 3.4 }, uGlow: { value: 0.75 } };
  const halo = new ShaderMaterial({ uniforms: shellU, vertexShader: STRAND_VERT, fragmentShader: FRAG_HALO, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
  return { g, core, halo, U: base, shellU };
}

// THE LOOPS: an ellipse in the plane of (A, E), a tube about it; rx along E, ry along A
const LOOP_VERT = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec2 vUv;
  uniform vec3 uC, uA, uE;
  uniform float uRx, uRy, uTube, uPersp, uBraid, uShell, uScale;
  void main() {
    float th = uv.x * 6.28318;
    vec3 Nm = normalize(cross(uA, uE));
    vec3 P = uC + (uA * uRy * cos(th) + uE * uRx * sin(th)) * uScale;
    vec3 Tg = normalize(-uA * uRy * sin(th) + uE * uRx * cos(th));
    vec3 Out = normalize(uA * uRx * cos(th) + uE * uRy * sin(th));
    vec4 wp = modelMatrix * vec4(P, 1.0);
    float d = length(wp.xyz - cameraPosition);
    float r = uTube * (1.0 + d * uPersp) * uShell * uScale;
    float a = uv.y * 6.28318;
    vec3 off = cos(a) * Out + sin(a) * Nm;
    vec3 pos = P + off * r;
    vUv = uv;
    vW = (modelMatrix * vec4(pos, 1.0)).xyz;
    vN = normalize(mat3(modelMatrix) * off);
    gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
  }`;

export function loop(U, grid) {
  const base = {
    ...U,
    uC: { value: new Vector3() }, uA: { value: new Vector3(1, 0, 0) }, uE: { value: new Vector3(0, 1, 0) },
    uRx: { value: 0.8 }, uRy: { value: 0.8 }, uTube: { value: 0.07 }, uPersp: { value: 0.0 }, uBraid: { value: 22 }, uShell: { value: 1 }, uScale: { value: 0 }, uGlow: { value: 0.8 }, uAlpha: { value: 1 },
  };
  const core = new ShaderMaterial({ uniforms: base, vertexShader: LOOP_VERT, fragmentShader: FRAG_CORE });
  const shellU = { ...base, uShell: { value: 3.2 } };
  const halo = new ShaderMaterial({ uniforms: shellU, vertexShader: LOOP_VERT, fragmentShader: FRAG_HALO, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
  return { core, halo, U: base, shellU, g: grid };
}

// THE KNOT (the certificate): a musubi bow, two loops and two tails round a trefoil, braided cord
export function knotGeometry() {
  const tube = (pts, closed, r, seg = 40) => new TubeGeometry(new CatmullRomCurve3(pts.map((p) => new Vector3(p[0], p[1], p[2])), closed, "catmullrom", 0.5), seg, r, 7, closed);
  const loopPts = [[-0.08, 0.02, 0], [-0.24, 0.2, 0.02], [-0.46, 0.28, 0], [-0.6, 0.1, -0.02], [-0.5, -0.12, 0], [-0.3, -0.13, 0.02], [-0.13, -0.04, 0]];
  const mirror = (pts) => pts.map(([x, y, z]) => [-x, y, z]);
  const parts = [
    new TorusKnotGeometry(0.11, 0.05, 72, 8, 2, 3),
    tube(loopPts, true, 0.034),
    tube(mirror(loopPts), true, 0.034),
    tube([[-0.05, -0.08, 0], [-0.15, -0.3, 0.03], [-0.1, -0.56, 0], [-0.22, -0.78, 0.04]], false, 0.032, 24),
    tube([[0.05, -0.08, 0], [0.17, -0.28, -0.03], [0.1, -0.5, 0], [0.24, -0.7, -0.04]], false, 0.032, 24),
  ];
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}
export function knotMaterial(U) {
  const base = { ...U, uBraid: { value: 8 }, uGlow: { value: 1.2 }, uAlpha: { value: 1 }, uPop: { value: 0 } };
  const vert = /* glsl */ `
    varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    uniform float uPop;
    void main() {
      vUv = uv;
      vec4 w = modelMatrix * vec4(position * uPop, 1.0);
      vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const core = new ShaderMaterial({ uniforms: base, vertexShader: vert, fragmentShader: FRAG_CORE, side: DoubleSide });
  const haloU = { ...base, uGlow: { value: 0.9 } };
  const halo = new ShaderMaterial({
    uniforms: haloU,
    vertexShader: vert.replace("position * uPop", "position * uPop * 1.07"),
    fragmentShader: FRAG_HALO,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: BackSide,
  });
  return { core, halo, U: base, haloU };
}

// the hanko tag that hangs from the knot: cream paper, ink lines, a vermilion seal with two linked rings
export function tagTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 192;
  const x = c.getContext("2d");
  x.fillStyle = "#f6efe2";
  x.fillRect(0, 0, 128, 192);
  x.strokeStyle = "#2a1c30";
  x.lineWidth = 5;
  x.strokeRect(5, 5, 118, 182);
  x.lineWidth = 4;
  x.lineCap = "round";
  for (const y of [28, 46, 64]) {
    x.beginPath();
    x.moveTo(22, y);
    x.lineTo(106 - (y % 3) * 12, y);
    x.stroke();
  }
  x.fillStyle = "#d8362c";
  x.beginPath();
  x.arc(64, 124, 36, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "#f6efe2";
  x.lineWidth = 6;
  x.beginPath();
  x.arc(52, 124, 15, 0, Math.PI * 2);
  x.stroke();
  x.beginPath();
  x.arc(76, 124, 15, 0, Math.PI * 2);
  x.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
export const tagGeometry = () => new PlaneGeometry(0.3, 0.45).translate(0, -0.2, 0);
export const tagMaterial = (map) => new MeshBasicMaterial({ map, toneMapped: false, side: DoubleSide });

// THE WRAP: two turns of cord round the flipper, a small knot, two tassels. It stays on the pup after the
// scene (the cord "stays tied"), lit like the pup itself, with a warm glow of its own.
export function wrapParts() {
  const turn = (x, r) => new TorusGeometry(r, 0.026, 7, 26).rotateY(Math.PI / 2).scale(1, 0.52, 1).translate(x, 0, 0);
  const tail = (dz, len) => new TubeGeometry(new CatmullRomCurve3([new Vector3(0.5, 0.075, 0), new Vector3(0.52, 0.0, dz), new Vector3(0.55, -len * 0.5, dz * 1.4), new Vector3(0.57, -len, dz * 1.2)]), 16, 0.02, 6, false);
  const g = mergeGeometries([turn(0.4, 0.165), turn(0.46, 0.155), new TorusKnotGeometry(0.045, 0.02, 40, 6, 2, 3).translate(0.5, 0.1, 0), tail(0.05, 0.28), tail(-0.05, 0.2)]);
  const m = new MeshStandardMaterial({ color: "#d0243a", emissive: "#ff2038", emissiveIntensity: 0.42, roughness: 0.5, metalness: 0.0 });
  return { g, m };
}
