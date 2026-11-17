// The island the cutscene opens on and returns to: flat pastel snow, the pale cyan sky dome and the pup's contact shadow. Every solid is
// lit by one two-term light (LIGHT). LIGHT_TOP is fitted (tools/T7-island.mjs) so flat snow prints #f7f1f3 after the site's last stage.
import { BackSide, BufferAttribute, Color, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { groundShadow } from "../../../pup.js";
import { PAINT } from "../../../kit/bg/glsl.js";
import { BOOST } from "../clock.js";
import { tone } from "../tone.js";

export const ISLAND = { SNOW: "#f7f1f3", SKY: "#a3d4e2" };
const TOE = 0.04;
const GAIN = 1.055;
export const SUN = new Vector3(-14, 26, 12).normalize();
const SUN_C = new Vector3(0.62, 0.56, 0.44);
export const LIGHT_TOP = new Vector3(1.4106, 1.408, 1.4089); // solved by tools/T7-island.mjs: flat snow prints #f7f1f3
const SHADE = LIGHT_TOP.clone().sub(SUN_C.clone().multiplyScalar(SUN.y));

// the colour that enters the site's last stage (tone.js inverts it): pre(hex) prints hex, paint(hex) prints hex on a lit face
export function pre(hex) {
  return new Color(...new Color(hex).toArray().map((v) => (v + TOE) / GAIN));
}
export function paint(hex) {
  return new Color(...new Color(hex).toArray().map((v, i) => (v + TOE) / (GAIN * LIGHT_TOP.getComponent(i))));
}
export function tint(geo, col) {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([col.r, col.g, col.b], i * 3);
  geo.setAttribute("color", new BufferAttribute(a, 3));
  return geo;
}
export function toneMat(material) {
  tone(material);
  material.userData.toned = true;
  return material;
}

export const LIGHT = { uSun: { value: SUN }, uShade: { value: SHADE }, uSunC: { value: SUN_C }, uSky: { value: pre(ISLAND.SKY) } };

const VERT = /* glsl */ `
  attribute vec3 color; varying vec3 vW; varying vec3 vN; varying vec3 vC;
  void main() {
#ifdef USE_INSTANCING
    mat4 X = modelMatrix * instanceMatrix;
#else
    mat4 X = modelMatrix;
#endif
    vec4 w = X * vec4(position, 1.0);
    vW = w.xyz; vN = normalize(mat3(X) * normal); vC = color;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const LIT = /* glsl */ `
  varying vec3 vW; varying vec3 vN; varying vec3 vC;
  uniform vec3 uSun, uShade, uSunC, uSky;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 c = vC * (uShade + uSunC * max(dot(n, uSun), 0.0));
    c = mix(c, uSky, smoothstep(60.0, 260.0, distance(vW, cameraPosition)));
    gl_FragColor = vec4(c, 0.99);
  }`;
const PLAIN = /* glsl */ `
  void main() {
#ifdef USE_INSTANCING
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
#else
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
#endif
  }`;

// a lit solid, vertex-coloured (tint); instanced or not, the same material
export function solid() {
  return toneMat(new ShaderMaterial({ uniforms: { ...LIGHT }, vertexShader: VERT, fragmentShader: LIT }));
}
// an opaque emitter: its colour times level, no lighting
export function glow(hex, level = 1) {
  return toneMat(new ShaderMaterial({
    uniforms: { uCol: { value: new Color(hex) }, uLevel: { value: level } },
    vertexShader: PLAIN,
    fragmentShader: "uniform vec3 uCol; uniform float uLevel; void main() { gl_FragColor = vec4(uCol * uLevel, 0.99); }",
  }));
}
// a premultiplied overlay (its mesh is layer 1): emission times alpha, no depth write
export function glass(hex, alpha, { level = 1, side = DoubleSide } = {}) {
  return toneMat(new ShaderMaterial({
    uniforms: { uCol: { value: new Color(hex) }, uLevel: { value: level }, uA: { value: alpha } },
    vertexShader: PLAIN,
    fragmentShader: "uniform vec3 uCol; uniform float uLevel, uA; void main() { gl_FragColor = vec4(uCol * uLevel * uA, uA); }",
    transparent: true, depthWrite: false, premultipliedAlpha: true, side,
  }));
}

function skyDome() {
  const m = toneMat(new ShaderMaterial({
    uniforms: { uZen: { value: pre("#8cc6dc") }, uMid: { value: pre("#a3d4e2") }, uHor: { value: pre("#bfe3ec") } },
    vertexShader: "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }",
    fragmentShader: `varying vec3 vW; uniform vec3 uZen, uMid, uHor;
      void main() { float h = normalize(vW - cameraPosition).y; vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.3, h)); c = mix(c, uZen, smoothstep(0.3, 0.9, h)); gl_FragColor = vec4(c, 0.99); }`,
    side: BackSide, depthWrite: false,
  }));
  const dome = new Mesh(new SphereGeometry(400, 24, 12), m);
  dome.renderOrder = -9;
  dome.frustumCulled = false;
  return dome;
}

// the snow's shade side prints #cfdcf0 (the blue shadow the sheet takes from snowScatter); flat snow still prints LIGHT_TOP's #f7f1f3
const SNOW_LIN = new Color(ISLAND.SNOW).toArray(), SHADE_LIN = new Color("#cfdcf0").toArray();
export const GROUND_SHADE = new Vector3(...[0, 1, 2].map((i) => (LIGHT_TOP.getComponent(i) * SHADE_LIN[i]) / SNOW_LIN[i]));
export const GROUND_SUN = new Vector3(...[0, 1, 2].map((i) => (LIGHT_TOP.getComponent(i) - GROUND_SHADE.getComponent(i)) / SUN.y));
function snowMaterial() {
  return toneMat(new ShaderMaterial({ uniforms: { ...LIGHT, uShade: { value: GROUND_SHADE }, uSunC: { value: GROUND_SUN } }, vertexShader: VERT, fragmentShader: LIT }));
}
// eight gentle snow mounds (BOOST): a near, middle and far band on the plain
const MOUNDS = [[-14, -12], [-6, -20], [10, -16], [18, -9], [-20, -26], [4, -30], [24, -22], [-3, -38]];
function mounds() {
  const h = (i, k) => { const v = Math.sin(i * 91.7 + k * 47.3) * 43758.5453; return v - Math.floor(v); };
  return mergeGeometries(MOUNDS.map(([x, z], i) => {
    const g = new SphereGeometry(1, 16, 8).scale(2 + 3 * h(i, 1), 0.3 + 0.6 * h(i, 2), 2 + 3 * h(i, 3)).translate(x, 0, z);
    g.deleteAttribute("uv");
    g.computeVertexNormals();
    return tint(g, new Color(ISLAND.SNOW));
  }));
}

export function buildIsland(ctx) {
  const group = new Group(), made = [];
  const ground = new Mesh(tint(new PlaneGeometry(520, 520).rotateX(-Math.PI / 2).translate(0, 0, -30), new Color(ISLAND.SNOW)), snowMaterial());
  const dome = skyDome();
  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(ground, dome, shadow);
  made.push(ground.geometry, ground.material, dome.geometry, dome.material, shadow.geometry, shadow.material);
  if (BOOST) {
    const hills = new Mesh(mounds(), snowMaterial());
    group.add(hills);
    made.push(hills.geometry, hills.material);
    if (ctx?.bake) {
      const haze = new Color("#e8f4f8");
      const band = ctx.bake.card(`${PAINT}\nvec4 paint(vec2 p) { return vec4(${haze.r}, ${haze.g}, ${haze.b}, 0.55 * (1.0 - p.y)); }`, { w: 256, h: 32, size: [900, 30], id: 0, tools: ["noise"] });
      band.position.set(0, 15, -110);
      if (!band.material.userData.toned) toneMat(band.material);
      group.add(band);
      made.push(band.geometry, band.material);
    }
  }
  return {
    group,
    set(on, paleSealShown) {
      group.visible = on;
      shadow.visible = on && paleSealShown;
    },
    update() {},
    dispose() {
      for (const x of made) x.dispose();
    },
  };
}
