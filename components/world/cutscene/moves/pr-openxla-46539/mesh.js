// The dimension's solid things: geometry made ready for the page to tear
// (shards), tagged with a recipe from the press's table, and the two
// materials every solid wears: the printed surface (windows lit or dark,
// cracked asphalt, lava bands, Ben-Day shadow, ink on every crease) and the
// ink hull that draws the thick outline round it, a constant few pixels wide.

import { BackSide, BoxGeometry, BufferAttribute, DoubleSide, ShaderMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SHARD_FRAG, SHARD_VERT, flat, shardify } from "../p-caustic/parts";
import { limb } from "../p-caustic/susanoo";
import { PRINT, PAL, SH, u } from "./print";

export { limb };
// a part, flat and tagged with its recipe
export function tag(g, pal) {
  const f = flat(g);
  f.setAttribute("aPal", new BufferAttribute(new Float32Array(f.attributes.position.count).fill(pal), 1));
  return f;
}
export const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => new BoxGeometry(w, h, d).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z);

// merged parts -> shard attributes + a smoothed normal for the hull (corners that meet share one)
export function build(parts, jitter = 0) {
  const g = shardify(mergeGeometries(parts), jitter);
  const p = g.attributes.position;
  const acc = new Map();
  const key = (i) => `${Math.round(p.getX(i) * 400)},${Math.round(p.getY(i) * 400)},${Math.round(p.getZ(i) * 400)}`;
  const nrm = (a, b, c) => {
    const ux = p.getX(b) - p.getX(a);
    const uy = p.getY(b) - p.getY(a);
    const uz = p.getZ(b) - p.getZ(a);
    const vx = p.getX(c) - p.getX(a);
    const vy = p.getY(c) - p.getY(a);
    const vz = p.getZ(c) - p.getZ(a);
    const x = uy * vz - uz * vy;
    const y = uz * vx - ux * vz;
    const z = ux * vy - uy * vx;
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  };
  for (let t = 0; t < p.count; t += 3) {
    const n = nrm(t, t + 1, t + 2);
    for (let k = 0; k < 3; k++) {
      const kk = key(t + k);
      const a = acc.get(kk) ?? [0, 0, 0];
      a[0] += n[0];
      a[1] += n[1];
      a[2] += n[2];
      acc.set(kk, a);
    }
  }
  const sm = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const a = acc.get(key(i));
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    sm[i * 3] = a[0] / l;
    sm[i * 3 + 1] = a[1] / l;
    sm[i * 3 + 2] = a[2] / l;
  }
  g.setAttribute("aSmooth", new BufferAttribute(sm, 3));
  return g;
}

// ---- the printed surface ----
const WORLD_FRAG = /* glsl */ `
  uniform float uSun, uBreak, uStreet;
  uniform vec4 uHaze;
  uniform vec3 uPillar, uCrater;
  varying vec3 vOrig;
  varying float vRand;
  varying float vPal;
  ${PRINT}
  ${SHARD_FRAG}
  void main() {
    vec3 toCam = cameraPosition - vOrig;
    float dist = length(toCam);
    vec3 n = normalize(cross(dFdx(vOrig), dFdy(vOrig)));
    if (dot(n, toCam) < 0.0) n = -n;
    int id = int(vPal + 0.5);
    vec4 t = uPal[id];
    vec3 p = vOrig;
    float ink = 0.0;
    float unlit = 0.0;
    bool wall = id <= 3;
    float sunMask = uSun * (0.3 + 0.7 * (1.0 - smoothstep(uPillar.z * 0.5, uPillar.z * 1.8, length(p.xz - uPillar.xy))));
    if (wall && abs(n.y) < 0.5) {
      // windows: a grid in the wall's own plane, lit yellow, lit orange, dark, or smashed
      bool xface = abs(n.x) > abs(n.z);
      vec2 g = (xface ? vec2(p.z, p.y) : vec2(p.x, p.y)) / vec2(1.9, 2.4);
      vec2 d = abs(fract(g) - 0.5);
      float h = h21(floor(g) + float(id) * 13.0 + (xface ? 5.0 : 0.0));
      float inWin = step(d.x, 0.3) * step(d.y, 0.27) * step(1.6, p.y);
      float frameW = step(d.x, 0.37) * step(d.y, 0.33) * step(1.3, p.y) * (1.0 - inWin);
      if (inWin > 0.5) {
        if (h < 0.28) { t = uPal[10]; unlit = 1.0; }
        else if (h < 0.44) { t = vec4(0.0, 0.5, 0.95, 0.0); unlit = 1.0; }
        else t = vec4(0.9, 0.75, 0.1, 0.85);
        vec2 f = fract(g) - 0.5;
        if (h > 0.9 && abs(f.x + f.y * 0.8) < 0.07) ink = 1.0; // a smashed pane
      }
      ink = max(ink, frameW);
      // the storeys: a band of ink at each floor line
      ink = max(ink, 1.0 - smoothstep(0.015, 0.045, 0.5 - abs(fract(p.y / 2.4) - 0.5)));
    }
    if (id == 4) {
      float ax = abs(p.x);
      float curb = 1.0 - smoothstep(0.05, 0.16, abs(ax - uStreet));
      if (ax > uStreet) {
        t = uPal[5];
        ink = max(ink, 1.0 - smoothstep(0.012, 0.035, 0.5 - abs(fract(p.z / 2.4) - 0.5)));
      } else {
        float dash = step(abs(p.x), 0.15) * step(0.45, fract(p.z * 0.14));
        t = mix(t, uPal[10], dash);
        float cr = vorEdge(p.xz * 0.38 + 4.0) + 0.04 * vnoise(p.xz * 2.5);
        ink = max(ink, (1.0 - smoothstep(0.012, 0.045, cr)) * step(h21(floor(p.xz * 0.38 + 4.0)), 0.5));
      }
      ink = max(ink, curb);
      // the crater: a cream sinter lip, the bowl in three bands of heat
      float q = length(p.xz - uCrater.xy) / uCrater.z;
      if (q < 1.55) {
        float lip = 1.0 - smoothstep(1.0, 1.5, q);
        t = mix(t, uPal[8], lip);
        ink = max(ink, 1.0 - smoothstep(0.0, 0.05, abs(q - 1.18) - 0.012));
        if (q < 1.0) {
          float heat = (1.0 - smoothstep(0.0, 1.0, q)) + 0.1 * sin(uTime * 3.0 + q * 13.0 + vnoise(p.xz * 2.0) * 6.0);
          float fb = clamp(heat, 0.0, 0.999) * 3.0;
          t = fb > 2.0 ? vec4(0.0, 0.0, 0.7, 0.0) : (fb > 1.0 ? uPal[9] : vec4(0.05, 0.9, 0.9, 0.3));
          float bf = fract(fb);
          ink = max(ink, (1.0 - smoothstep(0.0, 0.06, min(bf, 1.0 - bf))) * step(1.0, fb));
          ink = max(ink, 1.0 - smoothstep(0.0, 0.06, abs(q - 1.0)));
          unlit = 1.0;
        }
      }
    }
    if (id == 13) {
      // the exposed brain: lobes cut by ink folds
      float f = fbm(p.xy * 2.6 + p.z * 1.9);
      float fold = abs(fract(f * 5.0) - 0.5);
      ink = max(ink, smoothstep(0.42, 0.48, fold));
      t = mix(t, vec4(0.0, 0.9, 0.35, 0.0), smoothstep(0.35, 0.65, f) * 0.6);
    }
    vec3 L = normalize(vec3(-0.4, 0.8, 0.45));
    float nl = dot(n, L);
    float shade = (1.0 - smoothstep(0.05, 0.4, nl)) * (1.0 - unlit);
    if (id == 12) {
      // the nomu: ink black with a cyan rim of light along the edge
      // three flat tones by the light, then the rim of cyan
      float rim = pow(1.0 - max(dot(n, normalize(toCam)), 0.0), 2.0);
      t = nl > 0.5 ? vec4(0.6, 0.35, 0.0, 0.08) : (nl > 0.0 ? vec4(0.78, 0.55, 0.0, 0.28) : vec4(0.85, 0.7, 0.0, 0.5));
      t = mix(t, vec4(0.95, 0.12, 0.0, 0.0), smoothstep(0.5, 0.75, rim));
    }
    t.w += (1.0 - t.w) * shade * 0.5;
    float lite = sunMask * (1.0 - shade * 0.6) * (1.0 - unlit);
    t.w *= 1.0 - 0.45 * lite;
    t.x *= 1.0 - 0.3 * lite;
    t.z += 0.16 * lite * (1.0 - t.z);
    // the distance fades into the burning horizon
    t = mix(t, uHaze, smoothstep(60.0, 170.0, dist) * 0.85);
    ink = max(ink, smoothstep(0.2, 0.7, length(fwidth(n))) * 0.8);
    vec3 col = inkPrint(t);
    col = mix(col, INK_K, ink);
    float alpha = 1.0;
    if (uBreak > 0.0) {
      col = mix(col, PAPER, crackLine(0.08));
      alpha = 1.0 - smoothstep(0.7, 1.2, uBreak + 0.3 * vRand);
    }
    gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), alpha);
  }`;

// the shard meshes (ground, props, the nomu): world space through the page's tear
export function worldMaterial() {
  return new ShaderMaterial({
    uniforms: { ...SH, uPull: u(0) },
    transparent: true,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      ${SHARD_VERT}
      attribute float aPal;
      uniform float uPx, uH, uAspect;
      varying float vPal;
      void main() {
        vPal = aPal;
        vec3 w = shard(position);
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        gl_Position.xy += gl_Position.w * vec2(1.5, -1.0) * uPx * 0.5 * 2.0 / vec2(uH * uAspect, uH); // the colour plate a hair off the ink
      }`,
    fragmentShader: WORLD_FRAG,
  });
}

// instanced pieces (rubble, debris, the cheering crowd): the same press; the geometry is tagged like any other
export function instMaterial() {
  return new ShaderMaterial({
    uniforms: { ...SH, uPull: u(0) },
    transparent: true,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aPal;
      varying vec3 vOrig;
      varying vec3 vBary;
      varying float vRand;
      varying float vPal;
      void main() {
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vOrig = w.xyz;
        vBary = vec3(0.33);
        vRand = 0.0;
        vPal = aPal;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: WORLD_FRAG,
  });
}

// ---- the ink hull: the same mesh pushed out along its smoothed normals a constant few pixels, seen from behind ----
const HULL_FRAG = /* glsl */ `
  uniform float uBreak;
  varying float vRand;
  void main() {
    float a = uBreak > 0.0 ? 1.0 - smoothstep(0.7, 1.2, uBreak + 0.3 * vRand) : 1.0;
    gl_FragColor = vec4(pow(vec3(0.07, 0.055, 0.1), vec3(2.2)), a);
  }`;
export function hullMaterial() {
  return new ShaderMaterial({
    uniforms: { uBreak: SH.uBreak, uPull: u(0), uPx: SH.uPx, uH: SH.uH },
    transparent: true,
    side: BackSide,
    vertexShader: /* glsl */ `
      ${SHARD_VERT}
      attribute vec3 aSmooth;
      uniform float uPx, uH;
      void main() {
        vec3 w = shard(position);
        vec3 dir = normalize(shard(position + aSmooth * 0.05) - w);
        vec4 mv = viewMatrix * vec4(w, 1.0);
        float width = uPx * max(-mv.z, 0.5) / (projectionMatrix[1][1] * 0.5 * uH);
        mv.xyz += mat3(viewMatrix) * dir * width;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: HULL_FRAG,
  });
}
export function instHullMaterial() {
  return new ShaderMaterial({
    uniforms: { uBreak: SH.uBreak, uPx: SH.uPx, uH: SH.uH },
    transparent: true,
    side: BackSide,
    vertexShader: /* glsl */ `
      attribute vec3 aSmooth;
      uniform float uPx, uH;
      varying float vRand;
      void main() {
        vRand = 0.0;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 dir = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * aSmooth);
        vec4 mv = viewMatrix * w;
        float width = uPx * max(-mv.z, 0.5) / (projectionMatrix[1][1] * 0.5 * uH);
        mv.xyz += mat3(viewMatrix) * dir * width;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: HULL_FRAG,
  });
}
export { PAL };
