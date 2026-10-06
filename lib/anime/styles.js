// THE STYLE SYSTEM. A style is a named recipe of
//   lines   (hull px, distance-aware, ink colour, set lines, interior lines),
//   fill    (band threshold/softness, Xrd bias strength, flatness, tone pattern),
//   palette (saturation, grading, split tone, swatch palette, posterise),
//   texture (paper / plaster / woodgrain, bleed, misregistration, grain),
//   timing  (character steps per second, squash-and-stretch amount),
// applied by uniform writes only (applyStyle), so any scene switches to any
// style in one frame with no shader compile. `name` is what the owner says.
import { Color } from "three";

const C = (h) => new Color(h);
const base = {
  fill: { t: 0.5, soft: 0, bias: 1, lumaMax: 0.92, tone: 0, toneScale: 6, toneAmt: 0, flat: 0, mono: 0, sat: 1, rim: 0.6, ring: 1 },
  lines: { px: 2, dist: 1, ink: "#000000", inkMix: 0, on: 1, set: 0.85, setW: 1, setMix: 0, setCol: "#000000", setDepth: 1, charLines: 0 },
  post: { bloom: 1, diffuse: 0.2, shafts: 0, shaftCol: "#ffe2b0", gain: [1, 1, 1], gamma: [1, 1, 1], sat: 1, split: [0, 0, 0], poster: 0, palette: [], palMix: 0, paper: "#ffffff", paperAmt: 0, paperKind: 0, paperTex: 0, bleed: 0, misreg: 0, grain: 0.02, vig: 0.22, mono: 0 },
  timing: { fps: 12, squash: 0 },
};
const mk = (id, name, homage, o) => ({
  id, name, homage,
  fill: { ...base.fill, ...o.fill }, lines: { ...base.lines, ...o.lines }, post: { ...base.post, ...o.post }, timing: { ...base.timing, ...o.timing },
  impact: o.impact ?? ["#ffffff", "#0b0f2a"],
});

export const STYLES = [
  mk("modern-anime", "Modern anime", "TV anime at Ufotable / MAPPA grade: authored saturated shadows, coloured line art, diffusion glow, light shafts, on twos.", {
    fill: { sat: 1.06 },
    lines: { px: 2, dist: 1, set: 0.8 },
    post: { bloom: 1, diffuse: 0.28, shafts: 1, sat: 1.08, split: [-0.02, -0.01, 0.05], grain: 0.022, vig: 0.24 },
    timing: { fps: 12 },
  }),
  mk("western-cartoon", "Saturday-morning cartoon", "Western TV cartoon: thick uniform black lines, flat fills, squash and stretch, rubber-hose motion.", {
    fill: { flat: 0.82, bias: 0.3, sat: 1.25, rim: 0, ring: 0.4, lumaMax: 0.95 },
    lines: { px: 4.2, dist: 0, ink: "#000000", inkMix: 1, set: 1, setW: 1.6, setMix: 1, charLines: 1, setDepth: 1.4 },
    post: { bloom: 0.5, diffuse: 0, sat: 1.15, grain: 0, vig: 0 },
    timing: { fps: 12, squash: 1 },
    impact: ["#fff6c0", "#000000"],
  }),
  mk("bleach-ink", "Bleach manga ink", "Tite Kubo black-and-white line art: solid blacks, white paper, screentone shadows, crisp black line.", {
    fill: { tone: 2, toneScale: 5, toneAmt: 1, mono: 1, rim: 0, ring: 0 },
    lines: { px: 2.4, dist: 1, ink: "#050505", inkMix: 1, set: 1, setW: 1.2, setMix: 1, setCol: "#050505", charLines: 1 },
    post: { bloom: 0.2, diffuse: 0, sat: 0, palette: ["#f4f1ea", "#050505"], palMix: 1, grain: 0, vig: 0 },
    timing: { fps: 8 },
    impact: ["#ffffff", "#000000"],
  }),
  mk("renaissance-fresco", "Renaissance fresco", "Sistine-chapel fresco: earth pigments on plaster, soft sfumato modelling, sepia underdrawing, craquelure, god-rays.", {
    fill: { t: 0.48, soft: 0.16, bias: 0.8, lumaMax: 0.86, sat: 0.8, rim: 0.2, ring: 0.3 },
    lines: { px: 1.3, dist: 1, ink: "#5a3b22", inkMix: 1, set: 0.45, setMix: 1, setCol: "#5a3b22" },
    post: { bloom: 0.3, diffuse: 0.35, shafts: 1, shaftCol: "#f3d7a0", gain: [1.03, 0.98, 0.88], sat: 0.85, palette: ["#2f4f8f", "#7f9cc4", "#c99a4a", "#a0522d", "#4b3621", "#5f8f7a", "#efe6d2", "#b8492f"], palMix: 0.5, paper: "#efe4cf", paperAmt: 1, paperKind: 2, paperTex: 0.6, grain: 0.03, vig: 0.45 },
    timing: { fps: 12 },
    impact: ["#efe4cf", "#4b3621"],
  }),
  mk("spider-verse-comic", "Spider-Verse comic", "Into the Spider-Verse: Ben-Day dot shadows, print misregistration, bold black line, stepped frame rate.", {
    fill: { tone: 1, toneScale: 7, toneAmt: 1, sat: 1.25, rim: 0.4 },
    lines: { px: 2.6, dist: 0.5, ink: "#0a0a12", inkMix: 1, set: 1, setW: 1.3, setMix: 1, setCol: "#0a0a12", charLines: 1 },
    post: { bloom: 0.8, diffuse: 0.05, sat: 1.25, misreg: 1.8, grain: 0.0, vig: 0.1 },
    timing: { fps: 8 },
    impact: ["#ff2d6f", "#141030"],
  }),
  mk("ukiyo-e", "Ukiyo-e woodblock", "Hokusai woodblock print: Prussian blue and sumi key block, flat fills, limited inks on wood-grain paper.", {
    fill: { flat: 0.65, bias: 0.6, sat: 0.85, rim: 0, ring: 0.2 },
    lines: { px: 1.8, dist: 1, ink: "#1b1a1a", inkMix: 1, set: 1, setMix: 1, setCol: "#1b1a1a", charLines: 1 },
    post: { bloom: 0, diffuse: 0, sat: 0.9, palette: ["#1f3a68", "#2b2f4a", "#9bb7c9", "#efe3c6", "#c8492c", "#c79a4b", "#1b1a1a", "#4d6b4a"], palMix: 0.85, paper: "#eadcbc", paperAmt: 1, paperKind: 3, paperTex: 0.5, grain: 0.015, vig: 0.15 },
    timing: { fps: 8 },
    impact: ["#efe3c6", "#1f3a68"],
  }),
  mk("watercolour", "Watercolour (Frieren)", "Madhouse's Frieren: transparent washes on cold-press paper, pooled pigment edges, soft glow, thin coloured line.", {
    fill: { t: 0.5, soft: 0.1, bias: 0.8, tone: 3, toneAmt: 1, sat: 0.82, lumaMax: 0.9, rim: 0.3, ring: 0.6 },
    lines: { px: 1.2, dist: 1, set: 0.6, setW: 1.4 },
    post: { bloom: 0.5, diffuse: 0.45, shafts: 0.6, sat: 0.85, gamma: [1.06, 1.06, 1.04], paper: "#f6f1e6", paperAmt: 1, paperKind: 1, paperTex: 0.7, bleed: 3, grain: 0.012, vig: 0.1 },
    timing: { fps: 12 },
  }),
  mk("cel-90s", "90s cel anime", "Evangelion-era cel: hard two-tone on painted cels, warm film stock, gate weave, heavy grain, on threes.", {
    fill: { t: 0.53, bias: 1, lumaMax: 0.85, sat: 0.9, rim: 0.2, ring: 0.5 },
    lines: { px: 1.6, dist: 1, set: 0.7 },
    post: { bloom: 0.6, diffuse: 0.12, gain: [1.03, 0.99, 0.9], sat: 0.9, split: [0.03, 0.0, -0.02], misreg: 0.5, grain: 0.07, vig: 0.38 },
    timing: { fps: 8 },
  }),
];
export const styleById = (id) => STYLES.find((s) => s.id === id) ?? STYLES[0];

// shared = material.sharedUniforms(); composer = post.Composer
export function applyStyle(style, shared, composer) {
  const f = style.fill, l = style.lines, p = style.post;
  shared.uS0.value.set(f.t, f.soft, f.bias, f.lumaMax);
  shared.uS1.value.set(f.tone, f.toneScale, f.toneAmt, f.flat);
  shared.uS2.value.set(f.mono, f.sat, f.rim, f.ring);
  shared.uInk.value.set(l.ink);
  shared.uLine.value.set(l.px, l.dist, l.inkMix, l.on);
  shared.uPaper.value.set(p.palette[0] ?? p.paper);
  const u = composer.u;
  u.uSet.value.set(l.set, l.setW, l.setMix, l.setDepth);
  u.uSetCol.value.set(l.setCol);
  u.uCharLines.value = l.charLines;
  u.uBloom.value = p.bloom; u.uDiffuse.value = p.diffuse; u.uShaft.value = p.shafts; u.uShaftCol.value.set(p.shaftCol);
  u.uGain.value.setRGB(...p.gain); u.uGamma.value.setRGB(...p.gamma); u.uSat.value = p.sat; u.uSplit.value.setRGB(...p.split); u.uPoster.value = p.poster;
  u.uPalN.value = p.palette.length; u.uPalMix.value = p.palMix;
  p.palette.forEach((h, i) => u.uPal.value[i].set(h));
  u.uPaperCol.value.set(p.paper); u.uPaper.value.set(p.paperAmt, p.paperKind, p.paperTex, p.bleed);
  u.uMisreg.value = p.misreg; u.uGrain.value = p.grain; u.uVig.value = p.vig; u.uMono.value = p.mono;
  // impact colours apply after the sRGB encode, so store them encoded
  u.uImpA.value.set(style.impact[0]).convertLinearToSRGB(); u.uImpB.value.set(style.impact[1]).convertLinearToSRGB();
}
