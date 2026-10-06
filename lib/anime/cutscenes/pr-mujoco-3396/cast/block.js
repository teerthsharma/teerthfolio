// CAST props the seal wields, pr-mujoco-3396 (bible E12 + E08's mouth):
//   the coral BLOCK of 1,282 cubes (16 x 12 x 7 cells of 0.75 m, the first 1,282 filled) and the ONE BLUE CUBE at its foot.
//   One merged mesh through engine.figure (cel surface + ink hull on the same geometry): 1,282 cubes = 46k vertices, ONE draw call.
//   The hero's open MOUTH (f177-247): a dark ellipsoid + tongue attached to the locked pup with seal.attach (the pup mesh is untouched).
// All motion is a pure function of t. The seal eats the top course first; each cube spirals to the mouth on a helix th = 4 pi u.
//   cube position  p(u) = c0 + (m - c0) e(u) + (p1 cos th + p2 sin th) R sin(pi u)^0.8 (1 - 0.2 u) + up 1.2 sin(pi u)
//   e(u) = u^2 (3 - 2u) (ease in-out), th = 4 pi u, p1 = norm(a x up), p2 = a x p1, a = (m - c0)/|m - c0|, m = the mouth NOW
//   size s(u) = 0.75 (1 - 0.8 smooth(0.55, 1, u)) (the cube is swallowed), spin angle (3 + 3 h_i) u about a random axis h_i
// The blue cube: rests at the foot; f248-260 arcs to the nose as the seal shrinks (size 0.72 -> 0.2); sits on the nose; f280-296 is
// flipped (a 4 pi tumble, apex 1.5 m) and caught at the right flipper; then held at the flipper through the fist.
export function buildBlock(ctx, T, root) {
  const { THREE, engine, sdf, seal } = ctx;
  const { BoxGeometry, BufferGeometry, Color, Matrix4, Quaternion, Vector3, Group, SphereGeometry, BufferAttribute } = THREE;
  const R = ctx.rng("block");
  const NX = 16, NY = 12, NZ = 7, N = 1282, CELL = 0.75, FL = 0.7;
  const sx = seal.at[0], sy = seal.at[1], sz = seal.at[2];
  const bx = sx - 13.2, bz = sz - 2.0; // the block's centre on the ground: well left of the seal, clear of the ranks (z <= sz - 5.6)

  // ---- the cubes
  const cx = new Float32Array(N), cy = new Float32Array(N), cz = new Float32Array(N), ix = new Int16Array(N), iy = new Int16Array(N);
  for (let i = 0; i < N; i++) {
    ix[i] = i % NX; iy[i] = Math.floor(i / NX) % NY;
    const z = Math.floor(i / (NX * NY));
    cx[i] = bx + (ix[i] - (NX - 1) / 2) * CELL; cy[i] = sy + (iy[i] + 0.5) * CELL; cz[i] = bz + (z - (NZ - 1) / 2) * CELL;
  }
  // eat order: the top course first, then front-to-back, left-to-right
  const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => (iy[b] - iy[a]) || (cz[a] - cz[b]) || (cx[a] - cx[b]));
  const rank = new Int32Array(N); order.forEach((c, r) => { rank[c] = r; });
  const stride = (T.eat1 - T.eat0 - FL) / (N - 1);

  const unit = new BoxGeometry(1, 1, 1).toNonIndexed();
  const bp = unit.attributes.position.array, bn = unit.attributes.normal.array, V = bp.length / 3; // 36
  const pos = new Float32Array(N * V * 3), nor = new Float32Array(N * V * 3);
  const merged = new BufferGeometry();
  const uv = new Float32Array(N * V * 2); for (let i = 0; i < N; i++) uv.set(unit.attributes.uv.array, i * V * 2);
  merged.setAttribute("uv", new BufferAttribute(uv, 2));
  merged.setAttribute("position", new BufferAttribute(pos, 3));
  merged.setAttribute("normal", new BufferAttribute(nor, 3));
  sdf.painted(merged, sdf.paint("#e96a5a", "#b8492f", { line: 1 })); // coral lit / sinopia shade, flat cel in 2 tones
  // per-cube pigment variation: a few cubes lean to terracotta / ochre like different pours of the same plaster (no random colour: a seeded +-7 % value)
  const aCol = merged.attributes.aCol, aSh = merged.attributes.aShade, lit = new Color("#e96a5a"), sh = new Color("#b8492f");
  for (let i = 0; i < N; i++) {
    const k = 0.93 + 0.14 * R(), l = lit.clone().multiplyScalar(k), s = sh.clone().multiplyScalar(k);
    for (let v = 0; v < V; v++) { const o = (i * V + v) * 3; aCol.array[o] = l.r; aCol.array[o + 1] = l.g; aCol.array[o + 2] = l.b; aSh.array[o] = s.r; aSh.array[o + 1] = s.g; aSh.array[o + 2] = s.b; }
  }
  const block = engine.figure(merged, { lineMul: 0.9, constant: true });
  block.userData.mesh.frustumCulled = false; block.userData.hullMesh.frustumCulled = false;
  block.name = "block-1282";
  root.add(block);

  const axes = Array.from({ length: N }, () => new Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize());
  const spinK = Float32Array.from({ length: N }, () => 3 + 3 * R());
  const key = new Float32Array(N).fill(-1); // last written state; flight always rewrites
  const M = new Matrix4(), Mr = new Matrix4(), Q = new Quaternion(), P3 = new Vector3(), S3 = new Vector3();
  const write = (i, px, py, pz, q, s) => {
    S3.setScalar(s); M.compose(P3.set(px, py, pz), q, S3); Mr.makeRotationFromQuaternion(q);
    const e = M.elements, r = Mr.elements;
    for (let v = 0; v < V; v++) {
      const o = v * 3, w = (i * V + v) * 3, x = bp[o], y = bp[o + 1], z = bp[o + 2], nx = bn[o], ny = bn[o + 1], nz = bn[o + 2];
      pos[w] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[w + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[w + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      nor[w] = r[0] * nx + r[4] * ny + r[8] * nz; nor[w + 1] = r[1] * nx + r[5] * ny + r[9] * nz; nor[w + 2] = r[2] * nx + r[6] * ny + r[10] * nz;
    }
  };
  const QI = new Quaternion();
  const park = (i) => write(i, 0, -1e4, 0, QI, 0.001);

  // ---- the blue cube: one painted box, mesh.scale = side
  const blue = engine.figure(sdf.painted(new BoxGeometry(1, 1, 1), sdf.paint("#2f4f8f", "#1c3363", { line: 1.1 })), { lineMul: 1.0, constant: true });
  blue.userData.mesh.frustumCulled = false; blue.userData.hullMesh.frustumCulled = false;
  blue.name = "blue-cube";
  root.add(blue);
  const blueRest = new Vector3(bx, sy + 0.36, bz + (NZ * CELL) / 2 + 0.7); // at the foot of the block

  // ---- the hero's mouth (an attached prop; the locked pup is untouched). Under the nose at the muzzle front (z ~ 0.275).
  const mouth = new Group();
  const mk = (geoM, col, shade, p) => { const f = engine.figure(sdf.painted(geoM, sdf.paint(col, shade, { line: 0.6 })), { lineMul: 0.5, constant: true }); f.position.set(...p); return f; };
  mouth.add(mk(new SphereGeometry(0.04, 14, 10).scale(1, 0.75, 0.35), "#4a1520", "#2a0a10", [0, 0, 0]));
  mouth.add(mk(new SphereGeometry(0.026, 12, 8).scale(1, 0.5, 0.3), "#d9667a", "#a03a50", [0, -0.012, 0.004]));
  mouth.position.set(0, 0.487, 0.268);
  mouth.visible = false;
  seal.attach(mouth, 1);

  const ease = (u) => u * u * (3 - 2 * u), cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), sm = (a, b, t) => ease(cl((t - a) / (b - a)));
  const mouthW = new Vector3(), noseW = new Vector3(), handW = new Vector3(), a = new Vector3(), p1 = new Vector3(), p2 = new Vector3(), UP = new Vector3(0, 1, 0), tmp = new Vector3();
  const anchor = (out, x, y, z) => out.set(x, y, z).applyMatrix4(seal.body.matrixWorld);

  const reveal0 = T.swell0 + 0.1, reveal1 = T.swell0 + 0.5; // the Wall's heart rises as the swell begins

  const update = (t) => {
    seal.group.updateMatrixWorld(true);
    anchor(mouthW, 0, 0.49, 0.28); anchor(noseW, 0, 0.55, 0.285); anchor(handW, 0.27, 0.36, 0.3);
    let dirty = false;
    for (let i = 0; i < N; i++) {
      const ts = T.eat0 + rank[i] * stride, u = (t - ts) / FL;
      const g = sm(reveal0 + (iy[i] / NY) * 0.2, reveal1 - 0.2 + (iy[i] / NY) * 0.2, t); // rise from the foot, low rows first
      if (u >= 1 || g <= 0) { if (key[i] !== (u >= 1 ? 1 : 3)) { park(i); key[i] = u >= 1 ? 1 : 3; dirty = true; } continue; }
      if (u <= 0) {
        if (g >= 1) { if (key[i] !== 0) { write(i, cx[i], cy[i], cz[i], QI, CELL); key[i] = 0; dirty = true; } }
        else { write(i, cx[i], cy[i] - (1 - g) * 0.5, cz[i], QI, CELL * g); key[i] = 2; dirty = true; }
        continue;
      }
      // in flight
      const e = ease(u);
      a.copy(mouthW).sub(P3.set(cx[i], cy[i], cz[i]));
      const d = a.length() || 1; a.multiplyScalar(1 / d);
      p1.crossVectors(a, UP); if (p1.lengthSq() < 1e-4) p1.set(1, 0, 0); p1.normalize(); p2.crossVectors(a, p1);
      const th = 4 * Math.PI * u, rr = Math.min(2.4, d * 0.22) * Math.pow(Math.sin(Math.PI * u), 0.8) * (1 - 0.2 * u);
      tmp.set(cx[i], cy[i], cz[i]).addScaledVector(a, d * e).addScaledVector(p1, Math.cos(th) * rr).addScaledVector(p2, Math.sin(th) * rr);
      tmp.y += 1.2 * Math.sin(Math.PI * u);
      Q.setFromAxisAngle(axes[i], spinK[i] * u);
      write(i, tmp.x, tmp.y, tmp.z, Q, CELL * (1 - 0.8 * sm(0.55, 1, u)));
      key[i] = 2; dirty = true;
    }
    if (dirty) { merged.attributes.position.needsUpdate = true; merged.attributes.normal.needsUpdate = true; }

    // ---- the blue cube
    const gBlue = sm(reveal0 + 0.1, reveal1, t);
    const toss = cl((t - T.flip) / (T.catch - T.flip));
    let px, py, pz, side = 0.72, rx = 0, ry = 0;
    if (t < T.gap + 1 / 24) { px = blueRest.x; py = blueRest.y; pz = blueRest.z; }
    else if (t < T.shrink1) { // f248-260: arcs to the nose as the seal shrinks, small as it lands
      const u = cl((t - (T.gap + 1 / 24)) / (T.shrink1 - T.gap - 1 / 24)), n = tmp.copy(noseW).add(P3.set(0, 0.1 * seal.scale, 0));
      px = mix(blueRest.x, n.x, ease(u)); py = mix(blueRest.y, n.y, ease(u)) + 2.4 * Math.sin(Math.PI * u); pz = mix(blueRest.z, n.z, ease(u));
      side = mix(0.72, 0.2, ease(u)); ry = 6 * u; rx = 3 * u;
    } else if (t < T.flip) { // on the nose, a slight settle bob
      tmp.copy(noseW).add(P3.set(0, 0.1 * seal.scale + 0.012 * Math.sin(t * 7), 0)); px = tmp.x; py = tmp.y; pz = tmp.z; side = 0.2;
    } else if (t < T.catch) { // flipped and caught: an arc from the nose to the right flipper
      const u = toss; tmp.copy(noseW).lerp(handW, ease(u)); px = tmp.x; py = tmp.y + 1.5 * Math.sin(Math.PI * u); pz = tmp.z; side = 0.2; rx = 4 * Math.PI * u; ry = 1.3 * u;
    } else { tmp.copy(handW); px = tmp.x; py = tmp.y; pz = tmp.z; side = 0.17; } // held at the flipper through the fist
    blue.position.set(px, py, pz);
    blue.rotation.set(rx, ry, 0);
    blue.scale.setScalar(side * gBlue + 1e-4);

    // ---- the hero's mouth: open for the eat f177-247, chewing 4 times a second while cubes arrive
    const open = sm(T.eat0 - 0.05, T.eat0 + 0.15, t) * (1 - sm(T.eat1 - 0.05, T.eat1 + 0.2, t));
    mouth.visible = open > 0.04;
    if (mouth.visible) { const chew = 0.7 + 0.3 * Math.sin(t * 25); mouth.scale.set(1, open * chew + 0.05, 1); }
  };
  const mix = (a0, b0, k) => a0 + (b0 - a0) * k;

  const dispose = () => { merged.dispose(); blue.userData.mesh.geometry.dispose(); unit.dispose(); mouth.parent?.remove(mouth); mouth.traverse((o) => o.geometry?.dispose?.()); };
  return { update, dispose, block, blue, mouth, anchorMouth: () => mouthW };
}
