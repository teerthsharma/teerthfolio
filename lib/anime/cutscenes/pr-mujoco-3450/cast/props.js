// CAST prop helpers (layer folder; Consolidate may promote). Everything is built inside build(ctx): no program links at playback,
// because every mesh is an engine.figure() (the shared anime program + the shared hull program).
export function makeProps(ctx) {
  const { THREE, engine, sdf } = ctx;
  const owned = [];
  const hex = (c, k) => `#${new THREE.Color(c).multiplyScalar(k).getHexString()}`;
  const own = (g) => { owned.push(g); return g; };
  // a cel-shaded solid with an ink hull (the same recipe as costumed-seal-kit's fig()); o: pos rot scale hull(false = no ink) lineMul ink line
  function solid(geo, col, shade, o = {}) {
    const f = engine.figure(sdf.painted(own(geo), sdf.paint(col, shade ?? hex(col, 0.55), { line: o.line ?? 1 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
    if (o.hull === false) f.remove(f.userData.hullMesh);
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    if (o.scale) f.scale.set(...(Array.isArray(o.scale) ? o.scale : [o.scale, o.scale, o.scale]));
    return f;
  }
  // rotate an object about a pivot point c (so a rigid hair/hat tilts about the head, not the origin)
  function rotAbout(obj, c, rx, ry = 0, rz = 0) {
    const e = new THREE.Euler(rx, ry, rz), v = new THREE.Vector3(...c);
    obj.rotation.copy(e);
    obj.position.copy(v).sub(v.clone().applyEuler(e));
  }
  // a thin ink segment between two points (a crack, a vein): a box with no hull
  function stroke(a, b, w, col = "#12070a") {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
    const m = solid(new THREE.BoxGeometry(w, w, L), col, col, { hull: false });
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.lookAt(B);
    return m;
  }
  // a one-drawing dust puff (#96866c): 7 flat stone lumps that bloom outward; show(k) with k in 0..1 across the puff
  function dustPuff(rad = 0.5) {
    const g = new THREE.Group(), rng = ctx.rng(31);
    const lumps = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rng() * 0.6, r = 0.35 + rng() * 0.65;
      const m = solid(new THREE.IcosahedronGeometry(0.16 + rng() * 0.08, 1), i % 2 ? "#cdbd9e" : "#96866c", "#6d5f58", { hull: false });
      lumps.push({ m, dx: Math.cos(a) * r, dz: Math.sin(a) * r, up: 0.5 + rng() * 0.8 });
      g.add(m);
    }
    g.userData.show = (k, s = 1) => {
      g.visible = k > 0 && k < 1;
      const bloom = 1 - Math.pow(1 - k, 2), fade = 1 - Math.max(0, (k - 0.55) / 0.45);
      for (const l of lumps) { l.m.position.set(l.dx * rad * bloom * s, 0.1 * s + l.up * rad * 0.35 * bloom * s, l.dz * rad * bloom * s); l.m.scale.setScalar(Math.max(0.0001, (0.55 + 0.9 * bloom) * fade * s)); }
    };
    g.visible = false;
    return g;
  }
  return { THREE, solid, stroke, dustPuff, rotAbout, hex, own, dispose() { for (const g of owned) g.dispose?.(); owned.length = 0; } };
}
