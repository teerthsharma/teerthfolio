// p-caustic CAST: the Allied Shinobi Forces as costume DATA for costumed-seal-kit (bible 4, victims table). Pure data plus small prop builders.
// Each entry: spec (costumedSeal spec), role (reaction script, see victims.js), extras(ctx, seal) -> adds head/back props to seal.props.
// Hex values are the bible's. Hair clump specs use hair-clump-kit (defineHair) with the highlight cut; eyes are the kit's anime decal in the
// seal's own iris colour (never a human face: every one is a small seal).
import { PUP_HEAD2 } from "../../../pup.js";
import { faceOnHead } from "../../../kit/anime-eye-decal.js";

const HEAD = { c: PUP_HEAD2.pos, r: [0.27, 0.245, 0.255] };
const hair = (kit, base, o) => kit.defineHair(base, o);
// a hair highlight: the base colour pulled 35 percent toward white (one tone brighter, hard-cut)
const lighten = (hex) => { const n = parseInt(hex.slice(1), 16), f = (c) => Math.round(c + (255 - c) * 0.35); return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("")}`; };
const eyes = (iris, irisLo, style = "round") => ({ style, iris, irisLo });

// small prop builders on the shared engine.figure (inked, painted)
export function propKit(ctx) {
  const { THREE, engine, sdf } = ctx;
  const { paint, painted } = sdf;
  const fig = (geo, col, shade, o = {}) => {
    const f = engine.figure(painted(geo, paint(col, shade ?? col, { line: o.line ?? 0.9 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    if (o.scale) f.scale.set(...o.scale);
    return f;
  };
  // a flat mark on the face at (x, y) of the head ellipsoid, facing out (forehead protector plate, Gaara's mark, a diamond)
  const mark = (geo, col, x, y, o = {}) => {
    const f = faceOnHead(HEAD, x, y, 0.006);
    const m = fig(geo, col, col, { line: 0.3, ...o });
    m.position.copy(f.p); m.lookAt(f.p.clone().add(f.n));
    return m;
  };
  return { fig, mark, THREE };
}

export const VICTIMS = (ctx) => {
  const { kit, THREE } = ctx;
  const { SphereGeometry, BoxGeometry, TorusGeometry, ConeGeometry, CylinderGeometry } = THREE;
  const P = propKit(ctx);
  const disc = (r, h) => new CylinderGeometry(r, r, h, 20).rotateX(Math.PI / 2);
  return [
    { // Onoki, the Tsuchikage: blue-grey robe, tall hat with the red disc, a white beard puff, a cane; hops and shields his eyes at the rise
      id: "onoki", role: { kage: 1, hop: true, shield: true, order: 3 }, pos: [-2.4, 0], row: 0,
      spec: { scale: 0.52, layers: [{ type: "coat", col: "#4a5a78", shade: "#252e44", trim: "#c0462a", collar: "#c0462a" }],
        hat: { kind: "top", col: "#d8c7a0", trim: "#a3221f" }, eyes: eyes("#3a3030", "#1a1214", "tareme"), weapon: { kind: "staff", hand: "r", col: "#6a4a2a", gem: "#a3221f" } },
      extras: (s) => { s.props.add(P.fig(disc(0.07, 0.012), "#a3221f", "#6a1010", { pos: [0, 0.96, 0.18], rot: [-0.25, 0, 0] }), P.fig(new SphereGeometry(0.09, 12, 10).scale(1.2, 0.9, 0.8), "#f2efe6", "#c9c3b4", { pos: [0, 0.44, 0.23] })); },
    },
    { // Gaara, the Kazekage: brown cloak over a red coat, rust spiky hair, red forehead mark, the sand gourd; raises the sand wall at the cast
      id: "gaara", role: { kage: 1, sandWall: true, order: 7 }, pos: [-1.2, 0], row: 0,
      spec: { scale: 0.5, layers: [{ type: "cloak", col: "#7a4a2c", shade: "#3a2214", len: 0.9 }, { type: "coat", col: "#a3221f", shade: "#4a0e0c" }],
        hair: hair(kit, "spiky", { color: { base: "#b04a24", shade: "#5a2210", hi: "#e88a4a" }, length: [0.1, 0.22], seed: 31 }), eyes: eyes("#3ab0a8", "#145a58", "ring") },
      extras: (s) => { s.props.add(P.mark(new BoxGeometry(0.05, 0.05, 0.01), "#c01818", -0.07, 0.69), P.fig(new SphereGeometry(0.16, 14, 12), "#c9a35a", "#8a6e38", { pos: [0.0, 0.42, -0.42] }), P.fig(new SphereGeometry(0.11, 12, 10), "#c9a35a", "#8a6e38", { pos: [0.0, 0.64, -0.42] })); },
    },
    { // Mei, the Mizukage: blue dress, long auburn hair with a side knot; hand over mouth (the open "o"), blown back at the second hit
      id: "mei", role: { kage: 1, blown: true, order: 1 }, pos: [0, 0], row: 0,
      spec: { scale: 0.5, layers: [{ type: "coat", col: "#2c4f8c", shade: "#122a54", open: 0.0, trim: "#e8dcc2" }], hair: hair(kit, "long", { color: { base: "#8a3a22", shade: "#3e160c", hi: "#d27a52" }, seed: 41 }), eyes: eyes("#2a7a6a", "#0e3a34", "tareme") },
      extras: (s) => { s.props.add(P.fig(new SphereGeometry(0.075, 10, 8), "#8a3a22", "#3e160c", { pos: [0.2, 0.72, 0.06] })); },
    },
    { // A, the Raikage: bare chest (brown fur), white sleeve, white spikes, goatee, gold bracers; stands, kneels last
      id: "a", role: { kage: 1, kneelLast: true, order: 9 }, pos: [1.2, 0], row: 0,
      spec: { scale: 0.56, coat: "#8a5a3a", shade: "#5a3822", layers: [{ type: "coat", col: "#e6e0d2", shade: "#a09a8a", open: 0.14 }],
        hair: hair(kit, "spiky", { color: { base: "#d8d4c8", shade: "#8a8678", hi: "#ffffff" }, seed: 51 }), eyes: eyes("#4a3a2a", "#201810", "tsurime") },
      extras: (s) => { for (const k of [1, -1]) s.props.add(P.fig(new TorusGeometry(0.06, 0.02, 8, 16), "#d2a64a", "#8a6e24", { pos: [k * 0.275, 0.27, 0.17], rot: [0, 0, Math.PI / 2 + k * 0.25] }));
        s.props.add(P.fig(new ConeGeometry(0.04, 0.1, 8), "#d8d4c8", "#8a8678", { pos: [0, 0.4, 0.26], rot: [Math.PI, 0, 0] })); },
    },
    { // Tsunade, the Hokage: white-green haori, red hat, blonde pigtails, the purple diamond; arms crossed (a folded bar), staggers
      id: "tsunade", role: { kage: 1, stagger: true, order: 5 }, pos: [2.4, 0], row: 0,
      spec: { scale: 0.52, layers: [{ type: "coat", col: "#2f6b4a", shade: "#14301f", trim: "#e8e4d8", collar: "#e8e4d8" }], hat: { kind: "top", col: "#a3221f", trim: "#e8e4d8" },
        hair: hair(kit, "twintail", { color: { base: "#d8b860", shade: "#8a6e24", hi: "#fff0b0" }, seed: 61 }), eyes: eyes("#a06a2a", "#4a2a0a", "tareme") },
      extras: (s) => { s.props.add(P.mark(new BoxGeometry(0.035, 0.035, 0.008).rotateZ(Math.PI / 4), "#6a4aa0", 0, 0.66), P.fig(new BoxGeometry(0.46, 0.07, 0.08), "#2f6b4a", "#14301f", { pos: [0, 0.3, 0.3], rot: [0.0, 0, 0] })); },
    },
    { // Mifune, the samurai general: grey armour, topknot, moustache, katana raised and planted
      id: "mifune", role: { stagger: true, order: 6 }, pos: [3.6, 0], row: 0,
      spec: { scale: 0.52, layers: [{ type: "armour", col: "#5a5f66", shade: "#2a2d32", trim: "#c9a24a" }], hair: hair(kit, "slick", { color: { base: "#2a2a30", shade: "#101014", hi: "#5a5a66" }, seed: 71 }),
        eyes: eyes("#2a2018", "#100a06", "tsurime"), weapon: { kind: "sword", hand: "r", col: "#e0e6ee", tilt: [0.0, -0.25] } },
      extras: (s) => { s.props.add(P.fig(new SphereGeometry(0.07, 10, 8), "#2a2a30", "#101014", { pos: [0, 0.86, -0.04] }), P.fig(new BoxGeometry(0.17, 0.02, 0.02), "#2a2a30", "#101014", { pos: [0, 0.5, 0.255] })); },
    },
    // five to six allied troops: blue-grey flak vest #2c3c5e over #1a1a22, headband #3a4a78 with the plate #c9c9c9, kunai up then dropped at the second hit
    ...[
      ["#2a1d14", "spiky", -3.6, 0.8], ["#5a3a22", "swept", -2.4, 0.9], ["#d0b070", "spiky", -0.6, 0.85], ["#1a1a22", "bob", 0.6, 0.9], ["#5a3a22", "swept", 2.4, 0.8], ["#2a1d14", "spiky", 3.6, 0.95],
    ].map(([hc, hp, x, rowZ], i) => ({
      id: `troop${i}`, role: { troop: true, drop: true, blown: i < 3, order: [0, 2, 4, 8, 10, 11][i] }, pos: [x, rowZ], row: 1,
      spec: { scale: 0.46, layers: [{ type: "uniform", col: "#2c3c5e", shade: "#14182c", collar: "#1a1a22", buttons: "#c9c9c9" }], hat: { kind: "headband", col: "#3a4a78", trim: "#c9c9c9" },
        hair: hair(kit, hp, { color: { base: hc, shade: "#12100e", hi: lighten(hc) }, length: [0.08, 0.2], seed: 80 + i }), eyes: eyes("#2a2a3a", "#101018"), weapon: { kind: "sword", hand: "r", col: "#8a8f98", tilt: [-0.3, -0.15] } },
      extras: () => {},
    })),
  ];
};
