// CAST costumes for pr-xnnpack-10801 (data only, built through ctx.kit so this file imports nothing).
// Every victim is a SMALL SEAL in the villain's costume (owner law L6b). Hexes are the DIMENSION palette (bible 2 and 8: paper #f4f4f0,
// ink #080a0f, grey #aab1bf / #6a6a72, ONE cold blue elsewhere; "any colour beyond the one blue breaks the illusion").
// The bible section 4 real-world hexes are kept beside each piece as REAL: they are what the hole in the glass would show.
//
//   fur: the seal's coat tint, paper #f4f4f0 lit / #aab1bf shadow (bible 2: skin lit #f4f4f0, shadow #aab1bf). The kit caps lit luma at 0.92.
export const FUR = { coat: "#efefea", shade: "#aab1bf" };
const INK = "#080a0f", PAPER = "#f4f4f0", GREY = "#aab1bf", SASH = "#6a6a72";
const HAIR_INK = { base: INK, shade: "#000000", hi: PAPER }; // black fill with the white clump cut (bible 2: HAIR)
const CUT = { at: [0.34, 0.74], slant: 0.28, rate: 0.85 };

// eyes: TYBW grammar (bible 2): 1 highlight read, heavy upper lash, white/black iris in the dimension
const eyes = (style, iris = "#2a2f3a", irisLo = INK) => ({ style, iris, irisLo, sclera: PAPER, lash: INK, pupilCol: INK });

export function makeSpecs(kit) {
  const { defineHair } = kit;
  const base = { ...FUR, ink: INK, shadowTint: "#4a4f6e" };
  return {
    // ---- Aizen's standing figure: the illusion's voice (INDEX default 7: yes, a costumed seal). 1.9 vs hero: scale 1.2.
    // swept-back hair, the one lock down the forehead, long open coat, Kyoka Suigetsu held low (the blade is a separate prop).
    // REAL: coat #1a1620 over white kosode, hair #6a4a38, sash #6a6a72.
    aizen: {
      ...base, name: "aizen-seal", scale: 1.2,
      layers: [
        { type: "coat", col: INK, shade: "#000000", open: 0.09, collar: PAPER, trim: GREY },
        { type: "sash", col: SASH, shade: "#44444c" },
      ],
      hair: defineHair("forelock", { color: HAIR_INK, cut: CUT, seed: 11, length: [0.15, 0.25] }),
      eyes: eyes("tsurime"),
    },
    // ---- Ichigo: black shihakusho, white collar (REAL #080a0f / #f4f4f0), five spiky clumps (REAL orange #f08a2a), Zangetsu on the back.
    ichigo: {
      ...base, name: "ichigo-seal", scale: 1.12,
      layers: [
        { type: "coat", col: INK, shade: "#000000", open: 0.04, collar: PAPER },
        { type: "sash", col: PAPER, shade: GREY },
      ],
      hair: defineHair("spiky", { count: 5, layers: 1, length: [0.17, 0.27], width: 0.085, lift: 0.9, color: HAIR_INK, cut: CUT, seed: 5 }),
      eyes: eyes("tsurime"),
    },
    // ---- Gin: captain's white haori over the black shihakusho, silver bowl hair in 3 clumps (REAL #d8d8e0), the permanent narrow smile.
    gin: {
      ...base, name: "gin-seal", scale: 1.12,
      layers: [
        { type: "uniform", col: INK, shade: "#000000", collar: false },
        { type: "coat", col: PAPER, shade: GREY, open: 0.07, trim: "#c8ccd6", collar: true },
        { type: "sash", col: INK, shade: "#000000" },
      ],
      hair: defineHair("bob", { count: 3, layers: 1, length: [0.15, 0.22], width: 0.11, color: { base: "#d8d8e0", shade: GREY, hi: PAPER }, cut: CUT, seed: 8 }),
      eyes: eyes("tareme", "#3a3f4a"),
    },
    // ---- Urahara: green kimono (REAL #3a6a4a) under a black haori (#080a0f), striped bucket hat (REAL #3a8a5a / #f4f4f0), blond fringe
    // (REAL #e8d890) in two clumps. The hat is a separate prop so it can be tipped; geta and the cane (Benihime) are props too.
    urahara: {
      ...base, name: "urahara-seal", scale: 1.12,
      layers: [
        { type: "uniform", col: "#2c2e36", shade: INK, collar: false },
        { type: "coat", col: INK, shade: "#000000", open: 0.06, trim: GREY },
      ],
      hair: defineHair("forelock", { count: 0, layers: 1, fringe: { n: 2, length: 0.17, at: [0.0, 0.76, 0.2], sweep: [0.15, -0.8, 0.5] }, color: { base: "#d8d8e0", shade: GREY, hi: PAPER }, cut: CUT, seed: 4 }),
      eyes: eyes("round", "#3a3f4a"),
    },
    // ---- Colony and Soul Reaper extras (x6): black shihakusho, tied white sash, black 3-clump tufts, a sheathed katana, open-mouth cheer.
    extra: {
      ...base, name: "reaper-seal", scale: 1.0,
      layers: [
        { type: "coat", col: INK, shade: "#000000", open: 0.04 },
        { type: "sash", col: PAPER, shade: GREY, knot: PAPER },
      ],
      hair: defineHair("spiky", { count: 3, layers: 1, length: [0.1, 0.17], width: 0.09, lift: 0.8, color: HAIR_INK, cut: CUT }),
      eyes: eyes("round"),
    },
  };
}
