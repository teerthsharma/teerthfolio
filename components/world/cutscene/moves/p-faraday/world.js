// THE WHOLE LANDSCAPE, built once (no GL needed): everything the Move draws, in the bridge's frame. Cheap by
// construction: each object group is ONE merged mesh and ONE merged LineSegments (about 40 draw calls), the
// fields, bits, lamps and colony pups are instanced. `buildWorld()` can run any time before the scene (the
// Move prewarms it while the seal walks), and `dispose()` frees every geometry, material and texture.

import { Color, DoubleSide, Group, InstancedMesh, LineSegments, Matrix4, Mesh, MeshBasicMaterial, ShaderMaterial, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { riverGeometry, riverMaterial, skyShell } from "./backdrop";
import { CYAN, U, disposeGrain, edgeGeometry, hullOf, lineMaterial, paperMaterial, resetU, rgb, rotorPaper, silMaterial } from "./blue";
import { makeFields } from "./fields";
import { colonyGeometry, figure, kurokoGeometry, toumaGeometry } from "./figures";
import { DECK_Y, KUROKO_LAMP, bridgeGeometry, carGeometry, cityGeometry, glassGeometry, lampBulbs, rotorGeometry, rotorLines, substationGeometry, trackGeometry } from "./scenery";

export const PHI = 0.1; // the bridge's turn in the rig: its +x runs almost straight across the lens (the duel is a profile two-shot)
export const TOUMA = { x: 4.0, z: -0.95, y: 0 }; // where Touma ends: on the glass at mid-distance, in the beam's line; the move walks him in and rewrites x, y live
export const KUROKO = { x: KUROKO_LAMP.x, y: DECK_Y + KUROKO_LAMP.h + 0.1, z: KUROKO_LAMP.z };
export const NCOLONY = 10;
export const NBULB = lampBulbs().length;
const M4 = new Matrix4();

export function buildWorld() {
  resetU();
  const geos = [];
  const mats = [];
  const keep = (g) => (geos.push(g), g);
  const own = (m) => (mats.push(m), m);
  const bg = new Group(); // the bridge's frame
  const add = (o) => (bg.add(o), o);
  const mesh = (g, m, order = 0) => {
    const o = new Mesh(keep(g), own(m));
    o.frustumCulled = false;
    o.renderOrder = order;
    return add(o);
  };
  const cream = own(lineMaterial());
  const line = (src, th = 28, m = cream) => {
    const o = new LineSegments(keep(edgeGeometry(src, th, 0.04)), m);
    o.frustumCulled = false;
    o.renderOrder = 1;
    return add(o);
  };
  const grid = paperMaterial({ grid: true });
  const plain = paperMaterial({ windows: true });
  own(grid);
  own(plain);

  // the sky shell (the Move scales and places it) and the river
  const sky = skyShell();
  keep(sky.g);
  own(sky.m);
  const skyMesh = new Mesh(sky.g, sky.m);
  skyMesh.renderOrder = -3;
  skyMesh.frustumCulled = false;
  add(skyMesh);
  const river = mesh(riverGeometry(), riverMaterial(), -1);

  // the bridge
  const bridgeG = bridgeGeometry();
  mesh(bridgeG, grid);
  line(bridgeG);

  // the substation, its glass platform on four legs
  const subG = substationGeometry();
  const glassG = glassGeometry();
  mesh(subG, plain);
  line(mergeGeometries([subG, glassG]), 40);
  mesh(
    glassG,
    new ShaderMaterial({
      uniforms: { uC: { value: rgb(CYAN) } },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 0.16); }",
    }),
    2,
  );

  // the city: the quay and the towers (windows, screens), their lines, the rotors, the monorail and its car
  const city = cityGeometry();
  mesh(city.bank, grid);
  mesh(city.towers, paperMaterial({ windows: true }));
  line(mergeGeometries([city.bank, city.towers]), 30);
  const rotG = rotorGeometry(city.hubs);
  const rotor = mesh(rotG, rotorPaper());
  const rotorLine = new LineSegments(keep(rotorLines(rotG, city.hubs)), own(lineMaterial({ rotor: true })));
  rotorLine.frustumCulled = false;
  rotorLine.renderOrder = 1;
  add(rotorLine);
  const trackG = trackGeometry();
  mesh(trackG, plain);
  line(trackG, 30);
  const carG = keep(carGeometry());
  const carMat = own(paperMaterial({ windows: true }));
  const carLineMat = own(lineMaterial());
  const car = new Group();
  const carBody = new Mesh(carG, carMat);
  const carLine = new LineSegments(keep(edgeGeometry(carG, 30, 0.04)), carLineMat);
  for (const o of [carBody, carLine]) (o.frustumCulled = false, car.add(o));
  carLine.renderOrder = 1;
  add(car);

  // the lamps: bulbs, pale (never amber), flickering as the fields settle
  const bulbs = new InstancedMesh(keep(new SphereGeometry(0.17, 8, 6)), own(new MeshBasicMaterial({ toneMapped: false, fog: false })), NBULB);
  const c = new Color("#cfeeff");
  lampBulbs().forEach((p, i) => {
    bulbs.setMatrixAt(i, M4.makeTranslation(p.x, p.y, p.z));
    bulbs.setColorAt(i, c);
  });
  bulbs.frustumCulled = false;
  add(bulbs);

  // the fields, the bits, the beam, the coin
  const fields = makeFields();
  for (const o of [fields.arcs, fields.rings, fields.marks, fields.core, fields.pool, fields.bits, fields.sheath, fields.beamCore]) add(o);
  const coin = new Mesh(fields.coin.geo, fields.coin.mat);
  const coinLine = new LineSegments(keep(edgeGeometry(fields.coin.geo, 40, 0)), own(lineMaterial()));
  coinLine.frustumCulled = false;
  coin.add(coinLine);
  coin.visible = false;
  coin.frustumCulled = false;
  coin.renderOrder = 5;
  add(coin);

  // the figures and the colony
  const touma = figure(toumaGeometry(), 0.028, { head: [0, 1.74, 0], r: 0.15, spec: { eyes: { shape: "sharp", iris: "#6a4a2a" }, brow: { tilt: 0.35, color: "#1a2a4a" }, mouth: { kind: "frown" } } });
  touma.group.position.set(TOUMA.x, 0, TOUMA.z);
  touma.group.rotation.order = "YXZ";
  touma.group.name = "fa-touma";
  touma.group.scale.setScalar(1.25);
  touma.group.rotation.y = Math.atan2(-TOUMA.x, -TOUMA.z);
  const kuroko = figure(kurokoGeometry(), 0.028, { head: [0, 0.93, 0.2], r: 0.13, spec: { eyes: { shape: "round", iris: "#3a7ab8" }, brow: { tilt: 0.1, color: "#3a2a1a" }, mouth: { kind: "smirk" }, blush: true } });
  kuroko.group.position.set(KUROKO.x, KUROKO.y, KUROKO.z);
  kuroko.group.name = "fa-kuroko";
  kuroko.group.scale.setScalar(1.15);
  kuroko.group.rotation.y = Math.atan2(-KUROKO.x, -KUROKO.z);
  add(touma.group);
  add(kuroko.group);
  const colG = colonyGeometry();
  const colHullG = hullOf(colG, 0.02);
  const colBody = new InstancedMesh(colG, silMaterial(false), NCOLONY);
  const colHull = new InstancedMesh(colHullG, silMaterial(true), NCOLONY);
  for (const o of [colHull, colBody]) (o.frustumCulled = false, add(o));

  const dispose = () => {
    fields.dispose();
    touma.dispose();
    kuroko.dispose();
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
    colG.dispose();
    colHullG.dispose();
    colBody.material.dispose();
    colHull.material.dispose();
    for (const o of [bulbs, colBody, colHull]) o.dispose();
    disposeGrain();
    U.uGrain.value = null;
  };
  return { bg, skyMesh, river, car, rotor, bulbs, fields, coin, touma, kuroko, colBody, colHull, carMat, carLineMat, dispose, hubs: city.hubs };
}
