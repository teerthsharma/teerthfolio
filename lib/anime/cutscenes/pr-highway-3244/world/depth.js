// Depth from near to far on the speedway's own parallax: long sunset cast shadows of the stands, foreground tyres, rocks and cacti the camera passes, plus the table's car paint for the rivals.
import { Group, Mesh, Object3D, ShaderMaterial } from "three";
import { BLOCKS, cactus, rocks, tyres } from "../live/land.js";
import { shadowPool } from "../live/fx.js";
import { KEY_U, solid } from "../live/shade.js";
import { T } from "../live/path.js";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { BETA } from "../race.js";
import { warp } from "../clock.js";

export const TABLE = ["ufotable", "shinkai", "phys"];
export const loadTable = () => Promise.all(TABLE.map((p) => loadPack(p)));
export function pulled(names) {
  try { return glslFor(names); } catch (e) { console.warn("[pr-highway-3244] table pull missing:", names.join(","), String(e).slice(0, 160)); return null; }
}

const PAINT_V = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() {
    vec4 p = vec4(position, 1.0); vec3 n = normal; vC = vec3(1.0);
    #ifdef USE_INSTANCING
      p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vC = instanceColor;
    #endif
    vec4 w = modelMatrix * p; vW = w.xyz; vN = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

// the rivals' paint: the table's carPaint (flake under clearcoat) on the instance colour; falls back to the live solid when the table is not loaded
export function carPaintMaterial() {
  const glsl = pulled(["carPaint"]);
  if (!glsl) return solid({ fogK: 0.0042 });
  return new ShaderMaterial({
    uniforms: { uKey: KEY_U, uEmit: { value: 0 } },
    vertexShader: PAINT_V,
    fragmentShader: /* glsl */ `
      uniform vec3 uKey;
      varying vec3 vW; varying vec3 vN; varying vec3 vC;
      ${glsl}
      void main() {
        vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vW);
        gl_FragColor = vec4(carPaint(N, normalize(uKey), V, vW.xz * 9.0, vC), 0.99);
      }`,
  });
}

export default function buildDepth() {
  const group = new Group(), dtr = new Group();
  const shadows = shadowPool(BLOCKS.length);
  const O = new Object3D();
  BLOCKS.forEach((x0, i) => {
    O.position.set(x0 + 22 - 3, 0.02, -13);
    O.rotation.set(0, 0, 0);
    O.scale.set(44, 1, 22);
    O.updateMatrix();
    shadows.setMatrixAt(i, O.matrix);
  });
  shadows.instanceMatrix.needsUpdate = true;
  const nearTyres = tyres();
  nearTyres.position.set(0, 0, 19);
  const nearRocks = rocks();
  nearRocks.position.set(0, 0, 2);
  dtr.add(shadows, nearTyres, nearRocks);
  for (const [x, z] of [[BLOCKS[1] + 10, 8], [BLOCKS[3] - 6, 8.5]]) {
    const c = new Mesh(cactus(), solid({ fogK: 0.0042 }));
    c.position.set(x, 0, z);
    c.scale.setScalar(1.15);
    dtr.add(c);
  }
  group.add(dtr);
  return {
    group,
    update(tc, st) {
      group.visible = tc >= 1.6 && warp(tc) < T.swap;
      if (!st) return;
      dtr.position.set(st.trackX, st.trackY, st.trackZ);
      dtr.rotation.y = BETA;
    },
    dispose() {
      shadows.dispose(); nearTyres.dispose(); nearRocks.dispose();
    },
  };
}
