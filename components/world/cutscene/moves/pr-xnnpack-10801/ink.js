// THE STARK MINIMAL DIMENSION: Las Noches in Kubo's negative space. White
// desert, black sky, razor-thin ink lines a pixel wide, and ONE cold blue
// accent (the moon's halo, the sword's glint, the crack of glass). Nothing
// else is coloured. Every static surface here is a shard mesh (shardify) so
// the whole picture can crack like glass: a hole opens where the glass is
// missing (uHole), a web of blue light runs along the shard edges (uCrack),
// and on the break every shard tumbles and falls (uBreak).
// One shared uniform block drives all of it, set once a frame.

import { BackSide, Color, Mesh, ShaderMaterial, Vector2, Vector3 } from "three";
import { SHARD_FRAG, SHARD_VERT } from "../p-caustic/parts";

// sRGB picks (the shaders write pow 2.2, so a colour goes in as the hex reads)
export const sr = (h) => new Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
export const INK = "#080a0f";
export const PAPER = "#f4f4f0";
const u = (v) => ({ value: v });

// the block every material shares: one object, so a frame writes each value once
export function sharedUniforms() {
  return {
    uTime: u(0),
    uBreak: u(-1),
    uCrack: u(0),
    uCrackDir: u(new Vector3(0, 0, -1)),
    uHole: u(0),
    uMoon: u(new Vector3(-40, 30, -100)),
    uRes: u(new Vector2(1, 1)),
    uPx: u(1.6),
  };
}

// value noise, fbm, a one-pixel line at the integers of v, hatching in screen space, the four inks
export const GLSL = /* glsl */ `
  const vec3 cPaper = vec3(0.957, 0.957, 0.941);
  const vec3 cShade = vec3(0.667, 0.694, 0.749);
  const vec3 cInk = vec3(0.031, 0.039, 0.059);
  const vec3 cBlue = vec3(0.373, 0.714, 1.0);
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }
  // a line one pixel wide where v crosses an integer; gone where lines would crowd under a pixel
  float lineAt(float v) {
    float w = fwidth(v);
    float d = abs(fract(v - 0.5) - 0.5) / max(w, 1e-5);
    return (1.0 - min(d, 1.0)) * (1.0 - smoothstep(0.35, 0.6, w));
  }
  // pen hatching: parallel strokes at 45 degrees on the screen, a few pixels apart
  float hatch(float gap, float dir) {
    float v = (gl_FragCoord.x + dir * gl_FragCoord.y) / gap;
    float d = abs(fract(v) - 0.5) / max(fwidth(v), 1e-5);
    return 1.0 - min(d, 1.0);
  }`;

const COMMON = /* glsl */ `
  uniform float uTime, uBreak, uCrack, uHole;
  uniform vec3 uCrackDir, uMoon;
  varying vec3 vOrig;
  varying float vRand;
  ${GLSL}
  ${SHARD_FRAG}
  // the glass: holes where it is missing, the web of light along its edges
  bool missing(vec3 v) {
    float reach = 1.0 - dot(v, normalize(uCrackDir));
    return uHole > 0.0 && reach < uHole * 0.34 * (0.35 + 0.65 * vRand);
  }
  vec3 glass(vec3 c, vec3 v) {
    float reach = 1.0 - dot(v, normalize(uCrackDir));
    float web = crackLine(0.02) * (1.0 - smoothstep(uCrack * 2.4 - 0.3, uCrack * 2.4, reach)) * step(0.001, uCrack);
    return mix(c, mix(cBlue, vec3(1.0), 0.55), web * (uBreak > 0.0 ? 0.55 : 0.95));
  }
  float fall() { return uBreak > 0.0 ? 0.62 * (1.0 - smoothstep(0.9, 1.5, uBreak + 0.3 * vRand)) : 1.0; }`;

const SHARD_MAIN = /* glsl */ `
  ${SHARD_VERT}
  void main() {
    vec3 w = shard(position);
    gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
  }`;

// PAPER: the white world. Flat facets lit by the moon: paper where the light falls, cool grey where it turns, pen
// hatching in the dark, cross-hatching in the darkest. pattern: 0 plain, 1 palace (floor lines, slit windows),
// 2 ground (contour lines, wind ripples).
export function paperMaterial(shared, pattern = 0) {
  const ground = /* glsl */ `
    float far = length(vOrig - cameraPosition);
    float contour = lineAt(vOrig.y * 1.7 + 0.37) * 0.9;
    float ripple = lineAt(vOrig.z * 0.55 + 2.4 * fbm(vOrig.xz * 0.11) + 0.6 * vnoise(vOrig.xz * 0.9)) * 0.55;
    float drift = lineAt(vOrig.x * 0.16 + 3.0 * fbm(vOrig.xz * 0.07)) * 0.35;
    float lines = max(contour, max(ripple * smoothstep(8.0, 20.0, far), drift * smoothstep(20.0, 50.0, far)));
    c = mix(c, cInk, lines * 0.9);`;
  const palace = /* glsl */ `
    float wall = step(abs(n.y), 0.35);
    c = mix(c, cInk, lineAt(vOrig.y / 5.0) * 0.85 * wall);
    float gx = fract(vOrig.x / 4.0 + vOrig.z / 4.0);
    float gy = fract(vOrig.y / 5.0);
    float slit = step(0.43, gx) * step(gx, 0.57) * step(0.25, gy) * step(gy, 0.78);
    c = mix(c, cInk, slit * wall * 0.92);`;
  return new ShaderMaterial({
    uniforms: { ...shared, uPull: u(0) },
    transparent: true,
    vertexShader: SHARD_MAIN,
    fragmentShader: /* glsl */ `
      ${COMMON}
      void main() {
        vec3 vdir = normalize(vOrig - cameraPosition);
        if (missing(vdir)) discard;
        vec3 n = normalize(cross(dFdx(vOrig), dFdy(vOrig)));
        if (dot(n, cameraPosition - vOrig) < 0.0) n = -n;
        float lit = dot(n, normalize(normalize(uMoon - vOrig) + 0.8 * normalize(cameraPosition - vOrig))) * 0.5 + 0.5;
        lit = lit * 0.8 + 0.2;
        vec3 c = cPaper;
        ${pattern === 2 ? ground : ""}
        ${pattern === 1 ? palace : ""}
        c = mix(c, cShade, smoothstep(0.62, 0.5, lit));
        c = mix(c, cInk, hatch(5.0, 1.0) * smoothstep(0.52, 0.4, lit) * 0.85);
        c = mix(c, cInk, hatch(5.0, -1.0) * smoothstep(0.32, 0.18, lit) * 0.85);
        c = glass(c, vdir);
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), fall());
      }`,
  });
}

// SILHOUETTE: flat ink, no shading, for the figures and the slits in the throne; a cool blue thread of rim light
// where a facet turns to the moon.
export function silhouetteMaterial(shared) {
  return new ShaderMaterial({
    uniforms: { ...shared, uPull: u(0) },
    transparent: true,
    vertexShader: SHARD_MAIN,
    fragmentShader: /* glsl */ `
      ${COMMON}
      void main() {
        vec3 vdir = normalize(vOrig - cameraPosition);
        vec3 n = normalize(cross(dFdx(vOrig), dFdy(vOrig)));
        if (dot(n, cameraPosition - vOrig) < 0.0) n = -n;
        float rim = smoothstep(0.6, 0.95, dot(n, normalize(uMoon - vOrig)));
        vec3 c = mix(cInk, cInk + cBlue * 0.18, rim);
        c = glass(c, vdir);
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), fall());
      }`,
  });
}

// THE LINE: an inverted hull pushed out in CLIP space, so its width is a fixed number of pixels at any distance
// (razor thin). Plain or instanced. `color` is the line's sRGB hex: ink on paper, paper round a silhouette.
export function hullMaterial(shared, color = INK, mul = 1) {
  return new ShaderMaterial({
    uniforms: { uRes: shared.uRes, uPx: shared.uPx, uMul: u(mul), uColor: u(sr(color)) },
    side: BackSide,
    vertexShader: /* glsl */ `
      uniform vec2 uRes;
      uniform float uPx, uMul;
      void main() {
        mat4 im = mat4(1.0);
        #ifdef USE_INSTANCING
          im = instanceMatrix;
        #endif
        vec4 p = projectionMatrix * modelViewMatrix * im * vec4(position, 1.0);
        vec3 nv = normalize(mat3(modelViewMatrix) * mat3(im) * normal);
        vec2 d = (projectionMatrix * vec4(nv, 0.0)).xy;
        float l = length(d);
        d = l > 1e-5 ? d / l : vec2(0.0);
        p.xy += d * (uPx * uMul * 2.0) / uRes * p.w;
        gl_Position = p;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(pow(uColor, vec3(2.2)), 1.0); }`,
  });
}

// THE PUP IN INK: its own colours reduced to paper and ink: three tones, pen hatching in the shade, a thin blue
// thread of the moon's rim, a one-pixel line round every body part. Swapped in for the dimension and out the
// instant the glass breaks.
export function pupInk(root, shared) {
  const list = [];
  const twins = new Map();
  const make = (m) =>
    new ShaderMaterial({
      uniforms: { uMoon: shared.uMoon, uBase: u(new Vector3().copy(sr("#" + new Color().copy(m.color ?? new Color(1, 1, 1)).convertLinearToSRGB().getHexString()))), uOpacity: u(m.opacity ?? 1) },
      vertexColors: Boolean(m.vertexColors),
      transparent: m.transparent,
      vertexShader: /* glsl */ `
        varying vec3 vN;
        varying vec3 vW;
        varying vec3 vCol;
        void main() {
          vCol = vec3(1.0);
          #ifdef USE_COLOR
            vCol = pow(color.rgb, vec3(1.0 / 2.2));
          #endif
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uMoon, uBase;
        uniform float uOpacity;
        varying vec3 vN;
        varying vec3 vW;
        varying vec3 vCol;
        ${GLSL}
        void main() {
          vec3 n = normalize(vN);
          vec3 v = normalize(cameraPosition - vW);
          float l = dot(n, normalize(normalize(uMoon - vW) + 0.5 * v)) * 0.5 + 0.5;
          l = l * 0.85 + 0.15;
          float lum = dot(uBase * vCol, vec3(0.299, 0.587, 0.114));
          float body = smoothstep(0.1, 0.4, lum);
          // its own darks (nose, pads) stay ink; the rest is paper in the light, cool grey in the shade
          vec3 c = mix(cInk, cPaper, body);
          c = mix(c, cShade, smoothstep(0.58, 0.44, l) * body);
          c = mix(c, cInk, hatch(4.0, 1.0) * smoothstep(0.46, 0.34, l) * body * 0.85);
          c = mix(c, cInk, hatch(4.0, -1.0) * smoothstep(0.26, 0.14, l) * body * 0.85);
          c = mix(c, cBlue, pow(1.0 - max(dot(n, v), 0.0), 3.5) * smoothstep(0.35, 0.7, l) * 0.75);
          gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), uOpacity);
        }`,
    });
  const hull = hullMaterial(shared, INK, 1);
  const lines = [];
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial || !o.geometry.attributes.normal) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) twins.set(m, (p = make(m)));
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
      if (v) {
        for (const [o, m] of list) {
          if (!m.vertexColors) continue; // the body parts wear vertex colours; the eyes and mouth keep their own look
          const h = new Mesh(o.geometry, hull);
          h.raycast = () => {};
          o.add(h);
          lines.push(h);
        }
      } else {
        for (const h of lines) h.removeFromParent();
        lines.length = 0;
      }
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
      hull.dispose();
    },
  };
}
