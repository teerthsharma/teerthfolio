// THE BAROQUE-TENEBRISM LOOK (the Caravaggio dimension): darkness is the canvas and ONE hard key lights it.
// Every scenery surface, and the pup itself, shares one ShaderMaterial recipe (`tene`) and one set of
// uniforms (`U`): a floodlight high on the stair hut raking down through a cone, the broadcast screens'
// cold glow as a weak rim, and NO ambient fill (a surface facing away from both is umber, not grey).
// Lit surfaces take a buttery oil-glaze value ramp (ivory to umber, a narrow warm half-tone) and a wide warm
// varnish sheen; wet things a brighter glaze. No grain, no texture noise, no outline: lost edges.
// Every mesh is "shard-ready" (prep): when the picture breaks each triangle tumbles and falls, so the
// dimension shatters like a painting whose varnish gave out. Frame: the move's rig (the pup at the origin).

import { BoxGeometry, BufferAttribute, Color, CylinderGeometry, DoubleSide, Quaternion, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const rgb = (h) => new Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
const u3 = (x = 0, y = 0, z = 0) => ({ value: new Vector3(x, y, z) });
const u1 = (v = 0) => ({ value: v });

// the rig frame: the floodlight on the stair hut's boom, its aim, the screens' glow centre
export const KEY_AT = new Vector3(4.7, 5.9, -0.7);
export const KEY_AIM = new Vector3(-0.5, 0.5, -1.6);
export const SCREEN_AT = new Vector3(-1, 9, -40);
export const CONE = [0.915, 0.968]; // cos of the outer and inner half-angle (about 27 and 19 degrees)

export const U = {
  uOrigin: u3(), // the rig's world position: every pattern and light below is rig-local
  uKey: { value: KEY_AT.clone() },
  uAxis: { value: KEY_AIM.clone().sub(KEY_AT).normalize() },
  uCone: { value: new Vector2(CONE[0], CONE[1]) },
  uKeyOn: u1(1),
  uScreenAt: { value: SCREEN_AT.clone() },
  uScreenGlow: u1(1),
  uDoor: { value: new Vector3(5.25, 1.3, 0.45) },
  uDoorK: u1(1),
  uTime: u1(0),
  uBreak: u1(-1),
  uCrack: u1(0), // how far (m) the web of cracks has run from the screens
  uToll: u1(0), // a flicker on each toll
};

// shared GLSL: the value ramp, the one key, the screens' rim
export const LIGHT = /* glsl */ `
  uniform vec3 uOrigin, uKey, uAxis, uScreenAt, uDoor;
  uniform vec2 uCone;
  uniform float uKeyOn, uScreenGlow, uTime, uCrack, uToll, uDoorK;
  vec3 ramp(float v) {
    vec3 umber = vec3(0.025, 0.022, 0.030);
    vec3 half_ = vec3(0.60, 0.04, 0.10);
    vec3 light = vec3(0.96, 0.96, 0.97);
    vec3 c = mix(umber, half_, smoothstep(0.015, 0.30, v));
    return mix(c, light, smoothstep(0.30, 0.88, v));
  }
  // albedo in sRGB; N and P in the rig frame; wet 0..1 the glaze
  vec3 shade(vec3 albedo, vec3 N, vec3 P, float wet, float under) {
    vec3 toL = uKey - P;
    float d = length(toL);
    vec3 L = toL / d;
    float spot = smoothstep(uCone.x, uCone.y, dot(-L, uAxis));
    float fall = 1.0 / (1.0 + 0.0034 * d * d);
    float lam = clamp((dot(N, L) + 0.22) / 1.22, 0.0, 1.0);
    float v = clamp(lam * spot * fall * uKeyOn * 1.45, 0.0, 1.0);
    v = v * v * (3.0 - 2.0 * v);
    vec3 col = ramp(v) * mix(vec3(1.0), albedo * 1.18, 0.82);
    vec3 V = normalize(cameraPosition - uOrigin - P);
    vec3 H = normalize(L + V);
    float nh = max(dot(N, H), 0.0);
    float lit = spot * fall * uKeyOn * step(0.0, dot(N, L));
    col += vec3(1.0, 0.12, 0.18) * (pow(nh, 12.0) * 0.16 + pow(nh, 70.0) * (0.12 + 0.6 * wet)) * lit * 1.7;
    // the screens' cold glow: a weak rim from the broadcast towers, no fill
    vec3 toS = uScreenAt - P;
    float ds = length(toS);
    float rim = max(dot(N, toS / ds), 0.0) * uScreenGlow * 0.17 / (1.0 + 0.0006 * ds * ds);
    col += vec3(0.10, 0.30, 0.34) * rim * mix(vec3(1.0), albedo, 0.5) * (1.0 + 0.8 * uToll);
    // the doorway's candle-amber, small and close: the colony under the eave, the step, the hut's face
    vec3 toD = uDoor - P;
    float dd = length(toD);
    col += vec3(1.0, 0.15, 0.2) * max(dot(N, toD / dd), 0.0) * uDoorK / (1.0 + 0.45 * dd * dd) * mix(vec3(1.0), albedo, 0.7);
    // the city's glow from beneath the cloud ceiling: only the things hung in the sky catch it (under > 0)
    col += vec3(0.62, 0.05, 0.10) * max(-N.y * 0.8 + 0.2, 0.0) * under * albedo;
    col += albedo * vec3(0.02, 0.02, 0.03) * 0.5; // the umber of the canvas, never grey
    return col;
  }
  float crackLine(vec3 bary, float width) {
    float e = min(bary.x, min(bary.y, bary.z));
    return 1.0 - smoothstep(width * 0.4, width, e);
  }`;

// the vertex half: instanced or not, then the shatter. varyings: vP (rig frame, as drawn), vP0 (as built), vN, vCol, vBary, vR
export const VERT = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec3 aBary;
  uniform vec3 uOrigin;
  uniform float uBreak;
  varying vec3 vP;
  varying vec3 vP0;
  varying vec3 vN;
  varying vec3 vCol;
  varying vec3 vBary;
  varying float vR;
  vec3 rot(vec3 v, vec3 k, float a) {
    return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a));
  }
  vec3 shatter(vec3 w, vec3 c, float r, float tau) {
    vec3 rel = w - c;
    vec3 axis = normalize(vec3(r - 0.5, 0.7, fract(r * 7.3) - 0.5));
    rel = rot(rel, axis, tau * (1.5 + 5.0 * r)) * (0.9 - 0.75 * clamp(tau / 1.3, 0.0, 1.0));
    vec3 side = normalize(c - cameraPosition);
    c += vec3(side.x, 0.0, side.z) * tau * (1.0 + 3.0 * r) * 1.5;
    c += normalize(c - cameraPosition) * -tau * 2.0 * fract(r * 3.1);
    c.y -= 5.5 * tau * tau * (0.5 + r);
    return c + rel;
  }
  void tenePos(out vec3 wpos, out vec3 wn) {
    vec4 lp = vec4(position, 1.0);
    vec3 ln = normal;
    vec3 lc = aCenter;
    #ifdef USE_INSTANCING
      lp = instanceMatrix * lp;
      ln = mat3(instanceMatrix) * ln;
      lc = (instanceMatrix * vec4(lc, 1.0)).xyz;
    #endif
    vec4 w = modelMatrix * lp;
    vec3 wc = (modelMatrix * vec4(lc, 1.0)).xyz;
    wn = normalize(mat3(modelMatrix) * ln);
    vR = fract(sin(dot(wc, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    vP0 = w.xyz - uOrigin;
    wpos = w.xyz;
    if (uBreak > 0.0) wpos = shatter(w.xyz, wc, vR, uBreak);
    vP = wpos - uOrigin;
    vBary = aBary;
  }`;

// a shard-ready, flat-shaded geometry: non-indexed, face normals, per-triangle centre and barycentric corners
export function prep(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g.computeVertexNormals();
  const p = g.attributes.position;
  const n = p.count;
  const center = new Float32Array(n * 3);
  const bary = new Float32Array(n * 3);
  for (let t = 0; t < n; t += 3) {
    for (let k = 0; k < 3; k++) {
      for (let a = 0; a < 3; a++) center[(t + k) * 3 + a] = (p.array[t * 3 + a] + p.array[t * 3 + 3 + a] + p.array[t * 3 + 6 + a]) / 3;
      bary[(t + k) * 3 + k] = 1;
    }
  }
  g.setAttribute("aCenter", new BufferAttribute(center, 3));
  g.setAttribute("aBary", new BufferAttribute(bary, 3));
  return g;
}
// smooth-shaded variant (round things: the bell, the apples, the beads): keeps vertex normals, still shard-ready
export function prepSmooth(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute("uv");
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position;
  const n = p.count;
  const center = new Float32Array(n * 3);
  const bary = new Float32Array(n * 3);
  for (let t = 0; t < n; t += 3) {
    for (let k = 0; k < 3; k++) {
      for (let a = 0; a < 3; a++) center[(t + k) * 3 + a] = (p.array[t * 3 + a] + p.array[t * 3 + 3 + a] + p.array[t * 3 + 6 + a]) / 3;
      bary[(t + k) * 3 + k] = 1;
    }
  }
  g.setAttribute("aCenter", new BufferAttribute(center, 3));
  g.setAttribute("aBary", new BufferAttribute(bary, 3));
  return g;
}

// THE MATERIAL. albedo: a hex (sRGB). wet: the glaze. emit: self-light (beads, ring). glass: a see-through tube.
export function tene({ albedo = "#bdb09a", wet = 0.1, emit = 0, vertexColors = false, side, transparent = false, opacity = 1, glass = false, depthWrite, under = 0, crack = true } = {}) {
  return new ShaderMaterial({
    uniforms: { ...U, uAlbedo: { value: rgb(albedo) }, uWet: u1(wet), uEmit: u1(emit), uAlpha: u1(opacity), uUnder: u1(under), uCrackOn: u1(crack ? 1 : 0) },
    vertexColors,
    transparent: transparent || glass,
    depthWrite: depthWrite ?? !(transparent || glass),
    side: side ?? (glass ? DoubleSide : 0),
    vertexShader: /* glsl */ `
      ${VERT}
      void main() {
        vec3 w, n;
        tenePos(w, n);
        vN = n;
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = pow(color.rgb, vec3(1.0 / 2.2));
        #endif
        #ifdef USE_INSTANCING_COLOR
          vCol = instanceColor;
        #endif
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uAlbedo;
      uniform float uWet, uEmit, uAlpha, uUnder, uCrackOn;
      varying vec3 vP;
      varying vec3 vP0;
      varying vec3 vN;
      varying vec3 vCol;
      varying vec3 vBary;
      varying float vR;
      ${LIGHT}
      void main() {
        vec3 N = normalize(vN);
        if (!gl_FrontFacing) N = -N;
        vec3 alb = uAlbedo * vCol;
        vec3 col = shade(alb, N, vP, uWet, uUnder);
        float alpha = uAlpha;
        ${
          glass
            ? `
        vec3 V = normalize(cameraPosition - uOrigin - vP);
        float f = pow(max(1.0 - abs(dot(N, V)), 0.0), 2.4);
        alpha = 0.05 + 0.5 * f;
        col = col * 0.55 + vec3(0.14, 0.30, 0.34) * f * 0.7;`
            : ""
        }
        col += alb * uEmit;
        // the varnish gives out: a web of bright cracks along every edge, running out from the screens
        float reach = distance(vP0, uScreenAt);
        float web = crackLine(vBary, 0.035) * (1.0 - smoothstep(uCrack - 6.0, uCrack, reach)) * step(0.01, uCrack) * uCrackOn;
        col = mix(col, vec3(1.0, 0.93, 0.78), web * 0.9);
        gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), alpha);
      }`,
  });
}

// ---- small geometry helpers (merged, shard-ready) ---------------------------------------------------------------
const UP = new Vector3(0, 1, 0);
const A = new Vector3();
const B = new Vector3();
const Q = new Quaternion();
// a tapered limb from a to b (arrays), radius r1 at a and r2 at b
export function limb(a, b, r1, r2, seg = 6) {
  A.fromArray(a);
  B.fromArray(b);
  const g = new CylinderGeometry(r2, r1, A.distanceTo(B), seg, 1);
  Q.setFromUnitVectors(UP, B.clone().sub(A).normalize());
  g.applyQuaternion(Q);
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}
export const box = (w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => new BoxGeometry(w, h, d).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z);
export const cyl = (rt, rb, h, x = 0, y = 0, z = 0, seg = 8, rx = 0, rz = 0) => new CylinderGeometry(rt, rb, h, seg).rotateX(rx).rotateZ(rz).translate(x, y, z);
export const ball = (r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, w = 8, h = 6) => new SphereGeometry(r, w, h).scale(sx, sy, sz).translate(x, y, z);
// merge after making each part flat (parts may or may not be indexed)
export const merge = (parts, smooth = false) => {
  const list = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute("uv");
    if (!smooth) n.deleteAttribute("normal");
    return n;
  });
  const m = mergeGeometries(list);
  return smooth ? prepSmooth(m) : prep(m);
};
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const ease = { out: (x) => 1 - (1 - x) ** 3, back: (x) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2 };
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

// vertex colours on a geometry (hex, sRGB): tene({ vertexColors: true }) reads them
export function tint(g, hex) {
  const c = new Color(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(a, 3));
  return g;
}
// merge tinted parts (each made with tint) into one shard-ready mesh
export function mergeC(parts, smooth = false) {
  const list = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute("uv");
    if (!smooth) n.deleteAttribute("normal");
    return n;
  });
  const m = mergeGeometries(list);
  return smooth ? prepSmooth(m) : prep(m);
}

// a flat-lit shard-ready material for far, self-lit things (the realm, the cloud puffs): a lambert from `dir`
// (the way the light travels), an ambient floor, a fog to `haze` by distance
export function lit({ albedo, dir = [0, -1, 0], light = "#ffffff", floor = 0.2, haze = "#6a4a2a", fogK = 0, vertexColors = false, under }) {
  return new ShaderMaterial({
    uniforms: { ...U, uAlbedo: { value: rgb(albedo) }, uDir: { value: new Vector3(...dir).normalize() }, uLightC: { value: rgb(light) }, uFloor: u1(floor), uHaze: { value: rgb(haze) }, uFog: u1(fogK), uUnder: u1(under ?? 0) },
    vertexColors,
    vertexShader: /* glsl */ `
      ${VERT}
      void main() {
        vec3 w, n;
        tenePos(w, n);
        vN = n;
        vCol = vec3(1.0);
        #ifdef USE_COLOR
          vCol = pow(color.rgb, vec3(1.0 / 2.2));
        #endif
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uAlbedo, uDir, uLightC, uHaze, uOrigin;
      uniform float uFloor, uFog, uCrack;
      varying vec3 vP;
      varying vec3 vP0;
      varying vec3 vN;
      varying vec3 vCol;
      varying vec3 vBary;
      void main() {
        vec3 N = normalize(vN);
        if (!gl_FrontFacing) N = -N;
        float l = max(dot(N, -uDir), 0.0);
        vec3 col = uAlbedo * vCol * (uFloor + (1.0 - uFloor) * l * uLightC);
        float d = distance(vP0 + uOrigin, cameraPosition);
        col = mix(col, uHaze, 1.0 - exp(-d * uFog));
        gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 1.0);
      }`,
  });
}
