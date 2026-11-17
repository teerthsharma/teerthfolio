// The aura column and its specks (G1): one full-frame quad at the cast's far depth, so it draws over the plate and behind the seal.
// It runs the pack's column and speck tools; each tool's colour is its own coverage (the zen ground is clear), the specks sit in front.
import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { T, auraAt } from "../clock.js";
import { ZEN } from "../palette.js";

await loadPack("cuts");
const TOOLS = ["loopAuraColumn", "loopSpeckColumn"];
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const VS = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9995, 1.0); }";
const FS = `uniform vec3 uZen; uniform float uLpT; uniform float uSpk; varying vec2 vUv;
${glslFor(TOOLS)}
void main() {
  vec3 a = loopAuraColumn(vUv, uLpT), s = loopSpeckColumn(vUv, uLpT);
  float ca = clamp(length(a - uZen) * 24.0, 0.0, 1.0), cs = uSpk * clamp(length(s - uZen) * 24.0, 0.0, 1.0);
  float al = max(ca, cs);
  if (al < 0.002) discard;
  gl_FragColor = vec4(mix(a, s, cs / max(al, 1e-4)) * al, al);
}`;

export function buildColumn(ctx) {
  const group = new Group(), uniforms = { ...uniformsFor(TOOLS), uZen: { value: new Vector3(...rgb(ZEN)) }, uLpT: { value: 0 }, uSpk: { value: 1 } };
  const mesh = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: true, premultipliedAlpha: true, side: DoubleSide }));
  mesh.name = "the-loop-aura-specks"; mesh.frustumCulled = false; mesh.renderOrder = 1190; mesh.userData.plateDepth = false; mesh.visible = false;
  group.name = "the-loop-column"; group.add(mesh);
  const u = uniforms;

  const update = (t) => {
    const A = ctx.aspect(), box = ctx.player?.box, k = auraAt(t);
    const cx = box ? ((box[0] + box[2]) / 2 - 0.5) * A : 0, base = box ? 0.5 - box[3] : -0.2;
    mesh.visible = k > 0.01;
    u.uSpk.value = ctx.atTier(2) ? 1 : 0;
    u.uLpAsp.value = A; u.uLpT.value = t;
    u.uLpAuCx.value = cx; u.uLpAuBase.value = base; u.uLpAuW0.value = 0.18; u.uLpAuW1.value = 0.07;
    u.uLpAuTop.value = 0.9 * Math.min(1, k); u.uLpAuSpike.value = 0.4 * Math.exp(-((t - T.impactB) ** 2) / 0.04);
    u.uLpSpCx.value = cx; u.uLpSpBase.value = base; u.uLpSpR.value = 0.09; u.uLpSpTop.value = 0.9 * Math.min(1, k); u.uLpSpRise.value = 58.8;
  };

  return { group, update, dispose() { mesh.geometry.dispose(); mesh.material.dispose(); } };
}
