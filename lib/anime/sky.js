// PAINTED SKY: three-stop vertical gradient (zenith, mid, horizon) plus a cloud
// layer posterised to three hard tones lit from the key direction, and a sun /
// moon disc that is emissive (> 1) so it alone blooms and casts shafts.
// Writes id 0 in alpha (the composite reads sky as id 0).
import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from "three";

export function sky(o = {}) {
  const m = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uZen: { value: new Color(o.zenith ?? "#2f6fd6") }, uMid: { value: new Color(o.mid ?? "#7fb6f2") }, uHor: { value: new Color(o.horizon ?? "#f3e3c8") },
      uCloud: { value: new Color(o.cloud ?? "#ffffff") }, uCloudSh: { value: new Color(o.cloudShade ?? "#9fb0e8") }, uCloudAmt: { value: o.clouds ?? 0.55 },
      uSun: { value: new Vector3(...(o.sun ?? [-0.4, 0.35, -0.85])).normalize() }, uSunCol: { value: new Color(o.sunCol ?? "#fff1c8") }, uSunSize: { value: o.sunSize ?? 0.035 }, uSunEmit: { value: o.sunEmit ?? 2.5 },
      uTime: { value: 0 },
    },
    vertexShader: "varying vec3 vD; void main() { vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }",
    fragmentShader: /* glsl */ `
      uniform vec3 uZen; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uCloud; uniform vec3 uCloudSh; uniform float uCloudAmt;
      uniform vec3 uSun; uniform vec3 uSunCol; uniform float uSunSize; uniform float uSunEmit; uniform float uTime;
      varying vec3 vD;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { return n(p) * 0.5 + n(p * 2.03) * 0.27 + n(p * 4.1) * 0.15 + n(p * 8.3) * 0.08; }
      void main() {
        vec3 d = normalize(vD);
        float y = d.y;
        vec3 c = y > 0.25 ? mix(uMid, uZen, smoothstep(0.25, 0.85, y)) : mix(uHor, uMid, smoothstep(-0.02, 0.25, y));
        // clouds on a dome projection, banded to three tones with an fwidth-smoothed edge
        if (y > 0.02 && uCloudAmt > 0.0) {
          vec2 q = d.xz / (y + 0.18) * 1.6 + vec2(uTime * 0.01, 0.0);
          float f = fbm(q) * smoothstep(0.02, 0.2, y);
          float e = fwidth(f) + 1e-3;
          float cov = smoothstep(1.0 - uCloudAmt - e, 1.0 - uCloudAmt + e, f);
          float lit = fbm(q + uSun.xz * 0.35) < f ? 1.0 : 0.0;
          vec3 cc = mix(uCloudSh, uCloud, lit);
          cc = mix(cc, mix(uCloudSh, uCloud, 0.55), smoothstep(1.0 - uCloudAmt + 0.12 - e, 1.0 - uCloudAmt + 0.12 + e, f) * (1.0 - lit) * 0.5);
          c = mix(c, min(cc, vec3(0.92)), cov);
        }
        float s = dot(d, uSun);
        float disc = smoothstep(1.0 - uSunSize - 0.002, 1.0 - uSunSize, s);
        c = mix(c, uSunCol * uSunEmit, disc);
        c += uSunCol * pow(max(s, 0.0), 40.0) * 0.25;
        gl_FragColor = vec4(c, 0.0);
      }`,
  });
  const mesh = new Mesh(new SphereGeometry(400, 32, 16), m);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.userData.sunDir = m.uniforms.uSun.value;
  return mesh;
}
