// The shard sphere (B5 to B6) and the debris and sparks (B2 and B6): flat solids, id 0.6 in alpha, stepped on the 12 grid.
// The sphere is 60 facets with a 1 px pale seam (barycentric edges); the debris and sparks are one InstancedMesh of octahedra.
import { BufferAttribute, BufferGeometry, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Mesh, Object3D, OctahedronGeometry, ShaderMaterial, Vector3 } from "three";
import { DOCK, F, liftAt, step12, T } from "../clock.js";
import { CORE_CAP, CRM, CRM_DK, CRM_LT, FLOOR, MAG, MAG_DK, MAG_LN } from "../palette.js";

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const SPHERE_R = 2.2, SPHERE_Y = 1.2, DROP = 20, NC = 72, NS = 140, N = NC + NS, LIFE_C = 1.6, LIFE_S = 0.8, LIFE_B = 1.2;
const GRAV = 4.0, FLOOR_T = F(52), END_A = T.shard[1], B_T = [9.3, 12.2];

const SVS = `attribute vec3 aBary; attribute vec3 aCol; varying vec3 vB; varying vec3 vC; varying vec3 vN;
void main() { vB = aBary; vC = aCol; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SFS = `uniform vec3 uSeam; varying vec3 vB; varying vec3 vC; varying vec3 vN;
void main() {
  float d = dot(normalize(vN), normalize(vec3(-0.45, 0.55, 0.7))) * 0.5 + 0.5;
  vec3 c = vC * mix(0.8, 1.0, smoothstep(0.42, 0.48, d));
  float e = min(vB.x, min(vB.y, vB.z)), w = fwidth(e) + 1e-5;
  gl_FragColor = vec4(mix(c, uSeam, 1.0 - smoothstep(w, 2.0 * w, e)), 0.6);
}`;
const DVS = `attribute vec3 aCol; varying vec3 vC; void main() { vC = aCol; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`;
const DFS = "varying vec3 vC; void main() { gl_FragColor = vec4(vC, 0.6); }";

function sphereGeometry(rnd) {
  const src = new IcosahedronGeometry(SPHERE_R, 1), P = src.attributes.position.array, faces = P.length / 9;
  const zOf = (f) => (P[f * 9 + 2] + P[f * 9 + 5] + P[f * 9 + 8]) / 3;
  const keep = [...Array(faces).keys()].sort((a, b) => zOf(b) - zOf(a)).slice(DROP);
  const pos = new Float32Array(keep.length * 9), bary = new Float32Array(keep.length * 9), col = new Float32Array(keep.length * 9);
  const pal = [MAG_DK, MAG, MAG_LN].map(rgb);
  keep.forEach((f, j) => {
    const c = pal[Math.floor(rnd() * pal.length)];
    for (let v = 0; v < 3; v++) {
      const o = j * 9 + v * 3;
      pos.set(P.subarray(f * 9 + v * 3, f * 9 + v * 3 + 3), o);
      bary[o + v] = 1;
      col.set(c, o);
    }
  });
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aBary", new BufferAttribute(bary, 3));
  geo.setAttribute("aCol", new BufferAttribute(col, 3));
  geo.computeVertexNormals();
  src.dispose();
  return geo;
}

export function buildShards(ctx) {
  const group = new Group(), rnd = ctx.rng("shards");
  group.name = "the-loop-shards";

  const sphere = new Mesh(sphereGeometry(rnd), new ShaderMaterial({ uniforms: { uSeam: { value: new Vector3(...rgb(CORE_CAP)) } }, vertexShader: SVS, fragmentShader: SFS }));
  sphere.name = "the-loop-shard-sphere"; sphere.frustumCulled = false; sphere.visible = false;

  const chunk = [CRM_DK, CRM, FLOOR].map(rgb), spark = [CRM_LT, CORE_CAP].map(rgb);
  const colA = new Float32Array(N * 3), inst = [];
  for (let i = 0; i < N; i++) {
    const isSpark = i >= NC, th = rnd() * Math.PI * 2, sp = 0.4 + 1.6 * rnd(), vy = 1.0 + 3.0 * rnd(), life = isSpark ? LIFE_S : LIFE_C;
    const c = isSpark ? spark[Math.floor(rnd() * spark.length)] : chunk[Math.floor(rnd() * chunk.length)];
    colA.set(c, i * 3);
    inst.push({
      isSpark, th, sp, vy, life, born: FLOOR_T + rnd() * (END_A - FLOOR_T - life), born2: B_T[0] + rnd() * (B_T[1] - B_T[0] - LIFE_B),
      rad: 0.8 + 1.5 * rnd(), size: isSpark ? [0.02, 0.2 + 0.2 * rnd(), 0.02] : [0.15 + 0.45 * rnd(), 0.15 + 0.45 * rnd(), 0.15 + 0.45 * rnd()],
      rot: [rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI],
    });
  }
  const dgeo = new OctahedronGeometry(1, 0);
  dgeo.setAttribute("aCol", new InstancedBufferAttribute(colA, 3));
  const debris = new InstancedMesh(dgeo, new ShaderMaterial({ vertexShader: DVS, fragmentShader: DFS }), N);
  debris.name = "the-loop-debris"; debris.frustumCulled = false;
  group.add(sphere, debris);

  const obj = new Object3D(), at = new Vector3();
  const place = (i, x, y, z, s, r) => {
    obj.position.set(x, y, z); obj.rotation.set(r[0], r[1], r[2]); obj.scale.set(s[0], s[1], s[2]); obj.updateMatrix();
    debris.setMatrixAt(i, obj.matrix);
  };
  const hide = (i) => place(i, 0, 0, 0, [0, 0, 0], [0, 0, 0]);

  const update = (t) => {
    sphere.visible = t >= T.shard[0] && t < T.shard[1];
    if (sphere.visible) {
      sphere.position.set(0, SPHERE_Y + liftAt(t), -3.2);
      sphere.rotation.y = 0.6 * step12(t);
      sphere.scale.setScalar(Math.min(1, (Math.floor((t - T.shard[0]) * 12 + 1e-6) + 1) / 3));
    }
    const sp = ctx.seal?.group?.position;
    at.set((sp?.x ?? DOCK[0]) - DOCK[0], (sp?.y ?? DOCK[1]) - DOCK[1], (sp?.z ?? DOCK[2]) - DOCK[2]);
    debris.count = ctx.atTier && !ctx.atTier(3) ? Math.round(0.4 * N) : N;
    const flying = t >= FLOOR_T && t < END_A, rising = t >= B_T[0] && t < B_T[1];
    for (let i = 0; i < N; i++) {
      const q = inst[i];
      if (flying) {
        const a = t - q.born;
        if (a < 0 || a >= q.life) { hide(i); continue; }
        const s = Math.floor(a * 12 + 1e-6) / 12;
        place(i, Math.cos(q.th) * q.sp * s, q.vy * s - 0.5 * GRAV * s * s, Math.sin(q.th) * q.sp * s, q.size, q.rot);
      } else if (rising) {
        const a = t - q.born2;
        if (a < 0 || a >= LIFE_B) { hide(i); continue; }
        const s = Math.floor(a * 12 + 1e-6) / 12;
        place(i, at.x + Math.cos(q.th) * q.rad, at.y + 2.4 * s, at.z + Math.sin(q.th) * q.rad, q.size, q.rot);
      } else hide(i);
    }
    debris.instanceMatrix.needsUpdate = true;
    debris.visible = flying || rising;
  };

  return { group, update, dispose() { sphere.geometry.dispose(); sphere.material.dispose(); dgeo.dispose(); debris.material.dispose(); debris.dispose(); } };
}
