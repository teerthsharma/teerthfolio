// The sun through the west windows: a second set of hard gold shafts, the window cross on the floor and the pup's desk
// (ptvWindowLight, retinted gold), and cream dust in the shafts (the ptvKit disc profile). Additive, never a scene bloom.
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Group, InstancedMesh, Mesh, Object3D, PlaneGeometry, ShaderMaterial } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { WIN_Z } from "../live/room.js";
import { FLOOR } from "../live/layout.js";
import { concat } from "./paint.js";

await loadPack("prettytv");

const DIR = [8.4, -1.55];
const DUST = 60;
const O = new Object3D();
const hash = (i, k) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const ADD = { transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, premultipliedAlpha: true };
const VERT = "attribute vec2 aUv; varying vec2 vUv; void main() { vUv = aUv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }";

const shaftMaterial = () =>
  new ShaderMaterial({
    ...ADD,
    uniforms: { uAmp: { value: 1 } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float uAmp; varying vec2 vUv;
      void main() {
        float a = pow(1.0 - vUv.x, 1.2) * smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        a = floor(a * 3.0 + 0.5) / 3.0;
        vec3 c = vec3(1.0, 0.84, 0.5) * a * 0.14 * uAmp;
        gl_FragColor = vec4(pow(c, vec3(1.6)), 0.0);
      }`,
  });

const patchMaterial = () =>
  new ShaderMaterial({
    ...ADD,
    uniforms: { uAmp: { value: 1 }, uPtvSeed: { value: 0 }, uPtvWinSkew: { value: 0.6 }, uPtvWinCool: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: glslFor(["ptvWindowLight"]) + /* glsl */ `
      uniform float uAmp; varying vec2 vUv;
      void main() {
        vec3 w = ptvWindowLight(vec2(vUv.x * 1.87, vUv.y), 0.0);
        float k = smoothstep(0.52, 0.74, dot(w, vec3(0.3333)));
        vec2 mull = step(0.02, abs(vUv - 0.5));
        k *= mull.x * mull.y;
        vec3 c = vec3(1.0, 0.78, 0.4) * 0.30 * k * uAmp;
        gl_FragColor = vec4(pow(c, vec3(1.6)), 0.0);
      }`,
  });

const dustMaterial = () =>
  new ShaderMaterial({
    ...ADD,
    uniforms: { uAmp: { value: 1 }, uPtvSeed: { value: 0 }, uPtvBokehDensity: { value: 0.18 }, uPtvBokehSize: { value: 0.5 } },
    vertexShader: VERT,
    fragmentShader: glslFor(["ptvBokehMotes"]) + /* glsl */ `
      uniform float uAmp; varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) - 0.42;
        float m = ptvFill(d) * 0.13 + ptvLine(d, 1.6) * 0.28;
        vec3 c = vec3(1.0, 0.945, 0.784) * m * 2.5 * uAmp;
        gl_FragColor = vec4(pow(c, vec3(1.6)), 0.0);
      }`,
  });

function quadGeometry(quads) {
  const pos = [];
  const uv = [];
  const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (const q of quads) for (const v of [0, 1, 2, 0, 2, 3]) {
    pos.push(...q[v]);
    uv.push(...UV[v]);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aUv", new BufferAttribute(new Float32Array(uv), 2));
  return g;
}

export function buildLight(ctx, shared) {
  const group = new Group();
  const amps = [];
  const shaftMat = shaftMaterial();
  const patchMat = patchMaterial();
  const dustMat = dustMaterial();
  amps.push(shaftMat, patchMat, dustMat);

  const quads = [];
  for (const z of WIN_Z) for (const dz of [-1.4, 1.4]) {
    const zz = z + dz;
    const T0 = [-6.1, 4.3, zz];
    const B0 = [-6.1, 0.6, zz];
    quads.push([T0, B0, [B0[0] + DIR[0], B0[1] + DIR[1], zz + 0.5], [T0[0] + DIR[0], T0[1] + DIR[1], zz + 0.5]]);
  }
  const shafts = new Mesh(quadGeometry(quads), shaftMat);
  shafts.frustumCulled = false;
  shafts.renderOrder = 11;
  shafts.userData.plateDepth = true;
  group.add(shafts);

  const plane = (w, d, x, y, z) => {
    const g = new PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate(x, y, z);
    return g;
  };
  const slant = Math.atan2(DIR[1], DIR[0]), pieces = [];
  for (const z of WIN_Z.slice(0, 3)) {
    for (const x of [-1.7, 1.7]) {
      const g = plane(3.4, 1.8, x, 0, 0);
      g.rotateY(slant);
      g.translate(2.75, FLOOR + 0.012, z + 0.45);
      pieces.push(g);
    }
  }
  pieces.push(plane(2.5, 1.5, 0, 0.15, 1.55));
  const patches = new Mesh(concat(pieces), patchMat);
  patches.frustumCulled = false;
  patches.renderOrder = 9;
  group.add(patches);

  const dust = new InstancedMesh(new PlaneGeometry(0.1, 0.1), dustMat, DUST);
  dust.frustumCulled = false;
  dust.renderOrder = 12;
  const base = [];
  for (let i = 0; i < DUST; i++) {
    base.push({
      x: -5.6 + 9.6 * hash(i, 1),
      y: 0.9 + 3.4 * hash(i, 2),
      z: -3.6 + 11.8 * hash(i, 3),
      s: 0.4 + 0.6 * hash(i, 4),
    });
  }
  group.add(dust);

  const step = (S, bellK = 0) => {
    const tt = Math.floor(S * 12) / 12;
    for (const m of amps) m.uniforms.uAmp.value = 1 + 0.7 * bellK;
    base.forEach((d, i) => {
      const y = 0.9 + ((d.y - 0.9 + tt * 0.04) % 3.4);
      O.position.set(d.x, y, d.z);
      O.scale.setScalar(d.s);
      O.updateMatrix();
      dust.setMatrixAt(i, O.matrix);
    });
    dust.instanceMatrix.needsUpdate = true;
  };
  const dispose = () => {
    group.traverse((o) => o.geometry?.dispose());
    for (const m of amps) m.dispose();
  };
  return { group, step, dispose };
}
