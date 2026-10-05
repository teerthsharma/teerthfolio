// BAND 1000 (W6): the silhouette guest of every "land" card, so the 3 s still holds two voices in the picture:
// the seal and a faceless ink figure with ONE cream prop. Keyed by card id; Guest.jsx stands it in the lens's right third.
// Epsilon and Caustic keep their own staging (hideout, LOW lens); Jotaro, Goku and Gojo are the moves' own meshes.
const G = (build, hair, prop, pose) => ({ build, hair, prop, pose });
export const GUESTS = {
  "p-planimeter": G("tall", "short", "glasses", "crossed"),
  "p-tangle": G("tall", "short", "none", "side"),
  "p-monodromy": G("broad", "swept", "none", "point"),
  "p-resolvent": G("broad", "none", "none", "side"),
  "pr-highway-3244": G("tall", "mane", "none", "point"),
  "pr-mujoco-3396": G("tall", "short", "none", "side"),
  "pr-mujoco-3450": G("tall", "short", "none", "side"),
  "pr-mujoco-warp-1541": G("tall", "short", "none", "side"),
  "pr-polychrom-79": G("tall", "swept", "none", "hip"),
  "pr-pyrefly-4180": G("tall", "spiky", "none", "hip"),
  "pr-topograph-432": G("tall", "none", "staff", "cane"),
  "pr-triton-kernels-22": G("broad", "spiky", "none", "hip"),
  "pr-xnnpack-10801": G("tall", "swept", "glasses", "crossed"),
};
