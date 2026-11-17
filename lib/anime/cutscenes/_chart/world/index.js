// WORLD for _chart (layer 0): a painted dome with a warm glow behind the hero's head, a ground disc, faceted stones and two
// pillars for the cast shadows to land on and the line pass to draw (creases on the facets and boxes, id edges between sets).
// Sets the key light from scene.light and restores the shared light and fog on dispose.
import { BoxGeometry, CircleGeometry, CylinderGeometry, DodecahedronGeometry, Group } from "three";
import { V } from "../../../paint.js";

const ID = { ground: 0.5, stone: 0.62, pillar: 0.74 };

export default function build(ctx) {
  const { engine, scene, sdf, palette: P } = ctx;
  const S = scene.set, sh = engine.shared, group = new Group();
  const prev = { dir: sh.uLightDir.value.clone(), col: sh.uLightCol.value.clone(), fog: sh.uFog.value.clone() };
  const key = (t) => sh.uLightDir.value.fromArray(t >= 12 ? scene.light.back : scene.light.dir).normalize();
  key(0);
  sh.uLightCol.value.setRGB(...scene.light.col);
  sh.uFog.value.x = 0;

  // uStone mode 3 is the grunge mottle (scale, contrast, streak): painted weathering, no tiling
  const prop = (geo, col, shade, id, grunge) => {
    const m = engine.prop(sdf.painted(geo, sdf.paint(col, shade)), id);
    m.material.uniforms.uStone.value.set(3, ...grunge);
    group.add(m);
    return m;
  };
  prop(new CircleGeometry(S.ground.r, 96).rotateX(-Math.PI / 2), P.ground, P.groundShade, ID.ground, [0.55, 0.3, 0]);
  for (const [x, z, r, sy, turn] of S.stones) {
    prop(new DodecahedronGeometry(r, 0).scale(1, sy, 0.85).rotateY(turn).translate(x, r * sy * 0.55, z), P.stone, P.stoneShade, ID.stone, [1.6, 0.3, 0.1]);
  }
  for (const [x, z, h] of S.pillars) {
    prop(new BoxGeometry(0.9, 0.22, 0.9).translate(x, 0.11, z), P.pillar, P.pillarShade, ID.pillar, [0.9, 0.25, 0.15]);
    prop(new CylinderGeometry(0.28, 0.32, h, 24).translate(x, 0.22 + h / 2, z), P.pillar, P.pillarShade, ID.pillar, [0.9, 0.25, 0.15]);
    prop(new BoxGeometry(0.8, 0.18, 0.8).translate(x, 0.31 + h, z), P.pillar, P.pillarShade, ID.pillar, [0.9, 0.25, 0.15]);
  }

  // dome: az = atan(x, -z), el = asin(y). The glow is two hard bands over a broad warm wash; cumulus keep clear of it
  const g = S.glow;
  const SKY = /* glsl */ `
  const float GAZ = ${g.az.toFixed(4)};
  const float GEL = ${g.el.toFixed(4)};
  float cloudD(vec2 u, float el) { vec2 w = warp(u * 0.8, 0.4) / 0.8; return fbm(w * vec2(1.0, 1.6)) + 0.05 - 1.4 * el; }
  vec3 sky(float az, float el) {
    vec3 col = mix(${V(P.horizon)}, ${V(P.skyMid)}, smoothstep(0.0, 0.35, el));
    col = mix(col, ${V(P.zenith)}, smoothstep(0.3, 0.9, el));
    float d = length(vec2((az - GAZ) * cos(el), (el - GEL) * 1.3));
    col = mix(col, ${V(P.glow)}, 0.8 * (1.0 - smoothstep(0.05, 0.7, d)));
    col += ${V(P.glowCore)} * (0.06 * (1.0 - smoothstep(0.34, 0.35, d)) + 0.06 * (1.0 - smoothstep(0.17, 0.18, d)));
    vec2 u = vec2(az * 2.6, el * 8.0);
    float D = cloudD(u, el);
    vec2 sd = normalize(vec2(GAZ - az, (GEL - el) * 2.0) + 1e-4);
    float lit = step(0.5, clamp((D - cloudD(u + sd * 0.08, el)) * 9.0 + 0.5, 0.0, 1.0));
    float m = smoothstep(0.5, 0.515, D) * smoothstep(0.02, 0.08, el) * smoothstep(0.28, 0.5, d);
    vec3 cb = mix(${V(P.cloudShade)}, ${V(P.cloudLit)}, lit);
    cb = mix(cb, ${V(P.cloudRim)}, (smoothstep(0.5, 0.505, D) - smoothstep(0.53, 0.545, D)) * 0.7);
    col = mix(col, cb, m);
    return mix(col, ${V(P.far)}, 1.0 - smoothstep(-0.06, 0.0, el));
  }`;
  group.add(ctx.bake.sky(SKY, { az: [-1.45, 0.55], el: [-0.15, 0.6], pxPerRad: 1400, tools: ["noise"] }));

  return {
    group,
    update(t) { key(t); },
    dispose() {
      group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); o.userData.target?.dispose(); });
      sh.uLightDir.value.copy(prev.dir); sh.uLightCol.value.copy(prev.col); sh.uFog.value.copy(prev.fog);
    },
  };
}
