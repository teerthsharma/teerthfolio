// THE POP-UP ALCHEMY BOOK's one material and its builders. Everything in the
// dimension is coloured card with a lighter cut edge, a faint paper-fibre
// grain, printed ink linework and flat 3-band toon steps. Glow comes only
// from the alchemy: gold foil (the Dragon's Pulse and the corona), Father's
// crimson, the clap's electric blue-white. One ShaderMaterial draws all of
// it (instanced or merged); one canvas texture (fibre, ruled lines, bricks)
// is built once. No lights, no shadow maps: card drop shadows are offset
// dark pieces. Colours are picked in sRGB and written as picked.

import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Euler, ExtrudeGeometry, Float32BufferAttribute, LinearMipmapLinearFilter, Matrix4, RepeatWrapping, Shape, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const KIND = { card: 0, crimson: 1, vein: 2, foil: 3, sky: 4, cobble: 5, glow: 6, lamp: 7 };
export const INK = { none: 0, rules: 1, hatch: 2, brick: 3, stipple: 4, grid: 5 };
const v3 = () => ({ value: new Vector3() });

const hash2 = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ONE CANVAS TEXTURE: R fibre, G ruled lines, B brick courses (A kept at 255, so nothing is premultiplied away).
let TEX = null;
function paperTexture() {
  if (TEX) return TEX;
  const N = 256;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  const img = g.createImageData(N, N);
  const noise = (x, y, f) => {
    const gx = Math.floor(x * f);
    const gy = Math.floor(y * f);
    const tx = x * f - gx;
    const ty = y * f - gy;
    const w = (k) => k * k * (3 - 2 * k);
    const h = (i, j) => hash2(((gx + i) % f) + 0.5, ((gy + j) % f) + 0.5);
    const a = h(0, 0) + (h(1, 0) - h(0, 0)) * w(tx);
    const b = h(0, 1) + (h(1, 1) - h(0, 1)) * w(tx);
    return a + (b - a) * w(ty);
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      const fibre = 0.5 * noise(x / N, y / N, 32) + 0.3 * noise(x / N, y / N, 8) + 0.2 * hash2(x, y * 1.7);
      const streak = noise(x / N, y / N, 4) * 0.2 + noise(x / N, (y * 0.12) / N, 64) * 0.35;
      img.data[i] = Math.min(255, (fibre * 0.7 + streak) * 255);
      img.data[i + 1] = y % 32 < 3 ? 255 : 0; // a ruled line every 32 px, 3 px thick
      const row = Math.floor(y / 32);
      const off = row % 2 ? 32 : 0;
      img.data[i + 2] = y % 32 < 3 || (x + off) % 64 < 3 ? 255 : 0; // brick courses and staggered joints
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  TEX = new CanvasTexture(c);
  TEX.wrapS = TEX.wrapT = RepeatWrapping;
  TEX.minFilter = LinearMipmapLinearFilter;
  TEX.anisotropy = 4;
  return TEX;
}
export const disposeTexture = () => {
  TEX?.dispose();
  TEX = null;
};

// The one material. Uniforms are the alchemy: where Father's light has flooded (uFlood from uFather), how far
// his circle has cracked (uCrack from the plaza), how far the gold has risen (uPulse), the clock, and a dim.
export function paperMaterial() {
  return new ShaderMaterial({
    side: DoubleSide,
    vertexColors: true,
    uniforms: {
      uTex: { value: paperTexture() },
      uTime: { value: 0 },
      uFather: v3(),
      uFlood: { value: 0 },
      uCrack: { value: 0 },
      uPulse: { value: 0 },
      uPulseK: { value: 0 },
      uWave: { value: -50 },
      uDim: { value: 1 },
      uGlow: { value: 0 },
      uDawn: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aMeta;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec3 vCol;
      varying vec4 vMeta;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = color.rgb;
        #endif
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol *= instanceColor;
        #endif
        vec4 w = modelMatrix * p;
        vWorld = w.xyz;
        vN = normalize(mat3(modelMatrix) * n);
        vMeta = aMeta;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTex;
      uniform float uTime, uFlood, uCrack, uPulse, uPulseK, uWave, uDim, uGlow, uDawn;
      uniform vec3 uFather;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec3 vCol;
      varying vec4 vMeta;
      float h1(float x) { return fract(sin(x * 91.3458) * 47453.5453); }
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        float kind = vMeta.x;
        float ink = vMeta.y;
        float emit = vMeta.z;
        float edge = vMeta.w;
        vec3 base = pow(vCol, vec3(1.0 / 2.2));
        // the cut edge: a lighter, creamier card
        base = mix(base, vec3(0.93, 0.86, 0.7), edge * 0.62);
        // flat 3-band toon steps, no gradients
        float d = dot(n, normalize(vec3(-0.5, 0.78, 0.42))) * 0.5 + 0.5;
        float shade = 0.66 + 0.19 * step(0.42, d) + 0.15 * step(0.74, d);
        // grain and printed ink, projected on the dominant axis
        vec3 an = abs(n);
        vec2 uv = an.y > 0.6 ? vWorld.xz : (an.x > an.z ? vWorld.zy : vWorld.xy);
        vec3 t = texture2D(uTex, uv * 0.42).rgb;
        float lines = 0.0;
        if (ink > 0.5 && ink < 1.5) lines = texture2D(uTex, uv * 0.9).g;
        else if (ink < 2.5 && ink > 1.5) lines = max(texture2D(uTex, uv * 0.8).g, texture2D(uTex, mat2(0.7, -0.7, 0.7, 0.7) * uv * 0.8).g * 0.8);
        else if (ink < 3.5 && ink > 2.5) lines = texture2D(uTex, uv * 0.55).b;
        else if (ink < 4.5 && ink > 3.5) lines = step(0.83, t.r) * step(0.5, texture2D(uTex, uv * 1.7).r);
        else if (ink > 4.5) lines = max(texture2D(uTex, uv * 1.1).g, texture2D(uTex, uv.yx * 1.1).g);
        vec3 col = base * shade * (0.9 + 0.2 * t.r);
        vec3 inkCol = col * 0.3 + vec3(0.03, 0.02, 0.09);
        col = mix(col, inkCol, lines * (1.0 - edge) * 0.78);
        float dO = length(vWorld.xz);
        if (kind > 0.5 && kind < 1.5) {
          // Father's crimson: dark card until his hand rises, then flooded from his feet outward; cracked from the plaza out
          float fd = distance(vWorld.xz, uFather.xz);
          float lit = smoothstep(uFlood, uFlood - 9.0, fd) * step(0.01, uFlood);
          float ang = atan(vWorld.z, vWorld.x);
          float seg = floor((ang + 3.14159) * 3.8197);
          float reach = uCrack + (h1(seg) - 0.5) * 16.0;
          float dead = smoothstep(reach, reach - 0.8, dO) * step(0.01, uCrack);
          vec3 hot = vec3(1.0, 0.16, 0.2) * (1.05 + 0.2 * sin(uTime * 5.0 - fd * 0.6));
          vec3 live = mix(col, hot, lit * 0.92);
          vec3 gone = vec3(0.2, 0.1, 0.13) * (0.9 + 0.25 * t.r);
          col = mix(live, gone, dead);
          col += vec3(1.0, 0.5, 0.25) * step(abs(dO - reach), 0.7) * step(0.01, uCrack) * step(dO, reach + 0.7) * 0.7;
        } else if (kind > 1.5 && kind < 2.5) {
          // the Dragon's Pulse: gold foil in the bedrock, dark until the slam, then risen from the pup outward
          float lit = smoothstep(uPulse, uPulse - 5.0, dO) * uPulseK;
          vec3 foil = vec3(1.0, 0.78, 0.28) * (1.1 + 0.25 * sin(dO * 1.4 - uTime * 6.0));
          col = mix(vec3(0.2, 0.15, 0.08), foil, lit);
        } else if (kind > 2.5 && kind < 3.5) {
          // gold foil card: the corona
          float sh = 0.5 + 0.5 * sin(vWorld.x * 0.7 + vWorld.y * 0.5 - uTime * 0.9);
          col = base * (0.9 + 0.4 * sh * (1.0 - edge)) + vec3(1.0, 0.85, 0.4) * 0.22 * sh;
          col = mix(col, base * 1.15, edge * 0.3);
        } else if (kind > 3.5 && kind < 4.5) {
          // the eclipse sky: indigo card, amber at the horizon, printed stars
          float k = smoothstep(0.0, 52.0, vWorld.y);
          vec3 sky = mix(vec3(0.85, 0.5, 0.2), vec3(0.09, 0.07, 0.27), pow(k, 0.6));
          sky = mix(sky, vec3(0.05, 0.04, 0.17), smoothstep(30.0, 90.0, vWorld.y));
          float star = step(0.992, texture2D(uTex, vWorld.xy * 0.045 + vWorld.zz * 0.01).r) * smoothstep(14.0, 36.0, vWorld.y);
          // the day ends: the eclipse passes and the card sky warms toward dawn
          sky = mix(sky, mix(vec3(0.96, 0.66, 0.36), vec3(0.38, 0.28, 0.6), pow(k, 0.7)), uDawn * 0.8);
          col = sky * (0.92 + 0.12 * t.r) + vec3(0.98, 0.9, 0.7) * star * 0.8 * (1.0 - uDawn);
        } else if (kind > 4.5 && kind < 5.5) {
          // a cobble: its cut sides take the gold as the pulse rises under them
          float lit = smoothstep(uPulse, uPulse - 4.0, dO) * uPulseK;
          col = mix(col, vec3(1.0, 0.82, 0.36), edge * lit * 0.95);
          col += vec3(1.0, 0.76, 0.3) * 0.16 * lit * (1.0 - edge);
        }
        // the pressure wave: a bar of rattling card rolling across the plaza
        col += vec3(0.5, 0.18, 0.12) * smoothstep(5.0, 0.0, abs(dO - uWave)) * 0.18;
        if (kind > 5.5 && kind < 6.5) col = base * (1.0 + 0.3 * sin(uTime * 7.0 + vWorld.x));
        else if (kind > 6.5) col = mix(col, base * 1.2, 0.85) * (0.85 + 0.35 * uGlow);
        else col = mix(col, base * 1.2, emit);
        col *= uDim;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

const A = new Color();
// A geometry made ready for the one material: non-indexed, flat normals, vertex colour, and aMeta
// (kind, ink, emit, edge). `faces`: the axis the cut edges run around ("z": an extrusion's sides are
// the edge; "y": a slab's sides are the edge).
export function prep(geo, color, { kind = 0, ink = 0, emit = 0, faces = "z", noEdge = false } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  const m = new Float32Array(n * 4);
  A.set(color);
  const nrm = g.attributes.normal;
  for (let i = 0; i < n; i++) {
    c[i * 3] = A.r;
    c[i * 3 + 1] = A.g;
    c[i * 3 + 2] = A.b;
    const side = faces === "z" ? Math.abs(nrm.getZ(i)) < 0.5 : faces === "y" ? Math.abs(nrm.getY(i)) < 0.5 : false;
    m[i * 4] = kind;
    m[i * 4 + 1] = ink;
    m[i * 4 + 2] = emit;
    m[i * 4 + 3] = side && !noEdge ? 1 : 0;
  }
  g.setAttribute("color", new Float32BufferAttribute(c, 3));
  g.setAttribute("aMeta", new Float32BufferAttribute(m, 4));
  return g;
}

// A polygon [[x, y], ...] (optionally with holes) extruded `depth` along +z: a cut card with thickness.
export function cutShape(points, depth = 0.12, holes = []) {
  const s = new Shape(points.map(([x, y]) => ({ x, y })));
  for (const h of holes) s.holes.push(new Shape(h.map(([x, y]) => ({ x, y }))));
  return new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
}
export const circlePts = (r, n = 20, cx = 0, cy = 0, sx = 1, sy = 1) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r * sx, cy + Math.sin((i / n) * Math.PI * 2) * r * sy]);
export const ringShape = (r0, r1, depth = 0.12, n = 40) => cutShape(circlePts(r1, n), depth, [circlePts(r0, n).reverse()]);
// a slab with its base at y = 0 and its centre on x, z
export const slab = (w, h, d) => new BoxGeometry(w, h, d).translate(0, h / 2, 0);

const M = new Matrix4();
const E = new Euler();
const S = new Vector3();
// A layer collects pieces with their transforms and merges them into ONE geometry (one draw call).
export function layer() {
  const parts = [];
  const api = {
    add(geo, color, opts, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      const g = prep(geo, color, opts);
      M.makeRotationFromEuler(E.set(rx, ry, rz, "YXZ"));
      M.scale(S.set(sx, sy, sz));
      M.setPosition(x, y, z);
      g.applyMatrix4(M);
      parts.push(g);
      return api;
    },
    // a card with a drop shadow: a dark flat copy offset behind and down-right
    shadowed(geo, color, opts, x, y, z, ry = 0, off = 0.16) {
      const s = prep(geo, "#150f28", { faces: opts?.faces ?? "z", noEdge: true });
      M.makeRotationY(ry);
      M.setPosition(x + off * 1.1, y - off * 0.5, z - off * 1.5);
      s.applyMatrix4(M);
      parts.push(s);
      return api.add(geo, color, opts, x, y, z, ry);
    },
    build() {
      const g = mergeGeometries(parts, false);
      for (const p of parts) p.dispose();
      parts.length = 0;
      return g;
    },
  };
  return api;
}

// a brass paper-fastener brad: a short disc, face to +z
export const brad = (r = 0.14) => new CylinderGeometry(r, r, 0.07, 8).rotateX(Math.PI / 2);
export const BRASS = "#c8a04a";
