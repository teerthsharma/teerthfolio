// The set's boost, in the live paper style: terraces and boulders out to the lens edges, contour arcs and ember slits, blades, six forest
// layers that reach both lens edges, a second village row with burning roofs, one smoke layer, two far ridges, the cliff's ledges.
// The live layers in live/world.js are kept as they are. Every colour is a live hex or a mix of two (LIVE.md section 1).
import { card, circle, hash as R, merge } from "../live/paper.js";
import { FLOOR, FRONT, TOP } from "../live/world.js";

const layer = (id, g, m, z, o = {}) => ({ id, g, m, z, y: 0, px: 0, sway: 0, fg: false, sink: false, order: 0, ...o });
const D = Math.PI / 180;

const flat = (pts, color, y, depth = 0.02) => card(pts.map(([x, z]) => [x, -z]), { depth, color }).rotateX(-Math.PI / 2).translate(0, y - depth / 2, 0);

function rock(cx, y, z, w, h, seed, color, depth) {
  const pts = [[-w / 2, 0]];
  const k = 6;
  for (let i = 0; i <= k; i++) {
    const a = Math.PI - (Math.PI * i) / k;
    pts.push([Math.cos(a) * (w / 2) * (0.82 + 0.3 * R(i, seed)), Math.sin(a) * h * (0.72 + 0.4 * R(i, seed + 2)) + 0.06]);
  }
  pts.push([w / 2, 0]);
  return card(pts.reverse(), { color, depth }).translate(cx, y, z);
}

function cedar(x, y, z, h, w, seed, color, tiers = true) {
  const parts = [];
  parts.push(card([[-w * 1.9, 0], [-w * 0.95, h * 0.03], [-w * 0.62, h * 0.14], [-w * 0.34, h], [w * 0.34, h], [w * 0.62, h * 0.14], [w * 0.95, h * 0.03], [w * 1.9, 0]], { color, depth: Math.max(0.05, w * 0.1) }).translate(x, y, z));
  for (let i = 0; i < 3; i++) {
    const hh = h * (0.25 + 0.2 * i + 0.1 * R(i, seed));
    const s = (i + seed) % 2 ? 1 : -1;
    parts.push(card([[0, 0], [s * w * (1.6 + R(i, seed + 1)), w * 0.5], [s * w * 0.2, w * 0.45]], { color, depth: 0.06 }).translate(x, y + hh, z + 0.01));
  }
  if (tiers) {
    const base = h * 0.55;
    const n = Math.max(2, Math.min(5, Math.floor((h * 0.45) / 2.2)));
    for (let t = 0; t < n; t++) {
      const yy = base + t * ((h * 0.42) / n);
      const s = (2.6 - t * 0.4) * (0.8 + 0.4 * R(t, seed + 9)) * Math.min(1.6, 0.6 + w);
      parts.push(card([[-s, yy], [-s * 0.4, yy + 0.7], [0, yy + 2.3], [s * 0.45, yy + 0.7], [s, yy], [s * 0.5, yy - 0.3], [-s * 0.5, yy - 0.3]], { color, depth: 0.08 }).translate(x, y, z + 0.02 + 0.005 * t));
    }
  }
  return merge(parts);
}

const LEAVES = ["#7a2b1c", "#a2461f", "#5b2318", "#3c1d2a"];
const leaf = (x, z, len, a, y, color) => {
  const w = len / 2, c = Math.cos(a), s = Math.sin(a);
  return flat([[-w, 0], [0, w * 0.45], [w, 0], [0, -w * 0.45]].map(([u, v]) => [x + u * c - v * s, z + u * s + v * c]), color, y);
};

function slab(xl, xr, zFront, yTop, thick, color, seed) {
  const n = Math.ceil((xr - xl) / 1.8), poly = [];
  for (let i = 0; i <= n; i++) {
    const x = xl + ((xr - xl) * i) / n;
    poly.push([x, -(zFront + (R(i, seed) - 0.5) + 0.55 * Math.sin(x * 0.33 + seed))]);
  }
  poly.push([xr, 130], [xl, 130]);
  return card(poly, { depth: thick, color }).rotateX(-Math.PI / 2).translate(0, yTop - thick / 2, 0);
}

function wideTerraces() {
  const cols = ["#33203f", "#3a2342", "#41273f", "#472a3b", "#4d2e3a", "#512f38"], parts = [];
  for (let k = 0; k < 6; k++) {
    const thick = 0.2 + 0.02 * k;
    parts.push(slab(-(70 + 14 * k), -(16 + 5 * k), FRONT[k], TOP[k], thick, cols[k], 60 + k));
    parts.push(slab(16 + 5 * k, 70 + 14 * k, FRONT[k], TOP[k], thick, cols[k], 70 + k));
  }
  return parts;
}

function contourArcs() {
  const parts = [];
  [[3.9, 1], [7.2, 3], [9.4, 4]].forEach(([rx, e]) => {
    const rz = 0.55 * rx, a0 = 360 * R(e, 202) * D;
    const len = (70 + 40 * R(3 * e, 201)) * D, up = [], dn = [];
    for (let s = 0; s <= 10; s++) {
      const a = a0 + (len * s) / 10;
      up.push([-1.5 + (rx + 0.025) * Math.cos(a), 2 + (rz + 0.02) * Math.sin(a)]);
      dn.unshift([-1.5 + (rx - 0.025) * Math.cos(a), 2 + (rz - 0.02) * Math.sin(a)]);
    }
    parts.push(flat([...up, ...dn], "#e9dcc0", 0.04, 0.04));
  });
  return parts;
}

const PATCH_CENTRES = [
  [-4.5, 1.0, 1.6, 0.9], [-4.5, 2.5, 1.3, 0.8], [-3.0, 1.0, 1.5, 0.8], [-2.3, 5.5, 1.4, 0.9], [0.9, 5.5, 1.5, 0.8], [1.1, 3.7, 1.3, 0.8],
  [2.4, 4.5, 1.4, 0.8], [3.0, 0.5, 1.4, 0.8], [4.2, 1.4, 1.3, 0.8], [5.3, 2.5, 1.5, 0.9], [5.4, 0.5, 1.3, 0.7],
  [-3.9, 1.7, 1.4, 0.8], [3.8, 0.0, 1.4, 0.8], [1.9, 2.6, 1.4, 0.8], [1.0, 4.4, 1.4, 0.8],
];
function scorchPatches() {
  return PATCH_CENTRES.map(([cx, cz, rx, rz], i) => flat(
    circle(0, 0, 1, 14).map(([x, z], k) => [cx + x * rx * (0.85 + 0.3 * R(k, 220 + i)), cz + z * rz * (0.85 + 0.3 * R(k, 240 + i))]),
    ["#0d0916", "#120c1a", "#150d1c"][i % 3], 0.03, 0.02));
}

function terraceStage() {
  const parts = [];
  for (let k = 1; k <= 5; k++) {
    const xl = -16 - (k - 1) * 5, xr = 16 + (k - 1) * 5;
    parts.push(flat([[xl, FRONT[k]], [xr, FRONT[k]], [xr, FRONT[k] + 0.9], [xl, FRONT[k] + 0.9]], "#0d0916", TOP[k - 1] + 0.025));
    parts.push(flat([[xl, FRONT[k] + 0.9], [xr, FRONT[k] + 0.9], [xr, FRONT[k] + 1.6], [xl, FRONT[k] + 1.6]], "#120c1a", TOP[k - 1] + 0.025));
  }
  for (let i = 0; i < 70; i++) {
    const k = i % 3;
    const z = k === 0 ? -2.6 + 10.8 * R(i, 100) : k === 1 ? -6.2 + 3.0 * R(i, 101) : -10.2 + 3.6 * R(i, 102);
    const x0 = (R(i, 103) - 0.5) * 32;
    const x = Math.abs(x0) < 1.4 && Math.abs(z) <= 0.6 ? x0 + 2.8 : x0;
    parts.push(leaf(x, z, 0.12 + 0.18 * R(i, 104), R(i, 105) * Math.PI, TOP[k] + 0.02, LEAVES[i % 4]));
  }
  for (let i = 0; i < 6; i++) {
    const k = i % 4;
    const x = (i % 2 ? 1 : -1) * (4 + 7 * R(i, 110));
    const z = FRONT[k] - 0.8 - 1.4 * R(i, 111);
    parts.push(rock(x, TOP[k] - 0.05, z, 0.8 + 1.6 * R(i, 112), 0.5 + 1.0 * R(i, 113), 40 + i, i % 2 ? "#1a1228" : "#221832"));
  }
  for (const [x, k, z] of [[-7, 1, FRONT[1] - 1.6], [6, 2, FRONT[2] - 1.8]]) {
    parts.push(card([[-0.6, 0], [0.6, 0], [0.45, 0.9], [-0.45, 0.9]], { color: "#1c1226", depth: 0.3 }).translate(x, TOP[k], z));
  }
  for (let i = 0; i < 64; i++) {
    const x = -10 + (20 * (i + 0.5 * R(i, 1))) / 64, h = 0.2 + 0.5 * R(i, 130) ** 1.5, b = (R(i, 131) - 0.5) * 0.4;
    parts.push(card([[x - 0.08, 0], [x + 0.1, 0], [x + b + 0.02, h]], { color: R(i, 132) > 0.5 ? "#0b0716" : "#150d22", depth: 0.04 }).translate(0, TOP[1], -4.5));
  }
  parts.push(...wideTerraces(), ...contourArcs(), ...scorchPatches());
  [[-8.2, 1.6, 2.2, 1.3], [1.6, 4.4, 1.8, 1.0], [6.4, 0.8, 2.4, 1.4], [-1.0, 4.6, 1.2, 0.7]].forEach(([x, z, w, h], i) => {
    parts.push(rock(x, TOP[0], z, w, h, 300 + 3 * i, i % 2 ? "#221832" : "#1a1228", 0.12));
  });
  return merge(parts);
}

function emberSlits() {
  const parts = [];
  [[5, -6, -0.5, 0.5, 5.5], [4, 0.5, 6.5, -0.5, 4]].forEach(([n, xa, xb, za, zb], g) => {
    for (let j = 0; j < n; j++) {
      const q = 10 * g + j, hw = 0.05 + 0.04 * R(q, 210), len = Math.min(2.5 + 3.5 * R(q, 211), xb - xa - 0.2);
      const x0 = xa + (xb - xa - len) * R(q, 212), zc = za + (zb - za) * R(q, 213), N = Math.max(2, Math.round(len / 0.5));
      const up = [], dn = [], cu = [], cd = [];
      for (let s = 0; s <= N; s++) {
        const x = x0 + (len * s) / N, zz = zc + (s % 2 ? 0.1 : -0.1) * (0.5 + R(s, q));
        up.push([x, zz + hw]);
        dn.unshift([x, zz - hw]);
        cu.push([x, zz + 0.4 * hw]);
        cd.unshift([x, zz - 0.4 * hw]);
      }
      parts.push(flat([...up, ...dn], "#ff6a2a", 0.05, 0.02), flat([...cu, ...cd], "#ffb04a", 0.06, 0.02));
    }
  });
  return parts;
}

function seamsGlow() {
  const parts = [];
  const zones = [[2, -9.8, -7.0], [3, -14.4, -11.0], [4, -21.4, -15.6]];
  zones.forEach(([k, za, zb], zi) => {
    for (let j = 0; j < 3; j++) {
      const n = zi * 3 + j, x0 = -12 + 24 * R(n, 90), len = 2 + 3 * R(n, 91), zc = za + (zb - za) * R(n, 92);
      const up = [], dn = [];
      for (let s = 0; s <= 10; s++) {
        const x = x0 + (len * s) / 10, zz = zc + (s % 2 ? 0.1 : -0.1) * (0.5 + R(s, n));
        up.push([x, zz + 0.025]);
        dn.unshift([x, zz - 0.025]);
      }
      parts.push(flat([...up, ...dn], "#ff6a2a", TOP[k] + 0.04));
    }
  });
  return merge([...parts, ...emberSlits()]);
}

function grassMid() {
  const parts = [];
  for (let i = 0; i < 90; i++) {
    let x = -14 + (28 * (i + 0.5 * R(i, 140))) / 90;
    if (Math.abs(x) < 1.6) x += Math.sign(x || 1) * 1.6;
    const h = 0.33 + 0.44 * R(i, 141), b = (R(i, 142) - 0.5) * 0.12;
    parts.push(card([[x - 0.06, 0], [x + 0.07, 0], [x + b + 0.01, h]], { color: R(i, 143) > 0.5 ? "#0b0716" : "#150d22", depth: 0.06 }));
  }
  return merge(parts);
}

const FOREST = { zs: [-25, -31, -39, -47, -62.8, -85], base: [22, 16, 9.5, 8.2, 7.5, 6], cols: ["#181029", "#1f1434", "#281b3d", "#30204a", "#3a2852", "#43305e"], orders: [4.5, 5.5, 6.5, 7.5, 8.5, 9.5] };
const REACH = [190, 226, 276, 326, 424, 562], PITCH = [3.4, 3.2, 3.0, 2.8, 2.6, 2.4];

function forest(j) {
  const idx = 2 * j + 1, span = REACH[j], gap = PITCH[j], parts = [];
  for (let x = -span, i = 0; x < span; x += gap * (0.8 + 0.4 * R(i, 30 + idx)), i++) {
    if (Math.abs(x) < 18) continue;
    const h = FOREST.base[j] * (0.7 + 0.5 * R(i, 31 + idx));
    const w = (0.55 + 0.55 * R(i, 32 + idx)) * (1 + idx * 0.12);
    parts.push(cedar(x, 0, 0, h, w, i + idx * 7, FOREST.cols[j], R(i, 33 + idx) > 0.35));
  }
  return layer(`forestDepth${j}`, merge(parts), "solid", FOREST.zs[j], { y: FLOOR, sway: 0.004 + 0.002 * idx, order: FOREST.orders[j] });
}

const V2 = { z: -70, s: 0.8, x0: -210, x1: 420 };

function villageRow() {
  const houses = [], glows = [], flames = [];
  let x = V2.x0, i = 0;
  const S = (pts) => pts.map(([u, v]) => [x + (u - x) * V2.s, v * V2.s]);
  while (x < V2.x1) {
    const w = 3.2 + 3.6 * R(i, 140), h = 2.0 + 2.6 * R(i, 141), roof = 1.5 + 1.2 * R(i, 142);
    const wall = [[x, 0], [x + w, 0], [x + w, h], [x, h]];
    const holes = [];
    const cols = Math.max(1, Math.floor(w / 1.5));
    for (let c = 0; c < cols; c++) {
      const wx = x + 0.5 + (c * (w - 1)) / cols;
      holes.push([[wx, h * 0.35], [wx, h * 0.35 + 0.8], [wx + 0.62, h * 0.35 + 0.8], [wx + 0.62, h * 0.35]].reverse());
    }
    houses.push(card(S(wall), { holes: holes.map(S), color: "#150b28", depth: 0.5 * V2.s }));
    houses.push(card(S([[x - 0.9, h - 0.15], [x + w + 0.9, h - 0.15], [x + w + 1.4, h + 0.15], [x + w + 0.2, h + roof * 0.6], [x + w * 0.5, h + roof], [x - 0.2, h + roof * 0.6], [x - 1.4, h + 0.15]]), { color: "#0b0618", depth: 0.7 * V2.s }).translate(0, 0, 0.1 * V2.s));
    glows.push(card(S(wall), { color: "#ff8a3a", depth: 0.2 * V2.s }).translate(0, 0, -0.6 * V2.s));
    if (R(i, 143) > 0.6) {
      for (let f = 0; f < 3; f++) {
        const fx = x + w * (0.2 + 0.3 * f), fh = 1.8 + 2.4 * R(i + f, 144);
        const tongue = [[fx - 0.7, 0], [fx - 0.3, fh * 0.55], [fx - 0.45, fh * 0.7], [fx, fh], [fx + 0.35, fh * 0.6], [fx + 0.7, 0]];
        const inner = tongue.map(([u, v]) => [fx + (u - fx) * 0.55, v * 0.55]);
        flames.push(card(S(tongue), { color: "#ff6a2a", depth: 0.1 * V2.s }).translate(0, (h + roof * 0.5) * V2.s, 0.5 * V2.s));
        flames.push(card(S(inner), { color: "#ffb04a", depth: 0.1 * V2.s }).translate(0, (h + roof * 0.5) * V2.s, 0.62 * V2.s));
      }
    }
    x += w + 0.5 + 1.2 * R(i, 145);
    i++;
  }
  return [
    layer("village2", merge(houses), "solid", V2.z, { y: FLOOR, order: 10 }),
    layer("village2Glow", merge(glows), "glow", V2.z, { y: FLOOR, order: 10 }),
    layer("village2Flames", merge(flames), "glow", V2.z, { y: FLOOR, order: 10, flame: true }),
  ];
}

function smokeColumn(n) {
  const pts = [], hgt = 20;
  for (let s = 0; s <= 10; s++) pts.push([Math.sin(s * 0.9 + n) * 1.6 - (1.1 + s * 0.22), 6 + (hgt * s) / 10]);
  for (let s = 10; s >= 0; s--) pts.push([Math.sin(s * 0.9 + n) * 1.6 + (1.1 + s * 0.22), 6 + (hgt * s) / 10]);
  const rod = card([[-0.05, 0], [0.05, 0], [0.05, 7], [-0.05, 7]], { color: "#0c0818", depth: 0.04 });
  return merge([card(pts, { color: "#6a4a78", depth: 0.05 }), rod]);
}

function smokeLayer() {
  const parts = [-150, -110, -78, -52, -24, 8, 48, 90, 130, 170].map((sx, n) => {
    const zAbs = n % 2 ? -72 : -66.4;
    return smokeColumn(n).translate(sx, 0, zAbs - V2.z);
  });
  return layer("village2Smoke", merge(parts), "smoke", V2.z, { y: FLOOR, sway: 0.02, order: 10 });
}

function farRidges() {
  const ridge = (seed, lo, hi, color, z) => {
    const pts = [[-720, FLOOR - 1]];
    for (let i = 0; i <= 110; i++) pts.push([-720 + (1440 * i) / 110, lo + (hi - lo) * R(i, seed) ** 2 + 1.5 * Math.sin(i * 0.6 + seed)]);
    pts.push([720, FLOOR - 1]);
    return card(pts, { color, depth: 1.5 }).translate(0, 0, z);
  };
  return layer("ridgesFar", merge([ridge(70, 12, 21, "#5b4276", 1.75), ridge(71, 15, 24, "#654a82", -1.75), ...cliffLedges()]), "solid", -118.75, { order: 12.2 });
}

// The cliff's ledges sit at z -100; they are merged into ridgesFar (z -118.75), so their geometry is moved by the gap between the two.
function cliffLedges() {
  const parts = [], dz = -100 - (-118.75);
  for (let n = 0; n < 4; n++) {
    const hx = -30 + n * 11.5, r = 4.6, top = 14 + 0.8 * Math.sin(n) - r * 1.6;
    parts.push(card([[-r * 1.7, 0], [r * 1.7, 0], [r * 1.5, 0.35], [-r * 1.5, 0.35]], { color: "#b49ab0", depth: 0.3 }).translate(hx, top - 0.35, 1.5 + dz));
  }
  return parts;
}

export function* setLayers() {
  yield layer("stage", terraceStage(), "solid", 0, { order: 1, sink: true });
  yield layer("seams", seamsGlow(), "glow", 0, { order: 1, sink: true });
  yield layer("grassMid", grassMid(), "solid", 2.8, { sway: 0.012, fg: true, order: 0 });
  for (let j = 0; j < FOREST.zs.length; j++) yield forest(j);
  yield* villageRow();
  yield smokeLayer();
  yield farRidges();
}
