// WORD for pr-polychrom-79: the spoken "Enuma Elish!" as the live lettering (crimson fill, cream outline 0.14 em, cyan shadow at 0.85),
// a canvas texture on an NDC quad that placeWord places in the upper third, away from the seal's box; the shadow sits outside the outline.
import { CanvasTexture, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, Vector4 } from "three";
import { T } from "../clock.js";
import { PAL } from "../pal.js";

const W = 1024, H = 320;
const comicFamily = () => (getComputedStyle(document.documentElement).getPropertyValue("--font-comic").split(",")[0] || "Shantell Sans").trim().replace(/^["']|["']$/g, "");

function paint(c, tex, text) {
  const g = c.getContext("2d"), fam = comicFamily();
  let px = 200;
  g.clearRect(0, 0, W, H);
  g.save();
  g.translate(W / 2, H / 2); g.rotate(-0.05);
  g.font = `800 ${px}px "${fam}", sans-serif`;
  while (g.measureText(text).width > W * 0.92 && px > 60) g.font = `800 ${(px -= 10)}px "${fam}", sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.globalAlpha = 0.85; g.fillStyle = PAL.cyan; g.fillText(text, -0.065 * px, 0.05 * px); g.globalAlpha = 1;
  g.lineWidth = px * 0.14; g.strokeStyle = PAL.cream; g.strokeText(text, 0, 0);
  g.fillStyle = PAL.red; g.fillText(text, 0, 0);
  g.restore();
  tex.needsUpdate = true;
}

export function buildWord(text) {
  const c = document.createElement("canvas"), tex = new CanvasTexture(c);
  c.width = W; c.height = H; tex.colorSpace = SRGBColorSpace;
  const redraw = () => paint(c, tex, text);
  redraw();
  document.fonts?.load?.(`800 100px "${comicFamily()}"`).then(redraw, redraw);
  document.fonts?.addEventListener?.("loadingdone", redraw);
  const uAt = { value: new Vector4(0, 0, 0.5, 0.2) };
  const mesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
    uniforms: { tMap: { value: tex }, uAt },
    vertexShader: "uniform vec4 uAt; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(uAt.xy + position.xy * uAt.zw, 0.0, 1.0); }",
    fragmentShader: "uniform sampler2D tMap; varying vec2 vUv; void main() { vec4 c = texture2D(tMap, vUv); if (c.a < 0.004) discard; gl_FragColor = vec4(c.rgb * c.a, c.a); }",
    transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true, side: DoubleSide, toneMapped: false,
  }));
  mesh.frustumCulled = false; mesh.renderOrder = 1300; mesh.visible = false;
  return {
    mesh, uAt,
    dispose() { document.fonts?.removeEventListener?.("loadingdone", redraw); tex.dispose(); mesh.material.dispose(); mesh.geometry.dispose(); },
  };
}

// NDC placement: centre (0, 0.56), the pop of the live, judder on twos, nudged sideways off the seal's box; null outside the word's time
export function placeWord(t, aspect, box) {
  if (t < T.word[0] || t >= T.word[1]) return null;
  const lt = t - T.word[0], pop = Math.min(1, lt / 0.1) * (1 + 0.22 * Math.max(0, 1 - lt / 0.2)), odd = Math.floor(t * 12) % 2 ? 1 : -1;
  const wH = Math.min(1.9, aspect * 1.7) * pop, hw = wH / (2 * aspect), hh = 0.3125 * wH * 0.5;
  let cx = 0.03 * odd;
  if (box) {
    const s0 = box[0] * 2 - 1, s1 = box[2] * 2 - 1, top = 1 - box[1] * 2;
    if (top > 0.56 - hh && s1 > cx - hw && s0 < cx + hw) cx = s0 + s1 > 0 ? Math.max(-0.96 + hw, s0 - hw - 0.04) : Math.min(0.96 - hw, s1 + hw + 0.04);
  }
  return { cx, cy: 0.56, hw, hh };
}
