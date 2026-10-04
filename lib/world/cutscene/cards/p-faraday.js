// faraday: A Certain Scientific Railgun, Misaka's coin flick, Academy City at night, drawn as a CYANOTYPE
// BLUEPRINT (its own dimension: Prussian-blue paper, cream linework, a drafting grid). The fields start wrong
// and settle onto one fixed point (every arc crossing every ring at a right angle); only then does amber rise,
// the coin is flicked, and the railgun burns through the drawing. The burn spreads over the sheet and takes it
// away, which is why we are home: the real island was under it. Round head, no ears.
// The dock builder owns this file and moves/p-faraday.jsx (parts in moves/p-faraday/).
// The move draws its own comic layer for this scene (the RAILGUN banner and four lines: Touma, the pup,
// Kuroko, the pup's flex), so a, b and c below are what the kit shows under reduced motion: Touma's doubt,
// the pup's answer, the flex; the credit card (the kit's) closes it. The figures are drawn by the move, so the
// speaker entries here only place the tails (offsets from the pup; build, prop and pose are unused).
export default {
  id: "p-faraday",
  homage: "A Certain Scientific Railgun: Misaka's coin flick",
  why: "The field coupling, found rather than assumed.",
  stage: { color: "#ffa927", hue: 212, stars: "none", halftone: 6, sfx: "ZAP" },
  speaker: [
    { build: "tall", hair: "spiky", prop: "band", pose: "handout", at: [6.38, -3.65, -5.42] },
    { build: "small", hair: "none", prop: "band", pose: "hip", at: [-2.63, 0.735, -1.69] },
  ],
  a: { who: "sil", text: "Electric and magnetic? You're just assuming they couple." },
  b: { who: "seal", text: "Not assumed. Found.", kind: "burst" },
  c: { who: "seal", text: "The field coupling, found rather than assumed. Computational Faraday tensor, topology-fixed-point projection.", kind: "burst" },
  credit: { title: "teerthsharma/faraday", sub: "computational Faraday tensor · topology-fixed-point projection · coupling, not assumption" },
  // the facing two-shot: the pup left, Touma charging in from the right to mid-distance (4 m), both in profile across the lens
  view: { wide: [[2.1, 1.3, -0.5], [0, 0.3, 10.2]], tall: [[2.0, 1.4, -0.5], [0, 0.5, 15]] },
  move: { pose: "sign", then: "fist", note: "The fields settle to right angles; amber rises; Touma charges up to the pup and faces it; the coin is flicked; the railgun hits him and burns through the blueprint, and the burn takes the whole sheet back to the island." },
  bold: ["assuming", "Found.", "The field coupling, found rather than assumed."],
  length: 20.8, // four lines (5, 5, 5, 7.7 s) and the credit (4 s), each held to the owner's reading pace; the dead time after the shot is cut
  beats: { sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.7, lineA: 1.8, move: [6.4, 6.8], lineB: 6.8, lineC: 12.0, credit: 16.7, collapse: [20.0, 20.4] },
};
