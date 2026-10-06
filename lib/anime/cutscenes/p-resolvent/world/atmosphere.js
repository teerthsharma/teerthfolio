// ATMOSPHERE: painted mist banks round the far rim, three god-ray bands (#ffd488 at 10 to 14 percent, slanted along the light), and the
// island ground (snow #f4f1ea) that the court dissolves into during the unmaking (hidden until uDis > 0).
// God-ray band: a plane spanned by the ray direction r = -SUN and the up vector made perpendicular to it (s = up - r (up.r)); alpha(u, v) =
//   smoothstep(0, 0.6, 1 - |2u - 1|) x smoothstep(0, 0.15, v) x smoothstep(1, 0.6, v): soft on both long edges and both ends, additive.
import { Color, DoubleSide, Matrix4, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { mistCard } from "../../../tools/mist.js";
import { ADD, C, SUN, V, mat } from "./common.js";

export function buildAtmosphere(ctx, U) {
  const mist = [], rays = [], disposers = [];
  // mist banks: coral and lilac, a ring facing the court centre (never inside the court, so the seal stays clear)
  const cfg = [[C.mist, 0.34], ["#d68fa0", 0.26], [C.mist, 0.3], ["#e0a043", 0.22], ["#d68fa0", 0.28], [C.mist, 0.3], ["#e0a043", 0.2], ["#d68fa0", 0.26]];
  cfg.forEach(([col, a], i) => {
    const ang = i * (Math.PI * 2 / cfg.length) + 0.3, r = 70, m = mistCard(95, 16, col, a, i + 1);
    m.material.side = DoubleSide;
    m.position.set(r * Math.cos(ang), 4.2, r * Math.sin(ang)); m.rotation.y = Math.atan2(-Math.cos(ang), -Math.sin(ang));
    mist.push(m); disposers.push(() => { m.geometry.dispose(); m.material.dispose(); });
  });
  // god-ray bands
  const ray = SUN.clone().negate(), up = new Vector3(0, 1, 0), s2 = up.clone().addScaledVector(ray, -up.dot(ray)).normalize(), nz = new Vector3().crossVectors(s2, ray);
  const basis = new Matrix4().makeBasis(s2, ray, nz);
  const rayMat = new ShaderMaterial({
    ...ADD, side: DoubleSide, depthTest: true,
    uniforms: { uCol: { value: new Color(C.ray) }, uA: { value: 0.12 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uCol; uniform float uA; varying vec2 vUv;
      void main() { float s = 1.0 - abs(vUv.x * 2.0 - 1.0); float a = smoothstep(0.0, 0.6, s) * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.6, vUv.y); gl_FragColor = vec4(uCol, a * uA); }`,
  });
  for (const [x, z, w] of [[-10, -20, 7, 0.12], [6, -27, 9, 0.1], [-24, -13, 6, 0.14]]) {
    const g = new PlaneGeometry(w, 90), m = new Mesh(g, rayMat); m.frustumCulled = false;
    m.applyMatrix4(basis); m.position.set(x, 9, z); m.renderOrder = 5;
    rays.push(m);
  }
  disposers.push(() => { rayMat.dispose(); rays.forEach((r) => r.geometry.dispose()); });
  // island ground: snow in flat painted value groups with pale blue shade, revealed as the court dissolves
  const islandMat = mat(ctx, U, /* glsl */ `
    vec3 shade(vec3 P, vec3 N, vec3 Vw) {
      float n = fbm(P.xz * 0.12 + 2.0) + 0.12 * strokes(warp(P.xz * 0.2, 0.3), 0.8, 0.5, 0.06);
      vec3 c = mix(${V(C.snowShade)}, ${V(C.snow)}, smoothstep(0.46, 0.5, n));
      c = mix(c, ${V("#e9f1f0")}, smoothstep(0.7, 0.74, n) * 0.6);
      return c;
    }`);
  const island = new Mesh(new PlaneGeometry(700, 700).rotateX(-Math.PI / 2), islandMat); island.position.y = -0.25; island.visible = false; island.frustumCulled = false;
  disposers.push(() => { island.geometry.dispose(); islandMat.dispose(); });
  return { mist, rays, island, dispose() { disposers.forEach((f) => f()); } };
}
