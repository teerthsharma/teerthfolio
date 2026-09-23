// Pure geometry for the "hull" sculpture (google-deepmind/mujoco #3450).
//
// The figure it retells (teerthsharma.github.io/fig.js, "hull —") draws a
// convex hull with V=42, F=80 — an icosahedron with each face split into 4
// once (the figure's own comment: "the full scan is 5,170 probes against
// 3V^2 - 6V = 5,040", which solves to V=42). Built once, no dependencies:
// same shape, shared by the two hulls the sculpture races against each
// other.

const PHI = (1 + Math.sqrt(5)) / 2;

function icosahedron() {
  const P = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
  ];
  const F = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  return { P, F };
}

// Split every face into 4 once, sharing each edge's midpoint between the two
// faces that own it (so the result is a closed 42-vertex, 80-face shell, not
// a pile of unconnected triangles).
function subdivideOnce(P, F) {
  const pts = P.map((p) => p.slice());
  const mids = new Map();
  const mid = (a, b) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    let idx = mids.get(key);
    if (idx === undefined) {
      pts.push([(pts[a][0] + pts[b][0]) / 2, (pts[a][1] + pts[b][1]) / 2, (pts[a][2] + pts[b][2]) / 2]);
      idx = pts.length - 1;
      mids.set(key, idx);
    }
    return idx;
  };
  const faces = [];
  for (const [a, b, c] of F) {
    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    faces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }
  return { P: pts, F: faces };
}

// The order the hull's graph gets built in: breadth-first from one seed
// face across shared edges, same as the figure ("each face turned so its
// first corner is one already found") — the hull grows outward from a
// point, it doesn't pop in at random. The seed is the face most square to
// +z (the figure's own seedAt: "the face most squarely toward the viewer"),
// so the handful of faces the slow build ever finishes are the ones facing
// the dock, not hidden round the back.
function buildOrder(F, faceCount, seed) {
  const edgeFace = new Map();
  const neighbours = Array.from({ length: faceCount }, () => []);
  F.forEach((f, fi) => {
    for (let k = 0; k < 3; k++) {
      const a = f[k], b = f[(k + 1) % 3];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const other = edgeFace.get(key);
      if (other === undefined) edgeFace.set(key, fi);
      else { neighbours[fi].push(other); neighbours[other].push(fi); }
    }
  });
  const order = new Int32Array(faceCount).fill(-1);
  const queue = [seed];
  order[seed] = 0;
  let rank = 1;
  for (let head = 0; head < queue.length; head++) {
    const f = queue[head];
    for (const n of neighbours[f]) {
      if (order[n] === -1) { order[n] = rank++; queue.push(n); }
    }
  }
  return order;
}

// Builds the hull once: face positions (flat, one unique vertex triple per
// face, ready for a non-indexed BufferGeometry so each face can hold its own
// flat colour), the build order per face, and the vertex ring the "table"
// writes one entry into per vertex.
export function buildHull() {
  const ico = icosahedron();
  const { P, F } = subdivideOnce(ico.P, ico.F);
  const vertexCount = P.length; // 42
  const faceCount = F.length; // 80

  // onto the unit sphere, then a mild affine squash — an affine map keeps a
  // convex hull's faces, so it still reads as a hull, not a ball.
  const squash = [1.12, 0.92, 1];
  const unit = P.map(([x, y, z]) => {
    const n = Math.hypot(x, y, z) || 1;
    return [(x / n) * squash[0], (y / n) * squash[1], (z / n) * squash[2]];
  });

  const positions = new Float32Array(faceCount * 9);
  const centroids = new Float32Array(faceCount * 3);
  F.forEach((f, fi) => {
    let cx = 0, cy = 0, cz = 0;
    f.forEach((vi, k) => {
      const [x, y, z] = unit[vi];
      positions[fi * 9 + k * 3] = x;
      positions[fi * 9 + k * 3 + 1] = y;
      positions[fi * 9 + k * 3 + 2] = z;
      cx += x; cy += y; cz += z;
    });
    centroids[fi * 3] = cx / 3;
    centroids[fi * 3 + 1] = cy / 3;
    centroids[fi * 3 + 2] = cz / 3;
  });

  let seed = 0;
  for (let fi = 1; fi < faceCount; fi++) if (centroids[fi * 3 + 2] > centroids[seed * 3 + 2]) seed = fi;
  const order = buildOrder(F, faceCount, seed);

  const ringPoints = new Float32Array(vertexCount * 3);
  unit.forEach(([x, y, z], i) => {
    ringPoints[i * 3] = x; ringPoints[i * 3 + 1] = y; ringPoints[i * 3 + 2] = z;
  });

  // when a vertex is first written: the earliest-built face that touches it.
  const vertexRank = new Int32Array(vertexCount).fill(faceCount);
  F.forEach((f, fi) => {
    f.forEach((vi) => { if (order[fi] < vertexRank[vi]) vertexRank[vi] = order[fi]; });
  });

  return { vertexCount, faceCount, positions, centroids, order, ringPoints, vertexRank };
}
