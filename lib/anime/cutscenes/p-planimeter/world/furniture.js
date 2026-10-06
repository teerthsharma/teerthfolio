// E5 DESKS, CHAIRS, PROPS (+ Easter egg 8). The hero's desk and backless stool, six side desks with low chairs, the
// Reviewer's desk with the black chess king, the printed PR sheet and the buried "50" sheet, books, pencil case, and the
// pencil that is set down at f149 and rolls 0.15 m (f152 .. f166, animated, layer 1).
//
// SCALES (bible E5): hero desk 2.5 x 1.5 m, top 1.07 m above the floor (0.14 above the seal's seat, seat 0.93 above the floor);
// side desks 1.7 x 1.1 m, top 0.5; class chairs are the hero chair x 0.7 (seat 0.43). The hero chair is a STOOL (no back):
// a backrest would stand between the home-shot lens and the seal.
//
// PENCIL ROLL: the pencil lies along x; rolling toward +z by d = 0.15 smooth(k), k = (ts - f152/24) / (14/24),
//   the roll angle about its own axis is d / r (r = 0.012 m), so it turns as a real cylinder would.
import * as THREE from "three";
import { BoxGeometry, ConeGeometry, CylinderGeometry, LatheGeometry, PlaneGeometry } from "three";
import { P, cel, canvasTex, texMat, beatT, F, smooth01, hash } from "./kit.js";

export function buildFurniture(ctx) {
  const stat = new THREE.Group(), anim = new THREE.Group(); anim.userData.layer = 1;
  const add = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; stat.add(m); return m; };

  const desk = (x, z, w, d, top, lipSide) => {
    add(cel(ctx, new BoxGeometry(w, 0.045, d), P.desk, P.deskShade), x, top - 0.0225, z);
    add(cel(ctx, new BoxGeometry(w - 0.12, 0.09, d - 0.12), "#c28a50", "#7a4a40", { line: 0.6 }), x, top - 0.09, z);   // apron
    add(cel(ctx, new BoxGeometry(w + 0.02, 0.055, 0.035), P.red, "#7a1620", { line: 0.7 }), x, top - 0.027, z + lipSide * (d / 2 + 0.005)); // red lip
    const lw = top * 0.0 + 0.04;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      add(cel(ctx, new CylinderGeometry(lw * 0.9, lw, top - 0.045, 8), P.leg, P.legShade, { line: 0.7 }), x + sx * (w / 2 - 0.1), (top - 0.045) / 2, z + sz * (d / 2 - 0.1));
    }
  };
  const chair = (x, z, s, face) => {                    // seat 0.62 s high, 0.5 s square; a low back on the far side when s < 1
    const seat = 0.62 * s, w = 0.5 * s;
    add(cel(ctx, new BoxGeometry(w, 0.05 * s + 0.01, w), "#c98f52", "#8a5a4a"), x, seat - 0.045, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      add(cel(ctx, new CylinderGeometry(0.022 * s + 0.006, 0.026 * s + 0.006, seat - 0.05, 6), P.leg, P.legShade, { line: 0.6 }), x + sx * (w / 2 - 0.05), (seat - 0.05) / 2, z + sz * (w / 2 - 0.05));
    if (face) add(cel(ctx, new BoxGeometry(w, 0.28 * s, 0.035), "#c98f52", "#8a5a4a", { line: 0.7 }), x, seat + 0.14 * s, z + face * (w / 2 - 0.02));
  };

  // hero desk (centre x .15, z 1.5) and the stool the seal sits on (seat top = the seal's y 0 -> room y 0.93)
  desk(0.15, 1.5, 2.5, 1.5, 1.07, -1);
  { // the stool is 0.93 high: scale 1.5 of the base chair, no back
    const s = 1.5;
    chair(0, -0.02, s, 0);
  }
  // six side desks, students face the board (north, -z); the chairs sit on their south side
  for (const x of [-3.5, 3.5]) for (const z of [-2.2, 2.6, 6.0]) { desk(x, z, 1.7, 1.1, 0.5, 1); chair(x, z + 0.95, 0.7, 1); }

  // ---- the Reviewer's desk with the black king (EASTER EGG 8) ----
  desk(4.75, -4.2, 1.5, 0.75, 0.75, 1);
  {
    const prof = [[0.0, 0], [0.085, 0], [0.09, 0.015], [0.06, 0.04], [0.045, 0.1], [0.07, 0.125], [0.052, 0.16], [0.05, 0.19], [0.062, 0.2], [0.0, 0.205]].map(([r, y]) => new THREE.Vector2(r, y));
    const king = cel(ctx, new LatheGeometry(prof, 18), "#16122c", "#0a081c", { line: 0.8 });
    add(king, 4.95, 0.75, -4.2);
    add(cel(ctx, new BoxGeometry(0.02, 0.07, 0.02), "#16122c", "#0a081c", { line: 0.6 }), 4.95, 0.75 + 0.24, -4.2);
    add(cel(ctx, new BoxGeometry(0.06, 0.02, 0.02), "#16122c", "#0a081c", { line: 0.6 }), 4.95, 0.75 + 0.245, -4.2);
    add(cel(ctx, new CylinderGeometry(0.0905, 0.0905, 0.006, 18), "#ffeec8", "#d9c8a0", { line: 0 }), 4.95, 0.75 + 0.004, -4.2);  // the #ffeec8 foot rim
  }

  // ---- things on the hero desk (top y 1.07) ----
  const TOP = 1.07;
  // the printed PR sheet: header "mujoco #3396", grey scribble, a green tick
  const paper = canvasTex(640, 832, (c, w, h) => {
    c.fillStyle = "#fbf8ee"; c.fillRect(0, 0, w, h);
    c.fillStyle = P.red; c.fillRect(0, 0, w, 96);
    c.fillStyle = "#fbf8ee"; c.font = "bold 54px 'Segoe UI', Arial, sans-serif"; c.textBaseline = "middle"; c.fillText("mujoco #3396", 34, 50);
    c.strokeStyle = "rgba(120,130,150,0.16)"; c.lineWidth = 2;
    for (let y = 150; y < h - 90; y += 44) { c.beginPath(); c.moveTo(24, y); c.lineTo(w - 24, y); c.stroke(); }
    c.strokeStyle = "#8d94a4"; c.lineWidth = 7; c.lineCap = "round";
    const lines = [[60, 190, 360], [100, 260, 500], [100, 330, 420], [60, 420, 300]];       // three lines of code-like scribble
    for (const [x, y, l] of lines) { let cx = x; while (cx < x + l) { const seg = 22 + hash(cx, y) * 60; c.beginPath(); c.moveTo(cx, y); c.lineTo(Math.min(x + l, cx + seg), y); c.stroke(); cx += seg + 16; } }
    c.strokeStyle = "#2fa86a"; c.lineWidth = 16; c.lineJoin = "round";                      // the green tick #2fa86a
    c.beginPath(); c.moveTo(w - 210, h - 210); c.lineTo(w - 160, h - 150); c.lineTo(w - 70, h - 280); c.stroke();
  });
  const sheet = new THREE.Mesh(new PlaneGeometry(0.9, 1.17).rotateX(-Math.PI / 2), texMat(paper.tex, { id: 0.5, gain: [1.0, 0.96, 0.88] }));
  sheet.position.set(0.25, TOP + 0.018, 1.62); stat.add(sheet);
  // the second sheet underneath: the old red "50" (Easter egg 1, the first half of the gag)
  const old = canvasTex(640, 832, (c, w, h) => {
    c.fillStyle = "#fbf8ee"; c.fillRect(0, 0, w, h);
    c.fillStyle = P.red; c.fillRect(0, 0, w, 96);
    c.strokeStyle = "#e23b3b"; c.lineWidth = 14; c.beginPath(); c.ellipse(w / 2, h / 2, 200, 150, -0.08, 0, 6.283); c.stroke();
    c.fillStyle = "#e23b3b"; c.font = "bold 230px 'Segoe Print', 'Comic Sans MS', cursive"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("50", w / 2, h / 2 + 8);
  });
  const sheet2 = new THREE.Mesh(new PlaneGeometry(0.9, 1.17).rotateX(-Math.PI / 2), texMat(old.tex, { id: 0.5, gain: [1.0, 0.96, 0.88] }));
  sheet2.position.set(0.36, TOP + 0.011, 1.72); sheet2.rotation.y = 0.14; stat.add(sheet2);

  // textbooks: a stack of five, left of the paper
  const BOOKS = [["#c62f3a", "#8a1e28"], ["#2f5fa8", "#1f3f78"], ["#f2e6c4", "#c9b98e"], ["#2f8f6a", "#1f5f48"], ["#e9a62c", "#a9751c"]];
  BOOKS.forEach(([c, s], i) => add(cel(ctx, new BoxGeometry(0.5, 0.065, 0.36), c, s, { line: 0.8 }), -0.82 + (hash(i, 2) - 0.5) * 0.06, TOP + 0.0325 + i * 0.066, 1.45 + (hash(i, 5) - 0.5) * 0.05, (hash(i, 9) - 0.5) * 0.3));
  // the pencil case, right-front
  add(cel(ctx, new BoxGeometry(0.46, 0.07, 0.16), "#2f5fa8", "#1f3f78", { line: 0.8 }), 1.05, TOP + 0.035, 1.98, 0.12);
  add(cel(ctx, new BoxGeometry(0.46, 0.012, 0.012), "#e6e9f2", "#a9b0c4", { line: 0 }), 1.05, TOP + 0.072, 1.98, 0.12);   // zip

  // ---- the pencil: barrel #e9a62c, tip #1a1323, appears at f149-f152 and rolls ----
  const pencil = new THREE.Group();
  const barrel = cel(ctx, new CylinderGeometry(0.012, 0.012, 0.2, 6), "#e9a62c", "#a9751c", { line: 0.5 }); barrel.rotation.z = Math.PI / 2;
  const tip = cel(ctx, new ConeGeometry(0.012, 0.035, 6), "#f2e6c4", "#c9b98e", { line: 0.4 }); tip.rotation.z = Math.PI / 2; tip.position.x = -0.1175;
  const lead = cel(ctx, new ConeGeometry(0.0055, 0.014, 6), "#1a1323", "#07040c", { line: 0 }); lead.rotation.z = Math.PI / 2; lead.position.x = -0.1405;
  const ers = cel(ctx, new CylinderGeometry(0.0125, 0.0125, 0.02, 6), "#d86a7a", "#a8404f", { line: 0.4 }); ers.rotation.z = Math.PI / 2; ers.position.x = 0.11;
  const spin = new THREE.Group(); spin.add(barrel, tip, lead, ers); pencil.add(spin); anim.add(pencil);
  const tSet = beatT(ctx, "pencil", F(149)) + 3 / 24, tRoll = beatT(ctx, "pencil", F(149)) + 3 / 24, DUR = 14 / 24;

  const group = new THREE.Group(); group.add(stat, anim);
  return {
    group,
    update(ts) {
      pencil.visible = ts >= tSet;
      const k = smooth01((ts - tRoll) / DUR), d = 0.15 * k;
      pencil.position.set(0.95, TOP + 0.013, 1.0 + d);
      spin.rotation.x = d / 0.012;
    },
  };
}
