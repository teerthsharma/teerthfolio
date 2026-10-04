"use client";

// THE AWAKENING, in the world (lib/world/awakening.js): the secret scene for
// three clean loops. Everything is drawn in the scene, nothing in a post
// pass, and it costs eight draw calls:
//   sky      a dome round the camera, deep violet night that fractures into
//            glowing shards (drawn first, behind the whole island)
//   cracks   a disc on the water or snow under the pup: violet fissures
//            racing out from it, over a halftone scorch
//   aura     the torrent: a flame envelope of ink with violet outlines, a
//            glow of streaks inside it, and a trail that hangs below the
//            pup as it flies, like a comet's
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
  AdditiveBlending, BackSide, CircleGeometry, Color, CustomBlending, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedBufferAttribute,
  InstancedMesh, LatheGeometry, MeshBasicMaterial, Object3D, OctahedronGeometry, OneMinusSrcAlphaFactor, PlaneGeometry, ShaderMaterial,
  SphereGeometry, SrcAlphaFactor, Vector2, Vector3,
} from "three";
import { AWAKE, auraAt, awakeMode, circleAt, crackAt, liftAt, skyAt } from "../../lib/world/awakening";
import { WATER_Y, heightAt } from "../../lib/world/terrain";
import { live } from "../../lib/world/store";

const SPARKS = 140;
const DEBRIS = 72;
const CRACK_R = 16; // m
const SKY_R = 200; // m: inside the camera's far plane
const HORIZON = new Color("#2a1150");

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
        col = mix(col, vec3(0.03, 0.012, 0.07), smoothstep(0.0, -0.25, h));
        // the horizon glow, set as halftone
        float band = exp(-abs(h) * 9.0);
        col += halftone(band * 0.7) * vec3(0.32, 0.16, 0.6) * 0.35;
        // the fracture: cell edges on the sphere, spreading out from the rupture
        if (uFract > 0.001) {
          vec3 p = d * 3.4;
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
          float open = smoothstep(reach, reach + 0.08, uFract * 1.15 + (id - 0.5) * 0.12);
          float w = fwidth(e) * 1.2;
          float crack = (1.0 - smoothstep(0.0, 0.02 + w, e)) * open;
          float halo = exp(-e * 14.0) * open;
          float flick = 0.85 + 0.15 * hash2(vec2(floor(uTime * 12.0), id));
          col += id * open * 0.07 * vec3(0.5, 0.35, 0.9);
          col += halftone(halo * 0.8) * vec3(0.55, 0.28, 1.0) * 0.45 * flick;
          col = mix(col, vec3(0.93, 0.86, 1.0), crack * flick);
        }
        gl_FragColor = vec4(pow(col, vec3(2.2)), uDark);
      }`,
  });
}

// The ground: fissures racing out from under the pup, branching, a white-hot
// core in each and a violet glow, over a halftone scorch of ink.
function crackMaterial() {
  const R = CRACK_R.toFixed(1);
  return new ShaderMaterial({
    uniforms: { uCrack: { value: 0 }, uTime: { value: 0 }, uCell: { value: 6 }, uSeed: { value: 0 } },
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xz * ${R};
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uCrack;
      uniform float uTime;
      uniform float uSeed;
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
        // the scorch: ink under the pup, set as halftone dots at its edge
        float scorch = (1.0 - smoothstep(0.0, 4.5, r)) * smoothstep(0.0, 0.3, uCrack);
        float alpha = max(scorch * 0.75, halftone(scorch * 0.9) * 0.6);
        vec3 col = vec3(0.05, 0.02, 0.1);
        float lit = max(line, halftone(glow * 0.7) * 0.85) * flick;
        col = mix(col, vec3(0.62, 0.32, 1.0), lit);
        alpha = max(alpha, lit);
        col = mix(col, vec3(0.97, 0.92, 1.0), core * flick);
        float edge = 1.0 - smoothstep(${(CRACK_R * 0.8).toFixed(1)}, ${R}, r);
        gl_FragColor = vec4(pow(col, vec3(2.2)), alpha * edge);
      }`,
  });
}

// The torrent. kind 0: the ink envelope (black, outlined in violet where its
// tongues break up); kind 1: the glow inside it (violet-white streaks,
// additive); kind 2: the comet trail below the flying pup. Positions on the
// lathe are in metres; the trail's cylinder is unit length, stretched by uLen.
function flameMaterial(kind) {
  const dir = kind === 2 ? "+" : "-";
  return new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPower: { value: 0 }, uLen: { value: 1 }, uCell: { value: 6 } },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: kind === 1 ? AdditiveBlending : CustomBlending,
    blendSrc: SrcAlphaFactor,
    blendDst: OneMinusSrcAlphaFactor,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPower;
      uniform float uLen;
      varying float vH;
      varying float vHn;
      varying vec2 vRing;
      varying vec3 vN;
      varying vec3 vV;
      ${NOISE}
      void main() {
        vec3 p = position;
        float ang = atan(p.z, p.x);
        ${kind === 2 ? "vH = -p.y * uLen; vHn = -p.y;" : "vH = p.y; vHn = clamp(p.y / 6.4, 0.0, 1.0);"}
        vRing = vec2(cos(ang), sin(ang));
        // the tongues lick out and up, more toward the tips
        float n = vnoise(vec3(vRing * 1.6, vH * 0.7 ${dir} uTime * 3.0));
        float push = 1.0 + (n - 0.4) * (0.15 + 0.5 * vHn) * uPower;
        p.xz *= push * (0.35 + 0.65 * min(uPower, 1.0));
        ${kind === 2 ? "" : "p.y *= 0.4 + 0.6 * min(uPower, 1.0) + 0.5 * max(uPower - 1.0, 0.0);"}
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vV = normalize(-mv.xyz);
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uPower;
      varying float vH;
      varying float vHn;
      varying vec2 vRing;
      varying vec3 vN;
      varying vec3 vV;
      ${HALFTONE}
      ${NOISE}
      void main() {
        float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float t = uTime;
        ${kind === 1
          ? `
        float s = vnoise(vec3(vRing * 4.5, vH * 0.45 - t * 5.0));
        float streak = smoothstep(0.62, 0.9, s);
        float fade = (1.0 - smoothstep(0.35, 1.0, vHn)) * smoothstep(0.0, 0.08, vHn + 0.03);
        float tone = streak * (0.35 + 0.65 * rim) * fade * min(uPower, 1.3);
        vec3 col = mix(vec3(0.42, 0.18, 0.95), vec3(0.95, 0.9, 1.0), streak * rim);
        gl_FragColor = vec4(pow(col * (tone + halftone(fade * rim * 0.45 * min(uPower, 1.0)) * 0.25), vec3(2.2)), 1.0);`
          : `
        float flow = fbm(vec3(vRing * 1.8, vH * 0.55 ${dir} t * 3.2));
        // the envelope breaks into tongues toward its tips
        float thr = 0.18 + 0.62 * vHn;
        float body = flow + 0.35 - thr;
        float mask = smoothstep(0.0, 0.03, body);
        float outline = mask * (1.0 - smoothstep(0.03, 0.09, body));
        float inner = mask * (1.0 - smoothstep(0.09, 0.13, body)) * (1.0 - outline);
        vec3 col = vec3(0.035, 0.012, 0.08);
        col = mix(col, vec3(0.38, 0.14, 0.78), inner * 0.8);
        col = mix(col, vec3(0.78, 0.55, 1.0), outline);
        // a halftone violet sheen where the envelope turns from the lens
        col += halftone(rim * rim * 0.6) * vec3(0.3, 0.12, 0.62) * mask * 0.5;
        // seen face-on the ink thins, so the pup shows through its middle
        float vis = mix(0.2, 1.0, pow(rim, 1.2));
        ${kind === 2 ? "vis *= 1.0 - smoothstep(0.35, 1.0, vHn);" : ""}
        gl_FragColor = vec4(pow(col, vec3(2.2)), mask * max(vis, outline) * min(uPower, 1.0));`}
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
        float w = 0.0065;
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
  // the flame's profile (radius, height) in metres round a pup about 1 m long
  const profile = [
    [0.5, -0.25], [1.0, 0.15], [1.22, 0.7], [1.12, 1.4], [0.85, 2.3], [0.55, 3.4], [0.3, 4.7], [0.12, 5.8], [0.02, 6.4],
  ].map(([x, y]) => new Vector2(x, y));
  const lathe = new LatheGeometry(profile, 40);
  const trail = new CylinderGeometry(1, 0.06, 1, 28, 10, true).translate(0, -0.5, 0);

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
      a: rand() * Math.PI * 2,
      r: 1.8 + 8.5 * rand() ** 0.8,
      size: kind === 2 ? 0.05 + 0.06 * rand() : 0.08 + 0.3 * rand() ** 2,
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
    crack: new CircleGeometry(1, 72).rotateX(-Math.PI / 2),
    crackMat: crackMaterial(),
    lathe,
    inkMat: flameMaterial(0),
    glowMat: flameMaterial(1),
    trail,
    trailMat: flameMaterial(2),
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
  [2.3, 0.12, 0.1, -0.6],
  [1.65, 1.75, -0.08, 0.9],
  [1.1, 3.0, 0.05, -1.3],
];

const O = new Object3D();

export default function LoopAwakening() {
  const scene = useThree((s) => s.scene);
  const kit = useMemo(build, []);
  const root = useRef();
  const sky = useRef();
  const crack = useRef();
  const aura = useRef();
  const trail = useRef();
  const world = useRef({ on: false, lights: [], fog: new Color(), seed: 0, hit: 0, start: -1 });

  // Dim the island's lights and give its fog the sky's colour while the sky
  // is dark; everything is put back the frame the scene ends.
  const dimWorld = (k) => {
    const w = world.current;
    if (k > 0 && !w.on) {
      w.on = true;
      w.lights.length = 0;
      scene.traverse((o) => {
        if (o.isLight) w.lights.push([o, o.intensity]);
      });
      if (scene.fog) w.fog.copy(scene.fog.color);
    }
    if (!w.on) return;
    if (k <= 0) {
      w.on = false;
      for (const [l, i] of w.lights) l.intensity = i;
      if (scene.fog) scene.fog.color.copy(w.fog);
      return;
    }
    for (const [l, i] of w.lights) l.intensity = i * (1 - 0.5 * k);
    if (scene.fog) scene.fog.color.copy(w.fog).lerp(HORIZON, k);
  };

  useEffect(
    () => () => {
      dimWorld(0);
      for (const v of Object.values(kit)) if (v?.dispose) v.dispose();
      for (const m of [kit.circles, kit.sparks, kit.debris]) {
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
    live.awake.on = true;
    live.awake.x = s.x;
    live.awake.y = qy + 1.05; // its mouth, for the bubble's tail
    live.awake.z = s.z;
    live.domainOn = true; // the radiation flood waits (look/RadiationPov.js)
    live.inDomain = true;

    // the impacts and the take-off land in the camera (CameraRig's shake)
    const w = world.current;
    const hit = t >= AWAKE.rise[0] ? 3 : t >= AWAKE.impactB ? 2 : t >= AWAKE.impact ? 1 : 0;
    if (hit && hit !== w.hit && w.start === arrival.start) s.impact = Math.max(s.impact, hit === 1 ? 0.8 : 0.95);
    w.hit = hit;
    w.start = arrival.start;

    const cell = 6 * state.gl.getPixelRatio();
    const power = auraAt(t);
    const dark = skyAt(t);
    dimWorld(dark);

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
    crack.current.position.set(s.x, ground + 0.03, s.z);
    crack.current.visible = cu.uCrack.value > 0.002;

    // the torrent: on the pup; the trail hangs below it in flight
    aura.current.position.set(s.x, qy - 0.1, s.z);
    aura.current.visible = power > 0.002;
    const len = Math.min(42, Math.max(0, lift - 0.8) * 0.75);
    for (const m of [kit.inkMat, kit.glowMat, kit.trailMat]) {
      m.uniforms.uTime.value = tt;
      m.uniforms.uPower.value = power;
      m.uniforms.uCell.value = cell;
    }
    trail.current.visible = len > 0.4 && power > 0.01;
    trail.current.position.set(s.x, qy + 0.6, s.z);
    trail.current.scale.set(1.15, Math.max(len, 0.01), 1.15);
    kit.trailMat.uniforms.uLen.value = len;

    // the circles, wheeling on twos; misregistered on the peaks
    const data = kit.circles.geometry.attributes.aData;
    const mis = Math.exp(-((t - AWAKE.impactB) ** 2) / 0.05) + 0.7 * Math.exp(-((t - AWAKE.circles[0]) ** 2) / 0.02);
    for (let i = 0; i < 4; i++) {
      const [r, h, tilt, spin] = CIRCLES[i];
      const k = circleAt(t, i);
      O.position.set(s.x, i === 0 ? ground + 0.06 : qy + h, s.z);
      O.rotation.set(tilt, spin * tt, tilt * 0.6);
      O.scale.setScalar(Math.max(k, 0.001) * r);
      O.updateMatrix();
      kit.circles.setMatrixAt(i, O.matrix);
      data.array[i * 4] = k > 0 ? Math.min(1, 0.55 + 0.45 * power) : 0;
      data.array[i * 4 + 2] = mis;
    }
    data.needsUpdate = true;
    kit.circles.instanceMatrix.needsUpdate = true;
    kit.circles.material.uniforms.uCell.value = cell;

    // sparks: streaks rising through the torrent, or falling away down the trail
    const flying = smooth(AWAKE.rise[0], AWAKE.rise[0] + 0.5, t);
    const sparkK = power > 0.02 ? Math.min(1.2, power) : 0;
    for (let i = 0; i < SPARKS; i++) {
      const [a, r, ph, sp] = kit.sparkSeed[i];
      const u = (ph + tt * sp * 0.8) % 1;
      const rr = r * (0.7 + 0.5 * Math.min(power, 1.2)) * (1 - 0.6 * u * (1 - flying));
      const y = flying > 0.5 ? qy + 1.2 - u * Math.max(len, 5) : ground + 0.1 + u * 6.2 * Math.min(power, 1.2);
      O.position.set(s.x + Math.cos(a + u * 1.5) * rr, y, s.z + Math.sin(a + u * 1.5) * rr);
      O.rotation.set(0, 0, 0);
      O.scale.set(1, (0.6 + 1.4 * flying) * (1 - u * 0.5), 1).multiplyScalar(sparkK);
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
      <mesh ref={crack} geometry={kit.crack} material={kit.crackMat} scale={CRACK_R} renderOrder={2} />
      <group ref={aura}>
        <mesh geometry={kit.lathe} material={kit.glowMat} scale={0.72} renderOrder={6} frustumCulled={false} />
        <mesh geometry={kit.lathe} material={kit.inkMat} renderOrder={7} frustumCulled={false} />
      </group>
      <mesh ref={trail} geometry={kit.trail} material={kit.trailMat} renderOrder={6} frustumCulled={false} />
      <primitive object={kit.circles} renderOrder={5} />
      <primitive object={kit.sparks} renderOrder={8} />
      <primitive object={kit.debris} />
    </group>
  );
}
