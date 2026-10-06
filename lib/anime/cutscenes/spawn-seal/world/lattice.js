// spawn-seal WORLD: the hidden topology (3.12). Seven crystal nodes are the vertices of a simplicial complex: gold filament edges between near
// neighbours (the 7 ring edges, then the 7 skip-one chords: a one-scale Rips graph), low-alpha triangle fills (i, i+1, i+2), ONE highlighted
// closed loop around the pool (the shortest cycle through all seven nodes: the hidden 1-cycle), the ground tinted into three territories
// on one sphere (cyan memory, gold files, pink scheduler as 120-degree sectors of a r 14 m disc), and three great-circle rings read as
// the sphere. No text, no plaque (L10). Layer 1.
//
// TIMING (t0 = the `lattice` beat or 331 f = 13.8 s): edge e draws on from its first node over 6 f, starting at t0 + 0.22 e (near-neighbour order);
//   triangle i fills (0.18 alpha) when its chord is done; the loop burns from t0 + 3.4 s travelling the 7 ring edges over 1.0 s, then breathes
//   1.5 s period with amplitude 0.7 + 0.3 sin; territories bloom sector by sector from t0 + 3.4 + 0.5 s each (radius reveal 5.4 -> 14 m);
//   the great circles open 0.8 s after the first sector.
// TERRITORY SHADER: a = atan(x, z) + pi; sector = floor(a / (2 pi / 3)); visible where r < 5.4 + amp_sector (14 - 5.4);
//   colour #3fdcff / #ffc83a / #ff4fa0, alpha 0.55 * (0.55 + 0.45 * hatch), hatch = step(0.5, fract((x + z) * 2.2)) (a painted wash, not a smooth gradient).
import { CylinderGeometry, DoubleSide, Group, Mesh, Quaternion, RingGeometry, ShaderMaterial, TorusGeometry, Vector3, BufferGeometry, Float32BufferAttribute } from "three";
import { C, SHARED_GLSL, V, FR, clamp, smooth, tAt } from "./common.js";

const Y = new Vector3(0, 1, 0);

function flatMat(S, col, alpha, o = {}) {
  return new ShaderMaterial({
    side: DoubleSide, transparent: alpha < 1, depthWrite: alpha >= 1,
    ...(alpha < 1 ? { blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201 } : {}),
    uniforms: { ...S.U, uBr: { value: 1 }, uA: { value: alpha } },
    vertexShader: "varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vP; uniform float uBr, uA; ${SHARED_GLSL}
      void main() { gl_FragColor = vec4(worldFinish(${V(col)} * uBr, vP), ${alpha < 1 ? "uA" : (o.id ?? 0.6).toFixed(2)}); }`,
  });
}

export function buildLattice(ctx, S) {
  const group = new Group();
  const tube = new CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0);
  const goldM = flatMat(S, C.gold, 1), coreM = flatMat(S, C.goldHot, 1, { id: 0.65 }), haloM = flatMat(S, C.goldOuter, 0.28);
  const triM = flatMat(S, C.gold, 0.18);
  const ringMs = [flatMat(S, C.cyan, 1), flatMat(S, C.terrGold, 1), flatMat(S, C.pink, 1)];
  const P = S.nodes.map((n) => new Vector3(n.x, n.tip, n.z));
  const edges = [];
  for (let i = 0; i < 7; i++) edges.push([i, (i + 1) % 7, true]);
  for (let i = 0; i < 7; i++) edges.push([i, (i + 2) % 7, false]);

  const place = (m, a, b, rad, p) => {
    const d = new Vector3().subVectors(b, a), len = d.length();
    m.position.copy(a); m.quaternion.copy(new Quaternion().setFromUnitVectors(Y, d.normalize()));
    m.scale.set(rad, Math.max(1e-4, len * p), rad);
  };
  const em = edges.map(() => { const m = new Mesh(tube, goldM); m.frustumCulled = false; m.visible = false; group.add(m); return m; });
  const lc = [], lh = [];
  for (let i = 0; i < 7; i++) {
    const c = new Mesh(tube, coreM), h = new Mesh(tube, haloM);
    for (const m of [c, h]) { m.frustumCulled = false; m.visible = false; group.add(m); }
    h.renderOrder = 7; lc.push(c); lh.push(h);
  }
  // triangles
  const tg = new BufferGeometry(), pos = [];
  for (let i = 0; i < 7; i++) for (const k of [i, (i + 1) % 7, (i + 2) % 7]) pos.push(P[k].x, P[k].y, P[k].z);
  tg.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const tris = [];
  for (let i = 0; i < 7; i++) {
    const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(pos.slice(i * 9, i * 9 + 9), 3));
    const m = new Mesh(g, triM); m.frustumCulled = false; m.visible = false; m.renderOrder = 4; group.add(m); tris.push(m);
  }
  // territories
  const secU = { uSec: { value: new Vector3() } };
  const terGeo = new RingGeometry(5.4, 14, 120, 1).rotateX(-Math.PI / 2).translate(0, S.gy + 0.025, 0);
  const terMat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201,
    uniforms: { ...S.U, ...secU },
    vertexShader: "varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vP; uniform vec3 uSec; ${SHARED_GLSL}
      void main() {
        float a = atan(vP.x, vP.z) + 3.14159265, r = length(vP.xz);
        int s = int(floor(a / 2.0943951)); s = clamp(s, 0, 2);
        float amp = s == 0 ? uSec.x : (s == 1 ? uSec.y : uSec.z);
        if (r > 5.4 + amp * 8.6) discard;
        vec3 col = s == 0 ? ${V(C.cyan)} : (s == 1 ? ${V(C.terrGold)} : ${V(C.pink)});
        float hatch = step(0.5, fract((vP.x + vP.z) * 2.2));
        gl_FragColor = vec4(worldFinish(col, vP), 0.55 * (0.55 + 0.45 * hatch));
      }`,
  });
  const ter = new Mesh(terGeo, terMat); ter.frustumCulled = false; ter.visible = false; ter.renderOrder = 3; group.add(ter);
  // great circles (the sphere): radius 10 about (0, gy + 1.5, 0), three tilted planes
  const circGeo = new TorusGeometry(10, 0.035, 6, 120);
  const circles = ringMs.map((m) => { const c = new Mesh(circGeo, m); c.frustumCulled = false; c.visible = false; c.position.set(0, S.gy + 1.5, 0); group.add(c); return c; });

  function update(cue, live) {
    const t = cue.ts, t0 = tAt(cue, "lattice", FR(331));
    const show = live && t >= t0;
    group.visible = show;
    if (!show) { secU.uSec.value.set(0, 0, 0); return; }
    edges.forEach(([a, b], e) => {
      const s = t0 + 0.22 * e, p = clamp((t - s) / FR(6));
      em[e].visible = p > 0; place(em[e], P[a], P[b], 0.04, p);
    });
    for (let i = 0; i < 7; i++) {
      const done = t0 + 0.22 * (7 + i) + FR(6);
      const k = smooth((t - done) / 0.3); tris[i].visible = k > 0.01;
    }
    triM.uniforms.uA.value = 0.18;
    // loop: burns along the ring edges, then breathes
    const loopT = tAt(cue, "loop", t0 + 3.4), br = 0.7 + 0.3 * Math.sin(((t - loopT) / 1.5) * Math.PI * 2);
    for (let i = 0; i < 7; i++) {
      const p = clamp((t - loopT - (i / 7) * 1.0) / (1 / 7)), a = P[i], b = P[(i + 1) % 7];
      lc[i].visible = p > 0; lh[i].visible = p > 0;
      place(lc[i], a, b, 0.09, p); place(lh[i], a, b, 0.2 * (0.8 + 0.4 * br), p);
    }
    coreM.uniforms.uBr.value = 0.85 + 0.25 * br;
    haloM.uniforms.uA.value = 0.28 * br;
    // territories sector by sector, then the circles
    const terT = tAt(cue, "territories", loopT + 0.5);
    secU.uSec.value.set(smooth((t - terT) / 0.5), smooth((t - terT - 0.5) / 0.5), smooth((t - terT - 1.0) / 0.5));
    ter.visible = t > terT;
    const cK = smooth((t - terT - 0.8) / 0.8);
    circles.forEach((c, i) => {
      c.visible = cK > 0.01; c.scale.setScalar(Math.max(0.001, cK));
      c.rotation.set(0.5 * i + 0.06 * t * (i + 1), 1.0 * i + 0.05 * t, 0.7 * i);
    });
  }
  return { group, update, dispose() { tube.dispose(); tg.dispose(); terGeo.dispose(); terMat.dispose(); circGeo.dispose(); [goldM, coreM, haloM, triM, ...ringMs].forEach((m) => m.dispose()); tris.forEach((m) => m.geometry.dispose()); } };
}
