// node lib/anime/cutscenes/p-asmodeus/layout.check.mjs : layout is finite every 0.05 s from 0 to 11.9, and Lucifer is present only in 7.0 to 8.5
import assert from "node:assert/strict";
import { layout } from "./layout.js";

const finite = (v) => (v && typeof v === "object" ? Object.values(v).every(finite) : v === null || Number.isFinite(v));
for (let i = 0; i <= 238; i++) {
  const L = layout(i * 0.05);
  assert.ok(finite({ hero: L.hero, foe: L.foe, feet: L.feet, chest: L.chest, palm: L.palm, foeChest: L.foeChest }), `finite at ${(i * 0.05).toFixed(2)}`);
}
assert.equal(layout(6.9).foe, null);
assert.ok(layout(7.5).foe && layout(8.4).foe);
assert.equal(layout(8.5).foe, null);
assert.equal(layout(8.4).shot, 9);
assert.equal(layout(9).shot, 10);
console.log("layout.check: ok");
