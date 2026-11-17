// The island the cutscene opens on and returns to: the site's height field round the Highway dock, the sea, the ice wall, MujoRush's granite with its eyes and floaters, and the roundabout (road.js).
import { BackSide, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, Mesh, Object3D, OctahedronGeometry, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildIceWall } from "../../../../../components/world/land/parts/dam-wall.js";
import { buildStone, CRYSTALS, EYES, FACES, FLOATERS, SPARKS, TALUS } from "../../../../../components/world/land/parts/mujorush-build.js";
import { HIGHWAY } from "../../../../../lib/world/land.js";
import { ROAD_Y } from "../../../../../lib/world/highwayCars.js";
import { fbm, groundAt, WATER_Y } from "../../../../../lib/world/terrain.js";
import { glslFor } from "../../../tools/index.js";
import { groundShadow } from "../../../pup.js";
import { DOCK, rotY, TURN, W } from "../clock.js";
import { toneAll } from "../tone.js";
import { buildRoad, litMaterial, tint, updateRoad } from "./road.js";
import { pulled } from "./depth.js";

const lin = (hex) => new Color(hex);
const K = { snow: lin("#f7f0f2"), snowCool: lin("#e7e9f3"), rock: lin("#6f6a78"), rockLit: lin("#998881"), iceFace: lin("#9fcfeb"), iceDeep: lin("#62abd9"), glacier: lin("#89c2df"), wet: lin("#bccad8"), bed: lin("#7aa0b3"), bedDeep: lin("#2b5a72") };
const ICE = { top: lin("#eaf8ff"), mid: lin("#9ad3f2"), side: lin("#78bde8") };
const RAD = FACES[0].place.radiation;
const RAD_C = lin(RAD);
const EYE_HEX = "#b86f2b", SPARK_HEX = "#ddd4cc", ROCK_HEX = "#a89c96";
const GRANITE_C = lin("#b0a49d"), BLUE_C = lin("#8fa7ff");
const s01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a, b) => { const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); };
const SKY_F = /* glsl */ `
  varying vec3 vW; uniform vec3 uSky, uHigh;
  void main() { float h = normalize(vW - cameraPosition).y; gl_FragColor = vec4(mix(uSky, uHigh, smoothstep(0.02, 0.7, h)), 0.0); }`;
const SKY_V = /* glsl */ "varying vec3 vW; void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }";
const FLAT_V = "varying vec3 vC; void main() { vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }";
const FLAT_F = "varying vec3 vC; void main() { gl_FragColor = vec4(vC, 0.99); }";
const dummy = new Object3D(), tmp = new Color();
const q12 = (tc) => Math.floor(tc * 12 + 1e-6) / 12;

function terrain(x0, x1, z0, z1) {
  const nx = x1 - x0 + 1, nz = z1 - z0 + 1, n = nx * nz, P = new Float32Array(n * 3), G = new Array(n), o = {};
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix;
    let x = x0 + ix, z = z0 + iz;
    groundAt(x, z, o);
    if (o.mount > 0.02 && ix && iz && ix < nx - 1 && iz < nz - 1) { x += (rnd(x + 140, z + 152) - 0.5) * 0.62; z += (rnd(z + 152.5, x + 140) - 0.5) * 0.62; groundAt(x, z, o); }
    P.set([x, o.h - (o.stuff === 3 && o.mount > 0.02 ? 0.5 : 0), z], i * 3);
    G[i] = { gap: o.gap, mount: o.mount, stuff: o.stuff, glacier: o.glacier };
  }
  const pos = [], nor = [], col = [], c = new Color(), A = new Vector3(), B = new Vector3(), C = new Vector3(), N = new Vector3();
  const tri = (i0, i1, i2) => {
    A.fromArray(P, i0 * 3); B.fromArray(P, i1 * 3); C.fromArray(P, i2 * 3);
    N.copy(B).sub(A).cross(C.clone().sub(A)).normalize();
    const g = G[i0], h = (A.y + B.y + C.y) / 3, x = (A.x + B.x + C.x) / 3, z = (A.z + B.z + C.z) / 3, relief = G[i0].mount > 0.02 || G[i1].mount > 0.02 || G[i2].mount > 0.02;
    if (g.gap < 0 && h < -0.25) c.copy(K.bed).lerp(K.bedDeep, s01(-0.9, -2.6, h));
    else if (relief && g.mount > 0.2) {
      const steep = s01(0.8, 0.62, N.y);
      if (g.stuff === 1) { c.copy(steep > 0.45 ? K.iceFace : K.snow).lerp(K.iceDeep, steep > 0.45 ? s01(0.55, 0.2, N.y) : 0); if (g.glacier > 0.5) c.copy(steep > 0.7 ? K.iceFace : K.glacier); }
      else c.copy(N.y < 0.52 ? K.rockLit : K.snow).lerp(K.rock, N.y < 0.52 ? 0.4 + 0.6 * rnd(i0, 1.7) : 0);
    } else {
      c.copy(K.snow).lerp(K.snowCool, 0.65 * s01(0.52, 0.8, fbm((x * 0.8 + z * 0.6) / 24, (z * 0.8 - x * 0.6) / 5)));
      if (g.gap < 1.8) c.lerp(K.wet, s01(1.8, 0, g.gap) * 0.85);
    }
    for (const v of [A, B, C]) { pos.push(v.x, v.y, v.z); nor.push(...(relief ? [N.x, N.y, N.z] : [0, 1, 0])); col.push(c.r, c.g, c.b); }
  };
  for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
    const a = iz * nx + ix, b = a + 1, cc = a + nx, d = cc + 1, y = (i) => P[i * 3 + 1];
    if (Math.abs(y(a) - y(d)) < Math.abs(y(b) - y(cc))) { tri(a, cc, d); tri(a, d, b); } else { tri(a, cc, b); tri(b, cc, d); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

// the island's own frame: group in the rig (turned back by TURN), the site's world inside `land` (offset by the dock), so the dock is the rig's origin
export default function buildIsland() {
  const group = new Group(), land = new Group(), made = [];
  group.rotation.y = -TURN;
  land.position.set(-DOCK[0], 0, -DOCK[2]);
  group.add(land);
  const add = (g, m, parent = land) => { const x = new Mesh(g, m); x.frustumCulled = false; parent.add(x); made.push(g, m); return x; };
  const inst = (g, m, n) => { const x = new InstancedMesh(g, m, n); x.frustumCulled = false; land.add(x); made.push(g, m); return x; };
  const iceSss = glslFor(["iceSss"]).replace("uniform float uEmit;", "");
  const sea = new PlaneGeometry(900, 900).rotateX(-Math.PI / 2).translate(DOCK[0], WATER_Y, DOCK[2]);
  add(tint(sea, "#37b4c8"), litMaterial({ unlit: 1, side: DoubleSide }));
  add(terrain(-96, 8, -80, 2), litMaterial({ shade: [0.84, 0.82, 0.9] }));

  const ice = buildIceWall();
  const flatIce = ice.index ? ice.toNonIndexed() : ice;
  flatIce.computeVertexNormals();
  const nrm = flatIce.attributes.normal, iceCol = new Float32Array(nrm.count * 3);
  for (let i = 0; i < nrm.count; i++) {
    const y = nrm.getY(i), c = y > 0.7 ? ICE.top : y < 0.3 ? ICE.side : ICE.mid;
    iceCol.set([c.r, c.g, c.b], i * 3);
  }
  flatIce.deleteAttribute("uv");
  flatIce.setAttribute("color", new Float32BufferAttribute(iceCol, 3));
  add(flatIce, litMaterial({ gloss: 1, shade: [0.6, 0.7, 0.95], extra: `${iceSss}\nvec3 finish(vec3 c, vec3 n, vec3 v) { return mix(c, c * (0.5 + iceSss(n, uSun, v)), 0.35); }` }));

  const cliff = buildStone();
  const stone = cliff.stone;
  if (!stone.attributes.color) tint(stone, "#998881");
  add(stone, litMaterial({ gloss: 0.1, shade: [0.78, 0.7, 0.66], sunC: [0.55, 0.5, 0.42] }));
  add(tint(cliff.inlay, "#1c1824"), litMaterial({ gloss: 0.4 }));
  add(tint(cliff.gems, RAD), litMaterial({ emit: 0.8 }));
  add(tint(mergeGeometries(cliff.glows), RAD), litMaterial({ emit: 0.7 }));

  const eyeGeo = new SphereGeometry(1, 20, 14), eyeMat = new ShaderMaterial({ vertexShader: FLAT_V, fragmentShader: FLAT_F });
  const eyes = inst(eyeGeo, eyeMat, EYES.length + SPARKS.length);
  EYES.forEach((_, i) => eyes.setColorAt(i, lin(EYE_HEX)));
  SPARKS.forEach((sp, i) => eyes.setColorAt(EYES.length + i, sp.evil ? RAD_C : lin(SPARK_HEX)));

  const talus = inst(tint(new IcosahedronGeometry(1, 0), ROCK_HEX), litMaterial(), TALUS.length);
  TALUS.forEach((b, i) => {
    dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(b.rx, b.ry, 0); dummy.scale.set(b.r, b.r * 0.78, b.r * 0.92);
    dummy.updateMatrix(); talus.setMatrixAt(i, dummy.matrix);
  });
  talus.instanceMatrix.needsUpdate = true;
  const crystals = inst(tint(new OctahedronGeometry(1, 0), RAD), litMaterial({ emit: 0.8 }), CRYSTALS.length);
  CRYSTALS.forEach((c, i) => {
    dummy.position.set(c.x, c.y + c.h * 0.45, c.z); dummy.rotation.set(c.tilt * 0.5, c.ry, c.tilt); dummy.scale.set(c.r, c.h, c.r);
    dummy.updateMatrix(); crystals.setMatrixAt(i, dummy.matrix);
  });
  crystals.instanceMatrix.needsUpdate = true;
  const floaters = inst(tint(new IcosahedronGeometry(1, 0), "#ffffff"), litMaterial({ gloss: 0.1, emit: 0.1 }), FLOATERS.length);
  const spears = inst(tint(new OctahedronGeometry(1, 0), RAD), litMaterial({ emit: 0.8 }), FLOATERS.length);

  const road = buildRoad();
  land.add(road.group);
  made.push(...Object.values(road.parts).flat());

  // one haze card between the cliff foot and the ring, facing the credit lens; the table's mist, premultiplied
  const hazeGlsl = pulled(["mist"]);
  const haze = new Mesh(new PlaneGeometry(90, 10), new ShaderMaterial({
    uniforms: { uCol: { value: lin("#e7e9f3") } }, transparent: true, premultipliedAlpha: true, depthWrite: false,
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uCol; varying vec2 vUv;\n${hazeGlsl}\nvoid main() { float k = mist(vUv, 9.0, 3.24) * 0.18; gl_FragColor = vec4(uCol * k, k); }`,
  }));
  haze.material.userData.noTone = true;
  const [ex, , ez] = W([-2.446, 1.311, 7.263]);
  haze.position.set(-30, 3, -38);
  haze.rotation.y = Math.atan2(ex + 30, ez + 38);
  haze.visible = false;
  land.add(haze);
  made.push(haze.geometry, haze.material);
  const dome = new Mesh(new SphereGeometry(900, 24, 12), new ShaderMaterial({ uniforms: { uSky: { value: lin("#e9eef7") }, uHigh: { value: lin("#a4d0ee") } }, vertexShader: SKY_V, fragmentShader: SKY_F, side: BackSide, depthWrite: false }));
  dome.frustumCulled = false; dome.renderOrder = -9;
  group.add(dome);
  const shadow = groundShadow(1.0, 0.72, "#7c88c8", 0.5);
  shadow.position.set(0, 0.03, 0.05);
  group.add(shadow);

  const ringAt = (theta) => {
    const r = HIGHWAY.roundabout;
    return rotY(-TURN, [r.x + r.radius * Math.cos(theta) - DOCK[0], ROAD_Y, r.z + r.radius * Math.sin(theta) - DOCK[2]]);
  };
  const page = (on, pup = true) => { land.visible = !on; dome.visible = !on; shadow.visible = !on && pup; };
  // the eyes blink and the floaters bob on the 12 grid, one step per drawing
  const life = (tc) => {
    const c = q12(tc);
    EYES.forEach((eye, i) => {
      const period = 3.4 + eye.face * 0.7, beat = (c + eye.face * 1.9) % period;
      const shut = beat < 0.3 ? Math.sin((beat / 0.3) * Math.PI) : 0;
      dummy.position.set(eye.x, eye.y, eye.z); dummy.rotation.set(eye.rx, 0, 0); dummy.scale.set(eye.sx, eye.sy * (1 - 0.92 * shut), eye.sz);
      dummy.updateMatrix(); eyes.setMatrixAt(i, dummy.matrix);
      const sp = SPARKS[i];
      dummy.position.set(eye.x + sp.dx, eye.y + sp.dy * (1 - shut), eye.z + sp.dz); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(sp.r * (1 - shut));
      dummy.updateMatrix(); eyes.setMatrixAt(EYES.length + i, dummy.matrix);
    });
    eyes.instanceMatrix.needsUpdate = true;
    FLOATERS.forEach((b, i) => {
      dummy.position.set(b.x, b.y + Math.sin(c * b.speed + b.phase) * 0.35, b.z);
      dummy.rotation.set(c * 0.23 * b.speed + b.phase, c * 0.31 * b.speed + i, 0.3 * Math.sin(c * 0.4 + i));
      dummy.scale.set(b.r, b.r * 0.82, b.r * 0.94);
      dummy.updateMatrix(); floaters.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(b.r * 0.42, b.r * 1.45, b.r * 0.42);
      dummy.updateMatrix(); spears.setMatrixAt(i, dummy.matrix);
      tmp.copy(GRANITE_C).lerp(BLUE_C, 0.35).lerp(RAD_C, 0.16 + 0.12 * Math.sin(c * 1.3 + b.phase));
      floaters.setColorAt(i, tmp);
    });
    floaters.instanceMatrix.needsUpdate = true; spears.instanceMatrix.needsUpdate = true;
    if (floaters.instanceColor) floaters.instanceColor.needsUpdate = true;
  };
  life(0);
  toneAll(group);
  return {
    group,
    page,
    ringAt,
    update(tc) { updateRoad(road, tc); life(tc); haze.visible = tc >= 15.2; },
    dispose() {
      for (const x of made) x.dispose?.();
      shadow.geometry.dispose(); shadow.material.dispose();
      dome.geometry.dispose(); dome.material.dispose();
    },
  };
}
