// E4 CHALKBOARD (north wall). A painted green plate with a crimson banner stripe, dimmed formulas and no big "50";
// a live chalk layer on top that writes "S^2 | VR" in 21 frames, takes the green graph disc the sphere projects, and keeps
// a ghost "50" (8% alpha, lower right) after CHECKMATE (Easter egg 1).
//
// CUES (scene beats, else the bible's frames at 24 fps):
//   "chalk"    start of the S^2 | VR stroke                      f184 = 7.667 s, 21 frames = 0.875 s on twos
//   "ghost50"  the old exact-fifty returns as a ghost             f213 = 8.875 s, ramps in over 0.5 s
//   the graph disc runs f184 .. f193 (7.667 .. 8.042 s): 60 nodes, edges where |p_i - p_j| < 0.62 R_node, drawn inside a
//   3 m disc (stereographic image of the S^2 sample). It leaves on the white-flash cut at f193.
// CHALK LOOK: three jittered passes (alpha .55/.3/.2) with ragged reveal edge; the cutout shader keeps coverage >= 0.3.
import * as THREE from "three";
import { BoxGeometry, PlaneGeometry } from "three";
import { P, cel, canvasTex, texMat, beatT, F, smooth01 } from "./kit.js";

const BW = 7.2, BH = 3.04, CX = 0.3, CY = 1.7, CZ = -5.04;
const T_CHALK = F(184), T_DISC1 = F(193), T_GHOST = F(213);

export function buildBoard(ctx) {
  const stat = new THREE.Group(), anim = new THREE.Group(); anim.userData.layer = 1;
  const rng = ctx.rng(31);

  // ---- the painted plate (static) ----
  const base = canvasTex(1800, 760, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, P.board); gr.addColorStop(1, P.board2);
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    // chalk dust bands, rgba(255,255,255,0.07)
    c.fillStyle = "rgba(255,255,255,0.07)";
    for (let i = 0; i < 9; i++) { const y = 150 + i * 62 + ((i * 37) % 23); c.beginPath(); c.ellipse(w * (0.25 + 0.5 * ((i * 53) % 10) / 10), y, w * 0.34, 18 + (i % 3) * 7, -0.04, 0, 6.283); c.fill(); }
    // banner: crimson with a cream stripe (no words, show don't tell)
    c.fillStyle = P.red; c.fillRect(0, 0, w, 74);
    c.fillStyle = "#f6f1e3"; c.fillRect(0, 74, w, 12);
    // dimmed formulas
    c.fillStyle = "rgba(255,253,240,0.16)"; c.font = "italic 64px 'Segoe Print', 'Comic Sans MS', cursive"; c.textBaseline = "alphabetic";
    c.fillText("y = 2x + 6", 90, 190); c.fillText("3x - 4 = 11", 120, 275);
    c.fillStyle = "rgba(255,253,240,0.10)"; c.fillText("f(x) = x²", 1330, 205);
  });
  const plate = new THREE.Mesh(new PlaneGeometry(BW, BH), texMat(base.tex, { id: 0.5, gain: [0.95, 0.93, 0.88] }));
  plate.position.set(CX, CY, CZ); stat.add(plate);
  // frame (8 px -> 0.032 m) and chalk tray
  const fr = (w, h, x, y) => { const m = cel(ctx, new BoxGeometry(w, h, 0.07), P.boardFrame, "#8a6a3a", { line: 0.8 }); m.position.set(x, y, CZ + 0.012); stat.add(m); };
  fr(BW + 0.16, 0.08, CX, CY + BH / 2 + 0.04); fr(BW + 0.16, 0.08, CX, CY - BH / 2 - 0.04);
  fr(0.08, BH, CX - BW / 2 - 0.04, CY); fr(0.08, BH, CX + BW / 2 + 0.04, CY);
  const tray = cel(ctx, new BoxGeometry(BW * 0.7, 0.05, 0.14), "#6b3f22", "#3f2414", { line: 0.8 }); tray.position.set(CX, CY - BH / 2 - 0.1, CZ + 0.06); stat.add(tray);
  // two chalk stubs on the tray
  for (const dx of [-0.6, 0.2]) { const s = cel(ctx, new BoxGeometry(0.07, 0.02, 0.02), "#fffdf0", "#cfd4de", { line: 0.3 }); s.position.set(CX + dx, CY - BH / 2 - 0.065, CZ + 0.08); stat.add(s); }

  // ---- the live chalk layer ----
  const nodes = []; // stereographic sample of S^2 in the unit disc, deterministic
  for (let i = 0; i < 60; i++) { const a = rng() * 6.283, r = Math.sqrt(rng()) * 0.92; nodes.push([Math.cos(a) * r, Math.sin(a) * r]); }
  const edges = [];
  for (let i = 0; i < 60; i++) for (let j = i + 1; j < 60; j++) { const d = Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]); if (d < 0.34 && edges.length < 170) edges.push([i, j]); }

  const live = canvasTex(1800, 760, () => {});
  const lm = new THREE.Mesh(new PlaneGeometry(BW, BH), texMat(live.tex, { id: 0.5, cut: 0.3 }));
  lm.position.set(CX, CY, CZ + 0.008); anim.add(lm);

  const drawChalkText = (c, prog) => {
    const x0 = 70, y0 = 520;
    c.save(); c.beginPath(); c.rect(0, 0, x0 + prog * 760 + (Math.sin(prog * 40) * 8), 760); c.clip();   // ragged reveal front
    for (const [dx, dy, a] of [[0, 0, 0.55], [1.6, -1.2, 0.3], [-1.4, 1.5, 0.2]]) {
      c.fillStyle = `rgba(255,253,240,${a})`; c.font = "bold 190px 'Segoe Print', 'Comic Sans MS', cursive"; c.textBaseline = "alphabetic";
      c.fillText("S", x0 + dx, y0 + dy);
      c.font = "bold 110px 'Segoe Print', 'Comic Sans MS', cursive"; c.fillText("2", x0 + 128 + dx, y0 - 100 + dy);
      c.font = "bold 190px 'Segoe Print', 'Comic Sans MS', cursive"; c.fillText("|", x0 + 215 + dx, y0 + dy); c.fillText("VR", x0 + 300 + dx, y0 + dy);
    }
    c.restore();
  };
  const drawDisc = (c, a, grow) => {
    const cx = 1260, cy = 410, R = 375 * grow;                 // a 3 m disc = 375 px at 250 px/m
    c.save(); c.globalAlpha = a;
    c.strokeStyle = P.greenRim; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R, 0, 6.283); c.stroke();
    c.lineWidth = 2.5;
    for (const [i, j] of edges) { c.beginPath(); c.moveTo(cx + nodes[i][0] * R, cy + nodes[i][1] * R); c.lineTo(cx + nodes[j][0] * R, cy + nodes[j][1] * R); c.stroke(); }
    for (const n of nodes) {
      c.fillStyle = P.green; c.beginPath(); c.arc(cx + n[0] * R, cy + n[1] * R, 6.5, 0, 6.283); c.fill();
      c.fillStyle = "#f3fcf2"; c.beginPath(); c.arc(cx + n[0] * R, cy + n[1] * R, 4.2, 0, 6.283); c.fill();
    }
    c.restore();
  };
  const drawGhost = (c, a) => {
    c.save(); c.globalAlpha = a; c.fillStyle = "#fffdf0"; c.font = "bold 220px 'Segoe Print', 'Comic Sans MS', cursive"; c.textBaseline = "alphabetic";
    c.fillText("50", 1330, 690); c.strokeStyle = "#ff7b7b"; c.lineWidth = 8; c.beginPath(); c.ellipse(1440, 630, 150, 105, -0.05, 0, 6.283); c.stroke(); c.restore();
  };

  let key = "";
  const tChalk = beatT(ctx, "chalk", T_CHALK), tGhost = beatT(ctx, "ghost50", T_GHOST), tDisc1 = tChalk + (T_DISC1 - T_CHALK);
  const group = new THREE.Group(); group.add(stat, anim);
  return {
    group,
    update(ts) {
      const prog = Math.min(1, Math.max(0, (ts - tChalk) / 0.875));
      const disc = ts >= tChalk && ts < tDisc1 ? smooth01((ts - tChalk) / 0.2) : 0;
      const ghost = 0.08 * smooth01((ts - tGhost) / 0.5);
      const k = `${Math.round(prog * 21)}|${disc > 0 ? Math.round(disc * 8) : 0}|${Math.round(ghost * 100)}`;
      if (k === key || !live.g) return;
      key = k;
      const c = live.g;
      c.clearRect(0, 0, live.w, live.h);
      if (prog > 0) drawChalkText(c, prog);
      if (disc > 0) drawDisc(c, disc, 0.9 + 0.1 * disc);
      if (ghost > 0) drawGhost(c, ghost);
      live.tex.needsUpdate = true;
    },
  };
}
