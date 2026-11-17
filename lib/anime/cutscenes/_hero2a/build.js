// BUILD for _hero2a: a dark stage (world), the sculpted figure (cast). Key from the front and the right, a strong red rim from behind.
import { Color } from "three";
import { composeLayers } from "../framework.js";
import { buildSeal2, SUKUNA } from "../../kit/hero2/a/index.js";
import { expr } from "./scene.js";

function world(ctx) {
  const { engine } = ctx, group = new ctx.THREE.Group(), sh = engine.shared, rc = new Color("#ff3a2a");
  group.add(ctx.bake.plateLayer(`vec3 paint(vec2 p) {
    vec3 c = mix(vec3(0.02, 0.008, 0.016), vec3(0.075, 0.018, 0.03), smoothstep(0.0, 1.0, p.y));
    vec2 d = (p - vec2(0.5 * 1.7778, 0.62)) * vec2(0.5, 0.8);
    return c + vec3(${rc.r.toFixed(3)}, ${rc.g.toFixed(3)}, ${rc.b.toFixed(3)}) * exp(-dot(d, d) * 5.0) * 0.16;
  }`));
  const was = { l: sh.uLightDir.value.clone(), c: sh.uLightCol.value.clone(), rd: sh.uRimDir.value.clone(), rc: sh.uRimCol.value.clone() };
  sh.uLightDir.value.set(0.45, 0.3, 0.85).normalize(); sh.uLightCol.value.set("#fff0e2");
  sh.uRimDir.value.set(-0.5, 0.3, -0.8).normalize(); sh.uRimCol.value.set("#ff4030");
  return { group, update() {}, dispose() { sh.uLightDir.value.copy(was.l); sh.uLightCol.value.copy(was.c); sh.uRimDir.value.copy(was.rd); sh.uRimCol.value.copy(was.rc); } };
}

function cast(ctx) {
  ctx.seal.group.visible = false;
  const group = new ctx.THREE.Group(), h = buildSeal2(ctx.engine, SUKUNA, { expr });
  group.add(h.group);
  globalThis.__hero2 = h;
  return { group, update(ts) { h.update(ts); }, dispose() { h.dispose(); } };
}

export default function build(ctx) { return composeLayers(ctx, { world, cast }); }
