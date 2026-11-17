// Measured off chat-sukuna-seal.jpg (1280x720; 1019 px per metre once the cheek-to-cheek face width, 265 px, is 0.26 m).
// Origin: chin tip, x right, y up, z toward the viewer. Every figure part reads these.
export const PRO = {
  faceW: 0.264, crownY: 0.27, eyeY: 0.137, eyeX: 0.062, eyeW: 0.056, eyeLowY: 0.106, eyeLowX: 0.083, noseY: 0.086, noseZ: 0.165,
  mouthY: 0.052, mouthHalf: 0.078, collarTop: 0.034, collarHalf: 0.168, shoulderHalf: 0.31, shoulderY: -0.1, wristY: -0.285, wristX: 0.15, handLen: 0.24, handW: 0.098,
};
export const EXPRESSIONS = {
  grin: { open: 0.9, slant: 0.38, cut: 0.3, low: 1, pupil: 0.55, mouth: "grin", gape: 1, browDrop: 0.004 },
  calm: { open: 0.55, slant: 0.14, cut: 0.5, low: 0.6, pupil: 0.7, mouth: "line", gape: 0, browDrop: 0.0 },
  glare: { open: 0.75, slant: 0.5, cut: 0.2, low: 1, pupil: 0.3, mouth: "snarl", gape: 0.45, browDrop: 0.01 },
  shut: { open: 0, slant: 0.2, cut: 0, low: 0, pupil: 0.5, mouth: "line", gape: 0, browDrop: 0.0 },
};
