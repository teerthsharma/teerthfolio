// THE MADARA PUP, shape and colour only, on the real 3D pup: a long wild
// mass of dark spiky hair from the back of the crown down its back (every
// spike points back or down: the head stays round, never an ear), dark-red
// lamellar armour plates over its back and sides with cream lacing, and the
// gunbai war fan slung across its back. Two groups: `hair` rides the head
// group, `armour` the body group (pupParts in parts.js); built from the body
// mesh's own bounds so it fits whatever the pup's proportions are.

import { Box3, BoxGeometry, Color, DoubleSide, ConeGeometry, CylinderGeometry, Group, Mesh, Quaternion, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paintedMaterial } from "./painted";
import { EYE_R, SKULL } from "../../../seal/variants/D-parts";
import { flat, hash } from "./parts";

const UP = new Vector3(0, 1, 0);
const Q = new Quaternion();
// painted like the rest of the war: sepia, with a little of the armour's red kept
const paint = (hex, keep) => paintedMaterial({ color: new Color(hex), keep, side: DoubleSide });
const lit = (g) => {
  g.computeVertexNormals(); // non-indexed: one normal a facet
  return g;
};

// head frame: the skull centre, +z the nose, +y up; skull radii ~ (0.52, 0.47, 0.5)
function hairGeometry() {
  const parts = [];
  // a cap over the crown and the back of the skull, a little proud of it; the face stays bare
  parts.push(flat(new SphereGeometry(0.555, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.62).rotateX(-0.95).translate(0, 0.02, -0.03)));
  const spike = (from, dir, len, r) => {
    const g = new ConeGeometry(r, len, 5).translate(0, len / 2, 0);
    g.applyQuaternion(Q.setFromUnitVectors(UP, dir.clone().normalize()));
    g.translate(...from);
    parts.push(flat(g));
  };
  // THE MANE: three layers of big spikes from the nape, flaring wide and sweeping DOWN past the shoulders and the
  // back, the long ones lowest and widest (a lion's mane of black spikes, Madara's); nothing points up
  let i = 0;
  for (const [y, n, len, spread, drop, r] of [
    [0.32, 4, 1.0, 0.3, 0.1, 0.1], // the crown, swept straight back and flat
    [0.12, 6, 1.9, 0.85, 0.35, 0.12], // the upper mane, flaring out wide behind the head
    [-0.1, 7, 2.5, 0.8, 0.9, 0.13], // the full mane, down the back
    [-0.3, 6, 2.9, 0.78, 1.5, 0.13], // the long locks to the ground
    [-0.5, 5, 2.4, 0.7, 2.0, 0.12], // the lowest, falling behind the flanks
  ]) {
    for (let k = 0; k < n; k++) {
      const u = n === 1 ? 0 : k / (n - 1) - 0.5;
      const x = u * 2 * spread;
      const z = -Math.sqrt(Math.max(0.02, 0.27 - x * x * 0.9 - y * y * 0.6)) - 0.02;
      const j = hash(i++, 3);
      const dir = new Vector3(x * 2.2 + (j - 0.5) * 0.5, -drop - 0.3 * j, -1);
      spike([x, y, z], dir, len * (0.8 + 0.4 * j), r * (0.85 + 0.3 * j));
    }
  }
  return mergeGeometries(parts);
}

// body frame: the box of the body mesh. The plates wrap the top and sides, rows along the body's length.
function armourGeometry(bb) {
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const plates = [];
  const lace = [];
  const rows = 6;
  for (let k = 0; k < rows; k++) {
    const z = c.z + s.z * (0.4 - k * 0.12);
    const taper = 1 - 0.07 * k;
    const rx = (s.x / 2) * 1.16 * taper;
    const ry = (s.y / 2) * 1.16 * taper;
    // an open arc over the top and down both sides, axis along the body
    const g = new CylinderGeometry(1, 1, s.z * 0.125, 12, 1, true, -Math.PI * 0.68, Math.PI * 1.36).rotateX(-Math.PI / 2).scale(rx, ry, 1);
    plates.push(flat(g.translate(c.x, c.y + s.y * 0.04, z)));
    lace.push(flat(new BoxGeometry(rx * 1.2, 0.03, 0.035).translate(c.x, c.y + ry + 0.012 + s.y * 0.04, z + s.z * 0.06)));
  }
  // the shoulder guards: a stack of plates over each shoulder, flared out
  for (const sd of [-1, 1]) {
    for (let k = 0; k < 3; k++) plates.push(flat(new BoxGeometry(0.34 - k * 0.04, 0.05, 0.3).rotateZ(sd * (0.5 + 0.12 * k)).translate(c.x + sd * (s.x / 2 + 0.05 + 0.05 * k), c.y + s.y * (0.28 - 0.1 * k), c.z + s.z * 0.36)));
  }
  // the gunbai: a big round war fan with a stout handle, strapped upright on the back and standing clear of it
  const top = c.y + (s.y / 2) * 1.1;
  const fy = top + 0.68;
  const fz = c.z - s.z * 0.12;
  const upright = (g) => g.rotateZ(Math.PI / 2).rotateX(0.18).rotateZ(0.28).translate(c.x, fy, fz); // the disc faces sideways, tipped
  const fan = upright(new CylinderGeometry(0.72, 0.72, 0.05, 28));
  const rim = upright(new CylinderGeometry(0.77, 0.77, 0.07, 28, 1, true));
  const ring = upright(new CylinderGeometry(0.42, 0.42, 0.058, 24, 1, true));
  const bar = upright(new BoxGeometry(0.07, 0.86, 0.08).translate(0, 0, 0));
  const handle = new CylinderGeometry(0.05, 0.055, 0.8, 6).rotateX(0.18).rotateZ(0.28).translate(c.x - 0.18, top - 0.1, fz);
  const sash = new BoxGeometry(s.x * 1.25, 0.05, 0.06).rotateZ(0.5).translate(c.x, c.y + s.y * 0.25, fz + 0.05);
  plates.push(flat(fan));
  lace.push(flat(ring), flat(bar), flat(handle), flat(sash));
  return { plates: mergeGeometries(plates), lace: mergeGeometries(lace), rim: flat(rim) };
}

// THE RINNEGAN: a pale lavender-violet iris with five black ripple rings round a small pupil, laid as a thin
// cap over each of the pup's own lenses (same size, same blink: the caps ride the lens group). Shape and colour only.
function rinnegan(head) {
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
        vec3 c = mix(vec3(0.80, 0.72, 0.98), vec3(0.50, 0.40, 0.80), smoothstep(0.1, 0.95, r));
        for (int k = 0; k < 5; k++) c = mix(c, vec3(0.03, 0.0, 0.06), 1.0 - smoothstep(0.012, 0.03, abs(r - (0.27 + 0.145 * float(k)))));
        c = mix(c, vec3(0.02, 0.0, 0.04), 1.0 - smoothstep(0.1, 0.13, r));
        c = mix(c, vec3(0.02, 0.0, 0.04), smoothstep(0.93, 0.98, r));
        c = mix(c, vec3(1.0), 1.0 - smoothstep(0.26, 0.32, length(q - vec2(-0.35, 0.37))));
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
    v.copy(c).add(eyes.position); // head frame
    n.set(v.x / SKULL[0] ** 2, v.y / SKULL[1] ** 2, v.z / SKULL[2] ** 2).normalize();
    let depth = 0; // how far the lens stands out along its normal
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

export function madara(parts) {
  const body = parts.rear.children.find((o) => o.isMesh);
  body.geometry.computeBoundingBox();
  const bb = new Box3().copy(body.geometry.boundingBox).applyMatrix4(body.matrix);
  const a = armourGeometry(bb);
  const mats = { hair: paint("#33293d", 0.15), plate: paint("#b3202e", 0.9), lace: paint("#e8dcc2", 0.3), rim: paint("#17120f", 0) };
  const hair = new Group();
  hair.add(new Mesh(lit(hairGeometry()), mats.hair));
  const armour = new Group();
  armour.add(new Mesh(lit(a.plates), mats.plate), new Mesh(lit(a.lace), mats.lace), new Mesh(lit(a.rim), mats.rim));
  for (const g of [hair, armour]) {
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = false;
    });
    g.visible = false;
  }
  const rinne = parts.head ? rinnegan(parts.head) : null;
  const dispose = () => {
    rinne?.dispose();
    for (const g of [hair, armour]) {
      g.removeFromParent();
      g.traverse((o) => o.isMesh && o.geometry.dispose());
    }
    for (const m of Object.values(mats)) m.dispose();
  };
  const tick = (t) => {
    for (const m of Object.values(mats)) m.uniforms.uTime.value = t;
  };
  return { hair, armour, eyes: rinne?.g, dispose, tick };
}
