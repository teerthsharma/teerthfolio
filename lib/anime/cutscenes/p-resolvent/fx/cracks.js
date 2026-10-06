// KINTSUGI CRACKS AND THE UNMAKING (bible 3.20, shots 8-9, egg 4): gold crack trees from the broken scale across the flagstones
// (frames 274-317 = 11.4-13.2 s) and across the sky (13.2-15.2 s), then the gold unmake front that eats the court (13.0-15.4 s).
//
// The crack is a BRANCHING PROOF TREE, not noise: from a root, a trunk of 5 jittered links; at its end two children
//   angle +/- (.4 + .4 u), length x .72, depth <= 6, with a diamond node at every junction (premises joining to a conclusion).
// Every ribbon vertex carries aD = path distance from the root / Dmax. The reveal is   discard if aD > reach,   reach = smooth(t0, t1, t),
// so the crack GROWS along its own paths. Two hard tones across the ribbon (aV = -1..1): |aV| < .42 core #ffd488, else edge #d9a93a.
// Ground trees live in (x, z) metres on the floor; sky trees live in (azimuth, elevation) radians mapped on a shell R = 420 about the seal.
//
// unmake-wipe: on the floor, d = |wp.xz - c|, front rf = 70 smooth(13.0, 15.4, t); the gold seam is where |d - rf + 6 (vn(.35 wp.xz) - .5)| < .8,
// hard two-tone, colour #ffc760 x 2.2 at the core (above 1 so the post bloom catches it; the seal never goes through this pass).
import { PAL, T, GLSL_NOISE, GLSL_CLEAR, shader, sstep } from "./common.js";

const VERT = /* glsl */ `attribute float aD; attribute float aV; varying float vD; varying float vV; varying vec3 vW;
void main(){ vD = aD; vV = aV; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = /* glsl */ `uniform vec3 cCore, cEdge; uniform float uReach, uA; varying float vD; varying float vV; varying vec3 vW;
${GLSL_CLEAR}
void main(){
  if (vD > uReach) discard;
  float tip = 1.0 - smoothstep(uReach - 0.03, uReach, vD);   // the growing tip burns brighter and thinner
  float w = abs(vV);
  if (w > 1.0 - 0.0 * tip) discard;
  vec3 col = w < 0.42 ? cCore : cEdge;
  col *= 1.0 + 0.5 * (1.0 - tip);
  gl_FragColor = vec4(col, uA * sealClear(vW));
}`;

function genTree(r, start, angle, len, depth, maxDepth, d0, out) {
  const pts = [start], dd = [d0]; let a = angle, p = start, d = d0; const n = 5;
  for (let i = 0; i < n; i++) { a += (r() - 0.5) * 0.5; p = [p[0] + Math.cos(a) * len / n, p[1] + Math.sin(a) * len / n]; d += len / n; pts.push(p); dd.push(d); }
  out.segs.push({ pts, dd, depth });
  out.nodes.push({ p, d, depth });
  if (d > out.dmax) out.dmax = d;
  if (depth < maxDepth) {
    genTree(r, p, a + 0.4 + r() * 0.4, len * 0.72, depth + 1, maxDepth, d, out);
    genTree(r, p, a - 0.4 - r() * 0.4, len * 0.72, depth + 1, maxDepth, d, out);
  }
}

// map: (u, v) -> [x, y, z];  nrm(p3) -> unit normal;  w0: ribbon half-width (world units) at depth 0
function buildGeo(THREE, trees, map, nrm, w0, nodeR) {
  const pos = [], aD = [], aV = [], idx = [];
  const dmax = Math.max(...trees.map((t) => t.dmax));
  const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const push = (p, d, v) => { pos.push(p.x, p.y, p.z); aD.push(d / dmax); aV.push(v); return pos.length / 3 - 1; };
  for (const tr of trees) {
    for (const s of tr.segs) {
      const P = s.pts.map((q) => v3(map(q[0], q[1])));
      const hw = w0 * Math.pow(0.78, s.depth);
      let prev = null;
      for (let i = 0; i < P.length; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        const tan = b.clone().sub(a).normalize(), n = v3(nrm(P[i]));
        const side = tan.clone().cross(n).normalize().multiplyScalar(hw * (1 - 0.45 * (i / (P.length - 1))));
        const L = push(P[i].clone().sub(side), s.dd[i], -1), Rr = push(P[i].clone().add(side), s.dd[i], 1);
        if (prev) { idx.push(prev[0], prev[1], L, prev[1], Rr, L); }
        prev = [L, Rr];
      }
    }
    for (const nd of tr.nodes) {                       // junction diamonds
      const c = v3(map(nd.p[0], nd.p[1])), n = v3(nrm(c));
      const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const e1 = up.clone().cross(n).normalize(), e2 = n.clone().cross(e1).normalize();
      const rr = nodeR * Math.pow(0.82, nd.depth);
      const ci = push(c, nd.d, 0);
      const ring = [e1.clone().multiplyScalar(rr), e2.clone().multiplyScalar(rr * 0.7), e1.clone().multiplyScalar(-rr), e2.clone().multiplyScalar(-rr * 0.7)].map((o) => push(c.clone().add(o), nd.d, 0.9));
      for (let i = 0; i < 4; i++) idx.push(ci, ring[i], ring[(i + 1) % 4]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aD", new THREE.Float32BufferAttribute(aD, 1)); g.setAttribute("aV", new THREE.Float32BufferAttribute(aV, 1));
  g.setIndex(idx);
  return g;
}

const WIPE_FRAG = /* glsl */ `uniform vec3 uC3; uniform float uF; varying vec3 vW; varying vec2 vUv;
${GLSL_NOISE}
void main(){
  float d = length(vW.xz - uC3.xz);
  float rf = uF * 70.0;
  float n = (vn(vW.xz * 0.35) - 0.5) * 6.0;
  float e = abs(d - rf + n);
  float core = step(e, 0.32), seam = step(e, 0.8);
  if (uF <= 0.0 || seam < 0.5) discard;
  vec3 gold = vec3(1.0, 0.78, 0.376);
  gl_FragColor = vec4(core > 0.5 ? gold * 2.2 : gold * 0.9, 1.0);
}`;
const WIPE_VERT = /* glsl */ `varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

export default function cracks(ctx, S, A) {
  const THREE = ctx.THREE, group = new THREE.Group(); group.name = "kintsugi";
  const C = (h) => new THREE.Color(h);
  const seal = ctx.seal, r = ctx.rng("cracks");
  const mat = (zoff) => { const m = shader(THREE, { vert: VERT, frag: FRAG, add: true, uniforms: { cCore: { value: C(PAL.crackCore) }, cEdge: { value: C(PAL.crackEdge) }, uReach: { value: 0 }, uA: { value: 1 }, uSeal: S.uSeal, uSealR: S.uSealR } }); m.polygonOffset = true; m.polygonOffsetFactor = zoff; m.polygonOffsetUnits = zoff; return m; };

  // floor: three proof trees from under the scale (egg 4: they trace the branching tree of the proof)
  const gTrees = [];
  for (let i = 0; i < 3; i++) { const o = { segs: [], nodes: [], dmax: 0 }; genTree(r, [A.scale[0], A.scale[2]], i * 2.094 + 0.3 + r() * 0.4, 3.2, 0, 6, 0, o); gTrees.push(o); }
  const gGeo = buildGeo(THREE, gTrees, (u, v) => [u, A.ground + 0.04, v], () => [0, 1, 0], 0.2, 0.34);
  const gMat = mat(-2);
  const ground = new THREE.Mesh(gGeo, gMat); ground.frustumCulled = false; ground.renderOrder = 3;

  // sky: a proof tree climbing from the horizon behind the scale (az 0 = +x)
  const RS = 420;
  const sTrees = [];
  for (let i = 0; i < 3; i++) { const o = { segs: [], nodes: [], dmax: 0 }; genTree(r, [(i - 1) * 0.55, 0.05], 1.3 + (i - 1) * 0.35 + r() * 0.2, 0.34, 0, 6, 0, o); sTrees.push(o); }
  const sGeo = buildGeo(THREE, sTrees, (az, el) => [Math.cos(el) * Math.cos(az) * RS, Math.sin(el) * RS, Math.cos(el) * Math.sin(az) * RS], (p) => [-p.x / RS, -p.y / RS, -p.z / RS], 2.6, 4.5);
  const sMat = mat(0);
  const sky = new THREE.Mesh(sGeo, sMat); sky.frustumCulled = false; sky.renderOrder = 2;
  group.add(ground, sky);

  // unmake front
  const wipeGeo = new THREE.PlaneGeometry(170, 170); wipeGeo.rotateX(-Math.PI / 2);
  const wipeMat = shader(THREE, { vert: WIPE_VERT, frag: WIPE_FRAG, add: true, uniforms: { uC3: { value: new THREE.Vector3(A.scale[0], A.ground, A.scale[2]) }, uF: { value: 0 } } });
  const wipe = new THREE.Mesh(wipeGeo, wipeMat); wipe.position.set(A.scale[0], A.ground + 0.06, A.scale[2]); wipe.frustumCulled = false; wipe.renderOrder = 4;
  group.add(wipe);

  function update(t, dt, cue) {
    const c0 = Number.isFinite(cue.since("cracks")) ? cue.t - cue.since("cracks") : T.crack[0];
    const g = sstep(c0, c0 + (T.crack[1] - T.crack[0]), t);
    const k = sstep(T.crack[1], T.crack[1] + 2.0, t);           // sky reach 13.2 -> 15.2
    const fade = 1 - sstep(14.8, 15.4, t);
    gMat.uniforms.uReach.value = g * 1.001; gMat.uniforms.uA.value = fade; ground.visible = g > 0.001 && fade > 0.001;
    sMat.uniforms.uReach.value = k * 1.001; sMat.uniforms.uA.value = fade; sky.visible = k > 0.001 && fade > 0.001;
    sky.position.set(seal.at[0], seal.at[1], seal.at[2]);
    const u0 = Number.isFinite(cue.since("unmake")) ? cue.t - cue.since("unmake") : T.unmake[0];
    const f = sstep(u0, u0 + (T.unmake[1] - T.unmake[0]), t);
    wipeMat.uniforms.uF.value = f; wipe.visible = f > 0.001 && f < 0.999;
  }
  return { group, update, dispose() { gGeo.dispose(); sGeo.dispose(); wipeGeo.dispose(); gMat.dispose(); sMat.dispose(); wipeMat.dispose(); } };
}
