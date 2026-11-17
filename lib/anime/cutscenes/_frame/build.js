// BUILD for _frame: world (the plate, and a red vane on the world clock), cast (a pacing seal), fx (orbiting boxes; the blue are tier 2).
import { BoxGeometry, CircleGeometry, CylinderGeometry, DodecahedronGeometry, Group } from "three";
import { composeLayers } from "../framework.js";
import { V } from "../../paint.js";

function world(ctx) {
  const { engine, scene, sdf, palette: P } = ctx, sh = engine.shared, group = new Group();
  const prev = { dir: sh.uLightDir.value.clone(), col: sh.uLightCol.value.clone(), fog: sh.uFog.value.clone() };
  sh.uLightDir.value.fromArray(scene.light.dir).normalize(); sh.uLightCol.value.setRGB(...scene.light.col); sh.uFog.value.x = 0;
  const prop = (geo, col, shade, id, parent = group) => { const m = engine.prop(sdf.painted(geo, sdf.paint(col, shade)), id); parent.add(m); return m; };
  prop(new CircleGeometry(80, 96).rotateX(-Math.PI / 2), P.ground, P.groundShade, 0.5).material.uniforms.uStone.value.set(3, 0.55, 0.3, 0);
  for (const [x, z, r] of [[-0.6, 0.5, 0.14], [0.5, 0.45, 0.1], [1.5, 0.3, 0.16], [-1.4, -0.4, 0.2], [2.4, -0.8, 0.22], [-2.6, 0.2, 0.18], [0.2, -1.2, 0.17]]) {
    prop(new DodecahedronGeometry(r, 0).scale(1, 0.65, 0.85).translate(x, r * 0.36, z), P.stone, P.stoneShade, 0.62);
  }
  for (let i = 0; i < 9; i++) {
    const x = -5 + i * 2.2, z = -3 - i * 6, h = 2.4;
    prop(new CylinderGeometry(0.28, 0.32, h, 20).translate(x, h / 2, z), P.pillar, P.pillarShade, 0.74);
    prop(new BoxGeometry(0.8, 0.18, 0.8).translate(x, h + 0.09, z), P.pillar, P.pillarShade, 0.74);
  }
  const vane = new Group();
  vane.position.set(-1.6, 1.5, -1.6); vane.userData.layer = 1;
  prop(new BoxGeometry(1.5, 0.16, 0.05), P.vane, P.vaneShade, 0.8, vane);
  prop(new BoxGeometry(0.16, 1.5, 0.05), P.vane, P.vaneShade, 0.8, vane);
  prop(new CylinderGeometry(0.06, 0.08, 1.5, 12).translate(-1.6, 0.75, -1.66), P.pillar, P.pillarShade, 0.74);
  group.add(vane);
  group.add(ctx.bake.sky(/* glsl */ `vec3 sky(float az, float el) {
    vec3 c = mix(${V(P.horizon)}, ${V(P.skyMid)}, smoothstep(0.0, 0.35, el)); c = mix(c, ${V(P.zenith)}, smoothstep(0.3, 0.9, el));
    return mix(c, ${V(P.far)}, 1.0 - smoothstep(-0.06, 0.0, el)); }`, { az: [-3.2, 3.2], el: [-0.2, 0.9], pxPerRad: 300 }));
  return {
    group,
    update(t) { vane.rotation.z = t * 1.8; },
    dispose() {
      group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); o.userData.target?.dispose(); });
      sh.uLightDir.value.copy(prev.dir); sh.uLightCol.value.copy(prev.col); sh.uFog.value.copy(prev.fog);
    },
  };
}

function cast(ctx) {
  const { engine, kit } = ctx, group = new Group();
  const s = kit.costumedSeal(engine, { ...kit.COSTUMES.school, scale: 0.75 });
  group.add(s.group);
  return {
    group,
    update(t) { s.place(-1.3 + 0.5 * Math.sin(t * 1.6), 0, -0.7, 0.5); s.update(t); },
    dispose() { s.dispose(); },
  };
}

function fx(ctx) {
  const { engine, sdf, palette: P } = ctx, group = new Group();
  const boxes = Array.from({ length: 8 }, (_, i) => {
    const hi = i % 2 === 1; // every second box is a tier 2 effect
    const m = engine.prop(sdf.painted(new BoxGeometry(0.12, 0.12, 0.12), sdf.paint(hi ? P.orbitHi : P.orbit, hi ? P.orbitHiShade : P.orbitShade)), 0.86);
    m.userData.tier = hi ? 2 : 0;
    group.add(m);
    return m;
  });
  return {
    group,
    update(t) {
      const c = ctx.seal.at;
      boxes.forEach((m, i) => {
        const a = t * 2.5 + (i * Math.PI) / 4;
        m.visible = ctx.atTier(m.userData.tier);
        m.position.set(c[0] + 0.85 * Math.sin(a), 0.5 + 0.12 * Math.sin(a * 2), c[2] + 0.85 * Math.cos(a));
        m.rotation.set(a, a * 1.3, 0);
      });
    },
    dispose() { for (const m of boxes) { m.geometry.dispose(); m.material.dispose(); } },
  };
}

export default function build(ctx) {
  return composeLayers(ctx, { world, cast, fx });
}
