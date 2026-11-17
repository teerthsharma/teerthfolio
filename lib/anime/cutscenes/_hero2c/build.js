// BUILD for _hero2c (lab only): a dark stage, a warm key from the front side, a red rim from behind, and the hero2/c figure.
import { Color } from "three";
import { composeLayers } from "../framework.js";
import { buildFigure } from "../../kit/hero2/c/index.js";
import sukuna from "../../kit/hero2/c/looks/sukuna.js";
import { EXPR, HP } from "./scene.js";

const RIM = "#ff2a1e";

function world(ctx) {
  const { THREE, engine } = ctx, group = new THREE.Group(), rc = new Color(RIM), sh = engine.shared;
  group.add(ctx.bake.plateLayer(`vec3 paint(vec2 p) {
    vec3 c = mix(vec3(0.02, 0.012, 0.025), vec3(0.075, 0.025, 0.05), smoothstep(0.0, 1.0, p.y));
    vec2 d = (p - vec2(0.5 * 1.7778, 0.5)) * vec2(0.5, 0.85);
    return c + vec3(${rc.r.toFixed(3)}, ${rc.g.toFixed(3)}, ${rc.b.toFixed(3)}) * exp(-dot(d, d) * 5.0) * 0.12;
  }`));
  const was = { l: sh.uLightDir.value.clone(), lc: sh.uLightCol.value.clone(), r: sh.uRimDir.value.clone(), rc: sh.uRimCol.value.clone() };
  sh.uLightDir.value.set(0.32, 0.45, 0.9).normalize(); sh.uLightCol.value.set("#fff3ea");
  sh.uRimDir.value.set(-0.55, 0.25, -0.8).normalize(); sh.uRimCol.value.copy(rc).lerp(new Color("#ffffff"), 0.35);
  return { group, update() {}, dispose() { sh.uLightDir.value.copy(was.l); sh.uLightCol.value.copy(was.lc); sh.uRimDir.value.copy(was.r); sh.uRimCol.value.copy(was.rc); } };
}

function cast(ctx) {
  ctx.seal.group.visible = false;
  const fig = buildFigure(ctx.engine, HP.length >= 2 ? { ...sukuna, pose: { tilt: HP[0], roll: HP[1] } } : sukuna, { expr: EXPR });
  const group = new ctx.THREE.Group();
  group.add(fig.group);
  globalThis.__hero2cStats = fig.stats;
  return { group, update() {}, dispose() { fig.dispose(); } };
}

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx: () => ({ group: new ctx.THREE.Group(), update() {}, dispose() {} }) });
}
