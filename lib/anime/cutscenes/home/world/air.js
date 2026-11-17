// Mist and motes for home: two soft mist ribbons at the water line (apricot and lilac, drifting +x) and 40 slow cream specks.
// Premultiplied, layer 1, two draw calls; the ribbons show in the mist window, the specks are hidden in the rain.
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, Points, ShaderMaterial } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { U } from "../live/paper.js";
import { WATER_Y } from "../live/land.js";
import { ON, T, hash, within } from "../clock.js";

await loadPack("dock");
const KIT = glslFor(["dockSeaBreath", "dockBreathCurl"]);
const SPECKS = 40;

function ribbonGeometry() {
  const pos = [], uv = [], kind = [], idx = [];
  const ribbon = (z, top, k) => {
    const b = pos.length / 3;
    pos.push(-14, WATER_Y, z, 14, WATER_Y, z, -14, WATER_Y + top, z, 14, WATER_Y + top, z);
    uv.push(0, 0, 1, 0, 0, 1, 1, 1);
    kind.push(k, k, k, k);
    idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3);
  };
  ribbon(-20, 0.4, 0);
  ribbon(-55, 0.7, 1);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute("aKind", new BufferAttribute(new Float32Array(kind), 1));
  g.setIndex(idx);
  return g;
}

function speckGeometry() {
  const pos = new Float32Array(SPECKS * 3), seed = new Float32Array(SPECKS);
  for (let i = 0; i < SPECKS; i++) {
    pos.set([-9 + 16 * hash(i, 41), 0.2 + 3.8 * hash(i, 42), -7 + 10 * hash(i, 43)], i * 3);
    seed[i] = hash(i, 44);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new BufferAttribute(seed, 1));
  return g;
}

export function buildAir() {
  const ribbonGeo = ribbonGeometry();
  const ribbonMat = new ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aKind;
      varying vec2 vUv;
      varying vec3 vP;
      varying float vK;
      void main() {
        vUv = uv;
        vP = position;
        vK = aKind;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uT;
      varying vec2 vUv;
      varying vec3 vP;
      varying float vK;
      ${KIT}
      void main() {
        float cov = dkFogAmt(vec2(vP.x * 0.1 - uT * 0.05, (vP.y - (${WATER_Y.toFixed(3)})) * 0.6), uT);
        float edge = smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(0.8, 1.0, vUv.x)) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
        float a = cov * edge * (vK < 0.5 ? 0.14 : 0.12);
        vec3 col = vK < 0.5 ? vec3(1.0, 0.725, 0.541) : vec3(0.788, 0.765, 0.918);
        gl_FragColor = vec4(col * a, a);
      }`,
  });
  const ribbons = new Mesh(ribbonGeo, ribbonMat);
  ribbons.frustumCulled = false;

  const speckGeo = speckGeometry();
  const speckMat = new ShaderMaterial({
    uniforms: { uT: { value: 0 }, uRes: U.uRes },
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uT;
      uniform vec2 uRes;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y = 0.2 + mod(p.y - 0.2 + 0.03 * uT, 3.8);
        p.x += 0.2 * sin(uT * 0.4 + aSeed * 6.283);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = smoothstep(0.2, 0.7, p.y) * (1.0 - smoothstep(3.6, 4.0, p.y));
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.03 * uRes.y / (2.0 * 0.4877 * -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = (1.0 - smoothstep(0.3, 0.5, d)) * 0.7 * vA;
        gl_FragColor = vec4(vec3(1.0, 0.98, 0.949) * a, a);
      }`,
  });
  const specks = new Points(speckGeo, speckMat);
  specks.frustumCulled = false;

  const group = new Group();
  group.add(ribbons, specks);
  group.userData.layer = 1;
  group.userData.plateDepth = true;
  return {
    group,
    update(t) {
      ribbonMat.uniforms.uT.value = t;
      speckMat.uniforms.uT.value = t;
      ribbons.visible = within(ON.mist, t);
      specks.visible = !(t >= T.rain[0] && t < T.rain[1]);
    },
    dispose() {
      ribbonGeo.dispose();
      ribbonMat.dispose();
      speckGeo.dispose();
      speckMat.dispose();
    },
  };
}

export default buildAir;
