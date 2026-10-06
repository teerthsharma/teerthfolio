// E03 THE DISTRICT: 18 stone houses with red-tile hip roofs lining the square (5-9 m), a 22 m bell tower at (+10.5, -8.5), a 14 m arched
// gate with a half-raised portcullis at x = -25, foreground rubble and a collapsed beam (the key visual's embers-and-rubble foreground),
// lit windows. Painted through the engine's own anime surface (cel ramp, sepia hull), so the fresco post stack does the pigment.
//
// Pigments: roof lit #c0623a / mid #a0522d / shade #5b2e22; stone lit #d2b48a / mid #a98a62 / shade pushed to ultramarine-violet #5b4a66
// (never grey). Roof tile rows come from uStone mode 1 (running-bond blocks), cobbles are in terrain.js.
// Motion: the roofs are ONE merged layer-1 mesh that jumps 0.07 m for two drawings (since < 0.17 s) at each footfall; the bell swings
//   theta = 0.45 e^{-1.4 s} cos(7.5 s)  after each footfall (beats 4.6 + 0.9 n to 15.6).
// Staging law: nothing taller than 1 m lies within 6 m of the seal, so the seal is never covered.
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, LatheGeometry, TorusGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, painted } from "../../../sdf.js";
import { boulder, hipRoof } from "../../../kit3d.js";
import { C, cleanGeo, mix, timing } from "./pal.js";

const P = (geo, lit, shade, o) => painted(cleanGeo(geo), paint(lit, shade, o));
const box = (w, h, d, x, y, z) => new BoxGeometry(w, h, d).translate(x, y, z);

export function buildDistrict(ctx) {
  const { engine } = ctx;
  const R = ctx.rng("district"), H = timing(ctx);
  const stat = new Group(), roofG = new Group();
  roofG.userData.layer = 1;

  const walls = [], roofs = [], litWin = [], darkWin = [], woods = [], chims = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const hw = 4.2 + R() * 1.4, hd = 2.05 + R() * 0.15, wh = 5 + R() * 3.8;
      const z = 12 - i * 4.9 + (R() - 0.5) * 0.7, x = side * (31.2 + hw);
      const lit = mix(C.stoneLit, C.stoneMid, R() * 0.7);
      walls.push(P(box(hw * 2, wh, hd * 2, x, wh / 2, z), lit, C.violetShade));
      walls.push(P(box(hw * 2 + 0.3, 0.45, hd * 2 + 0.3, x, 0.22, z), C.stoneMid, C.stoneDeep));        // plinth
      const rh = 2.4 + R() * 1.8;
      const roofLit = mix(C.roofLit, C.roofMid, R() * 0.8);
      roofs.push(P(hipRoof(hw + 0.55, hd + 0.55, rh, 0.25, 12).translate(x, wh - 0.1, z), roofLit, C.roofShade));
      chims.push(P(box(0.75, 2.2, 0.75, x + (R() - 0.5) * hw, wh + rh * 0.45 + 0.6, z + (R() - 0.5) * hd), C.stoneMid, C.stoneDeep));
      // the square-facing wall carries the windows (it faces -side in x)
      const xf = x - side * hw - side * 0.05, rows = wh > 6.6 ? [2.1, 4.6] : [2.4];
      for (const y of rows) for (let k = -1; k <= 1; k++) {
        const g = box(0.12, 1.3, 0.9, xf, y, z + k * 1.35), on = R() < 0.55;
        (on ? litWin : darkWin).push(P(g, on ? C.ember : C.roofDeep, C.roofDeep, { id: 3 }));
      }
      woods.push(P(box(0.14, 2.2, 1.2, xf, 1.1, z + (R() - 0.5) * 1.2), C.wood, C.stoneDeep));
    }
  }

  // ---- the bell tower, 22 m at (10.5, -8.5)
  const TX = 10.5, TZ = -8.5, tower = [], dark = [];
  tower.push(P(box(5, 12, 5, TX, 6, TZ), C.stoneLit, C.violetShade));
  tower.push(P(box(5.6, 0.5, 5.6, TX, 12.25, TZ), C.stoneMid, C.stoneDeep));
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) tower.push(P(box(0.8, 3.4, 0.8, TX + dx, 14.2, TZ + dz), C.stoneLit, C.violetShade));
  tower.push(P(box(5.6, 0.6, 5.6, TX, 16.1, TZ), C.stoneMid, C.stoneDeep));
  dark.push(P(box(3.6, 3.2, 3.6, TX, 14.2, TZ), C.roofDeep, C.roofDeep));                               // the belfry's shadow
  const spire = new ConeGeometry(4.0, 4.6, 4, 1).rotateY(Math.PI / 4).translate(TX, 16.4 + 2.3, TZ);
  roofs.push(P(spire, C.roofLit, C.roofShade));
  tower.push(P(new ConeGeometry(0.25, 1.6, 6).translate(TX, 21.8 + 0.2, TZ), C.plateLit, C.plateShade));
  const clock = new CylinderGeometry(1.0, 1.0, 0.14, 24).rotateX(Math.PI / 2).translate(TX, 9.4, TZ + 2.55);
  tower.push(P(clock, "#e6d5b0", C.stoneShade));
  tower.push(P(box(0.1, 0.9, 0.05, TX, 9.7, TZ + 2.64), C.fissure, C.fissure));
  tower.push(P(box(0.7, 0.1, 0.05, TX + 0.3, 9.4, TZ + 2.64), C.fissure, C.fissure));

  // ---- the gate, 14 m, x = -25: two piers, a lintel, a half arch, a half-raised portcullis
  const GX = -25, GZ = -26, gate = [];
  for (const dx of [-4, 4]) gate.push(P(box(4, 11, 4, GX + dx, 5.5, GZ), C.stoneLit, C.violetShade));
  gate.push(P(box(12, 3.2, 4, GX, 12.4, GZ), C.stoneMid, C.stoneDeep));
  gate.push(P(new TorusGeometry(2.0, 0.55, 8, 24, Math.PI).translate(GX, 9.0, GZ + 2.05), C.stoneLit, C.violetShade));
  gate.push(P(box(4.1, 9.2, 0.4, GX, 4.6, GZ - 1.2), C.roofDeep, C.roofDeep));                          // the dark passage
  const bars = [];
  for (let k = 0; k < 9; k++) bars.push(P(box(0.12, 6.2, 0.12, GX - 1.8 + k * 0.45, 7.9, GZ + 1.9), "#8a8a84", C.stoneDeep));
  for (let k = 0; k < 4; k++) bars.push(P(box(4.0, 0.12, 0.12, GX, 5.2 + k * 1.6, GZ + 1.9), "#8a8a84", C.stoneDeep));

  // ---- foreground rubble and a collapsed beam (keep 6 m clear of the seal at the origin)
  const rub = [], beam = [];
  for (let k = 0; k < 30; k++) {
    const side = R() < 0.5 ? -1 : 1, x = side * (6 + R() * 17), z = -7 + R() * 15, s = 0.25 + R() * R() * 0.75;
    rub.push(boulder([s * 1.3, s * 0.7, s], [x, s * 0.2, z], k + 3, 1.0));
  }
  beam.push(P(box(8, 0.4, 0.4, 0, 0, 0).rotateZ(0.12).rotateY(0.5).translate(-11, 1.0, 3.5), "#4b3621", C.stoneDeep));
  beam.push(P(box(4, 0.35, 0.35, 0, 0, 0).rotateZ(-0.3).rotateY(-0.9).translate(-13.5, 0.6, 1.4), "#4b3621", C.stoneDeep));
  beam.push(P(boulder([1.4, 0.9, 1.2], [-8.2, 0.45, 3.2], 99, 1.2), C.stoneMid, C.violetShade));

  const matOf = (geos, id, stone, emit) => {
    const m = engine.prop(mergeGeometries(geos), id);
    if (stone) m.material.uniforms.uStone.value.set(...stone);
    if (emit) m.material.uniforms.uEmit.value.set(emit);
    return m;
  };
  stat.add(matOf(walls, 0.55, [1, 0.45, 0.35, 0.3]));
  stat.add(matOf(tower, 0.56, [1, 0.5, 0.4, 0.3]));
  stat.add(matOf(dark, 0.57));
  stat.add(matOf(gate, 0.58, [1, 0.4, 0.45, 0.3]));
  stat.add(matOf(bars, 0.59));
  stat.add(matOf(chims, 0.55, [1, 0.6, 0.4, 0.25]));
  stat.add(matOf(woods, 0.55));
  stat.add(matOf(darkWin, 0.55));
  stat.add(matOf(litWin, 0.55, null, "#200c00"));                                                        // lit windows glow below the bloom threshold
  stat.add(matOf(beam, 0.6));
  stat.add(matOf(rub.map((g) => P(g, C.stoneMid, C.violetShade)), 0.6, [2, 0.9, 0.7, 0.3]));

  const roofMesh = matOf(roofs, 0.54, [1, 2.4, 0.18, 0.12]);                                             // tile rows
  roofG.add(roofMesh);

  // ---- the bell: lathe profile, brass, pivoting at the belfry roof
  const prof = [[0.0, 0.0], [0.55, 0.0], [0.62, -0.25], [0.5, -0.8], [0.7, -1.1], [0.0, -1.1]].map(([x, y]) => new Vector2(x, y));
  const pivot = new Group(); pivot.position.set(TX, 15.9, TZ); pivot.userData.layer = 1;
  const bell = engine.prop(P(new LatheGeometry(prof, 16), "#c99a4a", C.sepia), 0.61);
  bell.position.y = 0; pivot.add(bell); roofG.add(pivot);

  const group = new Group(); group.add(stat, roofG);
  return {
    group,
    update(t, dt, cue) {
      const { n, s } = H.foot(t, cue);
      roofMesh.position.y = n >= 0 && s < 0.17 ? 0.07 : 0;
      pivot.rotation.x = n >= 0 ? 0.45 * Math.exp(-1.4 * s) * Math.cos(7.5 * s) : 0;
    },
    dispose() { group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); },
  };
}
