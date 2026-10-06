// The hero's power: the S^2 Vietoris-Rips corpus, the green card frame behind it, its glow, and the eye glint.
// Bible E11, E14, section 6 (Green card frame, S^2 sphere, Eye glint), Easter egg 2.
//
// Maths
//   nodes    60 points on S^2 by the Fibonacci lattice: phi_i = acos(1 - 2 (i + .5)/N), theta_i = i * pi (1 + sqrt 5),
//            nudged by a seeded jitter of 0.06 and re-normalised.
//   edges    the Vietoris-Rips complex at scale eps: edge (i, j) iff |p_i - p_j| < eps. eps is chosen as the 160th
//            smallest pair distance, so the 1-skeleton has exactly 160 edges (bible: 140-180). Edges are sorted by
//            the midpoint height so the draw-in grows from the south pole; the draw-in has 48 steps over 0.4 s:
//            shown(u) = ceil(160 * floor(48 u) / 48).
//   bloom    s(u) = 0 -> 1.12 -> 1.0 over 9 frames on threes (u in [0,1], u = (t - t0)/0.375): piecewise ease,
//            s = 1.12 sin(pi/2 * u/.6) for u < .6, then 1.12 - .12 smooth((u - .6)/.4).
//   spin     20 deg/s about y, on threes (t quantised to 1/8 s).
//   shading  hard 2-tone: n.l > 0.18 ? lit #3ddc84 : body #038903, deep shade #0a7a3c under n.l < -.45, and a hard
//            rim (1 - n.v)^3 > .55 in #b0fff9. Edges are unlit (additive #b0fff9, HDR 1.5 so they bloom a little).
//   glow     the ray-to-centre distance c = |(F - E) x (C - E)| / |F - E| on a big back-facing shell of radius 2R:
//            alpha = 0.3 exp(-3 (c / R)^2)  (#d4fffe, additive "screen at 0.3").
//   project  at the 'project' beat the sphere flies to the board, z-squashes to a 0.03 disc 3 m wide and turns to face
//            the front: pos = mix(p_float, p_board, e), scale = (1.5, 1.5, .03) mixed by e = smooth(u).
//   star     4-point glint: d = |x|^.5 + |y|^.5 (astroid) -> core exp(-18 r^2) + arms exp(-90 min(|x|,|y|)) *
//            exp(-3 max(|x|,|y|)); long arm 1.0, short arm 0.8, diagonals 0.4 as a second rotated star.
import * as THREE from "three";
import { mat, hash, sstep, lerp, prog, clamp01 } from "./lib.js";

const AddB = THREE.AdditiveBlending;

export default function corpus(ctx, U, T, L, frame) {
  const grp = new THREE.Group();
  const own = [];
  const keep = (x) => { own.push(x); return x; };
  const rng = ctx.rng("pl-corpus");

  // ---- the graph on S^2 ----
  const N = 60, R = 0.9, nodes = [];
  for (let i = 0; i < N; i++) {
    const ph = Math.acos(1 - (2 * (i + 0.5)) / N), th = i * Math.PI * (1 + Math.sqrt(5));
    const v = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
    v.x += (rng() - 0.5) * 0.12; v.y += (rng() - 0.5) * 0.12; v.z += (rng() - 0.5) * 0.12;
    nodes.push(v.normalize());
  }
  const pairs = [];
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) pairs.push([i, j, nodes[i].distanceTo(nodes[j])]);
  pairs.sort((a, b) => a[2] - b[2]);
  const edges = pairs.slice(0, 160);                       // the Rips 1-skeleton at eps = d_160
  edges.sort((a, b) => (nodes[a[0]].y + nodes[a[1]].y) - (nodes[b[0]].y + nodes[b[1]].y));
  const NE = edges.length;

  const sph = new THREE.Group(); // spins; holds body, edges, nodes
  const pivot = new THREE.Group(); pivot.add(sph); grp.add(pivot);

  // body: flat 2-tone, hard edge
  const bodyMat = keep(mat(U, /* glsl */ `
    uniform float uA;
    void main(){
      vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
      float nl = dot(n, normalize(vec3(.5, .8, .6)));
      vec3 col = nl > .18 ? vec3(.239, .863, .518) : vec3(.012, .533, .012);    // #3ddc84 / #038903
      col = nl < -.45 ? vec3(.039, .478, .235) : col;                           // #0a7a3c deep shade
      float rim = step(.55, pow(1. - max(dot(n, v), 0.), 3.));
      col = mix(col, vec3(.69, 1., .976), rim);                                 // #b0fff9 rim
      gl_FragColor = vec4(col, .74 * uA * keepClear(vW));
    }`, { uA: { value: 0 } }, { side: THREE.FrontSide }));
  const body = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(R * 0.985, 3)), bodyMat);
  body.geometry.computeVertexNormals(); body.renderOrder = 8;
  // faceted look: flat normals from non-indexed geometry
  const flat = body.geometry.toNonIndexed(); flat.computeVertexNormals(); body.geometry = flat;
  sph.add(body);

  // edges: instanced thin cylinders, unlit additive #b0fff9
  const eGeo = keep(new THREE.CylinderGeometry(1, 1, 1, 5, 1, true));
  const eMat = keep(mat(U, /* glsl */ `
    uniform float uA;
    void main(){ gl_FragColor = vec4(vec3(.69, 1., .976) * 1.5, uA * keepClear(vW)); }`, { uA: { value: 0 } }, { blend: AddB }));
  const edgeMesh = new THREE.InstancedMesh(eGeo, eMat, NE);
  edgeMesh.frustumCulled = false; edgeMesh.renderOrder = 9;
  const dm = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  edges.forEach(([i, j], e) => {
    const a = nodes[i].clone().multiplyScalar(R), b = nodes[j].clone().multiplyScalar(R);
    dir.subVectors(b, a); const len = dir.length();
    dm.position.copy(a).add(b).multiplyScalar(0.5);
    dm.quaternion.setFromUnitVectors(up, dir.normalize());
    dm.scale.set(0.011, len, 0.011); dm.updateMatrix(); edgeMesh.setMatrixAt(e, dm.matrix);
  });
  sph.add(edgeMesh);

  // nodes: white discs (r .05) with a #038903 hull ring (r .068, back faces)
  const nGeo = keep(new THREE.IcosahedronGeometry(1, 1));
  const nIn = new THREE.InstancedMesh(nGeo, keep(mat(U, /* glsl */ `
    uniform float uA; void main(){ gl_FragColor = vec4(.953, .988, .949, uA * keepClear(vW)); }`, { uA: { value: 0 } }, { side: THREE.FrontSide })), N);
  const nRing = new THREE.InstancedMesh(nGeo, keep(mat(U, /* glsl */ `
    uniform float uA; void main(){ gl_FragColor = vec4(.012, .533, .012, uA * keepClear(vW)); }`, { uA: { value: 0 } }, { side: THREE.BackSide })), N);
  nodes.forEach((p, i) => {
    dm.position.copy(p).multiplyScalar(R); dm.quaternion.identity();
    dm.scale.setScalar(0.05); dm.updateMatrix(); nIn.setMatrixAt(i, dm.matrix);
    dm.scale.setScalar(0.07); dm.updateMatrix(); nRing.setMatrixAt(i, dm.matrix);
  });
  nIn.frustumCulled = nRing.frustumCulled = false; nIn.renderOrder = 10; nRing.renderOrder = 9;
  sph.add(nRing, nIn);

  // glow: a big back-facing shell, #d4fffe at 0.3
  const glowU = { uC: { value: new THREE.Vector3() }, uR: { value: R }, uK: { value: 0 } };
  const glow = new THREE.Mesh(keep(new THREE.SphereGeometry(2.0 * R, 20, 14)), keep(mat(U, /* glsl */ `
    uniform vec3 uC; uniform float uR, uK;
    void main(){
      vec3 d = vW - cameraPosition; float c = length(cross(d, uC - cameraPosition)) / length(d);
      float a = .30 * exp(-3. * (c / uR) * (c / uR)) * uK * keepClear(vW);
      gl_FragColor = vec4(.831, 1., .996, a);
    }`, glowU, { side: THREE.BackSide, blend: AddB })));
  glow.renderOrder = 7; pivot.add(glow);

  // ---- green card frame: a 1 x 2.2 m vertical rectangle behind the sphere (the Opening's green card) ----
  const card = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.5, 2.7)), keep(mat(U, /* glsl */ `
    uniform float uK;
    void main(){
      vec2 p = (vUv - .5) * vec2(1.5, 2.7);
      vec2 q = abs(p) - vec2(.5, 1.1);                       // signed box distance: card half-size (0.5, 1.1)
      float d = length(max(q, 0.)) + min(max(q.x, q.y), 0.);
      float fill = 1. - step(0., d);
      float rim = (1. - smoothstep(0., .018, abs(d + .02))) ;                       // #b0fff9 rim just inside
      float halo = exp(-max(d, 0.) * 9.) * step(0., d);                              // #d4fffe halo outside
      vec3 col = vec3(.012, .533, .012) * fill * .9 + vec3(.69, 1., .976) * rim * 1.6 + vec3(.831, 1., .996) * halo * .35;
      gl_FragColor = vec4(col * uK * keepClear(vW), 1.);
    }`, { uK: { value: 0 } }, { blend: AddB })));
  card.renderOrder = 6; pivot.add(card);

  // ---- eye glint: 4-point star + core, attached to the seal body (the head follows the pose) ----
  const star = (rot) => ({ rot });
  const glintU = { uK: { value: 0 } };
  const glintMat = keep(mat(U, /* glsl */ `
    uniform float uK;
    float star(vec2 p, float L, float S){
      p = abs(p);
      float arms = exp(-120. * min(p.x * L, p.y * L)) * exp(-3.2 * max(p.x / L, p.y / L) * 1.0);
      float core = exp(-26. * dot(p, p));
      return arms + core * 1.2;
    }
    void main(){
      vec2 p = (vUv - .5) * 2.;
      float s = star(p, 1., 1.);
      float c = cos(.7854), sn = sin(.7854);
      s += .4 * star(mat2(c, -sn, sn, c) * p, 1., 1.);                       // diagonals at 0.4
      float halo = .28 * exp(-4. * dot(p, p));                               // #ffe2a0 halo at .28
      vec3 col = vec3(1., .992, .949) * s + vec3(1., .886, .627) * halo;
      gl_FragColor = vec4(col * uK, 1.);
    }`, glintU, { blend: AddB }));
  const glints = [];
  const g1 = new THREE.Mesh(keep(new THREE.PlaneGeometry(1, 1)), glintMat);
  const g2 = new THREE.Mesh(g1.geometry, glintMat);
  g1.renderOrder = g2.renderOrder = 20;
  ctx.seal.attach(g1, 1); ctx.seal.attach(g2, 1);
  glints.push(g1, g2);
  const tq = new THREE.Quaternion(), cq = new THREE.Quaternion();

  const cw = new THREE.Vector3();
  function update(t, dt, cue) {
    const ts8 = Math.floor(t * 8) / 8;
    const u = prog(T.corpus, t), pj = prog(T.project, t), fl = prog(T.flash, t);
    const alive = t >= T.corpus.t && !(t >= T.flash.t + T.flash.dur);   // gone at f193 (the white flash)
    pivot.visible = alive;
    // bloom scale (threes)
    const ub = clamp01((ts8 - T.corpus.t) / 0.375);
    const s = ub < 0.6 ? 1.12 * Math.sin((Math.PI / 2) * (ub / 0.6)) : 1.12 - 0.12 * sstep(0, 1, (ub - 0.6) / 0.4);
    const rise = sstep(0, 1, clamp01((ts8 - T.corpus.t) / 0.9));
    const e = sstep(0, 1, pj);
    const fp = L.sphere, bp = L.chess;
    pivot.position.set(lerp(fp[0], bp[0], e), lerp(fp[1] - 1.2 * (1 - rise), bp[1], e), lerp(fp[2], bp[2] + 0.12, e));
    sph.scale.set(s * lerp(1, 1.5 / R, e), s * lerp(1, 1.5 / R, e), s * lerp(1, 0.03, e));
    sph.rotation.y = lerp((20 * Math.PI / 180) * (ts8 - T.corpus.t), 0, e);
    // edge draw-in: 48 growth steps over 0.4 s from f170
    const ue = clamp01((ts8 - T.cardframe.t) / 0.4);
    const shown = Math.ceil((NE * Math.floor(48 * ue)) / 48);
    edgeMesh.count = Math.max(0, Math.min(NE, shown));
    const A = alive ? 1 : 0;
    bodyMat.uniforms.uA.value = A * clamp01(ub * 2);
    eMat.uniforms.uA.value = A; nIn.material.uniforms.uA.value = A * clamp01(ub * 3); nRing.material.uniforms.uA.value = A * clamp01(ub * 3);
    pivot.updateMatrixWorld(true);
    glow.getWorldPosition(cw); glowU.uC.value.copy(cw); glowU.uR.value = R * sph.scale.x * frame.group.scale.x;
    glowU.uK.value = A * clamp01(ub * 2) * (1 - 0.6 * e);
    // card: 0.4 s from f170, additive, with a hard pop
    const ck = prog(T.cardframe, t);
    card.visible = ck > 0 && ck < 1;
    card.material.uniforms.uK.value = Math.sin(Math.PI * ck) ** 0.5;
    card.position.set(0, 0, -0.95);
    card.scale.setScalar(s || 1);
    // glint: pop 0.18 s overshoot, hold, fade by 1.6 s
    const gk = t - T.glint.t;
    const pop = gk < 0 ? 0 : gk < 0.18 ? sstep(0, 1, gk / 0.18) * 1.25 : lerp(1.25, 1, sstep(0.18, 0.4, gk));
    const fade = gk < 0 ? 0 : 1 - sstep(0.7, 1.6, gk);
    glintU.uK.value = fade * (gk >= 0 ? 1 : 0);
    // billboard to the lens in the seal's body frame
    const cam = ctx.player?.camera;
    g1.parent?.getWorldQuaternion(tq);
    if (cam) cq.copy(cam.quaternion).premultiply(tq.invert());
    g1.position.set(0.1, 0.46, 0.33); g2.position.set(0.1 + 0.034, 0.46 - 0.034, 0.34);
    g1.quaternion.copy(cq); g2.quaternion.copy(cq);
    g1.scale.setScalar(0.17 * pop); g2.scale.setScalar(0.07 * pop);
    g1.visible = g2.visible = gk >= 0 && gk < 1.7;
  }
  return {
    group: grp, update,
    dispose() { own.forEach((x) => x.dispose?.()); nIn.dispose(); nRing.dispose(); edgeMesh.dispose(); glints.forEach((g) => g.parent?.remove(g)); },
  };
}
