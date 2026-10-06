// pr-tensorflow-124410 CAST: small prop helpers on the shared engine.figure (inked, painted). Candidates for promotion: propKit, L1, disposeTree.
export function propKit(ctx) {
  const { engine, sdf } = ctx;
  const { paint, painted } = sdf;
  const fig = (geo, col, shade, o = {}) => {
    const f = engine.figure(painted(geo, paint(col, shade ?? col, { line: o.line ?? 0.9 })), { lineMul: o.lineMul ?? 0.9, ink: o.ink, constant: true });
    if (o.pos) f.position.set(...o.pos);
    if (o.rot) f.rotation.set(...o.rot);
    if (o.scale) f.scale.set(...o.scale);
    return f;
  };
  return { fig };
}
// put a subtree on the character layer (a part added to a costumed seal after it was built)
export const L1 = (obj) => { obj.traverse((c) => { c.layers.set(1); }); return obj; };
// a group at point p whose child keeps its place: rotating or scaling the group acts about p
export const pivot = (THREE, obj, p) => { const g = new THREE.Group(); g.position.set(...p); obj.position.sub(new THREE.Vector3(...p)); g.add(obj); return g; };
export function disposeTree(obj) {
  obj.traverse((o) => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); } });
}
