// LENS CRACK AND SHATTER (bible 3.15, 3.16, 6; easter egg 5). Layer 1, screen space, every quad BEHIND the seal's depth (the hero is never covered).
//
// Coordinates: crack space is in HEIGHT units about the origin pixel o (the bolt's landing, projected from a world point every frame):
//   ndc = o + (off.x / asp, off.y), asp = P11 / P00. A pixel offset is 1 height unit = res.y / 2 px.
// Crack ribbons: pixel-constant width, n = (-d.y, d.x)/|d| with d = (next - this) * res / 2; ndc += n * side * px / res.
//   1 main crack (through the origin, angle 1.12 rad as the move) + 5 radials + 2 ring cracks, in 3 passes between 6.5 and 6.95 s, then fine branches grow
//   through shot 5 (7.0-8.2 s). Each vertex carries thr = t0 + (t1 - t0) * u, the time it appears; the fragment discards while uT < thr, so the stroke GROWS.
//   white #ffffff 2 px over a #8fd8ff 5 px glow, hard facets #cfe6ff at 12 percent between the radials (sector index = number of radial angles below atan2),
//   star glints #8fd8ff 6 px (astroid |x|^.5 + |y|^.5 < 1), dust diamonds falling off the edges 7.0-8.4 s.
// Shatter (8.4 s freeze): 5 x 4 cells x 2 triangles = 40 shards over the frame, jittered vertices.
//   hold   shard i drifts 0.012 height units outward for 0.5 s
//   fall   fk = clamp((t - (F+.5)) / .6): offset (vx .5, -(.25 + 1.1 r)) * fk^2 (1 - bk), spin 5 rad * r * fk^2 (1 - bk)   [stepped t: tumble on twos]
//   back   bk = smoothstep over [F+1.1, F+1.9]: the same offset eased to zero (reassembly); lock at F+2.1: edges flash gold #e9b23a, then
//   heal   heal = clamp((t - lock)/.7): an edge pixel stays while max(bary) < 1 - heal/2, so seams close from the ends toward the middle.
//   edge   white 2 px = (min bary / fwidth(min bary)) < 1; the blue edge light #7fd8ff travels outward as a hard band at r = 1.6 (t - F).
//   fill   #7fc8ff 14 percent, falling to navy #0b2a55 50 percent while a shard is away.
//   loop   one shard (index 13) carries a closed gold loop traced by angle about its centre from 8.4 s to 10.7 s: the monodromy claim.
// Cue names: "crack" (6.5), "shatter" (8.4; fall +.5, back +1.1, lock +2.1).
import { mat, clamp01, hash3 } from "./lib.js";

const ORIGIN_VS = /* glsl */ `
uniform vec3 uOriginW; uniform vec3 uSealW; uniform float uPushZ; uniform vec2 uRes; uniform float uHs;
vec2 originNdc() { vec4 c = projectionMatrix * viewMatrix * vec4(uOriginW, 1.0); return c.w > .1 ? c.xy / c.w : vec2(.12, .08); }
float aspNow() { return projectionMatrix[1][1] / projectionMatrix[0][0]; }
float sealDepth() { vec4 ms = viewMatrix * vec4(uSealW, 1.0); float z = min(ms.z, -.6) - uPushZ; vec4 c = projectionMatrix * vec4(0., 0., z, 1.); return c.z / c.w; }
`;

export default function makeLens(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "lens";
  const R = ctx.rng("mono-lens");
  const tCr = T.one("crack", 6.5), tF = T.one("shatter", 8.4);
  const tFall = tF + 0.5, tBack = tF + 1.1, tLock = tF + 2.1;
  const base = {
    uOriginW: { value: new THREE.Vector3() }, uSealW: sh.uSealW, uPushZ: { value: 0.9 * L.scale + 0.3 }, uRes: sh.uRes, uHs: sh.uHs, uT: { value: 0 },
  };
  const cm = L.cultists;
  base.uOriginW.value.set(cm.reduce((a, c) => a + c[0], 0) / cm.length, 1.5 + L.floorY, cm.reduce((a, c) => a + c[2], 0) / cm.length);

  // ---------------- crack polylines ----------------
  const lines = []; // { pts:[[x,y]...], t0, t1 }
  const wob = (a0, len, n, J, t0, t1, start = [0, 0]) => {
    const pts = [start.slice()]; let ang = a0, p = start.slice();
    for (let i = 1; i <= n; i++) { ang += (R() - 0.5) * J; const st = len / n * (0.6 + 0.8 * R()); p = [p[0] + Math.cos(ang) * st, p[1] + Math.sin(ang) * st]; pts.push(p); }
    lines.push({ pts, t0, t1 }); return pts;
  };
  const A0 = 1.12;
  wob(A0, 1.7, 12, 0.7, tCr, tCr + 0.14); wob(A0 + Math.PI, 1.2, 9, 0.7, tCr, tCr + 0.12);
  const radA = [];
  for (let k = 0; k < 5; k++) {
    const a = A0 + 0.5 + k * (6.283 / 5) + (R() - 0.5) * 0.4, pass = k < 2 ? 0 : 1;
    radA.push(a);
    const t0 = pass ? tCr + 0.15 : tCr, t1 = pass ? tCr + 0.35 : tCr + 0.2;
    wob(a, 0.55 + 0.5 * R(), 8, 0.9, t0, t1);
  }
  for (const [rad, s0, span] of [[0.22, R() * 6.28, 3.4], [0.42, R() * 6.28, 2.9]]) { // ring cracks, pass 3
    const pts = []; for (let i = 0; i <= 14; i++) { const a = s0 + (span * i) / 14, rr = rad * (1 + (R() - 0.5) * 0.18); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    lines.push({ pts, t0: tCr + 0.3, t1: tCr + 0.45 });
  }
  for (let k = 0; k < 7; k++) { // fine branches grow through shot 5
    const src = lines[(k * 3) % 7].pts, i0 = 3 + (k * 2) % (src.length - 4), st = src[i0];
    wob(R() * 6.28, 0.14 + 0.14 * R(), 5, 1.2, 7.0 + 0.2 * k, 7.0 + 0.2 * k + 0.5, st);
  }

  // ribbon geometry (shared by the glow and the core pass)
  const pos = [], nxt = [], side = [], thr = [], idx = []; const knots = []; // knots: [x, y, thr] candidates for glints and dust
  for (const ln of lines) {
    const n = ln.pts.length, b = pos.length / 2;
    for (let i = 0; i < n; i++) {
      const p = ln.pts[i], q = ln.pts[Math.min(n - 1, i + 1)], pr = ln.pts[Math.max(0, i - 1)], th = ln.t0 + (ln.t1 - ln.t0) * (i / (n - 1));
      const nx = i === n - 1 ? [p[0] + (p[0] - pr[0]), p[1] + (p[1] - pr[1])] : q;
      for (const sd of [-1, 1]) { pos.push(p[0], p[1]); nxt.push(nx[0], nx[1]); side.push(sd); thr.push(th); }
      knots.push([p[0], p[1], th]);
      if (i < n - 1) idx.push(b + i * 2, b + i * 2 + 1, b + i * 2 + 2, b + i * 2 + 1, b + i * 2 + 3, b + i * 2 + 2);
    }
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute("position", new THREE.Float32BufferAttribute(pos.flatMap((v, i) => (i % 2 ? [v, 0] : [v])), 3));
  // (position is vec3 padded: x, y, 0 above)
  cg.setAttribute("nxt", new THREE.Float32BufferAttribute(nxt, 2)); cg.setAttribute("side", new THREE.Float32BufferAttribute(side, 1));
  cg.setAttribute("thr", new THREE.Float32BufferAttribute(thr, 1)); cg.setIndex(idx); cg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const crackVs = /* glsl */ `
    attribute vec2 nxt; attribute float side; attribute float thr; uniform float uPx; varying float vThr;
    ${ORIGIN_VS}
    void main() {
      vec2 o = originNdc(); float asp = aspNow();
      vec2 b = o + vec2(position.x / asp, position.y), nb = o + vec2(nxt.x / asp, nxt.y);
      vec2 d = (nb - b) * uRes * .5; float dl = length(d); d = dl > 1e-5 ? d / dl : vec2(1., 0.);
      vec2 n = vec2(-d.y, d.x);
      gl_Position = vec4(b + n * side * uPx * uHs / uRes, sealDepth(), 1.); vThr = thr;
    }`;
  const crackFs = /* glsl */ `uniform float uT, uA; uniform vec3 uCol; varying float vThr; void main(){ if (uT < vThr) discard; gl_FragColor = vec4(uCol, uA); }`;
  const mkCrack = (px, col, a, add, order) => {
    const u = { ...base, uPx: { value: px }, uA: { value: a }, uCol: { value: new THREE.Color(col) } };
    const m = mat(THREE, { vs: crackVs, fs: crackFs, u, add }); const me = new THREE.Mesh(cg, m); me.frustumCulled = false; me.renderOrder = order; return me;
  };
  const crackGlow = mkCrack(5, "#8fd8ff", 0.55, true, 4), crackCore = mkCrack(2, "#ffffff", 1, false, 5);

  // facets: alternate sectors tinted #cfe6ff 12 percent between the radial and main-crack angles
  const angs = [A0, A0 + Math.PI, ...radA].map((a) => Math.atan2(Math.sin(a), Math.cos(a))).sort((a, b) => a - b);
  const angArr = Array.from({ length: 8 }, (_, i) => (i < angs.length ? angs[i] : 9));
  const facetVs = /* glsl */ `
    varying vec2 vNdc; varying vec2 vO; varying float vAsp;
    ${ORIGIN_VS}
    void main() {
      vAsp = aspNow(); vO = originNdc(); vNdc = position.xy;
      gl_Position = vec4(position.xy, sealDepth(), 1.);
    }`;
  const facetFs = /* glsl */ `
    uniform float uT, uGrow; uniform float uAng[8]; varying vec2 vNdc; varying vec2 vO; varying float vAsp;
    void main() {
      vec2 p = (vNdc - vO) * vec2(vAsp, 1.); float r = length(p), a = atan(p.y, p.x);
      float i = 0.; for (int k = 0; k < 8; k++) i += step(uAng[k], a);
      float alt = mod(i, 2.), alt3 = step(mod(i, 3.), .5);
      float al = (alt * .12 + alt3 * .05) * step(r, 1.35 * uGrow); if (al < .004) discard;
      gl_FragColor = vec4(pow(vec3(.81, .9, 1.), vec3(2.2)), al);
    }`;
  const fu = { ...base, uGrow: { value: 0 }, uAng: { value: angArr } };
  const facetM = mat(THREE, { vs: facetVs, fs: facetFs, u: fu });
  const facets = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), facetM); facets.frustumCulled = false; facets.renderOrder = 3;

  // glints (stars) and dust (falling diamonds), instanced screen sprites
  const gl = [];
  const pick = knots.filter((k, i) => i % 5 === 2);
  pick.slice(0, 16).forEach((k, i) => gl.push({ x: k[0], y: k[1], thr: k[2] + 0.02, px: 5 + 3 * hash3(i, 1), kind: 0, seed: i }));
  knots.filter((k, i) => i % 4 === 1).slice(0, 48).forEach((k, i) => gl.push({ x: k[0], y: k[1], thr: Math.max(7.0, k[2] + 0.5) + 0.03 * i % 1, px: 3 + 2 * hash3(i, 2), kind: 1, seed: 40 + i }));
  const ig = new THREE.InstancedBufferGeometry();
  ig.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3)); ig.setIndex([0, 1, 2, 0, 2, 3]);
  ig.setAttribute("aOff", new THREE.InstancedBufferAttribute(new Float32Array(gl.flatMap((g) => [g.x, g.y])), 2));
  ig.setAttribute("aT", new THREE.InstancedBufferAttribute(new Float32Array(gl.flatMap((g) => [g.thr, g.px, g.kind, g.seed])), 4));
  ig.instanceCount = gl.length; ig.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const spriteVs = /* glsl */ `
    attribute vec2 aOff; attribute vec4 aT; varying vec2 vQ; varying float vKind; varying float vOn; uniform float uT;
    ${ORIGIN_VS}
    void main() {
      vec2 o = originNdc(); float asp = aspNow();
      float tau = uT - aT.x; vOn = step(0., tau);
      vec2 off = aOff;
      if (aT.z > .5) { off.y -= min(tau, 1.4) * .06; off.x += (fract(aT.w * .37) - .5) * min(tau, 1.4) * .03; }
      float tw = aT.z < .5 ? step(.35, fract(sin(aT.w * 12.9898 + floor(uT * 12.) * 78.233) * 43758.5453)) : 1.;   // twinkle on twos
      float sz = aT.y * uHs * vOn * tw * (aT.z > .5 ? (1. - smoothstep(.8, 1.4, tau)) : 1.);
      vec2 b = o + vec2(off.x / asp, off.y);
      gl_Position = vec4(b + position.xy * sz / uRes * 2., sealDepth(), 1.); vQ = position.xy; vKind = aT.z;
    }`;
  const spriteFs = /* glsl */ `
    varying vec2 vQ; varying float vKind; varying float vOn;
    void main() {
      if (vOn < .5) discard;
      if (vKind < .5) { float s = pow(abs(vQ.x), .5) + pow(abs(vQ.y), .5); if (s > 1.) discard; float c = step(s, .45); gl_FragColor = vec4(mix(pow(vec3(.56, .85, 1.), vec3(2.2)), vec3(1.), c), 1.); }
      else { if (abs(vQ.x) + abs(vQ.y) > 1.) discard; gl_FragColor = vec4(pow(vec3(.81, .9, 1.), vec3(2.2)), .9); }
    }`;
  const spriteM = mat(THREE, { vs: spriteVs, fs: spriteFs, u: { ...base } });
  const sprites = new THREE.Mesh(ig, spriteM); sprites.frustumCulled = false; sprites.renderOrder = 6;

  const crackGroup = new THREE.Group(); crackGroup.add(facets, crackGlow, crackCore, sprites); group.add(crackGroup);

  // ---------------- shards ----------------
  const COLS = 5, ROWS = 4, X0 = -1.05, Y0 = -1.05, W = 2.1 / COLS, H = 2.1 / ROWS;
  const V = []; // jittered grid vertices
  for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= COLS; i++) {
    const edge = i === 0 || j === 0 || i === COLS || j === ROWS;
    V.push([X0 + i * W + (edge ? 0 : (R() - 0.5) * W * 0.7), Y0 + j * H + (edge ? 0 : (R() - 0.5) * H * 0.7)]);
  }
  const vi = (i, j) => V[j * (COLS + 1) + i];
  const tris = [];
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const a = vi(i, j), b = vi(i + 1, j), c = vi(i + 1, j + 1), d = vi(i, j + 1);
    if (R() < 0.5) { tris.push([a, b, c], [a, c, d]); } else { tris.push([a, b, d], [b, c, d]); }
  }
  const sp = [], sc = [], sb = [], sr = [];
  const loopIdx = 13;
  tris.forEach((tr, n) => {
    const cx = (tr[0][0] + tr[1][0] + tr[2][0]) / 3, cy = (tr[0][1] + tr[1][1] + tr[2][1]) / 3, rv = [R() - 0.5, R(), R() - 0.5, n === loopIdx ? 1 : 0];
    tr.forEach((p, k) => { sp.push(p[0], p[1], 0); sc.push(cx, cy); sb.push(k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0); sr.push(...rv); });
  });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute("aCen", new THREE.Float32BufferAttribute(sc, 2));
  sg.setAttribute("aBary", new THREE.Float32BufferAttribute(sb, 3)); sg.setAttribute("aR", new THREE.Float32BufferAttribute(sr, 4));
  sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  const shardVs = /* glsl */ `
    attribute vec2 aCen; attribute vec3 aBary; attribute vec4 aR;
    uniform float uT, uF, uFall, uBack, uLock;
    varying vec3 vB; varying float vAway; varying float vLoop; varying vec2 vLocal; varying float vDist;
    ${ORIGIN_VS}
    void main() {
      vec2 o = originNdc(); float asp = aspNow();
      float hold = clamp((uT - uF) / .5, 0., 1.);
      float fk = clamp((uT - uFall) / (uBack - uFall), 0., 1.);
      float bk = clamp((uT - uBack) / (uLock - .2 - uBack), 0., 1.); bk = bk * bk * (3. - 2. * bk);
      float away = fk * fk * (1. - bk);
      vec2 cenH = vec2((aCen.x - o.x) * asp, aCen.y - o.y);
      vec2 dir = normalize(cenH + 1e-4);
      vec2 Th = dir * .012 * hold * (1. - bk) + vec2(aR.x * .5, -(.25 + aR.y * 1.1)) * away;
      float ang = aR.z * away * 5.;
      vec2 q = vec2((position.x - aCen.x) * asp, position.y - aCen.y);
      vLocal = q;
      q = vec2(cos(ang) * q.x - sin(ang) * q.y, sin(ang) * q.x + cos(ang) * q.y);
      vec2 pos = aCen + vec2((q.x + Th.x) / asp, q.y + Th.y);
      gl_Position = vec4(pos, sealDepth(), 1.);
      if (uT < uF || uT > uLock + .9) gl_Position = vec4(2., 2., 2., 1.);
      vB = aBary; vAway = away; vLoop = aR.w; vDist = length(cenH);
    }`;
  const shardFs = /* glsl */ `
    uniform float uT, uF, uLock;
    varying vec3 vB; varying float vAway; varying float vLoop; varying vec2 vLocal; varying float vDist;
    void main() {
      float m = min(min(vB.x, vB.y), vB.z), fw = fwidth(m) + 1e-6, px = m / fw;       // pixels from the nearest edge
      float heal = clamp((uT - uLock) / .7, 0., 1.), mx = max(max(vB.x, vB.y), vB.z);
      float keep = step(mx, 1. - .5 * heal);
      float lock = step(uLock, uT) * (1. - heal);
      float wLine = mix(1., 1.7, lock);
      float line = (1. - smoothstep(wLine - .5, wLine + .5, px)) * mix(keep, 1., vLoop * step(uT, uLock + .9));
      vec3 white = vec3(1.), gold = pow(vec3(.914, .698, .227), vec3(2.2));
      vec3 ecol = mix(white, gold, lock);
      // the monodromy loop: a gold edge traced by angle about the centroid, closed at 10.7 s
      float lp = clamp((uT - uF) / 2.3, 0., 1.), ang = atan(vLocal.y, vLocal.x) / 6.28318 + .5;
      float traced = vLoop * step(ang, lp);
      float loopLine = traced * (1. - smoothstep(1.75 - .5, 1.75 + .5, px));
      ecol = mix(ecol, gold, traced);
      line = max(line * (1. - traced), loopLine);
      // travelling blue edge light: a hard band at r = 1.6 (t - F)
      float front = 1.6 * (uT - uF), band = step(abs(vDist - front), .1) * step(uT, uF + 1.3);
      float fillA = mix(.14, .5, clamp(vAway * 1.6, 0., 1.)) * (1. - heal);
      vec3 fill = mix(pow(vec3(.5, .78, 1.), vec3(2.2)), pow(vec3(.043, .165, .333), vec3(2.2)), clamp(vAway * 1.6, 0., 1.));
      fill = mix(fill, pow(vec3(.5, .85, 1.), vec3(2.2)), band * .7); fillA = max(fillA, band * .35 * (1. - heal));
      float a = max(line, fillA); if (a < .004) discard;
      vec3 c = line > fillA ? ecol : fill;
      gl_FragColor = vec4(c, a);
    }`;
  const shu = { ...base, uT: { value: 0 }, uF: { value: tF }, uFall: { value: tFall }, uBack: { value: tBack }, uLock: { value: tLock } };
  const shardM = mat(THREE, { vs: shardVs, fs: shardFs, u: shu });
  const shards = new THREE.Mesh(sg, shardM); shards.frustumCulled = false; shards.renderOrder = 6; shards.visible = false;
  group.add(shards);

  return {
    group,
    update(t, dt, cue) {
      const ct = cue.t;
      // crack: smooth clock; hidden once the shatter takes over
      const cOn = ct >= tCr && ct < tF + 0.05;
      crackGroup.visible = cOn; base.uT.value = ct; fu.uGrow.value = clamp01((ct - tCr) / 0.45) + 0.08 * clamp01((ct - 7.0) / 1.4);
      // shards: stepped clock (twos)
      const sOn = ct >= tF && ct < tLock + 0.95;
      shards.visible = sOn; shu.uT.value = t;
    },
    dispose() { cg.dispose(); ig.dispose(); sg.dispose(); facets.geometry.dispose(); for (const m of [crackGlow.material, crackCore.material, facetM, spriteM, shardM]) m.dispose(); },
  };
}
