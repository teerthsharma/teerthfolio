// THE PAINTED WORLD (Ghibli / Shinkai background): layered grass blade cards
// with painted gradients that sway, mossy rocks with posterised brush shading,
// teal water with long horizontal light streaks. All opaque; grass writes the
// no-line id (0.99) so the set-line pass never speckles it.
import { BufferAttribute, Color, DoubleSide, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, PlaneGeometry, ShaderMaterial, BufferGeometry, Vector3, Euler, Quaternion } from "three";

export function bladeGeometry(segs = 5) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, w = 0.5 * (1 - t) ** 0.8;
    pos.push(-w, t, 0, w, t, 0); uv.push(0, t, 1, t);
    if (i < segs) { const k = 2 * i; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  return g;
}

export function grassMaterial(shared, o = {}) {
  return new ShaderMaterial({
    side: DoubleSide,
    uniforms: { uTime: shared.uTime, uLightDir: shared.uLightDir, uBase: { value: new Color(o.base ?? "#1d3b22") }, uMid: { value: new Color(o.mid ?? "#3f7d34") }, uTip: { value: new Color(o.tip ?? "#b9d266") }, uLit: { value: new Color(o.lit ?? "#d8e88a") }, uSway: { value: o.sway ?? 0.12 } },
    vertexShader: /* glsl */ `
      attribute vec4 aBlade; // x bend, y phase, z hue jitter, w tone
      uniform float uTime; uniform float uSway;
      varying vec2 vUv; varying vec4 vB;
      void main() {
        vUv = uv; vB = aBlade;
        vec3 p = position;
        float t = uv.y;
        float sw = sin(uTime * 1.3 + aBlade.y) * uSway + sin(uTime * 2.9 + aBlade.y * 1.7) * uSway * 0.3;
        p.z += (aBlade.x + sw) * t * t;
        vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase; uniform vec3 uMid; uniform vec3 uTip; uniform vec3 uLit;
      varying vec2 vUv; varying vec4 vB;
      void main() {
        float t = vUv.y;
        vec3 c = mix(uBase, uMid, smoothstep(0.0, 0.45, t));
        c = mix(c, uTip, smoothstep(0.45, 1.0, t) * (0.6 + 0.4 * vB.z));
        // a painted light stripe down one side of the lit blades
        c = mix(c, uLit, step(0.62, vUv.x) * smoothstep(0.3, 0.8, t) * vB.w * 0.7);
        gl_FragColor = vec4(min(c, vec3(0.9)), 0.99);
      }`,
  });
}

// n blades scattered by place(i) -> [x, y, z, height, yaw]
export function grass(shared, n, place, o = {}) {
  const g = bladeGeometry();
  const m = new InstancedMesh(g, grassMaterial(shared, o), n);
  const attr = new Float32Array(n * 4);
  const M = new Matrix4(), q = new Quaternion(), e = new Euler();
  for (let i = 0; i < n; i++) {
    const [x, y, z, h, yaw, w] = place(i);
    e.set(0, yaw, 0); q.setFromEuler(e);
    M.compose(new Vector3(x, y, z), q, new Vector3(w ?? h * 0.06, h, h));
    m.setMatrixAt(i, M);
    attr.set([(Math.sin(i * 12.9898) * 0.5) * 0.6, i * 1.37, (Math.sin(i * 78.233) * 0.5 + 0.5), Math.sin(i * 3.1) > 0.2 ? 1 : 0], i * 4);
  }
  g.setAttribute("aBlade", new InstancedBufferAttribute(attr, 4));
  m.frustumCulled = false;
  return m;
}

export function water(shared, size = 60) {
  const m = new ShaderMaterial({
    uniforms: { uTime: shared.uTime, uDeep: { value: new Color("#1d5f63") }, uShallow: { value: new Color("#3f9a8c") }, uStreak: { value: new Color("#d6f3e6") } },
    vertexShader: "varying vec3 vWP; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }",
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uStreak; varying vec3 vWP;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec2 p = vWP.xz;
        float band = n(vec2(p.x * 0.35 + uTime * 0.25, p.y * 3.2)) * 0.65 + n(vec2(p.x * 0.9 - uTime * 0.4, p.y * 7.0)) * 0.35;
        vec3 c = mix(uDeep, uShallow, smoothstep(0.3, 0.75, n(p * 0.25 + 3.0)));
        float e = fwidth(band) + 1e-3;
        c = mix(c, uShallow * 1.25, smoothstep(0.6 - e, 0.6 + e, band) * 0.6);
        c = mix(c, uStreak, smoothstep(0.76 - e, 0.76 + e, band));
        gl_FragColor = vec4(min(c, vec3(0.9)), 0.08);
      }`,
  });
  const w = new Mesh(new PlaneGeometry(size, size).rotateX(-Math.PI / 2), m);
  return w;
}
