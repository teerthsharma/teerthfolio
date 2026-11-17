// PARTS for the p-tangle look: Mitsuha's red collar ribbon and nape hair-tie, Taki's red cord wrapped at the wrist.
// Each is a figure drawn like the outfit and attached to the body, head or wrist pivot by the look's `extras`.
import { CatmullRomCurve3, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DOME, cached, darker, piece } from "../body.js";
import { HF, TF, onF, taper } from "../wear/geo.js";

const RED = "#e34a4a", RED_SH = "#7a4f5d", CORD = "#e0243c", CORD_SH = "#752829";
const merge = (parts) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
function build(engine, geo, ink) {
  const fig = engine.figure(geo, { ink, lineMul: 1.2 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}
const loop = (c, s, w, h, d) => piece(new SphereGeometry(1, 16, 10).scale(w, h, d).translate(c.x + s * w * 0.85, c.y, c.z), RED, RED_SH, { line: 1 });

export function ribbonBow(engine, ink = "#31233b") {
  return build(engine, cached("tangle|bow", () => {
    const F = (x, y, z) => TF(x, y, z) - 0.012, c = onF(F, [0, 0, -0.02], 0, 0.405, 0.016), parts = [];
    for (const s of [1, -1]) {
      parts.push(loop(c, s, 0.05, 0.034, 0.016));
      parts.push(piece(taper([c, c.clone().add(new Vector3(s * 0.022, -0.05, 0.01)), c.clone().add(new Vector3(s * 0.034, -0.12, 0.012))], 0.017, 0.009, 14, 6), RED, RED_SH, { line: 1 }));
    }
    parts.push(piece(new SphereGeometry(0.02, 14, 10).scale(1, 0.95, 0.8).translate(c.x, c.y, c.z + 0.004), darker(RED, 1.12), RED_SH, { line: 1 }));
    return merge(parts);
  }), ink);
}

export function hairTie(engine, ink = "#31233b") {
  return build(engine, cached("tangle|tie", () => {
    const p = onF(HF, [0, 0, 0], Math.PI, 0.1, 0.03);
    return merge([
      piece(new TorusGeometry(0.03, 0.009, 8, 20).rotateX(Math.PI / 2).rotateX(-0.25).translate(p.x, p.y, p.z), RED, RED_SH, { line: 1 }),
      piece(new SphereGeometry(0.014, 10, 8).translate(p.x, p.y - 0.004, p.z - 0.03), darker(RED, 1.1), RED_SH, { line: 0.9 }),
    ]);
  }), ink);
}

// wrist frame: origin at the wrist, the forearm toward +y, the fingers toward -y; three braided turns and a loose end
export function cordWrap(engine, ink = "#31233b") {
  return build(engine, cached("tangle|cord", () => {
    const parts = [];
    for (let i = 0; i < 3; i++) parts.push(piece(new TorusGeometry(0.047, 0.0058, 6, 28).rotateX(Math.PI / 2).rotateZ(0.18 * (i - 1)).translate(0, 0.004 - i * 0.015, 0), CORD, CORD_SH, { line: 1 }));
    const end = new CatmullRomCurve3([new Vector3(0.046, -0.03, 0.01), new Vector3(0.06, -0.07, 0.025), new Vector3(0.056, -0.12, 0.03)]);
    parts.push(piece(new TubeGeometry(end, 14, 0.0052, 6, false), CORD, CORD_SH, { line: 0.9 }));
    parts.push(piece(new SphereGeometry(0.0085, 10, 8).translate(0.056, -0.126, 0.03), darker(CORD, 1.25), CORD_SH, { line: 0.9 }));
    return merge(parts);
  }), ink);
}

// Taki's wristwatch on the near wrist: a dark strap ring and a pale round face on the outer side
export function wristWatch(engine, ink = "#31233b") {
  return build(engine, cached("tangle|watch", () => merge([
    piece(new TorusGeometry(0.05, 0.0075, 6, 28).rotateX(Math.PI / 2).translate(0, 0.01, 0), "#3a3a48", "#1c1c28", { line: 1 }),
    piece(new SphereGeometry(0.02, 14, 10).scale(1, 0.4, 1).rotateX(Math.PI / 2).translate(0, 0.01, 0.052), "#e8e4dc", "#9a98a8", { line: 1 }),
  ])), ink);
}
