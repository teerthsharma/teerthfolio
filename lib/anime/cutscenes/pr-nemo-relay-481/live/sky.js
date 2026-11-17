// The void sky of the Tournament: five hard violet bands, a flat nebula, cream halftone on it, speed-line wedges, dithered out at the return.
import { DoubleSide, IcosahedronGeometry, ShaderMaterial, Vector3 } from "three";
import { srgb } from "../util.js";
import { tone } from "../tone.js";

const v = (h) => new Vector3(...srgb(h));

export function skyShell() {
  const g = new IcosahedronGeometry(1, 3);
  const m = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSpeed: { value: 0 }, uDrain: { value: 0 }, uOut: { value: 0 }, uCell: { value: 6 }, uDpr: { value: 1 }, uFocus: { value: new Vector3(0.05, 0.04, -1) },
      c0: { value: v("#a46bff") }, c1: { value: v("#7a3fe0") }, c2: { value: v("#5a24b8") }, c3: { value: v("#3d1788") }, c4: { value: v("#250a5c") },
      d0: { value: v("#4b1fa0") }, d1: { value: v("#2e1070") }, d2: { value: v("#1a0646") },
    },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uSpeed, uDrain, uOut, uCell, uDpr;
      uniform vec3 uFocus, c0, c1, c2, c3, c4, d0, d1, d2;
      varying vec3 vWorld;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
      float cloud(vec2 q, vec2 c, vec2 r, float seed) {
        vec2 d = (q - c) / r;
        return fbm(q * vec2(2.4, 3.2) + seed) * 0.85 + (1.0 - length(d)) * 0.9;
      }
      void main() {
        vec3 dir = normalize(vWorld - cameraPosition);
        float h = dir.y;
        float az = atan(dir.x, -dir.z);
        vec3 col;
        if (h > -0.04) {
          float k = clamp((h + 0.04) * 3.4, 0.0, 4.999);
          float i = floor(k);
          col = i < 1.0 ? c0 : i < 2.0 ? c1 : i < 3.0 ? c2 : i < 4.0 ? c3 : c4;
        } else {
          float k = clamp((-h - 0.04) * 3.0, 0.0, 2.999);
          float i = floor(k);
          col = i < 1.0 ? d0 : i < 2.0 ? d1 : d2;
        }
        vec2 q = vec2(az, h);
        float n1 = cloud(q, vec2(-0.95, 0.3), vec2(0.95, 0.5), 3.0);
        col = n1 > 0.62 ? vec3(0.22, 0.83, 0.94) : col;
        col = n1 > 0.8 ? vec3(0.88, 0.25, 0.6) : col;
        col = n1 > 0.98 ? vec3(1.0, 0.69, 0.23) : col;
        col = n1 > 1.14 ? vec3(1.0, 0.94, 0.66) : col;
        float n2 = cloud(q, vec2(1.55, 0.5), vec2(0.6, 0.34), 9.0);
        col = n2 > 0.74 ? vec3(0.62, 0.34, 0.92) : col;
        col = n2 > 0.98 ? vec3(0.34, 0.9, 1.0) : col;
        float dots = step(length(fract(gl_FragCoord.xy / (9.0 * uDpr)) - 0.5), 0.17) * step(0.62, n1);
        col = mix(col, vec3(1.0, 0.94, 0.66), dots * 0.55 * (1.0 - uDrain));
        vec2 sg = q * vec2(26.0, 40.0);
        vec2 sc = floor(sg);
        float r = h21(sc);
        vec2 f = fract(sg) - 0.5;
        float star = step(0.93, r) * step(abs(f.x) + abs(f.y) * 1.0, 0.1 + 0.16 * h21(sc + 3.0)) * step(0.1, h);
        col = mix(col, vec3(1.0, 0.98, 0.9), star);
        vec3 F = normalize(uFocus);
        vec3 rt = normalize(cross(F, vec3(0.0, 1.0, 0.0)));
        vec3 up = cross(rt, F);
        vec2 p = vec2(dot(dir, rt), dot(dir, up)) / max(dot(dir, F), 0.05);
        float ang = atan(p.y, p.x) * 72.0 / 3.14159;
        float rad = length(p);
        float tick = floor(uTime * 12.0);
        float cellId = floor(ang);
        float on = step(1.0 - (0.07 + 0.2 * uSpeed), h21(vec2(cellId, tick)));
        float w = 0.1 + 0.16 * h21(vec2(cellId, tick + 7.0));
        float line = on * step(abs(fract(ang) - 0.5), w * smoothstep(0.1, 0.9, rad) * 1.6) * smoothstep(0.16, 0.3, rad);
        float side = step(0.5, h21(vec2(cellId, 4.0)));
        vec3 lc = mix(vec3(0.97, 0.96, 1.0), vec3(0.7, 0.82, 1.0), side);
        col = mix(col, lc, line * (1.0 - uDrain));
        float l = dot(col, vec3(0.3, 0.59, 0.11));
        col = mix(col, vec3(l * 0.55 + 0.5, l * 0.5 + 0.5, l * 0.45 + 0.52), uDrain * 0.8);
        if (uOut > 0.0) {
          vec2 bc = floor(gl_FragCoord.xy / (uCell * 3.0));
          if (h21(bc + 11.0) + 0.12 * fbm(bc * 0.15) < uOut * 1.15) discard;
        }
        gl_FragColor = vec4(pow(col, vec3(2.2)), 0.99);
      }`,
  });
  return { g, m: tone(m) };
}
