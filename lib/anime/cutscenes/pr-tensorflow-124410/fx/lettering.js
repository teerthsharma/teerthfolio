// FX LETTERING: the live's ゴゴゴゴ brush glyphs in the palette's coral, piled either side of the seal from 1.5 s. No slab; the ink sits behind the fill.
import { Group, Matrix4, Quaternion, Vector3 } from "three";
import { glyphs } from "../live/glyphs.js";
import { hash, R } from "../live/ink.js";
import { araki } from "../live/shared.js";
import { FREEZE, GLYPH, K, smooth } from "../clock.js";
import { STAND } from "../shots.js";

const N = 30, FADE = [8.15, 8.65];

export function makeLetters(ctx) {
  const U = araki(ctx).U, { ink, fill } = glyphs(U, N, R.coral), group = new Group();
  const M = new Matrix4(), Q = new Quaternion(), P = new Vector3(), Sc = new Vector3();
  // the ink is set back in depth so the coral fill wins where they overlap (no z-fight)
  const put = (i, x, y, s) => {
    Sc.set(s, s, s);
    P.set(x, y, -0.04 * s); M.compose(P, Q, Sc); ink.setMatrixAt(i, M);
    P.set(x, y, 0); M.compose(P, Q, Sc); fill.setMatrixAt(i, M);
  };
  ink.material.polygonOffset = true; ink.material.polygonOffsetFactor = 2; ink.material.polygonOffsetUnits = 2;
  group.add(ink, fill);
  group.userData.layer = 1;
  return {
    group,
    update(t) {
      const fade = 1 - smooth(FADE[0], FADE[1], t), pulse = 1 + 0.28 * (Math.floor(t * 12 + 1e-6) % 2);
      const [sx, , sz] = STAND.a[0];
      group.position.set(t < FREEZE[0] ? sx : 0, 0, t < FREEZE[0] ? sz : 0); // the glyphs follow the DIO seal's seat while it is off the dock
      for (let i = 0; i < N; i++) {
        const age = t - (GLYPH.born[0] + (GLYPH.born[1] - GLYPH.born[0]) * hash(i, 3)), side = i % 2 ? 1 : -1;
        if (age < 0 || fade <= 0) { put(i, 0, 0, 0); continue; }
        const reach = GLYPH.reach[0] + (GLYPH.reach[1] - GLYPH.reach[0]) * hash(i, 4);
        put(i, side * reach * K, 0.1 + 0.9 * hash(i, 5) + Math.min(age, 0.6) * 0.8, GLYPH.scale * K * pulse * fade);
      }
      ink.instanceMatrix.needsUpdate = fill.instanceMatrix.needsUpdate = true;
    },
    dispose() { for (const m of [ink, fill]) { m.geometry.dispose(); m.material.dispose(); } },
  };
}
