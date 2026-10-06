// THE THRONE ROOM HALL (static art, layer 0). Bible "Throne Room hall": 40 m long, 18 m wide, pillars 14 m, stair of
// 7 steps at 0.4 m (TOP_Y 2.8), crimson carpet, painted-gradient floor and walls, 2 px block joints, flat fills, no noise.
//
// COORDINATES. The hero seal stands at the origin on the circle (radius 8) and faces +z, so the camera sees the hall
// BEHIND it: the stair and throne rise toward -z. The stair foot is therefore at z = -8.4 (just outside the circle) and the
// throne sits on the dais at z = -16.4 (the bible's -11.4 is relative to a stair foot at -3; the circle forces the shift).
// Hall box: x in [-9, 9], z in [-20, 20], walls 26 m (the ceiling is lost in the dark), pillars 14 m.
//
// SINGLE-SIDED ENVELOPE: walls, ceiling and floor are one-sided planes facing in. The pull-back wide (r up to 15 m at
// az 0.7, so x = 9.7) puts the lens OUTSIDE the right wall: that wall culls, the lens sees through it to the far wall,
// and the plate (the violet vault) shows beyond. "The island recedes into a purple vault."
//
// SHADING MATHS. The anime program banks N.L into two hard bands (flat 0.82); our contribution is the PAINTED GRADIENT
// carried per vertex: col(y) = mix(stoneLit, stoneShade, smoothstep(0, H, y)) on pillars and walls, because the key light
// is the circle and the throne's gold BELOW (light falls off upward), and col(d) = mix(stoneLit, stoneShade, smoothstep(0,
// 17, |p.xz|)) on the floor (radial pool of light around the circle).
import { BoxGeometry, CylinderGeometry, PlaneGeometry, ShapeGeometry, Shape, TorusGeometry, ConeGeometry } from "three";
import { C, part, grad, joined, mix, darken } from "./helpers.js";

export const HALL = { x: 9, z0: -20, z1: 20, H: 26, PH: 14, STEPS: 7, RISE: 0.4, TREAD: 0.9, FOOT: -8.4, TOP: 2.8, PX: 6.5 };
export const PILLAR_Z = Array.from({ length: 9 }, (_, i) => -17 + i * 4.5); // -17 .. 19

export function buildHall(engine, group) {
  const { x: X, z0, z1, H, PH, STEPS, RISE, TREAD, FOOT, PX } = HALL;
  const L = z1 - z0;
  const prop = (geo, id, ink = false) => { const m = engine.prop(geo, id); if (ink) engine.ink(m, 1); group.add(m); return m; };

  // ---- FLOOR: segmented plane, radial painted gradient pooled at the circle -------------------------------------
  const floor = part(new PlaneGeometry(2 * X, L, 18, 40).rotateX(-Math.PI / 2), C.stoneMid, C.stoneShade);
  grad(floor, (x, y, z) => { const t = Math.min(1, Math.hypot(x, z) / 17); const s = t * t * (3 - 2 * t); return [mix(C.stoneLit, C.stoneShade, s), mix(C.stoneMid, C.deep, s)]; });
  prop(floor, 0.5);

  // ---- FLOOR JOINTS: 2 px dark seams every 3 m (thin one-sided strips just above the floor) ----------------------
  const seams = [];
  for (let x = -X + 3; x < X; x += 3) seams.push(part(new PlaneGeometry(0.07, L).rotateX(-Math.PI / 2).translate(x, 0.012, 0), C.deep, C.deep));
  for (let z = z0 + 3; z < z1; z += 3) seams.push(part(new PlaneGeometry(2 * X, 0.07).rotateX(-Math.PI / 2).translate(0, 0.012, z), C.deep, C.deep));
  prop(joined(seams, "floor seams"), 0.5);

  // ---- WALLS: painted vertical gradient violet -> black (lit at the base, deep at the top), 4 planes --------------
  const mkWall = (w, rotY, pos) => {
    const g = part(new PlaneGeometry(w, H, 1, 13).translate(0, H / 2, 0), C.stoneMid, C.stoneShade);
    grad(g, (x, y) => { const s = Math.min(1, y / H), k = s * s * (3 - 2 * s); return [mix(C.stoneMid, C.deep, k), mix(C.stoneShade, C.deep, k)]; });
    return g.rotateY(rotY).translate(...pos); // rotateY(+pi/2) turns the +z normal to +x (left wall faces in)
  };
  prop(joined([
    mkWall(L, Math.PI / 2, [-X, 0, 0]), mkWall(L, -Math.PI / 2, [X, 0, 0]),
    mkWall(2 * X, 0, [0, 0, z0]), mkWall(2 * X, Math.PI, [0, 0, z1]),
  ], "walls"), 0.5);

  // block joints: rows every 1.5 m (11 rows; above that the dark eats them), staggered verticals every 3 m
  const joints = [], jc = darken(C.stoneShade, 0.5);
  for (const side of [-1, 1]) {
    const off = side * (X - 0.02), rot = -side * Math.PI / 2;
    for (let r = 0; r < 11; r++) {
      const y = 1.5 * (r + 1);
      joints.push(part(new PlaneGeometry(L, 0.06).rotateY(rot).translate(off, y, 0), jc, jc));
      for (let z = z0 + 1.5 * (r % 2); z < z1; z += 3) joints.push(part(new PlaneGeometry(0.06, 1.5).rotateY(rot).translate(off, y - 0.75, z), jc, jc));
    }
  }
  prop(joined(joints, "block joints"), 0.5);

  // ---- CEILING lost in the dark: one plane facing down ------------------------------------------------------------
  prop(part(new PlaneGeometry(2 * X, L).rotateX(Math.PI / 2).translate(0, H, 0), C.deep, C.deep), 0.5);

  // ---- PILLARS: base, plinth, 10-sided shaft with a height gradient, capital, 4 engaged ribs, gold band -----------
  const pil = [];
  const hgrad = (g) => grad(g, (x, y) => { const s = Math.min(1, Math.max(0, y / PH)); return [mix(C.stoneLit, C.stoneShade, s * 0.95), mix(C.stoneMid, C.deep, s)]; });
  for (const sx of [-1, 1]) for (const z of PILLAR_Z) {
    const x = sx * PX;
    pil.push(part(new BoxGeometry(2.1, 0.5, 2.1).translate(x, 0.25, z), C.stoneMid, C.stoneShade));
    pil.push(part(new BoxGeometry(1.6, 0.6, 1.6).translate(x, 0.8, z), C.stoneLit, C.stoneMid));
    pil.push(hgrad(part(new CylinderGeometry(0.55, 0.68, PH - 2.2, 10, 8).translate(x, 1.1 + (PH - 2.2) / 2, z), C.stoneLit, C.stoneMid)));
    pil.push(part(new CylinderGeometry(1.05, 0.62, 0.9, 10).translate(x, PH - 0.55, z), C.stoneMid, C.stoneShade));
    pil.push(part(new BoxGeometry(2.3, 0.35, 2.3).translate(x, PH - 0.1, z), C.stoneMid, C.stoneShade));
    for (const [dx, dz] of [[0.62, 0], [-0.62, 0], [0, 0.62], [0, -0.62]]) pil.push(hgrad(part(new BoxGeometry(dx ? 0.16 : 0.3, PH - 2.8, dz ? 0.16 : 0.3, 1, 4, 1).translate(x + dx, 1.4 + (PH - 2.8) / 2, z + dz), C.stoneLit, C.stoneMid)));
    pil.push(part(new CylinderGeometry(0.72, 0.72, 0.16, 10).translate(x, PH - 1.15, z), C.goldMid, C.goldShade)); // the 4 px gold bar
  }
  prop(joined(pil, "pillars"), 0.5, true);

  // ---- GOTHIC ARCHES. A pointed arch of half-span a and radius R (R >= a) is two arcs; the LEFT arc is centred at
  // x = R - a (it passes through the left spring at x = -a), the right arc mirrors it. With c = acos((R - a) / R):
  //   left arc runs angle (pi - c .. pi), right arc angle (0 .. c), apex height = R sin c = sqrt(2 a R - a^2).
  // Transverse nave arches: a = 6.5, R = 8 -> apex 7.9 m over the PH = 14 springline (21.9 m, under the 26 m ceiling).
  // Arcade arches along each pillar row: a = 2.25, R = 3 -> apex 2.9 m.
  const arch = (a, R, tube, alongZ) => {
    const c = Math.acos((R - a) / R);
    const arcs = [
      part(new TorusGeometry(R, tube, 6, 14, c).rotateZ(Math.PI - c).translate(R - a, PH, 0), C.stoneMid, C.stoneShade),
      part(new TorusGeometry(R, tube, 6, 14, c).translate(-(R - a), PH, 0), C.stoneMid, C.stoneShade),
    ];
    return arcs.map((g) => { grad(g, (x, y) => { const s = Math.min(1, (y - PH) / 9); return [mix(C.stoneLit, C.stoneShade, s), mix(C.stoneMid, C.deep, s)]; }); return alongZ ? g.rotateY(Math.PI / 2) : g; });
  };
  const ribs = [];
  for (const z of PILLAR_Z) for (const g of arch(PX, 8, 0.42, false)) ribs.push(g.clone().translate(0, 0, z));
  for (const sx of [-1, 1]) for (let i = 0; i < PILLAR_Z.length - 1; i++) {
    const zc = (PILLAR_Z[i] + PILLAR_Z[i + 1]) / 2;
    for (const g of arch(2.25, 3, 0.3, true)) ribs.push(g.clone().translate(sx * PX, 0, zc));
  }
  prop(joined(ribs, "arches"), 0.5, true);

  // ---- STAIR: 7 steps 0.4 high x 0.9 deep, nested boxes, gold edge bars, crimson carpet over treads and risers ---
  const stair = [], trim = [], carp = [];
  for (let i = 0; i < STEPS; i++) {
    const zf = FOOT - i * TREAD, len = zf - z0, h = (i + 1) * RISE;
    stair.push(part(new BoxGeometry(2 * 4.2, h, len).translate(0, h / 2, zf - len / 2), i % 2 ? C.stoneLit : mix(C.stoneLit, C.stoneMid, 0.5), C.stoneMid));
    trim.push(part(new BoxGeometry(2 * 4.2, 0.06, 0.1).translate(0, h + 0.01, zf - 0.05), C.goldMid, C.goldShade));
    carp.push(part(new BoxGeometry(3.6, 0.03, TREAD).translate(0, h + 0.02, zf - TREAD / 2), C.carpet, C.carpetShade));
    carp.push(part(new BoxGeometry(3.6, RISE, 0.03).translate(0, h - RISE / 2, zf + 0.01), C.carpetShade, C.deep));
  }
  prop(joined(stair, "stair"), 0.5, true);
  prop(joined(trim, "stair trim"), 0.5);

  // ---- CARPET along the nave (x +-1.8, z 20 -> stair foot), gold edge bars and a diamond every 2 m ---------------
  const cz0 = FOOT, cL = z1 - cz0, cm = (z1 + cz0) / 2;
  carp.push(part(new PlaneGeometry(3.6, cL).rotateX(-Math.PI / 2).translate(0, 0.03, cm), C.carpet, C.carpetShade));
  for (const sx of [-1, 1]) {
    carp.push(part(new PlaneGeometry(0.16, cL).rotateX(-Math.PI / 2).translate(sx * 1.78, 0.035, cm), C.goldMid, C.goldShade));
    carp.push(part(new PlaneGeometry(0.1, cL).rotateX(-Math.PI / 2).translate(sx * 1.55, 0.036, cm), C.carpetShade, C.carpetShade));
  }
  const dia = new Shape(); dia.moveTo(0, 0.6); dia.lineTo(0.45, 0); dia.lineTo(0, -0.6); dia.lineTo(-0.45, 0); dia.closePath();
  for (let z = cz0 + 1.2; z < z1 - 1; z += 2) carp.push(part(new ShapeGeometry(dia).rotateX(-Math.PI / 2).translate(0, 0.04, z), C.goldMid, C.goldShade));
  prop(joined(carp, "carpet"), 0.5);

  // ---- WALL SCONCES: gold bowls with a flat violet flame, one between every pillar pair on the long walls -----
  const scon = [];
  for (const sx of [-1, 1]) for (let i = 0; i < PILLAR_Z.length - 1; i++) {
    const zc = (PILLAR_Z[i] + PILLAR_Z[i + 1]) / 2, x = sx * (X - 0.5);
    scon.push(part(new CylinderGeometry(0.34, 0.2, 0.3, 8).translate(x, 4.4, zc), C.goldMid, C.goldShade));
    scon.push(part(new BoxGeometry(0.18, 0.9, 0.18).translate(sx * (X - 0.15), 4.0, zc), C.goldShade, C.deep));
    scon.push(part(new ConeGeometry(0.22, 0.7, 6).translate(x, 4.9, zc), C.purple, C.purpleDeep));
  }
  const sc = prop(joined(scon, "sconces"), 0.5);
  sc.material.uniforms.uEmit.value.set(0.05, 0.02, 0.1); // far below the 0.25 circle budget

  // mist pooled at the base, violet, ramping in with distance (material height fog): uFog = (amount, yCentre, scale, dist)
  group.traverse((o) => { const u = o.material?.uniforms; if (u?.uFog) { u.uFog.value.set(0.5, 0, 5, 60); u.uFogCol.value.set(C.stoneShade); } });
}
