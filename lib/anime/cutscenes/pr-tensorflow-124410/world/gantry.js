// THE CONTROL-EDGE GANTRY (layer 1: the edges move). Four edges strung between the two pylons (layer 0, dam.js): three
// MINT edges (#3de0b0) at y 3.2 / 4.8 / 6.4, and one CORAL edge (#f45e50) at y 8.4, the fourth, the redundant one. The coral
// edge is built as three pieces (36% / 34% / 30% of the 22 m beam) laid end to end, so the crack is a real split:
//   tremble   from muda - 0.9 s the coral edge shivers on twos: offset 0.05 m * smooth ramp * hash(step) (x and y)
//   fissures  uCrack 0 -> 1 across [crack, crack + 1 s]: the shader draws two jagged ink fissures at the future joints (uCut)
//             that widen (half-width 0.02 + 0.09 uCrack) plus hairline cracks
//   split     at crack + 1 s the three pieces part: a sag with a small tilt each, they HANG (the stopped second)
//   fall      from `resume` piece i drops after 0.1 i s: y = y0 - g tau^2 / 2 (g = 36), spinning, drifting sideways; at the
//             water line (hit time, also what the reservoir uses for its rings) it sinks on at 5 m/s and is hidden under -9
//   glow      the mint edges glow (emission 0.04 -> 0.2 of their own colour, never above the bloom threshold), brightening
//             after the resume (the three that remain), pulsing on twos
// The world clock is HELD through the stopped second: coral time tc = stop while t is inside [stop, resume).
import { Color, Group } from "three";
import { L, hash1, pieceCentres } from "./layout.js";
import { Parts, disposeTree, inked } from "./geo.js";

const MINT = "#3de0b0", CORAL = "#f45e50", RIB = "#a89cc0";
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lin = (hex) => { const c = new Color(hex); return [c.r, c.g, c.b]; };

function beam(w, color) {
  const p = new Parts();
  p.box(w, 0.5, 0.5, color);
  for (let x = -w / 2 + 1.6; x < w / 2 - 1; x += 3.2) p.box(0.34, 0.66, 0.66, RIB, { x });  // spacer collars along the edge
  return p.build();
}

export function buildGantry(U, T) {
  const g = new Group(); g.name = "gantry";
  const mints = L.MINT_Y.map((y) => {
    const m = inked(beam(L.EDGE_LEN - 0.6, MINT), U, { tint: 0, px: 3 });
    m.position.set(0, y, L.PYL.z);
    g.add(m); return m;
  });
  const pcs = pieceCentres().map((c, i) => {
    const pivot = new Group();
    const m = inked(beam(c.w, CORAL), U, { tint: 0, px: 3 });
    const u = m.userData.fill.material.uniforms;
    u.uPieceX.value = c.x; u.uCut.value.set(pieceCentres()[1].x0, pieceCentres()[2].x0);
    pivot.add(m); pivot.position.set(c.x, L.CORAL_Y, L.PYL.z);
    g.add(pivot); return { pivot, u, c, fill: m.userData.fill };
  });
  const mintLin = lin(MINT), coralLin = lin(CORAL);
  const mintMats = mints.map((m) => m.userData.fill.material.uniforms.uEmit.value);

  // the water's drop events (landing x, z, time): from the same law as the fall
  const events = T.pieces.map((p, i) => {
    const tau = p.hit - p.t0;
    return { t: p.hit, x: p.x + (i - 1) * tau * 1.2, z: L.PYL.z };
  });

  function update(t) {
    const tc = t >= T.stop && t < T.resume ? T.stop : t;
    // mint glow: dim from the first beat of the gantry (1.5 s), up after the resume
    const ramp = sm((tc - 1.5) / 1.2), after = sm((tc - (T.resume + 0.2)) / 0.6);
    const pulse = 0.5 + 0.5 * Math.sin(Math.floor(tc * 12) * 0.9);
    const gk = (0.04 + 0.05 * ramp) * (1 - after) + (0.14 + 0.06 * pulse) * after;
    for (const e of mintMats) e.set(mintLin[0] * gk, mintLin[1] * gk, mintLin[2] * gk);
    // coral
    const tr = sm((tc - (T.muda - 0.9)) / 0.9), ck = sm((tc - T.crack) / (T.crackDone - T.crack));
    const st = Math.floor(tc * 12);
    const jx = (hash1(st * 1.7) - 0.5) * 2 * 0.05 * tr * (tc < T.resume ? 1 : 0), jy = (hash1(st * 2.9 + 4) - 0.5) * 2 * 0.05 * tr * (tc < T.resume ? 1 : 0);
    const split = sm((tc - T.crackDone) / 0.25);
    const gc = (0.05 + 0.1 * ck) * (tc < T.resume ? 1 : 0.4);
    pcs.forEach((p, i) => {
      const cx = p.c.x, pv = p.pivot, spec = T.pieces[i];
      p.u.uCrack.value = ck;
      p.u.uEmit.value.set(coralLin[0] * gc * 0.5, coralLin[1] * gc, coralLin[2] * gc);
      let x = cx + jx, y = L.CORAL_Y + jy, rz = 0, rx = 0, vis = true;
      // the split: the pieces part and hang
      const sag = [0.06, -0.05, 0.08][i] * split;
      y += sag; rz += [0.05, 0.0, -0.06][i] * split; x += (i - 1) * 0.12 * split;
      if (tc >= spec.t0) {
        const tau = tc - spec.t0, drop = 0.5 * T.G * tau * tau, hitTau = spec.hit - spec.t0;
        const dir = (i - 1) || 0.7;
        if (tau <= hitTau) { y = L.CORAL_Y + sag - drop; x += dir * tau * 1.2; rz += (i % 2 ? -1 : 1) * tau * (1.8 + 0.9 * i); rx += tau * 1.1; }
        else { const s = tau - hitTau; y = L.WATER_Y - s * 5; x += dir * hitTau * 1.2; rz += (i % 2 ? -1 : 1) * hitTau * (1.8 + 0.9 * i) * 0.6; rx += hitTau * 1.1; vis = y > -9; }
      }
      pv.visible = vis;
      pv.position.set(x, y, L.PYL.z); pv.rotation.set(rx, 0, rz);
    });
  }
  return { group: g, update, events, dispose: () => disposeTree(g) };
}
