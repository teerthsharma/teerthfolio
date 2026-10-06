// TERRACE QUAY (bible 3.4, 3.5): the 22 x 24 m deck the seal stands on, its stone rim, the marble balustrade, gold-capped bollards and two
// fountains with hard white-cyan water arcs on a 3-frame cycle. NOTHING stands within 3 m of the seal (origin); the lens side (z > 9) is
// left open so the camera never shoots through a rail.
// TILE maths (deck shader, girih):
//   cell = 2 m; u = fract(P.xz / 2) * 2 - 1 in [-1, 1]^2; d1 = max(|u.x|, |u.y|); d2 = same on u rotated 45 deg: the union of two
//   squares is the 8-point star, so star = min(d1, d2) < 0.62. Turquoise #0f8f8a in the star, cream #f6ead2 round it, a cream octagon at
//   min(d1, d2) < 0.26, gold #e9b23a lines where |min(d1, d2) - 0.62| < 0.025 and on the cell border, crimson #b8274c diamonds at the cell
//   corners: |(|u.x| - 1)| + |(|u.y| - 1)| < 0.30. A 1.2 m border (distance to the deck edge): crimson dashes on a teal band.
//   moire: w = fwidth(P.x) + fwidth(P.z) (metres per pixel); fade = smoothstep(0.02, 0.12, w); the pattern goes to its average colour as w
//   grows (no shimmer at grazing angles).
//   glare: h = dot(normalize(L + V), N); a hard cream band where h > 0.985 (a hard highlight band, not a gradient).
//   strike wash (Baararaq Saiqa): R = 4 + 12 uStrike; inside R the tile goes pale cyan-white (hard rim), brighter inside 0.55 R; capped at 0.9.
//   fountain arcs: 3 shape variants v = floor(tw 8) mod 3 (threes); 8 arcs each, y(s) = h 4 s (1 - s) with a per-variant apex jitter.
import { BoxGeometry, CylinderGeometry, Mesh, PlaneGeometry, DoubleSide, TorusGeometry, TubeGeometry, CatmullRomCurve3, Vector3, Group } from "three";
import { ARCH, C, GLOW, V, joinParts, mat, part } from "./common.js";

const TILE = /* glsl */ `
  vec3 shade(vec3 P, vec3 N, vec3 V) {
    float edge = revealEdge(P);
    vec2 u = fract(P.xz / 2.0) * 2.0 - 1.0;
    float d1 = max(abs(u.x), abs(u.y));
    vec2 r = mat2(0.7071, -0.7071, 0.7071, 0.7071) * u;
    float d2 = max(abs(r.x), abs(r.y)), dm = min(d1, d2);
    vec3 cream = ${V(C.tileCream)}, teal = ${V(C.tileTeal)}, gold = ${V(C.tileGold)}, crim = ${V(C.tileCrimson)};
    vec3 c = cream;
    c = mix(c, teal, celStep(0.62 - dm, 0.0));
    c = mix(c, cream, celStep(0.26 - dm, 0.0));
    c = mix(c, gold, 1.0 - celStep(abs(dm - 0.62), 0.025));
    c = mix(c, gold, 1.0 - celStep(1.0 - d1, 0.04));
    float dc = abs(abs(u.x) - 1.0) + abs(abs(u.y) - 1.0);
    c = mix(c, crim, 1.0 - celStep(dc, 0.30));
    // border: 1.2 m from the deck edge
    float de = min(11.0 - abs(P.x), 12.0 - abs(P.z));
    float bd = 1.0 - celStep(de, 1.2);
    float dash = step(0.5, fract((abs(P.x) > 9.9 ? P.z : P.x) * 1.4));
    vec3 bc = mix(teal, crim, dash * step(0.45, de) * (1.0 - step(0.8, de)));
    bc = mix(bc, gold, 1.0 - celStep(abs(de - 0.4), 0.04));
    c = mix(c, bc, bd);
    float w = fwidth(P.x) + fwidth(P.z);
    float fade = smoothstep(0.02, 0.12, w);
    c = mix(c, mix(cream, teal, 0.34), fade);
    // key light: the deck is mostly lit; a hard violet cast from the balustrade on the right edge
    float v = dot(N, keyDir());
    c = toon(c, v, -0.55);
    float cast = 1.0 - step(-9.6, P.x);
    c = mix(c, c * vec3(0.7, 0.66, 0.92), cast * 0.8);
    float h = dot(normalize(keyDir() + V), N);
    c = mix(c, ${V(C.tileCream)} * 1.1, (1.0 - celStep(0.985 - h, 0.0)) * 0.5);
    c = finishW(c, P, 0.0);
    // strike wash
    float R = 4.0 + 12.0 * uStrike, rr = length(P.xz - vec2(0.0, -1.0));
    float inside = (1.0 - celStep(rr - R, 0.0)) * step(0.001, uStrike);
    vec3 wash = ${V("#cfe6ff")} * 0.78;
    c = mix(c, mix(c * 0.45 + wash * 0.55, wash, 1.0 - celStep(rr - R * 0.55, 0.0)), inside * 0.9);
    c = min(c, vec3(0.98));
    return withEdge(c, edge);
  }`;

export function buildQuay(ctx, U) {
  const stat = new Group(), anim = new Group();
  // ---- deck + rim ---------------------------------------------------------------------------------------------------------------------
  const deckGeo = part(new PlaneGeometry(22, 24).rotateX(-Math.PI / 2), C.tileCream, 0);
  const deckMat = mat(ctx, U, TILE, { id: 0.99 });
  const deck = new Mesh(deckGeo, deckMat); deck.frustumCulled = false; stat.add(deck);
  // stone body of the quay: a block 1.6 m deep with a cornice lip; strata on the sea face
  const bodyParts = [
    part(new BoxGeometry(22.8, 1.7, 24.8).translate(0, -0.9, 0), C.stoneMid, 2),
    part(new BoxGeometry(23.4, 0.3, 25.4).translate(0, -0.12, 0), C.stoneLit, 2),
  ];
  // ---- balustrade: sides and back (the lens side stays open) ------------------------------------------------------------------------------
  const rails = [], gold = [];
  const run = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 1.1), dx = (x1 - x0) / n, dz = (z1 - z0) / n;
    const ang = Math.atan2(dx, dz);
    for (let i = 1; i < n; i++) rails.push(part(new CylinderGeometry(0.14, 0.18, 0.78, 8).translate(x0 + dx * i, 0.39, z0 + dz * i), C.marbleLit, 3));
    rails.push(part(new BoxGeometry(0.34, 0.2, L).rotateY(ang).translate((x0 + x1) / 2, 0.88, (z0 + z1) / 2), C.marbleMid, 3));
  };
  run(-10.7, -11.7, 10.7, -11.7); run(-10.7, -11.7, -10.7, 8.0); run(10.7, -11.7, 10.7, 8.0);
  for (const [x, z] of [[-10.7, -11.7], [10.7, -11.7], [-10.7, 8.0], [10.7, 8.0], [0, -11.7]]) {
    rails.push(part(new BoxGeometry(0.62, 1.2, 0.62).translate(x, 0.6, z), C.marbleLit, 3));
    gold.push(part(new CylinderGeometry(0.3, 0.3, 0.12, 10).translate(x, 1.26, z), C.goldLit, 6));
    gold.push(part(new CylinderGeometry(0.01, 0.2, 0.3, 10).translate(x, 1.47, z), C.goldHi, 6));
  }
  // ---- bollards: stone with gold caps along the sea edge --------------------------------------------------------------------------------
  const bol = [];
  for (const z of [-9, -4.5, 0, 4.5]) for (const sx of [-1, 1]) {
    bol.push(part(new CylinderGeometry(0.22, 0.28, 0.5, 8).translate(sx * 10.35, 0.25, z + 1.1), C.stoneLit, 2));
    gold.push(part(new CylinderGeometry(0.24, 0.24, 0.1, 8).translate(sx * 10.35, 0.55, z + 1.1), C.goldLit, 6));
  }
  // ---- fountains: marble basins, centre column, a water disc ----------------------------------------------------------------------------
  const FOUNT = [[-8.8, -3.0], [8.8, -3.0]];
  const water = [];
  for (const [x, z] of FOUNT) {
    rails.push(part(new CylinderGeometry(1.7, 1.9, 0.7, 20).translate(x, 0.35, z), C.marbleLit, 3));
    rails.push(part(new CylinderGeometry(0.25, 0.4, 1.6, 10).translate(x, 1.1, z), C.marbleMid, 3));
    gold.push(part(new CylinderGeometry(1.74, 1.74, 0.1, 20).translate(x, 0.72, z), C.goldLit, 6));
    water.push(part(new CylinderGeometry(1.5, 1.5, 0.06, 20).translate(x, 0.66, z), "#3aa8c8", 0));
  }
  const archMat = mat(ctx, U, ARCH, { id: 0.5, side: DoubleSide });
  const bodyGeo = joinParts([...bodyParts, ...rails, ...bol]);
  const body = new Mesh(bodyGeo, archMat); body.frustumCulled = false; stat.add(body);
  const goldGeo = joinParts(gold);
  const goldMesh = new Mesh(goldGeo, archMat); goldMesh.frustumCulled = false; stat.add(goldMesh);
  const waterGeo = joinParts(water);
  const waterMesh = new Mesh(waterGeo, archMat); waterMesh.frustumCulled = false; stat.add(waterMesh);

  // ---- fountain water arcs: 3 shape variants, one shown per 1/8 s (threes) ---------------------------------------------------------------------
  const jetMat = mat(ctx, U, GLOW, { id: 0.99 });
  const jets = [[], [], []];
  const jetGeos = [];
  for (let v = 0; v < 3; v++) {
    const ps = [];
    for (const [fx, fz] of FOUNT) for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + v * 0.17, reach = 1.1 + 0.25 * ((k + v) % 3), top = 1.7 + 0.3 * ((k * 2 + v) % 3);
      const pts = [];
      for (let i = 0; i <= 8; i++) { const s = i / 8; pts.push(new Vector3(fx + Math.cos(a) * reach * s * 1.2, 1.9 + top * 4 * s * (1 - s) * 0.6 - 1.1 * s * s, fz + Math.sin(a) * reach * s * 1.2)); }
      const g = new TubeGeometry(new CatmullRomCurve3(pts), 10, 0.045, 4);
      ps.push(part(g, "#bff4ff", 1.3));
    }
    const geo = joinParts(ps); jetGeos.push(geo);
    const m = new Mesh(geo, jetMat); m.frustumCulled = false; m.visible = v === 0; jets[v] = m; anim.add(m);
  }

  return {
    stat, anim,
    update(tw) { const v = Math.floor(tw * 8) % 3; for (let i = 0; i < 3; i++) jets[i].visible = i === v; },
    dispose() { for (const g of [deckGeo, bodyGeo, goldGeo, waterGeo, ...jetGeos]) g.dispose(); deckMat.dispose(); archMat.dispose(); jetMat.dispose(); },
  };
}
