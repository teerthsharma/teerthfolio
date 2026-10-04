// THE PUP AS AINZ OOAL GOWN, in plasticine: a long black-and-purple cloak with a gold-trimmed hem and high collar
// (riding the pup's body group), a small gold staff ringed with seven coloured gems and a short gold blade that
// follow the two flippers' tips, gold rings of power on the grip, round head, NO ears. And the pup's own materials swapped for plasticine twins (the shared thumbprint normal, a
// faint waxy sheen, glossy bead eyes) lit by the set's lamps and boiled at each step.

import { Box3, BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, Group, Mesh, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { hash, lump, merge, piece } from "./clay";
import { disposeInked, inked, inkMat, toon } from "./comic";
import { blob, taper } from "./shapes";


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
  const felt = new Color("#1a1030");
  const lining = new Color("#5b2a9a");
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
      if (edge > 0.93 || t < 0.12) c2.set("#e6b43a").multiplyScalar(k); // the gold trim on the hem and the high collar
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
    piece(lump(new CylinderGeometry(0.034, 0.03, 2.1, 7, 10).translate(0, 0.05, 0), 0.006, 6), "#e6b43a"),
    piece(new CylinderGeometry(0.05, 0.05, 0.05, 8).translate(0, -0.7, 0), "#c9922a"),
    piece(new CylinderGeometry(0.05, 0.05, 0.05, 8).translate(0, 0.15, 0), "#c9922a"),
  ];
  // the pup's flipper gripping the staff at its middle: a fist round the shaft, four finger lobes wrapped about it, a thumb over
  const FL = "#aab3c8";
  p.push(blob([0, 0, 0], [0.095, 0.085, 0.095], FL, { w: 10, h: 8, lump: 0.006 }));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.5;
    p.push(blob([Math.cos(a) * 0.075, 0.015 - k * 0.02, Math.sin(a) * 0.075], [0.04, 0.032, 0.04], FL, { w: 6, h: 5, lump: 0.003 }));
  }
  p.push(taper([0.06, -0.06, 0.04], [0.02, 0.07, 0.07], 0.03, 0.022, FL, { seg: 6, rows: 1 }));
  p.push(blob([0, -0.1, 0], [0.12, 0.05, 0.12], "#e6b43a", { w: 8, h: 6, lump: 0.004 })); // the cloak's gold cuff
  // the rings of power on the grip, and the staff's head: a gold ring of seven serpents, each holding a coloured gem
  for (let k = 0; k < 3; k++) p.push(piece(new TorusGeometry(0.058, 0.011, 5, 10).rotateX(Math.PI / 2).translate(0, 0.06 - k * 0.05, 0), "#ffd35a"));
  p.push(piece(new TorusGeometry(0.2, 0.026, 6, 24).translate(0, 1.2, 0), "#e6b43a"));
  const GEMS = ["#ff3b3b", "#ff9a2e", "#ffe14a", "#3be06a", "#35c8ff", "#7a5cff", "#ff5ad2"];
  GEMS.forEach((c, k) => {
    const a = (k / 7) * Math.PI * 2;
    p.push(piece(new SphereGeometry(0.05, 8, 6).translate(Math.cos(a) * 0.2, 1.2 + Math.sin(a) * 0.2, 0), c));
  });
  return merge(p);
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

// the gear: cloak on the body, staff free in the rig frame (positioned each frame from the flipper tip); ink outlined, cel shaded
export function buildGear(parts) {
  const body = parts.rear.children.find((o) => o.isMesh);
  body.geometry.computeBoundingBox();
  const bb = new Box3().copy(body.geometry.boundingBox).applyMatrix4(body.matrix);
  const cloak = inked(feltGeometry(bb), { sway: true, side: true });
  cloak.visible = false;
  parts.rear.add(cloak);
  const staff = inked(staffGeometry());
  const sword = new Group();
  for (const g of [staff, sword]) g.visible = false;
  return {
    cloak,
    staff,
    sword,
    dispose() {
      cloak.removeFromParent();
      disposeInked(cloak);
      disposeInked(staff);
    },
  };
}

// toon twins (cel shading) and an ink hull for the pup's vertex-coloured meshes; the eyes and catchlights keep theirs
export function pupClay(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.userData.inkHull) return;
    const m = o.material;
    if (m.isShaderMaterial || m.isMeshBasicMaterial || !m.vertexColors || (m.clearcoat ?? 0) > 0.9) return;
    let t = twins.get(m);
    if (!t) twins.set(m, (t = toon()));
    const hull = new Mesh(o.geometry, inkMat());
    hull.userData.inkHull = true;
    hull.frustumCulled = false;
    hull.visible = false;
    o.add(hull);
    list.push([o, m, t, hull]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, t, h] of list) {
        o.material = v ? t : m;
        h.visible = v;
      }
    },
    dispose() {
      this.set(false);
      for (const [, , , h] of list) {
        h.removeFromParent();
        h.material.dispose();
      }
      for (const t of twins.values()) t.dispose();
    },
  };
}
