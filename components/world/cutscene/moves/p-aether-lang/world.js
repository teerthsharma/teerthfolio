// THE INFINITE VOID, as meshes. Dimension style: COSMIC VOID, a luminous painterly
// nebula with Kirby-krackle energy dots and soft glow halation, white-violet light on
// near-black. Everything here is a mesh with its own shader: the nebula shell (a
// swirling painted sky, seen from inside as the domain and from outside as the bubble
// it blooms from), three parallax star fields (one Points draw), three spiral galaxies,
// the white-violet core with its photon ring and accretion disc, the flood of
// information (instanced ribbons that rush in and converge on the core, all moved in
// the vertex shader), the closing ring, the krackle dots, and the glassy floor (a
// Reflector: the one extra render of the scene, 512 px, no screen pass).
// Rig frame: the pup's feet at the origin, the lens out along +z. Every colour below
// is picked as sRGB and written pow(c, 2.2), like the kit's shaders.

import {
  AddEquation, CircleGeometry, CustomBlending, OneFactor, SrcAlphaFactor, ZeroFactor, DoubleSide, InstancedBufferAttribute, InstancedMesh, BufferAttribute, BufferGeometry, Mesh,
  PlaneGeometry, Points, RingGeometry, ShaderMaterial, SphereGeometry, Vector3,
} from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { HALFTONE } from "../../Stage";

export const CORE = new Vector3(0, 1.7, -15); // the white-violet core, in the rig frame
export const SHELL_R = 140;
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const u = (v) => ({ value: v });
// additive light that leaves the target's alpha alone (the post stack reads it)
const ADD = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: SrcAlphaFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor };

const NOISE = /* glsl */ `
  float sq(float x) { return x * x; }
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }`;

// the palette (sRGB): near-black, indigo, violet, orchid, white-violet, one ice-blue accent
const PAL = /* glsl */ `
  const vec3 C0 = vec3(0.010, 0.008, 0.030);
  const vec3 C1 = vec3(0.060, 0.040, 0.210);
  const vec3 C2 = vec3(0.300, 0.150, 0.700);
  const vec3 C3 = vec3(0.600, 0.260, 0.760);
  const vec3 C4 = vec3(0.930, 0.870, 1.000);
  const vec3 CB = vec3(0.380, 0.560, 1.000);`;

// THE NEBULA SHELL: painted clouds swirled round the core, brush strokes along
// the rays, three soft bands of density with a bright ridge where each begins,
// halftone dots on the ridges, a glow of halation round the core. Coloured by
// the direction from the shell's own centre, so it is the same picture from
// inside (the domain) and a luminous bubble from outside (the bloom, the collapse).
export function nebulaShell() {
  const g = new SphereGeometry(1, 56, 36);
  const m = new ShaderMaterial({
    uniforms: { uTime: u(0), uCenter: u(new Vector3()), uCore: u(new Vector3()), uCell: u(6), uLock: u(0), uFade: u(1) },
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
      uniform float uTime, uLock, uFade;
      uniform vec3 uCenter, uCore;
      varying vec3 vWorld;
      ${NOISE}
      ${PAL}
      ${HALFTONE}
      void main() {
        vec3 d = normalize(vWorld - uCenter);
        vec3 cd = normalize(uCore - uCenter);
        float c = clamp(dot(d, cd), -1.0, 1.0);
        float th = acos(c);
        vec3 ex = normalize(cross(abs(cd.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), cd));
        vec3 ey = cross(cd, ex);
        vec3 tg = d - cd * c;
        float ph = atan(dot(tg, ey), dot(tg, ex) + 1e-5);
        float ph2 = ph + 1.7 * th - uTime * 0.035; // the spiral shear
        vec2 p = th * vec2(cos(ph2), sin(ph2)) * 2.6;
        float t0 = uTime * 0.03;
        vec2 q = vec2(fbm(p * 1.2 + t0), fbm(p * 1.2 + vec2(5.2, 1.3) - t0));
        vec2 r = vec2(fbm(p * 1.7 + 3.0 * q + vec2(1.7, 9.2) + t0 * 1.4), fbm(p * 1.7 + 3.0 * q + vec2(8.3, 2.8) - t0));
        float n = fbm(p * 1.5 + 2.8 * r);
        float stroke = vnoise(vec2(ph2 * 16.0, th * 70.0)); // brush hairs along the rays
        float dens = smoothstep(0.42, 0.92, n) * (0.78 + 0.44 * stroke);
        float bands = floor(dens * 5.0) / 5.0 + 0.1;
        dens = mix(dens, bands, 0.5);
        float f = fract(dens * 5.0);
        float ridge = smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.05, 0.17, f)) * dens;
        vec3 col = C0;
        col = mix(col, C1, smoothstep(0.04, 0.34, dens));
        col = mix(col, mix(C2, C3, smoothstep(0.3, 0.8, r.y)), smoothstep(0.26, 0.62, dens));
        col = mix(col, CB, smoothstep(0.62, 0.9, q.x) * smoothstep(0.2, 0.5, dens) * 0.4);
        col = mix(col, C4, smoothstep(0.7, 1.0, dens) * 0.7);
        col += C4 * ridge * 0.55;
        col += C4 * (uCell > 0.0 ? halftone(ridge * 1.6) : ridge) * 0.18;
        float halo = exp(-th * 2.3) * 0.14 + exp(-th * 7.5) * 0.34 + exp(-th * 24.0) * 0.6;
        col += mix(C2, C4, exp(-th * 9.0)) * halo * (1.0 + uLock);
        col *= 0.62 * (1.0 - 0.5 * smoothstep(0.9, 2.4, th)); // the far sky falls to near-black
        float alpha = uFade;
        if (gl_FrontFacing) {
          // seen from outside while it blooms or collapses: a luminous bubble, clear at its middle
          float fr = pow(1.0 - abs(dot(normalize(vWorld - uCenter), normalize(vWorld - cameraPosition))), 2.0);
          col += fr * vec3(0.5, 0.36, 0.9);
          alpha = mix(0.3, 1.0, fr);
        }
        gl_FragColor = vec4(pow(col, vec3(2.2)), alpha);
        if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
      }`,
  });
  return { g, m };
}

// THE STARS: three depth layers in one Points draw. Near stars slide across the view
// fast, far ones barely move (parallax); the bright ones are four-point glints.
export function starField(n = 1500) {
  const pos = new Float32Array(n * 3);
  const a = new Float32Array(n * 4);
  const LAYERS = [
    { z: [-24, -36], half: 38, size: 5.5 },
    { z: [-56, -76], half: 74, size: 4.0 },
    { z: [-100, -135], half: 130, size: 3.0 },
  ];
  for (let i = 0; i < n; i++) {
    const l = i % 3;
    const L = LAYERS[l];
    const z = L.z[0] + (L.z[1] - L.z[0]) * hash(i, 1);
    pos[i * 3] = (hash(i, 2) * 2 - 1) * L.half;
    pos[i * 3 + 1] = -3 + hash(i, 3) ** 0.8 * (Math.abs(z) * 0.78 + 8);
    pos[i * 3 + 2] = z;
    a[i * 4] = l;
    a[i * 4 + 1] = hash(i, 4);
    a[i * 4 + 2] = L.size * (0.45 + 0.9 * hash(i, 5) ** 3);
    a[i * 4 + 3] = hash(i, 6);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aA", new BufferAttribute(a, 4));
  const m = new ShaderMaterial({
    uniforms: { uDrift: u(0), uPx: u(1), uFade: u(1) },
    transparent: true,
    depthWrite: false,
    ...ADD,
    vertexShader: /* glsl */ `
      attribute vec4 aA;
      uniform float uDrift, uPx, uFade;
      varying vec3 vC;
      varying float vBig;
      void main() {
        float L = aA.x;
        float spd = L < 0.5 ? 1.7 : (L < 1.5 ? 0.7 : 0.26);
        float rng = L < 0.5 ? 38.0 : (L < 1.5 ? 74.0 : 130.0);
        vec3 p = position;
        p.x = mod(p.x + uDrift * spd + rng, 2.0 * rng) - rng;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.7 + 0.3 * sin(uDrift * (1.2 + aA.y * 2.6) + aA.y * 60.0);
        float edge = 1.0 - smoothstep(0.82, 1.0, abs(p.x) / rng);
        gl_PointSize = aA.z * uPx * tw * edge * uFade;
        vBig = smoothstep(2.4, 4.4, aA.z);
        vC = aA.w < 0.6 ? vec3(0.95, 0.92, 1.0) : (aA.w < 0.86 ? vec3(0.72, 0.62, 1.0) : vec3(0.6, 0.78, 1.0));
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC;
      varying float vBig;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r = length(c);
        float core = pow(max(1.0 - r, 0.0), 2.6);
        float glint = (exp(-abs(c.x) * 16.0) * exp(-abs(c.y) * 1.7) + exp(-abs(c.y) * 16.0) * exp(-abs(c.x) * 1.7)) * vBig;
        float a = core + glint * 0.8;
        gl_FragColor = vec4(pow(vC, vec3(2.2)) * a, a);
        if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
      }`,
  });
  const pts = new Points(g, m);
  pts.frustumCulled = false;
  return { pts, g, m };
}

// A SPIRAL GALAXY: a quad with log-spiral arms, a hot core and dust speckle.
export function galaxy(tintA, tintB, arms, seed) {
  const g = new PlaneGeometry(1, 1);
  const m = new ShaderMaterial({
    uniforms: { uTime: u(0), uA: u(new Vector3(...tintA)), uB: u(new Vector3(...tintB)), uArms: u(arms), uSeed: u(seed), uFade: u(1) },
    transparent: true,
    depthWrite: false,
    ...ADD,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uArms, uSeed, uFade;
      uniform vec3 uA, uB;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        float r = length(vUv);
        if (r > 1.0) discard;
        float an = atan(vUv.y, vUv.x + 1e-4);
        float arm = 0.5 + 0.5 * cos(uArms * (an - uTime * 0.02) - 7.5 * log(r + 0.06));
        arm = pow(arm, 2.2);
        float grain = fbm(vUv * 7.0 + uSeed);
        float dens = arm * exp(-r * 2.4) * (0.5 + grain) + exp(-r * 13.0) * 1.9;
        float dust = step(0.86, vnoise(vUv * 70.0 + uSeed)) * arm * (1.0 - r);
        vec3 col = mix(vec3(0.97, 0.92, 1.0), mix(uA, uB, smoothstep(0.1, 0.8, r)), smoothstep(0.0, 0.3, r));
        float a = (dens + dust * 0.9) * (1.0 - smoothstep(0.78, 1.0, r)) * uFade;
        gl_FragColor = vec4(pow(col, vec3(2.2)) * a * 1.3, a);
        if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
      }`,
  });
  return { g, m };
}

// THE CORE: a white-violet light behind the pup, an event horizon with a photon ring,
// a tilted accretion disc of streaming light, long halation and thin diffraction spikes.
// One quad, faced to the lens each frame.
export function coreSprite() {
  const g = new PlaneGeometry(1, 1);
  const m = new ShaderMaterial({
    uniforms: { uTime: u(0), uLock: u(0), uPulse: u(0), uFade: u(1) },
    transparent: true,
    depthWrite: false,
    ...ADD,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xy * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uLock, uPulse, uFade;
      varying vec2 vP;
      ${NOISE}
      ${PAL}
      void main() {
        float rr = length(vP) * 17.0; // metres from the core
        vec3 col = vec3(0.0);
        float orb = 1.0 - smoothstep(0.9, 1.7, rr);
        col += vec3(1.0, 0.97, 1.0) * orb * 1.5;
        float ring = exp(-sq((rr - 2.2) / (0.1 + 0.08 * uLock)));
        col += mix(C4, vec3(1.0), 0.5) * ring * (1.4 + 1.4 * uLock + 0.4 * uPulse);
        // the accretion disc: a flat ellipse of streaming light
        vec2 e = vec2(vP.x, vP.y / 0.26) * 17.0;
        float re = length(e);
        float ae = atan(e.y, e.x + 1e-3) + uTime * 0.5 * (1.5 / (re * 0.2 + 0.5));
        float disc = smoothstep(2.6, 3.8, re) * (1.0 - smoothstep(7.0, 10.5, re));
        float streak = fbm(vec2(ae * 2.4, re * 0.55 - uTime * 0.2));
        col += mix(C3, C4, (1.0 - smoothstep(2.8, 4.0, re))) * disc * (0.25 + 1.1 * streak * streak) * 0.9;
        float halo = exp(-rr * 0.55) * 0.55 + exp(-rr * 0.12) * 0.16;
        col += mix(C2, C4, exp(-rr * 0.2)) * halo;
        // diffraction spikes
        vec2 w = vP * 17.0;
        float sp = exp(-abs(w.y) * 2.8) * exp(-abs(w.x) * 0.075) + exp(-abs(w.x) * 2.8) * exp(-abs(w.y) * 0.075);
        vec2 w2 = mat2(0.7071, -0.7071, 0.7071, 0.7071) * w;
        sp += 0.45 * (exp(-abs(w2.y) * 3.4) * exp(-abs(w2.x) * 0.14) + exp(-abs(w2.x) * 3.4) * exp(-abs(w2.y) * 0.14));
        col += C4 * sp * 0.34 * (1.0 + 0.6 * uLock);
        col = min(col * (1.0 + 0.2 * uPulse) * uFade, vec3(3.0));
        col *= 1.0 - smoothstep(0.85, 1.0, length(vP));
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
        if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
      }`,
  });
  return { g, m };
}

// THE FLOOD OF INFORMATION: ribbons of light that rush in from every side and converge
// on the core, swirling as they go, broken into dashes like bits. Every instance is
// pure vertex-shader motion (uFlow is the only per-frame write); freeze it and the
// whole flood hangs in the air.
export function flood(n = 440) {
  // plain (not instanced) geometry: n ribbons merged, so the post stack's own re-renders draw it like any mesh
  const tpl = new PlaneGeometry(1, 1, 1, 8);
  const vc = tpl.attributes.position.count;
  const ic = tpl.index.count;
  const g = new BufferGeometry();
  const gp = new Float32Array(n * vc * 3);
  const guv = new Float32Array(n * vc * 2);
  const gi = new Uint32Array(n * ic);
  const seed = new Float32Array(n * vc * 4);
  const far = new Float32Array(n * vc * 3);
  const f0 = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x;
    let y;
    let z;
    let l;
    let k = 0;
    do {
      x = hash(i, 11 + k) * 2 - 1;
      y = hash(i, 31 + k) * 2 - 1;
      z = hash(i, 51 + k) * 2 - 1;
      l = Math.hypot(x, y, z);
      k += 3;
    } while ((l > 1 || l < 0.2) && k < 60);
    const R = 24 + 95 * hash(i, 71) ** 1.4;
    x = (x / l) * R;
    y = (Math.abs(y / l) * 0.95 - 0.05) * R * 0.8;
    z = (z / l) * R;
    if (CORE.z + z > 2.5) z = -Math.abs(z) * 0.5 - 8;
    f0[i * 3] = x;
    f0[i * 3 + 1] = y;
    f0[i * 3 + 2] = z;
    const fx = f0[i * 3];
    const fy = f0[i * 3 + 1];
    const fz = f0[i * 3 + 2];
    for (let v = 0; v < vc; v++) {
      const o = i * vc + v;
      gp.set(tpl.attributes.position.array.subarray(v * 3, v * 3 + 3), o * 3);
      guv.set(tpl.attributes.uv.array.subarray(v * 2, v * 2 + 2), o * 2);
      seed.set([hash(i, 1), hash(i, 2), hash(i, 3), hash(i, 4)], o * 4);
      far.set([fx, fy, fz], o * 3);
    }
    for (let k = 0; k < ic; k++) gi[i * ic + k] = tpl.index.array[k] + i * vc;
  }
  tpl.dispose();
  g.setAttribute("position", new BufferAttribute(gp, 3));
  g.setAttribute("uv", new BufferAttribute(guv, 2));
  g.setAttribute("aSeed", new BufferAttribute(seed, 4));
  g.setAttribute("aFar", new BufferAttribute(far, 3));
  g.setIndex(new BufferAttribute(gi, 1));
  const m = new ShaderMaterial({
    uniforms: { uFlow: u(0), uLock: u(0), uFade: u(1), uCoreL: u(CORE.clone()) },
    transparent: true,
    depthWrite: false,
    ...ADD,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      attribute vec3 aFar;
      uniform float uFlow;
      uniform vec3 uCoreL;
      varying vec2 vUv;
      varying vec4 vSeed;
      varying float vHead;
      vec3 pathAt(float s) {
        float k = pow(1.0 - s, 1.7);
        float ang = (1.0 - k) * (0.8 + 1.4 * aSeed.w) * (aSeed.x > 0.5 ? 1.0 : -1.0);
        vec3 r = aFar * k;
        float c = cos(ang), sn = sin(ang);
        return uCoreL + vec3(r.x * c - r.y * sn, r.x * sn + r.y * c, r.z);
      }
      void main() {
        float head = fract(aSeed.z + uFlow * (0.15 + 0.2 * aSeed.w));
        float len = 0.06 + 0.11 * aSeed.y;
        float s = max(head - len * (1.0 - uv.y), 0.0);
        vec3 P = pathAt(s);
        vec3 T = pathAt(min(s + 0.012, 1.0)) - pathAt(max(s - 0.012, 0.0));
        vec4 wp = modelMatrix * vec4(P, 1.0);
        vec3 Tw = normalize(mat3(modelMatrix) * T + 1e-5);
        vec3 toCam = cameraPosition - wp.xyz;
        float dist = length(toCam);
        vec3 side = cross(Tw, toCam);
        side = length(side) > 1e-4 ? normalize(side) : vec3(0.0, 1.0, 0.0);
        float w = (0.0016 + 0.0022 * aSeed.y) * dist * (0.25 + 0.75 * uv.y);
        wp.xyz += side * position.x * 2.0 * w;
        vUv = uv;
        vSeed = aSeed;
        vHead = head;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uLock, uFade, uFlow;
      varying vec2 vUv;
      varying vec4 vSeed;
      varying float vHead;
      void main() {
        float across = 1.0 - pow(abs(vUv.x * 2.0 - 1.0), 2.0);
        float body = pow(vUv.y, 2.2) * across;
        float dash = smoothstep(0.30, 0.55, fract(vUv.y * 7.0 - uFlow * 1.5 * (0.5 + vSeed.y) + vSeed.z * 9.0));
        float tip = smoothstep(0.86, 1.0, vUv.y) * across;
        float life = smoothstep(0.0, 0.1, vHead) * (1.0 - smoothstep(0.88, 1.0, vHead));
        vec3 col = vSeed.x < 0.7 ? vec3(0.9, 0.84, 1.0) : (vSeed.x < 0.86 ? vec3(0.55, 0.72, 1.0) : vec3(0.78, 0.46, 0.95));
        col = mix(col, vec3(1.0, 0.97, 1.0), tip * 0.8 + uLock * 0.6);
        float a = (body * (0.35 + 0.65 * dash) + tip * 1.1) * life * uFade * (1.0 + 0.5 * uLock);
        if (!(a >= 0.0) || a > 8.0) a = 0.0;
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)) * a, a);
        if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
      }`,
  });
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  return { mesh, g, m };
}

// THE RING that closes: a thin ring of light round the core, drawn on clockwise from
// the top (uProg 0..1), with a bead of light every 30 degrees. It is the loop's cycle:
// when it closes, the shape has stopped changing.
export function closingRing() {
  const g = new RingGeometry(0.9, 1.0, 160, 1);
  const m = new ShaderMaterial({
    uniforms: { uProg: u(0), uLock: u(0), uTime: u(0), uFade: u(1) },
    transparent: true,
    depthWrite: false,
    ...ADD,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uProg, uLock, uTime, uFade;
      varying vec2 vP;
      float sq(float x) { return x * x; }
      void main() {
        float rr = length(vP);
        float t = fract(atan(vP.x, vP.y + 1e-4) / 6.28318);
        float on = 1.0 - smoothstep(uProg - 0.015, uProg, t);
        float across = exp(-sq((rr - 0.95) / 0.035));
        float beads = exp(-sq((fract(t * 12.0) - 0.5) * 12.0)) * exp(-sq((rr - 0.95) / 0.07));
        float head = exp(-sq((t - uProg) * 40.0)) * step(0.001, uProg) * (1.0 - step(0.999, uProg));
        float a = on * (across * 1.1 + beads * 1.5) + head * 2.0 * across;
        a *= (1.0 + 1.8 * uLock) * uFade;
        vec3 col = mix(vec3(0.82, 0.72, 1.0), vec3(1.0, 0.97, 1.0), uLock);
        gl_FragColor = vec4(pow(col, vec3(2.2)) * a, a);
        if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
      }`,
  });
  return { g, m };
}

// KIRBY KRACKLE: arms of round energy dots flung out from the core, big near it and
// shrinking away, each dot a bright disc with a dark ink ring so it reads on both
// the glare and the dark. Placed and sized in the vertex shader.
export function krackle(arms = 16, per = 7) {
  const n = arms * per;
  const g = new CircleGeometry(1, 14);
  const k = new Float32Array(n * 4);
  for (let a = 0; a < arms; a++) {
    for (let j = 0; j < per; j++) {
      const i = a * per + j;
      k[i * 4] = (a / arms) * Math.PI * 2 + (hash(a, 1) - 0.5) * 0.25;
      k[i * 4 + 1] = (j + 0.5) / per;
      k[i * 4 + 2] = hash(i, 2);
      k[i * 4 + 3] = hash(a, 3);
    }
  }
  g.setAttribute("aK", new InstancedBufferAttribute(k, 4));
  const m = new ShaderMaterial({
    uniforms: { uTime: u(0), uBurst: u(0), uFade: u(1), uCoreL: u(CORE.clone()) },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute vec4 aK;
      uniform float uTime, uBurst, uFade;
      uniform vec3 uCoreL;
      varying vec2 vUv;
      varying float vK;
      void main() {
        float pulse = 0.5 + 0.5 * sin(uTime * 2.2 + aK.w * 30.0);
        float r = 3.9 + aK.y * aK.y * (14.0 + 6.0 * aK.w) * (1.0 + 0.1 * pulse) + 9.0 * uBurst * aK.y;
        float ang = aK.x + aK.y * 0.7 * (aK.w > 0.5 ? 1.0 : -1.0) + uTime * 0.025;
        float size = (0.2 * (1.0 - aK.y * 0.8) + 0.03) * (0.55 + 0.45 * aK.z) * (1.0 + 0.5 * uBurst * (1.0 - aK.y)) * uFade;
        vec3 c = uCoreL + vec3(cos(ang) * r * 1.15, sin(ang) * r * 0.82, 0.3);
        vUv = position.xy;
        vK = aK.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(c + vec3(position.xy * size, 0.0), 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying float vK;
      void main() {
        float r = length(vUv);
        float fill = 1.0 - smoothstep(0.6, 0.68, r);
        float ink = smoothstep(0.6, 0.68, r) * (1.0 - smoothstep(0.92, 1.0, r));
        vec3 col = mix(vec3(0.05, 0.02, 0.12), mix(vec3(0.96, 0.92, 1.0), vec3(0.66, 0.52, 1.0), vK), fill);
        float a = fill + ink * 0.85;
        gl_FragColor = vec4(pow(col, vec3(2.2)), a);
        if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
      }`,
  });
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false;
  return { mesh, g, m };
}

// THE GLASSY FLOOR: a Reflector (the scene drawn once more, mirrored, into a small
// target) under a shader of its own: faint ripples bend the mirror, the mirror is
// strongest at a grazing angle, the far reaches fade into the void, and a ring of
// krackle-pale light lies under the pup.
const FLOOR_SHADER = {
  name: "VoidGlass",
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: { value: 0 }, uFade: { value: 1 }, uCenter: { value: new Vector3() }, uLock: { value: 0 } },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uFade, uLock;
    uniform vec3 uCenter;
    varying vec4 vUv;
    varying vec3 vWorld;
    ${NOISE}
    void main() {
      vec2 w = vWorld.xz;
      float n1 = vnoise(w * 0.32 + uTime * 0.05);
      float n2 = vnoise(w * 1.4 - uTime * 0.07);
      vec4 uv = vUv;
      uv.xy += (vec2(n1, n2) - 0.5) * 0.008 * uv.w;
      vec3 refl = texture2DProj(tDiffuse, uv).rgb;
      vec3 v = normalize(cameraPosition - vWorld);
      float fres = 0.34 + 0.62 * pow(1.0 - clamp(v.y, 0.0, 1.0), 2.4);
      vec3 base = pow(vec3(0.018, 0.014, 0.05), vec3(2.2));
      float dc = length(w - uCenter.xz);
      // thin concentric ripples round the pup, like a still glass struck once
      float rip = exp(-sq((fract(dc * 0.55 - uTime * 0.05) - 0.5) * 9.0)) * exp(-dc * 0.09) * 0.07;
      vec3 col = base + refl * fres + pow(vec3(0.7, 0.55, 1.0), vec3(2.2)) * rip * (1.0 + uLock);
      float a = (1.0 - smoothstep(34.0, 80.0, dc)) * uFade;
      gl_FragColor = vec4(col, a);
      if (!(dot(gl_FragColor, vec4(1.0)) >= 0.0) || dot(gl_FragColor, vec4(1.0)) > 80.0) gl_FragColor = vec4(0.0);
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(1.4));
    }`,
};
export function glassFloor() {
  const g = new CircleGeometry(90, 72);
  const floor = new Reflector(g, { textureWidth: 512, textureHeight: 512, clipBias: 0.003, shader: FLOOR_SHADER, multisample: 0 });
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;
  floor.material.transparent = true;
  floor.material.depthWrite = false;
  floor.frustumCulled = false;
  return { floor, g };
}
