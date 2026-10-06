// ATMOSPHERE for home: the dawn key and rim light, the sun for the light shafts, longhouse smoke and igloo steam (bible 3.17, 3.20, 6.6, 6.8).
// LIGHT (written to the engine's shared uniforms, restored on dispose):
//   key  uLightDir = normalize(-.55, .50, -.20), uLightCol = #ffeed8        a high apricot-white key from the left, so the seal's front is lit
//   rim  uRimDir = the sun direction (-.24, .14, -.96), uRimCol = #ffc98a    the 2-3 px dawn rim on the lit edge (bible 3.13, LAWS item 2)
//   engine.sun = 380 m along the sun direction (light shafts read it; the disc itself is a card in sky.js)
//   The seal's lit-luma cap (0.92) lives in the shared anime program; nothing here raises it, and no fog is applied (it would milk the seal).
// SMOKE: per column 6 puffs, on twos: phase_k = fract(k/6 + .11 t + .17 i); pos = base + (lean 2.6 phase, 4.4 phase, .12 sin(9 phase + i));
//   scale = (.28 + .55 phase) smooth(0, .08, phase) (1 - smooth(.85, 1, phase)); each puff a hard two-tone cel icosahedron #dcd8e6 / #a8a4c0.
// STEAM from the igloo vent: 8 puffs, faster and larger, #f6f4fb / #cfd5ee.
import { Group, IcosahedronGeometry, Mesh, Vector3 } from "three";
import { C, SUN, dirOf } from "./palette.js";
import { P, sm } from "./lib.js";

export function buildAtmosphere(ctx, structures) {
  const { engine } = ctx, sh = engine.shared;
  const group = new Group();
  const sunDir = new Vector3(...dirOf(SUN.az, SUN.el)).normalize();
  const sunPos = new Vector3().copy(sunDir).multiplyScalar(380);
  const key = new Vector3(-0.55, 0.5, -0.2).normalize();
  const saved = { dir: sh.uLightDir?.value.clone(), col: sh.uLightCol?.value.clone(), rimDir: sh.uRimDir?.value.clone(), rimCol: sh.uRimCol?.value.clone(), sun: engine.sun?.clone?.() ?? null };
  const apply = () => {
    sh.uLightDir?.value.copy(key);
    sh.uLightCol?.value.set("#ffeed8");
    sh.uRimDir?.value.copy(sunDir);
    sh.uRimCol?.value.set(C.key);
    engine.sun = sunPos;
  };
  apply();

  // smoke columns: one shared geometry per tone, one shared material per tone, 38 meshes in total
  const geoS = P(new IcosahedronGeometry(1, 1), C.smoke, C.smokeShade), geoW = P(new IcosahedronGeometry(1, 1), "#f6f4fb", "#cfd5ee");
  const matS = engine.prop(geoS, 0.5).material, matW = engine.prop(geoW, 0.5).material;
  const cols = [];
  const column = (base, n, geo, mat, big, speed, i) => {
    const puffs = [];
    for (let k = 0; k < n; k++) { const m = new Mesh(geo, mat); m.userData.layer = 1; m.userData.sharedGeo = m.userData.sharedMat = true; m.frustumCulled = false; group.add(m); puffs.push(m); }
    cols.push({ base, n, big, speed, i, puffs });
  };
  structures.smokeAt.forEach((b, i) => column(b, 6, geoS, matS, 1, 0.11, i));
  column([structures.iglooTop[0], structures.iglooTop[1] + 0.2, structures.iglooTop[2]], 8, geoW, matW, 1.9, 0.16, 9);

  function update(t) {
    apply();
    for (const c of cols) c.puffs.forEach((m, k) => {
      const ph = (((k / c.n + t * c.speed + c.i * 0.17) % 1) + 1) % 1;
      const s = (0.28 + 0.55 * ph) * c.big * sm(0, 0.08, ph) * (1 - sm(0.85, 1, ph));
      m.position.set(c.base[0] + 2.6 * ph * c.big * 0.5 + 0.12 * Math.sin(9 * ph + c.i), c.base[1] + 4.4 * ph * (c.big > 1 ? 1.3 : 1), c.base[2] - 1.0 * ph + 0.1 * Math.cos(7 * ph + c.i));
      m.scale.set(s, s * 0.9, s); m.visible = s > 0.01;
    });
  }
  function dispose() {
    geoS.dispose(); geoW.dispose(); matS.dispose(); matW.dispose();
    if (saved.dir) sh.uLightDir.value.copy(saved.dir);
    if (saved.col) sh.uLightCol.value.copy(saved.col);
    if (saved.rimDir) sh.uRimDir.value.copy(saved.rimDir);
    if (saved.rimCol) sh.uRimCol.value.copy(saved.rimCol);
    engine.sun = saved.sun;
  }
  return { group, update, dispose };
}
