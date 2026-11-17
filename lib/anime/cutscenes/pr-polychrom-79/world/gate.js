// The Gate of Babylon for pr-polychrom-79: the gold-ring sky, 42 ripple portals that open one per 0.05 s with a silhouette in each, 30 deep portals behind them, the four volleys at the lens and the Bab-ilu vault.
// At the break the portals and the vault's wedges fly apart. Rig frame: the seal is at the origin.
import { CircleGeometry, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { BACK, BURST, DOME, F, GATE_AT, HIT, T, TURN, smooth } from "../clock.js";
import { PAL, lin } from "../pal.js";
import { hash, hide, inst, put } from "../live/parts.js";
import { SIL_KINDS, glowMaterial, portalMaterial, silhouetteGeometries, skyMaterial } from "../live/set.js";
import { gateMaterial } from "../live/vault.js";

await loadPack("cuts");
const STAND = ["polyGateRipple"];
const NP = DOME.np, DEEP = 30, K = DOME.k, FLY = 0.35, TRAIL = [0, 0.04, 0.08, 0.12];
const vec = (hex) => new Vector3(...lin(hex));

function layout() {
  const lay = [];
  for (let i = 0; i < NP; i++) {
    const layer = i < 10 ? 0 : i < 24 ? 1 : 2, n = [10, 14, 18][layer], k = i - [0, 10, 24][layer];
    const a = -0.25 * Math.PI + ((k + 0.5 + 0.3 * (hash(i, 1) - 0.5)) / n) * 1.5 * Math.PI;
    const r = [2.2, 3.6, 5.0][layer] + 0.4 * (hash(i, 2) - 0.5);
    lay.push({ x: Math.cos(a) * r * 1.3 * K, y: Math.max(0.8, 2.4 + Math.sin(a) * r * 0.9) * K, z: (-5.5 - layer * 0.7 - hash(i, 3)) * K, a: a + (hash(i, 4) - 0.5) * 0.35, size: (0.8 + 0.4 * hash(i, 5) + layer * 0.1) * K, len: (1.1 + 0.5 * hash(i, 6)) * K, kind: i % SIL_KINDS, slot: 0 });
  }
  const cnt = new Array(SIL_KINDS).fill(0);
  for (const p of lay) p.slot = cnt[p.kind]++;
  return { lay, cnt };
}
export const PORTALS = layout().lay.map(({ x, y, z }) => ({ x, y, z }));
const deep = Array.from({ length: DEEP }, (_, j) => ({ x: -26 + 52 * hash(j, 11), y: 1.5 + 11 * hash(j, 12), z: -14 - 8 * hash(j, 13), size: 0.55 + 0.4 * hash(j, 14) }));
const flyVec = (i) => [(hash(i, 21) - 0.5) * 14, (hash(i, 22) - 0.2) * 10, 6 + 8 * hash(i, 23)];

const SOLID_F = "uniform vec3 uC; uniform float uGain; void main() { gl_FragColor = vec4(uC * uGain, 0.99); }";
const SILC_V = "attribute vec3 color; varying vec3 vC; void main() { vC = color; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }";
const SILC_F = "varying vec3 vC; uniform float uGain; void main() { gl_FragColor = vec4(vC * uGain, 0.99); }";
const silc = () => new ShaderMaterial({ uniforms: { uGain: { value: 1 } }, vertexShader: SILC_V, fragmentShader: SILC_F, side: DoubleSide, toneMapped: false, fog: false });
const tint = (g, hex) => {
  const n = g.index ? g.toNonIndexed() : g.clone();
  n.deleteAttribute("uv");
  n.deleteAttribute("normal");
  const c = new Color(hex), k = n.attributes.position.count, a = new Float32Array(k * 3);
  for (let i = 0; i < k; i++) a.set([c.r, c.g, c.b], i * 3);
  n.setAttribute("color", new Float32BufferAttribute(a, 3));
  return n;
};
const motesMat = () => new ShaderMaterial({
  vertexShader: "varying vec3 vC; void main() { vC = instanceColor; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
  fragmentShader: "varying vec3 vC; void main() { gl_FragColor = vec4(vC, 0.99); }",
  side: DoubleSide, toneMapped: false, fog: false,
});

const FULL_V = "varying vec2 vN; void main() { vN = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const STAND_F = /* glsl */ `
${glslFor(STAND)}
uniform float uAsp, uT; uniform vec3 uSeal; varying vec2 vN;
void main() {
  vec3 c = polyGateRipple(vec3(0.0), vN * 0.5 + 0.5, uT);
  if (max(c.r, max(c.g, c.b)) < 0.004) discard;
  float keep = smoothstep(uSeal.z * 0.95, uSeal.z * 1.4, length(vec2(vN.x * uAsp, vN.y) - uSeal.xy));
  if (keep < 0.5) discard;
  gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);
}`;

export function buildGate(ctx) {
  const group = new Group(), camL = new Vector3(0, 0, 5), tmp = new Vector3();
  const add = (o) => { group.add(o); return o; };

  // the sky: the banded crimson dome of the live (uCap keeps its lowest band), its rings open on the gate's own clock
  const sky = add(new Mesh(new SphereGeometry(1, 32, 16), skyMaterial()));
  sky.scale.setScalar(140); sky.renderOrder = -3; sky.frustumCulled = false;

  const seal = { a: new Vector3(), b: new Vector3() };
  const standU = { ...uniformsFor(STAND), uAsp: { value: 1.78 }, uT: { value: 4.0 }, uSeal: { value: new Vector3() } };
  const screen = (cam) => {
    const k = ctx.seal.scale ?? 1, at = ctx.seal.at, asp = cam.aspect || 1.78;
    seal.a.set(at[0], at[1] + 0.4 * k, at[2]).project(cam); seal.b.set(at[0], at[1] + 0.95 * k, at[2]).project(cam);
    return { asp, seat: new Vector3(seal.a.x * asp, seal.a.y, Math.hypot((seal.b.x - seal.a.x) * asp, seal.b.y - seal.a.y)), sealXY: new Vector3(seal.a.x * asp, seal.a.y) };
  };
  const standMat = new ShaderMaterial({ uniforms: standU, vertexShader: FULL_V, fragmentShader: STAND_F, depthTest: false, depthWrite: false, side: DoubleSide });
  const stand = add(new Mesh(new PlaneGeometry(2, 2), standMat));
  stand.frustumCulled = false; stand.renderOrder = -2.5; stand.visible = false;
  stand.onBeforeRender = (r, s, cam) => {
    const q = screen(cam);
    standU.uAsp.value = q.asp; standU.uSeal.value.set(q.sealXY.x, q.sealXY.y, q.seat.z); standU.uPlAsp.value = q.asp;
  };

  const { lay, cnt } = layout();
  const field = lay.concat(deep);
  const portal = portalMaterial();
  const portals = add(inst(new PlaneGeometry(1, 1), portal, field.length));
  const [vx, vy, vz] = GATE_AT.map((v) => v * K);
  const near8 = new Set(lay.map((p, i) => [Math.hypot(p.x - vx, p.y - vy, p.z - vz), i]).sort((a, b) => a[0] - b[0]).slice(0, BURST.n).map((e) => e[1]));
  const quad = (i) => Math.floor(((Math.atan2(lay[i].y - vy, lay[i].x - vx) + Math.PI) / (2 * Math.PI)) * 4) % 4;
  const cen = [0, 1, 2].map((j) => [...near8].reduce((s, i) => s + [lay[i].x, lay[i].y, lay[i].z][j], 0) / near8.size);

  // the volleys: for each volley time, six portals pick their silhouette off and fly it at the lens, with three rim-only trails behind
  const flies = [], fcnt = new Array(SIL_KINDS).fill(0);
  HIT.volley.forEach((tv, v) => {
    const picks = Array.from({ length: NP }, (_, i) => i).sort((a, b) => hash(a, 40 + v) - hash(b, 40 + v)).slice(0, 6);
    picks.forEach((i, j) => { const p = lay[i]; flies.push({ i, p, t0: tv + 0.03 * j, slot: fcnt[p.kind]++ }); });
  });
  HIT.waves.forEach((tw, w) => {
    const picks = Array.from({ length: NP }, (_, i) => i).sort((a, b) => hash(a, 90 + w) - hash(b, 90 + w)).slice(0, 14);
    picks.forEach((i, j) => { const p = lay[i]; flies.push({ i, p, t0: tw + 0.03 * j, slot: fcnt[p.kind]++ }); });
  });
  const fired = new Array(NP).fill(Infinity);
  for (const f of flies) fired[f.i] = Math.min(fired[f.i], f.t0);

  const geos = silhouetteGeometries(), silMat = silc();
  const sil = geos.map((g) => {
    const rim = tint(g.clone().scale(1.22, 1.035, 1).translate(0, 0, -0.01), PAL.rim);
    return { full: mergeGeometries([rim, tint(g, PAL.sil)]), rim };
  });
  const trails = ctx.atTier(3) ? TRAIL.length : 1;
  const statMesh = sil.map((s, k) => add(inst(s.full, silMat, Math.max(1, cnt[k]))));
  const flyMesh = sil.map((s, k) => add(inst(s.full, silMat, Math.max(1, fcnt[k]))));
  const trailMesh = sil.map((s, k) => add(inst(s.rim, silMat, Math.max(1, Math.max(1, fcnt[k]) * (trails - 1)))));

  // the vault gate: Bab-ilu, 18 m, scaled by DOME.k at GATE_AT
  const vault = add(new Mesh(new PlaneGeometry(18, 18), gateMaterial()));
  vault.position.set(GATE_AT[0] * K, GATE_AT[1] * K, GATE_AT[2] * K);
  vault.renderOrder = -2; vault.frustumCulled = false;
  const plain = (hex) => new ShaderMaterial({ uniforms: { uC: { value: vec(hex) }, uGain: { value: 1 } }, vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: SOLID_F, side: DoubleSide, toneMapped: false, fog: false });
  const wedgeSil = plain(PAL.sil), wedgeRim = plain(PAL.rim);
  const WEDGES = 6;
  const wedges = Array.from({ length: WEDGES }, (_, i) => {
    const th = ((i + 0.5) * 2 * Math.PI) / WEDGES, geo = new CircleGeometry(9 * K, 1, (i * 2 * Math.PI) / WEDGES, (2 * Math.PI) / WEDGES), g = new Group();
    const rim = new Mesh(geo, wedgeRim), fill = new Mesh(geo, wedgeSil);
    rim.scale.setScalar(1.05); rim.position.z = -0.05; rim.renderOrder = fill.renderOrder = -2;
    g.add(rim, fill); g.visible = false; group.add(g);
    return { g, c: Math.cos(th), s: Math.sin(th), spin: i % 2 ? 1 : -1 };
  });

  const core = add(new Mesh(new CircleGeometry(1, 24), plain(PAL.beamCore)));
  core.position.set(cen[0], cen[1], cen[2] + 0.2); core.scale.setScalar(1.6 * K); core.visible = false;

  const MOTES = ctx.atTier(3) ? 110 : 40, MC = [0, 3, -4].map((v) => v * K), MB = [22, 9, 16], MD = [0.05, 0.3, 0];
  const motes = add(inst(new PlaneGeometry(1, 1).rotateZ(Math.PI / 4), motesMat(), MOTES));
  for (let i = 0; i < MOTES; i++) motes.setColorAt(i, new Color(PAL.motes[i % PAL.motes.length]));
  motes.instanceColor.needsUpdate = true;

  const backGlow = add(new Mesh(new PlaneGeometry(1, 1), glowMaterial(PAL.nimbus)));
  backGlow.renderOrder = -1; backGlow.frustumCulled = false;
  const halo = add(new Mesh(new PlaneGeometry(1, 1), glowMaterial(PAL.haloGold, false)));
  halo.renderOrder = 5; halo.frustumCulled = false;
  const wrap = (x, c, b) => ((((x - c + b / 2) % b) + b) % b) - b / 2 + c;
  const activeFly = (f, q, t) => { const ti = t - TRAIL[q] - f.t0, u = ti / FLY; return ti >= 0 && u < 1 ? u : -1; };
  const reach = (f) => camL.z - f.p.z + 1;

  return {
    group,
    update(t, cam) {
      group.visible = t >= TURN + F(1) && t < T.edge;
      group.updateWorldMatrix(true, false);
      camL.copy(cam.position); group.worldToLocal(camL);
      if (!group.visible) return;
      const world = t < BACK;

      sky.material.uniforms.uTime.value = t - TURN;
      stand.visible = t >= TURN + 0.5 && t < BACK && !ctx.atTier(2);

      const brk = t - HIT.shatter, fly = Math.max(0, brk), gone = brk > 1, age = fly;
      const burst = t >= BURST.t && t < BURST.t + F(3) ? (t - BURST.t) / F(2) : -1;
      for (let i = 0; i < field.length; i++) {
        const p = field[i], open = T.open + i * T.step, o = smooth(open, open + 0.5, t), v = flyVec(i);
        const near = i < NP && near8.has(i) && burst >= 0 ? (burst < 1 ? 1 + 0.8 * burst : 0) : 1;
        const falls = i < NP && brk >= 0;
        const x = p.x + v[0] * fly * 1.6, y = p.y + v[1] * fly * 1.6 - (falls ? 4.9 * age * age : 0), z = p.z + v[2] * fly * 1.6;
        const sz = gone ? 0.0001 : Math.max(0.0001, p.size * 1.3 * o * (1 + 0.06 * Math.sin(3 * t + i)) * (1 + 0.8 * fly) * near);
        put(portals, i, x, y, z, sz, sz, 1, 0, 0, 4 * fly + (falls ? 2 * age * (quad(i) % 2 ? 1 : -1) : 0));
        if (i >= NP) continue;
        const L = gone ? 0.0001 : Math.max(0.0001, (t < fired[i] ? p.len * smooth(open + 0.3, open + 1.0, t) : 0) * near), ra = p.a - Math.PI / 2 + 0.05 * Math.sin(1.7 * t + i) + 2.5 * fly;
        put(statMesh[p.kind], p.slot, x, y, z + 0.1, L, L, 1, 0, 0, ra);
      }
      const anyFly = new Array(SIL_KINDS).fill(false), anyTrail = new Array(SIL_KINDS).fill(false);
      for (const f of flies) {
        const k = f.p.kind, ra = f.p.a - Math.PI / 2 + 0.05 * Math.sin(1.7 * t + f.i), L = f.p.len;
        for (let q = 0; q < trails; q++) {
          const u = activeFly(f, q, t);
          if (q === 0) {
            if (u < 0) { hide(flyMesh[k], f.slot); continue; }
            anyFly[k] = true;
            put(flyMesh[k], f.slot, f.p.x, f.p.y, f.p.z + reach(f) * u * u + 0.1, L, L, 1, 0, 0, ra);
          } else {
            const idx = f.slot * (trails - 1) + q - 1;
            if (u < 0) { hide(trailMesh[k], idx); continue; }
            anyTrail[k] = true;
            put(trailMesh[k], idx, f.p.x, f.p.y, f.p.z + reach(f) * u * u + 0.1, L, L, 1, 0, 0, ra);
          }
        }
      }
      for (let k = 0; k < SIL_KINDS; k++) {
        statMesh[k].visible = world && cnt[k] > 0;
        flyMesh[k].visible = world && anyFly[k]; trailMesh[k].visible = world && anyTrail[k];
      }
      for (const m of [...statMesh, ...flyMesh, ...trailMesh]) m.instanceMatrix.needsUpdate = true;
      portals.instanceMatrix.needsUpdate = true;
      portals.visible = world;
      portal.uniforms.uTime.value = t;

      const gs = Math.max(smooth(T.gate[0], T.gate[1], t), 0.01);
      vault.visible = world && t > T.gate[0] && brk < 0;
      vault.scale.setScalar(K * gs);
      vault.material.uniforms.uSpread.value = smooth(T.spread[0], T.spread[1], t);
      vault.material.uniforms.uOpen.value = smooth(T.opens[0], T.opens[1], t);
      vault.material.uniforms.uTime.value = t;
      core.visible = world && burst >= 1 && burst < 1.5;
      for (const w of wedges) {
        w.g.visible = world && brk >= 0 && brk < 1.3;
        if (!w.g.visible) continue;
        w.g.position.set(vault.position.x + 6.5 * w.c * brk, vault.position.y + 6.5 * w.s * brk - 11 * brk * brk, vault.position.z + 5 * brk);
        w.g.rotation.z = 3.5 * brk * w.spin;
      }

      const sc = Math.max(0.0001, 0.07 * K);
      for (let i = 0; i < MOTES; i++) {
        const p = [0, 1, 2].map((j) => wrap(MC[j] - MB[j] / 2 + hash(i, 1 + j) * MB[j] + MD[j] * t + (j === 0 ? 0.5 * Math.sin(0.7 * t + 1.3 * i) : 0), MC[j], MB[j]));
        put(motes, i, p[0], p[1], p[2], sc, sc, 1, 0, 0, hash(i, 4) * 6.28);
      }
      motes.instanceMatrix.needsUpdate = true;
      motes.visible = world;

      backGlow.visible = world;
      backGlow.position.set(0, 1.1, -1.6);
      backGlow.scale.setScalar(1.6 * K);
      backGlow.lookAt(cam.position);
      backGlow.material.uniforms.uK.value = smooth(2.3, 3.4, t);

      const kin = smooth(T.key[0], T.key[1], t) * (1 - smooth(T.keyAway[0], T.keyAway[1], t));
      const hand = ctx.seal.named?.()?.handR;
      halo.visible = world && kin > 0.01 && !!hand;
      if (halo.visible) {
        halo.position.copy(group.worldToLocal(tmp.copy(hand)));
        halo.scale.setScalar(2.0 * K * kin);
        halo.lookAt(cam.position);
      }
    },
    volleyAt(t) {
      const out = [];
      for (const f of flies) {
        const u = (t - f.t0) / FLY;
        if (u < 0 || u >= 1) continue;
        const r = reach(f), p = group.localToWorld(new Vector3(f.p.x, f.p.y, f.p.z + r * u * u));
        out.push({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: (r * 2 * u) / FLY });
      }
      return out;
    },
    breakAt: (t) => (t < HIT.shatter ? -1 : Math.min(1, (t - HIT.shatter) / 0.9)),
    dispose() {
      group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      group.clear();
    },
  };
}
