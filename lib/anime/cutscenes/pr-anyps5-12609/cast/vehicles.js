// VEHICLES for pr-anyps5-12609: jet ski, runabout, police buggy and convertible, each one painted figure (ink hull) from rounded primitives, bow along +x, origin at the waterline.
import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { darker, piece } from "../../../kit/hero/body.js";
import { INK } from "./looks.js";

const ni = (g) => (g.index ? g.toNonIndexed() : g);
const at = (g, x, y, z) => g.translate(x, y, z);
const part = (g, col, shade, line = 1) => piece(ni(g), col, shade ?? darker(col, 0.6), { line });
const rbox = (w, h, d, r, x, y, z) => at(new RoundedBoxGeometry(w, h, d, 2, r), x, y, z);
const wheel = (r, w, x, y, z) => at(new CylinderGeometry(r, r, w, 14).rotateX(Math.PI / 2), x, y, z);
const fig = (engine, parts, mul = 1.25) => {
  const f = engine.figure(mergeGeometries(parts), { ink: INK, lineMul: mul });
  f.userData.hull.uniforms.uConst.value = 1;
  return f;
};

// jet ski: dark hull, hot pink deck, bar, seat for two (rider x -0.1, pillion x -0.6)
export function jetSki(engine) {
  const P = [
    part(rbox(2.0, 0.26, 0.74, 0.1, 0, 0.1, 0), "#12222e", "#0a141c"),
    part(at(new SphereGeometry(1, 12, 8).scale(0.34, 0.14, 0.36), 1.0, 0.12, 0), "#12222e", "#0a141c"),
    part(rbox(1.7, 0.2, 0.7, 0.09, -0.05, 0.28, 0), "#ff3ea0", "#b01c6c"),
    part(rbox(0.5, 0.22, 0.6, 0.08, 0.72, 0.38, 0), "#ff3ea0", "#b01c6c"),
    part(rbox(1.0, 0.1, 0.32, 0.04, -0.35, 0.42, 0), "#1c1a24", "#0e0d14"),
    part(at(new CylinderGeometry(0.03, 0.03, 0.34, 8), 0.62, 0.62, 0), "#d8d8e0", "#8a8a9a"),
    part(at(new CylinderGeometry(0.03, 0.03, 0.62, 8).rotateX(Math.PI / 2), 0.62, 0.8, 0), "#1c1a24", "#0e0d14"),
    part(at(new BoxGeometry(0.34, 0.16, 0.04), -1.0, 0.3, 0), "#2ae6ff", "#1a8aa0"),
  ];
  return fig(engine, P);
}

// runabout: white pointed hull (extruded planform) with a teal stripe, a bench and a windscreen, outboard at the stern
function hull() {
  const sh = new Shape();
  sh.moveTo(-1.25, -0.48); sh.lineTo(0.6, -0.52); sh.quadraticCurveTo(1.45, -0.3, 1.75, 0); sh.quadraticCurveTo(1.45, 0.3, 0.6, 0.52); sh.lineTo(-1.25, 0.48); sh.lineTo(-1.25, -0.48);
  return new ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 6 }).rotateX(-Math.PI / 2);
}
export function runabout(engine) {
  const P = [
    part(hull().scale(1, 1.25, 1).translate(0, 0.0, 0), "#f2f2ee", "#a8a8b8"),
    part(hull().scale(1.01, 0.2, 1.01).translate(0, 0.24, 0), "#1fb5b0", "#0f6a86"),
    part(rbox(1.5, 0.08, 0.74, 0.03, -0.15, 0.4, 0), "#d8c8a8", "#8a7a5a"),
    part(rbox(0.28, 0.46, 0.8, 0.05, -0.65, 0.62, 0), "#f2f2ee", "#a8a8b8"),
    part(rbox(0.06, 0.3, 0.7, 0.03, 0.62, 0.62, 0), "#2a6f8a", "#17475a"),
    part(rbox(0.28, 0.4, 0.24, 0.05, -1.42, 0.4, 0), "#1c1a24", "#0e0d14"),
  ];
  return fig(engine, P);
}

// patrol boat (the cruiser): navy hull, white topsides, an open cab on four posts under a flat roof (the perch), no lettering
export function cruiser(engine) {
  const post = (x, z) => part(rbox(0.06, 0.8, 0.06, 0.015, x, 0.9, z), "#1a2a44", "#0e1626");
  const P = [
    part(hull().scale(0.9, 1, 1).translate(0, 0, 0), "#1a2a44", "#0e1626"),
    part(hull().scale(0.88, 0.75, 0.96).translate(0, 0.3, 0), "#f2f2ee", "#a8a8b8"),
    part(rbox(1.1, 0.08, 0.76, 0.03, -0.2, 0.52, 0), "#d8c8a8", "#8a7a5a"),
    part(rbox(0.07, 0.34, 0.78, 0.02, 0.5, 0.7, 0), "#2a6f8a", "#17475a"),
    post(0.45, 0.4), post(0.45, -0.4), post(-0.85, 0.4), post(-0.85, -0.4),
    part(rbox(1.6, 0.08, 1.0, 0.04, -0.2, 1.34, 0), "#f2f2ee", "#a8a8b8"),
    part(rbox(1.62, 0.04, 1.02, 0.02, -0.2, 1.29, 0), "#1a2a44", "#0e1626"),
    part(rbox(0.28, 0.4, 0.24, 0.05, -1.3, 0.4, 0), "#1c1a24", "#0e0d14"),
  ];
  return fig(engine, P);
}

// the light bar: two lamps on the roof, red and blue; its own figure so the cast layer can drive emission on twos
export function lightBar(engine) {
  const red = engine.figure(mergeGeometries([part(rbox(0.3, 0.14, 0.34, 0.05, 0, 0, 0), "#e8303a", "#8a1820")]), { ink: INK, lineMul: 1.1 });
  const blue = engine.figure(mergeGeometries([part(rbox(0.3, 0.14, 0.34, 0.05, 0, 0, 0), "#2a6aff", "#183a99")]), { ink: INK, lineMul: 1.1 });
  for (const f of [red, blue]) f.userData.hull.uniforms.uConst.value = 1;
  return { red, blue };
}

// convertible: red open car with a low beltline so the seals sit whole above it, white seats, wheels on the causeway
export function convertible(engine) {
  const P = [
    part(rbox(3.3, 0.3, 1.3, 0.12, 0, 0.4, 0), "#c8303a", "#7a1a28"),
    part(rbox(1.0, 0.16, 1.2, 0.06, 1.1, 0.56, 0), "#c8303a", "#7a1a28"),
    part(rbox(0.7, 0.16, 1.2, 0.06, -1.25, 0.56, 0), "#c8303a", "#7a1a28"),
    part(rbox(0.6, 0.1, 0.9, 0.04, 0.45, 0.58, 0.0), "#f2f2ee", "#a8a8b8"),
    part(rbox(0.6, 0.1, 0.9, 0.04, -0.55, 0.58, 0.0), "#f2f2ee", "#a8a8b8"),
    part(rbox(0.07, 0.3, 1.18, 0.03, 0.82, 0.78, 0), "#2a6f8a", "#17475a"),
    part(rbox(0.1, 0.12, 1.34, 0.04, 1.68, 0.36, 0), "#d8d8e0", "#8a8a9a"),
    part(rbox(0.1, 0.12, 1.34, 0.04, -1.68, 0.36, 0), "#d8d8e0", "#8a8a9a"),
    part(wheel(0.27, 0.24, 1.05, 0.27, 0.65), "#1c1a24", "#0e0d14"), part(wheel(0.27, 0.24, 1.05, 0.27, -0.65), "#1c1a24", "#0e0d14"),
    part(wheel(0.27, 0.24, -1.05, 0.27, 0.65), "#1c1a24", "#0e0d14"), part(wheel(0.27, 0.24, -1.05, 0.27, -0.65), "#1c1a24", "#0e0d14"),
  ];
  return fig(engine, P);
}
