// The island the cutscene opens on and returns to: snow under a lavender sky, the pink carousel of the Aether-Lang lab behind the dock,
// and the dock props the seal stands on. Built in the rig frame (the dock at the origin, metres, +z toward the lens) and stood at DOCK by build.js;
// the lab's own constants from components/world/monuments/Aether.jsx.
import { BackSide, BoxGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Mesh, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { groundShadow } from "../../../pup.js";
import { PAL } from "../palette.js";
import { tone } from "../tone.js";
import { BACK, HIT, SEAL } from "../clock.js";

const LAB = 1.7, LAB_AT = [0, 0, -6.6]; // the lab centre (-44, -26) from the dock (-44, -19.4), at the lab's scale
const TIER_Y = 2.35, PLATFORM_TOP = 0.35, DRUM_H = TIER_Y - PLATFORM_TOP, RIM_Y = 5.4, CAGE_H = RIM_Y - TIER_Y, POLE_H = RIM_Y - PLATFORM_TOP;
const RING = 1.7, SUPPORT_R = 1.93, WINDOW_R = 1.96, WINDOW_Y = PLATFORM_TOP + DRUM_H * 0.55, POLE_TOP_R = 0.17;
const SUN = new Vector3(-14, 26, 12).normalize();
const SKY_VERT = /* glsl */ `varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const SKY_FRAG = /* glsl */ `varying vec3 vW; uniform vec3 uLow, uTop; void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uLow, uTop, smoothstep(0.0, 0.1, h)), 1.0); }`;
const TOON_VERT = /* glsl */ `varying vec3 vN; void main() { vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TOON_FRAG = /* glsl */ `varying vec3 vN; uniform vec3 uCol, uSun; void main() { float lit = smoothstep(0.0, 0.06, dot(normalize(vN), uSun)); gl_FragColor = vec4(uCol * mix(vec3(0.74, 0.7, 0.8), vec3(1.0), lit), 1.0); }`;
const HULL_VERT = /* glsl */ `uniform float uW; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW / length(modelMatrix[0].xyz), 1.0); }`;
const HULL_FRAG = /* glsl */ `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }`;

export function buildIsland() {
  const group = new Group(), made = [];
  const keep = (x) => (made.push(x), x);
  const toon = (hex) => keep(tone(keep(new ShaderMaterial({ vertexShader: TOON_VERT, fragmentShader: TOON_FRAG, uniforms: { uCol: { value: new Color(hex) }, uSun: { value: SUN } } }))));
  const hull = keep(tone(keep(new ShaderMaterial({ vertexShader: HULL_VERT, fragmentShader: HULL_FRAG, side: BackSide, uniforms: { uW: { value: 0.012 }, uCol: { value: new Color(PAL.text) } } }))));
  const pink = toon(PAL.drum), accent = toon(PAL.accent), charcoal = toon("#43434c"), lamp = toon("#fff1fc"), plank = toon("#cdbfc9"), crate = toon("#b9a7b8");
  const part = (parent, geo, m, p, rot = null, ink = true) => {
    keep(geo);
    const x = new Mesh(geo, m);
    x.position.set(...p);
    if (rot) x.rotation.set(...rot);
    if (ink) x.add(new Mesh(geo, hull));
    parent.add(x);
    return x;
  };

  const lab = new Group();
  lab.scale.setScalar(LAB);
  lab.position.set(...LAB_AT);
  part(lab, keep(new CylinderGeometry(1.9, 2.05, 0.35, 10)), pink, [0, 0.175, 0]);
  part(lab, keep(new CylinderGeometry(SUPPORT_R, 1.9, DRUM_H, 10)), pink, [0, PLATFORM_TOP + DRUM_H / 2, 0]);
  part(lab, keep(new CylinderGeometry(1.94, 1.94, 0.22, 10)), accent, [0, 1.2, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    part(lab, keep(new BoxGeometry(0.34, 0.42, 0.1)), lamp, [Math.sin(a) * WINDOW_R, WINDOW_Y, Math.cos(a) * WINDOW_R], [0, a, 0], false);
  }
  part(lab, keep(new CylinderGeometry(0.14, POLE_TOP_R, POLE_H, 8)), charcoal, [0, PLATFORM_TOP + POLE_H / 2, 0]);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    part(lab, keep(new CylinderGeometry(0.09, 0.09, CAGE_H, 8)), i % 2 ? charcoal : accent, [Math.sin(a) * SUPPORT_R, TIER_Y + CAGE_H / 2, Math.cos(a) * SUPPORT_R], null, false);
  }
  part(lab, keep(new TorusGeometry(1.95, 0.07, 6, 10)), accent, [0, RIM_Y, 0], [Math.PI / 2, 0, 0], false);
  part(lab, keep(new ConeGeometry(1.95, 1.3, 10)), accent, [0, RIM_Y + 0.65, 0]);
  part(lab, keep(new IcosahedronGeometry(0.17, 0)), lamp, [0, RIM_Y + 1.47, 0], null, false);
  const plat = new Group();
  plat.position.set(0, TIER_Y, 0);
  lab.add(plat);
  const spoke = RING - POLE_TOP_R, mid = POLE_TOP_R + spoke / 2;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI * 2) / 4;
    part(plat, keep(new BoxGeometry(0.12, 0.12, spoke)), charcoal, [Math.sin(a) * mid, 0, Math.cos(a) * mid], [0, a, 0], false);
  }
  part(plat, keep(new TorusGeometry(RING, 0.07, 8, 20)), charcoal, [0, 0, 0], [Math.PI / 2, 0, 0], false);
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI * 2) / 10;
    part(plat, keep(new IcosahedronGeometry(0.2, 0)), lamp, [Math.sin(a) * RING, 0, Math.cos(a) * RING], null, false);
  }
  group.add(lab);

  const sky = keep(new Mesh(keep(new SphereGeometry(400, 24, 12)), keep(tone(keep(new ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: BackSide, depthWrite: false, uniforms: { uLow: { value: new Color(PAL.skyLow) }, uTop: { value: new Color(PAL.skyTop) } } }))))));
  sky.frustumCulled = false;
  sky.renderOrder = -9;
  group.add(sky);

  const snowBase = new Color(PAL.snow), snowMat = toon(PAL.snow);
  const ground = keep(new Mesh(keep(new CircleGeometry(60, 48).rotateX(-Math.PI / 2)), snowMat));
  group.add(ground);

  const rig = new Group();
  rig.rotation.y = SEAL.yaw;
  group.add(rig);
  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  rig.add(shadow);
  made.push(shadow.geometry, shadow.material);
  for (const z of [-1.05, -0.35, 0.35, 1.05]) part(rig, keep(new BoxGeometry(2.8, 0.08, 0.6)), plank, [0, 0.04, z]);
  part(rig, keep(new BoxGeometry(0.7, 0.7, 0.7)), crate, [-2.4, 0.35, 1.6]);
  part(rig, keep(new BoxGeometry(0.7, 0.7, 0.7)), crate, [2.8, 0.35, 2.2]);
  part(rig, keep(new BoxGeometry(1.6, 0.12, 0.42)), crate, [1.6, 0.46, 2.6]);
  for (const dx of [-0.65, 0.65]) part(rig, keep(new BoxGeometry(0.12, 0.44, 0.42)), crate, [1.6 + dx, 0.22, 2.6]);

  return {
    group,
    update(t) {
      group.visible = !(t >= HIT.impact + 2 / 24 && t < BACK);
      snowMat.uniforms.uCol.value.copy(snowBase).multiplyScalar(t >= BACK ? Math.pow(0.88, 2.2) : 1);
    },
    dispose() {
      for (const x of made) x.dispose();
      group.removeFromParent();
    },
  };
}
