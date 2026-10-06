// Per-dock camera card. Aether looks OUT through the flood, not a side crop.
// from = yaw in turns (1 = 180°). d in metres. Island roam never uses this.

export const SEAL_CAMERAS = Object.freeze({
  "p-aether-lang": Object.freeze({
    from: 1,
    eyeH: 0.4,
    d: 900,
    fov: Object.freeze([28, 44]),
    look: "out-through-flood",
    thirds: "hole-center hero-lower-right",
  }),
  "spawn-seal": Object.freeze({
    from: 0.611,
    eyeH: 0.7,
    d: 420,
    fov: Object.freeze([32, 40]),
    look: "into-plinth",
    thirds: "pear-center",
  }),
  home: Object.freeze({
    from: 0.15,
    eyeH: 0.85,
    d: 420,
    fov: Object.freeze([32, 42]),
    look: "jetty-across",
    thirds: "horizon-upper",
  }),
  "p-caustic": Object.freeze({ from: 0.22, eyeH: 0.8, d: 420, fov: Object.freeze([30, 40]), look: "into-seal", thirds: "hero-right" }),
  "p-epsilon-hollow": Object.freeze({ from: 0.18, eyeH: 0.75, d: 480, fov: Object.freeze([30, 42]), look: "into-seal", thirds: "hero-right" }),
  "p-faraday": Object.freeze({ from: 0.2, eyeH: 0.85, d: 420, fov: Object.freeze([32, 42]), look: "into-seal", thirds: "hero-right" }),
  "p-monodromy": Object.freeze({ from: 0.25, eyeH: 0.8, d: 440, fov: Object.freeze([30, 40]), look: "into-seal", thirds: "hero-right" }),
  "p-nerve": Object.freeze({ from: 0.16, eyeH: 0.85, d: 400, fov: Object.freeze([32, 40]), look: "into-seal", thirds: "hero-right" }),
  "p-planimeter": Object.freeze({ from: 0.14, eyeH: 0.9, d: 380, fov: Object.freeze([34, 42]), look: "desk-across", thirds: "hero-center" }),
  "p-separatrix": Object.freeze({ from: 0.2, eyeH: 0.8, d: 420, fov: Object.freeze([32, 42]), look: "into-seal", thirds: "hero-right" }),
  "p-tangle": Object.freeze({ from: 0.18, eyeH: 0.85, d: 400, fov: Object.freeze([32, 40]), look: "into-seal", thirds: "hero-right" }),
  "pr-highway-3244": Object.freeze({ from: 0.28, eyeH: 0.75, d: 500, fov: Object.freeze([28, 40]), look: "into-seal", thirds: "hero-right" }),
  "pr-pyrefly-4180": Object.freeze({ from: 0.24, eyeH: 0.8, d: 420, fov: Object.freeze([30, 40]), look: "into-seal", thirds: "hero-right" }),
  "pr-tensorflow-124410": Object.freeze({ from: 0.3, eyeH: 0.8, d: 440, fov: Object.freeze([30, 42]), look: "into-seal", thirds: "hero-right" }),
  "pr-xnnpack-10801": Object.freeze({ from: 0.18, eyeH: 0.85, d: 400, fov: Object.freeze([32, 42]), look: "into-seal", thirds: "hero-right" }),
});

export function cameraFor(dock) {
  return SEAL_CAMERAS[dock] ?? Object.freeze({
    from: 0.2,
    eyeH: 0.85,
    d: 420,
    fov: Object.freeze([32, 44]),
    look: "into-seal",
    thirds: "hero-right",
  });
}
