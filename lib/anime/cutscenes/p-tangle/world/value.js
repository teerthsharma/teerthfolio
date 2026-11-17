// Background value law: the dissolve edge is gated on the dissolve (at rest it painted cream on every near surface), and the cedars are grounded in shade and mist.
const EDGE = /if \(t > 0\.0\) discard;\s*return smoothstep\(-0\.1, 0\.0, t\);/;
const EDGE_GATED = "if (t > 0.0) discard;\n    return smoothstep(-0.1, 0.0, t) * step(0.002, uDis);";
const CEDAR_LIGHT = "vec3 col = lightLand(base, n, V, dist, 1.0);";

function fixEdge(mat) {
  if (!EDGE.test(mat.fragmentShader)) return;
  mat.fragmentShader = mat.fragmentShader.replace(EDGE, EDGE_GATED);
  mat.needsUpdate = true;
}

function cedars(mat) {
  mat.vertexShader = mat.vertexShader.replace("varying vec3 vC;", "varying vec3 vC; varying float vLy;").replace("vL = p.xyz;", "vL = p.xyz; vLy = position.y;");
  mat.fragmentShader = mat.fragmentShader
    .replace("varying vec3 vC;", "varying vec3 vC; varying float vLy;")
    .replace(CEDAR_LIGHT, "base *= mix(0.35, 1.0, smoothstep(0.0, 2.5, vLy));\n      base = mix(base, hazeAt(V), 0.3 * (1.0 - smoothstep(0.0, 0.6, vLy)));\n      vec3 col = lightLand(base, n, V, dist, 1.0);");
  mat.needsUpdate = true;
}

function girlRim(mat) {
  mat.fragmentShader = mat.fragmentShader.replace(
    "vec3 col = lightLand(vC.rgb, n, V, dist, 2.4);",
    "vec3 col = lightLand(vC.rgb, n, V, dist, 2.4);\n        col += vec3(1.0, 0.753, 0.541) * pow(1.0 - abs(dot(n, V)), 2.0) * 0.9 * (1.0 - uTw);",
  );
  mat.needsUpdate = true;
}

export function applyValue(W) {
  const seen = new Set();
  W.root.traverse((o) => {
    const m = o.material;
    if (m?.isShaderMaterial && !seen.has(m)) { seen.add(m); fixEdge(m); }
  });
  fixEdge(W.lake.m);
  cedars(W.trees.material);
  girlRim(W.girl.m);
}
