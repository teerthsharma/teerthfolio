// The sky boost over the live dome: a sun bloom and a horizon cloud sea from the shader table, and a second cumulus deck from the live sky functions.
import { AdditiveBlending, BackSide, Group, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from "three";
import { SKY, SUN_U, rgb } from "../live/shade.js";
import { T } from "../live/path.js";
import { DOCK, rotY, TURN, warp } from "../clock.js";
import { pulled } from "./depth.js";

const CORE_Y = 0.9, SUN_D = 190, UP = new Vector3(0, 1, 0);

const DECK_V = "varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const DECK_F = /* glsl */ `
  uniform float uTime;
  varying vec3 vD;
  ${SKY}
  void main() {
    vec3 d = normalize(vD);
    float h = d.y;
    vec2 q = vec2(atan(d.x, -d.z) * 1.6, h * 5.0) * vec2(1.7, 3.1);
    float cl = sFbm(q + vec2(3.0 + uTime * 0.004, 0.0));
    float cm = smoothstep(0.52, 0.72, cl) * smoothstep(0.02, 0.14, h) * (1.0 - smoothstep(0.55, 0.9, h)) * 0.4;
    float belly = smoothstep(0.62, 0.52, sFbm(q + vec2(3.0, 0.5)));
    vec3 cc = mix(vec3(1.0, 0.86, 0.72), vec3(1.0, 0.5, 0.52), belly);
    cc = mix(cc, vec3(1.0, 0.8, 0.45), pow(max(dot(d, uSun), 0.0), 3.0));
    gl_FragColor = vec4(pow(cc, vec3(2.2)) * cm, cm);
  }`;
const CARD_V = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

export default function buildSkyBoost(ctx) {
  const group = new Group();
  const made = [];
  const sunGlsl = pulled(["ufoBloom"]);
  const seaGlsl = pulled(["shinCloudSea"]);

  const sunDir = new Vector3(-0.78, 0.09, -0.62).normalize().applyAxisAngle(UP, TURN);
  let sun = null;
  if (sunGlsl) {
    sun = new Mesh(new PlaneGeometry(1, 1), new ShaderMaterial({
      uniforms: { uUfoBloomK: { value: 0.6 }, uUfoSeed: { value: 3244 } },
      transparent: true, depthWrite: false, depthTest: false, blending: AdditiveBlending, premultipliedAlpha: true,
      vertexShader: CARD_V,
      fragmentShader: `varying vec2 vUv;\n${sunGlsl}\nvoid main() { float d = length(vUv * 2.0 - 1.0); gl_FragColor = vec4(ufoBloom(vec3(0.0), vec3(1.0, 0.7, 0.32), d, 0.9), 0.0); }`,
    }));
    sun.scale.setScalar(120);
    sun.position.copy(sunDir).multiplyScalar(SUN_D).add(new Vector3(0, CORE_Y, 0));
    sun.renderOrder = -2.5;
    group.add(sun);
    made.push(sun.geometry, sun.material);
  }

  const deck = new Mesh(new SphereGeometry(188, 40, 16), new ShaderMaterial({
    uniforms: { uSun: SUN_U, uTime: { value: 0 } },
    vertexShader: DECK_V, fragmentShader: DECK_F, side: BackSide, transparent: true, depthWrite: false, premultipliedAlpha: true,
  }));
  deck.position.set(0, CORE_Y, 0);
  deck.renderOrder = -2;
  group.add(deck);
  made.push(deck.geometry, deck.material);

  let sea = null;
  if (seaGlsl) {
    sea = new Mesh(new PlaneGeometry(330, 40), new ShaderMaterial({
      uniforms: { uShinSeed: { value: 3244 }, uShinSun: { value: new Vector2(0.5, 0.2) }, uShinNight: { value: 0 }, uShinSeaTop: { value: 0.07 } },
      vertexShader: CARD_V,
      fragmentShader: `varying vec2 vUv;\n${seaGlsl}\nvoid main() { gl_FragColor = vec4(shnSea(vUv, 0.0, vec3(1.0, 0.063, 0.275)), 0.99); }`,
    }));
    sea.position.set(sunDir.x * 185, 20, sunDir.z * 185);
    sea.lookAt(0, 20, 0);
    group.add(sea);
    made.push(sea.geometry, sea.material);
  }

  const haze = [];
  const hazeGlsl = pulled(["mist"]);
  if (hazeGlsl) {
    for (const [dist, hex, a, seed] of [[120, "#ffb86b", 0.12, 3.1], [220, "#fa947f", 0.16, 4.7], [330, "#fa947f", 0.2, 6.3]]) {
      const [r, g, b] = rgb(hex).map((v) => v.toFixed(4));
      const mat = new ShaderMaterial({
        transparent: true, depthWrite: false, premultipliedAlpha: true,
        vertexShader: CARD_V,
        fragmentShader: `varying vec2 vUv;\n${hazeGlsl}\nvoid main() { float k = mist(vUv, 11.0, ${seed.toFixed(2)}) * ${a.toFixed(3)}; gl_FragColor = vec4(pow(vec3(${r}, ${g}, ${b}), vec3(2.2)) * k, k); }`,
      });
      const card = new Mesh(new PlaneGeometry(330, 30), mat);
      card.position.set(0, 12, -6 - dist);
      card.visible = false;
      group.add(card);
      haze.push(card);
      made.push(card.geometry, mat);
    }
  }

  const cam = new Vector3();
  const toRig = (p) => rotY(-TURN, [p.x - DOCK[0], p.y, p.z - DOCK[2]]);
  return {
    group,
    update(tc, camPos) {
      group.visible = tc >= 1.15 && warp(tc) < T.swap;
      for (const c of haze) c.visible = tc >= 1.6 && tc < 15.0;
      deck.material.uniforms.uTime.value = tc;
      if (camPos) {
        const r = toRig(camPos);
        cam.set(r[0], r[1], r[2]);
        if (sun) sun.lookAt(cam);
        deck.visible = cam.length() < 185;
      }
    },
    dispose() {
      for (const g of made) g.dispose();
    },
  };
}
