// STAGE for pr-pyrefly-4180: the paper floor, the island ground under it, the back lamp and its halo, the smoke haze between the
// flats, and the end pillar with the flipping plaque. All of it animates (lamp, haze, sink), so every mesh is layer 1.
//
// MATHS
//   floor: r = |W.xz|; value ring s = mod(floor(r / 7 + .6 fbm3(W.xz * .08)), 3) -> deep | mid | lit (three card steps, wobbling rings)
//     col = ring * (.35 + .65 uLamp) + GOLD * uLamp * .35 * exp(-|W.xz - (0,-30)|^2 / 700)   (the lamp pools on the far floor)
//     cream die-cut rim where r > R - .5.
//   island ground: mix(NIGHT, PALE, uIsland), pale blue mottling .12 fbm3 (the home island coming back).
//   lamp halo (additive, alpha preserved): A(r) = (GOLD * .55 e^{-3 r^2} + HOT * 2.2 e^{-16 r^2}) * uLamp, r = 2|uv - .5|.
//   haze: additive EMBER * .22 * e^{-2.2 v} * fbm3((u .12 + .05 t, 2 v)) * (.3 + .7 uLamp), faded at both arc ends.
import {
  AddEquation, CircleGeometry, Color, CustomBlending, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, OneFactor, PlaneGeometry, ShaderMaterial,
  CanvasTexture, DataTexture, SRGBColorSpace, SphereGeometry, BoxGeometry, ZeroFactor, Vector2, RGBAFormat,
} from "three";
import { KIT, V } from "../../../paint.js";
import { C } from "./palette.js";

const ADD = { transparent: true, depthWrite: false, blending: CustomBlending, blendEquation: AddEquation, blendSrc: OneFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor };
const WV = "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";

export const STAGE_R = 58;

export function buildFloor(shared) {
  const mat = new ShaderMaterial({
    uniforms: { ...shared, uR: { value: STAGE_R } }, vertexShader: WV,
    fragmentShader: `uniform float uLamp, uR; varying vec3 vW; ${KIT}
      float fbm3(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vn(p); p = ROT * p; a *= 0.5; } return s; }
      void main() {
        float r = length(vW.xz);
        float ring = mod(floor(r / 7.0 + 0.6 * fbm3(vW.xz * 0.08)), 3.0);
        vec3 deep = ${V("#241833")}, mid = ${V(C.plum)}, lit = ${V("#3e2c58")};
        vec3 base = ring < 0.5 ? deep : (ring < 1.5 ? mid : lit);
        base *= mix(vec3(1.0), vec3(0.92, 0.85, 1.12), 0.25);
        vec2 lq = vW.xz - vec2(0.0, -30.0);
        vec3 col = base * (0.35 + 0.65 * uLamp) + ${V(C.lamp)} * uLamp * 0.35 * exp(-dot(lq, lq) / 700.0);
        col *= 0.94 + 0.1 * strokes(vW.xz * 2.5, 0.4, 0.9, 0.02);
        col = mix(col, ${V(C.cream)} * (0.5 + 0.5 * uLamp), smoothstep(uR - 0.5, uR - 0.3, r));
        gl_FragColor = vec4(min(col, vec3(1.3)), 0.5);
      }`,
  });
  const m = new Mesh(new CircleGeometry(STAGE_R, 96).rotateX(-Math.PI / 2), mat);
  m.frustumCulled = false;
  return { mesh: m, dispose() { mat.dispose(); m.geometry.dispose(); } };
}

export function buildIsland(shared) {
  const mat = new ShaderMaterial({
    uniforms: { ...shared }, vertexShader: WV,
    fragmentShader: `uniform float uIsland; varying vec3 vW; ${KIT}
      float fbm3(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vn(p); p = ROT * p; a *= 0.5; } return s; }
      void main() {
        vec3 night = ${V(C.night)} * (0.8 + 0.4 * fbm3(vW.xz * 0.05));
        vec3 pale = mix(${V(C.islandPale)}, ${V(C.islandBlue)}, 0.12 * fbm3(vW.xz * 0.04));
        gl_FragColor = vec4(mix(night, pale, smoothstep(0.0, 1.0, uIsland)), 0.5);
      }`,
  });
  const m = new Mesh(new CircleGeometry(380, 64).rotateX(-Math.PI / 2), mat);
  m.position.y = -0.06; m.frustumCulled = false;
  return { mesh: m, dispose() { mat.dispose(); m.geometry.dispose(); } };
}

export function buildLamp(shared) {
  const mat = new ShaderMaterial({
    ...ADD, side: DoubleSide, uniforms: { uLamp: shared.uLamp },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uLamp; varying vec2 vUv;
      void main() { float r = 2.0 * length(vUv - 0.5);
        vec3 a = (${V(C.lamp)} * 0.55 * exp(-3.0 * r * r) + ${V(C.lampHot)} * 2.2 * exp(-16.0 * r * r)) * uLamp * step(r, 1.0) * smoothstep(1.0, 0.7, r);
        gl_FragColor = vec4(a, 0.0); }`,
  });
  const m = new Mesh(new PlaneGeometry(110, 110), mat);
  m.frustumCulled = false; m.renderOrder = 5;
  m.onBeforeRender = (_r, _s, cam) => { m.quaternion.copy(cam.quaternion); };
  return { mesh: m, dispose() { mat.dispose(); m.geometry.dispose(); } };
}

// haze: open cylinder arcs behind the seal only (additive haze in front of the seal would milk it)
export function buildHaze(shared) {
  const group = new Group(), mats = [], geos = [];
  [[12, 7], [21, 9], [30, 11]].forEach(([R, h], i) => {
    const arc = 2.6, g = new CylinderGeometry(R, R, h, 48, 1, true, Math.PI - arc / 2, arc);
    const mat = new ShaderMaterial({
      ...ADD, side: DoubleSide, uniforms: { ...shared, uLen: { value: R * arc }, uSeed: { value: i * 3.3 } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uLamp, uT, uLen, uSeed; varying vec2 vUv; ${KIT}
        float fbm3(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * vn(p); p = ROT * p; a *= 0.5; } return s; }
        void main() {
          float n = fbm3(vec2(vUv.x * uLen * 0.12 + uT * 0.05 + uSeed, vUv.y * 2.0));
          float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
          vec3 a = ${V(C.ember)} * 0.22 * exp(-2.2 * vUv.y) * n * (0.3 + 0.7 * uLamp) * edge;
          gl_FragColor = vec4(a, 0.0); }`,
    });
    const m = new Mesh(g, mat); m.position.y = h / 2; m.frustumCulled = false; m.renderOrder = 4;
    mats.push(mat); geos.push(g); group.add(m);
  });
  return { group, dispose() { mats.forEach((m) => m.dispose()); geos.forEach((g) => g.dispose()); } };
}

// a three-step unlit paper material for 3D set pieces: step by the normal against a fixed key from the lamp side
function cardMat(shared, lit, mid, deep) {
  return new ShaderMaterial({
    uniforms: { ...shared, uLit: { value: new Color(lit) }, uMid: { value: new Color(mid) }, uDeep: { value: new Color(deep) } },
    vertexShader: "varying vec3 vN; varying vec3 vW; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform float uLamp; uniform vec3 uLit, uMid, uDeep; varying vec3 vN; varying vec3 vW;
      void main() { float l = dot(normalize(vN), normalize(vec3(0.3, 0.5, 0.8)));
        vec3 b = l > 0.35 ? uLit : (l > -0.2 ? uMid : uDeep);
        b *= mix(vec3(1.0), vec3(0.9, 0.82, 1.15), l > 0.35 ? 0.0 : 0.35);
        gl_FragColor = vec4(min(b * (0.35 + 0.65 * uLamp) + ${V(C.lamp)} * uLamp * 0.06, vec3(1.2)), 0.5); }`,
  });
}

function plaqueTexture() {
  if (typeof document === "undefined") {
    const d = new DataTexture(new Uint8Array([246, 236, 214, 255]), 1, 1, RGBAFormat); d.needsUpdate = true; return d;
  }
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 648;
  const g = cv.getContext("2d");
  g.fillStyle = C.cream; g.fillRect(0, 0, 1024, 648);
  g.strokeStyle = C.violet; g.lineWidth = 16; g.strokeRect(24, 24, 976, 600);
  g.lineWidth = 4; g.strokeRect(46, 46, 932, 556);
  // egg 2: the Konoha leaf: a spiral with the tail stroke, cut in plum
  g.strokeStyle = C.plum; g.lineWidth = 15; g.lineCap = "round";
  g.beginPath();
  for (let t = 0; t < 4 * Math.PI; t += 0.08) { const r = 6 + 11 * t / 2, x = 190 + r * Math.cos(t), y = 250 + r * Math.sin(t); t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  g.beginPath(); g.moveTo(190, 250 - 6); g.lineTo(300, 120); g.moveTo(190, 250 + 60); g.lineTo(190, 480); g.stroke();
  g.fillStyle = C.plum; g.textAlign = "left";
  g.font = "bold 58px Georgia, serif"; g.fillText("facebook/pyrefly", 380, 150);
  g.fillStyle = C.kurama; g.font = "bold 112px Georgia, serif"; g.fillText("#4180", 380, 270);
  // egg 6: hoop at link 100, chain total 208
  g.fillStyle = C.violet; g.font = "bold 150px Georgia, serif"; g.fillText("100", 380, 450);
  g.fillStyle = C.plum; g.font = "bold 150px Georgia, serif"; g.fillText("208", 700, 450);
  g.fillStyle = C.violet; g.font = "34px Georgia, serif"; g.fillText("hoop", 400, 500); g.fillText("links", 730, 500);
  g.fillStyle = "#ffb04a"; g.fillRect(660, 340, 6, 150);
  const tex = new CanvasTexture(cv); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// the end pillar: post, plinth, cap and a plaque on a vertical pivot (hinge.rotation.y = PI shows the plain plum back)
export function buildPillar(shared) {
  const group = new Group(), geos = [], mats = [];
  const violet = cardMat(shared, C.violet, "#3a2a52", "#241833"), cream = cardMat(shared, C.cream, "#cfc0a8", "#8a7898"), brass = cardMat(shared, C.lamp, "#c8863a", "#7a4a1a");
  const plum = cardMat(shared, "#3e2c58", C.plum, "#241833");
  mats.push(violet, cream, brass, plum);
  const box = (w, h, d, x, y, z, m) => { const g = new BoxGeometry(w, h, d); geos.push(g); const o = new Mesh(g, m); o.position.set(x, y, z); o.frustumCulled = false; group.add(o); return o; };
  box(0.9, 0.3, 0.9, 0, 0.15, 0, cream); box(0.38, 3.2, 0.38, 0, 1.9, 0, violet); box(0.7, 0.14, 0.7, 0, 3.53, 0, cream);
  const hinge = new Group(); hinge.position.set(0, 3.62, 0);
  const tex = plaqueTexture();
  const front = new ShaderMaterial({
    uniforms: { ...shared, tCard: { value: tex } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform sampler2D tCard; uniform float uLamp; varying vec2 vUv; void main() { vec3 c = texture2D(tCard, vUv).rgb; gl_FragColor = vec4(c * (0.6 + 0.4 * uLamp), 0.5); }",
  });
  mats.push(front);
  const pg = new PlaneGeometry(3.0, 1.9); geos.push(pg);
  const f = new Mesh(pg, front); f.position.z = 0.045; f.frustumCulled = false;
  const b = new Mesh(pg, plum); b.rotation.y = Math.PI; b.position.z = -0.045; b.frustumCulled = false;
  const slab = new BoxGeometry(3.06, 1.96, 0.08); geos.push(slab);
  const s = new Mesh(slab, cream); s.frustumCulled = false;
  hinge.add(s, f, b);
  for (const [x, y] of [[-1.4, 0.85], [1.4, 0.85], [-1.4, -0.85], [1.4, -0.85]]) { const g = new SphereGeometry(0.07, 8, 6); geos.push(g); const p = new Mesh(g, brass); p.position.set(x, y, 0.1); p.frustumCulled = false; hinge.add(p); }
  group.add(hinge);
  return { group, hinge, dispose() { mats.forEach((m) => m.dispose()); geos.forEach((g) => g.dispose()); tex.dispose(); } };
}

export { Vector2, MeshBasicMaterial };
