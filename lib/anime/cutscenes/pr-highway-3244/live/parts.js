// Live port of the caustic parts the Highway move uses: hash, mat, lettering, flashQuad and holdFlash only.
import { CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from "three";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const mat = (o = {}) => new MeshBasicMaterial({ toneMapped: false, fog: false, ...o });

export function lettering(text, color = "#e0559b", tilt = -0.08) {
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
  const m = new Mesh(new PlaneGeometry(1, 320 / 1024), mat({ map: tex, transparent: true, depthTest: false, depthWrite: false, side: DoubleSide }));
  m.renderOrder = 30;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}

export function flashQuad(color = "#ffffff") {
  const m = new Mesh(new PlaneGeometry(1, 1), mat({ color, transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
  m.renderOrder = 40;
  m.frustumCulled = false;
  m.visible = false;
  return m;
}

export function holdFlash(m, camera, k) {
  m.visible = k > 0.002;
  if (!m.visible) return;
  m.material.opacity = Math.min(1, k);
  camera.getWorldDirection(m.position);
  m.position.multiplyScalar(1).add(camera.position);
  m.quaternion.copy(camera.quaternion);
  const h = 2 * Math.tan((camera.fov * Math.PI) / 360) * 1.2;
  m.scale.set(h * camera.aspect, h, 1);
}
