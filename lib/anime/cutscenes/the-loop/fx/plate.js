// The B1 impact plate (2.0 to 2.0833): one full-frame quad running the pack's impact tool, the seal's box as its silhouette.
// The tool's silhouette spans 3.1 R, so R is the box height over 3.1; the plate is opaque and overlays everything (no depth test).
import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { plateOn } from "../clock.js";

await loadPack("cuts");
const TOOLS = ["loopKit", "loopImpactPlate"];
const VS = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9995, 1.0); }";
const FS = `varying vec2 vUv;
${glslFor(TOOLS)}
void main() { gl_FragColor = vec4(pow(loopImpactPlate(vUv, 0.0), vec3(2.2)), 0.99); }`;

export function buildPlate(ctx) {
  const group = new Group(), uniforms = { ...uniformsFor(TOOLS), uLpImEyes: { value: 1 }, uLpImNeg: { value: 0 } };
  const mesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: FS, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: true, side: DoubleSide }));
  mesh.name = "the-loop-plate-quad"; mesh.frustumCulled = false; mesh.renderOrder = 1300; mesh.userData.plateDepth = false; mesh.visible = false;
  group.name = "the-loop-plate"; group.userData.plateDepth = false; group.add(mesh);
  const u = uniforms;

  const update = (t) => {
    mesh.visible = plateOn(t);
    if (!mesh.visible) return;
    const A = ctx.aspect(), box = ctx.player?.box, H = box ? box[3] - box[1] : 0.55;
    u.uLpAsp.value = A;
    u.uLpImCx.value = box ? ((box[0] + box[2]) / 2 - 0.5) * A : 0;
    u.uLpImCy.value = box ? 0.5 - (box[1] + box[3]) / 2 : 0;
    u.uLpImR.value = H / 3.1;
  };

  return { group, update, dispose() { mesh.geometry.dispose(); mesh.material.dispose(); } };
}
