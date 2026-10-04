// THE PRACTICAL EFFECTS of the miniature set. Nothing here is a post pass and nothing allocates per frame.
//   S5 practical fire: alpha-tested amber gel cards, additive, swapping between 4 hand-cut flame shapes
//      on twos (one instanced mesh for the Balrog's fire, its sword edge and the three coral lashes).
//   glass: the two mint gate walls and the staff's crystal (the only gloss in the scene, with the gem).
//   emit: cinders, dust, sparks, burst stars, shock rings: one additive instanced material.
//   glow planes: the ember at the end of the chasm and the floor of it, the doorway's light, the parry halo.
//   the slate: the clapperboard that calls the wrap (the return home).

import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, InstancedBufferAttribute, InstancedMesh, Object3D, OctahedronGeometry, PlaneGeometry, SRGBColorSpace, ShaderMaterial, Vector3,
} from "three";
import { REVEAL, U, hash, lin } from "./clay";

const D = new Object3D();
const BLACK = new Color(0, 0, 0);

// ---------------------------------------------------------------- the backdrop and the glow planes
export function skyMaterial() {
  return new ShaderMaterial({
    uniforms: { ...U },
    side: DoubleSide,
    depthWrite: false,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      uniform vec3 uFog;
      varying vec3 vW;
      ${REVEAL}
      void main() {
        float cut = revealCut(vW);
        vec3 d = normalize(vW - cameraPosition);
        vec3 top = vec3(0.012, 0.007, 0.02);
        vec3 col = mix(uFog * 0.9, top, smoothstep(0.02, 0.55, d.y));
        col = mix(col, vec3(0.16, 0.05, 0.02), smoothstep(0.0, -0.45, d.y));
        col += uRimCol * cut * 1.4;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// colA at the bottom (uv.y 0) or the centre, colB at the top or the rim; uAlpha scales the whole thing
export function glowMaterial({ a, b, radial = false, additive = true }) {
  return new ShaderMaterial({
    uniforms: { ...U, uColA: { value: lin(a) }, uColB: { value: lin(b) }, uAlpha: { value: 1 }, uPulse: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: additive ? AdditiveBlending : 1,
    defines: radial ? { RADIAL: 1 } : {},
    vertexShader: "varying vec2 vUv; varying vec3 vW; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      uniform vec3 uColA, uColB;
      uniform float uAlpha, uPulse;
      varying vec2 vUv;
      varying vec3 vW;
      ${REVEAL}
      void main() {
        float cut = revealCut(vW);
        #ifdef RADIAL
          float r = length(vUv * 2.0 - 1.0);
          float k = pow(max(1.0 - r, 0.0), 1.6);
          vec3 col = mix(uColB, uColA, k) * k;
        #else
          float k = pow(1.0 - vUv.y, 1.7);
          vec3 col = mix(uColB, uColA, k) * k * (1.0 + 0.35 * uPulse);
        #endif
        col *= uAlpha;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// ---------------------------------------------------------------- the glass (gates, crystal)
export function glassMaterial(hex = "#6ff0c4") {
  return new ShaderMaterial({
    uniforms: { ...U, uColor: { value: lin(hex) }, uAlpha: { value: 1 }, uGlow: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vP;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz; vP = position; vUv = uv;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAlpha, uGlow, uStep;
      varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vP;
      ${REVEAL}
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float cut = revealCut(vW);
        vec3 N = normalize(vN);
        if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW);
        float fr = pow(1.0 - abs(dot(N, V)), 2.0);
        float edge = 1.0 - smoothstep(0.0, 0.07, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
        // frosted facets, redrawn each pose
        float fac = h21(floor(vP.yz * 5.0) + uStep * 0.37) * 0.12;
        float a = (0.2 + 0.5 * fr + 0.55 * edge + fac + 0.3 * uGlow) * uAlpha;
        vec3 col = uColor * (0.55 + 0.9 * fr + 0.8 * edge + 0.9 * uGlow) + vec3(0.08, 0.1, 0.09) * fac * 3.0;
        col += uRimCol * cut * 1.4;
        gl_FragColor = vec4(col, min(a, 0.95));
        #include <colorspace_fragment>
      }`,
  });
}
export function gateGeometry() {
  const g = new BoxGeometry(0.12, 2.4, 1.7, 1, 2, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0.5) {
      p.setZ(i, p.getZ(i) * 0.62);
      p.setY(i, p.getY(i) + 0.18);
    }
  }
  g.translate(0, 1.2, 0);
  g.computeVertexNormals();
  return g;
}
export function crystalGeometry() {
  return new OctahedronGeometry(0.17, 0).scale(0.7, 1.9, 0.7);
}

// ---------------------------------------------------------------- the emit family (additive, instanced)
export function emitMaterial() {
  return new ShaderMaterial({
    uniforms: { ...U },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vW; varying vec3 vC;
      void main() {
        mat4 im = mat4(1.0);
        vC = vec3(1.0);
        #ifdef USE_INSTANCING
          im = instanceMatrix;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #endif
        vec4 w = modelMatrix * im * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying vec3 vC;
      ${REVEAL}
      void main() {
        float cut = revealCut(vW);
        gl_FragColor = vec4(vC + uRimCol * cut * 0.6, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
export function burstGeometry(points = 10, inner = 0.34) {
  const pos = [];
  for (let i = 0; i < points * 2; i++) {
    const a0 = (i / (points * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (points * 2)) * Math.PI * 2;
    const r0 = i % 2 ? inner : 1;
    const r1 = (i + 1) % 2 ? inner : 1;
    pos.push(0, 0, 0, Math.cos(a0) * r0, Math.sin(a0) * r0, 0, Math.cos(a1) * r1, Math.sin(a1) * r1, 0);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  return g;
}
export function instanced(geometry, material, n) {
  const m = new InstancedMesh(geometry, material, n);
  m.frustumCulled = false;
  for (let i = 0; i < n; i++) {
    m.setColorAt(i, BLACK);
    hideI(m, i);
  }
  return m;
}
export function hideI(m, i) {
  D.position.set(0, -80, 0);
  D.rotation.set(0, 0, 0);
  D.scale.setScalar(0.0001);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export function putI(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export function colI(m, i, r, g, b, k = 1) {
  const a = m.instanceColor.array;
  a[i * 3] = r * k;
  a[i * 3 + 1] = g * k;
  a[i * 3 + 2] = b * k;
}

// ---------------------------------------------------------------- S5: the cut flame cards
const FLAMES = [
  [[0.1, 0], [0.05, 0.3], [0.2, 0.5], [0.15, 0.75], [0.35, 0.55], [0.4, 0.9], [0.55, 1], [0.6, 0.7], [0.78, 0.82], [0.72, 0.5], [0.9, 0.35], [0.85, 0.15], [0.95, 0]],
  [[0.12, 0], [0.2, 0.25], [0.1, 0.55], [0.3, 0.65], [0.32, 0.95], [0.5, 0.72], [0.62, 0.98], [0.7, 0.6], [0.88, 0.7], [0.8, 0.3], [0.92, 0.1], [0.9, 0]],
  [[0.08, 0], [0.1, 0.35], [0.04, 0.6], [0.25, 0.7], [0.3, 0.45], [0.45, 0.85], [0.58, 1], [0.66, 0.62], [0.74, 0.9], [0.86, 0.5], [0.9, 0.2], [0.96, 0]],
  [[0.1, 0], [0.02, 0.2], [0.18, 0.42], [0.1, 0.7], [0.3, 0.62], [0.42, 1], [0.55, 0.78], [0.7, 0.88], [0.68, 0.5], [0.86, 0.58], [0.84, 0.22], [0.94, 0]],
];
let ATLAS = null;
function flameAtlas() {
  if (ATLAS) return ATLAS;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  FLAMES.forEach((pts, k) => {
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const px = k * 128 + 4 + x * 120;
      const py = 126 - y * 120;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    });
    g.closePath();
    g.fill();
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  ATLAS = t;
  return t;
}
export function disposeAtlas() {
  ATLAS?.dispose();
  ATLAS = null;
}

export function flameMaterial() {
  return new ShaderMaterial({
    uniforms: { ...U, uAtlas: { value: flameAtlas() }, uFlame: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uFlame;
      attribute float aSeed;
      varying vec3 vW; varying vec2 vUv; varying vec3 vC; varying float vK;
      void main() {
        float f = mod(floor(aSeed * 4.0) + uFlame, 4.0);
        vUv = vec2((uv.x + f) * 0.25, uv.y);
        vK = uv.y;
        vC = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #endif
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      varying vec3 vW; varying vec2 vUv; varying vec3 vC; varying float vK;
      ${REVEAL}
      void main() {
        float cut = revealCut(vW);
        float a = texture2D(uAtlas, vUv).a;
        if (a < 0.5) discard;
        vec3 col = vC * (0.62 + 0.55 * (1.0 - vK)) + vec3(0.2, 0.14, 0.05) * (1.0 - vK) * (1.0 - vK);
        col *= 0.8 + 0.2 * smoothstep(0.5, 0.95, a);
        gl_FragColor = vec4(col + uRimCol * cut * 0.5, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
export function flameMesh(n) {
  const geo = new PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const mesh = new InstancedMesh(geo, flameMaterial(), n);
  mesh.frustumCulled = false;
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) seed[i] = hash(i, 8);
  geo.setAttribute("aSeed", new InstancedBufferAttribute(seed, 1));
  for (let i = 0; i < n; i++) {
    mesh.setColorAt(i, BLACK);
    hideI(mesh, i);
  }
  return mesh;
}

// ---------------------------------------------------------------- the lashes
// a lash is a quadratic from the whip hand H to an end E, bowed up by `lift`; `r` is how much of it is out
const P = new Vector3();
export function lashPoint(H, E, lift, s, out = P) {
  const cx = (H.x + E.x) / 2;
  const cy = (H.y + E.y) / 2 + lift;
  const cz = (H.z + E.z) / 2;
  const u = 1 - s;
  return out.set(u * u * H.x + 2 * u * s * cx + s * s * E.x, u * u * H.y + 2 * u * s * cy + s * s * E.y, u * u * H.z + 2 * u * s * cz + s * s * E.z);
}

// ---------------------------------------------------------------- the slate (the wrap)
export function slateTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 400;
  const g = c.getContext("2d");
  g.fillStyle = "#1c1a1a";
  g.fillRect(0, 0, 512, 400);
  g.strokeStyle = "#f3ead8";
  g.lineWidth = 6;
  g.strokeRect(14, 14, 484, 372);
  g.fillStyle = "#f3ead8";
  g.font = "700 34px sans-serif";
  g.textAlign = "left";
  g.fillText("PROD  topograph", 36, 78);
  g.fillText("SCENE  432  THE STAND", 36, 134);
  g.fillText("TAKE  1", 36, 190);
  g.beginPath();
  g.moveTo(36, 214);
  g.lineTo(476, 214);
  g.stroke();
  g.fillStyle = "#6ff0c4";
  g.font = "800 62px sans-serif";
  g.textAlign = "center";
  g.fillText("THAT'S A WRAP", 256, 300);
  g.fillStyle = "#f3ead8";
  g.font = "600 26px sans-serif";
  g.fillText("lights out, set struck", 256, 352);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
export function stickTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 90;
  const g = c.getContext("2d");
  g.fillStyle = "#1c1a1a";
  g.fillRect(0, 0, 512, 90);
  g.fillStyle = "#f3ead8";
  for (let i = -1; i < 9; i++) {
    g.beginPath();
    g.moveTo(i * 64, 90);
    g.lineTo(i * 64 + 40, 0);
    g.lineTo(i * 64 + 72, 0);
    g.lineTo(i * 64 + 32, 90);
    g.closePath();
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

