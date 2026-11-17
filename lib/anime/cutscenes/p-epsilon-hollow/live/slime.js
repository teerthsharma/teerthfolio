import { AdditiveBlending, CanvasTexture, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace } from "three";
import { KIND, layer } from "./paper.js";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const GLOW = { kind: KIND.glow, noEdge: true };
const mesh = (mat, geo) => {
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
};

export function makeRim() {
  return new ShaderMaterial({
    side: DoubleSide,
    vertexColors: true,
    uniforms: { uTime: { value: 0 }, uGlow: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec4 aMeta;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec4 vMeta; varying vec3 vLocal;
      void main() {
        vLocal = position;
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = color.rgb;
        #endif
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol *= instanceColor;
        #endif
        vec4 w = modelMatrix * p;
        vWorld = w.xyz;
        vN = mat3(modelMatrix) * n + vec3(0.0, 0.0001, 0.0);
        vMeta = aMeta;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uGlow;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vCol; varying vec4 vMeta; varying vec3 vLocal;
      void main() {
        vec3 n = normalize(vN + vec3(0.0, 0.0001, 0.0));
        if (!gl_FrontFacing) n = -n;
        vec3 base = pow(vCol, vec3(1.0 / 2.2));
        if (vMeta.x > 5.5) { gl_FragColor = vec4(base * (1.1 + 0.25 * uGlow), 0.99); return; }
        if (vMeta.y > 0.5 && vMeta.y < 1.5) {
          vec3 q = vLocal * 13.0;
          vec2 uv = vec2(q.x + q.z, q.y * 1.25);
          uv.x += 0.5 * mod(floor(uv.y), 2.0);
          vec2 f = fract(uv) - 0.5;
          float sc = smoothstep(0.52, 0.18, length(f * vec2(1.0, 1.25)));
          base *= 0.5 + 0.62 * sc;
        } else if (vMeta.y > 1.5 && vMeta.y < 2.5) {
          float wv = 0.5 + 0.5 * sin(vLocal.x * 70.0 + sin(vLocal.y * 9.0) * 2.0) * sin(vLocal.y * 90.0);
          float fold = 0.5 + 0.5 * sin(atan(vLocal.x, vLocal.z + 0.001) * 11.0 + vLocal.y * 2.0);
          base *= 0.7 + 0.12 * wv + 0.12 * fold;
        }
        float d = dot(n, normalize(vec3(-0.45, 0.7, 0.55))) * 0.5 + 0.5;
        float shade = 0.7 + 0.18 * step(0.4, d) + 0.16 * step(0.72, d);
        vec3 v = normalize(cameraPosition - vWorld + vec3(0.0, 0.0001, 0.0));
        float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);
        vec3 rc = mix(vec3(1.0, 0.72, 0.25), vec3(0.25, 0.85, 1.0), step(0.0, n.x));
        rim *= 1.0 - smoothstep(0.45, 0.9, abs(n.y));
        gl_FragColor = vec4(base * shade + rc * rim * 1.1, 0.99);
      }`,
  });
}

export function ripple(a, b, swirl) {
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    uniforms: { uA: { value: new Color(a) }, uB: { value: new Color(b) }, uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA, uB; uniform float uT, uK; varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x + 0.0001);
        float w = sin(r * 22.0 - uT * 3.5 + ${swirl ? "ang * 3.0" : "0.0"}) * 0.5 + 0.5;
        float edge = 1.0 - smoothstep(0.82, 1.0, r);
        float core = 1.0 - smoothstep(0.0, 1.0, r);
        vec3 c = mix(uA, uB, w) * (0.35 + 0.65 * w) * edge + uA * core * 0.6 + uB * smoothstep(0.85, 0.96, r) * edge * 0.8;
        gl_FragColor = vec4(c * uK, 0.0);
      }`,
  });
  const g = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const o = mesh(m, g);
  o.position.y = 0.16;
  o.visible = false;
  return { mesh: o, mat: m, dispose: () => (g.dispose(), m.dispose()) };
}

export function sagePanel(text) {
  const c = document.createElement("canvas");
  c.width = 1100;
  c.height = 280;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = () => {
    const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = "rgba(6,24,70,0.82)";
    g.fillRect(8, 8, c.width - 16, c.height - 16);
    for (let y = 12; y < c.height - 12; y += 6) {
      g.fillStyle = "rgba(90,220,255,0.07)";
      g.fillRect(8, y, c.width - 16, 2);
    }
    g.strokeStyle = "#5ff0ff";
    g.lineWidth = 6;
    g.shadowColor = "#37d4ff";
    g.shadowBlur = 22;
    g.strokeRect(8, 8, c.width - 16, c.height - 16);
    g.shadowBlur = 0;
    g.fillStyle = "#7fe8ff";
    g.font = "700 34px 'Segoe UI','Yu Gothic UI',Meiryo,sans-serif";
    g.fillText("GREAT SAGE", 44, 62);
    g.fillRect(44, 76, 230, 3);
    g.fillStyle = "#e9fdff";
    g.shadowColor = "#37d4ff";
    g.shadowBlur = 16;
    let px = 56;
    while (px > 40) {
      g.font = `700 ${px}px 'Segoe UI','Yu Gothic UI',Meiryo,sans-serif`;
      if (g.measureText(text).width < c.width - 88) break;
      px -= 2;
    }
    g.fillText(text, 44, 190);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready?.then(draw);
  const mat = new MeshBasicMaterial({ map: tex, premultipliedAlpha: true, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 });
  const geo = new PlaneGeometry(1, c.height / c.width);
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = 999;
  m.visible = false;
  return { mesh: m, mat, dispose: () => (tex.dispose(), geo.dispose(), mat.dispose()) };
}

export function hollowSphere() {
  const g = new Group();
  const mats = [];
  for (const [c, rx, ry] of [["#34e0ff", 0, 0], ["#ffc83a", Math.PI / 2, 0], ["#ff4fa0", 0, Math.PI / 2]]) {
    const m = new ShaderMaterial({ side: DoubleSide, uniforms: { uC: { value: new Color(c) } }, vertexShader: /* glsl */ `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`, fragmentShader: /* glsl */ `uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 0.99); }` });
    mats.push(m);
    const ring = new Mesh(new SphereGeometry(1, 36, 2, 0, Math.PI * 2, Math.PI / 2 - 0.035, 0.07), m);
    ring.rotation.set(rx, ry, 0);
    ring.frustumCulled = false;
    g.add(ring);
  }
  g.visible = false;
  return { root: g, dispose: () => (g.children.forEach((c) => c.geometry.dispose()), mats.forEach((m) => m.dispose())) };
}


export function maw() {
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    premultipliedAlpha: true,
    uniforms: { uT: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uT; varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float ang = atan(p.y, p.x + 0.0001);
        float arms = 0.5 + 0.5 * sin(ang * 4.0 + r * 12.0 - uT * 9.0);
        float teeth = smoothstep(0.55, 0.9, 0.5 + 0.5 * sin(ang * 22.0)) * smoothstep(0.62, 0.5, r) * smoothstep(0.3, 0.45, r);
        float disc = 1.0 - smoothstep(0.92, 1.0, r);
        vec3 c = mix(vec3(0.02, 0.0, 0.05), vec3(0.85, 0.1, 0.95), arms * smoothstep(0.45, 0.95, r));
        c = mix(c, vec3(0.9, 0.85, 1.0), teeth);
        c = mix(vec3(0.0), c, smoothstep(0.18, 0.5, r) + teeth);
        gl_FragColor = vec4(c * disc, disc);
      }`,
  });
  const g = new PlaneGeometry(2, 2);
  const o = mesh(m, g);
  o.visible = false;
  return { mesh: o, mat: m, dispose: () => (g.dispose(), m.dispose()) };
}

export function fistMesh(mat) {
  const L = layer();
  L.add(new SphereGeometry(0.9, 14, 10), "#14101f", {}, 0, 0, 0, 0, 0, 0, 1.1, 0.9, 1);
  L.add(new CylinderGeometry(0.62, 0.7, 0.5, 12).rotateX(Math.PI / 2), "#d4a63a", {}, 0, -0.1, -0.95);
  for (let i = 0; i < 4; i++) L.add(new SphereGeometry(0.2, 8, 6), "#ffd23a", GLOW, (i - 1.5) * 0.42, 0.05, 0.78);
  const g = L.build();
  const o = mesh(mat, g);
  o.visible = false;
  o.renderOrder = 998;
  return { mesh: o, dispose: () => g.dispose() };
}
