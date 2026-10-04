// ACADEMY CITY, as meshes. Four map "leaves" (slabs) hinged one behind the next
// along x-parallel creases, so at the end the whole city folds shut like a
// closing city map: the plaza leaf stays, the others turn up and over it in
// an accordion. Every leaf is ONE merged mesh (ground, roads, towers, rooftop
// plant, signals, the rail viaduct), cel-shaded by shade.js; the wind turbines'
// rotors are one instanced mesh a leaf (they spin, so they are not baked in).
// Frame: the move's rig (the pup at the origin, the lens out along +z), the
// ground at y = 0. A leaf's own space has its crease at z = 0 and runs to -z.

import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { NOISE, merge, part } from "./shade";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

// the creases (world z): A is fixed; B turns at -22, C at B's far end, D at C's far end
export const HINGE = [0, -22, -50, -82];
export const LEN = [38, 28, 32, 48]; // leaf lengths (A runs from z = 16 back to -22)
const X0 = -110;
const X1 = 110;

const box = (w, h, d, x, y, z, color, kind = 0, tall = 1) => part(new BoxGeometry(w, h, d).translate(x, y + h / 2, z), color, kind, tall);
const cyl = (r0, r1, h, x, y, z, color, kind = 0, seg = 8, tall = 1) => part(new CylinderGeometry(r1, r0, h, seg).translate(x, y + h / 2, z), color, kind, tall);

const WALL = ["#eef3fa", "#dfe8f3", "#cfdcec", "#f5f7fb", "#e4ecf6", "#c4d6ea"];
const GLASS = ["#6f9fd6", "#7fb0dc", "#8db8e2", "#5f8fcb"];
const ROOF = "#e6edf6";

// a tower: podium, shaft, roof ledge, a stepped upper block, a mast; rotors are returned for the instanced pass
function tower(parts, rotors, x, z, w, d, h, i, { kind, color, turbine = false, simple = false }) {
  const col = color ?? (kind === 8 ? GLASS[i % GLASS.length] : WALL[i % WALL.length]);
  if (!simple) parts.push(box(w + 3.2, 3.2, d + 3.2, x, 0, z, "#dde6f1", 0)); // the podium
  parts.push(box(w, h, d, x, 0, z, col, kind));
  parts.push(box(w + 0.7, 0.6, d + 0.7, x, h, z, ROOF, 9));
  if (!simple) {
    const sh = h * (0.12 + 0.12 * hash(i, 3));
    parts.push(box(w * 0.6, sh, d * 0.6, x + w * 0.1, h + 0.6, z - d * 0.05, col, kind));
    parts.push(box(w * 0.18, 1.1, d * 0.3, x - w * 0.28, h + 0.6, z + d * 0.2, "#c9d6e6", 0)); // roof plant
  }
  if (turbine) {
    const mx = x - w * 0.22;
    const mz = z + d * 0.28;
    const my = h + 0.6;
    const mastH = 3.4;
    parts.push(cyl(0.16, 0.1, mastH, mx, my, mz, "#f2f6fb", 0, 6));
    rotors.push([mx, my + mastH, mz + 0.3, 1, hash(i, 9) * 6.28]);
  }
}

function signal(parts, x, z) {
  parts.push(box(0.2, 5.2, 0.2, x, 0, z, "#cdd8e6", 4));
  parts.push(box(0.6, 1.7, 0.5, x, 3.7, z, "#46526a", 0));
  for (const [dy, c] of [[1.35, "#ff5a4f"], [0.9, "#ffc23d"], [0.45, "#3fd0b0"]]) parts.push(box(0.34, 0.34, 0.12, x, 3.7 + dy - 0.2, z + 0.28, c, 3));
}

function tree(parts, x, z, s = 1) {
  parts.push(box(3.6 * s, 0.5, 3.6 * s, x, 0, z, "#e9eff7", 0));
  parts.push(cyl(0.16, 0.2, 2.1 * s, x, 0.5, z, "#6d7b92", 0, 6));
  parts.push(part(new IcosahedronGeometry(1.5 * s, 1).translate(x, 3.1 * s, z), "#8bbfb2", 0, 1));
  parts.push(part(new IcosahedronGeometry(1.0 * s, 1).translate(x + 0.9 * s, 2.5 * s, z + 0.3 * s), "#7fb3a8", 0, 1));
}

// the rail viaduct: a deck on pylons with two rails and catenary masts, running along x at z = zc
function viaduct(parts, zc) {
  parts.push(box(X1 - X0, 0.7, 3.2, 0, 6.0, zc, "#cbd8e8", 4));
  parts.push(box(X1 - X0, 0.55, 0.16, 0, 6.7, zc - 1.5, "#e8eff8", 0));
  parts.push(box(X1 - X0, 0.55, 0.16, 0, 6.7, zc + 1.5, "#e8eff8", 0));
  parts.push(box(X1 - X0, 0.14, 0.14, 0, 6.7, zc - 0.7, "#6f7f97", 4));
  parts.push(box(X1 - X0, 0.14, 0.14, 0, 6.7, zc + 0.7, "#6f7f97", 4));
  for (let x = X0 + 6; x < X1; x += 12) {
    parts.push(box(1.5, 6.0, 1.8, x, 0, zc, "#d8e2ef", 0));
    parts.push(box(3.8, 0.9, 3.0, x, 5.1, zc, "#cbd8e8", 0));
  }
  for (let x = X0 + 12; x < X1; x += 24) {
    parts.push(box(0.16, 4.2, 0.16, x, 6.7, zc + 1.9, "#8a99ae", 4));
    parts.push(box(0.16, 0.16, 2.0, x, 10.7, zc + 0.9, "#8a99ae", 4));
  }
}

// ---- the leaves
export function leaves() {
  const rotors = [[], [], [], []];
  const P = [[], [], [], []];
  const at = (leaf, zWorld) => zWorld - HINGE[leaf];

  // LEAF A: the plaza, the avenues, the viaduct, the near towers
  {
    const p = P[0];
    p.push(box(X1 - X0, 0.2, LEN[0], 0, -0.2, 16 - LEN[0] / 2, "#c3d1e3", 2, 0));
    p.push(box(34, 0.02, 30, 0, 0, 1, "#e3eaf3", 2, 0)); // the plaza
    for (const sx of [-1, 1]) p.push(box(8, 0.03, LEN[0], sx * 27, 0, 16 - LEN[0] / 2, "#7a8aa1", 6, 0)); // the avenues
    p.push(box(X1 - X0, 0.03, 7.4, 0, 0, -17.8, "#7a8aa1", 5, 0)); // the cross street under the viaduct
    // lane dashes, crossing stripes, curbs
    for (let x = X0; x < X1; x += 5.2) p.push(box(2.6, 0.02, 0.18, x, 0.03, -17.8, "#f4f7fb", 0, 0));
    for (const sx of [-1, 1]) for (let z = -20; z < 16; z += 5.2) p.push(box(0.18, 0.02, 2.6, sx * 27, 0.03, z, "#f4f7fb", 0, 0));
    for (let x = -14; x <= 14; x += 1.7) p.push(box(0.9, 0.02, 2.4, x, 0.03, -15.0, "#f4f7fb", 0, 0));
    p.push(box(34.6, 0.2, 0.3, 0, 0, -14.1, "#f4f7fb", 0, 0));
    for (const sx of [-1, 1]) p.push(box(0.3, 0.2, 30, sx * 17.1, 0, 1, "#f4f7fb", 0, 0));
    viaduct(p, -17.8);
    // the plaza's own furniture: trees in the corners, signals at the crossing, bollard lamps along the front edge
    for (const [x, z] of [[-14.5, 11], [14.5, 11], [-14.5, -11], [14.5, -11]]) tree(p, x, z);
    for (const [x, z] of [[-16.6, -13.4], [16.6, -13.4], [-16.6, 14.2], [16.6, 14.2]]) signal(p, x, z);
    for (let x = -12; x <= 12; x += 4) p.push(cyl(0.18, 0.18, 0.9, x, 0, 15.2, "#f4f7fb", 4, 8));
    for (let x = -12; x <= 12; x += 4) p.push(cyl(0.2, 0.2, 0.16, x, 0.9, 15.2, "#9fe0ff", 3, 8));
    // the towers
    const T = [
      [-25, -9, 12, 10, 38, 1, WALL[0], true],
      [-37, -13, 11, 12, 52, 1, WALL[2], true],
      [-30, -19, 10, 8, 27, 8, GLASS[1], false],
      [-45, -4, 10, 10, 20, 1, WALL[3], false],
      [25, -8, 11, 11, 44, 1, WALL[1], true],
      [37, -12, 12, 10, 31, 8, GLASS[2], false],
      [31, -19, 10, 8, 58, 1, WALL[0], true],
      [46, -6, 10, 12, 22, 1, WALL[2], false],
      [-58, -14, 12, 12, 34, 1, WALL[4], false],
      [58, -14, 12, 12, 40, 8, GLASS[0], false],
    ];
    T.forEach(([x, z, w, d, h, kind, color, turbine], i) => tower(p, rotors[0], x, z, w, d, h, i, { kind, color, turbine }));
    // a second turbine on the tallest roofs, and two on the viaduct side
    for (const [x, y, z] of [[-33, 52.6, -11.5], [35, 58.6, -17.4]]) {
      p.push(cyl(0.16, 0.1, 3.4, x, y, z, "#f2f6fb", 0, 6));
      rotors[0].push([x, y + 3.4, z + 0.3, 1.1, hash(x, 4) * 6.28]);
    }
  }

  // LEAVES B, C, D: the blocks, an avenue down the middle, cross streets
  const field = (leaf, rows, hLo, hHi, simple) => {
    const p = P[leaf];
    const z0 = HINGE[leaf];
    p.push(box(X1 - X0, 0.2, LEN[leaf], 0, -0.2, -LEN[leaf] / 2, "#c3d1e3", 2, 0));
    p.push(box(12, 0.03, LEN[leaf], 0, 0, -LEN[leaf] / 2, "#7a8aa1", 6, 0));
    for (let z = -6; z > -LEN[leaf]; z -= 16) p.push(box(X1 - X0, 0.03, 5.6, 0, 0, z, "#7a8aa1", 5, 0));
    for (let z = -LEN[leaf] + 1; z < 0; z += 5.2) p.push(box(0.18, 0.02, 2.6, 0, 0.03, z, "#f4f7fb", 0, 0));
    let n = leaf * 100;
    for (let r = 0; r < rows; r++) {
      const zw = z0 - 10 - r * 16 + (leaf === 3 ? -2 : 0);
      for (let x = -100; x <= 100; x += 15) {
        n++;
        if (Math.abs(x) < 12) continue;
        const j = hash(n, 1);
        const w = 8 + 5 * hash(n, 2);
        const d = 8 + 4 * hash(n, 3);
        const h = hLo + (hHi - hLo) * hash(n, 4) ** 1.3 + Math.abs(x) * 0.12;
        tower(p, rotors[leaf], x + (j - 0.5) * 3, at(leaf, zw) + (hash(n, 5) - 0.5) * 3, w, d, h, n, { kind: j > 0.68 ? 8 : 1, turbine: hash(n, 6) > 0.62 && h > 18, simple });
      }
    }
    if (leaf === 3) {
      // the far landmark: a great pale tower crowned by one giant turbine, at the end of the avenue
      const gz = at(3, -122);
      tower(p, rotors[3], 6, gz, 15, 15, 96, 777, { kind: 1, color: WALL[3], simple: true });
      p.push(cyl(0.9, 0.5, 14, 6, 96.6, gz, "#f2f6fb", 0, 8));
      rotors[3].push([6, 110.6, gz + 1.6, 6.5, 0.6]);
    }
  };
  field(1, 2, 14, 38, false);
  field(2, 2, 18, 56, false);
  field(3, 3, 26, 74, true);

  return P.map((list, i) => ({ g: merge(list), rotors: rotors[i] }));
}

// ONE rotor: a hub and three tapered white blades in the xy plane, tipped in blue; the blade length is 2.6 m
export function rotorGeometry() {
  const list = [part(new SphereGeometry(0.2, 8, 6), "#ffffff", 0, 1)];
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    list.push(part(new BoxGeometry(0.34, 2.6, 0.07).translate(0, 1.5, 0).rotateZ(a), "#f7faff", 0, 1));
    list.push(part(new BoxGeometry(0.36, 0.5, 0.075).translate(0, 2.55, 0).rotateZ(a), "#3b74d9", 0, 1));
  }
  return merge(list);
}

// THE TRAIN CAR: nose +z, 6 m long, white with a blue stripe, a window band, two bogeys
export function trainGeometry() {
  const list = [
    box(1.5, 1.7, 6.0, 0, 0.45, 0, "#f3f7fb", 0, 0),
    box(1.3, 0.3, 5.6, 0, 2.15, 0, "#cfdcec", 0, 0),
    box(1.54, 0.5, 5.3, 0, 1.45, 0, "#4f86d8", 8, 0),
    box(1.54, 0.2, 6.02, 0, 0.8, 0, "#2f6fe0", 0, 0),
    box(1.2, 0.5, 0.1, 0, 1.45, 3.01, "#2f5fb8", 0, 0),
    box(0.4, 0.3, 0.08, -0.4, 0.75, 3.02, "#ffd96b", 3, 0),
    box(0.4, 0.3, 0.08, 0.4, 0.75, 3.02, "#ffd96b", 3, 0),
    box(1.0, 0.35, 1.4, 0, 2.45, 1.0, "#aebfd4", 4, 0),
    box(1.2, 0.5, 1.5, 0, 0.0, 2.0, "#46526a", 4, 0),
    box(1.2, 0.5, 1.5, 0, 0.0, -2.0, "#46526a", 4, 0),
  ];
  return merge(list);
}

// THE SKY: a bright overcast, cel clouds (white lit tops, blue undersides), a hard small sun behind them.
// A shell of 140 m round the rig; the pale wave of the shock erases it from the burst point outward.
export function sky(U) {
  const g = new IcosahedronGeometry(1, 3);
  const m = new ShaderMaterial({
    uniforms: { ...U, uInside: { value: 0 }, uWave: { value: -1 }, uPop: { value: new Vector3(0, 0, -1) }, uAlpha: { value: 1 } },
    side: 2,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      varying vec3 vN;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * position);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uHaze, uPop;
      uniform float uTime, uInside, uWave, uAlpha;
      varying vec3 vW;
      varying vec3 vN;
      ${NOISE}
      void main() {
        vec3 v = normalize(vW - cameraPosition);
        float h = v.y;
        vec3 zen = vec3(0.27, 0.48, 0.84);
        vec3 mid = vec3(0.45, 0.67, 0.93);
        vec3 c = mix(uHaze, mix(mid, zen, smoothstep(0.22, 0.9, h)), smoothstep(0.0, 0.3, h));
        if (h < 0.0) c = mix(uHaze, vec3(0.8, 0.88, 0.96), smoothstep(0.0, -0.2, h));
        float az = atan(v.x, -v.z);
        vec2 cp = vec2(az * 2.4 + uTime * 0.012, h * 6.0);
        float warp = fbm(cp * 0.6) * 0.9;
        float cl = fbm(cp + warp);
        float body = smoothstep(0.5, 0.535, cl) * smoothstep(0.02, 0.12, h) * (1.0 - smoothstep(0.78, 0.98, h) * 0.5);
        float lit = smoothstep(0.5, 0.535, fbm(cp + warp + vec2(0.03, -0.11)));
        vec3 cloud = mix(vec3(0.64, 0.76, 0.93), vec3(1.0, 1.0, 1.0), lit);
        c = mix(c, cloud, body);
        float sd = max(dot(v, normalize(uSun)), 0.0);
        c += vec3(1.0, 0.97, 0.88) * pow(sd, 36.0) * 0.55 + vec3(1.0, 0.98, 0.94) * pow(sd, 5.0) * 0.1;
        c = mix(c, vec3(1.0), smoothstep(0.9993, 0.9996, sd) * (1.0 - body * 0.9));
        float alpha = uAlpha;
        if (gl_FrontFacing && uInside < 0.5) {
          float f = pow(1.0 - abs(dot(normalize(vN), v)), 2.0);
          c += f * vec3(0.55, 0.75, 1.0) * 0.5;
          alpha = mix(0.3, 1.0, f);
        }
        // the shock wave erases the dimension's sky from the burst outward, a bright front on its edge
        if (uWave > 0.0) {
          float reach = acos(clamp(dot(v, normalize(uPop)), -1.0, 1.0));
          alpha *= smoothstep(uWave - 0.05, uWave + 0.12, reach);
          c = mix(c, vec3(1.0), exp(-pow((reach - uWave - 0.03) / 0.07, 2.0)) * 0.9);
        }
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), alpha);
      }`,
  });
  return { g, m };
}

