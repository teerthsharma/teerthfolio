// THE CAST, in shape and colour only. SINBAD on the real 3D pup (round head, NO ears): a long dark-violet ponytail
// from the crown trailing down its back, a gold circlet with a turquoise jewel, hoop earrings on the cheeks (never
// ears), gold ring vessels on the flippers, a sword hilt on the back, all glowing. BAAL, the djinn equip: electric-blue
// lightning armour with white-gold edges, glowing tattoos (cheeks, brow, flippers), a storm wreathing the pup.
// JA'FAR, the general: a tall white-robed figure with long wide sleeves, a silver ponytail, who panics.
// Parts ride the pup's own head and body groups (pupParts, p-caustic/parts.js), built from the body mesh's bounds.

import { AdditiveBlending, Box3, BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Euler, Group, LatheGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, Quaternion, ShaderMaterial, SphereGeometry, TorusGeometry, Vector2, Vector3 } from "three";
import { SKULL, skullPoint } from "../../../seal/variants/D-parts";
import { limb } from "../p-caustic/susanoo";
import { C, merge, part } from "./look";

const UP = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
const Q = new Quaternion();
const glowMat = (hex, o = {}) => new MeshBasicMaterial({ color: hex, toneMapped: false, fog: false, ...o });
const addGlow = (hex) => glowMat(hex, { transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false });

// a chain of tapered limbs along a curve: p(t) -> [x, y, z], r(t)
function chain(p, r, n, color, k = 0, seg = 7) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = p(i / n);
    const b = p((i + 1) / n);
    const g = limb(a, b, r(i / n), r((i + 1) / n), seg);
    out.push(part(g, typeof color === "function" ? color(i / n) : color, k));
    if (i < n - 1) out.push(part(new SphereGeometry(r((i + 1) / n) * 1.02, 7, 5), typeof color === "function" ? color((i + 1) / n) : color, k, [b[0], b[1], b[2]]));
  }
  return out;
}

// head frame: the skull centre, +z the nose, +y up. The hair sits ON TOP: a gold knot at the crown, a long purple
// ponytail from it back and down, a fringe of five cones over the brow. Nothing at the sides.
function ponytail() {
  const top = skullPoint(new Vector3(0, 1, 0), new Vector3());
  const p = (t) => [Math.sin(t * 5) * 0.05, top.y + 0.06 + 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.2)) - 1.3 * t * t, -0.05 - 2.0 * t];
  const parts = chain(p, (t) => 0.11 - 0.07 * t, 9, (t) => (t < 0.5 ? "#5b2a86" : "#9b5de5"), 0);
  parts.push(part(new CylinderGeometry(0.08, 0.08, 0.1, 10), C.gold, 2, [0, top.y + 0.02, -0.02]));
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.1;
    parts.push(part(new ConeGeometry(0.06, 0.24, 5).rotateX(Math.PI / 2 + 0.5), i % 2 ? "#9b5de5" : "#5b2a86", 0, [x, 0.36, 0.3 - Math.abs(i - 2) * 0.03]));
  }
  return merge(parts);
}

function circlet() {
  // the ring runs round the head, tipped a little so it sits low on the brow: scaled to the skull's width and depth
  const parts = [part(new TorusGeometry(SKULL[0] * 1.02, 0.03, 6, 28), C.gold, 2, [0, 0.2, 0, Math.PI / 2 + 0.18, 0, 0, 1.0, 0.96, 1])];
  parts.push(part(new OctahedronGeometry(0.05, 0), C.crimson, 0, [0, 0.14, 0.5]));
  for (const s of [-1, 1]) parts.push(part(new SphereGeometry(0.03, 6, 5), C.gold, 2, [s * 0.2, 0.17, 0.46]));
  return merge(parts);
}

// two gold hoops on the cheeks, a small teal drop on each
function earrings() {
  const parts = [];
  for (const s of [-1, 1]) {
    const d = new Vector3(s * 0.9, -0.55, 0.25).normalize();
    const at = skullPoint(d, new Vector3());
    parts.push(part(new TorusGeometry(0.06, 0.012, 6, 14), C.gold, 2, [at.x + s * 0.02, at.y - 0.06, at.z, 0, Math.PI / 2, 0]));
    parts.push(part(new SphereGeometry(0.04, 8, 6), "#7ff3e6", 5, [at.x + s * 0.02, at.y - 0.15, at.z]));
  }
  return merge(parts);
}

// tattoos: small zigzag bolt glyphs laid on the skull; shape and colour only
function glyph(scale = 1) {
  const pts = [[0, 0.1], [-0.035, 0.03], [0.03, 0.0], [-0.03, -0.1]].map(([x, y]) => [x * scale, y * scale]);
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new Vector3(pts[i][0], pts[i][1], 0);
    const b = new Vector3(pts[i + 1][0], pts[i + 1][1], 0);
    const g = new BoxGeometry(0.018 * scale + 0.006, a.distanceTo(b), 0.01);
    g.applyQuaternion(Q.clone().setFromUnitVectors(UP, b.clone().sub(a).normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
    out.push(g.index ? g.toNonIndexed() : g);
  }
  return out;
}
function tattooGeometry() {
  const all = [];
  const lay = (dir, roll, scale) => {
    const d = new Vector3(...dir).normalize();
    const p = skullPoint(d, new Vector3());
    const n = new Vector3(p.x / SKULL[0] ** 2, p.y / SKULL[1] ** 2, p.z / SKULL[2] ** 2).normalize();
    const q = Q.clone().setFromUnitVectors(Z, n);
    for (const g of glyph(scale)) {
      g.deleteAttribute("uv");
      g.rotateZ(roll).applyQuaternion(q).translate(p.x + n.x * 0.012, p.y + n.y * 0.012, p.z + n.z * 0.012);
      all.push(g);
    }
  };
  lay([0, 0.62, 0.78], 0, 1.3); // the brow, above the circlet's jewel
  for (const s of [-1, 1]) {
    lay([s * 0.78, -0.42, 0.52], s * 0.3, 1.2);
    lay([s * 0.64, -0.62, 0.5], s * 0.55, 0.9);
    lay([s * 0.5, 0.45, 0.72], s * -0.4, 0.8);
  }
  return merge(all);
}

// body frame: the box of the body mesh
function bodyBox(rear) {
  const body = rear.children.find((o) => o.isMesh);
  body.geometry.computeBoundingBox();
  return new Box3().copy(body.geometry.boundingBox).applyMatrix4(body.matrix);
}

// BAAL'S ARMOUR on the body: sleek electric-blue plates in arcs over the back and sides, shoulder guards, gold edges
function armourGeometry(bb) {
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const plates = [];
  const rows = 5;
  for (let k = 0; k < rows; k++) {
    const z = c.z + s.z * (0.36 - k * 0.15);
    const t = 1 - 0.05 * k;
    const rx = (s.x / 2) * 1.14 * t;
    const ry = (s.y / 2) * 1.14 * t;
    const arc = new CylinderGeometry(1, 1, s.z * 0.12, 14, 1, true, -Math.PI * 0.7, Math.PI * 1.4).rotateX(-Math.PI / 2).scale(rx, ry, 1);
    plates.push(part(arc, "#2e6bff", 14, [c.x, c.y + s.y * 0.04, z]));
    plates.push(part(new CylinderGeometry(1, 1, 0.025, 14, 1, true, -Math.PI * 0.7, Math.PI * 1.4).rotateX(-Math.PI / 2).scale(rx * 1.02, ry * 1.02, 1), C.gold, 2, [c.x, c.y + s.y * 0.04, z + s.z * 0.065]));
  }
  // a gold collar under the chin (never a guard above the shoulder: it would read as an ear)
  plates.push(part(new TorusGeometry(0.34, 0.04, 6, 18), C.gold, 2, [c.x, c.y + s.y * 0.22, c.z + s.z * 0.5, 0, 0.0, 0, 1, 1, 1]));
  // a gold crest of three bolts up the spine
  for (let k = 0; k < 3; k++) plates.push(part(new BoxGeometry(0.06, 0.04, s.z * 0.1).rotateZ(0.0), C.gold, 2, [c.x, c.y + s.y * 0.58 + 0.01, c.z + s.z * (0.3 - k * 0.25)]));
  return merge(plates);
}

// the sword hilt, standing out of the back: a wrapped grip, a crossguard, a glowing pommel and a gold scabbard strap
function hiltGeometry(bb) {
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const top = c.y + s.y * 0.5;
  const at = [c.x + s.x * 0.18, top - 0.02, c.z - s.z * 0.2];
  const tilt = [0.45, 0, 0.35];
  const parts = [
    part(new CylinderGeometry(0.035, 0.04, 0.46, 7), "#2b1a52", 0, [0, 0.23, 0, ...tilt]),
    part(new BoxGeometry(0.5, 0.05, 0.08), C.gold, 2, [0, 0.0, 0, ...tilt]),
    part(new SphereGeometry(0.075, 8, 6), "#7ff3e6", 5, [0, 0.5, 0, ...tilt]),
    part(new CylinderGeometry(0.05, 0.05, 0.05, 8), C.gold, 2, [0, 0.46, 0, ...tilt]),
  ];
  const g = merge(parts);
  g.translate(at[0], at[1], at[2]);
  return { g, at };
}

// the robe: an ivory cape from the shoulders to the ground, open 70 degrees at the front, a gold hem, a purple sash
function capeGeometry(bb) {
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const top = bb.max.y - 0.05;
  const bot = bb.min.y - 0.12;
  const sx = (s.x / 2) * 1.25;
  const sz = (s.z / 2) * 1.25;
  const open = (70 * Math.PI) / 180;
  const prof = [[0.7, top], [0.82, top - (top - bot) * 0.35], [1.0, top - (top - bot) * 0.7], [1.15, bot]].map(([r, y]) => new Vector2(r, y));
  const hem = [[1.15, bot], [1.17, bot], [1.17, bot + 0.07], [1.15, bot + 0.07]].map(([r, y]) => new Vector2(r, y));
  const lathe = (pr, hex, k) => part(new LatheGeometry(pr, 24, open / 2, Math.PI * 2 - open).scale(sx, 1, sz), hex, k, [c.x, 0, c.z]);
  return merge([lathe(prof, C.marble, 0), lathe(hem, C.gold, 2), part(new TorusGeometry(1, 0.05, 6, 24).scale(sx * 0.82, s.y * 0.58, 1), "#5b2a86", 0, [c.x, c.y, c.z - s.z * 0.1])]);
}

// the seven metal vessels, with the ones already on the pup: ring on each flipper (ringOn), earring hoops, sword pommel
// (hilt) and these: a necklace pendant, a bracelet (ringOn), a belt buckle. Gold is metal; the jewels glow.
function ornamentGeometry(bb) {
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const gold = [part(new SphereGeometry(0.07, 8, 6).scale(1, 1, 0.5), C.gold, 2, [c.x, c.y + s.y * 0.22 - 0.2, c.z + s.z * 0.5 + 0.12]), part(new BoxGeometry(0.13, 0.1, 0.05), C.gold, 2, [c.x, c.y + s.y * 0.5 + 0.02, c.z - s.z * 0.1])];
  const jewels = [part(new OctahedronGeometry(0.045, 0), "#2ad0c8", 5, [c.x, c.y + s.y * 0.22 - 0.2, c.z + s.z * 0.5 + 0.16]), part(new OctahedronGeometry(0.03, 0), "#2ad0c8", 5, [c.x, c.y + s.y * 0.5 + 0.05, c.z - s.z * 0.1])];
  return { gold: merge(gold), jewels: merge(jewels) };
}

// rings on the flippers: a gold band round the wrist, glowing
function ringOn(group, glow) {
  const mesh = group.children.find((o) => o.isMesh);
  if (!mesh) return null;
  mesh.geometry.computeBoundingBox();
  const bb = mesh.geometry.boundingBox;
  const size = bb.getSize(new Vector3());
  const ctr = bb.getCenter(new Vector3());
  const axis = size.x >= size.y && size.x >= size.z ? "x" : size.y >= size.z ? "y" : "z";
  const cross = ["x", "y", "z"].filter((a) => a !== axis).map((a) => size[a]);
  const dir = new Vector3(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, axis === "z" ? 1 : 0);
  const sign = Math.abs(bb.max[axis]) > Math.abs(bb.min[axis]) ? 1 : -1;
  const along = (f) => ctr.clone().addScaledVector(dir, sign * size[axis] * f);
  const at = along(0.12);
  const r = Math.max(...cross) * 0.5 * 1.15;
  const g = new Group();
  const band = new Mesh(new TorusGeometry(r, 0.035, 6, 20), glow.gold);
  const halo = new Mesh(new TorusGeometry(r, 0.045, 6, 20), glow.halo);
  const cuff = new Mesh(part(new TorusGeometry(r * 1.02, 0.07, 6, 20), "#2e6bff", 14), glow.mat);
  cuff.position.copy(along(-0.2)).sub(at);
  const bracelet = new Mesh(new TorusGeometry(r * 0.9, 0.02, 6, 20), glow.gold);
  bracelet.position.copy(along(0.3)).sub(at);
  for (const m of [band, halo, cuff, bracelet]) {
    m.quaternion.setFromUnitVectors(Z, dir);
    g.add(m);
  }
  g.position.copy(at);
  g.visible = false;
  group.add(g);
  // the tattoo bands: thin electric lines round the flipper, nearer the tip and nearer the shoulder
  const tat = new Group();
  for (const f of [0.34, -0.02, -0.34]) {
    const b = new Mesh(new TorusGeometry(r * 0.86, 0.014, 4, 18), glow.tat);
    b.quaternion.setFromUnitVectors(Z, dir);
    b.position.copy(along(f));
    tat.add(b);
  }
  tat.visible = false;
  group.add(tat);
  g.userData.tat = tat;
  return g;
}

// THE SINBAD COSTUME. `mat` is the cel material.
export function sinbad(parts, mat) {
  const hair = new Group();
  const pony = new Mesh(ponytail(), mat);
  const pivot = new Group();
  pivot.position.set(0, 0.44, -0.35);
  pony.position.set(0, -0.44, 0.35);
  pivot.add(pony);
  hair.add(pivot);
  const crown = new Mesh(circlet(), mat);
  const ears = new Mesh(earrings(), mat);
  hair.add(crown, ears);
  const gold = new MeshStandardMaterial({ color: "#e9b23a", metalness: 1, roughness: 0.25, emissive: "#a8741a", emissiveIntensity: 0.6 });
  const haloMat = addGlow("#7fd8ff");
  const rings = [];
  const tatMat = glowMat("#7fd8ff");
  // the two fore-flippers: a group off the body at the shoulder (the right one inside a mirrored group)
  for (const g of parts.rear.children) {
    if (g.type !== "Group") continue;
    const f = g.children.some((o) => o.isMesh) && Math.abs(g.position.x) > 0.2 ? g : g.children.find((o) => o.type === "Group" && Math.abs(o.position.x) > 0.2 && o.children.some((c) => c.isMesh));
    const r = f && ringOn(f, { gold, halo: haloMat, tat: tatMat, mat });
    if (r) rings.push(r);
  }
  const bb = bodyBox(parts.rear);
  const hilt = hiltGeometry(bb);
  const hiltMesh = new Mesh(hilt.g, mat);
  const hiltGlow = new Mesh(new SphereGeometry(0.1, 10, 8), addGlow("#7fd8ff"));
  hiltGlow.position.set(0, 0.5, 0).applyEuler(new Euler(0.45, 0, 0.35)).add(new Vector3(...hilt.at));
  const armour = new Group();
  const armourMesh = new Mesh(armourGeometry(bb), mat);
  const tats = new Mesh(tattooGeometry(), glowMat("#7fd8ff"));
  const capeMesh = new Mesh(capeGeometry(bb), mat);
  const orn = ornamentGeometry(bb);
  const ornGold = new Mesh(orn.gold, gold);
  const jewelMat = glowMat("#2ad0c8");
  const ornJewels = new Mesh(orn.jewels, jewelMat);
  armour.add(armourMesh, hiltMesh, hiltGlow, capeMesh, ornGold, ornJewels);
  hair.add(tats);
  for (const g of [hair, armour]) g.visible = false;
  armourMesh.visible = false;
  tats.visible = false;
  const flipperRings = rings;
  return {
    hair,
    armour,
    pivot,
    tats,
    armourMesh,
    hiltGlow,
    rings: flipperRings,
    halo: haloMat,
    gold,
    // t: scene time; costume 0..1 (Sinbad), equip 0..1 (Baal), crackle 0..1 (the tattoos' flare)
    tick(t, costume, equip, flare) {
      const on = costume > 0.01;
      hair.visible = on;
      armour.visible = on;
      pivot.rotation.set(0.06 * Math.sin(t * 1.6), 0.04 * Math.sin(t * 1.1), 0.03 * Math.sin(t * 1.9));
      hair.scale.setScalar(Math.max(costume * (1 + 0.15 * Math.sin(Math.PI * Math.min(1, costume))), 0.01));
      armour.scale.setScalar(Math.max(0.6 + 0.4 * costume, 0.01));
      for (const r of flipperRings) {
        r.visible = on;
        r.userData.tat.visible = equip > 0.05;
      }
      tatMat.color.setRGB(0.5 + 0.5 * equip, 0.85 + 0.15 * flare, 1);
      jewelMat.color.setRGB(0.16 + 0.34 * equip, 0.82 + 0.06 * equip, 0.78 + 0.22 * equip); // teal, then the djinn's blue-white
      haloMat.opacity = 0.35 + 0.35 * equip + 0.3 * flare;
      for (const r of flipperRings) r.scale.setScalar(1 + 0.12 * Math.sin(t * 6) * equip);
      hiltGlow.visible = on;
      hiltGlow.material.opacity = 0.4 + 0.5 * equip + 0.4 * flare;
      hiltGlow.scale.setScalar(0.8 + 0.5 * equip + 0.5 * flare);
      armourMesh.visible = equip > 0.02;
      tats.visible = equip > 0.05;
      tats.material.color.setRGB(0.5 + 0.5 * equip, 0.85 + 0.15 * flare, 1);
      tats.scale.setScalar(1);
    },
    attach() {
      parts.head.add(hair);
      parts.rear.add(armour);
    },
    dispose() {
      for (const g of [hair, armour]) {
        g.removeFromParent();
        g.traverse((o) => {
          if (o.isMesh) {
            o.geometry.dispose();
            if (o.material !== mat) o.material.dispose();
          }
        });
      }
      for (const r of rings) {
        r.userData.tat.removeFromParent();
        r.userData.tat.traverse((o) => o.isMesh && o.geometry.dispose());
        r.removeFromParent();
        r.traverse((o) => o.isMesh && o.geometry.dispose());
      }
      gold.dispose();
      jewelMat.dispose();
      haloMat.dispose();
      tatMat.dispose();
    },
  };
}

// THE STORM ROUND THE PUP: a spinning column of cloud and light, and the ground ring it stands in
export function stormColumn() {
  const mkMat = (speed, hue) =>
    new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uHue: { value: hue } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: /* glsl */ `
        uniform float uTime, uK, uHue;
        varying vec2 vUv;
        float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }
        void main() {
          float n = fbm(vec2(vUv.x * 9.0 + uTime * ${speed.toFixed(2)}, vUv.y * 3.0 - uTime * 2.2 + vUv.x * 3.0));
          float band = smoothstep(0.52, 0.74, n);
          float line = 1.0 - smoothstep(0.0, 0.05, abs(n - 0.6));
          float fade = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          vec3 col = mix(vec3(0.2, 0.5, 1.0), vec3(0.85, 0.96, 1.0), line + band * 0.35 * uHue);
          float a = (band * 0.38 + line * 0.9) * fade * uK;
          gl_FragColor = vec4(pow(col * a, vec3(2.2)), 1.0);
        }`,
    });
  const a = new Mesh(new CylinderGeometry(0.6, 0.42, 3.2, 28, 1, true), mkMat(2.2, 1));
  const b = new Mesh(new CylinderGeometry(0.75, 0.55, 3.6, 28, 1, true), mkMat(-1.3, 0.4));
  a.position.y = 1.5;
  b.position.y = 1.6;
  const ground = new Mesh(
    new LatheGeometry([new Vector2(0, 0), new Vector2(1.9, 0), new Vector2(2.0, 0.0)], 40),
    new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      vertexShader: "varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: /* glsl */ `
        uniform float uTime, uK;
        varying vec2 vP;
        void main() {
          float r = length(vP);
          float ang = atan(vP.y, vP.x);
          float ring = 1.0 - smoothstep(0.0, 0.05, abs(r - 1.7 - 0.06 * sin(uTime * 5.0)));
          float ring2 = 1.0 - smoothstep(0.0, 0.03, abs(r - 1.2 + 0.05 * sin(ang * 8.0 + uTime * 4.0)));
          float disc = (1.0 - smoothstep(0.0, 1.9, r)) * 0.35;
          vec3 col = vec3(0.35, 0.65, 1.0) * (ring + ring2 * 0.8 + disc) + vec3(0.8, 0.95, 1.0) * ring * 0.4;
          gl_FragColor = vec4(pow(col * uK, vec3(2.2)), 1.0);
        }`,
    }),
  );
  ground.position.y = 0.03;
  const g = new Group();
  g.add(a, b, ground);
  g.visible = false;
  return {
    g,
    tick(t, k) {
      g.visible = k > 0.01;
      for (const m of [a, b]) {
        m.material.uniforms.uTime.value = t;
        m.material.uniforms.uK.value = k;
      }
      ground.material.uniforms.uTime.value = t;
      ground.material.uniforms.uK.value = k;
      a.scale.set(1 + 0.05 * Math.sin(t * 5), 1, 1 + 0.05 * Math.sin(t * 5));
      b.rotation.y = -t * 0.8;
      a.rotation.y = t * 1.4;
    },
    dispose() {
      g.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
    },
  };
}

// JA'FAR: a tall white-robed general. Groups for the animation: the arms (shoulder pivots), the sleeves flapping
// off them, the head and the silver ponytail. Faces are two dots and a mouth; the panic is in the body.
export function jafar(mat) {
  const root = new Group();
  const body = [];
  const robe = new LatheGeometry([[0.54, 0], [0.5, 0.45], [0.4, 0.95], [0.3, 1.3], [0.24, 1.55], [0.1, 1.64]].map(([r, y]) => new Vector2(r, y)), 14);
  body.push(part(robe, "#f6f2ea", 0));
  body.push(part(new LatheGeometry([[0.42, 0.9], [0.33, 1.0], [0.3, 1.1], [0.38, 1.06]].map(([r, y]) => new Vector2(r, y)), 14), "#14757d", 0)); // the sash
  body.push(part(new BoxGeometry(0.18, 0.5, 0.05), "#14757d", 0, [0, 1.38, 0.27, 0.12, 0, 0]));
  body.push(part(new BoxGeometry(0.1, 0.05, 0.06), C.gold, 2, [0, 1.06, 0.34]));
  body.push(part(new SphereGeometry(0.31, 10, 8), "#f6f2ea", 0, [0, 1.5, 0, 0, 0, 0, 1.15, 0.5, 0.8])); // the shoulders
  const torso = new Mesh(merge(body), mat);
  root.add(torso);
  const head = new Group();
  head.position.set(0, 1.75, 0);
  const headParts = [
    part(new SphereGeometry(0.19, 12, 9), C.skin, 0),
    part(new SphereGeometry(0.205, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.46).rotateX(-0.3), "#e8edf7", 0, [0, 0.01, -0.01]), // the silver hair
    part(new TorusGeometry(0.2, 0.035, 6, 14), "#14757d", 0, [0, 0.08, 0, Math.PI / 2 - 0.25, 0, 0]), // a band
    part(new SphereGeometry(0.03, 6, 5), "#1d1630", 0, [-0.07, 0.02, 0.17]),
    part(new SphereGeometry(0.03, 6, 5), "#1d1630", 0, [0.07, 0.02, 0.17]),
    part(new SphereGeometry(0.045, 7, 5), "#3a1420", 0, [0, -0.08, 0.17, 0, 0, 0, 1.3, 1.0, 0.5]),
  ];
  head.add(new Mesh(merge(headParts), mat));
  const tail = new Group();
  tail.position.set(0, 0.1, -0.19);
  const tp = (t) => [0, -0.08 - 0.95 * t, -0.18 - 0.2 * Math.sin(t * 2.4)];
  tail.add(new Mesh(merge(chain(tp, (t) => 0.09 * (1 - t) + 0.02, 8, "#e8edf7", 0, 6)), mat));
  head.add(tail);
  root.add(head);
  // the sleeves: huge flared cones hanging off each arm, a gold cuff
  const arms = [];
  const sleeves = [];
  for (const s of [-1, 1]) {
    const arm = new Group();
    arm.position.set(s * 0.36, 1.5, 0);
    const sl = new Group();
    const cone = part(new CylinderGeometry(0.1, 0.34, 1.35, 10, 1, true).translate(0, -0.7, 0), "#f6f2ea", 0);
    const cuff = part(new CylinderGeometry(0.34, 0.35, 0.09, 10, 1, true), C.gold, 2, [0, -1.36, 0]);
    const lining = part(new CylinderGeometry(0.1, 0.3, 1.3, 10, 1, true).translate(0, -0.7, 0), "#14757d", 0, [0, 0, 0, 0, 0, 0, 0.9, 1, 0.9]);
    sl.add(new Mesh(merge([cone, cuff, lining]), mat));
    arm.add(sl);
    root.add(arm);
    arms.push(arm);
    sleeves.push(sl);
  }
  root.userData = { head, tail, arms, sleeves };
  return {
    root,
    // k: 0 stern .. 1 panic; cower: 0..1
    tick(t, panic, cower) {
      const w = Math.sin(t * 17);
      const w2 = Math.sin(t * 13 + 1);
      arms[0].rotation.set(0.25 * panic * w2, 0, -(0.3 + panic * (1.9 + 0.5 * w)) + cower * 1.4);
      arms[1].rotation.set(0.25 * panic * w, 0, 0.3 + panic * (1.9 + 0.5 * w2) - cower * 1.4);
      sleeves[0].rotation.set(0.5 * panic * w, 0, 0.3 * panic * w2);
      sleeves[1].rotation.set(0.5 * panic * w2, 0, -0.3 * panic * w);
      head.rotation.set(0.1 * cower, 0.4 * panic * Math.sin(t * 9), 0.15 * panic * Math.sin(t * 11));
      tail.rotation.set(0.5 * panic * Math.sin(t * 12), 0, 0.3 * panic * w);
      root.position.y = Math.max(0, Math.sin(t * 15)) * 0.22 * panic * (1 - cower);
      root.scale.y = 1 - 0.2 * cower;
    },
    dispose() {
      root.traverse((o) => o.isMesh && o.geometry.dispose());
    },
  };
}

// BAAL'S SIGIL: an 8-point star (two squares 45 degrees apart) in an outer circle with 16 ticks, a flat additive
// disc of radius r (m), gold toward the rim and cyan at the points. `tick(t, k)`: k 0..1 unfolds it, it turns 20 deg/s.
// Flat on the floor (`up`) or standing facing +z.
export function sigil(r, up = true) {
  const m = new ShaderMaterial({
    uniforms: { uK: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec2 vP;
      float sq(vec2 p, float a) { float c = cos(a), s = sin(a); vec2 q = abs(mat2(c, -s, s, c) * p); return 1.0 - smoothstep(0.0, 0.022, abs(max(q.x, q.y) - 0.6)); }
      void main() {
        vec2 p = vP / ${r.toFixed(3)};
        float rr = length(p);
        float ang = atan(p.y, p.x);
        float star = max(sq(p, 0.0), sq(p, 0.7853982));
        float ring = 1.0 - smoothstep(0.0, 0.02, abs(rr - 0.9));
        float ticks = step(0.8, cos(ang * 16.0)) * step(0.92, rr) * step(rr, 0.99);
        float disc = (1.0 - smoothstep(0.0, 0.9, rr)) * 0.12;
        vec3 col = mix(vec3(0.914, 0.698, 0.227), vec3(0.31, 0.89, 1.0), smoothstep(0.35, 0.9, rr)) * 2.5;
        float a = (star + ring + ticks + disc) * smoothstep(uK * 1.02, uK * 1.02 - 0.15, rr) * min(uK * 3.0, 1.0);
        gl_FragColor = vec4(pow(col * a, vec3(2.2)), 1.0);
      }`,
  });
  const mesh = new Mesh(new CircleGeometry(r, 64), m);
  const g = new Group();
  if (up) mesh.rotation.x = -Math.PI / 2;
  g.add(mesh);
  g.visible = false;
  return {
    g,
    tick(t, k) {
      g.visible = k > 0.01;
      m.uniforms.uK.value = k;
      g.rotation.y = up ? (t * 20 * Math.PI) / 180 : 0;
      mesh.rotation.z = up ? 0 : (t * 20 * Math.PI) / 180;
    },
    dispose() {
      mesh.geometry.dispose();
      m.dispose();
    },
  };
}
