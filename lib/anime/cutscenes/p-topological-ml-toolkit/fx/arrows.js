// VECTOR ARROWS (bible 3.7, 3.8, 6; egg 5): the storm that arrives red, flips at the seal's skin, rides back white with a
// cyan core; the gold feature-vector grid with circulation round a Betti-1 hole and one long pale-gold outlier.
// Three instanced pools share one geometry and one shader:
//   storm   56 arrows, incoming #ff2a4d, reversed body #f4fbff / core #3de0ff, 2 frames of pure white and a x1.45 stretch smear at the flip
//   grid    cells #ffc83d on the camera-facing plane through the bubble, the outlier #fff1c2 (0.6 m)
//   heads   14 x 2 arrow heads that ride the wind ribbons (fed by ribbons.js through env.heads)
// Arrow maths (all in the vertex shader, from per-instance P tail, D direction, len, th radius):
//   headLen = max(0.3 len, 3.2 th);  shaftEnd = len - headLen;  shaft radius th, head base radius 2.5 th, tip radius 0
//   vertex = P + D s + (S cos a + T sin a) rr,   S = normalize(D x up), T = D x S      (a tube round the axis)
//   ink hull: the same tube at 1.7x (shaft) and 1.38x (head), drawn first with depthWrite off, so the fill sits on top and
//   leaves a constant-looking outline that never depends on triangle winding.
// Flight (closed form of t, so scrubbing equals playing): a storm arrow with line direction u (unit, from the chest outwards),
//   incoming tip distance d(p) = R + (D0 - R)(1 - p^2), p = (t - ta)/(th - ta)       accelerating into the skin of radius R
//   reversed tail distance d(a) = R + 26 a + 40 a^2, a = t - th                        accelerating back out along its own line
import { HEX, rgb, hash, hash2, smooth } from "./util.js";

export const STORM_N = 56;
export const SHELL_R = 1.7; // metres x seal scale: the skin the vectors reverse off (the hero stays unmoved inside it)

/** The storm, as data: one spec per arrow (shared with hits.js so the stars land where the arrows turn). */
export function stormSpec() {
  const out = [];
  for (let i = 0; i < STORM_N; i++) {
    const slow = i < 24; // the first wave drifts in over shot 2 and is released at the reversal; the rest pop 0.25 s before their hit
    const th = slow ? 3.55 + hash(i * 3.1) * 1.85 : 3.5 + hash(i * 5.3 + 2) * 1.9;
    const ta = slow ? 1.5 + hash(i * 7.7) * 1.7 : th - 0.25;
    const az = hash(i * 11.9) * Math.PI * 2;
    const el = 0.12 + hash(i * 2.3 + 9) * 1.0;
    const u = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
    out.push({ i, ta, th, u, D0: slow ? 22 + hash(i * 4.4) * 10 : SHELL_R + 7.5, len: 1.2 + hash(i * 6.1) * 1.3, rad: 0.055 + hash(i * 8.2) * 0.04 });
  }
  return out;
}

function arrowGeometry(THREE, N = 8) {
  const pos = [], aG = [], idx = [];
  const ring = (sMode, rMode, ax) => {
    const base = aG.length / 4;
    for (let k = 0; k <= N; k++) { aG.push(sMode, rMode, (k / N) * Math.PI * 2, ax); pos.push(0, 0, 0); }
    return base;
  };
  const A = ring(0, 1, 0), B = ring(1, 1, 0), C = ring(1, 1, -1), D = ring(1, 2, -1), E = ring(1, 2, 0.6), Tp = ring(2, 0, 0.6), Ac = ring(0, 1, -1), Ctr = ring(0, 0, -1);
  const quad = (p, q) => { for (let k = 0; k < N; k++) idx.push(p + k, p + k + 1, q + k, p + k + 1, q + k + 1, q + k); };
  quad(A, B);      // shaft sides
  quad(C, D);      // underside annulus of the head (normal -D)
  quad(E, Tp);     // head cone
  quad(Ac, Ctr);   // tail cap
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aG", new THREE.BufferAttribute(new Float32Array(aG), 4));
  g.setIndex(idx);
  return g;
}

/** An instanced arrow pool. fill(i, P, D, len, th, rgb, coreFlag, whiteMix) writes instance i; count hides the rest. */
export function makeArrowPool(THREE, max, { bill = false, coreHex = HEX.core, order = 4 } = {}) {
  const geo = arrowGeometry(THREE);
  const mk = (n) => new THREE.InstancedBufferAttribute(new Float32Array(max * n), n).setUsage(THREE.DynamicDrawUsage);
  const aP = mk(3), aQ = mk(4), aD = mk(3), aL = mk(2), aCol = mk(3), aF = mk(3);
  geo.setAttribute("aP", aP); geo.setAttribute("aQ", aQ); geo.setAttribute("aD", aD); geo.setAttribute("aL", aL); geo.setAttribute("aCol", aCol); geo.setAttribute("aF", aF);
  geo.instanceCount = 0;
  const vs = /* glsl */ `
    attribute vec4 aG; attribute vec3 aP; attribute vec4 aQ; attribute vec3 aD; attribute vec2 aL; attribute vec3 aCol; attribute vec3 aF;
    uniform float uBill; uniform float uHull;
    varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying vec3 vF; varying float vPart;
    void main(){
      vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
      vec3 U = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      vec3 D, P;
      if (uBill > 0.5) { D = normalize(R * aQ.z + U * aQ.w); P = aP + R * aQ.x + U * aQ.y - D * aL.x * 0.5; }   // grid: plane facing the lens
      else { D = normalize(aD + vec3(1e-6)); P = aP; }
      float len = aL.x, th = aL.y;
      float headLen = max(0.3 * len, 3.2 * th);
      float shaftEnd = max(len - headLen, 0.0);
      float s  = aG.x < 0.5 ? 0.0 : (aG.x < 1.5 ? shaftEnd : len);
      float rr = aG.y < 0.5 ? 0.0 : (aG.y < 1.5 ? th : 2.5 * th);
      if (uHull > 0.5) {                                   // ink hull: 1.7x the shaft, 1.38x the head, a touch longer
        rr *= (aG.y < 1.5 ? 1.7 : 1.38);
        s += aG.x < 0.5 ? -0.5 * th : (aG.x > 1.5 ? 1.2 * th : 0.0);
        if (aG.y < 0.5 && aG.x < 0.5) rr = 0.0;
      }
      vec3 S = cross(D, vec3(0.0, 1.0, 0.0));
      if (length(S) < 0.05) S = cross(D, vec3(1.0, 0.0, 0.0));
      S = normalize(S); vec3 Tt = cross(D, S);
      vec3 radial = S * cos(aG.z) + Tt * sin(aG.z);
      float ax = aG.w;
      vN = normalize(radial * (1.0 - abs(ax)) + D * ax);
      vec3 w = P + D * s + radial * rr;
      vW = w; vCol = aCol; vF = aF; vPart = aG.x;
      gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
    }`;
  const fs = (hull) => /* glsl */ `
    uniform vec3 uInk; uniform vec3 uCoreCol;
    varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying vec3 vF; varying float vPart;
    void main(){
      ${hull ? "gl_FragColor = vec4(uInk, 1.0); return;" : `
      vec3 V = normalize(cameraPosition - vW);
      float facing = abs(dot(normalize(vN), V));
      vec3 col = vCol;
      col *= mix(1.0, 0.78, step(0.0, -vN.y - 0.25));       // hard cel shadow on the underside, no gradient
      if (vF.x > 0.5 && facing > 0.80) col = uCoreCol;      // the cyan core line of a reversed arrow
      col = mix(col, vec3(1.0), vF.y);                      // the 2-frame white flash at the flip
      gl_FragColor = vec4(min(col, vec3(0.97)), 1.0);`}
    }`;
  const common = { uBill: { value: bill ? 1 : 0 }, uInk: { value: new THREE.Color(HEX.ink) }, uCoreCol: { value: new THREE.Color(coreHex) } };
  const matFill = new THREE.ShaderMaterial({ uniforms: { ...common, uHull: { value: 0 } }, vertexShader: vs, fragmentShader: fs(false), side: THREE.DoubleSide });
  const matHull = new THREE.ShaderMaterial({ uniforms: { ...common, uHull: { value: 1 } }, vertexShader: vs, fragmentShader: fs(true), side: THREE.DoubleSide, depthWrite: false });
  const hull = new THREE.Mesh(geo, matHull), fill = new THREE.Mesh(geo, matFill);
  hull.frustumCulled = fill.frustumCulled = false; hull.renderOrder = order - 1; fill.renderOrder = order;
  const group = new THREE.Group(); group.add(hull, fill);
  let n = 0;
  return {
    group,
    begin() { n = 0; },
    add(Px, Py, Pz, Dx, Dy, Dz, len, th, c, core = 0, white = 0, qx = 0, qy = 0, qdx = 0, qdy = 0) {
      if (n >= max || len <= 1e-4) return;
      aP.setXYZ(n, Px, Py, Pz); aD.setXYZ(n, Dx, Dy, Dz); aL.setXY(n, len, th); aCol.setXYZ(n, c[0], c[1], c[2]); aF.setXYZ(n, core, white, 0); aQ.setXYZW(n, qx, qy, qdx, qdy); n++;
    },
    end() { geo.instanceCount = n; for (const a of [aP, aQ, aD, aL, aCol, aF]) a.needsUpdate = true; },
    dispose() { geo.dispose(); matFill.dispose(); matHull.dispose(); },
  };
}

export default function build(ctx, env) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const storm = makeArrowPool(THREE, STORM_N, { order: 4 });
  const grid = makeArrowPool(THREE, 100, { bill: true, order: 4 });
  const heads = makeArrowPool(THREE, 40, { coreHex: "#ffffff", order: 4 });
  group.add(storm.group, grid.group, heads.group);
  const spec = stormSpec();
  const RED = rgb(THREE, HEX.red), WHITE = rgb(THREE, HEX.white), GOLD = rgb(THREE, HEX.gold), OUT = rgb(THREE, HEX.outlier), RIB = rgb(THREE, HEX.ribbon);

  // the grid: cells at multiples of 0.3 m, |p| <= GRID_R 1.38 - clipped a cell short; a 0.35 m hole (radius 0.175) at the centre is the Betti-1 loop
  const cells = [];
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
    const px = i * 0.3, py = j * 0.3, r = Math.hypot(px, py);
    if (r > 1.33 || r < 0.2) continue;
    const outlier = i === 2 && j === 1;
    const h = hash2(i, j);
    // direction: circulation round the hole (the tangent), blended into a gentle shared stream far out so the field reads as a flow, not a vortex
    const tx = -py / r, ty = px / r, far = smooth(0.7, 1.35, r);
    let dx = tx * (1 - 0.55 * far) + 0.55 * far, dy = ty * (1 - 0.55 * far) + 0.0;
    const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    cells.push({ px, py, r, h, outlier, dx, dy, len: outlier ? 0.6 : 0.17 + h * 0.10, keep: r < 0.46, tp: r * 0.2 + h * 0.1, td: r * 0.12 });
  }
  const sc0 = () => env.F.sc();

  function update(t) {
    const T = env.T, F = env.F, sc = sc0();
    const chest = F.chest(env.v1);
    // ---- storm ----
    storm.begin();
    for (const s of spec) {
      const R = SHELL_R * sc;
      if (t < s.ta) continue;
      const pop = (t - s.ta) < 1 / 12 ? 1.15 : 1;                    // pop scale 1.15 on twos
      if (t < s.th) {
        const p = (t - s.ta) / (s.th - s.ta);
        const d = R + (s.D0 * sc - R) * (1 - p * p);                 // tip distance, accelerating
        const len = s.len * sc * pop;
        storm.add(chest.x + s.u[0] * (d + len), chest.y + s.u[1] * (d + len), chest.z + s.u[2] * (d + len), -s.u[0], -s.u[1], -s.u[2], len, s.rad * sc * pop, RED, 0, 0);
      } else {
        const a = t - s.th;
        if (a > 1.5) continue;
        const flash = a < 2 / 24;                                    // 2 frames of white and a stretch smear at the flip
        const fade = 1 - smooth(1.15, 1.5, a);
        const len = s.len * sc * (flash ? 1.45 : 1) * fade, d = R + (26 * a + 40 * a * a) * sc;
        storm.add(chest.x + s.u[0] * d, chest.y + s.u[1] * d, chest.z + s.u[2] * d, s.u[0], s.u[1], s.u[2], len, s.rad * sc * fade * (flash ? 1.0 : 1), flash ? WHITE : WHITE, flash ? 0 : 1, flash ? 1 : 0);
      }
    }
    storm.end();

    // ---- grid (billboard plane through the bubble) ----
    grid.begin();
    const B = env.B, popped = t >= T.pop;
    if (t >= T.grid && env.gridOn) {
      for (const c of cells) {
        const tp = T.grid + c.tp;
        if (t < tp) continue;
        let alive = 1;
        if (popped) {
          const td = T.pop + c.td;
          if (c.keep) alive = t < T.pop + 0.6 ? 1 : 0;               // egg 6: the ring round the hole survives the shockwave, the rest dissolve
          else alive = t < td ? 1 : (t < td + 2 / 24 ? 0.5 : 0);
        }
        if (alive <= 0) continue;
        const pop = (t - tp) < 1 / 12 ? 1.15 : 1;
        const pulse = 1 + 0.06 * Math.sin(Math.floor(t * 12) * 0.9 + c.h * 6.28);   // on twos
        const len = c.len * sc * pop * pulse * alive;
        const col = c.outlier ? OUT : GOLD;
        grid.add(B.x, B.y, B.z, 0, 0, 0, len, len * (c.outlier ? 0.10 : 0.14), col, 0, 0, c.px * sc, c.py * sc, c.dx, c.dy);
      }
    }
    grid.end();

    // ---- wind heads (from ribbons.js) ----
    heads.begin();
    for (const h of env.heads) heads.add(h.px, h.py, h.pz, h.dx, h.dy, h.dz, h.len, h.th, RIB, 1, 0);
    heads.end();
  }
  return { group, update, dispose() { storm.dispose(); grid.dispose(); heads.dispose(); } };
}
