// Pure layout + route math for the "settle" sculpture: openxla/xla #46539.
// No React, no per-frame state — Settle.jsx only reads these once.
//
// Mirrors teerthsharma.github.io/fig.js's settle() (see its "/* settle —"
// comment): one program, its ten reduction roots lying on the floor in four
// groups (the union-find partition, fixed in both panels and every run).
// GroupDisjointReductions iterated a hash set to pick each merge's survivor,
// so only the ORDER the groups came out in varied between runs. A run is a
// thread laid through the roots in that order, one run per height, so ten
// runs build a stack. On the left (before) the order still varies between
// two sequences, so the stack lands on two outputs, code X and code Y. On
// the right (after) the order is fixed, so all ten runs take the same route
// and land on code X alone.
//
// Canvas coordinates below (G4, ORD, SEQ) are copied from that file's own
// cache so the two retellings agree; KX/KZ rescale them to metres.

import { C } from "../../palette";

export const RUNS = 10;
export const CODE_X = "#2456dc"; // blue: route A, the order every run takes after the fix
export const CODE_Y = "#d9376e"; // coral: route B, only reached before the fix
export const VIOLET = "#a66cf0"; // the four groups: the partition that never changes
export const MUTED = C.charcoal; // the program node the roots feed

export const FLOOR_Y = 0.12; // local y of run 0 (just above the plinth top)
export const STEP_Y = 0.42; // height between one run's thread and the next
export const TOP_Y = FLOOR_Y + (RUNS - 1) * STEP_Y;

// Before the fix: which route (0 = A/blue, 1 = B/coral) each of the ten runs
// takes — the landing figure's own SEQ, seven runs on X and three on Y.
export const SEQ = [0, 1, 0, 0, 1, 0, 1, 0, 1, 0];

const KX = 0.012;
const KZ = 0.011;
const m = (cx, cy) => [cx * KX, cy * KZ];

// Four groups on the floor: centre + root offsets (3, 2, 3, 2 roots).
const GROUP_DEF = [
  { c: [-54, -46], r: [[-22, 8], [0, -12], [22, 8]] },
  { c: [54, -46], r: [[-16, 2], [16, 2]] },
  { c: [-54, 42], r: [[-22, 8], [0, -12], [22, 8]] },
  { c: [54, 42], r: [[-16, 2], [16, 2]] },
];
const GROUPS = GROUP_DEF.map(({ c, r }) => ({
  pad: m(c[0], c[1]),
  padRadius: r.length === 3 ? 0.42 : 0.32,
  roots: r.map(([ox, oy]) => m(c[0] + ox, c[1] + oy)),
}));

export const GROUP_PADS = GROUPS.map((g) => ({ pt: g.pad, radius: g.padRadius }));
export const ROOTS = GROUPS.flatMap((g) => g.roots); // ten, in floor order

export const ENTRY = m(0, -112);
export const OUT_X = m(3, 112);
export const OUT_Y = m(-69, 108);

const ORDER_A = [0, 1, 2, 3]; // -> OUT_X, blue, the fixed order
const ORDER_B = [1, 3, 0, 2]; // -> OUT_Y, coral, the other order hash iteration gave

function buildRoute(order, out) {
  const pts = [ENTRY];
  order.forEach((gi) => pts.push(...GROUPS[gi].roots));
  pts.push(out);
  return pts; // entry + ten roots + output = 12 points, 11 segments
}

export const ROUTE_X = buildRoute(ORDER_A, OUT_X);
export const ROUTE_Y = buildRoute(ORDER_B, OUT_Y);
export const SEG_COUNT = ROUTE_X.length - 1; // 11

// Two panels, side by side on the plinth: before on the seal's left of the
// sculpture (-x), after on the right (+x). `outputs` is what that panel's
// runs can land on; `route(k)` returns the [route, color] run k takes there.
export const PANEL_X = 1.7;
export const PANELS = [
  {
    side: -1,
    caption: "before: hash set order",
    captionColor: CODE_Y,
    outputs: [{ pt: OUT_X, color: CODE_X }, { pt: OUT_Y, color: CODE_Y }],
    route: (k) => (SEQ[k] === 0 ? [ROUTE_X, CODE_X, OUT_X] : [ROUTE_Y, CODE_Y, OUT_Y]),
  },
  {
    side: 1,
    caption: "after: fixed order",
    captionColor: CODE_X,
    outputs: [{ pt: OUT_X, color: CODE_X }],
    route: () => [ROUTE_X, CODE_X, OUT_X],
  },
];

// Floor markers common to a panel: the program node, the ten roots, then
// that panel's output(s) — same list a guide rod rises from at every node.
export const PANEL_NODES = PANELS.map((pl) => [
  { pt: ENTRY, color: MUTED, radius: 0.08 },
  ...ROOTS.map((pt) => ({ pt, color: VIOLET, radius: 0.055 })),
  ...pl.outputs.map(({ pt, color }) => ({ pt, color, radius: 0.09 })),
]);
