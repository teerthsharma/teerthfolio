import { BoxGeometry, CircleGeometry, DoubleSide, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Object3D, Quaternion, RingGeometry, Shape, ShapeGeometry, SphereGeometry, CylinderGeometry, Vector3, Color } from "three";
import { faceMesh } from "../../../../../components/world/cutscene/cel.js";
import { column, lantern, beaconBulb, poolGeometry, poolMaterial, portcullis, ridge, rimGeometry } from "./arena.js";
import { makeBanner, unfurlAt } from "./banner.js";
import { arrow, diavolo, gem, key, kingCrimson, mista, requiem, requiemArm, requiemFist, trish, turtle } from "./cast.js";
import { basic, bubbleGeometry, dustGeometry, flakeGeometry, flowerGeometry, hide, instanced, petalGeometry, put, putQ, sparkGeometry } from "./fx.js";
import { BREAK, frescoMaterial, goldMaterial } from "./fresco.js";
import { ease, hash, lerp, merge, paint, smooth } from "./geo.js";
import { archBay, floor, floorY, groundRing, poolLevel, ring, rome, skyGeometry, stands } from "./world.js";
import { N, gateAt, beaconAt, makeParcels, parcelAt, schedule } from "./story.js";
import { DOCK, RADIUS, T } from "../clock.js";
import { buildHud } from "./hud.js";

export const COUNTS = { flakes: 260, petals: 110, flowers: 28, bubbles: 40, dust: 70, fists: 14, sparks: 8 };
const CORE_Y = 0.9;
const HUD_D = 5;
const CREDIT = 15.4;
const DV = { x: 5.2, z: -11.4, yaw: -0.45, s: 1.2 };
const KC = { x: 6.5, z: -14.5, s: 1.0 };
const GER = { rise: [2.2, -1.9], stand: [3.1, -3.4], s: 0.8 };
const SLIT = [-1.4, 1.75, 0.9];
const HOME = new Vector3(DOCK[0], DOCK[1], DOCK[2]);
const Z = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);
const NEG_Y = new Vector3(0, -1, 0);
const V = new Vector3();
const W = new Vector3();
const X = new Vector3();
const Q = new Quaternion();
const CAMQ = new Quaternion();
const M = new Matrix4();
const M2 = new Matrix4();
const O = new Object3D();
const PO = { u: 0, v: 0, y: 0, s: 0, disc: 0, spin: 0, tear: 0 };
const sgn = (x) => (x < 0 ? -1 : 1);
const bump = (a, b, t) => ease(a, a + (b - a) * 0.3, t) * (1 - ease(a + (b - a) * 0.6, b, t));
const pop = (a) => (a < 0 ? 0 : Math.min(1, a / 0.1) * (1 + 0.25 * Math.max(0, 1 - a / 0.22)));
const POSES = [
  [0.35, -0.2, 0.5, 1.25, -0.2],
  [-0.3, 0.25, -0.4, 0.3, 1.4],
  [0.0, -0.5, 0.0, 1.0, 1.0],
  [0.5, 0.1, -0.6, -0.6, 0.9],
  [-0.55, -0.3, 0.4, 1.5, 0.1],
  [0.15, 0.4, 0.2, 0.7, 0.7],
];
const XS = [-0.93, -0.66, -0.4, -0.14, 0.14, 0.4, 0.66, 0.93];
const ARC = [[-0.62, 0.3, 0.3], [-0.22, 0.46, 0.1], [0.2, 0.46, -0.1], [0.6, 0.3, -0.3]];

function places(L) {
  const at = (x, z) => floorY(L, x - L.Cx, z - L.Cz);
  const gx = L.Cx - 3.0 - 3.4 * L.lay;
  const gz = L.Cz - L.bF + 0.9;
  return {
    dv: [DV.x, at(DV.x, DV.z), DV.z],
    kc: [KC.x, at(KC.x, KC.z), KC.z],
    gate: [gx, at(gx, gz) + 0.05, gz],
    frag: [-3.3 - 2.5 * L.lay, 0.0, -12.5],
    turtle: [-2.3, at(-2.3, -3.9), -3.9],
    saddle: [L.Cx, at(L.Cx, L.Cz), L.Cz],
    ger: [GER.rise[0], at(GER.rise[0], GER.rise[1]), GER.rise[1]],
    gerStand: [GER.stand[0], at(GER.stand[0], GER.stand[1]), GER.stand[1]],
  };
}

export function buildSet(L, W, H, wrap = (x) => x) {
  const geos = [];
  const mats = [];
  const texs = [];
  const tg = (g) => (geos.push(g), g);
  const tm = (x) => (mats.push(x), x);
  const fres = tm(wrap(frescoMaterial()));
  const gold = tm(wrap(goldMaterial()));
  const goldW = tm(wrap(goldMaterial({ zero: fres.uniforms })));
  const goldSmallW = tm(wrap(goldMaterial({ dots: false, zero: fres.uniforms })));
  const m = { L, fres, gold, geos, mats };

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
  const col = add(new Mesh(tg(column()), fres));
  col.position.set(L.Cx, floorY(L, 0, -L.ridgeEnd - 0.5) - 0.05, L.Cz - L.ridgeEnd - 0.5);
  m.pools = [-1, 1].map((s) => {
    const mat = tm(wrap(poolMaterial(fres.uniforms)));
    const mesh = new Mesh(tg(poolGeometry()), mat);
    const rim = new Mesh(tg(rimGeometry()), goldW);
    mesh.frustumCulled = rim.frustumCulled = false;
    world.add(mesh, rim);
    return { s, mesh, rim, mat };
  });
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
  m.dv.g.add(faceMesh({ eyes: { shape: "sharp", iris: "#e8386a", sclera: "#f6ecd8" }, brow: { tilt: 0.45, color: "#5a2040", thick: 0.1 }, mouth: { kind: "flat" } }, dv.head, 0.145, 0.85));
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

  m.rig = new Group();
  m.rig.add(m.sky, m.world);

  Object.assign(m, buildHud({ tm, tg, gold, texs, wrap }));
  m.banner = makeBanner(W, H);
  m.banner.mesh.frustumCulled = false;
  m.dispose = () => {
    for (const g of geos) g.dispose();
    for (const x of mats) x.dispose();
    for (const x of texs) x.dispose();
    m.banner.dispose();
    for (const x of [m.parcels, m.discs, m.sketch, m.fists, m.flakes, m.petals, m.flowers, m.bubbles, m.dust, m.sparks, m.flips, m.frag, r.arch, r.attic]) x.dispose?.();
  };
  return { m, L, parcels: schedule(makeParcels(L)), P: places(L) };
}

export function updateSet(S, a) {
  const { m, L, parcels, P } = S;
  const { tt, cam, seal } = a;
  const s = seal;
  const g = m.rig;
  const u = m.fres.uniforms;
  m.banner.mesh.visible = tt < CREDIT;
  m.banner.mat.uniforms.uU.value = unfurlAt(tt);
  m.banner.mat.uniforms.uT.value = tt;
  m.banner.setRect();
  g.visible = true;
  m.hud.visible = true;
  m.hud.position.copy(cam.position).sub(HOME);
  m.hud.quaternion.copy(cam.quaternion);
  const F = Math.floor(tt * 12 + 1e-6);
  const odd = F % 2 ? 1 : -1;
  const over = tt >= T.island;

  const amp = (tt >= T.lastBlow && tt < T.lastBlow + 0.17 ? 0.1 : 0) + (tt >= T.jump && tt < T.jump + 0.17 ? 0.05 : 0);
  const sh = { x: amp * odd, y: -amp * 0.6 * odd };
  g.position.set(s.x + sh.x, sh.y, s.z);
  g.rotation.y = 0;
  const r = RADIUS * ease(0.75, 1.2, tt) * (1 - ease(16.6, 17.0, tt));
  V.set(DOCK[0] + s.x, DOCK[1] + CORE_Y, DOCK[2] + s.z);
  const inside = r > cam.position.distanceTo(V) + 0.3;
  m.sky.visible = r > 0.02 && !over;
  m.sky.position.set(0, CORE_Y, 0);
  m.sky.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
  m.world.visible = inside && !over;

  u.uTime.value = tt;
  u.uArC.value.set(DOCK[0] + s.x + L.Cx, DOCK[2] + s.z + L.Cz);
  u.uAB.value.set(L.A, L.B);
  u.uBay.value = m.ringN;
  u.uBreak.value.set(L.phi, BREAK.half);
  u.uErase.value = ease(T.erase[0], T.erase[1], tt);
  u.uGild.value = tt < T.wipe[0] ? -1 : tt >= T.wipe[1] ? 5 : lerp(0, 1.5, ease(T.wipe[0], T.wipe[1], tt));
  u.uZero.value = tt < T.zero[0] ? -1 : tt >= T.zero[1] ? 5 : lerp(0, 1.6, ease(T.zero[0], T.zero[1], tt));
  u.uWipeDir.value.set(DOCK[0] + s.x + P.ger[0], DOCK[1] + P.ger[1] + 2.4, DOCK[2] + s.z + P.ger[2]).sub(cam.position).normalize();
  u.uZeroDir.value.set(DOCK[0] + s.x + P.saddle[0], DOCK[1] + P.saddle[1] + 0.6, DOCK[2] + s.z + P.saddle[2]).sub(cam.position).normalize();

  W.set(DOCK[0] + s.x, DOCK[1] + 0.9, DOCK[2] + s.z).sub(cam.position).normalize();
  const zeroPup = u.uZero.value > Math.acos(Math.max(-1, Math.min(1, W.dot(u.uZeroDir.value))));

  m.pools.forEach((pl) => {
    const side = pl.s;
    pl.mesh.position.set(L.Cx + side * L.poolX, poolLevel(L, side), L.Cz + L.poolV);
    pl.rim.position.copy(pl.mesh.position);
    pl.mat.uniforms.uTime.value = tt;
    let pulse = 0;
    for (const p of parcels) if (!p.band && p.side === side && tt >= p.ring && tt < p.ring + 0.9) pulse = Math.max(pulse, ease(0, 0.9, tt - p.ring));
    pl.mat.uniforms.uPulse.value = pulse;
  });

  const gate = gateAt(parcels, tt);
  const bea = beaconAt(parcels, tt);
  m.gate.position.set(P.gate[0], P.gate[1], P.gate[2]);
  m.bars.position.y = 0.04 + 2.5 * gate;
  m.bars.scale.x = 1.28;
  m.bulbMat.color.setRGB(0.3 + 0.7 * bea, 0.13 + 0.28 * bea, 0.12 + 0.25 * bea);
  m.bulb.scale.setScalar(0.8 + 0.4 * bea);

  m.fragGroup.position.set(P.frag[0], P.frag[1], P.frag[2]);
  m.fragGroup.rotation.y = 0.2;
  const fy = P.frag[1] + 3.72;
  m.mista.g.position.set(P.frag[0] - 1.95 * Math.cos(0.2), fy, P.frag[2] + 1.95 * Math.sin(0.2));
  m.mista.g.rotation.y = 0.45;
  m.mista.hatPivot.rotation.z = 0.04 * Math.sin(tt * 2.3) + 0.1 * Math.max(0, Math.sin(tt * 0.9 + 1)) ** 3;
  m.mista.brim.rotation.z = 0.12 * Math.max(0, Math.sin(tt * 1.7)) ** 2;
  m.trish.position.set(P.frag[0] - 1.25 * Math.cos(0.2), fy, P.frag[2] + 1.25 * Math.sin(0.2));
  m.trish.rotation.set(0, 0.3, 0.018 * Math.sin(tt * 1.9));
  m.turtle.g.position.set(P.turtle[0], P.turtle[1], P.turtle[2]);
  m.turtle.g.rotation.y = 0.55;
  const glint = Math.max(0, Math.sin(tt * 3.1)) ** 8;
  m.turtle.key.scale.setScalar(0.9 + 0.35 * glint);
  m.turtle.key.rotation.y = tt * 0.8;
  m.turtle.figure.position.y = 1.0 + 0.06 * Math.sin(tt * 1.6);
  m.turtle.figure.material.opacity = 0.4 + 0.22 * Math.sin(tt * 2.2);

  const dv = m.dv;
  const blow = tt >= T.barrage[0] && tt < T.lastBlow ? 1 : 0;
  const launch = ease(T.lastBlow, T.lastBlow + 0.55, tt);
  const saddle = P.saddle;
  const lt = tt - T.loop;
  const ph = lt / 2.3;
  const dir = Math.floor(ph) % 2 ? -1 : 1;
  const fr = ph - Math.floor(ph);
  const slide = lt > 0 ? dir * (L.poolX - 1.2) * Math.sin(Math.PI * Math.min(1, fr / 0.92)) ** 1.4 : 0;
  let dx = P.dv[0] + blow * 0.12 * odd * (F % 3 === 0 ? 1 : 0.4);
  let dz = P.dv[2] - blow * 0.1 * (F % 2);
  let dy = P.dv[1];
  let pitch = 0;
  if (tt >= T.lastBlow) {
    dx = lerp(P.dv[0], saddle[0] + slide, launch);
    dz = lerp(P.dv[2], saddle[2], launch);
    dy = lerp(P.dv[1], saddle[1], launch) + 2.6 * Math.sin(Math.PI * launch) * (1 - launch * 0.3) + 0.25 * launch;
    pitch = -1.5 * launch;
  }
  dv.g.position.set(dx, dy, dz);
  dv.g.scale.setScalar(DV.s);
  dv.g.rotation.set(pitch, tt >= T.lastBlow ? lerp(DV.yaw, sgn(dir) * 1.2, launch) : DV.yaw, 0, "YXZ");
  dv.hairPivot.rotation.set(0.07 * Math.sin(tt * 4.1) + (blow ? 0.28 * Math.sin(F * 2.1) : 0), 0.05 * Math.sin(tt * 2.7), 0.06 * Math.sin(tt * 3.3 + 1));
  const flick = bump(T.flick - 0.05, T.flick + 0.35, tt);
  const rewindCoin = bump(T.rewind + 0.2, T.rewind + 1.3, tt);
  dv.armPivot.rotation.set(-1.7 * Math.max(flick, rewindCoin) + (blow ? -0.7 * (F % 2) : 0), 0, -0.12 * (1 - flick));
  const kcK = ease(T.kc[0], T.kc[1], tt) * (1 - ease(T.rewind + 0.1, T.rewind + 0.9, tt));
  m.kc.visible = kcK > 0.01;
  m.kc.position.set(P.kc[0], P.kc[1] - 0.3 * (1 - kcK), P.kc[2]);
  m.kc.scale.set(KC.s * (0.7 + 0.3 * kcK), KC.s * Math.max(kcK, 0.01), KC.s * (0.7 + 0.3 * kcK));
  m.kc.rotation.y = DV.yaw * 0.9 + 0.03 * Math.sin(tt * 1.3);

  let sk = 0;
  const sketch = (x, y, z, sc) => put(m.sketch, sk++, x, y + 0.03, z, sc);
  parcels.forEach((p, i) => {
    parcelAt(L, p, tt, PO);
    const px = L.Cx + PO.u;
    const pz = L.Cz + PO.v;
    if (PO.s >= 1 && PO.s <= 5) {
      if (PO.s === 5) {
        const k = PO.tear;
        const sc = 0.62 * (1 - k * 0.8);
        put(m.parcels, i, px - k * 1.5, PO.y, pz - k * 0.3, sc, sc, sc, PO.spin, 0, 0);
        put(m.parcels, N + i, px + k * 1.5, PO.y, pz + k * 0.3, sc, sc, sc, -PO.spin, 0, 0);
      } else {
        put(m.parcels, i, px, PO.y, pz, 1, 1, 1, PO.spin, 0, 0.3 * i);
        hide(m.parcels, N + i);
      }
      if (PO.s === 1 || PO.s === 4 || PO.s === 5) put(m.discs, i, px, floorY(L, PO.u, PO.v) + 0.04, pz, PO.disc, 1, PO.disc);
      else hide(m.discs, i);
    } else {
      hide(m.parcels, i);
      hide(m.parcels, N + i);
      hide(m.discs, i);
    }
    if (tt >= p.jump && tt < p.back + 0.8 && F % 6 !== 5) {
      sketch(L.Cx + p.u0, floorY(L, p.u0, p.v0), L.Cz + p.v0, 1);
      sketch(L.Cx + p.ru, poolLevel(L, p.side), L.Cz + p.rv, 1);
    }
  });
  const hand = X.set(dv.dv.hand[0], dv.dv.hand[1], dv.dv.hand[2]).multiplyScalar(DV.s);
  const ca = Math.cos(DV.yaw);
  const sa = Math.sin(DV.yaw);
  const hx = P.dv[0] + hand.x * ca + hand.z * sa;
  const hz = P.dv[2] - hand.x * sa + hand.z * ca;
  const hy = P.dv[1] + hand.y;
  const groundX = P.dv[0] + 0.5;
  const groundZ = P.dv[2] + 0.9;
  const groundY = floorY(L, groundX - L.Cx, groundZ - L.Cz) + 0.03;
  const flipUp = tt >= T.rewind + 0.2 && tt < T.rewind + 1.3;
  m.coin.visible = tt >= T.flick + 0.2 && tt < T.rewind + 1.3;
  if (m.coin.visible) {
    if (flipUp) {
      const k = ease(T.rewind + 0.2, T.rewind + 1.3, tt);
      m.coin.position.set(lerp(groundX, hx, k), lerp(groundY, hy, k) + 1.4 * Math.sin(Math.PI * k), lerp(groundZ, hz, k));
      m.coin.rotation.set(k * 18, 0, 0);
    } else {
      m.coin.position.set(groundX, groundY, groundZ);
      m.coin.rotation.set(0, 0, 0);
    }
  }
  const tearC = tt - (T.rewind + 1.3);
  m.halves.forEach((h, k) => {
    h.visible = tearC >= 0 && tearC < 0.9;
    if (h.visible) {
      const e = ease(0, 0.8, tearC);
      h.position.set(hx + (k ? 1 : -1) * 0.35 * e, hy - 0.05 - 0.2 * e, hz);
      h.rotation.set(0.5 * e, 0, (k ? 1 : -1) * e);
      h.scale.setScalar(1 - 0.5 * ease(0.5, 0.9, tearC));
    }
  });
  if (tt >= T.flick + 0.2 && tt < T.rewind + 0.2 && F % 6 !== 4) {
    sketch(hx, hy, hz, 0.8);
    sketch(groundX, groundY - 0.03, groundZ, 0.8);
  }
  for (let i = sk; i < N * 2 + 4; i++) hide(m.sketch, i);
  for (const x of [m.parcels, m.discs, m.sketch]) x.instanceMatrix.needsUpdate = true;

  const arrowOn = tt >= T.arrow[0] && tt < T.rise[1] + 0.3;
  m.arrow.visible = arrowOn;
  if (arrowOn) {
    const k = ease(T.arrow[0], T.arrow[1], tt);
    V.set(-9.5, 3.6, 3.2);
    W.set(SLIT[0] - 0.7, SLIT[1] + 0.1, SLIT[2] + 0.25);
    m.arrow.position.lerpVectors(V, W, k);
    m.arrow.quaternion.setFromUnitVectors(Z, X.subVectors(W, V).normalize());
    m.arrow.scale.setScalar(1.15 * (1 - 0.7 * ease(T.rise[0], T.rise[1] + 0.3, tt)));
  }
  const slitK = ease(T.pierce, T.pierce + 0.18, tt) * (1 - ease(T.rise[1] - 0.1, T.rise[1] + 0.35, tt));
  m.slit.visible = slitK > 0.01;
  m.slit.position.set(SLIT[0], SLIT[1], SLIT[2]);
  m.slit.scale.set(0.6 + 0.4 * slitK, slitK, 1);
  m.slit.quaternion.copy(cam.quaternion);

  const ger = m.ger;
  const riseK = ease(T.rise[0], T.rise[1], tt);
  const stepK = ease(T.step[0], T.step[1], tt);
  ger.g.visible = riseK > 0.01;
  const gx = lerp(P.ger[0], P.gerStand[0], stepK);
  const gz = lerp(P.ger[2], P.gerStand[2], stepK);
  const gy = lerp(P.ger[1], P.gerStand[1], stepK) - 4 * (1 - riseK) + 0.06 * Math.sin(tt * 2.2);
  const gyaw = lerp(0.12, Math.atan2(P.dv[0] - gx, P.dv[2] - gz), ease(T.step[0] - 0.1, T.step[1], tt));
  ger.g.position.set(gx, gy, gz);
  ger.g.scale.setScalar(GER.s * (0.85 + 0.15 * riseK));
  ger.g.rotation.y = gyaw;
  ger.gem.material.color.setRGB(1, 0.5 + 0.2 * Math.sin(tt * 4), 0.62);
  const barrage = tt >= T.barrage[0] && tt < T.barrage[1];
  const cy = Math.cos(gyaw);
  const sy = Math.sin(gyaw);
  for (const [arm, side] of [[ger.armL, -1], [ger.armR, 1]]) {
    if (barrage && (F + (side > 0 ? 1 : 0)) % 2 === 0) {
      W.set(P.dv[0] - (gx + side * 0.64 * GER.s * cy), P.dv[1] + 1.5 - (gy + 2.82 * GER.s), P.dv[2] - (gz - side * 0.64 * GER.s * sy));
      W.applyAxisAngle(UP, -gyaw).normalize();
      arm.quaternion.setFromUnitVectors(NEG_Y, W);
    } else {
      arm.rotation.set(0.12 + 0.05 * Math.sin(tt * 1.9 + side), 0, side * (0.05 + 0.03 * Math.sin(tt * 1.4)));
    }
  }
  V.set(gx, gy + 2.82 * GER.s, gz);
  W.set(P.dv[0], P.dv[1] + 1.5, P.dv[2]).sub(V);
  const span = W.length();
  W.normalize();
  Q.setFromUnitVectors(Z, W);
  for (let j = 0; j < COUNTS.fists; j++) {
    if (!barrage) {
      hide(m.fists, j);
      continue;
    }
    const e = (F * 0.137 + j * 0.2139 + hash(j, 3)) % 1;
    const lat = ((j % 2) * 2 - 1) * (0.5 + 0.35 * hash(j, 4)) * GER.s + 0.22 * Math.sin(F * 1.3 + j);
    const run = 1.3 + e * (span - 1.8);
    const sc = (0.75 + 0.5 * e) * GER.s * 1.1;
    putQ(m.fists, j, V.x + W.x * run + lat * cy, V.y + W.y * run + 0.25 * Math.sin(F * 0.9 + j * 2.1), V.z + W.z * run - lat * sy, sc, sc, sc, Q);
  }
  m.fists.instanceMatrix.needsUpdate = true;
  for (let j = 0; j < COUNTS.sparks; j++) {
    if (!(barrage && (F + j) % 3 !== 0)) {
      hide(m.sparks, j);
      hide(m.sparks, j + COUNTS.sparks);
      continue;
    }
    const a = hash(F * 8 + j, 5) * 6.28;
    const rr = 0.2 + 0.7 * hash(F * 8 + j, 6);
    const sc = 0.34 + 0.4 * hash(F * 8 + j, 7);
    const sx = P.dv[0] + Math.cos(a) * rr;
    const syy = P.dv[1] + 1.2 + Math.sin(a) * rr * 1.2;
    putQ(m.sparks, j, sx, syy, P.dv[2] + 0.5, sc, sc, sc, cam.quaternion, a);
    putQ(m.sparks, j + COUNTS.sparks, sx, syy, P.dv[2] + 0.5, sc, sc, sc, cam.quaternion, a + 1.57);
  }
  m.sparks.instanceMatrix.needsUpdate = true;

  cam.getWorldQuaternion(CAMQ);
  for (let i = 0; i < COUNTS.flakes; i++) {
    const born = T.erase[0] - 0.1 + hash(i, 1) * 1.7;
    const life = 2.6 + 2.2 * hash(i, 2);
    const age = tt - born;
    if (age < 0 || age > life) {
      hide(m.flakes, i);
      continue;
    }
    const cls = i % 3;
    let x0;
    let y0;
    let z0;
    let sc;
    if (cls === 0) {
      x0 = -14 + 30 * hash(i, 3);
      y0 = 1 + 10 * hash(i, 4);
      z0 = L.Cz - L.B * 0.9 + 3 * hash(i, 5);
      sc = 0.5;
    } else if (cls === 1) {
      x0 = -40 + 80 * hash(i, 3);
      y0 = 10 + 22 * hash(i, 4);
      z0 = -70 - 25 * hash(i, 5);
      sc = 2.2;
    } else {
      x0 = L.Cx - L.aF * 0.8 + 1.6 * L.aF * hash(i, 3);
      y0 = 0.4 + 3 * hash(i, 4);
      z0 = L.Cz - 9 + 11 * hash(i, 5);
      sc = 0.32;
    }
    const grow = ease(0, 0.2, age) * (1 - ease(life - 0.5, life, age)) * sc;
    put(m.flakes, i, x0 + 0.5 * Math.sin(age * 1.7 + i), y0 - 0.9 * age - 0.35 * age * age * (cls === 1 ? 2.5 : 1), z0 + 0.3 * Math.cos(age * 1.3 + i), grow, grow, grow, age * (1 + hash(i, 6)), age * 1.4, age * 0.7);
  }
  m.flakes.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < COUNTS.bubbles; i++) {
    const a = (tt - 3.9 - hash(i, 1) * 2.4) / 5;
    if (!(a > 0 && a < 1 && tt < T.wipe[1] + 0.5)) {
      hide(m.bubbles, i);
      continue;
    }
    const sc = (0.2 + 0.3 * hash(i, 2)) * Math.sin(Math.PI * a);
    putQ(m.bubbles, i, L.Cx - 9 + 18 * hash(i, 3) + 0.4 * Math.sin(a * 9 + i), 0.5 + 6 * a * (0.5 + hash(i, 4)), L.Cz - 14 + 12 * hash(i, 5), sc, sc, sc, CAMQ);
  }
  m.bubbles.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < COUNTS.petals; i++) {
    const life = 4.5 + 2 * hash(i, 1);
    const age = tt - (T.wipe[0] - 0.1 + hash(i, 2) * 1.2);
    if (!(age > 0 && tt < T.zero[0] + 0.4)) {
      hide(m.petals, i);
      continue;
    }
    const a = (age % life) / life;
    const sc = (0.2 + 0.18 * hash(i, 5)) * Math.min(1, a * 8) * (1 - ease(0.88, 1, a));
    putQ(m.petals, i, L.Cx - 18 + 38 * a, 1 + 5 * hash(i, 3) + 1.2 * Math.sin(a * 11 + i) + 3.6 * a, L.Cz - 16 + 14 * hash(i, 4) + 1.2 * Math.cos(a * 7 + i), sc, sc, sc, CAMQ, age * (2 + hash(i, 6) * 3));
  }
  m.petals.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < COUNTS.flowers; i++) {
    const a = tt - (T.barrage[0] + 0.1 + (i / COUNTS.flowers) * 1.6);
    if (a < 0 || tt > T.zero[0] + 0.3) {
      hide(m.flowers, i);
      continue;
    }
    const near = i < 20;
    const ang = hash(i, 1) * 6.28;
    const rad = near ? 0.5 + 1.8 * hash(i, 2) : 1 + 6 * hash(i, 2);
    const fx = near ? P.dv[0] + Math.cos(ang) * rad : lerp(P.gerStand[0] + 1, P.dv[0], hash(i, 3)) + Math.cos(ang) * 0.7;
    const fz = near ? P.dv[2] + Math.sin(ang) * rad * 0.7 : lerp(P.gerStand[2], P.dv[2], hash(i, 3)) + Math.sin(ang) * 0.7;
    const sc = 0.9 * ease(0, 0.4, a) * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, a / 0.6))) * (0.7 + 0.5 * hash(i, 4));
    put(m.flowers, i, fx, floorY(L, fx - L.Cx, fz - L.Cz), fz, sc, sc, sc, 0, Math.atan2(cam.position.x - (DOCK[0] + s.x + fx), cam.position.z - (DOCK[2] + s.z + fz)), 0.08 * Math.sin(tt * 2 + i));
  }
  m.flowers.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < COUNTS.dust; i++) {
    const life = 5 + 3 * hash(i, 1);
    const age = tt - 1.3 - hash(i, 2) * life;
    if (age < 0 || tt > T.zero[0] + 0.3) {
      hide(m.dust, i);
      continue;
    }
    const a = (age % life) / life;
    const dx = L.Cx - L.aF * 0.7 + 1.4 * L.aF * hash(i, 3) + 0.8 * a;
    const dz = L.Cz - 10 + 14 * hash(i, 4);
    const sc = (0.08 + 0.1 * hash(i, 5)) * Math.sin(Math.PI * a);
    putQ(m.dust, i, dx, floorY(L, dx - L.Cx, dz - L.Cz) + 0.1 + 2.4 * a, dz, sc, sc, sc, CAMQ, a * 3);
  }
  m.dust.instanceMatrix.needsUpdate = true;

  const tanV = Math.tan((cam.fov * Math.PI) / 360);
  const asp = cam.aspect;
  const wsc = Math.min(asp, 1.7);
  const hudAt = (obj, nx, ny, nh, rot, k, edge = false) => {
    obj.visible = k > 0.001;
    obj.position.set(nx * tanV * HUD_D * (edge ? asp : wsc), ny * tanV * HUD_D, -HUD_D);
    obj.rotation.set(0, 0, rot);
    obj.scale.setScalar(Math.max(nh * tanV * HUD_D * k, 0.0001));
  };
  hudAt(m.don, 0.42 + 0.01 * odd, 0.4, 0.34, 0.1, tt >= T.don && tt < T.don + 1.2 ? pop(tt - T.don) * (1 - ease(T.don + 0.9, T.don + 1.2, tt)) : 0);
  const mu = tt - T.barrage[0];
  m.muda.forEach((mesh, i) => {
    const on = mu >= i * 0.07 && tt < T.lastBlow + 0.55;
    hudAt(mesh, ARC[i][0], ARC[i][1], 0.4, ARC[i][2], on ? pop(mu - i * 0.07) * (1 + 0.1 * (F % 2)) * (1 - ease(T.lastBlow + 0.3, T.lastBlow + 0.55, tt)) : 0);
  });
  m.ting.forEach((mesh, k) => {
    const side = k ? 1 : -1;
    let first = Infinity;
    for (const p of parcels) if (!p.band && p.side === side) first = Math.min(first, p.ring);
    const a = tt - first;
    V.set(DOCK[0] + s.x + L.Cx + side * L.poolX, DOCK[1] + poolLevel(L, side) + 1.3, DOCK[2] + s.z + L.Cz + L.poolV).project(cam);
    hudAt(mesh, V.x * (asp / wsc), V.y, 0.22, side * -0.1, a >= 0 && a < 1.1 ? pop(a) * (1 - ease(0.8, 1.1, a)) : 0);
  });
  let firstTear = Infinity;
  for (const p of parcels) if (p.band) firstTear = Math.min(firstTear, p.tear);
  const da = tt - firstTear - 0.4;
  V.set(DOCK[0] + s.x + saddle[0], DOCK[1] + saddle[1] + 1.1, DOCK[2] + s.z + saddle[2]).project(cam);
  hudAt(m.dots, V.x * (asp / wsc), V.y + 0.04, 0.12, 0, da >= 0 && tt < T.zero[0] ? pop(da) : 0);
  const gt = tt - T.gogogo;
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 3; i++) {
      const y = -0.62 + ((gt * 0.5 + i * 0.5 + side * 0.25) % 1.5);
      const on = gt > 0 && tt < T.zero[0] + 0.3 && y < 0.82;
      hudAt(m.gogo[side][i], (side ? 1 : -1) * 0.93, y, 0.26, (side ? -1 : 1) * 0.12, on ? pop(gt - i * 0.1) * (1 + 0.06 * (F % 2)) : 0, true);
    }
  }
  const pt = tt - T.pups;
  m.pups.forEach((mesh, j) => {
    mesh.visible = pt > j * 0.05 && tt < T.zero[0] + 0.3;
    if (!mesh.visible) {
      for (let k = 0; k < 2; k++) m.flips.setMatrixAt(j * 2 + k, M2.makeScale(0, 0, 0));
      return;
    }
    const pose = POSES[(Math.floor(tt * 6) + j * 2) % POSES.length];
    const sc = 0.2 * tanV * HUD_D * Math.min(1, 0.5 + (pt - j * 0.05) * 4);
    const hop = Math.max(0, Math.sin(Math.floor(tt * 6 + j) * 2.4)) * 0.03 * tanV * HUD_D;
    O.position.set(XS[j] * tanV * HUD_D * asp * 0.92, -0.77 * tanV * HUD_D + hop, -HUD_D);
    O.rotation.set(pose[1], pose[2], pose[0], "ZXY");
    O.scale.setScalar(sc);
    O.updateMatrix();
    mesh.matrix.copy(O.matrix);
    for (let k = 0; k < 2; k++) {
      const sd = k ? 1 : -1;
      M2.makeScale(sd, 1, 1).setPosition(sd * 0.27, 0.05, 0.22);
      M2.multiply(M.makeRotationZ(k ? pose[4] : pose[3]));
      M2.premultiply(O.matrix);
      m.flips.setMatrixAt(j * 2 + k, M2);
    }
  });
  m.flips.instanceMatrix.needsUpdate = true;
  m.tbc.visible = tt >= T.tbc[0] && tt < CREDIT + 0.15;
  if (m.tbc.visible) {
    const kk = ease(T.tbc[0], T.tbc[1], tt);
    m.tbc.position.set(lerp(-1.6, 0, kk) * tanV * HUD_D * wsc, -0.5 * tanV * HUD_D, -HUD_D);
    m.tbc.scale.setScalar(0.5 * tanV * HUD_D * (tt >= CREDIT ? Math.max(0.001, 1 - (tt - CREDIT) * 8) : 1));
  }

  return { over, zeroPup, amp };
}
