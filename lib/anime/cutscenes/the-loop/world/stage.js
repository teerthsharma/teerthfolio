// The sky of the loop: three painted plates from the pack, one shown at a time (calm, fracture, castle), and the fissure floor under the seal.
import { CircleGeometry, Group, Mesh, ShaderMaterial } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { T, crackAt, drainAt, step12 } from "../clock.js";

await loadPack("cuts");

const FLOOR_UNIT = 2.4;
const FLOOR_R = 70;
const CRACK_M = 16;

function plate(ctx, name, tool) {
  const U = { ...uniformsFor([tool]), uT: { value: 0 } };
  const body = `uniform float uT; vec3 paint(vec2 p) { return ${tool}(vec2(p.x / max(uLpAsp, 0.5), p.y), uT); }`;
  const mesh = ctx.bake.plateLayer(body, { tools: [tool], uniforms: U });
  mesh.name = name;
  return { mesh, U };
}

function floor() {
  const U = uniformsFor(["loopFissureFloor"]);
  U.uLpAsp.value = 1;
  U.uLpFlCx.value = 0;
  U.uLpFlCy.value = 0;
  U.uLpFlSnow.value = 0;
  const u = FLOOR_UNIT.toFixed(3);
  const material = new ShaderMaterial({
    uniforms: U,
    vertexShader: "varying vec3 vL; void main() { vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `${glslFor(["loopFissureFloor"])}\nvarying vec3 vL;\nvoid main() { gl_FragColor = vec4(loopFissureFloor(vec2(0.5 + vL.x / ${u}, 0.5 - vL.z / ${u}), 0.0), 0.6); }`,
  });
  const mesh = new Mesh(new CircleGeometry(FLOOR_R, 64).rotateX(-Math.PI / 2), material);
  mesh.name = "the-loop-floor";
  return { mesh, U };
}

export function buildStage(ctx) {
  const group = new Group();
  const calm = plate(ctx, "the-loop-sky-calm", "loopCalmSky");
  const fracture = plate(ctx, "the-loop-sky-fracture", "loopFractureSky");
  const castle = plate(ctx, "the-loop-sky-castle", "loopCastleSky");
  const plates = [calm, fracture, castle];
  for (const p of plates) group.add(p.mesh);
  const ground = floor();
  group.add(ground.mesh);

  return {
    group,
    update(t) {
      const asp = ctx.aspect(), island = t < T.impactA || t >= T.cut;
      const shown = t < T.impactA || t >= T.calm ? calm : t < T.sky ? fracture : castle;
      for (const p of plates) {
        p.mesh.visible = p === shown;
        p.U.uT.value = t;
        p.U.uLpAsp.value = asp;
      }
      calm.U.uLpSkDrain.value = drainAt(t);
      calm.U.uLpSkExit.value = island ? 1 : 0;
      fracture.U.uLpFxCrack.value = crackAt(t);
      castle.U.uLpCsRing.value = 0.4 * step12(t);
      ground.mesh.visible = t >= T.crack[0] && t < T.sky;
      ground.U.uLpFlReach.value = (CRACK_M / FLOOR_UNIT) * step12(crackAt(t));
    },
    dispose() {
      for (const p of [...plates, ground]) { p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
    },
  };
}
