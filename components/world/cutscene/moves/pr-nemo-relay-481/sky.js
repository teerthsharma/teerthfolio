// THE VOID SKY of the Tournament of Power, painted as 90s cel: a hard-banded gradient from deep royal
// blue to a pale lilac horizon, a colourful nebula laid in as three flat bands (magenta, orange, cream
// over a cyan rim), a scatter of four-point stars, and the bold SPEED LINES radiating from behind the
// pup: ink-white wedges that re-draw every twelfth of a second. uSpeed thickens them (the awakening, the
// dodges), uDrain pales the whole sky and stills the lines (Ultra Instinct spent), uOut dissolves it in
// chunky dither blocks (the dimension closing) to the real island behind.
// One inverted-hull-free sphere, direction-only shading: it costs one draw call and no texture.

import { DoubleSide, IcosahedronGeometry, ShaderMaterial, Vector3 } from "three";
import { srgb } from "./util";

const v = (h) => new Vector3(...srgb(h));

export function skyShell() {
  const g = new IcosahedronGeometry(1, 3);
  const m = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSpeed: { value: 0 }, uDrain: { value: 0 }, uOut: { value: 0 }, uCell: { value: 6 }, uFocus: { value: new Vector3(0.05, 0.04, -1) },
      c0: { value: v("#f2e0ff") }, c1: { value: v("#bdb8ff") }, c2: { value: v("#7f92f6") }, c3: { value: v("#4962e0") }, c4: { value: v("#2a37a6") },
      d0: { value: v("#6a3fb8") }, d1: { value: v("#3a2a96") }, d2: { value: v("#241c6c") },
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
      uniform float uTime, uSpeed, uDrain, uOut, uCell;
      uniform vec3 uFocus, c0, c1, c2, c3, c4, d0, d1, d2;
      varying vec3 vWorld;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
      // a nebula: nested flat bands round a centre in (azimuth, elevation) space
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
        // the great nebula, left and behind: cyan rim, magenta, orange, cream heart
        float n1 = cloud(q, vec2(-0.95, 0.3), vec2(0.95, 0.5), 3.0);
        col = n1 > 0.62 ? vec3(0.22, 0.83, 0.94) : col;
        col = n1 > 0.8 ? vec3(0.88, 0.25, 0.6) : col;
        col = n1 > 0.98 ? vec3(1.0, 0.69, 0.23) : col;
        col = n1 > 1.14 ? vec3(1.0, 0.94, 0.66) : col;
        // a second, smaller one, right and high: violet with a cyan heart
        float n2 = cloud(q, vec2(1.55, 0.5), vec2(0.6, 0.34), 9.0);
        col = n2 > 0.74 ? vec3(0.62, 0.34, 0.92) : col;
        col = n2 > 0.98 ? vec3(0.34, 0.9, 1.0) : col;
        // four-point stars on the high sky
        vec2 sg = q * vec2(26.0, 40.0);
        vec2 sc = floor(sg);
        float r = h21(sc);
        vec2 f = fract(sg) - 0.5;
        float star = step(0.93, r) * step(abs(f.x) + abs(f.y) * 1.0, 0.1 + 0.16 * h21(sc + 3.0)) * step(0.1, h);
        col = mix(col, vec3(1.0, 0.98, 0.9), star);
        // THE SPEED LINES: wedges radiating from behind the pup, redrawn every twelfth of a second
        vec3 F = normalize(uFocus);
        vec3 rt = normalize(cross(F, vec3(0.0, 1.0, 0.0)));
        vec3 up = cross(rt, F);
        vec2 p = vec2(dot(dir, rt), dot(dir, up)) / max(dot(dir, F), 0.05);
        float ang = atan(p.y, p.x) * 56.0 / 3.14159;
        float rad = length(p);
        float tick = floor(uTime * 12.0);
        float cellId = floor(ang);
        float on = step(1.0 - (0.07 + 0.2 * uSpeed), h21(vec2(cellId, tick)));
        float w = 0.1 + 0.16 * h21(vec2(cellId, tick + 7.0));
        float line = on * step(abs(fract(ang) - 0.5), w * smoothstep(0.1, 0.9, rad) * 1.6) * smoothstep(0.16, 0.3, rad);
        float side = step(0.5, h21(vec2(cellId, 4.0)));
        vec3 lc = mix(vec3(1.0, 0.98, 1.0), vec3(0.78, 0.96, 1.0), side);
        col = mix(col, lc, line * (1.0 - uDrain));
        // spent: the sky pales to a flat wash and the lines stop
        float l = dot(col, vec3(0.3, 0.59, 0.11));
        col = mix(col, vec3(l * 0.55 + 0.5, l * 0.5 + 0.5, l * 0.45 + 0.52), uDrain * 0.8);
        // the dimension closes: chunky blocks drop out
        if (uOut > 0.0) {
          vec2 bc = floor(gl_FragCoord.xy / (uCell * 3.0));
          if (h21(bc + 11.0) + 0.12 * fbm(bc * 0.15) < uOut * 1.15) discard;
        }
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
  });
  return { g, m };
}
