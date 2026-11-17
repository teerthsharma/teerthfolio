// PARTS for the p-nerve look: Light's dark tie with its knot and highlight, the two shirt-collar wings, and the
// red Death Note (cover, page block, scratched lettering). Built on the shared torso rows; each is one figure.
import { BoxGeometry, BufferAttribute, BufferGeometry, Matrix4, Quaternion, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TORSO, cached, darker, fieldOf, piece, torsoRow } from "../body.js";

const TF = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, null)));
const SHELL = 0.012;
const zAt = (x, y, grow) => { let a = 0.5, b = -0.1; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (TF(x, y, m) - grow > 0) a = m; else b = m; } return (a + b) / 2; };
const nAt = (p) => { const e = 0.002; return new Vector3(TF(p.x + e, p.y, p.z) - TF(p.x - e, p.y, p.z), TF(p.x, p.y + e, p.z) - TF(p.x, p.y - e, p.z), TF(p.x, p.y, p.z + e) - TF(p.x, p.y, p.z - e)).normalize(); };

function build(engine, geo, ink) {
  const fig = engine.figure(geo, { ink, lineMul: 1.2 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// a ribbon hugging the shirt: rows of [y, half width, centre x]; `lift` proud of the shell
function ribbon(rows, lift, across = 4) {
  const pos = [], idx = [];
  rows.forEach(([y, w, cx]) => {
    for (let j = 0; j <= across; j++) { const x = cx + w * (2 * j / across - 1), z = zAt(x, y, SHELL) + lift; pos.push(x, y, z); }
  });
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < across; j++) {
    const a = i * (across + 1) + j, b = a + 1, c = a + across + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (g.attributes.normal.getZ(0) < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
  return g.toNonIndexed();
}

const TIE = "#2a2e3a", TIE_SH = "#12141c", TIE_HI = "#4b5268";
export function tieShell(engine) {
  const geo = cached("nerve|tie", () => {
    const blade = [[0.4, 0.02, 0], [0.37, 0.026, 0.002], [0.3, 0.033, 0.004], [0.22, 0.04, 0.003], [0.15, 0.036, 0.001], [0.11, 0.015, 0], [0.098, 0.002, 0]];
    const hi = blade.map(([y, w, cx]) => [y, w * 0.2, cx - w * 0.5]).slice(1, 6);
    const parts = [piece(ribbon(blade, 0.008, 6), TIE, TIE_SH), piece(ribbon(hi, 0.0105, 2), TIE_HI, TIE)];
    const p = new Vector3(0, 0.405, zAt(0, 0.405, SHELL) + 0.011), n = nAt(p).lerp(new Vector3(0, 0.3, 1), 0.5).normalize();
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n);
    parts.push(piece(new SphereGeometry(0.03, 16, 10).scale(1, 0.72, 0.62).applyMatrix4(new Matrix4().compose(p, q, new Vector3(1, 1, 1))), TIE, TIE_SH));
    // two collar wings, pointing down and out over the shoulder line either side of the knot
    for (const s of [1, -1]) {
      const wing = ribbon([[0.452, 0.0, s * 0.026], [0.43, 0.022, s * 0.056], [0.4, 0.021, s * 0.076], [0.358, 0.0, s * 0.097]], 0.0105, 2);
      parts.push(piece(wing, "#f0efeb", "#a9b0c4"));
    }
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
  return build(engine, geo, "#3a3a46");
}

// the notebook in wrist space: fingers run -y, the thumb +z; `cover` faces +x (away from the body)
const COVER = "#26242b", COVER_SH = "#0e0d12", PAPER = "#f4efe3";
export function notebook(engine) {
  const geo = cached("nerve|notebook", () => {
    const W = 0.15, H = 0.2, T = 0.026, parts = [];
    const at = (g, x, y, z) => g.applyMatrix4(new Matrix4().makeTranslation(x, y, z));
    parts.push(piece(at(new BoxGeometry(T, H, W), 0, 0, 0), COVER, COVER_SH));
    parts.push(piece(at(new BoxGeometry(T * 0.62, H - 0.012, W - 0.008), -0.002, -0.001, 0.004), PAPER, "#b8b0a0"));
    parts.push(piece(at(new BoxGeometry(T + 0.003, H + 0.004, 0.012), 0, 0, -W / 2 + 0.004), darker(COVER, 0.78), COVER_SH));
    // cream title card and white scrawl on the front cover
    const X = T / 2 + 0.0008, card = (y, z, h, w, col) => parts.push(piece(at(new BoxGeometry(0.0022, h, w), X, y, z), col, "#b8b0a0"));
    card(0.06, 0, 0.05, 0.11, "#e8dcc0");
    for (let i = 0; i < 3; i++) card(0.062 - i * 0.012, -0.012 + i * 0.01, 0.0045, 0.07 - i * 0.012, "#2a1a16");
    const stroke = (y, z, len, rot) => parts.push(piece(at(new BoxGeometry(0.0022, 0.005, len).applyMatrix4(new Matrix4().makeRotationX(rot)), X + 0.0004, y, z), "#fbf8ee", "#b8b0a0"));
    for (let r = 0; r < 4; r++) for (let i = 0; i < 4 - (r % 2); i++) stroke(-0.005 - r * 0.026, -0.05 + i * 0.026 + r * 0.004, 0.02, 0.5 * ((i + r) % 2 ? 1 : -1));
    return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  });
  return build(engine, geo, "#3a0a10");
}
