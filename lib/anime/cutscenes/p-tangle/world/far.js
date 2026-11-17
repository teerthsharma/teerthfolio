// Far depth behind the live horizon: two ridge cards in the sky's own violet haze, a cedar and a town strip on the far shore, and one painted cloud strip; the sun notch stays clear and the cards hide on island frames.
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, ShaderMaterial } from "three";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { fnClashes, loadPack } from "../../../tools/packs.js";
import { smooth } from "../clock.js";

await loadPack("bg");
await loadPack("shinkai");

const CARD = glslFor(["bgCardMountains"]);
const PINES = glslFor(["bgCardPines"]);
const ROOFS = glslFor(["bgCardRooftops"]);
const CLOUD = glslFor(["shinCloudPaint"]);
const ARC = (240 * Math.PI) / 180, SHORE_ARC = (200 * Math.PI) / 180, N = 96, SUN_AZ = 0.35, NOTCH = 0.3, TOWN_AZ = -0.165;
const CARDS = [
  { r: 205, y0: -4, h: 22, order: -2.5 },
  { r: 215, y0: -4, h: 30, order: -2.6 },
];
const SHORE = [
  { r: 196, y0: -3, h: 14, order: -2.4, fs: "pines" },
  { r: 192, y0: -3, h: 7, order: -2.3, fs: "roofs" },
];

function strip(r, arc, y0, y1, c0 = 0) {
  const pos = [], uv = [], aN = [], idx = [], aspect = (arc * r) / (y1 - y0);
  for (let c = 0; c <= N; c++) {
    const th = c0 - arc / 2 + (arc * c) / N, x = Math.sin(th) * r, z = -Math.cos(th) * r;
    const a = smooth(NOTCH, NOTCH + 0.15, Math.abs(th - SUN_AZ));
    for (let k = 0; k < 2; k++) {
      pos.push(x, y0 + (y1 - y0) * k, z);
      uv.push((c / N) * aspect, k);
      aN.push(a);
    }
  }
  for (let c = 0; c < N; c++) {
    const a = 2 * c, b = 2 * (c + 1);
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute("aN", new BufferAttribute(new Float32Array(aN), 1));
  g.setIndex(idx);
  return g;
}

const CARD_VS = "varying vec2 vUv; varying vec3 vW; varying float vA; attribute float aN; void main() { vUv = uv; vA = aN; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";
const CARD_FS = `
  varying vec2 vUv; varying float vA;
  uniform float uTw;
${CARD}
  void main() {
    vec4 c = bgCardMountains(vUv);
    vec3 haze = mix(vec3(0.42, 0.27, 0.62), vec3(0.12, 0.17, 0.47), uTw);
    c.rgb = mix(c.rgb, haze, 0.85);
    c.a *= 0.6;
    gl_FragColor = vec4(c.rgb, c.a * vA);
  }`;
const PINES_FS = `
  varying vec2 vUv; varying float vA;
  uniform float uTw;
${PINES}
  void main() {
    vec4 c = bgCardPines(vUv);
    c.rgb = mix(c.rgb, vec3(0.078, 0.118, 0.361), 0.5 * uTw);
    gl_FragColor = vec4(c.rgb, c.a * vA);
  }`;
const ROOFS_FS = `
  varying vec2 vUv; varying float vA;
  uniform float uTw, uTime;
${ROOFS}
  void main() {
    vec4 c = bgCardRooftops(vUv);
    float lamp = smoothstep(0.45, 0.8, c.g);
    vec3 flick = vec3(1.0, 0.753, 0.376) * (0.7 + 0.3 * sin(uTime * 2.0 + vUv.x * 90.0));
    c.rgb = mix(c.rgb * 0.5, flick, lamp);
    c.rgb = mix(c.rgb, vec3(0.078, 0.118, 0.361), 0.5 * uTw);
    gl_FragColor = vec4(c.rgb, c.a * vA);
  }`;
const SHORE_FS = { pines: PINES_FS, roofs: ROOFS_FS };

export function buildFar(ctx, U) {
  const group = new Group(), made = [];
  const names = ["bgCardMountains", "bgCardPines", "bgCardRooftops", "shinCloudPaint"];
  if (fnClashes(names).length) throw new Error(`p-tangle far: GLSL clash ${JSON.stringify(fnClashes(names))}`);
  const card = (geo, fs, order) => {
    const m = new ShaderMaterial({ uniforms: { ...U }, vertexShader: CARD_VS, fragmentShader: fs, transparent: true, depthWrite: false, side: DoubleSide });
    const mesh = new Mesh(geo, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    group.add(mesh);
    made.push(geo, m);
  };
  for (const c of CARDS) card(strip(c.r, ARC, c.y0, c.y0 + c.h), CARD_FS, c.order);
  for (const s of SHORE) card(strip(s.r, SHORE_ARC, s.y0, s.y0 + s.h, TOWN_AZ), SHORE_FS[s.fs], s.order);
  const cu = uniformsFor(["shinCloudPaint"]);
  cu.uShinCloudY = { value: 0.14 };
  cu.uShinDrift = { value: 0.004 };
  const cg = strip(190, Math.PI, 19.9, 47.4);
  const cm = new ShaderMaterial({
    uniforms: { ...U, ...cu },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime, uTw;
${CLOUD}
      void main() {
        vec3 c = shnCloud(vUv, uTime, vec3(0.0));
        gl_FragColor = vec4(c * 0.5 * (1.0 - uTw), 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const cloud = new Mesh(cg, cm);
  cloud.frustumCulled = false;
  cloud.renderOrder = -2.5;
  group.add(cloud);
  made.push(cg, cm);
  return {
    group,
    update(t, state) {
      if (state && !(state.inside && state.dis < 0.5)) group.visible = false;
    },
    dispose() { for (const x of made) x.dispose(); },
  };
}
