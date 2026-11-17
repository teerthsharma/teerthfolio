// The far city and the crimson underglow behind the cloud ceiling: three baked skyline rows beyond the live city's farthest tower, each pulled
// toward the haze so the air is crimson, and one underglow card. Hidden once the picture has broken (tt - T.crunch > 1.7), with the rest of the set.
import { Color, Group, Mesh } from "three";
import { bgCard } from "../../../kit/bg/cards.js";
import { PAINT } from "../../../kit/bg/glsl.js";
import { mistCard } from "../../../tools/mist.js";
import { hash } from "../live/look.js";
import { BOOST, T } from "../clock.js";
import { toneMat } from "./island.js";

const HAZE = "#3a0a12";
// three crimson haze sheets 90 by 16 m, base at y -1.5 (centred on y 6.5); the drift is a seed shift of 0.029 per second (0.012 uv per second)
const SHEETS = [{ z: -9, a: 0.05, seed: 3 }, { z: -20, a: 0.07, seed: 5 }, { z: -40, a: 0.09, seed: 8 }];
// the live city's farthest tower: z = -118 - 70 hash(i, 16), so Z0 is the largest |z| of that row
const Z0 = Math.max(...Array.from({ length: 50 }, (_, i) => 118 + 70 * hash(i, 16)));
const ROWS = [
  { dz: 40, S: 420, H: 90, density: 9, dark: "#14080c", mid: "#2a1018", k: 0.35, seed: 3 },
  { dz: 120, S: 640, H: 110, density: 12, dark: "#1a0a10", mid: "#34141c", k: 0.6, seed: 5 },
  { dz: 220, S: 880, H: 120, density: 16, dark: "#240e14", mid: "#40181f", k: 0.8, seed: 8 },
];
const mixHex = (a, b, k) => "#" + new Color(a).lerp(new Color(b), k).getHexString();
const UNDERGLOW = `vec4 paint(vec2 p) { float a = (1.0 - p.y) * (1.0 - p.y); return vec4(0.62, 0.05, 0.10, a); }`;

export function buildFar(ctx) {
  const group = new Group(), made = [], sheets = [];
  if (BOOST) {
    for (const r of ROWS) {
      const Z = Z0 + r.dz;
      group.add(bgCard(ctx, "skyline", {
        w: 2048, h: 512, size: [r.S, r.H], at: [0, r.H / 2, -Z], density: r.density, seed: r.seed, lit: 0.18,
        dark: mixHex(r.dark, HAZE, r.k), mid: mixHex(r.mid, HAZE, r.k), rim: "#d9893e", glow: "#d99a45",
      }));
    }
    const glowCard = ctx.bake.card(`${PAINT}\n${UNDERGLOW}`, { w: 256, h: 64, size: [1000, 40], id: 0, tools: ["noise"] });
    glowCard.position.set(0, 20, -(Z0 + 300));
    group.add(glowCard);
    for (const s of SHEETS) {
      const m = mistCard(90, 16, HAZE, s.a, s.seed);
      m.position.set(0, 6.5 - 8, s.z);
      m.userData.layer = 1;
      group.add(m);
      sheets.push({ m, seed: s.seed });
    }
  }
  for (const m of group.children) {
    if (!(m instanceof Mesh)) continue;
    if (m.material.isShaderMaterial && !m.material.userData.toned) toneMat(m.material);
    made.push(m.geometry, m.material);
  }
  return {
    group,
    update(tt) {
      group.visible = tt - T.crunch <= 1.7;
      for (const s of sheets) s.m.material.uniforms.uSeed.value = s.seed + 0.029 * tt;
    },
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
