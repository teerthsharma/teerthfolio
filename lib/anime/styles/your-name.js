// Your Name (Shinkai / CoMix Wave), world recipe. Target: sealreferences/"your name.jpg" (poster:
// ultramarine-to-cyan sky, towering cumulus, Tiamat's comet, pink anamorphic flare, city in blue
// haze, sunlit grass hill, wires). No line; crisp painted detail; strong glow. Pure data.
export default {
  id: "your-name", name: "Your Name (Shinkai)", anime: "Your Name", world: "yourName",
  homage: "Shinkai's sky: saturated ultramarine gradient, sunlit cumulus with blue undersides, the comet, lens flare and glitter, blue aerial haze on the city, a bright grass hill, utility wires.",
  fill: { rim: 0.3, ring: 0 },
  lines: { set: 0 },
  post: { bloom: 1.1, diffuse: 0.3, sat: 1.12, gain: [0.98, 1.0, 1.04], grain: 0.02, vig: 0.25, ca: 0.3, kuwa: 2, haze: "#bfe2f5", hazeAmt: 0.65, hazeNear: 30, hazeFar: 250 },
  timing: { fps: 12 },
};
