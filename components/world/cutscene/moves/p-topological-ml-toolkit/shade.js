// INDEX DAYLIGHT SCI-FI: the look every surface of Academy City shares.
// Crisp three-band cel shading under a bright overcast sky: shadows turn a
// cool blue (never black), lights stay a clean blue-white, silhouettes pick
// up a thin deep-blue ink line, and distance dissolves into a pale blue haze.
// One shared uniform set drives every material, so the sun and the haze are
// set once a frame. Shaders pick colours in sRGB and write pow(c, 2.2), like
// the stage's. No post pass.

import { BufferAttribute, Color, DoubleSide, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const hex3 = (h) => new Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
export const rgb = (h) => hex3(h).toArray();

export const INK = "#1d3f9a"; // the deep electric blue of every outline
export const HAZE = "#d9e7f6"; // the horizon and the fog
export const SUN_RIG = new Vector3(-0.5, 0.74, 0.45).normalize(); // toward the sun (upper left, over the lens), in the rig frame

// the uniforms every cel material shares (the same objects, so one write moves all of them)
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

// merge helper: every part carries a colour, a kind and a "stands up" weight (flattened when the map folds)
export function part(g, color, kind = 0, tall = 1) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  const c = new Color(color); // linear: the shader wants sRGB, so convert back
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
  return new ShaderMaterial({
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
          // the back of the map: pale paper with a faint grid
          vec3 paper = vec3(0.93, 0.95, 0.97) * (0.9 + 0.1 * vnoise(vP.xz * 0.5));
          paper = mix(paper, vec3(0.62, 0.72, 0.86), max(line(vP.x / 6.0, 0.012), line(vP.z / 6.0, 0.012)) * 0.5);
          gl_FragColor = vec4(pow(paper, vec3(2.2)), 1.0);
          return;
        }
        vec3 n = normalize(vN);
        vec3 base = vCol;
        float ndl = dot(n, uSun);
        float k = vKind;
        // ---- surfaces
        if (k > 0.5 && k < 1.5) {
          // a tower: ribbon windows of reflecting glass on the side faces, a plain roof
          float side = 1.0 - smoothstep(0.55, 0.8, abs(n.y));
          vec2 uv = abs(n.x) > abs(n.z) ? vec2(vP.z, vP.y) : vec2(vP.x, vP.y);
          float row = fract(uv.y / 1.9);
          float col = fract(uv.x / 2.6);
          float win = smoothstep(0.1, 0.14, row) * (1.0 - smoothstep(0.74, 0.78, row)) * smoothstep(0.05, 0.08, col) * (1.0 - smoothstep(0.92, 0.95, col)) * side;
          vec3 glass = mix(vec3(0.33, 0.52, 0.8), vec3(0.62, 0.8, 0.96), smoothstep(0.1, 0.78, row));
          glass += 0.16 * step(0.6, fract((uv.x * 0.8 + uv.y * 0.55) / 4.0)); // a hard cel reflection stripe
          base = mix(base, glass, win);
          // a darker floor-slab line under each row of windows
          base *= 1.0 - 0.12 * side * (1.0 - smoothstep(0.0, 0.07, row));
        } else if (k > 7.5 && k < 8.5) {
          // curtain-wall glass: floors and mullions over a sky-blue gradient
          vec2 uv = abs(n.x) > abs(n.z) ? vec2(vP.z, vP.y) : vec2(vP.x, vP.y);
          float side = 1.0 - smoothstep(0.55, 0.8, abs(n.y));
          vec3 glass = mix(base * 0.8, base * 1.18, smoothstep(0.0, 40.0, vP.y));
          glass += 0.14 * step(0.55, fract((uv.x * 0.7 + uv.y * 0.5) / 6.0));
          float mull = max(line(uv.x / 1.4, 0.035), line(uv.y / 1.9, 0.03));
          base = mix(base, mix(glass, vec3(0.86, 0.92, 0.98), 0.75), mix(0.0, mull, side) * 0.55);
          base = mix(base, glass, side);
        } else if (k > 1.5 && k < 2.5) {
          // paving: a grid of slabs, a heavier line every eight, a ring inlaid in the plaza
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
          // roads: slate asphalt with a little grain (the lane lines are geometry)
          base = base * (0.96 + 0.06 * vnoise(vP.xz * 0.7));
        } else if (k > 8.5) {
          // a roof: lighter slabs with a darker plant box
          base = mix(base, base * vec3(0.8, 0.86, 0.95), line(vP.x / 3.0, 0.03) * 0.5);
        }
        // ---- the three cel bands
        float lit = smoothstep(0.50, 0.56, ndl);
        float mid = smoothstep(0.0, 0.06, ndl);
        vec3 shade = base * vec3(0.6, 0.7, 0.92);          // the cool shadow
        vec3 col = mix(shade * 0.82, shade, mid);
        col = mix(col, base * 1.04 + vec3(0.02, 0.025, 0.04), lit * mid);
        col = mix(col, col + vec3(0.07, 0.09, 0.13), smoothstep(0.7, 0.9, n.y) * 0.5); // the sky on up-facing faces
        // lamps glow and blink
        if (k > 2.5 && k < 3.5) {
          float ph = fract(sin(dot(floor(vP.xz * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
          float on = 0.7 + 0.5 * step(0.5, fract(uTime * 0.7 + ph));
          col = base * on + vec3(0.12) * on;
        }
        // metal: a bright cel highlight band
        if (k > 3.5 && k < 4.5) col += vec3(0.16, 0.2, 0.26) * step(0.78, ndl) + vec3(0.1) * pow(max(dot(reflect(-uSun, n), v), 0.0), 18.0);
        // the contact shadow at the foot of everything that stands
        float foot = 1.0 - smoothstep(0.0, 1.4, vP.y);
        if (k < 1.5 || (k > 7.5 && k < 8.5)) col *= 1.0 - 0.18 * foot;
        // the ink line on the silhouettes
        float rim = 1.0 - abs(dot(n, v));
        col = mix(col, uInk * 0.55, smoothstep(0.84, 0.95, rim) * 0.55);
        // the haze
        float fogK = smoothstep(uFog.x, uFog.y, length(vW - cameraPosition));
        col = mix(col, uHaze, fogK * 0.92);
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}

// a plain cel-shaded colour for the pup's costume and any lone prop (own colour, no kinds)
export function toonMaterial(U, hex, { side = DoubleSide, rim = 0.5 } = {}) {
  return new ShaderMaterial({
    uniforms: { ...U, uBase: { value: hex3(hex) }, uRim: { value: rim } },
    side,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uInk, uBase;
      uniform float uRim;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(cameraPosition - vW);
        float ndl = dot(n, uSun);
        vec3 c = uBase * mix(vec3(0.58, 0.68, 0.92), vec3(1.0), smoothstep(0.0, 0.06, ndl));
        c = mix(c, uBase * 1.08 + vec3(0.03, 0.035, 0.05), smoothstep(0.5, 0.56, ndl));
        float rim = 1.0 - abs(dot(n, v));
        c += vec3(0.5, 0.7, 1.0) * smoothstep(0.55, 0.8, rim) * uRim * 0.35;
        c = mix(c, uInk * 0.5, smoothstep(0.88, 0.96, rim) * 0.5);
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}

// THE PUP IN THE DIMENSION: a cel-shaded twin for each of the pup's own materials, swapped in for the
// scene and out the instant the scene lets go (its own colours, three hard bands, a cool shadow, a
// blue-white rim, an ink line).
export function pupToon(root, U) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      const c = new Color().copy(m.color ?? new Color(1, 1, 1)).convertLinearToSRGB();
      p = new ShaderMaterial({
        uniforms: { uSun: U.uSun, uInk: U.uInk, uBase: { value: new Vector3(c.r, c.g, c.b) } },
        vertexColors: Boolean(m.vertexColors),
        transparent: m.transparent,
        opacity: m.opacity ?? 1,
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vV;
          varying vec3 vCol;
          void main() {
            vCol = vec3(1.0);
            #ifdef USE_COLOR
              vCol = pow(color.rgb, vec3(1.0 / 2.2));
            #endif
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vV = -mv.xyz;
            vN = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun, uInk, uBase;
          varying vec3 vN;
          varying vec3 vV;
          varying vec3 vCol;
          void main() {
            vec3 n = normalize(vN);
            vec3 vv = normalize(vV);
            vec3 sunV = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
            vec3 nV = normalize((viewMatrix * vec4(n, 0.0)).xyz);
            float d = dot(nV, sunV);
            vec3 b = uBase * vCol;
            vec3 c = b * mix(vec3(0.62, 0.72, 0.95), vec3(1.0), smoothstep(-0.05, 0.02, d));
            c = mix(c, b * 1.06 + vec3(0.03, 0.035, 0.05), smoothstep(0.46, 0.52, d));
            float rim = 1.0 - max(dot(nV, vv), 0.0);
            c += vec3(0.55, 0.75, 1.0) * smoothstep(0.62, 0.85, rim) * 0.28;
            c = mix(c, uInk * 0.55, smoothstep(0.9, 0.97, rim) * 0.5);
            gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
          }`,
      });
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
    },
  };
}
