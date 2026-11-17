// node lib/anime/cutscenes/p-asmodeus/layout.check.mjs : layout is finite every 0.05 s from 0 to 11.95, has a form, and Lucifer is present only in 7.0 to 8.5 with his head inside the band
import assert from "node:assert/strict";
import { layout } from "./layout.js";

const finite = (v) => (v && typeof v === "object" ? Object.values(v).every(finite) : v === null || Number.isFinite(v));
for (let i = 0; i <= 239; i++) {
  const t = i * 0.05, L = layout(t);
  assert.ok(finite({ hero: L.hero, foe: L.foe, feet: L.feet, chest: L.chest, palm: L.palm, foeChest: L.foeChest }), `finite at ${t.toFixed(2)}`);
  assert.equal(typeof L.form, "string", `form at ${t.toFixed(2)}`);
  if (L.foe) assert.ok(L.foe.v - L.foe.hh >= 0.08, `Lucifer's head inside the band at ${t.toFixed(2)}`);
}
assert.equal(layout(6.9).foe, null);
assert.ok(layout(7.5).foe && layout(8.4).foe);
assert.equal(layout(8.5).foe, null);
assert.equal(layout(8.4).shot, 9);
assert.equal(layout(9).shot, 10);
assert.equal(layout(0.5).form, "pup");
console.log("layout.check: ok");
