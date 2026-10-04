// "DOOOM", hand-cut: harsh jagged lettering in dark ink with an ember edge and cracks running through it, on one
// canvas plane that draws over the scene (depthTest off). Every letter is a hand-placed polygon (shards, no curves).

import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry, SRGBColorSpace } from "three";
import { hash, mat } from "./parts";

// outer outline and (optional) counter, in a 0..1 box, y down
const LETTER = {
  D: { o: [[0, 0.02], [0.6, 0], [0.88, 0.22], [1, 0.55], [0.84, 0.86], [0.55, 1], [0.02, 0.97], [0.1, 0.5]], h: [[0.28, 0.22], [0.5, 0.2], [0.68, 0.4], [0.7, 0.6], [0.58, 0.76], [0.4, 0.78], [0.34, 0.5]] },
  O: { o: [[0.12, 0.04], [0.5, -0.04], [0.82, 0.1], [1, 0.38], [0.94, 0.78], [0.66, 1.03], [0.28, 0.98], [0.02, 0.76], [0.06, 0.32]], h: [[0.32, 0.26], [0.58, 0.22], [0.7, 0.42], [0.66, 0.68], [0.5, 0.8], [0.3, 0.72], [0.3, 0.46]] },
  M: { o: [[0, 1], [0.05, 0.08], [0.2, -0.04], [0.34, 0.3], [0.5, 0.62], [0.66, 0.26], [0.8, -0.06], [0.96, 0.1], [1, 1], [0.8, 0.98], [0.78, 0.4], [0.5, 0.92], [0.22, 0.4], [0.2, 1]] },
};

export function doomLettering(text = "DOOOM") {
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 360;
  const g = c.getContext("2d");
  const n = text.length;
  const W = 232;
  const H = 250;
  const step = (c.width - 80) / n;
  const path = (pts, ox, oy, k, i) => {
    pts.forEach(([x, y], j) => {
      const jx = (hash(i * 31 + j, 1) - 0.5) * 18;
      const jy = (hash(i * 31 + j, 2) - 0.5) * 18;
      const px = ox + x * W * k + jx;
      const py = oy + y * H * k + jy;
      if (j === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    });
    g.closePath();
  };
  g.lineJoin = "miter";
  g.miterLimit = 4;
  for (let pass = 0; pass < 3; pass++) {
    [...text].forEach((ch, i) => {
      const L = LETTER[ch];
      const k = ch === "M" ? 1.05 : 0.86 + 0.16 * hash(i, 5);
      const ox = 40 + i * step + 4;
      const oy = 52 + (1 - k) * 90 + (i % 2 ? 12 : -4);
      g.save();
      g.translate(ox + W / 2, oy + H / 2);
      g.rotate((hash(i, 7) - 0.5) * 0.16);
      g.translate(-ox - W / 2, -oy - H / 2);
      g.beginPath();
      path(L.o, ox, oy, k, i);
      if (L.h) path(L.h, ox + W * 0.02, oy, k, i + 9);
      if (pass === 0) {
        // the ember edge: a hot glow round the whole letter
        g.shadowColor = "#ff5a14";
        g.shadowBlur = 34;
        g.lineWidth = 26;
        g.strokeStyle = "#ff7a22";
        g.stroke();
      } else if (pass === 1) {
        g.shadowBlur = 0;
        g.fillStyle = "#120a0b";
        g.fill("evenodd");
        g.lineWidth = 7;
        g.strokeStyle = "#ffb347";
        g.stroke();
      } else {
        // cracks: thin ember fissures through the ink
        g.clip("evenodd");
        g.strokeStyle = "#ff8a2e";
        g.lineWidth = 4;
        for (let s = 0; s < 3; s++) {
          let x = ox + W * (0.15 + 0.7 * hash(i * 9 + s, 3));
          let y = oy + H * 0.02 * k;
          g.beginPath();
          g.moveTo(x, y);
          for (let t = 0; t < 6; t++) {
            x += (hash(i * 9 + s * 5 + t, 4) - 0.5) * 70;
            y += H * k * 0.17;
            g.lineTo(x, y);
          }
          g.stroke();
        }
      }
      g.restore();
    });
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const m = new Mesh(new PlaneGeometry(1, c.height / c.width), mat({ map: tex, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide }));
  m.renderOrder = 30;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}
