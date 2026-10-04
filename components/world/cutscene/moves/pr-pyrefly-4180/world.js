// THE FOREST CLEARING OUTSIDE THE HIDDEN LEAF, as a deep paper theatre. Frame: the pup at the origin, +x right,
// +y up, +z toward the lens. Twenty-odd card layers from cut grass at z +5.5 to the sky at z -124:
// stepped horizontal terraces (a paper contour model), uprooted cedars, scorch and boulders, six receding
// forest layers, the Leaf's rooftops with cut-out windows lit from behind, a cliff with four blank carved heads,
// hills, a full moon behind thin cloud, ember smoke on rods, a plum-indigo sky with pinprick stars.
// Each layer is ONE merged mesh of cut cards (cream core on the walls). No ink lines anywhere.

import { card, circle, hash, merge, paperMaterial } from "./paper";

export const TOP = [0, 0.35, 0.75, 1.15, 1.5, 1.5]; // terrace tops, near to far
export const FRONT = [8.4, -3.0, -6.4, -10.4, -15.0, -22]; // each terrace's front edge (z)
export const groundY = (z) => (z > FRONT[1] ? TOP[0] : z > FRONT[2] ? TOP[1] : z > FRONT[3] ? TOP[2] : z > FRONT[4] ? TOP[3] : TOP[4]);
export const FLOOR = 1.5; // the forest floor beyond the last terrace

// the materials, one per look
export function worldMaterials() {
  return {
    solid: paperMaterial({ trans: 0.1, back: "#ff9a5a" }),
    wash: paperMaterial({ trans: 0.7, back: "#b9a6ff" }),
    moon: paperMaterial({ trans: 1, back: "#fff0d2", tint: 1.25 }),
    cloud: paperMaterial({ trans: 0.9, back: "#ffd9b8", opacity: 0.62 }),
    smoke: paperMaterial({ trans: 0.85, back: "#ff9a5a", opacity: 0.55 }),
    glow: paperMaterial({ mode: 3, tint: 1.35 }),
    fox: paperMaterial({ trans: 0.5, back: "#ff6a1a" }),
    rose: paperMaterial({ trans: 0.55, back: "#ff6b57" }),
    foil: paperMaterial({ mode: 2 }),
  };
}

const R = hash;
const wob = (i, k) => R(i, k) - 0.5;

// a horizontal terrace: front edge wavy in z, flat top at yTop, thickness `thick`, running far back
function slab(xl, xr, zFront, yTop, thick, color, seed) {
  const n = Math.ceil((xr - xl) / 1.8);
  const poly = [];
  for (let i = 0; i <= n; i++) {
    const x = xl + ((xr - xl) * i) / n;
    poly.push([x, -(zFront + wob(i, seed) * 1.0 + 0.55 * Math.sin(x * 0.33 + seed))]);
  }
  poly.push([xr, 130], [xl, 130]);
  const g = card(poly, { depth: thick, color });
  g.rotateX(-Math.PI / 2);
  return g.translate(0, yTop - thick / 2, 0);
}
// a thin dark patch lying on a terrace (scorch)
function patch(cx, cz, rx, rz, y, color, seed) {
  const pts = circle(0, 0, 1, 11).map(([x, z], i) => [cx + x * rx * (0.75 + 0.5 * R(i, seed)), -(cz + z * rz * (0.75 + 0.5 * R(i, seed + 5)))]);
  const g = card(pts, { depth: 0.04, color });
  g.rotateX(-Math.PI / 2);
  return g.translate(0, y + 0.03, 0);
}
// an upright faceted boulder, base at y
function rock(cx, y, z, w, h, seed, color) {
  const pts = [[-w / 2, 0]];
  const k = 6;
  for (let i = 0; i <= k; i++) {
    const a = Math.PI - (Math.PI * i) / k;
    pts.push([Math.cos(a) * (w / 2) * (0.82 + 0.3 * R(i, seed)), Math.sin(a) * h * (0.72 + 0.4 * R(i, seed + 2)) + 0.06]);
  }
  pts.push([w / 2, 0]);
  return card(pts.reverse(), { color }).translate(cx, y, z);
}
// a cedar trunk standing on y: flared roots, tapered, a few stubs and tiers of needles up its crown
function cedar(x, y, z, h, w, seed, color, tiers = true) {
  const parts = [];
  parts.push(card([[-w * 1.9, 0], [-w * 0.95, h * 0.03], [-w * 0.62, h * 0.14], [-w * 0.34, h], [w * 0.34, h], [w * 0.62, h * 0.14], [w * 0.95, h * 0.03], [w * 1.9, 0]], { color, depth: Math.max(0.05, w * 0.1) }).translate(x, y, z));
  for (let i = 0; i < 3; i++) {
    const hh = h * (0.25 + 0.2 * i + 0.1 * R(i, seed));
    const s = (i + seed) % 2 ? 1 : -1;
    parts.push(card([[0, 0], [s * w * (1.6 + R(i, seed + 1)), w * 0.5], [s * w * 0.2, w * 0.45]], { color, depth: 0.06 }).translate(x, y + hh, z + 0.01));
  }
  if (tiers) {
    // layered needles: wide jagged triangles stepping up and narrowing, over the top third of the trunk
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

// ---- the layers -----------------------------------------------------------------------------------------------
// each: { id, g (geometry), m (material key), z, y (pivot height), sway, order, fg }
export function* worldLayers() {
  const add = (id, g, m, z, o = {}) => ({ id, g, m, z, y: 0, px: 0, sway: 0, fg: false, sink: false, ...o });

  // 1. cut grass at 2 m from the lens
  {
    const parts = [];
    for (let i = 0; i < 78; i++) {
      const x = -10 + 20 * ((i + 0.5 * R(i, 1)) / 78);
      const h = 0.25 + 0.6 * R(i, 2) ** 1.5;
      const b = (R(i, 3) - 0.5) * 0.5;
      parts.push(card([[x - 0.1, 0], [x + 0.12, 0], [x + b + 0.02, h]], { color: R(i, 4) > 0.5 ? "#0b0716" : "#150d22", depth: 0.04 }));
    }
    yield add("grass", merge(parts), "solid", 5.5, { sway: 0.012, order: 0, fg: true });
  }

  // 2. the terraces: a paper contour model, each step one card thicker than the last
  {
    const parts = [];
    const cols = ["#33203f", "#3a2342", "#41273f", "#472a3b", "#4d2e3a", "#512f38"];
    for (let k = 0; k < 6; k++) parts.push(slab(-16 - k * 5, 16 + k * 5, FRONT[k], TOP[k], 0.2 + 0.02 * k, cols[k], k + 3));
    // scorch patches and cracked ember seams
    for (let i = 0; i < 13; i++) {
      const k = i % 4;
      const z = FRONT[k] - 0.8 - R(i, 5) * 2.4;
      if (i % 4 === 0) continue; // keep the pup's own terrace clean under its feet
      parts.push(patch((R(i, 6) - 0.5) * 16, z, 1.0 + 1.8 * R(i, 7), 0.6 + 1.1 * R(i, 8), TOP[k], "#0d0916", i));
    }
    parts.push(patch(2.4, 1.6, 2.2, 0.9, 0, "#120c1a", 41), patch(-3.4, -0.4, 1.6, 0.8, 0, "#120c1a", 42), patch(5.2, -1.2, 1.3, 0.7, 0, "#150d1c", 43));
    yield add("terraces", merge(parts), "solid", 0, { order: 1, sink: true });
  }

  // 3. boulders and uprooted cedars on the terraces (foreground items scale in x on a narrow screen)
  {
    const parts = [];
    for (let i = 0; i < 9; i++) {
      const k = i % 3;
      const x = (i < 5 ? -1 : 1) * (3.2 + 6 * R(i, 20));
      parts.push(rock(x, TOP[k] - 0.05, FRONT[k] - 0.8 - 1.4 * R(i, 21), 1.0 + 1.8 * R(i, 22), 0.7 + 1.2 * R(i, 23), i, i % 2 ? "#1a1228" : "#221832"));
    }
    yield add("rocks", merge(parts), "solid", 0, { order: 2, sink: true });
  }
  {
    // two uprooted giant cedars lying on the terraces, root fans up in the air
    const tree = (x, y, z, len, dia, flip, seed) => {
      const f = flip ? -1 : 1;
      const parts = [card([[-len / 2, 0], [len / 2, 0], [len / 2 - 0.2, dia], [-len / 2 + 0.2, dia * 1.05]], { color: "#1c1226" })];
      parts.push(card([[len / 2, 0], [len / 2 + 1.4, 0.2], [len / 2 + 1.9, 1.2], [len / 2 + 1.2, 2.2], [len / 2 + 1.5, 3.0], [len / 2 + 0.2, dia * 1.9], [len / 2 - 0.1, dia]], { color: "#241830", depth: 0.14 }));
      for (let i = 0; i < 6; i++) parts.push(card([[len / 2 + 0.3, dia * 0.8], [len / 2 + 0.9 + 0.5 * R(i, seed), dia * 2.4 + 0.5 * i], [len / 2 + 0.35, dia * 0.95]], { color: "#241830", depth: 0.05 }));
      const g = merge(parts);
      g.scale(f, 1, 1);
      return g.translate(x, y, z);
    };
    yield add("logs", merge([tree(-5.4, TOP[1], -4.0, 5.6, 0.9, true, 1), tree(8.4, TOP[2], -7.4, 7.0, 1.2, false, 2)]), "solid", 0, { order: 3, sink: true });
  }

  // 4. the pin: the basalt stack from the Pyrefly Floes, promoted to a tall black card pillar (foot at the pup's side)
  {
    const parts = [];
    const cols = [[-1.0, 2.2], [-0.5, 3.4], [0, 4.4], [0.5, 3.2], [1.0, 2.0]];
    cols.forEach(([x, h], i) => {
      const w = 0.52;
      parts.push(card([[-w / 2, 0], [w / 2, 0], [w / 2, h - 0.18], [0, h], [-w / 2, h - 0.18]], { color: i % 2 ? "#0d0a14" : "#100c18", depth: 0.2 }).translate(x, 0, -0.08 * i));
    });
    parts.push(card([[-1.5, 0], [1.5, 0], [1.25, 0.4], [-1.3, 0.36]], { color: "#0b0811", depth: 0.34 }).translate(0, 0, 0.12));
    yield add("pillar", merge(parts), "solid", -1.5, { order: 3, fg: true, px: -2.9 });
  }

  // 5. the forest: six receding layers of tall trunks, tiers of cedar needles up their crowns
  {
    const zs = [-22, -28, -35, -43, -52, -71];
    const cols = ["#150d26", "#1b1130", "#231738", "#2c1d42", "#35244d", "#3e2b58"];
    const base = [34, 30, 10, 8.5, 8, 6.5];
    for (const [k, z] of zs.entries()) {
      const span = (10.6 - z) * 0.55;
      const parts = [];
      const count = k < 2 ? 10 + k * 2 : 6 + k;
      for (let i = 0; i < count; i++) {
        const x = -span + ((2 * span) * (i + 0.5 * R(i, 30 + k))) / count;
        // the near layers stand tall at the frame's edges and low in front of the village: the sky stays open overhead
        const edge = Math.abs(x) > span * 0.42;
        if (k === 0 && !edge) continue;
        if (k === 1 && !edge && i % 4) continue;
        const h = k < 2 ? (edge ? base[k] + 6 * R(i, 31 + k) : 9 + 6 * R(i, 31 + k)) : base[k] * (0.7 + 0.5 * R(i, 31 + k));
        const w = (0.55 + 0.55 * R(i, 32 + k)) * (1 + k * 0.12);
        parts.push(cedar(x, 0, 0, h, w, i + k * 7, cols[k], R(i, 33 + k) > 0.35));
      }
      yield add(`forest${k}`, merge(parts), "solid", z, { y: FLOOR, sway: 0.004 + 0.002 * k, order: 4 + k });
    }
  }

  // 6. the Leaf: low rooftops with cut-out windows lit from behind, some burning, under the cliff
  {
    const houses = [];
    const glows = [];
    const flames = [];
    const smokeAt = [];
    let x = -62;
    let i = 0;
    while (x < 14) {
      const w = 3.2 + 3.6 * R(i, 40);
      const h = 2.0 + 2.6 * R(i, 41);
      const roof = 1.5 + 1.2 * R(i, 42);
      // walls + an upswept hip roof, windows cut through
      const wall = [[x, 0], [x + w, 0], [x + w, h], [x, h]];
      const holes = [];
      const cols = Math.max(1, Math.floor(w / 1.5));
      for (let c = 0; c < cols; c++) {
        const wx = x + 0.5 + (c * (w - 1)) / cols;
        holes.push([[wx, h * 0.35], [wx, h * 0.35 + 0.8], [wx + 0.62, h * 0.35 + 0.8], [wx + 0.62, h * 0.35]].reverse());
      }
      houses.push(card(wall, { holes, color: "#241638", depth: 0.5 }).translate(0, 0, 0));
      houses.push(card([[x - 0.9, h - 0.15], [x + w + 0.9, h - 0.15], [x + w + 1.4, h + 0.15], [x + w + 0.2, h + roof * 0.6], [x + w * 0.5, h + roof], [x - 0.2, h + roof * 0.6], [x - 1.4, h + 0.15]], { color: "#1a1030", depth: 0.7 }).translate(0, 0, 0.1));
      glows.push(card(wall, { color: "#ff8a3a", depth: 0.2 }).translate(0, 0, -0.6));
      if (R(i, 43) > 0.55) {
        // a burning roof: three jagged tongues of flame
        for (let f = 0; f < 3; f++) {
          const fx = x + w * (0.2 + 0.3 * f);
          const fh = 1.8 + 2.4 * R(i + f, 44);
          flames.push(card([[fx - 0.7, 0], [fx - 0.3, fh * 0.55], [fx - 0.45, fh * 0.7], [fx, fh], [fx + 0.35, fh * 0.6], [fx + 0.7, 0]], { color: f % 2 ? "#ffb04a" : "#ff6a2a", depth: 0.15 }).translate(0, h + roof * 0.5, 0.55));
        }
        smokeAt.push(x + w * 0.5);
      }
      x += w + 0.5 + 1.2 * R(i, 45);
      i++;
    }
    yield add("village", merge(houses), "solid", -62, { y: FLOOR, order: 10 });
    yield add("villageGlow", merge(glows), "glow", -63, { y: FLOOR, order: 10 });
    yield add("flames", merge(flames), "glow", -61.4, { y: FLOOR, order: 10, flame: true });
    // smoke: tall curling ribbons on thin rods, a few columns rocking
    const smokes = [];
    smokeAt.slice(0, 5).forEach((sx, n) => {
      const pts = [];
      const hgt = 26;
      for (let s = 0; s <= 10; s++) pts.push([Math.sin(s * 0.9 + n) * 1.6 - (1.1 + s * 0.22), 6 + (hgt * s) / 10]);
      for (let s = 10; s >= 0; s--) pts.push([Math.sin(s * 0.9 + n) * 1.6 + (1.1 + s * 0.22), 6 + (hgt * s) / 10]);
      const rod = card([[-0.05, 0], [0.05, 0], [0.05, 7], [-0.05, 7]], { color: "#0c0818", depth: 0.04 });
      smokes.push(add(`smoke${n}`, merge([card(pts, { color: "#6a4a78", depth: 0.05 }), rod]), "smoke", -58 - n * 0.4, { y: FLOOR, px: sx, sway: 0.02, order: 10 }));
    });
    yield* smokes;
  }

  // 7. the cliff with four colossal carved heads (blank shapes: no faces) and the far hills
  {
    const top = [];
    for (let i = 0; i <= 28; i++) top.push([-70 + (140 * i) / 28, 24 + 7 * R(i, 50) + 5 * Math.sin(i * 0.5)]);
    const poly = [[-70, FLOOR - 1], ...top, [70, FLOOR - 1]];
    yield add("cliff", card(poly, { color: "#3a2a52", depth: 1.2 }), "solid", -100, { order: 11 });
    // four heads: round crown, a hair line cut differently on each, neck, shoulders (blank)
    const heads = [];
    const hairs = [
      (r) => [[-r, 0], [-r * 0.95, r * 0.7], [-r * 0.5, r * 1.15], [0, r * 1.25], [r * 0.55, r * 1.12], [r * 0.95, r * 0.7], [r, 0]],
      (r) => [[-r, 0], [-r * 0.9, r * 0.8], [-r * 0.5, r * 1.3], [-r * 0.1, r * 1.0], [r * 0.3, r * 1.4], [r * 0.7, r * 1.05], [r, 0.2 * r]],
      (r) => [[-r, 0], [-r * 0.98, r * 0.75], [-r * 0.6, r * 1.1], [0, r * 1.18], [r * 0.6, r * 1.1], [r * 0.98, r * 0.75], [r, 0]],
      (r) => [[-r, 0], [-r * 0.85, r * 0.9], [-r * 0.45, r * 1.2], [-r * 0.05, r * 1.45], [r * 0.4, r * 1.2], [r * 0.85, r * 0.85], [r, 0]],
    ];
    for (let n = 0; n < 4; n++) {
      const hx = -30 + n * 11.5;
      const r = 4.6;
      const head = [[-r * 0.62, -r * 0.6], ...hairs[n](r).map(([x, y]) => [x * 0.95, y + 0.5 * r]), [r * 0.62, -r * 0.6]];
      heads.push(card([[-r * 1.5, -r * 1.6], [-r * 0.62, -r * 0.7], [r * 0.62, -r * 0.7], [r * 1.5, -r * 1.6]], { color: "#b49ab0", depth: 0.5 }).translate(hx, 14 + 0.8 * Math.sin(n), 1.5));
      heads.push(card(head, { color: "#c2a8bc", depth: 0.7 }).translate(hx, 14 + 0.8 * Math.sin(n) + 2.6, 1.8));
    }
    yield add("heads", merge(heads), "solid", -100, { order: 11 });
    const hill = (pts, c) => card(pts, { color: c, depth: 1.5 });
    const h1 = [[-130, FLOOR - 1]];
    const h2 = [[-130, FLOOR - 1]];
    for (let i = 0; i <= 26; i++) {
      h1.push([-130 + (260 * i) / 26, 8 + 14 * R(i, 60) ** 2 + 5 * Math.sin(i * 0.6)]);
      h2.push([-130 + (260 * i) / 26, 14 + 12 * R(i, 61) + 6 * Math.sin(i * 0.4 + 1)]);
    }
    h1.push([130, FLOOR - 1]);
    h2.push([130, FLOOR - 1]);
    yield add("hill1", hill(h1, "#432d5c"), "solid", -108, { order: 12 });
    yield add("hill2", hill(h2, "#53376a"), "solid", -114, { order: 12 });
  }

  // 8. the moon behind thin cloud, and the sky
  {
    const mx = -2;
    const my = 25;
    yield add("moon", merge([card(circle(0, 0, 13.5, 44), { color: "#f1e6d2", depth: 0.5 }).translate(mx, my, 0)]), "moon", -118, { order: 13 });
    const cr = [];
    [[-3, 3, 2.4], [4, -2, 1.9], [-5, -4, 1.4], [1, 6, 1.2], [6, 4, 1.0]].forEach(([cx, cy, r], i) => cr.push(card(circle(cx, cy, r, 12), { color: "#d9c9b0", depth: 0.2 }).translate(mx, my, 0.4 + i * 0.01)));
    yield add("moonCraters", merge(cr), "moon", -118, { order: 13 });
    const clouds = [];
    for (let i = 0; i < 3; i++) {
      const pts = [];
      for (let s = 0; s <= 14; s++) pts.push([-22 + s * 3.1 + 5 * i, 17 + i * 4 + 1.2 * Math.sin(s * 1.3 + i) + 1.2]);
      for (let s = 14; s >= 0; s--) pts.push([-22 + s * 3.1 + 5 * i, 17 + i * 4 + 1.2 * Math.sin(s * 1.3 + i) - 1.1 - 0.6 * R(s, i)]);
      clouds.push(card(pts, { color: "#a58bb4", depth: 0.08 }).translate(0, 0, i * 0.4));
    }
    yield add("clouds", merge(clouds), "cloud", -112, { order: 13 });
    // the sky: three banded cards (plum-indigo up to indigo), pinprick stars cut through the top one, a pale light behind
    const sky = (y0, y1, c) => card([[-150, y0], [150, y0], [150, y1], [-150, y1]], { color: c, depth: 0.1 });
    const stars = [];
    for (let i = 0; i < 130; i++) {
      const sx = (R(i, 70) - 0.5) * 280;
      const sy = 38 + R(i, 71) * 40;
      const r = 0.22 + 0.34 * R(i, 72);
      stars.push([[sx, sy - r], [sx + r * 0.3, sy], [sx, sy + r], [sx - r * 0.3, sy]]);
    }
    const top = card([[-150, 38], [150, 38], [150, 90], [-150, 90]], { holes: stars, color: "#1a1140", depth: 0.12 });
    yield add("skyTop", top, "wash", -124, { order: 14 });
    yield add("skyMid", merge([sky(14, 38.1, "#2b1a55").translate(0, 0, 0.6), sky(FLOOR - 1, 14.1, "#52295a").translate(0, 0, 1)]), "wash", -124, { order: 14 });
    yield add("skyLight", card([[-150, 36], [150, 36], [150, 92], [-150, 92]], { color: "#cdd3ff", depth: 0.1 }), "glow", -126, { order: 14 });
  }
}
