/* global console */
// node components/world/land/parts/mujorush-build.check.mjs
// The carved sheet hides the rough terrain behind the faces (above it from
// the sheer face over the lip and the dome, wherever the ends have not yet
// rounded away), and every
// carved part, crystal and floating boulder stays clear of the docks.

import assert from "node:assert/strict";
import { dockPoint } from "../../../../lib/world/places.js";
import { MOTION } from "../../../../lib/world/motion.js";
import { heightAt } from "../../../../lib/world/terrain.js";
import { CLIFF_X, CRYSTALS, FACES, FLOATERS, TALUS, sheetAt } from "./mujorush-build.js";

let worst = Infinity;
for (let x = CLIFF_X[0] + 4.5; x <= CLIFF_X[1] - 4.5; x += 0.25) {
  for (let d = 0; d <= 18; d += 0.25) {
    const { y, z } = sheetAt(x, d);
    const gap = y - heightAt(x, z);
    worst = Math.min(worst, gap);
    assert.ok(gap > 0.05, `rough terrain shows through the carved sheet at x ${x.toFixed(2)}, ${d} m back (gap ${gap.toFixed(2)})`);
  }
}

for (const f of FACES) {
  const dock = dockPoint(f.place);
  for (const b of [...TALUS, ...CRYSTALS, ...FLOATERS]) {
    if (Math.abs(b.x - f.x) > 6) continue;
    const reach = Math.hypot(b.x - dock.x, b.z - dock.z);
    assert.ok(reach > MOTION.sealRadius + 1, `a rock at ${b.x.toFixed(1)}, ${b.z.toFixed(1)} sits on ${f.id}'s dock`);
  }
}
for (const b of FLOATERS) assert.ok(b.y - b.r > 1.2, "a floating boulder hangs low enough to hit the seal");

console.log(`mujorush ok: sheet clears the rough rock by >= ${worst.toFixed(2)} m, ${TALUS.length} talus, ${CRYSTALS.length} crystals, ${FLOATERS.length} floaters`);
