// BUILD for _hero2b (lab only): a dark stage with a red glow plate (world) and the method-b seal (cast).
import { Color } from "three";
import { composeLayers } from "../framework.js";
import { buildSealB } from "../../kit/hero2/b/index.js";
import sukuna from "../../kit/hero2/b/looks/sukuna.js";
import { lab } from "./scene.js";

function world(ctx) {
  const { THREE, engine } = ctx, group = new THREE.Group(), rc = new Color("#ff3a3a");
  group.add(ctx.bake.plateLayer(`vec3 paint(vec2 p) {
    vec3 c = mix(vec3(0.02, 0.012, 0.03), vec3(0.07, 0.03, 0.07), smoothstep(0.0, 1.0, p.y));
    vec2 d = (p - vec2(0.5 * 1.7778, 0.55)) * vec2(0.55, 0.9);
    return c + vec3(${rc.r.toFixed(3)}, ${rc.g.toFixed(3)}, ${rc.b.toFixed(3)}) * exp(-dot(d, d) * 5.5) * 0.3;
  }`));
  const sh = engine.shared, light = sh.uLightDir.value, was = light.clone(), wasCol = sh.uLightCol.value.clone(), wasRim = sh.uRimDir.value.clone(), wasRimCol = sh.uRimCol.value.clone();
  light.set(0.95, 0.2, 0.55).normalize(); sh.uLightCol.value.set("#ffe2c8");
  sh.uRimDir.value.set(-0.55, 0.25, -0.8).normalize(); sh.uRimCol.value.set("#ff4a40");
  return { group, update() {}, dispose() { light.copy(was); sh.uLightCol.value.copy(wasCol); sh.uRimDir.value.copy(wasRim); sh.uRimCol.value.copy(wasRimCol); } };
}

function cast(ctx) {
  const group = new ctx.THREE.Group(), seal = buildSealB(ctx.engine, sukuna).set(lab);
  group.add(seal.group);
  console.log("hero2b stats", JSON.stringify(seal.stats()));
  return { group, update(ts) { seal.update(ts); }, dispose() { seal.dispose(); } };
}

export default function build(ctx) { return composeLayers(ctx, { world, cast }); }
