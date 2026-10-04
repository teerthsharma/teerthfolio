// THE ADVANCED NURTURING HIGH SCHOOL CAMPUS as flat-field meshes (swiss.js): a walled artificial island in Tokyo Bay.
// Static geometry is merged into a few draws: the opaque campus, the glass, the sea. Campus frame (layout.js).
// Everything lines up to the 4 m grid: facade bays, mullions, avenue trees, plaza squares.

import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, LatheGeometry, Matrix4, PlaneGeometry, RingGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { GATE_AT, PLAZA, SQUARE } from "./layout";
import { Mesher, SW, piece } from "./swiss";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const S = SW;
const M = new Matrix4();
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const flatPlane = (w, d) => new PlaneGeometry(w, d).rotateX(-Math.PI / 2);

// island extents
export const ISLAND = { x0: -60, x1: 56, z0: -62, z1: 24 };

// ------------------------------------------------------------------------------------------ the opaque campus
export function campusGeometry() {
  const m = new Mesher();
  const { x0, x1, z0, z1 } = ISLAND;

  // the island: a slab on the sea, pale blue-grey ground; a sea wall all round it
  m.slab(x0, -1.7, z0, x1, 0, z1, S.PALEBLUE);
  m.slab(x0 - 1.2, -1.7, z0 - 1.2, x1 + 1.2, 0.9, z0, S.CONCRETE); // north wall (a gap at the bridge head, below)
  m.slab(x0 - 1.2, -1.7, z1, x1 + 1.2, 0.9, z1 + 1.2, S.CONCRETE);
  m.slab(x0 - 1.2, -1.7, z0, x0, 0.9, z1, S.CONCRETE);
  m.slab(x1, -1.7, z0, x1 + 1.2, 0.9, z1, S.CONCRETE);
  m.slab(x0 - 1.2, 0.9, z0 - 1.2, x1 + 1.2, 1.05, z0, S.SLATE); // the copings
  m.slab(x0 - 1.2, 0.9, z1, x1 + 1.2, 1.05, z1 + 1.2, S.SLATE);
  m.slab(x0 - 1.2, 0.9, z0, x0, 1.05, z1, S.SLATE);
  m.slab(x1, 0.9, z0, x1 + 1.2, 1.05, z1, S.SLATE);

  // the plaza: a giant chessboard of pale and slate squares, the grid made solid
  m.slab(PLAZA.x0 - 0.3, 0, PLAZA.z0 - 0.3, PLAZA.x1 + 0.3, 0.06, PLAZA.z1 + 0.3, S.WARM);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const [cx, cz] = SQUARE(i, j);
      m.add(flatPlane(4, 4), (i + j) % 2 ? S.SLATE : S.CONCRETE, M.makeTranslation(cx, 0.08, cz));
    }
  }
  // the entrance steps under classroom 1-D
  for (let k = 0; k < 3; k++) m.slab(16, 0, -14, 28, 0.12 * (3 - k), -14 + 0.6 * (k + 1), S.CONCRETE);
  // the avenue: round the building's east end to the bridge gate
  m.slab(32, 0, -9, 51, 0.04, -3, S.CONCRETE);
  m.slab(45, 0, GATE_AT[1] + 4, 51, 0.04, -3, S.CONCRETE);
  // the paths: a spine west of the plaza, a loop to the track
  m.slab(-6, 0, -12, 0, 0.04, 20, S.CONCRETE);
  m.slab(0, 0, 20, 32, 0.04, 22.4, S.CONCRETE);

  // ---------- the main building: long, low, modernist, pale concrete; a full-height glass curtain wall on the third floor
  const BX0 = -8;
  const BX1 = 36;
  const BZ0 = -34;
  const BZ1 = -14;
  m.slab(BX0, 0, BZ0, BX1, 6.4, BZ1, S.CONCRETE); // floors one and two
  m.slab(BX0 - 0.2, 0, BZ1 - 0.0, BX1 + 0.2, 0.6, BZ1 + 0.5, S.WARM); // the plinth
  for (let x = BX0; x < BX1; x += 4) {
    // second floor: a ribbon of glass in 4 m bays, slate mullions
    m.slab(x + 0.12, 3.8, BZ1, x + 3.88, 6.0, BZ1 + 0.1, S.GLACIER);
    m.slab(x - 0.08, 3.7, BZ1, x + 0.08, 6.1, BZ1 + 0.18, S.SLATE);
    // ground floor: windows, the lobby (16..28) all glass
    const lobby = x >= 16 && x < 28;
    m.slab(x + 0.12, lobby ? 0.4 : 0.9, BZ1, x + 3.88, lobby ? 3.3 : 2.9, BZ1 + 0.1, S.GLACIER);
    m.slab(x - 0.08, lobby ? 0.4 : 0.8, BZ1, x + 0.08, lobby ? 3.4 : 3.0, BZ1 + 0.18, S.SLATE);
  }
  m.slab(BX1 - 0.08, 3.7, BZ1, BX1 + 0.08, 6.1, BZ1 + 0.18, S.SLATE);
  // the spandrels: slate bands between the floors
  m.slab(BX0, 3.3, BZ1, BX1, 3.7, BZ1 + 0.25, S.SLATE);
  m.slab(BX0, 6.1, BZ1, BX1, 6.4, BZ1 + 0.3, S.SLATE);

  // third floor: slab, walls, partitions, header, roof; the glass itself is its own mesh
  m.slab(BX0, 6.4, BZ0, BX1, 6.55, BZ1, S.CONCRETE);
  m.slab(BX0, 6.55, BZ0, BX1, 9.6, BZ0 + 0.3, S.CONCRETE); // back wall
  m.slab(BX0, 6.55, BZ0, BX0 + 0.3, 9.6, BZ1, S.CONCRETE); // west end
  m.slab(BX1 - 0.3, 6.55, BZ0, BX1, 9.6, BZ1, S.CONCRETE); // east end
  for (const px of [4, 16, 28]) m.slab(px - 0.12, 6.55, BZ0 + 0.3, px + 0.12, 9.6, BZ1 - 0.1, S.CONCRETE); // partitions between the classrooms
  m.slab(BX0, 6.55, -26.8, BX1, 9.6, -26.55, S.CONCRETE); // the corridor wall
  m.slab(BX0, 9.25, BZ1 - 0.15, BX1, 9.6, BZ1 + 0.3, S.SLATE); // the header over the glass
  m.slab(BX0 - 1, 9.6, BZ0 - 1, BX1 + 1, 10.0, BZ1 + 1.4, S.CONCRETE); // the roof, with an eave
  m.slab(BX0 - 1, 10.0, BZ1 + 1.2, BX1 + 1, 10.3, BZ1 + 1.4, S.SLATE);
  m.slab(0, 10.0, -30, 6, 11.4, -24, S.WARM); // roof plant
  m.slab(24, 10.0, -32, 30, 12.0, -28, S.WARM);
  // mullions: 4 m, on the grid
  for (let x = BX0; x <= BX1; x += 4) m.slab(x - 0.09, 6.55, BZ1 - 0.12, x + 0.09, 9.25, BZ1 + 0.1, S.SLATE);
  // the open windows of 1-D (16..24): two glass leaves swung out
  const leaf = (hx, dirx, ang) => {
    const L = 3.7;
    const cx = hx + (dirx * L * Math.cos(ang)) / 2;
    const cz = BZ1 + (L * Math.sin(ang)) / 2;
    m.add(new BoxGeometry(L, 2.6, 0.07), S.GLACIER, M.makeRotationY(-Math.atan2(Math.sin(ang), dirx * Math.cos(ang))).setPosition(cx, 7.95, cz));
  };
  leaf(24, -1, 1.25); // swung out on the east side only: the window seat (x 17) and the pup stay clear
  leaf(28, -1, 1.25);

  // ---------- classroom 1-D (16..28), 1-C (4..16), 1-B (-8..4): rows of desks facing the board on the east wall
  const room = (xa, xb, rows, withBoard) => {
    for (let r = 0; r < rows; r++) {
      const cx = xa + 1.2 + r * 2.2;
      for (let k = 0; k < 5; k++) {
        const cz = -16 - k * 2.2;
        m.slab(cx - 0.28, 6.97, cz - 0.28, cx + 0.28, 7.03, cz + 0.28, S.WARM); // the chair seat (top at y 7.0)
        m.slab(cx - 0.32, 7.03, cz - 0.28, cx - 0.26, 7.7, cz + 0.28, S.WARM); // its back
        m.slab(cx - 0.22, 6.55, cz - 0.04, cx - 0.18, 6.97, cz + 0.0, S.SLATE);
        m.slab(cx + 0.45, 7.26, cz - 0.5, cx + 1.4, 7.31, cz + 0.5, S.WARM); // the desk top
        m.slab(cx + 0.5, 6.55, cz - 0.46, cx + 0.56, 7.26, cz + 0.46, S.SLATE); // its panel
        m.slab(cx + 1.32, 6.55, cz - 0.46, cx + 1.38, 7.26, cz + 0.46, S.SLATE);
      }
    }
    if (withBoard) {
      m.slab(xb - 0.3, 7.45, -23.6, xb - 0.12, 9.05, -17.2, S.CONCRETE); // the blackboard frame
      m.slab(xb - 0.34, 7.55, -23.4, xb - 0.12, 8.95, -17.4, S.DEEP); // the board
      m.slab(xb - 0.5, 7.4, -23.4, xb - 0.12, 7.47, -17.4, S.CONCRETE); // the chalk tray
      m.slab(xb - 1.9, 6.55, -21.7, xb - 0.9, 7.6, -20.3, S.WARM); // the teacher's podium
      m.slab(xb - 1.95, 7.6, -21.8, xb - 0.85, 7.66, -20.2, S.CONCRETE);
    }
  };
  room(16, 28, 4, true);
  room(4, 16, 4, true);
  room(-8, 4, 3, true);
  // the others in the class: seated silhouettes in deep slate (1-D), facing the board
  const pupil = (x, z, k) => {
    m.add(new BoxGeometry(0.42, 0.62, 0.46), S.DEEP, M.makeTranslation(x - 0.02, 7.36 + 0.0, z));
    m.add(new SphereGeometry(0.2, 8, 6), S.DEEP, M.makeTranslation(x + 0.02 + 0.04 * k, 7.9, z));
  };
  for (const [r, k] of [[1, 0], [1, 1], [1, 3], [2, 0], [2, 2], [2, 4], [3, 1], [3, 3], [3, 4], [0, 3], [0, 4]]) pupil(16 + 1.2 + r * 2.2, -16 - k * 2.2, k);
  for (const [r, k] of [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4]]) pupil(4 + 1.2 + r * 2.2, -16 - k * 2.2, k);

  // ---------- the glass box of the shopping mall, the gymnasium, the dormitory towers, the running track
  m.slab(-50, 0, -14, -34, 0.5, 6, S.WARM);
  m.slab(-50.4, 8.0, -14.4, -33.6, 8.5, 6.4, S.CONCRETE);
  for (let x = -50; x <= -34; x += 4) m.slab(x - 0.1, 0.5, 5.9, x + 0.1, 8.0, 6.1, S.SLATE);
  for (let z = -14; z <= 6; z += 4) m.slab(-50.1, 0.5, z - 0.1, -49.9, 8.0, z + 0.1, S.SLATE);
  for (const [x, z, w, h] of [[30, -52, 7, 38], [40, -54, 7, 32]]) {
    m.slab(x - w / 2, 0, z - w / 2, x + w / 2, h, z + w / 2, S.CONCRETE);
    m.slab(x - w / 2 - 0.3, h, z - w / 2 - 0.3, x + w / 2 + 0.3, h + 0.5, z + w / 2 + 0.3, S.SLATE);
    for (let y = 3.2; y < h; y += 3.2) m.slab(x - w / 2 - 0.1, y - 0.15, z + w / 2, x + w / 2 + 0.1, y + 0.1, z + w / 2 + 0.2, S.SLATE);
  }
  // the gym: low walls and a barrel roof
  m.slab(-44, 0, -56, -22, 6, -40, S.CONCRETE);
  m.add(new CylinderGeometry(9, 9, 22, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.45, 1), S.SLATE, M.makeTranslation(-33, 6, -48));
  // the running track: an oval in slate with pale lane lines, an infield of pale blue
  const oval = (ro, ri, sw, y) => m.add(new RingGeometry(ri, ro, 40).rotateX(-Math.PI / 2).scale(2, 1, 1), sw, M.makeTranslation(14, y, -48));
  oval(11, 7.5, S.SLATE, 0.05);
  oval(9.4, 9.2, S.CONCRETE, 0.07);
  oval(8.2, 8.0, S.CONCRETE, 0.07);
  m.add(new CircleGeometry(7.4, 40).rotateX(-Math.PI / 2).scale(2, 1, 1), S.PALEBLUE, M.makeTranslation(14, 0.06, -48));
  // the shop of the gate (bridge head): a way out, a guardhouse, see gate()
  // the north wall's gap for the bridge is just the road: pale concrete over the coping
  m.slab(GATE_AT[0] - 4, 0, z0 - 1.2, GATE_AT[0] + 4, 1.06, z0, S.CONCRETE);

  // the bridge: a deck, two towers, cables and hangers, to the mainland (shape only)
  const bx = GATE_AT[0];
  m.slab(bx - 4, -0.1, z0 - 1.2, bx + 4, 0.35, -232, S.SLATE); // deck
  m.slab(bx - 4.2, 0.35, z0 - 1.2, bx - 3.8, 1.0, -232, S.CONCRETE);
  m.slab(bx + 3.8, 0.35, z0 - 1.2, bx + 4.2, 1.0, -232, S.CONCRETE);
  const TZ = [-120, -200];
  for (const tz of TZ) {
    for (const sx of [-1, 1]) m.slab(bx + sx * 4.4 - 0.6, -1.7, tz - 0.8, bx + sx * 4.4 + 0.6, 34, tz + 0.8, S.CONCRETE);
    m.slab(bx - 5, 26, tz - 0.5, bx + 5, 27.2, tz + 0.5, S.CONCRETE);
    m.slab(bx - 5, 33, tz - 0.5, bx + 5, 34.2, tz + 0.5, S.CONCRETE);
    m.slab(bx - 2, -1.7, tz - 1.3, bx + 2, 0, tz + 1.3, S.CONCRETE); // pier
  }
  // cables: a parabola over the main span, shallow ones on the side spans
  const cable = (sx, za, zb, ya, yb, sag) => {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const p = (u) => [za + (zb - za) * u, ya + (yb - ya) * u - sag * 4 * u * (1 - u)];
      const [z0c, y0c] = p(u0);
      const [z1c, y1c] = p(u1);
      const len = Math.hypot(z1c - z0c, y1c - y0c);
      const ang = Math.atan2(y1c - y0c, z1c - z0c);
      m.add(new BoxGeometry(0.22, 0.22, len), S.SLATE, new Matrix4().makeRotationX(-ang).setPosition(bx + sx * 4.4, (y0c + y1c) / 2, (z0c + z1c) / 2));
      if (i % 2 === 0 && u0 > 0.02) {
        const hy = (y0c + 0.35) / 2;
        m.slab(bx + sx * 4.4 - 0.05, 0.35, z0c - 0.05, bx + sx * 4.4 + 0.05, y0c, z0c + 0.05, S.SLATE);
        void hy;
      }
    }
  };
  for (const sx of [-1, 1]) {
    cable(sx, TZ[0], TZ[1], 33.6, 33.6, 29); // the main span
    cable(sx, z0 - 2, TZ[0], 0.6, 33.6, 3); // the side span to the island
    cable(sx, TZ[1], -232, 33.6, 0.6, 3);
  }
  // the mainland: a long pale bank across the water
  m.slab(-210, -1.7, -250, 210, 1.2, -232, S.PALEBLUE);

  return m.build();
}

// ------------------------------------------------------------------------------------------ the glass (transparent)
export function glassGeometry() {
  const m = new Mesher();
  const BZ1 = -14;
  for (let x = -8; x < 36; x += 4) {
    if (x === 16 || x === 20) continue; // 1-D's open windows
    m.slab(x + 0.09, 6.55, BZ1 - 0.02, x + 3.91, 9.25, BZ1 + 0.02, S.GLACIER);
  }
  for (let x = -50; x < -34; x += 4) m.slab(x + 0.1, 0.5, 5.98, x + 3.9, 8.0, 6.02, S.GLACIER);
  for (let z = -14; z < 6; z += 4) m.slab(-50.02, 0.5, z + 0.1, -49.98, 8.0, z + 3.9, S.GLACIER);
  return m.build();
}

// the sea: one big flat field, on the grid like everything else
export function seaGeometry() {
  return piece(new PlaneGeometry(600, 600, 1, 1).rotateX(-Math.PI / 2), S.GLACIER, new Matrix4().makeTranslation(0, -1.6, -90));
}

// ------------------------------------------------------------------------------------------ the instanced scenery
// the cherry tree: warm grey trunk and a blossom crown of three overlapping blobs, one geometry
export function treeGeometry() {
  const m = new Mesher();
  m.add(new CylinderGeometry(0.16, 0.26, 2.6, 6), S.WARM, M.makeTranslation(0, 1.3, 0));
  m.add(new CylinderGeometry(0.1, 0.14, 1.2, 5), S.WARM, new Matrix4().makeRotationZ(0.7).setPosition(0.5, 2.7, 0));
  for (const [x, y, z, r] of [[0, 3.9, 0, 1.9], [1.25, 3.4, 0.35, 1.3], [-1.15, 3.55, -0.3, 1.4], [0.2, 4.7, -0.4, 1.2]]) {
    m.add(new IcosahedronGeometry(r, 1), S.ROSE, M.makeTranslation(x, y, z));
  }
  return m.build();
}
export function benchGeometry() {
  const m = new Mesher();
  m.slab(-0.9, 0.42, -0.25, 0.9, 0.5, 0.25, S.WARM);
  m.slab(-0.9, 0.5, 0.2, 0.9, 0.95, 0.27, S.WARM);
  m.slab(-0.8, 0, -0.2, -0.7, 0.42, 0.2, S.SLATE);
  m.slab(0.7, 0, -0.2, 0.8, 0.42, 0.2, S.SLATE);
  return m.build();
}
export function lampGeometry() {
  const m = new Mesher();
  m.cyl(0, 0, 0, 0.07, 0.1, 4.2, 6, S.DEEP);
  m.slab(-0.4, 4.2, -0.15, 0.4, 4.4, 0.15, S.SLATE);
  return m.build();
}
// the skyline: unit boxes, scaled per instance
export function skylineGeometry() {
  return piece(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), S.PALEBLUE);
}
export function cloudGeometry() {
  const m = new Mesher();
  for (const [x, y, z, a, b] of [[0, 0, 0, 14, 3.2], [-11, -0.6, 1, 9, 2.4], [10, -0.4, -1, 10, 2.6], [3, 1.6, 0, 7, 2.2]]) {
    m.add(new SphereGeometry(1, 10, 6).scale(a, b, 5), S.CONCRETE, M.makeTranslation(x, y, z));
  }
  return m.build();
}
// a dormitory window: a flat quad facing south
export function windowGeometry() {
  return piece(new PlaneGeometry(1.5, 1.7), S.GLACIER);
}
export function petalGeometry() {
  return piece(new PlaneGeometry(0.34, 0.2).rotateX(-Math.PI / 2), S.ROSE);
}

// the sky: a dome in four hard bands (glacier, pale blue, pale peach, apricot), no gradient; cleared by direction cells
export function skyMaterial(look) {
  return new ShaderMaterial({
    uniforms: { uSky: look.u.uSky, uBreak: look.u.uBreak, uInside: { value: 0 } },
    side: DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vP;
      void main() {
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSky[4];
      uniform float uBreak;
      varying vec3 vP;
      float hash3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vP);
        float h = d.y;
        vec3 col = h < 0.05 ? uSky[3] : h < 0.14 ? uSky[2] : h < 0.34 ? uSky[1] : uSky[0];
        if (uBreak >= 0.0) {
          vec3 cell = floor(d * 11.0);
          float k = uBreak - (0.6 + (1.0 - d.y) * 1.6 + hash3(cell) * 0.5);
          if (k > 0.17) discard;
          if (k > 0.0) col = mod(cell.x + cell.z + cell.y, 2.0) < 0.5 ? uSky[1] : uSky[2];
        }
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}

// ------------------------------------------------------------------------------------------ the chess set (turned shapes)
const turned = (pts) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), 14);
export function chessGeometry(kind) {
  const base = [[0, 0], [0.5, 0], [0.5, 0.14], [0.36, 0.2]];
  switch (kind) {
    case "pawn":
      return turned([...base, [0.2, 0.7], [0.3, 0.74], [0.18, 0.78], [0.3, 0.92], [0.34, 1.12], [0.24, 1.3], [0.0, 1.34]]);
    case "rook":
      return turned([...base, [0.3, 0.3], [0.28, 1.0], [0.42, 1.08], [0.42, 1.5], [0.28, 1.5], [0.28, 1.4], [0, 1.4]]);
    case "bishop":
      return turned([...base, [0.22, 0.6], [0.32, 0.68], [0.2, 0.74], [0.36, 1.1], [0.3, 1.6], [0.1, 1.9], [0.0, 2.0]]);
    case "queen":
      return turned([...base, [0.24, 0.7], [0.38, 0.8], [0.24, 0.88], [0.4, 1.3], [0.44, 1.8], [0.3, 1.82], [0.14, 2.0], [0, 2.1]]);
    case "king":
      return mergeGeometries([
        turned([...base, [0.26, 0.7], [0.4, 0.8], [0.26, 0.88], [0.42, 1.4], [0.42, 1.9], [0.2, 1.95], [0.0, 1.95]]).toNonIndexed(),
        new BoxGeometry(0.1, 0.5, 0.1).translate(0, 2.2, 0).toNonIndexed(),
        new BoxGeometry(0.36, 0.1, 0.1).translate(0, 2.3, 0).toNonIndexed(),
      ].map((g) => (g.deleteAttribute("uv"), g)));
    default: // knight: a turned body and a boxy head
      return mergeGeometries([
        turned([...base, [0.28, 0.9], [0.34, 1.0], [0, 1.02]]).toNonIndexed(),
        new BoxGeometry(0.44, 0.7, 0.62).rotateX(-0.35).translate(0, 1.4, 0.1).toNonIndexed(),
        new ConeGeometry(0.2, 0.4, 4).rotateX(Math.PI / 2).translate(0, 1.5, 0.55).toNonIndexed(),
      ].map((g) => (g.deleteAttribute("uv"), g)));
  }
}
export { TorusGeometry };
