// THE PUP AS GANDALF, in plasticine: a long grey felt cloak with a whipping hem (riding the pup's body
// group), a mint-crystal staff and a short sword that follow the two flippers' tips, no hat, round head,
// NO ears. And the pup's own materials swapped for plasticine twins (the shared thumbprint normal, a
// faint waxy sheen, glossy bead eyes) lit by the set's lamps and boiled at each step.

import { Box3, BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, Group, Mesh, Vector3 } from "three";
import { clay, hash, lump, merge, piece } from "./clay";
import { crystalGeometry } from "./fx";
import { blob, slab, taper } from "./shapes";


const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// the cloak, in the body group's frame: from behind the head, over the back and down the flanks, trailing past the tail
function cloakGeometry(bb) {
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const N = 16;
  const J = 16;
  const zF = bb.max.z - s.z * 0.1;
  const zB = bb.min.z - 1.0;
  const pos = [];
  const col = [];
  const sway = [];
  const idx = [];
  const felt = new Color("#8d9099");
  const lining = new Color("#5f636d");
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const z = zF + (zB - zF) * t;
    const taper_ = 1 - 0.45 * t ** 1.5;
    const train = sm(0.68, 1, t);
    const rx = (s.x / 2) * 1.2 * taper_ * (1 + 1.1 * train);
    const ry = (s.y / 2) * 1.22 * taper_ * (1 - 0.5 * train);
    const topY = c.y + ry * (0.15 - 0.55 * train);
    for (let j = 0; j <= J; j++) {
      const v = j / J;
      const a = (v - 0.5) * 2 * 1.9;
      const edge = Math.abs(2 * v - 1);
      const flare = sm(0.78, 1, edge);
      let x = rx * Math.sin(a) * (1 + 0.38 * flare);
      let y = topY + ry * (Math.cos(a) - 0.1) - flare * ry * 0.5 * (1 - train);
      y = Math.max(y, bb.min.y + 0.03 + train * 0.0);
      if (train > 0) y = Math.max(bb.min.y + 0.03, y - train * flare * ry * 0.9);
      pos.push(x, y, z);
      const k = 0.88 + 0.12 * hash(i * 31 + j, 3);
      const c2 = felt.clone().lerp(lining, flare * 0.6 + t * 0.2).multiplyScalar(k);
      col.push(c2.r, c2.g, c2.b);
      sway.push(Math.min(1, sm(0.45, 1, t) * 0.95 + flare * 0.55 * (0.3 + 0.7 * t)));
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < J; j++) {
      const a = i * (J + 1) + j;
      const b = a + 1;
      const c3 = a + J + 1;
      const d = c3 + 1;
      idx.push(a, c3, b, b, c3, d);
    }
  }
  return { pos, col, sway, idx };
}

// build the felt as a real BufferGeometry (indexed, smooth), carrying aSway
function feltGeometry(bb) {
  const { pos, col, sway, idx } = cloakGeometry(bb);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.setAttribute("aSway", new BufferAttribute(new Float32Array(sway), 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function staffGeometry() {
  const p = [
    piece(lump(new CylinderGeometry(0.034, 0.03, 2.1, 7, 10).translate(0, 0.05, 0), 0.006, 6), "#5a4030"),
    piece(new CylinderGeometry(0.05, 0.05, 0.05, 8).translate(0, -0.7, 0), "#8a6a48"),
    piece(new CylinderGeometry(0.05, 0.05, 0.05, 8).translate(0, 0.15, 0), "#8a6a48"),
  ];
  // the pup's flipper gripping the staff at its middle: a fist round the shaft, four finger lobes wrapped about it, a thumb over
  const FL = "#aab3c8";
  p.push(blob([0, 0, 0], [0.095, 0.085, 0.095], FL, { w: 10, h: 8, lump: 0.006 }));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.5;
    p.push(blob([Math.cos(a) * 0.075, 0.015 - k * 0.02, Math.sin(a) * 0.075], [0.04, 0.032, 0.04], FL, { w: 6, h: 5, lump: 0.003 }));
  }
  p.push(taper([0.06, -0.06, 0.04], [0.02, 0.07, 0.07], 0.03, 0.022, FL, { seg: 6, rows: 1 }));
  p.push(blob([0, -0.1, 0], [0.12, 0.05, 0.12], "#8d9099", { w: 8, h: 6, lump: 0.004 })); // the cloak's cuff
  // three claws cradling the crystal
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    p.push(taper([Math.cos(a) * 0.035, 1.0, Math.sin(a) * 0.035], [Math.cos(a) * 0.12, 1.34, Math.sin(a) * 0.12], 0.026, 0.01, "#6b4e36", { seg: 5, rows: 2 }));
  }
  return merge(p);
}
function swordGeometry() {
  return merge([
    slab([0, 0.04, 0], [0, 0.66, 0], 0.075, 0.02, "#cfd2dc"),
    piece(new BoxGeometry(0.24, 0.035, 0.05).translate(0, 0.04, 0), "#8a6a48"),
    piece(new CylinderGeometry(0.022, 0.022, 0.16, 6).translate(0, -0.06, 0), "#4a3226"),
    piece(new CylinderGeometry(0.035, 0.035, 0.03, 6).translate(0, -0.15, 0), "#8a6a48"),
  ]);
}

export function findParts(root) {
  let head = null;
  let n = -1;
  root.traverse((o) => {
    if (o.type === "Group" && o.children.length > n) {
      n = o.children.length;
      head = o;
    }
  });
  const rear = head?.parent?.parent ?? null;
  const groups = rear ? rear.children.filter((o) => o.type === "Group") : [];
  const mirror = groups.find((g) => g.scale.x < 0);
  return { root, head, rear, flipL: groups.find((g) => g !== mirror && g.children.some((c) => c.isMesh)), flipR: mirror?.children[0] ?? null };
}

// the gear: cloak on the body, staff and sword free in the rig frame (positioned each frame from the flipper tips)
export function buildGear(parts, crystalMat) {
  const body = parts.rear.children.find((o) => o.isMesh);
  body.geometry.computeBoundingBox();
  const bb = new Box3().copy(body.geometry.boundingBox).applyMatrix4(body.matrix);
  const cloakG = feltGeometry(bb);
  const cloakM = clay({ boil: 0.006, tex: 2.6, bump: 0.55, edge: 0.5, sway: true, wave: 0.1, side: DoubleSide, wax: 0.06 });
  const cloak = new Mesh(cloakG, cloakM);
  cloak.frustumCulled = false;
  cloak.visible = false;
  parts.rear.add(cloak);
  const woodM = clay({ boil: 0.006, tex: 3, bump: 0.5, edge: 0.6, wax: 0.1 });
  const staffG = staffGeometry();
  const staff = new Group();
  staff.add(new Mesh(staffG, woodM));
  const crystal = new Mesh(crystalGeometry(), crystalMat);
  crystal.position.y = 1.2;
  crystal.renderOrder = 7;
  staff.add(crystal);
  const swordG = swordGeometry();
  const sword = new Group();
  sword.add(new Mesh(swordG, woodM));
  for (const g of [staff, sword]) {
    g.visible = false;
    g.traverse((o) => {
      o.frustumCulled = false;
    });
  }
  return {
    cloak,
    staff,
    sword,
    crystal,
    dispose() {
      cloak.removeFromParent();
      cloakG.dispose();
      cloakM.dispose();
      woodM.dispose();
      staffG.dispose();
      swordG.dispose();
    },
  };
}

// plasticine twins for the pup's own materials (vertex-coloured ones: coat, eyes, mouth); the catchlights,
// the sign's digits and the contact shadow keep theirs
export function pupClay(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const m = o.material;
    if (m.isShaderMaterial || m.isMeshBasicMaterial || !m.vertexColors) return;
    let t = twins.get(m);
    if (!t) {
      const eye = (m.clearcoat ?? 0) > 0.9;
      t = clay({ vertexColors: true, boil: 0.007, tex: 2.4, bump: eye ? 0.02 : 0.32, edge: eye ? 0 : 0.42, wax: eye ? 3.4 : 0.4, rim: eye ? 0 : 0.35 });
      twins.set(m, t);
    }
    list.push([o, m, t]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, t] of list) o.material = v ? t : m;
    },
    dispose() {
      this.set(false);
      for (const t of twins.values()) t.dispose();
    },
  };
}
