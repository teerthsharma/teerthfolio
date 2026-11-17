// THE PAGE'S DRAWN EFFECTS, behind the seal unless said: the paper star at the turn back, the lightning, the rain's second depth and the rising
// motes, the strip of rubble, the hit's furniture (starburst, shock rings, dust, ticks, focus rays), and the torn page with its shards and cracked border.
// Shader pulls come from the table, recoloured to the press inks (ink.js); the cel layers are flat and redrawn on the drawings.
import { BufferAttribute, BufferGeometry, DoubleSide, DynamicDrawUsage, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { makeCel } from "../../../kit/fx/cel.js";
import { glslFor } from "../../../tools/index.js";
import { inked, loadInkPacks } from "../../../tools/cuts/pr-openxla-46539/ink.js";
import { hash } from "../live/support.js";
import { BACK, BRK, DOCK, HIT, IMP, LAW, OFF, PILLAR, STRIKES, G, phase, smooth } from "../clock.js";
import { TONE, toned } from "../tone.js";

await loadInkPacks();
// the burst and the dust are read raw and classed by hue: the press recolour maps their cyan and yellow to red and blue
const RAW = { burst: glslFor(["otherKit", "shonenSmashBurst"]), dust: glslFor(["shoKit", "shoDustPlume"]) };
const P = {
  rubble: inked(["mhaRubbleBand"]), rain: inked(["mhaRain"]), gold: inked(["goldKit", "goldAtticShaft", "goldDustMote"]),
  basic: inked(["basicKit", "lineBurst", "lineFocus"]), fiber: inked(["printKit", "printFiberStreak"]),
};
const PAPER = toned("#F7F0DB"), INK = toned("#120E1A"), M = toned("#ED2A8A"), C = toned("#009EE0"), Y = toned("#FFE31A");
const SRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const PAPER_S = SRGB("#F7F0DB"), M_S = SRGB("#ED2A8A"), C_S = SRGB("#009EE0"), Y_S = SRGB("#FFE31A");
const LIN = "vec3 oxLin(vec3 c) { return siteTone(pow(max(c, vec3(0.0)), vec3(2.2))); }";
const WIDE = [[G(23), G(113)], [G(137), G(169)], [15.25, G(233)]];
const isWide = (t) => WIDE.some(([a, b]) => t >= a && t < b);
const N = 220, CORNERS = [[0, 0], [1, 0], [1, 1], [0, 1]];

const VERT = (behind) => `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, ${behind ? "0.9995" : "0.0"}, 1.0); }`;
const STRIP_VERT = "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.x * 2.0, -1.0 + uv.y * 0.28, 0.9995, 1.0); }";
function screenQuad(fragmentShader, uniforms, { behind = true, order = 1170, vertexShader = VERT(behind) } = {}) {
  const m = new ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, depthTest: behind, premultipliedAlpha: true });
  const mesh = new Mesh(new PlaneGeometry(1, 1), m);
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  mesh.visible = false;
  return { mesh, m };
}
const set = (k, obj) => { for (const key in obj) k.m.uniforms[key].value = obj[key]; };

const stripFrag = `${TONE}\n${LIN}\n${P.rubble}\nuniform float uOxT; varying vec2 vUv;
void main() { vec3 c = mhaRubbleBand(vec2(vUv.x, vUv.y * 0.465), uOxT); gl_FragColor = vec4(oxLin(c), 1.0); }`;
const rainFrag = `${TONE}\n${P.rain}\nuniform float uOxT; uniform vec3 uOxPaper; varying vec2 vUv;
void main() { vec3 c = mhaRain(vUv, uOxT, vec3(0.0)); float k = clamp(max(c.r, max(c.g, c.b)) * 3.0, 0.0, 1.0) * 0.7; gl_FragColor = vec4(uOxPaper * k, k); }`;
const goldFrag = `${TONE}\n${P.gold}\nuniform float uOxT, uOxA, uOxEnv, uOxRise; uniform vec3 uOxFoot, uOxGold; varying vec2 vUv;
void main() {
  vec3 m = goldDustMote(vec2(vUv.x, vUv.y - uOxRise), uOxT);
  vec3 s = goldAtticShaft(vUv, uOxT);
  float d = length(vec2((vUv.x - uOxFoot.x) * uOxA, vUv.y - uOxFoot.y)) / uOxFoot.z;
  float foot = (1.0 - smoothstep(0.8, 1.0, d)) * uOxEnv;
  float a = clamp(max(length(m - G_UMBER) * 1.6, length(s - G_INK) * 0.35), 0.0, 1.0) * foot;
  gl_FragColor = vec4(uOxGold * a, a);
}`;
const burstFrag = `${TONE}\n${LIN}\n${RAW.burst}\nuniform vec2 uOxC; uniform float uOxA, uOxR, uOxT; varying vec2 vUv;
void main() {
  vec2 fr = vec2((vUv.x - uOxC.x) * uOxA, vUv.y - uOxC.y);
  vec3 o = shonenSmashBurst(fr / uOxR * 0.30 + vec2(0.70, 0.52), uOxT);
  float lum = dot(o, vec3(0.2126, 0.7152, 0.0722));
  vec3 spike = mix(vec3(0.0, 0.6196, 0.8784), vec3(1.0, 0.8902, 0.1020), step(o.b, o.g));
  vec3 c = mix(vec3(0.0706, 0.0549, 0.1020), spike, smoothstep(0.25, 0.35, lum));
  float a = 1.0 - smoothstep(uOxR - 0.006, uOxR, length(fr));
  gl_FragColor = vec4(oxLin(c) * a, a);
}`;
// the pulled impactRing and impactAnnuliPulse end in an ink floor (ocFloor), so they cannot composite over the picture: their band profiles are kept here
const ringFrag = `${TONE}\n${LIN}\nuniform vec2 uOxC; uniform float uOxA, uOxR, uOxT, uOxW; varying vec2 vUv;
float oxBand(float r, float R, float w) { return exp(-pow((r - R) / max(w, 1e-4), 2.0)); }
void main() {
  vec2 fr = vec2((vUv.x - uOxC.x) * uOxA, vUv.y - uOxC.y);
  float r = length(fr);
  float yel = oxBand(r, uOxR, 0.03), mag = oxBand(r, max(uOxR - 0.12, 0.0), 0.03);
  float pa = oxBand(r, 0.16 + 0.10 * sin(uOxT * 6.0), 0.03) * uOxW, pb = oxBand(r, 0.28 + 0.10 * sin(uOxT * 6.0 + 1.7), 0.04) * 0.7 * uOxW;
  vec3 Y = vec3(1.0, 0.8902, 0.1020), M = vec3(0.9294, 0.1647, 0.5412);
  vec3 c = (Y * (yel + pa) + M * (mag + pb)) / max(yel + pa + mag + pb, 1e-4);
  float a = clamp(max(max(yel, mag), max(pa, pb)), 0.0, 1.0);
  gl_FragColor = vec4(oxLin(c) * a, a);
}`;
const dustFrag = `${TONE}\n${LIN}\n${RAW.dust}\nuniform float uOxA, uOxT; varying vec2 vUv;
void main() {
  vec3 o = shoDustPlume(vec2(vUv.x * uOxA, vUv.y), uOxT, vec3(0.0));
  float lum = dot(o, vec3(0.2126, 0.7152, 0.0722));
  vec3 road = mix(vec3(0.16, 0.15, 0.18), vec3(0.80, 0.78, 0.74), smoothstep(0.32, 0.75, lum));
  float a = clamp(max(o.r, max(o.g, o.b)) * 1.6, 0.0, 1.0);
  gl_FragColor = vec4(oxLin(road) * a, a);
}`;
const basicFrag = `${TONE}\n${P.basic}\nuniform vec2 uOxC; uniform float uOxA, uOxT, uOxMode; uniform vec3 uOxInk; varying vec2 vUv;
void main() {
  vec2 fr = vec2(vUv.x * uOxA, vUv.y), at = vec2(uOxC.x * uOxA, uOxC.y);
  float m = uOxMode < 0.5 ? lineBurst(fr, at, uOxT) : lineFocus(fr, at);
  float a = clamp(m, 0.0, 1.0);
  gl_FragColor = vec4(uOxInk * a, a);
}`;
const shardVert = "attribute vec3 aCol; attribute float aFib; varying vec3 vCol; varying float vFib; void main() { vCol = aCol; vFib = aFib; gl_Position = vec4(position.xy, 0.9995, 1.0); }";
const shardFrag = `${TONE}\n${P.fiber}\nuniform float uOxT, uOxH; varying vec3 vCol; varying float vFib;
void main() {
  vec3 c = vCol;
  if (vFib > 0.5) c = printFiberStreak(c, gl_FragCoord.xy / uOxH, uOxT);
  gl_FragColor = vec4(siteTone(pow(max(c, vec3(0.0)), vec3(2.2))), 1.0);
}`;

const star = (B, cx, cy, r, seed, col) => B.fan(cx, cy, Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2 + seed, q = r * (i % 2 ? 0.66 : 1) * (0.92 + 0.16 * hash(i, 31));
  return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
}), col);

function bolt(B, A, i, a) {
  const x0 = (0.55 + 0.2 * hash(i, 1)) * A, pts = [[x0, 0]];
  let x = x0;
  for (let j = 1; j <= 7; j++) { x += (hash(i, 10 + j) - 0.5) * 0.05; pts.push([x, (0.45 * j) / 7]); }
  B.ribbon(pts, pts.map((_, j) => 0.0065 * (1 - (0.3 * j) / 7)), C, a);
  B.ribbon(pts, pts.map((_, j) => 0.00275 * (1 - (0.3 * j) / 7)), PAPER, a);
  for (let f = 0; f < 3; f++) {
    const from = pts[2 + 2 * f], fork = [from];
    let fx = from[0], fy = from[1];
    for (let j = 1; j <= 3; j++) { fx += (hash(i, 40 + 3 * f + j) - 0.5) * 0.06 + 0.02 * (f % 2 ? -1 : 1); fy += 0.05; fork.push([fx, fy]); }
    B.ribbon(fork, fork.map(() => 0.0018), C, a);
    B.ribbon(fork, fork.map(() => 0.0009), PAPER, a);
  }
}

// a shard: a triangle that starts on the page's top edge, falls with g 1.4, spins; its K edge is the same triangle pushed out by 0.004
function shardAt(i, tau, A) {
  const life = 1.0 + 0.6 * hash(i, 9), s = 0.03 + 0.06 * hash(i, 8), v = 0.5 + 0.8 * hash(i, 3);
  const x = hash(i, 1) * A + (hash(i, 5) - 0.5) * 0.15 * tau, y = 0.03 * hash(i, 2) + v * tau + 0.7 * tau * tau;
  const th = tau * (1.5 + 5 * hash(i, 6)), cs = Math.cos(th), sn = Math.sin(th);
  const base = [[0, -0.6], [0.5, 0.4], [-0.5, 0.4]].map(([bx, by]) => [x + (bx * cs - by * sn) * s, y + (bx * sn + by * cs) * s]);
  const c = [(base[0][0] + base[1][0] + base[2][0]) / 3, (base[0][1] + base[1][1] + base[2][1]) / 3];
  const edge = base.map(([px, py]) => { const dx = px - c[0], dy = py - c[1], l = Math.hypot(dx, dy) || 1; return [px + (dx / l) * 0.004, py + (dy / l) * 0.004]; });
  return { alive: tau >= 0 && tau <= life, base, edge, back: hash(i, 7) < 0.65, front: hash(i, 11) };
}

export function buildDraw(ctx) {
  const group = new Group(), V = new Vector3();
  const cam = () => ctx.player?.camera;
  const uvOf = (w) => { const c = cam(); if (!c) return null; V.copy(w).project(c); return [V.x * 0.5 + 0.5, V.y * 0.5 + 0.5]; };
  const fistUV = () => { const h = ctx.seal?.named?.()?.handR; return h ? uvOf(h) : null; };
  const worldOf = (p) => new Vector3(DOCK[0] + p[0], DOCK[1] + p[1], DOCK[2] + p[2]);

  const strip = screenQuad(stripFrag, { uOxT: { value: 0 }, uMhaMoundA: { value: 0.62 }, uMhaMoundB: { value: 0.9 }, uMhaSeed: { value: 0 }, uMhaAsp: { value: 1.78 }, uMhaCloudBias: { value: 0 } }, { order: 1171, vertexShader: STRIP_VERT });
  const rain = screenQuad(rainFrag, { uOxT: { value: 0 }, uOxPaper: { value: PAPER }, uMhaRainGain: { value: 1 }, uMhaSeed: { value: 0 }, uMhaAsp: { value: 1.78 } }, { order: 1172 });
  const motes = screenQuad(goldFrag, { uOxT: { value: 0 }, uOxA: { value: 1.78 }, uOxEnv: { value: 0 }, uOxRise: { value: 0 }, uOxFoot: { value: new Vector3() }, uOxGold: { value: Y } }, { order: 1173 });
  const bursts = [HIT, LAW.lineC].map(() => screenQuad(burstFrag, { uOxC: { value: [0.5, 0.5] }, uOxA: { value: 1.78 }, uOxR: { value: 0.38 }, uOxT: { value: 0 } }, { order: 1175 }));
  const rings = [HIT, LAW.lineC].map(() => screenQuad(ringFrag, { uOxC: { value: [0.5, 0.5] }, uOxA: { value: 1.78 }, uOxR: { value: 0 }, uOxT: { value: 0 }, uOxW: { value: 1 } }, { order: 1176 }));
  const dust = screenQuad(dustFrag, { uOxA: { value: 1.78 }, uOxT: { value: 0 }, uShoDustX: { value: 0 }, uShoDustY: { value: 0 }, uShoDustR: { value: 0.5 }, uShoDustAge: { value: 0 }, uShoDustWarm: { value: 0 }, uShoSeed: { value: 0 } }, { order: 1174 });
  const ticks = screenQuad(basicFrag, { uOxC: { value: [0.5, 0.5] }, uOxA: { value: 1.78 }, uOxT: { value: 0 }, uOxMode: { value: 0 }, uOxInk: { value: INK } }, { order: 1177 });
  const focusRays = screenQuad(basicFrag, { uOxC: { value: [0.5, 0.5] }, uOxA: { value: 1.78 }, uOxT: { value: 0 }, uOxMode: { value: 1 }, uOxInk: { value: INK } }, { order: 1178 });

  const edges = makeCel(ctx.engine, { max: 4000, order: 1222, behind: true, draw(B, ts, A) {
    const p = phase(ts, ts), tt = p.tt;
    if (OFF.has("shards")) return;
    for (const e of edgeTris) B.tri(e[0], e[1], e[2], e[3], e[4], e[5], INK);
    const k = smooth(BRK - 0.7, BRK - 0.02, tt);
    if (k <= 0 || tt < BRK - 0.7 || tt >= BRK + 1.1) return;
    for (let r = 0; r < 6; r++) {
      const [x0, y0] = CORNERS[r % 4], pts = [[x0 * A, y0]];
      let a = Math.atan2(0.5 - y0, A / 2 - x0 * A);
      for (let s = 1; s <= 5; s++) {
        a += (hash(r, 20 + s) - 0.5) * 0.7;
        const q = pts[s - 1], L = 0.1 * k;
        pts.push([q[0] + Math.cos(a) * L, q[1] + Math.sin(a) * L]);
      }
      B.ribbon(pts, pts.map(() => 0.002), INK);
    }
  } });
  const bolts = makeCel(ctx.engine, { max: 2000, order: 1180, behind: true, draw(B, ts, A) {
    const tt = phase(ts, ts).tt;
    if (OFF.has("bolt")) return;
    STRIKES.forEach((k, i) => {
      if (tt < k || tt >= k + 0.34) return;
      const alt = Math.floor((tt - k) * 12 + 1e-6) % 2 ? 0.45 : 1;
      bolt(B, A, i, alt * (1 - (tt - k) / 0.34));
    });
  } });
  const poof = makeCel(ctx.engine, { max: 400, order: 1260, draw(B, ts, A) {
    const f = Math.floor((ts - BACK) * 24 + 1e-6), box = ctx.player?.box;
    if (f < 0 || f > 5 || !box) return;
    const bh = box[3] - box[1], cx = ((box[0] + box[2]) / 2) * A, cy = (box[1] + box[3]) / 2 - 0.1 * bh, r = 0.86 * bh * (1 + 0.14 * f);
    if (f < 2) { for (const [k, col] of [[1, INK], [0.965, PAPER], [0.6, INK], [0.56, PAPER]]) star(B, cx, cy, r * k, f * 0.4 + (k < 0.7 ? 0.14 : 0), col); return; }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + hash(i, 5), q = r * (0.8 + 0.3 * hash(i, 6)), w = (0.03 * (6 - f)) / 4, x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
      B.tri(x - w, y, x + w, y - w * 0.4, x + Math.cos(a) * w * 3, y + Math.sin(a) * w * 3, i % 3 ? INK : PAPER);
    }
  } });

  const sPos = new Float32Array(N * 9), sCol = new Float32Array(N * 9), sFib = new Float32Array(N * 3);
  const shardGeo = new BufferGeometry();
  shardGeo.setAttribute("position", new BufferAttribute(sPos, 3).setUsage(DynamicDrawUsage));
  shardGeo.setAttribute("aCol", new BufferAttribute(sCol, 3).setUsage(DynamicDrawUsage));
  shardGeo.setAttribute("aFib", new BufferAttribute(sFib, 1).setUsage(DynamicDrawUsage));
  const shardMat = new ShaderMaterial({ uniforms: { uOxT: { value: 0 }, uOxH: { value: 720 } }, vertexShader: shardVert, fragmentShader: shardFrag, depthTest: true, depthWrite: false, transparent: true, side: DoubleSide });
  const shards = new Mesh(shardGeo, shardMat);
  shards.frustumCulled = false;
  shards.renderOrder = 1224;
  shards.visible = false;
  let edgeTris = [];

  group.add(strip.mesh, rain.mesh, motes.mesh, ...bursts.map((b) => b.mesh), ...rings.map((r) => r.mesh), dust.mesh, ticks.mesh, focusRays.mesh);
  group.add(edges.group, bolts.group, poof.group, shards);
  group.userData.plateDepth = false;

  return {
    group,
    update(t, cue) {
      const tr = cue?.t ?? t, ph = phase(t, tr), c = cam();
      if (!c) return;
      const A = c.aspect, tt = ph.tt, fist = fistUV();
      strip.mesh.visible = !OFF.has("strip") && isWide(t) && tt < BRK;
      set(strip, { uOxT: tt, uMhaAsp: A });
      const rg = ph.age < 0 ? 1 : ph.age < 0.6 ? 0.3 : ph.age < 1.6 ? 0.3 * (1 - (ph.age - 0.6)) : 0;
      rain.mesh.visible = !OFF.has("rain2") && t >= LAW.impact && rg > 0.001;
      set(rain, { uOxT: tt, uMhaRainGain: rg, uMhaAsp: A });
      const env = smooth(10.7, 11.2, tt) * (1 - smooth(12.4, 13.2, tt));
      const pc = uvOf(worldOf([PILLAR[0], 0, PILLAR[2]])), pr = uvOf(worldOf([PILLAR[0] + 7, 0, PILLAR[2]]));
      motes.mesh.visible = !OFF.has("motes") && env > 0.001 && !!pc && !!pr;
      if (pc && pr) set(motes, { uOxT: tt, uOxA: A, uOxEnv: env, uOxRise: Math.max(0, tt - 10.7) * 0.12, uOxFoot: new Vector3(pc[0], pc[1], Math.abs(pr[0] - pc[0]) * A) });
      const ages = [ph.age, ph.age2];
      bursts.forEach((b, i) => {
        const a = ages[i], on = !OFF.has("burst") && a >= 0 && a < 0.55 && !!fist;
        b.mesh.visible = on;
        if (on) set(b, { uOxC: fist, uOxA: A, uOxR: 0.38 * (Math.floor(tt * 12 + 1e-6) % 2 ? 1.25 : 1), uOxT: tt });
      });
      rings.forEach((r, i) => {
        const a = ages[i], on = !OFF.has("burst") && a >= 0 && a < 0.75 && !!fist;
        r.mesh.visible = on;
        if (on) set(r, { uOxC: fist, uOxA: A, uOxR: 0.05 + 0.65 * smooth(0, 0.75, a), uOxT: tt, uOxW: 1 - smooth(0.4, 0.75, a) });
      });
      const ip = uvOf(worldOf([IMP[0], 0, IMP[2]]));
      dust.mesh.visible = !OFF.has("burst") && ph.age >= 0 && ph.age < 2.4 && !!ip;
      if (dust.mesh.visible) set(dust, { uOxA: A, uOxT: tt, uShoDustX: ip[0] * A, uShoDustY: ip[1], uShoDustAge: ph.age });
      ticks.mesh.visible = !OFF.has("burst") && ph.age >= 0 && ph.age < 0.5 && !!fist;
      if (ticks.mesh.visible) set(ticks, { uOxC: fist, uOxA: A, uOxT: tt, uOxMode: 0 });
      focusRays.mesh.visible = !OFF.has("burst") && ph.age2 >= 0 && ph.age2 < 0.6 && !!fist;
      if (focusRays.mesh.visible) set(focusRays, { uOxC: fist, uOxA: A, uOxT: tt, uOxMode: 1 });
      const n = OFF.has("shards") ? (edgeTris = [], 0) : shardsAlive(tt, A);
      shards.visible = n > 0;
      shardGeo.setDrawRange(0, n * 3);
      set({ m: shardMat }, { uOxT: tt, uOxH: ctx.engine?.shared?.uRes?.value?.y ?? 720 });
      edges.update(t, cue);
      bolts.update(t, cue);
      poof.update(t, cue);
    },
    dispose() {
      for (const o of [strip, rain, motes, dust, ticks, focusRays, ...bursts, ...rings]) o.m.dispose();
      shardGeo.dispose();
      shardMat.dispose();
      edges.dispose();
      bolts.dispose();
      poof.dispose();
    },
  };

  function shardsAlive(tt, A) {
    let n = 0;
    edgeTris = [];
    const tau0 = tt - BRK;
    for (let i = 0; i < N; i++) {
      const s = shardAt(i, tau0 - 0.1 * hash(i, 10), A);
      if (!s.alive) continue;
      const col = s.back ? PAPER_S : s.front < 0.33 ? M_S : s.front < 0.66 ? C_S : Y_S;
      s.base.forEach(([x, y], k) => { sPos[n * 9 + k * 3] = (x / A) * 2 - 1; sPos[n * 9 + k * 3 + 1] = 1 - 2 * y; sPos[n * 9 + k * 3 + 2] = 0; });
      for (let k = 0; k < 3; k++) { sCol.set(col, n * 9 + k * 3); sFib[n * 3 + k] = s.back ? 1 : 0; }
      edgeTris.push([s.edge[0][0], s.edge[0][1], s.edge[1][0], s.edge[1][1], s.edge[2][0], s.edge[2][1]]);
      n++;
    }
    for (const a of Object.values(shardGeo.attributes)) a.needsUpdate = true;
    return n;
  }
}
