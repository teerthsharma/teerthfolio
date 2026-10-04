// THE SPEEDWAY, as meshes, in the track's own frame: x runs along the near
// straight (the car heads -x), z toward the lens, y up. A sunset sky dome, the
// desert and the oval (a stadium of asphalt with red-and-white kerbs, lane
// dashes and a chequered finish), five grandstands (concrete tiers, roofs,
// columns, ad boards) with an instanced cheering crowd that waves and bobs in
// the vertex shader, chequered flags snapping on poles, the finish gantry
// and its banner, tyre walls, rocks, and the red mesas. Everything shares the
// glossy sunset shader (shade.js). Nothing allocates per frame.

import { BoxGeometry, BufferGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { LIGHT, SKY, hash, lightUniforms, merge, paint, rgb, solid } from "./shade";

export const FINISH_X = -98; // where the chequered line is, along the straight
export const TRACK_Z = -6; // the straight's centre line
export const HALF = 8; // half the track's width
const STRAIGHT = [112, -205]; // x of the near straight's two ends
const TURN_R = 80;
const u = (v) => ({ value: v });

// ---- sky -------------------------------------------------------------------

export function skyDome() {
  const g = new SphereGeometry(1, 40, 20);
  const m = new ShaderMaterial({
    uniforms: { ...lightUniforms(), uInside: u(0) },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: "varying vec3 vD; varying vec3 vN; varying vec3 vW; void main(){ vD = position; vN = normalize(mat3(modelMatrix) * position); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uInside;
      varying vec3 vD; varying vec3 vN; varying vec3 vW;
      ${SKY}
      void main() {
        vec3 d = normalize(vD);
        vec3 c = d.y < 0.0 ? hazeCol(d) : skyCol(d);
        float alpha = 1.0;
        if (gl_FrontFacing && uInside < 0.5) {
          // seen from outside while it swells: a bubble of sunset, glassy at its middle, gold at its rim
          vec3 v = normalize(cameraPosition - vW);
          float f = pow(1.0 - abs(dot(normalize(vN), v)), 2.0);
          c += f * vec3(1.0, 0.72, 0.3) * 0.7;
          alpha = mix(0.3, 1.0, f);
        }
        gl_FragColor = vec4(pow(c, vec3(2.2)), alpha);
      }`,
  });
  return { g, m };
}

// ---- desert and oval ---------------------------------------------------------

export function desert() {
  const g = new PlaneGeometry(1000, 560).rotateX(-Math.PI / 2).translate(-60, -0.03, -190);
  const m = new ShaderMaterial({
    uniforms: lightUniforms(),
    vertexShader: "varying vec3 vP; varying vec3 vW; void main(){ vP = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      varying vec3 vP; varying vec3 vW;
      ${SKY}
      ${LIGHT}
      void main() {
        vec2 q = vP.xz;
        float n1 = sFbm(q * 0.05);
        float n2 = sFbm(q * 0.4 + 7.0);
        // warm sand, a redder dust in the hollows, long ripples across the dunes
        vec3 c = mix(vec3(0.95, 0.68, 0.4), vec3(0.88, 0.5, 0.28), smoothstep(0.35, 0.75, n1));
        c = mix(c, vec3(1.0, 0.82, 0.55), smoothstep(0.55, 0.9, n2) * 0.35);
        c *= 0.93 + 0.1 * sin(q.x * 0.35 + n1 * 9.0) * sin(q.y * 0.2);
        vec3 col = lit(c, vec3(0.0, 1.0, 0.0), vW, 0.0, 0.0, 0.0052);
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
  return { g, m };
}

// the oval's centre line: arc length s from the near straight's right end, running -x, round the far turn and home
function ovalPoint(s) {
  const a = STRAIGHT[0] - STRAIGHT[1]; // straight length
  const arc = Math.PI * TURN_R;
  const total = 2 * (a + arc);
  s = ((s % total) + total) % total;
  const cz = TRACK_Z - TURN_R;
  if (s < a) return [STRAIGHT[0] - s, TRACK_Z, -1, 0];
  s -= a;
  if (s < arc) {
    const t = s / TURN_R; // turning left (to +z negative)
    return [STRAIGHT[1] - Math.sin(t) * TURN_R, cz + Math.cos(t) * TURN_R, -Math.cos(t), Math.sin(t)];
  }
  s -= arc;
  if (s < a) return [STRAIGHT[1] + s, TRACK_Z - 2 * TURN_R, 1, 0];
  s -= a;
  const t = s / TURN_R;
  return [STRAIGHT[0] + Math.sin(t) * TURN_R, cz - Math.cos(t) * TURN_R, Math.cos(t), -Math.sin(t)];
}

export function oval() {
  const N = 220;
  const pos = [];
  const uv = [];
  const idx = [];
  const total = 2 * (STRAIGHT[0] - STRAIGHT[1] + Math.PI * TURN_R);
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * total;
    const p = ovalPoint(s);
    const q = ovalPoint(s + 0.01);
    const dx = q[0] - p[0];
    const dz = q[1] - p[1];
    const l = Math.hypot(dx, dz) || 1;
    // left of travel (the side toward the lens on the near straight is +z): v in [-HALF, HALF]
    for (const v of [-HALF - 3, -HALF, HALF, HALF + 3]) {
      pos.push(p[0] + (dz / l) * v * -1, 0.02, p[1] + (dx / l) * v);
      uv.push(s, v);
    }
    if (i > 0) for (let k = 0; k < 3; k++) {
      const a = (i - 1) * 4 + k;
      idx.push(a, a + 1, a + 4, a + 1, a + 5, a + 4);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("aUV", new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const m = new ShaderMaterial({
    uniforms: { ...lightUniforms(), uFin: u((STRAIGHT[0] - FINISH_X)) },
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    vertexShader: "attribute vec2 aUV; varying vec2 vUV; varying vec3 vW; void main(){ vUV = aUV; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      uniform float uFin;
      varying vec2 vUV; varying vec3 vW;
      ${SKY}
      ${LIGHT}
      void main() {
        float s = vUV.x, v = vUV.y, av = abs(v);
        // asphalt: warm blue-grey, speckled, with dark rubber laid down the racing lines
        vec3 c = vec3(0.34, 0.33, 0.4) * (0.92 + 0.14 * sNoise(vec2(s * 0.9, v * 3.0)));
        c *= 1.0 - 0.28 * smoothstep(0.55, 0.9, sFbm(vec2(s * 0.08, v * 0.9))) * smoothstep(5.2, 3.0, av);
        c = mix(c, vec3(0.22, 0.21, 0.26), smoothstep(0.4, 0.0, abs(av - 3.4)) * 0.4 * sNoise(vec2(s * 0.3, v)));
        // lane dashes, a solid edge line, the red and white kerbs, the sand beyond
        float dash = step(0.0, sin(s * 0.7853)) ;
        c = mix(c, vec3(1.0, 0.95, 0.8), smoothstep(0.1, 0.05, abs(av - 2.6)) * dash);
        c = mix(c, vec3(0.97, 0.95, 0.9), smoothstep(0.14, 0.08, abs(av - 6.9)));
        if (av > 7.3 && av < 8.0) c = mod(floor(s / 1.6), 2.0) < 1.0 ? vec3(0.95, 0.16, 0.14) : vec3(0.98, 0.97, 0.94);
        if (av >= 8.0) c = mix(vec3(0.95, 0.68, 0.4), vec3(0.88, 0.5, 0.28), 0.4);
        // the chequered finish: two rows of squares, 1.2 m a side
        float fd = abs(s - uFin);
        if (fd < 1.2 && av < 8.0) c = mod(floor((s - uFin + 1.2) / 0.6) + floor((v + 8.0) / 0.8), 2.0) < 1.0 ? vec3(0.08, 0.07, 0.1) : vec3(0.98, 0.97, 0.94);
        vec3 col = lit(c, vec3(0.0, 1.0, 0.0), vW, 0.5, 0.3, 0.0052);
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
  return { g, m };
}

// ---- the grandstands -----------------------------------------------------------

export const BLOCKS = [-166, -118, -70, -22, 26]; // x of each block's left end
export const BLOCK_LEN = 44;
const ZF = -24; // the stands' front edge
const TIER = [0.7, 1.25]; // a tier's rise and run
const TIERS = 6;

export function stands() {
  const L = [];
  const concrete = "#d9cfc4";
  for (const x0 of BLOCKS) {
    const cx = x0 + BLOCK_LEN / 2;
    for (let k = 0; k < TIERS; k++) {
      const h = TIER[0] * (k + 1);
      L.push(paint(new BoxGeometry(BLOCK_LEN, h, TIER[1]), concrete, { gloss: 0.15, m4: new Matrix4().makeTranslation(cx, h / 2, ZF - TIER[1] * (k + 0.5)) }));
      // the bench, one colour for the block, a lighter tip at the front
      L.push(paint(new BoxGeometry(BLOCK_LEN, 0.1, 0.5), k % 2 ? "#e8483a" : "#3b6fd8", { gloss: 0.5, m4: new Matrix4().makeTranslation(cx, h + 0.05, ZF - TIER[1] * (k + 0.5) + 0.35) }));
    }
    const back = ZF - TIER[1] * TIERS - 0.3;
    L.push(paint(new BoxGeometry(BLOCK_LEN, 6.4, 0.5), "#c8b9a8", { gloss: 0.1, m4: new Matrix4().makeTranslation(cx, 3.2, back) }));
    // roof: slats of red and cream, tilted, with a fascia
    for (let i = 0; i < 11; i++) L.push(paint(new BoxGeometry(BLOCK_LEN / 11 - 0.04, 0.3, 10.6), i % 2 ? "#e23a2e" : "#fff0d8", { gloss: 0.7, m4: new Matrix4().makeTranslation(x0 + (i + 0.5) * (BLOCK_LEN / 11), 6.4, ZF - 2.8).multiply(new Matrix4().makeRotationX(0.1)) }));
    L.push(paint(new BoxGeometry(BLOCK_LEN, 0.7, 0.3), "#2a58c9", { gloss: 0.8, m4: new Matrix4().makeTranslation(cx, 6.2, ZF + 2.6) }));
    for (let i = 0; i <= 4; i++) L.push(paint(new CylinderGeometry(0.2, 0.2, 6.4, 8), "#fbf5ea", { gloss: 0.6, smooth: true, m4: new Matrix4().makeTranslation(x0 + (i * BLOCK_LEN) / 4, 3.2, ZF + 2.2) }));
    // the front barrier with ad boards: plain bands of colour (no marks)
    const hue = ["#ffcf3d", "#f0502f", "#2fb3d3", "#ff8ab0", "#7bd64a"];
    for (let i = 0; i < 8; i++) {
      L.push(paint(new BoxGeometry(BLOCK_LEN / 8 - 0.12, 1.15, 0.22), hue[Math.abs(i + Math.round(x0 / 48)) % 5], { gloss: 0.6, m4: new Matrix4().makeTranslation(x0 + (i + 0.5) * (BLOCK_LEN / 8), 0.6, ZF + 0.5) }));
      L.push(paint(new BoxGeometry(BLOCK_LEN / 8 - 0.12, 0.22, 0.26), "#fffaf0", { gloss: 0.6, m4: new Matrix4().makeTranslation(x0 + (i + 0.5) * (BLOCK_LEN / 8), 1.28, ZF + 0.5) }));
    }
  }
  return merge(L);
}

// the crowd: persons on tiers 1..4, instance data for a body, a head and two arms
const ROWS = [1, 2, 3, 4];
export function crowdData() {
  const list = [];
  const shirts = ["#f04a3a", "#ffd23a", "#2f7be8", "#fffaf0", "#ff8ab0", "#3bc4a0", "#ff8a2a", "#8f5be8"];
  const skins = ["#f6c9a0", "#e2a275", "#bf7d50", "#8e5a38", "#f2d7bd", "#6b4129"];
  let i = 0;
  for (const x0 of BLOCKS) {
    for (const k of ROWS) {
      const n = Math.floor(BLOCK_LEN / 1.3);
      for (let j = 0; j < n; j++, i++) {
        const x = x0 + 0.7 + j * (BLOCK_LEN / n) + (hash(i, 1) - 0.5) * 0.35;
        const y = TIER[0] * (k + 1) + 0.1;
        const z = ZF - TIER[1] * (k + 0.5) + 0.05;
        list.push({ x, y, z, s: 0.9 + 0.3 * hash(i, 2), ph: hash(i, 3) * 6.283, ex: 0.55 + 0.45 * hash(i, 4), shirt: shirts[Math.floor(hash(i, 5) * shirts.length)], skin: skins[Math.floor(hash(i, 6) * skins.length)] });
      }
    }
  }
  return list;
}

const CROWD_VERT = /* glsl */ `
  attribute vec2 aPh; // x phase, y how excited
  uniform float uTime, uExcite, uKind;
  varying vec3 vN; varying vec3 vW; varying vec3 vCol;
  void main() {
    vec3 p = position;
    vec3 n = normal;
    float ex = aPh.y * uExcite;
    float bob = abs(sin(uTime * 7.0 + aPh.x)) * 0.14 * ex;
    if (uKind > 1.5) {
      float side = uKind > 2.5 ? 1.0 : -1.0;
      vec3 sh = vec3(side * 0.27, 0.62, 0.0);
      float ang = side * (0.22 + ex * (1.95 + 0.6 * sin(uTime * 9.0 + aPh.x * 2.0)));
      float c = cos(ang), s = sin(ang);
      vec3 r = p - sh;
      p = sh + vec3(c * r.x - s * r.y, s * r.x + c * r.y, r.z);
      n = vec3(c * n.x - s * n.y, s * n.x + c * n.y, n.z);
    }
    p.y += bob;
    p.x += sin(uTime * 3.0 + aPh.x) * 0.03 * ex * (uKind > 0.5 && uKind < 1.5 ? 1.0 : 0.3);
    vec4 q = instanceMatrix * vec4(p, 1.0);
    vec4 w = modelMatrix * q;
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * n);
    vCol = instanceColor;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
export function crowdMaterial(kind) {
  return new ShaderMaterial({
    uniforms: { ...lightUniforms(), uTime: u(0), uExcite: u(0.7), uKind: u(kind) },
    vertexShader: CROWD_VERT,
    fragmentShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying vec3 vCol;
      ${SKY}
      ${LIGHT}
      void main() {
        vec3 c = lit(vCol, normalize(vN), vW, 0.25, 0.0, 0.0042);
        gl_FragColor = vec4(pow(max(c, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}
export function crowdGeometries() {
  const body = paint(new CylinderGeometry(0.2, 0.26, 0.66, 8).translate(0, 0.33, 0), "#ffffff", { smooth: true });
  const head = paint(new IcosahedronGeometry(0.19, 1).translate(0, 0.86, 0), "#ffffff", { smooth: true });
  const armR = paint(new BoxGeometry(0.1, 0.5, 0.1).translate(0.27, 0.62 - 0.25, 0), "#ffffff");
  const armL = paint(new BoxGeometry(0.1, 0.5, 0.1).translate(-0.27, 0.62 - 0.25, 0), "#ffffff");
  return { body, head, armR, armL };
}
export function crowdMeshes(list) {
  const G = crowdGeometries();
  const out = {};
  const ph = new Float32Array(list.length * 2);
  list.forEach((p, i) => {
    ph[i * 2] = p.ph;
    ph[i * 2 + 1] = p.ex;
  });
  const D = new Matrix4();
  const mk = (geo, kind, colourOf) => {
    const mat = crowdMaterial(kind);
    const mesh = new InstancedMesh(geo, mat, list.length);
    mesh.frustumCulled = false;
    list.forEach((p, i) => {
      D.makeScale(p.s, p.s, p.s).setPosition(p.x, p.y, p.z);
      mesh.setMatrixAt(i, D);
      // the shader reads instanceColor as the sRGB pick (it writes pow 2.2 itself)
      mesh.setColorAt(i, new Color(...rgb(colourOf(p))));
    });
    geo.setAttribute("aPh", new InstancedBufferAttribute(ph, 2));
    return mesh;
  };
  out.body = mk(G.body, 0, (p) => p.shirt);
  out.head = mk(G.head, 1, (p) => p.skin);
  out.armR = mk(G.armR, 3, (p) => p.shirt);
  out.armL = mk(G.armL, 2, (p) => p.shirt);
  out.G = G;
  return out;
}

// ---- flags -----------------------------------------------------------------------

// A chequered cloth on a pole, instanced: snaps in the wind (vertex wave), chequer in the fragment.
export function flagMaterial() {
  return new ShaderMaterial({
    uniforms: { ...lightUniforms(), uTime: u(0) },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aPh;
      uniform float uTime;
      varying vec3 vW; varying vec2 vC; varying float vK;
      void main() {
        vec3 p = position; // x from the pole (0) out to 1
        float k = clamp(p.x, 0.0, 1.0);
        float amp = 0.1 + 0.07 * sin(uTime * 3.1 + aPh);
        // the wave runs down the cloth, quick and snappy, bigger at the free edge
        p.z += sin(p.x * 9.0 - uTime * 16.0 + aPh) * amp * k + sin(p.x * 21.0 - uTime * 31.0 + aPh * 2.0) * 0.02 * k;
        p.y += sin(p.x * 6.0 - uTime * 12.0 + aPh) * 0.035 * k - 0.05 * k * k;
        vec4 q = instanceMatrix * vec4(p, 1.0);
        vec4 w = modelMatrix * q;
        vW = w.xyz;
        vK = k;
        vC = position.xy * vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz)) / 0.22;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW; varying vec2 vC; varying float vK;
      ${SKY}
      ${LIGHT}
      void main() {
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        if (dot(n, cameraPosition - vW) < 0.0) n = -n;
        float chk = mod(floor(vC.x) + floor(vC.y + 50.0), 2.0);
        vec3 c = mix(vec3(0.07, 0.06, 0.09), vec3(0.99, 0.98, 0.95), chk);
        vec3 col = lit(c, n, vW, 0.3, 0.05, 0.0042);
        col *= 0.88 + 0.12 * sin(vK * 14.0 + vW.x);
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
      }`,
  });
}
export function flagPoles() {
  const L = [];
  const list = []; // { x, y, z, w, h, ry }
  for (const x0 of BLOCKS) {
    // roof-top flags, one per column, and low flags along the barrier
    for (let i = 0; i <= 4; i++) {
      const x = x0 + (i * BLOCK_LEN) / 4;
      L.push(paint(new CylinderGeometry(0.05, 0.06, 4.4, 6), "#f4f0e6", { gloss: 0.6, smooth: true, m4: new Matrix4().makeTranslation(x, 6.6 + 2.2, ZF + 2.2) }));
      list.push({ x, y: 6.6 + 3.6, z: ZF + 2.2, w: 2.2, h: 1.3, ry: 0 });
    }
    for (let i = 0; i < 5; i++) {
      const x = x0 + 3 + i * 9.2;
      L.push(paint(new CylinderGeometry(0.04, 0.05, 3.4, 6), "#f4f0e6", { gloss: 0.6, smooth: true, m4: new Matrix4().makeTranslation(x, 1.2 + 1.7, ZF + 0.5) }));
      list.push({ x, y: 1.2 + 2.9, z: ZF + 0.5, w: 1.5, h: 0.9, ry: 0 });
    }
  }
  return { poles: merge(L), flags: list };
}

// the finish gantry, on the far side of the track so its banner faces the lens: two pylons and a beam
export function gantry() {
  const L = [];
  const z = TRACK_Z - HALF - 1.4;
  for (const dx of [-8.6, 8.6]) {
    L.push(paint(new BoxGeometry(1.0, 9.6, 1.0), "#2f6fe0", { gloss: 0.8, m4: new Matrix4().makeTranslation(FINISH_X + dx, 4.8, z) }));
    L.push(paint(new BoxGeometry(1.3, 0.5, 1.3), "#fbf5ea", { gloss: 0.8, m4: new Matrix4().makeTranslation(FINISH_X + dx, 9.8, z) }));
  }
  L.push(paint(new BoxGeometry(19.6, 0.9, 0.9), "#e23a2e", { gloss: 0.9, m4: new Matrix4().makeTranslation(FINISH_X, 8.9, z) }));
  L.push(paint(new BoxGeometry(19.6, 0.2, 1.0), "#ffc820", { gloss: 0.9, m4: new Matrix4().makeTranslation(FINISH_X, 8.3, z) }));
  return merge(L);
}

// ---- the infield's dressing: tyre walls and rocks ------------------------------------------

export function tyres() {
  const g = paint(new CylinderGeometry(0.42, 0.42, 0.34, 10, 1), "#ffffff", { gloss: 0.3, paintMask: 1, smooth: true });
  const n = 150;
  const m = new InstancedMesh(g, solid({ fogK: 0.0042 }), n * 3);
  const D = new Matrix4();
  const c = new Color();
  for (let i = 0; i < n; i++) {
    const red = Math.floor(i / 3) % 2 === 0;
    for (let k = 0; k < 3; k++) {
      D.makeTranslation(STRAIGHT[0] - 1 - i * 2.1, 0.17 + 0.34 * k, TRACK_Z - HALF - 1.0);
      m.setMatrixAt(i * 3 + k, D);
      m.setColorAt(i * 3 + k, c.setRGB(...(red ? [0.9, 0.12, 0.1] : [0.97, 0.96, 0.92])));
    }
  }
  m.frustumCulled = false;
  return m;
}

export function rocks() {
  const g = paint(new IcosahedronGeometry(1, 1).scale(1, 0.6, 0.85), "#ffffff", { gloss: 0.1, paintMask: 1 });
  const n = 46;
  const m = new InstancedMesh(g, solid({ fogK: 0.0048 }), n);
  const D = new Matrix4();
  const c = new Color();
  for (let i = 0; i < n; i++) {
    const x = 110 - hash(i, 1) * 330;
    const z = i % 3 ? TRACK_Z - HALF - 2.4 - hash(i, 2) * 0.9 : TRACK_Z + HALF + 2.2 + hash(i, 2) * 14;
    const s = (i % 3 ? 0.35 : 0.5) + hash(i, 3) * (i % 3 ? 0.5 : 1.3);
    D.makeRotationY(hash(i, 4) * 6).setPosition(x, s * 0.25, z).scale(new Vector3(s, s, s));
    m.setMatrixAt(i, D);
    m.setColorAt(i, c.setRGB(...[0.86 - 0.12 * hash(i, 5), 0.5 - 0.12 * hash(i, 5), 0.32 - 0.06 * hash(i, 5)]));
  }
  m.frustumCulled = false;
  return m;
}

// a big saguaro for the sand strips between the stands (merged)
export function cactus() {
  const green = "#3e9a52";
  const L = [paint(new CylinderGeometry(0.4, 0.45, 3.4, 10), green, { gloss: 0.2, smooth: true, m4: new Matrix4().makeTranslation(0, 1.7, 0) }), paint(new SphereGeometry(0.4, 10, 6), green, { gloss: 0.2, smooth: true, m4: new Matrix4().makeTranslation(0, 3.4, 0) })];
  for (const [sx, y, h] of [[-1, 1.5, 1.3], [1, 1.9, 1.1]]) {
    L.push(paint(new CylinderGeometry(0.22, 0.22, 0.9, 8), green, { gloss: 0.2, smooth: true, m4: new Matrix4().makeRotationZ(Math.PI / 2).setPosition(sx * 0.7, y, 0) }));
    L.push(paint(new CylinderGeometry(0.22, 0.22, h, 8), green, { gloss: 0.2, smooth: true, m4: new Matrix4().makeTranslation(sx * 1.15, y + h / 2, 0) }));
    L.push(paint(new SphereGeometry(0.22, 8, 5), green, { gloss: 0.2, smooth: true, m4: new Matrix4().makeTranslation(sx * 1.15, y + h, 0) }));
  }
  return merge(L);
}

// ---- the mesas --------------------------------------------------------------------------------------

function mesa({ x, z, a, b, h, seed, spire = false }) {
  const rings = 26;
  const seg = 14;
  const bands = ["#c93e28", "#e0602b", "#f0a050", "#b8321f", "#e8793a", "#f2c088"];
  const pos = [];
  const col = [];
  const idx = [];
  const ringR = (k, j) => {
    const t = k / rings;
    // a talus skirt at the foot, a near-vertical cliff, an overhanging cap
    let r = 1 + 0.55 * Math.pow(Math.max(0, 1 - t / 0.22), 2);
    r *= 1 + (hash(j * 7 + seed, 1) - 0.5) * 0.16 * (0.4 + t) + (hash(Math.floor(k / 3) * 13 + j + seed, 2) - 0.5) * 0.07;
    if (t > 0.92) r *= 1.04;
    if (spire) r *= 1 - 0.4 * t;
    return r;
  };
  const rgbOf = (hex) => rgb(hex);
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const y = t * h;
    const band = Math.floor(t * 9 + hash(seed, 3) * 4);
    const hex = bands[(band * 5 + seed) % bands.length];
    for (let j = 0; j < seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const r = ringR(k, j);
      pos.push(x + Math.cos(th) * a * r, y, z + Math.sin(th) * b * r);
      const c = rgbOf(hex);
      const shade = 0.82 + 0.3 * t + 0.1 * (hash(j + k * 17, seed) - 0.5);
      col.push(c[0] * shade, c[1] * shade, c[2] * shade);
    }
  }
  for (let k = 0; k < rings; k++) for (let j = 0; j < seg; j++) {
    const p = k * seg + j;
    const q = k * seg + ((j + 1) % seg);
    idx.push(p, p + seg, q, q, p + seg, q + seg);
  }
  // the flat top
  const top = rings * seg;
  for (let j = 0; j < seg; j++) idx.push(top + j, top + ((j + 1) % seg), top + 0); // fan from the first ring vertex
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("aCol", new Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const ng = g.toNonIndexed();
  // wind every triangle outward (the sides away from the axis, the cap up)
  const pa = ng.attributes.position.array;
  const ca = ng.attributes.aCol.array;
  const swap = (arr, i, d) => {
    for (let c = 0; c < d; c++) [arr[(i + 1) * d + c], arr[(i + 2) * d + c]] = [arr[(i + 2) * d + c], arr[(i + 1) * d + c]];
  };
  for (let i = 0; i < ng.attributes.position.count; i += 3) {
    const e1 = [pa[(i + 1) * 3] - pa[i * 3], pa[(i + 1) * 3 + 1] - pa[i * 3 + 1], pa[(i + 1) * 3 + 2] - pa[i * 3 + 2]];
    const e2 = [pa[(i + 2) * 3] - pa[i * 3], pa[(i + 2) * 3 + 1] - pa[i * 3 + 1], pa[(i + 2) * 3 + 2] - pa[i * 3 + 2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const flat = Math.abs(pa[i * 3 + 1] - h) < 1e-4 && Math.abs(pa[(i + 1) * 3 + 1] - h) < 1e-4 && Math.abs(pa[(i + 2) * 3 + 1] - h) < 1e-4;
    const cx = (pa[i * 3] + pa[(i + 1) * 3] + pa[(i + 2) * 3]) / 3 - x;
    const cz = (pa[i * 3 + 2] + pa[(i + 1) * 3 + 2] + pa[(i + 2) * 3 + 2]) / 3 - z;
    if (flat ? n[1] < 0 : n[0] * cx + n[2] * cz < 0) {
      swap(pa, i, 3);
      swap(ca, i, 3);
    }
  }
  ng.computeVertexNormals();
  const p = ng.attributes.position;
  ng.setAttribute("aMat", new Float32BufferAttribute(new Float32Array(p.count * 2).map((_, i) => (i % 2 ? 0.08 : 0)), 2));
  return ng;
}
export function mesas() {
  const list = [
    { x: -330, z: -197, a: 46, b: 30, h: 41, seed: 1 },
    { x: -250, z: -184, a: 14, b: 12, h: 52, seed: 2, spire: true },
    { x: -150, z: -202, a: 62, b: 32, h: 32, seed: 3 },
    { x: -52, z: -188, a: 24, b: 16, h: 46, seed: 4 },
    { x: 18, z: -197, a: 52, b: 28, h: 28, seed: 5 },
    { x: 100, z: -181, a: 16, b: 13, h: 49, seed: 6, spire: true },
    { x: 170, z: -198, a: 70, b: 34, h: 36, seed: 7 },
    { x: 270, z: -188, a: 30, b: 20, h: 43, seed: 8 },
    { x: 340, z: -203, a: 52, b: 30, h: 31, seed: 9 },
  ];
  return merge(list.map(mesa));
}
