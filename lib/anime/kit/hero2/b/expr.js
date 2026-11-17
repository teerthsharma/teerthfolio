// EXPRESSIONS (method b): shape changes of the drawn face. eyes: open 0..1, cut (heavy flat lid) 0..1, lower (lower lid rising),
// tilt (added to each eye's own), glow; brow: ang (> 0 lowers the inner end), drop, vis; mouth: kind 0 closed 1 toothed,
export const EXPR = {
  grin: { eyes: { open: 0.84, cut: 0.5, lower: 0.2, tilt: 0.02, glow: 1.5 }, brow: { ang: 0.22, drop: 0.0, vis: 0.5 }, mouth: { kind: 1, amt: 0.95, lift: 0.034, sharp: 0.75 }, head: { nod: 0.04, turn: 0, tilt: 0 } },
  calm: { eyes: { open: 0.72, cut: 0.55, lower: 0.15, tilt: 0.0, glow: 1.0 }, brow: { ang: 0.1, drop: 0.0, vis: 0.35 }, mouth: { kind: 0, amt: 0, lift: -0.004, sharp: 0 }, head: { nod: 0.02, turn: 0, tilt: 0 } },
  glare: { eyes: { open: 0.62, cut: 0.75, lower: 0.4, tilt: 0.12, glow: 1.9 }, brow: { ang: 0.4, drop: 0.012, vis: 0.7 }, mouth: { kind: 1, amt: 0.12, lift: 0.012, sharp: 0.2 }, head: { nod: 0.1, turn: 0, tilt: 0 } },
  shut: { eyes: { open: 0, cut: 0, lower: 0, tilt: 0, glow: 0.2 }, brow: { ang: -0.05, drop: -0.004, vis: 0.2 }, mouth: { kind: 0, amt: 0, lift: 0.01, sharp: 0 }, head: { nod: 0.05, turn: 0, tilt: 0.03 } },
};
