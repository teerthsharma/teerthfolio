// THE FJORD WATER and the DRIFT ICE (bible 3.4, 3.5).
// WATER (a flat plane at y = -0.55, set id 0.5, layer 0):
//   base = mix(#0e4a5c, #0a3446, smooth(10, 220, dist))                       black-teal, nearly flat
//   streaks: s = vn(x .9 + .05 T, z 16), edge smoothstep(.84 +- fwidth); base *= 1 + .06 streak       1 px horizontal lines at 6% value
//   bank reflection: base *= 1 - .28 exp(-dBank / 2.5), dBank = distance to the nearest bank        cliff reflection dark at the near edge
//   sun path: ang = |asin(cross(v, hs))| for v the unit ground ray camera -> point, hs the sun azimuth; path = 1 - smooth(.012, .03, ang)
//             dashes = step(.62, vn(x 2.2 + floor(12 T) .7, z .9))           broken glints on twos; base = mix(base, #ffb978, .25 path (.4 + .6 dashes) smooth(8, 40, dist))
//   Vinland glint: the same construction toward (0, -150), colour #ffd37a, strength uVin, only between the camera and Vinland.
//   far-shore film: mix(base, haze, .5 smooth(80, 300, dist)), haze apricot toward the sun and #7d8fd0 away (bible 3.20).
//   No granulation (halved to zero: the reference water is flat).
// ICE: 14 faceted slabs 0.45-2.2 m, top #f6f4fb, side #7fb6c4, 4 cm above the water, bobbing sin(.9 t) on twos. Layer 1.
import { CircleGeometry, CylinderGeometry, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from "three";
import { glslFor } from "../../../tools/index.js";
import { C, g, SUN, dirOf } from "./palette.js";
import { P, mergePainted } from "./lib.js";
import { WATER_Y, shoreL, shoreR } from "./terrain.js";

const FRAG = /* glsl */ `
  uniform float uT; uniform float uVin; uniform vec3 uSunDir; uniform vec2 uVinAt;
  varying vec3 vWP;
  ${glslFor(["noise"])}
  float smx(float a, float b, float x) { return smoothstep(a, b, x); }
  float mouthF(float z) { return smx(-118.0, -150.0, z); }
  float path(vec2 ray, vec2 hs) { float cr = ray.x * hs.y - ray.y * hs.x; return (1.0 - smx(0.012, 0.03, abs(asin(clamp(cr, -1.0, 1.0))))) * step(0.0, dot(ray, hs)); }
  void main() {
    vec3 vd = vWP - cameraPosition; float dist = length(vd.xz); vec2 ray = vd.xz / max(dist, 1e-3);
    vec3 base = mix(${g("waterNear")}, ${g("waterFar")}, smx(10.0, 220.0, dist));
    float s = vn(vec2(vWP.x * 0.9 + uT * 0.05, vWP.z * 16.0)), w = fwidth(s) * 1.5 + 1e-4;
    base *= 1.0 + 0.06 * smoothstep(0.84 - w, 0.84 + w, s);
    float m = mouthF(vWP.z), sl = -6.0 - 80.0 * m, sr = 15.0 - 6.0 * smx(-15.0, -95.0, vWP.z) + 80.0 * m;
    float dBank = min(vWP.x - sl, sr - vWP.x);
    base *= 1.0 - 0.28 * exp(-max(dBank, 0.0) / 2.5);
    float dash = step(0.62, vn(vec2(vWP.x * 2.2 + floor(uT * 12.0) * 0.7, vWP.z * 0.9)));
    base = mix(base, ${g("sunPath")}, 0.25 * path(ray, normalize(uSunDir.xz)) * (0.4 + 0.6 * dash) * smx(8.0, 40.0, dist));
    vec2 toV = uVinAt - cameraPosition.xz; float dv = length(toV);
    float gv = path(ray, toV / max(dv, 1e-3)) * step(dist, dv) * smx(6.0, 30.0, dist);
    base = mix(base, ${g("vinCore")}, 0.55 * uVin * gv * (0.45 + 0.55 * dash));
    float sd = dot(vec3(ray.x, 0.0, ray.y), vec3(uSunDir.x, 0.0, uSunDir.z) / max(length(uSunDir.xz), 1e-3));
    vec3 hz = mix(${g("haze")}, ${g("horizon")}, smx(0.3, 0.95, sd));
    base = mix(base, hz, 0.5 * smx(80.0, 300.0, dist));
    gl_FragColor = vec4(base, 0.5);
  }`;

function floeGeo(seg, r, h) {
  const top = new CircleGeometry(r, seg).rotateX(-Math.PI / 2).translate(0, h / 2, 0);
  const side = new CylinderGeometry(r, r * 1.08, h, seg, 1, true);
  return mergePainted([P(top, C.ice, "#cfd5ee", { id: 0.5 }), P(side, C.iceSide, "#4e8ca0", { id: 0.5 })], "floe");
}

export function buildWater(ctx) {
  const { engine } = ctx;
  const group = new Group();
  const mat = new ShaderMaterial({
    uniforms: { uT: { value: 0 }, uVin: { value: 0 }, uSunDir: { value: new Vector3(...dirOf(SUN.az, SUN.el)) }, uVinAt: { value: new Vector2(0, -150) } },
    vertexShader: "varying vec3 vWP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: FRAG,
  });
  const water = new Mesh(new PlaneGeometry(900, 900).rotateX(-Math.PI / 2), mat);
  water.position.set(0, WATER_Y, -150); water.frustumCulled = false; water.userData.layer = 0; water.name = "fjord";
  group.add(water);

  // 14 floes near the camera, away from the seal, the orca circle (0.5, -0.3, r 3.3 + margin), the piers and the banks
  const R = ctx.rng(31), geos = [floeGeo(5, 1, 0.3), floeGeo(6, 1, 0.3), floeGeo(7, 1, 0.3)];
  const fmat = engine.prop(geos[0], 0.5).material;
  const floes = [];
  for (let tries = 0; floes.length < 14 && tries < 400; tries++) {
    const x = -4.5 + R() * 18, z = -22 + R() * 34, r = 0.22 + R() * R() * 0.9;
    if (x < shoreL(z) + 2 + r || x > shoreR(z) - 1.5) continue;
    if (Math.hypot(x, z) < 5.2 + r) continue;                       // never near the hero seal
    if (Math.hypot(x - 0.5, z + 0.3) < 6.4 + r) continue;           // the orca's circle
    if (Math.abs(z) < 2.2 + r && x < 3.0) continue;                  // the jetty
    if (z > 1.6 && z < 4.8 + r && x < 0.5) continue;                 // the empty second pier
    if (floes.some((f) => Math.hypot(f.x - x, f.z - z) < 1.6 + f.r + r)) continue;
    const m = new Mesh(geos[floes.length % 3], fmat);
    m.userData.sharedGeo = true; m.userData.sharedMat = true; m.userData.layer = 1;
    m.scale.set(r, 1, r * (0.7 + 0.5 * R())); m.rotation.y = R() * 6.28;
    group.add(m); floes.push({ m, x, z, r, ph: R() * 6.28, spin: (R() - 0.5) * 0.04 });
  }
  function update(t, cue, vinK) {
    mat.uniforms.uT.value = t; mat.uniforms.uVin.value = vinK;
    for (const f of floes) { // 4 cm above the water, bob on twos with a little lag per floe
      f.m.position.set(f.x, WATER_Y + 0.04 - 0.1 + 0.03 * Math.sin(0.9 * (t - f.ph * 0.1) + f.ph), f.z);
      f.m.rotation.z = 0.02 * Math.sin(0.7 * t + f.ph);
    }
  }
  function dispose() { mat.dispose(); water.geometry.dispose(); geos.forEach((q) => q.dispose()); fmat.dispose(); }
  return { group, update, dispose, floes };
}
