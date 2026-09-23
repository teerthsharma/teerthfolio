/* global console */
// node components/world/seal/variants/D.check.mjs
// Builds the seal's geometry (D-parts.js) in node and holds it to the brief:
// belly pressed 2 cm into the snow, fore-flipper tips on the snow and splayed
// wide (the old pup's 1.64 m starfish span), lenses that bulge little enough
// that a far eye stays inside the head's silhouette, and the triangles the
// camera normally sees at or under 10k.

import assert from "node:assert/strict";
import { Box3, Euler, Matrix4, Vector3 } from "three";
import { buildSealD, FLIPPER_REST, PIVOT, skullPoint } from "./D-parts.js";

const d = buildSealD();
const move = (p) => new Matrix4().makeTranslation(p[0], p[1], p[2]);
const rotate = (x, y, z, order) => new Matrix4().makeRotationFromEuler(new Euler(x, y, z, order));
const box = (g, m) => new Box3().setFromBufferAttribute(g.clone().applyMatrix4(m).attributes.position);
const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;

const body = box(d.body, move(PIVOT.rear));
const flip = box(d.flipper, move(PIVOT.shoulder).multiply(rotate(0, FLIPPER_REST.back, -FLIPPER_REST.down, "YZX")));

// THE BUDDHA SEAL at sit=1 (D.jsx): the rear group pitches up onto the tail
// (rotation.x -0.6*sit, position.y +0.05*sit), the neck counter-pitches
// (+0.25*sit) and the head tips up a touch (+0.1*sit) so the face reads
// toward the camera instead of bowing the chin into the snow. d.body and
// d.head are already local to the rear and head groups respectively (see
// buildSealD), so their own world matrix is the chain below, no extra pivot
// offset needed.
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const rearSit = move([PIVOT.rear[0], PIVOT.rear[1] + 0.05, PIVOT.rear[2]]).multiply(rotate(-0.6, 0, 0, "XYZ"));
const neckSit = move(rel(PIVOT.neck, PIVOT.rear)).multiply(rotate(0.25, 0, 0, "XYZ"));
const headSit = move(rel(PIVOT.head, PIVOT.neck)).multiply(rotate(0.1, 0, 0, "YXZ"));
const bodySit = box(d.body, rearSit);
const headWorld = rearSit.clone().multiply(neckSit).multiply(headSit);
const headSitBox = box(d.head, headWorld);

// How far each lens stands proud of the skull, measured along the ray from
// the skull centre (the head frame's origin).
const lens = d.lenses.attributes.position;
const at = new Vector3();
const dir = new Vector3();
const skull = new Vector3();
let bulge = -1;
for (let i = 0; i < lens.count; i++) {
  at.fromBufferAttribute(lens, i).add(new Vector3(...d.eyePivot));
  skullPoint(dir.copy(at).normalize(), skull);
  bulge = Math.max(bulge, at.length() - skull.length());
}

const seen = { body: d.body, head: d.head, flipperL: d.flipper, flipperR: d.flipper, tail: d.tail, lenses: d.lenses, glints: d.glints };
const count = Object.fromEntries(Object.entries(seen).map(([k, g]) => [k, tris(g)]));
const total = Object.values(count).reduce((a, b) => a + b, 0);

const r = (x) => Math.round(x * 1000) / 1000;
console.log(JSON.stringify({
  belly: r(body.min.y), flipperTipY: r(flip.min.y), span: r(2 * flip.max.x), bulge: r(bulge), total, count,
  sitBodyMinY: r(bodySit.min.y), sitHeadMinY: r(headSitBox.min.y),
}));
assert.ok(Math.abs(body.min.y + 0.02) < 0.005, "belly pressed 2 cm into the snow");
assert.ok(flip.min.y > -0.04 && flip.min.y < 0.02, "flipper tips rest on the snow");
assert.ok(2 * flip.max.x >= 1.64, "flippers splay to the old pup's 1.64 m span");
assert.ok(bulge < 0.006, "lenses stand under 0.6 cm proud of the skull");
assert.ok(total <= 10000, "triangle budget");
assert.ok(bodySit.min.y > -0.08, "meditating, the body's lowest point stays near the snow, not bowed into it");
assert.ok(headSitBox.min.y > 0.3, "meditating, the pup sits up on its tail with its face toward the camera");
console.log("sealD: ok");
