// SINDRIA PALACE ON ITS CLIFF (bible 3.3, frames 04 and 06): a facade-built set (Rule 7: only the faces toward the lens, at -z 96).
//   cliff      sandstone strata #b08560, 6 m above the sea, ragged ellipse (rx 66, rz 26); terraced fields #7aa63c / #4e7a2c on top (frame 06).
//   palace     white walls with violet shadow #b4a4c4, gold frieze, arched dark windows #1e2a58 (flat decals), a central octagonal tower with
//              a BLUE dome, two TEAL domes, two GOLD domes on flank pavilions (the teal/blue/gold mix of frame 04, not all gold), gold finials.
//   aqueduct   a row of arches on the left cliff (frame 04), dark arch decals on a sandstone wall.
//   town       ~26 small white houses with teal / blue / terracotta roofs and 40 dark-green poster trees on the terraces.
//   pennants   green #2aa05a pennants on the tower tops (animated, layer 1; they wave on world time: the freeze stops them).
// Scale cheat (anime does it): palace parts are 1.5x the bible sizes so the skyline reads at 96 m. 5 main domes + 2 small.
// Maths:
//   onion dome profile (r, h) in units of the radius r0: (0,0) (1,0) (1.04,.12) (1.2,.36) (1.12,.62) (.72,.88) (.3,1.12) (.07,1.3) (0,1.4),
//     lathed 28 ways; height scale 0.9 r0.
//   cliff ring jitter: radius(u, y) = 1 + 0.07 sin(7u + 1.3) + 0.05 sin(13u + 4y) + 0.03 sin(23u), stepped by ring y: [1.12 1.0 0.95 0.9].
//   pennant wave (vertex): p.z += sin(7 u - 9 tw + 0.3 y) u amp, u = uv.x along the flag, amp = uv.y.
import { BoxGeometry, CircleGeometry, CylinderGeometry, DoubleSide, LatheGeometry, Mesh, Shape, ShapeGeometry, SphereGeometry, Vector2, BufferGeometry, Float32BufferAttribute } from "three";
import { ARCH, C, PALACE_Z, joinParts, mat, part, place } from "./common.js";

const Z0 = PALACE_Z;
const S = 1.5;

function onion(r, seg = 28) {
  const pr = [[0, 0], [1, 0], [1.04, 0.12], [1.2, 0.36], [1.12, 0.62], [0.72, 0.88], [0.3, 1.12], [0.07, 1.3], [0, 1.4]];
  return new LatheGeometry(pr.map(([x, y]) => new Vector2(x * r, y * r * 0.9)), seg);
}
function archDecal(w, h) { // a flat arched opening facing +z, origin bottom-centre
  const s = new Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
  return new ShapeGeometry(s, 8);
}
const box = (w, h, d, x, y, z) => new BoxGeometry(w, h, d).translate(x, y + h / 2, z);
const cyl = (r0, r1, h, x, y, z, seg = 16) => new CylinderGeometry(r1, r0, h, seg).translate(x, y + h / 2, z);

export function buildPalace(ctx, U) {
  const rng = ctx.rng(7);
  const parts = [];
  const add = (g, hex, k = 0) => parts.push(part(g, hex, k));

  // ---- cliff: stepped ragged ellipse of sandstone ----------------------------------------------------------------------------------
  const cg = new CylinderGeometry(1, 1, 7.2, 96, 6, true).translate(0, 2.4, 0);
  const pos = cg.attributes.position;
  const ringK = (y) => (y < -0.5 ? 1.12 : y < 1.5 ? 1.0 : y < 4 ? 0.95 : 0.9);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), u = Math.atan2(z, x);
    const j = 1 + 0.07 * Math.sin(7 * u + 1.3) + 0.05 * Math.sin(13 * u + 4 * y) + 0.03 * Math.sin(23 * u);
    pos.setXYZ(i, x * 66 * j * ringK(y), y, z * 26 * j * ringK(y));
  }
  cg.translate(0, 0, Z0); cg.computeVertexNormals();
  add(cg, C.cliff, 2);
  // top: terraced fields on a gently undulating disc
  const tg = new CircleGeometry(1, 96, 0, Math.PI * 2).rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i); tp.setXYZ(i, x * 58, 6.02 + 0.6 * Math.sin(x * 9) * Math.cos(z * 7), z * 22); }
  tg.translate(0, 0, Z0); tg.computeVertexNormals();
  add(tg, C.terrMid, 9);
  // the rock apron at the water line: a ring of boulders to give the foam something to break on
  for (let i = 0; i < 44; i++) {
    const u = (i / 44) * Math.PI * 2 + rng() * 0.1, rr = 1.04 + rng() * 0.1, s = 1.4 + rng() * 2.4;
    add(new SphereGeometry(1, 6, 4).scale(s * 1.6, s * 0.8, s).translate(Math.cos(u) * 66 * rr * 1.1, -1.0 + rng() * 0.6, Z0 + Math.sin(u) * 26 * rr * 1.1), C.stoneMid, 2);
  }

  // ---- palace -----------------------------------------------------------------------------------------------------------------------
  const PY = 6.4;                                                         // plinth top
  add(box(62, 2.4, 20, 0, 6.0, Z0), C.stoneLit, 2);                       // plinth
  add(box(40, 0.6, 3, 0, 6.0, Z0 + 11.2), C.marbleMid, 3);               // steps, 3 risers toward the lens
  add(box(36, 0.6, 3, 0, 6.6, Z0 + 10.0), C.marbleMid, 3);
  const HY = PY + 2.0;                                                    // hall floor 8.4
  add(box(54, 13 * 1, 12, 0, HY, Z0 - 1), C.marbleLit, 3);               // hall
  add(box(54.6, 1.5, 12.6, 0, HY + 11.4, Z0 - 1), C.gold, 6);            // gold frieze
  add(box(54.9, 0.5, 12.9, 0, HY + 13, Z0 - 1), C.marbleMid, 3);         // cornice
  for (let i = -5; i <= 5; i++) {                                         // arched windows, flat decals on the lens face
    const x = i * 4.6, big = i === 0;
    add(archDecal(big ? 5.4 : 2.6, big ? 8.2 : 6.4).translate(x, HY + (big ? 0 : 2.2), Z0 + 5.04), C.window, 5);
    if (!big) add(box(3.4, 0.4, 0.5, x, HY + 1.9, Z0 + 5.2), C.marbleMid, 3);       // sill
  }
  // flank pavilions with gold domes
  for (const sx of [-1, 1]) {
    const x = sx * 34;
    add(box(14, 15, 11, x, HY, Z0 - 0.5), C.marbleLit, 3);
    add(box(14.6, 1.2, 11.6, x, HY + 11, Z0 - 0.5), C.goldLit, 6);
    add(archDecal(3.4, 7.4).translate(x, HY + 1.4, Z0 + 5.04), C.window, 5);
    add(cyl(5.6, 5.6, 3.0, x, HY + 15, Z0 - 0.5, 20), C.marbleMid, 3);
    add(onion(6.6 * S * 0.62).translate(x, HY + 18, Z0 - 0.5), C.gold, 6);
    add(cyl(0.18, 0.18, 4.2, x, HY + 18 + 6.6 * S * 0.62 * 1.2, Z0 - 0.5, 6), C.goldHi, 6);
  }
  // teal hall domes, small teal domes between
  for (const sx of [-1, 1]) {
    const x = sx * 16;
    add(cyl(6.4, 6.4, 3.5, x, HY + 13, Z0 - 1, 20), C.marbleMid, 3);
    add(onion(7.5 * 0.9 * 1.0 * 1.1).translate(x, HY + 16.5, Z0 - 1), C.domeTeal, 1);
    add(cyl(0.2, 0.2, 4.4, x, HY + 16.5 + 7.5 * 0.9 * 1.1 * 1.25, Z0 - 1, 6), C.goldHi, 6);
    const x2 = sx * 7.2;
    add(cyl(3.0, 3.0, 2.0, x2, HY + 13, Z0 - 2.5, 14), C.marbleMid, 3);
    add(onion(4.0).translate(x2, HY + 15, Z0 - 2.5), C.domeTeal, 1);
  }
  // central octagonal tower: marble, gold bands, a BLUE onion dome and a gold spire
  const TX = 0, TZ = Z0 - 3.5, TH = 34;
  add(cyl(7.4, 7.0, TH, TX, HY, TZ, 8), C.marbleLit, 3);
  for (const by of [9, 21, 31]) add(cyl(7.7, 7.7, 1.3, TX, HY + by, TZ, 8), C.goldLit, 6);
  for (const by of [13, 25]) for (let k = 0; k < 4; k++) {
    const a = (k - 1.5) * 0.5; // windows on the lens-facing octagon faces
    add(archDecal(2.4, 5.2).rotateY(a).translate(Math.sin(a) * 6.9, HY + by, TZ + Math.cos(a) * 6.9 * 0.97), C.window, 5);
  }
  add(cyl(8.2, 8.2, 4.0, TX, HY + TH, TZ, 8), C.marbleMid, 3);
  add(cyl(9.0, 9.0, 0.9, TX, HY + TH + 4, TZ, 8), C.goldLit, 6);
  add(onion(10.5).translate(TX, HY + TH + 4.9, TZ), C.domeBlue, 1);
  const spireY = HY + TH + 4.9 + 10.5 * 0.9 * 1.3;
  add(cyl(0.34, 0.12, 8.0, TX, spireY, TZ, 6), C.goldLit, 6);
  add(new SphereGeometry(0.7, 8, 6).translate(TX, spireY + 3.2, TZ), C.goldHi, 6);

  // ---- aqueduct: sandstone wall with arch decals, left of the palace ------------------------------------------------------------------
  const AZ = Z0 + 6, AX0 = -68, AX1 = -44;
  add(box(AX1 - AX0, 10, 3.2, (AX0 + AX1) / 2, PY - 0.4, AZ), C.stoneLit, 2);
  add(box(AX1 - AX0 + 0.4, 1.0, 3.8, (AX0 + AX1) / 2, PY + 9.6, AZ), C.marbleMid, 3);
  for (let x = AX0 + 3; x < AX1; x += 6) { add(archDecal(3.6, 6.8).translate(x, PY - 0.4, AZ + 1.62), C.stoneDeep, 5); add(box(0.5, 0.2, 0.2, x, PY + 7, AZ + 1.7), C.stoneSh, 2); }
  // ---- houses and trees on the terraces -------------------------------------------------------------------------------------------------
  const roofs = [C.domeTeal, C.domeBlue, C.stoneMid, "#c4543a", C.domeTeal];
  let n = 0;
  while (n < 26) {
    const x = (rng() * 2 - 1) * 52, z = Z0 + (rng() * 2 - 1) * 19;
    if ((Math.abs(x) < 42 && z > Z0 - 12 && z < Z0 + 13) || (x > AX0 - 2 && x < AX1 + 2 && z > Z0 + 1) || (x / 56) ** 2 + ((z - Z0) / 21) ** 2 > 1) continue;
    n++;
    const w = 3 + rng() * 3, d = 3 + rng() * 2.5, h = 2.6 + rng() * 3.4, y = 6.4;
    add(box(w, h, d, x, y, z), C.marbleLit, 3);
    const rc = roofs[Math.floor(rng() * roofs.length)];
    if (rng() < 0.45) add(onion(w * 0.5).translate(x, y + h, z), rc, 1);
    else add(box(w + 0.5, 0.5, d + 0.5, x, y + h, z), rc, 0);
    add(archDecal(0.9, 1.6).translate(x, y, z + d / 2 + 0.03), C.window, 5);
  }
  for (let i = 0, m = 0; m < 40 && i < 400; i++) {
    const x = (rng() * 2 - 1) * 60, z = Z0 + (rng() * 2 - 1) * 22;
    if ((Math.abs(x) < 46 && z > Z0 - 12 && z < Z0 + 13) || (x / 62) ** 2 + ((z - Z0) / 23) ** 2 > 1) continue;
    m++;
    const s = 1.5 + rng() * 1.6;
    add(new SphereGeometry(1, 7, 5).scale(s * 1.2, s * 0.95, s).translate(x, 6.6 + s * 0.8, z), C.foliageMid, 4);
  }
  // quay pillars at the cliff foot toward the lens (a hint of the harbour wall)
  add(box(70, 1.4, 2.4, 0, -1.2, Z0 + 31), C.stoneMid, 2);

  const geo = joinParts(parts);
  const material = mat(ctx, U, ARCH, { side: DoubleSide, id: 0.5 });
  const mesh = new Mesh(geo, material); mesh.frustumCulled = false;

  // ---- pennants (layer 1: they wave) ---------------------------------------------------------------------------------------------------
  const flags = [];
  const flagGeo = (x, y, z, L, Hh) => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute([x, y, z, x + L, y - Hh * 0.5, z, x, y - Hh, z], 3));
    g.setAttribute("uv", new Float32BufferAttribute([0, 0.5, 1, 0.5, 0, 0.5], 2));
    g.computeVertexNormals();
    return part(g, C.pennant, 7);
  };
  const fl = [[TX, spireY + 3.8, TZ, 7], [-34, HY + 18 + 6.6 * S * 0.62 * 1.2 + 4.2, Z0 - 0.5, 4.5], [34, HY + 18 + 6.6 * S * 0.62 * 1.2 + 4.2, Z0 - 0.5, 4.5],
    [-16, HY + 16.5 + 7.5 * 0.9 * 1.1 * 1.25 + 4.4, Z0 - 1, 4], [16, HY + 16.5 + 7.5 * 0.9 * 1.1 * 1.25 + 4.4, Z0 - 1, 4]];
  for (const [x, y, z, L] of fl) flags.push(flagGeo(x + 0.1, y - 0.2, z, L, L * 0.45));
  const fgeo = joinParts(flags);
  const fmat = mat(ctx, U, ARCH, { side: DoubleSide, id: 0.5, vert: "p.z += sin(uv.x * 7.0 - uTw * 9.0 + p.y * 0.3) * uv.x * 0.5; p.y += cos(uv.x * 5.0 - uTw * 9.0) * 0.15 * uv.x;" });
  const fmesh = new Mesh(fgeo, fmat); fmesh.frustumCulled = false; fmesh.userData.layer = 1;

  return { mesh, flags: fmesh, tower: { x: TX, y: spireY, z: TZ }, dispose() { geo.dispose(); material.dispose(); fgeo.dispose(); fmat.dispose(); } };
}
