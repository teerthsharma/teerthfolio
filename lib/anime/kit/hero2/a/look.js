// LOOK DATA for hero2/a. The neutral seal (form, skin, mouth, hands) never changes; a look only overrides colours,
// eyes, hair tones, face marks and the outfit. Marks are strokes in head-front metres: x across, y up from the nose.
// Other characters: `fromRigLook(spec)` maps a kit/hero/looks/*.js spec onto this schema (colours, eye colour and count,
// hair colours, marks, outfit colours); only a new hair silhouette or a new outfit shape needs authoring.
import { Color } from "three";

const rim = (h, k) => "#" + new Color(h).multiplyScalar(k).getHexString();

export const NEUTRAL = {
  skin: { coat: "#a7a2ad", shade: "#605874", muzzle: "#e0dae0", muzzleShade: "#9a93a8", nose: "#3a2e36", ink: "#271d28" },
  mouth: { gum: "#9a3548", cavity: "#210a12", tooth: "#f2ece0", toothShade: "#a99fbd" },
  eyes: { style: "tsurime", count: 4, iris: "#ff3434", iris2: "#a0101c", lash: "#1d1620", sclera: "#f2e6e0" },
  marks: [],
  hair: null,
  outfit: { cloth: "#2c2350", shade: "#0f0a1f", trim: "#c8a640", cuff: "#16111f", collar: { rise: 1, flare: 1 }, button: true },
  hands: { skin: "#cdbaa8", shade: "#8b7480" },
};

export const SUKUNA = {
  ...NEUTRAL,
  skin: { ...NEUTRAL.skin, coat: "#928d9d", shade: "#665c7a", muzzle: "#d4ced6", muzzleShade: "#8f879f" },
  eyes: { style: "tsurime", count: 4, iris: "#ff3a3a", iris2: "#b00e1c", lash: "#1d1018", sclera: "#f4e4dc" },
  hair: { tones: ["#e3a2b5", "#c97f98", "#8f4d68"], base: "#a85a75", seed: 7, count: 120, length: 1 },
  marks: [
    { pts: [[0, 0.09], [0, 0.114], [0, 0.136]], w0: 0.009, w1: 0.003, col: "#241a24" },
    { pts: [[0.004, 0.094], [0.02, 0.104], [0.034, 0.124]], w0: 0.007, w1: 0.002, col: "#241a24" },
    { pts: [[-0.004, 0.094], [-0.02, 0.104], [-0.034, 0.124]], w0: 0.007, w1: 0.002, col: "#241a24" },
    { pts: [[0.1, 0.0], [0.112, -0.022], [0.118, -0.055]], w0: 0.007, w1: 0.002, col: "#241a24" },
    { pts: [[-0.1, 0.0], [-0.112, -0.022], [-0.118, -0.055]], w0: 0.007, w1: 0.002, col: "#241a24" },
    { pts: [[0.086, -0.004], [0.098, -0.03], [0.103, -0.062]], w0: 0.005, w1: 0.0015, col: "#241a24" },
    { pts: [[-0.086, -0.004], [-0.098, -0.03], [-0.103, -0.062]], w0: 0.005, w1: 0.0015, col: "#241a24" },
  ],
  outfit: { ...NEUTRAL.outfit, cloth: "#31275a", shade: "#1a1233" },
  hands: { skin: "#c2b3aa", shade: "#7f6f7e" },
};

// kit/hero/looks spec -> hero2 look. Everything not present falls back to the neutral seal.
export function fromRigLook(s = {}) {
  const f = s.fur ?? {}, e = s.eyes ?? {}, o = (s.outfit ?? [])[0] ?? {};
  const toMark = (m) => ({ pts: [[m.at[0] * 0.15, 0.05 + m.at[1] * 0.12], [m.to?.[0] * 0.15 ?? 0, 0.05 + (m.to?.[1] ?? 0) * 0.12]], w0: m.w ?? 0.008, w1: m.w1 ?? 0.003, col: m.col ?? "#241a24" });
  return {
    ...NEUTRAL,
    skin: { ...NEUTRAL.skin, coat: f.coat ?? NEUTRAL.skin.coat, shade: f.shade ?? NEUTRAL.skin.shade, ink: f.ink ?? NEUTRAL.skin.ink },
    eyes: { ...NEUTRAL.eyes, style: e.style ?? "round", count: e.count ?? 2, iris: e.iris ?? "#5a3a2a", iris2: e.iris2 ?? rim(e.iris ?? "#5a3a2a", 0.5) },
    hair: s.hair ? { tones: [s.hair.hi ?? s.hair.col, s.hair.col, s.hair.shade ?? rim(s.hair.col, 0.6)], base: s.hair.shade ?? s.hair.col, seed: s.hair.seed ?? 1, count: 70, length: s.hair.length ?? 1 } : null,
    marks: (s.marks ?? []).filter((m) => m.at).map(toMark),
    outfit: { ...NEUTRAL.outfit, cloth: o.col ?? NEUTRAL.outfit.cloth, shade: o.shade ?? NEUTRAL.outfit.shade, trim: o.trim ?? NEUTRAL.outfit.trim },
    hands: { skin: s.hands?.skin ?? NEUTRAL.hands.skin, shade: rim(s.hands?.skin ?? NEUTRAL.hands.skin, 0.62) },
  };
}
export const EXPR = {
  grin: { open: 1, smile: 1, brow: 0.55, eyes: "menace", eyesAmt: 1, glow: 0.9 },
  calm: { open: 0, smile: 0, brow: 0.15, eyes: "calmCut", eyesAmt: 1, glow: 0.5 },
  glare: { open: 0.35, smile: 0.2, brow: 1, eyes: "glare", eyesAmt: 1, glow: 1.2 },
  shut: { open: 0, smile: 0.1, brow: 0, eyes: "shut", eyesAmt: 1, glow: 0 },
};
