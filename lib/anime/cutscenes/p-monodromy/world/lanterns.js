// LANTERN STRINGS (bible 3.7b): two festival strings across the quay behind the seal (z -5.5 and -10.5), 9 lanterns each, a hard emissive
// disc (value 2.6, so it blooms) with a two-ring halo of radius about 12 px, #ffb347. The warm accent survives the storm grade (keep = 1).
// Maths:
//   string: P(s) = lerp(a, b, s) - (0, sag 4 s (1 - s), 0), a, b the pole tops at y 5.0, sag 0.9 m; lantern k at s = (k + 0.5)/9.
//   halo: a camera-facing quad built in the vertex shader: mv = MV (centre, 1); mv.xy += corner R; mv.z -= 0.35 (pushed behind the body);
//     fragment d = |corner|: d < 0.46 core (#ffd28a x 1.5), d < 1 ring (#ffb347 x 0.9, hard), else discard. R = 0.62 m.
// Poles: wood posts with a gold cap on the quay side rails (x +-10.9). Hidden-fold: the halos hide while the island is folded.
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, CylinderGeometry, Float32BufferAttribute, Group, Mesh, ShaderMaterial, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { ARCH, C, GLOW, V, joinParts, mat, part } from "./common.js";

export function buildLanterns(ctx, U) {
  const stat = new Group(), hal = new Group();
  const rail = [], body = [], centres = [];
  for (const z of [-5.5, -10.5]) {
    const a = new Vector3(-10.9, 5.0, z), b = new Vector3(10.9, 5.0, z);
    for (const p of [a, b]) {
      rail.push(part(new CylinderGeometry(0.1, 0.14, p.y, 8).translate(p.x, p.y / 2, z), "#6a4a2a", 8));
      rail.push(part(new SphereGeometry(0.16, 8, 6).translate(p.x, p.y + 0.1, z), C.goldLit, 6));
    }
    const at = (s) => new Vector3().lerpVectors(a, b, s).add(new Vector3(0, -0.9 * 4 * s * (1 - s), 0));
    const pts = []; for (let i = 0; i <= 16; i++) pts.push(at(i / 16));
    rail.push(part(new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.03, 4), "#5a3a48", 0));
    for (let k = 0; k < 9; k++) {
      const p = at((k + 0.5) / 9); p.y -= 0.34;
      body.push(part(new SphereGeometry(1, 10, 8).scale(0.26, 0.36, 0.26).translate(p.x, p.y, p.z), C.lantern, 2.6));
      rail.push(part(new CylinderGeometry(0.1, 0.1, 0.08, 8).translate(p.x, p.y + 0.38, p.z), C.goldLit, 6));
      centres.push(p);
    }
  }
  const railGeo = joinParts(rail), bodyGeo = joinParts(body);
  const railMat = mat(ctx, U, ARCH, { id: 0.5 }), bodyMat = mat(ctx, U, GLOW, { id: 0.99 });
  const railMesh = new Mesh(railGeo, railMat), bodyMesh = new Mesh(bodyGeo, bodyMat);
  railMesh.frustumCulled = bodyMesh.frustumCulled = false;
  stat.add(railMesh, bodyMesh);

  // halos: 4 verts per lantern, centre in `position`, corner in `aCorner`
  const pos = [], cor = [], idx = [];
  centres.forEach((c, i) => {
    for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(c.x, c.y, c.z); cor.push(cx, cy); }
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const hg = new BufferGeometry();
  hg.setAttribute("position", new Float32BufferAttribute(pos, 3)); hg.setAttribute("aCorner", new Float32BufferAttribute(cor, 2)); hg.setIndex(idx);
  const hm = new ShaderMaterial({
    depthWrite: true,
    vertexShader: `attribute vec2 aCorner; varying vec2 vCo;
      void main() { vCo = aCorner; vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xy += aCorner * 0.62; mv.z -= 0.35; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec2 vCo;
      void main() { float d = length(vCo); if (d > 1.0) discard;
        vec3 c = d < 0.46 ? ${V("#ffd28a")} * 1.5 : ${V(C.lantern)} * 0.9;
        gl_FragColor = vec4(c, 0.99); }`,
  });
  const hmesh = new Mesh(hg, hm); hmesh.frustumCulled = false; hal.add(hmesh);
  void BufferAttribute;
  return {
    stat, hal,
    update(folded) { hal.visible = !folded; },
    dispose() { railGeo.dispose(); bodyGeo.dispose(); hg.dispose(); railMat.dispose(); bodyMat.dispose(); hm.dispose(); },
  };
}
