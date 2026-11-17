// The gold magic circle, ported verbatim from the live moves/pr-topograph-432/fx.js (circleTexture); ringTexture feeds the expanding hit rings.
import { CanvasTexture, SRGBColorSpace } from "three";

const made = [];
const track = (t) => (made.push(t), t);

export function circleTexture(gold) {
  const N = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  const m = N / 2;
  const main = gold ? "#ffd35a" : "#b46bff";
  const alt = gold ? "#fff0b0" : "#ffd35a";
  g.translate(m, m);
  g.lineCap = "round";
  const ring = (r, w, col) => {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
  };
  ring(480, 10, main);
  ring(455, 3, alt);
  ring(380, 8, main);
  ring(300, 4, alt);
  ring(150, 8, main);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.save();
    g.rotate(a);
    g.strokeStyle = alt;
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(0, -380);
    g.lineTo(0, -455);
    g.stroke();
    g.fillStyle = main;
    for (let k = 0; k < 3; k++) g.fillRect(-4 + (k - 1) * 14, -440 + k * 6, 6, 40 - k * 8);
    g.restore();
  }
  const poly = (n, r, rot, col, w) => {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      g[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
    }
    g.stroke();
  };
  poly(3, 380, -Math.PI / 2, main, 8);
  poly(3, 380, Math.PI / 2, main, 8);
  poly(4, 300, Math.PI / 4, alt, 5);
  poly(7, 230, -Math.PI / 2, main, 5);
  poly(7, 150, -Math.PI / 2, alt, 3);
  g.fillStyle = alt;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.fillRect(Math.cos(a) * 340 - 4, Math.sin(a) * 340 - 10, 8, 20);
  }
  g.beginPath();
  g.arc(0, 0, 26, 0, Math.PI * 2);
  g.fill();
  const t = track(new CanvasTexture(c));
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function ringTexture(n = 1) {
  const N = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d");
  g.translate(N / 2, N / 2);
  for (let i = 0; i < n; i++) {
    g.strokeStyle = i ? "#fff0b0" : "#f0b429";
    g.lineWidth = i ? 8 : 10;
    g.beginPath();
    g.arc(0, 0, 480 - 70 * i, 0, Math.PI * 2);
    g.stroke();
  }
  const t = track(new CanvasTexture(c));
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function disposeCircle() {
  for (const t of made.splice(0)) t.dispose();
}
