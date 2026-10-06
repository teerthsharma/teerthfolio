// p-tangle WORLD: the crater rim, the wooded spit, the two islets, cedars, boulders, reeds, town lights. Bible 3.4 and 3.6.
//
// GEOMETRY MATHS. The lake is an ellipse (ax 80 m, az 66.5 m). A point is (u, th): u = sqrt((x/80)^2 + (z/66.5)^2) the elliptical radius,
// th = atan2(x, -z) the angle from the sun side (-z). The rim height is
//   H(th, u) = mix( notch(u), crest(th) * prof(u), n(th) ),   n = S(.25, 1, |th|)
//   crest(th) = 9 + 6 sin(2.3 th + .7) + 3.5 sin(5.1 th + 2) + 1.8 sin(11 th)        (clamped >= 3)
//   prof(u)   = S(1, 1.8, u) - 1.35 S(2.4, 3.4, u)                                   (a slope up, a plateau, a drop to the cloud sea)
//   notch(u)  = -10 S(1, 1.35, u)                                                    (the sun-side gap: the lake spills into the cloud sea)
// Mounds (the spit, the islets): H = top (1 - S(rFlat, rEdge, d)) - .35 S(.6 rEdge, rEdge, d) + dab noise.
import { BufferGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, BoxGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, Object3D, PlaneGeometry, Quaternion, Vector3 } from "three";
import { V } from "./sky.js";
import { solidMaterial, mergeParts } from "./materials.js";

export const LAKE = { ax: 80, az: 66.5, y: -0.12 };
export const ISLETS = [
  { x: 0, z: 0, flat: 1.9, edge: 3.4, top: -0.02, name: "seal" },
  { x: 2, z: -26, flat: 1.7, edge: 3.1, top: -0.02, name: "girl" },
];
export const SPIT = { x: -30, z: 6, edge: 12.5, flat: 3.0, top: 6.0 };

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function n2(x, y) { // value noise
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const crest = (th) => Math.max(3, 9 + 6 * Math.sin(2.3 * th + 0.7) + 3.5 * Math.sin(5.1 * th + 2) + 1.8 * Math.sin(11 * th));

export function rimH(x, z) {
  const u = Math.hypot(x / LAKE.ax, z / LAKE.az), th = Math.atan2(x, -z);
  if (u < 0.97) return -0.6;
  const n = sm(0.25, 1.0, Math.abs(th));
  const prof = sm(1.0, 1.8, u) - 1.35 * sm(2.4, 3.4, u);
  const rim = crest(th) * prof + (n2(x * 0.05, z * 0.05) - 0.5) * 5 * sm(1.0, 1.6, u) + (n2(x * 0.3, z * 0.3) - 0.5) * 0.9 * sm(1.0, 1.4, u);
  const notch = -10 * sm(1.0, 1.35, u);
  const h = notch + (rim - notch) * n;
  return h;
}
function moundH(x, z, m) {
  const d = Math.hypot(x - m.x, z - m.z);
  if (d > m.edge) return -1;
  const bump = (n2(x * 0.5, z * 0.5) - 0.5) * 0.25 * (1 - sm(0, m.edge, d)) + (n2(x * 2.1, z * 2.1) - 0.5) * 0.08;
  return m.top * (1 - sm(m.flat, m.edge, d)) - 0.35 * sm(m.edge * 0.6, m.edge, d) + bump * sm(m.flat * 0.5, m.flat, d);
}
// the height anything stands on
export function groundH(x, z) {
  let h = rimH(x, z);
  for (const i of ISLETS) h = Math.max(h, moundH(x, z, i));
  h = Math.max(h, moundH(x, z, SPIT));
  return h;
}

// a flat-grid mesh displaced by a height function, around (cx, cz)
function gridGeo(cx, cz, size, seg, fn) {
  const g = new PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, z = p.getZ(i) + cz; p.setXYZ(i, x, fn(x, z), z); }
  g.computeVertexNormals();
  return g;
}

function rimGeo() {
  const NR = 64, NA = 200, pos = [], idx = [];
  for (let j = 0; j <= NR; j++) {
    const t = j / NR, u = 0.96 + 2.44 * Math.pow(t, 1.6);
    for (let i = 0; i <= NA; i++) {
      const th = -Math.PI + (i / NA) * 2 * Math.PI;
      const x = LAKE.ax * u * Math.sin(th), z = -LAKE.az * u * Math.cos(th);
      pos.push(x, rimH(x, z), z);
    }
  }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---- albedo: hills, grass, forest, rock. Dab strokes + tree-by-tree Voronoi pockets (no outlines: edges are value breaks) ----
const ALB_GROUND = /* glsl */ `
vec3 albedo(vec3 wp, vec3 n) {
  float h = wp.y;
  float t1 = vn(wp.xz * 0.35) * 0.5 + fbm(wp.xz * 0.08) * 0.5;
  vec3 dark = ${V("#273e30")}, mid = ${V("#3f6a40")}, litc = ${V("#8fb04a")}, rock = ${V("#473b3f")}, rockLit = ${V("#833544")};
  vec3 a = mix(dark, mid, smoothstep(0.35, 0.7, t1 + (1.0 - smoothstep(0.0, 9.0, h)) * 0.3));
  float sunSide = smoothstep(0.1, 0.5, dot(n, uSunDir));
  a = mix(a, litc, smoothstep(0.62, 0.85, t1) * sunSide);
  float slope = 1.0 - n.y;
  float rk = smoothstep(0.5, 0.78, slope + (h - 14.0) * 0.02);
  a = mix(a, mix(rock, rockLit, sunSide), rk);
  float st = strokes(wp.xz * 0.5, 0.9, 0.8, 0.12);
  a *= 0.88 + 0.24 * st;
  vec2 c = vor(wp.xz * 0.16);                       // tree-by-tree pockets on the hillsides
  a *= mix(1.0, 0.78 + 0.3 * smoothstep(0.1, 0.5, c.x), smoothstep(1.0, 3.0, h) * (1.0 - rk));
  // the near-shore band is a little warmer and lighter grass (poster tones #3c7a2a, #8fc43a)
  a = mix(a, mix(${V("#3c7a2a")}, ${V("#8fc43a")}, vn(wp.xz * 0.9)), (1.0 - smoothstep(0.0, 1.5, h)) * 0.5 * (1.0 - rk));
  return a;
}`;
const ALB_CEDAR = /* glsl */ `
vec3 albedo(vec3 wp, vec3 n) {
  float tier = vRnd.z;
  vec3 dark = ${V("#273e30")}, mid = ${V("#3f6a40")};
  vec3 a = mix(dark, mid, 0.25 + 0.35 * vRnd.y + 0.2 * n.y);
  a *= 0.9 + 0.2 * vn(wp.xz * 1.3 + wp.y);
  return a;
}`;
const ALB_STONE = /* glsl */ `
vec3 albedo(vec3 wp, vec3 n) {
  vec3 shadow = ${V("#473b3f")}, lit = ${V("#833544")};
  vec3 a = mix(shadow, lit, smoothstep(0.0, 0.5, dot(n, uSunDir)));
  return a * (0.9 + 0.2 * vn(wp.xz * 2.5 + wp.y * 1.7));
}`;
const ALB_REED = /* glsl */ `
vec3 albedo(vec3 wp, vec3 n) {
  float g = vCol.x;                                  // 0 base .. 1 tip, stored in aCol.x
  vec3 a = mix(${V("#3c7a2a")}, ${V("#8fc43a")}, smoothstep(0.0, 0.6, g));
  a = mix(a, ${V("#d8e070")}, smoothstep(0.7, 1.0, g) * (0.4 + 0.6 * vRnd.y));
  return a;
}`;

export function buildTerrain(ctx, U, noiseGlsl, add, dispose) {
  const rng = ctx.rng("tangle-land");
  const THREE = ctx.THREE;
  const ground = solidMaterial(U, noiseGlsl, ALB_GROUND, { rim: 1, silW: 1 });
  dispose(ground);

  // rim
  const rim = new Mesh(rimGeo(), ground); rim.frustumCulled = false; add(rim, 0);
  dispose(rim.geometry);
  // spit and islets: grids of their own
  const spit = new Mesh(gridGeo(SPIT.x, SPIT.z, SPIT.edge * 2, 64, (x, z) => moundH(x, z, SPIT)), ground); spit.frustumCulled = false; add(spit, 0);
  dispose(spit.geometry);
  for (const m of ISLETS) {
    const g = gridGeo(m.x, m.z, m.edge * 2, 32, (x, z) => moundH(x, z, m));
    const mesh = new Mesh(g, ground); mesh.frustumCulled = false; add(mesh, 0); dispose(g);
  }

  // ---- cedars: tiered cones with a tapering silhouette, one-edge sun rim from paintLit ----
  const tiers = [], tr = [[0.36, 0.34, 0.1], [0.29, 0.32, 0.3], [0.22, 0.3, 0.5], [0.15, 0.28, 0.7]];
  for (const [r, h, y] of tr) {
    const c = new ConeGeometry(r, h, 7, 1, false); c.translate(0, y + h * 0.5, 0); tiers.push({ geo: c, color: { r: 1, g: 1, b: 1 } });
  }
  const trunk = new CylinderGeometry(0.03, 0.045, 0.2, 5); trunk.translate(0, 0.1, 0); tiers.push({ geo: trunk, color: { r: 1, g: 1, b: 1 } });
  const cedarGeo = mergeParts(tiers);
  const cedarMat = solidMaterial(U, noiseGlsl, ALB_CEDAR, { rim: 1, silW: 1 }); dispose(cedarMat);
  const spots = [];
  const tryPlace = (x, z, s) => { const y = groundH(x, z); if (y > 0.3) spots.push([x, y - 0.1, z, s]); };
  // rim forest, clustered by noise, on the lower slopes
  for (let k = 0; k < 2600 && spots.length < 460; k++) {
    const th = (rng() * 2 - 1) * Math.PI, u = 1.02 + rng() * 0.75;
    const x = LAKE.ax * u * Math.sin(th), z = -LAKE.az * u * Math.cos(th);
    if (n2(x * 0.04, z * 0.04) < 0.46) continue;
    if (Math.abs(th) < 0.35) continue;
    tryPlace(x, z, 5 + rng() * 6);
  }
  // spit forest, off the stair axis (the stair runs from the spit toward the seal)
  const ax = new Vector3(-SPIT.x, 0, -SPIT.z).normalize();
  for (let k = 0; k < 400 && spots.length < 520; k++) {
    const a = rng() * Math.PI * 2, d = 4.5 + rng() * 7;
    const x = SPIT.x + Math.cos(a) * d, z = SPIT.z + Math.sin(a) * d;
    const lx = (x - SPIT.x) * ax.x + (z - SPIT.z) * ax.z, lz = Math.abs((x - SPIT.x) * -ax.z + (z - SPIT.z) * ax.x);
    if (lx > 0 && lz < 3.2) continue;
    tryPlace(x, z, 3 + rng() * 3.5);
  }
  const cedars = new InstancedMesh(cedarGeo, cedarMat, spots.length);
  const rnd = new Float32Array(spots.length * 4), o = new Object3D();
  spots.forEach(([x, y, z, s], i) => {
    o.position.set(x, y, z); o.rotation.set(0, rng() * 6.28, 0); o.scale.set(s * (0.85 + rng() * 0.3), s * (0.9 + rng() * 0.3), s * (0.85 + rng() * 0.3)); o.updateMatrix(); cedars.setMatrixAt(i, o.matrix);
    rnd.set([rng(), rng(), rng(), rng()], i * 4);
  });
  cedarGeo.setAttribute("aRnd", new InstancedBufferAttribute(rnd, 4));
  cedars.frustumCulled = false; add(cedars, 0); dispose(cedarGeo);

  // ---- boulders: faceted icospheres, hard stone tones, around the islets and shore ----
  const boulderMat = solidMaterial(U, noiseGlsl, ALB_STONE, { facet: true, rim: 1, silW: 0.6 }); dispose(boulderMat);
  const bg = new THREE.IcosahedronGeometry(1, 1);
  const bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++) { const f = 0.78 + 0.45 * hash(Math.round(bp.getX(i) * 40), Math.round(bp.getY(i) * 40) + Math.round(bp.getZ(i) * 40)); bp.setXYZ(i, bp.getX(i) * f, bp.getY(i) * f * 0.8, bp.getZ(i) * f); }
  bg.computeVertexNormals();
  const bpos = [];
  for (const m of ISLETS) for (let k = 0; k < 9; k++) { const a = rng() * 6.28, d = m.flat * (0.9 + rng() * 0.9); bpos.push([m.x + Math.cos(a) * d, m.z + Math.sin(a) * d, 0.18 + rng() * 0.3]); }
  for (let k = 0; k < 30; k++) { const a = rng() * 6.28, d = SPIT.flat * 2 + rng() * 6; bpos.push([SPIT.x + Math.cos(a) * d, SPIT.z + Math.sin(a) * d, 0.3 + rng() * 0.8]); }
  for (let k = 0; k < 34; k++) { const th = (rng() * 2 - 1) * Math.PI; if (Math.abs(th) < 0.3) continue; const u = 1.01 + rng() * 0.05; bpos.push([LAKE.ax * u * Math.sin(th), -LAKE.az * u * Math.cos(th), 0.8 + rng() * 2.2]); }
  const boulders = new InstancedMesh(bg, boulderMat, bpos.length);
  bpos.forEach(([x, z, s], i) => {
    // keep the camera's seal clear: islet boulders stay out of the 1.9 m flat, and low
    o.position.set(x, groundH(x, z) + s * 0.15, z); o.rotation.set(rng(), rng() * 6.28, rng()); o.scale.set(s * 1.2, s, s * 1.1); o.updateMatrix(); boulders.setMatrixAt(i, o.matrix);
  });
  boulders.frustumCulled = false; add(boulders, 0); dispose(bg);

  // ---- reeds and grass tufts: 3 tones, blade triangles, wind sway (layer 1). Low near the seal: nothing covers it. ----
  const blade = new BufferGeometry();
  blade.setAttribute("position", new Float32BufferAttribute([-0.04, 0, 0, 0.04, 0, 0, 0.0, 1, 0], 3));
  blade.setAttribute("normal", new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  blade.setAttribute("aCol", new Float32BufferAttribute([0, 0, 0, 0, 0, 0, 1, 0, 0], 3));
  const reedMat = solidMaterial(U, noiseGlsl, ALB_REED, { sway: true, side: THREE.DoubleSide, rim: 0.6, silW: 0.5 }); dispose(reedMat);
  const reedSpots = [];
  for (const m of ISLETS) for (let k = 0; k < 140; k++) { // low tufts on the islet skirts only (0.25 to 0.45 m)
    const a = rng() * 6.28, d = 3.0 + rng() * 0.5; reedSpots.push([m.x + Math.cos(a) * d, m.z + Math.sin(a) * d, 0.25 + rng() * 0.2]);
  }
  for (let k = 0; k < 520; k++) { // tall reeds along the shore and the spit foot
    if (k % 2) { const a = rng() * 6.28, d = SPIT.edge * (0.78 + rng() * 0.14); reedSpots.push([SPIT.x + Math.cos(a) * d, SPIT.z + Math.sin(a) * d, 1.2 + rng() * 1.6]); }
    else { const th = (rng() * 2 - 1) * Math.PI; if (Math.abs(th) < 0.3) continue; const u = 0.985 + rng() * 0.02; reedSpots.push([LAKE.ax * u * Math.sin(th), -LAKE.az * u * Math.cos(th), 1.5 + rng() * 2.2]); }
  }
  const reeds = new InstancedMesh(blade, reedMat, reedSpots.length * 3);
  const rr = new Float32Array(reedSpots.length * 3 * 4);
  reedSpots.forEach(([x, z, h], i) => {
    for (let j = 0; j < 3; j++) { // a clump of three blades
      const ix = i * 3 + j, bx = x + (rng() - 0.5) * 0.5, bz = z + (rng() - 0.5) * 0.5;
      o.position.set(bx, Math.max(groundH(bx, bz), LAKE.y) - 0.05, bz); o.rotation.set((rng() - 0.5) * 0.25, rng() * 6.28, (rng() - 0.5) * 0.25); o.scale.set(1.2, h * (0.7 + rng() * 0.5), 1); o.updateMatrix();
      reeds.setMatrixAt(ix, o.matrix); rr.set([rng(), rng(), rng(), rng()], ix * 4);
    }
  });
  blade.setAttribute("aRnd", new InstancedBufferAttribute(rr, 4));
  reeds.frustumCulled = false; add(reeds, 1); dispose(blade);

  // ---- town: dark roofs and windows, lights warm #ffc060, on the lower slopes of both banks ----
  const houseMat = solidMaterial(U, noiseGlsl, `vec3 albedo(vec3 wp, vec3 n) { return mix(${V("#3a2537")}, ${V("#5a4a6a")}, vRnd.y * 0.5) * (0.9 + 0.2 * vn(wp.xz * 3.0)); }`, { silW: 0.4, rim: 0.4 });
  dispose(houseMat);
  const hg = new BoxGeometry(1, 0.8, 1).translate(0, 0.4, 0);
  const hp = [];
  for (let k = 0; k < 4000 && hp.length < 90; k++) {
    const side = rng() < 0.5 ? -1 : 1, th = side * (0.9 + rng() * 0.9) + (rng() < 0.3 ? Math.PI * side * 0.35 : 0);
    const u = 1.02 + rng() * 0.12, x = LAKE.ax * u * Math.sin(th), z = -LAKE.az * u * Math.cos(th);
    if (n2(x * 0.08, z * 0.08) < 0.5) continue;
    const y = groundH(x, z); if (y < 0.1) continue;
    hp.push([x, y, z]);
  }
  const houses = new InstancedMesh(hg, houseMat, hp.length);
  const wg = new PlaneGeometry(0.5, 0.28);
  const winMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: "uniform float uTime; void main() { mat4 M = modelMatrix; M = M * instanceMatrix; gl_Position = projectionMatrix * viewMatrix * M * vec4(position, 1.0); }",
    fragmentShader: `uniform float uTown; void main() { gl_FragColor = vec4(${V("#ffc060")} * (0.55 + 0.55 * uTown), 0.5); }`,
  });
  dispose(winMat);
  const wins = new InstancedMesh(wg, winMat, hp.length * 2);
  const q = new Quaternion();
  hp.forEach(([x, y, z], i) => {
    const s = 3 + rng() * 2.4, yaw = Math.atan2(-x, -z) + (rng() - 0.5) * 0.6;
    o.position.set(x, y - 0.1, z); o.rotation.set(0, yaw, 0); o.scale.set(s, s * (0.8 + rng() * 0.4), s * (1 + rng() * 0.4)); o.updateMatrix(); houses.setMatrixAt(i, o.matrix);
    houses.geometry; // (windows sit on the lake-facing wall)
    for (let w = 0; w < 2; w++) {
      const lx = (w - 0.5) * s * 0.45, lzf = s * 0.5 + 0.02;
      const wx = x + Math.cos(yaw) * lx + Math.sin(yaw) * lzf, wz = z - Math.sin(yaw) * lx + Math.cos(yaw) * lzf;
      o.position.set(wx, y + s * 0.3, wz); o.rotation.set(0, yaw, 0); o.scale.setScalar(s * 0.35); o.updateMatrix(); wins.setMatrixAt(i * 2 + w, o.matrix);
    }
  });
  houses.frustumCulled = false; wins.frustumCulled = false; add(houses, 0); add(wins, 0); dispose(hg); dispose(wg);
  void q; void tiers;
}
