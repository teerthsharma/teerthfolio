// The v2 seal inside the old rig: turns a rig look spec into method-b data (drawn face, flat hair locks) and rig channels into face uniforms.
import { Color } from "three";

const mix = (a, b, k) => `#${new Color(a).lerp(new Color(b), k).getHexString()}`;
const dk = (a, k) => `#${new Color(a).multiplyScalar(k).getHexString()}`;
const STROKES = [[0.14, -0.01, 0.205, -0.05], [0.15, -0.06, 0.21, -0.095], [0.13, -0.1, 0.19, -0.14], [0.1, -0.13, 0.15, -0.17], [0.06, 0.085, 0.13, 0.11], [0.13, 0.08, 0.185, 0.085], [0.03, 0.135, 0.06, 0.165], [0.16, 0.03, 0.2, 0], [0.16, 0.06, 0.2, 0.09], [0.09, -0.115, 0.12, -0.15]];
const SW = { tsurime: [0.3, 0.2, 1, 1], slit: [0.28, 0.2, 0.85, 1], tareme: [-0.08, 0, 1.12, 1], round: [0.02, 0, 1.45, 0.95], ring: [0.25, 0.2, 1.05, 1], tomoe: [0.2, 0.15, 1.05, 1], blank: [0.2, 0.15, 1, 1] };
const PUPIL = { slit: 0, round: 1, none: 2, ring: 1, tomoe: 1 };

// marks are [u, v] in head-front units; the skull frame has x = u * 0.2, y = v * 0.18
function marks(list) {
  const P = ([u, v]) => [u * 0.2, v * 0.18], out = [];
  for (const m of list ?? []) {
    const a = P(m.at), b = P(m.to ?? m.at), w = m.w ?? 0.01, col = m.col ?? "#1a120c";
    if (m.kind === "dot") out.push({ pts: [a], w0: w, col });
    else if (m.kind === "arc") {
      const nx = -(b[1] - a[1]) * (m.bend ?? 0.3), ny = (b[0] - a[0]) * (m.bend ?? 0.3), pts = [];
      for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push([a[0] + (b[0] - a[0]) * t + nx * 4 * t * (1 - t), a[1] + (b[1] - a[1]) * t + ny * 4 * t * (1 - t)]); }
      out.push({ pts, w0: w, w1: m.w1 ?? w, col });
    } else out.push({ pts: [a, b], w0: w, w1: m.w1 ?? w, col });
  }
  return out;
}

const LONG = (L, s) => [[0.1, 6, -3.1, 3.1, 1, 0.8, 0.05, 0.08, 0.035], [0.4, 12, -3.14, 3.14, 0.5, 1, 0.1, 0.1 * s, 0.036], [0.85, 7, -0.55, 0.55, -0.1, 0.9, 0.8, 0.12 * s, 0.036],
  [1.2, 8, 1.0, 2.3, -1.1, 0.5, 0, L * 0.85, 0.05], [1.2, 8, -2.3, -1.0, -1.1, 0.5, 0, L * 0.85, 0.05], [1.4, 18, 2.2, 4.1, -1.2, 0.45, -0.05, L, 0.052], [0.7, 14, 1.2, 5.1, 0.1, 1, 0, 0.11 * s, 0.036]];
const ROWS = {
  spiky: (s) => [[0.1, 7, -3.1, 3.1, 0.9, 0.9, 0.05, 0.11 * s, 0.03], [0.32, 13, -3.14, 3.14, 0.75, 1, 0.05, 0.15 * s, 0.032], [0.55, 20, -3.14, 3.14, 0.55, 1, 0.05, 0.17 * s, 0.033], [0.76, 20, -1.4, 1.4, 0.4, 1, 0.1, 0.16 * s, 0.032],
    [1.05, 10, 1.25, 2.4, 0.15, 0.75, 0, 0.14 * s, 0.032], [1.05, 10, -2.4, -1.25, 0.15, 0.75, 0, 0.14 * s, 0.032], [1.4, 5, 1.4, 2, -0.2, 0.8, 0, 0.12 * s, 0.03], [1.4, 5, -2, -1.4, -0.2, 0.8, 0, 0.12 * s, 0.03], [1.3, 14, 2.4, 3.9, 0.2, 0.8, -0.1, 0.13 * s, 0.034], [0.65, 16, -3.14, 3.14, 0.9, 0.9, 0, 0.13 * s, 0.03]],
  swept: (s) => [[0.1, 6, -3.1, 3.1, 1, 0.8, 0, 0.08 * s, 0.034], [0.35, 12, -3.14, 3.14, 0.55, 1, 0.1, 0.1 * s, 0.034], [0.6, 16, -3.14, 3.14, 0.3, 1, 0.05, 0.1 * s, 0.034], [0.8, 9, -0.9, 0.9, 0.15, 0.9, 0.7, 0.1 * s, 0.034], [1.3, 16, 1.3, 5, -0.2, 1, -0.05, 0.09 * s, 0.034]],
  long: (s) => LONG(0.3 * s, s), bob: (s) => LONG(0.17 * s, s), mane: (s) => [...LONG(0.36 * s, s), [0.9, 14, 1.0, 5.2, 0.2, 1.5, 0, 0.14 * s, 0.045]],
  ponytail: (s) => [...ROWS.swept(s), [1.0, 7, 2.9, 3.4, -0.3, 0.7, -0.1, 0.34 * s, 0.05]],
};
const KIND = { spiky: "spiky", wedge: "spiky", flame: "spiky", tuft: "spiky", ud: "spiky", mohawk: "spiky", long: "long", mane: "mane", bob: "bob", ponytail: "ponytail", bun: "ponytail", braid: "ponytail", twintail: "long", anos: "long" };

export function hairLook(h) {
  if (!h || h.preset === "none" || h.preset === "bald") return null;
  const col = h.col ?? "#3a2c26", shade = h.shade ?? dk(col, 0.55), hi = h.hi ?? mix(col, "#ffffff", 0.4);
  const L = Array.isArray(h.length) ? (h.length[0] + h.length[1]) / 0.4 : h.length ?? 1, s = h.b?.scale ?? (L === 1 ? 1 : L ** 0.4) * (h.volume ? h.volume ** 0.3 : 1);
  const rows = h.b?.rows ?? (ROWS[KIND[h.preset] ?? h.preset] ?? ROWS.swept)(s);
  return { cap: mix(col, shade, 0.5), capShade: shade, seed: h.seed ?? 3, mix: [0.5, 0.28, 0.22], shadowY: 0.19, shadowZig: 0.012, shadowH: 0.032, rows,
    tones: [{ col, shade }, { col: hi, shade: mix(col, shade, 0.4) }, { col: mix(col, shade, 0.3), shade: dk(shade, 0.8) }] };
}

export function adaptLook(spec) {
  const f = spec.fur, E = spec.eyes, M = spec.mouth, sz = E.size ?? 1, sw = SW[E.style] ?? SW.tsurime, iris = E.iris ?? "#3a2a24";
  const pupil = PUPIL[E.pupil ?? (E.style === "slit" ? "slit" : "round")] ?? 1;
  return {
    fur: { coat: f.coat, shade: f.shade, dark: dk(f.shade, 0.78), light: mix(f.coat, "#ffffff", 0.35), nose: f.nose, ink: f.ink, strokes: spec.marks.length >= 6 ? STROKES : [STROKES[0], STROKES[2], STROKES[9]] },
    eyes: { iris, irisLo: E.iris2 ?? dk(iris, 0.45), hot: mix(iris, "#ffffff", 0.7), sclera: E.sclera ?? "#eee6e2", pupil,
      main: [0.103, 0.04, 0.049 * sz * sw[2] ** 0.3, 0.03 * sz * sw[2]], low: E.count === 4 ? [0.126, -0.016, 0.034 * sz, 0.017 * sz] : [0, 0, 0, 0], tilt: [sw[0], sw[1]] },
    mouth: { gum: M.gum ?? "#1d0b17", tooth: M.tooth ?? "#f3ede4", toothShade: M.toothShade ?? "#b3aac2", tongue: M.tongue ?? "#7a2a44" },
    marks: marks(spec.marks), brows: spec.brows,
    hair: { shadowY: 0.19, shadowZig: 0.012, shadowH: 0.032 },
  };
}

// rig eye names -> drawn-eye state { open, cut (heavy lid), lower, tilt, glow }
const EYEX = {
  calmCut: [0.72, 0.5, 0.15, 0, 1], calm: [0.78, 0.3, 0.1, 0, 1], smirk: [0.68, 0.6, 0.3, -0.04, 1.1], smug: [0.68, 0.6, 0.3, -0.04, 1.1], glare: [0.62, 0.75, 0.4, 0.12, 1.9], menace: [0.56, 0.8, 0.5, 0.16, 2.2],
  eyesLit: [0.82, 0.4, 0.2, 0.05, 3.2], rage: [0.58, 0.78, 0.45, 0.15, 2], terror: [1, 0, 0, 0, 1.2], awe: [1, 0, 0, 0, 1.4], sad: [0.7, 0.35, 0, -0.14, 0.8], shut: [0, 0, 0, 0, 0.2],
};
const MOUTHX = { // name -> [kind, amount, lift, sharp] (amount 0..1 for the toothed kinds; lift in metres at the corners)
  closed: (a) => [0, 0, 0.012 * a - 0.004, 0], w: () => [0, 0, 0, 0], smile: (a) => [0, 0, 0.012 + 0.014 * a, 0], smirk: (a) => [0, 0, 0.004 + 0.024 * a, 0],
  grin: (a) => [1, 0.7 + 0.28 * a, 0.034, 0.75], grit: (a) => [1, 0.5 + 0.45 * a, 0.03, 0.8], open: (a) => [1, 0.15 + 0.85 * a, 0.008, 0.2], snarl: (a) => [1, 0.3 + 0.5 * a, 0.012, 1],
};
const lerp = (a, b, k) => a + (b - a) * k;
export function faceChannelsB(mat, ch, spec) {
  const U = mat.uniforms, x = EYEX[ch.eyes] ?? EYEX.calmCut, k = Math.min(1, ch.eyesAmt ?? 1), n = EYEX.calmCut, a = ch.eyeAdj ?? {};
  const open = lerp(n[0], x[0], k) + (a.open ?? 0), cut = lerp(n[1], x[1], k) + (a.lid ?? 0), blink = Math.min(1, ch.blink ?? 0);
  U.uEyeA.value.set(Math.max(0, open) * (1 - 0.95 * blink), lerp(n[3], x[3], k) + (a.slant ?? 0), Math.min(1, Math.max(0, cut)), lerp(n[2], x[2], k));
  const c = ch.catch, glow = lerp(n[4], x[4], k) + (spec.eyes.glow ?? 0) * 2;
  U.uEyeB.value.set(glow * (c ? c.glow ?? 1 : 1), (ch.look?.[0] ?? 0), (ch.look?.[1] ?? 0), 0);
  U.uIrisHot.value.set(c?.col ?? mat.userData.hot);
  const m = MOUTHX[ch.mouth] ?? MOUTHX.closed, amt = ch.mouthAmt ?? 0, v = m(ch.mouth === "closed" ? amt : Math.max(0, Math.min(1, amt)));
  U.uMouthA.value.set(v[0], v[1], v[2], Math.max(v[3], (spec.mouth.sharp ?? 0.6) * (v[0] ? 1 : 0)));
  const b = ch.brow ?? {}, th = spec.brows?.thick === 0 ? 0 : 1;
  U.uBrow.value.z = 0.6 * (b.angle ?? 0); U.uBrow.value.w = (b.drop ?? 0) * 1.2; U.uFace.value.x = th * Math.min(1, 0.25 + Math.abs(b.angle ?? 0) * 0.8);
}
