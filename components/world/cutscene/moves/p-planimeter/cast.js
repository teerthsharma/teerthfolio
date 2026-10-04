// THE CAST, flat silhouettes cut from the same swatch (swiss.js): deep slate with one pale shade plane, no rim light,
// no glow, each with one iconic prop or hair. Feet at the origin, facing +z, human size. Homage is shape and colour.
// Also: the pup's crimson blazer (on the real 3D pup), the pup's soft three-value shading, and the colony pups.

import { BoxGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, Group, Matrix4, Mesh, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3, Box3, DoubleSide } from "three";
import { Mesher, SW } from "./swiss";

const S = SW;
const M = new Matrix4();

// legs, a torso, a head: the common body. h = height scale of the legs.
function body(m, { w = 0.4, legH = 0.86, torsoH = 0.62, headR = 0.13, sw = S.DEEP }) {
  for (const s of [-1, 1]) m.cyl(s * 0.11, 0, 0, 0.065, 0.085, legH, 7, sw);
  const ty = legH + torsoH / 2 - 0.03;
  m.add(new CapsuleGeometry(w / 2, torsoH - w * 0.9, 3, 8).scale(1, 1, 0.62), sw, M.makeTranslation(0, ty, 0));
  m.add(new SphereGeometry(headR, 10, 8), sw, M.makeTranslation(0, legH + torsoH + headR * 0.9, 0));
  m.cyl(0, legH + torsoH - 0.06, 0, 0.05, 0.06, 0.1, 6, sw); // the neck
  // the one pale shade plane: a slim slab down the torso's left flank
  m.add(new BoxGeometry(0.05, torsoH * 0.9, w * 0.36), S.SLATE, M.makeTranslation(w * 0.34, ty, 0.03));
  return { top: legH + torsoH + headR * 1.9 };
}
const arm = (m, x0, y0, z0, x1, y1, z1, r = 0.055, sw = S.DEEP) => {
  const v = new Vector3(x1 - x0, y1 - y0, z1 - z0);
  const len = v.length();
  const q = new Matrix4().lookAt(new Vector3(0, 0, 0), v.clone().normalize(), new Vector3(0, 1, 0));
  const g = new CylinderGeometry(r, r * 0.9, len, 6).rotateX(Math.PI / 2); // along +z
  m.add(g, sw, new Matrix4().copyPosition(M.makeTranslation((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)).multiply(q));
};

// HORIKITA: long straight black hair (the braid is its own mesh), arms folded. Upper body only (the legs follow the pose).
export function horikita() {
  const m = new Mesher();
  const ty = 0.8; // the hips
  m.add(new CapsuleGeometry(0.19, 0.3, 3, 8).scale(1, 1, 0.62), S.DEEP, M.makeTranslation(0, ty + 0.3, 0));
  m.add(new SphereGeometry(0.13, 10, 8), S.DEEP, M.makeTranslation(0, ty + 0.78, 0.01));
  m.add(new SphereGeometry(0.15, 10, 8), S.DEEP, M.makeTranslation(0, ty + 0.82, -0.02)); // the crown of hair
  m.add(new BoxGeometry(0.34, 0.78, 0.1), S.DEEP, M.makeTranslation(0, ty + 0.36, -0.15)); // the long straight fall
  m.add(new BoxGeometry(0.46, 0.09, 0.13), S.DEEP, M.makeTranslation(0, ty + 0.38, 0.14)); // the folded arms
  m.add(new BoxGeometry(0.05, 0.28, 0.07), S.SLATE, M.makeTranslation(0.19, ty + 0.3, 0.05));
  const braid = new Mesher().add(new CapsuleGeometry(0.03, 0.46, 2, 5), S.DEEP, M.makeTranslation(0, -0.26, 0)).build();
  return { geo: m.build(), braid };
}
export function seatedLegs() {
  const m = new Mesher();
  for (const s of [-1, 1]) {
    m.box(s * 0.11, 0.43, 0.2, 0.14, 0.14, 0.44, S.DEEP);
    m.cyl(s * 0.11, 0, 0.42, 0.06, 0.07, 0.43, 6, S.DEEP);
  }
  return m.build();
}
export function standingLegs() {
  const m = new Mesher();
  for (const s of [-1, 1]) m.cyl(s * 0.11, 0, 0, 0.065, 0.085, 0.84, 7, S.DEEP);
  return m.build();
}

// CHABASHIRA-SENSEI: tall, a long high ponytail (its own mesh), a fitted suit, a red pen
export function chabashira() {
  const m = new Mesher();
  const t = body(m, { w: 0.36, legH: 0.95, torsoH: 0.66, headR: 0.125 });
  m.add(new ConeGeometry(0.3, 0.5, 8).translate(0, -0.25, 0).scale(1, 1, 0.6), S.DEEP, M.makeTranslation(0, 0.95 + 0.04, 0)); // the fitted jacket skirt
  arm(m, -0.2, 1.42, 0, -0.38, 1.04, 0.1);
  m.add(new SphereGeometry(0.15, 8, 6), S.DEEP, M.makeTranslation(0, 0.95 + 0.66 + 0.2, -0.04)); // hair on the crown
  const pony = new Mesher().add(new CapsuleGeometry(0.075, 0.62, 3, 6), S.DEEP, M.makeTranslation(0, -0.34, 0)).add(new SphereGeometry(0.1, 8, 6), S.DEEP, M.makeTranslation(0, 0, 0)).build();
  const pen = new Mesher().add(new CylinderGeometry(0.014, 0.014, 0.34, 6).rotateX(Math.PI / 2), S.CRIMSON, M.makeTranslation(0, 0, 0.17)).build();
  const armDown = new Mesher(); arm(armDown, 0.2, 1.42, 0, 0.3, 1.0, 0.28);
  const armUp = new Mesher(); arm(armUp, 0.2, 1.42, 0, 0.36, 1.98, 0.12);
  return { geo: m.build(), pony, pen, armDown: armDown.build(), armUp: armUp.build(), top: t.top };
}

// SUDO: tall, cropped red hair, a basketball under one arm (the ball is its own mesh)
export function sudo() {
  const m = new Mesher();
  body(m, { w: 0.5, legH: 0.98, torsoH: 0.7, headR: 0.14 });
  m.add(new SphereGeometry(0.152, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), S.CRIMSON, M.makeTranslation(0, 0.98 + 0.7 + 0.14 * 0.9 + 0.01, -0.005)); // the cropped red hair
  arm(m, -0.3, 1.55, 0, -0.34, 1.1, 0.26, 0.07); // the ball arm
  arm(m, 0.3, 1.55, 0, 0.36, 0.9, 0.1, 0.07);
  m.add(new BoxGeometry(0.9, 0.12, 0.28), S.DEEP, M.makeTranslation(0, 1.64, -0.02)); // the shoulders
  return m.build();
}

// SAKAYANAGI: small, wavy pale hair under a beret, a cane across her knees; seated
export function sakayanagi() {
  const m = new Mesher();
  // seated on the chair at y 0.45: hips at the origin
  m.add(new CapsuleGeometry(0.15, 0.22, 3, 8).scale(1, 1, 0.64), S.DEEP, M.makeTranslation(0, 0.38, 0));
  m.add(new SphereGeometry(0.115, 10, 8), S.DEEP, M.makeTranslation(0, 0.78, 0.01));
  for (const [x, y, z, r] of [[0, 0.78, -0.07, 0.17], [-0.15, 0.62, -0.05, 0.1], [0.15, 0.62, -0.05, 0.1], [-0.12, 0.5, -0.07, 0.08], [0.12, 0.5, -0.07, 0.08]]) m.add(new SphereGeometry(r, 8, 6), S.CONCRETE, M.makeTranslation(x, y, z)); // wavy pale hair
  m.add(new CylinderGeometry(0.17, 0.17, 0.04, 14), S.DEEP, new Matrix4().makeRotationZ(0.2).setPosition(0.02, 0.93, 0.01)); // the beret
  m.add(new SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1), S.DEEP, new Matrix4().makeRotationZ(0.2).setPosition(0.02, 0.93, 0.01));
  m.box(0, 0.22, 0.22, 0.3, 0.12, 0.42, S.DEEP); // her lap
  for (const s of [-1, 1]) m.cyl(s * 0.09, 0.0, 0.4, 0.04, 0.05, 0.28, 6, S.DEEP);
  m.add(new CylinderGeometry(0.014, 0.014, 0.8, 6).rotateZ(Math.PI / 2), S.WARM, M.makeTranslation(0.0, 0.34, 0.4)); // the cane across her knees
  m.add(new BoxGeometry(0.05, 0.05, 0.08), S.SLATE, M.makeTranslation(0.0, 0.54, 0.0));
  return m.build();
}

// RYUUEN: swept-back hair, hands in pockets, a long coat (its tail is its own mesh)
export function ryuuen() {
  const m = new Mesher();
  body(m, { w: 0.44, legH: 0.92, torsoH: 0.66, headR: 0.13 });
  m.add(new SphereGeometry(0.145, 8, 6), S.DEEP, M.makeTranslation(0, 0.92 + 0.66 + 0.2, -0.04));
  for (let i = 0; i < 5; i++) m.add(new ConeGeometry(0.045, 0.28, 4), S.DEEP, new Matrix4().makeRotationX(1.3).setPosition((i - 2) * 0.06, 0.92 + 0.66 + 0.22, -0.2)); // swept-back
  arm(m, -0.24, 1.46, 0, -0.2, 0.98, 0.14, 0.065);
  arm(m, 0.24, 1.46, 0, 0.2, 0.98, 0.14, 0.065);
  const coat = new Mesher().add(new BoxGeometry(0.5, 0.78, 0.07), S.DEEP, M.makeTranslation(0, -0.39, 0)).add(new BoxGeometry(0.06, 0.7, 0.1), S.SLATE, M.makeTranslation(0.2, -0.38, 0.03)).build();
  return { geo: m.build(), coat };
}

// THE COLONY: tiny pups on the sea wall in crimson blazers (instanced): a body, a head, a blazer band
export function colonyPup() {
  const m = new Mesher();
  m.add(new SphereGeometry(1, 10, 7).scale(0.4, 0.3, 0.62), S.DEEP, M.makeTranslation(0, 0.3, -0.05));
  m.add(new SphereGeometry(0.3, 10, 8), S.DEEP, M.makeTranslation(0, 0.62, 0.34));
  m.add(new SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.6).scale(0.43, 0.3, 0.52), S.CRIMSON, M.makeTranslation(0, 0.3, -0.12)); // the blazer
  m.add(new TorusGeometry(0.27, 0.035, 5, 12).rotateX(Math.PI / 2 - 0.4), S.CONCRETE, M.makeTranslation(0, 0.5, 0.2)); // the collar
  return m.build();
}
export function colonyFlipper() {
  return new Mesher().add(new CapsuleGeometry(0.075, 0.3, 2, 6), S.DEEP, M.makeTranslation(0, -0.2, 0)).build();
}

// ------------------------------------------------------------------------------------------ the real pup in the blazer
// body frame of the pup's rear group (seal/variants/D.jsx): the box of the body mesh fits the jacket to its proportions
const raw = (h) => new Color().setRGB(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)); // sRGB numbers as written: these shaders output them directly
const paintFlat = (hex, side = DoubleSide) =>
  new ShaderMaterial({
    uniforms: { uBase: { value: raw(hex) }, uShade: { value: raw(hex).multiplyScalar(0.62) } },
    side,
    vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uBase, uShade; varying vec3 vN; void main(){ float d = dot(normalize(vN), normalize(vec3(-0.45, 0.8, 0.5))) * 0.5 + 0.5; vec3 c = mix(uShade, uBase, 0.35 + 0.65 * smoothstep(0.3, 0.7, d)); gl_FragColor = vec4(c, 1.0); }",
  });

export function blazer(parts) {
  const bodyMesh = parts.rear.children.find((o) => o.isMesh);
  bodyMesh.geometry.computeBoundingBox();
  const bb = new Box3().copy(bodyMesh.geometry.boundingBox).applyMatrix4(bodyMesh.matrix);
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const crim = paintFlat("#b3202e");
  const dark = paintFlat("#8c1822");
  const pale = paintFlat("#e6e0d0");
  const white = paintFlat("#f6f4ee");
  const g = new Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const mesh = new Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    g.add(mesh);
    return mesh;
  };
  // the jacket: a shell over the back and sides, open at the front for the white shirt
  const shell = new SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.8).scale((s.x / 2) * 1.12, (s.y / 2) * 1.14, (s.z / 2) * 1.04);
  add(shell, crim, c.x, c.y + s.y * 0.02, c.z);
  // the shirt: a pale chest panel standing proud of the front, in a V between two lapels
  add(new SphereGeometry(1, 14, 8).scale((s.x / 2) * 0.62, (s.y / 2) * 0.9, (s.z / 2) * 0.3), white, c.x, c.y + s.y * 0.0, c.z + s.z * 0.4);
  for (const sd of [-1, 1]) {
    add(new BoxGeometry(0.05, s.y * 0.95, 0.07).rotateZ(sd * 0.32).rotateX(-0.1), dark, c.x + sd * s.x * 0.2, c.y + s.y * 0.02, c.z + s.z * 0.45);
    // the pocket flap by each flipper, pale trim along its edge
    add(new BoxGeometry(0.2, 0.09, 0.1), dark, c.x + sd * (s.x / 2) * 1.04, c.y - s.y * 0.05, c.z + s.z * 0.18);
    add(new BoxGeometry(0.2, 0.025, 0.11), pale, c.x + sd * (s.x / 2) * 1.04, c.y - s.y * 0.05 - 0.05, c.z + s.z * 0.18);
  }
  // the pale hem round the jacket's lower edge
  add(new TorusGeometry(1, 0.025, 6, 28).scale((s.x / 2) * 0.98, (s.z / 2) * 0.95, 1).rotateX(Math.PI / 2), pale, c.x, bb.min.y + s.y * 0.2, c.z);
  // the white collar at the neck
  add(new TorusGeometry(0.2, 0.05, 6, 16).rotateX(Math.PI / 2 - 0.5), white, c.x, c.y + s.y * 0.42, c.z + s.z * 0.46);
  g.visible = false;
  return {
    g,
    dispose() {
      g.removeFromParent();
      g.traverse((o) => o.isMesh && o.geometry.dispose());
      for (const x of [crim, dark, pale, white]) x.dispose();
    },
  };
}

// THE PUP'S OWN SHADING for the dimension: its materials swapped for a twin that shades in exactly three soft values
// (the one thing on this campus that is not flat and not on the grid), cool key, no rim light.
export function pupSoft(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = new ShaderMaterial({
        uniforms: { uBase: { value: new Color().copy(m.color ?? new Color(1, 1, 1)).convertLinearToSRGB() } },
        vertexColors: Boolean(m.vertexColors),
        transparent: m.transparent,
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vCol;
          void main() {
            vCol = vec3(1.0);
            #ifdef USE_COLOR
              vCol = pow(color.rgb, vec3(1.0 / 2.2));
            #endif
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uBase; varying vec3 vN; varying vec3 vCol;
          void main() {
            float d = dot(normalize(vN), normalize(vec3(-0.3, 0.85, 0.45))) * 0.5 + 0.5;
            float band = 0.62 + 0.2 * smoothstep(0.34, 0.5, d) + 0.18 * smoothstep(0.62, 0.78, d); // three soft values
            vec3 c = uBase * vCol * band;
            c = mix(c, c * vec3(0.9, 0.96, 1.06), 0.5); // cool, never warm
            gl_FragColor = vec4(c, 1.0);
          }`,
      });
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
    },
  };
}
