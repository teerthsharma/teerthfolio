// the Igloo: Vinland Saga. Neutral zone, no radiation: nothing here is an enemy.
// The dock builder owns this file and moves/home.jsx; the fields are in cards/index.js.
export default {
  id: "home",
  homage: "Vinland Saga",
  why: "Neutral zone, no radiation: nothing here is an enemy.",
  stage: { hue: 222, color: "#2f4f8f", stars: "none", halftone: 0, sfx: "bloop" },
  length: 11.6,
  speaker: "land",
  landAt: { x: 0, y: 0.9, z: -4.05 }, // the igloo entrance arch
  a: { who: "land", text: "Neutral zone. No radiation." },
  b: { who: "seal", text: "I have no orcas, for I have no enemies.", kind: "burst" },
  c: { who: "seal", text: "Eleven landed contributions. Welcome home.", kind: "oval" },
  credit: { title: "Teerth Sharma · Seal's Topology Land", sub: "Eleven landed contributions." },
  move: { pose: "sit", note: "The pup sits and does nothing; an orca fin circles once and sinks; the docks light up on the horizon." },
  bold: ["orcas", "enemies", "Eleven landed contributions"],
};
