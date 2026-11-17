// The live courtyard: sky bubble, ground, keep and walls, trees, painted shadows, shafts, fallen leaves and grass. The live
// shaders stay as copied; the boosts are asserted edits of their text made here, and every edit must match exactly once.
import { ConeGeometry, DodecahedronGeometry, Group, Mesh, PlaneGeometry, SphereGeometry, Vector3 } from "three";
import { AURA, FERN_AT, FULCRUM, STARK_AT } from "../live/cast.js";
import { CORE_Y, FOOT } from "../live/court.js";
import { celMaterial, hash, join, part, U } from "../live/toon.js";
import { CASTERS, FOUNTAIN, ground as groundPlane, groundY, shadows, shafts, skyMaterial, statics } from "../live/world.js";
import { beatT, DOCK, HW, radiusAt, smooth, STAND, T } from "../clock.js";
import { tone } from "../tone.js";
import { buildFar, FAR_CASTERS } from "./far.js";

const once = (src, from, to) => {
  if (src.split(from).length !== 2) throw new Error(`court edit: "${from}" must match exactly once`);
  return src.replace(from, () => to);
};
const edit = (mat, list) => {
  mat.fragmentShader = list.reduce((f, [a, b]) => once(f, a, b), mat.fragmentShader);
  mat.needsUpdate = true;
  return tone(mat);
};

const UNMAKE_EDITS = [
  ["smoothstep(0.014, 0.05, q.x)", "smoothstep(0.02, 0.07, q.x)"],
  ["(1.0 - smoothstep(0.0, 0.07, edge))", "(1.0 - smoothstep(0.0, 0.11, edge))"],
  ["step(0.001, uDis) * 2.2", "step(0.001, uDis) * 2.6"],
  ["return e;", "if (uDis > 0.0 && edge < 0.11) e += vec3(1.0, 0.9, 0.78) * 0.25;\n    return e;"],
];
const SKY_EDITS = [
  ["smoothstep(0.014, 0.05, q.x)", "smoothstep(0.02, 0.07, q.x)"],
  ["(1.0 - smoothstep(0.0, 0.07, edge))", "(1.0 - smoothstep(0.0, 0.11, edge))"],
  ["* e * 2.2", "* e * 2.6"],
];
const GROUND_EDITS = [
  ...UNMAKE_EDITS,
  ["c += em;", "float dp = smoothstep(0.64, 0.7, fbm(p * 0.45 + vec2(uTime * 0.01, 0.0)));\n        c += vec3(0.3, 0.2, 0.07) * dp * (1.0 - uDim);\n        c += em;"],
];
const STATIC_EDITS = [
  ...UNMAKE_EDITS,
  ["base *= 1.0 - 0.22 * mortar;", "base *= 1.0 - 0.3 * mortar;\n      base *= 0.74 + 0.26 * smoothstep(0.0, 1.5, vW.y);"],
  ["step(0.8, tone) * 0.7", "step(0.72, tone) * 0.7"],
  ["c += em;", "float reach2 = 1.0 - smoothstep(uCrack * 1.5 - 0.3, uCrack * 1.5, length((vW - uOrigin).xz) / 46.0);\n    if (vKind > 0.5 && vKind < 1.5 && uCrack > 0.0) em += vec3(1.0, 0.78, 0.38) * 0.5 * (1.0 - smoothstep(0.014, 0.05, vor(vW.xz * 1.1 + vW.y * 0.9).x)) * reach2;\n    c += em;"],
];
const SHADOW_EDITS = [...UNMAKE_EDITS, ["float a = vA * 0.62;", "float a = smoothstep(0.0, 0.09, vA) * 0.62;"]];

const LEAF = ["#b84a22", "#e08a2e", "#f0b840", "#9e2f26", "#d8702a", "#c89a30"];
const GRASS = ["#9c7a22", "#c07a22", "#74601c"];
const piece = (geo, hex, { at = [0, 0, 0], ry = 0, s = [1, 1, 1], sway = 0 } = {}) =>
  part(geo, hex, { flat: true, sway }).scale(...s).rotateY(ry).translate(...at);

const LEAVES = Array.from({ length: 160 }, (_, i) => {
  const r = 4 + 26 * hash(i, 1), a = 6.283 * hash(i, 2), sc = 0.18 + 0.16 * hash(i, 3);
  return piece(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), LEAF[i % LEAF.length], { at: [r * Math.cos(a), 0.03, r * Math.sin(a)], ry: a, s: [sc, 1, sc] });
});
const TUFTS = Array.from({ length: 220 }, (_, i) => {
  const r = 18 + 22 * hash(i, 4), a = 6.283 * hash(i, 5), x = r * Math.cos(a), z = r * Math.sin(a);
  return piece(new ConeGeometry(0.12, 0.5, 4), GRASS[i % GRASS.length], { at: [x, groundY(x, z) + 0.25, z], ry: a, sway: 0.8 });
});

const ROCK = ["#cdb088", "#c4a67c", "#d3b88f", "#b99c76"];
const CLEAR = [[0, 0, 1.8], ...Object.values(STAND).map((p) => [p[0], p[2], 1.8]), [AURA.at[0], AURA.at[2], 4.5], [FOUNTAIN[0], FOUNTAIN[1], 3.5]];
const free = (x, z) => CLEAR.every(([cx, cz, r]) => Math.hypot(x - cx, z - cz) >= r);
// near-field fill: an item whose centre falls inside a clear radius is dropped
const scatter = (n, k, r0, r1, make) => Array.from({ length: n }, (_, i) => {
  const r = r0 + (r1 - r0) * hash(i, k), a = 6.283 * hash(i, k + 1), x = r * Math.cos(a), z = r * Math.sin(a);
  return free(x, z) ? make(i, x, z, a) : null;
}).filter(Boolean);
const NEAR = [
  ...scatter(90, 21, 3, 14, (i, x, z, a) => {
    const sc = 0.18 + 0.16 * hash(i, 23);
    return piece(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), LEAF[Math.floor(hash(i, 24) * LEAF.length)], { at: [x, 0.03, z], ry: a, s: [sc, 1, sc] });
  }),
  ...scatter(110, 11, 3, 18, (i, x, z, a) => piece(new ConeGeometry(0.1, 0.42, 4), GRASS[Math.floor(hash(i, 13) * GRASS.length)], { at: [x, groundY(x, z) + 0.21, z], ry: a, sway: 0.8 })),
  ...scatter(36, 31, 3, 16, (i, x, z, a) => {
    const s = 0.12 + 0.18 * hash(i, 33);
    return piece(new DodecahedronGeometry(1, 0), ROCK[Math.floor(hash(i, 34) * ROCK.length)], { at: [x, groundY(x, z) + 0.5 * s, z], ry: a, s: [s, s, s] });
  }),
];

export function buildCourt(ctx) {
  const group = new Group(), world = new Group();
  const skyGeo = new SphereGeometry(1, 32, 18);
  const skyMat = edit(skyMaterial(), SKY_EDITS);
  const sky = new Mesh(skyGeo, skyMat);
  sky.renderOrder = -3;
  sky.position.set(0, CORE_Y, 0);

  const gr = groundPlane();
  const groundMat = edit(gr.m, GROUND_EDITS);
  const casters = [
    ...CASTERS,
    [AURA.at[0], AURA.at[2], 1.0, 2.5, 0, 0.5],
    [FERN_AT[0], FERN_AT[2], 0.7, 1.6, 0, 0.5],
    [STARK_AT[0], STARK_AT[2], 0.8, 1.9, 0, 0.5],
    ...FOOT.map((f) => [f.x, f.z, 0.7, 2.3, 0, 0.32]),
    ...FAR_CASTERS,
  ];
  const sh = shadows(casters);
  const shadowMat = edit(sh.m, SHADOW_EDITS);
  const st = statics();
  const staticMat = edit(celMaterial(), STATIC_EDITS);
  const sf = shafts();
  const shaftMat = tone(sf.m);
  const leafMat = edit(celMaterial(), UNMAKE_EDITS);
  const leafGeo = join([...LEAVES, ...TUFTS, ...NEAR]);
  const far = buildFar();

  world.add(new Mesh(gr.g, groundMat), new Mesh(sh.g, shadowMat), new Mesh(st, staticMat), far.group);
  const shaftMesh = new Mesh(sf.g, shaftMat);
  shaftMesh.userData.plateDepth = true;
  const leavesMesh = new Mesh(leafGeo, leafMat);
  world.add(shaftMesh, leavesMesh);
  group.add(sky, world);

  const state = { tt: 0, out: 1, dis: 0, gone: false, inside: false, grow: 0, colK: 1, mana: 0, glowK: 0 };
  const origin = new Vector3(), centre = new Vector3(DOCK[0], DOCK[1] + 0.9, DOCK[2]);
  const geos = [skyGeo, gr.g, sh.g, st, sf.g, leafGeo];
  const materials = [skyMat, groundMat, shadowMat, staticMat, shaftMat, leafMat];

  return {
    group, state, casters, materials,
    update(t) {
      const tt = beatT(t);
      const out = 1 - smooth(T.collapse, T.collapse + 0.001, tt);
      const dis = smooth(T.dis[0], T.dis[1], tt) * 1.2;
      const gone = dis >= 1.18;
      const grow = smooth(T.release, T.release + 0.55, tt);
      const colK = 1 - smooth(T.colFade[0], T.colFade[1], tt);
      const mana = grow * (1 - 0.8 * smooth(T.dis[0], T.dis[1], tt));
      U.uTime.value = tt;
      U.uDis.value = dis;
      U.uCrack.value = smooth(T.crack[0], T.crack[1], tt);
      U.uWind.value = 0.05 + 0.95 * mana * (1 - 0.5 * smooth(10.5, 13.5, tt));
      U.uDim.value = 0.8 * smooth(T.release - 0.15, T.release + 0.45, tt) * colK;
      U.uAxis.value.set(...DOCK);
      origin.set(HW[0] + DOCK[0], HW[1] + FULCRUM * 0.6 + DOCK[1], HW[2] + DOCK[2]);
      U.uOrigin.value.copy(origin);
      const cam = ctx?.player?.camera;
      if (cam) U.uOriginDir.value.copy(origin).sub(cam.position).normalize();
      const r = radiusAt(t);
      const bubble = cam ? r > cam.position.distanceTo(centre) + 0.3 : false;
      const inside = bubble;
      sky.visible = r > 0.02 && !gone;
      sky.scale.setScalar(bubble ? 140 : Math.max(r, 0.02));
      world.visible = inside && !gone;
      leavesMesh.visible = tt < T.dis[1];
      Object.assign(state, { tt, out, dis, gone, inside, grow, colK, mana, glowK: grow * (1 - smooth(T.colFade[0] + 0.3, T.colFade[1] + 0.8, tt)) });
    },
    dispose() {
      far.dispose();
      for (const g of geos) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
