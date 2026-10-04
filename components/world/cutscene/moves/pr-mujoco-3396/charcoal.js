// THE CHARCOAL DIMENSION's one look: graphite and charcoal on warm grey
// toothy paper. Every material here shades by light value into strokes in
// screen space (gl_FragCoord): fine parallel hatching in the half-tones, a
// cross-hatch in the shadows, a dense third pass in the deepest shadow, soft
// smudged charcoal under it all, and thick broken contour lines where facets
// turn (fwidth of the facet normal) and round the silhouettes (fresnel). The
// only colours: one burnt-orange wash from the low sun, the coral of the
// fish-cubes, and, once the Wall opens, the sea's single cold blue. No post
// pass: each material draws its own strokes.
//
// The return home is in here too: every material burns away from a point on
// screen (uBurn, the radius in screen heights; uBurnC, the centre in px)
// with a charred band and an ember edge, so the drawing burns off the real
// island behind it.

import { Color, DoubleSide, ShaderMaterial, Vector2, Vector3 } from "three";

// One set of uniforms every charcoal material shares (the same objects, so one write reaches them all).
export const U = {
  uPx: { value: 1 }, // device pixels per CSS pixel: the strokes keep their size on every screen
  uTime: { value: 0 },
  uRes: { value: new Vector2(1, 1) }, // the drawing buffer, px
  uBurn: { value: -1 }, // < 0: whole
  uBurnC: { value: new Vector2() },
  uSun: { value: new Vector3(0.22, 0.16, -0.96).normalize() }, // toward the low sun, behind the Wall
};

export const INK = /* glsl */ `
  uniform float uPx, uTime, uBurn;
  uniform vec2 uRes, uBurnC;
  uniform vec3 uSun;
  float iHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float iNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(iHash(i), iHash(i + vec2(1, 0)), f.x), mix(iHash(i + vec2(0, 1)), iHash(i + vec2(1, 1)), f.x), f.y);
  }
  // one family of strokes at angle a, sp px apart, half-width w (0..1 of the gap), broken along their length
  float strokes(vec2 q, float a, float sp, float w) {
    vec2 d = vec2(cos(a), sin(a));
    float along = dot(q, d);
    float u = dot(q, vec2(-d.y, d.x)) / sp;
    float row = floor(u);
    float wob = iNoise(vec2(along * 0.035, row * 1.7)) - 0.5;
    float f = abs(fract(u + wob * 0.35) - 0.5) * 2.0;
    float press = 0.55 + 0.45 * iNoise(vec2(along * 0.06, row * 3.1));
    float line = 1.0 - smoothstep(w * press, w * press + 0.22, f);
    return line * step(0.2, iNoise(vec2(along * 0.045, row * 5.3 + 7.0)));
  }
  float tooth() {
    vec2 q = gl_FragCoord.xy / uPx;
    return iNoise(q * 0.85) * 0.55 + iNoise(q * 0.21) * 0.45;
  }
  // tone 0 black .. 1 paper: how much graphite lands here
  float graphite(float tone) {
    vec2 q = gl_FragCoord.xy / uPx;
    float ink = strokes(q, 0.95, 8.0, 0.18) * (1.0 - smoothstep(0.34, 0.56, tone));
    ink = max(ink, strokes(q, -0.7, 8.0, 0.2) * (1.0 - smoothstep(0.16, 0.3, tone)));
    ink = max(ink, strokes(q, 0.12, 6.0, 0.3) * (1.0 - smoothstep(0.04, 0.14, tone)));
    float smudge = pow(1.0 - clamp(tone, 0.0, 1.0), 2.0) * 0.4;
    return clamp(max(ink * 0.82, smudge), 0.0, 1.0);
  }
  // the paper, washed (burnt orange) or kept in a colour, then the graphite over it
  vec3 drawn(float tone, float wash, vec3 keep, float keepK) {
    float t = tooth();
    vec3 paper = vec3(0.98, 0.82, 0.62) * (0.93 + 0.1 * t);
    paper = mix(paper, vec3(1.0, 0.45, 0.12), clamp(wash * 1.4, 0.0, 1.0));
    paper = mix(paper, keep * (0.75 + 0.35 * clamp(tone, 0.0, 1.0)), keepK);
    float ink = graphite(tone) * (0.78 + 0.42 * t);
    return mix(paper, vec3(0.22, 0.04, 0.06), clamp(ink * 0.6, 0.0, 1.0));
  }
  // the drawing burning off: discard inside the hole, a charred band and an ember edge round it
  vec3 burn(vec3 c) {
    if (uBurn < 0.0) return c;
    float d = length((gl_FragCoord.xy - uBurnC) / uRes.y) + (iNoise(gl_FragCoord.xy / uPx * 0.025) - 0.5) * 0.16 + (iNoise(gl_FragCoord.xy / uPx * 0.11) - 0.5) * 0.04;
    float e = d - uBurn;
    if (e < 0.0) discard;
    c *= mix(0.25, 1.0, smoothstep(0.012, 0.07, e));
    return mix(c, vec3(1.0, 0.52, 0.16), 1.0 - smoothstep(0.0, 0.016, e));
  }
  vec4 outColor(vec3 c, float a) { return vec4(pow(max(burn(c), 0.0), vec3(2.2)), a); }
`;

// A shaded charcoal material. tone: the surface's own value (0 black .. 1 paper);
// wash: its burnt-orange wash; keep/keepK: a colour it keeps (coral, blue);
// instance colours, if any, are kept colours. rim: the low sun's rim on the silhouette.
// rib: the seal-titans' glowing ribs (object space). skin: the titans' bare-muscle striations.
// march: the horizon column marches in the vertex shader (aPhase per instance).
export function charcoal({ tone = 0.7, wash = 0.12, keep = "#ffffff", keepK = 0, rim = 0.35, edge = 1, rib = 0, skin = 0, march = false, side, transparent = false, opacity = 1, haze = 1, glow, vertexColors = false, shard = false, extra = {} } = {}) {
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
    uStep: { value: 0 }, // the march's clock
    uBreak: { value: 0 }, // s since a carved face split (shard: true)
    ...extra,
  };
  return new ShaderMaterial({
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
        attribute vec2 aPhase; // x: the step phase, y: the instance's size (m)
      #endif
      void main() {
        mat4 im = mat4(1.0);
        vC = vec3(1.0);
        vK = 0.0;
        #ifdef USE_INSTANCING
          im = instanceMatrix;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC = pow(instanceColor, vec3(1.0 / 2.2)); // the colours are linear; the ink works in display values
          vK = 1.0;
        #endif
        vT = 1.0;
        #ifdef USE_COLOR
          vT = color.r; // a vertex colour is a tone: the penguin's white belly, the titan's dark mouth
        #endif
        vec3 p = position;
        vO = position;
        #ifdef MARCH
          // each step: a lurch forward and up, a roll side to side
          float s = uStep + aPhase.x;
          float lift = abs(sin(s * 3.14159));
          p.y += lift * 0.035;
          p.x += sin(s * 3.14159) * 0.03 * p.y;
          p.z += (fract(s) - 0.5) * 0.02 * p.y;
        #endif
        vec3 nn = normal;
        #ifdef SHARD
          // the skin splits off a carved face: each triangle tips out, tumbles, falls and lies as rubble at the foot
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
        // the seal-titans' bare muscle: long striations down the body
        if (uSkin > 0.0) tone -= uSkin * 0.22 * smoothstep(0.35, 0.9, iNoise(vec2(vO.x * 9.0, vO.y * 1.4)));
        float dist = length(cameraPosition - vW);
        float far = smoothstep(120.0, 900.0, dist) * uHaze;
        tone = mix(tone, 0.62, far * 0.55);
        float wash = uWash + 0.4 * pow(max(dot(-v, uSun), 0.0), 5.0) + far * 0.3;
        vec3 c = drawn(tone, wash, mix(uKeep, vC, vK), max(uKeepK, vK * 0.85));
        // contours: thick and broken, where facets turn and round the silhouette
        float brk = step(0.32, iNoise(gl_FragCoord.xy / uPx * 0.07));
        float crease = smoothstep(0.08, 0.3, length(fwidth(n)));
        // the silhouette only where the surface turns away fast (a curve), never over a flat face seen edge-on
        float sil = (1.0 - smoothstep(0.08, 0.22, facing)) * smoothstep(0.01, 0.04, fwidth(facing));
        c = mix(c, vec3(0.1, 0.09, 0.085), max(crease, sil) * brk * uEdge * (1.0 - far * 0.7));
        // the ribs glow through the titans' chests, ember orange
        if (uRib > 0.0) {
          // thin ribs arching down round the chest, ember through the skin, no spine (it would read as a fishbone)
          float band = smoothstep(0.9, 0.98, abs(fract((vO.y + 2.4 * vO.x * vO.x) * 10.0) - 0.5) * 2.0) * smoothstep(0.24, 0.32, vO.y) * (1.0 - smoothstep(0.52, 0.6, vO.y)) * (1.0 - smoothstep(0.1, 0.2, abs(vO.x)));
          c = mix(c, vec3(0.96, 0.58, 0.3), band * uRib * 0.55 * (0.7 + 0.3 * sin(uTime * 3.0 + vW.x * 0.05)));
        }
        c = mix(c, uGlow, uGlowK);
        gl_FragColor = outColor(c, uOpacity);
      }`,
  });
}

// The pup in the charcoal: its own colours drained toward the paper, hatched on its shadow side, an ink contour.
function pupMaterial(color, vertexColors) {
  return new ShaderMaterial({
    uniforms: { ...U, uBase: { value: new Color().copy(color).convertLinearToSRGB() } },
    vertexColors,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vCol;
      void main() {
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = pow(color.rgb, vec3(1.0 / 2.2));
        #endif
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      varying vec3 vN;
      varying vec3 vW;
      varying vec3 vCol;
      ${INK}
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(cameraPosition - vW);
        vec3 base = uBase * vCol;
        float lum = dot(base, vec3(0.299, 0.587, 0.114));
        float light = 0.45 + 0.55 * max(dot(n, normalize(vec3(-0.5, 0.7, 0.55))), 0.0);
        float tone = lum * 0.4 + light * 0.62 - 0.12 + pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.25;
        vec3 keep = mix(vec3(lum), base, 0.5);
        vec3 c = drawn(tone, 0.1, keep, 0.22);
        c = mix(c, vec3(0.1, 0.09, 0.085), (1.0 - smoothstep(0.1, 0.26, dot(n, v))) * step(0.3, iNoise(gl_FragCoord.xy / uPx * 0.08)));
        gl_FragColor = outColor(c, 1.0);
      }`,
  });
}

// The pup's charcoal twins, swapped in and out (the contact shadow and anything already a shader keeps its own).
export function pupCharcoal(root) {
  const list = [];
  const twins = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.isShaderMaterial || o.material.transparent) return;
    const m = o.material;
    let p = twins.get(m);
    if (!p) {
      p = pupMaterial(m.color ?? new Color(1, 1, 1), Boolean(m.vertexColors));
      twins.set(m, p);
    }
    list.push([o, m, p]);
  });
  let on = false;
  return {
    meshes: list.map(([o, , p]) => [o.geometry, p]),
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

// A soft charcoal smudge (steam, dust, ash), billboarded in the vertex shader from per-instance data:
// aSrc (where it rises from; kind 1 rides the pup), aLife (x: when it starts, y: its period, z: its seed, w: kind).
export function smudgeMaterial({ dark = 0.0, size = 1 } = {}) {
  return new ShaderMaterial({
    uniforms: { ...U, uPup: { value: new Vector3() }, uPupK: { value: 1 }, uSize: { value: size }, uDark: { value: dark }, uOn: { value: 1 }, uClock: { value: 0 } },
    transparent: true,
    depthWrite: false,
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
        vec3 src = (modelMatrix * vec4(aSrc, 1.0)).xyz; // the scene frame to the world
        float k = 1.0;
        if (aLife.w > 0.5 && aLife.w < 1.5) { src = uPup + aSrc * uPupK; k = uPupK; on *= step(1.2, uPupK); } // off the pup's shoulders, only while it is a titan
        vec3 c = src + vec3(sin(life * 6.0 + aLife.z * 30.0) * 0.6, life * 9.0, cos(life * 5.0 + aLife.z * 20.0) * 0.4) * k * uSize;
        float s = uSize * k * (0.6 + 2.2 * life) * on;
        vA = on * smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.55, 1.0, life));
        vDark = 0.0;
        if (aLife.w > 1.5) {
          // ash: a dark fleck drifting down and sideways through a 60 m box round the lens, on twos
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
      uniform float uDark;
      varying vec2 vUv;
      varying float vA;
      varying float vSeed;
      varying float vDark;
      ${INK}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p) + (iNoise(p * 2.5 + vSeed * 13.0) - 0.5) * 0.45;
        float a = (1.0 - smoothstep(0.35, 1.0, r)) * vA;
        if (a < 0.01) discard;
        if (vDark > 0.5) { gl_FragColor = outColor(vec3(0.16, 0.14, 0.13), a); return; }
        // soft smudged charcoal: paper-light in the middle, a grey rubbed edge
        float tone = mix(0.92, 0.55, smoothstep(0.1, 0.9, r)) - uDark;
        vec3 c = drawn(tone, 0.18, vec3(1.0), 0.0);
        gl_FragColor = outColor(c, a * 0.85);
      }`,
  });
}
