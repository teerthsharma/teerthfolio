// grass: instanced painted grass blades that sway, for the near and mid ground. Each blade is painted
// root -> body -> tip, with a lit flank on its sun side and a translucent glowing tip when backlit.
//   grassBlades(shared, n, place(i) -> [x, y, z, height m, yaw, width m?], palette, { sway, lean, id })
//   palette (hex): { root, mid, tip, lit, glow } ; glow is the backlit tip colour (golden hour)
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Euler, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, ShaderMaterial, Vector3 } from "three";
import { rng } from "../kit3d.js";

function blade(segs = 6) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, w = 0.5 * (1 - t) ** 0.9;
    pos.push(-w, t, 0, w, t, 0); uv.push(0, t, 1, t);
    if (i < segs) { const k = 2 * i; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(idx);
  return g;
}

export function grassBlades(shared, n, place, pal = {}, o = {}) {
  const p = { root: "#26381c", mid: "#5f7a2e", tip: "#b7b65a", lit: "#e9cf7a", glow: "#ffd27a", ...pal };
  const C = (h) => ({ value: new Color(h) });
  const m = new ShaderMaterial({
    side: DoubleSide,
    uniforms: { uTime: shared.uTime, uLightDir: shared.uLightDir, uSway: { value: o.sway ?? 0.08 }, uLean: { value: o.lean ?? 0.35 },
      uRoot: C(p.root), uMid: C(p.mid), uTip: C(p.tip), uLit: C(p.lit), uGlow: C(p.glow) },
    vertexShader: /* glsl */ `
      attribute vec4 aB; // x lean jitter, y phase, z tone, w sun side
      uniform float uTime; uniform float uSway; uniform float uLean; varying vec2 vUv; varying vec4 vB; varying vec3 vWP;
      void main() {
        vUv = uv; vB = aB; vec3 p = position; float t = uv.y;
        float sw = sin(uTime * 1.1 + aB.y) * uSway + sin(uTime * 2.3 + aB.y * 1.7) * uSway * 0.35;
        p.x += (uLean + aB.x + sw) * t * t;
        vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0); vWP = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLightDir; uniform vec3 uRoot; uniform vec3 uMid; uniform vec3 uTip; uniform vec3 uLit; uniform vec3 uGlow;
      varying vec2 vUv; varying vec4 vB; varying vec3 vWP;
      void main() {
        float t = vUv.y;
        vec3 c = mix(uRoot, uMid, smoothstep(0.0, 0.5, t));
        c = mix(c, uTip, smoothstep(0.45, 1.0, t) * (0.55 + 0.45 * vB.z));
        c = mix(c, uLit, step(0.55, vUv.x) * smoothstep(0.25, 0.85, t) * vB.w * 0.8);     // the flank facing the sun
        vec3 V = normalize(cameraPosition - vWP);
        float back = max(dot(-V, normalize(uLightDir)), 0.0);                            // sun behind the blade
        c = mix(c, uGlow * 1.15, smoothstep(0.55, 1.0, t) * back * back * (0.5 + 0.5 * vB.z));
        gl_FragColor = vec4(c, 0.99);
      }`,
  });
  const g = blade(), mesh = new InstancedMesh(g, m, n), attr = new Float32Array(n * 4), R = rng(o.seed ?? 3);
  const M = new Matrix4(), q = new Quaternion(), e = new Euler();
  for (let i = 0; i < n; i++) {
    const [x, y, z, h, yaw, w] = place(i);
    q.setFromEuler(e.set(0, yaw, 0));
    M.compose(new Vector3(x, y, z), q, new Vector3(w ?? h * 0.07, h, h));
    mesh.setMatrixAt(i, M);
    attr.set([(R() - 0.5) * 0.4, R() * 6.28, R(), R() < 0.55 ? 1 : 0], i * 4);
  }
  g.setAttribute("aB", new InstancedBufferAttribute(attr, 4));
  mesh.frustumCulled = false;
  return mesh;
}

// tufts: clumps of blades around centres, fanned out (the near-ground grass a BG painter puts at the frame edge)
export function tufts(shared, centres, perTuft, pal, o = {}) {
  const R = rng(o.seed ?? 9), n = centres.length * perTuft;
  return grassBlades(shared, n, (i) => {
    const [x, y, z, h] = centres[Math.floor(i / perTuft)], a = R() * 6.283, r = R() ** 1.5 * h * 0.35;
    return [x + Math.cos(a) * r, y, z + Math.sin(a) * r, h * (0.45 + 0.55 * R()), (R() - 0.5) * 2.4, h * (0.035 + 0.02 * R())];
  }, pal, o);
}

export default { name: "grass", doc: "instanced painted grass blades and tufts: root-to-tip paint, sunlit flank, backlit glowing tips, sway" };
