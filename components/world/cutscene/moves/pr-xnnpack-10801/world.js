// LAS NOCHES, as meshes: the black sky shell (a few thin stars), the white
// desert (one faceted ground mesh with dunes and a flat dais of sand round the
// throne), the crescent moon, the dome-and-towers palace on the horizon, the
// white dead trees, and the throne. Frame: the move's rig (the pup at the
// origin, the lens out along +z). Every surface is a shard mesh (parts.js
// shardify) so the picture can crack like glass and fall.

import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, PlaneGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SHARD_FRAG, SHARD_VERT, flat, hash, shardify } from "../p-caustic/parts";
import { GLSL } from "./ink";
import { limb, solid } from "./geo";

export const SEAT = 3.3; // m: the throne's seat above the sand
export const THRONE_Z = 1.0; // the throne group's z in the rig: the seat sits under the pup
export const MOON_WIDE = new Vector3(-50, 34, -118);
export const MOON_TALL = new Vector3(-24, 40, -118);
export const MOON_R = 17;
const u = (v) => ({ value: v });

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---- the sky: black, a few hair-thin stars -------------------------------------
export function skyShell(shared) {
  const g = shardify(new IcosahedronGeometry(1, 4), 0.035);
  const m = new ShaderMaterial({
    uniforms: { ...shared, uPull: u(1) },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${SHARD_VERT}
      void main() {
        vec3 w = shard(position);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uBreak, uCrack, uHole;
      uniform vec3 uCrackDir;
      varying vec3 vOrig;
      varying float vRand;
      ${GLSL}
      ${SHARD_FRAG}
      void main() {
        vec3 v = normalize(vOrig - cameraPosition);
        float reach = 1.0 - dot(v, normalize(uCrackDir));
        if (uHole > 0.0 && reach < uHole * 0.34 * (0.35 + 0.65 * vRand)) discard;
        // black, a breath of deep blue-black overhead; a sparse field of one-pixel stars
        vec3 c = mix(vec3(0.012, 0.014, 0.024), vec3(0.0, 0.0, 0.006), smoothstep(0.0, 0.8, v.y));
        vec2 sp = vec2(atan(v.x, -v.z) * 70.0, v.y * 70.0);
        vec2 cell = floor(sp);
        vec2 at = fract(sp) - 0.5 + (vec2(h21(cell + 3.1), h21(cell + 7.7)) - 0.5) * 0.6;
        float star = step(0.987, h21(cell)) * (1.0 - smoothstep(0.0, 0.1 + 0.05 * h21(cell + 1.3), length(at))) * step(0.02, v.y);
        c += vec3(0.85, 0.9, 1.0) * star * (0.55 + 0.45 * sin(uTime * 2.0 + h21(cell) * 40.0));
        float web = crackLine(0.02) * (1.0 - smoothstep(uCrack * 2.4 - 0.3, uCrack * 2.4, reach)) * step(0.001, uCrack);
        c = mix(c, mix(cBlue, vec3(1.0), 0.55), web * (uBreak > 0.0 ? 0.55 : 0.95));
        float alpha = uBreak > 0.0 ? 0.62 * (1.0 - smoothstep(0.9, 1.5, uBreak + 0.3 * vRand)) : 1.0;
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), alpha);
      }`,
  });
  return { g, m };
}

// ---- the desert -----------------------------------------------------------------
export function groundHeight(x, z) {
  const r = Math.hypot(x, z + 4);
  const k = smooth(16, 42, r); // sand lies flat under the throne and the cast, then rolls into dunes
  return k * (1.7 * Math.sin(x * 0.05 + 1.0) * Math.cos(z * 0.04) + 0.95 * Math.sin(x * 0.13 + z * 0.09) + 0.3 * Math.sin(x * 0.41 - z * 0.33));
}
export function desert() {
  const base = new PlaneGeometry(260, 260, 100, 100).rotateX(-Math.PI / 2).translate(0, 0, -80);
  const g = shardify(base, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const k = Math.round(x * 8) * 7.13 + Math.round(z * 8) * 3.71;
    const nx = x + (hash(k, 1) - 0.5) * 1.8;
    const nz = z + (hash(k, 2) - 0.5) * 1.8;
    p.setXYZ(i, nx, groundHeight(nx, nz), nz);
  }
  const c = g.attributes.aCenter;
  for (let t = 0; t < p.count; t += 3) {
    for (let a = 0; a < 3; a++) {
      const v = (p.array[t * 3 + a] + p.array[t * 3 + 3 + a] + p.array[t * 3 + 6 + a]) / 3;
      for (let k = 0; k < 3; k++) c.array[(t + k) * 3 + a] = v;
    }
  }
  return g;
}

// ---- the crescent moon ----------------------------------------------------------
export function moon(shared) {
  const g = shardify(new CircleGeometry(1.7, 56), 0);
  const m = new ShaderMaterial({
    uniforms: { ...shared, uPull: u(1) },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      ${SHARD_VERT}
      varying vec2 vP;
      void main() {
        vP = position.xy;
        vec3 w = shard(position);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uBreak, uCrack, uHole;
      uniform vec3 uCrackDir;
      varying vec2 vP;
      varying vec3 vOrig;
      varying float vRand;
      ${GLSL}
      ${SHARD_FRAG}
      void main() {
        float r = length(vP);
        // a thin crescent: the full disc minus a second disc slid up and right
        float cut = length(vP - vec2(0.42, 0.14));
        float outer = 1.0 - smoothstep(0.985, 1.0, r);
        float inner = smoothstep(0.86, 0.875, cut);
        float fill = outer * inner;
        vec3 c = cPaper;
        // pen hatching along the inner curve, where the light falls off
        float edge = 1.0 - smoothstep(0.0, 0.2, cut - 0.875);
        c = mix(c, cShade, edge * 0.7);
        c = mix(c, cInk, hatch(5.0, 1.0) * smoothstep(0.1, 0.0, cut - 0.875) * 0.8);
        // the cold blue accent: the unlit disc's thin outline and a halo that breathes
        float w = fwidth(r) * 1.1;
        float ring = (1.0 - smoothstep(0.0, w, abs(r - 1.0))) * (1.0 - fill) * 0.7;
        float beyond = step(1.0, r);
        float halo = exp(-max(r - 1.0, 0.0) * 5.0) * (0.34 + 0.06 * sin(uTime * 1.6)) * beyond;
        vec3 col = c * fill + cBlue * ring + cBlue * halo;
        float a = max(fill, max(ring, halo));
        float reach = 1.0 - dot(normalize(vOrig - cameraPosition), normalize(uCrackDir));
        float web = crackLine(0.02) * (1.0 - smoothstep(uCrack * 2.4 - 0.3, uCrack * 2.4, reach)) * step(0.001, uCrack);
        col = mix(col, mix(cBlue, vec3(1.0), 0.6), web * 0.9);
        a = max(a, web * 0.9 * step(r, 1.7));
        if (uHole > 0.0 && reach < uHole * 0.34 * (0.35 + 0.65 * vRand)) discard;
        if (uBreak > 0.0) a *= 0.62 * (1.0 - smoothstep(0.9, 1.5, uBreak + 0.3 * vRand));
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), a);
      }`,
  });
  return { g, m };
}

// ---- the palace on the horizon: wall, dome, towers -------------------------------
export function palace() {
  const parts = [];
  const box = (w, h, d, x, y, z) => parts.push(new BoxGeometry(w, h, d).translate(x, y, z));
  const tower = (x, z, r, h, cap, capH) => {
    parts.push(new CylinderGeometry(r, r * 1.12, h, 10).translate(x, h / 2 - 2, z));
    parts.push(new CylinderGeometry(r * 1.25, r * 1.25, 1.2, 10).translate(x, h - 2.4, z)); // a ring under the cap
    parts.push(new ConeGeometry(cap ?? r * 1.35, capH ?? h * 0.3, 10).translate(x, h - 2 + (capH ?? h * 0.3) / 2, z));
  };
  // the great wall, with crenels along its top, and a lower outer wall in front of it
  box(150, 17, 7, 0, 6.5, 0);
  for (let i = 0; i < 38; i++) box(2.2, 1.6, 7.2, -74 + i * 4, 15.8, 0);
  box(190, 5, 2.5, 0, 0.5, 20);
  for (let i = 0; i < 48; i++) box(1.6, 1.0, 2.6, -94 + i * 4, 3.5, 20);
  // the dome: a drum, a hemisphere with ribs, a ring and a spire
  parts.push(new CylinderGeometry(19, 20, 12, 28).translate(0, 20, 0));
  parts.push(new SphereGeometry(19, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 26, 0));
  parts.push(new TorusGeometry(19.4, 0.5, 5, 40).rotateX(Math.PI / 2).translate(0, 26.4, 0));
  parts.push(new CylinderGeometry(0.4, 1.0, 12, 6).translate(0, 51, 0));
  // the towers: two great spires flanking the dome, then a staggered file out to the ends
  tower(-34, 0, 3.4, 58, 4.4, 17);
  tower(34, 0, 3.4, 58, 4.4, 17);
  for (const [x, h] of [[-52, 40], [52, 40], [-66, 30], [66, 30], [-22, 36], [22, 36], [-76, 24], [76, 24]]) tower(x, 0, 2.4, h, 3.0, h * 0.28);
  for (const x of [-46, -10, 10, 46, -60, 60]) tower(x, 20, 1.5, 12, 2, 5);
  const { g, hull } = solid(parts, 0);
  return { g, hull };
}

// ---- the white dead trees (all merged into one mesh, transforms baked) -----------
function oneTree(seed, h) {
  const parts = [];
  const lean = (hash(seed, 1) - 0.5) * 0.9;
  const top = [lean * h * 0.3, h, (hash(seed, 2) - 0.5) * 0.6];
  parts.push(limb([0, 0, 0], top, h * 0.045, h * 0.016, 5));
  const bough = (from, dir, len, r, depth, k) => {
    const to = [from[0] + dir[0] * len, from[1] + dir[1] * len, from[2] + dir[2] * len];
    parts.push(limb(from, to, r, r * 0.45, 4));
    if (depth > 0)
      for (let j = 0; j < 2; j++) {
        const a = (hash(k + j * 17, 3) - 0.5) * 2.0;
        const b = (hash(k + j * 29, 4) - 0.5) * 2.0;
        const d = [dir[0] * 0.55 + Math.sin(a) * 0.8, dir[1] * 0.45 + 0.45 + hash(k + j, 5) * 0.4, dir[2] * 0.55 + Math.sin(b) * 0.8];
        const l = Math.hypot(...d) || 1;
        bough(to, d.map((x) => x / l), len * 0.62, r * 0.55, depth - 1, k * 3 + j + 1);
      }
  };
  for (let i = 0; i < 5; i++) {
    const y = h * (0.42 + 0.13 * i);
    const a = hash(seed * 7 + i, 6) * Math.PI * 2;
    const d = [Math.cos(a) * 0.85, 0.5 + hash(seed + i, 7) * 0.4, Math.sin(a) * 0.85];
    const l = Math.hypot(...d);
    bough([top[0] * (y / h), y, top[2] * (y / h)], d.map((x) => x / l), h * (0.4 - 0.04 * i), h * 0.018, 2, seed * 11 + i);
  }
  return mergeGeometries(parts.map(flat));
}
export function trees() {
  const list = [];
  const spots = [
    [-13.5, 3.5, 6.2], [14.5, 1.0, 7.4], [-20, -9, 8.8], [21, -12, 7.0], [-30, 6, 9.0], [33, 4, 8.0], [-9, -26, 8.2], [11, -30, 9.2],
    [-38, -20, 9.6], [40, -26, 8.6], [-24, -42, 10], [26, -46, 9.4], [-4, -58, 9.0], [-48, -50, 10.5], [52, -54, 9.8], [8, -72, 10], [-34, -70, 11], [36, -74, 10.5],
  ];
  spots.forEach(([x, z, h], i) => {
    const g = oneTree(i + 3, h);
    g.rotateY(hash(i, 9) * 6.28);
    g.translate(x, groundHeight(x, z) - 0.15, z);
    list.push(g);
  });
  return solid(list);
}

// ---- the throne: three broad steps, a plinth, a towering back, fins, a crown ----
// group frame: z 0 is THRONE_Z in the rig; the seat's top is SEAT
export function throne() {
  const parts = [];
  const box = (w, h, d, x, y, z, rz = 0) => parts.push(new BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z));
  box(11, 0.6, 9, 0, 0.3, -0.5);
  box(9, 0.6, 7.2, 0, 0.9, -1.1);
  box(7, 0.6, 5.4, 0, 1.5, -1.6);
  box(4.2, SEAT - 1.8, 3.6, 0, 1.8 + (SEAT - 1.8) / 2, -1.1); // the plinth
  box(5.2, 7.6, 0.9, 0, SEAT + 3.8, -2.75); // the back
  parts.push(new CylinderGeometry(0, 1.9, 4.6, 4).rotateY(Math.PI / 4).translate(0, SEAT + 7.6 + 2.3, -2.75)); // the crown spire
  for (const s of [-1, 1]) {
    box(0.6, 6.4, 0.8, s * 3.2, SEAT + 3.6, -2.55, -s * 0.34); // fins, leaning out
    parts.push(new CylinderGeometry(0, 0.55, 2.4, 4).rotateZ(-s * 0.34).translate(s * 4.1, SEAT + 7.2, -2.55));
    box(0.9, 1.3, 3.2, s * 2.55, SEAT + 0.65, -1.2); // the arms
    parts.push(new SphereGeometry(0.5, 8, 6).translate(s * 2.55, SEAT + 1.5, 0.2));
  }
  parts.push(new TorusGeometry(4.6, 0.1, 5, 48).translate(0, SEAT + 5.0, -3.4)); // the thin arch behind
  return solid(parts);
}

// the throne's ink lines: slits down the back, the step edges, the dark slot of the gap at the dais foot
export function throneInk() {
  const parts = [];
  const box = (w, h, d, x, y, z) => parts.push(new BoxGeometry(w, h, d).translate(x, y, z));
  for (let i = -3; i <= 3; i++) box(0.09, 5.6 - Math.abs(i) * 0.5, 0.06, i * 0.62, SEAT + 3.9, -2.28);
  box(4.2, 0.06, 0.06, 0, SEAT + 0.04, 0.72); // the seat's front edge
  for (const [w, y, z] of [[11, 0.6, 4.0], [9, 1.2, 2.5], [7, 1.8, 1.1]]) box(w, 0.05, 0.05, 0, y - 0.03, z);
  box(5.2, 0.26, 0.07, 0, 0.3, 4.0); // the gap: a dark slot along the foot of the dais
  return solid(parts).g;
}
