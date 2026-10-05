// The Akatsuki hideout's play (p-epsilon-hollow): two fullscreen fragments, no geometry worth the name.
//   eyeMaterial()   the overlay: the lid opens, the iris fills the lens, three tomoe turn and close into the
//                   Mangekyo pinwheel, the lens falls through the pupil (a hole onto the scene), and at the kill
//                   Amaterasu climbs the frame as black fire-paint with crimson and ember edges; crows scatter.
//   fieldMaterial() Tsukuyomi, behind the seal: a red-moon field brushed in paint, crows as drifting flecks.
// Both are a 1x1 plane written straight to clip space (frustumCulled off): one draw each.
// Colours are the hideout's: stone #1c1824, cloud #b3122a, ember #e0559b.

import { Color, PlaneGeometry, ShaderMaterial } from "three";

const QUAD_V = /* glsl */ `
  uniform float uDepth;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, uDepth, 1.0);
  }`;

const COMMON = /* glsl */ `
  uniform float uTime;
  uniform float uAspect;
  uniform vec3 uRed;
  uniform vec3 uStone;
  uniform vec3 uEmber;
  varying vec2 vUv;
  #define TAU 6.2831853
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
    return s;
  }
  // a crow: a flat chevron, wings beating; p in its own cell, 1 when inside
  float crow(vec2 p, float beat) {
    p.y -= abs(p.x) * (0.55 + 0.45 * beat);
    float body = smoothstep(0.03, 0.0, abs(p.y) - 0.045 * (1.0 - abs(p.x) / 0.36));
    return body * step(abs(p.x), 0.36);
  }
  // a field of crows flying out from the centre (k: 0 hidden .. 1 all out)
  float crows(vec2 p, float t, float k) {
    float c = 0.0;
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float a = hash(vec2(fi, 3.1)) * TAU;
      float sp = 0.35 + 0.6 * hash(vec2(fi, 7.7));
      float d = k * sp * 1.6 + 0.05 * sin(t * 2.0 + fi);
      vec2 at = vec2(cos(a), sin(a)) * d;
      float s = 0.05 + 0.05 * hash(vec2(fi, 1.9));
      vec2 q = (p - at) / s;
      float ang = -a + 1.5708;
      q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q * 0.2;
      c = max(c, crow(q, 0.5 + 0.5 * sin(t * 14.0 + fi * 1.7)) * step(0.02, k));
    }
    return c;
  }`;

function quad() {
  return new PlaneGeometry(1, 1);
}

const colours = () => ({ uRed: { value: new Color("#b3122a") }, uStone: { value: new Color("#1c1824") }, uEmber: { value: new Color("#e0559b") } });

export function eyeMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uDepth: { value: -0.999 },
      uTime: { value: 0 },
      uAspect: { value: 1.6 },
      uOpen: { value: 0 }, // the lid: 0 shut, 1 open
      uSpin: { value: 0 }, // the tomoe's turn (rad)
      uMorph: { value: 0 }, // tomoe 0 -> Mangekyo 1
      uZoom: { value: 1 }, // the fall into the pupil: 1 .. ~30
      uHole: { value: 0 }, // the pupil becomes a hole onto the scene
      uAma: { value: 0 }, // Amaterasu's climb, 0 .. 1
      uCrows: { value: 0 },
      uShow: { value: 0 }, // the eye at all
      ...colours(),
    },
    vertexShader: QUAD_V,
    fragmentShader: /* glsl */ `
      uniform float uOpen, uSpin, uMorph, uZoom, uHole, uAma, uCrows, uShow;
      ${COMMON}
      // Mangekyo: three curved blades round a ring, black; 1 inside the black
      float mangekyo(vec2 p) {
        float r = length(p);
        float a = atan(p.y, p.x) + uSpin;
        float k = fract((a + 2.4 * r) * 3.0 / TAU);
        float blade = smoothstep(0.012, 0.0, abs(k - 0.5) * r * 2.2 - 0.16 * (1.0 - smoothstep(0.1, 0.5, r)));
        blade *= smoothstep(0.52, 0.47, r);
        float hub = smoothstep(0.15, 0.14, r);
        return max(blade, hub);
      }
      // three tomoe on the inner ring, black
      float tomoe(vec2 p) {
        float r = length(p);
        float m = smoothstep(0.006, 0.0, abs(r - 0.27) - 0.006); // the ring they ride
        for (int i = 0; i < 3; i++) {
          float a = uSpin + float(i) * TAU / 3.0;
          vec2 c = 0.27 * vec2(cos(a), sin(a));
          m = max(m, smoothstep(0.062, 0.055, length(p - c)));
          // the tail: an arc trailing behind the head, thinning
          for (int j = 1; j < 6; j++) {
            float b = a - float(j) * 0.07;
            vec2 q = (0.27 + float(j) * 0.012) * vec2(cos(b), sin(b));
            m = max(m, smoothstep(0.05 - float(j) * 0.008, 0.04 - float(j) * 0.008, length(p - q)));
          }
        }
        return m;
      }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        vec3 col = vec3(0.0);
        float alpha = 0.0;
        if (uShow > 0.0) {
          vec2 e = p / (1.15 * uZoom);
          float r = length(e);
          // the iris: crimson, brighter toward the pupil, striated, a dark limbal ring
          float a = atan(e.y, e.x);
          float stri = fbm(vec2(a * 9.0, r * 6.0 - uTime * 0.2));
          vec3 iris = mix(uRed * 0.55, uRed * 1.35 + vec3(0.12, 0.0, 0.02), smoothstep(0.5, 0.12, r));
          iris *= 0.75 + 0.45 * stri;
          iris = mix(iris, vec3(0.03, 0.0, 0.01), smoothstep(0.43, 0.5, r)); // the limbal ring
          float inIris = smoothstep(0.505, 0.495, r);
          vec3 sclera = mix(uStone * 0.5, vec3(0.06, 0.02, 0.03), smoothstep(0.5, 1.2, r));
          col = mix(sclera, iris, inIris);
          float ink = mix(tomoe(e), mangekyo(e), uMorph) * inIris;
          float pupil = smoothstep(0.075, 0.068, r);
          col = mix(col, vec3(0.01, 0.0, 0.01), max(ink, pupil));
          // paint grain over the whole eye
          col *= 0.9 + 0.2 * noise(gl_FragCoord.xy * 0.35);
          // the lid: an almond opening
          float lid = abs(p.y) - uOpen * 0.62 * (1.0 - pow(abs(p.x) / (0.5 * uAspect + 0.12), 2.0));
          float open = smoothstep(0.01, -0.01, lid);
          col = mix(vec3(0.0), col, open);
          // the hole: the pupil lets the scene through
          float hole = uHole * smoothstep(0.075, 0.06, r);
          alpha = uShow * (1.0 - hole);
        }
        // Amaterasu: black fire climbing the frame, its tongues licked by crimson and ember
        if (uAma > 0.0) {
          float y = vUv.y;
          float f = fbm(vec2(vUv.x * 4.0 * uAspect, y * 2.5 - uTime * 1.6));
          float front = uAma * 1.35 - 0.15 + 0.32 * (f - 0.5) + 0.12 * sin(vUv.x * 20.0 + uTime * 5.0);
          float inside = smoothstep(front + 0.01, front - 0.01, y);
          float rim = smoothstep(0.07, 0.0, abs(y - front));
          vec3 fire = mix(vec3(0.015, 0.0, 0.01), uRed * 1.2, rim * 0.8);
          fire = mix(fire, uEmber * 1.5, pow(rim, 3.0));
          col = mix(col, fire, max(inside, rim));
          alpha = max(alpha, max(inside, rim * 0.9));
        }
        float c = crows(p, uTime, uCrows);
        col = mix(col, vec3(0.01, 0.0, 0.015), c);
        alpha = max(alpha, c);
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }`,
  });
}

export function fieldMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uDepth: { value: 0.9999 }, uTime: { value: 0 }, uAspect: { value: 1.6 }, uShow: { value: 0 }, uCrows: { value: 0 }, ...colours() },
    vertexShader: QUAD_V,
    fragmentShader: /* glsl */ `
      uniform float uShow, uCrows;
      ${COMMON}
      void main() {
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
        // the sky: Tsukuyomi's crimson, darkening up, brushed in long horizontal strokes
        float stroke = fbm(vec2(p.x * 1.2 + uTime * 0.03, p.y * 9.0));
        vec3 sky = mix(uRed * 1.1, vec3(0.08, 0.0, 0.02), smoothstep(-0.35, 0.5, p.y));
        sky = mix(sky, uRed * 0.35, smoothstep(0.55, 0.8, stroke) * 0.8);
        sky = mix(sky, vec3(0.02, 0.0, 0.01), smoothstep(0.62, 0.74, fbm(vec2(p.x * 3.0 - 7.0, p.y * 14.0))) * 0.6);
        // the moon: huge, red, rimmed in black ink, its face a slow swirl
        vec2 m = p - vec2(0.38 * uAspect / 1.6, 0.17);
        float r = length(m);
        float face = fbm(m * 6.0 + vec2(uTime * 0.05, 0.0));
        vec3 moon = mix(vec3(1.0, 0.18, 0.2), uRed * 0.8, face * 0.8);
        sky = mix(sky, moon, smoothstep(0.235, 0.225, r));
        sky = mix(sky, vec3(0.02, 0.0, 0.01), smoothstep(0.012, 0.0, abs(r - 0.232) - 0.006));
        sky += uRed * 0.35 * exp(-max(r - 0.23, 0.0) * 9.0);
        // a black horizon of brushed ink, the ground the seal stands on
        float hz = -0.18 + 0.04 * fbm(vec2(p.x * 3.0, 1.0));
        sky = mix(sky, vec3(0.03, 0.0, 0.02), smoothstep(hz + 0.01, hz - 0.01, p.y));
        // crows drifting across the moon
        vec2 cp = vec2(fract(p.x * 0.5 + uTime * 0.04) * 2.0 - 1.0, p.y);
        float c = crows(cp * 0.9 - vec2(0.0, 0.2), uTime, 0.55 + 0.1 * sin(uTime * 0.3)) * uCrows;
        sky = mix(sky, vec3(0.01, 0.0, 0.015), c);
        sky *= 0.9 + 0.18 * noise(gl_FragCoord.xy * 0.3);
        gl_FragColor = vec4(sky, uShow);
        #include <colorspace_fragment>
      }`,
  });
}

export { quad };
