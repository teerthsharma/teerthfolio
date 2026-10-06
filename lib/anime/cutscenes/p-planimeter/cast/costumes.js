// COSTUME DATA for p-planimeter (CAST layer). Pure data: every hex is from the production bible (scripts/p-planimeter.md
// sections 2, 4.1, 4.2, 4.3), sampled off the Lerche frames. Consumed by ./index.js through ctx.kit.costumedSeal.
// Palette notes: shade is the hard-edged second tone (vermilion/violet for warm key, never neutral grey).

// ---- the Class D blazer, shared by the hero (as dressing) and the two named classmates.
export const BLAZER = { type: "uniform", col: "#b83a4b", shade: "#8a2338", buttons: "#f0c070", collar: "#f6f3f7", stripe: "#f0c070" }; // gold lapel piping #f0c070

// ---- 4.1 HERO as Ayanokoji. The pup body is the locked design; ONLY these dressing parts are lifted off a scale-1 dresser
// seal and attached to ctx.seal (shell + hair + props). No eye decal: the locked painted eyes stay.
export const HERO = {
  scale: 1, shadow: false,
  layers: [BLAZER],
  // auburn: lit #b9723b, mid #924e17, shade #a9231e, deep strand gap #2a0200, clump gloss #e0a56a. 9 fringe clumps + 4 crown tufts.
  hair: {
    preset: "swept", count: 13, layers: 1, band: [0.15, 1.25], sector: [-1.5, 1.5], length: [0.16, 0.34], width: 0.065,
    lift: 0.4, sweep: [0.25, 0.05, 0.3], droop: 0.08, spike: 0.55, seed: 5,        // side sweep over the right brow
    fringe: { n: 3, length: 0.26, at: [-0.04, 0.78, 0.22], sweep: [-0.3, -0.8, 0.5] },
    color: { base: "#b9723b", shade: "#a9231e", hi: "#e0a56a" },
    cut: { at: [0.4, 0.68], slant: 0.1, rate: 0.85 },                              // 2 gloss pills on the front clumps
  },
  // sunset push on the hair is applied in index.js by tint(#d16f2a, 0.18) when the key warms (shot 1 and 7).
};

// ---- 4.2 REVIEWER (Chabashira). Distinct fur tint (#aeb0c4 grey-blue) so the two seals read apart.
export const REVIEWER = {
  scale: 0.9, coat: "#aeb0c4", shade: "#8486a4",
  layers: [{ type: "uniform", col: "#1a1323", shade: "#0e0a16", collar: "#f6f3f7", buttons: null }],   // suit #1a1323, V collar blouse #f6f3f7 (shade #baaebd)
  // base #584d4c, mid #3a3236, deep #1a1323; 3 gloss pills #b5ad9b on the crown; ponytail of 8 strips 0.55 from the crown; side locks
  hair: {
    preset: "ponytail", count: 6, layers: 1, band: [0.2, 1.2], sector: [-2.2, 2.2], length: [0.14, 0.24], width: 0.07, seed: 23,
    tail: { n: 8, length: 0.55, width: 0.06, at: [0, 0.74, -0.2] },
    color: { base: "#584d4c", shade: "#3a3236", hi: "#b5ad9b" },
    cut: { at: [0.3, 0.5], slant: 0.05, rate: 0.5 },
  },
  eyes: { style: "tsurime", iris: "#d9cf5a", irisLo: "#f5ee9a", lash: "#2a2026", pupilCol: "#2a2026" },   // olive, ring #2a2026, thick upper lash
};

// ---- 4.3 CLASS D seals
export const SUDO = {
  scale: 0.6, coat: "#8e8c91", shade: "#6d6b7d",
  layers: [BLAZER],
  hair: { preset: "spiky", count: 7, layers: 1, band: [0.1, 1.1], length: [0.16, 0.3], width: 0.075, spike: 0.9, seed: 31, color: { base: "#c8301e", shade: "#8a1e12", hi: "#e8603e" } },
  eyes: { style: "tsurime", iris: "#7a3a2a", irisLo: "#c06a4a" },
};
export const HORIKITA = {
  scale: 0.6, coat: "#9a98a0", shade: "#74728a",
  layers: [{ ...BLAZER, collar: "#f6f3f7", stripe: null }],
  hair: { preset: "long", count: 6, layers: 1, length: [0.4, 0.55], width: 0.08, seed: 41, color: { base: "#1e1c2a", shade: "#0a0a14", hi: "#6a6a9a" } },   // fall of 6 clumps, gloss #6a6a9a
  eyes: { style: "round", iris: "#2a2a44", irisLo: "#5a5a8a" },
};
// the three seated students (replace the faceless blobs of the old build): same blazer, varied hair, hunched at the desk
export const SEATED = [
  { scale: 0.56, coat: "#8e8c91", shade: "#6d6b7d", layers: [BLAZER], hair: { preset: "bob", color: { base: "#5a3a2a", shade: "#2a1a14", hi: "#a07a58" }, seed: 51 } },
  { scale: 0.56, coat: "#96949a", shade: "#706e82", layers: [BLAZER], hair: { preset: "swept", color: { base: "#2a2a34", shade: "#14141c", hi: "#6a6a80" }, seed: 52 } },
  { scale: 0.56, coat: "#8a8a92", shade: "#6a6a80", layers: [BLAZER], hair: { preset: "slick", color: { base: "#8a6a2a", shade: "#4a3410", hi: "#d8b060" }, seed: 53 } },
];

// ---- props (hex): built in index.js with engine.figure; dimensions in the pup's own unit (0.8 = body height)
export const PROPS = {
  clipboard: { w: 0.22, h: 0.3, d: 0.016, col: "#f3f0e6", shade: "#cfd4de", clip: "#a8222f", tag: "#a8222f" },
  card: { w: 0.07, h: 0.1, d: 0.008, col: "#5efeb6", shade: "#3ddc84" },      // the green point card #5efeb6 (rim #f3fcf2)
  pencil: { len: 0.2, r: 0.008, barrel: "#e9a62c", tip: "#1a1323", ferrule: "#cfcfcf" },
  tie: { col: "#1a2fa0", shade: "#101f78" },
  bow: { col: "#1030c0", shade: "#0a1f80" },
  pin: { col: "#a77de0", shade: "#7a4ab8" },                                    // zigzag hairpin, 3 segments
};
