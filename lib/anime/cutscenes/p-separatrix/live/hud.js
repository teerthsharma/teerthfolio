import { BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, PlaneGeometry, Shape, SphereGeometry, SRGBColorSpace, TorusGeometry } from "three";
import { frescoMaterial } from "./fresco.js";
import { merge, paint, smooth } from "./geo.js";
import { word } from "./lettering.js";

export function buildHud({ tm, tg, gold, texs, wrap = (x) => x }) {
  const R = {};
  R.hud = new Group();
  const mk = (text, height, thick) => {
    const mesh = new Mesh(tg(word(text, { height, thick })), gold);
    mesh.visible = false;
    mesh.frustumCulled = false;
    R.hud.add(mesh);
    return mesh;
  };
  R.muda = ["M", "U", "D", "A"].map((ch) => mk(ch, 1, 0.2));
  R.don = mk("DON!", 1, 0.2);
  R.ting = [mk("TING", 1, 0.2), mk("TING", 1, 0.2)];
  R.dots = mk("...", 1, 0.22);
  R.gogo = [0, 1].map(() => [0, 1, 2].map(() => mk("ゴ", 1, 0.17)));

  const hudFres = tm(wrap(frescoMaterial()));
  hudFres.depthTest = true;
  R.hudFres = hudFres;
  const white = "#e8eff6";
  const pupBody = () => [
    paint(new SphereGeometry(0.5, 12, 8).scale(0.55, 0.42, 0.78), white, 4),
    paint(new SphereGeometry(0.4, 10, 6).scale(0.55, 0.38, 0.7).translate(0, -0.1, 0.1), "#f8ecda", 4),
    paint(new SphereGeometry(0.36, 12, 8).translate(0, 0.34, 0.46), white, 4),
    paint(new SphereGeometry(0.065, 8, 6).translate(-0.13, 0.4, 0.78), "#20232c", 4),
    paint(new SphereGeometry(0.065, 8, 6).translate(0.13, 0.4, 0.78), "#20232c", 4),
    paint(new SphereGeometry(0.045, 6, 5).translate(0, 0.3, 0.83), "#20232c", 4),
    paint(new ConeGeometry(0.12, 0.3, 5).rotateX(-Math.PI / 2).translate(0, 0, -0.5), "#c6d6e8", 4),
  ];
  const curl = (x) => paint(new TorusGeometry(0.075, 0.04, 5, 10, Math.PI * 1.5).rotateY(Math.PI / 2).translate(x, 0.66, 0.5), "#f0cd63", 4);
  const ACC = [
    ["#2a3350", [paint(new SphereGeometry(0.34, 10, 5, 0, Math.PI * 2, 0, 1.2).translate(0, 0.42, 0.46), "#1c2a4a", 4), paint(new BoxGeometry(0.34, 0.04, 0.3).translate(0, 0.52, 0.8), "#1c2a4a", 4)]],
    ["#c14a4a", [paint(new TorusGeometry(0.34, 0.05, 5, 16).rotateX(Math.PI / 2).translate(0, 0.52, 0.46), "#d94a4a", 4)]],
    ["#d985bd", [curl(-0.17), curl(0), curl(0.17)]],
    ["#2f6b52", [paint(new SphereGeometry(0.2, 8, 6).scale(1, 0.8, 1.5).translate(0, 0.78, 0.7), "#2a2a3a", 4)]],
    ["#e7e0d4", [paint(new BoxGeometry(0.3, 0.3, 0.3).translate(0, 0.74, 0.46), "#cfd6e2", 4)]],
    ["#7a4a98", [paint(new TorusGeometry(0.09, 0.04, 5, 10).translate(0.0, 0.66, 0.72), "#d94a4a", 4), paint(new TorusGeometry(0.07, 0.035, 5, 10).translate(0.18, 0.62, 0.7), "#d94a4a", 4)]],
    ["#e0b840", [paint(new TorusGeometry(0.33, 0.045, 5, 18).rotateX(Math.PI / 2 - 0.2).translate(0, 0.56, 0.5), "#f0cd63", 4), paint(new ConeGeometry(0.06, 0.24, 4).translate(-0.12, 0.8, 0.5), "#f0cd63", 4), paint(new ConeGeometry(0.06, 0.28, 4).translate(0.0, 0.84, 0.5), "#f0cd63", 4), paint(new ConeGeometry(0.06, 0.24, 4).translate(0.12, 0.8, 0.5), "#f0cd63", 4)]],
    ["#3a2a5e", [paint(new CylinderGeometry(0.22, 0.26, 0.4, 8).translate(0, 0.86, 0.46), "#6a4aa8", 4)]],
  ];
  R.pups = ACC.map(([jacket, head]) => {
    const jk = paint(new SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0.5, 1.0).scale(0.6, 0.46, 0.64).translate(0, 0.03, 0.1), jacket, 4);
    const mesh = new Mesh(tg(merge([...pupBody(), jk, ...head])), hudFres);
    mesh.matrixAutoUpdate = false;
    mesh.visible = false;
    mesh.frustumCulled = false;
    R.hud.add(mesh);
    return mesh;
  });
  R.flips = new InstancedMesh(tg(paint(new SphereGeometry(0.5, 8, 6).scale(0.5, 0.14, 0.24).translate(0.25, 0, 0), "#b9cbe2", 4)), hudFres, 16);
  R.flips.frustumCulled = false;
  R.hud.add(R.flips);

  const ar = new Shape();
  ar.moveTo(-1.1, -0.2);
  ar.lineTo(0.55, -0.2);
  ar.lineTo(0.55, -0.48);
  ar.lineTo(1.2, 0);
  ar.lineTo(0.55, 0.48);
  ar.lineTo(0.55, 0.2);
  ar.lineTo(-1.1, 0.2);
  ar.lineTo(-1.1, -0.2);
  R.tbc = new Group();
  R.tbc.add(new Mesh(tg(smooth(new ExtrudeGeometry(ar, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }).translate(0, 0, -0.04))), gold));
  const cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = 160;
  const tbcTex = new CanvasTexture(cv);
  tbcTex.colorSpace = SRGBColorSpace;
  texs.push(tbcTex);
  const drawTbc = () => {
    const g = cv.getContext("2d");
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
    g.clearRect(0, 0, 1024, 160);
    g.font = `800 96px ${fam}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#3a2430";
    g.fillText("To Be Continued", 512, 84);
    tbcTex.needsUpdate = true;
  };
  drawTbc();
  document.fonts?.load?.(`800 100px ${getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim()}`).then(drawTbc, () => {});
  const tbcMat = tm(new MeshBasicMaterial({ map: tbcTex, transparent: true, toneMapped: false, depthWrite: false }));
  const tbcText = new Mesh(tg(new PlaneGeometry(1.7, 0.27)), tbcMat);
  tbcText.position.set(-0.2, 0, 0.075);
  R.tbc.add(tbcText);
  R.tbc.traverse((x) => (x.frustumCulled = false));
  R.tbc.visible = false;
  R.hud.add(R.tbc);

  return { hud: R.hud, muda: R.muda, don: R.don, ting: R.ting, dots: R.dots, gogo: R.gogo, pups: R.pups, flips: R.flips, tbc: R.tbc, hudFres: R.hudFres };
}
