// THE PUP TAKES ACCELERATOR'S LOOK, shape and colour only, on the real 3D pup:
// a white shaggy tuft of spiky hair that streams up and back from the crown
// like an aura (every spike on the midline, none at the sides: the head stays
// round, never an ear), red eyes (a red iris cap over each lens, a small black
// pupil), a black-and-grey patterned top wrapped round the body, and short
// coat tails that flap behind. Two groups: `hair` rides the head group, `top`
// the body group (pupParts in p-caustic/parts.js).

import { Box3, ConeGeometry, CylinderGeometry, DoubleSide, Group, Mesh, PlaneGeometry, Quaternion, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EYE_R, SKULL } from "../../../seal/variants/D-parts";
import { hash } from "./city";
import { hex3, toonMaterial } from "./shade";

const UP = new Vector3(0, 1, 0);
const Q = new Quaternion();
const flat = (g) => {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute("uv");
  n.computeVertexNormals(); // non-indexed: one normal a facet
  return n;
};

// head frame: the skull centre, +z the nose, +y up; skull radii ~ (0.52, 0.47, 0.5)
function hairGeometry() {
  const parts = [];
  // a close cap over the crown and the back of the skull, a little proud; the face stays bare
  parts.push(flat(new SphereGeometry(0.55, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(-0.85).translate(0, 0.03, -0.04)));
  const spike = (from, dir, len, r) => {
    const g = new ConeGeometry(r, len, 5).translate(0, len / 2, 0);
    g.applyQuaternion(Q.setFromUnitVectors(UP, dir.clone().normalize()));
    g.translate(...from);
    parts.push(flat(g));
  };
  // THE TUFT: three tiers of shaggy spikes from the crown, streaming up and back in a fan, the longest highest;
  // all within a hand's width of the midline, so nothing reads as an ear
  let i = 0;
  for (const [y, z, n, len, spread, r, lift] of [
    [0.4, -0.12, 5, 0.9, 0.2, 0.09, 1.0],
    [0.34, -0.28, 6, 1.25, 0.28, 0.1, 0.85],
    [0.22, -0.44, 5, 1.0, 0.26, 0.085, 0.5],
    [0.08, -0.5, 4, 0.8, 0.22, 0.075, 0.1],
  ]) {
    for (let k = 0; k < n; k++) {
      const u = n === 1 ? 0 : k / (n - 1) - 0.5;
      const j = hash(i++, 3);
      const dir = new Vector3(u * 1.1 + (j - 0.5) * 0.35, lift + 0.3 * j, -0.9 - 0.4 * j);
      spike([u * 2 * spread, y, z], dir, len * (0.8 + 0.4 * j), r * (0.85 + 0.3 * j));
    }
  }
  // two long wisps trailing back
  spike([0.04, 0.3, -0.4], new Vector3(0.1, 0.25, -1), 1.7, 0.06);
  spike([-0.05, 0.25, -0.45], new Vector3(-0.15, 0.1, -1), 1.5, 0.055);
  return mergeGeometries(parts);
}

// RED EYES: a crimson iris cap over each of the pup's own lenses, a small black pupil, two glints
function redEyes(head) {
  const eyes = head.children.find((o) => o.type === "Group" && o.children.length === 2 && o.children[0].isMesh);
  if (!eyes) return null;
  const lens = eyes.children[0].geometry.attributes.position;
  const geo = new SphereGeometry(EYE_R * 1.02, 28, 10, 0, Math.PI * 2, 0, 1.5).rotateX(Math.PI / 2);
  const mat = new ShaderMaterial({
    uniforms: { uR: { value: EYE_R } },
    vertexShader: "varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uR;
      varying vec3 vP;
      void main() {
        vec2 q = vP.xy / uR;
        float r = length(q);
        if (r > 1.0) discard;
        vec3 c = mix(vec3(1.0, 0.3, 0.26), vec3(0.62, 0.02, 0.08), smoothstep(0.15, 0.95, r));
        c = mix(c, vec3(0.04, 0.0, 0.03), 1.0 - smoothstep(0.2, 0.25, r));
        c = mix(c, vec3(0.3, 0.0, 0.05), smoothstep(0.9, 0.98, r));
        c = mix(c, vec3(1.0), 1.0 - smoothstep(0.24, 0.3, length(q - vec2(-0.36, 0.38))));
        c = mix(c, vec3(1.0), 1.0 - smoothstep(0.1, 0.15, length(q - vec2(0.4, -0.38))));
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
  const g = new Group();
  const n = new Vector3();
  const c = new Vector3();
  const v = new Vector3();
  for (const side of [1, -1]) {
    c.set(0, 0, 0);
    let k = 0;
    for (let i = 0; i < lens.count; i++) if (Math.sign(lens.getX(i)) === side) (c.x += lens.getX(i), c.y += lens.getY(i), c.z += lens.getZ(i), k++);
    c.multiplyScalar(1 / k);
    v.copy(c).add(eyes.position);
    n.set(v.x / SKULL[0] ** 2, v.y / SKULL[1] ** 2, v.z / SKULL[2] ** 2).normalize();
    let depth = 0;
    for (let i = 0; i < lens.count; i++) if (Math.sign(lens.getX(i)) === side) depth = Math.max(depth, v.set(lens.getX(i), lens.getY(i), lens.getZ(i)).sub(c).dot(n));
    const m = new Mesh(geo, mat);
    m.scale.set(1, 1, (depth * 1.12 + 0.002) / (EYE_R * 1.02));
    m.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), n);
    m.position.copy(c);
    g.add(m);
  }
  g.visible = false;
  eyes.add(g);
  return { g, dispose: () => (g.removeFromParent(), geo.dispose(), mat.dispose()) };
}

// THE TOP: black with grey zigzag stripes, wrapped round the body in rings (open under the belly), a pale hem
function topMaterial(U) {
  return new ShaderMaterial({
    uniforms: { uSun: U.uSun, uInk: U.uInk, uC: { value: new Vector3() }, uBlack: { value: hex3("#171a24") }, uGrey: { value: hex3("#9aa3b4") } },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vP;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vP = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun, uInk, uC, uBlack, uGrey;
      varying vec3 vP;
      varying vec3 vN;
      varying vec3 vW;
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(cameraPosition - vW);
        vec3 q = vP - uC;
        float ang = atan(q.y, q.x) / 6.2831853;
        float zig = abs(fract(ang * 14.0) - 0.5) * 2.0;
        float band = fract(q.z * 4.2 + zig * 0.9);
        float stripe = smoothstep(0.58, 0.62, band) * (1.0 - smoothstep(0.84, 0.88, band));
        vec3 base = mix(uBlack, uGrey, stripe);
        float ndl = dot(n, uSun);
        vec3 c = base * mix(vec3(0.62, 0.7, 0.95), vec3(1.0), smoothstep(0.0, 0.06, ndl));
        c = mix(c, base * 1.15 + vec3(0.03, 0.035, 0.05), smoothstep(0.5, 0.56, ndl));
        float rim = 1.0 - abs(dot(n, v));
        c += vec3(0.5, 0.7, 1.0) * smoothstep(0.6, 0.85, rim) * 0.2;
        c = mix(c, uInk * 0.5, smoothstep(0.9, 0.97, rim) * 0.5);
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}

// the coat tails: three tapered panels from the body's rear, a vertex flutter that grows along their length
function flapMaterial(U) {
  const m = toonMaterial(U, "#262c3a", { rim: 0.4 });
  m.uniforms.uTime = U.uTime;
  m.vertexShader = /* glsl */ `
    uniform float uTime;
    varying vec3 vN;
    varying vec3 vW;
    void main() {
      vec3 p = position;
      float k = uv.y * 1.3;
      p.y += sin(uTime * 11.0 + p.z * 7.0 + p.x * 4.0) * 0.1 * k;
      p.x += sin(uTime * 8.0 + p.z * 5.0) * 0.07 * k;
      vec4 w = modelMatrix * vec4(p, 1.0);
      vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  return m;
}

export function accelerator(parts, U) {
  const body = parts.rear.children.find((o) => o.isMesh);
  body.geometry.computeBoundingBox();
  const bb = new Box3().copy(body.geometry.boundingBox).applyMatrix4(body.matrix);
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  // body frame: z along the body (+z the head), rings from the shoulders back
  const rings = [];
  const rows = 6;
  for (let k = 0; k < rows; k++) {
    const z = c.z + s.z * (0.4 - k * 0.12);
    const taper = 1 - 0.07 * k;
    const g = new CylinderGeometry(1, 1, s.z * 0.135, 16, 1, true, -Math.PI * 0.75, Math.PI * 1.5).rotateX(-Math.PI / 2).scale((s.x / 2) * 1.14 * taper, (s.y / 2) * 1.14 * taper, 1);
    rings.push(g.translate(c.x, c.y + s.y * 0.04, z));
  }
  const topM = topMaterial(U);
  topM.uniforms.uC.value.set(c.x, c.y, c.z);
  const hemM = toonMaterial(U, "#e9eef7", { rim: 0.3 });
  const flapM = flapMaterial(U);
  const hairM = toonMaterial(U, "#fbfdff", { rim: 0.6 });
  const hair = new Group();
  hair.add(new Mesh(hairGeometry(), hairM));
  const top = new Group();
  top.add(new Mesh(mergeGeometries(rings), topM));
  // a pale collar at the shoulders and a hem at the last ring
  const collar = new CylinderGeometry(1, 1, 0.07, 16, 1, true, -Math.PI * 0.75, Math.PI * 1.5).rotateX(-Math.PI / 2).scale((s.x / 2) * 1.17, (s.y / 2) * 1.17, 1).translate(c.x, c.y + s.y * 0.04, c.z + s.z * 0.47);
  const hem = new CylinderGeometry(1, 1, 0.06, 16, 1, true, -Math.PI * 0.75, Math.PI * 1.5).rotateX(-Math.PI / 2).scale((s.x / 2) * 1.14 * 0.66, (s.y / 2) * 1.14 * 0.66, 1).translate(c.x, c.y + s.y * 0.04, c.z - s.z * 0.2);
  top.add(new Mesh(mergeGeometries([collar, hem]), hemM));
  // coat tails: panels hung from the rear ring, fanned
  const tails = [];
  for (const [x, a, len] of [[-0.2, 0.3, 1.1], [0, 0, 1.35], [0.2, -0.3, 1.1]]) {
    const g = new PlaneGeometry(0.34, len, 1, 7).rotateX(-Math.PI / 2).translate(0, 0, -len / 2 + 0.02).rotateY(a);
    // taper toward the tip
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - 0.6 * Math.min(1, -p.getZ(i) / len)));
    tails.push(g.translate(c.x + x * 0.8, c.y + s.y * 0.2, c.z - s.z * 0.2));
  }
  top.add(new Mesh(mergeGeometries(tails), flapM));
  for (const g of [hair, top]) {
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    g.visible = false;
  }
  const eyes = parts.head ? redEyes(parts.head) : null;
  return {
    hair,
    top,
    eyes: eyes?.g,
    dispose() {
      eyes?.dispose();
      for (const g of [hair, top]) {
        g.removeFromParent();
        g.traverse((o) => o.isMesh && o.geometry.dispose());
      }
      for (const m of [topM, hemM, flapM, hairM]) m.dispose();
    },
  };
}
