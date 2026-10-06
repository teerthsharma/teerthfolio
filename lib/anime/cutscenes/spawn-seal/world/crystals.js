// spawn-seal WORLD: crystal clusters. Seven NAMED NODE clusters on a ring r 6.5 m (the vertices of the topology lattice; they ignite
// from cyan #3fdcff to gold #ffd23a when a Megiddo beam lands), plus decor clusters at the cave base in the bible's palette.
// Hex prisms 0.5 - 1.8 m tall, 0.12 - 0.3 m wide, tilted 5 - 25 degrees, clusters of 4 - 9, pyramid tips.
//
// CRYSTAL SHADER (maths): facet normal from derivatives; lum = 0.25 + 0.6 max(N.y, 0) + 1.3 lp;  tone = step(0.42, lum)
//   col = mix(shadow #1fa0d8, lit (tip-bright to base-dark gradient baked per face), tone); ignite g in 0..1 (per node):
//   lit -> #ffd23a, shadow -> #b8801a, ink #06204a -> #7a4a0a, emission += #ffd23a * 0.35 g (peaks just over 1.0, so only a lit node blooms)
//   creases carry a 2 px ink line and, on lit faces, a thin #e8ffff rim.
import { BufferAttribute, Color, ConeGeometry, CylinderGeometry, Mesh, ShaderMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C, MOUTH_W, SHARED_GLSL, V, WALL_R } from "./common.js";
import { facet } from "./cave.js";

export function crystalMaterial(S) {
  const uIg = { value: Array.from({ length: 7 }, () => 0) };
  S.igU = uIg;
  const mat = new ShaderMaterial({
    uniforms: { ...S.U, uIg },
    vertexShader: `attribute vec3 aBary, aEdge, aCol, aSh; attribute float aNode; uniform float uIg[7];
      varying vec3 vP, vBary, vEdge, vCol, vSh; varying float vIg;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vBary = aBary; vEdge = aEdge; vCol = aCol; vSh = aSh;
        vIg = aNode < 0.0 ? 0.0 : uIg[int(aNode + 0.5)]; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vP, vBary, vEdge, vCol, vSh; varying float vIg; ${SHARED_GLSL}
      void main() {
        vec3 N = normalize(cross(dFdx(vP), dFdy(vP)));
        if (dot(N, normalize(cameraPosition - vP)) < 0.0) N = -N;
        vec3 Lp = uPoolPos - vP; float dp = length(Lp);
        float lp = uPool * max(dot(N, Lp / dp), 0.0) / (1.0 + 0.01 * dp * dp);
        float lum = 0.25 + 0.6 * max(N.y, 0.0) + 1.3 * lp;
        float tone = step(0.42, lum);
        vec3 lit = mix(vCol, ${V(C.gold)}, vIg), shd = mix(vSh, ${V("#b8801a")}, vIg);
        vec3 col = mix(shd, lit, tone);
        vec3 b = vBary + (1.0 - vEdge) * 9.0;
        float d = min(b.x, min(b.y, b.z)), w = fwidth(d);
        float ink = 1.0 - smoothstep(w * 1.0, w * 1.6, d);
        float rim = (1.0 - smoothstep(w * 2.2, w * 3.0, d)) * tone;
        col = mix(col, ${V(C.lensRim)}, rim * 0.7);
        col = mix(col, mix(${V("#06204a")}, ${V(C.goldLine)}, vIg), ink);
        col += ${V(C.gold)} * 0.35 * vIg * tone;
        gl_FragColor = vec4(worldFinish(min(col, vec3(1.25)), vP), 0.45);
      }`,
  });
  return mat;
}

// one crystal: a hex prism with a pyramid tip, tilted, standing at (x, base, z); colours graded base -> tip
function crystal(R, x, base, z, h, w, hex, nodeId) {
  const hp = h * 0.78, ht = h * 0.22;
  const prism = new CylinderGeometry(w * 0.82, w, hp, 6, 1).translate(0, hp / 2, 0);
  const tip = new ConeGeometry(w * 0.82, ht, 6, 1).translate(0, hp + ht / 2, 0);
  const g0 = mergeGeometries([prism.toNonIndexed(), tip.toNonIndexed()].map((q) => { q.deleteAttribute("uv"); return q; }));
  const tilt = (5 + R() * 20) * Math.PI / 180;
  g0.rotateZ(tilt * (R() > 0.5 ? 1 : -1)).rotateX(tilt * (R() - 0.5) * 2).rotateY(R() * 6.28).translate(x, base, z);
  const lit = new Color(hex), dark = new Color(hex).multiplyScalar(0.55);
  const g = facet(g0, (c) => {
    const k = Math.min(1, Math.max(0, (c.y - base) / h));
    const cl = dark.clone().lerp(lit, 0.3 + 0.7 * k).lerp(new Color(C.lensRim), 0.25 * k * k);
    return { c: cl, s: new Color(C.poolDeep).lerp(lit, 0.25) };
  });
  g.setAttribute("aNode", new BufferAttribute(new Float32Array(g.attributes.position.count).fill(nodeId), 1));
  return g;
}

export function buildCrystals(ctx, S, mat) {
  const { THREE } = ctx;
  const R = ctx.rng(31);
  const nodes = new THREE.Group(), decor = new THREE.Group();

  // the seven nodes: a tall central spire (tip at 1.7 m above ground) with 5 - 8 satellites
  const nodeGeos = [];
  for (const n of S.nodes) {
    nodeGeos.push(crystal(R, n.x, S.gy, n.z, 1.7, 0.26, NODE, n.i));
    const m = 5 + Math.floor(R() * 4);
    for (let j = 0; j < m; j++) {
      const a = R() * 6.28, r = 0.18 + R() * 0.5;
      nodeGeos.push(crystal(R, n.x + Math.cos(a) * r, S.gy - 0.05, n.z + Math.sin(a) * r, 0.5 + R() * 1.0, 0.12 + R() * 0.12, NODE, n.i));
    }
  }
  const nm = new Mesh(mergeGeometries(nodeGeos), mat); nm.frustumCulled = false; nodes.add(nm);

  // decor clusters in the bible palette: #37e8ff #c050ff #7a6bff #ff5ad8 #46ffd0 #4aa0ff
  const decGeos = [];
  for (let c = 0; c < 30; c++) {
    const a = R() * Math.PI * 2, r = 9 + Math.sqrt(R()) * (WALL_R - 11), x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.abs(x) < MOUTH_W / 2 + 1 && z < -20) continue;
    const hex = C.decor[Math.floor(R() * C.decor.length)], n = 4 + Math.floor(R() * 6);
    for (let j = 0; j < n; j++) {
      const q = R() * 6.28, rr = R() * 0.6;
      decGeos.push(crystal(R, x + Math.cos(q) * rr, S.gy, z + Math.sin(q) * rr, 0.5 + R() * R() * 1.4, 0.12 + R() * 0.18, hex, -1));
    }
  }
  const dm = new Mesh(mergeGeometries(decGeos), mat); dm.frustumCulled = false; decor.add(dm);
  for (const g of [...nodeGeos, ...decGeos]) g.dispose();
  return { nodes, decor, dispose() { nm.geometry.dispose(); dm.geometry.dispose(); } };
}

const NODE = "#3fdcff";
