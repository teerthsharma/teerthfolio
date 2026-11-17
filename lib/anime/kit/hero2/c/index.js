// hero2/c: the seal as a character. buildFigure(engine, look, { expr }) -> { group, stats, dispose }. The neutral head, jacket frame and hands
// are fixed; a look (looks/*.js) is data: fur colours, eye colour and count, hair tones, marks, teeth, outfit colours, skin.
import { Group } from "three";
import { polygonize } from "../../../sdf.js";
import { faceDetail, whiskerDetail } from "./face.js";
import { cloth, hand } from "./figure.js";
import { hairBlades, hairCap } from "./hair.js";
import { headPrims } from "./head.js";
import { EXPRESSIONS } from "./proportions.js";
import { merge, sampler } from "./surface.js";

export { EXPRESSIONS };
const tierK = (t = 3) => (t >= 3 ? 1 : t === 2 ? 1.6 : 2.6);

export function buildFigure(engine, look, o = {}) {
  const ex = EXPRESSIONS[o.expr] ?? EXPRESSIONS.grin, k = tierK(engine.tier), group = new Group(), geos = [];
  const add = (geo, opt = {}) => { if (!geo) return; geos.push(geo); group.add(engine.figure(geo, opt)); };
  const prims = headPrims(look.fur, ex), S = sampler(prims);
  add(polygonize(prims, 0.0038 * k));
  add(merge([polygonize(hairCap(look.hair), 0.006 * k), hairBlades(look.hair)]), { lineMul: 0.8 });
  add(faceDetail(S, look, ex), { lineMul: 0.3 });
  add(whiskerDetail(S, look), { lineMul: 0.12 });
  add(cloth(look.outfit, k));
  const H = look.hands, p = look.pose ?? {};
  for (const side of [1, -1]) add(hand(H, side, p.tilt ?? 0.46, p.roll ?? 0.85, [0.1, -0.285, 0.19 + (side < 0 ? 0.035 : 0)], k));
  let tris = 0; for (const g of geos) tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  return { group, stats: { figures: geos.length, tris }, dispose() { for (const g of geos) g.dispose(); } };
}
