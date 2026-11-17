// The live look's charcoal materials: the deployed charcoal.js (460bafd) with its notes kept there. The shared inks live in ../ink.js.
// Solids write SOLID_ID and pass the site's last stage (tone.js); a smudge is a premultiplied overlay.
import { Color, DoubleSide, ShaderMaterial, Vector3 } from "three";
import { INK, SOLID_ID, U } from "../ink.js";
import { TONE, tone as toneMat } from "../tone.js";

export { U };

export function charcoal({ tone = 0.7, wash = 0.42, keep = "#ffffff", keepK = 0, rim = 0.35, edge = 1, rib = 0, skin = 0, march = false, side, transparent = false, opacity = 1, haze = 1, glow, vertexColors = false, shard = false, extra = {} } = {}) {
  const uniforms = {
    ...U,
    uTone: { value: tone },
    uWash: { value: wash },
    uKeep: { value: new Color(keep).convertLinearToSRGB() },
    uKeepK: { value: keepK },
    uRim: { value: rim },
    uEdge: { value: edge },
    uRib: { value: rib },
    uSkin: { value: skin },
    uOpacity: { value: opacity },
    uHaze: { value: haze },
    uGlow: { value: glow ? new Color(glow).convertLinearToSRGB() : new Color(0, 0, 0) },
    uGlowK: { value: 0 },
    uStep: { value: 0 },
    uBreak: { value: 0 },
    ...extra,
  };
  const alpha = transparent ? "uOpacity" : String(SOLID_ID);
  const mat = new ShaderMaterial({
    uniforms,
    transparent,
    vertexColors,
    ...(side ? { side } : {}),
    defines: { ...(march ? { MARCH: 1 } : {}), ...(shard ? { SHARD: 1 } : {}) },
    vertexShader: /* glsl */ `
      uniform float uStep, uBreak;
      #ifdef SHARD
        attribute vec3 aCenter;
        attribute float aRand;
      #endif
      varying vec3 vW;
      varying vec3 vN;
      varying vec3 vO;
      varying vec3 vC;
      varying float vK;
      varying float vT;
      #ifdef MARCH
        attribute vec2 aPhase;
      #endif
      void main() {
        mat4 im = mat4(1.0);
        vC = vec3(1.0);
        vK = 0.0;
        #ifdef USE_INSTANCING
          im = instanceMatrix;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC = pow(instanceColor, vec3(1.0 / 2.2));
          vK = 1.0;
        #endif
        vT = 1.0;
        #ifdef USE_COLOR
          vT = color.r;
        #endif
        vec3 p = position;
        vO = position;
        #ifdef MARCH
          float s = uStep + aPhase.x;
          float lift = abs(sin(s * 3.14159));
          p.y += lift * 0.035;
          p.x += sin(s * 3.14159) * 0.03 * p.y;
          p.z += (fract(s) - 0.5) * 0.02 * p.y;
        #endif
        vec3 nn = normal;
        #ifdef SHARD
          float tau = uBreak - aRand * 0.7;
          if (uBreak > 0.0 && tau > 0.0) {
            vec3 rel = p - aCenter;
            vec3 ax = normalize(vec3(aRand - 0.5, 0.6, fract(aRand * 7.3) - 0.5));
            float a = min(tau, 1.6) * (1.5 + 4.0 * aRand);
            rel = rel * cos(a) + cross(ax, rel) * sin(a) + ax * dot(ax, rel) * (1.0 - cos(a));
            nn = nn * cos(a) + cross(ax, nn) * sin(a) + ax * dot(ax, nn) * (1.0 - cos(a));
            vec3 c = aCenter + vec3((aRand - 0.5) * 3.0 * tau, -4.9 * tau * tau, (1.2 + 2.5 * fract(aRand * 3.7)) * min(tau, 1.4));
            c.y = max(c.y, 0.25 + 0.4 * aRand);
            p = c + rel * (1.0 - 0.35 * clamp(tau, 0.0, 1.0));
          }
        #endif
        vec4 w = modelMatrix * im * vec4(p, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * mat3(im) * nn);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTone, uWash, uKeepK, uRim, uEdge, uRib, uSkin, uOpacity, uHaze, uGlowK;
      uniform vec3 uKeep, uGlow;
      varying vec3 vW;
      varying vec3 vN;
      varying vec3 vO;
      varying vec3 vC;
      varying float vK;
      varying float vT;
      ${INK}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        float facing = dot(n, v);
        if (facing < 0.0) { n = -n; facing = -facing; }
        float sun = max(dot(n, uSun), 0.0);
        float tone = uTone * vT * (0.5 + 0.25 * max(n.y, 0.0) + 0.38 * max(dot(n, normalize(vec3(-0.4, 0.5, 0.75))), 0.0) + 0.45 * sun);
        float rim = pow(1.0 - facing, 3.0) * max(dot(-v, uSun) * 0.5 + 0.5, 0.0);
        tone += rim * uRim;
        if (uSkin > 0.0) tone -= uSkin * 0.22 * smoothstep(0.35, 0.9, iNoise(vec2(vO.x * 9.0, vO.y * 1.4)));
        float dist = length(cameraPosition - vW);
        float far = smoothstep(120.0, 900.0, dist) * uHaze;
        tone = mix(tone, 0.62, far * 0.55);
        float wash = uWash + 0.4 * pow(max(dot(-v, uSun), 0.0), 5.0) + far * 0.3;
        vec3 c = drawn(tone, wash, mix(uKeep, vC, vK), max(uKeepK, vK * 0.85));
        float brk = step(0.32, iNoise(gl_FragCoord.xy / uPx * 0.07));
        float crease = smoothstep(0.08, 0.3, length(fwidth(n)));
        float sil = (1.0 - smoothstep(0.08, 0.22, facing)) * smoothstep(0.01, 0.04, fwidth(facing));
        c = mix(c, vec3(0.1, 0.09, 0.085), max(crease, sil) * brk * uEdge * (1.0 - far * 0.7));
        if (uRib > 0.0) {
          float band = smoothstep(0.9, 0.98, abs(fract((vO.y + 2.4 * vO.x * vO.x) * 10.0) - 0.5) * 2.0) * smoothstep(0.24, 0.32, vO.y) * (1.0 - smoothstep(0.52, 0.6, vO.y)) * (1.0 - smoothstep(0.1, 0.2, abs(vO.x)));
          c = mix(c, vec3(0.96, 0.58, 0.3), band * uRib * 0.55 * (0.7 + 0.3 * sin(uTime * 3.0 + vW.x * 0.05)));
        }
        c = mix(c, uGlow, uGlowK);
        gl_FragColor = outColor(c, ${alpha});
      }`,
  });
  return transparent ? mat : toneMat(mat);
}

export function smudgeMaterial({ dark = 0.0, size = 1, tint, opacity = 0.85 } = {}) {
  return new ShaderMaterial({
    uniforms: { ...U, uPup: { value: new Vector3() }, uPupK: { value: 1 }, uSize: { value: size }, uDark: { value: dark }, uOn: { value: 1 }, uClock: { value: 0 }, uTint: { value: new Color(tint ?? "#ffffff") }, uTintK: { value: tint ? 1 : 0 }, uAlpha: { value: opacity } },
    transparent: true,
    depthWrite: false,
    premultipliedAlpha: true,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aSrc;
      attribute vec4 aLife;
      uniform vec3 uPup;
      uniform float uPupK, uSize, uClock, uOn;
      varying vec2 vUv;
      varying float vA;
      varying float vSeed;
      varying float vDark;
      void main() {
        vUv = uv;
        vSeed = aLife.z;
        float age = uClock - aLife.x;
        float life = fract(age / aLife.y + aLife.z);
        float on = step(0.0, age) * uOn;
        vec3 src = (modelMatrix * vec4(aSrc, 1.0)).xyz;
        float k = 1.0;
        if (aLife.w > 0.5 && aLife.w < 1.5) { src = uPup + aSrc * uPupK; k = uPupK; on *= step(1.2, uPupK); }
        vec3 c = src + vec3(sin(life * 6.0 + aLife.z * 30.0) * 0.6, life * 9.0, cos(life * 5.0 + aLife.z * 20.0) * 0.4) * k * uSize;
        float s = uSize * k * (0.6 + 2.2 * life) * on;
        vA = on * smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.55, 1.0, life));
        vDark = 0.0;
        if (aLife.w > 1.5) {
          vec3 box = vec3(60.0, 26.0, 50.0);
          vec3 q = aSrc + vec3(-1.6, -1.1, 0.4) * aLife.y * uClock;
          q = mod(q, box) - box * 0.5;
          c = q + cameraPosition;
          s = 0.05 + 0.05 * aLife.z;
          vA = uOn;
          vDark = 1.0;
        }
        vec4 mv = viewMatrix * vec4(c, 1.0);
        mv.xy += position.xy * s;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uDark, uTintK, uAlpha;
      uniform vec3 uTint;
      varying vec2 vUv;
      varying float vA;
      varying float vSeed;
      varying float vDark;
      ${INK}
      ${TONE}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p) + (iNoise(p * 2.5 + vSeed * 13.0) - 0.5) * 0.45;
        float a = (1.0 - smoothstep(0.35, 1.0, r)) * vA;
        if (a < 0.01) discard;
        if (vDark > 0.5) { vec4 o = outColor(vec3(0.16, 0.14, 0.13), a); gl_FragColor = vec4(siteTone(o.rgb) * o.a, o.a); return; }
        float tone = mix(0.92, 0.55, smoothstep(0.1, 0.9, r)) - uDark;
        vec3 c = drawn(tone, 0.18, vec3(1.0), 0.0);
        c = mix(c, uTint, uTintK);
        vec4 o = outColor(c, a * uAlpha);
        gl_FragColor = vec4(siteTone(o.rgb) * o.a, o.a);
      }`,
  });
}
