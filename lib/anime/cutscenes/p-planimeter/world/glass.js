// The world past the west windows: four painted depths (rooftops, far trees, pale hills, the bough) baked once from the bg pack, and the
// pink blossom on the bough, which sways 0.05 m on twos (layer 1). The cards stand west of the wall and face the room.
import { Group, Mesh } from "three";
import { loadPack } from "../../../tools/packs.js";
import { Mesher } from "../live/room.js";
import { flatVertexMaterial } from "./paint.js";

await loadPack("bg");

const CARDS = [
  { tool: "bgCardRooftops", tint: [0.34, 0.24, 0.52], mix: 0.6, pos: [-40, 1.2, 2.0], size: [120, 14] },
  { tool: "bgCardLeaves", tint: [1.0, 0.66, 0.8], mix: 0.8, pos: [-70, 2.5, 0], size: [160, 20] },
  { tool: "bgCardBranch", tint: [0.34, 0.2, 0.18], mix: 0.6, pos: [-9.5, 4.6, 0.6], size: [26, 6] },
  { tool: "bgCardMountains", tint: [0.74, 0.66, 0.93], mix: 0.7, pos: [-110, 3.0, 0], size: [200, 22] },
];
const BLOSSOM = ["#ffb4c8", "#ffe3ea"];
const hash = (i, k) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function buildOutside(ctx) {
  const group = new Group();
  const cards = CARDS.map((c) => {
    const body = `vec4 paint(vec2 p) { vec4 c = ${c.tool}(p); c.rgb = mix(c.rgb, vec3(${c.tint.join(", ")}), ${c.mix}); return c; }`;
    const w = 1536;
    const h = Math.round((w * c.size[1]) / c.size[0]);
    const card = ctx.bake.card(body, { tools: [c.tool], w, h, size: c.size, id: 0.99 });
    card.position.set(...c.pos);
    card.rotation.y = Math.PI / 2;
    group.add(card);
    return card;
  });

  const m = new Mesher();
  for (let i = 0; i < 40; i++) {
    const x = -10.2 + 1.4 * hash(i, 1);
    const y = 3.7 + 1.6 * hash(i, 2);
    const z = -5 + 12 * hash(i, 3);
    const r = 0.18 + 0.12 * hash(i, 4);
    m.sph(x, y, z, r, r, r, BLOSSOM[i % 2]);
  }
  const blossom = new Mesh(m.build(), flatVertexMaterial());
  blossom.frustumCulled = false;
  blossom.userData.layer = 1;
  group.add(blossom);

  const step = (S) => {
    const tt = Math.floor(S * 12) / 12;
    blossom.position.x = 0.05 * Math.sin(tt * 1.1);
  };
  const dispose = () => {
    for (const c of cards) c.userData.dispose?.();
    blossom.geometry.dispose();
    blossom.material.dispose();
  };
  return { group, step, dispose };
}
