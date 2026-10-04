// THE CAST, as black-card silhouettes with a pale cut edge: Father on the
// steps, the witnesses (Edward, Alphonse, May Chang with Xiao-Mei), three
// soldier-alchemists with their chalk circles, the colony pups. Each figure
// is a few extruded cards (a body, and the parts that move on their own
// hinge: an arm, a braid, coat tails, a plume). Drawn with the book's one
// material. Figures are built once at height 1 and scaled where they stand;
// the faces are never drawn: eyes are slits of light only.

import { Group, InstancedMesh, Mesh } from "three";
import { cutShape, circlePts, layer, ringShape } from "./paper";
import { KIND } from "./paper";

const INK = "#120d1c";
const PALE = "#e9dcc0";

// a hinged part: a Group at the pivot holding one merged mesh built around the pivot
function part(parent, mat, geo, px, py, pz = 0) {
  const g = new Group();
  g.position.set(px, py, pz);
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  g.add(m);
  parent.add(g);
  return g;
}
const R = (pts) => pts.map(([x, y]) => [x, y]);

// ---- FATHER: long hair, a full beard, flowing robes, one hand rising; eyes a pale slit of light only
export function father(mat) {
  const root = new Group();
  const L = layer();
  const D = 0.03;
  L.add(cutShape(R([[-0.2, 0], [0.2, 0], [0.17, 0.35], [0.13, 0.6], [0.15, 0.74], [0.06, 0.8], [-0.06, 0.8], [-0.15, 0.74], [-0.13, 0.6], [-0.17, 0.35]]), D), INK, {});
  L.add(cutShape(R([[-0.22, 0.58], [0.22, 0.58], [0.24, 0.73], [0, 0.82], [-0.24, 0.73]]), D), "#1b1427", {}, 0, 0, 0.004); // the shoulders' mantle
  L.add(cutShape(circlePts(0.056, 14, 0, 0.865, 0.9, 1.05), D), INK, {}, 0, 0, 0.01);
  // the long hair, falling behind both shoulders
  L.add(cutShape(R([[-0.075, 0.935], [0.075, 0.935], [0.13, 0.72], [0.17, 0.42], [0.12, 0.28], [0.06, 0.46], [-0.06, 0.46], [-0.12, 0.28], [-0.17, 0.42], [-0.13, 0.72]]), D), "#0c0814", {}, 0, 0, -0.012);
  L.add(cutShape(R([[-0.06, 0.87], [0.06, 0.87], [0.045, 0.74], [0, 0.6], [-0.045, 0.74]]), D), "#0c0814", {}, 0, 0, 0.018); // the full beard
  L.add(cutShape(R([[-0.19, 0.01], [0.19, 0.01], [0.2, 0.05], [-0.2, 0.05]]), D * 2), PALE, { noEdge: true }, 0, 0, 0.012); // the hem's pale cut
  root.add(partMesh(mat, L.build()));
  const eyes = layer();
  for (const s of [-1, 1]) eyes.add(cutShape([[-0.016, -0.004], [0.016, -0.004], [0.016, 0.004], [-0.016, 0.004]], 0.01), "#fff4cf", { kind: KIND.glow }, s * 0.026, 0.875, 0.05);
  const eyeMesh = partMesh(mat, eyes.build());
  root.add(eyeMesh);
  // the arm: pivots at the shoulder; the hand rises
  const A = layer();
  A.add(cutShape(R([[-0.045, 0], [0.045, 0], [0.055, 0.2], [0.085, 0.25], [0.03, 0.31], [0.012, 0.37], [-0.012, 0.37], [-0.03, 0.31], [-0.055, 0.22]]), D), INK, {}, 0, 0, 0.02);
  A.add(cutShape(R([[-0.012, 0.3], [-0.03, 0.4], [-0.01, 0.43], [0.01, 0.4], [0.03, 0.42], [0.03, 0.36], [0.012, 0.3]]), D), "#0d0916", {}, 0, 0, 0.022);
  const arm = part(root, mat, A.build(), 0.13, 0.73);
  return { root, arm, eyes: eyeMesh };
}
function partMesh(mat, geo) {
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

// ---- EDWARD: short, a long braid, a long red coat whose tails whip, a gold-foil glint on the metal arm, one hair tuft
export function edward(mat) {
  const root = new Group();
  const D = 0.034;
  const L = layer();
  L.add(cutShape(R([[-0.1, 0], [-0.02, 0], [-0.01, 0.42], [-0.11, 0.42]]), D), INK, {});
  L.add(cutShape(R([[0.02, 0], [0.1, 0], [0.11, 0.42], [0.01, 0.42]]), D), INK, {});
  L.add(cutShape(R([[-0.12, -0.005], [-0.01, -0.005], [-0.01, 0.04], [-0.13, 0.04]]), D * 1.4), "#0a0712", {});
  L.add(cutShape(R([[0.01, -0.005], [0.12, -0.005], [0.13, 0.04], [0.01, 0.04]]), D * 1.4), "#0a0712", {});
  L.add(cutShape(R([[-0.15, 0.5], [0.15, 0.5], [0.17, 0.78], [0, 0.84], [-0.17, 0.78]]), D), "#9c1d1c", {}, 0, 0, 0.012); // the red coat
  L.add(cutShape(circlePts(0.075, 14, 0, 0.9), D), INK, {}, 0, 0, 0.02);
  L.add(cutShape(R([[-0.02, 0.96], [0.012, 0.96], [0.03, 1.05], [0.005, 1.1], [0.0, 1.03]]), D), INK, {}, 0, 0, 0.02); // his single antenna tuft
  L.add(cutShape(R([[-0.085, 0.93], [0.085, 0.93], [0.07, 0.99], [-0.07, 0.99]]), D), INK, {}, 0, 0, 0.024);
  root.add(partMesh(mat, L.build()));
  const T = layer();
  T.add(cutShape(R([[-0.155, 0], [0.155, 0], [0.2, -0.4], [0.07, -0.3], [0.0, -0.4], [-0.07, -0.3], [-0.2, -0.4]]), D), "#b32422", {}, 0, 0, 0.02);
  const tails = part(root, mat, T.build(), 0, 0.52);
  const B = layer();
  B.add(cutShape(R([[-0.02, 0], [0.02, 0], [0.026, -0.2], [0.004, -0.34], [-0.02, -0.2]]), D), "#0a0712", {}, 0, 0, -0.01);
  const braid = part(root, mat, B.build(), -0.02, 0.93);
  const mk = (s, gold) => {
    const a = layer();
    a.add(cutShape(R([[-0.032, 0], [0.032, 0], [0.03, -0.3], [-0.03, -0.3]]), D), INK, {}, 0, 0, 0.03);
    if (gold) a.add(cutShape(R([[-0.026, -0.04], [0.026, -0.04], [0.024, -0.26], [-0.024, -0.26]]), 0.01), "#e3b04a", { kind: KIND.foil, noEdge: true }, 0, 0, 0.066);
    return part(root, mat, a.build(), s * 0.17, 0.77);
  };
  return { root, tails, braid, armL: mk(-1, false), armR: mk(1, true) };
}

// ---- ALPHONSE: a huge suit of armour, spiked pauldrons, a horned helm with a long plume, two eye slits of light
export function alphonse(mat, glowMat) {
  const root = new Group();
  const D = 0.04;
  const L = layer();
  const AR = "#16111f";
  L.add(cutShape(R([[-0.23, 0], [-0.03, 0], [-0.03, 0.4], [-0.25, 0.4]]), D), AR, {});
  L.add(cutShape(R([[0.03, 0], [0.23, 0], [0.25, 0.4], [0.03, 0.4]]), D), AR, {});
  L.add(cutShape(R([[-0.3, 0.38], [0.3, 0.38], [0.3, 0.63], [0.2, 0.77], [-0.2, 0.77], [-0.3, 0.63]]), D), "#1d1628", { ink: 0 }, 0, 0, 0.01);
  L.add(cutShape(R([[-0.3, 0.38], [0.3, 0.38], [0.3, 0.44], [-0.3, 0.44]]), D * 1.5), PALE, { noEdge: true }, 0, 0, 0.02); // the belt's pale edge
  for (const s of [-1, 1]) {
    // spiked pauldrons
    L.add(cutShape(R([[0, 0], [s * 0.18, -0.02], [s * 0.3, 0.1], [s * 0.38, 0.2], [s * 0.24, 0.16], [s * 0.3, 0.3], [s * 0.15, 0.2], [s * 0.1, 0.34], [s * 0.02, 0.18]]), D), "#1d1628", {}, s * 0.26, 0.64, 0.025);
    L.add(cutShape(R([[0, 0], [s * 0.06, 0], [s * 0.07, -0.34], [s * 0.01, -0.36]]), D), AR, {}, s * 0.34, 0.66, 0.0); // the arms
  }
  L.add(cutShape(R([[-0.095, 0.76], [0.095, 0.76], [0.11, 0.9], [0.075, 0.99], [-0.075, 0.99], [-0.11, 0.9]]), D), "#1d1628", {}, 0, 0, 0.03); // the helm
  L.add(cutShape(R([[-0.022, 0.99], [0.022, 0.99], [0.004, 1.15], [-0.004, 1.15]]), D), "#1d1628", {}, 0, 0, 0.03); // the one horn spike
  L.add(cutShape(R([[-0.08, 0.92], [0.08, 0.92], [0.08, 0.94], [-0.08, 0.94]]), D * 1.4), PALE, { noEdge: true }, 0, 0, 0.034);
  root.add(partMesh(mat, L.build()));
  const E = layer();
  for (const s of [-1, 1]) E.add(cutShape([[-0.022, -0.005], [0.022, -0.005], [0.022, 0.005], [-0.022, 0.005]], 0.01), "#ffe9a8", { kind: KIND.glow }, s * 0.038, 0.86, 0.066);
  root.add(partMesh(mat, E.build()));
  // the helm is tipped open a crack, and a warm glow inside rhymes with the Epsilon core
  const G = layer();
  G.add(cutShape(R([[-0.01, 0], [0.01, 0], [0.012, 0.08], [-0.012, 0.08]]), 0.01), "#ffb86b", { kind: KIND.lamp }, 0.0, 0.8, 0.068);
  G.add(cutShape(circlePts(0.028, 10), 0.01), "#ffb86b", { kind: KIND.lamp }, 0, 0.86, 0.056);
  const glow = partMesh(glowMat, G.build());
  root.add(glow);
  const P = layer();
  P.add(cutShape(R([[-0.01, 0], [0.012, 0.0], [0.05, 0.14], [0.07, 0.32], [0.05, 0.5], [0.025, 0.34], [0.005, 0.18]]), D), "#a3201f", {}, 0, 0, -0.01);
  const plume = part(root, mat, P.build(), 0.0, 1.0);
  return { root, plume, glow };
}

// ---- MAY CHANG: small, looped braids, Xiao-Mei on her shoulder; her small gold circle (a hinged card) stays lit
export function may(mat) {
  const root = new Group();
  const D = 0.034;
  const L = layer();
  L.add(cutShape(R([[-0.17, 0], [0.17, 0], [0.12, 0.5], [-0.12, 0.5]]), D), INK, {});
  L.add(cutShape(R([[-0.13, 0.44], [0.13, 0.44], [0.12, 0.58], [0.0, 0.6], [-0.12, 0.58]]), D), "#1b1427", {}, 0, 0, 0.01);
  L.add(cutShape(circlePts(0.085, 14, 0, 0.67), D), INK, {}, 0, 0, 0.02);
  for (const s of [-1, 1]) {
    L.add(ringShape(0.035, 0.075, D, 14).translate(s * 0.14, 0.64, 0.0), "#0c0814", {}, 0, 0, 0.01); // the looped braids
    L.add(cutShape(R([[-0.012, 0], [0.012, 0], [0.012, -0.12], [-0.012, -0.12]]), D), "#0c0814", {}, s * 0.14, 0.56, 0.0);
  }
  L.add(cutShape(R([[-0.19, 0.005], [0.19, 0.005], [0.19, 0.04], [-0.19, 0.04]]), D * 1.4), PALE, { noEdge: true }, 0, 0, 0.02);
  root.add(partMesh(mat, L.build()));
  // Xiao-Mei, a tiny panda: cream head, black ears and eye patches, a shoulder-sitting body
  const P = layer();
  P.add(cutShape(circlePts(0.05, 12, 0, 0.0, 1.1, 0.9), D), "#efe6d0", {}, 0, 0, 0.05);
  for (const s of [-1, 1]) {
    P.add(cutShape(circlePts(0.02, 8), D), "#0c0814", {}, s * 0.04, 0.045, 0.046);
    P.add(cutShape(circlePts(0.016, 8, 0, 0, 1, 1.3), D), "#0c0814", {}, s * 0.022, 0.0, 0.056);
  }
  P.add(cutShape(circlePts(0.055, 12, 0, -0.07, 1, 0.8), D), "#0c0814", {}, 0, 0, 0.04);
  const panda = part(root, mat, P.build(), 0.13, 0.54);
  return { root, panda };
}

// ---- A soldier-alchemist: a coat and a cap; a chalk circle (a hinged card) stands at his feet
export function soldier(mat) {
  const root = new Group();
  const D = 0.034;
  const L = layer();
  L.add(cutShape(R([[-0.12, 0], [0.12, 0], [0.15, 0.62], [0.09, 0.75], [-0.09, 0.75], [-0.15, 0.62]]), D), "#161020", {});
  L.add(cutShape(circlePts(0.07, 12, 0, 0.84), D), "#161020", {}, 0, 0, 0.01);
  L.add(cutShape(R([[-0.08, 0.89], [0.08, 0.89], [0.07, 0.95], [-0.07, 0.95]]), D), "#0c0814", {}, 0, 0, 0.02);
  L.add(cutShape(R([[-0.04, 0.02], [0.04, 0.02], [0.05, 0.4], [-0.05, 0.4]]), D), "#0c0814", {}, 0, 0, 0.012);
  L.add(cutShape(R([[0.13, 0.62], [0.2, 0.55], [0.3, 0.64], [0.28, 0.69], [0.2, 0.64], [0.13, 0.7]]), D), "#161020", {}, 0, 0, 0.0);
  root.add(partMesh(mat, L.build()));
  return { root };
}

// the printed chalk circle: a dark card disc with a cream ring and star, standing on a hinge, tipped toward the lens
export function chalkGeometry() {
  const L = layer();
  L.add(cutShape(circlePts(1, 28), 0.04), "#2a2146", {}, 0, 0, 0);
  const lines = layer();
  lines.add(ringShape(0.86, 0.93, 0.02, 32), "#ffffff", { noEdge: true }, 0, 0, 0.05);
  lines.add(ringShape(0.5, 0.55, 0.02, 24), "#ffffff", { noEdge: true }, 0, 0, 0.05);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const p0 = [Math.cos(a) * 0.9, Math.sin(a) * 0.9];
    const p1 = [Math.cos(a + (Math.PI * 2) / 3) * 0.9, Math.sin(a + (Math.PI * 2) / 3) * 0.9];
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    lines.add(cutShape([[-len / 2, -0.025], [len / 2, -0.025], [len / 2, 0.025], [-len / 2, 0.025]], 0.02), "#ffffff", { noEdge: true }, mx, my, 0.05, 0, 0, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]));
  }
  return { disc: L.build(), lines: lines.build() };
}

// a colony pup: round head, NO ears, a body, two flippers (black card)
export function colonyPupGeometry() {
  const L = layer();
  const D = 0.05;
  L.add(cutShape(circlePts(0.2, 14, 0, 0.2, 1.15, 0.95), D), INK, {});
  L.add(cutShape(circlePts(0.14, 14, 0.02, 0.4), D), INK, {}, 0, 0, 0.01);
  for (const s of [-1, 1]) L.add(cutShape([[0, 0], [s * 0.16, -0.04], [s * 0.2, 0.06], [s * 0.04, 0.1]], D), INK, {}, s * 0.18, 0.2, 0.01);
  L.add(cutShape([[-0.1, 0], [0.1, 0], [0.12, 0.02], [-0.12, 0.02]], D * 1.4), PALE, { noEdge: true }, 0, 0, 0.02);
  return L.build();
}
export { InstancedMesh };
