// WORLD palette for home: every hex is read by eye from the Vinland Saga refs (bible section 2, ref 04 / 09 / 05 / 01).
// GLSL colours are converted with paint.js V() (sRGB hex -> linear vec3), the same path every other painting uses.
import { V } from "../../../paint.js";

export const C = {
  // sky (ref 04 cobalt, dawn gold from ref 09)
  zenith: "#1f58ac", upper: "#3f86d0", mid: "#5b9bd6", low: "#a5cdeb", horizon: "#ffb978", horizonHi: "#ffd9a0", cool: "#b9c4ea",
  cloudTop: "#ffffff", cloudBody: "#e6eefc", cloudBelly: "#9fb7de", cirrusLit: "#ffc9b0", cirrusShade: "#8f8fd0", apricot: "#ffe3c0",
  sun: "#fff3d8", sunRing: "#f2a05a",
  // snow and rock
  snowLit: "#eef2fa", snowMid: "#cfd5ee", snowShade: "#b4b9e0", snowDeep: "#8a8fd6", shelf: "#f6f4fb", track: "#c9c3ea",
  rockLit: "#6a7286", rockMid: "#596072", rockShade: "#3d4658", rockDeep: "#2a3040", haze: "#7d8fd0",
  cliff: "#2a3a3e", cliffLit: "#34484d", strata: "#1d2a2e",
  turf: "#6b7a3e", turfShade: "#3f4a38", shingle: "#8d8fa6", shingleShade: "#565a76",
  // water
  waterNear: "#0e4a5c", waterFar: "#0a3446", sunPath: "#ffb978", ice: "#f6f4fb", iceSide: "#7fb6c4",
  // wood, ship, igloo
  plank: "#8a5a34", plankShade: "#583a40", gap: "#2a1f1a", pile: "#3a2f2a", rope: "#c8b48e", timber: "#8c6b4d", timberShade: "#5a4458",
  turfRoof: "#7f9b69", turfRoof2: "#8aa070", door: "#34304a", hearth: "#ffd990",
  sailRed: "#d9533a", sailCream: "#f2e8d0", prow: "#c89a4a", prowHi: "#e0b858", shieldTeal: "#4f7a8c", shieldGold: "#d8a64b", boss: "#3a2f2a",
  block: "#f6f1e8", block2: "#f1ece3", seam: "#5a5470", cobalt: "#6fb4ea", cobaltShade: "#2e6fc4", drum: "#2e3452", lens: "#ffe2a0",
  cairn: "#8a8aa0", cairn2: "#9a97ae", cairn3: "#a8a4b8", cairnShade: "#5a5a7a", smoke: "#dcd8e6", smokeShade: "#a8a4c0",
  // Vinland (ref 09)
  vinCore: "#ffd37a", vinBody: "#f2b84a", vinEdge: "#3a2a42", warm: "#ffb070", key: "#ffc98a",
};
export const g = (k) => V(C[k] ?? k);              // GLSL linear vec3 from a palette key or a hex
export const SUN = { az: -0.25, el: 0.14 };        // 8 degrees up, left of the fjord mouth (seen from the jetty looking -z)
export const dirOf = (az, el) => [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
