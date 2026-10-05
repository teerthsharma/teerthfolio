// BAND 1000 (W6): the silhouette guest of every "land" card, so the 3 s still holds two voices in the picture:
// the seal and a cel figure with a face (cast.js); only Aizen stays the faceless ink figure with ONE cream prop. Keyed by card id; Guest.jsx stands it in the lens's right third.
// Epsilon and Caustic keep their own staging (hideout, LOW lens); Jotaro, Goku and Gojo are the moves' own meshes.
// `cast` (lib/world/cutscene/cast.js) makes it a cel figure with a face; Aizen (xnnpack) has none and stays the ink silhouette.
const G = (build, hair, prop, pose, cast) => ({ build, hair, prop, pose, cast });
export const GUESTS = {
  "p-planimeter": G("tall", "short", "glasses", "crossed", "chabashira"),
  "p-tangle": G("tall", "short", "none", "side", "mitsuha"),
  "p-monodromy": G("broad", "swept", "none", "point", "jafar"),
  "p-resolvent": G("broad", "none", "none", "side", "aura"),
  "pr-highway-3244": G("tall", "mane", "none", "point", "iskandar"),
  "pr-mujoco-3396": G("tall", "short", "none", "side", "scout"),
  "pr-mujoco-3450": G("tall", "short", "none", "side", "scout"),
  "pr-mujoco-warp-1541": G("tall", "short", "none", "side", "scout"),
  "pr-polychrom-79": G("tall", "swept", "none", "hip", "gilgamesh"),
  "pr-pyrefly-4180": G("tall", "spiky", "none", "hip", "minato"),
  "pr-topograph-432": G("tall", "none", "staff", "cane", "ainz"),
  "pr-triton-kernels-22": G("broad", "spiky", "none", "hip", "sukuna"),
  "pr-xnnpack-10801": G("tall", "swept", "glasses", "crossed"),
};
