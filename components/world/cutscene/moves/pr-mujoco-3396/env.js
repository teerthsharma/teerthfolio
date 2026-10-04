// THE SKY AND THE GROUND of the charcoal dimension, each one mesh with its own shader.
//
// The sky: charcoal rubbed dark overhead, a burnt-orange haze low down, the
// low sun behind the Wall in a cream blaze, and columns of steam rising off
// the horizon (the Rumbling's), hatched where they turn from the light.
// The ground, in the scene's own frame: the cobbled square and the district's
// streets inside the Wall (the crack races along them to the Wall, and the
// ice-crust cracks under each footfall), the scorched plain outside it, and
// past it the sea in its single cold blue.

import { BackSide, PlaneGeometry, ShaderMaterial, SphereGeometry } from "three";
import { INK, U } from "./charcoal";

export function sky() {
  const g = new SphereGeometry(1, 40, 20);
  const m = new ShaderMaterial({
    uniforms: { ...U },
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vD;
      void main() {
        vD = normalize(mat3(modelMatrix) * position);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vD;
      ${INK}
      void main() {
        vec3 d = normalize(vD);
        float h = d.y;
        float s = max(dot(d, uSun), 0.0);
        float az = atan(d.x, -d.z);
        // charcoal overhead, a pale band low down
        float tone = mix(0.66, 0.2, smoothstep(0.02, 0.55, h));
        // steam columns off the horizon, soft rubbed charcoal, leaning in the wind
        float lean = az + h * 0.35;
        float cols = smoothstep(0.45, 0.85, iNoise(vec2(lean * 7.0, 0.5))) * (1.0 - smoothstep(0.02, 0.42 + 0.2 * iNoise(vec2(lean * 3.0, 4.0)), h));
        float billow = iNoise(vec2(lean * 22.0, h * 9.0 - uTime * 0.25));
        tone = mix(tone, 0.55 + 0.35 * billow, cols * 0.85);
        // the low sun: a blaze through the haze and the steam
        tone += pow(s, 6.0) * 0.45 + pow(s, 60.0) * 0.6;
        // the AoT sunset: crimson overhead, amber to gold at the horizon, white steam, a light graphite over it
        vec3 sk = mix(vec3(1.0, 0.62, 0.14), vec3(0.62, 0.06, 0.1), smoothstep(0.0, 0.5, h));
        sk = mix(sk, vec3(0.22, 0.03, 0.08), smoothstep(0.45, 0.95, h));
        sk += vec3(1.0, 0.55, 0.15) * (pow(s, 4.0) * 0.6 + pow(s, 40.0) * 0.8);
        sk = mix(sk, vec3(1.0, 0.97, 0.92) * (0.8 + 0.2 * billow), cols * 0.9);
        vec3 c = mix(sk, sk * 0.35, graphite(clamp(tone + 0.3, 0.0, 1.0)) * 0.35);
        c = mix(c, vec3(1.0, 0.95, 0.75), smoothstep(0.9975, 0.999, s)); // the disc itself
        gl_FragColor = outColor(c, 1.0);
      }`,
  });
  return { g, m };
}

export function ground() {
  const g = new PlaneGeometry(1800, 1800, 1, 1).rotateX(-Math.PI / 2);
  const m = new ShaderMaterial({
    uniforms: { ...U, uCrack: { value: 0 }, uIce: { value: 0 }, uQuake: { value: 0 }, uSea: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vO;
      varying vec3 vW;
      void main() {
        vO = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uCrack, uIce, uQuake, uSea;
      varying vec3 vO;
      varying vec3 vW;
      ${INK}
      float zF(float x) { return -30.0 - x * x / 900.0; }
      // a jagged crack along a line: distance to it (m)
      float crackLine(vec2 p, vec2 a, vec2 dir, float len, float seed) {
        vec2 n = vec2(-dir.y, dir.x);
        float u = dot(p - a, dir);
        if (u < 0.0 || u > len) return 99.0;
        float off = (iNoise(vec2(u * 0.45, seed)) - 0.5) * 2.2 + (iNoise(vec2(u * 2.1, seed + 3.0)) - 0.5) * 0.5;
        return abs(dot(p - a, n) - off);
      }
      void main() {
        vec2 p = vO.xz;
        float dist = length(cameraPosition - vW);
        float px = dist * 0.0012; // about a pixel's footprint, for fading fine detail out
        float wall = zF(p.x);
        float tone;
        float wash = 0.1;
        vec3 keep = vec3(1.0);
        float keepK = 0.0;
        if (p.y > wall - 3.0) {
          // COBBLES: offset courses of rounded setts, mortar dark between, each stone its own value
          vec2 q = vec2(p.x / 0.5, p.y / 0.36);
          float row = floor(q.y);
          q.x += mod(row, 2.0) * 0.5;
          vec2 f = fract(q) - 0.5;
          float stone = iHash(floor(q) + row * 0.37);
          float edge = max(abs(f.x) * 1.0, abs(f.y) * 1.0);
          float mortar = smoothstep(0.36, 0.48, edge);
          tone = mix(0.66 + 0.18 * stone, 0.3, mortar);
          tone = mix(tone, 0.6, smoothstep(0.02, 0.12, px)); // far off the setts blur to one value
          tone *= 0.95 + 0.1 * iNoise(p * 0.3);
          // the square: a ring of dark setts round the pup's spot
          tone = mix(tone, tone * 0.75, smoothstep(0.3, 0.0, abs(length(p) - 5.0)));
          // THE CRACK: it races from the pup to the Wall, ember-lit at its head
          float reach = uCrack * 30.0;
          float c = crackLine(p, vec2(0.0, -0.8), vec2(0.0, -1.0), reach, 1.7);
          float head = smoothstep(4.0, 0.0, abs(-p.y - reach)) * step(0.01, uCrack) * step(uCrack, 0.99);
          float cw = 0.06 + 0.1 * iNoise(p * 2.0);
          tone = mix(tone, 0.02, 1.0 - smoothstep(cw, cw + 0.05, c));
          float ember = (1.0 - smoothstep(0.0, cw * 3.0, c)) * head;
          // the ice crust over the setts cracks under each footfall: branches out of the square
          float ice = 99.0;
          for (int k = 0; k < 7; k++) {
            float a = float(k) * 0.9 + 0.4;
            ice = min(ice, crackLine(p, vec2(0.0), vec2(cos(a), sin(a)), uIce * (9.0 + 6.0 * iHash(vec2(float(k), 2.0))), float(k) * 5.1));
          }
          tone = mix(tone, 0.08, (1.0 - smoothstep(0.03, 0.07, ice)) * step(0.001, uIce));
          vec3 col = drawn(tone, wash + uQuake * 0.1, keep, keepK);
          col = mix(col, vec3(1.0, 0.55, 0.2), ember * 0.9);
          gl_FragColor = outColor(col, 1.0);
          return;
        }
        if (p.y > -72.0) {
          // THE PLAIN: scorched earth, cracked into plates, ash-pale where the march trampled
          vec2 q = p / 7.0;
          vec2 i = floor(q);
          float dmin = 9.0;
          float d2 = 9.0;
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            vec2 o = vec2(float(x), float(y));
            vec2 r = o + vec2(iHash(i + o), iHash(i + o + 7.0)) - fract(q);
            float d = dot(r, r);
            if (d < dmin) { d2 = dmin; dmin = d; } else if (d < d2) d2 = d;
          }
          float seam = 1.0 - smoothstep(0.0, 0.08 + px * 2.0, sqrt(d2) - sqrt(dmin));
          tone = 0.4 + 0.18 * iNoise(p * 0.08) - 0.25 * seam;
          wash = 0.22;
        } else {
          // THE SEA: one cold blue, long level strokes, the sun's path on it
          float s = pow(max(dot(normalize(vW - cameraPosition), uSun), 0.0), 20.0);
          tone = 0.48 + 0.25 * iNoise(vec2(p.x * 0.02, p.y * 0.2)) + s * 0.6;
          // charcoal grey water until the Wall opens; then the sea comes in, the one cold blue
          keep = vec3(0.33, 0.52, 0.72);
          keepK = 0.9 * uSea;
          wash = 0.25 * (1.0 - uSea);
        }
        gl_FragColor = outColor(drawn(tone, wash, keep, keepK), 1.0);
      }`,
  });
  return { g, m };
}
