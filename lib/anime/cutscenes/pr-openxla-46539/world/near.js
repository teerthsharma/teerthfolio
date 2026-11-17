// The foreground and the road of the Kamino avenue, printed: rubble mounds in both lower corners (the live mesh and ink hull),
// wet-road puddles with a yellow streak, four sagging cables across the top and the kerb ink lines. The lens ray and the seal's
// space stay clear, so the foreground frames the pup without covering it.
import { BoxGeometry, CatmullRomCurve3, CircleGeometry, DodecahedronGeometry, Group, Mesh, PlaneGeometry, RingGeometry, ShaderMaterial, TubeGeometry, Vector3 } from "three";
import { PAL, PRINT, SH } from "../live/print.js";
import { build, hullMaterial, tag, worldMaterial } from "../live/mesh.js";
import { hash } from "../live/support.js";
import { LENS, OFF } from "../clock.js";
import { tone } from "../tone.js";

const PRINT_V = /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const KEY = [0, 0, 0, 1];
const SKY_TONE = [0.8, 0.55, 0, 0.3];
const LAMP = [0, 0.06, 1, 0];
const CABLE_Z = [-10, -22, -40, -62];
const PUDDLE_N = 9, MOUND_N = 14;

// a flat, unlit print of one CMYK tone, the press's halftone and the id channel of every page surface
const printMat = (cmyk) => tone(new ShaderMaterial({
  uniforms: { ...SH },
  vertexShader: PRINT_V,
  fragmentShader: `${PRINT}\nvoid main() { vec3 c = inkPrint(vec4(${cmyk.join(", ")})); gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 0.99); }`,
}));

export function buildNear(_shared, KN = 1) {
  const group = new Group(), made = [], mats = [];
  group.userData.tier = 2;
  group.visible = !OFF.has("near");
  const HW = 4.4 * KN;
  const eye = LENS.w[0];
  const mount = (geo, m) => { const x = new Mesh(geo, m); x.frustumCulled = false; group.add(x); made.push(geo); mats.push(m); return x; };
  const flatOn = (geo, x, z, y = 0.03, sx = 1, sz = 1) => geo.rotateX(-Math.PI / 2).scale(sx, 1, sz).translate(x, y, z);

  const mounds = [];
  for (let i = 0; i < MOUND_N; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (3.2 + (4.4 * KN + 1.5 - 3.2) * hash(i, 51));
    const z = 2 - 11 * hash(i, 52);
    if (Math.hypot(x, z) < 2.4) continue;
    if (Math.abs(x - (eye[0] * z) / eye[2]) < 1.5) continue;
    const r = 0.5 + 0.9 * hash(i, 53);
    mounds.push(tag(new DodecahedronGeometry(r, 0).scale(1.2, 0.6, 1).rotateY(hash(i, 54) * 3).translate(x, 0.2, z), PAL.rubble));
  }
  if (mounds.length) {
    const body = build(mounds, 0.02);
    mount(body, tone(worldMaterial()));
    mount(body, tone(hullMaterial())).renderOrder = -0.5;
  }

  for (let i = 0; i < PUDDLE_N; i++) {
    const x = (hash(i, 61) - 0.5) * 2 * HW * 0.8;
    const z = -4 - 46 * hash(i, 62);
    const rx = 1.5 + 2.5 * hash(i, 63), rz = rx * 0.45;
    mount(flatOn(new CircleGeometry(1, 28), x, z, 0.02, rx, rz), printMat(SKY_TONE));
    mount(flatOn(new RingGeometry(0.93, 1.0, 28), x, z, 0.025, rx, rz), printMat(KEY));
    mount(flatOn(new PlaneGeometry(0.3, 2.4), x, z - 0.8, 0.03), printMat(LAMP));
  }

  const L = HW + 0.2;
  for (const z of CABLE_Z) {
    const pts = Array.from({ length: 9 }, (_, k) => {
      const x = -L + (2 * L * k) / 8;
      return new Vector3(x, 7 - 1.2 * (1 - (x / L) ** 2), z);
    });
    mount(new TubeGeometry(new CatmullRomCurve3(pts), 32, 0.04, 5), printMat(KEY));
  }

  for (const side of [-1, 1]) mount(new BoxGeometry(0.12, 0.03, 95).translate(side * (HW + 0.06), 0.015, -47.5), printMat(KEY));

  return {
    group,
    update() { if (OFF.has("near")) group.visible = false; },
    dispose() { for (const g of made) g.dispose(); for (const m of mats) m.dispose(); },
  };
}
