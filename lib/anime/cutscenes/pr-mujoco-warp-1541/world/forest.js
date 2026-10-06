// THE FOREST (bible 3.11, Easter egg 4): 22 ajisa trees, one per diagonal cell. ONE instanced draw + ONE instanced ink hull (layer 1).
//
//  ajisa      a slim bent trunk (r 0.05 -> 0.03, 0.42 m, bend x += 0.035 (y / 0.42)^2) under a bulbous canopy: four ellipsoids
//             (0.27x0.21 main, two 0.16 side lobes, a 0.14 crown) reaching 0.95 m; normals of an ellipsoid at centre c, radii r: n = normalize(p_unit / r).
//  shading    hard 2-tone with AO under the canopy: lam = 0.5 + 0.5 N.L, lam *= mix(0.65, 1, smoothstep(0.5, 0.68, h)); canopy lit #8fe0b8 (lam > .62),
//             mid #5fc29a (> .42), shadow #3f9f8a, deep #1f6a60 (< .25); trunk #6b4f9c / shadow #4a2878; cream #fbfaf7 sliver where N.(-.5,.8,.35) > 0.94;
//             the diagonal cell's #fff3c2 glow rides in as aG (1 at lift-off, 0 by f230) and fades into the canopy.
//  outline    2 px #1f6a60 inverted hull.
//  spots      22 points in x [-1.9, 3.7], z [-4.3, 0.9]: never within 1.25 m of the seal (any of its positions, 1.4x scale), never in the corridor
//             between the seal and the lens (z > seal z, |dx| < 0.8), at least 0.62 m apart (Poisson rejection on ctx.rng).
//             Spots and diagonal cells are paired by sorted x so arcs do not cross.
//  lift       tree i leaves its cell at td_i = tS + 0.75 + 0.03 i, 0.75 s on a 0.6 m sine arc; scale ramps to full in the first third;
//             landing: a 4-frame squash (sy 1 - 0.22 sin(pi v), sxz 1 + 0.15 sin(pi v)); after f236 a sway of 0.07 rad sin(2.3 t + i).
//  sparkles   two 4-point cream stars per tree (astroid sqrt|x| + sqrt|y| < 1, camera-facing), twinkle on twos, once the tree has landed.
import { BufferAttribute, CylinderGeometry, DoubleSide, Color, Euler, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { surface } from "../../../kit/surface.js";
import { V, FLOOR, SUN, sm, clamp01, cellX, cellZ, instHull, sealSpots } from "./common.js";
import { TREE_DEPART } from "./floor.js";

const N_TREES = 22;
const TREE_H = 0.95;

function treeGeometry() {
  const parts = [];
  const tr = new CylinderGeometry(0.03, 0.05, 0.42, 6, 4, false).translate(0, 0.21, 0);
  const P = tr.attributes.position;
  for (let i = 0; i < P.count; i++) { const y = P.getY(i); P.setX(i, P.getX(i) + 0.035 * (y / 0.42) ** 2); }
  tr.computeVertexNormals();
  parts.push([tr.toNonIndexed(), 0]);
  const lobe = (c, r) => {
    const g = new IcosahedronGeometry(1, 2);
    const p = g.attributes.position, nrm = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const nx = x / r[0], ny = y / r[1], nz = z / r[2], l = Math.hypot(nx, ny, nz) || 1;
      nrm[i * 3] = nx / l; nrm[i * 3 + 1] = ny / l; nrm[i * 3 + 2] = nz / l;
      p.setXYZ(i, c[0] + x * r[0], c[1] + y * r[1], c[2] + z * r[2]);
    }
    g.setAttribute("normal", new BufferAttribute(nrm, 3));
    parts.push([g, 1]);
  };
  lobe([0, 0.66, 0], [0.27, 0.21, 0.27]);
  lobe([0.15, 0.58, 0.05], [0.16, 0.13, 0.16]);
  lobe([-0.14, 0.60, -0.04], [0.15, 0.12, 0.15]);
  lobe([0, 0.84, 0], [0.13, 0.11, 0.13]);
  const geos = parts.map(([g, part]) => {
    g.deleteAttribute("uv");
    const n = g.attributes.position.count, a = new Float32Array(n), h = new Float32Array(n);
    for (let i = 0; i < n; i++) { a[i] = part; h[i] = g.attributes.position.getY(i) / TREE_H; }
    g.setAttribute("aPart", new BufferAttribute(a, 1)); g.setAttribute("aH", new BufferAttribute(h, 1));
    return g;
  });
  return mergeGeometries(geos);
}

export function buildForest(ctx) {
  const { THREE, engine } = ctx;
  const sh = engine.shared;
  const R = ctx.rng(31);
  const group = new THREE.Group();
  group.userData.layer = 1;

  // ---- spots ----
  const seals = sealSpots(ctx);
  const ok = (x, z, taken, minD) => {
    for (const [sx, , sz] of seals) {
      if (Math.hypot(x - sx, z - sz) < 1.25) return false;
      if (z > sz && Math.abs(x - sx) < 0.8) return false;
    }
    return !taken.some((q) => Math.hypot(q[0] - x, q[1] - z) < minD);
  };
  let spots = [];
  for (const minD of [0.62, 0.55, 0.45]) {
    spots = [];
    for (let g = 0; g < 6000 && spots.length < N_TREES; g++) {
      const x = -1.9 + R() * 5.6, z = -4.3 + R() * 5.2;
      if (ok(x, z, spots, minD)) spots.push([x, z]);
    }
    if (spots.length === N_TREES) break;
  }
  while (spots.length < N_TREES) spots.push([3.7 - spots.length * 0.1, -4.3]);   // unreachable in practice: a deterministic fallback
  spots.sort((a, b) => a[0] - b[0]);
  const scales = Array.from({ length: N_TREES }, () => 0.8 + R() * 0.18);

  // ---- meshes ----
  const geo = treeGeometry();
  const aG = new InstancedBufferAttribute(new Float32Array(N_TREES), 1);
  geo.setAttribute("aG", aG);
  const mat = surface(sh, /* glsl */ `
    varying float vPart; varying float vH; varying float vG;
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      vec3 L = normalize(vec3(${SUN.map((v) => v.toFixed(4)).join(", ")}));
      float lam = dot(N, L) * 0.5 + 0.5;
      vec3 c;
      if (vPart < 0.5) {
        c = lam > 0.55 ? ${V("#6b4f9c")} : ${V("#4a2878")};
      } else {
        lam *= mix(0.65, 1.0, smoothstep(0.5, 0.68, vH));                 // AO under the canopy
        c = ${V("#3f9f8a")};
        c = mix(c, ${V("#5fc29a")}, step(0.42, lam));
        c = mix(c, ${V("#8fe0b8")}, step(0.62, lam));
        c = mix(c, ${V("#1f6a60")}, step(lam, 0.25));
        c = mix(c, ${V("#fbfaf7")}, step(0.94, dot(N, normalize(vec3(-0.5, 0.8, 0.35)))));   // hard top-left sliver
        c = mix(c, ${V("#fff3c2")}, vG * 0.85);                           // the diagonal cell's glow fades into the canopy
      }
      return c;
    }`, { instanced: true, attrs: "attribute float aPart; attribute float aH; attribute float aG; varying float vPart; varying float vH; varying float vG;",
    vert: "vPart = aPart; vH = aH; vG = aG;", varyings: "varying float vPart; varying float vH; varying float vG;", tools: ["noise"] });
  const mesh = new InstancedMesh(geo, mat, N_TREES);
  mesh.frustumCulled = false;
  const hull = instHull(mesh, sh, { col: "#1f6a60", px: 2 });
  group.add(hull, mesh);

  // sparkles
  const sparkMat = new ShaderMaterial({
    side: DoubleSide,
    uniforms: { uCol: { value: new Color("#fbfaf7") } },
    vertexShader: `varying vec2 vP; void main() { vP = position.xy * 2.0; vec4 mv = viewMatrix * modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      mv.xy += position.xy * instanceMatrix[0].x; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; varying vec2 vP; void main() { if (sqrt(abs(vP.x)) + sqrt(abs(vP.y)) > 1.0) discard; gl_FragColor = vec4(uCol, 0.5); }`,
  });
  const sparkGeo = new PlaneGeometry(1, 1);
  const sparks = new InstancedMesh(sparkGeo, sparkMat, N_TREES * 2);
  sparks.frustumCulled = false;
  group.add(sparks);

  const m4 = new Matrix4(), pos = new Vector3(), scl = new Vector3(), qu = new Quaternion(), eu = new Euler();
  const hash = (a) => { const s = Math.sin(a * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const hideM = new Matrix4().makeScale(0, 0, 0);

  return {
    group,
    update(ts, cue, T) {
      const swayK = sm(T.tc + 2.83, T.tc + 3.3, ts);
      const g = aG.array;
      for (let i = 0; i < N_TREES; i++) {
        const td = TREE_DEPART(T, i), uu = clamp01((ts - td) / 0.75);
        const s0 = scales[i];
        const sp = spots[i];
        if (ts < td) { mesh.setMatrixAt(i, hideM); sparks.setMatrixAt(i * 2, hideM); sparks.setMatrixAt(i * 2 + 1, hideM); g[i] = 1; continue; }
        const e = sm(0, 1, uu);
        const sx = cellX(i), sz = cellZ(i), sy = FLOOR.cy + FLOOR.h * 2;       // the lifted, grown cell top
        pos.set(sx + (sp[0] - sx) * e, sy * (1 - e) + 0.6 * Math.sin(Math.PI * uu), sz + (sp[1] - sz) * e);
        const v = clamp01((ts - (td + 0.75)) / (4 / 24)), k = Math.sin(Math.PI * v) * (v > 0 && v < 1 ? 1 : 0);
        const grow = Math.max(0.05, sm(0, 0.33, uu));
        scl.set(s0 * grow * (1 + 0.15 * k), s0 * grow * (1 - 0.22 * k), s0 * grow * (1 + 0.15 * k));
        const amp = 0.07 * swayK;
        eu.set(amp * 0.6 * Math.sin(1.9 * ts + i * 1.7), 0, amp * Math.sin(2.3 * ts + i));
        qu.setFromEuler(eu);
        m4.compose(pos, qu, scl);
        mesh.setMatrixAt(i, m4);
        g[i] = 1 - sm(td, td + 0.75, ts);
        // two sparkles once landed, twinkling on twos
        for (let q = 0; q < 2; q++) {
          const tw = hash(i * 7 + q * 3 + Math.floor(ts * 12));
          if (uu < 1 || tw < 0.4) { sparks.setMatrixAt(i * 2 + q, hideM); continue; }
          const sz2 = 0.045 + 0.04 * tw;
          m4.makeScale(sz2, sz2, sz2);
          m4.setPosition(sp[0] + (q ? -0.1 : 0.12) * s0, (0.7 + 0.2 * hash(i + q * 9.1)) * s0, sp[1] + (q ? 0.06 : -0.08) * s0);
          sparks.setMatrixAt(i * 2 + q, m4);
        }
      }
      mesh.instanceMatrix.needsUpdate = true; sparks.instanceMatrix.needsUpdate = true; aG.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.dispose(); hull.userData.mat.dispose(); sparkGeo.dispose(); sparkMat.dispose(); },
  };
}
