// THE FJORD, as meshes. Frame: the move's rig, the pup at the origin sitting on
// the jetty's end (deck y 0, water y WATER_Y), the lens out along +z looking
// down the fjord toward its mouth, Vinland on the horizon past it.
// One heightfield (H) makes the steep fjord walls with snow on their ledges,
// the shingle beach and the turf shelf the farmstead stands on, and a gravel
// bar behind the pup; the water is the same grid, cut to where there is water,
// shaded by depth (pale and shallow at the shore, mid-dark in the channel,
// the sky and sun in strokes on it); the sky is one shell of wet washes; Vinland
// is one strip of low golden hills. Everything is shaded by paper.js.

import { BufferAttribute, BufferGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { NOISE, GRAIN, RUN, SKY, U, col3, wash } from "./paper";

export const WATER_Y = -0.55;
export const SHORE_L = -6;
const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash2 = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vn = (x, z) => {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  return (hash2(ix, iz) * (1 - u) + hash2(ix + 1, iz) * u) * (1 - v) + (hash2(ix, iz + 1) * (1 - u) + hash2(ix + 1, iz + 1) * u) * v;
};
const fbm = (x, z) => 0.5 * vn(x, z) + 0.25 * vn(x * 2.03, z * 2.03) + 0.125 * vn(x * 4.1, z * 4.1) + 0.0625 * vn(x * 8.3, z * 8.3);

// the shores: the left bank is straight (the farmstead's), the right closes in toward the mouth; both
// fall away past the mouth into open sea
const mouth = (z) => sm(-118, -150, z);
export const shoreL = (z) => SHORE_L - 80 * mouth(z);
export const shoreR = (z) => 15 - 6 * sm(-15, -95, z) + 80 * mouth(z);

// the ledge: a wall height laid in steps, snow on every tread
function ledges(w) {
  const t = w / 3.4;
  const f = t - Math.floor(t);
  return (Math.floor(t) + sm(0.5, 0.93, f)) * 3.4 * 0.62 + w * 0.38;
}

export function H(x, z) {
  const dL = shoreL(z) - x;
  const dR = x - shoreR(z);
  const fade = 1 - mouth(z) * 0.92;
  let y;
  if (dL > 0) {
    const meadow = -0.62 + 1.1 * Math.pow(Math.min(1, dL / 3.6), 0.8) + 0.03 * Math.max(0, Math.min(dL, 24) - 3.6);
    const wall = ledges((36 * (1 - Math.exp(-dL / 6.5)) + 16 * fbm(x * 0.05, z * 0.05) * sm(2, 16, dL)) * fade);
    const k = Math.max(sm(-20, -34, z), sm(24, 34, dL), sm(14, 22, z));
    y = meadow + (wall - meadow) * k;
    y += (fbm(x * 0.5, z * 0.5) - 0.5) * 0.35 * sm(3, 8, dL) * (1 - k);
  } else if (dR > 0) {
    y = -0.62 + ledges((38 * (1 - Math.exp(-dR / 7.5)) + 14 * fbm(x * 0.05 + 9, z * 0.05) * sm(2, 16, dR)) * fade);
  } else {
    const dw = Math.min(-dL, -dR);
    y = -0.62 - 2.6 * sm(0, 6, dw);
  }
  // the gravel bar behind the pup, where the penguins walk
  if (x > SHORE_L - 1) y = Math.max(y, -0.58 + 0.78 * Math.exp(-(((z + 3.7) / 1.05) ** 2)) * (1 - sm(0.5, 4.4, x)) * (1 - sm(-7, -5, -x)));
  return y;
}

// ---- terrain ------------------------------------------------------------------
const COLS = 112;
const ROWS = 150;
const gx = (u) => SHORE_L + (u < 0 ? 78 : 66) * Math.sign(u) * Math.abs(u) ** 1.6;
const gz = (v) => 30 - 245 * v ** 1.5;

export function landGeometry() {
  const nx = COLS + 1;
  const nz = ROWS + 1;
  const pos = new Float32Array(nx * nz * 3);
  const depth = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = gx((i / COLS) * 2 - 1);
      const z = gz(j / ROWS);
      const y = H(x, z);
      const k = j * nx + i;
      pos.set([x, y, z], k * 3);
      depth[k] = Math.max(0, WATER_Y - y);
    }
  }
  const idx = [];
  const widx = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
      if (depth[a] > 0 || depth[b] > 0 || depth[c] > 0 || depth[d] > 0) widx.push(a, b, c, b, d, c);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aDepth", new BufferAttribute(depth, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  const w = new BufferGeometry();
  w.setAttribute("position", g.attributes.position);
  w.setAttribute("aDepth", g.attributes.aDepth);
  w.setIndex(widx);
  return { land: g, water: w };
}

export function landMaterial() {
  return wash({
    vertexColors: false,
    paper: 0.85,
    edge: 0.3,
    rim: 0.5,
    haze: 0.0046,
    attributes: "attribute float aDepth;",
    albedo: /* glsl */ `
      float y = W.y;
      float n1 = fbm(W.xz * 0.33);
      float n2 = fbm(W.xz * 1.7 + 3.0);
      float up = N.y;
      vec3 rock = mix(vec3(0.40, 0.47, 0.61), vec3(0.58, 0.55, 0.69), n1);
      rock = mix(rock, vec3(0.64, 0.50, 0.50), smoothstep(0.55, 0.8, n2) * 0.35);
      vec3 turf = mix(vec3(0.50, 0.61, 0.42), vec3(0.67, 0.62, 0.40), n1);
      turf = mix(turf, vec3(0.62, 0.50, 0.36), smoothstep(0.6, 0.85, n2) * 0.4);
      vec3 shingle = mix(vec3(0.82, 0.73, 0.60), vec3(0.58, 0.58, 0.64), smoothstep(0.45, 0.78, vnoise(W.xz * 4.5)));
      vec3 bed = vec3(0.20, 0.34, 0.50);
      vec3 snow = vec3(0.975, 0.955, 0.93);
      vec3 c = rock;
      // the shelf the farmstead stands on: turf, shingle at the water
      float shelf = smoothstep(0.62, 0.9, up) * smoothstep(6.5, 3.0, y) * step(W.x, -4.0);
      c = mix(c, turf, shelf);
      float beach = smoothstep(0.62, 0.0, y) * step(W.x, -3.5);
      float bar = smoothstep(0.1, 0.0, abs(W.z + 3.7) - 0.9) * smoothstep(0.6, -0.1, y);
      c = mix(c, shingle, max(beach, bar));
      c = mix(c, bed, smoothstep(-0.35, -0.9, y));
      // snow rests on every tread of the walls and deepens with height
      float sn = smoothstep(0.52, 0.8, up) * smoothstep(4.5, 7.5, y + (n2 - 0.5) * 4.0) + smoothstep(14.0, 26.0, y + (n1 - 0.5) * 9.0) * smoothstep(0.3, 0.7, up);
      c = mix(c, snow, clamp(sn, 0.0, 1.0));
      return c;`,
  });
}

// ---- water --------------------------------------------------------------------
export function waterMaterial() {
  return new ShaderMaterial({
    uniforms: { uSun: U.uSun, uTime: U.uTime, uRun: U.uRun, uRes: U.uRes, uPx: U.uPx, uPaper: U.uPaper, uHaze: U.uHaze },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aDepth;
      varying vec3 vW;
      varying float vD;
      void main() {
        vD = aDepth;
        vec4 w = modelMatrix * vec4(position.x, ${WATER_Y.toFixed(2)}, position.z, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRun, uPx;
      uniform vec2 uRes;
      uniform vec3 uSun, uPaper, uHaze;
      varying vec3 vW;
      varying float vD;
      ${NOISE}
      ${GRAIN}
      ${RUN}
      ${SKY}
      void main() {
        vec3 V = normalize(cameraPosition - vW);
        // a slow swell tilts the surface a little
        float sw = fbm(vW.xz * 0.55 + vec2(uTime * 0.05, -uTime * 0.04)) - 0.5;
        vec3 N = normalize(vec3(sw * 0.16, 1.0, fbm(vW.xz * 0.5 + 13.0 - uTime * 0.04) * 0.16 - 0.08));
        vec3 R = reflect(-V, N);
        R.y = abs(R.y);
        vec3 sky = skyCol(R, uTime);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 deepC = vec3(0.19, 0.33, 0.50);
        vec3 shalC = vec3(0.45, 0.68, 0.75);
        float dep = smoothstep(0.0, 1.9, vD);
        vec3 body = mix(shalC, deepC, dep);
        float blot = fbm(vW.xz * vec2(0.1, 0.07) + 4.0);
        body *= 0.82 + 0.34 * blot; // pigment pooled in blooms
        vec3 col = mix(body, sky, 0.2 + 0.5 * fres);
        // long strokes where the brush lifted the blue, and the paper-white glitter path under the sun
        float stroke = fbm(vec2(vW.x * 0.12, vW.z * 1.5 + uTime * 0.12 + fbm(vW.xz * 0.18) * 2.4));
        col = mix(col, sky * 1.06, smoothstep(0.6, 0.78, stroke) * 0.34);
        float g = pow(max(dot(R, uSun), 0.0), 90.0) * smoothstep(0.5, 0.8, stroke);
        col = mix(col, vec3(1.0, 0.96, 0.88), clamp(g * 1.6, 0.0, 0.85));
        // the shore: pigment pools in a darker line, then bare paper where the wave breaks
        float line = smoothstep(0.0, 0.14, vD) * (1.0 - smoothstep(0.14, 0.4, vD));
        col *= 1.0 - 0.2 * line;
        col = mix(col, uPaper, (1.0 - smoothstep(0.0, 0.1, vD)) * 0.92);
        float pg = paperGrain();
        col *= 0.93 + 0.12 * pg;
        float dist = distance(vW, cameraPosition);
        col = mix(col, uHaze, (1.0 - exp(-dist * 0.0036)) * 0.7);
        col = runWash(col, body);
        float a = 1.0 - (1.0 - smoothstep(0.0, 0.16, vD)) * 0.35;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), a);
      }`,
  });
}

// ---- sky ------------------------------------------------------------------------
// ONE shell. Seen from outside while it blooms out of the pup it is a ball of wet
// wash, its edge pooled dark and wobbling; from inside it is the dawn sky.
export function skyShell() {
  const m = new ShaderMaterial({
    uniforms: { uSun: U.uSun, uTime: U.uTime, uRun: U.uRun, uRes: U.uRes, uPx: U.uPx, uPaper: U.uPaper, uHaze: U.uHaze, uInside: { value: 0 } },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      varying vec3 vObj;
      void main() {
        vObj = position;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRun, uPx, uInside;
      uniform vec2 uRes;
      uniform vec3 uSun, uPaper, uHaze;
      varying vec3 vW;
      varying vec3 vObj;
      ${NOISE}
      ${GRAIN}
      ${RUN}
      ${SKY}
      void main() {
        vec3 d = uInside > 0.5 ? normalize(vW - cameraPosition) : normalize(vObj);
        vec3 c = skyCol(d, uTime);
        // below the horizon the sky is the water's reflected haze
        c = mix(c, uHaze, smoothstep(0.0, -0.12, d.y) * 0.8);
        float a = 1.0;
        if (gl_FrontFacing && uInside < 0.5) {
          float f = pow(1.0 - abs(dot(normalize(vObj), normalize(vW - cameraPosition))), 2.0);
          c *= 1.0 - 0.34 * f * (0.7 + 0.5 * fbm(vObj.xy * 3.0 + vObj.z * 2.0));
          a = mix(0.45, 1.0, f);
        }
        float pg = paperGrain();
        c *= 0.95 + 0.09 * pg;
        c = runWash(c, c);
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), a);
      }`,
  });
  return { g: new SphereGeometry(1, 40, 20), m };
}

// ---- Vinland ----------------------------------------------------------------------
// a strip of low golden hills far past the mouth, in warm haze: wheat in long strokes that ripple
export const VIN_Z = -150;
export function vinlandGeometry() {
  const g = new PlaneGeometry(190, 46, 95, 18).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + 6;
    const z = p.getZ(i);
    const edge = 1 - sm(0.4, 1, Math.abs(p.getX(i)) / 95);
    const front = sm(23, 8, z); // toward the sea the land lowers to the shore
    const hill = (5.5 * fbm(x * 0.045, z * 0.08 + 2) + 2.8 * Math.sin(x * 0.05 + 1.0) * 0.5 + 1.5) * edge;
    p.setXYZ(i, p.getX(i) + 6, Math.max(-0.4, hill * (1 - front * 0.85)) - 0.3, z + VIN_Z - 12);
  }
  g.computeVertexNormals();
  return g;
}
export function vinlandMaterial() {
  return wash({
    vertexColors: false,
    transparent: true,
    uniforms: { uVin: { value: 0 } },
    paper: 0.55,
    edge: 0.18,
    rim: 0.6,
    haze: 0.0016,
    alpha: "uVin * (0.15 + 0.85 * smoothstep(0.0, 0.7, N.y))",
    depthWrite: false,
    albedo: /* glsl */ `
      float rip = sin(W.x * 1.6 + uTime * 1.2 + W.z * 0.5) * 0.5 + 0.5;
      float str = fbm(vec2(W.x * 0.5 + rip * 0.4, W.z * 2.4));
      vec3 gold = mix(vec3(0.86, 0.68, 0.30), vec3(0.95, 0.82, 0.46), str);
      gold = mix(gold, vec3(0.74, 0.58, 0.28), smoothstep(0.55, 0.8, fbm(W.xz * 0.12 + 2.0)) * 0.45);
      gold = mix(gold, vec3(0.98, 0.9, 0.62), rip * 0.16);
      return gold;`,
  });
}

// ---- drift ice --------------------------------------------------------------------
export function floeGeometry() {
  // a squashed seven-sided slab: a paper-white top and a pale blue-green belly
  const g = new IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = 1 + 0.18 * Math.sin(x * 5 + z * 3);
    p.setXYZ(i, x * k, y * 0.18, z * k);
  }
  g.computeVertexNormals();
  return g;
}
export function floeMaterial() {
  return wash({
    vertexColors: false,
    paper: 1,
    edge: 0.4,
    rim: 0.2,
    albedo: /* glsl */ `
      float t = smoothstep(-0.05, 0.4, N.y);
      return mix(vec3(0.62, 0.80, 0.84), vec3(0.95, 0.96, 0.97), t);`,
  });
}

export const v3 = (x, y, z) => new Vector3(x, y, z);
export { col3, Float32BufferAttribute };
