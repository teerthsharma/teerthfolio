// COSTUME DATA for p-nerve (hex from the bible section 2 and 4). Plain objects for costumedSeal(engine, spec).
// Pup units: the locked pup is 0.8 m at scale 1, so a 0.9 m Ryuk is scale 1.125, a 0.8 m L is 1.0, a 0.28 m colony pup is 0.35.
// Hair lengths are in pup units (x scale = metres).
const hair = (kit, base, o) => kit.defineHair(base, o);

// Ryuk: fur #1b1a20 / #0a0a0c, 9 tapered cone clumps (0.35 to 0.6 m) in #0a0a0c with white strand cuts, crown leaning back 15 degrees,
// black sash belt, slit eyes on yellow sclera #e8d04a.
export const ryukSpec = (kit) => ({
  name: "ryuk-seal", scale: 1.125, coat: "#1b1a20", shade: "#0a0a0c",
  layers: [{ type: "sash", col: "#0a0a0c", shade: "#050506", knot: "#0a0a0c" }],
  hair: hair(kit, "spiky", {
    count: 9, layers: 1, length: [0.31, 0.53], width: 0.08, lift: 0.9, spike: 0.95,
    sweep: [0, 0.05, -0.27], // 15 degrees back: tan(15) ~ 0.27 of the up vector
    color: { base: "#0a0a0c", shade: "#040405", hi: "#f2f2ee" }, cut: { at: [0.4, 0.62], slant: 0.12, rate: 0.9 },
  }),
  eyes: { style: "slit", sclera: "#e8d04a", iris: "#e8d04a", irisLo: "#c4a928", pupilCol: "#050505", lash: "#050505", size: [0.1, 0.11] },
});

// L: fur #ecebe7 / #9ea39a, loose white long-sleeve shirt (#ecebe7 / #7f8387), 12 black clumps #15151a with strand #8d98a3,
// ends flicked, cut into the forehead; huge black pupils inside a grey ring #c9cdd2.
export const lSpec = (kit) => ({
  name: "l-seal", scale: 1.0, coat: "#ecebe7", shade: "#9ea39a",
  layers: [{ type: "coat", col: "#ecebe7", shade: "#7f8387", open: 0.04 }],
  hair: hair(kit, "swept", {
    count: 12, layers: 1, length: [0.15, 0.27], width: 0.075, lift: 0.15, spike: 0.65, droop: 0.4, curl: 0.05,
    sweep: [0, -0.3, 0.2], color: { base: "#15151a", shade: "#08080b", hi: "#8d98a3" }, cut: { at: [0.35, 0.65], slant: 0.1, rate: 0.85 },
    fringe: { n: 3, length: 0.2, at: [0, 0.8, 0.2], sweep: [0, -0.6, 0.7] }, // bangs cut into the forehead
  }),
  eyes: { style: "round", sclera: "#ecebe7", iris: "#c9cdd2", irisLo: "#15151a", pupilCol: "#050507", lash: "#15151a", size: [0.11, 0.12] },
});

// Colony pup: 0.28 m, a tiny dark collar (scarf layer #1c1816), plain tinted fur
export const colonySpec = (coat, shade) => ({
  name: "colony-seal", scale: 0.35, coat, shade, shadowTint: "#0b0e10",
  layers: [{ type: "scarf", col: "#1c1816", shade: "#0b0a09" }],
});
