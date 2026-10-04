// THE PUP IN THE PAPER DIMENSION: our real 3D pup, rounded and solid, standing among the paper the way Miles stands
// in other worlds. Its shading flattens to three card-value steps (a twin material per original) and it gets a cream
// cut-edge outline (an inverted hull) so it reads as a die-cut hero. It wears the Fourth's white haori: cut card,
// with a hem of pinned flame-tongue flaps that flap behind it. Round head, NO ears.

import { BackSide, Box3, Color, Group, Mesh, ShaderMaterial, Vector3 } from "three";
import { card, merge } from "./paper";

const TOON_V = /* glsl */ `
  varying vec3 vN;
  varying vec3 vCol;
  void main() {
    vCol = vec3(1.0);
    #ifdef USE_COLOR
      vCol = color.rgb;
    #endif
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const TOON_F = /* glsl */ `
  uniform vec3 uBase;
  uniform float uTint;
  varying vec3 vN;
  varying vec3 vCol;
  void main() {
    vec3 n = normalize(vN);
    float d = dot(n, normalize(vec3(-0.35, 0.55, 0.75))) * 0.5 + 0.5;
    float band = d < 0.4 ? 0.62 : (d < 0.66 ? 0.82 : 1.0);
    // the fox's ember from the right, in one hard step
    float e = step(0.62, dot(n, normalize(vec3(0.9, 0.2, -0.3))) * 0.5 + 0.5);
    vec3 c = uBase * vCol * uTint;
    // three card-value steps on the colour's own lightness: the hue stays, the gradient goes
    float l = dot(c, vec3(0.3, 0.59, 0.11));
    float v = l < 0.3 ? 0.26 : (l < 0.62 ? 0.5 : 0.82);
    c = mix(c * (v / max(l, 0.02)), vec3(v), 0.18) * band;
    c += vec3(1.0, 0.4, 0.12) * e * 0.28;
    gl_FragColor = vec4(c, 1.0);
  }`;
const HULL_V = /* glsl */ `
  uniform float uW;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW, 1.0);
  }`;
const HULL_F = /* glsl */ `
  void main() {
    gl_FragColor = vec4(0.93, 0.87, 0.74, 1.0);
  }`;

export function paperPup(root) {
  const twins = new Map();
  const list = [];
  const hullMat = new ShaderMaterial({ uniforms: { uW: { value: 0.05 } }, vertexShader: HULL_V, fragmentShader: HULL_F, side: BackSide });
  const hulls = [];
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return;
    const m = o.material;
    let tw = twins.get(m);
    if (!tw) {
      tw = new ShaderMaterial({
        uniforms: { uBase: { value: (m.color ?? new Color(1, 1, 1)).clone() }, uTint: { value: 1 } },
        vertexColors: Boolean(m.vertexColors),
        vertexShader: TOON_V,
        fragmentShader: TOON_F,
      });
      twins.set(m, tw);
    }
    list.push([o, m, tw]);
    o.geometry.computeBoundingSphere();
    if (o.geometry.boundingSphere.radius > 0.22 && o.geometry.attributes.normal) {
      const h = new Mesh(o.geometry, hullMat);
      h.visible = false;
      h.frustumCulled = false;
      o.add(h);
      hulls.push(h);
    }
  });
  let on = false;
  return {
    materials: [...twins.values(), hullMat],
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, tw] of list) o.material = v ? tw : m;
      for (const h of hulls) h.visible = v;
    },
    dispose() {
      this.set(false);
      for (const h of hulls) h.removeFromParent();
      for (const tw of twins.values()) tw.dispose();
      hullMat.dispose();
    },
  };
}

// THE FOURTH'S HAORI: a white cape over the back and down both flanks, a flame-tongue hem of pinned flaps at the rear.
// Built in the body frame from the body mesh's own bounds; `flaps` are pivot groups to swing each frame.
export function haori(parts, mat) {
  const body = parts.rear.children.find((o) => o.isMesh);
  body.geometry.computeBoundingBox();
  const bb = new Box3().copy(body.geometry.boundingBox).applyMatrix4(body.matrix);
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const top = c.y + (s.y / 2) * 1.02;
  const z0 = c.z + s.z * 0.34; // the collar, by the neck
  const z1 = c.z - s.z * 0.46; // the hem's pin line, toward the tail
  const wx = (s.x / 2) * 1.08;
  const g = new Group();
  const WHITE = "#f4efe3";
  const RED = "#e0452a";
  // over the back, lying flat in xz (card y -> world -z)
  const back = card([[-wx, -z0], [wx, -z0], [wx * 0.95, -z1], [-wx * 0.95, -z1]], { color: WHITE, depth: 0.03 }).rotateX(-Math.PI / 2).translate(0, top, 0);
  // down both flanks
  const drop = s.y * 0.62;
  const side = (sx) => card([[z0, 0], [z1, 0], [z1 + 0.05, -drop], [z0 - 0.08, -drop * 0.9]].map(([a, b]) => [-a, b]), { color: WHITE, depth: 0.03 }).rotateY(Math.PI / 2).translate(sx * (wx * 0.98), top - 0.02, 0);
  const collar = card([[-wx * 0.6, -z0], [wx * 0.6, -z0], [wx * 0.4, -z0 + 0.14], [-wx * 0.4, -z0 + 0.14]], { color: RED, depth: 0.035, z: 0.0 }).rotateX(-Math.PI / 2).translate(0, top + 0.02, 0);
  g.add(new Mesh(merge([back, side(-1), side(1), collar]), mat));
  // the flame-tongue hem: seven pinned flaps along the rear edge, red tongues over a white lining, each its own pivot
  const flaps = [];
  const flap = merge([
    card([[-0.11, 0], [0.11, 0], [0.04, 0.34], [0, 0.52], [-0.05, 0.3]], { color: RED, depth: 0.03 }).rotateX(-Math.PI / 2),
    card([[-0.07, 0], [0.07, 0], [0.02, 0.22]], { color: "#ffb04a", depth: 0.034 }).rotateX(-Math.PI / 2).translate(0, 0.004, 0),
  ]);
  for (let i = 0; i < 7; i++) {
    const p = new Group();
    p.position.set(-wx * 0.95 + (2 * wx * 0.95 * i) / 6, top, z1);
    const m = new Mesh(flap, mat);
    m.scale.set(1.2, 1, 1.5);
    p.add(m);
    g.add(p);
    flaps.push(p);
  }
  g.visible = false;
  const dispose = () => {
    g.removeFromParent();
    g.traverse((o) => o.isMesh && o.geometry !== flap && o.geometry.dispose());
    flap.dispose();
  };
  return { g, flaps, dispose };
}
