// monodromy: Magi, Sinbad and Baal's Baararaq Saiqa in Sindria, Arabian Nights. Ja'far panics, the seal fires the
// strongest lightning, it breaks the fourth wall, and the crack is the loop: the seal steps through, the scene folds
// shut along it and the island is exactly where we left it (monodromy: the loop closed below, not above).
// The dock builder owns this file and moves/p-monodromy.jsx (parts in moves/p-monodromy/); the fields are in cards/index.js.
// Ja'far's panic ("My king, you can't fire that inside a portfolio!") is the move's own bubble, up before line A:
// the shared bubbles hold three lines, and the scene needs four. Round head, no ears.
export default {
  id: "p-monodromy",
  jokeSlot: "b",
  jokes: [
    "My king… you broke the sky itself.",
    "The lightning tore through the world. Is that even allowed?",
    "The strongest lightning of every sea… from a seal.",
    "Sindria's king never misses. Even across dimensions.",
    "The loop cracked. And still, it closes.",
    "Baal's lightning answered a seal. Unbelievable.",
    "My king, the wall between worlds just broke!",
    "Everything shattered. Everything is still in its place.",
    "Only a king could break the world and keep it whole.",
    "The djinn bows. The king of the seas is a seal.",
    "The crack runs through everything… and folds shut.",
    "Is it over? No. It closed below.",
    "Not even Al-Thamen could undo that.",
    "Your lightning came back around, my king. As always.",
    "Sindria will sing of this. The sky cracked, and held.",
  ],
  homage: "Magi: Sinbad, the djinn Baal and Baararaq Saiqa",
  why: "Can a loop be undone? It closed below, not above.",
  stage: { color: "#1fbdb4", stars: "none", halftone: 0, sfx: "ZZAAP" },
  // dossier (#9): zoom out from the real dock, switch at the wide, push onto the seal from a bent azimuth, then the kill
  pull: { far: 420, fov0: 28, fov1: 44 },
  into: { from: 0.35, elev: 0.5, fov: 44 },
  kill: { what: "the fourth wall: the dimension's canon", at: "lineB" },
  fog: { near: 140, far: 520 },
  camFar: 900,
  length: 14.0,
  beats: { lineA: 4.6, move: [6.4, 7.0], lineB: 7.0, lineC: 9.6, credit: 12.0, collapse: [13.2, 13.6] },
  speaker: "land",
  // a level lens a little above the terrace: the palace and the vortex over the pup, the pup above the bubbles
  view: { wide: [[0.4, 1.3, -1.0], [-0.4, 1.1, 7.8]], tall: [[0.3, 1.6, -1.0], [-0.3, 1.3, 10.5]] },
  a: { who: "seal", text: "Relax. The loop closes. It always closes below." },
  b: { who: "land", text: "My king… you broke the sky itself.", kind: "burst" },
  c: { who: "land", text: "Can it be undone? Topology answers: it closed below, not above. 5 dependencies, torch not required.", kind: "burst" },
  credit: { title: "teerthsharma/monodromy · 5 dependencies · torch not required", sub: "No Jacobian required: the loop closes below, not above.", ret: "The crack closes the loop: the seal steps back out exactly where it left." },
  move: { pose: "sign", then: "raise", note: "The pup becomes Sinbad and equips Baal while Ja'far panics; Baararaq Saiqa cracks the lens, the world freezes, shatters into shards that fall away, and the island reassembles from them with the pup upright at its dock." },
  bold: ["always closes below", "Wrong dimension", "closed below, not above", "5 dependencies"],
};
