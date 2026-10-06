// THE PLINTH ARC (bible 3.7) and the carved names (3.6): canvas atlases on instanced plinths, plus the rising PR-number sparks.
// Text is CARVED on stone (L10: no plaque, no floating text). Black ink on white in the canvas; the shader reads 1 - r as ink.
import { CanvasTexture, InstancedBufferAttribute, InstancedMesh, LinearFilter, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, SRGBColorSpace, Vector3 } from "three";
import { DEAD_PRS, NAMES } from "./data.js";
import { U } from "./palette.js";
import { hullMaterial, plinth, stoneMaterial } from "./horrors.js";

function atlas(rows, w, h, draw) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w; c.height = h * rows;
  const g = c.getContext("2d");
  for (let i = 0; i < rows; i++) { g.fillStyle = "#ffffff"; g.fillRect(0, i * h, w, h); g.fillStyle = "#000000"; g.textAlign = "center"; draw(g, i, i * h); }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace; t.minFilter = LinearFilter; t.generateMipmaps = false;
  return t;
}
// 31 PR rows, 512 x 128: "repo #n" bold 44 px over the title 26 px (Georgia serif, as the bible says)
export const prAtlas = () => atlas(DEAD_PRS.length, 512, 128, (g, i, y) => {
  const [repo, n, title] = DEAD_PRS[i];
  g.font = "bold 44px Georgia, serif"; g.fillText(`${repo} #${n}`, 256, y + 54, 488);
  g.font = "26px Georgia, serif"; g.fillText(title, 256, y + 100, 488);
});
// carved names, 1024 x 256 rows (aspect 4:1, same as a plinth face): one bold serif line
export const nameAtlas = () => atlas(NAMES.length, 1024, 256, (g, i, y) => { g.font = "bold 92px Georgia, serif"; g.fillText(NAMES[i], 512, y + 156, 960); });
// "#268" glyph rows for the sparks, 256 x 128
export const digitAtlas = () => atlas(DEAD_PRS.length, 256, 128, (g, i, y) => { g.font = "bold 84px Georgia, serif"; g.fillText(`#${DEAD_PRS[i][1]}`, 128, y + 90, 240); });

const Y = new Vector3(0, 1, 0);
// one instance matrix: translate p, align +y to `up`, then spin by yaw about it, scale s
export const orient = (up, yaw) => new Quaternion().setFromUnitVectors(Y, up).multiply(new Quaternion().setFromAxisAngle(Y, yaw));
export function instMatrix(p, up, yaw, s) {
  return new Matrix4().compose(p, orient(up, yaw), new Vector3(s, s, s));
}

// items: [{ p: Vector3 (frame-local), up: Vector3, yaw, s, row }]
function plinthMesh(S, items, map, rows, group) {
  if (!items.length) return null;
  const geo = plinth();
  const mat = stoneMaterial(S, { id: 0.65, map, rows });
  const mesh = new InstancedMesh(geo, mat, items.length);
  geo.setAttribute("aRow", new InstancedBufferAttribute(new Float32Array(items.map((i) => i.row)), 1));
  items.forEach((it, k) => mesh.setMatrixAt(k, instMatrix(it.p, it.up, it.yaw, it.s)));
  mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false;
  const hull = new InstancedMesh(geo, hullMaterial(S, 0.65), items.length);
  hull.instanceMatrix = mesh.instanceMatrix; hull.frustumCulled = false; hull.renderOrder = -1;
  group.add(mesh, hull);
  return { mesh, hull, geo };
}

// PR plinths + name plinths; returns the pieces to dispose
export function buildPlinths(S, group, prItems, nameItems) {
  const a = prAtlas(), b = nameAtlas();
  const pr = plinthMesh(S, prItems, a, DEAD_PRS.length, group);
  const nm = plinthMesh(S, nameItems, b, NAMES.length, group);
  return { dispose() { for (const o of [pr, nm]) if (o) { o.geo.dispose(); o.mesh.material.dispose(); o.hull.material.dispose(); } a?.dispose(); b?.dispose(); } };
}

// ---------------------------------------------------------------------------------------------------------------------
// SPARKS (bible 3.7, shot 9): the PR numbers rise off each plinth as 0.12 m glyph sparks at 0.4 m/s, gold, on twos.
//   life = fract(t / 2.4 + phase);  rise = 0.4 m/s * 2.4 s * life;  size = 0.12 m tall x 0.24 wide * uAmp * smoothstep(0, 0.12, life) * smoothstep(1, 0.8, life)
// billboard: corners offset along the camera's right/up (rows of viewMatrix). Gold #ffb524 x 1.6 (blooms), glyph = atlas ink.
const SP_VERT = /* glsl */ `
  attribute vec3 aBase; attribute vec3 aUp; attribute float aRow; attribute float aPhase;
  uniform float uSpT, uAmp;
  varying vec2 vUv; varying float vRow;
  void main() {
    float life = fract(uSpT / 2.4 + aPhase);
    vec3 p = aBase + aUp * (0.4 * 2.4 * life);
    vec4 w = modelMatrix * vec4(p, 1.0);
    vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float s = uAmp * smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.8, life);
    w.xyz += (R * position.x * 0.24 + U * position.y * 0.12) * s;
    vUv = position.xy + 0.5; vRow = aRow;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const SP_FRAG = /* glsl */ `
  uniform sampler2D uMap; uniform float uRows, uId; uniform vec3 cGold;
  varying vec2 vUv; varying float vRow;
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - (vRow + 1.0 - vUv.y) / uRows);
    if (1.0 - texture2D(uMap, uv).r < 0.5) discard;
    gl_FragColor = vec4(cGold * 1.6, uId);
  }`;

// items: [{ base: Vector3 (frame-local, plinth top), up: Vector3, row }]; 3 sparks per plinth with offset phases
export function buildSparks(S, group, items) {
  if (!items.length) return null;
  const map = digitAtlas();
  const n = items.length * 3;
  const geo = new PlaneGeometry(1, 1);
  const base = new Float32Array(n * 3), up = new Float32Array(n * 3), row = new Float32Array(n), ph = new Float32Array(n);
  items.forEach((it, i) => {
    for (let k = 0; k < 3; k++) {
      const j = i * 3 + k;
      const o = (k - 1) * 0.42; // spread across the plinth face (local x ~ world along the arc; small, so a fixed spread is fine)
      base.set([it.base.x + it.side.x * o, it.base.y + it.side.y * o, it.base.z + it.side.z * o], j * 3);
      up.set([it.up.x, it.up.y, it.up.z], j * 3);
      row[j] = it.row; ph[j] = (k / 3 + ((i * 0.6180339) % 1)) % 1;
    }
  });
  geo.setAttribute("aBase", new InstancedBufferAttribute(base, 3));
  geo.setAttribute("aUp", new InstancedBufferAttribute(up, 3));
  geo.setAttribute("aRow", new InstancedBufferAttribute(row, 1));
  geo.setAttribute("aPhase", new InstancedBufferAttribute(ph, 1));
  const mat = new ShaderMaterial({
    uniforms: { uSpT: S.uSpT, uAmp: S.uSpAmp, uMap: { value: map }, uRows: { value: DEAD_PRS.length }, uId: { value: 0.8 }, cGold: U("gold") },
    vertexShader: SP_VERT, fragmentShader: SP_FRAG, side: 2,
  });
  const mesh = new InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  group.add(mesh);
  return { mesh, dispose() { geo.dispose(); mat.dispose(); map?.dispose(); } };
}
