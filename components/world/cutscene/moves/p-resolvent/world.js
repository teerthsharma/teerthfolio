// THE COURTYARD OUTSIDE GRAZ, at golden hour: a soft-teal sky with crisp cel clouds
// and far hills, a flagstone court gone to autumn grass at its edges, a ruined
// castle (keep, broken tower, curtain wall and gate, crumbling walls, an arch, a
// dais), a cracked fountain, autumn trees, long violet shadows, shafts of light.
// Frame: the move's rig (the pup at the origin, the lens out along +z, the sun
// behind and left). Statics are one mesh with one cel material; nothing animates here.

import { BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, PlaneGeometry, RingGeometry, ShaderMaterial, TorusGeometry, BufferAttribute, BufferGeometry, AdditiveBlending, Vector3 } from "three";
import { FERN_AT, STARK_AT, AURA } from "./cast";
import { DIM, NOISE, SHADOW, SUN, U, UNMAKE, celMaterial, hash, join, limb, part, put } from "./toon";

export const groundY = (x, z) => {
  const r = Math.hypot(x - 1, z + 12);
  const k = Math.max(0, (r - 36) / 40);
  return k * k * 4.5 * (0.65 + 0.35 * Math.sin(x * 0.07 + 1) * Math.cos(z * 0.06));
};

// ---------------------------------------------------------------- the sky
export function skyMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: U.uTime, uSun: U.uSun, uDis: U.uDis, uCrack: U.uCrack, uOriginDir: U.uOriginDir, uDim: U.uDim },
    side: DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uDis, uCrack, uDim;
      uniform vec3 uSun, uOriginDir;
      varying vec3 vW;
      ${NOISE}
      void main() {
        vec3 v = normalize(vW - cameraPosition);
        float h = v.y;
        float rad = (1.0 - dot(v, normalize(uOriginDir))) * 0.62;
        float edge = fbm(v.xy * 7.0 + v.z * 3.0) * 0.6 + rad * 0.55 - uDis * 1.5 + 0.05;
        if (uDis > 0.0 && edge < 0.0) discard;
        // the soft teal sky down to a golden horizon
        vec3 zen = vec3(0.27, 0.58, 0.66);
        vec3 mid = vec3(0.55, 0.79, 0.76);
        vec3 hor = vec3(1.0, 0.82, 0.55);
        vec3 c = mix(hor, mix(mid, zen, smoothstep(0.12, 0.85, h)), smoothstep(-0.02, 0.32, h));
        float sd = max(dot(v, uSun), 0.0);
        c += vec3(1.0, 0.72, 0.34) * (pow(sd, 5.0) * 0.5 + pow(sd, 36.0) * 0.7);
        c = mix(c, vec3(1.0, 0.96, 0.78), smoothstep(0.9988, 0.9994, sd));
        // crisp cel clouds: a flat plane of cloud, a bright face toward the sun, a rose underside
        vec2 cp = v.xz / (h + 0.28) * 1.15 + vec2(uTime * 0.004, 0.0);
        float n = fbm(cp * vec2(1.0, 2.4));
        float body = smoothstep(0.545, 0.56, n) * smoothstep(0.03, 0.2, h);
        float toward = fbm(cp * vec2(1.0, 2.4) + vec2(-uSun.x, -uSun.z) * 0.14);
        float face = smoothstep(0.0, 0.025, n - toward + 0.012);
        vec3 cloudTop = vec3(1.0, 0.86, 0.62);
        vec3 cloudLow = vec3(0.84, 0.56, 0.62);
        c = mix(c, mix(cloudLow, cloudTop, face), body * 0.95);
        // far hills: three layers of ridge, violet to teal, with the village's warm lights on the nearest
        float az = atan(v.x, -v.z);
        float r1 = 0.03 + 0.045 * fbm2(vec2(az * 2.1, 3.0));
        float r2 = 0.012 + 0.04 * fbm2(vec2(az * 3.0 + 5.0, 8.0));
        float r3 = 0.002 + 0.03 * fbm2(vec2(az * 4.4 + 11.0, 1.0));
        c = mix(c, vec3(0.74, 0.58, 0.7), (1.0 - smoothstep(r1 - 0.002, r1, h)) * step(-0.05, h));
        c = mix(c, vec3(0.5, 0.52, 0.6), (1.0 - smoothstep(r2 - 0.002, r2, h)) * step(-0.05, h));
        c = mix(c, vec3(0.3, 0.37, 0.42), (1.0 - smoothstep(r3 - 0.002, r3, h)) * step(-0.05, h));
        float win = step(0.86, h21(floor(vec2(az * 90.0, h * 400.0)))) * (1.0 - smoothstep(r3 - 0.01, r3 - 0.002, h)) * smoothstep(r3 - 0.02, r3 - 0.012, h);
        c += vec3(1.0, 0.7, 0.3) * win * 0.9;
        if (h < -0.01) c = mix(c, hor * 0.95, smoothstep(-0.01, -0.08, h));
        c *= mix(vec3(1.0), vec3(0.42, 0.4, 0.62), uDim);
        float e = uDis > 0.0 ? (1.0 - smoothstep(0.0, 0.07, edge)) : 0.0;
        c += vec3(1.0, 0.78, 0.38) * e * 2.2;
        if (uCrack > 0.0) {
          vec2 q = vor(v.xy * 9.0 + v.z * 4.0);
          float line = 1.0 - smoothstep(0.014, 0.05, q.x);
          float reach = 1.0 - smoothstep(uCrack * 1.5 - 0.3, uCrack * 1.5, rad * 1.5);
          c += vec3(1.0, 0.78, 0.38) * line * reach * 1.7 * smoothstep(-0.05, 0.1, h);
        }
        gl_FragColor = vec4(pow(max(c, 0.0), vec3(2.2)), 1.0);
      }`,
  });
}

// ---------------------------------------------------------------- the ground
export function ground() {
  const g = new PlaneGeometry(300, 300, 60, 60).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)) - 0.02);
  const m = new ShaderMaterial({
    uniforms: { uTime: U.uTime, uDis: U.uDis, uCrack: U.uCrack, uOrigin: U.uOrigin, uHaze: U.uHaze, uDim: U.uDim, uAxis: U.uAxis },
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uHaze;
      uniform float uTime;
      varying vec3 vW;
      ${NOISE}
      ${UNMAKE}
      ${DIM}
      void main() {
        vec3 em = unmake(vW);
        vec2 p = vW.xz;
        vec2 cc = (p - vec2(1.0, -10.0)) / vec2(18.0, 16.0);
        float cd = length(cc) + (fbm(p * 0.33) - 0.5) * 0.4;
        float court = 1.0 - smoothstep(0.8, 0.97, cd);
        // flagstones in running bond, a few cool ones, moss, cracks
        vec2 q = p / vec2(1.3, 0.95);
        float row = floor(q.y);
        q.x += row * 0.5 + h21(vec2(row, 5.0)) * 3.0;
        vec2 f = fract(q);
        vec2 id = floor(q);
        float md = min(min(f.x, 1.0 - f.x) * 1.3, min(f.y, 1.0 - f.y) * 0.95);
        float mortar = 1.0 - smoothstep(0.02, 0.07, md);
        float tone = h21(id);
        vec3 stone = mix(vec3(0.8, 0.66, 0.46), vec3(0.92, 0.77, 0.54), tone);
        stone = mix(stone, vec3(0.62, 0.58, 0.64), step(0.87, tone) * 0.65);
        stone = mix(stone, vec3(0.62, 0.48, 0.2), smoothstep(0.55, 0.62, fbm(p * 0.5 + 3.0)) * 0.55);
        stone *= 1.0 - 0.3 * mortar;
        vec2 vv = vor(p * 0.23);
        stone = mix(stone, vec3(0.3, 0.2, 0.2), (1.0 - smoothstep(0.012, 0.032, vv.x)) * 0.75);
        // autumn grass, gold patches and rust litter
        vec3 grass = mix(vec3(0.6, 0.5, 0.18), vec3(0.74, 0.45, 0.17), smoothstep(0.4, 0.6, fbm(p * 0.12)));
        grass = mix(grass, vec3(0.86, 0.64, 0.22), smoothstep(0.62, 0.66, fbm(p * 0.4 + 9.0)) * 0.7);
        grass = mix(grass, vec3(0.52, 0.27, 0.14), smoothstep(0.6, 0.64, fbm(p * 0.3 + 20.0)));
        vec3 base = mix(grass, stone, court);
        // dappled pools of golden light in cel bands
        float pool = smoothstep(0.42, 0.47, fbm(p * 0.085 + 7.0));
        vec3 c = base * mix(vec3(0.7, 0.62, 0.86), vec3(1.14, 1.02, 0.8), pool);
        float d = length(cameraPosition - vW);
        c = mix(c, uHaze, (1.0 - exp(-d * d * 0.00011 - d * 0.004)) * 0.9);
        c = dimmed(c, vW);
        c += em;
        gl_FragColor = vec4(pow(max(c, 0.0), vec3(2.2)), 1.0);
      }`,
  });
  return { g, m };
}

// ---------------------------------------------------------------- the statics
// the fountain's place and the break in its lip (a gap facing the lens)
export const FOUNTAIN = [-4.4, -4.6];
const GAP = 0.34;
export const TREES = [[-17, -6, 9], [-16.5, -14, 10], [-21, -2, 9], [16, -7, 8], [15.5, -14, 10], [19, -3, 9], [16, -24, 9], [23, -16, 10], [-12, -29, 11], [-20, -24, 10]];
// what throws a long shadow: [x, z, width, height, yaw, alpha]
export const CASTERS = [
  [FERN_AT[0] - 0.2, -13.4, 5.6, 2.6, 0.05, 0.5], [STARK_AT[0] - 0.2, -14.2, 5.6, 2.2, -0.06, 0.5], [-13, -22, 8, 6.5, 0, 0.55], [-17, -18, 1.6, 6, Math.PI / 2, 0.5],
  [-11, -8.5, 1.1, 5.6, 0, 0.5], [-6.6, -9.6, 1.1, 4.2, 0, 0.5], [FOUNTAIN[0], FOUNTAIN[1], 5.0, 1.2, 0, 0.35], [FOUNTAIN[0], FOUNTAIN[1], 1.2, 4.2, 0, 0.45],
  [-10, -42, 11, 22, 0, 0.5], [-19, -40, 8, 28, 0, 0.5], [24, -37, 6.6, 15, 0, 0.5], [0, -35, 60, 9, 0, 0.35],
  ...TREES.map(([x, z, h]) => [x, z, h * 0.55, h * 0.95, 0, 0.45]),
];
const STONE = ["#cdb088", "#c4a67c", "#d3b88f", "#b99c76"];
const ROOF = "#b4502a";
// a crumbling block: the top face is pulled down where it has broken
function block(w, h, d, x, y, z, ry, hex, jag = 0, kind = 1) {
  const g = new BoxGeometry(w, h, d, Math.max(1, Math.round(w / 0.9)), 1, Math.max(1, Math.round(d / 0.9)));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > h / 2 - 1e-4 && jag) p.setY(i, h / 2 - jag * hash(Math.round(p.getX(i) * 7 + p.getZ(i) * 13), 4) ** 1.5);
  }
  g.computeVertexNormals();
  return put(part(g, hex, { kind, flat: true }), x, y + h / 2, z, 0, ry);
}
function drum(r1, r2, h, x, y, z, hex, jag = 0, seg = 14) {
  const g = new CylinderGeometry(r1, r2, h, seg, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > h / 2 - 1e-4 && jag) p.setY(i, h / 2 - jag * hash(Math.round(p.getX(i) * 5 + p.getZ(i) * 9), 5) ** 1.4);
  g.computeVertexNormals();
  return put(part(g, hex, { kind: 1, flat: true }), x, y + h / 2, z);
}
function merlons(x0, x1, y, z, h, hex) {
  const out = [];
  for (let x = x0; x < x1; x += 1.7) out.push(block(0.9, h, 1.0, x, y, z, 0, hex, 0));
  return out;
}

export function statics() {
  const P = [];
  const add = (...a) => P.push(...a.flat());
  // --- the keep, the broken tower, the curtain wall and the gate, far behind the court
  add(block(11, 22, 9, -10, 0, -42, 0, STONE[0], 3.4));
  add(block(11.6, 1.2, 9.6, -10, 22, -42, 0, STONE[1], 0)); // a ledge where the roof was
  add(drum(4.1, 4.4, 28, -19, 0, -40, STONE[2], 5)); // the tall tower, its top blown out
  add(drum(3.3, 3.4, 15, 24, 0, -37, STONE[0], 0));
  add(put(part(new ConeGeometry(4.0, 6.5, 14), ROOF, { flat: true }), 24, 15 + 3.25, -37)); // its roof, still on
  add(block(60, 9, 2.4, 0, 0, -35, 0, STONE[1], 1.8));
  add(merlons(-10, 20, 9, -35, 1.1, STONE[1]));
  add(block(1.5, 11, 3, -3.3, 0, -35, 0, STONE[3], 1.2), block(1.5, 11, 3, 5.3, 0, -35, 0, STONE[3], 1.2)); // the gate's piers
  add(put(part(new BoxGeometry(7.2, 6.4, 1.5), "#3b2a30", { kind: 0 }), 1, 3.2, -34.6)); // the gate's dark mouth
  add(put(part(new CylinderGeometry(3.6, 3.6, 1.5, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2), "#3b2a30", { kind: 0 }), 1, 6.4, -34.6));
  for (const [x, y, z] of [[-12, 12, -37.4], [-8, 15, -37.4], [-10, 8, -37.4], [-19, 14, -35.6], [24, 9, -33.7]]) add(put(part(new BoxGeometry(0.7, 1.4, 0.3), "#ffd488", { kind: 4 }), x, y, z)); // lit windows
  add(put(part(new BoxGeometry(0.7, 1.4, 0.3), "#3b2a30"), -14, 12, -37.4), put(part(new BoxGeometry(0.7, 1.4, 0.3), "#3b2a30"), -6, 12, -37.4));
  // --- the near ruins: a corner of wall on the left, the arch, wall ends flanking the army
  add(block(8, 6.5, 1.6, -13, 0, -22, 0, STONE[0], 2.6), block(1.6, 6, 8, -17, 0, -18, 0, STONE[3], 2.2));
  add(block(5.6, 2.6, 1.3, FERN_AT[0] - 0.2, 0, -13.4, 0.05, STONE[1], 0.35)); // Fern's wall
  add(block(5.6, 2.2, 1.3, STARK_AT[0] - 0.2, 0, -14.2, -0.06, STONE[2], 0.3)); // Stark's wall
  add(block(1.1, 5.6, 1.1, -11, 0, -8.5, 0, STONE[0], 0.8), block(1.1, 4.2, 1.1, -6.6, 0, -9.6, 0, STONE[1], 1.4));
  add(put(part(new TorusGeometry(2.4, 0.5, 5, 12, 1.5), STONE[2], { kind: 1, flat: true }), -9.5, 5.2, -8.9, 0, 0, 0.55)); // half an arch
  add(block(7.0, 0.45, 4.4, AURA.at[0], 0, AURA.at[2], 0, "#bfa27a", 0.12), block(4.8, 0.45, 3.0, AURA.at[0], 0.45, AURA.at[2], 0, "#c8ab82", 0.15)); // the dais
  add(block(2.2, 1.0, 1.1, 13, 0, -4, 0.3, STONE[3], 0.4), block(1.6, 0.7, 1.2, 9.4, 0, -1.0, 0.7, STONE[0], 0.3));
  // a fallen column, drums in the grass
  add(put(part(new CylinderGeometry(0.5, 0.5, 2.4, 10).rotateZ(Math.PI / 2), STONE[2], { kind: 1, flat: true }), 9.6, 0.5, -2.6, 0, 0.35), put(part(new CylinderGeometry(0.5, 0.5, 1.2, 10).rotateZ(Math.PI / 2), STONE[0], { kind: 1, flat: true }), 8.0, 0.48, -3.3, 0, 0.9));
  // --- the cracked fountain: a round basin on a plinth, a broken lip, a stepped pillar with two bowls, a crack right through it
  const [FX, FZ] = FOUNTAIN;
  const wall = (r, h, y0, hex, flat = true) => put(part(new CylinderGeometry(r, r, h, 28, 2, true, GAP, Math.PI * 2 - 2 * GAP), hex, { kind: 1, flat }), FX, y0 + h / 2, FZ);
  add(put(part(new CylinderGeometry(2.95, 3.05, 0.22, 28, 1), STONE[3], { kind: 1, flat: true }), FX, 0.11, FZ)); // the plinth step
  add(wall(2.5, 1.0, 0.2, STONE[2]), wall(2.06, 1.0, 0.2, STONE[1])); // the basin wall, outside and in
  add(put(part(new RingGeometry(2.06, 2.5, 28, 1, -Math.PI / 2 + GAP, Math.PI * 2 - 2 * GAP).rotateX(-Math.PI / 2), STONE[0], { kind: 1, flat: true }), FX, 1.2, FZ)); // the rim
  add(put(part(new CylinderGeometry(2.06, 2.06, 0.1, 28), "#8b6e4c", { kind: 0 }), FX, 0.55, FZ)); // the dry floor
  add(put(part(new CylinderGeometry(0.95, 0.95, 0.05, 16), "#8fd0c8", { kind: 0 }), FX - 0.7, 0.62, FZ + 0.7)); // a puddle of sky
  add(drum(0.62, 0.78, 0.6, FX, 0.6, FZ, STONE[1], 0)); // the pillar's foot
  add(drum(0.34, 0.5, 1.9, FX, 1.2, FZ, STONE[0], 0)); // the shaft
  add(drum(1.45, 0.56, 0.5, FX, 2.7, FZ, STONE[2], 0.2)); // the lower bowl
  add(drum(0.2, 0.3, 0.9, FX, 3.15, FZ, STONE[1], 0)); // the upper shaft
  add(drum(0.8, 0.28, 0.36, FX, 4.0, FZ, STONE[2], 0.18)); // the upper bowl
  add(put(part(new ConeGeometry(0.2, 0.7, 6), STONE[2], { flat: true, kind: 1 }), FX + 0.35, 4.55, FZ, 0.5, 0, 0.7)); // the finial, tipped
  // the break in the lip, where it has fallen into the court
  for (let i = 0; i < 4; i++) add(put(part(new IcosahedronGeometry(0.28 + 0.12 * hash(i, 2), 0), STONE[i % 4], { kind: 1, flat: true }), FX + (hash(i, 3) - 0.5) * 1.8, 0.24 + 0.1 * hash(i, 4), FZ + 2.75 + 0.5 * hash(i, 5), hash(i, 6) * 6, hash(i, 7) * 6, 0));
  // the crack: a dark jag from the gap's edge up the basin wall, across the dry floor, and up the shaft and the bowl
  const crack = (pts, w) => {
    for (let i = 0; i < pts.length - 1; i++) add(part(limb([pts[i][0] + FX, pts[i][1], pts[i][2] + FZ], [pts[i + 1][0] + FX, pts[i + 1][1], pts[i + 1][2] + FZ], w, w, 4), "#2a1c26", { flat: true }));
  };
  crack([[0.9, 1.2, 2.3], [1.15, 0.95, 2.22], [1.0, 0.7, 2.28], [1.3, 0.4, 2.14]], 0.055); // down the wall from the gap
  crack([[1.2, 1.22, 2.0], [1.55, 1.22, 1.85], [1.8, 1.22, 1.7]], 0.05); // across the lip
  crack([[0.9, 0.62, 1.95], [0.55, 0.62, 1.4], [0.85, 0.62, 1.0], [0.45, 0.62, 0.7]], 0.045); // across the floor to the pillar
  crack([[-1.0, 0.62, 1.6], [-0.6, 0.62, 1.0], [-0.5, 0.62, 0.6]], 0.04);
  crack([[0.0, 1.0, 0.53], [0.12, 1.5, 0.5], [-0.06, 2.0, 0.46], [0.1, 2.45, 0.42]], 0.034); // up the shaft
  crack([[-0.5, 3.12, 1.2], [-0.2, 2.96, 1.0], [-0.35, 2.8, 0.66]], 0.04); // across the bowl
  for (let i = 0; i < 9; i++) add(put(part(new IcosahedronGeometry(0.12 + 0.1 * hash(i, 2), 0), i % 2 ? "#b4502a" : "#e0993a", { flat: true }), FX + (hash(i, 3) - 0.5) * 3.0, 0.64 + 0.05 * hash(i, 5), FZ + (hash(i, 4) - 0.5) * 3.0)); // leaves in the basin
  // --- autumn trees: a trunk, two limbs, a cloud of blobs
  const leaf = ["#b84a22", "#e08a2e", "#f0b840", "#9e2f26", "#d8702a", "#c89a30"];
  const tree = (x, z, h, s = 1, seed = 0) => {
    const y0 = groundY(x, z);
    P.push(part(new CylinderGeometry(0.2 * s, 0.4 * s, h * 0.55, 8), "#5a3a2c", { flat: true }).translate(x, y0 + h * 0.275, z));
    for (const sd of [-1, 1]) P.push(part(limb([x, y0 + h * 0.4, z], [x + sd * h * 0.22, y0 + h * 0.7, z + 0.2 * sd], 0.12 * s, 0.07 * s, 6), "#5a3a2c", { flat: true }));
    const blobs = 6;
    for (let b = 0; b < blobs; b++) {
      const a = (b / blobs) * 6.283 + seed;
      const r = h * 0.2 * (0.6 + 0.6 * hash(seed + b, 1));
      const bx = x + Math.cos(a) * r;
      const bz = z + Math.sin(a) * r * 0.8;
      const by = y0 + h * (0.62 + 0.17 * hash(seed + b, 2) + (b === 0 ? 0.12 : 0));
      const rad = h * (0.2 + 0.07 * hash(seed + b, 3));
      P.push(part(new IcosahedronGeometry(rad, 1), leaf[(seed + b) % leaf.length], { sway: 0.28, flat: true }).translate(bx, by, bz));
    }
    P.push(part(new IcosahedronGeometry(h * 0.18, 1), leaf[(seed + 2) % leaf.length], { sway: 0.3, flat: true }).translate(x, y0 + h * 0.98, z));
  };
  TREES.forEach(([x, z, h], i) => tree(x, z, h, h / 8, i * 3));
  // --- rubble lying in the grass: low faceted stones
  for (let i = 0; i < 26; i++) {
    const x = -14 + 34 * hash(i, 1);
    const z = -26 + 24 * hash(i, 2);
    if (Math.hypot(x, z) < 2.2 || Math.hypot(x - 2.3, z + 5) < 4.2 || Math.hypot(x - FOUNTAIN[0], z - FOUNTAIN[1]) < 3.4) continue;
    const s = 0.2 + 0.5 * hash(i, 3) ** 2;
    P.push(put(part(new IcosahedronGeometry(s, 0).scale(1.3, 0.7, 1), STONE[i % 4], { kind: 1, flat: true }), x, groundY(x, z) + s * 0.3, z, hash(i, 4), hash(i, 5) * 6, 0));
  }
  return join(P);
}
export const staticMaterial = () => celMaterial();

// ---------------------------------------------------------------- long shadows
// strips from a base line, away from the sun, fading to the tip. casters: [x, z, width, height, yaw]
export function shadows(casters) {
  const pos = [];
  const al = [];
  const L = 2.9; // shadow length per metre of height
  for (const [x, z, w, h, yaw = 0, a = 0.5] of casters) {
    const ax = Math.cos(yaw) * w * 0.5;
    const az = -Math.sin(yaw) * w * 0.5;
    const dx = SHADOW.x * h * L;
    const dz = SHADOW.z * h * L;
    const q = [[x - ax, z - az, a], [x + ax, z + az, a], [x + ax + dx, z + az + dz, 0], [x - ax + dx, z - az + dz, 0]];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      pos.push(q[i][0], 0.035, q[i][1]);
      al.push(q[i][2]);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aA", new BufferAttribute(new Float32Array(al), 1));
  const m = new ShaderMaterial({
    uniforms: { uDis: U.uDis, uCrack: U.uCrack, uOrigin: U.uOrigin },
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    vertexShader: /* glsl */ `
      attribute float aA;
      varying float vA;
      varying vec3 vW;
      void main() {
        vA = aA;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      varying vec3 vW;
      ${NOISE}
      ${UNMAKE}
      void main() {
        unmake(vW);
        gl_FragColor = vec4(pow(vec3(0.34, 0.2, 0.42), vec3(2.2)), vA * 0.62);
      }`,
  });
  return { g, m };
}

// ---------------------------------------------------------------- shafts of light
export function shafts() {
  const pos = [];
  const vv = [];
  const al = [];
  const dir = SUN.clone().negate(); // light travels away from the sun
  const side = new Vector3().crossVectors(dir, new Vector3(0, 1, 0)).normalize();
  const len = 40;
  for (let i = 0; i < 8; i++) {
    const hw = 1.1 + 1.2 * hash(i, 1);
    const x = -26 + 6.4 * i + 3 * hash(i, 2);
    const z = -46 - 6 * hash(i, 3);
    const a = 0.06 + 0.08 * hash(i, 4);
    const q = [];
    for (const [t, k] of [[0, 1], [1, 1.9]]) for (const sd of [-1, 1]) q.push([x + dir.x * len * t + side.x * hw * k * sd, 14 + dir.y * len * t, z + dir.z * len * t + side.z * hw * k * sd, t]);
    for (const k of [0, 1, 3, 0, 3, 2]) {
      pos.push(q[k][0], q[k][1], q[k][2]);
      vv.push(q[k][3]);
      al.push(a);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aV", new BufferAttribute(new Float32Array(vv), 1));
  g.setAttribute("aA", new BufferAttribute(new Float32Array(al), 1));
  const m = new ShaderMaterial({
    uniforms: { uDis: U.uDis },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aV;
      attribute float aA;
      varying float vV;
      varying float vA;
      void main() {
        vV = aV;
        vA = aA;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uDis;
      varying float vV;
      varying float vA;
      void main() {
        float k = smoothstep(0.0, 0.25, vV) * (1.0 - smoothstep(0.5, 1.0, vV));
        gl_FragColor = vec4(pow(vec3(1.0, 0.78, 0.42), vec3(2.2)) * vA * k * (1.0 - clamp(uDis * 2.0, 0.0, 1.0)), 1.0);
      }`,
  });
  return { g, m };
}
