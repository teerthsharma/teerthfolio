// AIR: the stuff between the layers that is not a surface. bgAir(ctx, look, list) returns overlays (layer 1, premultiplied, behind nearer set via plateDepth).
//   { kind: "shafts", at: [x,y,z], dir: [dx,dy,dz], len: 30, w: 5, n: 5, col: "#ffd890", k: 0.5 }   fan of banded light shafts leaving a source (a window, a gap in the cloud)
//   { kind: "mist", at: [x,y,z], size: [w, h], col: "#8a5a78", k: 0.5, seed }                          a ground-hugging fog bank: banded, soft at the edges
// Tier: declared 3 (live overlays, high tier only); the set underneath already carries the haze at every tier. Gate with `air.update()` from the world update.
import { Color, DoubleSide, Group, Matrix4, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { glslFor } from "../../tools/index.js";
import { PAINT } from "./glsl.js";

const VERT = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

function overlay(frag, uniforms) {
  const m = new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide, premultipliedAlpha: true,
    uniforms: { uTime: { value: 0 }, ...uniforms }, vertexShader: VERT,
    fragmentShader: `uniform float uTime; uniform vec3 uCol; uniform vec2 uP; varying vec2 vUv; ${glslFor(["noise"])} ${PAINT}
      void main() { ${frag} }`,
  });
  return m;
}

const SHAFT = `
  float across = abs(vUv.x - 0.5) * 2.0;
  float along = vUv.y;
  float streak = vn(vec2(vUv.x * 9.0 + uP.y, along * 1.2));
  float a = (1.0 - smoothstep(0.55, 1.0, across)) * pow(1.0 - along, 1.4) * smoothstep(0.0, 0.06, along);
  a *= 0.55 + 0.9 * streak;
  a = bgTone(a, 3.0, 0.2) * uP.x;
  gl_FragColor = vec4(uCol * a, a * 0.55);`;
const MIST = `
  vec2 q = vUv * vec2(3.0, 1.0) + vec2(uP.y, 0.0);
  float d = fbm(q * 2.0) * 0.7 + fbm(q * 5.0 + 3.0) * 0.3;
  float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x) * smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.5, 1.0, vUv.y));
  float a = bgTone(smoothstep(0.3, 0.8, d) * edge, 3.0, 0.2) * uP.x;
  gl_FragColor = vec4(uCol * a, a);`;

export function bgAir(ctx, look, list = []) {
  const group = new Group(), mats = [];
  group.userData.layer = 1; group.userData.plateDepth = true; group.userData.tier = 3;
  list.forEach((e, i) => {
    if (e.kind === "mist") {
      const m = overlay(MIST, { uCol: { value: new Color(e.col ?? "#8a5a78") }, uP: { value: { x: e.k ?? 0.5, y: e.seed ?? i } } });
      const mesh = new Mesh(new PlaneGeometry(e.size?.[0] ?? 40, e.size?.[1] ?? 4), m); mesh.position.set(...e.at); mesh.renderOrder = 5; group.add(mesh); mats.push(m);
      mesh.onBeforeRender = (_r, _s, cam) => { mesh.quaternion.copy(cam.quaternion); };
      return;
    }
    const dir = new Vector3(...(e.dir ?? [0, -0.5, 1])).normalize();
    for (let k = 0; k < (e.n ?? 5); k++) {
      const m = overlay(SHAFT, { uCol: { value: new Color(e.col ?? "#ffd890") }, uP: { value: { x: e.k ?? 0.5, y: i * 7 + k * 3 } } });
      const mesh = new Mesh(new PlaneGeometry((e.w ?? 5) * (0.6 + 0.2 * k), e.len ?? 30), m);
      mesh.geometry.translate(0, (e.len ?? 30) / 2, 0);
      const dk = dir.clone().applyAxisAngle(new Vector3(0, 1, 0), (k - ((e.n ?? 5) - 1) / 2) * 0.16);
      mesh.position.set(...e.at);
      const x = new Vector3(), z = new Vector3(), tmp = new Vector3(), basis = new Matrix4();
      mesh.onBeforeRender = (_r, _s, cam) => { z.copy(cam.position).sub(mesh.position); z.addScaledVector(dk, -z.dot(dk)).normalize(); x.crossVectors(dk, z).normalize(); basis.makeBasis(x, dk, tmp.crossVectors(x, dk)); mesh.quaternion.setFromRotationMatrix(basis); };
      mesh.renderOrder = 5; group.add(mesh); mats.push(m);
    }
  });
  return { group, update() { group.visible = ctx.atTier ? ctx.atTier(3) : true; }, dispose() { group.traverse((o) => { o.geometry?.dispose(); }); for (const m of mats) m.dispose(); } };
}
