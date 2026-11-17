// The island the cutscene opens and returns to: the site's snow under a pale sky, the pink carousel of the Aether-Lang lab behind the dock, the lab and
// town neighbours from lib/world/places.js at their offsets from the dock, snow rocks, a bench and two signs. Built in the rig frame (the dock at the
// origin, metres, +z toward the lens) and stood at DOCK by build.js. Props are merged into vertex-coloured sets: one ink hull per set.
import { BackSide, BoxGeometry, BufferAttribute, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Euler, Group, IcosahedronGeometry, Matrix4, Mesh, Quaternion, ShaderMaterial, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { groundShadow } from "../../../pup.js";
import { PAL } from "../palette.js";
import { tone } from "../tone.js";
import { BACK, DOCK, HIT, SEAL } from "../clock.js";
import { PLACES } from "../../../../world/places.js";

const LAB = 1.7, LAB_AT = [0, 0, -6.6]; // the lab centre (-44, -26) from the dock (-44, -19.4), at the lab's scale
const TIER_Y = 2.35, PLATFORM_TOP = 0.35, DRUM_H = TIER_Y - PLATFORM_TOP, RIM_Y = 5.4, CAGE_H = RIM_Y - TIER_Y, POLE_H = RIM_Y - PLATFORM_TOP;
const RING = 1.7, SUPPORT_R = 1.93, WINDOW_R = 1.96, WINDOW_Y = PLATFORM_TOP + DRUM_H * 0.55, POLE_TOP_R = 0.17;
const SUN = new Vector3(-14, 26, 12).normalize();
const SNOW_LIN = [1.2673, 1.1761, 1.2441], SKY_LOW = "#f4eef8", SKY_TOP = "#cfe0f6"; // linear before siteTone: prints #f7eff5 (tone.js)
const NEAR_M = 150, HOUSES = ["#f2d6e8", "#d9e4f2", "#f6e3d0"], ROOF = "#4fb3c8", MOUND = "#f6eef4", ROCK = "#e6e3ee", WOOD = "#c49c83", CHARCOAL = "#43434c", CRATE = "#b9a7b8", LAMP = "#fff1fc";
const SKY_VERT = /* glsl */ `varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const SKY_FRAG = /* glsl */ `varying vec3 vW; uniform vec3 uLow, uTop; void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uLow, uTop, smoothstep(0.0, 0.1, h)), 1.0); }`;
const TOON_VERT = /* glsl */ `varying vec3 vN; void main() { vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TOON_FRAG = /* glsl */ `varying vec3 vN; uniform vec3 uCol, uSun; void main() { float lit = smoothstep(0.0, 0.06, dot(normalize(vN), uSun)); gl_FragColor = vec4(uCol * mix(vec3(0.74, 0.7, 0.8), vec3(1.0), lit), 1.0); }`;
const SET_VERT = /* glsl */ `attribute vec3 aCol; varying vec3 vCol; varying vec3 vN; void main() { vCol = aCol; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SET_FRAG = /* glsl */ `varying vec3 vCol; varying vec3 vN; uniform vec3 uSun; void main() { float lit = smoothstep(0.0, 0.06, dot(normalize(vN), uSun)); gl_FragColor = vec4(vCol * mix(vec3(0.74, 0.7, 0.8), vec3(1.0), lit), 1.0); }`;
const HULL_VERT = /* glsl */ `uniform float uW; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW / length(modelMatrix[0].xyz), 1.0); }`;
const HULL_FRAG = /* glsl */ `uniform vec3 uCol; void main() { gl_FragColor = vec4(uCol, 1.0); }`;

const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

// a bag of pieces: each geometry is made non-indexed, moved into its frame and given the colour as an attribute, so a set merges to one draw
function bag() {
  const geos = [];
  return {
    geos,
    add(geo, hex, p, rot = [0, 0, 0], s = [1, 1, 1]) {
      const M = new Matrix4().compose(new Vector3(...p), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(...s));
      const g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      g.deleteAttribute("uv");
      g.applyMatrix4(M);
      const c = new Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) c.toArray(a, i * 3);
      g.setAttribute("aCol", new BufferAttribute(a, 3));
      geos.push(g);
      return this;
    },
  };
}

export function buildIsland() {
  const group = new Group(), made = [];
  const keep = (x) => (made.push(x), x);
  const toon = (hex) => keep(tone(keep(new ShaderMaterial({ vertexShader: TOON_VERT, fragmentShader: TOON_FRAG, uniforms: { uCol: { value: new Color(hex) }, uSun: { value: SUN } } }))));
  const set = keep(tone(keep(new ShaderMaterial({ vertexShader: SET_VERT, fragmentShader: SET_FRAG, uniforms: { uSun: { value: SUN } } }))));
  const hull = keep(tone(keep(new ShaderMaterial({ vertexShader: HULL_VERT, fragmentShader: HULL_FRAG, side: BackSide, uniforms: { uW: { value: 0.012 }, uCol: { value: new Color(PAL.text) } } }))));
  const addSet = (parent, b, ink) => {
    if (!b.geos.length) return;
    const g = mergeGeometries(b.geos, false);
    for (const x of b.geos) x.dispose();
    keep(g);
    parent.add(new Mesh(g, set));
    if (ink) parent.add(new Mesh(g, hull));
  };

  const lab = new Group();
  lab.scale.setScalar(LAB);
  lab.position.set(...LAB_AT);
  const labInk = bag(), labPlain = bag();
  labInk.add(new CylinderGeometry(1.9, 2.05, 0.35, 10), PAL.drum, [0, 0.175, 0]);
  labInk.add(new CylinderGeometry(SUPPORT_R, 1.9, DRUM_H, 10), PAL.drum, [0, PLATFORM_TOP + DRUM_H / 2, 0]);
  labInk.add(new CylinderGeometry(1.94, 1.94, 0.22, 10), PAL.accent, [0, 1.2, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    labPlain.add(new BoxGeometry(0.34, 0.42, 0.1), LAMP, [Math.sin(a) * WINDOW_R, WINDOW_Y, Math.cos(a) * WINDOW_R], [0, a, 0]);
  }
  labInk.add(new CylinderGeometry(0.14, POLE_TOP_R, POLE_H, 8), CHARCOAL, [0, PLATFORM_TOP + POLE_H / 2, 0]);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    labPlain.add(new CylinderGeometry(0.09, 0.09, CAGE_H, 8), i % 2 ? CHARCOAL : PAL.accent, [Math.sin(a) * SUPPORT_R, TIER_Y + CAGE_H / 2, Math.cos(a) * SUPPORT_R]);
  }
  labPlain.add(new TorusGeometry(1.95, 0.07, 6, 10), PAL.accent, [0, RIM_Y, 0], [Math.PI / 2, 0, 0]);
  labInk.add(new ConeGeometry(1.95, 1.3, 10), PAL.accent, [0, RIM_Y + 0.65, 0]);
  labPlain.add(new IcosahedronGeometry(0.17, 0), LAMP, [0, RIM_Y + 1.47, 0]);
  const spoke = RING - POLE_TOP_R, mid = POLE_TOP_R + spoke / 2;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI * 2) / 4;
    labPlain.add(new BoxGeometry(0.12, 0.12, spoke), CHARCOAL, [Math.sin(a) * mid, TIER_Y, Math.cos(a) * mid], [0, a, 0]);
  }
  labPlain.add(new TorusGeometry(RING, 0.07, 8, 20), CHARCOAL, [0, TIER_Y, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI * 2) / 10;
    labPlain.add(new IcosahedronGeometry(0.2, 0), LAMP, [Math.sin(a) * RING, TIER_Y, Math.cos(a) * RING]);
  }
  addSet(lab, labInk, true);
  addSet(lab, labPlain, false);
  group.add(lab);

  const town = bag();
  let houses = 0;
  for (const p of PLACES) {
    if (p.id === "p-aether-lang" || Math.hypot(p.x - DOCK[0], p.z - DOCK[2]) > NEAR_M) continue;
    const x = p.x - DOCK[0], z = p.z - DOCK[2];
    if (p.section === "upstream") {
      town.add(new SphereGeometry(1, 20, 12), MOUND, [x, 0, z], [0, 0, 0], [7, 1.5, 5]);
      town.add(new CylinderGeometry(1, 1, 1, 24, 1, true), p.radiation ?? MOUND, [x, 0.2, z], [0, 0, 0], [7.05, 0.4, 5.05]);
    } else {
      const k = houses++;
      town.add(new BoxGeometry(6, 5, 6), HOUSES[k % 3], [x, 2.5, z]);
      if (k % 3 === 2) town.add(new ConeGeometry(4.6, 3, 4), ROOF, [x, 6.5, z], [0, Math.PI / 4, 0]);
    }
  }
  for (let i = 0; i < 40; i++) {
    const a = i * 2.39996, r = 12 + 58 * Math.sqrt((i + 0.5) / 40), s = 0.4 + 1.2 * hash(i, 1);
    town.add(new IcosahedronGeometry(1, 0), ROCK, [Math.cos(a) * r, 0.3 * s, Math.sin(a) * r], [hash(i, 2) * 6.28, hash(i, 3) * 6.28, 0], [s, 0.6 * s, s]);
  }
  const townGroup = new Group();
  addSet(townGroup, town, true);
  group.add(townGroup);

  const sky = new Mesh(keep(new SphereGeometry(400, 24, 12)), keep(tone(keep(new ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: BackSide, depthWrite: false, uniforms: { uLow: { value: new Color(SKY_LOW) }, uTop: { value: new Color(SKY_TOP) } } })))));
  sky.frustumCulled = false;
  sky.renderOrder = -9;
  group.add(sky);

  const snowBase = new Color().setRGB(...SNOW_LIN), snowMat = toon("#ffffff");
  snowMat.uniforms.uCol.value.copy(snowBase);
  const ground = new Mesh(keep(new CircleGeometry(60, 48).rotateX(-Math.PI / 2)), snowMat);
  group.add(ground);

  const rig = new Group();
  rig.rotation.y = SEAL.yaw;
  group.add(rig);
  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  rig.add(shadow);
  made.push(shadow.geometry, shadow.material);
  const dock = bag();
  dock.add(new BoxGeometry(0.7, 0.7, 0.7), CRATE, [-2.4, 0.35, 1.6]);
  dock.add(new BoxGeometry(0.7, 0.7, 0.7), CRATE, [2.8, 0.35, 2.2]);
  dock.add(new BoxGeometry(1.6, 0.12, 0.42), CRATE, [1.6, 0.46, 2.6]);
  for (const dx of [-0.65, 0.65]) dock.add(new BoxGeometry(0.12, 0.44, 0.42), CRATE, [1.6 + dx, 0.22, 2.6]);
  dock.add(new BoxGeometry(1.8, 0.1, 0.45), WOOD, [-2.8, 0.5, -0.6]);
  dock.add(new BoxGeometry(1.8, 0.4, 0.08), WOOD, [-2.8, 0.85, -0.84]);
  for (const dx of [-0.7, 0.8]) dock.add(new BoxGeometry(0.1, 0.5, 0.4), WOOD, [-2.8 + dx, 0.25, -0.6]);
  for (const [x, z] of [[2.6, -1.3], [-1.9, -2.1]]) {
    dock.add(new CylinderGeometry(0.05, 0.05, 1.8, 6), CHARCOAL, [x, 0.9, z]);
    dock.add(new BoxGeometry(0.9, 0.6, 0.06), WOOD, [x, 1.5, z]);
  }
  addSet(rig, dock, true);

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
