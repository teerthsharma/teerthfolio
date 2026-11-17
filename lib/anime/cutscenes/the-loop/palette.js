// The-loop palette: the measured hex values of issue #39, the same as the pack's C table (the pack keeps its own copy).
export const INK = "#1a0e16";
export const ZEN = "#171018";
export const HOR = "#3f130e";
export const FLOOR = "#1f090d";
export const FISSURE = "#db202b";
export const CRACK = "#de9cd2";
export const MAG_DK = "#af1d6a";
export const MAG = "#d22aa2";
export const MAG_LN = "#e955db";
export const CORE = "#fde7fd";
export const CORE_CAP = "#f6dcf5";
export const CRM_DK = "#ad2032";
export const CRM = "#db202b";
export const CRM_LT = "#ef5064";
export const LENS = "#641520";
export const HI = "#f2e6e7";
export const PLATE = "#a7b83a";
export const CREAM = "#fbf8f2";
export const CARD = "#eeebe5";
export const LINE = "#5b4d4c";
export const LINE_D = "#42322c";
export const BELLY = "#f8eee0";

export const FOREIGN = { violet: [240, 290], cyan: [170, 210] };

export const lin = (hex) =>
  [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
