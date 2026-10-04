// SCREEN-SPACE PAPER: the title banner (element 1) and flat poster lettering (HMM., CHECKMATE.). Each is one plane held
// in front of the lens (depthTest off), drawn from a canvas in the comic face (Shantell Sans) in the dimension's own flat
// inks: no outline, no glow. Nothing here allocates per frame.

import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from "three";

const CREAM = "#f1ebdc";
const CRIMSON = "#a8222f";
const DEEP = "#2a3443";
const QUAD = new PlaneGeometry(1, 1);
const fam = () => getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";

function plane(c) {
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const m = new Mesh(QUAD, new MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false }));
  m.renderOrder = 50;
  m.onBeforeRender = (r, sc, cam) => {
    const h = m.userData.hold;
    if (!h || !m.visible) return;
    h.apply(cam);
    m.updateMatrixWorld(true);
  };
  m.frustumCulled = false;
  m.visible = false;
  return m;
}
export const disposePlane = (m) => {
  m.material.map.dispose();
  m.material.dispose();
};

// THE TITLE BANNER: a cream cloth, a blazer-crimson stripe along its lower edge, the title large and bold, "planimeter"
// smaller beneath. One line on a wide screen, two on a narrow one. Returns { mesh, aspect (w/h) }.
export function titleBanner() {
  const W = typeof innerWidth === "number" ? innerWidth : 1280;
  const H = typeof innerHeight === "number" ? innerHeight : 800;
  const narrow = W < 900 || W / H < 1.1;
  const cw = 2000;
  const ch = narrow ? 560 : 340;
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const draw = () => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, cw, ch);
    g.fillStyle = CREAM;
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = CRIMSON;
    g.fillRect(0, ch - ch * 0.075, cw, ch * 0.075);
    g.fillStyle = "#ddd5c2"; // the cloth's folds: two flat darker strips, no gradient
    g.fillRect(cw * 0.5, 0, cw * 0.002, ch - ch * 0.075);
    g.textAlign = "center";
    g.textBaseline = "middle";
    const title = "Classroom of the Elite: Exactly Fifty";
    const fit = (txt, px, max) => {
      let s = px;
      g.font = `800 ${s}px ${fam()}`;
      while (g.measureText(txt).width > max && s > 20) g.font = `800 ${(s -= 6)}px ${fam()}`;
      return s;
    };
    g.fillStyle = DEEP;
    if (narrow) {
      const s = fit("Classroom of the Elite:", 190, cw * 0.9);
      g.fillText("Classroom of the Elite:", cw / 2, ch * 0.2);
      g.fillStyle = CRIMSON;
      g.font = `800 ${s}px ${fam()}`;
      g.fillText("Exactly Fifty", cw / 2, ch * 0.5);
      g.fillStyle = DEEP;
      g.font = `600 ${s * 0.36}px ${fam()}`;
      g.fillText("planimeter", cw / 2, ch * 0.78);
    } else {
      const s = fit(title, 200, cw * 0.92);
      g.fillText(title, cw / 2, ch * 0.4);
      g.font = `600 ${s * 0.36}px ${fam()}`;
      g.fillText("planimeter", cw / 2, ch * 0.74);
    }
    m.material.map.needsUpdate = true;
  };
  const m = plane(c);
  draw();
  document.fonts?.load?.(`800 100px ${fam()}`).then(draw, () => {});
  return { mesh: m, aspect: cw / ch, narrow };
}

// FLAT POSTER LETTERING: one word, in one ink on a transparent plane
export function poster(text, ink = CRIMSON, w = 1200, h = 400, weight = 800) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const m = plane(c);
  const draw = () => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, w, h);
    g.textAlign = "center";
    g.textBaseline = "middle";
    let s = h * 0.78;
    g.font = `${weight} ${s}px ${fam()}`;
    while (g.measureText(text).width > w * 0.94 && s > 20) g.font = `${weight} ${(s -= 6)}px ${fam()}`;
    g.fillStyle = ink;
    g.fillText(text, w / 2, h * 0.52);
    m.material.map.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`${weight} 100px ${fam()}`).then(draw, () => {});
  m.userData.aspect = w / h;
  return m;
}

const V = new Vector3();
const HOLD = { x: 0, y: 0, w: 0, h: 0, rot: 0, aspect: 1, banner: false };
// The plane is placed in onBeforeRender, with the camera that draws it, so a lens that dollies never leaves it behind.
function setHold(mesh, f) {
  mesh.userData.hold ??= { v: { ...HOLD }, apply: null };
  const hd = mesh.userData.hold;
  Object.assign(hd.v, f);
  hd.apply ??= (camera) => {
    const q = hd.v;
    const d = 3;
    const hh = 2 * d * Math.tan((camera.fov * Math.PI) / 360);
    V.set(q.x * hh * 0.5 * camera.aspect, q.y * hh * 0.5, -d).applyQuaternion(camera.quaternion).add(camera.position);
    mesh.position.copy(V);
    mesh.quaternion.copy(camera.quaternion);
    mesh.rotateZ(q.rot);
    mesh.scale.set(q.w * hh * camera.aspect, q.h * hh, 1);
  };
}
// Hold a plane at screen (nx, ny in -1..1), `hFrac` of the screen tall, `pop` scale, `rot` roll; never wider than 92 % of the screen
export function holdOnScreen(camera, mesh, nx, ny, hFrac, pop = 1, rot = 0, aspect = mesh.userData.aspect) {
  mesh.visible = pop > 0.001;
  if (!mesh.visible) return;
  const hf = Math.min(hFrac * pop, (0.92 * camera.aspect) / aspect);
  setHold(mesh, { x: nx, y: ny, w: hf * aspect / camera.aspect, h: hf, rot });
}

// Hold the banner: `wf` of the screen wide and `hf` tall, its centre at screen height ny (-1..1)
export function holdBanner(camera, mesh, ny, wf, hf) {
  setHold(mesh, { x: 0, y: ny, w: wf, h: hf, rot: 0 });
}
