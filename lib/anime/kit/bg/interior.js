// INTERIORS. bgRoom(ctx, look, spec) builds a room whose every surface is painted (stone, plaster, wood) and lit by the look's pools.
//   spec.kind  "hall"      { w, d, h, columns: 6, z0 }   a stone nave: flagstone floor, block walls, columns with caps, a dark ceiling, lamps hung down the axis
//              "classroom" { w, d, h, desks: [3, 5] }    plaster walls with a wainscot, plank floor, a window wall that glows, a board, desks, a dark ceiling with light strips
//   spec.stone / spec.plaster / spec.wood  material options (see ground.js); spec.glow  the window or lamp colour; spec.lamps  how many pools to place (max 4)
// The room is centred on x 0, floor at y 0, runs from z = -d to z = 0 by default (spec.z0 shifts it). Returns { group, lamps: [Vector3], dispose }.
// Pools are written to look slots 0..n-1, so every surface (and every kit piece you add) is lit by them.
import { BoxGeometry, Color, CylinderGeometry, Group, Mesh, PlaneGeometry, Vector3, Vector4 } from "three";
import { bgMaterial } from "./material.js";
import { bgStone, bgWood } from "./ground.js";
import { GLOWPANE, PLASTER } from "./surfaces.js";

const C = (h) => new Color(h);
const FLOOR = (w, d, x, y, z) => new PlaneGeometry(w, d, 1, 1).rotateX(-Math.PI / 2).translate(x, y, z);

export function plasterMaterial(look, o = {}) {
  return bgMaterial(look, { id: o.id ?? 0.5, frag: PLASTER, uniforms: { uPl0: { value: C(o.top ?? "#d8d4c0") }, uPl1: { value: C(o.low ?? "#5f8a78") }, uPl: { value: new Vector4(o.wainscot ?? 1.0, o.seed ?? 6, o.grime ?? 0.35, o.crack ?? 0.4) } } });
}
export function glowMaterial(look, o = {}) {
  return bgMaterial(look, { id: o.id ?? 0.6, frag: GLOWPANE, uniforms: { uGl: { value: C(o.col ?? "#fff1c8") }, uGlP: { value: new Vector4(o.k ?? 1.6, o.cols ?? 1, o.rows ?? 1, 1) } } });
}

function hall(ctx, look, s) {
  const { w = 18, d = 48, h = 24, columns = 6, z0 = 0 } = s, g = new Group(), zc = z0 - d / 2, lamps = [];
  const st = { ...(s.stone ?? {}) };
  g.add(bgStone(ctx, look, FLOOR(w, d, 0, 0, zc), { block: [1.8, 1.8], gloss: 0.55, moss: 0.1, ...st }));
  const wallL = new PlaneGeometry(d, h, 1, 1).rotateY(Math.PI / 2).translate(-w / 2, h / 2, zc), wallR = new PlaneGeometry(d, h, 1, 1).rotateY(-Math.PI / 2).translate(w / 2, h / 2, zc);
  const wallB = new PlaneGeometry(w, h, 1, 1).translate(0, h / 2, z0 - d);
  for (const geo of [wallL, wallR, wallB]) g.add(bgStone(ctx, look, geo, { block: [2.2, 0.9], chip: 0.06, crack: 0.6, moss: 0.35, ...st }));
  const ceil = new Mesh(new PlaneGeometry(w, d, 1, 1).rotateX(Math.PI / 2).translate(0, h, zc), bgMaterial(look, { id: 0.5, frag: GLOWPANE, uniforms: { uGl: { value: C("#000000") }, uGlP: { value: new Vector4(0, 1, 1, 1) } } }));
  g.add(ceil);
  const cm = bgStone(ctx, look, new CylinderGeometry(0.62, 0.8, h * 0.62, 12, 1).translate(0, h * 0.31, 0), { block: [3.2, 0.6], chip: 0.03, crack: 0.35, ...st });
  const cap = new BoxGeometry(2.1, 0.5, 2.1).translate(0, h * 0.62, 0), base = new BoxGeometry(2.0, 0.5, 2.0).translate(0, 0.25, 0);
  for (let i = 0; i < columns; i++) for (const sx of [-1, 1]) {
    const z = z0 - 4 - (i * (d - 8)) / Math.max(1, columns - 1);
    const sh = new Mesh(cm.geometry, cm.material); sh.position.set(sx * w * 0.3, 0, z); g.add(sh);
    for (const geo of [cap, base]) { const m = new Mesh(geo, cm.material); m.position.set(sx * w * 0.3, 0, z); g.add(m); }
  }
  const n = Math.min(s.lamps ?? 3, 4);
  for (let i = 0; i < n; i++) {
    const p = new Vector3(0, h * 0.5, z0 - 6 - (i * (d - 12)) / Math.max(1, n - 1)); lamps.push(p);
    const lamp = new Mesh(new CylinderGeometry(0.6, 0.35, 1.0, 10), glowMaterial(look, { col: s.glow ?? "#ffd890", k: 2.4 })); lamp.position.copy(p); g.add(lamp);
    look.pool(i, { at: [p.x, h * 0.22, p.z], col: s.glow ?? "#ffcf80", r: d * 0.28 });
  }
  return { group: g, lamps };
}

function classroom(ctx, look, s) {
  const { w = 9, d = 11, h = 3.2, z0 = 0 } = s, g = new Group(), zc = z0 - d / 2, lamps = [];
  const pl = plasterMaterial(look, s.plaster), mk = (geo) => { const m = new Mesh(geo, pl); g.add(m); return m; };
  g.add(bgWood(ctx, look, FLOOR(w, d, 0, 0, zc), { plank: 0.16, gloss: 0.55, ...(s.wood ?? {}) }));
  mk(new PlaneGeometry(w, d, 1, 1).rotateY(Math.PI / 2).translate(-w / 2, h / 2, zc));
  mk(new PlaneGeometry(w, h, 1, 1).translate(0, h / 2, z0 - d)); mk(new PlaneGeometry(w, h, 1, 1).rotateY(Math.PI).translate(0, h / 2, z0));
  const win = new PlaneGeometry(d * 0.82, h * 0.52, 1, 1).rotateY(-Math.PI / 2).translate(w / 2 - 0.02, h * 0.58, zc);
  const rightWall = new PlaneGeometry(d, h, 1, 1).rotateY(-Math.PI / 2).translate(w / 2, h / 2, zc); mk(rightWall);
  const wp = new Mesh(win, glowMaterial(look, { col: s.glow ?? "#fff1d0", k: 2.2, cols: 7, rows: 2 })); g.add(wp);
  const ceil = new Mesh(new PlaneGeometry(w, d, 1, 1).rotateX(Math.PI / 2).translate(0, h, zc), plasterMaterial(look, { top: "#cfd0c4", low: "#cfd0c4", wainscot: 0 })); g.add(ceil);
  const board = new Mesh(new PlaneGeometry(w * 0.55, 1.2, 1, 1).translate(0, 1.7, z0 - d + 0.02), bgMaterial(look, { frag: GLOWPANE, uniforms: { uGl: { value: C("#2f4d44") }, uGlP: { value: new Vector4(0.08, 1, 1, 1) } } })); g.add(board);
  const [rows = 3, cols = 5] = s.desks ?? [3, 5], deskM = bgWood(ctx, look, new BoxGeometry(1, 1, 1), { plank: 0.12, gloss: 0.45 }).material;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = -w * 0.3 + r * (w * 0.55 / Math.max(1, rows - 1)), z = z0 - 3 - c * ((d - 5) / Math.max(1, cols - 1));
    const top = new Mesh(new BoxGeometry(0.7, 0.05, 0.5), deskM); top.position.set(x, 0.72, z);
    const leg = new Mesh(new BoxGeometry(0.62, 0.7, 0.04), deskM); leg.position.set(x, 0.35, z + 0.2); g.add(top, leg);
  }
  const n = Math.min(s.lamps ?? 2, 4);
  for (let i = 0; i < n; i++) {
    const p = new Vector3(0, h - 0.1, z0 - 2.5 - (i * (d - 5)) / Math.max(1, n - 1)); lamps.push(p);
    const strip = new Mesh(new BoxGeometry(w * 0.5, 0.05, 0.3), glowMaterial(look, { col: "#f4f8ff", k: 1.8 })); strip.position.copy(p); g.add(strip);
    look.pool(i, { at: [p.x, h - 0.8, p.z], col: s.lampCol ?? "#e8f0ff", r: d * 0.3, k: 0.6 });
  }
  return { group: g, lamps };
}

export function bgRoom(ctx, look, spec = {}) {
  const r = (spec.kind === "classroom" ? classroom : hall)(ctx, look, spec);
  return { ...r, dispose() { r.group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); } };
}
