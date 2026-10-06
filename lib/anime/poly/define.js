// defineKit: Three-free mesh kit (name, family, doc, build → positions/indices/normals).
export function defineKit({ name, family, doc, build }) {
  if (!name || !family || !doc || typeof build !== "function") {
    throw new Error(`poly kit incomplete: ${name ?? "?"}`);
  }
  const baked = build();
  if (!baked?.positions || !baked?.indices || !baked?.normals) {
    throw new Error(`poly kit mesh incomplete: ${name}`);
  }
  return {
    name,
    family,
    doc,
    build,
    positions: baked.positions,
    indices: baked.indices,
    normals: baked.normals,
  };
}
