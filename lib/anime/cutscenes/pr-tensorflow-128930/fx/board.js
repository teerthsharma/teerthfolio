// BOARD for pr-tensorflow-128930: the ranked-row board as a canvas texture, redrawn once per drawing. Written new (the table's gzRankBoard has no legible digits).
// Row y = mix(y(rank_old), y(rank_new), e), e = 1 - (1 - n/9)^3; alpha = smoothstep(K, K - 0.5, rank), the padding row x 0.35 and dashed; the tie inset runs f86 to f93.
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

const W = 420, H = 900, INK = "#e8eef4", AMBER = "#ffb24a", SCREEN = "#0e1620", ROW = "#1c2a3a";
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const FONT = "'Noto Sans','Segoe UI','Arial Narrow',Arial,sans-serif";

// the three rows' rank and alpha at drawing f: A (candidate 0, -2), B (candidate 1, -3), P (padding, -1.0)
export function state(f) {
  const n = clamp(Math.floor((f - 78) / 2) + 1, 0, 9), e = 1 - (1 - n / 9) ** 3, K = 2;
  let A = 0, B = 1, P = 2, show = true;
  if (f < 54) { P = 3; } else if (f < 78) { P = 0; A = 1; B = 1 + clamp((f - 54) / 3); } else { P = 2 * e; A = 1 - e; B = 2 - e; }
  const al = (r, k = 1) => smoothstep(K, K - 0.5, r) * k;
  return { f, A, B, P, aA: al(A), aB: al(B), aP: al(P, 0.35), fill: f >= 30 && f < 42, stamp: f >= 70, flash: f === 70 || f === 71, show };
}
const smoothstep = (a, b, x) => sstep(a, b, x);

export function makeBoard() {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace; tex.minFilter = tex.magFilter = LinearFilter; tex.generateMipmaps = false;
  let key = "";
  const rowY = (r) => 190 + r * 150;
  const row = (r, label, score, a, dashed, stamp) => {
    if (a <= 0.01) return;
    const y = rowY(r);
    g.globalAlpha = a;
    g.fillStyle = ROW; g.fillRect(24, y, W - 48, 118);
    if (dashed) { g.strokeStyle = INK; g.lineWidth = 3; g.setLineDash([16, 16]); g.strokeRect(24, y, W - 48, 118); g.setLineDash([]); }
    g.fillStyle = INK; g.textBaseline = "middle";
    g.font = `600 34px ${FONT}`; g.textAlign = "left"; g.fillText(label, 44, y + 59);
    g.font = `700 64px ${FONT}`; g.textAlign = "right"; g.fillText(score, W - 44, y + 62);
    if (stamp) { g.strokeStyle = AMBER; g.lineWidth = 7; g.strokeRect(14, y - 10, W - 28, 138); }
  };
  const inset = (f) => {
    const a = 1;
    const cls = f >= 90, swap = cls ? f >= 92 : f >= 88, top = cls ? (swap ? "c0" : "c2") : swap ? "i4" : "i7", bot = cls ? (swap ? "c2" : "c0") : swap ? "i7" : "i4";
    g.globalAlpha = a; g.fillStyle = "#14202e"; g.fillRect(24, 560, W - 48, 300);
    g.fillStyle = INK; g.font = `600 40px ${FONT}`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(cls ? "CLASS" : "INDEX", 44, 596);
    [top, bot].forEach((t, i) => { g.fillStyle = ROW; g.fillRect(40, 630 + i * 100, W - 80, 84); g.fillStyle = INK; g.font = `700 58px ${FONT}`; g.textAlign = "right"; g.fillText(`-3 ${t}`, W - 60, 674 + i * 100); });
    g.globalAlpha = 1;
  };
  return {
    tex,
    draw(f) {
      const s = state(f), tie = f >= 86 && f <= 93, k =`${s.fill ? f : 0}|${s.A.toFixed(2)}|${s.B.toFixed(2)}|${s.P.toFixed(2)}|${s.stamp}|${s.flash}|${tie ? f : 0}`;
      if (k === key) return;
      key = k;
      g.globalAlpha = 1; g.fillStyle = SCREEN; g.fillRect(0, 0, W, H);
      g.strokeStyle = "#2a3644"; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);
      g.fillStyle = INK; g.font = `700 70px ${FONT}`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("SCORE", 32, 80);
      g.fillRect(32, 128, W - 64, 5);
      if (s.fill) {
        const ticks = Math.min(6, f - 29);
        for (let r = 0; r < 2; r++) {
          const y = rowY(r); g.fillStyle = ROW; g.fillRect(24, y, W - 48, 118); g.fillStyle = INK; g.font = `600 34px ${FONT}`; g.textAlign = "left"; g.fillText("CONTACT", 44, y + 59);
          for (let i = 0; i < ticks; i++) g.fillRect(W - 44 - 150 + i * 26, y + 40, 16, 38);
        }
      } else if (f >= 42) {
        row(s.A, "CONTACT", "-2", s.aA, false, false);
        row(s.B, "CONTACT", "-3", s.aB, false, false);
        row(s.P, "CONTACT", "-1.0", s.aP, true, s.stamp);
        if (s.flash) { g.globalAlpha = 0.5; g.fillStyle = AMBER; g.fillRect(24, rowY(s.P), W - 48, 118); g.globalAlpha = 1; }
      }
      if (tie) inset(f);
      g.globalAlpha = 1;
      tex.needsUpdate = true;
    },
    dispose() { tex.dispose(); },
  };
}
