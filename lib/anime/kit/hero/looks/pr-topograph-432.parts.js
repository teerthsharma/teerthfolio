// PARTS for the pr-topograph-432 look: the seven-gem staff, violet pauldron orbs and gold rings, and the gold collar fins;
// built from shared piece()/figure, each attached by the look (staff in the wrist frame, the rest in the body frame).
import { CylinderGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { darker, piece } from "../body.js";
import { TAU, taper } from "../wear/geo.js";

const GOLD = "#f0b429", GEMS = ["#ff2a3c", "#ff9a2e", "#ffe14a", "#3be06a", "#35c8ff", "#8a5cff", "#ff5ad2"];
const GRIP = [-0.012, -0.05, 0];
const flat = (parts) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
const fig = (engine, geo, ink) => { const f = engine.figure(geo, { ink, lineMul: 1 }); f.userData.hull.uniforms.uConst.value = 1; return f; };

export function ainzStaff(engine) {
  const c = "#0c0614", L = 0.6, top = L - 0.3, R = 0.05, p = [];
  const g = (x) => piece(x, GOLD, darker(GOLD, 0.5), { line: 0.9 });
  p.push(piece(new CylinderGeometry(0.0095, 0.012, L, 12).translate(0, L / 2 - 0.3, 0), c, darker(c, 0.5), { line: 1 }));
  for (const y of [0.1, -0.05, top - 0.04]) p.push(g(new TorusGeometry(0.0135, 0.0038, 6, 16).rotateX(Math.PI / 2).translate(0, y, 0)));
  p.push(g(new TorusGeometry(R, 0.006, 8, 36).rotateY(Math.PI / 2).translate(0, top + R, 0)));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + Math.PI / 2, y = top + R + Math.sin(a) * (R + 0.003), z = Math.cos(a) * (R + 0.003);
    p.push(piece(new SphereGeometry(0.0105, 10, 8).scale(1, 1.25, 1).translate(0, y, z), GEMS[i], darker(GEMS[i], 0.5), { line: 0.9 }));
    p.push(g(taper([new Vector3(0, y, z), new Vector3(0, y + Math.sin(a) * 0.03, z + Math.cos(a) * 0.03), new Vector3(0, y + Math.sin(a) * 0.05, z + Math.cos(a) * 0.05)], 0.005, 0.0015, 6, 5)));
  }
  p.push(piece(new SphereGeometry(0.02, 12, 8).translate(0, top + R, 0), "#c82040", "#6a1020", { line: 1 }));
  for (const s of [1, -1]) p.push(g(taper([new Vector3(0, top, 0), new Vector3(0, top + 0.03, s * 0.03), new Vector3(0, top + R * 0.8, s * R)], 0.007, 0.004, 8, 6)));
  const f = fig(engine, flat(p.map((x) => x.toNonIndexed().rotateX(Math.PI / 2).translate(GRIP[0] - 0.012, GRIP[1] + 0.05, 0))), "#2a1a1e");
  return f;
}

export function pauldrons(engine) {
  const p = [];
  for (const s of [1, -1]) {
    const c = [s * 0.285, 0.47, 0.04];
    p.push(piece(new SphereGeometry(0.028, 16, 12).translate(...c), "#8a5cff", "#4a1a8a", { line: 1 }));
    p.push(piece(new TorusGeometry(0.034, 0.005, 8, 28).rotateY(Math.PI / 2).translate(...c), GOLD, darker(GOLD, 0.5), { line: 1 }));
    p.push(piece(new SphereGeometry(0.011, 8, 6).translate(c[0] + s * 0.02, c[1] + 0.016, c[2] + 0.024), "#e6c8ff", "#a23cff", { line: 0.5 }));
  }
  return fig(engine, flat(p), "#1a0c24");
}
export function rings(engine) {
  const p = [0, 1].map((i) => piece(new TorusGeometry(0.013, 0.0035, 6, 18).rotateX(Math.PI / 2).translate(-0.012, -0.03 - i * 0.01, 0), GOLD, darker(GOLD, 0.5), { line: 0.8 }));
  return fig(engine, flat(p), "#4a3410");
}
export function collar(engine) {
  const p = [];
  for (const s of [1, -1]) {
    const at = [s * 0.09, 0.52, -0.04], tilt = -s * 0.34;
    p.push(piece(taper([new Vector3(0, 0, 0), new Vector3(0, 0.09, 0)], 0.016, 0.001, 6, 4).rotateZ(tilt).translate(...at), GOLD, darker(GOLD, 0.5), { line: 1 }));
    p.push(piece(taper([new Vector3(0, 0.01, 0.012), new Vector3(0, 0.07, 0.012)], 0.009, 0.001, 6, 4).rotateZ(tilt).translate(...at), "#7a1a2a", darker("#7a1a2a", 0.5), { line: 1 }));
  }
  return fig(engine, flat(p), "#05020a");
}
