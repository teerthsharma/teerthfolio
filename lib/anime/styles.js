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
  fill: { t: 0.5, soft: 0, bias: 1, lumaMax: 0.92, tone: 0, toneScale: 6, toneAmt: 0, flat: 0, mono: 0, sat: 1, rim: 0.6, ring: 1,
    tones: 2, core: 0.25, shTint: "#ffffff", shTintAmt: 0, shVal: 1, hi: 0, hiSize: 0.1 },
  // the seal's face within its locked design: 0 kawaii, 1 MAPPA, 2 Madhouse, 3 Kubo ink
  face: { kind: 0, hatch: 0, lid: 0, hiScale: 1, iris: 0, irisCol: "#7a4a2c", eyeScale: 1 },
  lines: { px: 2, dist: 1, ink: "#000000", inkMix: 0, on: 1, set: 0.85, setW: 1, setMix: 0, setCol: "#000000", setDepth: 1, charLines: 0, taper: 0, rough: 0 },
  post: { bloom: 1, diffuse: 0.2, shafts: 0, shaftCol: "#ffe2b0", gain: [1, 1, 1], gamma: [1, 1, 1], sat: 1, split: [0, 0, 0], poster: 0, palette: [], palMix: 0, paper: "#ffffff", paperAmt: 0, paperKind: 0, paperTex: 0, bleed: 0, misreg: 0, grain: 0.02, vig: 0.22, mono: 0,
    // plate (background) treatment, painted once per shot: Kuwahara radius, saturation, posterise, haze
    kuwa: 0, bgSat: 1, bgPoster: 0, haze: "#ffffff", hazeAmt: 0, hazeNear: 3, hazeFar: 30,
    ink: [0, 0.07, 0.3, 0.4], box: 0, ca: 0, dof: 1,
    ramp: null, rampAmt: 0, burst: 0, burstFrom: 4, rays: 28, burstA: "#1b5fd8", burstB: "#7fc4ff", flowers: 0, fil: 0, filScale: 3, filCol: [4, 0.15, 0.2], halo: 0, haloR: 10, haloCol: "#ffffff" },
  timing: { fps: 12, squash: 0 },
};
const mk = (id, name, homage, o) => ({
  id, name, homage, anime: o.anime ?? null,
  fill: { ...base.fill, ...o.fill }, face: { ...base.face, ...o.face }, lines: { ...base.lines, ...o.lines }, post: { ...base.post, ...o.post }, timing: { ...base.timing, ...o.timing },
  impact: o.impact ?? ["#ffffff", "#0b0f2a"],
});

export const STYLES = [
  mk("modern-anime", "Base: kawaii painted", "TV anime at Ufotable / MAPPA grade: authored saturated shadows, coloured line art, diffusion glow, light shafts, on twos.", {
    fill: { sat: 1.06 },
    lines: { px: 2, dist: 1, set: 0.8 },
    post: { bloom: 0.55, diffuse: 0.15, shafts: 0.5, sat: 1.08, split: [-0.02, -0.01, 0.05], grain: 0.022, vig: 0.24 },
    timing: { fps: 12 },
  }),
  mk("western-cartoon", "Saturday-morning cartoon", "Western TV cartoon: thick uniform black lines, flat fills, squash and stretch, rubber-hose motion.", {
    fill: { flat: 0.82, bias: 0.3, sat: 1.25, rim: 0, ring: 0.4, lumaMax: 0.95 },
    lines: { px: 4.2, dist: 0, ink: "#000000", inkMix: 1, set: 1, setW: 1.6, setMix: 1, charLines: 1, setDepth: 1.4 },
    post: { bloom: 0.5, diffuse: 0, sat: 1.15, grain: 0, vig: 0 },
    timing: { fps: 12, squash: 1 },
    impact: ["#fff6c0", "#000000"],
  }),
  // Target: the owner's bleach.jpg (Pierrot key art). Sampled: burst blues #076cb2 / #8fc7e8, black
  // robes #222931, skin #deaf9f; clean even black line, hard two-tone cel, white glow behind the cast.
  mk("bleach-ink", "Bleach (Pierrot, Kubo ink)", "Pierrot's Bleach key art: clean even black line, hard two-tone cel with cool blue-violet shadows and a hard highlight, Kubo's solid black eyes, a blue starburst background with a white poster glow behind the figure, on threes.", {
    anime: "Bleach",
    fill: { t: 0.5, soft: 0, bias: 1, sat: 1.1, rim: 0, ring: 0.5, shTint: "#4a5a8c", shTintAmt: 0.5, shVal: 0.78, hi: 1, hiSize: 0.04 },
    face: { kind: 3, lid: 0.35, hiScale: 1 },
    lines: { px: 2.3, dist: 1, ink: "#111318", inkMix: 1, set: 0.9, setW: 1.1, setMix: 1, setCol: "#111318", charLines: 1, taper: 0.5 },
    post: { bloom: 0.3, diffuse: 0.1, sat: 1.1, grain: 0, vig: 0.15, dof: 0.3,
      burst: 1, burstFrom: 3.2, rays: 36, burstA: "#0a5fb8", burstB: "#8fc7e8", halo: 0.95, haloR: 14 },
    timing: { fps: 8 },
    impact: ["#ffffff", "#0a5fb8"],
  }),
  // Targets: the owner's sukuna.jpg (manga colour: red key #ff7073, cyan shadow #15415e, black ink,
  // hatching), IMG_0428 (crimson storm sky #610816 over black) and the Gojo frame (red filaments).
  mk("mappa-jjk", "Jujutsu Kaisen (MAPPA)", "MAPPA's JJK: heavy tapered black ink, a crimson key with cyan-teal shadows and hatching, a core shadow, MAPPA's heavy lid line and hatched eye bags, a crimson-and-black cursed world with glowing red filaments, aberration and grain, on threes.", {
    anime: "Jujutsu Kaisen",
    fill: { t: 0.52, soft: 0, bias: 1.2, lumaMax: 0.9, sat: 1.05, rim: 0.9, ring: 0.4, tones: 3, core: 0.32, shTint: "#1f5a7a", shTintAmt: 0.85, shVal: 0.75, litTint: "#ffb3aa", tone: 4, toneScale: 5, toneAmt: 0.55 },
    face: { kind: 1, hatch: 0.6, lid: 0.5, hiScale: 0.7 },
    lines: { px: 3, dist: 1, ink: "#0a0507", inkMix: 1, set: 0.9, setW: 1.1, setMix: 1, setCol: "#0a0507", charLines: 1, taper: 1 },
    post: { bloom: 0.9, diffuse: 0.1, sat: 1.05, grain: 0.06, vig: 0.6, ca: 1.3, dof: 1.8,
      ramp: ["#0b0508", "#7a0f1c", "#ff6a6a"], rampAmt: 0.9, fil: 0.85, filScale: 2.5, filCol: [6, 0.08, 0.12] },
    timing: { fps: 8 },
    impact: ["#ff6a6a", "#0b0508"],
  }),
  // Target: the owner's fierien.jpg (clover field at noon). Sampled: clover #375829, skin lit #faf0e7,
  // shadow #f1d6cf..#eed2cf (value x0.9, cool), thin dark line, white clover heads, Frieren's green eyes.
  mk("frieren", "Frieren (Madhouse)", "Madhouse's Frieren: thin dark line, two clean high-value tones with cool lavender shadows, layered green irises and a soft sheen, a Kuwahara-painted clover field dotted with white flowers, soft bloom, on twos.", {
    anime: "Frieren",
    fill: { t: 0.47, soft: 0.03, bias: 0.7, lumaMax: 0.92, sat: 1.05, rim: 0.4, ring: 0.6, shTint: "#8c86b0", shTintAmt: 0.5, shVal: 0.9, hi: 2, hiSize: 0.05, litTint: "#fff8f0" },
    face: { kind: 2, lid: 0.16, hiScale: 0.9, iris: 1, irisCol: "#5fae7e", eyeScale: 1.04 },
    lines: { px: 1.3, dist: 1, ink: "#3a2a2c", inkMix: 0.9, set: 0.5, setW: 1, setMix: 1, setCol: "#2f3a24", taper: 0.4 },
    post: { bloom: 0.5, diffuse: 0.45, sat: 1.06, gain: [1.0, 1.02, 0.98], grain: 0.015, vig: 0.15,
      kuwa: 3, flowers: 1, bgSat: 1.15, haze: "#e8f2e0", hazeAmt: 0.3, hazeNear: 3, hazeFar: 14, dof: 1 },
    timing: { fps: 12 },
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
  const fc = style.face ?? base.face;
  shared.uS3.value.set(f.tones ?? 2, f.core ?? 0.25, f.shTintAmt ?? 0, f.shVal ?? 1); shared.uShTint.value.set(f.shTint ?? "#ffffff");
  shared.uS4.value.set(f.hi ?? 0, f.hiSize ?? 0.1, fc.kind, fc.hatch);
  shared.uFaceS.value.set(fc.lid, fc.hiScale, fc.iris, fc.eyeScale); shared.uIris.value.set(fc.irisCol);
  shared.uLine2.value.set(l.taper ?? 0, l.rough ?? 0, 0, 0);
  shared.uLitTint.value.set(f.litTint ?? "#ffffff");
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
  composer.pu.uBg.value.set(p.kuwa ?? 0, p.bgSat ?? 1, p.bgPoster ?? 0, 0);
  composer.pu.uHaze.value.set(p.haze ?? "#ffffff"); composer.pu.uHazeR.value.set(p.hazeAmt ?? 0, p.hazeNear ?? 3, p.hazeFar ?? 30, 0);
  u.uInkT.value.set(...(p.ink ?? [0, 0, 0, 0])); u.uBox.value = p.box ?? 0;
  const pu = composer.pu, P = { ...base.post, ...p };
  if (P.ramp) P.ramp.forEach((h, i) => pu.uRamp.value[i].set(h));
  pu.uRampAmt.value = P.ramp ? P.rampAmt : 0;
  pu.uBurst.value.set(P.burst, P.burstFrom, P.rays, 0); pu.uBurstA.value.set(P.burstA); pu.uBurstB.value.set(P.burstB);
  pu.uFlower.value = P.flowers; pu.uFil.value.set(P.fil, P.filScale, 0, 0); pu.uFilCol.value.setRGB(...P.filCol);
  composer.mComp.uniforms.uHalo.value.set(P.halo, P.haloR, 0, 0); composer.mComp.uniforms.uHaloCol.value.set(P.haloCol);
  u.uMisreg.value = p.misreg; u.uGrain.value = p.grain; u.uVig.value = p.vig; u.uMono.value = p.mono;
  // impact colours apply after the sRGB encode, so store them encoded
  u.uImpA.value.set(style.impact[0]).convertLinearToSRGB(); u.uImpB.value.set(style.impact[1]).convertLinearToSRGB();
}
