// WORLD layer for p-faraday (WORLD agent): the set, the sky, the far painted plates. Layer 0 (static art, baked per shot).
// Anything that animates must set `obj.userData.layer = 1`. Allowed imports: lib/anime/{tools,kit,fx,sky,post,pup.js,sdf.js,
// paint.js,kit3d.js,material.js}, ../../framework.js and THIS folder. Never another cutscene.
// STUB: a painted sky gradient and a flat ground disc, so the lab shows the locked seal on something.
import { CircleGeometry, Color } from "three";
import { paint, painted } from "../../../sdf.js";

export default function build(ctx) {
  const { THREE, engine, palette } = ctx;
  const group = new THREE.Group();
  const hex = (h) => { const c = new Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
  // a fullscreen painting at the far plane: GLSL `vec3 paint(vec2 p)`, p in height units (y up). Values above 1 bloom.
  group.add(ctx.bake.plateLayer(`vec3 paint(vec2 p) { return mix(${hex(palette.ground ?? "#3a4a6a")}, ${hex(palette.sky ?? "#1b2548")}, smoothstep(0.1, 0.9, p.y)); }`));
  const ground = engine.prop(painted(new CircleGeometry(80, 64).rotateX(-Math.PI / 2), paint(palette.ground ?? "#3a4a6a", "#2a3550")), 0.5);
  group.add(ground);
  return { group, update() {}, dispose() {} };
}
