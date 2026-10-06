export function computeNormals(positions, indices) {
  const nrm = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3, ib = indices[i + 1] * 3, ic = indices[i + 2] * 3;
    const ax = positions[ia], ay = positions[ia + 1], az = positions[ia + 2];
    const e1x = positions[ib] - ax, e1y = positions[ib + 1] - ay, e1z = positions[ib + 2] - az;
    const e2x = positions[ic] - ax, e2y = positions[ic + 1] - ay, e2z = positions[ic + 2] - az;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    nrm[ia] += nx; nrm[ia + 1] += ny; nrm[ia + 2] += nz;
    nrm[ib] += nx; nrm[ib + 1] += ny; nrm[ib + 2] += nz;
    nrm[ic] += nx; nrm[ic + 1] += ny; nrm[ic + 2] += nz;
  }
  for (let i = 0; i < nrm.length; i += 3) {
    const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1;
    nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
  }
  return nrm;
}

export function toMesh(pos, idx) {
  const positions = pos instanceof Float32Array ? pos : new Float32Array(pos);
  const nvert = positions.length / 3;
  const indices = idx instanceof Uint16Array || idx instanceof Uint32Array
    ? idx
    : nvert > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  return { positions, indices, normals: computeNormals(positions, indices) };
}

export function builder() {
  const pos = [];
  const idx = [];
  return {
    vert(x, y, z) {
      pos.push(x, y, z);
      return pos.length / 3 - 1;
    },
    tri(a, b, c) {
      idx.push(a, b, c);
    },
    quad(a, b, c, d) {
      idx.push(a, b, c, a, c, d);
    },
    finish() {
      return toMesh(pos, idx);
    },
  };
}

export function mergeMesh(a, b) {
  const pos = new Float32Array(a.positions.length + b.positions.length);
  pos.set(a.positions);
  pos.set(b.positions, a.positions.length);
  const off = a.positions.length / 3;
  const Ctor = a.positions.length + b.positions.length > 65535 * 3 ? Uint32Array : Uint16Array;
  const indices = new Ctor(a.indices.length + b.indices.length);
  indices.set(a.indices);
  for (let i = 0; i < b.indices.length; i++) indices[a.indices.length + i] = b.indices[i] + off;
  return toMesh(pos, indices);
}

export function mirrorX(mesh) {
  const pos = Float32Array.from(mesh.positions);
  for (let i = 0; i < pos.length; i += 3) pos[i] = -pos[i];
  const idx = mesh.indices.slice();
  for (let i = 0; i < idx.length; i += 3) {
    const t = idx[i + 1];
    idx[i + 1] = idx[i + 2];
    idx[i + 2] = t;
  }
  return toMesh(pos, idx);
}

export function bothSides(buildOne) {
  const L = buildOne(1);
  return mergeMesh(L, mirrorX(L));
}

function basisFromN(nx, ny, nz) {
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  const hx = Math.abs(ny) < 0.9 ? 0 : 1;
  const hy = Math.abs(ny) < 0.9 ? 1 : 0;
  let px = ny * 0 - nz * hy, py = nz * hx - nx * 0, pz = nx * hy - ny * hx;
  const pl = Math.hypot(px, py, pz) || 1;
  px /= pl; py /= pl; pz /= pl;
  const qx = ny * pz - nz * py, qy = nz * px - nx * pz, qz = nx * py - ny * px;
  return [nx, ny, nz, px, py, pz, qx, qy, qz];
}

export function addBox(b, cx, cy, cz, hx, hy, hz) {
  const x0 = cx - hx, x1 = cx + hx, y0 = cy - hy, y1 = cy + hy, z0 = cz - hz, z1 = cz + hz;
  const face = (p0, p1, p2, p3) => {
    const a = b.vert(...p0), c = b.vert(...p1), d = b.vert(...p2), e = b.vert(...p3);
    b.quad(a, c, d, e);
  };
  face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  face([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  face([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  face([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
  face([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  face([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
}

export function addPlate(b, ox, oy, oz, u, v, su, sv, nu = 2, nv = 2) {
  const [ux, uy, uz] = u;
  const [vx, vy, vz] = v;
  const rows = [];
  for (let j = 0; j <= nv; j++) {
    const tv = j / nv - 0.5;
    const row = [];
    for (let i = 0; i <= nu; i++) {
      const tu = i / nu - 0.5;
      row.push(b.vert(
        ox + ux * tu * su + vx * tv * sv,
        oy + uy * tu * su + vy * tv * sv,
        oz + uz * tu * su + vz * tv * sv,
      ));
    }
    rows.push(row);
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      b.quad(rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]);
    }
  }
}

export function addTaper(b, ax, ay, az, bx, by, bz, r0, r1, sides = 6, rings = 4) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const ux = dx / len, uy = dy / len, uz = dz / len;
  const [, , , px, py, pz, qx, qy, qz] = basisFromN(ux, uy, uz);
  const ringsIdx = [];
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const cx = ax + dx * t, cy = ay + dy * t, cz = az + dz * t;
    const rad = r0 + (r1 - r0) * t;
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const c = Math.cos(a), s2 = Math.sin(a);
      ring.push(b.vert(
        cx + (px * c + qx * s2) * rad,
        cy + (py * c + qy * s2) * rad,
        cz + (pz * c + qz * s2) * rad,
      ));
    }
    ringsIdx.push(ring);
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sides; s++) {
      const s1 = (s + 1) % sides;
      b.quad(ringsIdx[r][s], ringsIdx[r][s1], ringsIdx[r + 1][s1], ringsIdx[r + 1][s]);
    }
  }
  const c0 = b.vert(ax, ay, az);
  const c1 = b.vert(bx, by, bz);
  for (let s = 0; s < sides; s++) {
    const s1 = (s + 1) % sides;
    b.tri(c0, ringsIdx[0][s1], ringsIdx[0][s]);
    b.tri(c1, ringsIdx[rings][s], ringsIdx[rings][s1]);
  }
}

export function addDisc(b, cx, cy, cz, rx, ry, nx, ny, nz, segs = 10, thick = 0) {
  const [nnx, nny, nnz, px, py, pz, qx, qy, qz] = basisFromN(nx, ny, nz);
  const ring0 = [];
  const ring1 = [];
  const c0 = b.vert(cx + nnx * thick, cy + nny * thick, cz + nnz * thick);
  const c1 = thick ? b.vert(cx - nnx * thick, cy - nny * thick, cz - nnz * thick) : null;
  for (let s = 0; s < segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    const c = Math.cos(a), s2 = Math.sin(a);
    const x = px * c * rx + qx * s2 * ry;
    const y = py * c * rx + qy * s2 * ry;
    const z = pz * c * rx + qz * s2 * ry;
    ring0.push(b.vert(cx + x + nnx * thick, cy + y + nny * thick, cz + z + nnz * thick));
    if (thick) ring1.push(b.vert(cx + x - nnx * thick, cy + y - nny * thick, cz + z - nnz * thick));
  }
  for (let s = 0; s < segs; s++) {
    const s1 = (s + 1) % segs;
    b.tri(c0, ring0[s], ring0[s1]);
    if (thick) {
      b.tri(c1, ring1[s1], ring1[s]);
      b.quad(ring0[s], ring1[s], ring1[s1], ring0[s1]);
    }
  }
}

export function addRibbon(b, a, end, w0, w1, segs = 3, thick = 0.006) {
  const [ax, ay, az] = a;
  const [bx, by, bz] = end;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const llen = Math.hypot(dx, dy, dz) || 1;
  const ux = dx / llen, uy = dy / llen, uz = dz / llen;
  const [, , , px, py, pz, qx, qy, qz] = basisFromN(ux, uy, uz);
  const rings = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = w0 + (w1 - w0) * t;
    const cx = ax + dx * t, cy = ay + dy * t, cz = az + dz * t;
    rings.push([
      b.vert(cx - px * w + qx * thick, cy - py * w + qy * thick, cz - pz * w + qz * thick),
      b.vert(cx + px * w + qx * thick, cy + py * w + qy * thick, cz + pz * w + qz * thick),
      b.vert(cx + px * w - qx * thick, cy + py * w - qy * thick, cz + pz * w - qz * thick),
      b.vert(cx - px * w - qx * thick, cy - py * w - qy * thick, cz - pz * w - qz * thick),
    ]);
  }
  for (let i = 0; i < segs; i++) {
    const A = rings[i], B = rings[i + 1];
    b.quad(A[0], A[1], B[1], B[0]);
    b.quad(A[1], A[2], B[2], B[1]);
    b.quad(A[2], A[3], B[3], B[2]);
    b.quad(A[3], A[0], B[0], B[3]);
  }
}

export function addLidBand(b, {
  cx = 0, cy = 0, cz = 0, rx = 0.07, ry = 0.028, inner = 0.55,
  segs = 12, thick = 0.014, start = 0.12, end = 0.88, bulge = 0.012,
} = {}) {
  const a0 = Math.PI * start;
  const a1 = Math.PI * end;
  const top = [];
  const bot = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const a = a0 + (a1 - a0) * t;
    const c = Math.cos(a), s = Math.sin(a);
    const xo = cx + c * rx, yo = cy + s * ry, zo = cz + bulge * s;
    const xi = cx + c * rx * inner, yi = cy + s * ry * inner, zi = cz + bulge * s * 0.55;
    top.push([b.vert(xo, yo, zo), b.vert(xi, yi, zi)]);
    bot.push([b.vert(xo, yo, zo - thick), b.vert(xi, yi, zi - thick)]);
  }
  for (let i = 0; i < segs; i++) {
    const [o0, i0] = top[i], [o1, i1] = top[i + 1];
    const [bo0, bi0] = bot[i], [bo1, bi1] = bot[i + 1];
    b.quad(o0, o1, i1, i0);
    b.quad(bo0, bi0, bi1, bo1);
    b.quad(o0, bo0, bo1, o1);
    b.quad(i0, i1, bi1, bi0);
  }
  b.quad(top[0][0], top[0][1], bot[0][1], bot[0][0]);
  const n = segs;
  b.quad(top[n][0], bot[n][0], bot[n][1], top[n][1]);
}

export function addSweepX(b, profileYz, x0, x1, segs = 4) {
  const rings = [];
  for (let i = 0; i <= segs; i++) {
    const x = x0 + (x1 - x0) * (i / segs);
    rings.push(profileYz.map(([y, z]) => b.vert(x, y, z)));
  }
  const n = profileYz.length;
  for (let i = 0; i < segs; i++) {
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n;
      b.quad(rings[i][k], rings[i][k1], rings[i + 1][k1], rings[i + 1][k]);
    }
  }
  const fan = (ring, sign) => {
    for (let k = 1; k < n - 1; k++) {
      if (sign > 0) b.tri(ring[0], ring[k], ring[k + 1]);
      else b.tri(ring[0], ring[k + 1], ring[k]);
    }
  };
  fan(rings[0], -1);
  fan(rings[segs], 1);
}

export function addBowl(b, cx, cy, cz, rx, ry, rz, segs = 8, rings = 4) {
  const rows = [];
  for (let r = 0; r <= rings; r++) {
    const v = (r / rings) * Math.PI * 0.55;
    const sv = Math.sin(v), cv = Math.cos(v);
    const row = [];
    for (let s = 0; s <= segs; s++) {
      const u = (s / segs) * Math.PI * 1.15 - Math.PI * 0.575;
      const x = cx + Math.sin(u) * sv * rx;
      const y = cy + cv * ry;
      const z = cz + Math.cos(u) * sv * rz;
      row.push(b.vert(x, y, z));
    }
    rows.push(row);
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      b.quad(rows[r][s], rows[r][s + 1], rows[r + 1][s + 1], rows[r + 1][s]);
    }
  }
}
