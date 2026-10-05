// Everything the Colosseum scene draws, built once at mount (build(L, W, H)): the fresco ground, the arena's
// furniture, the cast, the Requiem, the particles and the screen-space gold (lettering, the costume pups, the
// To Be Continued arrow). One object comes back, `m`, and `m.dispose()` frees every geometry, material and
// texture. No post pass anywhere: every effect is a mesh.

import { BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, RingGeometry, Shape, ShapeGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Color } from "three";
import { column, lantern, beaconBulb, poolGeometry, poolMaterial, portcullis, ridge, rimGeometry, HOPPER_H } from "./arena";
import { makeBanner } from "./banner";
import { arrow, diavolo, gem, key, kingCrimson, mista, requiem, requiemArm, requiemFist, trish, turtle } from "./cast";
import { basic, bubbleGeometry, dustGeometry, flakeGeometry, flowerGeometry, instanced, petalGeometry, put, sparkGeometry } from "./fx";
import { frescoMaterial, goldMaterial } from "./fresco";
import { hash, merge, paint, smooth } from "./geo";
import { word } from "./lettering";
import { archBay, floor, floorY, groundRing, ring, rome, skyGeometry, stands } from "./world";
import { N } from "./story";
import { faceMesh } from "../../cel";

export const COUNTS = { flakes: 260, petals: 110, flowers: 28, bubbles: 40, dust: 70, fists: 14, sparks: 8 };

export function build(L, W, H) {
  const geos = [];
  const mats = [];
  const texs = [];
  const tg = (g) => (geos.push(g), g);
  const tm = (x) => (mats.push(x), x);
  const fres = tm(frescoMaterial());
  const gold = tm(goldMaterial());
  const goldW = tm(goldMaterial({ zero: fres.uniforms })); // the world's gold: un-painted by the return to zero
  const goldSmallW = tm(goldMaterial({ dots: false, zero: fres.uniforms }));
  const m = { L, fres, gold, geos, mats };

  // ---- the fresco world
  const world = new Group();
  m.world = world;
  m.sky = new Mesh(tg(skyGeometry()), fres);
  m.sky.renderOrder = -3;
  m.sky.frustumCulled = false;
  const add = (mesh) => {
    mesh.frustumCulled = false;
    world.add(mesh);
    return mesh;
  };
  add(new Mesh(tg(groundRing(L)), fres));
  const fl = floor(L);
  add(new Mesh(tg(fl.floor), fres));
  add(new Mesh(tg(fl.edge), fres));
  add(new Mesh(tg(stands(L)), fres));
  const r = ring(L, fres);
  r.geometries.forEach(tg);
  world.add(r.arch, r.attic);
  m.ringN = r.N;
  for (const x of rome(L, fres)) {
    tg(x.geometry);
    world.add(x);
  }
  add(new Mesh(tg(ridge(L)), fres));
  // the broken column stands at the ridge's far end: the parcels drop from its top (story.js, v0 - 0.9)
  const col = add(new Mesh(tg(column()), fres));
  col.position.set(L.Cx, floorY(L, 0, -L.ridgeEnd - 0.5) - 0.05, L.Cz - L.ridgeEnd - 0.5);
  // the pools: a painted disc and a gold-leaf rim each
  m.pools = [-1, 1].map((s) => {
    const mat = tm(poolMaterial(fres.uniforms));
    const mesh = new Mesh(tg(poolGeometry()), mat);
    const rim = new Mesh(tg(rimGeometry()), goldW);
    mesh.frustumCulled = rim.frustumCulled = false;
    world.add(mesh, rim);
    return { s, mesh, rim, mat };
  });
  // the gate: the stone frame, the iron portcullis, the beacon
  m.gate = new Group();
  const frame = new Mesh(tg(archBay()), fres);
  frame.scale.set(1.15, 1.2, 1.5);
  const bars = new Mesh(tg(portcullis()), fres);
  bars.position.set(0, 0.04, -0.15);
  const lan = new Mesh(tg(lantern()), fres);
  lan.position.set(0, 4.1, 0.1);
  const bulbMat = tm(new MeshBasicMaterial({ color: "#ff6b55", toneMapped: false, fog: false }));
  const bulb = new Mesh(tg(beaconBulb()), bulbMat);
  bulb.position.set(0, 4.1, 0.1);
  m.gate.add(frame, bars, lan, bulb);
  m.gate.traverse((o) => (o.frustumCulled = false));
  m.bars = bars;
  m.bulb = bulb;
  m.bulbMat = bulbMat;
  world.add(m.gate);
  // the ruined arcade fragment the witnesses stand in: two bays, two tiers
  m.frag = new InstancedMesh(tg(archBay()), fres, 4);
  m.frag.frustumCulled = false;
  const fc = new Color();
  const dm = new Matrix4();
  [0, 1, 2, 3].forEach((i) => {
    const bx = (i % 2 ? 1 : -1) * 1.65;
    const ty = i < 2 ? 0 : 3.5;
    dm.makeTranslation(bx, ty, 0);
    m.frag.setMatrixAt(i, dm);
    m.frag.setColorAt(i, fc.setRGB(0.95 - 0.05 * (i % 2), 0.9, 0.86));
  });
  m.fragGroup = new Group();
  m.fragGroup.add(m.frag);
  world.add(m.fragGroup);

  // ---- the parcels, their rounding discs, the red sketch afterimages
  m.parcels = new InstancedMesh(tg(paint(new SphereGeometry(0.28, 10, 7), "#f6ecd8", 0)), fres, N * 2);
  m.parcels.frustumCulled = false;
  for (let i = 0; i < N * 2; i++) {
    m.parcels.setColorAt(i, fc.setRGB(1, 1, 1));
    put(m.parcels, i, 0, -90, 0, 0.0001);
  }
  const discMat = tm(basic({ color: "#ffc9b6", transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.discs = instanced(tg(new CircleGeometry(1, 24).rotateX(-Math.PI / 2)), discMat, N);
  const sketchMat = tm(basic({ color: "#b04a30", depthWrite: false, transparent: true, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  const sk = merge([new RingGeometry(0.26, 0.33, 14).rotateX(-Math.PI / 2), new BoxGeometry(0.7, 0.01, 0.045), new BoxGeometry(0.045, 0.01, 0.7)].map((g) => (g.deleteAttribute("uv"), g.deleteAttribute("normal"), g.index ? g.toNonIndexed() : g)));
  m.sketch = instanced(tg(sk), sketchMat, N * 2 + 4);
  world.add(m.parcels, m.discs, m.sketch);
  // the coin and its halves
  m.coin = new Mesh(tg(paint(new CylinderGeometry(0.16, 0.16, 0.035, 14), "#e2cc92", 4)), fres);
  m.coin.visible = false;
  m.coin.frustumCulled = false;
  const half = (s) => paint(new CircleGeometry(0.16, 12, s ? Math.PI : 0, Math.PI).rotateX(-Math.PI / 2), "#e2cc92", 4);
  m.halves = [0, 1].map((s) => {
    const h = new Mesh(tg(half(s)), fres);
    h.visible = false;
    h.frustumCulled = false;
    return h;
  });

  world.add(m.coin, ...m.halves);

  // ---- the cast
  const dv = diavolo();
  m.dv = { g: new Group(), body: new Mesh(tg(dv.body), fres), hair: new Mesh(tg(dv.hair), fres), arm: new Mesh(tg(dv.arm), fres), dv };
  m.dv.hairPivot = new Group();
  m.dv.hairPivot.position.set(...dv.head);
  m.dv.hair.position.set(-dv.head[0], -dv.head[1], -dv.head[2]);
  m.dv.hairPivot.add(m.dv.hair);
  m.dv.armPivot = new Group();
  m.dv.armPivot.position.set(...dv.shoulder);
  m.dv.armPivot.add(m.dv.arm);
  m.dv.g.add(m.dv.body, m.dv.hairPivot, m.dv.armPivot);
  m.dv.g.add(faceMesh({ eyes: { shape: "sharp", iris: "#e8386a", sclera: "#f6ecd8" }, brow: { tilt: 0.45, color: "#5a2040", thick: 0.1 }, mouth: { kind: "flat" } }, dv.head, 0.145, 0.85)); // Diavolo: hard brow, hard eyes
  m.kc = new Mesh(tg(kingCrimson()), fres);
  const mi = mista();
  m.mista = { g: new Group(), body: new Mesh(tg(mi.body), fres), hat: new Mesh(tg(mi.hat), fres), brim: new Mesh(tg(mi.brim), fres) };
  m.mista.hatPivot = new Group();
  m.mista.hatPivot.position.set(0, mi.head[1] + 0.07, mi.head[2]);
  m.mista.hat.position.set(0, 0.0, 0);
  m.mista.brim.position.set(0, 0.0, 0.0);
  m.mista.hatPivot.add(m.mista.hat, m.mista.brim);
  m.mista.g.add(m.mista.body, m.mista.hatPivot);
  m.trish = new Mesh(tg(trish()), fres);
  const tu = turtle();
  m.turtle = { g: new Group(), shell: new Mesh(tg(tu.turtle), fres), figure: new Mesh(tg(tu.figure), tm(basic({ color: "#f6e4ae", transparent: true, opacity: 0.55, depthWrite: false }))), key: new Mesh(tg(smooth(key())), goldSmallW) };
  m.turtle.key.position.set(0, 0.58, 0);
  m.turtle.key.scale.setScalar(0.9);
  m.turtle.figure.position.set(0, 1.0, 0);
  m.turtle.g.add(m.turtle.shell, m.turtle.key, m.turtle.figure);
  for (const o of [m.kc, m.dv.g, m.mista.g, m.trish, m.turtle.g]) o.traverse((x) => (x.frustumCulled = false));
  world.add(m.kc, m.dv.g, m.mista.g, m.trish, m.turtle.g);

  // ---- GOLD EXPERIENCE REQUIEM, the arrow, the slit
  m.ger = { g: new Group(), body: new Mesh(tg(requiem()), goldW), armL: new Mesh(tg(requiemArm(-1)), goldW), armR: new Mesh(tg(requiemArm(1)), goldW) };
  m.ger.armL.position.set(-0.64, 2.82, 0);
  m.ger.armR.position.set(0.64, 2.82, 0);
  const gemMat = tm(new MeshBasicMaterial({ color: "#ff7f9c", toneMapped: false, fog: false }));
  m.ger.gem = new Mesh(tg(gem()), gemMat);
  m.ger.gem.position.set(0, 2.62, 0.4);
  m.ger.g.add(m.ger.body, m.ger.armL, m.ger.armR, m.ger.gem);
  m.ger.g.traverse((x) => (x.frustumCulled = false));
  m.ger.g.visible = false;
  m.fists = new InstancedMesh(tg(requiemFist()), goldW, COUNTS.fists);
  m.fists.frustumCulled = false;
  for (let i = 0; i < COUNTS.fists; i++) put(m.fists, i, 0, -90, 0, 0.0001);
  m.arrow = new Mesh(tg(arrow()), goldW);
  m.arrow.visible = false;
  m.arrow.frustumCulled = false;
  const slit = new Shape();
  slit.moveTo(0, -1.4);
  slit.quadraticCurveTo(0.55, 0, 0, 1.4);
  slit.quadraticCurveTo(-0.55, 0, 0, -1.4);
  const slitMat = tm(new MeshBasicMaterial({ color: "#2a1740", toneMapped: false, fog: false, side: DoubleSide }));
  m.slit = new Group();
  m.slit.add(new Mesh(tg(new ShapeGeometry(slit)), slitMat));
  const edge = (s) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      pts.push(new BoxGeometry(0.1, 0.1, 0.06).translate(s * 0.55 * 2 * t * (1 - t) * 1.0, -1.4 + 2.8 * t, 0.02));
    }
    return merge(pts.map((g) => (g.deleteAttribute("uv"), g)));
  };
  m.slit.add(new Mesh(tg(edge(1)), goldW), new Mesh(tg(edge(-1)), goldW));
  m.slit.traverse((x) => (x.frustumCulled = false));
  m.slit.visible = false;
  world.add(m.ger.g, m.fists, m.arrow, m.slit);

  // ---- the particles
  const flakeMat = tm(basic({ vertexColors: false }));
  m.flakes = instanced(tg(flakeGeometry()), flakeMat, COUNTS.flakes);
  const FL = ["#f0c36a", "#e49a82", "#9a6aa8", "#e8b27a", "#c8864f", "#f4d78e", "#d9a0a0", "#b48ac0"];
  for (let i = 0; i < COUNTS.flakes; i++) m.flakes.setColorAt(i, fc.set(FL[i % FL.length]));
  m.flakes.instanceColor.needsUpdate = true;
  const petalMat = tm(basic({ vertexColors: false }));
  m.petals = instanced(tg(petalGeometry()), petalMat, COUNTS.petals);
  const PT = ["#f2a6b8", "#f6d27a", "#e9c25c", "#9cab5a", "#e68aa3", "#f8e3a0"];
  for (let i = 0; i < COUNTS.petals; i++) m.petals.setColorAt(i, fc.set(PT[i % PT.length]));
  m.petals.instanceColor.needsUpdate = true;
  m.flowers = instanced(tg(flowerGeometry()), tm(basic({ vertexColors: true })), COUNTS.flowers);
  m.bubbles = instanced(tg(bubbleGeometry()), tm(basic({ color: "#fff0c0", transparent: true, opacity: 0.7, depthWrite: false })), COUNTS.bubbles);
  m.dust = instanced(tg(dustGeometry()), tm(basic({ color: "#f4dcae", transparent: true, opacity: 0.4, depthWrite: false })), COUNTS.dust);
  m.sparks = instanced(tg(sparkGeometry()), tm(basic({ color: "#fff4d8", depthTest: false, depthWrite: false })), COUNTS.sparks * 2);
  m.sparks.renderOrder = 45;
  world.add(m.flakes, m.petals, m.flowers, m.bubbles, m.dust, m.sparks);

  // ---- SCREEN-SPACE GOLD: the lettering, the costume pups, the To Be Continued arrow (in the lens's frame)
  m.hud = new Group();
  const mk = (text, height, thick) => {
    const mesh = new Mesh(tg(word(text, { height, thick })), gold);
    mesh.visible = false;
    mesh.frustumCulled = false;
    m.hud.add(mesh);
    return mesh;
  };
  m.muda = ["M", "U", "D", "A"].map((ch) => mk(ch, 1, 0.2));
  m.don = mk("DON!", 1, 0.2);
  m.ting = [mk("TING", 1, 0.2), mk("TING", 1, 0.2)];
  m.dots = mk("...", 1, 0.22);
  m.gogo = [0, 1].map(() => [0, 1, 2].map(() => mk("ゴ", 1, 0.17)));

  // the eight costume pups, each its own colour and its own head, on the bottom edge
  const hudFres = tm(frescoMaterial());
  hudFres.depthTest = true;
  m.hudFres = hudFres;
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
    // [jacket colour, head things]
    ["#2a3350", [paint(new SphereGeometry(0.34, 10, 5, 0, Math.PI * 2, 0, 1.2).translate(0, 0.42, 0.46), "#1c2a4a", 4), paint(new BoxGeometry(0.34, 0.04, 0.3).translate(0, 0.52, 0.8), "#1c2a4a", 4)]],
    ["#c14a4a", [paint(new TorusGeometry(0.34, 0.05, 5, 16).rotateX(Math.PI / 2).translate(0, 0.52, 0.46), "#d94a4a", 4)]],
    ["#d985bd", [curl(-0.17), curl(0), curl(0.17)]],
    ["#2f6b52", [paint(new SphereGeometry(0.2, 8, 6).scale(1, 0.8, 1.5).translate(0, 0.78, 0.7), "#2a2a3a", 4)]],
    ["#e7e0d4", [paint(new BoxGeometry(0.3, 0.3, 0.3).translate(0, 0.74, 0.46), "#cfd6e2", 4)]],
    ["#7a4a98", [paint(new TorusGeometry(0.09, 0.04, 5, 10).translate(0.0, 0.66, 0.72), "#d94a4a", 4), paint(new TorusGeometry(0.07, 0.035, 5, 10).translate(0.18, 0.62, 0.7), "#d94a4a", 4)]],
    ["#e0b840", [paint(new TorusGeometry(0.33, 0.045, 5, 18).rotateX(Math.PI / 2 - 0.2).translate(0, 0.56, 0.5), "#f0cd63", 4), paint(new ConeGeometry(0.06, 0.24, 4).translate(-0.12, 0.8, 0.5), "#f0cd63", 4), paint(new ConeGeometry(0.06, 0.28, 4).translate(0.0, 0.84, 0.5), "#f0cd63", 4), paint(new ConeGeometry(0.06, 0.24, 4).translate(0.12, 0.8, 0.5), "#f0cd63", 4)]],
    ["#3a2a5e", [paint(new CylinderGeometry(0.22, 0.26, 0.4, 8).translate(0, 0.86, 0.46), "#6a4aa8", 4)]],
  ];
  m.pups = ACC.map(([jacket, head]) => {
    const jk = paint(new SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0.5, 1.0).scale(0.6, 0.46, 0.64).translate(0, 0.03, 0.1), jacket, 4);
    const mesh = new Mesh(tg(merge([...pupBody(), jk, ...head])), hudFres);
    mesh.matrixAutoUpdate = false;
    mesh.visible = false;
    mesh.frustumCulled = false;
    m.hud.add(mesh);
    return mesh;
  });
  m.flips = new InstancedMesh(tg(paint(new SphereGeometry(0.5, 8, 6).scale(0.5, 0.14, 0.24).translate(0.25, 0, 0), "#b9cbe2", 4)), hudFres, 16);
  m.flips.frustumCulled = false;
  m.hud.add(m.flips);

  // the To Be Continued arrow: a gold-leaf arrow with the words on it
  const ar = new Shape();
  ar.moveTo(-1.1, -0.2);
  ar.lineTo(0.55, -0.2);
  ar.lineTo(0.55, -0.48);
  ar.lineTo(1.2, 0);
  ar.lineTo(0.55, 0.48);
  ar.lineTo(0.55, 0.2);
  ar.lineTo(-1.1, 0.2);
  ar.lineTo(-1.1, -0.2);
  m.tbc = new Group();
  m.tbc.add(new Mesh(tg(smooth(new ExtrudeGeometry(ar, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }).translate(0, 0, -0.04))), gold));
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
  m.tbc.add(tbcText);
  m.tbc.traverse((x) => (x.frustumCulled = false));
  m.tbc.visible = false;
  m.hud.add(m.tbc);

  // ---- the banner
  m.banner = makeBanner(W, H);

  m.dispose = () => {
    for (const g of geos) g.dispose();
    for (const x of mats) x.dispose();
    for (const x of texs) x.dispose();
    m.banner.dispose();
    for (const x of [m.parcels, m.discs, m.sketch, m.fists, m.flakes, m.petals, m.flowers, m.bubbles, m.dust, m.sparks, m.flips, m.frag, r.arch, r.attic]) x.dispose?.();
  };
  void hash;
  void BufferGeometry;
  void Float32BufferAttribute;
  void CylinderGeometry;
  void HOPPER_H;
  return m;
}
