// COSTUMES for the Dark Matter Thieves (E14). Small SEALS (law L6b), the locked pup body with the fur tinted a step greyer than the
// hero's white (#d7d4d0 lit, #a9a8b6 shadow, the same violet-shift shadow as the hero), dressed in Boros's crew palette.
// Hexes are the bible's reading of the series palette (slate armour, violet trim, lilac crest on the leader), not measured.
//   armour  lit #8a8fa6  mid #5f6480  shadow #3a3d56  deep #1f2133      violet trim #8b5fd0 (core gem star glint #e6d8ff)
//   leader  lilac crest #c9b8f0 lit / #8b6fd0 shadow; back plate #2a2c40; ring-collar #c0121f (the dark-matter engine)
//   grunt   plate vest #7a7f98 / #4a4e68; goggled hood #3a3d56 + lens #f2c94c; belt and pauldron #1f2133 + #8b5fd0; blaster #2a2c40
export const FUR = { coat: "#d7d4d0", shade: "#a9a8b6" };
export const SCALE = { leader: 0.72, grunt: 0.55 }; // x the hero's scale: 0.75 m leader, 0.55 m grunts against the hero's 1.0

export function costumeSpecs(kit) {
  const { defineHair } = kit;
  const boros = {
    ...FUR, scale: SCALE.leader, name: "boros-seal",
    layers: [
      { type: "cape", col: "#2a2c40", shade: "#15161f", trim: "#8b5fd0" },                       // the cape-like back plate
      { type: "armour", col: "#8a8fa6", shade: "#3a3d56", trim: "#8b5fd0" },                      // breastplate, pauldrons, tasset
    ],
    // lilac crest: 7 tapered clumps swept up and back, 2-tone with the stepped highlight cut
    hair: defineHair("swept", {
      count: 7, layers: 1, band: [0.15, 0.85], sector: [-0.75, 0.75], length: [0.2, 0.34], width: 0.075, lift: 0.55, sweep: [0, 0.7, -0.8], droop: 0, spike: 0.75, seed: 11,
      color: { base: "#c9b8f0", shade: "#8b6fd0", hi: "#f1ebff" }, cut: { at: [0.35, 0.7], slant: 0.1, rate: 0.8 },
    }),
    eyes: { style: "tsurime", iris: "#c0121f", irisLo: "#5a0a14", sclera: "#e9e4f2" },
  };
  const grunt = (lens, hand, seed) => ({
    ...FUR, scale: SCALE.grunt, name: `thief-${seed}`,
    layers: [
      { type: "armour", col: "#7a7f98", shade: "#4a4e68", trim: "#8b5fd0" },                      // grey plate vest + pauldrons
      { type: "sash", col: "#1f2133", shade: "#0e0f18", knot: "#8b5fd0" },                        // belt
    ],
    hair: defineHair("spiky", { count: 1, layers: 1, band: [0.05, 0.2], sector: [-0.3, 0.3], length: [0.08, 0.12], width: 0.05, seed, color: { base: "#9a90c0", shade: "#5a4f86", hi: "#cfc6ee" } }), // 1 tuft
    eyes: { style: "slit", iris: "#f2c94c", irisLo: "#7a5a10", sclera: "#e9e4f2" },
    weapon: { kind: "pistol", hand, col: "#2a2c40" },
    _lens: lens,
  });
  return {
    boros,
    gruntA: grunt(null, "r", 3),
    gruntB: grunt("#ff6a5a", "l", 5),   // the blaster with the lens
    gruntC: grunt(null, "r", 7),
    gruntD: grunt(null, "l", 9),
  };
}
