// THE PERFECT SUSANOO: a giant armoured spirit in shape and colour only (no
// face): a crested helmet with a long horn, layered pauldrons, a plated
// chest, an armoured skirt sunk into the field, a raised arm with a long
// blade, an open hand, and two tengu wings of long plates behind. One merged
// low-poly mesh (aFlap weights the wings, the blade and the skirt's tails for
// the vertex flutter), drawn twice: a dark translucent body and an additive
// fresnel rim with a slow spirit-flame flowing up through it.
// Its own space: the field at y 0, facing +z, about 13 m from the buried
// knees to the crest (ten pups and more).

import { AdditiveBlending, BoxGeometry, BufferAttribute, ConeGeometry, CylinderGeometry, FrontSide, IcosahedronGeometry, Quaternion, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PAINT } from "./painted";
import { flat } from "./parts";

const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();
export function limb(a, b, r1, r2, seg = 6) {
  A.fromArray(a);
  B.fromArray(b);
  const g = new CylinderGeometry(r2, r1, A.distanceTo(B), seg, 1);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => new BoxGeometry(w, h, d).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z);

export function susanooGeometry() {
  const parts = [];
  const add = (g, flap = 0) => {
    const f = flat(g);
    f.setAttribute("aFlap", new BufferAttribute(new Float32Array(f.attributes.position.count).fill(flap), 1));
    parts.push(f);
  };
  // the body: an armoured skirt from below the field, a waist, a broad plated chest
  add(new CylinderGeometry(2.4, 3.3, 3.2, 8).scale(1, 1, 0.72).translate(0, -0.6, 0));
  for (let i = 0; i < 6; i++) {
    const a = -1.2 + (i * 2.4) / 5;
    add(box(1.3, 2.4, 0.18, Math.sin(a) * 3.0, -0.3, Math.cos(a) * 2.3 - 0.1, -0.25, a, 0), 0.25); // the tassets, hanging
  }
  add(new CylinderGeometry(2.0, 1.7, 1.2, 8).scale(1, 1, 0.75).translate(0, 1.4, 0));
  add(new CylinderGeometry(3.0, 2.1, 3.0, 8).scale(1, 1, 0.68).translate(0, 3.4, 0));
  for (let k = 0; k < 3; k++) add(box(3.6 - k * 0.5, 0.5, 0.3, 0, 2.6 + k * 0.75, 1.95 - k * 0.06, 0.12, 0, 0)); // chest plates
  // the pauldrons: a dome over three layered plates each side
  for (const s of [-1, 1]) {
    add(new SphereGeometry(1.55, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.15, 0.8, 1).rotateZ(-s * 0.35).translate(s * 3.15, 4.55, 0));
    for (let k = 0; k < 3; k++) add(box(2.3 - k * 0.2, 0.55, 2.1, s * (3.55 + k * 0.2), 3.95 - k * 0.55, 0, 0, 0, -s * (0.45 + k * 0.08)), 0.15);
  }
  // the neck guard and the helmet: a domed shell, a deep brow, a long horn forward and two crests back
  add(new CylinderGeometry(1.05, 1.3, 0.8, 8).translate(0, 5.25, 0));
  add(new IcosahedronGeometry(1.15, 1).scale(1, 1.08, 1.05).translate(0, 6.25, 0));
  add(box(2.5, 0.35, 1.3, 0, 6.35, 0.55, 0.2, 0, 0)); // the brow ridge
  add(limb([0, 6.4, 1.05], [0, 7.1, 2.9], 0.28, 0.04, 5)); // the long horn, out over the field
  for (const s of [-1, 1]) {
    add(limb([s * 0.55, 6.9, -0.2], [s * 1.5, 8.6, -1.4], 0.26, 0.03, 5)); // the crests sweep up and back
    add(box(0.9, 1.3, 0.25, s * 1.05, 5.75, 0.55, 0, s * 0.5, 0)); // the cheek guards
  }
  // the arms: the right one (the -x side) raised with the blade, the left one out, palm open
  add(limb([-3.4, 3.9, 0], [-4.7, 2.4, 1.3], 0.85, 0.7));
  add(limb([-4.7, 2.4, 1.3], [-4.0, 5.0, 2.4], 0.7, 0.55));
  add(new IcosahedronGeometry(0.65, 0).translate(-4.0, 5.2, 2.5));
  add(box(0.8, 1.3, 0.8, -4.7, 2.4, 1.3, 0.4, 0, 0.3)); // the elbow plate
  add(limb([3.4, 3.9, 0], [4.9, 2.0, 1.6], 0.85, 0.7));
  add(limb([4.9, 2.0, 1.6], [5.4, 2.9, 3.9], 0.7, 0.55));
  add(new BoxGeometry(1.0, 0.25, 1.1).rotateX(-0.3).translate(5.45, 3.0, 4.3)); // the open hand
  for (let f = 0; f < 4; f++) add(box(0.16, 0.12, 0.6, 5.1 + f * 0.22, 3.2, 4.95, -0.5, 0, 0));
  // THE SWORD: a long broad blade held up in the raised fist and rising out across the sky, with a guard and a hilt
  const fist = new Vector3(-4.0, 5.0, 2.5);
  const tip = new Vector3(-9.5, 17.5, 1.4);
  const dir = tip.clone().sub(fist);
  const len = dir.length();
  dir.normalize();
  const qb = new Quaternion().setFromUnitVectors(UP, dir);
  const at = (g, k) => g.applyQuaternion(qb).translate(fist.x + dir.x * k, fist.y + dir.y * k, fist.z + dir.z * k);
  add(at(new CylinderGeometry(0.06, 0.55, len - 1.4, 4, 1).scale(1, 1, 0.3).rotateY(Math.PI / 4).translate(0, (len - 1.4) / 2 + 0.9, 0), 0), -1); // the blade, diamond in section, tapering to the tip
  add(at(box(2.2, 0.28, 0.6, 0, 0.75, 0), 0), 0.02); // the guard
  add(at(new CylinderGeometry(0.16, 0.18, 1.6, 6).translate(0, -0.3, 0), 0), 0.02); // the hilt in the fist
  // the wings: two fans of long plates behind the shoulders, the outer plates flutter most
  for (const s of [-1, 1]) {
    for (let k = 0; k < 6; k++) {
      const a = 0.15 + k * 0.22;
      const len = 5.5 + k * 0.6;
      const g = new BoxGeometry(0.85, len, 0.12).translate(0, len / 2, 0).rotateZ(-s * a).rotateY(s * 0.35).translate(s * 2.1, 4.0, -1.8 - k * 0.12);
      add(g, 0.5 + k * 0.1);
    }
  }
  return mergeGeometries(parts);
}

const VERT = /* glsl */ `
  attribute float aFlap;
  uniform float uTime;
  uniform float uShake;
  varying vec3 vW;
  varying vec3 vL;
  varying float vBlade;
  void main() {
    float flapW = max(aFlap, 0.0);
    vBlade = aFlap < 0.0 ? 1.0 : 0.0;
    vec3 p = position;
    // the spirit's flutter: wings and tails ripple, everything breathes
    p.x += sin(uTime * 3.1 + p.y * 0.45) * flapW * 0.35;
    p.z += cos(uTime * 2.3 + p.y * 0.35 + p.x * 0.2) * flapW * 0.45;
    p *= 1.0 + 0.008 * sin(uTime * 2.0);
    p.x += uShake * 0.25 * sin(uTime * 90.0);
    vL = p;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

// The two passes: `rim` the additive fresnel and spirit-fire, `body` the dark violet translucent mass.
export function susanooMaterials() {
  const shared = { uTime: { value: 0 }, uFlare: { value: 0 }, uCell: { value: 6 }, uShake: { value: 0 }, uFade: { value: 0 } };
  const body = new ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float uFade;
      varying vec3 vW;
      void main() {
        gl_FragColor = vec4(pow(vec3(0.07, 0.12, 0.34), vec3(2.2)), 0.45 * uFade);
      }`,
  });
  const rim = new ShaderMaterial({
    uniforms: shared,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: FrontSide,
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFlare, uFade;
      varying vec3 vW;
      varying vec3 vL;
      varying float vBlade;
      ${PAINT}
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        vec3 v = normalize(cameraPosition - vW);
        if (dot(n, v) < 0.0) n = -n;
        float f = pow(clamp(1.0 - dot(n, v), 0.0, 1.0), 1.6);
        // spirit-fire licking upward through the armour
        float fire = vn(vec2(vL.x * 0.9 + vL.z * 0.4, vL.y * 0.6 - uTime * 1.6)) * vn(vec2(vL.x * 2.1, vL.y * 1.3 - uTime * 2.4));
        // blue fire: the one cold colour in the war (with the moon's red)
        vec3 deep = vec3(0.18, 0.48, 1.0);
        vec3 hot = vec3(0.35, 0.75, 1.0);
        vec3 c = mix(deep, hot, fire) * 1.6 * (f * 1.3 + fire * 0.55 + 0.07);
        c += vec3(0.8, 0.92, 1.0) * pow(f, 4.0) * 0.8; // the hot edge
        c *= (0.85 + 0.3 * brush()) * (1.0 + uFlare * 1.2);
        c += max(grain(uTime), 0.0) * 0.05;
        // the sword burns white-blue all along its length, the one bright thing in the war
        c = mix(c, vec3(0.55, 0.8, 1.0) * (1.1 + 0.4 * fire) + vec3(1.0) * pow(f, 2.0) * 0.6, vBlade);
        // the rise: the spirit grows out of the ground, edge first
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)) * uFade, 1.0);
      }`,
  });
  return { body, rim, shared };
}
