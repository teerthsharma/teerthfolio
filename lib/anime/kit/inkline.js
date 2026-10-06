// inkline: a constant-pixel inverted-hull outline for any kit mesh, in any ink colour (Frieren's thin warm
// line, JoJo's heavy black). Extrudes along position-welded smooth normals, so faceted rocks stay closed.
//   inkHull(mesh, shared, { col: "#6e4a4e", px: 1.2, id: 0.5 }) -> mesh (the hull is added as a child)
//   smoothNormals(geo) -> adds the aSmooth attribute (normals averaged over coincident positions)
import { BackSide, BufferAttribute, Color, Mesh, ShaderMaterial } from "three";

export function smoothNormals(geo) {
  if (geo.attributes.aSmooth) return geo;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const P = geo.attributes.position, N = geo.attributes.normal, acc = new Map(), key = (i) => `${Math.round(P.getX(i) * 1e3)},${Math.round(P.getY(i) * 1e3)},${Math.round(P.getZ(i) * 1e3)}`;
  for (let i = 0; i < P.count; i++) { const k = key(i), a = acc.get(k) ?? [0, 0, 0]; a[0] += N.getX(i); a[1] += N.getY(i); a[2] += N.getZ(i); acc.set(k, a); }
  const out = new Float32Array(P.count * 3);
  for (let i = 0; i < P.count; i++) { const a = acc.get(key(i)), l = Math.hypot(...a) || 1; out.set([a[0] / l, a[1] / l, a[2] / l], i * 3); }
  geo.setAttribute("aSmooth", new BufferAttribute(out, 3));
  return geo;
}

export function inkHull(mesh, shared, o = {}) {
  smoothNormals(mesh.geometry);
  const m = new ShaderMaterial({
    side: BackSide,
    uniforms: { uRes: shared.uRes, uPx: { value: o.px ?? 1.2 }, uCol: { value: new Color(o.col ?? "#000000") } },
    vertexShader: /* glsl */ `attribute vec3 aSmooth; uniform vec2 uRes; uniform float uPx;
      void main() { vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 d = (projectionMatrix * vec4(normalize(normalMatrix * aSmooth), 0.0)).xy;
        c.xy += normalize(d + 1e-6) * uPx * (uRes.y / 820.0) * 2.0 / uRes * c.w; gl_Position = c; }`,
    fragmentShader: `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, ${(o.id ?? 0.5).toFixed(3)}); }`,
  });
  const h = new Mesh(mesh.geometry, m); h.renderOrder = -1; h.frustumCulled = mesh.frustumCulled;
  mesh.add(h);
  return mesh;
}

export default { name: "inkline", doc: "constant-pixel inverted-hull outline in any ink colour, welded smooth normals so faceted kit stays closed" };
