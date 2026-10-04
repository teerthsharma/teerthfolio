// THE LIGHT THAT MOVES: fireflies, sparkles (four-point glints on the water and in the air), the burst
// when the loops link, the comet (a head and a long braided tail, three pieces after it splits), the lens
// ghosts of the sun, and the title card of the dusk's end. All pooled and instanced; nothing allocates per
// frame and there is no post pass.

import { AdditiveBlending, CanvasTexture, Color, DoubleSide, InstancedMesh, Mesh, NormalBlending, Object3D, PlaneGeometry, SRGBColorSpace, ShaderMaterial, Vector3, Vector4 } from "three";
import { hash } from "./gl";
import { gridGeometry } from "./cord";

export const EYE = [0.3, 0.7, 9.6]; // the lens, in the rig frame (the card's wide view)
export const skyPos = (az, el, dist, out) => {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  return out.set(EYE[0] + Math.sin(a) * Math.cos(e) * dist, EYE[1] + Math.sin(e) * dist, EYE[2] - Math.cos(a) * Math.cos(e) * dist);
};

// ---------------------------------------------------------------------------------------------- particles
const PVERT = /* glsl */ `
  varying vec2 vUv; varying float vA; varying float vK;
  uniform float uTime, uMode, uAmp, uT0, uPersp, uDis;
  uniform vec3 uC;
  float hs(float x) { return fract(sin(x * 91.7) * 4375.5); }
  void main() {
    vec4 c = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 q = vec3(0.5);
    #ifdef USE_INSTANCING_COLOR
      q = instanceColor;
    #endif
    float ph = q.x * 40.0;
    vec3 P = c.xyz;
    float tw = 0.5 + 0.5 * sin(uTime * (1.6 + 3.0 * q.y) + ph);
    float size = q.z;
    float a = 0.0;
    if (uMode < 0.5) {
      // fireflies: slow loops, each one blinking
      P += vec3(sin(uTime * 0.4 * (0.5 + q.y) + ph) * 1.5, sin(uTime * 0.5 + ph * 1.3) * 0.5, cos(uTime * 0.33 * (0.5 + q.y) + ph * 0.7) * 1.5);
      a = pow(tw, 2.5);
      size *= 0.2;
    } else if (uMode < 1.5) {
      // glints: stay put and twinkle
      a = pow(tw, 3.0);
      size *= 0.6 + 0.9 * tw;
    } else {
      // the burst: thrown out from uC, slowing, gravity small
      float age = uTime - uT0;
      vec3 dir = normalize(vec3(hs(q.x), hs(q.x + 3.1) - 0.3, hs(q.x + 7.7)) * 2.0 - 1.0 + vec3(0.0, 0.2, 0.0));
      float sp = 1.2 + 4.0 * q.y;
      float k = 1.0 - exp(-age * 2.2);
      P = uC + dir * sp * k * 1.3 + vec3(0.0, -0.25 * age * age, 0.0);
      a = (age > 0.0 ? 1.0 - smoothstep(0.5, 1.9, age) : 0.0) * (0.6 + 0.4 * sin(age * 18.0 + ph));
      size *= 0.7;
    }
    vec4 mv = viewMatrix * modelMatrix * vec4(P, 1.0);
    float d = length(mv.xyz);
    size *= 1.0 + d * uPersp;
    mv.xy += position.xy * size;
    vK = q.y;
    vA = a * uAmp * (1.0 - smoothstep(0.0, 0.6, uDis));
    vUv = uv;
    gl_Position = projectionMatrix * mv;
  }`;
const PFRAG = /* glsl */ `
  varying vec2 vUv; varying float vA; varying float vK;
  uniform float uMode;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float g = exp(-dot(p, p) * (uMode < 0.5 ? 7.0 : 14.0));
    float a = g * 0.9;
    vec3 col = uMode < 0.5 ? mix(vec3(1.0, 0.78, 0.38), vec3(1.0, 0.95, 0.8), g) : mix(vec3(1.0, 0.86, 0.6), vec3(0.8, 0.92, 1.0), vK);
    if (uMode > 0.5) {
      float h = exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 2.4);
      float v = exp(-abs(p.x) * 26.0) * exp(-abs(p.y) * 2.4);
      a = (h + v) * 0.95 + g * 0.7;
    }
    gl_FragColor = vec4(pow(col, vec3(2.2)), clamp(a * vA, 0.0, 1.0));
  }`;

export function particles(U, n, mode, place, persp = 0) {
  const g = new PlaneGeometry(1, 1);
  const uni = { ...U, uMode: { value: mode }, uAmp: { value: 0 }, uT0: { value: -99 }, uPersp: { value: persp }, uC: { value: new Vector3() } };
  const m = new InstancedMesh(g, new ShaderMaterial({ uniforms: uni, vertexShader: PVERT, fragmentShader: PFRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }), n);
  m.frustumCulled = false;
  m.renderOrder = 5;
  const D = new Object3D();
  const col = new Color();
  for (let i = 0; i < n; i++) {
    const [x, y, z, s] = place(i);
    D.position.set(x, y, z);
    D.updateMatrix();
    m.setMatrixAt(i, D.matrix);
    col.setRGB(hash(i, 21), hash(i, 22), s);
    m.setColorAt(i, col);
  }
  return { mesh: m, u: uni };
}

// ---------------------------------------------------------------------------------------------- the comet
const CVERT = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uHead, uDir;
  uniform float uLen, uW, uTime, uSeed;
  void main() {
    float s = uv.x;
    vec3 T = normalize(uDir);
    vec3 P = uHead + T * (s * uLen);
    vec3 wp = (modelMatrix * vec4(P, 1.0)).xyz;
    vec3 view = normalize(cameraPosition - wp);
    vec3 side = normalize(cross(mat3(modelMatrix) * T, view));
    vec3 sideL = transpose(mat3(modelMatrix)) * side;
    float w = uW * (1.0 - s * 0.82) * (0.3 + 0.7 * smoothstep(0.0, 0.04, s));
    P += sideL * (uv.y * 2.0 - 1.0) * w + sideL * sin(s * 14.0 - uTime * 2.0 + uSeed) * 0.5 * uW * s;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(P, 1.0);
  }`;
const CFRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime, uAlpha, uSeed;
  uniform vec3 uTint;
  void main() {
    float s = vUv.x;
    float v = vUv.y * 2.0 - 1.0;
    float body = pow(max(1.0 - v * v, 0.0), 2.4) * pow(max(1.0 - s, 0.0), 1.25);
    float str = 0.62 + 0.38 * sin(v * 30.0 + s * 9.0 - uTime * 1.5 + uSeed);
    float core = exp(-v * v * 22.0) * pow(max(1.0 - s, 0.0), 2.0);
    vec3 col = mix(vec3(0.92, 0.97, 1.0), vec3(0.45, 0.8, 1.0), smoothstep(0.0, 0.35, s));
    col = mix(col, uTint, smoothstep(0.3, 0.9, s));
    col = mix(col, vec3(1.0, 0.35, 0.75), smoothstep(0.45, 1.0, abs(v)) * 0.6);
    col = mix(col, vec3(0.55, 0.95, 1.0), clamp(core * 1.4, 0.0, 1.0));
    float a = (body * str * 0.75 + core * 0.9) * uAlpha;
    gl_FragColor = vec4(pow(col, vec3(2.2)), clamp(a, 0.0, 1.0));
  }`;
const HVERT = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uHead;
  uniform float uSize;
  void main() {
    vec4 mv = viewMatrix * modelMatrix * vec4(uHead, 1.0);
    mv.xy += position.xy * uSize;
    vUv = uv;
    gl_Position = projectionMatrix * mv;
  }`;
const HFRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uAlpha, uTime;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r2 = dot(p, p);
    float g = exp(-r2 * 26.0) + exp(-r2 * 5.0) * 0.35;
    float cross = (exp(-abs(p.x) * 40.0) * exp(-abs(p.y) * 3.2) + exp(-abs(p.y) * 40.0) * exp(-abs(p.x) * 3.2)) * 0.6;
    vec3 col = mix(vec3(0.55, 0.82, 1.0), vec3(1.0, 1.0, 1.0), exp(-r2 * 30.0));
    gl_FragColor = vec4(pow(col, vec3(2.2)), clamp((g + cross) * uAlpha, 0.0, 1.0));
  }`;

export function cometPiece(U, ribbonGeo, seed, tint) {
  const ru = { ...U, uHead: { value: new Vector3() }, uDir: { value: new Vector3(0, 0, 1) }, uLen: { value: 50 }, uW: { value: 2.2 }, uAlpha: { value: 0 }, uSeed: { value: seed }, uTint: { value: new Vector3(...tint) } };
  const ribbon = new Mesh(ribbonGeo, new ShaderMaterial({ uniforms: ru, vertexShader: CVERT, fragmentShader: CFRAG, transparent: true, depthWrite: false, depthTest: false, blending: NormalBlending, side: DoubleSide }));
  ribbon.frustumCulled = false;
  ribbon.renderOrder = 4;
  const hu = { ...U, uHead: ru.uHead, uSize: { value: 8 }, uAlpha: ru.uAlpha };
  const head = new Mesh(new PlaneGeometry(1, 1), new ShaderMaterial({ uniforms: hu, vertexShader: HVERT, fragmentShader: HFRAG, transparent: true, depthWrite: false, depthTest: false, blending: NormalBlending }));
  head.frustumCulled = false;
  head.renderOrder = 4;
  return { ribbon, head, ru, hu };
}
export const ribbonGeometry = () => gridGeometry(48, 1);

// ---------------------------------------------------------------------------------------------- lens ghosts
export function ghosts(U) {
  const uni = { ...U, uGhost: { value: [0, 1, 2, 3, 4].map(() => new Vector4(0, 0, 0, 0)) }, uVis: { value: 0 }, uAsp: { value: 1 } };
  const m = new InstancedMesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      uniforms: uni,
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying float vId;
        uniform vec4 uGhost[5];
        uniform float uVis, uAsp;
        void main() {
          vec4 g = uGhost[gl_InstanceID];
          vId = float(gl_InstanceID);
          vUv = uv * 2.0 - 1.0;
          gl_Position = vec4(g.xy + position.xy * g.z * vec2(uAsp, 1.0), 0.0, 1.0);
          if (g.w * uVis < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv; varying float vId;
        uniform vec4 uGhost[5];
        uniform float uVis;
        void main() {
          float a = uGhost[int(vId + 0.5)].w * uVis;
          float ang = atan(vUv.y, vUv.x);
          float r = length(vUv) / (cos(mod(ang + 3.14159, 1.0472) - 0.5236) / cos(0.5236));
          float ring = smoothstep(0.55, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
          float fill = (1.0 - smoothstep(0.0, 1.0, r)) * 0.35;
          vec3 col = mix(vec3(1.0, 0.7, 0.45), vec3(0.55, 0.65, 1.0), fract(vId * 0.37));
          float k = (ring * 0.8 + fill) * a;
          gl_FragColor = vec4(pow(col, vec3(2.2)), clamp(k, 0.0, 1.0) * step(r, 1.0));
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    }),
    5,
  );
  m.frustumCulled = false;
  m.renderOrder = 20;
  return { mesh: m, u: uni };
}

// ---------------------------------------------------------------------------------------------- title card
// the dusk's end, in the film's own manner: the old word for the hour, then what it means, thin and pale
export function titleCard() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 320;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const x = c.getContext("2d");
    x.clearRect(0, 0, 1024, 320);
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim() || "sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.shadowColor = "rgba(255,210,150,0.9)";
    x.shadowBlur = 26;
    x.fillStyle = "#fff6e6";
    const jp = "'Yu Gothic', 'Hiragino Sans', 'Noto Sans JP', 'Meiryo', sans-serif";
    x.font = `300 120px ${jp}`;
    const has = x.measureText("誰").width !== x.measureText("￿").width;
    if (has) x.fillText("誰そ彼", 512, 105);
    x.font = `700 62px ${fam}`;
    x.fillText("Kataware-doki is over", 512, has ? 238 : 150);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.load?.(`700 60px ${getComputedStyle(document.documentElement).getPropertyValue("--font-comic").trim()}`).then(draw, () => {});
  const mesh = new Mesh(new PlaneGeometry(1, 320 / 1024), new ShaderMaterial({
    uniforms: { uMap: { value: tex }, uA: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec2 vUv; uniform sampler2D uMap; uniform float uA; void main(){ vec4 t = texture2D(uMap, vUv); gl_FragColor = vec4(t.rgb, t.a * uA); }",
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }));
  mesh.renderOrder = 30;
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, tex };
}
