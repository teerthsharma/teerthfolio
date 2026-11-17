// PARTS for the Accelerator look: the black choker with its electrode and cords, and the grey V chevrons of the
// white top. Small exact meshes laid on the torso field by bisection, one skinless figure on the body bone.
import { BoxGeometry, BufferAttribute, BufferGeometry, CatmullRomCurve3, Matrix4, Quaternion, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TORSO, darker, fieldOf, piece, torsoRow } from "../body.js";

const F = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, null, 0.013)));
const tube = (pts, r, seg = 40) => new TubeGeometry(new CatmullRomCurve3(pts), seg, r, 6, false);
const inside = (x, y, z) => F(x, y, z) < 0;

// the shell surface at (x, y), found along +z, standing `lift` proud
function front(x, y, lift = 0.002) {
  let a = -0.1, b = 0.5;
  for (let i = 0; i < 28; i++) { const m = (a + b) / 2; if (inside(x, y, m)) a = m; else b = m; }
  return new Vector3(x, y, (a + b) / 2 + lift);
}
// round the neck at azimuth th (0 = front) and height y
function ring(th, y, lift) {
  const d = new Vector3(Math.sin(th), 0, Math.cos(th)), o = new Vector3(0, y, -0.01);
  let a = 0, b = 0.6;
  for (let i = 0; i < 28; i++) { const m = (a + b) / 2; if (inside(o.x + d.x * m, y, o.z + d.z * m)) a = m; else b = m; }
  return o.addScaledVector(d, (a + b) / 2 + lift);
}

function choker(y0, y1) {
  const seg = 72, prof = [[y0, 0.001], [y0 + 0.004, 0.013], [y1 - 0.004, 0.013], [y1, 0.001]], pos = [], idx = [];
  for (let i = 0; i < seg; i++) for (const [y, l] of prof) pos.push(...ring((i / seg) * Math.PI * 2, y, l).toArray());
  for (let i = 0; i < seg; i++) for (let j = 0; j < 3; j++) { const a = i * 4 + j, b = ((i + 1) % seg) * 4 + j; idx.push(a, b + 1, b, a, a + 1, b + 1); }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3)); g.setIndex(idx); g.computeVertexNormals();
  if (g.attributes.normal.getZ(2) < 0) { for (let k = 0; k < idx.length; k += 3) [idx[k + 1], idx[k + 2]] = [idx[k + 2], idx[k + 1]]; g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

// one V chevron (apex down) centred at cx, apex height y, half-width w, arm rise h, laid on the shirt
function vee(cx, y, w, h, r) {
  const arm = (s) => { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(front(cx + s * w * t, y + h * t, 0.0025)); } return tube(pts, r, 12); };
  return [arm(1), arm(-1)];
}

// parts(spec): [{ geo, col, shade }] ready to merge by colour
export function acceleratorParts(c) {
  const out = [], band = piece(choker(0.462, 0.4935), c.choker, darker(c.choker, 0.6));
  out.push(band);
  // electrode: a flat plate on the band, left of centre, standing on the surface normal
  const p = ring(-0.26, 0.478, 0.013), n = p.clone().sub(new Vector3(0, 0.478, -0.01)).setY(0).normalize();
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n);
  out.push(piece(new BoxGeometry(0.024, 0.024, 0.006).applyMatrix4(new Matrix4().compose(p.clone().addScaledVector(n, 0.003), q, new Vector3(1, 1, 1))), c.electrode, darker(c.electrode, 0.6)));
  // two cords leave the band either side and sag to the chest, one longer than the other
  for (const [s, len] of [[1, 0.2], [-1, 0.27]]) {
    const a = ring(s * 0.55, 0.473, 0.012), pts = [a];
    for (let i = 1; i <= 7; i++) { const t = i / 7, y = 0.46 - len * t, x = s * (0.1 - 0.06 * t + 0.012 * Math.sin(t * 5)); pts.push(front(x, y, 0.006 + 0.004 * Math.sin(t * 3))); }
    out.push(piece(tube(pts, 0.0034, 40), c.cord, darker(c.cord, 0.6)));
  }
  // chevrons: three rows of V, the rows offset so they interlock like the show's top
  const ch = [];
  for (const [y, xs] of [[0.37, [-0.1, 0.0, 0.1]], [0.3, [-0.15, -0.05, 0.05, 0.15]], [0.23, [-0.1, 0.0, 0.1]], [0.16, [-0.15, -0.05, 0.05, 0.15]]]) for (const x of xs) ch.push(...vee(x, y, 0.034, 0.03, 0.0058));
  out.push(piece(mergeGeometries(ch), c.chevron, darker(c.chevron, 0.7)));
  return out;
}

