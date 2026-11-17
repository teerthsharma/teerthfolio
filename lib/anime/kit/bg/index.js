// THE BACKGROUND KIT: the front door. A cutscene's world calls these, one line per element, and the frame fills from far to near.
//   import { bg } from "../../kit/bg/index.js";           (docs: lib/anime/cutscenes/CONTRACT.md "Backgrounds", docs/BACKGROUNDS.md)
//   const look = bg.look(ctx, { light, shade, haze, rim, pools, base, amb, bands });      the one light every piece shares
//   group.add(bg.sky(ctx, "dusk", { az: [-1.2, 1.2] }));                                  day dusk night storm void domain
//   const city = bg.city(ctx, look, { avenue, paint });  group.add(city.group);          facades with windows, signs, pipes, grime
//   group.add(bg.ground(ctx, look, { kind: "asphalt", road: { half: 10.5, zebra: [-4, 4] } }));   asphalt grass sand snow paving
//   group.add(bg.water(ctx, look, {}));    group.add(bg.stone(ctx, look, geo, {}));    group.add(bg.wood(ctx, look, geo, {}));
//   const room = bg.room(ctx, look, { kind: "hall" | "classroom" });                      painted interior with pools of light
//   group.add(bg.rank(ctx, look, "skyline", { k: 0.6, at: [0, 20, -140], size: [320, 60] }));   far rows that pale into the haze; crowd pines rooftops mountains ruins
//   const fg = bg.foreground(ctx, look, [{ shot: 3, kind: "leaves", side: "tl" }]);        frames named shots; call fg.update(t, dt, cue)
//   bg.paintOver(group, look, {});                                                         repaint an existing set without touching its geometry
//   await bg.pick("sky")  /  await bg.shader(name)                                          the 2,004-shader table, searched by need, loaded by name
import { bgLook } from "./look.js";
import { bgSky, SKY_PRESETS } from "./sky.js";
import { bgCity, facadeMaterial, layout, CITY_PAINT } from "./city.js";
import { bgGround, bgWater, bgStone, bgWood, groundMaterial, stoneMaterial } from "./ground.js";
import { bgRoom } from "./interior.js";
import { bgCard, bgRank, CARD_KINDS } from "./cards.js";
import { bgForeground, shotPose } from "./foreground.js";
import { bgPaintOver } from "./paintover.js";
import { bgAir } from "./air.js";
import { bgMaterial, inkable } from "./material.js";
import { pick, shader } from "./pick.js";
import { bgApply, bgSpec, BG_PRESETS } from "./presets.js";

export const bg = {
  look: bgLook, sky: bgSky, city: bgCity, ground: bgGround, water: bgWater, stone: bgStone, wood: bgWood, room: bgRoom,
  card: bgCard, rank: bgRank, air: bgAir, foreground: bgForeground, paintOver: bgPaintOver, apply: bgApply, spec: bgSpec, PRESETS: BG_PRESETS, pick, shader,
  material: bgMaterial, inkable, facade: facadeMaterial, groundMaterial, stoneMaterial, layout, shotPose,
  SKY_PRESETS, CARD_KINDS, CITY_PAINT,
};
export default bg;
