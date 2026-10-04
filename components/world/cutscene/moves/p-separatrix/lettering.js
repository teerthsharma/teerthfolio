// GILDED MESH LETTERING: no font loads, no canvas. Each glyph is a few polyline strokes (a unit box, y up);
// every stroke is a chain of thick boxes in gold leaf, so MUDA, DON!, TING and the ゴゴゴ are real geometry
// that catches the matcap and carries the punched-dot border. The ゴ is the katakana go: the open box of コ and
// the two ticks of the dakuten.

import { BoxGeometry, Matrix4, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const ELL = (n, rx, ry, cx, cy, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(a0 + ((a1 - a0) * i) / n) * rx, cy + Math.sin(a0 + ((a1 - a0) * i) / n) * ry]);
const GLYPH = {
  M: [[[0, 0], [0, 1], [0.5, 0.42], [1, 1], [1, 0]]],
  U: [[[0, 1], [0, 0.3], [0.12, 0.08], [0.5, 0], [0.88, 0.08], [1, 0.3], [1, 1]]],
  D: [[[0, 0], [0, 1], [0.55, 1], [0.9, 0.8], [1, 0.5], [0.9, 0.2], [0.55, 0], [0, 0]]],
  A: [[[0, 0], [0.5, 1], [1, 0]], [[0.2, 0.38], [0.8, 0.38]]],
  O: [ELL(12, 0.5, 0.5, 0.5, 0.5)],
  N: [[[0, 0], [0, 1], [1, 0], [1, 1]]],
  T: [[[0, 1], [1, 1]], [[0.5, 1], [0.5, 0]]],
  I: [[[0.5, 0], [0.5, 1]]],
  G: [[[1, 0.82], [0.8, 1], [0.2, 1], [0, 0.82], [0, 0.18], [0.2, 0], [0.8, 0], [1, 0.18], [1, 0.48], [0.56, 0.48]]],
  "!": [[[0.5, 1], [0.5, 0.3]], [[0.5, 0.04], [0.5, 0.06]]],
  ".": [[[0.5, 0.04], [0.5, 0.06]]],
  // ゴ: コ and the dakuten
  "ゴ": [[[0.04, 0.9], [0.96, 0.9], [0.96, 0.06], [0.04, 0.06]], [[0.8, 1.18], [0.9, 1.34]], [[0.97, 1.1], [1.07, 1.26]]],
};
const Z = new Vector3(0, 0, 1);
const M = new Matrix4();
const Q = new Quaternion();
const S = new Vector3();
const T = new Vector3();

// A word as one merged geometry, centred on its own box, `height` tall (glyph units: 1 = height), strokes `thick` wide.
export function word(text, { height = 1, thick = 0.16, depth = 0.14, gap = 0.28, widthOf = 0.8 } = {}) {
  const parts = [];
  let x = 0;
  for (const ch of text) {
    const strokes = GLYPH[ch] ?? [];
    for (const st of strokes) {
      for (let i = 0; i < st.length - 1; i++) {
        const [ax, ay] = st[i];
        const [bx, by] = st[i + 1];
        const dx = (bx - ax) * widthOf;
        const dy = by - ay;
        const len = Math.hypot(dx, dy) + thick * 0.92;
        const g = new BoxGeometry(len, thick, depth);
        const ang = Math.atan2(dy, dx);
        Q.setFromAxisAngle(Z, ang);
        M.compose(T.set(x + ((ax + bx) / 2) * widthOf, (ay + by) / 2, 0), Q, S.set(1, 1, 1));
        g.applyMatrix4(M);
        g.deleteAttribute("uv");
        parts.push(g);
      }
    }
    x += widthOf + gap;
  }
  const g = mergeGeometries(parts);
  g.computeBoundingBox();
  const bb = g.boundingBox;
  g.translate(-(bb.min.x + bb.max.x) / 2, -0.5, 0);
  g.scale(height, height, height);
  return g;
}
