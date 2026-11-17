// THE FAR DUNES and THE SAND DRIFT of pr-xnnpack-10801. The far dunes are three copies of the live desert (live/world.js) at 3, 6 and 11
// times its size, stepped back to the horizon, so the contour lines keep drawing to the black sky. The drift is thin ink ribbons of wind-
// blown sand over the dunes, on twos, shown only at tier 2 and only before the break.
import { DoubleSide, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paperMaterial } from "../live/ink.js";
import { desert, groundHeight } from "../live/world.js";
import { HIT } from "../clock.js";
import { tone } from "../tone.js";

const FAR = [[3, 1.6, 3, -1.2], [6, 2.2, 6, -3], [11, 3.0, 11, -6]]; // [sx, sy, sz, y]: each copy starts where the one before ends
const DESERT_NEAR = 50, DESERT_FAR = -210; // live/world.js desert(): the plane spans z -210 to 50
const N_DRIFT = 48;
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };

export function buildFar(shared) {
  const base = desert();
  let near = DESERT_FAR;
  const parts = FAR.map(([sx, sy, sz, y]) => {
    const g = base.clone(), zo = near - DESERT_NEAR * sz;
    for (const a of [g.attributes.position, g.attributes.aCenter]) for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) * sx, a.getY(i) * sy + y, a.getZ(i) * sz + zo);
    near -= (DESERT_NEAR - DESERT_FAR) * sz;
    return g;
  });
  const g = mergeGeometries(parts, false);
  const m = tone(paperMaterial(shared, 2));
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  const group = new Group();
  group.add(mesh);
  return { group, dispose() { g.dispose(); m.dispose(); base.dispose(); } };
}

export function buildDrift(shared, ctx) {
  const geo = new PlaneGeometry(6, 0.025).rotateX(-Math.PI / 2);
  const seed = new Float32Array(N_DRIFT), x0 = new Float32Array(N_DRIFT), zs = new Float32Array(N_DRIFT), ys = new Float32Array(N_DRIFT);
  for (let i = 0; i < N_DRIFT; i++) { seed[i] = rnd(i, 4); x0[i] = 40 * rnd(i, 1) - 20; zs[i] = -2 + 16 * rnd(i, 2); ys[i] = 0.05 + 0.35 * rnd(i, 3); }
  geo.setAttribute("aSeed", new InstancedBufferAttribute(seed, 1));
  const m = tone(new ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute float aSeed; varying vec2 vUv; varying float vSeed;
      void main() { vUv = uv; vSeed = aSeed; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv; varying float vSeed;
      void main() {
        if (fract(vUv.x * 7.0 + vSeed) < 0.55) discard;
        gl_FragColor = vec4(pow(vec3(0.031, 0.039, 0.059), vec3(2.2)), 0.99);
      }`,
    side: DoubleSide,
  }));
  const mesh = new InstancedMesh(geo, m, N_DRIFT);
  mesh.frustumCulled = false;
  const group = new Group();
  group.add(mesh);
  group.visible = false;
  const M = new Matrix4(), P = new Vector3();
  const place = (t) => {
    const step = Math.floor(Math.max(0, t) * 12) / 12;
    for (let i = 0; i < N_DRIFT; i++) {
      const x = ((((x0[i] + 1.8 * step + 20) % 40) + 40) % 40) - 20, z = zs[i];
      P.set(x, groundHeight(x, z) + ys[i], z);
      M.makeTranslation(P.x, P.y, P.z);
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  return {
    group,
    update(t) {
      group.visible = (ctx.engine?.tier ?? 0) >= 2 && t < HIT.brk;
      if (group.visible) place(t);
    },
    dispose() { geo.dispose(); m.dispose(); mesh.dispose(); },
  };
}
