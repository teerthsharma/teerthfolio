// lightning-fork: 5 black-outlined forked bolts wrapping the shell, reseeded every two frames.
// Ribbon maths: for a segment a->b, side = normalize(cross(b-a, camFwd)) (screen perpendicular), quad = a+-side*w, b+-side*w.
// Width scales with camera distance d so the line stays a constant PIXEL width: core half = d*.0016 (~3 px), outline half = d*.0034.
// Never covers the seal: every point is pushed to at least 0.12 S BEHIND the seal's centre plane (along the view axis),
// so the seal body depth-occludes any stroke that would cross it.
export function makeBolts(ctx) {
  const { THREE } = ctx;
  const MAXSEG = 5 * 12, V = new THREE.Vector3();
  const mk = (color, bloom, order) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAXSEG * 4 * 3), 3));
    const idx = new Uint16Array(MAXSEG * 6);
    for (let i = 0; i < MAXSEG; i++) { const o = i * 4; idx.set([o, o + 1, o + 2, o + 1, o + 3, o + 2], i * 6); }
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setDrawRange(0, 0);
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
    m.color.setRGB(color[0] * bloom, color[1] * bloom, color[2] * bloom);
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCorrected = false; mesh.frustumCulled = false; mesh.renderOrder = order;
    return mesh;
  };
  const outline = mk([0.29, 0.157, 0.47], 1, 6);       // #4a2878
  const core = mk([1, 0.984, 0.878], 1.9, 7);          // #fffbe0, above 1 so it blooms
  const group = new THREE.Group(); group.add(outline, core);

  function fill(mesh, segs, wScale, fw, d) {
    const pos = mesh.geometry.attributes.position.array; let n = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), s = new THREE.Vector3();
    for (const [pa, pb] of segs) {
      a.copy(pa); b.copy(pb);
      s.subVectors(b, a).cross(fw); if (s.lengthSq() < 1e-10) continue;
      s.normalize().multiplyScalar(d * wScale);
      const o = n * 12;
      pos[o] = a.x + s.x; pos[o + 1] = a.y + s.y; pos[o + 2] = a.z + s.z;
      pos[o + 3] = a.x - s.x; pos[o + 4] = a.y - s.y; pos[o + 5] = a.z - s.z;
      pos[o + 6] = b.x + s.x; pos[o + 7] = b.y + s.y; pos[o + 8] = b.z + s.z;
      pos[o + 9] = b.x - s.x; pos[o + 10] = b.y - s.y; pos[o + 11] = b.z - s.z;
      n++;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.setDrawRange(0, n * 6);
  }

  // count: bolts drawn (3 early, 5 densest f144-f168). salt: the stepped frame index (pure function of the clock).
  function update(chest, S, count, salt) {
    if (count <= 0) { outline.visible = core.visible = false; return; }
    outline.visible = core.visible = true;
    const cam = ctx.player.camera, fw = cam.getWorldDirection(new THREE.Vector3());
    const d = cam.position.distanceTo(chest);
    const segs = [];
    const flat = (p) => { const al = V.copy(p).sub(chest).dot(fw); if (al < 0.12 * S) p.addScaledVector(fw, 0.12 * S - al); return p; };
    for (let b = 0; b < count; b++) {
      const g = ctx.rng(salt * 31 + b * 7 + 11);
      const th = g() * 6.2832, ph = Math.acos(2 * g() - 1);
      const u0 = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      const axis = new THREE.Vector3(g() - .5, g() - .5, g() - .5).cross(u0).normalize();
      const A = (70 + g() * 40) * Math.PI / 180, R = 0.8 * S;
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const q = u0.clone().applyAxisAngle(axis, A * i / 6).multiplyScalar(R * (1 + (g() - .5) * .26));
        const j = i === 0 || i === 6 ? 0.04 : 0.13;
        q.add(new THREE.Vector3((g() - .5) * j, (g() - .5) * j, (g() - .5) * j).multiplyScalar(S));
        pts.push(flat(q.add(chest)));
      }
      for (let i = 0; i < 6; i++) segs.push([pts[i], pts[i + 1]]);
      // one fork per bolt, at vertex 2 or 4: three jagged segments leaving at +-40 degrees
      const fi = g() < .5 ? 2 : 4, dir = pts[fi + 1].clone().sub(pts[fi]).normalize();
      dir.applyAxisAngle(fw, (g() < .5 ? -1 : 1) * 0.7);
      let p0 = pts[fi];
      for (let k = 0; k < 3; k++) {
        const p1 = flat(p0.clone().addScaledVector(dir, 0.17 * S).add(new THREE.Vector3((g() - .5) * .1, (g() - .5) * .1, (g() - .5) * .1).multiplyScalar(S)));
        segs.push([p0, p1]); p0 = p1;
      }
    }
    fill(outline, segs, 0.0034, fw, d);
    fill(core, segs, 0.0016, fw, d);
  }
  const dispose = () => { for (const m of [outline, core]) { m.geometry.dispose(); m.material.dispose(); } };
  return { group, update, dispose };
}
