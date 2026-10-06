// COSTUMES for pr-mujoco-warp-1541 (Frieza Force). Data only: hex from the bible's palette sheet (section 2 and section 4).
// Soldiers: black undersuit #1b1530, chest plate lit #a469e0 / shadow #4a2878, gold trim #f2b01e, shoulder guards #c590f0 on B D F H.
// Commander: white plated suit #efe6f2 / #9b86c4 with purple #7a3fb8 patches, shoulder domes #c590f0 (props), gold #ffd84a.
export const SOLDIER_COUNT = 8;
const LIT = ["#a469e0", "#c590f0"]; // A C E G / B D F H

export function soldierSpec(i) {
  const col = LIT[i % 2];
  return {
    name: `soldier-${"ABCDEFGH"[i]}`,
    scale: 0.55,
    layers: [
      { type: "uniform", col: "#1b1530", shade: "#0b0818", collar: "#1b1530" },
      { type: "armour", col, shade: "#4a2878", trim: "#f2b01e" },
    ],
    eyes: { style: "round" },
    // the two without a scouter (G, H) hold a 0.8 m spear with a #fff3c2 shaft
    weapon: i >= 6 ? { kind: "spear", hand: "r", col: "#fff3c2", tilt: [0, -0.08] } : undefined,
  };
}

export const commanderSpec = {
  name: "commander",
  scale: 0.7,
  coat: "#fbf6fb", shade: "#cdbfe0", // the crown tuft and fur painted #fbf6fb
  layers: [
    { type: "uniform", col: "#efe6f2", shade: "#9b86c4", collar: "#c590f0", stripe: "#7a3fb8" },
    { type: "sash", col: "#7a3fb8", shade: "#4a2878", knot: "#ffd84a" },
  ],
  eyes: { style: "tsurime" },
};
