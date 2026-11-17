// PARTS for the home look (Thors variant): a full brown beard of tapered clumps on the head, and a torn cream
// cloak hanging from the shoulders over the back and flanks with a ragged hem.
import { BufferAttribute, BufferGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cached, darker, piece } from "../body.js";
import { onF, grown, taper } from "../wear/geo.js";

const BEARD = "#6a5240", BEARD_SH = "#2c231c", CLOAK = "#d9d0bc", CLOAK_SH = "#99a0ae";

export function beard(engine) {
  const geo = cached("home|beard", () => {
    const parts = [];
    for (let i = 0; i < 9; i++) {
      const u = (i - 4) / 4, x = u * 0.105, zf = 0.19 * Math.cos(u * 0.9), len = 0.125 - 0.04 * Math.abs(u) + 0.012 * (i % 2);
      const a = new Vector3(x, 0.075 - 0.025 * Math.abs(u), zf - 0.01), b = new Vector3(x * 1.05, a.y - 0.03 - len * 0.45, zf + 0.03), c = new Vector3(x * 0.8, a.y - len, zf + 0.04);
      parts.push(piece(taper([a, b, c], 0.032 - 0.006 * Math.abs(u), 0.003, 12, 6), i % 3 === 1 ? darker(BEARD, 1.2) : BEARD, BEARD_SH, { line: 1 }));
    }
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
  return engine.figure(geo, { ink: "#1a1410" });
}

const COLS = 64, ROWS = 9, TH0 = 1.45, TH1 = 4.83;
function sheet(grow, flip) {
  const F = grown(0), pos = [], idx = [];
  for (let i = 0; i <= COLS; i++) {
    const th = TH0 + (i / COLS) * (TH1 - TH0), edge = Math.sin(((th - TH0) / (TH1 - TH0)) * Math.PI);
    const hem = 0.03 + 0.09 * (((th * 3.1) % 1) ** 1.4) + 0.03 * Math.sin(th * 11.3) + 0.06 * (1 - edge);
    for (let j = 0; j <= ROWS; j++) {
      const t = j / ROWS, y = 0.47 - (0.47 - hem) * t, fold = 0.012 * t * Math.sin(th * 8.5 + t * 2.1);
      const p = onF(F, [0, 0, 0.03], th, y, 0.022 + 0.07 * t * t + fold + grow);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
    const a = i * (ROWS + 1) + j, b = (i + 1) * (ROWS + 1) + j;
    idx.push(...(flip ? [a, b, a + 1, b, b + 1, a + 1] : [a, a + 1, b, b, a + 1, b + 1]));
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function tornCloak(engine) {
  const geo = cached("home|cloak", () => mergeGeometries([piece(sheet(0.008, false), CLOAK, CLOAK_SH), piece(sheet(0, true), darker(CLOAK, 0.85), CLOAK_SH)].map((g) => g.toNonIndexed())));
  return engine.figure(geo, { ink: "#221e1c" });
}
