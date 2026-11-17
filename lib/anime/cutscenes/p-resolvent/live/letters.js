// Ported from components/world/cutscene/moves/p-caustic/parts.js: the lettering canvas with no mesh; its notes live with the original.

import { CanvasTexture, SRGBColorSpace } from "three";

export function letteringCanvas(text, color = "#e0559b", tilt = -0.08) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 320;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    g.translate(c.width / 2, c.height / 2);
    g.rotate(tilt);
    let px = 220;
    g.font = `800 ${px}px ${fam}`;
    while (g.measureText(text).width > c.width * 0.9 && px > 60) g.font = `800 ${(px -= 10)}px ${fam}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.fillStyle = "#22d3ee";
    g.globalAlpha = 0.85;
    g.fillText(text, -px * 0.045, px * 0.03);
    g.globalAlpha = 1;
    g.lineWidth = px * 0.14;
    g.strokeStyle = "#fbfaf7";
    g.strokeText(text, 0, 0);
    g.fillStyle = color;
    g.fillText(text, 0, 0);
    g.restore();
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`800 100px ${getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim()}`).then(draw, () => {});
  return { canvas: c, texture: tex, draw };
}
