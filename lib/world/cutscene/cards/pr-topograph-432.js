// the Topograph moat: Gandalf on the bridge of Khazad-dum. Cluster-wide reach is withdrawn.
// The dock builder owns this file and moves/pr-topograph-432.jsx; the fields are in cards/index.js.
// The seal is the one on the bridge, so both lines are its own; the figure is Frodo, tiny at the far end.
const FLEX = "Merged into topograph. 145 lines gated. No more cluster-wide pods, nodes or daemonsets.";
const FLEX_PHONE = "145 lines gated. Cluster-wide reach: denied."; // the mobile cut, eight words
export default {
  id: "pr-topograph-432",
  homage: "Gandalf",
  why: "Cluster-wide reach is withdrawn.",
  stage: { stars: "motes", halftone: 6, sfx: "THOOM" },
  speaker: { build: "small", hair: "none", prop: "none", pose: "side", at: [-2.15, 0, -0.9], scale: 0.62 },
  a: { who: "seal", text: "You shall not list." },
  b: {
    who: "seal",
    get text() {
      return typeof window !== "undefined" && window.innerWidth <= 720 ? FLEX_PHONE : FLEX;
    },
  },
  bold: ["not list", "145 lines gated"],
  move: { pose: "point", note: "The pup slams a mint-crystal staff into the ice bridge; two mint walls stand up, the Balrog's three whips snap back off them, the YES cards pile on the deck and the ice cracks under the Balrog's side only." },
};
