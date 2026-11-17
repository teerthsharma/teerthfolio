// Academy City's cel look: three hard bands, a cool blue shade, an ink line. Every surface writes alpha 0.99 (the page's object id).

import { BufferAttribute, Color, DoubleSide, FrontSide, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { tone } from "../tone.js";

export const hex3 = (h) => new Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
export const rgb = (h) => hex3(h).toArray();

export const INK = "#1d3f9a";
export const HAZE = "#d9e7f6";
export const SUN_RIG = new Vector3(-0.5, 0.74, 0.45).normalize();

export function celUniforms() {
  return {
    uSun: { value: SUN_RIG.clone() },
    uHaze: { value: hex3(HAZE) },
    uInk: { value: hex3(INK) },
    uFog: { value: [38, 150] },
    uTime: { value: 0 },
    uFlat: { value: 0 },
  };
}

export function part(g, color, kind = 0, tall = 1) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  const c = new Color(color);
  c.convertLinearToSRGB();
  const count = n.attributes.position.count;
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) col.set([c.r, c.g, c.b], i * 3);
  n.setAttribute("aCol", new BufferAttribute(col, 3));
  n.setAttribute("aKind", new BufferAttribute(new Float32Array(count).fill(kind), 1));
  n.setAttribute("aTall", new BufferAttribute(new Float32Array(count).fill(tall), 1));
  return n;
}
export const merge = (list) => mergeGeometries(list);

const NOISE = /* glsl */ `
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`;
export { NOISE };

// kinds: 0 painted, 1 tower (ribbon windows), 2 paving, 3 lamp (glows), 4 metal, 5 road along x, 6 road along z,
// 7 planter, 8 glass wall, 9 rooftop
export function celMaterial(U, { side = DoubleSide } = {}) {
  return tone(new ShaderMaterial({
    uniforms: U,
    side,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: /* glsl */ `
      attribute vec3 aCol;
      attribute float aKind;
      attribute float aTall;
      uniform float uFlat;
      varying vec3 vN;
      varying vec3 vP;
      varying vec3 vW;
      varying vec3 vCol;
      varying float vKind;
      void main() {
        mat4 im = mat4(1.0);
        #ifdef USE_INSTANCING
          im = instanceMatrix;
        #endif
        vec3 p = position;
        vP = p;
        p.y *= mix(1.0, 0.012, uFlat * aTall);
        vec4 w = modelMatrix * im * vec4(p, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * mat3(im) * normal);
        vCol = aCol;
        vKind = aKind;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uHaze, uInk;
      uniform vec2 uFog;
      uniform float uTime;
      varying vec3 vN;
      varying vec3 vP;
      varying vec3 vW;
      varying vec3 vCol;
      varying float vKind;
      ${NOISE}
      float line(float x, float w) { float d = abs(fract(x - 0.5) - 0.5); return 1.0 - smoothstep(w, w + fwidth(x) * 1.2 + 0.001, d); }
      void main() {
        vec3 v = normalize(cameraPosition - vW);
        if (!gl_FrontFacing) {
          vec3 paper = vec3(0.93, 0.95, 0.97) * (0.9 + 0.1 * vnoise(vP.xz * 0.5));
          paper = mix(paper, vec3(0.62, 0.72, 0.86), max(line(vP.x / 6.0, 0.012), line(vP.z / 6.0, 0.012)) * 0.5);
          gl_FragColor = vec4(pow(paper, vec3(2.2)), 0.99);
          return;
        }
        vec3 n = normalize(vN);
        vec3 base = vCol;
        float ndl = dot(n, uSun);
        float k = vKind;
        if (k > 0.5 && k < 1.5) {
          float side = 1.0 - smoothstep(0.55, 0.8, abs(n.y));
          vec2 uv = abs(n.x) > abs(n.z) ? vec2(vP.z, vP.y) : vec2(vP.x, vP.y);
          float row = fract(uv.y / 1.9);
          float col = fract(uv.x / 2.6);
          float win = smoothstep(0.1, 0.14, row) * (1.0 - smoothstep(0.74, 0.78, row)) * smoothstep(0.05, 0.08, col) * (1.0 - smoothstep(0.92, 0.95, col)) * side;
          vec3 glass = mix(vec3(0.33, 0.52, 0.8), vec3(0.62, 0.8, 0.96), smoothstep(0.1, 0.78, row));
          glass += 0.16 * step(0.6, fract((uv.x * 0.8 + uv.y * 0.55) / 4.0));
          base = mix(base, glass, win);
          base *= 1.0 - 0.12 * side * (1.0 - smoothstep(0.0, 0.07, row));
        } else if (k > 7.5 && k < 8.5) {
          vec2 uv = abs(n.x) > abs(n.z) ? vec2(vP.z, vP.y) : vec2(vP.x, vP.y);
          float side = 1.0 - smoothstep(0.55, 0.8, abs(n.y));
          vec3 glass = mix(base * 0.8, base * 1.18, smoothstep(0.0, 40.0, vP.y));
          glass += 0.14 * step(0.55, fract((uv.x * 0.7 + uv.y * 0.5) / 6.0));
          float mull = max(line(uv.x / 1.4, 0.035), line(uv.y / 1.9, 0.03));
          base = mix(base, mix(glass, vec3(0.86, 0.92, 0.98), 0.75), mix(0.0, mull, side) * 0.55);
          base = mix(base, glass, side);
        } else if (k > 1.5 && k < 2.5) {
          vec2 q = vP.xz;
          float g = max(line(q.x / 2.0, 0.02), line(q.y / 2.0, 0.02));
          float big = max(line(q.x / 8.0, 0.012), line(q.y / 8.0, 0.012));
          float r = length(q - vec2(0.0, -3.0));
          float ring = max(1.0 - smoothstep(0.06, 0.12, abs(r - 5.4)), 1.0 - smoothstep(0.1, 0.18, abs(r - 8.6)));
          float chk = mod(floor(q.x / 2.0) + floor(q.y / 2.0), 2.0);
          base *= 0.96 + 0.05 * chk;
          base = mix(base, base * vec3(0.7, 0.78, 0.9), g * 0.7);
          base = mix(base, base * vec3(0.55, 0.65, 0.82), big * 0.6);
          base = mix(base, vec3(0.45, 0.62, 0.86), ring * 0.55 * step(r, 9.2));
        } else if (k > 4.5 && k < 6.5) {
          base = base * (0.96 + 0.06 * vnoise(vP.xz * 0.7));
        } else if (k > 8.5) {
          base = mix(base, base * vec3(0.8, 0.86, 0.95), line(vP.x / 3.0, 0.03) * 0.5);
        }
        float lit = smoothstep(0.50, 0.56, ndl);
        float mid = smoothstep(0.0, 0.06, ndl);
        vec3 shade = base * vec3(0.6, 0.7, 0.92);
        vec3 col = mix(shade * 0.82, shade, mid);
        col = mix(col, base * 1.04 + vec3(0.02, 0.025, 0.04), lit * mid);
        col = mix(col, col + vec3(0.07, 0.09, 0.13), smoothstep(0.7, 0.9, n.y) * 0.5);
        if (k > 2.5 && k < 3.5) {
          float ph = fract(sin(dot(floor(vP.xz * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
          float on = 0.7 + 0.5 * step(0.5, fract(uTime * 0.7 + ph));
          col = base * on + vec3(0.12) * on;
        }
        if (k > 3.5 && k < 4.5) col += vec3(0.16, 0.2, 0.26) * step(0.78, ndl) + vec3(0.1) * pow(max(dot(reflect(-uSun, n), v), 0.0), 18.0);
        float foot = 1.0 - smoothstep(0.0, 1.4, vP.y);
        if (k < 1.5 || (k > 7.5 && k < 8.5)) col *= 1.0 - 0.18 * foot;
        float rim = 1.0 - abs(dot(n, v));
        col = mix(col, uInk * 0.55, smoothstep(0.84, 0.95, rim) * 0.55);
        float fogK = smoothstep(uFog.x, uFog.y, length(vW - cameraPosition));
        col = mix(col, uHaze, fogK * 0.92);
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 0.99);
      }`,
  }));
}

// a flat colour for the hero graphics; instanceColor reads the per-instance colour when the mesh has one
export function flat(hex, { side = FrontSide, opacity = 1, instanceColor = false } = {}) {
  return tone(new ShaderMaterial({
    uniforms: { uCol: { value: new Color(hex) }, uOp: { value: opacity } },
    side,
    transparent: opacity < 1,
    depthWrite: opacity >= 1,
    vertexShader: /* glsl */ `
      uniform vec3 uCol;
      varying vec3 vC;
      void main() {
        vC = uCol;
        ${instanceColor ? "#ifdef USE_INSTANCING_COLOR\n        vC = instanceColor;\n        #endif" : ""}
        mat4 im = mat4(1.0);
        #ifdef USE_INSTANCING
          im = instanceMatrix;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * im * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOp;
      varying vec3 vC;
      void main() { gl_FragColor = vec4(vC, 0.99 * uOp); }`,
  }));
}
