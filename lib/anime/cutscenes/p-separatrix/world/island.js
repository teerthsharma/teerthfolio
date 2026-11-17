// The island the scene opens and closes on: the site's own land from its height field (lib/world/terrain.js), the checkpoint pavilion
// from certify-roof.js, two cyan pools and a bench. Local origin is the dock point; the fresco stage hides it behind a plaster page.
import { BackSide, BufferGeometry, Color, CircleGeometry, Float32BufferAttribute, Group, BoxGeometry, Mesh, MeshBasicMaterial, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { groundAt } from "../../../../../lib/world/terrain.js";
import { groundShadow } from "../../../pup.js";
import { buildFasciaGeo, buildRibbonGeo, buildRoofGeo, POOL_X, POOL_Z } from "../../../../../components/world/monuments/parts/certify-roof.js";
import { DOCK } from "../clock.js";
import { tone } from "../tone.js";

const HALF = 30;
const SNOW = new Color("#f6f1f6");
const SHADE = new Color(0.64, 0.7, 0.92);
const SUN = new Vector3(-0.35, 0.9, 0.25).normalize();
const PAVILION = [0, 0, -9];

function land() {
  const o = {};
  groundAt(DOCK[0], DOCK[2], o);
  const h0 = o.h;
  const n = HALF * 2 + 1;
  const H = new Float32Array(n * n);
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    groundAt(DOCK[0] + ix - HALF, DOCK[2] + iz - HALF, o);
    H[iz * n + ix] = o.h - h0;
  }
  const pos = [], col = [], c = new Color(), A = new Vector3(), B = new Vector3(), C = new Vector3(), N = new Vector3();
  const V = (ix, iz) => new Vector3(ix - HALF, H[iz * n + ix], iz - HALF);
  const tri = (p, q, r) => {
    A.copy(p); B.copy(q); C.copy(r);
    N.copy(B).sub(A).cross(C.clone().sub(A)).normalize();
    const lit = Math.max(0, N.dot(SUN));
    c.copy(SHADE).lerp(SNOW, Math.min(1, 0.4 + 0.9 * lit));
    for (const v of [A, B, C]) pos.push(v.x, v.y, v.z), col.push(c.r, c.g, c.b);
  };
  for (let iz = 0; iz < n - 1; iz++) for (let ix = 0; ix < n - 1; ix++) {
    tri(V(ix, iz), V(ix, iz + 1), V(ix + 1, iz + 1));
    tri(V(ix, iz), V(ix + 1, iz + 1), V(ix + 1, iz));
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

function dome() {
  const g = new SphereGeometry(400, 24, 12);
  const p = g.attributes.position, col = [], lo = new Color("#cfe3f3"), hi = new Color("#a4d0ee"), c = new Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(lo).lerp(hi, Math.min(1, Math.max(0, p.getY(i) / 400)));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

export function buildIsland() {
  const group = new Group();
  const scene = new Group();
  const landGeo = land();
  const landMat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const landMesh = new Mesh(landGeo, landMat);
  const domeGeo = dome();
  const domeMat = new MeshBasicMaterial({ vertexColors: true, side: BackSide, toneMapped: false, depthWrite: false, fog: false });
  const domeMesh = new Mesh(domeGeo, domeMat);

  const pav = new Group();
  pav.position.set(...PAVILION);
  const roofGeo = buildRoofGeo();
  const roofMat = new MeshBasicMaterial({ color: "#f3ede4", toneMapped: false });
  const fasciaGeo = buildFasciaGeo();
  const fasciaMat = new MeshBasicMaterial({ color: "#43434c", toneMapped: false });
  const ribbonGeo = buildRibbonGeo();
  const glassMat = new MeshBasicMaterial({ color: "#27a6b8", toneMapped: false });
  pav.add(new Mesh(roofGeo, roofMat), new Mesh(fasciaGeo, fasciaMat), new Mesh(ribbonGeo, glassMat));
  const poolGeo = new CircleGeometry(0.9, 24).rotateX(-Math.PI / 2);
  const poolMat = new MeshBasicMaterial({ color: "#27a6b8", toneMapped: false });
  for (const s of [-1, 1]) {
    const pool = new Mesh(poolGeo, poolMat);
    pool.position.set(s * POOL_X, 0.02, POOL_Z);
    pav.add(pool);
  }
  const benchGeo = new BoxGeometry(1.6, 0.12, 0.42);
  const benchMat = new MeshBasicMaterial({ color: "#c08a5e", toneMapped: false });
  const bench = new Mesh(benchGeo, benchMat);
  bench.position.set(0, 0.45, 2.6);
  pav.add(bench);

  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  scene.add(landMesh, domeMesh, pav, shadow);

  const plasterGeo = new SphereGeometry(300, 16, 8);
  const plasterMat = tone(new ShaderMaterial({
    vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "void main() { gl_FragColor = vec4(0.929, 0.761, 0.678, 0.99); }",
    side: BackSide,
    depthWrite: false,
  }));
  const plaster = new Mesh(plasterGeo, plasterMat);
  plaster.visible = false;

  group.add(scene, plaster);

  const page = (on, pupVisible = true) => {
    scene.visible = !on;
    plaster.visible = on;
    shadow.visible = !on && pupVisible;
  };
  const dispose = () => {
    for (const x of [landGeo, domeGeo, roofGeo, fasciaGeo, ribbonGeo, poolGeo, benchGeo, plasterGeo]) x.dispose();
    for (const x of [landMat, domeMat, roofMat, fasciaMat, glassMat, poolMat, benchMat, plasterMat]) x.dispose();
    shadow.geometry?.dispose?.();
    shadow.material?.dispose?.();
  };
  return { group, page, dispose };
}
