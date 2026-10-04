// TENSURA's WORLD: a textured crystal cave (rock strata, faceted crystal clusters, glowing pools, stalactites) that breaks open into
// the Falmuth-vs-Tempest battlefield of the Harvest Festival (a painted three-layer panorama, an instanced army, banners, smoke
// columns, a burning horizon and Megiddo's beams from the sky). Every surface is a canvas texture or a shader pattern; nothing is
// a flat colour field. All of it is built once at mount (and prewarmed); per frame only uniforms change.
import { AdditiveBlending, BackSide, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, Object3D, PlaneGeometry, ShaderMaterial, SphereGeometry, SRGBColorSpace, CircleGeometry, LinearFilter, Vector4 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { KIND, layer } from "./paper";

const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
const mesh = (mat, geo) => {
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
};

const NOISE = /* glsl */ `
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
  float fbm(vec2 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
`;
const paint = (geo, color) => {
  const c = new Color(color);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(a, 3));
  return geo;
};
const M4 = new Matrix4();
const place = (geo, x, y, z, ry = 0, rx = 0, rz = 0) => {
  M4.makeRotationFromEuler(new Object3D().rotation.set(rx, ry, rz, "YXZ"));
  M4.setPosition(x, y, z);
  return geo.applyMatrix4(M4);
};

// ------------------------------------------------------------------ the cave: crystal clusters
const CRYSTAL = ["#37e8ff", "#c050ff", "#7a6bff", "#ff5ad8", "#46ffd0", "#4aa0ff"];
const LIGHTS = 10;
const CEIL = 11;
function crystalGeo() {
  const parts = [];
  const lights = [];
  const cluster = (cx, cz, k, big, ci) => {
    const n = 3 + Math.floor(hash(k, 1) * 4);
    for (let j = 0; j < n; j++) {
      const r = (big ? 0.55 : 0.28) * (0.6 + hash(k * 9 + j, 2));
      const h = (big ? 4.8 : 1.8) * (0.45 + hash(k * 9 + j, 3)) * (j === 0 ? 1.3 : 1);
      const col = CRYSTAL[(ci + (j % 3 === 2 ? 1 : 0)) % CRYSTAL.length];
      const body = paint(new CylinderGeometry(r * 0.75, r, h * 0.7, 6, 1).translate(0, h * 0.35, 0), col);
      const tip = paint(new ConeGeometry(r * 0.75, h * 0.34, 6).translate(0, h * 0.7 + h * 0.17, 0), col);
      const ox = (hash(k * 9 + j, 4) - 0.5) * (big ? 2.2 : 0.9);
      const oz = (hash(k * 9 + j, 5) - 0.5) * (big ? 2.2 : 0.9);
      const tilt = (j === 0 ? 0.1 : 0.45) * (hash(k * 9 + j, 6) - 0.4);
      const dir = hash(k * 9 + j, 7) * 6.28;
      for (const g of [body, tip]) {
        place(g, cx + ox, 0, cz + oz, dir, tilt, hash(k * 9 + j, 8) * 0.4 - 0.2);
        parts.push(g);
      }
    }
    if (big && lights.length < LIGHTS) lights.push([cx, cz, 9 + 6 * hash(k, 9), ci % 3]);
  };
  const cl = [];
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2 + hash(k, 1) * 0.2;
    const near = k % 3 === 0;
    const ring = near ? 9 + 5 * hash(k, 2) : 20 + 9 * hash(k, 2);
    if (near && Math.cos(a) > 0.1 && Math.sin(a) > 0.1) continue; // the camera side stays open
    cl.push([Math.cos(a) * ring, Math.sin(a) * ring, k, !near || k % 2 === 0, k]);
  }
  for (const [x, z, k, big, ci] of cl) cluster(x, z, k, big, ci);
  return { geo: mergeGeometries(parts, false), lights };
}

// stalactites and the ceiling share the wall's rock
function stalactiteGeo() {
  const parts = [];
  for (let k = 0; k < 90; k++) {
    const a = hash(k, 1) * Math.PI * 2;
    const rr = 4 + 31 * Math.sqrt(hash(k, 2));
    const len = 2 + 5 * hash(k, 3);
    const r = 0.35 + 0.9 * hash(k, 4);
    const g = new ConeGeometry(r, len, 7, 1).rotateX(Math.PI).translate(0, CEIL - len / 2, 0);
    place(g, Math.cos(a) * rr, 0, Math.sin(a) * rr, 0, (hash(k, 5) - 0.5) * 0.12, (hash(k, 6) - 0.5) * 0.12);
    parts.push(g);
  }
  parts.push(new CylinderGeometry(10, 36, 6, 28, 1, true).translate(0, CEIL + 3, 0));
  return mergeGeometries(parts, false);
}

const DISSOLVE = /* glsl */ `
  uniform float uDis;
  float dissolve(vec2 q, vec3 col, out vec3 outCol) {
    float n = fbm(q);
    float k = n - uDis * 0.9;
    outCol = col + vec3(1.0, 0.45, 0.12) * (1.0 - smoothstep(0.0, 0.07, k)) * step(0.001, uDis) * 1.6;
    return k;
  }
`;

function crystalMat() {
  return new ShaderMaterial({
    side: DoubleSide,
    vertexColors: true,
    uniforms: { uT: { value: 0 }, uDis: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vW; varying vec3 vC; void main(){ vC = vec3(1.0);
      #ifdef USE_COLOR
        vC = color.rgb;
      #endif
      vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uT;
      varying vec3 vW; varying vec3 vC;
      ${NOISE}
      ${DISSOLVE}
      void main() {
        vec3 base = pow(vC, vec3(1.0 / 2.2));
        vec3 n = cross(dFdx(vW), dFdy(vW));
        n = n / max(length(n), 1e-5);
        vec3 v = normalize(cameraPosition - vW + vec3(0.0, 0.0001, 0.0));
        if (dot(n, v) < 0.0) n = -n;
        float fr = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.0);
        float facet = 0.5 + 0.5 * dot(n, normalize(vec3(-0.4, 0.7, 0.5)));
        float inner = 0.5 + 0.5 * sin(vW.y * 4.0 + vW.x * 1.7 + n.x * 9.0 + n.z * 5.0);
        float vein = smoothstep(0.62, 0.9, fbm(vec2(vW.y * 1.3 + n.x * 4.0, vW.x * 0.9 + vW.z * 0.9)));
        float tipGlow = smoothstep(0.0, 9.0, vW.y);
        vec3 col = base * (0.16 + 0.55 * facet) + base * (0.3 + 0.6 * inner) * (0.4 + 0.25 * sin(uT * 2.0 + vW.x)) + vec3(1.0) * vein * 0.3 * base + base * fr * 0.8;
        vec3 outc; float k = dissolve(vW.xz * 0.2 + vW.y * 0.1, col, outc);
        if (k < 0.0) discard;
        gl_FragColor = vec4(outc, 1.0);
      }`,
  });
}

function rockMat() {
  return new ShaderMaterial({
    side: DoubleSide,
    uniforms: { uT: { value: 0 }, uDis: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uT;
      varying vec3 vW;
      ${NOISE}
      ${DISSOLVE}
      void main() {
        float az = atan(vW.x, vW.z + 0.0001) * 7.0;
        vec2 q = vec2(az, vW.y * 0.9);
        float st = fbm(q * 0.35);
        float bands = 0.5 + 0.5 * sin(vW.y * 1.1 + st * 7.0);
        vec3 col = mix(vec3(0.07, 0.04, 0.17), vec3(0.3, 0.17, 0.5), bands * 0.7 + st * 0.35);
        float ridge = 1.0 - abs(fbm(q * 0.9 + 4.0) * 2.0 - 1.0);
        col += vec3(0.15, 0.85, 1.0) * smoothstep(0.93, 0.985, ridge) * 0.8;
        col *= 0.55 + 0.9 * fbm(q * 2.4);
        col *= 0.4 + 0.9 * exp(-max(vW.y, 0.0) * 0.07);
        float dist = length(vW.xz);
        col = mix(col, vec3(0.06, 0.03, 0.14), smoothstep(26.0, 60.0, dist) * 0.6);
        vec3 outc; float k = dissolve(q * 0.4, col, outc);
        if (k < 0.0) discard;
        gl_FragColor = vec4(outc, 1.0);
      }`,
  });
}

function floorMat(lightArr) {
  return new ShaderMaterial({
    side: DoubleSide,
    uniforms: { uT: { value: 0 }, uWarR: { value: 0 }, uL: { value: lightArr } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uWarR; uniform vec4 uL[${LIGHTS}];
      varying vec3 vW;
      ${NOISE}
      void main() {
        vec2 p = vW.xz;
        float d = length(p);
        // ---- cave stone: strata, glowing fissures, crystal pools
        float st = fbm(p * 0.35);
        float bands = 0.5 + 0.5 * sin(p.x * 0.5 + p.y * 0.3 + st * 9.0);
        vec3 rock = mix(vec3(0.08, 0.05, 0.2), vec3(0.3, 0.16, 0.52), bands * 0.8 + st * 0.3);
        rock *= 0.7 + 0.5 * vn(p * 6.0);
        float rid = 1.0 - abs(fbm(p * 0.8) * 2.0 - 1.0);
        rock += vec3(0.2, 0.9, 1.0) * smoothstep(0.93, 0.99, rid) * 0.9;
        float pn = fbm(p * 0.2 + 3.0);
        float pool = smoothstep(0.55, 0.59, pn);
        float wv = 0.5 + 0.5 * sin(d * 2.5 + uT * 2.0 + fbm(p * 1.8) * 7.0);
        vec3 water = mix(vec3(0.04, 0.3, 0.65), vec3(0.45, 1.0, 1.0), pow(wv, 3.0)) * (0.7 + 0.5 * smoothstep(0.59, 0.66, pn));
        vec3 cave = mix(rock, water, pool);
        for (int i = 0; i < ${LIGHTS}; i++) {
          vec2 q = p - uL[i].xy;
          float g = uL[i].z / (uL[i].z + dot(q, q) * 0.9);
          vec3 lc = uL[i].w < 0.5 ? vec3(0.2, 0.9, 1.0) : (uL[i].w < 1.5 ? vec3(1.0, 0.35, 0.85) : vec3(0.55, 0.4, 1.0));
          cave += lc * g * g * 0.5 * step(0.01, uL[i].z);
        }
        cave = mix(cave, vec3(0.05, 0.025, 0.12), smoothstep(34.0, 78.0, d));
        // ---- scorched earth: cracked ash, ember seams, trampled ruts
        float s2 = fbm(p * 0.6);
        vec3 earth = mix(vec3(0.045, 0.028, 0.022), vec3(0.26, 0.14, 0.08), s2);
        earth = mix(earth, vec3(0.13, 0.12, 0.12), smoothstep(0.55, 0.8, fbm(p * 2.1 + 7.0)) * 0.55);
        float rut = smoothstep(0.45, 0.5, abs(sin(p.x * 0.7 + fbm(p * 0.5) * 5.0)));
        earth *= 0.7 + 0.35 * rut + 0.35 * vn(p * 9.0);
        float emb = smoothstep(0.955, 0.992, 1.0 - abs(fbm(p * 1.25 + vec2(uT * 0.04, 0.0)) * 2.0 - 1.0));
        earth += vec3(1.0, 0.42, 0.08) * emb * (0.6 + 0.3 * sin(uT * 7.0 + p.x));
        earth = mix(earth, vec3(0.5, 0.2, 0.08), smoothstep(55.0, 95.0, d) * 0.5);
        float w = 1.0 - smoothstep(uWarR - 5.0, uWarR, d);
        vec3 col = mix(cave, earth, w);
        float ring = exp(-pow((d - uWarR) * 0.5, 2.0)) * step(0.5, uWarR) * step(uWarR, 90.0);
        col += vec3(1.0, 0.5, 0.15) * ring * 1.3;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// the dome: dark cave ceiling stone, then a burning war sky with smoke
function skyMat() {
  return new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    uniforms: { uEat: { value: 0 }, uWar: { value: 0 }, uT: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uEat, uWar, uT; varying vec3 vW;
      ${NOISE}
      void main() {
        vec3 dir = normalize(vW - cameraPosition + vec3(0.0, 0.0001, 0.0));
        float y = clamp(dir.y, -0.2, 1.0);
        float az = atan(dir.x, dir.z + 0.0001);
        vec2 q = vec2(az * 3.0, y * 5.0);
        // cave
        vec3 c = mix(vec3(0.07, 0.4, 0.55), vec3(0.2, 0.12, 0.5), smoothstep(0.0, 0.3, y));
        c = mix(c, vec3(0.1, 0.04, 0.26), smoothstep(0.25, 0.9, y));
        c *= 0.55 + 0.9 * fbm(q * 1.6);
        c += vec3(0.3, 0.9, 1.0) * smoothstep(0.78, 0.95, fbm(q * 3.0 + 5.0)) * 0.4;
        float sp = step(0.975, h21(floor(vec2(az * 40.0, y * 60.0)))) * (0.5 + 0.5 * h21(floor(vec2(az * 40.0, y * 60.0)) + 3.0));
        c += mix(vec3(0.5, 1.0, 1.0), vec3(1.0, 0.6, 1.0), h21(vec2(az, y))) * sp;
        // war sky: a burning horizon, smoke rolling in rust and soot
        vec3 w = mix(vec3(1.0, 0.45, 0.12), vec3(0.62, 0.14, 0.1), smoothstep(0.0, 0.22, y));
        w = mix(w, vec3(0.2, 0.05, 0.09), smoothstep(0.18, 0.7, y));
        float sm = fbm(vec2(az * 2.2 + uT * 0.03, y * 3.2 - uT * 0.02) * 1.5);
        w = mix(w, vec3(0.06, 0.03, 0.04), smoothstep(0.35, 0.8, sm) * (0.25 + 0.7 * smoothstep(0.05, 0.5, y)));
        w += vec3(1.0, 0.5, 0.12) * smoothstep(0.55, 0.9, fbm(vec2(az * 6.0, y * 14.0 - uT * 0.1))) * smoothstep(0.35, 0.0, y) * 0.5;
        c = mix(c, w, uWar);
        // reality eaten
        float d = acos(clamp(dot(dir, normalize(vec3(0.0, 0.25, -1.0))), -1.0, 1.0));
        float rr = uEat * 3.6;
        float ang = atan(dir.y - 0.25, dir.x + 0.0001);
        float arms = 0.5 + 0.5 * sin(ang * 3.0 + d * 9.0 - uEat * 14.0);
        float inside = 1.0 - smoothstep(rr - 0.5, rr, d);
        float edge = smoothstep(rr - 0.9, rr - 0.3, d) * inside;
        c = mix(c, vec3(0.03, 0.0, 0.07) + vec3(0.7, 0.1, 0.9) * arms * edge * 0.8, inside);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

// ------------------------------------------------------------------ the painted battlefield panorama
const TAU = Math.PI * 2;
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}
// draw f(dx) at x and, if it crosses the seam, again wrapped, so the panorama tiles round
const wrapDraw = (W, x, span, f) => {
  f(x);
  if (x < span) f(x + W);
  if (x > W - span) f(x - W);
};
// a soldier silhouette: legs, tabard, pauldron, helm, spear and shield; (x, base y), height h
function soldier(g, x, y, h, body, rim, flag, kind, k) {
  const w = h * 0.34;
  g.lineWidth = Math.max(1, h * 0.05);
  g.strokeStyle = body;
  g.fillStyle = body;
  // spear
  const lean = (hash(k, 11) - 0.5) * 0.22;
  g.beginPath();
  g.moveTo(x + w * 0.9, y);
  g.lineTo(x + w * 0.9 + Math.sin(lean) * h * 1.7, y - h * 1.7);
  g.stroke();
  g.beginPath();
  const tx = x + w * 0.9 + Math.sin(lean) * h * 1.7;
  g.moveTo(tx, y - h * 1.78);
  g.lineTo(tx - h * 0.05, y - h * 1.66);
  g.lineTo(tx + h * 0.05, y - h * 1.66);
  g.fill();
  // legs and tabard
  g.fillRect(x - w * 0.42, y - h * 0.42, w * 0.34, h * 0.42);
  g.fillRect(x + w * 0.08, y - h * 0.42, w * 0.34, h * 0.42);
  g.beginPath();
  g.moveTo(x - w * 0.55, y - h * 0.38);
  g.lineTo(x + w * 0.55, y - h * 0.38);
  g.lineTo(x + w * 0.42, y - h * 0.82);
  g.lineTo(x - w * 0.42, y - h * 0.82);
  g.fill();
  g.beginPath();
  g.arc(x, y - h * 0.9, h * 0.11, 0, TAU);
  g.fill();
  if (kind === 0) {
    g.beginPath(); // helm crest
    g.moveTo(x - h * 0.02, y - h);
    g.lineTo(x, y - h * 1.12);
    g.lineTo(x + h * 0.06, y - h * 0.99);
    g.fill();
  } else {
    g.beginPath(); // horned
    g.moveTo(x - h * 0.09, y - h * 0.95);
    g.lineTo(x - h * 0.15, y - h * 1.1);
    g.lineTo(x - h * 0.03, y - h * 1.0);
    g.moveTo(x + h * 0.09, y - h * 0.95);
    g.lineTo(x + h * 0.15, y - h * 1.1);
    g.lineTo(x + h * 0.03, y - h * 1.0);
    g.fill();
  }
  if (hash(k, 12) > 0.45) {
    g.beginPath();
    g.ellipse(x - w * 0.55, y - h * 0.55, w * 0.32, h * 0.22, 0, 0, TAU);
    g.fill();
    g.strokeStyle = flag;
    g.lineWidth = Math.max(1, h * 0.04);
    g.stroke();
  }
  // the fire-lit edge on the side facing the burning horizon
  g.strokeStyle = rim;
  g.lineWidth = Math.max(1, h * 0.04);
  g.beginPath();
  g.moveTo(x + w * 0.5, y - h * 0.8);
  g.lineTo(x + w * 0.42, y - h * 0.38);
  g.moveTo(x + h * 0.08, y - h * 0.97);
  g.lineTo(x + h * 0.1, y - h * 0.84);
  g.stroke();
}
function banner(g, x, y, h, col, trim, k) {
  g.strokeStyle = "#1a0e0e";
  g.lineWidth = Math.max(2, h * 0.025);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - h);
  g.stroke();
  g.fillStyle = col;
  g.beginPath();
  const fw = h * 0.42;
  const fh = h * 0.3;
  g.moveTo(x, y - h);
  for (let i = 0; i <= 8; i++) g.lineTo(x + (fw * i) / 8, y - h + Math.sin(i * 0.9 + k) * h * 0.02 + (i / 8) * h * 0.03);
  g.lineTo(x + fw * 0.82, y - h + fh * 0.55);
  g.lineTo(x + fw, y - h + fh);
  for (let i = 8; i >= 0; i--) g.lineTo(x + (fw * i) / 8, y - h + fh + Math.sin(i * 0.9 + k) * h * 0.02);
  g.closePath();
  g.fill();
  g.strokeStyle = trim;
  g.lineWidth = Math.max(1, h * 0.012);
  g.stroke();
  g.fillStyle = trim;
  g.fillRect(x + fw * 0.2, y - h + fh * 0.4, fw * 0.5, Math.max(2, h * 0.025)); // a crest bar
}

function panoLayer({ W, H, R, hgt, y0, build }) {
  const [c, g] = canvas(W, H);
  build(g, W, H);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: BackSide,
    uniforms: { uMap: { value: tex }, uK: { value: 1 }, uTint: { value: new Color("#ffffff") } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform sampler2D uMap; uniform float uK; uniform vec3 uTint; varying vec2 vUv;
      void main(){ vec4 t = texture2D(uMap, vUv); gl_FragColor = vec4(t.rgb * uTint, t.a * uK); }`,
  });
  const geo = new CylinderGeometry(R, R, hgt, 96, 1, true);
  const o = mesh(mat, geo);
  o.position.y = y0 + hgt / 2;
  return { mesh: o, mat, tex, dispose: () => (geo.dispose(), mat.dispose(), tex.dispose()) };
}

// far: burning horizon, three ranges of mountains, volcanic fires, smoke columns
function paintFar(g, W, H) {
  const base = H * 0.93;
  const glow = g.createLinearGradient(0, base - H * 0.55, 0, base);
  glow.addColorStop(0, "rgba(255,120,30,0)");
  glow.addColorStop(0.7, "rgba(255,110,30,0.32)");
  glow.addColorStop(1, "rgba(255,190,80,0.85)");
  g.fillStyle = glow;
  g.fillRect(0, base - H * 0.55, W, H * 0.55 + 4);
  // smoke columns behind the ranges, leaning in the wind
  for (let i = 0; i < 17; i++) {
    const x = hash(i, 21) * W;
    const hh = H * (0.5 + 0.45 * hash(i, 22));
    for (let s = 0; s < 70; s++) {
      const t = s / 70;
      const r = (10 + t * 62) * (0.7 + 0.5 * hash(i * 70 + s, 23));
      const xx = x + t * 90 + Math.sin(t * 5 + i) * 18 * t;
      const yy = base - 10 - t * hh;
      wrapDraw(W, xx, r + 4, (px) => {
        const gr = g.createRadialGradient(px, yy, 0, px, yy, r);
        const a = 0.34 * (1 - t * 0.55);
        const warm = Math.max(0, 1 - t * 2.2);
        gr.addColorStop(0, `rgba(${Math.round(40 + 190 * warm)},${Math.round(24 + 60 * warm)},${Math.round(22 + 10 * warm)},${a})`);
        gr.addColorStop(1, "rgba(30,18,20,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.arc(px, yy, r, 0, TAU);
        g.fill();
      });
    }
  }
  // mountain ranges: periodic ridges so the panorama closes
  const ranges = [
    { h: 0.34, col: ["#9a3d22", "#4a1818"], a: 0.9, amp: 0.1, f: 5 },
    { h: 0.24, col: ["#5a2020", "#2a0f16"], a: 1, amp: 0.1, f: 8 },
    { h: 0.14, col: ["#2b1118", "#13080d"], a: 1, amp: 0.07, f: 13 },
  ];
  ranges.forEach((rg, ri) => {
    const grd = g.createLinearGradient(0, base - H * (rg.h + rg.amp), 0, base);
    grd.addColorStop(0, rg.col[0]);
    grd.addColorStop(1, rg.col[1]);
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, base + 6);
    for (let x = 0; x <= W; x += 8) {
      const u = (x / W) * TAU;
      const peak = Math.abs(Math.sin(u * rg.f + ri * 1.7)) * 0.6 + Math.abs(Math.sin(u * rg.f * 2.3 + ri)) * 0.3 + Math.sin(u * rg.f * 5.1) * 0.1;
      g.lineTo(x, base - H * (rg.h + rg.amp * peak));
    }
    g.lineTo(W, base + 6);
    g.closePath();
    g.globalAlpha = rg.a;
    g.fill();
    g.globalAlpha = 1;
    // ridge lines catch the fire
    g.strokeStyle = ri === 0 ? "rgba(255,150,60,0.5)" : "rgba(255,110,40,0.28)";
    g.lineWidth = 2;
    g.stroke();
    // strata hatching on the slopes
    g.strokeStyle = "rgba(0,0,0,0.18)";
    g.lineWidth = 1;
    for (let k = 0; k < 420; k++) {
      const x = hash(k, 30 + ri) * W;
      const y = base - H * rg.h * hash(k, 40 + ri) * 0.9;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 14 + 20 * hash(k, 50), y + 4 + 10 * hash(k, 51));
      g.stroke();
    }
  });
  // fires on the slopes
  for (let k = 0; k < 90; k++) {
    const x = hash(k, 60) * W;
    const y = base - H * (0.03 + 0.2 * hash(k, 61));
    const r = 4 + 12 * hash(k, 62);
    wrapDraw(W, x, r * 3, (px) => {
      const gr = g.createRadialGradient(px, y, 0, px, y, r * 3);
      gr.addColorStop(0, "rgba(255,230,140,0.95)");
      gr.addColorStop(0.3, "rgba(255,120,30,0.6)");
      gr.addColorStop(1, "rgba(255,60,10,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(px, y, r * 3, 0, TAU);
      g.fill();
    });
  }
}

// mid: the two armies in ranks with banners
function paintMid(g, W, H) {
  const ground = H * 0.9;
  const haze = (r) => `rgba(255,${120 + r * 8},${40 + r * 6},0.4)`;
  // churned ground strip and the dust of marching
  const dust = g.createLinearGradient(0, ground - H * 0.28, 0, ground);
  dust.addColorStop(0, "rgba(200,90,40,0)");
  dust.addColorStop(1, "rgba(120,50,30,0.55)");
  g.fillStyle = dust;
  g.fillRect(0, ground - H * 0.28, W, H * 0.28);
  const ranks = 7;
  let n = 0;
  for (let r = 0; r < ranks; r++) {
    const kk = r / (ranks - 1);
    const h = 14 + kk * 26;
    const y = ground - (1 - kk) * H * 0.2 + 2;
    const step = h * 0.42;
    for (let x = 0; x < W; x += step) {
      n++;
      const xx = x + hash(n, 71) * step * 0.6;
      const u = xx / W;
      // the Falmuth host (silver, blue and white) fills one half; Tempest (black, violet and red) the other
      const falmuth = u < 0.5 ? hash(n, 72) > 0.12 : hash(n, 72) > 0.9;
      const fade = 0.55 + 0.45 * kk;
      const body = falmuth ? `rgb(${Math.round(70 * fade)},${Math.round(76 * fade)},${Math.round(96 * fade)})` : `rgb(${Math.round(30 * fade)},${Math.round(16 * fade)},${Math.round(44 * fade)})`;
      const flag = falmuth ? "#cfd6e8" : "#8a3fd0";
      if (hash(n, 73) > 0.07 || (u > 0.46 && u < 0.54)) soldier(g, xx, y - hash(n, 74) * 5, h * (0.9 + 0.2 * hash(n, 75)), body, haze(r), flag, falmuth ? 0 : 1, n);
    }
    // banners rise above the ranks
    for (let b = 0; b < 12; b++) {
      const x = ((b + hash(r * 20 + b, 76) * 0.8) / 12) * W;
      const u = x / W;
      const falmuth = u < 0.5;
      banner(g, x, y, h * (3 + hash(b, 77) * 1.6), falmuth ? (b % 2 ? "#e9edf8" : "#2c4fb0") : b % 2 ? "#2a0f3a" : "#7a1018", falmuth ? "#d4aa3a" : "#c08af0", b + r);
    }
  }
}

// near: a few huge dark soldiers and broken standards in the foreground
function paintNear(g, W, H) {
  const ground = H * 0.94;
  const mud = g.createLinearGradient(0, ground - H * 0.1, 0, H);
  mud.addColorStop(0, "rgba(20,10,8,0)");
  mud.addColorStop(1, "rgba(14,7,6,0.95)");
  g.fillStyle = mud;
  g.fillRect(0, ground - H * 0.1, W, H * 0.1 + 8);
  for (let k = 0; k < 34; k++) {
    const x = hash(k, 81) * W;
    const h = 62 + 70 * hash(k, 82);
    const falmuth = hash(k, 83) > 0.5;
    wrapDraw(W, x, h * 2, (px) => soldier(g, px, ground + 6 * hash(k, 84), h, falmuth ? "#1a1b26" : "#0e0716", "rgba(255,150,60,0.9)", falmuth ? "#aeb8d8" : "#7a3ab8", falmuth ? 0 : 1, k + 200));
  }
  for (let k = 0; k < 9; k++) {
    const x = hash(k, 85) * W;
    banner(g, x, ground + 10, 230 + 90 * hash(k, 86), k % 2 ? "#161a2e" : "#240a14", k % 2 ? "#c0a040" : "#9a5ae0", k);
  }
}

// ------------------------------------------------------------------ the army: instanced soldiers, standards, smoke, Megiddo
function armyParts(mat) {
  const L = layer();
  const W = "#ffffff";
  L.add(new CylinderGeometry(0.2, 0.26, 0.9, 7).translate(0, 0.45, 0), W, {}, 0, 0, 0);
  L.add(new CylinderGeometry(0.3, 0.36, 0.55, 7).translate(0, 1.15, 0), W, {}, 0, 0, 0);
  L.add(new SphereGeometry(0.17, 8, 6), "#3a2a28", {}, 0, 1.62, 0);
  L.add(new ConeGeometry(0.19, 0.22, 7), W, {}, 0, 1.8, 0);
  L.add(new CylinderGeometry(0.018, 0.018, 2.5, 5).translate(0, 1.25, 0), "#2a1a12", {}, 0.34, 0.1, 0.1);
  L.add(new ConeGeometry(0.05, 0.22, 5), "#d8d8e0", {}, 0.34, 2.45, 0.1);
  const geo = L.build();
  const N = 1500;
  const im = new InstancedMesh(geo, mat, N);
  im.frustumCulled = false;
  const D = new Object3D();
  const c = new Color();
  const pal = ["#4d566e", "#7a2a22", "#3c4560", "#8a90a4", "#241437", "#3a1c66", "#150c20", "#5a1018"];
  for (let i = 0; i < N; i++) {
    // two hosts facing across the plain, deep into -z (the camera looks that way)
    const side = hash(i, 91) < 0.5;
    const zz = -22 - 50 * Math.pow(hash(i, 92), 0.8);
    const xx = (side ? -1 : 1) * (3 + 40 * hash(i, 93)) * (0.5 + 0.02 * -zz);
    const rank = Math.round(zz / 1.6) * 1.6;
    D.position.set(xx + (hash(i, 94) - 0.5) * 0.8, 0, rank + (hash(i, 95) - 0.5) * 0.5);
    D.rotation.set(0, side ? -1.2 + hash(i, 96) * 0.3 : 1.2 - hash(i, 96) * 0.3, 0);
    const s = 0.9 + 0.3 * hash(i, 97);
    D.scale.set(s, s, s);
    D.updateMatrix();
    im.setMatrixAt(i, D.matrix);
    im.setColorAt(i, c.set(pal[(side ? 0 : 4) + Math.floor(hash(i, 98) * 4)]));
  }
  im.instanceColor.needsUpdate = true;
  const bl = layer();
  bl.add(new CylinderGeometry(0.05, 0.05, 6.5, 5).translate(0, 3.25, 0), "#2b1a12", {}, 0, 0, 0);
  bl.add(new PlaneGeometry(1.5, 2.2).translate(0.75, 5.1, 0), W, {}, 0, 0, 0);
  bl.add(new CylinderGeometry(0.1, 0.1, 0.05, 6).rotateX(Math.PI / 2), "#ffd23a", { kind: KIND.glow, noEdge: true }, 0.75, 5.2, 0.02);
  const bgeo = bl.build();
  const B = 46;
  const bm = new InstancedMesh(bgeo, mat, B);
  bm.frustumCulled = false;
  for (let i = 0; i < B; i++) {
    const side = i % 2 === 0;
    D.position.set((side ? -1 : 1) * (6 + 34 * hash(i, 101)), 0, -18 - 46 * hash(i, 102));
    D.rotation.set(0, (hash(i, 103) - 0.5) * 0.6 + (side ? 0 : Math.PI), 0);
    const s = 0.9 + 0.5 * hash(i, 104);
    D.scale.setScalar(s);
    D.updateMatrix();
    bm.setMatrixAt(i, D.matrix);
    bm.setColorAt(i, c.set(side ? (i % 4 === 0 ? "#243c88" : "#a8b0c8") : i % 4 === 1 ? "#6a1018" : "#47268a"));
  }
  bm.instanceColor.needsUpdate = true;
  return { im, bm, dispose: () => (geo.dispose(), bgeo.dispose(), im.dispose(), bm.dispose()) };
}

function smokeMat() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uT, uK; varying vec2 vUv; varying vec3 vW;
      ${NOISE}
      void main() {
        float y = vUv.y;
        float n = fbm(vec2(vUv.x * 9.0 + vW.x * 0.07, y * 5.0 - uT * 0.35));
        float body = smoothstep(0.35, 0.75, n) * (1.0 - smoothstep(0.55, 1.0, y)) * smoothstep(0.0, 0.08, y);
        vec3 c = mix(vec3(1.0, 0.45, 0.1), vec3(0.09, 0.06, 0.07), smoothstep(0.0, 0.45, y + n * 0.2));
        gl_FragColor = vec4(c, body * 0.82 * uK);
      }`,
  });
}

function beamMat() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uK: { value: 1 }, uT: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uK, uT; varying vec2 vUv;
      void main() {
        float a = 1.0 - abs(vUv.x * 2.0 - 1.0);
        float s = 0.7 + 0.3 * sin(vUv.y * 60.0 + uT * 40.0);
        float grow = smoothstep(0.0, 0.06, vUv.y);
        vec3 c = mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.97, 0.7), a * a * a);
        gl_FragColor = vec4(c * a * a * s * uK * 1.4 * grow, 1.0);
      }`,
  });
}

export function battlefield(mat) {
  const root = new Group();
  const far = panoLayer({ W: 4096, H: 1024, R: 95, hgt: 64, y0: -4, build: paintFar });
  const mid = panoLayer({ W: 4096, H: 512, R: 52, hgt: 24, y0: -2, build: paintMid });
  const near = panoLayer({ W: 4096, H: 512, R: 30, hgt: 16, y0: -1.2, build: paintNear });
  far.mesh.renderOrder = -8;
  mid.mesh.renderOrder = -7;
  near.mesh.renderOrder = -6;
  const army = armyParts(mat);
  const sm = smokeMat();
  const smokeGeo = new CylinderGeometry(7, 3, 38, 18, 1, true).translate(0, 19, 0);
  const columns = [];
  for (let i = 0; i < 7; i++) {
    const m = mesh(sm, smokeGeo);
    const a = Math.PI + (hash(i, 111) - 0.5) * 2.4;
    const r = 28 + 22 * hash(i, 112);
    m.position.set(Math.sin(a) * r, 0, Math.cos(a) * r);
    m.scale.set(0.8 + hash(i, 113), 0.9 + 0.6 * hash(i, 114), 0.8 + hash(i, 113));
    m.renderOrder = -5;
    columns.push(m);
    root.add(m);
  }
  const bm = beamMat();
  const bgeo = new PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const beams = [];
  for (let i = 0; i < 11; i++) {
    const grp = new Group();
    const a = new Mesh(bgeo, bm);
    const b = new Mesh(bgeo, bm);
    b.rotation.y = Math.PI / 2;
    a.frustumCulled = b.frustumCulled = false;
    grp.add(a, b);
    grp.position.set((hash(i, 121) - 0.5) * 34, 0, -9 - 30 * hash(i, 122));
    grp.rotation.z = (hash(i, 123) - 0.5) * 0.22;
    grp.renderOrder = 6;
    root.add(grp);
    beams.push(grp);
  }
  const spotMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uK: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uK; varying vec2 vUv; void main(){ float k = 1.0 - smoothstep(0.0, 1.0, length(vUv * 2.0 - 1.0)); gl_FragColor = vec4(vec3(1.0, 0.65, 0.2) * k * k * uK * 1.6, 1.0); }`,
  });
  const spotGeo = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  const spots = beams.map((b) => {
    const s = new Mesh(spotGeo, spotMat);
    s.position.set(b.position.x, 0.25, b.position.z);
    s.frustumCulled = false;
    root.add(s);
    return s;
  });
  root.add(far.mesh, mid.mesh, near.mesh, army.im, army.bm);
  root.visible = false;
  return {
    root,
    // k: how far the war has opened; rain: how far Megiddo has built; fade: 1 whole, 0 eaten
    update(t, k, rain, fade) {
      root.visible = k > 0.01 && fade > 0.01;
      for (const l of [far, mid, near]) l.mat.uniforms.uK.value = k * fade;
      sm.uniforms.uT.value = t;
      sm.uniforms.uK.value = k * fade;
      bm.uniforms.uT.value = t;
      bm.uniforms.uK.value = fade * (0.85 + 0.15 * Math.sin(t * 21));
      spotMat.uniforms.uK.value = fade * (0.8 + 0.2 * Math.sin(t * 17));
      army.im.visible = army.bm.visible = k > 0.5;
      const s = Math.max(0.001, fade);
      root.scale.set(s, s, s);
      beams.forEach((b, i) => {
        const on = Math.max(0, Math.min(1, (rain - i * 0.06) / 0.25));
        b.visible = spots[i].visible = on > 0.01;
        const w = 0.9 + 1.2 * hash(i, 124);
        b.scale.set(w * on, 55 * on, w * on);
        spots[i].scale.setScalar(Math.max(0.001, (2.2 + 1.4 * hash(i, 125)) * on));
      });
    },
    dispose() {
      far.dispose();
      mid.dispose();
      near.dispose();
      army.dispose();
      smokeGeo.dispose();
      sm.dispose();
      bgeo.dispose();
      bm.dispose();
      spotGeo.dispose();
      spotMat.dispose();
    },
  };
}

// ------------------------------------------------------------------ the cave as one piece
export function caveWorld() {
  const { geo: cg, lights } = crystalGeo();
  const lightVecs = Array.from({ length: LIGHTS }, (_, i) => (lights[i] ? new Vector4(lights[i][0], lights[i][1], lights[i][2], lights[i][3]) : new Vector4()));
  const cm = crystalMat();
  const rm = rockMat();
  const fm = floorMat(lightVecs);
  const crystals = mesh(cm, cg);
  const sg = stalactiteGeo();
  const stal = mesh(rm, sg);
  const wallGeo = new CylinderGeometry(36, 40, CEIL, 40, 6, true).translate(0, CEIL / 2, 0);
  const wall = mesh(rm, wallGeo);
  const floorGeo = new CircleGeometry(95, 80).rotateX(-Math.PI / 2);
  const floor = mesh(fm, floorGeo);
  const sky = skyMat();
  const dome = new SphereGeometry(150, 32, 20);
  const skyMesh = mesh(sky, dome);
  skyMesh.renderOrder = -10;
  const root = new Group();
  root.add(skyMesh, floor, wall, stal, crystals);
  return {
    root,
    floor,
    // war: the cave has broken open 0..1; gone: the whole thing eaten 0..1; eat: the sky's void
    update(t, war, gone, eat) {
      cm.uniforms.uT.value = t;
      fm.uniforms.uT.value = t;
      rm.uniforms.uT.value = t;
      cm.uniforms.uDis.value = war * 1.0;
      rm.uniforms.uDis.value = war * 1.0;
      fm.uniforms.uWarR.value = war * 96;
      sky.uniforms.uWar.value = war;
      sky.uniforms.uT.value = t;
      sky.uniforms.uEat.value = eat;
      const s = Math.max(0.001, 1 - gone);
      floor.visible = gone < 0.995;
      floor.scale.set(s, 1, s);
      floor.rotation.y = gone * 7;
      floor.position.y = -gone * 6;
      const caveOn = war < 0.995;
      wall.visible = stal.visible = crystals.visible = caveOn;
    },
    dispose() {
      cg.dispose();
      sg.dispose();
      wallGeo.dispose();
      floorGeo.dispose();
      dome.dispose();
      cm.dispose();
      rm.dispose();
      fm.dispose();
      sky.dispose();
    },
  };
}
