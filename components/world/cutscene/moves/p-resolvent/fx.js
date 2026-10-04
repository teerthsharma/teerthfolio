// THE LIGHT AND THE MOTION: billboard sprites (soft discs, four-point glints) for
// motes, dust and glows; autumn leaves and the castle's lifting stones (cel,
// instanced); Aura's violet flame; the pup's silver-gold mana column; the rings
// of force on the ground; the golden shards of the scale. Everything is a mesh
// built once; the move writes matrices into pooled instances (nothing allocates
// per frame, no post pass).

import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, NormalBlending, PlaneGeometry, ShaderMaterial, TetrahedronGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { NOISE, U, hash, inst, join, part } from "./toon";

// ---- sprites: shape 0 a soft disc, 1 a four-point glint, 2 a flat ring on the ground
function spriteMaterial(additive, shape) {
  return new ShaderMaterial({
    uniforms: { uShape: { value: shape }, uDis: U.uDis },
    transparent: true,
    depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      uniform float uShape;
      varying vec2 vUv;
      varying vec3 vC;
      varying float vA;
      void main() {
        vUv = uv * 2.0 - 1.0;
        vC = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #endif
        vA = aAlpha;
        vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float size = length(instanceMatrix[0].xyz);
        vec3 p;
        if (uShape > 1.5) {
          p = c.xyz + vec3(position.x, 0.0, -position.y) * size;
        } else {
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
          vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          p = c.xyz + (right * position.x + up * position.y) * size;
        }
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uShape, uDis;
      varying vec2 vUv;
      varying vec3 vC;
      varying float vA;
      void main() {
        float r = length(vUv);
        float a;
        if (uShape < 0.5) a = pow(max(1.0 - r, 0.0), 1.6);
        else if (uShape < 1.5) a = pow(max(1.0 - r, 0.0), 2.0) * 0.6 + (1.0 / (1.0 + 90.0 * abs(vUv.x * vUv.y))) * (1.0 - r);
        else a = smoothstep(0.78, 0.94, r) * (1.0 - smoothstep(0.94, 1.0, r)) + (1.0 - smoothstep(0.55, 0.98, r)) * 0.12;
        a *= vA;
        if (a < 0.003) discard;
        ${additive ? "gl_FragColor = vec4(pow(vC, vec3(2.2)) * a, 1.0);" : "gl_FragColor = vec4(pow(vC, vec3(2.2)), a);"}
      }`,
  });
}
export function sprites(n, { additive = true, shape = 0, colors = ["#ffffff"] } = {}) {
  const geo = new PlaneGeometry(1, 1);
  geo.setAttribute("aAlpha", new InstancedBufferAttribute(new Float32Array(n).fill(1), 1));
  const mesh = inst(geo, spriteMaterial(additive, shape), n);
  const c = new Color();
  for (let i = 0; i < n; i++) mesh.setColorAt(i, c.setRGB(...rgb255(colors[i % colors.length])));
  mesh.renderOrder = additive ? 6 : 5;
  return mesh;
}
// sRGB picks (the sprite shaders write pow 2.2): hex straight to 0..1, no colour management
function rgb255(h) {
  return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
}

// ---- autumn leaves: a kite of a leaf, cel lit, tinted per instance
export function leaves(n, mat) {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array([0, 0.5, 0, 0.27, 0.05, 0, 0, -0.5, 0, -0.27, 0.05, 0]), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  const geo = part(g, "#ffffff", { sway: 0 });
  const mesh = inst(geo, mat, n);
  const palette = ["#b84a22", "#e08a2e", "#f0b840", "#9e2f26", "#d8702a", "#c89a30", "#e9a23b"];
  const c = new Color();
  for (let i = 0; i < n; i++) mesh.setColorAt(i, c.setRGB(...rgb255(palette[i % palette.length])));
  return mesh;
}

// ---- the castle's stones, which lift
export function stones(n, mat) {
  const geo = part(new IcosahedronGeometry(0.5, 0).scale(1.25, 0.8, 1), "#d0b48a", { kind: 1, flat: true });
  const mesh = inst(geo, mat, n);
  const c = new Color();
  const tones = ["#d0b48a", "#c2a47c", "#d8bd94", "#b8a088", "#c9a77a"];
  for (let i = 0; i < n; i++) mesh.setColorAt(i, c.setRGB(...rgb255(tones[i % tones.length])));
  return mesh;
}

// ---- the golden shards of the scale
export function shards(n, mat) {
  const geo = part(new TetrahedronGeometry(0.5, 0).scale(0.8, 1.3, 0.35), "#f3c04e", { kind: 3, flat: true });
  return inst(geo, mat, n);
}

// ---- Aura's flame: violet tongues, a white-lilac heart
export function flame() {
  const B = 7;
  const parts = [];
  for (let b = 0; b < B; b++) {
    const g = new PlaneGeometry(1, 1, 3, 14);
    const p = g.attributes.position;
    const w = 0.34 + 0.26 * hash(b, 1);
    const lean = (hash(b, 2) - 0.5) * 0.9;
    for (let i = 0; i < p.count; i++) {
      const k = p.getY(i) + 0.5; // 0 base .. 1 tip
      const prof = Math.sin(Math.min(1, k * 1.15 + 0.08) * Math.PI * 0.5) * (1 - k) ** 0.7 * 1.3;
      p.setX(i, p.getX(i) * w * prof);
      p.setZ(i, lean * k * k);
      p.setY(i, k * (0.7 + 0.35 * hash(b, 3)));
    }
    g.rotateY((b / B) * Math.PI + hash(b, 4) * 0.4);
    g.setAttribute("aPhase", new BufferAttribute(new Float32Array(p.count).fill(b + hash(b, 5) * 3), 1));
    parts.push(g);
  }
  const geo = mergeGeometries(parts);
  const mat = new ShaderMaterial({
    uniforms: { uTime: U.uTime, uK: { value: 0 }, uDis: U.uDis },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aPhase;
      uniform float uTime, uK;
      varying vec2 vUv;
      varying float vP;
      void main() {
        vUv = uv;
        vP = aPhase;
        vec3 p = position;
        float k = uv.y;
        p.xz += vec2(sin(uTime * 2.7 + aPhase * 2.0 + k * 4.0), cos(uTime * 2.1 + aPhase * 3.0 + k * 3.0)) * 0.16 * k * k;
        p.y *= uK;
        p.xz *= mix(1.0, uK, 0.6);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uDis;
      varying vec2 vUv;
      varying float vP;
      ${NOISE}
      void main() {
        float k = vUv.y;
        float n = vn(vec2(vUv.x * 5.0 + vP * 3.0, k * 3.0 - uTime * 2.2));
        float a = smoothstep(k * 0.9, k * 0.9 + 0.3, n + 0.34) * (1.0 - smoothstep(0.55, 1.0, k)) * smoothstep(0.0, 0.06, k);
        vec3 deep = vec3(0.30, 0.12, 0.72);
        vec3 mid = vec3(0.62, 0.30, 1.0);
        vec3 hot = vec3(0.95, 0.72, 1.0);
        vec3 c = mix(hot, mix(mid, deep, smoothstep(0.25, 0.8, k)), smoothstep(0.0, 0.3, k));
        gl_FragColor = vec4(pow(c, vec3(2.2)) * a * 0.62 * (1.0 - clamp(uDis * 2.0, 0.0, 1.0)), 1.0);
      }`,
  });
  return { g: geo, m: mat };
}

// ---- the mana column: a narrow cylinder of light, brightest down its middle and soft to nothing at its
// edge (the falloff is the surface's own turn from the lens, so there is no seam to see), streaks running up it.
// Gold round the outside, silver in the core; it lights only a few metres round it, and the court darkens round it.
function columnMat(core) {
  return new ShaderMaterial({
    uniforms: { uTime: U.uTime, uA: { value: 0 }, uDis: U.uDis },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying float vH;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vH = position.y;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uA, uDis;
      varying float vH;
      varying vec3 vN;
      varying vec3 vW;
      ${NOISE}
      void main() {
        vec3 v = normalize(cameraPosition - vW);
        vec3 n = normalize(vN);
        float f = abs(dot(n, v));
        vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), v));
        float s = dot(n, side); // -1 .. 1 across the column as the lens sees it
        float y = vW.y;
        float s1 = vn(vec2(s * 4.5 + sin(y * 0.22 + uTime * 0.8) * 0.8, y * 0.16 - uTime * ${core ? "5.0" : "3.2"}));
        float s2 = vn(vec2(s * 9.0 + 7.0, y * 0.4 - uTime * ${core ? "8.0" : "5.5"}));
        float streak = smoothstep(0.3, 0.85, s1 * 0.7 + s2 * 0.45);
        float body = pow(f, ${core ? "1.7" : "2.6"});
        float a = body * (${core ? "0.45" : "0.2"} + streak * ${core ? "0.8" : "0.55"}) * (1.0 - smoothstep(0.35, 1.0, vH)) * smoothstep(0.0, 0.03, vH);
        vec3 silver = vec3(0.88, 0.94, 1.0);
        vec3 gold = vec3(1.0, 0.76, 0.34);
        vec3 c = ${core ? "mix(silver, vec3(1.0, 0.93, 0.78), streak * 0.5)" : "mix(gold, vec3(0.95, 0.85, 0.7), smoothstep(0.0, 0.8, vH) * 0.5)"};
        gl_FragColor = vec4(pow(c, vec3(2.2)) * a * uA * (1.0 - clamp(uDis * 2.4, 0.0, 1.0)), 1.0);
      }`,
  });
}
export function column() {
  const g = new CylinderGeometry(1, 1, 1, 40, 1, true).translate(0, 0.5, 0);
  return { g, outer: columnMat(false), inner: columnMat(true) };
}

// a soft-edged flash quad held in front of the lens (tinted, never white)
export function flashQuad() {
  const g = new PlaneGeometry(1, 1);
  const m = new ShaderMaterial({
    uniforms: { uO: { value: 0 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform float uO; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 1.6; gl_FragColor = vec4(pow(vec3(1.0, 0.86, 0.55), vec3(2.2)), uO * (0.55 + 0.45 * r)); }",
  });
  return { g, m };
}

export { join };
