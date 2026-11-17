// WORLD for _hero: a plain painted sky with a warm bright area behind the hero, a ground that takes the cast shadow, the key light from the upper right (restored on dispose).
import { CircleGeometry, Color } from "three";
import { paint, painted } from "../../../sdf.js";
import { heroShot } from "../scene.js";

export default function build(ctx) {
  const { THREE, engine, palette } = ctx;
  const group = new THREE.Group();
  const hex = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
  const rimHex = heroShot?.rim ?? ctx.scene.seal.hero.eyes?.iris ?? "#ff6a50", rc = new Color(rimHex);
  group.add(ctx.bake.plateLayer(heroShot ? `vec3 paint(vec2 p) {
    vec3 c = mix(vec3(0.02, 0.015, 0.03), vec3(0.06, 0.04, 0.07), smoothstep(0.0, 1.0, p.y));
    vec2 d = (p - vec2(0.5 * 1.7778, 0.5)) * vec2(0.55, 0.9);
    return c + vec3(${rc.r.toFixed(3)}, ${rc.g.toFixed(3)}, ${rc.b.toFixed(3)}) * exp(-dot(d, d) * 6.0) * 0.32;
  }` : `vec3 paint(vec2 p) {
    vec3 c = mix(${hex(palette.skyLow)}, ${hex(palette.skyTop)}, smoothstep(0.5, 1.0, p.y));
    vec2 d = (p - vec2(0.5 * 1.7778, 0.64)) * vec2(0.8, 1.1);
    return mix(c, vec3(1.0, 0.9, 0.72), exp(-dot(d, d) * 5.0) * 0.85);
  }`));
  if (!heroShot) group.add(engine.prop(painted(new CircleGeometry(60, 64).rotateX(-Math.PI / 2), paint(palette.ground, palette.groundShade)), 0.5));
  const sh = engine.shared, light = sh.uLightDir.value, was = light.clone(), wasCol = sh.uLightCol.value.clone(), wasRim = sh.uRimDir.value.clone(), wasRimCol = sh.uRimCol.value.clone();
  if (heroShot) { // key from the front and the side, slightly below; a strong coloured rim from behind
    light.set(0.95, 0.16, 0.45).normalize(); sh.uLightCol.value.set("#ffe9d6");
    sh.uRimDir.value.set(-0.55, 0.25, -0.8).normalize(); sh.uRimCol.value.copy(rc).lerp(new Color("#ffffff"), 0.25);
  } else light.set(0.55, 0.72, 0.5).normalize();
  return { group, update() {}, dispose() { light.copy(was); sh.uLightCol.value.copy(wasCol); sh.uRimDir.value.copy(wasRim); sh.uRimCol.value.copy(wasRimCol); } };
}
