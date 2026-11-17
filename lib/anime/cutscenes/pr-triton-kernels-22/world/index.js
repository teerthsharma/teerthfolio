// WORLD for pr-triton-kernels-22: the live cutscene's manga-ink Shibuya and Malevolent Shrine, ported shader for shader
// (../live/: ink, city, shrine, sky), driven by the live clock (../clock.js), and the island it is drawn over (island.js).
// All of it is the plate (layer 0), redrawn every step (the shots are `moving`), so drawn effects pass over it and behind the seal.
// Frame: the seal at the origin, the avenue toward -z turned by YAW about the seal, the island as it stands round the dock point.
import { Color, Euler, Group, IcosahedronGeometry, Mesh, Object3D, OctahedronGeometry, Quaternion, ShaderMaterial, Vector3 } from "three";
import { K, Mesher, hash, inkMaterial, inkUniforms } from "../live/ink.js";
import { LAMPS, buildCity, lampGeometry } from "../live/city.js";
import { HINGE, MOUTH, buildShrine } from "../live/shrine.js";
import { groundGeometry, groundMaterial, skyGeometry, skyMaterial } from "../live/sky.js";
import { hide, inst, put } from "../live/fx.js";
import { buildIsland } from "./island.js";
import { BACK, BLOCK, DOCK, LINE, NB, ROWS, SHRINE_Z, T, TRI_AT, YAW, smooth, warp } from "../clock.js";
import { tone } from "../tone.js";

const NOMOVE = [0, 0, 0, 1], LOOP = 2.6, AT = new Vector3(...DOCK), EYE = new Vector3();
const CELLS = [];
for (let q = 0; q < NB; q++) for (let k = 0; k <= q; k++) CELLS.push({ q, k, on: ROWS[q].includes(k) });
const CUT = CELLS.filter((c) => !c.on);
const { C, GAP } = BLOCK;
const bx = (c) => (c.k - c.q / 2) * (C + GAP);
const by = (c) => (NB - 1 - c.q) * (C + GAP) + C / 2;
const SP = 160, DB = 90, GL = 90, DU = 56, FK = 130;
const O = new Object3D();
const COL = new Color();
const QA = new Quaternion(), QB = new Quaternion(), EU = new Euler(), S3 = [0, 0, 0];

function blockGeometry() {
  const M = new Mesher();
  M.box(0, 0, 0, 1, 1, 1, [K.ice, 0.8, 0, 0.5]);
  return M.geometry();
}
function wedgeGeometry() {
  const M = new Mesher();
  const a = [-0.5, -0.5], b = [0.5, -0.5], c = [-0.5, 0.5], f = (p, z) => [p[0], p[1], z], info = [K.ice, 0.8, 0, 0.5], mid = [-0.17, -0.17, 0];
  M.poly([f(a, 0.5), f(b, 0.5), f(c, 0.5)], info, NOMOVE, 0, mid);
  M.poly([f(a, -0.5), f(c, -0.5), f(b, -0.5)], info, NOMOVE, 0, mid);
  M.poly([f(a, 0.5), f(a, -0.5), f(b, -0.5), f(b, 0.5)], info, NOMOVE, 0, mid);
  M.poly([f(b, 0.5), f(b, -0.5), f(c, -0.5), f(c, 0.5)], info, NOMOVE, 0, mid);
  M.poly([f(c, 0.5), f(c, -0.5), f(a, -0.5), f(a, 0.5)], info, NOMOVE, 0, mid);
  return M.geometry();
}
function rockGeometry() {
  const M = new Mesher(), c = [];
  for (const k of [-1, 1]) for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) c.push([a * 0.5 * (0.7 + 0.5 * hash(c.length, 1)), k * 0.5 * (0.6 + 0.6 * hash(c.length, 2)), b * 0.5 * (0.7 + 0.5 * hash(c.length, 3))]);
  M.hexa(c, (f) => (f < 2 ? [K.cut, 0.95, 0, 0.2] : [K.window, 0.45, 0, 0.3]), NOMOVE);
  return M.geometry();
}
function puffGeometry() {
  const M = new Mesher(), P = new IcosahedronGeometry(0.5, 0).attributes.position;
  for (let i = 0; i < P.count; i += 3) M.poly([0, 1, 2].map((k) => [P.getX(i + k), P.getY(i + k), P.getZ(i + k)]), [K.bone, 0.93, 0, 0.5], NOMOVE, 0b111, [0, 0, 0]);
  return M.geometry();
}
// sparks, glass and ink flakes: one set of one geometry, one flat ink each (instance colour), at the page's own id so the engine inks no line round them
const fleck = () => new ShaderMaterial({
  vertexShader: "varying vec3 vC; void main() { vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
  fragmentShader: "varying vec3 vC; void main() { gl_FragColor = vec4(vC, 0.99); }",
});

export default function build(ctx) {
  const U = inkUniforms();
  const city = buildCity(), sh = buildShrine(), island = buildIsland();
  const mats = { city: inkMaterial(U), shrine: inkMaterial(U, { shrine: true }), blocks: inkMaterial({ ...U, uReveal: { value: 999 } }), ground: groundMaterial(U), sky: skyMaterial(U), fleck: fleck() };
  for (const m of Object.values(mats)) tone(m); // the page prints through the site's last stage
  const geo = { lamp: lampGeometry(), rock: rockGeometry(), puff: puffGeometry(), block: blockGeometry(), wedge: wedgeGeometry(), oct: new OctahedronGeometry(1, 0) };
  const cityMesh = new Mesh(city.geometry, mats.city), body = new Mesh(sh.body, mats.shrine), jaw = new Mesh(sh.jaw, mats.shrine), ground = new Mesh(groundGeometry(), mats.ground), skyM = new Mesh(skyGeometry(), mats.sky);
  for (const o of [cityMesh, body, jaw, ground, skyM]) o.frustumCulled = false;
  ground.renderOrder = -1;
  skyM.renderOrder = -3;
  const setAll = (mesh, list) => { list.forEach((q, i) => { O.position.set(q.x, q.y, q.z); O.rotation.set(q.rx, q.ry, q.rz); O.scale.setScalar(q.s); O.updateMatrix(); mesh.setMatrixAt(i, O.matrix); }); mesh.instanceMatrix.needsUpdate = true; };
  const skulls = inst(sh.skull, mats.shrine, sh.skulls.length), bones = inst(sh.bone, mats.shrine, sh.bones.length);
  setAll(skulls, sh.skulls);
  setAll(bones, sh.bones);
  const lamps = inst(geo.lamp, mats.city, LAMPS.length), debris = inst(geo.rock, mats.city, DB), dust = inst(geo.puff, mats.city, DU);
  const blocks = inst(geo.block, mats.blocks, CELLS.length), wedges = inst(geo.wedge, mats.blocks, CUT.length * 2);
  for (let i = 0; i < CELLS.length; i++) blocks.setColorAt(i, COL.setRGB(0, 0, 0));
  for (let i = 0; i < CUT.length * 2; i++) wedges.setColorAt(i, COL.setRGB(0, 0, 0));
  const flecks = inst(geo.oct, mats.fleck, SP + GL + FK), GL0 = SP, FK0 = SP + GL;
  for (let i = 0; i < SP; i++) flecks.setColorAt(i, COL.set(i % 3 ? "#f4efe2" : "#d1081f"));
  for (let i = 0; i < GL; i++) flecks.setColorAt(GL0 + i, COL.set("#f4efe2"));
  for (let i = 0; i < FK; i++) flecks.setColorAt(FK0 + i, COL.set(i % 5 ? "#0e0b0d" : "#b3081c"));

  const group = new Group(), page = new Group(), rig = new Group(), cityG = new Group(), shrineG = new Group(), jawG = new Group(), mouthG = new Group(), triG = new Group(), triRoot = new Group();
  group.add(island.group, page);
  page.add(rig, triRoot);
  rig.add(skyM, cityG);
  cityG.rotation.y = YAW;
  triRoot.rotation.y = YAW;
  cityG.add(ground, cityMesh, lamps, debris, dust, flecks, shrineG);
  shrineG.position.set(0, 0, SHRINE_Z);
  shrineG.scale.setScalar(0.9);
  shrineG.visible = false;
  shrineG.add(body, skulls, bones, jawG);
  jawG.position.set(...HINGE);
  jawG.add(jaw);
  mouthG.position.set(...MOUTH);
  shrineG.add(mouthG);
  triRoot.add(triG);
  triG.add(blocks, wedges);
  triG.position.set(...TRI_AT);
  rig.visible = false;

  return {
    group,
    update(t, dt, cue) {
      const tt = warp(t), erase = smooth(T.erase[0], T.erase[1], tt), draw = smooth(T.draw[0], T.draw[1], tt), flex = warp(LINE.C);
      // the hold: the frame's shake is calmed for the seal's sake (menace.calm), so the page takes the rest of it here, turned about the lens
      const cam = ctx.player?.camera, calm = cue?.shot?.menace ? cue.shot.menace.calm ?? 0.25 : 1;
      page.position.set(0, 0, 0); page.quaternion.identity();
      if (calm < 1 && cam) {
        const s = ctx.player.law.shake(t, S3), k = ((1 - calm) * cam.fov * Math.PI) / 180;
        QA.copy(cam.quaternion).multiply(QB.setFromEuler(EU.set(s[1] * k, s[0] * k, 0))).multiply(QB.copy(cam.quaternion).invert());
        page.quaternion.copy(QA); page.position.copy(EYE.copy(cam.position).sub(AT)).applyQuaternion(QA).negate().add(EYE);
      }
      const inkOn = tt > 1.12 && erase < 1;
      rig.visible = inkOn;
      island.page(inkOn && tt <= T.erase[0], t < LINE.impact || t >= BACK); // the island is whole again behind the page from the first rub
      const rise = smooth(T.rise[0], T.rise[1], tt), bk = rise < 1 ? rise + 0.1 * Math.sin(rise * Math.PI) : 1;
      shrineG.position.y = -55 * (1 - bk);
      const dis = smooth(T.dis[0], T.dis[1], tt);
      shrineG.visible = rise > 0 && dis < 0.99;
      const speak = tt > LINE.A && tt < LINE.A + 1.0 ? (Math.floor(tt * 6) % 2 ? 0.4 : 0.1) : 0;
      const gape = smooth(T.barrage - 0.2, T.barrage + 0.2, tt) * 0.52;
      jawG.rotation.x = (Math.max(speak, gape) + 0.05 * rise) * (1 - smooth(T.close[0], T.close[1], tt));
      group.updateWorldMatrix(true, true);
      U.uT.value = tt;
      U.uDpr.value = ctx.engine.renderer?.getPixelRatio?.() ?? 1;
      U.uReveal.value = 200 * draw * (1 - erase) - 10 * erase;
      U.uCenter.value.copy(AT);
      mouthG.getWorldPosition(U.uMouth.value);
      cityG.localToWorld(U.uPoolC.value.set(0, 0, SHRINE_Z + 20));
      U.uPoolR.value = 115 * smooth(T.pool[0], T.pool[1], tt);
      U.uSkyK.value = smooth(1.3, 3.2, tt) * (1 - smooth(T.drain[0], T.drain[1], tt));
      U.uOffA.value = 5.6;
      U.uOffB.value = 2.8;
      U.uDis.value = dis * 0.985;
      const su = mats.sky.uniforms;
      su.uSkyVis.value = smooth(T.sky[0], T.sky[1], tt) * (1 - erase);
      su.uFlare.value = tt > T.barrage && tt < T.barrageEnd ? 1 : Math.max(0, 1 - Math.abs(tt - T.final - 0.05) / 0.15);
      su.uBurst.value = smooth(T.barrage, T.barrage + 0.2, tt) * (1 - smooth(T.barrageEnd, T.barrageEnd + 0.3, tt)) + Math.max(0, 1 - Math.abs(tt - LINE.A - 0.3) / 0.5) * 0.7;

      // the triangle of ice blocks: rises from the pool; the Cleave splits every unscheduled block; the schedule lights, stands on the island and walks its pulse
      // (what is cut is gone when the rub-out ends; the pulse walks again every LOOP s until the collapse takes the triangle out)
      const back = smooth(T.erase[1] - 0.4, T.erase[1], tt);
      const appear = smooth(T.tri[0], T.tri[1], tt) * (1 - smooth(warp(LINE.collapse[0]), warp(LINE.collapse[1]), tt));
      const lit = smooth(T.lit, T.lit + 0.2, tt);
      triG.visible = appear > 0.001;
      const walk = tt > flex ? flex + ((tt - flex) % LOOP) : tt;
      let ci = 0;
      for (let i = 0; i < CELLS.length; i++) {
        const c = CELLS[i], x = bx(c), y = by(c);
        if (c.on) {
          const ts = flex + 0.17 * c.q + 0.025 * ROWS[c.q].indexOf(c.k);
          const pulse = walk > ts && walk < ts + 0.3 ? Math.sin(((walk - ts) / 0.3) * Math.PI) : 0;
          const sc = C * appear * (1 + 0.2 * pulse);
          put(blocks, i, x, y - (1 - appear) * 1.5, 0, sc, sc, C * appear);
          blocks.setColorAt(i, COL.setRGB(lit, pulse, 0));
        } else {
          const tc = T.cutTri + hash(i, 2) * 0.35 + ((c.q + c.k) / (2 * NB)) * 0.3, cutNow = tt >= tc;
          const gone = 1 - back;
          put(blocks, i, x, y - (1 - appear) * 1.5, 0, cutNow ? 0.0001 : C * appear * gone, C * appear * gone, C * appear * gone);
          blocks.setColorAt(i, COL.setRGB(0, 0, 0));
          const u = Math.min(1, Math.max(0, (tt - tc) / (T.land - tc)));
          for (let h = 0; h < 2; h++) {
            const dir = h ? 1 : -1, slide = 0.5 * Math.min(1, (tt - tc) / 0.25) * dir, keep = cutNow ? Math.max(0.0001, C * gone) : 0.0001;
            put(wedges, ci * 2 + h, x + slide * 0.7, y - y * u * u + (cutNow ? 0 : -9), 0.05 * dir, keep, keep, C, 0, 0, (h ? Math.PI : 0) + dir * 0.3 * u * (1 - u));
            wedges.setColorAt(ci * 2 + h, COL.setRGB(0, 0, 0));
          }
          ci++;
        }
      }
      wedges.visible = tt >= T.cutTri;
      blocks.instanceMatrix.needsUpdate = wedges.instanceMatrix.needsUpdate = true;
      blocks.instanceColor.needsUpdate = wedges.instanceColor.needsUpdate = true;

      for (let i = 0; i < LAMPS.length; i++) {
        const l = LAMPS[i], t0 = 5.75 + 0.1 * i, k = Math.min(1, Math.max(0, (tt - t0) / 0.95));
        const th = 1.46 * k * k + (k >= 1 ? 0.07 * Math.exp(-(tt - t0 - 0.95) * 6) * Math.cos((tt - t0) * 22) : 0);
        O.position.set(l.x, 0, l.z);
        O.rotation.set(0, l.side > 0 ? Math.PI : 0, l.side * th, "ZYX");
        O.scale.setScalar(1);
        O.updateMatrix();
        lamps.setMatrixAt(i, O.matrix);
      }
      lamps.instanceMatrix.needsUpdate = true;

      const cuts = city.cuts;
      let n = 0, f = 0; // what is alive in each set: a set with nothing alive is not drawn
      for (let i = 0; i < SP; i++) {
        const near = i >= 110, c = near ? null : cuts[i % cuts.length], ts = near ? T.cutTri + hash(i, 1) * 0.9 : c.t + hash(i, 1) * 0.6, tau = tt - ts;
        if (tau < 0 || tau > 0.9) { hide(flecks, i); continue; }
        const ox = near ? TRI_AT[0] + (hash(i, 2) - 0.5) * 3.4 : c.x + (hash(i, 2) - 0.5) * c.w, oy = near ? 0.3 + hash(i, 3) * 3.4 : c.y + (hash(i, 3) - 0.5) * 5, oz = near ? TRI_AT[2] + 0.3 : c.z + (hash(i, 4) - 0.2) * c.w * 0.5;
        const sp = near ? 3 : 9, q = 0.2 * (1 - tau / 0.9) * (near ? 0.35 : 1); f++;
        put(flecks, i, ox + (hash(i, 5) - 0.5) * sp * tau, oy + (2 + 5 * hash(i, 6)) * tau - 4.5 * tau * tau, oz + (hash(i, 7) - 0.5) * sp * tau, q * 0.6, q * 1.6, q * 0.6, tau * 6, tau * 4, hash(i, 8) * 3);
      }
      for (let i = 0; i < GL; i++) {
        const tau = tt - (T.barrage + 0.3 + hash(i, 1) * 2.4);
        if (tau < 0 || tau > 1.3) { hide(flecks, GL0 + i); continue; }
        const q = 0.34 * Math.abs(Math.sin(tau * 21 + hash(i, 2) * 9)) * (1 - tau / 1.3); f++;
        put(flecks, GL0 + i, (hash(i, 3) - 0.5) * 62, 8 + hash(i, 4) * 34 - 7 * tau, -10 - hash(i, 5) * 40 + Math.sin(tau * 3 + i) * 0.6, q * 0.5, q * 1.5, q * 0.5, 0, tau * 3, 0.4);
      }
      for (let i = 0; i < DB; i++) {
        const c = cuts[i % cuts.length], tau = tt - (c.t + 0.25 + hash(i, 1) * 0.5);
        if (tau < 0) { hide(debris, i); continue; }
        n++;
        const sz = 0.7 + 1.8 * hash(i, 2), run = Math.min(tau, 1.6), y = Math.max(sz * 0.4, c.y + (1 + 3 * hash(i, 5)) * tau - 4.9 * tau * tau), rest = y <= sz * 0.4 + 0.01;
        put(debris, i, c.x + (hash(i, 6) - 0.5) * c.w * 0.7 + (hash(i, 3) - 0.5) * 9 * run, y, c.z + (hash(i, 7) - 0.1) * c.w * 0.4 + (hash(i, 4) - 0.2) * 6 * run, sz, sz * 0.8, sz, rest ? 0.3 : tau * 2.4, hash(i, 8) * 6, rest ? 0.2 : tau * 1.9);
      }
      debris.visible = n > 0; n = 0; debris.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < DU; i++) {
        const c = cuts[i % cuts.length], tau = (tt - (c.t + 0.55 + hash(i, 1) * 0.5)) / 2.0;
        if (tau < 0 || tau > 1) { hide(dust, i); continue; }
        const sz = (3 + 5 * hash(i, 2)) * Math.sqrt(tau) * (1 - tau * tau); n++;
        put(dust, i, c.x + (hash(i, 3) - 0.5) * c.w * 0.9, sz * 0.35, c.z + (hash(i, 4) - 0.1) * c.w * 0.6, sz, sz * 0.7, sz, hash(i, 5), tau * 0.6, 0);
      }
      dust.visible = n > 0; dust.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < FK; i++) {
        const tau = tt - (T.dis[0] + hash(i, 1) * 0.75);
        if (tau < 0 || tau > 1.3) { hide(flecks, FK0 + i); continue; }
        const q = 0.5 * Math.sqrt(1 - tau / 1.3); f++;
        put(flecks, FK0 + i, (hash(i, 2) - 0.5) * 48 + 2 * tau, 5 + hash(i, 3) * 36 + (3 + 5 * hash(i, 4)) * tau, SHRINE_Z + (hash(i, 5) - 0.4) * 24, q, q * 1.4, q * 0.3, tau * 3, tau * 2, hash(i, 6) * 6);
      }
      flecks.visible = f > 0; flecks.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      island.dispose();
      for (const g of [...Object.values(geo), city.geometry, sh.body, sh.jaw, sh.skull, sh.bone, ground.geometry, skyM.geometry]) g.dispose();
      for (const x of Object.values(mats)) x.dispose();
      for (const x of [skulls, bones, lamps, debris, dust, blocks, wedges, flecks]) x.dispose();
    },
  };
}
