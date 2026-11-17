// The Wall's laid stone, the district's plaster and tile, the flank towers and the gap's jambs. The kit's charcoal
// materials are chiselled in place (a clone would copy the shared clock and the burn would stop reaching it).
import { BoxGeometry, Group, Mesh } from "three";
import { charcoal } from "../live/charcoal.js";
import { zF } from "../live/world.js";
import { GILT, ORDER, merge, part, place } from "./spec.js";

const MASON = {
  stone: `
float mason(vec3 w, vec3 n, float d) {
  float along = abs(n.x) > 0.7 ? w.z : w.x;
  float row = floor(w.y / 1.25);
  float u = along / 3.0 + 0.5 * mod(row, 2.0);
  vec2 f = abs(fract(vec2(u, w.y / 1.25)) - 0.5);
  float edge = max(smoothstep(0.455, 0.5, f.x), smoothstep(0.44, 0.5, f.y));
  float chip = iNoise(vec2(floor(u) * 7.0 + row * 13.0, 3.0));
  return 1.0 - (edge * 0.5 - (0.09 - chip * 0.18)) * (1.0 - smoothstep(60.0, 160.0, d));
}`,
  plaster: `
float mason(vec3 w, vec3 n, float d) {
  float along = abs(n.x) > 0.7 ? w.z : w.x;
  float course = floor(w.y / 0.6);
  float joint = max(smoothstep(0.44, 0.5, abs(fract(w.y / 0.6) - 0.5)), smoothstep(0.46, 0.5, abs(fract(along / 1.2 + 0.5 * course) - 0.5)));
  float quoin = joint * (1.0 - smoothstep(2.8, 3.2, w.y)) * (1.0 - smoothstep(60.0, 160.0, d));
  float stain = 0.9 + 0.18 * iNoise(vec2(w.x * 6.0, w.y * 0.5));
  return (w.y < 1.0 ? 0.82 : 1.0) * stain * (1.0 - 0.35 * quoin);
}`,
  tile: `
float mason(vec3 w, vec3 n, float d) {
  float along = abs(n.x) > 0.7 ? w.z : w.x;
  float course = floor(w.y * 2.8);
  float band = smoothstep(0.42, 0.5, fract(w.y * 2.8));
  float joint = smoothstep(0.46, 0.5, abs(fract(along / 0.9 + 0.5 * course) - 0.5));
  return 1.0 - (0.14 * band + 0.1 * joint) * (1.0 - smoothstep(60.0, 160.0, d));
}`,
};

export function chiselled(mat, kind) {
  const src = mat.fragmentShader;
  const at = src.indexOf("void pageMain()");
  if (!MASON[kind] || at < 0 || src.includes("float mason(")) throw new Error(`chiselled(${kind}): no site-tone main, or already chiselled`);
  const withMason = src.slice(0, at) + MASON[kind] + "\n" + src.slice(at);
  const next = withMason.replace("float tone = uTone * vT * (", "float tone = mason(vW, n, length(cameraPosition - vW)) * uTone * vT * (");
  if (next === withMason) throw new Error(`chiselled(${kind}): the tone line is not in this shader`);
  mat.fragmentShader = next;
  mat.needsUpdate = true;
  return mat;
}

// the sun edge of the stone and the faces takes gold leaf: the live's rim light, pushed toward the low sun's gold
const GILT_OUT = "gl_FragColor = outColor(c,";
export function gilt(mat, k = 2.6, cap = 0.8) {
  const src = mat.fragmentShader;
  if (src.split(GILT_OUT).length !== 2 || src.includes("// gilt")) throw new Error("gilt: no single output line in this shader, or already gilt");
  mat.fragmentShader = src.replace(GILT_OUT, `c = mix(c, vec3(1.0, 0.8, 0.32), clamp(rim * uRim * ${k.toFixed(2)}, 0.0, ${cap.toFixed(2)})); // gilt\n        ` + GILT_OUT);
  mat.needsUpdate = true;
  return mat;
}

const FLANK = [66, 126, 186, 246, 306, 366];
const KIND = { core: "stone", plates: "stone", rubble: "stone", houses: "plaster", tower: "plaster", gate: "plaster", roofs: "tile" };

function flankTower(x) {
  const parts = [
    part(new BoxGeometry(7, 27, 9).translate(0, 13.5, 0), 0.84),
    part(new BoxGeometry(8.4, 1.2, 10.4).translate(0, 27.6, 0), 0.78),
    ...[-1, 1].flatMap((a) => [-1, 1].map((b) => part(new BoxGeometry(1.3, 1.6, 1.3).translate(a * 3.55, 29, b * 4.55), 0.82))),
    ...[-1, 1].map((a) => part(new BoxGeometry(0.5, 2.4, 0.3).translate(a * 1.6, 21.2, 4.52), 0.05)),
  ];
  return parts.map((g) => place(g, x, 0, zF(x) - 3, Math.atan(x / 450)));
}

function gapStone() {
  const jamb = (s) => place(part(new BoxGeometry(0.9, 9, 6.2).translate(0, 4.5, 0), 0.78), s * 6.45, 0, zF(s * 6) - 3.1, Math.atan((s * 6.45) / 450));
  return [jamb(-1), jamb(1), place(part(new BoxGeometry(13.8, 0.6, 6.2).translate(0, 9.3, 0), 0.5), 0, 0, zF(0) - 3.1)];
}

export function buildMasonry(k) {
  for (const [name, kind] of Object.entries(KIND)) chiselled(k[name].material, kind);
  gilt(k.core.material, ...GILT.core);
  gilt(k.plates.material, ...GILT.plates);
  gilt(k.wallTitans.material, ...GILT.titans);
  for (const f of k.faces) gilt(f.material, ...GILT.faces);
  const mat =chiselled(charcoal({ tone: 1.0, wash: 0.1, vertexColors: true, edge: 0.7 }), "stone");
  const towers = [...FLANK, ...FLANK.map((x) => -x)].flatMap(flankTower);
  const mesh = new Mesh(merge([...towers, ...gapStone()]), mat);
  mesh.renderOrder = ORDER.set;
  mesh.frustumCulled = false;
  const group = new Group().add(mesh);
  return {
    group,
    update() {},
    dispose() {
      mesh.geometry.dispose();
      mat.dispose();
      group.removeFromParent();
    },
  };
}
