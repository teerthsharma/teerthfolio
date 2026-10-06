// The bible's colours (section 2, STYLE LAW, and every element's Colour row). THREE.Color uniforms are LINEAR, which is what the paint kit expects.
import { Color } from "three";
export const HEX = {
  void: "#1a0b3d", indigo: "#2b1065", teal: "#19e6c8", tealHi: "#7affea", gold: "#ffb524", orange: "#f28d2e", violet: "#7a3fc0", violetRim: "#6b24ad",
  crimson: "#e11d2e", ember: "#ff6a1f", wispCore: "#1a0c0c", basaltDark: "#231e2a", basaltLit: "#5a4a63", deep: "#0d0714", bone: "#8c8474",
  crescent: "#f2b25a", hull: "#120a1a", mist: "#0f2e32", rimGold: "#ffd9a0", rimMid: "#c98a4e", pale: "#ffe7a8", lid: "#f5c58a", limb: "#14031f",
  irisIn: "#ffdc7a", irisMid: "#f28d2e", sclIn: "#0f0517", sclOut: "#8c5229", photon: "#fff2d1", sharingan: "#d0161f",
  memory: "#05d9f2", files: "#ffc74d", sched: "#f25aad", cream: "#e8dcc0",
};
export const col = (k) => new Color(HEX[k] ?? k);
export const U = (k) => ({ value: col(k) });
