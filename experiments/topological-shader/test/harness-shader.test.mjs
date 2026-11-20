import test from "node:test";
import assert from "node:assert/strict";
import { makeHexGrid } from "../../../lib/world/heat/hexgrid.js";
import { packTh, TH_COLS, TH_ROWS } from "../../../lib/world/heat/harness.js";

const H = 4;
const SQ = Math.sqrt(3) / 2;

test("the shader's odd-r texel lookup reads the cell the packer wrote", () => {
  const g = makeHexGrid(84, H);
  const n = g.n;
  const out = new Uint8Array(TH_COLS * TH_ROWS * 4);
  const C = new Float32Array(n).map((_, c) => (c % 251) / 255);
  packTh(out, new Uint8Array(n), new Uint8Array(n), new Uint8Array(n), C, null, null, g);
  const minZ = Math.min(...g.zs);
  const rowOf = (z) => Math.round((z - minZ) / (H * SQ));
  let minI = Infinity;
  for (let c = 0; c < n; c++) {
    const r = rowOf(g.zs[c]);
    minI = Math.min(minI, Math.round((g.xs[c] - (r % 2) * H * 0.5) / H));
  }
  const origin = [minI * H, minZ];
  for (let c = 0; c < n; c++) {
    const row = Math.floor((g.zs[c] - origin[1]) / (H * SQ) + 0.5);
    const col = Math.floor((g.xs[c] - origin[0] - (row % 2) * 0.5 * H) / H + 0.5);
    assert.ok(row >= 0 && row < TH_ROWS && col >= 0 && col < TH_COLS, `cell ${c} inside the texture`);
    assert.equal(out[(row * TH_COLS + col) * 4 + 1], Math.round(C[c] * 255), `cell ${c}`);
  }
});
