// THE CAST, as ink silhouettes: four figures from Bleach, each with its one
// iconic shape (Aizen: swept-back hair, the one lock, the long coat; Ichigo:
// spiked hair, the huge cleaver; Gin: the bowl of hair, the narrow smile, the
// blade at his hip; Urahara: the striped bucket hat, the cane), and the
// colony pups that cheer at the throne's foot. Shape and pose only: no face
// is drawn. Frame: feet at the origin, the figure faces +z, about 2.2 m tall.

import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { flat } from "../p-caustic/parts";
import { limb, solid } from "./geo";

const UP = new Vector3(0, 1, 0);
const Q = new Quaternion();

const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => new SphereGeometry(r, 10, 7).scale(sx, sy, sz).translate(x, y, z);
const cone = (r, len, from, dir) => {
  const g = new ConeGeometry(r, len, 5).translate(0, len / 2, 0);
  g.applyQuaternion(Q.setFromUnitVectors(UP, new Vector3(...dir).normalize()));
  return g.translate(...from);
};

// the body every figure shares: legs, torso, two arms (given), a head
function frame({ legs = 0.95, torso = [0.9, 1.68], shoulder = 0.27, arms, head = [0, 1.86, 0], headR = 0.155, coat = null }) {
  const p = [];
  for (const s of [-1, 1]) p.push(limb([s * 0.12, 0, 0], [s * 0.13, legs, 0], 0.085, 0.075, 6));
  p.push(limb([0, torso[0], 0], [0, torso[1], 0], 0.18, 0.22, 7, 1.15, 0.75));
  p.push(limb([-shoulder, torso[1] - 0.05, 0], [shoulder, torso[1] - 0.05, 0], 0.07, 0.07, 5));
  for (const [from, to] of arms) p.push(limb(from, to, 0.065, 0.05, 5));
  p.push(limb([0, torso[1] - 0.04, 0], [0, head[1] - 0.12, 0], 0.07, 0.065, 5)); // the neck
  p.push(sph(headR, head[0], head[1], head[2], 0.92, 1.05, 1));
  if (coat) p.push(...coat);
  return p;
}

// AIZEN: swept-back hair with the one lock falling, a long coat to the ground, a hand at the hip, and Kyoka
// Suigetsu held low: the blade is two pieces so the tip can snap off.
export function aizen() {
  const p = frame({
    arms: [
      [[-0.27, 1.62, 0], [-0.34, 1.3, 0.1]], // the sword arm hangs
      [[0.27, 1.62, 0], [0.4, 1.15, 0.1]], // the other, easy at the hip
    ],
    coat: [
      new CylinderGeometry(0.24, 0.52, 1.62, 9).scale(1.1, 1, 0.78).translate(0, 0.82, 0), // the long coat
      new CylinderGeometry(0.2, 0.3, 0.5, 8).scale(1.2, 1, 0.8).translate(0, 1.55, 0), // the shoulders, broad
      new BoxGeometry(0.36, 1.45, 0.06).rotateZ(0.12).translate(-0.36, 0.78, 0.0), // the coat's open panel swings off the left
    ],
  });
  // hair: swept back and up from the brow, in long spikes (they point back, never a pair of ears)
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * 1.5;
    p.push(cone(0.06, 0.44, [Math.sin(a) * 0.13, 1.98, -0.02], [Math.sin(a) * 0.5, 0.28, -1]));
  }
  p.push(sph(0.15, 0, 1.94, -0.03, 0.95, 0.7, 0.9)); // the mass of the hair
  // the one lock: from the crown down in front of the brow, thin, curling
  p.push(limb([0.03, 2.03, 0.12], [0.05, 1.86, 0.17], 0.018, 0.01, 4));
  // the hilt and guard in the sword hand
  p.push(limb([-0.34, 1.32, 0.1], [-0.36, 1.12, 0.14], 0.032, 0.032, 5));
  p.push(new BoxGeometry(0.16, 0.025, 0.06).translate(-0.36, 1.1, 0.14));
  const bladeLow = limb([-0.37, 1.08, 0.15], [-0.45, 0.62, 0.25], 0.022, 0.018, 4, 1, 0.5);
  const bladeTip = limb([-0.45, 0.62, 0.25], [-0.5, 0.2, 0.34], 0.018, 0.004, 4, 1, 0.5);
  const s = solid(p);
  return { body: s.g, hull: s.hull, bladeLow: solid([bladeLow]), bladeTip: solid([bladeTip]), hand: [-0.45, 0.62, 0.25] };
}

// ICHIGO: spiked hair, a black shihakusho, and Zangetsu: a huge cleaver of a blade, the chain at its pommel,
// carried up on the shoulder.
export function ichigo() {
  const p = frame({
    arms: [
      [[-0.27, 1.62, 0], [-0.3, 1.25, 0.16]],
      [[0.27, 1.62, 0], [0.4, 1.4, 0.18]],
    ],
    coat: [new CylinderGeometry(0.22, 0.44, 0.95, 8).scale(1.1, 1, 0.8).translate(0, 0.62, 0), new BoxGeometry(0.2, 0.7, 0.06).rotateZ(0.5).translate(-0.4, 1.3, 0.04)],
  });
  // hair: a crown of spikes, up and out, the front ones swept forward over the brow
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI * 2;
    const up = 0.9 + 0.5 * ((i * 7) % 3 === 0 ? 1 : 0.3);
    p.push(cone(0.065, 0.36 + 0.14 * (i % 3), [Math.sin(a) * 0.1, 1.97, Math.cos(a) * 0.08 - 0.02], [Math.sin(a) * 0.85, up, Math.cos(a) * 0.5]));
  }
  p.push(sph(0.15, 0, 1.95, -0.01, 0.95, 0.65, 0.95));
  // the cleaver, over the right shoulder (screen right), its flat to the lens: a broad slab with a fat
  // back and a slanted tip, a wrapped grip, the chain
  const blade = new Shape();
  blade.moveTo(0, 0);
  blade.lineTo(0.34, 0);
  blade.lineTo(0.34, 1.62);
  blade.lineTo(0.06, 2.05);
  blade.lineTo(0, 1.95);
  blade.closePath();
  const slab = new ExtrudeGeometry(blade, { depth: 0.07, bevelEnabled: false }).translate(-0.17, 0, -0.035).rotateZ(-0.34).translate(0.52, 1.18, 0.2);
  p.push(slab);
  p.push(limb([0.42, 0.98, 0.2], [0.5, 1.22, 0.2], 0.04, 0.04, 5)); // the wrapped grip
  p.push(new TorusGeometry(0.07, 0.014, 4, 8).translate(0.38, 0.9, 0.2)); // the chain's ring
  p.push(limb([0.38, 0.84, 0.2], [0.3, 0.45, 0.2], 0.012, 0.012, 4)); // and its chain, hanging
  return solid(p);
}

// GIN: a lean figure, a bowl of straight hair, the narrow smile (a thin curve on the face, paper white, built
// separately), and a straight blade at his side.
export function gin() {
  const p = frame({
    legs: 1.0,
    torso: [0.95, 1.78],
    shoulder: 0.25,
    head: [0, 1.98, 0],
    headR: 0.14,
    arms: [
      [[-0.25, 1.72, 0], [-0.3, 1.32, 0.06]],
      [[0.25, 1.72, 0], [0.34, 1.34, 0.08]],
    ],
    coat: [new CylinderGeometry(0.2, 0.4, 1.0, 8).scale(1.05, 1, 0.78).translate(0, 0.66, 0)],
  });
  p.push(new SphereGeometry(0.168, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.62).translate(0, 2.0, -0.01)); // the bowl of hair
  p.push(new CylinderGeometry(0.17, 0.17, 0.05, 10).translate(0, 1.9, -0.0)); // its straight fringe
  // the blade at his hip: a thin sheathed katana slanting back and down
  p.push(limb([-0.28, 1.1, 0.06], [-0.36, 1.18, -0.2], 0.03, 0.03, 5)); // the hilt, forward
  p.push(limb([-0.28, 1.1, 0.06], [-0.46, 0.3, 0.55], 0.03, 0.02, 5)); // the sheath, slanting down and out
  const smile = new TorusGeometry(0.075, 0.01, 4, 12, Math.PI).rotateZ(Math.PI).translate(0, 1.95, 0.135);
  return { ...solid(p), smile };
}

// URAHARA: the striped bucket hat, a long haori, wooden geta, and the cane in his hand.
export function urahara() {
  const p = frame({
    arms: [
      [[-0.27, 1.62, 0], [-0.36, 1.2, 0.12]],
      [[0.27, 1.62, 0], [0.4, 1.0, 0.22]],
    ],
    head: [0, 1.84, 0],
    coat: [new CylinderGeometry(0.22, 0.5, 1.45, 9).scale(1.15, 1, 0.8).translate(0, 0.78, 0), new BoxGeometry(0.4, 1.2, 0.05).rotateZ(-0.1).translate(0.42, 0.9, 0.0), new BoxGeometry(0.36, 1.0, 0.05).rotateZ(0.1).translate(-0.42, 0.95, 0.0)],
  });
  // the bucket hat: a wide soft brim and a crown that tapers up
  p.push(new CylinderGeometry(0.4, 0.4, 0.035, 14).translate(0, 1.96, 0));
  p.push(new CylinderGeometry(0.17, 0.23, 0.26, 12).translate(0, 2.1, 0));
  // the cane: straight to the floor from his hand, with a crook
  p.push(limb([0.46, 0, 0.26], [0.46, 1.25, 0.26], 0.018, 0.018, 5));
  p.push(new TorusGeometry(0.075, 0.016, 4, 10, Math.PI * 1.1).rotateZ(-0.3).translate(0.52, 1.25, 0.26));
  // the hat's two stripes: thin paper bands standing proud of the crown
  const stripes = mergeGeometries([new CylinderGeometry(0.2, 0.2, 0.035, 12, 1, true).translate(0, 2.06, 0), new CylinderGeometry(0.185, 0.185, 0.035, 12, 1, true).translate(0, 2.16, 0)].map(flat));
  return { ...solid(p), stripes };
}

// A COLONY PUP, tiny and in ink: a round head (no ears), a plump body, a tail; arms are their own mesh so they can
// flick up on twos. About 1 m tall at scale 1.
export function colonyPup() {
  const body = mergeGeometries([new SphereGeometry(0.3, 9, 7).scale(1, 1.1, 0.95).translate(0, 0.3, 0), new SphereGeometry(0.27, 9, 7).translate(0, 0.72, 0.02), new SphereGeometry(0.1, 6, 5).translate(0, 0.08, -0.36)].map(flat));
  const arms = mergeGeometries([limb([-0.26, 0.4, 0.05], [-0.5, 0.78, 0.05], 0.065, 0.05, 5), limb([0.26, 0.4, 0.05], [0.5, 0.78, 0.05], 0.065, 0.05, 5)].map(flat));
  return { body, arms };
}
