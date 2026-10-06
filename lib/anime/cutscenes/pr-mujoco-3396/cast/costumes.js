// CAST costumes for pr-mujoco-3396: the 12 victims as small costumed seals (owner law L6b: never silhouettes).
// spec = data for kit.costumedSeal (cloth layers with hex, hair clumps, eye decals, weapon); adorn() adds the rigid pieces
// the kit lacks (cap, buttons, armband, rifle, wings, gear) as children of the seal's body so they ride every pose.
// Hexes are the bible's section 4 (stylised from the anime; the exact in-frame tunic hex is unverified there).
// Fur stays the locked grey: only the cloth changes, so a victim is unmistakably a seal.
export const VICTIM_SCALE = 0.78; // 0.9 m long against the hero's 1.1 m (bible E10)

export function costumeSpecs(ctx) {
  const { defineHair } = ctx.kit;
  const S = VICTIM_SCALE;
  return {
    // MARLEYAN RIFLEMAN x5: greatcoat #4a4a3a (shade #2d2d24), belt #5a3b22, cap, 1 small tuft #3b2f22 under the cap, terror eyes
    rifleman: (i) => ({
      name: `rifleman-${i}`, scale: S,
      layers: [{ type: "uniform", col: "#4a4a3a", shade: "#2d2d24", collar: "#3a3f36" }, { type: "sash", col: "#5a3b22", shade: "#2b1c10", knot: "#c99a4a" }],
      hair: defineHair("bald", { fringe: { n: 1, length: 0.075, at: [0.0, 0.7, 0.245], sweep: [0.25, -0.5, 0.6] }, seed: 20 + i, color: { base: "#3b2f22", shade: "#1c1410", hi: "#6b4a2e" } }),
      eyes: { style: i % 2 ? "tareme" : "round", iris: "#4a3a2a", irisLo: "#2a2018" },
    }),
    // MARLEYAN OFFICER x1: long greatcoat #3a3f36, gold epaulettes, red collar tabs, white gloves, gold-crest cap, sabre #8a8a84
    officer: () => ({
      name: "officer", scale: S * 1.06,
      layers: [{ type: "coat", col: "#3a3f36", shade: "#222620", open: 0.0, collar: "#2e322b" }, { type: "sash", col: "#5a3b22", shade: "#2b1c10", knot: "#c99a4a" }],
      weapon: { kind: "sword", hand: "r", col: "#8a8a84", hilt: "#5a3b22", trim: "#c99a4a", tilt: [1.15, 0] },
      eyes: { style: "tsurime", iris: "#3a4a5a", irisLo: "#1c2630" },
    }),
    // SURVEY CORPS SCOUT x4: brown jacket #6b4a2e, belts #5a3b22, a pointed hard-edged hair of 3 clumps with a lit shine stripe #c99a4a.
    // The green cloak #4f6b45 is a separate figure (parts.cloak) so it can stream; two blades (one here, one in adorn)
    scout: (i) => ({
      name: `scout-${i}`, scale: S,
      layers: [{ type: "uniform", col: "#6b4a2e", shade: "#3e2a1a", collar: "#5a3b22" }, { type: "sash", col: "#5a3b22", shade: "#2b1c10", knot: "#8a8a84" }],
      hair: defineHair("swept", { count: 8, layers: 1, length: [0.1, 0.17], spike: 0.7, seed: 40 + i, fringe: { n: 3, length: 0.19, at: [0.0, 0.78, 0.2], sweep: [0.3, -0.7, 0.5] }, color: { base: "#6b4a2e", shade: "#3b2a1a", hi: "#c99a4a" }, cut: { at: [0.4, 0.78], slant: 0.1, rate: 0.95 } }),
      weapon: { kind: "sword", hand: "r", col: "#c9ccd0", hilt: "#5a3b22", tilt: [0.25, -0.35] },
      eyes: { style: "tsurime", iris: ["#4a6a8a", "#5a7a4a", "#7a5a3a", "#4a4a6a"][i % 4], irisLo: "#1c2430" },
    }),
    // CIVILIAN / ELDIAN-ARMBAND x2: the long cream coat #e6d5b0 (shade #a98a62), red armband #b8492f, light-blond back-swept tuft of 3 clumps
    civilian: (i) => ({
      name: `civilian-${i}`, scale: S,
      layers: [{ type: "coat", col: "#e6d5b0", shade: "#a98a62", open: 0.03, collar: true, trim: "#c9b48a" }],
      hair: defineHair("swept", { count: 3, layers: 1, length: [0.14, 0.22], sweep: [0, 0.05, -0.85], spike: 0.4, seed: 60 + i, color: { base: "#e8c97a", shade: "#b08a44", hi: "#fff0c8" }, cut: { at: [0.5, 0.8], slant: 0.06, rate: 0.9 } }),
      eyes: { style: "round", iris: "#7a9ac4", irisLo: "#2f4f8f" },
    }),
  };
}

// rigid additions per kind, as children of v.body (the pose group). Returns { rifle?, cloak?, blade2? } handles the script moves.
export function adorn(kind, v, P, ctx) {
  const out = {};
  if (kind === "rifleman") {
    v.body.add(P.cap({ col: "#3a3f36", band: "#c99a4a" }), P.buttons("#c99a4a"), P.strap("#5a3b22"), P.armband("#efe6d2", -1));
    // the rifle is returned; the script reparents it when it drops
    out.rifle = P.rifle();
  } else if (kind === "officer") {
    v.body.add(P.cap({ col: "#3a3f36", band: "#c99a4a", crest: "#c99a4a" }), P.epaulettes("#c99a4a"), P.gloves("#efe6d2"), P.collarTabs("#b8492f"), P.moustache("#3b2f22"));
  } else if (kind === "scout") {
    v.body.add(P.trousers("#e8dfc8"), P.odm());
    const c = P.cloak({ col: "#4f6b45", shade: "#2f4a30", lining: "#2f4a30", len: 0.9, collar: true, clasp: "#c99a4a" });
    const w = P.wings(); w.position.set(0, 0.3, -0.465); w.rotation.y = Math.PI; // faces away from the seal's back
    c.add(w);
    v.body.add(c);
    out.cloak = c;
    // the second blade, left hand, held low
    const b2 = ctx.kit.WEAPONS.sword(ctx.engine, { col: "#c9ccd0", hilt: "#5a3b22", trim: "#8a8a84" });
    b2.position.set(-0.27, 0.28, 0.25);
    v.props.add(b2);
    out.blade2 = b2;
  } else if (kind === "civilian") {
    v.body.add(P.trousers("#6b4a2e"), P.armband("#b8492f", -1));
  }
  return out;
}

