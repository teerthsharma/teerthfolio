// THE COSMIC SHADING: how the pup and the silhouette are drawn in the Infinite Void.
// Three painted bands of light taken from the core (the light is behind them, so the
// fronts fall to deep violet and the edges catch a white-violet rim), a brush grain,
// and Kirby-krackle halftone dots where the bands turn. The pup keeps its own
// colours' lightness (its eyes and nose stay dark) but wears the dimension's ramp;
// the instant the domain closes it snaps back to its own materials.

import { Color, ShaderMaterial, Vector3 } from "three";
import { HALFTONE } from "../../Stage";

// shared by every cosmic material: one write a frame
export const SHARED = { uCore: { value: new Vector3() }, uTime: { value: 0 }, uCell: { value: 6 }, uSway: { value: 1 }, uLock: { value: 0 } };

const srgb = (c) => new Color().copy(c).convertLinearToSRGB();

// opts: color (a three Color, linear), vertexColors, transparent, opacity, flat (facets from derivatives, for the
// low-poly silhouette), sway (hair: attributes aW along each spike and aPh a phase), keep (how much of the
// original hue survives), glow (a tip glow on the hair, 0..1)
export function cosmicMaterial({ color, vertexColors = false, transparent = false, opacity = 1, flat = false, sway = false, keep = 0.16, glow = 0, rim = 1, dots = 1, edge = 0, smooth = false }) {
  return new ShaderMaterial({
    uniforms: { ...SHARED, uBase: { value: srgb(color) }, uOpacity: { value: opacity }, uKeep: { value: keep }, uGlow: { value: glow }, uRim: { value: rim }, uDots: { value: dots }, uEdge: { value: edge } },
    vertexColors,
    transparent,
    defines: { FLAT: flat && !smooth ? 1 : 0, SWAY: sway ? 1 : 0 },
    vertexShader: /* glsl */ `
      uniform float uTime, uSway;
      varying vec3 vN;
      varying vec3 vP;
      varying vec3 vCol;
      varying float vW;
      #if SWAY
        attribute float aW;
        attribute float aPh;
      #endif
      void main() {
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = pow(color.rgb, vec3(1.0 / 2.2));
        #endif
        vec3 pos = position;
        vW = 0.0;
        #if SWAY
          vW = aW;
          float k = aW * aW * uSway;
          pos += k * 0.09 * vec3(sin(uTime * 1.9 + aPh * 6.0), 0.25 * sin(uTime * 2.7 + aPh * 9.0), sin(uTime * 1.4 + aPh * 4.0));
        #endif
        vec4 wp = modelMatrix * vec4(pos, 1.0);
        vP = wp.xyz;
        #if FLAT == 0
          vN = normalize(mat3(modelMatrix) * normal);
        #else
          vN = vec3(0.0, 1.0, 0.0);
        #endif
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase, uCore;
      uniform float uOpacity, uKeep, uGlow, uRim, uTime, uLock, uDots, uEdge;
      varying vec3 vN;
      varying vec3 vP;
      varying vec3 vCol;
      varying float vW;
      ${HALFTONE}
      float pHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float pNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(pHash(i), pHash(i + vec2(1, 0)), f.x), mix(pHash(i + vec2(0, 1)), pHash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        #if FLAT
          vec3 n = normalize(cross(dFdx(vP), dFdy(vP)));
          if (dot(n, cameraPosition - vP) < 0.0) n = -n;
        #else
          vec3 n = normalize(vN);
        #endif
        vec3 V = normalize(cameraPosition - vP);
        vec3 L = normalize(uCore - vP);
        float ndl = dot(n, L);
        float nv = max(dot(n, V), 0.0);
        vec3 alb = uBase * vCol;
        float lum = dot(alb, vec3(0.299, 0.587, 0.114));
        // the core is behind: faces to the lens get the dim fill from the glass below and the sky above
        float fill = 0.30 + 0.20 * (n.y * 0.5 + 0.5);
        float key = smoothstep(-0.15, 0.55, ndl);
        float stroke = pNoise(vec2(gl_FragCoord.x * 0.02, gl_FragCoord.y * 0.17)) - 0.5;
        float t = (fill + 0.55 * key + stroke * 0.14) * (0.28 + 0.9 * lum);
        float band = 0.30 + 0.34 * smoothstep(0.26, 0.31, t) + 0.36 * smoothstep(0.52, 0.57, t);
        vec3 sh = vec3(0.07, 0.05, 0.22);
        vec3 md = vec3(0.40, 0.30, 0.80);
        vec3 hi = vec3(0.94, 0.90, 1.0);
        vec3 col = mix(sh, md, smoothstep(0.30, 0.64, band));
        col = mix(col, hi, smoothstep(0.64, 1.0, band) * (0.4 + 0.6 * lum));
        col = mix(col, alb * (0.55 + 0.9 * band), uKeep);
        // krackle dots where the tones turn
        float turn = smoothstep(0.25, 0.4, t) * (1.0 - smoothstep(0.4, 0.6, t));
        col = mix(col, vec3(0.97, 0.94, 1.0), (uCell > 0.0 ? halftone(turn * 0.8) : 0.0) * 0.4 * uDots);
        float rim = pow(1.0 - nv, 2.4) * (0.3 + 0.9 * smoothstep(-0.1, 0.6, ndl)) * uRim;
        col += vec3(0.86, 0.78, 1.0) * rim * 0.9;
        // the white-violet rim light of the domain: along the jaw, collar and shoulders (faces turned up and to the edge)
        float edge = pow(1.0 - nv, 1.7) * (0.45 + 0.55 * smoothstep(-0.4, 0.5, ndl)) + 0.55 * smoothstep(0.35, 0.95, n.y) * (0.5 + 0.5 * nv);
        col = mix(col, vec3(0.80, 0.74, 1.0), clamp(edge * uEdge, 0.0, 0.9));
        col += vec3(0.8, 0.7, 1.0) * uGlow * pow(vW, 2.5) * 0.7;
        col += vec3(0.8, 0.7, 1.0) * uLock * 0.18 * (0.4 + rim);
        gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), uOpacity);
        if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
      }`,
  });
}

// The pup's cosmic twins: one for each of its materials, swapped in and out.
export function pupCosmic(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return; // the contact shadow keeps its own
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = cosmicMaterial({ color: m.color ?? new Color(1, 1, 1), vertexColors: Boolean(m.vertexColors), transparent: m.transparent, opacity: m.opacity ?? 1 });
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v) {
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false);
      for (const p of twins.values()) p.dispose();
    },
  };
}
