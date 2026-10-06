// Per-dock hand sign. Flippers, not human hands. Every cutscene has one.
// Aether = Gojo domain mudra. Mura / spawn = belly claps.

export const SIGN = Object.freeze({
  gojo: "gojo",
  clap: "clap",
  two: "two",
  point: "point",
  book: "book",
  wave: "wave",
  pocket: "pocket",
  staff: "staff",
  slash: "slash",
});

export const SEAL_SIGNS = Object.freeze({
  "_template": SIGN.wave,
  home: SIGN.wave,
  "p-aether-lang": SIGN.gojo,
  "p-caustic": SIGN.two,
  "p-epsilon-hollow": SIGN.point,
  "p-faraday": SIGN.pocket,
  "p-monodromy": SIGN.staff,
  "p-nerve": SIGN.book,
  "p-planimeter": SIGN.pocket,
  "p-separatrix": SIGN.point,
  "p-tangle": SIGN.pocket,
  "p-resolvent": SIGN.staff,
  "p-topological-ml-toolkit": SIGN.pocket,
  "spawn-seal": SIGN.clap,
  "pr-mujoco-3396": SIGN.slash,
  "pr-mujoco-warp-1541": SIGN.staff,
  "pr-mujoco-3450": SIGN.point,
  "pr-polychrom-79": SIGN.staff,
  "pr-nemo-relay-481": SIGN.wave,
  "pr-topograph-432": SIGN.staff,
  "pr-highway-3244": SIGN.slash,
  "pr-triton-kernels-22": SIGN.two,
  "pr-tensorflow-124410": SIGN.point,
  "pr-openxla-46539": SIGN.point,
  "pr-pyrefly-4180": SIGN.point,
  "pr-xnnpack-10801": SIGN.wave,
});

export function signFor(dock) {
  return SEAL_SIGNS[dock] ?? SIGN.wave;
}
