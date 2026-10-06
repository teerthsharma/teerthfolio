// FTG STREAKS AND SCRIPT (bible FX 3) + `seal-script-glow` (S, local). Additive, ONES (24 fps) for the flashes.
// Throw trails: three yellow hair-lines seal -> kunai over 8 frames each (t = tThrow + 0.5 i).
// Flash i (tFtg + 0.21 i): the seal appears at kunai K_i. For 3 frames (1/8 s): a streak cylinder K_{i-1} -> K_i (K_-1 = seal chest)
//   width w(f) = w0 (1 - f/3), core #fdf8e0 over an outer #ffd54a sheath; a cream flash sprite; the pale-blue sealing array
//   (glyph atlas, rotating a = 2.1 t) scaling 0.5->1.5 and fading over 8 frames, alpha flickered by hash(frame) on ones.
// Kunai wall: a big faint glyph field behind the fox during shot 4 (target frame 3: script on a dark wall).
// Streak orientation: unit cylinder along +Y, quaternion = setFromUnitVectors(Y, dir), scale (w, len, w).
import { ph, startOf, glowTex, glyphTex, spriteMat, addMat, disposeTree } from "./util.js";

export default function build(ctx, S) {
  const { THREE } = ctx, g = new THREE.Group(), rng = ctx.rng("pyrefly-ftg");
  const glyph = glyphTex(THREE, rng), gl = glowTex(THREE, 1.5);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const Y = new THREE.Vector3(0, 1, 0);
  const mk = (col, op = 0) => new THREE.Mesh(cyl, addMat(THREE, { color: col, opacity: op }));
  const trails = [0, 1, 2].map(() => { const m = mk(0xffd54a); m.visible = false; g.add(m); return m; });
  const streaks = [0, 1, 2].map(() => ({ core: mk(0xfdf8e0), sheath: mk(0xffd54a) }));
  streaks.forEach((s) => { s.core.visible = s.sheath.visible = false; g.add(s.core, s.sheath); });
  const arrays = [0, 1, 2].map(() => { const s = new THREE.Sprite(spriteMat(THREE, glyph, { color: 0xcfe6f8, opacity: 0 })); g.add(s); return s; });
  const flashes = [0, 1, 2].map(() => { const s = new THREE.Sprite(spriteMat(THREE, gl, { color: 0xfdf8e0, opacity: 0 })); g.add(s); return s; });
  const wall = new THREE.Sprite(spriteMat(THREE, glyph, { color: 0xcfe6f8, opacity: 0 })); wall.scale.setScalar(34); g.add(wall);
  const wall2 = new THREE.Sprite(spriteMat(THREE, glyph, { color: 0x9fcaf0, opacity: 0 })); wall2.scale.setScalar(22); g.add(wall2);
  const field = new THREE.Sprite(spriteMat(THREE, gl, { color: 0xfdf8e0, opacity: 0 })); field.scale.setScalar(70); g.add(field);

  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const bar = (m, a, b, w) => {
    const d = b.clone().sub(a), len = d.length(); if (len < 1e-4) { m.visible = false; return; }
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Y, d.multiplyScalar(1 / len)); m.scale.set(w, len, w); m.visible = true;
  };
  const sealP = new THREE.Vector3(), prev = new THREE.Vector3();

  return {
    group: g,
    update(t, dt, cue) {
      const t24 = Math.floor(cue.t * 24 + 1e-6) / 24; // ones
      sealP.copy(S.chest());
      const th = startOf(cue, "throw", 5.6), f0 = startOf(cue, "ftg", 7.21);
      for (let i = 0; i < 3; i++) { // throw trails, 8 frames each
        const a = th + 0.5 * i, k = ph(t24, a, a + 8 / 24), m = trails[i];
        if (k <= 0 || k >= 1) { m.visible = false; continue; }
        const head = sealP.clone().lerp(S.K[i], k), tail = sealP.clone().lerp(S.K[i], Math.max(0, k - 0.45));
        bar(m, tail, head, 0.07 * (1 - k * 0.4)); m.material.opacity = 0.9;
      }
      let flashOn = 0;
      for (let i = 0; i < 3; i++) {
        const a = f0 + 0.21 * i, f = (t24 - a) * 24, s = streaks[i], ar = arrays[i], fl = flashes[i];
        prev.copy(i ? S.K[i - 1] : sealP);
        const live = f >= -0.01 && f < 3;
        if (live) {
          const w = 0.32 * (1 - f / 3) + 0.04; bar(s.sheath, prev, S.K[i], w * 1.7); bar(s.core, prev, S.K[i], w * 0.7);
          s.sheath.material.opacity = 0.7; s.core.material.opacity = 1; flashOn = Math.max(flashOn, 1 - f / 3);
        } else s.core.visible = s.sheath.visible = false;
        const ak = f / 8; // 0..1 across 8 frames
        if (f >= 0 && ak < 1) {
          const sz = 5 + 9 * ak, flick = 0.55 + 0.45 * hash(Math.floor(t24 * 24) + i * 17);
          ar.position.copy(S.K[i]); ar.scale.setScalar(sz); ar.material.rotation = 2.1 * t24; ar.material.opacity = (1 - ak) * flick * 0.9;
          fl.position.copy(S.K[i]); fl.scale.setScalar(6 + 10 * (1 - Math.min(1, f / 3))); fl.material.opacity = f < 3 ? 0.95 * (1 - f / 4) : 0.3 * (1 - ak);
        } else { ar.material.opacity = 0; fl.material.opacity = 0; }
      }
      // the wall of script behind the fox, flickering on ones across shot 4 and fading as the chain starts
      const wk = ph(t24, f0 - 0.05, f0 + 0.1) * (1 - ph(t24, f0 + 0.7, f0 + 1.2)), fl = 0.6 + 0.4 * hash(Math.floor(t24 * 24));
      const wp = S.F.clone().addScaledVector(S.toSeal, -4); wp.y += 7;
      wall.position.copy(wp); wall.material.rotation = 0.3 * t24; wall.material.opacity = 0.5 * wk * fl;
      wall2.position.copy(wp).addScaledVector(S.toSeal, 6); wall2.position.y += 1; wall2.material.rotation = -0.5 * t24; wall2.material.opacity = 0.35 * wk * (1.2 - fl);
      field.position.copy(wp).addScaledVector(S.toSeal, 18); field.material.opacity = 0.22 * flashOn;
    },
    dispose() { glyph.dispose(); gl.dispose(); cyl.dispose(); disposeTree(g); },
  };
}
