// The shatter of space for pr-polychrom-79: 240 small tetrahedra (120 below tier 3) and 40 large flat panes (the five shard colours, falling at 0.6 g) leave the 42 gate portals from T.shatter.
// Each piece is one flat colour (the instance colour), at the page's own alpha id, so the engine inks no line round it.
import { DoubleSide, InstancedMesh, ShaderMaterial, TetrahedronGeometry, Color, Vector3 } from "three";
import { BACK, DOCK, T, smooth } from "../clock.js";
import { PAL } from "../pal.js";
import { hash, put } from "../live/parts.js";
import { PORTALS } from "../world/gate.js";

const G = 1.2, BIG = 40;
const RX = new Vector3(), UY = new Vector3(), FZ = new Vector3(), V = new Vector3(), P = new Vector3();
const SHARD = Array.from({ length: 240 }, (_, i) => ({
  s: 0.35 + 0.8 * hash(i, 14),
  r: hash(i, 15) * 6, w: 2 + 5 * hash(i, 16), fall: 0.3 + hash(i, 17), g: i % PORTALS.length,
}));
const PANE = Array.from({ length: BIG }, (_, j) => ({
  s: (0.9 + 1.3 * hash(j, 41)) * (0.35 + 0.8 * hash(j, 14)),
  r: hash(j, 42) * 6, w: 2 + 5 * hash(j, 43), fall: 0.3 + hash(j, 44), g: j % PORTALS.length,
}));
const colour = (i) => PAL.shards[i % PAL.shards.length];

export function buildShards(ctx) {
  const n = ctx.atTier?.(3) ? 240 : 120;
  const mat = new ShaderMaterial({
    vertexShader: "varying vec3 vC; void main() { vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vC; void main() { gl_FragColor = vec4(vC, 0.99); }",
    side: DoubleSide, toneMapped: false, fog: false,
  });
  const mesh = new InstancedMesh(new TetrahedronGeometry(1, 0), mat, n + BIG);
  mesh.frustumCulled = false;
  mesh.visible = false;
  for (let i = 0; i < n + BIG; i++) mesh.setColorAt(i, new Color(colour(i)));
  mesh.instanceColor.needsUpdate = true;

  return {
    mesh,
    update(t, cam) {
      const age = t - T.shatter;
      mesh.visible = age > 0 && t < T.shardEnd;
      if (!mesh.visible) return;
      cam.updateMatrixWorld();
      cam.matrixWorld.extractBasis(RX, UY, FZ);
      mesh.updateWorldMatrix(true, false);
      const half = Math.tan((cam.fov * Math.PI) / 360);
      const sc = smooth(0, 0.12, age) * (1 - smooth(BACK + 0.4 - 0.05, T.shardEnd, t));
      const spread = 1 + age * 0.5, tw = Math.floor(age * 12 + 1e-6) / 12;
      for (let i = 0; i < n + BIG; i++) {
        const big = i >= n, h = big ? PANE[i - n] : SHARD[i], g = PORTALS[h.g], fallG = big ? 0.6 * G : G;
        P.set(g.x + DOCK[0] - cam.position.x, g.y + DOCK[1] - cam.position.y, g.z + DOCK[2] - cam.position.z);
        const d0 = -P.dot(FZ), u = P.dot(RX) / (d0 * half * cam.aspect), v = P.dot(UY) / (d0 * half);
        const dd = Math.max(d0 - age * 2.5, 1.5);
        V.copy(cam.position).addScaledVector(FZ, -dd).addScaledVector(RX, u * half * cam.aspect * dd * spread).addScaledVector(UY, (v * half * dd - 0.5 * fallG * h.fall * age * age) * spread);
        mesh.worldToLocal(V);
        const z = h.s * sc * dd * half * 0.16;
        put(mesh, i, V.x, V.y, V.z, z, z, z, h.r + tw * h.w, h.r * 0.5 + tw * h.w * 0.6, 0);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); mesh.dispose(); },
  };
}
