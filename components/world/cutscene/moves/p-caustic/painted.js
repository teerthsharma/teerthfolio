// THE PAINTED WAR DIMENSION's shared look: film grain, brushwork, sepia.
// Everything in the war is ashen sepia paint except the Tsukuyomi moon and
// the Susanoo's blue fire. The pup takes the treatment too: for the war its
// meshes wear a painted material (its own colours turned sepia, three soft
// painted bands of light, a warm rim, grain), and the instant the picture
// breaks it snaps back to its own full-colour materials with the island.

import { Color, DoubleSide, ShaderMaterial } from "three";

// per-pixel grain that crawls every frame, and a brush texture in screen space
export const PAINT = /* glsl */ `
  float pHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float grain(float t) { return pHash(floor(gl_FragCoord.xy) + fract(t * 7.13) * 113.0) - 0.5; }
  float pNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1, 0)), f.x), mix(pHash(i + vec2(0, 1)), pHash(i + vec2(1, 1)), f.x), f.y);
  }
  // diagonal brush strokes, a few pixels wide, in screen space
  float brush() {
    vec2 p = mat2(0.82, -0.57, 0.57, 0.82) * gl_FragCoord.xy;
    return pNoise(vec2(p.x * 0.012, p.y * 0.16)) * 0.6 + pNoise(vec2(p.x * 0.03, p.y * 0.3)) * 0.4;
  }
  vec3 sepia(vec3 c, float keep) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    return mix(vec3(l * 1.08, l * 0.94, l * 0.74), c, keep);
  }`;

// sRGB for the shaders (they pick in sRGB and write pow 2.2, like the stage's)
const srgb = (c) => new Color().copy(c).convertLinearToSRGB();

// A painted material: `color` (a three Color, linear), vertex colours if the original had them.
export function paintedMaterial({ color, vertexColors = false, transparent = false, opacity = 1, keep = 0.12, side }) {
  return new ShaderMaterial({
    uniforms: { uBase: { value: srgb(color) }, uTime: { value: 0 }, uOpacity: { value: opacity }, uKeep: { value: keep } },
    vertexColors,
    transparent,
    ...(side ? { side } : {}),
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vCol;
      void main() {
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = pow(color.rgb, vec3(1.0 / 2.2));
        #endif
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = -mv.xyz;
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform float uTime, uOpacity, uKeep;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vCol;
      ${PAINT}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vV);
        float d = dot(n, normalize(vec3(-0.45, 0.75, 0.5))) * 0.5 + 0.5;
        d += (brush() - 0.5) * 0.22;
        // three soft painted bands, not a smooth gradient
        float band = 0.42 + 0.33 * smoothstep(0.38, 0.46, d) + 0.25 * smoothstep(0.66, 0.74, d);
        vec3 c = sepia(uBase * vCol, uKeep) * band;
        c += vec3(1.0, 0.86, 0.66) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.35; // the warm rim of the haze
        c += grain(uTime) * 0.09;
        gl_FragColor = vec4(pow(max(c, 0.0), vec3(2.2)), uOpacity);
      }`,
  });
}

// The pup's paint: a painted twin for each of its materials, swapped in and out.
export function pupPaint(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial) return; // the contact shadow keeps its own
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = paintedMaterial({ color: m.color ?? new Color(1, 1, 1), vertexColors: Boolean(m.vertexColors), transparent: m.transparent, opacity: m.opacity ?? 1 });
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    set(v, t) {
      for (const p of twins.values()) p.uniforms.uTime.value = t;
      if (v === on) return;
      on = v;
      for (const [o, m, p] of list) o.material = v ? p : m;
    },
    dispose() {
      this.set(false, 0);
      for (const p of twins.values()) p.dispose();
    },
  };
}
