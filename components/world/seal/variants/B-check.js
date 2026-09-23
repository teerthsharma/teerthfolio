// node components/world/seal/variants/B-check.js
// Builds seal B's geometry in node and checks the proportions the brief
// fixes: belly on the snow, flipper tips on the snow and past the flanks,
// nose and tail inside the length budget, triangle budget.

import assert from "node:assert/strict";
import { Box3, Euler, Matrix4 } from "three";
import { buildSealB, FLIPPER_REST, PIVOT } from "./B-parts.js";

const b = buildSealB();
const box = (g, m) => new Box3().setFromBufferAttribute(g.clone().applyMatrix4(m).attributes.position);
const move = (p) => new Matrix4().makeTranslation(p[0], p[1], p[2]);

const chest = box(b.chest, move(PIVOT.chest));
const hips = box(b.hips, move(PIVOT.hips));
const head = box(b.head, move(PIVOT.head));
const tail = box(b.tail, move(PIVOT.tail));
const flip = box(b.flipper, move(PIVOT.shoulder).multiply(new Matrix4().makeRotationFromEuler(new Euler(0, FLIPPER_REST.back, -FLIPPER_REST.down, "YZX"))));
const tris = ["chest", "hips", "tail", "flipper", "flipper", "head", "eyes", "catchlights", "lidUp", "lidUp", "lidLow", "lidLow", "mouth"]
  .reduce((sum, k) => sum + (b[k].index ? b[k].index.count : b[k].attributes.position.count) / 3, 0);

const r = (x) => Math.round(x * 1000) / 1000;
console.log(JSON.stringify({
  belly: r(Math.min(chest.min.y, hips.min.y)),
  back: r(chest.max.y), crown: r(head.max.y),
  nose: r(head.max.z), tailTip: r(tail.min.z),
  bodyWidth: r(2 * Math.max(chest.max.x, hips.max.x)), headWidth: r(head.max.x - head.min.x),
  flipperTipY: r(flip.min.y), span: r(2 * flip.max.x), tris,
}));
assert.ok(Math.abs(Math.min(chest.min.y, hips.min.y) + 0.02) < 0.005, "belly pressed 2 cm into the snow");
assert.ok(flip.min.y > -0.06 && flip.min.y < 0.02, "flipper tips rest on the snow");
assert.ok(2 * flip.max.x >= 1.5, "flippers stick out past the flanks");
assert.ok(head.max.z <= 1.08 && tail.min.z >= -1.2, "length inside the 0.9 m collision budget");
assert.ok(head.max.x - head.min.x >= 2 * chest.max.x - 0.02, "head at least as wide as the body");
assert.ok(tris <= 10000, "triangle budget");
console.log("sealB: ok");
