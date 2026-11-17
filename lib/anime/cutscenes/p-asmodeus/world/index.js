// WORLD for p-asmodeus: the one screen-space plate (layer 0, re-baked every drawing), driven by the clock and the layout rows.
import { loadPack } from "../../../tools/packs.js";
import { uniformsFor } from "../../../tools/index.js";
import { lampOn, moteQ } from "../clock.js";
import { layout } from "../layout.js";
import { BODY, NAMES } from "./plate.js";

await loadPack("cuts");

const modeOf = (t) => (t < 1 - 1e-6 ? 0 : t < 2 - 1e-6 ? 1 : 2);
const auraQ = (t) => (t < 6.5 ? 0 : moteQ(t) * (t < 8.5 ? 1 : 1 - Math.min(1, Math.max(0, (t - 8.5) / 1.6))));

export default function build(ctx) {
  const { THREE } = ctx, group = new THREE.Group();
  const U = { ...uniformsFor(NAMES), uT: { value: 0 }, uMode: { value: 0 } };
  const quad = ctx.bake.plateLayer(BODY, { tools: NAMES, uniforms: U, id: 0.5 });
  group.add(quad);
  const f = (k, x) => { U[k].value = x; };
  const v2 = (k, x, y) => { U[k].value.x = x; U[k].value.y = y; };

  return {
    group,
    update(t) {
      const L = layout(t), hh = L.hero.hh;
      f("uT", t); f("uMode", modeOf(t)); f("uAsmLamp", lampOn(t)); f("uAsmOut", t >= 8.5 - 1e-6 ? 1 : 0); f("uAsmQ", auraQ(t));
      v2("uAsmChest", L.chest.u, L.chest.up); v2("uAsmHero", L.chest.u, L.chest.up); v2("uAsmHeroR", 0.34 * hh, 0.5 * hh);
      v2("uAsmHeroP", L.feet.u, L.feet.up); v2("uAsmGateC", L.hero.u, L.chest.up);
    },
    dispose() { quad.geometry.dispose(); quad.material.dispose(); },
  };
}
