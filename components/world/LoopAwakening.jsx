"use client";

// THE AWAKENING, in the world (lib/world/awakening.js): the secret scene for
// three clean loops. Everything is drawn in the scene, nothing in a post
// pass, and it costs six draw calls (about 5.2k triangles):
//   sky      a dome round the camera, deep violet night that fractures into
//            glowing shards (drawn first, behind the whole island)
//   floor    the stage's ground, shown while the island is hidden (from the
//            first impact frame to the take-off's): violet fissures racing
//            out from under the pup over a halftone pool of its light
//   aura     the torrent: thirty cel-shaded flame tongues round the pup
//            (instanced), black cores in violet with pale outlines; in
//            flight they stream out below it like a comet's tail
//   circles  four magic circles of original geometry (rings, a star polygon,
//            runes of plain strokes), one instanced draw, wheeling on twos
//   sparks   streaks of power rising through the torrent (instanced)
//   debris   chunks of ice and rock and snow lifting off the ground (instanced)
// The halftone and the ink misregistration on the peaks are in the
// materials. While it plays the snow stops (sky/Snowfall.jsx), the world
// dims under the dark sky, and the island's fog takes the sky's colour; all
// of it goes back the frame live.arrival clears (Skip, any fresh key).

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending, BackSide, CircleGeometry, Color, CustomBlending, DoubleSide, IcosahedronGeometry, InstancedBufferAttribute,
  InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, OneMinusSrcAlphaFactor, PlaneGeometry, ShaderMaterial,
  Euler, Quaternion, SphereGeometry, SrcAlphaFactor, Vector3,
} from "three";
import { AWAKE, auraAt, awakeMode, awakeYaw, circleAt, crackAt, flyAt, liftAt, onStage, skyAt } from "../../lib/world/awakening";
import { MOUTH, PIVOT } from "./seal/variants/D-parts";
import { WATER_Y, heightAt } from "../../lib/world/terrain";
import { live } from "../../lib/world/store";

const SPARKS = 140;
const TONGUES = 30;
const DEBRIS = 72;
const CRACK_R = 16; // m: the longest fissure
const FLOOR_R = 70; // m: the stage's floor, fading into the sky's horizon
const SKY_R = 200; // m: inside the camera's far plane
const HORIZON = new Color("#2a1150");
const NIGHT = new Color("#7d67ff"); // the light under the dark sky
const NIGHT_SHADE = new Color("#24164f");

const onTwos = (t) => Math.floor(t * 12) / 12;
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Halftone on a 45-degree screen grid, uCell px a cell (scaled by the dpr).
const HALFTONE = /* glsl */ `
  uniform float uCell;
  float halftone(float tone) {
    vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / uCell;
    float d = length(fract(p) - 0.5);
    float r = 0.56 * sqrt(clamp(tone, 0.0, 1.0));
    return 1.0 - smoothstep(r - 0.07, r + 0.07, d);
  }`;

const NOISE = /* glsl */ `
  float hash1(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash1(i), hash1(i + vec3(1, 0, 0)), f.x), mix(hash1(i + vec3(0, 1, 0)), hash1(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash1(i + vec3(0, 0, 1)), hash1(i + vec3(1, 0, 1)), f.x), mix(hash1(i + vec3(0, 1, 1)), hash1(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 x) { return 0.55 * vnoise(x) + 0.3 * vnoise(x * 2.1 + 3.1) + 0.15 * vnoise(x * 4.3 + 7.7); }`;

// The sky: deep violet night, darkest overhead, that fractures from one
// point into shards with light leaking through the seams.
function skyMaterial() {
  return new ShaderMaterial({
    uniforms: { uDark: { value: 0 }, uFract: { value: 0 }, uTime: { value: 0 }, uCell: { value: 6 }, uRupture: { value: new Vector3(0, 0.6, -0.8).normalize() } },
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    blending: CustomBlending, // an opaque-pass draw that still fades in over the day sky
    blendSrc: SrcAlphaFactor,
    blendDst: OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uDark;
      uniform float uFract;
      uniform float uTime;
      uniform vec3 uRupture;
      varying vec3 vDir;
      ${HALFTONE}
      ${NOISE}
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 zen = vec3(0.02, 0.008, 0.05);
        vec3 hor = vec3(0.165, 0.067, 0.314);
        vec3 col = mix(hor, zen, smoothstep(-0.02, 0.55, h));
        // the horizon glow, set as halftone
        float band = exp(-abs(h) * 9.0);
        col += halftone(band * 0.7) * vec3(0.32, 0.16, 0.6) * 0.35;
        // the fracture: cell edges on the sphere, spreading out from the rupture
        if (uFract > 0.001) {
          // jagged seams: the cells' space is warped by noise
          vec3 p = d * 3.0 + 0.16 * vec3(vnoise(d * 22.0), vnoise(d * 22.0 + 3.1), vnoise(d * 22.0 + 6.7)) - 0.08;
          vec3 i = floor(p);
          float f1 = 9.0, f2 = 9.0;
          float id = 0.0;
          for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            vec3 c = i + vec3(x, y, z);
            vec3 o = c + vec3(hash1(c), hash1(c + 11.3), hash1(c + 27.1));
            float r = length(p - o);
            if (r < f1) { f2 = f1; f1 = r; id = hash1(c + 5.0); } else if (r < f2) { f2 = r; }
          }
          float e = f2 - f1;
          float reach = acos(clamp(dot(d, uRupture), -1.0, 1.0)) / 3.14159;
          float front = uFract * 0.62 + (id - 0.5) * 0.08; // it never cracks the whole dome
          float open = smoothstep(reach, reach + 0.06, front);
          // brightest at the rupture, fainter out toward the front
          float near = open * (1.0 - 0.85 * clamp(reach / max(front, 0.01), 0.0, 1.0));
          float w = fwidth(e) * 1.2;
          float crack = (1.0 - smoothstep(0.0, 0.006 + w, e)) * near;
          float halo = exp(-e * 30.0) * near;
          float flick = 0.85 + 0.15 * hash2(vec2(floor(uTime * 12.0), id));
          col += id * open * 0.05 * vec3(0.5, 0.35, 0.9);
          col += halftone(halo * 0.8) * vec3(0.55, 0.28, 1.0) * 0.45 * flick;
          col = mix(col, vec3(0.93, 0.86, 1.0), crack * flick);
        }
        gl_FragColor = vec4(pow(col, vec3(2.2)), uDark);
      }`,
  });
}

// The stage's floor: dark ground under the pup that fades into the sky's
// horizon, a halftone pool of the aura's light, and fissures racing out from
// under the pup, branching, a white-hot core in each and a violet glow.
function crackMaterial() {
  const R = CRACK_R.toFixed(1);
  return new ShaderMaterial({
    uniforms: { uCrack: { value: 0 }, uTime: { value: 0 }, uCell: { value: 6 }, uSeed: { value: 0 }, uPower: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xz * ${FLOOR_R.toFixed(1)};
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uCrack;
      uniform float uTime;
      uniform float uSeed;
      uniform float uPower;
      varying vec2 vP;
      ${HALFTONE}
      ${NOISE}
      void main() {
        float r = length(vP);
        float a = atan(vP.y, vP.x);
        // nine main fissures, wandering as they go
        float n = 9.0;
        float s = a / 6.28318 * n + uSeed;
        float k = floor(s + 0.5);
        float wander = (vnoise(vec3(r * 0.7, k * 3.7, uSeed)) - 0.5) * 0.5 + (vnoise(vec3(r * 2.6, k * 1.3, 4.0)) - 0.5) * 0.14;
        float dA = abs(s - k - wander) / n * 6.28318 * r; // metres off the fissure
        float len = 0.55 + 0.45 * hash2(vec2(k, uSeed)); // fissures differ in length
        float width = 0.07 * (1.0 - smoothstep(0.0, ${R} * len, r)) + 0.012;
        // branches: cell seams near the fissures
        vec2 q = vP * 0.55;
        vec2 iq = floor(q);
        float f1 = 9.0, f2 = 9.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 c = iq + vec2(x, y);
          vec2 o = c + vec2(hash2(c), hash2(c + 7.1));
          float dd = length(q - o);
          if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
        }
        float seam = (f2 - f1) / 0.55; // metres
        float near = 1.0 - smoothstep(0.4, 2.2, dA);
        float reach = uCrack * ${R} * len * (0.92 + 0.16 * vnoise(vec3(a * 4.0, 1.0, 2.0)));
        float on = 1.0 - smoothstep(reach - 0.6, reach, r);
        float seamOn = 1.0 - smoothstep(reach * 0.65 - 0.6, reach * 0.65, r);
        float d = min(dA, mix(9.0, seam, near * seamOn));
        float aa = fwidth(d) * 1.2;
        float core = (1.0 - smoothstep(width * 0.4, width * 0.4 + aa, d)) * on;
        float line = (1.0 - smoothstep(width, width + aa, d)) * on;
        float glow = exp(-d * 4.0) * on;
        float flick = 0.8 + 0.2 * hash2(vec2(floor(uTime * 12.0), k));
        // the floor: near-black under the pup, into the horizon's violet far off
        vec3 col = mix(vec3(0.075, 0.03, 0.15), vec3(0.165, 0.067, 0.314), smoothstep(8.0, ${(FLOOR_R * 0.85).toFixed(1)}, r));
        // the aura's light on it, set as halftone round the pup
        float pool = exp(-r * 0.32) * min(uPower, 1.2);
        col += halftone(pool * 0.85) * vec3(0.42, 0.2, 0.85) * 0.5 + pool * vec3(0.12, 0.05, 0.25);
        float lit = max(line, halftone(glow * 0.7) * 0.85) * flick;
        col = mix(col, vec3(0.62, 0.32, 1.0), lit);
        col = mix(col, vec3(0.97, 0.92, 1.0), core * flick);
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
  });
}

// The torrent: flame tongues standing round the pup, each a flat cel-shaded
// sprite turned to the lens (a pale outline, a violet fill with a halftone
// sheen, a black core), swaying and flickering on twos. The ones on the
// lens's side stay short, licking round the body, so the face stays clear.
// In flight they turn over and stream out below the pup: the comet's tail.
// aOff: the tongue's root about the pup; aT: width, height, seed, unused.
function tongueMaterial() {
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uDown: { value: 0 }, uLen: { value: 0 }, uCell: { value: 6 } },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 aOff;
      attribute vec4 aT;
      uniform float uTime;
      uniform float uPower;
      uniform float uDown;
      uniform float uLen;
      varying vec2 vUv;
      varying float vSeed;
      void main() {
        // in flight the roots draw in under the pup and the tail tapers
        vec3 c = (modelMatrix * vec4(aOff * vec3(1.0 - 0.55 * uDown, 1.0, 1.0 - 0.55 * uDown), 1.0)).xyz;
        vec3 toCam = cameraPosition - c;
        vec2 tc = normalize(toCam.xz + 1e-4);
        float front = dot(normalize(aOff.xz + 1e-4), tc);
        float shortK = mix(1.0, 0.32, smoothstep(0.05, 0.65, front) * (1.0 - uDown));
        float step12 = floor(uTime * 12.0);
        float flick = 0.82 + 0.3 * fract(sin(step12 * 12.9898 + aT.z * 78.233) * 43758.5453);
        float p = min(uPower, 1.35);
        float h = aT.y * shortK * flick * p;
        float centre = 1.0 - smoothstep(0.35, 0.8, length(aOff.xz));
        h = mix(h, (0.8 + uLen * (0.2 + 0.8 * centre) * (0.5 + 0.5 * fract(aT.z * 7.31))) * min(p, 1.0), uDown);
        // the tail: thin violet streaks with gaps between them, not a column
        float gap = step(0.45, fract(aT.z * 13.7));
        float w = aT.x * (0.55 + 0.45 * min(p, 1.0)) * mix(1.0, 0.3 * gap, uDown);
        vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x));
        vec3 up = vec3(0.0, mix(1.0, -1.0, uDown), 0.0);
        vec3 pos = c + right * position.x * w + up * position.y * h;
        vUv = vec2(position.x + 0.5, position.y);
        vSeed = aT.z;
        gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uDown;
      varying vec2 vUv;
      varying float vSeed;
      ${HALFTONE}
      void main() {
        float y = vUv.y;
        // in flight the tail dissolves into halftone dots toward its end
        if (uDown > 0.5 && halftone(1.0 - y * 0.95) < 0.5) discard;
        float t = floor(uTime * 12.0) / 12.0;
        // the spine sways, more toward the tip; the edge flickers
        float x = vUv.x - 0.5 - 0.16 * y * sin(y * 5.0 - t * 9.0 + vSeed * 20.0);
        float wv = 0.5 * pow(1.0 - y, 0.8) * smoothstep(-0.04, 0.16, y);
        wv *= 0.86 + 0.14 * sin(y * 13.0 + t * 15.0 + vSeed * 9.0);
        float d = abs(x) - wv;
        if (d > 0.0) discard;
        float aa = fwidth(d) * 1.2;
        float inside = -d;
        float cw = wv * 0.55;
        float core = (1.0 - smoothstep(cw - aa, cw + aa, abs(x + 0.05 * sin(y * 9.0 + vSeed * 5.0)))) * (1.0 - smoothstep(0.35, 0.8, y)) * (1.0 - uDown);
        vec3 col = mix(vec3(0.36, 0.12, 0.76), vec3(0.03, 0.008, 0.06), core);
        col += halftone((1.0 - core) * 0.5) * vec3(0.32, 0.13, 0.62) * 0.5 * (1.0 - core);
        col = mix(col, vec3(0.88, 0.75, 1.0), 1.0 - smoothstep(0.035, 0.035 + aa, inside));
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
  });
}

// The magic circles: rings, ticks, a star polygon and a band of runes, each
// rune a few plain strokes chosen by a hash (original geometry, no borrowed
// sigil). aData: alpha, seed, misregistration, unused.
function circleMaterial() {
  return new ShaderMaterial({
    uniforms: { uCell: { value: 6 } },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec4 aData;
      varying vec2 vP;
      varying vec4 vData;
      void main() {
        vP = uv * 2.0 - 1.0;
        vData = aData;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vP;
      varying vec4 vData;
      ${HALFTONE}
      float h1(float n) { return fract(sin(n * 91.345) * 43758.5453); }
      float seg(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float k = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * k);
      }
      // distance (in radii) from p to the nearest stroke of circle seed s
      float circle(vec2 p, float s) {
        float r = length(p);
        float a = atan(p.y, p.x);
        float d = abs(r - 0.97);
        d = min(d, abs(r - 0.905));
        d = min(d, abs(r - 0.64));
        d = min(d, abs(r - 0.585));
        d = min(d, abs(r - 0.33 - 0.04 * s));
        d = min(d, abs(r - 0.1));
        // ticks between the outer rings
        if (r > 0.905 && r < 0.97) d = min(d, abs(fract(a / 6.28318 * 96.0) - 0.5) / 96.0 * 6.28318 * r);
        // the star polygon: n points, every m-th joined
        float n = s < 0.34 ? 7.0 : s < 0.67 ? 9.0 : 5.0;
        float m = s < 0.34 ? 3.0 : s < 0.67 ? 4.0 : 2.0;
        for (int k = 0; k < 9; k++) {
          if (float(k) >= n) break;
          float a0 = float(k) / n * 6.28318 + 1.5708;
          float a1 = (float(k) + m) / n * 6.28318 + 1.5708;
          d = min(d, seg(p, 0.585 * vec2(cos(a0), sin(a0)), 0.585 * vec2(cos(a1), sin(a1))));
        }
        // the rune band, between the 0.64 and 0.905 rings
        if (r > 0.645 && r < 0.9) {
          float S = 20.0;
          float sa = a / 6.28318 * S;
          float cell = floor(sa);
          vec2 g = vec2((fract(sa) - 0.5) * 6.28318 * r / S, r - 0.772) / 0.095; // glyph box about [-0.6, 0.6]
          float hsh = h1(cell + s * 37.0);
          float bits = floor(hsh * 255.0);
          float gd = 9.0;
          // seven plain strokes; the hash picks which ones a rune uses
          if (mod(bits, 2.0) >= 1.0 || hsh < 0.3) gd = min(gd, seg(g, vec2(0.0, -0.6), vec2(0.0, 0.6)));
          if (mod(floor(bits / 2.0), 2.0) >= 1.0) gd = min(gd, seg(g, vec2(-0.32, -0.6), vec2(0.32, 0.6)));
          if (mod(floor(bits / 4.0), 2.0) >= 1.0 && hsh > 0.5) gd = min(gd, seg(g, vec2(-0.32, 0.6), vec2(0.32, 0.6)));
          if (mod(floor(bits / 8.0), 2.0) >= 1.0) gd = min(gd, seg(g, vec2(-0.32, 0.0), vec2(0.32, 0.0)));
          if (mod(floor(bits / 16.0), 2.0) >= 1.0) { gd = min(gd, seg(g, vec2(-0.32, -0.6), vec2(0.0, -0.2))); gd = min(gd, seg(g, vec2(0.0, -0.2), vec2(0.32, -0.6))); }
          if (mod(floor(bits / 32.0), 2.0) >= 1.0) gd = min(gd, seg(g, vec2(0.32, 0.6), vec2(0.32, 0.05)));
          if (mod(floor(bits / 64.0), 2.0) >= 1.0 && hsh < 0.7) gd = min(gd, seg(g, vec2(-0.32, -0.6), vec2(-0.32, -0.1)));
          if (gd > 8.0) gd = seg(g, vec2(-0.32, 0.6), vec2(0.32, -0.6));
          d = min(d, gd * 0.095);
        }
        return d;
      }
      float ink(vec2 p, float s, out float glow) {
        float d = circle(p, s);
        float w = 0.009;
        float aa = fwidth(d) * 1.1;
        glow = exp(-d * 38.0);
        return 1.0 - smoothstep(w, w + aa, d);
      }
      void main() {
        float alpha = vData.x;
        if (alpha < 0.002 || length(vP) > 1.0) discard;
        float glow;
        float core = ink(vP, vData.y, glow);
        vec3 violet = vec3(0.6, 0.32, 1.0);
        vec3 col = violet * (halftone(glow * 0.9) * 0.55 + glow * 0.25) + mix(violet, vec3(1.0), 0.6) * core;
        // the peaks: cyan and magenta plates a little off register
        float mis = vData.z;
        if (mis > 0.01) {
          float g2;
          float cy = ink(vP + vec2(0.018, -0.008) * mis, vData.y, g2);
          float mg = ink(vP - vec2(0.018, -0.008) * mis, vData.y, g2);
          col += vec3(0.0, 0.7, 1.0) * cy * 0.8 * mis + vec3(1.0, 0.1, 0.6) * mg * 0.8 * mis;
        }
        gl_FragColor = vec4(pow(col * alpha, vec3(2.2)), 1.0);
      }`,
  });
}

// Debris: flat-shaded chunks, ink with a violet halftone on the faces that
// turn down to the aura's light; snow chunks stay cream.
function debrisMaterial() {
  return new ShaderMaterial({
    uniforms: { uCell: { value: 6 } },
    vertexShader: /* glsl */ `
      varying vec3 vView;
      varying vec3 vCol;
      void main() {
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vView = mv.xyz;
        vCol = instanceColor;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vView;
      varying vec3 vCol;
      ${HALFTONE}
      void main() {
        vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
        if (dot(n, vView) > 0.0) n = -n;
        float tone = max(-n.y, 0.0) * 0.6 + max(n.x, 0.0) * 0.4;
        vec3 col = mix(vCol, mix(vCol, vec3(0.7, 0.45, 1.0), 0.6), halftone(tone));
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
      }`,
  });
}

function build() {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // the tongues: a ring round a pup about 1 m long, roots just under its belly
  const tongues = new InstancedMesh(new PlaneGeometry(1, 1, 1, 6).translate(0, 0.5, 0), tongueMaterial(), TONGUES);
  const off = new Float32Array(TONGUES * 3);
  const tt = new Float32Array(TONGUES * 4);
  for (let i = 0; i < TONGUES; i++) {
    const a = (i / TONGUES) * Math.PI * 2 + (rand() - 0.5) * 0.3;
    const r = 0.38 + 0.4 * rand();
    off.set([Math.cos(a) * r, -0.25 + 0.4 * rand(), Math.sin(a) * r * 1.25], i * 3);
    tt.set([0.45 + 0.4 * rand(), 1.5 + 2.4 * rand() ** 1.5, rand(), 0], i * 4);
  }
  tongues.geometry.setAttribute("aOff", new InstancedBufferAttribute(off, 3));
  tongues.geometry.setAttribute("aT", new InstancedBufferAttribute(tt, 4));
  tongues.frustumCulled = false;

  const circles = new InstancedMesh(new PlaneGeometry(2, 2, 1, 1).rotateX(-Math.PI / 2), circleMaterial(), 4);
  const data = new Float32Array(16);
  for (let i = 0; i < 4; i++) data[i * 4 + 1] = [0.2, 0.5, 0.85, 0.1][i];
  circles.geometry.setAttribute("aData", new InstancedBufferAttribute(data, 4));
  circles.frustumCulled = false;

  const sparks = new InstancedMesh(
    new OctahedronGeometry(1, 0).scale(0.022, 0.32, 0.022),
    new MeshBasicMaterial({ toneMapped: false, fog: false, blending: AdditiveBlending, transparent: true, depthWrite: false }),
    SPARKS,
  );
  const tints = [new Color("#f3ecff"), new Color("#a46bff"), new Color("#7d3cff")];
  const sparkSeed = [];
  for (let i = 0; i < SPARKS; i++) {
    sparks.setColorAt(i, tints[i % 3]);
    sparkSeed.push([rand() * Math.PI * 2, 0.35 + 1.1 * rand(), rand(), 0.6 + 0.8 * rand()]);
  }
  sparks.frustumCulled = false;

  const debris = new InstancedMesh(new IcosahedronGeometry(1, 0), debrisMaterial(), DEBRIS);
  const rock = new Color("#140a26");
  const ice = new Color("#3a2a66");
  const snow = new Color("#efeaf6");
  const debrisSeed = [];
  for (let i = 0; i < DEBRIS; i++) {
    const kind = i % 3; // rock, ice, snow
    debris.setColorAt(i, kind === 0 ? rock : kind === 1 ? ice : snow);
    debrisSeed.push({
      // all round the pup but the side the lens stands on (about +z), so no chunk fills the frame
      a: 2.2 + (Math.PI * 2 - 2.0) * rand(),
      r: 1.8 + 6 * rand() ** 0.8,
      size: kind === 2 ? 0.04 + 0.05 * rand() : 0.06 + 0.2 * rand() ** 2,
      h: 0.6 + 4.2 * rand() ** 1.6,
      delay: 0.1 + 1.2 * rand(),
      spin: new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
      w: 0.6 + 2.2 * rand(),
      ph: rand() * 6.28,
    });
  }
  debris.frustumCulled = false;

  return {
    sky: new SphereGeometry(1, 48, 24),
    skyMat: skyMaterial(),
    crack: new CircleGeometry(1, 96).rotateX(-Math.PI / 2),
    crackMat: crackMaterial(),
    tongues,
    circles,
    sparks,
    sparkSeed,
    debris,
    debrisSeed,
  };
}

// The four circles: the launch pad on the ground, then a stack wheeling up
// the pup, smaller as it climbs. [radius, height over the pup, tilt, spin rad/s]
const CIRCLES = [
  [4.4, 0, 0, 0.22],
  [2.3, 0.12, 0.36, -0.6],
  [1.65, 1.75, 0.46, 0.9],
  [1.1, 3.0, 0.52, -1.3],
];

const O = new Object3D();
// the pup's mouth, body frame; +0.3 m for the head's chin-up tilt while it hovers and flies
const MOUTH_AT = [0, PIVOT.head[1] + MOUTH[1] + 0.3, PIVOT.head[2] + MOUTH[2]];
const E = new Euler();
const SPIN = new Quaternion();
const UP = new Vector3(0, 1, 0);

export default function LoopAwakening() {
  const scene = useThree((s) => s.scene);
  const kit = useMemo(build, []);
  const root = useRef();
  const sky = useRef();
  const crack = useRef();
  const aura = useRef();
  const world = useRef({ on: false, lights: [], fog: new Color(), seed: 0, hit: 0, start: -1 });
  const hidden = useRef({ on: false, list: [] });

  // On the stage the island is switched off (its top-level objects hidden,
  // the lights kept), the way the Aether domain does it.
  const hideWorld = (on) => {
    const h = hidden.current;
    if (on === h.on) return;
    h.on = on;
    if (on) {
      for (const o of scene.children) {
        if (o === root.current || o.name === "seal" || o.isLight || !o.visible) continue;
        o.visible = false;
        h.list.push(o);
      }
    } else {
      for (const o of h.list) o.visible = true;
      h.list.length = 0;
    }
  };

  // Dim the island's lights and give its fog the sky's colour while the sky
  // is dark; everything is put back the frame the scene ends.
  const dimWorld = (k) => {
    const w = world.current;
    if (k > 0 && !w.on) {
      w.on = true;
      w.lights.length = 0;
      scene.traverse((o) => {
        if (o.isLight) w.lights.push([o, o.intensity, o.color.clone(), o.groundColor?.clone()]);
      });
      if (scene.fog) w.fog.copy(scene.fog.color);
    }
    if (!w.on) return;
    if (k <= 0) {
      w.on = false;
      for (const [l, i, c, gc] of w.lights) {
        l.intensity = i;
        l.color.copy(c);
        if (gc) l.groundColor.copy(gc);
      }
      if (scene.fog) scene.fog.color.copy(w.fog);
      return;
    }
    // night-lit: the light turns violet and drops, the shade goes deep indigo
    for (const [l, i, c, gc] of w.lights) {
      l.intensity = i * (1 - 0.45 * k);
      l.color.copy(c).lerp(NIGHT, 0.7 * k);
      if (gc) l.groundColor.copy(gc).lerp(NIGHT_SHADE, 0.8 * k);
    }
    if (scene.fog) scene.fog.color.copy(w.fog).lerp(HORIZON, k);
  };

  useEffect(
    () => () => {
      dimWorld(0);
      hideWorld(false);
      for (const v of Object.values(kit)) if (v?.dispose) v.dispose();
      for (const m of [kit.tongues, kit.circles, kit.sparks, kit.debris]) {
        m.geometry.dispose();
        m.material.dispose();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kit],
  );

  useFrame((state) => {
    const g = root.current;
    const arrival = live.arrival;
    if (awakeMode(arrival.id) !== "full") {
      if (g.visible) {
        g.visible = false;
        dimWorld(0);
        hideWorld(false);
      }
      live.awake.on = false;
      return;
    }
    g.visible = true;
    const t = state.clock.elapsedTime - arrival.start;
    const tt = onTwos(t);
    const s = live.seal;
    const ground = Math.max(heightAt(s.x, s.z), WATER_Y);
    const lift = liftAt(t);
    const qy = ground + lift;
    const stage = onStage(t);
    hideWorld(stage);
    live.awake.on = true;
    // its mouth, for the bubble's tail: the head's mouth point (seal/variants/D-parts.js),
    // pitched nose-up in flight and turned to the scene's yaw
    const pitch = -0.35 * flyAt(t);
    const { yaw } = awakeYaw(t, s.x, s.z);
    const my = MOUTH_AT[1] * Math.cos(pitch) - MOUTH_AT[2] * Math.sin(pitch);
    const mz = MOUTH_AT[1] * Math.sin(pitch) + MOUTH_AT[2] * Math.cos(pitch);
    live.awake.x = s.x + Math.sin(yaw) * mz;
    live.awake.y = qy + my;
    live.awake.z = s.z + Math.cos(yaw) * mz;
    live.stageOn = true; // the radiation flood waits (look/RadiationPov.js)
    live.inStage = true;

    // the impacts and the take-off land in the camera (CameraRig's shake)
    const w = world.current;
    const hit = t >= AWAKE.rise[0] ? 3 : t >= AWAKE.impactB ? 2 : t >= AWAKE.impact ? 1 : 0;
    if (hit && hit !== w.hit && w.start === arrival.start) s.impact = Math.max(s.impact, hit === 1 ? 0.8 : 0.95);
    w.hit = hit;
    w.start = arrival.start;

    const cell = 6 * state.gl.getPixelRatio();
    const power = auraAt(t);
    const dark = skyAt(t);
    dimWorld(dark * (stage ? 0.25 : 1)); // on the stage only the pup is lit: keep it bright

    // the sky, round the camera
    sky.current.position.copy(state.camera.position);
    sky.current.scale.setScalar(SKY_R);
    sky.current.visible = dark > 0.003;
    const su = kit.skyMat.uniforms;
    su.uDark.value = dark;
    su.uFract.value = smooth(AWAKE.impact + 0.2, AWAKE.impactB + 0.2, t) * (1 - smooth(12.0, 13.2, t));
    su.uTime.value = tt;
    su.uCell.value = cell;
    // the rupture opens high behind the pup, where the calm lens looks
    su.uRupture.value.set(-0.25, 0.75, -0.6).normalize();

    // the cracks, on the water or snow under it
    const cu = kit.crackMat.uniforms;
    cu.uCrack.value = crackAt(t);
    cu.uTime.value = tt;
    cu.uCell.value = cell;
    if (world.current.seed !== arrival.start) {
      world.current.seed = arrival.start;
      cu.uSeed.value = (arrival.start * 7.31) % 1;
    }
    cu.uPower.value = auraAt(t);
    crack.current.position.set(s.x, ground, s.z);
    crack.current.visible = stage;

    // the torrent: on the pup; in flight it streams out below as the tail
    const len = Math.min(11, Math.max(0, lift - 0.8) * 0.4);
    const flying = smooth(AWAKE.rise[0] + 0.05, AWAKE.rise[0] + 0.45, t) * (1 - smooth(AWAKE.descend[0] + 0.6, AWAKE.descend[1], t));
    aura.current.position.set(s.x, qy, s.z);
    aura.current.visible = power > 0.002;
    const tu = kit.tongues.material.uniforms;
    tu.uTime.value = tt;
    tu.uPower.value = power;
    tu.uDown.value = flying;
    tu.uLen.value = len;
    tu.uCell.value = cell;

    // the circles, wheeling on twos; misregistered on the peaks
    const data = kit.circles.geometry.attributes.aData;
    const camAz = Math.atan2(state.camera.position.x - s.x, state.camera.position.z - s.z);
    const mis = Math.exp(-((t - AWAKE.impactB) ** 2) / 0.05) + 0.7 * Math.exp(-((t - AWAKE.circles[0]) ** 2) / 0.02);
    for (let i = 0; i < 4; i++) {
      const [r, h, tilt, spin] = CIRCLES[i];
      const k = circleAt(t, i);
      O.position.set(s.x, i === 0 ? ground + 0.06 : qy + h, s.z);
      // tipped toward the lens so the runes read, wheeling in their own plane
      O.quaternion.setFromEuler(E.set(tilt, camAz, 0, "YXZ")).multiply(SPIN.setFromAxisAngle(UP, spin * tt));
      O.scale.setScalar(Math.max(k, 0.001) * r);
      O.updateMatrix();
      kit.circles.setMatrixAt(i, O.matrix);
      data.array[i * 4] = k > 0 ? Math.min(1, 0.55 + 0.45 * power) : 0;
      data.array[i * 4 + 2] = mis;
    }
    data.needsUpdate = true;
    kit.circles.instanceMatrix.needsUpdate = true;
    kit.circles.material.uniforms.uCell.value = cell;

    // sparks: streaks rising through the torrent, or falling away down the tail
    const sparkK = power > 0.02 ? Math.min(1.2, power) : 0;
    for (let i = 0; i < SPARKS; i++) {
      const [a, r, ph, sp] = kit.sparkSeed[i];
      const u = (ph + tt * sp * 0.8) % 1;
      const rr = r * (0.7 + 0.5 * Math.min(power, 1.2)) * (1 - 0.6 * u * (1 - flying));
      const y = flying > 0.5 ? qy + 1.2 - u * Math.max(len, 5) : ground + 0.1 + u * 6.2 * Math.min(power, 1.2);
      O.position.set(s.x + Math.cos(a + u * 1.5) * rr, y, s.z + Math.sin(a + u * 1.5) * rr);
      O.quaternion.identity();
      O.scale.set(1, (0.6 + 0.5 * flying) * (1 - u * 0.5), 1).multiplyScalar(sparkK * (1 - 0.45 * flying));
      O.updateMatrix();
      kit.sparks.setMatrixAt(i, O.matrix);
    }
    kit.sparks.instanceMatrix.needsUpdate = true;

    // debris and snow lifting off the ground, hanging, blasted out at the
    // take-off and dropped again on the return
    const blast = smooth(AWAKE.rise[0], AWAKE.rise[0] + 0.8, t);
    const drop = 1 - smooth(11.6, 12.5, t);
    for (let i = 0; i < DEBRIS; i++) {
      const d = kit.debrisSeed[i];
      const up = smooth(AWAKE.impact + d.delay, AWAKE.impact + d.delay + 1.8, t) * drop;
      const rr = d.r * (1 + 0.6 * blast);
      O.position.set(s.x + Math.cos(d.a) * rr, ground + up * (d.h + 2.5 * blast) + 0.12 * Math.sin(tt * 1.4 + d.ph) * up, s.z + Math.sin(d.a) * rr);
      O.quaternion.setFromAxisAngle(d.spin, d.ph + tt * d.w * up);
      O.scale.setScalar(up > 0.01 ? d.size : 0);
      O.updateMatrix();
      kit.debris.setMatrixAt(i, O.matrix);
    }
    kit.debris.instanceMatrix.needsUpdate = true;
    kit.debris.material.uniforms.uCell.value = cell;
  });

  return (
    <group ref={root} visible={false}>
      <mesh ref={sky} geometry={kit.sky} material={kit.skyMat} renderOrder={-10} frustumCulled={false} />
      <mesh ref={crack} geometry={kit.crack} material={kit.crackMat} scale={FLOOR_R} renderOrder={-9} />
      <primitive object={kit.tongues} ref={aura} renderOrder={4} />
      <primitive object={kit.circles} renderOrder={5} />
      <primitive object={kit.sparks} renderOrder={8} />
      <primitive object={kit.debris} />
    </group>
  );
}
