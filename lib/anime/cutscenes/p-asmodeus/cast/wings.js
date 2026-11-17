// WINGS for p-asmodeus: Lucifer's two baked feather fans (open and folded), the asmWingFan tool, billboards behind his body.
import { Group, Vector2 } from "three";
import { loadPack } from "../../../tools/packs.js";

await loadPack("cuts");

const PAINT = /* glsl */ `
  vec4 paint(vec2 p) {
    vec3 c = asmWingFan(vec2(p.x / 2.0, p.y), 0.0);
    float a = step(0.02, distance(c, vec3(0.0706, 0.0471, 0.0784) * 1.4));
    return vec4(c, a);
  }`;

export function makeWings(ctx) {
  const group = new Group();
  const card = (open) => {
    const m = ctx.bake.card(PAINT, {
      w: 1024, h: 512, size: [2.4, 1.2], billboard: true, tools: ["asmWingFan"], layer: 1, id: 1,
      uniforms: { uAsmShoulder: { value: new Vector2(0.5, 0.5) }, uAsmWingOpen: { value: open ? 1 : 0 } },
    });
    group.add(m);
    return m;
  };
  const cards = { open: card(true), folded: card(false) };
  group.position.set(0, 0.42, -0.10);
  return {
    group,
    open(on) { cards.open.visible = on; cards.folded.visible = !on; },
    dispose() { for (const c of Object.values(cards)) c.userData.dispose(); group.removeFromParent(); },
  };
}
