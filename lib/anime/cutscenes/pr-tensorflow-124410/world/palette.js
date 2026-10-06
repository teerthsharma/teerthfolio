// PALETTES: the psychedelic per-beat swap. Araki's dimension repaints in flat palettes on a HARD cut (on twos).
// Each palette: sky[5] = the ring colours of the bullseye (cycled mod 5 over 8 rings of 6 degrees), field = outside the
// rings, light = the lit tint of every set surface, shade = the COMPLEMENTARY shadow tint (violet on yellow, teal on
// magenta, blue on snow), haze = the flat horizon fog, water = [shallow, deep].
// The time stop's colour inversion is NOT painted here: it is the full-frame invert pass (fx / post). The world holds the
// pre-stop palette through it so the invert returns the bible's complement palette and is never doubled.
import { Color, Vector3 } from "three";

const v3 = (h) => { const c = new Color(h); return [c.r, c.g, c.b]; };
export const PALS = {
  violet: { sky: ["#5a2a8a", "#d02a9a", "#ff9a2a", "#19d3ff", "#05020a"], field: "#3a1a6a", light: "#f0c8ff", shade: "#4a1a8a", haze: "#8a4aaa", water: ["#19d3ff", "#1f5fe0"], i: 0 },
  citrus: { sky: ["#ffe14a", "#ff9a2a", "#d02a9a", "#05020a", "#19d3ff"], field: "#d02a9a", light: "#fff0a0", shade: "#7a2a9a", haze: "#ffb84a", water: ["#19d3ff", "#1f5fe0"], i: 1 },
  yv: { sky: ["#ffe14a", "#5a2a8a", "#05020a", "#ff6a5a", "#d02a9a"], field: "#2a1050", light: "#ffe890", shade: "#3a1a6a", haze: "#8a3a9a", water: ["#5a2a8a", "#1a0a3a"], i: 2 },
  cyan: { sky: ["#19d3ff", "#3de0b0", "#1f5fe0", "#05020a", "#ffe14a"], field: "#1f5fe0", light: "#c8fff0", shade: "#0a4a8a", haze: "#6ae0d0", water: ["#19d3ff", "#1f5fe0"], i: 3 },
  snow: { sky: ["#f4f4f0", "#d02a9a", "#ffe14a", "#05020a", "#c8d8e8"], field: "#c8d8e8", light: "#ffffff", shade: "#8a6ad0", haze: "#e8e8f4", water: ["#c8d8e8", "#8a9ad8"], i: 4 },
};
const C = Object.fromEntries(Object.entries(PALS).map(([k, p]) => [k, { sky: p.sky.map(v3), field: v3(p.field), light: v3(p.light), shade: v3(p.shade), haze: v3(p.haze), water: p.water.map(v3), i: p.i }]));

// the uniform objects every material of this layer shares BY REFERENCE: one write recolours the whole world
export function makeUniforms(engine, L) {
  const b = new Vector3(...L.BULL).normalize();
  return {
    uP: { value: Array.from({ length: 5 }, () => new Vector3()) },
    uField: { value: new Vector3() }, uLightC: { value: new Vector3(1, 1, 1) }, uShadeC: { value: new Vector3() }, uHaze: { value: new Vector3() },
    uWater0: { value: new Vector3() }, uWater1: { value: new Vector3() },
    uBull: { value: b }, uRingW: { value: (6 * Math.PI) / 180 }, uShift: { value: 0 },
    uKey: { value: new Vector3(-0.45, 0.7, 0.55).normalize() }, uRes: engine.shared.uRes,
  };
}
export function setPalette(U, name) {
  const p = C[name] ?? C.violet;
  p.sky.forEach((c, i) => U.uP.value[i].set(...c));
  U.uField.value.set(...p.field); U.uLightC.value.set(...p.light); U.uShadeC.value.set(...p.shade); U.uHaze.value.set(...p.haze);
  U.uWater0.value.set(...p.water[0]); U.uWater1.value.set(...p.water[1]);
  U.uShift.value = p.i * 0.23; // the hard diagonal shadow band slides to a new place on every swap
}
export const palAt = (t, table) => { let n = table[0][1]; for (const [s, k] of table) if (t >= s) n = k; return n; };
export const palIndex = (n) => (C[n] ?? C.violet).i;
